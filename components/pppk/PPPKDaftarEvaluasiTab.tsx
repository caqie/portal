import React, { useState, useMemo } from 'react';
import { PPPKEvaluation, EvaluationPeriod } from '../../types';
import { exportPPPKEvaluationsToExcel, exportPPPKEvaluationToPDF } from './PPPKExportUtils';

interface PPPKDaftarEvaluasiTabProps {
  evaluations: PPPKEvaluation[];
  periods: EvaluationPeriod[];
  selectedYear: number;
  selectedSemester: 'I' | 'II';
  onSelectPeriod: (year: number, semester: 'I' | 'II') => void;
  onOpenCreateModal: () => void;
  onOpenDetailModal: (ev: PPPKEvaluation) => void;
  onRecalculate: (id: string) => void;
  onFinalize: (id: string) => void;
  onDelete: (id: string) => void;
  onRecalculateAllDrafts: () => void;
}

const PPPKDaftarEvaluasiTab: React.FC<PPPKDaftarEvaluasiTabProps> = ({
  evaluations,
  periods,
  selectedYear,
  selectedSemester,
  onSelectPeriod,
  onOpenCreateModal,
  onOpenDetailModal,
  onRecalculate,
  onFinalize,
  onDelete,
  onRecalculateAllDrafts
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Distinct unit kerja list
  const unitKerjaList = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach(e => {
      if (e.unitKerja) set.add(e.unitKerja.trim());
    });
    return Array.from(set).sort();
  }, [evaluations]);

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      if (Number(e.year) !== selectedYear) return false;
      if (e.semester !== selectedSemester) return false;
      if (selectedUnit !== 'ALL' && e.unitKerja !== selectedUnit) return false;
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'FINAL' && !e.isFinal) return false;
        if (selectedStatus === 'NON_FINAL' && e.isFinal) return false;
        if (selectedStatus !== 'FINAL' && selectedStatus !== 'NON_FINAL' && e.status !== selectedStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = (e.nama || '').toLowerCase().includes(q);
        const matchNip = (e.employeeId || '').toLowerCase().includes(q);
        const matchJab = (e.jabatan || '').toLowerCase().includes(q);
        const matchUnit = (e.unitKerja || '').toLowerCase().includes(q);
        if (!matchNama && !matchNip && !matchJab && !matchUnit) return false;
      }
      return true;
    });
  }, [evaluations, selectedYear, selectedSemester, selectedUnit, selectedStatus, searchQuery]);

  return (
    <div className="space-y-5">
      
      {/* Filters & Actions Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Daftar Evaluasi Kinerja PPPK</h2>
            <p className="text-xs text-slate-500 font-medium">
              Data evaluasi semester aktif: <strong className="text-slate-800">{selectedYear} Semester {selectedSemester}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRecalculateAllDrafts}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              title="Sinkronkan & hitung ulang semua evaluasi yang belum difinalisasi"
            >
              <i className="bi bi-arrow-repeat text-blue-600"></i>
              Hitung Ulang Semua (Draft)
            </button>
            <button
              onClick={() => exportPPPKEvaluationsToExcel(filteredEvaluations)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <i className="bi bi-file-earmark-excel-fill text-emerald-600"></i>
              Export Excel
            </button>
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <i className="bi bi-plus-lg"></i>
              Tambah Evaluasi
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          
          {/* Search */}
          <div className="md:col-span-2 relative">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIP, jabatan, atau unit kerja..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>

          {/* Period Selector (Year & Semester) */}
          <div className="flex gap-1.5">
            <select
              value={selectedYear}
              onChange={(e) => onSelectPeriod(Number(e.target.value), selectedSemester)}
              className="w-1/2 py-2 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={selectedSemester}
              onChange={(e) => onSelectPeriod(selectedYear, e.target.value as 'I' | 'II')}
              className="w-1/2 py-2 px-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="I">Sem. I</option>
              <option value="II">Sem. II</option>
            </select>
          </div>

          {/* Unit Kerja */}
          <div>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full py-2 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Unit Kerja</option>
              {unitKerjaList.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="FINAL">Final (Terkunci)</option>
              <option value="NON_FINAL">Belum Final (Proses)</option>
              <option value="WAITING_REVIEW">Menunggu Review</option>
              <option value="DRAFT">Draft</option>
              <option value="CORRECTION_REQUESTED">Koreksi Diajukan</option>
            </select>
          </div>

        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Pegawai PPPK</th>
                <th className="py-3.5 px-3 text-center">SKP (60%)</th>
                <th className="py-3.5 px-3 text-center">360° (25%)</th>
                <th className="py-3.5 px-3 text-center">Presensi (15%)</th>
                <th className="py-3.5 px-3 text-center">Nilai Akhir</th>
                <th className="py-3.5 px-3 text-center">Predikat</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <i className="bi bi-inbox text-3xl block mb-2 text-slate-300"></i>
                    <p className="font-semibold text-slate-600">Tidak ada data evaluasi yang sesuai filter.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Silakan sesuaikan filter pencarian atau buat evaluasi baru.</p>
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev, idx) => (
                  <tr key={ev.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Pegawai Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black text-sm shrink-0 border border-slate-200">
                          {ev.nama ? ev.nama.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{ev.nama}</span>
                            {ev.isFinal && (
                              <i className="bi bi-lock-fill text-emerald-600 text-xs" title="Final & Terkunci"></i>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">NIP. {ev.employeeId}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">{ev.jabatan} • {ev.unitKerja}</p>
                        </div>
                      </div>
                    </td>

                    {/* SKP */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-black text-slate-900">{ev.skpScore.toFixed(1)}</div>
                      <span className="text-[10px] text-blue-600 font-mono font-bold">+{ev.skpContribution.toFixed(1)}</span>
                    </td>

                    {/* 360 */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-black text-slate-900">{ev.behaviorScore.toFixed(1)}</div>
                      <span className="text-[10px] text-indigo-600 font-mono font-bold">+{ev.behaviorContribution.toFixed(1)}</span>
                    </td>

                    {/* Presensi */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="font-black text-slate-900">{ev.attendanceScore.toFixed(1)}</div>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">+{ev.attendanceContribution.toFixed(1)}</span>
                    </td>

                    {/* Nilai Akhir */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="text-sm font-black text-slate-900 tracking-tight">
                        {ev.finalScore.toFixed(2)}
                      </span>
                    </td>

                    {/* Predikat */}
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        ev.category === 'Sangat Baik' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        ev.category === 'Baik' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        ev.category === 'Cukup' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {ev.category}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      {ev.isFinal ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i className="bi bi-lock-fill"></i>
                          FINAL
                        </span>
                      ) : ev.status === 'CORRECTION_REQUESTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <i className="bi bi-exclamation-triangle"></i>
                          Koreksi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          {ev.status}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Detail */}
                        <button
                          onClick={() => onOpenDetailModal(ev)}
                          title="Lihat Detail & Breakdown Nilai"
                          className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors text-xs"
                        >
                          <i className="bi bi-eye-fill"></i>
                        </button>

                        {/* Recalculate (if not final) */}
                        {!ev.isFinal && (
                          <button
                            onClick={() => onRecalculate(ev.id)}
                            title="Hitung Ulang Nilai"
                            className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors text-xs"
                          >
                            <i className="bi bi-arrow-repeat"></i>
                          </button>
                        )}

                        {/* Finalize (if not final) */}
                        {!ev.isFinal && (
                          <button
                            onClick={() => onFinalize(ev.id)}
                            title="Finalisasi & Kunci Nilai"
                            className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors text-xs"
                          >
                            <i className="bi bi-lock-fill"></i>
                          </button>
                        )}

                        {/* Export PDF */}
                        <button
                          onClick={() => exportPPPKEvaluationToPDF(ev)}
                          title="Cetak Dokumen Laporan PDF"
                          className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors text-xs"
                        >
                          <i className="bi bi-file-earmark-pdf-fill text-rose-500"></i>
                        </button>

                        {/* Delete (if not final) */}
                        {!ev.isFinal && (
                          <button
                            onClick={() => onDelete(ev.id)}
                            title="Hapus Evaluasi"
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors text-xs"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Menampilkan <strong>{filteredEvaluations.length}</strong> data evaluasi untuk {selectedYear} Semester {selectedSemester}
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Final ({filteredEvaluations.filter(e => e.isFinal).length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Proses ({filteredEvaluations.filter(e => !e.isFinal).length})
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PPPKDaftarEvaluasiTab;
