/* ============================================================
   TABS — Navigasi tab bawah
   ============================================================ */

(function() {
  const { $ } = App;

  function switchTab(tab) {
    // Update section visibility
    ['feed', 'accounts', 'addFollow', 'history', 'profile'].forEach(t => {
      const section = $('tab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (section) section.classList.toggle('hidden', t !== tab);
    });

    // Update active state di bottom nav
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    // Load data sesuai tab
    if (tab === 'feed')       App.loadFeed?.();
    if (tab === 'accounts')   App.loadAccounts?.();
    if (tab === 'addFollow')  App.loadTargets?.();
    if (tab === 'history')    App.loadHistory?.();
    if (tab === 'profile')    App.loadProfile?.();

    App.icon();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => switchTab(b.dataset.tab));
    });
  });

  App.switchTab = switchTab;
})();
