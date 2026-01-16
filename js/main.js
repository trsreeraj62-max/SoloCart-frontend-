import CONFIG from './config.js';

/**
 * Safely parses a JSON string with a fallback.
 * Prevents "undefined is not valid JSON" crashes.
 */
export function safeJSONParse(str, fallback = {}) {
    if (!str || str === "undefined" || str === "null") return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error("JSON Parse Error:", e, "for string:", str);
        return fallback;
    }
}

/**
 * Global API call helper to enforce HTTPS and handle common response patterns.
 */
export async function apiCall(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE_URL}${endpoint}`;
    // Enforce HTTPS to prevent mixed-content errors
    const secureUrl = url.replace(/^http:/, 'https:');
    
    const token = localStorage.getItem('auth_token');
    const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(secureUrl, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        const text = await response.text();
        console.warn('Non-JSON response received:', text);
        return { success: false, message: 'Server error: Invalid format' };
    } catch (error) {
        console.error('API Call Failed:', error);
        return { success: false, message: 'Network connection lost' };
    }
}

window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
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
    if (!authActions) return;

    const token = getAuthToken();
    const user = safeJSONParse(localStorage.getItem('user_data'), null);

    if (token && user && user.name) {
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
    } else {
        // Fallback if not logged in
        authActions.innerHTML = `<a href="/login.html" class="bg-white text-[#2874f0] px-8 py-1.5 rounded-sm font-bold text-sm shadow-sm transition-all hover:bg-[#f1f3f6] no-underline">Login</a>`;
    }
}

async function handleLogout() {
    const token = getAuthToken();
    if (token) {
        try {
            await fetch(`${CONFIG.API_BASE_URL}/logout`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
        } catch (e) {
            console.warn('Logout request failed', e);
        }
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    showToast('Logged out successfully');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 500);
}

export async function updateCartBadge() {
    const badge = document.getElementById('cart-count-badge');
    if (!badge) return;

    const token = getAuthToken();
    if (!token) {
        badge.classList.add('hidden');
        return;
    }

    try {
        const data = await apiCall('/cart');
        if (data) {
            const count = data.total_items || (Array.isArray(data.items) ? data.items.length : 0);
            if (count > 0) {
                badge.innerText = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (e) { 
        console.error('Cart badge update failed'); 
    }
}

window.addToCart = async function(productId, quantity = 1) {
    const token = getAuthToken();
    if (!token) {
        showToast('Please login to add to cart', 'error');
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const data = await apiCall('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity: quantity })
    });

    if (data && (data.success || data.id)) {
        showToast('Added to Cart Successfully');
        updateCartBadge();
    } else {
        showToast(data?.message || 'Failed to add to cart', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateCartBadge();
});

