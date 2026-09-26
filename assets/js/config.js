/* ============================================================
   KONFIGURASI APLIKASI
   ============================================================ */

window.APP_CONFIG = {
  SUPABASE_URL:  'https://xxx.supabase.co',       // punyamu
  SUPABASE_ANON: 'eyJhbGci...',                    // anon key punyamu

  // === ADMIN LOGIN (client-side) ===
  // ⚠️ PENTING: Password admin di sini bisa dilihat siapa pun yang buka DevTools.
  // Untuk production serius, ganti ke Supabase Auth (lihat catatan di akhir).
  ADMIN_EMAIL: 'admin',       // login pakai email = "admin"
  ADMIN_PASS:  'admin2256',   // password admin

  // === BRANDING ===
  APP_NAME: 'SalingFollow',
  CREDIT_PER_FOLLOW: 1,
  CREDIT_PER_BOOST_24H: 3,
};
