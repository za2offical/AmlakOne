const express = require('express');
const { authenticateToken } = require('./auth');
const { 
    createProduct, 
    getProductsByUser, 
    getProductById, 
    updateProduct, 
    deleteProduct 
} = require('./database');

const router = express.Router();

// ایجاد محصول جدید
router.post('/', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const productData = {
            id: Date.now().toString(),
            ...req.body
        };

        await createProduct(username, productData);

        res.json({ 
            message: 'محصول با موفقیت ایجاد شد',
            productId: productData.id
        });
    } catch (error) {
        console.error('خطا در ایجاد محصول:', error);
        res.status(500).json({ 
            error: 'خطا در ایجاد محصول',
            details: error.message 
        });
    }
});

// دریافت محصولات کاربر
router.get('/user', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const products = await getProductsByUser(username);

        res.json({ products });
    } catch (error) {
        console.error('خطا در دریافت محصولات:', error);
        res.status(500).json({ 
            error: 'خطا در دریافت محصولات',
            details: error.message 
        });
    }
});

// دریافت جزئیات محصول
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await getProductById(productId);

        if (!product) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        res.json({ product });
    } catch (error) {
        console.error('خطا در دریافت محصول:', error);
        res.status(500).json({ 
            error: 'خطا در دریافت محصول',
            details: error.message 
        });
    }
});

// به‌روزرسانی محصول
router.put('/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const username = req.user.username;

        // بررسی مالکیت محصول
        const product = await getProductById(productId);
        if (!product) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        if (product.username !== username) {
            return res.status(403).json({ error: 'شما مجاز به ویرایش این محصول نیستید' });
        }

        await updateProduct(productId, req.body);

        res.json({ message: 'محصول با موفقیت به‌روزرسانی شد' });
    } catch (error) {
        console.error('خطا در به‌روزرسانی محصول:', error);
        res.status(500).json({ 
            error: 'خطا در به‌روزرسانی محصول',
            details: error.message 
        });
    }
});

// حذف محصول
router.delete('/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;
        const username = req.user.username;

        // بررسی مالکیت محصول
        const product = await getProductById(productId);
        if (!product) {
            return res.status(404).json({ error: 'محصول یافت نشد' });
        }

        if (product.username !== username) {
            return res.status(403).json({ error: 'شما مجاز به حذف این محصول نیستید' });
        }

        await deleteProduct(productId);

        res.json({ message: 'محصول با موفقیت حذف شد' });
    } catch (error) {
        console.error('خطا در حذف محصول:', error);
        res.status(500).json({ 
            error: 'خطا در حذف محصول',
            details: error.message 
        });
    }
});

module.exports = router;