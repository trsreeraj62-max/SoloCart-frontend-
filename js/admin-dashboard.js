import CONFIG from '../js/config.js';

async function initAdminDashboard() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');

    if (!token || user.role !== 'admin') {
        window.location.href = '/login?redirect=/admin/dashboard';
        return;
    }

    document.getElementById('admin-name').innerText = user.name;
    
    await fetchDashboardStats();
    initCharts();
}

async function fetchDashboardStats() {
    const token = localStorage.getItem('auth_token');
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/dashboard-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        document.getElementById('stat-revenue').innerText = `₹${Number(data.total_revenue).toLocaleString()}`;
        document.getElementById('stat-orders').innerText = data.total_orders;
        document.getElementById('stat-users').innerText = data.total_users;
        document.getElementById('stat-products').innerText = data.total_products;

        renderRecentOrders(data.recent_orders);
    } catch (e) {
        console.error('Stats fetch error', e);
    }
}

function renderRecentOrders(orders) {
    const table = document.getElementById('recent-orders-table');
    table.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black text-slate-900 italic">#${o.order_number}</td>
            <td class="px-6 py-4">${o.user.name}</td>
            <td class="px-6 py-4 font-bold">₹${Number(o.total_amount).toLocaleString()}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${getStatusStyle(o.status)}">
                    ${o.status}
                </span>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function getStatusStyle(status) {
    if (status === 'delivered') return 'bg-green-100 text-green-600';
    if (status === 'pending') return 'bg-orange-100 text-orange-600';
    return 'bg-blue-100 text-blue-600';
}

function initCharts() {
    const ctx = document.getElementById('revenueChart').getContext('2d');
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

    const ctx2 = document.getElementById('categoryChart').getContext('2d');
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

document.getElementById('admin-logout').addEventListener('click', () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
});

document.addEventListener('DOMContentLoaded', initAdminDashboard);
