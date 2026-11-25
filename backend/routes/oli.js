const express = require('express');
const db = require('../db.js');

const router = express.Router();

// OLI MASUK ENDPOINTS
// ========================================

// GET /oli_masuk
// Pages: inoli.html, rekapoli.html | JS: js/literan/inoli.js, js/literan/rekapoli.js
// Fungsi: Mengambil daftar oli masuk dengan JOIN vendor dan kalkulasi stok tersisa
router.get("/oli_masuk", (req, res) => {
    db.query(
        `SELECT 
      om.*,
      v.nama_vendor,
      COALESCE(so.total_stok, 0) AS stok_tersisa,
      COALESCE(
        (SELECT SUM(po.jumlah_pakai) FROM pemakaian_oli po WHERE po.id_oli_masuk = om.id),
        0
      ) AS total_dipakai
     FROM oli_masuk om
     LEFT JOIN vendor v ON om.id_vendor = v.id
     LEFT JOIN stok_oli so ON om.id = so.id_oli_masuk
     ORDER BY om.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /oli_masuk GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// GET /oli_masuk/:id
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Mengambil detail oli masuk tertentu untuk edit
router.get("/oli_masuk/:id", (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT 
      om.*,
      v.nama_vendor,
      COALESCE(so.total_stok, 0) AS stok_tersisa
     FROM oli_masuk om
     LEFT JOIN vendor v ON om.id_vendor = v.id
     LEFT JOIN stok_oli so ON om.id = so.id_oli_masuk
     WHERE om.id = ?`,
        [id],
        (err, results) => {
            if (err) {
                console.error("Error /oli_masuk/:id GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            if (!results || results.length === 0) {
                return res.status(404).json({ message: "Oli masuk tidak ditemukan" });
            }
            res.json(results[0]);
        }
    );
});

// GET /oli_lama
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Mengambil data oli yang pernah menjadi "oli lama" untuk fitur gabungan oli
router.get("/oli_lama", (req, res) => {
    const sql = `
    SELECT 
      om_lama.id AS id_oli_masuk,
      om_lama.tanggal_masuk,
      om_lama.nama_oli,
      om_lama.no_seri,
      om_lama.jumlah_baru,
      om_lama.sisa_lama,
      om_lama.total_stok,
      om_lama.satuan,
      om_lama.id_vendor,
      om_lama.id_oli_baru,
      om_lama.keterangan,
      v.nama_vendor,
      COALESCE(so.total_stok, 0) AS stok_tersisa,
      om_baru.no_seri AS no_seri_baru,
      om_baru.nama_oli AS nama_oli_baru,
      om_baru.tanggal_masuk AS tanggal_gabung,
      om_baru.sisa_lama AS sisa_lama_digabung
    FROM oli_masuk om_lama
    LEFT JOIN vendor v ON om_lama.id_vendor = v.id
    LEFT JOIN stok_oli so ON om_lama.id = so.id_oli_masuk
    LEFT JOIN oli_masuk om_baru ON om_lama.id_oli_baru = om_baru.id
    WHERE om_lama.id IN (
      SELECT DISTINCT id_oli_lama 
      FROM oli_masuk 
      WHERE id_oli_lama IS NOT NULL
    )
    ORDER BY om_lama.tanggal_masuk DESC, om_lama.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /oli_lama GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// POST /oli_masuk
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Menambahkan oli masuk dengan fitur gabungan oli lama (transaction kompleks)
router.post("/oli_masuk", db.transact((req, res, db) => {
    const {
        tanggal_masuk,
        nama_oli,
        no_seri,
        jumlah_baru,
        sisa_lama,
        satuan,
        harga,
        id_vendor,
        id_oli_lama,
        keterangan
    } = req.body;

    const jumlahBaruNum = parseFloat(jumlah_baru) || 0;
    const sisaLamaNum = parseFloat(sisa_lama) || 0;
    const hargaNum = parseFloat(harga) || 0;
    const totalMasuk = jumlahBaruNum + sisaLamaNum;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction oli_masuk:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Jika ada oli lama yang digabung, validasi stok tersedia
        if (id_oli_lama && sisaLamaNum > 0) {
            db.query(
                `SELECT total_stok FROM stok_oli WHERE id_oli_masuk = ? FOR UPDATE`,
                [id_oli_lama],
                (errCheck, stokCheck) => {
                    if (errCheck) {
                        return db.rollback(() => {
                            console.error("Error check stok oli lama:", errCheck);
                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                        });
                    }

                    if (!stokCheck || stokCheck.length === 0) {
                        return db.rollback(() => {
                            res.status(404).json({ message: "Stok oli lama tidak ditemukan" });
                        });
                    }

                    const stokTersedia = parseFloat(stokCheck[0].total_stok) || 0;
                    if (sisaLamaNum > stokTersedia) {
                        return db.rollback(() => {
                            res.status(400).json({
                                message: `Stok oli lama tidak mencukupi. Tersedia: ${stokTersedia}L, Diminta: ${sisaLamaNum}L`
                            });
                        });
                    }

                    // Lanjut ke insert oli baru
                    insertOliBaru();
                }
            );
        } else {
            // Tidak ada oli lama, langsung insert
            insertOliBaru();
        }

        function insertOliBaru() {
            // 2. Insert ke oli_masuk
            db.query(
                `INSERT INTO oli_masuk 
            (tanggal_masuk, nama_oli, no_seri, jumlah_baru, sisa_lama, total_masuk, stok_tersisa, satuan, harga, id_vendor, id_oli_lama, keterangan) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tanggal_masuk, nama_oli, no_seri, jumlahBaruNum, sisaLamaNum, totalMasuk, totalMasuk, satuan, hargaNum, id_vendor, id_oli_lama, keterangan],
                (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error insert oli_masuk:", err);
                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                        });
                    }

                    const oliMasukId = result.insertId;

                    // 3. Insert ke stok_oli
                    db.query(
                        `INSERT INTO stok_oli (id_oli_masuk, total_stok) VALUES (?, ?)`,
                        [oliMasukId, totalMasuk],
                        (err2) => {
                            if (err2) {
                                return db.rollback(() => {
                                    console.error("Error insert stok_oli:", err2);
                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                });
                            }

                            // 4. Jika ada oli lama yang digabung
                            if (id_oli_lama && sisaLamaNum > 0) {
                                // 4a. Update id_oli_baru di oli_masuk lama
                                db.query(
                                    `UPDATE oli_masuk SET id_oli_baru = ?, stok_tersisa = stok_tersisa - ? WHERE id = ?`,
                                    [oliMasukId, sisaLamaNum, id_oli_lama],
                                    (err3) => {
                                        if (err3) {
                                            return db.rollback(() => {
                                                console.error("Error update oli_masuk id_oli_baru:", err3);
                                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                            });
                                        }

                                        // 4b. Kurangi stok oli lama sesuai jumlah yang digabung
                                        db.query(
                                            `UPDATE stok_oli SET total_stok = total_stok - ? WHERE id_oli_masuk = ?`,
                                            [sisaLamaNum, id_oli_lama],
                                            (err4) => {
                                                if (err4) {
                                                    return db.rollback(() => {
                                                        console.error("Error update stok_oli lama:", err4);
                                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                                    });
                                                }

                                                db.commit((err5) => {
                                                    if (err5) {
                                                        return db.rollback(() => {
                                                            console.error("Error commit oli_masuk:", err5);
                                                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                                        });
                                                    }
                                                    res.json({
                                                        message: `Oli masuk berhasil ditambahkan. ${sisaLamaNum}L dari oli lama telah digabungkan dan stok diperbarui`,
                                                        id: oliMasukId
                                                    });
                                                });
                                            }
                                        );
                                    }
                                );
                            } else {
                                db.commit((err5) => {
                                    if (err5) {
                                        return db.rollback(() => {
                                            console.error("Error commit oli_masuk:", err5);
                                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                        });
                                    }
                                    res.json({
                                        message: "Oli masuk berhasil ditambahkan",
                                        id: oliMasukId
                                    });
                                });
                            }
                        }
                    );
                }
            );
        }
    });
}));

