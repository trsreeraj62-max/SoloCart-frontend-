import CONFIG from "./config.js";
import { getAuthToken, apiCall, safeJSONParse } from "./main.js";

async function initPayment() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const addrRaw = sessionStorage.getItem("checkout_address");
  const address = addrRaw ? safeJSONParse(addrRaw, null) : null;
  if (address) {
    document.getElementById("payment-address").innerText =
      `${address.name}, ${address.address}, ${address.city} - ${address.pincode}`;
  }

  const selRaw = sessionStorage.getItem("checkout_selection");
  let selection = selRaw
    ? safeJSONParse(selRaw, { type: "all" })
    : { type: "all" };

  // Fetch cart and filter if single
  const data = await apiCall("/cart", { requireAuth: true });
  let items = [];
  if (!data) items = [];
  else if (Array.isArray(data)) items = data;
  else if (Array.isArray(data.items)) items = data.items;
  else if (data.data && Array.isArray(data.data.items)) items = data.data.items;
  else if (data.cart && Array.isArray(data.cart.items)) items = data.cart.items;
  else if (Array.isArray(data.data)) items = data.data;
  else items = data.items || data.data || [];

  if (selection && selection.type === "single" && selection.product_id) {
    items = items.filter((it) => {
      const product = it.product || it.product_data || it;
      return (
        String(product.id) === String(selection.product_id) ||
        String(it.product_id) === String(selection.product_id)
      );
    });
  }

  renderOrder(items);

  document.getElementById("pay-now-btn").addEventListener("click", async () => {
    const methodEl = document.querySelector(
      'input[name="payment_method"]:checked',
    );
    const payment_method = methodEl ? methodEl.value : "cod";

    try {
      const resp = await apiCall("/orders", {
        method: "POST",
        body: JSON.stringify({ address: address, payment_method }),
        requireAuth: true,
      });

      if (resp && (resp.order || resp.success)) {
        if (window.showToast) window.showToast("Order Successful!");
        const orderId = resp.order?.order_number || resp.order?.id || "SUCCESS";
        setTimeout(() => {
          window.location.href = `/checkout-success.html?order_id=${orderId}`;
        }, 900);
      } else {
        if (window.showToast)
          window.showToast(resp?.message || "Order failed", "error");
      }
    } catch (e) {
      console.error("Payment/order failed", e);
      if (window.showToast) window.showToast("Server error", "error");
    }
  });
}

function renderOrder(items) {
  const container = document.getElementById("payment-order-list");
  const totalEl = document.getElementById("payment-total-amount");
  if (!container) return;

  let total = 0;
  container.innerHTML = items
    .map((it) => {
      const product = it.product || it.product_data || it;
      const qty = Number(it.quantity || it.qty || 1);
      const price = Number(product.price || product.unit_price || 0);
      total += price * qty;
      return `<div class="flex items-center gap-4 py-3 border-b"><div class="flex-1"><div class="font-bold">${product.name || product.title || "Unavailable"}</div><div class="text-sm text-slate-500">Qty: ${qty}</div></div><div class="font-black">₹${(price * qty).toLocaleString()}</div></div>`;
    })
    .join("");

  if (totalEl) totalEl.innerText = `₹${Number(total).toLocaleString()}`;
}

document.addEventListener("DOMContentLoaded", initPayment);
