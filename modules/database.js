const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

const connectDB = async () => {
    try {
        const dbPath = path.join(__dirname, '..', 'data', 'amlakone.db');

        console.log('در حال اتصال به SQLite...', dbPath);

        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                throw err;
            }
            console.log('اتصال به SQLite برقرار شد');
        });

        await createTables();
        return db;
    } catch (error) {
        console.error('خطا در اتصال به SQLite:', error.message);
        throw error;
    }
};

const createTables = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // جدول کاربران
            db.run(`CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                hashedPassword TEXT NOT NULL,
                firstName TEXT,
                lastName TEXT,
                gender TEXT,
                phone TEXT,
                province TEXT,
                neighborhood TEXT,
                profileImagePath TEXT,
                profileCompleted BOOLEAN DEFAULT 0,
                failedLoginAttempts INTEGER DEFAULT 0,
                lockoutUntil INTEGER,
                level INTEGER DEFAULT 0,
                level_changed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            // اضافه کردن ستون‌های جدید اگر وجود ندارند
            db.run(`ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.log('خطا در اضافه کردن ستون level:', err.message);
                }
            });

            db.run(`ALTER TABLE users ADD COLUMN level_changed_at TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.log('خطا در اضافه کردن ستون level_changed_at:', err.message);
                }
            });

            db.run(`ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.log('خطا در اضافه کردن ستون created_at:', err.message);
                }
            });

            db.run(`ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.log('خطا در اضافه کردن ستون updated_at:', err.message);
                }
            });

            // جدول محصولات
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                propertyType TEXT,
                bedrooms INTEGER,
                area REAL,
                constructionYear INTEGER,
                images TEXT,
                facilities TEXT,
                privateInfo TEXT,
                description TEXT,
                salePrice INTEGER,
                deposit INTEGER,
                monthlyRent INTEGER,
                allowConversion BOOLEAN DEFAULT 0,
                conversionDeductAmount INTEGER,
                conversionAddAmount INTEGER,
                pricePerMeter REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )`);

            // جدول درخواست‌های 3D
            db.run(`CREATE TABLE IF NOT EXISTS requests_3d (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                productId TEXT,
                videoPath TEXT,
                status TEXT DEFAULT 'در حال بررسی',
                url TEXT,
                submittedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )`);

            // جدول پلن‌ها
            db.run(`CREATE TABLE IF NOT EXISTS plans (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                price INTEGER NOT NULL,
                features TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            // جدول پلن‌های 3D
            db.run(`CREATE TABLE IF NOT EXISTS plans_3d (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                price INTEGER NOT NULL,
                features TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

            // جدول تیکت‌ها
            db.run(`CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                response TEXT,
                priority TEXT DEFAULT 'medium',
                category TEXT DEFAULT 'general',
                messages TEXT,
                assignedTo TEXT,
                resolvedAt TEXT,
                closedAt TEXT,
                tags TEXT,
                attachments TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )`);

            // جدول قرارملاقات‌ها
            db.run(`CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                propertyId TEXT,
                clientName TEXT NOT NULL,
                clientPhone TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                appointmentType TEXT DEFAULT 'consultation',
                notes TEXT,
                propertyAddress TEXT,
                description TEXT,
                status TEXT DEFAULT 'scheduled',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )`);

            // جدول اعلان‌ها
            db.run(`CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )`);

            // جدول ثبت‌نام‌ها
            db.run(`CREATE TABLE IF NOT EXISTS signup (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('جداول SQLite ایجاد شدند');
                    resolve();
                }
            });

            // جدول 3D data
            db.run(`CREATE TABLE IF NOT EXISTS data_3d (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('جدول data_3d ایجاد شد');
                    resolve();
                }
            });
        });
    });
};

const getDB = () => {
    if (!db) {
        throw new Error('دیتابیس هنوز متصل نشده است');
    }
    return db;
};

