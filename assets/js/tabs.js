/* ============================================================
   TABS — Navigasi tab bawah
   ============================================================ */

(function() {
  const { $ } = App;

  function switchTab(tab) {
    ['feed', 'accounts', 'history', 'profile'].forEach(t => {
      const section = $('tab' + t.charAt(0).toUpperCase() + t.slice(1));
      if (section) section.classList.toggle('hidden', t !== tab);
    });

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    if (tab === 'feed')     App.loadFeed();
    if (tab === 'accounts') App.loadAccounts();
    if (tab === 'history')  App.loadHistory();
    if (tab === 'profile')  App.loadProfile();

    App.icon();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.addEventListener('click', () => switchTab(b.dataset.tab));
    });
  });

  App.switchTab = switchTab;
})();

function switchTab(tab) {
  ['feed', 'accounts', 'store', 'history', 'profile'].forEach(t => {
    const section = $('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (section) section.classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  if (tab === 'feed')     App.loadFeed();
  if (tab === 'accounts') App.loadAccounts();
  if (tab === 'store')    App.loadStore();
  if (tab === 'history')  App.loadHistory();
  if (tab === 'profile')  App.loadProfile();

  App.icon();
}
