
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const { readUsers, createUser, findUserByUsername } = require('./auth');

const SIGNUP_FILE = path.join(__dirname, '..', 'data', 'signup.json');

// خواندن شماره‌های مجاز از فایل
async function readAuthorizedPhones() {
    try {
        const data = await fs.readFile(SIGNUP_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// نوشتن شماره‌های مجاز در فایل
async function writeAuthorizedPhones(phones) {
    await fs.writeFile(SIGNUP_FILE, JSON.stringify(phones, null, 2));
}

// مرحله اول: بررسی شماره تلفن
router.post('/verify-phone', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'شماره تلفن الزامی است' });
        }

        // اعتبارسنجی شماره تلفن (فرمت ایرانی)
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ 
                error: 'فرمت شماره تلفن نامعتبر است. از فرمت 09XXXXXXXXX استفاده کنید' 
            });
        }

        // بررسی اینکه شماره در لیست مجاز هست یا نه
        const authorizedPhones = await readAuthorizedPhones();
        if (!authorizedPhones.includes(phone)) {
            return res.status(403).json({ 
                error: 'شماره تلفن شما در لیست مجاز نیست' 
            });
        }

        // بررسی اینکه آیا این شماره قبلاً ثبت نام کرده یا نه
        const users = await readUsers();
        const existingUser = users.find(u => u.phone === phone);
        if (existingUser) {
            return res.status(400).json({ 
                error: 'این شماره تلفن قبلاً ثبت نام کرده است' 
            });
        }

        res.json({ 
            success: true, 
            message: 'شماره تلفن تایید شد',
            phone: phone
        });

    } catch (error) {
        console.error('Error verifying phone:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

// مرحله دوم: تکمیل ثبت نام
router.post('/complete-registration', async (req, res) => {
    try {
        const { phone, username, password, confirmPassword } = req.body;

        // اعتبارسنجی داده‌های ورودی
        if (!phone || !username || !password || !confirmPassword) {
            return res.status(400).json({ 
                error: 'تمام فیلدها الزامی هستند' 
            });
        }

        // بررسی تطابق رمز عبور
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                error: 'رمز عبور و تکرار آن یکسان نیستند' 
            });
        }

        // اعتبارسنجی نام کاربری
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                error: 'نام کاربری باید بین 3 تا 20 کاراکتر باشد' 
            });
        }

        // بررسی فقط شامل حروف انگلیسی و اعداد
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ 
                error: 'نام کاربری فقط باید شامل حروف انگلیسی و اعداد باشد' 
            });
        }

        // اعتبارسنجی رمز عبور
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'رمز عبور باید حداقل 6 کاراکتر باشد' 
            });
        }

        // بررسی دوباره شماره تلفن
        const authorizedPhones = await readAuthorizedPhones();
        if (!authorizedPhones.includes(phone)) {
            return res.status(403).json({ 
                error: 'شماره تلفن معتبر نیست' 
            });
        }

        // بررسی تکراری نبودن نام کاربری
        const existingUsername = await findUserByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ 
                error: 'این نام کاربری قبلاً استفاده شده است' 
            });
        }

        // بررسی تکراری نبودن شماره تلفن
        const users = await readUsers();
        const existingPhone = users.find(u => u.phone === phone);
        if (existingPhone) {
            return res.status(400).json({ 
                error: 'این شماره تلفن قبلاً ثبت نام کرده است' 
            });
        }

        // هش کردن رمز عبور
        const hashedPassword = await bcrypt.hash(password, 10);

        // ایجاد کاربر جدید
        const newUserData = {
            username: username,
            hashedPassword: hashedPassword,
            phone: phone,
            profileCompleted: false,
            failedLoginAttempts: 0,
            lockoutUntil: null
        };

        await createUser(newUserData);

        // حذف شماره تلفن از لیست مجاز
        const updatedPhones = authorizedPhones.filter(p => p !== phone);
        await writeAuthorizedPhones(updatedPhones);

        res.json({ 
            success: true, 
            message: 'ثبت نام با موفقیت انجام شد',
            username: username
        });

    } catch (error) {
        console.error('Error completing registration:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

module.exports = router;
