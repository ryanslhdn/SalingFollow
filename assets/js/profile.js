/* ============================================================
   PROFILE — Load data profil user
   ============================================================ */

(function() {
  const { $ } = App;

  async function loadProfile() {
    const { data, error } = await sb.from('profiles').select('*').eq('id', App.state.user.id).single();
    if (error) { console.error('[Profile]', error); return; }

    App.state.profile = data;

    $('headerUsername').textContent = data.display_name || data.username;
    $('creditsValue').textContent = data.credits;
    $('profileName').textContent = data.display_name || data.username;
    $('profileUsername').textContent = '@' + data.username;
    $('profileAvatar').textContent = (data.display_name || data.username || '?')[0].toUpperCase();
    $('statCredits').textContent = data.credits;
    $('statGiven').textContent = data.total_follows_given;
    $('statReceived').textContent = data.total_follows_received;
  }

  App.loadProfile = loadProfile;
})();