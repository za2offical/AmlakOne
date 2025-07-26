
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { readUsers } = require('./auth');

const plansFilePath = path.join(__dirname, '../data/plans.json');

// خواندن فایل plans.json
async function readPlans() {
  try {
    const data = await fs.readFile(plansFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // اگر فایل وجود نداشت، یک آبجکت خالی برگردان
      return {};
    }
    throw error;
  }
}

// نوشتن فایل plans.json
async function writePlans(plans) {
  await fs.writeFile(plansFilePath, JSON.stringify(plans, null, 2));
}

// به‌روزرسانی plans.json بر اساس users.json
async function syncPlansWithUsers() {
  try {
    const users = await readUsers();
    const plans = await readPlans();
    
    let hasChanges = false;
    
    // برای هر کاربر موجود در users.json
    for (const user of users) {
      // اگر کاربر در plans.json وجود نداشت، اضافه کن با level 0
      if (!plans[user.username]) {
        plans[user.username] = {
          username: user.username,
          level: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        hasChanges = true;
      }
    }
    
    // حذف کاربرانی که در users.json موجود نیستند
    const currentUsernames = users.map(user => user.username);
    for (const username in plans) {
      if (!currentUsernames.includes(username)) {
        delete plans[username];
        hasChanges = true;
      }
    }
    
    // اگر تغییری ایجاد شده، فایل را ذخیره کن
    if (hasChanges) {
      await writePlans(plans);
    }
    
    return plans;
  } catch (error) {
    console.error('خطا در هماهنگ‌سازی plans با users:', error);
    throw error;
  }
}

// دریافت سطح یک کاربر
async function getUserLevel(username) {
  const plans = await syncPlansWithUsers();
  return plans[username] ? plans[username].level : 0;
}

// تنظیم سطح یک کاربر
async function setUserLevel(username, level) {
  // بررسی اعتبار level (باید بین 0 تا 3 باشد)
  if (level < 0 || level > 3 || !Number.isInteger(level)) {
    throw new Error('سطح باید عددی صحیح بین 0 تا 3 باشد');
  }
  
  const plans = await syncPlansWithUsers();
  
  if (!plans[username]) {
    throw new Error('کاربر یافت نشد');
  }
  
  plans[username].level = level;
  plans[username].updated_at = new Date().toISOString();
  
  await writePlans(plans);
  return plans[username];
}

// دریافت تمام plans
async function getAllPlans() {
  return await syncPlansWithUsers();
}

// API Routes

// دریافت تمام plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await getAllPlans();
    res.json(plans);
  } catch (error) {
    console.error('خطا در دریافت plans:', error);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات' });
  }
});

// دریافت سطح یک کاربر خاص
router.get('/plans/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const level = await getUserLevel(username);
    res.json({ username, level });
  } catch (error) {
    console.error('خطا در دریافت سطح کاربر:', error);
    res.status(500).json({ error: 'خطا در دریافت سطح کاربر' });
  }
});

// تنظیم سطح یک کاربر
router.put('/plans/:username', async (req, res) => {
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
router.post('/plans/sync', async (req, res) => {
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

module.exports = {
  router,
  readPlans,
  writePlans,
  syncPlansWithUsers,
  getUserLevel,
  setUserLevel,
  getAllPlans
};
