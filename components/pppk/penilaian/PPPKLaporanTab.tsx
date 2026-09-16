import React, { useState, useMemo, useRef } from 'react';
import {
  PPPKPenugasanPenilai,
  Pegawai,
  EvaluationPeriod,
  PPPKEvaluation
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  calculateEvaluasiAkhir,
  getPenugasanPenilaiList,
  getMasterPeriods
} from '../../../services/pppkPenilaianModuleService';
import {
  exportPPPKEvaluasiKinerjaPDF,
  exportPPPKPerilakuKerjaPDF,
  exportPPPKHasilKerjaPDF,
  exportPPPKCompleteBundlePDF,
  resolveOfficialEvaluationDetails
} from '../../../services/pppkOfficialDocumentService';

interface PPPKLaporanTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  selectedAssignmentId?: string;
  preselectedAssignmentId?: string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
}

export const PPPKLaporanTab: React.FC<PPPKLaporanTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  selectedAssignmentId,
  preselectedAssignmentId,
  showToast
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
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

  // Active target assignment
  const defaultAssign = useMemo(() => {
    const list = periodAssignments || [];
    if (targetSelectedId) {
      return list.find(a => a && a.id === targetSelectedId) || list[0];
    }
    return list[0];
  }, [periodAssignments, targetSelectedId]);

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

  // Active report type: 'DOC1' | 'DOC2' | 'DOC3' | 'BUNDLE'
  const [reportType, setReportType] = useState<'DOC1' | 'DOC2' | 'DOC3' | 'BUNDLE'>('DOC1');

  const evalDoc = useMemo(() => {
    if (!activeAssignment) return null;
    try {
      return calculateEvaluasiAkhir(activeAssignment.id);
    } catch (e) {
      return null;
    }
  }, [activeAssignment]);

  // Construct official PPPKEvaluation entity
  const officialEvaluation: PPPKEvaluation = useMemo(() => {
    const employeeNip = activeAssignment?.pppkNip || '199110152024212007';
    const employeeNama = activeAssignment?.pppkNama || 'Christia Sari';
    const jabatan = activeAssignment?.pppkJabatan || 'Analis Hukum Pertama';
    const unitKerja = activeAssignment?.pppkUnitKerja || 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL';
    const golRuang = activeAssignment?.pppkPangkat || 'IX';

    const penilaiNama = activeAssignment?.pejabatPenilaiNama || 'Achmad Iqbal Taufiq';
    const penilaiNip = activeAssignment?.pejabatPenilaiNip || '198305142010121003';
    const penilaiPangkat = activeAssignment?.pejabatPenilaiPangkat || 'Penata Tk. I (III/d)';
    const penilaiJabatan = activeAssignment?.pejabatPenilaiJabatan || 'Sekretaris Bidang Perumusan Kebijakan dan Peraturan';

    const atasanNama = activeAssignment?.atasanPejabatPenilaiNama || 'Bayu Santoso';
    const atasanNip = activeAssignment?.atasanPejabatPenilaiNip || '198906152012121001';
    const atasanPangkat = activeAssignment?.atasanPejabatPenilaiPangkat || 'Penata Tk. I (III/d)';
    const atasanJabatan = activeAssignment?.atasanPejabatPenilaiJabatan || 'Kepala Subdit Permohonan dan Pelayanan Direktorat HCDI';

    return {
      id: activeAssignment?.id || 'eval-preview',
      employeeId: employeeNip,
      nama: employeeNama,
      pangkatGolRuang: golRuang,
      jabatan: jabatan,
      unitKerja: unitKerja,
      jenisPegawai: 'PPPK',
      periodId: activeAssignment?.periodeId || 'period-2026-1',
      year: activeAssignment?.tahun || 2026,
      semester: (activeAssignment?.semester as any) || 'I',
      skpScore: 100,
      behaviorScore: evalDoc?.nilaiAkhirPerilaku || 87.5,
      attendanceScore: 100,
      skpWeight: 0.6,
      behaviorWeight: 0.4,
      attendanceWeight: 0,
      skpContribution: 60,
      behaviorContribution: 35,
      attendanceContribution: 0,
      finalScore: 95,
      category: 'Sangat Baik',
      status: 'FINAL',
      isFinal: true,
      pejabatPenilai: {
        nama: penilaiNama,
        nip: penilaiNip,
        pangkatGolRuang: penilaiPangkat,
        jabatan: penilaiJabatan,
        unitKerja: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL'
      },
      atasanPejabatPenilai: {
        nama: atasanNama,
        nip: atasanNip,
        pangkatGolRuang: atasanPangkat,
        jabatan: atasanJabatan,
        unitKerja: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL'
      },
      ratingHasilKerja: (evalDoc?.ratingHasilKerja as any) || 'DIATAS EKSPEKTASI',
      ratingPerilakuKerja: (evalDoc?.ratingPerilaku as any) || 'DIATAS EKSPEKTASI',
      predikatPenilaianKinerja: (evalDoc?.predikatKinerja as any) || 'SANGAT BAIK',
      rekomendasi: 'PERPANJANGAN PERJANJIAN KINERJA',
      catatanKinerja: ['DIPERTAHANKAN'],
      catatanTambahan: evalDoc?.catatanRekomendasi || '',
      kotaTtd: 'Jakarta',
      tanggalTtd: '01 Juli 2026',
      calculatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: 'SYSTEM',
      updatedAt: new Date().toISOString(),
      updatedBy: 'SYSTEM'
    };
  }, [activeAssignment, evalDoc]);

  // Resolve official computed details
  const docDetails = useMemo(() => {
    return resolveOfficialEvaluationDetails(officialEvaluation);
  }, [officialEvaluation]);

  // Print container ref
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Trigger Native Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Trigger jsPDF Direct Download
  const handleDownloadPdf = () => {
    try {
      if (reportType === 'DOC1') {
        exportPPPKEvaluasiKinerjaPDF(officialEvaluation);
        safeShowToast('Dokumen 1 (Evaluasi Penilaian Kinerja) berhasil diunduh dalam format PDF resmi.', 'success');
      } else if (reportType === 'DOC2') {
        exportPPPKPerilakuKerjaPDF(officialEvaluation);
        safeShowToast('Dokumen 2 (Penilaian Perilaku Kerja) berhasil diunduh dalam format PDF resmi.', 'success');
      } else if (reportType === 'DOC3') {
        exportPPPKHasilKerjaPDF(officialEvaluation);
        safeShowToast('Dokumen 3 (Penilaian Hasil Kerja) berhasil diunduh dalam format PDF resmi.', 'success');
      } else {
        exportPPPKCompleteBundlePDF(officialEvaluation);
        safeShowToast('Berkas Lengkap (3 Dokumen PDF / 5 Halaman) berhasil diunduh.', 'success');
      }
    } catch (e) {
      safeShowToast('Terjadi kesalahan saat membuat file PDF.', 'error');
    }
  };

  // Export to CSV/Excel
  const handleExportExcel = () => {
    if (!activeAssignment || !evalDoc) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'FORMULIR EVALUASI KINERJA PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA (PPPK)\r\n';
    csvContent += `KEMENTERIAN HUKUM DAN HAK ASASI MANUSIA RI - DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL\r\n\r\n`;
    csvContent += `Nama Pegawai,${docDetails.namaPegawai}\r\n`;
    csvContent += `NIP PPPK,${docDetails.nipPegawai}\r\n`;
    csvContent += `Jabatan,${docDetails.jabatanPegawai}\r\n`;
    csvContent += `Unit Kerja,${docDetails.unitKerjaPegawai}\r\n`;
    csvContent += `Pejabat Penilai,${docDetails.pejabatPenilai.nama} (${docDetails.pejabatPenilai.jabatan})\r\n`;
    csvContent += `Rating Hasil Kerja,${docDetails.ratingHasilKerja}\r\n`;
    csvContent += `Rating Perilaku Kerja,${docDetails.ratingPerilakuKerja}\r\n`;
    csvContent += `Predikat Kinerja Periodik,${docDetails.predikatPenilaianKinerja}\r\n`;
    csvContent += `Rekomendasi,"${docDetails.rekomendasi}"\r\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EVALUASI_PPPK_${docDetails.nipPegawai}_${officialEvaluation.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    safeShowToast('Data evaluasi berhasil diekspor ke format Excel / CSV.', 'success');
  };

  // Helper flags for checkboxes in Doc 1
  const isPerpanjang = docDetails.rekomendasi.includes('PERPANJANGAN');
  const isPemutusan = docDetails.rekomendasi.includes('PEMUTUSAN');
  const isDipertahankan = docDetails.catatanKinerja.includes('DIPERTAHANKAN');
  const isRotasi = docDetails.catatanKinerja.includes('ROTASI');
  const isBangkom = docDetails.catatanKinerja.includes('PENGEMBANGAN KARIR');
  const isBimbingan = docDetails.catatanKinerja.includes('BIMBINGAN KINERJA');

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Controls (Hidden during print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-700 text-white">
              Submenu 9
            </span>
            <span className="text-xs text-slate-500 font-bold">Format Dokumen Resmi KemenPANRB & DJKI</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Pusat Cetak Dokumen & Ekspor PDF Resmi
          </h3>
          <p className="text-xs text-slate-600">
            Tampilan cetak dan file PDF dihasilkan sesuai format standar resmi Permenpan RB Nomor 6 Tahun 2022.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subjek Selector */}
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

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-all flex items-center gap-1.5"
          >
            <i className="bi bi-file-earmark-excel-fill text-emerald-600"></i>
            Excel
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-md shadow-red-900/20 flex items-center gap-1.5"
          >
            <i className="bi bi-file-earmark-pdf-fill"></i>
            Unduh PDF Resmi
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs transition-all shadow-md shadow-blue-900/20 flex items-center gap-1.5"
          >
            <i className="bi bi-printer-fill"></i>
            Cetak Dokumen
          </button>
        </div>
      </div>

      {/* Report Switcher Tabs (Hidden during print) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={() => setReportType('DOC1')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            reportType === 'DOC1'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          1. Evaluasi Penilaian Kinerja (2 Halaman)
        </button>
        <button
          onClick={() => setReportType('DOC2')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            reportType === 'DOC2'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          2. Penilaian Perilaku Kerja (Landscape 2 Hal)
        </button>
        <button
          onClick={() => setReportType('DOC3')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            reportType === 'DOC3'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          3. Penilaian Hasil Kerja (Landscape 1 Hal)
        </button>
        <button
          onClick={() => setReportType('BUNDLE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            reportType === 'BUNDLE'
              ? 'bg-emerald-700 text-white shadow-md'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          4. Berkas Lengkap Semua Dokumen (5 Hal)
        </button>
      </div>

      {/* Printable Sheet Container */}
      <div ref={printContainerRef} className="space-y-8 font-sans text-slate-900 leading-normal">
        
        {/* =================================================================== */}
        {/* DOKUMEN 1: EVALUASI PENILAIAN KINERJA (2 HALAMAN PORTRAIT) */}
        {/* =================================================================== */}
        {(reportType === 'DOC1' || reportType === 'BUNDLE') && (
          <div className="space-y-8">
            {/* HALAMAN 1 DOKUMEN 1 */}
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-md max-w-4xl mx-auto text-[11px] print:p-0 print:border-none print:shadow-none print:max-w-none print:break-after-page">
              
              {/* Header Title */}
              <div className="text-center font-bold mb-4">
                <div className="text-xs uppercase tracking-wide">EVALUASI PENILAIAN KINERJA</div>
                <div className="text-xs uppercase tracking-wide">PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)</div>
              </div>

              {/* Subheader */}
              <div className="flex justify-between items-end text-[10px] font-bold mb-1">
                <div>DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</div>
                <div className="text-right">
                  <div>PERIODE PENILAIAN</div>
                  <div className="font-normal">{docDetails.periodeText}</div>
                </div>
              </div>

              {/* Official 5-Section Table */}
              <table className="w-full border-collapse border border-black text-[10px]">
                <tbody>
                  {/* SEKSI 1: PEGAWAI YANG DINILAI */}
                  <tr>
                    <td rowSpan={6} className="border border-black font-bold text-center w-8 align-middle">1</td>
                    <td colSpan={3} className="border border-black font-bold bg-[#7ec4ec] px-2 py-1 uppercase">
                      PEGAWAI YANG DINILAI
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5 w-48">NAMA</td>
                    <td className="border border-black text-center w-4">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.namaPegawai}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">NIP</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.nipPegawai}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">PANGKAT/GOL RUANG</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pangkatPegawai}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">JABATAN</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.jabatanPegawai}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">UNIT KERJA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.unitKerjaPegawai}</td>
                  </tr>

                  {/* SEKSI 2: PEJABAT PENILAI KINERJA */}
                  <tr>
                    <td rowSpan={6} className="border border-black font-bold text-center align-middle">2</td>
                    <td colSpan={3} className="border border-black font-bold bg-[#7ec4ec] px-2 py-1 uppercase">
                      PEJABAT PENILAI KINERJA
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">NAMA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.nama}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">NIP</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.nip}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">PANGKAT/GOL RUANG</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.pangkatGolRuang}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">JABATAN</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.jabatan}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">UNIT KERJA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.unitKerja}</td>
                  </tr>

                  {/* SEKSI 3: ATASAN PEJABAT PENILAI KINERJA */}
                  <tr>
                    <td rowSpan={6} className="border border-black font-bold text-center align-middle">3</td>
                    <td colSpan={3} className="border border-black font-bold bg-[#7ec4ec] px-2 py-1 uppercase">
                      ATASAN PEJABAT PENILAI KINERJA
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">NAMA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.atasanPejabatPenilai.nama}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">NIP</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.atasanPejabatPenilai.nip}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">PANGKAT/GOL RUANG</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.atasanPejabatPenilai.pangkatGolRuang}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">JABATAN</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.atasanPejabatPenilai.jabatan}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">UNIT KERJA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.atasanPejabatPenilai.unitKerja}</td>
                  </tr>

                  {/* SEKSI 4: EVALUASI PENILAIAN KINERJA */}
                  <tr>
                    <td rowSpan={4} className="border border-black font-bold text-center align-middle">4</td>
                    <td colSpan={3} className="border border-black font-bold bg-[#7ec4ec] px-2 py-1 uppercase">
                      EVALUASI PENILAIAN KINERJA
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">RATING HASIL KERJA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black font-bold px-2 py-0.5">{docDetails.ratingHasilKerja}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">RATING PERILAKU KERJA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black font-bold px-2 py-0.5">{docDetails.ratingPerilakuKerja}</td>
                  </tr>
                  <tr>
                    <td className="border border-black font-bold px-2 py-0.5">PREDIKAT PENILAIAN KINERJA</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black font-bold px-2 py-0.5">{docDetails.predikatPenilaianKinerja}</td>
                  </tr>

                  {/* SEKSI 5: CATATAN ATAU REKOMENDASI */}
                  <tr>
                    <td rowSpan={10} className="border border-black font-bold text-center align-middle">5</td>
                    <td colSpan={3} className="border border-black font-bold bg-[#7ec4ec] px-2 py-1 uppercase">
                      CATATAN ATAU REKOMENDASI
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black font-bold px-2 py-0.5">REKOMENDASI</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-4 py-0.5">
                      <span className="font-mono inline-block w-6 text-center border border-black mr-2 text-[9px] leading-tight">
                        {isPerpanjang ? '✓' : ''}
                      </span>
                      PERPANJANGAN PERJANJIAN KINERJA
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-4 py-0.5">
                      <span className="font-mono inline-block w-6 text-center border border-black mr-2 text-[9px] leading-tight">
                        {isPemutusan ? '✓' : ''}
                      </span>
                      PEMUTUSAN PERJANJIAN KINERJA
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black font-bold px-2 py-0.5">CATATAN</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-4 py-0.5">
                      <span className="font-mono inline-block w-6 text-center border border-black mr-2 text-[9px] leading-tight">
                        {isDipertahankan ? '✓' : ''}
                      </span>
                      DIPERTAHANKAN
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-4 py-0.5">
                      <span className="font-mono inline-block w-6 text-center border border-black mr-2 text-[9px] leading-tight">
                        {isRotasi ? '✓' : ''}
                      </span>
                      ROTASI
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-4 py-0.5">
                      <span className="font-mono inline-block w-6 text-center border border-black mr-2 text-[9px] leading-tight">
                        {isBangkom ? '✓' : ''}
                      </span>
                      PENGEMBANGAN KARIR
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-4 py-0.5">
                      <span className="font-mono inline-block w-6 text-center border border-black mr-2 text-[9px] leading-tight">
                        {isBimbingan ? '✓' : ''}
                      </span>
                      BIMBINGAN KINERJA
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="border border-black px-2 py-1">
                      CATATAN TAMBAHAN : {docDetails.catatanTambahan && docDetails.catatanTambahan !== '-' ? docDetails.catatanTambahan : ''}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tanda Tangan Section */}
              <div className="mt-6 text-[10px] space-y-6">
                
                {/* Baris 1: Pegawai vs Pejabat Penilai */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div>Pegawai yang dinilai</div>
                    <div className="h-16"></div>
                    <div className="font-bold">{docDetails.namaPegawai}</div>
                    <div>{docDetails.nipPegawai}</div>
                  </div>

                  <div className="text-center">
                    <div>{docDetails.kotaTtd}, {docDetails.tanggalTtd}</div>
                    <div>Pejabat Penilai Kinerja</div>
                    <div>(Pejabat Manajerial/Ketua Tim Kerja)</div>
                    <div className="h-12"></div>
                    <div className="font-bold">{docDetails.pejabatPenilai.nama}</div>
                    <div>{docDetails.pejabatPenilai.nip}</div>
                  </div>
                </div>

                {/* Baris 2: Atasan Pejabat Penilai */}
                <div className="text-center pt-2">
                  <div>Mengetahui</div>
                  <div className="font-bold uppercase">ATASAN PEJABAT PENILAI KINERJA</div>
                  <div>{docDetails.atasanPejabatPenilai.jabatan}</div>
                  <div className="h-16"></div>
                  <div className="font-bold">{docDetails.atasanPejabatPenilai.nama}</div>
                  <div>{docDetails.atasanPejabatPenilai.nip}</div>
                </div>

              </div>

            </div>

            {/* HALAMAN 2 DOKUMEN 1: MATRIKS PREDIKAT KINERJA */}
            <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-md max-w-4xl mx-auto text-[11px] print:p-0 print:border-none print:shadow-none print:max-w-none print:break-after-page">
              
              <div className="text-center font-bold mb-4">
                <div className="text-xs uppercase">Matriks Predikat Kinerja Pegawai</div>
                <div className="text-[10px] font-normal">(Berdasarkan Ketentuan Permenpan RB Nomor 6 Tahun 2022)</div>
              </div>

              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th className="border border-black px-2 py-1.5 w-16">Nomor</th>
                    <th className="border border-black px-2 py-1.5 w-48">Predikat Kinerja Pegawai</th>
                    <th className="border border-black px-2 py-1.5">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black text-center font-bold px-2 py-1.5">1</td>
                    <td className="border border-black text-center font-bold px-2 py-1.5">Sangat Baik</td>
                    <td className="border border-black px-2 py-1.5">Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai diatas ekspektasi.</td>
                  </tr>
                  <tr>
                    <td className="border border-black text-center font-bold px-2 py-1.5">2</td>
                    <td className="border border-black text-center font-bold px-2 py-1.5">Baik</td>
                    <td className="border border-black px-2 py-1.5 whitespace-pre-line">
                      1. Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai sesuai ekspektasi{'\n'}
                      2. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai sesuai ekspektasi{'\n'}
                      3. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai diatas ekspektasi
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black text-center font-bold px-2 py-1.5">3</td>
                    <td className="border border-black text-center font-bold px-2 py-1.5">Butuh Perbaikan</td>
                    <td className="border border-black px-2 py-1.5 whitespace-pre-line">
                      1. Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai diatas ekspektasi{'\n'}
                      2. Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai sesuai ekspektasi
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black text-center font-bold px-2 py-1.5">4</td>
                    <td className="border border-black text-center font-bold px-2 py-1.5">Kurang</td>
                    <td className="border border-black px-2 py-1.5 whitespace-pre-line">
                      1. Hasil kerja pegawai diatas ekspektasi dan perilaku kerja pegawai dibawah ekspektasi{'\n'}
                      2. Hasil kerja pegawai sesuai ekspektasi dan perilaku kerja pegawai dibawah ekspektasi
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black text-center font-bold px-2 py-1.5">5</td>
                    <td className="border border-black text-center font-bold px-2 py-1.5">Sangat Kurang</td>
                    <td className="border border-black px-2 py-1.5">Hasil kerja pegawai dibawah ekspektasi dan perilaku kerja pegawai dibawah ekspektasi</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-2 text-[9px] italic">
                *) Predikat Kinerja Pegawai didasarkan pada Permenpan RB Nomor 6 Tahun 2022
              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* DOKUMEN 2: PENILAIAN PERILAKU KERJA (LANDSCAPE 2 HALAMAN) */}
        {/* =================================================================== */}
        {(reportType === 'DOC2' || reportType === 'BUNDLE') && (
          <div className="space-y-8">
            {/* HALAMAN 1 DOKUMEN 2: Aspek 1 s.d 4 */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md max-w-6xl mx-auto text-[9.5px] print:p-0 print:border-none print:shadow-none print:max-w-none print:break-after-page">
              
              {/* Header Title */}
              <div className="text-center font-bold mb-3">
                <div className="text-xs uppercase">PENILAIAN PERILAKU KERJA</div>
                <div className="text-xs uppercase">PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)</div>
              </div>

              {/* Subheader */}
              <div className="flex justify-between items-end text-[9px] font-bold mb-1">
                <div>Direktorat Jenderal Kekayaan Intelektual</div>
                <div className="text-right">
                  <div>Periode Penilaian</div>
                  <div className="font-normal">{docDetails.periodeText}</div>
                </div>
              </div>

              {/* Top Identity 2 Columns */}
              <table className="w-full border-collapse border border-black text-[9px] mb-2">
                <thead>
                  <tr className="bg-[#7ec4ec] text-black font-bold">
                    <th colSpan={3} className="border border-black px-2 py-1 text-left w-1/2">Pegawai Yang dinilai</th>
                    <th colSpan={3} className="border border-black px-2 py-1 text-left w-1/2">Pejabat Penilai Kinerja</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black px-2 py-0.5 font-bold w-24">Nama</td>
                    <td className="border border-black text-center w-3">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.namaPegawai}</td>
                    <td className="border border-black px-2 py-0.5 font-bold w-28">Nama</td>
                    <td className="border border-black text-center w-3">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.nama}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-0.5 font-bold">NIP</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.nipPegawai}</td>
                    <td className="border border-black px-2 py-0.5 font-bold">NIP</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.nip}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-0.5 font-bold">Pangkat / Gol Ruang</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pangkatPegawai}</td>
                    <td className="border border-black px-2 py-0.5 font-bold">Pangkat / Gol Ruang</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.pangkatGolRuang}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-0.5 font-bold">Jabatan</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.jabatanPegawai}</td>
                    <td className="border border-black px-2 py-0.5 font-bold">Jabatan</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.jabatan}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-0.5 font-bold">Unit Kerja</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.unitKerjaPegawai}</td>
                    <td className="border border-black px-2 py-0.5 font-bold">Unit Kerja</td>
                    <td className="border border-black text-center">:</td>
                    <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.unitKerja}</td>
                  </tr>
                </tbody>
              </table>

              {/* Main Matrix Table Page 1 (Aspects 1 to 4) */}
              <table className="w-full border-collapse border border-black text-[8.5px]">
                <thead>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th rowSpan={3} className="border border-black px-1 py-1 w-6">No</th>
                    <th rowSpan={3} className="border border-black px-2 py-1">
                      Standar Penilaian Perilaku Kerja<br/>Aspek Penilaian
                    </th>
                    <th colSpan={3} className="border border-black px-2 py-0.5">
                      Penilaian Perilaku<br/>Bobot 60%
                    </th>
                    <th colSpan={2} className="border border-black px-2 py-0.5">
                      Penilaian Kehadiran<br/>Bobot 40%
                    </th>
                    <th rowSpan={3} className="border border-black px-1 py-1 w-24">
                      Nilai Akhir Perilaku Kerja<br/>
                      <span className="text-[7.5px] font-normal">((rata-rata pejabat x 60%) + (rata-rata rekan : 2 x 40%)) x 60%</span>
                    </th>
                    <th rowSpan={3} className="border border-black px-1 py-1 w-20">
                      Nilai Kehadiran<br/>
                      <span className="text-[7.5px] font-normal">(Analisis Kehadiran * 40%)</span>
                    </th>
                  </tr>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th className="border border-black px-1 py-0.5 w-16">Pejabat Penilai Kinerja (60%)</th>
                    <th colSpan={2} className="border border-black px-1 py-0.5">Rekan Kerja (40%)</th>
                    <th rowSpan={2} className="border border-black px-1 py-0.5 w-10">Alfa</th>
                    <th rowSpan={2} className="border border-black px-1 py-0.5 w-24">Analisis Kehadiran Berdasarkan Tabel</th>
                  </tr>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th className="border border-black px-1 py-0.5">Skor Jawaban</th>
                    <th className="border border-black px-1 py-0.5 w-14">Rekan Kerja PNS</th>
                    <th className="border border-black px-1 py-0.5 w-14">Rekan Kerja PPPK</th>
                  </tr>
                </thead>
                <tbody>
                  {docDetails.berakhlakList.slice(0, 4).map((asp, aspIdx) => {
                    const totalSubItems = docDetails.berakhlakList.slice(0, 4).reduce((acc, a) => acc + a.subItems.length, 0);
                    return asp.subItems.map((sub, subIdx) => (
                      <tr key={`${asp.no}-${sub.code}`}>
                        {subIdx === 0 && (
                          <td rowSpan={asp.subItems.length} className="border border-black text-center font-bold align-middle">
                            {asp.no}
                          </td>
                        )}
                        <td className="border border-black px-1.5 py-0.5">
                          {sub.code}. {sub.pertanyaan}
                        </td>
                        <td className="border border-black text-center px-1 py-0.5">{sub.skorPejabat}</td>
                        <td className="border border-black text-center px-1 py-0.5">{sub.skorRekanPns}</td>
                        <td className="border border-black text-center px-1 py-0.5">{sub.skorRekanPppk}</td>

                        {/* Kehadiran columns spanning all 16 rows of page 1 */}
                        {aspIdx === 0 && subIdx === 0 && (
                          <>
                            <td rowSpan={totalSubItems} className="border border-black text-center font-bold align-middle">
                              {docDetails.alfaCount}
                            </td>
                            <td rowSpan={totalSubItems} className="border border-black text-center font-bold align-middle">
                              {docDetails.analisisKehadiranSkor}
                            </td>
                          </>
                        )}

                        {/* Nilai Akhir Perilaku per Aspek */}
                        {subIdx === 0 && (
                          <td rowSpan={asp.subItems.length} className="border border-black text-center font-bold bg-[#7ec4ec] align-middle">
                            {asp.nilaiAkhirAspek.toFixed(2).replace('.', ',')}
                          </td>
                        )}

                        {/* Nilai Kehadiran Bobot */}
                        {aspIdx === 0 && subIdx === 0 && (
                          <td rowSpan={totalSubItems} className="border border-black text-center font-bold bg-[#7ec4ec] align-middle">
                            {docDetails.nilaiKehadiranBobot.toFixed(2).replace('.', ',')}
                          </td>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>

            </div>

            {/* HALAMAN 2 DOKUMEN 2: Aspek 5 s.d 7 + Rekap + Tabel Skala + TTD */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md max-w-6xl mx-auto text-[9.5px] print:p-0 print:border-none print:shadow-none print:max-w-none print:break-after-page">
              
              {/* Main Matrix Table Page 2 (Aspects 5 to 7) */}
              <table className="w-full border-collapse border border-black text-[8.5px] mb-3">
                <thead>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th rowSpan={3} className="border border-black px-1 py-1 w-6">No</th>
                    <th rowSpan={3} className="border border-black px-2 py-1">
                      Standar Penilaian Perilaku Kerja<br/>Aspek Penilaian
                    </th>
                    <th colSpan={3} className="border border-black px-2 py-0.5">
                      Penilaian Perilaku<br/>Bobot 60%
                    </th>
                    <th colSpan={2} className="border border-black px-2 py-0.5">
                      Penilaian Kehadiran<br/>Bobot 40%
                    </th>
                    <th rowSpan={3} className="border border-black px-1 py-1 w-24">
                      Nilai Akhir Perilaku Kerja
                    </th>
                    <th rowSpan={3} className="border border-black px-1 py-1 w-20">
                      Nilai Kehadiran
                    </th>
                  </tr>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th className="border border-black px-1 py-0.5 w-16">Pejabat Penilai Kinerja (60%)</th>
                    <th colSpan={2} className="border border-black px-1 py-0.5">Rekan Kerja (40%)</th>
                    <th rowSpan={2} className="border border-black px-1 py-0.5 w-10">Alfa</th>
                    <th rowSpan={2} className="border border-black px-1 py-0.5 w-24">Analisis Kehadiran Berdasarkan Tabel</th>
                  </tr>
                  <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                    <th className="border border-black px-1 py-0.5">Skor Jawaban</th>
                    <th className="border border-black px-1 py-0.5 w-14">Rekan Kerja PNS</th>
                    <th className="border border-black px-1 py-0.5 w-14">Rekan Kerja PPPK</th>
                  </tr>
                </thead>
                <tbody>
                  {docDetails.berakhlakList.slice(4, 7).map((asp, aspIdx) => {
                    const totalSubItems = docDetails.berakhlakList.slice(4, 7).reduce((acc, a) => acc + a.subItems.length, 0);
                    return asp.subItems.map((sub, subIdx) => (
                      <tr key={`${asp.no}-${sub.code}`}>
                        {subIdx === 0 && (
                          <td rowSpan={asp.subItems.length} className="border border-black text-center font-bold align-middle">
                            {asp.no}
                          </td>
                        )}
                        <td className="border border-black px-1.5 py-0.5">
                          {sub.code}. {sub.pertanyaan}
                        </td>
                        <td className="border border-black text-center px-1 py-0.5">{sub.skorPejabat}</td>
                        <td className="border border-black text-center px-1 py-0.5">{sub.skorRekanPns}</td>
                        <td className="border border-black text-center px-1 py-0.5">{sub.skorRekanPppk}</td>

                        {/* Kehadiran columns spanning all rows of page 2 */}
                        {aspIdx === 0 && subIdx === 0 && (
                          <>
                            <td rowSpan={totalSubItems} className="border border-black text-center font-bold align-middle">
                              {docDetails.alfaCount}
                            </td>
                            <td rowSpan={totalSubItems} className="border border-black text-center font-bold align-middle">
                              {docDetails.analisisKehadiranSkor}
                            </td>
                          </>
                        )}

                        {/* Nilai Akhir Perilaku per Aspek */}
                        {subIdx === 0 && (
                          <td rowSpan={asp.subItems.length} className="border border-black text-center font-bold bg-[#7ec4ec] align-middle">
                            {asp.nilaiAkhirAspek.toFixed(2).replace('.', ',')}
                          </td>
                        )}

                        {/* Nilai Kehadiran Bobot */}
                        {aspIdx === 0 && subIdx === 0 && (
                          <td rowSpan={totalSubItems} className="border border-black text-center font-bold bg-[#7ec4ec] align-middle">
                            {docDetails.nilaiKehadiranBobot.toFixed(2).replace('.', ',')}
                          </td>
                        )}
                      </tr>
                    ));
                  })}

                  {/* Summary Rows at Bottom of Matrix */}
                  <tr>
                    <td colSpan={7} className="border border-black text-right font-bold px-2 py-1">
                      Rata-rata Nilai Perilaku & Nilai Kehadiran
                    </td>
                    <td className="border border-black text-center font-bold bg-[#7ec4ec] px-1 py-1">
                      {docDetails.totalPerilakuRataRata.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="border border-black text-center font-bold bg-[#7ec4ec] px-1 py-1">
                      {docDetails.nilaiKehadiranBobot.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={7} className="border border-black text-left font-bold bg-[#7ec4ec] px-2 py-1">
                      Jumlah Nilai perilaku + Nilai Kehadiran
                    </td>
                    <td colSpan={2} className="border border-black text-center font-bold bg-[#7ec4ec] px-1 py-1">
                      {docDetails.jumlahPerilakuPlusKehadiran.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>

                  <tr>
                    <td colSpan={7} className="border border-black text-left font-bold bg-[#7ec4ec] px-2 py-1">
                      Rating Penilaian Perilaku Kerja
                    </td>
                    <td colSpan={2} className="border border-black text-center font-bold bg-[#7ec4ec] px-1 py-1">
                      {docDetails.ratingPerilakuKerja}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Section: 3 Reference Tables (Left) + Pejabat Penilai Signature (Right) */}
              <div className="grid grid-cols-2 gap-6 items-start text-[8px]">
                
                {/* 3 Reference Tables */}
                <div className="space-y-2 max-w-sm">
                  
                  {/* Tabel 1: Skala Penilaian Perilaku Kerja */}
                  <table className="w-full border-collapse border border-black">
                    <thead>
                      <tr className="bg-[#7ec4ec] font-bold text-black">
                        <th colSpan={2} className="border border-black px-1.5 py-0.5 text-left">1. Tabel Skala Penilaian Perilaku Kerja</th>
                      </tr>
                      <tr className="bg-slate-50 font-semibold text-center">
                        <th className="border border-black px-1 py-0.5 w-24">Skala Penilaian</th>
                        <th className="border border-black px-1 py-0.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="border border-black text-center py-0.5">1</td><td className="border border-black px-1.5 py-0.5">Sangat Kurang</td></tr>
                      <tr><td className="border border-black text-center py-0.5">2</td><td className="border border-black px-1.5 py-0.5">Kurang</td></tr>
                      <tr><td className="border border-black text-center py-0.5">3</td><td className="border border-black px-1.5 py-0.5">Cukup</td></tr>
                      <tr><td className="border border-black text-center py-0.5">4</td><td className="border border-black px-1.5 py-0.5">Baik</td></tr>
                      <tr><td className="border border-black text-center py-0.5">5</td><td className="border border-black px-1.5 py-0.5">Sangat Baik</td></tr>
                    </tbody>
                  </table>

                  {/* Tabel 2: Analisis Kehadiran */}
                  <table className="w-full border-collapse border border-black">
                    <thead>
                      <tr className="bg-[#7ec4ec] font-bold text-black">
                        <th colSpan={3} className="border border-black px-1.5 py-0.5 text-left">2. Tabel Analisis Kehadiran</th>
                      </tr>
                      <tr className="bg-slate-50 font-semibold text-center">
                        <th className="border border-black px-1 py-0.5 w-20">Skala Penilaian</th>
                        <th className="border border-black px-1 py-0.5 w-28">Keterangan</th>
                        <th className="border border-black px-1 py-0.5">Kriteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="border border-black text-center py-0.5">1</td><td className="border border-black px-1.5 py-0.5">Sangat Kurang</td><td className="border border-black px-1.5 py-0.5">Alfa : &gt;8 kali</td></tr>
                      <tr><td className="border border-black text-center py-0.5">2</td><td className="border border-black px-1.5 py-0.5">Kurang</td><td className="border border-black px-1.5 py-0.5">Alfa : 6 - 8 kali</td></tr>
                      <tr><td className="border border-black text-center py-0.5">3</td><td className="border border-black px-1.5 py-0.5">Cukup</td><td className="border border-black px-1.5 py-0.5">Alfa : 3 - 5 kali</td></tr>
                      <tr><td className="border border-black text-center py-0.5">4</td><td className="border border-black px-1.5 py-0.5">Baik</td><td className="border border-black px-1.5 py-0.5">Alfa : 1 - 2 kali</td></tr>
                      <tr><td className="border border-black text-center py-0.5">5</td><td className="border border-black px-1.5 py-0.5">Sangat Baik</td><td className="border border-black px-1.5 py-0.5">Alfa : 0 kali</td></tr>
                    </tbody>
                  </table>

                  {/* Tabel 3: Rating Penilaian Perilaku Kerja */}
                  <table className="w-full border-collapse border border-black">
                    <thead>
                      <tr className="bg-[#7ec4ec] font-bold text-black">
                        <th colSpan={2} className="border border-black px-1.5 py-0.5 text-left">3. Tabel Rating Penilaian Perilaku Kerja</th>
                      </tr>
                      <tr className="bg-slate-50 font-semibold text-center">
                        <th className="border border-black px-1 py-0.5 w-28">Range</th>
                        <th className="border border-black px-1 py-0.5">Rating Perilaku</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="border border-black text-center py-0.5">4,32 - 5</td><td className="border border-black px-1.5 py-0.5">Diatas Ekspektasi</td></tr>
                      <tr><td className="border border-black text-center py-0.5">3,60 - 4,31</td><td className="border border-black px-1.5 py-0.5">Sesuai Ekspektasi</td></tr>
                      <tr><td className="border border-black text-center py-0.5">1 - 3,59</td><td className="border border-black px-1.5 py-0.5">Dibawah Ekspektasi</td></tr>
                    </tbody>
                  </table>

                </div>

                {/* Pejabat Penilai Kinerja Signature */}
                <div className="text-center pt-6 space-y-1 text-[9px] ml-auto w-64">
                  <div>{docDetails.kotaTtd}, {docDetails.tanggalTtd}</div>
                  <div>Pejabat Penilai Kinerja</div>
                  <div>(Pejabat Manajerial/Ketua Tim Kerja)</div>
                  <div className="h-16"></div>
                  <div className="font-bold">{docDetails.pejabatPenilai.nama}</div>
                  <div>{docDetails.pejabatPenilai.nip}</div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* DOKUMEN 3: PENILAIAN HASIL KERJA (LANDSCAPE 1 HALAMAN) */}
        {/* =================================================================== */}
        {(reportType === 'DOC3' || reportType === 'BUNDLE') && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-md max-w-6xl mx-auto text-[9.5px] print:p-0 print:border-none print:shadow-none print:max-w-none print:break-after-page">
            
            {/* Header Title */}
            <div className="text-center font-bold mb-3">
              <div className="text-xs uppercase">PENILAIAN HASIL KERJA</div>
              <div className="text-[9px] font-normal uppercase">*PEJABAT PENILAI KINERJA : PEJABAT MANAJERIAL/KETUA TIM KERJA</div>
              <div className="text-xs uppercase">PEGAWAI PEMERINTAH DENGAN PERJANJIAN KINERJA (PPPK)</div>
            </div>

            {/* Subheader */}
            <div className="flex justify-between items-end text-[9px] font-bold mb-1">
              <div>Direktorat Jenderal Kekayaan Intelektual</div>
              <div className="text-right">
                <div>Periode Penilaian</div>
                <div className="font-normal">{docDetails.periodeText}</div>
              </div>
            </div>

            {/* Identity 2 Columns */}
            <table className="w-full border-collapse border border-black text-[9px] mb-2">
              <thead>
                <tr className="bg-[#7ec4ec] text-black font-bold">
                  <th colSpan={3} className="border border-black px-2 py-1 text-left w-1/2">Pegawai Yang dinilai</th>
                  <th colSpan={3} className="border border-black px-2 py-1 text-left w-1/2">Pejabat Penilai Kinerja</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold w-24">Nama</td>
                  <td className="border border-black text-center w-3">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.namaPegawai}</td>
                  <td className="border border-black px-2 py-0.5 font-bold w-28">Nama</td>
                  <td className="border border-black text-center w-3">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.nama}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold">NIP</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.nipPegawai}</td>
                  <td className="border border-black px-2 py-0.5 font-bold">NIP</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.nip}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold">Pangkat / Gol Ruang</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.pangkatPegawai}</td>
                  <td className="border border-black px-2 py-0.5 font-bold">Pangkat / Gol Ruang</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.pangkatGolRuang}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold">Jabatan</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.jabatanPegawai}</td>
                  <td className="border border-black px-2 py-0.5 font-bold">Jabatan</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.jabatan}</td>
                </tr>
                <tr>
                  <td className="border border-black px-2 py-0.5 font-bold">Unit Kerja</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.unitKerjaPegawai}</td>
                  <td className="border border-black px-2 py-0.5 font-bold">Unit Kerja</td>
                  <td className="border border-black text-center">:</td>
                  <td className="border border-black px-2 py-0.5">{docDetails.pejabatPenilai.unitKerja}</td>
                </tr>
              </tbody>
            </table>

            {/* Main Penilaian Hasil Kerja Table (Exact 13 Rows) */}
            <table className="w-full border-collapse border border-black text-[9px] mb-3">
              <thead>
                <tr className="bg-[#7ec4ec] text-black font-bold">
                  <th colSpan={4} className="border border-black px-2 py-1 text-left">Penilaian Hasil Kerja</th>
                </tr>
                <tr className="bg-[#7ec4ec] text-black font-bold text-center">
                  <th className="border border-black px-1 py-1 w-8">No</th>
                  <th className="border border-black px-2 py-1">Rencana Hasil Kerja</th>
                  <th className="border border-black px-2 py-1 w-24">Target</th>
                  <th className="border border-black px-2 py-1 w-24">Realisasi</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(docDetails.hasilKerjaList.length, 13) }).map((_, idx) => {
                  const item = docDetails.hasilKerjaList[idx];
                  return (
                    <tr key={idx}>
                      <td className="border border-black text-center py-0.5">{idx + 1}</td>
                      <td className="border border-black px-2 py-0.5">{item?.rencanaHasilKerja || ''}</td>
                      <td className="border border-black text-center px-2 py-0.5">{item ? item.target : idx === 12 ? '0' : ''}</td>
                      <td className="border border-black text-center px-2 py-0.5">{item ? item.realisasi : idx === 12 ? '0' : ''}</td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="font-bold text-center">
                  <td colSpan={2} className="border border-black px-2 py-1">Total</td>
                  <td className="border border-black px-2 py-1">{docDetails.totalTarget}</td>
                  <td className="border border-black px-2 py-1">{docDetails.totalRealisasi}</td>
                </tr>
                {/* Rating Hasil Kerja Row */}
                <tr className="font-bold text-center bg-[#7ec4ec]">
                  <td colSpan={2} className="border border-black px-2 py-1">Rating Hasil Kerja</td>
                  <td colSpan={2} className="border border-black px-2 py-1">{docDetails.ratingHasilKerja}</td>
                </tr>
              </tbody>
            </table>

            {/* Bottom section: Left Reference Matrix & Right Signature */}
            <div className="grid grid-cols-2 gap-6 items-start text-[8.5px]">
              
              {/* Left Reference Table */}
              <div className="space-y-1 max-w-sm">
                <table className="w-full border-collapse border border-black">
                  <thead>
                    <tr className="bg-[#7ec4ec] font-bold text-center text-black">
                      <th className="border border-black px-1.5 py-0.5 w-8">No</th>
                      <th className="border border-black px-2 py-0.5 w-32">Keterangan</th>
                      <th className="border border-black px-2 py-0.5">Rating Hasil Kerja</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-black text-center py-0.5">1</td><td className="border border-black px-2 py-0.5">Realisasi &gt; Target</td><td className="border border-black px-2 py-0.5">Diatas Ekspektasi</td></tr>
                    <tr><td className="border border-black text-center py-0.5">2</td><td className="border border-black px-2 py-0.5">Realisasi = Target</td><td className="border border-black px-2 py-0.5">Sesuai Ekspektasi</td></tr>
                    <tr><td className="border border-black text-center py-0.5">3</td><td className="border border-black px-2 py-0.5">Realisasi &lt; Target</td><td className="border border-black px-2 py-0.5">Dibawah Ekspektasi</td></tr>
                  </tbody>
                </table>
                <div className="text-[7.5px] italic">*) Coret yang tidak perlu</div>
              </div>

              {/* Right Signature */}
              <div className="text-center pt-2 space-y-1 text-[9px] ml-auto w-64">
                <div>{docDetails.kotaTtd}, {docDetails.tanggalTtd}</div>
                <div>Pejabat Penilai Kinerja</div>
                <div>(Pejabat Manajerial/Ketua Tim Kerja)</div>
                <div className="h-16"></div>
                <div className="font-bold">{docDetails.pejabatPenilai.nama}</div>
                <div>{docDetails.pejabatPenilai.nip}</div>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
