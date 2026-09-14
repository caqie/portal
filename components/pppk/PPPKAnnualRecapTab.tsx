import React, { useState, useMemo } from 'react';
import { getAnnualRecap } from '../../services/pppkEvaluationService';
import { exportPPPKAnnualRecapToExcel } from './PPPKExportUtils';

interface PPPKAnnualRecapTabProps {
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

const PPPKAnnualRecapTab: React.FC<PPPKAnnualRecapTabProps> = ({
  selectedYear,
  onSelectYear
}) => {
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const recapData = useMemo(() => {
    return getAnnualRecap(selectedYear, selectedUnit, searchQuery);
  }, [selectedYear, selectedUnit, searchQuery]);

  // Unit kerja list
  const unitList = useMemo(() => {
    const all = getAnnualRecap(selectedYear);
    const set = new Set<string>();
    all.forEach(a => { if (a.unitKerja) set.add(a.unitKerja); });
    return Array.from(set).sort();
  }, [selectedYear]);

  // Summary counts
  const completeCount = recapData.filter(r => r.isComplete).length;
  const incompleteCount = recapData.length - completeCount;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <i className="bi bi-calendar2-range-fill"></i>
            Rekapitulasi Tahunan (Semester I & Semester II)
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Rekap Evaluasi Kinerja Tahunan PPPK</h2>
          <p className="text-xs text-slate-500 font-medium">
            Nilai tahunan dihitung secara otomatis dari rata-rata Semester I dan Semester II setelah kedua semester berstatus <strong>FINAL</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(Number(e.target.value))}
            className="py-2 px-3 text-xs font-black rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>Tahun {y}</option>
            ))}
          </select>

          {/* Export to Excel */}
          <button
            onClick={() => exportPPPKAnnualRecapToExcel(recapData, selectedYear)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <i className="bi bi-file-earmark-excel-fill"></i>
            Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total PPPK Terdaftar</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{recapData.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pegawai PPPK DJKI</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Rekap Selesai (Lengkap)</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{completeCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Semester I & II keduanya FINAL</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Belum Lengkap</span>
          <p className="text-2xl font-black text-amber-600 mt-2">{incompleteCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Salah satu atau kedua semester belum final</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIP, atau unit kerja..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full sm:w-64 py-2 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Unit Kerja</option>
            {unitList.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recap Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Pegawai PPPK</th>
                <th className="py-3.5 px-3 text-center">Semester I</th>
                <th className="py-3.5 px-3 text-center">Semester II</th>
                <th className="py-3.5 px-3 text-center">Rata-Rata Tahunan</th>
                <th className="py-3.5 px-3 text-center">Predikat Tahunan</th>
                <th className="py-3.5 px-4 text-center">Status Kelengkapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recapData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada data pegawai PPPK.
                  </td>
                </tr>
              ) : (
                recapData.map((row, idx) => (
                  <tr key={`${row.nip || row.employeeId || 'recap'}-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{row.nama}</span>
                      <span className="text-[11px] text-slate-400 font-mono">NIP. {row.nip} • {row.unitKerja}</span>
                    </td>

                    {/* Semester I */}
                    <td className="py-3.5 px-3 text-center">
                      {row.semester1Score !== null ? (
                        <div>
                          <span className="font-black text-slate-900">{row.semester1Score.toFixed(2)}</span>
                          <span className={`block text-[10px] font-bold ${row.semester1Status === 'FINAL' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {row.semester1Status === 'FINAL' ? '✓ FINAL' : row.semester1Status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum Ada</span>
                      )}
                    </td>

                    {/* Semester II */}
                    <td className="py-3.5 px-3 text-center">
                      {row.semester2Score !== null ? (
                        <div>
                          <span className="font-black text-slate-900">{row.semester2Score.toFixed(2)}</span>
                          <span className={`block text-[10px] font-bold ${row.semester2Status === 'FINAL' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {row.semester2Status === 'FINAL' ? '✓ FINAL' : row.semester2Status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Belum Ada</span>
                      )}
                    </td>

                    {/* Rata-Rata Tahunan */}
                    <td className="py-3.5 px-3 text-center">
                      {row.annualAverage !== null ? (
                        <span className="text-sm font-black text-blue-600 font-mono">
                          {row.annualAverage.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Predikat Tahunan */}
                    <td className="py-3.5 px-3 text-center">
                      {row.annualCategory ? (
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          row.annualCategory === 'Sangat Baik' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          row.annualCategory === 'Baik' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          row.annualCategory === 'Cukup' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {row.annualCategory}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Status Kelengkapan */}
                    <td className="py-3.5 px-4 text-center">
                      {row.isComplete ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i className="bi bi-check-circle-fill text-emerald-600"></i>
                          Lengkap (Final)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <i className="bi bi-clock-history"></i>
                          {row.statusText}
                        </span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default PPPKAnnualRecapTab;
