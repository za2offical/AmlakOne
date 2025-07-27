
// بررسی وضعیت احراز هویت
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = '/login';
            return false;
        }
        
        // بررسی اعتبار توکن با ارسال درخواست به سرور
        const response = await fetch('/api/panel/user-info', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // فقط برای خطاهای 401 و 403 redirect کن
        if (response.status === 401 || response.status === 403) {
            console.log('Token invalid or expired, redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/login';
            return false;
        }
        
        // برای سایر خطاها، اجازه ادامه بده
        if (!response.ok) {
            console.warn('Auth check failed but continuing:', response.status);
            return true; // اجازه ادامه
        }
        
        return true;
    } catch (error) {
        console.error('Auth error:', error);
        // فقط برای خطاهای شبکه کاربر را redirect نکن
        console.warn('Network error in auth check, but continuing...');
        return true;
    }
}

// بررسی محدودیت پلن کاربر
async function checkPlanLimit() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            window.location.href = '/login';
            return false;
        }

        const response = await fetch('/api/product/check-limit', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // بررسی خطاهای احراز هویت
        if (response.status === 401) {
            console.log('Authentication failed, redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/login';
            return false;
        }
        
        if (response.status === 403) {
            const data = await response.json();
            
            // فقط اگر خطای احراز هویت باشد redirect کن
            if (data.error && (data.error.includes('Authentication') || data.error.includes('Invalid') || data.error.includes('expired'))) {
                console.log('Token expired, redirecting to login');
                localStorage.removeItem('token');
                window.location.href = '/login';
                return false;
            }
            
            // اگر خطای محدودیت پلن باشد (403 غیر احراز هویت)
            const submitButton = document.querySelector('.submit-button');
            const form = document.getElementById('productForm');
            
            // غیرفعال کردن فرم
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'محدودیت پلن';
            }
            if (form) {
                form.style.opacity = '0.6';
                form.style.pointerEvents = 'none';
            }
            
            // نمایش پیام محدودیت
            showMessage(data.error || 'شما به حد مجاز ایجاد آگهی رسیده‌اید', 'error');
            return false;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            // برای سایر خطاها، اجازه ادامه بده
            console.warn('Could not check plan limit:', data.error);
            return true;
        }
        
        // بررسی canCreate حتی اگر response موفق باشد
        if (data.canCreate === false) {
            const submitButton = document.querySelector('.submit-button');
            const form = document.getElementById('productForm');
            
            // غیرفعال کردن فرم
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'محدودیت پلن';
            }
            if (form) {
                form.style.opacity = '0.6';
                form.style.pointerEvents = 'none';
            }
            
            // نمایش پیام محدودیت
            showMessage(data.error || 'شما به حد مجاز ایجاد آگهی رسیده‌اید', 'error');
            return false;
        }
        
        // اگر همه چیز اوکی است
        console.log('Plan check successful:', data);
        
        // نمایش اطلاعات پلن در بالای صفحه
        if (data.userLevel !== undefined) {
            const planInfo = document.createElement('div');
            planInfo.className = 'plan-info-success';
            planInfo.innerHTML = `
                <p>سطح کاربری: ${data.userLevel} | آگهی‌های ایجاد شده: ${data.used}/${data.limit === null ? 'نامحدود' : data.limit}</p>
            `;
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(planInfo, container.firstChild);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error checking plan limit:', error);
        // در صورت خطا، فرم را فعال نگه دار
        return true;
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
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch('/api/product/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        // بررسی خطاهای احراز هویت
        if (response.status === 401 || response.status === 403) {
            const data = await response.json();
            if (data.error && (data.error.includes('Authentication') || data.error.includes('Invalid') || data.error.includes('expired'))) {
                console.log('Token expired during form submission, redirecting to login');
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
        }

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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, starting initialization...');
    
    // بررسی احراز هویت ابتدا
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return; // اگر احراز هویت نشده، صفحه redirect می‌شود
    }
    
    console.log('User authenticated, checking plan limits...');
    
    // بررسی محدودیت پلن
    const canCreateProduct = await checkPlanLimit();
    if (!canCreateProduct) {
        console.log('Plan limit reached, form disabled');
        return;
    }
    
    console.log('Plan check passed, enabling form...');
    
    // راه‌اندازی شمارنده کاراکتر
    updateCharCount();
    
    // راه‌اندازی فرمت‌دهی قیمت‌ها
    initPriceFormatting();
    
    // تنظیم event listener برای فرم
    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // تنظیم event listener برای آپلود تصاویر
    const imageInput = document.getElementById('images');
    if (imageInput) {
        imageInput.addEventListener('change', previewImages);
    }
    
    console.log('Form initialization completed successfully');
});
