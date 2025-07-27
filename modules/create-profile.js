const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { findUserByUsername, updateUser, authenticateToken } = require('./auth');

// تنظیمات multer برای آپلود عکس پروفایل
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // حداکثر 2 مگابایت
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
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

// بررسی اینکه آیا کاربر اطلاعات تکمیلی را وارد کرده یا نه
router.get('/check-completion', authenticateToken, async (req, res) => {
    try {
        const user = await findUserByUsername(req.user.username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isCompleted = user.profileCompleted || false;
        res.json({ 
            completed: isCompleted,
            username: user.username 
        });
    } catch (error) {
        console.error('Error checking profile completion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت اطلاعات پروفایل فعلی
router.get('/current-info', authenticateToken, async (req, res) => {
    try {
        const user = await findUserByUsername(req.user.username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { hashedPassword, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error('Error fetching current info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// تکمیل پروفایل
router.post('/complete', authenticateToken, (req, res) => {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Unknown error: ' + err.message });
        }

        try {
            const { firstName, lastName, gender, phone, province, neighborhood } = req.body;
            const username = req.user.username;

            // اعتبارسنجی داده‌های ورودی
            if (!firstName || !lastName || !gender || !phone || !province || !neighborhood) {
                return res.status(400).json({ 
                    error: 'First name, last name, gender, phone, province and neighborhood are required' 
                });
            }

            // اعتبارسنجی نام و نام خانوادگی
            if (firstName.trim().length < 2 || firstName.trim().length > 50) {
                return res.status(400).json({ 
                    error: 'نام باید بین 2 تا 50 کاراکتر باشد' 
                });
            }

            if (lastName.trim().length < 2 || lastName.trim().length > 50) {
                return res.status(400).json({ 
                    error: 'نام خانوادگی باید بین 2 تا 50 کاراکتر باشد' 
                });
            }

            // بررسی فارسی بودن نام
            const persianRegex = /^[\u0600-\u06FF\s]+$/;
            if (!persianRegex.test(firstName.trim())) {
                return res.status(400).json({ 
                    error: 'نام باید به فارسی نوشته شود' 
                });
            }

            if (!persianRegex.test(lastName.trim())) {
                return res.status(400).json({ 
                    error: 'نام خانوادگی باید به فارسی نوشته شود' 
                });
            }

            // اعتبارسنجی جنسیت
            if (!['male', 'female'].includes(gender)) {
                return res.status(400).json({ 
                    error: 'Invalid gender value' 
                });
            }

            // اعتبارسنجی شماره تلفن (فرمت ایرانی)
            const phoneRegex = /^09\d{9}$/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({ 
                    error: 'Invalid phone number format. Use 09XXXXXXXXX' 
                });
            }

            const user = await findUserByUsername(username);

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // بررسی تکراری بودن شماره تلفن
            //const phoneExists = users.some(u => u.phone === phone && u.username !== username);
            //if (phoneExists) {
            //    return res.status(400).json({ 
            //        error: 'This phone number is already registered' 
            //    });
            //}

            // پردازش عکس پروفایل (اختیاری)
            let profileImagePath = null;
            if (req.file) {
                const profileImagesDir = await ensureProfileImageDir();
                const filename = `${username}.jpg`;
                const imagePath = path.join(profileImagesDir, filename);

                // حذف عکس قبلی اگر وجود داشت
                if (user.profileImagePath) {
                    const oldImagePath = path.join(__dirname, '..', user.profileImagePath);
                    try {
                        await fs.unlink(oldImagePath);
                    } catch (e) { /* اگر نبود مشکلی نیست */ }
                }

                await fs.writeFile(imagePath, req.file.buffer);
                profileImagePath = `/profile-img/${filename}`;
            }

            // به‌روزرسانی اطلاعات کاربر
            user.firstName = firstName.trim();
            user.lastName = lastName.trim();
            user.gender = gender;
            user.phone = phone;
            user.province = province;
            user.neighborhood = neighborhood;
            user.profileImagePath = profileImagePath;
            user.profileCompleted = true;
            user.updated_at = new Date().toISOString();

            await updateUser(user);

            res.json({ 
                success: true, 
                message: 'Profile completed successfully',
                profileImagePath: profileImagePath
            });

        } catch (error) {
            console.error('Error completing profile:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

module.exports = router;