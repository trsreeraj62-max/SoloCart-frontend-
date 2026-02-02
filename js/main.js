import CONFIG from "./config.js";

// Immediate auth check for CSS targeting
if (localStorage.getItem("auth_token")) {
  document.documentElement.classList.add("is-authenticated");
}

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
/**
 * Generic API Caller with Timeout & Error Handling
 * Handles Render cold starts (wait up to 15s)
 */
export async function apiCall(endpoint, options = {}) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${CONFIG.API_BASE_URL}${path}`.replace(/^http:/, "https:");

  const token = getAuthToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers["Content-Type"];

  const timeout = options.timeout || 15000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort("timeout"), timeout);

  try {
    const fetchOptions = {
      ...options,
      headers,
      signal: controller.signal,
      cache: "no-store",
    };

    const res = await fetch(url, fetchOptions);
    clearTimeout(id);


    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.warn("API response was not JSON:", text.substring(0, 100));
      return { success: false, message: "Response format error", raw: text };
    }

    if (!res.ok) {
        // Log out on persistent 401
        if (res.status === 401 && !options.skipRedirect) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user_data");
            localStorage.removeItem("user_profile");
            window.location.href = "/login.html";
        }
        return { success: false, ...data, statusCode: res.status };
    }

    return data;
  } catch (err) {
    clearTimeout(id);
    const isTimeout = err.name === 'AbortError' || err === 'timeout' || (err.message && err.message.includes('timeout'));
    
    if (isTimeout) {
      return { success: false, message: "Server connection timed out (Render cold start). Please refresh.", timeout: true };
    }
    return { success: false, message: "Network error: " + err.message };
  } finally {
    // Ensure loaders are hidden
    const loader = document.getElementById("loading") || document.getElementById("global-loader");
    if (loader) loader.style.display = "none";
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
    const avatarUrl = user.profile_image || user.avatar || user.image_url || null;
    let imgHtml = '';
    
    if (avatarUrl) {
      let finalUrl = avatarUrl;
      if (!finalUrl.startsWith("http")) {
        finalUrl = `${CONFIG.API_BASE_URL.replace(/\/api$/, "")}/${finalUrl.replace(/^\//, "")}`;
      }
      finalUrl = finalUrl.replace(/^http:/, "https:");
      imgHtml = `<img src="${finalUrl}" class="w-7 h-7 rounded-sm object-cover user-avatar" alt="User">`;
    } else {
      const initial = (user.name || "U").charAt(0).toUpperCase();
      imgHtml = `<div class="w-7 h-7 rounded-sm bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white user-avatar-placeholder">${initial}</div>`;
    }

    authActions.innerHTML = `
      <div class="relative inline-block" id="auth-dropdown">
        <button id="auth-dropdown-btn" class="flex items-center gap-3 focus:outline-none bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-all border border-slate-200/50">
          ${imgHtml}
          <span class="text-xs font-bold uppercase tracking-wide text-slate-700 hidden sm:inline">${user.name || "User"}</span>
        </button>
        <div id="auth-dropdown-menu" class="hidden absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div class="px-5 py-4 bg-slate-50 border-b border-slate-100">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Authenticated Account</p>
            <p class="text-xs font-bold text-slate-800 truncate">${user.email}</p>
          </div>
          <div class="p-1.5">
            <a href="/profile.html" class="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-bold transition-colors">
              <i class="fas fa-user-circle opacity-50 w-4"></i> My Profile
            </a>
            <a href="/orders.html" class="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg font-bold transition-colors">
              <i class="fas fa-box-open opacity-50 w-4"></i> My Orders
            </a>
            ${user.role === "admin" || user.is_admin ? `
            <div class="h-px bg-slate-100 my-1"></div>
            <a href="/admin/dashboard.html" class="flex items-center gap-3 px-4 py-2.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold transition-colors">
              <i class="fas fa-shield-alt w-4"></i> Admin Panel
            </a>
            ` : ""}
            <div class="h-px bg-slate-100 my-1"></div>
            <button id="user-logout" class="flex items-center gap-3 w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors">
              <i class="fas fa-power-off opacity-50 w-4"></i> Logout
            </button>
          </div>
        </div>
      </div>
    `;
    // initialize dropdown behavior
    initAuthDropdown();
    
    // Update Mobile Menu Login -> Logout
    const mobileLoginBtn = document.getElementById("mobile-login-link");
    if (mobileLoginBtn) {
        mobileLoginBtn.innerHTML = '<i class="fas fa-power-off"></i> Logout';
        mobileLoginBtn.href = "#";
        mobileLoginBtn.classList.add("text-rose-500");
        mobileLoginBtn.onclick = (e) => {
            e.preventDefault();
            logoutUser();
        };
    }
  } else {
    authActions.innerHTML = `<a href="/login.html" class="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-100 transition-all no-underline">Login</a>`;
    
    // Reset Mobile Link
    const mobileLoginBtn = document.getElementById("mobile-login-link");
    if (mobileLoginBtn) {
        mobileLoginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        mobileLoginBtn.href = "/login.html";
        mobileLoginBtn.classList.remove("text-rose-500");
        mobileLoginBtn.onclick = null;
    }
  }
}

