const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const editorRouter = require('./modules/editor');
const loginRouter = require('./modules/login');
const panelRouter = require('./modules/panel');
const createProfileRouter = require('./modules/create-profile');
const showProductPanelRouter = require('./modules/show-product-panel');
const showProductNRouter = require('./modules/show-product-n');
const showProductsPublicRouter = require('./modules/show-products-public');
const showPublicDetailsRouter = require('./modules/show-public-details');
const editProductsRouter = require('./modules/edit-products');
const editRouter = require('./modules/edit');
const productRouter = require('./modules/product');
const ticketsRouter = require('./modules/tickets');
const adminTicketsRouter = require('./modules/admin-tickets');
const appointmentsRouter = require('./modules/appointments');
const ticketingRouter = require('./modules/ticketing');

const app = express();
const port = process.env.PORT || 3000;

// Trust proxy برای rate limiting در محیط production
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/profile-img', express.static(path.join(__dirname, 'data', 'profile-img')));

// Serve static files from public3D directory for 3D viewer
app.use(express.static(path.join(__dirname, 'public3D')));

// PWA Routes
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.get('/browserconfig.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(path.join(__dirname, 'public', 'browserconfig.xml'));
});

// Routes
app.use('/api/login', loginRouter);
app.use('/api/create-profile', createProfileRouter);
app.use('/api/panel', panelRouter);
app.use('/api/product', productRouter);
app.use('/api/panel-products', showProductPanelRouter);
app.use('/api/product-details', showProductNRouter);
app.use('/api/public-products', showProductsPublicRouter);
app.use('/api/public-details', showPublicDetailsRouter);
app.use('/api/edit', editRouter);
app.use('/api/products', editProductsRouter);
app.use('/api/edit-products', editProductsRouter);
app.use('/api/editor', editorRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/admin/tickets', adminTicketsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/ticketing', ticketingRouter);
app.use('/api/requests-3d', require('./modules/requests-3d'));

// API endpoint for uploading custom JSON data (from server.js)
app.post('/api/upload-json', (req, res) => {
    try {
        const { jsonData } = req.body;
        
        if (!jsonData) {
            return res.status(400).json({ 
                success: false, 
                message: 'No JSON data provided' 
            });
        }

        // Validate JSON structure
        if (!jsonData.walls || !Array.isArray(jsonData.walls)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid JSON format: walls array required' 
            });
        }

        res.json({ 
            success: true, 
            message: 'JSON data received successfully',
            data: jsonData
        });
    } catch (error) {
        console.error('Error processing JSON upload:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error processing JSON data' 
        });
    }
});

// Serve HTML files
app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/panel', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

app.get('/create-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-profile.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public3D', 'index.html'));
});

app.get('/edit-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit-profile.html'));
});

app.get('/create-product', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-product.html'));
});

app.get('/tickets', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tickets.html'));
});

app.get('/admin-tickets', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-tickets.html'));
});

app.get('/appointments', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'appointments.html'));
});

app.get('/requests-3d', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'requests-3d.html'));
});

// 3D House Viewer route
app.get('/3d-viewer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public3D', 'index.html'));
});

// Health check endpoint for 3D viewer
app.get('/3d/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/edit-product', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'edit-product.html'));
});

app.get('/:username/:productId-n', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'product-details.html'));
});

app.get('/:username/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'public-products.html'));
});

app.get('/:username/:productId', (req, res) => {
    // بررسی اینکه productId فقط عدد باشد (برای تمایز با سایر مسیرها)
    if (/^\d+$/.test(req.params.productId)) {
        res.sendFile(path.join(__dirname, 'public', 'public-product-details.html'));
    } else {
        res.status(404).send('Not Found');
    }
});

app.get('/pwa-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pwa-test.html'));
});

app.get('/pre-cache-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pre-cache-test.html'));
});

app.get('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'page-not-found.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🏠 Main server running at http://localhost:${port}`);
    console.log(`🌐 3D House Viewer accessible at http://localhost:${port}/3d-viewer`);
    console.log('📁 Serving 3D files from public3D/ directory');
    console.log('🔗 Server accessible on all network interfaces');
});