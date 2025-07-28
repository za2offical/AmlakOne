
// بررسی وضعیت احراز هویت
async function checkAuth() {
    try {
        const response = await fetch('/api/edit/user-info');
        if (response.status === 401) {
            window.location.href = '/login';
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('خطا در احراز هویت:', error);
        window.location.href = '/login';
        return null;
    }
}

// بارگذاری اطلاعات کاربر
async function loadUserInfo() {
    const userData = await checkAuth();
    if (userData) {
        // نمایش اطلاعات فعلی
        document.getElementById('currentUsername').textContent = userData.username || 'نامشخص';
        document.getElementById('currentPhone').textContent = userData.phone || 'وارد نشده';
        document.getElementById('currentProvince').textContent = userData.province || 'وارد نشده';
        document.getElementById('currentNeighborhood').textContent = userData.neighborhood || 'وارد نشده';
        
        // پر کردن فیلدهای فرم با اطلاعات فعلی
        document.getElementById('newUsername').value = userData.username || '';
        document.getElementById('province').value = userData.province || '';
        document.getElementById('neighborhood').value = userData.neighborhood || '';
        
        // نمایش عکس پروفایل فعلی
        const currentImage = document.getElementById('currentImage');
        const noImageText = document.getElementById('noImageText');
        
        if (userData.profileImagePath) {
            currentImage.src = userData.profileImagePath;
            currentImage.style.display = 'block';
            noImageText.style.display = 'none';
        } else {
            currentImage.style.display = 'none';
            noImageText.style.display = 'block';
        }
    }
}

// نمایش پیش‌نمایش عکس انتخاب شده
function setupImagePreview() {
    const fileInput = document.getElementById('profileImage');
    const fileName = document.querySelector('.file-name');
    const imagePreview = document.getElementById('imagePreview');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            fileName.textContent = file.name;
            
            // نمایش پیش‌نمایش
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="پیش‌نمایش">`;
            };
            reader.readAsDataURL(file);
        } else {
            fileName.textContent = 'هیچ فایلی انتخاب نشده';
            imagePreview.innerHTML = '';
        }
    });
}

// نمایش پیام
function showMessage(text, isSuccess = false) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = isSuccess ? 'success-message' : 'error-message';
    messageDiv.style.display = 'block';
    
    // مخفی کردن پیام بعد از 5 ثانیه
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// بروزرسانی اطلاعات پروفایل
async function updateProfile(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const newUsername = document.getElementById('newUsername').value;
    const province = document.getElementById('province').value;
    const neighborhood = document.getElementById('neighborhood').value;
    const profileImage = document.getElementById('profileImage').files[0];
    
    // اعتبارسنجی کلی
    if (!newUsername || !province || !neighborhood) {
        showMessage('لطفاً تمام فیلدهای اجباری را پر کنید');
        return;
    }
    
    // اعتبارسنجی نام کاربری
    if (newUsername.length < 3) {
        showMessage('نام کاربری باید حداقل 3 کاراکتر باشد');
        return;
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(newUsername)) {
        showMessage('نام کاربری فقط می‌تواند شامل حروف، اعداد و زیرخط باشد');
        return;
    }
    
    // ساخت FormData
    formData.append('newUsername', newUsername);
    formData.append('province', province);
    formData.append('neighborhood', neighborhood);
    
    if (profileImage) {
        // بررسی سایز فایل (2 مگابایت)
        if (profileImage.size > 2 * 1024 * 1024) {
            showMessage('سایز عکس نباید بیشتر از 2 مگابایت باشد');
            return;
        }
        formData.append('profileImage', profileImage);
    }
    
    try {
        const submitButton = document.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'در حال بروزرسانی...';
        
        const response = await fetch('/api/edit/update-profile', {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('اطلاعات با موفقیت بروزرسانی شد! در حال انتقال...', true);
            setTimeout(() => {
                window.location.href = '/panel';
            }, 2000);
        } else {
            showMessage(data.error || 'خطا در بروزرسانی اطلاعات');
        }
    } catch (error) {
        console.error('خطا:', error);
        showMessage('خطا در بروزرسانی اطلاعات');
    } finally {
        const submitButton = document.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'بروزرسانی اطلاعات';
    }
}

// بازگشت به پنل
function goBackToPanel() {
    window.location.href = '/panel';
}

// رویدادها
document.addEventListener('DOMContentLoaded', () => {
    // بارگذاری اولیه
    loadUserInfo();
    
    // راه‌اندازی پیش‌نمایش عکس
    setupImagePreview();
    
    // اتصال رویداد فرم
    const updateForm = document.getElementById('updateForm');
    if (updateForm) {
        updateForm.addEventListener('submit', updateProfile);
    }
});
