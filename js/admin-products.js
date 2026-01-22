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
  } catch (e) {
    console.error("Failed to load categories", e);
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
      const imageUrl = p.image_url
        ? p.image_url
        : p.image
          ? `https://solocart-backend.onrender.com/storage/${p.image}`
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
  document.getElementById("p-image").value = product.image_url || "";

  document.getElementById("modal-title").textContent = "Edit Product";
  document.getElementById("productModal").classList.remove("hidden");
}

function openAddModal() {
  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = "";
  document.getElementById("p-category").value = "";
  const newCatInput = document.getElementById("new-category-name");
  if (newCatInput) newCatInput.value = "";
  document.getElementById("modal-title").textContent = "Add New Product";
  document.getElementById("productModal").classList.remove("hidden");
}

async function saveProduct(e) {
  e.preventDefault();

  const id = document.getElementById("product-id").value;
  const productData = {
    name: document.getElementById("p-name").value,
    description: document.getElementById("p-description").value,
    price: parseFloat(document.getElementById("p-price").value),
    stock: parseInt(document.getElementById("p-stock").value),
    category_id: parseInt(document.getElementById("p-category").value),
    brand: document.getElementById("p-brand").value,
    image_url: document.getElementById("p-image").value,
  };

  const endpoint = id ? `/admin/products/${id}` : "/admin/products";

  // Use POST for both, but add _method='PUT' for updates to avoid 405 Method Not Allowed on some server configs
  const method = "POST";
  if (id) {
    productData._method = "PUT";
  }

  try {
    const data = await apiCall(endpoint, {
      method,
      body: JSON.stringify(productData),
    });

    if (data && data.success === true) {
      if (window.showToast)
        window.showToast(`Product ${id ? "updated" : "created"} successfully`);
      document.getElementById("productModal").classList.add("hidden");
      fetchProducts();
    } else {
      console.error("Save Product Failed:", data);
      let errorMessage = data?.message || "Failed to save product";

      // Handle Laravel Validation Errors (if returned as errors object)
      if (data?.errors) {
        const firstError = Object.values(data.errors).flat()[0];
        if (firstError) errorMessage = firstError;
      }

      throw new Error(errorMessage);
    }
  } catch (e) {
    console.error("Failed to save product", e);
    if (window.showToast)
      window.showToast(e.message || "Failed to save product", "error");
  }
}

function setupEventListeners() {
  // Add Product Button
  const addBtn = document.querySelector("button .fa-plus")?.parentElement;
  if (addBtn) {
    addBtn.addEventListener("click", openAddModal);
  }

  // Product Form Submit
  const form = document.getElementById("product-form");
  if (form) {
    form.addEventListener("submit", saveProduct);
  }

  // Add Category Button (inline in modal)
  const addCatBtn = document.getElementById("add-category-btn");
  if (addCatBtn) {
    addCatBtn.addEventListener("click", async () => {
      const input = document.getElementById("new-category-name");
      if (!input) return;
      const name = (input.value || "").trim();
      if (!name) {
        if (window.showToast)
          window.showToast("Enter a category name", "error");
        return;
      }

      try {
        // Try admin create endpoint first
        let res = await apiCall("/admin/categories", {
          method: "POST",
          body: JSON.stringify({ name }),
        });

        // Fallback to public endpoint if admin route not available
        if ((!res || res.success === false) && res && res.statusCode === 405) {
          res = await apiCall("/categories", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
        }

        if (res && (res.success || res.id || res.data)) {
          if (window.showToast) window.showToast("Category added successfully");
          input.value = "";
          // Refresh categories and select the new one if possible
          await fetchCategories();
          // Try to select the created category ID if returned
          const newId = res.id || (res.data && res.data.id) || null;
          if (newId) document.getElementById("p-category").value = newId;
        } else {
          const msg = res?.message || "Failed to add category";
          throw new Error(msg);
        }
      } catch (e) {
        console.error("Failed to add category", e);
        if (window.showToast)
          window.showToast(e.message || "Failed to add category", "error");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initAdminProducts);
