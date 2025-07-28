const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticateToken, readUsers, writeUsers, User } = require('./auth');

router.use(authenticateToken);

// بررسی وضعیت احراز هویت
router.get('/check-auth', async (req, res) => {
    try {
        // اگر به اینجا رسیده یعنی توکن معتبر است
        res.json({ authenticated: true, username: req.user.username });
    } catch (error) {
        res.status(401).json({ authenticated: false });
    }
});

router.get('/user-info', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.user.username }).lean();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const { hashedPassword, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/update-username', async (req, res) => {
    try {
        const { newUsername } = req.body;
        const currentUsername = req.user.username;

        if (!newUsername || newUsername.length < 3) {
            return res.status(400).json({ 
                error: 'Username must be at least 3 characters long' 
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
            return res.status(400).json({ 
                error: 'Username can only contain letters, numbers, and underscores' 
            });
        }

        const existing = await User.findOne({ username: newUsername });
        if (existing && existing.username !== currentUsername) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user = await User.findOne({ username: currentUsername });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // انتقال فایل‌ها در صورت تغییر نام کاربری
        if (newUsername !== currentUsername) {
            await transferUserFiles(currentUsername, newUsername);
            if (user.profileImagePath && user.profileImagePath.includes(`${currentUsername}.jpg`)) {
                user.profileImagePath = user.profileImagePath.replace(`${currentUsername}.jpg`, `${newUsername}.jpg`);
            }
        }

        user.username = newUsername;
        user.updated_at = new Date().toISOString();
        await user.save();

        const { generateToken } = require('./auth');
        const newToken = generateToken({ username: newUsername });

        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ 
            success: true, 
            message: 'Username updated successfully',
            newUsername 
        });
    } catch (error) {
        console.error('Error updating username:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// بروزرسانی کامل پروفایل
const multer = require('multer');
const fs = require('fs').promises;

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // حداکثر 2 مگابایت
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('فقط فایل‌های عکس مجاز هستند'));
        }
        cb(null, true);
    }
}).single('profileImage');

// ایجاد دایرکتوری برای عکس‌های پروفایل
async function ensureProfileImageDir() {
    const profileImagesDir = path.join(__dirname, '..', 'data', 'profile-img');
    await fs.mkdir(profileImagesDir, { recursive: true });
    return profileImagesDir;
}

// تابع انتقال فایل‌ها
async function transferUserFiles(oldUsername, newUsername) {
    try {
        // 1. انتقال فایل محصولات (Al.json به Ali.json)
        const oldProductFile = path.join(__dirname, '..', 'data', 'products', `${oldUsername}.json`);
        const newProductFile = path.join(__dirname, '..', 'data', 'products', `${newUsername}.json`);
        
        try {
            await fs.access(oldProductFile);
            await fs.rename(oldProductFile, newProductFile);
            console.log(`Product file renamed: ${oldUsername}.json -> ${newUsername}.json`);
        } catch (e) {
            console.log(`Product file ${oldUsername}.json does not exist`);
        }

        // 2. انتقال دایرکتوری تصاویر (img-Al به img-Ali)
        const oldImagesDir = path.join(__dirname, '..', 'public', 'images', `img-${oldUsername}`);
        const newImagesDir = path.join(__dirname, '..', 'public', 'images', `img-${newUsername}`);
        
        try {
            await fs.access(oldImagesDir);
            await fs.rename(oldImagesDir, newImagesDir);
            console.log(`Images directory renamed: img-${oldUsername} -> img-${newUsername}`);
        } catch (e) {
            console.log(`Images directory img-${oldUsername} does not exist`);
        }

        // 3. انتقال عکس پروفایل (Al.jpg به Ali.jpg)
        const oldProfileImage = path.join(__dirname, '..', 'data', 'profile-img', `${oldUsername}.jpg`);
        const newProfileImage = path.join(__dirname, '..', 'data', 'profile-img', `${newUsername}.jpg`);
        
        try {
            await fs.access(oldProfileImage);
            await fs.rename(oldProfileImage, newProfileImage);
            console.log(`Profile image renamed: ${oldUsername}.jpg -> ${newUsername}.jpg`);
        } catch (e) {
            console.log(`Profile image ${oldUsername}.jpg does not exist`);
        }

        // 4. بروزرسانی مسیرهای تصاویر داخل فایل محصولات
        try {
            await fs.access(newProductFile);
            const productData = JSON.parse(await fs.readFile(newProductFile, 'utf8'));
            
            if (productData.products && Array.isArray(productData.products)) {
                productData.products.forEach(product => {
                    if (product.images && Array.isArray(product.images)) {
                        product.images = product.images.map(imagePath => 
                            imagePath.replace(`img-${oldUsername}`, `img-${newUsername}`)
                        );
                    }
                });
                
                await fs.writeFile(newProductFile, JSON.stringify(productData, null, 2));
                console.log('Image paths updated in product file');
            }
        } catch (e) {
            console.log('No product file to update image paths');
        }

        // 5. انتقال دایرکتوری کاربر در data (اگر وجود دارد)
        const oldUserDir = path.join(__dirname, '..', 'data', oldUsername);
        const newUserDir = path.join(__dirname, '..', 'data', newUsername);
        
        try {
            await fs.access(oldUserDir);
            
            const files = await fs.readdir(oldUserDir);
            if (files.length > 0) {
                await fs.mkdir(newUserDir, { recursive: true });
                
                for (const file of files) {
                    const oldFile = path.join(oldUserDir, file);
                    const newFile = path.join(newUserDir, file.replace(oldUsername, newUsername));
                    await fs.rename(oldFile, newFile);
                }
                console.log(`User directory renamed: ${oldUsername} -> ${newUsername}`);
            }
            
            await fs.rmdir(oldUserDir, { recursive: true });
        } catch (e) {
            console.log(`User directory ${oldUsername} does not exist`);
        }

    } catch (error) {
        console.error('Error transferring user files:', error);
        // در اینجا خطا را نمی‌اندازیم تا عملیات ادامه یابد
    }
}

