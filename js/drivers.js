// =============================================================
//  drivers.js — Ranking de Motoristas
// =============================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('drivers')) return;

    const monthFilter = document.getElementById('month-filter');
    monthFilter.value = new Date().toISOString().slice(0, 7);

    async function render() {
        const grid = document.getElementById('drivers-grid');
        grid.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>';

        const [allUsers, allTrips, allFines] = await Promise.all([
            DB.getUsers(),
            DB.getTrips(),
            DB.getFines()
        ]);

        const month = monthFilter.value;
        const activeUsers = allUsers.filter(u => u.status === 'active');

        const stats = activeUsers.map(user => {
            const uTrips = allTrips.filter(t => t.user_email === user.email && t.date && t.date.startsWith(month));
            const uFines = allFines.filter(f => f.user_email === user.email && f.date && f.date.startsWith(month));
            const km     = uTrips.reduce((s, t) => s + (t.distance || 0), 0);
            const income = uTrips.reduce((s, t) => s + (t.income   || 0), 0);
            const fCost  = uFines.reduce((s, f) => s + (f.amount   || 0), 0);
            return { ...user, km, income: income - fCost, trips: uTrips.length, fines: uFines.length };
        }).sort((a, b) => b.km - a.km);

        if (!stats.length) {
            grid.innerHTML = '<div class="empty-state"><i class="ph ph-users"></i><p>Nenhum motorista encontrado.</p></div>';
            return;
        }

        grid.innerHTML = stats.map((d, i) => {
            const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
            const lvl = fmt.level(d.km);
            const avatarHtml = d.avatar_url
                ? `<img src="${d.avatar_url}" alt="${d.name}">`
                : `<i class="ph ph-user"></i>`;
            return `
                <div class="driver-card">
                    <div class="rank-badge ${rankClass}">${i+1}º</div>
                    <div class="driver-avatar-wrap">${avatarHtml}</div>
                    <div class="driver-name">${d.name}</div>
                    <div class="driver-level" style="color:${lvl.color}">${lvl.name}</div>
                    <div class="driver-stats-row">
                        <div class="driver-stat-item">
                            <div class="ds-label">KMs</div>
                            <div class="ds-value">${fmt.number(d.km)}</div>
                        </div>
                        <div class="driver-stat-item">
                            <div class="ds-label">Viagens</div>
                            <div class="ds-value">${d.trips}</div>
                        </div>
                        <div class="driver-stat-item">
                            <div class="ds-label">Lucro</div>
                            <div class="ds-value" style="color:var(--success)">${fmt.currency(d.income)}</div>
                        </div>
                        <div class="driver-stat-item">
                            <div class="ds-label">Multas</div>
                            <div class="ds-value" style="color:var(--danger)">${d.fines}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    monthFilter.addEventListener('change', render);
    await render();
});
