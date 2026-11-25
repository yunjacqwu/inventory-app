// Dashboard ringkasan inventory. Semua data diambil dari endpoint yang sudah ada.
// Grafik memakai Chart.js (dimuat lewat CDN di index.html).
(function () {
    const BATAS_MENIPIS = 5;          // stok sparepart (total per item) <= ini dianggap menipis
    const BLUE = '#2a78d6';           // categorical slot 1 (sparepart)
    const ORANGE = '#eb6834';         // categorical slot 2 (oli)
    const CRITICAL = '#d03b3b';       // status critical: stok menipis
    const GRID = '#e5e7eb';
    const TEXT = '#52514e';

    const num = (v) => parseFloat(v) || 0;
    const fmt = (n) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 });

    // 12 bulan terakhir, dari bulan ini mundur: [{key:'2026-11', label:'Nov 26'}, ...]
    function bulanTerakhir() {
        const out = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            out.push({ key, label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) });
        }
        return out;
    }
    const bulan = bulanTerakhir();
    const bulanIni = bulan[bulan.length - 1].key;
    const countByMonth = (rows, field) => {
        const m = Object.fromEntries(bulan.map((b) => [b.key, 0]));
        rows.forEach((r) => { const k = String(r[field]).slice(0, 7); if (k in m) m[k]++; });
        return bulan.map((b) => m[b.key]);
    };

    const get = (url) => fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${url} -> ${r.status}`);
        return r.json();
    });

    Promise.all([
        get('/pemakaian'), get('/pemakaian_oli'), get('/stok_sparepart'),
        get('/stok_oli'), get('/ban/tersedia'), get('/pban/all'),
    ]).then(([pakaiSp, pakaiOli, stokSp, stokOli, banTersedia, pban]) => {
        renderKpi(pakaiSp, pakaiOli, stokSp, stokOli, banTersedia);
        renderBulan(pakaiSp, pakaiOli);
        renderStok(stokSp);
        renderKendaraan(pakaiSp, pakaiOli);
        renderBan(pban);
        document.getElementById('status').textContent =
            'Diperbarui ' + new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    }).catch((err) => {
        document.getElementById('status').textContent = 'Gagal memuat data: ' + err.message;
    });

    // Total stok per item (sparepart bisa punya beberapa batch masuk)
    function stokPerItem(stokSp) {
        const total = {};
        stokSp.forEach((r) => { total[r.nama_sparepart] = (total[r.nama_sparepart] || 0) + num(r.jumlah); });
        return total;
    }

    function renderKpi(pakaiSp, pakaiOli, stokSp, stokOli, banTersedia) {
        const menipis = Object.values(stokPerItem(stokSp)).filter((j) => j <= BATAS_MENIPIS).length;
        const pakaiBulanIni = [...pakaiSp, ...pakaiOli]
            .filter((r) => String(r.tanggal || r.tanggal_pakai).slice(0, 7) === bulanIni).length;
        const oli = stokOli.reduce((s, r) => s + num(r.total_stok), 0);
        const ban = banTersedia.reduce((s, r) => s + num(r.jumlah), 0);

        document.getElementById('kpi-menipis').textContent = fmt(menipis);
        document.getElementById('kpi-pakai').textContent = fmt(pakaiBulanIni);
        document.getElementById('kpi-oli').textContent = fmt(oli);
        document.getElementById('kpi-ban').textContent = fmt(ban);
        if (menipis > 0) document.getElementById('kpi-menipis').parentElement.classList.add('alert');
    }

    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: TEXT } } },
        scales: {
            x: { ticks: { color: TEXT }, grid: { color: GRID } },
            y: { beginAtZero: true, ticks: { color: TEXT, precision: 0 }, grid: { color: GRID } },
        },
    };

    function renderBulan(pakaiSp, pakaiOli) {
        new Chart(document.getElementById('chartBulan'), {
            type: 'line',
            data: {
                labels: bulan.map((b) => b.label),
                datasets: [
                    { label: 'Sparepart', data: countByMonth(pakaiSp, 'tanggal'), borderColor: BLUE, backgroundColor: BLUE, borderWidth: 2, pointRadius: 3, tension: 0.3 },
                    { label: 'Oli', data: countByMonth(pakaiOli, 'tanggal_pakai'), borderColor: ORANGE, backgroundColor: ORANGE, borderWidth: 2, pointRadius: 3, tension: 0.3 },
                ],
            },
            options: { ...baseOptions, interaction: { mode: 'index', intersect: false } },
        });
    }

    function renderStok(stokSp) {
        const entries = Object.entries(stokPerItem(stokSp)).sort((a, b) => a[1] - b[1]).slice(0, 10);
        new Chart(document.getElementById('chartStok'), {
            type: 'bar',
            data: {
                labels: entries.map(([nama]) => nama),
                datasets: [{
                    label: 'Sisa stok',
                    data: entries.map(([, j]) => j),
                    backgroundColor: entries.map(([, j]) => (j <= BATAS_MENIPIS ? CRITICAL : BLUE)),
                    borderRadius: 4,
                }],
            },
            options: {
                ...baseOptions,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
            },
        });
    }

    function renderKendaraan(pakaiSp, pakaiOli) {
        const total = {};
        [...pakaiSp, ...pakaiOli].forEach((r) => {
            const nama = r.plat ? `${r.plat}` : `Kendaraan ${r.kendaraan_id || r.id_kendaraan}`;
            total[nama] = (total[nama] || 0) + 1;
        });
        const entries = Object.entries(total).sort((a, b) => b[1] - a[1]).slice(0, 10);
        new Chart(document.getElementById('chartKendaraan'), {
            type: 'bar',
            data: {
                labels: entries.map(([nama]) => nama),
                datasets: [{ label: 'Transaksi', data: entries.map(([, n]) => n), backgroundColor: BLUE, borderRadius: 4 }],
            },
            options: { ...baseOptions, plugins: { legend: { display: false } } },
        });
    }

    function renderBan(pban) {
        new Chart(document.getElementById('chartBan'), {
            type: 'bar',
            data: {
                labels: bulan.map((b) => b.label),
                datasets: [{ label: 'Ban dipasang', data: countByMonth(pban, 'tgl_pasang_ban_baru'), backgroundColor: ORANGE, borderRadius: 4 }],
            },
            options: { ...baseOptions, plugins: { legend: { display: false } } },
        });
    }
})();
