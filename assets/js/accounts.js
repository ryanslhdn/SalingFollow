/* ============================================================
   ACCOUNTS — CRUD akun sosmed user
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, PLATFORMS, state } = App;

  async function loadAccounts() {
    const list = $('accountsList');
    const empty = $('accountsEmpty');

    const { data, error } = await sb.from('social_accounts')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); return; }
    state.accounts = data || [];

    if (!state.accounts.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      icon();
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = state.accounts.map((a, i) => {
      const p = PLATFORMS[a.platform] || { name:a.platform, icon:'globe', color:'#64748b' };
      const boosted = a.boost_until && new Date(a.boost_until) > new Date();
      const boostLabel = boosted
        ? `🚀 s.d. ${App.formatDateTime(a.boost_until)}`
        : 'Belum di-boost';

      return `
        <div class="item-card" style="animation-delay:${i * 30}ms">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0" style="background:${p.color}">
              <i data-lucide="${p.icon}" class="w-5 h-5 text-white"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-black text-sm truncate">@${esc(a.username)}</div>
              <div class="text-[11px] ${boosted ? 'text-amber-600 font-bold' : 'text-slate-500 font-semibold'}">${p.name} • ${boostLabel}</div>
            </div>
            <button data-delete-acc="${esc(a.id)}" class="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-500 grid place-items-center text-slate-400 flex-shrink-0">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
          <div class="flex gap-2">
            <a href="${esc(a.profile_url)}" target="_blank" rel="noopener" class="flex-1 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs text-center">
              <i data-lucide="external-link" class="w-3.5 h-3.5 inline mr-1"></i> Buka
            </a>
            <button data-boost-acc="${esc(a.id)}" class="flex-1 py-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-xs shadow-lg shadow-amber-500/30">
              <i data-lucide="rocket" class="w-3.5 h-3.5 inline mr-1"></i> Boost
            </button>
          </div>
        </div>`;
    }).join('');

    list.querySelectorAll('[data-delete-acc]').forEach(b => {
      b.addEventListener('click', () => deleteAccount(b.dataset.deleteAcc));
    });
    list.querySelectorAll('[data-boost-acc]').forEach(b => {
      b.addEventListener('click', () => App.openBoost(b.dataset.boostAcc));
    });

    icon();
  }

  async function deleteAccount(id) {
    if (!confirm('Hapus akun ini?')) return;
    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');
    toast('Akun dihapus', 'success');
    loadAccounts();
  }

  /* ---------- ADD ACCOUNT MODAL ---------- */
  function renderPlatformGrid() {
    $('platformGrid').innerHTML = Object.entries(PLATFORMS).map(([id, p]) => `
      <button data-plat="${id}" class="platBtn ${state.selectedPlatform === id ? 'active' : ''}">
        <div class="w-8 h-8 mx-auto rounded-xl grid place-items-center" style="background:${p.color}">
          <i data-lucide="${p.icon}" class="w-4 h-4 text-white"></i>
        </div>
        <div class="text-[8px] font-black uppercase tracking-wider mt-1.5 text-slate-500">${p.name}</div>
      </button>
    `).join('');

    $('platformGrid').querySelectorAll('.platBtn').forEach(b => {
      b.addEventListener('click', () => {
        state.selectedPlatform = b.dataset.plat;
        renderPlatformGrid();
        icon();
      });
    });
    icon();
  }

  function openAddAccount() {
    state.selectedPlatform = 'instagram';
    $('accUsername').value = '';
    $('accUrl').value = '';
    clearStatus('addAccStatus');
    renderPlatformGrid();
    openModal('modalAddAccount');
    setTimeout(() => $('accUsername').focus(), 200);
  }

  /* Auto-fill URL berdasarkan username */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnAddAccount')?.addEventListener('click', openAddAccount);
    document.getElementById('accUsername')?.addEventListener('input', (e) => {
      const u = e.target.value.trim().replace(/^@/, '');
      const p = PLATFORMS[state.selectedPlatform];
      if (u && p) $('accUrl').value = p.url(u);
    });

    document.getElementById('btnSaveAccount')?.addEventListener('click', async () => {
      const username = $('accUsername').value.trim().replace(/^@/, '');
      const url = $('accUrl').value.trim();

      if (!username) return status('addAccStatus', 'error', 'Username wajib');
      if (!/^https?:\/\//.test(url)) return status('addAccStatus', 'error', 'Link harus http/https');

      const btn = $('btnSaveAccount');
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';

      try {
        const { error } = await sb.from('social_accounts').insert({
          user_id: state.user.id,
          platform: state.selectedPlatform,
          username,
          profile_url: url,
        });
        if (error) throw error;
        toast('Akun ditambahkan ✅', 'success');
        closeModal('modalAddAccount');
        loadAccounts();
      } catch (e) {
        status('addAccStatus', 'error', e.message || 'Gagal');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Simpan Akun';
      }
    });
  });

  App.loadAccounts = loadAccounts;
})();