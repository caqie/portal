import React, { useState } from 'react';
import { PPPKEvaluation, PPPKHasilKerjaItem } from '../../types';
import { resolveOfficialEvaluationDetails, saveOfficialEvaluationCustomization } from '../../services/pppkOfficialDocumentService';

interface PPPKOfficialDocEditorProps {
  evaluation: PPPKEvaluation;
  onSaved: (updated: PPPKEvaluation) => void;
}

export const PPPKOfficialDocEditor: React.FC<PPPKOfficialDocEditorProps> = ({ evaluation, onSaved }) => {
  const initial = resolveOfficialEvaluationDetails(evaluation);

  const [pangkatPegawai, setPangkatPegawai] = useState(initial.pangkatPegawai);
  
  // Pejabat Penilai
  const [pejabatNama, setPejabatNama] = useState(initial.pejabatPenilai.nama);
  const [pejabatNip, setPejabatNip] = useState(initial.pejabatPenilai.nip);
  const [pejabatPangkat, setPejabatPangkat] = useState(initial.pejabatPenilai.pangkatGolRuang);
  const [pejabatJabatan, setPejabatJabatan] = useState(initial.pejabatPenilai.jabatan);
  const [pejabatUnit, setPejabatUnit] = useState(initial.pejabatPenilai.unitKerja);

  // Atasan Pejabat Penilai
  const [atasanNama, setAtasanNama] = useState(initial.atasanPejabatPenilai.nama);
  const [atasanNip, setAtasanNip] = useState(initial.atasanPejabatPenilai.nip);
  const [atasanPangkat, setAtasanPangkat] = useState(initial.atasanPejabatPenilai.pangkatGolRuang);
  const [atasanJabatan, setAtasanJabatan] = useState(initial.atasanPejabatPenilai.jabatan);
  const [atasanUnit, setAtasanUnit] = useState(initial.atasanPejabatPenilai.unitKerja);

  // Rating & Rekomendasi
  const [rekomendasi, setRekomendasi] = useState(initial.rekomendasi);
  const [catatanKinerja, setCatatanKinerja] = useState<string>(
    Array.isArray(initial.catatanKinerja) ? initial.catatanKinerja[0] || 'DIPERTAHANKAN' : (initial.catatanKinerja as string) || 'DIPERTAHANKAN'
  );
  const [catatanTambahan, setCatatanTambahan] = useState(initial.catatanTambahan);
  const [kotaTtd, setKotaTtd] = useState(initial.kotaTtd);
  const [tanggalTtd, setTanggalTtd] = useState(initial.tanggalTtd);

  // Hasil Kerja Items
  const [hasilKerjaList, setHasilKerjaList] = useState<PPPKHasilKerjaItem[]>(initial.hasilKerjaList);

  const [isSavedAlert, setIsSavedAlert] = useState(false);

  const handleUpdateHasilKerja = (index: number, field: keyof PPPKHasilKerjaItem, value: any) => {
    const updated = [...hasilKerjaList];
    updated[index] = {
      ...updated[index],
      [field]: field === 'target' || field === 'realisasi' ? Number(value) || 0 : value
    };
    setHasilKerjaList(updated);
  };

  const handleAddHasilKerja = () => {
    setHasilKerjaList([
      ...hasilKerjaList,
      {
        no: hasilKerjaList.length + 1,
        rencanaHasilKerja: 'Tugas/kegiatan tambahan sesuai instruksi pimpinan',
        target: 10,
        realisasi: 10
      }
    ]);
  };

  const handleRemoveHasilKerja = (idx: number) => {
    if (hasilKerjaList.length <= 1) return;
    setHasilKerjaList(hasilKerjaList.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const customPayload: Partial<PPPKEvaluation> = {
      pangkatGolRuang: pangkatPegawai,
      pejabatPenilai: {
        nama: pejabatNama,
        nip: pejabatNip,
        pangkatGolRuang: pejabatPangkat,
        jabatan: pejabatJabatan,
        unitKerja: pejabatUnit
      },
      atasanPejabatPenilai: {
        nama: atasanNama,
        nip: atasanNip,
        pangkatGolRuang: atasanPangkat,
        jabatan: atasanJabatan,
        unitKerja: atasanUnit
      },
      rekomendasi,
      catatanKinerja,
      catatanTambahan,
      kotaTtd,
      tanggalTtd,
      hasilKerjaList
    };

    const updated = saveOfficialEvaluationCustomization(evaluation.id, customPayload);
    if (updated) {
      onSaved(updated);
      setIsSavedAlert(true);
      setTimeout(() => setIsSavedAlert(false), 3500);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs">
      {isSavedAlert && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex items-center gap-2">
          <i className="bi bi-check-circle-fill text-emerald-600 text-base"></i>
          <span>Perubahan data formulir resmi berhasil disimpan! Dokumen cetak dan pratinjau telah diperbarui.</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Pengaturan Data Dokumen Resmi PPPK</h3>
          <p className="text-[11px] text-slate-500">Sesuaikan data Pejabat Penilai, Atasan Penilai, Rekomendasi, dan Butir Sasaran Kerja.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow flex items-center gap-1.5 transition-colors"
        >
          <i className="bi bi-save2"></i>
          Simpan Perubahan
        </button>
      </div>

      {/* Bagian 1: Data Pegawai */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px]">1</span>
          Data Pegawai PPPK
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Nama Pegawai</label>
            <input type="text" value={evaluation.nama} disabled className="w-full bg-slate-200 border border-slate-300 rounded-lg p-2 text-slate-600 cursor-not-allowed" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">NIP Pegawai</label>
            <input type="text" value={evaluation.employeeId} disabled className="w-full bg-slate-200 border border-slate-300 rounded-lg p-2 text-slate-600 cursor-not-allowed" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Pangkat / Golongan Ruang</label>
            <input
              type="text"
              value={pangkatPegawai}
              onChange={e => setPangkatPegawai(e.target.value)}
              placeholder="Contoh: Ahli Pertama - IX"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Jabatan & Unit Kerja</label>
            <input type="text" value={`${evaluation.jabatan} - ${evaluation.unitKerja}`} disabled className="w-full bg-slate-200 border border-slate-300 rounded-lg p-2 text-slate-600 cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* Bagian 2: Pejabat Penilai Kinerja */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px]">2</span>
          Pejabat Penilai Kinerja (Pejabat Manajerial / Ketua Tim Kerja)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Nama Pejabat Penilai</label>
            <input
              type="text"
              value={pejabatNama}
              onChange={e => setPejabatNama(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">NIP Pejabat Penilai</label>
            <input
              type="text"
              value={pejabatNip}
              onChange={e => setPejabatNip(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Pangkat / Gol Ruang</label>
            <input
              type="text"
              value={pejabatPangkat}
              onChange={e => setPejabatPangkat(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Jabatan</label>
            <input
              type="text"
              value={pejabatJabatan}
              onChange={e => setPejabatJabatan(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-600 mb-1">Unit Kerja</label>
            <input
              type="text"
              value={pejabatUnit}
              onChange={e => setPejabatUnit(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bagian 3: Atasan Pejabat Penilai Kinerja */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px]">3</span>
          Atasan Pejabat Penilai Kinerja (Direktur / Sesditjen)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Nama Atasan Pejabat Penilai</label>
            <input
              type="text"
              value={atasanNama}
              onChange={e => setAtasanNama(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">NIP Atasan Pejabat</label>
            <input
              type="text"
              value={atasanNip}
              onChange={e => setAtasanNip(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Pangkat / Gol Ruang</label>
            <input
              type="text"
              value={atasanPangkat}
              onChange={e => setAtasanPangkat(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Jabatan</label>
            <input
              type="text"
              value={atasanJabatan}
              onChange={e => setAtasanJabatan(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-600 mb-1">Unit Kerja</label>
            <input
              type="text"
              value={atasanUnit}
              onChange={e => setAtasanUnit(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bagian 4: Rekomendasi & Catatan */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px]">4</span>
          Rekomendasi, Catatan Kinerja & Tempat / Tanggal Pengesahan
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Rekomendasi Perjanjian Kinerja</label>
            <select
              value={rekomendasi}
              onChange={e => setRekomendasi(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="PERPANJANGAN PERJANJIAN KINERJA">PERPANJANGAN PERJANJIAN KINERJA</option>
              <option value="PEMUTUSAN PERJANJIAN KINERJA">PEMUTUSAN PERJANJIAN KINERJA</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Catatan Kinerja</label>
            <select
              value={catatanKinerja}
              onChange={e => setCatatanKinerja(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            >
              <option value="DIPERTAHANKAN">DIPERTAHANKAN</option>
              <option value="ROTASI">ROTASI</option>
              <option value="PENGEMBANGAN KARIR">PENGEMBANGAN KARIR</option>
              <option value="BIMBINGAN KINERJA">BIMBINGAN KINERJA</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Kota Penandatanganan</label>
            <input
              type="text"
              value={kotaTtd}
              onChange={e => setKotaTtd(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Tanggal Dokumen Resmi</label>
            <input
              type="text"
              value={tanggalTtd}
              onChange={e => setTanggalTtd(e.target.value)}
              placeholder="Contoh: 31 Desember 2024"
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-600 mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              value={catatanTambahan}
              onChange={e => setCatatanTambahan(e.target.value)}
              placeholder="Contoh: Kinerja sangat baik dan disiplin tinggi dalam pelaksanaan tugas."
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bagian 5: Penilaian Hasil Kerja (Target vs Realisasi) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="w-5 h-5 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-[10px]">5</span>
            Rencana Hasil Kerja (Target vs Realisasi)
          </h4>
          <button
            type="button"
            onClick={handleAddHasilKerja}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg border border-blue-200 flex items-center gap-1 text-[11px]"
          >
            <i className="bi bi-plus-lg"></i> Tambah Butir Hasil Kerja
          </button>
        </div>

        <div className="space-y-2">
          {hasilKerjaList.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="w-6 text-center font-bold text-slate-400">{idx + 1}.</span>
              <input
                type="text"
                value={item.rencanaHasilKerja}
                onChange={e => handleUpdateHasilKerja(idx, 'rencanaHasilKerja', e.target.value)}
                placeholder="Rencana Hasil Kerja"
                className="flex-1 bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-slate-800"
              />
              <div className="w-20">
                <input
                  type="number"
                  value={item.target}
                  onChange={e => handleUpdateHasilKerja(idx, 'target', e.target.value)}
                  placeholder="Target"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-center font-bold"
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  value={item.realisasi}
                  onChange={e => handleUpdateHasilKerja(idx, 'realisasi', e.target.value)}
                  placeholder="Realisasi"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-xs text-center font-bold text-blue-700"
                />
              </div>
              {hasilKerjaList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveHasilKerja(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                >
                  <i className="bi bi-trash"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-xs transition-colors"
        >
          <i className="bi bi-check2-circle text-base"></i>
          Simpan Semua Data Formulir Resmi
        </button>
      </div>
    </div>
  );
};
