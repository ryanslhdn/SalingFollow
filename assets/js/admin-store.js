/* ============================================================
   ADMIN STORE — Kelola toko & paket kredit
   ============================================================ */

window.AdminStore = (function() {
  const ADMIN_KEY = () => sessionStorage.getItem('sf_admin_key');
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatRupiah = (n) => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
  const icon = () => window.lucide && lucide.createIcons();
  const toast = (m, t) => App.toast && App.toast(m, t || 'info');

  let cache = [];
  let storeOpen = true;

  /* ============================================================
     LOAD ALL — dipanggil saat tab Toko dibuka
     ============================================================ */
  async function load() {
    await Promise.all([loadStoreStatus(), loadPackages()]);
  }

  /* ============================================================
     STATUS TOKO
     ============================================================ */
  async function loadStoreStatus() {
    try {
      const { data } = await sb.from('app_settings').select('*');
      const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));
      storeOpen = map.store_open !== '0';

      $('storeOpenToggle').checked = storeOpen;
      $('storeClosedMsg').value = map.store_closed_msg || '';
      updateStatusBox();
    } catch (e) {
      console.error('[AdminStore] status', e);
    }
  }

  function updateStatusBox() {
    const box = $('storeStatusBox');
    const ico = $('storeStatusIcon');
    const title = $('storeStatusTitle');
    const desc = $('storeStatusDesc');

    if (storeOpen) {
      box.style.borderColor = '#86efac';
      box.style.background = '#f0fdf4';
      ico.style.background = '#d1fae5';
      ico.style.color = '#047857';
      ico.innerHTML = '<i data-lucide="store" style="width:24px;height:24px"></i>';
      title.textContent = '🟢 Toko BUKA';
      title.style.color = '#047857';
      desc.textContent = 'User bisa lihat & beli paket kredit.';
    } else {
      box.style.borderColor = '#fca5a5';
      box.style.background = '#fef2f2';
      ico.style.background = '#fee2e2';
      ico.style.color = '#b91c1c';
      ico.innerHTML = '<i data-lucide="store" style="width:24px;height:24px"></i>';
      title.textContent = '🔴 Toko TUTUP';
      title.style.color = '#b91c1c';
      desc.textContent = 'User tidak bisa lihat atau beli paket.';
    }
    icon();
  }

  async function toggleStore(open) {
    const ok = await App.confirm({
      title: open ? 'Buka Toko?' : 'Tutup Toko?',
      desc: open
        ? 'User akan bisa lihat & beli paket kredit lagi.'
        : 'User tidak akan bisa lihat atau beli paket. Pastikan alasan jelas (mis. sedang sibuk).',
      okText: open ? 'Ya, Buka' : 'Ya, Tutup',
      cancelText: 'Batal',
      danger: !open,
      icon: open ? 'check-circle' : 'store'
    });
    if (!ok) {
      // Reset toggle
      $('storeOpenToggle').checked = !open;
      return;
    }

    try {
      const { error } = await sb.rpc('admin_update_setting', {
        p_key: ADMIN_KEY(),
        p_setting_key: 'store_open',
        p_value: open ? '1' : '0',
      });
      if (error) throw error;

      storeOpen = open;
      updateStatusBox();
      toast(open ? '✅ Toko dibuka' : '🔴 Toko ditutup', 'success');
    } catch (e) {
      console.error('[AdminStore] toggle', e);
      $('storeOpenToggle').checked = !open;
      toast(e.message || 'Gagal', 'error');
    }
  }

  async function saveClosedMsg() {
    const msg = $('storeClosedMsg').value.trim();
    if (!msg) return toast('Pesan wajib diisi', 'error');

    try {
      const { error } = await sb.rpc('admin_update_setting', {
        p_key: ADMIN_KEY(),
        p_setting_key: 'store_closed_msg',
        p_value: msg,
      });
      if (error) throw error;
      toast('Pesan tutup disimpan ✅', 'success');
    } catch (e) {
      console.error('[AdminStore] msg', e);
      toast(e.message || 'Gagal', 'error');
    }
  }

  /* ============================================================
     PAKET — list, form, save, delete
     ============================================================ */
  async function loadPackages() {
    const wrap = $('adminPackagesList');
    if (!wrap) return;

    wrap.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-3);font-size:13px">Memuat...</div>';

    try {
      const { data, error } = await sb.rpc('admin_list_packages', { p_key: ADMIN_KEY() });
      if (error) throw error;

      cache = data || [];

      if (!cache.length) {
        wrap.innerHTML = `
          <div class="empty-state" style="padding:32px 24px">
            <div class="empty-icon" style="width:56px;height:56px">
              <i data-lucide="package" style="width:24px;height:24px"></i>
            </div>
            <p class="empty-desc">Belum ada paket. Klik "Tambah Paket" untuk mulai.</p>
          </div>`;
        icon();
        return;
      }

      wrap.innerHTML = cache.map(p => {
        const isActive = p.is_active;
        return `
          <div class="admin-card" style="padding:14px;margin-bottom:10px;${!isActive ? 'opacity:.6' : ''}">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
              <div style="width:52px;height:52px;border-radius:14px;background:${isActive ? 'linear-gradient(135deg,#10b981,#047857)' : '#94a3b8'};color:#fff;display:grid;place-items:center;font-weight:900;font-size:16px;flex-shrink:0;font-variant-numeric:tabular-nums">
                ${p.credits}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:800;font-size:14px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</div>
                <div style="font-size:12px;color:var(--ink-3);margin-top:2px">
                  <b style="color:#059669">${formatRupiah(p.price_idr)}</b>
                  ${!isActive ? ' • <span style="color:#b45309;font-weight:700">NONAKTIF</span>' : ''}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:10px;color:var(--ink-3);font-weight:700;letter-spacing:.04em">RATIO</div>
                <div style="font-size:12.5px;font-weight:800;color:var(--ink);margin-top:2px">
                  ${p.credits > 0 ? Math.round(p.price_idr / p.credits) : 0} <span style="font-weight:600;color:var(--ink-3);font-size:11px">Rp/kredit</span>
                </div>
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button data-edit="${esc(p.id)}" style="flex:1;padding:9px;border-radius:9px;background:#eff6ff;color:#1e40af;font-weight:700;font-size:12px;border:1px solid #bfdbfe;font-family:inherit;cursor:pointer">
                <i data-lucide="pencil" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:4px"></i> Edit
              </button>
              <button data-toggle="${esc(p.id)}" style="flex:1;padding:9px;border-radius:9px;background:${isActive ? '#fef3c7' : '#d1fae5'};color:${isActive ? '#92400e' : '#047857'};font-weight:700;font-size:12px;border:1px solid ${isActive ? '#fcd34d' : '#86efac'};font-family:inherit;cursor:pointer">
                <i data-lucide="${isActive ? 'eye-off' : 'eye'}" style="width:13px;height:13px;display:inline;vertical-align:-2px;margin-right:4px"></i>
                ${isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <button data-del="${esc(p.id)}" style="padding:9px 14px;border-radius:9px;background:#fef2f2;color:#b91c1c;font-weight:700;font-size:12px;border:1px solid #fecaca;font-family:inherit;cursor:pointer">
                <i data-lucide="trash-2" style="width:13px;height:13px;display:inline;vertical-align:-2px"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');

      wrap.querySelectorAll('[data-edit]').forEach(b =>
        b.addEventListener('click', () => openPackageForm(b.dataset.edit)));
      wrap.querySelectorAll('[data-toggle]').forEach(b =>
        b.addEventListener('click', () => togglePackageActive(b.dataset.toggle)));
      wrap.querySelectorAll('[data-del]').forEach(b =>
        b.addEventListener('click', () => deletePackage(b.dataset.del)));

      icon();
    } catch (e) {
      console.error('[AdminStore] packages', e);
      wrap.innerHTML = `<div class="info-box danger"><i data-lucide="alert-circle"></i><span>${esc(e.message)}</span></div>`;
      icon();
    }
  }

  function openPackageForm(id) {
    const isEdit = !!id;
    const pkg = isEdit ? cache.find(p => p.id === id) : null;

    $('adminPkgTitle').textContent = isEdit ? 'Edit Paket' : 'Tambah Paket';
    $('adminPkgId').value = id || '';
    $('adminPkgName').value = pkg ? pkg.name : '';
    $('adminPkgCredits').value = pkg ? pkg.credits : '';
    $('adminPkgPrice').value = pkg ? pkg.price_idr : '';
    $('adminPkgActive').checked = pkg ? pkg.is_active : true;

    const statusEl = $('adminPkgStatus');
    if (statusEl) statusEl.classList.add('hidden');

    if (window.App && App.openModal) App.openModal('modalAdminPackage');
    setTimeout(() => $('adminPkgName')?.focus(), 200);
    icon();
  }

  async function savePackage() {
    const id = $('adminPkgId').value.trim();
    const name = $('adminPkgName').value.trim();
    const credits = parseInt($('adminPkgCredits').value) || 0;
    const price = parseInt($('adminPkgPrice').value) || 0;
    const isActive = $('adminPkgActive').checked;

    if (!name) return setPkgStatus('error', 'Nama paket wajib diisi');
    if (credits < 1) return setPkgStatus('error', 'Kredit minimal 1');
    if (price < 0) return setPkgStatus('error', 'Harga tidak boleh negatif');

    const btn = $('btnAdminSavePkg');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
    setPkgStatus('warn', 'Menyimpan...');

    try {
      let error;
      if (id) {
        // Update
        ({ error } = await sb.rpc('admin_update_package', {
          p_key: ADMIN_KEY(),
          p_id: id,
          p_name: name,
          p_credits: credits,
          p_price_idr: price,
          p_is_active: isActive,
        }));
      } else {
        // Create
        ({ error } = await sb.rpc('admin_create_package', {
          p_key: ADMIN_KEY(),
          p_name: name,
          p_credits: credits,
          p_price_idr: price,
        }));
      }

      if (error) throw error;

      toast(id ? 'Paket diupdate ✅' : 'Paket ditambahkan ✅', 'success');
      if (window.App && App.closeModal) App.closeModal('modalAdminPackage');
      await loadPackages();
    } catch (e) {
      console.error('[AdminStore] save', e);
      setPkgStatus('error', e.message || 'Gagal menyimpan');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" style="width:16px;height:16px"></i> Simpan';
        icon();
      }
    }
  }

  function setPkgStatus(type, msg) {
    const el = $('adminPkgStatus');
    if (!el) return;
    el.className = 'status-msg ' + type;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  async function togglePackageActive(id) {
    const pkg = cache.find(p => p.id === id);
    if (!pkg) return;

    try {
      const { error } = await sb.rpc('admin_update_package', {
        p_key: ADMIN_KEY(),
        p_id: id,
        p_name: pkg.name,
        p_credits: pkg.credits,
        p_price_idr: pkg.price_idr,
        p_is_active: !pkg.is_active,
      });
      if (error) throw error;

      toast(!pkg.is_active ? 'Paket diaktifkan ✅' : 'Paket dinonaktifkan', 'success');
      await loadPackages();
    } catch (e) {
      console.error('[AdminStore] toggle pkg', e);
      toast(e.message || 'Gagal', 'error');
    }
  }

  async function deletePackage(id) {
    const pkg = cache.find(p => p.id === id);
    if (!pkg) return;

    const ok = await App.confirm({
      title: 'Hapus Paket?',
      desc: `Paket "${pkg.name}" (${pkg.credits} kredit — ${formatRupiah(pkg.price_idr)}) akan dihapus permanen. Riwayat pembelian user tetap tersimpan.`,
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
      icon: 'trash-2'
    });
    if (!ok) return;

    try {
      const { error } = await sb.rpc('admin_delete_package', {
        p_key: ADMIN_KEY(),
        p_id: id,
      });
      if (error) throw error;

      toast('Paket dihapus', 'success');
      await loadPackages();
    } catch (e) {
      console.error('[AdminStore] delete', e);
      toast(e.message || 'Gagal', 'error');
    }
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  return {
    load,
    toggleStore,
    saveClosedMsg,
    openPackageForm,
    savePackage,
    loadPackages,
  };
})();
