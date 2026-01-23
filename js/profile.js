import CONFIG from "./config.js";
import { getAuthToken, apiCall, safeJSONParse } from "./main.js";

async function initProfile() {
  const token = getAuthToken();
  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const userData = safeJSONParse(localStorage.getItem("user_data"), {});
  const displayName = document.getElementById("user-display-name");
  const initials = document.getElementById("user-initials");

  if (displayName) displayName.innerText = userData.name || "User";
  if (initials && userData.name)
    initials.innerText = userData.name.charAt(0).toUpperCase();

  if (document.getElementById("p-name"))
    document.getElementById("p-name").value = userData.name || "";
  if (document.getElementById("p-email"))
    document.getElementById("p-email").value = userData.email || "";
  if (document.getElementById("p-bio"))
    document.getElementById("p-bio").value = userData.bio || "";
  if (document.getElementById("p-phone"))
    document.getElementById("p-phone").value = userData.phone || "";
  const profileImg = document.getElementById("p-image-preview");
  if (profileImg)
    profileImg.src =
      userData.profile_image || userData.avatar || profileImg.src;
  // Preview change handler
  const fileInput = document.getElementById("p-image-file");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (profileImg) profileImg.src = ev.target.result;
      };
      reader.readAsDataURL(f);
    });
  }

  setupEventListeners();
}

function setupEventListeners() {
  document
    .getElementById("profile-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Clear previous field errors
      document.querySelectorAll(".field-error")?.forEach((el) => el.remove());

      const name = document.getElementById("p-name")?.value?.trim();
      const bio = document.getElementById("p-bio")?.value?.trim();
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
      fd.append("bio", bio || "");
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
            localStorage.setItem("user_data", JSON.stringify(user));
            if (window.showToast)
              window.showToast("Profile updated successfully");
            const displayName = document.getElementById("user-display-name");
            if (displayName) displayName.innerText = user.name || name;
            // update preview if backend sent image path
            const profileImg = document.getElementById("p-image-preview");
            if (profileImg && user.profile_image)
              profileImg.src = user.profile_image;
          } else {
            if (window.showToast)
              window.showToast("Profile updated", "success");
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
