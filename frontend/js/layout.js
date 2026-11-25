// Sidebar navigasi bersama untuk semua halaman. Menandai link halaman yang sedang dibuka.
(function () {
    const groups = [
        ['Dashboard', [['/index.html', 'Ringkasan']]],
        ['Master Data', [
            ['/vendor.html', 'Kelola Vendor'],
            ['/kendaraan.html', 'Kelola Kendaraan'],
        ]],
        ['Sparepart', [
            ['/insparepart.html', 'Input Sparepart'],
            ['/barang.html', 'Input Pemakaian Barang'],
            ['/pemakaian.html', 'Pemakaian Barang'],
            ['/editpemakaian.html', 'Edit Pemakaian Barang'],
            ['/rekapsemua.html', 'Rekap Semua Barang'],
            ['/rekap.html', 'Rekap Laporan'],
        ]],
        ['Ban', [
            ['/ban.html', 'Kelola Stok Ban'],
            ['/pban.html', 'Input Pemakaian Ban'],
            ['/lapban.html', 'Laporan Ban'],
        ]],
        ['Barang Literan', [
            ['/inoli.html', 'Barang Literan Masuk'],
            ['/pemakaianoli.html', 'Pemakaian Barang Literan'],
            ['/rekapoli.html', 'Rekap Barang Literan'],
        ]],
    ];

    const current = location.pathname === '/' ? '/index.html' : location.pathname;
    const nav = document.createElement('nav');
    nav.className = 'app-nav';
    nav.innerHTML = '<div class="brand">Inventory</div>' + groups.map(([title, links]) =>
        `<div class="group">${title}</div>` + links.map(([href, label]) =>
            `<a href="${href}"${href === current ? ' class="active" aria-current="page"' : ''}>${label}</a>`
        ).join('')
    ).join('');
    document.body.prepend(nav);
    document.body.classList.add('with-nav');
})();