// PUT /oli_masuk/:id
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Mengupdate oli masuk dengan update stok terkait
router.put("/oli_masuk/:id", db.transact((req, res, db) => {
    const { id } = req.params;
    const {
        tanggal_masuk,
        nama_oli,
        no_seri,
        jumlah_baru,
        sisa_lama,
        satuan,
        harga,
        id_vendor,
        id_oli_lama,
        keterangan
    } = req.body;

    const jumlahBaruNum = parseFloat(jumlah_baru) || 0;
    const sisaLamaNum = parseFloat(sisa_lama) || 0;
    const hargaNum = parseFloat(harga) || 0;
    const totalMasuk = jumlahBaruNum + sisaLamaNum;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction update oli_masuk:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Update oli_masuk
        db.query(
            `UPDATE oli_masuk 
      SET tanggal_masuk=?, nama_oli=?, no_seri=?, jumlah_baru=?, sisa_lama=?, 
          total_masuk=?, stok_tersisa=?, satuan=?, harga=?, id_vendor=?, id_oli_lama=?, keterangan=? 
      WHERE id=?`,
            [tanggal_masuk, nama_oli, no_seri, jumlahBaruNum, sisaLamaNum,
                totalMasuk, totalMasuk, satuan, hargaNum, id_vendor, id_oli_lama, keterangan, id],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error update oli_masuk:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }
                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Oli masuk tidak ditemukan" });
                    });
                }

                // 2. Update stok_oli
                db.query(
                    `UPDATE stok_oli SET total_stok = ? WHERE id_oli_masuk = ?`,
                    [totalMasuk, id],
                    (err2) => {
                        if (err2) {
                            return db.rollback(() => {
                                console.error("Error update stok_oli:", err2);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        db.commit((err3) => {
                            if (err3) {
                                return db.rollback(() => {
                                    console.error("Error commit update oli_masuk:", err3);
                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                });
                            }
                            res.json({ message: "Oli masuk berhasil diperbarui" });
                        });
                    }
                );
            }
        );
    });
}));

