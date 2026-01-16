import CONFIG from './config.js';
import { apiCall } from './main.js';

/**
 * Fetches home page data and updates the UI.
 * Handles products safely and manages the "No Products" popup.
 */
async function fetchHomeData() {
    try {
        const data = await apiCall('/home-data');
        console.log('HOME DATA:', data);

        if (!data) {
            showNoProductsPopup();
            return;
        }

        // Handle Banners if present
        const banners = data.banners || data.data?.banners || [];
        if (Array.isArray(banners) && banners.length > 0) {
            renderBanners(banners);
        } else {
            // Fallback: try fetching banners from dedicated endpoint
            const bannerData = await apiCall('/banners');
            const fallbackBanners = bannerData?.banners || bannerData?.data || (Array.isArray(bannerData) ? bannerData : []);
            if (fallbackBanners.length > 0) renderBanners(fallbackBanners);
        }

        // Handle Products - extract from data.products or data.data or data itself
        // Robust Product Extraction
        let featured = [];
        let latest = [];
        let products = [];

        // Helper to find array in possible locations
        const findArray = (keys) => {
            for (const key of keys) {
                if (Array.isArray(data[key])) return data[key];
                if (data.data && Array.isArray(data.data[key])) return data.data[key];
            }
            return null;
        };

        // Try specific lists first
        featured = findArray(['featured_products', 'featured']) || [];
        latest = findArray(['latest_products', 'latest']) || [];

        // Try generic products list
        if (Array.isArray(data.products)) products = data.products;
        else if (data.data && Array.isArray(data.data.products)) products = data.data.products;
        else if (data.data && Array.isArray(data.data)) products = data.data;
        else if (Array.isArray(data)) products = data;

        // Fallback: If specific lists are empty, use generic products
        if (featured.length === 0) featured = products;
        if (latest.length === 0) latest = products;

        if (featured.length > 0 || latest.length > 0) {
            renderProducts(featured.length > 0 ? featured : latest, 'featured-products-grid');
            renderProducts(latest.length > 0 ? latest : featured, 'latest-products-grid');
            hideNoProductsPopup();
        } else {
            console.warn('Products missing or empty array', data);
            showNoProductsPopup();
        }

        // Disable category row if no data
        const categorySection = document.getElementById('categories-row');
        if (categorySection) {
            categorySection.style.display = 'none';
        }
    } catch (err) {
        console.error('Home fetch failed:', err);
        showNoProductsPopup();
        if (window.showToast) {
            window.showToast('Failed to sync content', 'error');
        }
    }
}

/**
 * Popup UI Controls
 */
function showNoProductsPopup() {
    const popup = document.getElementById('no-products-popup');
    if (popup) popup.style.display = 'flex';
}

function hideNoProductsPopup() {
    const popup = document.getElementById('no-products-popup');
    if (popup) popup.style.display = 'none';
}

/**
 * Renders the hero slider banners.
 */
function renderBanners(banners) {
    const container = document.getElementById('hero-slider-content');
    if (!container || !Array.isArray(banners) || banners.length === 0) return;

    container.innerHTML = banners.map((b, i) => {
        // Use full URL if provided by backend, else construct it
        const imageUrl = b.image_url 
            ? b.image_url.replace(/^http:/, 'https:')
            : (b.image ? `https://solocart-backend.onrender.com/storage/${b.image}` : 'https://placehold.co/1600x400?text=Banner');

        return `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
                <img src="${imageUrl}" class="d-block w-full h-[280px] md:h-[350px] object-cover" alt="Banner" onerror="this.onerror=null;this.src='https://placehold.co/1600x400?text=Banner'">
                ${b.title ? `
                <div class="carousel-caption d-none d-md-block bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-10 max-w-lg mx-auto text-white">
                    <h5 class="text-3xl font-black italic tracking-tighter">${b.title}</h5>
                    <p class="font-bold text-sm tracking-widest uppercase opacity-80">${b.subtitle || ''}</p>
                </div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Renders products into a Specified grid container.
 */
function renderProducts(products, gridId) {
    if (!Array.isArray(products)) {
        console.error('renderProducts expects an array');
        return;
    }

    const grid = document.getElementById(gridId);
    if (!grid) return;

    grid.innerHTML = products.map(product => {
        // Use full URL if provided by backend (image_url), else construct it
        const imageUrl = product.image_url 
            ? product.image_url.replace(/^http:/, 'https:')
            : (product.image ? `https://solocart-backend.onrender.com/storage/${product.image}` : 'https://placehold.co/400x400?text=No+Image');

        const price = Number(product.price) || 0;
        const discount = Number(product.discount_percent) || 0;
        const originalPrice = discount > 0 ? (price / (1 - discount / 100)).toFixed(0) : (price * 1.25).toFixed(0);

        return `
            <div class="group bg-white rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl relative flex flex-col h-full border border-transparent hover:border-slate-100 p-4">
                <a href="/product-details.html?slug=${product.slug || product.id}" class="no-underline text-inherit flex flex-col h-full">
                    <div class="relative w-full aspect-square mb-4 overflow-hidden flex items-center justify-center">
                        <img src="${imageUrl}" class="h-full object-contain group-hover:scale-105 transition-transform duration-700" alt="${product.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
                        ${discount > 0 ? `<span class="absolute top-0 right-0 text-[10px] font-black text-white bg-green-500 px-2 py-1 rounded-bl-lg uppercase">${discount}% OFF</span>` : ''}
                    </div>
                    <div class="flex-grow">
                        <h3 class="text-xs font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-[#2874f0] min-h-[32px]">${product.name || 'Unavailable'}</h3>
                        <div class="flex items-center gap-2 mb-2">
                            <div class="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                ${product.rating || '4.2'} <i class="fas fa-star text-[7px]"></i>
                            </div>
                            <span class="text-slate-400 text-[10px] font-bold">(50+)</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-base font-black text-slate-900">₹${price.toLocaleString()}</span>
                            <span class="text-[10px] text-slate-400 line-through font-bold">₹${Number(originalPrice).toLocaleString()}</span>
                        </div>
                    </div>
                </a>
            </div>
        `;
    }).join('');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', fetchHomeData);

