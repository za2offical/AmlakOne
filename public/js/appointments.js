// Global variables
let appointments = [];
let userProperties = [];
let currentFilter = 'all';
let searchQuery = '';

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadUserProperties();
    loadAppointments();
    setupEventListeners();
    setMinDate();
    if (typeof jalaliDatepicker !== 'undefined') {
        jalaliDatepicker.startWatch();
    }
    if (window.TimePicker) {
        new TimePicker('#appointmentTime', {
            lang: 'fa',
            theme: 'dark',
            format: 'HH:mm',
            hour24: true,
            readOnly: true
        });
        new TimePicker('#editAppointmentTime', {
            lang: 'fa',
            theme: 'dark',
            format: 'HH:mm',
            hour24: true,
            readOnly: true
        });
    }
    if (window.IMask) {
        IMask(document.getElementById('appointmentTime'), {
            mask: 'HH:MM',
            blocks: {
                HH: { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 },
                MM: { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 }
            }
        });
        IMask(document.getElementById('editAppointmentTime'), {
            mask: 'HH:MM',
            blocks: {
                HH: { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 },
                MM: { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 }
            }
        });
    }
});

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        searchQuery = e.target.value;
        filterAndDisplayAppointments();
    });

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterAndDisplayAppointments();
        });
    });

    // Form submissions
    const newAppointmentForm = document.getElementById('newAppointmentForm');
    newAppointmentForm.addEventListener('submit', handleNewAppointment);

    const editAppointmentForm = document.getElementById('editAppointmentForm');
    editAppointmentForm.addEventListener('submit', handleEditAppointment);
}

// Set minimum date for date inputs
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        input.min = today;
    });
}

// Load user properties
async function loadUserProperties() {
    try {
        console.log('Loading user properties...');
        const response = await fetch('/api/panel-products/products', {
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Properties data:', data);
            userProperties = data.products || [];
            console.log('User properties loaded:', userProperties.length);
            populatePropertySelects();
        } else {
            console.error('Failed to load properties:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('Error loading properties:', error);
    }
}

// Populate property select dropdowns
function populatePropertySelects() {
    console.log('Populating property selects with', userProperties.length, 'properties');
    
    const propertySelects = ['propertySelect', 'editPropertySelect'];
    
    propertySelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) {
            console.warn('Select element not found:', selectId);
            return;
        }
        
        // Clear existing options except the first one
        select.innerHTML = '<option value="">انتخاب کنید...</option>';
        
        userProperties.forEach(property => {
            const option = document.createElement('option');
            option.value = property.id;
            
            // ایجاد متن بهتر برای نمایش
            let propertyText = `${property.propertyType === 'sale' ? 'فروش' : 'اجاره'} - ${property.bedrooms} خواب - ${property.area} متر`;
            
            // اضافه کردن قیمت
            if (property.propertyType === 'sale' && property.salePrice) {
                propertyText += ` - ${(property.salePrice / 1000000).toFixed(0)} میلیون تومان`;
            } else if (property.propertyType === 'rent' && property.monthlyRent) {
                propertyText += ` - ${(property.monthlyRent / 1000000).toFixed(0)} میلیون اجاره`;
            }
            
            option.textContent = propertyText;
            select.appendChild(option);
        });
        
        console.log('Populated', selectId, 'with', userProperties.length, 'options');
    });
}

// Load appointments
async function loadAppointments() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/appointments', {
            credentials: 'include'
        });
        
        if (response.ok) {
            appointments = await response.json();
            updateStats();
            filterAndDisplayAppointments();
        } else {
            showError('خطا در بارگذاری قرارها');
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showError('خطا در بارگذاری قرارها');
    } finally {
        showLoading(false);
    }
}

