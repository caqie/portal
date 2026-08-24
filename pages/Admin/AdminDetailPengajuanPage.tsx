import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { 
  fetchLayananSDMFromSheets, 
  fetchDokumenPengajuanFromSheets, 
  fetchLogPengajuanFromSheets, 
  fetchPesanPengajuanFromSheets,
  savePengajuanSDMToSheets,
  sendPesanPengajuanToSheets,
  calculateSLA,
  uploadFileToDrive
} from '../../spreadsheetService';
import { STATUS_CONFIG, MASTER_LAYANAN_DATA } from '../../layananMasterData';
import { PengajuanSDM, DokumenPengajuan, LogPengajuan, PesanPengajuan, MasterLayanan, StatusPengajuan } from '../../types';

export const AdminDetailPengajuanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [pengajuan, setPengajuan] = useState<PengajuanSDM | null>(null);
  const [dokumenList, setDokumenList] = useState<DokumenPengajuan[]>([]);
  const [logList, setLogList] = useState<LogPengajuan[]>([]);
  const [pesanList, setPesanList] = useState<PesanPengajuan[]>([]);
  const [masterInfo, setMasterInfo] = useState<MasterLayanan | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<'verifikasi' | 'timeline' | 'chat'>('verifikasi');

  // Action Modals
  const [actionType, setActionType] = useState<'TERIMA' | 'PROSES' | 'MINTA_PERBAIKAN' | 'SELESAI' | 'TOLAK' | 'ASSIGN' | null>(null);
  const [actionNotes, setActionNotes] = useState<string>('');
  const [nomorSuratHasil, setNomorSuratHasil] = useState<string>('');
  const [fileHasilUrl, setFileHasilUrl] = useState<string>('');
  const [fileHasilBlob, setFileHasilBlob] = useState<{ file: File; base64: string; fileName: string; mimeType: string } | null>(null);
  const [petugasDisposisi, setPetugasDisposisi] = useState<string>('');
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Chat input
  const [chatInput, setChatInput] = useState<string>('');
  const [sendingChat, setSendingChat] = useState<boolean>(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const allSubmissions = await fetchLayananSDMFromSheets(true);
      const found = allSubmissions.find(p => p.id === id || p.nomorTiket === id);

      if (found) {
        setPengajuan(found);
        setPetugasDisposisi(found.petugasNama || '');
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
      console.error('Error loading admin detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Handle Send Chat from Admin
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !pengajuan || sendingChat) return;

    setSendingChat(true);
    try {
      const chatItem: PesanPengajuan = {
        id: `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        idPengajuan: pengajuan.id,
        nomorTiket: pengajuan.nomorTiket,
        pengirimNip: user?.nip || 'Admin',
        pengirimNama: user?.name || 'Petugas SDM',
        role: user?.role || 'Admin SDM',
        pesan: chatInput.trim(),
        timestamp: new Date().toISOString(),
        dibaca: false
      };

      await sendPesanPengajuanToSheets(chatItem);
      setPesanList(prev => [...prev, chatItem]);
      setChatInput('');
    } catch (err) {
      alert('Gagal mengirim pesan.');
    } finally {
      setSendingChat(false);
    }
  };

  // Handle Output File Pick
  const handleOutputDocPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileHasilBlob({
        file,
        base64: ev.target?.result as string,
        fileName: file.name,
        mimeType: file.type || 'application/pdf'
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Action Execution
  const handleExecuteAction = async () => {
    if (!pengajuan || !actionType) return;
    setSubmittingAction(true);

    try {
      const nowIso = new Date().toISOString();
      const todayDate = new Date().toISOString().split('T')[0];
      let newStatus: StatusPengajuan = pengajuan.status;
      let logMsg = actionNotes;

      let finalFileHasilUrl = fileHasilUrl;
      if (fileHasilBlob) {
        try {
          const upRes = await uploadFileToDrive(fileHasilBlob.base64, `${pengajuan.nomorTiket}_HASIL_${fileHasilBlob.fileName}`, fileHasilBlob.mimeType);
          if (upRes.success && upRes.fileUrl) {
            finalFileHasilUrl = upRes.fileUrl;
          }
        } catch (uErr) {
          console.warn('Drive upload fallback:', uErr);
        }
      }

      if (actionType === 'TERIMA') {
        newStatus = 'DIVERIFIKASI';
        logMsg = `Berkas dinyatakan lengkap & diverifikasi oleh ${user?.name || 'Admin SDM'}. ${actionNotes}`;
      } else if (actionType === 'PROSES') {
        newStatus = 'DALAM_PROSES';
        logMsg = `Permohonan sedang diproses oleh ${user?.name || 'Admin SDM'}. ${actionNotes}`;
      } else if (actionType === 'MINTA_PERBAIKAN') {
        newStatus = 'PERLU_PERBAIKAN';
        logMsg = `Petugas meminta perbaikan dokumen: ${actionNotes}`;
      } else if (actionType === 'SELESAI') {
        newStatus = 'SELESAI';
        logMsg = `Permohonan selesai diproses. Nomor Dokumen: ${nomorSuratHasil || '-'}. ${actionNotes}`;
      } else if (actionType === 'TOLAK') {
        newStatus = 'DITOLAK';
        logMsg = `Permohonan ditolak dengan alasan: ${actionNotes}`;
      } else if (actionType === 'ASSIGN') {
        logMsg = `Permohonan didisposisikan kepada: ${petugasDisposisi}`;
      }

      const updatedPengajuan: PengajuanSDM = {
        ...pengajuan,
        status: newStatus,
        petugasNama: petugasDisposisi || pengajuan.petugasNama,
        catatanVerifikator: actionNotes || pengajuan.catatanVerifikator,
        catatanPerbaikan: actionType === 'MINTA_PERBAIKAN' ? actionNotes : pengajuan.catatanPerbaikan,
        alasanPenolakan: actionType === 'TOLAK' ? actionNotes : pengajuan.alasanPenolakan,
        nomorSuratHasil: actionType === 'SELESAI' ? (nomorSuratHasil || pengajuan.nomorSuratHasil) : pengajuan.nomorSuratHasil,
        fileHasilUrl: finalFileHasilUrl || pengajuan.fileHasilUrl,
        tanggalSelesai: actionType === 'SELESAI' ? todayDate : pengajuan.tanggalSelesai,
        updatedAt: nowIso
      };

      await savePengajuanSDMToSheets(
        updatedPengajuan,
        { nip: user?.nip || '', name: user?.name || '', role: user?.role || 'Admin SDM' },
        logMsg,
        pengajuan.status
      );

      setActionType(null);
      setActionNotes('');
      setFileHasilBlob(null);
      loadData();
      alert('Status permohonan berhasil diperbarui!');
    } catch (e: any) {
      alert(`Gagal memperbarui status: ${e.message || e}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Memuat data verifikasi admin...</p>
        </div>
      </div>
    );
  }

  if (!pengajuan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md text-center shadow-xs">
          <h3 className="text-base font-bold text-slate-900">Tiket Tidak Ditemukan</h3>
          <Link to="/admin/layanan-sdm" className="mt-4 inline-block text-xs font-bold text-blue-600">
            Kembali ke Panel Admin
          </Link>
        </div>
      </div>
    );
  }

  const sCfg = STATUS_CONFIG[pengajuan.status] || STATUS_CONFIG['DIAJUKAN'];
  const sla = calculateSLA(pengajuan.tanggalPengajuan, masterInfo?.slaHari || 3, pengajuan.status, pengajuan.tanggalSelesai);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      {/* Header Sticky */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/layanan-sdm')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <i className="bi bi-arrow-left text-lg" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-black text-blue-600">{pengajuan.nomorTiket}</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${sCfg.badge}`}>
                    <i className={`bi ${sCfg.icon}`} /> {sCfg.label}
                  </span>
                  {pengajuan.prioritas === 'URGENT' && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                      URGENT
                    </span>
                  )}
                </div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                  {pengajuan.namaLayanan} — <span className="text-slate-600 font-medium">{pengajuan.nama} ({pengajuan.nip})</span>
                </h1>
              </div>
            </div>

            {/* Admin Actions Dropdown / Quick Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {pengajuan.status === 'DIAJUKAN' && (
                <>
                  <button
                    onClick={() => { setActionType('TERIMA'); setActionNotes('Berkas lengkap dan terverifikasi.'); }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <i className="bi bi-check-circle mr-1" /> Verifikasi & Terima
                  </button>
                  <button
                    onClick={() => { setActionType('MINTA_PERBAIKAN'); setActionNotes(''); }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <i className="bi bi-pencil-square mr-1" /> Minta Perbaikan
                  </button>
                  <button
                    onClick={() => { setActionType('TOLAK'); setActionNotes(''); }}
                    className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition"
                  >
                    <i className="bi bi-x-circle mr-1" /> Tolak
                  </button>
                </>
              )}

              {(pengajuan.status === 'DIVERIFIKASI' || pengajuan.status === 'MENUNGGU_VERIFIKASI') && (
                <>
                  <button
                    onClick={() => { setActionType('PROSES'); setActionNotes('Sedang dalam tahap pemrosesan SK/Surat/Rekomendasi.'); }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <i className="bi bi-gear-wide-connected mr-1" /> Proses Permohonan
                  </button>
                  <button
                    onClick={() => { setActionType('MINTA_PERBAIKAN'); setActionNotes(''); }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition"
                  >
                    <i className="bi bi-pencil-square mr-1" /> Minta Perbaikan
                  </button>
                </>
              )}

              {pengajuan.status === 'DALAM_PROSES' && (
                <button
                  onClick={() => { setActionType('SELESAI'); setActionNotes('Layanan berhasil diselesaikan.'); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <i className="bi bi-check2-all mr-1" /> Selesaikan Layanan & Terbitkan Hasil
                </button>
              )}

              <button
                onClick={() => setActionType('ASSIGN')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                <i className="bi bi-person-plus mr-1" /> Disposisi
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 mt-4 border-t border-slate-100 pt-3">
            {[
              { id: 'verifikasi', label: 'Verifikasi Berkas & Isian', icon: 'bi-patch-check' },
              { id: 'timeline', label: `Jejak Audit & Log (${logList.length})`, icon: 'bi-clock-history' },
              { id: 'chat', label: `Chat Pemohon (${pesanList.length})`, icon: 'bi-chat-dots' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
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
        {/* SLA & Assign Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Tanggal Pengajuan</span>
            <strong className="text-xs text-slate-800 mt-0.5 block">{pengajuan.tanggalPengajuan}</strong>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Target SLA</span>
            <div className="mt-0.5 flex items-center gap-1">
              <span className={`text-xs font-bold ${sla.colorClass}`}>{sla.label}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Petugas SDM</span>
            <strong className="text-xs text-slate-800 mt-0.5 block">{pengajuan.petugasNama || 'Belum ditugaskan'}</strong>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
            <span className="text-[11px] text-slate-400 block font-medium">Kontak Pemohon</span>
            <span className="text-xs font-bold text-blue-600 mt-0.5 block">{pengajuan.noHp || '-'}</span>
          </div>
        </div>

        {/* TAB 1: VERIFIKASI */}
        {activeTab === 'verifikasi' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Data & Pemohon */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pemohon Info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <i className="bi bi-person-fill text-blue-600" />
                  <span>Identitas Pegawai Pemohon</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">NIP</span>
                    <strong className="text-slate-900 font-mono">{pengajuan.nip}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Lengkap</span>
                    <strong className="text-slate-900">{pengajuan.nama}</strong>
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
                    <span className="text-slate-400 block text-[11px]">Pangkat / Golongan</span>
                    <span className="text-slate-800">{pengajuan.pangkat || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Status Kepegawaian</span>
                    <span className="text-slate-800">{pengajuan.statusKepegawaian || 'PNS'}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Form Values */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <i className="bi bi-ui-checks text-blue-600" />
                  <span>Data Isian Formulir Permohonan</span>
                </h3>
                <div className="divide-y divide-slate-100 pt-1 text-xs">
                  {typeof pengajuan.dataForm === 'object' && Object.keys(pengajuan.dataForm).length > 0 ? (
                    Object.entries(pengajuan.dataForm).map(([key, val]) => {
                      const matchField = masterInfo?.fields.find(f => f.name === key);
                      return (
                        <div key={key} className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                          <span className="text-slate-500 font-medium sm:w-1/3">{matchField?.label || key}:</span>
                          <span className="text-slate-900 font-bold sm:w-2/3 break-words">{String(val)}</span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 py-3 text-center">Tidak ada isian formulir tambahan.</p>
                  )}
                  {pengajuan.keterangan && (
                    <div className="py-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                      <span className="text-slate-500 font-medium sm:w-1/3">Catatan Pemohon:</span>
                      <span className="text-slate-800 sm:w-2/3">{pengajuan.keterangan}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Documents Checklist & Output */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900">Dokumen Lampiran ({dokumenList.length})</h3>
                  <span className="text-[11px] font-semibold text-blue-600">Verifikasi Berkas</span>
                </div>

                {dokumenList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada dokumen dilampirkan.</p>
                ) : (
                  <div className="space-y-3">
                    {dokumenList.map((doc, idx) => (
                      <div key={doc.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate">
                            <span className="font-bold text-slate-900 block truncate">{doc.namaDokumen}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{doc.fileName} (v{doc.versi})</span>
                          </div>
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">
                            {(((doc.size || 0)) / 1024).toFixed(0)} KB
                          </span>
                        </div>

                        {doc.fileUrl && (
                          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-end">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded text-[11px] font-bold text-blue-600 transition inline-flex items-center gap-1"
                            >
                              <i className="bi bi-box-arrow-up-right" />
                              <span>Buka Dokumen</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hasil Layanan Document if exists */}
              {pengajuan.fileHasilUrl && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <i className="bi bi-patch-check-fill text-base text-emerald-600" />
                    <span>Dokumen Hasil Terbit</span>
                  </div>
                  <p className="text-slate-600">
                    No: <strong>{pengajuan.nomorSuratHasil || '-'}</strong>
                  </p>
                  <a
                    href={pengajuan.fileHasilUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition"
                  >
                    <i className="bi bi-download" />
                    <span>Unduh Dokumen Hasil</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3">
              Jejak Audit & Riwayat Perubahan Status
            </h3>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {logList.map((l, i) => (
                <div key={l.id || i} className="relative">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{l.namaUser} ({l.role})</span>
                      <span className="text-[10px] text-slate-400">{new Date(l.timestamp).toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{l.catatan}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CHAT */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[500px]">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              Diskusi Langsung dengan Pemohon ({pengajuan.nama})
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              {pesanList.map((m, i) => {
                const isAdmin = m.role?.includes('Admin') || m.pengirimNip === user?.nip;
                return (
                  <div key={m.id || i} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold text-slate-700">{m.pengirimNama}</span>
                      <span>({m.role})</span>
                    </div>
                    <div
                      className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                        isAdmin ? 'bg-blue-600 text-white rounded-tr-xs' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      <p>{m.pesan}</p>
                      <span className={`block text-[9px] mt-1 text-right ${isAdmin ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(m.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 bg-white flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Balas atau kirim instruksi ke pemohon..."
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 transition"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                Kirim
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ACTION DIALOG MODAL */}
      {actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {actionType === 'TERIMA' && 'Verifikasi & Terima Permohonan'}
                {actionType === 'PROSES' && 'Mulai Pemrosesan Permohonan'}
                {actionType === 'MINTA_PERBAIKAN' && 'Minta Perbaikan Dokumen ke Pemohon'}
                {actionType === 'SELESAI' && 'Selesaikan Permohonan & Terbitkan Hasil'}
                {actionType === 'TOLAK' && 'Tolak Permohonan'}
                {actionType === 'ASSIGN' && 'Disposisikan ke Petugas SDM'}
              </h3>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-slate-600">
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>

            {/* SELESAI Specific Fields */}
            {actionType === 'SELESAI' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Surat / SK Hasil Layanan</label>
                  <input
                    type="text"
                    value={nomorSuratHasil}
                    onChange={e => setNomorSuratHasil(e.target.value)}
                    placeholder="Contoh: W.10-KP.04.01-1234 TAHUN 2026"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unggah Dokumen Hasil (PDF)</label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleOutputDocPick}
                    className="w-full text-xs"
                  />
                  {fileHasilBlob && (
                    <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                      Terpilih: {fileHasilBlob.fileName}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ASSIGN Specific Fields */}
            {actionType === 'ASSIGN' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Petugas Pemroses</label>
                <input
                  type="text"
                  value={petugasDisposisi}
                  onChange={e => setPetugasDisposisi(e.target.value)}
                  placeholder="Masukkan nama petugas..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
            )}

            {/* General Notes Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Verifikator / Alasan {actionType === 'MINTA_PERBAIKAN' || actionType === 'TOLAK' ? '(Wajib)' : '(Opsional)'}
              </label>
              <textarea
                rows={3}
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder="Tuliskan catatan verifikasi..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionType(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submittingAction || ((actionType === 'MINTA_PERBAIKAN' || actionType === 'TOLAK') && !actionNotes.trim())}
                onClick={handleExecuteAction}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {submittingAction ? 'Memproses...' : 'Konfirmasi Tindakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDetailPengajuanPage;
