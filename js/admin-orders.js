import CONFIG from '../js/config.js';

let currentOrders = [];

async function initAdminOrders() {
    const token = localStorage.getItem('auth_token');
    if (!token) { window.location.href = '/login'; return; }
    
    await fetchOrders();
    setupEventListeners();
}

async function fetchOrders() {
    const token = localStorage.getItem('auth_token');
    const search = document.getElementById('order-search').value;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/orders?search=${search}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        currentOrders = data.orders;
        renderOrders(currentOrders);
    } catch (e) {
        console.error(e);
    }
}

function renderOrders(orders) {
    const table = document.getElementById('admin-orders-table');
    table.innerHTML = orders.map(o => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black italic text-[#2874f0]">#${o.order_number}</td>
            <td class="px-6 py-4">
                <span class="block font-bold">${o.user.name}</span>
                <span class="text-[10px] text-slate-400 font-bold uppercase">${o.user.email}</span>
            </td>
            <td class="px-6 py-4 font-black">₹${Number(o.total_amount).toLocaleString()}</td>
            <td class="px-6 py-4">
                <select class="status-select bg-slate-50 border-none rounded p-1 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-[#2874f0]" data-id="${o.id}">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${new Date(o.created_at).toLocaleDateString()}</td>
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
    const token = localStorage.getItem('auth_token');
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/orders/${id}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            if (window.showToast) window.showToast('Signal Frequency Updated');
            else alert('Status Updated');
        }
    } catch (e) { console.error(e); }
}

function showOrderDetails(id) {
    const order = currentOrders.find(o => o.id == id);
    if (!order) return;

    document.getElementById('modal-order-number').innerText = `#${order.order_number}`;
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Customer Intel</h4>
                <div class="space-y-2">
                    <p class="text-sm font-bold">${order.user.name}</p>
                    <p class="text-sm text-slate-600">${order.user.email}</p>
                    <p class="text-sm text-slate-600">${order.address.phone}</p>
                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                         <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Delivery Vector</p>
                         <p class="text-xs italic text-slate-700">${order.address.address}, ${order.address.locality}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}</p>
                    </div>
                </div>
            </div>
            <div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Acquisition Items</h4>
                <div class="divide-y border rounded-xl overflow-hidden">
                    ${order.items.map(item => `
                        <div class="p-4 flex gap-4 bg-white">
                            <img src="${item.product.image_url}" class="w-12 h-12 object-contain">
                            <div>
                                <p class="text-xs font-bold">${item.product.name}</p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase">QTY: ${item.quantity} | UNIT: ₹${item.price}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-6 flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
                    <span class="text-xs font-black uppercase tracking-widest opacity-60">Total Payload</span>
                    <span class="text-xl font-black italic">₹${Number(order.total_amount).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('orderModal').classList.remove('hidden');
}

function setupEventListeners() {
    document.getElementById('order-search').addEventListener('input', fetchOrders);
}

document.addEventListener('DOMContentLoaded', initAdminOrders);
