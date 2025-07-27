require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// اگر JWT_SECRET در فایل .env تعریف نشده باشد، یک کلید تصادفی ایجاد می‌کند
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// خواندن کاربران از فایل
async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// نوشتن کاربران در فایل
async function writeUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// تولید توکن
function generateToken(user) {
    return jwt.sign(
        { username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// هش کردن پسورد
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// مقایسه پسورد
async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// میدلور بررسی توکن
const authenticateToken = async (req, res, next) => {
    try {
        // ابتدا از Authorization header بررسی کن
        let token = null;
        const authHeader = req.headers['authorization'];
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (req.cookies.token) {
            // اگر Authorization header نبود، از cookie استفاده کن
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }
            req.user = user;
            next();
        });
    } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// میدلور بررسی ادمین
const isAdmin = (req, res, next) => {
    if (req.user.username === process.env.ADMIN_USERNAME) {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = {
    generateToken,
    authenticateToken,
    isAdmin,
    readUsers,
    writeUsers,
    hashPassword,
    comparePassword,
    JWT_SECRET
};