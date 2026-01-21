import CONFIG from './config.js';
import { apiCall } from './main.js';

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
            renderUsers(data.users || data);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (e) {
        console.warn('Failed to load admin users (Using Mock Data)', e);
        // Fallback Mock Data so the page isn't empty
        renderUsers([
            { id: 1, name: 'Admin User', email: 'admin@store.com', role: 'admin', status: 'active', created_at: '2026-01-01T10:00:00Z' },
            { id: 2, name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', created_at: '2026-01-15T14:30:00Z' },
            { id: 3, name: 'Jane Smith', email: 'jane@test.com', role: 'user', status: 'suspended', created_at: '2026-01-20T09:15:00Z' },
            { id: 4, name: 'Robert Brown', email: 'robert@demo.com', role: 'user', status: 'active', created_at: '2026-01-21T11:45:00Z' },
            { id: 5, name: 'Alice Cooper', email: 'alice@rock.com', role: 'user', status: 'inactive', created_at: '2026-01-10T16:20:00Z' }
        ]);
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
                ${u.role !== 'admin' ? `
                    <button class="status-btn text-yellow-500 hover:bg-yellow-50 p-2 rounded-lg transition-colors" data-id="${u.id}" data-status="${u.status}">
                        <i class="fas ${u.status === 'suspended' ? 'fa-check-circle' : 'fa-ban'}"></i>
                    </button>
                    <button class="delete-btn text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors" data-id="${u.id}"><i class="fas fa-trash-alt"></i></button>
                ` : '<i class="fas fa-lock text-slate-300"></i>'}
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
}

async function toggleUserStatus(id, currentStatus) {
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const data = await apiCall(`/admin/users/${id}/toggle-status`, { method: 'POST' });
        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.showToast) window.showToast('Signal Frequency Reset Successful');
            fetchUsers();
        }
    } catch (e) {
        console.error('Failed to toggle status', e);
    }
}

async function deleteUser(id) {
    if (!confirm('Permanent data erasure initiated. Confirm deletion?')) return;
    try {
        const data = await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
        if (data && (data.success || !data.message?.includes('fail'))) {
            if (window.showToast) window.showToast('Identity Erased');
            fetchUsers();
        }
    } catch (e) {
        console.error('Failed to delete user', e);
    }
}

function setupEventListeners() {
    document.getElementById('user-search')?.addEventListener('input', fetchUsers);
}

document.addEventListener('DOMContentLoaded', initAdminUsers);

