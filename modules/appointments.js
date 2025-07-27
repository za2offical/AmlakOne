const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const { 
    createAppointment,
    getDB,
    getUserByUsername
} = require('./database');

// Middleware to verify user authentication
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'توکن احراز هویت یافت نشد' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Load users to verify username
        const usersPath = path.join(__dirname, '..', 'data', 'users.json');
        const usersData = await fs.readFile(usersPath, 'utf8');
        const users = JSON.parse(usersData);
        
        const user = users.find(u => u.username === decoded.username);
        if (!user) {
            return res.status(401).json({ error: 'کاربر یافت نشد' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'احراز هویت ناموفق بود' });
    }
};

// Get all appointments for a user
router.get('/', authenticateUser, async (req, res) => {
    try {
        // خواندن قرارملاقات‌های کاربر از دیتابیس
        let userAppointments = [];
        try {
            const db = getDB();
            userAppointments = await new Promise((resolve, reject) => {
                db.all(
                    "SELECT * FROM appointments WHERE username = ? ORDER BY created_at DESC", 
                    [req.user.username], 
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
            console.log('خطا در خواندن قرارملاقات‌ها از دیتابیس:', error);
            userAppointments = [];
        }
        
        res.json(userAppointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'خطا در دریافت قرارها' });
    }
});

// Create a new appointment
router.post('/', authenticateUser, async (req, res) => {
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

        // Validation
        if (!propertyId || !clientName || !clientPhone || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ error: 'تمام فیلدهای ضروری باید پر شوند' });
        }

        // Validate phone number format
        const phoneRegex = /^09\d{9}$/;
        if (!phoneRegex.test(clientPhone)) {
            return res.status(400).json({ error: 'فرمت شماره تلفن صحیح نیست' });
        }

        // Validate date (should be in the future)
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        const now = new Date();
        if (appointmentDateTime <= now) {
            return res.status(400).json({ error: 'تاریخ و زمان قرار باید در آینده باشد' });
        }

        // بررسی تداخل قرارملاقات‌ها از دیتابیس
        let conflictingAppointment = null;
        try {
            const db = getDB();
            const userAppointments = await new Promise((resolve, reject) => {
                db.all(
                    "SELECT * FROM appointments WHERE username = ?", 
                    [req.user.username], 
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });

            conflictingAppointment = userAppointments.find(appointment => {
                const existingDateTime = new Date(`${appointment.date}T${appointment.time}`);
                const timeDiff = Math.abs(appointmentDateTime - existingDateTime);
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                return hoursDiff < 2; // 2 hours buffer
            });
        } catch (error) {
            console.log('خطا در بررسی تداخل قرارملاقات‌ها:', error);
        }

        if (conflictingAppointment) {
            return res.status(400).json({ error: 'در این زمان قرار دیگری دارید. لطفاً زمان دیگری انتخاب کنید' });
        }

        // ایجاد قرارملاقات جدید در دیتابیس
        const newAppointment = {
            id: Date.now().toString(),
            agentUsername: req.user.username,
            propertyId,
            clientName,
            clientPhone,
            appointmentDate,
            appointmentTime,
            appointmentType: appointmentType || 'visit',
            notes: notes || '',
            propertyAddress: propertyAddress || '',
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // ذخیره در دیتابیس
        await createAppointment(newAppointment);

        res.status(201).json(newAppointment);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'خطا در ایجاد قرار' });
    }
});

