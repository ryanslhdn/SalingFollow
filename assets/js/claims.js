/* ============================================================
   CLAIMS — Verifikasi klaim
   ============================================================ */

(function() {
  const { $, esc, toast, icon, PLATFORMS, state } = App;

  async function loadPendingClaims() {
    const { data, error } = await sb.rpc('pending_claims');
    if (error) { console.error('[PendingClaims]', error); return; }

    state.pendingClaims = data || [];
    const banner = $('pendingBanner');
    const count = $('pendingCount');

    if (state.pendingClaims.length > 0) {
      banner.classList.remove('hidden');
      count.textContent = state.pendingClaims.length;
    } else {
      banner.classList.add('hidden');
    }
    icon();
  }

  function openVerifyModal() {
    if (!state.pendingClaims?.length) return;
    document.getElementById('verifyModal')?.remove();

    const m = document.createElement('div');
    m.id = 'verifyModal';
    m.className = 'modal-wrapper';
    m.innerHTML = `
      <div class="modal-backdrop" data-close-verify></div>
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Verifikasi Klaim</h3>
            <p class="text-[11px] text-slate-500 font-semibold">Cek akunmu, approve kalau benar</p>
          </div>
          <button class="modal-close" data-close-verify>
            <i data-lucide="x" class="w-5 h-5 text-slate-500"></i>
          </button>
        </div>
        <div class="modal-body space-y-3">
          ${state.pendingClaims.map(c => {
            const p = PLATFORMS[c.target_platform] || { name:c.target_platform, icon:'globe', color:'#64748b' };
            const minsLeft = Math.max(0, Math.round((new Date(c.expires_at) - Date.now()) / 60000));
            const hoursLeft = Math.floor(minsLeft / 60);
            const timeLeft = hoursLeft > 0 ? `${hoursLeft}j ${minsLeft % 60}m` : `${minsLeft}m`;

            return `
              <div class="rounded-2xl border border-slate-200 p-4">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white font-black flex-shrink-0">
                    ${esc((c.follower_name || c.follower_username || '?')[0].toUpperCase())}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-black text-sm truncate">${esc(c.follower_name || c.follower_username)}</div>
                    <div class="text-[11px] text-slate-500 font-mono">@${esc(c.follower_username)}</div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="text-[10px] font-black uppercase text-amber-600">⏱ ${timeLeft}</div>
                  </div>
                </div>

                <div class="rounded-xl bg-slate-50 p-3 mb-3 flex items-center gap-2">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 flex-shrink-0">Akun follower:</span>
                  <a href="${esc(c.from_url || '#')}" target="_blank" rel="noopener" class="font-black text-xs truncate ${p.color ? '' : ''}" style="color:${p.color}">
                    @${esc(c.from_username || '?')}
                  </a>
                </div>

                <div class="text-xs text-slate-600 mb-3">
                  Klaim sudah follow akun <b>@${esc(c.target_username)}</b> (${p.name})
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button data-verify="${c.claim_id}" data-approve="true" class="py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-xs shadow-md">
                    ✓ Benar
                  </button>
                  <button data-verify="${c.claim_id}" data-approve="false" class="py-2.5 rounded-xl bg-red-50 text-red-600 font-black text-xs border border-red-200">
                    ✗ Tidak
                  </button>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    m.querySelectorAll('[data-close-verify]').forEach(el => {
      el.addEventListener('click', () => {
        m.remove();
        document.body.style.overflow = '';
      });
    });

    m.querySelectorAll('[data-verify]').forEach(b => {
      b.addEventListener('click', () => verifyClaim(b.dataset.verify, b.dataset.approve === 'true'));
    });

    icon();
  }

  async function verifyClaim(claimId, approve) {
    let reason = null;
    if (!approve) reason = prompt('Alasan reject (opsional):') || 'Tidak dikonfirmasi';

    try {
      const { error } = await sb.rpc('verify_claim', {
        p_claim_id: claimId, p_approve: approve, p_reason: reason,
      });
      if (error) throw error;

      toast(approve ? '✅ Approved!' : '❌ Rejected', approve ? 'success' : 'info');
      document.getElementById('verifyModal')?.remove();
      document.body.style.overflow = '';
      await Promise.all([loadPendingClaims(), App.loadProfile(), App.loadAccounts()]);
    } catch (e) {
      toast(e.message || 'Gagal', 'error');
    }
  }

  function setupRealtime() {
    if (state.realtimeChannel) sb.removeChannel(state.realtimeChannel);
    state.realtimeChannel = sb.channel('claims-' + state.user.id)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'follow_claims', filter: `target_user_id=eq.${state.user.id}` },
        () => { loadPendingClaims(); toast('Ada klaim follow baru! 🔔', 'info', 4000); })
      .subscribe();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnOpenVerify')?.addEventListener('click', openVerifyModal);
  });

  App.loadPendingClaims = loadPendingClaims;
  App.openVerifyModal = openVerifyModal;
  App.setupRealtime = setupRealtime;
})();
