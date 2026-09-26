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
      wrap.innerHTML = App.state.adminPackages.map(p => `
        <button data-pkg="${esc(p.id)}" class="pkg-btn card-base text-left hover:border-brand-400 transition-all">
          <div class="text-[10px] font-black uppercase tracking-widest text-brand-600 mb-1">${esc(p.name)}</div>
          <div class="text-2xl font-black text-slate-800">${p.credits}</div>
          <div class="text-[11px] text-slate-500 font-bold mb-2">kredit</div>
          <div class="text-sm font-black text-emerald-600">${formatRupiah(p.price_idr)}</div>
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
      listEl.innerHTML = purchases.map(p => {
        const st = stMap[p.status] || stMap.pending;
        return `
          <div class="rounded-2xl bg-white border border-slate-100 p-3.5 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 grid place-items-center flex-shrink-0 font-black">
              ${p.credits}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-xs">${esc(p.package_name)}</div>
              <div class="text-[10px] text-slate-500">${App.formatDateTime(p.created_at)}</div>
            </div>
            <div class="text-right flex-shrink-0">
              <div class="font-mono font-black text-xs text-slate-700">${formatRupiah(p.price_idr)}</div>
              <span class="inline-block px-2 py-0.5 rounded-md ${st.cls} text-[9px] font-black uppercase">${st.label}</span>
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
