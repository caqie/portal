import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchSKPFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { Pegawai, SKPRecord } from '../types';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import { getAtasanLangsung } from '../services/strukturOrganisasiService';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Subcomponents
import { 
  BERAKHLAK_DEFAULT, 
  DEFAULT_RHK_ITEMS, 
  DEFAULT_LAMPIRAN, 
  getPegawaiDisplayInfo, 
  SKPItemRHK, 
  SKPPerilakuItem 
} from '../components/skp/skpDefaults';
import { DokumenEvaluasiPage1 } from '../components/skp/DokumenEvaluasiPage1';
import { LampiranSKPPage2 } from '../components/skp/LampiranSKPPage2';
import { SasaranKinerjaPages34 } from '../components/skp/SasaranKinerjaPages34';
import { EvaluasiKinerjaPages56 } from '../components/skp/EvaluasiKinerjaPages56';
import { RekamanUmpanBalikPages78 } from '../components/skp/RekamanUmpanBalikPages78';

export const SKPPage: React.FC = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'editor' | 'preview'>('table');
  const [previewTab, setPreviewTab] = useState<'all' | 'doc_eval' | 'lampiran' | 'sasaran' | 'evaluasi' | 'rekaman'>('all');
  const [editorStep, setEditorStep] = useState<'identitas' | 'hasil_kerja' | 'perilaku' | 'lampiran'>('identitas');
  const [selectedSKP, setSelectedSKP] = useState<any | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SKPRecord | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const calculatePredikatKinerja = (hasil: string, perilaku: string) => {
    const h = (hasil || '').toUpperCase();
    const p = (perilaku || '').toUpperCase();
    
    if (h === 'DI ATAS EKSPEKTASI') {
      if (p === 'DI ATAS EKSPEKTASI') return 'SANGAT BAIK';
      if (p === 'SESUAI EKSPEKTASI') return 'BAIK';
      if (p === 'DI BAWAH EKSPEKTASI') return 'KURANG / MISCONDUCT';
    } else if (h === 'SESUAI EKSPEKTASI') {
      if (p === 'DI ATAS EKSPEKTASI') return 'BAIK';
      if (p === 'SESUAI EKSPEKTASI') return 'BAIK';
      if (p === 'DI BAWAH EKSPEKTASI') return 'KURANG / MISCONDUCT';
    } else if (h === 'DI BAWAH EKSPEKTASI') {
      if (p === 'DI ATAS EKSPEKTASI') return 'BUTUH PERBAIKAN';
      if (p === 'SESUAI EKSPEKTASI') return 'BUTUH PERBAIKAN';
      if (p === 'DI BAWAH EKSPEKTASI') return 'SANGAT KURANG';
    }
    return 'BAIK';
  };

  const getPredikatBadgeStyle = (predikat: string) => {
    const p = (predikat || '').toUpperCase();
    if (p === 'SANGAT BAIK') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (p === 'BAIK') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (p.includes('BUTUH PERBAIKAN')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (p.includes('KURANG') && p.includes('MISCONDUCT')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (p === 'SANGAT KURANG') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Form State initialized with official sample defaults
  const [formData, setFormData] = useState<any>({
    nip: '',
    namaPegawai: '',
    penilaiNip: '',
    atasanPenilaiNip: '',
    tahun: 2025,
    periodeLabel: 'AKHIR',
    periodeMulai: '01 Oktober 2025',
    periodeSelesai: '31 Desember 2025',
    periodeTeks: '01 Oktober s.d 31 Desember 2025',
    kotaTtd: 'Jakarta',
    tglPenilaian: '06 Januari 2026',
    jenisPendekatan: 'PENDEKATAN HASIL KERJA KUANTITATIF',
    jenisJabatanKategori: 'BAGI JABATAN FUNGSIONAL UMUM',
    capaianOrganisasi: 'ISTIMEWA',
    ratingHasilKerja: 'DI ATAS EKSPEKTASI',
    ratingPerilaku: 'DI ATAS EKSPEKTASI',
    predikatKinerja: 'SANGAT BAIK',
    catatanRekomendasi: '-',
    hasilKerja: DEFAULT_RHK_ITEMS,
    perilakuKerja: BERAKHLAK_DEFAULT,
    lampiran: DEFAULT_LAMPIRAN
  });

  useEffect(() => { loadInitialData(); }, []);

  const calculatedPredikat = useMemo(() => {
    return calculatePredikatKinerja(formData.ratingHasilKerja, formData.ratingPerilaku);
  }, [formData.ratingHasilKerja, formData.ratingPerilaku]);

  useEffect(() => {
    if (formData.predikatKinerja !== calculatedPredikat) {
      setFormData((prev: any) => ({ ...prev, predikatKinerja: calculatedPredikat }));
    }
  }, [calculatedPredikat]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchSKPFromSheets()]);
      setPegawaiList(pRes || []);
      setSkpList((sRes as any) || []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const searchableOptions = useMemo(() => pegawaiList.map(p => ({
    value: p.nip,
    label: p.nama,
    subLabel: `NIP. ${p.nip} - ${p.jabatan}`
  })), [pegawaiList]);

  // Handle Pegawai selection with automatic echelon hierarchy detection
  const handleSelectPegawai = (nip: string) => {
    const selected = pegawaiList.find(p => p.nip === nip);
    if (!selected) return;

    // Automatically resolve Penilai and Atasan Penilai using SOTK service
    const hierarki = getAtasanLangsung(selected, pegawaiList);
    const penilaiNip = hierarki.atasan?.nip || '';
    const atasanPenilaiNip = hierarki.atasanPenilai?.nip || '';

    setFormData((prev: any) => ({
      ...prev,
      nip: selected.nip,
      namaPegawai: selected.nama,
      penilaiNip: penilaiNip || prev.penilaiNip,
      atasanPenilaiNip: atasanPenilaiNip || prev.atasanPenilaiNip,
      jenisJabatanKategori: selected.jabatan?.toUpperCase().includes('FUNGSIONAL') 
        ? 'BAGI JABATAN FUNGSIONAL' 
        : (selected.jenisPegawai === 'PPPK' ? 'BAGI JABATAN FUNGSIONAL UMUM' : 'BAGI JABATAN FUNGSIONAL / STRUKTURAL')
    }));
  };

  const addHasilKerja = (kategori: 'UTAMA' | 'TAMBAHAN' = 'UTAMA') => {
    setFormData((prev: any) => ({
      ...prev,
      hasilKerja: [
        ...prev.hasilKerja, 
        { 
          kategori,
          rencanaPimpinan: '', 
          rencanaPegawai: '', 
          aspek: 'Kualitas', 
          indikator: '', 
          target: '100%', 
          realisasi: '100%', 
          umpanBalik: 'DAPAT DIPERTAHANKAN' 
        }
      ]
    }));
  };

  const removeHasilKerja = (index: number) => {
    const newList = [...formData.hasilKerja];
    newList.splice(index, 1);
    setFormData({ ...formData, hasilKerja: newList });
  };

  const handleHasilKerjaChange = (index: number, field: string, value: string) => {
    const newList = [...formData.hasilKerja];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, hasilKerja: newList });
  };

  const handlePerilakuChange = (index: number, field: 'ekspektasi' | 'umpanBalik', value: string) => {
    const newList = [...formData.perilakuKerja];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, perilakuKerja: newList });
  };

  const handleSave = async () => {
    if (!formData.nip) return alert("Mohon pilih Pegawai yang dinilai.");
    setSyncing(true);
    const payload = {
      ...formData,
      id: formData.id || `SKP-${formData.nip}-${Date.now()}`,
      status: 'Selesai'
    };
    try {
      const ok = await syncTableRemote('SKP', 'SAVE', payload);
      if (ok) {
        await loadInitialData();
        setSelectedSKP(payload);
        setActiveView('preview');
        setShowSuccess(true);
        logActivity(formData.id ? 'UPDATE' : 'CREATE', 'SKP', `Terbitkan Dokumen SKP: ${payload.namaPegawai}`);
      }
    } catch (e) { 
      alert("Gagal menyimpan ke database cloud."); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      const ok = await syncTableRemote('SKP', 'DELETE', { id: itemToDelete.id });
      if (ok) {
        await loadInitialData();
        setIsConfirmOpen(false);
        setItemToDelete(null);
        logActivity('DELETE', 'SKP', `Hapus SKP ID: ${itemToDelete.id}`);
      }
    } catch (e) {
      alert("Gagal menghapus data.");
    } finally {
      setSyncing(false);
    }
  };

  const activeRecord = selectedSKP || formData;
  const pSubjek = pegawaiList.find(p => p.nip === activeRecord.nip);
  const pPenilai = pegawaiList.find(p => p.nip === activeRecord.penilaiNip);
  const pAtasan = pegawaiList.find(p => p.nip === activeRecord.atasanPenilaiNip);

  // PDF Generation: captures each page cleanly without cut-offs
  const handleDownloadPdf = async (allPages = true) => {
    if (!pdfContainerRef.current) return;
    setSyncing(true);
    try {
      const pageElements = pdfContainerRef.current.querySelectorAll<HTMLElement>('.skp-page-item');
      if (pageElements.length === 0) {
        alert("Tidak ada halaman dokumen yang dapat diexport.");
        return;
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let addedFirst = false;

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i];
        
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        if (addedFirst) {
          pdf.addPage('a4', 'portrait');
        } else {
          addedFirst = true;
        }

        // Exact A4 dimensions: 210mm x 297mm
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      const sanitizedName = (activeRecord.namaPegawai || 'Pegawai').replace(/[\s/\\?%*:|"<>]+/g, '_');
      const filename = `SKP_${sanitizedName}_${activeRecord.tahun || 2025}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error(err);
      alert("Gagal memproses dokumen PDF.");
    } finally {
      setSyncing(false);
    }
  };

  // Save PDF into E-Dossier
  const handleSaveToDossier = async () => {
    if (!pdfContainerRef.current) return;
    setSyncing(true);
    try {
      const pageElements = pdfContainerRef.current.querySelectorAll<HTMLElement>('.skp-page-item');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let addedFirst = false;

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i];
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (addedFirst) pdf.addPage('a4', 'portrait');
        else addedFirst = true;
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const sanitizedName = (activeRecord.namaPegawai || 'Pegawai').replace(/[\s/\\?%*:|"<>]+/g, '_');
      const fileName = `SKP_${sanitizedName}_${activeRecord.tahun || 2025}.pdf`;

      const uploadRes = await uploadFileToDrive(fileName, 'application/pdf', pdfBase64);
      if (uploadRes && uploadRes.fileUrl) {
        await syncTableRemote('DOSSIER', 'SAVE', {
          id: `DOS-SKP-${Date.now()}`,
          nip: activeRecord.nip,
          namaPegawai: activeRecord.namaPegawai,
          kategori: 'SKP',
          namaDokumen: `SKP Tahunan ${activeRecord.tahun || 2025} - ${activeRecord.predikatKinerja}`,
          fileUrl: uploadRes.fileUrl,
          tanggalUpload: new Date().toISOString().split('T')[0]
        });
        alert("Dokumen SKP berhasil disimpan ke E-Dossier Pegawai!");
      }
    } catch (e) {
      alert("Gagal mengunggah ke E-Dossier.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen text-slate-800">
      
      {/* Print Style Injector */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #skp-print-container, #skp-print-container * {
            visibility: visible;
          }
          #skp-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: transparent;
          }
          .skp-page-item {
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            box-shadow: none !important;
            width: 210mm !important;
            min-height: 297mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Bar */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <i className="bi bi-award-fill"></i>
            </span>
            Sasaran Kinerja Pegawai (SKP) & Evaluasi Kinerja
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Format Standar Dokumen Evaluasi Kinerja ASN Berdasarkan Permen PANRB No. 6 Tahun 2022
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeView !== 'table' && (
            <button
              onClick={() => setActiveView('table')}
              className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition"
            >
              <i className="bi bi-arrow-left mr-1.5"></i>
              Daftar SKP
            </button>
          )}

          {activeView === 'table' && canEdit && (
            <button
              onClick={() => {
                setSelectedSKP(null);
                setActiveView('editor');
              }}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
            >
              <i className="bi bi-plus-lg"></i>
              Buat SKP Baru
            </button>
          )}

          {activeView === 'preview' && (
            <>
              <button
                onClick={() => setActiveView('editor')}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <i className="bi bi-pencil mr-1.5"></i>
                Edit Data
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition"
              >
                <i className="bi bi-printer mr-1.5"></i>
                Cetak (Print)
              </button>
              <button
                onClick={() => handleDownloadPdf(true)}
                disabled={syncing}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
              >
                <i className="bi bi-file-earmark-pdf"></i>
                {syncing ? 'Memproses PDF...' : 'Unduh PDF (8 Halaman)'}
              </button>
              <button
                onClick={handleSaveToDossier}
                disabled={syncing}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
                title="Simpan file ke folder e-Dossier pegawai"
              >
                <i className="bi bi-folder-symlink mr-1.5"></i>
                Simpan E-Dossier
              </button>
            </>
          )}
        </div>
      </div>

      {/* VIEW 1: TABLE OF SKP ARCHIVE */}
      {activeView === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">
              Arsip Dokumen SKP Pegawai ({skpList.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="p-3">Nama Pegawai / NIP</th>
                  <th className="p-3">Tahun</th>
                  <th className="p-3">Capaian Organisasi</th>
                  <th className="p-3">Hasil Kerja</th>
                  <th className="p-3">Perilaku</th>
                  <th className="p-3">Predikat Kinerja</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {skpList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Belum ada data SKP tersimpan. Klik "Buat SKP Baru" untuk memulai.
                    </td>
                  </tr>
                ) : (
                  skpList.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{row.namaPegawai}</div>
                        <div className="text-xs text-slate-500 font-mono">NIP. {row.nip}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{row.tahun || 2025}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 uppercase">
                          {row.capaianOrganisasi || 'ISTIMEWA'}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{row.ratingHasilKerja || 'DI ATAS EKSPEKTASI'}</td>
                      <td className="p-3 text-xs">{row.ratingPerilaku || 'DI ATAS EKSPEKTASI'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getPredikatBadgeStyle(row.predikatKinerja)} uppercase`}>
                          {row.predikatKinerja || 'SANGAT BAIK'}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedSKP(row);
                            setFormData(row);
                            setActiveView('preview');
                          }}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition"
                        >
                          <i className="bi bi-eye mr-1"></i>
                          Lihat 8 Hal
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => {
                                setFormData(row);
                                setSelectedSKP(row);
                                setActiveView('editor');
                              }}
                              className="px-2.5 py-1 rounded bg-amber-50 text-amber-600 hover:bg-amber-100 text-xs font-semibold transition"
                            >
                              <i className="bi bi-pencil mr-1"></i>
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(row);
                                setIsConfirmOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: EDITOR (4 STEPS) */}
      {activeView === 'editor' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Editor Step Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {[
              { id: 'identitas', label: '1. Identitas & Rating', icon: 'bi-person-badge' },
              { id: 'hasil_kerja', label: '2. Rencana Hasil Kerja', icon: 'bi-list-check' },
              { id: 'perilaku', label: '3. Perilaku Core Values', icon: 'bi-heart-half' },
              { id: 'lampiran', label: '4. Lampiran SKP', icon: 'bi-paperclip' },
            ].map(step => (
              <button
                key={step.id}
                onClick={() => setEditorStep(step.id as any)}
                className={`px-5 py-3.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
                  editorStep === step.id
                    ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <i className={`bi ${step.icon}`}></i>
                {step.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* STEP 1: IDENTITAS & PENILAIAN */}
            {editorStep === 'identitas' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Subjek Pegawai */}
                  <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <i className="bi bi-person text-blue-600"></i>
                      Pegawai Yang Dinilai
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pilih Pegawai (Auto SOTK)
                      </label>
                      <SearchableSelect
                        options={searchableOptions}
                        value={formData.nip}
                        onChange={handleSelectPegawai}
                        placeholder="Cari nama atau NIP..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        value={formData.namaPegawai || ''}
                        onChange={e => setFormData({ ...formData, namaPegawai: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Jabatan SKP</label>
                      <input
                        type="text"
                        value={formData.jenisJabatanKategori || 'BAGI JABATAN FUNGSIONAL UMUM'}
                        onChange={e => setFormData({ ...formData, jenisJabatanKategori: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>

                  {/* Pejabat Penilai Kinerja */}
                  <div className="space-y-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <i className="bi bi-shield-check text-blue-600"></i>
                      Pejabat Penilai Kinerja (Atasan Langsung)
                    </h3>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pilih Pejabat Penilai
                      </label>
                      <SearchableSelect
                        options={searchableOptions}
                        value={formData.penilaiNip}
                        onChange={val => setFormData({ ...formData, penilaiNip: val })}
                        placeholder="Pilih Pejabat Penilai..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Atasan Pejabat Penilai Kinerja
                      </label>
                      <SearchableSelect
                        options={searchableOptions}
                        value={formData.atasanPenilaiNip}
                        onChange={val => setFormData({ ...formData, atasanPenilaiNip: val })}
                        placeholder="Pilih Atasan Penilai..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Kota & Tanggal Penilaian</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formData.kotaTtd || 'Jakarta'}
                          onChange={e => setFormData({ ...formData, kotaTtd: e.target.value })}
                          placeholder="Kota"
                          className="text-sm border rounded-lg p-2 bg-white"
                        />
                        <input
                          type="text"
                          value={formData.tglPenilaian || '06 Januari 2026'}
                          onChange={e => setFormData({ ...formData, tglPenilaian: e.target.value })}
                          placeholder="Tanggal TTD"
                          className="text-sm border rounded-lg p-2 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Periode & Ratings */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Periode Evaluasi & Rating Kinerja
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Evaluasi</label>
                      <input
                        type="number"
                        value={formData.tahun || 2025}
                        onChange={e => setFormData({ ...formData, tahun: parseInt(e.target.value) || 2025 })}
                        className="w-full text-sm border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Label Periode</label>
                      <input
                        type="text"
                        value={formData.periodeLabel || 'AKHIR'}
                        onChange={e => setFormData({ ...formData, periodeLabel: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Rentang Tanggal Periode</label>
                      <input
                        type="text"
                        value={formData.periodeTeks || '01 Oktober s.d 31 Desember 2025'}
                        onChange={e => setFormData({ ...formData, periodeTeks: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Capaian Organisasi</label>
                      <select
                        value={formData.capaianOrganisasi || 'ISTIMEWA'}
                        onChange={e => setFormData({ ...formData, capaianOrganisasi: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white font-medium"
                      >
                        <option value="ISTIMEWA">ISTIMEWA</option>
                        <option value="BAIK">BAIK</option>
                        <option value="BUTUH PERBAIKAN">BUTUH PERBAIKAN</option>
                        <option value="KURANG">KURANG</option>
                        <option value="SANGAT KURANG">SANGAT KURANG</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Rating Hasil Kerja</label>
                      <select
                        value={formData.ratingHasilKerja || 'DI ATAS EKSPEKTASI'}
                        onChange={e => setFormData({ ...formData, ratingHasilKerja: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white font-medium"
                      >
                        <option value="DI ATAS EKSPEKTASI">DI ATAS EKSPEKTASI</option>
                        <option value="SESUAI EKSPEKTASI">SESUAI EKSPEKTASI</option>
                        <option value="DI BAWAH EKSPEKTASI">DI BAWAH EKSPEKTASI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Rating Perilaku</label>
                      <select
                        value={formData.ratingPerilaku || 'DI ATAS EKSPEKTASI'}
                        onChange={e => setFormData({ ...formData, ratingPerilaku: e.target.value })}
                        className="w-full text-sm border rounded-lg p-2 bg-white font-medium"
                      >
                        <option value="DI ATAS EKSPEKTASI">DI ATAS EKSPEKTASI</option>
                        <option value="SESUAI EKSPEKTASI">SESUAI EKSPEKTASI</option>
                        <option value="DI BAWAH EKSPEKTASI">DI BAWAH EKSPEKTASI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Predikat Kinerja</label>
                      <input
                        type="text"
                        readOnly
                        value={formData.predikatKinerja || calculatedPredikat}
                        className="w-full text-sm border rounded-lg p-2 bg-slate-100 font-bold text-blue-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan / Rekomendasi</label>
                    <input
                      type="text"
                      value={formData.catatanRekomendasi || '-'}
                      onChange={e => setFormData({ ...formData, catatanRekomendasi: e.target.value })}
                      className="w-full text-sm border rounded-lg p-2 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: RENCANA HASIL KERJA */}
            {editorStep === 'hasil_kerja' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Rencana Hasil Kerja Utama & Tambahan ({formData.hasilKerja?.length || 0})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target, realisasi dan umpan balik berkelanjutan berdasarkan bukti dukung.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addHasilKerja('UTAMA')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                    >
                      + Tambah RHK Utama
                    </button>
                    <button
                      type="button"
                      onClick={() => addHasilKerja('TAMBAHAN')}
                      className="px-3 py-1.5 rounded-lg bg-slate-600 text-white text-xs font-semibold hover:bg-slate-700"
                    >
                      + Tambah RHK Tambahan
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.hasilKerja?.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          #{idx + 1} - Kinerja {item.kategori || 'UTAMA'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeHasilKerja(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                        >
                          <i className="bi bi-trash mr-1"></i>
                          Hapus
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Rencana Hasil Kerja Pimpinan yang Diintervensi
                          </label>
                          <textarea
                            rows={2}
                            value={item.rencanaPimpinan || ''}
                            onChange={e => handleHasilKerjaChange(idx, 'rencanaPimpinan', e.target.value)}
                            className="w-full text-xs border rounded p-2 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Rencana Hasil Kerja Pegawai
                          </label>
                          <textarea
                            rows={2}
                            value={item.rencanaPegawai || ''}
                            onChange={e => handleHasilKerjaChange(idx, 'rencanaPegawai', e.target.value)}
                            className="w-full text-xs border rounded p-2 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Aspek</label>
                          <select
                            value={item.aspek || 'Kualitas'}
                            onChange={e => handleHasilKerjaChange(idx, 'aspek', e.target.value)}
                            className="w-full text-xs border rounded p-1.5 bg-white font-medium"
                          >
                            <option value="Kualitas">Kualitas</option>
                            <option value="Kuantitas">Kuantitas</option>
                            <option value="Waktu">Waktu</option>
                            <option value="Biaya">Biaya</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Indikator Kinerja Individu</label>
                          <input
                            type="text"
                            value={item.indikator || ''}
                            onChange={e => handleHasilKerjaChange(idx, 'indikator', e.target.value)}
                            className="w-full text-xs border rounded p-1.5 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Target</label>
                          <input
                            type="text"
                            value={item.target || ''}
                            onChange={e => handleHasilKerjaChange(idx, 'target', e.target.value)}
                            className="w-full text-xs border rounded p-1.5 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Realisasi Bukti Dukung</label>
                          <input
                            type="text"
                            value={item.realisasi || ''}
                            onChange={e => handleHasilKerjaChange(idx, 'realisasi', e.target.value)}
                            className="w-full text-xs border rounded p-1.5 bg-white font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Umpan Balik Berkelanjutan Berdasarkan Bukti Dukung
                        </label>
                        <input
                          type="text"
                          value={item.umpanBalik || ''}
                          onChange={e => handleHasilKerjaChange(idx, 'umpanBalik', e.target.value)}
                          className="w-full text-xs border rounded p-1.5 bg-white uppercase font-medium text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: PERILAKU KERJA BERAKHLAK */}
            {editorStep === 'perilaku' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Core Values ASN BerAKHLAK (7 Nilai Dasar)
                </h3>
                <p className="text-xs text-slate-500">
                  Tentukan Ekspektasi Khusus Pimpinan dan Umpan Balik Berkelanjutan Berdasarkan Bukti Dukung.
                </p>

                <div className="space-y-4">
                  {formData.perilakuKerja?.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <div className="font-bold text-sm text-blue-900">
                        {idx + 1}. {item.poin}
                      </div>
                      <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                        {item.subPoints?.map((sp: string, sIdx: number) => (
                          <li key={sIdx}>{sp}</li>
                        ))}
                      </ul>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Ekspektasi Khusus Pimpinan
                          </label>
                          <input
                            type="text"
                            value={item.ekspektasi || 'Untuk Dapat Dipertahankan'}
                            onChange={e => handlePerilakuChange(idx, 'ekspektasi', e.target.value)}
                            className="w-full text-xs border rounded p-2 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Umpan Balik Berkelanjutan Berdasarkan Bukti Dukung
                          </label>
                          <input
                            type="text"
                            value={item.umpanBalik || ''}
                            onChange={e => handlePerilakuChange(idx, 'umpanBalik', e.target.value)}
                            className="w-full text-xs border rounded p-2 bg-white font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: LAMPIRAN SKP */}
            {editorStep === 'lampiran' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800">
                  Lampiran Sasaran Kinerja Pegawai
                </h3>
                <p className="text-xs text-slate-500">
                  Masukkan tiap butir poin dukungan sumber daya, skema pertanggungjawaban, dan konsekuensi (satu baris per poin).
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      1. Dukungan Sumber Daya
                    </label>
                    <textarea
                      rows={3}
                      value={Array.isArray(formData.lampiran?.dukunganSumberDaya) ? formData.lampiran.dukunganSumberDaya.join('\n') : (formData.lampiran?.dukunganSumberDaya || '')}
                      onChange={e => setFormData({
                        ...formData,
                        lampiran: {
                          ...formData.lampiran,
                          dukunganSumberDaya: e.target.value.split('\n').filter(Boolean)
                        }
                      })}
                      className="w-full text-xs border rounded-lg p-2.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      2. Skema Pertanggungjawaban
                    </label>
                    <textarea
                      rows={3}
                      value={Array.isArray(formData.lampiran?.skemaPertanggungjawaban) ? formData.lampiran.skemaPertanggungjawaban.join('\n') : (formData.lampiran?.skemaPertanggungjawaban || '')}
                      onChange={e => setFormData({
                        ...formData,
                        lampiran: {
                          ...formData.lampiran,
                          skemaPertanggungjawaban: e.target.value.split('\n').filter(Boolean)
                        }
                      })}
                      className="w-full text-xs border rounded-lg p-2.5 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      3. Konsekuensi
                    </label>
                    <textarea
                      rows={3}
                      value={Array.isArray(formData.lampiran?.konsekuensi) ? formData.lampiran.konsekuensi.join('\n') : (formData.lampiran?.konsekuensi || '')}
                      onChange={e => setFormData({
                        ...formData,
                        lampiran: {
                          ...formData.lampiran,
                          konsekuensi: e.target.value.split('\n').filter(Boolean)
                        }
                      })}
                      className="w-full text-xs border rounded-lg p-2.5 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (editorStep === 'identitas') setActiveView('table');
                  else if (editorStep === 'hasil_kerja') setEditorStep('identitas');
                  else if (editorStep === 'perilaku') setEditorStep('hasil_kerja');
                  else if (editorStep === 'lampiran') setEditorStep('perilaku');
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Kembali
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSKP(formData);
                    setActiveView('preview');
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <i className="bi bi-eye mr-1.5"></i>
                  Pratinjau Dokumen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={syncing}
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                >
                  {syncing ? 'Menyimpan...' : 'Simpan & Terbitkan SKP'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: OFFICIAL 8-PAGE DOCUMENT PREVIEW */}
      {activeView === 'preview' && (
        <div className="space-y-6">
          {/* Preview Navigation Tabs */}
          <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'Semua (8 Halaman Lengkap)' },
                { id: 'doc_eval', label: 'Hal 1: Dokumen Evaluasi' },
                { id: 'lampiran', label: 'Hal 2: Lampiran SKP' },
                { id: 'sasaran', label: 'Hal 3-4: Sasaran Kinerja' },
                { id: 'evaluasi', label: 'Hal 5-6: Evaluasi Kinerja' },
                { id: 'rekaman', label: 'Hal 7-8: Rekaman Umpan Balik' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPreviewTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    previewTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-slate-500">
              Format Standar PermenPANRB 6/2022
            </div>
          </div>

          {/* Document Container */}
          <div 
            ref={pdfContainerRef}
            id="skp-print-container"
            className="flex flex-col items-center gap-8 py-4 bg-slate-200/60 rounded-xl p-4 md:p-8 overflow-x-auto"
          >
            {/* HALAMAN 1: DOKUMEN EVALUASI KINERJA PEGAWAI */}
            {(previewTab === 'all' || previewTab === 'doc_eval') && (
              <div className="shadow-2xl">
                <DokumenEvaluasiPage1 
                  data={activeRecord} 
                  pSubjek={pSubjek} 
                  pPenilai={pPenilai} 
                  pAtasan={pAtasan} 
                />
              </div>
            )}

            {/* HALAMAN 2: LAMPIRAN SASARAN KINERJA PEGAWAI */}
            {(previewTab === 'all' || previewTab === 'lampiran') && (
              <div className="shadow-2xl">
                <LampiranSKPPage2 
                  data={activeRecord} 
                  pSubjek={pSubjek} 
                  pPenilai={pPenilai} 
                />
              </div>
            )}

            {/* HALAMAN 3 & 4: SASARAN KINERJA PEGAWAI KUANTITATIF */}
            {(previewTab === 'all' || previewTab === 'sasaran') && (
              <div className="flex flex-col gap-8 shadow-2xl">
                <SasaranKinerjaPages34 
                  data={activeRecord} 
                  pSubjek={pSubjek} 
                  pPenilai={pPenilai} 
                />
              </div>
            )}

            {/* HALAMAN 5 & 6: EVALUASI KINERJA PEGAWAI */}
            {(previewTab === 'all' || previewTab === 'evaluasi') && (
              <div className="flex flex-col gap-8 shadow-2xl">
                <EvaluasiKinerjaPages56 
                  data={activeRecord} 
                  pSubjek={pSubjek} 
                  pPenilai={pPenilai} 
                />
              </div>
            )}

            {/* HALAMAN 7 & 8: REKAMAN INFORMASI UMPAN BALIK BERKELANJUTAN */}
            {(previewTab === 'all' || previewTab === 'rekaman') && (
              <div className="flex flex-col gap-8 shadow-2xl">
                <RekamanUmpanBalikPages78 
                  data={activeRecord} 
                  pSubjek={pSubjek} 
                  pPenilai={pPenilai} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Data SKP"
        message={`Apakah Anda yakin ingin menghapus data SKP untuk ${itemToDelete?.namaPegawai || ''}?`}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Dokumen SKP Berhasil Diterbitkan"
        message="Data SKP dan Evaluasi Kinerja berhasil disimpan dan dokumen siap dicetak atau diunduh sebagai PDF."
      />

    </div>
  );
};

export default SKPPage;
