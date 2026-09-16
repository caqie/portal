import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  PPPKEvaluasiAkhirDoc,
  Pegawai,
  EvaluationPeriod
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  calculateEvaluasiAkhir,
  saveEvaluasiAkhirDoc,
  getPenilaianPerilakuDoc,
  getHasilKerjaDoc,
  getPenugasanPenilaiList,
  getMasterPeriods
} from '../../../services/pppkPenilaianModuleService';

interface PPPKHasilPenilaianTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  selectedAssignmentId?: string;
  preselectedAssignmentId?: string;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
  onNavigateToFinalisasi?: (assignmentId?: string) => void;
  onNavigateToReport?: (assignmentId?: string) => void;
}

const REKOMENDASI_OPTIONS = [
  'Perpanjangan Perjanjian Kerja',
  'Pemutusan Hubungan Perjanjian Kerja',
  'Dipertahankan pada Unit Kerja Saat Ini',
  'Rotasi / Mutasi Penempatan Unit Kerja',
  'Pengembangan Kompetensi & Pelatihan',
  'Bimbingan Kinerja & Konseling'
];

export const PPPKHasilPenilaianTab: React.FC<PPPKHasilPenilaianTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  selectedAssignmentId,
  preselectedAssignmentId,
  onRefreshData,
  onRefreshAll,
  showToast,
  onNavigateTab,
  onNavigateToFinalisasi,
  onNavigateToReport
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const safeRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
  };

  const handleNavigateFinal = (assignId?: string) => {
    const targetId = assignId || activeAssignment?.id;
    if (onNavigateToFinalisasi) {
      onNavigateToFinalisasi(targetId);
    } else if (onNavigateTab) {
      onNavigateTab('finalisasi', targetId);
    }
  };

  const effectiveAssignments = useMemo(() => {
    if (assignments && Array.isArray(assignments) && assignments.length > 0) return assignments;
    return getPenugasanPenilaiList() || [];
  }, [assignments]);

  const effectivePeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod;
    const periods = getMasterPeriods();
    if (selectedPeriodId) {
      return periods.find(p => p.id === selectedPeriodId) || periods[0];
    }
    return periods[0];
  }, [selectedPeriod, selectedPeriodId]);

  const periodAssignments = useMemo(() => {
    const list = effectiveAssignments || [];
    if (!effectivePeriod) return list;
    const filtered = list.filter(a => a && a.periodeId === effectivePeriod.id);
    return filtered.length > 0 ? filtered : list;
  }, [effectiveAssignments, effectivePeriod]);

  const targetSelectedId = preselectedAssignmentId || selectedAssignmentId;

  // Find target assignment
  const defaultAssign = useMemo(() => {
    const list = periodAssignments || [];
    if (targetSelectedId) {
      return list.find(a => a && a.id === targetSelectedId) || list[0];
    }
    if (activeRole === 'PPPK_DINILAI' && activePegawai) {
      return list.find(a => a && a.pppkDinilaiId === activePegawai.nip) || list[0];
    }
    return list[0];
  }, [periodAssignments, targetSelectedId, activeRole, activePegawai]);

  const [currentAssignId, setCurrentAssignId] = useState<string>(defaultAssign?.id || '');

  React.useEffect(() => {
    if (defaultAssign?.id && !currentAssignId) {
      setCurrentAssignId(defaultAssign.id);
    }
  }, [defaultAssign?.id]);

  const activeAssignment = useMemo(() => {
    const list = periodAssignments || [];
    return list.find(a => a && a.id === currentAssignId) || defaultAssign;
  }, [periodAssignments, currentAssignId, defaultAssign]);

  // Calculate or load current evaluation doc
  const [evalDoc, setEvalDoc] = useState<PPPKEvaluasiAkhirDoc | undefined>(() => {
    try {
      return activeAssignment ? calculateEvaluasiAkhir(activeAssignment.id) : undefined;
    } catch (e) {
      return undefined;
    }
  });

  // Keep in sync
  React.useEffect(() => {
    if (activeAssignment) {
      try {
        setEvalDoc(calculateEvaluasiAkhir(activeAssignment.id));
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeAssignment?.id]);

  const isLocked = activeAssignment?.status === 'FINAL';

  // Rekomendasi state
  const [rekomendasiList, setRekomendasiList] = useState<string[]>(
    evalDoc?.rekomendasi || ['Perpanjangan Perjanjian Kerja', 'Dipertahankan pada Unit Kerja Saat Ini']
  );
  const [catatanRekomendasi, setCatatanRekomendasi] = useState<string>(
    evalDoc?.catatanRekomendasi || 'Kinerja sangat memuaskan, berdedikasi tinggi, dan loyalitas terhadap target organisasi teruji.'
  );

  // Sync rekomendasi if evalDoc changes
  React.useEffect(() => {
    if (evalDoc) {
      setRekomendasiList(evalDoc.rekomendasi || []);
      setCatatanRekomendasi(evalDoc.catatanRekomendasi || '');
    }
  }, [evalDoc]);

  // Toggle rekomendasi
  const handleToggleRekomendasi = (opt: string) => {
    if (isLocked) return;
    setRekomendasiList(prev =>
      prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]
    );
  };

  // Save recommendations
  const handleSaveRekomendasi = () => {
    if (!evalDoc || !activeAssignment) return;

    const updatedDoc: PPPKEvaluasiAkhirDoc = {
      ...evalDoc,
      rekomendasi: rekomendasiList,
      catatanRekomendasi
    };

    saveEvaluasiAkhirDoc(updatedDoc, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
    setEvalDoc(updatedDoc);
    safeRefresh();
    safeShowToast('Rekomendasi tindak lanjut evaluasi berhasil disimpan.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white">
              Submenu 6
            </span>
            <span className="text-xs text-slate-500 font-bold">Kalkulasi 360° & Penetapan Predikat Kinerja</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Lembar Hasil Penilaian Kinerja PPPK
          </h3>
          <p className="text-xs text-slate-600">
            Subjek: <strong className="text-slate-900">{activeAssignment?.pppkNama}</strong> | Periode {effectivePeriod?.semester} {effectivePeriod?.year}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periodAssignments.length > 1 && (
            <select
              value={currentAssignId}
              onChange={(e) => setCurrentAssignId(e.target.value)}
              className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
            >
              {periodAssignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.pppkNama} ({a.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleNavigateFinal(activeAssignment?.id)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs transition-all flex items-center gap-1.5 shadow"
          >
            <i className="bi bi-shield-check"></i>
            Ke Panel Finalisasi &rarr;
          </button>
        </div>
      </div>

      {evalDoc && (
        <>
          {/* Top Big Result Card */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl border border-blue-900/60 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              
              {/* Hasil Kerja */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest block mb-1">
                  1. Rating Hasil Kerja
                </span>
                <div className="text-xl font-black text-white">
                  {evalDoc.ratingHasilKerja}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">Berdasarkan realisasi RHK & bukti dukung</p>
              </div>

              {/* Perilaku Kerja */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <span className="text-[10px] font-mono text-purple-300 uppercase tracking-widest block mb-1">
                  2. Rating Perilaku Kerja
                </span>
                <div className="text-xl font-black text-white">
                  {evalDoc.ratingPerilaku}
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Skor Akhir Perilaku: <strong className="text-amber-300">{evalDoc.nilaiAkhirPerilaku.toFixed(2)}</strong> (Skala 1 - 5)
                </p>
              </div>

              {/* Predikat Akhir Periodik */}
              <div className="bg-blue-600/30 p-4 rounded-2xl border border-blue-400/40 text-center">
                <span className="text-[10px] font-mono text-blue-200 uppercase tracking-widest block mb-1">
                  Predikat Kinerja Periodik
                </span>
                <div className="text-2xl font-black text-amber-300">
                  {evalDoc.predikatKinerja}
                </div>
                <span className="inline-block text-[10px] font-bold text-white bg-blue-500/40 px-2 py-0.5 rounded-full mt-1">
                  Matriks Hasil Kerja x Perilaku Kerja
                </span>
              </div>

            </div>
          </div>

          {/* Mathematical Decomposition Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <i className="bi bi-calculator-fill text-blue-600"></i>
              Rincian Dekomposisi Perhitungan Nilai Perilaku Kerja (Sesuai Formula Resmi)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Step A: Nilai Perilaku Penilai 360 */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tahap A: Nilai Perilaku Penilai (360°)
                  </h5>
                  <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {evalDoc.nilaiPerilakuPenilai.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Pejabat Penilai (Bobot 60%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(evalDoc.nilaiPejabat ?? evalDoc.nilaiPerilakuPejabat ?? 0).toFixed(2)} x 60% = {((evalDoc.nilaiPejabat ?? evalDoc.nilaiPerilakuPejabat ?? 0) * 0.6).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Rekan Kerja PNS (Bobot 20%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(evalDoc.nilaiPns ?? evalDoc.nilaiPerilakuRekanPns ?? 0).toFixed(2)} x 20% = {((evalDoc.nilaiPns ?? evalDoc.nilaiPerilakuRekanPns ?? 0) * 0.2).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Rekan Kerja PPPK (Bobot 20%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(evalDoc.nilaiPppk ?? evalDoc.nilaiPerilakuRekanPppk ?? 0).toFixed(2)} x 20% = {((evalDoc.nilaiPppk ?? evalDoc.nilaiPerilakuRekanPppk ?? 0) * 0.2).toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Formula: (Pejabat x 60%) + (Rekan PNS x 20%) + (Rekan PPPK x 20%)
                </p>
              </div>

              {/* Step B: Nilai Akhir Perilaku (Penilai + Kehadiran) */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tahap B: Nilai Akhir Perilaku
                  </h5>
                  <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {evalDoc.nilaiAkhirPerilaku.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Nilai Perilaku Penilai (Bobot 60%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {evalDoc.nilaiPerilakuPenilai.toFixed(2)} x 60% = {(evalDoc.nilaiPerilakuPenilai * 0.6).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200">
                    <span className="text-slate-600">Nilai Kehadiran Presensi (Bobot 40%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {evalDoc.nilaiKehadiran.toFixed(2)} x 40% = {(evalDoc.nilaiKehadiran * 0.4).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200 font-black">
                    <span className="text-slate-800">Total Nilai Akhir Perilaku:</span>
                    <span className="font-mono text-emerald-700">
                      {evalDoc.nilaiAkhirPerilaku.toFixed(2)}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Formula: (Nilai Perilaku Penilai x 60%) + (Nilai Kehadiran x 40%)
                </p>
              </div>

            </div>
          </div>

          {/* Rekomendasi Tindak Lanjut Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
              <i className="bi bi-card-checklist text-purple-600"></i>
              Rekomendasi Tindak Lanjut Evaluasi Kinerja PPPK
            </h4>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {REKOMENDASI_OPTIONS.map(opt => {
                const checked = rekomendasiList.includes(opt);
                return (
                  <label
                    key={opt}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer text-xs font-bold transition-all ${
                      checked
                        ? 'bg-blue-50/60 border-blue-500 text-blue-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLocked}
                      onChange={() => handleToggleRekomendasi(opt)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>

            {/* Catatan Khusus */}
            <div className="space-y-1 pt-2">
              <label className="text-xs font-bold text-slate-700">Catatan Rekomendasi Khusus dari Pejabat Penilai:</label>
              <textarea
                value={catatanRekomendasi}
                disabled={isLocked}
                onChange={(e) => setCatatanRekomendasi(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {!isLocked && (activeRole === 'PEJABAT_PENILAI' || activeRole === 'ADMIN') && (
              <button
                type="button"
                onClick={handleSaveRekomendasi}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 transition-all shadow-md flex items-center gap-1.5"
              >
                <i className="bi bi-save-fill"></i>
                Simpan Rekomendasi
              </button>
            )}
          </div>
        </>
      )}

    </div>
  );
};
