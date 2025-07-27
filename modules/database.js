
const { Pool } = require('pg');

// اتصال به PostgreSQL
let pool;
const connectDB = async () => {
    try {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            console.warn('DATABASE_URL not set, using fallback configuration');
            return;
        }
        
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // تست اتصال
        const client = await pool.connect();
        client.release();
        console.log('PostgreSQL connected successfully');
        
        // ایجاد جدول کاربران در صورت عدم وجود
        await createUsersTable();
        
    } catch (error) {
        console.error('PostgreSQL connection error:', error);
        process.exit(1);
    }
};

// ایجاد جدول کاربران
const createUsersTable = async () => {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                phone VARCHAR(20) UNIQUE NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                gender VARCHAR(10),
                province VARCHAR(255),
                neighborhood VARCHAR(255),
                profile_image_path VARCHAR(500),
                profile_completed BOOLEAN DEFAULT false,
                initialized BOOLEAN DEFAULT false,
                last_login TIMESTAMP,
                failed_login_attempts INTEGER DEFAULT 0,
                lockout_until BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        const client = await pool.connect();
        await client.query(query);
        client.release();
        console.log('Users table created or already exists');
        
    } catch (error) {
        console.error('Error creating users table:', error);
    }
};

// خواندن تمام کاربران
const readUsers = async () => {
    try {
        if (!pool) {
            console.warn('Database pool not initialized');
            return [];
        }
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
        client.release();
        
        return result.rows.map(user => ({
            username: user.username,
            hashedPassword: user.hashed_password,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            gender: user.gender,
            province: user.province,
            neighborhood: user.neighborhood,
            profileImagePath: user.profile_image_path,
            profileCompleted: user.profile_completed,
            initialized: user.initialized,
            lastLogin: user.last_login ? user.last_login.toISOString() : undefined,
            failedLoginAttempts: user.failed_login_attempts,
            lockoutUntil: user.lockout_until,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString()
        }));
    } catch (error) {
        console.error('Error reading users from PostgreSQL:', error);
        return [];
    }
};

// نوشتن تمام کاربران (برای سازگاری با کد قدیمی)
const writeUsers = async (users) => {
    try {
        if (!pool) {
            console.warn('Database pool not initialized');
            return;
        }
        const client = await pool.connect();
        
        // پاک کردن تمام کاربران موجود
        await client.query('DELETE FROM users');
        
        // اضافه کردن کاربران جدید
        for (const user of users) {
            await createUser(user);
        }
        
        client.release();
        console.log('Users written to PostgreSQL successfully');
    } catch (error) {
        console.error('Error writing users to PostgreSQL:', error);
        throw error;
    }
};

// پیدا کردن کاربر با نام کاربری
const findUserByUsername = async (username) => {
    try {
        if (!pool) {
            console.warn('Database pool not initialized');
            return null;
        }
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        client.release();
        
        if (result.rows.length === 0) return null;
        
        const user = result.rows[0];
        return {
            username: user.username,
            hashedPassword: user.hashed_password,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            gender: user.gender,
            province: user.province,
            neighborhood: user.neighborhood,
            profileImagePath: user.profile_image_path,
            profileCompleted: user.profile_completed,
            initialized: user.initialized,
            lastLogin: user.last_login ? user.last_login.toISOString() : undefined,
            failedLoginAttempts: user.failed_login_attempts,
            lockoutUntil: user.lockout_until,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString()
        };
    } catch (error) {
        console.error('Error finding user by username:', error);
        return null;
    }
};

// به‌روزرسانی کاربر
const updateUser = async (username, updateData) => {
    try {
        if (!pool) {
            console.warn('Database pool not initialized');
            return null;
        }
        const client = await pool.connect();
        
        const setClause = [];
        const values = [];
        let paramCounter = 1;
        
        // ساخت پویا کوئری UPDATE
        Object.keys(updateData).forEach(key => {
            if (key === 'hashedPassword') {
                setClause.push(`hashed_password = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'firstName') {
                setClause.push(`first_name = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'lastName') {
                setClause.push(`last_name = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'profileImagePath') {
                setClause.push(`profile_image_path = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'profileCompleted') {
                setClause.push(`profile_completed = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'failedLoginAttempts') {
                setClause.push(`failed_login_attempts = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'lockoutUntil') {
                setClause.push(`lockout_until = $${paramCounter}`);
                values.push(updateData[key]);
            } else if (key === 'lastLogin') {
                setClause.push(`last_login = $${paramCounter}`);
                values.push(new Date(updateData[key]));
            } else {
                setClause.push(`${key} = $${paramCounter}`);
                values.push(updateData[key]);
            }
            paramCounter++;
        });
        
        setClause.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(username);
        
        const query = `UPDATE users SET ${setClause.join(', ')} WHERE username = $${paramCounter} RETURNING *`;
        
        const result = await client.query(query, values);
        client.release();
        
        if (result.rows.length === 0) return null;
        
        const user = result.rows[0];
        return {
            username: user.username,
            hashedPassword: user.hashed_password,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            gender: user.gender,
            province: user.province,
            neighborhood: user.neighborhood,
            profileImagePath: user.profile_image_path,
            profileCompleted: user.profile_completed,
            initialized: user.initialized,
            lastLogin: user.last_login ? user.last_login.toISOString() : undefined,
            failedLoginAttempts: user.failed_login_attempts,
            lockoutUntil: user.lockout_until,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString()
        };
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// ایجاد کاربر جدید
const createUser = async (userData) => {
    try {
        if (!pool) {
            console.warn('Database pool not initialized');
            return null;
        }
        const client = await pool.connect();
        
        const query = `
            INSERT INTO users (
                username, hashed_password, phone, first_name, last_name, 
                gender, province, neighborhood, profile_image_path, 
                profile_completed, initialized, last_login, 
                failed_login_attempts, lockout_until
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;
        
        const values = [
            userData.username,
            userData.hashedPassword,
            userData.phone,
            userData.firstName || null,
            userData.lastName || null,
            userData.gender || null,
            userData.province || null,
            userData.neighborhood || null,
            userData.profileImagePath || null,
            userData.profileCompleted || false,
            userData.initialized || false,
            userData.lastLogin ? new Date(userData.lastLogin) : null,
            userData.failedLoginAttempts || 0,
            userData.lockoutUntil || null
        ];
        
        const result = await client.query(query, values);
        client.release();
        
        const user = result.rows[0];
        return {
            username: user.username,
            hashedPassword: user.hashed_password,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            gender: user.gender,
            province: user.province,
            neighborhood: user.neighborhood,
            profileImagePath: user.profile_image_path,
            profileCompleted: user.profile_completed,
            initialized: user.initialized,
            lastLogin: user.last_login ? user.last_login.toISOString() : undefined,
            failedLoginAttempts: user.failed_login_attempts,
            lockoutUntil: user.lockout_until,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString()
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

// حذف کاربر
const deleteUser = async (username) => {
    try {
        if (!pool) {
            console.warn('Database pool not initialized');
            return;
        }
        const client = await pool.connect();
        await client.query('DELETE FROM users WHERE username = $1', [username]);
        client.release();
        console.log(`User ${username} deleted successfully`);
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

module.exports = {
    connectDB,
    readUsers,
    writeUsers,
    findUserByUsername,
    updateUser,
    createUser,
    deleteUser
};
