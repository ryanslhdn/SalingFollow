/* ============================================================
   STORE — Beli kredit + Resubmit bukti
   ============================================================ */

(function() {
  const { $, esc, toast, icon, state } = App;

  const formatRupiah = App.formatRupiah || ((n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'));
  const formatDateTime = App.formatDateTime || ((iso) => iso ? new Date(iso).toLocaleString('id-ID') : '—');

  state.currentPackage = null;
  state.currentResubmitId = null;
  state.proofFile = null;
  state.proofPreview = null;
  state.adminPackages = state.adminPackages || [];

  /* ============================================================
     LOAD STORE
     ============================================================ */
  async function loadStore() {
    const { data: pkgs, error: pkgErr } = await sb
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (pkgErr) console.error('[Store] packages:', pkgErr);
    state.adminPackages = pkgs || [];

    const wrap = $('storePackages');
    if (wrap) {
      if (!state.adminPackages.length) {
        wrap.innerHTML = `
          <div class="info-box warn" style="grid-column:1/-1">
            <i data-lucide="alert-triangle"></i>
            <span>Belum ada paket kredit. Hubungi admin.</span>
          </div>`;
      } else {
        wrap.innerHTML = state.adminPackages.map((p, i) => `
          <div class="pkg-card" style="animation-delay:${i * 50}ms">
            <div class="pkg-name">${esc(p.name)}</div>
            <div class="pkg-credits">${p.credits}</div>
            <div class="pkg-credits-label">kredit</div>
            <div class="pkg-price">${formatRupiah(p.price_idr)}</div>
            <button type="button"
                    onclick="App.openPurchase('${esc(p.id)}')"
                    style="width:100%;margin-top:12px;padding:11px;border-radius:9px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:13px;border:none;cursor:pointer;font-family:inherit;box-shadow:0 6px 14px -4px rgba(16,185,129,.4)">
              Beli Sekarang
            </button>
          </div>
        `).join('');
      }
    }

    // Payment info
    const { data: settings } = await sb.from('app_settings').select('*');
    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
    const infoEl = $('storePaymentInfo');
    if (infoEl) {
      infoEl.textContent = settingsMap.payment_info || 'Hubungi admin untuk info pembayaran.';
    }

    // My credits
    const myCreditsEl = $('storeMyCredits');
    if (myCreditsEl) {
      myCreditsEl.textContent = (state.profile?.credits ?? 0) + ' kredit';
    }

    // ---------- PURCHASE HISTORY ----------
    const listEl = $('myPurchases');
    if (listEl) {
      const { data: purchases } = await sb
        .from('credit_purchases')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!purchases?.length) {
        listEl.innerHTML = `
          <div class="empty-state" style="padding:32px 24px">
            <div class="empty-icon" style="width:56px;height:56px">
              <i data-lucide="receipt" style="width:24px;height:24px"></i>
            </div>
            <p class="empty-desc">Belum ada pembelian</p>
          </div>`;
      } else {
        const stMap = {
          pending:       { label: 'Menunggu',           cls: 'pending', bg: '#fffbeb', color: '#b45309' },
          approved:      { label: 'Disetujui',          cls: 'success', bg: '#ecfdf5', color: '#047857' },
          rejected:      { label: 'Ditolak',            cls: 'danger',  bg: '#fef2f2', color: '#b91c1c' },
          need_reupload: { label: 'Perlu Upload Ulang', cls: 'pending', bg: '#dbeafe', color: '#1e40af' },
        };

        listEl.innerHTML = purchases.map((p, i) => {
          const st = stMap[p.status] || stMap.pending;
          const needsReupload = p.status === 'need_reupload';

          // Bukti transfer preview
          const proofHtml = p.proof_url ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--line);display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;color:var(--ink-3);font-weight:600">Bukti:</span>
              <img src="${esc(p.proof_url)}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--line);cursor:pointer"
                   onclick="window.open('${esc(p.proof_url)}','_blank')" alt="Bukti">
            </div>
          ` : '';

          // Pesan admin
          const adminNoteHtml = p.admin_note ? `
            <div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe">
              <div style="font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1e40af;margin-bottom:3px">
                Pesan Admin
              </div>
              <div style="font-size:12px;color:#1e3a8a;line-height:1.5">${esc(p.admin_note)}</div>
            </div>
          ` : '';

          // Tombol upload ulang
          const reuploadBtnHtml = (needsReupload || p.status === 'rejected') ? `
            <button onclick="App.openResubmitModal('${esc(p.id)}')"
                    style="width:100%;margin-top:10px;padding:10px;border-radius:9px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:800;font-size:12.5px;border:none;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px">
              <i data-lucide="upload" style="width:14px;height:14px"></i> Upload Ulang Bukti
            </button>
          ` : '';

          return `
            <div class="purchase-item" style="animation-delay:${i * 30}ms;flex-direction:column;align-items:stretch">
              <div style="display:flex;align-items:center;gap:12px">
                <div class="pi-badge">${p.credits}</div>
                <div class="pi-body">
                  <div class="pi-name">${esc(p.package_name)}</div>
                  <div class="pi-date">${formatDateTime(p.created_at)}</div>
                </div>
                <div class="pi-right">
                  <div class="pi-price">${formatRupiah(p.price_idr)}</div>
                  <span class="hi-status ${st.cls}" style="margin-top:4px;background:${st.bg};color:${st.color}">${st.label}</span>
                </div>
              </div>
              ${proofHtml}
              ${adminNoteHtml}
              ${reuploadBtnHtml}
            </div>`;
        }).join('');
      }
    }

    icon();
  }

  /* ============================================================
     OPEN PURCHASE MODAL
     ============================================================ */
  function openPurchase(pkgId) {
    const pkg = state.adminPackages.find(p => p.id === pkgId);
    if (!pkg) {
      toast('Paket tidak ditemukan', 'error');
      return;
    }

    state.currentPackage = pkg;
    state.proofFile = null;
    state.proofPreview = null;

    document.getElementById('dynamicPurchaseModal')?.remove();

    const m = document.createElement('div');
    m.id = 'dynamicPurchaseModal';
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
      <div style="position:relative;width:100%;max-width:440px;background:#fff;border-radius:20px;box-shadow:0 40px 80px -20px rgba(15,23,42,.35);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;animation:popIn .25s cubic-bezier(.34,1.56,.64,1)">

        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e5e7eb">
          <div>
            <div style="font-weight:800;font-size:16px;color:#111827;letter-spacing:-.02em">Konfirmasi Pembelian</div>
            <div style="font-size:12.5px;color:#9ca3af;margin-top:3px">${esc(pkg.name)}</div>
          </div>
          <button type="button" onclick="App.closePurchaseModal()" style="width:34px;height:34px;border-radius:8px;background:transparent;border:none;cursor:pointer;display:grid;place-items:center;color:#9ca3af">
            <i data-lucide="x" style="width:18px;height:18px"></i>
          </button>
        </div>

        <div style="padding:20px;overflow-y:auto;flex:1">

          <div style="padding:16px;border-radius:12px;background:#ecfdf5;border:1px solid #d1fae5;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <span style="font-size:12px;color:#047857;font-weight:600">Paket</span>
              <span style="font-weight:700;color:#111827;font-size:14px">${esc(pkg.name)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <span style="font-size:12px;color:#047857;font-weight:600">Kredit</span>
              <span style="font-weight:800;color:#10b981;font-size:18px">${pkg.credits}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:8px;border-top:1px dashed rgba(0,0,0,.1)">
              <span style="font-size:12px;color:#047857;font-weight:600">Total Bayar</span>
              <span style="font-weight:900;color:#111827;font-size:16px">${formatRupiah(pkg.price_idr)}</span>
            </div>
          </div>

          <div style="padding:12px 14px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;display:flex;gap:10px;margin-bottom:16px">
            <i data-lucide="alert-circle" style="width:16px;height:16px;color:#b45309;flex-shrink:0;margin-top:2px"></i>
            <div style="flex:1;font-size:12.5px;line-height:1.5;color:#78350f">
              <div style="font-weight:700;margin-bottom:2px">Transfer dulu ${formatRupiah(pkg.price_idr)}</div>
              <div>Lihat info rekening di halaman Toko, lalu upload bukti transfer di bawah.</div>
            </div>
          </div>

          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12.5px;font-weight:600;color:#111827;margin-bottom:6px">Metode Transfer</label>
            <select id="dynPurchaseMethod" style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:14px;outline:none;font-family:inherit">
              <option value="BCA">BCA</option>
              <option value="Mandiri">Mandiri</option>
              <option value="BRI">BRI</option>
              <option value="BNI">BNI</option>
              <option value="DANA">DANA</option>
              <option value="OVO">OVO</option>
              <option value="GoPay">GoPay</option>
              <option value="ShopeePay">ShopeePay</option>
            </select>
          </div>

          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12.5px;font-weight:600;color:#111827;margin-bottom:6px">
              Bukti Transfer <span style="color:#ef4444">*</span>
            </label>
            <input type="file" id="dynProofInput" accept="image/*" style="display:none">
            <div id="dynProofArea"></div>
          </div>

          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12.5px;font-weight:600;color:#111827;margin-bottom:6px">Catatan (opsional)</label>
            <input id="dynPurchaseNote" type="text" placeholder="contoh: transfer dari 0812xxx" style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:14px;outline:none;font-family:inherit;box-sizing:border-box">
          </div>

          <div id="dynPurchaseStatus" style="display:none;padding:10px 14px;border-radius:9px;font-size:12.5px;font-weight:600"></div>

        </div>

        <div style="display:flex;gap:8px;padding:16px 20px;border-top:1px solid #e5e7eb;background:#f9fafb">
          <button type="button" onclick="App.closePurchaseModal()" style="flex:1;padding:12px;border-radius:10px;background:#f3f4f6;color:#4b5563;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;border:1px solid #e5e7eb">
            Batal
          </button>
          <button type="button" id="dynBtnConfirm" style="flex:1.4;padding:12px;border-radius:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:6px">
            <i data-lucide="send" style="width:16px;height:16px"></i> Kirim Konfirmasi
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    renderProofArea();

    m.querySelector('#dynProofInput').addEventListener('change', handleProofChange);
    m.querySelector('#dynBtnConfirm').addEventListener('click', () => submitPurchase(pkg.id));

    icon();
  }

  function closePurchaseModal() {
    document.getElementById('dynamicPurchaseModal')?.remove();
    document.body.style.overflow = '';
    state.proofFile = null;
    state.proofPreview = null;
  }

  /* ============================================================
     PROOF AREA (modal beli)
     ============================================================ */
  function renderProofArea() {
    const area = document.getElementById('dynProofArea');
    if (!area) return;

    if (state.proofPreview) {
      area.innerHTML = `
        <div style="position:relative;border-radius:12px;overflow:hidden;border:2px solid #a7f3d0">
          <img src="${state.proofPreview}" style="width:100%;max-height:240px;object-fit:contain;background:#fff;display:block">
          <button type="button" onclick="App.removeProof()" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:10px;background:rgba(15,23,42,.8);color:#fff;border:none;cursor:pointer;display:grid;place-items:center">
            <i data-lucide="x" style="width:16px;height:16px"></i>
          </button>
          <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:linear-gradient(90deg,#10b981,#059669);color:#fff;font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:6px">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i> Bukti siap dikirim
          </div>
        </div>
      `;
    } else {
      area.innerHTML = `
        <button type="button" onclick="document.getElementById('dynProofInput').click()" style="width:100%;padding:22px 16px;border-radius:12px;border:2px dashed #d1d5db;background:#f9fafb;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;font-family:inherit">
          <div style="width:48px;height:48px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;display:grid;place-items:center">
            <i data-lucide="image-plus" style="width:22px;height:22px;color:#9ca3af"></i>
          </div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:700;color:#111827">Upload Bukti Transfer</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">JPG / PNG · Max 5MB</div>
          </div>
        </button>
      `;
    }
    icon();
  }

  function handleProofChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) return toast('File harus gambar (JPG/PNG)', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('File maksimal 5MB', 'error');

    state.proofFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.proofPreview = ev.target.result;
      renderProofArea();
    };
    reader.readAsDataURL(file);
  }

  /* ============================================================
     SUBMIT PURCHASE
     ============================================================ */
  async function submitPurchase(pkgId) {
    const method = document.getElementById('dynPurchaseMethod')?.value || 'BCA';
    const note = document.getElementById('dynPurchaseNote')?.value.trim() || null;
    const btn = document.getElementById('dynBtnConfirm');
    const statusEl = document.getElementById('dynPurchaseStatus');

    if (!state.proofFile) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = '⚠ Upload bukti transfer dulu';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px"></i> Mengunggah...';
      icon();
    }
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.background = '#fffbeb';
      statusEl.style.color = '#b45309';
      statusEl.textContent = 'Mengunggah bukti...';
    }

    try {
      const ext = (state.proofFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${state.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

      const { error: upErr } = await sb.storage
        .from('payment-proofs')
        .upload(path, state.proofFile, {
          contentType: state.proofFile.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
      if (upErr) throw new Error('Upload gagal: ' + upErr.message);

      const { data: pub } = sb.storage.from('payment-proofs').getPublicUrl(path);
      const proofUrl = pub.publicUrl;

      if (statusEl) statusEl.textContent = 'Mengirim konfirmasi...';

      const { error } = await sb.rpc('user_create_purchase', {
        p_package_id: pkgId,
        p_payment_method: method,
        p_buyer_note: note,
        p_proof_url: proofUrl,
      });
      if (error) throw error;

      toast('Konfirmasi terkirim! Nunggu approve admin ✅', 'success', 4000);
      closePurchaseModal();
      await loadStore();
    } catch (e) {
      console.error('[Purchase]', e);
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = '⚠ ' + (e.message || 'Gagal mengirim');
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px"></i> Kirim Konfirmasi';
        icon();
      }
    }
  }

  /* ============================================================
     RESUBMIT MODAL — user upload ulang bukti
     ============================================================ */
  function openResubmitModal(purchaseId) {
    state.currentResubmitId = purchaseId;
    state.proofFile = null;
    state.proofPreview = null;

    document.getElementById('resubmitModal')?.remove();

    const m = document.createElement('div');
    m.id = 'resubmitModal';
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
      <div style="position:relative;width:100%;max-width:440px;background:#fff;border-radius:20px;box-shadow:0 40px 80px -20px rgba(15,23,42,.35);max-height:94vh;display:flex;flex-direction:column;overflow:hidden">

        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e5e7eb">
          <div>
            <div style="font-weight:800;font-size:16px;color:#111827;letter-spacing:-.02em">Upload Ulang Bukti</div>
            <div style="font-size:12.5px;color:#9ca3af;margin-top:3px">Upload bukti transfer yang lebih jelas</div>
          </div>
          <button type="button" onclick="App.closeResubmitModal()" style="width:34px;height:34px;border-radius:8px;background:transparent;border:none;cursor:pointer;display:grid;place-items:center;color:#9ca3af">
            <i data-lucide="x" style="width:18px;height:18px"></i>
          </button>
        </div>

        <div style="padding:20px;overflow-y:auto;flex:1">
          <div style="padding:12px 14px;border-radius:10px;background:#eff6ff;border:1px solid #bfdbfe;display:flex;gap:10px;margin-bottom:16px">
            <i data-lucide="info" style="width:16px;height:16px;color:#1e40af;flex-shrink:0;margin-top:2px"></i>
            <div style="flex:1;font-size:12.5px;line-height:1.5;color:#1e3a8a">
              Pastikan bukti transfer jelas, terbaca nominal & tanggalnya.
            </div>
          </div>

          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12.5px;font-weight:600;color:#111827;margin-bottom:6px">
              Bukti Baru <span style="color:#ef4444">*</span>
            </label>
            <input type="file" id="resubmitProofInput" accept="image/*" style="display:none">
            <div id="resubmitProofArea"></div>
          </div>

          <div style="margin-bottom:16px">
            <label style="display:block;font-size:12.5px;font-weight:600;color:#111827;margin-bottom:6px">Catatan (opsional)</label>
            <textarea id="resubmitNote" rows="2" placeholder="Contoh: ini bukti yang lebih jelas" style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid #e5e7eb;background:#fff;font-size:14px;font-family:inherit;outline:none;resize:none;box-sizing:border-box"></textarea>
          </div>

          <div id="resubmitStatus" style="display:none;padding:10px 14px;border-radius:9px;font-size:12.5px;font-weight:600"></div>
        </div>

        <div style="display:flex;gap:8px;padding:16px 20px;border-top:1px solid #e5e7eb;background:#f9fafb">
          <button type="button" onclick="App.closeResubmitModal()" style="flex:1;padding:12px;border-radius:10px;background:#f3f4f6;color:#4b5563;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;border:1px solid #e5e7eb">
            Batal
          </button>
          <button type="button" id="resubmitBtnConfirm" style="flex:1.4;padding:12px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-weight:800;font-size:13px;font-family:inherit;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:6px">
            <i data-lucide="send" style="width:16px;height:16px"></i> Kirim
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    renderResubmitProofArea();

    m.querySelector('#resubmitProofInput').addEventListener('change', handleResubmitProofChange);
    m.querySelector('#resubmitBtnConfirm').addEventListener('click', () => submitResubmit(purchaseId));

    icon();
  }

  function closeResubmitModal() {
    document.getElementById('resubmitModal')?.remove();
    document.body.style.overflow = '';
    state.proofFile = null;
    state.proofPreview = null;
    state.currentResubmitId = null;
  }

  function renderResubmitProofArea() {
    const area = document.getElementById('resubmitProofArea');
    if (!area) return;

    if (state.proofPreview) {
      area.innerHTML = `
        <div style="position:relative;border-radius:12px;overflow:hidden;border:2px solid #93c5fd">
          <img src="${state.proofPreview}" style="width:100%;max-height:240px;object-fit:contain;background:#fff;display:block">
          <button type="button" onclick="App.removeResubmitProof()" style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:10px;background:rgba(15,23,42,.8);color:#fff;border:none;cursor:pointer;display:grid;place-items:center">
            <i data-lucide="x" style="width:16px;height:16px"></i>
          </button>
          <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:linear-gradient(90deg,#3b82f6,#2563eb);color:#fff;font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:6px">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i> Bukti siap dikirim
          </div>
        </div>
      `;
    } else {
      area.innerHTML = `
        <button type="button" onclick="document.getElementById('resubmitProofInput').click()" style="width:100%;padding:22px 16px;border-radius:12px;border:2px dashed #d1d5db;background:#f9fafb;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;font-family:inherit">
          <div style="width:48px;height:48px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;display:grid;place-items:center">
            <i data-lucide="image-plus" style="width:22px;height:22px;color:#9ca3af"></i>
          </div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:700;color:#111827">Upload Bukti Baru</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">JPG / PNG · Max 5MB</div>
          </div>
        </button>
      `;
    }
    icon();
  }

  function handleResubmitProofChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) return toast('File harus gambar', 'error');
    if (file.size > 5 * 1024 * 1024) return toast('Max 5MB', 'error');

    state.proofFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.proofPreview = ev.target.result;
      renderResubmitProofArea();
    };
    reader.readAsDataURL(file);
  }

  async function submitResubmit(purchaseId) {
    const note = document.getElementById('resubmitNote')?.value.trim() || null;
    const btn = document.getElementById('resubmitBtnConfirm');
    const statusEl = document.getElementById('resubmitStatus');

    if (!state.proofFile) {
      if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = '⚠ Upload bukti baru dulu';
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = 'Mengunggah...'; }
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.background = '#fffbeb';
      statusEl.style.color = '#b45309';
      statusEl.textContent = 'Mengunggah bukti...';
    }

    try {
      const ext = (state.proofFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${state.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

      const { error: upErr } = await sb.storage
        .from('payment-proofs')
        .upload(path, state.proofFile, {
          contentType: state.proofFile.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
      if (upErr) throw new Error('Upload gagal: ' + upErr.message);

      const { data: pub } = sb.storage.from('payment-proofs').getPublicUrl(path);

      if (statusEl) statusEl.textContent = 'Mengirim...';

      const { error } = await sb.rpc('user_resubmit_proof', {
        p_purchase_id: purchaseId,
        p_proof_url: pub.publicUrl,
        p_buyer_note: note,
      });
      if (error) throw error;

      toast('Bukti baru terkirim! Nunggu verifikasi admin ✅', 'success', 4000);
      closeResubmitModal();
      await loadStore();
    } catch (e) {
      console.error('[Resubmit]', e);
      if (statusEl) {
        statusEl.style.background = '#fef2f2';
        statusEl.style.color = '#b91c1c';
        statusEl.textContent = '⚠ ' + (e.message || 'Gagal mengirim');
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px"></i> Kirim';
        icon();
      }
    }
  }

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadStore = loadStore;
  App.openPurchase = openPurchase;
  App.closePurchaseModal = closePurchaseModal;
  App.removeProof = function() {
    state.proofFile = null;
    state.proofPreview = null;
    renderProofArea();
  };
  App.openResubmitModal = openResubmitModal;
  App.closeResubmitModal = closeResubmitModal;
  App.removeResubmitProof = function() {
    state.proofFile = null;
    state.proofPreview = null;
    renderResubmitProofArea();
  };

})();
