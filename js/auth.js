import CONFIG from './config.js';

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerText = 'Authenticating...';

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            window.showToast('Authentication Successful');
            
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect') || '/index.html';
            setTimeout(() => window.location.href = redirect, 1000);
        } else {
            window.showToast(data.message || 'Invalid Credentials', 'error');
            btn.disabled = false;
            btn.innerText = 'Login';
        }
    } catch (e) {
        console.error('Login failed', e);
        window.showToast('Server connection failed', 'error');
        btn.disabled = false;
        btn.innerText = 'Login';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const password_confirmation = document.getElementById('password_confirmation').value;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, password_confirmation })
        });

        const data = await response.json();

        if (response.ok) {
            window.showToast('Account Created! Please login.');
            setTimeout(() => window.location.href = '/login.html', 2000);
        } else {
            window.showToast(data.message || 'Registration failed', 'error');
        }
    } catch (e) {
        console.error('Registration failed', e);
        window.showToast('Server connection failed', 'error');
    }
}

async function requestOTP() {
    const email = document.getElementById('email').value;
    if (!email) {
        window.showToast('Please enter email/mobile first', 'error');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        if (response.ok) {
            window.showToast('OTP sent to your signal');
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('otp-form').classList.remove('hidden');
        } else {
            window.showToast(data.message || 'Failed to send OTP', 'error');
        }
    } catch (e) {
        window.showToast('Signal error', 'error');
    }
}

async function handleOTP(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const otp = Array.from(document.querySelectorAll('.otp-input')).map(input => input.value).join('');

    if (otp.length < 6) {
        window.showToast('Please enter full 6-digit OTP', 'error');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user_data', JSON.stringify(data.user));
            window.showToast('OTP Signal Verified');
            setTimeout(() => window.location.href = '/index.html', 1000);
        } else {
            window.showToast(data.message || 'Invalid OTP Signal', 'error');
        }
    } catch (e) {
        window.showToast('Verification failed', 'error');
    }
}

// Global Toast function if not already present
if (!window.showToast) {
    window.showToast = (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `p-4 rounded shadow-lg text-white font-bold text-sm mb-2 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
        toast.innerText = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    document.getElementById('request-otp-btn')?.addEventListener('click', requestOTP);
    document.getElementById('otp-form')?.addEventListener('submit', handleOTP);
    
    document.getElementById('back-to-login')?.addEventListener('click', () => {
        document.getElementById('otp-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });

    // Auto-focus OTP inputs
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
});
