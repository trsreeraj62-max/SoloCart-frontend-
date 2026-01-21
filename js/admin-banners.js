import CONFIG from './config.js';
import { apiCall } from './main.js';

let banners = [];

async function initAdminBanners() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!token || !(user.role === 'admin' || user.role === 'Admin' || user.is_admin === true || user.is_admin === 1)) { 
        window.location.href = '/login.html'; 
        return; 
    }
    
    await fetchBanners();
}

async function fetchBanners() {
    try {
        const data = await apiCall('/admin/banners');
        if (data && (data.banners || Array.isArray(data))) {
            banners = data.banners || data;
            renderBanners(banners);
        }
    } catch (e) {
        console.error('Failed to load admin banners', e);
    }
}

function renderBanners(list) {
    const grid = document.getElementById('banners-grid');
    if (!grid || !Array.isArray(list)) return;

    grid.innerHTML = list.map(b => {
        const imageUrl = b.image_url 
            ? b.image_url.replace(/^http:/, 'https:')
            : (b.image ? `https://solocart-backend.onrender.com/storage/${b.image}` : 'https://placehold.co/1600x400?text=Banner');

        return `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group">
            <div class="h-40 bg-slate-100 relative overflow-hidden">
                <img src="${imageUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onerror="this.src='https://placehold.co/1600x400?text=Banner'">
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${b.status === 'active' ? 'bg-green-500 text-white' : 'bg-rose-500 text-white'}">
                        ${b.status || 'unknown'}
                    </span>
                </div>
            </div>
            <div class="p-4">
                <h4 class="text-sm font-bold text-slate-800 mb-1">${b.title || 'Untitled Banner'}</h4>
                <div class="flex justify-between items-center mt-4">
                    <button class="edit-btn text-xs font-black uppercase tracking-widest text-[#2874f0]" data-id="${b.id}">Edit Configuration</button>
                    <button class="delete-btn text-rose-500 text-sm" data-id="${b.id}"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        </div>
    `;
    }).join('');

    grid.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editBanner(btn.dataset.id)));
    grid.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteBanner(btn.dataset.id)));
}

async function deleteBanner(id) {
    if (!confirm('Abort banner projection?')) return;
    try {
        const data = await apiCall(`/admin/banners/${id}`, { method: 'DELETE' });
        if (data && (data.success || !data.message?.includes('fail'))) {
            fetchBanners();
        }
    } catch (e) {
        console.error('Failed to delete banner', e);
    }
}

function editBanner(id) {
    const b = banners.find(x => x.id == id);
    if (!b) return;
    if (document.getElementById('banner-id')) document.getElementById('banner-id').value = b.id;
    if (document.getElementById('b-title')) document.getElementById('b-title').value = b.title || '';
    if (document.getElementById('b-url')) document.getElementById('b-url').value = b.image_url || '';
    if (document.getElementById('b-status')) document.getElementById('b-status').value = b.status || 'active';
    document.getElementById('bannerModal')?.classList.remove('hidden');
}

document.getElementById('add-banner-btn')?.addEventListener('click', () => {
    document.getElementById('banner-form')?.reset();
    if (document.getElementById('banner-id')) document.getElementById('banner-id').value = '';
    document.getElementById('bannerModal')?.classList.remove('hidden');
});

document.getElementById('banner-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('banner-id')?.value;
    const bodyData = {
        title: document.getElementById('b-title')?.value,
        image_url: document.getElementById('b-url')?.value,
        status: document.getElementById('b-status')?.value
    };

    const endpoint = id ? `/admin/banners/${id}` : '/admin/banners';
    const method = id ? 'PUT' : 'POST';

    try {
        const data = await apiCall(endpoint, {
            method,
            body: JSON.stringify(bodyData)
        });

        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.closeModal) window.closeModal();
            else document.getElementById('bannerModal')?.classList.add('hidden');
            fetchBanners();
        }
    } catch (e) {
        console.error('Failed to save banner', e);
    }
});

document.addEventListener('DOMContentLoaded', initAdminBanners);