function logoutUser() {
    try {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_data");
      localStorage.removeItem("user_profile");
    } catch (e) {}
    window.location.href = "/index.html";
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
  document.getElementById("user-logout")?.addEventListener("click", logoutUser);

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

  if (!user) return;

  const avatarUrl = user.profile_image || user.avatar || user.image_url || null;
  if (!avatarUrl) return;

  let img = avatarUrl;
  if (!img.startsWith("http")) {
    img = `${CONFIG.API_BASE_URL.replace(/\/api$/, "")}/${img.replace(/^\//, "")}`;
  }
  img = img.replace(/^http:/, "https:");

  document.querySelectorAll(".user-avatar").forEach((el) => {
    if (el.tagName === 'IMG') {
      el.src = img;
    }
  });
}

/* ---------------- CART BADGE ---------------- */
export async function updateCartBadge() {
  const badge = document.getElementById("cart-count-badge");
  if (!badge) return;

  if (!getAuthToken()) {
      badge.textContent = "0";
      badge.classList.add("hidden");
      return;
  }

  const data = await apiCall("/cart", { skipRedirect: true });
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

  if (!profile) return;
  
  const avatarUrl = profile.profile_image || profile.avatar || profile.image_url || null;
  if (!avatarUrl) return;

  let avatar = avatarUrl;
  if (!avatar.startsWith("http")) {
    avatar = `${CONFIG.API_BASE_URL.replace(/\/api$/, "")}/${avatar.replace(/^\//, "")}`;
  }
  avatar = avatar.replace(/^http:/, "https:");

  document.querySelectorAll(".profile-avatar, .user-avatar, #user-profile-circle, #p-image-preview").forEach((img) => {
    if (img.tagName === 'IMG') {
      img.src = avatar;
      img.classList.remove('hidden');
    }
  });

  const initials = document.getElementById("user-initials");
  if (initials) initials.classList.add("hidden");
}

/* ---------------- VALIDATION ---------------- */
export function validatePassword(password) {
  if (!password) return { valid: false, message: "Password is required" };
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters long" };
  // Add more strength checks if needed
  return { valid: true };
}

export function validatePhone(phone) {
  if (!phone) return { valid: false, message: "Phone number is required" };
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) return { valid: false, message: "Phone number must be exactly 10 digits" };
  return { valid: true, cleaned };
}

/* ---------------- DOM READY ---------------- */
// Run UI updates IMMEDIATELY as the module loads to prevent login flicker
updateAuthUI();
updateCartBadge();
updateProfileAvatar();

document.addEventListener("DOMContentLoaded", () => {
  // Re-run safely on DOM ready or just initialize dynamic behaviors
  initMobileMenu();
  initGlobalSearch();

  // Scroll effect for navbar
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

/* ---------------- GLOBAL SEARCH (Non-Shop Pages) ---------------- */
function initGlobalSearch() {
  // If we are on the shop page, let shop.js handle it
  if (window.location.pathname.includes("/shop")) return;

  const searchInput = document.getElementById("global-search");
  if (!searchInput) return;

  const handleSearch = () => {
    const query = searchInput.value.trim();
    if (query) {
      window.location.href = `/shop.html?search=${encodeURIComponent(query)}`;
    }
  };

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
  
  // Optional: if there's a search button icon
  const searchIcon = searchInput.parentElement.querySelector(".fa-search");
  if (searchIcon) {
      searchIcon.parentElement.style.cursor = "pointer";
      searchIcon.parentElement.addEventListener("click", handleSearch);
  }
}

/* ---------------- MOBILE MENU ---------------- */
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('close-mobile-menu');
  const overlay = document.getElementById('mobile-menu-overlay');
  const menu = document.getElementById('mobile-menu');

  if (!btn || !closeBtn || !overlay || !menu) return;

  const toggle = (show) => {
      if (show) {
          overlay.classList.add('active');
          menu.classList.add('active');
          document.body.style.overflow = 'hidden';
      } else {
          overlay.classList.remove('active');
          menu.classList.remove('active');
          document.body.style.overflow = '';
      }
  };

  // Remove existing listeners to be safe (though this runs once usually)
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  
  newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = menu.classList.contains('active');
      toggle(!isActive);
  });

  const newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  newClose.addEventListener('click', () => toggle(false));

  const newOverlay = overlay.cloneNode(true);
  overlay.parentNode.replaceChild(newOverlay, overlay);
  newOverlay.addEventListener('click', () => toggle(false));
}
