import React, { useState, useEffect } from 'react';
import { PPPKBulkAttendanceRecord, PPPKSemester } from '../../types';
import {
  getBulkAttendanceRecords,
  saveBulkAttendanceRecords,
  calculateAttendanceCriteria
} from '../../services/pppkEvaluationService';

interface Props {
  selectedYear: number;
  selectedSemester: PPPKSemester;
  currentUserId: string;
  currentUserName: string;
  onRefresh?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PPPKBulkAttendanceManager: React.FC<Props> = ({
  selectedYear,
  selectedSemester,
  currentUserId,
  currentUserName,
  onRefresh,
  showToast
}) => {
  const [records, setRecords] = useState<PPPKBulkAttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTim, setFilterTim] = useState('ALL');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [selectedYear, selectedSemester]);

  const loadRecords = () => {
    const data = getBulkAttendanceRecords(selectedYear, selectedSemester);
    setRecords(data);
    setIsDirty(false);
  };

  const handleFieldChange = (
    id: string,
    field: 'totalHariKerja' | 'hadir' | 'izin' | 'sakit' | 'cuti' | 'alfa',
    val: number
  ) => {
    setRecords(prev =>
      prev.map(rec => {
        if (rec.id !== id) return rec;

        const updated = { ...rec, [field]: Math.max(0, val) };

        // Auto calculate hadir if total changes or others change
        if (field === 'alfa') {
          const calc = calculateAttendanceCriteria(updated.alfa);
          updated.skorAnalisis = calc.skorAnalisis;
          updated.kriteriaText = calc.kriteriaText;
          updated.nilaiKehadiranBobot = calc.nilaiKehadiranBobot;
          updated.attendanceScore100 = calc.attendanceScore100;
        }

        return updated;
      })
    );
    setIsDirty(true);
  };

  const handleSetAllZeroAlfa = () => {
    if (!window.confirm('Terapkan preset Alfa = 0 (Kehadiran Penuh / Sangat Baik) ke seluruh pegawai PPPK pada periode ini?')) return;

    setRecords(prev =>
      prev.map(rec => {
        const calc = calculateAttendanceCriteria(0);
        return {
          ...rec,
          alfa: 0,
          hadir: rec.totalHariKerja,
          izin: 0,
          sakit: 0,
          cuti: 0,
          skorAnalisis: calc.skorAnalisis,
          kriteriaText: calc.kriteriaText,
          nilaiKehadiranBobot: calc.nilaiKehadiranBobot,
          attendanceScore100: calc.attendanceScore100
        };
      })
    );
    setIsDirty(true);
    showToast('Preset Alfa = 0 diterapkan. Jangan lupa klik "Simpan Massal Data Absensi".', 'info');
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    try {
      const success = saveBulkAttendanceRecords(records, currentUserId, currentUserName);
      if (success) {
        setIsDirty(false);
        showToast(`Berhasil menyimpan penilaian absensi untuk ${records.length} pegawai PPPK dan menyinkronkan ke dokumen evaluasi resmi.`, 'success');
        if (onRefresh) onRefresh();
      } else {
        showToast('Gagal menyimpan data absensi.', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'Terjadi kesalahan saat menyimpan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'No',
      'NIP',
      'Nama Pegawai',
      'Unit Kerja',
      'Tim Kerja',
      'Total Hari Kerja',
      'Hadir',
      'Izin',
      'Sakit',
      'Cuti',
      'Alfa',
      'Skor Analisis (1-5)',
      'Kriteria Kehadiran',
      'Nilai Bobot 40%',
      'Nilai Konversi 100'
    ];

    const rows = records.map((r, idx) => [
      idx + 1,
      `'${r.employeeId}`,
      `"${r.nama}"`,
      `"${r.unitKerja}"`,
      `"${r.timKerja || '-'}"`,
      r.totalHariKerja,
      r.hadir,
      r.izin,
      r.sakit,
      r.cuti,
      r.alfa,
      r.skorAnalisis,
      `"${r.kriteriaText}"`,
      r.nilaiKehadiranBobot.toFixed(2),
      r.attendanceScore100
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Bulk_Absensi_PPPK_${selectedYear}_Sem_${selectedSemester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const totalPegawai = records.length;
  const countSangatBaik = records.filter(r => r.alfa === 0).length;
  const countBaik = records.filter(r => r.alfa >= 1 && r.alfa <= 2).length;
  const countCukup = records.filter(r => r.alfa >= 3 && r.alfa <= 5).length;
  const countKurang = records.filter(r => r.alfa >= 6 && r.alfa <= 8).length;
  const countSangatKurang = records.filter(r => r.alfa > 8).length;

  const timOptions = Array.from(new Set(records.map(r => r.timKerja || 'Tim Kerja Operasional')));

  const filteredRecords = records.filter(r => {
    const matchSearch =
      r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employeeId.includes(searchTerm) ||
      (r.timKerja && r.timKerja.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchTim = filterTim === 'ALL' || r.timKerja === filterTim;
    return matchSearch && matchTim;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10 pointer-events-none">
          <i className="bi bi-clock-history text-[160px]"></i>
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
            <i className="bi bi-table"></i> Modul Bulk Presensi & Disiplin PPPK
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Penilaian Massal (Bulk) Absensi & Kehadiran PPPK
          </h2>
          <p className="text-sm text-emerald-100/90 leading-relaxed">
            Perhitungan kepatuhan jam kerja dan rekapitulasi kehadiran semesteran. Kriteria resmi Permenpan RB dihitung otomatis berdasarkan 
            frekuensi <strong>Tanpa Keterangan (Alfa)</strong> dan disinkronkan ke nilai bobot perilaku 40% pada Dokumen 1 & Dokumen 2.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <span className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-2">
              <i className="bi bi-calendar-event text-amber-300"></i>
              Tahun {selectedYear} • Semester {selectedSemester}
            </span>
            <span className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-2">
              <i className="bi bi-person-check-fill text-emerald-300"></i>
              Total Pegawai: <strong>{totalPegawai}</strong> Orang
            </span>
          </div>
        </div>
      </div>

      {/* Kriteria Resmi Standar Info Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <i className="bi bi-info-square-fill text-blue-600"></i>
            Matriks Penilaian Standar Kehadiran PPPK
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">Bobot Komponen: 40% dari Nilai Perilaku Kerja</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Sangat Baik</span>
            <p className="text-base font-black text-emerald-700 mt-0.5">Skor 5.00</p>
            <p className="text-[10px] text-emerald-600 font-bold">Alfa = 0 kali (Bobot 2.00)</p>
            <span className="mt-1 inline-block text-[10px] bg-emerald-200/60 text-emerald-900 font-black px-1.5 py-0.2 rounded-full">
              {countSangatBaik} Pegawai
            </span>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Baik</span>
            <p className="text-base font-black text-blue-700 mt-0.5">Skor 4.00</p>
            <p className="text-[10px] text-blue-600 font-bold">Alfa 1 - 2 kali (Bobot 1.60)</p>
            <span className="mt-1 inline-block text-[10px] bg-blue-200/60 text-blue-900 font-black px-1.5 py-0.2 rounded-full">
              {countBaik} Pegawai
            </span>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Cukup</span>
            <p className="text-base font-black text-amber-700 mt-0.5">Skor 3.00</p>
            <p className="text-[10px] text-amber-600 font-bold">Alfa 3 - 5 kali (Bobot 1.20)</p>
            <span className="mt-1 inline-block text-[10px] bg-amber-200/60 text-amber-900 font-black px-1.5 py-0.2 rounded-full">
              {countCukup} Pegawai
            </span>
          </div>

          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200/60 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-800">Kurang</span>
            <p className="text-base font-black text-orange-700 mt-0.5">Skor 2.00</p>
            <p className="text-[10px] text-orange-600 font-bold">Alfa 6 - 8 kali (Bobot 0.80)</p>
            <span className="mt-1 inline-block text-[10px] bg-orange-200/60 text-orange-900 font-black px-1.5 py-0.2 rounded-full">
              {countKurang} Pegawai
            </span>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/60 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">Sangat Kurang</span>
            <p className="text-base font-black text-rose-700 mt-0.5">Skor 1.00</p>
            <p className="text-[10px] text-rose-600 font-bold">Alfa &gt; 8 kali (Bobot 0.40)</p>
            <span className="mt-1 inline-block text-[10px] bg-rose-200/60 text-rose-900 font-black px-1.5 py-0.2 rounded-full">
              {countSangatKurang} Pegawai
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Cari nama pegawai, NIP, atau tim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <select
            value={filterTim}
            onChange={(e) => setFilterTim(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-700"
          >
            <option value="ALL">Semua Tim Kerja</option>
            {timOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSetAllZeroAlfa}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Isi cepat semua kehadiran dengan Alfa = 0"
          >
            <i className="bi bi-magic text-amber-600"></i>
            Preset Hadir Penuh (Alfa: 0)
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <i className="bi bi-file-earmark-spreadsheet-fill text-emerald-600"></i>
            Export CSV
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-black text-white transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              isDirty
                ? 'bg-emerald-600 hover:bg-emerald-700 animate-pulse ring-2 ring-emerald-400/40'
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            <i className="bi bi-floppy-fill"></i>
            {isSaving ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan Massal' : 'Simpan Data Absensi'}
          </button>
        </div>
      </div>

      {/* Spreadsheet / Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                <th className="p-3 text-center w-12">No</th>
                <th className="p-3 min-w-[200px]">Pegawai PPPK</th>
                <th className="p-3 min-w-[150px]">Tim Kerja</th>
                <th className="p-3 text-center w-24">Hari Kerja</th>
                <th className="p-3 text-center w-20 bg-emerald-50/50">Hadir</th>
                <th className="p-3 text-center w-16">Izin</th>
                <th className="p-3 text-center w-16">Sakit</th>
                <th className="p-3 text-center w-16">Cuti</th>
                <th className="p-3 text-center w-24 bg-rose-50 text-rose-800 font-black">
                  ALFA <i className="bi bi-exclamation-circle-fill text-rose-500"></i>
                </th>
                <th className="p-3 text-center min-w-[130px]">Kriteria Kehadiran</th>
                <th className="p-3 text-center min-w-[100px] bg-blue-50/50 text-blue-950">
                  Nilai Bobot (40%)
                </th>
                <th className="p-3 text-center w-20">Skor (100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((rec, idx) => {
                const isAlfaAlert = rec.alfa > 0;
                return (
                  <tr
                    key={rec.id}
                    className={`hover:bg-blue-50/30 transition-colors ${
                      isAlfaAlert ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="p-3 text-center text-slate-400 font-bold text-[11px]">{idx + 1}</td>
                    
                    <td className="p-3">
                      <p className="font-bold text-slate-900 text-xs">{rec.nama}</p>
                      <p className="font-mono text-[10px] text-slate-500">NIP. {rec.employeeId}</p>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium inline-block">
                        {rec.timKerja || 'Tim Kerja Operasional'}
                      </span>
                    </td>

                    {/* Total Hari Kerja */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={rec.totalHariKerja}
                        onChange={(e) => handleFieldChange(rec.id, 'totalHariKerja', Number(e.target.value))}
                        className="w-16 px-1.5 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Hadir */}
                    <td className="p-2 text-center bg-emerald-50/30">
                      <input
                        type="number"
                        min="0"
                        value={rec.hadir}
                        onChange={(e) => handleFieldChange(rec.id, 'hadir', Number(e.target.value))}
                        className="w-16 px-1.5 py-1 text-center font-bold text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-600 text-emerald-800"
                      />
                    </td>

                    {/* Izin */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={rec.izin}
                        onChange={(e) => handleFieldChange(rec.id, 'izin', Number(e.target.value))}
                        className="w-14 px-1 py-1 text-center font-medium text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Sakit */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={rec.sakit}
                        onChange={(e) => handleFieldChange(rec.id, 'sakit', Number(e.target.value))}
                        className="w-14 px-1 py-1 text-center font-medium text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* Cuti */}
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={rec.cuti}
                        onChange={(e) => handleFieldChange(rec.id, 'cuti', Number(e.target.value))}
                        className="w-14 px-1 py-1 text-center font-medium text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </td>

                    {/* ALFA (Highlight) */}
                    <td className="p-2 text-center bg-rose-50/60">
                      <input
                        type="number"
                        min="0"
                        value={rec.alfa}
                        onChange={(e) => handleFieldChange(rec.id, 'alfa', Number(e.target.value))}
                        className={`w-16 px-2 py-1 text-center font-black text-xs rounded-lg focus:outline-none border ${
                          rec.alfa > 0
                            ? 'bg-rose-100 text-rose-800 border-rose-400 ring-2 ring-rose-300/50'
                            : 'bg-white text-slate-800 border-slate-300'
                        }`}
                      />
                    </td>

                    {/* Kriteria Text */}
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        rec.skorAnalisis === 5
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : rec.skorAnalisis === 4
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : rec.skorAnalisis === 3
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : rec.skorAnalisis === 2
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {rec.skorAnalisis}.00 ({rec.kriteriaText.split(' ')[0]})
                      </span>
                    </td>

                    {/* Nilai Bobot 40% */}
                    <td className="p-3 text-center font-black text-xs text-blue-900 bg-blue-50/30">
                      {rec.nilaiKehadiranBobot.toFixed(2)}
                    </td>

                    {/* Skor 100 */}
                    <td className="p-3 text-center font-mono font-bold text-xs text-slate-700">
                      {rec.attendanceScore100}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecords.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <i className="bi bi-inbox text-3xl"></i>
            <p className="mt-2 text-xs font-bold">Tidak ada data pegawai yang cocok dengan filter.</p>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
          <span>Menampilkan <strong>{filteredRecords.length}</strong> dari <strong>{records.length}</strong> pegawai PPPK</span>
          {isDirty && (
            <span className="text-amber-600 font-bold flex items-center gap-1.5 animate-pulse">
              <i className="bi bi-exclamation-triangle-fill"></i>
              Terdapat perubahan data absensi yang belum disimpan.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
