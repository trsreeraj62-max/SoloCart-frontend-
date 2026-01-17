import CONFIG from './config.js';
import { apiCall } from './main.js';

async function initAdminProducts() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!token || user.role !== 'admin') { window.location.href = '/login.html'; return; }
    
    await fetchProducts();
}

async function fetchProducts() {
    try {
        const data = await apiCall('/admin/products');
        if (data && (data.products || Array.isArray(data))) {
            renderProducts(data.products || data);
        }
    } catch (e) {
        console.error('Failed to load admin products', e);
    }
}

function renderProducts(products) {
    const table = document.getElementById('products-table');
    if (!table || !Array.isArray(products)) return;

    table.innerHTML = products.map(p => {
        const imageUrl = p.image_url 
            ? p.image_url.replace(/^http:/, 'https:')
            : (p.image ? `https://solocart-backend.onrender.com/storage/${p.image}` : 'https://placehold.co/400x400?text=No+Image');

        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <img src="${imageUrl}" class="w-10 h-10 object-contain rounded border" onerror="this.src='https://placehold.co/400x400?text=No+Image'">
                    <div>
                        <span class="block font-bold text-slate-800">${p.name || 'Unavailable'}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">ID: ${p.id}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-500">${p.category ? p.category.name : 'N/A'}</td>
            <td class="px-6 py-4 font-black">₹${Number(p.price || 0).toLocaleString()}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${p.stock > 0 ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}">
                    ${p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Sync'}
                </span>
            </td>
            <td class="px-6 py-4 text-right space-x-2">
                <button class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"><i class="fas fa-edit"></i></button>
                <button class="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initAdminProducts);

