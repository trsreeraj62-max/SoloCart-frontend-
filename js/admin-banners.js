import CONFIG from "./config.js";
import { apiCall } from "./main.js";

let banners = [];

async function initAdminBanners() {
  const token = localStorage.getItem("auth_token");
  const user = JSON.parse(localStorage.getItem("user_data") || "{}");
  if (
    !token ||
    !(
      user.role === "admin" ||
      user.role === "Admin" ||
      user.is_admin === true ||
      user.is_admin === 1
    )
  ) {
    window.location.href = "/login.html";
    return;
  }

  await fetchBanners();
}

async function fetchBanners() {
  try {
    const data = await apiCall("/admin/banners");
    // Handle response structure: { success: true, data: [...] }
    const bannerList =
      data.data || data.banners || (Array.isArray(data) ? data : []);

    if (Array.isArray(bannerList) && bannerList.length > 0) {
      banners = bannerList;
      renderBanners(banners);
    } else {
      // If empty or invalid, maybe trigger mock if API seemed to fail (no success flag)
      if (data && data.success === false)
        throw new Error("API reported failure");
      // If it's just empty list, that's valid. But if 404/error, apiCall might return {success:false}
      renderBanners([]);
    }
  } catch (e) {
    console.error("Failed to load admin banners", e);
    if (window.showToast)
      window.showToast("Failed to load banners from server", "error");
  }
}

function renderBanners(list) {
  const grid = document.getElementById("banners-grid");
  if (!grid || !Array.isArray(list)) return;

  grid.innerHTML = list
    .map((b) => {
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = b.image_url
        ? b.image_url.replace(/^http:/, "https:")
        : b.image
          ? `${backendBase}/storage/${b.image}`
          : "https://placehold.co/1600x400?text=Banner";

      return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group">
            <div class="h-40 bg-slate-100 relative overflow-hidden">
                <img src="${imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onerror="this.src='https://placehold.co/1600x400?text=Banner'">
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                      b.status === 'active' ? 'bg-green-500 text-white' : 
                      b.status === 'scheduled' ? 'bg-blue-500 text-white' :
                      b.status === 'expired' ? 'bg-slate-500 text-white' :
                      'bg-rose-500 text-white'
                    }">
                        ${b.status || "unknown"}
                    </span>
                </div>
            </div>
            <div class="p-4">
                <h4 class="text-sm font-bold text-slate-800 mb-1">${b.title || "Untitled Banner"}</h4>
                <div class="flex justify-between items-center mt-4">
                    <button class="edit-btn text-xs font-black uppercase tracking-widest text-[#2874f0]" data-id="${b.id}">Edit Configuration</button>
                    <button class="delete-btn text-rose-500 text-sm" data-id="${b.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        </div>
    `;
    })
    .join("");

  grid
    .querySelectorAll(".edit-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => editBanner(btn.dataset.id)),
    );
  grid
    .querySelectorAll(".delete-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteBanner(btn.dataset.id)),
    );
}

async function deleteBanner(id) {
  if (!confirm("Abort banner projection?")) return;
  try {
    const data = await apiCall(`/admin/banners/${id}`, { method: "DELETE" });
    if (data && data.success === true) {
      fetchBanners();
      // Signal buyer pages to refresh banners
      try {
        localStorage.setItem(
          "solocart_content_updated_at",
          Date.now().toString(),
        );
      } catch (e) {}
    } else {
      throw new Error("API Error or Method Not Allowed");
    }
  } catch (e) {
    console.error("Failed to delete banner", e);
    if (window.showToast) window.showToast("Failed to delete banner", "error");
  }
}

function editBanner(id) {
  const b = banners.find((x) => x.id == id);
  if (!b) return;
  if (document.getElementById("banner-id"))
    document.getElementById("banner-id").value = b.id;
  if (document.getElementById("b-title"))
    document.getElementById("b-title").value = b.title || "";
  if (document.getElementById("b-url"))
    document.getElementById("b-url").value = b.image_url || "";
  if (document.getElementById("b-status"))
    document.getElementById("b-status").value = b.status || "active";
  
  if (document.getElementById("b-start"))
    document.getElementById("b-start").value = b.start_at ? b.start_at.substring(0, 16) : "";
  if (document.getElementById("b-end"))
    document.getElementById("b-end").value = b.end_at ? b.end_at.substring(0, 16) : "";

  document.getElementById("bannerModal")?.classList.remove("hidden");
}

document.getElementById("add-banner-btn")?.addEventListener("click", () => {
  document.getElementById("banner-form")?.reset();
  if (document.getElementById("banner-id"))
    document.getElementById("banner-id").value = "";
  document.getElementById("bannerModal")?.classList.remove("hidden");
});

document
  .getElementById("banner-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("banner-id")?.value;
    const title = document.getElementById("b-title")?.value;
    const imageUrl = document.getElementById("b-url")?.value;
    const status = document.getElementById("b-status")?.value;
    const startDate = document.getElementById("b-start")?.value;
    const endDate = document.getElementById("b-end")?.value;
    const fileInput = document.getElementById("b-image");
    const file =
      fileInput?.files && fileInput.files[0] ? fileInput.files[0] : null;

    const endpoint = id ? `/admin/banners/${id}` : "/admin/banners";
    const method = id ? "PUT" : "POST";

    try {
      let data;
      if (file) {
        // Prefer sending multipart/form-data with file field 'image' when a file is selected.
        const fd = new FormData();
        if (title) fd.append("title", title);
        fd.append("image", file);
        if (status) fd.append("is_active", status === "active" ? 1 : 0);
        if (startDate) fd.append("start_at", startDate);
        if (endDate) fd.append("end_at", endDate);
        // If backend expects POST with _method override for PUT, include it
        if (method === "PUT") fd.append("_method", "PUT");

        data = await apiCall(endpoint, {
          method: method === "PUT" ? "POST" : method,
          body: fd,
        });
      } else {
        // No file selected: send JSON with image_url (backend may require image field name 'image')
        const bodyData = { 
            title, 
            image_url: imageUrl, 
            is_active: status === "active" ? 1 : 0,
            start_at: startDate || null,
            end_at: endDate || null
        };
        data = await apiCall(endpoint, {
          method,
          body: JSON.stringify(bodyData),
        });
      }

      if (data && data.success === true) {
        if (window.closeModal) window.closeModal();
        else document.getElementById("bannerModal")?.classList.add("hidden");
        fetchBanners();
        // Signal buyer pages to refresh banners
        try {
          localStorage.setItem(
            "solocart_content_updated_at",
            Date.now().toString(),
          );
        } catch (e) {}
      } else {
        // Handle Validation Errors
        let errorMessage = data?.message || "Failed to save banner";
        if (data?.errors) {
          const firstError = Object.values(data.errors).flat()[0];
          if (firstError) errorMessage = firstError;
        }
        throw new Error(errorMessage);
      }
    } catch (e) {
      console.error("Failed to save banner", e);
      if (window.showToast)
        window.showToast(e.message || "Failed to save banner", "error");
    }
  });

document.addEventListener("DOMContentLoaded", initAdminBanners);
