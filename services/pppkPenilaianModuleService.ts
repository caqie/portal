/**
 * pppkPenilaianModuleService.ts
 * Dedicated Enterprise Service & Calculation Engine for Modul Penilaian Kinerja PPPK DJKI.
 * 
 * STRICT COMPLIANCE:
 * 1. Deterministic mathematical calculations (No paid AI/token costs).
 * 2. 7 Aspek BerAKHLAK x 4 Pertanyaan = 28 Pertanyaan, Skala 1 - 5.
 * 3. 1 Pejabat Penilai (60%) + 1 Rekan PNS (20%) + 1 Rekan PPPK (20%) = Nilai Perilaku Penilai.
 * 4. Nilai Akhir Perilaku = (Nilai Perilaku Penilai * 60%) + (Nilai Kehadiran * 40%).
 * 5. Rating Perilaku: 4.32-5.00 DIATAS, 3.60-4.31 SESUAI, 1.00-3.59 DIBAWAH.
 * 6. Hasil Kerja: Realisasi vs Target (Diatas, Sesuai, Dibawah).
 * 7. Matriks Predikat Kinerja + Rekomendasi multiselect.
 * 8. Import PDF absensi bulk & analisis Alfa otomatis.
 * 9. Comprehensive Audit Trail & Role-based access control.
 */

import {
  PPPKPenugasanPenilai,
  PPPKPenilaianHasilKerjaDoc,
  PPPKRhkItem,
  PPPKBuktiDukung,
  PPPKMasterPertanyaanPerilaku,
  PPPKPenilaianPerilakuDoc,
  PPPKAbsensiImportHeader,
  PPPKAbsensiDetailRow,
  PPPKEvaluasiAkhirDoc,
  PPPKRatingKinerja,
  PPPKPredikatKinerja,
  PPPKRekomendasiKinerja,
  PPPKAuditLogRecord,
  EvaluationPeriod,
  Pegawai,
  PPPKSemester
} from '../types';
import { getAllEmployees } from './pppkEvaluationService';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Storage Keys
export const PPPK_STORAGE = {
  PERIODS: 'portal_pppk_master_periods_v2',
  ASSIGNMENTS: 'portal_pppk_penugasan_penilai_v2',
  HASIL_KERJA: 'portal_pppk_hasil_kerja_docs_v2',
  PERILAKU: 'portal_pppk_perilaku_docs_v2',
  QUESTIONS: 'portal_pppk_master_pertanyaan_v2',
  ABSENSI_IMPORT: 'portal_pppk_absensi_import_v2',
  ABSENSI_DETAIL: 'portal_pppk_absensi_detail_v2',
  EVALUASI_AKHIR: 'portal_pppk_evaluasi_akhir_docs_v2',
  AUDIT_LOG: 'portal_pppk_audit_trail_v2',
  ACTIVE_ROLE_SIMULATOR: 'portal_pppk_simulated_role_v2'
};

// ============================================================
// 1. MASTER 28 PERTANYAAN BERAKHLAK (7 ASPEK X 4 PERTANYAAN)
// ============================================================

export const DEFAULT_28_PERTANYAAN: PPPKMasterPertanyaanPerilaku[] = [
  // 1. Berorientasi Pelayanan
  {
    id: 'BP-1',
    aspek: 'Berorientasi Pelayanan',
    nomor: 1,
    pertanyaan: 'Memahami dan memenuhi kebutuhan masyarakat / pemohon layanan dengan ramah, cekatan, solutif, dan dapat diandalkan.',
    aktif: true,
    urutan: 1
  },
  {
    id: 'BP-2',
    aspek: 'Berorientasi Pelayanan',
    nomor: 2,
    pertanyaan: 'Melakukan perbaikan tiada henti dalam memberikan pelayanan kepegawaian dan kekayaan intelektual.',
    aktif: true,
    urutan: 2
  },
  {
    id: 'BP-3',
    aspek: 'Berorientasi Pelayanan',
    nomor: 3,
    pertanyaan: 'Menjaga standar mutu pelayanan prima serta bersikap responsif terhadap keluhan atau aspirasi masyarakat.',
    aktif: true,
    urutan: 3
  },
  {
    id: 'BP-4',
    aspek: 'Berorientasi Pelayanan',
    nomor: 4,
    pertanyaan: 'Mengutamakan kepuasan stakeholder dalam setiap pelaksanaan tugas kedinasan di lingkungan unit kerja.',
    aktif: true,
    urutan: 4
  },

  // 2. Akuntabel
  {
    id: 'AK-5',
    aspek: 'Akuntabel',
    nomor: 5,
    pertanyaan: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi.',
    aktif: true,
    urutan: 5
  },
  {
    id: 'AK-6',
    aspek: 'Akuntabel',
    nomor: 6,
    pertanyaan: 'Menggunakan kekayaan dan barang milik negara (BMN) secara bertanggung jawab, efektif, dan efisien.',
    aktif: true,
    urutan: 6
  },
  {
    id: 'AK-7',
    aspek: 'Akuntabel',
    nomor: 7,
    pertanyaan: 'Tidak menyalahgunakan kewenangan jabatan dalam pengambilan keputusan maupun penyelesaian administrasi kedinasan.',
    aktif: true,
    urutan: 7
  },
  {
    id: 'AK-8',
    aspek: 'Akuntabel',
    nomor: 8,
    pertanyaan: 'Menyelesaikan seluruh pelaporan hasil kerja kedinasan secara transparan, tepat waktu, dan dapat dipertanggungjawabkan.',
    aktif: true,
    urutan: 8
  },

  // 3. Kompeten
  {
    id: 'KM-9',
    aspek: 'Kompeten',
    nomor: 9,
    pertanyaan: 'Meningkatkan kompetensi diri secara berkelanjutan untuk menjawab tantangan kerja yang selalu berubah.',
    aktif: true,
    urutan: 9
  },
  {
    id: 'KM-10',
    aspek: 'Kompeten',
    nomor: 10,
    pertanyaan: 'Membantu orang lain belajar dan aktif berbagi pengetahuan serta pengalaman positif dalam lingkungan kerja.',
    aktif: true,
    urutan: 10
  },
  {
    id: 'KM-11',
    aspek: 'Kompeten',
    nomor: 11,
    pertanyaan: 'Melaksanakan tugas kedinasan dengan kualitas terbaik dan berorientasi pada pencapaian hasil maksimal.',
    aktif: true,
    urutan: 11
  },
  {
    id: 'KM-12',
    aspek: 'Kompeten',
    nomor: 12,
    pertanyaan: 'Mengikuti perkembangan regulasi, teknologi digital, dan prosedur operasional standar (SOP) terkini.',
    aktif: true,
    urutan: 12
  },

  // 4. Harmonis
  {
    id: 'HM-13',
    aspek: 'Harmonis',
    nomor: 13,
    pertanyaan: 'Menghargai setiap orang apapun latar belakang suku, agama, ras, gender, maupun golongannya.',
    aktif: true,
    urutan: 13
  },
  {
    id: 'HM-14',
    aspek: 'Harmonis',
    nomor: 14,
    pertanyaan: 'Suka menolong rekan kerja, pengguna layanan, maupun pihak lain yang membutuhkan bantuan kedinasan.',
    aktif: true,
    urutan: 14
  },
  {
    id: 'HM-15',
    aspek: 'Harmonis',
    nomor: 15,
    pertanyaan: 'Membangun lingkungan kerja yang kondusif, nyaman, harmonis, dan saling menghormati antar pegawai.',
    aktif: true,
    urutan: 15
  },
  {
    id: 'HM-16',
    aspek: 'Harmonis',
    nomor: 16,
    pertanyaan: 'Menghindari timbulnya gesekan antarpribadi dan aktif meredakan potensi kesalahpahaman dalam tim kerja.',
    aktif: true,
    urutan: 16
  },

  // 5. Loyal
  {
    id: 'LY-17',
    aspek: 'Loyal',
    nomor: 17,
    pertanyaan: 'Memegang teguh ideologi Pancasila, Undang-Undang Dasar 1945, NKRI, serta pemerintahan yang sah.',
    aktif: true,
    urutan: 17
  },
  {
    id: 'LY-18',
    aspek: 'Loyal',
    nomor: 18,
    pertanyaan: 'Menjaga nama baik sesama ASN, Pimpinan, Instansi Kementerian Hukum dan HAM / DJKI, serta Negara.',
    aktif: true,
    urutan: 18
  },
  {
    id: 'LY-19',
    aspek: 'Loyal',
    nomor: 19,
    pertanyaan: 'Menjaga rahasia jabatan dan rahasia negara sesuai dengan ketentuan peraturan perundang-undangan.',
    aktif: true,
    urutan: 19
  },
  {
    id: 'LY-20',
    aspek: 'Loyal',
    nomor: 20,
    pertanyaan: 'Berkomitmen dan berdedikasi tinggi dalam melaksanakan instruksi dinas yang sah dari pimpinan.',
    aktif: true,
    urutan: 20
  },

  // 6. Adaptif
  {
    id: 'AD-21',
    aspek: 'Adaptif',
    nomor: 21,
    pertanyaan: 'Cepat menyesuaikan diri menghadapi dinamika perubahan regulasi, sistem informasi, dan teknologi baru.',
    aktif: true,
    urutan: 21
  },
  {
    id: 'AD-22',
    aspek: 'Adaptif',
    nomor: 22,
    pertanyaan: 'Terus berinovasi dan mengembangkan kreativitas dalam perbaikan metode pelaksanaan tugas sehari-hari.',
    aktif: true,
    urutan: 22
  },
  {
    id: 'AD-23',
    aspek: 'Adaptif',
    nomor: 23,
    pertanyaan: 'Bertindak proaktif dalam mengidentifikasi kendala dan mencarikan solusi atas hambatan kerja.',
    aktif: true,
    urutan: 23
  },
  {
    id: 'AD-24',
    aspek: 'Adaptif',
    nomor: 24,
    pertanyaan: 'Memiliki antusiasme tinggi dalam menyongsong transformasi digital dan modernisasi birokrasi DJKI.',
    aktif: true,
    urutan: 24
  },

  // 7. Kolaboratif
  {
    id: 'KL-25',
    aspek: 'Kolaboratif',
    nomor: 25,
    pertanyaan: 'Memberi kesempatan kepada berbagai pihak dan rekan kerja untuk berkontribusi dalam pencapaian target kerja.',
    aktif: true,
    urutan: 25
  },
  {
    id: 'KL-26',
    aspek: 'Kolaboratif',
    nomor: 26,
    pertanyaan: 'Terbuka dalam bekerja sama untuk menghasilkan nilai tambah dan kemanfaatan yang lebih luas bagi organisasi.',
    aktif: true,
    urutan: 26
  },
  {
    id: 'KL-27',
    aspek: 'Kolaboratif',
    nomor: 27,
    pertanyaan: 'Menggerakkan pemanfaatan berbagai sumber daya kedinasan secara sinergis untuk mencapai tujuan bersama.',
    aktif: true,
    urutan: 27
  },
  {
    id: 'KL-28',
    aspek: 'Kolaboratif',
    nomor: 28,
    pertanyaan: 'Menjalin koordinasi dan komunikasi yang aktif serta efektif lintas sub-bidang, seksi, dan tim kerja.',
    aktif: true,
    urutan: 28
  }
];

