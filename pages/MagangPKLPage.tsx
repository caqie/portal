import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchMagangPKLFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, MagangPKL } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, DEFAULT_TEMPLATE_LOGO } from '../constants';
import { LOGO_PENGAYOMAN_URL, LOGO_DJKI_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const MagangPKLPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  
  const [pesertaList, setPesertaList] = useState<MagangPKL[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Tambahkan 'KETERANGAN' ke tipe docType
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [docType, setDocType] = useState<'BALASAN' | 'NOTA' | 'SERTIFIKAT' | 'KETERANGAN'>('BALASAN');
  const [selectedPeserta, setSelectedPeserta] = useState<MagangPKL | null>(null);
  
  const [formData, setFormData] = useState<Partial<MagangPKL>>({
    jenis: 'MAGANG',
    status: 'Proses',
    penempatan: UNIT_KERJA[0]
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MagangPKL | null>(null);

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([fetchPegawaiFromSheets(), fetchMagangPKLFromSheets()]);
      setPegawaiList(p);
      setPesertaList(m || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.institusi) return alert("Mohon lengkapi data peserta.");
    setSyncing(true);
    
    const pjb = pegawaiList.find(p => p.nip === formData.pjbNip);
    const payload: MagangPKL = {
      ...formData as any,
      id: formData.id || `MAG-${Date.now()}`,
      pjbNama: pjb?.nama || formData.pjbNama || '',
      pjbJabatan: pjb?.jabatan || formData.pjbJabatan || ''
    };

    const ok = await syncTableRemote('MAGANG_PKL', 'SAVE', payload);
    if (ok) {
      logActivity('CREATE', 'Magang', `Registrasi Peserta: ${payload.nama}`);
      await loadData();
      setActiveView('list');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleGenerate = (peserta: MagangPKL, type: 'BALASAN' | 'NOTA' | 'SERTIFIKAT' | 'KETERANGAN') => {
    setSelectedPeserta(peserta);
    setDocType(type);
    setActiveView('preview');
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const orientation = docType === 'SERTIFIKAT' ? 'landscape' : 'portrait';
    const format = docType === 'SERTIFIKAT' ? 'a4' : [210, 330];
    
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const pdf = new jsPDF({ orientation, unit: 'mm', format });
    
    const imgWidth = orientation === 'landscape' ? 297 : 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${docType}_${selectedPeserta?.nama.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const filteredData = useMemo(() => {
    return pesertaList.filter(p => 
      (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.institusi || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pesertaList, searchTerm]);

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-900 shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if (!itemToDelete) return;
         setSyncing(true);
         await syncTableRemote('MAGANG_PKL', 'DELETE', { id: itemToDelete.id });
         await loadData();
         setIsConfirmOpen(false);
         setSyncing(false);
      }} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Magang & PKL Hub</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Manajemen Peserta & Generator Dokumen Terpadu</p>
          </div>
        </div>
        <div className="flex gap-3">
          {activeView === 'list' && canEdit && (
            <button onClick={() => { setFormData({ jenis: 'MAGANG', status: 'Proses', penempatan: UNIT_KERJA[0], tanggalMulai: new Date().toISOString().split('T')[0] }); setActiveView('editor'); }} className="px-10 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">
              + Tambah Peserta
            </button>
          )}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input type="text" placeholder="Cari Nama Peserta atau Institusi..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
           </div>

           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr><th className="px-10 py-5">Peserta & Institusi</th><th className="px-4 py-5">Periode</th><th className="px-4 py-5">Penempatan</th><th className="px-4 py-5 text-center">Status</th><th className="px-10 py-5 text-right">Generator Dokumen</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredData.map(p => (
                      <tr key={p.id} className="hover:bg-blue-50/5 group transition-all">
                         <td className="px-10 py-6">
                            <p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p>
                            <p className="text-[9px] font-bold text-blue-600 mt-1 uppercase">{p.institusi} • {p.jenis}</p>
                         </td>
                         <td className="px-4 py-6">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">{p.tanggalMulai} s/d</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase">{p.tanggalSelesai}</p>
                         </td>
                         <td className="px-4 py-6">
                            <p className="text-[9px] font-black text-gray-800 uppercase leading-tight max-w-[200px]">{p.penempatan}</p>
                         </td>
                         <td className="px-4 py-6 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${p.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{p.status}</span>
                         </td>
                         <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2">
                               <button onClick={() => handleGenerate(p, 'BALASAN')} title="Surat Balasan" className="h-9 w-9 bg-white border border-gray-100 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-sm"><i className="bi bi-reply-all-fill"></i></button>
                               <button onClick={() => handleGenerate(p, 'NOTA')} title="Nota Penempatan" className="h-9 w-9 bg-white border border-gray-100 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><i className="bi bi-journal-text"></i></button>
                               <button onClick={() => handleGenerate(p, 'KETERANGAN')} title="Surat Keterangan" className="h-9 w-9 bg-white border border-gray-100 text-teal-600 rounded-xl flex items-center justify-center hover:bg-teal-600 hover:text-white transition-all shadow-sm"><i className="bi bi-file-text-fill"></i></button>
                               <button onClick={() => handleGenerate(p, 'SERTIFIKAT')} title="Sertifikat" className="h-9 w-9 bg-white border border-gray-100 text-amber-600 rounded-xl flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm"><i className="bi bi-award-fill"></i></button>
                               {canEdit && (
                                 <button onClick={() => { setFormData(p); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 text-gray-400 rounded-xl flex items-center justify-center hover:text-gray-900 transition-all shadow-sm"><i className="bi bi-pencil-fill"></i></button>
                               )}
                               {isSuperadmin && (
                                 <button onClick={() => { setItemToDelete(p); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"><i className="bi bi-trash-fill"></i></button>
                               )}
                            </div>
                         </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                       <tr><td colSpan={5} className="py-32 text-center opacity-30"><i className="bi bi-people text-5xl mb-4 block"></i><p className="text-[10px] font-black uppercase tracking-widest">Belum ada data peserta</p></td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10 animate-modalEnter">
           <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">A. Identitas Peserta</h5>
                    <div><label className={labelClass}>Nama Lengkap</label><input type="text" className={inputClass} value={formData.nama || ''} onChange={e=>setFormData({...formData, nama: e.target.value})} required /></div>
                    <div><label className={labelClass}>NIM / NIS / NIK</label><input type="text" className={inputClass} value={formData.nisNim || ''} onChange={e=>setFormData({...formData, nisNim: e.target.value})} required /></div>
                    <div><label className={labelClass}>Asal Institusi / Kampus</label><input type="text" className={inputClass} value={formData.institusi || ''} onChange={e=>setFormData({...formData, institusi: e.target.value})} required /></div>
                    <div><label className={labelClass}>Jurusan / Program Studi</label><input type="text" className={inputClass} value={formData.jurusan || ''} onChange={e=>setFormData({...formData, jurusan: e.target.value})} /></div>
                 </div>
                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest">B. Program & Penempatan</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className={labelClass}>Jenis Program</label><select className={inputClass} value={formData.jenis} onChange={e=>setFormData({...formData, jenis: e.target.value as any})}><option value="MAGANG">MAGANG</option><option value="PKL">PKL (VOKASI)</option></select></div>
                       <div><label className={labelClass}>Status</label><select className={inputClass} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})}><option value="Proses">BERLANGSUNG</option><option value="Selesai">SELESAI</option></select></div>
                    </div>
                    <div><label className={labelClass}>Unit Kerja Penempatan</label><select className={inputClass} value={formData.penempatan} onChange={e=>setFormData({...formData, penempatan: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0,40)}...</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className={labelClass}>Tanggal Mulai</label><input type="date" className={inputClass} value={formData.tanggalMulai} onChange={e=>setFormData({...formData, tanggalMulai: e.target.value})} /></div>
                       <div><label className={labelClass}>Tanggal Selesai</label><input type="date" className={inputClass} value={formData.tanggalSelesai} onChange={e=>setFormData({...formData, tanggalSelesai: e.target.value})} /></div>
                    </div>
                 </div>
              </div>

              <div className="pt-8 border-t space-y-6">
                 <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">C. Referensi Surat & Tanda Tangan</h5>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div><label className={labelClass}>Nomor Surat (Balasan/Sertifikat)</label><input type="text" className={inputClass} value={formData.nomorSurat || ''} onChange={e=>setFormData({...formData, nomorSurat: e.target.value})} /></div>
                    <SearchableSelect label="Pejabat Penandatangan" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: p.jabatan}))} value={formData.pjbNip || ''} onChange={v => setFormData({...formData, pjbNip: v})} />
                 </div>
              </div>

              <div className="pt-10 flex justify-center gap-4">
                 <button type="button" onClick={() => setActiveView('list')} className="px-12 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Batal</button>
                 <button type="submit" disabled={syncing} className="px-24 py-4 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                    {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Data Peserta</span>
                 </button>
              </div>
           </form>
        </div>
      )}

      {activeView === 'preview' && selectedPeserta && (
        <div className="animate-fadeIn space-y-10">
           <div className="bg-[#111827] p-4 flex flex-col md:flex-row justify-between items-center no-print rounded-[2rem] gap-4">
              <div className="flex gap-2 bg-gray-800 p-1 rounded-xl flex-wrap justify-center">
                 <button onClick={() => setDocType('BALASAN')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${docType==='BALASAN'?'bg-white text-gray-900 shadow-lg':'text-gray-400 hover:text-white'}`}>Surat Balasan</button>
                 <button onClick={() => setDocType('NOTA')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${docType==='NOTA'?'bg-white text-gray-900 shadow-lg':'text-gray-400 hover:text-white'}`}>Nota Penempatan</button>
                 <button onClick={() => setDocType('KETERANGAN')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${docType==='KETERANGAN'?'bg-white text-gray-900 shadow-lg':'text-gray-400 hover:text-white'}`}>Surat Keterangan</button>
                 <button onClick={() => setDocType('SERTIFIKAT')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${docType==='SERTIFIKAT'?'bg-white text-gray-900 shadow-lg':'text-gray-400 hover:text-white'}`}>Sertifikat</button>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setActiveView('list')} className="px-6 py-3 bg-white/10 text-white rounded-xl text-[9px] font-black uppercase hover:bg-white/20">Kembali</button>
                 <button onClick={handleDownloadPdf} disabled={syncing} className="px-10 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl flex items-center gap-2 active:scale-95">
                    {syncing ? <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>}
                    Download PDF
                 </button>
              </div>
           </div>

           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar rounded-[3rem]">
              {docType === 'SERTIFIKAT' ? (
                /* TEMPLATE SERTIFIKAT (LANDSCAPE A4) */
                <div ref={pdfRef} className="bg-white shadow-2xl p-[1cm] font-arial text-black relative border-[12pt] border-double border-blue-900" style={{ width: '297mm', minHeight: '210mm' }}>
                   <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                      <img src={LOGO_DJKI_URL} className="w-[150mm]" crossOrigin="anonymous" />
                   </div>
                   <div className="flex flex-col items-center text-center relative z-10">
                      <img src={LOGO_PENGAYOMAN_URL} className="h-20 mb-6" crossOrigin="anonymous" />
                      <h2 className="text-[12pt] font-bold uppercase tracking-[0.3em]">KEMENTERIAN HUKUM REPUBLIK INDONESIA</h2>
                      <h3 className="text-[11pt] font-bold uppercase tracking-[0.2em] mb-10">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</h3>
                      
                      <h1 className="text-[36pt] font-serif font-bold text-blue-900 mb-2 italic">Sertifikat</h1>
                      <p className="text-[14pt] font-bold uppercase tracking-widest mb-10">Nomor: {selectedPeserta.nomorSurat || '... / HKI.1 / 2025'}</p>
                      
                      <p className="text-[14pt] mb-4">Diberikan Kepada :</p>
                      <h4 className="text-[28pt] font-bold uppercase underline mb-4">{selectedPeserta.nama}</h4>
                      <p className="text-[14pt] font-bold text-gray-600 mb-10">({selectedPeserta.institusi})</p>
                      
                      <p className="text-[14pt] max-w-[200mm] leading-relaxed mx-auto">
                         Telah menyelesaikan program <span className="font-bold">{selectedPeserta.jenis}</span> di Direktorat Jenderal Kekayaan Intelektual, penempatan pada <span className="font-bold">{selectedPeserta.penempatan}</span>, terhitung mulai tanggal <span className="font-bold">{selectedPeserta.tanggalMulai}</span> sampai dengan <span className="font-bold">{selectedPeserta.tanggalSelesai}</span> dengan predikat <span className="font-bold">SANGAT BAIK</span>.
                      </p>

                      <div className="mt-16 flex flex-col items-center">
                         <p className="text-[12pt]">Jakarta, {selectedPeserta.tanggalSelesai || '...'}</p>
                         <p className="text-[12pt] font-bold mt-4 mb-20 uppercase">A.n. DIREKTUR JENDERAL KEKAYAAN INTELEKTUAL,</p>
                         <p className="text-[13pt] font-bold uppercase underline leading-none">{selectedPeserta.pjbNama}</p>
                         <p className="text-[11pt] mt-1">NIP {selectedPeserta.pjbNip}</p>
                      </div>
                   </div>
                </div>
              ) : (
                /* TEMPLATE SURAT/NOTA/KETERANGAN (PORTRAIT A4/F4) */
                <div ref={pdfRef} className="bg-white shadow-2xl font-arial leading-tight text-black" style={{ width: '210mm', minHeight: '297mm', color: '#000000', fontSize: '11pt', padding: docType === 'NOTA' ? '2cm 2cm 2.5cm 3cm' : '2cm 2cm 2.5cm 3cm' }}>
                 
                  {/* HEADER LOGIC */}
                  {docType === 'NOTA' ? (
                    /* NOTA DINAS: HEADER SEDERHANA (Tanpa Logo, Alamat, Garis) */
                    <div className="text-center mb-6 pt-4">
                       <p style={{ fontSize: '12pt' }} className="uppercase leading-tight font-normal">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p style={{ fontSize: '12pt' }} className="font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                    </div>
                  ) : (
                    /* BALASAN & KETERANGAN: KOP SURAT LENGKAP (Logo + Alamat + Garis) */
                    <div className="flex items-start gap-4 border-b-[0.5pt] border-black pb-2 mb-6 text-black">
                       <img src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" style={{ width: '20.04mm', height: '22.90mm' }} crossOrigin="anonymous" />
                       <div className="flex-1 text-center">
                          <p style={{ fontSize: '12pt' }} className="uppercase leading-tight font-normal">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                          <p style={{ fontSize: '12pt' }} className="font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                          <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                          <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Call Center: 152</p>
                          <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Laman: www.dgip.go.id. Pos-el: halodjki@dgip.go.id</p>
                        </div>
                     </div>
                  )}

                  {/* BODY LOGIC */}
                  <div className="text-[11pt] space-y-4 text-justify leading-relaxed">
                     {docType === 'BALASAN' && (
                        <>
                           <div className="flex justify-between">
                              <div className="space-y-0.5">
                                 <p>Nomor : {selectedPeserta.nomorSurat || 'HKI.1-UM.01.01-...'}</p>
                                 <p>Lampiran : -</p>
                                 <p>Hal : Persetujuan {selectedPeserta.jenis}</p>
                              </div>
                              <p>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                           </div>
                           
                           <div className="space-y-0.5">
                              <p>Yth. Pimpinan {selectedPeserta.institusi}</p>
                              <p>di Tempat</p>
                           </div>

                           <p>Menindaklanjuti surat permohonan Magang/PKL dari {selectedPeserta.institusi}, dengan ini kami sampaikan bahwa kami <span className="font-bold">MENYETUJUI</span> pelaksanaan {selectedPeserta.jenis} bagi mahasiswa/siswa berikut:</p>
                           
                           <div className="ml-8 grid grid-cols-[160px_10px_1fr] gap-y-1">
                              <span>Nama</span><span>:</span><span className="font-bold uppercase">{selectedPeserta.nama}</span>
                              <span>NIM / NIS</span><span>:</span><span>{selectedPeserta.nisNim}</span>
                              <span>Jurusan</span><span>:</span><span className="uppercase">{selectedPeserta.jurusan}</span>
                              <span>Periode</span><span>:</span><span>{selectedPeserta.tanggalMulai} s/d {selectedPeserta.tanggalSelesai}</span>
                           </div>

                           <p>Peserta akan ditempatkan pada <span className="font-bold">{selectedPeserta.penempatan}</span>. Selama masa pelaksanaan program, peserta wajib mentaati seluruh peraturan yang berlaku di lingkungan Direktorat Jenderal Kekayaan Intelektual.</p>
                           
                           <p>Demikian kami sampaikan, atas perhatiannya diucapkan terima kasih.</p>

                           <div className="mt-14 ml-[55%] text-center leading-tight">
                              <p className="font-bold uppercase mb-24">{selectedPeserta.pjbJabatan},</p>
                              <p className="font-bold uppercase underline leading-none">{selectedPeserta.pjbNama}</p>
                              <p className="mt-1">NIP {selectedPeserta.pjbNip}</p>
                           </div>
                        </>
                     )}

                     {docType === 'NOTA' && (
                        <>
                           <div className="text-center mb-6">
                              <h1 className="text-[12pt] font-bold uppercase">NOTA DINAS</h1>
                              <p className="text-[11pt] font-normal mt-1 uppercase">Nomor: {selectedPeserta.nomorSurat || 'HKI.1-PR.04.01-...'}</p>
                           </div>
                           
                           <div className="grid grid-cols-[80px_10px_1fr] border-b border-black pb-4 mb-6">
                              <span>Yth</span><span>:</span><span className="font-bold uppercase">{selectedPeserta.penempatan}</span>
                              <span>Dari</span><span>:</span><span>Bagian Kepegawaian</span>
                              <span>Hal</span><span>:</span><span className="font-bold">Penempatan Peserta {selectedPeserta.jenis}</span>
                              <span>Tanggal</span><span>:</span><span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                           </div>

                           <p>Bersama ini kami sampaikan data peserta <span className="font-bold">{selectedPeserta.jenis}</span> yang akan melaksanakan praktik kerja pada unit kerja Saudara:</p>
                           
                           <div className="ml-10 grid grid-cols-[140px_10px_1fr] gap-y-1 border p-4 rounded-lg bg-gray-50">
                              <span>Nama</span><span>:</span><span className="font-bold uppercase">{selectedPeserta.nama}</span>
                              <span>NIM / NIS</span><span>:</span><span>{selectedPeserta.nisNim}</span>
                              <span>Institusi</span><span>:</span><span className="uppercase">{selectedPeserta.institusi}</span>
                              <span>Masa Program</span><span>:</span><span>{selectedPeserta.tanggalMulai} s/d {selectedPeserta.tanggalSelesai}</span>
                           </div>

                           <p>Mohon kiranya Saudara dapat memberikan bimbingan teknis serta mengawasi kehadiran peserta tersebut selama masa program berlangsung.</p>
                           <p>Demikian untuk menjadi maklum dan dilaksanakan.</p>

                           <div className="mt-14 ml-[55%] text-center leading-tight">
                              <p className="font-bold uppercase mb-24">KEPALA BAGIAN KEPEGAWAIAN,</p>
                              <p className="font-bold uppercase underline leading-none">{selectedPeserta.pjbNama}</p>
                              <p className="mt-1">NIP {selectedPeserta.pjbNip}</p>
                           </div>
                        </>
                     )}

                     {docType === 'KETERANGAN' && (
                        <>
                           <div className="text-center mb-8">
                              <h2 className="text-[14pt] font-bold uppercase underline mb-2">SURAT KETERANGAN</h2>
                              <p>Nomor: {selectedPeserta.nomorSurat || 'HKI.1-UM.01.01-...'}</p>
                           </div>
                           
                           <p>Yang bertanda tangan di bawah ini Kepala Bagian Kepegawaian Direktorat Jenderal Kekayaan Intelektual, menerangkan dengan sesungguhnya bahwa:</p>
                           
                           <div className="ml-8 grid grid-cols-[160px_10px_1fr] gap-y-1 my-4">
                              <span>Nama</span><span>:</span><span className="font-bold uppercase">{selectedPeserta.nama}</span>
                              <span>NIM / NIS</span><span>:</span><span>{selectedPeserta.nisNim}</span>
                              <span>Institusi</span><span>:</span><span className="uppercase">{selectedPeserta.institusi}</span>
                              <span>Jurusan</span><span>:</span><span className="uppercase">{selectedPeserta.jurusan}</span>
                              <span>Penempatan</span><span>:</span><span className="font-bold uppercase">{selectedPeserta.penempatan}</span>
                              <span>Periode</span><span>:</span><span>{selectedPeserta.tanggalMulai} s/d {selectedPeserta.tanggalSelesai}</span>
                           </div>

                           <p>Adalah benar peserta <span className="font-bold">{selectedPeserta.jenis}</span> yang sedang melaksanakan kegiatan praktik kerja lapangan di lingkungan Direktorat Jenderal Kekayaan Intelektual.</p>
                           
                           <p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>

                           <div className="mt-14 ml-[55%] text-center leading-tight">
                              <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p className="font-bold uppercase mt-4 mb-24">KEPALA BAGIAN KEPEGAWAIAN,</p>
                              <p className="font-bold uppercase underline leading-none">{selectedPeserta.pjbNama}</p>
                              <p className="mt-1">NIP {selectedPeserta.pjbNip}</p>
                           </div>
                        </>
                     )}
                  </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

const FormItem = ({ label, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5">{label}</label>
    {children}
  </div>
);

export default MagangPKLPage;