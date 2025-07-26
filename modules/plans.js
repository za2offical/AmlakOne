
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { readUsers } = require('./auth');

const plansFilePath = path.join(__dirname, '../data/plans.json');
const usersFilePath = path.join(__dirname, '../data/users.json');

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
        console.log(`کاربر جدید ${user.username} به plans اضافه شد`);
      }
    }
    
    // حذف کاربرانی که در users.json موجود نیستند
    const currentUsernames = users.map(user => user.username);
    for (const username in plans) {
      if (!currentUsernames.includes(username)) {
        delete plans[username];
        hasChanges = true;
        console.log(`کاربر ${username} از plans حذف شد`);
      }
    }
    
    // اگر تغییری ایجاد شده، فایل را ذخیره کن
    if (hasChanges) {
      await writePlans(plans);
      console.log('فایل plans.json به‌روزرسانی شد');
    }
    
    return plans;
  } catch (error) {
    console.error('خطا در هماهنگ‌سازی plans با users:', error);
    throw error;
  }
}

// رصد تغییرات فایل users.json و همگام‌سازی خودکار
function startFileWatcher() {
  try {
    // بررسی وجود فایل قبل از شروع رصد
    if (!fsSync.existsSync(usersFilePath)) {
      console.log('فایل users.json موجود نیست، رصدگر منتظر ایجاد فایل است...');
    }

    // رصد تغییرات فایل users.json
    const watcher = fsSync.watch(usersFilePath, { persistent: true }, async (eventType, filename) => {
      if (eventType === 'change' || eventType === 'rename') {
        console.log(`تغییر در فایل users.json تشخیص داده شد (${eventType})`);
        
        // کمی تاخیر برای اطمینان از تکمیل نوشتن فایل
        setTimeout(async () => {
          try {
            await syncPlansWithUsers();
            console.log('همگام‌سازی خودکار plans با users انجام شد');
          } catch (error) {
            console.error('خطا در همگام‌سازی خودکار:', error);
          }
        }, 100);
      }
    });

    // همگام‌سازی دوره‌ای هر 5 ثانیه
    const periodicSync = setInterval(async () => {
      try {
        await syncPlansWithUsers();
        console.log('همگام‌سازی دوره‌ای plans انجام شد');
      } catch (error) {
        console.error('خطا در همگام‌سازی دوره‌ای:', error);
      }
    }, 5000); // هر 5 ثانیه

    console.log('رصدگر فایل users.json شروع شد - plans هم با file watcher و هم هر 5 ثانیه همگام‌سازی می‌شود');
    
    // همگام‌سازی اولیه
    syncPlansWithUsers().then(() => {
      console.log('همگام‌سازی اولیه plans انجام شد');
    }).catch(error => {
      console.error('خطا در همگام‌سازی اولیه:', error);
    });

    return { watcher, periodicSync };
  } catch (error) {
    console.error('خطا در شروع رصدگر فایل:', error);
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

// شروع خودکار رصدگر فایل و همگام‌سازی دوره‌ای
const fileWatcherSystem = startFileWatcher();

module.exports = {
  router,
  readPlans,
  writePlans,
  syncPlansWithUsers,
  getUserLevel,
  setUserLevel,
  getAllPlans,
  startFileWatcher,
  fileWatcherSystem
};
