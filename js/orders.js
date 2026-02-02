import CONFIG from "./config.js";
import { getAuthToken, apiCall } from "./main.js";

async function initOrders() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }
  await fetchOrders();
}

async function fetchOrders() {
  try {
    console.log("[Orders] Fetching orders from /orders...");
    console.log("[Orders] Auth token:", getAuthToken() ? "present" : "missing");
    // Add a timestamp to bypass caches and request more items per page
    const res = await apiCall(`/orders?t=${Date.now()}&per_page=50`, {
      requireAuth: true,
    });
    console.log("[Orders] Raw API response:", res);

    // Log pagination metadata when present to help diagnose missing orders
    let paginationMeta = null;
    if (res && res.meta) paginationMeta = res.meta;
    else if (res && res.data && res.data.meta) paginationMeta = res.data.meta;
    else if (res && res.pagination) paginationMeta = res.pagination;
    console.log("[Orders] Pagination meta:", paginationMeta);

    // Handle multiple possible response structures
    let orders = [];

    if (!res) {
      console.error("[Orders] No response from API");
      orders = [];
    } else if (Array.isArray(res)) {
      // Direct array: [order1, order2, ...]
      console.log("[Orders] Response is direct array");
      orders = res;
    } else if (res.data && Array.isArray(res.data)) {
      // { data: [order1, order2, ...] } - THIS IS THE CORRECT FORMAT
      console.log("[Orders] Response has data array");
      orders = res.data;
      console.log("[Orders] Raw data array:", JSON.stringify(res.data));
    } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
      // { data: { data: [order1, order2, ...] } }
      console.log("[Orders] Response has nested data.data");
      orders = res.data.data;
    } else if (res.orders && Array.isArray(res.orders)) {
      // { orders: [order1, order2, ...] }
      console.log("[Orders] Response has orders array");
      orders = res.orders;
    } else {
      console.warn("[Orders] Unknown response structure, trying to extract...");
      console.log("[Orders] Full response object:", res);
      orders = [];
    }

    console.log("[Orders] Extracted orders count:", orders.length);
    console.log("[Orders] Orders data:", orders);
    
    // Debug each order
    orders.forEach((order, index) => {
      console.log(`[Orders] Order ${index + 1}:`, {
        id: order.id,
        status: order.status,
        total: order.total,
        items_count: order.items?.length || 0,
        created_at: order.created_at
      });
    });

    const container = document.getElementById("orders-list");
    if (!container) {
      console.error("[Orders] Container #orders-list not found!");
      return;
    }

    if (!orders || orders.length === 0) {
      console.warn("[Orders] No orders found, showing empty message");
      showEmptyMessage();
      return;
    }

    // Clear container and render all orders
    container.innerHTML = "";
    console.log(
      "[Orders] Cleared container, rendering",
      orders.length,
      "orders",
    );

    // Hide empty message if present
    const emptyEl = document.querySelector(".empty-orders");
    if (emptyEl) emptyEl.style.display = "none";

    // Render all orders using the renderOrders function
    renderOrders(orders);
    console.log("[Orders] Rendering complete!");

    // Start polling for live updates (every 25 seconds)
    startOrdersPolling();
  } catch (e) {
    console.error("[Orders] Fatal error fetching orders:", e);
    if (window.showToast) window.showToast("Failed to load history", "error");
  }
}

