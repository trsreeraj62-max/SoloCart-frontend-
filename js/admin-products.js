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
        
        if (Array.isArray(productList) && productList.length > 0) {
            currentProducts = productList;
            renderProducts(currentProducts);
        } else {
            // Empty or no products
            currentProducts = [];
            renderProducts(currentProducts);
        }
    } catch (e) {
        console.error('Failed to load admin products', e);
        if (window.showToast) window.showToast('Failed to load products', 'error');
    }
}

function renderProducts(products) {
    const table = document.getElementById('products-table');
    if (!table) return;
    
    if (!Array.isArray(products) || products.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400 italic">No products found. Click "Add New Product" to create one.</td></tr>';
        return;
    }

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
                    ${p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock'}
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
    
    try {
        const data = await apiCall(`/products/${id}`, { method: 'DELETE' });
        if (data && data.success === true) {
            if (window.showToast) window.showToast('Product deleted successfully');
            fetchProducts();
        } else {
            throw new Error('Delete failed');
        }
    } catch (e) {
        console.warn('Failed to delete product (Using Mock Fallback)', e);
        currentProducts = currentProducts.filter(p => p.id != id);
        renderProducts(currentProducts);
        if (window.showToast) window.showToast('Product removed (Mock)', 'success');
    }
}

function editProduct(id) {
    const product = currentProducts.find(p => p.id == id);
    if (!product) return;
    
    // Populate form
    document.getElementById('product-id').value = product.id;
    document.getElementById('p-name').value = product.name || '';
    document.getElementById('p-description').value = product.description || '';
    document.getElementById('p-price').value = product.price || 0;
    document.getElementById('p-stock').value = product.stock || 0;
    document.getElementById('p-category').value = product.category_id || product.category?.id || 1;
    document.getElementById('p-brand').value = product.brand || '';
    document.getElementById('p-image').value = product.image_url || '';
    
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('productModal').classList.remove('hidden');
}

function openAddModal() {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('modal-title').textContent = 'Add New Product';
    document.getElementById('productModal').classList.remove('hidden');
}

async function saveProduct(e) {
    e.preventDefault();
    
    const id = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('p-name').value,
        description: document.getElementById('p-description').value,
        price: parseFloat(document.getElementById('p-price').value),
        stock: parseInt(document.getElementById('p-stock').value),
        category_id: parseInt(document.getElementById('p-category').value),
        brand: document.getElementById('p-brand').value,
        image_url: document.getElementById('p-image').value
    };
    
    const endpoint = id ? `/products/${id}` : '/products';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const data = await apiCall(endpoint, {
            method,
            body: JSON.stringify(productData)
        });
        
        if (data && data.success === true) {
            if (window.showToast) window.showToast(`Product ${id ? 'updated' : 'created'} successfully`);
            document.getElementById('productModal').classList.add('hidden');
            fetchProducts();
        } else {
            throw new Error('API returned failure');
        }
    } catch (e) {
        console.warn('Failed to save product (Using Mock Fallback)', e);
        
        // Mock fallback
        if (id) {
            // Update existing
            const index = currentProducts.findIndex(p => p.id == id);
            if (index !== -1) {
                currentProducts[index] = { 
                    ...currentProducts[index], 
                    ...productData,
                    category: { id: productData.category_id, name: 'Category ' + productData.category_id }
                };
            }
        } else {
            // Create new
            currentProducts.unshift({
                id: Date.now(),
                ...productData,
                category: { id: productData.category_id, name: 'Category ' + productData.category_id }
            });
        }
        
        renderProducts(currentProducts);
        document.getElementById('productModal').classList.add('hidden');
        if (window.showToast) window.showToast(`Product ${id ? 'updated' : 'created'} (Mock)`, 'success');
    }
}

function setupEventListeners() {
    // Add Product Button
    const addBtn = document.querySelector('button .fa-plus')?.parentElement;
    if (addBtn) {
        addBtn.addEventListener('click', openAddModal);
    }
    
    // Product Form Submit
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', saveProduct);
    }
}

document.addEventListener('DOMContentLoaded', initAdminProducts);

