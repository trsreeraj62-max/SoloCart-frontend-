import CONFIG from "./config.js";
import { apiCall } from "./main.js";

let currentCategories = [];
let currentProducts = [];

async function initAdminProducts() {
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

  await fetchCategories();
  await fetchProducts();
  setupEventListeners();
}

async function fetchCategories() {
  try {
    const data = await apiCall("/categories", { timeout: 8000 });
    let categories = [];
    if (data && data.success !== false) {
      categories = data.categories || data.data || (Array.isArray(data) ? data : []);
    } else {
      console.warn("Categories API failure, trying fallback...");
      const homeData = await apiCall("/home-data");
      categories = homeData?.categories || homeData?.data?.categories || [];
    }

    currentCategories = Array.isArray(categories) ? categories : [];
    populateCategorySelect(currentCategories);
    
    // mark categories as available
    window.__solocart_admin_categories_ok = true;
    const openProductBtn = document.getElementById("open-add-product-btn");
    if (openProductBtn) openProductBtn.disabled = false;
  } catch (e) {
    console.error("Failed to load categories", e);
    // Final fallback
    try {
      const homeData = await apiCall("/home-data");
      currentCategories = homeData?.categories || homeData?.data?.categories || [];
      populateCategorySelect(currentCategories);
    } catch (e2) {}

    window.__solocart_admin_categories_ok = false;
    const openProductBtn = document.getElementById("open-add-product-btn");
    if (openProductBtn) openProductBtn.disabled = (currentCategories.length === 0);
  }
}

function populateCategorySelect(categories) {
  const sel = document.getElementById("p-category");
  const filterSel = document.getElementById("products-category-filter");
  
  const optionsHtml = `<option value="">Select category</option>` +
    categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");

  if (sel) sel.innerHTML = optionsHtml;
  if (filterSel) {
    filterSel.innerHTML = `<option value="all">All Categories</option>` +
      categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  }
}
async function fetchProducts() {
  const searchInput = document.querySelector('input[placeholder="Search products..."]');
  const catFilter = document.getElementById("products-category-filter");
  
  const search = searchInput ? searchInput.value.trim() : "";
  const cat = catFilter ? catFilter.value : "all";
  
  let url = "/admin/products?";
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (cat && cat !== "all") url += `category_id=${cat}&`;

  try {
    const data = await apiCall(url);

    // Handle paginated response: { success: true, data: { data: [...] } }
    const productList =
      data.data?.data ||
      data.data ||
      data.products ||
      (Array.isArray(data) ? data : []);

    currentProducts = Array.isArray(productList) ? productList : [];
    renderProducts(currentProducts);
  } catch (e) {
    console.error("Failed to load admin products", e);
    if (window.showToast) window.showToast("Failed to load products", "error");
  }
}

function renderProducts(products) {
  const table = document.getElementById("products-table");
  if (!table) return;

  if (!Array.isArray(products) || products.length === 0) {
    table.innerHTML =
      '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400 italic">No products found. Click "Add New Product" to create one.</td></tr>';
    return;
  }

  table.innerHTML = products
    .map((p) => {
      const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
      const imageUrl = p.image_url
        ? p.image_url
        : p.image
          ? `${backendBase}/storage/${p.image}`
          : "https://placehold.co/400x400?text=No+Image";

      return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <img src="${imageUrl}" class="w-10 h-10 object-contain rounded border" onerror="this.src='https://placehold.co/400x400?text=No+Image'">
                    <div>
                        <span class="block font-bold text-slate-800">${p.name || "Unavailable"}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">ID: ${p.id}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-500">${p.category ? p.category.name : "N/A"}</td>
            <td class="px-6 py-4 font-black">₹${Number(p.price || 0).toLocaleString()}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${p.stock > 0 ? "bg-green-100 text-green-600" : "bg-rose-100 text-rose-600"}">
                    ${p.stock > 0 ? `In Stock (${p.stock})` : "Out of Stock"}
                </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
                <button class="edit-btn text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors" data-id="${p.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
    })
    .join("");

  table
    .querySelectorAll(".edit-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => editProduct(btn.dataset.id)),
    );
  table
    .querySelectorAll(".delete-btn")
    .forEach((btn) =>
      btn.addEventListener("click", () => deleteProduct(btn.dataset.id)),
    );
}
// Validate a form using JS-only rules (ignores native HTML validation)
function validateForm(form) {
  if (!form) return { ok: true };
  const requiredEls = form.querySelectorAll('[data-validate="required"]');
  for (const el of requiredEls) {
    const tag = el.tagName.toLowerCase();
    const val = (el.value || "").toString().trim();
    if (tag === "select") {
      if (!val)
        return {
          ok: false,
          field: el,
          message: "Please complete required fields",
        };
    } else if (val === "") {
      return {
        ok: false,
        field: el,
        message: "Please complete required fields",
      };
    }
  }
  return { ok: true };
}

