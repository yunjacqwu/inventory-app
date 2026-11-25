// Generator data contoh (DUMMY) untuk db_stok: catatan setahun, stok konsisten dengan pemakaian.
// Pakai: node backend/database/gen_seed.js > backend/database/seed_data.sql
// Deterministik (seed tetap), jadi hasilnya sama setiap dijalankan.

let rs = 20260126;
const rnd = () => {
  rs = (rs + 0x6D2B79F5) | 0;
  let t = Math.imul(rs ^ (rs >>> 15), 1 | rs);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const BASE = Date.UTC(2026, 0, 5); // hari 0 = 2026-01-05
const DAYS = 325;                  // sampai 2026-11-25
const dateOf = (d) => new Date(BASE + d * 864e5).toISOString().slice(0, 10);
const stamp = (d) => dateOf(d) + ` ${String(int(7, 17)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00`;

const PJ = ['Budi Santoso', 'Agus Wijaya', 'Dedi Kurniawan', 'Rizky Pratama', 'Rina Marlina', 'Hendra Setiawan', 'Joko Purnomo', 'Yudi Saputra'];

const vendors = [
  [1, 'CV Sumber Jaya Motor'], [2, 'UD Maju Bersama Spareparts'], [3, 'PT Anugerah Ban Nusantara'],
  [4, 'Toko Oli Makmur'], [5, 'PT Mitra Otomotif Sejahtera'], [6, 'CV Karya Teknik Mandiri'],
  [7, 'UD Berkah Jaya Truk'], [8, 'PT Sinar Logam Abadi'],
];
const kendaraan = [
  [1, 'Hino Dutro 130 HD', 'B 9021 TKP'], [2, 'Mitsubishi Colt Diesel L300', 'B 8457 UJQ'],
  [3, 'Isuzu Elf NLR', 'D 1834 KXA'], [4, 'Toyota Hilux 2.4 G', 'B 1120 RFA'],
  [5, 'Hino Ranger FM', 'F 8831 LZ'], [6, 'Daihatsu Gran Max', 'B 7712 SNC'],
  [7, 'Isuzu Traga', 'T 4420 WB'], [8, 'Mitsubishi Fuso FE 71', 'AB 9054 CD'],
  [9, 'Toyota Avanza 1.3 G', 'B 1543 PKR'], [10, 'Suzuki Carry Pick Up', 'D 6612 NAB'],
];
const KEND_IDS = kendaraan.map((k) => k[0]);

// Katalog sparepart. use = [min,max] per pemakaian; rs = [min,max] jumlah per restock.
const catalog = [
  { n: 'Filter Oli Hino Dutro', c: 'FO-HNO', s: 'pcs', h: 85000, v: 1, rs: [10, 25], use: [1, 2] },
  { n: 'Filter Oli Gran Max', c: 'FO-GM', s: 'pcs', h: 42000, v: 2, rs: [10, 20], use: [1, 2] },
  { n: 'Kampas Rem Depan Colt Diesel', c: 'KR-MIT', s: 'set', h: 265000, v: 2, rs: [6, 12], use: [1, 1] },
  { n: 'Kampas Rem Belakang Elf', c: 'KB-ELF', s: 'set', h: 230000, v: 2, rs: [6, 10], use: [1, 1] },
  { n: 'Busi NGK BKR6E', c: 'NGK-BKR6E', s: 'pcs', h: 28000, v: 1, rs: [20, 40], use: [2, 4] },
  { n: 'Busi NGK IKH20', c: 'NGK-IKH20', s: 'pcs', h: 33000, v: 1, rs: [12, 24], use: [2, 4] },
  { n: 'Aki GS Astra 100Ah', c: 'GS-N100', s: 'pcs', h: 1150000, v: 2, rs: [4, 8], use: [1, 1] },
  { n: 'V-Belt Fan Isuzu Elf', c: 'VB-ISZ', s: 'pcs', h: 145000, v: 1, rs: [4, 10], use: [1, 1] },
  { n: 'Radiator Cap 1.1 Bar', c: 'RC-110', s: 'pcs', h: 35000, v: 2, rs: [10, 20], use: [1, 2] },
  { n: 'Oli Transmisi Hypoid 90', c: 'HYP90', s: 'liter', h: 52000, v: 4, rs: [20, 40], use: [2, 6] },
  { n: 'Lampu Depan H4 12V', c: 'LH4-12', s: 'pcs', h: 98000, v: 2, rs: [6, 12], use: [1, 2] },
  { n: 'Shockbreaker Belakang Hilux', c: 'SB-HLX', s: 'pcs', h: 485000, v: 5, rs: [2, 6], use: [1, 1] },
  { n: 'Filter Udara Gran Max', c: 'FU-GM', s: 'pcs', h: 72000, v: 2, rs: [6, 12], use: [1, 1] },
  { n: 'Filter Solar Hino', c: 'FS-HNO', s: 'pcs', h: 118000, v: 6, rs: [6, 12], use: [1, 2] },
  { n: 'Wiper Blade 16 inci', c: 'WB-16', s: 'pcs', h: 78000, v: 2, rs: [6, 12], use: [1, 2] },
  { n: 'Kabel Rem Tangan Traga', c: 'KRT-TRG', s: 'pcs', h: 65000, v: 6, rs: [4, 8], use: [1, 1] },
  { n: 'Grease Multipurpose', c: 'GRS', s: 'kg', h: 90000, v: 5, rs: [5, 10], use: [1, 2] },
  { n: 'Cairan Radiator', c: 'CR-LTR', s: 'liter', h: 38000, v: 8, rs: [10, 20], use: [1, 3] },
];

const oilItems = [
  { n: 'Pertamina Enduro 15W-40', no: 'PE-1540', h: 68000 },
  { n: 'Shell Rimula R4 X 15W-40', no: 'SR-R4X', h: 72000 },
  { n: 'Castrol GTX 10W-30', no: 'CG-GTX', h: 75000 },
];
const OLI_KET = ['Ganti oli rutin', 'Ganti oli + filter oli', 'Ganti oli mesin', 'Ganti oli berkala km'];
const BAN_MERK = [
  ['Bridgestone R173 10.00-20', 'BR-R173', 2150000], ['GT Radial Savero 1000-20', 'GT-SV', 1650000],
  ['Michelin XZY 1000-20', 'MX-XZY', 2600000], ['Dunlop SP 1000-20', 'DL-SP', 1800000],
  ['Vee Rubber 1000-20', 'VR-1000', 1450000],
];

// ---------- Event: restock & pemakaian, diproses urut tanggal ----------
const events = [];
const sparepartBatches = []; // {id, item, day, qty, rem}
const oilBatches = [];       // {id, item, day, qty, rem}

catalog.forEach((item, idx) => {
  const n = int(2, 3);
  for (let i = 0; i < n; i++) events.push({ day: int(i === 0 ? 0 : 40, DAYS - 60), kind: 'rsp', item: idx });
});
oilItems.forEach((item, idx) => {
  const n = idx === 0 ? 4 : 2;
  for (let i = 0; i < n; i++) events.push({ day: int(i === 0 ? 0 : 30, DAYS - 60), kind: 'roli', item: idx });
});
for (let i = 0; i < 260; i++) events.push({ day: int(1, DAYS - 1), kind: 'usp' });
for (let i = 0; i < 110; i++) events.push({ day: int(1, DAYS - 1), kind: 'uoli' });
events.sort((a, b) => a.day - b.day || (a.kind.startsWith('r') ? 0 : 1) - (b.kind.startsWith('r') ? 0 : 1));

const spRows = [], brRows = [], pakaiRows = [], histRows = [];
const oliRows = [], stokOliRows = [], pakaiOliRows = [], histOliRows = [];
const usageSp = (ev) => {
  const weighted = catalog;
  const item = pick(weighted);
  const itemIdx = catalog.indexOf(item);
  const cands = sparepartBatches.filter((b) => b.item === itemIdx && b.day <= ev.day);
  const qty = int(item.use[0], item.use[1]);
  const batch = cands.find((b) => b.rem >= qty); // FIFO
  if (!batch) return;
  const tanggal = ev.day;
  const kend = pick(KEND_IDS);
  const pj = pick(PJ);
  if (rnd() < 0.03) { // pemakaian yang dihapus: stok tidak berkurang, tercatat di histori
    histRows.push([batch.id, kend, qty, q(item.s), q(pj), q(dateOf(tanggal)), q('HAPUS: ' + pick(['salah input', 'kendaraan batal pakai', 'duplikat'])), q(stamp(tanggal + 1))]);
    return;
  }
  batch.rem -= qty;
  let tgl = tanggal;
  if (rnd() < 0.04 && tanggal + 1 < DAYS) { // diedit: histori menyimpan tanggal lama
    histRows.push([batch.id, kend, qty, q(item.s), q(pj), q(dateOf(tanggal)), q('EDIT: ' + pick(['tanggal salah input', 'koreksi tanggal pakai'])), q(stamp(tanggal + 1))]);
    tgl = tanggal + 1;
  }
  pakaiRows.push([batch.id, kend, qty, q(item.s), q(pj), q(dateOf(tgl))]);
};
const usageOli = (ev) => {
  const cands = oilBatches.filter((b) => b.day <= ev.day);
  const qty = int(4, 10);
  const batch = cands.find((b) => b.rem >= qty);
  if (!batch) return;
  batch.rem -= qty;
  pakaiOliRows.push([q(dateOf(ev.day)), batch.id, pick(KEND_IDS), qty, q(pick(OLI_KET))]);
};

for (const ev of events) {
  if (ev.kind === 'rsp') {
    const item = catalog[ev.item];
    const qty = int(item.rs[0], item.rs[1]);
    const id = sparepartBatches.length + 1;
    const noSeri = `${item.c}-${String(id).padStart(3, '0')}`;
    sparepartBatches.push({ id, item: ev.item, day: ev.day, qty, rem: qty });
    spRows.push([id, q(dateOf(ev.day)), q(item.n), q(noSeri), 0, q(item.s), item.h, item.v]); // jumlah diisi nanti
    brRows.push([id, q(dateOf(ev.day)), q(item.n), q(noSeri), qty, q(item.s), item.h, item.v]);
  } else if (ev.kind === 'usp') {
    usageSp(ev);
  } else if (ev.kind === 'roli') {
    const item = oilItems[ev.item];
    const qty = int(30, 80);
    const id = oilBatches.length + 1;
    oilBatches.push({ id, item: ev.item, day: ev.day, qty, rem: qty });
    oliRows.push([q(dateOf(ev.day)), q(item.n), q(`${item.no}-${String(id).padStart(3, '0')}`), qty, 0, qty, qty, q('liter'), item.h, 4, 'NULL', 'NULL', q(ev.item === 0 ? 'Pembelian rutin' : 'Restock')]);
  } else if (ev.kind === 'uoli') {
    usageOli(ev);
  }
}

// Isi jumlah sisa di stok_sparepart dari batch
spRows.forEach((r) => { r[4] = sparepartBatches[r[0] - 1].rem; });
oilBatches.forEach((b) => {
  const r = oliRows[b.id - 1];
  r[6] = b.rem; // stok_tersisa (total_masuk tetap)
  stokOliRows.push([b.id, b.rem]);
});

// ---------- Barang (pembelian lain) ----------
const barangItems = [
  ['Kabel Aki Positif', 'Federal', 65000], ['Ban Dalam 1000-20', 'Tubeless Pro', 120000],
  ['Wiper Blade 16 inci', 'Bosch', 78000], ['Lampu Sein Belakang', 'Koito', 95000],
  ['Kampas Kopling', 'Exedy', 410000], ['Oli Rem DOT 3', 'Castrol', 45000], ['Sabuk Pengaman', 'Takata', 350000],
];
const barangRows = [];
for (let i = 0; i < 24; i++) {
  const [nm, mk, hg] = pick(barangItems);
  barangRows.push([q(`BRG-${String(i + 1).padStart(3, '0')}`), q(nm), q(mk), int(1, 4), q('pcs'), hg, int(1, 8), pick(KEND_IDS), q(pick(PJ)), q(dateOf(int(0, DAYS - 1)))]);
}

// ---------- Ban ----------
const stokBanRows = [];
const banBatches = [];
for (let i = 1; i <= 10; i++) {
  const [merk, kode, hg] = pick(BAN_MERK);
  const day = int(0, 200);
  banBatches.push({ id: i, day, merk, seri: `${kode}-${String(i).padStart(2, '0')}` });
  stokBanRows.push([i, q(dateOf(day)), q(merk), q(`${kode}-${String(i).padStart(2, '0')}`), int(2, 8), q('pcs'), hg, 3]);
}
const penukaranRows = [];
const lastKm = {};
KEND_IDS.forEach((k) => { lastKm[k] = int(120000, 240000); });
const TRUCKS = [1, 2, 3, 5, 7, 8];
const usedBan = banBatches.slice(0, 8); // 8 ban dipakai, 2 masih tersedia
const penukaranEvents = usedBan.map((b) => ({ b, day: int(b.day + 10, DAYS - 1) })).sort((a, b) => a.day - b.day);
penukaranEvents.forEach(({ b, day }, i) => {
  const k = pick(TRUCKS);
  const kmAwal = lastKm[k];
  const jarak = int(12000, 30000);
  const kmAkhir = kmAwal + jarak;
  lastKm[k] = kmAkhir;
  const lama = pick(BAN_MERK);
  penukaranRows.push({
    id: i + 1, row: [k, q(pick(PJ)), q(dateOf(Math.max(0, day - int(60, 200)))), q(lama[0]), q(`${lama[1]}-OLD-${int(100, 999)}`), kmAwal, kmAkhir, jarak, kmAkhir - int(0, 80),
      q(pick(['Ban bocor', 'Alur sudah tipis', 'Sobek sisi samping', 'Penggantian berkala', 'Ban pecah di jalan'])), q(dateOf(day)), q(b.merk), q(b.seri), b.id],
    day,
  });
});
const histBanRows = [];
[0, 3].forEach((i) => {
  const p = penukaranRows[i];
  histBanRows.push([...p.row, q(stamp(p.day + 1))]);
});

// ---------- Output SQL ----------
const out = [];
const ins = (table, cols, rows) => {
  for (let i = 0; i < rows.length; i += 200) {
    out.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES\n` + rows.slice(i, i + 200).map((r) => '(' + r.join(', ') + ')').join(',\n') + ';');
  }
};
out.push('-- ============================================================');
out.push('-- Data contoh untuk db_stok (DUMMY, bukan data asli). Dibuat oleh gen_seed.js.');
out.push('-- Khusus untuk database yang masih KOSONG. Jangan dijalankan di database yang sudah berisi data.');
out.push('-- ============================================================');
ins('vendor', ['id', 'nama_vendor'], vendors.map(([i, n]) => [i, q(n)]));
ins('kendaraan', ['id', 'dt_mobil', 'plat'], kendaraan.map(([i, d, p]) => [i, q(d), q(p)]));
ins('stok_sparepart', ['id', 'tgl_sparepart_masuk', 'nama_sparepart', 'no_seri', 'jumlah', 'satuan', 'harga', 'id_vendor'], spRows);
ins('barang_masuk', ['id', 'tgl_sparepart_masuk', 'nama_sparepart', 'no_seri', 'jumlah', 'satuan', 'harga', 'id_vendor'], brRows);
ins('pemakaian_sparepart', ['sparepart_id', 'kendaraan_id', 'jumlah', 'satuan', 'penanggung_jawab', 'tanggal'], pakaiRows);
ins('histori_pemakaian', ['sparepart_id', 'kendaraan_id', 'jumlah', 'satuan', 'penanggung_jawab', 'tanggal', 'keterangan', 'created_at'], histRows);
ins('barang', ['no_seri', 'nama_barang', 'merk', 'jumlah', 'satuan', 'harga', 'vendor_id', 'kendaraan_id', 'penanggung_jawab', 'tanggal'], barangRows);
ins('stok_ban', ['id', 'tgl_ban_masuk', 'merk_ban', 'no_seri', 'jumlah', 'satuan', 'harga', 'id_vendor'], stokBanRows);
ins('penukaran_ban', ['id_kendaraan', 'supir', 'tanggal_pasang_lama', 'merk_lama', 'seri_lama', 'km_awal', 'km_akhir', 'jarak_km', 'km_gps', 'keterangan', 'tgl_pasang_ban_baru', 'merk_baru', 'seri_ban_baru', 'id_stok'], penukaranRows.map((p) => p.row));
ins('histori_ban', ['id_kendaraan', 'supir', 'tanggal_pasang_lama', 'merk_lama', 'seri_lama', 'km_awal', 'km_akhir', 'jarak_km', 'km_gps', 'keterangan', 'tgl_pasang_ban_baru', 'merk_baru', 'seri_ban_baru', 'id_stok', 'created_at'], histBanRows);
ins('oli_masuk', ['tanggal_masuk', 'nama_oli', 'no_seri', 'jumlah_baru', 'sisa_lama', 'total_masuk', 'stok_tersisa', 'satuan', 'harga', 'id_vendor', 'id_oli_lama', 'id_oli_baru', 'keterangan'], oliRows);
ins('stok_oli', ['id_oli_masuk', 'total_stok'], stokOliRows);
ins('pemakaian_oli', ['tanggal_pakai', 'id_oli_masuk', 'id_kendaraan', 'jumlah_pakai', 'keterangan'], pakaiOliRows);
console.log(out.join('\n'));
