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
import { PPPKKetuaTimManager } from '../components/pppk/PPPKKetuaTimManager';
import { PPPKBulkAttendanceManager } from '../components/pppk/PPPKBulkAttendanceManager';
import { PPPKPeerAssignmentManager } from '../components/pppk/PPPKPeerAssignmentManager';
import { PPPKSkpManager } from '../components/pppk/PPPKSkpManager';

import PPPKFormEvaluationModal from '../components/pppk/PPPKFormEvaluationModal';
import PPPKDetailEvaluationModal from '../components/pppk/PPPKDetailEvaluationModal';
import PPPKBehaviorAssessmentModal from '../components/pppk/PPPKBehaviorAssessmentModal';

// Enterprise Modul Penilaian PPPK (10 Submenu & Role Simulator)
import {
  RoleAndPeriodSelectorBar,
  SimRole
} from '../components/pppk/penilaian/RoleAndPeriodSelectorBar';
import { PPPKDashboardTab as PPPKEnterpriseDashboardTab } from '../components/pppk/penilaian/PPPKDashboardTab';
import { PPPKPenetapanPenilaiTab } from '../components/pppk/penilaian/PPPKPenetapanPenilaiTab';
import { PPPKPenilaianHasilKerjaTab } from '../components/pppk/penilaian/PPPKPenilaianHasilKerjaTab';
import { PPPKPenilaianPerilakuTab } from '../components/pppk/penilaian/PPPKPenilaianPerilakuTab';
import { PPPKPenilaianKehadiranTab } from '../components/pppk/penilaian/PPPKPenilaianKehadiranTab';
import { PPPKHasilPenilaianTab } from '../components/pppk/penilaian/PPPKHasilPenilaianTab';
import { PPPKFinalisasiTab } from '../components/pppk/penilaian/PPPKFinalisasiTab';
import { PPPKRiwayatPenilaianTab } from '../components/pppk/penilaian/PPPKRiwayatPenilaianTab';
import { PPPKLaporanTab } from '../components/pppk/penilaian/PPPKLaporanTab';
import { PPPKPengaturanPeriodeTab } from '../components/pppk/penilaian/PPPKPengaturanPeriodeTab';
import { PPPKRealRoleHeader } from '../components/pppk/penilaian/PPPKRealRoleHeader';

import {
  getPenugasanPenilaiList,
  getMasterPeriodePenilaian,
  saveMasterPeriodePenilaian,
  deleteMasterPeriodePenilaian
} from '../services/pppkPenilaianModuleService';
import { getAllEmployees } from '../services/pppkEvaluationService';
import { PPPKPenugasanPenilai, Pegawai } from '../types';

