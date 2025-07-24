let currentProduct = null;

// فرمت تاریخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// تنظیم تصویر اصلی
function setMainImage(imageUrl, index = 0) {
    const container = document.getElementById('mainImageContainer');
    container.innerHTML = `<img src="${imageUrl}" alt="تصویر محصول ${index + 1}" class="main-image" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>تصویر در دسترس نیست</div>'">`;
    
    // به‌روزرسانی thumbnail های فعال
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// ایجاد گالری تصاویر با اسلایدر حرفه‌ای Swiper
function createImageGallery(images) {
    const mainWrapper = document.getElementById('swiperMainWrapper');
    const thumbWrapper = document.getElementById('swiperThumbWrapper');
    mainWrapper.innerHTML = '';
    thumbWrapper.innerHTML = '';

    if (!images || images.length === 0) {
        mainWrapper.innerHTML = '<div class="swiper-slide"><div class="no-image">تصویری موجود نیست</div></div>';
        thumbWrapper.innerHTML = '';
        return;
    }

    images.forEach((img, idx) => {
        mainWrapper.innerHTML += `<div class='swiper-slide'><img src='${img}' alt='تصویر ${idx+1}' class='main-image' onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>تصویری در دسترس نیست</div>'"></div>`;
        thumbWrapper.innerHTML += `<div class='swiper-slide'><img src='${img}' alt='تصویر کوچک ${idx+1}' class='thumbnail'></div>`;
    });

    // Destroy previous Swipers if exist
    if (window.mainSwiper) window.mainSwiper.destroy();
    if (window.thumbSwiper) window.thumbSwiper.destroy();

    // Init thumb swiper with improved settings
    window.thumbSwiper = new Swiper('.thumb-swiper', {
        spaceBetween: 8,
        slidesPerView: 'auto',
        freeMode: true,
        watchSlidesProgress: true,
        direction: 'horizontal',
        grabCursor: true,
        breakpoints: {
            0: { slidesPerView: 'auto', spaceBetween: 6 },
            480: { slidesPerView: 'auto', spaceBetween: 8 },
            768: { slidesPerView: 'auto', spaceBetween: 10 },
            1024: { slidesPerView: 'auto', spaceBetween: 12 }
        }
    });

    // Init main swiper with enhanced features
    window.mainSwiper = new Swiper('.main-swiper', {
        spaceBetween: 0,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        thumbs: {
            swiper: window.thumbSwiper,
        },
        loop: images.length > 1,
        grabCursor: true,
        keyboard: {
            enabled: true,
            onlyInViewport: true,
        },
        autoplay: images.length > 1 ? {
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        } : false,
        speed: 600,
        on: {
            slideChange: function () {
                // Add smooth transition effect
                const activeSlide = this.slides[this.activeIndex];
                if (activeSlide) {
                    activeSlide.style.transform = 'scale(1.02)';
                    setTimeout(() => {
                        activeSlide.style.transform = 'scale(1)';
                    }, 300);
                }
            }
        }
    });

    // Add touch/swipe support for mobile and autoplay control
    let touchStartX = 0;
    let touchEndX = 0;
    
    const mainSwiperEl = document.querySelector('.main-swiper');
    
    // Touch events for mobile swipe
    mainSwiperEl.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    mainSwiperEl.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            // Swipe left - next slide
            window.mainSwiper.slideNext();
        } else if (touchEndX > touchStartX + swipeThreshold) {
            // Swipe right - previous slide
            window.mainSwiper.slidePrev();
        }
    }

    // Pause autoplay when user interacts with slider
    mainSwiperEl.addEventListener('mouseenter', () => {
        if (window.mainSwiper.autoplay) {
            window.mainSwiper.autoplay.stop();
        }
    });
    
    mainSwiperEl.addEventListener('mouseleave', () => {
        if (window.mainSwiper.autoplay && images.length > 1) {
            window.mainSwiper.autoplay.start();
        }
    });
}

