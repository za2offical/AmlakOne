
// متغیرهای سراسری
let userCanCreateProduct = false;
let compressedFiles = [];

// بررسی وضعیت احراز هویت
async function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = '/login';
            return false;
        }
        
        console.log('Token found, checking authentication...');
        const response = await fetch('/api/panel/user-info', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Auth check response status:', response.status);
        
        if (response.status === 401 || response.status === 403) {
            console.log('Authentication failed, redirecting to login');
            localStorage.removeItem('token');
            window.location.href = '/login';
            return false;
        }
        
        if (!response.ok) {
            console.warn('Auth check failed with status:', response.status);
            return false;
        }
        
        const userData = await response.json();
        console.log('User authenticated successfully:', userData.username);
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login';
        return false;
    }
}

// بررسی محدودیت پلن کاربر
async function checkPlanLimit() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found for plan limit check');
            return false;
        }

        console.log('Checking plan limit...');
        const response = await fetch('/api/product/check-limit', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Plan limit response status:', response.status);
        const data = await response.json();
        console.log('Plan limit response data:', data);
        
        if (!response.ok) {
            if (response.status === 403) {
                // محدودیت پلن
                console.log('Plan limit reached');
                disableForm();
                showMessage(data.error || 'شما به حد مجاز ایجاد آگهی رسیده‌اید', 'error');
                return false;
            }
            
            if (response.status === 401) {
                // مشکل احراز هویت
                console.error('Authentication error during plan check');
                showMessage('مشکل در احراز هویت. لطفا دوباره وارد شوید.', 'error');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return false;
            }
            
            // سایر خطاها - اجازه ادامه
            console.warn('Plan limit check failed, but allowing to continue:', data);
            return true;
        }
        
        // نمایش اطلاعات پلن
        if (data.userLevel !== undefined) {
            showPlanInfo(data);
        }
        
        console.log('Plan check passed successfully');
        return true;
    } catch (error) {
        console.error('Error checking plan limit:', error);
        // در صورت خطا، اجازه ادامه
        return true;
    }
}

// غیرفعال کردن فرم
function disableForm() {
    const form = document.getElementById('productForm');
    const submitButton = document.querySelector('.submit-button');
    
    if (form) {
        form.style.opacity = '0.6';
        form.style.pointerEvents = 'none';
        
        // غیرفعال کردن همه input ها
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'محدودیت پلن';
        submitButton.style.backgroundColor = '#ccc';
    }
}

// نمایش اطلاعات پلن
function showPlanInfo(data) {
    const planInfo = document.createElement('div');
    planInfo.className = 'plan-info-success';
    planInfo.style.cssText = `
        background: #e8f5e8;
        border: 1px solid #4caf50;
        padding: 10px;
        margin: 10px 0;
        border-radius: 5px;
        text-align: center;
        color: #2e7d32;
    `;
    planInfo.innerHTML = `
        <p>سطح کاربری: ${data.userLevel} | آگهی‌های ایجاد شده: ${data.used}/${data.limit === null ? 'نامحدود' : data.limit}</p>
    `;
    
    const container = document.querySelector('.container');
    if (container && container.firstChild) {
        container.insertBefore(planInfo, container.firstChild.nextSibling);
    }
}

// نمایش پیام
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } else {
        // اگر element پیام وجود نداشت، alert استفاده کن
        alert(text);
    }
}

