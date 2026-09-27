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
   list.innerHTML = state.history.map((h, i) => {
     const p = PLATFORMS[h.target_platform] || { name: h.target_platform, icon: 'globe', color: '#64748b' };
     const stMap = {
       awaiting_target: { label:'Menunggu',  cls:'pending' },
       approved:        { label:'Disetujui', cls:'success' },
       auto_approved:   { label:'Auto OK',   cls:'success' },
       rejected:        { label:'Ditolak',   cls:'danger' },
       expired:         { label:'Expired',   cls:'neutral' },
     };
     const st = stMap[h.status] || stMap.awaiting_target;
   
     return `
       <div class="history-item" style="animation-delay:${i * 40}ms">
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
