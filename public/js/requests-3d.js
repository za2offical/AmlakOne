let allProducts = [];
let activeRequests = [];
let selectedProductId = null;

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

// بارگذاری محصولات کاربر
async function loadUserProducts() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const emptyState = document.getElementById('emptyState');
    const productsGrid = document.getElementById('productsGrid');

    try {
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        emptyState.style.display = 'none';
        productsGrid.style.display = 'none';

        // بررسی احراز هویت
        const userInfo = await checkAuth();
        if (!userInfo) return;

        // بارگذاری محصولات با داده‌های زنده - هیچ کش‌ای استفاده نمی‌شود
        const timestamp = Date.now() + Math.random(); // اطمینان از یکتا بودن
        const response = await fetch(`/api/requests-3d/user-products?live=${timestamp}`, {
            method: 'GET',
            cache: 'no-store', // هیچ‌گاه کش نکن
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        allProducts = await response.json();

        if (allProducts.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        displayProducts(allProducts);
        productsGrid.style.display = 'grid';

        // بارگذاری درخواست‌های فعال
        await loadActiveRequests();

    } catch (error) {
        console.error('Error loading products:', error);
        showError('خطا در بارگذاری املاک. لطفاً دوباره تلاش کنید.');
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// نمایش محصولات
function displayProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');

        // پیدا کردن درخواست مربوط به این محصول
        const activeRequest = activeRequests.find(req => req.productId === product.id);
        const hasActiveRequest = !!activeRequest;

        // تعیین وضعیت درخواست
        let requestStatus = null;
        let cardClass = 'product-card';

        if (hasActiveRequest) {
            console.log('Active request found:', activeRequest); // Debug log
            console.log('Request status:', activeRequest.status); // Debug log
            
            if (activeRequest.status === 'تایید شده') {
                requestStatus = 'approved';
                cardClass += ' has-approved-request';
            } else if (activeRequest.status === 'در حال بررسی') {
                requestStatus = 'pending';
                cardClass += ' has-pending-request';
            } else if (activeRequest.status === 'رد شده') {
                requestStatus = 'rejected';
                cardClass += ' has-rejected-request';
            }
        }

        productCard.className = cardClass;

        // فقط اگر درخواست تایید نشده باشد کلیک کردن مجاز است
        if (!hasActiveRequest) {
            productCard.onclick = () => openUploadModal(product);
            productCard.style.cursor = 'pointer';
        } else {
            productCard.style.cursor = 'default';
        }

        productCard.innerHTML = `
            <div class="product-image-container">
                ${product.mainImage ? 
                    `<img src="${product.mainImage}" alt="محصول" class="product-image">` :
                    `<div class="image-placeholder">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                        <span>تصویری موجود نیست</span>
                    </div>`
                }
                ${hasActiveRequest ? 
                    `<div class="request-status ${requestStatus}" style="z-index: 10; position: absolute; top: 10px; right: 10px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            ${requestStatus === 'approved' ? 
                                `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>` :
                                `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z"/>`
                            }
                        </svg>
                        ${requestStatus === 'approved' ? 'تایید شده' : 'در حال بررسی'}
                    </div>` : ''
                }
            </div>
            <div class="product-info">
                <h3 class="product-title">
                    ${product.propertyType === 'sale' ? 'فروش' : 'اجاره'} 
                    ${product.bedrooms} خوابه
                </h3>
                <div class="product-details">
                    <div class="detail-item">
                        <span class="detail-label">مساحت:</span>
                        <span class="detail-value">${product.area} متر</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">تاریخ ثبت:</span>
                        <span class="detail-value">${formatDate(product.created_at)}</span>
                    </div>
                </div>
                <div class="product-actions">
                    ${hasActiveRequest ? 
                        `<button class="btn-secondary btn-small" disabled>
                            ${requestStatus === 'approved' ? 
                                `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                درخواست تایید شده` :
                                requestStatus === 'rejected' ?
                                `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 7 9.5 10.5 12 7 14.5 8.5 16 12 13.5 15.5 16 17 14.5 13.5 12 17 9.5 15.5 8z"/>
                                </svg>
                                درخواست رد شده` :
                                `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z"/>
                                </svg>
                                در حال بررسی`
                            }
                        </button>` :
                        `<button class="btn-primary btn-small">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.99.99 0 013 16.5v-9c0-.38.21.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z"/>
                            </svg>
                            درخواست 3D
                        </button>`
                    }
                </div>
            </div>
        `;

        productsGrid.appendChild(productCard);
    });
}

