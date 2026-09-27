/* ============================================================
   ADMIN — Panel admin (dengan search, filter, hapus)
   ============================================================ */

(function() {
  const { $, esc, toast, icon, formatRupiah, formatDateTime, state } = App;

  const ADMIN_KEY = () => sessionStorage.getItem('sf_admin_key');

  state.adminUsersCache = state.adminUsersCache || [];
  state.adminPurchasesCache = state.adminPurchasesCache || [];
  state.adminUserQuery = state.adminUserQuery || '';
  state.adminPurchaseQuery = state.adminPurchaseQuery || '';
  state.adminPurchaseStatus = state.adminPurchaseStatus || '';

  /* ============================================================
     HELPER — hapus file dari storage
     ============================================================ */
  async function deleteProofFileFromStorage(proofUrl) {
    if (!proofUrl) return;
    try {
      const match = proofUrl.match(/\/payment-proofs\/(.+)$/);
      if (!match) return;
      const path = decodeURIComponent(match[1]);
      const { error } = await sb.storage.from('payment-proofs').remove([path]);
      if (error) console.warn('[Storage delete]', error);
    } catch (e) {
      console.warn('[Storage delete exception]', e);
    }
  }

  /* ============================================================
     STATS
     ============================================================ */
  async function loadAdminStats() {
    const { data, error } = await sb.rpc('admin_stats', { p_key: ADMIN_KEY() });
    if (error) return console.error('[AdminStats]', error);

    $('adminTotalUsers').textContent = data.total_users;
    $('adminTotalCredits').textContent = data.total_credits;
    $('adminTotalClaims').textContent = data.total_claims;
    $('adminPendingPurchases').textContent = data.pending_purchases;
  }

  /* ============================================================
     USERS — load & filter
     ============================================================ */
  async function loadAdminUsers() {
    const wrap = $('adminUsersList');
    if (!wrap) return;

    wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('admin_list_users', { p_key: ADMIN_KEY() });

    if (error) {
      wrap.innerHTML = `<div class="info-box danger"><i data-lucide="alert-circle"></i><span>${esc(error.message)}</span></div>`;
      icon();
      return;
    }

    state.adminUsersCache = data || [];
    renderAdminUsers();
  }

  function renderAdminUsers() {
    const wrap = $('adminUsersList');
    if (!wrap) return;

    let rows = state.adminUsersCache;
    const q = state.adminUserQuery.trim().toLowerCase();

    if (q) {
      rows = rows.filter(u =>
        (u.display_name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
      );
    }

    if (!rows.length) {
      wrap.innerHTML = `
        <div class="empty-state" style="padding:32px 24px">
          <div class="empty-icon" style="width:56px;height:56px">
            <i data-lucide="search-x" style="width:24px;height:24px"></i>
          </div>
          <p class="empty-desc">${q ? 'Tidak ditemukan' : 'Belum ada user'}</p>
        </div>`;
      icon();
      return;
    }

    wrap.innerHTML = rows.map((u, i) => {
      const rejectRate = Number(u.reject_rate) || 0;
      const rejectPercent = Math.round(rejectRate * 100);
      const isRisky = rejectRate >= 0.5 && (u.claims_rejected || 0) >= 5;
      const isBanned = u.is_banned;

      return `
        <div class="admin-card" style="padding:16px;margin-bottom:10px;animation:fadeUp .35s ease backwards;animation-delay:${i * 30}ms;${isRisky ? 'border-color:#fecaca' : ''}">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div style="width:44px;height:44px;border-radius:12px;background:${isBanned ? '#ef4444' : isRisky ? '#f59e0b' : '#10b981'};color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px;flex-shrink:0">
              ${esc((u.display_name || u.username || '?')[0].toUpperCase())}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${esc(u.display_name || u.username)}
              </div>
              <div style="font-size:12px;color:var(--ink-3);font-family:ui-monospace,monospace;margin-top:2px">
                @${esc(u.username)}
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
                ${isBanned ? `<span style="padding:3px 8px;border-radius:6px;background:#fef2f2;color:#b91c1c;font-size:10px;font-weight:700">BANNED</span>` : ''}
                ${isRisky && !isBanned ? `<span style="padding:3px 8px;border-radius:6px;background:#fef3c7;color:#b45309;font-size:10px;font-weight:700">⚠ REJECT ${rejectPercent}%</span>` : ''}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:11px;color:var(--ink-3);font-weight:600">Kredit</div>
              <div style="font-size:20px;font-weight:800;color:var(--green-600);letter-spacing:-.02em">${u.credits}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">
            <div style="background:var(--surface-2);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:9.5px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Given</div>
              <div style="font-weight:700;font-size:13px;color:var(--ink);margin-top:2px">${u.total_follows_given}</div>
            </div>
            <div style="background:var(--surface-2);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:9.5px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Received</div>
              <div style="font-weight:700;font-size:13px;color:var(--ink);margin-top:2px">${u.total_follows_received}</div>
            </div>
            <div style="background:var(--surface-2);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:9.5px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Approved</div>
              <div style="font-weight:700;font-size:13px;color:var(--green-600);margin-top:2px">${u.claims_approved || 0}</div>
            </div>
            <div style="background:var(--surface-2);border-radius:8px;padding:8px;text-align:center">
              <div style="font-size:9.5px;color:var(--ink-3);font-weight:600;letter-spacing:.04em;text-transform:uppercase">Rejected</div>
              <div style="font-weight:700;font-size:13px;color:${(u.claims_rejected || 0) > 0 ? '#b91c1c' : 'var(--ink)'};margin-top:2px">${u.claims_rejected || 0}</div>
            </div>
          </div>

          <div style="display:flex;gap:6px">
            <button data-add="${esc(u.id)}" style="flex:1;padding:9px;border-radius:9px;background:var(--green-50);color:var(--green-700);font-weight:700;font-size:12px;border:1px solid var(--green-100);font-family:inherit;cursor:pointer">+ Kredit</button>
            <button data-rem="${esc(u.id)}" style="flex:1;padding:9px;border-radius:9px;background:var(--red-50);color:#b91c1c;font-weight:700;font-size:12px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">− Kredit</button>
            <button data-ban="${esc(u.id)}" data-banned="${u.is_banned}" style="padding:9px 14px;border-radius:9px;background:${u.is_banned ? 'var(--green-50)' : 'var(--red-50)'};color:${u.is_banned ? 'var(--green-700)' : '#b91c1c'};font-weight:700;font-size:12px;border:1px solid ${u.is_banned ? 'var(--green-100)' : '#fecaca'};font-family:inherit;cursor:pointer">
              ${u.is_banned ? 'Unban' : 'Ban'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    wrap.querySelectorAll('[data-add]').forEach(b =>
      b.addEventListener('click', () => adminAdjustCredits(b.dataset.add, +1)));
    wrap.querySelectorAll('[data-rem]').forEach(b =>
      b.addEventListener('click', () => adminAdjustCredits(b.dataset.rem, -1)));
    wrap.querySelectorAll('[data-ban]').forEach(b =>
      b.addEventListener('click', () => adminToggleBan(b.dataset.ban, b.dataset.banned === 'true')));

    icon();
  }

  /* ---------- ADJUST CREDIT ---------- */
  async function adminAdjustCredits(userId, sign) {
    const user = state.adminUsersCache.find(u => u.id === userId);
    const uname = user ? `@${user.username}` : 'user ini';

    const ok = await App.confirm({
      title: sign > 0 ? 'Tambah Kredit' : 'Kurangi Kredit',
      desc: sign > 0
        ? `Jumlah kredit yang akan ditambahkan ke ${uname}.`
        : `Jumlah kredit yang akan dikurangi dari ${uname}.`,
      okText: 'Lanjut',
      cancelText: 'Batal',
      danger: sign < 0,
      icon: sign > 0 ? 'plus-circle' : 'minus-circle'
    });
    if (!ok) return;

    const amt = await App.prompt({
      title: sign > 0 ? 'Tambah Kredit' : 'Kurangi Kredit',
      desc: `Kredit untuk ${uname}`,
      placeholder: '10',
      defaultValue: '10',
      type: 'number',
      okText: 'Lanjut',
      icon: 'coins'
    });
    if (!amt) return;

    const amount = Math.abs(Number(amt)) * sign;
    if (!amount || isNaN(amount)) return toast('Jumlah tidak valid', 'error');

    const { error } = await sb.rpc('admin_add_credits', {
      p_key: ADMIN_KEY(),
      p_user_id: userId,
      p_amount: amount,
      p_reason: 'admin_manual',
    });

    if (error) return toast(error.message, 'error');

    toast(`Kredit ${sign > 0 ? '+' : ''}${amount} ke ${uname}`, 'success');
    await Promise.all([loadAdminUsers(), loadAdminStats()]);
  }

  /* ---------- TOGGLE BAN ---------- */
  async function adminToggleBan(userId, currentlyBanned) {
    const user = state.adminUsersCache.find(u => u.id === userId);
    const uname = user ? `@${user.username}` : 'user ini';

    const ok = await App.confirm({
      title: currentlyBanned ? `Unban ${uname}?` : `Ban ${uname}?`,
      desc: currentlyBanned
        ? 'User akan bisa aktif kembali di sistem.'
        : 'User tidak akan bisa ikut aktivitas apapun.',
      okText: currentlyBanned ? 'Ya, Unban' : 'Ya, Ban',
      cancelText: 'Batal',
      danger: !currentlyBanned,
      icon: currentlyBanned ? 'check-circle' : 'ban'
    });
    if (!ok) return;

    const { error } = await sb.rpc('admin_set_ban', {
      p_key: ADMIN_KEY(),
      p_user_id: userId,
      p_ban: !currentlyBanned,
    });

    if (error) return toast(error.message, 'error');

    toast(currentlyBanned ? 'User di-unban' : 'User di-ban', 'success');
    await Promise.all([loadAdminUsers(), loadAdminStats()]);
  }

  /* ============================================================
     PURCHASES — load & filter
     ============================================================ */
  async function loadAdminPurchases() {
    const wrap = $('adminPurchasesList');
    if (!wrap) return;

    wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('admin_list_purchases', { p_key: ADMIN_KEY() });

    if (error) {
      wrap.innerHTML = `<div class="info-box danger"><i data-lucide="alert-circle"></i><span>${esc(error.message)}</span></div>`;
      icon();
      return;
    }

    state.adminPurchasesCache = data || [];
    renderAdminPurchases();
  }

  function renderAdminPurchases() {
    const wrap = $('adminPurchasesList');
    if (!wrap) return;

    let rows = state.adminPurchasesCache;
    const q = state.adminPurchaseQuery.trim().toLowerCase();
    const st = state.adminPurchaseStatus;

    if (st) rows = rows.filter(p => p.status === st);

    if (q) {
      rows = rows.filter(p =>
        (p.display_name || '').toLowerCase().includes(q) ||
        (p.username || '').toLowerCase().includes(q) ||
        (p.package_name || '').toLowerCase().includes(q) ||
        (p.buyer_note || '').toLowerCase().includes(q)
      );
    }

    const counts = {
      all:           state.adminPurchasesCache.length,
      pending:       state.adminPurchasesCache.filter(p => p.status === 'pending').length,
      approved:      state.adminPurchasesCache.filter(p => p.status === 'approved').length,
      rejected:      state.adminPurchasesCache.filter(p => p.status === 'rejected').length,
      need_reupload: state.adminPurchasesCache.filter(p => p.status === 'need_reupload').length,
    };

    const filterWrap = $('adminPurchaseFilter');
    if (filterWrap) {
      filterWrap.querySelectorAll('[data-status]').forEach(b => {
        const s = b.dataset.status;
        const isActive = s === st;
        const label = s === '' ? 'Semua' :
                      s === 'pending' ? 'Pending' :
                      s === 'need_reupload' ? 'Upload Ulang' :
                      s === 'approved' ? 'Approved' :
                      s === 'rejected' ? 'Rejected' : s;
        const count = counts[s] !== undefined ? counts[s] : 0;
        b.textContent = `${label} (${count})`;
        b.style.background = isActive ? 'linear-gradient(135deg,#10b981,#059669)' : '#fff';
        b.style.color = isActive ? '#fff' : 'var(--ink-2)';
        b.style.borderColor = isActive ? 'transparent' : 'var(--line)';
      });
    }

    if (!rows.length) {
      const msg = q
        ? `Tidak ada yang cocok dengan "${esc(q)}"`
        : st
          ? `Tidak ada pembelian dengan status "${esc(st)}"`
          : 'Belum ada pembelian';
      wrap.innerHTML = `
        <div class="empty-state" style="padding:32px 24px">
          <div class="empty-icon" style="width:56px;height:56px">
            <i data-lucide="search-x" style="width:24px;height:24px"></i>
          </div>
          <p class="empty-desc">${msg}</p>
        </div>`;
      icon();
      return;
    }

    const stMap = {
      pending:       { label: 'Pending',            style: 'background:#fffbeb;color:#b45309' },
      approved:      { label: 'Approved',           style: 'background:#ecfdf5;color:#047857' },
      rejected:      { label: 'Rejected',           style: 'background:#fef2f2;color:#b91c1c' },
      need_reupload: { label: 'Minta Upload Ulang', style: 'background:#dbeafe;color:#1e40af' },
    };

    let toolbar = '';
    if (counts.approved > 0 || counts.rejected > 0) {
      toolbar = `
        <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;padding:12px;background:var(--surface-2);border-radius:10px">
          <div style="flex:1;min-width:100%;font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:4px">
            Hapus massal:
          </div>
          ${counts.approved > 0 ? `
            <button data-bulk="approved" style="flex:1;min-width:100px;padding:9px;border-radius:9px;background:#ecfdf5;color:#047857;font-weight:700;font-size:12px;border:1px solid #a7f3d0;font-family:inherit;cursor:pointer">
              Hapus Approved (${counts.approved})
            </button>
          ` : ''}
          ${counts.rejected > 0 ? `
            <button data-bulk="rejected" style="flex:1;min-width:100px;padding:9px;border-radius:9px;background:#fef2f2;color:#b91c1c;font-weight:700;font-size:12px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">
              Hapus Rejected (${counts.rejected})
            </button>
          ` : ''}
        </div>
      `;
    }

    const cards = rows.map((p, i) => {
      const stObj = stMap[p.status] || stMap.pending;

      const proofHtml = p.proof_url ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-bottom:6px">
            Bukti Transfer
          </div>
          <img src="${esc(p.proof_url)}"
               style="width:100%;max-height:280px;object-fit:contain;border-radius:10px;border:1px solid var(--line);background:#fff;cursor:pointer"
               onclick="window.open('${esc(p.proof_url)}','_blank')"
               alt="Bukti Transfer">
        </div>
      ` : `
        <div class="info-box warn" style="margin-top:10px;font-size:11.5px">
          <i data-lucide="alert-circle"></i>
          <span>Bukti transfer tidak diupload</span>
        </div>
      `;

      const adminNoteHtml = p.admin_note ? `
        <div style="margin-top:12px;padding:12px 14px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe">
          <div style="font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1e40af;margin-bottom:4px">
            Pesan Admin
          </div>
          <div style="font-size:12.5px;color:#1e3a8a;line-height:1.5">${esc(p.admin_note)}</div>
        </div>
      ` : '';

      let actionsHtml = '';
      if (p.status === 'pending' || p.status === 'need_reupload') {
        actionsHtml = `
          <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">
            <button data-appr="${p.id}" style="flex:1;min-width:80px;padding:10px;border-radius:9px;background:var(--green-500);color:#fff;font-weight:700;font-size:12.5px;font-family:inherit;cursor:pointer;border:none">
              <i data-lucide="check" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:3px"></i> Approve
            </button>
            <button data-reupload="${p.id}" style="flex:1;min-width:80px;padding:10px;border-radius:9px;background:#dbeafe;color:#1e40af;font-weight:700;font-size:12.5px;border:1px solid #bfdbfe;font-family:inherit;cursor:pointer">
              <i data-lucide="upload" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:3px"></i> Minta Ulang
            </button>
            <button data-rej="${p.id}" style="flex:1;min-width:70px;padding:10px;border-radius:9px;background:var(--red-50);color:#b91c1c;font-weight:700;font-size:12.5px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">
              <i data-lucide="x" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:3px"></i> Tolak
            </button>
          </div>
        `;
      }

      actionsHtml += `
        <div style="margin-top:8px">
          <button data-del="${p.id}" style="width:100%;padding:9px;border-radius:9px;background:transparent;color:#b91c1c;font-weight:700;font-size:12px;border:1px dashed #fecaca;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">
            <i data-lucide="trash-2" style="width:13px;height:13px"></i> Hapus Permanen
          </button>
        </div>
      `;

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
            <span style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;${stObj.style}">
              ${stObj.label}
            </span>
          </div>

          <div style="background:var(--surface-2);border-radius:10px;padding:12px;font-size:12.5px;color:var(--ink-2);line-height:1.7">
            <div><b style="color:var(--ink)">Paket:</b> ${esc(p.package_name)} (${p.credits} kredit)</div>
            <div><b style="color:var(--ink)">Harga:</b> ${formatRupiah(p.price_idr)}</div>
            <div><b style="color:var(--ink)">Metode:</b> ${esc(p.payment_method || '-')}</div>
            ${p.buyer_note ? `<div><b style="color:var(--ink)">Catatan:</b> ${esc(p.buyer_note)}</div>` : ''}
          </div>

          ${proofHtml}
          ${adminNoteHtml}
          ${actionsHtml}
        </div>
      `;
    }).join('');

    wrap.innerHTML = toolbar + cards;

    wrap.querySelectorAll('[data-appr]').forEach(b =>
      b.addEventListener('click', () => reviewPurchase(b.dataset.appr, true)));
    wrap.querySelectorAll('[data-rej]').forEach(b =>
      b.addEventListener('click', () => reviewPurchase(b.dataset.rej, false)));
    wrap.querySelectorAll('[data-reupload]').forEach(b =>
      b.addEventListener('click', () => requestReupload(b.dataset.reupload)));
    wrap.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => deletePurchase(b.dataset.del)));
    wrap.querySelectorAll('[data-bulk]').forEach(b =>
      b.addEventListener('click', () => bulkDelete(b.dataset.bulk)));

    icon();
  }

  /* ---------- REVIEW PURCHASE ---------- */
  async function reviewPurchase(pid, approve) {
    let note = null;

    if (!approve) {
      const ok = await App.confirm({
        title: 'Tolak pembelian ini?',
        desc: 'Kredit tidak akan diberikan ke user.',
        okText: 'Ya, Tolak',
        cancelText: 'Batal',
        danger: true,
        icon: 'x-circle'
      });
      if (!ok) return;
      note = 'Ditolak';
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

  /* ---------- REQUEST REUPLOAD ---------- */
  async function requestReupload(pid) {
    const msg = await App.prompt({
      title: 'Minta Bukti Ulang',
      desc: 'Tulis pesan untuk user — kenapa bukti perlu diupload ulang',
      placeholder: 'Contoh: Bukti terlalu buram, mohon upload ulang yang lebih jelas',
      type: 'textarea',
      okText: 'Kirim Permintaan',
      icon: 'upload'
    });
    if (!msg) return;

    const { error } = await sb.rpc('admin_request_reupload', {
      p_key: ADMIN_KEY(),
      p_purchase_id: pid,
      p_message: msg,
    });

    if (error) return toast(error.message, 'error');

    toast('Permintaan terkirim ke user', 'success');
    await Promise.all([loadAdminPurchases(), loadAdminStats()]);
  }

  /* ---------- DELETE SINGLE ---------- */
  async function deletePurchase(pid) {
    const ok = await App.confirm({
      title: 'Hapus Pembelian Ini?',
      desc: 'Data pembelian dan file bukti transfer akan dihapus permanen.',
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
      icon: 'trash-2'
    });
    if (!ok) return;

    try {
      const { data, error } = await sb.rpc('admin_delete_purchase', {
        p_key: ADMIN_KEY(),
        p_purchase_id: pid,
      });
      if (error) throw error;

      if (data?.proof_url) await deleteProofFileFromStorage(data.proof_url);

      toast('Pembelian dihapus', 'success');
      await Promise.all([loadAdminPurchases(), loadAdminStats()]);
    } catch (e) {
      console.error('[Delete purchase]', e);
      toast(e.message || 'Gagal menghapus', 'error');
    }
  }

  /* ---------- BULK DELETE ---------- */
  async function bulkDelete(status) {
    const label = status === 'approved' ? 'Approved' : 'Rejected';
    const ok = await App.confirm({
      title: `Hapus Semua ${label}?`,
      desc: `Semua pembelian dengan status "${label}" akan dihapus permanen beserta file buktinya.`,
      okText: 'Ya, Hapus Semua',
      cancelText: 'Batal',
      danger: true,
      icon: 'trash-2'
    });
    if (!ok) return;

    try {
      const { data, error } = await sb.rpc('admin_clear_purchases', {
        p_key: ADMIN_KEY(),
        p_status: status,
      });
      if (error) throw error;

      const urls = data?.urls || [];
      if (urls.length > 0) {
        toast(`Menghapus ${urls.length} file bukti...`, 'info', 2000);
        for (const url of urls) await deleteProofFileFromStorage(url);
      }

      toast(`${data?.deleted || 0} pembelian ${label} dihapus`, 'success');
      await Promise.all([loadAdminPurchases(), loadAdminStats()]);
    } catch (e) {
      console.error('[Bulk delete]', e);
      toast(e.message || 'Gagal menghapus', 'error');
    }
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
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
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

    try {
      const p = $('adminSetPaymentInfo').value;
      const w = $('adminSetWelcomeCredits').value;
      const k = $('adminSetAdminKey').value;

      const calls = [
        sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'payment_info',    p_value: p }),
        sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'welcome_credits', p_value: w }),
        sb.rpc('admin_update_setting', { p_key: ADMIN_KEY(), p_setting_key: 'admin_key',       p_value: k }),
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

  /* ============================================================
     TAB SWITCHING
     ============================================================ */
  function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.adminTab === tab);
    });

    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.toggle('hidden', c.id !== 'adminTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    });

    if (tab === 'users')     loadAdminUsers();
    if (tab === 'purchases') loadAdminPurchases();
    if (tab === 'store')     window.AdminStore && window.AdminStore.load();
    if (tab === 'settings')  loadAdminSettings();

    icon();
  }

  /* ============================================================
     BINDING — search & filter
     ============================================================ */
  function bindSearchAndFilter() {
    const userSearch = $('adminUserSearch');
    if (userSearch) {
      userSearch.addEventListener('input', (e) => {
        state.adminUserQuery = e.target.value;
        renderAdminUsers();
      });
    }

    const purchaseSearch = $('adminPurchaseSearch');
    if (purchaseSearch) {
      purchaseSearch.addEventListener('input', (e) => {
        state.adminPurchaseQuery = e.target.value;
        renderAdminPurchases();
      });
    }

    const filterWrap = $('adminPurchaseFilter');
    if (filterWrap) {
      filterWrap.querySelectorAll('[data-status]').forEach(b => {
        b.addEventListener('click', () => {
          state.adminPurchaseStatus = b.dataset.status;
          renderAdminPurchases();
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.addEventListener('click', () => switchAdminTab(b.dataset.adminTab));
    });

    $('btnAdminRefreshUsers')?.addEventListener('click', loadAdminUsers);
    $('btnAdminRefreshPurchases')?.addEventListener('click', loadAdminPurchases);
    $('btnAdminSaveSettings')?.addEventListener('click', saveAdminSettings);

    $('btnAdminLogout')?.addEventListener('click', async () => {
      const ok = await App.confirm({
        title: 'Keluar dari admin?',
        desc: 'Kamu akan keluar dari panel admin.',
        okText: 'Ya, Keluar',
        cancelText: 'Batal',
        danger: true,
        icon: 'log-out'
      });
      if (!ok) return;
      sessionStorage.removeItem('sf_admin_key');
      location.reload();
    });

    bindSearchAndFilter();
  });

  /* ============================================================
     INIT
     ============================================================ */
  App.initAdmin = async function() {
    await loadAdminStats();
    await loadAdminUsers();
    switchAdminTab('users');
    icon();
  };

})();
