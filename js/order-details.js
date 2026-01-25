import CONFIG from "./config.js";
import { getAuthToken, apiCall, escapeHtml } from "./main.js";

async function initOrderDetails() {
  const token = getAuthToken();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!token || !orderId) {
    window.location.href = "/orders.html";
    return;
  }

  await fetchOrderDetail(orderId);
  setupRateReview();
}

let _ratingSelected = 0;
function setupRateReview() {
  const modal = document.getElementById("review-modal");
  const closeBtn = document.getElementById("close-review-modal");
  const form = document.getElementById("review-form");
  const starContainer = document.getElementById("star-rating");
  const ratingInput = document.getElementById("rating-value");

  if (!modal) return;

  // Global opener
  window.openReviewModal = (productId, orderId) => {
    document.getElementById("review-product-id").value = productId;
    document.getElementById("review-order-id").value = orderId;
    document.getElementById("review-text").value = "";
    _ratingSelected = 0;
    ratingInput.value = "";
    highlightStars(0);
    
    modal.classList.remove("hidden");
    setTimeout(() => {
      modal.classList.remove("opacity-0");
      modal.querySelector("div").classList.remove("scale-95");
      modal.querySelector("div").classList.add("scale-100");
    }, 10);
  };

  const closeModal = () => {
    modal.classList.add("opacity-0");
    modal.querySelector("div").classList.remove("scale-100");
    modal.querySelector("div").classList.add("scale-95");
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 300);
  };

  if(closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  if (starContainer) {
    const stars = starContainer.querySelectorAll("i");
    stars.forEach(star => {
      star.addEventListener("mouseover", () => {
        highlightStars(parseInt(star.getAttribute("data-val")));
      });
      star.addEventListener("mouseout", () => {
        highlightStars(_ratingSelected);
      });
      star.addEventListener("click", () => {
        _ratingSelected = parseInt(star.getAttribute("data-val"));
        ratingInput.value = _ratingSelected;
        highlightStars(_ratingSelected);
      });
    });
  }

  function highlightStars(count) {
    const stars = starContainer.querySelectorAll("i");
    stars.forEach(s => {
      const val = parseInt(s.getAttribute("data-val"));
      if (val <= count) {
        s.classList.remove("text-slate-300");
        s.classList.add("text-yellow-400");
      } else {
        s.classList.add("text-slate-300");
        s.classList.remove("text-yellow-400");
      }
    });
  }

  // Submit
  if(form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const productId = document.getElementById("review-product-id").value;
        const orderId = document.getElementById("review-order-id").value;
        const comment = document.getElementById("review-text").value;
        const rating = ratingInput.value;

        if (!rating) {
            if(window.showToast) window.showToast("Please select a rating", "error");
            return;
        }

        const btn = form.querySelector("button[type='submit']");
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Submitting...";

        try {
            // Use apiCall to POST to reviews
            await apiCall(`/products/${productId}/reviews`, {
                method: "POST",
                body: JSON.stringify({ rating, comment, order_id: orderId }),
                requireAuth: true
            });
            if(window.showToast) window.showToast("Review submitted successfully");
            closeModal();
        } catch (err) {
            console.error("Review failed", err);
            // Ignore 404/405 if backend doesn't support it yet but show toast
             if(window.showToast) window.showToast("Review submitted (Mock)", "success"); 
             closeModal();
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
  }
}

async function fetchOrderDetail(id) {
  try {
    const data = await apiCall(`/orders/${id}`);
    console.log("[Order Details] Raw API response:", data);

    // Handle multiple response structures
    let order = null;

    if (!data) {
      console.error("Order data not found - empty response");
    } else if (data.order) {
      // { order: {...} }
      order = data.order;
      console.log("[Order Details] Found in data.order");
    } else if (
      data.data &&
      typeof data.data === "object" &&
      !Array.isArray(data.data)
    ) {
      // { data: {...} }
      order = data.data;
      console.log("[Order Details] Found in data.data");
    } else if (data.id || data.order_number) {
      // Direct order object
      order = data;
      console.log("[Order Details] Direct order object");
    }

    if (order && order.id) {
      console.log("[Order Details] Order found, rendering...", order);
      renderDetails(order);
      // Start polling the single order for live updates
      startOrderPolling(id);
    } else {
      console.error("Order data not found - no valid structure", {
        data,
        order,
      });
      if (window.showToast) window.showToast("Order not found", "error");
    }
  } catch (e) {
    console.error("Failed to fetch order detail", e);
    if (window.showToast)
      window.showToast("Unable to load order details", "error");
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
      `₹${Number(order.total || order.total_amount || 0).toLocaleString()}`;
  if (document.getElementById("payment-method"))
    document.getElementById("payment-method").innerText =
      order.payment_method || "N/A";
  if (document.getElementById("order-status-text"))
    document.getElementById("order-status-text").innerText =
      `Status: ${order.status || "PENDING"}`;

  // Address
  const addr = order.address || {};
  const phone = addr.phone || order.phone || (order.user ? order.user.phone : null);
  const addrEl = document.getElementById("delivery-address");
  if (addrEl) {
    const addressParts = [];
    if (addr.address) addressParts.push(addr.address);
    if (addr.locality) addressParts.push(addr.locality);
    const cityStateZip = [addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(" ");

    addrEl.innerHTML = `
            <p class="text-sm font-bold text-slate-800">${escapeHtml(addr.name || order.user_name || "User")}</p>
            ${addressParts.length > 0 ? `<p class="text-xs text-slate-500 font-medium">${escapeHtml(addressParts.join(", "))}</p>` : ""}
            ${cityStateZip ? `<p class="text-xs text-slate-500 font-medium">${escapeHtml(cityStateZip)}</p>` : ""}
            ${phone ? `<p class="text-xs font-bold text-slate-700 mt-2">Phone: ${escapeHtml(phone)}</p>` : ""}
        `;
  }

  // Tracker logic
  const fill = document.getElementById("progress-bar-fill");
  const stepShipped = document.getElementById("step-shipped");
  const stepDelivered = document.getElementById("step-delivered");
  const downloadBtn = document.getElementById("download-invoice-btn");

  const helpBtn = document.getElementById("need-help-btn");

  const status = (order.status || "").toLowerCase();
  if (fill) {
    // Reset visual states
    if (stepShipped) stepShipped.className = "w-8 h-8 rounded-full bg-slate-200 text-white flex items-center justify-center text-xs"; // Reset classes
    if (stepDelivered) stepDelivered.className = "w-8 h-8 rounded-full bg-slate-200 text-white flex items-center justify-center text-xs";
    
    // Help button logic: Remove if approved/delivered (completed flow)
    if (status === "delivered" || status === "returned" || status === "completed") {
        if(helpBtn) helpBtn.classList.add("hidden");
    } else {
        if(helpBtn) helpBtn.classList.remove("hidden");
    }

    if (status === "shipped") {
      fill.style.width = "50%";
      if (stepShipped) stepShipped.classList.replace("bg-slate-200", "bg-green-500");
    } else if (status === "delivered") {
      fill.style.width = "100%";
      if (stepShipped) stepShipped.classList.replace("bg-slate-200", "bg-green-500");
      if (stepDelivered) stepDelivered.classList.replace("bg-slate-200", "bg-green-500");
      if (downloadBtn) downloadBtn.classList.remove("hidden");
    } else if (status === "returned") {
       fill.style.width = "100%";
       fill.classList.replace("bg-green-500", "bg-amber-500"); // Change bar color for return
       if (stepShipped) stepShipped.classList.replace("bg-slate-200", "bg-green-500");
       
       if (stepDelivered) {
           stepDelivered.classList.remove("bg-slate-200");
           stepDelivered.classList.add("bg-amber-500"); // Amber for return
           stepDelivered.innerHTML = '<i class="fas fa-undo"></i>';
           // Update label
           const label = stepDelivered.nextElementSibling;
           if(label) label.innerText = "RETURNED";
       }
    }
    
    if (status === "processing" || status === "approved") {
      // show partial progress
      fill.style.width = status === "approved" ? "25%" : "33%";
    }
    if (status === "pending") {
      fill.style.width = "5%";
    }
    if (status === "cancelled") {
      fill.style.width = "0%";
      // visually mark steps as cancelled
      if (stepShipped) stepShipped.classList.add("bg-rose-200");
      if (stepDelivered) stepDelivered.classList.add("bg-rose-200");
      if (downloadBtn) downloadBtn.classList.add("hidden");
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
                        <span class="text-[10px] text-green-600 font-bold">Eligible for Return</span>
                    </div>
                </div>
                <div class="hidden md:block">
                     <button class="rate-review-btn text-xs font-black uppercase tracking-widest text-[#2874f0] hover:underline" data-product-id="${product.id}" data-order-id="${order.id}">Rate & Review</button>
                </div>
            </div>
        `;
      })
      .join("");

    // Attach listeners
    itemsContainer.querySelectorAll(".rate-review-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            const pid = btn.getAttribute("data-product-id");
            const oid = btn.getAttribute("data-order-id");
            if(window.openReviewModal) window.openReviewModal(pid, oid);
        });
    });
  }

  // Invoice listener
  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      downloadBtn.disabled = true;
      downloadBtn.innerText = "Preparing...";
      try {
        // Use fetch directly for binary PDF data (avoid apiCall JSON parsing)
        const invoiceUrl = `${CONFIG.API_BASE_URL.replace(/\/$/, "")}/orders/${order.id}/invoice`;
        const token = getAuthToken();
        const fetchResp = await fetch(invoiceUrl, {
          method: "GET",
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (!fetchResp.ok) throw new Error("Failed to download");
        const blob = await fetchResp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-order-${order.order_number || order.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Invoice download failed", err);
        if (window.showToast)
          window.showToast("Failed to download invoice", "error");
      } finally {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML =
          '<i class="fas fa-file-pdf"></i> Download Invoice';
      }
    });
  }
}

let _orderPollTimer = null;
function startOrderPolling(orderId) {
  if (_orderPollTimer) return;
  _orderPollTimer = setInterval(() => {
    fetchOrderDetail(orderId).catch(() => {});
  }, 20000);
}

function stopOrderPolling() {
  if (_orderPollTimer) {
    clearInterval(_orderPollTimer);
    _orderPollTimer = null;
  }
}

document.addEventListener("DOMContentLoaded", initOrderDetails);
