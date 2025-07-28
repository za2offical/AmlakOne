let currentProduct = null;

// استخراج اطلاعات از URL
function getInfoFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return {
        username: pathParts[1] || null,
        productId: pathParts[2] || null
    };
}

// فرمت تاریخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// متغیرهای مودال
let modalImages = [];
let currentModalIndex = 0;

// تنظیم تصویر اصلی
function setMainImage(imageUrl, index = 0) {
    const container = document.getElementById('mainImageContainer');
    container.innerHTML = `<img src="${imageUrl}" alt="تصویر آگهی ${index + 1}" class="main-image" onclick="openModal(${index})" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>تصویر در دسترس نیست</div>'">`;

    // به‌روزرسانی thumbnail های فعال
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// باز کردن مودال
function openModal(index = 0) {
    if (!modalImages || modalImages.length === 0) return;

    currentModalIndex = index;
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');

    // نمایش مودال با انیمیشن
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    modalImage.src = modalImages[currentModalIndex];
    modalCounter.textContent = `${currentModalIndex + 1} از ${modalImages.length}`;

    // مخفی/نمایش دکمه‌های ناوبری
    document.getElementById('modalPrev').style.display = modalImages.length > 1 ? 'flex' : 'none';
    document.getElementById('modalNext').style.display = modalImages.length > 1 ? 'flex' : 'none';
    
    // جلوگیری از اسکرول در بک‌گراند
    document.body.style.overflow = 'hidden';
}

// بستن مودال
function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 400);
}

// تصویر قبلی در مودال
function modalPrevImage() {
    if (modalImages.length <= 1) return;
    
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    
    // انیمیشن خروج
    modalImage.style.opacity = '0';
    modalImage.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        currentModalIndex = (currentModalIndex - 1 + modalImages.length) % modalImages.length;
        modalImage.src = modalImages[currentModalIndex];
        modalCounter.textContent = `${currentModalIndex + 1} از ${modalImages.length}`;
        
        // انیمیشن ورود
        modalImage.style.opacity = '1';
        modalImage.style.transform = 'scale(1)';
    }, 150);
}

// تصویر بعدی در مودال
function modalNextImage() {
    if (modalImages.length <= 1) return;
    
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    
    // انیمیشن خروج
    modalImage.style.opacity = '0';
    modalImage.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        currentModalIndex = (currentModalIndex + 1) % modalImages.length;
        modalImage.src = modalImages[currentModalIndex];
        modalCounter.textContent = `${currentModalIndex + 1} از ${modalImages.length}`;
        
        // انیمیشن ورود
        modalImage.style.opacity = '1';
        modalImage.style.transform = 'scale(1)';
    }, 150);
}

// نمایش دکمه 3D در صورت وجود
function display3DButton(product) {
    const view3DSection = document.getElementById('view3DSection');

    if (product.has3D && product.url3D) {
        view3DSection.innerHTML = `
            <a href="${product.url3D}" target="_blank" class="view-3d-button" rel="noopener noreferrer">
                <div class="view-3d-icon">🏠</div>
                <span class="view-3d-text">مشاهده تور مجازی 3D</span>
            </a>
        `;
        view3DSection.style.display = 'block';
    } else {
        view3DSection.style.display = 'none';
    }
}

