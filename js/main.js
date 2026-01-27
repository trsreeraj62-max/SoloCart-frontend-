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
          <i class="fas fa-caret-down text-slate-400 text-[10px]"></i>
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
  } else {
    authActions.innerHTML = `<a href="/login.html" class="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-100 transition-all no-underline">Login</a>`;
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

  initMobileMenu();
});

/* ---------------- MOBILE MENU ---------------- */
function initMobileMenu() {
  // Target the container that holds the logo and the desktop menu
  // Structure: nav .container > div.flex.gap-12 > [a(logo), ul(menu)]
  const navGroup = document.querySelector('#main-nav .container .flex.items-center.gap-12');
  if (!navGroup) return;

  if (document.getElementById('mobile-menu-btn')) return;

  // Create Toggle Button
  const btn = document.createElement('button');
  btn.id = 'mobile-menu-btn';
  btn.className = 'md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors ml-4';
  btn.innerHTML = '<i class="fas fa-bars"></i>';
  
  // Insert after logo
  const logo = navGroup.querySelector('a');
  if (logo) {
      logo.insertAdjacentElement('afterend', btn);
  } else {
      navGroup.appendChild(btn);
  }

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'mobile-menu-overlay';
  document.body.appendChild(overlay);

  // Menu Drawer
  const menu = document.createElement('div');
  menu.className = 'mobile-menu-content';
  
  // Header
  const header = document.createElement('div');
  header.className = 'flex justify-between items-center mb-8';
  header.innerHTML = `
    <div class="flex items-center gap-2">
         <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xl">S</div>
         <span class="text-xl font-bold text-slate-900">SoloCart</span>
    </div>
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-colors';
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  header.appendChild(closeBtn);
  menu.appendChild(header);

  // Links (Clone from desktop)
  const ul = navGroup.querySelector('ul');
  if (ul) {
      const links = ul.querySelectorAll('a');
      const linkContainer = document.createElement('div');
      linkContainer.className = 'flex flex-col gap-2';
      
      links.forEach(link => {
          const mLink = document.createElement('a');
          mLink.href = link.getAttribute('href'); // Get raw attribute
          mLink.className = 'mobile-nav-link';
          mLink.innerHTML = `<i class="fas fa-chevron-right text-[10px] opacity-40"></i> ${link.textContent}`;
          linkContainer.appendChild(mLink);
      });
      menu.appendChild(linkContainer);
  }

  document.body.appendChild(menu);

  // Logic
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

  btn.addEventListener('click', () => toggle(true));
  closeBtn.addEventListener('click', () => toggle(false));
  overlay.addEventListener('click', () => toggle(false));
}