// نمایش امکانات
function displayFacilities(facilities) {
    const facilitiesGrid = document.getElementById('facilitiesGrid');
    facilitiesGrid.innerHTML = '';

    if (!facilities) return;

    const facilityLabels = {
        parking: { label: 'پارکینگ', icon: '🚗' },
        storage: { label: 'انباری', icon: '📦' },
        elevator: { label: 'آسانسور', icon: '🛗' },
        balcony: { label: 'بالکن', icon: '🌿' },
        parquet: { label: 'کف پارکت', icon: '🪵' },
        westernToilet: { label: 'سرویس فرنگی', icon: '🚽' }
    };

    Object.keys(facilityLabels).forEach(key => {
        if (facilities[key]) {
            const facilityCard = document.createElement('div');
            facilityCard.className = 'facility-card';
            facilityCard.innerHTML = `
                <div class="facility-icon">
                    <span style="font-size: 16px;">${facilityLabels[key].icon}</span>
                </div>
                <div class="facility-label">${facilityLabels[key].label}</div>
            `;
            facilitiesGrid.appendChild(facilityCard);
        }
    });
}

// نمایش اطلاعات خصوصی
function displayPrivateInfo(privateInfo) {
    const privateInfoGrid = document.getElementById('privateInfoGrid');
    const privateInfoSection = document.getElementById('privateInfoSection');
    
    privateInfoGrid.innerHTML = '';

    if (!privateInfo) return;

    const infoLabels = {
        propertyAddress: 'آدرس ملک',
        ownerName: 'نام مالک',
        ownerPhone: 'شماره تماس مالک',
        propertyNumber: 'شماره ملک',
        tenantName: 'نام ساکن فعلی',
        tenantPhone: 'شماره تماس ساکن فعلی'
    };

    let hasAnyInfo = false;

    Object.keys(infoLabels).forEach(key => {
        if (privateInfo[key] && privateInfo[key].trim()) {
            hasAnyInfo = true;
            const infoItem = document.createElement('div');
            infoItem.className = 'info-item';
            infoItem.innerHTML = `
                <label>${infoLabels[key]}:</label>
                <div class="value">${privateInfo[key]}</div>
            `;
            privateInfoGrid.appendChild(infoItem);
        }
    });

    if (hasAnyInfo) {
        privateInfoSection.style.display = 'block';
    }
}

// فرمت کردن قیمت با کاما
function formatPrice(price) {
    if (!price) return '-';
    return parseInt(price).toLocaleString() + ' تومان';
}

// نمایش قیمت‌گذاری
function displayPricing(product) {
    const pricingGrid = document.getElementById('pricingGrid');
    const pricingSection = document.getElementById('pricingSection');
    pricingGrid.innerHTML = '';

    let hasPricing = false;

    // بررسی قیمت فروش
    if (product.salePrice) {
        hasPricing = true;
        const salePriceCard = document.createElement('div');
        salePriceCard.className = 'detail-card';
        salePriceCard.innerHTML = `
            <div class="detail-label">قیمت کل</div>
            <div class="detail-value">${formatPrice(product.salePrice)}</div>
        `;
        pricingGrid.appendChild(salePriceCard);

        if (product.pricePerMeter) {
            const pricePerMeterCard = document.createElement('div');
            pricePerMeterCard.className = 'detail-card';
            pricePerMeterCard.innerHTML = `
                <div class="detail-label">قیمت هر متر</div>
                <div class="detail-value">${formatPrice(product.pricePerMeter)}</div>
            `;
            pricingGrid.appendChild(pricePerMeterCard);
        }
    }
    
    // بررسی قیمت اجاره (مستقل از نوع ملک)
    if (product.deposit) {
        hasPricing = true;
        const depositCard = document.createElement('div');
        depositCard.className = 'detail-card';
        depositCard.innerHTML = `
            <div class="detail-label">ودیعه</div>
            <div class="detail-value">${formatPrice(product.deposit)}</div>
        `;
        pricingGrid.appendChild(depositCard);
    }

    if (product.monthlyRent) {
        hasPricing = true;
        const rentCard = document.createElement('div');
        rentCard.className = 'detail-card';
        rentCard.innerHTML = `
            <div class="detail-label">اجاره ماهانه</div>
            <div class="detail-value">${formatPrice(product.monthlyRent)}</div>
        `;
        pricingGrid.appendChild(rentCard);
    }
    
    if (product.allowConversion) {
        hasPricing = true;
        const conversionCard = document.createElement('div');
        conversionCard.className = 'detail-card conversion-info';
        let conversionText = 'امکان تبدیل ودیعه به اجاره';
        
        if (product.conversionDeductAmount && product.conversionAddAmount) {
            conversionText += `<br><small>کاهش ${formatPrice(product.conversionDeductAmount)} از ودیعه<br>اضافه ${formatPrice(product.conversionAddAmount)} به اجاره</small>`;
        }
        
        conversionCard.innerHTML = `
            <div class="detail-label">تبدیل ودیعه</div>
            <div class="detail-value">${conversionText}</div>
        `;
        pricingGrid.appendChild(conversionCard);
    }

    pricingSection.style.display = hasPricing ? 'block' : 'none';
}

