
const mongoose = require('mongoose');

// اتصال به MongoDB
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/amlakone';
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// اسکیمای کاربر
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    hashedPassword: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    firstName: String,
    lastName: String,
    gender: String,
    province: String,
    neighborhood: String,
    profileImagePath: String,
    profileCompleted: {
        type: Boolean,
        default: false
    },
    initialized: {
        type: Boolean,
        default: false
    },
    lastLogin: Date,
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    lockoutUntil: Number,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false // چون خودمان created_at و updated_at را مدیریت می‌کنیم
});

// میدلور pre-save برای به‌روزرسانی updated_at
userSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

const User = mongoose.model('User', userSchema);

// توابع کمکی برای سازگاری با کد موجود
const readUsers = async () => {
    try {
        const users = await User.find({}).lean();
        return users.map(user => ({
            ...user,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
            lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined
        }));
    } catch (error) {
        console.error('Error reading users from MongoDB:', error);
        return [];
    }
};

const writeUsers = async (users) => {
    try {
        // پاک کردن تمام کاربران موجود
        await User.deleteMany({});
        
        // اضافه کردن کاربران جدید
        const usersToInsert = users.map(user => ({
            ...user,
            created_at: new Date(user.created_at),
            updated_at: new Date(user.updated_at),
            lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
        }));
        
        await User.insertMany(usersToInsert);
        console.log('Users written to MongoDB successfully');
    } catch (error) {
        console.error('Error writing users to MongoDB:', error);
        throw error;
    }
};

const findUserByUsername = async (username) => {
    try {
        const user = await User.findOne({ username }).lean();
        if (!user) return null;
        
        return {
            ...user,
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
            lastLogin: user.lastLogin ? user.lastLogin.toISOString() : undefined
        };
    } catch (error) {
        console.error('Error finding user by username:', error);
        return null;
    }
};

const updateUser = async (username, updateData) => {
    try {
        const result = await User.findOneAndUpdate(
            { username },
            { 
                ...updateData,
                updated_at: new Date()
            },
            { new: true }
        ).lean();
        
        if (!result) return null;
        
        return {
            ...result,
            created_at: result.created_at.toISOString(),
            updated_at: result.updated_at.toISOString(),
            lastLogin: result.lastLogin ? result.lastLogin.toISOString() : undefined
        };
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

const createUser = async (userData) => {
    try {
        const newUser = new User({
            ...userData,
            created_at: new Date(),
            updated_at: new Date()
        });
        
        const savedUser = await newUser.save();
        
        return {
            ...savedUser.toObject(),
            created_at: savedUser.created_at.toISOString(),
            updated_at: savedUser.updated_at.toISOString(),
            lastLogin: savedUser.lastLogin ? savedUser.lastLogin.toISOString() : undefined
        };
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

const deleteUser = async (username) => {
    try {
        await User.findOneAndDelete({ username });
        console.log(`User ${username} deleted successfully`);
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

module.exports = {
    connectDB,
    User,
    readUsers,
    writeUsers,
    findUserByUsername,
    updateUser,
    createUser,
    deleteUser
};
