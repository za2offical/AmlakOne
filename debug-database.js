
const { connectDB, getProductsByUser, getAllProducts } = require('./modules/database');

async function debugDatabase() {
    try {
        console.log('اتصال به دیتابیس...');
        await connectDB();
        
        console.log('بررسی تمام محصولات...');
        const allProducts = await getAllProducts();
        console.log('تعداد کل محصولات:', allProducts.length);
        
        if (allProducts.length > 0) {
            console.log('نمونه محصول اول:', allProducts[0]);
            
            // بررسی نام کاربری‌های منحصر به فرد
            const usernames = [...new Set(allProducts.map(p => p.username))];
            console.log('نام کاربری‌های موجود:', usernames);
            
            // بررسی محصولات هر کاربر
            for (const username of usernames) {
                const userProducts = await getProductsByUser(username);
                console.log(`محصولات کاربر ${username}:`, userProducts.length);
            }
        } else {
            console.log('هیچ محصولی در دیتابیس یافت نشد');
        }
        
    } catch (error) {
        console.error('خطا در بررسی دیتابیس:', error);
    }
}

debugDatabase();
