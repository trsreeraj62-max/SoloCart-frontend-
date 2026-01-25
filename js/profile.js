import CONFIG from "./config.js";
import {
  getAuthToken,
  apiCall,
  safeJSONParse,
  updateHeaderProfileImage,
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
    if (document.getElementById("p-phone"))
      document.getElementById("p-phone").value = user.phone || "";

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

      // Basic validation
      if (!name) {
        if (window.showToast) window.showToast("Name is required", "error");
        return;
      }

      // Build FormData
      const fd = new FormData();
      fd.append("name", name);
      fd.append("phone", phone || "");

      if (fileInput && fileInput.files && fileInput.files[0]) {
        fd.append("profile_image", fileInput.files[0]);
        console.log(
          "[Profile] Appended profile_image:",
          fileInput.files[0].name,
        );
      }

      try {
        console.log("[Profile] Sending FormData to /profile/update");
        const data = await apiCall("/profile/update", {
          method: "POST",
          body: fd,
          requireAuth: true,
        });

        console.log("[Profile] Response:", data);

        if (data && (data.user || data.success)) {
          const user = data.user || (data.data && data.data.user) || null;
          if (user) {
            // Persist canonical profile for other pages
            try {
              localStorage.setItem("user_profile", JSON.stringify(user));
              localStorage.setItem("user_data", JSON.stringify(user));
            } catch (e) {}
            if (window.showToast)
              window.showToast("Profile updated successfully");
            const displayName = document.getElementById("user-display-name");
            if (displayName) displayName.innerText = user.name || name;
            // Re-fetch profile to ensure all UI is rebuilt from backend
            await loadProfile();
            try {
              updateHeaderProfileImage();
            } catch (e) {}

            // Persist avatar URL separately for quick global access and update all avatar elements
            try {
              const stored = JSON.parse(
                localStorage.getItem("user_profile") || "null",
              );
              let avatar =
                stored &&
                (stored.profile_image || stored.avatar || stored.image_url)
                  ? stored.profile_image || stored.avatar || stored.image_url
                  : null;
              if (avatar) {
                const backendBase = CONFIG.API_BASE_URL.replace(
                  /\/api\/?$/i,
                  "",
                );
                if (!/^https?:\/\//i.test(avatar))
                  avatar = `${backendBase}/${String(avatar).replace(/^\//, "")}`;
                avatar = String(avatar).replace(/^http:/, "https:");
                localStorage.setItem("profile_avatar", avatar);
              } else {
                localStorage.removeItem("profile_avatar");
              }
            } catch (err) {
              console.warn("Could not persist profile avatar:", err);
            }
            // Trigger refresh
            window.location.reload();
          } else {
            if (window.showToast)
              window.showToast("Profile updated successfully");
            setTimeout(() => window.location.reload(), 1000);
          }
        } else {
          // show validation errors if present
          if (data && data.errors) {
            Object.keys(data.errors).forEach((field) => {
              const el =
                document.getElementById(`p-${field}`) ||
                document.getElementById(field);
              const msg = data.errors[field].flat
                ? data.errors[field].flat()[0]
                : data.errors[field][0];
              if (el) {
                const err = document.createElement("div");
                err.className = "field-error text-rose-500 text-xs mt-1";
                err.innerText = msg;
                el.parentNode?.appendChild(err);
              } else {
                if (window.showToast) window.showToast(msg, "error");
              }
            });
          } else {
            const msg = data?.message || "Profile update failed";
            if (window.showToast) window.showToast(msg, "error");
          }
        }
      } catch (err) {
        console.error("Profile update failed:", err);
        if (window.showToast)
          window.showToast("Network error. Try again.", "error");
      }
    });

  document.getElementById("profile-logout")?.addEventListener("click", () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    window.location.href = "/index.html";
  });
}

document.addEventListener("DOMContentLoaded", initProfile);
