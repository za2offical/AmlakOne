// Stagewise toolbar initialization
// Only loads in development mode
(function() {
    // Check if we're in development mode
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port === '3000';
    
    if (isDevelopment) {
        // Dynamically import stagewise toolbar
        import('@stagewise/toolbar').then(({ initToolbar }) => {
            initToolbar({
                plugins: [],
            });
        }).catch(error => {
            console.warn('Stagewise toolbar could not be loaded:', error);
        });
    }
})(); 