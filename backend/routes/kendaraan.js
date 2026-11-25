const express = require('express');
const db = require('../db.js');

const router = express.Router();

// KENDARAAN ENDPOINTS
// ========================================

// POST /kendaraan
// Page: kendaraan.html | JS: js/master/kendaraan.js
// Fungsi: Menambahkan kendaraan baru ke database
router.post("/kendaraan", (req, res) => {
    const { dt_mobil, plat } = req.body;
    db.query(
        "INSERT INTO kendaraan (dt_mobil, plat) VALUES (?, ?)",
        [dt_mobil, plat],
        (err, result) => {
            if (err) {
                console.error("Error /kendaraan POST:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            return res.status(200).json({ message: "Berhasil Menambahkan Kendaraan", id: result.insertId });
        }
    );
});

// GET /kendaraan
// Pages: kendaraan.html, pemakaian.html, pemakaianoli.html, rekap.html, rekapsemua.html, rekapoli.html, pban.html, lapban.html
// JS: js/master/kendaraan.js, js/sparepart/pemakaian.js, js/barang/rekap.js, js/barang/barang.js, js/ban/pban.js, js/ban/lapban.js, js/literan/pemakaianoli.js, js/literan/rekapoli.js
// Fungsi: Mengambil daftar kendaraan untuk dropdown/filter di form pemakaian dan laporan
router.get("/kendaraan", (req, res) => {
    db.query("SELECT * FROM kendaraan", (err, results) => {
        if (err) {
            console.error("Error /kendaraan GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// PUT /kendaraan/:id
// Page: kendaraan.html | JS: js/master/kendaraan.js
// Fungsi: Mengupdate data kendaraan (dt_mobil dan plat)
router.put("/kendaraan/:id", (req, res) => {
    const { id } = req.params;
    const { dt_mobil, plat } = req.body;

    db.query(
        "UPDATE kendaraan SET dt_mobil = ?, plat = ? WHERE id = ?",
        [dt_mobil, plat, id],
        (err, result) => {
            if (err) {
                console.error("Error /kendaraan/:id PUT:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Kendaraan tidak ditemukan" });
            res.json({ message: "Kendaraan berhasil diperbarui" });
        }
    );
});

// DELETE /kendaraan/:id
// Page: kendaraan.html | JS: js/master/kendaraan.js
// Fungsi: Menghapus kendaraan dari database
router.delete("/kendaraan/:id", (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM kendaraan WHERE id = ?", [id], (err, result) => {
        if (err) {
            console.error("Error /kendaraan/:id DELETE:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        if (result.affectedRows === 0) return res.status(404).json({ message: "Kendaraan tidak ditemukan" });
        res.json({ message: "Kendaraan berhasil dihapus" });
    });
});

// ========================================
module.exports = router;
