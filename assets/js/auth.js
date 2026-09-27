/* ============================================================
   AUTH — Login / Register / Logout
   + Block user banned saat login
   ============================================================ */

(function() {
  const { $, status, icon } = App;

  /* ---------- AUTH MODAL ---------- */
  function openAuthModal(tab) {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    switchAuthTab(tab || 'login');
    ['loginStatus', 'registerStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function toggleMobileNav() {
    const menu = document.getElementById('ldMobileMenu');
    if (menu) menu.classList.toggle('open');
  }
  function closeMobileNav() {
    const menu = document.getElementById('ldMobileMenu');
    if (menu) menu.classList.remove('open');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('authModal');
      if (modal && !modal.classList.contains('hidden')) closeAuthModal();
      closeMobileNav();
    }
  });

  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.toggleMobileNav = toggleMobileNav;
  window.closeMobileNav = closeMobileNav;
  App.openAuthModal = openAuthModal;
  App.closeAuthModal = closeAuthModal;

  /* ---------- TAB SWITCHING ---------- */
  function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    $('panelLogin').classList.toggle('hidden', !isLogin);
    $('panelRegister').classList.toggle('hidden', isLogin);
    document.querySelectorAll('.auth-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.authTab === tab);
    });
  }

  document.querySelectorAll('.auth-tab-btn').forEach(b => {
    b.addEventListener('click', () => switchAuthTab(b.dataset.authTab));
  });

  /* ============================================================
     CHECK BANNED — dipanggil setelah login sukses
     ============================================================ */
  async function checkBannedAndSignOut(userId) {
    try {
      const { data: profile, error } = await sb
        .from('profiles')
        .select('is_banned')
        .eq('id', userId)
        .single();

      if (error) {
        // Kalau profile tidak ada (sudah dihapus admin) → tolak login
        if (error.code === 'PGRST116') {
          await sb.auth.signOut();
          throw new Error('Akun kamu sudah dihapus. Hubungi admin.');
        }
        return; // Error lain, biarkan login lanjut
      }

      if (profile && profile.is_banned === true) {
        await sb.auth.signOut();
        throw new Error('Akun kamu di-ban. Hubungi admin untuk info lebih lanjut.');
      }
    } catch (e) {
      if (e.message && e.message.includes('di-ban')) throw e;
      if (e.message && e.message.includes('dihapus')) throw e;
      console.warn('[BannedCheck]', e);
    }
  }

  /* ============================================================
     LOGIN
     ============================================================ */
  const loginBtn = $('btnLogin');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const identifier = $('loginEmail').value.trim();
      const password = $('loginPassword').value;

      if (!identifier || !password) {
        return status('loginStatus', 'error', 'Isi email/username & password');
      }

      // === ADMIN LOGIN ===
      const { ADMIN_EMAIL, ADMIN_PASS } = window.APP_CONFIG || {};
      if (ADMIN_EMAIL && identifier.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASS) {
        sessionStorage.setItem('sf_admin_key', password);
        status('loginStatus', 'success', '✅ Login admin...');
        setTimeout(() => location.reload(), 500);
        return;
      }

      // === USER LOGIN ===
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></span> Memverifikasi...</span>';
      status('loginStatus', 'warn', 'Memverifikasi...');

      try {
        let email = identifier.toLowerCase();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

        if (!isEmail) {
          status('loginStatus', 'warn', 'Mencari akun...');
          const { data: foundEmail, error: lookupErr } = await sb.rpc('lookup_email_by_username', {
            p_username: identifier
          });

          if (lookupErr) throw lookupErr;
          if (!foundEmail) throw new Error('Username tidak ditemukan');
          email = foundEmail.toLowerCase();
        }

        status('loginStatus', 'warn', 'Memverifikasi...');
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // ⭐ CEK STATUS BANNED / DIHAPUS
        status('loginStatus', 'warn', 'Mengecek status akun...');
        await checkBannedAndSignOut(data.user.id);

        // Sukses — tutup modal otomatis
        status('loginStatus', 'success', '✅ Berhasil! Mengalihkan...');
        if (typeof closeAuthModal === 'function') closeAuthModal();

        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Masuk <i data-lucide="arrow-right" style="width:16px;height:16px"></i>';
        if (window.lucide) window.lucide.createIcons();

      } catch (e) {
        console.error('[Login]', e);
        let msg = e.message || 'Gagal login';
        if (msg.toLowerCase().includes('invalid')) msg = 'Email/username atau password salah';
        status('loginStatus', 'error', msg);
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Masuk <i data-lucide="arrow-right" style="width:16px;height:16px"></i>';
        icon();
      }
    });
  }

  /* ============================================================
     REGISTER
     ============================================================ */
  const registerBtn = $('btnRegister');
  if (registerBtn) {
    registerBtn.addEventListener('click', async () => {
      const name     = $('regName').value.trim();
      const username = $('regUsername').value.trim().toLowerCase();
      const email    = $('regEmail').value.trim().toLowerCase();
      const password = $('regPassword').value;

      if (!name)                                     return status('registerStatus','error','Nama wajib diisi');
      if (!/^[a-z0-9_]{3,}$/.test(username))         return status('registerStatus','error','Username min 3 char (huruf/angka/_)');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return status('registerStatus','error','Email tidak valid');
      if (password.length < 6)                       return status('registerStatus','error','Password min 6 karakter');

      registerBtn.disabled = true;
      registerBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite"></span> Mendaftar...</span>';
      status('registerStatus','warn','Membuat akun...');

      try {
        const { error } = await sb.auth.signUp({
          email, password,
          options: { data: { username, display_name: name } }
        });
        if (error) throw error;

        status('registerStatus','success','✅ Akun dibuat! Login otomatis...');
        const { error: e2 } = await sb.auth.signInWithPassword({ email, password });
        if (e2) throw e2;

        if (typeof closeAuthModal === 'function') closeAuthModal();

        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Daftar Gratis <i data-lucide="arrow-right" style="width:16px;height:16px"></i>';
        if (window.lucide) window.lucide.createIcons();

      } catch (e) {
        console.error('[Register]', e);
        let msg = e.message || 'Gagal daftar';
        if (msg.toLowerCase().includes('already')) msg = 'Email sudah terdaftar';
        status('registerStatus','error', msg);
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Daftar Gratis <i data-lucide="arrow-right" style="width:16px;height:16px"></i>';
        icon();
      }
    });
  }

  /* ============================================================
     LOGOUT
     ============================================================ */
  async function logout() {
    const ok = await App.confirm({
      title: 'Keluar dari akun?',
      desc: 'Kamu akan keluar dari akun ini. Data tetap tersimpan dan bisa login lagi nanti.',
      okText: 'Ya, Keluar',
      cancelText: 'Batal',
      danger: true,
      icon: 'log-out'
    });
    if (!ok) return;

    try { await sb.auth.signOut(); } catch (e) { console.warn(e); }
    sessionStorage.removeItem('sf_admin_key');
    location.reload();
  }

  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  App.logout = logout;
  App.switchAuthTab = switchAuthTab;
  App.checkBannedAndSignOut = checkBannedAndSignOut;

})();
