var AdminApp = (function() {
    var activeView = 'dashboard';
    var tokenKey = 'qx_admin_token';
    var pageSize = 20;

    function apiBase() {
        return (typeof CONFIG !== 'undefined' && CONFIG.api && CONFIG.api.baseUrl) ? CONFIG.api.baseUrl : '';
    }

    function token() {
        return normalizeToken(localStorage.getItem(tokenKey) || '');
    }

    function setToken(value) {
        var normalized = normalizeToken(value || '');
        if (normalized) {
            localStorage.setItem(tokenKey, normalized);
        } else {
            localStorage.removeItem(tokenKey);
        }
    }

    function normalizeToken(value) {
        return String(value || '').replace(/\s+/g, '');
    }

    function escape(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function money(value, currency) {
        var n = Number(value || 0);
        return (currency || 'USD') + ' ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function shortDate(value) {
        if (!value) return '';
        var d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString();
    }

    function statusLabel(value) {
        return {
            cooling_period: '冷静期',
            active: '激活中',
            completed: '已完成',
            refund_pending: '退款处理中',
            refunded: '已退款',
            draft: '冷静期',
            submitted: '激活中',
            cancelled: '已退款'
        }[value] || value || '';
    }

    function showAlert(message) {
        var el = document.getElementById('adminAlert');
        if (!el) return;
        el.textContent = message;
        el.style.display = message ? 'block' : 'none';
    }

    function setStatus(message) {
        var el = document.getElementById('adminStatusText');
        if (el) el.textContent = message;
    }

    function setLoginVisible(visible) {
        var panel = document.getElementById('adminLoginPanel');
        if (panel) panel.style.display = visible ? 'block' : 'none';
    }

    function request(path, options) {
        if (!apiBase()) {
            return Promise.reject(new Error('API 地址尚未配置。'));
        }
        if (!token()) {
            return Promise.reject(new Error('请先登录管理员账号。'));
        }

        var requestOptions = options || {};
        requestOptions.headers = Object.assign({
            Authorization: 'Bearer ' + token()
        }, requestOptions.headers || {});

        return fetch(apiBase() + path, requestOptions).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(body) {
                if (!response.ok) {
                    throw new Error(body.message || ('HTTP ' + response.status));
                }
                return body.data || body;
            });
        }).catch(function(error) {
            if (error && error.message === 'Failed to fetch') {
                throw new Error('请求失败：请确认正在使用线上后台地址，并检查 API 跨域或网络连接。');
            }
            throw error;
        });
    }

    function login(username, password) {
        if (!apiBase()) {
            return Promise.reject(new Error('API 地址尚未配置。'));
        }
        return fetch(apiBase() + '/api/v1/admin/login', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        }).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(body) {
                if (!response.ok) {
                    throw new Error(body.message || ('HTTP ' + response.status));
                }
                return body.data || body;
            });
        }).catch(function(error) {
            if (error && error.message === 'Failed to fetch') {
                throw new Error('登录请求失败：请检查 API 跨域或网络连接。');
            }
            throw error;
        });
    }

    function renderMetrics(data) {
        var totals = data.totals || {};
        var metrics = [
            { label: '用户总数', value: totals.users || 0, icon: 'group' },
            { label: '订单总数', value: totals.orders || 0, icon: 'receipt_long' },
            { label: '成交金额', value: money(totals.revenue || 0), icon: 'payments' },
            { label: '冷静期订单', value: totals.coolingPeriodOrders || 0, icon: 'hourglass_top' },
            { label: '激活中订单', value: totals.activeOrders || 0, icon: 'task_alt' },
            { label: '已完成订单', value: totals.completedOrders || 0, icon: 'verified' },
            { label: '退款处理中', value: totals.refundPendingOrders || 0, icon: 'pending_actions' },
            { label: '已退款订单', value: totals.refundedOrders || 0, icon: 'assignment_return' },
            { label: '审计事件', value: totals.auditEvents || 0, icon: 'manage_search' }
        ];
        var html = metrics.map(function(item) {
            return '<div class="admin-metric">' +
                '<span class="material-symbols-outlined">' + escape(item.icon) + '</span>' +
                '<div><strong>' + escape(item.value) + '</strong><small>' + escape(item.label) + '</small></div>' +
                '</div>';
        }).join('');
        var el = document.getElementById('adminMetrics');
        if (el) el.innerHTML = html;
    }

    function renderStatusList(data) {
        var rows = data.orderStatus || [];
        var html = rows.length ? rows.map(function(row) {
            return '<div class="admin-status-row"><span>' + escape(statusLabel(row.status)) + '</span><strong>' + escape(row.total) + '</strong></div>';
        }).join('') : '<p class="admin-empty">暂无订单状态数据。</p>';
        var el = document.getElementById('adminStatusList');
        if (el) el.innerHTML = html;
    }

    function renderTrend(data) {
        var rows = data.trends || [];
        var maxOrders = rows.reduce(function(max, row) { return Math.max(max, Number(row.orders || 0)); }, 1);
        var html = rows.length ? rows.map(function(row) {
            var pct = Math.max(4, Math.round((Number(row.orders || 0) / maxOrders) * 100));
            return '<div class="admin-trend-row">' +
                '<span>' + escape(row.day) + '</span>' +
                '<div class="admin-trend-bar"><i style="width:' + pct + '%"></i></div>' +
                '<strong>' + escape(row.orders) + '</strong>' +
                '</div>';
        }).join('') : '<p class="admin-empty">暂无近期订单。</p>';
        var el = document.getElementById('adminTrend');
        if (el) el.innerHTML = html;
    }

    function table(id, columns, rows) {
        var el = document.getElementById(id);
        if (!el) return;
        var head = '<thead><tr>' + columns.map(function(col) { return '<th>' + escape(col.label) + '</th>'; }).join('') + '</tr></thead>';
        var bodyRows = rows.length ? rows.map(function(row) {
            return '<tr>' + columns.map(function(col) {
                return '<td>' + (col.html ? col.value(row) : escape(col.value(row))) + '</td>';
            }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="' + columns.length + '">暂无数据。</td></tr>';
        el.innerHTML = head + '<tbody>' + bodyRows + '</tbody>';
    }

    function meta(id, data) {
        var el = document.getElementById(id);
        if (el) el.textContent = '共 ' + (data.total || 0) + ' 条';
    }

    function loadDashboard() {
        return request('/api/v1/admin/dashboard').then(function(data) {
            renderMetrics(data);
            renderStatusList(data);
            renderTrend(data);
            setStatus('已连接，当前角色：' + (data.role || 'admin') + '。');
        });
    }

    function loadOrders() {
        return request('/api/v1/admin/orders?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminOrdersMeta', data);
            table('adminOrdersTable', [
                { label: '订单 ID', value: function(row) { return row.orderId; } },
                { label: '用户', value: function(row) { return row.userEmail || row.userId; } },
                { label: '状态', value: function(row) { return statusLabel(row.status); } },
                { label: '金额', value: function(row) { return money(row.amount, row.currency); } },
                { label: '意向 ID', value: function(row) { return row.sourceIntentId || ''; } },
                { label: '创建时间', value: function(row) { return shortDate(row.createdAt); } },
                {
                    label: '操作',
                    html: true,
                    value: function(row) {
                        return '<button class="admin-link-btn" type="button" data-admin-order-id="' + escape(row.orderId) + '">查看</button>';
                    }
                }
            ], data.list || []);
            bindOrderActions();
        });
    }

    function detailItem(label, value) {
        return '<div class="admin-detail-item"><span>' + escape(label) + '</span><strong>' + escape(value || '-') + '</strong></div>';
    }

    function refundStatusLabel(value) {
        return {
            pending: '待审核',
            approved: '已批准',
            rejected: '已拒绝'
        }[value] || value || '';
    }

    function renderOrderDetail(order) {
        var panel = document.getElementById('adminOrderDetailPanel');
        var detail = document.getElementById('adminOrderDetail');
        var statusSelect = document.getElementById('adminOrderStatusSelect');
        var updateBtn = document.getElementById('adminUpdateOrderStatusBtn');
        if (!panel || !detail) return;

        var intent = order.purchaseIntent || {};
        detail.innerHTML = [
            detailItem('订单 ID', order.orderId),
            detailItem('用户', order.userEmail || order.userId),
            detailItem('状态', statusLabel(order.status)),
            detailItem('金额', money(order.amount, order.currency)),
            detailItem('购买意向 ID', order.sourceIntentId || ''),
            detailItem('产品', intent.productCode || ''),
            detailItem('数量', intent.quantity || ''),
            detailItem('支付渠道', intent.paymentProvider || ''),
            detailItem('支付参考号', intent.paymentRef || ''),
            detailItem('创建时间', shortDate(order.createdAt)),
            detailItem('更新时间', shortDate(order.updatedAt)),
            detailItem('备注', intent.note || '')
        ].join('');

        if (statusSelect) statusSelect.value = order.status || 'cooling_period';
        if (updateBtn) updateBtn.setAttribute('data-admin-order-id', order.orderId);
        panel.style.display = 'block';
    }

    function loadOrderDetail(orderId) {
        showAlert('');
        setStatus('正在加载订单详情...');
        return request('/api/v1/admin/orders/' + encodeURIComponent(orderId)).then(function(data) {
            renderOrderDetail(data);
            setStatus('已连接。');
        }).catch(function(error) {
            setStatus('未连接。');
            showAlert(error.message || '订单详情加载失败。');
        });
    }

    function updateOrderStatus(orderId, status) {
        showAlert('');
        setStatus('正在保存订单状态...');
        return request('/api/v1/admin/orders/' + encodeURIComponent(orderId) + '/status', {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        }).then(function() {
            setStatus('订单状态已更新。');
            return Promise.all([loadOrders(), loadOrderDetail(orderId)]);
        }).catch(function(error) {
            setStatus('未连接。');
            showAlert(error.message || '订单状态更新失败。');
        });
    }

    function bindOrderActions() {
        document.querySelectorAll('[data-admin-order-id]').forEach(function(btn) {
            if (btn.getAttribute('data-admin-bound') === 'true') return;
            btn.setAttribute('data-admin-bound', 'true');
            btn.addEventListener('click', function() {
                loadOrderDetail(btn.getAttribute('data-admin-order-id'));
            });
        });
    }

    function loadIntents() {
        return request('/api/v1/admin/purchase-intents?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminIntentsMeta', data);
            table('adminIntentsTable', [
                { label: '意向 ID', value: function(row) { return row.intentId; } },
                { label: '用户', value: function(row) { return row.userEmail || row.userId; } },
                { label: '产品', value: function(row) { return row.productCode; } },
                { label: '状态', value: function(row) { return row.status; } },
                { label: '数量', value: function(row) { return row.quantity; } },
                { label: '金额', value: function(row) { return money(row.amount, row.currency); } },
                { label: '创建时间', value: function(row) { return shortDate(row.createdAt); } }
            ], data.list || []);
        });
    }

    function loadRefunds() {
        return request('/api/v1/admin/refund-requests?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminRefundsMeta', data);
            table('adminRefundsTable', [
                { label: '退款 ID', value: function(row) { return row.refundId; } },
                { label: '订单 ID', value: function(row) { return row.orderId; } },
                { label: '用户', value: function(row) { return row.userEmail || row.userId; } },
                { label: '退款状态', value: function(row) { return refundStatusLabel(row.status); } },
                { label: '订单状态', value: function(row) { return statusLabel(row.orderStatus); } },
                { label: '金额', value: function(row) { return money(row.amount, row.currency); } },
                { label: '申请时间', value: function(row) { return shortDate(row.createdAt); } },
                {
                    label: '操作',
                    html: true,
                    value: function(row) {
                        var label = row.status === 'pending' ? '审核' : '查看';
                        return '<button class="admin-link-btn" type="button" data-admin-refund=\'' + escape(JSON.stringify(row)) + '\'>' + label + '</button>';
                    }
                }
            ], data.list || []);
            bindRefundActions();
        });
    }

    function renderRefundReview(refund) {
        var panel = document.getElementById('adminRefundReviewPanel');
        var detail = document.getElementById('adminRefundReviewDetail');
        var note = document.getElementById('adminRefundReviewNote');
        var approveBtn = document.getElementById('adminApproveRefundBtn');
        var rejectBtn = document.getElementById('adminRejectRefundBtn');
        if (!panel || !detail) return;

        detail.innerHTML = [
            detailItem('退款 ID', refund.refundId),
            detailItem('订单 ID', refund.orderId),
            detailItem('用户', refund.userEmail || refund.userId),
            detailItem('退款状态', refundStatusLabel(refund.status)),
            detailItem('订单状态', statusLabel(refund.orderStatus)),
            detailItem('金额', money(refund.amount, refund.currency)),
            detailItem('申请原因', refund.reason || ''),
            detailItem('申请时间', shortDate(refund.createdAt)),
            detailItem('审核时间', shortDate(refund.reviewedAt))
        ].join('');

        if (note) note.value = refund.adminNote || '';
        if (approveBtn) approveBtn.setAttribute('data-admin-refund-id', refund.refundId);
        if (rejectBtn) rejectBtn.setAttribute('data-admin-refund-id', refund.refundId);
        if (approveBtn) approveBtn.disabled = refund.status !== 'pending';
        if (rejectBtn) rejectBtn.disabled = refund.status !== 'pending';
        panel.style.display = 'block';
    }

    function reviewRefund(refundId, decision) {
        var note = document.getElementById('adminRefundReviewNote');
        showAlert('');
        setStatus('正在提交退款审核...');
        return request('/api/v1/admin/refund-requests/' + encodeURIComponent(refundId) + '/review', {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                decision: decision,
                adminNote: note ? note.value : ''
            })
        }).then(function() {
            setStatus('退款审核已提交。');
            var panel = document.getElementById('adminRefundReviewPanel');
            if (panel) panel.style.display = 'none';
            return Promise.all([loadRefunds(), loadOrders(), loadDashboard()]);
        }).catch(function(error) {
            setStatus('未连接。');
            showAlert(error.message || '退款审核提交失败。');
        });
    }

    function bindRefundActions() {
        document.querySelectorAll('[data-admin-refund]').forEach(function(btn) {
            if (btn.getAttribute('data-admin-bound') === 'true') return;
            btn.setAttribute('data-admin-bound', 'true');
            btn.addEventListener('click', function() {
                try {
                    renderRefundReview(JSON.parse(btn.getAttribute('data-admin-refund') || '{}'));
                } catch (error) {
                    showAlert('退款申请数据解析失败。');
                }
            });
        });
    }

    function loadUsers() {
        return request('/api/v1/admin/users?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminUsersMeta', data);
            table('adminUsersTable', [
                { label: '用户 ID', value: function(row) { return row.userId; } },
                { label: '邮箱', value: function(row) { return row.email || ''; } },
                { label: '姓名', value: function(row) { return row.displayName || ''; } },
                { label: '国家区号', value: function(row) { return row.countryCode || ''; } },
                { label: '订单数', value: function(row) { return row.orderCount; } },
                { label: '订单金额', value: function(row) { return money(row.orderAmount); } },
                { label: '最近登录', value: function(row) { return shortDate(row.lastLoginAt); } }
            ], data.list || []);
        });
    }

    function loadAudit() {
        return request('/api/v1/admin/audit-logs?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminAuditMeta', data);
            table('adminAuditTable', [
                { label: '日志 ID', value: function(row) { return row.auditId; } },
                { label: '用户 ID', value: function(row) { return row.userId || ''; } },
                { label: '方法', value: function(row) { return row.method; } },
                { label: '路径', value: function(row) { return row.route; } },
                { label: '状态码', value: function(row) { return row.statusCode; } },
                { label: '创建时间', value: function(row) { return shortDate(row.createdAt); } }
            ], data.list || []);
        });
    }

    function loadActive() {
        showAlert('');
        if (!token()) {
            setLoginVisible(true);
            setStatus('请登录管理员账号。');
            return Promise.resolve();
        }
        setLoginVisible(false);
        setStatus('正在加载数据...');
        var loader = {
            dashboard: loadDashboard,
            orders: loadOrders,
            intents: loadIntents,
            refunds: loadRefunds,
            users: loadUsers,
            audit: loadAudit
        }[activeView] || loadDashboard;

        return loader().catch(function(error) {
            setStatus('未连接。');
            if ((error.message || '').indexOf('Unauthorized') !== -1) {
                setToken('');
                setLoginVisible(true);
                showAlert('登录已失效，请重新登录。');
                return;
            }
            showAlert(error.message || '后台数据加载失败。');
        });
    }

    function switchView(view) {
        activeView = view;
        document.querySelectorAll('.admin-nav-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-admin-view') === view);
        });
        document.querySelectorAll('.admin-view').forEach(function(section) {
            section.classList.remove('active');
        });
        var id = 'adminView' + view.slice(0, 1).toUpperCase() + view.slice(1);
        if (view === 'intents') id = 'adminViewIntents';
        if (view === 'refunds') id = 'adminViewRefunds';
        if (view === 'audit') id = 'adminViewAudit';
        var section = document.getElementById(id);
        if (section) section.classList.add('active');
        loadActive();
    }

    function init() {
        var usernameInput = document.getElementById('adminUsernameInput');
        var passwordInput = document.getElementById('adminPasswordInput');
        var loginForm = document.getElementById('adminLoginForm');
        var loginBtn = document.getElementById('adminLoginBtn');
        var closeOrderDetailBtn = document.getElementById('adminCloseOrderDetailBtn');
        var updateOrderStatusBtn = document.getElementById('adminUpdateOrderStatusBtn');
        var orderStatusSelect = document.getElementById('adminOrderStatusSelect');
        var closeRefundReviewBtn = document.getElementById('adminCloseRefundReviewBtn');
        var approveRefundBtn = document.getElementById('adminApproveRefundBtn');
        var rejectRefundBtn = document.getElementById('adminRejectRefundBtn');

        document.querySelectorAll('.admin-nav-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchView(btn.getAttribute('data-admin-view') || 'dashboard');
            });
        });

        if (loginForm) {
            loginForm.addEventListener('submit', function(event) {
                event.preventDefault();
                var username = usernameInput ? usernameInput.value.trim() : '';
                var password = passwordInput ? passwordInput.value : '';
                showAlert('');
                if (!username || !password) {
                    showAlert('请输入管理员用户名和密码。');
                    return;
                }
                if (loginBtn) {
                    loginBtn.disabled = true;
                    loginBtn.textContent = '登录中...';
                }
                setStatus('正在登录...');
                login(username, password).then(function(data) {
                    setToken(data.idToken || '');
                    if (passwordInput) passwordInput.value = '';
                    setLoginVisible(false);
                    return loadActive();
                }).catch(function(error) {
                    setToken('');
                    setStatus('未连接。');
                    showAlert(error.message || '登录失败。');
                }).finally(function() {
                    if (loginBtn) {
                        loginBtn.disabled = false;
                        loginBtn.textContent = '登录';
                    }
                });
            });
        }

        var refreshBtn = document.getElementById('adminRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', loadActive);

        if (closeOrderDetailBtn) {
            closeOrderDetailBtn.addEventListener('click', function() {
                var panel = document.getElementById('adminOrderDetailPanel');
                if (panel) panel.style.display = 'none';
            });
        }

        if (updateOrderStatusBtn) {
            updateOrderStatusBtn.addEventListener('click', function() {
                var orderId = updateOrderStatusBtn.getAttribute('data-admin-order-id');
                var status = orderStatusSelect ? orderStatusSelect.value : '';
                if (!orderId) {
                    showAlert('请先选择订单。');
                    return;
                }
                updateOrderStatus(orderId, status);
            });
        }

        if (closeRefundReviewBtn) {
            closeRefundReviewBtn.addEventListener('click', function() {
                var panel = document.getElementById('adminRefundReviewPanel');
                if (panel) panel.style.display = 'none';
                if (approveRefundBtn) {
                    approveRefundBtn.removeAttribute('data-admin-refund-id');
                    approveRefundBtn.disabled = false;
                }
                if (rejectRefundBtn) {
                    rejectRefundBtn.removeAttribute('data-admin-refund-id');
                    rejectRefundBtn.disabled = false;
                }
            });
        }

        if (approveRefundBtn) {
            approveRefundBtn.addEventListener('click', function() {
                var refundId = approveRefundBtn.getAttribute('data-admin-refund-id');
                if (!refundId) {
                    showAlert('请先选择退款申请。');
                    return;
                }
                reviewRefund(refundId, 'approve');
            });
        }

        if (rejectRefundBtn) {
            rejectRefundBtn.addEventListener('click', function() {
                var refundId = rejectRefundBtn.getAttribute('data-admin-refund-id');
                if (!refundId) {
                    showAlert('请先选择退款申请。');
                    return;
                }
                reviewRefund(refundId, 'reject');
            });
        }

        var logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                setToken('');
                if (passwordInput) passwordInput.value = '';
                setLoginVisible(true);
                setStatus('已退出，请重新登录。');
                showAlert('');
            });
        }

        loadActive();
    }

    return {
        init: init
    };
})();

PageInit.initAdminPage = function() {
    var header = document.getElementById('header-placeholder');
    var footer = document.getElementById('footer-placeholder');
    var cookieBanner = document.getElementById('cookie-banner');
    var previousHeaderDisplay = header ? header.style.display : '';
    var previousFooterDisplay = footer ? footer.style.display : '';
    var previousCookieDisplay = cookieBanner ? cookieBanner.style.display : '';
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (cookieBanner) cookieBanner.style.display = 'none';

    AdminApp.init();

    return function() {
        if (header) header.style.display = previousHeaderDisplay;
        if (footer) footer.style.display = previousFooterDisplay;
        if (cookieBanner) cookieBanner.style.display = previousCookieDisplay;
    };
};
