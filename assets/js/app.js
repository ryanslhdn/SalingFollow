/* ============================================================
   APP — Bootstrap utama
   ============================================================ */

(function() {
  const { $, icon, state } = App;

  function showAuth() {
    $('appView').classList.add('hidden');
    $('adminView').classList.add('hidden');
    $('authView').classList.remove('hidden');
    icon();
  }

  async function showApp() {
    $('authView').classList.add('hidden');
    $('adminView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    icon();

    // Load profile & accounts dulu (dibutuhkan oleh feed & targets)
    await App.loadProfile?.();
    await App.loadAccounts?.();

    // Load paralel
    await Promise.all([
      App.loadFeed?.() || Promise.resolve(),
      App.loadHistory?.() || Promise.resolve(),
      App.loadPendingClaims?.() || Promise.resolve(),
      App.loadTargets?.() || Promise.resolve(),
    ]);

    // Setup realtime
    App.setupRealtime?.();
  }

  async function showAdmin() {
    $('authView').classList.add('hidden');
    $('appView').classList.add('hidden');
    $('adminView').classList.remove('hidden');
    icon();
    await App.initAdmin?.();
  }

  /* ---------- Auth state listener ---------- */
  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      state.user = session.user;
      showApp();
    }
  });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    icon();

    // Cek admin session dulu
    if (sessionStorage.getItem('sf_admin_key')) {
      return showAdmin();
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      state.user = session.user;
      await showApp();
    } else {
      showAuth();
    }
  });
})();
