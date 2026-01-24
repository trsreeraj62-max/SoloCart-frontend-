import CONFIG from "./config.js";
import { apiCall } from "./main.js";

// Email validation utility
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("login-btn");

  // Validate email format
  if (!email || !isValidEmail(email)) {
    if (window.showToast)
      window.showToast("Please enter a valid email address", "error");
    return;
  }

  console.log("[Login] Email submitted:", email);

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Authenticating...";
  }

  try {
    const data = await apiCall("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    console.log("[Login] Response received:", data);

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
      // OTP Required for login
      if (window.showToast) window.showToast("OTP sent to your email");

      // Store email and user_id for OTP verification
      try {
        localStorage.setItem("solocart_pending_email", email);

        // Extract user_id from response for OTP verification
        const userId = data?.data?.id || data?.user?.id || data?.id || null;
        if (userId) {
          localStorage.setItem("solocart_pending_user_id", String(userId));
        }
      } catch (e) {
        console.error("Failed to store session data:", e);
      }

      setTimeout(() => {
        window.location.href = `/verify-otp.html?email=${encodeURIComponent(
          email,
        )}`;
      }, 1500);
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
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const password_confirmation = document.getElementById(
    "password_confirmation",
  ).value;

  // Validate email format
  if (!email || !isValidEmail(email)) {
    if (window.showToast)
      window.showToast("Please enter a valid email address", "error");
    return;
  }

  // Validate phone number
  if (!phone || phone.length < 10) {
    if (window.showToast)
      window.showToast(
        "Please enter a valid phone number (at least 10 digits)",
        "error",
      );
    return;
  }

  console.log("[Register] Form data:", {
    name,
    phone,
    email,
    password: password ? "***" : "",
  });

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
      if (window.showToast)
        window.showToast("Account Created! Sending OTP to your email...");

      // Store email and user_id for OTP verification
      try {
        localStorage.setItem("solocart_pending_email", email);

        // Extract user_id from response for OTP verification
        const userId = data?.data?.id || data?.user?.id || data?.id || null;
        if (userId) {
          localStorage.setItem("solocart_pending_user_id", String(userId));
        }
      } catch (e) {
        console.error("Failed to store session data:", e);
      }

      setTimeout(() => {
        window.location.href = `/verify-otp.html?email=${encodeURIComponent(
          email,
        )}`;
      }, 1500);
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

/**
 * Verify OTP submitted by user
 * Production-ready implementation:
 * - Only sends email + otp (or email + otp + user_id if available)
 * - Expects HTTP 200 with token for success
 * - Properly handles error responses
 * - No debug logic or OTP parsing
 */
async function handleVerifyOtp(e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim().toLowerCase();
  const otp = document.getElementById("otp").value.trim();
  const btn = document.getElementById("verify-btn");

  // Validate inputs
  if (!email || !isValidEmail(email)) {
    if (window.showToast)
      window.showToast("Please provide a valid email address", "error");
    return;
  }

  if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    if (window.showToast)
      window.showToast("OTP must be exactly 6 digits", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = "Verifying...";
  }

  try {
    // Build payload with email + otp
    // Include user_id only if available from registration
    const payload = { email, otp };

    try {
      const userId = localStorage.getItem("solocart_pending_user_id");
      if (userId) {
        payload.user_id = parseInt(userId);
      }
    } catch (e) {
      // localStorage not available, proceed with email + otp
    }

    const data = await apiCall("/otp/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Check for successful response (HTTP 200)
    // Success indicated by presence of token
    const token =
      data?.data?.token ||
      data?.data?.access_token ||
      data?.token ||
      data?.access_token;

    const user = data?.data?.user || data?.user;

    if (token) {
      // OTP verified successfully
      if (window.showToast) window.showToast("Verification successful!");

      // Clean up session data
      try {
        localStorage.removeItem("solocart_pending_email");
        localStorage.removeItem("solocart_pending_user_id");
      } catch (e) {
        /* ignore */
      }

      // Finalize login
      finalizeLogin({ token, access_token: token, user: user || {} });
    } else {
      // No token in response = verification failed
      const errorMsg =
        data?.message || "Invalid or expired OTP. Please try again.";
      if (window.showToast) window.showToast(errorMsg, "error");

      if (btn) {
        btn.disabled = false;
        btn.innerText = "VERIFY OTP";
      }
    }
  } catch (error) {
    console.error("OTP verification error:", error);
    if (window.showToast)
      window.showToast(
        "Verification failed. Please check your connection.",
        "error",
      );

    if (btn) {
      btn.disabled = false;
      btn.innerText = "VERIFY OTP";
    }
  }
}

/**
 * Resend OTP to user's email
 * Production-ready implementation:
 * - Treats HTTP 200 as success only
 * - Implements cooldown timer (60 seconds)
 * - Prevents abuse through disabled state
 * - No debug logic
 */
async function handleResendOtp() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const resendBtn = document.getElementById("resend-btn");

  // Validate email
  if (!email || !isValidEmail(email)) {
    if (window.showToast)
      window.showToast("Please provide a valid email address", "error");
    return;
  }

  // Check if button is in cooldown
  if (resendBtn?.disabled) {
    if (window.showToast)
      window.showToast("Please wait before requesting another OTP", "error");
    return;
  }

  // Disable button and show cooldown
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.style.opacity = "0.5";
    resendBtn.style.cursor = "not-allowed";
  }

  const COOLDOWN_SECONDS = 60;
  let cooldownCount = COOLDOWN_SECONDS;

  const updateButtonText = () => {
    if (resendBtn) {
      if (cooldownCount > 0) {
        resendBtn.innerText = `Resend OTP in ${cooldownCount}s`;
      } else {
        resendBtn.innerText = "Resend OTP";
        resendBtn.disabled = false;
        resendBtn.style.opacity = "1";
        resendBtn.style.cursor = "pointer";
      }
    }
  };

  try {
    const data = await apiCall("/otp/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    // Treat only success (HTTP 200, data.success === true or data has expected structure)
    // as actual success. Don't treat 422 or errors as success.
    const isSuccess =
      data?.success === true ||
      (data && !data.errors && !data.message?.includes("failed"));

    if (isSuccess) {
      if (window.showToast)
        window.showToast("OTP has been sent to your email", "success");

      // Start cooldown timer
      const cooldownInterval = setInterval(() => {
        cooldownCount--;
        updateButtonText();

        if (cooldownCount < 0) {
          clearInterval(cooldownInterval);
        }
      }, 1000);

      updateButtonText();
    } else {
      // Request failed - show error and re-enable button
      const errorMsg =
        data?.message || "Failed to resend OTP. Please try again.";
      if (window.showToast) window.showToast(errorMsg, "error");

      // Re-enable button immediately on error
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.innerText = "Resend OTP";
        resendBtn.style.opacity = "1";
        resendBtn.style.cursor = "pointer";
      }
    }
  } catch (error) {
    console.error("Resend OTP error:", error);
    if (window.showToast)
      window.showToast(
        "Failed to resend OTP. Please check your connection.",
        "error",
      );

    // Re-enable button on error
    if (resendBtn) {
      resendBtn.disabled = false;
      resendBtn.innerText = "Resend OTP";
      resendBtn.style.opacity = "1";
      resendBtn.style.cursor = "pointer";
    }
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
