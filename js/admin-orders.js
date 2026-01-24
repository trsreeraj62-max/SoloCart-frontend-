import CONFIG from "./config.js";
import { apiCall } from "./main.js";

let currentOrders = [];

async function initAdminOrders() {
  const token = localStorage.getItem("auth_token");
  const user = JSON.parse(localStorage.getItem("user_data") || "{}");
  if (
    !token ||
    !(
      user.role === "admin" ||
      user.role === "Admin" ||
      user.is_admin === true ||
      user.is_admin === 1
    )
  ) {
    window.location.href = "/login.html";
    return;
  }

  await fetchOrders();
  setupEventListeners();
}

async function fetchOrders() {
  const searchInput = document.getElementById("order-search");
  const search = searchInput ? searchInput.value.trim() : "";
  const endpoint = search
    ? `/admin/orders?search=${encodeURIComponent(search)}`
    : "/admin/orders";

  try {
    const res = await apiCall(endpoint);
    const orders =
      res.data && Array.isArray(res.data.data) ? res.data.data : [];
    currentOrders = orders;
    renderOrders(currentOrders);
  } catch (e) {
    console.error("Failed to load admin orders", e);
    if (window.showToast)
      window.showToast("Failed to load orders from server", "error");
    // No mock fallback
  }
}

function renderOrders(orders) {
  const table = document.getElementById("admin-orders-table");
  if (!table || !Array.isArray(orders)) return;
  // Build rows at product-item level so admin sees what was ordered
  const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
  const rows = [];
  orders.forEach((o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    if (items.length === 0) {
      // fallback single row when no items present
      const statusBadge = getStatusBadge(o.status);
      const actionButtons = buildActionButtons(o.id, o.status);
      rows.push(`
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-6 py-4 font-black italic text-[#2874f0]">#${o.order_number || o.id}</td>
          <td class="px-6 py-4">—</td>
          <td class="px-6 py-4"><img src="https://placehold.co/80x80?text=No+Image" class="w-12 h-12 object-contain"/></td>
          <td class="px-6 py-4">—</td>
          <td class="px-6 py-4">${statusBadge}</td>
          <td class="px-6 py-4 text-right">${actionButtons}</td>
        </tr>
      `);
    } else {
      items.forEach((item) => {
        const product = item.product || {};
        const productName = product.name || item.name || "Unnamed";
        const price = Number(item.price || product.price || 0).toLocaleString();
        const imageUrl = product.image_url
          ? String(product.image_url).replace(/^http:/, "https:")
          : product.image
            ? `${backendBase}/storage/${product.image}`
            : "https://placehold.co/80x80?text=No+Image";

        const statusBadge = getStatusBadge(o.status);
        const actionButtons = buildActionButtons(o.id, o.status);

        rows.push(`
          <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 font-black italic text-[#2874f0]">#${o.order_number || o.id}</td>
            <td class="px-6 py-4">${escapeHtml(productName)}</td>
            <td class="px-6 py-4"><img src="${imageUrl}" class="w-12 h-12 object-contain" onerror="this.src='https://placehold.co/80x80?text=No+Image'"/></td>
            <td class="px-6 py-4">₹${price}</td>
            <td class="px-6 py-4">${statusBadge}</td>
            <td class="px-6 py-4 text-right">${actionButtons}</td>
          </tr>
        `);
      });
    }
  });

  table.innerHTML = rows.join("");

  // Re-bind events with safe async handlers (disable while running)
  table.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", async (evt) => {
      evt.preventDefault();
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (!id || !action) return;
      if (!confirm(`Update order status to ${action}?`)) return;
      try {
        btn.disabled = true;
        const prev = btn.innerText;
        btn.innerText = "Working...";
        await updateStatus(id, action);
        btn.innerText = prev;
      } catch (err) {
        console.error(err);
      } finally {
        btn.disabled = false;
      }
    });
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStatusBadge(status) {
    const s = String(status || "").toLowerCase();
    if (s === "delivered")
      return `<span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-600">DELIVERED</span>`;
    if (s === "cancelled")
      return `<span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-rose-100 text-rose-600">CANCELLED</span>`;
    if (s === "shipped")
      return `<span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-purple-100 text-purple-600">SHIPPED</span>`;
    if (s === "approved" || s === "processing")
      return `<span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-600">APPROVED</span>`;
    if (s === "pending")
      return `<span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-orange-100 text-orange-600">PENDING</span>`;
    return `<span class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">${String(status || "-").toUpperCase()}</span>`;
  }

  function buildActionButtons(orderId, status) {
    const s = String(status || "").toLowerCase();
    const parts = [];
    if (s === "pending") {
      parts.push(
        `<button class="action-btn bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide mr-2" data-id="${orderId}" data-action="approved">Approve</button>`,
      );
      parts.push(
        `<button class="action-btn bg-rose-100 text-rose-600 hover:bg-rose-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide" data-id="${orderId}" data-action="cancelled">Cancel</button>`,
      );
    } else if (s === "approved" || s === "processing") {
      parts.push(
        `<button class="action-btn bg-purple-100 text-purple-600 hover:bg-purple-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide mr-2" data-id="${orderId}" data-action="shipped">Ship</button>`,
      );
      parts.push(
        `<button class="action-btn bg-rose-100 text-rose-600 hover:bg-rose-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide" data-id="${orderId}" data-action="cancelled">Cancel</button>`,
      );
    } else if (s === "shipped") {
      parts.push(
        `<button class="action-btn bg-green-100 text-green-600 hover:bg-green-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wide" data-id="${orderId}" data-action="delivered">Deliver</button>`,
      );
    } else {
      parts.push(
        `<span class="text-xs text-slate-400 font-medium italic">No actions</span>`,
      );
    }
    return parts.join("");
  }
}

