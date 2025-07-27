const express = require('express');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('./auth');
const router = express.Router();
const { getAllUsers, getUserByUsername, updateUser, getDB } = require('./database');

// خواندن plans از دیتابیس
async function readPlans() {
  try {
    const users = await getAllUsers();
    const plans = {};
    
    for (const user of users) {
      plans[user.username] = {
        username: user.username,
        level: user.level || 0,
        level_changed_at: user.level_changed_at || user.created_at,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    }
    
    return plans;
  } catch (error) {
    return {};
  }
}

// نوشتن plans در دیتابیس (این تابع دیگر مورد استفاده قرار نمی‌گیرد)
async function writePlans(plans) {
  // این تابع برای سازگاری باقی می‌ماند
  return true;
}

// به‌روزرسانی plans از دیتابیس
async function syncPlansWithUsers() {
  try {
    // بررسی اینکه دیتابیس متصل است
    const db = getDB();
    if (!db) {
      console.log('دیتابیس هنوز متصل نشده است');
      return {};
    }

    const users = await getAllUsers();
    const plans = {};
    const currentTime = new Date().toISOString();

    // برای هر کاربر موجود در دیتابیس
    for (const user of users) {
      // اگر کاربر level ندارد، به 0 تنظیم کن
      if (user.level === undefined || user.level === null) {
        await updateUser(user.username, { 
          level: 0, 
          level_changed_at: user.created_at || currentTime 
        });
        console.log(`سطح کاربر ${user.username} به 0 تنظیم شد`);
      }

      plans[user.username] = {
        username: user.username,
        level: user.level || 0,
        level_changed_at: user.level_changed_at || user.created_at,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    }

    return plans;
  } catch (error) {
    console.error('خطا در هماهنگ‌سازی plans با users:', error);
    return {};
  }
}

// همگام‌سازی اولیه plans
async function initializePlans() {
  try {
    // صبر کنیم تا دیتابیس متصل شود
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
      try {
        const db = getDB();
        if (db) {
          await syncPlansWithUsers();
          console.log('همگام‌سازی اولیه plans انجام شد');
          return;
        }
      } catch (error) {
        // دیتابیس هنوز آماده نیست
      }
      
      retryCount++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 ثانیه صبر
    }
    
    console.log('عدم موفقیت در اتصال به دیتابیس برای همگام‌سازی plans');
  } catch (error) {
    console.error('خطا در همگام‌سازی اولیه:', error);
  }
}

// دریافت سطح یک کاربر
async function getUserLevel(username) {
  try {
    const plans = await syncPlansWithUsers();
    return plans[username] ? plans[username].level : 0;
  } catch (error) {
    console.error('خطا در دریافت سطح کاربر:', error);
    return 0;
  }
}

// تنظیم سطح یک کاربر
async function setUserLevel(username, level) {
  // بررسی اعتبار level (باید بین 0 تا 3 باشد)
  if (level < 0 || level > 3 || !Number.isInteger(level)) {
    throw new Error('سطح باید عددی صحیح بین 0 تا 3 باشد');
  }

  const user = await getUserByUsername(username);

  if (!user) {
    throw new Error('کاربر یافت نشد');
  }

  const oldLevel = user.level || 0;
  const currentTime = new Date().toISOString();

  // اگر سطح تغییر کرده باشد
  if (oldLevel !== level) {
    // به‌روزرسانی اطلاعات در دیتابیس
    await updateUser(username, {
      level: level,
      level_changed_at: currentTime,
      updated_at: currentTime
    });

    console.log(`سطح کاربر ${username} از ${oldLevel} به ${level} تغییر کرد در ${currentTime}`);
  }

  const updatedUser = await getUserByUsername(username);
  return {
    username: updatedUser.username,
    level: updatedUser.level,
    level_changed_at: updatedUser.level_changed_at,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at
  };
}

// دریافت تمام plans
async function getAllPlans() {
  return await syncPlansWithUsers();
}

// API Routes

// دریافت تمام plans
router.get('/', async (req, res) => {
  try {
    const plans = await getAllPlans();
    res.json(plans);
  } catch (error) {
    console.error('خطا در دریافت plans:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
  }
});

// دریافت سطح یک کاربر خاص
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const plans = await syncPlansWithUsers();
    const userPlan = plans[username];

    if (!userPlan) {
      return res.status(404).json({ error: 'کاربر یافت نشد' });
    }

    res.json(userPlan);
  } catch (error) {
    console.error('خطا در دریافت سطح کاربر:', error);
    res.status(500).json({ error: 'خطا در دریافت سطح کاربر' });
  }
});

// تنظیم سطح یک کاربر
router.put('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { level } = req.body;

    if (level === undefined) {
      return res.status(400).json({ error: 'level ضروری است' });
    }

    const updatedPlan = await setUserLevel(username, level);
    res.json({ 
      message: 'سطح کاربر با موفقیت به‌روزرسانی شد',
      plan: updatedPlan 
    });
  } catch (error) {
    console.error('خطا در تنظیم سطح کاربر:', error);
    res.status(400).json({ error: error.message });
  }
});

// هماهنگ‌سازی دستی plans با users
router.post('/sync', async (req, res) => {
  try {
    const plans = await syncPlansWithUsers();
    res.json({ 
      message: 'هماهنگ‌سازی با موفقیت انجام شد',
      plans 
    });
  } catch (error) {
    console.error('خطا در هماهنگ‌سازی:', error);
    res.status(500).json({ error: 'خطا در هماهنگ‌سازی' });
  }
});

// اجرای همگام‌سازی اولیه
initializePlans();

module.exports = {
  router,
  readPlans,
  writePlans,
  syncPlansWithUsers,
  getUserLevel,
  setUserLevel,
  getAllPlans,
  initializePlans
};