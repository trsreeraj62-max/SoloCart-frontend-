import CONFIG from "./config.js";
import { getAuthToken, apiCall, safeJSONParse } from "./main.js";

let cartData = null;
let savedAddress = null;
let _fetchInFlight = false;
const CHECKOUT_KEY = "checkout_data";

async function initCheckout() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = "/login.html?redirect=/checkout.html";
    return;
  }

  const userData = safeJSONParse(localStorage.getItem("user_data"), {});
  const authStatusInfo = document.getElementById("auth-status-info");
  if (authStatusInfo) {
    authStatusInfo.innerText = userData.name || userData.email || "Logged In";
  }

  // Detect buy now vs cart checkout
  const checkoutType = localStorage.getItem("checkout_type");
  if (checkoutType === "buy_now") {
    renderBuyNow();
  } else {
    await fetchCartOnce();
  }
  setupEventListeners();
}

function renderBuyNow() {
  const item = JSON.parse(localStorage.getItem("buy_now_item") || "null");
  console.log("[Checkout] Buy Now item:", item);
  
  if (!item) {
    console.warn("[Checkout] No buy_now_item found, redirecting to cart");
    window.location.href = "/cart.html";
    return;
  }
  
  // Save to checkout_data
  try {
    const checkoutData = {
      items: [item],
      is_buy_now: true
    };
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkoutData));
    console.log("[Checkout] Saved Buy Now item to checkout_data");
  } catch (e) {
    console.error("[Checkout] Failed to save Buy Now checkout data:", e);
  }
  
  const container = document.getElementById("checkout-items-list");
  if (!container) return;
  container.innerHTML = `
    <div class="py-4 flex gap-4 border-b last:border-0 checkout-item">
      <div class="w-16 h-16 border rounded-sm p-1">
        <img src="${item.image || "https://placehold.co/400x400?text=No+Image"}" class="h-full w-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
      </div>
      <div class="flex-grow">
        <div class="flex justify-between items-start">
          <div>
            <h4 class="text-xs font-bold text-slate-800 line-clamp-1">${item.name || "Unavailable"}</h4>
            <div class="text-[10px] text-slate-400 font-bold uppercase mt-1">₹${Number(item.price).toLocaleString()}</div>
          </div>
          <div class="text-right">
            <div class="text-sm font-black mt-2">Subtotal: <span class="item-subtotal">₹${Number(item.price * item.quantity).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  // Render price details
  renderBuyNowPrice(item);
  console.log("[Checkout] Buy Now rendering complete");
}

function renderBuyNowPrice(item) {
  const countEl = document.getElementById("price-details-count");
  const mrpEl = document.getElementById("total-mrp");
  const discEl = document.getElementById("total-discount");
  const grandEl = document.getElementById("grand-total");
  if (countEl) countEl.innerText = 1;
  if (mrpEl) mrpEl.innerText = `₹${Number(item.price).toLocaleString()}`;
  if (discEl) discEl.innerText = `- ₹0`;
  if (grandEl)
    grandEl.innerText = `₹${Number(item.price * item.quantity).toLocaleString()}`;
}

// Strict single cart fetch and render using backend-provided totals only
async function fetchCartOnce() {
  if (_fetchInFlight) return;
  _fetchInFlight = true;
  try {
    console.log("[Checkout] Fetching cart data...");
    const data = await apiCall("/cart", { requireAuth: true });
    console.log("[Checkout] Raw cart response:", data);
    
    if (!data || data.success === false) {
      if (data && data.statusCode === 401) {
        if (window.showToast) window.showToast("Session expired", "error");
        setTimeout(() => (window.location.href = "/login.html"), 300);
        return;
      }
      if (window.showToast)
        window.showToast(data?.message || "Failed to load cart", "error");
      return;
    }

    cartData = data;

    // Extract items array from common shapes (no price math here)
    let items = [];
    if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.items)) items = data.items;
    else if (data.data && Array.isArray(data.data.items))
      items = data.data.items;
    else if (data.cart && Array.isArray(data.cart.items))
      items = data.cart.items;
    else if (Array.isArray(data.data)) items = data.data;
    else items = data.items || data.data || [];

    console.log("[Checkout] Extracted items:", items.length, "items");

    // If no items, redirect to cart page
    if (!items || items.length === 0) {
      console.warn("[Checkout] No items in cart, redirecting...");
      window.location.href = "/cart.html";
      return;
    }

    // Save items to checkout_data for the Continue button
    try {
      const checkoutData = {
        items: items,
        cart_data: data
      };
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkoutData));
      console.log("[Checkout] Saved", items.length, "items to checkout_data");
    } catch (e) {
      console.error("[Checkout] Failed to save checkout data:", e);
    }

    renderCartItems(items);
    // Render totals strictly from backend fields only
    renderPriceDetails(data);
    
    console.log("[Checkout] Cart rendering complete");
  } catch (err) {
    console.error("Failed to fetch cart once", err);
    if (window.showToast) window.showToast("Failed to load cart", "error");
  } finally {
    _fetchInFlight = false;
  }
}

async function fetchCartData() {
  try {
    const data = await apiCall("/cart", { requireAuth: true });
    console.log("[Checkout] Raw cart response:", data);

    // Normalize items similar to cart.js
    let items = [];
    if (!data) items = [];
    else if (Array.isArray(data)) items = data;
    else if (Array.isArray(data.items)) items = data.items;
    else if (data.data && Array.isArray(data.data.items))
      items = data.data.items;
    else if (data.cart && Array.isArray(data.cart.items))
      items = data.cart.items;
    else if (Array.isArray(data.data)) items = data.data;
    else items = data.items || data.data || [];

    cartData = data;

    // Apply checkout selection (single item) if present
    // old flow removed in favor of unified checkout_data
  } catch (e) {
    console.error("Failed to fetch cart data", e);
  }
}

function renderPriceDetails(data) {
  // Render totals only from backend response keys. No arithmetic performed here.
  const countEl = document.getElementById("price-details-count");
  const mrpEl = document.getElementById("total-mrp");
  const discEl = document.getElementById("total-discount");
  const grandEl = document.getElementById("grand-total");

  // Prefer common backend keys; fallbacks are only for compatibility with different API shapes
  const totalItems =
    data.total_items || data.items?.length || data.cart?.total_items || 0;
  const totalMrp =
    data.total_mrp ||
    data.mrp_total ||
    data.cart?.total_mrp ||
    data.subtotal ||
    data.total_mrp ||
    0;
  const totalPrice =
    data.total_price ||
    data.total ||
    data.grand_total ||
    data.total_amount ||
    data.cart?.total_price ||
    0;
  const discount = totalMrp && totalPrice ? totalMrp - totalPrice : null;

  if (countEl) countEl.innerText = totalItems;
  if (mrpEl) mrpEl.innerText = `₹${Number(totalMrp || 0).toLocaleString()}`;
  if (discEl)
    discEl.innerText =
      discount !== null ? `- ₹${Number(discount).toLocaleString()}` : `- ₹0`;
  if (grandEl)
    grandEl.innerText = `₹${Number(totalPrice || 0).toLocaleString()}`;
}

function renderCartItems(items) {
  const container = document.getElementById("checkout-items-list");
  if (!container || !Array.isArray(items)) return;

  container.innerHTML = items
    .map((item) => {
      const product = item.product || item.product_data || item || {};
      const qty = item.quantity || item.qty || item.quantity || 1;
      const priceLabel = item.unit_price || item.price || product.price || null;
      const subtotalLabel =
        item.subtotal || item.line_total || item.total || null; // must be provided by backend
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = product.image_url
        ? String(product.image_url).replace(/^http:/, "https:")
        : product.image
          ? `${backendBase}/storage/${product.image}`
          : "https://placehold.co/400x400?text=No+Image";

      return `
        <div class="py-4 flex gap-4 border-b last:border-0 checkout-item" data-product-id="${product.id}" data-item-id="${item.id}">
            <div class="w-16 h-16 border rounded-sm p-1">
                <img src="${imageUrl}" class="h-full w-full object-contain" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=No+Image'">
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 line-clamp-1">${product.name || product.title || "Unavailable"}</h4>
                    <div class="text-[10px] text-slate-400 font-bold uppercase mt-1">${priceLabel ? `₹${Number(priceLabel).toLocaleString()}` : "Price Unavailable"}</div>
                  </div>
                  <div class="text-right">
                    <div class="flex items-center gap-2">
                      <button class="qty-btn minus px-2 py-1 text-slate-400 border" data-product-id="${product.id}" data-item-id="${item.id}">-</button>
                      <input class="qty-input w-10 text-center" data-product-id="${product.id}" data-item-id="${item.id}" value="${qty}" readonly>
                      <button class="qty-btn plus px-2 py-1 text-slate-400 border" data-product-id="${product.id}" data-item-id="${item.id}">+</button>
                    </div>
                    <div class="text-sm font-black mt-2">Subtotal: <span class="item-subtotal">${subtotalLabel ? `₹${Number(subtotalLabel).toLocaleString()}` : "—"}</span></div>
                  </div>
                </div>
            </div>
        </div>
      `;
    })
    .join("");

  // Attach qty handlers: call /cart/update and then re-fetch cart once
  container.querySelectorAll(".qty-btn.plus").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const pid = btn.dataset.productId;
      const itemId = btn.dataset.itemId;
      const input = container.querySelector(
        `.qty-input[data-item-id="${itemId}"]`,
      );
      const current = Number(input?.value || 1);
      const newQty = current + 1;
      btn.disabled = true;
      try {
        const payload = { product_id: pid, quantity: newQty };
        if (itemId) payload.item_id = itemId;
        const res = await apiCall("/cart/update", {
          method: "POST",
          body: JSON.stringify(payload),
          requireAuth: true,
        });
        if (res && res.success !== false) {
          await fetchCartOnce();
        } else {
          if (window.showToast)
            window.showToast(res?.message || "Failed to update cart", "error");
        }
      } catch (err) {
        console.error("Qty update failed", err);
      } finally {
        btn.disabled = false;
      }
    });
  });

  container.querySelectorAll(".qty-btn.minus").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const pid = btn.dataset.productId;
      const itemId = btn.dataset.itemId;
      const input = container.querySelector(
        `.qty-input[data-item-id="${itemId}"]`,
      );
      const current = Number(input?.value || 1);
      const newQty = Math.max(1, current - 1);
      btn.disabled = true;
      try {
        const payload = { product_id: pid, quantity: newQty };
        if (itemId) payload.item_id = itemId;
        const res = await apiCall("/cart/update", {
          method: "POST",
          body: JSON.stringify(payload),
          requireAuth: true,
        });
        if (res && res.success !== false) {
          await fetchCartOnce();
        } else {
          if (window.showToast)
            window.showToast(res?.message || "Failed to update cart", "error");
        }
      } catch (err) {
        console.error("Qty update failed", err);
      } finally {
        btn.disabled = false;
      }
    });
  });

  // Attach remove handlers
  container.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const pid = btn.dataset.productId;
      const itemId = btn.dataset.itemId;
      if (!confirm("Are you sure you want to remove this item?")) return;
      btn.disabled = true;
      try {
        const payload = {};
        if (pid) payload.product_id = pid;
        if (itemId) payload.item_id = itemId;
        const res = await apiCall("/cart/remove", {
          method: "POST",
          body: JSON.stringify(payload),
          requireAuth: true,
        });
        if (res && res.success !== false) {
          if (window.showToast) window.showToast("Item removed");
          await fetchCartOnce();
          await import("./main.js").then((m) => m.updateCartBadge());
        } else {
          if (window.showToast)
            window.showToast(res?.message || "Failed to remove item", "error");
          btn.disabled = false;
        }
      } catch (err) {
        console.error("Remove failed", err);
        btn.disabled = false;
      }
    });
  });
}

function setupEventListeners() {
  // Address Form
  document.getElementById("address-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    savedAddress = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      pincode: document.getElementById("pincode").value,
      locality: document.getElementById("locality").value,
      address: document.getElementById("address").value,
      city: document.getElementById("city").value,
      state: document.getElementById("state").value,
    };

    // Persist address inside checkout_data for payment page
    try {
      const raw = localStorage.getItem(CHECKOUT_KEY);
      const checkout = raw ? JSON.parse(raw) : {};
      checkout.address = savedAddress;
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
    } catch (e) {}

    // Move to next step
    document.getElementById("step-address")?.classList.add("step-inactive");
    document.getElementById("step-summary")?.classList.remove("step-inactive");
    if (window.showToast) window.showToast("Address Locked");
  });

  // Summary Confirmation
  document
    .getElementById("confirm-summary-btn")
    ?.addEventListener("click", () => {
      console.log("[Checkout] Continue button clicked");
      
      // Ensure checkout_data contains address and items
      const raw = localStorage.getItem(CHECKOUT_KEY);
      console.log("[Checkout] Checkout data from localStorage:", raw ? "exists" : "missing");
      
      if (!raw) {
        console.error("[Checkout] No checkout_data in localStorage!");
        if (window.showToast)
          window.showToast("Checkout data missing", "error");
        return;
      }
      
      try {
        const checkout = JSON.parse(raw);
        console.log("[Checkout] Parsed checkout data:", checkout);
        console.log("[Checkout] Items count:", checkout.items?.length || 0);
        console.log("[Checkout] Has address:", !!checkout.address);
        
        if (!checkout.items || checkout.items.length === 0) {
          console.error("[Checkout] No items in checkout data!");
          if (window.showToast) window.showToast("No items selected", "error");
          return;
        }
        
        if (!checkout.address) {
          console.error("[Checkout] No address in checkout data!");
          if (window.showToast)
            window.showToast("Please provide delivery address", "error");
          return;
        }
        
        // All checks passed, proceed to payment
        console.log("[Checkout] All validations passed, redirecting to payment...");
        window.location.href = "/payment.html";
      } catch (e) {
        console.error("[Checkout] Failed to parse checkout data:", e);
        if (window.showToast)
          window.showToast("Invalid checkout data", "error");
      }
    });

  // Complete Order
  // complete-order handled on payment page; no-op here
}

async function completeOrder() {
  const btn = document.getElementById("complete-order-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Transmitting Order...";
  }

  try {
    const data = await apiCall("/orders", {
      method: "POST",
      body: JSON.stringify({
        address: savedAddress,
        payment_method: "cod",
      }),
      requireAuth: true,
    });

    if (data && (data.order || data.success)) {
      if (window.showToast) window.showToast("Order Successful!");
      const orderId = data.order?.order_number || data.order?.id || "SUCCESS";
      setTimeout(() => {
        window.location.href = `/checkout-success.html?order_id=${orderId}`;
      }, 1500);
    } else {
      if (window.showToast)
        window.showToast(data?.message || "Order failed", "error");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "CONFIRM ORDER";
      }
    }
  } catch (e) {
    console.error("Order completion failed", e);
    if (window.showToast) window.showToast("Server error", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "CONFIRM ORDER";
    }
  }
}

document.addEventListener("DOMContentLoaded", initCheckout);
