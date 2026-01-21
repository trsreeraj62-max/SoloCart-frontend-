import CONFIG from './config.js';
import { apiCall } from './main.js';

let currentFilters = {
    category: '',
    min_price: '',
    max_price: '',
    sort: 'newest',
    search: '',
    page: 1
};

let isLoading = false;
let hasMore = true;

async function initShop() {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    currentFilters.category = params.get('category') || '';
    currentFilters.search = params.get('search') || '';
    currentFilters.sort = params.get('sort') || 'newest';
    currentFilters.page = parseInt(params.get('page')) || 1;
    currentFilters.min_price = params.get('min_price') || '';
    currentFilters.max_price = params.get('max_price') || '';

    // Initialize UI states
    if (currentFilters.search) {
        document.getElementById('global-search').value = currentFilters.search;
    }
    if (currentFilters.min_price) document.getElementById('min-price').value = currentFilters.min_price;
    if (currentFilters.max_price) document.getElementById('max-price').value = currentFilters.max_price;
    
    updateSortButtons();
    
    // Initial fetch
    await fetchCategories();
    await fetchProducts();
    
    // Bind Event Listeners
    setupEventListeners();
}

async function fetchCategories() {
    try {
        const data = await apiCall('/categories');
        const categories = data.categories || data.data || (Array.isArray(data) ? data : []);
        renderCategories(categories);
    } catch (e) {
        console.error('Failed to load categories', e);
    }
}

function renderCategories(categories) {
    const container = document.getElementById('category-filters');
    container.innerHTML = `
        <label class="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name="category" value="" class="hidden peer" ${currentFilters.category === '' ? 'checked' : ''}>
            <div class="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center peer-checked:border-[#2874f0] peer-checked:bg-[#2874f0]">
                <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
            </div>
            <span class="text-xs font-bold text-slate-600 peer-checked:text-[#2874f0]">All Categories</span>
        </label>
    ` + categories.map(c => `
        <label class="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name="category" value="${c.id}" class="hidden peer" ${currentFilters.category == c.id ? 'checked' : ''}>
            <div class="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center peer-checked:border-[#2874f0] peer-checked:bg-[#2874f0]">
                <div class="w-1.5 h-1.5 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
            </div>
            <span class="text-xs font-bold text-slate-600 peer-checked:text-[#2874f0]">${c.name}</span>
        </label>
    `).join('');

    // Re-bind category radio clicks
    container.querySelectorAll('input[name="category"]').forEach(input => {
        input.addEventListener('change', (e) => {
            currentFilters.category = e.target.value;
            currentFilters.page = 1;
            applyFilters();
        });
    });
}

async function fetchProducts(append = false) {
    if (isLoading || (!hasMore && append)) return;
    isLoading = true;

    const grid = document.getElementById('shop-products-grid');
    const emptyState = document.getElementById('empty-state');
    const countText = document.getElementById('results-count');
    
    if (!append) {
        if (grid) grid.innerHTML = Array(8).fill('<div class="bg-white p-4 h-80 animate-pulse rounded-sm"></div>').join('');
        if (emptyState) emptyState.classList.add('hidden');
        currentFilters.page = 1;
        hasMore = true;
    }

    try {
        const query = new URLSearchParams({
            category_id: currentFilters.category,
            search: currentFilters.search,
            sort: currentFilters.sort,
            min_price: currentFilters.min_price,
            max_price: currentFilters.max_price,
            page: currentFilters.page
        }).toString();

        const data = await apiCall(`/products?${query}`);

        // Handle various response structures
        let products = [];
        let pagination = { current_page: 1, last_page: 1 };
        let total = 0;

        if (data) {
            let extracted = data.products || data.data || (Array.isArray(data) ? data : []);
            
            // Handle case where 'products' key contains the paginator object (with a 'data' array inside)
            if (extracted && !Array.isArray(extracted) && Array.isArray(extracted.data)) {
                extracted = extracted.data;
            }
            
            products = Array.isArray(extracted) ? extracted : [];
            
            // Handle pagination metadata from both Laravel standard and resource formats
            pagination = data.pagination || data.meta || { current_page: data.current_page || 1, last_page: data.last_page || 1 };
            
            // Fix total calculation: Check data.total explicitly, otherwise use products length
            if (data.total !== undefined && data.total !== null) {
                total = data.total;
            } else if (data.meta && data.meta.total !== undefined) {
                total = data.meta.total;
            } else {
                total = products.length || 0;
            }
        }

        if (!append && products.length === 0) {
            if (grid) grid.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            if (countText) countText.innerText = 'No results found';
            return;
        }

        if (!append && grid) {
            grid.innerHTML = '';
        }

        if (countText) countText.innerText = `Showing ${total} products`;
        renderProducts(products, append);
        
        hasMore = pagination.current_page < pagination.last_page;
        currentFilters.page = pagination.current_page + 1;
        
    } catch (e) {
        console.error('Failed to load products', e);
        if (window.showToast) window.showToast('Error loading products', 'error');
    } finally {
        isLoading = false;
    }
}

