const express = require('express');
const db = require('../db.js');

const router = express.Router();

// REKAP ENDPOINTS
// ========================================

// GET /rekap_lama
// Page: rekap.html | JS: js/barang/rekap.js
// Fungsi: Rekap data barang lama (dari tabel barang) dengan filter tanggal, vendor, dll
router.get("/rekap_lama", (req, res) => {
    try {
        let { start, end, vendor, barang, satuan, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        b.id,
        b.no_seri,
        b.nama_barang,
        b.merk,
        b.jumlah,
        b.satuan,
        b.harga,
        (b.jumlah * b.harga) AS total,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        b.Penanggung_jawab AS penanggung_jawab,
        b.tanggal
      FROM barang b
      LEFT JOIN vendor v ON b.vendor_id = v.id
      LEFT JOIN kendaraan k ON b.kendaraan_id = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(b.tanggal) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(b.tanggal) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(b.tanggal) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND b.vendor_id = ?";
            params.push(vendor);
        }

        if (barang) {
            sql += " AND b.nama_barang LIKE ?";
            params.push(`%${barang}%`);
        }

        if (satuan && satuan !== 'semua') {
            sql += " AND b.satuan = ?";
            params.push(satuan);
        }

        if (kendaraan) {
            sql += " AND b.kendaraan_id = ?";
            params.push(kendaraan);
        }

        sql += " ORDER BY b.tanggal DESC, b.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /rekap_lama:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /rekap_lama:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// GET /rekap
// Page: rekapsemua.html | JS: js/sparepart/rekapsemua.js
// Fungsi: Rekap umum (stok, pemakaian, vendor) dengan berbagai filter dan type
router.get("/rekap", (req, res) => {
    try {
        let { start, end, vendor, barang, satuan, type } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = "";
        let params = [];

        if (type === 'stok') {
            sql = `
        SELECT
          s.id,
          s.no_seri,
          s.nama_sparepart,
          '' AS merk,
          s.jumlah,
          s.satuan,
          s.harga,
          (s.jumlah * s.harga) AS total,
          v.nama_vendor,
          'Gudang Utama' AS lokasi,
          s.tgl_sparepart_masuk AS tanggal
        FROM stok_sparepart s
        LEFT JOIN vendor v ON s.id_vendor = v.id
        WHERE 1=1
      `;

            if (start && end) {
                sql += " AND DATE(s.tgl_sparepart_masuk) BETWEEN ? AND ?";
                params.push(start, end);
            } else if (start) {
                sql += " AND DATE(s.tgl_sparepart_masuk) = ?";
                params.push(start);
            } else if (end) {
                sql += " AND DATE(s.tgl_sparepart_masuk) = ?";
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

            if (satuan && satuan !== 'semua') {
                sql += " AND s.satuan = ?";
                params.push(satuan);
            }

            sql += " ORDER BY s.tgl_sparepart_masuk DESC, s.id DESC";

        } else if (type === 'kendaraan') {
            const jenisBarang = req.query.jenis_barang || 'semua';

            if (jenisBarang === 'sparepart') {
                sql = `
          SELECT
            p.id,
            s.no_seri,
            s.nama_sparepart,
            '' AS merk,
            p.jumlah,
            p.satuan,
            s.harga,
            (p.jumlah * s.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            p.penanggung_jawab,
            p.tanggal,
            '' AS keterangan
          FROM pemakaian_sparepart p
          LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
          LEFT JOIN vendor v ON s.id_vendor = v.id
          LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(p.tanggal) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(p.tanggal) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(p.tanggal) = ?";
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

                if (satuan && satuan !== 'semua') {
                    sql += " AND p.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND p.kendaraan_id = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY p.tanggal DESC, p.id DESC";

            } else if (jenisBarang === 'ban') {
                sql = `
          SELECT
            pb.id,
            sb.no_seri,
            CONCAT('Ban ', sb.merk_ban) AS nama_sparepart,
            sb.merk_ban AS merk,
            1 AS jumlah,
            'pcs' AS satuan,
            sb.harga,
            sb.harga AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            pb.supir AS penanggung_jawab,
            pb.tgl_pasang_ban_baru AS tanggal,
            pb.keterangan
          FROM penukaran_ban pb
          JOIN stok_ban sb ON pb.id_stok = sb.id
          LEFT JOIN vendor v ON sb.id_vendor = v.id
          LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND sb.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND CONCAT('Ban ', sb.merk_ban) LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND 'pcs' = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND pb.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY pb.tgl_pasang_ban_baru DESC, pb.id DESC";

            } else if (jenisBarang === 'literan') {
                sql = `
          SELECT
            po.id,
            om.no_seri,
            om.nama_oli AS nama_sparepart,
            '' AS merk,
            po.jumlah_pakai AS jumlah,
            om.satuan,
            om.harga AS harga,
            (po.jumlah_pakai * om.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            po.keterangan AS penanggung_jawab,
            po.tanggal_pakai AS tanggal,
            po.keterangan
          FROM pemakaian_oli po
          LEFT JOIN oli_masuk om ON po.id_oli_masuk = om.id
          LEFT JOIN vendor v ON om.id_vendor = v.id
          LEFT JOIN kendaraan k ON po.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(po.tanggal_pakai) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(po.tanggal_pakai) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(po.tanggal_pakai) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND om.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND om.nama_oli LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND om.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND po.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY po.tanggal_pakai DESC, po.id DESC";

            } else {
                // UNION ALL untuk semua (sparepart + ban + barang + oli)
                sql = `
          SELECT
            p.id,
            s.no_seri,
            s.nama_sparepart,
            '' AS merk,
            p.jumlah,
            p.satuan,
            s.harga,
            (p.jumlah * s.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            p.penanggung_jawab,
            p.tanggal,
            '' AS keterangan
          FROM pemakaian_sparepart p
          LEFT JOIN stok_sparepart s ON p.sparepart_id = s.id
          LEFT JOIN vendor v ON s.id_vendor = v.id
          LEFT JOIN kendaraan k ON p.kendaraan_id = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(p.tanggal) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(p.tanggal) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(p.tanggal) = ?";
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

                if (satuan && satuan !== 'semua') {
                    sql += " AND p.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND p.kendaraan_id = ?";
                    params.push(req.query.kendaraan);
                }

                // UNION dengan penukaran ban
                sql += `
          UNION ALL
          SELECT
            pb.id,
            sb.no_seri,
            CONCAT('Ban ', sb.merk_ban) AS nama_sparepart,
            sb.merk_ban AS merk,
            1 AS jumlah,
            'pcs' AS satuan,
            sb.harga,
            sb.harga AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            pb.supir AS penanggung_jawab,
            pb.tgl_pasang_ban_baru AS tanggal,
            pb.keterangan
          FROM penukaran_ban pb
          JOIN stok_ban sb ON pb.id_stok = sb.id
          LEFT JOIN vendor v ON sb.id_vendor = v.id
          LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND sb.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND CONCAT('Ban ', sb.merk_ban) LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND 'pcs' = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND pb.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                // UNION dengan tabel barang (OUTPUT)
                sql += `
          UNION ALL
          SELECT
            b.id,
            b.no_seri,
            b.nama_barang AS nama_sparepart,
            b.merk,
            b.jumlah,
            b.satuan,
            b.harga,
            (b.jumlah * b.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            b.penanggung_jawab,
            b.tanggal,
            '' AS keterangan
          FROM barang b
          LEFT JOIN vendor v ON b.vendor_id = v.id
          LEFT JOIN kendaraan k ON b.kendaraan_id = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(b.tanggal) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(b.tanggal) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(b.tanggal) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND b.vendor_id = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND b.nama_barang LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND b.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND b.kendaraan_id = ?";
                    params.push(req.query.kendaraan);
                }

                // UNION dengan pemakaian_oli
                sql += `
          UNION ALL
          SELECT
            po.id,
            om.no_seri,
            om.nama_oli AS nama_sparepart,
            '' AS merk,
            po.jumlah_pakai AS jumlah,
            om.satuan,
            om.harga AS harga,
            (po.jumlah_pakai * om.harga) AS total,
            v.nama_vendor,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
            po.keterangan AS penanggung_jawab,
            po.tanggal_pakai AS tanggal,
            po.keterangan
          FROM pemakaian_oli po
          LEFT JOIN oli_masuk om ON po.id_oli_masuk = om.id
          LEFT JOIN vendor v ON om.id_vendor = v.id
          LEFT JOIN kendaraan k ON po.id_kendaraan = k.id
          WHERE 1=1
        `;

                if (start && end) {
                    sql += " AND DATE(po.tanggal_pakai) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(po.tanggal_pakai) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(po.tanggal_pakai) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND om.id_vendor = ?";
                    params.push(vendor);
                }

                if (barang) {
                    sql += " AND om.nama_oli LIKE ?";
                    params.push(`%${barang}%`);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND om.satuan = ?";
                    params.push(satuan);
                }

                if (req.query.kendaraan) {
                    sql += " AND po.id_kendaraan = ?";
                    params.push(req.query.kendaraan);
                }

                sql += " ORDER BY tanggal DESC, id DESC";
            }

            // GET /rekap - Update bagian type === 'vendor'
            // Ganti bagian UNION oli_masuk dengan query ini:

            } else if (type === 'vendor') {
                // UNION: barang_masuk, stok_ban, dan oli_masuk (yang belum digabung)
                sql = `
                    SELECT
                        b.id,
                        b.tgl_sparepart_masuk AS tanggal,
                        b.nama_sparepart,
                        b.no_seri,
                        b.jumlah,
                        b.satuan,
                        b.harga,
                        (b.jumlah * b.harga) AS total,
                        v.nama_vendor,
                        b.id_vendor,
                        'Sparepart' AS jenis
                    FROM barang_masuk b
                    LEFT JOIN vendor v ON b.id_vendor = v.id
                    WHERE 1=1
                `;

                if (start && end) {
                    sql += " AND DATE(b.tgl_sparepart_masuk) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(b.tgl_sparepart_masuk) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(b.tgl_sparepart_masuk) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND b.id_vendor = ?";
                    params.push(vendor);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND b.satuan = ?";
                    params.push(satuan);
                }

                // UNION dengan stok_ban
                sql += `
                    UNION ALL
                    SELECT
                        sb.id,
                        sb.tgl_ban_masuk AS tanggal,
                        CONCAT('Ban ', sb.merk_ban) AS nama_sparepart,
                        sb.no_seri,
                        sb.jumlah,
                        sb.satuan,
                        sb.harga,
                        (sb.jumlah * sb.harga) AS total,
                        v.nama_vendor,
                        sb.id_vendor,
                        'Ban' AS jenis
                    FROM stok_ban sb
                    LEFT JOIN vendor v ON sb.id_vendor = v.id
                    WHERE 1=1
                `;

                if (start && end) {
                    sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(sb.tgl_ban_masuk) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(sb.tgl_ban_masuk) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND sb.id_vendor = ?";
                    params.push(vendor);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND sb.satuan = ?";
                    params.push(satuan);
                }

                // UNION dengan oli_masuk (HANYA yang belum digabung / id_oli_lama IS NULL)
                sql += `
                    UNION ALL
                    SELECT
                        om.id,
                        om.tanggal_masuk AS tanggal,
                        om.nama_oli AS nama_sparepart,
                        om.no_seri,
                        om.total_masuk AS jumlah,
                        om.satuan,
                        om.harga,
                        (om.total_masuk * om.harga) AS total,
                        v.nama_vendor,
                        om.id_vendor,
                        'Oli' AS jenis
                    FROM oli_masuk om
                    LEFT JOIN vendor v ON om.id_vendor = v.id
                    WHERE om.id_oli_lama IS NULL
                `;

                if (start && end) {
                    sql += " AND DATE(om.tanggal_masuk) BETWEEN ? AND ?";
                    params.push(start, end);
                } else if (start) {
                    sql += " AND DATE(om.tanggal_masuk) = ?";
                    params.push(start);
                } else if (end) {
                    sql += " AND DATE(om.tanggal_masuk) = ?";
                    params.push(end);
                }

                if (vendor) {
                    sql += " AND om.id_vendor = ?";
                    params.push(vendor);
                }

                if (satuan && satuan !== 'semua') {
                    sql += " AND om.satuan = ?";
                    params.push(satuan);
                }

                sql += " ORDER BY tanggal DESC, id DESC";
            } else {
            // Default: return empty array jika type tidak valid
            return res.json([]);
        }

        // Eksekusi query
        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /rekap:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /rekap:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// GET /rekap_ban
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap penukaran ban yang sudah dipakai dengan filter tanggal, vendor, kendaraan
router.get("/rekap_ban", (req, res) => {
    try {
        let { start, end, vendor, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        pb.id,
        pb.seri_lama,
        pb.merk_lama,
        pb.tanggal_pasang_lama,
        pb.km_awal,
        pb.km_akhir,
        pb.jarak_km,
        pb.keterangan,
        sb.no_seri,
        sb.merk_ban,
        sb.jumlah,
        sb.satuan,
        sb.harga,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        pb.supir,
        pb.tgl_pasang_ban_baru,
        pb.km_gps
      FROM penukaran_ban pb
      JOIN stok_ban sb ON pb.id_stok = sb.id
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        if (kendaraan) {
            if (isNaN(kendaraan)) {
                sql += " AND CONCAT(k.dt_mobil, ' - ', k.plat) LIKE ?";
                params.push(`%${kendaraan}%`);
            } else {
                sql += " AND pb.id_kendaraan = ?";
                params.push(kendaraan);
            }
        }

        sql += " ORDER BY pb.tgl_pasang_ban_baru DESC, pb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /rekap_ban:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /rekap_ban:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// GET /ban_masuk
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap data ban masuk (dari stok_ban) dengan filter tanggal, vendor, merk ban
router.get("/ban_masuk", (req, res) => {
    try {
        let { start, end, vendor, merkBan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        sb.id,
        sb.tgl_ban_masuk,
        sb.merk_ban,
        sb.no_seri,
        sb.jumlah,
        sb.satuan,
        sb.harga,
        v.nama_vendor
      FROM stok_ban sb
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        if (merkBan) {
            sql += " AND sb.merk_ban LIKE ?";
            params.push(`%${merkBan}%`);
        }

        sql += " ORDER BY sb.tgl_ban_masuk DESC, sb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /ban_masuk:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /ban_masuk:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// GET /stok_ban
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap stok ban yang belum dipakai dengan filter tanggal, vendor, merk ban
router.get("/stok_ban", (req, res) => {
    try {
        let { start, end, vendor, merkBan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        sb.id,
        sb.tgl_ban_masuk,
        sb.merk_ban,
        sb.no_seri,
        sb.jumlah,
        sb.satuan,
        sb.harga,
        sb.id_vendor,
        v.nama_vendor
      FROM stok_ban sb
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      WHERE NOT EXISTS (
        SELECT 1 FROM penukaran_ban pb WHERE pb.id_stok = sb.id
      )
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        if (merkBan) {
            sql += " AND sb.merk_ban LIKE ?";
            params.push(`%${merkBan}%`);
        }

        sql += " ORDER BY sb.tgl_ban_masuk DESC, sb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /stok_ban:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /stok_ban:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// GET /pemakaian_ban_per_masuk
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Rekap pemakaian ban berdasarkan tanggal ban masuk dengan filter tanggal dan vendor
router.get("/pemakaian_ban_per_masuk", (req, res) => {
    try {
        let { start, end, vendor } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        pb.id,
        sb.tgl_ban_masuk,
        sb.merk_ban,
        sb.no_seri,
        sb.harga,
        v.nama_vendor,
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
        pb.tgl_pasang_ban_baru AS tanggal_pemakaian,
        pb.keterangan
      FROM penukaran_ban pb
      JOIN stok_ban sb ON pb.id_stok = sb.id
      LEFT JOIN vendor v ON sb.id_vendor = v.id
      LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(sb.tgl_ban_masuk) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(sb.tgl_ban_masuk) = ?";
            params.push(end);
        }

        if (vendor) {
            sql += " AND sb.id_vendor = ?";
            params.push(vendor);
        }

        sql += " ORDER BY sb.tgl_ban_masuk DESC, pb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /pemakaian_ban_per_masuk:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /pemakaian_ban_per_masuk:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// GET /data_kendaraan
// Page: lapban.html | JS: js/ban/lapban.js
// Fungsi: Riwayat penukaran ban per kendaraan dengan filter tanggal
router.get("/data_kendaraan", (req, res) => {
    try {
        let { start, end, kendaraan } = req.query;

        const dateRE = /^\d{4}-\d{2}-\d{2}$/;
        if (start && !dateRE.test(start)) return res.status(400).json({ error: "start harus format YYYY-MM-DD" });
        if (end && !dateRE.test(end)) return res.status(400).json({ error: "end harus format YYYY-MM-DD" });

        if (start && end && start > end) {
            const tmp = start;
            start = end;
            end = tmp;
        }

        let sql = `
      SELECT
        CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
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
        pb.merk_baru,
        pb.seri_ban_baru
      FROM penukaran_ban pb
      LEFT JOIN stok_ban sb ON pb.id_stok = sb.id
      LEFT JOIN kendaraan k ON pb.id_kendaraan = k.id
      WHERE 1=1
    `;
        const params = [];

        if (start && end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) BETWEEN ? AND ?";
            params.push(start, end);
        } else if (start) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(start);
        } else if (end) {
            sql += " AND DATE(pb.tgl_pasang_ban_baru) = ?";
            params.push(end);
        }

        if (kendaraan) {
            sql += " AND pb.id_kendaraan = ?";
            params.push(kendaraan);
        }

        sql += " ORDER BY pb.tgl_pasang_ban_baru DESC, pb.id DESC";

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Error /data_kendaraan:", err);
                return res.status(500).json({ error: "Terjadi kesalahan pada server" });
            }
            res.json(results);
        });
    } catch (err) {
        console.error("Exception /data_kendaraan:", err);
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
});

// ========================================
module.exports = router;
