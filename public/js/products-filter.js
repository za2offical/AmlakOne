
// ماژول فیلتر محصولات

// انواع فیلتر
const FILTER_TYPES = {
    ALL: 'all',
    RENT: 'rent', 
    SALE: 'sale'
};

// فیلتر فعلی
let currentFilter = FILTER_TYPES.ALL;

// آرایه تمام محصولات
let allProducts = [];

// تنظیم فیلتر فعلی
function setFilter(filterType) {
    currentFilter = filterType;
    updateFilterButtons();
    filterProducts();
}

// به‌روزرسانی ظاهر دکمه‌ها
function updateFilterButtons() {
    // حذف کلاس active از همه دکمه‌ها
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // اضافه کردن کلاس active به دکمه فعلی
    const activeBtn = document.querySelector(`[data-filter="${currentFilter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// فیلتر کردن محصولات
function filterProducts() {
    const container = document.getElementById('productsContainer');
    
    // پاک کردن محتویات فعلی
    container.innerHTML = '';
    
    // فیلتر کردن بر اساس نوع انتخاب شده
    let filteredProducts = [];
    
    switch(currentFilter) {
        case FILTER_TYPES.ALL:
            filteredProducts = allProducts;
            break;
        case FILTER_TYPES.RENT:
            filteredProducts = allProducts.filter(product => {
                return product.deposit || product.monthlyRent;
            });
            break;
        case FILTER_TYPES.SALE:
            filteredProducts = allProducts.filter(product => {
                return product.salePrice;
            });
            break;
    }
    
    // نمایش محصولات فیلتر شده
    if (filteredProducts.length > 0) {
        container.style.display = 'grid';
        document.getElementById('noProducts').style.display = 'none';
        
        filteredProducts.forEach(product => {
            container.appendChild(createProductCard(product));
        });
    } else {
        container.style.display = 'none';
        document.getElementById('noProducts').style.display = 'block';
        
        // تغییر متن بر اساس فیلتر
        const noProductsDiv = document.getElementById('noProducts');
        const filterText = currentFilter === FILTER_TYPES.RENT ? 'اجاره' : 
                          currentFilter === FILTER_TYPES.SALE ? 'فروش' : '';
        
        if (filterText) {
            noProductsDiv.innerHTML = `
                <h3>محصولی برای ${filterText} یافت نشد</h3>
                <p>این کاربر محصولی برای ${filterText} اضافه نکرده است.</p>
            `;
        } else {
            noProductsDiv.innerHTML = `
                <h3>محصولی یافت نشد</h3>
                <p>این کاربر هنوز محصولی اضافه نکرده است.</p>
            `;
        }
    }
}

// ذخیره محصولات و تنظیم فیلتر اولیه
function initializeFilter(products) {
    allProducts = products;
    currentFilter = FILTER_TYPES.ALL;
    updateFilterButtons();
}

// تنظیم event listener ها برای دکمه‌ها
function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.getAttribute('data-filter');
            setFilter(filterType);
        });
    });
}

// متغیرهای فیلتر پیشرفته
let advancedFilterActive = false;
let advancedFilterConfig = null;

// تبدیل رشته قیمت به عدد
function parsePrice(priceString) {
    if (!priceString || priceString.trim() === '') return 0;
    // حذف کاما و تبدیل به عدد
    const cleanString = priceString.replace(/[,،]/g, '');
    return parseInt(cleanString) || 0;
}

// فرمت کردن ورودی قیمت
function formatPriceInput(input) {
    // دریافت موقعیت cursor
    const cursorPosition = input.selectionStart;
    const oldLength = input.value.length;
    
    // حذف همه چیز به جز اعداد
    let value = input.value.replace(/[^0-9]/g, '');
    
    if (value) {
        // تبدیل به عدد و سپس اضافه کردن کاما
        const numericValue = parseInt(value);
        const formattedValue = numericValue.toLocaleString('en-US');
        input.value = formattedValue;
        
        // تنظیم مجدد موقعیت cursor
        const newLength = input.value.length;
        const lengthDiff = newLength - oldLength;
        const newCursorPosition = cursorPosition + lengthDiff;
        
        // تنظیم cursor با تأخیر کوتاه
        setTimeout(() => {
            input.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    }
}

// تنظیم event listener ها برای ورودی قیمت
function setupPriceInputs() {
    const priceInputs = document.querySelectorAll('.price-input');
    priceInputs.forEach(input => {
        // حذف event listener های قبلی
        input.removeEventListener('input', formatPriceInput);
        input.removeEventListener('keyup', formatPriceInput);
        
        // اضافه کردن event listener جدید
        input.addEventListener('input', function() {
            formatPriceInput(this);
        });
        
        input.addEventListener('keyup', function() {
            formatPriceInput(this);
        });
        
        // فرمت کردن مقدار اولیه در صورت وجود
        if (input.value) {
            formatPriceInput(input);
        }
    });
}

// تغییر نوع فیلتر پیشرفته
function changeAdvancedFilterType() {
    const budgetRadio = document.querySelector('input[name="advancedFilterType"][value="budget"]');
    const simpleRadio = document.querySelector('input[name="advancedFilterType"][value="simple"]');
    const budgetFilter = document.getElementById('budgetFilter');
    const simpleFilter = document.getElementById('simpleFilter');
    
    if (budgetRadio.checked) {
        budgetFilter.style.display = 'block';
        simpleFilter.style.display = 'none';
    } else {
        budgetFilter.style.display = 'none';
        simpleFilter.style.display = 'block';
    }
}

// تغییر نوع معامله در فیلتر بودجه
function changeBudgetType() {
    const budgetType = document.getElementById('budgetType').value;
    const saleFields = document.getElementById('saleBudgetFields');
    const rentFields = document.getElementById('rentBudgetFields');
    
    if (budgetType === 'sale') {
        saleFields.style.display = 'block';
        rentFields.style.display = 'none';
    } else {
        saleFields.style.display = 'none';
        rentFields.style.display = 'block';
    }
}

// باز کردن پنل فیلتر پیشرفته
function toggleAdvancedFilter() {
    const panel = document.getElementById('advancedFilterPanel');
    panel.style.display = 'flex';
    
    // تنظیم event listener ها
    setupPriceInputs();
    
    document.querySelectorAll('input[name="advancedFilterType"]').forEach(radio => {
        radio.addEventListener('change', changeAdvancedFilterType);
    });
    
    document.getElementById('budgetType').addEventListener('change', changeBudgetType);
    
    // تنظیم اولیه
    changeAdvancedFilterType();
    changeBudgetType();
}

// بستن پنل فیلتر پیشرفته
function closeAdvancedFilter() {
    document.getElementById('advancedFilterPanel').style.display = 'none';
}

// پاک کردن فیلتر پیشرفته
function resetAdvancedFilter() {
    // پاک کردن فیلدها
    document.getElementById('saleBudget').value = '';
    document.getElementById('depositBudget').value = '';
    document.getElementById('rentBudget').value = '';
    document.getElementById('minArea').value = '';
    document.getElementById('maxArea').value = '';
    
    // تنظیم مقادیر پیشفرض
    document.querySelector('input[name="advancedFilterType"][value="budget"]').checked = true;
    document.getElementById('budgetType').value = 'sale';
    document.getElementById('propertyTypeSimple').value = 'all';
    
    changeAdvancedFilterType();
    changeBudgetType();
    
    // غیرفعال کردن فیلتر پیشرفته
    advancedFilterActive = false;
    advancedFilterConfig = null;
    
    // بازگشت به فیلتر عادی
    setFilter(FILTER_TYPES.ALL);
}

// اعمال فیلتر پیشرفته
function applyAdvancedFilter() {
    const filterType = document.querySelector('input[name="advancedFilterType"]:checked').value;
    
    if (filterType === 'budget') {
        applyBudgetFilter();
    } else {
        applySimpleFilter();
    }
    
    closeAdvancedFilter();
}

// اعمال فیلتر بودجه
function applyBudgetFilter() {
    const budgetType = document.getElementById('budgetType').value;
    
    if (budgetType === 'sale') {
        const saleBudget = parsePrice(document.getElementById('saleBudget').value);
        if (saleBudget <= 0) {
            alert('لطفاً بودجه خرید را وارد کنید');
            return;
        }
        
        advancedFilterConfig = {
            type: 'budget',
            budgetType: 'sale',
            saleBudget: saleBudget,
            range: saleBudget * 0.1 // 10 درصد
        };
    } else {
        const depositBudget = parsePrice(document.getElementById('depositBudget').value);
        const rentBudget = parsePrice(document.getElementById('rentBudget').value);
        
        if (depositBudget <= 0) {
            alert('لطفاً بودجه ودیعه را وارد کنید');
            return;
        }
        
        advancedFilterConfig = {
            type: 'budget',
            budgetType: 'rent',
            depositBudget: depositBudget,
            rentBudget: rentBudget,
            depositRange: depositBudget * 0.1 // 10 درصد
        };
    }
    
    advancedFilterActive = true;
    filterProducts();
}

// اعمال فیلتر ساده
function applySimpleFilter() {
    const propertyType = document.getElementById('propertyTypeSimple').value;
    const minArea = parseInt(document.getElementById('minArea').value) || 0;
    const maxArea = parseInt(document.getElementById('maxArea').value) || Infinity;
    
    if (minArea > maxArea && maxArea !== Infinity) {
        alert('حداقل متراژ نمی‌تواند از حداکثر متراژ بیشتر باشد');
        return;
    }
    
    advancedFilterConfig = {
        type: 'simple',
        propertyType: propertyType,
        minArea: minArea,
        maxArea: maxArea
    };
    
    advancedFilterActive = true;
    filterProducts();
}

// فیلتر کردن محصولات (به‌روزرسانی شده)
function filterProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';
    
    let filteredProducts = [];
    
    if (advancedFilterActive && advancedFilterConfig) {
        // اعمال فیلتر پیشرفته
        if (advancedFilterConfig.type === 'budget') {
            filteredProducts = filterByBudget();
        } else {
            filteredProducts = filterBySimple();
        }
    } else {
        // اعمال فیلتر عادی
        switch(currentFilter) {
            case FILTER_TYPES.ALL:
                filteredProducts = allProducts;
                break;
            case FILTER_TYPES.RENT:
                filteredProducts = allProducts.filter(product => {
                    return product.deposit || product.monthlyRent;
                });
                break;
            case FILTER_TYPES.SALE:
                filteredProducts = allProducts.filter(product => {
                    return product.salePrice;
                });
                break;
        }
    }
    
    // نمایش محصولات
    if (filteredProducts.length > 0) {
        container.style.display = 'grid';
        document.getElementById('noProducts').style.display = 'none';
        
        filteredProducts.forEach(product => {
            container.appendChild(createProductCard(product));
        });
    } else {
        container.style.display = 'none';
        document.getElementById('noProducts').style.display = 'block';
        
        const noProductsDiv = document.getElementById('noProducts');
        if (advancedFilterActive) {
            noProductsDiv.innerHTML = `
                <h3>محصولی با شرایط مورد نظر یافت نشد</h3>
                <p>تنظیمات فیلتر خود را بررسی کنید.</p>
            `;
        } else {
            const filterText = currentFilter === FILTER_TYPES.RENT ? 'اجاره' : 
                              currentFilter === FILTER_TYPES.SALE ? 'فروش' : '';
            
            if (filterText) {
                noProductsDiv.innerHTML = `
                    <h3>محصولی برای ${filterText} یافت نشد</h3>
                    <p>این کاربر محصولی برای ${filterText} اضافه نکرده است.</p>
                `;
            } else {
                noProductsDiv.innerHTML = `
                    <h3>محصولی یافت نشد</h3>
                    <p>این کاربر هنوز محصولی اضافه نکرده است.</p>
                `;
            }
        }
    }
}

// فیلتر بر اساس بودجه
function filterByBudget() {
    const config = advancedFilterConfig;
    
    return allProducts.filter(product => {
        if (config.budgetType === 'sale') {
            if (!product.salePrice) return false;
            
            const minPrice = config.saleBudget - config.range;
            const maxPrice = config.saleBudget + config.range;
            
            return product.salePrice >= minPrice && product.salePrice <= maxPrice;
        } else {
            if (!product.deposit && !product.monthlyRent) return false;
            
            const productDeposit = product.deposit || 0;
            const productRent = product.monthlyRent || 0;
            
            const minDeposit = config.depositBudget - config.depositRange;
            const maxDeposit = config.depositBudget + config.depositRange;
            
            const depositInRange = productDeposit >= minDeposit && productDeposit <= maxDeposit;
            const rentInBudget = config.rentBudget === 0 || productRent <= config.rentBudget;
            
            return depositInRange && rentInBudget;
        }
    });
}

// فیلتر ساده
function filterBySimple() {
    const config = advancedFilterConfig;
    
    return allProducts.filter(product => {
        // فیلتر نوع ملک
        let typeMatch = true;
        if (config.propertyType === 'sale') {
            typeMatch = !!product.salePrice;
        } else if (config.propertyType === 'rent') {
            typeMatch = !!(product.deposit || product.monthlyRent);
        }
        
        // فیلتر متراژ
        const areaMatch = product.area >= config.minArea && product.area <= config.maxArea;
        
        return typeMatch && areaMatch;
    });
}

// به‌روزرسانی تابع setFilter برای غیرفعال کردن فیلتر پیشرفته
function setFilter(filterType) {
    // غیرفعال کردن فیلتر پیشرفته
    advancedFilterActive = false;
    advancedFilterConfig = null;
    
    currentFilter = filterType;
    updateFilterButtons();
    filterProducts();
}

// تابع‌های global برای استفاده در HTML
window.toggleAdvancedFilter = toggleAdvancedFilter;
window.closeAdvancedFilter = closeAdvancedFilter;
window.resetAdvancedFilter = resetAdvancedFilter;
window.applyAdvancedFilter = applyAdvancedFilter;

// export functions برای استفاده در فایل‌های دیگر
window.ProductsFilter = {
    initializeFilter,
    setupFilterButtons,
    setFilter,
    FILTER_TYPES
};
