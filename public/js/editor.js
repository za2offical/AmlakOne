// بارگذاری صفحه ادمین
async function loadAdminPage() {
    try {
        // بررسی احراز هویت
        const response = await fetch('/api/panel/user-info', { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        const userInfo = await response.json();
        if (userInfo.username !== 'admin') {
            alert('دسترسی غیرمجاز - فقط ادمین');
            window.location.href = '/login';
            return;
        }

        document.getElementById('adminUsername').textContent = userInfo.username;

        // بارگذاری اولیه
        switchTab('overview');

    } catch (error) {
        console.error('Error loading admin page:', error);
        window.location.href = '/login';
    }
}

// تغییر تب
function switchTab(tabName) {
    // پنهان کردن همه محتواها
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.style.display = 'none');

    // نمایش محتوای انتخاب شده
    const activeContent = document.getElementById(tabName);
    if (activeContent) {
        activeContent.style.display = 'block';
    }

    // به‌روزرسانی تب‌های فعال
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));

    const activeTab = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // بارگذاری داده‌ها بر اساس تب
    switch (tabName) {
        case 'overview':
            loadOverview();
            break;
        case 'tickets':
            loadTickets();
            break;
        case '3d-requests':
            load3DRequests();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// بارگذاری کلی
async function loadOverview() {
    const content = document.getElementById('overview');
    content.innerHTML = `
        <h2>خلاصه مدیریت سیستم</h2>
        <div class="overview-stats">
            <div class="stat-card">
                <h3>تیکت‌ها</h3>
                <div class="stat-number" id="overviewTicketsCount">در حال بارگذاری...</div>
            </div>
            <div class="stat-card">
                <h3>درخواست‌های 3D</h3>
                <div class="stat-number" id="overview3DCount">در حال بارگذاری...</div>
            </div>
            <div class="stat-card">
                <h3>کاربران</h3>
                <div class="stat-number" id="overviewUsersCount">در حال بارگذاری...</div>
            </div>
            <div class="stat-card">
                <h3>محصولات</h3>
                <div class="stat-number" id="overviewProductsCount">در حال بارگذاری...</div>
            </div>
        </div>
    `;

    // بارگذاری آمار
    try {
        // آمار تیکت‌ها
        const ticketsResponse = await fetch('/api/admin/tickets/stats/overview', { credentials: 'include' });
        if (ticketsResponse.ok) {
            const ticketsStats = await ticketsResponse.json();
            document.getElementById('overviewTicketsCount').textContent = ticketsStats.total;
        }

        // آمار درخواست‌های 3D
        const requestsResponse = await fetch('/api/admin/3d-requests/all?page=1&limit=1', { credentials: 'include' });
        if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json();
            document.getElementById('overview3DCount').textContent = requestsData.stats?.total || 0;
        }

    } catch (error) {
        console.error('Error loading overview stats:', error);
    }
}

