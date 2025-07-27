
const { MongoClient } = require('mongodb');

let db;
let client;

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        const dbName = process.env.DB_NAME || 'amlakone_db';
        
        client = new MongoClient(uri);
        await client.connect();
        db = client.db(dbName);
        
        console.log('اتصال به MongoDB برقرار شد');
        return db;
    } catch (error) {
        console.error('خطا در اتصال به MongoDB:', error);
        throw error;
    }
};

const getDB = () => {
    if (!db) {
        throw new Error('دیتابیس هنوز متصل نشده است');
    }
    return db;
};

// Users Collection Operations
const createUser = async (userData) => {
    const users = db.collection('users');
    return await users.insertOne(userData);
};

const getUserByUsername = async (username) => {
    const users = db.collection('users');
    return await users.findOne({ username });
};

const updateUser = async (username, updateData) => {
    const users = db.collection('users');
    return await users.updateOne({ username }, { $set: updateData });
};

const getAllUsers = async () => {
    const users = db.collection('users');
    return await users.find({}).toArray();
};

const deleteUser = async (username) => {
    const users = db.collection('users');
    return await users.deleteOne({ username });
};

// Products Collection Operations
const createProduct = async (username, productData) => {
    const products = db.collection('products');
    const productWithUser = {
        ...productData,
        username,
        created_at: new Date(),
        updated_at: new Date()
    };
    return await products.insertOne(productWithUser);
};

const getProductsByUser = async (username) => {
    const products = db.collection('products');
    return await products.find({ username }).toArray();
};

const getProductById = async (productId) => {
    const products = db.collection('products');
    return await products.findOne({ id: productId });
};

const updateProduct = async (productId, updateData) => {
    const products = db.collection('products');
    return await products.updateOne(
        { id: productId }, 
        { $set: { ...updateData, updated_at: new Date() } }
    );
};

const deleteProduct = async (productId) => {
    const products = db.collection('products');
    return await products.deleteOne({ id: productId });
};

const getAllProducts = async () => {
    const products = db.collection('products');
    return await products.find({}).toArray();
};

// 3D Requests Collection Operations
const create3DRequest = async (requestData) => {
    const requests3D = db.collection('requests_3d');
    const requestWithTimestamp = {
        ...requestData,
        submittedAt: new Date(),
        updatedAt: new Date()
    };
    return await requests3D.insertOne(requestWithTimestamp);
};

const get3DRequests = async () => {
    const requests3D = db.collection('requests_3d');
    return await requests3D.find({}).toArray();
};

const get3DRequestById = async (requestId) => {
    const requests3D = db.collection('requests_3d');
    return await requests3D.findOne({ id: requestId });
};

const update3DRequest = async (requestId, updateData) => {
    const requests3D = db.collection('requests_3d');
    return await requests3D.updateOne(
        { id: requestId }, 
        { $set: { ...updateData, updatedAt: new Date() } }
    );
};

const delete3DRequest = async (requestId) => {
    const requests3D = db.collection('requests_3d');
    return await requests3D.deleteOne({ id: requestId });
};

// Plans Collection Operations
const createPlan = async (planData) => {
    const plans = db.collection('plans');
    return await plans.insertOne(planData);
};

const getAllPlans = async () => {
    const plans = db.collection('plans');
    return await plans.find({}).toArray();
};

const getPlanById = async (planId) => {
    const plans = db.collection('plans');
    return await plans.findOne({ id: planId });
};

const updatePlan = async (planId, updateData) => {
    const plans = db.collection('plans');
    return await plans.updateOne({ id: planId }, { $set: updateData });
};

const deletePlan = async (planId) => {
    const plans = db.collection('plans');
    return await plans.deleteOne({ id: planId });
};

// 3D Plans Collection Operations
const create3DPlan = async (planData) => {
    const plans3D = db.collection('plans_3d');
    return await plans3D.insertOne(planData);
};

const getAll3DPlans = async () => {
    const plans3D = db.collection('plans_3d');
    return await plans3D.find({}).toArray();
};

const get3DPlanById = async (planId) => {
    const plans3D = db.collection('plans_3d');
    return await plans3D.findOne({ id: planId });
};

