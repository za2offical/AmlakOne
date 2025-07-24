let currentProduct = null;
let productId = null;

// متغیرهای سراسری برای مدیریت گالری واحد
let galleryImages = []; // {type: 'old'|'new', src: string|blob, preview: string}
let deletedImages = [];

// دریافت ID محصول از URL
function getProductIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// بررسی وضعیت احراز هویت
async function checkAuth() {
    try {
        const response = await fetch('/api/panel/user-info');
        if (response.status === 401) {
            window.location.href = '/login';
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Authentication error:', error);
        window.location.href = '/login';
        return null;
    }
}

// نمایش/مخفی کردن امکانات اختیاری
function toggleOptionalFeatures() {
    const section = document.getElementById('optionalFeatures');
    const button = document.querySelector('.toggle-button');
    
    if (section.classList.contains('show')) {
        section.classList.remove('show');
        button.classList.remove('active');
        button.textContent = 'امکانات اختیاری';
    } else {
        section.classList.add('show');
        button.classList.add('active');
        button.textContent = 'مخفی کردن امکانات اختیاری';
    }
}

// تبدیل وضعیت فیلدهای قیمت بر اساس نوع آگهی
function togglePriceFields() {
    const propertyType = document.getElementById('propertyType').value;
    const saleFields = document.getElementById('saleFields');
    const rentFields = document.getElementById('rentFields');
    
    if (propertyType === 'sale') {
        saleFields.style.display = 'block';
        rentFields.style.display = 'none';
        
        // تنظیم required برای فیلدهای فروش
        document.getElementById('salePrice').required = true;
        document.getElementById('deposit').required = false;
    } else if (propertyType === 'rent') {
        saleFields.style.display = 'none';
        rentFields.style.display = 'block';
        
        // تنظیم required برای فیلدهای اجاره
        document.getElementById('salePrice').required = false;
        document.getElementById('deposit').required = true;
    } else {
        saleFields.style.display = 'none';
        rentFields.style.display = 'none';
        
        // حذف همه required ها
        document.getElementById('salePrice').required = false;
        document.getElementById('deposit').required = false;
    }
}

// تبدیل وضعیت فیلدهای تبدیل ودیعه
function toggleConversionFields() {
    const allowConversion = document.getElementById('allowConversion').checked;
    const conversionFields = document.getElementById('conversionFields');
    
    conversionFields.style.display = allowConversion ? 'block' : 'none';
}

// فرمت‌دهی قیمت با کاما
function formatPrice(input) {
    let value = input.value.replace(/,/g, '');
    if (value && !isNaN(value)) {
        input.value = parseInt(value).toLocaleString();
    }
}

// حذف کاما برای ارسال
function unformatPrice(value) {
    return value ? value.replace(/,/g, '') : '';
}

// راه‌اندازی فرمت‌دهی قیمت‌ها
function initPriceFormatting() {
    const priceInputs = document.querySelectorAll('.price-input');
    priceInputs.forEach(input => {
        input.addEventListener('input', function() {
            formatPrice(this);
        });
        
        input.addEventListener('blur', function() {
            formatPrice(this);
        });
    });
}

// شمارش کاراکترهای توضیحات
function initCharCounter() {
    const descriptionField = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    
    descriptionField.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        // تغییر رنگ بر اساس تعداد کاراکتر
        if (count > 180) {
            charCount.style.color = '#dc3545';
        } else if (count > 150) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#28a745';
        }
    });
}

// فشرده‌سازی تصویر در سمت کلاینت
function compressImage(file, quality = 0.7, maxWidth = 1200, maxHeight = 900) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            // محاسبه ابعاد جدید
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            // رسم تصویر
            ctx.drawImage(img, 0, 0, width, height);

            // تبدیل به blob
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };

        img.src = URL.createObjectURL(file);
    });
}

// نمایش گالری واحد تصاویر (موجود + جدید)
function renderGalleryPreview() {
    const preview = document.getElementById('galleryPreview');
    preview.innerHTML = '';
    galleryImages.forEach((img, idx) => {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'image-item';
        let imgTag = document.createElement('img');
        imgTag.style.width = '110px';
        imgTag.style.height = '88px';
        imgTag.style.objectFit = 'cover';
        imgTag.style.borderRadius = '6px';
        imgTag.style.border = '2px solid #ddd';
        imgTag.alt = 'تصویر محصول';
        if (img.type === 'old') {
            imgTag.src = img.preview;
        } else {
            imgTag.src = img.preview;
        }
        imgDiv.appendChild(imgTag);
        // دکمه حذف
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-image-btn';
        delBtn.textContent = '×';
        delBtn.onclick = () => removeGalleryImage(idx);
        imgDiv.appendChild(delBtn);
        preview.appendChild(imgDiv);
    });
}

function removeGalleryImage(idx) {
    const img = galleryImages[idx];
    if (img.type === 'old') {
        deletedImages.push(img.src);
    }
    galleryImages.splice(idx, 1);
    renderGalleryPreview();
}

