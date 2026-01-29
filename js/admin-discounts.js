import { apiCall } from "./main.js";

async function init() {
  // populate categories
  await loadCategories();
  setupListeners();
}

let categories = [];

async function loadCategories() {
  try {
    const data = await apiCall("/categories");
    const list =
      data.categories || data.data || (Array.isArray(data) ? data : []);
    categories = Array.isArray(list) ? list : [];
    const sel = document.getElementById("page-discount-category");
    if (sel) {
      sel.innerHTML =
        `<option value="all">All Categories</option>` +
        categories
          .map((c) => `<option value="${c.id}">${c.name}</option>`)
          .join("");
    }
  } catch (e) {
    console.error("Failed to load categories", e);
  }
}

function setupListeners() {
  document
    .getElementById("page-discount-cancel")
    ?.addEventListener("click", () => {
      window.location.href = "/admin/products.html";
    });

  const form = document.getElementById("discount-page-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const sel = document.getElementById("page-discount-category");
    const percent = parseFloat(
      document.getElementById("page-discount-percent").value,
    );
    const startVal = (
      document.getElementById("page-discount-start").value || ""
    ).trim();
    const endVal = (
      document.getElementById("page-discount-end").value || ""
    ).trim();

    if (isNaN(percent) || percent <= 0) {
      if (window.showToast)
        window.showToast("Enter valid discount percent", "error");
      return;
    }

    const payload = { 
      discount_percent: percent,
      start_at: startVal || null,
      end_at: endVal || null
    };
    
    const category = sel ? sel.value : "all";
    if (category !== "all") payload.category_id = parseInt(category);

    if (!payload.start_at || !payload.end_at) {
      if (window.showToast) window.showToast("Start and End times are required", "error");
      return;
    }

    try {
      // Primary attempt
      console.log("Discount apply: request", payload);
      let res = await apiCall("/admin/discounts/apply", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("Discount apply: response", res);

      console.groupCollapsed("Discount apply: response");
      console.log(res);
      console.groupEnd();

      if (res && (res.success || res.applied)) {
        if (window.showToast) window.showToast("Discount applied successfully");
        setTimeout(() => (window.location.href = "/admin/products.html"), 800);
      } else {
        // show server message if available
        const msg = res?.message || "Failed to apply discount";
        throw new Error(msg);
      }
    } catch (err) {
      console.error("Apply discount failed", err);
      if (window.showToast)
        window.showToast(err.message || "Apply discount failed", "error");
    }
  });
}

window.addEventListener("DOMContentLoaded", init);