// Update an appointment
router.put('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            clientName,
            clientPhone,
            appointmentDate,
            appointmentTime,
            appointmentType,
            notes,
            status
        } = req.body;

        const appointmentsPath = path.join(__dirname, '..', 'data', 'appointments.json');
        const appointmentsData = await fs.readFile(appointmentsPath, 'utf8');
        const appointments = JSON.parse(appointmentsData);

        const appointmentIndex = appointments.appointments.findIndex(
            appointment => appointment.id === id && appointment.agentUsername === req.user.username
        );

        if (appointmentIndex === -1) {
            return res.status(404).json({ error: 'قرار یافت نشد' });
        }

        // Update appointment
        const updatedAppointment = {
            ...appointments.appointments[appointmentIndex],
            ...(clientName && { clientName }),
            ...(clientPhone && { clientPhone }),
            ...(appointmentDate && { appointmentDate }),
            ...(appointmentTime && { appointmentTime }),
            ...(appointmentType && { appointmentType }),
            ...(notes !== undefined && { notes }),
            ...(status && { status }),
            updatedAt: new Date().toISOString()
        };

        appointments.appointments[appointmentIndex] = updatedAppointment;
        await fs.writeFile(appointmentsPath, JSON.stringify(appointments, null, 2));

        res.json(updatedAppointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'خطا در بروزرسانی قرار' });
    }
});

// Delete an appointment
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const appointmentsPath = path.join(__dirname, '..', 'data', 'appointments.json');
        const appointmentsData = await fs.readFile(appointmentsPath, 'utf8');
        const appointments = JSON.parse(appointmentsData);

        const appointmentIndex = appointments.appointments.findIndex(
            appointment => appointment.id === id && appointment.agentUsername === req.user.username
        );

        if (appointmentIndex === -1) {
            return res.status(404).json({ error: 'قرار یافت نشد' });
        }

        appointments.appointments.splice(appointmentIndex, 1);
        await fs.writeFile(appointmentsPath, JSON.stringify(appointments, null, 2));

        res.json({ message: 'قرار با موفقیت حذف شد' });
    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({ error: 'خطا در حذف قرار' });
    }
});

// Get appointment statistics
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const appointmentsPath = path.join(__dirname, '..', 'data', 'appointments.json');
        const appointmentsData = await fs.readFile(appointmentsPath, 'utf8');
        const appointments = JSON.parse(appointmentsData);
        
        const userAppointments = appointments.appointments.filter(
            appointment => appointment.agentUsername === req.user.username
        );

        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        const jalaali = require('jalaali-js');
        const g = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
        const j = jalaali.toJalaali(g.gy, g.gm, g.gd);
        const todayJalali = `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;

        // تابع نرمال‌سازی تاریخ شمسی
        function normalizeJalaliDate(dateStr) {
            if (!dateStr) return '';
            // تبدیل ارقام فارسی به انگلیسی
            let s = dateStr.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
            // تبدیل جداکننده‌ها به /
            s = s.replace(/[-.]/g, '/');
            let parts = s.split('/');
            if (parts.length === 3) {
                // اگر سال سه یا چهار رقمی نبود، یعنی فرمت روز/ماه/سال است
                if (parts[0].length < 3) {
                    // تبدیل به سال/ماه/روز
                    parts = [parts[2], parts[1], parts[0]];
                }
                let [y, m, d] = parts;
                m = String(Number(m));
                d = String(Number(d));
                return `${y}/${m}/${d}`;
            }
            return s;
        }
        const todayJalaliNorm = normalizeJalaliDate(todayJalali);

        const stats = {
            total: userAppointments.length,
            today: userAppointments.filter(appointment => {
                return normalizeJalaliDate(appointment.appointmentDate) === todayJalaliNorm;
            }).length,
            upcoming: userAppointments.filter(appointment => {
                // تبدیل تاریخ شمسی به میلادی
                const norm = normalizeJalaliDate(appointment.appointmentDate);
                const [jy, jm, jd] = norm.split('/').map(Number);
                if (!jy || !jm || !jd) return false;
                const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
                // ساخت تاریخ میلادی با ساعت و دقیقه
                const [h, m] = (appointment.appointmentTime || '00:00').split(':').map(Number);
                const appointmentDateTime = new Date(gy, gm - 1, gd, h, m);
                return appointmentDateTime > now && appointment.status === 'scheduled';
            }).length,
            completed: userAppointments.filter(appointment => appointment.status === 'completed').length,
            cancelled: userAppointments.filter(appointment => appointment.status === 'cancelled').length
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching appointment stats:', error);
        res.status(500).json({ error: 'خطا در دریافت آمار قرارها' });
    }
});

module.exports = router; 