import CONFIG from './config.js';
import { apiCall, safeJSONParse } from './main.js';

async function initAdminDashboard() {
    const token = localStorage.getItem('auth_token');
    const user = safeJSONParse(localStorage.getItem('user_data'), {});

    // Robust Admin Check matching auth.js
    if (!token || !(user.role === 'admin' || user.role === 'Admin' || user.is_admin === true || user.is_admin === 1)) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const nameEl = document.getElementById('admin-name');
    if (nameEl) nameEl.innerText = user.name || 'Admin';
    
    await fetchDashboardStats();
    if (window.Chart) {
        initCharts();
    }
}

async function fetchDashboardStats() {
    try {
        const data = await apiCall('/admin/dashboard-stats');
        if (!data) return;

        const revEl = document.getElementById('stat-revenue');
        const ordEl = document.getElementById('stat-orders');
        const usrEl = document.getElementById('stat-users');
        const prdEl = document.getElementById('stat-products');

        if (revEl) revEl.innerText = `₹${Number(data.total_revenue || 0).toLocaleString()}`;
        if (ordEl) ordEl.innerText = data.total_orders || 0;
        if (usrEl) usrEl.innerText = data.total_users || 0;
        if (prdEl) prdEl.innerText = data.total_products || 0;

        if (data.recent_orders) {
            renderRecentOrders(data.recent_orders);
        }
    } catch (e) {
        console.error('Stats fetch error', e);
    }
}

function renderRecentOrders(orders) {
    const table = document.getElementById('recent-orders-table');
    if (!table || !Array.isArray(orders)) return;

    table.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black text-slate-900 italic">#${o.order_number || o.id}</td>
            <td class="px-6 py-4">${o.user?.name || 'Customer'}</td>
            <td class="px-6 py-4 font-bold">₹${Number(o.total_amount || 0).toLocaleString()}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${getStatusStyle(o.status)}">
                    ${o.status || 'PENDING'}
                </span>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function getStatusStyle(status) {
    const s = (status || '').toLowerCase();
    if (s === 'delivered') return 'bg-green-100 text-green-600';
    if (s === 'pending') return 'bg-orange-100 text-orange-600';
    return 'bg-blue-100 text-blue-600';
}

function initCharts() {
    const revCtx = document.getElementById('revenueChart');
    if (revCtx) {
        const ctx = revCtx.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue Growth',
                    data: [12000, 19000, 3000, 5000, 2000, 30000],
                    borderColor: '#2874f0',
                    backgroundColor: 'rgba(40, 116, 240, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    const catCtx = document.getElementById('categoryChart');
    if (catCtx) {
        const ctx2 = catCtx.getContext('2d');
        new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Electronics', 'Fashion', 'Home', 'Beauty'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: ['#2874f0', '#fb641b', '#ff9f00', '#eee']
                }]
            }
        });
    }
}

document.getElementById('admin-logout')?.addEventListener('click', () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/index.html';
});

document.addEventListener('DOMContentLoaded', initAdminDashboard);

