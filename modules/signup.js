const express = require('express');
const router = express.Router();
const { 
    createSignupEntry, 
    getAllSignupEntries, 
    deleteSignupEntry,
    getDB 
} = require('./database');

// ثبت شماره تلفن جدید
router.post('/add', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'شماره تلفن الزامی است' });
        }

        // اعتبارسنجی شماره تلفن ایرانی
        if (!/^09[0-9]{9}$/.test(phone)) {
            return res.status(400).json({ error: 'فرمت شماره تلفن نامعتبر است' });
        }

        await createSignupEntry(phone);

        res.status(201).json({
            success: true,
            message: 'شماره تلفن با موفقیت ثبت شد'
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'این شماره تلفن قبلاً ثبت شده است' });
        }
        console.error('خطا در ثبت شماره تلفن:', error);
        res.status(500).json({ error: 'خطا در ثبت شماره تلفن' });
    }
});

// دریافت تمام شماره‌های ثبت شده (فقط ادمین)
router.get('/all', async (req, res) => {
    try {
        // این endpoint فقط برای ادمین در نظر گرفته شده
        const signups = await getAllSignupEntries();
        const phones = signups.map(signup => signup.phone);
        res.json(phones);
    } catch (error) {
        console.error('خطا در دریافت لیست ثبت‌نام‌ها:', error);
        res.status(500).json({ error: 'خطا در دریافت لیست ثبت‌نام‌ها' });
    }
});

// حذف شماره تلفن (فقط ادمین)
router.delete('/remove/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;

        await deleteSignupEntry(phone);

        res.json({
            success: true,
            message: 'شماره تلفن با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا در حذف شماره تلفن:', error);
        res.status(500).json({ error: 'خطا در حذف شماره تلفن' });
    }
});

module.exports = router;