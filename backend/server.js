console.log("🚀 Server starting...");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db.js"); // juga memastikan koneksi DB dicek saat start
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route dipisah per domain di folder routes/ (urutan mount sama seperti sebelumnya)
app.use(require('./routes/vendor.js'));
app.use(require('./routes/kendaraan.js'));
app.use(require('./routes/barang.js'));
app.use(require('./routes/sparepart.js'));
app.use(require('./routes/pemakaian_sparepart.js'));
app.use(require('./routes/histori_pemakaian.js'));
app.use(require('./routes/ban.js'));
app.use(require('./routes/pban.js'));
app.use(require('./routes/rekap.js'));
app.use(require('./routes/oli.js'));
app.use(require('./routes/rekap_oli.js'));

// GENERAL ENDPOINTS
// ========================================

// GET /
// Page: index.html
// Fungsi: Serving halaman utama aplikasi inventory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ========================================
// START SERVER
// ========================================

// Error handler terakhir: tangkap error yang dilempar handler (mis. input kurang),
// log detailnya di server, dan jangan kirim stack trace ke klien.
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500; // mis. JSON rusak dari body-parser = 400
    res.status(status).json({ error: status < 500 ? "Request tidak valid" : "Terjadi kesalahan pada server" });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});