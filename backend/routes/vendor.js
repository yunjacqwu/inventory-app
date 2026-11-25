const express = require('express');
const db = require('../db.js');
const { tolakInputTidakValid } = require('../helpers/validasi.js');

const router = express.Router();

// VENDOR ENDPOINTS
// ========================================

// POST /vendor
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Menambahkan vendor baru ke database
router.post("/vendor", (req, res) => {
    const { nama_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["nama_vendor"], [])) return;
    db.query(
        "INSERT INTO vendor (nama_vendor) VALUES (?)",
        [nama_vendor.trim()],
        (err) => {
            if (err) {
                console.error("Error /vendor POST:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            return res.status(200).json({ message: "Berhasil Menambahkan Vendor" });
        }
    );
});

// GET /vendor
// Pages: vendor.html, barang.html, ban.html, insparepart.html, inoli.html, rekap.html, rekapsemua.html, rekapoli.html
// JS: js/master/vendor.js, js/barang/barang.js, js/barang/rekap.js, js/ban/ban.js, js/ban/lapban.js, js/sparepart/insparepart.js, js/sparepart/rekapsemua.js, js/literan/inoli.js, js/literan/rekapoli.js
// Fungsi: Mengambil daftar semua vendor untuk dropdown/filter di form input dan laporan
router.get("/vendor", (req, res) => {
    db.query("SELECT * FROM vendor", (err, results) => {
        if (err) {
            console.error("Error /vendor GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// GET /vendor/:id
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Mengambil detail vendor tertentu untuk keperluan edit
router.get("/vendor/:id", (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM vendor WHERE id = ?", [id], (err, results) => {
        if (err) {
            console.error("Error /vendor/:id GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        if (!results || results.length === 0) return res.status(404).json({ message: "Vendor tidak ditemukan" });
        res.json(results[0]);
    });
});

// PUT /vendor/:id
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Mengupdate data vendor berdasarkan ID
router.put("/vendor/:id", (req, res) => {
    const { id } = req.params;
    const { nama_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["nama_vendor"], [])) return;

    db.query(
        "UPDATE vendor SET nama_vendor = ? WHERE id = ?",
        [nama_vendor.trim(), id],
        (err, result) => {
            if (err) {
                console.error("Error /vendor/:id PUT:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Vendor tidak ditemukan" });
            res.json({ message: "Vendor berhasil diperbarui" });
        }
    );
});

// DELETE /vendor/:id
// Page: vendor.html | JS: js/master/vendor.js
// Fungsi: Menghapus vendor dari database
router.delete("/vendor/:id", (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM vendor WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Error /vendor/:id DELETE:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: "Vendor tidak ditemukan" });
        res.json({ message: "Vendor berhasil dihapus" });
    });
});

// ========================================
module.exports = router;
