const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const { getAllUsers, createTicket, updateTicket, deleteTicket } = require('./database');

// میدلور احراز هویت و بررسی دسترسی ادمین
router.use(authenticateToken);
router.use(async (req, res, next) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز - فقط ادمین' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'خطا در بررسی دسترسی' });
    }
});

// تابع دریافت نام کامل کاربران برای تیکت
async function getTicketUsersInfo(ticket) {
    try {
        const users = await getAllUsers();
        const createdByUser = users.find(u => u.username === ticket.createdBy);
        const assignedToUser = ticket.assignedTo ? users.find(u => u.username === ticket.assignedTo) : null;

        const createdByName = createdByUser ? 
            (createdByUser.firstName && createdByUser.lastName ? 
                `${createdByUser.firstName} ${createdByUser.lastName}` : 
                (createdByUser.firstName || ticket.createdBy)) : 
            ticket.createdBy;

        const assignedToName = assignedToUser ? 
            (assignedToUser.firstName && assignedToUser.lastName ? 
                `${assignedToUser.firstName} ${assignedToUser.lastName}` : 
                (assignedToUser.firstName || ticket.assignedTo)) : 
            (ticket.assignedTo || null);

        return { createdByName, assignedToName };
    } catch (error) {
        return { createdByName: ticket.createdBy, assignedToName: ticket.assignedTo };
    }
}

// تابع دریافت نام کامل کاربران برای پیام‌ها
async function getMessagesWithUserNames(messages) {
    try {
        const users = await getAllUsers();
        return messages.map(message => {
            let fullName = message.sender;

            // اگر پیام از ادمین است
            if (message.sender === 'admin') {
                fullName = 'ادمین';
            } else {
                // پیدا کردن کاربر در لیست کاربران
                const user = users.find(u => u.username === message.sender);
                if (user) {
                    if (user.firstName && user.lastName) {
                        fullName = `${user.firstName} ${user.lastName}`;
                    } else if (user.firstName) {
                        fullName = user.firstName;
                    } else {
                        fullName = user.username;
                    }
                }
            }

            return { ...message, fullName };
        });
    } catch (error) {
        return messages.map(message => {
            let fullName = message.sender;
            if (message.sender === 'admin') {
                fullName = 'ادمین';
            }
            return { ...message, fullName };
        });
    }
}

// دریافت تمام تیکت‌ها با فیلتر و پیجینیشن
router.get('/all', async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            category, 
            assignedTo, 
            createdBy,
            page = 1, 
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        let tickets = [];
        try {
            tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        } catch (error) {
            return res.json({ 
                tickets: [], 
                total: 0, 
                page: 1, 
                totalPages: 0,
                stats: {
                    total: 0,
                    open: 0,
                    inProgress: 0,
                    waiting: 0,
                    resolved: 0,
                    closed: 0
                }
            });
        }

        // اعمال فیلترها
        let filteredTickets = tickets;

        if (status) {
            filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
        }
        if (priority) {
            filteredTickets = filteredTickets.filter(ticket => ticket.priority === priority);
        }
        if (category) {
            filteredTickets = filteredTickets.filter(ticket => ticket.category === category);
        }
        if (assignedTo) {
            filteredTickets = filteredTickets.filter(ticket => ticket.assignedTo === assignedTo);
        }
        if (createdBy) {
            filteredTickets = filteredTickets.filter(ticket => ticket.createdBy === createdBy);
        }

        // مرتب‌سازی
        filteredTickets.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        // اضافه کردن نام‌های کامل کاربران
        const ticketsWithNames = await Promise.all(filteredTickets.map(async (ticket) => {
            const { createdByName, assignedToName } = await getTicketUsersInfo(ticket);
            return {
                ...ticket,
                createdByName,
                assignedToName
            };
        }));

        // محاسبه آمار
        const stats = {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            inProgress: tickets.filter(t => t.status === 'in_progress').length,
            waiting: tickets.filter(t => t.status === 'waiting_for_admin').length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            closed: tickets.filter(t => t.status === 'closed').length
        };

        // پیجینیشن
        const total = ticketsWithNames.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedTickets = ticketsWithNames.slice(startIndex, endIndex);

        res.json({
            tickets: paginatedTickets,
            total,
            page: parseInt(page),
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
            stats
        });

    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
    }
});

