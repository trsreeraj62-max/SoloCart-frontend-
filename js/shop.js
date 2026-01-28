import CONFIG from "./config.js";
import { apiCall, updateHeaderProfileImage } from "./main.js";

let currentFilters = {
  category: "",
  min_price: "",
  max_price: "",
  sort: "newest",
  search: "",
  page: 1,
};

let isLoading = false;
let hasMore = true;

async function initShop() {
  console.log("[SHOP] 🔍 Initializing shop...");
  try {
    updateHeaderProfileImage();
  } catch (e) {}
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  currentFilters.category = params.get("category") || "";
  currentFilters.search = params.get("search") || "";
  currentFilters.sort = params.get("sort") || "newest";
  currentFilters.page = parseInt(params.get("page")) || 1;
  currentFilters.min_price = params.get("min_price") || "";
  currentFilters.max_price = params.get("max_price") || "";

  console.log("[SHOP] Filters from URL:", currentFilters);

  // Initialize UI states
  const globalSearchInput = document.getElementById("global-search");
  if (currentFilters.search && globalSearchInput) {
    globalSearchInput.value = currentFilters.search;
  }

  const minPriceInput = document.getElementById("min-price-select") || document.getElementById("min-price");
  if (currentFilters.min_price && minPriceInput) {
    minPriceInput.value = currentFilters.min_price;
  }

  const maxPriceInput = document.getElementById("max-price-select") || document.getElementById("max-price");
  if (currentFilters.max_price && maxPriceInput) {
    maxPriceInput.value = currentFilters.max_price;
  }

  updateSortButtons();

  // Initial fetch - Run in parallel to prevent blocking
  console.log("[SHOP] Starting parallel fetches...");
  fetchCategories();
  fetchProducts();

  // Bind Event Listeners
  console.log("[SHOP] Setting up event listeners...");
  setupEventListeners();
  console.log("[SHOP] ✅ Shop initialization complete");
}


// Helper for debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function fetchCategories() {
  console.log("[SHOP] 📂 fetchCategories starting...");
  try {
    // Try dedicated categories endpoint first
    const data = await apiCall("/categories", { timeout: 8000 }); // Faster timeout for categories
    console.log("[SHOP] 📂 Categories API response received:", data);
    
    let categories = [];
    if (data && data.success !== false) {
        categories = data.categories || data.data || (Array.isArray(data) ? data : []);
    } else {
        console.warn("[SHOP] ⚠️ Categories API returned failure, trying fallback...");
        const homeData = await apiCall("/home-data");
        categories = homeData?.categories || homeData?.data?.categories || [];
    }

    console.log("[SHOP] 📂 Extracted categories array:", categories);
    renderCategories(categories);
  } catch (e) {
    console.error("[SHOP] ❌ fetchCategories failed, trying final fallback:", e);
    try {
        const homeData = await apiCall("/home-data");
        const categories = homeData?.categories || homeData?.data?.categories || [];
        renderCategories(categories);
    } catch (err) {
        console.error("[SHOP] ❌ All category fetch attempts failed");
    }
  }
}

function renderCategories(categories) {
  const container = document.getElementById("category-filters");
  if (!container) {
    console.warn("[SHOP] ⚠️ category-filters container not found in DOM");
    return;
  }

  if (!Array.isArray(categories)) {
     console.error("[SHOP] ❌ renderCategories: categories is not an array", categories);
     container.innerHTML = '<p class="text-xs text-slate-400">Failed to load categories</p>';
     return;
  }

  console.log("[SHOP] 🎨 Rendering", categories.length, "categories");

  container.innerHTML =
    `
        <label class="flex items-center gap-2 cursor-pointer group py-1">
            <input type="radio" name="category" value="" class="rounded border-slate-300 text-[#2874f0] focus:ring-0" ${currentFilters.category === "" || currentFilters.category === null ? "checked" : ""}>
            <span class="text-sm text-slate-700 group-hover:text-slate-900">All Categories</span>
        </label>
    ` +
    categories
      .map(
        (c) => `
        <label class="flex items-center gap-2 cursor-pointer group py-1">
            <input type="radio" name="category" value="${c.id}" class="rounded border-slate-300 text-[#2874f0] focus:ring-0" ${currentFilters.category == c.id ? "checked" : ""}>
            <span class="text-sm text-slate-700 group-hover:text-slate-900">${c.name}</span>
        </label>
    `,
      )
      .join("");

  // Re-bind category radio clicks
  container.querySelectorAll('input[name="category"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      console.log("[SHOP] ⚡ Category changed to:", e.target.value);
      currentFilters.category = e.target.value;
      currentFilters.page = 1;
      applyFilters();
      
      // Auto-close on mobile after selection
      if (window.innerWidth < 1024) {
          document.getElementById('close-filters')?.click();
      }
    });
  });
}

