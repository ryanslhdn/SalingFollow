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

    await App.loadProfile();
    // Accounts harus diload SEBELUM feed (buat cek user punya akun apa belum)
    await App.loadAccounts();
    await Promise.all([
      App.loadFeed(),
      App.loadHistory(),
      App.loadPendingClaims(),
    ]);
    App.setupRealtime();
  }

  async function showAdmin() {
    $('authView').classList.add('hidden');
    $('appView').classList.add('hidden');
    $('adminView').classList.remove('hidden');
    icon();
    await App.initAdmin();
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) { state.user = session.user; showApp(); }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    icon();

    // Cek admin session dulu
    if (sessionStorage.getItem('sf_admin_key')) {
      return showAdmin();
    }

    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) { state.user = session.user; await showApp(); }
    else showAuth();
  });
})();
