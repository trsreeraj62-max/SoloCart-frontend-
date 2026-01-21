# 📡 SoloCart API Endpoints Reference

**Base URL**: `https://solocart-backend.onrender.com/api`

---

## 🌍 Public Endpoints (No Authentication Required)

### Health Check
```javascript
GET /api/health
```
**Response**:
```json
{
  "status": "ok",
  "message": "API is running"
}
```

### Home Page Data
```javascript
GET /api/home-data
```
**Description**: Get all data needed for home page (banners, categories, featured/latest products)

**Response**:
```json
{
  "banners": [...],
  "categories": [...],
  "featured_products": [...],
  "latest_products": [...]
}
```

### Products

#### List All Products
```javascript
GET /api/products?page=1&per_page=20&category_id=1&search=laptop
```
**Query Parameters**:
- `page` (optional): Page number for pagination
- `per_page` (optional): Items per page (default: 20)
- `category_id` (optional): Filter by category
- `search` (optional): Search by product name

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Product Name",
      "slug": "product-name",
      "description": "...",
      "price": 29999,
      "discount_percent": 20,
      "stock_quantity": 50,
      "image": "products/image.jpg",
      "image_url": "https://...full-url.jpg",
      "category": {...}
    }
  ],
  "meta": {
    "current_page": 1,
    "total": 100,
    "per_page": 20
  }
}
```

#### Get Single Product
```javascript
GET /api/products/{id}
GET /api/products/{slug}
```
**Response**:
```json
{
  "id": 1,
  "name": "Product Name",
  "slug": "product-name",
  "description": "Full description...",
  "price": 29999,
  "discount_percent": 20,
  "stock_quantity": 50,
  "image": "products/image.jpg",
  "image_url": "https://...full-url.jpg",
  "category": {
    "id": 1,
    "name": "Electronics"
  }
}
```

#### Get Similar Products
```javascript
GET /api/products/{id}/similar
```
**Response**: Array of similar products (same category)

### Categories

#### List All Categories
```javascript
GET /api/categories
```
**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "description": "..."
    }
  ]
}
```

### Banners

#### List Active Banners
```javascript
GET /api/banners
```
**Response**:
```json
{
  "banners": [
    {
      "id": 1,
      "title": "Banner Title",
      "subtitle": "Banner Subtitle",
      "image": "banners/banner.jpg",
      "image_url": "https://...full-url.jpg",
      "link": "/shop"
    }
  ]
}
```

### Contact Form

#### Submit Contact Form
```javascript
POST /api/contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Your message here"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Thank you for contacting us!"
}
```

---

## 🔐 Authentication Endpoints

### Register
```javascript
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```
**Response**:
```json
{
  "success": true,
  "message": "User successfully registered",
  "user": {...}
}
```

### Login (Request OTP)
```javascript
POST /api/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response**:
```json
{
  "message": "OTP sent to your email",
  "temp_token": "temporary-token"
}
```

### Verify OTP
```javascript
POST /api/otp/verify
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```
**Response**:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "token": "your-auth-token",
  "access_token": "your-auth-token",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

### Resend OTP
```javascript
POST /api/otp/resend
Content-Type: application/json

{
  "email": "john@example.com"
}
```
**Response**:
```json
{
  "success": true,
  "message": "OTP resent successfully"
}
```

---

## 👤 User Endpoints (Requires Authentication)

**All requests must include**:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_TOKEN',
  'Accept': 'application/json',
  'Content-Type': 'application/json'
}
```

### Get Current User
```javascript
GET /api/user
```
**Response**:
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "customer",
  "is_admin": false
}
```

### Logout
```javascript
POST /api/logout
```
**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 🛒 Cart Endpoints (Requires Authentication)

### Get Cart
```javascript
GET /api/cart
```
**Response**:
```json
{
  "id": 1,
  "user_id": 1,
  "items": [
    {
      "id": 1,
      "product_id": 10,
      "quantity": 2,
      "product": {
        "id": 10,
        "name": "Product Name",
        "price": 29999,
        "image_url": "https://..."
      }
    }
  ],
  "total_items": 3,
  "total_price": 89997,
  "total_mrp": 112496
}
```

### Add to Cart
```javascript
POST /api/cart/add
Content-Type: application/json

{
  "product_id": 10,
  "quantity": 1
}
```
**Response**:
```json
{
  "success": true,
  "message": "Product added to cart",
  "cart_item": {...}
}
```

### Update Cart Item Quantity
```javascript
POST /api/cart/update
Content-Type: application/json

{
  "item_id": 1,
  "increment": true  // or false to decrement
}
```
**Alternative**:
```javascript
PUT /api/cart/{item_id}
Content-Type: application/json