// نمایش اطلاعات محصول
function displayProduct(product) {
    currentProduct = product;

    // تنظیم جزئیات اصلی
    const propertyTypeText = product.propertyType === 'sale' ? 'فروش' : 
                           product.propertyType === 'rent' ? 'اجاره' : '-';
    document.getElementById('propertyType').textContent = propertyTypeText;
    document.getElementById('bedrooms').textContent = product.bedrooms;
    document.getElementById('area').textContent = product.area;
    
    // سال ساخت
    if (product.constructionYear) {
        document.getElementById('constructionYear').textContent = product.constructionYear;
        document.getElementById('constructionYearCard').style.display = 'block';
    }
    
    document.getElementById('createdDate').textContent = formatDate(product.created_at);
    document.getElementById('updatedDate').textContent = formatDate(product.updated_at);

    // نمایش قیمت‌گذاری
    displayPricing(product);

    // نمایش امکانات
    if (product.facilities) {
        displayFacilities(product.facilities);
    }

    // نمایش اطلاعات خصوصی
    if (product.privateInfo) {
        displayPrivateInfo(product.privateInfo);
    }

    // نمایش توضیحات
    if (product.description && product.description.trim()) {
        document.getElementById('descriptionSection').style.display = 'block';
        document.getElementById('descriptionText').textContent = product.description;
    }

    // ایجاد گالری تصاویر
    createImageGallery(product.images);

    // نمایش محصول
    document.getElementById('loading').style.display = 'none';
    document.getElementById('productContainer').style.display = 'block';

    // Render action bar
    renderProductActions(product);
}

function renderProductActions(product) {
    const actionsDiv = document.getElementById('productActions');
    if (!actionsDiv) return;
    
    actionsDiv.innerHTML = `
        <button class="btn btn-success" id="editProductBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            ویرایش
        </button>
        <button class="btn btn-danger" id="deleteProductBtn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            حذف
        </button>
    `;
    
    // Edit button
    document.getElementById('editProductBtn').onclick = () => {
        window.location.href = `/edit-product?id=${product.id}`;
    };
    
    // Delete button
    document.getElementById('deleteProductBtn').onclick = () => {
        openDeleteModal(product.id);
    };
}

// Modal functions
function openDeleteModal(productId) {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'flex';
    modal.setAttribute('data-product-id', productId);
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'none';
}

async function confirmDelete() {
    const modal = document.getElementById('deleteModal');
    const productId = modal.getAttribute('data-product-id');
    
    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/panel';
        } else {
            alert('خطا در حذف ملک. لطفاً دوباره تلاش کنید.');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('خطا در حذف ملک. لطفاً دوباره تلاش کنید.');
    }
    
    closeDeleteModal();
}

async function deleteProduct(productId) {
    try {
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (res.ok) {
            window.location.href = '/panel';
        } else {
            alert('خطا در حذف محصول.');
        }
    } catch (err) {
        alert('خطا در حذف محصول.');
    }
}

// بارگذاری جزئیات محصول
async function loadProductDetails() {
    try {
        const pathParts = window.location.pathname.split('/');
        const username = pathParts[1];
        const productId = pathParts[2];

        const response = await fetch(`/api/product-details/${username}/${productId}`);
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        if (response.status === 403) {
            document.getElementById('error').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
            return;
        }

        if (!response.ok) {
            throw new Error('محصول یافت نشد');
        }

        const product = await response.json();
        displayProduct(product);

    } catch (error) {
        console.error('خطا در بارگذاری محصول:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// بارگذاری محصول هنگام لود صفحه
window.addEventListener('load', loadProductDetails);
