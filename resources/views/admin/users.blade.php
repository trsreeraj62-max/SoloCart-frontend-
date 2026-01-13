@extends('layouts.admin')

@section('content')
<div class="flex justify-between items-center mb-6">
    <div>
        <h1 class="font-bold text-2xl text-slate-800">User Management</h1>
        <p class="text-slate-500">Manage user accounts and access</p>
    </div>
    <form action="{{ route('admin.users.index') }}" method="GET" class="relative">
        <input type="text" name="search" value="{{ request('search') }}" placeholder="Search users..." class="pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
        <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
    </form>
</div>

@if(session('success'))
<div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm role='alert'">
    <p>{{ session('success') }}</p>
</div>
@endif
@if(session('error'))
<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm role='alert'">
    <p>{{ session('error') }}</p>
</div>
@endif

<div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
    <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th class="p-4 text-xs text-center font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th class="p-4 text-xs text-right font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
                @foreach($users as $user)
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-4 text-slate-500">#{{ $user->id }}</td>
                    <td class="p-4 font-bold text-slate-700">{{ $user->name }}</td>
                    <td class="p-4 text-slate-600">{{ $user->email }}</td>
                    <td class="p-4">
                        @if($user->role === 'admin')
                            <span class="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-bold uppercase">Admin</span>
                        @else
                            <span class="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold uppercase">User</span>
                        @endif
                    </td>
                    <td class="p-4 text-center">
                        @if($user->status === 'suspended')
                            <span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-bold uppercase">Suspended</span>
                        @else
                            <span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold uppercase">Active</span>
                        @endif
                    </td>
                    <td class="p-4 text-right">
                        @if($user->role !== 'admin')
                        <div class="flex items-center justify-end gap-3">
                            {{-- View Icon --}}
                            <button type="button" 
                                    class="text-blue-400 hover:text-blue-600 transition bg-transparent border-0 p-0 user-manifest-btn" 
                                    title="View Signal Manifest"
                                    data-name="{{ $user->name }}"
                                    data-email="{{ $user->email }}"
                                    data-phone="{{ $user->phone ?? 'N/A' }}"
                                    data-address="{{ $user->address ?? 'N/A' }}"
                                    data-status="{{ $user->status }}"
                                    data-lastlogin="{{ $user->last_login_at ? $user->last_login_at->format('d M Y, h:i A') : 'NEVER' }}">
                                <i class="fas fa-eye"></i>
                            </button>

                            <form action="{{ route('admin.users.suspend', $user->id) }}" method="POST">
                                @csrf
                                <button type="submit" class="text-yellow-500 hover:text-yellow-600 transition" title="{{ $user->status === 'suspended' ? 'Activate' : 'Suspend' }}">
                                    <i class="fas {{ $user->status === 'suspended' ? 'fa-check-circle' : 'fa-ban' }}"></i>
                                </button>
                            </form>
                            
                            <form action="{{ route('admin.users.destroy', $user->id) }}" method="POST" onsubmit="return confirm('Are you sure you want to delete this user?');">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="text-red-400 hover:text-red-600 transition" title="Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </form>
                        </div>
                        @else
                         <span class="text-slate-300"><i class="fas fa-lock"></i></span>
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    <div class="p-4 border-t border-slate-200 bg-slate-50">
        {{ $users->links() }}
    </div>
</div>
@endsection

@push('scripts')
<!-- User Detail Modal -->
<div id="userModal" class="hidden fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in slide-in-from-bottom duration-300">
        <div class="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 class="text-sm font-black uppercase tracking-widest text-[#2874f0]">User Manifest</h3>
            <button onclick="closeUserModal()" class="text-slate-400 hover:text-rose-500 transition"><i class="fas fa-times"></i></button>
        </div>
        <div class="p-8 space-y-6">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-[#2874f0] text-white rounded-full flex items-center justify-center text-2xl font-black shadow-lg" id="modalInitials">U</div>
                <div>
                    <h4 class="text-xl font-black text-slate-800 tracking-tighter" id="modalName">Name</h4>
                    <p class="text-xs font-bold text-slate-400 uppercase" id="modalEmail">Email</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                <div>
                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Mobile Terminal</p>
                    <p class="text-xs font-bold text-slate-700" id="modalPhone">Phone</p>
                </div>
                <div>
                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Account Status</p>
                    <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded" id="modalStatusBadge">Active</span>
                </div>
                <div class="col-12">
                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Geographic Vector</p>
                    <p class="text-xs font-bold text-slate-700 italic" id="modalAddress">Address</p>
                </div>
                <div class="col-12">
                    <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Last Signal Detected</p>
                    <p class="text-xs font-bold text-slate-700" id="modalLastLogin">Last Login</p>
                </div>
            </div>
        </div>
        <div class="p-4 bg-slate-50 text-center">
            <button onclick="closeUserModal()" class="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#2874f0] transition">Close Manifest</button>
        </div>
    </div>
</div>

<script>
document.addEventListener('click', function(e) {
    if (e.target.closest('.user-manifest-btn')) {
        const btn = e.target.closest('.user-manifest-btn');
        const data = {
            name: btn.dataset.name,
            email: btn.dataset.email,
            phone: btn.dataset.phone,
            address: btn.dataset.address,
            status: btn.dataset.status,
            lastLogin: btn.dataset.lastlogin
        };
        showUserManifest(data);
    }
});

function showUserManifest(data) {
    document.getElementById('modalName').innerText = data.name;
    document.getElementById('modalEmail').innerText = data.email;
    document.getElementById('modalPhone').innerText = data.phone;
    document.getElementById('modalAddress').innerText = data.address;
    document.getElementById('modalLastLogin').innerText = data.lastLogin;
    document.getElementById('modalInitials').innerText = data.name.charAt(0);
    
    const badge = document.getElementById('modalStatusBadge');
    badge.innerText = data.status;
    badge.className = data.status === 'suspended' 
        ? 'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-100 text-rose-600'
        : 'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-green-100 text-green-600';
    
    document.getElementById('userModal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
}

// Close on escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeUserModal();
});
</script>
@endpush
