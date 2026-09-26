/* ============================================================
   ADMIN — Panel admin
   ============================================================ */

(function() {
  const { $, esc, toast, icon, formatRupiah, formatDateTime } = App;

  const ADMIN_KEY = () => sessionStorage.getItem('sf_admin_key');

  async function loadAdminStats() {
    const { data, error } = await sb.rpc('admin_stats', { p_key: ADMIN_KEY() });
    if (error) return console.error(error);
    $('adminTotalUsers').textContent = data.total_users;
    $('adminTotalCredits').textContent = data.total_credits;
    $('adminTotalClaims').textContent = data.total_claims;
    $('adminPendingPurchases').textContent = data.pending_purchases;
    $('adminBanned').textContent = data.banned;
  }

  async function loadAdminUsers() {
    const wrap = $('adminUsersList');
    wrap.innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">Memuat...</div>';

    const { data, error } = await sb.rpc('admin_list_users', { p_key: ADMIN_KEY() });
    if (error) { wrap.innerHTML = `<div class="text-red-400 text-sm p-4">${esc(error.message)}</div>`; return; }

    if (!data?.length) {
      wrap.innerHTML = '<div class="text-center text-slate-500 py-6 text-sm">Belum ada user</div>';
      return;
    }

    wrap.innerHTML = data.map(u => `
      <div class="bg-slate-900 rounded-2xl p-4 border border-slate-700">
        <div class="flex items-start gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 grid place-items-center text-white font-black flex-shrink-0">
            ${esc((u.display_name || u.username || '?')[0].toUpperCase())}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-black text-sm text-white truncate">${esc(u.display_name || u.username)}</div>
            <div class="text-[11px] text-slate-500 font-mono">@${esc(u.username)}</div>
            ${u.is_banned ? '<span class="inline-block mt-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[9px] font-black uppercase">BANNED</span>' : ''}
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-[10px] text-slate-500 uppercase font-black">Kredit</div>
            <div class="text-lg font-black text-emerald-400">${u.credits}</div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3 text-center">
          <div class="bg-slate-800 rounded-lg py-2">
            <div class="text-[9px] text-slate-500 uppercase font-black">Given</div>
            <div class="text-xs font-black text-white">${u.total_follows_given}</div>
          </div>
          <div class="bg-slate-800 rounded-lg py-2">
            <div class="text-[9px] text-slate-500 uppercase font-black">Received</div>
            <div class="text-xs font-black text-white">${u.total_follows_received}</div>
          </div>
          <div class="bg-slate-800 rounded-lg py-2">
            <div class="text-[9px] text-slate-500 uppercase font-black">Akun</div>
            <div class="text-xs font-black text-white">${u.accounts_count}</div>
          </div>
        </div>

        <div class="flex gap-2">
          <button data-add="${esc(u.id)}" class="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-black text-xs">
            + Kredit
          </button>
          <button data-rem="${esc(u.id)}" class="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-black text-xs">
            − Kredit
          </button>
          <button data-ban="${esc(u.id)}" data-banned="${u.is_banned}" class="px-3 py-2 rounded-xl ${u.is_banned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} font-black text-xs">
            ${u.is_banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => adminAdjustCredits(b.dataset.add, +1)));
    wrap.querySelectorAll('[data-rem]').forEach(b => b.addEventListener('click', () => adminAdjustCredits(b.dataset.rem, -1)));
    wrap.querySelectorAll('[data-ban]').forEach(b => b.addEventListener('click', () => adminToggleBan(b.dataset.ban, b.dataset.banned === 'true')));
  }

  async function adminAdjustCredits(userId, sign) {
    const amt = prompt(`Jumlah kredit (${sign > 0 ? 'tambah' : 'kurang'}):`, '10');
    if (!amt) return;
    const amount = Math.abs(Number(amt)) * sign;
    if (!amount) return;

    const { error } = await sb.rpc('admin_add_credits', {
      p_key: ADMIN_KEY(), p_user_id: userId, p_amount: amount, p_reason: 'admin_manual'
    });
    if (error) return toast(error.message, 'error');
    toast(`Kredit ${sign > 0 ? '+' : ''}${amount}`, 'success');
    loadAdminUsers();
    loadAdminStats();
  }

  async function adminToggleBan(userId, currentlyBanned) {
    if (!confirm(currentlyBanned ? 'Unban user ini?' : 'Ban user ini?')) return;
    const { error } = await sb.rpc('admin_set_ban', {
      p_key: ADMIN_KEY(), p_user_id: userId, p_ban: !currentlyBanned
    });
    if (error) return toast(error.message, 'error');
    toast(currentlyBanned ? 'User di-unban' : 'User di-ban', 'success');
    loadAdminUsers();
    loadAdminStats();
  }

  async function loadAdminPurchases() {
    const wrap = $('adminPurchasesList');
    wrap.innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">Memuat...</div>';

    const { data, error } = await sb.rpc('admin_list_purchases', { p_key: ADMIN_KEY() });
    if (error) { wrap.innerHTML = `<div class="text-red-400 p-4 text-sm">${esc(error.message)}</div>`; return; }

    if (!data?.length) {
      wrap.innerHTML = '<div class="text-center text-slate-500 py-6 text-sm">Belum ada pembelian</div>';
      return;
    }

    const stMap = {
      pending:  { label:'Pending', cls:'bg-amber-500/20 text-amber-400' },
      approved: { label:'Approved', cls:'bg-emerald-500/20 text-emerald-400' },
      rejected: { label:'Rejected', cls:'bg-red-500/20 text-red-400' },
    };

    wrap.innerHTML = data.map(p => {
      const st = stMap[p.status];
      return `
        <div class="bg-slate-900 rounded-2xl p-4 border border-slate-700">
          <div class="flex items-start gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <div class="font-black text-sm text-white">${esc(p.display_name || p.username)}</div>
              <div class="text-[11px] text-slate-500 font-mono">@${esc(p.username)}</div>
              <div class="text-[11px] text-slate-400 mt-1">${formatDateTime(p.created_at)}</div>
            </div>
            <span class="px-2 py-1 rounded-lg ${st.cls} text-[9px] font-black uppercase">${st.label}</span>
          </div>

          <div class="bg-slate-800 rounded-xl p-3 mb-3 text-xs text-slate-300 space-y-1">
            <div><b class="text-white">Paket:</b> ${esc(p.package_name)} (${p.credits} kredit)</div>
            <div><b class="text-white">Harga:</b> ${formatRupiah(p.price_idr)}</div>
            <div><b class="text-white">Metode:</b> ${esc(p.payment_method || '-')}</div>
            ${p.buyer_note ? `<div><b class="text-white">Catatan:</b> ${esc(p.buyer_note)}</div>` : ''}
          </div>

          ${p.status === 'pending' ? `
            <div class="flex gap-2">
              <button data-appr="${p.id}" class="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs">✓ Approve</button>
              <button data-rej="${p.id}" class="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 font-black text-xs">✗ Reject</button>
            </div>
          ` : ''}
        </div>`;
    }).join('');

    wrap.querySelectorAll('[data-appr]').forEach(b => b.addEventListener('click', () => reviewPurchase(b.dataset.appr, true)));
    wrap.querySelectorAll('[data-rej]').forEach(b => b.addEventListener('click', () => reviewPurchase(b.dataset.rej, false)));
  }

  async function reviewPurchase(pid, approve) {
    const note = approve ? null : (prompt('Alasan reject (opsional):') || 'Ditolak');
    const { error } = await sb.rpc('admin_review_purchase', {
      p_key: ADMIN_KEY(), p_purchase_id: pid, p_approve: approve, p_note: note
    });
    if (error) return toast(error.message, 'error');
    toast(approve ? '✅ Disetujui, kredit masuk!' : '❌ Ditolak', approve ? 'success' : 'info');
    loadAdminPurchases();
    loadAdminStats();
  }

  async function loadAdminSettings() {
    const { data } = await sb.from('app_settings').select('*');
    const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));
    $('adminSetPaymentInfo').value = map.payment_info || '';
    $('adminSetWelcomeCredits').value = map.welcome_credits || '3';
    $('adminSetAdminKey').value = map.admin_key || 'admin2256';
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.addEventListener('click', () => {
        const t = b.dataset.adminTab;
        document.querySelectorAll('.admin-tab-btn').forEach(x => {
          x.classList.toggle('bg-slate-900', x.dataset.adminTab === t);
          x.classList.toggle('text-white', x.dataset.adminTab === t);
          x.classList.toggle('text-slate-400', x.dataset.adminTab !== t);
        });
        document.querySelectorAll('.admin-tab-content').forEach(c => {
          c.classList.toggle('hidden', c.id !== 'adminTab' + t.charAt(0).toUpperCase() + t.slice(1));
        });
        if (t === 'users') loadAdminUsers();
        if (t === 'purchases') loadAdminPurchases();
        if (t === 'settings') loadAdminSettings();
      });
    });

    document.getElementById('btnAdminRefreshUsers')?.addEventListener('click', loadAdminUsers);
    document.getElementById('btnAdminRefreshPurchases')?.addEventListener('click', loadAdminPurchases);

    document.getElementById('btnAdminSaveSettings')?.addEventListener('click', async () => {
      const p = $('adminSetPaymentInfo').value;
      const w = $('adminSetWelcomeCredits').value;
      const k = $('adminSetAdminKey').value;
      try {
        await sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'payment_info', p_value: p });
        await sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'welcome_credits', p_value: w });
        await sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'admin_key', p_value: k });
        toast('Pengaturan disimpan ✅', 'success');
      } catch (e) {
        toast(e.message || 'Gagal', 'error');
      }
    });

    document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
      if (!confirm('Keluar dari admin panel?')) return;
      sessionStorage.removeItem('sf_admin_key');
      location.reload();
    });
  });

  App.initAdmin = async function() {
    await loadAdminStats();
    await loadAdminUsers();
    // Set first tab active
    const firstTab = document.querySelector('[data-admin-tab="users"]');
    if (firstTab) firstTab.click();
    icon();
  };
})();