function normalizeNumberInput(el, fallback = 0) {
  if (!el) return fallback;
  const raw = (el.value || "").toString().trim();
  if (raw === "") {
    el.value = String(fallback);
    return fallback;
  }
  const num = Number(raw);
  if (isNaN(num)) {
    el.value = String(fallback);
    return fallback;
  }
  return num;
}

async function deleteProduct(id) {
  if (!confirm("Permanently delete this product?")) return;

  try {
    const data = await apiCall(`/admin/products/${id}`, { method: "DELETE" });
    if (data && data.success === true) {
      if (window.showToast) window.showToast("Product deleted successfully");
      fetchProducts();
      try {
        localStorage.setItem(
          "solocart_content_updated_at",
          Date.now().toString(),
        );
      } catch (e) {}
    } else {
      throw new Error(data?.message || "Delete failed");
    }
  } catch (e) {
    console.error("Failed to delete product", e);
    if (window.showToast)
      window.showToast(e.message || "Failed to delete product", "error");
  }
}

function editProduct(id) {
  const product = currentProducts.find((p) => p.id == id);
  if (!product) return;

  // Populate form
  document.getElementById("product-id").value = product.id;
  document.getElementById("p-name").value = product.name || "";
  document.getElementById("p-description").value = product.description || "";
  document.getElementById("p-price").value = product.price || 0;
  document.getElementById("p-stock").value = product.stock || 0;
  document.getElementById("p-category").value =
    product.category_id || product.category?.id || "";
  document.getElementById("p-brand").value = product.brand || "";
  // Set existing image URL (hidden) and update preview; clear file input
  const imageUrlInput = document.getElementById("p-image-url");
  const imageFileInput = document.getElementById("p-image-file");
  const previewImg = document.getElementById("p-image-preview");
  const backendBase = CONFIG.API_BASE_URL.replace(/\/api\/?$/i, "");
  const existingImageUrl = product.image_url
    ? product.image_url
    : product.image
      ? `${backendBase}/storage/${product.image}`
      : "";
  if (imageUrlInput) imageUrlInput.value = existingImageUrl;
  if (imageFileInput) imageFileInput.value = "";
  if (previewImg)
    previewImg.src =
      existingImageUrl || "https://placehold.co/160x160?text=Preview";

  document.getElementById("modal-title").textContent = "Edit Product";
  document.getElementById("productModal").classList.remove("hidden");
  // Update save button text
  const saveBtn = document.getElementById("save-product-btn");
  if (saveBtn) saveBtn.innerText = "Update";
}

function setupEventListeners() {
  // Wire form submit to saveProduct handler
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", saveProduct);
    console.log("✓ Product form submit listener attached");

    // Also attach click handler to Save button to ensure submission fires across browsers
    const saveBtn = document.getElementById("save-product-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", (ev) => {
        console.log("🔘 Save button clicked");
        // Use requestSubmit when available to trigger validation + submit event
        if (typeof productForm.requestSubmit === "function") {
          productForm.requestSubmit();
        } else {
          // Fallback: dispatch submit event which our handler will intercept
          productForm.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      console.log("✓ Save button click listener attached");
    } else {
      console.warn("⚠️ Save button (#save-product-btn) not found");
    }
  } else {
    console.warn("✗ Product form not found in DOM");
  }

  // Generic modal close/cancel handlers (safe: buttons are type=button so won't trigger validation)
  document.querySelectorAll(".close-modal, .cancel-modal").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const modalId = btn.dataset.modal;
      if (!modalId) return;
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.add("hidden");
    });
  });

  // Wire "Add New Product" button to open modal
  const openAddBtn = document.getElementById("open-add-product-btn");
  if (openAddBtn) {
    openAddBtn.addEventListener("click", openAddModal);
    console.log("✓ Add Product button listener attached");
  }

  // Wire "Add Category" button to open category modal
  const openCategoryBtn = document.getElementById("open-add-category-btn");
  if (openCategoryBtn) {
    openCategoryBtn.addEventListener("click", () => {
      document.getElementById("categoryModal").classList.remove("hidden");
      console.log("✓ Category modal opened");
    });
    console.log("✓ Add Category button listener attached");
  }

  // Wire category form submit
  const categoryForm = document.getElementById("category-form");
  if (categoryForm) {
    categoryForm.addEventListener("submit", saveCategory);
    console.log("✓ Category form submit listener attached");
  }
  // Discount form handler
  const discountForm = document.getElementById("discount-form");
  if (discountForm) {
    discountForm.addEventListener("submit", saveDiscount);
    console.log("✓ Discount form submit listener attached");
  }
  // Image file preview handler
  const imageFileInput = document.getElementById("p-image-file");
  if (imageFileInput) {
    imageFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      const preview = document.getElementById("p-image-preview");
      if (!preview) return;
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        const hidden = document.getElementById("p-image-url");
        preview.src = hidden && hidden.value ? hidden.value : "https://placehold.co/160x160?text=Preview";
      }
    });
  }

  // Filters
  const sInput = document.querySelector('input[placeholder="Search products..."]');
  if (sInput) {
    sInput.addEventListener("input", debounce(() => fetchProducts(), 500));
  }
  const categoryFilter = document.getElementById("products-category-filter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", () => fetchProducts());
  }
}

