/**
 * pppkOfficialDocumentService.ts
 * Dedicated Enterprise Document Generator & Data Resolver for Official Evaluasi Kinerja PPPK
 * Based on Permenpan RB Nomor 6 Tahun 2022 & Standar DJKI Kementerian Hukum RI.
 * 
 * 3 DOKUMEN RESMI:
 * 1. EVALUASI PENILAIAN KINERJA PPPK (2 Halaman - Formulir Utama & Matriks Permenpan RB 6/2022)
 * 2. PENILAIAN PERILAKU KERJA PPPK (2 Halaman Landscape - 7 Aspek BerAKHLAK 28 Butir & Kehadiran)
 * 3. PENILAIAN HASIL KERJA PPPK (1 Halaman Landscape - Rencana Hasil Kerja Target vs Realisasi)
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PPPKEvaluation,
  PPPKHasilKerjaItem,
  PPPKBerakhlakAspectItem,
  PPPKPejabatInfo,
  Pegawai,
  SKPRecord
} from '../types';
import { getAllEmployees } from './pppkEvaluationService';
import { getAtasanLangsung } from './strukturOrganisasiService';

// STANDAR 28 PERTANYAAN BERAKHLAK DOKUMEN RESMI EVALUASI PPPK DJKI
export const OFFICIAL_BERAKHLAK_ASPECTS: {
  no: number;
  aspek: string;
  questions: { code: string; text: string }[];
}[] = [
  {
    no: 1,
    aspek: '1. Berorientasi Pelayanan',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana respon pegawai terhadap suatu kritik baik dari pimpinan, rekan kerja maupun pelayanan tekhnis ?'
      },
      {
        code: 'b',
        text: 'Bagaimana kualitas pegawai dalam melakukan langkah perbaikan pada pekerjaannya ?'
      },
      {
        code: 'c',
        text: 'Bagaimana tingkat inisiatif dan proaktif pegawai dalam menawarkan bantuan tanpa diminta ?'
      },
      {
        code: 'd',
        text: 'Bagaimana tindakan pegawai dalam menerapkan prinsip 3S (Senyum, Sapa, Salam) pada rutinitas pekerjaan setiap hari?'
      }
    ]
  },
  {
    no: 2,
    aspek: '2. Akuntabel',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana pegawai yang anda nilai dalam memahami tugas pokok, fungsi, dan wewenang yang menjadi tanggung jawab ybs ?'
      },
      {
        code: 'b',
        text: 'Bagaimana kinerja pegawai yang anda nilai dalam menyelesaikan target ?'
      },
      {
        code: 'c',
        text: 'Bagaimana pegawai yang anda nilai dalam merespon teguran atau evaluasi yang diberikan terkait hasil pekerjaan ?'
      },
      {
        code: 'd',
        text: 'Apakah pegawai yang anda nilai telah melaksanakan tugas sesuai dengan SOP ?'
      }
    ]
  },
  {
    no: 3,
    aspek: '3. Kompeten',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana pegawai memecahkan masalah teknis atau kendala yang menjadi tugas tanggung jawabnya?'
      },
      {
        code: 'b',
        text: 'Bagaimana keterlibatan aktif pegawai memberikan suatu pendapat dalam penyelesaian masalah pekerjaan ?'
      },
      {
        code: 'c',
        text: 'Bagaimana respon pegawai dalam menerima informasi atau intruksi baik dari pimpinan maupun rekan kerja?'
      },
      {
        code: 'd',
        text: 'Bagaimana kualitas pegawai dalam meminimalisir tingkat eror dalam pekerjaannya ?'
      }
    ]
  },
  {
    no: 4,
    aspek: '4. Harmonis',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana pegawai menghargai keberagaman latar belakang rekan kerja ?'
      },
      {
        code: 'b',
        text: 'Bagaimana tingkat kepeduliaan pegawai membantu rekan kerja tim yang mengalami penumpukan pekerjaan ?'
      },
      {
        code: 'c',
        text: 'Bagaimana pegawai dalam membagikan ilmu, pengalaman, atau informasi positif kepada rekan kerja maupun stakeholder ?'
      },
      {
        code: 'd',
        text: 'Bagaimana tingkat pegawai dalam meredam konflik, menghindari perdebatan destruktif, dan menyelesaikan masalah dengan cara damai/konstruktif?'
      }
    ]
  },
  {
    no: 5,
    aspek: '5. Loyal',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana kesediaan pegawai untuk bekerja lembur atau meluangkan waktu ekstra diluar jam operasional?'
      },
      {
        code: 'b',
        text: 'Bagaimana kualitas pegawai dalam menyelesaikan tugas dan tanggung jawab pekerjaan tanpa harus diawasi terus-menerus?'
      },
      {
        code: 'c',
        text: 'Bagaimana pegawai merespon pekerjaan saat WFH?'
      },
      {
        code: 'd',
        text: 'Bagaimana kualitas pegawai menyelesaikan target tim saat memiliki hubungan yang kurang harmonis dengan rekan kerja ?'
      }
    ]
  },
  {
    no: 6,
    aspek: '6. Adaptif',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana pegawai menyesuaikan diri ketika terjadi perubahan struktur organisasi di unit kerjanya ?'
      },
      {
        code: 'b',
        text: 'Bagaimana tingkat kecepatan pegawai yang anda nilai dalam memahami tugas dan fungsi yang menjadi tanggung jawab barunya ?'
      },
      {
        code: 'c',
        text: 'Bagaimana pegawai menyesuaiakan diri dengan sistem/aplikasi/prosedur baru ditempat kerja ?'
      },
      {
        code: 'd',
        text: 'Bagaimana kemampuan pegawai mengelola pekerjaan agar semua tugas dapat diselesaikan tanpa terbengkalai?'
      }
    ]
  },
  {
    no: 7,
    aspek: '7. Kolaboratif',
    questions: [
      {
        code: 'a',
        text: 'Bagaimana peran aktif pegawai dalam menunjukkan semangat dan kolaborasi tim ?'
      },
      {
        code: 'b',
        text: 'Bagaimana keterbukaan pegawai dalam menyampaikan kritik dan saran secara membangun dan profesional dalam tim ?'
      },
      {
        code: 'c',
        text: 'Bagaimana pegawai mampu mengelola emosi dan tetap bekerja optimal saat saran yang diberikan tidak diterima ?'
      },
      {
        code: 'd',
        text: 'Bagaimana koordinasi pegawai dengan pihak eksternal diluar tim untuk mendukung kelancaran tugas ?'
      }
    ]
  }
];

// DEFAULT RENCANA HASIL KERJA
export const DEFAULT_OFFICIAL_HASIL_KERJA: PPPKHasilKerjaItem[] = [
  {
    no: 1,
    rencanaHasilKerja: 'Melaksanakan Tugas dari Atasan atau Pimpinan Langsung baik lisan maupun tertulis',
    target: 5,
    realisasi: 151
  },
  {
    no: 2,
    rencanaHasilKerja: 'Menyiapkan bahan konsep Peraturan Perundang-undangan dibidang Hak Cipta dan Desain Industri',
    target: 1,
    realisasi: 23
  },
  {
    no: 3,
    rencanaHasilKerja: 'Menerima Surat Masuk terkait Tanggapan Hukum, Surat Umum dan Permintaan Analisa Hukum',
    target: 5,
    realisasi: 130
  },
  {
    no: 4,
    rencanaHasilKerja: 'Menyiapkan bahan dan Membuat Konsep Surat Tanggapan Hukum dan Analisa Hukum',
    target: 2,
    realisasi: 37
  },
  {
    no: 5,
    rencanaHasilKerja: 'Menyiapkan bahan Konsultasi Teknis dan Wawancara Riset Masyarakat',
    target: 2,
    realisasi: 8
  }
];

/**
 * Helper to calculate Predikat Kinerja Pegawai based on Permenpan RB Nomor 6 Tahun 2022
 */
