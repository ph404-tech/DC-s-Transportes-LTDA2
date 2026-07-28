// =============================================================
//  utils.js — DC's Transportes LTDA
//  Utilitários compartilhados: sidebar, toast, formatação
// =============================================================

// --- Toast ---
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const icon = type === 'danger' ? 'ph-warning-circle' : type === 'info' ? 'ph-info' : 'ph-check-circle';
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="ph ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

// --- Formatação ---
window.fmt = {
    number: (n) => new Intl.NumberFormat('pt-BR').format(n || 0),
    currency: (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(n || 0),
    date: (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-',
    level: (km) => {
        if (km < 1000)  return { name: 'Iniciante',     color: '#94a3b8' };
        if (km < 5000)  return { name: 'Amador',        color: '#60a5fa' };
        if (km < 10000) return { name: 'Caminhoneiro',  color: '#34d399' };
        if (km < 50000) return { name: 'Rei da Estrada',color: '#fbbf24' };
        return              { name: 'Lenda',            color: '#f472b6' };
    }
};

// --- Auth guard: redireciona para login se não estiver logado ---
window.requireAuth = function() {
    if (!Auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
};

// --- Auth guard: redireciona para dashboard se já estiver logado ---
window.requireGuest = function() {
    if (Auth.isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
};

// --- Atualiza header com dados do usuário logado ---
window.updateTopBar = function() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const nameEl   = document.getElementById('top-bar-name');
    const avatarEl = document.getElementById('top-bar-avatar');
    if (nameEl)   nameEl.textContent = user.name;
    if (avatarEl) {
        if (user.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.name}">`;
        } else {
            avatarEl.innerHTML = `<i class="ph ph-user"></i>`;
        }
    }
    // Mostra link admin
    const adminLink = document.getElementById('nav-admin-link');
    if (adminLink && user.email === 'pedro@gmail.com') {
        adminLink.style.display = 'flex';
    }
};

// --- Injeta sidebar no placeholder ---
window.buildSidebar = function(activePage) {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) return;

    const links = [
        { id: 'dashboard', href: 'dashboard.html', icon: 'ph-gauge',            label: 'Dashboard' },
        { id: 'drivers',   href: 'drivers.html',   icon: 'ph-users',            label: 'Motoristas' },
        { id: 'company',   href: 'company.html',   icon: 'ph-buildings',        label: 'Empresa' },
        { id: 'fines',     href: 'fines.html',     icon: 'ph-warning-circle',   label: 'Multas' },
        { id: 'downloads', href: 'downloads.html', icon: 'ph-download-simple',  label: 'Downloads' },
        { id: 'mods',      href: 'mods.html',      icon: 'ph-cube',             label: 'Mods' },
    ];

    const navLinksHTML = links.map(link => `
        <a href="${link.href}" class="nav-link ${activePage === link.id ? 'active' : ''}">
            <i class="ph ${link.icon}"></i>
            <span>${link.label}</span>
        </a>
    `).join('');

    placeholder.innerHTML = `
        <nav class="sidebar" id="sidebar">
            <div class="logo">
                <i class="ph ph-truck"></i>
                <div>
                    <span>DC's Transportes</span>
                    <small>LTDA</small>
                </div>
            </div>

            <div class="nav-links">
                ${navLinksHTML}
                <a href="admin.html" id="nav-admin-link" class="nav-link nav-admin ${activePage === 'admin' ? 'active' : ''}" style="display:none;">
                    <i class="ph ph-shield-check"></i>
                    <span>Admin</span>
                </a>
            </div>

            <div class="sidebar-footer">
                <a href="profile.html" class="nav-link ${activePage === 'profile' ? 'active' : ''}">
                    <i class="ph ph-user-circle"></i>
                    <span>Meu Perfil</span>
                </a>
                <button class="btn-logout" id="btn-logout">
                    <i class="ph ph-sign-out"></i>
                    <span>Sair</span>
                </button>
            </div>
        </nav>
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
    `;

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        Auth.logout();
        window.location.href = 'index.html';
    });

    // Mobile menu
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('sidebar-overlay');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
};

// --- Inicialização padrão de páginas internas ---
window.initPage = function(activePage) {
    if (!window.requireAuth()) return false;
    window.buildSidebar(activePage);
    window.updateTopBar();
    return true;
};
