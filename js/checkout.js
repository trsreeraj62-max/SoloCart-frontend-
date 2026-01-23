import CONFIG from "./config.js";
import { getAuthToken, apiCall, safeJSONParse } from "./main.js";

let cartData = null;
let savedAddress = null;

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

  await fetchCartData();
  setupEventListeners();
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
    const rawSel = sessionStorage.getItem("checkout_selection");
    let selection = null;
    try {
      selection = rawSel ? JSON.parse(rawSel) : null;
    } catch (e) {
      selection = null;
    }

    if (selection && selection.type === "single" && selection.product_id) {
      items = items.filter((it) => {
        const product = it.product || it.product_data || it;
        return (
          String(product.id) === String(selection.product_id) ||
          String(it.product_id) === String(selection.product_id)
        );
      });
    }

    if (!items || items.length === 0) {
      window.location.href = "/cart.html";
      return;
    }

    renderPriceDetails({
      total_price: data.total_price || data.cart?.total_price || null,
      total_mrp: data.total_mrp || data.cart?.total_mrp || null,
      items,
    });
    renderOrderSummary(items);
  } catch (e) {
    console.error("Failed to fetch cart data", e);
  }
}

function renderPriceDetails(data) {
  const countEl = document.getElementById("price-details-count");
  const mrpEl = document.getElementById("total-mrp");
  const discEl = document.getElementById("total-discount");
  const grandEl = document.getElementById("grand-total");

  if (countEl) countEl.innerText = data.items.length;
  if (mrpEl)
    mrpEl.innerText = `₹${Number(data.total_mrp || 0).toLocaleString()}`;
  if (discEl)
    discEl.innerText = `- ₹${Number((data.total_mrp || 0) - (data.total_price || 0)).toLocaleString()}`;
  if (grandEl)
    grandEl.innerText = `₹${Number(data.total_price || 0).toLocaleString()}`;
}

function renderOrderSummary(items) {
  const container = document.getElementById("checkout-items-list");
  if (!container || !Array.isArray(items)) return;
  // Render with editable qty controls
  container.innerHTML = items
    .map((item) => {
      const product = item.product || item.product_data || item;
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(product.price || product.unit_price || 0);
      const subtotal = price * qty;
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
                    <div class="text-[10px] text-slate-400 font-bold uppercase mt-1">₹${price.toLocaleString()}</div>
                  </div>
                  <div class="text-right">
                    <div class="flex items-center gap-2">
                      <button class="qty-btn minus px-2 py-1 text-slate-400 border" data-product-id="${product.id}" data-item-id="${item.id}">-</button>
                      <input class="qty-input w-10 text-center" data-product-id="${product.id}" data-item-id="${item.id}" value="${qty}" readonly>
                      <button class="qty-btn plus px-2 py-1 text-slate-400 border" data-product-id="${product.id}" data-item-id="${item.id}">+</button>
                    </div>
                    <div class="text-sm font-black mt-2">Subtotal: ₹<span class="item-subtotal">${subtotal.toLocaleString()}</span></div>
                  </div>
                </div>
            </div>
        </div>
      `;
    })
    .join("");

  // Attach qty handlers (send product_id + quantity)
  container.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const pid = btn.dataset.productId;
      const itemId = btn.dataset.itemId;
      const isPlus = btn.classList.contains("plus");
      const input = container.querySelector(
        `.qty-input[data-product-id="${pid}"]`,
      );
      const current = Number(input?.value || 1);
      const newQty = isPlus ? current + 1 : Math.max(1, current - 1);
      try {
        const payload = { product_id: pid, quantity: newQty };
        if (itemId) payload.item_id = itemId;
        await apiCall("/cart/update", {
          method: "POST",
          body: JSON.stringify(payload),
          requireAuth: true,
        });
        await fetchCartData();
      } catch (err) {
        console.error("Failed to update quantity", err);
      }
    });
  });

  // Attach buy-this handlers
  container.querySelectorAll(".buy-this-btn").forEach((b) => {
    b.addEventListener("click", (e) => {
      const pid = b.dataset.productId || b.dataset.productid || b.dataset.id;
      sessionStorage.setItem(
        "checkout_selection",
        JSON.stringify({ type: "single", product_id: pid }),
      );
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

    // Persist address for payment page
    try {
      sessionStorage.setItem("checkout_address", JSON.stringify(savedAddress));
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
      // Move to payment page; payment selection happens there.
      const selRaw = sessionStorage.getItem("checkout_selection");
      if (!selRaw) {
        // default to all
        sessionStorage.setItem(
          "checkout_selection",
          JSON.stringify({ type: "all", product_id: null }),
        );
      }
      window.location.href = "/payment.html";
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
