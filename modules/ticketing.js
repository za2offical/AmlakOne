const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('./auth');
const { createTicket, getAllTickets, updateTicket, deleteTicket, getAllUsers } = require('./database');

// مدل داده تیکت (برای مرجع)
// {
//   id, title, description, status, priority, category, createdBy, assignedTo, createdAt, updatedAt, resolvedAt, closedAt, tags, attachments, messages, history
// }

// --- توابع سرویس ---
async function readTickets() {
  try {
    return await getAllTickets();
  } catch (e) {
    return [];
  }
}

async function writeTickets(tickets) {
  // این تابع برای سازگاری باقی می‌ماند ولی در عمل استفاده نمی‌شود
  return true;
}

// --- روت‌های کاربر ---
// ایجاد تیکت جدید
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, category, tags } = req.body;
    const username = req.user.username;

    // اعتبارسنجی
    if (!title || !description) {
      return res.status(400).json({ error: 'عنوان و توضیحات الزامی است' });
    }
    if (title.length < 5 || title.length > 100) {
      return res.status(400).json({ error: 'عنوان باید بین ۵ تا ۱۰۰ کاراکتر باشد' });
    }
    if (description.length < 10 || description.length > 2000) {
      return res.status(400).json({ error: 'توضیحات باید بین ۱۰ تا ۲۰۰۰ کاراکتر باشد' });
    }

    let tickets = await readTickets();
    const now = new Date();
    const newTicket = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      status: 'open',
      priority: priority || 'medium',
      category: category || 'general',
      createdBy: username,
      assignedTo: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      resolvedAt: null,
      closedAt: null,
      tags: Array.isArray(tags) ? tags : [],
      attachments: [],
      messages: [{
        id: Date.now().toString(),
        sender: username,
        message: description.trim(),
        timestamp: now.toISOString(),
        isAdmin: false,
        isSystemMessage: false,
        isInternal: false,
        attachments: []
      }],
      history: []
    };
    tickets.unshift(newTicket);
    await writeTickets(tickets);
    res.status(201).json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'خطا در ایجاد تیکت' });
  }
});

// لیست تیکت‌های کاربر
router.get('/', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const { status, priority, category, page = 1, limit = 10 } = req.query;
    let tickets = await readTickets();
    let userTickets = tickets.filter(t => t.createdBy === username);
    if (status) userTickets = userTickets.filter(t => t.status === status);
    if (priority) userTickets = userTickets.filter(t => t.priority === priority);
    if (category) userTickets = userTickets.filter(t => t.category === category);
    userTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const total = userTickets.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginated = userTickets.slice(startIndex, startIndex + parseInt(limit));
    res.json({ tickets: paginated, total, page: parseInt(page), totalPages });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
  }
});

// جزئیات تیکت
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    let tickets = await readTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
    if (ticket.createdBy !== username && !req.user.isAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'خطا در دریافت تیکت' });
  }
});

// ارسال پیام جدید
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const username = req.user.username;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'پیام نمی‌تواند خالی باشد' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ error: 'پیام نمی‌تواند بیشتر از ۱۰۰۰ کاراکتر باشد' });
    }
    let tickets = await readTickets();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    const ticket = tickets[ticketIndex];
    if (ticket.createdBy !== username && !req.user.isAdmin) {
      return res.status(403).json({ error: 'دسترسی غیرمجاز' });
    }
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'نمی‌توان به تیکت بسته شده پیام ارسال کرد' });
    }
    const now = new Date();
    const newMessage = {
      id: Date.now().toString(),
      sender: username,
      message: message.trim(),
      timestamp: now.toISOString(),
      isAdmin: !!req.user.isAdmin,
      isSystemMessage: false,
      isInternal: false,
      attachments: []
    };
    ticket.messages.push(newMessage);
    ticket.updatedAt = now.toISOString();
    // تغییر وضعیت تیکت
    if (req.user.isAdmin) {
      ticket.status = 'in_progress';
    } else {
      ticket.status = 'waiting_for_admin';
    }
    await writeTickets(tickets);
    res.json({ success: true, newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'خطا در ارسال پیام' });
  }
});

// بستن تیکت
router.post('/:id/close', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.user.username;
    let tickets = await readTickets();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    const ticket = tickets[ticketIndex];
    if (ticket.createdBy !== username) {
      return res.status(403).json({ error: 'فقط سازنده تیکت می‌تواند آن را ببندد' });
    }
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'تیکت قبلاً بسته شده است' });
    }
    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.updatedAt = new Date().toISOString();
    await writeTickets(tickets);
    res.json({ success: true, message: 'تیکت با موفقیت بسته شد' });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'خطا در بستن تیکت' });
  }
});