// ============================================================
// 2. AUDIT TRAIL LOGGING
// ============================================================

export function recordAuditLog(
  userId: string,
  userName: string,
  action: string,
  module: string,
  recordId: string,
  oldValue?: string,
  newValue?: string,
  keterangan?: string
): void {
  const newLog: PPPKAuditLogRecord = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName,
    action,
    module,
    recordId,
    oldValue,
    newValue,
    timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }),
    keterangan
  };

  try {
    const raw = localStorage.getItem(PPPK_STORAGE.AUDIT_LOG);
    const logs: PPPKAuditLogRecord[] = raw ? JSON.parse(raw) : [];
    logs.unshift(newLog);
    // Keep max 500 logs
    localStorage.setItem(PPPK_STORAGE.AUDIT_LOG, JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error('Failed to save audit log:', err);
  }
}

export function getAuditLogs(): PPPKAuditLogRecord[] {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.AUDIT_LOG);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ============================================================
// 3. MASTER PERIODE EVALUASI (CRUD)
// ============================================================

export function getMasterPeriods(): EvaluationPeriod[] {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.PERIODS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  // Defaults
  const defaults: EvaluationPeriod[] = [
    {
      id: 'PERIOD-2026-I',
      name: 'Periode Semester I Tahun 2026 (1 Jan 2026 s.d. 30 Jun 2026)',
      year: 2026,
      semester: 'I',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      status: 'OPEN',
      skpWeight: 60,
      behaviorWeight: 25,
      attendanceWeight: 15,
      createdAt: '2026-01-02 08:00:00',
      updatedAt: '2026-01-02 08:00:00',
      createdBy: 'Admin SDM',
      updatedBy: 'Admin SDM'
    },
    {
      id: 'PERIOD-2026-II',
      name: 'Periode Semester II Tahun 2026 (1 Jul 2026 s.d. 31 Des 2026)',
      year: 2026,
      semester: 'II',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      status: 'OPEN',
      skpWeight: 60,
      behaviorWeight: 25,
      attendanceWeight: 15,
      createdAt: '2026-07-01 08:00:00',
      updatedAt: '2026-07-01 08:00:00',
      createdBy: 'Admin SDM',
      updatedBy: 'Admin SDM'
    }
  ];

  localStorage.setItem(PPPK_STORAGE.PERIODS, JSON.stringify(defaults));
  return defaults;
}

export function saveMasterPeriod(period: EvaluationPeriod, userId: string, userName: string): void {
  const periods = getMasterPeriods();
  const idx = periods.findIndex(p => p.id === period.id);
  const now = new Date().toLocaleString('id-ID');

  if (idx >= 0) {
    const old = periods[idx];
    periods[idx] = { ...period, updatedAt: now };
    recordAuditLog(userId, userName, 'UPDATE', 'Master Periode', period.id, JSON.stringify(old), JSON.stringify(period), `Memperbarui periode ${period.name}`);
  } else {
    periods.unshift({ ...period, createdAt: now, updatedAt: now, createdBy: userName });
    recordAuditLog(userId, userName, 'CREATE', 'Master Periode', period.id, undefined, JSON.stringify(period), `Membuat periode baru ${period.name}`);
  }
  localStorage.setItem(PPPK_STORAGE.PERIODS, JSON.stringify(periods));
}

export function deleteMasterPeriod(id: string, userId: string, userName: string): void {
  const periods = getMasterPeriods();
  const target = periods.find(p => p.id === id);
  if (!target) return;
  const filtered = periods.filter(p => p.id !== id);
  localStorage.setItem(PPPK_STORAGE.PERIODS, JSON.stringify(filtered));
  recordAuditLog(userId, userName, 'DELETE', 'Master Periode', id, JSON.stringify(target), undefined, `Menghapus periode ${target.name}`);
}

// ============================================================
// 4. MASTER PERTANYAAN PERILAKU (CRUD)
// ============================================================

export function getMasterPertanyaan(): PPPKMasterPertanyaanPerilaku[] {
  let list = DEFAULT_28_PERTANYAAN;
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.QUESTIONS);
    if (raw) {
      const parsed: PPPKMasterPertanyaanPerilaku[] = JSON.parse(raw);
      if (parsed.length >= 28) list = parsed;
    }
  } catch {}

  return list.map(q => ({
    ...q,
    no: q.no || q.nomor,
    perilaku: q.perilaku || q.pertanyaan,
    indikator: q.indikator || `Penerapan konsisten perilaku ${q.aspek} dalam tugas kedinasan sehari-hari.`
  }));
}

export function saveMasterPertanyaan(item: PPPKMasterPertanyaanPerilaku, userId: string, userName: string): void {
  const list = getMasterPertanyaan();
  const idx = list.findIndex(q => q.id === item.id);
  if (idx >= 0) {
    const old = list[idx];
    list[idx] = item;
    recordAuditLog(userId, userName, 'UPDATE', 'Master Pertanyaan Perilaku', item.id, JSON.stringify(old), JSON.stringify(item), `Mengubah pertanyaan No. ${item.nomor}`);
  } else {
    list.push(item);
    recordAuditLog(userId, userName, 'CREATE', 'Master Pertanyaan Perilaku', item.id, undefined, JSON.stringify(item), `Menambah pertanyaan No. ${item.nomor}`);
  }
  localStorage.setItem(PPPK_STORAGE.QUESTIONS, JSON.stringify(list));
}

export function resetMasterPertanyaanDefault(userId: string, userName: string): void {
  localStorage.setItem(PPPK_STORAGE.QUESTIONS, JSON.stringify(DEFAULT_28_PERTANYAAN));
  recordAuditLog(userId, userName, 'RESET', 'Master Pertanyaan Perilaku', 'ALL', undefined, undefined, 'Mereset master pertanyaan perilaku ke 28 butir default BerAKHLAK');
}

// ============================================================
// 5. PENETAPAN PENILAI (PENUGASAN_PENILAI)
// ============================================================

export function getPenugasanPenilaiList(periodeId?: string): PPPKPenugasanPenilai[] {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.ASSIGNMENTS);
    let list: PPPKPenugasanPenilai[] = raw ? JSON.parse(raw) : [];

    // Ensure sample/demo assignments exist if list is completely empty
    if (list.length === 0) {
      list = seedSampleAssignments();
    }

    if (periodeId) {
      return list.filter(a => a.periodeId === periodeId);
    }
    return list;
  } catch {
    return [];
  }
}

