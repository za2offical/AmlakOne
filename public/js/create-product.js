// بررسی وضعیت احراز هویت و محدودیت‌ها
async function checkAuth() {
    try {
        const response = await fetch('/api/panel/user-info');
        if (response.status === 401) {
            window.location.href = '/login';
        }
        
        // بررسی محدودیت ایجاد آگهی
        await checkCreateLimit();
    } catch (error) {
        console.error('Auth error:', error);
        window.location.href = '/login';
    }
}

// بررسی محدودیت ایجاد آگهی
async function checkCreateLimit() {
    try {
        const response = await fetch('/api/product/check-limit');
        const data = await response.json();
        
        if (!data.canCreate) {
            // نمایش پیام محدودیت
            showLimitWarning(data);
            // غیرفعال کردن فرم
            disableForm();
        } else {
            // نمایش وضعیت فعلی کاربر
            showCurrentStatus(data);
        }
    } catch (error) {
        console.error('Error checking limit:', error);
    }
}

// نمایش هشدار محدودیت
function showLimitWarning(data) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'limit-warning';
    warningDiv.innerHTML = `
        <div class="warning-content">
            <h3>🚫 محدودیت ایجاد آگهی</h3>
            <p>${data.error}</p>
            <p>تعداد آگهی‌های ایجاد شده: ${data.used} از ${data.limit || 'نامحدود'}</p>
            <p>سطح کاربری شما: ${data.userLevel}</p>
            <a href="/panel" class="back-link">بازگشت به پنل</a>
        </div>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(warningDiv, container.firstChild);
}

// نمایش وضعیت فعلی
function showCurrentStatus(data) {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-info';
    statusDiv.innerHTML = `
        <div class="status-content">
            <p>📊 وضعیت آگهی‌های شما: ${data.used} از ${data.limit || 'نامحدود'} آگهی ایجاد شده</p>
        </div>
    `;
    
    const header = document.querySelector('.page-header');
    header.appendChild(statusDiv);
}

// غیرفعال کردن فرم
function disableForm() {
    const form = document.getElementById('productForm');
    const inputs = form.querySelectorAll('input, select, textarea, button');
    
    inputs.forEach(input => {
        input.disabled = true;
    });
    
    form.style.opacity = '0.5';
    form.style.pointerEvents = 'none';
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
function updateCharCount() {
    const textarea = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    const count = textarea.value.length;
    charCount.textContent = count + '/200';
    if (count >= 180) {
        charCount.classList.add('warning');
        } else {
        charCount.classList.remove('warning');
        }
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

// نمایش پیش‌نمایش تصاویر
async function previewImages(event) {
    const preview = document.getElementById('imagePreview');
    // اگر قبلاً عکس‌هایی انتخاب شده‌اند، آن‌ها را نگه دار
    let compressedFiles = window.compressedFiles ? [...window.compressedFiles] : [];

    const files = Array.from(event.target.files);

    // مجموع عکس‌های قبلی و جدید نباید بیشتر از 5 شود
    if (compressedFiles.length + files.length > 5) {
        showMessage('حداکثر 5 تصویر می‌توانید آپلود کنید', 'error');
        event.target.value = '';
        return;
    }

    // فشرده‌سازی و اضافه کردن عکس‌های جدید
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // بررسی حجم اولیه
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
            compressedFiles.push(compressedFile);
        } catch (error) {
            console.error('Error compressing image:', error);
            showMessage('خطا در پردازش تصویر', 'error');
            return;
        }
    }

    // ذخیره فایل‌های فشرده شده
    window.compressedFiles = compressedFiles;

    // نمایش پیش‌نمایش همه عکس‌ها
    preview.innerHTML = '';
    for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i];
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            preview.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
    // ریست input تا بتوان دوباره همان عکس را انتخاب کرد
    event.target.value = '';
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

// ارسال فرم
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitButton = document.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'در حال بررسی محدودیت...';

    // بررسی مجدد محدودیت قبل از ارسال
    try {
        const limitResponse = await fetch('/api/product/check-limit');
        const limitData = await limitResponse.json();
        
        if (!limitData.canCreate) {
            showMessage(limitData.error, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'ایجاد آگهی';
            return;
        }
    } catch (error) {
        console.error('Error checking limit:', error);
        showMessage('خطا در بررسی محدودیت', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'ایجاد آگهی';
        return;
    }

    submitButton.textContent = 'در حال ارسال...';
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

    // تصاویر
    if (window.compressedFiles && window.compressedFiles.length > 0) {
        for (let i = 0; i < window.compressedFiles.length; i++) {
            const file = window.compressedFiles[i];
            const fileName = `compressed_image_${i}.jpg`;
            const namedFile = new File([file], fileName, { type: 'image/jpeg' });
            formData.append('images', namedFile);
        }
    } else {
        const imageInput = document.getElementById('images');
        for (const file of imageInput.files) {
            formData.append('images', file);
        }
    }

    try {
        const response = await fetch('/api/product/create', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('آگهی با موفقیت ایجاد شد! در حال انتقال...', 'success');
            setTimeout(() => {
                window.location.href = '/panel';
            }, 2000);
        } else {
            showMessage(data.error || 'خطا در ایجاد آگهی', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('خطا در ایجاد آگهی', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'ایجاد آگهی';
    }
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', function() {
    // بررسی احراز هویت
    checkAuth();
    
    // راه‌اندازی شمارنده کاراکتر
    updateCharCount();
    
    // راه‌اندازی فرمت‌دهی قیمت‌ها
    initPriceFormatting();
    
    // تنظیم event listener برای فرم
    document.getElementById('productForm').addEventListener('submit', handleFormSubmit);
    
    // تنظیم event listener برای آپلود تصاویر
    document.getElementById('images').addEventListener('change', previewImages);
});
