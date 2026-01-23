import CONFIG from "./config.js";
import { getAuthToken, apiCall } from "./main.js";

async function initOrderDetails() {
  const token = getAuthToken();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!token || !orderId) {
    window.location.href = "/orders.html";
    return;
  }

  await fetchOrderDetail(orderId);
}

async function fetchOrderDetail(id) {
  try {
    const data = await apiCall(`/orders/${id}`);
    if (data && data.order) {
      renderDetails(data.order);
    } else {
      console.error("Order data not found");
      if (window.showToast) window.showToast("Order not found", "error");
    }
  } catch (e) {
    console.error("Failed to fetch order detail", e);
    if (window.showToast)
      window.showToast("Signal lost while retrieving order", "error");
  }
}

function renderDetails(order) {
  if (!order) return;

  if (document.getElementById("display-order-id"))
    document.getElementById("display-order-id").innerText =
      `#ORD-${order.order_number || order.id}`;
  if (document.getElementById("display-order-date"))
    document.getElementById("display-order-date").innerText = new Date(
      order.created_at,
    ).toLocaleString();
  if (document.getElementById("total-amount"))
    document.getElementById("total-amount").innerText =
      `₹${Number(order.total_amount || 0).toLocaleString()}`;
  if (document.getElementById("payment-method"))
    document.getElementById("payment-method").innerText =
      order.payment_method || "N/A";
  if (document.getElementById("order-status-text"))
    document.getElementById("order-status-text").innerText =
      `Current status: ${order.status || "PENDING"}`;

  // Address
  const addr = order.address || {};
  const addrEl = document.getElementById("delivery-address");
  if (addrEl) {
    addrEl.innerHTML = `
            <p class="text-sm font-bold text-slate-800">${addr.name || "N/A"}</p>
            <p class="text-xs text-slate-500 font-medium">${addr.address || ""}, ${addr.locality || ""}</p>
            <p class="text-xs text-slate-500 font-medium">${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || ""}</p>
            <p class="text-xs font-bold text-slate-700 mt-2">Phone: ${addr.phone || "N/A"}</p>
        `;
  }

  // Tracker logic
  const fill = document.getElementById("progress-bar-fill");
  const stepShipped = document.getElementById("step-shipped");
  const stepDelivered = document.getElementById("step-delivered");
  const downloadBtn = document.getElementById("download-invoice-btn");

  const status = (order.status || "").toLowerCase();
  if (fill) {
    if (status === "shipped") {
      fill.style.width = "50%";
      if (stepShipped)
        stepShipped.classList.replace("bg-slate-200", "bg-green-500");
    } else if (status === "delivered") {
      fill.style.width = "100%";
      if (stepShipped)
        stepShipped.classList.replace("bg-slate-200", "bg-green-500");
      if (stepDelivered)
        stepDelivered.classList.replace("bg-slate-200", "bg-green-500");
      if (downloadBtn) downloadBtn.classList.remove("hidden");
    }
  }

  // Items
  const itemsContainer = document.getElementById("order-items-list");
  if (itemsContainer && Array.isArray(order.items)) {
    itemsContainer.innerHTML = order.items
      .map((item) => {
        const product = item.product || {};
        const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
        const imageUrl = product.image_url
          ? product.image_url.replace(/^http:/, "https:")
          : product.image
            ? `${backendBase}/storage/${product.image}`
            : "https://placehold.co/400x400?text=No+Image";

        return `
            <div class="p-6 flex gap-6 hover:bg-slate-50 transition-colors">
                <div class="w-20 h-20 border rounded-sm p-2 flex-shrink-0 bg-white">
                    <img src="${imageUrl}" class="h-full w-full object-contain">
                </div>
                <div class="flex-grow">
                    <h4 class="text-sm font-bold text-slate-800">${product.name || "Unavailable"}</h4>
                    <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Quantity: ${item.quantity}</p>
                    <div class="flex items-center gap-3 mt-4">
                        <span class="text-base font-black text-slate-900">₹${Number((item.price || 0) * item.quantity).toLocaleString()}</span>
                        <span class="text-[10px] text-green-600 font-bold">Replacement Policy Available</span>
                    </div>
                </div>
                <div class="hidden md:block">
                     <button class="text-xs font-black uppercase tracking-widest text-[#2874f0] hover:underline">Rate & Review</button>
                </div>
            </div>
        `;
      })
      .join("");
  }

  // Invoice listener
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      // Enforce HTTPS for invoice URL
      const invoiceUrl =
        `${CONFIG.API_BASE_URL}/orders/${order.id}/invoice?token=${getAuthToken()}`.replace(
          /^http:/,
          "https:",
        );
      window.open(invoiceUrl, "_blank");
    });
  }
}

document.addEventListener("DOMContentLoaded", initOrderDetails);
