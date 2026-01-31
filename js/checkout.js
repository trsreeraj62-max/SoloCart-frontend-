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
  
  // Auto-fill address form
  autoFillUserData(userData);

  // Detect buy now vs cart checkout
  const params = new URLSearchParams(window.location.search);
  const isBuyNow = params.get("type") === "buy_now" || localStorage.getItem("checkout_type") === "buy_now";

  // If navigating normally (e.g. from Cart), clear buy_now_item to prevent stale single-product checkout
  if (!isBuyNow) {
      localStorage.removeItem("buy_now_item");
      localStorage.removeItem("checkout_type");
  }

  if (isBuyNow) {
    if(!localStorage.getItem("buy_now_item")) {
        // Fallback if flag is set but item missing
        localStorage.removeItem("checkout_type");
        await fetchCartOnce();
    } else {
        renderBuyNow();
    }
  } else {
    await fetchCartOnce();
  }
  setupEventListeners();
}

// Auto-fill form from user profile or saved address
function autoFillUserData(userData) {
  if (!userData) return;
  console.log("[Checkout] Auto-filling user data:", userData);
  
  const setIfEmpty = (id, val) => {
    const el = document.getElementById(id);
    if(el && !el.value && val) el.value = val;
  };

  setIfEmpty("name", userData.name || "");
  setIfEmpty("email", userData.email || "");
  setIfEmpty("phone", userData.phone || "");
  
  // Try to parse address if stored as object or string
  if (userData.address) {
      if (typeof userData.address === 'string') {
           setIfEmpty("address", userData.address);
      } else {
           setIfEmpty("address", userData.address.address || "");
           // setIfEmpty("locality", userData.address.locality || "");
           setIfEmpty("city", userData.address.city || "");
           setIfEmpty("state", userData.address.state || "");
           setIfEmpty("pincode", userData.address.pincode || "");
      }
  }
}

function renderBuyNow() {
  const rawItem = localStorage.getItem("buy_now_item");
  if (!rawItem) {
      window.location.href = "/cart.html";
      return;
  }
  const item = JSON.parse(rawItem);
  console.log("[Checkout] Rendering Buy Now Item");
  
  // PERSIST TO CHECKOUT DATA (New Logic)
  try {
      const raw = localStorage.getItem(CHECKOUT_KEY);
      const checkout = raw ? JSON.parse(raw) : {};
      checkout.items = [item];
      checkout.type = 'buy_now';
      checkout.total_price = item.price * item.quantity;
      localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
  } catch (e) {
      console.error("Failed to save buy_now item to checkout data", e);
  }

  const container = document.getElementById("checkout-items-list");
  if (container) {
      container.innerHTML = `
        <div class="py-4 flex gap-4 border-b last:border-0 checkout-item">
          <div class="w-16 h-16 border rounded-sm p-1">
            <img src="${item.image || "https://placehold.co/400x400?text=No+Image"}" class="h-full w-full object-cover">
          </div>
          <div class="flex-grow">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-xs font-bold text-slate-800 line-clamp-1">${item.name}</h4>
                <div class="text-[10px] text-slate-400 font-bold uppercase mt-1">₹${Number(item.price).toLocaleString()}</div>
              </div>
              <div class="text-right">
                <div class="text-sm font-black mt-2">Subtotal: <span class="item-subtotal">₹${Number(item.price * item.quantity).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      `;
  }
  
  // Calculate specific totals for Buy Now
  const total = item.price * item.quantity;
  // Assume generic 25% markup for MRP display if not provided
  const mrp = item.mrp || (total * 1.25);
  const discount = mrp - total;
  
  const countEl = document.getElementById("price-details-count");
  const mrpEl = document.getElementById("total-mrp");
  const discEl = document.getElementById("total-discount");
  const grandEl = document.getElementById("grand-total");
  const savingsEl = document.getElementById("savings-amount");

  if (countEl) countEl.innerText = 1;
  if (mrpEl) mrpEl.innerText = `₹${Number(mrp).toLocaleString()}`;
  if (discEl) {
      if (discount > 0) {
        discEl.innerText = `- ₹${Number(discount).toLocaleString()}`;
        discEl.parentElement.classList.remove("hidden");
      } else {
        discEl.innerText = "₹0";
        discEl.parentElement.classList.add("hidden");
      }
  }
  if (grandEl) grandEl.innerText = `₹${Number(total).toLocaleString()}`;
  if (savingsEl) {
      if (discount > 0) {
        savingsEl.innerText = `You Save: ₹${Number(discount).toLocaleString()}`;
        savingsEl.parentElement.classList.remove("hidden");
      } else {
        savingsEl.parentElement.classList.add("hidden");
      }
  }
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

    // Extract items array from common shapes
    let items = [];
    if (data.items && Array.isArray(data.items)) items = data.items;
    else if (data.data && Array.isArray(data.data.items)) items = data.data.items;
    else if (Array.isArray(data)) items = data;
    else if (data.cart && Array.isArray(data.cart.items)) items = data.cart.items;
    else items = [];

    console.log("[Checkout] Extracted items:", items.length, "items");

    // If no items, redirect to cart page
    if (!items || items.length === 0) {
      console.warn("[Checkout] No items in cart, redirecting...");
      window.location.href = "/cart.html";
      return;
    }

    // PERSIST TO CHECKOUT DATA (New Logic)
    try {
        const raw = localStorage.getItem(CHECKOUT_KEY);
        const checkout = raw ? JSON.parse(raw) : {};
        checkout.items = items;
        checkout.type = 'cart';
        
        // Capture totals
        const summary = data.summary || {};
        checkout.total_price = data.total_price || summary.total_price || summary.grand_total || 0;
        
        localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
    } catch (e) {
        console.error("Failed to save cart items to checkout data", e);
    }

    renderCartItems(items);
    renderPriceDetails(data);
    
    console.log("[Checkout] Cart rendering complete");
  } catch (err) {
    console.error("Failed to fetch cart once", err);
    if (window.showToast) window.showToast("Failed to load cart", "error");
  } finally {
    _fetchInFlight = false;
  }
}

