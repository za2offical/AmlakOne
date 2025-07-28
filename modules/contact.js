
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// مسیر فایل پیام‌ها
const messagesPath = path.join(__dirname, '..', 'data', 'messages.json');

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
        const parsedData = JSON.parse(data);
        
        // اطمینان از وجود ساختار صحیح
        if (!parsedData || typeof parsedData !== 'object') {
            return { messages: [] };
        }
        
        if (!Array.isArray(parsedData.messages)) {
            parsedData.messages = [];
        }
        
        return parsedData;
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

// بررسی محدودیت کوکی (3 پیام در 24 ساعت)
function checkCookieLimit(req, res, next) {
    const cookieName = 'message_limit';
    const limit = 3;
    const windowMs = 24 * 60 * 60 * 1000; // 24 ساعت

    let cookieData = req.cookies[cookieName];
    
    if (!cookieData) {
        // ایجاد کوکی جدید
        cookieData = {
            count: 0,
            resetTime: Date.now() + windowMs
        };
    } else {
        try {
            cookieData = JSON.parse(cookieData);
        } catch (error) {
            cookieData = {
                count: 0,
                resetTime: Date.now() + windowMs
            };
        }
    }

    // بررسی انقضای زمان
    if (Date.now() > cookieData.resetTime) {
        cookieData = {
            count: 0,
            resetTime: Date.now() + windowMs
        };
    }

    // بررسی محدودیت
    if (cookieData.count >= limit) {
        return res.status(429).json({
            success: false,
            error: 'شما در 24 ساعت گذشته بیش از حد مجاز پیام ارسال کرده‌اید. لطفاً بعداً تلاش کنید.'
        });
    }

    // افزایش شمارنده و بروزرسانی کوکی
    cookieData.count++;
    res.cookie(cookieName, JSON.stringify(cookieData), {
        maxAge: windowMs,
        httpOnly: true,
        secure: false // در production باید true باشد
    });

    next();
}

// ارسال پیام جدید
router.post('/send', (req, res) => {
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

    if (message.length > 300) {
        return res.status(400).json({
            success: false,
            error: 'پیام نباید بیش از 300 کاراکتر باشد'
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

    // اطمینان از وجود آرایه messages
    if (!Array.isArray(messagesData.messages)) {
        messagesData.messages = [];
    }

    // ایجاد پیام جدید
    const newMessage = {
        id: Date.now().toString(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        status: 'unread'
    };

    // اضافه کردن پیام جدید
    messagesData.messages.unshift(newMessage);

    // محدود کردن تعداد پیام‌ها (حداکثر 1000 پیام)
    if (messagesData.messages.length > 1000) {
        messagesData.messages = messagesData.messages.slice(0, 1000);
    }

    // لاگ برای debugging
    console.log('ثبت پیام جدید:', {
        id: newMessage.id,
        email: newMessage.email,
        messageLength: newMessage.message.length,
        timestamp: newMessage.timestamp
    });

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

// تست endpoint برای debugging
router.get('/test', (req, res) => {
    res.json({
        success: true,
        debug: {
            ip: req.ip,
            remoteAddress: req.connection?.remoteAddress,
            socketAddress: req.socket?.remoteAddress,
            userAgent: req.get('User-Agent'),
            cookies: req.cookies
        }
    });
});

module.exports = router;
