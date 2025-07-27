const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const sharp = require('sharp');
const sanitize = require('sanitize-filename');
const { authenticateToken } = require('./auth');

// تنظیمات آپلود فایل
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        files: 5, // حداکثر 5 فایل
        fileSize: 50 * 1024 * 1024 // حداکثر 50 مگابایت
    },
    fileFilter: (req, file, cb) => {
        // فقط تصاویر مجاز
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    }
}).array('images', 5);

// ایجاد دایرکتوری‌های مورد نیاز
async function ensureDirectories(username) {
    const userProductsDir = path.join(__dirname, '..', 'data', 'products');
    const userImagesDir = path.join(__dirname, '..', 'public', 'images', `img-${sanitize(username)}`);

    // ایجاد دایرکتوری‌های مورد نیاز
    await fs.mkdir(userProductsDir, { recursive: true });
    await fs.mkdir(userImagesDir, { recursive: true });

    return {
        dataPath: path.join(userProductsDir, `${sanitize(username)}.json`),
        imagesDir: userImagesDir
    };
}

// خواندن اطلاعات محصولات کاربر
async function readUserProducts(dataPath) {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        const userData = JSON.parse(data);
        
        // اضافه کردن فیلد total_products_created اگر وجود نداشته باشد
        if (typeof userData.total_products_created !== 'number') {
            userData.total_products_created = userData.products?.length || 0;
        }
        
        return userData;
    } catch (error) {
        return { 
            products: [],
            total_products_created: 0
        };
    }
}

// پردازش و ذخیره تصویر
async function processAndSaveImage(file, username, index) {
    const timestamp = Date.now();
    const filename = `product-${timestamp}-${index}.jpg`;
    const userImagesDir = `img-${sanitize(username)}`;
    const outputPath = path.join(__dirname, '..', 'public', 'images', userImagesDir, filename);

    // تعیین کیفیت بر اساس سایز اولیه فایل
    let quality = 85;
    const fileSizeMB = file.buffer.length / (1024 * 1024);

    if (fileSizeMB > 8) {
        quality = 50;
    } else if (fileSizeMB > 4) {
        quality = 60;
    } else if (fileSizeMB > 2) {
        quality = 70;
    }

    // تغییر سایز هوشمند بر اساس سایز اولیه
    let resizeWidth = 1200;
    let resizeHeight = 900;

    if (fileSizeMB > 8) {
        resizeWidth = 800;
        resizeHeight = 600;
    } else if (fileSizeMB > 4) {
        resizeWidth = 1000;
        resizeHeight = 750;
    }

    await sharp(file.buffer)
        .resize(resizeWidth, resizeHeight, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({
            quality: quality,
            progressive: true,
            mozjpeg: true // استفاده از mozjpeg برای فشرده‌سازی بهتر
        })
        .toFile(outputPath);

    // بررسی سایز نهایی و فشرده‌سازی بیشتر در صورت نیاز
    const stats = await fs.stat(outputPath);
    if (stats.size > 300 * 1024) { // اگر بزرگتر از 300KB بود
        let newQuality = Math.max(quality - 20, 30); // کاهش کیفیت با حداقل 30

        await sharp(outputPath)
            .jpeg({
                quality: newQuality,
                progressive: true,
                mozjpeg: true
            })
            .toFile(outputPath + '.tmp');

        await fs.unlink(outputPath);
        await fs.rename(outputPath + '.tmp', outputPath);

        // بررسی مجدد و فشرده‌سازی بیشتر در صورت نیاز
        const finalStats = await fs.stat(outputPath);
        if (finalStats.size > 200 * 1024 && newQuality > 30) {
            await sharp(outputPath)
                .jpeg({
                    quality: 30,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(outputPath + '.tmp2');

            await fs.unlink(outputPath);
            await fs.rename(outputPath + '.tmp2', outputPath);
        }
    }

    return `/images/${userImagesDir}/${filename}`;
}

// میدلور برای مدیریت آپلود فایل‌ها
const handleUpload = (req, res, next) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'File upload error: ' + err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Unknown error: ' + err.message });
        }
        next();
    });
};

// اعتبارسنجی داده‌های محصول
function validateProductData(data) {
    const { bedrooms, area } = data;

    if (!bedrooms || !area) {
        throw new Error('Bedrooms and area are required');
    }

    if (isNaN(bedrooms) || bedrooms < 0 || bedrooms > 10) {
        throw new Error('Invalid number of bedrooms');
    }

    if (isNaN(area) || area < 0 || area > 1000) {
        throw new Error('Invalid area');
    }

    // اعتبارسنجی شماره تلفن ایرانی
    if (data.ownerPhone && !/^09[0-9]{9}$/.test(data.ownerPhone)) {
        throw new Error('Invalid owner phone number format');
    }

    if (data.tenantPhone && !/^09[0-9]{9}$/.test(data.tenantPhone)) {
        throw new Error('Invalid tenant phone number format');
    }

    // اعتبارسنجی طول توضیحات
    if (data.description && data.description.length > 200) {
        throw new Error('Description must be 200 characters or less');
    }
}