const EvaluasiPPPKPage: React.FC = () => {
  const { user, logActivity, isSuperadmin } = useAuth();

  // Check if current authenticated user has Superadmin rights
  const isUserSuperadmin = Boolean(
    isSuperadmin ||
    user?.role === 'Superadmin' ||
    (Array.isArray(user?.roles) && user.roles.includes('Superadmin'))
  );

  // Mode Uji Coba (Simulator Peran): Khusus Superadmin dan harus diaktifkan secara eksplisit
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const isSimulationActive = isUserSuperadmin && isSimulationMode;

  // Simulator Persona State (hanya berlaku saat Superadmin mengaktifkan Mode Uji Coba)
  const [simRole, setSimRole] = useState<SimRole>('ADMIN');
  const [simPegawai, setSimPegawai] = useState<Pegawai | null>(() => {
    const emps = getAllEmployees();
    return emps[0] || null;
  });

  const [allEmployees, setAllEmployees] = useState<Pegawai[]>(() => getAllEmployees());
  const [enterprisePeriods, setEnterprisePeriods] = useState<EvaluationPeriod[]>(() => getMasterPeriodePenilaian());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('PERIOD-2026-I');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | undefined>(undefined);
  const [assignments, setAssignments] = useState<PPPKPenugasanPenilai[]>(() => getPenugasanPenilaiList());
  const [isExtraMenuOpen, setIsExtraMenuOpen] = useState(false);

  // Profil Pegawai Resmi (Authentic Pegawai) untuk user yang sedang login
  const realPegawai = useMemo<Pegawai | null>(() => {
    if (!user) return allEmployees[0] || null;
    const cleanUserNip = (user.nip || '').replace(/\D/g, '');
    const matched = allEmployees.find(e => {
      const cleanEmpNip = (e.nip || '').replace(/\D/g, '');
      if (cleanUserNip && cleanEmpNip && cleanUserNip === cleanEmpNip) return true;
      if (user.id && (e.id === user.id || e.nip === user.id)) return true;
      if (user.name && e.nama && (
        e.nama.toLowerCase().trim() === user.name.toLowerCase().trim() ||
        e.nama.toLowerCase().includes(user.name.toLowerCase().trim())
      )) return true;
      return false;
    });
    if (matched) return matched;
    return {
      id: user.id || user.nip || 'PEG-AUTH',
      nip: user.nip || '198801012015031001',
      nama: user.name || 'Pegawai Terotentikasi',
      jabatan: user.role || 'Pengelola SDM',
      unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
      jenisPegawai: (user.role && user.role.toLowerCase().includes('pppk')) ? 'PPPK' : 'PNS',
      status: 'Aktif'
    } as Pegawai;
  }, [allEmployees, user]);

  // Identifikasi peran-peran sah dari user sesungguhnya
  const realRoles = useMemo<SimRole[]>(() => {
    const roles: SimRole[] = [];
    const userNip = realPegawai?.nip || user?.nip || '';

    // 1. Otoritas Administrator SDM
    const isAdminSDM = Boolean(
      isUserSuperadmin ||
      user?.role === 'Admin SDM' ||
      user?.role === 'Admin' ||
      user?.role === 'Administrator' ||
      (Array.isArray(user?.roles) && (
        user.roles.includes('Superadmin') ||
        user.roles.includes('Admin SDM') ||
        user.roles.includes('Admin Perencanaan & Layanan') ||
        user.roles.includes('Admin Pengelolaan Karier') ||
        user.roles.includes('Admin Pengembangan Kompetensi')
      ))
    );
    if (isAdminSDM) {
      roles.push('ADMIN');
    }

    // 2. Otoritas Pejabat Penilai Kinerja (Atasan / Ketua Tim)
    const hasAssignedPppk = assignments.some(a => a && a.pejabatPenilaiId === userNip);
    const isStructuralOrKetua = Boolean(
      realPegawai?.jabatan && (
        realPegawai.jabatan.toLowerCase().includes('ketua tim') ||
        realPegawai.jabatan.toLowerCase().includes('koordinator') ||
        realPegawai.jabatan.toLowerCase().includes('subkoordinator') ||
        realPegawai.jabatan.toLowerCase().includes('direktur') ||
        realPegawai.jabatan.toLowerCase().includes('kepala')
      )
    );
    if (hasAssignedPppk || isStructuralOrKetua) {
      roles.push('PEJABAT_PENILAI');
    }

    // 3. Otoritas Pegawai PPPK yang Dinilai
    const isPppk = Boolean(
      (realPegawai?.jenisPegawai || (realPegawai as any)?.status || '').toUpperCase().includes('PPPK') ||
      assignments.some(a => a && a.pppkDinilaiId === userNip)
    );
    if (isPppk) {
      roles.push('PPPK_DINILAI');
    }

    // 4. Otoritas Rekan Kerja Penilai (PNS)
    const isRekanPns = assignments.some(a => a && a.rekanPnsId === userNip);
    if (isRekanPns) {
      roles.push('PNS_PENILAI');
    }

    // 5. Otoritas Rekan Kerja Penilai (PPPK)
    const isRekanPppk = assignments.some(a => a && a.rekanPppkId === userNip);
    if (isRekanPppk) {
      roles.push('PPPK_PENILAI');
    }

    // Fallback cerdas jika belum terpetakan dalam database penugasan
    if (roles.length === 0) {
      if (isPppk) {
        roles.push('PPPK_DINILAI');
      } else if (isAdminSDM) {
        roles.push('ADMIN');
      } else {
        roles.push('PEJABAT_PENILAI');
      }
    }

    return Array.from(new Set(roles));
  }, [realPegawai, user, isUserSuperadmin, assignments]);

  // Peran sah aktif yang dipilih (jika user memiliki multi-peran resmi)
  const [realSelectedRole, setRealSelectedRole] = useState<SimRole | null>(null);

  const effectiveRealRole: SimRole = useMemo(() => {
    if (realSelectedRole && realRoles.includes(realSelectedRole)) {
      return realSelectedRole;
    }
    return realRoles[0] || 'ADMIN';
  }, [realSelectedRole, realRoles]);

  // Peran dan Pegawai aktif sesungguhnya atau simulasi (jika Superadmin mengaktifkan uji coba)
  const activeRole: SimRole = isSimulationActive ? simRole : effectiveRealRole;
  const activePegawai: Pegawai | null = isSimulationActive ? simPegawai : realPegawai;

  // Active navigation tab (10 Enterprise Submenus + Legacy Managers)
  const [activeTab, setActiveTab] = useState<
    | 'dashboard-pppk'
    | 'penetapan-penilai'
    | 'penilaian-hasil-kerja'
    | 'penilaian-perilaku'
    | 'penilaian-kehadiran'
    | 'hasil-penilaian'
    | 'finalisasi'
    | 'riwayat-penilaian'
    | 'laporan'
    | 'pengaturan-periode'
    // Legacy / raw technical managers
    | 'dashboard'
    | 'penilaian-saya'
    | 'skp'
    | 'ketua-tim'
    | 'bulk-absensi'
    | 'rekan-kerja'
    | 'verifikasi-rekan'
    | 'daftar'
    | 'rekap'
    | 'periode'
    | 'behavior'
    | 'aspek'
    | 'settings'
  >('dashboard-pppk');

  // Submenu yang diizinkan sesuai peran aktif
  const availableTabs = useMemo(() => {
    switch (activeRole) {
      case 'ADMIN':
        return [
          { id: 'dashboard-pppk', label: '1. Dashboard', icon: 'bi-speedometer2', color: 'bg-blue-600' },
          { id: 'penetapan-penilai', label: '2. Penetapan Penilai', icon: 'bi-person-badge-fill', color: 'bg-indigo-600' },
          { id: 'penilaian-hasil-kerja', label: '3. Hasil Kerja (SKP)', icon: 'bi-bullseye', color: 'bg-cyan-700' },
          { id: 'penilaian-perilaku', label: '4. Perilaku BerAKHLAK (28)', icon: 'bi-ui-checks-grid', color: 'bg-purple-700' },
          { id: 'penilaian-kehadiran', label: '5. Kehadiran (Alfa)', icon: 'bi-fingerprint', color: 'bg-emerald-700' },
          { id: 'hasil-penilaian', label: '6. Hasil & Matriks', icon: 'bi-graph-up-arrow', color: 'bg-teal-700' },
          { id: 'finalisasi', label: '7. Finalisasi', icon: 'bi-shield-lock-fill', color: 'bg-amber-600' },
          { id: 'riwayat-penilaian', label: '8. Riwayat', icon: 'bi-clock-history', color: 'bg-slate-800' },
          { id: 'laporan', label: '9. Laporan & Cetak', icon: 'bi-printer-fill', color: 'bg-rose-700' },
          { id: 'pengaturan-periode', label: '10. Pengaturan', icon: 'bi-gear-wide-connected', color: 'bg-slate-900' }
        ];
      case 'PEJABAT_PENILAI':
        return [
          { id: 'dashboard-pppk', label: '1. Dashboard Penilai', icon: 'bi-speedometer2', color: 'bg-blue-600' },
          { id: 'penetapan-penilai', label: '2. Tetapkan Rekan Kerja', icon: 'bi-person-badge-fill', color: 'bg-indigo-600' },
          { id: 'penilaian-hasil-kerja', label: '3. Nilai Hasil Kerja', icon: 'bi-bullseye', color: 'bg-cyan-700' },
          { id: 'penilaian-perilaku', label: '4. Nilai Perilaku (60%)', icon: 'bi-ui-checks-grid', color: 'bg-purple-700' },
          { id: 'penilaian-kehadiran', label: '5. Tinjau Kehadiran', icon: 'bi-fingerprint', color: 'bg-emerald-700' },
          { id: 'hasil-penilaian', label: '6. Hasil & Matriks', icon: 'bi-graph-up-arrow', color: 'bg-teal-700' },
          { id: 'finalisasi', label: '7. Finalisasi & Rekomendasi', icon: 'bi-shield-lock-fill', color: 'bg-amber-600' },
          { id: 'riwayat-penilaian', label: '8. Riwayat Tim', icon: 'bi-clock-history', color: 'bg-slate-800' },
          { id: 'laporan', label: '9. Dokumen & Laporan', icon: 'bi-printer-fill', color: 'bg-rose-700' }
        ];
      case 'PPPK_DINILAI':
      case 'PPPK':
        return [
          { id: 'dashboard-pppk', label: '1. Dashboard Kinerja Saya', icon: 'bi-speedometer2', color: 'bg-blue-600' },
          { id: 'penetapan-penilai', label: '2. Tim Penilai Saya', icon: 'bi-person-badge-fill', color: 'bg-indigo-600' },
          { id: 'penilaian-hasil-kerja', label: '3. RHK & Bukti Dukung', icon: 'bi-bullseye', color: 'bg-cyan-700' },
          { id: 'penilaian-perilaku', label: '4. Tinjau Perilaku', icon: 'bi-ui-checks-grid', color: 'bg-purple-700' },
          { id: 'penilaian-kehadiran', label: '5. Kehadiran Saya', icon: 'bi-fingerprint', color: 'bg-emerald-700' },
          { id: 'hasil-penilaian', label: '6. Predikat Kinerja Saya', icon: 'bi-graph-up-arrow', color: 'bg-teal-700' },
          { id: 'finalisasi', label: '7. Status Pengesahan', icon: 'bi-shield-lock-fill', color: 'bg-amber-600' },
          { id: 'riwayat-penilaian', label: '8. Riwayat Kinerja', icon: 'bi-clock-history', color: 'bg-slate-800' },
          { id: 'laporan', label: '9. Dokumen Resmi Saya', icon: 'bi-printer-fill', color: 'bg-rose-700' }
        ];
      case 'PNS_PENILAI':
      case 'PPPK_PENILAI':
      case 'REKAN_PNS':
      case 'REKAN_PPPK':
        return [
          { id: 'dashboard-pppk', label: '1. Dashboard Tugas Penilaian', icon: 'bi-speedometer2', color: 'bg-blue-600' },
          { id: 'penilaian-perilaku', label: '2. Penilaian Perilaku Rekan (28 Butir)', icon: 'bi-ui-checks-grid', color: 'bg-purple-700' },
          { id: 'riwayat-penilaian', label: '3. Riwayat Penilaian Diberikan', icon: 'bi-clock-history', color: 'bg-slate-800' }
        ];
      default:
        return [
          { id: 'dashboard-pppk', label: '1. Dashboard', icon: 'bi-speedometer2', color: 'bg-blue-600' }
        ];
    }
  }, [activeRole]);

  // Validasi tab saat berpindah peran agar selalu berada pada submenu yang berhak diakses
  useEffect(() => {
    const isAllowed = availableTabs.some(t => t.id === activeTab);
    const isLegacyAllowed = activeRole === 'ADMIN' || isSimulationActive;
    if (!isAllowed && !isLegacyAllowed) {
      setActiveTab('dashboard-pppk');
    }
  }, [availableTabs, activeTab, activeRole, isSimulationActive]);

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

  // Enterprise Helpers & Navigation
  const refreshEnterpriseData = useCallback(() => {
    setAssignments(getPenugasanPenilaiList());
    setEnterprisePeriods(getMasterPeriodePenilaian());
    setAllEmployees(getAllEmployees());
    reloadData();
  }, [reloadData]);

  const handleNavigateEnterpriseTab = (tabKey: string, assignmentId?: string) => {
    if (assignmentId) {
      setSelectedAssignmentId(assignmentId);
    }
    setActiveTab(tabKey as any);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-5">
        
        {/* Superadmin Mode Uji Coba (Simulator) Banner & Bar */}
        {isSimulationActive ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-amber-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                  <i className="bi bi-shield-exclamation text-slate-950 text-xl"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg">
                      Otoritas Superadmin
                    </span>
                    <h3 className="font-black text-sm text-slate-950">Mode Uji Coba Hak Akses (Simulator 5 Peran) Aktif</h3>
                  </div>
                  <p className="text-xs text-slate-950 font-semibold mt-0.5">
                    Anda bebas berganti peran (Admin, Penilai, Subjek PPPK, Rekan PNS/PPPK) dan memilih akun pegawai untuk pengujian sistem.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulationMode(false)}
                className="self-start sm:self-center px-3.5 py-2 bg-slate-950 text-amber-300 hover:bg-slate-900 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm shrink-0 border border-amber-400/30"
              >
                <i className="bi bi-box-arrow-left"></i>
                <span>Tutup Uji Coba (Mode Asli)</span>
              </button>
            </div>

            {/* Enterprise Simulator Bar */}
            <RoleAndPeriodSelectorBar
              activeRole={simRole}
              onChangeRole={(r) => {
                setSimRole(r);
                const emps = getAllEmployees();
                if (r === 'PPPK' || r === 'PPPK_DINILAI') {
                  const pppkEmp = emps.find(e => (e.jenisPegawai?.toUpperCase() === 'PPPK' || e.status?.toUpperCase() === 'PPPK')) || emps[0];
                  setSimPegawai(pppkEmp);
                } else if (r === 'PEJABAT_PENILAI') {
                  const penilaiEmp = emps.find(e => (e.jenisPegawai?.toUpperCase() === 'PNS' || e.status?.toUpperCase() === 'PNS' || e.status?.toUpperCase() === 'PNS/ASN')) || emps[1] || emps[0];
                  setSimPegawai(penilaiEmp);
                } else if (r === 'REKAN_PNS' || r === 'PNS_PENILAI') {
                  const pnsEmp = emps.find(e => (e.jenisPegawai?.toUpperCase() === 'PNS' || e.status?.toUpperCase() === 'PNS')) || emps[2] || emps[0];
                  setSimPegawai(pnsEmp);
                } else if (r === 'REKAN_PPPK' || r === 'PPPK_PENILAI') {
                  const pppkPeer = emps.filter(e => (e.jenisPegawai?.toUpperCase() === 'PPPK' || e.status?.toUpperCase() === 'PPPK'))[1] || emps[0];
                  setSimPegawai(pppkPeer);
                }
              }}
              activePegawai={simPegawai}
              onChangePegawai={(p) => setSimPegawai(p)}
              allEmployees={allEmployees}
              periods={enterprisePeriods}
              selectedPeriodId={selectedPeriodId}
              onChangePeriod={(pid) => setSelectedPeriodId(pid)}
              assignmentsCount={assignments.length}
              pendingApprovalCount={assignments.filter(a => a.status === 'MENUNGGU_VERIFIKASI').length}
              inProgressCount={assignments.filter(a => a.status === 'DALAM_PENILAIAN').length}
              finalCount={assignments.filter(a => a.status === 'FINAL').length}
            />
          </div>
        ) : (
          /* Modul Sesungguhnya: Header Peran Resmi Otentik (Non-Simulator) */
          <PPPKRealRoleHeader
            activeRole={activeRole}
            activePegawai={activePegawai}
            realRoles={realRoles}
            onSelectRealRole={(r) => setRealSelectedRole(r)}
            periods={enterprisePeriods}
            selectedPeriodId={selectedPeriodId}
            onChangePeriod={(pid) => setSelectedPeriodId(pid)}
            isUserSuperadmin={isUserSuperadmin}
            isSimulationMode={isSimulationMode}
            onToggleSimulationMode={() => setIsSimulationMode(!isSimulationMode)}
            assignmentsCount={assignments.length}
            pendingApprovalCount={assignments.filter(a => a.status === 'MENUNGGU_VERIFIKASI').length}
            inProgressCount={assignments.filter(a => a.status === 'DALAM_PENILAIAN').length}
            finalCount={assignments.filter(a => a.status === 'FINAL').length}
          />
        )}

        {/* 10-Submenu Tab Navigation Bar (Sesuai Hak Akses Peran) */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
            {availableTabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? `${tab.color} text-white shadow-sm ring-2 ring-blue-500/20`
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <i className={`bi ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Actions & Extra Modules dropdown */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setIsExtraMenuOpen(!isExtraMenuOpen)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 border border-slate-200 transition-all"
            >
              <i className="bi bi-grid-fill text-slate-500"></i>
              <span>Modul Tambahan</span>
              <i className={`bi bi-chevron-${isExtraMenuOpen ? 'up' : 'down'} text-[10px]`}></i>
            </button>

            {isExtraMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 animate-fade-in">
                <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Modul Teknis Lainnya
                </div>
                <button
                  onClick={() => { setActiveTab('penilaian-saya'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                >
                  <i className="bi bi-file-earmark-person text-indigo-500"></i> Penilaian Kinerja Saya (Self)
                </button>
                <button
                  onClick={() => { setActiveTab('skp'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-2"
                >
                  <i className="bi bi-bullseye text-cyan-500"></i> Manajer SKP Manual
                </button>
                <button
                  onClick={() => { setActiveTab('ketua-tim'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2"
                >
                  <i className="bi bi-diagram-3 text-indigo-500"></i> Manajer Ketua Tim Kerja
                </button>
                <button
                  onClick={() => { setActiveTab('bulk-absensi'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2"
                >
                  <i className="bi bi-clock-history text-emerald-500"></i> Bulk Absensi (Legacy)
                </button>
                <button
                  onClick={() => { setActiveTab('rekan-kerja'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2"
                >
                  <i className="bi bi-people text-purple-500"></i> Rekan Kerja PNS & PPPK (Legacy)
                </button>
                <button
                  onClick={() => { setActiveTab('verifikasi-rekan'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <i className="bi bi-person-check text-blue-500"></i> Verifikasi Rekan Kerja
                </button>
                <button
                  onClick={() => { setActiveTab('daftar'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <i className="bi bi-card-checklist text-blue-500"></i> Tabel Evaluasi Klasik
                </button>
                <button
                  onClick={() => { setActiveTab('rekap'); setIsExtraMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2"
                >
                  <i className="bi bi-calendar2-range text-blue-500"></i> Rekap Tahunan Klasik
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content Display - 10 Enterprise Submenus */}
        {activeTab === 'dashboard-pppk' && (
          <PPPKEnterpriseDashboardTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            onNavigateTab={handleNavigateEnterpriseTab}
          />
        )}

        {activeTab === 'penetapan-penilai' && (
          <PPPKPenetapanPenilaiTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            onNavigateToNext={(penugasanId) => handleNavigateEnterpriseTab('penilaian-hasil-kerja', penugasanId)}
            onRefreshAll={refreshEnterpriseData}
          />
        )}

        {activeTab === 'penilaian-hasil-kerja' && (
          <PPPKPenilaianHasilKerjaTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            preselectedAssignmentId={selectedAssignmentId}
            onNavigateNext={(penugasanId) => handleNavigateEnterpriseTab('penilaian-perilaku', penugasanId)}
          />
        )}

        {activeTab === 'penilaian-perilaku' && (
          <PPPKPenilaianPerilakuTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            preselectedAssignmentId={selectedAssignmentId}
            onNavigateNext={(penugasanId) => handleNavigateEnterpriseTab('penilaian-kehadiran', penugasanId)}
          />
        )}

        {activeTab === 'penilaian-kehadiran' && (
          <PPPKPenilaianKehadiranTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            onDataUpdated={refreshEnterpriseData}
            onRefreshData={refreshEnterpriseData}
            onRefreshAll={refreshEnterpriseData}
            showToast={showToast}
          />
        )}

        {activeTab === 'hasil-penilaian' && (
          <PPPKHasilPenilaianTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            preselectedAssignmentId={selectedAssignmentId}
            onNavigateToFinalisasi={(penugasanId) => handleNavigateEnterpriseTab('finalisasi', penugasanId)}
            onNavigateToReport={(penugasanId) => handleNavigateEnterpriseTab('laporan', penugasanId)}
          />
        )}

        {activeTab === 'finalisasi' && (
          <PPPKFinalisasiTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            preselectedAssignmentId={selectedAssignmentId}
            onFinalizedSuccess={(penugasanId) => handleNavigateEnterpriseTab('laporan', penugasanId)}
            onRefresh={refreshEnterpriseData}
          />
        )}

        {activeTab === 'riwayat-penilaian' && (
          <PPPKRiwayatPenilaianTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            onSelectPeriod={(pid) => setSelectedPeriodId(pid)}
            onNavigateDetail={(penugasanId) => handleNavigateEnterpriseTab('hasil-penilaian', penugasanId)}
            onNavigateReport={(penugasanId) => handleNavigateEnterpriseTab('laporan', penugasanId)}
          />
        )}

        {activeTab === 'laporan' && (
          <PPPKLaporanTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            selectedPeriodId={selectedPeriodId}
            preselectedAssignmentId={selectedAssignmentId}
            showToast={showToast}
            onRefreshAll={refreshEnterpriseData}
            onNavigateTab={handleNavigateEnterpriseTab}
          />
        )}

        {activeTab === 'pengaturan-periode' && (
          <PPPKPengaturanPeriodeTab
            activeRole={activeRole}
            activePegawai={activePegawai}
            periods={enterprisePeriods}
            onRefreshData={refreshEnterpriseData}
            onRefreshAll={refreshEnterpriseData}
            showToast={showToast}
          />
        )}

        {/* Tab Content Display - Legacy / Supplementary Managers */}
        {activeTab === 'penilaian-saya' && (
          <PPPKMyEvaluationView
            currentUser={{ nip: user?.nip, nama: user?.name, role: user?.role }}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'skp' && (
          <PPPKSkpManager
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={reloadData}
            showToast={showToast}
          />
        )}

        {activeTab === 'ketua-tim' && (
          <PPPKKetuaTimManager
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={reloadData}
            showToast={showToast}
          />
        )}

        {activeTab === 'bulk-absensi' && (
          <PPPKBulkAttendanceManager
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={reloadData}
            showToast={showToast}
          />
        )}

        {activeTab === 'rekan-kerja' && (
          <PPPKPeerAssignmentManager
            selectedYear={selectedYear}
            selectedSemester={selectedSemester}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onRefresh={reloadData}
            showToast={showToast}
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
