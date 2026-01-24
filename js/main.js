import CONFIG from "./config.js";

/* ---------------- SAFE JSON ---------------- */
export function safeJSONParse(str, fallback = {}) {
  if (!str || str === "undefined" || str === "null") return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return fallback;
  }
}

/* ---------------- AUTH ---------------- */
export function getAuthToken() {
  const token = localStorage.getItem("auth_token");
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

/* ---------------- API CALL ---------------- */
export async function apiCall(endpoint, options = {}) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${CONFIG.API_BASE_URL}${path}`.replace(/^http:/, "https:");

  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers["Content-Type"];

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/login.html";
      }
      return { success: false, ...data };
    }

    return data;
  } catch (err) {
    console.error("API ERROR:", err);
    return { success: false, message: "Network error" };
  }
}

/* ---------------- UI HELPERS ---------------- */
window.showToast = function (msg, type = "success") {
  alert(msg); // keep simple, your toast logic is fine if already included
};

/* ---------------- AUTH UI ---------------- */
export function updateAuthUI() {
  const authActions = document.getElementById("auth-actions");
  if (!authActions) return;

  const token = getAuthToken();
  const user =
    safeJSONParse(localStorage.getItem("user_profile"), null) ||
    safeJSONParse(localStorage.getItem("user_data"), null);

  if (token && user) {
    // Render a clickable avatar with a small dropdown menu
    authActions.innerHTML = `
      <div class="relative inline-block" id="auth-dropdown">
        <button id="auth-dropdown-btn" class="flex items-center gap-2 focus:outline-none">
          <img class="user-avatar w-8 h-8 rounded-full profile-avatar" />
          <span class="hidden md:inline-block">${user.name || "User"}</span>
          <i class="fas fa-caret-down ml-2 text-white/80"></i>
        </button>
        <div id="auth-dropdown-menu" class="hidden absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg border border-slate-100 z-50">
          <a href="/profile.html" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">My Profile</a>
          <a href="/orders.html" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">My Orders</a>
          <a href="/cart.html" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cart</a>
          ${user.role === "admin" || user.is_admin ? '<a href="/admin/dashboard.html" class="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Admin Dashboard</a>' : ""}
          <button id="user-logout" class="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-slate-50">Logout</button>
        </div>
      </div>
    `;
    updateHeaderProfileImage();
    // initialize dropdown behavior
    initAuthDropdown();
  } else {
    authActions.innerHTML = `<a href="/login.html" class="bg-white text-[#2874f0] px-4 py-1.5 rounded-sm font-bold text-sm no-underline">Login</a>`;
  }
}

function initAuthDropdown() {
  const btn = document.getElementById("auth-dropdown-btn");
  const menu = document.getElementById("auth-dropdown-menu");
  if (!btn || !menu) return;

  const toggle = (show) => {
    if (show) menu.classList.remove("hidden");
    else menu.classList.add("hidden");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle(menu.classList.contains("hidden"));
  });

  // Logout button
  document.getElementById("user-logout")?.addEventListener("click", () => {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("user_profile");
    } catch (e) {}
    window.location.href = "/index.html";
  });

  // Close when clicking outside
  window.addEventListener("click", (e) => {
    if (!menu.classList.contains("hidden")) toggle(false);
  });
}

/* ---------------- PROFILE IMAGE ---------------- */
export function updateHeaderProfileImage() {
  const user =
    safeJSONParse(localStorage.getItem("user_profile"), null) ||
    safeJSONParse(localStorage.getItem("user_data"), null);

  if (!user || !user.profile_image) return;

  let img = user.profile_image;
  if (!img.startsWith("http")) {
    img = `${CONFIG.API_BASE_URL.replace(/\/api$/, "")}/${img}`;
  }

  document.querySelectorAll(".user-avatar").forEach((el) => {
    el.src = img.replace(/^http:/, "https:");
  });
}

/* ---------------- CART BADGE ---------------- */
export async function updateCartBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (!badge) return;

  const data = await apiCall("/cart");
  const count = data?.items?.length || 0;

  badge.textContent = count;
  badge.classList.toggle("hidden", count === 0);
}

/* ---------------- ADD TO CART ---------------- */
window.addToCart = async function (productId, quantity = 1) {
  if (!getAuthToken()) {
    window.location.href = "/login.html";
    return;
  }

  const res = await apiCall("/cart/add", {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity }),
  });

  if (res.success) {
    showToast("Added to cart");
    updateCartBadge();
  }
};

/* ---------------- PROFILE AVATAR (FIXED EXPORT LOCATION) ---------------- */
export function updateProfileAvatar() {
  const profile =
    safeJSONParse(localStorage.getItem("user_profile"), null) ||
    safeJSONParse(localStorage.getItem("user_data"), null);

  if (!profile || !profile.profile_image) return;

  let avatar = profile.profile_image;
  if (!avatar.startsWith("http")) {
    avatar = `${CONFIG.API_BASE_URL.replace(/\/api$/, "")}/${avatar}`;
  }

  document.querySelectorAll(".profile-avatar").forEach((img) => {
    img.src = avatar.replace(/^http:/, "https:");
  });
}

/* ---------------- DOM READY ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  updateCartBadge();
  updateProfileAvatar();
});
