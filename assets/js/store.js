/* ============================================================
   STORE — Beli kredit dengan paket
   v2: Modal dinamis, event delegation, anti-gagal
   ============================================================ */

(function() {
  const { $, esc, toast, icon, state } = App;

  const formatRupiah = App.formatRupiah || ((n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'));
  const formatDateTime = App.formatDateTime || ((iso) => iso ? new Date(iso).toLocaleString('id-ID') : '—');

  state.currentPackage = null;

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
          return `
            <div class="purchase-item" style="animation-delay:${i * 30}ms">
              <div class="pi-badge">${p.credits}</div>
              <div class="pi-body">
                <div class="pi-name">${esc(p.package_name)}</div>
                <div class="pi-date">${formatDateTime(p.created_at)}</div>
              </div>
              <div class="pi-right">
                <div class="pi-price">${formatRupiah(p.price_idr)}</div>
                <span class="hi-status ${st.cls}" style="margin-top:4px">${st.label}</span>
              </div>
            </div>`;
        }).join('');
      }
    }

    icon();
  }

  /* ============================================================
     MODAL DINAMIS — bikin sendiri, tidak butuh HTML
     ============================================================ */
  function openPurchase(pkgId) {
    const pkg = state.adminPackages.find(p => p.id === pkgId);
    if (!pkg) return;

    state.currentPackage = pkg;

    // Hapus modal lama kalau ada
    document.getElementById('dynamicPurchaseModal')?.remove();

    const m = document.createElement('div');
    m.id = 'dynamicPurchaseModal';
    m.className = 'modal-wrapper';
    m.innerHTML = `
      <div class="modal-backdrop" data-close-purchase></div>
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Konfirmasi Pembelian</h3>
            <p style="font-size:12.5px;color:var(--ink-3);margin:4px 0 0">${esc(pkg.name)}</p>
          </div>
          <button class="modal-close" data-close-purchase>
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="modal-body space-y-4">

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

          <div class="info-box warn">
            <i data-lucide="alert-circle"></i>
            <div>
              <div style="font-weight:700;margin-bottom:3px">Transfer dulu!</div>
              <div>Transfer ${formatRupiah(pkg.price_idr)} ke rekening di halaman Toko. Setelah itu submit form ini.</div>
            </div>
          </div>

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
            Kirim Konfirmasi
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

    // Confirm handler
    m.querySelector('#dynBtnConfirm').addEventListener('click', () => {
      submitPurchase(pkg.id, m);
    });

    icon();
  }

  function closePurchaseModal() {
    document.getElementById('dynamicPurchaseModal')?.remove();
    document.body.style.overflow = '';
  }

  /* ============================================================
     SUBMIT PURCHASE
     ============================================================ */
  async function submitPurchase(pkgId, modalEl) {
    const method = modalEl.querySelector('#dynPurchaseMethod')?.value || 'BCA';
    const note = modalEl.querySelector('#dynPurchaseNote')?.value.trim() || null;
    const btn = modalEl.querySelector('#dynBtnConfirm');
    const statusEl = modalEl.querySelector('#dynPurchaseStatus');

    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }
    if (statusEl) {
      statusEl.className = 'status-msg warn';
      statusEl.textContent = 'Mengirim konfirmasi...';
      statusEl.classList.remove('hidden');
    }

    try {
      const { error } = await sb.rpc('user_create_purchase', {
        p_package_id: pkgId,
        p_payment_method: method,
        p_buyer_note: note,
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
      if (btn) { btn.disabled = false; btn.textContent = 'Kirim Konfirmasi'; }
    }
  }

  /* ============================================================
     EVENT DELEGATION — anti-gagal, tidak butuh rebind
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
