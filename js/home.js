import CONFIG from "./config.js";
import { apiCall, updateHeaderProfileImage } from "./main.js";

/**
 * Fetches home page data and updates the UI.
 * Handles products safely and manages the "No Products" popup.
 */
async function fetchHomeData() {
  try {
    console.log("[HOME] 🔍 Starting fetchHomeData...");
    console.log("[HOME] API URL:", CONFIG.API_BASE_URL + "/home-data");

    const data = await apiCall("/home-data", { skipRedirect: true });
    console.log("[HOME] ✅ API Response received:", data);
    console.log("[HOME] Response type:", typeof data);
    console.log("[HOME] Is array?", Array.isArray(data));
    console.log("[HOME] Has 'data' key?", !!data?.data);
    console.log("[HOME] Has 'banners' key?", !!data?.banners);
    console.log("[HOME] Has 'products' key?", !!data?.products);

    if (!data) {
      showNoProductsPopup();
      return;
    }

    // Handle Banners if present
    console.log("[HOME] 🖼️ Processing banners...");
    let banners = data.banners || data.data?.banners || [];
    console.log("[HOME] Banners found:", banners.length, banners);

    if (Array.isArray(banners) && banners.length > 0) {
      console.log("[HOME] Rendering", banners.length, "banners");
      renderBanners(banners);
    } else {
      console.log(
        "[HOME] ⚠️ No banners in /home-data, trying /banners endpoint...",
      );
      // Fallback: try fetching banners from dedicated endpoint
      const bannerData = await apiCall("/banners");
      console.log("[HOME] /banners response:", bannerData);
      const fallbackBanners =
        bannerData?.banners ||
        bannerData?.data ||
        (Array.isArray(bannerData) ? bannerData : []);
      console.log(
        "[HOME] Fallback banners:",
        fallbackBanners.length,
        fallbackBanners,
      );
      if (fallbackBanners.length > 0) {
        console.log("[HOME] Rendering fallback banners");
        renderBanners(fallbackBanners);
      }
    }

    // Handle Products - extract from data.products or data.data or data itself
    // Robust Product Extraction
    console.log("[HOME] 📦 Processing products...");
    let featured = [];
    let latest = [];
    let products = [];

    // Helper to find array in possible locations
    const findArray = (keys) => {
      for (const key of keys) {
        if (Array.isArray(data[key])) {
          console.log("[HOME] Found", key, ":", data[key].length, "items");
          return data[key];
        }
        if (data.data && Array.isArray(data.data[key])) {
          console.log(
            "[HOME] Found data.",
            key,
            ":",
            data.data[key].length,
            "items",
          );
          return data.data[key];
        }
      }
      return null;
    };

    // Try specific lists first
    featured = findArray(["featured_products", "featured"]) || [];
    latest = findArray(["latest_products", "latest"]) || [];

    // Try generic products list
    if (Array.isArray(data.products)) {
      console.log("[HOME] Using data.products:", data.products.length);
      products = data.products;
    } else if (data.data && Array.isArray(data.data.products)) {
      console.log(
        "[HOME] Using data.data.products:",
        data.data.products.length,
      );
      products = data.data.products;
    } else if (data.data && Array.isArray(data.data)) {
      console.log("[HOME] Using data.data directly:", data.data.length);
      products = data.data;
    } else if (Array.isArray(data)) {
      console.log("[HOME] Using data directly (array):", data.length);
      products = data;
    }

    console.log(
      "[HOME] Extracted counts - Featured:",
      featured.length,
      "Latest:",
      latest.length,
      "Products:",
      products.length,
    );

    // Fallback: If specific lists are empty, use generic products
    if (featured.length === 0) featured = products;
    if (latest.length === 0) latest = products;

    console.log(
      "[HOME] Final counts after fallback - Featured:",
      featured.length,
      "Latest:",
      latest.length,
    );

    if (featured.length > 0 || latest.length > 0) {
      console.log("[HOME] ✅ Rendering products...");
      renderProducts(
        featured.length > 0 ? featured : latest,
        "featured-products-grid",
      );
      renderProducts(
        latest.length > 0 ? latest : featured,
        "latest-products-grid",
      );
      console.log("[HOME] ✅ Products rendered successfully");
      hideNoProductsPopup();
    } else {
      console.error("[HOME] ❌ No products found! Response:", data);
      showNoProductsPopup();
    }

    // Handle Categories
    console.log("[HOME] 🔲 Processing categories...");
    let categories = data.categories || data.data?.categories || [];
    if (Array.isArray(categories) && categories.length > 0) {
      renderCategories(categories);
    } else {
      const categorySection = document.getElementById("categories-row");
      if (categorySection) categorySection.style.display = "none";
    }
  } catch (err) {
    console.error("[HOME] ❌ Home fetch failed:", err);
    console.error("[HOME] Error details:", err.message, err.stack);
    showNoProductsPopup();
    if (window.showToast) {
      window.showToast(
        "Failed to sync content: " + (err.message || err),
        "error",
      );
    }
  }
}

