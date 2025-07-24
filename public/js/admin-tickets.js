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
        'waiting_for_user': 'در انتظار کاربر',
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

// تابع بارگذاری آمار کلی
async function loadOverviewStats() {
    try {
        console.log('Loading overview stats...');
        const response = await fetch('/api/admin/tickets/stats/overview', {
            credentials: 'include'
        });
        
        console.log('Stats response status:', response.status);
        
        if (response.ok) {
            const stats = await response.json();
            console.log('Stats data:', stats);
            
            document.getElementById('totalTickets').textContent = stats.total;
            document.getElementById('openTickets').textContent = stats.open;
            document.getElementById('inProgressTickets').textContent = stats.inProgress;
            document.getElementById('waitingTickets').textContent = stats.waiting;
            document.getElementById('resolvedTickets').textContent = stats.resolved;
            document.getElementById('closedTickets').textContent = stats.closed;
            document.getElementById('avgResponseTime').textContent = `${stats.averageResponseTime} ساعت`;
            document.getElementById('avgResolutionTime').textContent = `${stats.averageResolutionTime} ساعت`;
        } else if (response.status === 401) {
            console.log('Unauthorized for stats - redirecting to login');
            window.location.href = '/login';
        } else {
            const errorText = await response.text();
            console.error('Stats error response:', errorText);
            // در صورت خطا در آمار، مقادیر را صفر قرار می‌دهیم
            document.getElementById('totalTickets').textContent = '0';
            document.getElementById('openTickets').textContent = '0';
            document.getElementById('inProgressTickets').textContent = '0';
            document.getElementById('waitingTickets').textContent = '0';
            document.getElementById('resolvedTickets').textContent = '0';
            document.getElementById('closedTickets').textContent = '0';
            document.getElementById('avgResponseTime').textContent = '0 ساعت';
            document.getElementById('avgResolutionTime').textContent = '0 ساعت';
        }
    } catch (error) {
        console.error('Error loading overview stats:', error);
        // در صورت خطا، مقادیر را صفر قرار می‌دهیم
        document.getElementById('totalTickets').textContent = '0';
        document.getElementById('openTickets').textContent = '0';
        document.getElementById('inProgressTickets').textContent = '0';
        document.getElementById('waitingTickets').textContent = '0';
        document.getElementById('resolvedTickets').textContent = '0';
        document.getElementById('closedTickets').textContent = '0';
        document.getElementById('avgResponseTime').textContent = '0 ساعت';
        document.getElementById('avgResolutionTime').textContent = '0 ساعت';
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
        const assignedTo = document.getElementById('assignedFilter').value;
        const sortBy = document.getElementById('sortBy').value;
        
        const params = new URLSearchParams({
            page: page,
            limit: 20,
            sortBy: sortBy,
            sortOrder: 'desc'
        });
        
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (category) params.append('category', category);
        if (assignedTo) {
            if (assignedTo === 'unassigned') {
                params.append('assignedTo', '');
            } else if (assignedTo === 'admin') {
                params.append('assignedTo', 'admin');
            }
        }
        
        console.log('Fetching tickets with params:', params.toString());
        
        const response = await fetch(`/api/admin/tickets/all?${params}`, {
            credentials: 'include'
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Tickets data:', data);
            
            currentPage = data.page;
            totalPages = data.totalPages;
            
            if (data.tickets.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-ticket-alt"></i>
                        <h3>تیکتی یافت نشد</h3>
                        <p>هیچ تیکتی با فیلترهای انتخاب شده مطابقت ندارد.</p>
                    </div>
                `;
            } else {
                renderTickets(data.tickets);
                renderPagination();
            }
        } else if (response.status === 401) {
            console.log('Unauthorized - redirecting to login');
            window.location.href = '/login';
        } else {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`خطا در بارگذاری تیکت‌ها: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error loading tickets:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطا در بارگذاری</h3>
                <p>متأسفانه مشکلی در بارگذاری تیکت‌ها پیش آمده است.</p>
                <p class="error-details">${error.message}</p>
            </div>
        `;
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
                        <span>توسط: ${ticket.createdByName || ticket.createdBy}</span>
                        <span>${formatDate(ticket.createdAt)}</span>
                    </div>
                </div>
            </div>
            <div class="ticket-description">${ticket.description}</div>
            <div class="ticket-footer">
                <span>تعداد پیام‌ها: ${ticket.messages.length}</span>
                <div class="ticket-actions">
                    ${ticket.assignedToName ? `<span>تخصیص: ${ticket.assignedToName}</span>` : '<span>تخصیص نیافته</span>'}
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

// تابع باز کردن جزئیات تیکت
async function openTicketDetails(ticketId) {
    try {
        const response = await fetch(`/api/admin/tickets/${ticketId}`, {
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
    
    // تنظیم مقادیر select ها
    document.getElementById('statusSelect').value = currentTicket.status;
    document.getElementById('prioritySelect').value = currentTicket.priority;
    document.getElementById('assignSelect').value = currentTicket.assignedTo || '';
    
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
                <span class="info-label">ایجاد کننده</span>
                <span class="info-value">${currentTicket.createdByName || currentTicket.createdBy}</span>
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
                    ${message.isInternal ? ' (داخلی)' : ''}
                </span>
                <span class="message-time">${formatDate(message.timestamp)}</span>
            </div>
            <div class="message-content">${message.message}</div>
        </div>
    `).join('');
    
    messagesContainer.innerHTML = messagesHTML;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// تابع تغییر وضعیت تیکت
async function updateTicketStatus() {
    const newStatus = document.getElementById('statusSelect').value;
    const note = prompt('یادداشت (اختیاری):');
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicket.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                status: newStatus,
                note: note || ''
            })
        });
        
        if (response.ok) {
            showMessage('وضعیت تیکت با موفقیت تغییر کرد', 'success');
            await openTicketDetails(currentTicket.id);
            loadTickets();
            loadOverviewStats();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error updating ticket status:', error);
        showMessage('خطا در تغییر وضعیت تیکت', 'error');
    }
}