function seedSampleAssignments(): PPPKPenugasanPenilai[] {
  const employees = getAllEmployees();
  const pppkList = employees.filter(p => (p.jenisPegawai || p.status || '').toUpperCase().includes('PPPK'));
  const pnsList = employees.filter(p => !(p.jenisPegawai || p.status || '').toUpperCase().includes('PPPK'));

  const now = new Date().toLocaleString('id-ID');
  const defaults: PPPKPenugasanPenilai[] = [];

  // Default demonstration: Christia Sari
  const christia = pppkList.find(p => p.nama.toLowerCase().includes('christia')) || {
    nip: '199605152024212001',
    nama: 'CHRISTIA SARI, S.H.',
    jabatan: 'Analis Hukum Ahli Pertama (PPPK)',
    unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
    status: 'PPPK'
  };

  const pejabat = pnsList[0] || {
    nip: '198205042006041002',
    nama: 'ACHMAD IQBAL TAUFIQ, S.H., M.H.',
    jabatan: 'Ketua Tim Kerja Fasilitasi & Pertimbangan Hukum',
    unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
    pangkat: 'Pembina (IV/a)'
  };

  const rekanPns = pnsList[1] || {
    nip: '198911292010121001',
    nama: 'BUDI PRASETYO, S.H.',
    jabatan: 'Penyusun Bahan Hukum (PNS)',
    unitKerja: 'Direktorat Jenderal Kekayaan Intelektual'
  };

  const rekanPppk = pppkList.find(p => p.nip !== christia.nip) || {
    nip: '199408102024212003',
    nama: 'DEWI ANGGRAENI, S.Kom.',
    jabatan: 'Pranata Komputer Ahli Pertama (PPPK)',
    unitKerja: 'Direktorat Jenderal Kekayaan Intelektual'
  };

  const atasanPejabat = pnsList[2] || {
    nip: '197503121998031001',
    nama: 'DR. H. SUTRISNO, S.H., M.M.',
    jabatan: 'Direktur Hak Cipta dan Desain Industri',
    pangkat: 'Pembina Utama Muda (IV/c)',
    unitKerja: 'Direktorat Jenderal Kekayaan Intelektual'
  };

  defaults.push({
    id: `ASSIGN-2026-I-${christia.nip}`,
    periodeId: 'PERIOD-2026-I',
    year: 2026,
    semester: 'I',
    pppkDinilaiId: christia.nip,
    pppkNama: christia.nama,
    pppkNip: christia.nip,
    pppkJabatan: christia.jabatan,
    pppkUnitKerja: christia.unitKerja,
    pppkPangkat: 'Golongan IX / Ahli Pertama',

    jenisPejabatPenilai: 'KETUA_TIM_KERJA',
    pejabatPenilaiId: pejabat.nip,
    pejabatPenilaiNama: pejabat.nama,
    pejabatPenilaiNip: pejabat.nip,
    pejabatPenilaiJabatan: pejabat.jabatan,
    pejabatPenilaiUnit: pejabat.unitKerja,
    pejabatPenilaiPangkat: pejabat.pangkat || 'Pembina (IV/a)',

    atasanPejabatPenilaiId: atasanPejabat.nip,
    atasanPejabatPenilaiNama: atasanPejabat.nama,
    atasanPejabatPenilaiNip: atasanPejabat.nip,
    atasanPejabatPenilaiJabatan: atasanPejabat.jabatan,
    atasanPejabatPenilaiPangkat: atasanPejabat.pangkat || 'Pembina Utama Muda (IV/c)',
    atasanPejabatPenilaiUnit: atasanPejabat.unitKerja,

    rekanPnsId: rekanPns.nip,
    rekanPnsNama: rekanPns.nama,
    rekanPnsNip: rekanPns.nip,
    rekanPnsJabatan: rekanPns.jabatan,
    rekanPnsUnit: rekanPns.unitKerja,

    rekanPppkId: rekanPppk.nip,
    rekanPppkNama: rekanPppk.nama,
    rekanPppkNip: rekanPppk.nip,
    rekanPppkJabatan: rekanPppk.jabatan,
    rekanPppkUnit: rekanPppk.unitKerja,

    status: 'DALAM_PENILAIAN',
    createdAt: now,
    createdBy: christia.nama,
    updatedAt: now,
    updatedBy: 'Admin SDM',
    approvedAt: now,
    approvedBy: 'Admin SDM'
  });

  // Second demo PPPK for multi-evaluation demonstration by Achmad Iqbal Taufiq
  if (pppkList.length > 2) {
    const pppkB = pppkList[1];
    defaults.push({
      id: `ASSIGN-2026-I-${pppkB.nip}`,
      periodeId: 'PERIOD-2026-I',
      year: 2026,
      semester: 'I',
      pppkDinilaiId: pppkB.nip,
      pppkNama: pppkB.nama,
      pppkNip: pppkB.nip,
      pppkJabatan: pppkB.jabatan,
      pppkUnitKerja: pppkB.unitKerja,
      pppkPangkat: 'Golongan IX / Ahli Pertama',

      jenisPejabatPenilai: 'KETUA_TIM_KERJA',
      pejabatPenilaiId: pejabat.nip,
      pejabatPenilaiNama: pejabat.nama,
      pejabatPenilaiNip: pejabat.nip,
      pejabatPenilaiJabatan: pejabat.jabatan,
      pejabatPenilaiUnit: pejabat.unitKerja,
      pejabatPenilaiPangkat: pejabat.pangkat || 'Pembina (IV/a)',

      atasanPejabatPenilaiId: atasanPejabat.nip,
      atasanPejabatPenilaiNama: atasanPejabat.nama,
      atasanPejabatPenilaiNip: atasanPejabat.nip,
      atasanPejabatPenilaiJabatan: atasanPejabat.jabatan,
      atasanPejabatPenilaiPangkat: atasanPejabat.pangkat,
      atasanPejabatPenilaiUnit: atasanPejabat.unitKerja,

      rekanPnsId: rekanPns.nip,
      rekanPnsNama: rekanPns.nama,
      rekanPnsNip: rekanPns.nip,
      rekanPnsJabatan: rekanPns.jabatan,
      rekanPnsUnit: rekanPns.unitKerja,

      rekanPppkId: christia.nip,
      rekanPppkNama: christia.nama,
      rekanPppkNip: christia.nip,
      rekanPppkJabatan: christia.jabatan,
      rekanPppkUnit: christia.unitKerja,

      status: 'DALAM_PENILAIAN',
      createdAt: now,
      createdBy: pppkB.nama,
      updatedAt: now,
      updatedBy: 'Admin SDM',
      approvedAt: now,
      approvedBy: 'Admin SDM'
    });
  }

  localStorage.setItem(PPPK_STORAGE.ASSIGNMENTS, JSON.stringify(defaults));
  return defaults;
}

export function savePenugasanPenilai(
  assignment: PPPKPenugasanPenilai,
  userId: string,
  userName: string
): PPPKPenugasanPenilai {
  const list = getPenugasanPenilaiList();
  const idx = list.findIndex(a => a.id === assignment.id);
  const now = new Date().toLocaleString('id-ID');

  let updated: PPPKPenugasanPenilai;

  if (idx >= 0) {
    const old = list[idx];
    updated = { ...assignment, updatedAt: now, updatedBy: userName };
    list[idx] = updated;
    recordAuditLog(userId, userName, 'UPDATE', 'Penetapan Penilai', updated.id, JSON.stringify(old), JSON.stringify(updated), `Memperbarui penugasan PPPK ${updated.pppkNama}`);
  } else {
    updated = { ...assignment, createdAt: now, createdBy: userName, updatedAt: now, updatedBy: userName };
    list.unshift(updated);
    recordAuditLog(userId, userName, 'CREATE', 'Penetapan Penilai', updated.id, undefined, JSON.stringify(updated), `Membuat penugasan baru PPPK ${updated.pppkNama}`);
  }

  localStorage.setItem(PPPK_STORAGE.ASSIGNMENTS, JSON.stringify(list));
  return updated;
}

/**
 * PPPK Mengusulkan Pejabat Penilai
 */
export function usulkanPejabatPenilai(
  periodeId: string,
  year: number,
  semester: PPPKSemester,
  pppkUser: Pegawai,
  jenisPejabat: 'KETUA_TIM_KERJA' | 'PEJABAT_MANAJERIAL',
  pejabatPegawai: Pegawai,
  userId: string,
  userName: string
): PPPKPenugasanPenilai {
  const id = `ASSIGN-${year}-${semester}-${pppkUser.nip}`;
  const list = getPenugasanPenilaiList();
  const existing = list.find(a => a.id === id);

  if (existing && (existing.status === 'DISETUJUI' || existing.status === 'DALAM_PENILAIAN' || existing.status === 'FINAL')) {
    throw new Error('Penetapan Pejabat Penilai untuk periode ini telah disetujui dan terkunci.');
  }

  const assignment: PPPKPenugasanPenilai = {
    id,
    periodeId,
    year,
    semester,
    pppkDinilaiId: pppkUser.nip,
    pppkNama: pppkUser.nama,
    pppkNip: pppkUser.nip,
    pppkJabatan: pppkUser.jabatan,
    pppkUnitKerja: pppkUser.unitKerja,
    pppkPangkat: pppkUser.pangkat || 'Golongan IX / Ahli Pertama',

    jenisPejabatPenilai: jenisPejabat,
    pejabatPenilaiId: pejabatPegawai.nip,
    pejabatPenilaiNama: pejabatPegawai.nama,
    pejabatPenilaiNip: pejabatPegawai.nip,
    pejabatPenilaiJabatan: pejabatPegawai.jabatan,
    pejabatPenilaiUnit: pejabatPegawai.unitKerja,
    pejabatPenilaiPangkat: pejabatPegawai.pangkat || 'Pembina (IV/a)',

    rekanPnsId: existing?.rekanPnsId,
    rekanPnsNama: existing?.rekanPnsNama,
    rekanPnsNip: existing?.rekanPnsNip,
    rekanPnsJabatan: existing?.rekanPnsJabatan,
    rekanPnsUnit: existing?.rekanPnsUnit,

    rekanPppkId: existing?.rekanPppkId,
    rekanPppkNama: existing?.rekanPppkNama,
    rekanPppkNip: existing?.rekanPppkNip,
    rekanPppkJabatan: existing?.rekanPppkJabatan,
    rekanPppkUnit: existing?.rekanPppkUnit,

    status: 'MENUNGGU_VERIFIKASI',
    createdAt: existing?.createdAt || new Date().toLocaleString('id-ID'),
    createdBy: existing?.createdBy || userName,
    updatedAt: new Date().toLocaleString('id-ID'),
    updatedBy: userName
  };

  return savePenugasanPenilai(assignment, userId, userName);
}

/**
 * Admin Verifikasi Usulan Pejabat Penilai (Setuju / Tolak)
 */
export function verifikasiUsulanPejabatPenilai(
  assignmentId: string,
  isApproved: boolean,
  catatanAdmin: string,
  userId: string,
  userName: string
): PPPKPenugasanPenilai {
  const list = getPenugasanPenilaiList();
  const target = list.find(a => a.id === assignmentId);
  if (!target) throw new Error('Data penugasan penilai tidak ditemukan.');

  const now = new Date().toLocaleString('id-ID');

  if (isApproved) {
    target.status = 'DISETUJUI';
    target.approvedAt = now;
    target.approvedBy = userName;
    target.catatanVerifikasiAdmin = catatanAdmin || 'Disetujui oleh Admin SDM.';
    recordAuditLog(userId, userName, 'APPROVE', 'Penetapan Penilai', assignmentId, 'MENUNGGU_VERIFIKASI', 'DISETUJUI', `Menyetujui usulan Pejabat Penilai untuk ${target.pppkNama}`);
  } else {
    target.status = 'DITOLAK';
    target.catatanVerifikasiAdmin = catatanAdmin || 'Usulan ditolak. Silakan ajukan ulang dengan pejabat yang sesuai.';
    recordAuditLog(userId, userName, 'REJECT', 'Penetapan Penilai', assignmentId, 'MENUNGGU_VERIFIKASI', 'DITOLAK', `Menolak usulan Pejabat Penilai: ${catatanAdmin}`);
  }

  target.updatedAt = now;
  target.updatedBy = userName;
  localStorage.setItem(PPPK_STORAGE.ASSIGNMENTS, JSON.stringify(list));
  return target;
}

/**
 * Pejabat Penilai Menetapkan Tepat 1 Rekan PNS + 1 Rekan PPPK
 */
