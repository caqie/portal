
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchPegawaiFromSheets, fetchPersuratanFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { Pegawai, PersuratanRecord } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const PersuratanPage = () => {
  const { user, logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [persuratanList, setPersuratanList] = useState<PersuratanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] = useState<'inbox' | 'outbox' | 'editor' | 'preview'>('inbox');
  
  const [activeKategori, setActiveKategori] = useState<'SEMUA' | 'SETJEN' | 'DITJEN' | 'KANWIL' | 'UPT'>('SEMUA');
  const [quickFilter, setQuickFilter] = useState<'SEMUA' | 'BELUM_BACA' | 'BELUM_PROSES' | 'ATENSI'>('SEMUA');

  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PersuratanRecord | null>(null);
  
  const pdfRef = useRef<HTMLDivElement>(null);
  const fileSuratInputRef = useRef<HTMLInputElement>(null);
  const fileLampInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<PersuratanRecord>>({
    jenisSurat: 'MASUK',
    nomorSurat: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    perihal: '',
    lampiran: '-',
    tujuan: '',
    dari: '',
    isiRingkas: '',
    sifatSurat: 'Biasa',
    prioritas: 'BIASA',
    isParaf: true,
    status: 'DRAFT',
    statusBaca: 'BELUM',
    statusProses: 'BELUM',
    kategoriAsal: 'SETJEN',
    tanggalMulai: '',
    tanggalAkhir: '',
    lokasi: '',
    ttdNip: '',
    pemeriksaNip: ''
  });

  const [disposisiTargetNip, setDisposisiTargetNip] = useState('');
  const [disposisiCatatan, setDisposisiCatatan] = useState('');
  const [disposisiActions, setDisposisiActions] = useState<string[]>([]);
  const DISPOSISI_CHECKS = ['JADWALKAN', 'TINDAK LANJUTI', 'PROSES', 'SIAPKAN BAHAN', 'HADIRI', 'TELITI DAN PENDAPAT', 'MENUGASKAN', 'EDARKAN', 'UNTUK DIKETAHUI', 'UNTUK DIKOREKSI', 'ARSIP', 'LAPORKAN'];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([fetchPegawaiFromSheets(), fetchPersuratanFromSheets()]);
      setPegawaiList(p);
      setPersuratanList(s || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleUploadFile = async (field: 'fileSuratUrl' | 'fileLampiranUrl', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`SRT_${Date.now()}_${file.name}`, file.type, base64);
      if (res.success && res.fileUrl) {
        setFormData(prev => ({ ...prev, [field]: res.fileUrl }));
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.perihal || !formData.tujuan) return alert("Mohon lengkapi Tujuan dan Perihal/Laporan Mengenai.");
    setSyncing(true);
    const pjb = pegawaiList.find(p => p.nip === formData.ttdNip);
    const payload: PersuratanRecord = { 
      ...formData as any, 
      id: formData.id || `SRT-${Date.now()}`,
      status: 'TERBIT',
      pjbNama: pjb?.nama || 'Pejabat',
      pjbNip: formData.ttdNip || '',
      pjbJabatan: pjb?.jabatan || '',
      pengirimNip: user?.nip,
      statusBaca: 'BELUM',
      statusProses: 'BELUM'
    };
    const ok = await syncTableRemote('PERSURATAN', 'SAVE', payload);
    if (ok) {
      logActivity('CREATE', 'Persuratan', `Surat Baru: ${formData.perihal}`);
      await loadData();
      setActiveView('inbox');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleRead = async (record: PersuratanRecord) => {
    setFormData(record);
    setActiveView('preview');
    if (record.tujuan === user?.nip && record.statusBaca === 'BELUM') {
      const updated = { ...record, statusBaca: 'SUDAH' };
      await syncTableRemote('PERSURATAN', 'SAVE', updated);
      setPersuratanList(prev => prev.map(p => p.id === record.id ? (updated as any) : p));
    }
  };

  const handleTandaiProses = async () => {
    if (!formData.id) return;
    setSyncing(true);
    const updated: Partial<PersuratanRecord> = { ...formData, statusProses: 'SUDAH' };
    const ok = await syncTableRemote('PERSURATAN', 'SAVE', updated);
    if (ok) {
      setFormData(updated);
      await loadData();
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDisposisi = async () => {
    if (!disposisiTargetNip) return alert("Pilih tujuan disposisi");
    setSyncing(true);
    const newHistoryItem = {
      from: user?.name, fromNip: user?.nip, toNip: disposisiTargetNip,
      to: pegawaiList.find(p => p.nip === disposisiTargetNip)?.nama || 'Pegawai',
      date: new Date().toLocaleString('id-ID'),
      catatan: disposisiCatatan, instruksi: disposisiActions.join(', ')
    };
    const currentHistory = formData.riwayatDisposisi ? JSON.parse(formData.riwayatDisposisi) : [];
    const updatedHistory = [...currentHistory, newHistoryItem];
    const payload: PersuratanRecord = {
      ...formData as any, tujuan: disposisiTargetNip, pengirimNip: user?.nip,
      statusBaca: 'BELUM', statusProses: 'BELUM', riwayatDisposisi: JSON.stringify(updatedHistory),
      catatanDisposisi: disposisiCatatan
    };
    const ok = await syncTableRemote('PERSURATAN', 'SAVE', payload);
    if (ok) {
      logActivity('UPDATE', 'Persuratan', `Disposisi surat ke ${disposisiTargetNip}`);
      await loadData();
      setFormData(payload);
      setDisposisiCatatan(''); setDisposisiActions([]); setDisposisiTargetNip('');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const filteredList = useMemo(() => {
    let list = persuratanList;
    if (activeView === 'inbox') list = list.filter(s => s.tujuan === user?.nip || isSuperadmin);
    else if (activeView === 'outbox') list = list.filter(s => s.pengirimNip === user?.nip);
    if (activeKategori !== 'SEMUA') list = list.filter(s => s.kategoriAsal === activeKategori);
    if (quickFilter === 'BELUM_BACA') list = list.filter(s => s.statusBaca === 'BELUM');
    else if (quickFilter === 'BELUM_PROSES') list = list.filter(s => s.statusProses === 'BELUM');
    else if (quickFilter === 'ATENSI') list = list.filter(s => s.prioritas === 'SANGAT_SEGERA');
    return list;
  }, [persuratanList, activeView, activeKategori, quickFilter, user, isSuperadmin]);

  const stats = useMemo(() => ({
    all: persuratanList.length,
    unread: persuratanList.filter(s => s.statusBaca === 'BELUM').length,
    unprocessed: persuratanList.filter(s => s.statusProses === 'BELUM').length,
  }), [persuratanList]);

  const parsedHistory = useMemo(() => {
    try { return formData.riwayatDisposisi ? JSON.parse(formData.riwayatDisposisi) : []; } catch(e) { return []; }
  }, [formData.riwayatDisposisi]);

  const editorLabelClass = "text-[11px] font-bold text-gray-700 w-32 text-right shrink-0";
  const editorInputClass = "flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded text-[11px] font-medium outline-none focus:border-blue-400 transition-all shadow-sm";

  const FileTypeBadges = () => (
    <div className="flex gap-1 ml-2">
       <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[7px] font-bold rounded">.XLS</span>
       <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[7px] font-bold rounded">.PDF</span>
       <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[7px] font-bold rounded">.DOC</span>
       <span className="px-1.5 py-0.5 bg-orange-400 text-white text-[7px] font-bold rounded">.PPT</span>
       <span className="px-1.5 py-0.5 bg-gray-500 text-white text-[7px] font-bold rounded">.ZIP</span>
       <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[7px] font-bold rounded">.RAR</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-24 text-black font-['Inter']">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
        if (!itemToDelete) return;
        setSyncing(true);
        await syncTableRemote('PERSURATAN', 'DELETE', { 
          id: itemToDelete.id,
          nama: itemToDelete.perihal
        });
        await loadData();
        setIsConfirmOpen(false);
        setSyncing(false);
      }} />

      {/* INBOX/OUTBOX HEADER */}
      {(activeView === 'inbox' || activeView === 'outbox') && (
        <>
          <div className="flex items-end bg-[#0f172a] h-14 rounded-t-3xl overflow-hidden px-4 gap-1 no-print">
             {[{id: 'SEMUA', label: 'Semua Surat'}, {id: 'SETJEN', label: 'Setjen'}, {id: 'DITJEN', label: 'Ditjen/Badan'}, {id: 'KANWIL', label: 'Kanwil'}, {id: 'UPT', label: 'UPT'}].map(t => (
               <button key={t.id} onClick={() => setActiveKategori(t.id as any)} className={`px-8 py-3.5 text-[11px] font-black tracking-tight rounded-t-2xl transition-all relative ${activeKategori === t.id ? 'bg-white text-gray-900' : 'text-slate-400 hover:text-white'}`}>{t.label}{activeKategori === t.id && <div className="absolute -bottom-1 left-0 right-0 h-2 bg-white"></div>}</button>
             ))}
          </div>

          <div className="bg-white p-4 flex flex-wrap items-center gap-4 shadow-sm border-x border-b border-gray-100 no-print">
             <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                <button onClick={() => setQuickFilter('SEMUA')} className={`px-4 py-2 rounded-lg text-[9px] font-black flex items-center gap-2 transition-all ${quickFilter==='SEMUA'?'bg-white text-gray-950 shadow-sm':'text-gray-400'}`}>Semua <span className="bg-gray-300 text-[8px] px-1.5 rounded">{stats.all}</span></button>
                <button className="px-4 py-2 text-[9px] font-black text-gray-400 flex items-center gap-2 hover:bg-white rounded-lg transition-all"><i className="bi bi-list-task"></i> Sifat Surat</button>
             </div>
             <div className="h-6 w-[2px] bg-gray-200"></div>
             <div className="flex gap-2">
                <button onClick={() => setQuickFilter('ATENSI')} className={`px-4 py-2 rounded-lg text-[9px] font-black border transition-all ${quickFilter==='ATENSI'?'bg-rose-50 text-rose-600 border-rose-200':'border-gray-100 text-gray-400'}`}>Atensi Khusus</button>
                <button onClick={() => setQuickFilter('BELUM_BACA')} className={`px-4 py-2 rounded-lg text-[9px] font-black border transition-all ${quickFilter==='BELUM_BACA'?'bg-emerald-50 text-emerald-600 border-emerald-200':'border-gray-100 text-gray-400'}`}>Belum Dibaca <span className={`ml-1 text-[8px] px-1.5 rounded ${quickFilter==='BELUM_BACA'?'bg-emerald-600 text-white':'bg-emerald-100 text-emerald-700'}`}>{stats.unread}</span></button>
                <button onClick={() => setQuickFilter('BELUM_PROSES')} className={`px-4 py-2 rounded-lg text-[9px] font-black border transition-all ${quickFilter==='BELUM_PROSES'?'bg-indigo-50 text-indigo-600 border-indigo-200':'border-gray-100 text-gray-400'}`}>Belum Diproses <span className={`ml-1 text-[8px] px-1.5 rounded ${quickFilter==='BELUM_PROSES'?'bg-indigo-600 text-white':'bg-indigo-100 text-indigo-700'}`}>{stats.unprocessed}</span></button>
             </div>
             <div className="ml-auto flex gap-2">
               {canEdit && <button onClick={() => { setFormData({ jenisSurat: 'MASUK', prioritas: 'BIASA', status: 'DRAFT', isParaf: true, tanggalSurat: new Date().toISOString().split('T')[0] }); setActiveView('editor'); }} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black shadow-lg active:scale-95">+ Input Surat</button>}
             </div>
          </div>
          
          {/* INBOX TABLE */}
          <div className="bg-white shadow-sm overflow-hidden border border-gray-100">
             <table className="w-full text-left">
                <thead className="bg-[#2d3436] text-[10px] font-black text-white tracking-wider">
                   <tr>
                      <th className="px-6 py-4 w-12 text-center"></th>
                      <th className="px-6 py-4">Asal Surat</th>
                      <th className="px-4 py-4">Tanggal</th>
                      <th className="px-4 py-4">Pengirim</th>
                      <th className="px-4 py-4">Perihal</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-6 py-4 text-center">Aksi</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-[#fdfdfd]">
                   {filteredList.map((s) => (
                     <tr key={s.id} className="hover:bg-blue-50/20 group transition-all">
                        <td className="px-6 py-5 text-center"><i className="bi bi-star text-gray-300 hover:text-amber-400 cursor-pointer"></i></td>
                        <td className="px-6 py-5">
                           <p className="text-[11px] font-black text-[#2d3436] leading-tight">{s.dari || 'INTERNAL'}</p>
                           <p className="text-[9px] font-bold text-gray-400 mt-1">SUMBER...</p>
                        </td>
                        <td className="px-4 py-5"><p className="text-[10px] font-black text-gray-800">{new Date(s.tanggalSurat).toLocaleDateString('id-ID', {day: '2-digit', month: 'long'})}</p></td>
                        <td className="px-4 py-5"><p className="text-[10px] font-black text-gray-800">{pegawaiList.find(p=>p.nip===s.pengirimNip)?.nama?.split(' ')[0] || 'ADMIN'}</p></td>
                        <td className="px-4 py-5"><p className="text-[11px] font-black text-[#2d3436] line-clamp-1">{s.perihal}</p></td>
                        <td className="px-4 py-5">
                           <div className="flex flex-col gap-1">
                              <span className={`px-2 py-0.5 rounded text-[7px] font-black text-white w-fit ${s.prioritas === 'SANGAT_SEGERA' ? 'bg-rose-600' : 'bg-blue-600'}`}>{s.prioritas || 'BIASA'}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[7px] font-black w-fit ${s.statusBaca === 'SUDAH' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>{s.statusBaca === 'SUDAH' ? 'sudah dibaca' : 'belum dibaca'}</span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-right"><button onClick={() => handleRead(s)} className="text-rose-600 text-[10px] font-black flex items-center gap-1 hover:underline"><i className="bi bi-box-arrow-up-right"></i> Lihat</button></td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </>
      )}

      {/* EDITOR FORM (SESUAI SCREENSHOT) */}
      {activeView === 'editor' && (
        <div className="bg-[#b4c3d2] rounded shadow-2xl overflow-hidden animate-fadeIn border border-gray-400" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
           <div className="bg-[#212529] px-4 py-2 flex justify-between items-center text-white">
              <h4 className="text-[13px] font-black tracking-tight">{formData.jenisSurat === 'MASUK' ? 'Distribusi Surat' : formData.jenisSurat === 'KELUAR' ? 'Surat Keluar' : 'Laporan'}</h4>
              <button onClick={()=>setActiveView('inbox')} className="text-white hover:bg-white/10 w-6 h-6 flex items-center justify-center rounded"><i className="bi bi-x-lg text-sm"></i></button>
           </div>
           
           <div className="p-6 space-y-4">
              {/* Jenis Surat Selector */}
              <div className="flex items-center gap-4 pb-2 border-b border-gray-400/30">
                 <span className={editorLabelClass}>Jenis Surat</span>
                 <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" checked={formData.jenisSurat === 'MASUK'} onChange={()=>setFormData({...formData, jenisSurat: 'MASUK', dari: ''})} className="w-4 h-4 accent-blue-600" />
                       <span className="text-[11px] font-bold text-gray-800">Distribusi Surat Masuk</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" checked={formData.jenisSurat === 'KELUAR'} onChange={()=>setFormData({...formData, jenisSurat: 'KELUAR', dari: ''})} className="w-4 h-4 accent-blue-600" />
                       <span className="text-[11px] font-bold text-gray-800">Distribusi Surat Keluar</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="radio" checked={formData.jenisSurat === 'LAPORAN'} onChange={()=>setFormData({...formData, jenisSurat: 'LAPORAN', dari: user?.name})} className="w-4 h-4 accent-blue-600" />
                       <span className="text-[11px] font-bold text-gray-800">Distribusi Laporan</span>
                    </label>
                 </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8">
                 {/* Main Content Area */}
                 <div className="flex-1 space-y-3">
                    
                    {formData.jenisSurat !== 'LAPORAN' && (
                       <div className="flex items-center gap-4">
                          <span className={editorLabelClass}>Nomor Surat</span>
                          <input type="text" className={editorInputClass} value={formData.nomorSurat} onChange={e=>setFormData({...formData, nomorSurat: e.target.value})} />
                       </div>
                    )}

                    {formData.jenisSurat === 'MASUK' && (
                       <div className="flex items-center gap-4">
                          <span className={editorLabelClass}>Surat Dari</span>
                          <input type="text" className={editorInputClass} value={formData.dari} onChange={e=>setFormData({...formData, dari: e.target.value})} />
                       </div>
                    )}

                    {formData.jenisSurat === 'KELUAR' && (
                       <div className="flex items-center gap-4">
                          <span className={editorLabelClass}>Akan Di TTD Oleh</span>
                          <div className="flex-1"><SearchableSelect options={pegawaiList.map(p=>({value:p.nip, label:p.nama, subLabel:p.jabatan}))} value={formData.ttdNip || ''} onChange={v=>setFormData({...formData, ttdNip: v})} /></div>
                       </div>
                    )}

                    <div className="flex items-center gap-4">
                       <span className={editorLabelClass}>{formData.jenisSurat === 'LAPORAN' ? 'Disampaikan Kepada' : 'Ditujukan Kepada'}</span>
                       <div className="flex-1"><SearchableSelect options={pegawaiList.map(p=>({value:p.nip, label:p.nama, subLabel:p.jabatan}))} value={formData.tujuan || ''} onChange={v=>setFormData({...formData, tujuan: v})} placeholder="Pilih Tujuan..." /></div>
                    </div>

                    {formData.jenisSurat === 'KELUAR' && (
                       <div className="flex items-center gap-4">
                          <span className={editorLabelClass}>Akan Diperiksa / Diparaf Oleh</span>
                          <div className="flex-1"><SearchableSelect options={pegawaiList.map(p=>({value:p.nip, label:p.nama, subLabel:p.jabatan}))} value={formData.pemeriksaNip || ''} onChange={v=>setFormData({...formData, pemeriksaNip: v})} /></div>
                       </div>
                    )}

                    {formData.jenisSurat !== 'LAPORAN' && (
                       <>
                          <div className="flex items-center gap-4">
                             <span className={editorLabelClass}>Tanggal Surat</span>
                             <div className="flex-1 flex gap-4">
                                <input type="date" className={`${editorInputClass} w-40`} value={formData.tanggalSurat} onChange={e=>setFormData({...formData, tanggalSurat: e.target.value})} />
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className={editorLabelClass}>Sifat Surat</span>
                             <select className={`${editorInputClass} w-40`} value={formData.prioritas} onChange={e=>setFormData({...formData, prioritas: e.target.value as any})}>
                                <option value="BIASA">Biasa</option>
                                <option value="SEGERA">Segera</option>
                                <option value="SANGAT_SEGERA">Sangat Segera</option>
                             </select>
                          </div>
                       </>
                    )}

                    <div className="flex items-center gap-4">
                       <span className={editorLabelClass}>{formData.jenisSurat === 'LAPORAN' ? 'Laporan Mengenai' : 'Perihal'}</span>
                       <input type="text" className={editorInputClass} value={formData.perihal} onChange={e=>setFormData({...formData, perihal: e.target.value})} />
                    </div>

                    <div className="flex flex-col gap-1">
                       <div className="flex items-center gap-4">
                          <span className={editorLabelClass}>Catatan</span>
                          <textarea rows={6} className={`${editorInputClass} h-24 normal-case`} value={formData.isiRingkas} onChange={e=>setFormData({...formData, isiRingkas: e.target.value})} />
                       </div>
                    </div>

                    {/* File Upload Row */}
                    <div className="flex items-center gap-4">
                       <span className={editorLabelClass}>{formData.jenisSurat === 'LAPORAN' ? 'File Laporan' : 'File Surat'}</span>
                       <div className="flex-1 flex items-center bg-white border border-gray-300 rounded shadow-sm overflow-hidden h-9">
                          <input readOnly type="text" className="flex-1 px-3 text-[10px] border-none outline-none italic" value={formData.fileSuratUrl ? 'Berhasil Terunggah' : 'Belum ada file'} />
                          <button onClick={()=>fileSuratInputRef.current?.click()} className="px-3 bg-gray-200 text-[10px] font-bold border-l hover:bg-gray-300 h-full">Pilih file</button>
                          <input type="file" ref={fileSuratInputRef} className="hidden" onChange={e=>handleUploadFile('fileSuratUrl', e)} />
                       </div>
                       <FileTypeBadges />
                       <span className="text-[7px] font-bold text-gray-500 ml-2">*Maks File 15 MB</span>
                    </div>

                    {formData.jenisSurat !== 'LAPORAN' && (
                       <div className="flex items-center gap-4">
                          <span className={editorLabelClass}>File Lampiran</span>
                          <div className="flex-1 flex items-center bg-white border border-gray-300 rounded shadow-sm overflow-hidden h-9">
                             <input readOnly type="text" className="flex-1 px-3 text-[10px] border-none outline-none italic" value={formData.fileLampiranUrl ? 'Lampiran OK' : 'Belum ada file'} />
                             <button onClick={()=>fileLampInputRef.current?.click()} className="px-3 bg-gray-200 text-[10px] font-bold border-l hover:bg-gray-300 h-full">Pilih file</button>
                             <input type="file" ref={fileLampInputRef} className="hidden" onChange={e=>handleUploadFile('fileLampiranUrl', e)} />
                          </div>
                          <FileTypeBadges />
                          <span className="text-[7px] font-bold text-gray-500 ml-2">*Maks File 25 MB</span>
                       </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                       <div className={editorLabelClass}></div>
                       <label className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 transition-all">
                          <input type="checkbox" checked={formData.isParaf} onChange={e=>setFormData({...formData, isParaf: e.target.checked})} className="w-3 h-3 accent-blue-600" />
                          <i className="bi bi-pencil-square text-blue-600"></i>
                          <span className="text-[10px] font-bold">Paraf</span>
                       </label>
                    </div>
                 </div>

                 {/* Side Right Panel: Diisi jika perlu ada kegiatan */}
                 {formData.jenisSurat !== 'LAPORAN' && (
                    <div className="w-full lg:w-72 space-y-3">
                       <div className="bg-white/40 p-4 border border-gray-400 rounded">
                          <p className="text-[9px] font-black text-gray-600 mb-3 text-center border-b border-gray-400/30 pb-2">Diisi Jika perlu ada kegiatan:</p>
                          <div className="space-y-3">
                             <div>
                                <label className="text-[9px] font-bold text-gray-500 ml-1">Tanggal Mulai</label>
                                <input type="datetime-local" className={editorInputClass} value={formData.tanggalMulai} onChange={e=>setFormData({...formData, tanggalMulai: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-[9px] font-bold text-gray-500 ml-1">Tanggal Akhir</label>
                                <input type="datetime-local" className={editorInputClass} value={formData.tanggalAkhir} onChange={e=>setFormData({...formData, tanggalAkhir: e.target.value})} />
                             </div>
                             <div>
                                <label className="text-[9px] font-bold text-gray-500 ml-1">Lokasi</label>
                                <textarea rows={2} className={`${editorInputClass} resize-none h-14`} placeholder="exp: Lokasi" value={formData.lokasi} onChange={e=>setFormData({...formData, lokasi: e.target.value})} />
                             </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>

           {/* Footer Action */}
           <div className="bg-[#b4c3d2] p-6 border-t border-gray-400/30 flex justify-center gap-4">
              <button onClick={()=>setActiveView('inbox')} className="px-10 py-2.5 bg-white border border-gray-400 text-gray-600 rounded text-[11px] font-black shadow-sm">Batalkan</button>
              <button onClick={handleSave} disabled={syncing || uploading} className="px-16 py-2.5 bg-blue-700 text-white rounded text-[11px] font-black shadow-lg active:scale-95 transition-all flex items-center gap-3">
                {syncing ? <div className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-send-fill"></i>}
                Paraf / Kirim Surat
              </button>
           </div>
        </div>
      )}

      {/* PREVIEW VIEW (SESUAI SMART HUB STYLE) */}
      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-4 font-['Arial']">
           <div className="bg-[#2d3436] p-2 flex items-center justify-between no-print rounded">
              <div className="flex gap-2">
                 <button onClick={() => setActiveView('inbox')} className="px-4 py-1.5 bg-white border border-gray-300 text-gray-900 rounded text-[10px] font-bold flex items-center gap-2 shadow-sm"><i className="bi bi-chevron-left"></i> Back</button>
                 <button onClick={() => window.print()} className="px-4 py-1.5 bg-white border border-gray-300 text-gray-900 rounded text-[10px] font-bold flex items-center gap-2 shadow-sm"><i className="bi bi-printer"></i> Cetak</button>
                 <span className="ml-4 text-white text-[11px] font-bold py-1.5">SURAT SUDAH DITANDA TANGANI</span>
              </div>
              <div className="bg-rose-600 text-white px-6 py-1.5 rounded text-[10px] font-black shadow-lg">Surat/Memo belum anda tindak lanjuti</div>
           </div>

           <div className="bg-white border shadow-sm p-8 space-y-8">
              <div className="flex items-center gap-4 border-b pb-6">
                 <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-2xl shadow-inner"><i className="bi bi-person-fill"></i></div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-900">{formData.pjbNama} , <span className="text-gray-400 font-normal">30 Januari 2026, 11:09:08</span></h4>
                    <p className="text-[10px] text-gray-400">Kepada: <span className="text-blue-600 font-bold">{pegawaiList.find(p=>p.nip===formData.tujuan)?.nama || formData.tujuan}</span></p>
                 </div>
              </div>

              <div className="border border-gray-200">
                 {[
                   {k: 'Surat Kepada', v: pegawaiList.find(p=>p.nip===formData.tujuan)?.jabatan || formData.tujuan},
                   {k: 'Tanggal Surat', v: formData.tanggalSurat},
                   {k: 'Sifat', v: formData.prioritas?.replace(/_/g, ' ') || 'BIASA'},
                   {k: 'Perihal', v: formData.perihal},
                   {k: 'Ringkasan Surat', v: formData.perihal}
                 ].map((row, i) => (
                   <div key={i} className="grid grid-cols-12 border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <div className="col-span-2 p-3 bg-gray-50/50 text-[11px] font-bold text-gray-700 border-r">{row.k}</div>
                      <div className="col-span-10 p-3 text-[11px] text-gray-600">{row.v}</div>
                   </div>
                 ))}
              </div>

              <div className="space-y-3">
                 <div className="bg-gray-50 p-2 border-b-2 border-gray-200 text-[10px] font-bold text-gray-600">CATATAN / DISPOSISI :</div>
                 <div className="p-4 bg-white text-[11px] text-gray-800 leading-relaxed italic">{formData.isiRingkas || 'Belum ada catatan disposisi spesifik.'}</div>
              </div>

              <div className="flex gap-2 no-print">
                 <button onClick={() => formData.fileSuratUrl && window.open(formData.fileSuratUrl)} className="px-5 py-2.5 bg-white border border-rose-300 text-rose-700 rounded text-[11px] font-bold flex items-center gap-3 hover:bg-rose-50 shadow-sm"><i className="bi bi-file-earmark-pdf-fill"></i> File Surat <i className="bi bi-download ml-2 border-l pl-3"></i></button>
                 <button className="px-5 py-2.5 bg-white border border-rose-300 text-rose-700 rounded text-[11px] font-bold flex items-center gap-3 hover:bg-rose-50 shadow-sm"><i className="bi bi-file-earmark-text"></i> File Surat dikoreksi <i className="bi bi-download ml-2 border-l pl-3"></i></button>
              </div>

              <div className="flex justify-end pt-4 no-print">
                 <div className="text-right">
                    <button onClick={handleTandaiProses} disabled={syncing || formData.statusProses==='SUDAH'} className={`px-6 py-2 rounded text-[10px] font-black shadow-lg transition-all ${formData.statusProses==='SUDAH'?'bg-emerald-600 text-white':'bg-[#f39c12] text-white hover:bg-[#e67e22]'}`}>
                      <i className="bi bi-check-all text-lg mr-2"></i> {formData.statusProses==='SUDAH' ? 'Sudah Di Proses' : 'Tandai Sudah Di Proses'}
                    </button>
                    <p className="text-[8px] text-gray-400 mt-2 font-bold italic">* tombol ini digunakan untuk surat yang tidak perlu tindak lanjut</p>
                 </div>
              </div>

              {(formData.tujuan === user?.nip || isSuperadmin) && (
                <div className="mt-10 border-t-2 border-gray-100 pt-10 space-y-6 bg-gray-50/30 p-6 rounded-xl no-print">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-gray-900 rounded-full flex items-center justify-center text-white"><i className="bi bi-person-fill"></i></div>
                      <div className="flex-1">
                         <SearchableSelect options={pegawaiList.map(p=>({value:p.nip, label:p.nama, subLabel:p.jabatan}))} value={disposisiTargetNip} onChange={setDisposisiTargetNip} placeholder="Kirim Surat/Disposisi Ke:" />
                      </div>
                   </div>
                   <div className="grid grid-cols-12 gap-8 border rounded p-6 bg-white shadow-sm">
                      <div className="col-span-5 grid grid-cols-2 gap-x-6 gap-y-2">
                         {DISPOSISI_CHECKS.map(chk => (
                           <label key={chk} className="flex items-center gap-3 cursor-pointer group">
                              <input type="checkbox" checked={disposisiActions.includes(chk)} onChange={e => e.target.checked ? setDisposisiActions([...disposisiActions, chk]) : setDisposisiActions(disposisiActions.filter(a=>a!==chk))} className="w-4 h-4 accent-red-600" />
                              <span className="text-[10px] font-bold text-gray-600 group-hover:text-red-600">{chk}</span>
                           </label>
                         ))}
                      </div>
                      <div className="col-span-7 flex flex-col h-full border-l pl-8">
                         <span className="text-[10px] font-bold text-gray-400 mb-2">Disposisi / Catatan:</span>
                         <textarea rows={6} value={disposisiCatatan} onChange={e=>setDisposisiCatatan(e.target.value)} className="w-full flex-1 p-4 bg-gray-50 border rounded text-[11px] font-bold normal-case focus:bg-white focus:border-red-600 outline-none" />
                      </div>
                   </div>
                   <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-6">
                        <span className="text-[10px] font-bold text-gray-700">Surat Perlu Dikoreksi</span>
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 text-[10px] font-bold"><input type="radio" name="kor" className="w-3 h-3" /> Ya</label>
                           <label className="flex items-center gap-2 text-[10px] font-bold"><input type="radio" name="kor" defaultChecked className="w-3 h-3" /> Tidak</label>
                        </div>
                      </div>
                      <button onClick={handleDisposisi} disabled={syncing || !disposisiTargetNip} className="px-10 py-3 bg-rose-700 text-white rounded font-black text-[11px] shadow-xl hover:bg-rose-800 transition-all flex items-center gap-2 active:scale-95">
                         <i className="bi bi-send-check"></i> Paraf/Kirim
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default PersuratanPage;
