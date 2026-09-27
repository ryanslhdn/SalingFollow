/* ============================================================
   FEED — Daftar akun + klaim (dengan pilih akun follower)
   ============================================================ */

(function() {
  const { $, esc, toast, icon, PLATFORMS, state } = App;

  async function loadFeed() {
    const list = $('feedList');
    const empty = $('feedEmpty');
    const warn = $('feedNoAccountWarning');

    // Cek: user sudah punya akun sendiri?
    const hasAccount = state.accounts && state.accounts.length > 0;
    warn.classList.toggle('hidden', hasAccount);

    list.innerHTML = '<div class="text-center py-6 text-sm text-slate-400 font-bold">Memuat...</div>';

    const { data, error } = await sb.rpc('feed_accounts', { p_limit: 30 });
    if (error) {
      list.innerHTML = `<div class="text-center py-6 text-sm text-red-500 font-bold">Gagal: ${esc(error.message)}</div>`;
      return;
    }

    state.feed = data || [];

    if (!state.feed.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      icon();
      return;
    }

    empty.classList.add('hidden');
   list.innerHTML = state.feed.map((a, i) => {
     const p = PLATFORMS[a.platform] || { name:a.platform, icon:'globe', color:'#64748b' };
     return `
       <div class="feed-card" style="animation-delay:${i * 50}ms">
         <div class="feed-head">
           <div class="feed-avatar" style="background:${p.color}">
             <i data-lucide="${p.icon}"></i>
           </div>
           <div class="feed-info">
             <div class="feed-username">@${esc(a.username)}</div>
             <div class="feed-meta">${p.name} • dari @${esc(a.owner_username)}</div>
           </div>
           ${a.is_boosted ? '<span class="boost-badge">🚀 BOOST</span>' : ''}
         </div>
         <button data-claim-target="${esc(a.id)}" class="feed-btn">
           <i data-lucide="user-plus"></i> Follow & Klaim +1 Kredit
         </button>
       </div>`;
   }).join('');

    list.querySelectorAll('[data-claim-target]').forEach(btn => {
      btn.addEventListener('click', () => App.chooseFollowerAndClaim(btn.dataset.claimTarget));
    });

    icon();
  }

  /* ---------- PILIH AKUN FOLLOWER DULU ---------- */
  function chooseFollowerAndClaim(targetId) {
    const t = state.feed.find(a => a.id === targetId);
    if (!t) return;

    // Filter akun user yang platform-nya sama dengan target
    const choices = state.accounts.filter(a => a.platform === t.platform);

    state.currentTarget = t;
    $('chooseTargetName').textContent = '@' + t.username;
    $('chooseTargetPlatform').textContent = (PLATFORMS[t.platform] || {}).name || t.platform;

    const wrap = $('followerAccountChoices');
    const noAcc = $('chooseNoAccount');
    const noAccPlat = $('chooseNoAccountPlatform');

    if (!choices.length) {
      wrap.innerHTML = '';
      noAccPlat.textContent = (PLATFORMS[t.platform] || {}).name || t.platform;
      noAcc.classList.remove('hidden');
    } else {
      noAcc.classList.add('hidden');
      const p = PLATFORMS[t.platform];
      wrap.innerHTML = choices.map(a => `
        <button data-from="${esc(a.id)}" class="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-200 hover:border-brand-500 text-left transition-all">
          <div class="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0" style="background:${p.color}">
            <i data-lucide="${p.icon}" class="w-4 h-4 text-white"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-black text-sm truncate">@${esc(a.username)}</div>
            <div class="text-[10px] text-slate-500">${p.name}</div>
          </div>
          <i data-lucide="chevron-right" class="w-4 h-4 text-slate-400"></i>
        </button>
      `).join('');

      wrap.querySelectorAll('[data-from]').forEach(b => {
        b.addEventListener('click', () => {
          App.openModal('modalChooseFollower'); // no-op kalau sudah kebuka
          const fromId = b.dataset.from;
          App.closeModal('modalChooseFollower');
          proceedClaim(t, fromId);
        });
      });
    }

    App.openModal('modalChooseFollower');
    icon();
  }

  function proceedClaim(target, fromAccountId) {
    // Buka deep link
    window.open(target.profile_url, '_blank');
    // Setelah user balik → tanya konfirmasi
    setTimeout(() => showClaimConfirm(target, fromAccountId), 800);
  }

  function showClaimConfirm(t, fromAccountId) {
    const p = PLATFORMS[t.platform];
    document.getElementById('claimModal')?.remove();

    const m = document.createElement('div');
    m.id = 'claimModal';
    m.className = 'modal-wrapper';
    m.innerHTML = `
      <div class="modal-backdrop" data-close-claim></div>
      <div class="modal-card">
        <div class="p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0" style="background:${p.color}">
              <i data-lucide="${p.icon}" class="w-5 h-5 text-white"></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-black text-base">Konfirmasi</div>
              <div class="text-xs text-slate-500 font-semibold">@${esc(t.username)} • ${p.name}</div>
            </div>
          </div>

          <div class="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 mb-4">
            <div class="font-bold text-sm text-emerald-900 mb-1">Sudah follow?</div>
            <div class="text-xs text-emerald-800 leading-relaxed">
              Pemilik akun akan dapat notif dan cek sendiri. Kalau mereka approve, kamu dapat <b>+1 kredit</b>.
            </div>
          </div>

          <div class="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-4 flex gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
            <div class="text-[11px] text-amber-800 leading-relaxed">
              <b>Jangan bohong!</b> Kalau target reject 3× dari kamu, bisa kena ban.
            </div>
          </div>

          <button data-claim-submit class="btn-primary">
            <i data-lucide="check" class="w-4 h-4 inline mr-1"></i> Ya, Saya Sudah Follow
          </button>
          <button data-close-claim class="w-full mt-2 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">
            Batal
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
        btn.innerHTML = '<i data-lucide="check" class="w-4 h-4 inline mr-1"></i> Ya, Saya Sudah Follow';
        icon();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnRefreshFeed')?.addEventListener('click', loadFeed);
    document.getElementById('btnGoToAccounts')?.addEventListener('click', () => App.switchTab('accounts'));
  });

  App.loadFeed = loadFeed;
  App.chooseFollowerAndClaim = chooseFollowerAndClaim;
})();
