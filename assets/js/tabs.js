/* ============================================================
   TABS — Navigasi tab bawah
   ============================================================ */

(function() {
  const { $ } = App;

  function switchTab(tab) {
    ['feed', 'accounts', 'addFollow', 'history', 'profile'].forEach(t => {
      const section = $('tab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (section) section.classList.toggle('hidden', t !== tab);
    });

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    if (tab === 'feed')       App.loadFeed?.();
    if (tab === 'accounts')   App.loadAccounts?.();
    if (tab === 'addFollow')  App.loadTargets?.();
    if (tab === 'history')    App.loadHistory?.();
    if (tab === 'profile')    App.loadProfile?.();

    App.icon();
  }

  /* Toko sebagai overlay fullscreen */
  function openStore() {
    $('appView').classList.add('hidden');
    $('storeView').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    App.loadStore?.();
    App.icon();
  }

  function closeStore() {
    $('storeView').classList.add('hidden');
    $('appView').classList.remove('hidden');
    document.body.style.overflow = '';
    App.icon();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => switchTab(b.dataset.tab));
    });

    document.getElementById('btnOpenStore')?.addEventListener('click', openStore);
    document.getElementById('btnCloseStore')?.addEventListener('click', closeStore);
  });

  App.switchTab = switchTab;
  App.openStore = openStore;
  App.closeStore = closeStore;
})();
