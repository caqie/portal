import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchLayananSDMFromSheets, 
  fetchDokumenPengajuanFromSheets, 
  fetchLogPengajuanFromSheets, 
  fetchPesanPengajuanFromSheets,
  savePengajuanSDMToSheets,
  saveDokumenPengajuanToSheets,
  sendPesanPengajuanToSheets,
  calculateSLA,
  uploadFileToDrive
} from '../../spreadsheetService';
import { STATUS_CONFIG, MASTER_LAYANAN_DATA } from '../../layananMasterData';
import { PengajuanSDM, DokumenPengajuan, LogPengajuan, PesanPengajuan, MasterLayanan } from '../../types';

export const DetailPengajuanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [pengajuan, setPengajuan] = useState<PengajuanSDM | null>(null);
  const [dokumenList, setDokumenList] = useState<DokumenPengajuan[]>([]);
  const [logList, setLogList] = useState<LogPengajuan[]>([]);
  const [pesanList, setPesanList] = useState<PesanPengajuan[]>([]);
  const [masterInfo, setMasterInfo] = useState<MasterLayanan | null>(null);

  // Active view tab in detail page
  const [activeTab, setActiveTab] = useState<'info' | 'dokumen' | 'timeline' | 'chat'>('info');

  // Chat message input
  const [newChatMessage, setNewChatMessage] = useState<string>('');
  const [sendingChat, setSendingChat] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Resubmission / Perbaikan Modal
  const [showPerbaikanModal, setShowPerbaikanModal] = useState<boolean>(false);
  const [catatanPemohonPerbaikan, setCatatanPemohonPerbaikan] = useState<string>('');
  const [submittingPerbaikan, setSubmittingPerbaikan] = useState<boolean>(false);
  const [repairedFiles, setRepairedFiles] = useState<Record<string, { file: File; base64: string; fileName: string; size: number; mimeType: string }>>({});

  const loadTicketData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const allSubmissions = await fetchLayananSDMFromSheets(true);
      const found = allSubmissions.find(p => p.id === id || p.nomorTiket === id);
      
      if (found) {
        setPengajuan(found);
        const [docs, logs, messages] = await Promise.all([
          fetchDokumenPengajuanFromSheets(found.id, true),
          fetchLogPengajuanFromSheets(found.id, true),
          fetchPesanPengajuanFromSheets(found.id, true)
        ]);
        setDokumenList(docs || []);
        setLogList(logs || []);
        setPesanList(messages || []);

        const mInfo = MASTER_LAYANAN_DATA.find(m => m.id === found.idLayanan || m.kodeLayanan === found.idLayanan);
        if (mInfo) setMasterInfo(mInfo);
      }
    } catch (e) {
      console.error('Error loading ticket details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketData();
    if (searchParams.get('action') === 'perbaiki') {
      setShowPerbaikanModal(true);
    }
  }, [id, searchParams]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pesanList, activeTab]);

  // Handle Send Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !pengajuan || sendingChat) return;

    setSendingChat(true);
    try {
      const chatItem: PesanPengajuan = {
        id: `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        idPengajuan: pengajuan.id,
        nomorTiket: pengajuan.nomorTiket,
        pengirimNip: user?.nip || 'User',
        pengirimNama: user?.name || user?.nip || 'Pemohon',
        role: user?.role || 'Pegawai',
        pesan: newChatMessage.trim(),
        timestamp: new Date().toISOString(),
        dibaca: false
      };

      await sendPesanPengajuanToSheets(chatItem);
      setPesanList(prev => [...prev, chatItem]);
      setNewChatMessage('');
    } catch (err) {
      alert('Gagal mengirim pesan chat.');
    } finally {
      setSendingChat(false);
    }
  };

  // Handle Resubmit Perbaikan Berkas
  const handleFileReplacement = (docId: string, file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file maksimal 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setRepairedFiles(prev => ({
        ...prev,
        [docId]: {
          file,
          fileName: file.name,
          size: file.size,
          mimeType: file.type || 'application/pdf',
          base64: e.target?.result as string
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleKirimPerbaikan = async () => {
    if (!pengajuan) return;
    setSubmittingPerbaikan(true);

    try {
      const nowIso = new Date().toISOString();

      // Upload replaced documents
      for (const [docId, fItem] of Object.entries(repairedFiles)) {
        let driveUrl = '';
        let driveFileId = '';
        try {
          const uploadRes = await uploadFileToDrive(fItem.base64, `${pengajuan.nomorTiket}_REPAIRED_${fItem.fileName}`, fItem.mimeType);
          if (uploadRes.success && uploadRes.fileUrl) {
            driveUrl = uploadRes.fileUrl;
            driveFileId = (uploadRes as any).fileId || '';
          }
        } catch (uErr) {
          console.warn('Drive upload error fallback:', uErr);
        }

        const existingDoc = dokumenList.find(d => d.id === docId || d.jenisDokumen === docId);
        const newDoc: DokumenPengajuan = {
          id: existingDoc?.id || `DOC_${Date.now()}`,
          idPengajuan: pengajuan.id,
          nomorTiket: pengajuan.nomorTiket,
          namaDokumen: existingDoc?.namaDokumen || fItem.fileName,
          jenisDokumen: existingDoc?.jenisDokumen || docId,
          fileId: driveFileId,
          fileName: fItem.fileName,
          fileUrl: driveUrl || fItem.base64,
          mimeType: fItem.mimeType,
          size: fItem.size,
          uploadedBy: user?.name || user?.nip || 'Pemohon',
          uploadedAt: nowIso,
          versi: (existingDoc?.versi || 1) + 1,
          aktif: true
        };

        await saveDokumenPengajuanToSheets(newDoc);
      }

      // Update pengajuan status back to MENUNGGU_VERIFIKASI
      const updatedPengajuan: PengajuanSDM = {
        ...pengajuan,
        status: 'MENUNGGU_VERIFIKASI',
        catatanPerbaikan: `[Perbaikan Dikirim Pemohon ${new Date().toLocaleDateString('id-ID')}] ${catatanPemohonPerbaikan}`,
        updatedAt: nowIso
      };

      await savePengajuanSDMToSheets(
        updatedPengajuan,
        { nip: user?.nip || '', name: user?.name || '', role: user?.role || 'Pegawai' },
        `Pemohon telah mengirimkan perbaikan berkas: ${catatanPemohonPerbaikan || 'Dokumen diperbarui'}`,
        pengajuan.status
      );

      setShowPerbaikanModal(false);
      setRepairedFiles({});
      setCatatanPemohonPerbaikan('');
      loadTicketData();
      alert('Perbaikan berkas berhasil dikirimkan ke Tim SDM!');
    } catch (err: any) {
      alert(`Gagal mengirim perbaikan: ${err.message || err}`);
    } finally {
      setSubmittingPerbaikan(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memuat Rincian Tiket Permohonan...</p>
        </div>
      </div>
    );
  }

  if (!pengajuan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-xs">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-4">
            <i className="bi bi-slash-circle" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Tiket Tidak Ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Nomor tiket atau identitas permohonan yang Anda cari tidak tersedia dalam database.
          </p>
          <Link
            to="/layanan-sdm/pengajuan-saya"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Kembali ke Pengajuan Saya
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[pengajuan.status] || STATUS_CONFIG['DIAJUKAN'];
  const sla = calculateSLA(pengajuan.tanggalPengajuan, masterInfo?.slaHari || 3, pengajuan.status, pengajuan.tanggalSelesai);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header Sticky Navigation */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/layanan-sdm/pengajuan-saya')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Kembali"
              >
                <i className="bi bi-arrow-left text-lg" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-black text-blue-600">
                    {pengajuan.nomorTiket}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${statusCfg.badge}`}>
                    <i className={`bi ${statusCfg.icon}`} />
                    {statusCfg.label}
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {pengajuan.namaLayanan}
                </h1>
              </div>
            </div>

            {/* Top action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                <i className="bi bi-printer" />
                <span>Cetak Tanda Terima</span>
              </button>

              {pengajuan.status === 'PERLU_PERBAIKAN' && (
                <button
                  onClick={() => setShowPerbaikanModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                >
                  <i className="bi bi-pencil-square" />
                  <span>Perbaiki Berkas</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 border-t border-slate-100 pt-3">
            {[
              { id: 'info', label: 'Rincian Permohonan', icon: 'bi-file-earmark-text' },
              { id: 'dokumen', label: `Dokumen Lampiran (${dokumenList.length})`, icon: 'bi-paperclip' },
              { id: 'timeline', label: `Log & Progres (${logList.length})`, icon: 'bi-clock-history' },
              { id: 'chat', label: `Diskusi & Catatan (${pesanList.length})`, icon: 'bi-chat-dots' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <i className={`bi ${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Urgent Status Warning / Action Banner */}
        {pengajuan.status === 'PERLU_PERBAIKAN' && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600">
                  <i className="bi bi-exclamation-triangle-fill text-2xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-900">Perhatian: Verifikator meminta perbaikan data/dokumen</h3>
                  <div className="text-xs text-rose-800 mt-1 bg-white/80 p-3 rounded-xl border border-rose-200 font-medium">
                    {pengajuan.catatanPerbaikan || pengajuan.catatanVerifikator || 'Harap periksa kelengkapan berkas yang diunggah dan unggah ulang dokumen yang sesuai.'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPerbaikanModal(true)}
                className="self-start sm:self-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition whitespace-nowrap"
              >
                <i className="bi bi-upload mr-1.5" />
                Unggah Perbaikan Sekarang
              </button>
            </div>
          </div>
        )}

        {/* Output Document Available Banner */}
        {pengajuan.status === 'SELESAI' && pengajuan.fileHasilUrl && (
          <div className="mb-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
                  <i className="bi bi-patch-check-fill text-2xl" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Dokumen Hasil Permohonan Telah Diterbitkan</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Nomor Surat / SK: <strong>{pengajuan.nomorSuratHasil || '-'}</strong> • Diselesaikan pada: {pengajuan.tanggalSelesai}
                  </p>
                </div>
              </div>
              <a
                href={pengajuan.fileHasilUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
              >
                <i className="bi bi-download" />
                <span>Unduh Dokumen Resmi</span>
              </a>
            </div>
          </div>
        )}

        {/* SLA & Officer Meta Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Tanggal Pengajuan</span>
            <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
              <i className="bi bi-calendar-event text-blue-500" />
              <span>{pengajuan.tanggalPengajuan}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Target SLA Layanan</span>
            <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
              <i className="bi bi-stopwatch text-indigo-500" />
              <span className={sla.colorClass}>{sla.label}</span>
              <span className="text-[10px] text-slate-400 font-normal">({sla.deadlineStr})</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Petugas Pemroses SDM</span>
            <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
              <i className="bi bi-person-badge text-emerald-500" />
              <span>{pengajuan.petugasNama || 'Tim Verifikator SDM'}</span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: RINCIAN PERMOHONAN */}
        {/* ==================================================== */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Pemohon Identity Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <i className="bi bi-person-badge-fill text-blue-600" />
                <span>Identitas Pemohon</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">NIP</span>
                  <strong className="text-slate-900 font-mono text-sm">{pengajuan.nip}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Nama Pegawai</span>
                  <strong className="text-slate-900 text-sm">{pengajuan.nama}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Unit Kerja</span>
                  <span className="text-slate-800">{pengajuan.unitKerja || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Jabatan</span>
                  <span className="text-slate-800">{pengajuan.jabatan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Pangkat / Gol. Ruang</span>
                  <span className="text-slate-800">{pengajuan.pangkat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status Kepegawaian</span>
                  <span className="text-slate-800">{pengajuan.statusKepegawaian || 'PNS'}</span>
                </div>
              </div>
            </div>

            {/* Isian Formulir Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <i className="bi bi-ui-checks text-blue-600" />
                <span>Data Isian Formulir Permohonan</span>
              </h3>

              <div className="divide-y divide-slate-100 pt-2 text-xs">
                {typeof pengajuan.dataForm === 'object' && Object.keys(pengajuan.dataForm).length > 0 ? (
                  Object.entries(pengajuan.dataForm).map(([key, val]) => {
                    const matchingField = masterInfo?.fields.find(f => f.name === key);
                    const label = matchingField?.label || key;
                    return (
                      <div key={key} className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                        <span className="text-slate-500 font-medium sm:w-1/3">{label}:</span>
                        <span className="text-slate-900 font-bold sm:w-2/3 break-words">
                          {String(val) || '-'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-400 py-3 text-center">Tidak ada isian formulir tambahan.</p>
                )}

                {pengajuan.keterangan && (
                  <div className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <span className="text-slate-500 font-medium sm:w-1/3">Catatan / Keterangan:</span>
                    <span className="text-slate-800 sm:w-2/3">{pengajuan.keterangan}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: DOKUMEN LAMPIRAN */}
        {/* ==================================================== */}
        {activeTab === 'dokumen' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Dokumen Lampiran Berkas</h3>
                <p className="text-xs text-slate-500">Berkas pendukung yang telah diunggah untuk verifikasi kepegawaian.</p>
              </div>
              {pengajuan.status === 'PERLU_PERBAIKAN' && (
                <button
                  onClick={() => setShowPerbaikanModal(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
                >
                  <i className="bi bi-arrow-repeat mr-1" />
                  Unggah Pengganti
                </button>
              )}
            </div>

            {dokumenList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <i className="bi bi-folder2-open text-2xl mb-2 block" />
                Tidak ada dokumen yang dilampirkan pada permohonan ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dokumenList.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-base">
                            <i className="bi bi-file-earmark-pdf-fill" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{doc.namaDokumen}</h4>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">{doc.fileName}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700">
                          v{doc.versi || 1}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Ukuran: {(((doc.size || 0)) / 1024).toFixed(1)} KB</span>
                        <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('id-ID') : '-'}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2">
                      {doc.fileUrl ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-700 transition"
                        >
                          <i className="bi bi-box-arrow-up-right" />
                          <span>Lihat / Unduh Berkas</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">File tersimpan di server</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: TIMELINE & LOG PROGRES */}
        {/* ==================================================== */}
        {activeTab === 'timeline' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Jejak Aktivitas & Log Progres Layanan</h3>
              <p className="text-xs text-slate-500">Rekam jejak setiap perubahan status dan catatan verifikasi dari sistem.</p>
            </div>

            {logList.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <i className="bi bi-clock-history text-2xl mb-2 block" />
                Belum ada catatan log aktivitas lanjutan.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {logList.map((logItem, idx) => {
                  const sCfg = STATUS_CONFIG[logItem.statusBaru] || STATUS_CONFIG['DIAJUKAN'];
                  return (
                    <div key={logItem.id || idx} className="relative">
                      {/* Node dot */}
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${sCfg.badge}`}>
                              {sCfg.label}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {logItem.namaUser} ({logItem.role || 'Sistem'})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(logItem.timestamp).toLocaleString('id-ID')}
                          </span>
                        </div>

                        {logItem.catatan && (
                          <p className="text-xs text-slate-600 mt-2 bg-white p-2.5 rounded-lg border border-slate-200">
                            {logItem.catatan}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: PESAN & DISKUSI INTERAKTIF */}
        {/* ==================================================== */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[520px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Ruang Diskusi & Konsultasi Tiket</h3>
                <p className="text-[11px] text-slate-500">Kirim pesan langsung ke petugas verifikator SDM terkait permohonan ini.</p>
              </div>
              <span className="text-[11px] font-mono font-bold text-blue-600">{pengajuan.nomorTiket}</span>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {pesanList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <i className="bi bi-chat-dots text-3xl mb-2 text-slate-300" />
                  Belum ada pesan diskusi. Tuliskan pesan di bawah jika ingin menanyakan sesuatu ke Tim SDM.
                </div>
              ) : (
                pesanList.map((msg, i) => {
                  const isMe = msg.pengirimNip === user?.nip;
                  return (
                    <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-700">{msg.pengirimNama}</span>
                        <span className="text-[9px] text-slate-400">({msg.role})</span>
                      </div>
                      <div
                        className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                        }`}
                      >
                        <p>{msg.pesan}</p>
                        {msg.fileUrl && (
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-2 block p-2 rounded-lg text-[11px] font-bold truncate ${
                              isMe ? 'bg-blue-700 text-white hover:bg-blue-800' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'
                            }`}
                          >
                            <i className="bi bi-paperclip mr-1" /> {msg.fileName || 'Lampiran Berkas'}
                          </a>
                        )}
                        <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                value={newChatMessage}
                onChange={e => setNewChatMessage(e.target.value)}
                placeholder="Tulis pesan atau pertanyaan ke petugas SDM..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={sendingChat || !newChatMessage.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1"
              >
                {sendingChat ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-send-fill" />}
                <span>Kirim</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL PERBAIKAN BERKAS */}
      {/* ==================================================== */}
      {showPerbaikanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Perbaikan Dokumen</span>
                <h3 className="text-base font-bold text-slate-900">Unggah Perbaikan Berkas Permohonan</h3>
              </div>
              <button
                onClick={() => setShowPerbaikanModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            {/* Note from verifier */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900">
              <span className="font-bold block mb-1">Catatan Petugas Verifikator:</span>
              <p>{pengajuan.catatanPerbaikan || pengajuan.catatanVerifikator || 'Harap periksa dan unggah kembali dokumen persyaratan yang diminta.'}</p>
            </div>

            {/* Document replace list */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Pilih Berkas Pengganti:
              </label>

              {dokumenList.map(doc => {
                const rep = repairedFiles[doc.id || doc.jenisDokumen];
                return (
                  <div key={doc.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate">
                      <span className="font-bold text-slate-800 block truncate">{doc.namaDokumen}</span>
                      <span className="text-[11px] text-slate-400">Berkas saat ini: {doc.fileName} (v{doc.versi})</span>
                    </div>

                    <div>
                      {rep ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-700 truncate max-w-[120px]">{rep.fileName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setRepairedFiles(prev => {
                                const next = { ...prev };
                                delete next[doc.id || doc.jenisDokumen];
                                return next;
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-xs transition inline-flex items-center gap-1">
                          <i className="bi bi-arrow-repeat text-blue-600" />
                          <span>Ganti File</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            className="hidden"
                            onChange={e => handleFileReplacement(doc.id || doc.jenisDokumen, e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Notes to Verifier */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Catatan Penjelasan Perbaikan Pemohon:
              </label>
              <textarea
                rows={3}
                value={catatanPemohonPerbaikan}
                onChange={e => setCatatanPemohonPerbaikan(e.target.value)}
                placeholder="Contoh: Dokumen SK terakhir telah saya perbarui dan dilampirkan ulang..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={submittingPerbaikan}
                onClick={() => setShowPerbaikanModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingPerbaikan}
                onClick={handleKirimPerbaikan}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {submittingPerbaikan ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Sedang Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill" />
                    <span>Kirim Perbaikan ke Tim SDM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DetailPengajuanPage;
