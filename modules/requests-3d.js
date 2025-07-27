
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { authenticateToken } = require('./auth');
const sanitize = require('sanitize-filename');

// تنظیمات آپلود ویدیو
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // حداکثر 100 مگابایت
    },
    fileFilter: (req, file, cb) => {
        // فقط فایل‌های ویدیویی مجاز
        if (!file.mimetype.startsWith('video/')) {
            return cb(new Error('Only video files are allowed'));
        }
        cb(null, true);
    }
}).single('video');

// ایجاد دایرکتوری‌های مورد نیاز
async function ensureDirectories(username) {
    const dataDir = path.join(__dirname, '..', '3D');
    const userVideoDir = path.join(dataDir, sanitize(username));
    const dataFile = path.join(dataDir, 'data.json');

    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(userVideoDir, { recursive: true });

    return {
        dataFile,
        userVideoDir
    };
}

// خواندن اطلاعات درخواست‌های 3D
async function read3DRequests(dataFile) {
    try {
        const data = await fs.readFile(dataFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { requests: [] };
    }
}

// خواندن محصولات کاربر
async function getUserProducts(username) {
    try {
        const dataPath = path.join(__dirname, '..', 'data', 'products', `${sanitize(username)}.json`);
        const data = await fs.readFile(dataPath, 'utf8');
        const userData = JSON.parse(data);
        return userData.products || [];
    } catch (error) {
        console.error('Error reading user products:', error);
        return [];
    }
}

// خواندن پلن‌های 3D
async function read3DPlans() {
    try {
        const planPath = path.join(__dirname, '..', '3D', 'plan3D.json');
        const data = await fs.readFile(planPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading 3D plans:', error);
        return {};
    }
}

// به‌روزرسانی پلن‌های 3D
async function update3DPlans(plans) {
    try {
        const planPath = path.join(__dirname, '..', '3D', 'plan3D.json');
        await fs.writeFile(planPath, JSON.stringify(plans, null, 2));
        return true;
    } catch (error) {
        console.error('Error updating 3D plans:', error);
        return false;
    }
}

// بررسی وجود پلن برای کاربر
async function checkUserPlan(username) {
    const plans = await read3DPlans();
    const userPlan = plans[username];
    
    return {
        hasPlan: userPlan !== undefined,
        remainingUses: userPlan || 0
    };
}

// کاهش تعداد استفاده پلن
async function decrementPlanUsage(username) {
    const plans = await read3DPlans();
    
    if (plans[username] && plans[username] > 0) {
        plans[username]--;
        
        // اگر تعداد استفاده به صفر رسید، کاربر را حذف کن
        if (plans[username] === 0) {
            delete plans[username];
        }
        
        await update3DPlans(plans);
        return true;
    }
    
    return false;
}

// میدلور احراز هویت
router.use(authenticateToken);

// بررسی وضعیت پلن کاربر
router.get('/check-plan', async (req, res) => {
    try {
        const username = req.user.username;
        const planStatus = await checkUserPlan(username);
        
        res.json(planStatus);
    } catch (error) {
        console.error('Error checking user plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت محصولات کاربر برای نمایش در صفحه درخواست 3D
router.get('/user-products', async (req, res) => {
    try {
        const username = req.user.username;
        const products = await getUserProducts(username);

        // آماده‌سازی داده‌های محصولات برای نمایش
        const safeProducts = products.map(product => ({
            id: product.id,
            bedrooms: product.bedrooms,
            area: product.area,
            mainImage: product.images[0] || '',
            propertyType: product.propertyType || 'rent',
            created_at: product.created_at
        }));

        res.json(safeProducts);
    } catch (error) {
        console.error('Error fetching products for 3D request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت درخواست‌های 3D کاربر
router.get('/my-requests', async (req, res) => {
    try {
        const username = req.user.username;
        const { dataFile } = await ensureDirectories(username);
        const requestsData = await read3DRequests(dataFile);

        // فیلتر کردن درخواست‌های مربوط به کاربر
        const userRequests = requestsData.requests.filter(request => 
            request.id.startsWith(`${username}-`)
        );

        // اطمینان از بازگشت تمام فیلدها شامل URL
        const safeRequests = userRequests.map(request => ({
            id: request.id,
            username: request.username,
            productId: request.productId,
            videoPath: request.videoPath,
            status: request.status,
            url: request.url || null,
            submittedAt: request.submittedAt,
            updatedAt: request.updatedAt
        }));

        res.json(safeRequests);
    } catch (error) {
        console.error('Error fetching 3D requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ارسال درخواست 3D جدید
router.post('/submit-request', async (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Unknown error: ' + err.message });
        }

        try {
            const username = req.user.username;
            const { productId } = req.body;

            if (!productId || !req.file) {
                return res.status(400).json({ error: 'Product ID and video file are required' });
            }

            // بررسی وجود پلن برای کاربر
            const planStatus = await checkUserPlan(username);
            if (!planStatus.hasPlan || planStatus.remainingUses <= 0) {
                return res.status(403).json({ 
                    error: 'شما پلن 3D فعالی ندارید. لطفاً ابتدا از فروشگاه پلن تهیه کنید.',
                    needsPlan: true
                });
            }

            const { dataFile, userVideoDir } = await ensureDirectories(username);
            
            // خواندن درخواست‌های موجود
            const requestsData = await read3DRequests(dataFile);
            
            // بررسی وجود درخواست قبلی برای همین محصول
            const requestId = `${username}-${productId}`;
            const existingRequest = requestsData.requests.find(r => r.id === requestId);
            
            if (existingRequest) {
                return res.status(400).json({ 
                    error: 'برای این محصول قبلاً درخواست ارسال شده است',
                    existingStatus: existingRequest.status
                });
            }
            
            // ذخیره فایل ویدیو
            const videoFileName = `${productId}.mp4`;
            const videoPath = path.join(userVideoDir, videoFileName);
            await fs.writeFile(videoPath, req.file.buffer);

            // ایجاد درخواست جدید
            const newRequest = {
                id: requestId,
                username: username,
                productId: productId,
                videoPath: path.join('3D', sanitize(username), videoFileName),
                status: 'در حال بررسی',
                url: null,
                submittedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // اضافه کردن درخواست جدید
            requestsData.requests.push(newRequest);

            // ذخیره درخواست‌ها
            await fs.writeFile(dataFile, JSON.stringify(requestsData, null, 2));

            res.status(201).json({
                success: true,
                message: 'درخواست 3D با موفقیت ارسال شد',
                request: newRequest
            });

        } catch (error) {
            console.error('Error submitting 3D request:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

// endpoint برای تایید درخواست (برای ادمین‌ها)
router.post('/approve-request', async (req, res) => {
    try {
        const { requestId, url } = req.body;
        
        if (!requestId) {
            return res.status(400).json({ error: 'Request ID is required' });
        }

        const { dataFile } = await ensureDirectories('temp');
        const requestsData = await read3DRequests(dataFile);
        
        // پیدا کردن درخواست
        const requestIndex = requestsData.requests.findIndex(r => r.id === requestId);
        
        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = requestsData.requests[requestIndex];
        
        // اگر درخواست قبلاً تایید نشده باشد
        if (request.status !== 'تایید شده') {
            // تایید درخواست
            requestsData.requests[requestIndex].status = 'تایید شده';
            requestsData.requests[requestIndex].url = url || null;
            requestsData.requests[requestIndex].updatedAt = new Date().toISOString();
            
            // ذخیره تغییرات درخواست
            await fs.writeFile(dataFile, JSON.stringify(requestsData, null, 2));
            
            // کاهش تعداد استفاده از پلن کاربر
            const username = request.username;
            const decrementResult = await decrementPlanUsage(username);
            
            if (!decrementResult) {
                console.warn(`Could not decrement plan usage for user: ${username}`);
            }
        }

        res.json({
            success: true,
            message: 'درخواست با موفقیت تایید شد',
            request: requestsData.requests[requestIndex]
        });

    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