// ایجاد گالری تصاویر با اسلایدر حرفه‌ای Swiper
function createImageGallery(images) {
    const mainWrapper = document.getElementById('swiperMainWrapper');
    const thumbWrapper = document.getElementById('swiperThumbWrapper');
    const imageViewHint = document.getElementById('imageViewHint');
    mainWrapper.innerHTML = '';
    thumbWrapper.innerHTML = '';

    if (!images || images.length === 0) {
        mainWrapper.innerHTML = '<div class="swiper-slide"><div class="no-image">تصویری موجود نیست</div></div>';
        thumbWrapper.innerHTML = '';
        imageViewHint.style.display = 'none';
        return;
    }

    // نمایش متن راهنما در صورت وجود تصویر
    imageViewHint.style.display = 'block';

    images.forEach((img, idx) => {
        mainWrapper.innerHTML += `<div class='swiper-slide'><img src='${img}' alt='تصویر ${idx+1}' class='main-image' onclick='openModal(${idx})' onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'>تصویری در دسترس نیست</div>'"></div>`;
        thumbWrapper.innerHTML += `<div class='swiper-slide'><img src='${img}' alt='تصویر کوچک ${idx+1}' class='thumbnail'></div>`;
    });

    // Destroy previous Swipers if exist
    if (window.mainSwiper) window.mainSwiper.destroy();
    if (window.thumbSwiper) window.thumbSwiper.destroy();

    // Init thumb swiper
    window.thumbSwiper = new Swiper('.thumb-swiper', {
        spaceBetween: 10,
        slidesPerView: Math.min(images.length, 5),
        freeMode: true,
        watchSlidesProgress: true,
        direction: 'horizontal',
        breakpoints: {
            0: { slidesPerView: 3 },
            600: { slidesPerView: 5 }
        }
    });
    // Init main swiper
    window.mainSwiper = new Swiper('.main-swiper', {
        spaceBetween: 10,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        thumbs: {
            swiper: window.thumbSwiper,
        },
        loop: images.length > 1,
    });
}