/**
 * Popup UI Controls
 */
function showNoProductsPopup() {
  const popup = document.getElementById("no-products-popup");
  if (popup) popup.style.display = "flex";
}

function hideNoProductsPopup() {
  const popup = document.getElementById("no-products-popup");
  if (popup) popup.style.display = "none";
}

/**
 * Renders the hero slider banners.
 */
function renderBanners(banners) {
  const container = document.getElementById("hero-slider-content");
  console.log(
    "[HOME] renderBanners called - Container:",
    container ? "found" : "NOT FOUND",
    "Banners:",
    banners.length,
  );
  if (!container || !Array.isArray(banners) || banners.length === 0) {
    console.warn(
      "[HOME] ❌ renderBanners exit - container:",
      !!container,
      "isArray:",
      Array.isArray(banners),
      "length:",
      banners?.length,
    );
    return;
  }

  container.innerHTML = banners
    .map((b, i) => {
      // Use full URL if provided by backend, else construct it
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = b.image_url
        ? b.image_url.replace(/^http:/, "https:")
        : b.image
          ? `${backendBase}/storage/${b.image}`
          : "https://placehold.co/1600x400?text=Banner";

      console.log("[HOME] Banner:", b.title || "untitled", "Image:", imageUrl);

      return `
            <div class="carousel-item ${i === 0 ? "active" : ""}">
                <img src="${imageUrl}" class="d-block w-full h-[280px] md:h-[350px] object-cover" alt="Banner" onerror="this.onerror=null;this.src='https://placehold.co/1600x400?text=Banner'">
                ${
                  b.title
                    ? `
                <div class="carousel-caption d-none d-md-block bg-black/20 backdrop-blur-sm rounded-lg p-4 mb-10 max-w-lg mx-auto text-white">
                    <h5 class="text-3xl font-black italic tracking-tighter">${b.title}</h5>
                    <p class="font-bold text-sm tracking-widest uppercase opacity-80">${b.subtitle || ""}</p>
                </div>`
                    : ""
                }
            </div>
        `;
    })
    .join("");
}

/**
 * Renders categories at the top of the home page.
 */
function renderCategories(categories) {
  const container = document.getElementById("categories-row");
  if (!container || !Array.isArray(categories)) return;

  container.innerHTML = categories
    .map((c) => {
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = c.image_url
        ? c.image_url.replace(/^http:/, "https:")
        : c.image
          ? `${backendBase}/storage/${c.image}`
          : "https://placehold.co/100x100?text=Category";

      return `
        <a href="/shop.html?category=${c.id}" class="flex flex-col items-center gap-2 no-underline group min-w-[80px]">
            <div class="w-16 h-16 rounded-full overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2 group-hover:shadow-md transition-shadow">
                <img src="${imageUrl}" class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="${c.name}" onerror="this.onerror=null;this.src='https://placehold.co/100x100?text=Cat'">
            </div>
            <span class="text-[12px] font-bold text-slate-700 group-hover:text-[#2874f0] text-center">${c.name}</span>
        </a>
      `;
    })
    .join("");
}

/**
 * Renders products into a Specified grid container.
 */

// Banner Progress Logic
let bannerProgressInterval;
function startBannerProgress() {
    const bar = document.getElementById('banner-progress');
    if (!bar) return;
    
    // Reset
    bar.style.width = '0%';
    bar.style.transition = 'none'; // Instant reset
    
    // Force reflow
    void bar.offsetWidth;

    // Start animation
    bar.style.transition = 'width 3.8s linear'; // Slightly less than 4s interval
    bar.style.width = '100%';
}

