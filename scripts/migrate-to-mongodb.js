
const fs = require('fs').promises;
const path = require('path');
const { connectDB, createUser } = require('../modules/database');

async function migrateUsersToMongoDB() {
    try {
        console.log('شروع انتقال داده‌ها از users.json به MongoDB...');
        
        // اتصال به MongoDB
        await connectDB();
        
        // خواندن فایل users.json
        const usersFilePath = path.join(__dirname, '../data/users.json');
        const data = await fs.readFile(usersFilePath, 'utf8');
        const users = JSON.parse(data);
        
        console.log(`${users.length} کاربر برای انتقال یافت شد`);
        
        // انتقال هر کاربر به MongoDB
        for (const user of users) {
            try {
                await createUser(user);
                console.log(`کاربر ${user.username} با موفقیت منتقل شد`);
            } catch (error) {
                console.error(`خطا در انتقال کاربر ${user.username}:`, error.message);
            }
        }
        
        console.log('انتقال داده‌ها کامل شد!');
        
        // تهیه فایل backup از users.json
        const backupPath = path.join(__dirname, '../data/users.json.backup');
        await fs.copyFile(usersFilePath, backupPath);
        console.log(`فایل backup در ${backupPath} ایجاد شد`);
        
        process.exit(0);
        
    } catch (error) {
        console.error('خطا در انتقال داده‌ها:', error);
        process.exit(1);
    }
}

// اجرای migration
migrateUsersToMongoDB();
