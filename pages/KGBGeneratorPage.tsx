import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchKGBFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, KGB } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, getGajiEstimasi, normalizeUnitName } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const KGBGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [kgbHistory, setKgbHistory] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KGB | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.04.04-',
    tglSurat: new Date().toISOString().split('T')[0],
    nip: '',
    namaPegawai: '',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    gajiLama: 0,
    gajiBaru: 0,
    tmtLama: '',
    tmtBaru: '',
    masaKerjaTahun: 0,
    golongan: '',
    jabatan: '',
    unitKerja: ''
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([fetchPegawaiFromSheets(), fetchKGBFromSheets()]);
      setPegawaiList(p);
      setKgbHistory(k);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const cleanDate = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return cleanDate;
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    try {
      const d = new Date(cleanDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return '';
  };

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) {
      const mkParts = (p.masaKerja || '0').split(' ');
      const years = parseInt(mkParts[0]) || 0;
      const currentSalary = getGajiEstimasi(p.golRuang, years);
      const nextSalary = getGajiEstimasi(p.golRuang, years + 2);
      setFormData({ 
        ...formData, 
        nip: p.nip, 
        namaPegawai: p.nama, 
        golongan: p.golRuang,
        jabatan: p.jabatan,
        unitKerja: p.unitKerja,
        gajiLama: currentSalary,
        gajiBaru: nextSalary,
        tmtLama: formatDateForInput(p.tmtPangkat || p.tmtCpns),
        tmtBaru: '',
        masaKerjaTahun: years + 2
      });
    }
  };

  const handleEditKgb = (k: KGB) => {
    setFormData({
      ...k,
      tmtLama: formatDateForInput(k.tmtLama),
      tmtBaru: formatDateForInput(k.tmtBaru),
      tglSk: formatDateForInput(k.tglSk),
      tglSurat: formatDateForInput(formData.tglSurat)
    });
    setActiveView('editor');
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.tmtBaru) return alert("Lengkapi data KGB.");
    setSyncing(true);
    const payload = { ...formData, id: formData.id || `KGB-${formData.nip}-${Date.now()}`, status: 'Selesai' };
    const ok = await syncTableRemote('KGB', 'SAVE', payload);
    if (ok) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'KGB', `Simpan KGB: ${formData.namaPegawai}`);
      await loadInitialData();
      setActiveView('preview');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
      pdf.save(`KGB_${formData.namaPegawai.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { alert("Gagal cetak PDF."); } finally { setSyncing(false); }
  };

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[10px] font-black text-gray-600 uppercase ml-3 tracking-widest block mb-1.5";

  const pSubjek = pegawaiList.find(p => p.nip === formData.nip);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if(itemToDelete) {
           setSyncing(true);
           await syncTableRemote('KGB', 'DELETE', { id: itemToDelete.id });
           await loadInitialData();
           setIsConfirmOpen(false);
           setSyncing(false);
         }
      }} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">Kenaikan Gaji Berkala</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Otomatisasi Naskah Dinas KGB ASN DJKI</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip KGB</button>
           <button onClick={() => { setFormData({...formData, id: undefined, nip: ''}); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Buat Baru</button>
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-600 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Identitas & NIP</th><th className="px-4 py-5">Nomor & TMT Baru</th><th className="px-4 py-5 text-center">Gaji Baru</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {kgbHistory.map(k => (
                   <tr key={k.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-10 py-5">
                         <p className="text-[11px] font-black text-gray-950 uppercase">{k.namaPegawai}</p>
                         <p className="text-[9px] font-mono text-blue-600 font-bold">NIP. {k.nip}</p>
                      </td>
                      <td className="px-4 py-5">
                         <p className="text-[10px] font-bold text-gray-500 uppercase">{k.nomorSk || '-'}</p>
                         <p className="text-[11px] font-black text-gray-950 uppercase">TMT: {k.tmtBaru}</p>
                      </td>
                      <td className="px-4 py-5 text-center">
                         <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100">Rp {Number(k.gajiBaru).toLocaleString('id-ID')}</span>
                      </td>
                      <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setFormData(k); setActiveView('preview'); }} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Lihat PDF</button>
                            {canEdit && (
                              <>
                                <button onClick={() => handleEditKgb(k)} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl flex items-center justify-center hover:bg-amber-50 shadow-sm transition-all"><i className="bi bi-pencil-fill"></i></button>
                                {isSuperadmin && <button onClick={() => { setItemToDelete(k); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-50 shadow-sm transition-all"><i className="bi bi-trash-fill"></i></button>}
                              </>
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
        <div className="max-w-5xl mx-auto bg-white p-10 md:p-14 rounded-[4rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.golRuang} (${p.jenisPegawai})`}))} value={formData.nip} onChange={handlePegawaiSelect} />
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">1. Atribut Surat</h5>
                 <FormItem label="Nomor Surat"><input type="text" className={inputClass} value={formData.nomor} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></FormItem>
                 <FormItem label="Tanggal Terbit"><input type="date" className={inputClass} value={formData.tglSurat} onChange={e=>setFormData({...formData, tglSurat: e.target.value})} /></FormItem>
                 <FormItem label="Nama Lengkap (Database)"><input type="text" className={`${inputClass} font-bold`} value={formData.namaPegawai} onChange={e=>setFormData({...formData, namaPegawai: e.target.value})} /></FormItem>
                 <div className="grid grid-cols-2 gap-4">
                    <FormItem label="Golongan"><input type="text" className={inputClass} value={formData.golongan} onChange={e=>setFormData({...formData, golongan: e.target.value})} /></FormItem>
                    <FormItem label="Masa Kerja (Thn Baru)"><input type="number" className={inputClass} value={formData.masaKerjaTahun} onChange={e=>setFormData({...formData, masaKerjaTahun: e.target.value})} /></FormItem>
                 </div>
              </div>
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">2. Rincian Gaji & TMT</h5>
                 <div className="grid grid-cols-2 gap-4">
                    <FormItem label="Gaji Pokok Lama"><input type="number" className={inputClass} value={formData.gajiLama} onChange={e=>setFormData({...formData, gajiLama: e.target.value})} /></FormItem>
                    <FormItem label="Gaji Pokok Baru"><input type="number" className={inputClass} value={formData.gajiBaru} onChange={e=>setFormData({...formData, gajiBaru: e.target.value})} /></FormItem>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormItem label="TMT KGB Lama"><input type="date" className={inputClass} value={formData.tmtLama} onChange={e=>setFormData({...formData, tmtLama: e.target.value})} /></FormItem>
                    <FormItem label="TMT KGB Baru"><input type="date" className={inputClass} value={formData.tmtBaru} onChange={e=>setFormData({...formData, tmtBaru: e.target.value})} /></FormItem>
                 </div>
                 <h5 className="text-[11px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest mt-4">3. Penandatangan</h5>
                 <SearchableSelect label="Pejabat" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.pjbNip} onChange={v=>{const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, pjbNip:v, pjbNama:p.nama, pjbJabatan:p.jabatan})}} />
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all">Generate & Pratinjau F4</button>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl text-[11px] font-black uppercase shadow-sm">Edit Data</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2.2cm] font-arial text-black" style={{ width: '210mm', minHeight: '330mm', color: '#000000' }}>
                 <div className="flex flex-col items-center border-b-[3pt] border-black pb-4 mb-10 text-black">
                    <p className="text-[14pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                    <p className="text-[14pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                    <div className="h-1.5 bg-black w-full my-1.5"></div>
                    <p className="text-[10pt] font-normal leading-tight">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                 </div>
                 <div className="text-center mb-10 text-black">
                    <h1 className="text-[14pt] font-bold uppercase underline leading-tight">PETIKAN KEPUTUSAN KENAIKAN GAJI BERKALA</h1>
                    <p className="text-[11.5pt] font-bold mt-1 uppercase">NOMOR : {formData.nomor}</p>
                 </div>
                 <div className="text-[11pt] space-y-6 text-justify leading-relaxed text-black">
                    <p>Berdasarkan Peraturan Pemerintah Nomor 7 Tahun 1977 jo. Peraturan Pemerintah Nomor 15 Tahun 2019, dengan ini diberitahukan bahwa Pegawai Negeri Sipil tersebut di bawah ini:</p>
                    <div className="grid grid-cols-[180px_10px_1fr] ml-10 gap-y-1">
                       <span>1. Nama</span><span>:</span><span className="font-bold uppercase underline">{formData.namaPegawai}</span>
                       <span>2. NIP</span><span>:</span><span className="font-bold">{formData.nip}</span>
                       <span>3. Pangkat/Gol</span><span>:</span><span className="uppercase font-bold">{pSubjek?.pangkat || '-'} ({formData.golongan})</span>
                       <span>4. Jabatan</span><span>:</span><span className="uppercase font-bold">{formData.jabatan}</span>
                       <span>5. Unit Kerja</span><span>:</span><span className="uppercase font-bold">{normalizeUnitName(formData.unitKerja)}</span>
                    </div>
                    <p>Diberikan kenaikan gaji berkala, sehingga kepadanya diberikan gaji pokok baru sebesar:</p>
                    <div className="bg-gray-50 p-6 border-2 border-black rounded-xl text-center">
                       <p className="text-3xl font-black">Rp {Number(formData.gajiBaru).toLocaleString('id-ID')},-</p>
                       <p className="text-[10pt] font-bold italic mt-2">(Gaji pokok lama: Rp {Number(formData.gajiLama).toLocaleString('id-ID')},-)</p>
                    </div>
                    <p>Kenaikan gaji berkala ini mulai berlaku terhitung mulai tanggal <span className="font-bold">{new Date(formData.tmtBaru).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span> dengan masa kerja golongan <span className="font-bold">{formData.masaKerjaTahun} Tahun</span>.</p>
                 </div>
                 <div className="mt-20 ml-[55%] text-center text-[11pt] leading-tight text-black">
                    <p>Jakarta, {new Date(formData.tglSurat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                    <p className="font-bold uppercase mb-28 mt-4 leading-tight">{formData.pjbJabatan},</p>
                    <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                    <p className="mt-1 font-bold">NIP {formData.pjbNip}</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const FormItem = ({ label, children }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-gray-600 uppercase ml-3 tracking-widest block mb-1.5">{label}</label>
    {children}
  </div>
);

export default KGBGeneratorPage;
