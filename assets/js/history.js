/* ============================================================
   HISTORY — Riwayat klaim user
   ============================================================ */

(function() {
  const { $, esc, icon, PLATFORMS, state } = App;

  const STATUS_MAP = {
    awaiting_target: { label: 'Menunggu',    cls: 'bg-amber-50 text-amber-700' },
    approved:        { label: 'Disetujui',   cls: 'bg-emerald-50 text-emerald-700' },
    auto_approved:   { label: 'Auto ✅',     cls: 'bg-emerald-50 text-emerald-700' },
    rejected:        { label: 'Ditolak',     cls: 'bg-red-50 text-red-700' },
    expired:         { label: 'Kedaluwarsa', cls: 'bg-slate-100 text-slate-500' },
  };

  async function loadHistory() {
    const list = $('historyList');
    const empty = $('historyEmpty');

    const { data, error } = await sb.rpc('my_claims', { p_limit: 50 });
    if (error) { console.error(error); return; }
    state.history = data || [];

    if (!state.history.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      icon();
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = state.history.map(h => {
      const p = PLATFORMS[h.target_platform] || { name: h.target_platform, icon: 'globe', color: '#64748b' };
      const st = STATUS_MAP[h.status] || STATUS_MAP.awaiting_target;

      return `
        <div class="rounded-2xl bg-white border border-slate-100 p-3.5 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style="background:${p.color}">
            <i data-lucide="${p.icon}" class="w-4 h-4 text-white"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-xs truncate">@${esc(h.target_username)}</div>
            <div class="text-[10px] text-slate-500 font-semibold">${App.formatDateTime(h.claim_time)}</div>
          </div>
          <div class="text-right flex-shrink-0">
            ${h.credits_awarded > 0 ? `<div class="font-mono font-black text-sm text-emerald-600">+${h.credits_awarded}</div>` : ''}
            <span class="inline-block px-2 py-0.5 rounded-md ${st.cls} text-[9px] font-black uppercase tracking-wider">${st.label}</span>
          </div>
        </div>`;
    }).join('');

    icon();
  }

  App.loadHistory = loadHistory;
})();