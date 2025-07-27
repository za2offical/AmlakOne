const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('./auth');
const { 
    create3DRequest, 
    get3DRequests, 
    get3DRequestById, 
    update3DRequest, 
    delete3DRequest,
    get3DDataByKey,
    upsert3DData,
    getAll3DData,
    getDB 
} = require('./database');

// تنظیمات آپلود فایل
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '3D', 'videos'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('فقط فایل‌های ویدیویی مجاز هستند'));
        }
    }
});

// دریافت تمام درخواست‌های 3D
router.get('/requests', authenticateToken, async (req, res) => {
    try {
        const requests = await get3DRequests();
        res.json(requests || []);
    } catch (error) {
        console.error('خطا در دریافت درخواست‌های 3D:', error);
        res.status(500).json({ error: 'خطا در دریافت درخواست‌ها' });
    }
});

// دریافت درخواست 3D خاص
router.get('/requests/:id', authenticateToken, async (req, res) => {
    try {
        const request = await get3DRequestById(req.params.id);
        if (!request) {
            return res.status(404).json({ error: 'درخواست یافت نشد' });
        }
        res.json(request);
    } catch (error) {
        console.error('خطا در دریافت درخواست 3D:', error);
        res.status(500).json({ error: 'خطا در دریافت درخواست' });
    }
});

// ایجاد درخواست 3D جدید
router.post('/submit', authenticateToken, upload.single('video'), async (req, res) => {
    try {
        const { productId } = req.body;
        const username = req.user.username;

        if (!req.file) {
            return res.status(400).json({ error: 'فایل ویدیو الزامی است' });
        }

        const requestData = {
            id: Date.now().toString(),
            username: username,
            productId: productId || '',
            videoPath: req.file.path,
            status: 'در حال بررسی',
            url: null,
            submittedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await create3DRequest(requestData);

        res.status(201).json({
            success: true,
            message: 'درخواست 3D با موفقیت ثبت شد',
            request: requestData
        });
    } catch (error) {
        console.error('خطا در ثبت درخواست 3D:', error);
        res.status(500).json({ error: 'خطا در ثبت درخواست' });
    }
});

// به‌روزرسانی درخواست 3D
router.put('/update/:id', authenticateToken, async (req, res) => {
    try {
        const requestId = req.params.id;
        const updateData = req.body;

        // حذف فیلدهای غیرقابل تغییر
        delete updateData.id;
        delete updateData.username;
        delete updateData.submittedAt;

        updateData.updatedAt = new Date().toISOString();

        await update3DRequest(requestId, updateData);

        res.json({
            success: true,
            message: 'درخواست با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی درخواست 3D:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی درخواست' });
    }
});

// حذف درخواست 3D
router.delete('/delete/:id', authenticateToken, async (req, res) => {
    try {
        const requestId = req.params.id;

        // دریافت اطلاعات درخواست برای حذف فایل ویدیو
        const request = await get3DRequestById(requestId);
        if (request && request.videoPath) {
            try {
                await fs.unlink(request.videoPath);
            } catch (err) {
                console.warn('فایل ویدیو یافت نشد:', err.message);
            }
        }

        await delete3DRequest(requestId);

        res.json({
            success: true,
            message: 'درخواست با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا در حذف درخواست 3D:', error);
        res.status(500).json({ error: 'خطا در حذف درخواست' });
    }
});

// دریافت داده‌های 3D (نظیر پلن‌ها)
router.get('/data', authenticateToken, async (req, res) => {
    try {
        const data = await getAll3DData();
        res.json(data);
    } catch (error) {
        console.error('خطا در دریافت داده‌های 3D:', error);
        res.status(500).json({ error: 'خطا در دریافت داده‌ها' });
    }
});

// به‌روزرسانی داده‌های 3D
router.post('/data', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const { key, value } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'کلید و مقدار الزامی است' });
        }

        await upsert3DData(key, value);

        res.json({
            success: true,
            message: 'داده‌ها با موفقیت به‌روزرسانی شدند'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی داده‌های 3D:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی داده‌ها' });
    }
});

module.exports = router;