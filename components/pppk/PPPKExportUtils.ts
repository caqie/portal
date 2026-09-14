/**
 * PPPKExportUtils.ts
 * Export utilities for Evaluasi Kinerja PPPK:
 * 1. Excel export (.xlsx) using SheetJS (xlsx)
 * 2. PDF export (.pdf) using jsPDF and jspdf-autotable
 */

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PPPKEvaluation } from '../../types';
import { AnnualRecapRow } from '../../services/pppkEvaluationService';

/**
 * Export Evaluations Table to Excel
 */
export function exportPPPKEvaluationsToExcel(evaluations: PPPKEvaluation[], fileName?: string): void {
  const data = evaluations.map((ev, index) => ({
    'No': index + 1,
    'Tahun': ev.year,
    'Semester': `Semester ${ev.semester}`,
    'NIP': ev.employeeId,
    'Nama Lengkap': ev.nama,
    'Unit Kerja': ev.unitKerja,
    'Jabatan': ev.jabatan,
    'Jenis Pegawai': ev.jenisPegawai || 'PPPK',
    'Nilai SKP': ev.skpScore,
    'Bobot SKP (%)': ev.skpWeight,
    'Kontribusi SKP': ev.skpContribution,
    'Nilai Perilaku 360°': ev.behaviorScore,
    'Bobot Perilaku (%)': ev.behaviorWeight,
    'Kontribusi Perilaku': ev.behaviorContribution,
    'Nilai Absensi': ev.attendanceScore,
    'Bobot Absensi (%)': ev.attendanceWeight,
    'Kontribusi Absensi': ev.attendanceContribution,
    'Nilai Akhir': ev.finalScore,
    'Predikat Kategori': ev.category,
    'Status Evaluasi': ev.isFinal ? 'FINAL (DIKUNCI)' : ev.status,
    'Waktu Perhitungan': ev.calculatedAt,
    'Tanggal Finalisasi': ev.finalizedAt || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Evaluasi PPPK');

  const name = fileName || `Evaluasi_Kinerja_PPPK_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, name);
}

/**
 * Export Annual Recap Table to Excel
 */
export function exportPPPKAnnualRecapToExcel(recapRows: AnnualRecapRow[], year: number): void {
  const data = recapRows.map((r, index) => ({
    'No': index + 1,
    'Tahun': r.year,
    'NIP': r.nip,
    'Nama Lengkap': r.nama,
    'Unit Kerja': r.unitKerja,
    'Jabatan': r.jabatan,
    'Jenis Pegawai': r.jenisPegawai || 'PPPK',
    'Nilai Semester I': r.semester1Score !== null ? r.semester1Score : '-',
    'Kategori Sem I': r.semester1Category || '-',
    'Status Sem I': r.semester1Status,
    'Nilai Semester II': r.semester2Score !== null ? r.semester2Score : '-',
    'Kategori Sem II': r.semester2Category || '-',
    'Status Sem II': r.semester2Status,
    'Rata-Rata Tahunan': r.annualAverage !== null ? r.annualAverage : '-',
    'Kategori Tahunan': r.annualCategory || '-',
    'Status Kelengkapan': r.statusText
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap Tahunan ${year}`);

  XLSX.writeFile(workbook, `Rekap_Tahunan_Evaluasi_PPPK_${year}.xlsx`);
}

/**
 * Export Individual Official Report to PDF
 */
export function exportPPPKEvaluationToPDF(ev: PPPKEvaluation): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEMENTERIAN HUKUM REPUBLIK INDONESIA', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.text('DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. H.R. Rasuna Said Kav. 6-7, Kuningan, Setiabudi, Jakarta Selatan', pageWidth / 2, currentY, { align: 'center' });
  currentY += 3;

  // Divider Line
  doc.setLineWidth(0.7);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 1;
  doc.setLineWidth(0.2);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 7;

  // Report Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN EVALUASI KINERJA PPPK BERBASIS SEMESTER', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`TAHUN ${ev.year} — SEMESTER ${ev.semester}`, pageWidth / 2, currentY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  // Identity Table
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ['Nama Pegawai (PPPK)', ':', ev.nama, 'Tahun Anggaran', ':', String(ev.year)],
      ['NIP / No. Identitas', ':', ev.employeeId, 'Semester Periode', ':', `Semester ${ev.semester} (${ev.semester === 'I' ? '1 Jan – 30 Jun' : '1 Jul – 31 Des'})`],
      ['Jabatan', ':', ev.jabatan || '-', 'Status Evaluasi', ':', ev.isFinal ? 'FINAL / TELAH DISAHKAN' : ev.status],
      ['Unit Kerja', ':', ev.unitKerja || '-', 'Waktu Perhitungan', ':', ev.calculatedAt || '-']
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Main Component Assessment Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('I. HASIL PENILAIAN KOMPONEN KINERJA', 15, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    margin: { left: 15, right: 15 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5, halign: 'center', fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: [30, 30, 30] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 40 }
    },
    head: [
      ['No', 'Komponen Penilaian', 'Nilai Capaian (0–100)', 'Bobot (%)', 'Kontribusi Skor']
    ],
    body: [
      [
        '1',
        'Sasaran Kinerja Pegawai (SKP)\n• Predikat Kinerja: ' + (ev.skpPredikat || 'Sesuai Ekspektasi'),
        ev.skpScore.toFixed(2),
        `${ev.skpWeight}%`,
        ev.skpContribution.toFixed(2)
      ],
      [
        '2',
        'Penilaian Perilaku Kerja 360°\n• 10 Aspek BerAKHLAK (Atasan, Rekan, Self)',
        ev.behaviorScore.toFixed(2),
        `${ev.behaviorWeight}%`,
        ev.behaviorContribution.toFixed(2)
      ],
      [
        '3',
        'Kedisiplinan & Presensi (Absensi)\n• Data kehadiran presensi online terverifikasi',
        ev.attendanceScore.toFixed(2),
        `${ev.attendanceWeight}%`,
        ev.attendanceContribution.toFixed(2)
      ]
    ],
    foot: [
      [
        { content: 'TOTAL HASIL EVALUASI KINERJA', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: '100%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [241, 245, 249] } },
        { content: ev.finalScore.toFixed(2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [2, 132, 199] } }
      ]
    ]
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Predicate Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, currentY, pageWidth - 30, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PREDIKAT / KATEGORI KINERJA PPPK AKHIR:', 20, currentY + 7);
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${ev.category.toUpperCase()}`, 20, currentY + 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Nilai Akhir: ${ev.finalScore.toFixed(2)} (Skala 0 - 100)`, pageWidth - 20, currentY + 14, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  currentY += 24;

  // Detailed Attendance Snapshot Summary if available
  if (ev.finalSnapshot?.attendanceSummary) {
    const att = ev.finalSnapshot.attendanceSummary;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('II. CATATAN KEDISIPLINAN & PRESENSI PERIODE', 15, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      theme: 'plain',
      margin: { left: 15, right: 15 },
      styles: { fontSize: 8, cellPadding: 1 },
      body: [
        ['Hari Kerja Efektif', ':', `${att.workDays} Hari`, 'Keterlambatan', ':', `${att.lateCount} Kali`],
        ['Kehadiran Riil', ':', `${att.presentDays} Hari`, 'Pulang Lebih Cepat', ':', `${att.earlyLeaveCount} Kali`],
        ['Dinas Luar (DL)', ':', `${att.officialDutyCount} Hari`, 'Tanpa Keterangan', ':', `${att.absenceCount} Hari`]
      ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Signature Section
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY += 5;
  }

  const signDate = ev.finalizedAt ? ev.finalizedAt.split(' ')[0] : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Jakarta, ${signDate}`, pageWidth - 65, currentY);
  currentY += 5;

  const col1X = 25;
  const col2X = pageWidth - 65;

  doc.text('Pegawai yang Dinilai,', col1X, currentY);
  doc.text('Pejabat Penilai Kinerja / Atasan,', col2X, currentY);

  currentY += 20;

  doc.setFont('helvetica', 'bold');
  doc.text(ev.nama, col1X, currentY);
  doc.text(ev.finalizedBy || 'Atasan Langsung', col2X, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${ev.employeeId}`, col1X, currentY);
  doc.text('NIP. 197805122003121002', col2X, currentY);

  // Footer Note
  currentY += 10;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Dokumen ini dicetak secara digital dari Portal SDM DJKI pada ${new Date().toLocaleString('id-ID')}. Status: ${ev.isFinal ? 'Resmi (Final Terkunci)' : 'Draft'}`, 15, currentY);

  doc.save(`Laporan_Evaluasi_PPPK_${ev.employeeId}_${ev.year}_Sem${ev.semester}.pdf`);
}