export function tetapkanRekanKerjaGanda(
  assignmentId: string,
  rekanPns: Pegawai,
  rekanPppk: Pegawai,
  atasanPejabat?: Pegawai,
  userId: string = '',
  userName: string = ''
): PPPKPenugasanPenilai {
  const list = getPenugasanPenilaiList();
  const target = list.find(a => a.id === assignmentId);
  if (!target) throw new Error('Data penugasan penilai tidak ditemukan.');

  if (target.status !== 'DISETUJUI' && target.status !== 'DALAM_PENILAIAN') {
    throw new Error('Penetapan rekan penilai hanya dapat dilakukan jika Pejabat Penilai telah disetujui Admin.');
  }

  // Strict validation: Must not be same as the PPPK being evaluated
  if (rekanPns.nip === target.pppkDinilaiId || rekanPppk.nip === target.pppkDinilaiId) {
    throw new Error('Pegawai yang dinilai tidak boleh ditunjuk sebagai rekan penilai dirinya sendiri.');
  }

  if (rekanPns.nip === rekanPppk.nip) {
    throw new Error('Rekan PNS dan Rekan PPPK harus merupakan dua orang yang berbeda.');
  }

  target.rekanPnsId = rekanPns.nip;
  target.rekanPnsNama = rekanPns.nama;
  target.rekanPnsNip = rekanPns.nip;
  target.rekanPnsJabatan = rekanPns.jabatan;
  target.rekanPnsUnit = rekanPns.unitKerja;

  target.rekanPppkId = rekanPppk.nip;
  target.rekanPppkNama = rekanPppk.nama;
  target.rekanPppkNip = rekanPppk.nip;
  target.rekanPppkJabatan = rekanPppk.jabatan;
  target.rekanPppkUnit = rekanPppk.unitKerja;

  if (atasanPejabat) {
    target.atasanPejabatPenilaiId = atasanPejabat.nip;
    target.atasanPejabatPenilaiNama = atasanPejabat.nama;
    target.atasanPejabatPenilaiNip = atasanPejabat.nip;
    target.atasanPejabatPenilaiJabatan = atasanPejabat.jabatan;
    target.atasanPejabatPenilaiPangkat = atasanPejabat.pangkat;
    target.atasanPejabatPenilaiUnit = atasanPejabat.unitKerja;
  }

  // Automatic task assignment creation
  target.status = 'DALAM_PENILAIAN';
  target.updatedAt = new Date().toLocaleString('id-ID');
  target.updatedBy = userName;

  localStorage.setItem(PPPK_STORAGE.ASSIGNMENTS, JSON.stringify(list));
  recordAuditLog(
    userId,
    userName,
    'ASSIGN_PEERS',
    'Penetapan Penilai',
    assignmentId,
    undefined,
    `PNS: ${rekanPns.nama}, PPPK: ${rekanPppk.nama}`,
    `Menetapkan 1 Rekan PNS (${rekanPns.nama}) & 1 Rekan PPPK (${rekanPppk.nama}) untuk evaluasi ${target.pppkNama}`
  );

  return target;
}

// ============================================================
// 6. PENILAIAN HASIL KERJA (RHK & SKP PPPK)
// ============================================================

export function getHasilKerjaDoc(penugasanId: string): PPPKPenilaianHasilKerjaDoc | undefined {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.HASIL_KERJA);
    const docs: PPPKPenilaianHasilKerjaDoc[] = raw ? JSON.parse(raw) : [];
    let found = docs.find(d => d.penugasanId === penugasanId);

    if (!found) {
      // Create empty draft with default official standard RHKs
      found = createDefaultHasilKerjaDraft(penugasanId);
      docs.push(found);
      localStorage.setItem(PPPK_STORAGE.HASIL_KERJA, JSON.stringify(docs));
    }
    return found;
  } catch {
    return undefined;
  }
}

function createDefaultHasilKerjaDraft(penugasanId: string): PPPKPenilaianHasilKerjaDoc {
  const assignments = getPenugasanPenilaiList();
  const assign = assignments.find(a => a.id === penugasanId);
  const now = new Date().toLocaleString('id-ID');

  const defaultItems: PPPKRhkItem[] = [
    {
      id: 'RHK-1',
      no: 1,
      rencanaHasilKerja: 'Melaksanakan tugas kedinasan dari Atasan atau Pimpinan Langsung baik lisan maupun tertulis dengan tertib dan akuntabel',
      target: 120,
      satuan: 'Berkas Permohonan / Dokumen',
      realisasi: 125,
      satuanRealisasi: 'Berkas Permohonan / Dokumen',
      buktiDukung: [
        {
          id: 'BUKTI-1',
          nama: 'Laporan_Tugas_Kedinasan_Semester_I.pdf',
          url: 'https://example.com/bukti/laporan_tugas.pdf',
          tipe: 'PDF',
          ukuran: '1.8 MB',
          tanggalUpload: '2026-06-20',
          uploader: assign?.pppkNama || 'PPPK'
        }
      ],
      ratingOtomatis: 'DIATAS EKSPEKTASI',
      umpanBalikPenilai: 'Pelaksanaan tugas melampaui target dengan ketelitian tinggi.'
    },
    {
      id: 'RHK-2',
      no: 2,
      rencanaHasilKerja: 'Menyiapkan bahan konsep Peraturan Perundang-undangan dan telaah kebijakan bidang Kekayaan Intelektual',
      target: 6,
      satuan: 'Konsep Regulasi / Telaahan',
      realisasi: 6,
      satuanRealisasi: 'Konsep Regulasi / Telaahan',
      buktiDukung: [
        {
          id: 'BUKTI-2',
          nama: 'Naskah_Telaahan_Konsep_Regulasi.pdf',
          url: 'https://example.com/bukti/naskah_telaahan.pdf',
          tipe: 'PDF',
          ukuran: '2.4 MB',
          tanggalUpload: '2026-06-22',
          uploader: assign?.pppkNama || 'PPPK'
        }
      ],
      ratingOtomatis: 'SESUAI EKSPEKTASI',
      umpanBalikPenilai: 'Bahan telaahan telah sesuai dengan kaidah perundang-undangan.'
    },
    {
      id: 'RHK-3',
      no: 3,
      rencanaHasilKerja: 'Menerima dan mengadministrasikan Surat Masuk terkait Tanggapan Hukum dan Sengketa Kekayaan Intelektual',
      target: 40,
      satuan: 'Surat Masuk / Tanggapan',
      realisasi: 42,
      satuanRealisasi: 'Surat Masuk / Tanggapan',
      buktiDukung: [],
      ratingOtomatis: 'DIATAS EKSPEKTASI',
      umpanBalikPenilai: 'Surat masuk diarsipkan secara digital tepat waktu.'
    },
    {
      id: 'RHK-4',
      no: 4,
      rencanaHasilKerja: 'Menyiapkan bahan dan membuat konsep Surat Tanggapan Hukum dan Analisa Hukum Kekayaan Intelektual',
      target: 30,
      satuan: 'Konsep Surat & Analisa',
      realisasi: 30,
      satuanRealisasi: 'Konsep Surat & Analisa',
      buktiDukung: [],
      ratingOtomatis: 'SESUAI EKSPEKTASI'
    },
    {
      id: 'RHK-5',
      no: 5,
      rencanaHasilKerja: 'Menyiapkan bahan Konsultasi Teknis dan Wawancara Riset Masyarakat terkait Hak Cipta dan Paten',
      target: 12,
      satuan: 'Laporan Konsultasi',
      realisasi: 12,
      satuanRealisasi: 'Laporan Konsultasi',
      buktiDukung: [],
      ratingOtomatis: 'SESUAI EKSPEKTASI'
    }
  ];

  return {
    id: `HK-${penugasanId}`,
    penugasanId,
    periodeId: assign?.periodeId || 'PERIOD-2026-I',
    pppkId: assign?.pppkDinilaiId || '',
    items: defaultItems,
    ratingHasilKerjaFinal: 'SESUAI EKSPEKTASI',
    status: 'DINILAI',
    createdAt: now,
    updatedAt: now
  };
}

export function saveHasilKerjaDoc(
  doc: PPPKPenilaianHasilKerjaDoc,
  userId: string,
  userName: string
): void {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.HASIL_KERJA);
    const docs: PPPKPenilaianHasilKerjaDoc[] = raw ? JSON.parse(raw) : [];
    const idx = docs.findIndex(d => d.penugasanId === doc.penugasanId);

    // Compute automatic ratings based on Target vs Realisasi
    doc.items = doc.items.map(it => {
      let auto: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI' = 'SESUAI EKSPEKTASI';
      if (it.realisasi > it.target) auto = 'DIATAS EKSPEKTASI';
      else if (it.realisasi === it.target) auto = 'SESUAI EKSPEKTASI';
      else auto = 'DIBAWAH EKSPEKTASI';

      return {
        ...it,
        ratingOtomatis: auto
      };
    });

    // Compute final overall rating
    let aboveCount = 0;
    let belowCount = 0;
    doc.items.forEach(it => {
      const activeRating = it.ratingManual || it.ratingOtomatis;
      if (activeRating === 'DIATAS EKSPEKTASI') aboveCount++;
      if (activeRating === 'DIBAWAH EKSPEKTASI') belowCount++;
    });

    if (aboveCount >= Math.ceil(doc.items.length / 2)) {
      doc.ratingHasilKerjaFinal = 'DIATAS EKSPEKTASI';
    } else if (belowCount > Math.floor(doc.items.length / 2)) {
      doc.ratingHasilKerjaFinal = 'DIBAWAH EKSPEKTASI';
    } else {
      doc.ratingHasilKerjaFinal = 'SESUAI EKSPEKTASI';
    }

    doc.updatedAt = new Date().toLocaleString('id-ID');

    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }

    localStorage.setItem(PPPK_STORAGE.HASIL_KERJA, JSON.stringify(docs));
    recordAuditLog(userId, userName, 'SAVE_HASIL_KERJA', 'Hasil Kerja', doc.id, undefined, doc.ratingHasilKerjaFinal, `Menyimpan RHK & Rating Hasil Kerja (${doc.ratingHasilKerjaFinal})`);
  } catch (err) {
    console.error('Error saving hasil kerja:', err);
  }
}

// ============================================================
// 7. PENILAIAN PERILAKU KERJA (7 ASPEK X 4 SOAL = 28 SOAL)
// ============================================================