function renderPriceDetails(data) {
  // Render totals only from backend response keys.
  // The backend now returns { total_items, total_mrp, total_price, total_discount } at root or in summary.
  const summary = data.summary || {};
  
  const totalItems = data.total_items || summary.total_items || (data.items ? data.items.length : 0);
  const totalMrp = data.total_mrp || summary.total_mrp || 0;
  const totalPrice = data.total_price || summary.total_price || summary.grand_total || 0;
  const discount = data.total_discount || summary.total_discount || (totalMrp - totalPrice);
  const shipping = summary.shipping || 0;

  const countEl = document.getElementById("price-details-count");
  const mrpEl = document.getElementById("total-mrp");
  const discEl = document.getElementById("total-discount");
  const grandEl = document.getElementById("grand-total");
  const deliveryChargesEl = document.getElementById("delivery-charges");

  if (countEl) countEl.innerText = totalItems;
  if (mrpEl) mrpEl.innerText = `₹${Number(totalMrp).toLocaleString()}`;
  
  if (discEl) {
    if (discount > 0) {
      discEl.innerText = `- ₹${Number(discount).toLocaleString()}`;
      discEl.parentElement.classList.remove("hidden");
    } else {
      discEl.innerText = "₹0";
      discEl.parentElement.classList.add("hidden");
    }
  }
  
  // Delivery Charges Logic
  if (deliveryChargesEl) {
      if (shipping === 0) {
          deliveryChargesEl.innerHTML = '<span class="text-green-600">Free</span>';
      } else {
          deliveryChargesEl.innerText = `₹${Number(shipping).toLocaleString()}`;
      }
  }
  
  if (grandEl)
    grandEl.innerText = `₹${Number(totalPrice).toLocaleString()}`;
    
  const savingsEl = document.getElementById("savings-amount");
  if (savingsEl) {
      if (discount > 0) {
          savingsEl.innerText = `You Save: ₹${Number(discount).toLocaleString()}`;
          savingsEl.parentElement.classList.remove("hidden");
      } else {
          savingsEl.parentElement.classList.add("hidden");
      }
  }
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
      // Locality removed
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
      
      // Attempt recovery if items missing
      let raw = localStorage.getItem(CHECKOUT_KEY);
      let checkout = raw ? JSON.parse(raw) : {};

      if (!checkout.items || checkout.items.length === 0) {
          console.warn("[Checkout] Items missing in persistence, attempting recovery...");
          const buyNowRaw = localStorage.getItem("buy_now_item");
          if (buyNowRaw) {
              const item = JSON.parse(buyNowRaw);
              checkout.items = [item];
              checkout.type = 'buy_now';
              checkout.total_price = item.price * item.quantity;
              localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
          } else if (cartData) {
               let items = [];
               if (cartData.items && Array.isArray(cartData.items)) items = cartData.items;
               else if (cartData.data && Array.isArray(cartData.data.items)) items = cartData.data.items;
               else if (Array.isArray(cartData)) items = cartData;
               else if (cartData.cart && Array.isArray(cartData.cart.items)) items = cartData.cart.items;
               
               if (items.length > 0) {
                   checkout.items = items;
                   checkout.type = 'cart';
                   localStorage.setItem(CHECKOUT_KEY, JSON.stringify(checkout));
               }
          }
          // Refresh checkout obj
          raw = localStorage.getItem(CHECKOUT_KEY);
          checkout = raw ? JSON.parse(raw) : {};
      }

      console.log("[Checkout] Checkout data from localStorage:", raw ? "exists" : "missing");
      
      if (!raw) {
        console.error("[Checkout] No checkout_data in localStorage!");
        if (window.showToast)
          window.showToast("Checkout data missing", "error");
        return;
      }
      
      try {
        console.log("[Checkout] Parsed checkout data:", checkout);
        console.log("[Checkout] Items count:", checkout.items?.length || 0);
        console.log("[Checkout] Has address:", !!checkout.address);
        
        if (!checkout.items || checkout.items.length === 0) {
          console.error("[Checkout] No items in checkout data!");
          if (window.showToast) window.showToast("No items selected. Please go back to cart.", "error");
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
  const btn = document.getElementById("confirm-summary-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Placing Order...";
  }

  try {
    const raw = localStorage.getItem(CHECKOUT_KEY);
    const checkout = raw ? JSON.parse(raw) : {};
    const isBuyNow = checkout.type === 'buy_now';

    const payload = {
      full_name: savedAddress.name,
      phone: savedAddress.phone,
      pincode: savedAddress.pincode,
      address: savedAddress.address,
      city: savedAddress.city,
      state: savedAddress.state,
      payment_method: "cod",
    };

    let endpoint = "/checkout/cart";
    if (isBuyNow && checkout.items && checkout.items.length > 0) {
        endpoint = "/checkout/single";
        payload.product_id = checkout.items[0].product_id || checkout.items[0].id;
        payload.quantity = checkout.items[0].quantity || 1;
    } else {
        payload.items = (checkout.items || []).map(it => ({
            product_id: it.product_id || it.id,
            quantity: it.quantity || it.qty || 1
        }));
    }

    const data = await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
      requireAuth: true,
    });

    if (data && (data.order || data.success)) {
      if (window.showToast) window.showToast("Order Successful!");
      const orderId = data.order?.order_number || data.order?.id || data.data?.id || "SUCCESS";
      
      // Clear checkout data
      localStorage.removeItem(CHECKOUT_KEY);
      localStorage.removeItem("buy_now_item");
      localStorage.removeItem("checkout_type");

      setTimeout(() => {
        window.location.href = `/checkout-success.html?order_id=${orderId}`;
      }, 1500);
    } else {
      if (window.showToast)
        window.showToast(data?.message || "Order failed", "error");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "PLACE ORDER";
      }
    }
  } catch (e) {
    console.error("Order completion failed", e);
    if (window.showToast) window.showToast("Server error", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "PLACE ORDER";
    }
  }
}

document.addEventListener("DOMContentLoaded", initCheckout);
