import CONFIG from './config.js';
import { apiCall } from './main.js';

let currentOrders = [];

async function initAdminOrders() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!token || !(user.role === 'admin' || user.role === 'Admin' || user.is_admin === true || user.is_admin === 1)) { 
        window.location.href = '/login.html'; 
        return; 
    }
    
    await fetchOrders();
    setupEventListeners();
}

async function fetchOrders() {
    const searchInput = document.getElementById('order-search');
    const search = searchInput ? searchInput.value.trim() : '';
    const endpoint = search ? `/admin/orders?search=${encodeURIComponent(search)}` : '/admin/orders';
    
    try {
        const data = await apiCall(endpoint);
        if (data && (data.orders || Array.isArray(data))) {
            currentOrders = data.orders || data;
            renderOrders(currentOrders);
        } else {
             // If we get "success: false" or valid JSON but no orders, check if we should throw or just show empty
             if (data && data.success === false) throw new Error(data.message || 'API Error');
        }
    } catch (e) {
        console.error('Failed to load admin orders', e);
        if (window.showToast) window.showToast('Failed to load orders from server', 'error');
        // No mock fallback
    }
}

function renderOrders(orders) {
    const table = document.getElementById('admin-orders-table');
    if (!table || !Array.isArray(orders)) return;

    table.innerHTML = orders.map(o => {
        let actionButtons = '';
        if (o.status === 'pending') {
            actionButtons = `
                <button class="action-btn bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide" data-id="${o.id}" data-action="processing">Approve</button>
                <button class="action-btn bg-rose-100 text-rose-600 hover:bg-rose-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide ml-2" data-id="${o.id}" data-action="cancelled">Cancel</button>
            `;
        } else if (o.status === 'processing') {
            actionButtons = `
                <button class="action-btn bg-purple-100 text-purple-600 hover:bg-purple-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide" data-id="${o.id}" data-action="shipped">Ship Order</button>
            `;
        } else if (o.status === 'shipped') {
            actionButtons = `
                <button class="action-btn bg-green-100 text-green-600 hover:bg-green-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide" data-id="${o.id}" data-action="delivered">Mark Delivered</button>
            `;
        } else {
             actionButtons = `<span class="text-xs text-slate-400 font-medium italic">No actions available</span>`;
        }

        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black italic text-[#2874f0]">#${o.order_number || o.id}</td>
            <td class="px-6 py-4">
                <span class="block font-bold">${o.user?.name || 'Customer'}</span>
                <span class="text-[10px] text-slate-400 font-bold uppercase">${o.user?.email || '--'}</span>
            </td>
            <td class="px-6 py-4 font-black">₹${Number(o.total_amount || 0).toLocaleString()}</td>
            <td class="px-6 py-4">
                 <span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                    o.status === 'delivered' ? 'bg-green-100 text-green-600' : 
                    o.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 
                    o.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                    'bg-slate-100 text-slate-600'
                 }">
                    ${o.status}
                </span>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${o.created_at ? new Date(o.created_at).toLocaleDateString() : '--'}</td>
            <td class="px-6 py-4 text-right">
                ${actionButtons}
            </td>
        </tr>
    `;
    }).join('');

    // Re-bind events
    table.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => updateStatus(btn.dataset.id, btn.dataset.action));
    });
}

async function updateStatus(id, status) {
    if (!confirm(`Update order status to ${status}?`)) return;

    try {
        const data = await apiCall(`/admin/orders/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status })
        });
        
        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.showToast) window.showToast(`Order updated to ${status}`);
            // Update local state and re-render
            const order = currentOrders.find(o => o.id == id);
            if (order) order.status = status;
            renderOrders(currentOrders);
        } else {
             throw new Error('Server returned failure');
        }
    } catch (e) {
        console.error('Failed to update status', e);
        if (window.showToast) window.showToast('Failed to update status', 'error');
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

