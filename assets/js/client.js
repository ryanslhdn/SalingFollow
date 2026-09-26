/* ============================================================
   SUPABASE CLIENT INIT
   Harus di-load setelah config.js dan CDN Supabase
   ============================================================ */

(function() {
  const { SUPABASE_URL, SUPABASE_ANON } = window.APP_CONFIG;

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('[Client] Config Supabase belum diisi di assets/js/config.js');
    document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;">⚠️ Konfigurasi Supabase belum diisi. Edit <code>assets/js/config.js</code>.</div>';
    return;
  }

  window.sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  console.log('%c[SalingFollow] Client ready', 'color:#10b981;font-weight:800;');
})();