export function getPredikatKinerjaPermenpan(
  ratingHasil: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI' | string,
  ratingPerilaku: 'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI' | string
): 'SANGAT BAIK' | 'BAIK' | 'BUTUH PERBAIKAN' | 'KURANG' | 'SANGAT KURANG' {
  const h = (ratingHasil || '').toUpperCase();
  const p = (ratingPerilaku || '').toUpperCase();

  if (h.includes('DIATAS') && p.includes('DIATAS')) {
    return 'SANGAT BAIK';
  }
  if (
    (h.includes('DIATAS') && p.includes('SESUAI')) ||
    (h.includes('SESUAI') && p.includes('SESUAI')) ||
    (h.includes('SESUAI') && p.includes('DIATAS'))
  ) {
    return 'BAIK';
  }
  if (
    (h.includes('DIBAWAH') && p.includes('DIATAS')) ||
    (h.includes('DIBAWAH') && p.includes('SESUAI'))
  ) {
    return 'BUTUH PERBAIKAN';
  }
  if (
    (h.includes('DIATAS') && p.includes('DIBAWAH')) ||
    (h.includes('SESUAI') && p.includes('DIBAWAH'))
  ) {
    return 'KURANG';
  }
  return 'SANGAT KURANG';
}

/**
 * Format official date range (e.g. 1 Januari 2026 s.d. 30 Juni 2026)
 */
export function getOfficialPeriodText(year: number, semester: 'I' | 'II'): string {
  if (semester === 'I') {
    return `1 Januari ${year} s.d 30 Juni ${year}`;
  }
  return `1 Juli ${year} s.d 31 Desember ${year}`;
}

/**
 * Resolve full evaluation details with official DJKI defaults
 */
