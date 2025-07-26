
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { authenticateToken } = require('./auth');

// تعریف پلن‌ها
const PLANS = {
    0: { name: 'رایگان', limit: 20 },
    1: { name: 'برنزی', limit: 50 },
    2: { name: 'نقره‌ای', limit: 100 },
    3: { name: 'طلایی', limit: 200 },
    4: { name: 'پلاتینیوم', limit: -1 } // بدون محدودیت
};

// خواندن کاربران
async function readUsers() {
    try {
        const data = await fs.readFile(path.join(__dirname, '..', 'data', 'users.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// نوشتن کاربران
async function writeUsers(users) {
    await fs.writeFile(
        path.join(__dirname, '..', 'data', 'users.json'), 
        JSON.stringify(users, null, 2)
    );
}

// خواندن محصولات کاربر
async function readUserProducts(username) {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'products', `${username}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { products: [] };
    }
}

// نوشتن محصولات کاربر
async function writeUserProducts(username, productsData) {
    const filePath = path.join(__dirname, '..', 'data', 'products', `${username}.json`);
    await fs.writeFile(filePath, JSON.stringify(productsData, null, 2));
}

// اضافه کردن level به کاربران که تکمیل پروفایل شده‌اند
async function initializeUserLevels() {
    const users = await readUsers();
    let updated = false;

    for (let user of users) {
        if (user.profileCompleted && !user.hasOwnProperty('level')) {
            user.level = 0;
            user.totalProductsCreated = 0;
            updated = true;
        }
    }

    if (updated) {
        await writeUsers(users);
    }
}

// محاسبه تعداد واقعی محصولات کاربر
async function calculateUserProductCount(username) {
    try {
        const userProducts = await readUserProducts(username);
        return userProducts.products ? userProducts.products.length : 0;
    } catch (error) {
        return 0;
    }
}

// بررسی محدودیت کاربر
async function checkUserLimit(username) {
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1 || !users[userIndex].profileCompleted) {
        return { canCreate: false, error: 'پروفایل شما تکمیل نشده است' };
    }

    // اطمینان از وجود level و همگام‌سازی با تعداد واقعی محصولات
    if (!users[userIndex].hasOwnProperty('level')) {
        users[userIndex].level = 0;
        users[userIndex].totalProductsCreated = await calculateUserProductCount(username);
        await writeUsers(users);
    } else {
        // همگام‌سازی تعداد محصولات با فایل
        const actualCount = await calculateUserProductCount(username);
        if (users[userIndex].totalProductsCreated !== actualCount) {
            users[userIndex].totalProductsCreated = actualCount;
            await writeUsers(users);
        }
    }

    const user = users[userIndex];
    const userPlan = PLANS[user.level];
    const totalCreated = user.totalProductsCreated || 0;

    if (userPlan.limit === -1) {
        return { canCreate: true, plan: userPlan, used: totalCreated, limit: 'نامحدود' };
    }

    if (totalCreated >= userPlan.limit) {
        return { 
            canCreate: false, 
            error: `شما به حد مجاز پلن ${userPlan.name} رسیده‌اید (${userPlan.limit} آگهی)`,
            plan: userPlan,
            used: totalCreated,
            limit: userPlan.limit
        };
    }

    return { 
        canCreate: true, 
        plan: userPlan, 
        used: totalCreated, 
        limit: userPlan.limit 
    };
}

// افزایش شمارنده محصولات ایجاد شده
async function incrementUserProductCount(username) {
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex !== -1) {
        if (!users[userIndex].hasOwnProperty('totalProductsCreated')) {
            users[userIndex].totalProductsCreated = 0;
        }
        users[userIndex].totalProductsCreated += 1;
        await writeUsers(users);
    }
}

// میدلور احراز هویت
router.use(authenticateToken);

// دریافت اطلاعات پلن کاربر
router.get('/my-plan', async (req, res) => {
    try {
        const username = req.user.username;
        const limitCheck = await checkUserLimit(username);

        res.json({
            success: true,
            plan: limitCheck.plan,
            used: limitCheck.used,
            limit: limitCheck.limit,
            canCreate: limitCheck.canCreate
        });
    } catch (error) {
        console.error('Error getting user plan:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

// بررسی امکان ایجاد آگهی
router.get('/check-limit', async (req, res) => {
    try {
        const username = req.user.username;
        const limitCheck = await checkUserLimit(username);

        if (!limitCheck.canCreate) {
            return res.status(403).json({
                success: false,
                error: limitCheck.error,
                plan: limitCheck.plan,
                used: limitCheck.used,
                limit: limitCheck.limit
            });
        }

        res.json({
            success: true,
            canCreate: true,
            plan: limitCheck.plan,
            used: limitCheck.used,
            limit: limitCheck.limit
        });
    } catch (error) {
        console.error('Error checking limit:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

// دریافت لیست همه پلن‌ها
router.get('/all-plans', async (req, res) => {
    try {
        res.json({
            success: true,
            plans: PLANS
        });
    } catch (error) {
        console.error('Error getting plans:', error);
        res.status(500).json({ error: 'خطای داخلی سرور' });
    }
});

// راه‌اندازی اولیه - اجرا در هر بار لود شدن ماژول
initializeUserLevels().then(() => {
    console.log('User levels initialized successfully');
}).catch(error => {
    console.error('Error initializing user levels:', error);
});

module.exports = {
    router,
    checkUserLimit,
    incrementUserProductCount,
    initializeUserLevels,
    calculateUserProductCount
};
