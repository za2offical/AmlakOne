const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const rateLimit = require('express-rate-limit');
const { getProductsByUser, getProductById, deleteProduct, updateProduct } = require('./database');
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
        console.log('Getting products for user:', username);
        const products = await getProductsByUser(username);
        console.log('Raw products from database:', products);

        if (!products || !Array.isArray(products)) {
            console.log('No products found or invalid format');
            return [];
        }

        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        const sortedProducts = products.sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        console.log('Sorted products:', sortedProducts.length);
        return sortedProducts;
    } catch (error) {
        console.error('Error reading user products:', error);
        return [];
    }
}

// Export the function for external use
module.exports.getUserProducts = getUserProducts;

// دریافت محصولات برای نمایش در پنل
router.get('/user-products', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        console.log('Loading products for user:', username);
        
        const products = await getUserProducts(username);
        console.log('Found', products.length, 'products for user:', username);

        if (!products || products.length === 0) {
            console.log('No products found for user:', username);
            return res.json([]);
        }

        // آماده‌سازی داده‌های امن برای نمایش
        const safeProducts = products.map(product => {
            console.log('Processing product:', product.id, 'for user:', username);
            return {
                id: product.id,
                bedrooms: product.bedrooms || 0,
                area: product.area || 0,
                mainImage: (product.images && product.images.length > 0) ? product.images[0] : '',
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
            };
        });

        console.log('Sending safe products:', safeProducts.length);
        res.json(safeProducts);
    } catch (error) {
        console.error('Error fetching products for panel:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
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

// دریافت محصولات کاربر جاری
router.get('/my-products', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const products = await getProductsByUser(username);
        res.json(products || []);
    } catch (error) {
        console.error('خطا در دریافت محصولات کاربر:', error);
        res.status(500).json({ error: 'خطا در دریافت محصولات' });
    }
});

// دریافت محصول خاص
router.get('/product/:id', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await getProductById(productId);

        if (!product) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        res.json(product);
    } catch (error) {
        console.error('خطا در دریافت محصول:', error);
        res.status(500).json({ error: 'خطا در دریافت محصول' });
    }
});

// حذف محصول
router.delete('/product/:id', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.id;
        const username = req.user.username;

        // بررسی مالکیت محصول
        const product = await getProductById(productId);
        if (!product || product.username !== username) {
            return res.status(404).json({ error: 'محصول یافت نشد یا دسترسی ندارید' });
        }

        await deleteProduct(productId);

        res.json({
            success: true,
            message: 'محصول با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا در حذف محصول:', error);
        res.status(500).json({ error: 'خطا در حذف محصول' });
    }
});

// به‌روزرسانی وضعیت محصول
router.put('/product/:id/status', authenticateToken, async (req, res) => {
    try {
        const productId = req.params.id;
        const { status } = req.body;
        const username = req.user.username;

        // بررسی مالکیت محصول
        const product = await getProductById(productId);
        if (!product || product.username !== username) {
            return res.status(404).json({ error: 'محصول یافت نشد یا دسترسی ندارید' });
        }

        await updateProduct(productId, { 
            status: status,
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'وضعیت محصول با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی وضعیت محصول:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت محصول' });
    }
});

module.exports = router;