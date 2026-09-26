/* ============================================================
   BOOST — Sistem boost akun
   ============================================================ */

(function() {
  const { $, status, clearStatus, toast, openModal, closeModal, state } = App;

  function openBoost(accId) {
    const a = state.accounts.find(x => x.id === accId);
    if (!a) return;

    state.currentAccountBoost = a;
    state.boostDuration = 24;
    clearStatus('boostStatus');
    $('boostTargetName').textContent = '@' + a.username;
    updateBoostDurationUI();
    updateBoostCost();
    openModal('modalBoost');
  }

  function updateBoostDurationUI() {
    document.querySelectorAll('.boost-dur-btn').forEach(b => {
      b.classList.toggle('boost-dur-active', Number(b.dataset.dur) === state.boostDuration);
    });
  }

  function updateBoostCost() {
    const cost = 3 * Math.ceil(state.boostDuration / 24);
    $('boostCost').textContent = cost + ' kredit';
    $('boostMyCredits').textContent = state.profile?.credits ?? 0;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.boost-dur-btn').forEach(b => {
      b.addEventListener('click', () => {
        state.boostDuration = Number(b.dataset.dur);
        updateBoostDurationUI();
        updateBoostCost();
      });
    });

    document.getElementById('btnConfirmBoost')?.addEventListener('click', async () => {
      const btn = $('btnConfirmBoost');
      btn.disabled = true;
      status('boostStatus', 'warn', 'Memproses...');

      try {
        const { data, error } = await sb.rpc('boost_account', {
          p_account_id: state.currentAccountBoost.id,
          p_hours: state.boostDuration,
        });
        if (error) throw error;

        toast(`🚀 Boost aktif! −${data.cost} kredit`, 'success', 4000);
        closeModal('modalBoost');
        await Promise.all([App.loadProfile(), App.loadAccounts()]);
      } catch (e) {
        status('boostStatus', 'error', e.message || 'Gagal boost');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="rocket" class="w-4 h-4 inline mr-1"></i> Konfirmasi Boost';
        App.icon();
      }
    });
  });

  App.openBoost = openBoost;
})();