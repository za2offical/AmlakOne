const express = require("express");
const router = express.Router();
const { authenticateToken } = require("./auth");
const bcrypt = require("bcryptjs");
const { 
    getUserByUsername, 
    updateUser, 
    getAllUsers, 
    createUser, 
    createNotification,
    getDB
} = require('./database');

// استفاده از میدلور احراز هویت
router.use(authenticateToken);

// بررسی دسترسی ادمین
router.use(async (req, res, next) => {
    try {
        if (req.user.username !== process.env.ADMIN_USERNAME && req.user.username !== 'admin') {
            return res.status(403).json({ error: 'Access denied - Admin only' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت لیست کاربران
router.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        const userList = users.map(user => ({
            username: user.username,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            province: user.province || '',
            neighborhood: user.neighborhood || '',
            created_at: user.created_at,
            lastLogin: user.lastLogin,
            profileCompleted: user.profileCompleted || false,
            failedLoginAttempts: user.failedLoginAttempts || 0,
            lockoutUntil: user.lockoutUntil || null
        }));
        res.json(userList);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ایجاد کاربر جدید
router.post('/create-user', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'رمز عبور باید حداقل 8 کاراکتر باشد و شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص باشد' });
        }
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            username,
            hashedPassword,
            created_at: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null,
            profileCompleted: false
        };
        await createUser(newUser);
        res.json({ success: true, message: 'کاربر با موفقیت ایجاد شد' });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ایجاد کاربر' });
    }
});

// تغییر رمز عبور کاربر
router.post('/change-password', async (req, res) => {
    try {
        const { username, newPassword } = req.body;
        if (!username || !newPassword) {
            return res.status(400).json({ error: 'نام کاربری و رمز عبور جدید الزامی است' });
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ error: 'رمز عبور باید حداقل 8 کاراکتر باشد و شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص باشد' });
        }
        const user = await getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUser(username, {
            hashedPassword: hashedPassword
        });
        res.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد' });
    } catch (error) {
        res.status(500).json({ error: 'خطا در تغییر رمز عبور' });
    }
});

// رفع محدودیت لاگین کاربر
router.post('/unlock-user', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'نام کاربری الزامی است' });
        }
        const user = await getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        await updateUser(username, {
            failedLoginAttempts: 0,
            lockoutUntil: null
        });
        res.json({ success: true, message: 'محدودیت لاگین کاربر رفع شد' });
    } catch (error) {
        res.status(500).json({ error: 'خطا در رفع محدودیت' });
    }
});

// ارسال اعلان به تمام کاربران
router.post('/send-notification', async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) {
            return res.status(400).json({ error: 'عنوان و متن اعلان الزامی است' });
        }
        if (title.length > 100) {
            return res.status(400).json({ error: 'عنوان اعلان نمی‌تواند بیشتر از 100 کاراکتر باشد' });
        }
        if (message.length > 1000) {
            return res.status(400).json({ error: 'متن اعلان نمی‌تواند بیشتر از 1000 کاراکتر باشد' });
        }
        const newNotification = {
            id: Date.now().toString(),
            username: 'all',
            title: title.trim(),
            message: message.trim(),
            created_at: new Date().toISOString()
        };
        await createNotification(newNotification);
        res.json({ success: true, message: 'اعلان با موفقیت برای تمام کاربران ارسال شد', notification: newNotification });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ارسال اعلان' });
    }
});

// دریافت لیست اعلان‌ها (برای ادمین)
router.get('/notifications', async (req, res) => {
    try {
        const db = getDB();
        const notifications = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM notifications ORDER BY created_at DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
        res.json(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
        res.status(500).json({ error: 'خطا در بارگذاری اعلان‌ها' });
    }
});

// حذف اعلان
router.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = getDB();

        const result = await new Promise((resolve, reject) => {
            db.run("DELETE FROM notifications WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ error: 'اعلان یافت نشد' });
        }

        res.json({ success: true, message: 'اعلان با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'خطا در حذف اعلان' });
    }
});

module.exports = router;