// Helper for debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

async function openAddModal() {
  // Ensure categories are fresh before showing modal so required select isn't empty
  try {
    await fetchCategories();
  } catch (e) {
    // ignore
  }

  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
  document.getElementById("p-category").value = "";
  const imageUrlInput = document.getElementById("p-image-url");
  const imageFileInput = document.getElementById("p-image-file");
  const previewImg = document.getElementById("p-image-preview");
  if (imageUrlInput) imageUrlInput.value = "";
  if (imageFileInput) imageFileInput.value = "";
  if (previewImg) previewImg.src = "https://placehold.co/160x160?text=Preview";
  document.getElementById("modal-title").textContent = "Add New Product";
  document.getElementById("productModal").classList.remove("hidden");
  const saveBtn = document.getElementById("save-product-btn");
  if (saveBtn) saveBtn.innerText = "Save Product";
  console.log("✓ Add Product modal opened");
}

async function saveProduct(e) {
  e.preventDefault();
  console.log("🔹 saveProduct() called - form submitted");

  const form = document.getElementById("product-form");
  // JS-only validation
  const v = validateForm(form);
  if (!v.ok) {
    const msg = v.message || "Please complete required fields";
    console.warn("⚠️  Validation failed:", msg);
    if (window.showToast) window.showToast(msg, "error");
    if (v.field) v.field.focus();
    return;
  }

  const id = (document.getElementById("product-id").value || "").toString();
  const name = (document.getElementById("p-name").value || "").trim();
  const description = (
    document.getElementById("p-description").value || ""
  ).trim();
  // Ensure numeric defaults are set before submitting
  const price = normalizeNumberInput(document.getElementById("p-price"), 0);
  const stock = normalizeNumberInput(document.getElementById("p-stock"), 0);
  const categoryRaw = (
    document.getElementById("p-category").value || ""
  ).toString();
  const category_id = isNaN(Number(categoryRaw)) ? 0 : parseInt(categoryRaw);
  const brand = (document.getElementById("p-brand").value || "").trim();

  console.log("📦 Product Fields:", { name, price, stock, category_id, brand });

  // Extra JS checks
  if (!name) {
    const msg = "Please enter product name";
    if (window.showToast) window.showToast(msg, "error");
    return;
  }
  if (!category_id) {
    const msg = "Please select a category";
    if (window.showToast) window.showToast(msg, "error");
    return;
  }

  // Disable submit button to prevent duplicate clicks
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = id ? "Updating..." : "Saving...";
  }

  // Build FormData for multipart upload
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description);
  formData.append("price", String(price));
  formData.append("stock", String(stock));
  formData.append("category_id", String(category_id));
  formData.append("brand", brand);

  const fileInput = document.getElementById("p-image-file");
  const hiddenImageUrl = document.getElementById("p-image-url")?.value || "";
  if (fileInput && fileInput.files && fileInput.files[0]) {
    formData.append("image", fileInput.files[0]);
    console.log("[ADMIN] Image file appended:", fileInput.files[0].name);
  } else if (hiddenImageUrl) {
    formData.append("image_url", hiddenImageUrl);
    console.log("[ADMIN] Preserving existing image_url:", hiddenImageUrl);
  }

  // Debug: log FormData entries (files will show as File objects)
  try {
    for (const entry of formData.entries()) {
      console.log("[ADMIN][FormData]", entry[0], entry[1]);
    }
  } catch (e) {
    console.warn("[ADMIN] Could not enumerate FormData entries", e);
  }

  const endpoint = id ? `/admin/products/${id}` : "/admin/products";
  if (id) formData.append("_method", "PUT");

  try {
    console.log(
      `🚀 Sending multipart request to: ${endpoint} (id: ${id || "new"})`,
    );
    const data = await apiCall(endpoint, {
      method: "POST",
      body: formData,
    });

    console.log("📡 API Response:", data);

    if (data && data.success === true) {
      const msg = `Product ${id ? "updated" : "created"} successfully`;
      console.log("✓ " + msg);
      if (window.showToast) window.showToast(msg);
      document.getElementById("productModal").classList.add("hidden");
      await fetchProducts();
      try {
        localStorage.setItem(
          "solocart_content_updated_at",
          Date.now().toString(),
        );
      } catch (e) {
        /* ignore */
      }
    } else {
      console.error("❌ Save Product Failed:", data);
      let errorMessage = data?.message || "Failed to save product";
      if (data?.errors) {
        const firstError = Object.values(data.errors).flat()[0];
        if (firstError) errorMessage = firstError;
      }
      console.error("Error message:", errorMessage);
      if (window.showToast) window.showToast(errorMessage, "error");
    }
  } catch (e) {
    console.error("❌ Failed to save product (exception):", e);
    const msg = e && e.message ? e.message : "Failed to save product";
    if (window.showToast) window.showToast(msg, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = id ? "Update" : "Save Product";
    }
  }
}

