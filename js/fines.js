// fines.js
document.addEventListener('DOMContentLoaded', async () => {
    if (!window.initPage('fines')) return;
    const user = Auth.getCurrentUser();

    async function render() {
        const fines = await DB.getFinesByUser(user.email);
        document.getElementById('fine-count').textContent = fines.length;
        document.getElementById('fine-total').textContent = fmt.currency(fines.reduce((s, f) => s + (f.amount || 0), 0));

        const list = document.getElementById('fines-list');
        if (!fines.length) {
            list.innerHTML = '<div class="empty-state"><i class="ph ph-check-circle" style="color:var(--success)"></i><p>Nenhuma multa registrada. Continue assim!</p></div>';
            return;
        }
        list.innerHTML = fines.map(f => `
            <div class="fine-card">
                <div>
                    <div class="fine-type">${f.type || 'Infração'}</div>
                    <div class="fine-date">${fmt.date(f.date)}</div>
                </div>
                <span class="fine-amount">${fmt.currency(f.amount)}</span>
            </div>
        `).join('');
    }

    await render();

    const modal = document.getElementById('modal-fine');
    document.getElementById('btn-add-fine').onclick  = () => modal.classList.add('active');
    document.getElementById('btn-close-fine').onclick = () => modal.classList.remove('active');
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    document.getElementById('fine-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-fine');
        btn.disabled = true; btn.textContent = 'Salvando...';

        const result = await DB.createFine({
            userEmail: user.email,
            type:   document.getElementById('fine-type').value,
            amount: parseInt(document.getElementById('fine-amount').value) || 0,
        });

        if (result) {
            showToast('Multa registrada!', 'danger');
            e.target.reset();
            modal.classList.remove('active');
            await render();
        } else {
            showToast('Erro ao registrar multa.', 'danger');
        }
        btn.disabled = false; btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Multa';
    });
});
