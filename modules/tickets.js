const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const fs = require('fs').promises;
const path = require('path');
const { 
    createTicket,
    getDB,
    getUserByUsername
} = require('./database');

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// میدلور احراز هویت برای تمام مسیرها
router.use(authenticateToken);

// تابع دریافت نام کامل کاربر
async function getUserFullName(username) {
    try {
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username);
        if (user) {
            if (user.firstName && user.lastName) {
                return `${user.firstName} ${user.lastName}`;
            } else if (user.firstName) {
                return user.firstName;
            } else {
                return username;
            }
        }
        return username;
    } catch (error) {
        return username;
    }
}

// تابع دریافت نام کامل کاربران برای تیکت
async function getTicketUsersInfo(ticket) {
    try {
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
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
        const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
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

// ایجاد تیکت جدید
router.post('/create', async (req, res) => {
    try {
        const { title, description, priority, category } = req.body;
        const username = req.user.username;

        // اعتبارسنجی ورودی‌ها
        if (!title || !description) {
            return res.status(400).json({ 
                error: 'عنوان و توضیحات تیکت الزامی است' 
            });
        }

        if (title.length < 5 || title.length > 100) {
            return res.status(400).json({ 
                error: 'عنوان تیکت باید بین 5 تا 100 کاراکتر باشد' 
            });
        }

        if (description.length < 10 || description.length > 2000) {
            return res.status(400).json({ 
                error: 'توضیحات تیکت باید بین 10 تا 2000 کاراکتر باشد' 
            });
        }

        // ایجاد تیکت جدید در دیتابیس
        const newTicket = {
            id: Date.now().toString(),
            title: title.trim(),
            description: description.trim(),
            priority: priority || 'medium',
            category: category || 'general',
            status: 'open',
            createdBy: username,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [{
                id: Date.now().toString(),
                sender: username,
                message: description.trim(),
                timestamp: new Date().toISOString(),
                isAdmin: false
            }],
            assignedTo: null,
            resolvedAt: null,
            closedAt: null,
            tags: [],
            attachments: []
        };

        // ذخیره در دیتابیس
        await createTicket(newTicket);

        res.status(201).json({
            success: true,
            message: 'تیکت با موفقیت ایجاد شد',
            ticket: newTicket
        });

    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'خطا در ایجاد تیکت' });
    }
});

// دریافت لیست تیکت‌های کاربر
router.get('/my-tickets', async (req, res) => {
    try {
        const username = req.user.username;
        const { status, priority, category, page = 1, limit = 10 } = req.query;

        // خواندن تیکت‌های کاربر از دیتابیس
        let userTickets = [];
        try {
            const db = getDB();
            userTickets = await new Promise((resolve, reject) => {
                db.all(
                    "SELECT * FROM tickets WHERE username = ? ORDER BY created_at DESC", 
                    [username], 
                    (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(rows || []);
                        }
                    }
                );
            });
        } catch (error) {
            console.log('خطا در خواندن تیکت‌ها از دیتابیس:', error);
            return res.json({ tickets: [], total: 0, page: 1, totalPages: 0 });
        }

        // اعمال فیلترها
        if (status) {
            userTickets = userTickets.filter(ticket => ticket.status === status);
        }
        if (priority) {
            userTickets = userTickets.filter(ticket => ticket.priority === priority);
        }
        if (category) {
            userTickets = userTickets.filter(ticket => ticket.category === category);
        }

        // مرتب‌سازی بر اساس تاریخ ایجاد (جدیدترین اول)
        userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // پیجینیشن
        const total = userTickets.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedTickets = userTickets.slice(startIndex, endIndex);

        res.json({
            tickets: paginatedTickets,
            total,
            page: parseInt(page),
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        });

    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
    }
});

// دریافت جزئیات یک تیکت
router.get('/:ticketId', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const username = req.user.username;

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

        // بررسی دسترسی کاربر
        if (ticket.createdBy !== username && req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
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

// ارسال پیام جدید به تیکت
router.post('/:ticketId/message', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;
        const username = req.user.username;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'پیام نمی‌تواند خالی باشد' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ error: 'پیام نمی‌تواند بیشتر از 1000 کاراکتر باشد' });
        }

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        
        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets[ticketIndex];

        // بررسی دسترسی کاربر
        if (ticket.createdBy !== username && req.user.username !== 'admin') {
            return res.status(403).json({ error: 'دسترسی غیرمجاز' });
        }

        // بررسی وضعیت تیکت
        if (ticket.status === 'closed') {
            return res.status(400).json({ error: 'نمی‌توان به تیکت بسته شده پیام ارسال کرد' });
        }

        // ایجاد پیام جدید
        const newMessage = {
            id: Date.now().toString(),
            sender: username,
            message: message.trim(),
            timestamp: new Date().toISOString(),
            isAdmin: req.user.username === 'admin'
        };

        ticket.messages.push(newMessage);
        ticket.updatedAt = new Date().toISOString();

        // تغییر وضعیت تیکت
        if (req.user.username === 'admin') {
            ticket.status = 'in_progress';
        } else {
            ticket.status = 'waiting_for_admin';
        }

        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'پیام با موفقیت ارسال شد',
            newMessage
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'خطا در ارسال پیام' });
    }
});

// بستن تیکت توسط کاربر
router.post('/:ticketId/close', async (req, res) => {
    try {
        const { ticketId } = req.params;
        const username = req.user.username;

        let tickets = JSON.parse(await fs.readFile(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        
        if (ticketIndex === -1) {
            return res.status(404).json({ error: 'تیکت یافت نشد' });
        }

        const ticket = tickets[ticketIndex];

        // فقط سازنده تیکت می‌تواند آن را ببندد
        if (ticket.createdBy !== username) {
            return res.status(403).json({ error: 'فقط سازنده تیکت می‌تواند آن را ببندد' });
        }

        if (ticket.status === 'closed') {
            return res.status(400).json({ error: 'تیکت قبلاً بسته شده است' });
        }

        ticket.status = 'closed';
        ticket.closedAt = new Date().toISOString();
        ticket.updatedAt = new Date().toISOString();

        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));

        res.json({
            success: true,
            message: 'تیکت با موفقیت بسته شد'
        });

    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({ error: 'خطا در بستن تیکت' });
    }
});

// دریافت آمار تیکت‌های کاربر
router.get('/stats/my', async (req, res) => {
    try {
        const username = req.user.username;

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
                closed: 0
            });
        }

        const userTickets = tickets.filter(ticket => ticket.createdBy === username);

        const stats = {
            total: userTickets.length,
            open: userTickets.filter(t => t.status === 'open').length,
            inProgress: userTickets.filter(t => t.status === 'in_progress').length,
            waiting: userTickets.filter(t => t.status === 'waiting_for_user').length,
            resolved: userTickets.filter(t => t.status === 'resolved').length,
            closed: userTickets.filter(t => t.status === 'closed').length
        };

        res.json(stats);

    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'خطا در دریافت آمار' });
    }
});

module.exports = router; 