// =============================================================
//  dashboard.js — Painel de Controle
// =============================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('dashboard')) return;

    const user = Auth.getCurrentUser();
    let trips = [], fines = [];

    async function loadData() {
        [trips, fines] = await Promise.all([
            DB.getTripsByUser(user.email),
            DB.getFinesByUser(user.email)
        ]);
    }

    // --- Stats ---
    function renderStats() {
        const totalKm     = trips.reduce((s, t) => s + (t.distance || 0), 0);
        const totalIncome = trips.reduce((s, t) => s + (t.income   || 0), 0);
        document.getElementById('stat-km').textContent     = `${fmt.number(totalKm)} km`;
        document.getElementById('stat-trips').textContent  = trips.length;
        document.getElementById('stat-income').textContent = fmt.currency(totalIncome);
        document.getElementById('stat-fines').textContent  = fines.length;
    }

    // --- Monthly Stats ---
    function renderMonthly() {
        const grid = document.getElementById('monthly-grid');
        const stats = {};
        trips.forEach(t => {
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

    // --- Trip List ---
    function renderTrips() {
        const list = document.getElementById('trips-list');
        if (!trips.length) {
            list.innerHTML = '<div class="empty-state"><i class="ph ph-road-horizon"></i><p>Nenhuma viagem registrada ainda.</p></div>';
            return;
        }
        list.innerHTML = trips.map(t => `
            <div class="trip-card">
                <div>
                    <div class="trip-route">
                        ${t.source || '?'} <i class="ph ph-arrow-right"></i> ${t.destination || '?'}
                    </div>
                    <div class="trip-meta">
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
        renderStats();
        renderMonthly();
        renderTrips();
    }

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
