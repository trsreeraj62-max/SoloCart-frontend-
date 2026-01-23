# EXACT CODE CHANGES - BEFORE & AFTER

## File: `js/admin-products.js`

---

## CHANGE 1: Added Missing `setupEventListeners()` Function

### BEFORE (Line 25):

```javascript
await fetchCategories();
await fetchProducts();
setupEventListeners(); // ← CALLED BUT NOT DEFINED!
```

### AFTER (Lines 174-225):

```javascript
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
}
```

**What this does:**

- ✓ Attaches submit event to `product-form` → calls `saveProduct()`
- ✓ Attaches click event to "Add New Product" button → calls `openAddModal()`
- ✓ Attaches click event to "Add Category" button → opens modal
- ✓ Attaches submit event to `category-form` → calls `saveCategory()`
- ✓ Logs each attachment to console for debugging

---

## CHANGE 2: Moved & Enhanced `openAddModal()` Function

### AFTER (Lines 227-242):

```javascript
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
  document.getElementById("p-image").value = "";
  document.getElementById("modal-title").textContent = "Add New Product";
  document.getElementById("productModal").classList.remove("hidden");
  console.log("✓ Add Product modal opened");
}
```

**Added:**

- ✓ Console log when modal opens

---

## CHANGE 3: Enhanced `saveProduct()` Function with Logging & HTTP Fix

### BEFORE (Lines 207-256):

```javascript
async function saveProduct(e) {
  e.preventDefault();
  // ... no logging ...

  const endpoint = id ? `/admin/products/${id}` : "/admin/products";

  // Use POST for both, but add _method='PUT' for updates
  const method = "POST";  // ← ALWAYS POST!
  if (id) {
    productData._method = "PUT";  // ← WORKAROUND
  }

  try {
    const data = await apiCall(endpoint, {
      method,  // ← Always "POST"
      body: JSON.stringify(productData),
    });
```

### AFTER (Lines 244-337):

```javascript
async function saveProduct(e) {
  e.preventDefault();
  console.log("🔹 saveProduct() called - form submitted");

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

  console.log("📦 Product Data:", productData);

  // Basic client-side validation
  if (
    !productData.name ||
    isNaN(productData.price) ||
    isNaN(productData.stock)
  ) {
    const msg = "Please fill required fields (name, price, stock)";
    console.warn("⚠️  Validation failed:", msg);
    if (window.showToast) window.showToast(msg, "error");
    return;
  }
  if (!productData.category_id || isNaN(productData.category_id)) {
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

  const endpoint = id ? `/admin/products/${id}` : "/admin/products";

  // Use PUT for updates, POST for creation
  const method = id ? "PUT" : "POST"; // ← FIXED!
  console.log(`🚀 Sending ${method} request to: ${endpoint}`);

  try {
    const data = await apiCall(endpoint, {
      method, // ← Now correct: POST or PUT
      body: JSON.stringify(productData),
    });

    console.log("📡 API Response:", data);

    if (data && data.success === true) {
      const msg = `Product ${id ? "updated" : "created"} successfully`;
      console.log("✓ " + msg);
      if (window.showToast) window.showToast(msg);
      document.getElementById("productModal").classList.add("hidden");
      fetchProducts();
      // Signal buyer pages to refresh their content
      try {
        localStorage.setItem(
          "solocart_content_updated_at",
          Date.now().toString(),
        );
      } catch (e) {
        /* ignore */
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = id ? "Update" : "Save Product";
      }
    } else {
      console.error("❌ Save Product Failed:", data);
      let errorMessage = data?.message || "Failed to save product";

      // Handle Laravel Validation Errors (if returned as errors object)
      if (data?.errors) {
        const firstError = Object.values(data.errors).flat()[0];
        if (firstError) errorMessage = firstError;
      }

      console.error("Error message:", errorMessage);
      if (window.showToast) window.showToast(errorMessage, "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = id ? "Update" : "Save Product";
      }
    }
  } catch (e) {
    console.error("❌ Failed to save product (exception):", e);
    const msg = e && e.message ? e.message : "Failed to save product";
    if (window.showToast) window.showToast(msg, "error");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = id ? "Update" : "Save Product";
    }
  }
}
```

**Key Changes:**

1. ✓ Removed `_method = "PUT"` workaround
2. ✓ Use correct HTTP method: `const method = id ? "PUT" : "POST"`
3. ✓ Added console logging at every step:
   - `🔹` = Function entry
   - `📦` = Data collected
   - `⚠️` = Validation errors
   - `✓` = Success
   - `🚀` = Request sent
   - `📡` = Response received
   - `❌` = Errors

---

## CHANGE 4: Created Missing `saveCategory()` Function

### ADDED (Lines 339-375):

```javascript
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
```

**What this does:**

- ✓ Handles category creation
- ✓ Was referenced in `setupEventListeners()` but didn't exist
- ✓ Includes same logging pattern as `saveProduct()`
- ✓ Refreshes category dropdown after creation

---

## SUMMARY OF CHANGES

| Function                | Action                         | Lines   |
| ----------------------- | ------------------------------ | ------- |
| `setupEventListeners()` | **CREATED**                    | 174-225 |
| `openAddModal()`        | Enhanced (added console log)   | 227-242 |
| `saveProduct()`         | **FIXED** (HTTP method + logs) | 244-337 |
| `saveCategory()`        | **CREATED**                    | 339-375 |

---

## HTML FILE - NO CHANGES NEEDED

`admin/products.html` is perfectly fine. The form already has:

- ✓ `id="product-form"`
- ✓ `type="submit"` button
- ✓ All required input fields

The HTML just needed the JavaScript to attach event listeners.

---

## TOTAL CHANGES

- ✓ **1 function created** (`setupEventListeners`)
- ✓ **1 function fixed** (`saveProduct` - HTTP method + logging)
- ✓ **1 function created** (`saveCategory`)
- ✓ **1 function enhanced** (`openAddModal` - added logging)
- ✓ **0 HTML changes needed**
- ✓ **Lines added:** ~160
- ✓ **Breaking changes:** None
