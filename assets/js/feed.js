/* ============================================================
   FEED — Daftar akun target untuk di-follow
   ============================================================ */

(function() {
  const { $, esc, toast, icon, PLATFORMS, state } = App;

  /* Cek apakah user punya akun untuk follow platform tertentu */
  function hasAccountForPlatform(platform) {
    return state.accounts.some(a => a.platform === platform);
  }

  function countAccountsForPlatform(platform) {
    return state.accounts.filter(a => a.platform === platform).length;
  }

  async function loadFeed() {
    const list = $('feedList');
    const empty = $('feedEmpty');
    const warn = $('feedNoAccountWarning');

    const hasAnyAccount = state.accounts && state.accounts.length > 0;
    if (warn) warn.classList.toggle('hidden', hasAnyAccount);

    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('feed_accounts', { p_limit: 30 });

    if (error) {
      list.innerHTML = `
        <div class="info-box danger">
          <i data-lucide="alert-circle"></i>
          <span>Gagal memuat: ${esc(error.message)}</span>
        </div>`;
      icon();
      return;
    }

    state.feed = data || [];

    if (!state.feed.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.feed.map((a, i) => renderFeedCard(a, i)).join('');

    list.querySelectorAll('[data-claim-target]').forEach(btn => {
      btn.addEventListener('click', () => chooseFollowerAndClaim(btn.dataset.claimTarget));
    });

    list.querySelectorAll('[data-add-platform]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedPlatform = btn.dataset.addPlatform;
        App.switchTab('accounts');
        setTimeout(() => App.openAddAccountWithPlatform?.(btn.dataset.addPlatform), 200);
      });
    });

    icon();
  }

  function renderFeedCard(a, index) {
    const p = PLATFORMS[a.platform] || { name: a.platform, icon: 'globe', color: '#64748b' };
    const hasAccount = hasAccountForPlatform(a.platform);
    const count = countAccountsForPlatform(a.platform);
    const remaining = a.remaining || 0;
    const total = a.quantity || 0;
    const filled = total - remaining;
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

    // Info sisa follower
    const progressHtml = total > 0 ? `
      <div style="margin-bottom:12px;padding:10px 12px;background:var(--surface-2);border-radius:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:5px">
          <span>Butuh ${remaining} follower lagi</span>
          <span>${filled} / ${total}</span>
        </div>
        <div style="height:5px;border-radius:3px;background:var(--line);overflow:hidden">
          <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,var(--green-500),var(--green-600));border-radius:3px"></div>
        </div>
      </div>
    ` : '';

    // Aksi
    let actionHtml = '';

    if (hasAccount) {
      actionHtml = `
        <button data-claim-target="${esc(a.id)}" class="feed-btn">
          <i data-lucide="user-plus"></i> Follow & Klaim +2 Kredit
        </button>
        <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11.5px;color:var(--ink-3)">
          <i data-lucide="check-circle" style="width:13px;height:13px;color:var(--green-500)"></i>
          <span>Kamu punya ${count} akun ${p.name} siap dipakai</span>
        </div>
      `;
    } else {
      actionHtml = `
        <button disabled class="feed-btn" style="background:var(--surface-2);color:var(--ink-3);cursor:not-allowed;box-shadow:none">
          <i data-lucide="lock"></i> Belum Bisa Follow
        </button>
        <div class="info-box warn" style="margin-top:12px;font-size:12px">
          <i data-lucide="alert-triangle"></i>
          <div style="flex:1">
            <div style="font-weight:700;margin-bottom:3px">Kamu belum punya akun ${p.name}</div>
            <div style="margin-bottom:8px">Tambah akun ${p.name} dulu untuk bisa follow akun ini.</div>
            <button data-add-platform="${esc(a.platform)}" class="btn-sm-primary" style="font-size:11.5px">
              <i data-lucide="plus" style="width:13px;height:13px"></i> Tambah Akun ${p.name}
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="feed-card" style="animation-delay:${index * 40}ms">
        <div class="feed-head">
          <div class="feed-avatar" style="background:${p.color}">
            <i data-lucide="${p.icon}"></i>
          </div>
          <div class="feed-info">
            <div class="feed-username">@${esc(a.username)}</div>
            <div class="feed-meta">${p.name} • dari @${esc(a.owner_username)}</div>
          </div>
          ${a.is_boosted ? '<span class="boost-badge">BOOST</span>' : ''}
        </div>
        ${progressHtml}
        ${actionHtml}
      </div>
    `;
  }

  function chooseFollowerAndClaim(targetId) {
    const t = state.feed.find(a => a.id === targetId);
    if (!t) return;

    const choices = state.accounts.filter(a => a.platform === t.platform);

    if (!choices.length) {
      const p = PLATFORMS[t.platform] || { name: t.platform };
      toast(`Kamu belum punya akun ${p.name}. Tambah dulu di tab Akun.`, 'error', 4000);
      setTimeout(() => {
        state.selectedPlatform = t.platform;
        App.switchTab('accounts');
        setTimeout(() => App.openAddAccountWithPlatform?.(t.platform), 200);
      }, 1200);
      return;
    }

    state.currentTarget = t;
    $('chooseTargetName').textContent = '@' + t.username;
    $('chooseTargetPlatform').textContent = (PLATFORMS[t.platform] || {}).name || t.platform;

    const wrap = $('followerAccountChoices');
    const noAcc = $('chooseNoAccount');
    if (noAcc) noAcc.classList.add('hidden');

    const p = PLATFORMS[t.platform];
    wrap.innerHTML = choices.map(a => `
      <button data-from="${esc(a.id)}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);text-align:left;transition:all .15s;font-family:inherit;cursor:pointer"
              onmouseover="this.style.borderColor='var(--green-500)';this.style.background='var(--green-50)'"
              onmouseout="this.style.borderColor='var(--line)';this.style.background='var(--surface)'">
        <div style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center;flex-shrink:0;background:${p.color}">
          <i data-lucide="${p.icon}" style="width:18px;height:18px;color:#fff"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">@${esc(a.username)}</div>
          <div style="font-size:11.5px;color:var(--ink-3);margin-top:2px">${p.name}</div>
        </div>
        <i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--ink-3);flex-shrink:0"></i>
      </button>
    `).join('');

    wrap.querySelectorAll('[data-from]').forEach(b => {
      b.addEventListener('click', () => {
        App.closeModal('modalChooseFollower');
        proceedClaim(t, b.dataset.from);
      });
    });

    App.openModal('modalChooseFollower');
    icon();
  }

  function proceedClaim(target, fromAccountId) {
    window.open(target.profile_url, '_blank');
    setTimeout(() => showClaimConfirm(target, fromAccountId), 800);
  }

  function showClaimConfirm(t, fromAccountId) {
    const p = PLATFORMS[t.platform] || { name: t.platform, icon: 'globe', color: '#64748b' };
    const fromAcc = state.accounts.find(a => a.id === fromAccountId);

    document.getElementById('claimModal')?.remove();

    const m = document.createElement('div');
    m.id = 'claimModal';
    m.className = 'modal-wrapper';
    m.innerHTML = `
      <div class="modal-backdrop" data-close-claim></div>
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Konfirmasi Follow</h3>
            <p style="font-size:12.5px;color:var(--ink-3);margin:4px 0 0">@${esc(t.username)} • ${p.name}</p>
          </div>
          <button class="modal-close" data-close-claim>
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body space-y-4">
          ${fromAcc ? `
            <div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:12px;background:var(--surface-2)">
              <div style="width:32px;height:32px;border-radius:8px;display:grid;place-items:center;flex-shrink:0;background:${p.color}">
                <i data-lucide="${p.icon}" style="width:16px;height:16px;color:#fff"></i>
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-size:11px;color:var(--ink-3);font-weight:600">Follow pakai akun</div>
                <div style="font-weight:700;font-size:13.5px;color:var(--ink);margin-top:1px">@${esc(fromAcc.username)}</div>
              </div>
            </div>
          ` : ''}

          <div class="info-box success">
            <i data-lucide="check-circle"></i>
            <div>
              <div style="font-weight:700;margin-bottom:3px">Sudah follow akun di atas?</div>
              <div>Pemilik akun akan dapat notif. Kalau approve, kamu dapat <b>+2 kredit</b>.</div>
            </div>
          </div>

          <div class="info-box warn">
            <i data-lucide="alert-triangle"></i>
            <div><b>Jangan bohong!</b> Kalau target reject 3× dari kamu, kamu bisa di-ban.</div>
          </div>
        </div>
        <div class="modal-footer" style="display:flex;gap:8px">
          <button data-close-claim style="flex:1;padding:12px;border-radius:10px;background:var(--surface-2);color:var(--ink-2);font-weight:700;font-size:13px;font-family:inherit;cursor:pointer">
            Batal
          </button>
          <button data-claim-submit class="btn-primary" style="flex:1.4">
            <i data-lucide="check" style="width:16px;height:16px"></i> Ya, Sudah Follow
          </button>
        </div>
      </div>`;

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    m.querySelectorAll('[data-close-claim]').forEach(el => {
      el.addEventListener('click', () => {
        m.remove();
        document.body.style.overflow = '';
      });
    });

    m.querySelector('[data-claim-submit]').addEventListener('click', () => submitClaim(t, fromAccountId));
    icon();
  }

  async function submitClaim(target, fromAccountId) {
    const btn = document.querySelector('#claimModal [data-claim-submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }

    try {
      const { error } = await sb.rpc('claim_follow', {
        p_target_id: target.id,
        p_from_account_id: fromAccountId,
      });
      if (error) throw error;

      document.getElementById('claimModal')?.remove();
      document.body.style.overflow = '';
      toast('Klaim terkirim! Nunggu konfirmasi 🕐', 'success', 4000);
      await loadFeed();
    } catch (e) {
      toast(e.message || 'Gagal klaim', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="check" style="width:16px;height:16px"></i> Ya, Sudah Follow';
        icon();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('btnRefreshFeed')?.addEventListener('click', loadFeed);
    $('btnGoToAccounts')?.addEventListener('click', () => App.switchTab('accounts'));
  });

  App.loadFeed = loadFeed;
  App.chooseFollowerAndClaim = chooseFollowerAndClaim;
  App.hasAccountForPlatform = hasAccountForPlatform;
})();