export function resolveOfficialEvaluationDetails(ev: PPPKEvaluation) {
  const allEmployees = getAllEmployees();
  const subjectEmployee = allEmployees.find(p => p.nip === ev.employeeId);
  const atasanOrganisasi = subjectEmployee ? getAtasanLangsung(subjectEmployee, allEmployees) : null;
  const atasanPegawai = atasanOrganisasi?.atasan;

  // 1. Pegawai Yang Dinilai
  const namaPegawai = ev.nama || subjectEmployee?.nama || 'Christia Sari';
  const nipPegawai = ev.employeeId || subjectEmployee?.nip || '199110152024212007';
  const pangkatPegawai = ev.pangkatGolRuang || subjectEmployee?.golRuang || subjectEmployee?.golongan || 'IX';
  const jabatanPegawai = ev.jabatan || subjectEmployee?.jabatan || 'Analis Hukum Pertama';
  const unitKerjaPegawai = ev.unitKerja || subjectEmployee?.unitKerja || 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL';

  // 2. Pejabat Penilai Kinerja
  const pejabatPenilai: PPPKPejabatInfo = ev.pejabatPenilai || {
    nama: atasanPegawai?.nama || 'Achmad Iqbal Taufiq',
    nip: atasanPegawai?.nip || '198305142010121003',
    pangkatGolRuang: atasanPegawai?.golRuang || atasanPegawai?.golongan || 'Penata Tk. I (III/d)',
    jabatan: atasanPegawai?.jabatan || 'Sekretaris Bidang Perumusan Kebijakan dan Peraturan',
    unitKerja: atasanPegawai?.unitKerja || 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL'
  };

  // 3. Atasan Pejabat Penilai Kinerja
  const atasanPejabatPenilai: PPPKPejabatInfo = ev.atasanPejabatPenilai || {
    nama: 'Bayu Santoso',
    nip: '198906152012121001',
    pangkatGolRuang: 'Penata Tk. I (III/d)',
    jabatan: 'Kepala Subdit Permohonan dan Pelayanan Direktorat HCDI',
    unitKerja: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL'
  };

  // 4. Hasil Kerja Items
  let hasilKerjaList: PPPKHasilKerjaItem[] = ev.hasilKerjaList || [];
  if (hasilKerjaList.length === 0) {
    try {
      const rawSkp = localStorage.getItem('skp_db') || localStorage.getItem('portal_skp_db');
      if (rawSkp) {
        const skpList: SKPRecord[] = JSON.parse(rawSkp);
        const matched = skpList.find(s => s.nip === ev.employeeId && Number(s.tahun) === Number(ev.year));
        if (matched?.hasilKerja && Array.isArray(matched.hasilKerja) && matched.hasilKerja.length > 0) {
          hasilKerjaList = matched.hasilKerja.map((h, idx) => ({
            no: idx + 1,
            rencanaHasilKerja: h.deskripsi || h.rencanaHasilKerja || `Kegiatan Utama ${idx + 1}`,
            target: typeof h.target === 'number' ? h.target : 5,
            realisasi: typeof h.realisasi === 'number' ? h.realisasi : 25
          }));
        }
      }
    } catch (e) {
      // ignore
    }
  }
  if (hasilKerjaList.length === 0) {
    hasilKerjaList = DEFAULT_OFFICIAL_HASIL_KERJA;
  }

  // Calculate totals for Hasil Kerja
  let totalTarget = 0;
  let totalRealisasi = 0;
  hasilKerjaList.forEach(item => {
    totalTarget += Number(item.target) || 0;
    totalRealisasi += Number(item.realisasi) || 0;
  });

  // Rating Hasil Kerja
  let ratingHasilKerja = ev.ratingHasilKerja;
  if (!ratingHasilKerja) {
    if (totalRealisasi > totalTarget) ratingHasilKerja = 'DIATAS EKSPEKTASI';
    else if (totalRealisasi === totalTarget) ratingHasilKerja = 'SESUAI EKSPEKTASI';
    else ratingHasilKerja = 'DIBAWAH EKSPEKTASI';
  }

  // 5. BerAKHLAK 7 Aspects and Questions
  let berakhlakList: PPPKBerakhlakAspectItem[] = ev.berakhlakList || [];
  if (berakhlakList.length === 0) {
    berakhlakList = OFFICIAL_BERAKHLAK_ASPECTS.map(asp => {
      const subItems = asp.questions.map(q => {
        return {
          code: q.code,
          pertanyaan: q.text,
          skorPejabat: (asp.no === 1 && q.code === 'd') || (asp.no === 2 && q.code === 'a') || (asp.no === 3 && q.code === 'c') || (asp.no === 4 && q.code === 'a') || (asp.no === 5 && q.code === 'b') || (asp.no === 5 && q.code === 'c') || (asp.no === 6 && q.code === 'a') || (asp.no === 6 && q.code === 'd') ? 5 : 4,
          skorRekanPns: 5,
          skorRekanPppk: 4
        };
      });

      const avgPejabat = subItems.reduce((acc, s) => acc + s.skorPejabat, 0) / subItems.length;
      const avgRekanPns = subItems.reduce((acc, s) => acc + s.skorRekanPns, 0) / subItems.length;
      const avgRekanPppk = subItems.reduce((acc, s) => acc + s.skorRekanPppk, 0) / subItems.length;
      const avgRekan = (avgRekanPns + avgRekanPppk) / 2;
      // Formula: ((rataPejabat * 0.60) + (rataRekan * 0.40)) * 0.60
      const nilaiAkhir = Math.round(((avgPejabat * 0.60) + (avgRekan * 0.40)) * 0.60 * 100) / 100;

      return {
        no: asp.no,
        aspek: asp.aspek,
        subItems,
        rataRataPejabat: Math.round(avgPejabat * 100) / 100,
        rataRataRekan: Math.round(avgRekan * 100) / 100,
        nilaiAkhirAspek: nilaiAkhir
      };
    });
  }

  // Attendance & Behavior Totals
  const alfaCount = typeof ev.alfaCount === 'number' ? ev.alfaCount : 0;
  let analisisKehadiranSkor = 5;
  if (alfaCount > 8) analisisKehadiranSkor = 1;
  else if (alfaCount >= 6) analisisKehadiranSkor = 2;
  else if (alfaCount >= 3) analisisKehadiranSkor = 3;
  else if (alfaCount >= 1) analisisKehadiranSkor = 4;
  else analisisKehadiranSkor = 5;

  const nilaiKehadiranBobot = Math.round((analisisKehadiranSkor * 0.40) * 100) / 100; // e.g. 5 * 0.4 = 2.00

  // Calculate average of 7 aspects
  const totalPerilakuRataRata = Math.round((berakhlakList.reduce((acc, a) => acc + a.nilaiAkhirAspek, 0) / berakhlakList.length) * 100) / 100;
  const jumlahPerilakuPlusKehadiran = Math.round((totalPerilakuRataRata + nilaiKehadiranBobot) * 100) / 100;

  // Rating Perilaku Kerja
  let ratingPerilakuKerja = ev.ratingPerilakuKerja;
  if (!ratingPerilakuKerja) {
    if (jumlahPerilakuPlusKehadiran >= 4.32) ratingPerilakuKerja = 'DIATAS EKSPEKTASI';
    else if (jumlahPerilakuPlusKehadiran >= 3.60) ratingPerilakuKerja = 'SESUAI EKSPEKTASI';
    else ratingPerilakuKerja = 'DIBAWAH EKSPEKTASI';
  }

  // Predikat Kinerja (Permenpan RB 6/2022)
  const predikatPenilaianKinerja = ev.predikatPenilaianKinerja || getPredikatKinerjaPermenpan(ratingHasilKerja, ratingPerilakuKerja);

  // Rekomendasi & Catatan
  const rekomendasi = ev.rekomendasi || (predikatPenilaianKinerja === 'KURANG' || predikatPenilaianKinerja === 'SANGAT KURANG' ? 'PEMUTUSAN PERJANJIAN KINERJA' : 'PERPANJANGAN PERJANJIAN KINERJA');
  const catatanKinerja = ev.catatanKinerja || ['DIPERTAHANKAN'];
  const catatanTambahan = ev.catatanTambahan || '-';

  const tanggalTtd = ev.tanggalTtd || (ev.finalizedAt ? ev.finalizedAt.split(' ')[0] : `01 ${ev.semester === 'I' ? 'Juli' : 'Januari'} ${ev.semester === 'I' ? ev.year : ev.year + 1}`);

  return {
    namaPegawai,
    nipPegawai,
    pangkatPegawai,
    jabatanPegawai,
    unitKerjaPegawai,
    pejabatPenilai,
    atasanPejabatPenilai,
    periodeText: getOfficialPeriodText(ev.year, ev.semester),
    hasilKerjaList,
    totalTarget,
    totalRealisasi,
    ratingHasilKerja,
    berakhlakList,
    alfaCount,
    analisisKehadiranSkor,
    nilaiKehadiranBobot,
    totalPerilakuRataRata,
    jumlahPerilakuPlusKehadiran,
    ratingPerilakuKerja,
    predikatPenilaianKinerja,
    rekomendasi,
    catatanKinerja,
    catatanTambahan,
    tanggalTtd,
    kotaTtd: ev.kotaTtd || 'Jakarta'
  };
}

