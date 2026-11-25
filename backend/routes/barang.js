const express = require('express');
const db = require('../db.js');
const { tolakInputTidakValid } = require('../helpers/validasi.js');

const router = express.Router();

// BARANG (OUTPUT) ENDPOINTS
// ========================================

// POST /barang
// Page: barang.html | JS: js/barang/barang.js
// Fungsi: Menyimpan data output barang (pengeluaran barang langsung ke kendaraan)
router.post("/barang", (req, res) => {
    const { no_seri, nama_barang, merk, jumlah, satuan, harga, vendor_id, kendaraan_id, penanggung_jawab, tanggal } = req.body;
    if (tolakInputTidakValid(req, res, ["nama_barang","satuan"], ["jumlah"])) return;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.query(
        "INSERT INTO barang (no_seri, nama_barang, merk, jumlah, satuan, harga, vendor_id, kendaraan_id, penanggung_jawab, tanggal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [no_seri, nama_barang, merk, jumlahNum, satuan, harga, vendor_id, kendaraan_id, penanggung_jawab, tanggal],
        (err, result) => {
            if (err) {
                console.error("Error /barang POST:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json({ success: true, id: result.insertId });
        }
    );
});

// GET /barang
// Page: rekap.html | JS: js/barang/rekap.js
// Fungsi: Mengambil data barang untuk laporan rekap lama (dari tabel barang)
router.get("/barang", (req, res) => {
    const sql = `
    SELECT b.id, b.no_seri, b.nama_barang, b.jumlah, b.satuan, b.harga,
           v.nama_vendor, k.dt_mobil, k.plat,
           b.penanggung_jawab, b.tanggal
    FROM barang b
    LEFT JOIN vendor v ON b.vendor_id = v.id
    LEFT JOIN kendaraan k ON b.kendaraan_id = k.id
    ORDER BY b.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /barang GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// ========================================
module.exports = router;
