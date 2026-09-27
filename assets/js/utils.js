/* ============================================================
   UTILITIES — Helper umum
   ============================================================ */

window.App = window.App || {};

App.$ = (id) => document.getElementById(id);

App.icon = () => {
  if (window.lucide) window.lucide.createIcons();
};

App.esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

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

App.openModal = (id) => {
  const el = App.$(id);
  if (el) el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  App.icon();
};

App.closeModal = (id) => {
  const el = App.$(id);
  if (el) el.classList.add('hidden');
  document.body.style.overflow = '';
};

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-close-modal]');
  if (t) App.closeModal(t.dataset.closeModal);
});

App.formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return '—';
  }
};

App.formatRupiah = (n) => {
  const num = Math.round(Number(n) || 0);
  return 'Rp ' + num.toLocaleString('id-ID');
};

App.PLATFORMS = {
  instagram: { name:'Instagram', icon:'camera',         color:'#E1306C', url:(u)=>`https://instagram.com/${u}` },
  tiktok:    { name:'TikTok',    icon:'music-2',        color:'#000000', url:(u)=>`https://tiktok.com/@${u}` },
  youtube:   { name:'YouTube',   icon:'play-circle',    color:'#FF0000', url:(u)=>`https://youtube.com/@${u}` },
  twitter:   { name:'X',         icon:'message-circle', color:'#000000', url:(u)=>`https://x.com/${u}` },
  facebook:  { name:'Facebook',  icon:'thumbs-up',      color:'#1877F2', url:(u)=>`https://facebook.com/${u}` },
};

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

/* ============================================================
   CUSTOM CONFIRM — pengganti confirm() bawaan browser
   Usage: const ok = await App.confirm({ title, desc, okText, danger })
   ============================================================ */
App.confirm = function(opts) {
  opts = opts || {};
  const title      = opts.title   || 'Konfirmasi';
  const desc       = opts.desc    || 'Lanjutkan?';
  const okText     = opts.okText  || 'Ya, Lanjutkan';
  const cancelText = opts.cancelText || 'Batal';
  const danger     = opts.danger !== false;
  const iconName   = opts.icon || (danger ? 'alert-triangle' : 'help-circle');

  return new Promise((resolve) => {
    const old = document.getElementById('appConfirmModal');
    if (old) old.remove();

    const m = document.createElement('div');
    m.id = 'appConfirmModal';
    m.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15,23,42,.5);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      opacity: 0;
      transition: opacity .2s ease;
    `;

    const accentBg = danger ? '#fef2f2' : '#eff6ff';
    const accentBorder = danger ? '#fecaca' : '#bfdbfe';
    const accentColor = danger ? '#ef4444' : '#3b82f6';
    const okBg = danger
      ? 'linear-gradient(135deg,#ef4444,#dc2626)'
      : 'linear-gradient(135deg,#10b981,#059669)';
    const okShadow = danger
      ? '0 8px 18px -6px rgba(239,68,68,.5)'
      : '0 8px 18px -6px rgba(16,185,129,.5)';

    m.innerHTML = `
      <div style="
        position: relative;
        width: 100%;
        max-width: 360px;
        background: #fff;
        border-radius: 20px;
        padding: 28px 24px 22px;
        text-align: center;
        box-shadow: 0 40px 80px -20px rgba(15,23,42,.4);
        animation: appConfirmIn .3s cubic-bezier(.34,1.56,.64,1);
      ">
        <div style="
          width: 64px; height: 64px;
          margin: 0 auto 16px;
          border-radius: 20px;
          background: ${accentBg};
          border: 1.5px solid ${accentBorder};
          display: grid;
          place-items: center;
          color: ${accentColor};
        ">
          <i data-lucide="${iconName}" style="width:30px;height:30px"></i>
        </div>

        <h3 style="
          font-size: 17px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 8px;
          letter-spacing: -.02em;
          line-height: 1.3;
        ">${App.esc(title)}</h3>

        <p style="
          font-size: 13.5px;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 22px;
        ">${App.esc(desc)}</p>

        <div style="display:flex;gap:8px">
          <button type="button" data-cancel style="
            flex: 1;
            padding: 12px;
            border-radius: 11px;
            background: #f3f4f6;
            color: #4b5563;
            font-weight: 700;
            font-size: 13px;
            font-family: inherit;
            cursor: pointer;
            border: 1px solid #e5e7eb;
          ">${App.esc(cancelText)}</button>
          <button type="button" data-ok style="
            flex: 1.3;
            padding: 12px;
            border-radius: 11px;
            background: ${okBg};
            color: #fff;
            font-weight: 800;
            font-size: 13px;
            font-family: inherit;
            cursor: pointer;
            border: none;
            box-shadow: ${okShadow};
          ">${App.esc(okText)}</button>
        </div>
      </div>

      <style>
        @keyframes appConfirmIn {
          from { opacity: 0; transform: scale(.9) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      </style>
    `;

    document.body.appendChild(m);
    if (window.lucide) window.lucide.createIcons();

    requestAnimationFrame(() => { m.style.opacity = '1'; });

    const close = (result) => {
      m.style.opacity = '0';
      setTimeout(() => { m.remove(); resolve(result); }, 200);
    };

    m.querySelector('[data-ok]').addEventListener('click', () => close(true));
    m.querySelector('[data-cancel]').addEventListener('click', () => close(false));

    m.addEventListener('click', (e) => { if (e.target === m) close(false); });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        close(false);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
};