/**
 * ============================================================================
 * DOKUMEN 1: FORMULIR EVALUASI PENILAIAN KINERJA PPPK (2 Halaman Portrait)
 * ============================================================================
 */
export function buildDoc1EvaluasiKinerja(doc: jsPDF, ev: PPPKEvaluation, isNewDoc = true) {
  const d = resolveOfficialEvaluationDetails(ev);
  if (!isNewDoc) {
    doc.addPage('a4', 'portrait');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 14;

  // Title Centered
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EVALUASI PENILAIAN KINERJA', pageWidth / 2, curY, { align: 'center' });
  curY += 4.5;
  doc.text('PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)', pageWidth / 2, curY, { align: 'center' });
  curY += 7;

  // Subheader Bar: Left = DIREKTORAT, Right = PERIODE PENILAIAN
  doc.setFontSize(8.5);
  doc.text('DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL', 14, curY);
  doc.text('PERIODE PENILAIAN', pageWidth - 14, curY, { align: 'right' });
  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.periodeText, pageWidth - 14, curY, { align: 'right' });
  curY += 3.5;

  // TABEL 1: PEGAWAI YANG DINILAI
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 5, halign: 'center' },
      3: { cellWidth: 'auto' }
    },
    body: [
      [{ content: '1', rowSpan: 6 }, { content: 'PEGAWAI YANG DINILAI', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }],
      ['NAMA', ':', d.namaPegawai],
      ['NIP', ':', d.nipPegawai],
      ['PANGKAT/GOL RUANG', ':', d.pangkatPegawai],
      ['JABATAN', ':', d.jabatanPegawai],
      ['UNIT KERJA', ':', d.unitKerjaPegawai]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY;

  // TABEL 2: PEJABAT PENILAI KINERJA
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 5, halign: 'center' },
      3: { cellWidth: 'auto' }
    },
    body: [
      [{ content: '2', rowSpan: 6 }, { content: 'PEJABAT PENILAI KINERJA', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }],
      ['NAMA', ':', d.pejabatPenilai.nama],
      ['NIP', ':', d.pejabatPenilai.nip],
      ['PANGKAT/GOL RUANG', ':', d.pejabatPenilai.pangkatGolRuang],
      ['JABATAN', ':', d.pejabatPenilai.jabatan],
      ['UNIT KERJA', ':', d.pejabatPenilai.unitKerja]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY;

  // TABEL 3: ATASAN PEJABAT PENILAI KINERJA
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 5, halign: 'center' },
      3: { cellWidth: 'auto' }
    },
    body: [
      [{ content: '3', rowSpan: 6 }, { content: 'ATASAN PEJABAT PENILAI KINERJA', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }],
      ['NAMA', ':', d.atasanPejabatPenilai.nama],
      ['NIP', ':', d.atasanPejabatPenilai.nip],
      ['PANGKAT/GOL RUANG', ':', d.atasanPejabatPenilai.pangkatGolRuang],
      ['JABATAN', ':', d.atasanPejabatPenilai.jabatan],
      ['UNIT KERJA', ':', d.atasanPejabatPenilai.unitKerja]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY;

  // TABEL 4: EVALUASI PENILAIAN KINERJA
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 62, fontStyle: 'bold' },
      2: { cellWidth: 5, halign: 'center' },
      3: { cellWidth: 'auto', fontStyle: 'bold' }
    },
    body: [
      [{ content: '4', rowSpan: 4 }, { content: 'EVALUASI PENILAIAN KINERJA', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }],
      ['RATING HASIL KERJA', ':', d.ratingHasilKerja],
      ['RATING PERILAKU KERJA', ':', d.ratingPerilakuKerja],
      ['PREDIKAT PENILAIAN KINERJA', ':', d.predikatPenilaianKinerja]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY;

  // TABEL 5: CATATAN ATAU REKOMENDASI
  const isPerpanjang = d.rekomendasi.includes('PERPANJANGAN');
  const isPemutusan = d.rekomendasi.includes('PEMUTUSAN');
  const isDipertahankan = d.catatanKinerja.includes('DIPERTAHANKAN');
  const isRotasi = d.catatanKinerja.includes('ROTASI');
  const isBangkom = d.catatanKinerja.includes('PENGEMBANGAN KARIR');
  const isBimbingan = d.catatanKinerja.includes('BIMBINGAN KINERJA');

  const checkChar = (checked: boolean) => (checked ? '[ v ]' : '[   ]');

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, textColor: [15, 23, 42], cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' }
    },
    body: [
      [{ content: '5', rowSpan: 10 }, { content: 'CATATAN ATAU REKOMENDASI', styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }],
      [{ content: 'REKOMENDASI', styles: { fontStyle: 'bold' } }],
      [{ content: `   ${checkChar(isPerpanjang)}   PERPANJANGAN PERJANJIAN KINERJA` }],
      [{ content: `   ${checkChar(isPemutusan)}   PEMUTUSAN PERJANJIAN KINERJA` }],
      [{ content: 'CATATAN', styles: { fontStyle: 'bold' } }],
      [{ content: `   ${checkChar(isDipertahankan)}   DIPERTAHANKAN` }],
      [{ content: `   ${checkChar(isRotasi)}   ROTASI` }],
      [{ content: `   ${checkChar(isBangkom)}   PENGEMBANGAN KARIR` }],
      [{ content: `   ${checkChar(isBimbingan)}   BIMBINGAN KINERJA` }],
      [{ content: `CATATAN TAMBAHAN : ${d.catatanTambahan && d.catatanTambahan !== '-' ? d.catatanTambahan : ''}` }]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY + 6;

  // SIGNATURES: 2 columns top, 1 centered bottom
  const colLeftX = 45;
  const colRightX = pageWidth - 60;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Pegawai yang dinilai', colLeftX, curY, { align: 'center' });

  doc.text(`${d.kotaTtd}, ${d.tanggalTtd}`, colRightX, curY, { align: 'center' });
  curY += 3.5;
  doc.text('Pejabat Penilai Kinerja', colRightX, curY, { align: 'center' });
  curY += 3;
  doc.text('(Pejabat Manajerial/Ketua Tim Kerja)', colRightX, curY, { align: 'center' });

  curY += 15;

  doc.setFont('helvetica', 'bold');
  doc.text(d.namaPegawai, colLeftX, curY, { align: 'center' });
  doc.text(d.pejabatPenilai.nama, colRightX, curY, { align: 'center' });
  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.nipPegawai, colLeftX, curY, { align: 'center' });
  doc.text(d.pejabatPenilai.nip, colRightX, curY, { align: 'center' });

  curY += 8;

  // Atasan Pejabat Penilai (Centered Bottom)
  doc.text('Mengetahui', pageWidth / 2, curY, { align: 'center' });
  curY += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text('ATASAN PEJABAT PENILAI KINERJA', pageWidth / 2, curY, { align: 'center' });
  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.atasanPejabatPenilai.jabatan, pageWidth / 2, curY, { align: 'center' });

  curY += 15;
  doc.setFont('helvetica', 'bold');
  doc.text(d.atasanPejabatPenilai.nama, pageWidth / 2, curY, { align: 'center' });
  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.atasanPejabatPenilai.nip, pageWidth / 2, curY, { align: 'center' });

  // ==========================================================================
  // HALAMAN 2: MATRIKS PREDIKAT KINERJA PEGAWAI (PERMENPAN RB NO 6 TAHUN 2022)
  // ==========================================================================
  doc.addPage('a4', 'portrait');
  curY = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Matriks Predikat Kinerja Pegawai', pageWidth / 2, curY, { align: 'center' });
  curY += 4.5;
  doc.setFontSize(8.5);
  doc.text('(Berdasarkan Ketentuan Permenpan RB Nomor 6 Tahun 2022)', pageWidth / 2, curY, { align: 'center' });
  curY += 6;

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 8, lineColor: [0, 0, 0], lineWidth: 0.2 },
    bodyStyles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 48, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto' }
    },
    head: [['Nomor', 'Predikat Kinerja Pegawai', 'Keterangan']],
    body: [
      ['1', 'Sangat Baik', 'Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai diatas ekspektasi.'],
      ['2', 'Baik', '1. Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai sesuai ekspektasi\n2. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai sesuai ekspektasi\n3. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai diatas ekspektasi'],
      ['3', 'Butuh Perbaikan', '1. Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai diatas ekspektasi\n2. Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai sesuai ekspektasi'],
      ['4', 'Kurang', '1. Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai dibawah ekspektasi\n2. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai dibawah ekspektasi'],
      ['5', 'Sangat Kurang', 'Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai dibawah ekspektasi']
    ]
  });

  curY = (doc as any).lastAutoTable.finalY + 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text('*) Predikat Kinerja Pegawai didasarkan pada Permenpan RB Nomor 6 Tahun 2022', 14, curY);
}

