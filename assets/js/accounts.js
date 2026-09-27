/* ============================================================
   ACCOUNTS — Akun user untuk follow orang lain
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
      .eq('account_type', 'follower')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Accounts]', error);
      return;
    }

    state.accounts = data || [];
    updateCounter();

    if (!state.accounts.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.accounts.map((a, i) => renderCard(a, i)).join('');

    list.querySelectorAll('[data-delete-acc]').forEach(b => {
      b.addEventListener('click', () => deleteAccount(b.dataset.deleteAcc));
    });

    list.querySelectorAll('[data-boost-acc]').forEach(b => {
      b.addEventListener('click', () => App.openBoost(b.dataset.boostAcc));
    });

    icon();
  }

  function renderCard(a, index) {
    const p = PLATFORMS[a.platform] || { name: a.platform, icon: 'globe', color: '#64748b' };
    const boosted = a.boost_until && new Date(a.boost_until) > new Date();
    const boostLabel = boosted
      ? `Aktif sampai ${App.formatDateTime(a.boost_until)}`
      : 'Belum di-boost';

    return `
      <div class="account-card ${boosted ? 'boosted' : ''}" style="animation-delay:${index * 40}ms">
        <div class="acc-head">
          <div class="acc-avatar ${boosted ? 'boosted' : ''}" style="background:${p.color}">
            <i data-lucide="${p.icon}"></i>
          </div>
          <div class="acc-info">
            <div class="acc-username">@${esc(a.username)}</div>
            <div class="acc-boost-label ${boosted ? 'active' : ''}">${p.name}${boosted ? ' • ' + boostLabel : ''}</div>
          </div>
          <button data-delete-acc="${esc(a.id)}" class="acc-del" title="Hapus akun">
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
  }

  function updateCounter() {
    const el = $('boostCount');
    if (el) el.textContent = state.accounts.length;
  }

  async function deleteAccount(id) {
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return;

    const p = PLATFORMS[acc.platform] || { name: acc.platform };
    if (!confirm(`Hapus akun @${acc.username} (${p.name})?`)) return;

    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');

    toast('Akun dihapus', 'success');
    await Promise.all([
      loadAccounts(),
      App.loadFeed ? App.loadFeed() : Promise.resolve(),
      App.loadProfile ? App.loadProfile() : Promise.resolve(),
    ]);
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
        <div style="font-size:8.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-top:6px;color:var(--ink-3)">
          ${p.name}
        </div>
      </button>
    `).join('');

    grid.querySelectorAll('.platBtn').forEach(b => {
      b.addEventListener('click', () => {
        state.selectedPlatform = b.dataset.plat;
        renderPlatformGrid();
        const u = $('accUsername').value.trim().replace(/^@/, '');
        const p = PLATFORMS[state.selectedPlatform];
        if (u && p) $('accUrl').value = p.url(u);
        icon();
      });
    });

    icon();
  }

  function openAddAccount() {
    state.selectedPlatform = 'instagram';
    resetForm();
    openModal('modalAddAccount');
    setTimeout(() => $('accUsername')?.focus(), 200);
  }

  function resetForm() {
    const u = $('accUsername');
    const url = $('accUrl');
    if (u) u.value = '';
    if (url) {
      url.value = '';
      delete url.dataset.manuallyEdited;
    }
    clearStatus('addAccStatus');
    renderPlatformGrid();
  }

  async function saveAccount() {
    const username = $('accUsername').value.trim().replace(/^@/, '');
    const url = $('accUrl').value.trim();

    if (!username) return status('addAccStatus', 'error', 'Username wajib diisi');
    if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) return status('addAccStatus', 'error', 'Username tidak valid');
    if (!/^https?:\/\//.test(url)) return status('addAccStatus', 'error', 'Link harus diawali http:// atau https://');

    const duplicate = state.accounts.find(
      a => a.platform === state.selectedPlatform
        && a.username.toLowerCase() === username.toLowerCase()
    );
    if (duplicate) return status('addAccStatus', 'error', `Akun @${username} sudah pernah ditambahkan`);

    const btn = $('btnSaveAccount');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    status('addAccStatus', 'warn', 'Menyimpan...');

    try {
      const { error } = await sb.from('social_accounts').insert({
        user_id: state.user.id,
        platform: state.selectedPlatform,
        username,
        profile_url: url,
        account_type: 'follower',
      });
      if (error) throw error;

      const p = PLATFORMS[state.selectedPlatform];
      toast(`Akun ${p.name} @${username} ditambahkan ✅`, 'success', 3000);
      closeModal('modalAddAccount');

      await Promise.all([
        loadAccounts(),
        App.loadFeed ? App.loadFeed() : Promise.resolve(),
        App.loadProfile ? App.loadProfile() : Promise.resolve(),
      ]);
    } catch (e) {
      console.error('[SaveAccount]', e);
      status('addAccStatus', 'error', e.message || 'Gagal menyimpan akun');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Akun'; }
    }
  }

  function bindAutoFill() {
    const usernameInput = $('accUsername');
    const urlInput = $('accUrl');

    if (usernameInput) {
      usernameInput.addEventListener('input', (e) => {
        const u = e.target.value.trim().replace(/^@/, '');
        const p = PLATFORMS[state.selectedPlatform];
        if (u && p && urlInput && !urlInput.dataset.manuallyEdited) urlInput.value = p.url(u);
      });
      usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); urlInput?.focus(); }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', () => { urlInput.dataset.manuallyEdited = '1'; });
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveAccount(); }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('btnAddAccount')?.addEventListener('click', openAddAccount);
    $('btnSaveAccount')?.addEventListener('click', saveAccount);
    bindAutoFill();
  });

  App.loadAccounts = loadAccounts;

})();
