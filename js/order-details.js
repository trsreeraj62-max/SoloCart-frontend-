import CONFIG from './config.js';
import { getAuthToken } from './main.js';

async function initOrderDetails() {
    const token = getAuthToken();
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    if (!token || !orderId) {
        window.location.href = '/orders';
        return;
    }

    await fetchOrderDetail(orderId);
}

async function fetchOrderDetail(id) {
    const token = getAuthToken();
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        renderDetails(data.order);
    } catch (e) {
        console.error(e);
        window.showToast('Signal lost while retrieving order', 'error');
    }
}

function renderDetails(order) {
    document.getElementById('display-order-id').innerText = `#ORD-${order.order_number}`;
    document.getElementById('display-order-date').innerText = new Date(order.created_at).toLocaleString();
    document.getElementById('total-amount').innerText = `₹${Number(order.total_amount).toLocaleString()}`;
    document.getElementById('payment-method').innerText = order.payment_method;
    document.getElementById('order-status-text').innerText = `Current status: ${order.status}`;
    
    // Address
    const addr = order.address || {};
    document.getElementById('delivery-address').innerHTML = `
        <p class="text-sm font-bold text-slate-800">${addr.name || 'N/A'}</p>
        <p class="text-xs text-slate-500 font-medium">${addr.address || ''}, ${addr.locality || ''}</p>
        <p class="text-xs text-slate-500 font-medium">${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}</p>
        <p class="text-xs font-bold text-slate-700 mt-2">Phone: ${addr.phone || 'N/A'}</p>
    `;

    // Tracker logic
    const fill = document.getElementById('progress-bar-fill');
    const stepShipped = document.getElementById('step-shipped');
    const stepDelivered = document.getElementById('step-delivered');

    if (order.status.toLowerCase() === 'shipped') {
        fill.style.width = '50%';
        stepShipped.classList.replace('bg-slate-200', 'bg-green-500');
    } else if (order.status.toLowerCase() === 'delivered') {
        fill.style.width = '100%';
        stepShipped.classList.replace('bg-slate-200', 'bg-green-500');
        stepDelivered.classList.replace('bg-slate-200', 'bg-green-500');
        document.getElementById('download-invoice-btn').classList.remove('hidden');
    }

    // Items
    const itemsContainer = document.getElementById('order-items-list');
    itemsContainer.innerHTML = order.items.map(item => `
        <div class="p-6 flex gap-6 hover:bg-slate-50 transition-colors">
            <div class="w-20 h-20 border rounded-sm p-2 flex-shrink-0 bg-white">
                <img src="${item.product.image_url}" class="h-full w-full object-contain">
            </div>
            <div class="flex-grow">
                <h4 class="text-sm font-bold text-slate-800">${item.product.name}</h4>
                <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Quantity: ${item.quantity}</p>
                <div class="flex items-center gap-3 mt-4">
                    <span class="text-base font-black text-slate-900">₹${Number(item.price * item.quantity).toLocaleString()}</span>
                    <span class="text-[10px] text-green-600 font-bold">Replacement Policy Available</span>
                </div>
            </div>
            <div class="hidden md:block">
                 <button class="text-xs font-black uppercase tracking-widest text-[#2874f0] hover:underline">Rate & Review</button>
            </div>
        </div>
    `).join('');

    // Invoice listener
    document.getElementById('download-invoice-btn').addEventListener('click', () => {
        window.open(`${CONFIG.API_BASE_URL}/orders/${order.id}/invoice?token=${getAuthToken()}`, '_blank');
    });
}

document.addEventListener('DOMContentLoaded', initOrderDetails);