function renderOrders(orders) {
  const container = document.getElementById("orders-list");
  if (!container || !Array.isArray(orders)) return;

  // Diagnostic logs to trace why an order may be dropped between fetch and render
  try {
    console.log(
      "[Orders] renderOrders input count:",
      Array.isArray(orders) ? orders.length : typeof orders,
      orders,
    );
    const summary = orders.map((o) => ({
      id: o?.id ?? null,
      order_number: o?.order_number ?? null,
      items_length: Array.isArray(o?.items) ? o.items.length : null,
    }));
    console.log("[Orders] renderOrders summary:", summary);
    const invalids = orders.filter((o) => !o || typeof o !== "object");
    if (invalids.length)
      console.warn("[Orders] renderOrders found invalid entries:", invalids);
    const ids = summary.map((s) => s.id).filter((v) => v != null);
    const dup = ids.filter((v, i, a) => a.indexOf(v) !== i);
    if (dup.length) console.warn("[Orders] Duplicate order ids detected:", dup);
  } catch (dbgErr) {
    console.error("[Orders] Diagnostics failed:", dbgErr);
  }
  // Render each order using the first item as preview, but handle missing product objects.
  const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
  const rows = orders.map((order, index) => {
    console.log(`[Orders] Generating HTML for order #${order.id} (index ${index})`);
    const items = Array.isArray(order.items) ? order.items : [];
    const firstItem = items[0] || {};
    const productObj = extractProductFromItem(firstItem, backendBase);

    const imageUrl =
      productObj.image_url ||
      productObj.image ||
      "https://placehold.co/400x400?text=No+Image";
    const title = productObj.name || productObj.title || "Order Item";
    const price = Number(
      firstItem.price ||
        productObj.price ||
        order.total ||
        order.total_amount ||
        0,
    ).toLocaleString();

    // Determine available actions
    let actionButtons = '';
    const s = String(order.status || "").toLowerCase();

    // Cancel Button
    if (canCancel(s)) {
        actionButtons += `<button data-id="${order.id}" class="cancel-order-btn text-xs bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded font-bold uppercase transition mt-2">Cancel Order</button> `;
    }

    // Return Button
    if (s === 'delivered') {
        actionButtons += `<button data-id="${order.id}" class="return-order-btn text-xs bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded font-bold uppercase transition mt-2 mr-2">Return</button> `;
        // Invoice Button
         actionButtons += `<button data-id="${order.id}" class="invoice-btn text-xs bg-[#2874f0] hover:bg-blue-600 text-white px-4 py-2 rounded font-bold uppercase transition mt-2"><i class="fas fa-file-download mr-1"></i> Invoice</button> `;
    }

    // Main Row
    return `
      <div class="bg-white p-4 rounded-sm shadow-sm border border-slate-100 flex gap-6 hover:shadow-md transition-shadow mb-3 relative group">
          <a href="/order-details.html?id=${order.id}" class="absolute inset-0 z-0 text-transparent">View</a>
          <div class="w-20 h-20 flex-shrink-0 border rounded-sm p-1 z-10 bg-white relative">
              <a href="/order-details.html?id=${order.id}">
                  <img src="${imageUrl}" class="h-full w-full object-contain hover:scale-105 transition-transform" alt="${title}">
              </a>
          </div>
          <div class="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 z-10 relative pointer-events-none">
              <div class="pointer-events-auto">
                  <h4 class="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[#2874f0]"><a href="/order-details.html?id=${order.id}">${escapeHtml(title)}</a> ${(items.length || 0) > 1 ? `+${items.length - 1} more` : ""}</h4>
                  <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Order ID: #${order.order_number || order.id}</p>
              </div>
              <div class="pointer-events-auto">
                  <span class="text-md font-bold text-slate-900">₹${price}</span>
              </div>
              <div class="pointer-events-auto">
                  <div class="flex items-center gap-2">
                          <div class="w-2 h-2 rounded-full ${getStatusColor(order.status || "pending")}"></div>
                          <span class="text-xs font-black uppercase tracking-widest text-slate-700">${order.status || "PENDING"}</span>
                      </div>
                      <p class="text-[10px] font-bold text-slate-400 mt-1">${order.status_date || "Last updated recently"}</p>
                      <div class="mt-2 text-right md:text-left">
                        ${actionButtons}
                      </div>
              </div>
          </div>
      </div>
    `;
  });

  container.innerHTML = rows.join("");
  console.log(`[Orders] Set innerHTML with ${rows.length} order HTML blocks`);
  console.log(`[Orders] Container now has ${container.children.length} child elements`);

  // Attach Event Listeners
  
  // 1. Cancel
  container.querySelectorAll(".cancel-order-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Stop bubbling to link
      e.preventDefault(); 
      const id = btn.dataset.id;
      if (!confirm("Are you sure you want to cancel this order?")) return;
      btn.disabled = true;
      btn.innerText = "Processing...";
      try {
        const res = await apiCall(`/orders/${id}/cancel`, { method: "POST", requireAuth: true });
        if (res && (res.success || res.status === "cancelled" || res.order)) {
          if (window.showToast) window.showToast("Order cancelled");
          await fetchOrders();
        } else {
             if (window.showToast) window.showToast(res?.message || "Failed to cancel", "error");
             btn.disabled = false;
             btn.innerText = "Cancel Order";
        }
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerText = "Cancel Order";
      }
    });
  });

  // 2. Return
  container.querySelectorAll(".return-order-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          const id = btn.dataset.id;
          const reason = prompt("Please enter a reason for returning this item:");
          if (reason === null) return; // Cancelled prompt
          if (!reason.trim()) { alert("Reason is required."); return; }
          
          btn.disabled = true;
          btn.innerText = "Processing...";
          try {
             // Pass reason in body
             const res = await apiCall(`/orders/${id}/return`, { 
                 method: "POST", 
                 requireAuth: true,
                 body: JSON.stringify({ reason: reason })
             });
             
             if (res && res.success) {
                 if(window.showToast) window.showToast("Return request submitted");
                 await fetchOrders();
             } else {
                 alert(res?.message || "Failed to submit return request");
                 btn.disabled = false; 
                 btn.innerText = "Return";
             }
          } catch(err) {
             console.error(err);
             alert("Error submitting return request");
             btn.disabled = false;
             btn.innerText = "Return";
          }
      });
  });

  // 3. Invoice
  container.querySelectorAll(".invoice-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          const id = btn.dataset.id;
          btn.disabled = true;
          const prevHTML = btn.innerHTML;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          
          try {
             const token = getAuthToken();
             const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${id}/invoice`, {
                 headers: { 'Authorization': `Bearer ${token}` }
             });
             
             if(response.ok) {
                 const blob = await response.blob();
                 const url = window.URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = `Invoice_Order_${id}.pdf`;
                 document.body.appendChild(a);
                 a.click();
                 a.remove();
                 window.URL.revokeObjectURL(url);
             } else {
                 const json = await response.json();
                 alert(json.message || "Failed to download invoice");
             }
          } catch(err) {
             console.error(err);
             alert("Error downloading invoice");
          } finally {
             btn.disabled = false;
             btn.innerHTML = prevHTML;
          }
      });
  });
}

function getStatusColor(status) {
  if (!status) return "bg-slate-400";
  switch (status.toLowerCase()) {
    case "delivered":
      return "bg-green-500";
    case "shipped":
      return "bg-[#2874f0]";
    case "pending":
      return "bg-orange-400";
    case "cancelled":
      return "bg-rose-500";
    default:
      return "bg-slate-400";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>\"]/g, function (s) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    }[s];
  });
}

function extractProductFromItem(item, backendBase) {
  if (!item) return {};
  const product = item.product || item.product_data || item.productInfo || null;
  if (product) {
    const img = product.image_url
      ? product.image_url.replace(/^http:/, "https:")
      : product.image
        ? `${backendBase}/storage/${product.image}`
        : product.image;
    return {
      name: product.name || product.title || product.product_name,
      image_url: img,
      price: product.price || product.selling_price || item.price,
    };
  }

  const fallbackImage = item.image_url
    ? item.image_url.replace(/^http:/, "https:")
    : item.image
      ? `${backendBase}/storage/${item.image}`
      : null;

  return {
    name: item.name || item.title || item.product_name,
    image_url: fallback_image_or_default(fallbackImage),
    price: item.price || item.unit_price || item.amount,
  };
}

function fallback_image_or_default(img) {
  return img || "https://placehold.co/400x400?text=No+Image";
}

function canCancel(status) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === "pending" || s === "approved";
}

let _ordersPollTimer = null;
function startOrdersPolling() {
  if (_ordersPollTimer) return; // already polling
  _ordersPollTimer = setInterval(() => {
    fetchOrders().catch(() => {});
  }, 25000);
}

function stopOrdersPolling() {
  if (_ordersPollTimer) {
    clearInterval(_ordersPollTimer);
    _ordersPollTimer = null;
  }
}

// Safe empty-state renderer used when user has no orders
function showEmptyMessage() {
  const container = document.getElementById("orders-list");
  if (!container) return;
  container.innerHTML = `
    <div class="empty-orders bg-white p-20 text-center rounded-sm border border-slate-100">
      <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/myorders-empty_8244e8.png" class="w-64 mx-auto mb-6 opacity-60" alt="No orders">
      <h3 class="text-xl font-bold text-slate-700">You haven't ordered anything yet!</h3>
      <a href="/shop.html" class="mt-6 inline-block bg-[#2874f0] text-white px-8 py-2 rounded-sm font-bold no-underline uppercase text-xs">Shop Now</a>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", initOrders);
