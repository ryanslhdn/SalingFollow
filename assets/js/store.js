/* ============================================================
   STORE — Beli kredit dengan paket
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, state } = App;

  // Fallback helpers (kalau App.formatRupiah / App.formatDateTime belum ada)
  const formatRupiah = App.formatRupiah || ((n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'));
  const formatDateTime = App.formatDateTime || ((iso) => iso ? new Date(iso).toLocaleString('id-ID') : '—');

  /* ============================================================
     LOAD STORE
     ============================================================ */
  async function loadStore() {
    // ---------- PACKAGES ----------
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
          <button data-pkg="${esc(p.id)}" class="pkg-card" style="animation-delay:${i * 50}ms">
            <div class="pkg-name">${esc(p.name)}</div>
            <div class="pkg-credits">${p.credits}</div>
            <div class="pkg-credits-label">kredit</div>
            <div class="pkg-price">${formatRupiah(p.price_idr)}</div>
          </button>
        `).join('');

        wrap.querySelectorAll('[data-pkg]').forEach(b => {
          b.addEventListener('click', () => openPurchase(b.dataset.pkg));
        });
      }
    }

    // ---------- PAYMENT INFO ----------
    const { data: settings } = await sb.from('app_settings').select('*');
    const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
    const infoEl = $('storePaymentInfo');
    if (infoEl) {
      infoEl.textContent = settingsMap.payment_info || 'Hubungi admin untuk info pembayaran.';
    }

    // ---------- UPDATE KREDIT SAYA (kalau ada elemen) ----------
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
     OPEN PURCHASE MODAL
     ============================================================ */
  function openPurchase(pkgId) {
    const pkg = state.adminPackages.find(p => p.id === pkgId);
    if (!pkg) return;

    state.currentPackage = pkg;
    clearStatus('purchaseStatus');

    const summary = $('purchaseSummary');
    if (summary) {
      summary.innerHTML = `
        <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);margin-bottom:6px">${esc(pkg.name)}</div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-.03em;color:var(--ink);line-height:1">${pkg.credits} kredit</div>
        <div style="font-size:15px;font-weight:700;color:var(--green-600);margin-top:10px;padding-top:10px;border-top:1px solid var(--line)">${formatRupiah(pkg.price_idr)}</div>
      `;
    }

    // Reset form
    const method = $('purchaseMethod');
    const note = $('purchaseNote');
    if (method) method.value = 'BCA';
    if (note) note.value = '';

    openModal('modalPurchase');
  }

  /* ============================================================
     SUBMIT PURCHASE
     ============================================================ */
  async function submitPurchase() {
    const method = $('purchaseMethod')?.value || 'BCA';
    const note = $('purchaseNote')?.value.trim() || null;
    const pkg = state.currentPackage;

    if (!pkg) return;

    const btn = $('btnConfirmPurchase');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Mengirim...';
    }
    status('purchaseStatus', 'warn', 'Mengirim...');

    try {
      const { error } = await sb.rpc('user_create_purchase', {
        p_package_id: pkg.id,
        p_payment_method: method,
        p_buyer_note: note,
      });
      if (error) throw error;

      toast('Konfirmasi terkirim! Nunggu approve admin ✅', 'success', 4000);
      closeModal('modalPurchase');

      await loadStore();
    } catch (e) {
      console.error('[Purchase]', e);
      status('purchaseStatus', 'error', e.message || 'Gagal mengirim');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Kirim Konfirmasi';
      }
    }
  }

  /* ============================================================
     BINDING
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnConfirmPurchase')?.addEventListener('click', submitPurchase);
  });

  /* ============================================================
     EXPOSE
     ============================================================ */
  App.loadStore = loadStore;
  App.openPurchase = openPurchase;

})();
