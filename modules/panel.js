const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const { 
    getUserByUsername, 
    getProductsByUser,
    get3DRequests,
    closeConnection,
    getDB
} = require('./database');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');
const NOTIFICATIONS_FILE = path.join(__dirname, '..', 'data', 'notifications.json');

// میدلور احراز هویت برای تمام مسیرهای پنل
router.use(authenticateToken);

// دریافت اطلاعات کاربر
router.get('/user-info', async (req, res) => {
    try {
        console.log('User info requested for:', req.user.username);
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === req.user.username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // حذف اطلاعات حساس قبل از ارسال
        const { password, ...userInfo } = user;
        res.json(userInfo);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// بروزرسانی اطلاعات کاربر
router.post('/initialize', async (req, res) => {
    try {
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.username === req.user.username);

        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!users[userIndex].initialized) {
            users[userIndex].initialized = true;
            users[userIndex].lastLogin = new Date().toISOString();

            await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت اعلان‌های کاربر
router.get('/notifications', async (req, res) => {
    try {
        const username = req.user.username;

        // خواندن اعلان‌ها از دیتابیس
        let notifications = [];
        try {
            const db = getDB();
            notifications = await new Promise((resolve, reject) => {
                db.all(
                    "SELECT * FROM notifications WHERE username = ? OR username = 'all' ORDER BY created_at DESC LIMIT 10", 
                    [username], 
                    (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(rows || []);
                        }
                    }
                );
            });
        } catch (error) {
            console.log('خطا در خواندن اعلان‌ها از دیتابیس:', error);
        }

        // اضافه کردن وضعیت خوانده شدن برای هر اعلان
        const notificationsWithReadStatus = notifications.map(notification => ({
            ...notification,
            isRead: notification.readBy ? notification.readBy.includes(username) : false
        }));

        res.json(notificationsWithReadStatus);
    } catch (error) {
        console.error('Error loading notifications:', error);
        res.status(500).json({ error: 'خطا در بارگذاری اعلان‌ها' });
    }
});

// علامت‌گذاری اعلان به عنوان خوانده شده
router.post('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const username = req.user.username;

        const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE, 'utf8'));
        const notificationIndex = notifications.findIndex(n => n.id === id);

        if (notificationIndex === -1) {
            return res.status(404).json({ error: 'اعلان یافت نشد' });
        }

        // اضافه کردن کاربر به لیست خوانندگان اگر قبلاً اضافه نشده
        if (!notifications[notificationIndex].readBy.includes(username)) {
            notifications[notificationIndex].readBy.push(username);
            await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
        }

        res.json({ success: true, message: 'اعلان به عنوان خوانده شده علامت‌گذاری شد' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'خطا در علامت‌گذاری اعلان' });
    }
});

// دریافت تعداد اعلان‌های نخوانده
router.get('/notifications/unread-count', async (req, res) => {
    try {
        const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE, 'utf8'));
        const username = req.user.username;

        const unreadCount = notifications.filter(notification => 
            !notification.readBy.includes(username)
        ).length;

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'خطا در دریافت تعداد اعلان‌های نخوانده' });
    }
});

module.exports = router;