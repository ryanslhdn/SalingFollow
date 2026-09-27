/* ============================================================
   STORE — Beli kredit
   ============================================================ */

(function() {
  const { $, esc, toast, icon, status, clearStatus, openModal, closeModal, formatRupiah } = App;

  async function loadStore() {
    // Paket
    const { data: pkgs } = await sb.from('credit_packages').select('*').eq('is_active', true).order('sort_order');
    App.state.adminPackages = pkgs || [];

    const wrap = $('storePackages');
    if (!App.state.adminPackages.length) {
      wrap.innerHTML = '<div class="col-span-2 text-center text-sm text-slate-500 py-8">Belum ada paket</div>';
    } else {
      wrap.innerHTML = App.state.adminPackages.map((p, i) => `
        <button data-pkg="${esc(p.id)}" class="pkg-card" style="animation-delay:${i * 60}ms">
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

    // Info pembayaran
    const { data: settings } = await sb.from('app_settings').select('*');
    const map = Object.fromEntries((settings || []).map(s => [s.key, s.value]));
    $('storePaymentInfo').textContent = map.payment_info || 'Hubungi admin untuk info pembayaran.';

    // Riwayat pembelian user
    const { data: purchases } = await sb.from('credit_purchases')
      .select('*').eq('user_id', App.state.user.id)
      .order('created_at', { ascending: false }).limit(20);

    const listEl = $('myPurchases');
    if (!purchases?.length) {
      listEl.innerHTML = '<div class="text-center text-xs text-slate-400 py-6">Belum ada pembelian</div>';
    } else {
      const stMap = {
        pending:  { label:'Menunggu', cls:'bg-amber-50 text-amber-700' },
        approved: { label:'Disetujui', cls:'bg-emerald-50 text-emerald-700' },
        rejected: { label:'Ditolak', cls:'bg-red-50 text-red-700' },
      };
      listEl.innerHTML = purchases.map((p, i) => {
        const stMap = {
          pending:  { label:'Menunggu',  cls:'pending' },
          approved: { label:'Disetujui', cls:'success' },
          rejected: { label:'Ditolak',   cls:'danger' },
        };
        const st = stMap[p.status] || stMap.pending;
        return `
          <div class="purchase-item" style="animation-delay:${i * 40}ms">
            <div class="pi-badge">${p.credits}</div>
            <div class="pi-body">
              <div class="pi-name">${esc(p.package_name)}</div>
              <div class="pi-date">${App.formatDateTime(p.created_at)}</div>
            </div>
            <div class="pi-right">
              <div class="pi-price">${formatRupiah(p.price_idr)}</div>
              <span class="hi-status ${st.cls}" style="margin-top:4px">${st.label}</span>
            </div>
          </div>`;
      }).join('');
    }

    icon();
  }

  function openPurchase(pkgId) {
    const pkg = App.state.adminPackages.find(p => p.id === pkgId);
    if (!pkg) return;
    App.state.currentPackage = pkg;
    clearStatus('purchaseStatus');
    $('purchaseSummary').innerHTML = `
      <div class="text-lg font-black text-slate-800 mb-1">${pkg.credits} kredit</div>
      <div class="text-sm text-slate-500 mb-1">${esc(pkg.name)}</div>
      <div class="text-lg font-black text-emerald-600">${formatRupiah(pkg.price_idr)}</div>
    `;
    openModal('modalPurchase');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnConfirmPurchase')?.addEventListener('click', async () => {
      const method = $('purchaseMethod').value;
      const note = $('purchaseNote').value.trim() || null;
      const pkg = App.state.currentPackage;
      if (!pkg) return;

      const btn = $('btnConfirmPurchase');
      btn.disabled = true;
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
        loadStore();
      } catch (e) {
        status('purchaseStatus', 'error', e.message || 'Gagal');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Kirim Konfirmasi';
      }
    });
  });

  App.loadStore = loadStore;
})();
