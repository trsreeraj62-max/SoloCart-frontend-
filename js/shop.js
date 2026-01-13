import CONFIG from './config.js';

let currentFilters = {
    category: '',
    min_price: '',
    max_price: '',
    sort: 'newest',
    search: '',
    page: 1
};

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
        const response = await fetch(`${CONFIG.API_BASE_URL}/categories`);
        const categories = await response.json();
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

async function fetchProducts() {
    const grid = document.getElementById('shop-products-grid');
    const emptyState = document.getElementById('empty-state');
    const countText = document.getElementById('results-count');
    
    // Show loading state
    grid.innerHTML = Array(8).fill('<div class="bg-white p-4 h-80 animate-pulse rounded-sm"></div>').join('');
    emptyState.classList.add('hidden');

    try {
        const query = new URLSearchParams({
            category_id: currentFilters.category,
            search: currentFilters.search,
            sort: currentFilters.sort,
            min_price: currentFilters.min_price,
            max_price: currentFilters.max_price,
            page: currentFilters.page
        }).toString();

        const response = await fetch(`${CONFIG.API_BASE_URL}/products?${query}`);
        const data = await response.json();

        if (!data.products || data.products.length === 0) {
            grid.innerHTML = '';
            emptyState.classList.remove('hidden');
            countText.innerText = 'No results found';
            renderPagination(0);
            return;
        }

        countText.innerText = `Showing ${data.total || data.products.length} products`;
        renderProducts(data.products);
        renderPagination(data.pagination || { current_page: 1, last_page: 1 });
        
    } catch (e) {
        console.error('Failed to load products', e);
        window.showToast('Error loading products', 'error');
    }
}

function renderProducts(products) {
    const grid = document.getElementById('shop-products-grid');
    grid.innerHTML = products.map(p => `
        <div class="group bg-white rounded-sm overflow-hidden transition-all duration-300 hover:shadow-xl relative flex flex-col h-full border border-transparent hover:border-slate-100 p-4">
            <a href="/product-details?slug=${p.slug || p.id}" class="no-underline text-inherit flex flex-col h-full">
                <div class="relative w-full aspect-square mb-4 overflow-hidden flex items-center justify-center">
                    <img src="${p.image_url}" class="h-full object-contain group-hover:scale-105 transition-transform duration-700">
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
        </div>
    `).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    if (!pagination || pagination.last_page <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= pagination.last_page; i++) {
        html += `
            <button class="px-3 py-2 rounded-sm text-sm font-black transition-all ${pagination.current_page === i ? 'bg-[#2874f0] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    container.innerHTML = html;

    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilters.page = parseInt(btn.dataset.page);
            applyFilters();
        });
    });
}

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
        window.location.href = '/shop';
    });
}

function applyFilters() {
    const params = new URLSearchParams();
    if (currentFilters.category) params.set('category', currentFilters.category);
    if (currentFilters.search) params.set('search', currentFilters.search);
    if (currentFilters.sort !== 'newest') params.set('sort', currentFilters.sort);
    if (currentFilters.min_price) params.set('min_price', currentFilters.min_price);
    if (currentFilters.max_price) params.set('max_price', currentFilters.max_price);
    if (currentFilters.page > 1) params.set('page', currentFilters.page);

    window.history.pushState({}, '', `/shop?${params.toString()}`);
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