// تبدیل وضعیت فیلدهای قیمت
function togglePriceFields() {
    const propertyType = document.getElementById('propertyType').value;
    const saleFields = document.getElementById('saleFields');
    const rentFields = document.getElementById('rentFields');
    
    if (!propertyType || !saleFields || !rentFields) return;
    
    if (propertyType === 'sale') {
        saleFields.style.display = 'block';
        rentFields.style.display = 'none';
        
        const salePrice = document.getElementById('salePrice');
        const deposit = document.getElementById('deposit');
        
        if (salePrice) salePrice.required = true;
        if (deposit) deposit.required = false;
    } else if (propertyType === 'rent') {
        saleFields.style.display = 'none';
        rentFields.style.display = 'block';
        
        const salePrice = document.getElementById('salePrice');
        const deposit = document.getElementById('deposit');
        
        if (salePrice) salePrice.required = false;
        if (deposit) deposit.required = true;
    } else {
        saleFields.style.display = 'none';
        rentFields.style.display = 'none';
        
        const salePrice = document.getElementById('salePrice');
        const deposit = document.getElementById('deposit');
        
        if (salePrice) salePrice.required = false;
        if (deposit) deposit.required = false;
    }
}

// تبدیل وضعیت فیلدهای تبدیل ودیعه
function toggleConversionFields() {
    const allowConversion = document.getElementById('allowConversion');
    const conversionFields = document.getElementById('conversionFields');
    
    if (allowConversion && conversionFields) {
        conversionFields.style.display = allowConversion.checked ? 'block' : 'none';
    }
}

// نمایش/مخفی کردن امکانات اختیاری
function toggleOptionalFeatures() {
    const section = document.getElementById('optionalFeatures');
    const button = document.querySelector('.toggle-button');
    
    if (!section || !button) return;
    
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

// فرمت‌دهی قیمت با کاما
function formatPrice(input) {
    if (!input || !input.value) return;
    
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
    
    if (!textarea || !charCount) return;
    
    const count = textarea.value.length;
    charCount.textContent = count + '/200';
    
    if (count >= 180) {
        charCount.classList.add('warning');
    } else {
        charCount.classList.remove('warning');
    }
}

// فشرده‌سازی تصویر
function compressImage(file, quality = 0.7, maxWidth = 1200, maxHeight = 900) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = function() {
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };

        img.src = URL.createObjectURL(file);
    });
}

// نمایش پیش‌نمایش تصاویر
async function previewImages(event) {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    
    const files = Array.from(event.target.files);

    if (compressedFiles.length + files.length > 5) {
        showMessage('حداکثر 5 تصویر می‌توانید آپلود کنید', 'error');
        event.target.value = '';
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
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

    // نمایش پیش‌نمایش
    preview.innerHTML = '';
    for (let i = 0; i < compressedFiles.length; i++) {
        const file = compressedFiles[i];
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.cssText = 'width: 100px; height: 100px; object-fit: cover; margin: 5px; border-radius: 5px;';
            preview.appendChild(img);
        }
        reader.readAsDataURL(file);
    }
    
    event.target.value = '';
}

