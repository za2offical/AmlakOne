
document.addEventListener('DOMContentLoaded', function() {
    const phoneStep = document.getElementById('phone-step');
    const userStep = document.getElementById('user-step');
    const phoneForm = document.getElementById('phone-form');
    const userForm = document.getElementById('user-form');
    const backBtn = document.getElementById('back-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');

    // مخفی کردن پیام‌ها
    function hideMessages() {
        errorMessage.classList.remove('show');
        successMessage.classList.remove('show');
    }

    // نمایش پیام خطا
    function showError(message) {
        hideMessages();
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
    }

    // نمایش پیام موفقیت
    function showSuccess(message) {
        hideMessages();
        successMessage.textContent = message;
        successMessage.classList.add('show');
    }

    // مرحله اول: بررسی شماره تلفن
    phoneForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessages();

        const phone = document.getElementById('phone').value.trim();

        try {
            const response = await fetch('/signup/verify-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phone })
            });

            const data = await response.json();

            if (response.ok) {
                // انتقال به مرحله دوم
                document.getElementById('verified-phone').value = phone;
                phoneStep.classList.remove('active');
                userStep.classList.add('active');
                showSuccess(data.message);
            } else {
                showError(data.error);
            }
        } catch (error) {
            showError('خطا در اتصال به سرور');
        }
    });

    // مرحله دوم: تکمیل ثبت نام
    userForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessages();

        const formData = new FormData(userForm);
        const data = {
            phone: formData.get('phone'),
            username: formData.get('username'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        try {
            const response = await fetch('/signup/complete-registration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showSuccess(result.message + ' - انتقال به صفحه تکمیل پروفایل...');
                
                // انتقال به صفحه ورود برای تکمیل پروفایل
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError('خطا در اتصال به سرور');
        }
    });

    // دکمه بازگشت
    backBtn.addEventListener('click', function() {
        userStep.classList.remove('active');
        phoneStep.classList.add('active');
        hideMessages();
    });

    // اعتبارسنجی نام کاربری در زمان تایپ
    document.getElementById('username').addEventListener('input', function(e) {
        const username = e.target.value;
        const regex = /^[a-zA-Z0-9]*$/;
        
        if (!regex.test(username)) {
            e.target.value = username.replace(/[^a-zA-Z0-9]/g, '');
        }
    });

    // اعتبارسنجی شماره تلفن در زمان تایپ
    document.getElementById('phone').addEventListener('input', function(e) {
        const phone = e.target.value;
        const regex = /^[0-9]*$/;
        
        if (!regex.test(phone)) {
            e.target.value = phone.replace(/[^0-9]/g, '');
        }
        
        if (phone.length > 11) {
            e.target.value = phone.substring(0, 11);
        }
    });
});
