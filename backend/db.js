const mysql = require('mysql2');

console.log("🔌 Connecting to DB...");

// Kredensial bisa diatur lewat environment variable; default = setup XAMPP lokal
const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "db_stok",
    dateStrings: true
});

// Cek koneksi saat start. Kalau gagal, berhenti: jangan jalan dengan DB mati
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Database gagal connect:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Database connected!");
    conn.release();
  }
});

// Bungkus handler transaksi: tiap request dapat koneksi sendiri dari pool,
// jadi BEGIN/COMMIT/ROLLBACK tidak tercampur request lain.
// Di dalam handler, `db` adalah koneksi khusus request itu.
db.transact = (handler) => (req, res, next) => {
    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: "Terjadi kesalahan pada server" });

        let released = false;
        const release = () => { if (!released) { released = true; conn.release(); } };
        res.once("close", release);

        try {
            handler(req, res, conn);
        } catch (e) {
            release();
            next(e);
        }
    });
};

module.exports = db;
