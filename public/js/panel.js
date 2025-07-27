// بررسی وضعیت احراز هویت
  async function checkAuth() {
    try {
        const response = await fetch('/api/panel/user-info', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.log('User not authenticated, redirecting to login');
                window.location.href = '/login';
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const userData = await response.json();
        console.log('User authenticated successfully:', userData.username);
        return userData;
    } catch (error) {
        console.error('Authentication error:', error);
        showError('خطا در احراز هویت. در حال انتقال به صفحه ورود...');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        return null;
    }
  }

  // بارگذاری اطلاعات کاربر
  async function loadUserInfo() {
    try {
        const userData = await checkAuth();
        if (userData) {
            // نمایش نام و نام خانوادگی
            const firstName = userData.firstName || userData.username || '';
            const lastName = userData.lastName || '';
            
            // به‌روزرسانی اطلاعات دسکتاپ
            const firstNameEl = document.getElementById('firstName');
            const lastNameEl = document.getElementById('lastName');
            if (firstNameEl) firstNameEl.textContent = firstName;
            if (lastNameEl) lastNameEl.textContent = lastName;

            // نمایش عکس پروفایل یا placeholder
            const profileImage = document.getElementById('profileImage');
            const profilePlaceholder = document.getElementById('profilePlaceholder');

            if (userData.profileImagePath && profileImage && profilePlaceholder) {
                profileImage.src = userData.profileImagePath;
                profileImage.style.display = 'block';
                profilePlaceholder.style.display = 'none';
            } else if (profileImage && profilePlaceholder) {
                profileImage.style.display = 'none';
                profilePlaceholder.style.display = 'flex';
            }

            // همگام‌سازی منوی موبایل
            setTimeout(() => {
                updateMobileProfile();
                updateMobileNotificationBadge();
            }, 100);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        showError('خطا در بارگذاری اطلاعات کاربر');
    }
  }

  // متغیرهای سراسری
  let allProducts = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let ignoreNextBlur = false;

  // بارگذاری محصولات
  async function loadProducts() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const productsContainer = document.getElementById('products');
    const statsContainer = document.getElementById('statsContainer');
    const filtersSection = document.getElementById('filtersSection');

    try {
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        productsContainer.innerHTML = '';

        // اضافه کردن پارامتر تصادفی برای جلوگیری از کش
        const response = await fetch('/api/panel-products/user-products?nocache=' + Date.now());
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        allProducts = await response.json();

        if (allProducts.length === 0) {
            productsContainer.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                    <h3>هیچ ملکی یافت نشد</h3>
                    <p>برای شروع، اولین ملک خود را ثبت کنید</p>
                </div>
            `;
            statsContainer.style.display = 'none';
            filtersSection.style.display = 'none';
            return;
        }

        // نمایش آمار و فیلترها
        statsContainer.style.display = 'grid';
        filtersSection.style.display = 'block';
        updateStats();
        displayProducts(allProducts);
        setupFilters();
    } catch (error) {
        console.error('Error loading products:', error);
        showError('خطا در بارگذاری محصولات. لطفاً دوباره تلاش کنید.');
    } finally {
        loadingDiv.style.display = 'none';
    }
  }

  // به‌روزرسانی آمار
  function updateStats() {
    const total = allProducts.length;
    const sale = allProducts.filter(p => p.salePrice).length;
    const rent = allProducts.filter(p => p.deposit || p.monthlyRent).length;
    const active = allProducts.length; // همه املاک فعال هستند

    document.getElementById('totalProperties').textContent = total;
    document.getElementById('saleProperties').textContent = sale;
    document.getElementById('rentProperties').textContent = rent;
    document.getElementById('activeProperties').textContent = active;
  }

  // نمایش محصولات
  function displayProducts(products) {
    const productsContainer = document.getElementById('products');
    productsContainer.innerHTML = '';

    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.dataset.productId = product.id;
        productElement.onclick = (e) => {
            if (e.target.closest('.product-checkbox') ||
                e.target.closest('.product-actions') ||
                (window.productEditor && window.productEditor.isMultiSelectMode)) {
                return;
            }
            window.location.href = product.url;
        };

        // بررسی وجود تصویر و نمایش placeholder در صورت عدم وجود
        const imageSection = product.mainImage ? 
            `<img src="${product.mainImage}" 
                 alt="محصول" 
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

        productElement.innerHTML = `
            <div class="product-card-header">
                ${imageSection}
                <div class="product-actions">
                    <button class="action-btn view-btn" onclick="viewProduct('${product.id}')" title="مشاهده عمومی">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                    <button class="action-btn share-btn" onclick="shareProduct('${product.id}')" title="اشتراک‌گذاری">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <p><strong>تعداد اتاق خواب:</strong> ${product.bedrooms}</p>
                <p><strong>مساحت:</strong> ${product.area} متر مربع</p>
                ${getPricingInfo(product)}
                <p><strong>تاریخ ایجاد:</strong> ${formatDate(product.created_at)}</p>
            </div>
        `;

        productsContainer.appendChild(productElement);
    });
  }

  // مشاهده محصول در صفحه عمومی
  function viewProduct(productId) {
    // دریافت نام کاربری از اطلاعات کاربر
    const userData = checkAuth();
    userData.then(user => {
        if (user && user.username) {
            const publicUrl = `/${user.username}/${productId}`;
            window.open(publicUrl, '_blank');
        }
    });
  }

  // اشتراک‌گذاری محصول
  async function shareProduct(productId) {
    try {
        // دریافت نام کاربری از اطلاعات کاربر
        const userData = await checkAuth();
        if (!userData || !userData.username) {
            showError('خطا در دریافت اطلاعات کاربر');
            return;
        }

        const publicUrl = `${window.location.origin}/${userData.username}/${productId}`;

        // بررسی پشتیبانی از Web Share API
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'مشاهده این ملک',
                    text: 'این ملک را در وب‌سایت املاک مشاهده کنید',
                    url: publicUrl
                });
            } catch (error) {
                // اگر کاربر اشتراک‌گذاری را لغو کرد، خطا نمایش نده
                if (error.name !== 'AbortError') {
                    fallbackShare(publicUrl);
                }
            }
        } else {
            // روش جایگزین برای مرورگرهای بدون پشتیبانی از Web Share API
            fallbackShare(publicUrl);
        }
    } catch (error) {
        console.error('Error sharing product:', error);
        showError('خطا در اشتراک‌گذاری محصول');
    }
  }

  // روش جایگزین اشتراک‌گذاری
  function fallbackShare(url) {
    // کپی کردن لینک در کلیپ‌بورد
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showSuccessMessage('لینک محصول در کلیپ‌بورد کپی شد');
        }).catch(() => {
            showShareModal(url);
        });
    } else {
        showShareModal(url);
    }
  }

  // نمایش مودال اشتراک‌گذاری
  function showShareModal(url) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `
        <div class="share-modal-content">
            <div class="share-modal-header">
                <h3>اشتراک‌گذاری محصول</h3>
                <button class="close-btn" onclick="this.closest('.share-modal').remove()">&times;</button>
            </div>
            <div class="share-modal-body">
                <p>لینک محصول:</p>
                <div class="share-url-container">
                    <input type="text" value="${url}" readonly class="share-url-input" id="shareUrlInput">
                    <button class="copy-btn" onclick="copyShareUrl()">کپی</button>
                </div>
                <div class="share-buttons">
                    <a href="https://telegram.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('مشاهده این ملک')}" target="_blank" class="share-platform-btn telegram">
                        تلگرام
                    </a>
                    <a href="https://wa.me/?text=${encodeURIComponent('مشاهده این ملک: ' + url)}" target="_blank" class="share-platform-btn whatsapp">
                        واتساپ
                    </a>
                    <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent('مشاهده این ملک')}" target="_blank" class="share-platform-btn twitter">
                        توییتر
                    </a>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // بستن مودال با کلیک روی پس‌زمینه
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
  }

  // کپی کردن URL اشتراک‌گذاری
  function copyShareUrl() {
    const input = document.getElementById('shareUrlInput');
    input.select();
    input.setSelectionRange(0, 99999);

    try {
        document.execCommand('copy');
        showSuccessMessage('لینک کپی شد');
        document.querySelector('.share-modal').remove();
    } catch (error) {
        showError('خطا در کپی کردن لینک');
    }
  }

  // نمایش پیام موفقیت
  function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // تنظیم فیلترها
  function setupFilters() {
    // جستجو
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
        filterAndDisplayProducts();
    });

    // فیلتر دکمه‌ها
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterAndDisplayProducts();
        });
    });
  }

  // فیلتر و نمایش محصولات
  function filterAndDisplayProducts() {
    let filteredProducts = allProducts;

    // اعمال فیلتر نوع
    if (currentFilter === 'sale') {
        filteredProducts = filteredProducts.filter(p => p.salePrice);
    } else if (currentFilter === 'rent') {
        filteredProducts = filteredProducts.filter(p => p.deposit || p.monthlyRent);
    } else if (currentFilter === 'recent') {
        filteredProducts = [...filteredProducts].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
    }

    // اعمال جستجو
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            product.bedrooms.toString().includes(query) ||
            product.area.toString().includes(query) ||
            (product.salePrice && product.salePrice.toString().includes(query)) ||
            (product.deposit && product.deposit.toString().includes(query)) ||
            (product.monthlyRent && product.monthlyRent.toString().includes(query))
        );
    }

    displayProducts(filteredProducts);
  }

  // نمایش خطا
  function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  // فرمت تاریخ
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // فرمت قیمت
  function formatPrice(price) {
    if (!price) return '-';
    return parseInt(price).toLocaleString() + ' تومان';
  }

  // دریافت اطلاعات قیمت‌گذاری
  function getPricingInfo(product) {
    let pricingHtml = '';

    // بررسی نوع ملک برای فروش
    if (product.salePrice) {
        pricingHtml += `<p><strong>قیمت:</strong> ${formatPrice(product.salePrice)}</p>`;
    }

    // بررسی نوع ملک برای اجاره
    if (product.deposit) {
        pricingHtml += `<p><strong>ودیعه:</strong> ${formatPrice(product.deposit)}</p>`;
    }
    if (product.monthlyRent) {
        pricingHtml += `<p><strong>اجاره:</strong> ${formatPrice(product.monthlyRent)}</p>`;
    }

    return pricingHtml || '<p><strong>قیمت:</strong> تعیین نشده</p>';
  }

  // خروج از حساب کاربری
  async function logout() {
    try {
        await fetch('/api/login/logout', { 
            method: 'POST',
            credentials: 'same-origin'
        });
        window.location.href = '/login';
    } catch (error) {
        console.error('Error during logout:', error);
        showError('خطا در خروج از حساب. لطفاً دوباره تلاش کنید.');
    }
  }

  // مدیریت خطاهای شبکه
  window.addEventListener('offline', () => {
    showError('شما آفلاین هستید. لطفاً اتصال اینترنت خود را بررسی کنید.');
  });

  window.addEventListener('online', () => {
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'none';
    loadProducts(); // بارگذاری مجدد محصولات
  });

  // بارگذاری محصولات هنگام نمایش صفحه (حتی بعد از بازگشت با back)
  window.addEventListener('pageshow', function() {
    loadProducts();
  });

  // بارگذاری اعلان‌ها
  async function loadNotifications() {
    try {
      const response = await fetch('/api/panel/notifications/unread-count', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const badge = document.getElementById('notificationBadge');
        const mobileBadge = document.getElementById('mobileNotificationBadge');
        
        if (data.unreadCount > 0) {
          if (badge) {
            badge.textContent = data.unreadCount;
            badge.style.display = 'flex';
          }
          if (mobileBadge) {
            mobileBadge.textContent = data.unreadCount;
            mobileBadge.style.display = 'flex';
          }
        } else {
          if (badge) badge.style.display = 'none';
          if (mobileBadge) mobileBadge.style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  // بارگذاری اولیه
  document.addEventListener('DOMContentLoaded', () => {
    // تاخیر کوتاه برای اطمینان از رندر کامل DOM
    setTimeout(() => {
      loadUserInfo();
      loadProducts();
      loadNotifications();
    }, 50);
  });

  // --- Menu Functions ---
  function toggleProfileMenu() {
    const profileMenu = document.getElementById('profileMenu');
    const profileDropdown = profileMenu.parentElement;

    profileDropdown.classList.toggle('active');
    profileMenu.classList.toggle('active');
  }

  function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');

    mobileMenu.classList.toggle('active');
    mobileMenuOverlay.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');

    // Prevent body scroll when menu is open
    if (mobileMenu.classList.contains('active')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');

    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    mobileMenuBtn.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Close menus when clicking outside
  document.addEventListener('click', function(e) {
    // Close profile menu
    const profileDropdown = document.querySelector('.profile-dropdown');
    if (profileDropdown && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove('active');
      document.getElementById('profileMenu').classList.remove('active');
    }
  });

  // Enhanced touch handling for mobile devices
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && mobileMenu.classList.contains('active')) {
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const diffX = touchStartX - touchCurrentX;
      const diffY = Math.abs(touchStartY - touchCurrentY);

      // Close menu on swipe right (only if horizontal swipe is dominant)
      if (diffX < -50 && diffY < 30) {
        closeMobileMenu();
      }
    }
  }, { passive: true });

  // Prevent zoom on double tap for better UX
  document.addEventListener('touchend', function(event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Optimize for different screen orientations
  function handleOrientationChange() {
    // Close mobile menu on orientation change
    if (window.innerHeight < 500) {
      closeMobileMenu();
    }

    // Adjust viewport height for mobile browsers
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('resize', handleOrientationChange);

  // Initialize viewport height
  document.addEventListener('DOMContentLoaded', function() {
    handleOrientationChange();
  });
  // Enhanced user info loading for mobile menu
  function updateMobileProfile() {
    try {
      const firstNameEl = document.getElementById('firstName');
      const lastNameEl = document.getElementById('lastName');
      const profileImage = document.getElementById('profileImage');
      const mobileFirstNameEl = document.getElementById('mobileFirstName');
      const mobileLastNameEl = document.getElementById('mobileLastName');
      const mobileProfileImage = document.getElementById('mobileProfileImage');
      const mobileProfilePlaceholder = document.getElementById('mobileProfilePlaceholder');

      // چک کردن وجود المان‌های اصلی
      if (firstNameEl && mobileFirstNameEl) {
        mobileFirstNameEl.textContent = firstNameEl.textContent;
      }
      
      if (lastNameEl && mobileLastNameEl) {
        mobileLastNameEl.textContent = lastNameEl.textContent;
      }

      // همگام‌سازی تصویر پروفایل
      if (profileImage && mobileProfileImage && mobileProfilePlaceholder) {
        if (profileImage.style.display !== 'none' && profileImage.src && profileImage.src !== window.location.href) {
          mobileProfileImage.src = profileImage.src;
          mobileProfileImage.style.display = 'block';
          mobileProfilePlaceholder.style.display = 'none';
        } else {
          mobileProfileImage.style.display = 'none';
          mobileProfilePlaceholder.style.display = 'flex';
        }
      }
    } catch (error) {
      console.error('Error updating mobile profile:', error);
    }
  }

  // Sync mobile search with main search
  document.addEventListener('DOMContentLoaded', function() {
    const mobileSearchInput = document.getElementById('mobileSearchInput');
    const mainSearchInput = document.getElementById('searchInput');

    if (mobileSearchInput && mainSearchInput) {
      mobileSearchInput.addEventListener('input', function() {
        mainSearchInput.value = this.value;
        mainSearchInput.dispatchEvent(new Event('input'));
      });

      mainSearchInput.addEventListener('input', function() {
        mobileSearchInput.value = this.value;
      });
    }
  });

  // Update notification badges for mobile
  function updateMobileNotificationBadge() {
    const desktopBadge = document.getElementById('notificationBadge');
    const mobileBadge = document.getElementById('mobileNotificationBadge');

    if (desktopBadge && mobileBadge) {
      if (desktopBadge.style.display !== 'none') {
        mobileBadge.textContent = desktopBadge.textContent;
        mobileBadge.style.display = 'flex';
      } else {
        mobileBadge.style.display = 'none';
      }
    }
  }

  // --- Animated Search Input ---
  document.addEventListener('DOMContentLoaded', function() {
  const searchToggleBtn = document.getElementById('searchToggleBtn');
  const searchInput = document.getElementById('searchInput');
  const searchSvgIcon = document.getElementById('searchSvgIcon');
  let searchOpen = false;

  // SVGs
  const searchIconSVG = '<svg id="searchSvgIcon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
  const closeIconSVG = '<svg id="searchSvgIcon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12l-4.89 4.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/></svg>';

  function updateIcon() {
    const iconSpan = searchToggleBtn.querySelector('.search-icon');
    if (searchOpen) {
      iconSpan.innerHTML = closeIconSVG;
    } else {
      iconSpan.innerHTML = searchIconSVG;
    }
  }

  function openSearch() {
    searchInput.classList.remove('search-input-collapsed');
    searchInput.classList.add('search-input-expanded');
    searchInput.focus();
    searchOpen = true;
    updateIcon();
  }
  function closeSearch() {
    searchInput.classList.remove('search-input-expanded');
    searchInput.classList.add('search-input-collapsed');
    searchInput.blur();
    searchOpen = false;
    updateIcon();
  }
  searchToggleBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (!searchOpen) {
      openSearch();
    } else {
      ignoreNextBlur = true;
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      setTimeout(closeSearch, 10);
    }
  });
  searchInput.addEventListener('input', function() {
    updateIcon();
  });
  searchInput.addEventListener('blur', function() {
    setTimeout(() => {
      if (searchOpen && !ignoreNextBlur) closeSearch();
      ignoreNextBlur = false;
    }, 150);
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && searchOpen) {
      closeSearch();
    }
  });
  // Prevent form submit on Enter
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') e.preventDefault();
  });
  });
  // Enhanced Responsive Utilities
  function getDeviceType() {
    const width = window.innerWidth;
    if (width >= 1400) return 'xl-desktop';
    if (width >= 1024) return 'desktop';
    if (width >= 768) return 'tablet';
    if (width >= 481) return 'large-mobile';
    if (width >= 376) return 'mobile';
    if (width >= 321) return 'small-mobile';
    return 'xs-mobile';
  }

  function updateResponsiveElements() {
    const deviceType = getDeviceType();
    document.body.setAttribute('data-device', deviceType);

    // Update mobile profile when device changes
    if (deviceType.includes('mobile') || deviceType === 'tablet') {
      updateMobileProfile();
      updateMobileNotificationBadge();
    }

    // Adjust grid columns based on device
    const productContainer = document.querySelector('.product-container');
    if (productContainer) {
      const products = productContainer.children.length;
      if (deviceType === 'xs-mobile' || deviceType === 'small-mobile') {
        productContainer.style.gridTemplateColumns = '1fr';
      } else if (deviceType === 'mobile' && products < 2) {
        productContainer.style.gridTemplateColumns = '1fr';
      }
    }
  }

  // Enhanced orientation and resize handling
  function handleResponsiveChanges() {
    // Close mobile menu on significant size changes
    const currentDevice = getDeviceType();
    if (currentDevice.includes('desktop') || currentDevice === 'tablet') {
      closeMobileMenu();
    }

    // Update viewport height for mobile browsers
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);

    // Update responsive elements
    updateResponsiveElements();

    // Adjust search input width on very small screens
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.classList.contains('search-input-expanded')) {
      if (window.innerWidth < 480) {
        searchInput.style.width = '180px';
      } else if (window.innerWidth < 768) {
        searchInput.style.width = '200px';
      }
    }
  }

  // Debounced resize handler for better performance
  let resizeTimeout;
  function debouncedResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResponsiveChanges, 150);
  }

  // Enhanced touch handling with better gesture recognition
  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && mobileMenu.classList.contains('active')) {
      const touchCurrentX = e.touches[0].clientX;
      const touchCurrentY = e.touches[0].clientY;
      const diffX = touchStartX - touchCurrentX;
      const diffY = Math.abs(touchStartY - touchCurrentY);
      const timeDiff = Date.now() - touchStartTime;

      // Close menu on swipe right (improved gesture detection)
      if (diffX < -80 && diffY < 50 && timeDiff < 500) {
        closeMobileMenu();
      }
    }
  }, { passive: true });

  // Enhanced double-tapprevention with better timing
  document.addEventListener('touchend', function(event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Improved event listeners
  window.addEventListener('orientationchange', handleResponsiveChanges);
  window.addEventListener('resize', debouncedResize);

  // Initialize responsive features
  document.addEventListener('DOMContentLoaded', function() {
    handleResponsiveChanges();
    updateResponsiveElements();

    // Add smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';

    // Optimize for touch devices
    if ('ontouchstart' in window) {
      document.body.classList.add('touch-device');
    }

    // Add focus management for better accessibility
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', function() {
      document.body.classList.remove('keyboard-navigation');
    });
  });

  // Enhanced loading states with responsive considerations
  function showResponsiveLoading() {
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
      const deviceType = getDeviceType();
      if (deviceType.includes('mobile')) {
        loadingDiv.style.fontSize = 'clamp(0.9rem, 2.5vw, 1rem)';
        loadingDiv.style.padding = '1.5rem';
      }
    }
  }

  // Enhanced error handling with responsive messages
  function showResponsiveError(message) {
    const errorDiv = document.getElementById('error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';

      const deviceType = getDeviceType();
      if (deviceType.includes('mobile')) {
        errorDiv.style.fontSize = 'clamp(0.85rem, 2vw, 0.95rem)';
        errorDiv.style.padding = '0.75rem';
        errorDiv.style.margin = '0.5rem 0';
      }
    }
  }

  // Update existing functions to use responsive utilities
  const originalShowError = window.showError;
  window.showError = function(message) {
    showResponsiveError(message);
  };

  // Enhanced notification system with responsive considerations
  function updateNotificationBadgeResponsive() {
    updateMobileNotificationBadge();

    const deviceType = getDeviceType();
    const badge = document.getElementById('notificationBadge');
    const mobileBadge = document.getElementById('mobileNotificationBadge');

    if (deviceType.includes('mobile')) {
      if (badge) badge.style.fontSize = '0.65rem';
      if (mobileBadge) mobileBadge.style.fontSize = '0.65rem';
    }
  }

  // Performance optimization for mobile devices
  if ('serviceWorker' in navigator && window.innerWidth < 768) {
    // Reduce animation complexity on mobile
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 767px) {
        * {
          animation-duration: 0.2s !important;
          transition-duration: 0.2s !important;
        }
      }
    `;
    document.head.appendChild(style);
  }