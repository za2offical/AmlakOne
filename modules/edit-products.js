const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('./auth');
const { 
    getProductById, 
    updateProduct, 
    deleteProduct,
    getDB 
} = require('./database');

// تنظیمات multer برای آپلود تصاویر
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userDir = path.join('public', 'images', `img-${req.user.username}`);
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('فقط فایل‌های تصویری مجاز هستند'), false);
        }
    }
});

// اعمال middleware احراز هویت
router.use(authenticateToken);

// دریافت اطلاعات یک محصول خاص
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const username = req.user.username;

        // دریافت محصول از دیتابیس
        const product = await getProductById(productId);
        
        if (!product) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        // بررسی مالکیت محصول
        if (product.username !== username) {
            return res.status(403).json({ message: 'شما مجاز به دسترسی این محصول نیستید' });
        }

        res.json(product);

    } catch (error) {
        console.error('خطا در دریافت اطلاعات محصول:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
});

// بروزرسانی محصول
router.put('/update/:productId', upload.array('newImages', 10), async (req, res) => {
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    console.log('deletedOldImageIndexes:', req.body.deletedOldImageIndexes);
    try {
        const { productId } = req.params;
        const username = req.user.username;
        const { 
            bedrooms, area, description, location, propertyType, constructionYear,
            propertyAddress, ownerName, ownerPhone, propertyNumber, tenantName, tenantPhone,
            salePrice, deposit, monthlyRent, allowConversion,
            conversionDeductAmount, conversionAddAmount
        } = req.body;

        // دریافت محصول از دیتابیس
        const product = await getProductById(productId);

        if (!product) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        // بررسی مالکیت محصول
        if (product.username !== username) {
            return res.status(403).json({ message: 'شما مجاز به ویرایش این محصول نیستید' });
        }

        // آماده کردن داده‌های بروزرسانی
        const updateData = {};
        
        if (propertyType !== undefined) updateData.propertyType = propertyType;
        if (bedrooms !== undefined) updateData.bedrooms = parseInt(bedrooms);
        if (area !== undefined) updateData.area = parseFloat(area);
        if (constructionYear !== undefined) updateData.constructionYear = constructionYear ? parseInt(constructionYear) : null;
        if (description !== undefined) updateData.description = description;
        if (location !== undefined) updateData.location = location;

        // بروزرسانی اطلاعات خصوصی
        const privateInfo = product.privateInfo || {};
        if (propertyAddress !== undefined) privateInfo.propertyAddress = propertyAddress;
        if (ownerName !== undefined) privateInfo.ownerName = ownerName;
        if (ownerPhone !== undefined) privateInfo.ownerPhone = ownerPhone;
        if (propertyNumber !== undefined) privateInfo.propertyNumber = propertyNumber;
        if (tenantName !== undefined) privateInfo.tenantName = tenantName;
        if (tenantPhone !== undefined) privateInfo.tenantPhone = tenantPhone;
        updateData.privateInfo = JSON.stringify(privateInfo);

        // بروزرسانی امکانات ملک
        const facilities = {
            parking: req.body.parking === 'true' || req.body.parking === true,
            storage: req.body.storage === 'true' || req.body.storage === true,
            elevator: req.body.elevator === 'true' || req.body.elevator === true,
            balcony: req.body.balcony === 'true' || req.body.balcony === true,
            parquet: req.body.parquet === 'true' || req.body.parquet === true,
            westernToilet: req.body.westernToilet === 'true' || req.body.westernToilet === true
        };
        updateData.facilities = JSON.stringify(facilities);

        // بروزرسانی فیلدهای قیمت‌گذاری
        if (propertyType === 'sale') {
            if (salePrice !== undefined && salePrice !== '') {
                updateData.salePrice = parseInt(salePrice);
                // محاسبه قیمت هر متر
                if (updateData.area && updateData.area > 0) {
                    updateData.pricePerMeter = Math.round(updateData.salePrice / updateData.area);
                } else if (product.area && product.area > 0) {
                    updateData.pricePerMeter = Math.round(updateData.salePrice / product.area);
                }
            }
            // حذف فیلدهای اجاره
            updateData.deposit = null;
            updateData.monthlyRent = null;
            updateData.allowConversion = 0;
            updateData.conversionDeductAmount = null;
            updateData.conversionAddAmount = null;
        } else if (propertyType === 'rent') {
            if (deposit !== undefined && deposit !== '') updateData.deposit = parseInt(deposit);
            if (monthlyRent !== undefined && monthlyRent !== '') updateData.monthlyRent = parseInt(monthlyRent);
            updateData.allowConversion = allowConversion === 'true' ? 1 : 0;

            if (allowConversion === 'true') {
                if (conversionDeductAmount !== undefined && conversionDeductAmount !== '') {
                    updateData.conversionDeductAmount = parseInt(conversionDeductAmount);
                }
                if (conversionAddAmount !== undefined && conversionAddAmount !== '') {
                    updateData.conversionAddAmount = parseInt(conversionAddAmount);
                }
            } else {
                updateData.conversionDeductAmount = null;
                updateData.conversionAddAmount = null;
            }

            // حذف فیلدهای فروش
            updateData.salePrice = null;
            updateData.pricePerMeter = null;
        }

        // مدیریت تصاویر
        let currentImages = product.images || [];

        // حذف عکس‌های قدیمی
        let deletedImages = [];
        if (req.body.deletedImages) {
            try {
                deletedImages = JSON.parse(req.body.deletedImages);
            } catch (e) {
                deletedImages = [];
            }
        }
        if (Array.isArray(deletedImages)) {
            for (const imgPath of deletedImages) {
                try {
                    const fullImagePath = path.join('public', imgPath);
                    await fs.unlink(fullImagePath);
                } catch (e) {}
                currentImages = currentImages.filter(p => p !== imgPath);
            }
        }

        // افزودن عکس‌های جدید
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                const imagePath = `/images/img-${username}/${file.filename}`;
                currentImages.push(imagePath);
            });
        }

        updateData.images = JSON.stringify(currentImages);

        // بروزرسانی در دیتابیس
        await updateProduct(productId, updateData);

        res.json({ message: 'محصول با موفقیت بروزرسانی شد', product });

    } catch (error) {
        console.error('خطا در بروزرسانی محصول:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
});

