import CONFIG from './config.js';
import { getAuthToken, apiCall } from './main.js';

async function initOrders() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }
    await fetchOrders();
}

async function fetchOrders() {
    try {
        const data = await apiCall('/orders');
        
        const orders = data?.orders || (Array.isArray(data) ? data : []);
        const container = document.getElementById('orders-list');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="bg-white p-20 text-center rounded-sm border border-slate-100">
                    <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/myorders-empty_8244e8.png" class="w-64 mx-auto mb-6 opacity-60">
                    <h3 class="text-xl font-bold text-slate-700">You haven't ordered anything yet!</h3>
                    <a href="/shop.html" class="mt-6 inline-block bg-[#2874f0] text-white px-8 py-2 rounded-sm font-bold no-underline uppercase text-xs">Shop Now</a>
                </div>
            `;
            return;
        }

        renderOrders(orders);
    } catch (e) {
        console.error('Failed to load orders', e);
        if (window.showToast) window.showToast('Failed to load history', 'error');
    }
}

function renderOrders(orders) {
    const container = document.getElementById('orders-list');
    if (!container || !Array.isArray(orders)) return;

    container.innerHTML = orders.map(order => {
        const firstItem = order.items?.[0] || {};
        const product = firstItem.product || {};
        const imageUrl = product.image_url 
            ? product.image_url.replace(/^http:/, 'https:')
            : (product.image ? `https://solocart-backend.onrender.com/storage/${product.image}` : 'https://placehold.co/400x400?text=No+Image');

        return `
        <a href="/order-details.html?id=${order.id}" class="bg-white p-4 rounded-sm shadow-sm border border-slate-100 flex gap-6 hover:shadow-md transition-shadow no-underline text-inherit group mb-3 block">
            <div class="w-16 h-16 flex-shrink-0 border rounded-sm p-1">
                <img src="${imageUrl}" class="h-full w-full object-contain">
            </div>
            <div class="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <h4 class="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[#2874f0]">${product.name || 'Order Item'} ${(order.items?.length || 0) > 1 ? `+${order.items.length - 1} more` : ''}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Order ID: #${order.order_number || order.id}</p>
                </div>
                <div>
                    <span class="text-sm font-bold text-slate-900">₹${Number(order.total_amount || 0).toLocaleString()}</span>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${getStatusColor(order.status || 'pending')}"></div>
                        <span class="text-xs font-black uppercase tracking-widest text-slate-700">${order.status || 'PENDING'}</span>
                    </div>
                    <p class="text-[10px] font-bold text-slate-400 mt-1">${order.status_date || 'Status updated today'}</p>
                </div>
            </div>
        </a>
    `;
    }).join('');
}

function getStatusColor(status) {
    if (!status) return 'bg-slate-400';
    switch (status.toLowerCase()) {
        case 'delivered': return 'bg-green-500';
        case 'shipped': return 'bg-[#2874f0]';
        case 'pending': return 'bg-orange-400';
        case 'cancelled': return 'bg-rose-500';
        default: return 'bg-slate-400';
    }
}

document.addEventListener('DOMContentLoaded', initOrders);

