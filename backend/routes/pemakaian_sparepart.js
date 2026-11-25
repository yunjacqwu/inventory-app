const express = require('express');
const db = require('../db.js');
const { tolakInputTidakValid } = require('../helpers/validasi.js');

const router = express.Router();

// PEMAKAIAN SPAREPART ENDPOINTS
// ========================================

// POST /pemakaian
// Page: pemakaian.html | JS: js/sparepart/pemakaian.js
// Fungsi: Mencatat pemakaian sparepart (INSERT pemakaian dan UPDATE stok dalam transaction)
router.post("/pemakaian", db.transact((req, res, db) => {
    const { sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal } = req.body;
    if (tolakInputTidakValid(req, res, ["sparepart_id","satuan"], ["jumlah"])) return;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahNum = parseFloat(processedJumlah) || 0;

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction pemakaian:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Cek stok tersedia
        db.query(
            "SELECT jumlah FROM stok_sparepart WHERE id = ? FOR UPDATE",
            [sparepart_id],
            (err, stokResult) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error select stok_sparepart:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }

                if (!stokResult || stokResult.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Sparepart tidak ditemukan" });
                    });
                }

                const stokTersedia = parseFloat(stokResult[0].jumlah) || 0;

                // 2. Validasi stok cukup
                if (stokTersedia < jumlahNum) {
                    return db.rollback(() => {
                        res.status(400).json({
                            message: `Stok tidak cukup! Tersedia: ${stokTersedia}, diminta: ${jumlahNum}`
                        });
                    });
                }

                // 3. Kurangi stok
                db.query(
                    "UPDATE stok_sparepart SET jumlah = jumlah - ? WHERE id = ?",
                    [jumlahNum, sparepart_id],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error update stok_sparepart:", err);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        // 4. Insert pemakaian
                        db.query(
                            "INSERT INTO pemakaian_sparepart (sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal) VALUES (?, ?, ?, ?, ?, ?)",
                            [sparepart_id, kendaraan_id, jumlahNum, satuan, penanggung_jawab, tanggal],
                            (err, result) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Error insert pemakaian_sparepart:", err);
                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                    });
                                }

                                // 5. Commit transaction
                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("Error commit pemakaian_sparepart:", err);
                                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                        });
                                    }

                                    res.json({
                                        message: "Pemakaian berhasil disimpan dan stok berkurang",
                                        id: result.insertId
                                    });
                                });
                            }
                        );
                    }
                );
            }
        );
    });
}));

// GET /pemakaian
// Page: rekapsemua.html | JS: js/sparepart/rekapsemua.js
// Fungsi: Mengambil data pemakaian sparepart untuk laporan
router.get("/pemakaian", (req, res) => {
    const sql = `
    SELECT 
      p.*,
      s.nama_sparepart,
      s.no_seri,
      k.dt_mobil,
      k.plat
    FROM pemakaian_sparepart p
    LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    ORDER BY p.tanggal DESC, p.id DESC
  `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /pemakaian GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// GET /pemakaian/:id
// Page: editpemakaian.html | JS: js/sparepart/editpemakaian.js
// Fungsi: Mengambil detail pemakaian sparepart untuk edit
router.get("/pemakaian/:id", (req, res) => {
    const { id } = req.params;
    const sql = `
    SELECT 
      p.*,
      s.nama_sparepart,
      s.no_seri,
      s.harga,
      k.dt_mobil,
      k.plat
    FROM pemakaian_sparepart p
    LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
    LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
    WHERE p.id = ?
  `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error("Error /pemakaian/:id GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ message: "Pemakaian tidak ditemukan" });
        }
        res.json(results[0]);
    });
});