function renderProducts(products, append = false) {
    const grid = document.getElementById('shop-products-grid');
    if (!grid || !Array.isArray(products)) return;

    const html = products.map(p => {
        const imageUrl = p.image_url 
            ? p.image_url.replace(/^http:/, 'https:')
            : (p.image ? `https://solocart-backend.onrender.com/storage/${p.image}` : 'https://placehold.co/400x400?text=No+Image');

        const price = Number(p.price) || 0;
        const discount = Number(p.discount_percent) || 0;
        const originalPrice = discount > 0 ? (price / (1 - discount / 100)).toFixed(0) : (price * 1.25).toFixed(0);

        return `
            <div class="group bg-white rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl relative flex flex-col h-full border border-transparent hover:border-slate-100 p-4">
                <a href="/product-details.html?slug=${p.id || p.slug}" class="no-underline text-inherit flex flex-col h-full">
                    <div class="relative w-full aspect-square mb-4 overflow-hidden flex items-center justify-center">
                        <img src="${imageUrl}" class="h-full object-contain group-hover:scale-105 transition-transform duration-700" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
                        ${discount > 0 ? `<span class="absolute top-0 right-0 text-[10px] font-black text-white bg-green-500 px-2 py-1 rounded-bl-lg uppercase">${discount}% OFF</span>` : ''}
                    </div>
                    <div class="flex-grow">
                        <h3 class="text-xs font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-[#2874f0] min-h-[32px]">${p.name || 'Unavailable'}</h3>
                        <div class="flex items-center gap-2 mb-2">
                            <div class="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                ${p.rating || '4.2'} <i class="fas fa-star text-[7px]"></i>
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

    if (append) {
        grid.insertAdjacentHTML('beforeend', html);
    } else {
        grid.innerHTML = html;
    }
}


// Pagination removed for Infinite Scroll

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('global-search');
    const searchBtn = document.getElementById('search-btn');
    
    const triggerSearch = () => {
        currentFilters.search = searchInput.value;
        currentFilters.page = 1;
        applyFilters();
    };

    searchBtn.addEventListener('click', triggerSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') triggerSearch();
    });

    // Price Filter
    document.getElementById('apply-price').addEventListener('click', () => {
        currentFilters.min_price = document.getElementById('min-price').value;
        currentFilters.max_price = document.getElementById('max-price').value;
        currentFilters.page = 1;
        applyFilters();
    });

    // Sort
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilters.sort = btn.dataset.sort;
            currentFilters.page = 1;
            applyFilters();
        });
    });

    // Reset
    document.getElementById('reset-filters').addEventListener('click', () => {
        window.location.href = '/shop.html';
    });

    // Infinite Scroll Listener
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            fetchProducts(true);
        }
    });
}

function applyFilters() {
    const params = new URLSearchParams();
    if (currentFilters.category) params.set('category', currentFilters.category);
    if (currentFilters.search) params.set('search', currentFilters.search);
    if (currentFilters.sort !== 'newest') params.set('sort', currentFilters.sort);
    if (currentFilters.min_price) params.set('min_price', currentFilters.min_price);
    if (currentFilters.max_price) params.set('max_price', currentFilters.max_price);

    window.history.pushState({}, '', `/shop.html?${params.toString()}`);
    fetchProducts();
    updateSortButtons();
}

function updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        if (btn.dataset.sort === currentFilters.sort) {
            btn.classList.add('active', 'bg-[#2874f0]', 'text-white');
            btn.classList.remove('bg-white', 'text-slate-600');
        } else {
            btn.classList.remove('active', 'bg-[#2874f0]', 'text-white');
            btn.classList.add('bg-white', 'text-slate-600');
        }
    });
}

document.addEventListener('DOMContentLoaded', initShop);
