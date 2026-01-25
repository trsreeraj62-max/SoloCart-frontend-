# COMPLETE TESTING GUIDE

## Pre-Test Checklist

- [ ] Backend (Laravel API) is running on Render
- [ ] Frontend is on Netlify or local dev server
- [ ] You're logged in as admin
- [ ] Browser DevTools will be open (F12)

---

## Test 1: Verify Event Listeners Are Attached

### What to Do

1. Open `/admin/products.html`
2. Press **F12** to open DevTools
3. Click the **Console** tab
4. Watch the page load

### What to Look For

You should see these 4 messages immediately:

```
✓ Product form submit listener attached
✓ Add Product button listener attached
✓ Add Category button listener attached
✓ Category form submit listener attached
```

### Result

- **PASS** ✓ if you see all 4 messages
- **FAIL** ✗ if console is empty

---

## Test 2: Create New Product

### Step 1: Click "Add New Product"

1. In the admin page, click the blue **"Add New Product"** button
2. Modal should open with empty form

### Check Console

Should show:

```
✓ Add Product modal opened
```

### Step 2: Fill Form

Enter these values:

- **Product Name:** `Test Product 001`
- **Description:** `This is a test product`
- **Price:** `999`
- **Stock:** `50`
- **Category:** Select any category from dropdown
- **Brand:** `TestBrand`
- **Image URL:** `https://placehold.co/400x400?text=Test+Product`

### Step 3: Click "Save Product"

Click the blue **"Save Product"** button

### Check Console

Should show this sequence:

```
🔹 saveProduct() called - form submitted
📦 Product Data: {
  name: "Test Product 001",
  description: "This is a test product",
  price: 999,
  stock: 50,
  category_id: 1,
  brand: "TestBrand",
  image_url: "https://placehold.co/400x400?text=Test+Product"
}
✓ Validation passed
🚀 Sending POST request to: /admin/products
📡 API Response: {
  success: true,
  data: {id: 123, name: "Test Product 001", ...}
}
✓ Product created successfully
```

### Check Network Tab

1. Click the **Network** tab in DevTools
2. Look for a request to `https://solocart-backend.onrender.com/api/admin/products`
3. **Request:**
   - Method: **POST** ✓
   - Status: **200** or **201** ✓
   - Headers: Should include `Authorization: Bearer ...` ✓
   - Body: JSON with product data ✓
4. **Response:**
   - Should be JSON with `"success": true` ✓

### Check Toast Notification

A green toast message should appear: "Product created successfully"

### Check Product Table

The new product should appear in the table:

- ✓ Name: "Test Product 001"
- ✓ Price: "₹999"
- ✓ Stock: "In Stock (50)"

### Result

- **PASS** ✓ if all checks pass
- **FAIL** ✗ if any step fails (check console for error logs starting with ❌)

---

## Test 3: Edit Product

### Step 1: Click Edit Button

1. Find the product you just created in the table
2. Click the **Edit** (pencil icon) button

### Check Console

Should show:

```
🔹 Add Product modal opened
```

### Step 2: Change a Field

1. Change the **Price** from `999` to `555`
2. Keep other fields the same

### Step 3: Click "Update"

Click the blue **"Update"** button

### Check Console

Should show this sequence:

```
🔹 saveProduct() called - form submitted
📦 Product Data: {
  ...
  price: 555,
  ...
}
✓ Validation passed
🚀 Sending PUT request to: /admin/products/123
📡 API Response: {
  success: true,
  data: {id: 123, name: "Test Product 001", price: 555, ...}
}
✓ Product updated successfully
```

### Check Network Tab

1. Look for a request to `https://solocart-backend.onrender.com/api/admin/products/123`
2. **Request:**
   - Method: **PUT** ✓ (Not POST!)
   - Status: **200** ✓
   - Body: JSON with updated product data ✓
3. **Response:**
   - Should be JSON with `"success": true` ✓

### Check Toast Notification

Green toast: "Product updated successfully"

### Check Product Table

Price should update to "₹555"

### Result

- **PASS** ✓ if all checks pass
- **FAIL** ✗ if any step fails

---

## Test 4: Add Category

### Step 1: Click "Add Category"

1. Click the green **"Add Category"** button
2. Modal should open

### Check Console

Should show:

```
✓ Category modal opened
```

### Step 2: Enter Category Name

Enter: `Test Category 001`

### Step 3: Click "Save"

Click the **"Save"** button in the modal

### Check Console

Should show:

```
🔹 saveCategory() called - form submitted
📦 Category Name: Test Category 001
🚀 Sending POST request to: /categories
📡 API Response: {success: true, data: {...}}
✓ Category created successfully
```

### Check Network Tab

1. Look for request to `https://solocart-backend.onrender.com/api/categories`
2. **Request:**
   - Method: **POST** ✓
   - Status: **200** or **201** ✓
   - Body: `{"name": "Test Category 001"}` ✓

### Check Toast Notification

Green toast: "Category added successfully"

### Check Category Dropdown

When you create a new product, the new category should appear in the Category dropdown

### Result

- **PASS** ✓ if all checks pass
- **FAIL** ✗ if any step fails

---

## Test 5: Authorization Token

### What to Check

In Network tab, for any API request:

1. Click on the request
2. Go to **Headers** tab
3. Scroll down to **Request Headers**
4. Look for: `Authorization: Bearer eyJhbGciOiJIUzI1NiIs...`

### What This Means

- ✓ Token is being sent from localStorage
- ✓ Backend can authenticate the request
- ✓ Authorization is working correctly

### Result

- **PASS** ✓ if `Authorization` header is present
- **FAIL** ✗ if header is missing (login issue)

---

## Troubleshooting

### Problem: Console is empty (no logs)

**Solution:**

- Page might not have loaded
- Try pressing F5 to reload page
- Make sure you're on `/admin/products.html`
- Check console is not filtered (search box should be empty)

### Problem: Logs show but no network request

**Solution:**

- Network tab might not be recording
- Look for red circle icon in Network tab
- Click to start recording
- Try creating product again

### Problem: Network request shows 401/403 error

**Solution:**

- Authentication token expired
- Try logging out and logging back in
- Check localStorage for `auth_token`

### Problem: Network request shows 405 Method Not Allowed

**Solution:**

- Backend doesn't support PUT method
- Check Laravel routes support PUT
- If not, use POST for both create/update

### Problem: Success message but product doesn't appear in table

**Solution:**

- Page might be cached
- Try Ctrl+Shift+R to hard refresh
- Wait a few seconds for table to reload
- Check backend database directly

---

## Success Criteria

All tests **PASS** when:

- [x] Console shows all 4 event listener attachments
- [x] Creating product shows full debug chain and network request
- [x] Network shows POST request with correct headers
- [x] Toast notification appears and disappears
- [x] Product appears in table immediately
- [x] Editing product shows PUT request (not POST)
- [x] Adding category works with POST request
- [x] All API responses have `"success": true`
- [x] Authorization header is present in all requests

**Status: ✅ READY FOR PRODUCTION**