function initGalleryWithCurrentImages() {
    galleryImages = [];
    deletedImages = [];
    if (currentProduct && Array.isArray(currentProduct.images)) {
        currentProduct.images.forEach(src => {
            galleryImages.push({ type: 'old', src, preview: src });
        });
    }
    renderGalleryPreview();
}

async function handleAddNewImages(event) {
    const files = Array.from(event.target.files);
    // مجموع عکس‌های فعلی و جدید نباید بیشتر از 5 شود
    if (galleryImages.length + files.length > 5) {
        showMessage('حداکثر 5 تصویر می‌توانید آپلود کنید', 'error');
        event.target.value = '';
        return;
    }
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // فشرده‌سازی
        const fileSizeMB = file.size / (1024 * 1024);
        let quality = 0.8;
        let maxWidth = 1200;
        let maxHeight = 900;
        if (fileSizeMB > 8) {
            quality = 0.5;
            maxWidth = 800;
            maxHeight = 600;
        } else if (fileSizeMB > 4) {
            quality = 0.6;
            maxWidth = 1000;
            maxHeight = 750;
        } else if (fileSizeMB > 2) {
            quality = 0.7;
        }
        try {
            let compressedFile = await compressImage(file, quality, maxWidth, maxHeight);
            if (compressedFile.size > 4 * 1024 * 1024) {
                compressedFile = await compressImage(file, quality * 0.5, maxWidth * 0.8, maxHeight * 0.8);
            }
            // پیش‌نمایش
            const reader = new FileReader();
            await new Promise((resolve) => {
                reader.onload = function(e) {
                    galleryImages.push({ type: 'new', src: compressedFile, preview: e.target.result });
                    resolve();
                };
                reader.readAsDataURL(compressedFile);
            });
        } catch (error) {
            showMessage('خطا در پردازش تصویر', 'error');
            return;
        }
    }
    renderGalleryPreview();
    event.target.value = '';
}

// پر کردن فرم با اطلاعات محصول
function populateForm() {
    if (!currentProduct) return;

    // اطلاعات اصلی
    document.getElementById('propertyType').value = currentProduct.propertyType || '';
    document.getElementById('bedrooms').value = currentProduct.bedrooms || '';
    document.getElementById('area').value = currentProduct.area || '';
    document.getElementById('constructionYear').value = currentProduct.constructionYear || '';

    // قیمت‌گذاری
    if (currentProduct.propertyType === 'sale') {
        if (currentProduct.salePrice) {
            document.getElementById('salePrice').value = parseInt(currentProduct.salePrice).toLocaleString();
        }
    } else if (currentProduct.propertyType === 'rent') {
        if (currentProduct.deposit) {
            document.getElementById('deposit').value = parseInt(currentProduct.deposit).toLocaleString();
        }
        if (currentProduct.monthlyRent) {
            document.getElementById('monthlyRent').value = parseInt(currentProduct.monthlyRent).toLocaleString();
        }
        document.getElementById('allowConversion').checked = currentProduct.allowConversion || false;
        
        if (currentProduct.allowConversion) {
            if (currentProduct.conversionDeductAmount) {
                document.getElementById('conversionDeductAmount').value = parseInt(currentProduct.conversionDeductAmount).toLocaleString();
            }
            if (currentProduct.conversionAddAmount) {
                document.getElementById('conversionAddAmount').value = parseInt(currentProduct.conversionAddAmount).toLocaleString();
            }
        }
    }

    // تنظیم نمایش فیلدهای قیمت
    togglePriceFields();
    if (currentProduct.allowConversion) {
        toggleConversionFields();
    }

    // امکانات
    const facilities = currentProduct.facilities || {};
    document.querySelector('input[name="parking"]').checked = !!facilities.parking;
    document.querySelector('input[name="storage"]').checked = !!facilities.storage;
    document.querySelector('input[name="elevator"]').checked = !!facilities.elevator;
    document.querySelector('input[name="balcony"]').checked = !!facilities.balcony;
    document.querySelector('input[name="parquet"]').checked = !!facilities.parquet;
    document.querySelector('input[name="westernToilet"]').checked = !!facilities.westernToilet;

    // اطلاعات خصوصی
    document.getElementById('propertyAddress').value = currentProduct.propertyAddress || '';
    document.getElementById('ownerName').value = currentProduct.ownerName || '';
    document.getElementById('ownerPhone').value = currentProduct.ownerPhone || '';
    document.getElementById('propertyNumber').value = currentProduct.propertyNumber || '';
    document.getElementById('tenantName').value = currentProduct.tenantName || '';
    document.getElementById('tenantPhone').value = currentProduct.tenantPhone || '';

    // توضیحات
    document.getElementById('description').value = currentProduct.description || '';
    
    // به‌روزرسانی شمارنده کاراکتر
    const charCount = document.getElementById('charCount');
    charCount.textContent = (currentProduct.description || '').length;

    // مقداردهی اولیه گالری با عکس‌های موجود محصول
    initGalleryWithCurrentImages();
}

