/* ============================================================
   FEED — Daftar akun untuk di-follow + klaim
   ============================================================ */

(function() {
  const { $, esc, toast, icon, PLATFORMS, state } = App;

  async function loadFeed() {
    const list = $('feedList');
    const empty = $('feedEmpty');
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
        <div class="item-card" style="animation-delay:${i * 30}ms">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0" style="background:${p.color}">
              <i data-lucide="${p.icon}" class="w-5 h-5 text-white"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-black text-sm truncate">@${esc(a.username)}</div>
              <div class="text-[11px] text-slate-500 font-semibold">${p.name} • dari @${esc(a.owner_username)}</div>
            </div>
            ${a.is_boosted ? '<span class="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wider flex-shrink-0">🚀 BOOST</span>' : ''}
          </div>
          <button data-claim-target="${esc(a.id)}" class="btn-claim w-full py-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-sm shadow-lg shadow-brand-500/30 active:scale-[.98] transition-transform">
            <i data-lucide="user-plus" class="w-4 h-4 inline mr-1"></i> Follow & Klaim +1 Kredit
          </button>
        </div>`;
    }).join('');

    // Auto-bind tombol claim
    list.querySelectorAll('[data-claim-target]').forEach(btn => {
      btn.addEventListener('click', () => App.openSubmit(btn.dataset.claimTarget));
    });

    icon();
  }

  /* ---------- OPEN SUBMIT (buka tab IG + modal konfirmasi) ---------- */
  function openSubmit(targetId) {
    const t = state.feed.find(a => a.id === targetId);
    if (!t) return;
    state.currentTarget = t;

    // Buka deep link di tab baru
    window.open(t.profile_url, '_blank');
    // Setelah user balik, tanya konfirmasi
    setTimeout(() => showClaimConfirm(t), 800);
  }

  function showClaimConfirm(t) {
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
            <div class="font-bold text-sm text-emerald-900 mb-1">Kamu sudah follow akun ini?</div>
            <div class="text-xs text-emerald-800 leading-relaxed">
              Klik tombol di bawah. Pemilik akun akan dapat notif. Kalau mereka approve, kamu dapat <b>+1 kredit</b>.
            </div>
          </div>

          <div class="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-4 flex gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
            <div class="text-[11px] text-amber-800 leading-relaxed">
              <b>Jangan bohong!</b> Kalau pemilik reject 3× dari kamu, kamu bisa di-ban.
            </div>
          </div>

          <button data-claim-submit class="btn-primary">
            <i data-lucide="check" class="w-4 h-4 inline mr-1"></i> Ya, Saya Sudah Follow
          </button>
          <button data-close-claim class="w-full mt-2 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm">
            Nanti Dulu
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

    m.querySelector('[data-claim-submit]').addEventListener('click', submitClaim);
    icon();
  }

  async function submitClaim() {
    if (!state.currentTarget) return;
    const btn = document.querySelector('#claimModal [data-claim-submit]');
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }

    try {
      const { error } = await sb.rpc('claim_follow', { p_target_id: state.currentTarget.id });
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

  /* ---------- INIT BINDINGS ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnRefreshFeed')?.addEventListener('click', loadFeed);
  });

  App.loadFeed = loadFeed;
  App.openSubmit = openSubmit;
})();