// نمایش امکانات
function displayFacilities(facilities) {
    const facilitiesGrid = document.getElementById('facilitiesGrid');
    facilitiesGrid.innerHTML = '';

    if (!facilities) return;

    const facilityLabels = {
        parking: 'پارکینگ',
        storage: 'انباری',
        elevator: 'آسانسور',
        balcony: 'بالکن',
        parquet: 'کف پارکت',
        westernToilet: 'سرویس فرنگی'
    };

    Object.keys(facilityLabels).forEach(key => {
        if (facilities[key]) {
            const facilityCard = document.createElement('div');
            facilityCard.className = 'facility-card';
            facilityCard.innerHTML = `
                <div class="facility-label">${facilityLabels[key]}</div>
                <div class="facility-value">✓</div>
            `;
            facilitiesGrid.appendChild(facilityCard);
        }
    });
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
        conversionCard.className = 'detail-card conversion-info conversion-available';
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

// دریافت اطلاعات کاربر
async function getUserInfo(username) {
    try {
        const response = await fetch('/api/public-products/user-info/' + username);
        if (response.ok) {
            const userData = await response.json();
            const displayInfo = {
                name: userData.firstName && userData.lastName ? 
                    `${userData.firstName} ${userData.lastName}` : username,
                phone: userData.phone || null
            };
            return displayInfo;
        }
        return { name: username, phone: null };
    } catch (error) {
        console.error('Error fetching user info:', error);
        return { name: username, phone: null };
    }
}

// نمایش مودال تایید تماس
function showCallConfirmModal(phoneNumber) {
    const modal = document.getElementById('callConfirmModal');
    const modalPhoneNumber = document.getElementById('modalPhoneNumber');
    const confirmBtn = document.getElementById('confirmCallBtn');

    modalPhoneNumber.textContent = phoneNumber;
    confirmBtn.onclick = () => {
        window.location.href = `tel:${phoneNumber}`;
        closeCallModal();
    };

    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// بستن مودال تایید تماس
function closeCallModal() {
    const modal = document.getElementById('callConfirmModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// رفتن به صفحه اصلی
function goHome() {
    window.location.href = '/';
}

// نمایش اطلاعات محصول
async function displayProduct(product) {
    currentProduct = product;

    // دریافت اطلاعات کاربر
    const userInfo = await getUserInfo(product.owner);

    // به‌روزرسانی عنوان صفحه
    document.getElementById('pageTitle').textContent = userInfo.name;

    // نمایش آیکون و شماره تماس در صورت وجود
    const contactElement = document.getElementById('userContact');
    const phoneNumberElement = document.getElementById('phoneNumber');

    if (userInfo.phone) {
        contactElement.style.display = 'flex';
        phoneNumberElement.textContent = userInfo.phone;
        contactElement.onclick = () => {
            showCallConfirmModal(userInfo.phone);
        };
    } else {
        contactElement.style.display = 'none';
    }

    // تنظیم دکمه بازگشت
    document.getElementById('backButton').href = `/${product.owner}/products`;

    // تنظیم جزئیات
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

    // نمایش قیمت‌گذاری
    displayPricing(product);

    // نمایش امکانات
    if (product.facilities) {
        displayFacilities(product.facilities);
    }

    // نمایش توضیحات
    if (product.description && product.description.trim()) {
        document.getElementById('descriptionSection').style.display = 'block';
        document.getElementById('descriptionText').textContent = product.description;
    }

    // تنظیم تصاویر برای مودال
    modalImages = product.images && Array.isArray(product.images) ? product.images : [];

    // ایجاد گالری تصاویر
    createImageGallery(product.images);

    // نمایش دکمه 3D
    display3DButton(product);

    // نمایش محصول
    document.getElementById('loading').style.display = 'none';
    document.getElementById('productContainer').style.display = 'block';
}

// بارگذاری جزئیات محصول
async function loadProductDetails() {
    const { username, productId } = getInfoFromUrl();

    if (!username || !productId) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/public-details/${username}/${productId}`);

        if (!response.ok) {
            throw new Error('محصول یافت نشد');
        }

        const product = await response.json();
        displayProduct(product);
        updateOpenGraphMeta(product);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('productContainer').style.display = 'block';

    } catch (error) {
        console.error('خطا در بارگذاری محصول:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// Function to update Open Graph meta tags
function updateOpenGraphMeta(product) {
    const title = product.type || 'جزئیات ملک';
    const description = product.description || 'مشاهده جزئیات کامل این ملک';
    const logoUrl = window.location.origin + '/AmlakOne-logo.jpg';

    // Update or create meta tags
    updateMetaTag('og:title', title + ' - AmlakOne');
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', logoUrl);
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:type', 'website');
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title + ' - AmlakOne');
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', logoUrl);

    // Update page title
    document.title = title + ' - AmlakOne';
}

function updateMetaTag(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`) || 
               document.querySelector(`meta[name="${property}"]`);

    if (meta) {
        meta.setAttribute('content', content);
    } else {
        meta = document.createElement('meta');
        if (property.startsWith('og:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }
}

// بارگذاری محصول هنگام لود صفحه
window.addEventListener('load', loadProductDetails);

// Event listeners برای مودال
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const modalClose = document.getElementById('modalClose');
    const modalPrev = document.getElementById('modalPrev');
    const modalNext = document.getElementById('modalNext');

    // بستن مودال با کلیک روی X
    modalClose.onclick = closeModal;

    // بستن مودال با کلیک روی پس‌زمینه
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };

    // دکمه‌های ناوبری
    modalPrev.onclick = function(event) {
        event.stopPropagation();
        modalPrevImage();
    };

    modalNext.onclick = function(event) {
        event.stopPropagation();
        modalNextImage();
    };

    // کلیدهای صفحه کلید
    document.addEventListener('keydown', function(event) {
        if (modal.style.display === 'block') {
            switch(event.key) {
                case 'Escape':
                    closeModal();
                    break;
                case 'ArrowLeft':
                    modalNextImage();
                    break;
                case 'ArrowRight':
                    modalPrevImage();
                    break;
            }
        }
    });

    // جلوگیری از کلیک روی محتوای مودال
    document.querySelector('.modal-content').onclick = function(event) {
        event.stopPropagation();
    };

    // بستن مودال تماس با کلیک خارج از آن
    const callModal = document.getElementById('callConfirmModal');
    if (callModal) {
        callModal.onclick = function(event) {
            if (event.target === callModal) {
                closeCallModal();
            }
        };
    }
});