// Update statistics
async function updateStats() {
    try {
        const response = await fetch('/api/appointments/stats', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('totalAppointments').textContent = stats.total;
            document.getElementById('todayAppointments').textContent = stats.today;
            document.getElementById('upcomingAppointments').textContent = stats.upcoming;
            document.getElementById('completedAppointments').textContent = stats.completed;
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Filter and display appointments
function filterAndDisplayAppointments() {
    let filteredAppointments = appointments;
    
    // Apply status filter
    if (currentFilter !== 'all') {
        filteredAppointments = filteredAppointments.filter(appointment => 
            appointment.status === currentFilter
        );
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredAppointments = filteredAppointments.filter(appointment => 
            appointment.clientName.toLowerCase().includes(query) ||
            appointment.clientPhone.includes(query) ||
            appointment.notes.toLowerCase().includes(query)
        );
    }
    
    displayAppointments(filteredAppointments);
}

// Display appointments in the list
function displayAppointments(appointmentsToShow) {
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (appointmentsToShow.length === 0) {
        appointmentsList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <h3>هیچ قراری یافت نشد</h3>
                <p>${searchQuery || currentFilter !== 'all' ? 'فیلترهای خود را تغییر دهید' : 'برای شروع، قرار جدیدی ثبت کنید'}</p>
            </div>
        `;
        return;
    }
    
    appointmentsList.innerHTML = appointmentsToShow.map(appointment => {
        const property = userProperties.find(p => p.id === appointment.propertyId);
        const propertyInfo = property ? 
            `${property.propertyType === 'sale' ? 'فروش' : 'اجاره'} - ${property.bedrooms} خواب - ${property.area} متر` : 
            'ملک حذف شده';
        
        const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
        const isToday = new Date().toDateString() === appointmentDateTime.toDateString();
        const isPast = appointmentDateTime < new Date();
        
        return `
            <div class="appointment-card ${isPast && appointment.status === 'scheduled' ? 'past-appointment' : ''}" 
                 onclick="openEditAppointmentModal('${appointment.id}')">
                <div class="appointment-header">
                    <div class="appointment-info">
                        <h3>${appointment.clientName}</h3>
                        <p>${propertyInfo}</p>
                    </div>
                    <div class="appointment-status ${appointment.status}">
                        ${getStatusText(appointment.status)}
                    </div>
                </div>
                
                <div class="appointment-details">
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span>${formatDate(appointment.appointmentDate)} ${formatTime(appointment.appointmentTime)}</span>
                    </div>
                    
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                        </svg>
                        <span>${appointment.clientPhone}</span>
                    </div>
                    
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span>${getAppointmentTypeText(appointment.appointmentType)}</span>
                    </div>
                    
                    ${appointment.notes ? `
                    <div class="detail-item">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                        <span>${appointment.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="appointment-actions">
                    <button class="action-btn edit" onclick="event.stopPropagation(); openEditAppointmentModal('${appointment.id}')" title="ویرایش">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                    </button>
                    <button class="action-btn delete" onclick="event.stopPropagation(); deleteAppointment('${appointment.id}')" title="حذف">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'scheduled': 'برنامه‌ریزی شده',
        'completed': 'تکمیل شده',
        'cancelled': 'لغو شده'
    };
    return statusMap[status] || status;
}

// Get appointment type text
function getAppointmentTypeText(type) {
    const typeMap = {
        'visit': 'بازدید ملک',
        'contract': 'امضای قرارداد',
        'consultation': 'مشاوره',
        'other': 'سایر'
    };
    return typeMap[type] || type;
}

// Format date
function formatDate(dateString) {
    // تبدیل اعداد انگلیسی به فارسی
    const faDigits = n => n.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
    // اگر تاریخ به صورت yyyy/mm/dd یا yyyy-mm-dd بود، فقط اعداد فارسی کن و نمایش بده
    if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(dateString)) {
        return faDigits(dateString.replace(/-/g, '/'));
    }
    // حالت پیش‌فرض (مثلاً اگر تاریخ میلادی بود)
    return faDigits(dateString);
}

// تابع جدید برای فرمت ساعت به صورت ۲۴ ساعته
function formatTime(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(":");
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

// Modal functions
function openNewAppointmentModal() {
    const modal = document.getElementById('newAppointmentModal');
    modal.style.display = 'flex';
    document.getElementById('newAppointmentForm').reset();
    setMinDate();
    document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeNewAppointmentModal() {
    const modal = document.getElementById('newAppointmentModal');
    modal.style.display = 'none';
    // Only unlock if no other modal is open
    if (document.getElementById('editAppointmentModal').style.display !== 'flex') {
        document.body.style.overflow = '';
    }
}

function openEditAppointmentModal(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    // Populate form fields
    document.getElementById('editAppointmentId').value = appointment.id;
    document.getElementById('editPropertySelect').value = appointment.propertyId;
    document.getElementById('editClientName').value = appointment.clientName;
    document.getElementById('editClientPhone').value = appointment.clientPhone;
    document.getElementById('editAppointmentDate').value = appointment.appointmentDate;
    document.getElementById('editAppointmentTime').value = appointment.appointmentTime;
    document.getElementById('editAppointmentType').value = appointment.appointmentType;
    document.getElementById('editStatus').value = appointment.status;
    document.getElementById('editNotes').value = appointment.notes;
    
    const modal = document.getElementById('editAppointmentModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeEditAppointmentModal() {
    const modal = document.getElementById('editAppointmentModal');
    modal.style.display = 'none';
    // Only unlock if no other modal is open
    if (document.getElementById('newAppointmentModal').style.display !== 'flex') {
        document.body.style.overflow = '';
    }
}

// Form handlers
async function handleNewAppointment(e) {
    e.preventDefault();
    
    const appointmentData = {
        propertyId: document.getElementById('propertySelect').value,
        clientName: document.getElementById('clientName').value,
        clientPhone: document.getElementById('clientPhone').value,
        appointmentDate: document.getElementById('appointmentDate').value,
        appointmentTime: document.getElementById('appointmentTime').value,
        appointmentType: document.getElementById('appointmentType').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            closeNewAppointmentModal();
            loadAppointments();
            showSuccess('قرار با موفقیت ثبت شد');
        } else {
            const error = await response.json();
            showError(error.error || 'خطا در ثبت قرار');
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        showError('خطا در ثبت قرار');
    }
}

async function handleEditAppointment(e) {
    e.preventDefault();
    
    const appointmentId = document.getElementById('editAppointmentId').value;
    
    const appointmentData = {
        propertyId: document.getElementById('editPropertySelect').value,
        clientName: document.getElementById('editClientName').value,
        clientPhone: document.getElementById('editClientPhone').value,
        appointmentDate: document.getElementById('editAppointmentDate').value,
        appointmentTime: document.getElementById('editAppointmentTime').value,
        appointmentType: document.getElementById('editAppointmentType').value,
        status: document.getElementById('editStatus').value,
        notes: document.getElementById('editNotes').value
    };
    
    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(appointmentData)
        });
        
        if (response.ok) {
            closeEditAppointmentModal();
            loadAppointments();
            showSuccess('قرار با موفقیت بروزرسانی شد');
        } else {
            const error = await response.json();
            showError(error.error || 'خطا در بروزرسانی قرار');
        }
    } catch (error) {
        console.error('Error updating appointment:', error);
        showError('خطا در بروزرسانی قرار');
    }
}

async function deleteAppointment(appointmentId) {
    if (!confirm('آیا از حذف این قرار اطمینان دارید؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            loadAppointments();
            showSuccess('قرار با موفقیت حذف شد');
        } else {
            const error = await response.json();
            showError(error.error || 'خطا در حذف قرار');
        }
    } catch (error) {
        console.error('Error deleting appointment:', error);
        showError('خطا در حذف قرار');
    }
}

// Utility functions
function showLoading(show) {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (show) {
        loading.style.display = 'flex';
        error.style.display = 'none';
        appointmentsList.style.display = 'none';
    } else {
        loading.style.display = 'none';
        appointmentsList.style.display = 'block';
    }
}

function showError(message) {
    const error = document.getElementById('error');
    error.textContent = message;
    error.style.display = 'block';
    
    setTimeout(() => {
        error.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 1001;
        font-weight: 500;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
}); 