
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { readUsers } = require('./auth');

const plansFilePath = path.join(__dirname, '../data/plans.json');
const usersFilePath = path.join(__dirname, '../data/users.json');
const productsDir = path.join(__dirname, '../data/products');

// محدودیت‌های محصول بر اساس سطح
const LEVEL_LIMITS = {
  0: 20,
  1: 35,
  2: 60,
  3: null // unlimited
};

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

// اعمال محدودیت محصول برای کاربر در real-time
async function applyProductLimitToUser(username, level, levelChangedAt = null) {
  try {
    const limit = LEVEL_LIMITS[level];
    const userProductsPath = path.join(productsDir, `${username}.json`);
    const currentTime = levelChangedAt || new Date().toISOString();
    
    // بررسی وجود فایل محصولات کاربر
    try {
      await fs.access(userProductsPath);
    } catch {
      // فایل وجود ندارد، فایل خالی ایجاد کن
      const emptyData = { 
        products: [],
        user_level: level,
        level_changed_at: currentTime,
        product_limit: limit,
        total_products_created: 0 // تعداد کل آگهی‌های ایجاد شده
      };
      await fs.writeFile(userProductsPath, JSON.stringify(emptyData, null, 2));
      console.log(`فایل محصولات برای کاربر ${username} ایجاد شد با سطح ${level} در زمان ${currentTime}`);
      return;
    }

    const userProductsData = await fs.readFile(userProductsPath, 'utf8');
    const userData = JSON.parse(userProductsData);

    if (!userData.products || !Array.isArray(userData.products)) {
      userData.products = [];
    }

    // اضافه کردن فیلد total_products_created اگر وجود نداشته باشد
    if (typeof userData.total_products_created !== 'number') {
      userData.total_products_created = userData.products.length;
    }

    // بررسی تغییر سطح و ثبت زمان دقیق
    const oldLevel = userData.user_level;
    const levelChanged = oldLevel !== level;
    
    // به‌روزرسانی اطلاعات سطح کاربر در فایل محصولات
    userData.user_level = level;
    userData.product_limit = limit;
    
    // اگر سطح تغییر کرده باشد، زمان تغییر را ثبت کن
    if (levelChanged) {
      userData.level_changed_at = currentTime;
      console.log(`فایل محصولات کاربر ${username} به‌روزرسانی شد: سطح ${oldLevel} → ${level} در ${currentTime}`);
    } else if (levelChangedAt) {
      // اگر زمان از بیرون ارسال شده، آن را ثبت کن
      userData.level_changed_at = levelChangedAt;
    }

    // اگر unlimited نباشد و تعداد محصولات از حد مجاز بیشتر باشد
    if (limit !== null && userData.products.length > limit) {
      // نگه‌داری جدیدترین محصولات (بر اساس created_at)
      userData.products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const removedProducts = userData.products.slice(limit);
      userData.products = userData.products.slice(0, limit);
      
      console.log(`محصولات کاربر ${username} از ${userData.products.length + removedProducts.length} به ${limit} عدد محدود شد`);
    }
    
    await fs.writeFile(userProductsPath, JSON.stringify(userData, null, 2));
    console.log(`فایل محصولات کاربر ${username} با محدودیت ${limit === null ? 'نامحدود' : limit} ذخیره شد`);
  } catch (error) {
    console.error(`خطا در اعمال محدودیت محصول برای ${username}:`, error);
  }
}

