// متغیرهای سراسری
let currentTicket = null;
let currentPage = 1;
let totalPages = 0;

// تابع تبدیل تاریخ
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));
            return `${diffInMinutes} دقیقه پیش`;
        }
        return `${diffInHours} ساعت پیش`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} روز پیش`;
    }
}

// تابع تبدیل وضعیت به فارسی
function getStatusText(status) {
    const statusMap = {
        'open': 'باز',
        'in_progress': 'در حال بررسی',
        'waiting_for_admin': 'در انتظار پاسخ',
        'resolved': 'حل شده',
        'closed': 'بسته'
    };
    return statusMap[status] || status;
}

// تابع تبدیل اولویت به فارسی
function getPriorityText(priority) {
    const priorityMap = {
        'low': 'کم',
        'medium': 'متوسط',
        'high': 'زیاد',
        'urgent': 'فوری'
    };
    return priorityMap[priority] || priority;
}

// تابع تبدیل دسته‌بندی به فارسی
function getCategoryText(category) {
    const categoryMap = {
        'general': 'عمومی',
        'technical': 'فنی',
        'billing': 'مالی',
        'support': 'پشتیبانی'
    };
    return categoryMap[category] || category;
}

// تابع نمایش پیام
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-toast ${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// تابع بارگذاری آمار
async function loadStats() {
    try {
        const response = await fetch('/api/tickets/stats/my', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalTickets').textContent = stats.total;
            document.getElementById('openTickets').textContent = stats.open;
            document.getElementById('inProgressTickets').textContent = stats.inProgress;
            document.getElementById('resolvedTickets').textContent = stats.resolved;
        } else if (response.status === 401) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        if (error.message.includes('401')) {
            window.location.href = '/login';
        }
    }
}

// تابع بارگذاری تیکت‌ها
async function loadTickets(page = 1) {
    const container = document.getElementById('ticketsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> در حال بارگذاری...</div>';
    
    try {
        const status = document.getElementById('statusFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const category = document.getElementById('categoryFilter').value;
        
        const params = new URLSearchParams({
            page: page,
            limit: 10
        });
        
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (category) params.append('category', category);
        
        const response = await fetch(`/api/tickets/my-tickets?${params}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentPage = data.page;
            totalPages = data.totalPages;
            
            if (data.tickets.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-ticket-alt"></i>
                        <h3>تیکتی یافت نشد</h3>
                        <p>هنوز هیچ تیکتی ایجاد نکرده‌اید یا تیکت‌های شما با فیلترهای انتخاب شده مطابقت ندارد.</p>
                    </div>
                `;
            } else {
                renderTickets(data.tickets);
                renderPagination();
            }
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            throw new Error('خطا در بارگذاری تیکت‌ها');
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        if (error.message.includes('401')) {
            window.location.href = '/login';
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطا در بارگذاری</h3>
                    <p>متأسفانه مشکلی در بارگذاری تیکت‌ها پیش آمده است.</p>
                </div>
            `;
        }
    }
}

