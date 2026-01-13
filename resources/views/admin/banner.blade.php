@extends('layouts.admin')

@section('content')
<div class="flex justify-between items-center mb-6">
    <div>
        <h1 class="font-bold text-2xl text-slate-800">Manage Banners</h1>
        <p class="text-slate-500">Control homepage banners and promos</p>
    </div>
    <div class="flex gap-3">
        <form action="{{ route('admin.banners.index') }}" method="GET" class="relative">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Search banners..." class="pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
            <i class="fas fa-search absolute left-3 top-3 text-slate-400"></i>
        </form>
        <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow transition flex items-center gap-2" onclick="openBannerModal()">
            <i class="fas fa-plus"></i> Add Banner
        </button>
    </div>
</div>

@if(session('success'))
<div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded shadow-sm role='alert'">
    <p>{{ session('success') }}</p>
</div>
@endif

<div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
    <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Image</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Title</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule</th>
                <th class="p-4 text-xs text-right font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
            @foreach($banners as $banner)
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4">
                    <img src="{{ asset('storage/' . $banner->image_path) }}" class="w-24 h-12 object-cover rounded border border-slate-200" alt="Banner">
                </td>
                <td class="p-4 font-bold text-slate-700">{{ $banner->title }}</td>
                <td class="p-4"><span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold uppercase">{{ $banner->type }}</span></td>
                <td class="p-4 text-xs text-slate-500">
                    <div>Start: {{ $banner->start_date }}</div>
                    <div>End: {{ $banner->end_date }}</div>
                </td>
                <td class="p-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button class="text-slate-400 hover:text-blue-600 transition" title="Edit" 
                                onclick="editBanner(this)" 
                                data-banner='{{ json_encode($banner) }}'>
                            <i class="fas fa-edit"></i>
                        </button>
                        <form action="{{ route('admin.banners.destroy', $banner->id) }}" method="POST" onsubmit="return confirm('Delete banner?');">
                            @csrf
                            @method('DELETE')
                            <button class="text-red-400 hover:text-red-600 transition" title="Delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </form>
                    </div>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>

<!-- Add Banner Modal -->
<div id="addBannerModal" class="fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 id="modalTitle" class="text-xl font-bold text-slate-800">Add New Banner</h3>
            <button onclick="closeBannerModal()" class="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
        </div>
        
        <form id="bannerForm" action="{{ route('admin.banners.store') }}" method="POST" enctype="multipart/form-data" class="p-6">
            @csrf
            <div id="methodContainer"></div>

            <div class="mb-4">
                <label class="block text-sm font-bold text-slate-700 mb-1">Title</label>
                <input type="text" name="title" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" required>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-bold text-slate-700 mb-1">Type</label>
                <select name="type" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="hero">Hero (Home Top)</option>
                    <option value="promo">Promo (Small)</option>
                </select>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                 <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">Start Date & Time</label>
                    <input type="datetime-local" name="start_date" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                 </div>
                 <div>
                    <label class="block text-sm font-bold text-slate-700 mb-1">End Date & Time</label>
                    <input type="datetime-local" name="end_date" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                 </div>
            </div>

            <div class="mb-6">
                <label class="block text-sm font-bold text-slate-700 mb-1">Banner Image</label>
                <div class="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition cursor-pointer relative" style="min-height: 150px; display: flex; align-items: center; justify-content: center;">
                     <input type="file" name="image" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="previewBanner(event)">
                     <div id="bannerPlaceholder">
                         <i class="fas fa-image text-3xl text-slate-400 mb-2"></i>
                         <p class="text-sm text-slate-500">Upload Banner</p>
                     </div>
                     <img id="bannerPreview" src="#" alt="Preview" class="hidden absolute inset-0 w-full h-full object-cover rounded-lg p-1 bg-white">
                </div>
            </div>

            <div class="flex justify-end gap-3">
                <button type="button" onclick="closeBannerModal()" class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow transition">Save Banner</button>
            </div>
        </form>
    </div>
</div>

<script>
    const storeRoute = "{{ route('admin.banners.store') }}";

    function openBannerModal() { 
        document.getElementById('addBannerModal').classList.remove('hidden'); 
        document.getElementById('bannerForm').reset();
        document.getElementById('bannerForm').action = storeRoute;
        document.getElementById('methodContainer').innerHTML = '';
        document.getElementById('modalTitle').textContent = 'Add New Banner';
        
        document.getElementById('bannerPreview').classList.add('hidden');
        document.getElementById('bannerPlaceholder').classList.remove('hidden');
    }
    
    function closeBannerModal() { document.getElementById('addBannerModal').classList.add('hidden'); }
    
    function previewBanner(event) {
        if(event.target.files && event.target.files[0]) {
            var output = document.getElementById('bannerPreview');
            var placeholder = document.getElementById('bannerPlaceholder');
            output.src = URL.createObjectURL(event.target.files[0]);
            output.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
    }

    function editBanner(btn) {
        const banner = JSON.parse(btn.dataset.banner);
        const form = document.getElementById('bannerForm');
        
        document.getElementById('addBannerModal').classList.remove('hidden');
        document.getElementById('modalTitle').textContent = 'Edit Banner';
        
        form.action = `/admin/banners/${banner.id}`;
        document.getElementById('methodContainer').innerHTML = '<input type="hidden" name="_method" value="PUT">';
        
        form.querySelector('[name="title"]').value = banner.title;
        form.querySelector('[name="type"]').value = banner.type;
        
        if(banner.start_date) form.querySelector('[name="start_date"]').value = banner.start_date.replace(' ', 'T').substring(0, 16);
        if(banner.end_date) form.querySelector('[name="end_date"]').value = banner.end_date.replace(' ', 'T').substring(0, 16);
    }
</script>
@endsection
