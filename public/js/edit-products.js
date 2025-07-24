
// ماژول مدیریت محصولات - حذف و انتخاب چندتایی

class ProductEditor {
    constructor() {
        this.isMultiSelectMode = false;
        this.selectedProducts = new Set();
        this.init();
    }

    init() {
        // افزودن دکمه حذف چندتایی
        this.createBulkDeleteButton();
        
        // بستن حالت انتخاب چندتایی با کلیک روی صفحه
        document.addEventListener('click', (e) => {
            if (this.isMultiSelectMode && !e.target.closest('.product-card') && !e.target.closest('#bulkDeleteBtn')) {
                this.exitMultiSelectMode();
            }
        });
    }

    // ایجاد دکمه حذف چندتایی
    createBulkDeleteButton() {
        const bulkDeleteBtn = document.createElement('div');
        bulkDeleteBtn.id = 'bulkDeleteBtn';
        bulkDeleteBtn.className = 'bulk-delete-btn';
        bulkDeleteBtn.style.display = 'none';
        bulkDeleteBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
        `;
        bulkDeleteBtn.onclick = () => this.confirmBulkDelete();
        document.body.appendChild(bulkDeleteBtn);
    }

    // حذف تکی محصول
    async deleteProduct(productId) {
        const isConfirmed = await this.showConfirmDialog('آیا مطمئن هستید که می‌خواهید این محصول را حذف کنید؟');
        if (isConfirmed) {
            try {
                const response = await fetch(`/api/products/${productId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    this.showSuccessMessage('محصول با موفقیت حذف شد');
                    // بارگذاری مجدد محصولات
                    if (window.loadProducts) {
                        window.loadProducts();
                    }
                } else {
                    throw new Error('خطا در حذف محصول');
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showErrorMessage('خطا در حذف محصول. لطفاً دوباره تلاش کنید.');
            }
        }
    }

    // فعال کردن حالت انتخاب چندتایی
    toggleMultiSelectMode() {
        this.isMultiSelectMode = !this.isMultiSelectMode;
        
        if (this.isMultiSelectMode) {
            this.enterMultiSelectMode();
        } else {
            this.exitMultiSelectMode();
        }
    }

    // ورود به حالت انتخاب چندتایی
    enterMultiSelectMode() {
        this.isMultiSelectMode = true;
        this.selectedProducts.clear();
        
        // اضافه کردن چک‌باکس‌ها به تمام کارت‌های محصول
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            this.addCheckboxToCard(card);
        });

        // نمایش دکمه حذف چندتایی
        document.getElementById('bulkDeleteBtn').style.display = 'flex';
        
        // بستن تمام منوها
        document.querySelectorAll('.product-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }

    // خروج از حالت انتخاب چندتایی
    exitMultiSelectMode() {
        this.isMultiSelectMode = false;
        this.selectedProducts.clear();
        
        // حذف چک‌باکس‌ها
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => checkbox.remove());
        
        // مخفی کردن دکمه حذف چندتایی
        document.getElementById('bulkDeleteBtn').style.display = 'none';
    }

    // اضافه کردن چک‌باکس به کارت محصول
    addCheckboxToCard(card) {
        const productId = this.extractProductIdFromCard(card);
        
        const checkbox = document.createElement('div');
        checkbox.className = 'product-checkbox';
        checkbox.innerHTML = `
            <input type="checkbox" id="checkbox-${productId}" 
                   onchange="window.productEditor.toggleProductSelection('${productId}')"
                   onclick="event.stopPropagation()">
            <label for="checkbox-${productId}" onclick="event.stopPropagation()"></label>
        `;
        
        card.appendChild(checkbox);
        
        // اضافه کردن event listener برای جلوگیری از propagation
        const checkboxInput = checkbox.querySelector('input');
        const checkboxLabel = checkbox.querySelector('label');
        
        checkboxInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        checkboxLabel.addEventListener('click', (e) => {
            e.stopPropagation();
            checkboxInput.click();
        });
    }

    // استخراج شناسه محصول از کارت
    extractProductIdFromCard(card) {
        const menuBtn = card.querySelector('.product-menu-btn');
        if (menuBtn) {
            const onclick = menuBtn.getAttribute('onclick');
            const match = onclick.match(/toggleMenu\(event, '([^']+)'\)/);
            return match ? match[1] : null;
        }
        return null;
    }

    // تغییر وضعیت انتخاب محصول
    toggleProductSelection(productId) {
        if (this.selectedProducts.has(productId)) {
            this.selectedProducts.delete(productId);
        } else {
            this.selectedProducts.add(productId);
        }
        
        // بروزرسانی وضعیت دکمه حذف چندتایی
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            if (this.selectedProducts.size > 0) {
                bulkDeleteBtn.classList.add('has-selection');
            } else {
                bulkDeleteBtn.classList.remove('has-selection');
            }
        }
    }

    

    // بروزرسانی دکمه حذف چندتایی
    updateBulkDeleteButton() {
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        const count = this.selectedProducts.size;
        
        if (count > 0) {
            bulkDeleteBtn.classList.add('has-selection');
            bulkDeleteBtn.title = `حذف ${count} محصول انتخاب شده`;
        } else {
            bulkDeleteBtn.classList.remove('has-selection');
            bulkDeleteBtn.title = 'محصولی انتخاب نشده';
        }
    }

    // تایید حذف چندتایی
    async confirmBulkDelete() {
        if (this.selectedProducts.size === 0) {
            this.showErrorMessage('لطفاً حداقل یک محصول را انتخاب کنید');
            return;
        }

        const count = this.selectedProducts.size;
        const isConfirmed = await this.showConfirmDialog(`آیا مطمئن هستید که می‌خواهید ${count} محصول انتخاب شده را حذف کنید؟`);
        
        if (isConfirmed) {
            await this.bulkDeleteProducts();
        }
    }

    // حذف چندتایی محصولات
    async bulkDeleteProducts() {
        try {
            const productIds = Array.from(this.selectedProducts);
            
            const response = await fetch('/api/products/bulk-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productIds })
            });

            if (response.ok) {
                this.showSuccessMessage(`${productIds.length} محصول با موفقیت حذف شد`);
                this.exitMultiSelectMode();
                
                // بارگذاری مجدد محصولات
                if (window.loadProducts) {
                    window.loadProducts();
                }
            } else {
                throw new Error('خطا در حذف محصولات');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showErrorMessage('خطا در حذف محصولات. لطفاً دوباره تلاش کنید.');
        }
    }

    // تابع حذف محصولات انتخاب شده (برای دکمه HTML)
    async deleteSelectedProducts() {
        await this.confirmBulkDelete();
    }

    // نمایش پیام تایید
    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const isConfirmed = confirm(message);
            resolve(isConfirmed);
        });
    }

    // نمایش پیام موفقیت
    showSuccessMessage(message) {
        // ایجاد المان پیام موفقیت
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(successDiv);
        
        // حذف پیام بعد از 3 ثانیه
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    // نمایش پیام خطا
    showErrorMessage(message) {
        // ایجاد المان پیام خطا
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message-popup';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(errorDiv);
        
        // حذف پیام بعد از 3 ثانیه
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// ایجاد نمونه از کلاس
window.productEditor = new ProductEditor();