// دریافت جزئیات یک تیکت
router.get('/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        let tickets = [];
        try {
            tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        } catch (error) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        // اضافه کردن نام‌های کامل کاربران
        const { createdByName, assignedToName } = await getTicketUsersInfo(ticket);
        const messagesWithNames = await getMessagesWithUserNames(ticket.messages);

        const ticketWithNames = {
            ...ticket,
            createdByName,
            assignedToName,
            messages: messagesWithNames
        };

        res.json({ ticket: ticketWithNames });

    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'خطا در دریافت تیکت' });
    }
});

// تغییر وضعیت تیکت
router.put('/:ticketId/status', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, note } = req.body;

        const validStatuses = ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'وضعیت نامعتبر است' });
        }

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);

        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets[ticketIndex];
        const oldStatus = ticket.status;
        ticket.status = status;
        ticket.updatedAt = new Date().toISOString();

        // تنظیم تاریخ‌های مربوطه
        if (status === 'resolved') {
            ticket.resolvedAt = new Date().toISOString();
        } else if (status === 'closed') {
            ticket.closedAt = new Date().toISOString();
        }

        // اضافه کردن پیام سیستم در صورت وجود یادداشت
        if (note && note.trim()) {
            const systemMessage = {
                id: Date.now().toString(),
                sender: 'admin',
                message: `[سیستم] تغییر وضعیت از ${oldStatus} به ${status}\n\nیادداشت: ${note.trim()}`,
                timestamp: new Date().toISOString(),
                isAdmin: true,
                isSystemMessage: true
            };
            ticket.messages.push(systemMessage);
        }

        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'وضعیت تیکت با موفقیت تغییر کرد',
            ticket: tickets[ticketIndex]
        });

    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ error: 'خطا در تغییر وضعیت تیکت' });
    }
});

// تخصیص تیکت به ادمین
router.put('/:ticketId/assign', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { assignedTo } = req.body;

        if (!assignedTo) {
            return res.status(400).json({ error: 'نام کاربری ادمین الزامی است' });
        }

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);

        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets[ticketIndex];
        ticket.assignedTo = assignedTo;
        ticket.updatedAt = new Date().toISOString();

        // اضافه کردن پیام سیستم
        const systemMessage = {
            id: Date.now().toString(),
            sender: 'admin',
            message: `[سیستم] تیکت به ${assignedTo} تخصیص داده شد`,
            timestamp: new Date().toISOString(),
            isAdmin: true,
            isSystemMessage: true
        };
        ticket.messages.push(systemMessage);

        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'تیکت با موفقیت تخصیص داده شد',
            ticket: tickets[ticketIndex]
        });

    } catch (error) {
        console.error('Error assigning ticket:', error);
        res.status(500).json({ error: 'خطا در تخصیص تیکت' });
    }
});

// تغییر اولویت تیکت
router.put('/:ticketId/priority', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { priority } = req.body;

        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({ error: 'اولویت نامعتبر است' });
        }

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);

        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets[ticketIndex];
        const oldPriority = ticket.priority;
        ticket.priority = priority;
        ticket.updatedAt = new Date().toISOString();

        // اضافه کردن پیام سیستم
        const systemMessage = {
            id: Date.now().toString(),
            sender: 'admin',
            message: `[سیستم] اولویت تیکت از ${oldPriority} به ${priority} تغییر کرد`,
            timestamp: new Date().toISOString(),
            isAdmin: true,
            isSystemMessage: true
        };
        ticket.messages.push(systemMessage);

        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'اولویت تیکت با موفقیت تغییر کرد',
            ticket: tickets[ticketIndex]
        });

    } catch (error) {
        console.error('Error updating ticket priority:', error);
        res.status(500).json({ error: 'خطا در تغییر اولویت تیکت' });
    }
});

// حذف تیکت
router.delete('/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);

        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const deletedTicket = tickets[ticketIndex];
        tickets.splice(ticketIndex, 1);
        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'تیکت با موفقیت حذف شد',
            deletedTicket
        });

    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'خطا در حذف تیکت' });
    }
});