/**
 * ============================================================================
 * DOKUMEN 2: FORMULIR PENILAIAN PERILAKU KERJA PPPK (2 Halaman Landscape)
 * ============================================================================
 */
export function buildDoc2PerilakuKerja(doc: jsPDF, ev: PPPKEvaluation, isNewDoc = true) {
  const d = resolveOfficialEvaluationDetails(ev);
  if (!isNewDoc) {
    doc.addPage('a4', 'landscape');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 12;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PENILAIAN PERILAKU KERJA', pageWidth / 2, curY, { align: 'center' });
  curY += 4;
  doc.text('PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)', pageWidth / 2, curY, { align: 'center' });
  curY += 4;
  doc.setFontSize(8.5);
  doc.text('Direktorat Jenderal Kekayaan Intelektual', 14, curY);
  doc.text('Periode Penilaian', pageWidth - 14, curY, { align: 'right' });
  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.periodeText, pageWidth - 14, curY, { align: 'right' });
  curY += 2;

  // Pegawai yang dinilai vs Pejabat Penilai Kinerja Table Header (6 Columns)
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 4, halign: 'center' },
      2: { cellWidth: 100 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 4, halign: 'center' },
      5: { cellWidth: 'auto' }
    },
    head: [[
      { content: 'Pegawai Yang dinilai', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } },
      { content: 'Pejabat Penilai Kinerja', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }
    ]],
    body: [
      ['Nama', ':', d.namaPegawai, 'Nama', ':', d.pejabatPenilai.nama],
      ['NIP', ':', d.nipPegawai, 'NIP', ':', d.pejabatPenilai.nip],
      ['Pangkat / Gol Ruang', ':', d.pangkatPegawai, 'Pangkat / Gol Ruang', ':', d.pejabatPenilai.pangkatGolRuang],
      ['Jabatan', ':', d.jabatanPegawai, 'Jabatan', ':', d.pejabatPenilai.jabatan],
      ['Unit Kerja', ':', d.unitKerjaPegawai, 'Unit Kerja', ':', d.pejabatPenilai.unitKerja]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY + 2.5;

  // Divide aspects for Page 1 and Page 2
  // Page 1: Aspects 1 to 4 (4 aspects x 4 questions = 16 rows) -> Fits perfectly without overflowing
  // Page 2: Aspects 5 to 7 (3 aspects x 4 questions = 12 rows) + Summary + 3 Tables + Signature
  const aspectsPage1 = d.berakhlakList.slice(0, 4);
  const aspectsPage2 = d.berakhlakList.slice(4, 7);

  const formatRows = (aspects: PPPKBerakhlakAspectItem[], isFirstPage: boolean) => {
    const rows: any[] = [];
    const totalSubItems = aspects.reduce((acc, a) => acc + a.subItems.length, 0);

    aspects.forEach((asp, aspIdx) => {
      asp.subItems.forEach((sub, subIdx) => {
        const row: any[] = [];
        if (subIdx === 0) {
          row.push({ content: String(asp.no), rowSpan: asp.subItems.length, styles: { halign: 'center', fontStyle: 'bold', valign: 'middle' } });
        }
        row.push({ content: `${sub.code}. ${sub.pertanyaan}` });
        row.push({ content: String(sub.skorPejabat), styles: { halign: 'center' } });
        row.push({ content: String(sub.skorRekanPns), styles: { halign: 'center' } });
        row.push({ content: String(sub.skorRekanPppk), styles: { halign: 'center' } });

        if (aspIdx === 0 && subIdx === 0) {
          row.push({ content: String(d.alfaCount), rowSpan: totalSubItems, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } });
          row.push({ content: String(d.analisisKehadiranSkor), rowSpan: totalSubItems, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } });
        }

        if (subIdx === 0) {
          row.push({
            content: asp.nilaiAkhirAspek.toFixed(2).replace('.', ','),
            rowSpan: asp.subItems.length,
            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [126, 196, 236] }
          });
        }

        if (aspIdx === 0 && subIdx === 0) {
          row.push({
            content: d.nilaiKehadiranBobot.toFixed(2).replace('.', ','),
            rowSpan: totalSubItems,
            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [126, 196, 236] }
          });
        }

        rows.push(row);
      });
    });
    return rows;
  };

  const tableHead = [
    [
      { content: 'No', rowSpan: 3 },
      { content: 'Standar Penilaian Perilaku Kerja\nAspek Penilaian', rowSpan: 3 },
      { content: 'Penilaian Perilaku\nBobot 60%', colSpan: 3 },
      { content: 'Penilaian Kehadiran\nBobot 40%', colSpan: 2 },
      { content: 'Nilai Akhir Perilaku Kerja\n((rata-rata nilai pejabat x 60%) + (rata-rata rekan : 2 x 40%)) x 60%', rowSpan: 3 },
      { content: 'Nilai Kehadiran\n(Analisis Kehadiran * 40%)', rowSpan: 3 }
    ],
    [
      { content: 'Pejabat Penilai Kinerja (60%)', colSpan: 1 },
      { content: 'Rekan Kerja (40%)', colSpan: 2 },
      { content: 'Alfa', rowSpan: 2 },
      { content: 'Analisis Kehadiran Berdasarkan Tabel', rowSpan: 2 }
    ],
    [
      { content: 'Skor Jawaban' },
      { content: 'Rekan Kerja PNS' },
      { content: 'Rekan Kerja PPPK' }
    ]
  ];

  const colStyles = {
    0: { cellWidth: 7, halign: 'center' },
    1: { cellWidth: 100 },
    2: { cellWidth: 16, halign: 'center' },
    3: { cellWidth: 16, halign: 'center' },
    4: { cellWidth: 16, halign: 'center' },
    5: { cellWidth: 12, halign: 'center' },
    6: { cellWidth: 32, halign: 'center' },
    7: { cellWidth: 44, halign: 'center' },
    8: { cellWidth: 26, halign: 'center' }
  };

  // Main table for Page 1 (Aspects 1-4)
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6.5 },
    columnStyles: colStyles as any,
    head: tableHead,
    body: formatRows(aspectsPage1, true)
  });

  // ==========================================================================
  // PAGE 2 (LANDSCAPE): Aspects 5 to 7 + Summary + Signatures + 3 Tables
  // ==========================================================================
  doc.addPage('a4', 'landscape');
  curY = 12;

  const page2Rows = formatRows(aspectsPage2, false);

  // Summary rows at bottom of table
  page2Rows.push([
    { content: 'Rata-rata Nilai Perilaku & Nilai Kehadiran', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: d.totalPerilakuRataRata.toFixed(2).replace('.', ','), styles: { halign: 'center', fontStyle: 'bold', fillColor: [126, 196, 236] } },
    { content: d.nilaiKehadiranBobot.toFixed(2).replace('.', ','), styles: { halign: 'center', fontStyle: 'bold', fillColor: [126, 196, 236] } }
  ]);
  page2Rows.push([
    { content: 'Jumlah Nilai perilaku + Nilai Kehadiran', colSpan: 7, styles: { halign: 'left', fontStyle: 'bold', fillColor: [126, 196, 236] } },
    { content: d.jumlahPerilakuPlusKehadiran.toFixed(2).replace('.', ','), colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [126, 196, 236] } }
  ]);
  page2Rows.push([
    { content: 'Rating Penilaian Perilaku Kerja', colSpan: 7, styles: { halign: 'left', fontStyle: 'bold', fillColor: [126, 196, 236] } },
    { content: d.ratingPerilakuKerja, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [126, 196, 236] } }
  ]);

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 6.5 },
    columnStyles: colStyles as any,
    head: tableHead,
    body: page2Rows
  });

  const startRefY = (doc as any).lastAutoTable.finalY + 3;

  // 1. Tabel Skala Penilaian Perilaku Kerja
  autoTable(doc, {
    startY: startRefY,
    theme: 'grid',
    margin: { left: 14 },
    tableWidth: 80,
    styles: { fontSize: 6, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 6 },
    head: [[{ content: '1. Tabel Skala Penilaian Perilaku Kerja', colSpan: 2 }]],
    body: [
      ['Skala Penilaian', 'Keterangan'],
      ['1', 'Sangat Kurang'],
      ['2', 'Kurang'],
      ['3', 'Cukup'],
      ['4', 'Baik'],
      ['5', 'Sangat Baik']
    ]
  });

  // 2. Tabel Analisis Kehadiran
  const table2Y = (doc as any).lastAutoTable.finalY + 1.5;
  autoTable(doc, {
    startY: table2Y,
    theme: 'grid',
    margin: { left: 14 },
    tableWidth: 95,
    styles: { fontSize: 6, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 6 },
    head: [[{ content: '2. Tabel Analisis Kehadiran', colSpan: 3 }]],
    body: [
      ['Skala Penilaian', 'Keterangan', 'Kriteria'],
      ['1', 'Sangat Kurang', 'Alfa : >8 kali'],
      ['2', 'Kurang', 'Alfa : 6 - 8 kali'],
      ['3', 'Cukup', 'Alfa : 3 - 5 kali'],
      ['4', 'Baik', 'Alfa : 1 - 2 kali'],
      ['5', 'Sangat Baik', 'Alfa : 0 kali']
    ]
  });

  // 3. Tabel Rating Penilaian Perilaku Kerja
  const table3Y = (doc as any).lastAutoTable.finalY + 1.5;
  autoTable(doc, {
    startY: table3Y,
    theme: 'grid',
    margin: { left: 14 },
    tableWidth: 95,
    styles: { fontSize: 6, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 6 },
    head: [[{ content: '3. Tabel Rating Penilaian Perilaku Kerja', colSpan: 2 }]],
    body: [
      ['Range', 'Rating Perilaku'],
      ['4,32 - 5', 'Diatas Ekspektasi'],
      ['3,60 - 4,31', 'Sesuai Ekspektasi'],
      ['1 - 3,59', 'Dibawah Ekspektasi']
    ]
  });

  // Signature Pejabat Penilai on right
  const sigX = pageWidth - 50;
  let sigY = startRefY + 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${d.kotaTtd}, ${d.tanggalTtd}`, sigX, sigY, { align: 'center' });
  sigY += 3.5;
  doc.text('Pejabat Penilai Kinerja', sigX, sigY, { align: 'center' });
  sigY += 3;
  doc.text('(Pejabat Manajerial/Ketua Tim Kerja)', sigX, sigY, { align: 'center' });
  sigY += 15;
  doc.setFont('helvetica', 'bold');
  doc.text(d.pejabatPenilai.nama, sigX, sigY, { align: 'center' });
  sigY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.pejabatPenilai.nip, sigX, sigY, { align: 'center' });
}

/**
 * ============================================================================
 * DOKUMEN 3: FORMULIR PENILAIAN HASIL KERJA PPPK (1 Halaman Landscape)
 * ============================================================================
 */
export function buildDoc3HasilKerja(doc: jsPDF, ev: PPPKEvaluation, isNewDoc = true) {
  const d = resolveOfficialEvaluationDetails(ev);
  if (!isNewDoc) {
    doc.addPage('a4', 'landscape');
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 12;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('PENILAIAN HASIL KERJA', pageWidth / 2, curY, { align: 'center' });
  curY += 4;
  doc.setFontSize(8);
  doc.text('*PEJABAT PENILAI KINERJA : PEJABAT MANAJERIAL/KETUA TIM KERJA', pageWidth / 2, curY, { align: 'center' });
  curY += 4;
  doc.setFontSize(10);
  doc.text('PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)', pageWidth / 2, curY, { align: 'center' });
  curY += 4.5;

  // Subheader
  doc.setFontSize(8.5);
  doc.text('Direktorat Jenderal Kekayaan Intelektual', 14, curY);
  doc.text('Periode Penilaian', pageWidth - 14, curY, { align: 'right' });
  curY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.periodeText, pageWidth - 14, curY, { align: 'right' });
  curY += 2;

  // Identity Table (6 Columns)
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 4, halign: 'center' },
      2: { cellWidth: 100 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 4, halign: 'center' },
      5: { cellWidth: 'auto' }
    },
    head: [[
      { content: 'Pegawai Yang dinilai', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } },
      { content: 'Pejabat Penilai Kinerja', colSpan: 3, styles: { fillColor: [126, 196, 236], fontStyle: 'bold', textColor: [0, 0, 0] } }
    ]],
    body: [
      ['Nama', ':', d.namaPegawai, 'Nama', ':', d.pejabatPenilai.nama],
      ['NIP', ':', d.nipPegawai, 'NIP', ':', d.pejabatPenilai.nip],
      ['Pangkat / Gol Ruang', ':', d.pangkatPegawai, 'Pangkat / Gol Ruang', ':', d.pejabatPenilai.pangkatGolRuang],
      ['Jabatan', ':', d.jabatanPegawai, 'Jabatan', ':', d.pejabatPenilai.jabatan],
      ['Unit Kerja', ':', d.unitKerjaPegawai, 'Unit Kerja', ':', d.pejabatPenilai.unitKerja]
    ]
  });

  curY = (doc as any).lastAutoTable.finalY + 2.5;

  // Penilaian Hasil Kerja Table (exact 13 rows layout)
  const tableRows: any[] = [];
  const totalSlots = Math.max(d.hasilKerjaList.length, 13);
  for (let i = 0; i < totalSlots; i++) {
    const item = d.hasilKerjaList[i];
    if (item) {
      tableRows.push([
        String(i + 1),
        item.rencanaHasilKerja,
        String(item.target),
        String(item.realisasi)
      ]);
    } else if (i === 12) {
      // Row 13 placeholder matching standard DJKI format
      tableRows.push([String(i + 1), '', '0', '0']);
    } else {
      tableRows.push([String(i + 1), '', '', '']);
    }
  }

  // Total Row
  tableRows.push([
    { content: 'Total', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } },
    { content: String(d.totalTarget), styles: { halign: 'center', fontStyle: 'bold' } },
    { content: String(d.totalRealisasi), styles: { halign: 'center', fontStyle: 'bold' } }
  ]);

  // Rating Hasil Kerja Row
  tableRows.push([
    { content: 'Rating Hasil Kerja', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [126, 196, 236] } },
    { content: d.ratingHasilKerja, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [126, 196, 236] } }
  ]);

  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7.5, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.15 },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 32, halign: 'center' }
    },
    head: [
      [{ content: 'Penilaian Hasil Kerja', colSpan: 4, styles: { fillColor: [126, 196, 236], halign: 'left', fontStyle: 'bold', textColor: [0, 0, 0] } }],
      ['No', 'Rencana Hasil Kerja', 'Target', 'Realisasi']
    ],
    body: tableRows
  });

  curY = (doc as any).lastAutoTable.finalY + 3;

  // Bottom section: Left = Reference Matrix, Right = Signature
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    margin: { left: 14 },
    tableWidth: 110,
    styles: { fontSize: 6.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.15, textColor: [0, 0, 0] },
    headStyles: { fillColor: [126, 196, 236], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 45 },
      2: { cellWidth: 55 }
    },
    head: [['No', 'Keterangan', 'Rating Hasil Kerja']],
    body: [
      ['1', 'Realisasi > Target', 'Diatas Ekspektasi'],
      ['2', 'Realisasi = Target', 'Sesuai Ekspektasi'],
      ['3', 'Realisasi < Target', 'Dibawah Ekspektasi']
    ]
  });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.text('*) Coret yang tidak perlu', 14, (doc as any).lastAutoTable.finalY + 2.5);

  // Signature on Right
  const sigX = pageWidth - 50;
  let sigY = curY + 2;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${d.kotaTtd}, ${d.tanggalTtd}`, sigX, sigY, { align: 'center' });
  sigY += 3.5;
  doc.text('Pejabat Penilai Kinerja', sigX, sigY, { align: 'center' });
  sigY += 3;
  doc.text('(Pejabat Manajerial/Ketua Tim Kerja)', sigX, sigY, { align: 'center' });
  sigY += 14;
  doc.setFont('helvetica', 'bold');
  doc.text(d.pejabatPenilai.nama, sigX, sigY, { align: 'center' });
  sigY += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.text(d.pejabatPenilai.nip, sigX, sigY, { align: 'center' });
}

