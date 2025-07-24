const CACHE_NAME = 'amlakone-v1.0.0';
const STATIC_CACHE = 'amlakone-static-v1.0.0';
const DYNAMIC_CACHE = 'amlakone-dynamic-v1.0.0';

// فایل‌های استاتیک که باید کش شوند
const STATIC_FILES = [
    '/',
    '/login',
    '/panel',
    '/create-profile',
    '/create-product',
    '/tickets',
    '/appointments',
    '/edit-profile',
    '/edit-product',
    '/public-products.html',
    '/public-product-details.html',
    '/product-details.html',
    '/css/common.css',
    '/css/login.css',
    '/css/panel.css',
    '/css/create-product.css',
    '/css/tickets.css',
    '/css/appointments.css',
    '/css/edit-profile.css',
    '/css/edit-product.css',
    '/css/public-products.css',
    '/css/public-product-details.css',
    '/css/product-details.css',
    '/js/common.js',
    '/js/login.js',
    '/js/panel.js',
    '/js/create-product.js',
    '/js/tickets.js',
    '/js/appointments.js',
    '/js/edit-profile.js',
    '/js/edit-product.js',
    '/js/public-products.js',
    '/js/public-product-details.js',
    '/js/product-details.js',
    '/js/products-filter.js',
    '/js/product-cache.js',
    '/js/pre-cache.js',
    '/js/smart-cache.js',
    '/manifest.json',
    '/offline.html'
];

// فایل‌های مهم که باید همیشه در دسترس باشند
const CRITICAL_FILES = [
    '/offline.html',
    '/css/common.css',
    '/js/common.js',
    '/js/pwa.js',
    '/manifest.json'
];

// فایل‌های API که باید کش شوند
const API_CACHE = [
    '/api/login/verify',
    '/api/create-profile',
    '/api/panel',
    '/api/product',
    '/api/panel-products',
    '/api/product-details',
    '/api/public-products',
    '/api/public-details',
    '/api/edit',
    '/api/products',
    '/api/edit-products',
    '/api/editor',
    '/api/tickets',
    '/api/admin/tickets',
    '/api/appointments',
    '/api/ticketing'
];

// نصب Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                // شروع پیش‌کش محصولات در پس‌زمینه
                return preCacheProductsInBackground();
            })
            .then(() => {
                console.log('Pre-caching completed');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Error during installation:', error);
                return self.skipWaiting();
            })
    );
});

