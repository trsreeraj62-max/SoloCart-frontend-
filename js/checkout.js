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
    const data = await apiCall("/cart");
    cartData = data;

    if (!cartData || !cartData.items || cartData.items.length === 0) {
      window.location.href = "/cart.html";
      return;
    }

    renderPriceDetails(cartData);
    renderOrderSummary(cartData.items);
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

  container.innerHTML = items
    .map((item) => {
      const product = item.product || {};
      const imageUrl = product.image_url
        ? product.image_url.replace(/^http:/, "https:")
        : product.image
          ? `${CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "")}/storage/${product.image}`
          : "https://placehold.co/400x400?text=No+Image";

      return `
        <div class="py-4 flex gap-4 border-b last:border-0">
            <div class="w-16 h-16 border rounded-sm p-1">
                <img src="${imageUrl}" class="h-full w-full object-contain">
            </div>
            <div>
                <h4 class="text-xs font-bold text-slate-800 line-clamp-1">${product.name || "Unavailable"}</h4>
                <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Qty: ${item.quantity}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-sm font-black text-slate-900">₹${Number((product.price || 0) * item.quantity).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
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

    // Move to next step
    document.getElementById("step-address")?.classList.add("step-inactive");
    document.getElementById("step-summary")?.classList.remove("step-inactive");
    if (window.showToast) window.showToast("Address Locked");
  });

  // Summary Confirmation
  document
    .getElementById("confirm-summary-btn")
    ?.addEventListener("click", () => {
      document.getElementById("step-summary")?.classList.add("step-inactive");
      document
        .getElementById("step-payment")
        ?.classList.remove("step-inactive");
    });

  // Complete Order
  document
    .getElementById("complete-order-btn")
    ?.addEventListener("click", completeOrder);
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
