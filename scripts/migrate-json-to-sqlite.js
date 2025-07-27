
const fs = require('fs').promises;
const path = require('path');
const { connectDB, createUser, createProduct, create3DRequest, createTicket, 
        createAppointment, createNotification, createSignupEntry } = require('../modules/database');

async function migrateAllDataToSQLite() {
    try {
        console.log('شروع انتقال تمام داده‌ها از JSON به SQLite...');
        
        // اتصال به SQLite
        await connectDB();
        
        // انتقال کاربران
        await migrateUsers();
        
        // انتقال محصولات
        await migrateProducts();
        
        // انتقال درخواست‌های 3D
        await migrate3DRequests();
        
        // انتقال تیکت‌ها
        await migrateTickets();
        
        // انتقال قرارملاقات‌ها
        await migrateAppointments();
        
        // انتقال اعلان‌ها
        await migrateNotifications();
        
        // انتقال ثبت‌نام‌ها
        await migrateSignups();
        
        console.log('انتقال تمام داده‌ها کامل شد!');
        process.exit(0);
        
    } catch (error) {
        console.error('خطا در انتقال داده‌ها:', error);
        process.exit(1);
    }
}

async function migrateUsers() {
    try {
        console.log('انتقال کاربران...');
        const usersFilePath = path.join(__dirname, '../data/users.json');
        const data = await fs.readFile(usersFilePath, 'utf8');
        const users = JSON.parse(data);
        
        console.log(`${users.length} کاربر برای انتقال یافت شد`);
        
        for (const user of users) {
            try {
                await createUser(user);
                console.log(`کاربر ${user.username} با موفقیت منتقل شد`);
            } catch (error) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    console.log(`کاربر ${user.username} قبلاً وجود دارد`);
                } else {
                    console.error(`خطا در انتقال کاربر ${user.username}:`, error.message);
                }
            }
        }
        console.log(`${users.length} کاربر پردازش شد`);
    } catch (error) {
        console.error('خطا در انتقال کاربران:', error.message);
    }
}

async function migrateProducts() {
    try {
        console.log('انتقال محصولات...');
        const productsDir = path.join(__dirname, '../data/products');
        const files = await fs.readdir(productsDir);
        
        let totalProducts = 0;
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const username = file.replace('.json', '');
                const filePath = path.join(productsDir, file);
                const data = await fs.readFile(filePath, 'utf8');
                const products = JSON.parse(data);
                
                console.log(`انتقال ${products.length} محصول برای کاربر ${username}...`);
                
                for (const product of products) {
                    try {
                        await createProduct(username, product);
                        console.log(`محصول ${product.id} برای کاربر ${username} منتقل شد`);
                        totalProducts++;
                    } catch (error) {
                        if (error.message.includes('UNIQUE constraint failed')) {
                            console.log(`محصول ${product.id} قبلاً وجود دارد`);
                        } else {
                            console.error(`خطا در انتقال محصول ${product.id}:`, error.message);
                        }
                    }
                }
            }
        }
        console.log(`${totalProducts} محصول پردازش شد`);
    } catch (error) {
        console.error('خطا در انتقال محصولات:', error.message);
    }
}

async function migrate3DRequests() {
    try {
        console.log('انتقال درخواست‌های 3D...');
        const dataFilePath = path.join(__dirname, '../3D/data.json');
        const data = await fs.readFile(dataFilePath, 'utf8');
        const { requests } = JSON.parse(data);
        
        console.log(`${requests.length} درخواست 3D برای انتقال یافت شد`);
        
        for (const request of requests) {
            try {
                await create3DRequest(request);
                console.log(`درخواست 3D ${request.id} منتقل شد`);
            } catch (error) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    console.log(`درخواست 3D ${request.id} قبلاً وجود دارد`);
                } else {
                    console.error(`خطا در انتقال درخواست 3D ${request.id}:`, error.message);
                }
            }
        }
        console.log(`${requests.length} درخواست 3D پردازش شد`);
    } catch (error) {
        console.error('خطا در انتقال درخواست‌های 3D:', error.message);
    }
}

