/* ============================================================
   UTILITIES — Helper umum
   ============================================================ */

window.App = window.App || {};

/* ---------- DOM ---------- */
App.$ = (id) => document.getElementById(id);

App.icon = () => {
  if (window.lucide) window.lucide.createIcons();
};

/* ---------- ESCAPE HTML ---------- */
App.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

/* ---------- TOAST ---------- */
App.toast = (msg, type = 'info', ms = 3000) => {
  const c = App.$('toasts');
  if (!c) return;
  const d = document.createElement('div');
  d.className = `toast-item ${type}`;
  d.textContent = msg;
  c.appendChild(d);
  setTimeout(() => {
    d.style.transition = 'all .3s';
    d.style.opacity = '0';
    d.style.transform = 'translateY(-10px)';
    setTimeout(() => d.remove(), 300);
  }, ms);
};

/* ---------- STATUS MESSAGE ---------- */
App.status = (id, type, msg) => {
  const el = App.$(id);
  if (!el) return;
  el.className = `status-msg ${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
};

App.clearStatus = (id) => {
  const el = App.$(id);
  if (el) el.classList.add('hidden');
};

/* ---------- MODAL ---------- */
App.openModal = (id) => {
  App.$(id)?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  App.icon();
};

App.closeModal = (id) => {
  App.$(id)?.classList.add('hidden');
  document.body.style.overflow = '';
};

/* Auto-bind: [data-close-modal] */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-close-modal]');
  if (t) App.closeModal(t.dataset.closeModal);
});

/* ---------- FORMAT ---------- */
App.formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
};

/* ---------- PLATFORMS ---------- */
App.PLATFORMS = {
  instagram: { name:'Instagram', icon:'camera',         color:'#E1306C', url:(u)=>`https://instagram.com/${u}` },
  tiktok:    { name:'TikTok',    icon:'music-2',        color:'#000000', url:(u)=>`https://tiktok.com/@${u}` },
  youtube:   { name:'YouTube',   icon:'play-circle',    color:'#FF0000', url:(u)=>`https://youtube.com/@${u}` },
  twitter:   { name:'X',         icon:'message-circle', color:'#000000', url:(u)=>`https://x.com/${u}` },
  facebook:  { name:'Facebook',  icon:'thumbs-up',      color:'#1877F2', url:(u)=>`https://facebook.com/${u}` },
};

/* ---------- GLOBAL STATE ---------- */
App.state = {
  user: null,
  profile: null,
  accounts: [],
  feed: [],
  history: [],
  pendingClaims: [],
  currentTarget: null,
  currentAccountBoost: null,
  boostDuration: 24,
  selectedPlatform: 'instagram',
  realtimeChannel: null,
};