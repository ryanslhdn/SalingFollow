/* ============================================================
   HISTORY — Riwayat klaim user
   ============================================================ */

(function() {
  const { $, esc, icon, PLATFORMS, state } = App;

  const STATUS_MAP = {
    awaiting_target: { label: 'Menunggu',  cls: 'pending' },
    approved:        { label: 'Disetujui', cls: 'success' },
    auto_approved:   { label: 'Auto OK',   cls: 'success' },
    rejected:        { label: 'Ditolak',   cls: 'danger' },
    expired:         { label: 'Expired',   cls: 'neutral' },
  };

  async function loadHistory() {
    const list = $('historyList');
    const empty = $('historyEmpty');
    if (!list) return;

    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('my_claims', { p_limit: 50 });

    if (error) {
      console.error('[History]', error);
      list.innerHTML = `
        <div class="info-box danger">
          <i data-lucide="alert-circle"></i>
          <span>Gagal memuat: ${esc(error.message)}</span>
        </div>`;
      icon();
      return;
    }

    state.history = data || [];

    if (!state.history.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.history.map((h, i) => {
      const p = PLATFORMS[h.target_platform] || { name: h.target_platform, icon: 'globe', color: '#64748b' };
      const st = STATUS_MAP[h.status] || STATUS_MAP.awaiting_target;

      return `
        <div class="history-item" style="animation-delay:${i * 30}ms">
          <div class="hi-avatar" style="background:${p.color}">
            <i data-lucide="${p.icon}"></i>
          </div>
          <div class="hi-body">
            <div class="hi-username">@${esc(h.target_username)}</div>
            <div class="hi-date">${App.formatDateTime(h.claim_time)}</div>
          </div>
          <div class="hi-right">
            ${h.credits_awarded > 0 ? `<div class="hi-credit">+${h.credits_awarded}</div>` : ''}
            <span class="hi-status ${st.cls}">${st.label}</span>
          </div>
        </div>`;
    }).join('');

    icon();
  }

  App.loadHistory = loadHistory;
})();
