
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
const sanitize = require('sanitize-filename');

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

        const sanitizedUsername = sanitize(username);
        const dataPath = path.join(__dirname, '..', 'data', 'products', `${sanitizedUsername}.json`);
        
        // بررسی وجود فایل
        try {
            await fs.access(dataPath);
        } catch {
            return null;
        }

        const data = await fs.readFile(dataPath, 'utf8');
        const userData = JSON.parse(data);

        if (!userData.products || !Array.isArray(userData.products)) {
            return null;
        }

        // پیدا کردن محصول با ID مشخص
        const product = userData.products.find(p => p.id === productId);
        return product || null;
    } catch (error) {
        console.error('Error reading product details:', error);
        return null;
    }
}

// بررسی وجود درخواست 3D تایید شده
async function getApproved3DRequest(username, productId) {
    try {
        const dataPath = path.join(__dirname, '..', '3D', 'data.json');
        
        try {
            await fs.access(dataPath);
        } catch {
            return null;
        }

        const data = await fs.readFile(dataPath, 'utf8');
        const requestsData = JSON.parse(data);

        if (!requestsData.requests || !Array.isArray(requestsData.requests)) {
            return null;
        }

        // پیدا کردن درخواست تایید شده برای این محصول
        const request = requestsData.requests.find(r => 
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
