// admin.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('admin')) return;
    const me = Auth.getCurrentUser();
    if (me.email !== 'pedro@gmail.com' && me.role !== 'Administrador') {
        showToast('Acesso negado!', 'danger');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
        return;
    }
    const isOwner = me.email === 'pedro@gmail.com';

    async function render() {
        const users = await DB.getUsers();
        const pending = users.filter(u => u.status === 'pending');
        const active  = users.filter(u => u.status === 'active');

        // Busca as metas de todos os usuários ativos
        const userPrefs = await Promise.all(active.map(u => DB.getPrefs(u.email)));
        const prefsMap = {};
        active.forEach((u, i) => {
            prefsMap[u.email] = userPrefs[i]?.goal || 10000;
        });

        // Ordena para que Administradores fiquem no topo
        active.sort((a, b) => {
            const aAdmin = a.email === 'pedro@gmail.com' || a.role === 'Administrador';
            const bAdmin = b.email === 'pedro@gmail.com' || b.role === 'Administrador';
            if (aAdmin && !bAdmin) return -1;
            if (!aAdmin && bAdmin) return 1;
            if (a.email === 'pedro@gmail.com') return -1;
            if (b.email === 'pedro@gmail.com') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

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
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                        <button class="btn btn-success" onclick="approveUser('${u.email}')">
                            <i class="ph ph-check"></i> Aprovar
                        </button>
                        <button class="btn btn-primary" onclick="makeAdmin('${u.email}')">
                            <i class="ph ph-shield-check"></i> Tornar ADM
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
            const isAdmin = u.email === 'pedro@gmail.com' || u.role === 'Administrador';
            const avatarHtml = u.avatar_url ? `<img src="${u.avatar_url}" alt="${u.name}">` : `<i class="ph ph-user"></i>`;
            const key = u.email.replace('@','_').replace('.','_');
            const goalVal = prefsMap[u.email] || 10000;

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
                    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:0.25rem;">
                        ${!isAdmin ? `
                        <button class="btn btn-primary" style="font-size:0.82rem;padding:0.4rem 0.75rem;" onclick="makeAdmin('${u.email}')">
                            <i class="ph ph-shield-check"></i> Tornar ADM
                        </button>` : u.email !== 'pedro@gmail.com' ? `
                        <button class="btn btn-ghost" style="font-size:0.82rem;padding:0.4rem 0.75rem;" onclick="removeAdmin('${u.email}')">
                            <i class="ph ph-shield-warning"></i> Remover ADM
                        </button>` : ''}
                        ${isOwner && !isAdmin ? `
                        <input class="form-input" type="text" placeholder="Cargo..." id="role-${key}" value="${u.role || ''}" style="max-width:140px;padding:0.4rem 0.75rem;font-size:0.82rem;">
                        <button class="btn btn-ghost" onclick="updateRole('${u.email}')">Salvar Cargo</button>
                        ` : ''}
                        <div style="display:flex;align-items:center;gap:0.3rem;">
                            <input class="form-input" type="number" placeholder="Meta KM" id="goal-${key}" value="${goalVal}" style="max-width:110px;padding:0.4rem 0.6rem;font-size:0.82rem;">
                            <button class="btn btn-ghost" onclick="updateUserGoal('${u.email}')" title="Salvar Meta Individual"><i class="ph ph-target"></i> Meta</button>
                        </div>
                        ${u.email !== 'pedro@gmail.com' ? `
                        <button class="btn btn-danger" onclick="deleteUser('${u.email}')" title="Excluir Usuário"><i class="ph ph-trash"></i></button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Formulário de Meta Geral
    const globalForm = document.getElementById('global-goal-form');
    if (globalForm) {
        globalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-global-goal');
            btn.disabled = true;
            const goal = parseInt(document.getElementById('global-goal-input').value) || 10000;
            await DB.setGlobalGoal(goal);
            showToast(`Meta de ${fmt.number(goal)} km aplicada a todos os motoristas!`);
            btn.disabled = false;
            await render();
        });
    }

    window.approveUser = async (email) => {
        await DB.updateUser(email, { status: 'active' });
        showToast('Usuário aprovado!');
        await render();
    };
    window.makeAdmin = async (email) => {
        await DB.updateUser(email, { role: 'Administrador', status: 'active' });
        showToast('Usuário promovido a Administrador!');
        await render();
    };
    window.removeAdmin = async (email) => {
        if (email === 'pedro@gmail.com') {
            showToast('Não é possível remover o Administrador principal!', 'danger');
            return;
        }
        await DB.updateUser(email, { role: 'Motorista' });
        showToast('Privilégios de Administrador removidos!');
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
        if (me.email !== 'pedro@gmail.com') {
            showToast('Apenas o dono pode alterar cargos!', 'danger');
            return;
        }
        const targetUser = (await DB.getUsers()).find(u => u.email === email);
        if (targetUser && (targetUser.role === 'Administrador' || targetUser.email === 'pedro@gmail.com')) {
            showToast('Não é possível alterar o cargo de um Administrador!', 'danger');
            return;
        }
        const key = email.replace('@','_').replace('.','_');
        const role = document.getElementById(`role-${key}`)?.value || '';
        await DB.updateUser(email, { role });
        showToast('Cargo atualizado!');
        await render();
    };
    window.updateUserGoal = async (email) => {
        const key = email.replace('@','_').replace('.','_');
        const goalVal = parseInt(document.getElementById(`goal-${key}`)?.value) || 10000;
        await DB.savePrefs(email, goalVal);
        showToast(`Meta atualizada para ${fmt.number(goalVal)} km!`);
        await render();
    };

    await render();
});