// دریافت آمار کلی تیکت‌ها
router.get('/stats/overview', async (req, res) => {
    try {
        let tickets = [];
        try {
            tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        } catch (error) {
            return res.json({
                total: 0,
                open: 0,
                inProgress: 0,
                waiting: 0,
                resolved: 0,
                closed: 0,
                byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
                byCategory: {},
                averageResponseTime: 0,
                averageResolutionTime: 0
            });
        }

        // آمار کلی
        const stats = {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            inProgress: tickets.filter(t => t.status === 'in_progress').length,
            waiting: tickets.filter(t => t.status === 'waiting_for_admin').length,
            resolved: tickets.filter(t => t.status === 'resolved').length,
            closed: tickets.filter(t => t.status === 'closed').length,
            byPriority: {
                low: tickets.filter(t => t.priority === 'low').length,
                medium: tickets.filter(t => t.priority === 'medium').length,
                high: tickets.filter(t => t.priority === 'high').length,
                urgent: tickets.filter(t => t.priority === 'urgent').length
            },
            byCategory: {}
        };

        // آمار بر اساس دسته‌بندی
        tickets.forEach(ticket => {
            if (!stats.byCategory[ticket.category]) {
                stats.byCategory[ticket.category] = 0;
            }
            stats.byCategory[ticket.category]++;
        });

        // محاسبه زمان متوسط پاسخ و حل مشکل
        const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
        let totalResponseTime = 0;
        let totalResolutionTime = 0;
        let responseCount = 0;
        let resolutionCount = 0;

        resolvedTickets.forEach(ticket => {
            const firstAdminMessage = ticket.messages.find(m => m.isAdmin);
            if (firstAdminMessage) {
                const responseTime = new Date(firstAdminMessage.timestamp) - new Date(ticket.createdAt);
                totalResponseTime += responseTime;
                responseCount++;
            }

            if (ticket.resolvedAt) {
                const resolutionTime = new Date(ticket.resolvedAt) - new Date(ticket.createdAt);
                totalResolutionTime += resolutionTime;
                resolutionCount++;
            }
        });

        stats.averageResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount / (1000 * 60 * 60)) : 0; // ساعت
        stats.averageResolutionTime = resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount / (1000 * 60 * 60)) : 0; // ساعت

        res.json(stats);

    } catch (error) {
        console.error('Error fetching overview stats:', error);
        res.status(500).json({ error: 'خطا در دریافت آمار کلی' });
    }
});

// دریافت لیست کاربران برای تخصیص
router.get('/users', async (req, res) => {
    try {
        let users = [];
        try {
            users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        } catch (error) {
            return res.json([]);
        }

        // فقط کاربران ادمین
        const adminUsers = users.filter(user => user.username === 'admin').map(user => ({
            username: user.username,
            firstName: user.firstName || '',
            lastName: user.lastName || ''
        }));

        res.json(adminUsers);

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'خطا در دریافت کاربران' });
    }
});

// ارسال پیام سیستم به تیکت
router.post('/:ticketId/system-message', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message, isInternal = false } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'پیام نمی‌تواند خالی باشد' });
        }

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);

        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets[ticketIndex];

        // ایجاد پیام سیستم
        const systemMessage = {
            id: Date.now().toString(),
            sender: 'admin',
            message: message.trim(),
            timestamp: new Date().toISOString(),
            isAdmin: true,
            isSystemMessage: true,
            isInternal: isInternal // پیام داخلی فقط برای ادمین‌ها قابل مشاهده
        };

        ticket.messages.push(systemMessage);
        ticket.updatedAt = new Date().toISOString();

        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'پیام سیستم با موفقیت ارسال شد',
            systemMessage
        });

    } catch (error) {
        console.error('Error sending system message:', error);
        res.status(500).json({ error: 'خطا در ارسال پیام سیستم' });
    }
});

// دریافت لیست تیکت‌ها
router.get('/', async (req, res) => {
    try {
        const { getAllTickets } = require('./database');
        const tickets = await getAllTickets();

        // ترتیب دادن تیکت‌ها بر اساس تاریخ ایجاد (جدیدترین اول)
        tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // اضافه کردن اطلاعات کاربران به تیکت‌ها
        const ticketsWithUserInfo = await Promise.all(
            tickets.map(ticket => getTicketUsersInfo({
                ...ticket,
                createdBy: ticket.username,
                title: ticket.subject,
                description: ticket.message,
                createdAt: ticket.created_at,
                updatedAt: ticket.updated_at
            }))
        );

        res.json(ticketsWithUserInfo);
    } catch (error) {
        console.error('Error reading tickets:', error);
        res.status(500).json({ error: 'خطا در بارگذاری تیکت‌ها' });
    }
});

module.exports = router;