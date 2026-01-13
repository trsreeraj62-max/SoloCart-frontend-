import CONFIG from './config.js';
import { getAuthToken } from './main.js';

async function initProfile() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = '/login?redirect=/profile';
        return;
    }

    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    document.getElementById('user-display-name').innerText = userData.name;
    document.getElementById('user-initials').innerText = userData.name.charAt(0).toUpperCase();
    
    document.getElementById('p-name').value = userData.name;
    document.getElementById('p-email').value = userData.email;
    
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = getAuthToken();
        const name = document.getElementById('p-name').value;
        const bio = document.getElementById('p-bio').value;

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/profile/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, bio })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user_data', JSON.stringify(data.user));
                window.showToast('Profile Signal Updated');
                document.getElementById('user-display-name').innerText = data.user.name;
            } else {
                window.showToast('Failed to update signal', 'error');
            }
        } catch (e) {
            window.showToast('Signal interruption', 'error');
        }
    });

    document.getElementById('profile-logout').addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
    });
}

document.addEventListener('DOMContentLoaded', initProfile);
