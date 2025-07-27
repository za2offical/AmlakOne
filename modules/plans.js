const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { 
    createPlan, 
    getPlanById, 
    updatePlan, 
    deletePlan, 
    getAllPlans,
    get3DDataByKey,
    upsert3DData,
    getAll3DData
} = require('./database');

// دریافت تمام پلن‌ها
router.get('/', authenticateToken, async (req, res) => {
    try {
        const plans = await getAllPlans();
        res.json(plans || []);
    } catch (error) {
        console.error('خطا در دریافت پلن‌ها:', error);
        res.status(500).json({ error: 'خطا در دریافت پلن‌ها' });
    }
});

// دریافت پلن خاص
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const plan = await getPlanById(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'پلن یافت نشد' });
        }
        res.json(plan);
    } catch (error) {
        console.error('خطا در دریافت پلن:', error);
        res.status(500).json({ error: 'خطا در دریافت پلن' });
    }
});

// ایجاد پلن جدید
router.post('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const planData = {
            id: req.body.id || Date.now().toString(),
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            features: req.body.features || [],
            duration: req.body.duration,
            isActive: req.body.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await createPlan(planData);

        res.status(201).json({
            success: true,
            message: 'پلن با موفقیت ایجاد شد',
            plan: planData
        });
    } catch (error) {
        console.error('خطا در ایجاد پلن:', error);
        res.status(500).json({ error: 'خطا در ایجاد پلن' });
    }
});

// به‌روزرسانی پلن
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const planId = req.params.id;
        const updateData = { ...req.body };

        // حذف فیلدهای غیرقابل تغییر
        delete updateData.id;
        delete updateData.createdAt;

        updateData.updatedAt = new Date().toISOString();

        await updatePlan(planId, updateData);

        res.json({
            success: true,
            message: 'پلن با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی پلن:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی پلن' });
    }
});

// حذف پلن
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        await deletePlan(req.params.id);

        res.json({
            success: true,
            message: 'پلن با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا در حذف پلن:', error);
        res.status(500).json({ error: 'خطا در حذف پلن' });
    }
});

// دریافت پلن‌های 3D
router.get('/3d/plans', authenticateToken, async (req, res) => {
    try {
        const data = await getAll3DData();
        res.json(data);
    } catch (error) {
        console.error('خطا در دریافت پلن‌های 3D:', error);
        res.status(500).json({ error: 'خطا در دریافت پلن‌های 3D' });
    }
});

// به‌روزرسانی پلن 3D کاربر
router.post('/3d/user-plan', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const { username, planValue } = req.body;

        if (!username || planValue === undefined) {
            return res.status(400).json({ error: 'نام کاربری و مقدار پلن الزامی است' });
        }

        await upsert3DData(username, planValue);

        res.json({
            success: true,
            message: 'پلن 3D کاربر با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی پلن 3D کاربر:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی پلن 3D کاربر' });
    }
});

// دریافت پلن 3D کاربر خاص
router.get('/3d/user-plan/:username', authenticateToken, async (req, res) => {
    try {
        const username = req.params.username;
        const plan = await get3DDataByKey(username);

        res.json({
            username: username,
            plan: plan || 0
        });
    } catch (error) {
        console.error('خطا در دریافت پلن 3D کاربر:', error);
        res.status(500).json({ error: 'خطا در دریافت پلن 3D کاربر' });
    }
});

module.exports = router;