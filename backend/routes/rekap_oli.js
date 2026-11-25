const express = require('express');
const db = require('../db.js');

const router = express.Router();

// REKAP OLI ENDPOINTS
// ========================================

// GET /rekap/oli_masuk
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Rekap oli masuk (tanpa gabungan) dengan filter tanggal, vendor, nama oli, no seri
router.get("/rekap/oli_masuk", (req, res) => {
    const { start, end, vendor, nama_oli, no_seri } = req.query;

    let sql = `
    SELECT
      om.id,
      om.tanggal_masuk,
      om.nama_oli,
      om.no_seri,
      om.jumlah_baru,
      om.harga,
      om.satuan,
      v.nama_vendor
    FROM oli_masuk om
    LEFT JOIN vendor v ON om.id_vendor = v.id
    WHERE 1=1
  `;

    const params = [];

    if (start && end) {
        sql += ` AND DATE(om.tanggal_masuk) BETWEEN ? AND ?`;
        params.push(start, end);
    }

    if (vendor) {
        sql += ` AND om.id_vendor = ?`;
        params.push(vendor);
    }

    if (nama_oli) {
        sql += ` AND om.nama_oli LIKE ?`;
        params.push(`%${nama_oli}%`);
    }

    if (no_seri) {
        sql += ` AND om.no_seri LIKE ?`;
        params.push(`%${no_seri}%`);
    }

    sql += ` ORDER BY om.tanggal_masuk DESC, om.id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /rekap/oli_masuk GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// GET /rekap/oli_tersedia
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Rekap oli tersedia dengan filter vendor, nama oli, tanggal (menampilkan semua data dari stok_oli)
router.get("/rekap/oli_tersedia", (req, res) => {
    const { vendor, nama_oli, start, end, no_seri } = req.query;

    let sql = `
    SELECT
      om.id,
      om.tanggal_masuk,
      om.nama_oli,
      om.no_seri,
      om.jumlah_baru,
      om.sisa_lama,
      om.total_masuk,
      om.stok_tersisa AS stok_tersisa_om,
      COALESCE(so.total_stok, 0) AS total_stok,
      om.satuan,
      om.harga,
      om.id_vendor,
      om.id_oli_lama,
      om.id_oli_baru,
      v.nama_vendor,
      om_lama.no_seri AS no_seri_lama,
      COALESCE(
        (SELECT SUM(po.jumlah_pakai)
         FROM pemakaian_oli po
         WHERE po.id_oli_masuk = om.id),
        0
      ) as total_dipakai
    FROM stok_oli so
    JOIN oli_masuk om ON so.id_oli_masuk = om.id
    LEFT JOIN vendor v ON om.id_vendor = v.id
    LEFT JOIN oli_masuk om_lama ON om.id_oli_lama = om_lama.id
  `;

    const params = [];

    // Filter tanggal
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

    if (nama_oli) {
        sql += " AND om.nama_oli LIKE ?";
        params.push(`%${nama_oli}%`);
    }

    if (no_seri) {
        sql += " AND om.no_seri LIKE ?";
        params.push(`%${no_seri}%`);
    }

    sql += " ORDER BY om.nama_oli, om.no_seri";

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /rekap/oli_tersedia GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// GET /rekap/pemakaian_oli
// Page: rekapoli.html | JS: js/literan/rekapoli.js
// Fungsi: Rekap pemakaian oli dengan filter tanggal, kendaraan, nama oli, vendor, no seri
router.get("/rekap/pemakaian_oli", (req, res) => {
    const { start, end, kendaraan, nama_oli, vendor, no_seri } = req.query;

    let sql = `
    SELECT
      po.id,
      po.tanggal_pakai,
      po.jumlah_pakai,
      po.keterangan,
      om.nama_oli,
      om.no_seri,
      om.harga,
      CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan,
      v.nama_vendor,
      om.id_vendor
    FROM pemakaian_oli po
    JOIN oli_masuk om ON po.id_oli_masuk = om.id
    JOIN kendaraan k ON po.id_kendaraan = k.id
    LEFT JOIN vendor v ON om.id_vendor = v.id
    WHERE 1=1
  `;

    const params = [];

    if (start && end) {
        sql += ` AND DATE(po.tanggal_pakai) BETWEEN ? AND ?`;
        params.push(start, end);
    }

    if (kendaraan) {
        sql += ` AND po.id_kendaraan = ?`;
        params.push(kendaraan);
    }

    if (nama_oli) {
        sql += ` AND om.nama_oli LIKE ?`;
        params.push(`%${nama_oli}%`);
    }

    if (vendor) {
        sql += ` AND om.id_vendor = ?`;
        params.push(vendor);
    }

    if (no_seri) {
        sql += ` AND om.no_seri LIKE ?`;
        params.push(`%${no_seri}%`);
    }

    sql += ` ORDER BY po.tanggal_pakai DESC, po.id DESC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /rekap/pemakaian_oli GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// ========================================
module.exports = router;
