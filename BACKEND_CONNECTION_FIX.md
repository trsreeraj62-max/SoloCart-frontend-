# 🔧 Backend Connection Issue - Quick Fix

## ⚠️ Problem: "Server Connection Failed"

The frontend is trying to connect to:
```
https://my-backend.onrender.com/api
```

This is a **placeholder URL** and needs to be replaced with your **actual backend URL**.

---

## ✅ Solutions

### Option 1: Use Your Actual Backend URL

If you have a backend deployed on Render or elsewhere:

1. **Find your backend URL** (e.g., `https://solocart-backend-xyz.onrender.com`)

2. **Update `js/config.js`:**
```javascript
const CONFIG = {
    API_BASE_URL: 'https://YOUR-ACTUAL-BACKEND-URL.onrender.com/api',
    APP_NAME: 'SoloCart'
};

export default CONFIG;
```

3. **Save and test again**

---

### Option 2: Test with Local Backend (If Running Locally)

If your Laravel backend is running locally:

1. **Start your Laravel backend:**
```bash
cd path/to/your/backend
php artisan serve
```

2. **Update `js/config.js`:**
```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api',
    // Or if using different port:
    // API_BASE_URL: 'http://127.0.0.1:8000/api',
    APP_NAME: 'SoloCart'
};

export default CONFIG;
```

3. **Save and refresh your browser**

---

### Option 3: Mock API for Frontend Testing (Temporary)

If you just want to test the frontend without a backend:

1. **Update `js/config.js`:**
```javascript
const CONFIG = {
    API_BASE_URL: 'https://jsonplaceholder.typicode.com', // Mock API
    APP_NAME: 'SoloCart'
};

export default CONFIG;
```

**Note:** This won't work perfectly but will prevent connection errors.

---

## 🔍 How to Find Your Backend URL

### If Backend is on Render:
1. Go to https://dashboard.render.com
2. Find your backend service
3. Copy the URL (e.g., `https://your-app-name.onrender.com`)
4. Add `/api` to the end

### If Backend is on Heroku:
- URL format: `https://your-app-name.herokuapp.com/api`

### If Backend is on Railway:
- URL format: `https://your-app-name.up.railway.app/api`

### If Backend is Local:
- URL: `http://localhost:8000/api` (default Laravel)

---

## 🚨 Important: CORS Configuration

After updating the URL, make sure your **backend** allows requests from your frontend:

### In Laravel Backend (`config/cors.php`):
```php
'allowed_origins' => [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://your-netlify-site.netlify.app',
],
```

Or allow all (for testing):
```php
'allowed_origins' => ['*'],
```

---

## 📝 Quick Steps to Fix Now

1. **Find your backend URL**
2. **Edit `js/config.js`** in your project
3. **Replace** `https://my-backend.onrender.com/api` with your actual URL
4. **Save the file**
5. **Refresh your browser** (Ctrl + F5)
6. **Try login again**

---

## 🧪 Test Backend Connection

Open browser console (F12) and run:
```javascript
fetch('YOUR_BACKEND_URL/api/products')
  .then(r => r.json())
  .then(d => console.log('Backend works!', d))
  .catch(e => console.error('Backend error:', e));
```

Replace `YOUR_BACKEND_URL` with your actual backend URL.

---

## ❓ Need Help?

**Tell me:**
1. Where is your backend hosted? (Render/Heroku/Local/Other)
2. What is your backend URL?

I'll update the config file for you!