// بارگذاری تیکت‌ها
async function loadTickets() {
    const content = document.getElementById('tickets');
    content.innerHTML = `
        <div class="tickets-summary">
            <h2>مدیریت تیکت‌ها</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" id="ticketsTotal">0</div>
                    <div class="stat-label">کل تیکت‌ها</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="ticketsOpen">0</div>
                    <div class="stat-label">باز</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="ticketsInProgress">0</div>
                    <div class="stat-label">در حال بررسی</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="ticketsResolved">0</div>
                    <div class="stat-label">حل شده</div>
                </div>
            </div>

            <div class="quick-actions" style="margin-top: 20px;">
                <a href="/admin-tickets" class="action-btn">
                    <i class="fas fa-external-link-alt"></i>
                    باز کردن پنل کامل تیکت‌ها
                </a>
            </div>

            <div class="recent-tickets" style="margin-top: 30px;">
                <h3>آخرین تیکت‌ها</h3>
                <div id="recentTicketsList">در حال بارگذاری...</div>
            </div>
        </div>
    `;

    try {
        // بارگذاری آمار تیکت‌ها
        const statsResponse = await fetch('/api/admin/tickets/stats/overview', { credentials: 'include' });
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            document.getElementById('ticketsTotal').textContent = stats.total;
            document.getElementById('ticketsOpen').textContent = stats.open;
            document.getElementById('ticketsInProgress').textContent = stats.inProgress;
            document.getElementById('ticketsResolved').textContent = stats.resolved;
        }

        // بارگذاری آخرین تیکت‌ها
        const ticketsResponse = await fetch('/api/admin/tickets/all?page=1&limit=5', { credentials: 'include' });
        if (ticketsResponse.ok) {
            const data = await ticketsResponse.json();
            const tickets = data.tickets || [];

            if (tickets.length > 0) {
                const ticketsHTML = tickets.map(ticket => `
                    <div class="ticket-item">
                        <div class="ticket-title">${ticket.title}</div>
                        <div class="ticket-meta">
                            <span class="ticket-status ${ticket.status}">${getStatusText(ticket.status)}</span>
                            <span>توسط: ${ticket.createdByName || ticket.createdBy}</span>
                            <span>${formatDate(ticket.createdAt)}</span>
                        </div>
                    </div>
                `).join('');
                document.getElementById('recentTicketsList').innerHTML = ticketsHTML;
            } else {
                document.getElementById('recentTicketsList').innerHTML = '<p>هیچ تیکتی یافت نشد</p>';
            }
        }

    } catch (error) {
        console.error('Error loading tickets:', error);
        document.getElementById('recentTicketsList').innerHTML = '<div class="error">خطا در بارگذاری تیکت‌ها</div>';
    }
}

