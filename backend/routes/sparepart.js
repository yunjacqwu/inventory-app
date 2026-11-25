const express = require('express');
const db = require('../db.js');
const { tolakInputTidakValid } = require('../helpers/validasi.js');

const router = express.Router();

// SPAREPART ENDPOINTS
// ========================================

// GET /sparepart
// Pages: insparepart.html, rekapsemua.html | JS: js/sparepart/insparepart.js, js/sparepart/rekapsemua.js
// Fungsi: Mengambil daftar sparepart dari stok_sparepart untuk input dan laporan
router.get("/sparepart", (req, res) => {
    db.query(
        `SELECT s.*, v.nama_vendor
     FROM stok_sparepart s
     LEFT JOIN vendor v ON s.id_vendor = v.id
     ORDER BY s.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /sparepart GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// GET /sparepart/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Mengambil detail sparepart tertentu untuk edit
router.get("/sparepart/:id", (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT s.*, v.nama_vendor
     FROM stok_sparepart s
     LEFT JOIN vendor v ON s.id_vendor = v.id
     WHERE s.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Error /sparepart/:id GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (!results || results.length === 0) return res.status(404).json({ message: "Sparepart tidak ditemukan" });
            res.json(results[0]);
        }
    );
});

// GET /barang_masuk/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Mengambil detail barang_masuk untuk edit sparepart
router.get("/barang_masuk/:id", (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT b.*, v.nama_vendor
     FROM barang_masuk b
     LEFT JOIN vendor v ON b.id_vendor = v.id
     WHERE b.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Error /barang_masuk/:id GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (!results || results.length === 0) return res.status(404).json({ message: "Barang masuk tidak ditemukan" });
            res.json(results[0]);
        }
    );
});

// PUT /barang_masuk/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Mengupdate barang_masuk
router.put("/barang_masuk/:id", (req, res) => {
    const { id } = req.params;
    const { tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["nama_sparepart","satuan"], ["jumlah"])) return;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.query(
        "UPDATE barang_masuk SET tgl_sparepart_masuk=?, nama_sparepart=?, no_seri=?, jumlah=?, satuan=?, harga=?, id_vendor=? WHERE id=?",
        [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor, id],
        (err, result) => {
            if (err) {
                console.error("Error update barang_masuk:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Barang masuk tidak ditemukan" });
            }
            res.json({ message: "Barang masuk berhasil diperbarui" });
        }
    );
});

// GET /stok_sparepart
// Page: pemakaian.html | JS: js/sparepart/pemakaian.js
// Fungsi: Mengambil stok sparepart yang tersedia untuk form pemakaian
router.get("/stok_sparepart", (req, res) => {
    db.query(
        `SELECT s.*, v.nama_vendor 
     FROM stok_sparepart s 
     LEFT JOIN vendor v ON s.id_vendor = v.id
     ORDER BY s.nama_sparepart`,
        (err, results) => {
            if (err) {
                console.error("Error /stok_sparepart GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// POST /sparepart
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Menambahkan sparepart baru (INSERT ke stok_sparepart dan barang_masuk dalam transaction)
router.post("/sparepart", db.transact((req, res, db) => {
    const { tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["nama_sparepart","satuan"], ["jumlah"])) return;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction sparepart:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Insert ke stok_sparepart
        db.query(
            "INSERT INTO stok_sparepart (tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error insert stok_sparepart:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }

                const stokId = result.insertId;

                // 2. Insert ke barang_masuk
                db.query(
                    "INSERT INTO barang_masuk (tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor],
                    (err2, result2) => {
                        if (err2) {
                            return db.rollback(() => {
                                console.error("Error insert barang_masuk:", err2);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        // 3. Commit transaction
                        db.commit((err3) => {
                            if (err3) {
                                return db.rollback(() => {
                                    console.error("Error commit sparepart:", err3);
                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                });
                            }

                            res.json({
                                message: "Sparepart berhasil ditambahkan ke stok dan barang masuk",
                                stok_id: stokId,
                                barang_masuk_id: result2.insertId
                            });
                        });
                    }
                );
            }
        );
    });
}));

// PUT /sparepart/:id
// UBAH: Hanya update stok_sparepart, JANGAN update barang_masuk
router.put("/sparepart/:id", (req, res) => {
    const { id } = req.params;
    const { tgl_sparepart_masuk, nama_sparepart, no_seri, jumlah, satuan, harga, id_vendor } = req.body;
    if (tolakInputTidakValid(req, res, ["nama_sparepart","satuan"], ["jumlah"])) return;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    // HANYA UPDATE stok_sparepart
    db.query(
        "UPDATE stok_sparepart SET tgl_sparepart_masuk=?, nama_sparepart=?, no_seri=?, jumlah=?, satuan=?, harga=?, id_vendor=? WHERE id=?",
        [tgl_sparepart_masuk, nama_sparepart, no_seri, jumlahNum, satuan, harga, id_vendor, id],
        (err, result) => {
            if (err) {
                console.error("Error update stok_sparepart:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Sparepart tidak ditemukan" });
            }
            res.json({ message: "Sparepart berhasil diperbarui" });
        }
    );
});

// DELETE /sparepart/:id
// Page: insparepart.html | JS: js/sparepart/insparepart.js
// Fungsi: Menghapus sparepart (DELETE dari kedua tabel dengan validasi belum dipakai)
router.delete("/sparepart/:id", db.transact((req, res, db) => {
    const { id } = req.params;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction delete sparepart:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Cek apakah sparepart sudah dipakai. Kunci baris stok (FOR UPDATE) agar
        // tidak balapan dengan POST /pemakaian yang juga mengunci baris yang sama.
        db.query("SELECT (SELECT COUNT(*) FROM pemakaian_sparepart WHERE sparepart_id=?) AS total FROM (SELECT 1) d LEFT JOIN stok_sparepart s ON s.id=? FOR UPDATE", [id, id], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error check pemakaian sparepart:", err);
                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                });
            }

            if (result[0].total > 0) {
                return db.rollback(() => {
                    res.status(400).json({ message: "Sparepart sudah dipakai, tidak bisa dihapus" });
                });
            }

            // 2. Delete from stok_sparepart
            db.query("DELETE FROM stok_sparepart WHERE id=?", [id], (err2) => {
                if (err2) {
                    return db.rollback(() => {
                        console.error("Error delete stok_sparepart:", err2);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }

                // 3. Delete from barang_masuk
                db.query("DELETE FROM barang_masuk WHERE id=?", [id], (err3) => {
                    if (err3) {
                        return db.rollback(() => {
                            console.error("Error delete barang_masuk:", err3);
                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                        });
                    }

                    // 4. Commit transaction
                    db.commit((err4) => {
                        if (err4) {
                            return db.rollback(() => {
                                console.error("Error commit delete sparepart:", err4);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }
                        res.json({ message: "Sparepart berhasil dihapus dari kedua tabel" });
                    });
                });
            });
        });
    });
}));

// ========================================
module.exports = router;
