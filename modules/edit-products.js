const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { authenticateToken } = require('./auth');

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

        const userProductsPath = path.join('data', 'products', `${username}.json`);

        // بررسی وجود فایل محصولات
        try {
            await fs.access(userProductsPath);
        } catch {
            return res.status(404).json({ message: 'محصولی یافت نشد' });
        }

        // خواندن محصولات
        const data = await fs.readFile(userProductsPath, 'utf8');
        const productsData = JSON.parse(data);

        // پیدا کردن محصول
        const product = productsData.products.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
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

        // بروزرسانی فیلدها
        if (propertyType !== undefined) product.propertyType = propertyType;
        if (bedrooms !== undefined) product.bedrooms = parseInt(bedrooms);
        if (area !== undefined) product.area = parseInt(area);
        if (constructionYear !== undefined) product.constructionYear = constructionYear ? parseInt(constructionYear) : null;
        if (description !== undefined) product.description = description;
        if (location !== undefined) product.location = location;

        // بروزرسانی اطلاعات خصوصی
        if (propertyAddress !== undefined) product.propertyAddress = propertyAddress;
        if (ownerName !== undefined) product.ownerName = ownerName;
        if (ownerPhone !== undefined) product.ownerPhone = ownerPhone;
        if (propertyNumber !== undefined) product.propertyNumber = propertyNumber;
        if (tenantName !== undefined) product.tenantName = tenantName;
        if (tenantPhone !== undefined) product.tenantPhone = tenantPhone;

        // بروزرسانی امکانات ملک
        product.facilities = {
            parking: req.body.parking === 'true' || req.body.parking === true,
            storage: req.body.storage === 'true' || req.body.storage === true,
            elevator: req.body.elevator === 'true' || req.body.elevator === true,
            balcony: req.body.balcony === 'true' || req.body.balcony === true,
            parquet: req.body.parquet === 'true' || req.body.parquet === true,
            westernToilet: req.body.westernToilet === 'true' || req.body.westernToilet === true
        };

        // بروزرسانی فیلدهای قیمت‌گذاری
        if (propertyType === 'sale') {
            if (salePrice !== undefined && salePrice !== '') {
                product.salePrice = parseInt(salePrice);
                // محاسبه قیمت هر متر
                if (product.area && product.area > 0) {
                    product.pricePerMeter = Math.round(product.salePrice / product.area);
                }
            }
            // حذف فیلدهای اجاره اگر نوع به فروش تغییر کرده
            delete product.deposit;
            delete product.monthlyRent;
            delete product.allowConversion;
            delete product.conversionDeductAmount;
            delete product.conversionAddAmount;
        } else if (propertyType === 'rent') {
            if (deposit !== undefined && deposit !== '') product.deposit = parseInt(deposit);
            if (monthlyRent !== undefined && monthlyRent !== '') product.monthlyRent = parseInt(monthlyRent);
            product.allowConversion = allowConversion === 'true';

            if (product.allowConversion) {
                if (conversionDeductAmount !== undefined && conversionDeductAmount !== '') {
                    product.conversionDeductAmount = parseInt(conversionDeductAmount);
                }
                if (conversionAddAmount !== undefined && conversionAddAmount !== '') {
                    product.conversionAddAmount = parseInt(conversionAddAmount);
                }
            } else {
                delete product.conversionDeductAmount;
                delete product.conversionAddAmount;
            }

            // حذف فیلدهای فروش اگر نوع به اجاره تغییر کرده
            delete product.salePrice;
            delete product.pricePerMeter;
        }

        // حذف عکس‌های قدیمی
        let deletedImages = [];
        if (req.body.deletedImages) {
            try {
                deletedImages = JSON.parse(req.body.deletedImages);
            } catch (e) {
                deletedImages = [];
            }
        }
        if (Array.isArray(deletedImages) && product.images) {
            for (const imgPath of deletedImages) {
                try {
                    const fullImagePath = path.join('public', imgPath);
                    await fs.unlink(fullImagePath);
                } catch (e) {}
                product.images = product.images.filter(p => p !== imgPath);
                if (product.mainImage === imgPath) {
                    product.mainImage = product.images.length > 0 ? product.images[0] : null;
                }
            }
        }
        // افزودن عکس‌های جدید
        if (req.files && req.files.length > 0) {
            if (!product.images) product.images = [];
            req.files.forEach(file => {
                const imagePath = `/images/img-${username}/${file.filename}`;
                product.images.push(imagePath);
            });
            if (!product.mainImage && product.images.length > 0) {
                product.mainImage = product.images[0];
            }
        }

        // بروزرسانی تاریخ آخرین ویرایش
        product.updated_at = new Date().toISOString();

        // ذخیره تغییرات
        await fs.writeFile(userProductsPath, JSON.stringify(productsData, null, 2));

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

        const userProductsPath = path.join('data', 'products', `${username}.json`);

        // بررسی وجود فایل محصولات
        try {
            await fs.access(userProductsPath);
        } catch {
            return res.status(404).json({ message: 'محصولی یافت نشد' });
        }

        // خواندن محصولات
        const data = await fs.readFile(userProductsPath, 'utf8');
        const productsData = JSON.parse(data);

        // پیدا کردن محصول
        const productIndex = productsData.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        const product = productsData.products[productIndex];
        const index = parseInt(imageIndex);

        if (!product.images || index < 0 || index >= product.images.length) {
            return res.status(404).json({ message: 'تصویر یافت نشد' });
        }

        // حذف فایل تصویر
        const imagePath = product.images[index];
        try {
            const fullImagePath = path.join('public', imagePath);
            await fs.unlink(fullImagePath);
        } catch (error) {
            console.log('خطا در حذف فایل تصویر:', error.message);
        }

        // حذف تصویر از آرایه
        product.images.splice(index, 1);

        // اگر تصویر اصلی حذف شد، تصویر اصلی جدید تنظیم کن
        if (product.mainImage === imagePath) {
            product.mainImage = product.images.length > 0 ? product.images[0] : null;
        }

        // بروزرسانی تاریخ آخرین ویرایش
        product.updated_at = new Date().toISOString();

        // ذخیره تغییرات
        await fs.writeFile(userProductsPath, JSON.stringify(productsData, null, 2));

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

        const userProductsPath = path.join('data', 'products', `${username}.json`);

        // بررسی وجود فایل محصولات
        try {
            await fs.access(userProductsPath);
        } catch {
            return res.status(404).json({ message: 'محصولی یافت نشد' });
        }

        // خواندن محصولات
        const data = await fs.readFile(userProductsPath, 'utf8');
        const productsData = JSON.parse(data);

        // پیدا کردن محصول
        const productIndex = productsData.products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            return res.status(404).json({ message: 'محصول یافت نشد' });
        }

        const product = productsData.products[productIndex];

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

        // حذف محصول از آرایه
        productsData.products.splice(productIndex, 1);

        // ذخیره تغییرات
        await fs.writeFile(userProductsPath, JSON.stringify(productsData, null, 2));

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

        const userProductsPath = path.join('data', 'products', `${username}.json`);

        // بررسی وجود فایل محصولات
        try {
            await fs.access(userProductsPath);
        } catch {
            return res.status(404).json({ message: 'محصولی یافت نشد' });
        }

        // خواندن محصولات
        const data = await fs.readFile(userProductsPath, 'utf8');
        const productsData = JSON.parse(data);

        // پیدا کردن محصولات برای حذف
        const productsToDelete = productsData.products.filter(p => productIds.includes(p.id));

        if (productsToDelete.length === 0) {
            return res.status(404).json({ message: 'هیچ محصولی برای حذف یافت نشد' });
        }

        // حذف تصاویر محصولات
        for (const product of productsToDelete) {
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
        }

        // حذف محصولات از آرایه
        productsData.products = productsData.products.filter(p => !productIds.includes(p.id));

        // ذخیره تغییرات
        await fs.writeFile(userProductsPath, JSON.stringify(productsData, null, 2));

        res.json({ 
            message: `${productsToDelete.length} محصول با موفقیت حذف شد`,
            deletedCount: productsToDelete.length
        });

    } catch (error) {
        console.error('خطا در حذف چندتایی محصولات:', error);
        res.status(500).json({ message: 'خطای سرور' });
    }
});

module.exports = router;