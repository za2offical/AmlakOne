
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const sanitize = require('sanitize-filename');
const { getProductsByUser, getUserByUsername } = require('./database');

// محدودیت درخواست برای جلوگیری از abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 200, // حداکثر 200 درخواست برای عموم
    message: { error: 'Too many requests, please try again later.' }
});

router.use(limiter);

// اعتبارسنجی نام کاربری
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return false;
    }
    
    // فقط حروف، اعداد و _ مجاز
    const usernameRegex = /^[a-zA-Z0-9_]{1,50}$/;
    return usernameRegex.test(username);
}

// خواندن محصولات کاربر به صورت امن
async function getUserProductsPublic(username) {
    try {
        // اعتبارسنجی نام کاربری
        if (!validateUsername(username)) {
            return null;
        }

        // بررسی وجود کاربر
        const user = await getUserByUsername(username);
        if (!user) {
            return null;
        }

        const products = await getProductsByUser(username);

        if (!products || !Array.isArray(products)) {
            return [];
        }

        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        return products.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    } catch (error) {
        console.error('Error reading user products:', error);
        return null;
    }
}

// دریافت محصولات کاربر برای نمایش عمومی
router.get('/:username/products', async (req, res) => {
    try {
        const { username } = req.params;

        // اعتبارسنجی نام کاربری
        if (!validateUsername(username)) {
            return res.status(404).json({ error: 'User not found' });
        }

        const products = await getUserProductsPublic(username);
        
        if (products === null) {
            return res.status(404).json({ error: 'User not found or no products available' });
        }

        // آماده‌سازی داده‌های امن برای نمایش عمومی
        const safeProducts = products.map(product => ({
            id: product.id,
            bedrooms: parseInt(product.bedrooms) || 0,
            area: parseFloat(product.area) || 0,
            mainImage: product.images && product.images[0] ? product.images[0] : '',
            created_at: product.created_at,
            url: `/${encodeURIComponent(username)}/${product.id}`,
            propertyType: product.propertyType || 'rent',
            salePrice: product.salePrice || null,
            deposit: product.deposit || null,
            monthlyRent: product.monthlyRent || null,
            pricePerMeter: product.pricePerMeter || null,
            allowConversion: product.allowConversion || false,
            conversionDeductAmount: product.conversionDeductAmount || null,
            conversionAddAmount: product.conversionAddAmount || null
        }));

        res.json({
            username: username,
            products: safeProducts,
            total: safeProducts.length
        });
    } catch (error) {
        console.error('Error fetching public products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت اطلاعات کاربر برای نمایش نام
router.get('/user-info/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // اعتبارسنجی نام کاربری
        if (!validateUsername(username)) {
            return res.status(404).json({ error: 'User not found' });
        }

        try {
            const user = await getUserByUsername(username);
            
            if (user && user.firstName && user.lastName) {
                res.json({
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone || null
                });
            } else {
                res.json({ 
                    username: username,
                    phone: user ? user.phone : null
                });
            }
        } catch {
            res.json({ username: username });
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
