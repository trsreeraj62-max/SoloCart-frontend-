import CONFIG from "./config.js";
import { getAuthToken, updateCartBadge, apiCall } from "./main.js";

let currentProduct = null;

function setupEventListeners() {
  document
    .getElementById("add-to-cart-btn")
    ?.addEventListener("click", () => handleAddToCart());
  document
    .getElementById("buy-now-btn")
    ?.addEventListener("click", handleBuyNow);
}

async function initProductDetails() {
  // Start listeners immediately
  setupEventListeners();

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    window.location.href = "/shop.html";
    return;
  }

  // Fire and forget (let it load in background while we show skeletons)
  fetchProductDetails(slug);
}

async function fetchProductDetails(slug) {
  try {
    // Single efficient call. Most backends will return related products in the same call.
    const data = await apiCall(`/products/${slug}`);

    if (!data || data.success === false) {
      // Only try fallback if absolutely necessary and slug looks like it has an ID
      if (/-(\d+)$/.test(slug)) {
        const extractedId = slug.match(/-(\d+)$/)[1];
        const fallbackData = await apiCall(`/products/${extractedId}`);
        if (fallbackData && fallbackData.success !== false) {
          renderUI(fallbackData);
        } else {
          throw new Error("Product Signal Lost");
        }
      } else {
        throw new Error("Product Signal Lost");
      }
    } else {
      renderUI(data);
    }
  } catch (e) {
    console.error("Failed to load product details", e);
    const nameEl = document.getElementById("product-name");
    if (nameEl) nameEl.innerText = "Signal Extraction Failed";
    if (window.showToast) window.showToast("Product connection error", "error");
  }
}

function renderUI(data) {
  currentProduct = data.product || data.data || (data.id ? data : null);
  if (currentProduct) {
    renderProductInfo(currentProduct);
    renderRelatedProducts(data.related_products || data.related || []);
  }
}

function renderProductInfo(p) {
  document.title = `${p.name} — SoloCart`;
  const crumbName = document.getElementById("crumb-product-name");
  if (crumbName) crumbName.innerText = p.name;

  const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
  const imageUrl = p.image_url
    ? p.image_url.replace(/^http:/, "https:")
    : p.image
      ? `${backendBase}/storage/${p.image}`
      : "https://placehold.co/400x400?text=No+Image";

  const imgEl = document.getElementById("product-image");
  if (imgEl) imgEl.src = imageUrl;

  if (document.getElementById("product-name"))
    document.getElementById("product-name").innerText = p.name;
  if (document.getElementById("product-rating"))
    document.getElementById("product-rating").innerText = p.rating || "4.2";
  if (document.getElementById("product-price"))
    document.getElementById("product-price").innerText =
      `₹${Number(p.price).toLocaleString()}`;

  const oldPriceEl = document.getElementById("product-old-price");
  const discountEl = document.getElementById("product-discount");

  if (p.discount_percent > 0) {
    if (oldPriceEl) {
      oldPriceEl.innerText = `₹${(p.price / (1 - p.discount_percent / 100)).toFixed(0)}`;
      oldPriceEl.classList.remove("hidden");
    }
    if (discountEl) {
      discountEl.innerText = `${p.discount_percent}% off`;
      discountEl.classList.remove("hidden");
    }
  } else {
    if (oldPriceEl) oldPriceEl.classList.add("hidden");
    if (discountEl) discountEl.classList.add("hidden");
  }

  if (document.getElementById("product-description")) {
    document.getElementById("product-description").innerText =
      p.description || "No description available for this premium acquisition.";
  }

  // Render specs
  const specsGrid = document.getElementById("specs-grid");
  if (specsGrid) {
    const specs = [
      {
        label: "Category",
        value: p.category ? p.category.name : "Uncategorized",
      },
      {
        label: "Stock Status",
        value: p.stock > 0 ? "In Stock" : "Out of Stock",
      },
      { label: "Manufacturer", value: "SoloCart Industries" },
      { label: "Model Year", value: "2026" },
    ];

    specsGrid.innerHTML = specs
      .map(
        (s) => `
            <div class="text-[11px] font-black text-slate-400 uppercase tracking-widest">${s.label}</div>
            <div class="text-sm font-bold text-slate-700">${s.value}</div>
        `,
      )
      .join("");
  }
}

function renderRelatedProducts(products) {
  const grid = document.getElementById("related-products-grid");
  if (!grid) return;

  if (!Array.isArray(products) || products.length === 0) {
    grid.innerHTML =
      '<p class="text-slate-400 text-sm">No related products found.</p>';
    return;
  }

  grid.innerHTML = products
    .map((p) => {
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = p.image_url
        ? p.image_url.replace(/^http:/, "https:")
        : p.image
          ? `${backendBase}/storage/${p.image}`
          : "https://placehold.co/400x400?text=No+Image";

      return `
            <div class="bg-white rounded-sm border border-slate-100 p-3 hover:shadow-lg transition-all group">
                <a href="/product-details.html?slug=${p.slug || p.id}" class="no-underline text-inherit">
                    <div class="aspect-square mb-3 overflow-hidden flex items-center justify-center">
                        <img src="${imageUrl}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
                    </div>
                    <h4 class="text-xs font-bold text-slate-800 line-clamp-2 mb-1 group-hover:text-[#2874f0]">${p.name || "Unavailable"}</h4>
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-black">₹${Number(p.price || 0).toLocaleString()}</span>
                    </div>
                </a>
            </div>
        `;
    })
    .join("");
}

async function handleAddToCart() {
  if (!currentProduct) {
    if (window.showToast)
      window.showToast("Product data not loaded. Please refresh.", "error");
    return;
  }

  const token = getAuthToken();
  if (!token) {
    if (window.showToast) window.showToast("Please login to continue", "error");
    setTimeout(() => {
      window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    }, 1500);
    return;
  }

  const data = await apiCall("/cart/add", {
    method: "POST",
    body: JSON.stringify({
      product_id: currentProduct.id,
      quantity: 1,
    }),
    requireAuth: true,
  });

  if (data && (data.success || data.id)) {
    if (window.showToast) window.showToast("Added to cart successfully");
    await updateCartBadge();
  } else {
    if (window.showToast)
      window.showToast(data?.message || "Failed to update cart", "error");
  }
}

function handleBuyNow() {
  if (!currentProduct) {
    if (window.showToast)
      window.showToast("Product data not loaded. Please refresh.", "error");
    return;
  }
  // Store buy-now item and type in localStorage
  const buyNowItem = {
    id: currentProduct.id,
    name: currentProduct.name,
    price: Number(currentProduct.price || 0),
    image: currentProduct.image_url || currentProduct.image || "",
    quantity: 1,
  };
  localStorage.setItem("buy_now_item", JSON.stringify(buyNowItem));
  localStorage.setItem("checkout_type", "buy_now");
  window.location.href = "/checkout.html";
}

document.addEventListener("DOMContentLoaded", initProductDetails);
