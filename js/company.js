// company.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('company')) return;

    const grid = document.getElementById('company-grid');
    const countEl = document.getElementById('member-count');

    const users = await DB.getUsers();
    const active = users.filter(u => u.status === 'active');
    countEl.textContent = `${active.length} membro${active.length !== 1 ? 's' : ''}`;

    if (!active.length) {
        grid.innerHTML = '<div class="empty-state"><i class="ph ph-users"></i><p>Nenhum membro ainda.</p></div>';
        return;
    }

    grid.innerHTML = active.map(u => {
        const avatarHtml = u.avatar_url
            ? `<img src="${u.avatar_url}" alt="${u.name}">`
            : `<i class="ph ph-user"></i>`;
        const isAdmin = u.email === 'pedro@gmail.com';
        const roleCls = isAdmin ? 'role-admin' : 'role-driver';
        const roleLabel = isAdmin ? '👑 Administrador' : u.role || 'Motorista';
        return `
            <div class="company-card">
                <div class="company-user">
                    <div class="company-avatar">${avatarHtml}</div>
                    <div>
                        <div class="company-name">${u.name}</div>
                        <div class="company-email">${u.email}</div>
                    </div>
                </div>
                <span class="role-badge ${roleCls}">${roleLabel}</span>
            </div>
        `;
    }).join('');
});