/**
 * ============================================================================
 * EXPORT FUNCTIONS
 * ============================================================================
 */

/**
 * Export Dokumen 1: Evaluasi Penilaian Kinerja PPPK (2 Halaman Portrait)
 */
export function exportPPPKEvaluasiKinerjaPDF(ev: PPPKEvaluation): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  buildDoc1EvaluasiKinerja(doc, ev, true);
  doc.save(`Dokumen_1_Evaluasi_Kinerja_PPPK_${ev.employeeId}_${ev.year}_Sem${ev.semester}.pdf`);
}

/**
 * Export Dokumen 2: Penilaian Perilaku Kerja PPPK (2 Halaman Landscape)
 */
export function exportPPPKPerilakuKerjaPDF(ev: PPPKEvaluation): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  buildDoc2PerilakuKerja(doc, ev, true);
  doc.save(`Dokumen_2_Penilaian_Perilaku_PPPK_${ev.employeeId}_${ev.year}_Sem${ev.semester}.pdf`);
}

/**
 * Export Dokumen 3: Penilaian Hasil Kerja PPPK (1 Halaman Landscape)
 */
export function exportPPPKHasilKerjaPDF(ev: PPPKEvaluation): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  buildDoc3HasilKerja(doc, ev, true);
  doc.save(`Dokumen_3_Penilaian_Hasil_Kerja_PPPK_${ev.employeeId}_${ev.year}_Sem${ev.semester}.pdf`);
}

