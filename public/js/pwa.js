// PWA Management Script
class PWAManager {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.registerServiceWorker();
        this.checkForUpdates();
        this.setupInstallPrompt();
    }

    setupEventListeners() {
        // گوش دادن به تغییرات وضعیت اتصال
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('اتصال به اینترنت برقرار شد', 'success');
            this.updateOnlineStatus();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('اتصال به اینترنت قطع شد', 'warning');
            this.updateOnlineStatus();
        });

        // گوش دادن به تغییرات visibility
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkForUpdates();
            }
        });
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully:', this.swRegistration);

                // گوش دادن به تغییرات Service Worker
                this.swRegistration.addEventListener('updatefound', () => {
                    const newWorker = this.swRegistration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateNotification();
                        }
                    });
                });

                // گوش دادن به پیام‌های Service Worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'CACHE_UPDATED') {
                        this.showNotification('کش به‌روزرسانی شد', 'info');
                    }
                });

            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    checkForUpdates() {
        if (this.swRegistration) {
            this.swRegistration.update();
        }
    }

    showUpdateNotification() {
        const updateNotification = document.createElement('div');
        updateNotification.className = 'pwa-update-notification';
        updateNotification.innerHTML = `
            <div class="update-content">
                <span>نسخه جدیدی از برنامه در دسترس است</span>
                <div class="update-actions">
                    <button class="update-btn" onclick="pwaManager.updateApp()">به‌روزرسانی</button>
                    <button class="dismiss-btn" onclick="this.parentElement.parentElement.parentElement.remove()">بعداً</button>
                </div>
            </div>
        `;

        // اضافه کردن استایل‌های CSS
        if (!document.getElementById('pwa-update-styles')) {
            const style = document.createElement('style');
            style.id = 'pwa-update-styles';
            style.textContent = `
                .pwa-update-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #2563eb;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 300px;
                    animation: slideIn 0.3s ease-out;
                }
                
                .update-content {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .update-actions {
                    display: flex;
                    gap: 10px;
                }
                
                .update-btn, .dismiss-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .update-btn {
                    background: #10b981;
                    color: white;
                }
                
                .dismiss-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(updateNotification);

        // حذف خودکار بعد از 10 ثانیه
        setTimeout(() => {
            if (updateNotification.parentElement) {
                updateNotification.remove();
            }
        }, 10000);
    }

    async updateApp() {
        if (this.swRegistration && this.swRegistration.waiting) {
            this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // گوش دادن به تغییرات
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }

    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            window.deferredPrompt = deferredPrompt;
            this.scheduleInstallPrompt();
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.showNotification('برنامه با موفقیت نصب شد', 'success');
            // پاک کردن تایمر نصب
            localStorage.removeItem('install_prompt_timer');
        });

        // بررسی تایمر موجود در بارگذاری صفحه
        this.checkInstallPromptTimer();
    }

    // بررسی و برنامه‌ریزی پیام نصب
    checkInstallPromptTimer() {
        const lastPromptTime = localStorage.getItem('last_install_prompt');
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 ساعت

        if (!lastPromptTime || (now - parseInt(lastPromptTime)) >= twentyFourHours) {
            // اگر 24 ساعت گذشته یا اولین بار است
            setTimeout(() => {
                this.showInstallPrompt();
                localStorage.setItem('last_install_prompt', now.toString());
            }, 5000); // 5 ثانیه بعد از بارگذاری صفحه
        }
    }

    // برنامه‌ریزی پیام نصب هر 24 ساعت
    scheduleInstallPrompt() {
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 ساعت
        
        // تنظیم تایمر برای نمایش پیام هر 24 ساعت
        setInterval(() => {
            this.showInstallPrompt();
            localStorage.setItem('last_install_prompt', Date.now().toString());
        }, twentyFourHours);
    }

    showInstallPrompt() {
        const installNotification = document.createElement('div');
        installNotification.className = 'pwa-install-notification';
        installNotification.innerHTML = `
            <div class="install-content">
                <span>این برنامه را روی دستگاه خود نصب کنید</span>
                <div class="install-actions">
                    <button class="install-btn" onclick="pwaManager.installApp()">نصب مستقیم</button>
                    <button class="download-btn" onclick="pwaManager.goToDownloadPage()">صفحه دانلود</button>
                    <button class="dismiss-btn" onclick="this.parentElement.parentElement.parentElement.remove()">بعداً</button>
                </div>
            </div>
        `;

        // اضافه کردن استایل‌های CSS
        if (!document.getElementById('pwa-install-styles')) {
            const style = document.createElement('style');
            style.id = 'pwa-install-styles';
            style.textContent = `
                .pwa-install-notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #059669;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    max-width: 300px;
                    animation: slideInUp 0.3s ease-out;
                }
                
                .install-content {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .install-actions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                
                .install-btn, .download-btn, .dismiss-btn {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    flex: 1;
                    min-width: 80px;
                }
                
                .install-btn {
                    background: #ffffff;
                    color: #059669;
                }
                
                .download-btn {
                    background: #3b82f6;
                    color: white;
                }
                
                .dismiss-btn {
                    background: rgba(255,255,255,0.2);
                    color: white;
                }
                
                @keyframes slideInUp {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(installNotification);

        // حذف خودکار بعد از 15 ثانیه
        setTimeout(() => {
            if (installNotification.parentElement) {
                installNotification.remove();
            }
        }, 15000);
    }

    async installApp() {
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            window.deferredPrompt = null;
            
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
            } else {
                console.log('User dismissed the install prompt');
            }
        }
    }

    goToDownloadPage() {
        // هدایت به صفحه دانلود
        window.location.href = '/download';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `pwa-notification pwa-notification-${type}`;
        notification.textContent = message;

        // اضافه کردن استایل‌های CSS
        if (!document.getElementById('pwa-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'pwa-notification-styles';
            style.textContent = `
                .pwa-notification {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    padding: 12px 20px;
                    border-radius: 6px;
                    color: white;
                    font-size: 14px;
                    z-index: 10001;
                    animation: slideInLeft 0.3s ease-out;
                    max-width: 300px;
                }
                
                .pwa-notification-success {
                    background: #10b981;
                }
                
                .pwa-notification-warning {
                    background: #f59e0b;
                }
                
                .pwa-notification-error {
                    background: #ef4444;
                }
                
                .pwa-notification-info {
                    background: #3b82f6;
                }
                
                @keyframes slideInLeft {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // حذف خودکار بعد از 3 ثانیه
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    updateOnlineStatus() {
        const statusElement = document.getElementById('online-status');
        if (statusElement) {
            statusElement.textContent = this.isOnline ? 'آنلاین' : 'آفلاین';
            statusElement.className = this.isOnline ? 'online' : 'offline';
        }
    }

    // دریافت اطلاعات کش
    async getCacheInfo() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            const cacheInfo = {};
            
            for (const cacheName of cacheNames) {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                cacheInfo[cacheName] = requests.length;
            }
            
            return cacheInfo;
        }
        return null;
    }

    // پاک کردن کش
    async clearCache() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            this.showNotification('کش با موفقیت پاک شد', 'success');
        }
    }
}

// ایجاد نمونه از PWA Manager
const pwaManager = new PWAManager();

// اضافه کردن به window برای دسترسی جهانی
window.pwaManager = pwaManager; 