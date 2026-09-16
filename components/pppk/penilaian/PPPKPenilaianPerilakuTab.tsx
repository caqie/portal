import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  PPPKPenilaianPerilakuDoc,
  PPPKMasterPertanyaanPerilaku,
  Pegawai,
  EvaluationPeriod,
  PPPKRolePenilai
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  getMasterPertanyaanPerilaku,
  getPenilaianPerilakuDoc,
  savePenilaianPerilakuDoc,
  getPenugasanPenilaiList,
  getMasterPeriods
} from '../../../services/pppkPenilaianModuleService';

interface PPPKPenilaianPerilakuTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  selectedAssignmentId?: string;
  preselectedAssignmentId?: string;
  onNavigateNext?: (penugasanId?: string) => void;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ASPEK_LIST = [
  'Berorientasi Pelayanan',
  'Akuntabel',
  'Kompeten',
  'Harmonis',
  'Loyal',
  'Adaptif',
  'Kolaboratif'
] as const;

export const PPPKPenilaianPerilakuTab: React.FC<PPPKPenilaianPerilakuTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  selectedAssignmentId,
  preselectedAssignmentId,
  onNavigateNext,
  onRefreshData,
  onRefreshAll,
  showToast
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const safeRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
  };

  const masterQuestions = useMemo(() => {
    try {
      return getMasterPertanyaanPerilaku() || [];
    } catch (e) {
      return [];
    }
  }, []);

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

  // Assignments filtered for the current evaluator
  const relevantAssignments = useMemo(() => {
    const list = periodAssignments || [];
    if (!activePegawai || activeRole === 'ADMIN') return list;
    if (activeRole === 'PNS_PENILAI' || activeRole === 'REKAN_PNS') {
      const matched = list.filter(a => a && a.rekanPnsId === activePegawai.nip);
      return matched.length > 0 ? matched : list;
    }
    if (activeRole === 'PPPK_PENILAI' || activeRole === 'REKAN_PPPK') {
      const matched = list.filter(a => a && a.rekanPppkId === activePegawai.nip);
      return matched.length > 0 ? matched : list;
    }
    if (activeRole === 'PEJABAT_PENILAI') {
      const matched = list.filter(a => a && a.pejabatPenilaiId === activePegawai.nip);
      return matched.length > 0 ? matched : list;
    }
    if (activeRole === 'PPPK_DINILAI' || activeRole === 'PPPK') {
      const matched = list.filter(a => a && a.pppkDinilaiId === activePegawai.nip);
      return matched.length > 0 ? matched : list;
    }
    return list;
  }, [periodAssignments, activeRole, activePegawai]);

  // Determine active target assignment
  const defaultAssign = useMemo(() => {
    const list = relevantAssignments.length > 0 ? relevantAssignments : periodAssignments || [];
    if (targetSelectedId) {
      const matched = list.find(a => a && a.id === targetSelectedId);
      if (matched) return matched;
    }
    return list[0];
  }, [relevantAssignments, periodAssignments, targetSelectedId]);

  const [currentAssignId, setCurrentAssignId] = useState<string>(defaultAssign?.id || '');

  React.useEffect(() => {
    if (defaultAssign?.id) {
      setCurrentAssignId(defaultAssign.id);
    }
  }, [defaultAssign?.id]);

  const activeAssignment = useMemo(() => {
    const list = periodAssignments || [];
    return list.find(a => a && a.id === currentAssignId) || defaultAssign;
  }, [periodAssignments, currentAssignId, defaultAssign]);

  // Determine evaluator role for submission
  const evaluatorRole: PPPKRolePenilai = useMemo(() => {
    if (activeRole === 'PNS_PENILAI') return 'PNS_PENILAI';
    if (activeRole === 'PPPK_PENILAI') return 'PPPK_PENILAI';
    return 'PEJABAT_PENILAI';
  }, [activeRole]);

  // Document state
  const [doc, setDoc] = useState<PPPKPenilaianPerilakuDoc | undefined>(() => {
    try {
      return activeAssignment ? getPenilaianPerilakuDoc(activeAssignment.id, evaluatorRole) : undefined;
    } catch (e) {
      return undefined;
    }
  });

  // Selected aspect filter/tab
  const [activeAspek, setActiveAspek] = useState<string>('Berorientasi Pelayanan');

  // Sync if assignment or evaluatorRole changes
  React.useEffect(() => {
    if (activeAssignment) {
      try {
        setDoc(getPenilaianPerilakuDoc(activeAssignment.id, evaluatorRole));
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeAssignment?.id, evaluatorRole]);

  // Check if finalized/locked
  const isLocked = activeAssignment?.status === 'FINAL' || activeRole === 'PPPK_DINILAI';

  // Questions for current active aspect
  const currentAspectQuestions = useMemo(() => {
    return (masterQuestions || []).filter(q => q && q.aspek === activeAspek);
  }, [masterQuestions, activeAspek]);

  // Progress counter: answered / 28
  const answeredCount = useMemo(() => {
    if (!doc || !doc.jawaban) return 0;
    return Object.values(doc.jawaban).filter(v => typeof v === 'number' && v > 0).length;
  }, [doc]);

  // Handle Score Selection (1 to 5)
  const handleScoreChange = (qId: string, score: number) => {
    if (!doc || isLocked) return;
    const currentJawaban = doc.jawaban || {};
    const updatedJawaban = {
      ...currentJawaban,
      [qId]: score
    };

    const scores = Object.values(updatedJawaban);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const avg = scores.length > 0 ? Number((sum / scores.length).toFixed(2)) : 0;

    const updatedDoc: PPPKPenilaianPerilakuDoc = {
      ...doc,
      jawaban: updatedJawaban,
      totalScore: sum,
      rataRataScore: avg
    };

    setDoc(updatedDoc);
  };

  // Handle Save / Submit
  const handleSaveAssessment = (markSubmitted: boolean = false) => {
    if (!doc || !activeAssignment) return;

    if (markSubmitted && answeredCount < 28) {
      safeShowToast(`Harap lengkapi semua 28 pertanyaan perilaku. Baru terjawab: ${answeredCount}/28.`, 'error');
      return;
    }

    const docToSave: PPPKPenilaianPerilakuDoc = {
      ...doc,
      status: markSubmitted ? 'SUBMITTED' : 'DRAFT',
      tanggalPenilaian: new Date().toLocaleDateString('id-ID')
    };

    try {
      savePenilaianPerilakuDoc(docToSave, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
      setDoc(docToSave);
      safeRefresh();
      safeShowToast(
        markSubmitted
          ? 'Penilaian Perilaku 28 Soal berhasil disubmit secara resmi!'
          : 'Draft penilaian perilaku berhasil disimpan.',
        'success'
      );
      if (markSubmitted && onNavigateNext) {
        onNavigateNext(activeAssignment.id);
      }
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal menyimpan penilaian perilaku.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white">
              Submenu 4
            </span>
            <span className="text-xs text-slate-500 font-bold">28 Butir Core Values ASN BerAKHLAK</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Penilaian Perilaku Kerja PPPK (360°)
          </h3>
          <p className="text-xs text-slate-600">
            Subjek: <strong className="text-slate-900">{activeAssignment?.pppkNama}</strong> | Peran Penilai: <strong className="text-purple-700">{evaluatorRole} ({evaluatorRole === 'PEJABAT_PENILAI' ? 'Bobot 60%' : 'Bobot 20%'})</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subjek Selector */}
          {relevantAssignments.length > 1 && (
            <select
              value={currentAssignId}
              onChange={(e) => setCurrentAssignId(e.target.value)}
              className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
            >
              {relevantAssignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.pppkNama}
                </option>
              ))}
            </select>
          )}

          {!isLocked && (
            <>
              <button
                type="button"
                onClick={() => handleSaveAssessment(false)}
                className="px-3.5 py-2 rounded-xl bg-purple-50 text-purple-800 hover:bg-purple-100 font-bold text-xs border border-purple-200 transition-all"
              >
                Simpan Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveAssessment(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-black text-xs transition-all shadow-md shadow-purple-900/20 flex items-center gap-1.5"
              >
                <i className="bi bi-send-check-fill"></i>
                Submit Penilaian (Final)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Score Progress & Rata-rata Indicator */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-purple-400 uppercase tracking-widest">
            Progres Pengisian Soal Perilaku
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h4 className="text-2xl font-black">{answeredCount} / 28</h4>
            <span className="text-xs text-slate-400">Pertanyaan Terjawab</span>
          </div>
          <div className="w-48 bg-slate-800 rounded-full h-2 mt-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / 28) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Rata-Rata Skor</span>
            <div className="text-2xl font-black text-amber-400">
              {doc?.rataRataScore.toFixed(2) || '0.00'} <span className="text-xs text-slate-400">/ 5.00</span>
            </div>
          </div>
          <div className="text-right border-l border-slate-800 pl-6">
            <span className="text-[11px] text-slate-400 uppercase font-bold">Status Kuesioner</span>
            <div>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black mt-0.5 ${
                doc?.status === 'SUBMITTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {doc?.status || 'DRAFT'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aspek BerAKHLAK Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {ASPEK_LIST.map((aspek, idx) => {
          const qs = masterQuestions.filter(q => q.aspek === aspek);
          const aspectAnswered = qs.filter(q => ((doc?.jawaban?.[q.id] || 0) > 0)).length;
          const isFull = aspectAnswered === qs.length;

          return (
            <button
              key={aspek}
              onClick={() => setActiveAspek(aspek)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeAspek === aspek
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{idx + 1}. {aspek}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                isFull
                  ? activeAspek === aspek ? 'bg-purple-800 text-purple-200' : 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {aspectAnswered}/{qs.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Questions Card List */}
      <div className="space-y-4">
        {currentAspectQuestions.map((q) => {
          const currentVal = doc?.jawaban?.[q.id] || 0;

          return (
            <div
              key={q.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 hover:border-purple-200 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-xs border border-purple-200 shrink-0">
                    {q.no}
                  </span>
                  <div>
                    <h5 className="text-xs font-black text-slate-900 leading-snug">
                      {q.perilaku}
                    </h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {q.indikator}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                  {q.id}
                </span>
              </div>

              {/* 5-Point Rating Scale */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-5 gap-2">
                {[
                  { val: 1, label: 'Sangat Kurang' },
                  { val: 2, label: 'Kurang' },
                  { val: 3, label: 'Cukup' },
                  { val: 4, label: 'Baik' },
                  { val: 5, label: 'Sangat Baik' }
                ].map(({ val, label }) => {
                  const isSelected = currentVal === val;

                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleScoreChange(q.id, val)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md font-black ring-2 ring-purple-300'
                          : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
                      } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                    >
                      <div className="text-base font-black">{val}</div>
                      <div className="text-[10px] uppercase tracking-wider truncate">{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
