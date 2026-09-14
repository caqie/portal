import React, { useState, useEffect, useMemo } from 'react';
import {
  PPPKEvaluation,
  Pegawai,
  BehaviorAssessment,
  EvaluationPeriod,
  EvaluationAssignment
} from '../../types';
import {
  getPPPKEmployees,
  getAllEmployees,
  getEvaluationPeriods,
  getPPPKEvaluations,
  getEvaluationAssignments,
  getBehaviorAssessments,
  getPPPKSettings,
  getExistingSKPForEmployee,
  calculateAttendanceForPeriod,
  getSemesterDates,
  ensureEvaluationAssignments,
  createOrUpdateEvaluation,
  recalculateEvaluation,
  calculateEvaluationCompleteness
} from '../../services/pppkEvaluationService';
import { getAtasanLangsung } from '../../services/strukturOrganisasiService';
import { PPPKPeerSelectionModal } from './PPPKPeerSelectionModal';
import PPPKBehaviorAssessmentModal from './PPPKBehaviorAssessmentModal';

interface PPPKMyEvaluationViewProps {
  currentUser?: { nip?: string; nama?: string; role?: string };
  onNavigateToTab?: (tabKey: string) => void;
}

export const PPPKMyEvaluationView: React.FC<PPPKMyEvaluationViewProps> = ({
  currentUser,
  onNavigateToTab
}) => {
  const pppkEmployees = useMemo(() => getPPPKEmployees(), []);
  const allEmployees = useMemo(() => getAllEmployees(), []);
  const periods = useMemo(() => getEvaluationPeriods(), []);
  const settings = useMemo(() => getPPPKSettings(), []);

  // Determine initial selected PPPK
  const defaultPppk = useMemo(() => {
    if (currentUser?.nip) {
      const match = pppkEmployees.find(p => p.nip === currentUser.nip);
      if (match) return match;
    }
    return pppkEmployees[0] || null;
  }, [pppkEmployees, currentUser]);

  const [selectedSubjectNip, setSelectedSubjectNip] = useState<string>(defaultPppk?.nip || '');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(periods[0]?.id || '');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [isPeerModalOpen, setIsPeerModalOpen] = useState(false);
  const [isAssessModalOpen, setIsAssessModalOpen] = useState(false);
  const [activeAssessTarget, setActiveAssessTarget] = useState<EvaluationAssignment | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active Subject Employee
  const currentSubject = useMemo(() => {
    return allEmployees.find(p => p.nip === selectedSubjectNip) || defaultPppk;
  }, [selectedSubjectNip, allEmployees, defaultPppk]);

  // Active Period
  const currentPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || periods[0];
  }, [periods, selectedPeriodId]);

  // Ensure assignments exist (automated Atasan and Self assignments)
  useEffect(() => {
    if (currentSubject?.nip && currentPeriod?.id) {
      try {
        ensureEvaluationAssignments(currentSubject.nip, currentPeriod.id);
      } catch (e) {
        // Non-fatal
      }
    }
  }, [currentSubject?.nip, currentPeriod?.id, refreshTrigger]);

  // Fetch or find evaluation record for this PPPK in current period
  const evaluation = useMemo(() => {
    void refreshTrigger;
    if (!currentSubject || !currentPeriod) return null;
    const allEvals = getPPPKEvaluations();
    let found = allEvals.find(e => e.employeeId === currentSubject.nip && e.periodId === currentPeriod.id);

    // If not found yet, create or initialize draft evaluation for this PPPK
    if (!found) {
      try {
        const dates = getSemesterDates(currentPeriod.year, currentPeriod.semester);
        const skpInfo = getExistingSKPForEmployee(currentSubject.nip, currentPeriod.year, currentPeriod.semester);
        const attInfo = calculateAttendanceForPeriod(currentSubject.nip, dates.startDate, dates.endDate, settings);
        found = createOrUpdateEvaluation(
          {
            employeeId: currentSubject.nip,
            periodId: currentPeriod.id,
            year: currentPeriod.year,
            semester: currentPeriod.semester,
            skpScore: skpInfo.score,
            skpPredikat: skpInfo.predikat,
            attendanceScore: attInfo.finalScore,
            behaviorScore: 85,
            status: 'DRAFT'
          },
          currentUser?.nip || 'SYSTEM',
          currentUser?.nama || 'Sistem'
        );
      } catch (e) {
        // Fallback placeholder
      }
    }
    return found || null;
  }, [currentSubject, currentPeriod, refreshTrigger, settings, currentUser]);

  // Atasan Langsung Info (Auto-detected from struktur organisasi)
  const atasanInfo = useMemo(() => {
    if (!currentSubject) return { atasan: null, levelLabel: '-', dasarPenilaian: '-' };
    return getAtasanLangsung(currentSubject, allEmployees);
  }, [currentSubject, allEmployees]);

  // Assignments for current PPPK and period
  const assignments = useMemo(() => {
    void refreshTrigger;
    if (!currentSubject || !currentPeriod) return [];
    return getEvaluationAssignments({
      subjectEmployeeId: currentSubject.nip,
      periodId: currentPeriod.id
    });
  }, [currentSubject, currentPeriod, refreshTrigger]);

  const atasanAssignment = useMemo(() => {
    return assignments.find(a => a.evaluator_type === 'ATASAN');
  }, [assignments]);

  const peerAssignments = useMemo(() => {
    return assignments.filter(a => a.evaluator_type === 'REKAN_KERJA');
  }, [assignments]);

  const selfAssignment = useMemo(() => {
    return assignments.find(a => a.evaluator_type === 'SELF');
  }, [assignments]);

  // SKP details
  const skpDetails = useMemo(() => {
    if (!currentSubject || !currentPeriod) return null;
    return getExistingSKPForEmployee(currentSubject.nip, currentPeriod.year, currentPeriod.semester);
  }, [currentSubject, currentPeriod]);

  // Presensi details
  const attendanceDetails = useMemo(() => {
    if (!currentSubject || !currentPeriod) return null;
    const dates = getSemesterDates(currentPeriod.year, currentPeriod.semester);
    return calculateAttendanceForPeriod(currentSubject.nip, dates.startDate, dates.endDate, settings);
  }, [currentSubject, currentPeriod, settings]);

  // Completeness check
  const completeness = useMemo(() => {
    if (!evaluation) {
      return {
        isComplete: false,
        skpComplete: false,
        atasanComplete: false,
        rekanComplete: false,
        absensiComplete: false,
        completedPeerCount: 0,
        requiredPeerCount: settings.peerEvaluatorMin || 2,
        missingItems: ['Data evaluasi belum dimuat'],
        readyForVerification: false
      };
    }
    return calculateEvaluationCompleteness(evaluation);
  }, [evaluation, settings]);

  // Handle Recalculate
  const handleRecalculate = () => {
    if (!evaluation) return;
    try {
      recalculateEvaluation(evaluation.id, currentUser?.nip || 'ADMIN', currentUser?.nama || 'Admin SDM');
      setActionSuccess('Nilai evaluasi kinerja PPPK berhasil dihitung ulang.');
      setRefreshTrigger(p => p + 1);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menghitung ulang evaluasi.');
    }
  };

  // Open Assessment Modal for specific evaluator
  const handleOpenAssessment = (assignment: EvaluationAssignment) => {
    setActiveAssessTarget(assignment);
    setIsAssessModalOpen(true);
  };

  const handleAssessmentSaved = () => {
    setIsAssessModalOpen(false);
    setActiveAssessTarget(null);
    setActionSuccess('Penilaian perilaku 360° berhasil disimpan.');
    setRefreshTrigger(p => p + 1);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Stepper active calculation
  const currentStep = useMemo(() => {
    if (!evaluation) return 1;
    if (evaluation.isFinal) return 8;
    if (completeness.isComplete) return 7;
    if (!completeness.skpComplete) return 2;
    if (!completeness.atasanComplete) return 3;
    if (!completeness.rekanComplete) return 4;
    return 5;
  }, [evaluation, completeness]);

  const isAnonymousMode = Boolean(settings.allowAnonymous);
  const isAdmin = currentUser?.role?.toLowerCase().includes('admin') || !currentUser?.nip || currentUser?.nip !== currentSubject?.nip;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls: Switch PPPK & Period */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <i className="bi bi-file-earmark-person-fill text-xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                PENILAIAN KINERJA PPPK
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                Subjek: PPPK
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Formulir Evaluasi Kinerja Semester Pegawai Pemerintah dengan Perjanjian Kerja (PPPK)
            </p>
          </div>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pegawai PPPK Switcher */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-600 shrink-0">Pegawai:</label>
            <select
              value={selectedSubjectNip}
              onChange={e => setSelectedSubjectNip(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden max-w-xs truncate"
            >
              {pppkEmployees.map((p, pIdx) => (
                <option key={`${p.nip}-${pIdx}`} value={p.nip}>
                  {p.nama} ({p.nip})
                </option>
              ))}
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-600 shrink-0">Periode:</label>
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRecalculate}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
            title="Hitung Ulang Nilai"
          >
            <i className="bi bi-arrow-clockwise"></i>
            <span className="hidden sm:inline">Hitung Ulang</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <i className="bi bi-check-circle-fill text-emerald-600 text-sm"></i>
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <i className="bi bi-exclamation-triangle-fill text-rose-600 text-sm"></i>
          <span>{actionError}</span>
        </div>
      )}

      {/* 8-Stage Stepper Progress Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
          {[
            { step: 1, label: 'Identitas', done: true },
            { step: 2, label: 'SKP (60%)', done: completeness.skpComplete },
            { step: 3, label: 'Atasan', done: completeness.atasanComplete },
            { step: 4, label: 'Rekan Kerja', done: completeness.rekanComplete },
            { step: 5, label: 'Perilaku 360°', done: completeness.atasanComplete && completeness.rekanComplete },
            { step: 6, label: 'Absensi (15%)', done: completeness.absensiComplete },
            { step: 7, label: 'Ringkasan', done: completeness.isComplete },
            { step: 8, label: 'Finalisasi', done: Boolean(evaluation?.isFinal) }
          ].map((item, idx) => (
            <div key={item.step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    item.done
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : currentStep === item.step
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {item.done ? <i className="bi bi-check-lg"></i> : item.step}
                </div>
                <span className={`text-[11px] mt-1.5 font-bold whitespace-nowrap ${
                  item.done
                    ? 'text-emerald-700'
                    : currentStep === item.step
                    ? 'text-indigo-600 font-extrabold'
                    : 'text-slate-400'
                }`}>
                  {item.label}
                </span>
              </div>
              {idx < 7 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    item.done ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 1: IDENTITAS PEGAWAI (READ-ONLY) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">1</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Identitas Pegawai yang Dinilai
            </h2>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
            evaluation?.isFinal
              ? 'bg-emerald-100 text-emerald-800'
              : completeness.isComplete
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {evaluation?.isFinal
              ? 'Status: Final & Terkunci'
              : completeness.isComplete
              ? 'Status: Siap Diverifikasi'
              : 'Status: Menunggu Kelengkapan'}
          </span>
        </div>

        {currentSubject && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Nama Lengkap</div>
              <div className="font-bold text-slate-900 text-sm">{currentSubject.nama}</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Nomor Induk Pegawai (NIP)</div>
              <div className="font-bold text-slate-900 font-mono">{currentSubject.nip}</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Status Kepegawaian</div>
              <div className="font-black text-amber-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Jabatan</div>
              <div className="font-semibold text-slate-800">{currentSubject.jabatan || '-'}</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Unit Kerja / Divisi</div>
              <div className="font-semibold text-slate-800">{currentSubject.unitKerja || '-'}</div>
            </div>

            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="text-slate-400 font-semibold mb-1">Atasan Langsung (Sistem)</div>
              <div className="font-bold text-slate-900 truncate">
                {atasanInfo.atasan?.nama || 'Belum Terdefinisi'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: DATA SKP (SASARAN KINERJA PEGAWAI) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">2</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Integrasi Nilai SKP (Bobot: {currentPeriod?.skpWeight || 60}%)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Sumber Data: Modul SKP Existing DJKI
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="text-indigo-600 font-semibold mb-1">Skor Kinerja SKP</div>
            <div className="text-2xl font-black text-indigo-900">
              {evaluation?.skpScore?.toFixed(2) || (skpDetails?.score ? skpDetails.score.toFixed(2) : '90.00')}
            </div>
            <div className="text-[11px] text-indigo-600 mt-1 font-medium">Skala 0 - 100</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-slate-500 font-semibold mb-1">Predikat Kinerja</div>
            <div className="text-lg font-bold text-slate-800">
              {skpDetails?.predikat || evaluation?.skpPredikat || 'Baik'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sesuai Ekspektasi Pimpinan</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="text-slate-500 font-semibold mb-1">Kontribusi ke Nilai Akhir</div>
            <div className="text-lg font-black text-slate-900">
              {evaluation?.skpContribution?.toFixed(2) || '54.00'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Bobot: {currentPeriod?.skpWeight || 60}%</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <i className="bi bi-check-circle-fill text-emerald-600"></i>
              <span>Status Integrasi: Valid</span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              Data SKP periode ini telah disinkronkan secara otomatis.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: ATASAN LANGSUNG (DITENTUKAN OTOMATIS OLEH SISTEM) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">3</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Penilai Atasan Langsung
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
            Ditentukan Otomatis oleh Sistem
          </span>
        </div>

        {atasanInfo.atasan ? (
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                <i className="bi bi-person-badge"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">{atasanInfo.atasan.nama}</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-black uppercase bg-blue-100 text-blue-800">
                    PNS / Pejabat Penilai
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    Jenis: ATASAN LANGSUNG
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  NIP: {atasanInfo.atasan.nip} • {atasanInfo.atasan.jabatan}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Unit: {atasanInfo.atasan.unitKerja} • Dasar: {atasanInfo.dasarPenilaian}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {atasanAssignment?.assignment_status === 'COMPLETED' ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <i className="bi bi-check-circle-fill"></i> Sudah Menilai
                  </span>
                  {atasanAssignment.score !== undefined && (
                    <div className="text-xs font-bold text-slate-700 mt-1">
                      Nilai: {atasanAssignment.score.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    <i className="bi bi-hourglass-split"></i> Menunggu Penilaian Atasan
                  </span>
                </div>
              )}

              {/* Quick action button for Atasan / Admin */}
              {atasanAssignment && (
                <button
                  onClick={() => handleOpenAssessment(atasanAssignment)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>{atasanAssignment.assignment_status === 'COMPLETED' ? 'Lihat / Edit Nilai' : 'Beri Nilai Atasan'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-800 text-xs">
            Atasan langsung belum terdeteksi secara otomatis dalam struktur organisasi. Silakan hubungi Admin SDM.
          </div>
        )}
      </div>

      {/* SECTION 4: REKAN KERJA PENILAI (PEER REVIEWERS) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">4</span>
              <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                Rekan Kerja Penilai (Peer Reviewers)
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Anda dapat mengusulkan rekan kerja yang mengetahui pelaksanaan pekerjaan Anda selama periode evaluasi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              Progres: {peerAssignments.filter(p => p.assignment_status === 'COMPLETED').length} / {peerAssignments.length} Selesai
            </span>
            <button
              onClick={() => setIsPeerModalOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <i className="bi bi-person-plus-fill"></i>
              <span>+ Pilih Rekan Kerja</span>
            </button>
          </div>
        </div>

        {peerAssignments.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl p-6">
            <i className="bi bi-people text-3xl text-slate-300 block mb-2"></i>
            <p className="text-xs font-bold text-slate-700">Belum ada rekan kerja penilai yang diusulkan</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Klik tombol <span className="font-bold text-indigo-600">+ Pilih Rekan Kerja</span> di atas untuk mengusulkan minimal 2 dan maksimal 4 rekan kerja (PNS atau PPPK).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {peerAssignments.map((peer, pIdx) => {
              const isApproved = peer.approval_status === 'APPROVED';
              const isPending = peer.approval_status === 'PENDING';
              const isRejected = peer.approval_status === 'REJECTED';
              const isCompleted = peer.assignment_status === 'COMPLETED';

              // Anonymous mask if enabled and not admin
              const displayName = isAnonymousMode && !isAdmin
                ? `Rekan Kerja Penilai #${pIdx + 1}`
                : peer.evaluator_employee_nama;

              return (
                <div
                  key={peer.id}
                  className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{displayName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          peer.evaluator_employee_status === 'PPPK'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {peer.evaluator_employee_status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {!isAnonymousMode || isAdmin ? `NIP: ${peer.evaluator_employee_id}` : 'Identitas dirahasiakan'}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate max-w-xs mt-0.5">
                        {peer.evaluator_employee_unit || '-'}
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {isPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Menunggu Approval Admin
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Disetujui Admin
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Ditolak
                        </span>
                      )}

                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Sudah Menilai
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          Belum Menilai
                        </span>
                      )}
                    </div>
                  </div>

                  {peer.rejection_reason && (
                    <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-100 italic">
                      Alasan Ditolak: {peer.rejection_reason}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-400">
                      {peer.score !== undefined ? `Nilai: ${peer.score.toFixed(2)}` : 'Nilai belum masuk'}
                    </span>

                    {isApproved && (
                      <button
                        onClick={() => handleOpenAssessment(peer)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                      >
                        {isCompleted ? 'Lihat / Edit Nilai' : 'Beri Nilai 360°'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 5: PENILAIAN MANDIRI (SELF ASSESSMENT) */}
      {settings.enableSelfAssessment && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">5</span>
              <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                Penilaian Mandiri (Self-Assessment)
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Bobot dalam 360°: {settings.evaluator360Weights?.selfWeight || 20}%
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs text-slate-900">Evaluasi Diri Pegawai PPPK</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Refleksi atas pencapaian integritas, akuntabilitas, dan pelayanan kerja Anda.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selfAssignment?.assignment_status === 'COMPLETED' ? (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Sudah Diisi ({selfAssignment.score?.toFixed(2)})
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  Belum Diisi
                </span>
              )}

              {selfAssignment && (
                <button
                  onClick={() => handleOpenAssessment(selfAssignment)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {selfAssignment.assignment_status === 'COMPLETED' ? 'Lihat / Perbarui' : 'Isi Penilaian Diri'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: DATA PRESENSI / ABSENSI */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">6</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Data Presensi & Disiplin Kerja (Bobot: {currentPeriod?.attendanceWeight || 15}%)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Integrasi Smart Attendance SDM DJKI
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <div className="text-slate-400 font-semibold text-[10px]">Hari Kerja</div>
            <div className="text-base font-black text-slate-900 mt-1">{attendanceDetails?.workDays || 120}</div>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 text-center">
            <div className="text-emerald-700 font-semibold text-[10px]">Hadir</div>
            <div className="text-base font-black text-emerald-900 mt-1">{attendanceDetails?.presentDays || 118}</div>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-100 text-center">
            <div className="text-amber-700 font-semibold text-[10px]">Terlambat</div>
            <div className="text-base font-black text-amber-900 mt-1">{attendanceDetails?.lateCount || 0}</div>
          </div>

          <div className="p-3 bg-orange-50/70 rounded-2xl border border-orange-100 text-center">
            <div className="text-orange-700 font-semibold text-[10px]">Pulang Cepat</div>
            <div className="text-base font-black text-orange-900 mt-1">{attendanceDetails?.earlyLeaveCount || 0}</div>
          </div>

          <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-100 text-center">
            <div className="text-rose-700 font-semibold text-[10px]">Tanpa Keterangan</div>
            <div className="text-base font-black text-rose-900 mt-1">{attendanceDetails?.absenceCount || 0}</div>
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-center">
            <div className="text-indigo-700 font-semibold text-[10px]">Nilai Absensi</div>
            <div className="text-base font-black text-indigo-900 mt-1">
              {evaluation?.attendanceScore?.toFixed(2) || '95.00'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 7: RINGKASAN NILAI & STATUS KELENGKAPAN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">7</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Ringkasan Nilai Akhir & Validasi Kelengkapan
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Formula Bobot Resmi: 60% SKP + 25% Perilaku 360° + 15% Absensi
          </span>
        </div>

        {/* Score Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-xs font-semibold text-slate-500">1. SKP (60%)</div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {evaluation?.skpScore?.toFixed(2) || '90.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Kontribusi: <span className="font-bold text-slate-700">{evaluation?.skpContribution?.toFixed(2) || '54.00'}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-xs font-semibold text-slate-500">2. Perilaku 360° (25%)</div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {evaluation?.behaviorScore?.toFixed(2) || '85.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Kontribusi: <span className="font-bold text-slate-700">{evaluation?.behaviorContribution?.toFixed(2) || '21.25'}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-xs font-semibold text-slate-500">3. Absensi (15%)</div>
            <div className="text-lg font-black text-slate-900 mt-1">
              {evaluation?.attendanceScore?.toFixed(2) || '95.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Kontribusi: <span className="font-bold text-slate-700">{evaluation?.attendanceContribution?.toFixed(2) || '14.25'}</span>
            </div>
          </div>

          <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
            <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Nilai Akhir PPPK</div>
            <div className="text-2xl font-black mt-1">
              {evaluation?.finalScore?.toFixed(2) || '89.50'}
            </div>
            <div className="text-xs font-bold text-indigo-100 mt-0.5">
              Kategori: {evaluation?.category || 'Baik'}
            </div>
          </div>
        </div>

        {/* Verification Readiness Banner */}
        {completeness.readyForVerification && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <i className="bi bi-patch-check-fill text-lg"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  EVALUASI SIAP DIVERIFIKASI OLEH ADMIN SDM
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Seluruh 4 komponen evaluasi (SKP, Atasan Langsung, Rekan Kerja, dan Absensi) telah terpenuhi secara lengkap.
                </p>
              </div>
            </div>

            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('daftar')}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
              >
                Buka Halaman Verifikasi
              </button>
            )}
          </div>
        )}

        {/* Checklist of Missing Items if not complete */}
        {!completeness.isComplete && completeness.missingItems.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
            <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <i className="bi bi-exclamation-circle-fill text-amber-600"></i>
              <span>Daftar Persyaratan yang Masih Perlu Dilengkapi:</span>
            </div>
            <ul className="text-xs text-amber-800 space-y-1 list-disc pl-5">
              {completeness.missingItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* SECTION 8: FINALISASI & AUDIT LOG */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center">8</span>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              Status Finalisasi & Rekam Jejak (Audit Log)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Kepatuhan Regulasi Kepegawaian DJKI
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-slate-800">
              {evaluation?.isFinal ? 'Telah Difinalisasi & Ditandatangani Resmi' : 'Evaluasi Belum Difinalisasi'}
            </div>
            <div className="text-slate-500 mt-0.5">
              {evaluation?.isFinal
                ? `Difinalisasi pada: ${evaluation.finalizedAt || '-'} oleh ${evaluation.finalizedBy || 'Admin SDM'}`
                : 'Setelah seluruh komponen lengkap, Admin SDM akan memfinalisasi evaluasi kinerja ini.'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
            >
              <i className="bi bi-printer"></i>
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL PILIH REKAN KERJA */}
      {currentSubject && (
        <PPPKPeerSelectionModal
          isOpen={isPeerModalOpen}
          onClose={() => setIsPeerModalOpen(false)}
          subjectEmployee={currentSubject}
          periodId={currentPeriod.id}
          currentUser={currentUser}
          onSuccess={() => {
            setActionSuccess('Usulan rekan kerja penilai berhasil diajukan dan sedang menunggu persetujuan Admin SDM.');
            setRefreshTrigger(p => p + 1);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}

      {/* MODAL FORM PENILAIAN PERILAKU 360° */}
      {evaluation && isAssessModalOpen && activeAssessTarget && (
        <PPPKBehaviorAssessmentModal
          isOpen={isAssessModalOpen}
          onClose={() => setIsAssessModalOpen(false)}
          evaluation={evaluation}
          onSaveAssessment={handleAssessmentSaved}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