document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.getElementById('flipkartCarousel');
    if (carousel) {
        carousel.addEventListener('slide.bs.carousel', () => {
             // Reset when slide changes
             const bar = document.getElementById('banner-progress');
             if(bar) {
                bar.style.transition = 'none';
                bar.style.width = '0%';
             }
        });
        carousel.addEventListener('slid.bs.carousel', () => {
            startBannerProgress();
        });
        // Start initially
        setTimeout(startBannerProgress, 100);
    }
});


/**
 * Renders products into a Specified grid container with Horizontal Scroll support.
 */
function renderProducts(products, gridId) {
  console.log(
    "[HOME] renderProducts called - GridId:",
    gridId,
    "Products:",
    products.length,
  );
  if (!Array.isArray(products)) {
    console.error(
      "[HOME] ❌ renderProducts: products is not array",
      typeof products,
    );
    return;
  }

  const grid = document.getElementById(gridId);
  console.log("[HOME] Grid element found:", !!grid, "for", gridId);
  if (!grid) {
    console.error("[HOME] ❌ Grid element not found:", gridId);
    return;
  }

  const renderedHtml = products
    .map((product) => {
      // Use full URL if provided by backend (image_url), else construct it
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = product.image_url
        ? product.image_url.replace(/^http:/, "https:")
        : product.image
          ? `${backendBase}/storage/${product.image}`
          : "https://placehold.co/400x400?text=No+Image";

      const price = Number(product.price) || 0;
      const discount = Number(product.discount_percent) || 0;
      const originalPrice =
        discount > 0
          ? (price / (1 - discount / 100)).toFixed(0)
          : (price * 1.25).toFixed(0);

      // Flipkart-style card (Vertical compressed)
      return `
            <div class="product-card-min bg-white border border-slate-100 rounded-lg p-3 hover:shadow-lg transition-all relative flex flex-col gap-3 group cursor-pointer" onclick="window.location.href='/product-details.html?slug=${product.id || product.slug}'" style="min-width: 200px; max-width: 200px;">
                <div class="w-full h-[160px] flex items-center justify-center p-2 relative">
                    <img src="${imageUrl}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" alt="${product.name}" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
                    ${discount > 0 ? `<div class="absolute top-0 left-0 bg-green-600 text-[9px] text-white px-1 font-bold rounded-sm">${discount}% off</div>` : ""}
                </div>
                <div class="text-center">
                    <h3 class="text-[13px] font-medium text-slate-800 line-clamp-1 overflow-hidden text-ellipsis mb-0.5" title="${product.name}">${product.name || "Unavailable"}</h3>
                    <div class="flex items-center justify-center gap-1.5 flex-wrap">
                        <span class="text-sm font-bold text-slate-900">₹${price.toLocaleString()}</span>
                        ${discount > 0 ? `<span class="text-[11px] text-slate-400 line-through">₹${Number(originalPrice).toLocaleString()}</span>` : ""}
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  console.log("[HOME] ✅ Generated HTML for", products.length, "products");
  grid.innerHTML = renderedHtml;
}

// Initialize on load
console.log("[HOME] 📄 home.js loaded, waiting for DOMContentLoaded");
document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "[HOME] 🚀 DOMContentLoaded fired, calling header update + fetchHomeData",
  );
  try {
    updateHeaderProfileImage();
  } catch (e) {}
  fetchHomeData();
});

// Listen for content updates signaled by admin actions in other tabs
window.addEventListener("storage", (e) => {
  if (e.key === "solocart_content_updated_at") {
    try {
      console.log("[HOME] 🔄 Content update signal received");
      // Debounce rapid updates
      if (window.__solocart_refresh_pending) {
        console.log("[HOME] ⏸️ Update debounced (already pending)");
        return;
      }
      window.__solocart_refresh_pending = true;
      setTimeout(() => {
        window.__solocart_refresh_pending = false;
      }, 800);
      if (window.showToast)
        window.showToast("Content updated — refreshing", "info");
      fetchHomeData();
    } catch (err) {
      console.error(
        "[HOME] ❌ Failed to refresh home after update signal",
        err,
      );
    }
  }
});

