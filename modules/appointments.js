const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { 
    createAppointment, 
    getAllAppointments, 
    updateAppointment, 
    deleteAppointment, 
    getAppointmentsByUser,
    getDB 
} = require('./database');

// ایجاد قرارملاقات جدید
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { 
            propertyId, 
            clientName, 
            clientPhone, 
            appointmentDate, 
            appointmentTime, 
            appointmentType, 
            notes, 
            propertyAddress 
        } = req.body;

        if (!clientName || !clientPhone || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ 
                error: 'اطلاعات مورد نیاز ناقص است' 
            });
        }

        const appointmentData = {
            id: Date.now().toString(),
            agentUsername: req.user.username,
            propertyId: propertyId || '',
            clientName,
            clientPhone,
            appointmentDate,
            appointmentTime,
            appointmentType: appointmentType || 'consultation',
            notes: notes || '',
            propertyAddress: propertyAddress || '',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await createAppointment(appointmentData);

        res.status(201).json({
            success: true,
            message: 'قرارملاقات با موفقیت ایجاد شد',
            appointment: appointmentData
        });
    } catch (error) {
        console.error('خطا در ایجاد قرارملاقات:', error);
        res.status(500).json({ error: 'خطا در ایجاد قرارملاقات' });
    }
});

// دریافت تمام قرارملاقات‌ها (برای ادمین)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const appointments = await getAllAppointments();
        res.json(appointments || []);
    } catch (error) {
        console.error('خطا در دریافت قرارملاقات‌ها:', error);
        res.status(500).json({ error: 'خطا در دریافت قرارملاقات‌ها' });
    }
});

// دریافت قرارملاقات‌های کاربر
router.get('/my-appointments', authenticateToken, async (req, res) => {
    try {
        const appointments = await getAppointmentsByUser(req.user.username);
        res.json(appointments || []);
    } catch (error) {
        console.error('خطا در دریافت قرارملاقات‌ها:', error);
        res.status(500).json({ error: 'خطا در دریافت قرارملاقات‌ها' });
    }
});

// به‌روزرسانی قرارملاقات
router.put('/update/:id', authenticateToken, async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const updateData = req.body;

        // حذف فیلدهای غیرقابل تغییر
        delete updateData.id;
        delete updateData.agentUsername;
        delete updateData.createdAt;

        updateData.updatedAt = new Date().toISOString();

        await updateAppointment(appointmentId, updateData);

        res.json({
            success: true,
            message: 'قرارملاقات با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی قرارملاقات:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی قرارملاقات' });
    }
});

// حذف قرارملاقات
router.delete('/delete/:id', authenticateToken, async (req, res) => {
    try {
        const appointmentId = req.params.id;

        await deleteAppointment(appointmentId);

        res.json({
            success: true,
            message: 'قرارملاقات با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا در حذف قرارملاقات:', error);
        res.status(500).json({ error: 'خطا در حذف قرارملاقات' });
    }
});

module.exports = router;