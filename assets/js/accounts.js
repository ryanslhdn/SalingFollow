/* ============================================================
   ACCOUNTS — CRUD akun sosmed user
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, PLATFORMS, state } = App;

  async function loadAccounts() {
    const list = $('accountsList');
    const empty = $('accountsEmpty');
    if (!list) return;

    const { data, error } = await sb
      .from('social_accounts')
      .select('*')
      .eq('user_id', state.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Accounts]', error);
      return;
    }

    state.accounts = data || [];

    if (!state.accounts.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.accounts.map((a, i) => {
      const p = PLATFORMS[a.platform] || { name: a.platform, icon: 'globe', color: '#64748b' };
      const boosted = a.boost_until && new Date(a.boost_until) > new Date();
      const boostLabel = boosted
        ? `Aktif sampai ${App.formatDateTime(a.boost_until)}`
        : 'Belum di-boost';

      return `
        <div class="account-card ${boosted ? 'boosted' : ''}" style="animation-delay:${i * 40}ms">
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
    if (!confirm('Hapus akun ini dari daftar?')) return;

    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');

    toast('Akun dihapus', 'success');
    await loadAccounts();
    await App.loadFeed();
  }

  /* ---------- PLATFORM GRID ---------- */
  function renderPlatformGrid() {
    const grid = $('platformGrid');
    if (!grid) return;

    grid.innerHTML = Object.entries(PLATFORMS).map(([id, p]) => `
      <button data-plat="${id}" class="platBtn ${state.selectedPlatform === id ? 'active' : ''}">
        <div style="width:32px;height:32px;margin:0 auto;border-radius:9px;display:grid;place-items:center;background:${p.color}">
          <i data-lucide="${p.icon}" style="width:16px;height:16px;color:#fff"></i>
        </div>
        <div style="font-size:8.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-top:6px;color:var(--ink-3)">${p.name}</div>
      </button>
    `).join('');

    grid.querySelectorAll('.platBtn').forEach(b => {
      b.addEventListener('click', () => {
        state.selectedPlatform = b.dataset.plat;
        renderPlatformGrid();
        // Auto-update URL jika username sudah diisi
        const u = $('accUsername').value.trim().replace(/^@/, '');
        if (u) $('accUrl').value = PLATFORMS[state.selectedPlatform].url(u);
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
    setTimeout(() => $('accUsername')?.focus(), 200);
  }

  /* ---------- SAVE ACCOUNT ---------- */
  async function saveAccount() {
    const username = $('accUsername').value.trim().replace(/^@/, '');
    const url = $('accUrl').value.trim();

    if (!username) return status('addAccStatus', 'error', 'Username wajib diisi');
    if (!/^https?:\/\//.test(url)) return status('addAccStatus', 'error', 'Link harus diawali http:// atau https://');

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

      toast('Akun berhasil ditambahkan ✅', 'success');
      closeModal('modalAddAccount');
      await loadAccounts();
      await App.loadFeed();
      await App.loadProfile();
    } catch (e) {
      console.error(e);
      status('addAccStatus', 'error', e.message || 'Gagal menyimpan');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simpan Akun';
    }
  }

  /* ---------- BINDING ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    $('btnAddAccount')?.addEventListener('click', openAddAccount);
    $('btnSaveAccount')?.addEventListener('click', saveAccount);

    $('accUsername')?.addEventListener('input', (e) => {
      const u = e.target.value.trim().replace(/^@/, '');
      const p = PLATFORMS[state.selectedPlatform];
      if (u && p) $('accUrl').value = p.url(u);
    });
  });

  App.loadAccounts = loadAccounts;
})();
