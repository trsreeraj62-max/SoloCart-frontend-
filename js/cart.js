import CONFIG from "./config.js";
import { getAuthToken, updateCartBadge, apiCall } from "./main.js";

async function initCart() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  await fetchCartItems();
  setupEventListeners();
}

async function fetchCartItems() {
  try {
    const token = getAuthToken();
    console.log(
      "[Cart] Fetching cart. Token present:",
      !!token,
      "tokenMasked:",
      token ? `${String(token).slice(0, 12)}...` : null,
    );
    const data = await apiCall("/cart", { requireAuth: true });

    console.log("[Cart] Raw API response:", data);

    // Robustly extract items array from multiple possible response shapes
    let items = [];
    let totals = {};

    if (!data) {
      items = [];
    } else if (Array.isArray(data)) {
      items = data;
    } else if (Array.isArray(data.items)) {
      items = data.items;
      totals = {
        total_price: data.total_price,
        total_mrp: data.total_mrp,
        total_items: data.total_items,
      };
    } else if (data.data && Array.isArray(data.data.items)) {
      items = data.data.items;
      totals = {
        total_price: data.data.total_price,
        total_mrp: data.data.total_mrp,
        total_items: data.data.total_items,
      };
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    } else if (data.cart && Array.isArray(data.cart.items)) {
      items = data.cart.items;
      totals = {
        total_price: data.cart.total_price,
        total_mrp: data.cart.total_mrp,
        total_items: data.cart.total_items,
      };
    } else if (Array.isArray(data.items?.data)) {
      items = data.items.data;
    } else {
      // Try common fallbacks
      items = data.items || data.data || data.cart || [];
      if (!Array.isArray(items)) items = [];
    }
    const container = document.getElementById("cart-items-list");

    if (!items || items.length === 0) {
      document.querySelector(".lg\\:w-8\\/12")?.classList.add("hidden");
      document.querySelector(".lg\\:w-4\\/12")?.classList.add("hidden");
      document.getElementById("empty-cart")?.classList.remove("hidden");
      // clear price details
      updatePriceDetails({ total_price: 0, total_mrp: 0, items: [] });
      return;
    }

    renderCartItems(items);

    // Prefer explicit totals if provided, otherwise compute from items
    if (
      totals &&
      (totals.total_price || totals.total_mrp || totals.total_items)
    ) {
      updatePriceDetails({
        total_price: totals.total_price,
        total_mrp: totals.total_mrp,
        items: items,
      });
    } else {
      // compute totals
      const computed = items.reduce((acc, it) => {
        const product = it.product || it.product_data || it;
        const price = Number(product.price || product.unit_price || 0);
        const qty = Number(it.quantity || it.qty || 1);
        acc.total_price = (acc.total_price || 0) + price * qty;
        acc.total_mrp =
          (acc.total_mrp || 0) + Number(product.mrp || price) * qty;
        return acc;
      }, {});
      updatePriceDetails({
        total_price: computed.total_price || 0,
        total_mrp: computed.total_mrp || 0,
        items: items,
      });
    }
  } catch (e) {
    console.error("Failed to load cart", e);
    if (window.showToast)
      window.showToast("Signal loss while retrieving arsenal", "error");
  }
}

function renderCartItems(items) {
  const container = document.getElementById("cart-items-list");
  if (!container || !Array.isArray(items)) return;

  const cartCountTitle = document.getElementById("cart-count-title");
  const priceDetailsCount = document.getElementById("price-details-count");

  if (cartCountTitle) cartCountTitle.innerText = items.length;
  if (priceDetailsCount) priceDetailsCount.innerText = items.length;

  container.innerHTML = items
    .map((item) => {
      const product = item.product || {};
      const imageUrl = product.image_url
        ? product.image_url.replace(/^http:/, "https:")
        : product.image
          ? `${CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "")}/storage/${product.image}`
          : "https://placehold.co/400x400?text=No+Image";

      const price = Number(product.price) || 0;

      return `
        <div class="p-4 flex gap-4 hover:bg-slate-50 transition-colors" data-id="${item.id}">
            <div class="w-24 h-24 flex-shrink-0 border p-2 rounded-sm bg-white">
          <img src="${imageUrl}" class="h-full w-full object-contain" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-sm font-bold text-slate-800 line-clamp-2">${product.name || "Unavailable"}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Seller: SoloCart Official</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-slate-400 font-bold">Delivery by Wed, Jan 21 | <span class="text-green-600">Free</span></span>
                    </div>
                </div>
                
                <div class="flex items-center gap-4 mt-3">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black text-slate-900">₹${(price * item.quantity).toLocaleString()}</span>
                        <span class="text-xs text-slate-400 line-through font-bold">₹${(price * 1.25 * item.quantity).toFixed(0)}</span>
                        <span class="text-[10px] text-green-600 font-black">20% Off</span>
                    </div>
                </div>

                <div class="flex items-center gap-6 mt-6">
                    <div class="flex items-center border rounded-sm overflow-hidden">
                        <button class="qty-btn minus px-2.5 py-1 text-slate-400 hover:bg-slate-100 font-black" data-id="${item.id}">-</button>
                        <input type="text" value="${item.quantity}" readonly class="w-8 text-center text-xs font-black outline-none border-x">
                        <button class="qty-btn plus px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-btn text-xs font-black uppercase tracking-widest text-[#212121] hover:text-[#2874f0]" data-id="${item.id}">Remove</button>
                </div>
            </div>
        </div>
    `;
    })
    .join("");

  // Re-bind buttons
  container.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = btn.dataset.id;
      const isPlus = btn.classList.contains("plus");
      updateQuantity(id, isPlus);
    });
  });

  container.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      removeItem(btn.dataset.id);
    });
  });
}

async function updateQuantity(itemId, isPlus) {
  const data = await apiCall("/cart/update", {
    method: "POST",
    body: JSON.stringify({
      item_id: itemId,
      increment: isPlus,
    }),
    requireAuth: true,
  });

  if (data && (data.success || data.items)) {
    await fetchCartItems();
    await updateCartBadge();
  }
}

async function removeItem(itemId) {
  if (!confirm("Are you sure you want to remove this item?")) return;

  const data = await apiCall(`/cart/remove/${itemId}`, {
    method: "DELETE",
    requireAuth: true,
  });

  if (data && (data.success || data.message)) {
    if (window.showToast) window.showToast("Item ejected from arsenal");
    await fetchCartItems();
    await updateCartBadge();
  }
}

function updatePriceDetails(data) {
  const totalMrp = document.getElementById("total-mrp");
  const totalDiscount = document.getElementById("total-discount");
  const grandTotal = document.getElementById("grand-total");
  const savingsAmount = document.getElementById("savings-amount");

  if (totalMrp)
    totalMrp.innerText = `₹${Number(data.total_mrp || 0).toLocaleString()}`;
  if (totalDiscount)
    totalDiscount.innerText = `- ₹${Number((data.total_mrp || 0) - (data.total_price || 0)).toLocaleString()}`;
  if (grandTotal)
    grandTotal.innerText = `₹${Number(data.total_price || 0).toLocaleString()}`;
  if (savingsAmount)
    savingsAmount.innerText = `₹${Number((data.total_mrp || 0) - (data.total_price || 0)).toLocaleString()}`;
}

function setupEventListeners() {
  const placeOrderBtn = document.getElementById("place-order-btn");
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", () => {
      window.location.href = "/checkout.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", initCart);
