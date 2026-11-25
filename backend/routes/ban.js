const express = require('express');
const db = require('../db.js');
const { tolakInputTidakValid } = require('../helpers/validasi.js');

const router = express.Router();

// BAN ENDPOINTS
// ========================================

// GET /ban
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengambil ban yang tersedia untuk penukaran ban (tidak sedang dipakai dan belum pernah diganti)
router.get("/ban", (req, res) => {
    db.query(
        `SELECT b.*, v.nama_vendor
     FROM stok_ban b
     LEFT JOIN vendor v ON b.id_vendor = v.id
     WHERE NOT EXISTS (
       SELECT 1 FROM penukaran_ban pb WHERE pb.id_stok = b.id
     )
     AND NOT EXISTS (
       SELECT 1 FROM histori_ban hb WHERE hb.id_stok = b.id
     )
     ORDER BY b.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /ban GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// GET /ban/tersedia
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Mengambil ban tersedia (belum dipakai) dengan filter untuk input penukaran ban
router.get("/ban/tersedia", (req, res) => {
    try {
        let { vendor, merkBan } = req.query;

        let sql = `
      SELECT b.id, b.no_seri, b.merk_ban, b.jumlah, b.satuan, b.tgl_ban_masuk, b.harga, b.id_vendor, v.nama_vendor
      FROM stok_ban b
      LEFT JOIN vendor v ON b.id_vendor = v.id
      WHERE NOT EXISTS (
        SELECT 1 FROM penukaran_ban pb WHERE pb.id_stok = b.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM histori_ban hb WHERE hb.id_stok = b.id
      )
    `;
        const params = [];

        if (vendor) {
            sql += " AND b.id_vendor = ?";
            params.push(vendor);
        }

        if (merkBan) {
            sql += " AND b.merk_ban LIKE ?";
            params.push(`%${merkBan}%`);
        }

        sql += " ORDER BY b.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /ban/tersedia GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /ban/tersedia:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// POST /ban
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Menambahkan stok ban baru ke tabel stok_ban
router.post("/ban", (req, res) => {
    const { tgl_ban_masuk, merk_ban, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["merk_ban"], ["jumlah"])) return;
    const jumlahNum = parseInt(jumlah, 10) || 0;
    db.query(
        "INSERT INTO stok_ban (tgl_ban_masuk, merk_ban, no_seri, jumlah, satuan, harga, id_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [tgl_ban_masuk, merk_ban, no_seri, jumlahNum, satuan, harga, id_vendor],
        (err, result) => {
            if (err) {
                console.error("Error /ban POST:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.status(201).json({
                message: "Data ban berhasil ditambahkan",
                id: result.insertId
            });
        }
    );
});

// PUT /ban/:id
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Mengupdate data ban di tabel stok_ban
router.put("/ban/:id", (req, res) => {
    const { id } = req.params;
    const { tgl_ban_masuk, merk_ban, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["merk_ban"], ["jumlah"])) return;
    const jumlahNum = parseInt(jumlah, 10) || 0;

    db.query(
        "UPDATE stok_ban SET tgl_ban_masuk=?, merk_ban=?, no_seri=?, jumlah=?, satuan=?, harga=?, id_vendor=? WHERE id=?",
        [tgl_ban_masuk, merk_ban, no_seri, jumlahNum, satuan, harga, id_vendor, id],
        (err, result) => {
            if (err) {
                console.error("Error /ban/:id PUT:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: "Ban tidak ditemukan" });
            res.json({ message: "Ban berhasil diperbarui" });
        }
    );
});

// DELETE /ban/:id
// Page: ban.html | JS: js/ban/ban.js
// Fungsi: Menghapus ban dengan validasi belum dipakai di penukaran_ban
router.delete('/ban/:id', (req, res) => {
    const id = req.params.id;

    const check = `SELECT COUNT(*) as total FROM penukaran_ban WHERE id_stok=?`;
    db.query(check, [id], (err, result) => {
        if (err) {
            console.error("Error check penukaran_ban:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        if (result[0].total > 0) {
            return res.status(400).json({
                message: "Ban sudah dipakai, tidak bisa dihapus."
            });
        }

        db.query("DELETE FROM stok_ban WHERE id=?", [id], (err2) => {
            if (err2) {
                console.error("Error delete stok_ban:", err2);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json({ message: "Ban berhasil dihapus." });
        });
    });
});

// ========================================
module.exports = router;