export function getPenilaianPerilakuDoc(
  penugasanId: string,
  rolePenilai: 'PEJABAT_PENILAI' | 'PNS_PENILAI' | 'PPPK_PENILAI'
): PPPKPenilaianPerilakuDoc | undefined {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.PERILAKU);
    const docs: PPPKPenilaianPerilakuDoc[] = raw ? JSON.parse(raw) : [];
    let found = docs.find(d => d.penugasanId === penugasanId && d.rolePenilai === rolePenilai);

    if (!found) {
      const assign = getPenugasanPenilaiList().find(a => a.id === penugasanId);
      let penilaiId = '';
      let penilaiNama = '';

      if (rolePenilai === 'PEJABAT_PENILAI') {
        penilaiId = assign?.pejabatPenilaiId || '';
        penilaiNama = assign?.pejabatPenilaiNama || '';
      } else if (rolePenilai === 'PNS_PENILAI') {
        penilaiId = assign?.rekanPnsId || '';
        penilaiNama = assign?.rekanPnsNama || '';
      } else {
        penilaiId = assign?.rekanPppkId || '';
        penilaiNama = assign?.rekanPppkNama || '';
      }

      // Pre-fill answers (default score 4 or 5 for realistic operational start)
      const defaultAnswers: Record<string, number> = {};
      DEFAULT_28_PERTANYAAN.forEach((q, i) => {
        // Realistic seed score 4.0 - 5.0
        const base = rolePenilai === 'PEJABAT_PENILAI' ? (i % 3 === 0 ? 5 : 4) : (i % 2 === 0 ? 4 : 5);
        defaultAnswers[q.id] = base;
      });

      const avg = calculateAnswersAverage(defaultAnswers);

      found = {
        id: `PERILAKU-${penugasanId}-${rolePenilai}`,
        penugasanId,
        periodeId: assign?.periodeId || 'PERIOD-2026-I',
        pppkId: assign?.pppkDinilaiId || '',
        penilaiId,
        penilaiNama,
        rolePenilai,
        answers: defaultAnswers,
        rataRataScore: avg,
        status: 'SUBMITTED',
        submittedAt: new Date().toLocaleString('id-ID'),
        updatedAt: new Date().toLocaleString('id-ID'),
        catatan: 'Bekerja dengan dedikasi tinggi, tanggap, dan selaras dengan Core Values ASN BerAKHLAK.'
      };

      docs.push(found);
      localStorage.setItem(PPPK_STORAGE.PERILAKU, JSON.stringify(docs));
    }

    return found;
  } catch {
    return undefined;
  }
}

export function savePenilaianPerilakuDoc(
  doc: PPPKPenilaianPerilakuDoc,
  userId: string,
  userName: string
): void {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.PERILAKU);
    const docs: PPPKPenilaianPerilakuDoc[] = raw ? JSON.parse(raw) : [];
    const idx = docs.findIndex(d => d.id === doc.id);

    doc.rataRataScore = calculateAnswersAverage(doc.answers);
    doc.updatedAt = new Date().toLocaleString('id-ID');

    if (doc.status === 'SUBMITTED' && !doc.submittedAt) {
      doc.submittedAt = new Date().toLocaleString('id-ID');
    }

    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }

    localStorage.setItem(PPPK_STORAGE.PERILAKU, JSON.stringify(docs));
    recordAuditLog(
      userId,
      userName,
      doc.status === 'SUBMITTED' ? 'SUBMIT_PERILAKU' : 'DRAFT_PERILAKU',
      'Penilaian Perilaku',
      doc.id,
      undefined,
      `Rata-rata: ${doc.rataRataScore.toFixed(2)}`,
      `${doc.rolePenilai} (${doc.penilaiNama}) mengisi 28 butir perilaku`
    );
  } catch (err) {
    console.error('Error saving perilaku doc:', err);
  }
}

function calculateAnswersAverage(answers: Record<string, number>): number {
  const vals = Object.values(answers).filter(v => typeof v === 'number' && v > 0);
  if (vals.length === 0) return 0;
  const sum = vals.reduce((a, b) => a + b, 0);
  return Number((sum / vals.length).toFixed(2));
}

// ============================================================
// 8. PENILAIAN KEHADIRAN (IMPORT BULK PDF & ANALISIS ALFA)
// ============================================================

export function getAbsensiImportHeaders(): PPPKAbsensiImportHeader[] {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.ABSENSI_IMPORT);
    if (raw) return JSON.parse(raw);
  } catch {}

  const sample: PPPKAbsensiImportHeader = {
    id: 'IMPORT-2026-I-BULK',
    periodeId: 'PERIOD-2026-I',
    namaFile: 'Laporan_Rekap_Presensi_PPPK_DJKI_Semester_I_2026.pdf',
    tanggalImport: '2026-07-02 09:30:00',
    importedBy: 'Admin SDM Presensi',
    status: 'TERVERIFIKASI',
    totalData: 12,
    errorCount: 0,
    catatan: 'Ekspor mesin absensi otomatis unit DJKI'
  };
  localStorage.setItem(PPPK_STORAGE.ABSENSI_IMPORT, JSON.stringify([sample]));
  return [sample];
}

export function getAbsensiDetailRows(importId?: string): PPPKAbsensiDetailRow[] {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.ABSENSI_DETAIL);
    let rows: PPPKAbsensiDetailRow[] = raw ? JSON.parse(raw) : [];

    if (rows.length === 0) {
      rows = seedSampleAbsensiRows();
    }

    if (importId) {
      return rows.filter(r => r.importId === importId);
    }
    return rows;
  } catch {
    return [];
  }
}

function seedSampleAbsensiRows(): PPPKAbsensiDetailRow[] {
  const employees = getAllEmployees();
  const pppkList = employees.filter(p => (p.jenisPegawai || p.status || '').toUpperCase().includes('PPPK'));

  const rows: PPPKAbsensiDetailRow[] = pppkList.map((p, idx) => {
    const alfa = idx === 0 ? 0 : idx === 1 ? 1 : idx === 2 ? 0 : idx === 3 ? 3 : 0;
    const { skor, kategori } = calculateAlfaScore(alfa);

    return {
      id: `ATT-ROW-${p.nip}`,
      importId: 'IMPORT-2026-I-BULK',
      nip: p.nip,
      nama: p.nama,
      unitKerja: p.unitKerja,
      jabatan: p.jabatan,
      totalHariKerja: 120,
      hadir: 120 - alfa - 2,
      terlambat: idx % 2 === 0 ? 1 : 0,
      pulangCepat: 0,
      alfa,
      dinasLuar: 2,
      wfh: 0,
      cuti: 0,
      izin: 0,
      sakit: 0,
      skorAlfa: skor,
      kategoriAlfa: kategori,
      keterangan: alfa === 0 ? 'Disiplin sangat baik tanpa catatan alfa' : `Alfa ${alfa} hari`
    };
  });

  localStorage.setItem(PPPK_STORAGE.ABSENSI_DETAIL, JSON.stringify(rows));
  return rows;
}

/**
 * Klasifikasi Alfa sesuai dokumen acuan resmi DJKI:
 * Alfa 0    -> Sangat Baik (5)
 * Alfa 1–2  -> Baik (4)
 * Alfa 3–5  -> Cukup (3)
 * Alfa 6–8  -> Kurang (2)
 * Alfa >8   -> Sangat Kurang (1)
 */
export function calculateAlfaScore(alfa: number): {
  skor: number;
  kategori: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Sangat Kurang';
} {
  if (alfa === 0) return { skor: 5, kategori: 'Sangat Baik' };
  if (alfa <= 2) return { skor: 4, kategori: 'Baik' };
  if (alfa <= 5) return { skor: 3, kategori: 'Cukup' };
  if (alfa <= 8) return { skor: 2, kategori: 'Kurang' };
  return { skor: 1, kategori: 'Sangat Kurang' };
}

export function saveImportedAbsensi(
  header: PPPKAbsensiImportHeader,
  details: PPPKAbsensiDetailRow[],
  userId: string,
  userName: string
): void {
  const headers = getAbsensiImportHeaders();
  headers.unshift(header);
  localStorage.setItem(PPPK_STORAGE.ABSENSI_IMPORT, JSON.stringify(headers));

  const allDetails = getAbsensiDetailRows().filter(r => r.importId !== header.id);
  const combined = [...details, ...allDetails];
  localStorage.setItem(PPPK_STORAGE.ABSENSI_DETAIL, JSON.stringify(combined));

  recordAuditLog(
    userId,
    userName,
    'IMPORT_ABSENSI',
    'Penilaian Kehadiran',
    header.id,
    undefined,
    `Total Data: ${details.length}`,
    `Import absensi bulk PDF: ${header.namaFile}`
  );
}

// ============================================================
// 9. PERHITUNGAN DETERMINISTIK HASIL PENILAIAN & FINALISASI
// ============================================================

