import CONFIG from '../js/config.js';

let banners = [];

async function initAdminBanners() {
    const token = localStorage.getItem('auth_token');
    if (!token) { window.location.href = '/login'; return; }
    
    await fetchBanners();
}

async function fetchBanners() {
    const token = localStorage.getItem('auth_token');
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/banners`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        banners = data.banners;
        renderBanners(banners);
    } catch (e) {
        console.error(e);
    }
}

function renderBanners(list) {
    const grid = document.getElementById('banners-grid');
    grid.innerHTML = list.map(b => `
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden group">
            <div class="h-40 bg-slate-100 relative overflow-hidden">
                <img src="${b.image_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">
                <div class="absolute top-2 right-2">
                    <span class="px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${b.status === 'active' ? 'bg-green-500 text-white' : 'bg-rose-500 text-white'}">
                        ${b.status}
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
    `).join('');

    grid.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editBanner(btn.dataset.id)));
    grid.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteBanner(btn.dataset.id)));
}

async function deleteBanner(id) {
    if (!confirm('Abort banner projection?')) return;
    const token = localStorage.getItem('auth_token');
    try {
        await fetch(`${CONFIG.API_BASE_URL}/admin/banners/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchBanners();
    } catch (e) { console.error(e); }
}

function editBanner(id) {
    const b = banners.find(x => x.id == id);
    if (!b) return;
    document.getElementById('banner-id').value = b.id;
    document.getElementById('b-title').value = b.title || '';
    document.getElementById('b-url').value = b.image_url;
    document.getElementById('b-status').value = b.status;
    document.getElementById('bannerModal').classList.remove('hidden');
}

document.getElementById('add-banner-btn').addEventListener('click', () => {
    document.getElementById('banner-form').reset();
    document.getElementById('banner-id').value = '';
    document.getElementById('bannerModal').classList.remove('hidden');
});

document.getElementById('banner-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('auth_token');
    const id = document.getElementById('banner-id').value;
    const data = {
        title: document.getElementById('b-title').value,
        image_url: document.getElementById('b-url').value,
        status: document.getElementById('b-status').value
    };

    const url = id ? `${CONFIG.API_BASE_URL}/admin/banners/${id}` : `${CONFIG.API_BASE_URL}/admin/banners`;
    const method = id ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            window.closeModal();
            fetchBanners();
        }
    } catch (e) { console.error(e); }
});

document.addEventListener('DOMContentLoaded', initAdminBanners);
