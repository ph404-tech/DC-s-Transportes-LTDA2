// profile.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('profile')) return;
    let user = Auth.getCurrentUser();

    async function loadProfile() {
        const fresh = await DB.getUserByEmail(user.email);
        if (fresh) { user = fresh; Auth._setSession(fresh); }

        const isAdmin = user.email === 'pedro@gmail.com' || user.role === 'Administrador';

        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').value      = user.email;
        document.getElementById('edit-name').value          = user.name;
        document.getElementById('edit-email').value         = user.email;
        document.getElementById('profile-role').textContent = user.role || 'Motorista';

        const editRoleInput = document.getElementById('edit-role');
        if (editRoleInput) {
            editRoleInput.value = user.role || '';
            // Cargo nunca é editável no próprio perfil — somente o dono altera via Painel Admin
            editRoleInput.disabled = true;
            editRoleInput.style.opacity = '0.6';
            editRoleInput.style.cursor = 'not-allowed';
        }

        const avatarWrap = document.getElementById('avatar-wrap');
        if (user.avatar_url) {
            avatarWrap.innerHTML = `<img src="${user.avatar_url}" alt="${user.name}"><div class="overlay"><i class="ph ph-camera"></i></div>`;
        }

        // Goal
        const prefs = await DB.getPrefs(user.email);
        const goal = prefs?.goal || 10000;
        const goalCard = document.getElementById('goal-card');

        if (goalCard) {
            if (!isAdmin) {
                goalCard.style.display = 'none';
            } else {
                goalCard.style.display = 'block';
                document.getElementById('goal-input').value = goal;
            }
        }

        const trips = await DB.getTripsByUser(user.email);
        const now   = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthKm = trips.filter(t => t.date && t.date.startsWith(month)).reduce((s, t) => s + (t.distance || 0), 0);

        const quotaWrap = document.getElementById('quota-wrap');
        quotaWrap.style.display = 'block';
        document.getElementById('quota-label').textContent = `${fmt.number(monthKm)} / ${fmt.number(goal)} km`;
        document.getElementById('quota-fill').style.width  = `${Math.min(100, Math.round(monthKm / goal * 100))}%`;

        updateTopBar();
    }

    await loadProfile();

    // Avatar click
    document.getElementById('avatar-wrap').addEventListener('click', () => document.getElementById('avatar-input').click());
    document.getElementById('avatar-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('Imagem muito grande (máx 2MB)', 'danger'); return; }

        showToast('Enviando imagem...', 'info');
        const url = await DB.uploadAvatar(user.email, file);
        if (url) {
            await DB.updateUser(user.email, { avatar_url: url });
            showToast('Foto atualizada!');
            await loadProfile();
        } else {
            showToast('Erro ao enviar imagem.', 'danger');
        }
    });

    // Edit form
    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-profile');
        btn.disabled = true; btn.textContent = 'Salvando...';

        // Cargo nunca é enviado aqui — somente o dono altera cargo pelo Painel Admin
        const updated = await DB.updateUser(user.email, {
            name: document.getElementById('edit-name').value.trim()
        });
        if (updated) { showToast('Perfil atualizado!'); await loadProfile(); }
        else showToast('Erro ao salvar.', 'danger');
        btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Alterações';
    });

    // Goal form
    document.getElementById('goal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const isAdmin = user.email === 'pedro@gmail.com' || user.role === 'Administrador';
        if (!isAdmin) {
            showToast('Apenas administradores podem alterar metas mensais.', 'danger');
            return;
        }
        const goal = parseInt(document.getElementById('goal-input').value) || 10000;
        await DB.savePrefs(user.email, goal);
        showToast('Meta atualizada!');
        await loadProfile();
    });

    // Password form
    document.getElementById('pass-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = document.getElementById('pass-current').value;
        const newPass  = document.getElementById('pass-new').value;
        const confirm  = document.getElementById('pass-confirm').value;

        if (current !== user.password) { showToast('Senha atual incorreta.', 'danger'); return; }
        if (newPass !== confirm) { showToast('As senhas não coincidem!', 'danger'); return; }
        if (newPass.length < 6)  { showToast('A senha deve ter ao menos 6 caracteres.', 'danger'); return; }

        await DB.updateUser(user.email, { password: newPass });
        showToast('Senha alterada com sucesso!');
        e.target.reset();
    });

    // Delete account
    document.getElementById('btn-delete-account').addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) return;
        await DB.deleteUser(user.email);
        Auth.logout();
        window.location.href = 'index.html';
    });
});