const update3DPlan = async (planId, updateData) => {
    const plans3D = db.collection('plans_3d');
    return await plans3D.updateOne({ id: planId }, { $set: updateData });
};

const delete3DPlan = async (planId) => {
    const plans3D = db.collection('plans_3d');
    return await plans3D.deleteOne({ id: planId });
};

// Tickets Collection Operations
const createTicket = async (ticketData) => {
    const tickets = db.collection('tickets');
    const ticketWithTimestamp = {
        ...ticketData,
        created_at: new Date(),
        updated_at: new Date()
    };
    return await tickets.insertOne(ticketWithTimestamp);
};

const getAllTickets = async () => {
    const tickets = db.collection('tickets');
    return await tickets.find({}).toArray();
};

const getTicketById = async (ticketId) => {
    const tickets = db.collection('tickets');
    return await tickets.findOne({ id: ticketId });
};

const updateTicket = async (ticketId, updateData) => {
    const tickets = db.collection('tickets');
    return await tickets.updateOne(
        { id: ticketId }, 
        { $set: { ...updateData, updated_at: new Date() } }
    );
};

const deleteTicket = async (ticketId) => {
    const tickets = db.collection('tickets');
    return await tickets.deleteOne({ id: ticketId });
};

// Appointments Collection Operations
const createAppointment = async (appointmentData) => {
    const appointments = db.collection('appointments');
    const appointmentWithTimestamp = {
        ...appointmentData,
        created_at: new Date(),
        updated_at: new Date()
    };
    return await appointments.insertOne(appointmentWithTimestamp);
};

const getAllAppointments = async () => {
    const appointments = db.collection('appointments');
    return await appointments.find({}).toArray();
};

const getAppointmentById = async (appointmentId) => {
    const appointments = db.collection('appointments');
    return await appointments.findOne({ id: appointmentId });
};

const updateAppointment = async (appointmentId, updateData) => {
    const appointments = db.collection('appointments');
    return await appointments.updateOne(
        { id: appointmentId }, 
        { $set: { ...updateData, updated_at: new Date() } }
    );
};

const deleteAppointment = async (appointmentId) => {
    const appointments = db.collection('appointments');
    return await appointments.deleteOne({ id: appointmentId });
};

// Notifications Collection Operations
const createNotification = async (notificationData) => {
    const notifications = db.collection('notifications');
    const notificationWithTimestamp = {
        ...notificationData,
        created_at: new Date(),
        read: false
    };
    return await notifications.insertOne(notificationWithTimestamp);
};

const getAllNotifications = async () => {
    const notifications = db.collection('notifications');
    return await notifications.find({}).toArray();
};

const getNotificationsByUser = async (username) => {
    const notifications = db.collection('notifications');
    return await notifications.find({ username }).toArray();
};

const markNotificationAsRead = async (notificationId) => {
    const notifications = db.collection('notifications');
    return await notifications.updateOne(
        { id: notificationId }, 
        { $set: { read: true } }
    );
};

const deleteNotification = async (notificationId) => {
    const notifications = db.collection('notifications');
    return await notifications.deleteOne({ id: notificationId });
};

// Signup Collection Operations
const createSignupEntry = async (signupData) => {
    const signup = db.collection('signup');
    const signupWithTimestamp = {
        ...signupData,
        created_at: new Date()
    };
    return await signup.insertOne(signupWithTimestamp);
};

const getAllSignupEntries = async () => {
    const signup = db.collection('signup');
    return await signup.find({}).toArray();
};

const closeConnection = async () => {
    if (client) {
        await client.close();
        console.log('اتصال MongoDB بسته شد');
    }
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
    
    // Plans
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    
    // 3D Plans
    create3DPlan,
    getAll3DPlans,
    get3DPlanById,
    update3DPlan,
    delete3DPlan,
    
    // Tickets
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    
    // Appointments
    createAppointment,
    getAllAppointments,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    
    // Notifications
    createNotification,
    getAllNotifications,
    getNotificationsByUser,
    markNotificationAsRead,
    deleteNotification,
    
    // Signup
    createSignupEntry,
    getAllSignupEntries
};
