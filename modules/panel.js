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

// میدلور احراز هویت برای تمام مسیرهای پنل
router.use(authenticateToken);

// دریافت اطلاعات کاربر
router.get('/user-info', async (req, res) => {
    try {
        console.log('User info requested for:', req.user.username);
        const user = await getUserByUsername(req.user.username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // حذف اطلاعات حساس قبل از ارسال
        const { hashedPassword, ...userInfo } = user;
        res.json(userInfo);
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// بروزرسانی اطلاعات کاربر
router.post('/initialize', async (req, res) => {
    try {
        const user = await getUserByUsername(req.user.username);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.initialized) {
            await updateUser(req.user.username, {
                initialized: 1,
                lastLogin: new Date().toISOString()
            });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error initializing user:', error);
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
        const notificationsWithReadStatus = notifications.map(notification => {
            let readBy = [];
            try {
                readBy = notification.readBy ? JSON.parse(notification.readBy) : [];
            } catch (e) {
                readBy = [];
            }
            return {
                ...notification,
                isRead: readBy.includes(username)
            };
        });

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

        const db = getDB();
        
        // دریافت اعلان
        const notification = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM notifications WHERE id = ?", [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!notification) {
            return res.status(404).json({ error: 'اعلان یافت نشد' });
        }

        // پارس کردن readBy
        let readBy = [];
        try {
            readBy = notification.readBy ? JSON.parse(notification.readBy) : [];
        } catch (e) {
            readBy = [];
        }

        // اضافه کردن کاربر به لیست خوانندگان اگر قبلاً اضافه نشده
        if (!readBy.includes(username)) {
            readBy.push(username);
            
            await new Promise((resolve, reject) => {
                db.run(
                    "UPDATE notifications SET readBy = ? WHERE id = ?",
                    [JSON.stringify(readBy), id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
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
        const username = req.user.username;
        const db = getDB();

        const notifications = await new Promise((resolve, reject) => {
            db.all(
                "SELECT * FROM notifications WHERE username = ? OR username = 'all'", 
                [username], 
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        const unreadCount = notifications.filter(notification => {
            let readBy = [];
            try {
                readBy = notification.readBy ? JSON.parse(notification.readBy) : [];
            } catch (e) {
                readBy = [];
            }
            return !readBy.includes(username);
        }).length;

        res.json({ unreadCount });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'خطا در دریافت تعداد اعلان‌های نخوانده' });
    }
});

module.exports = router;