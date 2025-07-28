
const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// مسیر فایل پیام‌ها
const messagesPath = path.join(__dirname, '..', 'data', 'messages.json');

// محدودیت نرخ: حداکثر 3 پیام در 24 ساعت
const messageLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 ساعت
    max: 3, // حداکثر 3 درخواست
    message: { 
        success: false, 
        error: 'شما در 24 ساعت گذشته بیش از حد مجاز پیام ارسال کرده‌اید. لطفاً بعداً تلاش کنید.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // استفاده از IP و User-Agent برای شناسایی کاربر
        return `${req.ip}-${req.get('User-Agent')}`;
    }
});

// بررسی وجود فایل پیام‌ها و ایجاد آن در صورت عدم وجود
function ensureMessagesFile() {
    if (!fs.existsSync(messagesPath)) {
        const initialData = {
            messages: []
        };
        fs.writeFileSync(messagesPath, JSON.stringify(initialData, null, 2), 'utf8');
    }
}

// خواندن پیام‌ها از فایل
function readMessages() {
    ensureMessagesFile();
    try {
        const data = fs.readFileSync(messagesPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('خطا در خواندن فایل پیام‌ها:', error);
        return { messages: [] };
    }
}

// نوشتن پیام‌ها به فایل
function writeMessages(data) {
    try {
        fs.writeFileSync(messagesPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('خطا در نوشتن فایل پیام‌ها:', error);
        return false;
    }
}

// اعتبارسنجی ایمیل
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// دریافت تعداد پیام‌های باقی‌مانده کاربر
router.get('/remaining', (req, res) => {
    const key = `${req.ip}-${req.get('User-Agent')}`;
    
    // بررسی تعداد درخواست‌های فعلی
    const store = messageLimit.store;
    if (store && store.get) {
        store.get(key, (err, result) => {
            if (err) {
                return res.json({ remaining: 3 });
            }
            const remaining = Math.max(0, 3 - (result || 0));
            res.json({ remaining });
        });
    } else {
        res.json({ remaining: 3 });
    }
});

// ارسال پیام جدید
router.post('/send', messageLimit, (req, res) => {
    const { email, message } = req.body;

    // اعتبارسنجی ورودی‌ها
    if (!email || !message) {
        return res.status(400).json({
            success: false,
            error: 'ایمیل و پیام الزامی هستند'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            success: false,
            error: 'فرمت ایمیل نامعتبر است'
        });
    }

    if (message.length > 1000) {
        return res.status(400).json({
            success: false,
            error: 'پیام نباید بیش از 1000 کاراکتر باشد'
        });
    }

    if (message.trim().length < 10) {
        return res.status(400).json({
            success: false,
            error: 'پیام باید حداقل 10 کاراکتر باشد'
        });
    }

    // خواندن پیام‌های موجود
    const messagesData = readMessages();

    // ایجاد پیام جدید
    const newMessage = {
        id: Date.now().toString(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'unread'
    };

    // اضافه کردن پیام جدید
    messagesData.messages.unshift(newMessage);

    // محدود کردن تعداد پیام‌ها (حداکثر 1000 پیام)
    if (messagesData.messages.length > 1000) {
        messagesData.messages = messagesData.messages.slice(0, 1000);
    }

    // ذخیره پیام
    if (writeMessages(messagesData)) {
        res.json({
            success: true,
            message: 'پیام شما با موفقیت ارسال شد'
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'خطا در ذخیره پیام'
        });
    }
});

// دریافت لیست پیام‌ها (برای ادمین)
router.get('/list', (req, res) => {
    // این endpoint باید احراز هویت ادمین داشته باشد
    // فعلاً برای تست عمومی است
    const messagesData = readMessages();
    res.json({
        success: true,
        messages: messagesData.messages.slice(0, 50) // فقط 50 پیام اخیر
    });
});

// علامت‌گذاری پیام به عنوان خوانده شده
router.patch('/mark-read/:id', (req, res) => {
    const { id } = req.params;
    const messagesData = readMessages();
    
    const messageIndex = messagesData.messages.findIndex(msg => msg.id === id);
    if (messageIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'پیام یافت نشد'
        });
    }

    messagesData.messages[messageIndex].status = 'read';
    messagesData.messages[messageIndex].readAt = new Date().toISOString();

    if (writeMessages(messagesData)) {
        res.json({
            success: true,
            message: 'پیام به عنوان خوانده شده علامت‌گذاری شد'
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'خطا در بروزرسانی پیام'
        });
    }
});

module.exports = router;