// تابع تغییر اولویت تیکت
async function updateTicketPriority() {
    const newPriority = document.getElementById('prioritySelect').value;
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicket.id}/priority`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ priority: newPriority })
        });
        
        if (response.ok) {
            showMessage('اولویت تیکت با موفقیت تغییر کرد', 'success');
            await openTicketDetails(currentTicket.id);
            loadTickets();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error updating ticket priority:', error);
        showMessage('خطا در تغییر اولویت تیکت', 'error');
    }
}

// تابع تخصیص تیکت
async function assignTicket() {
    const assignedTo = document.getElementById('assignSelect').value;
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicket.id}/assign`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ assignedTo: assignedTo || null })
        });
        
        if (response.ok) {
            showMessage('تیکت با موفقیت تخصیص داده شد', 'success');
            await openTicketDetails(currentTicket.id);
            loadTickets();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error assigning ticket:', error);
        showMessage('خطا در تخصیص تیکت', 'error');
    }
}

// تابع حذف تیکت
async function deleteTicket() {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این تیکت را حذف کنید؟ این عمل غیرقابل بازگشت است.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicket.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showMessage('تیکت با موفقیت حذف شد', 'success');
            closeTicketDetailsModal();
            loadTickets();
            loadOverviewStats();
        } else if (response.status === 401) {
            window.location.href = '/login';
        } else {
            const error = await response.json();
            showMessage(error.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting ticket:', error);
        showMessage('خطا در حذف تیکت', 'error');
    }
}

// تابع ارسال پیام
async function sendMessage() {
    const messageInput = document.getElementById('newMessage');
    const message = messageInput.value.trim();
    const isInternal = document.getElementById('isInternalMessage').checked;
    
    if (!message) {
        showMessage('لطفاً پیام خود را وارد کنید', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/tickets/${currentTicket.id}/system-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ 
                message,
                isInternal
            })
        });
        
        if (response.ok) {
            messageInput.value = '';
            document.getElementById('isInternalMessage').checked = false;
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // بارگذاری اولیه
    loadOverviewStats();
    loadTickets();
    
    // Event Listener برای بستن Modal ها با کلیک خارج از آن‌ها
    window.addEventListener('click', function(event) {
        const detailsModal = document.getElementById('ticketDetailsModal');
        const statusModal = document.getElementById('statusModal');
        
        if (event.target === detailsModal) {
            closeTicketDetailsModal();
        }
        if (event.target === statusModal) {
            closeStatusModal();
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