// اعمال محدودیت برای تمام کاربران
async function applyLimitsToAllUsers() {
  try {
    const plans = await readPlans();
    
    for (const username in plans) {
      const userPlan = plans[username];
      await applyProductLimitToUser(username, userPlan.level, userPlan.level_changed_at);
    }
    
    console.log('محدودیت‌ها برای تمام کاربران اعمال شد');
  } catch (error) {
    console.error('خطا در اعمال محدودیت‌ها:', error);
  }
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
        
        // اعمال محدودیت محصول با زمان دقیق
        await applyProductLimitToUser(user.username, 0, newUserTime);
      } else {
        // بررسی تغییر سطح نسبت به فایل محصولات کاربر
        const userProductsPath = path.join(productsDir, `${user.username}.json`);
        let previousLevel = null;
        
        try {
          const userProductsData = await fs.readFile(userProductsPath, 'utf8');
          const userData = JSON.parse(userProductsData);
          previousLevel = userData.user_level;
        } catch (error) {
          // اگر فایل محصولات وجود نداشت، سطح قبلی را 0 در نظر بگیر
          previousLevel = 0;
        }
        
        const currentLevel = plans[user.username].level;
        
        // اگر سطح تغییر کرده باشد (تغییر دستی)
        if (previousLevel !== null && previousLevel !== currentLevel) {
          plans[user.username].level_changed_at = currentTime;
          plans[user.username].updated_at = currentTime;
          hasChanges = true;
          console.log(`تشخیص تغییر دستی سطح: کاربر ${user.username} سطح ${previousLevel} → ${currentLevel} در ${currentTime}`);
          
          // اعمال محدودیت محصول جدید با زمان جدید
          await applyProductLimitToUser(user.username, currentLevel, currentTime);
        }
        
        // اگر کاربر وجود دارد ولی level_changed_at ندارد، اضافه کن
        if (!plans[user.username].level_changed_at) {
          const fallbackTime = plans[user.username].created_at || currentTime;
          plans[user.username].level_changed_at = fallbackTime;
          plans[user.username].updated_at = currentTime;
          hasChanges = true;
          console.log(`زمان تغییر سطح برای کاربر ${user.username} اضافه شد: ${fallbackTime}`);
          
          // همگام‌سازی زمان در فایل محصولات کاربر
          await applyProductLimitToUser(user.username, plans[user.username].level, fallbackTime);
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
    if (!fsSync.existsSync(usersFilePath)) {
      console.log('فایل users.json موجود نیست، رصدگر منتظر ایجاد فایل است...');
    }

    const watcher = fsSync.watch(usersFilePath, { persistent: true }, async (eventType, filename) => {
      if (eventType === 'change' || eventType === 'rename') {
        console.log(`تغییر در فایل users.json تشخیص داده شد (${eventType})`);
        
        setTimeout(async () => {
          try {
            await syncPlansWithUsers();
            await applyLimitsToAllUsers();
            console.log('همگام‌سازی خودکار plans و اعمال محدودیت‌ها انجام شد');
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
        await applyLimitsToAllUsers();
        console.log('همگام‌سازی دوره‌ای plans و اعمال محدودیت‌ها انجام شد');
      } catch (error) {
        console.error('خطا در همگام‌سازی دوره‌ای:', error);
      }
    }, 10000);

    console.log('رصدگر فایل users.json شروع شد - plans و محدودیت‌ها real-time اعمال می‌شوند');
    
    // همگام‌سازی اولیه
    syncPlansWithUsers().then(async () => {
      await applyLimitsToAllUsers();
      console.log('همگام‌سازی اولیه plans و اعمال محدودیت‌ها انجام شد');
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

// دریافت محدودیت محصول کاربر (از LEVEL_LIMITS)
async function getUserProductLimit(username) {
  const plans = await syncPlansWithUsers();
  if (!plans[username]) return LEVEL_LIMITS[0];
  return LEVEL_LIMITS[plans[username].level];
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
    
    // اعمال محدودیت محصول جدید در real-time با زمان دقیق
    await applyProductLimitToUser(username, level, currentTime);
    
    console.log(`سطح کاربر ${username} از ${oldLevel} به ${level} تغییر کرد در ${currentTime} و محدودیت‌ها اعمال شد`);
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

// دریافت محدودیت محصول کاربر
router.get('/:username/limit', async (req, res) => {
  try {
    const { username } = req.params;
    const limit = await getUserProductLimit(username);
    res.json({ username, product_limit: limit });
  } catch (error) {
    console.error('خطا در دریافت محدودیت محصول:', error);
    res.status(500).json({ error: 'خطا در دریافت محدودیت محصول' });
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
      message: 'سطح کاربر با موفقیت به‌روزرسانی شد و محدودیت‌ها اعمال شد',
      plan: updatedPlan 
    });
  } catch (error) {
    console.error('خطا در تنظیم سطح کاربر:', error);
    res.status(400).json({ error: error.message });
  }
});

// بررسی محدودیت برای ایجاد آگهی جدید
router.get('/check-limit', require('./auth').authenticateToken, async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ error: 'کاربر احراز هویت نشده است' });
    }

    const userProductsPath = path.join(productsDir, `${username}.json`);
    
    // خواندن اطلاعات کاربر
    let userData;
    try {
      const data = await fs.readFile(userProductsPath, 'utf8');
      userData = JSON.parse(data);
    } catch (error) {
      // اگر فایل وجود ندارد، کاربر جدید است
      const plans = await syncPlansWithUsers();
      const userLevel = plans[username]?.level || 0;
      const limit = LEVEL_LIMITS[userLevel];
      
      userData = {
        products: [],
        user_level: userLevel,
        product_limit: limit,
        total_products_created: 0
      };
    }

    const limit = userData.product_limit;
    const totalCreated = userData.total_products_created || 0;
    
    // بررسی محدودیت
    if (limit !== null && totalCreated >= limit) {
      return res.status(403).json({
        error: `شما به حد مجاز ایجاد آگهی رسیده‌اید (${limit} آگهی)`,
        canCreate: false,
        used: totalCreated,
        limit: limit,
        planInfo: {
          plan: { name: `سطح ${userData.user_level}` }
        }
      });
    }

    // اگر مجاز است
    const plans = await syncPlansWithUsers();
    const userPlan = plans[username];
    res.json({
      canCreate: true,
      used: totalCreated,
      limit: limit,
      plan: { name: `سطح ${userData.user_level}` }
    });

  } catch (error) {
    console.error('خطا در بررسی محدودیت:', error);
    res.status(500).json({ error: 'خطا در بررسی محدودیت' });
  }
});

// هماهنگ‌سازی دستی plans با users
router.post('/sync', async (req, res) => {
  try {
    const plans = await syncPlansWithUsers();
    await applyLimitsToAllUsers();
    res.json({ 
      message: 'هماهنگ‌سازی و اعمال محدودیت‌ها با موفقیت انجام شد',
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
  getUserProductLimit,
  setUserLevel,
  getAllPlans,
  startFileWatcher,
  fileWatcherSystem,
  LEVEL_LIMITS,
  applyProductLimitToUser,
  applyLimitsToAllUsers
};
