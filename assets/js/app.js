/* ============================================================
   APP — Bootstrap utama
   File ini di-load PALING AKHIR
   ============================================================ */

(function() {
  const { $, icon, state } = App;

  function showAuth() {
    $('appView').classList.add('hidden');
    $('authView').classList.remove('hidden');
    icon();
  }

  async function showApp() {
    $('authView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    icon();

    await App.loadProfile();
    await Promise.all([
      App.loadFeed(),
      App.loadAccounts(),
      App.loadHistory(),
      App.loadPendingClaims(),
    ]);

    App.setupRealtime();
  }

  /* ---------- Auth state listener ---------- */
  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      state.user = session.user;
      showApp();
    } else {
      state.user = null;
      showAuth();
    }
  });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    icon();
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      state.user = session.user;
      await showApp();
    } else {
      showAuth();
    }
  });
})();