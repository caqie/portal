import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import {
  PPPKEvaluation,
  EvaluationPeriod,
  BehaviorAssessment,
  BehaviorAspect,
  PPPKConfigSettings,
  PPPKEvaluationAuditLog
} from '../types';
import {
  initializePPPKEvaluationData,
  getEvaluationPeriods,
  getPPPKEvaluations,
  getBehaviorAspects,
  getPPPKSettings,
  savePPPKSettings,
  getPPPKLogs,
  createOrUpdateEvaluation,
  recalculateEvaluation,
  finalizeEvaluation,
  requestCorrection,
  approveCorrection,
  deleteEvaluation,
  saveEvaluationPeriod,
  deleteEvaluationPeriod,
  saveBehaviorAspect,
  deleteBehaviorAspect,
  saveBehaviorAssessment,
  getPPPKEmployees,
  getEvaluationAssignments
} from '../services/pppkEvaluationService';

import PPPKDashboardTab from '../components/pppk/PPPKDashboardTab';
import PPPKDaftarEvaluasiTab from '../components/pppk/PPPKDaftarEvaluasiTab';
import PPPKAnnualRecapTab from '../components/pppk/PPPKAnnualRecapTab';
import PPPKPeriodeTab from '../components/pppk/PPPKPeriodeTab';
import PPPKBehaviorTab from '../components/pppk/PPPKBehaviorTab';
import PPPKAspectsTab from '../components/pppk/PPPKAspectsTab';
import PPPKSettingsTab from '../components/pppk/PPPKSettingsTab';
import { PPPKMyEvaluationView } from '../components/pppk/PPPKMyEvaluationView';
import { PPPKPeerApprovalTab } from '../components/pppk/PPPKPeerApprovalTab';

import PPPKFormEvaluationModal from '../components/pppk/PPPKFormEvaluationModal';
import PPPKDetailEvaluationModal from '../components/pppk/PPPKDetailEvaluationModal';
import PPPKBehaviorAssessmentModal from '../components/pppk/PPPKBehaviorAssessmentModal';

