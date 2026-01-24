import CONFIG from "./config.js";
import { getAuthToken, apiCall, safeJSONParse } from "./main.js";

const CHECKOUT_KEY = "checkout_data";

async function initPayment() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const raw = localStorage.getItem(CHECKOUT_KEY);
  if (!raw) {
    window.location.href = "/cart.html";
    return;
  }

  let checkout = null;
  try {
    checkout = JSON.parse(raw);
  } catch (e) {
    checkout = null;
  }

  if (
    !checkout ||
    !Array.isArray(checkout.items) ||
    checkout.items.length === 0
  ) {
    window.location.href = "/cart.html";
    return;
  }

  // Render address if present
  if (checkout.address) {
    document.getElementById("payment-address").innerText =
      `${checkout.address.name}, ${checkout.address.address}, ${checkout.address.city} - ${checkout.address.pincode}`;
  }

  // Render order list
  renderOrder(checkout.items);

  // Payment method toggles
  document.querySelectorAll('input[name="payment_method"]').forEach((r) => {
    r.addEventListener("change", () => onPaymentMethodChange(r.value));
  });
  onPaymentMethodChange(
    document.querySelector('input[name="payment_method"]:checked')?.value ||
      "cod",
  );

  const payBtn = document.getElementById("pay-now-btn");
  payBtn.addEventListener("click", async () => {
    if (payBtn.disabled) return;
    payBtn.disabled = true;
    const origText = payBtn.innerHTML;
    payBtn.innerHTML =
      '<i class="fa fa-spinner fa-spin mr-2"></i>Processing...';

    const methodEl = document.querySelector(
      'input[name="payment_method"]:checked',
    );
    const payment_method = methodEl ? methodEl.value : "cod";

    // Validate inputs based on method
    const valid = validatePaymentMethod(payment_method);
    if (!valid) {
      payBtn.disabled = false;
      payBtn.innerHTML = origText;
      return;
    }

    // Build order payload from checkout_data
    try {
      const payload = {
        items: checkout.items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
        })),
        address: checkout.address || null,
        payment_method,
        payment_details: collectPaymentDetails(payment_method),
      };

      const resp = await apiCall("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
        requireAuth: true,
      });

      if (resp && (resp.order || resp.success)) {
        if (window.showToast) window.showToast("Order Successful!");
        const orderId = resp.order?.order_number || resp.order?.id || "SUCCESS";
        // clear checkout_data and buy-now keys
        localStorage.removeItem(CHECKOUT_KEY);
        localStorage.removeItem("buy_now_item");
        localStorage.removeItem("checkout_type");
        setTimeout(() => {
          window.location.href = `/checkout-success.html?order_id=${orderId}`;
        }, 900);
      } else {
        if (window.showToast)
          window.showToast(resp?.message || "Order failed", "error");
        payBtn.disabled = false;
        payBtn.innerHTML = origText;
      }
    } catch (e) {
      console.error("Payment/order failed", e);
      if (window.showToast) window.showToast("Server error", "error");
      payBtn.disabled = false;
      payBtn.innerHTML = origText;
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
      const productName =
        it.name ||
        (it.product && (it.product.name || it.product.title)) ||
        "Unavailable";
      const qty = Number(it.quantity || it.qty || 1);
      const price = Number(
        it.price || (it.product && (it.product.price || 0)) || 0,
      );
      total += price * qty;
      // Product image
      let imageUrl =
        it.image ||
        (it.product && (it.product.image_url || it.product.image)) ||
        "https://placehold.co/80x80?text=No+Image";
      if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
        imageUrl = imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl;
      }
      return `<div class="flex items-center gap-4 py-3 border-b">
      <img src="${imageUrl}" class="w-16 h-16 object-cover rounded border" onerror="this.onerror=null;this.src='https://placehold.co/80x80?text=No+Image'">
      <div class="flex-1">
        <div class="font-bold text-base mb-1">${escapeHtml(productName)}</div>
        <div class="text-xs text-slate-500 mb-1">Qty: <span class="font-bold">${qty}</span></div>
        <div class="text-xs text-green-600 font-bold">In Stock</div>
      </div>
      <div class="font-black text-lg">₹${(price * qty).toLocaleString()}</div>
    </div>`;
    })
    .join("");

  if (totalEl) totalEl.innerText = `₹${Number(total).toLocaleString()}`;
}

function onPaymentMethodChange(value) {
  document
    .getElementById("upi-fields")
    .classList.toggle("hidden", value !== "upi");
  document
    .getElementById("card-fields")
    .classList.toggle("hidden", value !== "card");
  document
    .getElementById("netbank-fields")
    .classList.toggle("hidden", value !== "netbanking");
}

function validatePaymentMethod(method) {
  if (method === "upi") {
    const upi = document.getElementById("upi-id").value.trim();
    if (!upi) {
      window.showToast && window.showToast("Please enter UPI ID", "error");
      return false;
    }
  }
  if (method === "card") {
    const num = document
      .getElementById("card-number")
      .value.replace(/\s+/g, "");
    const exp = document.getElementById("card-expiry").value.trim();
    const cvv = document.getElementById("card-cvv").value.trim();
    if (!/^\d{15,19}$/.test(num)) {
      window.showToast && window.showToast("Invalid card number", "error");
      return false;
    }
    if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(exp)) {
      window.showToast && window.showToast("Invalid expiry (MM/YY)", "error");
      return false;
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      window.showToast && window.showToast("Invalid CVV", "error");
      return false;
    }
  }
  if (method === "netbanking") {
    const bank = document.getElementById("netbank-select").value;
    if (!bank) {
      window.showToast && window.showToast("Please select a bank", "error");
      return false;
    }
  }
  return true;
}

function collectPaymentDetails(method) {
  if (method === "upi")
    return { upi_id: document.getElementById("upi-id").value.trim() };
  if (method === "card")
    return {
      number: document.getElementById("card-number").value.replace(/\s+/g, ""),
      expiry: document.getElementById("card-expiry").value.trim(),
      cvv: document.getElementById("card-cvv").value.trim(),
    };
  if (method === "netbanking")
    return { bank: document.getElementById("netbank-select").value };
  return {};
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

document.addEventListener("DOMContentLoaded", initPayment);
// Card input auto-formatting
document.addEventListener("DOMContentLoaded", () => {
  const cardInput = document.getElementById("card-number");
  if (cardInput) {
    cardInput.addEventListener("input", (e) => {
      let val = cardInput.value.replace(/\D/g, "").slice(0, 16);
      let formatted = val.replace(/(.{4})/g, "$1 ").trim();
      cardInput.value = formatted;
    });
  }
});
