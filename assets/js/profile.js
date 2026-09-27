/* ============================================================
   PROFILE — Load data profil user
   + Auto signout kalau user banned/dihapus
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
      // ⭐ Kalau profile tidak ada (dihapus admin) → force logout
      if (error.code === 'PGRST116') {
        console.warn('[Profile] Akun dihapus admin, force logout');
        try { await sb.auth.signOut(); } catch (e) {}
        localStorage.removeItem('kasir:authCache');
        sessionStorage.removeItem('sf_admin_key');
        setTimeout(() => location.reload(), 800);
        return;
      }
      console.error('[Profile]', error);
      return;
    }

    // ⭐ Kalau user banned → force logout
    if (data.is_banned === true) {
      console.warn('[Profile] Akun di-ban, force logout');
      try { await sb.auth.signOut(); } catch (e) {}
      localStorage.removeItem('kasir:authCache');
      sessionStorage.removeItem('sf_admin_key');
      if (window.App && App.toast) App.toast('Akun kamu di-ban oleh admin', 'error', 4000);
      setTimeout(() => location.reload(), 1500);
      return;
    }

    App.state.profile = data;

    const displayName = data.display_name || data.username || 'User';
    const initial = displayName[0].toUpperCase();

    // HEADER
    const headerUsernameEl = $('headerUsername');
    if (headerUsernameEl) headerUsernameEl.textContent = displayName;

    const hour = new Date().getHours();
    const greeting = hour < 11 ? 'Selamat pagi ☀️'
                    : hour < 15 ? 'Selamat siang 🌤️'
                    : hour < 19 ? 'Selamat sore 🌆'
                    : 'Selamat malam 🌙';
    const greetEl = document.getElementById('headerGreeting');
    if (greetEl) greetEl.textContent = greeting;

    const avatarLetter = document.getElementById('headerAvatarLetter');
    if (avatarLetter) avatarLetter.textContent = initial;

    // STATS ROW
    const creditsEl = $('creditsValue');
    if (creditsEl) creditsEl.textContent = data.credits ?? 0;

    const givenEl = $('statGiven');
    if (givenEl) givenEl.textContent = data.total_follows_given ?? 0;

    const receivedEl = $('statReceived');
    if (receivedEl) receivedEl.textContent = data.total_follows_received ?? 0;

    // PROFILE PAGE
    const profileNameEl = $('profileName');
    if (profileNameEl) profileNameEl.textContent = displayName;

    const profileUsernameEl = $('profileUsername');
    if (profileUsernameEl) profileUsernameEl.textContent = '@' + (data.username || 'user');

    const profileAvatarEl = $('profileAvatar');
    if (profileAvatarEl) profileAvatarEl.textContent = initial;

    const profileStatCreditsEl = $('profileStatCredits');
    if (profileStatCreditsEl) profileStatCreditsEl.textContent = data.credits ?? 0;

    // COUNTER AKUN
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

    if (window.lucide) window.lucide.createIcons();
  }

  App.loadProfile = loadProfile;
})();
