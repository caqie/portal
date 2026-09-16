import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  PPPKPresensiRow,
  Pegawai,
  EvaluationPeriod
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  getAbsensiDetailRows,
  saveAbsensiDetailRows,
  calculateNilaiKehadiranFromAlfa
} from '../../../services/pppkPenilaianModuleService';

interface PPPKPenilaianKehadiranTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  onDataUpdated?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
}

export const PPPKPenilaianKehadiranTab: React.FC<PPPKPenilaianKehadiranTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments = [],
  onRefreshData,
  onRefreshAll,
  onDataUpdated,
  showToast
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const handleRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
    if (onDataUpdated) onDataUpdated();
  };

  const [rows, setRows] = useState<PPPKPresensiRow[]>(() => {
    try {
      return getAbsensiDetailRows() || [];
    } catch (e) {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<PPPKPresensiRow[] | null>(null);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r =>
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nip.includes(searchQuery)
    );
  }, [rows, searchQuery]);

  // Handle PDF file selection & simulate robust parsing (Admin Only)
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeRole !== 'ADMIN') {
      safeShowToast('Akses ditolak: Hanya Administrator yang berwenang mengunggah dan mem-parsing dokumen PDF presensi.', 'error');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.xlsx')) {
      safeShowToast('Format file harus berupa PDF laporan presensi atau Excel.', 'error');
      return;
    }

    setIsUploading(true);

    // Simulate intelligent extraction of biometric attendance records
    setTimeout(() => {
      const extracted: PPPKPresensiRow[] = [
        {
          id: `ATT-${Date.now()}-1`,
          importId: 'IMPORT-PREVIEW',
          unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
          nip: '199605152024212001',
          nama: 'CHRISTIA SARI, S.H.',
          hariKerja: 120,
          totalHariKerja: 120,
          hadir: 118,
          terlambat: 2,
          pulangCepat: 0,
          alfa: 0,
          dinasLuar: 2,
          wfh: 0,
          izin: 0,
          sakit: 0,
          cuti: 0,
          skorAlfa: 5,
          nilaiKehadiran: 5,
          kategoriAlfa: 'Sangat Baik',
          keterangan: 'Sangat Tertib (Alfa 0)'
        },
        {
          id: `ATT-${Date.now()}-2`,
          importId: 'IMPORT-PREVIEW',
          unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
          nip: '199408122024211002',
          nama: 'DIMAS PRASETYO, S.Kom.',
          hariKerja: 120,
          totalHariKerja: 120,
          hadir: 116,
          terlambat: 3,
          pulangCepat: 1,
          alfa: 1,
          dinasLuar: 1,
          wfh: 0,
          izin: 1,
          sakit: 1,
          cuti: 0,
          skorAlfa: 4,
          nilaiKehadiran: 4,
          kategoriAlfa: 'Baik',
          keterangan: 'Tertib (Alfa 1)'
        },
        {
          id: `ATT-${Date.now()}-3`,
          importId: 'IMPORT-PREVIEW',
          unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
          nip: '199803042024212003',
          nama: 'NURUL AINI, S.Ak.',
          hariKerja: 120,
          totalHariKerja: 120,
          hadir: 119,
          terlambat: 1,
          pulangCepat: 0,
          alfa: 0,
          dinasLuar: 0,
          wfh: 0,
          izin: 0,
          sakit: 1,
          cuti: 0,
          skorAlfa: 5,
          nilaiKehadiran: 5,
          kategoriAlfa: 'Sangat Baik',
          keterangan: 'Sangat Tertib (Alfa 0)'
        },
        {
          id: `ATT-${Date.now()}-4`,
          importId: 'IMPORT-PREVIEW',
          unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
          nip: '199211202024211004',
          nama: 'EKO PRASETYO, S.T.',
          hariKerja: 120,
          totalHariKerja: 120,
          hadir: 112,
          terlambat: 5,
          pulangCepat: 3,
          alfa: 4,
          dinasLuar: 1,
          wfh: 0,
          izin: 2,
          sakit: 1,
          cuti: 0,
          skorAlfa: 3,
          nilaiKehadiran: 3,
          kategoriAlfa: 'Cukup',
          keterangan: 'Cukup (Alfa 4)'
        }
      ];

      setParsedPreview(extracted);
      setIsUploading(false);
      safeShowToast(`File "${file.name}" berhasil diekstrak. ${extracted.length} data presensi siap dikomit.`, 'info');
    }, 900);
  };

  // Commit extracted PDF records (Admin Only)
  const handleCommitPreview = () => {
    if (activeRole !== 'ADMIN') {
      safeShowToast('Hanya Administrator yang berwenang menyimpan hasil parsing presensi.', 'error');
      return;
    }
    if (!parsedPreview) return;
    saveAbsensiDetailRows(parsedPreview, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
    setRows(parsedPreview);
    setParsedPreview(null);
    handleRefresh();
    safeShowToast('Data Rekapitulasi Presensi berhasil dikomit ke database!', 'success');
  };

  // Manual Edit row for Admin
  const handleAlfaChange = (id: string, newAlfa: number) => {
    const updated = rows.map(r => {
      if (r.id === id) {
        const val = Math.max(0, newAlfa);
        const { nilai, kategori } = calculateNilaiKehadiranFromAlfa(val);
        return {
          ...r,
          alfa: val,
          skorAlfa: nilai,
          nilaiKehadiran: nilai,
          kategoriAlfa: kategori,
          keterangan: `${kategori} (Alfa ${val})`
        };
      }
      return r;
    });
    setRows(updated);
    saveAbsensiDetailRows(updated, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
              Submenu 5
            </span>
            <span className="text-xs text-slate-500 font-bold">Bobot Kehadiran 40% pada Nilai Akhir Perilaku</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Penilaian Kehadiran & Bulk Absensi
          </h3>
          <p className="text-xs text-slate-600">
            Terintegrasi dengan mesin presensi DJKI. Analisis tanpa keterangan (Alfa) otomatis mengonversi ke skala 1-5.
          </p>
        </div>

        {/* Upload Button for Admin / Lock indicator for non-admin */}
        {activeRole === 'ADMIN' ? (
          <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2">
            <i className="bi bi-file-earmark-arrow-up-fill text-base"></i>
            {isUploading ? 'Mengekstrak PDF...' : 'Upload & Parser PDF Presensi'}
            <input
              type="file"
              accept=".pdf,.xlsx,.csv"
              className="hidden"
              disabled={isUploading}
              onChange={handlePdfUpload}
            />
          </label>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
            <i className="bi bi-shield-lock-fill text-amber-600 text-sm"></i>
            <span>Parser PDF Khusus Admin</span>
          </div>
        )}
      </div>

      {/* Role Restriction Banner for Non-Admin */}
      {activeRole !== 'ADMIN' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start sm:items-center gap-3 text-xs text-amber-900">
          <i className="bi bi-shield-exclamation text-amber-600 text-lg flex-shrink-0 mt-0.5 sm:mt-0"></i>
          <div>
            <span className="font-bold">Akses Parsing PDF Terbatas:</span> Hanya <strong>Admin Kepegawaian (Admin SDM)</strong> yang berwenang untuk mengunggah dan mem-parsing file PDF rekap presensi biometrik. Pejabat Penilai dan Pegawai hanya memiliki hak akses tinjauan (read-only).
          </div>
        </div>
      )}

      {/* Alfa Conversion Reference Matrix Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest">
            Formula Perhitungan Skor Kehadiran Berdasarkan Tanpa Keterangan (Alfa)
          </span>
          <span className="text-xs text-slate-400">Keputusan Penilaian Disiplin ASN</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {[
            { range: '0 Hari Alfa', score: 5, label: 'Sangat Baik' },
            { range: '1 - 2 Hari Alfa', score: 4, label: 'Baik' },
            { range: '3 - 5 Hari Alfa', score: 3, label: 'Cukup' },
            { range: '6 - 8 Hari Alfa', score: 2, label: 'Kurang' },
            { range: '> 8 Hari Alfa', score: 1, label: 'Sangat Kurang' }
          ].map(tier => (
            <div key={tier.score} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
              <div className="text-xl font-black text-emerald-400">{tier.score}</div>
              <div className="text-xs font-bold text-white mt-0.5">{tier.range}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{tier.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Extracted PDF Modal/Panel if available */}
      {parsedPreview && (
        <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-500 shadow-lg space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                <i className="bi bi-file-earmark-check-fill text-emerald-600 text-lg"></i>
                Pratinjau Hasil Parsing Dokumen Presensi
              </h4>
              <p className="text-xs text-emerald-800">
                Ditemukan {parsedPreview.length} catatan pegawai. Periksa data sebelum mengomit ke database utama.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleCommitPreview}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
              >
                Komit ke Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-800">
            Rekapitulasi Kehadiran Pegawai PPPK Periode {selectedPeriod?.semester} {selectedPeriod?.year}
          </h4>

          <input
            type="text"
            placeholder="Cari Nama / NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 w-52"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 min-w-[200px]">Pegawai (NIP)</th>
                <th className="py-3 px-2 text-center">Hari Kerja</th>
                <th className="py-3 px-2 text-center text-emerald-700">Hadir</th>
                <th className="py-3 px-2 text-center text-amber-700">Terlambat</th>
                <th className="py-3 px-2 text-center text-amber-700">Plg Cepat</th>
                <th className="py-3 px-2 text-center text-rose-700">Alfa (Tanpa Ket.)</th>
                <th className="py-3 px-2 text-center">DL</th>
                <th className="py-3 px-2 text-center">Cuti/Sakit</th>
                <th className="py-3 px-3 text-center">Nilai Kehadiran</th>
                <th className="py-3 px-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.nama}</div>
                    <div className="text-[11px] text-slate-500 font-mono">NIP: {r.nip}</div>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold">{r.totalHariKerja ?? r.hariKerja ?? 120}</td>
                  <td className="py-3 px-2 text-center font-bold text-emerald-700">{r.hadir}</td>
                  <td className="py-3 px-2 text-center font-semibold text-amber-600">{r.terlambat}</td>
                  <td className="py-3 px-2 text-center font-semibold text-amber-600">{r.pulangCepat}</td>
                  
                  {/* Alfa Cell */}
                  <td className="py-3 px-2 text-center">
                    {activeRole === 'ADMIN' ? (
                      <input
                        type="number"
                        value={r.alfa}
                        onChange={(e) => handleAlfaChange(r.id, Number(e.target.value))}
                        className="w-12 px-1 py-0.5 text-center font-black rounded border border-slate-300 text-rose-600 focus:ring-1 focus:ring-rose-500"
                      />
                    ) : (
                      <span className="font-black text-rose-600">{r.alfa}</span>
                    )}
                  </td>

                  <td className="py-3 px-2 text-center font-semibold">{r.dinasLuar}</td>
                  <td className="py-3 px-2 text-center font-semibold">{r.cuti + r.sakit + r.izin}</td>
                  
                  {/* Nilai Kehadiran Scale 1-5 */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {(r.nilaiKehadiran ?? r.skorAlfa ?? 5).toFixed(2)} / 5.00
                    </span>
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-600">
                    {r.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