// Users Operations
const createUser = async (userData) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO users (
            username, hashedPassword, firstName, lastName, gender, 
            phone, province, neighborhood, profileImagePath, 
            profileCompleted, failedLoginAttempts, lockoutUntil,
            level, level_changed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            userData.username,
            userData.hashedPassword,
            userData.firstName || null,
            userData.lastName || null,
            userData.gender || null,
            userData.phone || null,
            userData.province || null,
            userData.neighborhood || null,
            userData.profileImagePath || null,
            userData.profileCompleted ? 1 : 0,
            userData.failedLoginAttempts || 0,
            userData.lockoutUntil || null,
            userData.level || 0,
            userData.level_changed_at || userData.created_at || new Date().toISOString(),
            userData.created_at || new Date().toISOString(),
            userData.updated_at || new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

const getUserByUsername = async (username) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const updateUser = async (username, updateData) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE users SET ${setClause}, updated_at = ? WHERE username = ?`;
        values.push(new Date().toISOString(), username);

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const getAllUsers = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM users", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const deleteUser = async (username) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM users WHERE username = ?", [username], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

// Products Operations
const createProduct = async (username, productData) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO products (
            id, username, propertyType, bedrooms, area, constructionYear,
            images, facilities, privateInfo, description, salePrice,
            deposit, monthlyRent, allowConversion, conversionDeductAmount,
            conversionAddAmount, pricePerMeter, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            productData.id,
            username,
            productData.propertyType,
            productData.bedrooms,
            productData.area,
            productData.constructionYear,
            JSON.stringify(productData.images || []),
            JSON.stringify(productData.facilities || {}),
            JSON.stringify(productData.privateInfo || {}),
            productData.description,
            productData.salePrice || null,
            productData.deposit || null,
            productData.monthlyRent || null,
            productData.allowConversion ? 1 : 0,
            productData.conversionDeductAmount || null,
            productData.conversionAddAmount || null,
            productData.pricePerMeter || null,
            new Date().toISOString(),
            new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

const getProductsByUser = async (username) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error('Database connection is null in getProductsByUser');
            reject(new Error('Database connection is null'));
            return;
        }

        console.log('Executing getProductsByUser for username:', username);
        
        db.all("SELECT * FROM products WHERE username = ?", [username], (err, rows) => {
            if (err) {
                console.error('Database error in getProductsByUser:', err);
                reject(err);
            } else {
                console.log('Raw database rows for user', username, ':', rows);
                
                if (!rows || rows.length === 0) {
                    console.log('No products found for user:', username);
                    resolve([]);
                    return;
                }

                try {
                    const products = rows.map(row => ({
                        ...row,
                        images: JSON.parse(row.images || '[]'),
                        facilities: JSON.parse(row.facilities || '{}'),
                        privateInfo: JSON.parse(row.privateInfo || '{}'),
                        allowConversion: Boolean(row.allowConversion)
                    }));
                    console.log('Processed products for user', username, ':', products.length);
                    resolve(products);
                } catch (parseError) {
                    console.error('Error parsing product data:', parseError);
                    reject(parseError);
                }
            }
        });
    });
};

const getProductById = async (productId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM products WHERE id = ?", [productId], (err, row) => {
            if (err) {
                reject(err);
            } else if (row) {
                const product = {
                    ...row,
                    images: JSON.parse(row.images || '[]'),
                    facilities: JSON.parse(row.facilities || '{}'),
                    privateInfo: JSON.parse(row.privateInfo || '{}'),
                    allowConversion: Boolean(row.allowConversion)
                };
                resolve(product);
            } else {
                resolve(null);
            }
        });
    });
};

const updateProduct = async (productId, updateData) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData).map(value => 
            typeof value === 'object' ? JSON.stringify(value) : value
        );
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE products SET ${setClause}, updated_at = ? WHERE id = ?`;
        values.push(new Date().toISOString(), productId);

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const deleteProduct = async (productId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM products WHERE id = ?", [productId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const getAllProducts = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM products", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const products = rows.map(row => ({
                    ...row,
                    images: JSON.parse(row.images || '[]'),
                    facilities: JSON.parse(row.facilities || '{}'),
                    privateInfo: JSON.parse(row.privateInfo || '{}'),
                    allowConversion: Boolean(row.allowConversion)
                }));
                resolve(products);
            }
        });
    });
};