// پیش‌کش محصولات در پس‌زمینه
async function preCacheProductsInBackground() {
    try {
        const activeUsers = ['a', 'Ali', 'alireza', 'masi', 'zii'];
        const preCache = await caches.open('amlakone-pre-cache-v1.0.0');
        
        for (const username of activeUsers) {
            try {
                // دریافت محصولات کاربر
                const response = await fetch(`/api/public-products/${username}`);
                if (response.ok) {
                    const products = await response.json();
                    
                    // کش کردن لیست محصولات
                    const productsListUrl = `/${username}/products`;
                    const productsListResponse = new Response(JSON.stringify(products), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                    await preCache.put(productsListUrl, productsListResponse);
                    
                    console.log(`Pre-cached ${products.length} products for ${username}`);
                    
                    // پیش‌کش جزئیات محصولات (حداکثر 3 محصول اول)
                    const productsToPreCache = products.slice(0, 3);
                    for (const product of productsToPreCache) {
                        try {
                            const detailResponse = await fetch(`/api/public-details/${username}/${product.id}`);
                            if (detailResponse.ok) {
                                const productDetail = await detailResponse.json();
                                const productDetailUrl = `/${username}/${product.id}`;
                                const productDetailResponse = new Response(JSON.stringify(productDetail), {
                                    headers: { 'Content-Type': 'application/json' }
                                });
                                await preCache.put(productDetailUrl, productDetailResponse);
                            }
                        } catch (error) {
                            console.error(`Error pre-caching product detail ${product.id}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error pre-caching products for ${username}:`, error);
            }
        }
    } catch (error) {
        console.error('Error in background pre-caching:', error);
    }
}

// فعال‌سازی Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// مدیریت درخواست‌ها
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // استراتژی کش برای فایل‌های استاتیک
    if (request.method === 'GET' && isStaticFile(request.url)) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    if (response) {
                        console.log('Serving from cache:', request.url);
                        return response;
                    }
                    
                    console.log('Fetching from network:', request.url);
                    return fetch(request)
                        .then((fetchResponse) => {
                            if (fetchResponse.status === 200) {
                                const responseClone = fetchResponse.clone();
                                caches.open(STATIC_CACHE)
                                    .then((cache) => {
                                        cache.put(request, responseClone);
                                        console.log('Cached:', request.url);
                                    });
                            }
                            return fetchResponse;
                        })
                        .catch((error) => {
                            console.log('Network failed, serving offline page:', request.url);
                            // در صورت عدم اتصال به اینترنت، صفحه آفلاین نمایش داده می‌شود
                            if (request.destination === 'document') {
                                return caches.match('/offline.html');
                            }
                            // برای سایر فایل‌ها، null برمی‌گردانیم
                            return null;
                        });
                })
        );
    }
    
    // استراتژی کش برای مسیرهای محصولات (Cache First + Network Fallback)
    else if (request.method === 'GET' && isProductRoute(request.url)) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        console.log('Serving product from cache:', request.url);
                        return cachedResponse;
                    }
                    
                    // بررسی پیش‌کش
                    return caches.open('amlakone-pre-cache-v1.0.0')
                        .then((preCache) => {
                            return preCache.match(request);
                        })
                        .then((preCachedResponse) => {
                            if (preCachedResponse) {
                                console.log('Serving product from pre-cache:', request.url);
                                return preCachedResponse;
                            }
                            
                            // بررسی کش هوشمند
                            return caches.open('amlakone-smart-cache-v1.0.0')
                                .then((smartCache) => {
                                    return smartCache.match(request);
                                })
                                .then((smartCachedResponse) => {
                                    if (smartCachedResponse) {
                                        console.log('Serving product from smart cache:', request.url);
                                        return smartCachedResponse;
                                    }
                                    
                                    console.log('Product not in cache, fetching from network:', request.url);
                                    return fetch(request)
                                        .then((fetchResponse) => {
                                            if (fetchResponse.status === 200) {
                                                const responseClone = fetchResponse.clone();
                                                caches.open(DYNAMIC_CACHE)
                                                    .then((cache) => {
                                                        cache.put(request, responseClone);
                                                        console.log('Cached product route:', request.url);
                                                    });
                                            }
                                            return fetchResponse;
                                        })
                                        .catch((error) => {
                                            console.log('Network failed for product route:', request.url);
                                            // اگر در کش نباشد و شبکه هم نباشد، صفحه آفلاین نمایش می‌دهیم
                                            return caches.match('/offline.html');
                                        });
                                });
                        });
                })
        );
    }
    
    // استراتژی کش برای API ها
    else if (request.method === 'GET' && isApiRequest(request.url)) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    if (response) {
                        // ابتدا از کش استفاده می‌کنیم
                        fetch(request)
                            .then((fetchResponse) => {
                                if (fetchResponse.status === 200) {
                                    const responseClone = fetchResponse.clone();
                                    caches.open(DYNAMIC_CACHE)
                                        .then((cache) => {
                                            cache.put(request, responseClone);
                                        });
                                }
                            })
                            .catch(() => {
                                // در صورت خطا، از کش استفاده می‌کنیم
                            });
                        return response;
                    }
                    
                    return fetch(request)
                        .then((fetchResponse) => {
                            if (fetchResponse.status === 200) {
                                const responseClone = fetchResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then((cache) => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return fetchResponse;
                        })
                        .catch(() => {
                            // در صورت عدم اتصال، پیام خطا برمی‌گردانیم
                            return new Response(
                                JSON.stringify({ error: 'عدم اتصال به اینترنت' }),
                                {
                                    status: 503,
                                    headers: { 'Content-Type': 'application/json' }
                                }
                            );
                        });
                })
        );
    }
    
    // استراتژی Network First برای درخواست‌های POST/PUT/DELETE
    else if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'عدم اتصال به اینترنت' }),
                        {
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
    }
});

// بررسی اینکه آیا فایل استاتیک است یا نه
function isStaticFile(url) {
    const staticExtensions = ['.html', '.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
    const urlObj = new URL(url);
    
    // مسیرهای اصلی که باید کش شوند
    const staticPaths = [
        '/', '/login', '/panel', '/create-profile', '/create-product', 
        '/tickets', '/appointments', '/edit-profile', '/edit-product',
        '/public-products', '/public-product-details', '/product-details'
    ];
    
    // اگر مسیر اصلی باشد
    if (staticPaths.includes(urlObj.pathname)) {
        return true;
    }
    
    // اگر مسیر محصولات باشد (مثل /username/products یا /username/123)
    if (urlObj.pathname.match(/^\/[^\/]+\/products$/) || urlObj.pathname.match(/^\/[^\/]+\/\d+$/)) {
        return true;
    }
    
    // بررسی پسوند فایل
    return staticExtensions.some(ext => urlObj.pathname.endsWith(ext));
}

// بررسی اینکه آیا درخواست API است یا نه
function isApiRequest(url) {
    const urlObj = new URL(url);
    return urlObj.pathname.startsWith('/api/');
}

// بررسی اینکه آیا مسیر محصولات است یا نه
function isProductRoute(url) {
    const urlObj = new URL(url);
    // مسیرهایی مثل /username/products یا /username/123
    return urlObj.pathname.match(/^\/[^\/]+\/products$/) || 
           urlObj.pathname.match(/^\/[^\/]+\/\d+$/) ||
           urlObj.pathname.match(/^\/[^\/]+\/\d+-n$/);
}

// مدیریت پیام‌های ارسالی از صفحه اصلی
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// مدیریت push notifications (برای آینده)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            },
            actions: [
                {
                    action: 'explore',
                    title: 'مشاهده',
                    icon: '/images/icons/icon-96x96.png'
                },
                {
                    action: 'close',
                    title: 'بستن',
                    icon: '/images/icons/icon-96x96.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// مدیریت کلیک روی notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/panel')
        );
    }
}); 