{
  "quantity": 3
}
```

### Remove from Cart
```javascript
POST /api/cart/remove
Content-Type: application/json

{
  "item_id": 1
}
```
**Alternative**:
```javascript
DELETE /api/cart/{item_id}
```

### Clear Cart
```javascript
POST /api/cart/clear
```
**Response**:
```json
{
  "success": true,
  "message": "Cart cleared"
}
```

---

## 💳 Checkout Endpoints (Requires Authentication)

### Checkout Entire Cart
```javascript
POST /api/checkout/cart
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "address": "123 Main St",
  "city": "City",
  "state": "State",
  "pincode": "123456",
  "payment_method": "cod"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "id": 1,
    "order_number": "ORD-20260121-001",
    "total": 89997,
    "status": "pending"
  }
}
```

### Direct Checkout (Single Product)
```javascript
POST /api/checkout/single
Content-Type: application/json

{
  "product_id": 10,
  "quantity": 1,
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "address": "123 Main St",
  "city": "City",
  "state": "State",
  "pincode": "123456",
  "payment_method": "cod"
}
```

---

## 📦 Orders Endpoints (Requires Authentication)

### List User Orders
```javascript
GET /api/orders
```
**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "order_number": "ORD-20260121-001",
      "total": 89997,
      "status": "pending",
      "created_at": "2026-01-21 10:00:00",
      "items": [...]
    }
  ]
}
```

### Get Order Details
```javascript
GET /api/orders/{id}
```
**Response**:
```json
{
  "id": 1,
  "order_number": "ORD-20260121-001",
  "user": {...},
  "items": [
    {
      "product_name": "Product Name",
      "quantity": 2,
      "price": 29999
    }
  ],
  "total": 59998,
  "status": "pending",
  "shipping_address": "123 Main St, City, State - 123456",
  "created_at": "2026-01-21 10:00:00"
}
```

### Cancel Order
```javascript
POST /api/orders/{id}/cancel
```
**Requirements**: Order must be in 'pending' status

**Response**:
```json
{
  "success": true,
  "message": "Order cancelled successfully"
}
```

### Return Order
```javascript
POST /api/orders/{id}/return
```
**Requirements**: Order must be 'delivered'

**Response**:
```json
{
  "success": true,
  "message": "Return request submitted"
}
```

### Download Invoice
```javascript
GET /api/orders/{id}/invoice
```
**Requirements**: Order must be 'delivered'

**Response**: PDF file download

---

## 🛡️ Admin Endpoints (Requires Admin Role)

### Get Dashboard Analytics
```javascript
GET /api/admin/analytics
```
**Response**:
```json
{
  "total_users": 150,
  "total_products": 500,
  "total_orders": 1200,
  "total_revenue": 5000000,
  "pending_orders": 25,
  "recent_orders": [...]
}
```

### List All Orders (Admin)
```javascript
GET /api/admin/orders?status=pending&page=1
```
**Query Parameters**:
- `status` (optional): Filter by order status
- `page` (optional): Page number

### Update Order Status
```javascript
POST /api/admin/orders/{id}/status
Content-Type: application/json

{
  "status": "shipped"  // pending, shipped, delivered, cancelled
}
```
**Response**:
```json
{
  "success": true,
  "message": "Order status updated",
  "order": {...}
}
```

---

## 🔧 Frontend Implementation Examples

### Using apiCall Helper (main.js)
```javascript
import { apiCall } from './main.js';

// GET request
const products = await apiCall('/products');

// POST request
const result = await apiCall('/cart/add', {
  method: 'POST',
  body: JSON.stringify({ product_id: 1, quantity: 1 })
});

// Response handling
if (result && result.success) {
  console.log('Success!');
} else {
  console.error('Error:', result?.message);
}
```

### Authentication Flow
```javascript
// 1. Login
const loginData = await apiCall('/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

// 2. Verify OTP
const verifyData = await apiCall('/otp/verify', {
  method: 'POST',
  body: JSON.stringify({ email, otp })
});

// 3. Store token
localStorage.setItem('auth_token', verifyData.token);
localStorage.setItem('user_data', JSON.stringify(verifyData.user));

// 4. apiCall automatically includes token in future requests
```

---

## 📝 Notes

1. **HTTPS Enforcement**: The `apiCall` helper automatically converts HTTP to HTTPS
2. **Token Storage**: Auth token is stored in `localStorage` as `auth_token`
3. **Error Handling**: All responses include `success` boolean and `message` field
4. **Pagination**: Use `page` and `per_page` query parameters for paginated endpoints
5. **Image URLs**: Backend returns both `image` (relative path) and `image_url` (full HTTPS URL)

---

**Last Updated**: 2026-01-21
