-- ============================================================
-- Database: db_stok
-- Direkonstruksi dari query di backend/server.js (tidak ada dump asli).
-- Tipe kolom numerik/tanggal ditebak; sesuaikan bila beda dengan data lama.
-- Jalankan: mysql -uroot < backend/database/db_stok.sql
-- Aman dijalankan ulang: tabel yang sudah ada TIDAK dihapus (IF NOT EXISTS).
-- Untuk reset total, jalankan dulu: DROP DATABASE db_stok;
-- ============================================================


CREATE DATABASE IF NOT EXISTS db_stok CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE db_stok;

CREATE TABLE IF NOT EXISTS vendor (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_vendor VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS kendaraan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dt_mobil VARCHAR(150),
  plat VARCHAR(20)
);

-- Sparepart: stok_sparepart dan barang_masuk memakai id yang sama
-- (lihat DELETE /sparepart/:id dan POST /sparepart)
CREATE TABLE IF NOT EXISTS stok_sparepart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tgl_sparepart_masuk DATE,
  nama_sparepart VARCHAR(150),
  no_seri VARCHAR(100),
  jumlah DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  harga DECIMAL(15,2) DEFAULT 0,
  id_vendor INT
);

CREATE TABLE IF NOT EXISTS barang_masuk (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tgl_sparepart_masuk DATE,
  nama_sparepart VARCHAR(150),
  no_seri VARCHAR(100),
  jumlah DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  harga DECIMAL(15,2) DEFAULT 0,
  id_vendor INT
);

CREATE TABLE IF NOT EXISTS barang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_seri VARCHAR(100),
  nama_barang VARCHAR(150),
  merk VARCHAR(100),
  jumlah DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  harga DECIMAL(15,2) DEFAULT 0,
  vendor_id INT,
  kendaraan_id INT,
  penanggung_jawab VARCHAR(150),
  tanggal DATE
);

CREATE TABLE IF NOT EXISTS pemakaian_sparepart (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sparepart_id INT,
  kendaraan_id INT,
  jumlah DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  penanggung_jawab VARCHAR(150),
  tanggal DATE
);

CREATE TABLE IF NOT EXISTS histori_pemakaian (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sparepart_id INT,
  kendaraan_id INT,
  jumlah DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  penanggung_jawab VARCHAR(150),
  tanggal DATE,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ban
CREATE TABLE IF NOT EXISTS stok_ban (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tgl_ban_masuk DATE,
  merk_ban VARCHAR(100),
  no_seri VARCHAR(100),
  jumlah DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  harga DECIMAL(15,2) DEFAULT 0,
  id_vendor INT
);

CREATE TABLE IF NOT EXISTS penukaran_ban (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_kendaraan INT,
  supir VARCHAR(150),
  tanggal_pasang_lama DATE,
  merk_lama VARCHAR(100),
  seri_lama VARCHAR(100),
  km_awal DECIMAL(12,2),
  km_akhir DECIMAL(12,2),
  jarak_km DECIMAL(12,2),
  km_gps DECIMAL(12,2),
  keterangan TEXT,
  tgl_pasang_ban_baru DATE,
  merk_baru VARCHAR(100),
  seri_ban_baru VARCHAR(100),
  id_stok INT
);

CREATE TABLE IF NOT EXISTS histori_ban (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_kendaraan INT,
  supir VARCHAR(150),
  tanggal_pasang_lama DATE,
  merk_lama VARCHAR(100),
  seri_lama VARCHAR(100),
  km_awal DECIMAL(12,2),
  km_akhir DECIMAL(12,2),
  jarak_km DECIMAL(12,2),
  km_gps DECIMAL(12,2),
  keterangan TEXT,
  tgl_pasang_ban_baru DATE,
  seri_ban_baru VARCHAR(100),
  merk_baru VARCHAR(100),
  id_stok INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Oli
CREATE TABLE IF NOT EXISTS oli_masuk (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal_masuk DATE,
  nama_oli VARCHAR(150),
  no_seri VARCHAR(100),
  jumlah_baru DECIMAL(12,2) DEFAULT 0,
  sisa_lama DECIMAL(12,2) DEFAULT 0,
  total_masuk DECIMAL(12,2) DEFAULT 0,
  stok_tersisa DECIMAL(12,2) DEFAULT 0,
  satuan VARCHAR(30),
  harga DECIMAL(15,2) DEFAULT 0,
  id_vendor INT,
  id_oli_lama INT NULL,
  id_oli_baru INT NULL,
  keterangan TEXT
);

CREATE TABLE IF NOT EXISTS stok_oli (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_oli_masuk INT NOT NULL,
  total_stok DECIMAL(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pemakaian_oli (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal_pakai DATE,
  id_oli_masuk INT,
  id_kendaraan INT,
  jumlah_pakai DECIMAL(12,2) DEFAULT 0,
  keterangan TEXT
);
