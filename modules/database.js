
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
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )`);

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
                status TEXT DEFAULT 'باز',
                response TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (username) REFERENCES users (username)
            )`);

            // جدول قرارملاقات‌ها
            db.run(`CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'در انتظار تایید',
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
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
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
        db.all("SELECT * FROM products WHERE username = ?", [username], (err, rows) => {
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

// سایر عملیات نیز به همین شکل پیاده‌سازی می‌شوند...
// برای کوتاه نگه داشتن پاسخ، فقط عملیات اصلی را نشان دادم

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
    delete3DRequest
};
