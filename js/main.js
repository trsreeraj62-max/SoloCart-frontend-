import CONFIG from './config.js';

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-md shadow-lg text-white font-bold text-sm transform transition-all duration-300 translate-y-0 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

export function getAuthToken() {
    return localStorage.getItem('auth_token');
}

export function updateAuthUI() {
    const authActions = document.getElementById('auth-actions');
    const token = getAuthToken();
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');

    if (token && user.name) {
        authActions.innerHTML = `
            <div class="relative group">
                <button class="flex items-center gap-2 focus:outline-none">
                    <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/20">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <span class="text-sm font-bold truncate max-w-[100px]">${user.name}</span>
                </button>
                <div class="absolute right-0 top-full pt-2 hidden group-hover:block z-[1001]">
                    <div class="bg-white rounded-sm shadow-2xl border border-slate-100 py-2 w-48 text-slate-800">
                        <a href="/profile.html" class="block px-4 py-2 hover:bg-slate-50 text-xs font-black uppercase tracking-widest no-underline text-inherit">My Profile</a>
                        <a href="/orders.html" class="block px-4 py-2 hover:bg-slate-50 text-xs font-black uppercase tracking-widest no-underline text-inherit">My Orders</a>
                        <button id="logout-btn" class="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-500 text-xs font-black uppercase tracking-widest border-0 bg-transparent">Logout</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    const token = getAuthToken();
    try {
        await fetch(`${CONFIG.API_BASE_URL}/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {}

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    showToast('Logged out successfully');
    window.location.href = '/index.html';
}

export async function updateCartBadge() {
    const badge = document.getElementById('cart-count-badge');
    const token = getAuthToken();
    if (!token) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const count = data.total_items || (data.items ? data.items.length : 0);
        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (e) { console.error('Cart fetch failed'); }
}

window.addToCart = async function(productId, quantity = 1) {
    const token = getAuthToken();
    if (!token) {
        showToast('Please login to add to cart', 'error');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ product_id: productId, quantity: quantity })
        });
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (response.ok) {
                showToast('Added to Cart Successfully');
                updateCartBadge();
            } else {
                showToast(data.message || 'Failed to add to cart', 'error');
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            showToast('Error connecting to server', 'error');
        }
    } catch (e) {
        console.error('Add to cart failed', e);
        showToast('Error connecting to server', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateCartBadge();
});