// Discount form submit handler
async function saveDiscount(e) {
  e.preventDefault();
  const form = document.getElementById("discount-form");
  const v = validateForm(form);
  if (!v.ok) {
    const msg = v.message || "Please complete required fields";
    if (window.showToast) window.showToast(msg, "error");
    return;
  }

  // Ensure discount percent defaults to 0 if empty
  const percentEl = document.getElementById("discount-percent");
  const percent = normalizeNumberInput(percentEl, 0);
  const categoryValue = (
    document.getElementById("discount-category").value || "all"
  ).toString();
  const startDate = document.getElementById("discount-start")?.value;
  const endDate = document.getElementById("discount-end")?.value;

  const payload = {
    discount_percent: percent,
    discount_start_date: startDate || null,
    discount_end_date: endDate || null
  };

  if (categoryValue !== "all") {
    payload.category_id = categoryValue;
  }

  try {
    const data = await apiCall("/admin/discounts/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (data && data.success === true) {
      if (window.showToast) window.showToast("Discount applied");
      document.getElementById("discountModal").classList.add("hidden");
    } else {
      const msg = data?.message || "Failed to apply discount";
      if (window.showToast) window.showToast(msg, "error");
    }
  } catch (err) {
    console.error("Failed to save discount", err);
    if (window.showToast)
      window.showToast(err.message || "Failed to apply discount", "error");
  }
}

async function saveCategory(e) {
  e.preventDefault();
  console.log("🔹 saveCategory() called - form submitted");

  const categoryName = document.getElementById("category-name").value;
  console.log("📦 Category Name:", categoryName);

  if (!categoryName || categoryName.trim() === "") {
    console.warn("⚠️  Validation failed: Category name is empty");
    if (window.showToast)
      window.showToast("Please enter a category name", "error");
    return;
  }

  const categoryData = { name: categoryName };
  const endpoint = "/admin/categories";

  console.log(`🚀 Sending POST request to: ${endpoint}`);

  try {
    const data = await apiCall(endpoint, {
      method: "POST",
      body: JSON.stringify(categoryData),
    });

    console.log("📡 API Response:", data);

    if (data && data.success === true) {
      console.log("✓ Category created successfully");
      if (window.showToast) window.showToast("Category added successfully");
      document.getElementById("categoryModal").classList.add("hidden");
      document.getElementById("category-form").reset();
      await fetchCategories(); // Refresh categories for next product
    } else {
      console.error("❌ Save Category Failed:", data);
      const msg = data?.message || "Failed to add category";
      console.error("Error message:", msg);
      if (window.showToast) window.showToast(msg, "error");
    }
  } catch (e) {
    console.error("❌ Failed to save category (exception):", e);
    const msg = e && e.message ? e.message : "Failed to add category";
    if (window.showToast) window.showToast(msg, "error");
  }
}

// Ensure all blocks are properly closed

document.addEventListener("DOMContentLoaded", initAdminProducts);