// PUT /pemakaian/:id
// Page: editpemakaian.html | JS: js/sparepart/editpemakaian.js
// Fungsi: Mengupdate pemakaian sparepart, menyesuaikan stok, dan menyimpan histori
router.put("/pemakaian/:id", db.transact((req, res, db) => {
    const { id } = req.params;
    const { sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal, keterangan } = req.body;
    if (tolakInputTidakValid(req, res, ["sparepart_id","satuan"], ["jumlah"])) return;
    const processedJumlah = satuan.toLowerCase().includes('liter') ? String(jumlah).replace(',', '.') : jumlah;
    const jumlahBaru = parseFloat(processedJumlah) || 0;

    // ✅ VALIDASI: Keterangan wajib diisi
    if (!keterangan || keterangan.trim() === '') {
        return res.status(400).json({ 
            message: "Keterangan wajib diisi untuk mencatat alasan perubahan data" 
        });
    }

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction update pemakaian:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Ambil data pemakaian lama untuk histori
        db.query(
            "SELECT * FROM pemakaian_sparepart WHERE id = ? FOR UPDATE",
            [id],
            (err, oldData) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error get old pemakaian:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }

                if (!oldData || oldData.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Pemakaian tidak ditemukan" });
                    });
                }

                const dataLama = oldData[0];
                const jumlahLama = parseFloat(dataLama.jumlah) || 0;
                const sparepartIdLama = dataLama.sparepart_id;
                const selisih = jumlahLama - jumlahBaru;

                // 2. Simpan ke histori_pemakaian (data SEBELUM edit)
                db.query(
                    `INSERT INTO histori_pemakaian 
                    (sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal, keterangan) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        dataLama.sparepart_id,
                        dataLama.kendaraan_id,
                        dataLama.jumlah,
                        dataLama.satuan,
                        dataLama.penanggung_jawab,
                        dataLama.tanggal,
                        `EDIT: ${keterangan.trim()}`
                    ],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error insert histori:", err);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        // 3. Proses update stok
                        prosesUpdateStok();
                    }
                );

                function prosesUpdateStok() {
                    // Jika sparepart berbeda
                    if (sparepartIdLama !== sparepart_id) {
                        // Kembalikan stok sparepart lama
                        db.query(
                            "UPDATE stok_sparepart SET jumlah = jumlah + ? WHERE id = ?",
                            [jumlahLama, sparepartIdLama],
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Error restore old stock:", err);
                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                    });
                                }

                                // Cek stok sparepart baru
                                db.query(
                                    "SELECT jumlah FROM stok_sparepart WHERE id = ? FOR UPDATE",
                                    [sparepart_id],
                                    (err, newStock) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error("Error check new stock:", err);
                                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                            });
                                        }

                                        if (!newStock || newStock.length === 0) {
                                            return db.rollback(() => {
                                                res.status(404).json({ message: "Sparepart baru tidak ditemukan" });
                                            });
                                        }

                                        const stokTersedia = parseFloat(newStock[0].jumlah) || 0;
                                        
                                        if (stokTersedia < jumlahBaru) {
                                            return db.rollback(() => {
                                                res.status(400).json({
                                                    message: `Stok tidak cukup! Tersedia: ${stokTersedia}, diminta: ${jumlahBaru}`
                                                });
                                            });
                                        }

                                        // Kurangi stok sparepart baru
                                        db.query(
                                            "UPDATE stok_sparepart SET jumlah = jumlah - ? WHERE id = ?",
                                            [jumlahBaru, sparepart_id],
                                            (err) => {
                                                if (err) {
                                                    return db.rollback(() => {
                                                        console.error("Error reduce new stock:", err);
                                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                                    });
                                                }

                                                updatePemakaian();
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    } else {
                        // Sparepart sama, hanya update jumlah
                        if (selisih !== 0) {
                            db.query(
                                "SELECT jumlah FROM stok_sparepart WHERE id = ? FOR UPDATE",
                                [sparepart_id],
                                (err, stokResult) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("Error check stock:", err);
                                            res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                        });
                                    }

                                    const stokTersedia = parseFloat(stokResult[0].jumlah) || 0;

                                    // Validasi jika jumlah pemakaian bertambah
                                    if (selisih < 0) {
                                        const kebutuhanTambahan = Math.abs(selisih);
                                        
                                        if (stokTersedia < kebutuhanTambahan) {
                                            return db.rollback(() => {
                                                res.status(400).json({
                                                    message: `Stok tidak cukup untuk menambah pemakaian! Stok tersedia: ${stokTersedia}, Perlu tambahan: ${kebutuhanTambahan}`
                                                });
                                            });
                                        }
                                    }

                                    db.query(
                                        "UPDATE stok_sparepart SET jumlah = jumlah + ? WHERE id = ?",
                                        [selisih, sparepart_id],
                                        (err) => {
                                            if (err) {
                                                return db.rollback(() => {
                                                    console.error("Error update stock:", err);
                                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                                });
                                            }

                                            updatePemakaian();
                                        }
                                    );
                                }
                            );
                        } else {
                            updatePemakaian();
                        }
                    }
                }

                function updatePemakaian() {
                    // 4. Update pemakaian_sparepart
                    db.query(
                        "UPDATE pemakaian_sparepart SET sparepart_id=?, kendaraan_id=?, jumlah=?, satuan=?, penanggung_jawab=?, tanggal=? WHERE id=?",
                        [sparepart_id, kendaraan_id, jumlahBaru, satuan, penanggung_jawab, tanggal, id],
                        (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Error update pemakaian:", err);
                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                });
                            }

                            // 5. Commit transaction
                            db.commit((err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Error commit update pemakaian:", err);
                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                    });
                                }

                                res.json({
                                    message: "Pemakaian berhasil diperbarui, stok disesuaikan, dan histori tersimpan"
                                });
                            });
                        }
                    );
                }
            }
        );
    });
}));

// DELETE /pemakaian/:id
// Page: editpemakaian.html | JS: js/sparepart/editpemakaian.js
// Fungsi: Menghapus pemakaian sparepart, mengembalikan stok, dan menyimpan histori
router.delete("/pemakaian/:id", db.transact((req, res, db) => {
    const { id } = req.params;
    const { keterangan } = req.body;

    // ✅ VALIDASI: Keterangan wajib diisi
    if (!keterangan || keterangan.trim() === '') {
        return res.status(400).json({ 
            message: "Keterangan wajib diisi untuk mencatat alasan penghapusan data" 
        });
    }

    db.beginTransaction((err) => {
        if (err) {
            console.error("Error beginTransaction delete pemakaian:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }

        // 1. Ambil data pemakaian yang akan dihapus
        db.query(
            "SELECT * FROM pemakaian_sparepart WHERE id = ? FOR UPDATE",
            [id],
            (err, pemakaianData) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error get pemakaian data:", err);
                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                    });
                }

                if (!pemakaianData || pemakaianData.length === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Pemakaian tidak ditemukan" });
                    });
                }

                const data = pemakaianData[0];
                const jumlah = parseFloat(data.jumlah) || 0;
                const sparepartId = data.sparepart_id;

                // 2. Simpan ke histori_pemakaian (data SEBELUM hapus)
                db.query(
                    `INSERT INTO histori_pemakaian 
                    (sparepart_id, kendaraan_id, jumlah, satuan, penanggung_jawab, tanggal, keterangan) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        data.sparepart_id,
                        data.kendaraan_id,
                        data.jumlah,
                        data.satuan,
                        data.penanggung_jawab,
                        data.tanggal,
                        `HAPUS: ${keterangan.trim()}`
                    ],
                    (err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error insert histori:", err);
                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                            });
                        }

                        // 3. Kembalikan stok
                        db.query(
                            "UPDATE stok_sparepart SET jumlah = jumlah + ? WHERE id = ?",
                            [jumlah, sparepartId],
                            (err) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Error restore stock:", err);
                                        res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                    });
                                }

                                // 4. Hapus pemakaian
                                db.query(
                                    "DELETE FROM pemakaian_sparepart WHERE id = ?",
                                    [id],
                                    (err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                console.error("Error delete pemakaian:", err);
                                                res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                            });
                                        }

                                        // 5. Commit transaction
                                        db.commit((err) => {
                                            if (err) {
                                                return db.rollback(() => {
                                                    console.error("Error commit delete pemakaian:", err);
                                                    res.status(500).json({ error: "Terjadi kesalahan pada server" });
                                                });
                                            }

                                            res.json({
                                                message: "Pemakaian berhasil dihapus, stok dikembalikan, dan histori tersimpan"
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

// GET /pemakaian_vendor
// Page: rekapsemua.html | JS: js/sparepart/rekapsemua.js
// Fungsi: Mengambil data pemakaian sparepart dengan filter vendor untuk laporan detail
router.get("/pemakaian_vendor", (req, res) => {
    try {
        let { start, end, vendor, barang, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) {
            return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        }
        if (end && !dateRE.test(end)) {
            return res.status(400).json({ error: "end harus format YYYY-MM-DD" });
        }

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT 
        p.id,
        bm.tgl_sparepart_masuk AS tanggal_masuk,
        s.no_seri,
        s.nama_sparepart,
        p.jumlah,
        p.satuan,
        s.harga,
        (p.jumlah * s.harga) AS total,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        p.tanggal AS tanggal_pemakaian
      FROM pemakaian_sparepart p
      LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
      LEFT JOIN barang_masuk bm ON s.id = bm.id
      LEFT JOIN vendor v ON s.id_vendor = v.id
      LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
      WHERE 1=1
    `;

        const params = [];

        if (start && end) {
            sql += " AND DATE(bm.tgl_sparepart_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(bm.tgl_sparepart_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(bm.tgl_sparepart_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND s.id_vendor = ?";
            params.push(vendor);
        }

        if (barang) {
            sql += " AND s.nama_sparepart LIKE ?";
            params.push(`%${barang}%`);
        }

        if (kendaraan) {
            sql += " AND p.kendaraan_id = ?";
            params.push(kendaraan);
        }

        sql += " ORDER BY bm.tgl_sparepart_masuk DESC, p.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /pemakaian_vendor:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /pemakaian_vendor:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// ========================================
module.exports = router;