// ایجاد محصول جدید
router.post('/create', authenticateToken, handleUpload, async (req, res) => {
    try {
        const username = req.user.username;
        const { bedrooms, area } = req.body;

        // اعتبارسنجی داده‌ها
        validateProductData({ bedrooms, area });

        const { dataPath, imagesDir } = await ensureDirectories(username);
        const userData = await readUserProducts(dataPath);

        // بررسی محدودیت تعداد آگهی مستقیماً از فایل کاربر
        const totalCreated = userData.total_products_created || 0;
        const limit = userData.product_limit;
        
        if (limit !== null && totalCreated >= limit) {
            return res.status(403).json({
                error: `شما به حد مجاز ایجاد آگهی رسیده‌اید. حداکثر ${limit} آگهی مجاز است.`,
                used: totalCreated,
                limit: limit,
                userLevel: userData.user_level || 0,
                canCreate: false
            });
        }

        // پردازش تصاویر
        const imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const imageUrl = await processAndSaveImage(req.files[i], username, i);
                imageUrls.push(imageUrl);
            }
        }

        // استخراج و پردازش داده‌های جدید
        const { 
            propertyType, parking, storage, elevator, balcony, 
            parquet, westernToilet, propertyAddress, ownerName, ownerPhone, 
            propertyNumber, tenantName, tenantPhone, description, constructionYear,
            salePrice, deposit, monthlyRent, allowConversion,
            conversionDeductAmount, conversionAddAmount
        } = req.body;

        // ایجاد محصول جدید
        const newProduct = {
            id: Date.now().toString(),
            propertyType: propertyType,
            bedrooms: parseInt(bedrooms),
            area: parseFloat(area),
            constructionYear: constructionYear ? parseInt(constructionYear) : null,
            images: imageUrls,
            // امکانات
            facilities: {
                parking: parking === 'true',
                storage: storage === 'true',
                elevator: elevator === 'true',
                balcony: balcony === 'true',
                parquet: parquet === 'true',
                westernToilet: westernToilet === 'true'
            },
            // اطلاعات خصوصی
            privateInfo: {
                propertyAddress: propertyAddress || '',
                ownerName: ownerName || '',
                ownerPhone: ownerPhone || '',
                propertyNumber: propertyNumber || '',
                tenantName: tenantName || '',
                tenantPhone: tenantPhone || ''
            },
            description: description || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // اضافه کردن فیلدهای قیمت‌گذاری
        if (propertyType === 'sale') {
            if (salePrice && salePrice !== '') {
                newProduct.salePrice = parseInt(salePrice);
                // محاسبه قیمت هر متر
                if (newProduct.area && newProduct.area > 0) {
                    newProduct.pricePerMeter = Math.round(newProduct.salePrice / newProduct.area);
                }
            }
        } else if (propertyType === 'rent') {
            if (deposit && deposit !== '') newProduct.deposit = parseInt(deposit);
            if (monthlyRent && monthlyRent !== '') newProduct.monthlyRent = parseInt(monthlyRent);
            newProduct.allowConversion = allowConversion === 'true';

            if (newProduct.allowConversion) {
                if (conversionDeductAmount && conversionDeductAmount !== '') {
                    newProduct.conversionDeductAmount = parseInt(conversionDeductAmount);
                }
                if (conversionAddAmount && conversionAddAmount !== '') {
                    newProduct.conversionAddAmount = parseInt(conversionAddAmount);
                }
            }
        }

        userData.products.push(newProduct);

        // افزایش تعداد کل آگهی‌های ایجاد شده
        if (typeof userData.total_products_created !== 'number') {
            userData.total_products_created = userData.products.length;
        } else {
            userData.total_products_created += 1;
        }

        // ذخیره اطلاعات
        await fs.writeFile(dataPath, JSON.stringify(userData, null, 2));

        res.status(201).json({ 
            success: true, 
            message: 'Product created successfully',
            product: newProduct 
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(400).json({ error: error.message });
    }
});

// دریافت محصولات کاربر
router.get('/my-products', authenticateToken, async (req, res) => {
    try {
        const { dataPath } = await ensureDirectories(req.user.username);
        const userData = await readUserProducts(dataPath);
        res.json(userData.products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;