// --- روت‌های ادمین ---
// لیست همه تیکت‌ها (ادمین)
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, priority, category, assignedTo, createdBy, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    let tickets = await readTickets();
    if (status) tickets = tickets.filter(t => t.status === status);
    if (priority) tickets = tickets.filter(t => t.priority === priority);
    if (category) tickets = tickets.filter(t => t.category === category);
    if (assignedTo) tickets = tickets.filter(t => t.assignedTo === assignedTo);
    if (createdBy) tickets = tickets.filter(t => t.createdBy === createdBy);
    tickets.sort((a, b) => {
      if (sortOrder === 'asc') return new Date(a[sortBy]) - new Date(b[sortBy]);
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    });
    const total = tickets.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginated = tickets.slice(startIndex, startIndex + parseInt(limit));
    res.json({ tickets: paginated, total, page: parseInt(page), totalPages });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ error: 'خطا در دریافت تیکت‌ها' });
  }
});

// مشاهده جزئیات تیکت (ادمین)
router.get('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let tickets = await readTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد' });
    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'خطا در دریافت تیکت' });
  }
});

// ویرایش تیکت (وضعیت، اولویت، تخصیص)
router.put('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedTo, note } = req.body;
    let tickets = await readTickets();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    const ticket = tickets[ticketIndex];
    let updated = false;
    if (status && ticket.status !== status) {
      const validStatuses = ['open', 'in_progress', 'waiting_for_user', 'waiting_for_admin', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'وضعیت نامعتبر است' });
      }
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
      updated = true;
      if (status === 'resolved') ticket.resolvedAt = new Date().toISOString();
      if (status === 'closed') ticket.closedAt = new Date().toISOString();
      if (note) {
        ticket.messages.push({
          id: Date.now().toString(),
          sender: 'admin',
          message: `[سیستم] تغییر وضعیت: ${status}\n${note}`,
          timestamp: new Date().toISOString(),
          isAdmin: true,
          isSystemMessage: true,
          isInternal: false,
          attachments: []
        });
      }
    }
    if (priority && ticket.priority !== priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'اولویت نامعتبر است' });
      }
      ticket.priority = priority;
      ticket.updatedAt = new Date().toISOString();
      updated = true;
      ticket.messages.push({
        id: Date.now().toString(),
        sender: 'admin',
        message: `[سیستم] تغییر اولویت: ${priority}`,
        timestamp: new Date().toISOString(),
        isAdmin: true,
        isSystemMessage: true,
        isInternal: false,
        attachments: []
      });
    }
    if (assignedTo && ticket.assignedTo !== assignedTo) {
      ticket.assignedTo = assignedTo;
      ticket.updatedAt = new Date().toISOString();
      updated = true;
      ticket.messages.push({
        id: Date.now().toString(),
        sender: 'admin',
        message: `[سیستم] تخصیص به: ${assignedTo}`,
        timestamp: new Date().toISOString(),
        isAdmin: true,
        isSystemMessage: true,
        isInternal: false,
        attachments: []
      });
    }
    if (!updated) {
      return res.status(400).json({ error: 'هیچ تغییری اعمال نشد' });
    }
    await writeTickets(tickets);
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'خطا در ویرایش تیکت' });
  }
});

// ارسال پیام سیستمی/داخلی توسط ادمین
router.post('/admin/:id/messages', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, isInternal = false } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'پیام نمی‌تواند خالی باشد' });
    }
    let tickets = await readTickets();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    const ticket = tickets[ticketIndex];
    const now = new Date();
    const systemMessage = {
      id: Date.now().toString(),
      sender: 'admin',
      message: message.trim(),
      timestamp: now.toISOString(),
      isAdmin: true,
      isSystemMessage: true,
      isInternal: !!isInternal,
      attachments: []
    };
    ticket.messages.push(systemMessage);
    ticket.updatedAt = now.toISOString();
    await writeTickets(tickets);
    res.json({ success: true, systemMessage });
  } catch (error) {
    console.error('Error sending system message:', error);
    res.status(500).json({ error: 'خطا در ارسال پیام سیستم' });
  }
});

// حذف تیکت
router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let tickets = await readTickets();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex === -1) return res.status(404).json({ error: 'تیکت یافت نشد' });
    const deletedTicket = tickets[ticketIndex];
    tickets.splice(ticketIndex, 1);
    await writeTickets(tickets);
    res.json({ success: true, deletedTicket });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'خطا در حذف تیکت' });
  }
});

// --- مدیریت پیوست‌ها (نمونه اسکلت) ---
router.post('/:id/attachments', authenticateToken, async (req, res) => {
  // آپلود فایل پیوست
});

router.delete('/:id/attachments/:attachmentId', authenticateToken, async (req, res) => {
  // حذف فایل پیوست
});

module.exports = router; 