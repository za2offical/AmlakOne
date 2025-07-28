// سیستم کش هوشمند بر اساس رفتار کاربر
class SmartCacheManager {
    constructor() {
        this.cacheVersion = Date.now();
        this.cacheName = `amlakone-smart-cache-v${this.cacheVersion}`;
        this.userBehavior = {};
        this.cacheExpiryTime = 48 * 60 * 60 * 1000; // 48 ساعت
        this.init();
    }

    async init() {
        await this.checkCacheExpiry();
        this.loadUserBehavior();
        this.setupEventListeners();
        this.startSmartCaching();
        
        // بررسی انقضای کش هر 6 ساعت
        setInterval(() => {
            this.checkCacheExpiry();
        }, 6 * 60 * 60 * 1000);
    }

    // بررسی انقضای کش
    async checkCacheExpiry() {
        try {
            const lastCacheTime = localStorage.getItem('smart_cache_timestamp');
            const now = Date.now();
            
            if (lastCacheTime && (now - parseInt(lastCacheTime)) > this.cacheExpiryTime) {
                console.log('Smart cache expired, clearing...');
                await this.clearSmartCache();
                localStorage.setItem('smart_cache_timestamp', now.toString());
            } else if (!lastCacheTime) {
                localStorage.setItem('smart_cache_timestamp', now.toString());
            }
        } catch (error) {
            console.error('Error checking smart cache expiry:', error);
        }
    }

