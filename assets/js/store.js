/* ============================================================
   STORE — Beli kredit dengan bukti transfer
   v3: Modal dinamis + upload bukti
   ============================================================ */

(function() {
  const { $, esc, toast, icon, state } = App;

  const formatRupiah = App.formatRupiah || ((n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'));
  const formatDateTime = App.formatDateTime || ((iso) => iso ? new Date(iso).toLocaleString('id-ID') : '—');

  state.currentPackage = null;
  state.proofFile = null;
  state.proofPreview = null;

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
          <button type="button" data-pkg-id="${esc(p.id)}" class="pkg-card" style="animation-delay:${i * 50}ms;cursor:pointer;font-family:inherit">
            <div class="pkg-name">${esc(p.name)}</div>
            <div class="pkg-credits">${p.credits}</div>
            <div class="pkg-credits-label">kredit</div>
            <div class="pkg-price">${formatRupiah(p.price_idr)}</div>
          </button>
        `).join('');
      }
    }

    const { data: settings } = await sb.from('app_settings').select('*');
    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
    const infoEl = $('storePaymentInfo');
    if (infoEl) {
      infoEl.textContent = settingsMap.payment_info || 'Hubungi admin untuk info pembayaran.';
    }

    const myCreditsEl = $('storeMyCredits');
    if (myCreditsEl) {
      myCreditsEl.textContent = (state.profile?.credits ?? 0) + ' kredit';
    }

    // Purchase history
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
          pending:  { label: 'Menunggu',  cls: 'pending' },
          approved: { label: 'Disetujui', cls: 'success' },
          rejected: { label: 'Ditolak',   cls: 'danger' },
        };

        listEl.innerHTML = purchases.map((p, i) => {
          const st = stMap[p.status] || stMap.pending;
          const proofHtml = p.proof_url ? `
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;color:var(--ink-3);font-weight:600">Bukti:</span>
              <img src="${esc(p.proof_url)}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;border:1px solid var(--line);cursor:pointer"
                   onclick="window.open('${esc(p.proof_url)}','_blank')" alt="Bukti">
            </div>
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
                  <span class="hi-status ${st.cls}" style="margin-top:4px">${st.label}</span>
                </div>
              </div>
              ${proofHtml}
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

    // Hapus modal lama kalau ada
    document.getElementById('dynamicPurchaseModal')?.remove();

    const m = document.createElement('div');
    m.id = 'dynamicPurchaseModal';
    m.className = 'modal-wrapper';
    m.innerHTML = `
      <div class="modal-backdrop" data-close-purchase></div>
      <div class="modal-card" style="max-height:94vh">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Konfirmasi Pembelian</h3>
            <p style="font-size:12.5px;color:var(--ink-3);margin:4px 0 0">${esc(pkg.name)}</p>
          </div>
          <button type="button" class="modal-close" data-close-purchase>
            <i data-lucide="x"></i>
          </button>
        </div>

        <div class="modal-body space-y-4" style="overflow-y:auto">

          <!-- Ringkasan Paket -->
          <div style="padding:16px;border-radius:12px;background:var(--green-50);border:1px solid var(--green-100)">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <span style="font-size:12px;color:var(--green-700);font-weight:600">Paket</span>
              <span style="font-weight:700;color:var(--ink);font-size:14px">${esc(pkg.name)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <span style="font-size:12px;color:var(--green-700);font-weight:600">Kredit</span>
              <span style="font-weight:800;color:var(--green-600);font-size:18px">${pkg.credits}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:8px;border-top:1px dashed rgba(0,0,0,.1)">
              <span style="font-size:12px;color:var(--green-700);font-weight:600">Total Bayar</span>
              <span style="font-weight:900;color:var(--ink);font-size:16px">${formatRupiah(pkg.price_idr)}</span>
            </div>
          </div>

          <!-- Transfer Info -->
          <div class="info-box warn">
            <i data-lucide="alert-circle"></i>
            <div style="flex:1">
              <div style="font-weight:700;margin-bottom:3px">Transfer dulu ${formatRupiah(pkg.price_idr)}</div>
              <div style="font-size:11.5px">Lihat info rekening di halaman Toko, lalu upload bukti transfer di bawah.</div>
            </div>
          </div>

          <!-- Metode -->
          <div>
            <label class="form-label">Metode Transfer</label>
            <select id="dynPurchaseMethod" class="form-input">
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

          <!-- Upload Bukti -->
          <div>
            <label class="form-label">Bukti Transfer <span style="color:#ef4444">*</span></label>
            <input type="file" id="dynProofInput" accept="image/*" class="hidden" style="display:none">
            <div id="dynProofArea"></div>
          </div>

          <!-- Catatan -->
          <div>
            <label class="form-label">Catatan (opsional)</label>
            <input id="dynPurchaseNote" type="text" placeholder="contoh: transfer dari 0812xxx" class="form-input">
          </div>

          <div id="dynPurchaseStatus" class="status-msg hidden"></div>

        </div>

        <div class="modal-footer" style="display:flex;gap:8px">
          <button type="button" data-close-purchase style="flex:1;padding:12px;border-radius:10px;background:var(--surface-2);color:var(--ink-2);font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;border:none">
            Batal
          </button>
          <button type="button" id="dynBtnConfirm" class="btn-primary" style="flex:1.4">
            <i data-lucide="send" style="width:16px;height:16px"></i> Kirim Konfirmasi
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    // Close handlers
    m.querySelectorAll('[data-close-purchase]').forEach(el => {
      el.addEventListener('click', closePurchaseModal);
    });

    // Upload handler
    const proofInput = m.querySelector('#dynProofInput');
    proofInput.addEventListener('change', handleProofChange);

    // Render area kosong dulu
    renderProofArea(m);

    // Confirm handler
    m.querySelector('#dynBtnConfirm').addEventListener('click', () => {
      submitPurchase(pkg.id, m);
    });

    icon();

    // Auto focus
    setTimeout(() => {
      // scroll ke atas modal
      m.querySelector('.modal-body')?.scrollTo({ top: 0 });
    }, 100);
  }

  function closePurchaseModal() {
    document.getElementById('dynamicPurchaseModal')?.remove();
    document.body.style.overflow = '';
    state.proofFile = null;
    state.proofPreview = null;
  }

  /* ============================================================
     PROOF UPLOAD HANDLER
     ============================================================ */
  function renderProofArea(modalEl) {
    const area = modalEl.querySelector('#dynProofArea');
    if (!area) return;

    if (state.proofPreview) {
      area.innerHTML = `
        <div style="position:relative;border-radius:12px;overflow:hidden;border:2px solid var(--green-200,#a7f3d0)">
          <img src="${state.proofPreview}" style="width:100%;max-height:240px;object-fit:contain;background:#fff;display:block">
          <button type="button" data-remove-proof style="position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:10px;background:rgba(15,23,42,.8);color:#fff;border:none;cursor:pointer;display:grid;place-items:center">
            <i data-lucide="x" style="width:16px;height:16px"></i>
          </button>
          <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:linear-gradient(90deg,#10b981,#059669);color:#fff;font-size:11.5px;font-weight:700;display:flex;align-items:center;gap:6px">
            <i data-lucide="check-circle" style="width:14px;height:14px"></i> Bukti siap dikirim
          </div>
        </div>
      `;

      area.querySelector('[data-remove-proof]').addEventListener('click', () => {
        state.proofFile = null;
        state.proofPreview = null;
        renderProofArea(modalEl);
        icon();
      });
    } else {
      area.innerHTML = `
        <button type="button" data-upload-proof style="width:100%;padding:22px 16px;border-radius:12px;border:2px dashed var(--line-2);background:var(--surface-2);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;font-family:inherit;transition:all .15s">
          <div style="width:48px;height:48px;border-radius:12px;background:#fff;border:1px solid var(--line);display:grid;place-items:center">
            <i data-lucide="image-plus" style="width:22px;height:22px;color:var(--ink-3)"></i>
          </div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:700;color:var(--ink)">Upload Bukti Transfer</div>
            <div style="font-size:11px;color:var(--ink-3);margin-top:2px">JPG / PNG · Max 5MB</div>
          </div>
        </button>
      `;

      area.querySelector('[data-upload-proof]').addEventListener('click', () => {
        modalEl.querySelector('#dynProofInput').click();
      });
    }

    icon();
  }

  function handleProofChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('File harus gambar (JPG/PNG)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('File maksimal 5MB', 'error');
      return;
    }

    state.proofFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      state.proofPreview = ev.target.result;
      const modalEl = document.getElementById('dynamicPurchaseModal');
      if (modalEl) renderProofArea(modalEl);
    };
    reader.readAsDataURL(file);
  }

  /* ============================================================
     SUBMIT PURCHASE (dengan upload bukti)
     ============================================================ */
  async function submitPurchase(pkgId, modalEl) {
    const method = modalEl.querySelector('#dynPurchaseMethod')?.value || 'BCA';
    const note = modalEl.querySelector('#dynPurchaseNote')?.value.trim() || null;
    const btn = modalEl.querySelector('#dynBtnConfirm');
    const statusEl = modalEl.querySelector('#dynPurchaseStatus');

    if (!state.proofFile) {
      if (statusEl) {
        statusEl.className = 'status-msg error';
        statusEl.textContent = 'Upload bukti transfer dulu';
        statusEl.classList.remove('hidden');
      } else {
        toast('Upload bukti transfer dulu', 'error');
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader" style="width:16px;height:16px"></i> Mengunggah...'; icon(); }
    if (statusEl) {
      statusEl.className = 'status-msg warn';
      statusEl.textContent = 'Mengunggah bukti...';
      statusEl.classList.remove('hidden');
    }

    try {
      // 1. Upload bukti ke Storage
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

      // 2. Submit konfirmasi ke DB
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
        statusEl.className = 'status-msg error';
        statusEl.textContent = e.message || 'Gagal mengirim';
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="send" style="width:16px;height:16px"></i> Kirim Konfirmasi';
        icon();
      }
    }
  }

  /* ============================================================
     EVENT DELEGATION
     ============================================================ */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pkg-id]');
    if (btn) {
      e.preventDefault();
      openPurchase(btn.dataset.pkgId);
    }
  });

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadStore = loadStore;
  App.openPurchase = openPurchase;

})();
