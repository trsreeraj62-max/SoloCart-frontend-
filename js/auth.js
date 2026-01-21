import CONFIG from './config.js';
import { apiCall } from './main.js';

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');

    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Authenticating...';
    }

    try {
        const data = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        // Check for nested data structure (e.g. data.data.token)
        const responseData = data.data || data; 
        
        if (responseData && (responseData.token || responseData.access_token)) {
            // Direct Login (if no OTP required)
            finalizeLogin(responseData);
        } else if (data && data.message && (data.message.includes('OTP') || data.temp_token)) {
            // OTP Required
            if (window.showToast) window.showToast('OTP sent to your email');
            setTimeout(() => {
                window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
            }, 1000);
        } else {
            console.error('Login Error Data:', data);
            if (window.showToast) window.showToast(data?.message || 'Invalid Credentials', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'Login';
            }
        }
    } catch (e) {
        console.error('Login failed', e);
        if (window.showToast) window.showToast('Server connection failed', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'Login';
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const password_confirmation = document.getElementById('password_confirmation').value;

    try {
        const data = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, phone, password, password_confirmation })
        });

        if (data && (data.success || data.message === 'User successfully registered')) {
            if (window.showToast) window.showToast('Account Created! Sending OTP...');
            
            // Auto-trigger Login to get OTP
            try {
                 const loginData = await apiCall('/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, password })
                });
                
                if (loginData && (loginData.message.includes('OTP') || loginData.temp_token)) {
                    // Redirect to OTP Verification
                    setTimeout(() => {
                        window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
                    }, 1000);
                } else if (loginData && (loginData.token || loginData.access_token)) {
                    // Direct Login Success
                     finalizeLogin(loginData);
                } else {
                   // Fallback to login page logic
                   setTimeout(() => window.location.href = '/login.html', 1000);
                }
            } catch (loginError) {
                console.warn('Auto-login failed', loginError);
                setTimeout(() => window.location.href = '/login.html', 1000);
            }
            
        } else {
            console.error('Registration Error Data:', data);
            
            let errorMsg = data?.message || 'Registration failed';
            
            // Handle Laravel Validation Errors
            if (data?.errors) {
                const errors = Object.values(data.errors).flat();
                if (errors.length > 0) {
                    errorMsg = errors[0]; // Show the first error usually works best for toasts
                }
            }
            
            if (window.showToast) window.showToast(errorMsg, 'error');
        }
    } catch (e) {
        console.error('Registration failed', e);
        if (window.showToast) window.showToast('Server connection failed', 'error');
    }
}

async function handleVerifyOtp(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const btn = document.getElementById('verify-btn');

    if (btn) {
        btn.disabled = true;
        btn.innerText = 'Verifying...';
    }

    try {
        const data = await apiCall('/otp/verify', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });

        if (data && (data.token || data.access_token)) {
            finalizeLogin(data);
        } else {
            if (window.showToast) window.showToast(data?.message || 'Invalid OTP', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerText = 'VERIFY OTP';
            }
        }
    } catch (e) {
        console.error('OTP Verification failed', e);
        if (window.showToast) window.showToast('Verification failed', 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerText = 'VERIFY OTP';
        }
    }
}

async function handleResendOtp() {
    const email = document.getElementById('email').value.trim();
    if (!email) return;

    try {
        const data = await apiCall('/otp/resend', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        if (data && data.success) {
            if (window.showToast) window.showToast('OTP Resent Successfully');
        } else {
            if (window.showToast) window.showToast(data?.message || 'Failed to resend OTP', 'error');
        }
    } catch (e) {
        console.error('Resend OTP failed', e);
    }
}

function finalizeLogin(data) {
    localStorage.setItem('auth_token', data.token || data.access_token);
    localStorage.setItem('user_data', JSON.stringify(data.user || {}));
    if (window.showToast) window.showToast('LoggedIn Successfully');
    
    // Redirect Logic
    const urlParams = new URLSearchParams(window.location.search);
    let redirect = urlParams.get('redirect');

    if (!redirect) {
        // Robust Admin Check: Check role 'admin', 'Admin', or is_admin flag (boolean/1)
        const user = data.user || {};
        if (user.role === 'admin' || user.role === 'Admin' || user.is_admin === true || user.is_admin === 1) {
            // Admin goes to dashboard
            redirect = '/admin/dashboard.html';
        } else {
            // Default: Go to Home/Shop (Buyers Page)
            redirect = '/index.html';
        }
    }
    
    setTimeout(() => window.location.href = redirect, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('otp-form')?.addEventListener('submit', handleVerifyOtp);
    document.getElementById('resend-btn')?.addEventListener('click', handleResendOtp);
});