    // بارگذاری رفتار کاربر از localStorage
    loadUserBehavior() {
        try {
            const saved = localStorage.getItem('amlakone_user_behavior');
            if (saved) {
                this.userBehavior = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading user behavior:', error);
        }
    }

    // ذخیره رفتار کاربر در localStorage
    saveUserBehavior() {
        try {
            localStorage.setItem('amlakone_user_behavior', JSON.stringify(this.userBehavior));
        } catch (error) {
            console.error('Error saving user behavior:', error);
        }
    }

    // تنظیم گوش دادن به رویدادها
    setupEventListeners() {
        // گوش دادن به کلیک روی محصولات
        document.addEventListener('click', (event) => {
            const productLink = event.target.closest('a[href*="/products"]');
            if (productLink) {
                this.recordProductView(productLink.href);
            }
        });

        // گوش دادن به تغییر مسیر
        window.addEventListener('popstate', () => {
            this.recordPageView(window.location.pathname);
        });

        // گوش دادن به بارگذاری صفحه
        window.addEventListener('load', () => {
            this.recordPageView(window.location.pathname);
        });
    }

    // ثبت مشاهده محصول
    recordProductView(url) {
        const path = new URL(url).pathname;
        const username = path.split('/')[1];
        const productId = path.split('/')[2];

        if (!this.userBehavior[username]) {
            this.userBehavior[username] = {
                viewCount: 0,
                products: {},
                lastVisit: Date.now()
            };
        }

        this.userBehavior[username].viewCount++;
        this.userBehavior[username].lastVisit = Date.now();

        if (!this.userBehavior[username].products[productId]) {
            this.userBehavior[username].products[productId] = 0;
        }
        this.userBehavior[username].products[productId]++;

        this.saveUserBehavior();
        this.scheduleSmartCaching();
    }

    // ثبت مشاهده صفحه
    recordPageView(pathname) {
        if (pathname.includes('/products')) {
            const username = pathname.split('/')[1];
            if (!this.userBehavior[username]) {
                this.userBehavior[username] = {
                    viewCount: 0,
                    products: {},
                    lastVisit: Date.now()
                };
            }
            this.userBehavior[username].viewCount++;
            this.userBehavior[username].lastVisit = Date.now();
            this.saveUserBehavior();
        }
    }

    // شروع کش هوشمند
    async startSmartCaching() {
        if (!navigator.onLine) return;

        try {
            // کش کردن محصولات محبوب بر اساس رفتار کاربر
            await this.cachePopularProducts();
            
            // کش کردن محصولات مرتبط
            await this.cacheRelatedProducts();
        } catch (error) {
            console.error('Smart caching error:', error);
        }
    }

    // کش کردن محصولات محبوب
    async cachePopularProducts() {
        const popularUsers = this.getPopularUsers();
        
        for (const username of popularUsers) {
            await this.cacheUserProducts(username);
        }
    }

    // کش کردن محصولات مرتبط
    async cacheRelatedProducts() {
        const currentUser = this.getCurrentUserFromPath();
        if (currentUser && this.userBehavior[currentUser]) {
            const popularProducts = this.getPopularProducts(currentUser);
            
            for (const productId of popularProducts) {
                await this.cacheProductDetail(currentUser, productId);
            }
        }
    }

    // دریافت کاربران محبوب
    getPopularUsers() {
        const users = Object.keys(this.userBehavior);
        return users
            .sort((a, b) => this.userBehavior[b].viewCount - this.userBehavior[a].viewCount)
            .slice(0, 3); // 3 کاربر محبوب
    }

    // دریافت محصولات محبوب یک کاربر
    getPopularProducts(username) {
        if (!this.userBehavior[username]) return [];
        
        const products = Object.keys(this.userBehavior[username].products);
        return products
            .sort((a, b) => 
                this.userBehavior[username].products[b] - this.userBehavior[username].products[a]
            )
            .slice(0, 5); // 5 محصول محبوب
    }

    // دریافت کاربر فعلی از مسیر
    getCurrentUserFromPath() {
        const path = window.location.pathname;
        const parts = path.split('/');
        return parts.length > 1 ? parts[1] : null;
    }

    // کش کردن محصولات کاربر
    async cacheUserProducts(username) {
        try {
            const response = await fetch(`/api/public-products/${username}`);
            if (response.ok) {
                const products = await response.json();
                await this.cacheProducts(username, products);
            }
        } catch (error) {
            console.error(`Error caching products for ${username}:`, error);
        }
    }

    // کش کردن محصولات
    async cacheProducts(username, products) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productsListUrl = `/${username}/products`;
                const productsListResponse = new Response(JSON.stringify(products), {
                    headers: { 'Content-Type': 'application/json' }
                });
                await cache.put(productsListUrl, productsListResponse);
            } catch (error) {
                console.error('Error caching products:', error);
            }
        }
    }

    // کش کردن جزئیات محصول
    async cacheProductDetail(username, productId) {
        try {
            const response = await fetch(`/api/public-details/${username}/${productId}`);
            if (response.ok) {
                const product = await response.json();
                await this.cacheProductDetailResponse(username, productId, product);
            }
        } catch (error) {
            console.error(`Error caching product detail ${productId}:`, error);
        }
    }

    // کش کردن پاسخ جزئیات محصول
    async cacheProductDetailResponse(username, productId, product) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const productDetailResponse = new Response(JSON.stringify(product), {
                    headers: { 'Content-Type': 'application/json' }
                });
                await cache.put(productDetailUrl, productDetailResponse);
            } catch (error) {
                console.error('Error caching product detail response:', error);
            }
        }
    }

    // برنامه‌ریزی کش هوشمند
    scheduleSmartCaching() {
        // کش هوشمند با تأخیر 5 ثانیه
        setTimeout(() => {
            this.startSmartCaching();
        }, 5000);
    }

    // دریافت محصول از کش هوشمند
    async getSmartCachedProduct(username, productId) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const response = await cache.match(productDetailUrl);
                
                if (response) {
                    const product = await response.json();
                    return product;
                }
            } catch (error) {
                console.error('Error retrieving smart cached product:', error);
            }
        }
        return null;
    }

    // دریافت محصولات از کش هوشمند
    async getSmartCachedProducts(username) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productsListUrl = `/${username}/products`;
                const response = await cache.match(productsListUrl);
                
                if (response) {
                    const products = await response.json();
                    return products;
                }
            } catch (error) {
                console.error('Error retrieving smart cached products:', error);
            }
        }
        return null;
    }

    // پاک کردن کش هوشمند
    async clearSmartCache() {
        if ('caches' in window) {
            try {
                await caches.delete(this.cacheName);
                return true;
            } catch (error) {
                console.error('Error clearing smart cache:', error);
                return false;
            }
        }
        return false;
    }

    // دریافت آمار رفتار کاربر
    getUserBehaviorStats() {
        return {
            totalUsers: Object.keys(this.userBehavior).length,
            totalViews: Object.values(this.userBehavior).reduce((sum, user) => sum + user.viewCount, 0),
            popularUsers: this.getPopularUsers(),
            behavior: this.userBehavior
        };
    }
}

// ایجاد نمونه از SmartCacheManager
const smartCache = new SmartCacheManager();

// اضافه کردن به window برای دسترسی جهانی
window.smartCache = smartCache;

// تابع کمکی برای دریافت محصول از کش هوشمند
window.getSmartCachedProduct = async (username, productId) => {
    return await smartCache.getSmartCachedProduct(username, productId);
};

// تابع کمکی برای دریافت محصولات از کش هوشمند
window.getSmartCachedProducts = async (username) => {
    return await smartCache.getSmartCachedProducts(username);
};

// تابع کمکی برای دریافت آمار رفتار کاربر
window.getUserBehaviorStats = () => {
    return smartCache.getUserBehaviorStats();
}; 