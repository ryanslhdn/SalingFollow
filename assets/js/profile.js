/* ============================================================
   PROFILE — Load data profil user
   ============================================================ */

(function() {
  const { $ } = App;

  async function loadProfile() {
    if (!App.state.user) return;

    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', App.state.user.id)
      .single();

    if (error) {
      console.error('[Profile]', error);
      return;
    }

    App.state.profile = data;

    // Header
    $('headerUsername').textContent = data.display_name || data.username;

    // Stats row (di atas, 4 kartu)
    $('creditsValue').textContent = data.credits;
    $('statGiven').textContent = data.total_follows_given;
    $('statReceived').textContent = data.total_follows_received;

    // Profile page
    $('profileName').textContent = data.display_name || data.username;
    $('profileUsername').textContent = '@' + data.username;
    $('profileAvatar').textContent = (data.display_name || data.username || '?')[0].toUpperCase();
    $('profileStatCredits').textContent = data.credits;

    // Counter akun aktif
    try {
      const { count } = await sb
        .from('social_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', App.state.user.id);

      const bc = $('boostCount');
      if (bc) bc.textContent = count || 0;
    } catch (e) {
      console.warn('[Profile] Count accounts failed', e);
    }
  }

  App.loadProfile = loadProfile;
})();
