// مدیریت کش محصولات برای کارکرد آفلاین
class ProductCacheManager {
    constructor() {
        this.cacheVersion = Date.now();
        this.cacheName = `amlakone-products-v${this.cacheVersion}`;
        this.cacheExpiryTime = 48 * 60 * 60 * 1000; // 48 ساعت
        this.init();
    }

    async init() {
        await this.checkCacheExpiry();
        
        // گوش دادن به تغییرات وضعیت اتصال
        window.addEventListener('online', () => {
            this.syncOfflineData();
        });
        
        // بررسی انقضای کش هر 6 ساعت
        setInterval(() => {
            this.checkCacheExpiry();
        }, 6 * 60 * 60 * 1000);
    }

    // بررسی انقضای کش
    async checkCacheExpiry() {
        try {
            const lastCacheTime = localStorage.getItem('product_cache_timestamp');
            const now = Date.now();
            
            if (lastCacheTime && (now - parseInt(lastCacheTime)) > this.cacheExpiryTime) {
                console.log('Product cache expired, clearing...');
                await this.clearProductCache();
                localStorage.setItem('product_cache_timestamp', now.toString());
            } else if (!lastCacheTime) {
                localStorage.setItem('product_cache_timestamp', now.toString());
            }
        } catch (error) {
            console.error('Error checking product cache expiry:', error);
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

                // کش کردن جزئیات هر محصول
                for (const product of products) {
                    const productDetailUrl = `/${username}/${product.id}`;
                    const productDetailResponse = new Response(JSON.stringify(product), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    await cache.put(productDetailUrl, productDetailResponse);
                }

                console.log(`Cached ${products.length} products for ${username}`);
                return true;
            } catch (error) {
                console.error('Error caching products:', error);
                return false;
            }
        }
        return false;
    }

    // دریافت محصولات از کش
    async getCachedProducts(username) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productsListUrl = `/${username}/products`;
                const response = await cache.match(productsListUrl);
                
                if (response) {
                    const products = await response.json();
                    console.log(`Retrieved ${products.length} cached products for ${username}`);
                    return products;
                }
            } catch (error) {
                console.error('Error retrieving cached products:', error);
            }
        }
        return null;
    }

    // دریافت جزئیات محصول از کش
    async getCachedProductDetail(username, productId) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const response = await cache.match(productDetailUrl);
                
                if (response) {
                    const product = await response.json();
                    console.log(`Retrieved cached product detail: ${productId}`);
                    return product;
                }
            } catch (error) {
                console.error('Error retrieving cached product detail:', error);
            }
        }
        return null;
    }

    // بررسی وجود محصول در کش
    async hasCachedProduct(username, productId) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const productDetailUrl = `/${username}/${productId}`;
                const response = await cache.match(productDetailUrl);
                return !!response;
            } catch (error) {
                console.error('Error checking cached product:', error);
            }
        }
        return false;
    }

    // پاک کردن کش محصولات
    async clearProductCache() {
        if ('caches' in window) {
            try {
                await caches.delete(this.cacheName);
                console.log('Product cache cleared');
                return true;
            } catch (error) {
                console.error('Error clearing product cache:', error);
                return false;
            }
        }
        return false;
    }

    // همگام‌سازی داده‌های آفلاین
    async syncOfflineData() {
        // این تابع می‌تواند برای همگام‌سازی تغییرات آفلاین استفاده شود
        console.log('Syncing offline data...');
    }

    // نمایش وضعیت کش
    async getCacheStatus() {
        if ('caches' in window) {
            try {
                const cache = await caches.open(this.cacheName);
                const keys = await cache.keys();
                return {
                    name: this.cacheName,
                    itemCount: keys.length,
                    size: 'Unknown' // اندازه دقیق کش قابل محاسبه نیست
                };
            } catch (error) {
                console.error('Error getting cache status:', error);
                return null;
            }
        }
        return null;
    }
}

// ایجاد نمونه از ProductCacheManager
const productCache = new ProductCacheManager();

// اضافه کردن به window برای دسترسی جهانی
window.productCache = productCache;

// تابع کمکی برای کش کردن محصولات
window.cacheProducts = async (username, products) => {
    return await productCache.cacheProducts(username, products);
};

// تابع کمکی برای دریافت محصولات از کش
window.getCachedProducts = async (username) => {
    return await productCache.getCachedProducts(username);
};

// تابع کمکی برای دریافت جزئیات محصول از کش
window.getCachedProductDetail = async (username, productId) => {
    return await productCache.getCachedProductDetail(username, productId);
}; 