import CONFIG from '../js/config.js';

async function initAdminUsers() {
    const token = localStorage.getItem('auth_token');
    if (!token) { window.location.href = '/login'; return; }
    
    await fetchUsers();
    setupEventListeners();
}

async function fetchUsers() {
    const token = localStorage.getItem('auth_token');
    const search = document.getElementById('user-search').value;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/users?search=${search}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        renderUsers(data.users);
    } catch (e) {
        console.error(e);
    }
}

function renderUsers(users) {
    const table = document.getElementById('admin-users-table');
    table.innerHTML = users.map(u => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-[#2874f0] text-xs">
                        ${u.name.charAt(0)}
                    </div>
                    <div>
                        <span class="block font-bold text-slate-800">${u.name}</span>
                        <span class="text-[10px] text-slate-400 font-bold uppercase">${u.email}</span>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}">
                    ${u.role}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${u.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}">
                    ${u.status}
                </span>
            </td>
            <td class="px-6 py-4 text-slate-400 text-xs">${new Date(u.created_at).toLocaleDateString()}</td>
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
    const token = localStorage.getItem('auth_token');
    const action = currentStatus === 'suspended' ? 'activate' : 'suspend';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/admin/users/${id}/toggle-status`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            window.showToast?.('Signal Frequency Reset Successful');
            fetchUsers();
        }
    } catch (e) { console.error(e); }
}

async function deleteUser(id) {
    if (!confirm('Permanent data erasure initiated. Confirm deletion?')) return;
    const token = localStorage.getItem('auth_token');
    try {
        await fetch(`${CONFIG.API_BASE_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        window.showToast?.('Identity Erased');
        fetchUsers();
    } catch (e) { console.error(e); }
}

function setupEventListeners() {
    document.getElementById('user-search').addEventListener('input', fetchUsers);
}

document.addEventListener('DOMContentLoaded', initAdminUsers);