/**
 * Export BUNDLE LENGKAP: 3 Dokumen Resmi Sekaligus (Total 5 Halaman)
 */
export function exportPPPKCompleteBundlePDF(ev: PPPKEvaluation): void {
  // Start with portrait for Dokumen 1
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Doc 1 (Pages 1 & 2 - Portrait)
  buildDoc1EvaluasiKinerja(doc, ev, true);

  // Doc 2 (Pages 3 & 4 - Landscape)
  buildDoc2PerilakuKerja(doc, ev, false);

  // Doc 3 (Page 5 - Landscape)
  buildDoc3HasilKerja(doc, ev, false);

  doc.save(`Berkas_Lengkap_Evaluasi_PPPK_${ev.employeeId}_${ev.year}_Sem${ev.semester}.pdf`);
}

/**
 * Update evaluation record with custom official document configurations
 */
export function saveOfficialEvaluationCustomization(
  evalId: string,
  customData: Partial<PPPKEvaluation>
): PPPKEvaluation | null {
  try {
    const raw = localStorage.getItem('portal_pppk_evaluations');
    if (!raw) return null;
    const list: PPPKEvaluation[] = JSON.parse(raw);
    const idx = list.findIndex(e => e.id === evalId);
    if (idx < 0) return null;

    list[idx] = {
      ...list[idx],
      ...customData,
      updatedAt: new Date().toLocaleString('id-ID')
    };

    localStorage.setItem('portal_pppk_evaluations', JSON.stringify(list));
    return list[idx];
  } catch (e) {
    return null;
  }
}