// 3D Requests Operations
const create3DRequest = async (requestData) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO requests_3d (
            id, username, productId, videoPath, status, url, submittedAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            requestData.id,
            requestData.username,
            requestData.productId,
            requestData.videoPath,
            requestData.status || 'در حال بررسی',
            requestData.url || null,
            new Date().toISOString(),
            new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

const get3DRequests = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM requests_3d ORDER BY submittedAt DESC", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const get3DRequestById = async (requestId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM requests_3d WHERE id = ?", [requestId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

const update3DRequest = async (requestId, updateData) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE requests_3d SET ${setClause}, updatedAt = ? WHERE id = ?`;
        values.push(new Date().toISOString(), requestId);

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const delete3DRequest = async (requestId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM requests_3d WHERE id = ?", [requestId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const closeConnection = async () => {
    return new Promise((resolve) => {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('خطا در بستن اتصال SQLite:', err);
                } else {
                    console.log('اتصال SQLite بسته شد');
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
};

// Tickets Operations
const createTicket = async (ticketData) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO tickets (
            id, username, subject, message, status, response, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            ticketData.id,
            ticketData.createdBy || ticketData.username,
            ticketData.title || ticketData.subject,
            ticketData.description || ticketData.message,
            ticketData.status || 'open',
            ticketData.response || null,
            ticketData.createdAt || new Date().toISOString(),
            ticketData.updatedAt || new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

const getAllTickets = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tickets ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const updateTicket = async (ticketId, updateData) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE tickets SET ${setClause}, updated_at = ? WHERE id = ?`;
        values.push(new Date().toISOString(), ticketId);

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const deleteTicket = async (ticketId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM tickets WHERE id = ?", [ticketId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const getTicketsByUser = async (username) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tickets WHERE username = ? ORDER BY created_at DESC", [username], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getTicketById = async (ticketId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM tickets WHERE id = ?", [ticketId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Appointments Operations
const createAppointment = async (appointmentData) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO appointments (
            id, username, date, time, description, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        stmt.run([
            appointmentData.id,
            appointmentData.agentUsername || appointmentData.username,
            appointmentData.appointmentDate || appointmentData.date,
            appointmentData.appointmentTime || appointmentData.time,
            appointmentData.notes || appointmentData.description,
            appointmentData.status || 'در انتظار تایید',
            appointmentData.createdAt || new Date().toISOString(),
            appointmentData.updatedAt || new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

const getAllAppointments = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM appointments ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getAppointmentsByUser = async (username) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM appointments WHERE username = ? ORDER BY created_at DESC", [username], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const updateAppointment = async (appointmentId, updateData) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE appointments SET ${setClause} WHERE id = ?`;
        values.push(appointmentId);

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const deleteAppointment = async (appointmentId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM appointments WHERE id = ?", [appointmentId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

// Notifications Operations
const createNotification = async (notificationData) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO notifications (
            id, username, title, message, read, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`);

        stmt.run([
            notificationData.id,
            notificationData.username || 'all',
            notificationData.title,
            notificationData.message,
            0,
            notificationData.sentAt || notificationData.created_at || new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

// Notifications Operations
const getAllNotifications = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM notifications ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getNotificationsByUser = async (username) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM notifications WHERE username = ? OR username = 'all' ORDER BY created_at DESC", [username], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const updateNotification = async (notificationId, updateData) => {
    return new Promise((resolve, reject) => {
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE notifications SET ${setClause} WHERE id = ?`;
        values.push(notificationId);

        db.run(query, values, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

const deleteNotification = async (notificationId) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM notifications WHERE id = ?", [notificationId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

// Signup Operations
const createSignupEntry = async (phone) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT INTO signup (
            id, username, phone, created_at
        ) VALUES (?, ?, ?, ?)`);

        const id = Date.now().toString();
        stmt.run([
            id,
            phone,
            phone,
            new Date().toISOString()
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ insertedId: this.lastID });
            }
        });
        stmt.finalize();
    });
};

const getAllSignupEntries = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM signup ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const deleteSignupEntry = async (phone) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM signup WHERE phone = ?", [phone], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

// 3D Data operations
const create3DData = async (key, value) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO data_3d (key, value) VALUES (?, ?)');
        stmt.run([key, JSON.stringify(value)], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, key, value });
            }
        });
    });
};

const get3DDataByKey = async (key) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM data_3d WHERE key = ?", [key], (err, row) => {
            if (err) {
                reject(err);
            } else {
                if (row) {
                    row.value = JSON.parse(row.value);
                }
                resolve(row);
            }
        });
    });
};

const getAll3DData = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM data_3d ORDER BY created_at DESC", [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const data = {};
                rows.forEach(row => {
                    data[row.key] = JSON.parse(row.value);
                });
                resolve(data);
            }
        });
    });
};

const update3DData = async (key, value) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('UPDATE data_3d SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
        stmt.run([JSON.stringify(value), key], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ key, value, changes: this.changes });
            }
        });
    });
};

const upsert3DData = async (key, value) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO data_3d (key, value) 
            VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET 
                value = excluded.value,
                updated_at = CURRENT_TIMESTAMP
        `);
        stmt.run([key, JSON.stringify(value)], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ key, value, id: this.lastID });
            }
        });
    });
};

const delete3DData = async (key) => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM data_3d WHERE key = ?", [key], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

module.exports = {
    connectDB,
    getDB,
    closeConnection,

    // Users
    createUser,
    getUserByUsername,
    updateUser,
    getAllUsers,
    deleteUser,

    // Products
    createProduct,
    getProductsByUser,
    getProductById,
    updateProduct,
    deleteProduct,
    getAllProducts,

    // 3D Requests
    create3DRequest,
    get3DRequests,
    get3DRequestById,
    update3DRequest,
    delete3DRequest,

    // Tickets
    createTicket,
    getAllTickets,
    updateTicket,
    deleteTicket,
    getTicketsByUser,
    getTicketById,

    // Appointments
    createAppointment,
    getAllAppointments,
    getAppointmentsByUser,
    updateAppointment,
    deleteAppointment,

    // Notifications
    createNotification,
    getAllNotifications,
    getNotificationsByUser,
    updateNotification,
    deleteNotification,

    // Signup
    createSignupEntry,
    getAllSignupEntries,
    deleteSignupEntry,

    // 3D Data operations
    create3DData,
    get3DDataByKey,
    getAll3DData,
    update3DData,
    upsert3DData,
    delete3DData
};