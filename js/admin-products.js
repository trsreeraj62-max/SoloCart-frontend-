import CONFIG from '../js/config.js';

async function initAdminProducts() {
    const token = localStorage.getItem('auth_token');
    if (!token) { window.location.href = '/login'; return; }
    
    await fetchProducts();
}

async function fetchProducts() {
    const token = localStorage.getItem('auth_token');
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        renderProducts(data.products);
    } catch (e) {
        console.error(e);
    }
}

function renderProducts(products) {
    const table = document.getElementById('products-table');
    table.innerHTML = products.map(p => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <img src="${p.image_url}" class="w-10 h-10 object-contain rounded border">
                    <div>
                        <span class="block font-bold text-slate-800">${p.name}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">ID: ${p.id}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-slate-500">${p.category ? p.category.name : 'N/A'}</td>
            <td class="px-6 py-4 font-black">₹${Number(p.price).toLocaleString()}</td>
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
    `).join('');
}

document.addEventListener('DOMContentLoaded', initAdminProducts);
