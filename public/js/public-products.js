// استخراج نام کاربری از URL
function getUsernameFromUrl() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[1] || null;
}

// فرمت تاریخ
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR');
}

// فرمت قیمت
function formatPrice(price) {
    if (!price) return '-';
    return parseInt(price).toLocaleString('fa-IR') + ' تومان';
}

// دریافت HTML اطلاعات قیمت‌گذاری
function getPricingDetailsHtml(product) {
    let pricingHtml = '';

    // قیمت فروش (مستقل از نوع ملک)
    if (product.salePrice) {
        pricingHtml += `
            <div class="detail-item">
                <div class="detail-label">قیمت فروش</div>
                <div class="detail-value">${formatPrice(product.salePrice)}</div>
            </div>
        `;
        if (product.pricePerMeter) {
            pricingHtml += `
                <div class="detail-item">
                    <div class="detail-label">قیمت هر متر</div>
                    <div class="detail-value">${formatPrice(product.pricePerMeter)}</div>
                </div>
            `;
        }
    }

    // قیمت اجاره (مستقل از نوع ملک)
    if (product.deposit || product.monthlyRent) {
        if (product.deposit) {
        pricingHtml += `
            <div class="detail-item">
                <div class="detail-label">ودیعه</div>
                <div class="detail-value">${formatPrice(product.deposit)}</div>
            </div>
        `;
    }
    if (product.monthlyRent) {
        pricingHtml += `
            <div class="detail-item">
                <div class="detail-label">اجاره ماهانه</div>
                <div class="detail-value">${formatPrice(product.monthlyRent)}</div>
            </div>
        `;
    }
    if (product.allowConversion) {
        pricingHtml += `
            <div class="detail-item conversion-info">
                <div class="detail-label">تبدیل ودیعه</div>
                <div class="detail-value">امکان تبدیل موجود</div>
            </div>
        `;
    }
    }

    return pricingHtml || `
        <div class="detail-item">
            <div class="detail-label">قیمت</div>
            <div class="detail-value">تعیین نشده</div>
        </div>
    `;
}

// ایجاد کارت محصول
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => {
        window.location.href = product.url;
    };

    const pricingHtml = getPricingDetailsHtml(product);
    const hasPricing = pricingHtml.trim().length > 0;

    // بررسی وجود تصویر و نمایش placeholder در صورت عدم وجود
    const imageSection = product.mainImage ? 
        `<img src="${product.mainImage}" 
             alt="تصویر محصول" 
             class="product-image"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
         <div class="image-placeholder" style="display: none;">
             <svg viewBox="0 0 24 24" fill="currentColor">
                 <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
             </svg>
             <span>تصویری موجود نیست</span>
         </div>` :
        `<div class="image-placeholder">
             <svg viewBox="0 0 24 24" fill="currentColor">
                 <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
             </svg>
             <span>تصویری موجود نیست</span>
         </div>`;

    card.innerHTML = `
        ${imageSection}
        <div class="product-info">
            <div class="product-details">
                <div class="basic-info-row">
                    <div class="detail-item">
                        <div class="detail-label">تعداد اتاق</div>
                        <div class="detail-value">${product.bedrooms}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">متراژ</div>
                        <div class="detail-value">${product.area} متر</div>
                    </div>
                </div>
            </div>
            ${hasPricing ? `
                <div class="pricing-section">
                    ${pricingHtml}
                </div>
            ` : ''}
            <div class="product-date">
                تاریخ افزودن: ${formatDate(product.created_at)}
            </div>
        </div>
    `;

    return card;
}

// دریافت اطلاعات کاربر
async function getUserInfo(username) {
    try {
        // دریافت فایل users.json از API یا مسیر عمومی
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

// بارگذاری محصولات
async function loadProducts() {
    const username = getUsernameFromUrl();

    if (!username) {
        document.getElementById('error').style.display = 'block';
        document.getElementById('loading').style.display = 'none';
        return;
    }

    // دریافت اطلاعات کاربر
    const userInfo = await getUserInfo(username);

    // به‌روزرسانی عنوان صفحه
    document.getElementById('pageTitle').textContent = `محصولات ${userInfo.name}`;

    // نمایش شماره تماس در صورت وجود
    const contactElement = document.getElementById('userContact');
    if (userInfo.phone) {
        contactElement.textContent = `تماس: ${userInfo.phone}`;
    } else {
        contactElement.style.display = 'none';
    }

    try {
        const response = await fetch(`/api/public-products/${username}/products`);

        if (!response.ok) {
            throw new Error('Failed to load products');
        }

        const data = await response.json();

        document.getElementById('loading').style.display = 'none';

        if (data.products && data.products.length > 0) {
            // تنظیم فیلتر با محصولات دریافت شده
            window.ProductsFilter.initializeFilter(data.products);
            
            // تنظیم event listener ها برای دکمه‌های فیلتر
            window.ProductsFilter.setupFilterButtons();
            
            const container = document.getElementById('productsContainer');
            container.style.display = 'grid';

            data.products.forEach(product => {
                container.appendChild(createProductCard(product));
            });
        } else {
            document.getElementById('noProducts').style.display = 'block';
        }

    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// نمایش درباره ما
function showAboutUs() {
    alert('درباره ما: این سایت برای نمایش محصولات املاک طراحی شده است.');
}

// بارگذاری محصولات هنگام لود صفحه
window.addEventListener('load', loadProducts);