// بارگذاری درخواست‌های 3D
async function load3DRequests() {
    const content = document.getElementById('3d-requests');
    content.innerHTML = `
        <div class="requests-summary">
            <h2>مدیریت درخواست‌های 3D</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" id="requestsTotal">0</div>
                    <div class="stat-label">کل درخواست‌ها</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="requestsPending">0</div>
                    <div class="stat-label">در انتظار بررسی</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="requestsApproved">0</div>
                    <div class="stat-label">تایید شده</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="requestsRejected">0</div>
                    <div class="stat-label">رد شده</div>
                </div>
            </div>

            <div class="quick-actions" style="margin-top: 20px;">
                <button onclick="show3DRequestsPanel()" class="action-btn">
                    <i class="fas fa-list"></i>
                    مدیریت کامل درخواست‌های 3D
                </button>
            </div>

            <div class="recent-requests" style="margin-top: 30px;">
                <h3>آخرین درخواست‌ها</h3>
                <div id="recentRequestsList">در حال بارگذاری...</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/admin/3d-requests/all?page=1&limit=10', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            const requests = data.requests || [];

            // به‌روزرسانی آمار
            document.getElementById('requestsTotal').textContent = data.stats?.total || 0;
            document.getElementById('requestsPending').textContent = data.stats?.pending || 0;
            document.getElementById('requestsApproved').textContent = data.stats?.approved || 0;
            document.getElementById('requestsRejected').textContent = data.stats?.rejected || 0;

            // نمایش آخرین درخواست‌ها
            if (requests.length > 0) {
                const requestsHTML = requests.slice(0, 5).map(request => `
                    <div class="request-item" onclick="open3DRequestDetails('${request.id}')" style="cursor: pointer;">
                        <div class="request-title">درخواست ${request.username} - محصول ${request.productId}</div>
                        <div class="request-meta">
                            <span class="request-status ${getStatusClass(request.status)}">${request.status}</span>
                            <span>کاربر: ${request.username}</span>
                            <span>${formatDate(request.submittedAt)}</span>
                        </div>
                    </div>
                `).join('');
                document.getElementById('recentRequestsList').innerHTML = requestsHTML;
            } else {
                document.getElementById('recentRequestsList').innerHTML = '<p>هیچ درخواستی یافت نشد</p>';
            }
        } else {
            throw new Error('خطا در بارگذاری درخواست‌ها');
        }
    } catch (error) {
        console.error('Error loading 3D requests:', error);
        document.getElementById('recentRequestsList').innerHTML = '<div class="error">خطا در بارگذاری درخواست‌های 3D</div>';
    }
}

// نمایش پنل کامل درخواست‌های 3D
async function show3DRequestsPanel() {
    const content = document.getElementById('3d-requests');
    content.innerHTML = `
        <div class="requests-management">
            <div class="page-header">
                <button onclick="load3DRequests()" class="back-btn">
                    <i class="fas fa-arrow-right"></i>
                    بازگشت
                </button>
                <h2>مدیریت کامل درخواست‌های 3D</h2>
            </div>

            <div class="filters-section">
                <div class="filter-group">
                    <label for="status3DFilter">فیلتر بر اساس وضعیت:</label>
                    <select id="status3DFilter" onchange="filter3DRequests()">
                        <option value="">همه</option>
                        <option value="در حال بررسی">در حال بررسی</option>
                        <option value="تایید شده">تایید شده</option>
                        <option value="رد شده">رد شده</option>
                    </select>
                </div>
                <button onclick="refresh3DRequests()" class="refresh-btn">
                    <i class="fas fa-refresh"></i>
                    بروزرسانی
                </button>
            </div>

            <div id="requests3DContainer" class="requests-container">
                در حال بارگذاری...
            </div>

            <div id="pagination3D" class="pagination-container"></div>
        </div>

        <!-- مودال جزئیات درخواست -->
        <div id="request3DDetailsModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="request3DDetailsTitle">جزئیات درخواست</h3>
                    <button onclick="close3DRequestModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="request3DInfo"></div>
                    <div class="modal-actions">
                        <button id="download3DVideoBtn" class="btn btn-info">
                            <i class="fas fa-download"></i>
                            دانلود ویدیو
                        </button>
                        <button onclick="open3DUploadModal()" class="btn btn-secondary">
                            <i class="fas fa-upload"></i>
                            آپلود JSON
                        </button>
                        <button id="approve3DBtn" onclick="approve3DRequest()" class="btn btn-success">
                            <i class="fas fa-check"></i>
                            تایید
                        </button>
                        <button onclick="reject3DRequest()" class="btn btn-warning">
                            <i class="fas fa-times"></i>
                            رد
                        </button>
                        <button onclick="delete3DRequest()" class="btn btn-danger">
                            <i class="fas fa-trash"></i>
                            حذف
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- مودال آپلود JSON -->
        <div id="upload3DJsonModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>آپلود فایل JSON</h3>
                    <button onclick="close3DUploadModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upload-section">
                        <input type="file" id="json3DInput" accept=".json" style="display: none;">
                        <button onclick="document.getElementById('json3DInput').click()" class="upload-btn">
                            <i class="fas fa-file-upload"></i>
                            انتخاب فایل JSON
                        </button>
                        <div id="json3DFileInfo" class="file-info" style="display: none;">
                            <span id="json3DFileName"></span>
                            <span id="json3DFileSize"></span>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button id="upload3DJsonBtn" onclick="upload3DJson()" class="btn btn-primary" disabled>
                            آپلود
                        </button>
                        <button onclick="close3DUploadModal()" class="btn btn-secondary">
                            انصراف
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- مودال تایید عملیات -->
        <div id="confirm3DModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="confirm3DTitle">تایید عملیات</h3>
                    <button onclick="close3DConfirmModal()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirm3DMessage"></p>
                    <div id="note3DGroup" class="form-group" style="display: none;">
                        <label for="confirm3DNote">یادداشت:</label>
                        <textarea id="confirm3DNote" rows="3" placeholder="یادداشت اختیاری"></textarea>
                    </div>
                    <div class="modal-actions">
                        <button onclick="execute3DConfirmAction()" class="btn btn-primary">
                            تایید
                        </button>
                        <button onclick="close3DConfirmModal()" class="btn btn-secondary">
                            انصراف
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // بارگذاری درخواست‌ها
    await load3DRequestsList();
}

// متغیرهای global برای مدیریت درخواست‌های 3D
let current3DPage = 1;
let current3DRequestId = null;
let confirm3DAction = null;