// تابع نمایش تیکت‌ها
function renderTickets(tickets) {
    const container = document.getElementById('ticketsContainer');
    
    const ticketsHTML = tickets.map(ticket => `
        <div class="ticket-card ${ticket.status}" onclick="openTicketDetails('${ticket.id}')">
            <div class="ticket-header">
                <div>
                    <div class="ticket-title">${ticket.title}</div>
                    <div class="ticket-meta">
                        <span class="ticket-priority ${ticket.priority}">${getPriorityText(ticket.priority)}</span>
                        <span class="ticket-status ${ticket.status}">${getStatusText(ticket.status)}</span>
                        <span>${getCategoryText(ticket.category)}</span>
                        <span>${formatDate(ticket.createdAt)}</span>
                    </div>
                </div>
            </div>
            <div class="ticket-description">${ticket.description}</div>
            <div class="ticket-footer">
                <span>تعداد پیام‌ها: ${ticket.messages.length}</span>
                <div class="ticket-actions">
                    ${ticket.status === 'closed' ? '' : `
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); closeTicket('${ticket.id}')">
                            <i class="fas fa-times"></i> بستن
                        </button>
                    `}
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = ticketsHTML;
}

// تابع نمایش پیجینیشن
function renderPagination() {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // دکمه قبلی
    if (currentPage > 1) {
        paginationHTML += `<button onclick="loadTickets(${currentPage - 1})">قبلی</button>`;
    }
    
    // شماره صفحات
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadTickets(${i})">${i}</button>`;
    }
    
    // دکمه بعدی
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="loadTickets(${currentPage + 1})">بعدی</button>`;
    }
    
    pagination.innerHTML = paginationHTML;
}

// تابع نمایش Modal ایجاد تیکت
function showCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'flex';
    document.getElementById('createTicketForm').reset();
    document.body.style.overflow = 'hidden';
}

// تابع بستن Modal ایجاد تیکت
function closeCreateTicketModal() {
    document.getElementById('createTicketModal').style.display = 'none';
    document.body.style.overflow = '';
}

// تابع ایجاد تیکت جدید
async function createTicket(event) {
    event.preventDefault();
    
    const title = document.getElementById('ticketTitle').value.trim();
    const description = document.getElementById('ticketDescription').value.trim();
    const priority = document.getElementById('ticketPriority').value;
    const category = document.getElementById('ticketCategory').value;
    
    try {
        const response = await fetch('/api/tickets/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                title,
                description,
                priority,
                category
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showMessage('تیکت با موفقیت ایجاد شد', 'success');
            closeCreateTicketModal();
            loadTickets();
            loadStats();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error creating ticket:', error);
        showMessage('خطا در ایجاد تیکت', 'error');
    }
}

// تابع باز کردن جزئیات تیکت
async function openTicketDetails(ticketId) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentTicket = data.ticket;
            renderTicketDetails();
            document.getElementById('ticketDetailsModal').style.display = 'block';
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            throw new Error('خطا در بارگذاری جزئیات تیکت');
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showMessage('خطا در بارگذاری جزئیات تیکت', 'error');
    }
}

// تابع بستن Modal جزئیات تیکت
function closeTicketDetailsModal() {
    document.getElementById('ticketDetailsModal').style.display = 'none';
    currentTicket = null;
}

// تابع نمایش جزئیات تیکت
function renderTicketDetails() {
    if (!currentTicket) return;
    
    document.getElementById('ticketDetailsTitle').textContent = currentTicket.title;
    
    // اطلاعات تیکت
    const ticketInfo = document.getElementById('ticketInfo');
    ticketInfo.innerHTML = `
        <h3>اطلاعات تیکت</h3>
        <div class="ticket-info-grid">
            <div class="info-item">
                <span class="info-label">وضعیت</span>
                <span class="info-value">
                    <span class="ticket-status ${currentTicket.status}">${getStatusText(currentTicket.status)}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">اولویت</span>
                <span class="info-value">
                    <span class="ticket-priority ${currentTicket.priority}">${getPriorityText(currentTicket.priority)}</span>
                </span>
            </div>
            <div class="info-item">
                <span class="info-label">دسته‌بندی</span>
                <span class="info-value">${getCategoryText(currentTicket.category)}</span>
            </div>
            <div class="info-item">
                <span class="info-label">تاریخ ایجاد</span>
                <span class="info-value">${formatDate(currentTicket.createdAt)}</span>
            </div>
            ${currentTicket.assignedToName ? `
                <div class="info-item">
                    <span class="info-label">تخصیص داده شده به</span>
                    <span class="info-value">${currentTicket.assignedToName}</span>
                </div>
            ` : ''}
            ${currentTicket.resolvedAt ? `
                <div class="info-item">
                    <span class="info-label">تاریخ حل</span>
                    <span class="info-value">${formatDate(currentTicket.resolvedAt)}</span>
                </div>
            ` : ''}
        </div>
    `;
    
    // پیام‌ها
    const messagesContainer = document.getElementById('messagesContainer');
    const messagesHTML = currentTicket.messages.map(message => `
        <div class="message ${message.isSystemMessage ? 'system' : (message.isAdmin ? 'admin' : 'user')}">
            <div class="message-header">
                <span class="message-sender">
                    ${message.isSystemMessage ? 'سیستم' : (message.fullName || message.sender)}
                    ${message.isAdmin && !message.isSystemMessage ? ' (ادمین)' : ''}
                </span>
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
            <div class="message-content">${message.message}</div>
        </div>
    `).join('');
    
    messagesContainer.innerHTML = messagesHTML;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // نمایش/مخفی کردن فرم پیام
    const messageForm = document.getElementById('messageForm');
    if (currentTicket.status === 'closed') {
        messageForm.style.display = 'none';
    } else {
        messageForm.style.display = 'flex';
    }
}

// تابع ارسال پیام
async function sendMessage() {
    const messageInput = document.getElementById('newMessage');
    const message = messageInput.value.trim();
    
    if (!message) {
        showMessage('لطفاً پیام خود را وارد کنید', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/tickets/${currentTicket.id}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ message })
        });
        
        if (response.ok) {
            messageInput.value = '';
            // بارگذاری مجدد جزئیات تیکت
            await openTicketDetails(currentTicket.id);
            showMessage('پیام با موفقیت ارسال شد', 'success');
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('خطا در ارسال پیام', 'error');
    }
}

// تابع بستن تیکت
async function closeTicket(ticketId) {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این تیکت را ببندید؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tickets/${ticketId}/close`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('تیکت با موفقیت بسته شد', 'success');
            loadTickets();
            loadStats();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error closing ticket:', error);
        showMessage('خطا در بستن تیکت', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری اولیه
    loadStats();
    loadTickets();
    
    // Event Listener برای فرم ایجاد تیکت
    document.getElementById('createTicketForm').addEventListener('submit', createTicket);
    
    // Event Listener برای بستن Modal ها با کلیک خارج از آن‌ها
    window.addEventListener('click', function(event) {
        const createModal = document.getElementById('createTicketModal');
        const detailsModal = document.getElementById('ticketDetailsModal');
        
        if (event.target === createModal) {
            closeCreateTicketModal();
        }
        if (event.target === detailsModal) {
            closeTicketDetailsModal();
        }
    });
    
    // Event Listener برای ارسال پیام با Enter
    document.getElementById('newMessage').addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});

// اضافه کردن استایل برای پیام‌های toast
const style = document.createElement('style');
style.textContent = `
    .message-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
    
    .message-toast.success {
        background: #27ae60;
    }
    
    .message-toast.error {
        background: #e74c3c;
    }
    
    .message-toast.info {
        background: #3498db;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style); 