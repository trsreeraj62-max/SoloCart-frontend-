import CONFIG from "./config.js";
import {
  getAuthToken,
  apiCall,
  safeJSONParse,
  updateHeaderProfileImage,
  validatePassword,
  validatePhone,
} from "./main.js";

async function initProfile() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }
  // Always fetch the authoritative profile on page load
  await loadProfile();

  // Update header avatars from stored profile
  try {
    updateHeaderProfileImage();
  } catch (e) {}

  // Preview change handler (local preview before upload)
  const fileInput = document.getElementById("p-image-file");
  // Select preview element once (production-safe). If missing, skip preview behavior.
  const previewEl = document.getElementById("p-image-preview");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      // Only attempt preview when an <img> preview exists
      if (!previewEl) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          previewEl.src = ev.target.result;
        } catch (err) {
          console.error("Profile preview failed:", err);
        }
      };
      reader.readAsDataURL(f);
    });
  }

  setupEventListeners();
}

// Fetch fresh profile from backend and populate DOM
export async function loadProfile() {
  let user = null;
  try {
    const data = await apiCall("/profile", { requireAuth: true });
    console.log("[Profile] GET /profile response:", data);

    if (data && data.success !== false) {
      if (data.user) user = data.user;
      else if (data.data && data.data.user) user = data.data.user;
      else if (data.profile) user = data.profile;
      else if (data.data && typeof data.data === "object" && (data.data.name || data.data.email)) user = data.data;
      else user = data;
    }
  } catch (err) {
    console.warn("[Profile] API fetch failed, falling back to storage");
  }

  // Fallback to localStorage if API failed or returned empty
  if (!user || (!user.name && !user.email)) {
    user = safeJSONParse(localStorage.getItem("user_profile"), null) || 
           safeJSONParse(localStorage.getItem("user_data"), null);
  }

  if (user) {
    try {
      localStorage.setItem("user_profile", JSON.stringify(user));
      localStorage.setItem("user_data", JSON.stringify(user));
    } catch (e) {}
    populateUI(user);
  } else {
    console.error("[Profile] Critical: No user data available.");
  }
}

function populateUI(user) {
    // Update DOM fields
    const displayName = document.getElementById("user-display-name");
    const initials = document.getElementById("user-initials");
    if (displayName) displayName.innerText = user.name || user.full_name || "User";
    if (initials && (user.name || user.full_name))
      initials.innerText = (user.name || user.full_name).charAt(0).toUpperCase();

    if (document.getElementById("p-name"))
      document.getElementById("p-name").value = user.name || "";
    if (document.getElementById("p-email"))
      document.getElementById("p-email").value = user.email || "";
    
    // Support both 'phone' and 'phone_number' from backend
    const phoneVal = user.phone || user.phone_number || "";
    if (document.getElementById("p-phone"))
      document.getElementById("p-phone").value = phoneVal;

    // Handle profile image URL
    const profileImg = document.getElementById("p-image-preview");
    let avatarUrl = user.profile_image || user.avatar || user.image_url || null;
    if (avatarUrl) {
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      if (!/^https?:\/\//i.test(avatarUrl))
        avatarUrl = `${backendBase}/${String(avatarUrl).replace(/^\//, "")}`;
      avatarUrl = String(avatarUrl).replace(/^http:/, "https:");
      if (profileImg) profileImg.src = avatarUrl;
      const sidebarImg = document.getElementById("user-profile-circle");
      if (sidebarImg) {
        sidebarImg.src = avatarUrl;
        sidebarImg.classList.remove("hidden");
      }
      if (initials) initials.classList.add("hidden");
    } else {
      if (profileImg) profileImg.src = "https://placehold.co/80x80?text=Preview";
      const sidebarImg = document.getElementById("user-profile-circle");
      if (sidebarImg) sidebarImg.classList.add("hidden");
      if (initials) initials.classList.remove("hidden");
    }
}

function setupEventListeners() {
  document
    .getElementById("profile-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Clear previous field errors
      document.querySelectorAll(".field-error")?.forEach((el) => el.remove());

      const name = document.getElementById("p-name")?.value?.trim();
      const phone = document.getElementById("p-phone")?.value?.trim();

      const fileInput = document.getElementById("p-image-file");

      // Validations
      if (!name) {
        if (window.showToast) window.showToast("Name is required", "error");
        return;
      }

      const phoneCheck = validatePhone(phone);
      if (!phoneCheck.valid) {
        if (window.showToast) window.showToast(phoneCheck.message, "error");
        return;
      }



      // Build FormData
      const fd = new FormData();
      fd.append("name", name);
      fd.append("phone", phoneCheck.cleaned);
      // Backend might expect phone_number too, let's play safe if we don't know the exact Laravel field
      fd.append("phone_number", phoneCheck.cleaned);
      


      if (fileInput && fileInput.files && fileInput.files[0]) {
        fd.append("profile_image", fileInput.files[0]);
      }

      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.innerText = "SAVING...";
      }

      try {
        const data = await apiCall("/profile/update", {
          method: "POST",
          body: fd,
          requireAuth: true,
        });

        if (data && (data.user || data.success)) {
          const user = data.user || (data.data && data.data.user) || null;
          if (user) {
            localStorage.setItem("user_profile", JSON.stringify(user));
            localStorage.setItem("user_data", JSON.stringify(user));
            if (window.showToast) window.showToast("Profile updated successfully");
            
            // Re-fetch and update UI
            await loadProfile();
            updateHeaderProfileImage();
            
            setTimeout(() => window.location.reload(), 1000);
          } else {
            if (window.showToast) window.showToast("Profile updated successfully");
            setTimeout(() => window.location.reload(), 1000);
          }
        } else {
          if (data && data.errors) {
            Object.keys(data.errors).forEach((field) => {
              const msg = Array.isArray(data.errors[field]) ? data.errors[field][0] : data.errors[field];
              if (window.showToast) window.showToast(msg, "error");
            });
          } else {
            const msg = data?.message || "Profile update failed";
            if (window.showToast) window.showToast(msg, "error");
          }
        }
      } catch (err) {
        console.error("Profile update failed:", err);
        if (window.showToast) window.showToast("Network error. Try again.", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = "SAVE SETTINGS";
        }
      }
    });

  document.getElementById("profile-logout")?.addEventListener("click", () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("user_profile");
    window.location.href = "/index.html";
  });
}

document.addEventListener("DOMContentLoaded", initProfile);