// DELETE /oli_masuk/:id
// Page: inoli.html | JS: js/literan/inoli.js
// Fungsi: Menghapus oli masuk dengan validasi belum dipakai
router.delete("/oli_masuk/:id", db.transact((req, res, db) => {
    const { id } = req.params;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction delete oli_masuk:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Cek apakah oli sudah dipakai
        db.query(
            // Kunci baris stok_oli (FOR UPDATE) agar tidak balapan dengan POST /pemakaian_oli
            "SELECT (SELECT COUNT(*) FROM pemakaian_oli WHERE id_oli_masuk=?) AS total FROM (SELECT 1) d LEFT JOIN stok_oli so ON so.id_oli_masuk=? FOR UPDATE",
            [id, id],
            (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error check pemakaian oli:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }

                if (result[0].total > 0) {
                    return db.rollback(() => {
                        res.status(400).json({ message: "Oli sudah dipakai, tidak bisa dihapus" });
                    });
                }

                // 2. Delete stok_oli
                db.query("DELETE FROM stok_oli WHERE id_oli_masuk=?", [id], (err2) => {
                    if (err2) {
                        return db.rollback(() => {
                            console.error("Error delete stok_oli:", err2);
                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                        });
                    }

                    // 3. Delete oli_masuk
                    db.query("DELETE FROM oli_masuk WHERE id=?", [id], (err3) => {
                        if (err3) {
                            return db.rollback(() => {
                                console.error("Error delete oli_masuk:", err3);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        db.commit((err4) => {
                            if (err4) {
                                return db.rollback(() => {
                                    console.error("Error commit delete oli_masuk:", err4);
                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                });
                            }
                            res.json({ message: "Oli masuk berhasil dihapus" });
                        });
                    });
                });
            }
        );
    });
}));

// ========================================
// STOK OLI ENDPOINTS
// ========================================

