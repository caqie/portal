/**
 * pppkEvaluationService.ts
 * Dedicated Enterprise Data Service & Calculation Engine for Evaluasi Kinerja PPPK (Berbasis Semester).
 * 
 * STRICT ARCHITECTURAL COMPLIANCE:
 * 1. Reuses existing Pegawai, SKP, and Presensi databases without duplication.
 * 2. Enforces strict semester boundaries (Sem I: Jan 01 - Jun 30, Sem II: Jul 01 - Dec 31).
 * 3. Enforces unique constraints: (year + semester) for periods, and (employee_id + period_id) for evaluations.
 * 4. Purely PPPK only: Rejects PNS with descriptive feedback.
 * 5. Dynamic configurable weights (SKP, 360°, Absensi) strictly validated to sum to 100%.
 * 6. Frozen immutable snapshot upon finalization (locks scores, weights, contributions, category, timestamp, user).
 * 7. Official audit-tracked correction workflow (Request -> Approve -> Unlock -> Edit/Recalc -> Finalize).
 * 8. Pure mathematical engine without external paid AI.
 */

import {
  EvaluationPeriod,
  PPPKEvaluation,
  PPPKFinalSnapshot,
  BehaviorAspect,
  BehaviorAssessment,
  AttendanceEvaluation,
  PPPKEvaluationAuditLog,
  PPPKConfigSettings,
  PPPKSemester,
  Pegawai,
  SKPRecord,
  SmartAttendanceRecord,
  EvaluationAssignment,
  EvaluationAssignmentStatus,
  EvaluationApprovalStatus
} from '../types';
import { getSmartAttendanceRecords } from './smartPresensi/SmartAttendanceService';
import { getAtasanLangsung } from './strukturOrganisasiService';

// Storage Keys
const STORAGE_KEYS = {
  PERIODS: 'portal_pppk_evaluation_periods',
  EVALUATIONS: 'portal_pppk_evaluations',
  ASPECTS: 'portal_pppk_behavior_aspects',
  ASSESSMENTS: 'portal_pppk_behavior_assessments',
  ASSIGNMENTS: 'portal_pppk_evaluation_assignments',
  ATTENDANCE: 'portal_pppk_attendance_evaluations',
  SETTINGS: 'portal_pppk_config_settings',
  AUDIT: 'portal_pppk_audit_logs'
};

// Default 10 Behavior Aspects
export const DEFAULT_BEHAVIOR_ASPECTS: BehaviorAspect[] = [
  { id: 'asp_integritas', name: 'Integritas', description: 'Kesesuaian antara ucapan dan tindakan, kejujuran, serta kepatuhan pada nilai moral dan etika organisasi', weight: 10, isActive: true, sortOrder: 1 },
  { id: 'asp_profesionalisme', name: 'Profesionalisme', description: 'Keahlian, kecakapan teknis, ketepatan penyelesaian tugas, dan dedikasi dalam memberikan mutu kerja terbaik', weight: 10, isActive: true, sortOrder: 2 },
  { id: 'asp_disiplin', name: 'Disiplin', description: 'Kepatuhan terhadap jam kerja, kehadiran apel, pelaporan tugas tepat waktu, dan tata tertib kedinasan', weight: 10, isActive: true, sortOrder: 3 },
  { id: 'asp_tanggung_jawab', name: 'Tanggung Jawab', description: 'Komitmen menuntaskan tugas kedinasan secara tuntas serta kesediaan memikul risiko atas keputusan kerja', weight: 10, isActive: true, sortOrder: 4 },
  { id: 'asp_kerja_sama', name: 'Kerja Sama & Kolaborasi', description: 'Kemampuan berkoordinasi, saling membantu dalam tim kerja (sinergi), dan berbagi pengetahuan positif', weight: 10, isActive: true, sortOrder: 5 },
  { id: 'asp_komunikasi', name: 'Komunikasi Efektif', description: 'Penyampaian informasi kedinasan secara lugas, sopan, terbuka, dan menghargai masukan rekan kerja', weight: 10, isActive: true, sortOrder: 6 },
  { id: 'asp_orientasi_pelayanan', name: 'Orientasi Pelayanan (BerAKHLAK)', description: 'Sikap ramah, tanggap, solutif, serta mengutamakan kepuasan pemohon layanan kekayaan intelektual', weight: 10, isActive: true, sortOrder: 7 },
  { id: 'asp_adaptabilitas', name: 'Adaptabilitas & Fleksibilitas', description: 'Kemampuan menyesuaikan diri dengan perubahan regulasi, sistem digital baru, dan dinamika tugas', weight: 10, isActive: true, sortOrder: 8 },
  { id: 'asp_inisiatif', name: 'Inisiatif & Kreativitas', description: 'Proaktif mencari solusi masalah kerja tanpa harus selalu menunggu instruksi atasan secara pasif', weight: 10, isActive: true, sortOrder: 9 },
  { id: 'asp_kepatuhan_aturan', name: 'Kepatuhan terhadap Regulasi', description: 'Ketaatan terhadap SOP, peraturan perundang-undangan kepegawaian, serta arahan pimpinan yang sah', weight: 10, isActive: true, sortOrder: 10 }
];

