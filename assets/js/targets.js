/* ============================================================
   TARGETS — Akun target + Request follower + Boost
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, PLATFORMS, state } = App;

  state.selectedTargetPlatform = 'instagram';
  state.currentRequestTarget = null;
  state.currentBoostAccount = null;
  state.boostDuration = 24;

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

    state.targets = data || [];

    if (!state.targets.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      await loadRequests();
      icon();
      return;
    }

    if (empty) empty.classList.add('hidden');

    list.innerHTML = state.targets.map((t, i) => renderTargetCard(t, i)).join('');

    list.querySelectorAll('[data-request-target]').forEach(b => {
      b.addEventListener('click', () => openRequest(b.dataset.requestTarget));
    });

    list.querySelectorAll('[data-boost-target]').forEach(b => {
      b.addEventListener('click', () => openBoost(b.dataset.boostTarget));
    });

    list.querySelectorAll('[data-delete-target]').forEach(b => {
      b.addEventListener('click', () => deleteTarget(b.dataset.deleteTarget));
    });

    icon();
    await loadRequests();
  }

  /* ============================================================
     RENDER TARGET CARD (dengan tombol Boost)
     ============================================================ */
  function renderTargetCard(t, index) {
    const p = PLATFORMS[t.platform] || { name: t.platform, icon: 'globe', color: '#64748b' };
    const hasActive = !!t.active_request_id;
    const boosted = t.boost_until && new Date(t.boost_until) > new Date();
    const remaining = t.active_remaining || 0;
    const total = t.active_quantity || 0;
    const filled = total - remaining;
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

    // Badge boost
    const boostBadge = boosted ? `
      <span style="display:inline-block;margin-top:6px;padding:3px 9px;border-radius:6px;background:#fef3c7;color:#b45309;font-size:10px;font-weight:700;letter-spacing:.04em">
        🚀 BOOSTED s.d. ${App.formatDateTime(t.boost_until)}
      </span>
    ` : '';

    // Progress request
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

    // Baris tombol 1: Buka + Boost (selalu)
    // Baris tombol 2: Minta Follower (kalau belum aktif) atau Request Aktif (disabled)
    const mainActions = `
      <div style="display:flex;gap:8px">
        <a href="${esc(t.profile_url)}" target="_blank" rel="noopener" class="acc-btn ghost" style="flex:1">
          <i data-lucide="external-link"></i> Buka
        </a>
        <button data-boost-target="${esc(t.id)}" class="acc-btn boost" style="flex:1">
          <i data-lucide="rocket"></i> Boost
        </button>
      </div>
    `;

    const requestAction = hasActive
      ? `
        <button disabled class="acc-btn ghost" style="opacity:.6;cursor:not-allowed;width:100%;margin-top:8px">
          <i data-lucide="clock"></i> Request Aktif
        </button>
      `
      : `
        <button data-request-target="${esc(t.id)}" class="acc-btn" style="width:100%;margin-top:8px;background:var(--green-50);color:var(--green-700);border:1px solid var(--green-100);font-family:inherit;cursor:pointer;font-weight:700;font-size:13px;padding:11px 14px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:6px">
          <i data-lucide="user-plus" style="width:14px;height:14px"></i> Minta Follower
        </button>
      `;

    return `
      <div class="account-card ${boosted ? 'boosted' : ''}" style="animation-delay:${index * 40}ms">
        <div class="acc-head">
          <div class="acc-avatar ${boosted ? 'boosted' : ''}" style="background:${p.color}">
            <i data-lucide="${p.icon}"></i>
          </div>
          <div class="acc-info">
            <div class="acc-username">@${esc(t.username)}</div>
            <div class="acc-boost-label ${boosted ? 'active' : ''}">${p.name}</div>
            ${boostBadge}
          </div>
          <button data-delete-target="${esc(t.id)}" class="acc-del" title="Hapus akun">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
        ${mainActions}
        ${requestAction}
        ${progressHtml}
      </div>
    `;
  }

  /* ============================================================
     LOAD REQUESTS
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
      active:    { label: 'Aktif',      cls: 'background:#dbeafe;color:#1e40af' },
      filled:    { label: 'Selesai',    cls: 'background:#ecfdf5;color:#047857' },
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
              <span style="display:inline-block;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;${st.cls}">
                ${st.label}
              </span>
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
    const qty = $('targetQuantity');
    if (u) u.value = '';
    if (url) { url.value = ''; delete url.dataset.manuallyEdited; }
    if (qty) qty.value = '0';
    clearStatus('addTargetStatus');
    renderTargetPlatformGrid();
    updateTargetCost();
    openModal('modalAddTarget');
    setTimeout(() => $('targetUsername')?.focus(), 200);
  }

  function updateTargetCost() {
    const qty = Number($('targetQuantity')?.value) || 0;
    const credits = state.profile?.credits ?? 0;

    const myEl = $('targetMyCredits');
    const costEl = $('targetCost');
    const warnEl = $('targetCreditWarning');

    if (myEl) myEl.textContent = credits + ' kredit';
    if (costEl) costEl.textContent = qty + ' kredit';

    if (warnEl) {
      const notEnough = qty > 0 && credits < qty;
      warnEl.style.display = notEnough ? 'block' : 'none';
    }
  }

  async function saveTarget() {
    const username = $('targetUsername').value.trim().replace(/^@/, '');
    const url = $('targetUrl').value.trim();
    const qty = Number($('targetQuantity')?.value) || 0;

    if (!username) return status('addTargetStatus', 'error', 'Username wajib diisi');
    if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) return status('addTargetStatus', 'error', 'Username tidak valid');
    if (!/^https?:\/\//.test(url)) return status('addTargetStatus', 'error', 'Link harus diawali http:// atau https://');
    if (qty < 0 || qty > 1000) return status('addTargetStatus', 'error', 'Jumlah follower 0-1000');

    const credits = state.profile?.credits ?? 0;
    const canRequest = qty > 0 && credits >= qty;

    const btn = $('btnSaveTarget');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    status('addTargetStatus', 'warn', 'Menyimpan akun target...');

    try {
      const { data: inserted, error } = await sb
        .from('social_accounts')
        .insert({
          user_id: state.user.id,
          platform: state.selectedTargetPlatform,
          username,
          profile_url: url,
          account_type: 'target',
        })
        .select()
        .single();

      if (error) throw error;

      const p = PLATFORMS[state.selectedTargetPlatform];

      if (qty > 0) {
        if (!canRequest) {
          toast(`Akun @${username} tersimpan. Kredit kurang (butuh ${qty}, punya ${credits})`, 'warn', 5000);
        } else {
          status('addTargetStatus', 'warn', 'Membuat request follower...');
          const { error: reqErr } = await sb.rpc('create_follow_request', {
            p_target_id: inserted.id,
            p_quantity: qty,
          });
          if (reqErr) {
            console.error('[SaveTarget] Request failed:', reqErr);
            toast(`Akun @${username} tersimpan. Gagal buat request: ${reqErr.message}`, 'warn', 5000);
          } else {
            toast(`${p.name} @${username} terdaftar + request ${qty} follower ✅`, 'success', 4000);
          }
        }
      } else {
        toast(`Akun target ${p.name} @${username} didaftarkan ✅`, 'success', 3000);
      }

      closeModal('modalAddTarget');
      await Promise.all([
        loadTargets(),
        App.loadProfile ? App.loadProfile() : Promise.resolve(),
        App.loadFeed ? App.loadFeed() : Promise.resolve(),
      ]);
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
    const ok = await App.confirm({
      title: 'Hapus akun target?',
      desc: 'Akun target ini akan dihapus. Request aktif (kalau ada) juga akan dihapus.',
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
      icon: 'trash-2'
    });
    if (!ok) return;

    const { error } = await sb.from('social_accounts').delete().eq('id', id);
    if (error) return toast('Gagal: ' + error.message, 'error');

    toast('Akun target dihapus', 'success');
    await loadTargets();
  }

  /* ============================================================
     BOOST TARGET MODAL
     ============================================================ */
  function openBoost(accountId) {
    const acc = state.targets?.find(a => a.id === accountId);
    if (!acc) return;

    state.currentBoostAccount = acc;
    state.boostDuration = 24;

    document.getElementById('boostDynamicModal')?.remove();

    const m = document.createElement('div');
    m.id = 'boostDynamicModal';
    m.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(15,23,42,.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    `;

    m.innerHTML = `
      <div style="position:relative;width:100%;max-width:420px;background:#fff;border-radius:20px;box-shadow:0 40px 80px -20px rgba(15,23,42,.35);max-height:94vh;display:flex;flex-direction:column;overflow:hidden">

        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#f59e0b,#d97706);display:grid;place-items:center;color:#fff;flex-shrink:0">
              <i data-lucide="rocket" style="width:20px;height:20px"></i>
            </div>
            <div>
              <div style="font-weight:800;font-size:16px;color:#111827;letter-spacing:-.02em">Boost Akun Target</div>
              <div style="font-size:12.5px;color:#9ca3af;margin-top:2px">Muncul di atas feed user lain</div>
            </div>
          </div>
          <button type="button" onclick="App.closeBoostModal()" style="width:34px;height:34px;border-radius:8px;background:transparent;border:none;cursor:pointer;display:grid;place-items:center;color:#9ca3af">
            <i data-lucide="x" style="width:18px;height:18px"></i>
          </button>
        </div>

        <div style="padding:20px;overflow-y:auto;flex:1">

          <div style="padding:14px 16px;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;margin-bottom:16px">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#b45309;margin-bottom:4px">
              Akun yang di-boost
            </div>
            <div style="font-weight:800;font-size:14px;color:#111827">@${esc(acc.username)}</div>
          </div>

          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12.5px;font-weight:600;color:#111827;margin-bottom:8px">Durasi Boost</label>
            <div id="boostDurGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
              <button type="button" data-dur="24" class="boost-dur-btn boost-dur-active">24 jam</button>
              <button type="button" data-dur="48" class="boost-dur-btn">48 jam</button>
              <button type="button" data-dur="72" class="boost-dur-btn">72 jam</button>
            </div>
          </div>

          <div style="padding:12px 14px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;display:flex;gap:10px">
            <i data-lucide="coins" style="width:16px;height:16px;color:#10b981;flex-shrink:0;margin-top:2px"></i>
            <div style="flex:1;font-size:12.5px;line-height:1.5;color:#4b5563">
              Biaya: <b id="boostCostDynamic" style="color:#10b981">3 kredit</b><br>
              Kreditmu: <b id="boostCreditsDynamic" style="color:#111827">—</b>
            </div>
          </div>

          <div id="boostDynamicStatus" style="display:none;margin-top:12px;padding:10px 14px;border-radius:9px;font-size:12.5px;font-weight:600"></div>

        </div>

        <div style="display:flex;gap:8px;padding:16px 20px;border-top:1px solid #e5e7eb;background:#f9fafb">
          <button type="button" onclick="App.closeBoostModal()" style="flex:1;padding:12px;border-radius:10px;background:#f3f4f6;color:#4b5563;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;border:1px solid #e5e7eb">
            Batal
          </button>
          <button type="button" id="boostBtnConfirm" style="flex:1.4;padding:12px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 8px 18px -6px rgba(245,158,11,.5)">
            <i data-lucide="rocket" style="width:16px;height:16px"></i> Konfirmasi Boost
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    // Bind duration
    m.querySelectorAll('[data-dur]').forEach(b => {
      b.addEventListener('click', () => {
        state.boostDuration = Number(b.dataset.dur);
        m.querySelectorAll('[data-dur]').forEach(x => {
          x.classList.toggle('boost-dur-active', Number(x.dataset.dur) === state.boostDuration);
        });
        updateBoostCost();
      });
    });

    // Bind confirm
    m.querySelector('#boostBtnConfirm').addEventListener('click', submitBoost);

    updateBoostCost();
    icon();
  }

  function updateBoostCost() {
    const cost = 3 * Math.ceil(state.boostDuration / 24);
    const credits = state.profile?.credits ?? 0;

    const costEl = $('boostCostDynamic');
    const credEl = $('boostCreditsDynamic');

    if (costEl) costEl.textContent = cost + ' kredit';
    if (credEl) {
      credEl.textContent = credits + ' kredit';
      credEl.style.color = credits < cost ? '#ef4444' : '#111827';
    }
  }

  async function submitBoost() {
    const btn = $('boostBtnConfirm');
    const statusEl = $('boostDynamicStatus');
    const acc = state.currentBoostAccount;

    if (!acc) return;

    const cost = 3 * Math.ceil(state.boostDuration / 24);
    const credits = state.profile?.credits ?? 0;

    if (credits < cost) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = `⚠ Kredit kurang. Butuh ${cost}, kamu punya ${credits}`;
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Memproses...';
    }
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.background = '#fffbeb';
      statusEl.style.color = '#b45309';
      statusEl.textContent = 'Memproses boost...';
    }

    try {
      const { data, error } = await sb.rpc('boost_account', {
        p_account_id: acc.id,
        p_hours: state.boostDuration,
      });
      if (error) throw error;

      toast(`🚀 Boost aktif! −${data.cost} kredit`, 'success', 4000);
      closeBoostModal();

      await Promise.all([
        loadTargets(),
        App.loadProfile ? App.loadProfile() : Promise.resolve(),
        App.loadFeed ? App.loadFeed() : Promise.resolve(),
      ]);
    } catch (e) {
      console.error('[Boost]', e);
      if (statusEl) {
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = '⚠ ' + (e.message || 'Gagal boost');
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="rocket" style="width:16px;height:16px"></i> Konfirmasi Boost';
        icon();
      }
    }
  }

  function closeBoostModal() {
    document.getElementById('boostDynamicModal')?.remove();
    document.body.style.overflow = '';
    state.currentBoostAccount = null;
  }

  /* ============================================================
     REQUEST FOLLOWER
     ============================================================ */
  function openRequest(targetId) {
    state.currentRequestTarget = targetId;

    const btn = document.querySelector(`[data-request-target="${targetId}"]`);
    const card = btn?.closest('.account-card');
    const usernameEl = card?.querySelector('.acc-username');
    const username = usernameEl ? usernameEl.textContent : '@—';

    const nameEl = $('requestTargetName');
    if (nameEl) nameEl.textContent = username;

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
    if (credits < qty) return status('requestStatus', 'error', `Kredit kurang. Butuh ${qty}, kamu punya ${credits}`);

    const btn = $('btnConfirmRequest');
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
    status('requestStatus', 'warn', 'Membuat request...');

    try {
      const { error } = await sb.rpc('create_follow_request', {
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
    $('btnAddTarget')?.addEventListener('click', openAddTarget);
    $('btnSaveTarget')?.addEventListener('click', saveTarget);

    $('targetUsername')?.addEventListener('input', (e) => {
      const u = e.target.value.trim().replace(/^@/, '');
      const p = PLATFORMS[state.selectedTargetPlatform];
      const urlInput = $('targetUrl');
      if (u && p && urlInput && !urlInput.dataset.manuallyEdited) urlInput.value = p.url(u);
    });

    $('targetUrl')?.addEventListener('input', () => {
      const urlInput = $('targetUrl');
      if (urlInput) urlInput.dataset.manuallyEdited = '1';
    });

    $('targetUsername')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('targetUrl')?.focus(); }
    });

    $('targetUrl')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('targetQuantity')?.focus(); }
    });

    $('targetQuantity')?.addEventListener('input', updateTargetCost);
    $('targetQuantity')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveTarget(); }
    });

    $('requestQuantity')?.addEventListener('input', updateRequestCost);
    $('btnConfirmRequest')?.addEventListener('click', submitRequest);

    $('btnRefreshRequests')?.addEventListener('click', () => loadTargets());
  });

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadTargets = loadTargets;
  App.loadRequests = loadRequests;
  App.openAddTarget = openAddTarget;
  App.openBoost = openBoost;
  App.closeBoostModal = closeBoostModal;

})();
