import CONFIG from './config.js';
import { getAuthToken } from './main.js';

let cartData = null;
let savedAddress = null;

async function initCheckout() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login.html?redirect=/checkout.html';
        return;
    }

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    document.getElementById('auth-status-info').innerText = userData.name || userData.email;

    await fetchCartData();
    setupEventListeners();
}

async function fetchCartData() {
    const token = getAuthToken();
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        cartData = await response.json();

        if (cartData.items.length === 0) {
            window.location.href = '/cart.html';
            return;
        }

        renderPriceDetails(cartData);
        renderOrderSummary(cartData.items);
    } catch (e) {
        console.error(e);
    }
}

function renderPriceDetails(data) {
    document.getElementById('price-details-count').innerText = data.items.length;
    document.getElementById('total-mrp').innerText = `₹${Number(data.total_mrp).toLocaleString()}`;
    document.getElementById('total-discount').innerText = `- ₹${Number(data.total_mrp - data.total_price).toLocaleString()}`;
    document.getElementById('grand-total').innerText = `₹${Number(data.total_price).toLocaleString()}`;
}

function renderOrderSummary(items) {
    const container = document.getElementById('checkout-items-list');
    container.innerHTML = items.map(item => `
        <div class="py-4 flex gap-4 border-b last:border-0">
            <div class="w-16 h-16 border rounded-sm p-1">
                <img src="${item.product.image_url}" class="h-full w-full object-contain">
            </div>
            <div>
                <h4 class="text-xs font-bold text-slate-800 line-clamp-1">${item.product.name}</h4>
                <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Qty: ${item.quantity}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-sm font-black text-slate-900">₹${Number(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Address Form
    document.getElementById('address-form').addEventListener('submit', (e) => {
        e.preventDefault();
        savedAddress = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            pincode: document.getElementById('pincode').value,
            locality: document.getElementById('locality').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value
        };
        
        // Move to next step
        document.getElementById('step-address').classList.add('step-inactive');
        document.getElementById('step-summary').classList.remove('step-inactive');
        window.showToast('Address Locked');
    });

    // Summary Confirmation
    document.getElementById('confirm-summary-btn').addEventListener('click', () => {
        document.getElementById('step-summary').classList.add('step-inactive');
        document.getElementById('step-payment').classList.remove('step-inactive');
    });

    // Complete Order
    document.getElementById('complete-order-btn').addEventListener('click', completeOrder);
}

async function completeOrder() {
    const token = getAuthToken();
    const btn = document.getElementById('complete-order-btn');
    btn.disabled = true;
    btn.innerText = 'Transmitting Order...';

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                address: savedAddress,
                payment_method: 'cod'
            })
        });

        const data = await response.json();
        if (response.ok) {
            window.showToast('Order Successful!');
            setTimeout(() => {
                window.location.href = `/checkout-success.html?order_id=${data.order.order_number}`;
            }, 1500);
        } else {
            window.showToast(data.message || 'Order failed', 'error');
            btn.disabled = false;
            btn.innerText = 'CONFIRM ORDER';
        }
    } catch (e) {
        console.error(e);
        window.showToast('Server error', 'error');
        btn.disabled = false;
        btn.innerText = 'CONFIRM ORDER';
    }
}

// Simple Toast fallback
if (!window.showToast) {
    window.showToast = (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `p-4 rounded shadow-lg text-white font-bold text-sm mb-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
        toast.innerText = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };
}

document.addEventListener('DOMContentLoaded', initCheckout);
