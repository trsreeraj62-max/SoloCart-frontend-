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
    const data = await apiCall("/categories");
    const categories =
      data.categories || data.data || (Array.isArray(data) ? data : []);
    currentCategories = Array.isArray(categories) ? categories : [];
    populateCategorySelect(currentCategories);
    // mark categories as available
    window.__solocart_admin_categories_ok = true;
    // ensure add button enabled
    const openProductBtn = document.getElementById("open-add-product-btn");
    if (openProductBtn) openProductBtn.disabled = false;
  } catch (e) {
    console.error("Failed to load categories", e);
    window.__solocart_admin_categories_ok = false;
    const openProductBtn = document.getElementById("open-add-product-btn");
    if (openProductBtn) openProductBtn.disabled = true;
    if (window.showToast)
      window.showToast(
        "Failed to load categories (server unreachable)",
        "error",
      );
    // surface raw error if available
    if (e && e.rawError) console.error("Category fetch raw error:", e.rawError);
  }
}

function populateCategorySelect(categories) {
  const sel = document.getElementById("p-category");
  if (!sel) return;
  // Clear and add default
  sel.innerHTML =
    `<option value="">Select category</option>` +
    categories
      .map((c) => `<option value="${c.id}">${c.name}</option>`)
      .join("");
}
async function fetchProducts() {
  try {
    const data = await apiCall("/admin/products");

    // Handle paginated response: { success: true, data: { data: [...] } }
    const productList =
      data.data?.data ||
      data.data ||
      data.products ||
      (Array.isArray(data) ? data : []);

    if (Array.isArray(productList) && productList.length > 0) {
      currentProducts = productList;
      renderProducts(currentProducts);
    } else {
      // Empty or no products
      currentProducts = [];
      renderProducts(currentProducts);
    }
  } catch (e) {
    console.error("Failed to load admin products", e);
    if (window.showToast) window.showToast("Failed to load products", "error");
    if (e && e.rawError) console.error("Products fetch raw error:", e.rawError);
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
}

function setupEventListeners() {
  // Wire form submit to saveProduct handler
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", saveProduct);
    console.log("✓ Product form submit listener attached");
  } else {
    console.warn("✗ Product form not found in DOM");
  }

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
  // Image file preview handler
  const imageFileInput = document.getElementById("p-image-file");
  if (imageFileInput) {
    imageFileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      const preview = document.getElementById("p-image-preview");
      if (!preview) return;
      if (file) {
        const reader = new FileReader();
        reader.onload = function (ev) {
          preview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        // If cleared, fallback to hidden URL or placeholder
        const hidden = document.getElementById("p-image-url");
        preview.src =
          hidden && hidden.value
            ? hidden.value
            : "https://placehold.co/160x160?text=Preview";
      }
    });
    console.log("✓ Image file input preview listener attached");
  }
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
  console.log("✓ Add Product modal opened");
}

async function saveProduct(e) {
  e.preventDefault();
  console.log("🔹 saveProduct() called - form submitted");

  const id = (document.getElementById("product-id").value || "").toString();
  const name = (document.getElementById("p-name").value || "").trim();
  const description = (
    document.getElementById("p-description").value || ""
  ).trim();
  const price = parseFloat(document.getElementById("p-price").value);
  const stock = parseInt(document.getElementById("p-stock").value);
  const category_id = parseInt(document.getElementById("p-category").value);
  const brand = (document.getElementById("p-brand").value || "").trim();

  console.log("📦 Product Fields:", { name, price, stock, category_id, brand });

  // Basic client-side validation
  if (!name || isNaN(price) || isNaN(stock)) {
    const msg = "Please fill required fields (name, price, stock)";
    console.warn("⚠️  Validation failed:", msg);
    if (window.showToast) window.showToast(msg, "error");
    return;
  }
  if (!category_id || isNaN(category_id)) {
    const msg = "Please select a category";
    console.warn("⚠️  Validation failed:", msg);
    if (window.showToast) window.showToast(msg, "error");
    return;
  }

  console.log("✓ Validation passed");

  // Disable submit button to prevent duplicate clicks
  const form = document.getElementById("product-form");
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
  const endpoint = "/categories";

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
