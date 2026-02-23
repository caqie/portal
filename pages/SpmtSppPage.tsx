
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchSPMTSPPFromSheets } from '../spreadsheetService';
import { Pegawai, SpmtSppRecord } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

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
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<SpmtSppRecord>>({
    type: 'SPP',
    nomor: 'HKI.1-KP.03.04-',
    pejabatNip: '197410061998031002',
    pegawaiNip: '',
    nomorSK: '',
    tentangSK: '',
    tanggalSK: '',
    jabatanBaru: '',
    unitKerja: UNIT_KERJA[0],
    tanggalLantikAtauSpmt: '',
    tanggalSppAtauSpmt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
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
    const newRecord: SpmtSppRecord = { ...formData as SpmtSppRecord, id: `TND-${Date.now()}` };
    const ok = await syncTableRemote('SPMT_SPP', 'SAVE', newRecord);
    if (ok) {
      logActivity('CREATE', 'TND', `Buat ${formData.type}: ${formData.nomor}`);
      setSelectedRecord(newRecord);
      setActiveView('preview');
      setShowSuccess(true);
      await loadInitialData();
    }
    setSyncing(false);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`${formData.type}_${formData.pegawaiNip}.pdf`);
    setSyncing(false);
  };

  const activeDoc = selectedRecord || formData;
  const pjb = pegawaiList.find(p => p.nip === activeDoc.pejabatNip);
  const peg = pegawaiList.find(p => p.nip === activeDoc.pegawaiNip);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
           </button>
           <h3 className="text-2xl font-black text-gray-900 uppercase">Generator SPMT & SPP</h3>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip TND</button>
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
                 {history.map(h => (
                   <tr key={h.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-10 py-5">
                         <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase border ${h.type==='SPP'?'bg-amber-50 text-amber-600':'bg-blue-50 text-blue-600'}`}>{h.type}</span>
                         <p className="text-[11px] font-black text-gray-950 mt-1 uppercase">{h.nomor}</p>
                      </td>
                      <td className="px-4 py-5">
                         <p className="text-[11px] font-black uppercase">{pegawaiList.find(p=>p.nip===h.pegawaiNip)?.nama || 'ASN'}</p>
                         <p className="text-[9px] font-mono text-gray-400">NIP. {h.pegawaiNip}</p>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-[10px] text-emerald-600 tracking-widest">VERIFIED</td>
                      <td className="px-10 py-5 text-right"><button onClick={() => { setSelectedRecord(h); setActiveView('preview'); }} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all shadow-lg">Lihat F4</button></td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full">
              <button onClick={() => setFormData({...formData, type: 'SPP'})} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.type==='SPP'?'bg-white text-gray-950 shadow-md':'text-gray-400'}`}>Pelantikan (SPP)</button>
              <button onClick={() => setFormData({...formData, type: 'SPMT'})} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.type==='SPMT'?'bg-white text-gray-950 shadow-md':'text-gray-400'}`}>Laksana Tugas (SPMT)</button>
           </div>
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">Data Pejabat & Nomor</h5>
                 <SearchableSelect label="Pejabat Penandatangan" options={searchableOptions} value={formData.pejabatNip || ''} onChange={v=>setFormData({...formData, pejabatNip: v})} />
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Dokumen</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nomor || ''} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></div>
              </div>
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">Data Pegawai & SK</h5>
                 <SearchableSelect label="Pegawai Bersangkutan" options={searchableOptions} value={formData.pegawaiNip || ''} onChange={handlePegawaiSelect} />
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK Menteri</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nomorSK || ''} onChange={e=>setFormData({...formData, nomorSK: e.target.value})} /></div>
              </div>
           </div>
           <div className="pt-10 border-t flex justify-center"><button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Generate & Pratinjau F4</button></div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Data</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-300 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2.2cm] font-arial text-black" style={{ width: '210mm', minHeight: '330mm' }}>
                 <div className="flex flex-col items-center border-b-[3pt] border-black pb-4 mb-10">
                    <p className="text-[14pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM</p>
                    <p className="text-[14pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                    <div className="h-1.5 bg-black w-full my-1.5"></div>
                    <p className="text-[9pt] font-normal leading-tight">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                 </div>
                 <div className="text-center mb-10">
                    <h1 className="text-[14pt] font-bold uppercase underline leading-tight">{activeDoc.type === 'SPP' ? 'SURAT PERNYATAAN PELANTIKAN' : 'SURAT PERNYATAAN MELAKSANAKAN TUGAS'}</h1>
                    <p className="text-[11.5pt] font-bold mt-1">NOMOR : {activeDoc.nomor}</p>
                 </div>
                 <div className="text-[11.5pt] space-y-6 text-justify leading-[1.8]">
                    <p>Yang bertanda tangan di bawah ini:</p>
                    <div className="grid grid-cols-[180px_10px_1fr] ml-10"><span>Nama</span><span>:</span><span className="font-bold uppercase">{pjb?.nama || '-'}</span><span>NIP</span><span>:</span><span>{pjb?.nip || '-'}</span><span>Jabatan</span><span>:</span><span className="uppercase">{pjb?.jabatan || '-'}</span></div>
                    <p>menyatakan dengan sesungguhnya, bahwa yang tersebut di bawah ini:</p>
                    <div className="grid grid-cols-[180px_10px_1fr] ml-10"><span>Nama</span><span>:</span><span className="font-bold uppercase underline">{peg?.nama || '-'}</span><span>NIP</span><span>:</span><span>{peg?.nip || '-'}</span><span>Jabatan Baru</span><span>:</span><span className="uppercase">{activeDoc.jabatanBaru || '-'}</span><span>Unit Kerja</span><span>:</span><span className="uppercase">{activeDoc.unitKerja || '-'}</span></div>
                    <p>Berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor <span className="font-bold">{activeDoc.nomorSK}</span>, telah {activeDoc.type==='SPP'?'dilantik':'nyata melaksanakan tugas'} pada tanggal <span className="font-bold">{activeDoc.tanggalLantikAtauSpmt}</span>.</p>
                 </div>
                 <div className="mt-20 ml-[55%] text-center text-[11.5pt] leading-tight">
                    <p>Jakarta, {activeDoc.tanggalSppAtauSpmt}</p>
                    <p className="font-bold uppercase mb-28 mt-2">{activeDoc.signatureLabel},</p>
                    <p className="font-bold uppercase underline leading-none">{pjb?.nama}</p>
                    <p className="mt-1">NIP {pjb?.nip}</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SpmtSppPage;
