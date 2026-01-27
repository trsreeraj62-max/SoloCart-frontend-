/* Admin Mobile Sidebar Toggler */

const setupAdminMobile = () => {
    // Check if element already exists
    if (document.querySelector('.mobile-sidebar-toggle')) return;

    // Create Toggle Button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-sidebar-toggle fas fa-bars';
    toggleBtn.id = 'toggle-sidebar';
    
    // Append to body (top left)
    document.body.prepend(toggleBtn);

    // Create Sidebar Overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    if (!sidebar) {
        console.warn('Sidebar not found in Admin Panel');
        return;
    }

    // Toggle Logic
    const toggleSidebar = () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        toggleBtn.classList.toggle('fa-bars');
        toggleBtn.classList.toggle('fa-times');
    };

    toggleBtn.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Handle Links Inside Sidebar (close on click if mobile)
    sidebar.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && window.innerWidth < 1024) {
            toggleSidebar();
        }
    });

    // Resize Handler
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            toggleBtn.classList.remove('fa-times');
            toggleBtn.classList.add('fa-bars');
        }
    });

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/admin-responsive.css';
    document.head.appendChild(link);
};

document.addEventListener('DOMContentLoaded', setupAdminMobile);
if (document.readyState === 'complete') setupAdminMobile();