// بارگذاری اطلاعات محصول
async function loadProductData() {
    try {
        const response = await fetch(`/api/edit-products/product/${productId}`);
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        if (response.status === 404) {
            showError('محصول یافت نشد');
            return;
        }
        
        if (!response.ok) {
            throw new Error('خطا در بارگذاری اطلاعات محصول');
        }

        currentProduct = await response.json();
        populateForm();
        
        // نمایش فرم
        document.getElementById('editContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading product:', error);
        showError('خطا در بارگذاری اطلاعات محصول');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// نمایش پیام
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// نمایش خطا
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// ارسال فرم
async function handleFormSubmit(e) {
    e.preventDefault();

    console.log('window.deletedImages:', window.deletedImages);
    console.log('deletedImages:', deletedImages);

    const submitButton = document.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'در حال ذخیره...';

    const formData = new FormData();
    
    // اطلاعات اصلی
    formData.append('propertyType', document.getElementById('propertyType').value);
    formData.append('bedrooms', document.getElementById('bedrooms').value);
    formData.append('area', document.getElementById('area').value);
    formData.append('constructionYear', document.getElementById('constructionYear').value);

    // قیمت‌گذاری
    const propertyType = document.getElementById('propertyType').value;
    if (propertyType === 'sale') {
        formData.append('salePrice', unformatPrice(document.getElementById('salePrice').value));
    } else if (propertyType === 'rent') {
        formData.append('deposit', unformatPrice(document.getElementById('deposit').value));
        formData.append('monthlyRent', unformatPrice(document.getElementById('monthlyRent').value));
        formData.append('allowConversion', document.getElementById('allowConversion').checked);
        
        if (document.getElementById('allowConversion').checked) {
            formData.append('conversionDeductAmount', unformatPrice(document.getElementById('conversionDeductAmount').value));
            formData.append('conversionAddAmount', unformatPrice(document.getElementById('conversionAddAmount').value));
        }
    }

    // امکانات
    formData.append('parking', document.querySelector('input[name="parking"]').checked);
    formData.append('storage', document.querySelector('input[name="storage"]').checked);
    formData.append('elevator', document.querySelector('input[name="elevator"]').checked);
    formData.append('balcony', document.querySelector('input[name="balcony"]').checked);
    formData.append('parquet', document.querySelector('input[name="parquet"]').checked);
    formData.append('westernToilet', document.querySelector('input[name="westernToilet"]').checked);

    // اطلاعات خصوصی
    formData.append('propertyAddress', document.getElementById('propertyAddress').value);
    formData.append('ownerName', document.getElementById('ownerName').value);
    formData.append('ownerPhone', document.getElementById('ownerPhone').value);
    formData.append('propertyNumber', document.getElementById('propertyNumber').value);
    formData.append('tenantName', document.getElementById('tenantName').value);
    formData.append('tenantPhone', document.getElementById('tenantPhone').value);

    // توضیحات
    formData.append('description', document.getElementById('description').value);

    // عکس‌های جدید
    let newImages = galleryImages.filter(img => img.type === 'new').map(img => img.src);
    // عکس‌های حذف‌شده
    formData.append('deletedImages', JSON.stringify(deletedImages));
    for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const fileName = `compressed_image_${i}.jpg`;
        const namedFile = new File([file], fileName, { type: 'image/jpeg' });
        formData.append('newImages', namedFile);
    }

    try {
        const response = await fetch(`/api/edit-products/update/${productId}`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('تغییرات با موفقیت ذخیره شد! در حال انتقال...', 'success');
            setTimeout(() => {
                window.location.href = '/panel';
            }, 2000);
        } else {
            showMessage(data.message || 'خطا در ذخیره تغییرات', 'error');
            // کاربر در همان صفحه می‌ماند
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('خطا در ذخیره تغییرات', 'error');
        // کاربر در همان صفحه می‌ماند
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'ذخیره تغییرات';
    }
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', async function() {
    // دریافت ID محصول
    productId = getProductIdFromUrl();
    
    if (!productId) {
        showError('شناسه محصول یافت نشد');
        return;
    }

    // بررسی احراز هویت
    await checkAuth();
    
    // بارگذاری اطلاعات محصول
    await loadProductData();
    
    // راه‌اندازی شمارنده کاراکتر
    initCharCounter();
    
    // راه‌اندازی فرمت‌دهی قیمت‌ها
    initPriceFormatting();
    
    // تنظیم event listener برای فرم
    document.getElementById('editProductForm').addEventListener('submit', handleFormSubmit);
    
    // تنظیم event listener برای آپلود تصاویر جدید
    document.getElementById('newImages').addEventListener('change', handleAddNewImages);
});