const EvaluasiPPPKPage: React.FC = () => {
  const { user, logActivity } = useAuth();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'penilaian-saya' | 'verifikasi-rekan' | 'daftar' | 'rekap' | 'periode' | 'behavior' | 'aspek' | 'settings'>('dashboard');

  // Selected global period
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedSemester, setSelectedSemester] = useState<'I' | 'II'>('I');

  // Core data states
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [evaluations, setEvaluations] = useState<PPPKEvaluation[]>([]);
  const [aspects, setAspects] = useState<BehaviorAspect[]>([]);
  const [settings, setSettings] = useState<PPPKConfigSettings>(getPPPKSettings());
  const [auditLogs, setAuditLogs] = useState<PPPKEvaluationAuditLog[]>([]);

  // Pending Peer Approval Count for selected period
  const pendingPeerProposalsCount = useMemo(() => {
    try {
      const peers = getEvaluationAssignments({ evaluatorType: 'REKAN_KERJA', approvalStatus: 'PENDING' });
      return peers.filter(a => a.year === selectedYear && a.semester === selectedSemester).length;
    } catch (e) {
      return 0;
    }
  }, [selectedYear, selectedSemester, evaluations]);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [evaluationToEdit, setEvaluationToEdit] = useState<PPPKEvaluation | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvaluationForDetail, setSelectedEvaluationForDetail] = useState<PPPKEvaluation | null>(null);

  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [evaluationForAssessment, setEvaluationForAssessment] = useState<PPPKEvaluation | null>(null);

  // Notification / Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Reload all data
  const reloadData = useCallback(() => {
    setPeriods(getEvaluationPeriods());
    setEvaluations(getPPPKEvaluations());
    setAspects(getBehaviorAspects());
    setSettings(getPPPKSettings());
    setAuditLogs(getPPPKLogs());
  }, []);

  // Initialization on mount
  useEffect(() => {
    initializePPPKEvaluationData();
    reloadData();
  }, [reloadData]);

  // Current active period object
  const currentPeriod = useMemo(() => {
    return periods.find(p => p.year === selectedYear && p.semester === selectedSemester) || periods[0];
  }, [periods, selectedYear, selectedSemester]);

  // Total PPPK Employees count
  const totalPPPKCount = useMemo(() => {
    return getPPPKEmployees().length;
  }, []);

  // Current user info
  const currentUserId = user?.id || 'USER-ADMIN';
  const currentUserName = user?.name || 'Administrator SDM';

  // Handle save evaluation
  const handleSaveEvaluation = (data: Partial<PPPKEvaluation>) => {
    try {
      const saved = createOrUpdateEvaluation(data, currentUserId, currentUserName);
      reloadData();
      showToast(`Evaluasi PPPK untuk ${saved.nama} berhasil disimpan.`);
      logActivity('UPDATE', 'Evaluasi PPPK', `Simpan evaluasi PPPK ${saved.nama}`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan evaluasi.', 'error');
      throw err;
    }
  };

  // Handle recalculate single evaluation
  const handleRecalculate = (id: string) => {
    try {
      const updated = recalculateEvaluation(id, currentUserId, currentUserName);
      reloadData();
      if (selectedEvaluationForDetail?.id === id) {
        setSelectedEvaluationForDetail(updated);
      }
      showToast(`Nilai evaluasi ${updated.nama} berhasil dihitung ulang.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghitung ulang evaluasi.', 'error');
    }
  };

  // Handle recalculate all draft evaluations for selected period
  const handleRecalculateAllDrafts = () => {
    const unfinalized = evaluations.filter(e => Number(e.year) === selectedYear && e.semester === selectedSemester && !e.isFinal);
    if (unfinalized.length === 0) {
      showToast('Tidak ada evaluasi yang berstatus draft/belum final untuk periode ini.', 'info');
      return;
    }

    let successCount = 0;
    unfinalized.forEach(ev => {
      try {
        recalculateEvaluation(ev.id, currentUserId, currentUserName);
        successCount++;
      } catch (e) {
        console.error(e);
      }
    });

    reloadData();
    showToast(`Berhasil menghitung ulang ${successCount} evaluasi semester ini.`);
  };

  // Handle finalize evaluation
  const handleFinalize = (id: string) => {
    try {
      const finalized = finalizeEvaluation(id, currentUserId, currentUserName);
      reloadData();
      if (selectedEvaluationForDetail?.id === id) {
        setSelectedEvaluationForDetail(finalized);
      }
      showToast(`Evaluasi ${finalized.nama} berhasil difinalisasi & dikunci ke snapshot resmi.`);
      logActivity('FINALIZE' as any, 'Evaluasi PPPK', `Finalisasi evaluasi ${finalized.nama}`);
    } catch (err: any) {
      showToast(err.message || 'Gagal memfinalisasi evaluasi.', 'error');
    }
  };

  // Handle request correction
  const handleRequestCorrection = (id: string, reason: string) => {
    try {
      const updated = requestCorrection(id, reason, currentUserId, currentUserName);
      reloadData();
      if (selectedEvaluationForDetail?.id === id) {
        setSelectedEvaluationForDetail(updated);
      }
      showToast('Permohonan koreksi nilai berhasil diajukan.');
      logActivity('UPDATE', 'Evaluasi PPPK', `Pengajuan koreksi nilai ID ${id}`);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengajukan koreksi.', 'error');
    }
  };

  // Handle approve correction
  const handleApproveCorrection = (id: string) => {
    try {
      const updated = approveCorrection(id, currentUserId, currentUserName);
      reloadData();
      if (selectedEvaluationForDetail?.id === id) {
        setSelectedEvaluationForDetail(updated);
      }
      showToast('Permohonan koreksi disetujui. Evaluasi telah dibuka kembali untuk diedit/dihitung ulang.');
      logActivity('UPDATE', 'Evaluasi PPPK', `Persetujuan koreksi evaluasi ID ${id}`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyetujui koreksi.', 'error');
    }
  };

  // Handle delete evaluation
  const handleDeleteEvaluation = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data evaluasi ini?')) return;
    try {
      deleteEvaluation(id, currentUserId, currentUserName);
      reloadData();
      showToast('Evaluasi berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus evaluasi.', 'error');
    }
  };

  // Handle Period CRUD
  const handleSavePeriod = (periodData: Partial<EvaluationPeriod>) => {
    try {
      const saved = saveEvaluationPeriod(periodData, currentUserId, currentUserName);
      reloadData();
      showToast(`Periode ${saved.name} berhasil disimpan.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan periode.', 'error');
      throw err;
    }
  };

  const handleDeletePeriod = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus periode evaluasi ini?')) return;
    try {
      deleteEvaluationPeriod(id, currentUserId, currentUserName);
      reloadData();
      showToast('Periode evaluasi berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus periode.', 'error');
    }
  };

  // Handle Aspect CRUD
  const handleSaveAspect = (asp: BehaviorAspect) => {
    try {
      saveBehaviorAspect(asp, currentUserId, currentUserName);
      reloadData();
      showToast(`Aspek perilaku ${asp.name} berhasil disimpan.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan aspek.', 'error');
    }
  };

  const handleDeleteAspect = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus aspek perilaku ini?')) return;
    try {
      deleteBehaviorAspect(id, currentUserId, currentUserName);
      reloadData();
      showToast('Aspek perilaku berhasil dihapus.');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus aspek.', 'error');
    }
  };

  // Handle Save 360 Assessment
  const handleSaveAssessment = (assessment: BehaviorAssessment) => {
    try {
      saveBehaviorAssessment(assessment, currentUserId, currentUserName);
      // Auto recalculate the evaluation with new behavior score
      if (assessment.evaluationId) {
        recalculateEvaluation(assessment.evaluationId, currentUserId, currentUserName);
      }
      reloadData();
      showToast('Penilaian perilaku 360° berhasil dikirim dan diakumulasikan ke evaluasi.');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan penilaian perilaku.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 font-sans antialiased text-slate-800">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl bg-slate-900 text-white border border-slate-700 animate-fade-in text-xs font-bold">
          {toast.type === 'success' && <i className="bi bi-check-circle-fill text-emerald-400 text-base"></i>}
          {toast.type === 'error' && <i className="bi bi-exclamation-triangle-fill text-rose-400 text-base"></i>}
          {toast.type === 'info' && <i className="bi bi-info-circle-fill text-blue-400 text-base"></i>}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Navigation Tabs Header */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            
            <button
              onClick={() => setActiveTab('penilaian-saya')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'penilaian-saya'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 hover:text-indigo-950'
              }`}
            >
              <i className="bi bi-file-earmark-person-fill"></i>
              Penilaian Kinerja Saya
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-speedometer2"></i>
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('verifikasi-rekan')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'verifikasi-rekan'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-person-check-fill"></i>
              Verifikasi Rekan
              {pendingPeerProposalsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-black animate-pulse">
                  {pendingPeerProposalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('daftar')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'daftar'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-card-checklist"></i>
              Daftar Evaluasi
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'daftar' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {evaluations.filter(e => Number(e.year) === selectedYear && e.semester === selectedSemester).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rekap')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'rekap'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-calendar2-range"></i>
              Rekap Tahunan
            </button>

            <button
              onClick={() => setActiveTab('periode')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'periode'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-calendar-check"></i>
              Master Periode
            </button>

            <button
              onClick={() => setActiveTab('behavior')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'behavior'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-people"></i>
              Perilaku 360°
            </button>

            <button
              onClick={() => setActiveTab('aspek')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'aspek'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-ui-checks"></i>
              Aspek BerAKHLAK
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <i className="bi bi-sliders"></i>
              Pengaturan & Audit
            </button>

          </div>

          {/* Quick Year/Semester Selector in Header */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500">Periode Aktif:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-black bg-transparent border-none focus:outline-none text-slate-900 cursor-pointer"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="text-slate-300">/</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as 'I' | 'II')}
              className="text-xs font-black bg-transparent border-none focus:outline-none text-blue-600 cursor-pointer"
            >
              <option value="I">Semester I</option>
              <option value="II">Semester II</option>
            </select>
          </div>
        </div>

        {/* Tab Content Display */}
        {activeTab === 'penilaian-saya' && (
          <PPPKMyEvaluationView
            currentUser={{ nip: user?.nip, nama: user?.name, role: user?.role }}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'verifikasi-rekan' && (
          <PPPKPeerApprovalTab
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            currentUser={{ nip: user?.nip, nama: user?.name, role: user?.role }}
            onDataChanged={reloadData}
          />
        )}

        {activeTab === 'dashboard' && (
          <PPPKDashboardTab
            evaluations={evaluations}
            periods={periods}
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            onSelectPeriod={(year, sem) => {
              setSelectedYear(year);
              setSelectedSemester(sem);
            }}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
            totalPPPKCount={totalPPPKCount}
          />
        )}

        {activeTab === 'daftar' && (
          <PPPKDaftarEvaluasiTab
            evaluations={evaluations}
            periods={periods}
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            onSelectPeriod={(year, sem) => {
              setSelectedYear(year);
              setSelectedSemester(sem);
            }}
            onOpenCreateModal={() => {
              setEvaluationToEdit(null);
              setIsFormModalOpen(true);
            }}
            onOpenDetailModal={(ev) => {
              setSelectedEvaluationForDetail(ev);
              setIsDetailModalOpen(true);
            }}
            onRecalculate={handleRecalculate}
            onFinalize={handleFinalize}
            onDelete={handleDeleteEvaluation}
            onRecalculateAllDrafts={handleRecalculateAllDrafts}
          />
        )}

        {activeTab === 'rekap' && (
          <PPPKAnnualRecapTab
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
          />
        )}

        {activeTab === 'periode' && (
          <PPPKPeriodeTab
            periods={periods}
            onSavePeriod={handleSavePeriod}
            onDeletePeriod={handleDeletePeriod}
            onSelectPeriod={(year, sem) => {
              setSelectedYear(year);
              setSelectedSemester(sem);
              setActiveTab('daftar');
            }}
          />
        )}

        {activeTab === 'behavior' && (
          <PPPKBehaviorTab
            evaluations={evaluations}
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            onOpenAssessmentModal={(ev) => {
              setEvaluationForAssessment(ev);
              setIsAssessmentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'aspek' && (
          <PPPKAspectsTab
            aspects={aspects}
            onSaveAspect={handleSaveAspect}
            onDeleteAspect={handleDeleteAspect}
          />
        )}

        {activeTab === 'settings' && (
          <PPPKSettingsTab
            settings={settings}
            onSaveSettings={(s) => {
              savePPPKSettings(s, currentUserId, currentUserName);
              reloadData();
            }}
            auditLogs={auditLogs}
          />
        )}

      </div>

      {/* Modals */}
      <PPPKFormEvaluationModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveEvaluation}
        periods={periods}
        evaluationToEdit={evaluationToEdit}
      />

      <PPPKDetailEvaluationModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        evaluation={selectedEvaluationForDetail}
        period={currentPeriod}
        onRecalculate={handleRecalculate}
        onFinalize={handleFinalize}
        onRequestCorrection={handleRequestCorrection}
        onApproveCorrection={handleApproveCorrection}
        onOpenBehaviorAssessment={(ev) => {
          setEvaluationForAssessment(ev);
          setIsAssessmentModalOpen(true);
        }}
        currentUserRole={user?.role || 'superadmin'}
      />

      <PPPKBehaviorAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        evaluation={evaluationForAssessment}
        onSaveAssessment={handleSaveAssessment}
        currentUser={{ nip: user?.nip, nama: user?.name, role: user?.role }}
      />

    </div>
  );
};

export default EvaluasiPPPKPage;
