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
       ? `🚀 Aktif sampai ${App.formatDateTime(a.boost_until)}`
       : 'Belum di-boost';
   
     return `
       <div class="account-card ${boosted ? 'boosted' : ''}" style="animation-delay:${i * 50}ms">
         <div class="acc-head">
           <div class="acc-avatar ${boosted ? 'boosted' : ''}" style="background:${p.color}">
             <i data-lucide="${p.icon}"></i>
           </div>
           <div class="acc-info">
             <div class="acc-username">@${esc(a.username)}</div>
             <div class="acc-boost-label ${boosted ? 'active' : ''}">${p.name} • ${boostLabel}</div>
           </div>
           <button data-delete-acc="${esc(a.id)}" class="acc-del">
             <i data-lucide="trash-2"></i>
           </button>
         </div>
         <div class="acc-actions">
           <a href="${esc(a.profile_url)}" target="_blank" rel="noopener" class="acc-btn ghost">
             <i data-lucide="external-link"></i> Buka
           </a>
           <button data-boost-acc="${esc(a.id)}" class="acc-btn boost">
             <i data-lucide="rocket"></i> Boost
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
