import { apiCall } from "./main.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const email = document.getElementById("email").value.trim();
      const btn = document.getElementById("reset-btn");
      
      if (!email) {
        if (window.showToast) window.showToast("Please enter your email", "error");
        return;
      }
      
      if (btn) {
        btn.disabled = true;
        btn.innerText = "SENDING...";
      }
      
      try {
        // Trying standard Laravel route for password reset link
        const data = await apiCall("/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email })
        });
        
        if (data && (data.success || data.status === "passwords.sent" || data.message?.includes("link"))) {
            if (window.showToast) window.showToast(data.message || "Reset link sent!");
            // clear form
            form.reset();
        } else {
            const msg = data.message || "Failed to send reset link";
            if (window.showToast) window.showToast(msg, "error");
        }
      } catch (err) {
        console.error("Forgot password error", err);
        if (window.showToast) window.showToast("Network error. Try again later.", "error");
      } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "SEND RESET LINK";
        }
      }
    });
  }
});
