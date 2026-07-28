// =============================================================
//  app.js — DC's Transportes LTDA
//  Lógica principal do aplicativo.
//  Todas as operações de dados usam `await DB.*` (Supabase).
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // --- Auth Guard ---
    if (typeof Auth !== 'undefined') {
        Auth.checkProtection();
    }

    // --- Estado em Memória (cache local da sessão) ---
    let trips = [];
    let fines = [];
    let users = [];

    // Carregamento inicial dos dados
    async function loadAllData() {
        [trips, fines, users] = await Promise.all([
            DB.getTrips(),
            DB.getFines(),
            DB.getUsers(),
        ]);
    }

    // Global Toast Notification Helper
    window.showToast = function(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'danger' ? 'ph-warning-circle' : 'ph-check-circle';
        toast.innerHTML = `<i class="ph ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Helper: Number Formatting
    function formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(num || 0);
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(val || 0);
    }

    function getLevel(km) {
        if (km < 1000)  return "Iniciante";
        if (km < 5000)  return "Amador";
        if (km < 10000) return "Caminhoneiro";
        if (km < 50000) return "Rei da Estrada";
        return "Lenda";
    }

    // --- SPA Tab Switcher ---
    const tabButtons  = document.querySelectorAll('.nav-btn[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle   = document.getElementById('page-title');

    const tabTitles = {
        'dashboard': 'Painel de Controle',
        'downloads': 'Central de Downloads',
        'mods':      'Central de Mods',
        'drivers':   'Nossos Motoristas',
        'company':   'Nossos Colaboradores',
        'fines':     'Registro de Multas',
        'profile':   'Meu Perfil',
        'admin':     'Painel de Administração'
    };

    async function switchTab(targetTabId) {
        if (!targetTabId) targetTabId = 'dashboard';

        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
        });

        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${targetTabId}`);
        });

        if (pageTitle && tabTitles[targetTabId]) {
            pageTitle.textContent = tabTitles[targetTabId];
        }

        // Fecha drawer mobile
        const sidebar        = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        if (sidebar)        sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');

        window.location.hash = targetTabId;
        await renderTab(targetTabId);
    }

    async function renderTab(tabId) {
        // Recarrega dados frescos do banco a cada troca de aba
        await loadAllData();

        switch (tabId) {
            case 'dashboard': await renderDashboard(); break;
            case 'drivers':   await renderDrivers();   break;
            case 'company':   renderCompany();         break;
            case 'fines':     await renderFines();     break;
            case 'profile':   await renderProfile();   break;
            case 'admin':     await renderAdmin();     break;
        }
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'));
        });
    });

    // Hash Router — inicialização
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && tabTitles[initialHash]) {
        await switchTab(initialHash);
    } else {
        await switchTab('dashboard');
    }

    // --- Header User Sync ---
    function updateHeaderProfile() {
        const currentUser      = Auth.getCurrentUser();
        const profileName      = document.querySelector('.user-profile span');
        const profileAvatarDiv = document.querySelector('.user-profile .avatar');

        if (currentUser) {
            if (profileName) profileName.textContent = currentUser.name;
            if (currentUser.avatar_url && profileAvatarDiv) {
                profileAvatarDiv.innerHTML = '';
                profileAvatarDiv.style.backgroundImage    = `url(${currentUser.avatar_url})`;
                profileAvatarDiv.style.backgroundSize     = 'cover';
                profileAvatarDiv.style.backgroundPosition = 'center';
                profileAvatarDiv.style.border             = '2px solid var(--accent)';
            }
            // Exibe botão de admin para o administrador
            if (currentUser.email === 'pedro@gmail.com') {
                const adminNavBtn = document.getElementById('nav-admin-btn');
                if (adminNavBtn) adminNavBtn.style.display = 'flex';
            }
        }
    }
    updateHeaderProfile();

    // ==========================================================
    //  Tab 1: Dashboard
    // ==========================================================
    async function renderDashboard() {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const userTrips  = trips.filter(t => t.user_email === currentUser.email);
        const totalKm    = userTrips.reduce((acc, t) => acc + (parseInt(t.distance) || 0), 0);
        const totalLoads = userTrips.length;

        const mainKm    = document.getElementById('main-total-km');
        const mainLoads = document.getElementById('main-total-loads');
        if (mainKm)    mainKm.textContent    = `${formatNumber(totalKm)} km`;
        if (mainLoads) mainLoads.textContent = `${totalLoads}`;

        renderMonthlyStats(userTrips);

        const tripsListContainer = document.getElementById('trips-list');
        if (!tripsListContainer) return;
        tripsListContainer.innerHTML = '';

        if (userTrips.length === 0) {
            tripsListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-road-horizon"></i>
                    <p>Nenhuma viagem registrada ainda.</p>
                </div>
            `;
            return;
        }

        // Já vêm ordenadas desc do banco; mostrar em ordem reversa (mais recente primeiro)
        userTrips.forEach(trip => {
            const card     = document.createElement('div');
            card.className = 'trip-card';
            const incomeHtml = trip.income
                ? `<div class="trip-income">+€ ${formatNumber(trip.income)}</div>`
                : '';
            const dateStr = trip.date
                ? new Date(trip.date).toLocaleDateString('pt-BR')
                : 'Data desconhecida';

            card.innerHTML = `
                <div class="trip-info">
                    <div class="trip-route">
                        ${trip.source} <i class="ph ph-arrow-right"></i> ${trip.destination}
                    </div>
                    <div class="trip-meta">
                        ${trip.cargo ? `Cargo: ${trip.cargo}` : 'Carga desconhecida'}
                        <span style="font-size:0.8em;opacity:0.7;margin-left:10px;">${dateStr}</span>
                    </div>
                </div>
                <div class="trip-stats">
                    <div class="trip-km">${formatNumber(trip.distance)} km</div>
                    ${incomeHtml}
                </div>
            `;
            tripsListContainer.appendChild(card);
        });
    }

    function renderMonthlyStats(userTrips) {
        const container = document.getElementById('monthly-stats-grid');
        if (!container) return;
        container.innerHTML = '';

        const stats = {};
        userTrips.forEach(trip => {
            const date     = trip.date ? new Date(trip.date) : new Date();
            const key      = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

            if (!stats[key]) {
                stats[key] = { key, name: monthStr, km: 0, loads: 0 };
            }
            stats[key].km    += parseInt(trip.distance) || 0;
            stats[key].loads += 1;
        });

        const sortedStats = Object.values(stats).sort((a, b) => b.key.localeCompare(a.key));

        if (sortedStats.length === 0) {
            container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:2rem;"><p>Nenhuma estatística mensal disponível.</p></div>`;
            return;
        }

        sortedStats.forEach(stat => {
            const card     = document.createElement('div');
            card.className = 'month-card';
            card.innerHTML = `
                <div class="month-header">
                    <span class="month-name">${stat.name}</span>
                    <i class="ph ph-calendar-blank" style="color:var(--accent);"></i>
                </div>
                <div class="month-stats">
                    <div class="stat-item">
                        <div class="stat-label">Cargas</div>
                        <div class="stat-value">${stat.loads}</div>
                    </div>
                    <div class="stat-item" style="text-align:right;">
                        <div class="stat-label">Distância</div>
                        <div class="stat-value">${formatNumber(stat.km)} km</div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // ==========================================================
    //  Tab 4: Drivers
    // ==========================================================
    let selectedDriverMonth = new Date().toISOString().slice(0, 7);
    const monthFilterInput  = document.getElementById('month-filter');
    if (monthFilterInput) {
        monthFilterInput.value = selectedDriverMonth;
        monthFilterInput.addEventListener('change', () => {
            selectedDriverMonth = monthFilterInput.value;
            renderDrivers();
        });
    }

    async function renderDrivers() {
        const driversList = document.getElementById('drivers-list');
        if (!driversList) return;
        driversList.innerHTML = '';

        const currentUser = Auth.getCurrentUser();

        const driversStats = users.map(user => {
            const userTrips = trips.filter(t =>
                t.user_email === user.email && t.date && t.date.startsWith(selectedDriverMonth)
            );
            const userFines = fines.filter(f =>
                f.user_email === user.email && f.date && f.date.startsWith(selectedDriverMonth)
            );

            const totalKm    = userTrips.reduce((acc, t) => acc + (parseInt(t.distance) || 0), 0);
            const tripsIncome = userTrips.reduce((acc, t) => acc + (parseInt(t.income)   || 0), 0);
            const finesCost  = userFines.reduce((acc, f) => acc + (parseInt(f.amount)    || 0), 0);

            return {
                ...user,
                totalKm,
                totalIncome: tripsIncome - finesCost,
                tripsCount:  userTrips.length,
                finesCount:  userFines.length,
                level:       getLevel(totalKm),
            };
        });

        driversStats.sort((a, b) => b.totalKm - a.totalKm);

        if (driversStats.length === 0) {
            driversList.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-secondary);padding:3rem;">Nenhum motorista encontrado para este período.</p>';
            return;
        }

        const isAdmin = currentUser && currentUser.email === 'pedro@gmail.com';

        driversStats.forEach((driver, index) => {
            const card     = document.createElement('div');
            card.className = 'driver-card';
            const avatarHtml = driver.avatar_url
                ? `<img src="${driver.avatar_url}" alt="${driver.name}">`
                : `<i class="ph ph-user"></i>`;
            const rankClass = index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : ''));

            let deleteBtnHtml = '';
            if (isAdmin && driver.email !== currentUser.email) {
                deleteBtnHtml = `
                    <button class="icon-btn delete-user-btn" data-email="${driver.email}"
                        style="position:absolute;top:1rem;left:1rem;color:var(--danger);background:rgba(0,0,0,0.5);width:32px;height:32px;padding:0;justify-content:center;border-radius:50%;">
                        <i class="ph ph-trash"></i>
                    </button>
                `;
            }

            card.innerHTML = `
                ${deleteBtnHtml}
                <div class="rank-badge ${rankClass}">${index + 1}º</div>
                <div class="driver-avatar">${avatarHtml}</div>
                <div class="driver-name">${driver.name}</div>
                <div class="driver-level">${driver.level}</div>
                <div class="driver-stats">
                    <div class="stat"><h5>TOTAL KMs</h5><span>${formatNumber(driver.totalKm)} km</span></div>
                    <div class="stat"><h5>VIAGENS</h5><span>${driver.tripsCount}</span></div>
                    <div class="stat"><h5>LUCRO</h5><span style="color:var(--accent);">${formatCurrency(driver.totalIncome)}</span></div>
                    <div class="stat"><h5>MULTAS</h5><span style="color:var(--danger);">${driver.finesCount}</span></div>
                </div>
            `;
            driversList.appendChild(card);
        });

        // Listener para deletar motorista
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                userToDeleteEmail = btn.getAttribute('data-email');
                const deleteModal = document.getElementById('delete-modal');
                if (deleteModal) deleteModal.classList.add('active');
            });
        });
    }

    // ==========================================================
    //  Tab 5: Company
    // ==========================================================
    function renderCompany() {
        const companyList = document.getElementById('company-list');
        if (!companyList) return;
        companyList.innerHTML = '';

        const adminEmail  = 'pedro@gmail.com';
        const sortedUsers = [...users].sort((a, b) => {
            if (a.email === adminEmail) return -1;
            if (b.email === adminEmail) return 1;
            return 0;
        });

        sortedUsers.forEach(user => {
            const isUserAdmin = user.email === adminEmail;
            const roleName    = isUserAdmin ? 'Administrador' : (user.role || 'Motorista');
            const roleClass   = isUserAdmin ? 'role-admin' : 'role-driver';
            const avatarHtml  = user.avatar_url
                ? `<img src="${user.avatar_url}" alt="${user.name}">`
                : `<i class="ph ph-user"></i>`;

            const card     = document.createElement('div');
            card.className = 'company-card';
            card.innerHTML = `
                <div class="company-user-info">
                    <div class="company-avatar">${avatarHtml}</div>
                    <div class="company-name">${user.name}</div>
                </div>
                <div class="company-role ${roleClass}">${roleName}</div>
            `;
            companyList.appendChild(card);
        });
    }

    // ==========================================================
    //  Tab 6: Fines
    // ==========================================================
    async function renderFines() {
        const finesListContainer  = document.getElementById('fines-list');
        const totalFinesDisplay   = document.getElementById('total-fines-display');
        if (!finesListContainer) return;
        finesListContainer.innerHTML = '';

        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const userFines = fines.filter(f => f.user_email === currentUser.email);
        const totalDebt = userFines.reduce((acc, f) => acc + (parseInt(f.amount) || 0), 0);

        if (totalFinesDisplay) totalFinesDisplay.innerHTML = formatCurrency(totalDebt);

        if (userFines.length === 0) {
            finesListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-thumbs-up"></i>
                    <p>Nenhuma multa registrada. Parabéns!</p>
                </div>
            `;
            return;
        }

        userFines.forEach(fine => {
            const card     = document.createElement('div');
            card.className = 'fine-card';
            const dateStr  = fine.date ? new Date(fine.date).toLocaleDateString('pt-BR') : '-';

            card.innerHTML = `
                <div class="fine-info">
                    <h4>${fine.type}</h4>
                    <div class="fine-desc">Data: ${dateStr}</div>
                </div>
                <div class="fine-cost">-${formatCurrency(fine.amount)}</div>
            `;
            finesListContainer.appendChild(card);
        });
    }

    // ==========================================================
    //  Tab 7: Profile
    // ==========================================================
    async function renderProfile() {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) return;

        const nameDisplay      = document.getElementById('profile-name-display');
        const emailDisplay     = document.getElementById('profile-email-display');
        const editNameInput    = document.getElementById('edit-name');
        const avatarImg        = document.getElementById('profile-avatar-img');
        const defaultAvatarIcon = document.getElementById('default-avatar-icon');

        if (nameDisplay)   nameDisplay.textContent  = currentUser.name;
        if (emailDisplay)  emailDisplay.textContent = currentUser.email;
        if (editNameInput) editNameInput.value      = currentUser.name;

        if (currentUser.avatar_url && avatarImg && defaultAvatarIcon) {
            avatarImg.src          = currentUser.avatar_url;
            avatarImg.style.display         = 'block';
            defaultAvatarIcon.style.display = 'none';
        } else if (avatarImg && defaultAvatarIcon) {
            avatarImg.style.display         = 'none';
            defaultAvatarIcon.style.display = 'block';
        }

        // Quota / Meta
        const userPrefs  = await DB.getPrefs(currentUser.email);
        const userTrips  = trips.filter(t => t.user_email === currentUser.email);
        const totalDriven = userTrips.reduce((acc, t) => acc + (parseInt(t.distance) || 0), 0);
        const goal = userPrefs.goal || 10000;

        let remaining  = Math.max(goal - totalDriven, 0);
        let percentage = Math.min((totalDriven / goal) * 100, 100);

        const quotaDriven       = document.getElementById('quota-driven');
        const quotaRemaining    = document.getElementById('quota-remaining');
        const quotaDisplay      = document.getElementById('current-quota-display');
        const quotaProgressFill = document.getElementById('quota-progress-fill');
        const quotaPercentage   = document.getElementById('quota-percentage');

        if (quotaDriven)       quotaDriven.textContent       = `${formatNumber(totalDriven)} km`;
        if (quotaRemaining)    quotaRemaining.textContent    = `${formatNumber(remaining)} km`;
        if (quotaDisplay)      quotaDisplay.textContent      = formatNumber(goal);
        if (quotaPercentage)   quotaPercentage.textContent   = `${Math.round(percentage)}%`;
        if (quotaProgressFill) {
            quotaProgressFill.style.width           = `${percentage}%`;
            quotaProgressFill.style.backgroundColor = percentage >= 100
                ? 'var(--success)'
                : 'var(--accent)';
        }
    }

    // ==========================================================
    //  Tab 8: Admin
    // ==========================================================
    async function saveUserRole(email, role) {
        await DB.updateUser(email, { role });
    }

    async function renderAdmin() {
        const container   = document.getElementById('pending-list');
        if (!container) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser || currentUser.email !== 'pedro@gmail.com') {
            container.innerHTML = `<div style="padding:2rem;color:var(--danger);grid-column:1/-1;">Acesso Restrito ao Administrador.</div>`;
            return;
        }

        container.innerHTML = '';

        // ── SUMMARY BAR ──────────────────────────────────────────
        const total   = users.length;
        const pending = users.filter(u => u.status === 'pending').length;
        const active  = users.filter(u => u.status === 'active').length;

        const summaryBar = document.createElement('div');
        summaryBar.style.cssText = 'grid-column:1/-1;display:flex;gap:2rem;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1.1rem 1.75rem;margin-bottom:0.25rem;flex-wrap:wrap;';
        summaryBar.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <i class="ph ph-users" style="font-size:1.4rem;color:var(--accent);"></i>
                <div><div style="font-size:1.5rem;font-weight:800;color:var(--text-primary);">${total}</div><div style="font-size:0.75rem;color:var(--text-secondary);">Total</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <i class="ph ph-check-circle" style="font-size:1.4rem;color:#22c55e;"></i>
                <div><div style="font-size:1.5rem;font-weight:800;color:#22c55e;">${active}</div><div style="font-size:0.75rem;color:var(--text-secondary);">Ativos</div></div>
            </div>
            <div style="display:flex;align-items:center;gap:0.6rem;">
                <i class="ph ph-clock" style="font-size:1.4rem;color:#fb923c;"></i>
                <div><div style="font-size:1.5rem;font-weight:800;color:#fb923c;">${pending}</div><div style="font-size:0.75rem;color:var(--text-secondary);">Aguardando</div></div>
            </div>
        `;
        container.appendChild(summaryBar);

        // ── PENDING APPROVALS ────────────────────────────────────
        const pendingUsers    = users.filter(u => u.status === 'pending');
        const pendingSection  = document.createElement('div');
        pendingSection.style.cssText = 'grid-column:1/-1;';
        pendingSection.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.75rem;margin:1.25rem 0 1rem;">
                <i class="ph ph-clock-countdown" style="font-size:1.3rem;color:#fb923c;"></i>
                <h3 style="color:var(--text-primary);margin:0;font-size:1.1rem;">Solicitações de Acesso</h3>
                ${pending > 0 ? `<span style="background:#fb923c;color:white;border-radius:20px;padding:0.1rem 0.6rem;font-size:0.75rem;font-weight:700;">${pending}</span>` : ''}
            </div>
        `;

        if (pendingUsers.length === 0) {
            pendingSection.innerHTML += `
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:1.5rem;display:flex;align-items:center;gap:1rem;color:var(--text-secondary);">
                    <i class="ph ph-check-circle" style="font-size:1.75rem;color:#22c55e;flex-shrink:0;"></i>
                    <span>Nenhuma solicitação pendente. Tudo em ordem!</span>
                </div>
            `;
        } else {
            const pendingGrid = document.createElement('div');
            pendingGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem;';

            pendingUsers.forEach(user => {
                const card = document.createElement('div');
                card.style.cssText = 'background:var(--bg-card);border:1px solid #fb923c55;border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:1rem;';
                card.innerHTML = `
                    <div style="display:flex;align-items:center;gap:0.85rem;">
                        <div style="width:46px;height:46px;border-radius:50%;background:rgba(251,146,60,0.15);border:2px solid #fb923c;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="ph ph-user" style="font-size:1.4rem;color:#fb923c;"></i>
                        </div>
                        <div>
                            <h4 style="margin:0;color:var(--text-primary);font-size:0.95rem;">${user.name}</h4>
                            <p style="margin:0.15rem 0 0;color:var(--text-secondary);font-size:0.8rem;">${user.email}</p>
                        </div>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <button class="btn-approve" data-email="${user.email}"
                            style="flex:1;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;padding:0.5rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
                            <i class="ph ph-check"></i> Aprovar
                        </button>
                        <button class="btn-reject" data-email="${user.email}"
                            style="flex:1;background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid var(--danger);padding:0.5rem;border-radius:8px;cursor:pointer;font-size:0.85rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:0.4rem;">
                            <i class="ph ph-x"></i> Rejeitar
                        </button>
                    </div>
                `;
                pendingGrid.appendChild(card);
            });
            pendingSection.appendChild(pendingGrid);
        }
        container.appendChild(pendingSection);

        // ── ALL MEMBERS ──────────────────────────────────────────
        const membersHeader = document.createElement('div');
        membersHeader.style.cssText = 'grid-column:1/-1;';
        membersHeader.innerHTML = `
            <div style="display:flex;align-items:center;gap:0.75rem;margin:1.5rem 0 1rem;">
                <i class="ph ph-identification-badge" style="font-size:1.3rem;color:var(--accent);"></i>
                <h3 style="color:var(--text-primary);margin:0;font-size:1.1rem;">Todos os Membros</h3>
            </div>
        `;
        container.appendChild(membersHeader);

        const ROLES = [
            'Motorista', 'Motorista Sênior', 'Recrutador',
            'Gerente de Recrutamento', 'Gerente Geral',
            'Coordenador Logístico', 'Despachante',
            'Recursos Humanos', 'Diretor', 'Personalizado...'
        ];

        const sorted = [...users].sort((a, b) => {
            const rank = u => u.email === 'pedro@gmail.com' ? 0 : u.status === 'active' ? 1 : 2;
            return rank(a) - rank(b);
        });

        const membersGrid = document.createElement('div');
        membersGrid.style.cssText = 'grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:1rem;';

        sorted.forEach(user => {
            const isAdmin   = user.email === 'pedro@gmail.com';
            const isPending = user.status === 'pending';
            const currentRole = user.role || (isAdmin ? 'Administrador' : 'Motorista');

            const userTripsCount = trips.filter(t => t.user_email === user.email).length;
            const userFinesCount = fines.filter(f => f.user_email === user.email).length;
            const userKm         = trips.filter(t => t.user_email === user.email).reduce((s, t) => s + (t.distance || 0), 0);

            const statusBadge = isAdmin
                ? `<span style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid #fbbf24;padding:0.15rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:700;">🛡 Admin</span>`
                : isPending
                ? `<span style="background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid #fb923c;padding:0.15rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:700;">⏳ Pendente</span>`
                : `<span style="background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid #22c55e;padding:0.15rem 0.6rem;border-radius:20px;font-size:0.72rem;font-weight:700;">✓ Ativo</span>`;

            const avatarHtml = user.avatar_url
                ? `<img src="${user.avatar_url}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                : `<i class="ph ph-user" style="font-size:1.4rem;"></i>`;

            const roleOptions = ROLES.map(r =>
                `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>`
            ).join('');

            const roleSection = isAdmin ? '' : `
                <div style="border-top:1px solid var(--border);padding-top:0.85rem;">
                    <label style="font-size:0.78rem;color:var(--text-secondary);font-weight:600;display:block;margin-bottom:0.4rem;">CARGO</label>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <select class="role-select" data-email="${user.email}"
                            style="flex:1;background:var(--bg-hover);border:1px solid var(--border);color:var(--text-primary);padding:0.4rem 0.6rem;border-radius:8px;font-size:0.85rem;font-family:inherit;cursor:pointer;outline:none;">
                            ${roleOptions}
                        </select>
                    </div>
                    <div class="custom-role-wrapper" data-for="${user.email}"
                        style="${currentRole === 'Personalizado...' ? '' : 'display:none;'}margin-top:0.4rem;display:flex;gap:0.5rem;">
                        <input type="text" class="custom-role-input" data-email="${user.email}"
                            value="${currentRole && !ROLES.slice(0,-1).includes(currentRole) ? currentRole : ''}"
                            placeholder="Digite o cargo personalizado..."
                            style="flex:1;background:var(--bg-hover);border:1px solid var(--border);color:var(--text-primary);padding:0.4rem 0.7rem;border-radius:8px;font-size:0.85rem;font-family:inherit;outline:none;">
                        <button class="btn-save-role" data-email="${user.email}"
                            style="background:var(--accent);color:white;border:none;padding:0.4rem 0.7rem;border-radius:8px;cursor:pointer;font-size:0.82rem;font-weight:600;white-space:nowrap;">
                            Salvar
                        </button>
                    </div>
                </div>
            `;

            const removeBtn = (!isAdmin && !isPending) ? `
                <button class="btn-remove-user" data-email="${user.email}"
                    style="background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid var(--danger);padding:0.35rem 0.75rem;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;display:flex;align-items:center;gap:0.3rem;white-space:nowrap;">
                    <i class="ph ph-trash"></i> Remover
                </button>
            ` : '';

            const card = document.createElement('div');
            card.style.cssText = 'background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:1.25rem;display:flex;flex-direction:column;gap:0.85rem;';
            card.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.85rem;">
                    <div style="width:48px;height:48px;border-radius:50%;background:var(--bg-hover);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">
                        ${avatarHtml}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
                            <h4 style="margin:0;color:var(--text-primary);font-size:0.95rem;">${user.name}</h4>
                            ${statusBadge}
                        </div>
                        <p style="margin:0.15rem 0 0;color:var(--text-secondary);font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.email}</p>
                        <p style="margin:0.1rem 0 0;color:var(--accent);font-size:0.78rem;font-weight:600;">${currentRole}</p>
                    </div>
                    ${removeBtn}
                </div>
                <div style="display:flex;gap:1rem;padding:0.6rem 0.9rem;background:var(--bg-hover);border-radius:10px;">
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1rem;font-weight:700;color:var(--text-primary);">${userTripsCount}</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary);">Viagens</div>
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1rem;font-weight:700;color:var(--text-primary);">${formatNumber(userKm)} km</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary);">Percorridos</div>
                    </div>
                    <div style="text-align:center;flex:1;">
                        <div style="font-size:1rem;font-weight:700;color:var(--danger);">${userFinesCount}</div>
                        <div style="font-size:0.7rem;color:var(--text-secondary);">Multas</div>
                    </div>
                </div>
                ${roleSection}
            `;
            membersGrid.appendChild(card);
        });

        container.appendChild(membersGrid);

        // ── EVENT LISTENERS ──────────────────────────────────────
        container.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email = btn.getAttribute('data-email');
                if (await Auth.approveUser(email)) {
                    users = await Auth.getAllUsers();
                    showToast('Usuário aprovado!');
                    renderAdmin();
                }
            });
        });

        container.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email = btn.getAttribute('data-email');
                if (confirm(`Deseja rejeitar o usuário ${email}?`)) {
                    if (await Auth.rejectUser(email)) {
                        users = await Auth.getAllUsers();
                        showToast('Usuário rejeitado.', 'danger');
                        renderAdmin();
                    }
                }
            });
        });

        container.querySelectorAll('.btn-remove-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email = btn.getAttribute('data-email');
                if (confirm(`Deseja remover permanentemente o usuário ${email}?`)) {
                    await DB.deleteTripsByUser(email);
                    await DB.deleteFinesByUser(email);
                    await DB.deleteUser(email);
                    users = users.filter(u => u.email !== email);
                    trips = trips.filter(t => t.user_email !== email);
                    fines = fines.filter(f => f.user_email !== email);
                    showToast('Motorista removido.', 'danger');
                    renderAdmin();
                }
            });
        });

        // Role select toggle
        container.querySelectorAll('.role-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                const email   = sel.getAttribute('data-email');
                const wrapper = container.querySelector(`.custom-role-wrapper[data-for="${email}"]`);
                if (sel.value === 'Personalizado...') {
                    if (wrapper) wrapper.style.display = 'flex';
                } else {
                    if (wrapper) wrapper.style.display = 'none';
                    await saveUserRole(email, sel.value);
                    showToast(`Cargo atualizado: ${sel.value}`);
                    renderAdmin();
                }
            });
        });

        // Save custom role
        container.querySelectorAll('.btn-save-role').forEach(btn => {
            btn.addEventListener('click', async () => {
                const email   = btn.getAttribute('data-email');
                const input   = container.querySelector(`.custom-role-input[data-email="${email}"]`);
                const roleVal = input ? input.value.trim() : '';
                if (!roleVal) { showToast('Digite um cargo válido!', 'danger'); return; }
                await saveUserRole(email, roleVal);
                showToast(`Cargo atualizado: ${roleVal}`);
                renderAdmin();
            });
        });
    }

    // ==========================================================
    //  Modal Handlers & Actions
    // ==========================================================

    // 1. Trip Modal
    const btnAddTrip       = document.getElementById('btn-add-trip');
    const modalTrip        = document.getElementById('add-trip-modal');
    const btnCloseTripModal = document.getElementById('btn-close-modal');
    const tripForm         = document.getElementById('trip-form');

    if (btnAddTrip)        btnAddTrip.addEventListener('click', () => modalTrip.classList.add('active'));
    if (btnCloseTripModal) btnCloseTripModal.addEventListener('click', () => modalTrip.classList.remove('active'));
    if (modalTrip) {
        modalTrip.addEventListener('click', (e) => {
            if (e.target === modalTrip) modalTrip.classList.remove('active');
        });
    }

    if (tripForm) {
        tripForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) return;

            const submitBtn = tripForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

            const newTrip = await DB.createTrip({
                userEmail:   currentUser.email,
                source:      document.getElementById('input-source').value,
                destination: document.getElementById('input-dest').value,
                distance:    parseInt(document.getElementById('input-distance').value) || 0,
                cargo:       document.getElementById('input-cargo').value,
                income:      parseInt(document.getElementById('input-income').value) || 0,
                date:        new Date().toISOString(),
            });

            if (newTrip) {
                trips.unshift(newTrip); // adiciona ao cache local
                tripForm.reset();
                modalTrip.classList.remove('active');
                showToast('Viagem salva com sucesso!');
                await renderDashboard();
            } else {
                showToast('Erro ao salvar viagem.', 'danger');
            }

            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Viagem'; }
        });
    }

    // 2. Clear History
    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', async () => {
            const currentUser = Auth.getCurrentUser();
            if (currentUser && confirm('Tem certeza que deseja apagar o seu histórico de viagens?')) {
                await DB.deleteTripsByUser(currentUser.email);
                trips = trips.filter(t => t.user_email !== currentUser.email);
                showToast('Histórico de viagens limpo.');
                await renderDashboard();
            }
        });
    }

    // 3. Fine Modal
    const btnAddFine       = document.getElementById('btn-add-fine');
    const modalFine        = document.getElementById('add-fine-modal');
    const btnCloseFineModal = document.getElementById('btn-close-fine-modal');
    const fineForm         = document.getElementById('fine-form');

    if (btnAddFine)        btnAddFine.addEventListener('click', () => modalFine.classList.add('active'));
    if (btnCloseFineModal) btnCloseFineModal.addEventListener('click', () => modalFine.classList.remove('active'));
    if (modalFine) {
        modalFine.addEventListener('click', (e) => {
            if (e.target === modalFine) modalFine.classList.remove('active');
        });
    }

    if (fineForm) {
        fineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) return;

            const submitBtn = fineForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Registrando...'; }

            const newFine = await DB.createFine({
                userEmail: currentUser.email,
                type:      document.getElementById('input-fine-type').value,
                amount:    parseInt(document.getElementById('input-fine-cost').value) || 0,
                date:      document.getElementById('input-fine-date').value || new Date().toISOString(),
            });

            if (newFine) {
                fines.unshift(newFine);
                fineForm.reset();
                modalFine.classList.remove('active');
                showToast('Multa registrada com sucesso!', 'danger');
                await renderFines();
            } else {
                showToast('Erro ao registrar multa.', 'danger');
            }

            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Registrar Multa'; }
        });
    }

    // 4. Quota Modal
    const btnOpenQuotaModal  = document.getElementById('btn-open-quota-modal');
    const modalQuota         = document.getElementById('quota-modal');
    const btnCloseQuotaModal = document.getElementById('btn-close-quota-modal');
    const quotaForm          = document.getElementById('quota-form');
    const quotaInput         = document.getElementById('input-quota');

    if (btnOpenQuotaModal) {
        btnOpenQuotaModal.addEventListener('click', async () => {
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                const userPrefs = await DB.getPrefs(currentUser.email);
                if (quotaInput) quotaInput.value = userPrefs.goal;
                if (modalQuota) modalQuota.classList.add('active');
            }
        });
    }
    if (btnCloseQuotaModal) btnCloseQuotaModal.addEventListener('click', () => modalQuota.classList.remove('active'));
    if (modalQuota) {
        modalQuota.addEventListener('click', (e) => {
            if (e.target === modalQuota) modalQuota.classList.remove('active');
        });
    }
    if (quotaForm) {
        quotaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) return;
            const newGoal = parseInt(quotaInput.value);
            if (newGoal > 0) {
                await DB.savePrefs(currentUser.email, newGoal);
                modalQuota.classList.remove('active');
                showToast('Meta mensal atualizada!');
                await renderProfile();
            }
        });
    }

    // 5. Profile Edit & Avatar Upload
    const profileForm     = document.getElementById('profile-form');
    const editNameInput   = document.getElementById('edit-name');
    const editPassInput   = document.getElementById('edit-password');
    const avatarContainer = document.getElementById('avatar-container');
    const avatarUpload    = document.getElementById('avatar-upload');

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = Auth.getCurrentUser();
            if (!currentUser) return;

            const submitBtn = profileForm.querySelector('button[type="submit"]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

            const updates = { name: editNameInput.value };
            const newPass = editPassInput ? editPassInput.value : '';
            if (newPass) updates.password = newPass;

            const updated = await DB.updateUser(currentUser.email, updates);
            if (updated) {
                Auth._setSession(updated);
                showToast('Perfil atualizado com sucesso!');
                updateHeaderProfile();
                await renderProfile();
            } else {
                showToast('Erro ao atualizar perfil.', 'danger');
            }

            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Alterações'; }
        });
    }

    if (avatarContainer && avatarUpload) {
        avatarContainer.addEventListener('click', () => avatarUpload.click());
        avatarUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                alert('A imagem é muito grande (máximo 2MB).');
                return;
            }

            const currentUser = Auth.getCurrentUser();
            if (!currentUser) return;

            showToast('Fazendo upload da foto...');
            const avatarUrl = await DB.uploadAvatar(currentUser.email, file);

            if (avatarUrl) {
                const updated = await DB.updateUser(currentUser.email, { avatar_url: avatarUrl });
                if (updated) {
                    Auth._setSession(updated);
                    showToast('Foto do perfil alterada!');
                    updateHeaderProfile();
                    await renderProfile();
                }
            } else {
                showToast('Erro no upload. Verifique o bucket "avatars" no Supabase.', 'danger');
            }
        });
    }

    // 6. Delete Driver Modal
    let userToDeleteEmail = null;
    const deleteModal      = document.getElementById('delete-modal');
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    const btnCancelDelete  = document.getElementById('btn-cancel-delete');

    const closeDelModal = () => {
        if (deleteModal) deleteModal.classList.remove('active');
        userToDeleteEmail = null;
    };
    if (closeDeleteModal) closeDeleteModal.addEventListener('click', closeDelModal);
    if (btnCancelDelete)  btnCancelDelete.addEventListener('click', closeDelModal);

    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', async () => {
            if (userToDeleteEmail) {
                await DB.deleteTripsByUser(userToDeleteEmail);
                await DB.deleteFinesByUser(userToDeleteEmail);
                await DB.deleteUser(userToDeleteEmail);
                users = users.filter(u => u.email !== userToDeleteEmail);
                trips = trips.filter(t => t.user_email !== userToDeleteEmail);
                fines = fines.filter(f => f.user_email !== userToDeleteEmail);
                closeDelModal();
                showToast('Motorista removido.', 'danger');
                await renderDrivers();
            }
        });
    }

    // 7. Delete Own Account Modal
    const btnDeleteAccount        = document.getElementById('btn-delete-account');
    const deleteProfileModal      = document.getElementById('delete-profile-modal');
    const closeProfileModal       = document.getElementById('close-profile-modal');
    const btnConfirmProfileDelete = document.getElementById('btn-confirm-profile-delete');
    const btnCancelProfileDelete  = document.getElementById('btn-cancel-profile-delete');

    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', () => deleteProfileModal.classList.add('active'));
    }
    const closeOwnAccountModal = () => {
        if (deleteProfileModal) deleteProfileModal.classList.remove('active');
    };
    if (closeProfileModal)      closeProfileModal.addEventListener('click', closeOwnAccountModal);
    if (btnCancelProfileDelete) btnCancelProfileDelete.addEventListener('click', closeOwnAccountModal);

    if (btnConfirmProfileDelete) {
        btnConfirmProfileDelete.addEventListener('click', async () => {
            const currentUser = Auth.getCurrentUser();
            if (currentUser) {
                await DB.deleteTripsByUser(currentUser.email);
                await DB.deleteFinesByUser(currentUser.email);
                await DB.deleteUser(currentUser.email);
                Auth.logout();
            }
        });
    }

    // --- Mobile Drawer ---
    const mobileMenuBtn  = document.getElementById('mobile-menu-btn');
    const sidebar        = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            if (sidebar)        sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            if (sidebar)        sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        });
    }

    // ==========================================================
    //  Telemetria (Electron)
    // ==========================================================
    if (window.electronAPI) {
        let lastJobState  = false;
        let lastTimestamp = 0;
        let lastFineStatus = false;

        setInterval(async () => {
            try {
                const data = await window.electronAPI.getTelemetry();
                if (data && data.connected) {
                    const currentUser = Auth.getCurrentUser();
                    if (!currentUser) return;

                    if (data.odometer && data.odometer > 0) {
                        const mainKm = document.getElementById('main-total-km');
                        if (mainKm) mainKm.textContent = `${formatNumber(Math.floor(data.odometer))} km`;
                    }

                    // Viagem completada
                    if (lastJobState === true && data.job_active === false) {
                        const now = Date.now();
                        if (now - lastTimestamp > 5000) {
                            lastTimestamp = now;
                            if (data.trip_distance > 1) {
                                const newTrip = await DB.createTrip({
                                    userEmail:   currentUser.email,
                                    source:      data.source,
                                    destination: data.destination,
                                    distance:    Math.round(data.trip_distance),
                                    cargo:       data.cargo,
                                    income:      data.income,
                                    date:        new Date().toISOString(),
                                });
                                if (newTrip) {
                                    trips.unshift(newTrip);
                                    showToast(`Viagem finalizada: ${data.source} -> ${data.destination}`);
                                    await renderDashboard();
                                }
                            }
                        }
                    }
                    lastJobState = data.job_active;

                    // Multa detectada
                    if (data.fine_detected === true) {
                        if (!lastFineStatus) {
                            const newFine = await DB.createFine({
                                userEmail: currentUser.email,
                                type:      data.fine_type || 'Infração Desconhecida',
                                amount:    data.fine_amount || 0,
                                date:      new Date().toISOString(),
                            });
                            if (newFine) {
                                fines.unshift(newFine);
                                showToast(`Multa recebida: -€ ${newFine.amount}`, 'danger');
                                await renderFines();
                            }
                        }
                        lastFineStatus = true;
                    } else {
                        lastFineStatus = false;
                    }
                }
            } catch (err) {
                console.error('Telemetry Error', err);
            }
        }, 1000);
    }
});
