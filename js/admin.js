// admin.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('admin')) return;
    const me = Auth.getCurrentUser();
    if (me.email !== 'pedro@gmail.com') {
        showToast('Acesso negado!', 'danger');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
        return;
    }

    async function render() {
        const users = await DB.getUsers();
        const pending = users.filter(u => u.status === 'pending');
        const active  = users.filter(u => u.status === 'active');

        document.getElementById('s-total').textContent   = users.length;
        document.getElementById('s-pending').textContent = pending.length;
        document.getElementById('s-active').textContent  = active.length;

        // Pending list
        const pendingList = document.getElementById('pending-list');
        if (!pending.length) {
            pendingList.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><i class="ph ph-check-circle" style="color:var(--success)"></i><p>Nenhum pedido pendente.</p></div>';
        } else {
            pendingList.innerHTML = pending.map(u => `
                <div class="member-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            <div class="company-avatar"><i class="ph ph-user"></i></div>
                            <div>
                                <div style="font-weight:700;">${u.name}</div>
                                <div style="font-size:0.8rem;color:var(--text-secondary);">${u.email}</div>
                            </div>
                        </div>
                        <span class="status-badge status-pending">Pendente</span>
                    </div>
                    <div style="display:flex;gap:0.5rem;">
                        <button class="btn btn-success" onclick="approveUser('${u.email}')">
                            <i class="ph ph-check"></i> Aprovar
                        </button>
                        <button class="btn btn-danger" onclick="rejectUser('${u.email}')">
                            <i class="ph ph-x"></i> Rejeitar
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // All members
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = active.map(u => {
            const isAdmin = u.email === 'pedro@gmail.com';
            const avatarHtml = u.avatar_url ? `<img src="${u.avatar_url}" alt="${u.name}">` : `<i class="ph ph-user"></i>`;
            return `
                <div class="member-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.75rem;">
                            <div class="company-avatar">${avatarHtml}</div>
                            <div>
                                <div style="font-weight:700;">${u.name}</div>
                                <div style="font-size:0.8rem;color:var(--text-secondary);">${u.email}</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            ${isAdmin ? '<span class="status-badge status-admin">👑 Admin</span>' : `<span class="status-badge status-active">${u.role || 'Motorista'}</span>`}
                        </div>
                    </div>
                    ${!isAdmin ? `
                    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                        <input class="form-input" type="text" placeholder="Cargo..." id="role-${u.email.replace('@','_').replace('.','_')}" value="${u.role || ''}" style="max-width:200px;padding:0.4rem 0.75rem;font-size:0.82rem;">
                        <button class="btn btn-ghost" onclick="updateRole('${u.email}')">Salvar Cargo</button>
                        <button class="btn btn-danger" onclick="deleteUser('${u.email}')"><i class="ph ph-trash"></i></button>
                    </div>` : ''}
                </div>
            `;
        }).join('');
    }

    window.approveUser = async (email) => {
        await DB.updateUser(email, { status: 'active' });
        showToast('Usuário aprovado!');
        await render();
    };
    window.rejectUser = async (email) => {
        if (!confirm('Rejeitar e excluir este usuário?')) return;
        await DB.deleteUser(email);
        showToast('Usuário removido.');
        await render();
    };
    window.deleteUser = async (email) => {
        if (!confirm(`Excluir ${email}?`)) return;
        await DB.deleteUser(email);
        showToast('Usuário excluído.');
        await render();
    };
    window.updateRole = async (email) => {
        const key = email.replace('@','_').replace('.','_');
        const role = document.getElementById(`role-${key}`)?.value || '';
        await DB.updateUser(email, { role });
        showToast('Cargo atualizado!');
        await render();
    };

    await render();
});
