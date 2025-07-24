// Common JavaScript for all pages
// This file is included in all HTML pages to ensure stagewise toolbar is available

// Load stagewise toolbar in development mode
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port === '3000';
    
    if (isDevelopment) {
        // Load stagewise initialization script
        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/js/stagewise-init.js';
        script.onerror = function() {
            console.warn('Stagewise toolbar script could not be loaded');
        };
        document.head.appendChild(script);
    }
}); 