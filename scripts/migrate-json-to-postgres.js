
const fs = require('fs').promises;
const path = require('path');
const { connectDB, createUser } = require('../modules/database');

async function migrateUsersToPostgreSQL() {
    try {
        console.log('شروع انتقال داده‌ها از users.json به PostgreSQL...');
        
        // اتصال به PostgreSQL
        await connectDB();
        
        // خواندن فایل users.json
        const usersFilePath = path.join(__dirname, '../data/users.json');
        const data = await fs.readFile(usersFilePath, 'utf8');
        const users = JSON.parse(data);
        
        console.log(`${users.length} کاربر برای انتقال یافت شد`);
        
        // انتقال هر کاربر به PostgreSQL
        for (const user of users) {
            try {
                await createUser(user);
                console.log(`کاربر ${user.username} با موفقیت منتقل شد`);
            } catch (error) {
                if (error.message.includes('duplicate key')) {
                    console.log(`کاربر ${user.username} قبلاً وجود دارد`);
                } else {
                    console.error(`خطا در انتقال کاربر ${user.username}:`, error.message);
                }
            }
        }
        
        console.log('انتقال داده‌ها کامل شد!');
        process.exit(0);
        
    } catch (error) {
        console.error('خطا در انتقال داده‌ها:', error);
        process.exit(1);
    }
}

// اجرای migration
migrateUsersToPostgreSQL();