async function fetchProducts(append = false) {
  if (isLoading || (!hasMore && append)) return;
  isLoading = true;

  const grid = document.getElementById("shop-products-grid");
  const emptyState = document.getElementById("empty-state");
  const countText = document.getElementById("results-count");

  if (!append) {
    if (grid)
      grid.innerHTML = Array(8)
        .fill('<div class="h-80 animate-pulse bg-slate-50 border border-slate-100 p-4"></div>')
        .join("");
    if (emptyState) emptyState.classList.add("hidden");
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
      page: currentFilters.page,
    }).toString();

    const apiEndpoint = `/products?${query}`;
    console.log(
      "[SHOP] 🔗 Fetching products from:",
      CONFIG.API_BASE_URL + apiEndpoint,
    );
    const data = await apiCall(apiEndpoint);
    console.log("[SHOP] ✅ Products API response:", data);

    // Handle various response structures
    let products = [];
    let pagination = { current_page: 1, last_page: 1 };
    let total = 0;

    if (data) {
      let extracted =
        data.products || data.data || (Array.isArray(data) ? data : []);

      // Handle case where 'products' key contains the paginator object (with a 'data' array inside)
      if (
        extracted &&
        !Array.isArray(extracted) &&
        Array.isArray(extracted.data)
      ) {
        extracted = extracted.data;
      }

      products = Array.isArray(extracted) ? extracted : [];

      // Handle pagination metadata from both Laravel standard and resource formats
      pagination = data.pagination ||
        data.meta || {
          current_page: data.current_page || 1,
          last_page: data.last_page || 1,
        };

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
      if (grid) grid.innerHTML = "";
      if (emptyState) emptyState.classList.remove("hidden");
      if (countText) countText.innerText = "No results found";
      return;
    }

    if (!append && grid) {
      grid.innerHTML = "";
    }

    if (countText) countText.innerText = `Showing 1 – ${products.length} of ${total} results`;
    renderProducts(products, append);

    hasMore = pagination.current_page < pagination.last_page;
    currentFilters.page = pagination.current_page + 1;
  } catch (e) {
    console.error("Failed to load products", e);
    if (countText) countText.innerText = "Error loading results";
    if (grid && !append) grid.innerHTML = '<div class="col-span-full py-10 text-center text-slate-400">Failed to load products. Please try again.</div>';
    if (window.showToast) window.showToast("Error loading products", "error");
  } finally {
    isLoading = false;
  }
}

