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
    authActions.innerHTML = `
      <div class="flex items-center gap-2">
        <img class="user-avatar w-8 h-8 rounded-full" />
        <span>${user.name || "User"}</span>
      </div>
    `;
    updateHeaderProfileImage();
  } else {
    authActions.innerHTML = `<a href="/login.html">Login</a>`;
  }
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
