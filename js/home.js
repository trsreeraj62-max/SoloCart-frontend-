import CONFIG from './config.js';

async function fetchHomeData() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/home-data`);
        const data = await response.json();
        
        renderBanners(data.banners);
        renderCategories(data.categories);
        renderProducts(data.featured_products, 'featured-products-grid');
        renderProducts(data.latest_products, 'latest-products-grid');
        
    } catch (e) {
        console.error('Home data load failed', e);
        window.showToast('Failed to sync content', 'error');
    }
}

function renderBanners(banners) {
    const container = document.getElementById('hero-slider-content');
    if (!banners || banners.length === 0) return;

    container.innerHTML = banners.map((b, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}">
            <img src="${b.image_url}" class="d-block w-full h-[280px] md:h-[350px] object-cover" alt="Banner">
            ${b.title ? `
            <div class="carousel-caption d-none d-md-block bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-10 max-w-lg mx-auto text-white">
                <h5 class="text-3xl font-black italic tracking-tighter">${b.title}</h5>
                <p class="font-bold text-sm tracking-widest uppercase opacity-80">${b.subtitle || ''}</p>
            </div>` : ''}
        </div>
    `).join('');
}

function renderCategories(categories) {
    const row = document.getElementById('categories-row');
    row.innerHTML = categories.map(c => `
        <a href="/shop.html?category=${c.id}" class="flex flex-col items-center gap-2 no-underline group flex-shrink-0">
            <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center p-2 group-hover:bg-[#2874f0]/5 transition-all overflow-hidden border border-slate-100">
                <img src="${c.image_url}" class="h-full w-full object-contain group-hover:scale-110 transition-transform">
            </div>
            <p class="text-[11px] font-bold text-slate-700 group-hover:text-[#2874f0] tracking-wide m-0 text-center">${c.name}</p>
        </a>
    `).join('');
}

function renderProducts(products, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = products.map(p => `
        <div class="group bg-white rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl relative flex flex-col h-full border border-transparent hover:border-slate-100 p-4">
            <a href="/product-details.html?slug=${p.slug || p.id}" class="no-underline text-inherit flex flex-col h-full">
                <div class="relative w-full aspect-square mb-4 overflow-hidden flex items-center justify-center">
                    <img src="${p.image_url}" class="h-full object-contain group-hover:scale-105 transition-transform duration-700" onerror="this.src='https://placehold.co/400x400?text=No+Image'">
                    ${p.discount_percent > 0 ? `<span class="absolute top-0 right-0 text-[10px] font-black text-white bg-green-500 px-2 py-1 rounded-bl-lg uppercase">${p.discount_percent}% OFF</span>` : ''}
                </div>
                <div class="flex-grow">
                    <h3 class="text-xs font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-[#2874f0] min-h-[32px]">${p.name}</h3>
                    <div class="flex items-center gap-2 mb-2">
                        <div class="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                            ${p.rating || '4.2'} <i class="fas fa-star text-[7px]"></i>
                        </div>
                        <span class="text-slate-400 text-[10px] font-bold">(${Math.floor(Math.random() * 500) + 50})</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-base font-black text-slate-900">₹${Number(p.price).toLocaleString()}</span>
                        ${p.discount_percent > 0 ? `<span class="text-[10px] text-slate-400 line-through font-bold">₹${(p.price * 1.2).toFixed(0)}</span>` : ''}
                    </div>
                </div>
            </a>
            <button onclick="window.addToCart(${p.id}, 1)" class="mt-4 w-full bg-[#ff9f00] text-white py-2 text-xs font-bold rounded-sm hover:bg-[#fb641b] transition-colors uppercase tracking-tight">Add to Cart</button>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', fetchHomeData);
