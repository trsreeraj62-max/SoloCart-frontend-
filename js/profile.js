import CONFIG from './config.js';
import { getAuthToken, apiCall, safeJSONParse } from './main.js';

async function initProfile() {
    const token = getAuthToken();
    if (!token) {
        window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        return;
    }

    const userData = safeJSONParse(localStorage.getItem('user_data'), {});
    const displayName = document.getElementById('user-display-name');
    const initials = document.getElementById('user-initials');

    if (displayName) displayName.innerText = userData.name || 'User';
    if (initials && userData.name) initials.innerText = userData.name.charAt(0).toUpperCase();
    
    if (document.getElementById('p-name')) document.getElementById('p-name').value = userData.name || '';
    if (document.getElementById('p-email')) document.getElementById('p-email').value = userData.email || '';
    if (document.getElementById('p-bio')) document.getElementById('p-bio').value = userData.bio || '';
    
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('p-name')?.value;
        const bio = document.getElementById('p-bio')?.value;

        try {
            const data = await apiCall('/profile/update', {
                method: 'POST',
                body: JSON.stringify({ name, bio })
            });

            if (data && data.user) {
                localStorage.setItem('user_data', JSON.stringify(data.user));
                if (window.showToast) window.showToast('Profile Signal Updated');
                const displayName = document.getElementById('user-display-name');
                if (displayName) displayName.innerText = data.user.name;
            } else {
                const errorMessage = data?.message || 'Update Failed';
                if (window.showToast) window.showToast(`Update Failed: ${errorMessage}`, 'error');
            }
        } catch (e) {
            console.error('Profile update failed:', e);
            if (window.showToast) window.showToast('Signal interruption. Try again.', 'error');
        }
    });

    document.getElementById('profile-logout')?.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/index.html';
    });
}

document.addEventListener('DOMContentLoaded', initProfile);

