import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  Pegawai,
  EvaluationPeriod,
  PPPKEvaluasiAkhirDoc
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  calculateEvaluasiAkhir,
  getMasterPeriods,
  getPenugasanPenilaiList
} from '../../../services/pppkPenilaianModuleService';

interface PPPKRiwayatPenilaianTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  periods?: EvaluationPeriod[];
  assignments?: PPPKPenugasanPenilai[];
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
  onSelectPeriod?: (periodId: string) => void;
  onNavigateDetail?: (assignmentId?: string) => void;
  onNavigateReport?: (assignmentId?: string) => void;
}

export const PPPKRiwayatPenilaianTab: React.FC<PPPKRiwayatPenilaianTabProps> = ({
  activeRole,
  activePegawai,
  periods,
  assignments,
  onNavigateTab,
  onSelectPeriod,
  onNavigateDetail,
  onNavigateReport
}) => {
  const [filterYear, setFilterYear] = useState<string>('ALL');
  const [filterSemester, setFilterSemester] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [previewDoc, setPreviewDoc] = useState<{ assign: PPPKPenugasanPenilai; doc: PPPKEvaluasiAkhirDoc } | null>(null);

  const effectivePeriods = useMemo(() => {
    if (periods && Array.isArray(periods) && periods.length > 0) return periods;
    return getMasterPeriods() || [];
  }, [periods]);

  const effectiveAssignments = useMemo(() => {
    if (assignments && Array.isArray(assignments) && assignments.length > 0) return assignments;
    return getPenugasanPenilaiList() || [];
  }, [assignments]);

  // Available years from periods
  const years = useMemo(() => {
    const set = new Set<number>();
    (effectivePeriods || []).forEach(p => {
      if (p && p.year) set.add(p.year);
    });
    return Array.from(set);
  }, [effectivePeriods]);

  // Filtered assignments
  const filtered = useMemo(() => {
    return (effectiveAssignments || []).filter(a => {
      if (!a) return false;
      const matchYear = filterYear === 'ALL' || (a.tahun ? a.tahun.toString() === filterYear : false);
      const matchSem = filterSemester === 'ALL' || a.semester === filterSemester;
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const matchSearch =
        !searchQuery ||
        (a.pppkNama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.pppkNip || '').includes(searchQuery) ||
        (a.pejabatPenilaiNama || '').toLowerCase().includes(searchQuery.toLowerCase());

      // If PPPK Dinilai, only show their own history
      if (activeRole === 'PPPK_DINILAI' && activePegawai) {
        if (a.pppkDinilaiId !== activePegawai.nip) return false;
      }

      return matchYear && matchSem && matchStatus && matchSearch;
    });
  }, [effectiveAssignments, filterYear, filterSemester, filterStatus, searchQuery, activeRole, activePegawai]);

  const handleOpenReport = (assignmentId?: string) => {
    if (onNavigateReport) {
      onNavigateReport(assignmentId);
    } else if (onNavigateTab) {
      onNavigateTab('laporan', assignmentId);
    }
  };

  const handleOpenDetail = (assignmentId?: string) => {
    if (onNavigateDetail) {
      onNavigateDetail(assignmentId);
    } else if (onNavigateTab) {
      onNavigateTab('hasil-penilaian', assignmentId);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white">
              Submenu 8
            </span>
            <span className="text-xs text-slate-500 font-bold">Arsip Evaluasi Kinerja Multi-Periode</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Riwayat & Arsip Penilaian Kinerja PPPK
          </h3>
          <p className="text-xs text-slate-600">
            Telusuri rekam jejak evaluasi semesteran, capaian kinerja lampau, dan konsistensi predikat ASN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-500"
          >
            <option value="ALL">Semua Tahun</option>
            {years.map(y => (
              <option key={y} value={y.toString()}>{y}</option>
            ))}
          </select>

          {/* Semester Filter */}
          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-500"
          >
            <option value="ALL">Semua Semester</option>
            <option value="I">Semester I</option>
            <option value="II">Semester II</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-slate-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="FINAL">FINAL (Terkunci)</option>
            <option value="DALAM_PENILAIAN">DALAM PENILAIAN</option>
            <option value="MENUNGGU_VERIFIKASI">MENUNGGU VERIFIKASI</option>
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Cari Pegawai / Pejabat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-slate-500 w-44"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3">Periode</th>
                <th className="py-3 px-4">Pegawai yang Dinilai</th>
                <th className="py-3 px-4">Pejabat Penilai</th>
                <th className="py-3 px-3 text-center">Rating Kerja</th>
                <th className="py-3 px-3 text-center">Rating Perilaku</th>
                <th className="py-3 px-3 text-center">Predikat</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    Tidak ada riwayat evaluasi yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filtered.map((a, idx) => {
                  let evalDoc: any;
                  try {
                    evalDoc = calculateEvaluasiAkhir(a.id);
                  } catch (e) {
                    evalDoc = {
                      id: `eval-fallback-${a.id}`,
                      penugasanId: a.id,
                      assignmentId: a.id,
                      periodeId: a.periodeId,
                      pppkId: a.pppkDinilaiId,
                      ratingHasilKerja: 'SESUAI EKSPEKTASI',
                      nilaiPejabat: 4.0,
                      nilaiPns: 4.0,
                      nilaiPppk: 4.0,
                      rataRataRekanKerja: 4.0,
                      bobotPejabatNilai: 2.4,
                      bobotRekanKerjaNilai: 1.6,
                      nilaiPerilakuPenilai: 4.0,
                      alfaCount: 0,
                      nilaiKehadiran: 5.0,
                      kategoriKehadiran: 'Sangat Baik',
                      bobotPerilakuMurni: 2.4,
                      bobotKehadiranMurni: 2.0,
                      nilaiAkhirPerilaku: 4.4,
                      ratingPerilakuKerja: 'SESUAI EKSPEKTASI',
                      ratingPerilaku: 'SESUAI EKSPEKTASI',
                      predikatKinerja: 'Baik',
                      rekomendasi: ['Dipertahankan'],
                      catatanRekomendasi: '-',
                      pejabatPenilaiNama: a.pejabatPenilaiNama,
                      pejabatPenilaiNip: a.pejabatPenilaiNip,
                      pejabatPenilaiJabatan: a.pejabatPenilaiJabatan,
                      isFinal: false,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString()
                    };
                  }

                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <span className="font-black text-slate-800">{a.tahun}</span>
                        <div className="text-[10px] text-slate-500">Sem. {a.semester}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{a.pppkNama}</div>
                        <div className="text-[11px] text-slate-500 font-mono">NIP: {a.pppkNip}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{a.pejabatPenilaiNama}</div>
                        <div className="text-[10px] text-slate-500">{a.pejabatPenilaiJabatan}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-bold text-slate-700">
                          {evalDoc.ratingHasilKerja}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="text-[11px] font-bold text-slate-700">
                          {evalDoc.ratingPerilaku}
                        </span>
                        <div className="text-[10px] text-slate-400">({evalDoc.nilaiAkhirPerilaku.toFixed(2)})</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                          evalDoc.predikatKinerja === 'Sangat Baik'
                            ? 'bg-blue-100 text-blue-800'
                            : evalDoc.predikatKinerja === 'Baik'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {evalDoc.predikatKinerja}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          a.status === 'FINAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ assign: a, doc: evalDoc })}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                            title="Pratinjau Ringkas"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenReport(a.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold"
                            title="Cetak Laporan"
                          >
                            <i className="bi bi-printer"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  Ringkasan Arsip Evaluasi Kinerja
                </h4>
                <p className="text-xs text-slate-500">
                  Periode {previewDoc.assign.semester} {previewDoc.assign.tahun} | {previewDoc.assign.pppkNama}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold">Pegawai:</span>
                <div className="font-bold text-slate-900">{previewDoc.assign.pppkNama}</div>
                <div className="text-slate-500 font-mono">NIP: {previewDoc.assign.pppkNip}</div>
                <div className="text-slate-600">{previewDoc.assign.pppkJabatan}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="text-slate-500 font-bold">Pejabat Penilai:</span>
                <div className="font-bold text-slate-900">{previewDoc.assign.pejabatPenilaiNama}</div>
                <div className="text-slate-500">{previewDoc.assign.pejabatPenilaiJabatan}</div>
                <div className="text-indigo-600 font-semibold">{previewDoc.assign.jenisPejabatPenilai}</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900">Predikat Kinerja Akhir:</span>
                <span className="text-sm font-black text-blue-900 px-3 py-0.5 rounded-full bg-blue-100">
                  {previewDoc.doc.predikatKinerja}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <div className="text-slate-400 text-[10px]">Hasil Kerja</div>
                  <div className="font-black text-slate-800 mt-0.5">{previewDoc.doc.ratingHasilKerja}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <div className="text-slate-400 text-[10px]">Perilaku Kerja</div>
                  <div className="font-black text-slate-800 mt-0.5">{previewDoc.doc.ratingPerilaku}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <div className="text-slate-400 text-[10px]">Skor Perilaku</div>
                  <div className="font-black text-slate-800 mt-0.5">{previewDoc.doc.nilaiAkhirPerilaku.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = previewDoc.assign.id;
                  setPreviewDoc(null);
                  handleOpenReport(id);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-1.5"
              >
                <i className="bi bi-printer"></i>
                Buka Cetak Laporan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
