
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchPAKFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, PAKRecord } from '../types';
import { useAuth } from '../AuthContext';
import { AK_KOEFISIEN, PREDIKAT_MULTIPLIER } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const PAKPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  
  const [pakList, setPakList] = useState<PAKRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'editor' | 'preview'>('table');
  const [editorStep, setEditorStep] = useState<'profil' | 'konversi' | 'final'>('profil');
  const [selectedPAK, setSelectedPAK] = useState<any | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pakToDelete, setPakToDelete] = useState<PAKRecord | null>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.04.05-',
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    periode: 'Tahun 2024',
    jenjang: 'AHLI PERTAMA',
    akDasar: 0,
    akIntegrasi: 0,
    akPenyesuaian: 0,
    akPendidikan: 0,
    konversiRows: [
      { tahun: 2024, predikat: 'Baik', koef: 12.5, multiplier: 1.0, ak: 12.5 }
    ],
    penilaiNip: '197410061998031002', // Default: Sekretaris DJKI
    tempat: 'Jakarta'
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchPAKFromSheets()]);
      setPegawaiList(pRes);
      setPakList(sRes as any || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Filter Pegawai: Hanya PNS & Jabatan Fungsional
  const eligibleSubjectOptions = useMemo(() => {
    return pegawaiList
      .filter(p => {
        const isPns = (p.jenisPegawai || '').toUpperCase() === 'PNS';
        const jab = (p.jabatan || '').toUpperCase();
        // Cek keywords Jabatan Fungsional (Ahli, Terampil, Mahir, Penyelia, Pemula)
        const isFungsional = jab.includes('AHLI') || 
                             jab.includes('TERAMPIL') || 
                             jab.includes('MAHIR') || 
                             jab.includes('PENYELIA') || 
                             jab.includes('PEMULA');
        return isPns && isFungsional;
      })
      .map(p => ({
        value: p.nip,
        label: p.nama,
        subLabel: `NIP. ${p.nip} - ${p.jabatan}`
      }));
  }, [pegawaiList]);

  // Pejabat Penilai: Boleh siapa saja (biasanya Struktural/Atasan)
  const allPegawaiOptions = useMemo(() => pegawaiList.map(p => ({
    value: p.nip,
    label: p.nama,
    subLabel: `NIP. ${p.nip} - ${p.jabatan}`
  })), [pegawaiList]);

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const isPns = (p.jenisPegawai || '').toUpperCase() === 'PNS';
      const jab = (p.jabatan || '').toUpperCase();
      const isFungsional = jab.includes('AHLI') || jab.includes('TERAMPIL') || jab.includes('MAHIR') || jab.includes('PENYELIA') || jab.includes('PEMULA');

      if (!isPns || !isFungsional) {
        alert("PERHATIAN: Angka Kredit (PAK) hanya dapat dibuat untuk Pegawai Negeri Sipil (PNS) dengan Jabatan Fungsional.");
        return;
      }

      let detectedJenjang = 'AHLI PERTAMA';
      if (jab.includes('UTAMA')) detectedJenjang = 'AHLI UTAMA';
      else if (jab.includes('MADYA')) detectedJenjang = 'AHLI MADYA';
      else if (jab.includes('MUDA')) detectedJenjang = 'AHLI MUDA';
      else if (jab.includes('PERTAMA')) detectedJenjang = 'AHLI PERTAMA';
      else if (jab.includes('MAHIR')) detectedJenjang = 'MAHIR';
      else if (jab.includes('TERAMPIL')) detectedJenjang = 'TERAMPIL';
      else if (jab.includes('PENYELIA')) detectedJenjang = 'PENYELIA';

      const currentKoef = AK_KOEFISIEN[detectedJenjang] || 12.5;
      setFormData({
        ...formData,
        nip: p.nip,
        namaPegawai: p.nama,
        jenjang: detectedJenjang,
        konversiRows: [{ tahun: new Date().getFullYear(), predikat: 'Baik', koef: currentKoef, multiplier: 1.0, ak: currentKoef }]
      });
    }
  };

  const updateKonversiRow = (idx: number, field: string, value: any) => {
    const newList = [...formData.konversiRows];
    newList[idx] = { ...newList[idx], [field]: value };
    if (field === 'predikat' || field === 'koef') {
      const mult = PREDIKAT_MULTIPLIER[newList[idx].predikat] || 1.0;
      newList[idx].multiplier = mult;
      newList[idx].ak = newList[idx].koef * mult;
    }
    setFormData({ ...formData, konversiRows: newList });
  };

  const totalAKKonversi = useMemo(() => {
    return formData.konversiRows.reduce((acc: number, curr: any) => acc + (Number(curr.ak) || 0), 0);
  }, [formData.konversiRows]);

  const totalKumulatif = useMemo(() => {
    return (Number(formData.akDasar) || 0) + 
           (Number(formData.akIntegrasi) || 0) + 
           (Number(formData.akPenyesuaian) || 0) + 
           (Number(formData.akPendidikan) || 0) + 
           totalAKKonversi;
  }, [formData, totalAKKonversi]);

  const handleSave = async () => {
    if (!formData.nip || !formData.penilaiNip) return alert("Lengkapi data subjek dan penilai");
    setSyncing(true);
    const payload = {
      ...formData,
      id: formData.id || `PAK-${formData.nip}-${Date.now()}`,
      akKonversi: totalAKKonversi,
      jumlahKredit: totalKumulatif,
      akumulasi: formData.konversiRows,
      status: 'Selesai'
    };
    try {
      const ok = await syncTableRemote('PAK', 'SAVE', payload);
      if (ok) {
        await loadInitialData();
        setSelectedPAK(payload);
        setActiveView('preview');
        setShowSuccess(true);
        logActivity('CREATE', 'PAK', `Terbitkan PAK: ${payload.namaPegawai}`);
      }
    } catch (e) { alert("Gagal sinkronisasi data."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`PAK_KONVERSI_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const activeRecord = selectedPAK || formData;
  const pSubjek = pegawaiList.find(p => p.nip === activeRecord.nip);
  const pPenilai = pegawaiList.find(p => p.nip === activeRecord.penilaiNip);

  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";
  const inputClass = "w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if(!pakToDelete) return;
         setSyncing(true);
         const ok = await syncTableRemote('PAK', 'DELETE', { id: pakToDelete.id });
         if(ok) { setPakList(prev => prev.filter(s => s.id !== pakToDelete.id)); setIsConfirmOpen(false); }
         setSyncing(false);
      }} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">PAK Digital Engine</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
               <i className="bi bi-person-check-fill text-blue-600"></i> Khusus Pejabat Fungsional PNS
            </p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip</button>
           {canEdit && (
             <button onClick={() => { setFormData({...formData, id: undefined, nip: ''}); setActiveView('editor'); setEditorStep('profil'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Baru</button>
           )}
        </div>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Nama Pegawai</th><th className="px-4 py-5">Nomor PAK</th><th className="px-4 py-5 text-center">AK Kumulatif</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {pakList.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-5">
                          <p className="text-[11px] font-black text-gray-950 uppercase mb-1">{p.namaPegawai}</p>
                          <p className="text-[9px] font-mono text-blue-600 font-bold uppercase">NIP. {p.nip}</p>
                       </td>
                       <td className="px-4 py-5 text-[10px] font-bold text-gray-500">{p.nomor}</td>
                       <td className="px-4 py-5 text-center font-black text-blue-600">{Number(p.jumlahKredit || 0).toFixed(3)}</td>
                       <td className="px-10 py-5 text-right"><button onClick={() => { setSelectedPAK(p); setActiveView('preview'); }} className="h-9 px-6 rounded-xl bg-gray-950 text-white text-[9px] font-black uppercase shadow-lg">Detail</button></td>
                    </tr>
                 ))}
                 {pakList.length === 0 && !loading && (
                   <tr><td colSpan={4} className="py-32 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Belum ada data PAK</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-5xl mx-auto space-y-6 animate-modalEnter">
           <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              <div className="flex border-b bg-gray-50/50">
                 {[
                   {id: 'profil', label: '1. Profil (PNS Fungsional)', icon: 'bi-person-badge-fill'},
                   {id: 'konversi', label: '2. Konversi SKP', icon: 'bi-calculator'},
                   {id: 'final', label: '3. Finalisasi', icon: 'bi-check-all'}
                 ].map(t => (
                   <button key={t.id} onClick={() => setEditorStep(t.id as any)} className={`px-10 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${editorStep === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>
                      <i className={`bi ${t.icon}`}></i> {t.label}
                   </button>
                 ))}
              </div>

              <div className="p-10 flex-1 space-y-8">
                 {editorStep === 'profil' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                       <div className="space-y-4">
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-4">
                             <p className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-2"><i className="bi bi-info-circle-fill"></i> Aturan Sistem</p>
                             <p className="text-[10px] font-bold text-blue-900 mt-1 uppercase">Hanya PNS dengan Jabatan Fungsional yang muncul dalam daftar pencarian.</p>
                          </div>
                          <SearchableSelect label="Subjek Angka Kredit" options={eligibleSubjectOptions} value={formData.nip} onChange={handlePegawaiSelect} placeholder="Cari PNS Fungsional..." />
                          <div><label className={labelClass}>Jenjang Jabatan Terdeteksi</label><select className={inputClass} value={formData.jenjang} onChange={e=>setFormData({...formData, jenjang: e.target.value})}><option>AHLI PERTAMA</option><option>AHLI MUDA</option><option>AHLI MADYA</option><option>AHLI UTAMA</option><option>MAHIR</option><option>TERAMPIL</option><option>PENYELIA</option></select></div>
                          <div><label className={labelClass}>Nomor SK PAK</label><input className={inputClass} value={formData.nomor} onChange={e=>setFormData({...formData, nomor: e.target.value})} placeholder="exp: HKI.1-KP.04.05-2024" /></div>
                       </div>
                       <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 grid grid-cols-2 gap-4 h-fit">
                          <div className="col-span-full mb-2"><h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Angka Kredit (Manual)</h6></div>
                          <div><label className={labelClass}>AK Dasar</label><input type="number" step="0.001" className={inputClass} value={formData.akDasar} onChange={e=>setFormData({...formData, akDasar: e.target.value})} /></div>
                          <div><label className={labelClass}>AK Integrasi</label><input type="number" step="0.001" className={inputClass} value={formData.akIntegrasi} onChange={e=>setFormData({...formData, akIntegrasi: e.target.value})} /></div>
                          <div><label className={labelClass}>AK Penyesuaian</label><input type="number" step="0.001" className={inputClass} value={formData.akPenyesuaian} onChange={e=>setFormData({...formData, akPenyesuaian: e.target.value})} /></div>
                          <div><label className={labelClass}>AK Pendidikan</label><input type="number" step="0.001" className={inputClass} value={formData.akPendidikan} onChange={e=>setFormData({...formData, akPendidikan: e.target.value})} /></div>
                       </div>
                    </div>
                 )}

                 {editorStep === 'konversi' && (
                    <div className="space-y-6 animate-fadeIn">
                       <div className="flex justify-between items-center"><h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Konversi Nilai SKP ke Angka Kredit</h5></div>
                       <div className="space-y-3">
                          {formData.konversiRows.map((row: any, i: number) => (
                             <div key={i} className="grid grid-cols-5 gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 items-center hover:bg-white transition-all">
                                <div className="col-span-1"><label className={labelClass}>Tahun SKP</label><input type="number" className={inputClass} value={row.tahun} onChange={e=>updateKonversiRow(i, 'tahun', e.target.value)} /></div>
                                <div className="col-span-1"><label className={labelClass}>Predikat Kerja</label><select className={inputClass} value={row.predikat} onChange={e=>updateKonversiRow(i, 'predikat', e.target.value)}>{Object.keys(PREDIKAT_MULTIPLIER).map(k=><option key={k}>{k}</option>)}</select></div>
                                <div className="col-span-1"><label className={labelClass}>Koef. Jenjang</label><input type="number" className={inputClass} value={row.koef} onChange={e=>updateKonversiRow(i, 'koef', e.target.value)} /></div>
                                <div className="col-span-1"><label className={labelClass}>Multiplier</label><input readOnly className={`${inputClass} bg-blue-50 text-blue-600 border-blue-100`} value={row.multiplier} /></div>
                                <div className="col-span-1"><label className={labelClass}>Perolehan AK</label><input readOnly className={`${inputClass} bg-emerald-50 text-emerald-600 font-black border-emerald-100`} value={row.ak.toFixed(3)} /></div>
                             </div>
                          ))}
                       </div>
                       <div className="bg-blue-600 p-8 rounded-[2rem] text-white flex justify-between items-center shadow-xl shadow-blue-600/20">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Total AK Konversi Periode Ini</span>
                             <span className="text-xs font-bold text-blue-200 mt-1 uppercase">Berdasarkan hasil evaluasi SKP {formData.periode}</span>
                          </div>
                          <span className="text-4xl font-black">{totalAKKonversi.toFixed(3)}</span>
                       </div>
                    </div>
                 )}

                 {editorStep === 'final' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-fadeIn">
                       <div className="space-y-6">
                          <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">Otentikasi & Validitas</h5>
                          <SearchableSelect label="Pejabat Penandatangan SK" options={allPegawaiOptions} value={formData.penilaiNip} onChange={v => setFormData({...formData, penilaiNip: v})} />
                          <div className="grid grid-cols-2 gap-4">
                             <div><label className={labelClass}>Tempat Penetapan</label><input className={inputClass} value={formData.tempat} onChange={e=>setFormData({...formData, tempat: e.target.value})} /></div>
                             <div><label className={labelClass}>Tanggal Penetapan</label><input className={inputClass} value={formData.tglDibuat} onChange={e=>setFormData({...formData, tglDibuat: e.target.value})} /></div>
                          </div>
                       </div>
                       <div className="p-10 bg-gray-950 rounded-[3rem] text-white flex flex-col justify-center items-center text-center space-y-6 shadow-2xl relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                          <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.4em]">Angka Kredit Kumulatif</p>
                          <h2 className="text-7xl font-black text-white tracking-tighter">{totalKumulatif.toFixed(3)}</h2>
                          <div className="h-1.5 w-24 bg-emerald-500 rounded-full"></div>
                          <p className="text-[10px] font-bold text-gray-500 leading-relaxed uppercase max-w-xs">Data ini akan diproses sebagai basis usulan kenaikan pangkat/jenjang berikutnya.</p>
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-10 bg-gray-50 border-t flex justify-center shrink-0">
                 <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                    {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Terbitkan Keputusan PAK</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Data</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           
           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar rounded-[3rem]">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2cm] font-arial text-black" style={{ width: '210mm', minHeight: '330mm' }}>
                 <div className="flex flex-col items-center mb-10 text-center">
                    <p className="text-[12pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                    <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                    <div className="h-1 bg-black w-full my-2"></div>
                    <p className="text-[13pt] font-bold uppercase mt-6 underline leading-tight">KEPUTUSAN PENETAPAN ANGKA KREDIT</p>
                    <p className="text-[11pt] font-bold mt-1 uppercase">NOMOR : {activeRecord.nomor}</p>
                 </div>

                 <div className="space-y-6 text-[10.5pt] leading-relaxed">
                    <p>Pejabat Penilai Kinerja dengan ini menetapkan Angka Kredit kepada:</p>
                    <div className="grid grid-cols-[180px_10px_1fr] ml-10 leading-snug">
                       <span>Nama</span><span>:</span><span className="font-bold uppercase">{pSubjek?.nama}</span>
                       <span>NIP</span><span>:</span><span>{activeRecord.nip}</span>
                       <span>Pangkat/Golongan</span><span>:</span><span className="uppercase">{pSubjek?.pangkat} ({pSubjek?.golRuang})</span>
                       <span>Jenjang Jabatan</span><span>:</span><span className="uppercase">{activeRecord.jenjang}</span>
                       <span>Unit Kerja</span><span>:</span><span className="uppercase">{pSubjek?.unitKerja}</span>
                    </div>

                    <div className="mt-10">
                       <p className="font-bold mb-4 underline">RINCIAN PEROLEHAN ANGKA KREDIT:</p>
                       <table className="w-full border-collapse border-2 border-black text-center text-[10pt]">
                          <thead className="bg-gray-100">
                             <tr className="border-b-2 border-black font-bold">
                                <th className="p-2 border-r border-black w-12">NO</th>
                                <th className="p-2 border-r border-black">URAIAN PEROLEHAN</th>
                                <th className="p-2 w-44">JUMLAH AK</th>
                             </tr>
                          </thead>
                          <tbody className="align-middle">
                             <tr className="border-b border-black">
                                <td className="p-2 border-r border-black">1</td>
                                <td className="p-2 border-r border-black text-left">Angka Kredit Dasar</td>
                                <td className="p-2">{Number(activeRecord.akDasar).toFixed(3)}</td>
                             </tr>
                             <tr className="border-b border-black">
                                <td className="p-2 border-r border-black">2</td>
                                <td className="p-2 border-r border-black text-left">Angka Kredit Integrasi</td>
                                <td className="p-2">{Number(activeRecord.akIntegrasi).toFixed(3)}</td>
                             </tr>
                             <tr className="border-b border-black">
                                <td className="p-2 border-r border-black">3</td>
                                <td className="p-2 border-r border-black text-left">Angka Kredit Konversi SKP ({activeRecord.periode})</td>
                                <td className="p-2">{Number(activeRecord.akKonversi).toFixed(3)}</td>
                             </tr>
                             <tr className="border-b border-black">
                                <td className="p-2 border-r border-black">4</td>
                                <td className="p-2 border-r border-black text-left">AK Penyesuaian / Pendidikan</td>
                                <td className="p-2">{(Number(activeRecord.akPenyesuaian) + Number(activeRecord.akPendidikan)).toFixed(3)}</td>
                             </tr>
                             <tr className="bg-gray-50 font-bold">
                                <td className="p-2 border-r border-black" colSpan={2}>TOTAL ANGKA KREDIT KUMULATIF</td>
                                <td className="p-2 underline">{Number(activeRecord.jumlahKredit).toFixed(3)}</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>

                    <div className="mt-14 ml-[55%] text-center text-[11pt] leading-tight">
                       <p>{activeRecord.tempat}, {activeRecord.tglDibuat}</p>
                       <p className="font-bold mt-4 mb-28 uppercase">{pPenilai?.jabatan || 'SEKRETARIS DIREKTORAT JENDERAL'},</p>
                       <p className="font-bold uppercase underline leading-none">{pPenilai?.nama}</p>
                       <p className="mt-1">NIP {activeRecord.penilaiNip}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PAKPage;