// ارسال فرم
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!userCanCreateProduct) {
        showMessage('شما اجازه ایجاد آگهی ندارید', 'error');
        return;
    }

    const submitButton = document.querySelector('.submit-button');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'در حال ارسال...';
    }

    try {
        const formData = new FormData();
        
        // اطلاعات اصلی
        const propertyType = document.getElementById('propertyType');
        const bedrooms = document.getElementById('bedrooms');
        const area = document.getElementById('area');
        const constructionYear = document.getElementById('constructionYear');
        
        if (!propertyType || !bedrooms || !area) {
            throw new Error('فیلدهای اصلی ناقص هستند');
        }
        
        formData.append('propertyType', propertyType.value);
        formData.append('bedrooms', bedrooms.value);
        formData.append('area', area.value);
        formData.append('constructionYear', constructionYear ? constructionYear.value : '');

        // قیمت‌گذاری
        if (propertyType.value === 'sale') {
            const salePrice = document.getElementById('salePrice');
            if (salePrice) {
                formData.append('salePrice', unformatPrice(salePrice.value));
            }
        } else if (propertyType.value === 'rent') {
            const deposit = document.getElementById('deposit');
            const monthlyRent = document.getElementById('monthlyRent');
            const allowConversion = document.getElementById('allowConversion');
            
            if (deposit) formData.append('deposit', unformatPrice(deposit.value));
            if (monthlyRent) formData.append('monthlyRent', unformatPrice(monthlyRent.value));
            if (allowConversion) formData.append('allowConversion', allowConversion.checked);
            
            if (allowConversion && allowConversion.checked) {
                const conversionDeductAmount = document.getElementById('conversionDeductAmount');
                const conversionAddAmount = document.getElementById('conversionAddAmount');
                
                if (conversionDeductAmount) {
                    formData.append('conversionDeductAmount', unformatPrice(conversionDeductAmount.value));
                }
                if (conversionAddAmount) {
                    formData.append('conversionAddAmount', unformatPrice(conversionAddAmount.value));
                }
            }
        }

        // امکانات
        const facilities = ['parking', 'storage', 'elevator', 'balcony', 'parquet', 'westernToilet'];
        facilities.forEach(facility => {
            const checkbox = document.querySelector(`input[name="${facility}"]`);
            if (checkbox) {
                formData.append(facility, checkbox.checked);
            }
        });

        // اطلاعات خصوصی
        const privateFields = [
            'propertyAddress', 'ownerName', 'ownerPhone', 
            'propertyNumber', 'tenantName', 'tenantPhone'
        ];
        privateFields.forEach(field => {
            const input = document.getElementById(field);
            if (input) {
                formData.append(field, input.value);
            }
        });

        // توضیحات
        const description = document.getElementById('description');
        if (description) {
            formData.append('description', description.value);
        }

        // تصاویر
        if (compressedFiles.length > 0) {
            for (let i = 0; i < compressedFiles.length; i++) {
                const file = compressedFiles[i];
                const fileName = `compressed_image_${i}.jpg`;
                const namedFile = new File([file], fileName, { type: 'image/jpeg' });
                formData.append('images', namedFile);
            }
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('توکن یافت نشد');
        }

        const response = await fetch('/api/product/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('آگهی با موفقیت ایجاد شد! در حال انتقال...', 'success');
            setTimeout(() => {
                window.location.href = '/panel';
            }, 2000);
        } else {
            throw new Error(data.error || 'خطا در ایجاد آگهی');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage(error.message || 'خطا در ایجاد آگهی', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'ایجاد آگهی';
        }
    }
}

// راه‌اندازی اولیه صفحه
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, starting initialization...');
    
    try {
        // بررسی احراز هویت
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            console.log('User not authenticated, stopping initialization');
            return;
        }
        
        // بررسی محدودیت پلن
        userCanCreateProduct = await checkPlanLimit();
        
        if (!userCanCreateProduct) {
            console.log('User cannot create products, form disabled');
            return;
        }
        
        console.log('User can create products, initializing form...');
        
        // راه‌اندازی event listener ها
        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
        
        const imageInput = document.getElementById('images');
        if (imageInput) {
            imageInput.addEventListener('change', previewImages);
        }
        
        const description = document.getElementById('description');
        if (description) {
            description.addEventListener('input', updateCharCount);
            updateCharCount(); // اولیه
        }
        
        const propertyType = document.getElementById('propertyType');
        if (propertyType) {
            propertyType.addEventListener('change', togglePriceFields);
        }
        
        const allowConversion = document.getElementById('allowConversion');
        if (allowConversion) {
            allowConversion.addEventListener('change', toggleConversionFields);
        }
        
        // راه‌اندازی فرمت‌دهی قیمت‌ها
        initPriceFormatting();
        
        console.log('Form initialization completed successfully');
        
    } catch (error) {
        console.error('Error during initialization:', error);
        showMessage('خطا در بارگذاری صفحه', 'error');
    }
});

// اضافه کردن تابع‌های سراسری برای HTML
window.togglePriceFields = togglePriceFields;
window.toggleConversionFields = toggleConversionFields;
window.toggleOptionalFeatures = toggleOptionalFeatures;
window.updateCharCount = updateCharCount;
