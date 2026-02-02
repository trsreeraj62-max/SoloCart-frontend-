import CONFIG from "./config.js";
import { apiCall, validatePassword, validatePhone } from "./main.js";

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

  if (!email || !isValidEmail(email)) {
    if (window.showToast) window.showToast("Please enter a valid email address", "error");
    return;
  }
  if (!password) {
    if (window.showToast) window.showToast("Password is required", "error");
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
  const phoneCheck = validatePhone(phone);
  if (!phoneCheck.valid) {
    if (window.showToast) window.showToast(phoneCheck.message, "error");
    return;
  }

  // Validate password
  const passCheck = validatePassword(password);
  if (!passCheck.valid) {
    if (window.showToast) window.showToast(passCheck.message, "error");
    return;
  }

  if (password !== password_confirmation) {
    if (window.showToast) window.showToast("Passwords do not match", "error");
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
 * - Email + OTP sent to backend
 * - No OTP parsing from response
 * - Success = HTTP 200 + token
 * - Clear error handling
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
    // Send only email + otp to backend
    const payload = { email, otp };

    // Include user_id if available from registration/login flow
    try {
      const userId = localStorage.getItem("solocart_pending_user_id");
      if (userId) {
        payload.user_id = parseInt(userId);
      }
    } catch (e) {
      /* ignore */
    }

    const data = await apiCall("/otp/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Success = token present in response
    const token =
      data?.token ||
      data?.data?.token ||
      data?.access_token ||
      data?.data?.access_token;

    if (token) {
      // Verification successful
      if (window.showToast) window.showToast("Verification successful!");

      // Clean up session data
      try {
        localStorage.removeItem("solocart_pending_email");
        localStorage.removeItem("solocart_pending_user_id");
      } catch (e) {
        /* ignore */
      }

      // Log in user
      const user = data?.user || data?.data?.user || {};
      finalizeLogin({ token, access_token: token, user });
    } else {
      // No token = verification failed
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
 * - Simple email validation
 * - HTTP 200 = success
 * - 60-second cooldown to prevent abuse
 * - Clear error messages
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
    return; // Silently ignore while on cooldown
  }

  // Disable button and start cooldown
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.style.opacity = "0.5";
    resendBtn.style.cursor = "not-allowed";
  }

  try {
    const data = await apiCall("/otp/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
      skipRedirect: true
    });

    // HTTP 200-299 range = success
    if (data && data.success !== false) {
      if (window.showToast)
        window.showToast("OTP sent. Check your email.", "success");

      // Start 60-second cooldown
      let cooldownSeconds = 60;

      const cooldownInterval = setInterval(() => {
        cooldownSeconds--;

        if (resendBtn) {
          if (cooldownSeconds > 0) {
            resendBtn.innerText = `Resend OTP in ${cooldownSeconds}s`;
          } else {
            resendBtn.innerText = "Resend OTP";
            resendBtn.disabled = false;
            resendBtn.style.opacity = "1";
            resendBtn.style.cursor = "pointer";
            clearInterval(cooldownInterval);
          }
        }
      }, 1000);

      if (resendBtn) {
        resendBtn.innerText = `Resend OTP in ${cooldownSeconds}s`;
      }
    } else {
      // Request failed (4xx / 5xx)
      const errorMsg = data?.message || "Failed to resend OTP";
      if (window.showToast) window.showToast(errorMsg, "error");

      // Re-enable button immediately
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
      window.showToast("Failed to resend OTP. Check your connection.", "error");

    // Re-enable button on network error
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
