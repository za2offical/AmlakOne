// Service Worker ساده شده - فقط احراز هویت
const CACHE_NAME = 'amlakone-auth-only';
const AUTH_FILES = [
    '/login.html',
    '/css/login.css',
    '/js/common.js',
    '/manifest.json'
];

// نصب Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker installing (auth only)...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching auth files only...');
                return cache.addAll(AUTH_FILES);
            })
            .then(() => {
                console.log('Auth files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Error during installation:', error);
                return self.skipWaiting();
            })
    );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating (auth only)...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated (auth only)');
                return self.clients.claim();
            })
    );
});

// مدیریت درخواست‌ها - فقط برای احراز هویت
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // فقط فایل‌های احراز هویت کش می‌شوند
    if (request.method === 'GET' && isAuthFile(request.url)) {
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    if (response) {
                        return response;
                    }

                    return fetch(request)
                        .then((fetchResponse) => {
                            if (fetchResponse.status === 200) {
                                const responseClone = fetchResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(request, responseClone);
                                    });
                            }
                            return fetchResponse;
                        });
                })
        );
    }

    // سایر درخواست‌ها مستقیماً از شبکه
    else {
        event.respondWith(fetch(request));
    }
});

// بررسی فایل‌های احراز هویت
function isAuthFile(url) {
    const urlObj = new URL(url);
    return AUTH_FILES.some(file => urlObj.pathname.endsWith(file) || urlObj.pathname === file);
}