async function migrateTickets() {
    try {
        console.log('انتقال تیکت‌ها...');
        const ticketsFilePath = path.join(__dirname, '../data/tickets.json');
        
        try {
            const data = await fs.readFile(ticketsFilePath, 'utf8');
            const tickets = JSON.parse(data);
            
            console.log(`${tickets.length} تیکت برای انتقال یافت شد`);
            
            for (const ticket of tickets) {
                try {
                    await createTicket(ticket);
                    console.log(`تیکت ${ticket.id} منتقل شد`);
                } catch (error) {
                    if (error.message.includes('UNIQUE constraint failed')) {
                        console.log(`تیکت ${ticket.id} قبلاً وجود دارد`);
                    } else {
                        console.error(`خطا در انتقال تیکت ${ticket.id}:`, error.message);
                    }
                }
            }
            console.log(`${tickets.length} تیکت پردازش شد`);
        } catch (fileError) {
            console.log('فایل tickets.json یافت نشد یا خالی است');
        }
    } catch (error) {
        console.error('خطا در انتقال تیکت‌ها:', error.message);
    }
}

async function migrateAppointments() {
    try {
        console.log('انتقال قرارملاقات‌ها...');
        const appointmentsFilePath = path.join(__dirname, '../data/appointments.json');
        
        try {
            const data = await fs.readFile(appointmentsFilePath, 'utf8');
            const appointmentsData = JSON.parse(data);
            const appointments = appointmentsData.appointments || appointmentsData;
            
            console.log(`${appointments.length} قرارملاقات برای انتقال یافت شد`);
            
            for (const appointment of appointments) {
                try {
                    await createAppointment(appointment);
                    console.log(`قرارملاقات ${appointment.id} منتقل شد`);
                } catch (error) {
                    if (error.message.includes('UNIQUE constraint failed')) {
                        console.log(`قرارملاقات ${appointment.id} قبلاً وجود دارد`);
                    } else {
                        console.error(`خطا در انتقال قرارملاقات ${appointment.id}:`, error.message);
                    }
                }
            }
            console.log(`${appointments.length} قرارملاقات پردازش شد`);
        } catch (fileError) {
            console.log('فایل appointments.json یافت نشد یا خالی است');
        }
    } catch (error) {
        console.error('خطا در انتقال قرارملاقات‌ها:', error.message);
    }
}

async function migrateNotifications() {
    try {
        console.log('انتقال اعلان‌ها...');
        const notificationsFilePath = path.join(__dirname, '../data/notifications.json');
        
        try {
            const data = await fs.readFile(notificationsFilePath, 'utf8');
            const notifications = JSON.parse(data);
            
            console.log(`${notifications.length} اعلان برای انتقال یافت شد`);
            
            for (const notification of notifications) {
                try {
                    await createNotification(notification);
                    console.log(`اعلان ${notification.id} منتقل شد`);
                } catch (error) {
                    if (error.message.includes('UNIQUE constraint failed')) {
                        console.log(`اعلان ${notification.id} قبلاً وجود دارد`);
                    } else {
                        console.error(`خطا در انتقال اعلان ${notification.id}:`, error.message);
                    }
                }
            }
            console.log(`${notifications.length} اعلان پردازش شد`);
        } catch (fileError) {
            console.log('فایل notifications.json یافت نشد یا خالی است');
        }
    } catch (error) {
        console.error('خطا در انتقال اعلان‌ها:', error.message);
    }
}

async function migrateSignups() {
    try {
        console.log('انتقال ثبت‌نام‌ها...');
        const signupFilePath = path.join(__dirname, '../data/signup.json');
        
        try {
            const data = await fs.readFile(signupFilePath, 'utf8');
            const signups = JSON.parse(data);
            
            console.log(`${signups.length} ثبت‌نام برای انتقال یافت شد`);
            
            for (const phone of signups) {
                try {
                    await createSignupEntry(phone);
                    console.log(`ثبت‌نام ${phone} منتقل شد`);
                } catch (error) {
                    if (error.message.includes('UNIQUE constraint failed')) {
                        console.log(`ثبت‌نام ${phone} قبلاً وجود دارد`);
                    } else {
                        console.error(`خطا در انتقال ثبت‌نام ${phone}:`, error.message);
                    }
                }
            }
            console.log(`${signups.length} ثبت‌نام پردازش شد`);
        } catch (fileError) {
            console.log('فایل signup.json یافت نشد یا خالی است');
        }
    } catch (error) {
        console.error('خطا در انتقال ثبت‌نام‌ها:', error.message);
    }
}

// اجرای اسکریپت
if (require.main === module) {
    migrateAllDataToSQLite();
}

module.exports = {
    migrateAllDataToSQLite,
    migrateUsers,
    migrateProducts,
    migrate3DRequests,
    migrateTickets,
    migrateAppointments,
    migrateNotifications,
    migrateSignups
};
