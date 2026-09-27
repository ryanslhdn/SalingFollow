/* ============================================================
   TARGETS — Akun target + Request follower
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, PLATFORMS, state } = App;

  // State lokal
  state.selectedTargetPlatform = 'instagram';
  state.currentRequestTarget = null;

  /* ============================================================
     LOAD TARGETS
     ============================================================ */
  async function loadTargets() {
    const list = $('targetAccountsList');
    const empty = $('targetAccountsEmpty');
    if (!list) return;

    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    const { data, error } = await sb.rpc('my_target_accounts');

    if (error) {
      console.error('[Targets]', error);
      list.innerHTML = `
        <div class="info-box danger">
          <i data-lucide="alert-circle"></i>
          <span>Gagal memuat: ${esc(error.message)}</span>
        </div>`;
      icon();
      return;
    }

    const targets = data || [];

    if (!targets.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      loadRequests();
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = targets.map((t, i) => renderTargetCard(t, i)).join('');

    list.querySelectorAll('[data-request-target]').forEach(b => {
      b.addEventListener('click', () => openRequest(b.dataset.requestTarget));
    });

    list.querySelectorAll('[data-delete-target]').forEach(b => {
      b.addEventListener('click', () => deleteTarget(b.dataset.deleteTarget));
    });

    icon();

    // Load riwayat request juga
    await loadRequests();
  }

  /* ============================================================
     RENDER TARGET CARD
     ============================================================ */
  function renderTargetCard(t, index) {
    const p = PLATFORMS[t.platform] || { name: t.platform, icon: 'globe', color: '#64748b' };
    const hasActive = !!t.active_request_id;
    const remaining = t.active_remaining || 0;
    const total = t.active_quantity || 0;
    const filled = total - remaining;
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

    // Progress bar kalau ada request aktif
    const progressHtml = hasActive ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:6px">
          <span>Progress Request</span>
          <span><b style="color:var(--green-600)">${filled}</b> / ${total}</span>
        </div>
        <div style="height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden">
          <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,var(--green-500),var(--green-600));border-radius:3px;transition:width .4s"></div>
        </div>
        <div style="font-size:11px;color:var(--ink-3);margin-top:6px">
          ${remaining} follower lagi menunggu di-follow user lain
        </div>
      </div>
    ` : '';

    const actionsHtml = hasActive
      ? `
        <a href="${esc(t.profile_url)}" target="_blank" rel="noopener" class="acc-btn ghost">
          <i data-lucide="external-link"></i> Buka
        </a>
        <button disabled class="acc-btn ghost" style="opacity:.6;cursor:not-allowed">
          <i data-lucide="clock"></i> Request Aktif
        </button>
      `
      : `
        <a href="${esc(t.profile_url)}" target="_blank" rel="noopener" class="acc-btn ghost">
          <i data-lucide="external-link"></i> Buka
        </a>
        <button data-request-target="${esc(t.id)}" class="acc-btn boost" style="background:var(--green-50);color:var(--green-700);border-color:var(--green-100)">
          <i data-lucide="user-plus"></i> Minta Follower
        </button>
      `;

    return `
      <div class="account-card" style="animation-delay:${index * 40}ms">
        <div class="acc-head">
          <div class="acc-avatar" style="background:${p.color}">
            <i data-lucide="${p.icon}"></i>
          </div>
          <div class="acc-info">
            <div class="acc-username">@${esc(t.username)}</div>
            <div class="acc-boost-label">${p.name}</div>
          </div>
          <button data-delete-target="${esc(t.id)}" class="acc-del" title="Hapus akun">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
        <div class="acc-actions">${actionsHtml}</div>
        ${progressHtml}
      </div>
    `;
  }

  /* ============================================================
     LOAD MY REQUESTS
     ============================================================ */
  async function loadRequests() {
    const list = $('requestsList');
    const empty = $('requestsEmpty');
    if (!list) return;

    const { data, error } = await sb.rpc('my_follow_requests');

    if (error) {
      console.error('[Requests]', error);
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }

    const rows = data || [];

    if (!rows.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    const stMap = {
      active:    { label: 'Aktif',     cls: 'background:#dbeafe;color:#1e40af' },
      filled:    { label: 'Selesai',   cls: 'background:#ecfdf5;color:#047857' },
      cancelled: { label: 'Dibatalkan', cls: 'background:#fef2f2;color:#b91c1c' },
    };

    list.innerHTML = rows.map((r, i) => {
      const p = PLATFORMS[r.target_platform] || { name: r.target_platform, icon: 'globe', color: '#64748b' };
      const st = stMap[r.status] || stMap.active;
      const percent = r.quantity > 0 ? Math.round((r.filled / r.quantity) * 100) : 0;

      return `
        <div class="history-item" style="animation-delay:${i * 30}ms;flex-direction:column;align-items:stretch;gap:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="hi-avatar" style="background:${p.color}">
              <i data-lucide="${p.icon}"></i>
            </div>
            <div class="hi-body">
              <div class="hi-username">@${esc(r.target_username)}</div>
              <div class="hi-date">${App.formatDateTime(r.created_at)}</div>
            </div>
            <div class="hi-right">
              <span class="hi-status ${r.status === 'filled' ? 'success' : r.status === 'cancelled' ? 'danger' : 'pending'}" style="${st.cls};border:none">${st.label}</span>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-3);font-weight:600;margin-bottom:5px">
              <span>${r.filled} / ${r.quantity} follower didapat</span>
              <span>${percent}%</span>
            </div>
            <div style="height:5px;border-radius:3px;background:var(--surface-2);overflow:hidden">
              <div style="height:100%;width:${percent}%;background:linear-gradient(90deg,var(--green-500),var(--green-600));border-radius:3px"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    icon();
  }

  /* ============================================================
     ADD TARGET MODAL
     ============================================================ */
  function renderTargetPlatformGrid() {
    const grid = $('targetPlatformGrid');
    if (!grid) return;

    grid.innerHTML = Object.entries(PLATFORMS).map(([id, p]) => `
      <button data-plat="${id}" class="platBtn ${state.selectedTargetPlatform === id ? 'active' : ''}">
        <div style="width:32px;height:32px;margin:0 auto;border-radius:9px;display:grid;place-items:center;background:${p.color}">
          <i data-lucide="${p.icon}" style="width:16px;height:16px;color:#fff"></i>
        </div>
        <div style="font-size:8.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-top:6px;color:var(--ink-3)">
          ${p.name}
        </div>
      </button>
    `).join('');

    grid.querySelectorAll('.platBtn').forEach(b => {
      b.addEventListener('click', () => {
        state.selectedTargetPlatform = b.dataset.plat;
        renderTargetPlatformGrid();
        const u = $('targetUsername').value.trim().replace(/^@/, '');
        const p = PLATFORMS[state.selectedTargetPlatform];
        if (u && p) $('targetUrl').value = p.url(u);
        icon();
      });
    });

    icon();
  }

  function openAddTarget() {
    state.selectedTargetPlatform = 'instagram';
    const u = $('targetUsername');
    const url = $('targetUrl');
    if (u) u.value = '';
    if (url) { url.value = ''; delete url.dataset.manuallyEdited; }
    clearStatus('addTargetStatus');
    renderTargetPlatformGrid();
    openModal('modalAddTarget');
    setTimeout(() => $('targetUsername')?.focus(), 200);
  }

  async function saveTarget() {
    const username = $('targetUsername').value.trim().replace(/^@/, '');
    const url = $('targetUrl').value.trim();

    if (!username) return status('addTargetStatus', 'error', 'Username wajib diisi');
    if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) return status('addTargetStatus', 'error', 'Username tidak valid');
    if (!/^https?:\/\//.test(url)) return status('addTargetStatus', 'error', 'Link harus diawali http:// atau https://');

    const btn = $('btnSaveTarget');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    status('addTargetStatus', 'warn', 'Menyimpan...');

    try {
      const { error } = await sb.from('social_accounts').insert({
        user_id: state.user.id,
        platform: state.selectedTargetPlatform,
        username,
        profile_url: url,
        account_type: 'target',
      });
      if (error) throw error;

      const p = PLATFORMS[state.selectedTargetPlatform];
      toast(`Akun target ${p.name} @${username} didaftarkan ✅`, 'success', 3000);
      closeModal('modalAddTarget');
      await loadTargets();
    } catch (e) {
      console.error('[SaveTarget]', e);
      status('addTargetStatus', 'error', e.message || 'Gagal menyimpan');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Akun Target'; }
    }
  }

  /* ============================================================
     DELETE TARGET
     ============================================================ */
  async function deleteTarget(id) {
    if (!confirm('Hapus akun target ini? Request aktif (kalau ada) juga akan dihapus.')) return;

    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');

    toast('Akun target dihapus', 'success');
    await loadTargets();
  }

  /* ============================================================
     REQUEST FOLLOWER
     ============================================================ */
  function openRequest(targetId) {
    // Cari target di list
    const card = document.querySelector(`[data-request-target="${targetId}"]`);
    if (!card) return;

    state.currentRequestTarget = targetId;

    // Ambil info target dari DOM (fallback)
    const cardEl = card.closest('.account-card');
    const usernameEl = cardEl?.querySelector('.acc-username');
    const username = usernameEl ? usernameEl.textContent : '@—';

    const nameEl = $('requestTargetName');
    if (nameEl) nameEl.textContent = username;

    // Reset
    const qtyEl = $('requestQuantity');
    if (qtyEl) qtyEl.value = 10;
    clearStatus('requestStatus');
    updateRequestCost();

    openModal('modalRequest');
    setTimeout(() => qtyEl?.focus(), 200);
  }

  function updateRequestCost() {
    const qty = Number($('requestQuantity')?.value) || 0;
    const credits = state.profile?.credits ?? 0;

    const costEl = $('requestCost');
    const credEl = $('requestMyCredits');
    if (costEl) costEl.textContent = qty + ' kredit';
    if (credEl) {
      credEl.textContent = credits + ' kredit';
      credEl.style.color = credits < qty ? '#ef4444' : 'var(--green-600)';
    }
  }

  async function submitRequest() {
    const qty = Number($('requestQuantity')?.value) || 0;
    const targetId = state.currentRequestTarget;

    if (!targetId) return;
    if (qty < 1) return status('requestStatus', 'error', 'Minimal 1 follower');
    if (qty > 1000) return status('requestStatus', 'error', 'Maksimal 1000 follower');

    const credits = state.profile?.credits ?? 0;
    if (credits < qty) {
      return status('requestStatus', 'error', `Kredit kurang. Butuh ${qty}, kamu punya ${credits}`);
    }

    const btn = $('btnConfirmRequest');
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
    status('requestStatus', 'warn', 'Membuat request...');

    try {
      const { data, error } = await sb.rpc('create_follow_request', {
        p_target_id: targetId,
        p_quantity: qty,
      });
      if (error) throw error;

      toast(`Request dibuat! ${qty} kredit dipotong`, 'success', 4000);
      closeModal('modalRequest');

      await Promise.all([
        loadTargets(),
        App.loadProfile ? App.loadProfile() : Promise.resolve(),
        App.loadFeed ? App.loadFeed() : Promise.resolve(),
      ]);
    } catch (e) {
      console.error('[SubmitRequest]', e);
      status('requestStatus', 'error', e.message || 'Gagal membuat request');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px"></i> Konfirmasi';
        icon();
      }
    }
  }

  /* ============================================================
     BINDING
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    // Add target modal
    $('btnAddTarget')?.addEventListener('click', openAddTarget);
    $('btnSaveTarget')?.addEventListener('click', saveTarget);

    // Auto-fill URL target
    $('targetUsername')?.addEventListener('input', (e) => {
      const u = e.target.value.trim().replace(/^@/, '');
      const p = PLATFORMS[state.selectedTargetPlatform];
      const urlInput = $('targetUrl');
      if (u && p && urlInput && !urlInput.dataset.manuallyEdited) {
        urlInput.value = p.url(u);
      }
    });
    $('targetUrl')?.addEventListener('input', () => {
      const urlInput = $('targetUrl');
      if (urlInput) urlInput.dataset.manuallyEdited = '1';
    });
    $('targetUsername')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('targetUrl')?.focus(); }
    });
    $('targetUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveTarget(); }
    });

    // Request modal
    $('requestQuantity')?.addEventListener('input', updateRequestCost);
    $('btnConfirmRequest')?.addEventListener('click', submitRequest);

    // Refresh tombol
    $('btnRefreshRequests')?.addEventListener('click', () => loadTargets());
  });

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadTargets = loadTargets;
  App.loadRequests = loadRequests;
  App.openAddTarget = openAddTarget;

})();
