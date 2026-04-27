import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchSPMTSPPFromSheets } from '../spreadsheetService';
import { Pegawai, SpmtSppRecord } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

import htmlDocx from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';

const SpmtSppPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [history, setHistory] = useState<SpmtSppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SpmtSppRecord | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SpmtSppRecord | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const defaultMenimbang = "Dalam rangka meningkatkan kinerja Direktorat Hak Cipta dan Desain Industri Direktorat Jenderal Kekayaan Intelektual dengan mengoptimalkan potensi para pegawai, maka dipandang perlu memerintahkan kepada pegawai di bawah ini untuk melaksanakan tugas di posisi yang baru.";
  
  const defaultDasar = `1. Undang-Undang Nomor 20 Tahun 2023 tentang Aparatur Sipil Negara (Lembaran Negara Republik Indonesia Tahun 2023 Nomor 141, Tambahan Lembaran Negara Republik Indonesia Nomor 6897);
2. Peraturan Menteri Hukum Republik Indonesia Nomor 1 Tahun 2024 tentang Organisasi dan Tata Kerja Kementerian Hukum (Berita Negara Republik Indonesia Tahun 2024 Nomor 34).`;

  const [formData, setFormData] = useState<Partial<SpmtSppRecord>>({
    type: 'SPP',
    nomor: 'HKI.1-KP.04.01-45',
    pejabatNip: '197101272000031002', 
    pegawaiNip: '',
    nomorSK: '',
    menimbang: defaultMenimbang,
    dasar: defaultDasar,
    nomorSuratPerintah: '', 
    jabatanBaru: '',
    unitKerja: UNIT_KERJA[0],
    tanggalLantikAtauSpmt: '',
    tanggalSppAtauSpmt: new Date().toISOString().split('T')[0],
    tempatTandaTangan: 'Jakarta',
    signatureLabel: 'SEKRETARIS DIREKTORAT JENDERAL'
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchSPMTSPPFromSheets()]);
      setPegawaiList(pRes);
      setHistory(sRes);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const searchableOptions = useMemo(() => pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}` })), [pegawaiList]);

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) setFormData({ ...formData, pegawaiNip: nip, jabatanBaru: p.jabatan, unitKerja: p.unitKerja });
  };

  const handleSave = async () => {
    if (!formData.pegawaiNip || !formData.nomor) return alert("Nomor dan Pegawai wajib diisi.");
    setSyncing(true);
    const newRecord: SpmtSppRecord = { 
      ...formData as SpmtSppRecord, 
      id: formData.id || `TND-${Date.now()}` 
    };
    const ok = await syncTableRemote('SPMT_SPP', 'SAVE', newRecord);
    if (ok) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'TND', `Buat/Update ${formData.type}: ${formData.nomor}`);
      setSelectedRecord(newRecord);
      setActiveView('preview');
      setShowSuccess(true);
      await loadInitialData();
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    const ok = await syncTableRemote('SPMT_SPP', 'DELETE', { id: itemToDelete.id });
    if (ok) {
      logActivity('DELETE', 'TND', `Hapus Dokumen: ${itemToDelete.id}`);
      await loadInitialData();
      setIsConfirmOpen(false);
    }
    setSyncing(false);
  };

  const handleDownload = async (format: 'pdf' | 'word') => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const fileName = `${formData.type}_${formData.pegawaiNip || 'Dokumen'}`;

    if (format === 'pdf') {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${fileName}.pdf`);
    } else if (format === 'word') {
      if (!pdfRef.current) return;
      
      const content = pdfRef.current.innerHTML;
      // @ts-ignore
      const converted = await htmlDocx.asBlob(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; font-size: 11pt; }
              table { width: 100%; border-collapse: collapse; }
              td { vertical-align: top; }
              .text-center { text-align: center; }
              .text-justify { text-align: justify; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .underline { text-decoration: underline; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `) as Blob;
      saveAs(converted, `${fileName}.docx`);
    }
    setSyncing(false);
  };

  const activeDoc = selectedRecord || formData;
  const pjb = pegawaiList.find(p => p.nip === activeDoc.pejabatNip);
  const peg = pegawaiList.find(p => p.nip === activeDoc.pegawaiNip);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '...';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} loading={syncing} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
           </button>
           <h3 className="text-2xl font-black text-gray-900 uppercase">Generator Dokumen ASN</h3>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip</button>
           <button onClick={() => setActiveView('editor')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Buat Baru</button>
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Jenis & Nomor</th><th className="px-4 py-5">Pegawai</th><th className="px-4 py-5 text-center">Status</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {history.map((h, idx) => (
                   <tr key={h.id || idx} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-10 py-5">
                         <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${h.type==='SPP'?'bg-amber-50 text-amber-600':'bg-blue-50 text-blue-600'}`}>{h.type}</span>
                         <p className="text-[11px] font-black text-gray-950 mt-1 uppercase">{h.nomor}</p>
                      </td>
                      <td className="px-4 py-5">
                         <p className="text-[11px] font-black uppercase">{pegawaiList.find(p=>p.nip===h.pegawaiNip)?.nama || 'ASN'}</p>
                         <p className="text-[9px] font-mono text-gray-400">NIP. {h.pegawaiNip}</p>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-[10px] text-emerald-600 tracking-widest">VERIFIED</td>
                                             <td className="px-10 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => { setSelectedRecord(h); setActiveView('preview'); }} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Lihat</button>
                             {canEdit && (
                               <button onClick={() => { setFormData(h); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl flex items-center justify-center hover:bg-amber-50 shadow-sm transition-all"><i className="bi bi-pencil-fill"></i></button>
                             )}
                             {isSuperadmin && (
                               <button onClick={() => { setItemToDelete(h); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-50 shadow-sm transition-all"><i className="bi bi-trash-fill"></i></button>
                             )}
                          </div>
                       </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-5xl mx-auto bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10 animate-modalEnter">
           {/* PILIHAN TEMPLATE SAAT MEMBUAT */}
           <div className="bg-gray-50 p-2 rounded-2xl border border-gray-200">
              <p className="text-[9px] font-bold text-gray-400 uppercase ml-4 mb-2 tracking-widest">Pilih Jenis Dokumen (Template)</p>
              <div className="flex gap-2">
                  <button onClick={() => setFormData({...formData, type: 'SPP', menimbang: defaultMenimbang, dasar: defaultDasar })} className={`flex-1 py-4 text-[11px] font-black uppercase rounded-xl transition-all ${formData.type==='SPP'?'bg-blue-600 text-white shadow-lg':'bg-white text-gray-500 hover:bg-gray-100'}`}>
                    SURAT PERINTAH (SPP)
                  </button>
                  <button onClick={() => setFormData({...formData, type: 'SPMT', menimbang: '', dasar: '' })} className={`flex-1 py-4 text-[11px] font-black uppercase rounded-xl transition-all ${formData.type==='SPMT'?'bg-blue-600 text-white shadow-lg':'bg-white text-gray-500 hover:bg-gray-100'}`}>
                    SURAT PERNYATAAN (SPMT)
                  </button>
              </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">Data Dokumen</h5>
                 <SearchableSelect label="Pejabat Penandatangan" options={searchableOptions} value={formData.pejabatNip || ''} onChange={v=>setFormData({...formData, pejabatNip: v})} />
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Surat</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nomor || ''} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Surat</label><input type="date" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.tanggalSppAtauSpmt || ''} onChange={e=>setFormData({...formData, tanggalSppAtauSpmt: e.target.value})} /></div>
                 
                 {formData.type === 'SPMT' && (
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-indigo-600 uppercase ml-2">Nomor Surat Perintah (SPP) Referensi</label>
                       <input type="text" className="w-full px-5 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold" placeholder="Contoh: HKI.1-KP.04.01-45" value={formData.nomorSuratPerintah || ''} onChange={e=>setFormData({...formData, nomorSuratPerintah: e.target.value})} />
                    </div>
                 )}
              </div>
              
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">Data Pegawai</h5>
                 <SearchableSelect label="Pegawai Bersangkutan" options={searchableOptions} value={formData.pegawaiNip || ''} onChange={handlePegawaiSelect} />
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jabatan Baru</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.jabatanBaru || ''} onChange={e=>setFormData({...formData, jabatanBaru: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Unit Kerja</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.unitKerja || ''} onChange={e=>setFormData({...formData, unitKerja: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Pelantikan/Mulai Tugas</label><input type="date" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.tanggalLantikAtauSpmt || ''} onChange={e=>setFormData({...formData, tanggalLantikAtauSpmt: e.target.value})} /></div>
              </div>
           </div>

           {formData.type === 'SPP' && (
             <div className="space-y-4 pt-4 border-t">
                <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Isi Surat Perintah</h5>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Menimbang</label>
                   <textarea className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs leading-relaxed h-24" value={formData.menimbang || ''} onChange={e=>setFormData({...formData, menimbang: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Dasar Hukum</label>
                   <textarea className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs leading-relaxed h-32 font-mono" value={formData.dasar || ''} onChange={e=>setFormData({...formData, dasar: e.target.value})} />
                </div>
             </div>
           )}

           <div className="pt-10 border-t flex justify-center"><button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Generate Dokumen</button></div>
        </div>
      )}

     {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl text-[11px] font-black uppercase shadow-sm">Edit Data</button>
              
              <div className="flex rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                 <button onClick={() => handleDownload('pdf')} disabled={syncing} className="px-8 py-4 bg-white text-gray-700 text-[11px] font-black uppercase hover:bg-gray-50 flex items-center gap-2 transition-all border-r border-gray-200">
                    {syncing ? '...' : <i className="bi bi-file-earmark-pdf-fill text-red-600"></i>} PDF
                 </button>
                 <button onClick={() => handleDownload('word')} disabled={syncing} className="px-8 py-4 bg-white text-gray-700 text-[11px] font-black uppercase hover:bg-gray-50 flex items-center gap-2 transition-all">
                    {syncing ? '...' : <i className="bi bi-file-earmark-word-fill text-blue-600"></i>} WORD
                 </button>
              </div>
           </div>
           
           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl font-arial leading-tight text-black" style={{ width: '210mm', minHeight: '297mm', color: '#000000', fontSize: '11pt', padding: '2cm 2cm 2.5cm 3cm' }}>
                 
                  {/* KOP SURAT RESMI */}
                  <div className="flex items-start gap-4 border-b-[0.5pt] border-black pb-2 mb-6 text-black">
                     <img src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" style={{ width: '20.04mm', height: '22.90mm' }} crossOrigin="anonymous" />
                     <div className="flex-1 text-center">
                        <p style={{ fontSize: '12pt' }} className="uppercase leading-tight font-normal">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p style={{ fontSize: '12pt' }} className="font-bold uppercase leading-tight">DIREKTORAT JENERAL KEKAYAAN INTELEKTUAL</p>
                        <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                        <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Call Center: 152</p>
                        <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Laman: www.dgip.go.id. Pos-el: halodjki@dgip.go.id</p>
                      </div>
                   </div>

                 {activeDoc.type === 'SPP' ? (
                   /* --- TEMPLATE 1: SURAT PERINTAH (SPP) --- */
                   <div>
                      <div className="text-center mb-8">
                        <h1 className="text-[12pt] font-bold uppercase underline leading-tight">SURAT PERINTAH</h1>
                        <p className="text-[11.5pt] font-bold mt-1">NOMOR {activeDoc.nomor}</p>
                        <p className="text-[11.5pt] font-bold uppercase mt-2">{activeDoc.signatureLabel}</p>
                      </div>
                      
                      <div className="text-[11.5pt] leading-[1.6]">
                        <p className="font-bold mb-1">Menimbang :</p>
                        <p className="text-justify mb-6 text-justify" style={{ textIndent: '2cm' }}>{activeDoc.menimbang || "..."}</p>
                        
                        <p className="font-bold mb-1">Dasar :</p>
                        <div className="text-justify mb-6 pl-8" style={{ whiteSpace: 'pre-line' }}>
                           {activeDoc.dasar || "..."}
                        </div>

                        <p className="font-bold mb-4">MEMERINTAHKAN:</p>
                        <div className="mb-4">
                           <p className="font-bold mb-2">Kepada :</p>
                           <table className="w-full ml-8">
                              <tbody>
                                 <tr><td className="w-40 py-0.5 align-top">Nama</td><td className="w-2 align-top">:</td><td className="font-bold uppercase align-top">{peg?.nama || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">NIP</td><td className="w-2 align-top">:</td><td className="align-top">{peg?.nip || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">Golongan</td><td className="w-2 align-top">:</td><td className="align-top">{peg?.golongan || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">Jabatan</td><td className="w-2 align-top">:</td><td className="align-top uppercase">{peg?.jabatan || '-'}</td></tr>
                              </tbody>
                           </table>
                        </div>

                        <div className="mb-8">
                           <p className="font-bold mb-2">Untuk :</p>
                           <p className="text-justify ml-8">
                              Melaksanakan Tugas sebagai <span className="font-bold uppercase">{activeDoc.jabatanBaru || peg?.jabatan}</span> pada <span className="font-bold uppercase">{activeDoc.unitKerja}</span> Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum.
                           </p>
                        </div>
                      </div>

                      <div className="mt-20 ml-auto w-[55%] text-center text-[11.5pt] leading-tight">
                        <p>{activeDoc.tempatTandaTangan}, {formatDate(activeDoc.tanggalSppAtauSpmt || '')}</p>
                        <p className="font-bold uppercase mb-24 mt-2">{activeDoc.signatureLabel},</p>
                        <p className="font-bold uppercase underline leading-none">{pjb?.nama}</p>
                      </div>
                   </div>
                 ) : (
                   /* --- TEMPLATE 2: SURAT PERNYATAAN MELAKSANAKAN TUGAS (SPMT) --- */
                   <div>
                      <div className="text-center mb-8">
                        <h1 className="text-[12pt] font-bold uppercase underline leading-tight">SURAT PERNYATAAN MELAKSANAKAN TUGAS</h1>
                        <p className="text-[11.5pt] font-bold mt-1">NOMOR {activeDoc.nomor}</p>
                      </div>

                      <div className="text-[11.5pt] leading-[1.6]">
                        <p className="mb-2">Yang bertanda tangan dibawah ini:</p>
                        <div className="mb-4 ml-8">
                           <table className="w-full">
                              <tbody>
                                 <tr><td className="w-40 py-0.5 align-top">Nama</td><td className="w-2 align-top">:</td><td className="font-bold uppercase align-top">{pjb?.nama || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">NIP</td><td className="w-2 align-top">:</td><td className="align-top">{pjb?.nip || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">Pangkat/Gol.Ruang</td><td className="w-2 align-top">:</td><td className="align-top">{pjb?.pangkat || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">Jabatan</td><td className="w-2 align-top">:</td><td className="align-top uppercase">{pjb?.jabatan || '-'}</td></tr>
                              </tbody>
                           </table>
                        </div>

                        <p className="mb-2">Menyatakan dengan sesungguhnya, bahwa Pegawai Negeri Sipil yang tersebut dibawah ini:</p>
                        <div className="mb-4 ml-8">
                           <table className="w-full">
                              <tbody>
                                 <tr><td className="w-40 py-0.5 align-top">Nama</td><td className="w-2 align-top">:</td><td className="font-bold uppercase align-top">{peg?.nama || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">NIP</td><td className="w-2 align-top">:</td><td className="align-top">{peg?.nip || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">Golongan</td><td className="w-2 align-top">:</td><td className="align-top">{peg?.golongan || '-'}</td></tr>
                                 <tr><td className="w-40 py-0.5 align-top">Jabatan</td><td className="w-2 align-top">:</td><td className="align-top uppercase">{peg?.jabatan || '-'}</td></tr>
                              </tbody>
                           </table>
                        </div>

                        <p className="text-justify mb-4">
                           Berdasarkan Surat Perintah {activeDoc.signatureLabel} Nomor <span className="font-bold">{activeDoc.nomorSuratPerintah || '...'}</span> tanggal {formatDate(activeDoc.tanggalLantikAtauSpmt || '')}, 
                           telah nyata melaksanakan tugas sebagai <span className="font-bold uppercase">{activeDoc.jabatanBaru || peg?.jabatan}</span> terhitung mulai tanggal <span className="font-bold">{formatDate(activeDoc.tanggalLantikAtauSpmt || '')}</span>, pada <span className="font-bold uppercase">{activeDoc.unitKerja}</span> Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum yang bersangkutan diberi tunjangan jabatan sesuai peraturan yang berlaku.
                        </p>
                        
                        <p className="text-justify mb-2">
                           Demikian Surat Pernyataan Melaksanakan Tugas ini saya buat dengan sesungguhnya, dengan mengingat sumpah jabatan dan apabila dikemudian hari isi surat pernyataan ini ternyata tidak benar, yang mengakibatkan kerugian terhadap negara, maka saya bersedia menanggung kerugian tersebut.
                        </p>

                        <p className="italic text-justify mt-6">
                           ASLI Surat Pernyataan Melaksanakan Tugas ini disampaikan kepada Kepala Kantor Pelayanan Perbendaharaan Negara Jakarta V.
                        </p>
                      </div>

                      <div className="mt-16 ml-auto w-[55%] text-center text-[11.5pt] leading-tight">
                        <p>{activeDoc.tempatTandaTangan}, {formatDate(activeDoc.tanggalSppAtauSpmt || '')}</p>
                        <p className="font-bold uppercase mb-24 mt-2">{activeDoc.signatureLabel},</p>
                        <p className="font-bold uppercase underline leading-none">{pjb?.nama}</p>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SpmtSppPage;