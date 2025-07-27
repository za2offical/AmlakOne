require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getAllUsers, createUser, getUserByUsername, updateUser } = require('./database');

// احراز هویت - بدون سیستم کش
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// خواندن کاربران از دیتابیس
async function readUsers() {
    try {
        return await getAllUsers();
    } catch (error) {
        return [];
    }
}

// نوشتن کاربران در دیتابیس (این تابع دیگر مورد استفاده قرار نمی‌گیرد)
async function writeUsers(users) {
    // این تابع برای سازگاری باقی می‌ماند اما از دیتابیس استفاده می‌کند
    return true;
}

// تولید توکن
function generateToken(user) {
    return jwt.sign(
        { username: user.username },
        JWT_SECRET,
        { expiresIn: '30d' }
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
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

const generateToken = (user) => {
    return jwt.sign(
        { 
            username: user.username,
            level: user.level || 0
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

module.exports = {
    authenticateToken,
    generateToken,
    JWT_SECRET
};