// GET /stok_oli
// Page: pemakaianoli.html | JS: js/literan/pemakaianoli.js
// Fungsi: Mengambil stok oli yang tersedia (total_stok > 0) untuk pemakaian
router.get("/stok_oli", (req, res) => {
    db.query(
        `SELECT 
      so.id,
      so.id_oli_masuk,
      so.total_stok,
      om.nama_oli,
      om.no_seri,
      om.tanggal_masuk,
      om.satuan,
      v.nama_vendor
     FROM stok_oli so
     JOIN oli_masuk om ON so.id_oli_masuk = om.id
     LEFT JOIN vendor v ON om.id_vendor = v.id
     WHERE so.total_stok > 0
     ORDER BY om.nama_oli, om.no_seri`,
        (err, results) => {
            if (err) {
                console.error("Error /stok_oli GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// ========================================
// PEMAKAIAN OLI ENDPOINTS
// ========================================

// GET /pemakaian_oli
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Mengambil data pemakaian oli untuk laporan
router.get("/pemakaian_oli", (req, res) => {
    db.query(
        `SELECT 
      po.*,
      om.nama_oli,
      om.no_seri,
      k.dt_mobil,
      k.plat
     FROM pemakaian_oli po
     JOIN oli_masuk om ON po.id_oli_masuk = om.id
     JOIN kendaraan k ON po.id_kendaraan = k.id
     ORDER BY po.tanggal_pakai DESC, po.id DESC`,
        (err, results) => {
            if (err) {
                console.error("Error /pemakaian_oli GET:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        }
    );
});

// POST /pemakaian_oli
// Page: pemakaianoli.html | JS: js/literan/pemakaianoli.js
// Fungsi: Mencatat pemakaian oli (INSERT pemakaian dan UPDATE stok dalam transaction)
router.post("/pemakaian_oli", db.transact((req, res, db) => {
    const {
        tanggal_pakai,
        id_oli_masuk,
        id_kendaraan,
        jumlah_pakai,
        keterangan
    } = req.body;
    const jumlahPakaiNum = parseFloat(jumlah_pakai) || 0;

    if (!tanggal_pakai || !id_oli_masuk || !id_kendaraan || jumlahPakaiNum <= 0) {
        return res.status(400).json({
            message: "Data tidak lengkap atau jumlah pakai tidak valid"
        });
    }

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction pemakaian_oli:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Cek stok tersedia
        db.query(
            "SELECT total_stok FROM stok_oli WHERE id_oli_masuk = ? FOR UPDATE",
            [id_oli_masuk],
            (err, stokResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error check stok:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }
                if (!stokResult || stokResult.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Stok oli tidak ditemukan" });
                    });
                }

                const stokTersedia = parseFloat(stokResult[0].total_stok) || 0;
                if (jumlahPakaiNum > stokTersedia) {
                    return db.rollback(() => {
                        res.status(400).json({
                            message: `Stok tidak mencukupi. Tersedia: ${stokTersedia}L, Diminta: ${jumlahPakaiNum}L`
                        });
                    });
                }

                // 2. Insert pemakaian_oli
                db.query(
                    `INSERT INTO pemakaian_oli
          (tanggal_pakai, id_oli_masuk, id_kendaraan, jumlah_pakai, keterangan)
          VALUES (?, ?, ?, ?, ?)`,
                    [tanggal_pakai, id_oli_masuk, id_kendaraan, jumlahPakaiNum, keterangan || null],
                    (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error insert pemakaian_oli:", err);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        // 3. Update stok_oli (kurangi stok)
                        const stokBaru = stokTersedia - jumlahPakaiNum;
                        db.query(
                            "UPDATE stok_oli SET total_stok = ? WHERE id_oli_masuk = ?",
                            [stokBaru, id_oli_masuk],
                            (err2) => {
                                if (err2) {
                                    return db.rollback(() => {
                                        console.error("Error update stok_oli:", err2);
                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                    });
                                }

                                // 4. Update stok_tersisa di oli_masuk
                                db.query(
                                    "UPDATE oli_masuk SET stok_tersisa = stok_tersisa - ? WHERE id = ?",
                                    [jumlahPakaiNum, id_oli_masuk],
                                    (err3) => {
                                        if (err3) {
                                            return db.rollback(() => {
                                                console.error("Error update oli_masuk stok_tersisa:", err3);
                                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                            });
                                        }

                                        db.commit((err4) => {
                                            if (err4) {
                                                return db.rollback(() => {
                                                    console.error("Error commit pemakaian_oli:", err4);
                                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                                });
                                            }
                                            res.json({
                                                message: "Pemakaian oli berhasil dicatat",
                                                id: result.insertId,
                                                stok_tersisa: stokBaru
                                            });
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
}));

// ========================================
module.exports = router;
