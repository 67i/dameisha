var AdminApp = (function() {
    var activeView = 'dashboard';
    var tokenKey = 'qx_admin_token';
    var pageSize = 20;

    function apiBase() {
        return (typeof CONFIG !== 'undefined' && CONFIG.api && CONFIG.api.baseUrl) ? CONFIG.api.baseUrl : '';
    }

    function token() {
        return localStorage.getItem(tokenKey) || '';
    }

    function setToken(value) {
        if (value) {
            localStorage.setItem(tokenKey, value);
        } else {
            localStorage.removeItem(tokenKey);
        }
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

    function request(path) {
        if (!apiBase()) {
            return Promise.reject(new Error('API base URL is not configured.'));
        }
        if (!token()) {
            return Promise.reject(new Error('Admin token is required.'));
        }

        return fetch(apiBase() + path, {
            headers: {
                Authorization: 'Bearer ' + token()
            }
        }).then(function(response) {
            return response.json().catch(function() { return {}; }).then(function(body) {
                if (!response.ok) {
                    throw new Error(body.message || ('HTTP ' + response.status));
                }
                return body.data || body;
            });
        });
    }

    function renderMetrics(data) {
        var totals = data.totals || {};
        var metrics = [
            { label: 'Users', value: totals.users || 0, icon: 'group' },
            { label: 'Orders', value: totals.orders || 0, icon: 'receipt_long' },
            { label: 'Revenue', value: money(totals.revenue || 0), icon: 'payments' },
            { label: 'Submitted', value: totals.submittedOrders || 0, icon: 'task_alt' },
            { label: 'Draft', value: totals.draftOrders || 0, icon: 'pending_actions' },
            { label: 'Audit events', value: totals.auditEvents || 0, icon: 'manage_search' }
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
            return '<div class="admin-status-row"><span>' + escape(row.status) + '</span><strong>' + escape(row.total) + '</strong></div>';
        }).join('') : '<p class="admin-empty">No order status data.</p>';
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
        }).join('') : '<p class="admin-empty">No recent orders.</p>';
        var el = document.getElementById('adminTrend');
        if (el) el.innerHTML = html;
    }

    function table(id, columns, rows) {
        var el = document.getElementById(id);
        if (!el) return;
        var head = '<thead><tr>' + columns.map(function(col) { return '<th>' + escape(col.label) + '</th>'; }).join('') + '</tr></thead>';
        var bodyRows = rows.length ? rows.map(function(row) {
            return '<tr>' + columns.map(function(col) {
                return '<td>' + escape(col.value(row)) + '</td>';
            }).join('') + '</tr>';
        }).join('') : '<tr><td colspan="' + columns.length + '">No data.</td></tr>';
        el.innerHTML = head + '<tbody>' + bodyRows + '</tbody>';
    }

    function meta(id, data) {
        var el = document.getElementById(id);
        if (el) el.textContent = 'Total ' + (data.total || 0);
    }

    function loadDashboard() {
        return request('/api/v1/admin/dashboard').then(function(data) {
            renderMetrics(data);
            renderStatusList(data);
            renderTrend(data);
            setStatus('Connected as ' + (data.role || 'admin') + '.');
        });
    }

    function loadOrders() {
        return request('/api/v1/admin/orders?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminOrdersMeta', data);
            table('adminOrdersTable', [
                { label: 'Order ID', value: function(row) { return row.orderId; } },
                { label: 'User', value: function(row) { return row.userEmail || row.userId; } },
                { label: 'Status', value: function(row) { return row.status; } },
                { label: 'Amount', value: function(row) { return money(row.amount, row.currency); } },
                { label: 'Intent', value: function(row) { return row.sourceIntentId || ''; } },
                { label: 'Created', value: function(row) { return shortDate(row.createdAt); } }
            ], data.list || []);
        });
    }

    function loadIntents() {
        return request('/api/v1/admin/purchase-intents?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminIntentsMeta', data);
            table('adminIntentsTable', [
                { label: 'Intent ID', value: function(row) { return row.intentId; } },
                { label: 'User', value: function(row) { return row.userEmail || row.userId; } },
                { label: 'Product', value: function(row) { return row.productCode; } },
                { label: 'Status', value: function(row) { return row.status; } },
                { label: 'Qty', value: function(row) { return row.quantity; } },
                { label: 'Amount', value: function(row) { return money(row.amount, row.currency); } },
                { label: 'Created', value: function(row) { return shortDate(row.createdAt); } }
            ], data.list || []);
        });
    }

    function loadUsers() {
        return request('/api/v1/admin/users?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminUsersMeta', data);
            table('adminUsersTable', [
                { label: 'User ID', value: function(row) { return row.userId; } },
                { label: 'Email', value: function(row) { return row.email || ''; } },
                { label: 'Name', value: function(row) { return row.displayName || ''; } },
                { label: 'Country', value: function(row) { return row.countryCode || ''; } },
                { label: 'Orders', value: function(row) { return row.orderCount; } },
                { label: 'Amount', value: function(row) { return money(row.orderAmount); } },
                { label: 'Last login', value: function(row) { return shortDate(row.lastLoginAt); } }
            ], data.list || []);
        });
    }

    function loadAudit() {
        return request('/api/v1/admin/audit-logs?page=1&pageSize=' + pageSize).then(function(data) {
            meta('adminAuditMeta', data);
            table('adminAuditTable', [
                { label: 'Audit ID', value: function(row) { return row.auditId; } },
                { label: 'User ID', value: function(row) { return row.userId || ''; } },
                { label: 'Method', value: function(row) { return row.method; } },
                { label: 'Route', value: function(row) { return row.route; } },
                { label: 'Status', value: function(row) { return row.statusCode; } },
                { label: 'Created', value: function(row) { return shortDate(row.createdAt); } }
            ], data.list || []);
        });
    }

    function loadActive() {
        showAlert('');
        setStatus('Loading ' + activeView + '...');
        var loader = {
            dashboard: loadDashboard,
            orders: loadOrders,
            intents: loadIntents,
            users: loadUsers,
            audit: loadAudit
        }[activeView] || loadDashboard;

        return loader().catch(function(error) {
            setStatus('Disconnected.');
            showAlert(error.message || 'Failed to load admin data.');
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
        if (view === 'audit') id = 'adminViewAudit';
        var section = document.getElementById(id);
        if (section) section.classList.add('active');
        loadActive();
    }

    function init() {
        var input = document.getElementById('adminTokenInput');
        if (input) input.value = token();

        document.querySelectorAll('.admin-nav-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                switchView(btn.getAttribute('data-admin-view') || 'dashboard');
            });
        });

        var saveBtn = document.getElementById('adminSaveTokenBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                setToken(input ? input.value.trim() : '');
                loadActive();
            });
        }

        var refreshBtn = document.getElementById('adminRefreshBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', loadActive);

        var logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                setToken('');
                if (input) input.value = '';
                setStatus('Token cleared.');
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
    AdminApp.init();
};
