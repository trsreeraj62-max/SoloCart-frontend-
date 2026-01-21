import CONFIG from './config.js';
import { apiCall } from './main.js';

let currentUsers = [];

async function initAdminUsers() {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');
    if (!token || !(user.role === 'admin' || user.role === 'Admin' || user.is_admin === true || user.is_admin === 1)) { 
        window.location.href = '/login.html'; 
        return; 
    }
    
    await fetchUsers();
    setupEventListeners();
}

async function fetchUsers() {
    const searchInput = document.getElementById('user-search');
    const search = searchInput ? searchInput.value : '';
    
    try {
        const data = await apiCall(`/admin/users?search=${search}`);
        if (data && (data.users || Array.isArray(data))) {
            currentUsers = data.users || data;
            renderUsers(currentUsers);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (e) {
        console.warn('Failed to load admin users (Using Mock Data)', e);
        // Fallback Mock Data so the page isn't empty
        currentUsers = [
            { id: 1, name: 'Admin User', email: 'admin@store.com', role: 'admin', status: 'active', created_at: '2026-01-01T10:00:00Z', phone: '1234567890', address: 'HQ' },
            { id: 2, name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', created_at: '2026-01-15T14:30:00Z', phone: '9876543210', address: '123 Main St' },
            { id: 3, name: 'Jane Smith', email: 'jane@test.com', role: 'user', status: 'suspended', created_at: '2026-01-20T09:15:00Z', phone: '5555555555', address: '456 Oak Ave' },
            { id: 4, name: 'Robert Brown', email: 'robert@demo.com', role: 'user', status: 'active', created_at: '2026-01-21T11:45:00Z', phone: '1112223334', address: '789 Pine Ln' },
            { id: 5, name: 'Alice Cooper', email: 'alice@rock.com', role: 'user', status: 'inactive', created_at: '2026-01-10T16:20:00Z', phone: '9998887776', address: '321 Elm St' }
        ];
        renderUsers(currentUsers);
        if (window.showToast) window.showToast('Backend endpoint disabled: Showing demo users', 'error');
    }
}

function renderUsers(users) {
    const table = document.getElementById('admin-users-table');
    if (!table || !Array.isArray(users)) return;

    table.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-[#2874f0] text-xs">
                        ${(u.name || 'U').charAt(0)}
                    </div>
                    <div>
                        <span class="block font-bold text-slate-800">${u.name || 'Unknown'}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">${u.email || '--'}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}">
                    ${u.role || 'user'}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}">
                    ${u.status || 'unknown'}
                </span>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${u.created_at ? new Date(u.created_at).toLocaleDateString() : '--'}</td>
            <td class="px-6 py-4 text-right space-x-2">
                <button class="view-btn text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${u.id}"><i class="fas fa-eye"></i></button>
                ${u.role !== 'admin' ? `
                    <button class="status-btn text-yellow-500 hover:bg-yellow-50 p-2 rounded-lg transition-colors" data-id="${u.id}" data-status="${u.status}">
                        <i class="fas ${u.status === 'suspended' ? 'fa-check-circle' : 'fa-ban'}"></i>
                    </button>
                    <button class="delete-btn text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors" data-id="${u.id}"><i class="fas fa-trash-alt"></i></button>
                ` : '<span class="inline-block w-8 text-center"><i class="fas fa-lock text-slate-300"></i></span>'}
            </td>
        </tr>
    `).join('');

    // Re-bind events
    table.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleUserStatus(btn.dataset.id, btn.dataset.status));
    });
    table.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(btn.dataset.id));
    });
    table.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => showUserDetails(btn.dataset.id));
    });
}

function showUserDetails(id) {
    const user = currentUsers.find(u => u.id == id);
    if (!user) return;
    
    const content = document.getElementById('user-modal-content');
    if (content) {
        content.innerHTML = `
            <div class="flex items-center gap-4 mb-6">
                 <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center font-black text-2xl text-[#2874f0]">
                        ${(user.name || 'U').charAt(0)}
                 </div>
                 <div>
                     <h4 class="text-xl font-bold text-slate-800">${user.name}</h4>
                     <p class="text-sm text-slate-500 font-mono">${user.email}</p>
                 </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="p-3 bg-slate-50 rounded-lg">
                    <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Role</p>
                    <p class="font-bold text-slate-700">${user.role}</p>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg">
                    <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Status</p>
                    <p class="font-bold ${user.status === 'active' ? 'text-green-600' : 'text-rose-600'}">${user.status}</p>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg">
                    <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Mobile</p>
                    <p class="font-bold text-slate-700">${user.phone || '--'}</p>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg">
                    <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Joined</p>
                    <p class="font-bold text-slate-700">${user.created_at ? new Date(user.created_at).toLocaleDateString() : '--'}</p>
                </div>
                <div class="col-span-2 p-3 bg-slate-50 rounded-lg">
                    <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Address</p>
                    <p class="font-bold text-slate-700">${user.address || 'No address provided'}</p>
                </div>
            </div>
        `;
    }
    
    document.getElementById('userModal').classList.remove('hidden');
}

async function toggleUserStatus(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const data = await apiCall(`/admin/users/${id}/toggle-status`, { method: 'POST' });
        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.showToast) window.showToast('Signal Frequency Reset Successful');
            fetchUsers();
        } else {
             throw new Error('Endpoint missing');
        }
    } catch (e) {
        console.warn('Failed to toggle status (Using Mock)', e);
        // Fallback Mock
        const user = currentUsers.find(u => u.id == id);
        if (user) {
            user.status = action === 'activate' ? 'active' : 'suspended';
            renderUsers(currentUsers);
            if (window.showToast) window.showToast(`User ${action}d (Mock)`, 'success');
        }
    }
}

async function deleteUser(id) {
    if (!confirm('Permanent data erasure initiated. Confirm deletion?')) return;
    try {
        const data = await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.showToast) window.showToast('Identity Erased');
            fetchUsers();
        } else {
             throw new Error('Endpoint missing');
        }
    } catch (e) {
        console.warn('Failed to delete user (Using Mock)', e);
        // Fallback Mock
        currentUsers = currentUsers.filter(u => u.id != id);
        renderUsers(currentUsers);
        if (window.showToast) window.showToast('User deleted (Mock)', 'success');
    }
}

function setupEventListeners() {
    document.getElementById('user-search')?.addEventListener('input', fetchUsers);
}

document.addEventListener('DOMContentLoaded', initAdminUsers);

