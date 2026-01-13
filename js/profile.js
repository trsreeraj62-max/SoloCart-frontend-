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
    
    document.getElementById('p-name').value = userData.name || '';
    document.getElementById('p-email').value = userData.email || '';
    document.getElementById('p-bio').value = userData.bio || '';
    
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
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, bio })
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.showToast('Profile Signal Updated');
                    document.getElementById('user-display-name').innerText = data.user.name;
                } else {
                    console.error('Profile update failed:', data);
                    const errorMessage = data.message || (data.errors ? Object.values(data.errors).flat().join(', ') : 'Backend rejection');
                    window.showToast(`Update Failed: ${errorMessage}`, 'error');
                }
            } else {
                const text = await response.text();
                console.error('Non-JSON response during profile update:', text);
                window.showToast('Backend connection error (Non-JSON)', 'error');
            }
        } catch (e) {
            console.error('Profile update signal interruption:', e);
            window.showToast('Signal interruption. Try again.', 'error');
        }
    });

    document.getElementById('profile-logout').addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
    });
}

document.addEventListener('DOMContentLoaded', initProfile);
