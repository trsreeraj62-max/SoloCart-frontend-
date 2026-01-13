import CONFIG from './config.js';

/**
 * Fetches home page data and updates the UI.
 * Validates the API response format and handles missing categories.
 */
function fetchHomeData() {
    fetch(`${CONFIG.API_BASE_URL}/home-data`)
        .then(res => {
            if (!res.ok) {
                throw new Error('API request failed');
            }
            return res.json();
        })
        .then(data => {
            console.log('Home API response:', data);

            // ✅ Defensive check for banners
            if (data && Array.isArray(data.banners)) {
                renderBanners(data.banners);
            }

            // ✅ ONLY handle products if they exist as an array
            if (data?.products && Array.isArray(data.products)) {
                // Populate both grids in the index.html template
                renderProducts(data.products, 'featured-products-grid');
                renderProducts(data.products, 'latest-products-grid');
            } else {
                console.error('Invalid home-data response extra key check:', data);
            }

            // ❌ Disable category rendering as backend does not return it
            const categorySection = document.getElementById('categories-row');
            if (categorySection) {
                categorySection.style.display = 'none';
            }
        })
        .catch(err => {
            console.error('Home fetch failed:', err);
            if (window.showToast) {
                window.showToast('Failed to sync content', 'error');
            }
        });
}

/**
 * Renders the hero slider banners with safety checks.
 */
function renderBanners(banners) {
    const container = document.getElementById('hero-slider-content');
    if (!container || !Array.isArray(banners) || banners.length === 0) return;

    container.innerHTML = banners.map((b, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}">
            <img src="${b.image_url}" class="d-block w-full h-[280px] md:h-[350px] object-cover" alt="Banner" onerror="this.src='https://placehold.co/1600x400?text=Banner'">
            ${b.title ? `
            <div class="carousel-caption d-none d-md-block bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-10 max-w-lg mx-auto text-white">
                <h5 class="text-3xl font-black italic tracking-tighter">${b.title}</h5>
                <p class="font-bold text-sm tracking-widest uppercase opacity-80">${b.subtitle || ''}</p>
            </div>` : ''}
        </div>
    `).join('');
}

/**
 * Renders products into a grid.
 * Correctly builds image URLs using backend storage path.
 */
function renderProducts(products, gridId) {
    // ✅ SAFETY CHECK: accept only array
    if (!Array.isArray(products)) {
        console.error(`renderProducts expects array for ${gridId}`);
        return;
    }

    const grid = document.getElementById(gridId);
    if (!grid) return;

    grid.innerHTML = products.map(product => {
        // Build image URL using backend storage path or fallback
        const imageUrl = product.image
            ? `https://solocart-backend.onrender.com/storage/${product.image}`
            : (product.image_url || 'https://placehold.co/400x400?text=No+Image');

        const price = Number(product.price) || 0;
        const discount = Number(product.discount_percent) || 0;
        const originalPrice = discount > 0 ? (price / (1 - discount / 100)).toFixed(0) : (price * 1.2).toFixed(0);

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
                            <span class="text-slate-400 text-[10px] font-bold">(${Math.floor(Math.random() * 500) + 50})</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-base font-black text-slate-900">₹${price.toLocaleString()}</span>
                            <span class="text-[10px] text-slate-400 line-through font-bold">₹${Number(originalPrice).toLocaleString()}</span>
                        </div>
                    </div>
                </a>
                <button onclick="window.addToCart(${product.id}, 1)" class="mt-4 w-full bg-[#ff9f00] text-white py-2 text-xs font-bold rounded-sm hover:bg-[#fb641b] transition-colors uppercase tracking-tight">Add to Cart</button>
            </div>
        `;
    }).join('');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', fetchHomeData);
