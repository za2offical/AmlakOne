const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const rateLimit = require('express-rate-limit');
const { getProductsByUser } = require('./database');
const sanitizeHtml = require('sanitize-html');

// محدودیت درخواست
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 100 // حداکثر 100 درخواست
});

router.use(limiter);

// خواندن محصولات کاربر
async function getUserProducts(username) {
    try {
        const products = await getProductsByUser(username);
        
        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        return products.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    } catch (error) {
        console.error('Error reading user products:', error);
        return [];
    }
}

// دریافت محصولات برای نمایش در پنل
router.get('/user-products', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        console.log('Loading products for user:', username);
        const products = await getUserProducts(username);
        console.log('Found', products.length, 'products for user:', username);

        // آماده‌سازی داده‌های امن برای نمایش
        const safeProducts = products.map(product => ({
            id: product.id,
            bedrooms: product.bedrooms,
            area: product.area,
            mainImage: product.images[0] || '',
            created_at: product.created_at,
            url: `/${encodeURIComponent(username)}/${product.id}-n`,
            propertyType: product.propertyType || 'rent', // default value
            salePrice: product.salePrice || null,
            deposit: product.deposit || null,
            monthlyRent: product.monthlyRent || null,
            pricePerMeter: product.pricePerMeter || null,
            allowConversion: product.allowConversion || false,
            conversionDeductAmount: product.conversionDeductAmount || null,
            conversionAddAmount: product.conversionAddAmount || null
        }));

        res.json(safeProducts);
    } catch (error) {
        console.error('Error fetching products for panel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// دریافت محصولات کامل برای قرارها
router.get('/products', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const products = await getUserProducts(username);

        // ارسال محصولات کامل برای استفاده در قرارها
        const fullProducts = products.map(product => ({
            id: product.id,
            bedrooms: product.bedrooms,
            area: product.area,
            propertyType: product.propertyType || 'rent',
            salePrice: product.salePrice || null,
            deposit: product.deposit || null,
            monthlyRent: product.monthlyRent || null,
            pricePerMeter: product.pricePerMeter || null,
            allowConversion: product.allowConversion || false,
            conversionDeductAmount: product.conversionDeductAmount || null,
            conversionAddAmount: product.conversionAddAmount || null,
            privateInfo: product.privateInfo || {},
            description: product.description || '',
            created_at: product.created_at
        }));

        res.json({ products: fullProducts });
    } catch (error) {
        console.error('Error fetching products for appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;