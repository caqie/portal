/**
 * PPPKExportUtils.ts
 * Export utilities for Evaluasi Kinerja PPPK:
 * 1. Excel export (.xlsx) using SheetJS (xlsx)
 * 2. PDF export (.pdf) using jsPDF and jspdf-autotable
 */

import * as XLSX from 'xlsx';
import { PPPKEvaluation } from '../../types';
import { AnnualRecapRow } from '../../services/pppkEvaluationService';
import {
  exportPPPKCompleteBundlePDF,
  exportPPPKEvaluasiKinerjaPDF,
  exportPPPKPerilakuKerjaPDF,
  exportPPPKHasilKerjaPDF
} from '../../services/pppkOfficialDocumentService';

export {
  exportPPPKCompleteBundlePDF,
  exportPPPKEvaluasiKinerjaPDF,
  exportPPPKPerilakuKerjaPDF,
  exportPPPKHasilKerjaPDF
};

/**
 * Main PDF Export for PPPK Evaluation
 * Exports the complete official 3-document dossier (5 pages) matching Permenpan RB 6/2022
 * and standard DJKI format:
 * 1. Evaluasi Penilaian Kinerja (2 Halaman Portrait)
 * 2. Penilaian Perilaku Kerja BerAKHLAK 28 Butir & Kehadiran (2 Halaman Landscape)
 * 3. Penilaian Hasil Kerja Target vs Realisasi (1 Halaman Landscape)
 */
export function exportPPPKEvaluationToPDF(ev: PPPKEvaluation): void {
  exportPPPKCompleteBundlePDF(ev);
}

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
