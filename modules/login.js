const express = require('express');
const router = express.Router();
const { 
    generateToken, 
    readUsers, 
    comparePassword
} = require('./auth');

// Admin credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

router.post('/verify', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        // بررسی اعتبار admin
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            const token = generateToken({ username: ADMIN_USERNAME });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 روز (یک ماه)
            });
            return res.json({ success: true, isAdmin: true });
        }

        // بررسی اعتبار کاربر عادی
        const users = await readUsers();
        const user = users.find(u => u.username === username);
        const userIndex = users.findIndex(u => u.username === username);

        if (!user) {
            return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }

        // بررسی قفل بودن کاربر
        if (user.lockoutUntil && Date.now() < user.lockoutUntil) {
            const remainingSec = Math.ceil((user.lockoutUntil - Date.now()) / 1000);
            return res.status(403).json({ error: `اکانت شما به دلیل ورود ناموفق تا ${remainingSec} ثانیه دیگر قفل است. لطفاً بعداً تلاش کنید.` });
        }

        // اگر قفل گذشته باشد، شمارنده و قفل را ریست کن
        if (user.lockoutUntil && Date.now() > user.lockoutUntil) {
            user.failedLoginAttempts = 0;
            user.lockoutUntil = null;
            users[userIndex] = user;
            await require('fs').promises.writeFile(
                require('path').join(__dirname, '../data/users.json'),
                JSON.stringify(users, null, 2),
                'utf8'
            );
            // مقدار جدید را از فایل بخوان
            const updatedUsers = await readUsers();
            const updatedUser = updatedUsers.find(u => u.username === username);
            // مقدار user و users را به‌روزرسانی کن
            users[userIndex] = updatedUser;
        }
        // مقدار user را مجدداً از users بگیر تا مقدار جدید را داشته باشی
        const freshUser = users[userIndex];
        // اگر پسورد به صورت هش ذخیره نشده باشد
        const isMatch = freshUser.hashedPassword 
            ? await comparePassword(password, freshUser.hashedPassword)
            : password === freshUser.password;

        if (isMatch) {
            // ریست شمارنده و قفل
            freshUser.failedLoginAttempts = 0;
            freshUser.lockoutUntil = null;
            users[userIndex] = freshUser;
            await require('fs').promises.writeFile(
                require('path').join(__dirname, '../data/users.json'),
                JSON.stringify(users, null, 2),
                'utf8'
            );
            const token = generateToken(freshUser);
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 روز (یک ماه)
            });
            const profileCompleted = freshUser.profileCompleted || false;
            res.json({ 
                success: true, 
                isAdmin: false, 
                profileCompleted: profileCompleted 
            });
        } else {
            // افزایش شمارنده تلاش ناموفق
            freshUser.failedLoginAttempts = (freshUser.failedLoginAttempts || 0) + 1;
            // اگر به حد مجاز رسید، قفل کن
            if (freshUser.failedLoginAttempts >= LOCKOUT_ATTEMPTS) {
                freshUser.lockoutUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
            }
            users[userIndex] = freshUser;
            await require('fs').promises.writeFile(
                require('path').join(__dirname, '../data/users.json'),
                JSON.stringify(users, null, 2),
                'utf8'
            );
            if (freshUser.lockoutUntil && Date.now() < freshUser.lockoutUntil) {
                const remainingSec = Math.ceil((freshUser.lockoutUntil - Date.now()) / 1000);
                return res.status(403).json({ error: `اکانت شما به دلیل ورود ناموفق تا ${remainingSec} ثانیه دیگر قفل است. لطفاً بعداً تلاش کنید.` });
            }
            res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'خطای سرور داخلی' });
    }
});

// مسیر خروج از سیستم
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
    res.json({ success: true });
});

module.exports = router;