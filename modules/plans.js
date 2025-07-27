const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { authenticateToken } = require('./auth');
const router = express.Router();
const { readUsers } = require('./database');

const plansFilePath = path.join(__dirname, '../data/plans.json');

// خواندن فایل plans.json
async function readPlans() {
  try {
    const data = await fs.readFile(plansFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
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
    const currentTime = new Date().toISOString();

    // برای هر کاربر موجود در users.json
    for (const user of users) {
      // اگر کاربر در plans.json وجود نداشت، اضافه کن با level 0
      if (!plans[user.username]) {
        const newUserTime = currentTime;
        plans[user.username] = {
          username: user.username,
          level: 0,
          level_changed_at: newUserTime,
          created_at: newUserTime,
          updated_at: newUserTime
        };
        hasChanges = true;
        console.log(`کاربر جدید ${user.username} به plans اضافه شد با زمان ${newUserTime}`);
      } else {
        // اگر کاربر وجود دارد ولی level_changed_at ندارد، اضافه کن
        if (!plans[user.username].level_changed_at) {
          const fallbackTime = plans[user.username].created_at || currentTime;
          plans[user.username].level_changed_at = fallbackTime;
          plans[user.username].updated_at = currentTime;
          hasChanges = true;
          console.log(`زمان تغییر سطح برای کاربر ${user.username} اضافه شد: ${fallbackTime}`);
        }
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
      console.log(`فایل plans.json به‌روزرسانی شد در ${currentTime}`);
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
    if (!fsSync.existsSync(plansFilePath)) {
      console.log('فایل users.json موجود نیست، رصدگر منتظر ایجاد فایل است...');
    }

    const watcher = fsSync.watch(plansFilePath, { persistent: true }, async (eventType, filename) => {
      if (eventType === 'change' || eventType === 'rename') {
        console.log(`تغییر در فایل users.json تشخیص داده شد (${eventType})`);

        setTimeout(async () => {
          try {
            await syncPlansWithUsers();
            console.log('همگام‌سازی خودکار plans انجام شد');
          } catch (error) {
            console.error('خطا در همگام‌سازی خودکار:', error);
          }
        }, 100);
      }
    });

    // همگام‌سازی دوره‌ای هر 10 ثانیه
    const periodicSync = setInterval(async () => {
      try {
        await syncPlansWithUsers();
        console.log('همگام‌سازی دوره‌ای plans انجام شد');
      } catch (error) {
        console.error('خطا در همگام‌سازی دوره‌ای:', error);
      }
    }, 10000);

    console.log('رصدگر فایل users.json شروع شد - plans real-time همگام‌سازی می‌شوند');

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

  const oldLevel = plans[username].level;
  const currentTime = new Date().toISOString();

  // اگر سطح تغییر کرده باشد
  if (oldLevel !== level) {
    // به‌روزرسانی اطلاعات در plans.json
    plans[username].level = level;
    plans[username].level_changed_at = currentTime;
    plans[username].updated_at = currentTime;

    // ذخیره تغییرات در plans.json
    await writePlans(plans);
    console.log(`plans.json به‌روزرسانی شد: کاربر ${username} سطح ${oldLevel} → ${level} در ${currentTime}`);

    console.log(`سطح کاربر ${username} از ${oldLevel} به ${level} تغییر کرد در ${currentTime}`);
  }

  return plans[username];
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