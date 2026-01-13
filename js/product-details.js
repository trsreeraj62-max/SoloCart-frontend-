import CONFIG from './config.js';
import { getAuthToken, updateCartBadge } from './main.js';

let currentProduct = null;

async function initProductDetails() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
        window.location.href = '/shop.html';
        return;
    }

    await fetchProductDetails(slug);
    setupEventListeners();
}

async function fetchProductDetails(slug) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/products/${slug}`);
        if (!response.ok) throw new Error('Product not found');
        
        const data = await response.json();
        currentProduct = data.product || data.data || data;
        
        renderProductInfo(currentProduct);
        renderRelatedProducts(data.related_products || []);
        
    } catch (e) {
        console.error('Failed to load product details', e);
        document.getElementById('product-name').innerText = 'Product Signal Not Detected';
        document.getElementById('product-description').innerText = 'The requested item could not be retrieved from the server.';
        window.showToast('Product not found', 'error');
    }
}

function renderProductInfo(p) {
    document.title = `${p.name} — SoloCart`;
    document.getElementById('crumb-product-name').innerText = p.name;
    
    const imageUrl = p.image 
        ? `https://solocart-backend.onrender.com/storage/${p.image}` 
        : (p.image_url || 'https://placehold.co/400x400?text=No+Image');
        
    document.getElementById('product-image').src = imageUrl;
    document.getElementById('product-name').innerText = p.name;
    document.getElementById('product-rating').innerText = p.rating || '4.2';
    document.getElementById('product-price').innerText = `₹${Number(p.price).toLocaleString()}`;
    
    if (p.discount_percent > 0) {
        document.getElementById('product-old-price').innerText = `₹${(p.price * 1.25).toFixed(0)}`;
        document.getElementById('product-old-price').classList.remove('hidden');
        document.getElementById('product-discount').innerText = `${p.discount_percent}% off`;
        document.getElementById('product-discount').classList.remove('hidden');
    } else {
        document.getElementById('product-old-price').classList.add('hidden');
        document.getElementById('product-discount').classList.add('hidden');
    }

    document.getElementById('product-description').innerText = p.description || 'No description available for this premium acquisition.';
    
    // Render specs
    const specsGrid = document.getElementById('specs-grid');
    const specs = [
        { label: 'Category', value: p.category ? p.category.name : 'Uncategorized' },
        { label: 'Stock Status', value: p.stock > 0 ? 'In Stock' : 'Out of Stock' },
        { label: 'Manufacturer', value: 'SoloCart Industries' },
        { label: 'Model Year', value: '2026' }
    ];

    specsGrid.innerHTML = specs.map(s => `
        <div class="text-[11px] font-black text-slate-400 uppercase tracking-widest">${s.label}</div>
        <div class="text-sm font-bold text-slate-700">${s.value}</div>
    `).join('');
}

function renderRelatedProducts(products) {
    const grid = document.getElementById('related-products-grid');
    if (products.length === 0) {
        grid.innerHTML = '<p class="text-slate-400 text-sm">No related products found.</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const imageUrl = p.image 
            ? `https://solocart-backend.onrender.com/storage/${p.image}` 
            : (p.image_url || 'https://placehold.co/400x400?text=No+Image');

        return `
            <div class="bg-white rounded-sm border border-slate-100 p-3 hover:shadow-lg transition-all group">
                <a href="/product-details.html?slug=${p.slug || p.id}" class="no-underline text-inherit">
                    <div class="aspect-square mb-3 overflow-hidden flex items-center justify-center">
                        <img src="${imageUrl}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
                    </div>
                    <h4 class="text-xs font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-[#2874f0]">${p.name}</h4>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-black">₹${Number(p.price).toLocaleString()}</span>
                    </div>
                </a>
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    document.getElementById('add-to-cart-btn').addEventListener('click', () => addToCart(false));
    document.getElementById('buy-now-btn').addEventListener('click', () => addToCart(true));
}

async function addToCart(isBuyNow = false) {
    if (!currentProduct) {
        window.showToast('Product data not loaded. Please refresh.', 'error');
        return;
    }

    const token = getAuthToken();
    if (!token) {
        window.showToast('Please login to continue', 'error');
        setTimeout(() => {
            window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        }, 1500);
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                product_id: currentProduct.id,
                quantity: 1
            })
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (response.ok) {
                window.showToast(isBuyNow ? 'Moving to checkout...' : 'Added to cart successfully');
                await updateCartBadge();
                if (isBuyNow) {
                    window.location.href = '/checkout.html';
                }
            } else {
                window.showToast(data.message || 'Failed to update cart', 'error');
            }
        } else {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned non-JSON response');
        }
    } catch (e) {
        console.error('Cart add failed', e);
        window.showToast('Signal interruption. Try again.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', initProductDetails);
