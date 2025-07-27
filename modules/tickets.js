const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { 
    createTicket, 
    getAllTickets, 
    updateTicket, 
    deleteTicket, 
    getTicketsByUser,
    getTicketById,
    getDB 
} = require('./database');

// ایجاد تیکت جدید
router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { title, description, priority, category } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'عنوان و توضیحات الزامی است' });
        }

        const ticketData = {
            id: Date.now().toString(),
            title,
            description,
            priority: priority || 'medium',
            category: category || 'general',
            status: 'open',
            createdBy: req.user.username,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [{
                id: Date.now().toString(),
                sender: req.user.username,
                message: description,
                timestamp: new Date().toISOString(),
                isAdmin: false
            }],
            assignedTo: null,
            resolvedAt: null,
            closedAt: null,
            tags: [],
            attachments: []
        };

        await createTicket(ticketData);

        res.status(201).json({
            success: true,
            message: 'تیکت با موفقیت ایجاد شد',
            ticket: ticketData
        });
    } catch (error) {
        console.error('خطا در ایجاد تیکت:', error);
        res.status(500).json({ error: 'خطا در ایجاد تیکت' });
    }
});

// دریافت تمام تیکت‌ها (برای ادمین)
router.get('/all', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const tickets = await getAllTickets();
        res.json(tickets || []);
    } catch (error) {
        console.error('خطا در دریافت تیکت‌ها:', error);
        res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
    }
});

// دریافت تیکت‌های کاربر
router.get('/my-tickets', authenticateToken, async (req, res) => {
    try {
        const tickets = await getTicketsByUser(req.user.username);
        res.json(tickets || []);
    } catch (error) {
        console.error('خطا در دریافت تیکت‌های کاربر:', error);
        res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
    }
});

// دریافت تیکت خاص
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const ticket = await getTicketById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        // بررسی دسترسی
        if (req.user.username !== 'admin' && ticket.createdBy !== req.user.username) {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('خطا در دریافت تیکت:', error);
        res.status(500).json({ error: 'خطا در دریافت تیکت' });
    }
});

// پاسخ به تیکت (افزودن پیام)
router.post('/:id/reply', authenticateToken, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'پیام الزامی است' });
        }

        const ticket = await getTicketById(ticketId);
        if (!ticket) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        // بررسی دسترسی
        if (req.user.username !== 'admin' && ticket.createdBy !== req.user.username) {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        const newMessage = {
            id: Date.now().toString(),
            sender: req.user.username,
            message: message,
            timestamp: new Date().toISOString(),
            isAdmin: req.user.username === 'admin'
        };

        const messages = ticket.messages ? JSON.parse(ticket.messages) : [];
        messages.push(newMessage);

        await updateTicket(ticketId, {
            messages: JSON.stringify(messages),
            updatedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: 'پاسخ با موفقیت ثبت شد'
        });
    } catch (error) {
        console.error('خطا در پاسخ به تیکت:', error);
        res.status(500).json({ error: 'خطا در پاسخ به تیکت' });
    }
});

// به‌روزرسانی وضعیت تیکت
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'فقط ادمین می‌تواند وضعیت تیکت را تغییر دهد' });
        }

        const ticketId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'وضعیت الزامی است' });
        }

        const updateData = {
            status: status,
            updatedAt: new Date().toISOString()
        };

        if (status === 'resolved') {
            updateData.resolvedAt = new Date().toISOString();
        } else if (status === 'closed') {
            updateData.closedAt = new Date().toISOString();
        }

        await updateTicket(ticketId, updateData);

        res.json({
            success: true,
            message: 'وضعیت تیکت با موفقیت به‌روزرسانی شد'
        });
    } catch (error) {
        console.error('خطا در به‌روزرسانی وضعیت تیکت:', error);
        res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت تیکت' });
    }
});

// حذف تیکت
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'فقط ادمین می‌تواند تیکت را حذف کند' });
        }

        const ticketId = req.params.id;

        await deleteTicket(ticketId);

        res.json({
            success: true,
            message: 'تیکت با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('خطا در حذف تیکت:', error);
        res.status(500).json({ error: 'خطا در حذف تیکت' });
    }
});

module.exports = router;