async function updateStatus(id, status) {
  try {
    const res = await apiCall(`/admin/orders/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
      requireAuth: true,
    });

    // HTTP-level errors returned by apiCall
    if (res && res.statusCode === 401) {
      console.error("Unauthorized while updating order", res);
      try {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
      } catch (e) {}
      window.location.href = "/login.html";
      return;
    }

    if (res && res.statusCode === 422) {
      console.error("Validation errors:", res.raw || res);
      try {
        const parsed =
          typeof res.raw === "string" ? JSON.parse(res.raw) : res.raw;
        console.error(parsed.errors || parsed.message || parsed);
      } catch (err) {}
      if (window.showToast) window.showToast("Validation error", "error");
      return;
    }

    // Application-level success
    if (res && (res.success || res.order || (res.data && res.data.order))) {
      if (window.showToast) window.showToast(`Order updated to ${status}`);
      const order = currentOrders.find((o) => o.id == id);
      if (order) order.status = status;
      renderOrders(currentOrders);
      return;
    }

    // If backend returned structured errors
    if (res && res.errors) {
      console.error("Validation errors:", res.errors);
      if (window.showToast) window.showToast("Validation error", "error");
      return;
    }

    if (res && res.message) {
      console.error("Update failed:", res.message, res);
      if (window.showToast) window.showToast(res.message, "error");
      return;
    }

    console.error("Unknown response from status update", res);
    if (window.showToast) window.showToast("Failed to update status", "error");
  } catch (e) {
    console.error("Failed to update status", e);
    if (window.showToast)
      window.showToast("Network error while updating order", "error");
  }
}

function showOrderDetails(id) {
  const order = currentOrders.find((o) => o.id == id);
  if (!order) return;

  const numEl = document.getElementById("modal-order-number");
  if (numEl) numEl.innerText = `#${order.order_number || order.id}`;
  const content = document.getElementById("modal-content");
  if (!content) return;

  const addr = order.address || {};
  const items = order.items || [];

  content.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Customer Intel</h4>
                <div class="space-y-2">
                    <p class="text-sm font-bold">${order.user?.name || "Customer"}</p>
                    <p class="text-sm text-slate-600">${order.user?.email || "--"}</p>
                    <p class="text-sm text-slate-600">${addr.phone || "--"}</p>
                    <div class="p-4 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                         <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Delivery Vector</p>
                         <p class="text-xs italic text-slate-700">${addr.address || ""}, ${addr.locality || ""}, ${addr.city || ""}, ${addr.state || ""} - ${addr.pincode || ""}</p>
                    </div>
                </div>
            </div>
            <div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Acquisition Items</h4>
                <div class="divide-y border rounded-xl overflow-hidden">
                    ${items
                      .map((item) => {
                        const product = item.product || {};
                        const imageUrl = product.image_url
                          ? product.image_url.replace(/^http:/, "https:")
                          : product.image
                            ? `${CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "")}/storage/${product.image}`
                            : "https://placehold.co/400x400?text=No+Image";

                        return `
                        <div class="p-4 flex gap-4 bg-white">
                            <img src="${imageUrl}" class="w-12 h-12 object-contain" onerror="this.src='https://placehold.co/400x400?text=No+Image'">
                            <div>
                                <p class="text-xs font-bold">${product.name || "Unavailable"}</p>
                                <p class="text-[10px] text-slate-400 font-bold uppercase">QTY: ${item.quantity} | UNIT: ₹${item.price}</p>
                            </div>
                        </div>
                    `;
                      })
                      .join("")}
                </div>
                <div class="mt-6 flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
                    <span class="text-xs font-black uppercase tracking-widest opacity-60">Total Payload</span>
                    <span class="text-xl font-black italic">₹${Number(order.total_amount || 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    `;

  document.getElementById("orderModal")?.classList.remove("hidden");
}

function setupEventListeners() {
  document
    .getElementById("order-search")
    ?.addEventListener("input", fetchOrders);
}

document.addEventListener("DOMContentLoaded", initAdminOrders);
