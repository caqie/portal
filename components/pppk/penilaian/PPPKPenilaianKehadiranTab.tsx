import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  PPPKPresensiRow,
  Pegawai,
  EvaluationPeriod
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  getAbsensiDetailRows,
  saveAbsensiDetailRows,
  calculateNilaiKehadiranFromAlfa,
  updateAbsensiDetailRow,
  deleteAbsensiDetailRow
} from '../../../services/pppkPenilaianModuleService';
import { parsePresensiFilesForPPPK } from '../../../services/pppkPresensiParserService';

interface PPPKPenilaianKehadiranTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  onDataUpdated?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
}

export const PPPKPenilaianKehadiranTab: React.FC<PPPKPenilaianKehadiranTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments = [],
  onRefreshData,
  onRefreshAll,
  onDataUpdated,
  showToast
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const handleRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
    if (onDataUpdated) onDataUpdated();
  };

  const [rows, setRows] = useState<PPPKPresensiRow[]>(() => {
    try {
      return getAbsensiDetailRows() || [];
    } catch (e) {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<PPPKPresensiRow[] | null>(null);

  // Edit and Delete states for Admin & Pejabat Penilai
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRowTarget, setEditRowTarget] = useState<PPPKPresensiRow | null>(null);
  const [editForm, setEditForm] = useState({
    hariKerja: 120,
    hadir: 118,
    terlambat: 0,
    pulangCepat: 0,
    alfa: 0,
    dinasLuar: 0,
    wfh: 0,
    izin: 0,
    sakit: 0,
    cuti: 0,
    keterangan: ''
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteRowTarget, setDeleteRowTarget] = useState<PPPKPresensiRow | null>(null);

  const handleOpenEditRow = (row: PPPKPresensiRow) => {
    setEditRowTarget(row);
    setEditForm({
      hariKerja: row.totalHariKerja ?? row.hariKerja ?? 120,
      hadir: row.hadir ?? 0,
      terlambat: row.terlambat ?? 0,
      pulangCepat: row.pulangCepat ?? 0,
      alfa: row.alfa ?? 0,
      dinasLuar: row.dinasLuar ?? 0,
      wfh: row.wfh ?? 0,
      izin: row.izin ?? 0,
      sakit: row.sakit ?? 0,
      cuti: row.cuti ?? 0,
      keterangan: row.keterangan ?? ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEditRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRowTarget) return;

    const { nilai, kategori } = calculateNilaiKehadiranFromAlfa(editForm.alfa);
    const updated = updateAbsensiDetailRow(
      editRowTarget.id,
      {
        hariKerja: editForm.hariKerja,
        totalHariKerja: editForm.hariKerja,
        hadir: editForm.hadir,
        terlambat: editForm.terlambat,
        pulangCepat: editForm.pulangCepat,
        alfa: editForm.alfa,
        dinasLuar: editForm.dinasLuar,
        wfh: editForm.wfh,
        izin: editForm.izin,
        sakit: editForm.sakit,
        cuti: editForm.cuti,
        skorAlfa: nilai,
        nilaiKehadiran: nilai,
        kategoriAlfa: kategori,
        keterangan: editForm.keterangan || `${kategori} (Alfa ${editForm.alfa})`
      },
      activePegawai?.nip || 'user',
      activePegawai?.nama || 'User'
    );

    setRows(updated);
    setEditModalOpen(false);
    setEditRowTarget(null);
    handleRefresh();
    safeShowToast(`Data presensi untuk ${editRowTarget.nama} berhasil diperbarui!`, 'success');
  };

  const handleOpenDeleteRow = (row: PPPKPresensiRow) => {
    setDeleteRowTarget(row);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteRow = () => {
    if (!deleteRowTarget) return;
    const updated = deleteAbsensiDetailRow(
      deleteRowTarget.id,
      activePegawai?.nip || 'user',
      activePegawai?.nama || 'User'
    );
    setRows(updated);
    setDeleteModalOpen(false);
    setDeleteRowTarget(null);
    handleRefresh();
    safeShowToast(`Data presensi untuk ${deleteRowTarget.nama} berhasil dihapus.`, 'success');
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r =>
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nip.includes(searchQuery)
    );
  }, [rows, searchQuery]);

  // Handle actual parsing of uploaded presensi files (.pdf, .xlsx, .xls, .csv)
  const handleFilesProcess = async (filesList: FileList | File[]) => {
    if (activeRole !== 'ADMIN') {
      safeShowToast('Akses ditolak: Hanya Administrator yang berwenang mengunggah dan mem-parsing dokumen PDF presensi.', 'error');
      return;
    }

    const files = Array.from(filesList);
    if (files.length === 0) return;

    const validFiles = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'xlsx' || ext === 'xls' || ext === 'csv';
    });

    if (validFiles.length === 0) {
      safeShowToast('Format file harus berupa PDF laporan presensi biometrik atau Excel (.xlsx/.xls).', 'error');
      return;
    }

    setIsUploading(true);
    setUploadStatus(`Sedang memproses ${validFiles.length} berkas presensi...`);
    setParseErrors([]);

    try {
      const result = await parsePresensiFilesForPPPK(validFiles);

      if (result.rows.length === 0) {
        if (result.errors.length > 0) {
          setParseErrors(result.errors);
          safeShowToast(`Gagal mengekstrak: ${result.errors[0]}`, 'error');
        } else {
          safeShowToast('Tidak ditemukan data presensi yang valid di dalam berkas.', 'info');
        }
        setIsUploading(false);
        setUploadStatus('');
        return;
      }

      setParsedPreview(result.rows);
      if (result.errors.length > 0) {
        setParseErrors(result.errors);
        safeShowToast(`Berhasil mengekstrak ${result.rows.length} pegawai (${result.errors.length} berkas berkendala).`, 'info');
      } else {
        safeShowToast(`Berhasil mengekstrak ${result.rows.length} catatan pegawai dari ${validFiles.length} berkas!`, 'success');
      }
    } catch (err: any) {
      console.error('Error parsing files:', err);
      safeShowToast(`Terjadi kesalahan saat memproses berkas: ${err?.message || 'Gagal mem-parsing file'}`, 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesProcess(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading same file
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeRole === 'ADMIN') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (activeRole !== 'ADMIN') return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesProcess(e.dataTransfer.files);
    }
  };

  // Remove individual row from preview before committing
  const handleRemovePreviewRow = (nip: string) => {
    if (!parsedPreview) return;
    const updated = parsedPreview.filter(p => p.nip !== nip);
    setParsedPreview(updated.length > 0 ? updated : null);
  };

  // Commit extracted PDF records (Admin Only) with Merge or Replace options
  const handleCommitPreview = (mode: 'MERGE' | 'REPLACE' = 'MERGE') => {
    if (activeRole !== 'ADMIN') {
      safeShowToast('Hanya Administrator yang berwenang menyimpan hasil parsing presensi.', 'error');
      return;
    }
    if (!parsedPreview || parsedPreview.length === 0) return;

    let finalRows: PPPKPresensiRow[] = [];
    if (mode === 'REPLACE') {
      finalRows = [...parsedPreview];
    } else {
      // MERGE: Update matching rows by NIP, append new rows
      const map = new Map<string, PPPKPresensiRow>();
      rows.forEach(r => map.set(r.nip, r));
      parsedPreview.forEach(p => map.set(p.nip, p));
      finalRows = Array.from(map.values());
    }

    saveAbsensiDetailRows(finalRows, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
    setRows(finalRows);
    setParsedPreview(null);
    setParseErrors([]);
    handleRefresh();
    safeShowToast(`Data Rekapitulasi Presensi (${finalRows.length} pegawai) berhasil disimpan ke database!`, 'success');
  };

  // Manual Edit row for Admin
  const handleAlfaChange = (id: string, newAlfa: number) => {
    const updated = rows.map(r => {
      if (r.id === id) {
        const val = Math.max(0, newAlfa);
        const { nilai, kategori } = calculateNilaiKehadiranFromAlfa(val);
        return {
          ...r,
          alfa: val,
          skorAlfa: nilai,
          nilaiKehadiran: nilai,
          kategoriAlfa: kategori,
          keterangan: `${kategori} (Alfa ${val})`
        };
      }
      return r;
    });
    setRows(updated);
    saveAbsensiDetailRows(updated, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white">
              Submenu 5
            </span>
            <span className="text-xs text-slate-500 font-bold">Bobot Kehadiran 40% pada Nilai Akhir Perilaku</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Penilaian Kehadiran & Bulk Absensi
          </h3>
          <p className="text-xs text-slate-600">
            Terintegrasi dengan mesin presensi DJKI. Analisis tanpa keterangan (Alfa) otomatis mengonversi ke skala 1-5.
          </p>
        </div>

        {/* Upload Button for Admin / Lock indicator for non-admin */}
        {activeRole === 'ADMIN' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`transition-all rounded-2xl p-1 ${
              isDragging ? 'ring-4 ring-emerald-400 ring-offset-2 bg-emerald-50' : ''
            }`}
          >
            <label
              className={`cursor-pointer px-4 py-2.5 rounded-xl text-white font-black text-xs transition-all shadow-md flex items-center gap-2 ${
                isUploading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20 active:scale-95'
              }`}
            >
              {isUploading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{uploadStatus || 'Mengekstrak PDF...'}</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-arrow-up-fill text-base"></i>
                  <span>Upload & Parser PDF / Excel</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                multiple
                className="hidden"
                disabled={isUploading}
                onChange={handlePdfUpload}
              />
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
            <i className="bi bi-shield-lock-fill text-amber-600 text-sm"></i>
            <span>Parser PDF Khusus Admin</span>
          </div>
        )}
      </div>

      {/* Upload Drag & Drop helper note for Admin */}
      {activeRole === 'ADMIN' && !isUploading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-3 text-center transition-colors ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
              : 'border-slate-200 bg-slate-50/70 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50/30'
          }`}
        >
          <p className="text-[11px] flex items-center justify-center gap-2">
            <i className="bi bi-cloud-arrow-up text-emerald-600 text-sm"></i>
            <span>
              Tarik & lepaskan file <strong>PDF Rekap Presensi</strong> (e-Presensi / Biometrik) atau <strong>Excel (.xlsx)</strong> ke sini, atau klik tombol di atas. Mendukung multi-file dan batch multi-pegawai.
            </span>
          </p>
        </div>
      )}

      {/* Parsing Errors Banner if any */}
      {parseErrors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <i className="bi bi-exclamation-triangle-fill text-rose-600 text-sm"></i>
              <span>Peringatan Parsing File Presensi ({parseErrors.length} kendala):</span>
            </div>
            <button
              type="button"
              onClick={() => setParseErrors([])}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-800">
            {parseErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Role Restriction Banner for Non-Admin */}
      {activeRole !== 'ADMIN' && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start sm:items-center gap-3 text-xs text-amber-900">
          <i className="bi bi-shield-exclamation text-amber-600 text-lg flex-shrink-0 mt-0.5 sm:mt-0"></i>
          <div>
            <span className="font-bold">Akses Parsing PDF Terbatas:</span> Hanya <strong>Admin Kepegawaian (Admin SDM)</strong> yang berwenang untuk mengunggah dan mem-parsing file PDF rekap presensi biometrik. Pejabat Penilai dan Pegawai hanya memiliki hak akses tinjauan (read-only).
          </div>
        </div>
      )}

      {/* Alfa Conversion Reference Matrix Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest">
            Formula Perhitungan Skor Kehadiran Berdasarkan Tanpa Keterangan (Alfa)
          </span>
          <span className="text-xs text-slate-400">Keputusan Penilaian Disiplin ASN</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {[
            { range: '0 Hari Alfa', score: 5, label: 'Sangat Baik' },
            { range: '1 - 2 Hari Alfa', score: 4, label: 'Baik' },
            { range: '3 - 5 Hari Alfa', score: 3, label: 'Cukup' },
            { range: '6 - 8 Hari Alfa', score: 2, label: 'Kurang' },
            { range: '> 8 Hari Alfa', score: 1, label: 'Sangat Kurang' }
          ].map(tier => (
            <div key={tier.score} className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
              <div className="text-xl font-black text-emerald-400">{tier.score}</div>
              <div className="text-xs font-bold text-white mt-0.5">{tier.range}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{tier.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Extracted PDF Modal/Panel if available */}
      {parsedPreview && (
        <div className="bg-emerald-50/90 p-5 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
            <div>
              <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                <i className="bi bi-file-earmark-check-fill text-emerald-600 text-lg"></i>
                Pratinjau Hasil Parsing Dokumen Presensi
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Berhasil mengekstrak <strong>{parsedPreview.length} catatan pegawai</strong> dari dokumen presensi. Teliti angka Alfa dan skor sebelum menyimpan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => handleCommitPreview('MERGE')}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-md flex items-center gap-1.5"
                title="Gabungkan hasil parsing ke dalam daftar presensi yang sudah ada"
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>Gabungkan & Simpan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Yakin ingin menggantikan seluruh baris presensi dengan data hasil parsing ini?')) {
                    handleCommitPreview('REPLACE');
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                title="Gantikan seluruh baris presensi yang ada saat ini dengan pratinjau ini"
              >
                Timpa Seluruh Data
              </button>
            </div>
          </div>

          {/* Quick Stats of Parsed Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Pegawai</div>
              <div className="text-lg font-black text-emerald-700">{parsedPreview.length} Orang</div>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Alfa 0 (Sangat Baik)</div>
              <div className="text-lg font-black text-emerald-600">
                {parsedPreview.filter(p => (p.alfa || 0) === 0).length} Orang
              </div>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Alfa 1-2 (Baik)</div>
              <div className="text-lg font-black text-blue-600">
                {parsedPreview.filter(p => (p.alfa || 0) >= 1 && (p.alfa || 0) <= 2).length} Orang
              </div>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
              <div className="text-[10px] uppercase font-bold text-slate-500">Ada Alfa (&gt; 2)</div>
              <div className="text-lg font-black text-amber-600">
                {parsedPreview.filter(p => (p.alfa || 0) > 2).length} Orang
              </div>
            </div>
          </div>

          {/* Parsed Preview Table */}
          <div className="bg-white rounded-xl border border-emerald-300 shadow-inner overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-emerald-700 text-white text-[11px] uppercase font-bold z-10">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">No</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Pegawai & NIP</th>
                  <th className="py-2.5 px-2 text-center">Hari Kerja</th>
                  <th className="py-2.5 px-2 text-center">Hadir</th>
                  <th className="py-2.5 px-2 text-center">Telat / PC</th>
                  <th className="py-2.5 px-2 text-center bg-emerald-800">Alfa</th>
                  <th className="py-2.5 px-2 text-center">DL / Cuti / Sakit</th>
                  <th className="py-2.5 px-3 text-center">Skor Kehadiran</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                  <th className="py-2.5 px-2 text-center w-10">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedPreview.map((item, idx) => (
                  <tr key={item.nip || idx} className="hover:bg-emerald-50/50">
                    <td className="py-2 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">{item.nama}</div>
                      <div className="font-mono text-[10px] text-slate-500">{item.nip}</div>
                    </td>
                    <td className="py-2 px-2 text-center font-semibold">{item.hariKerja || 120}</td>
                    <td className="py-2 px-2 text-center font-bold text-emerald-700">{item.hadir ?? 0}</td>
                    <td className="py-2 px-2 text-center text-[11px]">
                      <span className="text-amber-600 font-semibold">{item.terlambat || 0}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-slate-500">{item.pulangCepat || 0}</span>
                    </td>
                    <td className="py-2 px-2 text-center font-black bg-emerald-50">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-black ${
                          (item.alfa || 0) === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : (item.alfa || 0) <= 2
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.alfa || 0}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center text-[10px] text-slate-600">
                      DL:{item.dinasLuar || 0} | C:{item.cuti || 0} | S:{item.sakit || 0}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-black text-slate-900 text-sm mr-1.5">{item.nilaiKehadiran || 5}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {item.kategoriAlfa || 'Sangat Baik'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px] truncate max-w-[150px]">
                      {item.keterangan || '-'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePreviewRow(item.nip)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus baris ini dari pratinjau"
                      >
                        <i className="bi bi-trash3 text-xs"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="text-sm font-black text-slate-800">
            Rekapitulasi Kehadiran Pegawai PPPK Periode {selectedPeriod?.semester} {selectedPeriod?.year}
          </h4>

          <input
            type="text"
            placeholder="Cari Nama / NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 w-52"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 min-w-[200px]">Pegawai (NIP)</th>
                <th className="py-3 px-2 text-center">Hari Kerja</th>
                <th className="py-3 px-2 text-center text-emerald-700">Hadir</th>
                <th className="py-3 px-2 text-center text-amber-700">Terlambat</th>
                <th className="py-3 px-2 text-center text-amber-700">Plg Cepat</th>
                <th className="py-3 px-2 text-center text-rose-700">Alfa (Tanpa Ket.)</th>
                <th className="py-3 px-2 text-center">DL</th>
                <th className="py-3 px-2 text-center">Cuti/Sakit</th>
                <th className="py-3 px-3 text-center">Nilai Kehadiran</th>
                <th className="py-3 px-3">Keterangan</th>
                {(activeRole === 'ADMIN' || activeRole === 'PEJABAT_PENILAI') && (
                  <th className="py-3 px-3 text-center">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.nama}</div>
                    <div className="text-[11px] text-slate-500 font-mono">NIP: {r.nip}</div>
                  </td>
                  <td className="py-3 px-2 text-center font-semibold">{r.totalHariKerja ?? r.hariKerja ?? 120}</td>
                  <td className="py-3 px-2 text-center font-bold text-emerald-700">{r.hadir}</td>
                  <td className="py-3 px-2 text-center font-semibold text-amber-600">{r.terlambat}</td>
                  <td className="py-3 px-2 text-center font-semibold text-amber-600">{r.pulangCepat}</td>
                  
                  {/* Alfa Cell */}
                  <td className="py-3 px-2 text-center">
                    {activeRole === 'ADMIN' ? (
                      <input
                        type="number"
                        value={r.alfa}
                        onChange={(e) => handleAlfaChange(r.id, Number(e.target.value))}
                        className="w-12 px-1 py-0.5 text-center font-black rounded border border-slate-300 text-rose-600 focus:ring-1 focus:ring-rose-500"
                      />
                    ) : (
                      <span className="font-black text-rose-600">{r.alfa}</span>
                    )}
                  </td>

                  <td className="py-3 px-2 text-center font-semibold">{r.dinasLuar}</td>
                  <td className="py-3 px-2 text-center font-semibold">{r.cuti + r.sakit + r.izin}</td>
                  
                  {/* Nilai Kehadiran Scale 1-5 */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {(r.nilaiKehadiran ?? r.skorAlfa ?? 5).toFixed(2)} / 5.00
                    </span>
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-600">
                    {r.keterangan}
                  </td>

                  {(activeRole === 'ADMIN' || activeRole === 'PEJABAT_PENILAI') && (
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRow(r)}
                          title="Edit Rekap Presensi Pegawai"
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                        >
                          <i className="bi bi-pencil"></i>
                          <span>Edit</span>
                        </button>
                        {activeRole === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteRow(r)}
                            title="Hapus Rekap Presensi Pegawai"
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <i className="bi bi-trash"></i>
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Attendance Row Modal */}
      {editModalOpen && editRowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <i className="bi bi-pencil-square text-emerald-600"></i>
                Edit Rekap Presensi Pegawai
              </h4>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {editRowTarget.nip}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{editRowTarget.nama}</div>
              <div className="text-slate-500 text-[11px]">{editRowTarget.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual'}</div>
            </div>

            <form onSubmit={handleSaveEditRow} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Total Hari Kerja:</label>
                  <input
                    type="number"
                    value={editForm.hariKerja}
                    onChange={(e) => setEditForm(prev => ({ ...prev, hariKerja: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-emerald-700">Hadir:</label>
                  <input
                    type="number"
                    value={editForm.hadir}
                    onChange={(e) => setEditForm(prev => ({ ...prev, hadir: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-emerald-700"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-rose-700">Alfa (Tanpa Ket.):</label>
                  <input
                    type="number"
                    value={editForm.alfa}
                    onChange={(e) => setEditForm(prev => ({ ...prev, alfa: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-rose-700"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-amber-700">Terlambat:</label>
                  <input
                    type="number"
                    value={editForm.terlambat}
                    onChange={(e) => setEditForm(prev => ({ ...prev, terlambat: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-amber-700">Pulang Cepat:</label>
                  <input
                    type="number"
                    value={editForm.pulangCepat}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pulangCepat: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-blue-700">Dinas Luar:</label>
                  <input
                    type="number"
                    value={editForm.dinasLuar}
                    onChange={(e) => setEditForm(prev => ({ ...prev, dinasLuar: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cuti:</label>
                  <input
                    type="number"
                    value={editForm.cuti}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cuti: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Sakit:</label>
                  <input
                    type="number"
                    value={editForm.sakit}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sakit: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Izin:</label>
                  <input
                    type="number"
                    value={editForm.izin}
                    onChange={(e) => setEditForm(prev => ({ ...prev, izin: Number(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Keterangan Tambahan:</label>
                <input
                  type="text"
                  value={editForm.keterangan}
                  onChange={(e) => setEditForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Contoh: Sangat Tertib (Alfa 0)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Prediksi Skor Kehadiran (Otomatis):</span>
                <span className="font-black text-emerald-700 text-sm">
                  {calculateNilaiKehadiranFromAlfa(editForm.alfa).nilai.toFixed(2)} / 5.00 ({calculateNilaiKehadiranFromAlfa(editForm.alfa).kategori})
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditRowTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-900/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Attendance Row Confirmation Modal */}
      {deleteModalOpen && deleteRowTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <i className="bi bi-trash3-fill text-lg"></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Hapus Rekap Presensi Pegawai
                </h4>
                <p className="text-[11px] text-slate-500">Konfirmasi Penghapusan Baris</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-700 border border-slate-200">
              <div>Pegawai: <strong>{deleteRowTarget.nama}</strong></div>
              <div className="text-[11px] font-mono text-slate-500">NIP: {deleteRowTarget.nip}</div>
              <div className="text-[11px] text-slate-600">
                Kehadiran: Hadir {deleteRowTarget.hadir} hari, Alfa {deleteRowTarget.alfa} hari
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data presensi pegawai ini dari rekapitulasi semester berjalan? Tindakan ini akan menghapus baris presensi secara permanen.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteRowTarget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRow}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-900/20"
              >
                Ya, Hapus Baris
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
