/* ============================================================
   CLAIMS — Verifikasi klaim (target side)
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
      <div class="modal-card" style="max-height:94vh">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Verifikasi Klaim</h3>
            <p style="font-size:11.5px;color:var(--ink-3);margin:4px 0 0">Cek akunmu, approve kalau benar</p>
          </div>
          <button class="modal-close" data-close-verify>
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body space-y-3" style="overflow-y:auto">
          ${state.pendingClaims.map(c => {
            const p = PLATFORMS[c.target_platform] || { name: c.target_platform, icon: 'globe', color: '#64748b' };
            const minsLeft = Math.max(0, Math.round((new Date(c.expires_at) - Date.now()) / 60000));
            const hoursLeft = Math.floor(minsLeft / 60);
            const timeLeft = hoursLeft > 0 ? `${hoursLeft}j ${minsLeft % 60}m` : `${minsLeft}m`;
            const hasProof = !!c.proof_url;
            const isYouTube = c.target_platform === 'youtube';

            // Bukti HTML
            const proofHtml = hasProof ? `
              <div style="margin-top:10px;padding:10px;border-radius:10px;background:var(--surface-2)">
                <div style="font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">
                  📸 Bukti Screenshot
                </div>
                <img src="${esc(c.proof_url)}"
                     style="width:100%;max-height:280px;object-fit:contain;border-radius:8px;border:1px solid var(--line);background:#fff;cursor:pointer"
                     onclick="window.open('${esc(c.proof_url)}','_blank')"
                     alt="Bukti">
              </div>
            ` : (isYouTube ? `
              <div class="info-box danger" style="margin-top:10px;font-size:11.5px">
                <i data-lucide="alert-circle"></i>
                <span>⚠ YouTube wajib bukti, tapi tidak ada</span>
              </div>
            ` : '');

            return `
              <div style="border-radius:14px;border:1.5px solid var(--line);padding:14px">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                  <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;color:#fff;font-weight:800;font-size:14px;flex-shrink:0">
                    ${esc((c.follower_name || c.follower_username || '?')[0].toUpperCase())}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:800;font-size:13.5px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${esc(c.follower_name || c.follower_username)}
                    </div>
                    <div style="font-size:11px;color:var(--ink-3);font-family:ui-monospace,monospace">
                      @${esc(c.follower_username)}
                    </div>
                  </div>
                  <div style="text-align:right;flex-shrink:0">
                    <div style="font-size:10px;font-weight:800;color:#b45309">⏱ ${timeLeft}</div>
                  </div>
                </div>

                <div style="padding:8px 12px;border-radius:8px;background:var(--surface-2);display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--ink-3);letter-spacing:.05em">Akun follower:</span>
                  <a href="${esc(c.from_url || '#')}" target="_blank" rel="noopener" style="font-weight:800;font-size:12px;color:${p.color};text-decoration:none;font-family:ui-monospace,monospace">
                    @${esc(c.from_username || '?')}
                  </a>
                </div>

                <div style="font-size:11.5px;color:var(--ink-2);margin-bottom:4px">
                  Klaim subscribe akun <b>@${esc(c.target_username)}</b> (${p.name})
                </div>

                ${proofHtml}

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px">
                  <button data-verify="${c.claim_id}" data-approve="true" style="padding:10px;border-radius:9px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:12.5px;border:none;font-family:inherit;cursor:pointer">
                    ✓ Benar
                  </button>
                  <button data-verify="${c.claim_id}" data-approve="false" style="padding:10px;border-radius:9px;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:12.5px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">
                    ✗ Tidak
                  </button>
                </div>
              </div>
            `;
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

    m.querySelectorAll('[data-verify]').forEach(b =>
      b.addEventListener('click', () => verifyClaim(b.dataset.verify, b.dataset.approve === 'true')));

    icon();
  }

  async function verifyClaim(claimId, approve) {
    let reason = null;
    if (!approve) {
      const input = await App.prompt({
        title: 'Alasan Tolak',
        desc: 'Kenapa klaim ini ditolak?',
        placeholder: 'Contoh: Belum subscribe di channel saya',
        type: 'text',
        okText: 'Tolak',
        icon: 'x-circle'
      });
      if (input === null) return;
      reason = input || 'Tidak dikonfirmasi';
    }

    try {
      const { error } = await sb.rpc('verify_claim', {
        p_claim_id: claimId,
        p_approve: approve,
        p_reason: reason,
      });
      if (error) throw error;

      toast(approve ? '✅ Approved! Follower dapat kredit' : '❌ Rejected', approve ? 'success' : 'info');
      document.getElementById('verifyModal')?.remove();
      document.body.style.overflow = '';
      await Promise.all([loadPendingClaims(), App.loadProfile?.(), App.loadAccounts?.()].filter(Boolean));
    } catch (e) {
      console.error('[VerifyClaim]', e);
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