export function calculateEvaluasiAkhir(penugasanId: string): PPPKEvaluasiAkhirDoc {
  const assign = getPenugasanPenilaiList().find(a => a.id === penugasanId);
  if (!assign) throw new Error('Data penugasan tidak ditemukan.');

  const hkDoc = getHasilKerjaDoc(penugasanId);
  const ratingHasilKerja = hkDoc?.ratingHasilKerjaFinal || 'SESUAI EKSPEKTASI';

  // Perilaku 3 Penilai
  const docPejabat = getPenilaianPerilakuDoc(penugasanId, 'PEJABAT_PENILAI');
  const docPns = getPenilaianPerilakuDoc(penugasanId, 'PNS_PENILAI');
  const docPppk = getPenilaianPerilakuDoc(penugasanId, 'PPPK_PENILAI');

  const nilaiPejabat = docPejabat?.rataRataScore || 4.2;
  const nilaiPns = docPns?.rataRataScore || 4.0;
  const nilaiPppk = docPppk?.rataRataScore || 4.1;

  // Formula Perilaku Penilai:
  // Pejabat 60% + Rekan Kerja 40% (di mana Rekan Kerja adalah rata-rata PNS dan PPPK)
  const rataRataRekanKerja = Number(((nilaiPns + nilaiPppk) / 2).toFixed(2));
  const bobotPejabatNilai = Number((nilaiPejabat * 0.60).toFixed(2));
  const bobotRekanKerjaNilai = Number((rataRataRekanKerja * 0.40).toFixed(2));
  const nilaiPerilakuPenilai = Number((bobotPejabatNilai + bobotRekanKerjaNilai).toFixed(2));

  // Kehadiran (Analisis Alfa)
  const attRows = getAbsensiDetailRows();
  const att = attRows.find(r => r.nip === assign.pppkDinilaiId);
  const alfaCount = att?.alfa ?? 0;
  const { skor: nilaiKehadiran, kategori: kategoriKehadiran } = calculateAlfaScore(alfaCount);

  // Nilai Akhir Perilaku = (Nilai Perilaku Penilai * 60%) + (Nilai Kehadiran * 40%)
  const bobotPerilakuMurni = Number((nilaiPerilakuPenilai * 0.60).toFixed(2));
  const bobotKehadiranMurni = Number((nilaiKehadiran * 0.40).toFixed(2));
  const nilaiAkhirPerilaku = Number((bobotPerilakuMurni + bobotKehadiranMurni).toFixed(2));

  // Rating Perilaku Kerja:
  // 4,32 – 5,00 = DIATAS EKSPEKTASI
  // 3,60 – 4,31 = SESUAI EKSPEKTASI
  // 1,00 – 3,59 = DIBAWAH EKSPEKTASI
  let ratingPerilakuKerja: PPPKRatingKinerja = 'SESUAI EKSPEKTASI';
  if (nilaiAkhirPerilaku >= 4.32) {
    ratingPerilakuKerja = 'DIATAS EKSPEKTASI';
  } else if (nilaiAkhirPerilaku >= 3.60) {
    ratingPerilakuKerja = 'SESUAI EKSPEKTASI';
  } else {
    ratingPerilakuKerja = 'DIBAWAH EKSPEKTASI';
  }

  // Predikat Penilaian Kinerja (Matriks Kombinasi Hasil Kerja dan Perilaku Kerja)
  const predikatKinerja = determinePredikat(ratingHasilKerja, ratingPerilakuKerja);

  // Existing saved eval doc check
  const rawSaved = localStorage.getItem(PPPK_STORAGE.EVALUASI_AKHIR);
  const savedDocs: PPPKEvaluasiAkhirDoc[] = rawSaved ? JSON.parse(rawSaved) : [];
  const existing = savedDocs.find(d => d.penugasanId === penugasanId);

  const defaultRekomendasi: PPPKRekomendasiKinerja[] = [
    'Perpanjangan Perjanjian Kinerja',
    'Dipertahankan'
  ];

  const evalDoc: PPPKEvaluasiAkhirDoc = {
    id: `EVAL-AKHIR-${penugasanId}`,
    penugasanId,
    periodeId: assign.periodeId,
    pppkId: assign.pppkDinilaiId,

    nilaiPejabat,
    nilaiPns,
    nilaiPppk,
    rataRataRekanKerja,
    bobotPejabatNilai,
    bobotRekanKerjaNilai,
    nilaiPerilakuPenilai,

    alfaCount,
    nilaiKehadiran,
    kategoriKehadiran,

    bobotPerilakuMurni,
    bobotKehadiranMurni,
    nilaiAkhirPerilaku,
    ratingPerilakuKerja,

    ratingHasilKerja,
    predikatKinerja,
    rekomendasi: existing?.rekomendasi || defaultRekomendasi,
    catatanRekomendasi: existing?.catatanRekomendasi || 'Menunjukkan loyalitas, integritas prima, dan kinerja yang konsisten memenuhi ekspektasi organisasi.',

    pejabatPenilaiNama: assign.pejabatPenilaiNama,
    pejabatPenilaiNip: assign.pejabatPenilaiNip,
    pejabatPenilaiJabatan: assign.pejabatPenilaiJabatan,
    pejabatPenilaiPangkat: assign.pejabatPenilaiPangkat,
    pejabatPenilaiUnit: assign.pejabatPenilaiUnit,

    atasanPejabatPenilaiNama: assign.atasanPejabatPenilaiNama,
    atasanPejabatPenilaiNip: assign.atasanPejabatPenilaiNip,
    atasanPejabatPenilaiJabatan: assign.atasanPejabatPenilaiJabatan,
    atasanPejabatPenilaiPangkat: assign.atasanPejabatPenilaiPangkat,
    atasanPejabatPenilaiUnit: assign.atasanPejabatPenilaiUnit,

    isFinal: existing?.isFinal || false,
    finalizedAt: existing?.finalizedAt,
    finalizedBy: existing?.finalizedBy,
    isUnlockedForCorrection: existing?.isUnlockedForCorrection || false,
    alasanBukaKembali: existing?.alasanBukaKembali,
    unlockedAt: existing?.unlockedAt,
    unlockedBy: existing?.unlockedBy,

    createdAt: existing?.createdAt || new Date().toLocaleString('id-ID'),
    updatedAt: new Date().toLocaleString('id-ID')
  };

  return evalDoc;
}

export function determinePredikat(
  hasilKerja: PPPKRatingKinerja,
  perilaku: PPPKRatingKinerja
): PPPKPredikatKinerja {
  if (hasilKerja === 'DIATAS EKSPEKTASI' && perilaku === 'DIATAS EKSPEKTASI') {
    return 'Sangat Baik';
  }
  if (
    (hasilKerja === 'DIATAS EKSPEKTASI' && perilaku === 'SESUAI EKSPEKTASI') ||
    (hasilKerja === 'SESUAI EKSPEKTASI' && perilaku === 'DIATAS EKSPEKTASI') ||
    (hasilKerja === 'SESUAI EKSPEKTASI' && perilaku === 'SESUAI EKSPEKTASI')
  ) {
    return 'Baik';
  }
  if (
    (hasilKerja === 'SESUAI EKSPEKTASI' && perilaku === 'DIBAWAH EKSPEKTASI') ||
    (hasilKerja === 'DIBAWAH EKSPEKTASI' && perilaku === 'SESUAI EKSPEKTASI')
  ) {
    return 'Butuh Perbaikan';
  }
  if (hasilKerja === 'DIBAWAH EKSPEKTASI' && perilaku === 'DIBAWAH EKSPEKTASI') {
    return 'Kurang';
  }
  return 'Baik';
}

export function saveEvaluasiAkhirDoc(
  doc: PPPKEvaluasiAkhirDoc,
  userId: string,
  userName: string
): void {
  try {
    const raw = localStorage.getItem(PPPK_STORAGE.EVALUASI_AKHIR);
    const docs: PPPKEvaluasiAkhirDoc[] = raw ? JSON.parse(raw) : [];
    const idx = docs.findIndex(d => d.penugasanId === doc.penugasanId);

    doc.updatedAt = new Date().toLocaleString('id-ID');

    if (idx >= 0) {
      docs[idx] = doc;
    } else {
      docs.push(doc);
    }
    localStorage.setItem(PPPK_STORAGE.EVALUASI_AKHIR, JSON.stringify(docs));
    recordAuditLog(userId, userName, 'SAVE_EVALUASI', 'Hasil Penilaian', doc.id, undefined, doc.predikatKinerja, `Menyimpan Hasil Evaluasi Predikat ${doc.predikatKinerja}`);
  } catch (err) {
    console.error('Failed to save evaluasi akhir doc:', err);
  }
}

/**
 * Validasi Sebelum Finalisasi
 */
