import CONFIG from './config.js';
import { apiCall } from './main.js';

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
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

        if (data && (data.token || data.access_token)) {
            localStorage.setItem('auth_token', data.token || data.access_token);
            localStorage.setItem('user_data', JSON.stringify(data.user || {}));
            if (window.showToast) window.showToast('Authentication Successful');
            
            const urlParams = new URLSearchParams(window.location.search);
            let redirect = urlParams.get('redirect');
            
            if (!redirect) {
                if (data.user?.role === 'admin') {
                    redirect = '/admin/dashboard.html';
                } else {
                    redirect = '/index.html';
                }
            }
            setTimeout(() => window.location.href = redirect, 1000);
        } else {
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
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const password_confirmation = document.getElementById('password_confirmation').value;

    try {
        const data = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, password_confirmation })
        });

        if (data && (data.success || data.message === 'User successfully registered')) {
            if (window.showToast) window.showToast('Account Created! Please login.');
            setTimeout(() => window.location.href = '/login.html', 2000);
        } else {
            if (window.showToast) window.showToast(data?.message || 'Registration failed', 'error');
        }
    } catch (e) {
        console.error('Registration failed', e);
        if (window.showToast) window.showToast('Server connection failed', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
});

