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
const signupRouter = require('./modules/signup'); // Added signup router

const app = express();
const port = 3000;

// Trust proxy برای rate limiting در محیط production
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/profile-img', express.static(path.join(__dirname, 'data', 'profile-img')));

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
app.use('/api/auth', require('./modules/auth').router);
app.use('/api/login', loginRouter);
app.use('/api/signup', signupRouter);
app.use('/api/panel', panelRouter);
app.use('/api/product', productRouter);
app.use('/api/edit', editRouter);
app.use('/api/products', showProductsPublicRouter);
app.use('/api/product-details', showProductNRouter);
app.use('/api/create-profile', createProfileRouter);
app.use('/api/ticketing', ticketingRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/requests-3d', require('./modules/requests-3d'));
app.use('/api/admin-tickets', adminTicketsRouter);
app.use('/api/editor', editorRouter);
app.use('/api/plans', require('./modules/plans').router);

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

// مسیرهای عمومی
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحه دانلود PWA
app.get('/download', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'download.html'));
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});