export function validateFinalization(penugasanId: string): {
  canFinalize: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const assign = getPenugasanPenilaiList().find(a => a.id === penugasanId);
  if (!assign) {
    errors.push('Data penugasan penilai tidak ditemukan.');
    return { canFinalize: false, errors, warnings };
  }

  // 1. Pejabat Penilai disetujui
  if (assign.status !== 'DISETUJUI' && assign.status !== 'DALAM_PENILAIAN') {
    errors.push('Pejabat Penilai belum diverifikasi dan disetujui oleh Admin SDM.');
  }

  // 2. Rekan PNS & PPPK
  if (!assign.rekanPnsId) {
    errors.push('Rekan Kerja PNS belum ditetapkan.');
  }
  if (!assign.rekanPppkId) {
    errors.push('Rekan Kerja PPPK belum ditetapkan.');
  }

  // 3. RHK Hasil Kerja
  const hk = getHasilKerjaDoc(penugasanId);
  if (!hk || hk.items.length === 0) {
    errors.push('Rencana Hasil Kerja (RHK) belum diisi.');
  } else {
    const unfilled = hk.items.some(i => !i.target || i.realisasi === undefined);
    if (unfilled) {
      errors.push('Terdapat target atau realisasi RHK yang masih kosong.');
    }
  }

  // 4. Perilaku 3 Penilai
  const docPejabat = getPenilaianPerilakuDoc(penugasanId, 'PEJABAT_PENILAI');
  const docPns = getPenilaianPerilakuDoc(penugasanId, 'PNS_PENILAI');
  const docPppk = getPenilaianPerilakuDoc(penugasanId, 'PPPK_PENILAI');

  if (!docPejabat || docPejabat.status !== 'SUBMITTED') {
    errors.push('Penilaian Perilaku oleh Pejabat Penilai belum dikirim.');
  }
  if (!docPns || docPns.status !== 'SUBMITTED') {
    errors.push('Penilaian Perilaku oleh Rekan Kerja PNS belum selesai.');
  }
  if (!docPppk || docPppk.status !== 'SUBMITTED') {
    errors.push('Penilaian Perilaku oleh Rekan Kerja PPPK belum selesai.');
  }

  // 5. Presensi Kehadiran
  const attRows = getAbsensiDetailRows();
  const att = attRows.find(r => r.nip === assign.pppkDinilaiId);
  if (!att) {
    warnings.push('Data presensi tidak ditemukan pada import terkini (default alfa 0 akan digunakan).');
  }

  return {
    canFinalize: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Finalisasi Evaluasi Kinerja (Semua Komponen Terkunci)
 */
export function finalizeEvaluation(
  penugasanId: string,
  userId: string,
  userName: string
): PPPKEvaluasiAkhirDoc {
  const val = validateFinalization(penugasanId);
  if (!val.canFinalize) {
    throw new Error(`Tidak dapat difinalisasi: ${val.errors.join('; ')}`);
  }

  const evalDoc = calculateEvaluasiAkhir(penugasanId);
  const now = new Date().toLocaleString('id-ID');

  evalDoc.isFinal = true;
  evalDoc.finalizedAt = now;
  evalDoc.finalizedBy = userName;
  evalDoc.isUnlockedForCorrection = false;

  saveEvaluasiAkhirDoc(evalDoc, userId, userName);

  // Update Penugasan status to FINAL
  const assignments = getPenugasanPenilaiList();
  const aIdx = assignments.findIndex(a => a.id === penugasanId);
  if (aIdx >= 0) {
    assignments[aIdx].status = 'FINAL';
    assignments[aIdx].updatedAt = now;
    assignments[aIdx].updatedBy = userName;
    localStorage.setItem(PPPK_STORAGE.ASSIGNMENTS, JSON.stringify(assignments));
  }

  recordAuditLog(
    userId,
    userName,
    'FINALIZE',
    'Finalisasi',
    penugasanId,
    'DALAM_PENILAIAN',
    'FINAL',
    `Finalisasi evaluasi kinerja PPPK. Predikat: ${evalDoc.predikatKinerja}, Rating Hasil Kerja: ${evalDoc.ratingHasilKerja}, Rating Perilaku: ${evalDoc.ratingPerilakuKerja}`
  );

  return evalDoc;
}

/**
 * Admin Buka Kembali Penilaian (Unlocking with mandatory reason & audit)
 */
export function bukaKembaliPenilaian(
  penugasanId: string,
  alasan: string,
  userId: string,
  userName: string
): PPPKEvaluasiAkhirDoc {
  if (!alasan || alasan.trim().length < 5) {
    throw new Error('Alasan pembukaan kembali evaluasi wajib diisi minimal 5 karakter untuk keperluan audit trail.');
  }

  const evalDoc = calculateEvaluasiAkhir(penugasanId);
  const now = new Date().toLocaleString('id-ID');

  evalDoc.isFinal = false;
  evalDoc.isUnlockedForCorrection = true;
  evalDoc.alasanBukaKembali = alasan;
  evalDoc.unlockedAt = now;
  evalDoc.unlockedBy = userName;

  saveEvaluasiAkhirDoc(evalDoc, userId, userName);

  const assignments = getPenugasanPenilaiList();
  const aIdx = assignments.findIndex(a => a.id === penugasanId);
  if (aIdx >= 0) {
    assignments[aIdx].status = 'DALAM_PENILAIAN';
    assignments[aIdx].updatedAt = now;
    assignments[aIdx].updatedBy = userName;
    localStorage.setItem(PPPK_STORAGE.ASSIGNMENTS, JSON.stringify(assignments));
  }

  recordAuditLog(
    userId,
    userName,
    'UNLOCK_EVALUATION',
    'Finalisasi',
    penugasanId,
    'FINAL',
    'DALAM_PENILAIAN',
    `Membuka kembali evaluasi yang sudah final. Alasan: ${alasan}`
  );

  return evalDoc;
}

// ============================================================
// 10. DOKUMEN CETAK & EKSPOR LAPORAN
// ============================================================

/**
 * Cetak Dokumen Evaluasi Resmi (Format 9 Bagian Sesuai Dokumen Acuan)
 */
export function generatePdfDokumenEvaluasi(evalDoc: PPPKEvaluasiAkhirDoc): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const assign = getPenugasanPenilaiList().find(a => a.id === evalDoc.penugasanId);

  // Header Garuda / Instansi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEMENTERIAN HUKUM DAN HAK ASASI MANUSIA R.I.', 105, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text('DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL', 105, 23, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Jalan H.R. Rasuna Said Kav. 8-9, Kuningan, Jakarta Selatan 12940', 105, 27, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(15, 30, 195, 30);
  doc.setLineWidth(0.2);
  doc.line(15, 31, 195, 31);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DOKUMEN EVALUASI KINERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA (PPPK)', 105, 39, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Periode: ${assign?.year || 2026} (Semester ${assign?.semester || 'I'})`, 105, 44, { align: 'center' });

  let y = 52;

  // Bagian 1: Pegawai yang Dinilai
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. PEGAWAI YANG DINILAI', 15, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 125 } },
    body: [
      ['Nama', ':', assign?.pppkNama || '-'],
      ['NIP', ':', assign?.pppkNip || '-'],
      ['Pangkat / Golongan Ruang', ':', assign?.pppkPangkat || 'Golongan IX'],
      ['Jabatan', ':', assign?.pppkJabatan || '-'],
      ['Unit Kerja', ':', assign?.pppkUnitKerja || 'Direktorat Jenderal Kekayaan Intelektual']
    ]
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  // Bagian 2: Pejabat Penilai Kinerja
  doc.setFont('helvetica', 'bold');
  doc.text('2. PEJABAT PENILAI KINERJA', 15, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 125 } },
    body: [
      ['Nama', ':', evalDoc.pejabatPenilaiNama || '-'],
      ['NIP', ':', evalDoc.pejabatPenilaiNip || '-'],
      ['Pangkat / Golongan Ruang', ':', evalDoc.pejabatPenilaiPangkat || 'Pembina (IV/a)'],
      ['Jabatan', ':', evalDoc.pejabatPenilaiJabatan || '-'],
      ['Unit Kerja', ':', evalDoc.pejabatPenilaiUnit || 'Direktorat Jenderal Kekayaan Intelektual']
    ]
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  // Bagian 3: Atasan Pejabat Penilai Kinerja
  doc.setFont('helvetica', 'bold');
  doc.text('3. ATASAN PEJABAT PENILAI KINERJA', 15, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 125 } },
    body: [
      ['Nama', ':', evalDoc.atasanPejabatPenilaiNama || '-'],
      ['NIP', ':', evalDoc.atasanPejabatPenilaiNip || '-'],
      ['Pangkat / Golongan Ruang', ':', evalDoc.atasanPejabatPenilaiPangkat || 'Pembina Utama Muda (IV/c)'],
      ['Jabatan', ':', evalDoc.atasanPejabatPenilaiJabatan || '-'],
      ['Unit Kerja', ':', evalDoc.atasanPejabatPenilaiUnit || 'Direktorat Jenderal Kekayaan Intelektual']
    ]
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  // Bagian 4 & 5 & 6: Evaluasi Kinerja
  doc.setFont('helvetica', 'bold');
  doc.text('4. EVALUASI KINERJA PEGAWAI', 15, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['KOMPONEN EVALUASI', 'HASIL EVALUASI / RATING', 'KETERANGAN']],
    body: [
      ['Rating Hasil Kerja', evalDoc.ratingHasilKerja, 'Berdasarkan capaian Realisasi vs Target pada Rencana Hasil Kerja'],
      ['Rating Perilaku Kerja', evalDoc.ratingPerilakuKerja, `Nilai Akhir: ${evalDoc.nilaiAkhirPerilaku.toFixed(2)} (60% Perilaku 360° + 40% Kehadiran)`],
      ['PREDIKAT KINERJA PERIODIK', evalDoc.predikatKinerja, 'Kombinasi Rating Hasil Kerja dan Rating Perilaku']
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { cellWidth: 70 }
    }
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  // Bagian 7: Rekomendasi
  doc.setFont('helvetica', 'bold');
  doc.text('5. REKOMENDASI TINJAUAN KINERJA', 15, y);
  y += 2;

  const rekStr = evalDoc.rekomendasi.length > 0 ? evalDoc.rekomendasi.join(', ') : 'Dipertahankan';
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.2 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 125 } },
    body: [
      ['Rekomendasi', ':', rekStr],
      ['Catatan / Umpan Balik', ':', evalDoc.catatanRekomendasi || '-']
    ]
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 8;

  // Bagian Tanda Tangan
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  const col1X = 25;
  const col2X = 135;

  doc.text('Pegawai yang Dinilai,', col1X, y);
  doc.text(`Jakarta, ${evalDoc.finalizedAt ? evalDoc.finalizedAt.split(' ')[0] : new Date().toLocaleDateString('id-ID')}`, col2X, y - 4);
  doc.text('Pejabat Penilai Kinerja,', col2X, y);

  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.text(assign?.pppkNama || '-', col1X, y);
  doc.text(evalDoc.pejabatPenilaiNama || '-', col2X, y);

  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${assign?.pppkNip || '-'}`, col1X, y + 4);
  doc.text(`NIP. ${evalDoc.pejabatPenilaiNip || '-'}`, col2X, y + 4);

  // Atasan Penilai
  y += 15;
  doc.text('Mengetahui,', 105, y, { align: 'center' });
  doc.text('Atasan Pejabat Penilai Kinerja,', 105, y + 4, { align: 'center' });
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.text(evalDoc.atasanPejabatPenilaiNama || '-', 105, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${evalDoc.atasanPejabatPenilaiNip || '-'}`, 105, y + 4, { align: 'center' });

  doc.save(`Dokumen_Evaluasi_PPPK_${assign?.pppkNip || 'PPPK'}.pdf`);
}

/**
 * Cetak Penilaian Perilaku Kerja PPPK (28 Butir Pertanyaan Lengkap)
 */
export function generatePdfPenilaianPerilaku(evalDoc: PPPKEvaluasiAkhirDoc): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const assign = getPenugasanPenilaiList().find(a => a.id === evalDoc.penugasanId);
  const questions = getMasterPertanyaan();

  const docPejabat = getPenilaianPerilakuDoc(evalDoc.penugasanId, 'PEJABAT_PENILAI');
  const docPns = getPenilaianPerilakuDoc(evalDoc.penugasanId, 'PNS_PENILAI');
  const docPppk = getPenilaianPerilakuDoc(evalDoc.penugasanId, 'PPPK_PENILAI');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PENILAIAN PERILAKU KERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA (PPPK)', 105, 18, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Instrumen Penilaian Perilaku 360° Berbasis Core Values ASN BerAKHLAK', 105, 23, { align: 'center' });

  doc.setLineWidth(0.3);
  doc.line(15, 26, 195, 26);

  let y = 32;

  // Identitas & Tim Penilai
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: { fontSize: 7.5, cellPadding: 1 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 130 } },
    body: [
      ['PPPK yang Dinilai', ':', `${assign?.pppkNama} (NIP. ${assign?.pppkNip})`],
      ['Pejabat Penilai (60%)', ':', `${evalDoc.pejabatPenilaiNama} (NIP. ${evalDoc.pejabatPenilaiNip})`],
      ['Rekan Kerja PNS (20%)', ':', `${assign?.rekanPnsNama || '-'} (NIP. ${assign?.rekanPnsNip || '-'})`],
      ['Rekan Kerja PPPK (20%)', ':', `${assign?.rekanPppkNama || '-'} (NIP. ${assign?.rekanPppkNip || '-'})`]
    ]
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 3;

  // 28 Pertanyaan Table
  const tableRows: any[] = [];
  let currentAspek = '';

  questions.forEach(q => {
    if (q.aspek !== currentAspek) {
      currentAspek = q.aspek;
      tableRows.push([
        { content: `ASPEK: ${currentAspek.toUpperCase()}`, colSpan: 5, styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] } }
      ]);
    }

    const sPej = docPejabat?.answers[q.id] || 4;
    const sPns = docPns?.answers[q.id] || 4;
    const sPppk = docPppk?.answers[q.id] || 4;

    tableRows.push([
      q.nomor,
      q.pertanyaan,
      sPej,
      sPns,
      sPppk
    ]);
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['No', 'Indikator Perilaku BerAKHLAK', 'Pejabat (60%)', 'PNS (20%)', 'PPPK (20%)']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7, cellPadding: 1.3 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 112 },
      2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' }
    }
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  // Rekapitulasi Skor
  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['KOMPONEN PERILAKU & KEHADIRAN', 'NILAI MURNI', 'BOBOT', 'KONTRIBUSI BOBOT']],
    body: [
      ['Rata-Rata Penilaian Pejabat Penilai', evalDoc.nilaiPejabat.toFixed(2), '60%', evalDoc.bobotPejabatNilai.toFixed(2)],
      ['Rata-Rata Rekan Kerja (PNS & PPPK)', evalDoc.rataRataRekanKerja.toFixed(2), '40%', evalDoc.bobotRekanKerjaNilai.toFixed(2)],
      ['Subtotal Nilai Perilaku Penilai 360°', evalDoc.nilaiPerilakuPenilai.toFixed(2), '60%', evalDoc.bobotPerilakuMurni.toFixed(2)],
      [`Penilaian Kehadiran (Analisis Alfa: ${evalDoc.alfaCount} hari)`, evalDoc.nilaiKehadiran.toFixed(2), '40%', evalDoc.bobotKehadiranMurni.toFixed(2)],
      ['NILAI AKHIR PERILAKU KERJA', evalDoc.nilaiAkhirPerilaku.toFixed(2), '100%', evalDoc.ratingPerilakuKerja]
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 90, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 35, halign: 'center', fontStyle: 'bold' }
    }
  });

  doc.save(`Penilaian_Perilaku_PPPK_${assign?.pppkNip || 'PPPK'}.pdf`);
}