// حذف تصویر خاص
router.delete('/delete-image/:productId/:imageIndex', async (req, res) => {
    try {
        const { productId, imageIndex } = req.params;
        const username = req.user.username;

        // دریافت محصول از دیتابیس
        const product = await getProductById(productId);
        
        if (!product) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        // بررسی مالکیت محصول
        if (product.username !== username) {
            return res.status(403).json({ message: 'شما مجاز به ویرایش این محصول نیستید' });
        }

        const index = parseInt(imageIndex);
        const currentImages = product.images || [];

        if (index < 0 || index >= currentImages.length) {
            return res.status(404).json({ message: 'تصویر یافت نشد' });
        }

        // حذف فایل تصویر
        const imagePath = currentImages[index];
        try {
            const fullImagePath = path.join('public', imagePath);
            await fs.unlink(fullImagePath);
        } catch (error) {
            console.log('خطا در حذف فایل تصویر:', error.message);
        }

        // حذف تصویر از آرایه
        currentImages.splice(index, 1);

        // بروزرسانی تصاویر در دیتابیس
        await updateProduct(productId, {
            images: JSON.stringify(currentImages)
        });

        res.json({ message: 'تصویر با موفقیت حذف شد' });

    } catch (error) {
        console.error('خطا در حذف تصویر:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
});

// حذف تکی محصول
router.delete('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const username = req.user.username;

        // دریافت محصول از دیتابیس
        const product = await getProductById(productId);
        
        if (!product) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        // بررسی مالکیت محصول
        if (product.username !== username) {
            return res.status(403).json({ message: 'شما مجاز به حذف این محصول نیستید' });
        }

        // حذف تصاویر محصول
        if (product.images && product.images.length > 0) {
            for (const imagePath of product.images) {
                try {
                    const fullImagePath = path.join('public', imagePath);
                    await fs.unlink(fullImagePath);
                } catch (error) {
                    console.log('خطا در حذف تصویر:', error.message);
                }
            }
        }

        // حذف محصول از دیتابیس
        await deleteProduct(productId);

        res.json({ message: 'محصول با موفقیت حذف شد' });

    } catch (error) {
        console.error('خطا در حذف محصول:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
});

// حذف چندتایی محصولات
router.post('/bulk-delete', async (req, res) => {
    try {
        const { productIds } = req.body;
        const username = req.user.username;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'لیست محصولات نامعتبر است' });
        }

        let deletedCount = 0;

        // حذف هر محصول به صورت جداگانه
        for (const productId of productIds) {
            try {
                // دریافت محصول از دیتابیس
                const product = await getProductById(productId);
                
                if (!product) {
                    console.log(`محصول ${productId} یافت نشد`);
                    continue;
                }

                // بررسی مالکیت محصول
                if (product.username !== username) {
                    console.log(`کاربر ${username} مجاز به حذف محصول ${productId} نیست`);
                    continue;
                }

                // حذف تصاویر محصول
                if (product.images && product.images.length > 0) {
                    for (const imagePath of product.images) {
                        try {
                            const fullImagePath = path.join('public', imagePath);
                            await fs.unlink(fullImagePath);
                        } catch (error) {
                            console.log('خطا در حذف تصویر:', error.message);
                        }
                    }
                }

                // حذف محصول از دیتابیس
                await deleteProduct(productId);
                deletedCount++;

            } catch (error) {
                console.error(`خطا در حذف محصول ${productId}:`, error);
            }
        }

        res.json({ 
            message: `${deletedCount} محصول با موفقیت حذف شد`,
            deletedCount: deletedCount
        });

    } catch (error) {
        console.error('خطا در حذف چندتایی محصولات:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
});

module.exports = router;