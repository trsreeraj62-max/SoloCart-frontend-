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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
});