// بارگذاری درخواست‌های فعال
async function loadActiveRequests() {
    try {
        console.log('Loading live active requests...'); // Debug log
        // داده‌های کاملاً زنده - هیچ کش‌ای نیست
        const timestamp = Date.now() + Math.random();
        const response = await fetch(`/api/requests-3d/my-requests?live=${timestamp}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        if (response.ok) {
            activeRequests = await response.json();
            console.log('Live active requests loaded:', activeRequests); // Debug log
            console.log('Number of active requests:', activeRequests.length); // Debug log
            
            displayActiveRequests();
            // به‌روزرسانی نمایش محصولات با وضعیت جدید
            if (allProducts.length > 0) {
                console.log('Refreshing products display with request status...'); // Debug log
                displayProducts(allProducts);
            }
        } else {
            console.error('Failed to load active requests:', response.status);
        }
    } catch (error) {
        console.error('Error loading active requests:', error);
    }
}

// تابع تغییر وضعیت نمایش درخواست‌های فعال
function toggleActiveRequests() {
    const activeRequestsSection = document.getElementById('activeRequestsSection');
    const toggleBtn = document.getElementById('toggleRequestsBtn');
    const toggleBtnText = document.getElementById('toggleBtnText');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (activeRequestsSection.style.display === 'none' || activeRequestsSection.style.display === '') {
        activeRequestsSection.style.display = 'block';
        toggleBtnText.textContent = 'مخفی کردن درخواست‌های من';
        toggleIcon.style.transform = 'rotate(180deg)';
    } else {
        activeRequestsSection.style.display = 'none';
        toggleBtnText.textContent = 'مدیریت درخواست‌های من';
        toggleIcon.style.transform = 'rotate(0deg)';
    }
}

// کپی کردن لینک
function copyLink(link) {
    navigator.clipboard.writeText(link).then(() => {
        // نمایش پیغام موفقیت
        showSuccessMessage('لینک کپی شد!');
    }).catch(err => {
        console.error('خطا در کپی کردن لینک:', err);
        showError('خطا در کپی کردن لینک');
    });
}

// نمایش پیغام موفقیت
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: fadeInOut 3s forwards;
    `;
    
    // اضافه کردن انیمیشن
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            10%, 90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(successDiv);
    setTimeout(() => {
        document.body.removeChild(successDiv);
    }, 3000);
}

// نمایش درخواست‌های فعال
function displayActiveRequests() {
    const activeRequestsSection = document.getElementById('activeRequestsSection');
    const activeRequestsList = document.getElementById('activeRequestsList');
    const toggleBtn = document.getElementById('toggleRequestsBtn');
    const requestsCount = document.getElementById('requestsCount');

    if (activeRequests.length === 0) {
        toggleBtn.style.display = 'none';
        activeRequestsSection.style.display = 'none';
        return;
    }

    // نمایش دکمه تغییر وضعیت و بخش درخواست‌ها
    toggleBtn.style.display = 'inline-flex';
    
    // به‌روزرسانی تعداد درخواست‌ها
    if (requestsCount) {
        requestsCount.textContent = `${activeRequests.length} درخواست`;
    }
    
    activeRequestsList.innerHTML = '';

    activeRequests.forEach(request => {
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';

        // پیدا کردن اطلاعات محصول
        const product = allProducts.find(p => p.id === request.productId);
        
        // تولید لینک برای درخواست‌های تایید شده
        const approved3DLink = request.status === 'تایید شده' && request.url ? 
            request.url : null;

        requestCard.innerHTML = `
            <div class="request-header">
                <div class="request-info">
                    <h4 class="request-title">
                        ${product ? `${product.propertyType === 'sale' ? 'فروش' : 'اجاره'} ${product.bedrooms} خوابه` : 'محصول ناشناخته'}
                    </h4>
                    <div class="request-meta">
                        <span class="request-date">ارسال شده در ${formatDate(request.submittedAt)}</span>
                    </div>
                </div>
                <div class="request-status-badge ${getStatusClass(request.status)}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        ${request.status === 'تایید شده' ? 
                            `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>` :
                            request.status === 'رد شده' ?
                            `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 7 9.5 10.5 12 7 14.5 8.5 16 12 13.5 15.5 16 17 14.5 13.5 12 17 9.5 15.5 8z"/>` :
                            `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z"/>`
                        }
                    </svg>
                    ${request.status}
                </div>
            </div>
            <div class="request-body">
                <div class="request-details">
                    <div class="detail-row">
                        <span class="detail-label">شناسه درخواست:</span>
                        <span class="detail-value">${request.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">فایل ویدیو:</span>
                        <span class="detail-value">آپلود شده</span>
                    </div>
                    ${request.status === 'تایید شده' ? `
                    <div class="detail-row">
                        <span class="detail-label">لینک نمای 3D:</span>
                        <div class="link-display">
                            <input type="text" class="link-input" value="${approved3DLink}" readonly onclick="this.select()">
                            <div class="action-buttons">
                                <button class="btn-icon copy-btn" onclick="copyLink('${approved3DLink}')" title="کپی لینک 3D">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                    </svg>
                                </button>
                                <button class="btn-icon visit-btn" onclick="window.open('${approved3DLink}', '_blank')" title="مشاهده نمای 3D">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        activeRequestsList.appendChild(requestCard);
    });
}

// باز کردن مودال آپلود
function openUploadModal(product) {
    // بررسی وجود درخواست فعال
    const hasActiveRequest = activeRequests.some(req => req.productId === product.id);
    if (hasActiveRequest) {
        showError('برای این ملک قبلاً درخواست ارسال شده است.');
        return;
    }

    selectedProductId = product.id;
    const modal = document.getElementById('uploadModal');
    const productInfo = document.getElementById('selectedProductInfo');

    productInfo.innerHTML = `
        <div class="selected-product">
            <div class="selected-product-image">
                ${product.mainImage ? 
                    `<img src="${product.mainImage}" alt="محصول">` :
                    `<div class="image-placeholder-small">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                    </div>`
                }
            </div>
            <div class="selected-product-info">
                <h4>${product.propertyType === 'sale' ? 'فروش' : 'اجاره'} ${product.bedrooms} خوابه</h4>
                <p>مساحت: ${product.area} متر مربع</p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    setupFileUpload();
}

// بستن مودال آپلود
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'none';
    selectedProductId = null;
    resetUploadForm();
}

// تنظیم آپلود فایل
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const videoInput = document.getElementById('videoInput');
    const fileInfo = document.getElementById('fileInfo');
    const submitBtn = document.getElementById('submitBtn');

    // رویدادهای drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            handleFileSelect(files[0]);
        } else {
            showError('لطفاً فقط فایل‌های ویدیویی انتخاب کنید.');
        }
    });

    // رویداد انتخاب فایل
    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// مدیریت انتخاب فایل
function handleFileSelect(file) {
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const uploadArea = document.getElementById('uploadArea');
    const submitBtn = document.getElementById('submitBtn');

    // نمایش اطلاعات فایل
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    uploadArea.style.display = 'none';
    fileInfo.style.display = 'flex';
    submitBtn.disabled = false;

    // ذخیره فایل در متغیر سراسری
    window.selectedVideoFile = file;
}

// حذف فایل انتخاب شده
function removeSelectedFile() {
    const fileInfo = document.getElementById('fileInfo');
    const uploadArea = document.getElementById('uploadArea');
    const submitBtn = document.getElementById('submitBtn');
    const videoInput = document.getElementById('videoInput');

    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    submitBtn.disabled = true;
    videoInput.value = '';
    window.selectedVideoFile = null;
}

// ارسال درخواست
async function submitRequest() {
    if (!selectedProductId || !window.selectedVideoFile) {
        showError('لطفاً ابتدا فایل ویدیو را انتخاب کنید.');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'در حال ارسال...';
        uploadProgress.style.display = 'block';

        const formData = new FormData();
        formData.append('productId', selectedProductId);
        formData.append('video', window.selectedVideoFile);

        const xhr = new XMLHttpRequest();

        // تنظیم پیشرفت آپلود
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = Math.round(percentComplete) + '%';
            }
        });

        // تنظیم پاسخ
        xhr.addEventListener('load', () => {
            if (xhr.status === 201) {
                const response = JSON.parse(xhr.responseText);
                closeUploadModal();
                showSuccessModal();
                loadActiveRequests(); // بارگذاری مجدد درخواست‌های فعال
                displayProducts(allProducts); // به‌روزرسانی نمایش محصولات
            } else {
                const errorResponse = JSON.parse(xhr.responseText);
                showError(errorResponse.error || 'خطا در ارسال درخواست');
            }
        });

        xhr.addEventListener('error', () => {
            showError('خطا در ارسال فایل. لطفاً دوباره تلاش کنید.');
        });

        xhr.open('POST', '/api/requests-3d/submit-request');
        xhr.send(formData);

    } catch (error) {
        console.error('Error submitting request:', error);
        showError('خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'ارسال درخواست';
        uploadProgress.style.display = 'none';
    }
}