// بارگذاری لیست درخواست‌های 3D
async function load3DRequestsList(page = 1) {
    try {
        const statusFilter = document.getElementById('status3DFilter')?.value || '';
        const container = document.getElementById('requests3DContainer');

        if (!container) return;

        container.innerHTML = '<div class="loading">در حال بارگذاری...</div>';

        const params = new URLSearchParams({
            page: page.toString(),
            limit: '10'
        });

        if (statusFilter) {
            params.append('status', statusFilter);
        }

        const response = await fetch(`/api/admin/3d-requests/all?${params}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            display3DRequests(data.requests || []);
            display3DPagination(data);
            current3DPage = page;
        } else {
            container.innerHTML = '<div class="error">خطا در بارگذاری درخواست‌ها</div>';
        }

    } catch (error) {
        console.error('Error loading 3D requests:', error);
        const container = document.getElementById('requests3DContainer');
        if (container) {
            container.innerHTML = '<div class="error">خطا در اتصال به سرور</div>';
        }
    }
}

// نمایش درخواست‌های 3D
function display3DRequests(requests) {
    const container = document.getElementById('requests3DContainer');

    if (requests.length === 0) {
        container.innerHTML = '<div class="empty-state">هیچ درخواستی یافت نشد</div>';
        return;
    }

    const requestsHTML = requests.map(request => `
        <div class="request-card" onclick="open3DRequestDetails('${request.id}')">
            <div class="request-header">
                <div class="request-info">
                    <h4>درخواست ${request.username} - محصول ${request.productId}</h4>
                    <div class="request-meta">
                        <span>ارسال: ${formatDate(request.submittedAt)}</span>
                        <span>بروزرسانی: ${formatDate(request.updatedAt)}</span>
                    </div>
                </div>
                <span class="request-status ${getStatusClass(request.status)}">${request.status}</span>
            </div>
            <div class="request-details">
                <div class="detail-item">
                    <span class="label">شناسه:</span>
                    <span class="value">${request.id}</span>
                </div>
                <div class="detail-item">
                    <span class="label">کاربر:</span>
                    <span class="value">${request.username}</span>
                </div>
                <div class="detail-item">
                    <span class="label">محصول:</span>
                    <span class="value">${request.productId}</span>
                </div>
                <div class="detail-item">
                    <span class="label">JSON:</span>
                    <span class="value">${request.jsonPath ? 'آپلود شده' : 'آپلود نشده'}</span>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = requestsHTML;
}

// نمایش pagination برای درخواست‌های 3D
function display3DPagination(data) {
    const container = document.getElementById('pagination3D');

    if (data.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button ${!data.hasPrev ? 'disabled' : ''} onclick="load3DRequestsList(${data.page - 1})">
            قبلی
        </button>
        <span class="page-info">صفحه ${data.page} از ${data.totalPages}</span>
        <button ${!data.hasNext ? 'disabled' : ''} onclick="load3DRequestsList(${data.page + 1})">
            بعدی
        </button>
    `;
}

// باز کردن جزئیات درخواست 3D
async function open3DRequestDetails(requestId) {
    try {
        current3DRequestId = requestId;
        const response = await fetch(`/api/admin/3d-requests/${requestId}`, { credentials: 'include' });

        if (response.ok) {
            const data = await response.json();
            const request = data.request;

            document.getElementById('request3DDetailsTitle').textContent = `جزئیات درخواست ${request.id}`;

            // تنظیم دکمه دانلود
            const downloadBtn = document.getElementById('download3DVideoBtn');
            downloadBtn.onclick = () => download3DVideo(request.id);

            // تنظیم دکمه تایید
            const approveBtn = document.getElementById('approve3DBtn');
            approveBtn.disabled = !(request.status === 'در حال بررسی' && request.jsonPath);

            // نمایش اطلاعات
            document.getElementById('request3DInfo').innerHTML = `
                <div class="details-grid">
                    <div class="detail-row">
                        <span class="label">شناسه درخواست:</span>
                        <span class="value">${request.id}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">کاربر:</span>
                        <span class="value">${request.username}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">شناسه محصول:</span>
                        <span class="value">${request.productId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">وضعیت:</span>
                        <span class="value request-status ${getStatusClass(request.status)}">${request.status}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">تاریخ ارسال:</span>
                        <span class="value">${formatDate(request.submittedAt)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">آخرین بروزرسانی:</span>
                        <span class="value">${formatDate(request.updatedAt)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">فایل ویدیو:</span>
                        <span class="value">${request.videoPath}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">فایل JSON:</span>
                        <span class="value">${request.jsonPath || 'آپلود نشده'}</span>
                    </div>
                    ${request.approvedAt ? `
                    <div class="detail-row">
                        <span class="label">تاریخ تایید:</span>
                        <span class="value">${formatDate(request.approvedAt)}</span>
                    </div>
                    ` : ''}
                    ${request.rejectedAt ? `
                    <div class="detail-row">
                        <span class="label">تاریخ رد:</span>
                        <span class="value">${formatDate(request.rejectedAt)}</span>
                    </div>
                    ` : ''}
                    ${request.adminNote ? `
                    <div class="detail-row">
                        <span class="label">یادداشت ادمین:</span>
                        <span class="value">${request.adminNote}</span>
                    </div>
                    ` : ''}
                    ${request.rejectionReason ? `
                    <div class="detail-row">
                        <span class="label">دلیل رد:</span>
                        <span class="value">${request.rejectionReason}</span>
                    </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('request3DDetailsModal').style.display = 'flex';
        }

    } catch (error) {
        console.error('Error loading request details:', error);
        alert('خطا در بارگذاری جزئیات درخواست');
    }
}

// فیلتر درخواست‌های 3D
function filter3DRequests() {
    load3DRequestsList(1);
}

// بروزرسانی درخواست‌های 3D
function refresh3DRequests() {
    load3DRequestsList(current3DPage);
}

// دانلود ویدیو 3D
function download3DVideo(requestId = current3DRequestId) {
    if (!requestId) return;

    const downloadUrl = `/api/admin/3d-requests/${requestId}/download-video`;
    window.open(downloadUrl, '_blank');
}

// باز کردن مودال آپلود JSON
function open3DUploadModal() {
    document.getElementById('upload3DJsonModal').style.display = 'flex';
    setup3DJsonUpload();
}

// تنظیم آپلود JSON
function setup3DJsonUpload() {
    const jsonInput = document.getElementById('json3DInput');
    const jsonFileInfo = document.getElementById('json3DFileInfo');
    const uploadBtn = document.getElementById('upload3DJsonBtn');

    jsonInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];

            if (!file.type.includes('json') && !file.name.endsWith('.json')) {
                alert('لطفاً فقط فایل‌های JSON انتخاب کنید.');
                return;
            }

            document.getElementById('json3DFileName').textContent = file.name;
            document.getElementById('json3DFileSize').textContent = formatFileSize(file.size);

            jsonFileInfo.style.display = 'flex';
            uploadBtn.disabled = false;

            window.selected3DJsonFile = file;
        }
    });
}

// آپلود فایل JSON
async function upload3DJson() {
    if (!current3DRequestId || !window.selected3DJsonFile) {
        alert('لطفاً ابتدا فایل JSON را انتخاب کنید.');
        return;
    }

    const uploadBtn = document.getElementById('upload3DJsonBtn');

    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'در حال آپلود...';

        const formData = new FormData();
        formData.append('jsonFile', window.selected3DJsonFile);

        const response = await fetch(`/api/admin/3d-requests/${current3DRequestId}/upload-json`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            alert('فایل JSON با موفقیت آپلود شد');
            close3DUploadModal();
            open3DRequestDetails(current3DRequestId);
        } else {
            const error = await response.json();
            alert(error.error || 'خطا در آپلود فایل');
        }

    } catch (error) {
        console.error('Error uploading JSON:', error);
        alert('خطا در آپلود فایل JSON');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'آپلود';
    }
}

// تایید درخواست 3D
function approve3DRequest() {
    document.getElementById('confirm3DTitle').textContent = 'تایید درخواست';
    document.getElementById('confirm3DMessage').textContent = 'آیا مطمئن هستید که می‌خواهید این درخواست را تایید کنید؟';
    document.getElementById('note3DGroup').style.display = 'block';
    document.getElementById('confirm3DNote').placeholder = 'یادداشت تایید (اختیاری)';

    confirm3DAction = async () => {
        const note = document.getElementById('confirm3DNote').value;

        try {
            const response = await fetch(`/api/admin/3d-requests/${current3DRequestId}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note }),
                credentials: 'include'
            });

            if (response.ok) {
                alert('درخواست با موفقیت تایید شد');
                close3DConfirmModal();
                close3DRequestModal();
                load3DRequestsList(current3DPage);
            } else {
                const error = await response.json();
                alert(error.error || 'خطا در تایید درخواست');
            }
        } catch (error) {
            console.error('Error approving request:', error);
            alert('خطا در تایید درخواست');
        }
    };

    document.getElementById('confirm3DModal').style.display = 'flex';
}

// رد کردن درخواست 3D
function reject3DRequest() {
    document.getElementById('confirm3DTitle').textContent = 'رد درخواست';
    document.getElementById('confirm3DMessage').textContent = 'آیا مطمئن هستید که می‌خواهید این درخواست را رد کنید؟';
    document.getElementById('note3DGroup').style.display = 'block';
    document.getElementById('confirm3DNote').placeholder = 'دلیل رد (اختیاری)';

    confirm3DAction = async () => {
        const reason = document.getElementById('confirm3DNote').value;

        try {
            const response = await fetch(`/api/admin/3d-requests/${current3DRequestId}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
                credentials: 'include'
            });

            if (response.ok) {
                alert('درخواست رد شد');
                close3DConfirmModal();
                close3DRequestModal();
                load3DRequestsList(current3DPage);
            } else {
                const error = await response.json();
                alert(error.error || 'خطا در رد درخواست');
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('خطا در رد درخواست');
        }
    };

    document.getElementById('confirm3DModal').style.display = 'flex';
}

// حذف درخواست 3D
function delete3DRequest() {
    document.getElementById('confirm3DTitle').textContent = 'حذف درخواست';
    document.getElementById('confirm3DMessage').textContent = 'آیا مطمئن هستید که می‌خواهید این درخواست را حذف کنید؟ این عمل غیرقابل بازگشت است.';
    document.getElementById('note3DGroup').style.display = 'none';

    confirm3DAction = async () => {
        try {
            const response = await fetch(`/api/admin/3d-requests/${current3DRequestId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                alert('درخواست با موفقیت حذف شد');
                close3DConfirmModal();
                close3DRequestModal();
                load3DRequestsList(current3DPage);
            } else {
                const error = await response.json();
                alert(error.error || 'خطا در حذف درخواست');
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('خطا در حذف درخواست');
        }
    };

    document.getElementById('confirm3DModal').style.display = 'flex';
}

// اجرای عمل تایید شده
function execute3DConfirmAction() {
    if (confirm3DAction) {
        confirm3DAction();
    }
}

// بستن مودال‌ها
function close3DRequestModal() {
    document.getElementById('request3DDetailsModal').style.display = 'none';
    current3DRequestId = null;
}

function close3DUploadModal() {
    document.getElementById('upload3DJsonModal').style.display = 'none';
    document.getElementById('json3DInput').value = '';
    document.getElementById('json3DFileInfo').style.display = 'none';
    document.getElementById('upload3DJsonBtn').disabled = true;
    window.selected3DJsonFile = null;
}

function close3DConfirmModal() {
    document.getElementById('confirm3DModal').style.display = 'none';
    document.getElementById('confirm3DNote').value = '';
    confirm3DAction = null;
}

// بارگذاری اعلان‌ها
async function loadNotifications() {
    const content = document.getElementById('notifications');
    content.innerHTML = `
        <h2>مدیریت اعلان‌ها</h2>
        <div class="notifications-content">
            <p>این بخش در حال توسعه است...</p>
        </div>
    `;
}

// توابع کمکی
function formatFileSize(bytes) {
    if (bytes === 0) return '0 بایت';
    const k = 1024;
    const sizes = ['بایت', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}