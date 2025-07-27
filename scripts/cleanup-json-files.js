
const fs = require('fs').promises;
const path = require('path');

async function cleanupJsonFiles() {
    console.log('شروع پاک‌سازی فایل‌های JSON...');
    
    const filesToRemove = [
        '../data/users.json',
        '../data/tickets.json',
        '../data/appointments.json',
        '../data/notifications.json',
        '../data/signup.json',
        '../data/plans.json',
        '../3D/data.json',
        '../3D/plan3D.json'
    ];
    
    const productJsonFiles = [
        '../data/products/admin.json',
        '../data/products/Ali.json',
        '../data/products/Aaa.json',
        '../data/products/zii.json',
        '../data/products/masi.json',
        '../data/products/a.json',
        '../data/products/alireza.json',
        '../data/products/testlogin.json',
        '../data/products/testi.json',
        '../data/products/Teci.json'
    ];
    
    // حذف فایل‌های اصلی
    for (const file of filesToRemove) {
        try {
            const filePath = path.join(__dirname, file);
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`فایل ${file} پاک شد`);
        } catch (error) {
            console.log(`فایل ${file} وجود ندارد یا قبلاً پاک شده`);
        }
    }
    
    // حذف فایل‌های محصولات
    for (const file of productJsonFiles) {
        try {
            const filePath = path.join(__dirname, file);
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`فایل محصولات ${file} پاک شد`);
        } catch (error) {
            console.log(`فایل محصولات ${file} وجود ندارد یا قبلاً پاک شده`);
        }
    }
    
    console.log('پاک‌سازی فایل‌های JSON کامل شد!');
    console.log('⚠️  توجه: از این پس تمام عملیات فقط از دیتابیس SQLite انجام می‌شود');
}

// اجرای اسکریپت
if (require.main === module) {
    cleanupJsonFiles().catch(console.error);
}

module.exports = cleanupJsonFiles;
