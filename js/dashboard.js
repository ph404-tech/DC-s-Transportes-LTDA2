// =============================================================
//  dashboard.js — Painel de Controle (Pessoal & Empresa)
// =============================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('dashboard')) return;

    let user = Auth.getCurrentUser();
    let currentTab = 'personal'; // 'personal' | 'company'

    let personalTrips = [], personalFines = [], prefs = null;
    let allTrips = [], allFines = [];

    async function loadData() {
        const freshUser = await DB.getUserByEmail(user.email);
        if (freshUser) { user = freshUser; Auth._setSession(freshUser); }

        const [pTrips, pFines, pPrefs, aTrips, aFines] = await Promise.all([
            DB.getTripsByUser(user.email),
            DB.getFinesByUser(user.email),
            DB.getPrefs(user.email),
            DB.getTrips(),
            DB.getFines()
        ]);
        personalTrips = pTrips;
        personalFines = pFines;
        prefs = pPrefs;
        allTrips = aTrips;
        allFines = aFines;
    }

    function renderHeader() {
        const personalHeader = document.getElementById('personal-header');
        const tripActions    = document.getElementById('trip-actions');

        if (currentTab === 'personal') {
            personalHeader.style.display = 'flex';
            if (tripActions) tripActions.style.display = 'flex';

            // Name & Avatar
            document.getElementById('dash-user-name').textContent = user.name || 'Motorista';
            const avatarEl = document.getElementById('dash-user-avatar');
            if (user.avatar_url) {
                avatarEl.innerHTML = `<img src="${user.avatar_url}" alt="${user.name}">`;
            } else {
                avatarEl.innerHTML = `<i class="ph ph-user"></i>`;
            }

            // Role & Level
            const isAdmin = user.email === 'pedro@gmail.com' || user.role === 'Administrador';
            const roleEl = document.getElementById('dash-user-role');
            roleEl.textContent = isAdmin ? '👑 Administrador' : (user.role || 'Motorista');
            roleEl.className = `role-badge ${isAdmin ? 'role-admin' : 'role-driver'}`;

            const totalKm = personalTrips.reduce((s, t) => s + (t.distance || 0), 0);
            const lvl = fmt.level(totalKm);
            const levelEl = document.getElementById('dash-user-level');
            levelEl.textContent = `Nível: ${lvl.name}`;
            levelEl.style.color = lvl.color;

            // Monthly Goal
            const goal = prefs?.goal || 10000;
            const now = new Date();
            const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            const monthKm = personalTrips.filter(t => t.date && t.date.startsWith(month)).reduce((s, t) => s + (t.distance || 0), 0);
            const pct = Math.min(100, Math.round((monthKm / goal) * 100));

            document.getElementById('dash-goal-label').textContent = `${fmt.number(monthKm)} / ${fmt.number(goal)} km (${pct}%)`;
            document.getElementById('dash-goal-fill').style.width = `${pct}%`;
        } else {
            personalHeader.style.display = 'none';
            if (tripActions) tripActions.style.display = 'none';
        }
    }

    function renderStats() {
        const isPersonal = currentTab === 'personal';
        const tripsList = isPersonal ? personalTrips : allTrips;
        const finesList = isPersonal ? personalFines : allFines;

        const totalKm       = tripsList.reduce((s, t) => s + (t.distance || 0), 0);
        const totalIncome   = tripsList.reduce((s, t) => s + (t.income   || 0), 0);
        const totalFinesAmt = finesList.reduce((s, f) => s + (f.amount || 0), 0);

        document.getElementById('lbl-km').textContent     = isPersonal ? 'Meus KMs Percorridos' : 'Total Empresa (KMs)';
        document.getElementById('lbl-trips').textContent  = isPersonal ? 'Minhas Viagens'       : 'Viagens da Empresa';
        document.getElementById('lbl-income').textContent = isPersonal ? 'Meu Lucro Líquido'     : 'Lucro Total Empresa';
        document.getElementById('lbl-fines').textContent  = isPersonal ? 'Minhas Multas'        : 'Multas da Empresa';

        document.getElementById('stat-km').textContent     = `${fmt.number(totalKm)} km`;
        document.getElementById('stat-trips').textContent  = tripsList.length;
        document.getElementById('stat-income').textContent = fmt.currency(totalIncome - totalFinesAmt);
        document.getElementById('stat-fines').textContent  = `${finesList.length} (${fmt.currency(totalFinesAmt)})`;
    }

    function renderMonthly() {
        const isPersonal = currentTab === 'personal';
        document.getElementById('monthly-title').textContent = isPersonal ? 'Minhas Estatísticas Mensais' : 'Desempenho Mensal da Empresa';

        const grid = document.getElementById('monthly-grid');
        const tripsList = isPersonal ? personalTrips : allTrips;

        const stats = {};
        tripsList.forEach(t => {
            const d   = t.date ? new Date(t.date) : new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const lbl = `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            if (!stats[key]) stats[key] = { key, lbl, km: 0, loads: 0, income: 0 };
            stats[key].km     += t.distance || 0;
            stats[key].loads  += 1;
            stats[key].income += t.income   || 0;
        });

        const sorted = Object.values(stats).sort((a, b) => b.key.localeCompare(a.key));
        if (!sorted.length) {
            grid.innerHTML = '<div class="empty-state"><i class="ph ph-calendar-x"></i><p>Nenhuma estatística ainda.</p></div>';
            return;
        }
        grid.innerHTML = sorted.map(s => `
            <div class="month-card">
                <div class="month-name">${s.lbl}</div>
                <div class="month-stat"><span>Cargas</span><span class="val">${s.loads}</span></div>
                <div class="month-stat"><span>Distância</span><span class="val">${fmt.number(s.km)} km</span></div>
                <div class="month-stat"><span>Lucro</span><span class="val" style="color:var(--success)">${fmt.currency(s.income)}</span></div>
            </div>
        `).join('');
    }

    function renderTrips() {
        const isPersonal = currentTab === 'personal';
        document.getElementById('trips-title').textContent = isPersonal ? 'Minhas Últimas Viagens' : 'Todas as Viagens da Empresa';

        const list = document.getElementById('trips-list');
        const tripsList = isPersonal ? personalTrips : allTrips;

        if (!tripsList.length) {
            list.innerHTML = '<div class="empty-state"><i class="ph ph-road-horizon"></i><p>Nenhuma viagem registrada ainda.</p></div>';
            return;
        }

        list.innerHTML = tripsList.map(t => `
            <div class="trip-card">
                <div>
                    <div class="trip-route">
                        ${t.source || '?'} <i class="ph ph-arrow-right"></i> ${t.destination || '?'}
                    </div>
                    <div class="trip-meta">
                        ${!isPersonal && t.user_email ? `<span style="font-weight:600;color:var(--accent-light);">${t.user_email}</span> • ` : ''}
                        ${t.cargo ? `<span>${t.cargo}</span>` : ''}
                        <span>${fmt.date(t.date)}</span>
                    </div>
                </div>
                <div class="trip-stats">
                    <span class="trip-km">${fmt.number(t.distance)} km</span>
                    ${t.income ? `<span class="trip-income">+${fmt.currency(t.income)}</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    async function render() {
        await loadData();
        renderHeader();
        renderStats();
        renderMonthly();
        renderTrips();
    }

    // Tabs Click
    const tabPersonal = document.getElementById('tab-personal');
    const tabCompany = document.getElementById('tab-company');

    tabPersonal.onclick = async () => {
        if (currentTab === 'personal') return;
        currentTab = 'personal';
        tabPersonal.classList.add('active');
        tabCompany.classList.remove('active');
        await render();
    };

    tabCompany.onclick = async () => {
        if (currentTab === 'company') return;
        currentTab = 'company';
        tabCompany.classList.add('active');
        tabPersonal.classList.remove('active');
        await render();
    };

    await render();

    // --- Modal: Add Trip ---
    const modalTrip = document.getElementById('modal-trip');
    document.getElementById('btn-add-trip').onclick = () => modalTrip.classList.add('active');
    document.getElementById('btn-close-trip').onclick = () => modalTrip.classList.remove('active');
    modalTrip.addEventListener('click', e => { if (e.target === modalTrip) modalTrip.classList.remove('active'); });

    document.getElementById('trip-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-trip');
        btn.disabled = true; btn.textContent = 'Salvando...';

        const newTrip = await DB.createTrip({
            userEmail:   user.email,
            source:      document.getElementById('input-source').value,
            destination: document.getElementById('input-dest').value,
            distance:    parseInt(document.getElementById('input-distance').value) || 0,
            cargo:       document.getElementById('input-cargo').value,
            income:      parseInt(document.getElementById('input-income').value) || 0,
        });

        if (newTrip) {
            showToast('Viagem salva com sucesso!');
            e.target.reset();
            modalTrip.classList.remove('active');
            await render();
        } else {
            showToast('Erro ao salvar viagem.', 'danger');
        }
        btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Viagem';
    });

    // --- Clear History ---
    document.getElementById('btn-clear-history').addEventListener('click', async () => {
        if (!confirm('Apagar todo o seu histórico de viagens?')) return;
        await DB.deleteTripsByUser(user.email);
        showToast('Histórico apagado.');
        await render();
    });
});