/**
 * Cetak Penilaian Hasil Kerja PPPK (RHK, Target, Realisasi, Rating)
 */
export function generatePdfPenilaianHasilKerja(evalDoc: PPPKEvaluasiAkhirDoc): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const assign = getPenugasanPenilaiList().find(a => a.id === evalDoc.penugasanId);
  const hkDoc = getHasilKerjaDoc(evalDoc.penugasanId);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PENILAIAN HASIL KERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA (PPPK)', 105, 18, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Rencana Hasil Kerja, Target, Realisasi, dan Rating Hasil Kerja', 105, 23, { align: 'center' });

  doc.setLineWidth(0.3);
  doc.line(15, 26, 195, 26);

  let y = 32;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' }, 1: { cellWidth: 5 }, 2: { cellWidth: 130 } },
    body: [
      ['PPPK yang Dinilai', ':', `${assign?.pppkNama} (NIP. ${assign?.pppkNip})`],
      ['Jabatan / Unit Kerja', ':', `${assign?.pppkJabatan} / ${assign?.pppkUnitKerja}`],
      ['Pejabat Penilai', ':', `${evalDoc.pejabatPenilaiNama} (NIP. ${evalDoc.pejabatPenilaiNip})`]
    ]
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;

  const rhkRows = (hkDoc?.items || []).map(i => [
    i.no,
    i.rencanaHasilKerja,
    `${i.target} ${i.satuan}`,
    `${i.realisasi} ${i.satuanRealisasi || i.satuan}`,
    i.buktiDukung && i.buktiDukung.length > 0 ? `${i.buktiDukung.length} Dokumen` : 'Tidak Ada',
    i.ratingManual || i.ratingOtomatis
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['No', 'Rencana Hasil Kerja (RHK)', 'Target', 'Realisasi', 'Bukti Dukung', 'Rating']],
    body: rhkRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 28, halign: 'center', fontStyle: 'bold' }
    }
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`RATING HASIL KERJA FINAL: ${evalDoc.ratingHasilKerja}`, 15, y);

  doc.save(`Penilaian_Hasil_Kerja_PPPK_${assign?.pppkNip || 'PPPK'}.pdf`);
}

/**
 * Ekspor Rekapitulasi Penilaian Kinerja PPPK ke Excel (XLSX)
 */
export function exportEvaluasiPppkToExcel(periodeId?: string): void {
  const assignments = getPenugasanPenilaiList(periodeId);

  const dataRows = assignments.map((a, idx) => {
    const evalDoc = calculateEvaluasiAkhir(a.id);
    return {
      No: idx + 1,
      'Nama PPPK': a.pppkNama,
      NIP: a.pppkNip,
      Jabatan: a.pppkJabatan,
      'Unit Kerja': a.pppkUnitKerja,
      'Pejabat Penilai': a.pejabatPenilaiNama,
      'Rekan PNS': a.rekanPnsNama || '-',
      'Rekan PPPK': a.rekanPppkNama || '-',
      'Nilai Pejabat (60%)': evalDoc.nilaiPejabat,
      'Rata-rata Rekan (40%)': evalDoc.rataRataRekanKerja,
      'Nilai Perilaku 360°': evalDoc.nilaiPerilakuPenilai,
      'Nilai Kehadiran': evalDoc.nilaiKehadiran,
      'Alfa (Hari)': evalDoc.alfaCount,
      'Nilai Akhir Perilaku': evalDoc.nilaiAkhirPerilaku,
      'Rating Perilaku': evalDoc.ratingPerilakuKerja,
      'Rating Hasil Kerja': evalDoc.ratingHasilKerja,
      'PREDIKAT KINERJA': evalDoc.predikatKinerja,
      Rekomendasi: evalDoc.rekomendasi.join('; '),
      Status: a.status
    };
  });

  const ws = XLSX.utils.json_to_sheet(dataRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Penilaian PPPK');

  XLSX.writeFile(wb, `Rekap_Penilaian_Kinerja_PPPK_${new Date().getFullYear()}.xlsx`);
}

/**
 * Validasi Pra-Finalisasi terstruktur dengan checklist status kelengkapan
 */
export function validatePreFinalisasi(penugasanId: string) {
  const assign = getPenugasanPenilaiList().find(a => a.id === penugasanId);
  const v = validateFinalization(penugasanId);
  const hk = getHasilKerjaDoc(penugasanId);
  const docPejabat = getPenilaianPerilakuDoc(penugasanId, 'PEJABAT_PENILAI');
  const docPns = getPenilaianPerilakuDoc(penugasanId, 'PNS_PENILAI');
  const docPppk = getPenilaianPerilakuDoc(penugasanId, 'PPPK_PENILAI');
  const attRows = getAbsensiDetailRows();
  const att = attRows.find(r => r.nip === assign?.pppkDinilaiId);

  const checklist = [
    {
      label: 'Pejabat Penilai Disetujui',
      detail: assign?.pejabatPenilaiNama ? `${assign.pejabatPenilaiNama} (${assign.status})` : 'Belum ditetapkan',
      passed: assign?.status === 'DISETUJUI' || assign?.status === 'DALAM_PENILAIAN' || assign?.status === 'FINAL'
    },
    {
      label: 'Rekan Penilai PNS & PPPK Ditetapkan',
      detail: assign?.rekanPnsNama && assign?.rekanPppkNama ? `PNS: ${assign.rekanPnsNama} | PPPK: ${assign.rekanPppkNama}` : 'Belum lengkap',
      passed: Boolean(assign?.rekanPnsId && assign?.rekanPppkId)
    },
    {
      label: 'RHK Hasil Kerja Diisi & Dinilai',
      detail: hk?.items && hk.items.length > 0 ? `${hk.items.length} butir RHK (${hk.ratingHasilKerjaFinal})` : 'Belum ada RHK',
      passed: Boolean(hk && hk.items.length > 0 && !hk.items.some(i => !i.target || i.realisasi === undefined))
    },
    {
      label: 'Penilaian Perilaku oleh Pejabat Penilai (28 Soal)',
      detail: docPejabat?.status === 'SUBMITTED' ? `Selesai (${docPejabat.rataRataScore})` : 'Belum submit',
      passed: docPejabat?.status === 'SUBMITTED'
    },
    {
      label: 'Penilaian Perilaku oleh Rekan PNS (28 Soal)',
      detail: docPns?.status === 'SUBMITTED' ? `Selesai (${docPns.rataRataScore})` : 'Belum submit',
      passed: docPns?.status === 'SUBMITTED'
    },
    {
      label: 'Penilaian Perilaku oleh Rekan PPPK (28 Soal)',
      detail: docPppk?.status === 'SUBMITTED' ? `Selesai (${docPppk.rataRataScore})` : 'Belum submit',
      passed: docPppk?.status === 'SUBMITTED'
    },
    {
      label: 'Presensi Kehadiran Terverifikasi',
      detail: att ? `Kehadiran: ${att.hadir} hari, Alfa: ${att.alfa} hari` : 'Belum ada rekapan absensi',
      passed: Boolean(att)
    }
  ];

  return {
    valid: v.canFinalize,
    errors: v.errors,
    warnings: v.warnings,
    checklist
  };
}

export const finalisasiPenilaian = finalizeEvaluation;
export const getMasterPertanyaanPerilaku = getMasterPertanyaan;
export const saveMasterPertanyaanPerilaku = (questions: PPPKMasterPertanyaanPerilaku[], userId: string, userName: string) => {
  localStorage.setItem(PPPK_STORAGE.QUESTIONS, JSON.stringify(questions));
  recordAuditLog(userId, userName, 'UPDATE_QUESTIONS', 'Master Pertanyaan', 'ALL', undefined, undefined, 'Memperbarui master pertanyaan perilaku BerAKHLAK');
};
export const getMasterPeriodePenilaian = getMasterPeriods;
export const saveMasterPeriodePenilaian = saveMasterPeriod;
export const deleteMasterPeriodePenilaian = deleteMasterPeriod;
export const tetapkanRekanKerja = tetapkanRekanKerjaGanda;

export function calculateNilaiKehadiranFromAlfa(alfa: number) {
  const res = calculateAlfaScore(alfa);
  return {
    nilai: res.skor,
    kategori: res.kategori
  };
}

export function saveAbsensiDetailRows(
  rows: PPPKAbsensiDetailRow[],
  userId: string = 'ADMIN',
  userName: string = 'Admin SDM'
): void {
  try {
    localStorage.setItem(PPPK_STORAGE.ABSENSI_DETAIL, JSON.stringify(rows));
    recordAuditLog(
      userId,
      userName,
      'UPDATE_ABSENSI',
      'Penilaian Kehadiran',
      'BATCH',
      undefined,
      undefined,
      `Menyimpan ${rows.length} baris data presensi PPPK`
    );
  } catch (err) {
    console.error('Failed to save absensi rows:', err);
  }
}