router.put('/update-profile', (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'خطا در آپلود فایل: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'خطای نامشخص: ' + err.message });
        }

        try {
            const { newUsername, province, neighborhood } = req.body;
            const currentUsername = req.user.username;

            // اعتبارسنجی داده‌های ورودی
            if (!newUsername || !province || !neighborhood) {
                return res.status(400).json({ 
                    error: 'تمام فیلدها الزامی هستند' 
                });
            }

            // اعتبارسنجی نام کاربری
            if (newUsername.length < 3) {
                return res.status(400).json({ 
                    error: 'نام کاربری باید حداقل 3 کاراکتر باشد' 
                });
            }

            if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
                return res.status(400).json({ 
                    error: 'نام کاربری فقط می‌تواند شامل حروف، اعداد و زیرخط باشد' 
                });
            }

            const users = await readUsers();

            // بررسی تکراری بودن نام کاربری
            if (users.some(u => u.username === newUsername && u.username !== currentUsername)) {
                return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
            }

            const userIndex = users.findIndex(u => u.username === currentUsername);
            if (userIndex === -1) {
                return res.status(404).json({ error: 'کاربر پیدا نشد' });
            }

            // پردازش عکس پروفایل (اختیاری)
            let profileImagePath = users[userIndex].profileImagePath; // حفظ عکس قبلی
            
            // انتقال فایل‌ها در صورت تغییر نام کاربری
            if (newUsername !== currentUsername) {
                await transferUserFiles(currentUsername, newUsername);
                
                // بروزرسانی مسیر عکس پروفایل در صورت تغییر نام کاربری
                if (profileImagePath && profileImagePath.includes(`${currentUsername}.jpg`)) {
                    profileImagePath = profileImagePath.replace(`${currentUsername}.jpg`, `${newUsername}.jpg`);
                }
            }
            
            // اگر عکس جدیدی آپلود شده، آن را پردازش کن
            if (req.file) {
                const profileImagesDir = await ensureProfileImageDir();
                const filename = `${newUsername}.jpg`;
                const imagePath = path.join(profileImagesDir, filename);

                // حذف عکس قبلی اگر وجود داشت
                if (users[userIndex].profileImagePath) {
                    const oldImagePath = path.join(__dirname, '..', users[userIndex].profileImagePath);
                    try {
                        await fs.unlink(oldImagePath);
                    } catch (e) { /* اگر نبود مشکلی نیست */ }
                }

                await fs.writeFile(imagePath, req.file.buffer);
                profileImagePath = `/profile-img/${filename}`;
            }

            // به‌روزرسانی اطلاعات کاربر
            users[userIndex] = {
                ...users[userIndex],
                username: newUsername,
                province: province,
                neighborhood: neighborhood,
                profileImagePath: profileImagePath,
                profileCompleted: true,
                updated_at: new Date().toISOString()
            };

            await writeUsers(users);

            // اگر نام کاربری تغییر کرده، توکن جدید بسازیم
            if (newUsername !== currentUsername) {
                const { generateToken } = require('./auth');
                const newToken = generateToken({ username: newUsername });

                res.cookie('token', newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 24 * 60 * 60 * 1000
                });
            }

            res.json({ 
                success: true, 
                message: 'اطلاعات با موفقیت بروزرسانی شد',
                newUsername 
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'خطای سرور داخلی' });
        }
    });
});

module.exports = router;