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

/* ---------------- HELPERS ---------------- */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.warn("API response was not JSON:", text.substring(0, 100));
      return { success: false, message: "Response format error", raw: text };
    }

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.clear();
        window.location.href = "/login.html";
      }
      return { success: false, ...data, statusCode: res.status };
    }

    return data;
  } catch (err) {
    console.error("API ERROR:", err);
    return { success: false, message: "Network error: " + err.message };
  }
}

/* ---------------- UI HELPERS ---------------- */
window.showToast = function (msg, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) {
    console.warn("Toast container not found, using alert fallback");
    alert(msg);
    return;
  }

  const toast = document.createElement("div");
  const bgColor = type === "error" ? "bg-rose-500" : "bg-green-500";
  const icon = type === "error" ? "fa-exclamation-circle" : "fa-check-circle";

  toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in min-w-[250px] max-w-[400px]`;
  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span class="font-medium text-sm">${String(msg).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
  `;

  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
    // Simplified dropdown without avatar as requested
    authActions.innerHTML = `
      <div class="relative inline-block" id="auth-dropdown">
        <button id="auth-dropdown-btn" class="flex items-center gap-2 focus:outline-none bg-white/10 px-4 py-1.5 rounded-sm">
          <span class="text-sm font-bold uppercase tracking-wide text-white">${user.name || "User"}</span>
          <i class="fas fa-caret-down text-white/80"></i>
        </button>
        <div id="auth-dropdown-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl border border-slate-100 z-50 overflow-hidden">
          <div class="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p class="text-[10px] font-black uppercase text-slate-400">Synchronized User</p>
            <p class="text-xs font-bold text-slate-800 truncate">${user.email}</p>
          </div>
          <a href="/profile.html" class="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors border-b border-slate-50"><i class="fas fa-user-circle mr-2 opacity-50"></i> My Profile</a>
          <a href="/orders.html" class="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors border-b border-slate-50"><i class="fas fa-box-open mr-2 opacity-50"></i> My Orders</a>
          ${user.role === "admin" || user.is_admin ? '<a href="/admin/dashboard.html" class="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors border-b border-slate-50"><i class="fas fa-shield-alt mr-2 opacity-50"></i> Admin Panel</a>' : ""}
          <button id="user-logout" class="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-bold transition-colors"><i class="fas fa-power-off mr-2 opacity-50"></i> Logout</button>
        </div>
      </div>
    `;
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

  // Scroll effect for navbar (remove blur if requested/fix blur look)
  window.addEventListener("scroll", () => {
    const nav = document.getElementById("main-nav");
    if (nav) {
      if (window.scrollY > 20) {
        nav.classList.add("nav-scrolled");
      } else {
        nav.classList.remove("nav-scrolled");
      }
    }
  });
});
