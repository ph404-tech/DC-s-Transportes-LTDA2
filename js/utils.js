// =============================================================
//  utils.js — DC's Transportes LTDA
//  Utilitários compartilhados: sidebar, toast, formatação
// =============================================================

// =============================================================
//  DONOS DO SISTEMA — adicione emails aqui para conceder
//  privilégios de dono (acima de Administrador).
// =============================================================
window.OWNER_EMAILS = ['pedro@gmail.com', 'carlosandre.ca286@gmail.com'];

/** Verifica se um email pertence a um dono do sistema */
window.isOwner = function(email) {
    return window.OWNER_EMAILS.includes(email);
};

/** Verifica se um usuário é admin ou dono */
window.isAdminUser = function(user) {
    if (!user) return false;
    return window.isOwner(user.email) || user.role === 'Administrador';
};

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
    // Mostra link admin e badge de pendentes
    const adminLink = document.getElementById('nav-admin-link');
    if (adminLink && (window.isOwner(user.email) || user.role === 'Administrador')) {
        adminLink.style.display = 'flex';
        // Busca pendentes e exibe badge
        DB.getUsers().then(users => {
            const pending = users.filter(u => u.status === 'pending').length;
            const badge = document.getElementById('nav-pending-badge');
            if (badge) {
                if (pending > 0) {
                    badge.textContent = pending;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
    }
};

// --- Injeta sidebar no placeholder ---
window.buildSidebar = function(activePage) {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (!placeholder) return;

    const links = [
        { id: 'dashboard', href: 'dashboard.html',  icon: 'ph-gauge',            label: 'Dashboard' },
        { id: 'drivers',   href: 'drivers.html',    icon: 'ph-users',            label: 'Motoristas' },
        { id: 'company',   href: 'company.html',    icon: 'ph-buildings',        label: 'Empresa' },
        { id: 'fines',     href: 'fines.html',      icon: 'ph-warning-circle',   label: 'Multas' },
        { id: 'downloads', href: 'downloads.html',  icon: 'ph-download-simple',  label: 'Downloads' },
        { id: 'mods',      href: 'mods.html',       icon: 'ph-cube',             label: 'Mods' },
        { id: 'ets2sync',  href: 'ets2sync.html',   icon: 'ph-broadcast',        label: 'ETS2 Sync' },
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
                    <span id="nav-pending-badge" class="nav-badge" style="display:none;">0</span>
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

// --- Modal de Perfil e Estatísticas do Motorista ---
window.viewUserProfile = async function(email) {
    let container = document.getElementById('user-profile-modal-overlay');
    if (!container) {
        container = document.createElement('div');
        container.id = 'user-profile-modal-overlay';
        container.className = 'modal-overlay';
        document.body.appendChild(container);
    }

    container.innerHTML = `
        <div class="modal" style="max-width:440px;text-align:center;">
            <div class="loading"><div class="spinner"></div> Carregando conta...</div>
        </div>
    `;
    container.classList.add('active');

    const user = await DB.getUserByEmail(email);
    if (!user) {
        window.showToast('Usuário não encontrado.', 'danger');
        container.classList.remove('active');
        return;
    }

    const [trips, fines, prefs] = await Promise.all([
        DB.getTripsByUser(email),
        DB.getFinesByUser(email),
        DB.getPrefs(email)
    ]);

    const totalKm = trips.reduce((s, t) => s + (t.distance || 0), 0);
    const totalIncome = trips.reduce((s, t) => s + (t.income || 0), 0);
    const finesCount = fines.length;
    const totalFines = fines.reduce((s, f) => s + (f.amount || 0), 0);
    const netIncome = totalIncome - totalFines;
    const level = fmt.level(totalKm);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const monthKm = trips.filter(t => t.date && t.date.startsWith(month)).reduce((s, t) => s + (t.distance || 0), 0);
    const goal = prefs?.goal || 10000;
    const goalPercent = Math.min(100, Math.round((monthKm / goal) * 100));

    const avatarHtml = user.avatar_url
        ? `<img src="${user.avatar_url}" alt="${user.name}">`
        : `<i class="ph ph-user"></i>`;

    const isAdmin = user.email === 'pedro@gmail.com' || user.role === 'Administrador';
    const roleBadge = isAdmin ? '👑 Administrador' : user.role || 'Motorista';
    const roleCls = isAdmin ? 'role-admin' : 'role-driver';

    container.innerHTML = `
        <div class="modal" style="max-width:440px;">
            <div class="modal-header">
                <h2>Conta do Motorista</h2>
                <button class="icon-btn" onclick="document.getElementById('user-profile-modal-overlay').classList.remove('active')">
                    <i class="ph ph-x"></i>
                </button>
            </div>
            
            <div style="text-align:center;margin-bottom:0.5rem;">
                <div class="profile-modal-avatar">${avatarHtml}</div>
                <h3 style="font-size:1.15rem;font-weight:800;margin-bottom:0.25rem;">${user.name}</h3>
                <span class="role-badge ${roleCls}" style="display:inline-block;margin-bottom:0.4rem;">${roleBadge}</span>
                <div style="font-weight:600;font-size:0.85rem;color:${level.color}">Nível: ${level.name}</div>
            </div>

            <div class="quota-bar-wrap" style="margin-top:0.5rem;margin-bottom:1rem;">
                <label>
                    <span>Meta mensal (${fmt.number(monthKm)} / ${fmt.number(goal)} km)</span>
                    <span>${goalPercent}%</span>
                </label>
                <div class="quota-bar"><div class="quota-fill" style="width:${goalPercent}%"></div></div>
            </div>

            <div class="profile-stats-grid">
                <div class="profile-stat-box">
                    <span class="lbl"><i class="ph ph-path"></i> KMs Percorridos</span>
                    <span class="val" style="color:var(--accent-light)">${fmt.number(totalKm)} km</span>
                </div>
                <div class="profile-stat-box">
                    <span class="lbl"><i class="ph ph-truck"></i> Viagens Feitas</span>
                    <span class="val">${trips.length}</span>
                </div>
                <div class="profile-stat-box">
                    <span class="lbl"><i class="ph ph-warning-circle"></i> Multas</span>
                    <span class="val" style="color:var(--danger)">${finesCount} (${fmt.currency(totalFines)})</span>
                </div>
                <div class="profile-stat-box">
                    <span class="lbl"><i class="ph ph-currency-eur"></i> Lucro Líquido</span>
                    <span class="val" style="color:var(--success)">${fmt.currency(netIncome)}</span>
                </div>
            </div>

            <button class="btn btn-ghost btn-full" style="margin-top:1rem;" onclick="document.getElementById('user-profile-modal-overlay').classList.remove('active')">
                Fechar
            </button>
        </div>
    `;

    container.onclick = (e) => {
        if (e.target === container) container.classList.remove('active');
    };
};
