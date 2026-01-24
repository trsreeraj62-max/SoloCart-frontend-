import CONFIG from "./config.js";
import { apiCall } from "./main.js";

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("login-btn");

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Authenticating...";
  }

  try {
    const data = await apiCall("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Check for nested data structure (e.g. data.data.token)
    const responseData = data.data || data;
    const token =
      responseData.token ||
      responseData.access_token ||
      data.token ||
      data.access_token ||
      null;

    if (token) {
      // Direct Login (if no OTP required) - normalize payload
      const user = responseData.user || data.user || {};
      try {
        localStorage.removeItem("solocart_pending_email");
      } catch (e) {}
      finalizeLogin({ token, access_token: token, user });
    } else if (
      data &&
      data.message &&
      (data.message.includes("OTP") || data.temp_token)
    ) {
      // OTP Required
      if (window.showToast) window.showToast("OTP sent to your email");
      try {
        localStorage.setItem("solocart_pending_email", email);
      } catch (e) {}
      setTimeout(() => {
        window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
      }, 1000);
    } else {
      console.error("Login Error Data:", data);
      if (window.showToast)
        window.showToast(data?.message || "Invalid Credentials", "error");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Login";
      }
    }
  } catch (e) {
    console.error("Login failed", e);
    if (window.showToast) window.showToast("Server connection failed", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Login";
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();
  console.log("[Register] Form submitted");
  
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const password_confirmation = document.getElementById(
    "password_confirmation",
  ).value;

  console.log("[Register] Form data:", { name, phone, email, password: password ? "***" : "" });

  const btn = document.querySelector('#register-form button[type="submit"]');
  
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Creating Account...";
  }

  try {
    console.log("[Register] Calling API...");
    const data = await apiCall("/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        password_confirmation,
      }),
    });

    console.log("Registration Response:", data); // Debug log

    // Check for success (various formats)
    const isSuccess =
      data.success === true ||
      data.message === "User successfully registered" ||
      data.message?.includes("registered") ||
      (data.statusCode >= 200 && data.statusCode < 300);

    if (isSuccess || (data && !data.errors && data.success !== false)) {
      if (window.showToast) window.showToast("Account Created! Sending OTP...");

      // Redirect to OTP page - backend should have sent OTP automatically
      try {
        localStorage.setItem("solocart_pending_email", email);
      } catch (e) {}
      setTimeout(() => {
        window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
      }, 1000);
    } else {
      console.error("Registration Error Data:", data);

      let errorMsg = data?.message || "Registration failed";

      // Handle Laravel Validation Errors (priority: specific field errors > general message)
      if (data?.errors) {
        // Check for email-specific error first (most common duplicate case)
        if (data.errors.email && Array.isArray(data.errors.email)) {
          errorMsg = data.errors.email[0];
        } else {
          // Otherwise, show the first validation error
          const errors = Object.values(data.errors).flat();
          if (errors.length > 0) {
            errorMsg = errors[0];
          }
        }
      }

      if (window.showToast) window.showToast(errorMsg, "error");
      
      // Re-enable button
      if (btn) {
        btn.disabled = false;
        btn.innerText = "CONTINUE";
      }
    }
  } catch (e) {
    console.error("Registration failed", e);
    if (window.showToast) window.showToast("Server connection failed", "error");
    
    // Re-enable button
    if (btn) {
      btn.disabled = false;
      btn.innerText = "CONTINUE";
    }
  }
}

async function handleVerifyOtp(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const otp = document.getElementById("otp").value.trim();
  const btn = document.getElementById("verify-btn");

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Verifying...";
  }

  try {
    const data = await apiCall("/otp/verify", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });

    console.log("OTP Verify Response:", data); // Debug log

    // Check for token in various response structures
    const responseData = data.data || data;
    const token =
      responseData.token ||
      responseData.access_token ||
      data.token ||
      data.access_token ||
      null;

    if (token && data.success !== false) {
      // Success - token found. Normalize payload for finalizeLogin
      const user = responseData.user || data.user || {};
      try {
        localStorage.removeItem("solocart_pending_email");
      } catch (e) {}
      finalizeLogin({ token, access_token: token, user });
    } else if (data.success === false || data.statusCode >= 400) {
      // Explicit failure
      const errorMsg = data.message || "Invalid OTP";
      if (window.showToast) window.showToast(errorMsg, "error");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "VERIFY OTP";
      }
    } else {
      // Unexpected response format
      console.error("Unexpected OTP response:", data);
      if (window.showToast)
        window.showToast("Verification failed. Please try again.", "error");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "VERIFY OTP";
      }
    }
  } catch (e) {
    console.error("OTP Verification failed", e);
    if (window.showToast) window.showToast("Verification failed", "error");
    if (btn) {
      btn.disabled = false;
      btn.innerText = "VERIFY OTP";
    }
  }
}

async function handleResendOtp() {
  const email = document.getElementById("email").value.trim();
  if (!email) {
    if (window.showToast) window.showToast("Email is required", "error");
    return;
  }

  try {
    const data = await apiCall("/otp/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    console.log("Resend OTP Response:", data); // Debug log

    // Check for success
    if (
      data &&
      (data.success === true ||
        data.message?.includes("sent") ||
        data.message?.includes("OTP"))
    ) {
      if (window.showToast)
        window.showToast(data.message || "OTP Resent Successfully");
    } else {
      const errorMsg = data?.message || "Failed to resend OTP";
      if (window.showToast) window.showToast(errorMsg, "error");
    }
  } catch (e) {
    console.error("Resend OTP failed", e);
    if (window.showToast) window.showToast("Failed to resend OTP", "error");
  }
}

function finalizeLogin(data) {
  const tokenValue = data.token || data.access_token;
  if (tokenValue) {
    localStorage.setItem("auth_token", tokenValue);
    console.log(
      "[Auth] Stored auth_token (masked):",
      `${String(tokenValue).slice(0, 12)}...`,
    );
  } else {
    console.error("[Auth] No token present in finalizeLogin payload");
  }
  localStorage.setItem("user_data", JSON.stringify(data.user || {}));
  try {
    localStorage.setItem("user_profile", JSON.stringify(data.user || {}));
  } catch (e) {}
  if (window.showToast) window.showToast("LoggedIn Successfully");

  // Redirect Logic
  const urlParams = new URLSearchParams(window.location.search);
  let redirect = urlParams.get("redirect");

  if (!redirect) {
    // Robust Admin Check: Check role 'admin', 'Admin', or is_admin flag (boolean/1)
    const user = data.user || {};
    if (
      user.role === "admin" ||
      user.role === "Admin" ||
      user.is_admin === true ||
      user.is_admin === 1
    ) {
      // Admin goes to dashboard
      redirect = "/admin/dashboard.html";
    } else {
      // Default: Go to Home/Shop (Buyers Page)
      redirect = "/index.html";
    }
  }

  setTimeout(() => (window.location.href = redirect), 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("login-form")
    ?.addEventListener("submit", handleLogin);
  document
    .getElementById("register-form")
    ?.addEventListener("submit", handleRegister);
  document
    .getElementById("otp-form")
    ?.addEventListener("submit", handleVerifyOtp);
  document
    .getElementById("resend-btn")
    ?.addEventListener("click", handleResendOtp);
});
