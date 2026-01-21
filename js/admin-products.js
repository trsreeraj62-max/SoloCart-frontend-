import CONFIG from './config.js';
import { apiCall } from './main.js';

let currentProducts = [];

async function initAdminProducts() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!token || !(user.role === 'admin' || user.role === 'Admin' || user.is_admin === true || user.is_admin === 1)) { 
        window.location.href = '/login.html'; 
        return; 
    }
    
    await fetchProducts();
    setupEventListeners();
}

async function fetchProducts() {
    try {
        const data = await apiCall('/products');
        
        // Handle paginated response: { success: true, data: { data: [...] } }
        const productList = data.data?.data || data.data || data.products || (Array.isArray(data) ? data : []);
        
        if (Array.isArray(productList)) {
            currentProducts = productList;
            renderProducts(currentProducts);
        }
    } catch (e) {
        console.error('Failed to load admin products', e);
        if (window.showToast) window.showToast('Failed to load products', 'error');
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
                <button class="edit-btn text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-btn text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors" data-id="${p.id}"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `;
    }).join('');

    table.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editProduct(btn.dataset.id)));
    table.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteProduct(btn.dataset.id)));
}

async function deleteProduct(id) {
    if (!confirm('Permanently delete this product?')) return;
    
    // Simulate deletion for now since DELETE endpoint might not be available
    if (window.showToast) window.showToast('Product successfully removed (Mock)', 'success');
    currentProducts = currentProducts.filter(p => p.id != id);
    renderProducts(currentProducts);

    /* Real implementation would look like this:
    try {
        const result = await apiCall(`/products/${id}`, { method: 'DELETE' });
        if (result.success) fetchProducts();
    } catch (e) { console.error(e); }
    */
}

function editProduct(id) {
    const product = currentProducts.find(p => p.id == id);
    if (product) {
        // Since we don't have a modal in the HTML yet, we'll just alert
        alert(`Edit feature coming soon for Product ID: ${product.id}`);
    }
}

function setupEventListeners() {
    // Add Product Button
    const addBtn = document.querySelector('button .fa-plus')?.parentElement;
    if (addBtn) {
        addBtn.addEventListener('click', () => {
             // Mock creation
             const newProduct = {
                 id: Date.now(),
                 name: 'New Demo Product',
                 price: 9999,
                 stock: 100,
                 category: { name: 'Demo Category' },
                 image: null
             };
             currentProducts.unshift(newProduct);
             renderProducts(currentProducts);
             if (window.showToast) window.showToast('New product initialized (Mock)', 'success');
        });
    }
}

document.addEventListener('DOMContentLoaded', initAdminProducts);

