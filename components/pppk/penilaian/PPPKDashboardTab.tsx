import React, { useState, useMemo } from 'react';
import { PPPKPenugasanPenilai, Pegawai, EvaluationPeriod } from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  calculateEvaluasiAkhir,
  getHasilKerjaDoc,
  getPenilaianPerilakuDoc,
  getAbsensiDetailRows,
  getPenugasanPenilaiList,
  getMasterPeriods
} from '../../../services/pppkPenilaianModuleService';

interface PPPKDashboardTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
}

export const PPPKDashboardTab: React.FC<PPPKDashboardTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  onNavigateTab,
  onRefreshData,
  onRefreshAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('ALL');

  const safeNavigate = (tabKey: string, assignmentId?: string) => {
    if (onNavigateTab) {
      onNavigateTab(tabKey, assignmentId);
    }
  };

  // Safe assignments list
  const allAssignments = useMemo(() => {
    if (assignments && Array.isArray(assignments) && assignments.length > 0) {
      return assignments;
    }
    const fetched = getPenugasanPenilaiList();
    return Array.isArray(fetched) ? fetched : [];
  }, [assignments]);

  // Safe active period
  const activePeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod;
    const rawPeriods = getMasterPeriods();
    const periods = Array.isArray(rawPeriods) ? rawPeriods : [];
    if (selectedPeriodId) {
      return periods.find(p => p?.id === selectedPeriodId) || periods[0];
    }
    return periods[0];
  }, [selectedPeriod, selectedPeriodId]);

  // Filter assignments for selected period
  const periodAssignments = useMemo(() => {
    const list = Array.isArray(allAssignments) ? allAssignments : [];
    if (!activePeriod) return list;
    const filtered = (list ?? []).filter(a => a && a.periodeId === activePeriod?.id);
    return filtered.length > 0 ? filtered : list;
  }, [allAssignments, activePeriod]);

  // Distinct units for filter
  const unitList = useMemo(() => {
    const set = new Set<string>();
    // Defensive check and null-coalescing before calling forEach
    const safeList = Array.isArray(periodAssignments) ? periodAssignments : [];
    (safeList ?? []).forEach(a => {
      if (a?.pppkUnitKerja) set.add(a.pppkUnitKerja);
    });
    return Array.from(set);
  }, [periodAssignments]);

  // Filtered by search & unit
  const filteredAssignments = useMemo(() => {
    const safeList = Array.isArray(periodAssignments) ? periodAssignments : [];
    return (safeList ?? []).filter(a => {
      if (!a) return false;
      const matchUnit = selectedUnit === 'ALL' || a.pppkUnitKerja === selectedUnit;
      const matchSearch =
        !searchQuery ||
        (a.pppkNama && a.pppkNama.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.pppkNip && a.pppkNip.includes(searchQuery)) ||
        (a.pejabatPenilaiNama && a.pejabatPenilaiNama.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchUnit && matchSearch;
    });
  }, [periodAssignments, selectedUnit, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const list = Array.isArray(periodAssignments) ? periodAssignments : [];
    const total = list.length;
    const menunggu = (list ?? []).filter(a => a && a.status === 'MENUNGGU_VERIFIKASI').length;
    const dalamPenilaian = (list ?? []).filter(a => a && a.status === 'DALAM_PENILAIAN').length;
    const finalCount = (list ?? []).filter(a => a && a.status === 'FINAL').length;
    const disetujui = (list ?? []).filter(a => a && a.status === 'DISETUJUI').length;

    const progress = total > 0 ? Math.round((finalCount / total) * 100) : 0;
    return { total, menunggu, dalamPenilaian, finalCount, disetujui, progress };
  }, [periodAssignments]);

  // Filter for PEJABAT PENILAI: "PPPK YANG SAYA NILAI"
  const myAssignedPppk = useMemo(() => {
    const list = Array.isArray(periodAssignments) ? periodAssignments : [];
    if (!activePegawai) return list;
    const matched = (list ?? []).filter(a => a && a.pejabatPenilaiId === activePegawai.nip);
    return matched.length > 0 ? matched : list; // graceful fallback so user can test simulator
  }, [periodAssignments, activePegawai]);

  // Filter for PNS PENILAI: PPPK assigned to this PNS
  const myPnsTasks = useMemo(() => {
    const list = Array.isArray(periodAssignments) ? periodAssignments : [];
    if (!activePegawai) return list;
    const matched = (list ?? []).filter(a => a && a.rekanPnsId === activePegawai.nip);
    return matched.length > 0 ? matched : list;
  }, [periodAssignments, activePegawai]);

  // Filter for PPPK PENILAI: PPPK assigned to this PPPK peer
  const myPppkPeerTasks = useMemo(() => {
    const list = Array.isArray(periodAssignments) ? periodAssignments : [];
    if (!activePegawai) return list;
    const matched = (list ?? []).filter(a => a && a.rekanPppkId === activePegawai.nip);
    return matched.length > 0 ? matched : list;
  }, [periodAssignments, activePegawai]);

  // My assignment if I am PPPK Dinilai
  const mySelfAssignment = useMemo(() => {
    const list = Array.isArray(periodAssignments) ? periodAssignments : [];
    if (!activePegawai) return list[0];
    return (list ?? []).find(a => a && a.pppkDinilaiId === activePegawai.nip) || list[0];
  }, [periodAssignments, activePegawai]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. ADMIN DASHBOARD VIEW */}
      {activeRole === 'ADMIN' && (
        <div className="space-y-6">
          {/* Headline Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total PPPK Terdata</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
                <span className="text-[11px] text-slate-400 font-medium">Periode {selectedPeriod?.semester || 'I'} {selectedPeriod?.year || 2026}</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                <i className="bi bi-people-fill"></i>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between bg-amber-50/20">
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Menunggu Verifikasi</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.menunggu}</h3>
                <span className="text-[11px] text-amber-600/80 font-medium">Usulan Pejabat Penilai</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-bold">
                <i className="bi bi-hourglass-split"></i>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-sm flex items-center justify-between bg-indigo-50/20">
              <div>
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Dalam Penilaian</p>
                <h3 className="text-2xl font-black text-indigo-600 mt-1">{stats.dalamPenilaian}</h3>
                <span className="text-[11px] text-indigo-600/80 font-medium">Hasil Kerja & Perilaku</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-bold">
                <i className="bi bi-pencil-square"></i>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between bg-emerald-50/20">
              <div>
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Final & Terkunci</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.finalCount}</h3>
                <span className="text-[11px] text-emerald-600/80 font-medium">Dokumen Lengkap</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
                <i className="bi bi-check-circle-fill"></i>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Tingkat Penyelesaian</span>
                <span className="text-sm font-black text-blue-600">{stats.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats.progress}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">{stats.finalCount} dari {stats.total} selesai</span>
            </div>

          </div>

          {/* Quick Actions Bar */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                <i className="bi bi-speedometer2 text-blue-300"></i>
              </div>
              <div>
                <h3 className="text-base font-black">Panel Monitoring Evaluasi PPPK DJKI</h3>
                <p className="text-xs text-blue-200">Kelola penetapan penilai, validasi absensi mesin presensi, dan cetak dokumen evaluasi terintegrasi.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => safeNavigate('penetapan-penilai')}
                className="px-4 py-2 rounded-xl bg-white text-blue-900 font-black text-xs hover:bg-blue-50 transition-all flex items-center gap-1.5 shadow"
              >
                <i className="bi bi-check2-square"></i>
                Verifikasi Usulan ({stats.menunggu})
              </button>
              <button
                onClick={() => safeNavigate('penilaian-kehadiran')}
                className="px-4 py-2 rounded-xl bg-blue-800/80 text-white font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-1.5 border border-blue-700"
              >
                <i className="bi bi-file-earmark-pdf"></i>
                Upload Presensi PDF
              </button>
              <button
                onClick={() => safeNavigate('laporan')}
                className="px-4 py-2 rounded-xl bg-blue-800/80 text-white font-bold text-xs hover:bg-blue-700 transition-all flex items-center gap-1.5 border border-blue-700"
              >
                <i className="bi bi-printer"></i>
                Cetak Laporan
              </button>
            </div>
          </div>

          {/* Assignments Monitoring Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">Daftar Progres Penilaian Kinerja PPPK</h4>
                <p className="text-xs text-slate-500">Seluruh status penugasan penilai dan kelengkapan evaluasi semester ini</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Cari PPPK / Pejabat Penilai..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                />

                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Unit Kerja</option>
                  {unitList.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Pegawai yang Dinilai</th>
                    <th className="py-3 px-4">Pejabat Penilai (60%)</th>
                    <th className="py-3 px-4">Rekan PNS (20%)</th>
                    <th className="py-3 px-4">Rekan PPPK (20%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Predikat</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        Tidak ada data penugasan penilaian yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((a, idx) => {
                      let evalDoc: any = { predikatKinerja: 'Baik' };
                      try {
                        evalDoc = calculateEvaluasiAkhir(a.id);
                      } catch {
                        evalDoc = { predikatKinerja: 'Sesuai Ekspektasi' };
                      }
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{a.pppkNama}</div>
                            <div className="text-[11px] text-slate-500 font-mono">NIP: {a.pppkNip}</div>
                            <div className="text-[11px] text-slate-500">{a.pppkJabatan}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-blue-900">{a.pejabatPenilaiNama}</div>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
                              {a.jenisPejabatPenilai === 'KETUA_TIM_KERJA' ? 'Ketua Tim Kerja' : 'Pejabat Manajerial'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {a.rekanPnsNama ? (
                              <div className="font-semibold text-slate-800">{a.rekanPnsNama}</div>
                            ) : (
                              <span className="text-slate-400 italic">Belum ditetapkan</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {a.rekanPppkNama ? (
                              <div className="font-semibold text-slate-800">{a.rekanPppkNama}</div>
                            ) : (
                              <span className="text-slate-400 italic">Belum ditetapkan</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide ${
                              a.status === 'FINAL'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : a.status === 'DALAM_PENILAIAN'
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                : a.status === 'MENUNGGU_VERIFIKASI'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {a.status === 'FINAL' ? 'FINAL' : a.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-black">
                            <span className={`px-2 py-0.5 rounded-lg text-xs ${
                              evalDoc.predikatKinerja === 'Sangat Baik'
                                ? 'bg-blue-100 text-blue-800'
                                : evalDoc.predikatKinerja === 'Baik'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {evalDoc.predikatKinerja}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => safeNavigate('hasil-penilaian', a.id)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all text-xs flex items-center gap-1 mx-auto shadow-sm"
                            >
                              <i className="bi bi-eye-fill"></i>
                              Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PEJABAT PENILAI VIEW: "PPPK YANG SAYA NILAI" */}
      {activeRole === 'PEJABAT_PENILAI' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm bg-gradient-to-r from-blue-50/50 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
                  Pejabat Penilai Kinerja
                </span>
                <span className="text-xs text-slate-500 font-bold">Bobot Nilai: 60%</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Daftar PPPK yang Saya Nilai
              </h3>
              <p className="text-xs text-slate-600">
                Pejabat Penilai: <strong className="text-blue-900">{activePegawai?.nama || 'ACHMAD IQBAL TAUFIQ, S.H., M.H.'}</strong> | Anda dapat menilai multi-PPPK sekaligus.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                Total Subjek: <strong className="text-blue-600">{myAssignedPppk.length} PPPK</strong>
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800">Tabel Penilaian Kinerja PPPK Terbimbing</h4>
              <span className="text-xs text-slate-500">Lakukan penetapan rekan kerja, penilaian hasil kerja, dan penilaian perilaku</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama PPPK</th>
                    <th className="py-3 px-4">Jabatan & Unit</th>
                    <th className="py-3 px-4">Rekan PNS (20%)</th>
                    <th className="py-3 px-4">Rekan PPPK (20%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi Penilaian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {myAssignedPppk.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                        Belum ada PPPK yang ditugaskan ke NIP Anda pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    myAssignedPppk.map((a, idx) => (
                      <tr key={a.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{a.pppkNama}</div>
                          <div className="text-[11px] text-slate-500 font-mono">NIP: {a.pppkNip}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{a.pppkJabatan}</div>
                          <div className="text-[11px] text-slate-500">{a.pppkUnitKerja}</div>
                        </td>
                        <td className="py-3 px-4">
                          {a.rekanPnsNama ? (
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <i className="bi bi-check-circle-fill text-emerald-500"></i>
                              {a.rekanPnsNama}
                            </span>
                          ) : (
                            <button
                              onClick={() => safeNavigate('penetapan-penilai', a.id)}
                              className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                            >
                              + Tetapkan Rekan PNS
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {a.rekanPppkNama ? (
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <i className="bi bi-check-circle-fill text-emerald-500"></i>
                              {a.rekanPppkNama}
                            </span>
                          ) : (
                            <button
                              onClick={() => safeNavigate('penetapan-penilai', a.id)}
                              className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 hover:bg-amber-100"
                            >
                              + Tetapkan Rekan PPPK
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            a.status === 'FINAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {a.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => safeNavigate('penilaian-hasil-kerja', a.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200"
                              title="Nilai Hasil Kerja (RHK)"
                            >
                              <i className="bi bi-file-earmark-check mr-1"></i> RHK
                            </button>
                            <button
                              onClick={() => safeNavigate('penilaian-perilaku', a.id)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-[11px] border border-purple-200"
                              title="Nilai 28 Butir Perilaku"
                            >
                              <i className="bi bi-chat-square-quote mr-1"></i> Perilaku
                            </button>
                            <button
                              onClick={() => safeNavigate('hasil-penilaian', a.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-900 font-bold text-[11px]"
                              title="Lihat Evaluasi Lengkap"
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PPPK DINILAI VIEW: "STATUS EVALUASI KINERJA SAYA" */}
      {activeRole === 'PPPK_DINILAI' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white rounded-2xl p-6 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Portal Mandiri PPPK
                </span>
                <h3 className="text-xl font-black mt-2">{activePegawai?.nama || 'CHRISTIA SARI, S.H.'}</h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  NIP: {activePegawai?.nip || '199605152024212001'} | {activePegawai?.jabatan || 'Analis Hukum Ahli Pertama (PPPK)'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => safeNavigate('penilaian-hasil-kerja')}
                  className="px-4 py-2 rounded-xl bg-white text-amber-900 font-black text-xs hover:bg-amber-50 transition-all flex items-center gap-1.5 shadow"
                >
                  <i className="bi bi-pencil-square"></i>
                  Isi / Edit RHK & Bukti Dukung
                </button>
              </div>
            </div>
          </div>

          {/* Checklist Progress Tahapan Penilaian */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Step 1 */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase">1. Pejabat Penilai</span>
                <span className="text-emerald-500 text-lg"><i className="bi bi-check-circle-fill"></i></span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {mySelfAssignment?.pejabatPenilaiNama || 'Achmad Iqbal Taufiq'}
              </p>
              <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                Disetujui Admin
              </span>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase">2. RHK & Bukti Dukung</span>
                <span className="text-blue-500 text-lg"><i className="bi bi-check-circle-fill"></i></span>
              </div>
              <p className="text-xs font-bold text-slate-800">5 Target Realisasi Terinput</p>
              <button
                onClick={() => safeNavigate('penilaian-hasil-kerja')}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                Lihat Detail RHK &rarr;
              </button>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase">3. Tim Rekan Kerja</span>
                <span className="text-emerald-500 text-lg"><i className="bi bi-check-circle-fill"></i></span>
              </div>
              <p className="text-xs font-bold text-slate-800">1 Rekan PNS + 1 Rekan PPPK</p>
              <span className="inline-block text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                Ditetapkan oleh Atasan
              </span>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase">4. Hasil & Finalisasi</span>
                <span className="text-amber-500 text-lg"><i className="bi bi-clock-fill"></i></span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {mySelfAssignment?.status === 'FINAL' ? 'Selesai & Difinalisasi' : 'Dalam Proses Penilaian'}
              </p>
              <button
                onClick={() => safeNavigate('hasil-penilaian', mySelfAssignment?.id)}
                className="text-[11px] font-bold text-amber-700 hover:underline flex items-center gap-1"
              >
                Cek Lembar Hasil &rarr;
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. PNS PENILAI & 5. PPPK PENILAI VIEW */}
      {(activeRole === 'PNS_PENILAI' || activeRole === 'PPPK_PENILAI') && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-teal-200 shadow-sm bg-gradient-to-r from-teal-50/50 to-white">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${
                activeRole === 'PNS_PENILAI' ? 'bg-teal-600' : 'bg-purple-600'
              }`}>
                {activeRole === 'PNS_PENILAI' ? 'Rekan Kerja PNS (Bobot 20%)' : 'Rekan Kerja PPPK (Bobot 20%)'}
              </span>
              <span className="text-xs text-slate-500 font-bold">Penilaian Objektif & Rahasia</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1">
              Tugas Penilaian Perilaku Rekan Kerja
            </h3>
            <p className="text-xs text-slate-600">
              Anda ditugaskan oleh Pejabat Penilai untuk memberikan penilaian terhadap 28 butir perilaku kerja berbasis Core Values BerAKHLAK.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeRole === 'PNS_PENILAI' ? myPnsTasks : myPppkPeerTasks).map(t => {
              let doc: any = null;
              try {
                const roleKey = activeRole === 'PNS_PENILAI' ? 'PNS_PENILAI' : 'PPPK_PENILAI';
                doc = getPenilaianPerilakuDoc(t.id, roleKey);
              } catch {
                doc = null;
              }
              const isSubmitted = doc?.status === 'SUBMITTED';

              return (
                <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-blue-300 transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pegawai Subjek</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        isSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isSubmitted ? 'SELESAI DINILAI' : 'BELUM DIISI'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mt-1">{t.pppkNama}</h4>
                    <p className="text-xs text-slate-500 font-mono">NIP: {t.pppkNip}</p>
                    <p className="text-xs text-slate-600 mt-1">{t.pppkJabatan}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">28 Soal BerAKHLAK</span>
                    <strong className="text-slate-800 font-mono">
                      {isSubmitted ? `Skor: ${doc?.rataRataScore?.toFixed(2) || '0.00'} / 5.00` : 'Belum diisi'}
                    </strong>
                  </div>

                  <button
                    onClick={() => safeNavigate('penilaian-perilaku', t.id)}
                    className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                      isSubmitted
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : activeRole === 'PNS_PENILAI'
                        ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-900/20'
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-900/20'
                    }`}
                  >
                    <i className="bi bi-pencil-fill"></i>
                    {isSubmitted ? 'Ubah / Review Jawaban' : 'Mulai Pengisian Penilaian'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
