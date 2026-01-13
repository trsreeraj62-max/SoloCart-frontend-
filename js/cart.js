import CONFIG from './config.js';
import { getAuthToken, updateCartBadge } from './main.js';

async function initCart() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    await fetchCartItems();
    setupEventListeners();
}

async function fetchCartItems() {
    const token = getAuthToken();
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.items.length === 0) {
            document.querySelector('.lg\\:w-8\\/12').classList.add('hidden');
            document.querySelector('.lg\\:w-4\\/12').classList.add('hidden');
            document.getElementById('empty-cart').classList.remove('hidden');
            return;
        }

        renderCartItems(data.items);
        updatePriceDetails(data);
        
    } catch (e) {
        console.error('Failed to load cart', e);
        window.showToast('Signal loss while retrieving arsenal', 'error');
    }
}

function renderCartItems(items) {
    const container = document.getElementById('cart-items-list');
    document.getElementById('cart-count-title').innerText = items.length;
    document.getElementById('price-details-count').innerText = items.length;

    container.innerHTML = items.map(item => `
        <div class="p-4 flex gap-4 hover:bg-slate-50 transition-colors" data-id="${item.id}">
            <div class="w-24 h-24 flex-shrink-0 border p-2 rounded-sm bg-white">
                <img src="${item.product.image_url}" class="h-full w-full object-contain">
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800 line-clamp-2">${item.product.name}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Seller: SoloCart Official</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-slate-400 font-bold">Delivery by Wed, Jan 21 | <span class="text-green-600">Free</span></span>
                    </div>
                </div>
                
                <div class="flex items-center gap-4 mt-3">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black text-slate-900">₹${Number(item.product.price * item.quantity).toLocaleString()}</span>
                        <span class="text-xs text-slate-400 line-through font-bold">₹${(item.product.price * 1.25 * item.quantity).toFixed(0)}</span>
                        <span class="text-[10px] text-green-600 font-black">20% Off</span>
                    </div>
                </div>

                <div class="flex items-center gap-6 mt-6">
                    <div class="flex items-center border rounded-sm overflow-hidden">
                        <button class="qty-btn minus px-2.5 py-1 text-slate-400 hover:bg-slate-100 font-black" data-id="${item.id}">-</button>
                        <input type="text" value="${item.quantity}" readonly class="w-8 text-center text-xs font-black outline-none border-x">
                        <button class="qty-btn plus px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-btn text-xs font-black uppercase tracking-widest text-[#212121] hover:text-[#2874f0]" data-id="${item.id}">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    // Re-bind buttons
    container.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.dataset.id;
            const isPlus = btn.classList.contains('plus');
            updateQuantity(id, isPlus);
        });
    });

    container.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            removeItem(btn.dataset.id);
        });
    });
}

async function updateQuantity(itemId, isPlus) {
    const token = getAuthToken();
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                item_id: itemId,
                increment: isPlus
            })
        });

        if (response.ok) {
            await fetchCartItems();
            await updateCartBadge();
        }
    } catch (e) { console.error(e); }
}

async function removeItem(itemId) {
    if (!confirm('Are you sure you want to remove this item?')) return;
    
    const token = getAuthToken();
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart/remove/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            window.showToast('Item ejected from arsenal');
            await fetchCartItems();
            await updateCartBadge();
        }
    } catch (e) { console.error(e); }
}

function updatePriceDetails(data) {
    document.getElementById('total-mrp').innerText = `₹${Number(data.total_mrp).toLocaleString()}`;
    document.getElementById('total-discount').innerText = `- ₹${Number(data.total_mrp - data.total_price).toLocaleString()}`;
    document.getElementById('grand-total').innerText = `₹${Number(data.total_price).toLocaleString()}`;
    document.getElementById('savings-amount').innerText = `₹${Number(data.total_mrp - data.total_price).toLocaleString()}`;
}

function setupEventListeners() {
    document.getElementById('place-order-btn').addEventListener('click', () => {
        window.location.href = '/checkout.html';
    });
}

document.addEventListener('DOMContentLoaded', initCart);
