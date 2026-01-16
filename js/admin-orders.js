import CONFIG from './config.js';
import { apiCall } from './main.js';

let currentOrders = [];

async function initAdminOrders() {
    const token = localStorage.getItem('auth_token');
    if (!token) { window.location.href = '/login.html'; return; }
    
    await fetchOrders();
    setupEventListeners();
}

async function fetchOrders() {
    const searchInput = document.getElementById('order-search');
    const search = searchInput ? searchInput.value : '';
    
    try {
        const data = await apiCall(`/admin/orders?search=${search}`);
        if (data && (data.orders || Array.isArray(data))) {
            currentOrders = data.orders || data;
            renderOrders(currentOrders);
        }
    } catch (e) {
        console.error('Failed to load admin orders', e);
    }
}

function renderOrders(orders) {
    const table = document.getElementById('admin-orders-table');
    if (!table || !Array.isArray(orders)) return;

    table.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black italic text-[#2874f0]">#${o.order_number || o.id}</td>
            <td class="px-6 py-4">
                <span class="block font-bold">${o.user?.name || 'Customer'}</span>
                <span class="text-[10px] text-slate-400 font-bold uppercase">${o.user?.email || '--'}</span>
            </td>
            <td class="px-6 py-4 font-black">₹${Number(o.total_amount || 0).toLocaleString()}</td>
            <td class="px-6 py-4">
                <select class="status-select bg-slate-50 border-none rounded p-1 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-[#2874f0]" data-id="${o.id}">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${o.created_at ? new Date(o.created_at).toLocaleDateString() : '--'}</td>
            <td class="px-6 py-4 text-right">
                <button class="view-btn text-blue-500 hover:bg-blue-50 p-2 rounded-lg" data-id="${o.id}"><i class="fas fa-eye"></i></button>
            </td>
        </tr>
    `).join('');

    // Re-bind events
    table.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', (e) => updateStatus(sel.dataset.id, e.target.value));
    });
    table.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => showOrderDetails(btn.dataset.id));
    });
}

async function updateStatus(id, status) {
    try {
        const data = await apiCall(`/admin/orders/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.showToast) window.showToast('Signal Frequency Updated');
        }
    } catch (e) {
        console.error('Failed to update status', e);
    }
}

function showOrderDetails(id) {
    const order = currentOrders.find(o => o.id == id);
    if (!order) return;

    const numEl = document.getElementById('modal-order-number');
    if (numEl) numEl.innerText = `#${order.order_number || order.id}`;
    const content = document.getElementById('modal-content');
    if (!content) return;
    
    const addr = order.address || {};
    const items = order.items || [];

    content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Customer Intel</h4>
                <div class="space-y-2">
                    <p class="text-sm font-bold">${order.user?.name || 'Customer'}</p>
                    <p class="text-sm text-slate-600">${order.user?.email || '--'}</p>
                    <p class="text-sm text-slate-600">${addr.phone || '--'}</p>
                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                         <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Delivery Vector</p>
                         <p class="text-xs italic text-slate-700">${addr.address || ''}, ${addr.locality || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}</p>
                    </div>
                </div>
            </div>
            <div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Acquisition Items</h4>
                <div class="divide-y border rounded-xl overflow-hidden">
                    ${items.map(item => {
                        const product = item.product || {};
                        const imageUrl = product.image_url 
                            ? product.image_url.replace(/^http:/, 'https:')
                            : (product.image ? `https://solocart-backend.onrender.com/storage/${product.image}` : 'https://placehold.co/400x400?text=No+Image');

                        return `
                        <div class="p-4 flex gap-4 bg-white">
                            <img src="${imageUrl}" class="w-12 h-12 object-contain" onerror="this.src='https://placehold.co/400x400?text=No+Image'">
                            <div>
                                <p class="text-xs font-bold">${product.name || 'Unavailable'}</p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase">QTY: ${item.quantity} | UNIT: ₹${item.price}</p>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
                <div class="mt-6 flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
                    <span class="text-xs font-black uppercase tracking-widest opacity-60">Total Payload</span>
                    <span class="text-xl font-black italic">₹${Number(order.total_amount || 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('orderModal')?.classList.remove('hidden');
}

function setupEventListeners() {
    document.getElementById('order-search')?.addEventListener('input', fetchOrders);
}

document.addEventListener('DOMContentLoaded', initAdminOrders);

