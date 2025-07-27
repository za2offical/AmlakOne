const express = require("express");
const router = express.Router();
const { authenticateToken } = require("./auth");
const fs = require("fs").promises;
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_FILE = path.join(__dirname, "..", "data", "users.json");
const NOTIFICATIONS_FILE = path.join(__dirname, "..", "data", "notifications.json");

// استفاده از میدلور احراز هویت
router.use(authenticateToken);

// بررسی دسترسی ادمین
router.use(async (req, res, next) => {
    try {
        if (req.user.username !== 'admin') {
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
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
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
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'این نام کاربری قبلاً استفاده شده است' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            username,
            hashedPassword,
            created_at: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null
        };
        users.push(newUser);
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
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
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        users[userIndex].hashedPassword = hashedPassword;
        users[userIndex].updated_at = new Date().toISOString();
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
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
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.username === username);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        users[userIndex].failedLoginAttempts = 0;
        users[userIndex].lockoutUntil = null;
        users[userIndex].updated_at = new Date().toISOString();
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ success: true, message: 'محدودیت لاگین کاربر رفع شد' });
    } catch (error) {
        res.status(500).json({ error: 'خطا در رفع محدودیت' });
    }
});

// ارسال اعلان به تمام کاربران
router.post('/notifications', async (req, res) => {
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
        const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE, 'utf8'));
        const newNotification = {
            id: Date.now().toString(),
            title: title.trim(),
            message: message.trim(),
            sentBy: req.user.username,
            sentAt: new Date().toISOString(),
            readBy: []
        };
        notifications.unshift(newNotification);
        await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
        res.json({ success: true, message: 'اعلان با موفقیت برای تمام کاربران ارسال شد', notification: newNotification });
    } catch (error) {
        res.status(500).json({ error: 'خطا در ارسال اعلان' });
    }
});

// دریافت لیست اعلان‌ها (برای ادمین)
router.get('/notifications', async (req, res) => {
    try {
        const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE, 'utf8'));
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'خطا در بارگذاری اعلان‌ها' });
    }
});

// حذف اعلان
router.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE, 'utf8'));
        const notificationIndex = notifications.findIndex(n => n.id === id);
        if (notificationIndex === -1) {
            return res.status(404).json({ error: 'اعلان یافت نشد' });
        }
        notifications.splice(notificationIndex, 1);
        await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
        res.json({ success: true, message: 'اعلان با موفقیت حذف شد' });
    } catch (error) {
        res.status(500).json({ error: 'خطا در حذف اعلان' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken, isAdmin } = require('./auth');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const NOTIFICATIONS_FILE = path.join(__dirname, '..', 'data', 'notifications.json');

router.use(authenticateToken, isAdmin);

// Get all users
router.get('/users', async (req, res) => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        
        // Remove sensitive information
        const safeUsers = users.map(user => ({
            username: user.username,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin || false,
            createdAt: user.createdAt
        }));
        
        res.json(safeUsers);
    } catch (error) {
        console.error('Error reading users:', error);
        res.status(500).json({ error: 'خطا در خواندن فایل کاربران' });
    }
});

// Create new user
router.post('/users', async (req, res) => {
    try {
        const { username, password, email, name, isAdmin } = req.body;
        
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'نام کاربری، رمز عبور و ایمیل الزامی است' });
        }
        
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        
        // Check if user already exists
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'نام کاربری قبلاً وجود دارد' });
        }
        
        const newUser = {
            username,
            password, // In a real app, this should be hashed
            email,
            name: name || username,
            isAdmin: !!isAdmin,
            createdAt: new Date().toISOString(),
            initialized: false
        };
        
        users.push(newUser);
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        
        res.json({ success: true, message: 'کاربر با موفقیت ایجاد شد' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'خطا در ایجاد کاربر' });
    }
});

// Send notification
router.post('/send-notification', async (req, res) => {
    try {
        const { title, message } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ error: 'عنوان و پیام الزامی است' });
        }
        
        // Read existing notifications
        let notifications = [];
        try {
            const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf8');
            notifications = JSON.parse(data);
        } catch (error) {
            // File doesn't exist, start with empty array
            notifications = [];
        }
        
        // Create new notification
        const newNotification = {
            id: Date.now().toString(),
            title: title.trim(),
            message: message.trim(),
            sentBy: req.user.username,
            sentAt: new Date().toISOString(),
            readBy: []
        };
        
        notifications.unshift(newNotification);
        
        // Write back to file
        await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
        
        res.json({ success: true, message: 'اعلان با موفقیت ارسال شد' });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'خطا در ارسال اعلان' });
    }
});

module.exports = router;
