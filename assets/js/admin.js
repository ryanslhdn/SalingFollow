/* ============================================================
   ADMIN — Panel admin
   ============================================================ */

(function() {
  const { $, esc, toast, icon, formatRupiah, formatDateTime } = App;

  const ADMIN_KEY = () => sessionStorage.getItem('sf_admin_key');

  /* ---------- STATS ---------- */
  async function loadAdminStats() {
    const { data, error } = await sb.rpc('admin_stats', { p_key: ADMIN_KEY() });
    if (error) return console.error('[AdminStats]', error);

    $('adminTotalUsers').textContent = data.total_users;
    $('adminTotalCredits').textContent = data.total_credits;
    $('adminTotalClaims').textContent = data.total_claims;
    $('adminPendingPurchases').textContent = data.pending_purchases;
  }

  /* ---------- USERS ---------- */
  async function loadAdminUsers() {
    const wrap = $('adminUsersList');
    if (!wrap) return;

    wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('admin_list_users', { p_key: ADMIN_KEY() });

    if (error) {
      wrap.innerHTML = `
        <div class="info-box danger">
          <i data-lucide="alert-circle"></i>
          <span>${esc(error.message)}</span>
        </div>`;
      icon();
      return;
    }

    if (!data?.length) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:32px 24px">
          <div class="empty-icon" style="width:56px;height:56px">
            <i data-lucide="users" style="width:24px;height:24px"></i>
          </div>
          <p class="empty-desc">Belum ada user</p>
        </div>`;
      icon();
      return;
    }

    wrap.innerHTML = data.map((u, i) => `
      <div class="admin-card" style="padding:16px;margin-bottom:10px;animation:fadeUp .35s ease backwards;animation-delay:${i * 30}ms">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
          <div style="width:44px;height:44px;border-radius:12px;background:${u.is_banned ? '#ef4444' : '#10b981'};color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px;flex-shrink:0">
            ${esc((u.display_name || u.username || '?')[0].toUpperCase())}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${esc(u.display_name || u.username)}
            </div>
            <div style="font-size:12px;color:var(--ink-3);font-family:ui-monospace,monospace;margin-top:2px">
              @${esc(u.username)}
            </div>
            ${u.is_banned ? `
              <div style="display:inline-block;margin-top:6px;padding:3px 8px;border-radius:6px;background:#fef2f2;color:#b91c1c;font-size:10px;font-weight:700;letter-spacing:.04em">
                BANNED
              </div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:var(--ink-3);font-weight:600">Kredit</div>
            <div style="font-size:20px;font-weight:800;color:var(--green-600);letter-spacing:-.02em">${u.credits}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
          <div style="background:var(--surface-2);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Given</div>
            <div style="font-weight:700;font-size:14px;color:var(--ink);margin-top:2px">${u.total_follows_given}</div>
          </div>
          <div style="background:var(--surface-2);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Received</div>
            <div style="font-weight:700;font-size:14px;color:var(--ink);margin-top:2px">${u.total_follows_received}</div>
          </div>
          <div style="background:var(--surface-2);border-radius:8px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Akun</div>
            <div style="font-weight:700;font-size:14px;color:var(--ink);margin-top:2px">${u.accounts_count}</div>
          </div>
        </div>

        <div style="display:flex;gap:6px">
          <button data-add="${esc(u.id)}" style="flex:1;padding:9px;border-radius:9px;background:var(--green-50);color:var(--green-700);font-weight:700;font-size:12px;border:1px solid var(--green-100);font-family:inherit;cursor:pointer">
            + Kredit
          </button>
          <button data-rem="${esc(u.id)}" style="flex:1;padding:9px;border-radius:9px;background:var(--red-50);color:#b91c1c;font-weight:700;font-size:12px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">
            − Kredit
          </button>
          <button data-ban="${esc(u.id)}" data-banned="${u.is_banned}" style="padding:9px 14px;border-radius:9px;background:${u.is_banned ? 'var(--green-50)' : 'var(--red-50)'};color:${u.is_banned ? 'var(--green-700)' : '#b91c1c'};font-weight:700;font-size:12px;border:1px solid ${u.is_banned ? 'var(--green-100)' : '#fecaca'};font-family:inherit;cursor:pointer">
            ${u.is_banned ? 'Unban' : 'Ban'}
          </button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-add]').forEach(b =>
      b.addEventListener('click', () => adminAdjustCredits(b.dataset.add, +1)));
    wrap.querySelectorAll('[data-rem]').forEach(b =>
      b.addEventListener('click', () => adminAdjustCredits(b.dataset.rem, -1)));
    wrap.querySelectorAll('[data-ban]').forEach(b =>
      b.addEventListener('click', () => adminToggleBan(b.dataset.ban, b.dataset.banned === 'true')));

    icon();
  }

  async function adminAdjustCredits(userId, sign) {
    const amt = prompt(`Jumlah kredit (${sign > 0 ? 'tambah' : 'kurang'}):`, '10');
    if (!amt) return;
    const amount = Math.abs(Number(amt)) * sign;
    if (!amount || isNaN(amount)) return;

    const { error } = await sb.rpc('admin_add_credits', {
      p_key: ADMIN_KEY(),
      p_user_id: userId,
      p_amount: amount,
      p_reason: 'admin_manual',
    });

    if (error) return toast(error.message, 'error');

    toast(`Kredit ${sign > 0 ? '+' : ''}${amount}`, 'success');
    await Promise.all([loadAdminUsers(), loadAdminStats()]);
  }

  async function adminToggleBan(userId, currentlyBanned) {
    if (!confirm(currentlyBanned ? 'Unban user ini?' : 'Ban user ini?')) return;

    const { error } = await sb.rpc('admin_set_ban', {
      p_key: ADMIN_KEY(),
      p_user_id: userId,
      p_ban: !currentlyBanned,
    });

    if (error) return toast(error.message, 'error');

    toast(currentlyBanned ? 'User di-unban' : 'User di-ban', 'success');
    await Promise.all([loadAdminUsers(), loadAdminStats()]);
  }

  /* ---------- PURCHASES ---------- */
  async function loadAdminPurchases() {
    const wrap = $('adminPurchasesList');
    if (!wrap) return;

    wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('admin_list_purchases', { p_key: ADMIN_KEY() });

    if (error) {
      wrap.innerHTML = `
        <div class="info-box danger">
          <i data-lucide="alert-circle"></i>
          <span>${esc(error.message)}</span>
        </div>`;
      icon();
      return;
    }

    if (!data?.length) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:32px 24px">
          <div class="empty-icon" style="width:56px;height:56px">
            <i data-lucide="shopping-bag" style="width:24px;height:24px"></i>
          </div>
          <p class="empty-desc">Belum ada pembelian</p>
        </div>`;
      icon();
      return;
    }

    const stMap = {
      pending:  { label: 'Pending',  style: 'background:#fffbeb;color:#b45309' },
      approved: { label: 'Approved', style: 'background:#ecfdf5;color:#047857' },
      rejected: { label: 'Rejected', style: 'background:#fef2f2;color:#b91c1c' },
    };

    wrap.innerHTML = data.map((p, i) => {
      const st = stMap[p.status] || stMap.pending;
      return `
        <div class="admin-card" style="padding:16px;margin-bottom:10px;animation:fadeUp .35s ease backwards;animation-delay:${i * 30}ms">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;color:var(--ink)">
                ${esc(p.display_name || p.username)}
              </div>
              <div style="font-size:12px;color:var(--ink-3);font-family:ui-monospace,monospace;margin-top:2px">
                @${esc(p.username)}
              </div>
              <div style="font-size:12px;color:var(--ink-3);margin-top:4px">
                ${formatDateTime(p.created_at)}
              </div>
            </div>
            <span style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;${st.style}">
              ${st.label}
            </span>
          </div>

          <div style="background:var(--surface-2);border-radius:10px;padding:12px;font-size:12.5px;color:var(--ink-2);line-height:1.7;margin-bottom:12px">
            <div><b style="color:var(--ink)">Paket:</b> ${esc(p.package_name)} (${p.credits} kredit)</div>
            <div><b style="color:var(--ink)">Harga:</b> ${formatRupiah(p.price_idr)}</div>
            <div><b style="color:var(--ink)">Metode:</b> ${esc(p.payment_method || '-')}</div>
            ${p.buyer_note ? `<div><b style="color:var(--ink)">Catatan:</b> ${esc(p.buyer_note)}</div>` : ''}
          </div>

          ${p.status === 'pending' ? `
            <div style="display:flex;gap:6px">
              <button data-appr="${p.id}" style="flex:1;padding:10px;border-radius:9px;background:var(--green-500);color:#fff;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;border:none">
                Approve
              </button>
              <button data-rej="${p.id}" style="flex:1;padding:10px;border-radius:9px;background:var(--red-50);color:#b91c1c;font-weight:700;font-size:13px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">
                Reject
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    wrap.querySelectorAll('[data-appr]').forEach(b =>
      b.addEventListener('click', () => reviewPurchase(b.dataset.appr, true)));
    wrap.querySelectorAll('[data-rej]').forEach(b =>
      b.addEventListener('click', () => reviewPurchase(b.dataset.rej, false)));

    icon();
  }

  async function reviewPurchase(pid, approve) {
    let note = null;
    if (!approve) {
      note = prompt('Alasan reject (opsional):') || 'Ditolak';
    }

    const { error } = await sb.rpc('admin_review_purchase', {
      p_key: ADMIN_KEY(),
      p_purchase_id: pid,
      p_approve: approve,
      p_note: note,
    });

    if (error) return toast(error.message, 'error');

    toast(approve ? '✅ Disetujui, kredit masuk!' : '❌ Ditolak', approve ? 'success' : 'info');
    await Promise.all([loadAdminPurchases(), loadAdminStats()]);
  }

  /* ---------- SETTINGS ---------- */
  async function loadAdminSettings() {
    const { data } = await sb.from('app_settings').select('*');
    const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));

    const pi = $('adminSetPaymentInfo');
    const wc = $('adminSetWelcomeCredits');
    const ak = $('adminSetAdminKey');

    if (pi) pi.value = map.payment_info || '';
    if (wc) wc.value = map.welcome_credits || '3';
    if (ak) ak.value = map.admin_key || 'admin2256';
  }

  async function saveAdminSettings() {
    const btn = $('btnAdminSaveSettings');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';
    }

    try {
      const p = $('adminSetPaymentInfo').value;
      const w = $('adminSetWelcomeCredits').value;
      const k = $('adminSetAdminKey').value;

      const calls = [
        sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'payment_info',   p_value: p }),
        sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'welcome_credits', p_value: w }),
        sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'admin_key',      p_value: k }),
      ];

      const results = await Promise.all(calls);
      const failed = results.find(r => r.error);
      if (failed) throw failed.error;

      toast('Pengaturan disimpan ✅', 'success');
    } catch (e) {
      console.error(e);
      toast(e.message || 'Gagal menyimpan', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" style="width:16px;height:16px"></i> Simpan Pengaturan';
        icon();
      }
    }
  }

  /* ---------- TAB SWITCHING ---------- */
  function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.adminTab === tab);
    });
    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.toggle('hidden', c.id !== 'adminTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    });

    if (tab === 'users') loadAdminUsers();
    if (tab === 'purchases') loadAdminPurchases();
    if (tab === 'settings') loadAdminSettings();

    icon();
  }

  /* ---------- BINDING ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.addEventListener('click', () => switchAdminTab(b.dataset.adminTab));
    });

    $('btnAdminRefreshUsers')?.addEventListener('click', loadAdminUsers);
    $('btnAdminRefreshPurchases')?.addEventListener('click', loadAdminPurchases);
    $('btnAdminSaveSettings')?.addEventListener('click', saveAdminSettings);

    $('btnAdminLogout')?.addEventListener('click', () => {
      if (!confirm('Keluar dari admin panel?')) return;
      sessionStorage.removeItem('sf_admin_key');
      location.reload();
    });
  });

  /* ---------- INIT ---------- */
  App.initAdmin = async function() {
    await loadAdminStats();
    await loadAdminUsers();
    // Set default tab active
    switchAdminTab('users');
    icon();
  };
})();