function renderProducts(products, append = false) {
  const grid = document.getElementById("shop-products-grid");
  if (!grid || !Array.isArray(products)) {
    return;
  }

  const html = products
    .map((p) => {
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = p.image_url
        ? p.image_url.replace(/^http:/, "https:")
        : p.image
          ? `${backendBase}/storage/${p.image}`
          : "https://placehold.co/400x400?text=No+Image";

      const currentPrice = Number(p.current_price) || 0;
      const originalPrice = Number(p.price) || 0;
      const isDiscounted = p.is_discount_active;
      const discountLabel = p.discount_label || "";

      // Flipkart Grid Item Style
      return `
            <div class="hover:shadow-lg transition-shadow duration-300 relative bg-white p-4 group cursor-pointer" onclick="window.location.href='/product-details.html?slug=${p.id || p.slug}'">
                <div class="relative w-full aspect-[4/5] mb-2 flex items-center justify-center overflow-hidden">
                    <img src="${imageUrl}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
                    ${isDiscounted ? `<div class="absolute top-0 left-0 text-[10px] font-bold text-green-700 bg-green-50 px-1 py-0.5 rounded-sm">${discountLabel}</div>` : ""}
                </div>
                
                <div class="space-y-1">
                    <h3 class="text-sm font-medium text-slate-700 hover:text-[#2874f0] line-clamp-2 leading-snug min-h-[40px] transition-colors" title="${p.name}">${p.name}</h3>
                    
                    <div class="flex items-center gap-2">
                        <div class="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            ${p.rating || "4.2"} <i class="fas fa-star text-[8px]"></i>
                        </div>
                        <span class="text-slate-400 text-xs font-medium">(${Math.floor(Math.random() * 500) + 10})</span>
                    </div>
 
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-base font-bold text-slate-900">₹${currentPrice.toLocaleString()}</span>
                        ${isDiscounted ? `<span class="text-xs text-slate-500 line-through">₹${originalPrice.toLocaleString()}</span>` : ""}
                        ${isDiscounted ? `<span class="text-xs font-bold text-green-600">${discountLabel}</span>` : ""}
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  if (append) {
    grid.insertAdjacentHTML("beforeend", html);
  } else {
    grid.innerHTML = html;
  }
}

// Pagination removed for Infinite Scroll

function setupEventListeners() {
  // Search
  // Check if elements exist before adding listeners
  const searchInput = document.getElementById("global-search");
  const searchBtn = document.getElementById("search-btn"); // Might not exist if using auto-search

  const triggerSearch = debounce(() => {
    if(searchInput) {
        currentFilters.search = searchInput.value;
        currentFilters.page = 1;
        applyFilters();
    }
  }, 500);

  if(searchInput) {
      searchInput.addEventListener("input", triggerSearch);
  }

  // Price Selectors
  const minPrice = document.getElementById("min-price-select");
  const maxPrice = document.getElementById("max-price-select");
  
  if (minPrice && maxPrice) {
      const updatePrice = () => {
          currentFilters.min_price = minPrice.value;
          currentFilters.max_price = maxPrice.value;
          currentFilters.page = 1;
          applyFilters();
      };
      minPrice.addEventListener("change", updatePrice);
      maxPrice.addEventListener("change", updatePrice);
  }

  // Sort
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentFilters.sort = btn.dataset.sort;
      currentFilters.page = 1;
      applyFilters();
      updateSortButtons();
    });
  });

  // Reset
  const resetBtn = document.getElementById("reset-filters");
  if(resetBtn) {
      resetBtn.addEventListener("click", () => {
        window.location.href = "/shop.html";
      });
  }

  // Infinite Scroll Listener
  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 500
    ) {
      fetchProducts(true);
    }
  });
}

function applyFilters() {
  const params = new URLSearchParams();
  if (currentFilters.category) params.set("category", currentFilters.category);
  if (currentFilters.search) params.set("search", currentFilters.search);
  if (currentFilters.sort !== "newest") params.set("sort", currentFilters.sort);
  if (currentFilters.min_price)
    params.set("min_price", currentFilters.min_price);
  if (currentFilters.max_price)
    params.set("max_price", currentFilters.max_price);

  window.history.pushState({}, "", `/shop.html?${params.toString()}`);
  fetchProducts();
  updateSortButtons();
}

function updateSortButtons() {
  document.querySelectorAll(".sort-btn").forEach((btn) => {
    if (btn.dataset.sort === currentFilters.sort) {
      btn.classList.add("active", "bg-[#2874f0]", "text-white");
      btn.classList.remove("bg-white", "text-slate-600");
    } else {
      btn.classList.remove("active", "bg-[#2874f0]", "text-white");
      btn.classList.add("bg-white", "text-slate-600");
    }
  });
}

document.addEventListener("DOMContentLoaded", initShop);

// Listen for admin content updates (from other tabs)
window.addEventListener("storage", (e) => {
  if (e.key === "solocart_content_updated_at") {
    try {
      // Reset pagination and reload products
      currentFilters.page = 1;
      if (window.showToast)
        window.showToast("New products/banners available — refreshing", "info");
      fetchProducts();
    } catch (err) {
      console.error("Failed to refresh shop after update signal", err);
    }
  }
});
