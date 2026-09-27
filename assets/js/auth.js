/* ============================================================
   AUTH — Login / Register / Logout
   ============================================================ */

(function() {
  const { $, status, icon } = App;

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
     LOGIN — Support Email ATAU Username
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
      loginBtn.textContent = 'Memverifikasi...';
      status('loginStatus', 'warn', 'Memverifikasi...');

      try {
        let email = identifier.toLowerCase();

        // Kalau bukan format email → lookup via username
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        if (!isEmail) {
          status('loginStatus', 'warn', 'Mencari akun...');
          const { data: foundEmail, error: lookupErr } = await sb.rpc('lookup_email_by_username', {
            p_username: identifier
          });

          if (lookupErr) throw lookupErr;
          if (!foundEmail) {
            throw new Error('Username tidak ditemukan');
          }
          email = foundEmail.toLowerCase();
        }

        status('loginStatus', 'warn', 'Memverifikasi...');
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        status('loginStatus', 'success', '✅ Berhasil!');
      } catch (e) {
        console.error('[Login]', e);
        let msg = e.message || 'Gagal login';
        if (msg.toLowerCase().includes('invalid')) msg = 'Email/username atau password salah';
        status('loginStatus', 'error', msg);
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4 inline mr-1"></i> Masuk';
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
      registerBtn.textContent = 'Mendaftar...';
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
      } catch (e) {
        console.error('[Register]', e);
        let msg = e.message || 'Gagal daftar';
        if (msg.toLowerCase().includes('already')) msg = 'Email sudah terdaftar';
        status('registerStatus','error', msg);
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4 inline mr-1"></i> Daftar Gratis';
        icon();
      }
    });
  }

  /* ============================================================
     LOGOUT (custom confirm modal)
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

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.logout = logout;
  App.switchAuthTab = switchAuthTab;

})();