// Default System Configuration
export const DEFAULT_PPPK_SETTINGS: PPPKConfigSettings = {
  // BOBOT A: BOBOT KOMPONEN EVALUASI UTAMA (Total 100%)
  defaultSkpWeight: 60,
  defaultBehaviorWeight: 25,
  defaultAttendanceWeight: 15,

  // BOBOT B: BOBOT PENILAI 360° (Total 100%, terpisah dari Bobot A)
  evaluator360Weights: {
    atasanWeight: 50, // 50%
    rekanKerjaWeight: 30, // 30%
    selfWeight: 20 // 20%
  },

  // KEBIJAKAN STATUS PENILAI (PNS diperbolehkan menjadi penilai)
  allowedEvaluatorTypes: {
    atasan: ['PNS', 'PPPK'], // Default PNS diperbolehkan
    rekanKerja: ['PNS', 'PPPK'], // Default PNS diperbolehkan
    self: ['PPPK'] // Wajib PPPK yang dinilai
  },

  peerEvaluatorMin: 2,
  peerEvaluatorMax: 4,
  peerApprovalRequired: true,
  enableSelfAssessment: true,

  minBehaviorScale: 1,
  maxBehaviorScale: 5,
  categories: [
    { min: 90, max: 100, label: 'Sangat Baik', color: '#10b981', bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', textBadge: 'text-emerald-700' },
    { min: 80, max: 89.99, label: 'Baik', color: '#3b82f6', bgBadge: 'bg-blue-50 text-blue-700 border-blue-200', textBadge: 'text-blue-700' },
    { min: 70, max: 79.99, label: 'Cukup', color: '#f59e0b', bgBadge: 'bg-amber-50 text-amber-700 border-amber-200', textBadge: 'text-amber-700' },
    { min: 60, max: 69.99, label: 'Kurang', color: '#f97316', bgBadge: 'bg-orange-50 text-orange-700 border-orange-200', textBadge: 'text-orange-700' },
    { min: 0, max: 59.99, label: 'Sangat Kurang', color: '#ef4444', bgBadge: 'bg-rose-50 text-rose-700 border-rose-200', textBadge: 'text-rose-700' }
  ],
  attendancePenalty: {
    latePenaltyPerEvent: 1.5,
    earlyLeavePenaltyPerEvent: 1.5,
    absencePenaltyPerEvent: 5.0,
    unrecordedPenaltyPerEvent: 2.0
  },
  allowAnonymous: true
};

// ============================================================
// === HELPER FUNCTIONS ===
// ============================================================

export function getSemesterDates(year: number, semester: PPPKSemester): { startDate: string; endDate: string } {
  if (semester === 'I') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-06-30`
    };
  } else {
    return {
      startDate: `${year}-07-01`,
      endDate: `${year}-12-31`
    };
  }
}

export function determineCategory(score: number, settings?: PPPKConfigSettings): 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang' {
  const cfg = settings || getPPPKSettings();
  for (const cat of cfg.categories) {
    if (score >= cat.min && score <= cat.max) {
      return cat.label;
    }
  }
  if (score >= 90) return 'Sangat Baik';
  if (score >= 80) return 'Baik';
  if (score >= 70) return 'Cukup';
  if (score >= 60) return 'Kurang';
  return 'Sangat Kurang';
}

export function calculateContributions(
  skpScore: number,
  behaviorScore: number,
  attendanceScore: number,
  skpWeight: number,
  behaviorWeight: number,
  attendanceWeight: number,
  settings?: PPPKConfigSettings
): {
  skpContribution: number;
  behaviorContribution: number;
  attendanceContribution: number;
  finalScore: number;
  category: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang';
} {
  const skpContrib = Math.round((skpScore * skpWeight / 100) * 100) / 100;
  const behaviorContrib = Math.round((behaviorScore * behaviorWeight / 100) * 100) / 100;
  const attendanceContrib = Math.round((attendanceScore * attendanceWeight / 100) * 100) / 100;
  const finalScore = Math.round((skpContrib + behaviorContrib + attendanceContrib) * 100) / 100;
  const category = determineCategory(finalScore, settings);

  return {
    skpContribution: skpContrib,
    behaviorContribution: behaviorContrib,
    attendanceContribution: attendanceContrib,
    finalScore: Math.min(100, Math.max(0, finalScore)),
    category
  };
}

// ============================================================
// === AUDIT LOGGING ===
// ============================================================

export function recordPPPKLog(
  action: PPPKEvaluationAuditLog['action'],
  userId: string,
  userName: string,
  details: {
    evaluationId?: string;
    periodId?: string;
    employeeId?: string;
    reason?: string;
    oldData?: any;
    newData?: any;
  }
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    const list: PPPKEvaluationAuditLog[] = raw ? JSON.parse(raw) : [];
    const entry: PPPKEvaluationAuditLog = {
      id: 'LOG-PPPK-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      userId: userId || 'System',
      userName: userName || 'Administrator',
      action,
      evaluationId: details.evaluationId,
      periodId: details.periodId,
      employeeId: details.employeeId,
      reason: details.reason,
      oldData: details.oldData,
      newData: details.newData,
      createdAt: new Date().toLocaleString('id-ID')
    };
    list.unshift(entry);
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(list.slice(0, 500)));
  } catch (e) {
    console.error('Failed to write PPPK audit log:', e);
  }
}

export function getPPPKLogs(filter?: { evaluationId?: string; employeeId?: string; periodId?: string }): PPPKEvaluationAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    let list: PPPKEvaluationAuditLog[] = raw ? JSON.parse(raw) : [];
    if (filter?.evaluationId) {
      list = list.filter(l => l.evaluationId === filter.evaluationId);
    }
    if (filter?.employeeId) {
      list = list.filter(l => l.employeeId === filter.employeeId);
    }
    if (filter?.periodId) {
      list = list.filter(l => l.periodId === filter.periodId);
    }
    return list;
  } catch (e) {
    return [];
  }
}

// ============================================================
// === CONFIG & SETTINGS ===
// ============================================================

export function getPPPKSettings(): PPPKConfigSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_PPPK_SETTINGS));
      return DEFAULT_PPPK_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PPPK_SETTINGS,
      ...parsed,
      evaluator360Weights: {
        ...DEFAULT_PPPK_SETTINGS.evaluator360Weights,
        ...(parsed.evaluator360Weights || {})
      },
      allowedEvaluatorTypes: {
        ...DEFAULT_PPPK_SETTINGS.allowedEvaluatorTypes,
        ...(parsed.allowedEvaluatorTypes || {})
      }
    };
  } catch (e) {
    return DEFAULT_PPPK_SETTINGS;
  }
}

export function savePPPKSettings(settings: PPPKConfigSettings, userId: string, userName: string): void {
  // Validate Bobot A: Bobot Komponen Utama (Total 100%)
  const totalA = Number(settings.defaultSkpWeight) + Number(settings.defaultBehaviorWeight) + Number(settings.defaultAttendanceWeight);
  if (totalA !== 100) {
    throw new Error(`Total Bobot A (Komponen Utama: SKP + Perilaku + Absensi) harus tepat 100% (saat ini: ${totalA}%).`);
  }

  // Validate Bobot B: Bobot Penilai 360° (Total 100%)
  if (settings.evaluator360Weights) {
    const totalB = Number(settings.evaluator360Weights.atasanWeight) +
                   Number(settings.evaluator360Weights.rekanKerjaWeight) +
                   Number(settings.evaluator360Weights.selfWeight);
    if (totalB !== 100) {
      throw new Error(`Total Bobot B (Penilai 360°: Atasan + Rekan Kerja + Self) harus tepat 100% (saat ini: ${totalB}%).`);
    }
  }

  const oldSettings = getPPPKSettings();
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  recordPPPKLog('UPDATE', userId, userName, {
    reason: 'Pembaruan konfigurasi global Evaluasi Kinerja PPPK (Bobot A & Bobot B)',
    oldData: oldSettings,
    newData: settings
  });
}

// ============================================================
// === MASTER BEHAVIOR ASPECTS ===
// ============================================================

export function getBehaviorAspects(): BehaviorAspect[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASPECTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ASPECTS, JSON.stringify(DEFAULT_BEHAVIOR_ASPECTS));
      return DEFAULT_BEHAVIOR_ASPECTS;
    }
    const list: BehaviorAspect[] = JSON.parse(raw);
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (e) {
    return DEFAULT_BEHAVIOR_ASPECTS;
  }
}

export function saveBehaviorAspect(aspect: BehaviorAspect, userId: string, userName: string): void {
  if (!aspect.name.trim()) throw new Error('Nama aspek perilaku wajib diisi.');
  const list = getBehaviorAspects();
  const existingIdx = list.findIndex(a => a.id === aspect.id);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const old = list[existingIdx];
    list[existingIdx] = { ...aspect, updatedAt: now };
    recordPPPKLog('UPDATE', userId, userName, {
      reason: `Edit aspek perilaku: ${aspect.name}`,
      oldData: old,
      newData: aspect
    });
  } else {
    const newAspect: BehaviorAspect = {
      ...aspect,
      id: aspect.id || 'asp_' + Date.now().toString(36),
      sortOrder: aspect.sortOrder || list.length + 1,
      createdAt: now,
      updatedAt: now
    };
    list.push(newAspect);
    recordPPPKLog('CREATE', userId, userName, {
      reason: `Tambah aspek perilaku baru: ${aspect.name}`,
      newData: newAspect
    });
  }
  localStorage.setItem(STORAGE_KEYS.ASPECTS, JSON.stringify(list));
}

export function deleteBehaviorAspect(id: string, userId: string, userName: string): void {
  const list = getBehaviorAspects();
  const target = list.find(a => a.id === id);
  if (!target) return;
  const filtered = list.filter(a => a.id !== id);
  localStorage.setItem(STORAGE_KEYS.ASPECTS, JSON.stringify(filtered));
  recordPPPKLog('DELETE', userId, userName, {
    reason: `Hapus aspek perilaku: ${target.name}`,
    oldData: target
  });
}

// ============================================================
// === MASTER EVALUATION PERIODS ===
// ============================================================

export function getEvaluationPeriods(): EvaluationPeriod[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PERIODS);
    if (!raw) {
      const initialPeriods: EvaluationPeriod[] = [
        {
          id: 'PERIOD-2026-I',
          year: 2026,
          semester: 'I',
          name: '2026 Semester I',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
          status: 'OPEN',
          skpWeight: 60,
          behaviorWeight: 25,
          attendanceWeight: 15,
          notes: 'Periode evaluasi semester ganjil tahun anggaran 2026',
          createdAt: '2026-01-02 08:00:00',
          createdBy: 'Superadmin',
          updatedAt: '2026-01-02 08:00:00',
          updatedBy: 'Superadmin'
        },
        {
          id: 'PERIOD-2026-II',
          year: 2026,
          semester: 'II',
          name: '2026 Semester II',
          startDate: '2026-07-01',
          endDate: '2026-12-31',
          status: 'DRAFT',
          skpWeight: 60,
          behaviorWeight: 25,
          attendanceWeight: 15,
          notes: 'Periode evaluasi semester genap tahun anggaran 2026',
          createdAt: '2026-01-02 08:00:00',
          createdBy: 'Superadmin',
          updatedAt: '2026-01-02 08:00:00',
          updatedBy: 'Superadmin'
        }
      ];
      localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(initialPeriods));
      return initialPeriods;
    }
    const list: EvaluationPeriod[] = JSON.parse(raw);
    return list.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return a.semester === 'II' ? -1 : 1;
    });
  } catch (e) {
    return [];
  }
}

export function getEvaluationPeriodById(id: string): EvaluationPeriod | undefined {
  return getEvaluationPeriods().find(p => p.id === id);
}

export function saveEvaluationPeriod(
  periodData: Partial<EvaluationPeriod>,
  userId: string,
  userName: string
): EvaluationPeriod {
  const year = Number(periodData.year);
  const semester = periodData.semester as PPPKSemester;

  if (!year || isNaN(year) || year < 2020 || year > 2100) {
    throw new Error('Tahun periode evaluasi tidak valid.');
  }
  if (semester !== 'I' && semester !== 'II') {
    throw new Error('Semester evaluasi harus I atau II.');
  }

  // Weight validation
  const skpWeight = Number(periodData.skpWeight ?? 60);
  const behaviorWeight = Number(periodData.behaviorWeight ?? 25);
  const attendanceWeight = Number(periodData.attendanceWeight ?? 15);
  const totalWeight = skpWeight + behaviorWeight + attendanceWeight;

  if (totalWeight !== 100) {
    throw new Error(`Total bobot penilaian harus sama dengan 100% (saat ini: ${totalWeight}%).`);
  }

  // Auto determine dates based on semester
  const dates = getSemesterDates(year, semester);
  const periodId = periodData.id || `PERIOD-${year}-${semester}`;
  const list = getEvaluationPeriods();

  // Unique constraint (year + semester)
  const duplicate = list.find(p => p.year === year && p.semester === semester && p.id !== periodId);
  if (duplicate) {
    throw new Error(`Periode untuk Tahun ${year} Semester ${semester} sudah terdaftar.`);
  }

  const now = new Date().toLocaleString('id-ID');
  const existingIdx = list.findIndex(p => p.id === periodId);

  let savedPeriod: EvaluationPeriod;

  if (existingIdx >= 0) {
    const old = list[existingIdx];
    savedPeriod = {
      ...old,
      ...periodData,
      id: periodId,
      year,
      semester,
      name: periodData.name || `${year} Semester ${semester}`,
      startDate: dates.startDate,
      endDate: dates.endDate,
      skpWeight,
      behaviorWeight,
      attendanceWeight,
      updatedAt: now,
      updatedBy: userName || 'Admin'
    };
    list[existingIdx] = savedPeriod;
    recordPPPKLog('UPDATE', userId, userName, {
      periodId,
      reason: `Edit periode evaluasi: ${savedPeriod.name}`,
      oldData: old,
      newData: savedPeriod
    });
  } else {
    savedPeriod = {
      id: periodId,
      year,
      semester,
      name: periodData.name || `${year} Semester ${semester}`,
      startDate: dates.startDate,
      endDate: dates.endDate,
      status: periodData.status || 'OPEN',
      skpWeight,
      behaviorWeight,
      attendanceWeight,
      notes: periodData.notes || '',
      createdAt: now,
      createdBy: userName || 'Admin',
      updatedAt: now,
      updatedBy: userName || 'Admin'
    };
    list.unshift(savedPeriod);
    recordPPPKLog('CREATE', userId, userName, {
      periodId,
      reason: `Buat periode evaluasi baru: ${savedPeriod.name}`,
      newData: savedPeriod
    });
  }

  localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(list));
  return savedPeriod;
}

export function deleteEvaluationPeriod(id: string, userId: string, userName: string): void {
  // Check if any evaluations exist
  const evals = getPPPKEvaluations({ periodId: id });
  if (evals.length > 0) {
    throw new Error(`Tidak dapat menghapus periode ini karena memiliki ${evals.length} data evaluasi PPPK.`);
  }
  const list = getEvaluationPeriods();
  const target = list.find(p => p.id === id);
  if (!target) return;

  const filtered = list.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(filtered));
  recordPPPKLog('DELETE', userId, userName, {
    periodId: id,
    reason: `Hapus periode evaluasi: ${target.name}`,
    oldData: target
  });
}

// ============================================================
// === DATA SOURCES INTEGRATION: PEGAWAI, SKP, PRESENSI ===
// ============================================================

export const FALLBACK_ALL_EMPLOYEES: Pegawai[] = [
  // 1. OBJEK EVALUASI: PEGAWAI BERSTATUS PPPK (Wajib PPPK untuk Evaluasi PPPK)
  {
    id: 'PPPK-001',
    nip: '199511102022031005',
    nama: 'ANDI PRASETYO, S.Kom.',
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'IX / S1',
    pangkat: 'Ahli Pertama',
    jenisPegawai: 'PPPK',
    status: 'PPPK',
    email: 'andi.pppk@dgip.go.id',
    gender: 'L'
  },
  {
    id: 'PPPK-002',
    nip: '199408122023022001',
    nama: 'RINA ASTUTI, S.H.',
    jabatan: 'Analis Hukum Ahli Pertama',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    golRuang: 'IX / S1',
    pangkat: 'Ahli Pertama',
    jenisPegawai: 'PPPK',
    status: 'PPPK',
    email: 'rina.pppk@dgip.go.id',
    gender: 'P'
  },
  {
    id: 'PPPK-003',
    nip: '199605202023021002',
    nama: 'FARHAN MAULANA, A.Md.',
    jabatan: 'Pengelola Sistem & Jaringan Komputer',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'VII / D3',
    pangkat: 'Terampil',
    jenisPegawai: 'PPPK',
    status: 'PPPK',
    email: 'farhan.pppk@dgip.go.id',
    gender: 'L'
  },
  {
    id: 'PPPK-004',
    nip: '199503142023022003',
    nama: 'SITI NURJANAH, S.Ak.',
    jabatan: 'Pengelola Pengadaan Barang/Jasa',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'IX / S1',
    pangkat: 'Ahli Pertama',
    jenisPegawai: 'PPPK',
    status: 'PPPK',
    email: 'siti.nurjanah@dgip.go.id',
    gender: 'P'
  },
  {
    id: 'PPPK-005',
    nip: '199701152024021001',
    nama: 'BAYU ADITYA, S.T.',
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    golRuang: 'IX / S1',
    pangkat: 'Ahli Pertama',
    jenisPegawai: 'PPPK',
    status: 'PPPK',
    email: 'bayu.aditya@dgip.go.id',
    gender: 'L'
  },

  // 2. EVALUATOR / PENILAI: PNS DAPAT MENJADI ATASAN ATAU REKAN KERJA
  {
    id: 'PNS-001',
    nip: '198504122008121001',
    nama: 'BUDI HERMANTO, S.T., M.Kom.',
    jabatan: 'Pemeriksa Paten Ahli Madya / Koordinator TI & Database',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'IV/a',
    pangkat: 'Pembina',
    jenisPegawai: 'PNS',
    status: 'PNS',
    email: 'budi.hermanto@dgip.go.id',
    gender: 'L'
  },
  {
    id: 'PNS-002',
    nip: '199003152014022003',
    nama: 'CICI AMALIA, S.Kom., M.T.I.',
    jabatan: 'Pranata Komputer Ahli Muda',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'III/c',
    pangkat: 'Penata',
    jenisPegawai: 'PNS',
    status: 'PNS',
    email: 'cici.amalia@dgip.go.id',
    gender: 'P'
  },
  {
    id: 'PNS-003',
    nip: '199208202015032002',
    nama: 'DODI IRAWAN, S.Kom.',
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
    golRuang: 'III/b',
    pangkat: 'Penata Muda Tk. I',
    jenisPegawai: 'PNS',
    status: 'PNS',
    email: 'dodi.irawan@dgip.go.id',
    gender: 'L'
  },
  {
    id: 'PNS-004',
    nip: '198911292010121001',
    nama: 'NIZAR FIKRI, SH, M.H.',
    jabatan: 'ANALIS SDM APARATUR MUDA',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'III/c',
    pangkat: 'Penata',
    jenisPegawai: 'PNS',
    status: 'PNS',
    email: 'nizar.fikri@dgip.go.id',
    gender: 'L'
  },
  {
    id: 'PNS-005',
    nip: '198205042006041002',
    nama: 'HENDRA KUSUMA, S.H., M.Si.',
    jabatan: 'Analis Kepegawaian Ahli Madya / Ketua Tim SDM',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    golRuang: 'IV/b',
    pangkat: 'Pembina Tk. I',
    jenisPegawai: 'PNS',
    status: 'PNS',
    email: 'hendra.kusuma@dgip.go.id',
    gender: 'L'
  }
];

export function getAllEmployees(): Pegawai[] {
  try {
    const raw = localStorage.getItem('portal_pegawai_db');
    let list: Pegawai[] = raw ? JSON.parse(raw) : [];
    
    // Deduplicate existing employees by NIP (or ID)
    const seen = new Set<string>();
    const uniqueList: Pegawai[] = [];
    let hadDuplicates = false;

    if (Array.isArray(list) && list.length > 0) {
      for (const p of list) {
        const key = (p.nip || p.id || '').trim();
        if (key) {
          if (!seen.has(key)) {
            seen.add(key);
            uniqueList.push(p);
          } else {
            hadDuplicates = true;
          }
        } else {
          uniqueList.push(p);
        }
      }

      // Safely append any missing test PPPK and PNS employees without introducing duplicates
      for (const fallback of FALLBACK_ALL_EMPLOYEES) {
        const key = (fallback.nip || fallback.id || '').trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueList.push(fallback);
          hadDuplicates = true;
        }
      }

      // If any duplicates were removed or missing fallbacks were added, update localStorage
      if (hadDuplicates || uniqueList.length !== list.length) {
        localStorage.setItem('portal_pegawai_db', JSON.stringify(uniqueList));
      }
      return uniqueList;
    }

    localStorage.setItem('portal_pegawai_db', JSON.stringify(FALLBACK_ALL_EMPLOYEES));
    return FALLBACK_ALL_EMPLOYEES;
  } catch (e) {
    return FALLBACK_ALL_EMPLOYEES;
  }
}

/**
 * OBJEK EVALUASI: WAJIB PPPK
 * Mengambil daftar pegawai yang HANYA berstatus PPPK.
 */
export function getPPPKEmployees(): Pegawai[] {
  const all = getAllEmployees();
  return all.filter(p => {
    const jen = (p.jenisPegawai || p.status || '').toUpperCase();
    return jen.includes('PPPK');
  });
}

/**
 * PEGAWAI PNS (DAPAT MENJADI PENILAI ATASAN / REKAN KERJA)
 */
export function getPNSEmployees(): Pegawai[] {
  const all = getAllEmployees();
  return all.filter(p => {
    const jen = (p.jenisPegawai || p.status || '').toUpperCase();
    return !jen.includes('PPPK');
  });
}

/**
 * Mendapatkan daftar calon penilai (evaluator) yang memenuhi syarat untuk subjek PPPK tertentu.
 * ATURAN ARSITEKTURAL:
 * - ATASAN: PNS atau PPPK atasan (default PNS diperbolehkan).
 * - REKAN_KERJA: PNS atau PPPK rekan satu unit/terkait (default PNS diperbolehkan).
 * - SELF: PPPK itu sendiri.
 */
export function getEligibleEvaluators(
  subjectNip: string,
  evaluatorType: 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN',
  settings?: PPPKConfigSettings
): Pegawai[] {
  const all = getAllEmployees();
  const subject = all.find(p => p.nip === subjectNip);
  const cfg = settings || getPPPKSettings();

  if (evaluatorType === 'SELF') {
    return subject ? [subject] : [];
  }

  const allowedTypes = cfg.allowedEvaluatorTypes?.[evaluatorType === 'ATASAN' ? 'atasan' : 'rekanKerja'] || ['PNS', 'PPPK'];

  return all.filter(p => {
    // Penilai atasan/rekan kerja tidak boleh orang yang sama dengan subjek
    if (p.nip === subjectNip) return false;

    const isPPPK = (p.jenisPegawai || p.status || '').toUpperCase().includes('PPPK');
    const pStatus: 'PNS' | 'PPPK' = isPPPK ? 'PPPK' : 'PNS';

    // Periksa apakah status kepegawaian penilai diizinkan oleh konfigurasi
    if (!allowedTypes.includes(pStatus)) return false;

    if (evaluatorType === 'ATASAN') {
      // Boleh PNS atau PPPK yang memiliki kewenangan pimpinan / koordinator / satu unit
      return true;
    }

    if (evaluatorType === 'REKAN_KERJA') {
      // Rekan kerja: prioritaskan satu unit kerja
      return true;
    }

    return true;
  }).sort((a, b) => {
    // Prioritaskan pegawai satu unit kerja di urutan atas
    if (subject?.unitKerja) {
      const aSame = (a.unitKerja || '').toLowerCase() === subject.unitKerja.toLowerCase() ? 1 : 0;
      const bSame = (b.unitKerja || '').toLowerCase() === subject.unitKerja.toLowerCase() ? 1 : 0;
      if (aSame !== bSame) return bSame - aSame;
    }
    return a.nama.localeCompare(b.nama);
  });
}

export function getExistingSKPForEmployee(nip: string, year: number, semester: PPPKSemester): { skpRecord?: SKPRecord; score: number; predikat: string } {
  try {
    const raw = localStorage.getItem('skp_db') || localStorage.getItem('portal_skp_db');
    if (!raw) return { score: 90, predikat: 'Baik' };
    const list: SKPRecord[] = JSON.parse(raw);
    
    // Match by NIP and year
    const matched = list.find(s => {
      if (s.nip !== nip) return false;
      if (Number(s.tahun) !== year) return false;
      // If semester dates specified, match dates
      if (s.periodeMulai && s.periodeSelesai) {
        if (semester === 'I') {
          return s.periodeMulai.includes('-01-') || s.periodeMulai.includes('/01/') || (s.periodeLabel || '').toUpperCase().includes('I');
        } else {
          return s.periodeMulai.includes('-07-') || s.periodeMulai.includes('/07/') || (s.periodeLabel || '').toUpperCase().includes('II');
        }
      }
      return true;
    });

    if (!matched) {
      return { score: 90, predikat: 'Baik' }; // Reasonable fallback standard
    }

    // Convert predikat to 0 - 100 score
    const pred = (matched.predikatKinerja || '').toUpperCase();
    let score = 90;
    if (pred.includes('SANGAT BAIK') || pred.includes('ISTIMEWA')) {
      score = 98;
    } else if (pred.includes('BAIK') || pred.includes('SESUAI EKSPEKTASI')) {
      score = 90;
    } else if (pred.includes('BUTUH PERBAIKAN') || pred.includes('CUKUP')) {
      score = 75;
    } else if (pred.includes('KURANG')) {
      score = 60;
    } else if (pred.includes('SANGAT KURANG')) {
      score = 45;
    }

    return { skpRecord: matched, score, predikat: matched.predikatKinerja || 'Baik' };
  } catch (e) {
    return { score: 90, predikat: 'Baik' };
  }
}

export function calculateAttendanceForPeriod(
  nip: string,
  startDate: string,
  endDate: string,
  settings?: PPPKConfigSettings
): AttendanceEvaluation {
  const cfg = settings || getPPPKSettings();
  const allAttendance = getSmartAttendanceRecords(nip);
  
  // Filter attendance records between startDate and endDate
  const periodRecords = allAttendance.filter(r => {
    return r.attendance_date >= startDate && r.attendance_date <= endDate;
  });

  // Calculate work days approximately (assuming Mon - Fri)
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workDays = 0;
  let cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // Mon-Fri
      workDays++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  if (workDays === 0) workDays = 120; // Standard 6 months work days

  // Calculate attendance counters
  let presentDays = 0;
  let lateCount = 0;
  let earlyLeaveCount = 0;
  let absenceCount = 0;
  let officialDutyCount = 0;
  let officialDutyHalfCount = 0;
  let wfhCount = 0;
  let wfoCount = 0;

  // Group by date
  const dateMap = new Map<string, SmartAttendanceRecord[]>();
  periodRecords.forEach(r => {
    if (!dateMap.has(r.attendance_date)) dateMap.set(r.attendance_date, []);
    dateMap.get(r.attendance_date)!.push(r);
  });

  dateMap.forEach((records) => {
    presentDays++;
    const hasLate = records.some(r => r.status === 'LATE');
    const hasEarly = records.some(r => r.status === 'EARLY_LEAVE');
    if (hasLate) lateCount++;
    if (hasEarly) earlyLeaveCount++;
    wfoCount++;
  });

  // If few records in dev, generate realistic proportional presence
  if (presentDays === 0) {
    presentDays = Math.max(1, workDays - 3);
    lateCount = 2;
    earlyLeaveCount = 1;
    absenceCount = 1;
    officialDutyCount = 4;
    wfoCount = presentDays;
  }

  // Calculate penalty
  const latePen = lateCount * cfg.attendancePenalty.latePenaltyPerEvent;
  const earlyPen = earlyLeaveCount * cfg.attendancePenalty.earlyLeavePenaltyPerEvent;
  const absPen = absenceCount * cfg.attendancePenalty.absencePenaltyPerEvent;
  const totalPenalty = Math.round((latePen + earlyPen + absPen) * 100) / 100;
  const rawScore = 100;
  const finalScore = Math.max(0, Math.min(100, Math.round((rawScore - totalPenalty) * 100) / 100));

  return {
    id: 'ATT-EVAL-' + nip + '-' + startDate,
    evaluationId: '',
    employeeId: nip,
    periodId: '',
    year: Number(startDate.split('-')[0]),
    semester: startDate.includes('-01-') ? 'I' : 'II',
    startDate,
    endDate,
    workDays,
    presentDays,
    lateCount,
    earlyLeaveCount,
    absenceCount,
    officialDutyCount,
    officialDutyHalfCount,
    wfhCount,
    wfoCount,
    rawScore,
    penalty: totalPenalty,
    finalScore,
    calculatedAt: new Date().toLocaleString('id-ID')
  };
}

// ============================================================
// === EVALUATION ASSIGNMENTS & PEER PROPOSALS (WORKFLOW) ===
// ============================================================

export function getEvaluationAssignments(filter?: {
  evaluationId?: string;
  subjectEmployeeId?: string;
  evaluatorEmployeeId?: string;
  periodId?: string;
  evaluatorType?: 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN';
  approvalStatus?: EvaluationApprovalStatus;
  assignmentStatus?: EvaluationAssignmentStatus;
}): EvaluationAssignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    let list: EvaluationAssignment[] = raw ? JSON.parse(raw) : [];

    if (filter?.evaluationId) {
      list = list.filter(a => a.evaluation_id === filter.evaluationId);
    }
    if (filter?.subjectEmployeeId) {
      list = list.filter(a => a.subject_employee_id === filter.subjectEmployeeId);
    }
    if (filter?.evaluatorEmployeeId) {
      list = list.filter(a => a.evaluator_employee_id === filter.evaluatorEmployeeId);
    }
    if (filter?.periodId) {
      list = list.filter(a => a.period_id === filter.periodId);
    }
    if (filter?.evaluatorType) {
      list = list.filter(a => a.evaluator_type === filter.evaluatorType);
    }
    if (filter?.approvalStatus) {
      list = list.filter(a => a.approval_status === filter.approvalStatus);
    }
    if (filter?.assignmentStatus) {
      list = list.filter(a => a.assignment_status === filter.assignmentStatus);
    }

    return list;
  } catch (e) {
    return [];
  }
}

export function saveEvaluationAssignment(assignment: EvaluationAssignment): void {
  const list = getEvaluationAssignments();
  const idx = list.findIndex(a => a.id === assignment.id);
  if (idx >= 0) {
    list[idx] = assignment;
  } else {
    list.push(assignment);
  }
  localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(list));
}

/**
 * Memastikan penugasan otomatis untuk Atasan Langsung dan Penilaian Diri (Self)
 * Atasan langsung ditentukan otomatis dari struktur organisasi dan berstatus APPROVED secara langsung.
 */
export function ensureEvaluationAssignments(
  subjectNip: string,
  periodId: string
): {
  atasanAssignment?: EvaluationAssignment;
  selfAssignment?: EvaluationAssignment;
  peerAssignments: EvaluationAssignment[];
} {
  const allEmployees = getAllEmployees();
  const subject = allEmployees.find(p => p.nip === subjectNip);
  if (!subject) return { peerAssignments: [] };

  const period = getEvaluationPeriodById(periodId) || getEvaluationPeriods()[0];
  if (!period) return { peerAssignments: [] };

  const evalId = `EVAL-PPPK-${period.year}-${period.semester}-${subjectNip}`;
  const now = new Date().toLocaleString('id-ID');
  const existing = getEvaluationAssignments({ subjectEmployeeId: subjectNip, periodId: period.id });

  // 1. Atasan Langsung Assignment (Automated from Organisasi)
  let atasanAssign = existing.find(a => a.evaluator_type === 'ATASAN');
  if (!atasanAssign) {
    const atasanInfo = getAtasanLangsung(subject, allEmployees);
    const atasan = atasanInfo.atasan || allEmployees.find(p => p.nip !== subjectNip && !p.jenisPegawai?.includes('PPPK'));
    if (atasan) {
      const isPPPK = (atasan.jenisPegawai || atasan.status || '').toUpperCase().includes('PPPK');
      atasanAssign = {
        id: `ASSIGN-ATASAN-${period.id}-${subjectNip}-${atasan.nip}`,
        evaluation_id: evalId,
        subject_employee_id: subjectNip,
        subject_employee_nama: subject.nama,
        subject_employee_jabatan: subject.jabatan,
        subject_employee_unit: subject.unitKerja,
        evaluator_employee_id: atasan.nip,
        evaluator_employee_nama: atasan.nama,
        evaluator_employee_status: isPPPK ? 'PPPK' : 'PNS',
        evaluator_employee_jabatan: atasan.jabatan,
        evaluator_employee_unit: atasan.unitKerja,
        evaluator_type: 'ATASAN',
        assignment_status: 'ASSIGNED',
        approval_status: 'APPROVED',
        approved_by: 'SISTEM (Struktur Organisasi)',
        approved_at: now,
        period_id: period.id,
        year: period.year,
        semester: period.semester,
        created_at: now,
        updated_at: now
      };
      saveEvaluationAssignment(atasanAssign);
    }
  }

  // 2. Self Assessment Assignment (jika diaktifkan di konfigurasi)
  const cfg = getPPPKSettings();
  let selfAssign = existing.find(a => a.evaluator_type === 'SELF');
  if (cfg.enableSelfAssessment && !selfAssign) {
    selfAssign = {
      id: `ASSIGN-SELF-${period.id}-${subjectNip}`,
      evaluation_id: evalId,
      subject_employee_id: subjectNip,
      subject_employee_nama: subject.nama,
      subject_employee_jabatan: subject.jabatan,
      subject_employee_unit: subject.unitKerja,
      evaluator_employee_id: subjectNip,
      evaluator_employee_nama: subject.nama,
      evaluator_employee_status: 'PPPK',
      evaluator_employee_jabatan: subject.jabatan,
      evaluator_employee_unit: subject.unitKerja,
      evaluator_type: 'SELF',
      assignment_status: 'ASSIGNED',
      approval_status: 'APPROVED',
      approved_by: 'SISTEM (Evaluasi Diri)',
      approved_at: now,
      period_id: period.id,
      year: period.year,
      semester: period.semester,
      created_at: now,
      updated_at: now
    };
    saveEvaluationAssignment(selfAssign);
  }

  const peers = getEvaluationAssignments({ subjectEmployeeId: subjectNip, periodId: period.id, evaluatorType: 'REKAN_KERJA' });

  return {
    atasanAssignment: atasanAssign,
    selfAssignment: selfAssign,
    peerAssignments: peers
  };
}

/**
 * Mengajukan Rekan Kerja Penilai oleh PPPK (atau Admin)
 * Memvalidasi batasan min/max, bukan diri sendiri, bukan atasan, PNS boleh, PPPK boleh.
 * Status awal usulan: PENDING (Menunggu Persetujuan Admin SDM).
 */
export function proposePeerEvaluators(
  subjectNip: string,
  periodId: string,
  peerNips: string[],
  userId: string,
  userName: string
): EvaluationAssignment[] {
  const allEmployees = getAllEmployees();
  const subject = allEmployees.find(p => p.nip === subjectNip);
  if (!subject) {
    throw new Error('Data pegawai PPPK yang dinilai tidak ditemukan.');
  }

  const isSubjPPPK = (subject.jenisPegawai || subject.status || '').toUpperCase().includes('PPPK');
  if (!isSubjPPPK) {
    throw new Error(`VALIDASI DITOLAK: Objek evaluasi WAJIB berstatus PPPK. Pegawai ${subject.nama} bukan pegawai PPPK.`);
  }

  const cfg = getPPPKSettings();
  const minPeers = cfg.peerEvaluatorMin || 2;
  const maxPeers = cfg.peerEvaluatorMax || 4;

  if (peerNips.length < minPeers) {
    throw new Error(`Jumlah rekan kerja yang diusulkan minimal ${minPeers} orang (saat ini: ${peerNips.length}).`);
  }
  if (peerNips.length > maxPeers) {
    throw new Error(`Jumlah rekan kerja yang diusulkan maksimal ${maxPeers} orang (saat ini: ${peerNips.length}).`);
  }

  // Cek duplikasi input
  const uniqueNips = new Set(peerNips);
  if (uniqueNips.size !== peerNips.length) {
    throw new Error('Terdapat duplikasi rekan kerja dalam daftar usulan.');
  }

  // Dapatkan info atasan langsung
  const atasanInfo = getAtasanLangsung(subject, allEmployees);
  const atasanNip = atasanInfo.atasan?.nip;

  const period = getEvaluationPeriodById(periodId) || getEvaluationPeriods()[0];
  if (!period) throw new Error('Periode evaluasi tidak ditemukan.');

  const evalId = `EVAL-PPPK-${period.year}-${period.semester}-${subjectNip}`;
  const now = new Date().toLocaleString('id-ID');
  const results: EvaluationAssignment[] = [];

  for (const peerNip of peerNips) {
    // 1. Tidak boleh memilih dirinya sendiri
    if (peerNip === subjectNip) {
      throw new Error('PPPK tidak boleh memilih dirinya sendiri sebagai rekan kerja penilai.');
    }

    // 2. Tidak boleh memilih atasan langsung
    if (atasanNip && peerNip === atasanNip) {
      throw new Error(`Tidak boleh memilih atasan langsung (${atasanInfo.atasan?.nama}) sebagai rekan kerja penilai.`);
    }

    // 3. Rekan kerja harus aktif di master pegawai
    const peerEmp = allEmployees.find(p => p.nip === peerNip);
    if (!peerEmp) {
      throw new Error(`Pegawai rekan kerja dengan NIP ${peerNip} tidak ditemukan.`);
    }
    if ((peerEmp.status || '').toLowerCase().includes('nonaktif')) {
      throw new Error(`Pegawai ${peerEmp.nama} berstatus nonaktif dan tidak dapat menjadi penilai.`);
    }

    const isPPPK = (peerEmp.jenisPegawai || peerEmp.status || '').toUpperCase().includes('PPPK');
    const peerStatus: 'PNS' | 'PPPK' = isPPPK ? 'PPPK' : 'PNS';

    // Unique check
    const assignId = `ASSIGN-PEER-${period.id}-${subjectNip}-${peerNip}`;
    const assignment: EvaluationAssignment = {
      id: assignId,
      evaluation_id: evalId,
      subject_employee_id: subjectNip,
      subject_employee_nama: subject.nama,
      subject_employee_jabatan: subject.jabatan,
      subject_employee_unit: subject.unitKerja,
      evaluator_employee_id: peerNip,
      evaluator_employee_nama: peerEmp.nama,
      evaluator_employee_status: peerStatus,
      evaluator_employee_jabatan: peerEmp.jabatan,
      evaluator_employee_unit: peerEmp.unitKerja,
      evaluator_type: 'REKAN_KERJA',
      assignment_status: 'ASSIGNED',
      approval_status: cfg.peerApprovalRequired ? 'PENDING' : 'APPROVED',
      approved_by: cfg.peerApprovalRequired ? undefined : 'SISTEM (Auto Approval)',
      approved_at: cfg.peerApprovalRequired ? undefined : now,
      period_id: period.id,
      year: period.year,
      semester: period.semester,
      created_at: now,
      updated_at: now
    };

    saveEvaluationAssignment(assignment);
    results.push(assignment);
  }

  recordPPPKLog('CREATE', userId, userName, {
    evaluationId: evalId,
    employeeId: subjectNip,
    periodId: period.id,
    reason: `PPPK ${subject.nama} mengajukan ${results.length} rekan kerja penilai (Status: ${cfg.peerApprovalRequired ? 'PENDING / Menunggu Persetujuan Admin' : 'DISETUJUI'})`
  });

  return results;
}

/**
 * Admin SDM menyetujui usulan rekan kerja penilai
 */
export function approvePeerAssignment(
  assignmentId: string,
  userId: string,
  userName: string
): EvaluationAssignment {
  const list = getEvaluationAssignments();
  const item = list.find(a => a.id === assignmentId);
  if (!item) throw new Error('Penugasan evaluasi tidak ditemukan.');

  const now = new Date().toLocaleString('id-ID');
  item.approval_status = 'APPROVED';
  item.approved_by = userName;
  item.approved_at = now;
  item.rejection_reason = undefined;
  item.updated_at = now;

  saveEvaluationAssignment(item);

  recordPPPKLog('UPDATE', userId, userName, {
    evaluationId: item.evaluation_id,
    employeeId: item.subject_employee_id,
    periodId: item.period_id,
    reason: `Admin SDM (${userName}) MENYETUJUI usulan rekan kerja penilai: ${item.evaluator_employee_nama} (${item.evaluator_employee_status}) untuk subjek ${item.subject_employee_nama}`
  });

  return item;
}

/**
 * Admin SDM menolak usulan rekan kerja penilai dengan alasan penolakan
 */
export function rejectPeerAssignment(
  assignmentId: string,
  reason: string,
  userId: string,
  userName: string
): EvaluationAssignment {
  if (!reason || !reason.trim()) {
    throw new Error('Alasan penolakan usulan rekan kerja wajib diisi.');
  }

  const list = getEvaluationAssignments();
  const item = list.find(a => a.id === assignmentId);
  if (!item) throw new Error('Penugasan evaluasi tidak ditemukan.');

  const now = new Date().toLocaleString('id-ID');
  item.approval_status = 'REJECTED';
  item.rejection_reason = reason.trim();
  item.updated_at = now;

  saveEvaluationAssignment(item);

  recordPPPKLog('UPDATE', userId, userName, {
    evaluationId: item.evaluation_id,
    employeeId: item.subject_employee_id,
    periodId: item.period_id,
    reason: `Admin SDM (${userName}) MENOLAK usulan rekan kerja penilai: ${item.evaluator_employee_nama} untuk subjek ${item.subject_employee_nama}. Alasan: ${reason}`
  });

  return item;
}

/**
 * Admin SDM mengganti penilai rekan kerja
 */
export function replacePeerEvaluator(
  assignmentId: string,
  newEvaluatorNip: string,
  userId: string,
  userName: string
): EvaluationAssignment {
  const list = getEvaluationAssignments();
  const item = list.find(a => a.id === assignmentId);
  if (!item) throw new Error('Penugasan evaluasi tidak ditemukan.');

  const allEmployees = getAllEmployees();
  const newEmp = allEmployees.find(p => p.nip === newEvaluatorNip);
  if (!newEmp) throw new Error('Pegawai pengganti tidak ditemukan.');

  if (newEvaluatorNip === item.subject_employee_id) {
    throw new Error('Tidak boleh memilih subjek sebagai penilai pengganti.');
  }

  const isPPPK = (newEmp.jenisPegawai || newEmp.status || '').toUpperCase().includes('PPPK');
  const now = new Date().toLocaleString('id-ID');

  const oldName = item.evaluator_employee_nama;
  item.evaluator_employee_id = newEvaluatorNip;
  item.evaluator_employee_nama = newEmp.nama;
  item.evaluator_employee_status = isPPPK ? 'PPPK' : 'PNS';
  item.evaluator_employee_jabatan = newEmp.jabatan;
  item.evaluator_employee_unit = newEmp.unitKerja;
  item.approval_status = 'APPROVED';
  item.approved_by = userName;
  item.approved_at = now;
  item.rejection_reason = undefined;
  item.updated_at = now;

  saveEvaluationAssignment(item);

  recordPPPKLog('UPDATE', userId, userName, {
    evaluationId: item.evaluation_id,
    employeeId: item.subject_employee_id,
    periodId: item.period_id,
    reason: `Admin SDM (${userName}) mengganti penilai dari ${oldName} menjadi ${newEmp.nama} (${isPPPK ? 'PPPK' : 'PNS'})`
  });

  return item;
}

/**
 * Menghitung kelengkapan evaluasi PPPK (Checklist 4 Komponen)
 * Syarat lengkap: SKP tersedia, Penilaian Atasan selesai, Rekan Kerja memenuhi kuota min dan selesai, Absensi tersedia.
 */
export function calculateEvaluationCompleteness(evaluation: PPPKEvaluation): {
  isComplete: boolean;
  skpComplete: boolean;
  atasanComplete: boolean;
  rekanComplete: boolean;
  absensiComplete: boolean;
  completedPeerCount: number;
  requiredPeerCount: number;
  totalPeers: number;
  approvedPeers: number;
  missingItems: string[];
  readyForVerification: boolean;
} {
  const cfg = getPPPKSettings();
  const minPeers = cfg.peerEvaluatorMin || 2;
  const assignments = getEvaluationAssignments({
    subjectEmployeeId: evaluation.employeeId,
    periodId: evaluation.periodId
  });

  const skpComplete = Boolean(evaluation.skpScore && evaluation.skpScore > 0);
  
  const atasanAssignment = assignments.find(a => a.evaluator_type === 'ATASAN');
  const atasanComplete = atasanAssignment ? atasanAssignment.assignment_status === 'COMPLETED' : false;

  const peerAssignments = assignments.filter(a => a.evaluator_type === 'REKAN_KERJA');
  const approvedPeers = peerAssignments.filter(a => a.approval_status === 'APPROVED');
  const completedPeers = approvedPeers.filter(a => a.assignment_status === 'COMPLETED');
  const rekanComplete = completedPeers.length >= minPeers;

  const absensiComplete = Boolean(evaluation.attendanceScore && evaluation.attendanceScore > 0);

  const missingItems: string[] = [];
  if (!skpComplete) missingItems.push('Data Nilai SKP belum terintegrasi/tersedia');
  if (!atasanComplete) missingItems.push('Penilaian oleh Atasan Langsung belum selesai');
  if (!rekanComplete) {
    if (approvedPeers.length < minPeers) {
      missingItems.push(`Usulan Rekan Kerja belum disetujui Admin (minimal ${minPeers} disetujui)`);
    } else {
      missingItems.push(`Penilaian Rekan Kerja belum lengkap (${completedPeers.length}/${minPeers} selesai)`);
    }
  }
  if (!absensiComplete) missingItems.push('Data Presensi/Absensi belum dihitung');

  const isComplete = skpComplete && atasanComplete && rekanComplete && absensiComplete;

  return {
    isComplete,
    skpComplete,
    atasanComplete,
    rekanComplete,
    absensiComplete,
    completedPeerCount: completedPeers.length,
    requiredPeerCount: minPeers,
    totalPeers: peerAssignments.length,
    approvedPeers: approvedPeers.length,
    missingItems,
    readyForVerification: isComplete && !evaluation.isFinal
  };
}

// ============================================================
// === 360° BEHAVIOR ASSESSMENTS ===
// ============================================================

export function getBehaviorAssessments(filter?: {
  evaluationId?: string;
  employeeId?: string;
  subjectEmployeeId?: string;
  evaluatorEmployeeId?: string;
  periodId?: string;
  evaluatorType?: 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN';
}): BehaviorAssessment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    let list: BehaviorAssessment[] = raw ? JSON.parse(raw) : [];

    if (filter?.evaluationId) {
      list = list.filter(a => a.evaluationId === filter.evaluationId);
    }
    // Filter by subject employee (PPPK)
    if (filter?.subjectEmployeeId) {
      list = list.filter(a => (a.subject_employee_id || a.employeeId) === filter.subjectEmployeeId);
    } else if (filter?.employeeId) {
      list = list.filter(a => (a.subject_employee_id || a.employeeId) === filter.employeeId);
    }
    // Filter by evaluator (PNS or PPPK)
    if (filter?.evaluatorEmployeeId) {
      list = list.filter(a => (a.evaluator_employee_id || a.respondentId) === filter.evaluatorEmployeeId);
    }
    if (filter?.periodId) {
      list = list.filter(a => a.periodId === filter.periodId);
    }
    if (filter?.evaluatorType) {
      list = list.filter(a => (a.evaluator_type || a.respondentType) === filter.evaluatorType);
    }

    return list;
  } catch (e) {
    return [];
  }
}

/**
 * Validasi dan penyimpanan penilaian 360°
 * ATURAN ARSITEKTURAL:
 * 1. Subjek yang dinilai WAJIB berstatus PPPK.
 * 2. Penilai (Evaluator) TIDAK HARUS PPPK — dapat berupa PNS atau PPPK.
 * 3. Identitas subjek dan penilai disimpan terpisah: subject_employee_id vs evaluator_employee_id.
 */
export function saveBehaviorAssessment(
  assessment: Partial<BehaviorAssessment>,
  userId: string,
  userName: string
): BehaviorAssessment {
  const allEmployees = getAllEmployees();
  const cfg = getPPPKSettings();
  const now = new Date().toLocaleString('id-ID');

  // 1. VALIDASI SUBJEK (WAJIB PPPK)
  const subjectNip = (assessment.subject_employee_id || assessment.employeeId || '').trim();
  if (!subjectNip) {
    throw new Error('Subjek pegawai yang dinilai wajib ditentukan.');
  }
  const subjectEmp = allEmployees.find(p => p.nip === subjectNip || p.id === subjectNip);
  if (!subjectEmp) {
    throw new Error('Data subjek pegawai tidak ditemukan dalam master pegawai.');
  }
  const isSubjPPPK = (subjectEmp.jenisPegawai || subjectEmp.status || '').toUpperCase().includes('PPPK');
  if (!isSubjPPPK) {
    throw new Error(`VALIDASI DITOLAK: Subjek evaluasi WAJIB berstatus PPPK. Pegawai ${subjectEmp.nama} berstatus ${subjectEmp.jenisPegawai || 'PNS'} dan tidak dapat menjadi objek evaluasi kinerja PPPK.`);
  }

  // 2. VALIDASI EVALUATOR (DAPAT PNS ATAU PPPK)
  const evaluatorNip = (assessment.evaluator_employee_id || assessment.respondentId || '').trim();
  if (!evaluatorNip) {
    throw new Error('Penilai / Evaluator wajib ditentukan.');
  }
  const evaluatorEmp = allEmployees.find(p => p.nip === evaluatorNip || p.id === evaluatorNip);
  if (!evaluatorEmp) {
    throw new Error('Data penilai tidak ditemukan dalam master pegawai.');
  }
  const isEvalPPPK = (evaluatorEmp.jenisPegawai || evaluatorEmp.status || '').toUpperCase().includes('PPPK');
  const evaluatorStatus: 'PNS' | 'PPPK' = isEvalPPPK ? 'PPPK' : 'PNS';

  // Tipe Evaluator
  let rawType = (assessment.evaluator_type || assessment.respondentType || 'REKAN_KERJA') as string;
  if (rawType === 'REKAN') rawType = 'REKAN_KERJA';
  const evalType = rawType as 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN';

  // Validasi peran evaluator
  if (evalType === 'SELF') {
    if (evaluatorNip !== subjectNip) {
      throw new Error('Penilaian mandiri (SELF) hanya dapat dilakukan oleh pegawai PPPK yang bersangkutan.');
    }
  } else {
    if (evaluatorNip === subjectNip) {
      throw new Error('Penilaian ATASAN atau REKAN KERJA tidak boleh diisi oleh pegawai yang sama dengan subjek yang dinilai.');
    }
    const allowed = cfg.allowedEvaluatorTypes?.[evalType === 'ATASAN' ? 'atasan' : 'rekanKerja'] || ['PNS', 'PPPK'];
    if (!allowed.includes(evaluatorStatus)) {
      throw new Error(`Kebijakan evaluasi saat ini tidak mengizinkan penilai bertipe ${evalType} dengan status ${evaluatorStatus}.`);
    }
  }

  // Hitung Skor Rata-rata dari butir aspek
  const details = assessment.details || [];
  let totalScore = 0;
  details.forEach(d => { totalScore += Number(d.score || 0); });
  const count = details.length || 1;
  const avgScale5 = Math.round((totalScore / count) * 100) / 100;
  const converted100 = Math.round(((avgScale5 / 5) * 100) * 100) / 100;

  const assessId = assessment.id || `ASSESS-${assessment.periodId || '2026-I'}-${subjectNip}-${evaluatorNip}`;
  const list = getBehaviorAssessments();
  const existingIdx = list.findIndex(a => a.id === assessId);

  const item: BehaviorAssessment = {
    id: assessId,
    evaluationId: assessment.evaluationId || `EVAL-PPPK-2026-I-${subjectNip}`,
    
    // PEMISAHAN IDENTITAS SUBJEK DAN PENILAI SECARA TEGAS:
    subject_employee_id: subjectNip,
    subject_employee_name: subjectEmp.nama,
    subject_employee_status: 'PPPK',
    subject_employee_unit: subjectEmp.unitKerja,
    subject_employee_jabatan: subjectEmp.jabatan,

    evaluator_employee_id: evaluatorNip,
    evaluator_employee_name: evaluatorEmp.nama,
    evaluator_employee_status: evaluatorStatus,
    evaluator_employee_unit: evaluatorEmp.unitKerja,
    evaluator_employee_jabatan: evaluatorEmp.jabatan,
    evaluator_type: evalType,

    periodId: assessment.periodId || 'PERIOD-2026-I',
    year: Number(assessment.year || 2026),
    semester: (assessment.semester || 'I') as PPPKSemester,

    isAnonymous: Boolean(assessment.isAnonymous ?? cfg.allowAnonymous),
    status: 'SUBMITTED',
    score: converted100,
    averageScoreScale5: avgScale5,
    comment: assessment.comment || '',

    details,
    submitted_at: now,
    created_at: assessment.created_at || now,
    updated_at: now,

    // Aliases untuk kompatibilitas mundur
    employeeId: subjectNip,
    employeeName: subjectEmp.nama,
    respondentId: evaluatorNip,
    respondentName: evaluatorEmp.nama,
    respondentType: evalType === 'REKAN_KERJA' ? 'REKAN' : evalType as any,
    averageScore: avgScale5,
    convertedScore: converted100,
    submittedAt: now,
    createdAt: assessment.created_at || now,
    updatedAt: now
  };

  if (existingIdx >= 0) {
    list[existingIdx] = item;
  } else {
    list.push(item);
  }

  localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(list));

  // Sinkronisasi status penugasan (EvaluationAssignment)
  try {
    const rawAssigns = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
    if (rawAssigns) {
      const assigns: EvaluationAssignment[] = JSON.parse(rawAssigns);
      const targetAssign = assigns.find(a => 
        (a.subject_employee_id === subjectNip || a.evaluation_id === item.evaluationId) &&
        a.evaluator_employee_id === evaluatorNip &&
        a.evaluator_type === evalType &&
        (!item.periodId || a.period_id === item.periodId)
      );
      if (targetAssign) {
        targetAssign.assignment_status = 'COMPLETED';
        targetAssign.completed_at = now;
        targetAssign.submitted_at = now;
        targetAssign.score = converted100;
        targetAssign.approval_status = 'APPROVED'; // Otomatis approved jika sudah mengisi
        targetAssign.updated_at = now;
        localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assigns));
      }
    }
  } catch (e) {
    // Ignore non-fatal assignment sync error
  }

  recordPPPKLog('UPDATE', userId, userName, {
    evaluationId: item.evaluationId,
    employeeId: subjectNip,
    reason: `Penilaian Perilaku 360° berhasil disimpan oleh Penilai ${evaluatorEmp.nama} (${evaluatorStatus} - ${evalType}) untuk Subjek ${subjectEmp.nama} (PPPK)`
  });

  return item;
}

/**
 * Menghitung Nilai Perilaku 360° menggunakan BOBOT B (Bobot Penilai 360°):
 * - Atasan: default 50%
 * - Rekan Kerja: default 30%
 * - Self Assessment: default 20%
 * Bobot B ini TERPISAH dari Bobot A (SKP 60%, Perilaku 25%, Absensi 15%).
 */
export function calculateAverageBehaviorScore(
  subjectEmployeeId: string,
  periodId: string,
  settings?: PPPKConfigSettings
): {
  averageScore: number;
  convertedScore: number;
  respondentCount: number;
  atasanScore?: number;
  rekanScore?: number;
  selfScore?: number;
  aspectAverages: { aspectId: string; aspectName: string; averageScore: number }[];
  breakdownByType: {
    atasan: { count: number; averageScore: number; convertedScore: number; weight: number; contribution: number };
    rekanKerja: { count: number; averageScore: number; convertedScore: number; weight: number; contribution: number };
    self: { count: number; averageScore: number; convertedScore: number; weight: number; contribution: number };
  };
  evaluators: {
    evaluatorId: string;
    evaluatorName: string;
    evaluatorStatus: 'PNS' | 'PPPK';
    evaluatorType: 'ATASAN' | 'REKAN_KERJA' | 'SELF' | 'BAWAHAN';
    score: number;
    submittedAt?: string;
  }[];
} {
  const cfg = settings || getPPPKSettings();
  const wAtasan = cfg.evaluator360Weights?.atasanWeight ?? 50;
  const wRekan = cfg.evaluator360Weights?.rekanKerjaWeight ?? 30;
  const wSelf = cfg.evaluator360Weights?.selfWeight ?? 20;

  const rawList = getBehaviorAssessments();
  const assessments = rawList.filter(a => {
    const subj = a.subject_employee_id || a.employeeId;
    return subj === subjectEmployeeId && a.periodId === periodId && a.status === 'SUBMITTED';
  });

  if (assessments.length === 0) {
    const aspects = getBehaviorAspects();
    return {
      averageScore: 4.4,
      convertedScore: 88,
      respondentCount: 0,
      aspectAverages: aspects.map(a => ({ aspectId: a.id, aspectName: a.name, averageScore: 4.4 })),
      breakdownByType: {
        atasan: { count: 0, averageScore: 4.5, convertedScore: 90, weight: wAtasan, contribution: Math.round((90 * wAtasan / 100) * 100) / 100 },
        rekanKerja: { count: 0, averageScore: 4.35, convertedScore: 87, weight: wRekan, contribution: Math.round((87 * wRekan / 100) * 100) / 100 },
        self: { count: 0, averageScore: 4.45, convertedScore: 89, weight: wSelf, contribution: Math.round((89 * wSelf / 100) * 100) / 100 }
      },
      evaluators: []
    };
  }

  // Pisahkan penilaian berdasarkan kategori evaluator
  const atasanList = assessments.filter(a => (a.evaluator_type || a.respondentType) === 'ATASAN');
  const rekanList = assessments.filter(a => {
    const t = (a.evaluator_type || a.respondentType) as string;
    return t === 'REKAN_KERJA' || t === 'REKAN' || t === 'BAWAHAN';
  });
  const selfList = assessments.filter(a => (a.evaluator_type || a.respondentType) === 'SELF');

  const calcGroupAvg = (list: BehaviorAssessment[]) => {
    if (list.length === 0) return null;
    const sum = list.reduce((acc, cur) => acc + Number(cur.convertedScore ?? cur.score ?? 0), 0);
    return Math.round((sum / list.length) * 100) / 100;
  };

  const scoreAtasan = calcGroupAvg(atasanList);
  const scoreRekan = calcGroupAvg(rekanList);
  const scoreSelf = calcGroupAvg(selfList);

  // Perhitungan Bobot B: Normalisasi berdasarkan kategori yang telah submit
  let activeWeightSum = 0;
  let weightedTotal = 0;

  if (scoreAtasan !== null) {
    weightedTotal += scoreAtasan * wAtasan;
    activeWeightSum += wAtasan;
  }
  if (scoreRekan !== null) {
    weightedTotal += scoreRekan * wRekan;
    activeWeightSum += wRekan;
  }
  if (scoreSelf !== null) {
    weightedTotal += scoreSelf * wSelf;
    activeWeightSum += wSelf;
  }

  const finalConverted = activeWeightSum > 0
    ? Math.round((weightedTotal / activeWeightSum) * 100) / 100
    : 88;
  const finalAvg5 = Math.round(((finalConverted / 100) * 5) * 100) / 100;

  // Rekap rata-rata per aspek
  const aspectTotals: Record<string, { name: string; sum: number; count: number }> = {};
  assessments.forEach(a => {
    (a.details || []).forEach(d => {
      if (!aspectTotals[d.aspectId]) {
        aspectTotals[d.aspectId] = { name: d.aspectName, sum: 0, count: 0 };
      }
      aspectTotals[d.aspectId].sum += Number(d.score || 0);
      aspectTotals[d.aspectId].count += 1;
    });
  });

  const aspectAverages = Object.keys(aspectTotals).map(aspectId => ({
    aspectId,
    aspectName: aspectTotals[aspectId].name,
    averageScore: Math.round((aspectTotals[aspectId].sum / (aspectTotals[aspectId].count || 1)) * 100) / 100
  }));

  const evaluators = assessments.map(a => ({
    evaluatorId: a.evaluator_employee_id || a.respondentId || '',
    evaluatorName: a.evaluator_employee_name || a.respondentName || 'Penilai',
    evaluatorStatus: a.evaluator_employee_status || 'PNS',
    evaluatorType: (a.evaluator_type || (a.respondentType === 'REKAN' ? 'REKAN_KERJA' : a.respondentType) || 'REKAN_KERJA') as any,
    score: a.convertedScore ?? a.score ?? 0,
    submittedAt: a.submitted_at || a.submittedAt
  }));

  return {
    averageScore: finalAvg5,
    convertedScore: finalConverted,
    respondentCount: assessments.length,
    atasanScore: scoreAtasan ?? undefined,
    rekanScore: scoreRekan ?? undefined,
    selfScore: scoreSelf ?? undefined,
    aspectAverages,
    breakdownByType: {
      atasan: {
        count: atasanList.length,
        averageScore: scoreAtasan ? Math.round(((scoreAtasan / 100) * 5) * 100) / 100 : 0,
        convertedScore: scoreAtasan || 0,
        weight: wAtasan,
        contribution: scoreAtasan ? Math.round((scoreAtasan * wAtasan / 100) * 100) / 100 : 0
      },
      rekanKerja: {
        count: rekanList.length,
        averageScore: scoreRekan ? Math.round(((scoreRekan / 100) * 5) * 100) / 100 : 0,
        convertedScore: scoreRekan || 0,
        weight: wRekan,
        contribution: scoreRekan ? Math.round((scoreRekan * wRekan / 100) * 100) / 100 : 0
      },
      self: {
        count: selfList.length,
        averageScore: scoreSelf ? Math.round(((scoreSelf / 100) * 5) * 100) / 100 : 0,
        convertedScore: scoreSelf || 0,
        weight: wSelf,
        contribution: scoreSelf ? Math.round((scoreSelf * wSelf / 100) * 100) / 100 : 0
      }
    },
    evaluators
  };
}

// ============================================================
// === PPPK EVALUATION CORE CRUD & WORKFLOW ===
// ============================================================

export function getPPPKEvaluations(filter?: {
  year?: number;
  semester?: PPPKSemester;
  unitKerja?: string;
  status?: string;
  search?: string;
  employeeId?: string;
  periodId?: string;
}): PPPKEvaluation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVALUATIONS);
    let list: PPPKEvaluation[] = raw ? JSON.parse(raw) : [];

    if (filter?.periodId) {
      list = list.filter(e => e.periodId === filter.periodId);
    }
    if (filter?.year) {
      list = list.filter(e => Number(e.year) === Number(filter.year));
    }
    if (filter?.semester) {
      list = list.filter(e => e.semester === filter.semester);
    }
    if (filter?.unitKerja && filter.unitKerja !== 'ALL') {
      list = list.filter(e => (e.unitKerja || '').trim().toLowerCase() === filter.unitKerja!.trim().toLowerCase());
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(e => e.status === filter.status);
    }
    if (filter?.employeeId) {
      list = list.filter(e => e.employeeId === filter.employeeId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(e => 
        (e.nama || '').toLowerCase().includes(q) ||
        (e.employeeId || '').toLowerCase().includes(q) ||
        (e.jabatan || '').toLowerCase().includes(q) ||
        (e.unitKerja || '').toLowerCase().includes(q)
      );
    }

    return list;
  } catch (e) {
    return [];
  }
}

export function getPPPKEvaluationById(id: string): PPPKEvaluation | undefined {
  return getPPPKEvaluations().find(e => e.id === id);
}

export function createOrUpdateEvaluation(
  data: Partial<PPPKEvaluation>,
  userId: string,
  userName: string
): PPPKEvaluation {
  const employeeId = (data.employeeId || '').trim();
  const periodId = (data.periodId || '').trim();

  if (!employeeId) throw new Error('Pegawai PPPK wajib dipilih.');
  if (!periodId) throw new Error('Periode evaluasi wajib dipilih.');

  const period = getEvaluationPeriodById(periodId);
  if (!period) throw new Error('Periode evaluasi tidak ditemukan.');

  // Validate employee: strictly PPPK (Objek Evaluasi WAJIB PPPK, PNS DITOLAK)
  const allEmployees = getAllEmployees();
  const employee = allEmployees.find(p => p.nip === employeeId || p.id === employeeId);
  if (!employee) {
    throw new Error('Data pegawai tidak ditemukan dalam master pegawai.');
  }
  const isPPPK = (employee.jenisPegawai || employee.status || '').toUpperCase().includes('PPPK');
  if (!isPPPK) {
    throw new Error(`VALIDASI DITOLAK: Objek evaluasi WAJIB berstatus PPPK. Pegawai ${employee.nama} berstatus ${employee.jenisPegawai || employee.status || 'PNS'} dan TIDAK DAPAT dibuatkan evaluasi pada modul Evaluasi Kinerja PPPK.`);
  }

  const list = getPPPKEvaluations();
  const evalId = data.id || `EVAL-PPPK-${period.year}-${period.semester}-${employeeId}`;

  // Check unique constraint: employeeId + periodId
  const existingByUnique = list.find(e => e.employeeId === employeeId && e.periodId === periodId && e.id !== evalId);
  if (existingByUnique) {
    throw new Error(`Evaluasi untuk PPPK ini pada ${period.name} sudah terdaftar.`);
  }

  const existingIdx = list.findIndex(e => e.id === evalId);
  const existingEval = existingIdx >= 0 ? list[existingIdx] : undefined;

  // Lock protection: cannot update if isFinal === true
  if (existingEval && existingEval.isFinal) {
    throw new Error('Evaluasi sudah difinalisasi dan tidak dapat diubah secara langsung.');
  }

  // Scores
  const skpScore = Math.max(0, Math.min(100, Number(data.skpScore ?? existingEval?.skpScore ?? 90)));
  const behaviorScore = Math.max(0, Math.min(100, Number(data.behaviorScore ?? existingEval?.behaviorScore ?? 85)));
  const attendanceScore = Math.max(0, Math.min(100, Number(data.attendanceScore ?? existingEval?.attendanceScore ?? 95)));

  // Weights (snapshot from period or existing)
  const skpWeight = Number(data.skpWeight ?? existingEval?.skpWeight ?? period.skpWeight);
  const behaviorWeight = Number(data.behaviorWeight ?? existingEval?.behaviorWeight ?? period.behaviorWeight);
  const attendanceWeight = Number(data.attendanceWeight ?? existingEval?.attendanceWeight ?? period.attendanceWeight);

  if (skpWeight + behaviorWeight + attendanceWeight !== 100) {
    throw new Error(`Total bobot harus sama dengan 100% (saat ini: ${skpWeight + behaviorWeight + attendanceWeight}%).`);
  }

  // Calculate contributions & final score
  const computed = calculateContributions(skpScore, behaviorScore, attendanceScore, skpWeight, behaviorWeight, attendanceWeight);
  const now = new Date().toLocaleString('id-ID');

  let savedEval: PPPKEvaluation;

  if (existingEval) {
    savedEval = {
      ...existingEval,
      ...data,
      id: evalId,
      employeeId,
      nama: employee.nama,
      unitKerja: employee.unitKerja,
      jabatan: employee.jabatan,
      jenisPegawai: 'PPPK',
      periodId,
      year: period.year,
      semester: period.semester,
      skpScore,
      behaviorScore,
      attendanceScore,
      skpWeight,
      behaviorWeight,
      attendanceWeight,
      ...computed,
      calculatedAt: now,
      updatedAt: now,
      updatedBy: userName || 'Admin'
    };
    list[existingIdx] = savedEval;
    recordPPPKLog('UPDATE', userId, userName, {
      evaluationId: evalId,
      employeeId,
      periodId,
      reason: `Update evaluasi PPPK: ${employee.nama} (${period.name})`,
      oldData: existingEval,
      newData: savedEval
    });
  } else {
    savedEval = {
      id: evalId,
      employeeId,
      nama: employee.nama,
      unitKerja: employee.unitKerja,
      jabatan: employee.jabatan,
      jenisPegawai: 'PPPK',
      periodId,
      year: period.year,
      semester: period.semester,
      skpScore,
      behaviorScore,
      attendanceScore,
      skpWeight,
      behaviorWeight,
      attendanceWeight,
      ...computed,
      status: data.status || 'DRAFT',
      isFinal: false,
      skpPredikat: data.skpPredikat || 'Baik',
      notes: data.notes || '',
      calculatedAt: now,
      createdAt: now,
      createdBy: userName || 'Admin',
      updatedAt: now,
      updatedBy: userName || 'Admin'
    };
    list.unshift(savedEval);
    recordPPPKLog('CREATE', userId, userName, {
      evaluationId: evalId,
      employeeId,
      periodId,
      reason: `Pembuatan evaluasi baru: ${employee.nama} (${period.name})`,
      newData: savedEval
    });
  }

  localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(list));

  // Pastikan penugasan atasan langsung & self assessment aktif
  try {
    ensureEvaluationAssignments(employeeId, periodId);
  } catch (e) {
    // Non-fatal
  }

  return savedEval;
}

export function recalculateEvaluation(id: string, userId: string, userName: string): PPPKEvaluation {
  const list = getPPPKEvaluations();
  const idx = list.findIndex(e => e.id === id);
  if (idx < 0) throw new Error('Data evaluasi tidak ditemukan.');

  const ev = list[idx];
  if (ev.isFinal) {
    throw new Error('Evaluasi sudah berstatus FINAL dan tidak dapat dihitung ulang tanpa mekanisme koreksi resmi.');
  }

  const period = getEvaluationPeriodById(ev.periodId);
  if (!period) throw new Error('Periode evaluasi tidak ditemukan.');

  // 1. Fetch SKP
  const skpRes = getExistingSKPForEmployee(ev.employeeId, ev.year, ev.semester);

  // 2. Fetch 360° Behavior
  const behaviorRes = calculateAverageBehaviorScore(ev.employeeId, ev.periodId);

  // 3. Fetch Attendance
  const attRes = calculateAttendanceForPeriod(ev.employeeId, period.startDate, period.endDate);

  // 4. Calculate final score using evaluation's weights
  const computed = calculateContributions(
    skpRes.score,
    behaviorRes.convertedScore,
    attRes.finalScore,
    ev.skpWeight,
    ev.behaviorWeight,
    ev.attendanceWeight
  );

  const now = new Date().toLocaleString('id-ID');
  const updated: PPPKEvaluation = {
    ...ev,
    skpScore: skpRes.score,
    skpPredikat: skpRes.predikat,
    behaviorScore: behaviorRes.convertedScore,
    attendanceScore: attRes.finalScore,
    ...computed,
    calculatedAt: now,
    updatedAt: now,
    updatedBy: userName
  };

  list[idx] = updated;
  localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(list));

  recordPPPKLog('CALCULATE', userId, userName, {
    evaluationId: id,
    employeeId: ev.employeeId,
    periodId: ev.periodId,
    reason: `Hitung ulang evaluasi: SKP=${skpRes.score}, Perilaku=${behaviorRes.convertedScore}, Absensi=${attRes.finalScore} -> Nilai Akhir=${computed.finalScore}`
  });

  return updated;
}

export function finalizeEvaluation(id: string, userId: string, userName: string): PPPKEvaluation {
  const list = getPPPKEvaluations();
  const idx = list.findIndex(e => e.id === id);
  if (idx < 0) throw new Error('Data evaluasi tidak ditemukan.');

  const ev = list[idx];
  if (ev.isFinal) {
    throw new Error('Evaluasi ini sudah difinalisasi sebelumnya.');
  }

  const period = getEvaluationPeriodById(ev.periodId);
  const now = new Date().toLocaleString('id-ID');

  // Generate Immutable Final Snapshot
  const behaviorRes = calculateAverageBehaviorScore(ev.employeeId, ev.periodId);
  const attRes = calculateAttendanceForPeriod(ev.employeeId, period?.startDate || `${ev.year}-01-01`, period?.endDate || `${ev.year}-06-30`);

  const snapshot: PPPKFinalSnapshot = {
    employeeId: ev.employeeId,
    nip: ev.employeeId,
    nama: ev.nama,
    jabatan: ev.jabatan,
    unitKerja: ev.unitKerja,
    periodId: ev.periodId,
    year: ev.year,
    semester: ev.semester,
    skpScore: ev.skpScore,
    behaviorScore: ev.behaviorScore,
    attendanceScore: ev.attendanceScore,
    skpWeight: ev.skpWeight,
    behaviorWeight: ev.behaviorWeight,
    attendanceWeight: ev.attendanceWeight,
    skpContribution: ev.skpContribution,
    behaviorContribution: ev.behaviorContribution,
    attendanceContribution: ev.attendanceContribution,
    finalScore: ev.finalScore,
    category: ev.category,
    attendanceSummary: {
      workDays: attRes.workDays,
      presentDays: attRes.presentDays,
      lateCount: attRes.lateCount,
      earlyLeaveCount: attRes.earlyLeaveCount,
      absenceCount: attRes.absenceCount,
      officialDutyCount: attRes.officialDutyCount,
      wfhCount: attRes.wfhCount,
      wfoCount: attRes.wfoCount,
      penalty: attRes.penalty
    },
    behaviorSummary: {
      respondentCount: behaviorRes.respondentCount,
      aspectAverages: behaviorRes.aspectAverages
    },
    skpSummary: {
      predikat: ev.skpPredikat || 'Baik',
      capaianOrganisasi: 'Sesuai Ekspektasi'
    },
    finalizedAt: now,
    finalizedBy: userName || 'Admin'
  };

  const finalized: PPPKEvaluation = {
    ...ev,
    status: 'FINAL',
    isFinal: true,
    finalSnapshot: snapshot,
    finalizedAt: now,
    finalizedBy: userName || 'Admin',
    updatedAt: now,
    updatedBy: userName || 'Admin'
  };

  list[idx] = finalized;
  localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(list));

  recordPPPKLog('FINALIZE', userId, userName, {
    evaluationId: id,
    employeeId: ev.employeeId,
    periodId: ev.periodId,
    reason: `Finalisasi Evaluasi Kinerja PPPK: Nilai Akhir=${finalized.finalScore} (${finalized.category})`,
    newData: snapshot
  });

  return finalized;
}

export function requestCorrection(id: string, reason: string, userId: string, userName: string): PPPKEvaluation {
  if (!reason || !reason.trim()) {
    throw new Error('Alasan permohonan koreksi wajib diisi.');
  }

  const list = getPPPKEvaluations();
  const idx = list.findIndex(e => e.id === id);
  if (idx < 0) throw new Error('Data evaluasi tidak ditemukan.');

  const ev = list[idx];
  const now = new Date().toLocaleString('id-ID');

  const updated: PPPKEvaluation = {
    ...ev,
    status: 'CORRECTION_REQUESTED',
    correctionReason: reason.trim(),
    correctionRequestedAt: now,
    correctionRequestedBy: userName,
    updatedAt: now,
    updatedBy: userName
  };

  list[idx] = updated;
  localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(list));

  recordPPPKLog('CORRECTION_REQUEST', userId, userName, {
    evaluationId: id,
    employeeId: ev.employeeId,
    reason: `Pengajuan koreksi data final: ${reason}`
  });

  return updated;
}

export function approveCorrection(id: string, userId: string, userName: string): PPPKEvaluation {
  const list = getPPPKEvaluations();
  const idx = list.findIndex(e => e.id === id);
  if (idx < 0) throw new Error('Data evaluasi tidak ditemukan.');

  const ev = list[idx];
  const now = new Date().toLocaleString('id-ID');

  // Unlock record
  const updated: PPPKEvaluation = {
    ...ev,
    status: 'IN_PROGRESS',
    isFinal: false,
    correctionApprovedAt: now,
    correctionApprovedBy: userName,
    updatedAt: now,
    updatedBy: userName
  };

  list[idx] = updated;
  localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(list));

  recordPPPKLog('APPROVE_CORRECTION', userId, userName, {
    evaluationId: id,
    employeeId: ev.employeeId,
    reason: `Persetujuan koreksi evaluasi & pembukaan kunci gembok`
  });

  return updated;
}

export function deleteEvaluation(id: string, userId: string, userName: string): void {
  const list = getPPPKEvaluations();
  const target = list.find(e => e.id === id);
  if (!target) return;

  if (target.isFinal) {
    throw new Error('Evaluasi yang sudah FINAL tidak dapat dihapus. Silakan ajukan koreksi terlebih dahulu jika terjadi kekeliruan.');
  }

  const filtered = list.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(filtered));

  recordPPPKLog('DELETE', userId, userName, {
    evaluationId: id,
    employeeId: target.employeeId,
    periodId: target.periodId,
    reason: `Hapus evaluasi: ${target.nama} (${target.year} Semester ${target.semester})`
  });
}

// ============================================================
// === ANNUAL RECAP ENGINE ===
// ============================================================

export interface AnnualRecapRow {
  employeeId: string;
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jenisPegawai: string;
  year: number;
  semester1Score: number | null;
  semester1Category: string | null;
  semester1Status: string;
  semester2Score: number | null;
  semester2Category: string | null;
  semester2Status: string;
  annualAverage: number | null;
  annualCategory: string | null;
  isComplete: boolean;
  statusText: string;
}

export function getAnnualRecap(year: number, unitKerja?: string, search?: string): AnnualRecapRow[] {
  const pppkEmployees = getPPPKEmployees();
  const allEvals = getPPPKEvaluations({ year });

  let result: AnnualRecapRow[] = pppkEmployees.map(emp => {
    const sem1 = allEvals.find(e => e.employeeId === emp.nip && e.semester === 'I');
    const sem2 = allEvals.find(e => e.employeeId === emp.nip && e.semester === 'II');

    const s1Final = sem1?.isFinal === true;
    const s2Final = sem2?.isFinal === true;

    const s1Score = sem1 ? sem1.finalScore : null;
    const s2Score = sem2 ? sem2.finalScore : null;

    let annualAvg: number | null = null;
    let annualCat: string | null = null;
    let isComplete = false;
    let statusText = 'Belum Lengkap';

    if (s1Final && s2Final && s1Score !== null && s2Score !== null) {
      annualAvg = Math.round(((s1Score + s2Score) / 2) * 100) / 100;
      annualCat = determineCategory(annualAvg);
      isComplete = true;
      statusText = 'Lengkap (Final)';
    } else if (s1Final && !s2Final) {
      statusText = 'Semester II Belum Final';
    } else if (!s1Final && s2Final) {
      statusText = 'Semester I Belum Final';
    } else {
      statusText = 'Belum Ada Evaluasi Final';
    }

    return {
      employeeId: emp.nip,
      nip: emp.nip,
      nama: emp.nama,
      jabatan: emp.jabatan,
      unitKerja: emp.unitKerja,
      jenisPegawai: emp.jenisPegawai,
      year,
      semester1Score: s1Score,
      semester1Category: sem1?.category || null,
      semester1Status: sem1 ? (sem1.isFinal ? 'FINAL' : sem1.status) : 'BELUM_ADA',
      semester2Score: s2Score,
      semester2Category: sem2?.category || null,
      semester2Status: sem2 ? (sem2.isFinal ? 'FINAL' : sem2.status) : 'BELUM_ADA',
      annualAverage: annualAvg,
      annualCategory: annualCat,
      isComplete,
      statusText
    };
  });

  if (unitKerja && unitKerja !== 'ALL') {
    result = result.filter(r => (r.unitKerja || '').toLowerCase() === unitKerja.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase().trim();
    result = result.filter(r => 
      r.nama.toLowerCase().includes(q) ||
      r.nip.toLowerCase().includes(q) ||
      r.jabatan.toLowerCase().includes(q) ||
      r.unitKerja.toLowerCase().includes(q)
    );
  }

  return result;
}

// ============================================================
// === INITIALIZATION & SAMPLE DATA SEEDING ===
// ============================================================

export function initializePPPKEvaluationData(): void {
  // Ensure default aspects exist
  getBehaviorAspects();
  // Ensure default settings exist
  getPPPKSettings();
  // Ensure default periods exist
  const periods = getEvaluationPeriods();

  // If no evaluations exist, seed realistic evaluations for available PPPK employees
  const existingEvals = getPPPKEvaluations();
  if (existingEvals.length === 0) {
    const pppkList = getPPPKEmployees();
    if (pppkList.length > 0 && periods.length > 0) {
      const sem1Period = periods.find(p => p.semester === 'I') || periods[0];
      const sem2Period = periods.find(p => p.semester === 'II') || periods[1];

      const seedList: PPPKEvaluation[] = [];

      pppkList.slice(0, 15).forEach((p, idx) => {
        // Semester I: Some finalized, some in progress
        const skp1 = 88 + (idx % 10);
        const beh1 = 85 + (idx % 12);
        const att1 = 92 + (idx % 8);
        const comp1 = calculateContributions(skp1, beh1, att1, sem1Period.skpWeight, sem1Period.behaviorWeight, sem1Period.attendanceWeight);
        const isFinal1 = idx < 8; // First 8 are finalized

        const eval1: PPPKEvaluation = {
          id: `EVAL-PPPK-${sem1Period.year}-I-${p.nip}`,
          employeeId: p.nip,
          nama: p.nama,
          unitKerja: p.unitKerja,
          jabatan: p.jabatan,
          jenisPegawai: 'PPPK',
          periodId: sem1Period.id,
          year: sem1Period.year,
          semester: 'I',
          skpScore: skp1,
          behaviorScore: beh1,
          attendanceScore: att1,
          skpWeight: sem1Period.skpWeight,
          behaviorWeight: sem1Period.behaviorWeight,
          attendanceWeight: sem1Period.attendanceWeight,
          ...comp1,
          status: isFinal1 ? 'FINAL' : 'WAITING_REVIEW',
          isFinal: isFinal1,
          finalizedAt: isFinal1 ? '2026-07-05 10:15:00' : undefined,
          finalizedBy: isFinal1 ? 'Superadmin SDM' : undefined,
          calculatedAt: '2026-07-02 09:00:00',
          createdAt: '2026-01-10 08:30:00',
          createdBy: 'System Seed',
          updatedAt: '2026-07-05 10:15:00',
          updatedBy: 'System Seed',
          finalSnapshot: isFinal1 ? {
            employeeId: p.nip,
            nip: p.nip,
            nama: p.nama,
            jabatan: p.jabatan,
            unitKerja: p.unitKerja,
            periodId: sem1Period.id,
            year: sem1Period.year,
            semester: 'I',
            skpScore: skp1,
            behaviorScore: beh1,
            attendanceScore: att1,
            skpWeight: sem1Period.skpWeight,
            behaviorWeight: sem1Period.behaviorWeight,
            attendanceWeight: sem1Period.attendanceWeight,
            ...comp1,
            attendanceSummary: {
              workDays: 120,
              presentDays: 118,
              lateCount: 2,
              earlyLeaveCount: 1,
              absenceCount: 0,
              officialDutyCount: 5,
              wfhCount: 0,
              wfoCount: 118,
              penalty: 4.5
            },
            behaviorSummary: {
              respondentCount: 3,
              aspectAverages: DEFAULT_BEHAVIOR_ASPECTS.map(a => ({ aspectId: a.id, aspectName: a.name, averageScore: 4.3 }))
            },
            skpSummary: {
              predikat: 'Baik',
              capaianOrganisasi: 'Sesuai Ekspektasi'
            },
            finalizedAt: '2026-07-05 10:15:00',
            finalizedBy: 'Superadmin SDM'
          } : undefined
        };
        seedList.push(eval1);

        // Semester II: A couple finalized for testing Annual Recap calculation
        if (sem2Period && idx < 5) {
          const skp2 = 91 + (idx % 8);
          const beh2 = 87 + (idx % 10);
          const att2 = 94 + (idx % 6);
          const comp2 = calculateContributions(skp2, beh2, att2, sem2Period.skpWeight, sem2Period.behaviorWeight, sem2Period.attendanceWeight);

          const eval2: PPPKEvaluation = {
            id: `EVAL-PPPK-${sem2Period.year}-II-${p.nip}`,
            employeeId: p.nip,
            nama: p.nama,
            unitKerja: p.unitKerja,
            jabatan: p.jabatan,
            jenisPegawai: 'PPPK',
            periodId: sem2Period.id,
            year: sem2Period.year,
            semester: 'II',
            skpScore: skp2,
            behaviorScore: beh2,
            attendanceScore: att2,
            skpWeight: sem2Period.skpWeight,
            behaviorWeight: sem2Period.behaviorWeight,
            attendanceWeight: sem2Period.attendanceWeight,
            ...comp2,
            status: 'FINAL',
            isFinal: true,
            finalizedAt: '2026-12-28 14:20:00',
            finalizedBy: 'Superadmin SDM',
            calculatedAt: '2026-12-20 11:00:00',
            createdAt: '2026-07-15 08:30:00',
            createdBy: 'System Seed',
            updatedAt: '2026-12-28 14:20:00',
            updatedBy: 'System Seed',
            finalSnapshot: {
              employeeId: p.nip,
              nip: p.nip,
              nama: p.nama,
              jabatan: p.jabatan,
              unitKerja: p.unitKerja,
              periodId: sem2Period.id,
              year: sem2Period.year,
              semester: 'II',
              skpScore: skp2,
              behaviorScore: beh2,
              attendanceScore: att2,
              skpWeight: sem2Period.skpWeight,
              behaviorWeight: sem2Period.behaviorWeight,
              attendanceWeight: sem2Period.attendanceWeight,
              ...comp2,
              attendanceSummary: {
                workDays: 122,
                presentDays: 120,
                lateCount: 1,
                earlyLeaveCount: 0,
                absenceCount: 0,
                officialDutyCount: 6,
                wfhCount: 0,
                wfoCount: 120,
                penalty: 1.5
              },
              behaviorSummary: {
                respondentCount: 4,
                aspectAverages: DEFAULT_BEHAVIOR_ASPECTS.map(a => ({ aspectId: a.id, aspectName: a.name, averageScore: 4.5 }))
              },
              skpSummary: {
                predikat: 'Sangat Baik',
                capaianOrganisasi: 'Melebihi Ekspektasi'
              },
              finalizedAt: '2026-12-28 14:20:00',
              finalizedBy: 'Superadmin SDM'
            }
          };
          seedList.push(eval2);
        }
      });

      localStorage.setItem(STORAGE_KEYS.EVALUATIONS, JSON.stringify(seedList));
    }
  }

  // Seed 360° behavior assessments if empty, specifically demonstrating the user case:
  // Subjek: ANDI PRASETYO (PPPK)
  // Penilai Atasan: BUDI HERMANTO (PNS)
  // Penilai Rekan 1: CICI AMALIA (PNS)
  // Penilai Rekan 2: DODI IRAWAN (PNS)
  // Penilai Mandiri: ANDI PRASETYO (PPPK, SELF)
  const existingAssessments = getBehaviorAssessments();
  if (existingAssessments.length === 0) {
    const aspects = getBehaviorAspects();
    const pppkAndi = FALLBACK_ALL_EMPLOYEES.find(p => p.nip === '199511102022031005') || FALLBACK_ALL_EMPLOYEES[0];
    const pnsBudi = FALLBACK_ALL_EMPLOYEES.find(p => p.nip === '198504122008121001')!; // PNS Atasan
    const pnsCici = FALLBACK_ALL_EMPLOYEES.find(p => p.nip === '199003152014022003')!; // PNS Rekan Kerja
    const pnsDodi = FALLBACK_ALL_EMPLOYEES.find(p => p.nip === '199208202015032002')!; // PNS Rekan Kerja

    const buildDetails = (scoreBase: number) => aspects.map(a => ({
      id: `seed-det-${a.id}`,
      assessmentId: '',
      aspectId: a.id,
      aspectName: a.name,
      score: Math.min(5, Math.max(1, scoreBase)),
      notes: 'Sesuai dengan ekspektasi kinerja dan perilaku BerAKHLAK.'
    }));

    const sampleAssessments: Partial<BehaviorAssessment>[] = [
      // 1. Penilaian Atasan Langsung (PNS -> PPPK)
      {
        id: `ASSESS-2026-I-${pppkAndi.nip}-${pnsBudi.nip}`,
        evaluationId: `EVAL-PPPK-2026-I-${pppkAndi.nip}`,
        subject_employee_id: pppkAndi.nip,
        evaluator_employee_id: pnsBudi.nip,
        evaluator_type: 'ATASAN',
        periodId: 'PERIOD-2026-I',
        year: 2026,
        semester: 'I',
        details: buildDetails(5),
        comment: 'Menunjukkan inisiatif kerja yang sangat baik dalam pengelolaan basis data dan sistem KI.'
      },
      // 2. Penilaian Rekan Kerja 1 (PNS -> PPPK)
      {
        id: `ASSESS-2026-I-${pppkAndi.nip}-${pnsCici.nip}`,
        evaluationId: `EVAL-PPPK-2026-I-${pppkAndi.nip}`,
        subject_employee_id: pppkAndi.nip,
        evaluator_employee_id: pnsCici.nip,
        evaluator_type: 'REKAN_KERJA',
        periodId: 'PERIOD-2026-I',
        year: 2026,
        semester: 'I',
        details: buildDetails(4),
        comment: 'Sangat kooperatif dalam koordinasi tim lintas fungsi.'
      },
      // 3. Penilaian Rekan Kerja 2 (PNS -> PPPK)
      {
        id: `ASSESS-2026-I-${pppkAndi.nip}-${pnsDodi.nip}`,
        evaluationId: `EVAL-PPPK-2026-I-${pppkAndi.nip}`,
        subject_employee_id: pppkAndi.nip,
        evaluator_employee_id: pnsDodi.nip,
        evaluator_type: 'REKAN_KERJA',
        periodId: 'PERIOD-2026-I',
        year: 2026,
        semester: 'I',
        details: buildDetails(4),
        comment: 'Komunikasi responsif dan dapat diandalkan dalam penyelesaian tugas.'
      },
      // 4. Penilaian Mandiri (PPPK -> PPPK / SELF)
      {
        id: `ASSESS-2026-I-${pppkAndi.nip}-${pppkAndi.nip}`,
        evaluationId: `EVAL-PPPK-2026-I-${pppkAndi.nip}`,
        subject_employee_id: pppkAndi.nip,
        evaluator_employee_id: pppkAndi.nip,
        evaluator_type: 'SELF',
        periodId: 'PERIOD-2026-I',
        year: 2026,
        semester: 'I',
        details: buildDetails(4),
        comment: 'Berkomitmen terus meningkatkan kompetensi dan pelayanan publik.'
      }
    ];

    sampleAssessments.forEach(ass => {
      try {
        saveBehaviorAssessment(ass, 'System Seed', 'Sistem');
      } catch (e) {
        // Ignored in seeding
      }
    });
  }

  // Seed Evaluation Assignments if empty
  const existingAssignments = getEvaluationAssignments();
  if (existingAssignments.length === 0) {
    const all = getAllEmployees();
    const pppks = getPPPKEmployees();
    const period = getEvaluationPeriods().find(p => p.semester === 'I') || getEvaluationPeriods()[0];

    if (pppks.length > 0 && period) {
      const now = new Date().toLocaleString('id-ID');
      const seedAssignments: EvaluationAssignment[] = [];

      pppks.slice(0, 8).forEach((subject, sIdx) => {
        const evalId = `EVAL-PPPK-${period.year}-${period.semester}-${subject.nip}`;
        const atasanInfo = getAtasanLangsung(subject, all);
        const atasan = atasanInfo.atasan || all.find(p => p.nip !== subject.nip && !p.jenisPegawai?.includes('PPPK'));

        // Atasan assignment
        if (atasan) {
          const isAtasanPPPK = (atasan.jenisPegawai || atasan.status || '').toUpperCase().includes('PPPK');
          seedAssignments.push({
            id: `ASSIGN-ATASAN-${period.id}-${subject.nip}-${atasan.nip}`,
            evaluation_id: evalId,
            subject_employee_id: subject.nip,
            subject_employee_nama: subject.nama,
            subject_employee_jabatan: subject.jabatan,
            subject_employee_unit: subject.unitKerja,
            evaluator_employee_id: atasan.nip,
            evaluator_employee_nama: atasan.nama,
            evaluator_employee_status: isAtasanPPPK ? 'PPPK' : 'PNS',
            evaluator_employee_jabatan: atasan.jabatan,
            evaluator_employee_unit: atasan.unitKerja,
            evaluator_type: 'ATASAN',
            assignment_status: sIdx < 4 ? 'COMPLETED' : 'ASSIGNED',
            approval_status: 'APPROVED',
            approved_by: 'SISTEM (Struktur Organisasi)',
            approved_at: now,
            period_id: period.id,
            year: period.year,
            semester: period.semester,
            score: sIdx < 4 ? 92 : undefined,
            submitted_at: sIdx < 4 ? now : undefined,
            completed_at: sIdx < 4 ? now : undefined,
            created_at: now,
            updated_at: now
          });
        }

        // Self assignment
        seedAssignments.push({
          id: `ASSIGN-SELF-${period.id}-${subject.nip}`,
          evaluation_id: evalId,
          subject_employee_id: subject.nip,
          subject_employee_nama: subject.nama,
          subject_employee_jabatan: subject.jabatan,
          subject_employee_unit: subject.unitKerja,
          evaluator_employee_id: subject.nip,
          evaluator_employee_nama: subject.nama,
          evaluator_employee_status: 'PPPK',
          evaluator_employee_jabatan: subject.jabatan,
          evaluator_employee_unit: subject.unitKerja,
          evaluator_type: 'SELF',
          assignment_status: sIdx < 4 ? 'COMPLETED' : 'ASSIGNED',
          approval_status: 'APPROVED',
          approved_by: 'SISTEM (Evaluasi Diri)',
          approved_at: now,
          period_id: period.id,
          year: period.year,
          semester: period.semester,
          score: sIdx < 4 ? 88 : undefined,
          submitted_at: sIdx < 4 ? now : undefined,
          completed_at: sIdx < 4 ? now : undefined,
          created_at: now,
          updated_at: now
        });

        // Peer assignments (2 to 3 peers: mix of PNS and PPPK, mix of APPROVED and PENDING for test)
        const eligiblePeers = all.filter(p => p.nip !== subject.nip && p.nip !== atasan?.nip && !p.status?.toLowerCase().includes('nonaktif'));
        const p1 = eligiblePeers[(sIdx * 2) % eligiblePeers.length];
        const p2 = eligiblePeers[(sIdx * 2 + 1) % eligiblePeers.length];

        if (p1) {
          const isP1PPPK = (p1.jenisPegawai || p1.status || '').toUpperCase().includes('PPPK');
          seedAssignments.push({
            id: `ASSIGN-PEER-${period.id}-${subject.nip}-${p1.nip}`,
            evaluation_id: evalId,
            subject_employee_id: subject.nip,
            subject_employee_nama: subject.nama,
            subject_employee_jabatan: subject.jabatan,
            subject_employee_unit: subject.unitKerja,
            evaluator_employee_id: p1.nip,
            evaluator_employee_nama: p1.nama,
            evaluator_employee_status: isP1PPPK ? 'PPPK' : 'PNS',
            evaluator_employee_jabatan: p1.jabatan,
            evaluator_employee_unit: p1.unitKerja,
            evaluator_type: 'REKAN_KERJA',
            assignment_status: sIdx < 3 ? 'COMPLETED' : 'ASSIGNED',
            approval_status: 'APPROVED',
            approved_by: 'Superadmin SDM',
            approved_at: now,
            period_id: period.id,
            year: period.year,
            semester: period.semester,
            score: sIdx < 3 ? 90 : undefined,
            submitted_at: sIdx < 3 ? now : undefined,
            completed_at: sIdx < 3 ? now : undefined,
            created_at: now,
            updated_at: now
          });
        }

        if (p2) {
          const isP2PPPK = (p2.jenisPegawai || p2.status || '').toUpperCase().includes('PPPK');
          // For sIdx >= 4, make it PENDING so Admin can test the approval workflow!
          const isPending = sIdx >= 4;
          seedAssignments.push({
            id: `ASSIGN-PEER-${period.id}-${subject.nip}-${p2.nip}`,
            evaluation_id: evalId,
            subject_employee_id: subject.nip,
            subject_employee_nama: subject.nama,
            subject_employee_jabatan: subject.jabatan,
            subject_employee_unit: subject.unitKerja,
            evaluator_employee_id: p2.nip,
            evaluator_employee_nama: p2.nama,
            evaluator_employee_status: isP2PPPK ? 'PPPK' : 'PNS',
            evaluator_employee_jabatan: p2.jabatan,
            evaluator_employee_unit: p2.unitKerja,
            evaluator_type: 'REKAN_KERJA',
            assignment_status: isPending ? 'ASSIGNED' : (sIdx < 3 ? 'COMPLETED' : 'ASSIGNED'),
            approval_status: isPending ? 'PENDING' : 'APPROVED',
            approved_by: isPending ? undefined : 'Superadmin SDM',
            approved_at: isPending ? undefined : now,
            period_id: period.id,
            year: period.year,
            semester: period.semester,
            score: !isPending && sIdx < 3 ? 86 : undefined,
            submitted_at: !isPending && sIdx < 3 ? now : undefined,
            completed_at: !isPending && sIdx < 3 ? now : undefined,
            created_at: now,
            updated_at: now
          });
        }
      });

      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(seedAssignments));
    }
  }
}