// نمایش مودال موفقیت
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
}

// بستن مودال موفقیت
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.style.display = 'none';
}

// ریست کردن فرم آپلود
function resetUploadForm() {
    const fileInfo = document.getElementById('fileInfo');
    const uploadArea = document.getElementById('uploadArea');
    const submitBtn = document.getElementById('submitBtn');
    const videoInput = document.getElementById('videoInput');
    const uploadProgress = document.getElementById('uploadProgress');

    fileInfo.style.display = 'none';
    uploadArea.style.display = 'block';
    uploadProgress.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'ارسال درخواست';
    videoInput.value = '';
    window.selectedVideoFile = null;
}

// نمایش خطا
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// فرمت کردن تاریخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR');
}

// فرمت کردن سایز فایل
function formatFileSize(bytes) {
    if (bytes === 0) return '0 بایت';
    const k = 1024;
    const sizes = ['بایت', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// دریافت کلاس وضعیت
function getStatusClass(status) {
    switch (status) {
        case 'در حال بررسی':
            return 'status-pending';
        case 'تایید شده':
            return 'status-approved';
        case 'رد شده':
            return 'status-rejected';
        default:
            return 'status-pending';
    }
}

// بستن مودال‌ها با کلیک بیرون
document.addEventListener('click', (e) => {
    const uploadModal = document.getElementById('uploadModal');
    const successModal = document.getElementById('successModal');

    if (e.target === uploadModal) {
        closeUploadModal();
    }
    if (e.target === successModal) {
        closeSuccessModal();
    }
});

// بستن مودال‌ها با کلید Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUploadModal();
        closeSuccessModal();
    }
});

// تابع refresh دستی
function forceRefresh() {
    console.log('Force refreshing live data...');
    loadUserProducts();
}

// اضافه کردن دکمه refresh
function addRefreshButton() {
    const header = document.querySelector('.header-right');
    if (header && !document.getElementById('refreshBtn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshBtn';
        refreshBtn.className = 'back-btn';
        refreshBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            بروزرسانی زنده
        `;
        refreshBtn.onclick = forceRefresh;
        header.appendChild(refreshBtn);
    }
}

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', () => {
    addRefreshButton();
    loadUserProducts();
    
    // سیستم به‌روزرسانی خودکار هر 10 ثانیه
    setInterval(() => {
        console.log('Auto-refreshing data...');
        loadActiveRequests(); // فقط درخواست‌ها را به‌روزرسانی می‌کند
        
        // اگر درخواست‌ها تغییر کرده باشند، محصولات را هم به‌روزرسانی کن
        if (allProducts.length > 0) {
            displayProducts(allProducts);
        }
    }, 10000); // هر 10 ثانیه
});