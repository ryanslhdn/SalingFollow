/* ============================================================
   ACCOUNTS — CRUD akun tumbal & utama
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, PLATFORMS, state } = App;

  // State lokal
  state.currentAccTab = 'tumbal';   // 'tumbal' | 'main'
  state.selectedAccType = 'tumbal'; // di modal

  const TYPE_LABEL = {
    tumbal: { name: 'Tumbal', emoji: '🔻', desc: 'Akun tumbal dipakai untuk follow orang lain dan dapat kredit.' },
    main:   { name: 'Utama',  emoji: '⭐', desc: 'Akun utama adalah yang mau ditambah follower. Perlu request pakai kredit.' },
  };

  /* ============================================================
     LOAD ACCOUNTS
     ============================================================ */
  async function loadAccounts() {
    const list = $('accountsList');
    const empty = $('accountsEmpty');
    if (!list) return;

    const { data, error } = await sb
      .from('social_accounts')
      .select('*')
      .eq('user_id', state.user.id)
      .eq('account_type', state.currentAccTab)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Accounts]', error);
      return;
    }

    state.accounts = data || [];

    if (!state.accounts.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      updateAccountCounter();
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.accounts.map((a, i) => renderAccountCard(a, i)).join('');

    list.querySelectorAll('[data-delete-acc]').forEach(b => {
      b.addEventListener('click', () => deleteAccount(b.dataset.deleteAcc));
    });

    list.querySelectorAll('[data-boost-acc]').forEach(b => {
      b.addEventListener('click', () => App.openBoost(b.dataset.boostAcc));
    });

    list.querySelectorAll('[data-request-acc]').forEach(b => {
      b.addEventListener('click', () => App.openFollowRequest(b.dataset.requestAcc));
    });

    updateAccountCounter();
    icon();
  }

  /* ============================================================
     RENDER ACCOUNT CARD
     ============================================================ */
  function renderAccountCard(a, index) {
    const p = PLATFORMS[a.platform] || { name: a.platform, icon: 'globe', color: '#64748b' };
    const boosted = a.boost_until && new Date(a.boost_until) > new Date();
    const isMain = a.account_type === 'main';

    const typeBadge = isMain
      ? '<span class="acc-type-badge main">⭐ Utama</span>'
      : '<span class="acc-type-badge tumbal">🔻 Tumbal</span>';

    const boostLabel = boosted
      ? `Aktif sampai ${App.formatDateTime(a.boost_until)}`
      : 'Belum di-boost';

    // Tombol aksi — beda untuk tumbal vs utama
    const actions = isMain
      ? `
        <a href="${esc(a.profile_url)}" target="_blank" rel="noopener" class="acc-btn ghost">
          <i data-lucide="external-link"></i> Buka
        </a>
        <button data-request-acc="${esc(a.id)}" class="acc-btn boost" style="background:var(--green-50);color:var(--green-700);border-color:var(--green-100)">
          <i data-lucide="user-plus"></i> Minta Follower
        </button>
      `
      : `
        <a href="${esc(a.profile_url)}" target="_blank" rel="noopener" class="acc-btn ghost">
          <i data-lucide="external-link"></i> Buka
        </a>
        <button data-boost-acc="${esc(a.id)}" class="acc-btn boost">
          <i data-lucide="rocket"></i> Boost
        </button>
      `;

    return `
      <div class="account-card ${boosted ? 'boosted' : ''}" style="animation-delay:${index * 40}ms">
        <div class="acc-head">
          <div class="acc-avatar ${boosted ? 'boosted' : ''}" style="background:${p.color}">
            <i data-lucide="${p.icon}"></i>
          </div>
          <div class="acc-info">
            <div class="acc-username">@${esc(a.username)}</div>
            <div class="acc-boost-label ${boosted ? 'active' : ''}">${p.name}${boosted ? ' • ' + boostLabel : ''}</div>
            ${typeBadge}
          </div>
          <button data-delete-acc="${esc(a.id)}" class="acc-del" title="Hapus akun">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
        <div class="acc-actions">
          ${actions}
        </div>
      </div>`;
  }

  /* ============================================================
     UPDATE COUNTER
     ============================================================ */
  function updateAccountCounter() {
    const el = $('boostCount');
    if (el) el.textContent = state.accounts.length;
  }

  /* ============================================================
     DELETE
     ============================================================ */
  async function deleteAccount(id) {
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return;

    const p = PLATFORMS[acc.platform] || { name: acc.platform };
    if (!confirm(`Hapus akun @${acc.username} (${p.name}) dari daftar?`)) return;

    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');

    toast('Akun dihapus', 'success');

    await Promise.all([
      loadAccounts(),
      App.loadFeed ? App.loadFeed() : Promise.resolve(),
      App.loadProfile ? App.loadProfile() : Promise.resolve(),
    ]);
  }

  /* ============================================================
     SUB-TAB SWITCHING
     ============================================================ */
  function switchAccTab(tab) {
    state.currentAccTab = tab;
    document.querySelectorAll('.acc-subtab').forEach(b => {
      b.classList.toggle('active', b.dataset.accTab === tab);
    });
    const desc = $('accTypeDesc');
    if (desc) desc.textContent = TYPE_LABEL[tab].desc;
    loadAccounts();
  }

  /* ============================================================
     PLATFORM GRID
     ============================================================ */
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

  /* ============================================================
     TYPE GRID (Tumbal / Utama)
     ============================================================ */
  function renderTypeGrid() {
    const grid = $('accTypeGrid');
    if (!grid) return;

    grid.querySelectorAll('.accTypeBtn').forEach(b => {
      const active = b.dataset.type === state.selectedAccType;
      b.classList.toggle('active', active);

      // Rebind
      b.onclick = () => {
        state.selectedAccType = b.dataset.type;
        renderTypeGrid();
      };
    });
  }

  /* ============================================================
     OPEN ADD ACCOUNT
     ============================================================ */
  function openAddAccount() {
    state.selectedPlatform = 'instagram';
    state.selectedAccType = state.currentAccTab; // Default sesuai tab aktif
    resetAddAccountForm();
    openModal('modalAddAccount');
    setTimeout(() => $('accUsername')?.focus(), 200);
  }

  function openAddAccountWithPlatform(platform, type) {
    state.selectedPlatform = platform || 'instagram';
    state.selectedAccType = type || state.currentAccTab;
    resetAddAccountForm();
    if (App.switchTab) App.switchTab('accounts');
    setTimeout(() => {
      openModal('modalAddAccount');
      setTimeout(() => $('accUsername')?.focus(), 200);
    }, 100);
  }

  /* ============================================================
     RESET FORM
     ============================================================ */
  function resetAddAccountForm() {
    const u = $('accUsername');
    const url = $('accUrl');
    if (u) u.value = '';
    if (url) {
      url.value = '';
      delete url.dataset.manuallyEdited;
    }
    clearStatus('addAccStatus');
    renderPlatformGrid();
    renderTypeGrid();
  }

  /* ============================================================
     SAVE ACCOUNT
     ============================================================ */
  async function saveAccount() {
    const username = $('accUsername').value.trim().replace(/^@/, '');
    const url = $('accUrl').value.trim();

    if (!username) {
      return status('addAccStatus', 'error', 'Username wajib diisi');
    }
    if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) {
      return status('addAccStatus', 'error', 'Username tidak valid');
    }
    if (!/^https?:\/\//.test(url)) {
      return status('addAccStatus', 'error', 'Link harus diawali http:// atau https://');
    }

    // Cek duplikat
    const duplicate = state.accounts.find(
      a => a.platform === state.selectedPlatform
        && a.username.toLowerCase() === username.toLowerCase()
    );
    if (duplicate) {
      return status('addAccStatus', 'error',
        `Akun ${PLATFORMS[state.selectedPlatform].name} @${username} sudah ada`);
    }

    const btn = $('btnSaveAccount');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';
    }
    status('addAccStatus', 'warn', 'Menyimpan...');

    try {
      const { error } = await sb.from('social_accounts').insert({
        user_id: state.user.id,
        platform: state.selectedPlatform,
        username: username,
        profile_url: url,
        account_type: state.selectedAccType,
      });
      if (error) throw error;

      const p = PLATFORMS[state.selectedPlatform];
      const typeName = TYPE_LABEL[state.selectedAccType].name;
      toast(`Akun ${typeName} ${p.name} @${username} ditambahkan ✅`, 'success', 3000);

      // Auto-switch ke tab yang sesuai
      state.currentAccTab = state.selectedAccType;
      document.querySelectorAll('.acc-subtab').forEach(b => {
        b.classList.toggle('active', b.dataset.accTab === state.currentAccTab);
      });
      const desc = $('accTypeDesc');
      if (desc) desc.textContent = TYPE_LABEL[state.currentAccTab].desc;

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
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Simpan Akun';
      }
    }
  }

  /* ============================================================
     AUTO-FILL URL
     ============================================================ */
  function bindUsernameAutoFill() {
    const usernameInput = $('accUsername');
    const urlInput = $('accUrl');

    if (usernameInput) {
      usernameInput.addEventListener('input', (e) => {
        const u = e.target.value.trim().replace(/^@/, '');
        const p = PLATFORMS[state.selectedPlatform];
        if (u && p && urlInput && !urlInput.dataset.manuallyEdited) {
          urlInput.value = p.url(u);
        }
      });

      usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          $('accUrl')?.focus();
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', () => {
        urlInput.dataset.manuallyEdited = '1';
      });
      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveAccount();
        }
      });
    }
  }

  /* ============================================================
     BINDING
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    // Sub-tab
    document.querySelectorAll('.acc-subtab').forEach(b => {
      b.addEventListener('click', () => switchAccTab(b.dataset.accTab));
    });

    // Tombol tambah
    $('btnAddAccount')?.addEventListener('click', openAddAccount);

    // Tombol simpan
    $('btnSaveAccount')?.addEventListener('click', saveAccount);

    // Auto-fill URL
    bindUsernameAutoFill();
  });

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadAccounts = loadAccounts;
  App.openAddAccount = openAddAccount;
  App.openAddAccountWithPlatform = openAddAccountWithPlatform;
  App.switchAccTab = switchAccTab;

})();
