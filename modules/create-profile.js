const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const { authenticateToken } = require('./auth');
const { getUserByUsername, updateUser } = require('./database');

// تنظیمات multer برای آپلود عکس پروفایل
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const profileImgDir = path.join(__dirname, '..', 'data', 'profile-img');
        try {
            await fs.mkdir(profileImgDir, { recursive: true });
            cb(null, profileImgDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const username = req.user.username;
        const ext = path.extname(file.originalname);
        cb(null, `${username}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
        }
    }
});

// دریافت اطلاعات پروفایل
router.get('/', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const user = await getUserByUsername(username);
        
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }

        res.json({
            username: user.username,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
            address: user.address,
            description: user.description
        });
    } catch (error) {
        console.error('خطا در دریافت پروفایل:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات پروفایل' });
    }
});

// به‌روزرسانی پروفایل
router.put('/', authenticateToken, upload.single('profileImage'), async (req, res) => {
    try {
        const username = req.user.username;
        const { email, phone, fullName, address, description } = req.body;

        const updateData = {
            email,
            phone,
            fullName,
            address,
            description
        };

        // اگر عکس آپلود شده، مسیر آن را اضافه کن
        if (req.file) {
            updateData.profileImage = `/profile-img/${req.file.filename}`;
        }

        await updateUser(username, updateData);

        res.json({ 
            message: 'پروفایل با موفقیت به‌روزرسانی شد',
            profileImage: updateData.profileImage
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی پروفایل:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی پروفایل' });
    }
});

module.exports = router;
