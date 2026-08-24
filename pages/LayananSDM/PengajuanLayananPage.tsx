import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchPegawaiFromSheets, 
  fetchMasterLayananFromSheets, 
  generateNomorTiketSDMKI, 
  savePengajuanSDMToSheets, 
  saveDokumenPengajuanToSheets, 
  uploadFileToDrive 
} from '../../spreadsheetService';
import { 
  LAYANAN_CATEGORIES, 
  MASTER_LAYANAN_DATA, 
  LayananCategory 
} from '../../layananMasterData';
import { Pegawai, MasterLayanan, PengajuanSDM, DokumenPengajuan, PrioritasPengajuan } from '../../types';

export const PengajuanLayananPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // State Stepper (1 to 6)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [generatedTicket, setGeneratedTicket] = useState<string>('');

  // Master Data & User Pegawai Info
  const [masterList, setMasterList] = useState<MasterLayanan[]>(MASTER_LAYANAN_DATA);
  const [pegawaiData, setPegawaiData] = useState<Pegawai | null>(null);

  // Form State
  const [selectedKategoriId, setSelectedKategoriId] = useState<string>('');
  const [selectedLayanan, setSelectedLayanan] = useState<MasterLayanan | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [prioritas, setPrioritas] = useState<PrioritasPengajuan>('NORMAL');
  const [keteranganTambahan, setKeteranganTambahan] = useState<string>('');

  // Uploaded Files State: map docId -> { file, name, size, base64, uploadedUrl, uploading, error }
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, {
    file?: File;
    fileName: string;
    size: number;
    mimeType: string;
    base64?: string;
    url?: string;
    uploading?: boolean;
    error?: string;
  }>>({});

  // Additional optional attachments
  const [extraFiles, setExtraFiles] = useState<{
    id: string;
    label: string;
    fileName: string;
    size: number;
    mimeType: string;
    base64?: string;
    url?: string;
    uploading?: boolean;
  }[]>([]);

  // Load user profile from Pegawai sheet and master services
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [pegawaiList, services] = await Promise.all([
          fetchPegawaiFromSheets(false),
          fetchMasterLayananFromSheets(false)
        ]);

        if (services && services.length > 0) {
          setMasterList(services);
        }

        if (user?.nip) {
          const currentPegawai = pegawaiList.find(p => p.nip === user.nip);
          if (currentPegawai) {
            setPegawaiData(currentPegawai);
          }
        }

        // Check if pre-selected layananId via URL param
        const queryLayananId = searchParams.get('layananId');
        if (queryLayananId) {
          const found = (services || MASTER_LAYANAN_DATA).find(l => l.id === queryLayananId || l.kodeLayanan === queryLayananId);
          if (found) {
            setSelectedKategoriId(found.kategori);
            setSelectedLayanan(found);
            setCurrentStep(3); // Jump directly to Form Fill
          }
        }
      } catch (err) {
        console.error('Failed to init Pengajuan page:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, searchParams]);

  // Selected Category Info
  const selectedCategoryObj = useMemo<LayananCategory | undefined>(() => {
    return LAYANAN_CATEGORIES.find(c => c.id === selectedKategoriId);
  }, [selectedKategoriId]);

  // Available services in selected category
  const servicesInSelectedCategory = useMemo(() => {
    if (!selectedKategoriId) return [];
    return masterList.filter(l => l.kategori === selectedKategoriId && l.aktif);
  }, [masterList, selectedKategoriId]);

  // Handler Step 1: Select Category
  const handleSelectCategory = (catId: string) => {
    setSelectedKategoriId(catId);
    setSelectedLayanan(null);
    setFormData({});
    setUploadedFiles({});
    setCurrentStep(2);
  };

  // Handler Step 2: Select Service
  const handleSelectService = (service: MasterLayanan) => {
    setSelectedLayanan(service);
    // Initialize default form data
    const initialForm: Record<string, any> = {};
    service.fields.forEach(f => {
      if (f.defaultValue) initialForm[f.name] = f.defaultValue;
    });
    setFormData(initialForm);
    setUploadedFiles({});
    setCurrentStep(3);
  };

  // Handle Form Change
  const handleFormFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  // Validate Step 3: Form Fields
  const validateStep3 = () => {
    if (!selectedLayanan) return false;
    for (const field of selectedLayanan.fields) {
      if (field.required && (!formData[field.name] || String(formData[field.name]).trim() === '')) {
        alert(`Harap isi bidang wajib: "${field.label}"`);
        return false;
      }
    }
    return true;
  };

  // Handle File Change for a specific Required Document
  const handleFileChange = (docId: string, file: File | null) => {
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`Ukuran file "${file.name}" melebihi batas maksimal 10 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedFiles(prev => ({
        ...prev,
        [docId]: {
          file,
          fileName: file.name,
          size: file.size,
          mimeType: file.type || 'application/pdf',
          base64: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle Extra Optional File
  const handleAddExtraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(`Ukuran file "${file.name}" melebihi batas maksimal 10 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setExtraFiles(prev => [
        ...prev,
        {
          id: `EXTRA_${Date.now()}`,
          label: file.name,
          fileName: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          base64: base64
        }
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Validate Step 4: Documents Upload
  const validateStep4 = () => {
    if (!selectedLayanan) return false;
    for (const reqDoc of selectedLayanan.requiredDocuments) {
      if (reqDoc.required && !uploadedFiles[reqDoc.id]) {
        alert(`Dokumen wajib belum diunggah: "${reqDoc.label}"`);
        return false;
      }
    }
    return true;
  };

  // Final Submit Handler (Step 5 -> 6)
  const handleSubmitPengajuan = async () => {
    if (!selectedLayanan) return;
    setSubmitting(true);

    try {
      // 1. Generate Nomor Tiket Otomatis
      const ticketNo = await generateNomorTiketSDMKI(new Date().getFullYear());
      const pengajuanId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const nowIso = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0];

      // 2. Upload Files to Google Drive (if online)
      const uploadedDocRecords: DokumenPengajuan[] = [];

      // Process required docs
      for (const reqDoc of selectedLayanan.requiredDocuments) {
        const fileItem = uploadedFiles[reqDoc.id];
        if (fileItem && fileItem.base64) {
          let driveUrl = '';
          let driveFileId = '';
          try {
            const uploadRes = await uploadFileToDrive(fileItem.base64, `${ticketNo}_${reqDoc.id}_${fileItem.fileName}`, fileItem.mimeType);
            if (uploadRes.success && uploadRes.fileUrl) {
              driveUrl = uploadRes.fileUrl;
              driveFileId = (uploadRes as any).fileId || '';
            }
          } catch (uploadErr) {
            console.warn('Upload Drive fallback for document:', reqDoc.label, uploadErr);
          }

          const docRecord: DokumenPengajuan = {
            id: `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            idPengajuan: pengajuanId,
            nomorTiket: ticketNo,
            namaDokumen: reqDoc.label,
            jenisDokumen: reqDoc.id,
            fileId: driveFileId,
            fileName: fileItem.fileName,
            fileUrl: driveUrl || fileItem.base64,
            mimeType: fileItem.mimeType,
            size: fileItem.size,
            uploadedBy: user?.name || user?.nip || 'Pemohon',
            uploadedAt: nowIso,
            versi: 1,
            aktif: true
          };

          uploadedDocRecords.push(docRecord);
          await saveDokumenPengajuanToSheets(docRecord);
        }
      }

      // Process extra optional docs
      for (const extra of extraFiles) {
        if (extra.base64) {
          let driveUrl = '';
          let driveFileId = '';
          try {
            const uploadRes = await uploadFileToDrive(extra.base64, `${ticketNo}_EXTRA_${extra.fileName}`, extra.mimeType);
            if (uploadRes.success && uploadRes.fileUrl) {
              driveUrl = uploadRes.fileUrl;
              driveFileId = (uploadRes as any).fileId || '';
            }
          } catch (uploadErr) {
            console.warn('Upload Drive fallback for extra document:', extra.fileName, uploadErr);
          }

          const docRecord: DokumenPengajuan = {
            id: `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            idPengajuan: pengajuanId,
            nomorTiket: ticketNo,
            namaDokumen: extra.label || 'Dokumen Tambahan',
            jenisDokumen: 'DOKUMEN_TAMBAHAN',
            fileId: driveFileId,
            fileName: extra.fileName,
            fileUrl: driveUrl || extra.base64,
            mimeType: extra.mimeType,
            size: extra.size,
            uploadedBy: user?.name || user?.nip || 'Pemohon',
            uploadedAt: nowIso,
            versi: 1,
            aktif: true
          };

          uploadedDocRecords.push(docRecord);
          await saveDokumenPengajuanToSheets(docRecord);
        }
      }

      // 3. Build PengajuanSDM Record
      const newPengajuan: PengajuanSDM = {
        id: pengajuanId,
        idPengajuan: pengajuanId,
        nomorTiket: ticketNo,
        nip: pegawaiData?.nip || user?.nip || '',
        nama: pegawaiData?.nama || user?.name || '',
        unitKerja: pegawaiData?.unitKerja || '',
        jabatan: pegawaiData?.jabatan || '',
        pangkat: pegawaiData?.golRuang || pegawaiData?.pangkat || '',
        statusKepegawaian: pegawaiData?.jenisPegawai || pegawaiData?.status || 'PNS',
        email: pegawaiData?.email || '',
        noHp: pegawaiData?.noHp || '',
        kategori: selectedLayanan.kategori,
        idLayanan: selectedLayanan.id,
        namaLayanan: selectedLayanan.namaLayanan,
        tanggalPengajuan: todayDate,
        status: 'DIAJUKAN',
        prioritas: prioritas,
        keterangan: keteranganTambahan,
        dataForm: formData,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // 4. Save to Sheets & Local Storage + Write Log
      await savePengajuanSDMToSheets(
        newPengajuan,
        { nip: user?.nip || '', name: user?.name || '', role: user?.role || 'Pegawai' },
        `Permohonan baru diajukan oleh ${user?.name || user?.nip} dengan Nomor Tiket ${ticketNo}`
      );

      setGeneratedTicket(ticketNo);
      setSubmitSuccess(true);
      setCurrentStep(6);
    } catch (err: any) {
      console.error('Error submitting pengajuan:', err);
      alert(`Terjadi kesalahan saat mengirim pengajuan: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Top Header Stepper Indicator */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (currentStep > 1 && !submitSuccess) setCurrentStep(currentStep - 1);
                  else navigate('/layanan-sdm');
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Kembali"
              >
                <i className="bi bi-arrow-left text-lg" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Formulir Permohonan Layanan SDM KI
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Langkah {currentStep} dari 6: {
                    currentStep === 1 ? 'Pilih Kategori Layanan' :
                    currentStep === 2 ? 'Pilih Jenis Layanan' :
                    currentStep === 3 ? 'Pengisian Formulir' :
                    currentStep === 4 ? 'Unggah Dokumen Persyaratan' :
                    currentStep === 5 ? 'Review & Konfirmasi' : 'Bukti Tanda Terima'
                  }
                </p>
              </div>
            </div>

            {/* Step Counter Pills */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6].map(s => (
                <div
                  key={s}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : s < currentStep
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s < currentStep ? <i className="bi bi-check text-xs" /> : s}
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep - 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Form Content Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* ==================================================== */}
        {/* STEP 1: PILIH KATEGORI LAYANAN */}
        {/* ==================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center max-w-xl mx-auto mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Pilih Kategori Layanan</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                Silakan tentukan rumpun layanan kepegawaian yang sesuai dengan kebutuhan permohonan Anda.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LAYANAN_CATEGORIES.map(cat => {
                const count = masterList.filter(l => l.kategori === cat.id && l.aktif).length;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className="cursor-pointer bg-white border border-slate-200/90 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-105 transition`}>
                          <i className={`bi ${cat.icon}`} />
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600">
                          {count} Layanan
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {cat.nama}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {cat.deskripsi}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                      <span>Pilih Kategori</span>
                      <i className="bi bi-chevron-right text-[11px]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 2: PILIH JENIS LAYANAN SPESIFIK */}
        {/* ==================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/70 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg">
                  <i className={`bi ${selectedCategoryObj?.icon || 'bi-folder'}`} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Kategori Terpilih</span>
                  <h3 className="text-sm font-extrabold text-blue-950">{selectedCategoryObj?.nama}</h3>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/60 rounded-lg transition"
              >
                Ganti Kategori
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Pilih Layanan Spesifik</h2>
              <p className="text-xs text-slate-500 mb-4">Pilih jenis permohonan yang ingin Anda ajukan pada kategori ini.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {servicesInSelectedCategory.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectService(item)}
                    className="cursor-pointer bg-white border border-slate-200/90 hover:border-blue-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{item.kodeLayanan}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <i className="bi bi-stopwatch" /> SLA {item.slaHari} Hari
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                        {item.namaLayanan}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                        {item.deskripsi}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                      <span>Lanjut Isi Formulir</span>
                      <i className="bi bi-arrow-right" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 3: FORMULIR DINAMIS & DATA PEMOHON */}
        {/* ==================================================== */}
        {currentStep === 3 && selectedLayanan && (
          <div className="space-y-6">
            {/* Header info box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedCategoryObj?.nama || selectedLayanan.kategori}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">
                      • SLA: {selectedLayanan.slaHari} Hari Kerja
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                    {selectedLayanan.namaLayanan}
                  </h2>
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="self-start sm:self-auto text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Ubah Layanan
                </button>
              </div>
            </div>

            {/* Read-Only Data Pemohon (Integrated with Pegawai) */}
            <div className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <i className="bi bi-person-check-fill text-blue-600 text-base" />
                  <span>Data Identitas Pemohon (Terisi Otomatis)</span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  Read Only
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">NIP Pegawai</label>
                  <div className="font-mono font-bold text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200/80">
                    {pegawaiData?.nip || user?.nip || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Nama Lengkap</label>
                  <div className="font-bold text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200/80 truncate">
                    {pegawaiData?.nama || user?.name || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Unit Kerja</label>
                  <div className="text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80 truncate">
                    {pegawaiData?.unitKerja || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Jabatan</label>
                  <div className="text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80 truncate">
                    {pegawaiData?.jabatan || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Pangkat / Gol. Ruang</label>
                  <div className="text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80">
                    {pegawaiData?.golRuang || pegawaiData?.pangkat || '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Status Kepegawaian</label>
                  <div className="text-slate-800 bg-white px-3 py-2 rounded-xl border border-slate-200/80">
                    {pegawaiData?.jenisPegawai || pegawaiData?.status || 'PNS'}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Form Inputs according to Master Service Config */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <i className="bi bi-ui-checks-grid text-blue-600" />
                <span>Rincian Informasi Permohonan</span>
              </h3>

              {/* Priority Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat Prioritas <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="radio"
                        name="prioritas"
                        value="NORMAL"
                        checked={prioritas === 'NORMAL'}
                        onChange={() => setPrioritas('NORMAL')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Normal (Sesuai SLA Standar)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-rose-700">
                      <input
                        type="radio"
                        name="prioritas"
                        value="URGENT"
                        checked={prioritas === 'URGENT'}
                        onChange={() => setPrioritas('URGENT')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>Mendesak / Segera</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kontak Handphone / WhatsApp Pemohon
                  </label>
                  <input
                    type="text"
                    defaultValue={pegawaiData?.noHp || ''}
                    placeholder="Contoh: 081234567890"
                    onChange={e => handleFormFieldChange('noHpPemohon', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Render dynamic fields */}
              <div className="grid grid-cols-1 gap-4 pt-2">
                {selectedLayanan.fields.map(field => {
                  const val = formData[field.name] ?? '';
                  return (
                    <div key={field.name} className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>

                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={val}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          onChange={e => handleFormFieldChange(field.name, e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      )}

                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={val}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          onChange={e => handleFormFieldChange(field.name, e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      )}

                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={val}
                          required={field.required}
                          onChange={e => handleFormFieldChange(field.name, e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      )}

                      {field.type === 'select' && (
                        <select
                          value={val}
                          required={field.required}
                          onChange={e => handleFormFieldChange(field.name, e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                          <option value="">-- Pilih {field.label} --</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}

                      {field.type === 'textarea' && (
                        <textarea
                          rows={3}
                          value={val}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          onChange={e => handleFormFieldChange(field.name, e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        />
                      )}

                      {field.helperText && (
                        <p className="text-[11px] text-slate-400">{field.helperText}</p>
                      )}
                    </div>
                  );
                })}

                {/* Optional additional notes */}
                <div className="space-y-1 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Catatan / Pesan Tambahan untuk Petugas SDM (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={keteranganTambahan}
                    onChange={e => setKeteranganTambahan(e.target.value)}
                    placeholder="Tuliskan catatan khusus atau informasi lain jika ada..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep3()) setCurrentStep(4);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <span>Lanjut: Unggah Dokumen</span>
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 4: UNGGAH DOKUMEN PERSYARATAN */}
        {/* ==================================================== */}
        {currentStep === 4 && selectedLayanan && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Unggah Dokumen Persyaratan</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Format file yang didukung: PDF, JPG, PNG, DOCX (Maksimal 10 MB per berkas).
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {selectedLayanan.requiredDocuments.length} Dokumen Syarat
                </span>
              </div>

              {selectedLayanan.requiredDocuments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                  <i className="bi bi-check2-circle text-emerald-500 text-2xl mb-2 block" />
                  Layanan ini tidak memerlukan lampiran dokumen wajib. Anda dapat langsung melanjutkan atau menambahkan dokumen pendukung opsional di bawah.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedLayanan.requiredDocuments.map((reqDoc, idx) => {
                    const fileItem = uploadedFiles[reqDoc.id];
                    return (
                      <div
                        key={reqDoc.id}
                        className={`p-4 rounded-xl border transition-all ${
                          fileItem
                            ? 'bg-emerald-50/50 border-emerald-300'
                            : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">
                                {reqDoc.label} {reqDoc.required && <span className="text-rose-500">*</span>}
                              </h4>
                            </div>
                            {reqDoc.description && (
                              <p className="text-[11px] text-slate-500 mt-1 pl-7">{reqDoc.description}</p>
                            )}
                          </div>

                          {/* Upload action */}
                          <div className="flex items-center gap-2 pl-7 sm:pl-0">
                            {fileItem ? (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="text-xs font-bold text-emerald-800 truncate max-w-[180px]">
                                    <i className="bi bi-file-earmark-check-fill text-emerald-600 mr-1" />
                                    {fileItem.fileName}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {(fileItem.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUploadedFiles(prev => {
                                      const next = { ...prev };
                                      delete next[reqDoc.id];
                                      return next;
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 text-xs transition"
                                  title="Hapus File"
                                >
                                  <i className="bi bi-trash" />
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition">
                                <i className="bi bi-cloud-arrow-up-fill text-blue-600" />
                                <span>Pilih File</span>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                  className="hidden"
                                  onChange={e => handleFileChange(reqDoc.id, e.target.files?.[0] || null)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Extra Optional Files */}
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-800">Dokumen Pendukung Tambahan (Opsional)</h4>
                  <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                    <i className="bi bi-plus-circle" /> Tambah Lampiran Lain
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      onChange={handleAddExtraFile}
                    />
                  </label>
                </div>

                {extraFiles.length > 0 && (
                  <div className="space-y-2">
                    {extraFiles.map((extra, i) => (
                      <div key={extra.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <i className="bi bi-paperclip text-slate-400" />
                          <span className="font-medium text-slate-800 truncate">{extra.fileName}</span>
                          <span className="text-[10px] text-slate-400">({(extra.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExtraFiles(prev => prev.filter(x => x.id !== extra.id))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Kembali ke Formulir
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep4()) setCurrentStep(5);
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <span>Lanjut: Review Permohonan</span>
                <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 5: REVIEW LENGKAP & KONFIRMASI */}
        {/* ==================================================== */}
        {currentStep === 5 && selectedLayanan && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedCategoryObj?.nama}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1.5">
                  Ringkasan Permohonan: {selectedLayanan.namaLayanan}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Silakan periksa kembali seluruh data dan dokumen lampiran sebelum dikirimkan ke Tim SDM DJKI.
                </p>
              </div>

              {/* Pemohon summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <i className="bi bi-person text-blue-600" /> Data Pemohon
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-400 block">NIP</span>
                    <strong className="text-slate-800 font-mono">{pegawaiData?.nip || user?.nip}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Nama</span>
                    <strong className="text-slate-800">{pegawaiData?.nama || user?.name}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Jabatan</span>
                    <span className="text-slate-700">{pegawaiData?.jabatan || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Prioritas</span>
                    <span className={`font-bold ${prioritas === 'URGENT' ? 'text-rose-600' : 'text-blue-600'}`}>
                      {prioritas === 'URGENT' ? 'Mendesak / Segera' : 'Normal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Data Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <i className="bi bi-file-text text-blue-600" /> Isian Formulir
                </h4>
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  {selectedLayanan.fields.map(f => (
                    <div key={f.name} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 border-b border-slate-200/60 pb-1.5 last:border-b-0 last:pb-0">
                      <span className="text-slate-500 font-medium sm:w-1/3">{f.label}:</span>
                      <span className="text-slate-900 font-bold sm:w-2/3 break-words">
                        {formData[f.name] ? String(formData[f.name]) : '-'}
                      </span>
                    </div>
                  ))}
                  {keteranganTambahan && (
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 pt-1">
                      <span className="text-slate-500 font-medium sm:w-1/3">Catatan Tambahan:</span>
                      <span className="text-slate-800 sm:w-2/3">{keteranganTambahan}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Summary */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <i className="bi bi-paperclip text-blue-600" /> Lampiran Berkas ({Object.keys(uploadedFiles).length + extraFiles.length} File)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedLayanan.requiredDocuments.map(reqDoc => {
                    const f = uploadedFiles[reqDoc.id];
                    return (
                      <div key={reqDoc.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="truncate">
                          <span className="text-[11px] text-slate-500 block">{reqDoc.label}</span>
                          <span className="font-bold text-slate-800 truncate block">
                            {f ? f.fileName : <span className="text-rose-500">Belum diunggah</span>}
                          </span>
                        </div>
                        {f && <i className="bi bi-check-circle-fill text-emerald-500 text-sm ml-2" />}
                      </div>
                    );
                  })}
                  {extraFiles.map(extra => (
                    <div key={extra.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="truncate">
                        <span className="text-[11px] text-slate-500 block">Tambahan</span>
                        <span className="font-bold text-slate-800 truncate block">{extra.fileName}</span>
                      </div>
                      <i className="bi bi-check-circle-fill text-emerald-500 text-sm ml-2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                <i className="bi bi-info-circle-fill text-blue-600 text-base shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Dengan mengirimkan formulir ini, saya menyatakan bahwa data dan berkas yang saya lampirkan adalah benar dan dapat dipertanggungjawabkan sesuai ketentuan kepegawaian yang berlaku.
                </p>
              </div>
            </div>

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCurrentStep(4)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitPengajuan}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Sedang Mengirim & Memproses Tiket...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill" />
                    <span>Kirim Permohonan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* STEP 6: SUKSES & BUKTI TANDA TERIMA */}
        {/* ==================================================== */}
        {currentStep === 6 && submitSuccess && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-lg text-center max-w-xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-xs">
              <i className="bi bi-check-lg" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-2">
                <i className="bi bi-patch-check-fill" /> Permohonan Berhasil Dikirim
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Nomor Tiket Anda:
              </h2>
              <div className="font-mono text-2xl sm:text-3xl font-black text-blue-600 bg-blue-50/80 border-2 border-dashed border-blue-300 rounded-2xl py-3 px-4 my-3 select-all">
                {generatedTicket}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Permohonan Anda telah terdaftar di Portal Layanan SDM KI dan sedang menunggu verifikasi oleh Tim Kepegawaian DJKI. Simpan nomor tiket ini untuk memantau progres layanan.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Jenis Layanan:</span>
                <span className="font-bold text-slate-800">{selectedLayanan?.namaLayanan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pemohon:</span>
                <span className="font-bold text-slate-800">{pegawaiData?.nama || user?.name} ({pegawaiData?.nip || user?.nip})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimasi SLA:</span>
                <span className="font-bold text-emerald-600">{selectedLayanan?.slaHari} Hari Kerja</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                <i className="bi bi-printer-fill" />
                <span>Cetak Tanda Terima</span>
              </button>

              <button
                onClick={() => navigate('/layanan-sdm/pengajuan-saya')}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <i className="bi bi-clock-history" />
                <span>Lihat Pengajuan Saya</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default PengajuanLayananPage;
