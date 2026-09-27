/* ============================================================
   ACCOUNTS — CRUD akun sosmed user
   File lengkap dengan platform validation
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, PLATFORMS, state } = App;

  /* ============================================================
     LOAD ACCOUNTS — tampilkan daftar akun user
     ============================================================ */
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

    // Update counter di header kalau ada
    updateAccountCounter();

    if (!state.accounts.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.accounts.map((a, i) => renderAccountCard(a, i)).join('');

    // Binding tombol delete
    list.querySelectorAll('[data-delete-acc]').forEach(b => {
      b.addEventListener('click', () => deleteAccount(b.dataset.deleteAcc));
    });

    // Binding tombol boost
    list.querySelectorAll('[data-boost-acc]').forEach(b => {
      b.addEventListener('click', () => App.openBoost(b.dataset.boostAcc));
    });

    icon();
  }

  /* ============================================================
     RENDER ACCOUNT CARD
     ============================================================ */
  function renderAccountCard(a, index) {
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
            <div class="acc-boost-label ${boosted ? 'active' : ''}">${p.name} • ${boostLabel}</div>
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

  /* ============================================================
     UPDATE COUNTER (opsional — kalau ada elemen #boostCount)
     ============================================================ */
  function updateAccountCounter() {
    const el = $('boostCount');
    if (el) el.textContent = state.accounts.length;
  }

  /* ============================================================
     DELETE ACCOUNT
     ============================================================ */
  async function deleteAccount(id) {
    const acc = state.accounts.find(a => a.id === id);
    if (!acc) return;

    const p = PLATFORMS[acc.platform] || { name: acc.platform };
    const confirmed = confirm(`Hapus akun @${acc.username} (${p.name}) dari daftar?`);
    if (!confirmed) return;

    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');

    toast('Akun dihapus', 'success');

    // Refresh: accounts, feed (karena feed bergantung akun), profile (counter)
    await Promise.all([
      loadAccounts(),
      App.loadFeed ? App.loadFeed() : Promise.resolve(),
      App.loadProfile ? App.loadProfile() : Promise.resolve(),
    ]);
  }

  /* ============================================================
     PLATFORM GRID — pilih platform di modal
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

    // Binding click
    grid.querySelectorAll('.platBtn').forEach(b => {
      b.addEventListener('click', () => {
        state.selectedPlatform = b.dataset.plat;
        renderPlatformGrid();

        // Auto-update URL kalau username sudah diisi
        const u = $('accUsername').value.trim().replace(/^@/, '');
        const p = PLATFORMS[state.selectedPlatform];
        if (u && p) $('accUrl').value = p.url(u);

        icon();
      });
    });

    icon();
  }

  /* ============================================================
     OPEN ADD ACCOUNT — default platform
     ============================================================ */
  function openAddAccount() {
    state.selectedPlatform = 'instagram';
    resetAddAccountForm();
    openModal('modalAddAccount');
    setTimeout(() => $('accUsername')?.focus(), 200);
  }

  /* ============================================================
     OPEN ADD ACCOUNT WITH PLATFORM — dari tombol di feed card
     ============================================================ */
  function openAddAccountWithPlatform(platform) {
    state.selectedPlatform = platform || 'instagram';
    resetAddAccountForm();

    // Update tab ke Akun dulu (kalau dipanggil dari feed)
    if (App.switchTab) App.switchTab('accounts');

    // Open modal setelah switch tab
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
    if (url) url.value = '';
    clearStatus('addAccStatus');
    renderPlatformGrid();
  }

  /* ============================================================
     SAVE ACCOUNT
     ============================================================ */
  async function saveAccount() {
    const username = $('accUsername').value.trim().replace(/^@/, '');
    const url = $('accUrl').value.trim();

    // Validasi dasar
    if (!username) {
      return status('addAccStatus', 'error', 'Username wajib diisi');
    }
    if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) {
      return status('addAccStatus', 'error', 'Username tidak valid (huruf/angka/titik/underscore)');
    }
    if (!/^https?:\/\//.test(url)) {
      return status('addAccStatus', 'error', 'Link harus diawali http:// atau https://');
    }

    // Cek duplikat: user tidak boleh daftar akun dengan username + platform yang sama
    const duplicate = state.accounts.find(
      a => a.platform === state.selectedPlatform
        && a.username.toLowerCase() === username.toLowerCase()
    );
    if (duplicate) {
      return status('addAccStatus', 'error',
        `Akun ${PLATFORMS[state.selectedPlatform].name} @${username} sudah pernah ditambahkan`);
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
      });
      if (error) throw error;

      const p = PLATFORMS[state.selectedPlatform];
      toast(`Akun ${p.name} @${username} berhasil ditambahkan ✅`, 'success', 3000);

      closeModal('modalAddAccount');

      // Refresh semua yang butuh data akun
      await Promise.all([
        loadAccounts(),
        App.loadFeed ? App.loadFeed() : Promise.resolve(),
        App.loadProfile ? App.loadProfile() : Promise.resolve(),
      ]);

    } catch (e) {
      console.error('[SaveAccount]', e);
      const msg = e.message || 'Gagal menyimpan akun';
      status('addAccStatus', 'error', msg);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Simpan Akun';
      }
    }
  }

  /* ============================================================
     AUTO-FILL URL saat username di-input
     ============================================================ */
  function bindUsernameAutoFill() {
    const usernameInput = $('accUsername');
    if (!usernameInput) return;

    usernameInput.addEventListener('input', (e) => {
      const u = e.target.value.trim().replace(/^@/, '');
      const p = PLATFORMS[state.selectedPlatform];
      const urlInput = $('accUrl');

      // Hanya auto-fill kalau user belum edit URL manual
      if (u && p && urlInput && !urlInput.dataset.manuallyEdited) {
        urlInput.value = p.url(u);
      }
    });

    // Track kalau user edit URL manual
    const urlInput = $('accUrl');
    if (urlInput) {
      urlInput.addEventListener('input', () => {
        urlInput.dataset.manuallyEdited = '1';
      });
      // Reset flag saat modal dibuka
      // (dilakukan di resetAddAccountForm)
    }
  }

  /* ============================================================
     RESET FLAG URL saat form dibuka
     ============================================================ */
  const origReset = resetAddAccountForm;
  resetAddAccountForm = function() {
    origReset();
    const urlInput = $('accUrl');
    if (urlInput) delete urlInput.dataset.manuallyEdited;
  };

  /* ============================================================
     BINDING SEMUA EVENT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    // Tombol tambah akun
    $('btnAddAccount')?.addEventListener('click', openAddAccount);

    // Tombol simpan
    $('btnSaveAccount')?.addEventListener('click', saveAccount);

    // Enter di input = submit
    $('accUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveAccount();
      }
    });

    // Auto-fill URL
    bindUsernameAutoFill();

    // Handle Enter di username → pindah ke URL
    $('accUsername')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        $('accUrl')?.focus();
      }
    });
  });

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadAccounts = loadAccounts;
  App.openAddAccount = openAddAccount;
  App.openAddAccountWithPlatform = openAddAccountWithPlatform;

})();
