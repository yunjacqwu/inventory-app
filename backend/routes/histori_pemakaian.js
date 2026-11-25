const express = require('express');
const db = require('../db.js');

const router = express.Router();

// HISTORI PEMAKAIAN ENDPOINTS
// ========================================

// GET /histori_pemakaian
// Fungsi: Mengambil histori perubahan dan penghapusan pemakaian sparepart
router.get("/histori_pemakaian", (req, res) => {
    const { start, end, sparepart, kendaraan } = req.query;
    
    let sql = `
        SELECT 
            h.*,
            s.nama_sparepart,
            s.no_seri,
            CONCAT(k.dt_mobil, ' - ', k.plat) AS kendaraan_info,
            DATE_FORMAT(h.created_at, '%d/%m/%Y %H:%i:%s') AS waktu_perubahan
        FROM histori_pemakaian h
        LEFT JOIN stok_sparepart s ON h.sparepart_id = s.id
        LEFT JOIN kendaraan k ON h.kendaraan_id = k.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (start && end) {
        sql += " AND DATE(h.tanggal) BETWEEN ? AND ?";
        params.push(start, end);
    } else if (start) {
        sql += " AND DATE(h.tanggal) = ?";
        params.push(start);
    } else if (end) {
        sql += " AND DATE(h.tanggal) = ?";
        params.push(end);
    }
    
    if (sparepart) {
        sql += " AND h.sparepart_id = ?";
        params.push(sparepart);
    }
    
    if (kendaraan) {
        sql += " AND h.kendaraan_id = ?";
        params.push(kendaraan);
    }
    
    sql += " ORDER BY h.created_at DESC, h.id DESC";
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error /histori_pemakaian GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results);
    });
});

// GET /histori_pemakaian/stats
// Fungsi: Statistik histori (total edit, total hapus, dll)
router.get("/histori_pemakaian/stats", (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_histori,
            SUM(CASE WHEN keterangan LIKE 'EDIT:%' THEN 1 ELSE 0 END) as total_edit,
            SUM(CASE WHEN keterangan LIKE 'HAPUS:%' THEN 1 ELSE 0 END) as total_hapus,
            DATE(MIN(created_at)) as histori_pertama,
            DATE(MAX(created_at)) as histori_terakhir
        FROM histori_pemakaian
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error /histori_pemakaian/stats GET:", err);
            return res.status(500).json({ error: "Terjadi kesalahan pada server" });
        }
        res.json(results[0]);
    });
});

// ========================================
module.exports = router;
