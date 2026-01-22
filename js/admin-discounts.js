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

    const payload = { percent };
    const category = sel ? sel.value : "all";
    if (category !== "all") payload.category_id = parseInt(category);

    try {
      if (startVal) {
        const s = new Date(startVal);
        if (isNaN(s.getTime())) throw new Error("Invalid start date");
        payload.start_at = s.toISOString();
      }
      if (endVal) {
        const e = new Date(endVal);
        if (isNaN(e.getTime())) throw new Error("Invalid end date");
        payload.end_at = e.toISOString();
      }
      if (
        payload.start_at &&
        payload.end_at &&
        new Date(payload.start_at) >= new Date(payload.end_at)
      ) {
        if (window.showToast)
          window.showToast("Start must be before End", "error");
        return;
      }
    } catch (dateErr) {
      if (window.showToast)
        window.showToast(dateErr.message || "Invalid date", "error");
      return;
    }

    try {
      // helper to send payload and return response
      async function sendApply(payloadToSend) {
        let r = await apiCall("/admin/discounts/apply", {
          method: "POST",
          body: JSON.stringify(payloadToSend),
        });
        if ((!r || r.success === false) && r && r.statusCode === 405) {
          r = await apiCall("/discounts/apply", {
            method: "POST",
            body: JSON.stringify(payloadToSend),
          });
        }
        return r;
      }

      // Try primary payload first
      console.groupCollapsed("Discount apply: request");
      console.log("Primary payload", payload);
      console.groupEnd();

      let res = await sendApply(payload);

      // If server failed with 500 or returned failure, try an alternate payload shape that some backends expect
      if (
        !res ||
        res.statusCode === 500 ||
        (res.success === false && /category discount/i.test(res.message || ""))
      ) {
        const alt = {
          discount_percent: percent,
          apply_to_all: category === "all",
        };
        if (category !== "all") alt.category_id = parseInt(category);
        if (payload.start_at) alt.start_date = payload.start_at;
        if (payload.end_at) alt.end_date = payload.end_at;

        console.groupCollapsed("Discount apply: fallback request");
        console.log("Fallback payload", alt);
        console.groupEnd();

        res = await sendApply(alt);
      }

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
