// Validasi input dari klien (trust boundary).
// Balas 400 dan return true bila tidak valid.
function tolakInputTidakValid(req, res, wajib = [], positif = []) {
    const kosong = wajib.filter((f) => req.body[f] === undefined || req.body[f] === null || String(req.body[f]).trim() === "");
    if (kosong.length) {
        res.status(400).json({ message: `Field wajib diisi: ${kosong.join(", ")}` });
        return true;
    }
    const tidakValid = positif.filter((f) => !(parseFloat(String(req.body[f]).replace(",", ".")) > 0));
    if (tidakValid.length) {
        res.status(400).json({ message: `Nilai harus angka lebih dari 0: ${tidakValid.join(", ")}` });
        return true;
    }
    return false;
}

module.exports = { tolakInputTidakValid };
