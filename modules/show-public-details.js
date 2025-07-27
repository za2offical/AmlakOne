
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const sanitize = require('sanitize-filename');
const { getProductById, get3DRequestById, get3DRequests } = require('./database');

// محدودیت درخواست
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقیقه
    max: 300, // حداکثر 300 درخواست برای جزئیات محصول
    message: { error: 'Too many requests, please try again later.' }
});

router.use(limiter);

// اعتبارسنجی نام کاربری
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return false;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]{1,50}$/;
    return usernameRegex.test(username);
}

// اعتبارسنجی ID محصول
function validateProductId(productId) {
    if (!productId || typeof productId !== 'string') {
        return false;
    }
    
    // فقط اعداد مجاز (timestamp format)
    const idRegex = /^\d{1,20}$/;
    return idRegex.test(productId);
}

// پیدا کردن محصول خاص
async function getProductDetails(username, productId) {
    try {
        // اعتبارسنجی ورودی‌ها
        if (!validateUsername(username) || !validateProductId(productId)) {
            return null;
        }

        const product = await getProductById(productId);
        
        // بررسی اینکه محصول متعلق به کاربر درست است
        if (product && product.username === username) {
            return product;
        }
        
        return null;
    } catch (error) {
        console.error('Error reading product details:', error);
        return null;
    }
}

// بررسی وجود درخواست 3D تایید شده
async function getApproved3DRequest(username, productId) {
    try {
        const requests = await get3DRequests();

        if (!requests || !Array.isArray(requests)) {
            return null;
        }

        // پیدا کردن درخواست تایید شده برای این محصول
        const request = requests.find(r => 
            r.username === username && 
            r.productId === productId && 
            r.status === 'تایید شده'
        );

        return request || null;
    } catch (error) {
        console.error('Error checking 3D request:', error);
        return null;
    }
}

// دریافت جزئیات محصول برای نمایش عمومی
router.get('/:username/:productId', async (req, res) => {
    try {
        const { username, productId } = req.params;

        // اعتبارسنجی پارامترها
        if (!validateUsername(username) || !validateProductId(productId)) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = await getProductDetails(username, productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // بررسی وجود درخواست 3D تایید شده
        const approved3DRequest = await getApproved3DRequest(username, productId);

        // آماده‌سازی داده‌های امن برای نمایش عمومی
        const safeProduct = {
            id: product.id,
            propertyType: product.propertyType || '',
            bedrooms: parseInt(product.bedrooms) || 0,
            area: parseFloat(product.area) || 0,
            constructionYear: product.constructionYear || null,
            salePrice: product.salePrice || null,
            pricePerMeter: product.pricePerMeter || null,
            deposit: product.deposit || null,
            monthlyRent: product.monthlyRent || null,
            allowConversion: product.allowConversion || false,
            conversionDeductAmount: product.conversionDeductAmount || null,
            conversionAddAmount: product.conversionAddAmount || null,
            images: Array.isArray(product.images) ? product.images : [],
            facilities: product.facilities || {},
            description: product.description || '',
            created_at: product.created_at,
            owner: username,
            has3D: !!approved3DRequest,
            url3D: approved3DRequest ? approved3DRequest.url : null
        };

        res.json(safeProduct);
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
