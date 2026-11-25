const express = require('express');
const db = require('../db.js');

const router = express.Router();

// PENUKARAN BAN ENDPOINTS
// ========================================

// GET /pban/all
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengambil semua data penukaran_ban untuk ditampilkan dan diedit
router.get("/pban/all", (req, res) => {
    db.query(
        `SELECT 
        pb.id,
        pb.id_kendaraan,
        pb.supir,
        pb.tanggal_pasang_lama,
        pb.merk_lama,
        pb.seri_lama,
        pb.km_awal,
        pb.km_akhir,
        pb.jarak_km,
        pb.km_gps,
        pb.keterangan,
        pb.tgl_pasang_ban_baru,
        COALESCE(sb.merk_ban, pb.merk_baru) AS merk_baru,
        COALESCE(sb.no_seri, pb.seri_ban_baru) AS seri_ban_baru,
        pb.id_stok
     FROM penukaran_ban pb
     LEFT JOIN stok_ban sb ON pb.id_stok = sb.id
     ORDER BY pb.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /pban/all GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// POST /pban
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Menambahkan data penukaran ban baru ke tabel penukaran_ban (semua field boleh null)
router.post("/pban", (req, res) => {
    const {
        id_kendaraan,
        supir,
        tanggal_pasang_lama,
        merk_lama,
        seri_lama,
        km_awal,
        km_akhir,
        jarak_km,
        km_gps,
        keterangan,
        tgl_pasang_ban_baru,
        merk_baru,
        seri_ban_baru,
        id_stok
    } = req.body;

    // Konversi nilai numerik jika ada, jika tidak null
    const kmAwalNum = km_awal !== null && km_awal !== undefined ? parseFloat(km_awal) : null;
    const kmAkhirNum = km_akhir !== null && km_akhir !== undefined ? parseFloat(km_akhir) : null;
    const jarakKmNum = jarak_km !== null && jarak_km !== undefined ? parseFloat(jarak_km) : null;
    const kmGpsNum = km_gps !== null && km_gps !== undefined ? parseFloat(km_gps) : null;

    // Handle field yang tidak boleh null di database dengan default value
    // Jika kolom di database NOT NULL, gunakan empty string sebagai default untuk string fields
    const supirValue = supir !== null && supir !== undefined && supir !== '' ? supir : '';
    const seriLamaValue = seri_lama !== null && seri_lama !== undefined && seri_lama !== '' ? seri_lama : '';
    // Untuk date field yang NOT NULL, gunakan tanggal saat ini jika null
    const tglPasangBanBaruValue = tgl_pasang_ban_baru !== null && tgl_pasang_ban_baru !== undefined && tgl_pasang_ban_baru !== '' 
        ? tgl_pasang_ban_baru 
        : new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    db.query(
        `INSERT INTO penukaran_ban 
        (id_kendaraan, supir, tanggal_pasang_lama, merk_lama, seri_lama, km_awal, km_akhir, jarak_km, km_gps, keterangan, tgl_pasang_ban_baru, merk_baru, seri_ban_baru, id_stok) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id_kendaraan || null,
            supirValue,
            tanggal_pasang_lama || null,
            merk_lama || null,
            seriLamaValue,
            kmAwalNum,
            kmAkhirNum,
            jarakKmNum,
            kmGpsNum,
            keterangan || null,
            tglPasangBanBaruValue,
            merk_baru || null,
            seri_ban_baru || null,
            id_stok || null
        ],
        (err, result) => {
            if (err) {
                console.error("Error /pban POST:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.status(201).json({
                message: "Data penukaran ban berhasil ditambahkan",
                id: result.insertId
            });
        }
    );
});

// PUT /pban/:id
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengupdate data penukaran ban dan menyimpan histori perubahan ke tabel histori_ban
router.put("/pban/:id", (req, res) => {
    const { id } = req.params;
    const {
        seri_lama,
        km_awal,
        km_akhir,
        jarak_km,
        km_gps,
        keterangan,
        id_stok,
        tgl_pasang_ban_baru,
        supir,
        seri_ban_baru,
        merk_baru
    } = req.body;

    db.query(
        "SELECT * FROM penukaran_ban WHERE id = ?",
        [id],
        (err, results) => {
            if (err) {
                console.error("Error select penukaran_ban:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (!results || results.length === 0) {
                return res.status(404).json({ message: "Data tidak ditemukan" });
            }

            const lama = results[0];

            db.query(
                `INSERT INTO histori_ban 
          (id_kendaraan, supir, tanggal_pasang_lama, merk_lama, seri_lama, km_awal, km_akhir, jarak_km, km_gps, keterangan, tgl_pasang_ban_baru, seri_ban_baru, merk_baru, id_stok)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    lama.id_kendaraan, lama.supir, lama.tanggal_pasang_lama, lama.merk_lama, lama.seri_lama,
                    lama.km_awal, lama.km_akhir, lama.jarak_km, lama.km_gps, lama.keterangan,
                    lama.tgl_pasang_ban_baru, lama.seri_ban_baru, lama.merk_baru, lama.id_stok
                ],
                (err2) => {
                    if (err2) {
                        console.error("Error insert histori_ban:", err2);
                        return res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    }

                    const lama_tgl_pasang = lama.tgl_pasang_ban_baru;
                    const lama_merk_baru = lama.merk_baru;

                    db.query(
                        `UPDATE penukaran_ban
             SET seri_lama=?, km_awal=?, km_akhir=?, jarak_km=?, km_gps=?, keterangan=?, id_stok=?, tgl_pasang_ban_baru=?, supir=?, seri_ban_baru=?, merk_baru=?,
                 tanggal_pasang_lama=?, merk_lama=?
             WHERE id=?`,
                        [
                            seri_lama, km_awal, km_akhir, jarak_km, km_gps, keterangan, id_stok, tgl_pasang_ban_baru, supir, seri_ban_baru, merk_baru,
                            lama_tgl_pasang, lama_merk_baru,
                            id
                        ],
                        (err3, result) => {
                            if (err3) {
                                console.error("Error /pban/:id PUT:", err3);
                                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            }
                            res.json({ message: "Penukaran ban berhasil diupdate & histori tersimpan" });
                        }
                    );
                }
            );
        }
    );
});

// PUT /pban/edit/:id
// Page: pban.html | JS: js/ban/pban.js
// Fungsi: Mengupdate data penukaran ban TANPA menyimpan histori (untuk koreksi data)
router.put("/pban/edit/:id", (req, res) => {
    const { id } = req.params;
    const {
        seri_lama,
        merk_lama,
        tanggal_pasang_lama,
        km_awal,
        km_akhir,
        jarak_km,
        km_gps,
        keterangan,
        supir,
        seri_ban_baru,
        merk_baru,
        tgl_pasang_ban_baru
    } = req.body;

    db.query(
        `UPDATE penukaran_ban
         SET seri_lama=?, merk_lama=?, tanggal_pasang_lama=?, km_awal=?, km_akhir=?, 
             jarak_km=?, km_gps=?, keterangan=?, supir=?, seri_ban_baru=?, 
             merk_baru=?, tgl_pasang_ban_baru=?
         WHERE id=?`,
        [
            seri_lama, merk_lama, tanggal_pasang_lama, km_awal, km_akhir,
            jarak_km, km_gps, keterangan, supir, seri_ban_baru,
            merk_baru, tgl_pasang_ban_baru, id
        ],
        (err, result) => {
            if (err) {
                console.error("Error /pban/edit/:id PUT:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Data tidak ditemukan" });
            }
            res.json({ message: "Data ban berhasil diperbarui" });
        }
    );
});

// ========================================
module.exports = router;
