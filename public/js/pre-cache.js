// سیستم پیش‌کش محصولات
class PreCacheManager {
    constructor() {
        this.cacheName = 'amlakone-pre-cache-v1.0.0';
        this.init();
    }

    async init() {
        // گوش دادن به تغییرات وضعیت اتصال
        window.addEventListener('online', () => {
            this.preCachePopularProducts();
        });

        // شروع خودکار پیش‌کش در بارگذاری صفحه
        this.autoStartPreCaching();
        
        // پیش‌کش در پس‌زمینه هر 30 دقیقه
        setInterval(() => {
            this.autoStartPreCaching();
        }, 30 * 60 * 1000); // 30 دقیقه
    }

    // شروع خودکار پیش‌کش
    async autoStartPreCaching() {
        if (!navigator.onLine) return;

        try {
            // بررسی اینکه آیا قبلاً پیش‌کش شده یا نه
            const status = await this.getPreCacheStatus();
            if (status && status.itemCount > 0) {
                console.log('Pre-cache already exists, skipping auto pre-caching');
                return;
            }

            console.log('Starting auto pre-caching...');
            await this.preCachePopularProducts();
        } catch (error) {
            console.error('Auto pre-caching error:', error);
        }
    }

    // پیش‌کش محصولات محبوب
    async preCachePopularProducts() {
        if (!navigator.onLine) return;

        try {
            // دریافت لیست کاربران فعال
            const activeUsers = await this.getActiveUsers();
            
            for (const username of activeUsers) {
                await this.preCacheUserProducts(username);
            }
        } catch (error) {
            console.error('Error pre-caching products:', error);
        }
    }

    // دریافت کاربران فعال
    async getActiveUsers() {
        try {
            // این تابع می‌تواند از API دریافت شود
            // فعلاً یک لیست نمونه برمی‌گردانیم
            return ['a', 'Ali', 'alireza', 'masi', 'zii'];
        } catch (error) {
            console.error('Error getting active users:', error);
            return [];
        }
    }

    // پیش‌کش محصولات یک کاربر
    async preCacheUserProducts(username) {
        try {
            // دریافت محصولات کاربر
            const response = await fetch(`/api/public-products/${username}`);
            if (response.ok) {
                const products = await response.json();
                
                // کش کردن محصولات
                await this.cacheProducts(username, products);
                
                // پیش‌کش جزئیات محصولات (حداکثر 5 محصول اول)
                const productsToPreCache = products.slice(0, 5);
                for (const product of productsToPreCache) {
                    await this.preCacheProductDetail(username, product.id);
                }
            }
        } catch (error) {
            console.error(`Error pre-caching products for ${username}:`, error);
        }
    }

    // کش کردن محصولات
    async cacheProducts(username, products) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                
                // کش کردن لیست محصولات
                const productsListUrl = `/${username}/products`;
                const productsListResponse = new Response(JSON.stringify(products), {
                    headers: { 'Content-Type': 'application/json' }
                });
                await cache.put(productsListUrl, productsListResponse);
                
                console.log(`Pre-cached ${products.length} products for ${username}`);
            } catch (error) {
                console.error('Error caching products:', error);
            }
        }
    }

    // پیش‌کش جزئیات محصول
    async preCacheProductDetail(username, productId) {
        try {
            const response = await fetch(`/api/public-details/${username}/${productId}`);
            if (response.ok) {
                const product = await response.json();
                await this.cacheProductDetail(username, productId, product);
            }
        } catch (error) {
            console.error(`Error pre-caching product detail ${productId}:`, error);
        }
    }

    // کش کردن جزئیات محصول
    async cacheProductDetail(username, productId, product) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const productDetailResponse = new Response(JSON.stringify(product), {
                    headers: { 'Content-Type': 'application/json' }
                });
                await cache.put(productDetailUrl, productDetailResponse);
                
                console.log(`Pre-cached product detail: ${productId}`);
            } catch (error) {
                console.error('Error caching product detail:', error);
            }
        }
    }

    // بررسی وجود محصول در پیش‌کش
    async hasPreCachedProduct(username, productId) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const response = await cache.match(productDetailUrl);
                return !!response;
            } catch (error) {
                console.error('Error checking pre-cached product:', error);
            }
        }
        return false;
    }

    // دریافت محصول از پیش‌کش
    async getPreCachedProduct(username, productId) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const response = await cache.match(productDetailUrl);
                
                if (response) {
                    const product = await response.json();
                    console.log(`Retrieved pre-cached product: ${productId}`);
                    return product;
                }
            } catch (error) {
                console.error('Error retrieving pre-cached product:', error);
            }
        }
        return null;
    }

    // پاک کردن پیش‌کش
    async clearPreCache() {
        if ('caches' in window) {
            try {
                await caches.delete(this.cacheName);
                console.log('Pre-cache cleared');
                return true;
            } catch (error) {
                console.error('Error clearing pre-cache:', error);
                return false;
            }
        }
        return false;
    }

    // نمایش وضعیت پیش‌کش
    async getPreCacheStatus() {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const keys = await cache.keys();
                return {
                    name: this.cacheName,
                    itemCount: keys.length,
                    items: keys.map(key => key.url)
                };
            } catch (error) {
                console.error('Error getting pre-cache status:', error);
                return null;
            }
        }
        return null;
    }
}

// ایجاد نمونه از PreCacheManager
const preCacheManager = new PreCacheManager();

// اضافه کردن به window برای دسترسی جهانی
window.preCacheManager = preCacheManager;

// تابع کمکی برای شروع پیش‌کش
window.startPreCaching = () => {
    preCacheManager.preCachePopularProducts();
};

// تابع کمکی برای بررسی وضعیت پیش‌کش
window.getPreCacheStatus = async () => {
    return await preCacheManager.getPreCacheStatus();
};

// تابع کمکی برای پاک کردن پیش‌کش
window.clearPreCache = async () => {
    return await preCacheManager.clearPreCache();
}; 