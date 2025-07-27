const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const helmet = require('helmet');
const { getProductById } = require('./database');
const sanitizeHtml = require('sanitize-html');

// استفاده از helmet برای امنیت بیشتر
router.use(helmet());

// خواندن اطلاعات محصول خاص
async function getProductDetails(username, productId) {
    try {
        const product = await getProductById(productId);
        
        // بررسی اینکه محصول متعلق به کاربر درخواست کننده است
        if (product && product.username === username) {
            return product;
        }
        
        return null;
    } catch (error) {
        console.error('Error reading product details:', error);
        return null;
    }
}

// دریافت اطلاعات محصول
router.get('/:username/:productId', authenticateToken, async (req, res) => {
    try {
        const { username, productId } = req.params;
        const requestingUser = req.user.username;

        // بررسی دسترسی
        if (username !== requestingUser) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // حذف -n از آخر productId
        const cleanProductId = productId.replace(/-n$/, '');

        const product = await getProductDetails(username, cleanProductId);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // آماده‌سازی داده‌های امن
        const safeProduct = {
            id: product.id,
            propertyType: product.propertyType || '',
            bedrooms: product.bedrooms,
            area: product.area,
            constructionYear: product.constructionYear || null,
            salePrice: product.salePrice || null,
            pricePerMeter: product.pricePerMeter || null,
            deposit: product.deposit || null,
            monthlyRent: product.monthlyRent || null,
            allowConversion: product.allowConversion || false,
            conversionDeductAmount: product.conversionDeductAmount || null,
            conversionAddAmount: product.conversionAddAmount || null,
            images: product.images.map(img => sanitizeHtml(img)),
            facilities: product.facilities || {},
            privateInfo: product.privateInfo || {},
            description: product.description || '',
            created_at: product.created_at,
            updated_at: product.updated_at
        };

        res.json(safeProduct);
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;