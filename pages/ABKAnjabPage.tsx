
import React, { useState, useEffect, useMemo, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { ABKAnjab, Pegawai } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, fetchABKAnjabFromSheets } from '../spreadsheetService';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const ABKAnjabPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [abkList, setAbkList] = useState<ABKAnjab[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [modalTab, setModalTab] = useState<'identitas' | 'syarat' | 'uraian' | 'otoritas' | 'lingkungan' | 'hasil'>('identitas');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ABKAnjab | null>(null);

  const [formData, setFormData] = useState<any>({
    namaJabatan: '',
    unitKerja: UNIT_KERJA[0],
    jumlahSaatIni: 0,
    jamKerjaEfektif: 75000, 
    ikhtisarJabatan: '',
    kualifikasiPendidikan: '',
    tanggungJawab: '',
    wewenang: '',
    syaratJabatan: '',
    lingkunganKerja: 'Dalam Ruangan; Suhu: Dingin; Pencahayaan: Terang; Kebisingan: Tenang',
    risikoBahaya: 'Kelelahan Mata',
    bakatKerja: 'G: Inteligensia; V: Bakat Verbal; Q: Ketelitian',
    temperamenKerja: 'R: Repetitive; T: Toleransi',
    minatKerja: '1.a: Kegiatan yang berhubungan dengan benda-benda',
    upayaFisik: 'Duduk; Berjalan; Berbicara',
    kondisiFisik: 'Sehat Jasmani dan Rohani',
    uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pData, aData] = await Promise.all([fetchPegawaiFromSheets(), fetchABKAnjabFromSheets()]);
      setPegawaiList(pData);
      setAbkList(aData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const uniqueJabatanOptions = useMemo(() => {
    const unique = Array.from(new Set(pegawaiList.map(p => (p.jabatan || '').toUpperCase().trim()))).filter(j => j !== '');
    return unique.sort().map(j => ({ value: j, label: j }));
  }, [pegawaiList]);

  const unitOptions = useMemo(() => {
    return UNIT_KERJA.map(u => ({ value: u, label: u.toUpperCase() }));
  }, []);

  const handleAddUraian = () => {
    const currentUraian = Array.isArray(formData.uraianTugas) ? formData.uraianTugas : [];
    setFormData({ ...formData, uraianTugas: [...currentUraian, { tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }] });
  };

  const handleUraianChange = (index: number, field: string, value: any) => {
    const updatedUraian = [...(formData.uraianTugas || [])];
    const item = { ...updatedUraian[index], [field]: value };
    if (field === 'volume' || field === 'normaWaktu') {
      item.totalWaktu = (Number(item.volume) || 0) * (Number(item.normaWaktu) || 0);
    }
    updatedUraian[index] = item;
    setFormData({ ...formData, uraianTugas: updatedUraian });
  };

  const liveCalc = useMemo(() => {
    const currentUraian = Array.isArray(formData.uraianTugas) ? formData.uraianTugas : [];
    const totalMenit = currentUraian.reduce((acc: number, curr: any) => acc + (curr.totalWaktu || 0), 0);
    const jke = Number(formData.jamKerjaEfektif) || 75000;
    const kebutuhan = Number((totalMenit / jke).toFixed(2));
    const selisih = Number(((formData.jumlahSaatIni || 0) - kebutuhan).toFixed(2));
    let status: ABKAnjab['status'] = 'IDEAL';
    if (selisih <= -0.5) status = 'KURANG';
    else if (selisih >= 0.5) status = 'LEBIH';
    return { totalMenit, kebutuhan, selisih, status };
  }, [formData]);

  const handleSave = async () => {
    if (!formData.namaJabatan || !formData.unitKerja) return alert("Jabatan dan Unit Kerja wajib dipilih");
    setSyncing(true);
    const newEntry: ABKAnjab = {
      ...formData,
      id: editingId || `ABK-${Date.now()}`,
      namaJabatan: formData.namaJabatan.toUpperCase(),
      totalMenitBebanKerja: liveCalc.totalMenit,
      kebutuhanPegawai: liveCalc.kebutuhan,
      selisih: liveCalc.selisih,
      status: liveCalc.status
    };
    const ok = await syncTableRemote('ABK_ANJAB', 'SAVE', newEntry);
    if (ok) {
      await loadInitialData();
      logActivity(editingId ? 'UPDATE' : 'CREATE', 'ABK', `Simpan Anjab-ABK: ${newEntry.namaJabatan}`);
      setActiveView('list');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true, backgroundColor: '#ffffff' });
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
    pdf.save(`Informasi_Jabatan_${formData.namaJabatan.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if (!itemToDelete) return;
         setSyncing(true);
         await syncTableRemote('ABK_ANJAB', 'DELETE', { id: itemToDelete.id });
         await loadInitialData();
         setIsConfirmOpen(false);
         setSyncing(false);
      }} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-none">Anjab & ABK Hub</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <i className="bi bi-gear-wide-connected text-blue-600"></i> Job Engineering & Workload Management
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeView === 'list' && canEdit && (
             <button onClick={() => { setEditingId(null); setActiveView('editor'); setModalTab('identitas'); }} className="h-14 px-8 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">+ Analisis Jabatan Baru</button>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-6">Nomenklatur Jabatan</th><th className="px-4 py-6 text-center">Beban Kerja</th><th className="px-4 py-6 text-center">Formasi</th><th className="px-4 py-6 text-center">Status</th><th className="px-10 py-6 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {abkList.map(a => (
                    <tr key={a.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-6">
                          <p className="text-[12px] font-black text-gray-950 uppercase">{a.namaJabatan}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{normalizeUnitName(a.unitKerja)}</p>
                       </td>
                       <td className="px-4 py-6 text-center"><p className="text-[11px] font-black text-blue-600">{(a.totalMenitBebanKerja / 60).toFixed(0)} JAM</p></td>
                       <td className="px-4 py-6 text-center">
                          <div className="flex flex-col items-center">
                             <span className="text-[12px] font-black text-gray-900">{a.kebutuhanPegawai}</span>
                             <span className="text-[8px] font-bold text-gray-400 uppercase">ASN</span>
                          </div>
                       </td>
                       <td className="px-4 py-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black border ${a.status === 'KURANG' ? 'bg-rose-50 text-rose-600 border-rose-100' : a.status === 'LEBIH' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{a.status}</span>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-2">
                             <button onClick={() => { setFormData(a); setActiveView('preview'); }} className="h-9 w-9 bg-white border border-gray-100 text-blue-600 rounded-xl shadow-sm flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"><i className="bi bi-file-earmark-text"></i></button>
                             {canEdit && (
                                <button onClick={() => { setEditingId(a.id); setFormData(a); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"><i className="bi bi-pencil-fill"></i></button>
                             )}
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : activeView === 'editor' ? (
        <div className="max-w-7xl mx-auto animate-modalEnter bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[800px]">
           <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar">
              {[
                { id: 'identitas', label: '1. Identitas & Ikhtisar', icon: 'bi-info-circle-fill' },
                { id: 'syarat', label: '2. Kualifikasi & Syarat', icon: 'bi-patch-check-fill' },
                { id: 'uraian', label: '3. Uraian Tugas (WLA)', icon: 'bi-list-check' },
                { id: 'otoritas', label: '4. Tanggung Jawab & Wewenang', icon: 'bi-shield-shaded' },
                { id: 'lingkungan', label: '5. Lingkungan & Resiko', icon: 'bi-thermometer-half' },
                { id: 'hasil', label: '6. Hasil Analisis', icon: 'bi-graph-up-arrow' }
              ].map(t => (
                <button key={t.id} onClick={() => setModalTab(t.id as any)} className={`px-8 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 shrink-0 ${modalTab === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-900'}`}>
                   <i className={`bi ${t.icon} text-lg`}></i> {t.label}
                </button>
              ))}
           </div>

           <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              {modalTab === 'identitas' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                   <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Informasi Fundamental</h5>
                      <SearchableSelect label="Pilih Nama Jabatan" options={uniqueJabatanOptions} value={formData.namaJabatan} onChange={v => setFormData({...formData, namaJabatan: v})} placeholder="Cari Nomenklatur Jabatan..." />
                      <SearchableSelect label="Unit Kerja Pengampu" options={unitOptions} value={formData.unitKerja} onChange={v => setFormData({...formData, unitKerja: v})} placeholder="Pilih Unit Kerja..." />
                      <div className="grid grid-cols-2 gap-4">
                         <div><label className={labelClass}>Jumlah ASN Saat Ini</label><input type="number" className={inputClass} value={formData.jumlahSaatIni} onChange={e => setFormData({...formData, jumlahSaatIni: parseInt(e.target.value) || 0})} /></div>
                         <div><label className={labelClass}>Jam Kerja Efektif / Thn</label><input type="number" className={inputClass} value={formData.jamKerjaEfektif} onChange={e => setFormData({...formData, jamKerjaEfektif: parseInt(e.target.value) || 75000})} /></div>
                      </div>
                   </div>
                   <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Ringkasan Tugas</h5>
                      <div><label className={labelClass}>Ikhtisar Jabatan (Summary)</label><textarea rows={6} className={`${inputClass} normal-case h-44 resize-none font-bold`} value={formData.ikhtisarJabatan} onChange={e => setFormData({...formData, ikhtisarJabatan: e.target.value})} placeholder="Uraikan ringkasan tugas pokok jabatan secara singkat dan jelas..." /></div>
                   </div>
                </div>
              )}

              {modalTab === 'syarat' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                   <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Kualifikasi Kompetensi</h5>
                      <div><label className={labelClass}>Minimal Pendidikan</label><input className={inputClass} value={formData.kualifikasiPendidikan} onChange={e=>setFormData({...formData, kualifikasiPendidikan: e.target.value})} placeholder="MISAL: S1 HUKUM / S1 MANAJEMEN" /></div>
                      <div><label className={labelClass}>Bakat Kerja</label><textarea className={`${inputClass} normal-case`} value={formData.bakatKerja} onChange={e=>setFormData({...formData, bakatKerja: e.target.value})} /></div>
                      <div><label className={labelClass}>Temperamen Kerja</label><textarea className={`${inputClass} normal-case`} value={formData.temperamenKerja} onChange={e=>setFormData({...formData, temperamenKerja: e.target.value})} /></div>
                   </div>
                   <div className="space-y-6">
                      <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Karakteristik Fisik & Minat</h5>
                      <div><label className={labelClass}>Upaya Fisik</label><textarea className={`${inputClass} normal-case`} value={formData.upayaFisik} onChange={e=>setFormData({...formData, upayaFisik: e.target.value})} /></div>
                      <div><label className={labelClass}>Kondisi Fisik</label><textarea className={`${inputClass} normal-case`} value={formData.kondisiFisik} onChange={e=>setFormData({...formData, kondisiFisik: e.target.value})} /></div>
                      <div><label className={labelClass}>Minat Kerja</label><textarea className={`${inputClass} normal-case`} value={formData.minatKerja} onChange={e=>setFormData({...formData, minatKerja: e.target.value})} /></div>
                   </div>
                </div>
              )}

              {modalTab === 'uraian' && (
                 <div className="space-y-8 animate-fadeIn">
                    <div className="flex justify-between items-center border-b pb-4">
                       <div>
                         <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Workload Analysis (WLA) / Perhitungan Beban</h5>
                         <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">Norma Waktu dihitung dalam satuan MENIT</p>
                       </div>
                       <button onClick={handleAddUraian} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">+ Tambah Butir Tugas</button>
                    </div>
                    <div className="overflow-hidden border border-gray-100 rounded-[2.5rem]">
                       <table className="w-full text-left">
                          <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400">
                             <tr><th className="px-6 py-5">Uraian Butir Kegiatan</th><th className="px-4 py-5 text-center w-32">Vol/Thn</th><th className="px-4 py-5 text-center w-32">Norma (Mnt)</th><th className="px-4 py-5 text-right w-40">Total Beban</th><th className="px-6 py-5 w-12"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                             {formData.uraianTugas.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-blue-50/5 transition-all">
                                   <td className="px-6 py-3"><input type="text" className="w-full bg-transparent border-none outline-none text-[11px] font-bold uppercase text-gray-900" value={row.tugas} onChange={e => handleUraianChange(i, 'tugas', e.target.value)} placeholder="Tulis butir kegiatan..." /></td>
                                   <td className="px-4 py-3"><input type="number" className="w-full bg-gray-100 border-none rounded-xl px-3 py-2 text-center text-[11px] font-black" value={row.volume} onChange={e => handleUraianChange(i, 'volume', parseInt(e.target.value) || 0)} /></td>
                                   <td className="px-4 py-3"><input type="number" className="w-full bg-gray-100 border-none rounded-xl px-3 py-2 text-center text-[11px] font-black" value={row.normaWaktu} onChange={e => handleUraianChange(i, 'normaWaktu', parseInt(e.target.value) || 0)} /></td>
                                   <td className="px-4 py-3 text-right"><span className="text-[11px] font-black text-gray-950">{(row.totalWaktu || 0).toLocaleString()}</span></td>
                                   <td className="px-6 py-3"><button onClick={() => setFormData({...formData, uraianTugas: formData.uraianTugas.filter((_:any,idx:number)=>idx!==i)})} className="text-gray-300 hover:text-rose-500 transition-colors"><i className="bi bi-x-circle-fill text-lg"></i></button></td>
                                </tr>
                             ))}
                          </tbody>
                          <tfoot className="bg-blue-50/50">
                             <tr className="font-black text-[10px] text-blue-600 uppercase">
                                <td className="px-6 py-5" colSpan={3}>TOTAL BEBAN KERJA JABATAN PER TAHUN</td>
                                <td className="px-4 py-5 text-right">{(liveCalc.totalMenit/60).toFixed(1)} JAM KERJA</td>
                                <td></td>
                             </tr>
                          </tfoot>
                       </table>
                    </div>
                 </div>
              )}

              {modalTab === 'otoritas' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Tanggung Jawab</h5>
                       <textarea rows={10} className={`${inputClass} normal-case h-80 resize-none font-bold`} value={formData.tanggungJawab} onChange={e=>setFormData({...formData, tanggungJawab: e.target.value})} placeholder="List tanggung jawab jabatan..." />
                    </div>
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Wewenang</h5>
                       <textarea rows={10} className={`${inputClass} normal-case h-80 resize-none font-bold`} value={formData.wewenang} onChange={e=>setFormData({...formData, wewenang: e.target.value})} placeholder="List wewenang jabatan..." />
                    </div>
                 </div>
              )}

              {modalTab === 'lingkungan' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Kondisi Lingkungan</h5>
                       <textarea rows={6} className={`${inputClass} normal-case h-44 resize-none`} value={formData.lingkunganKerja} onChange={e=>setFormData({...formData, lingkunganKerja: e.target.value})} />
                    </div>
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-rose-600 uppercase border-b pb-3 tracking-widest">B. Risiko Bahaya</h5>
                       <textarea rows={6} className={`${inputClass} normal-case h-44 resize-none`} value={formData.risikoBahaya} onChange={e=>setFormData({...formData, risikoBahaya: e.target.value})} />
                    </div>
                 </div>
              )}

              {modalTab === 'hasil' && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn pt-10">
                   <div className="p-10 bg-gray-950 rounded-[3rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                      <div className="relative z-10 text-center space-y-2">
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Formasi Ideal (Hasil WLA)</p>
                         <h2 className="text-7xl font-black text-blue-400">{liveCalc.kebutuhan}</h2>
                         <p className="text-[11px] font-black uppercase">Pegawai ASN</p>
                      </div>
                      <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-8">
                         <div className="text-center">
                            <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Eksisting</p>
                            <h4 className="text-xl font-black">{formData.jumlahSaatIni}</h4>
                         </div>
                         <div className="text-center">
                            <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Selisih</p>
                            <h4 className={`text-xl font-black ${liveCalc.selisih < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{liveCalc.selisih}</h4>
                         </div>
                      </div>
                   </div>
                   <div className="flex flex-col justify-center space-y-6">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Status Analisis Beban Kerja</h4>
                      <div className={`p-8 rounded-[2rem] border-2 flex items-center justify-between ${liveCalc.status==='KURANG'?'bg-rose-50 border-rose-100 text-rose-700':liveCalc.status==='LEBIH'?'bg-amber-50 border-amber-100 text-amber-700':'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                         <span className="text-2xl font-black">{liveCalc.status}</span>
                         <i className={`bi ${liveCalc.status==='KURANG'?'bi-arrow-down-circle-fill':liveCalc.status==='LEBIH'?'bi-arrow-up-circle-fill':'bi-check-circle-fill'} text-3xl`}></i>
                      </div>
                      <p className="text-[9px] text-gray-500 leading-relaxed font-bold uppercase italic">
                         Data Analisis Jabatan (ANJAB) dan Analisis Beban Kerja (ABK) ini disinkronkan langsung ke database Cloud DJKI.
                      </p>
                   </div>
                </div>
              )}
           </div>

           <div className="p-8 border-t bg-gray-50 flex justify-center shrink-0">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                 {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                 <span>Simpan Seluruh Rekayasa Jabatan</span>
              </button>
           </div>
        </div>
      ) : (
        /* PREVIEW MODE (DOKUMEN INFORMASI JABATAN) */
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase shadow-sm">Edit Analisis</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           
           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2.2cm] font-arial text-black" style={{ width: '210mm', color: '#000000' }}>
                 <div className="text-center mb-10 border-b-2 border-black pb-4">
                    <h1 className="text-[14pt] font-bold uppercase leading-tight">INFORMASI JABATAN</h1>
                 </div>

                 <div className="space-y-6 text-[10pt] leading-relaxed">
                    <div className="space-y-2">
                       <p className="font-bold">1. IDENTITAS JABATAN</p>
                       <div className="grid grid-cols-[180px_10px_1fr] ml-4">
                          <span>A. Nama Jabatan</span><span>:</span><span className="font-bold uppercase">{formData.namaJabatan}</span>
                          <span>B. Unit Kerja</span><span>:</span><span className="uppercase">{formData.unitKerja}</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">2. IKHTISAR JABATAN</p>
                       <p className="ml-4 text-justify">{formData.ikhtisarJabatan}</p>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">3. KUALIFIKASI JABATAN</p>
                       <div className="grid grid-cols-[180px_10px_1fr] ml-4">
                          <span>Pendidikan Formal</span><span>:</span><span className="uppercase">{formData.kualifikasiPendidikan}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="font-bold">4. URAIAN TUGAS & BEBAN KERJA (ABK)</p>
                       <table className="w-full border-collapse border border-black ml-4 text-[9pt]">
                          <thead>
                             <tr className="bg-gray-100 border border-black">
                                <th className="p-2 border border-black w-8">NO</th>
                                <th className="p-2 border border-black">URAIAN TUGAS</th>
                                <th className="p-2 border border-black w-24">VOL/THN</th>
                                <th className="p-2 border border-black w-24">NORMA</th>
                             </tr>
                          </thead>
                          <tbody>
                             {formData.uraianTugas.map((ut: any, idx: number) => (
                                <tr key={idx} className="border border-black">
                                   <td className="p-2 border border-black text-center">{idx + 1}</td>
                                   <td className="p-2 border border-black uppercase">{ut.tugas}</td>
                                   <td className="p-2 border border-black text-center">{ut.volume}</td>
                                   <td className="p-2 border border-black text-center">{ut.normaWaktu} Mnt</td>
                                </tr>
                             ))}
                             <tr className="bg-gray-50 font-bold border border-black">
                                <td colSpan={2} className="p-2 border border-black text-right uppercase">Total Beban Kerja (Menit)</td>
                                <td colSpan={2} className="p-2 border border-black text-center">{liveCalc.totalMenit.toLocaleString()}</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">5. TANGGUNG JAWAB</p>
                       <div className="ml-4 whitespace-pre-wrap">{formData.tanggungJawab}</div>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">6. WEWENANG</p>
                       <div className="ml-4 whitespace-pre-wrap">{formData.wewenang}</div>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">7. SYARAT JABATAN LAINNYA</p>
                       <div className="grid grid-cols-[180px_10px_1fr] ml-4 gap-y-1">
                          <span>Bakat Kerja</span><span>:</span><span>{formData.bakatKerja}</span>
                          <span>Temperamen Kerja</span><span>:</span><span>{formData.temperamenKerja}</span>
                          <span>Minat Kerja</span><span>:</span><span>{formData.minatKerja}</span>
                          <span>Upaya Fisik</span><span>:</span><span>{formData.upayaFisik}</span>
                       </div>
                    </div>
                    
                    <div className="mt-10 pt-10 border-t text-center text-[9pt]">
                       <p className="font-bold uppercase underline">HASIL ANALISIS BEBAN KERJA</p>
                       <p className="mt-2">Berdasarkan perhitungan WLA, kebutuhan ideal SDM untuk jabatan ini adalah <span className="font-black">{liveCalc.kebutuhan} PEGAWAI</span>.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ABKAnjabPage;
