
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchPAKFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, PAKRecord } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, PREDIKAT_MULTIPLIER, AK_KOEFISIEN } from '../constants';
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
  const [editorStep, setEditorStep] = useState<'konversi' | 'akumulasi' | 'penetapan'>('konversi');
  const [selectedPAK, setSelectedPAK] = useState<PAKRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pakToDelete, setPakToDelete] = useState<PAKRecord | null>(null);

  const [formData, setFormData] = useState<Partial<PAKRecord>>({
    nomor: 'HKI.1-KP.04.05-',
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    periode: 'Tahun 2024',
    nomorKarpeg: '',
    tmtGolongan: '',
    tmtJabatan: '',
    predikat: 'Baik',
    prosentase: 1.0,
    koefisien: 12.5,
    akDiperoleh: 12.5,
    akIntegrasi: 0,
    akDasar: 0,
    akJFLama: 0,
    akPenyesuaian: 0,
    akPendidikan: 0,
    akMinPangkat: 50,
    akMinJenjang: 100,
    akumulasi: []
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

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const koef = AK_KOEFISIEN[p.jabatan.toUpperCase()] || 12.5;
      const mult = PREDIKAT_MULTIPLIER[formData.predikat || 'Baik'] || 1.0;
      setFormData({
        ...formData,
        nip: p.nip,
        namaPegawai: p.nama,
        tmtGolongan: p.tmtPangkat || '',
        tmtJabatan: p.tmtJabatan || '',
        koefisien: koef,
        akDiperoleh: koef * mult
      });
    }
  };

  const currentTotalKonversi = useMemo(() => {
    const fromAkumulasi = (formData.akumulasi || []).reduce((acc, curr) => acc + (curr.ak || 0), 0);
    return fromAkumulasi + (formData.akDiperoleh || 0);
  }, [formData.akumulasi, formData.akDiperoleh]);

  const currentKumulatif = useMemo(() => {
    return (Number(formData.akDasar) || 0) + 
           (Number(formData.akJFLama) || 0) + 
           (Number(formData.akPenyesuaian) || 0) + 
           currentTotalKonversi + 
           (Number(formData.akPendidikan) || 0);
  }, [formData, currentTotalKonversi]);

  const handleSave = async () => {
    if (!formData.nip) return alert("Pilih Pegawai");
    setSyncing(true);
    
    const newRecord: PAKRecord = {
      ...formData as PAKRecord,
      id: formData.id || Date.now().toString(),
      akKonversi: currentTotalKonversi,
      jumlahKredit: currentKumulatif,
      status: 'Selesai'
    };

    try {
      const success = await syncTableRemote('PAK', 'SAVE', newRecord);
      if (success) {
        await loadInitialData();
        setSelectedPAK(newRecord);
        setActiveView('preview');
        setShowSuccess(true);
        logActivity('CREATE', 'PAK', `Terbitkan Angka Kredit Terpadu: ${newRecord.namaPegawai}`);
      }
    } catch (e) { alert("Gagal sinkronisasi data."); } finally { setSyncing(false); }
  };

  const confirmDelete = (item: PAKRecord) => { setPakToDelete(item); setIsConfirmOpen(true); };
  const handleDeletePAK = async () => {
    if (!pakToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('PAK', 'DELETE', { id: pakToDelete.id });
      if (success) {
        setPakList(prev => prev.filter(p => p.id !== pakToDelete.id));
        setIsConfirmOpen(false);
      }
    } catch (e) { alert("Gagal menghapus."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`PAK_ASN_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
  };

  const record = selectedPAK || formData;
  const targetPeg = pegawaiList.find(p => p.nip === record.nip);
  const targetPjb = pegawaiList.find(p => p.nip === record.penilaiNip);

  // Perhitungan Akumulasi Halaman 2 (Display Only)
  const displayAkumulasiPerolehan = (record.akumulasi || []).reduce((acc: number, curr: any) => acc + (curr.ak || 0), 0) + (record.akDiperoleh || 0);
  const displayTotalAKHalaman2 = displayAkumulasiPerolehan + (Number(record.akIntegrasi) || 0);

  // Analisis Halaman 3
  const selisihPangkat = (record.jumlahKredit || 0) - (Number(record.akMinPangkat) || 0);
  const selisihJenjang = (record.jumlahKredit || 0) - (Number(record.akMinJenjang) || 0);

  const FormItem = ({ label, value, children }: any) => (
    <div className="space-y-1.5">
       <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">{label}</label>
       {children || <input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-xs font-black uppercase" value={value} readOnly />}
    </div>
  );

  const DocHeader = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center mb-6 text-black border-b-[2pt] border-black pb-2 font-arial text-center">
       <div className="flex items-center w-full px-4">
        <img src={DEFAULT_LOGO} className="h-16 w-auto mr-4 object-contain" alt="Logo" crossOrigin="anonymous" />
        <div className="flex-1">
          <p className="text-[11pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[11pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[8pt] mt-0.5 font-bold">Jl. H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940</p>
          <p className="text-[8pt]">Call Center : 152 | Laman : www.dgip.go.id | Pos-el : halodjki@dgip.go.id</p>
        </div>
      </div>
    </div>
  );

  const PersonalInfoTable = () => (
    <div className="border-2 border-black mb-6">
       <div className="bg-gray-100 text-center font-bold p-1 text-[9pt] border-b-2 border-black uppercase">PEJABAT FUNGSIONAL YANG DINILAI</div>
       <table className="w-full text-[8.5pt]">
          <tbody>
             {[
               {id: 1, k: 'Nama', v: targetPeg?.nama},
               {id: 2, k: 'NIP', v: targetPeg?.nip},
               {id: 3, k: 'Nomor Seri Karpeg', v: record.nomorKarpeg},
               {id: 4, k: 'Tempat tanggal lahir', v: `${targetPeg?.tempatLahir}, ${targetPeg?.tanggalLahir}`},
               {id: 5, k: 'Jenis Kelamin', v: targetPeg?.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'},
               {id: 6, k: 'Pangkat/Golongan Ruang/TMT', v: `${targetPeg?.pangkat} / (${targetPeg?.golRuang}) / ${record.tmtGolongan}`},
               {id: 7, k: 'Jabatan/TMT', v: `${targetPeg?.jabatan} / ${record.tmtJabatan}`},
               {id: 8, k: 'Unit Kerja', v: targetPeg?.unitKerja}
             ].map(i => (
               <tr key={i.id} className="border-b border-black last:border-0">
                  <td className="w-8 text-center p-1 border-r border-black">{i.id}</td>
                  <td className="w-48 p-1 border-r border-black">{i.k}</td>
                  <td className="p-1 px-2 font-bold uppercase">: {i.v || '-'}</td>
               </tr>
             ))}
          </tbody>
       </table>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="PAK Diterbitkan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDeletePAK} message="Hapus dokumen PAK ini?" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">PAK Smart Generator</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Konversi, Akumulasi, & Penetapan (Terpadu)</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined, akumulasi: []}); setActiveView('editor'); setEditorStep('konversi'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat Baru</button>}
        </div>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Nama Pegawai</th><th className="px-4 py-5">Nomor PAK</th><th className="px-4 py-5 text-center">Total AK</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {pakList.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-5">
                          <p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1.5">{p.namaPegawai}</p>
                          <p className="text-[9px] font-mono text-blue-600 font-bold tracking-tighter">NIP. {p.nip}</p>
                       </td>
                       <td className="px-4 py-5"><p className="text-[10px] font-black text-gray-500">{p.nomor}</p></td>
                       <td className="px-4 py-5 text-center font-black text-[10px] text-blue-600">{Number(p.jumlahKredit || 0).toFixed(3)}</td>
                       <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setSelectedPAK(p); setActiveView('preview'); }} className="h-10 px-6 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase shadow-lg">Lihat</button>
                           {(isSuperadmin || canEdit) && <button onClick={() => confirmDelete(p)} className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><i className="bi bi-trash-fill"></i></button>}
                         </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-7xl mx-auto space-y-6 animate-modalEnter">
           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[700px]">
              <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar">
                 {[
                   {id: 'konversi', label: '1. Halaman Konversi', icon: 'bi-1-circle-fill'},
                   {id: 'akumulasi', label: '2. Halaman Akumulasi', icon: 'bi-2-circle-fill'},
                   {id: 'penetapan', label: '3. Halaman PAK Utama', icon: 'bi-3-circle-fill'}
                 ].map(t => (
                   <button key={t.id} onClick={() => setEditorStep(t.id as any)} className={`px-10 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${editorStep === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>
                      <i className={`bi ${t.icon}`}></i> {t.label}
                   </button>
                 ))}
              </div>

              <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                 {editorStep === 'konversi' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-fadeIn">
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">Identitas Umum & Dokumen</h5>
                         <SearchableSelect label="Pilih Pejabat Fungsional" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}`}))} value={formData.nip || ''} onChange={handlePegawaiSelect} />
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="Nomor Karpeg"><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase" value={formData.nomorKarpeg} onChange={e => setFormData({...formData, nomorKarpeg: e.target.value})} /></FormItem>
                            <FormItem label="Nomor Dokumen"><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.nomor} onChange={e => setFormData({...formData, nomor: e.target.value})} /></FormItem>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="Periode Penilaian"><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.periode} onChange={e => setFormData({...formData, periode: e.target.value})} /></FormItem>
                            <FormItem label="TMT Golongan Terakhir"><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.tmtGolongan} onChange={e => setFormData({...formData, tmtGolongan: e.target.value})} /></FormItem>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest">Parameter Nilai Kinerja</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="Predikat SKP">
                               <select className="w-full px-5 py-3 bg-white border-2 rounded-xl text-xs font-black" value={formData.predikat} onChange={e => {
                                 const val = e.target.value;
                                 const mult = PREDIKAT_MULTIPLIER[val] || 1.0;
                                 const ak = (formData.koefisien || 12.5) * mult;
                                 setFormData({...formData, predikat: val, prosentase: mult, akDiperoleh: ak});
                               }}><option>Sangat Baik</option><option>Baik</option><option>Butuh Perbaikan</option><option>Kurang</option><option>Sangat Kurang</option></select>
                            </FormItem>
                            <FormItem label="Persentase (%)"><input type="text" className="w-full px-5 py-3 bg-gray-100 border-2 rounded-xl text-xs font-black" value={(formData.prosentase || 0) * 100} readOnly /></FormItem>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="Koefisien AK/Tahun"><input type="number" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.koefisien} onChange={e => setFormData({...formData, koefisien: parseFloat(e.target.value)})} /></FormItem>
                            <FormItem label="AK Yang Didapat"><input type="text" className="w-full px-5 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-xs font-black text-blue-700" value={Number(formData.akDiperoleh || 0).toFixed(3)} readOnly /></FormItem>
                         </div>
                         <SearchableSelect label="Pejabat Penandatangan" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}`}))} value={formData.penilaiNip || ''} onChange={v => setFormData({...formData, penilaiNip: v})} />
                      </div>
                   </div>
                 )}

                 {editorStep === 'akumulasi' && (
                   <div className="space-y-6 animate-fadeIn">
                      <div className="flex justify-between items-center mb-4">
                         <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-3"><i className="bi bi-collection-fill"></i> Riwayat AK (Integrasi & Tahun Lalu)</h5>
                         <button onClick={() => setFormData({...formData, akumulasi: [...(formData.akumulasi || []), { tahun: 2024, periodik: 'Tahunan', predikat: 'Baik', prosentase: 1.0, koefisien: 12.5, ak: 12.5 }]})} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">+ Tambah Baris Tahun</button>
                      </div>
                      <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-gray-100 space-y-6">
                         <FormItem label="Angka Kredit Integrasi (Konversi Dasar)"><input type="number" step="0.001" className="w-full px-5 py-4 bg-white border-2 border-blue-200 rounded-2xl text-xs font-black text-blue-700" value={formData.akIntegrasi} onChange={e => setFormData({...formData, akIntegrasi: parseFloat(e.target.value)})} placeholder="0.000" /></FormItem>
                         <div className="space-y-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase ml-2">Daftar Akumulasi Tahunan</p>
                            {formData.akumulasi?.map((row, idx) => (
                               <div key={idx} className="grid grid-cols-6 gap-3 bg-white p-4 rounded-2xl border items-end">
                                  <div className="space-y-1"><label className="text-[7px] font-black uppercase text-gray-400">Tahun</label><input type="number" className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={row.tahun} onChange={e => { const list = [...formData.akumulasi!]; list[idx].tahun = parseInt(e.target.value); setFormData({...formData, akumulasi: list}); }} /></div>
                                  <div className="space-y-1"><label className="text-[7px] font-black uppercase text-gray-400">Periode</label><input className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={row.periodik} onChange={e => { const list = [...formData.akumulasi!]; list[idx].periodik = e.target.value; setFormData({...formData, akumulasi: list}); }} /></div>
                                  <div className="space-y-1"><label className="text-[7px] font-black uppercase text-gray-400">Predikat</label><input className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={row.predikat} onChange={e => { const list = [...formData.akumulasi!]; list[idx].predikat = e.target.value; setFormData({...formData, akumulasi: list}); }} /></div>
                                  <div className="space-y-1"><label className="text-[7px] font-black uppercase text-gray-400">Koef</label><input type="number" className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={row.koefisien} onChange={e => { const list = [...formData.akumulasi!]; list[idx].koefisien = parseFloat(e.target.value); list[idx].ak = list[idx].koefisien * list[idx].prosentase; setFormData({...formData, akumulasi: list}); }} /></div>
                                  <div className="space-y-1"><label className="text-[7px] font-black uppercase text-gray-400">AK</label><input type="number" className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black" value={row.ak} onChange={e => { const list = [...formData.akumulasi!]; list[idx].ak = parseFloat(e.target.value); setFormData({...formData, akumulasi: list}); }} /></div>
                                  <button onClick={() => setFormData({...formData, akumulasi: formData.akumulasi?.filter((_, i) => i !== idx)})} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><i className="bi bi-trash"></i></button>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}

                 {editorStep === 'penetapan' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-fadeIn">
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-rose-600 uppercase border-b pb-3 tracking-widest">Komponen Angka Kredit (Halaman 3)</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="AK Dasar"><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.akDasar} onChange={e => setFormData({...formData, akDasar: parseFloat(e.target.value)})} /></FormItem>
                            <FormItem label="AK JF Lama"><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.akJFLama} onChange={e => setFormData({...formData, akJFLama: parseFloat(e.target.value)})} /></FormItem>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="AK Penyesuaian"><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.akPenyesuaian} onChange={e => setFormData({...formData, akPenyesuaian: parseFloat(e.target.value)})} /></FormItem>
                            <FormItem label="AK Peningkatan Pendidikan"><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.akPendidikan} onChange={e => setFormData({...formData, akPendidikan: parseFloat(e.target.value)})} /></FormItem>
                         </div>
                         <FormItem label="Hasil Konversi Saat Ini"><input type="text" className="w-full px-5 py-3.5 bg-blue-50 text-blue-700 border-2 rounded-xl text-xs font-black" value={currentTotalKonversi.toFixed(3)} readOnly /></FormItem>
                      </div>
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-gray-900 uppercase border-b pb-3 tracking-widest">Kebutuhan Syarat Kenaikan</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <FormItem label="AK Min. Naik Pangkat"><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.akMinPangkat} onChange={e => setFormData({...formData, akMinPangkat: parseFloat(e.target.value)})} /></FormItem>
                            <FormItem label="AK Min. Naik Jenjang"><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.akMinJenjang} onChange={e => setFormData({...formData, akMinJenjang: parseFloat(e.target.value)})} /></FormItem>
                         </div>
                         <div className="p-6 bg-blue-950 text-white rounded-3xl space-y-4 shadow-2xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Resume Final AK</p>
                            <div className="flex justify-between items-end">
                               <div><p className="text-[8px] font-bold uppercase text-gray-500">Total Kumulatif</p><h4 className="text-3xl font-black text-white">{currentKumulatif.toFixed(3)}</h4></div>
                               <span className="px-3 py-1 bg-emerald-600 rounded-lg text-[9px] font-black uppercase">Siap Terbit</span>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <div className="px-10 py-10 bg-gray-50/50 border-t flex justify-center gap-6">
                 <button onClick={() => setActiveView('table')} className="px-10 py-5 bg-white border-2 border-gray-200 text-gray-400 rounded-3xl font-black text-[10px] uppercase shadow-sm">Batal</button>
                 <button onClick={handleSave} disabled={syncing} className="px-20 py-5 bg-[#111827] text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                    {syncing ? 'Sinkronisasi Cloud...' : 'Simpan & Finalisasi Dokumen'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && record && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Ulang</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           
           <div className="bg-gray-200/50 py-20 flex flex-col items-center gap-10 overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial p-[1.5cm_2cm]" style={{ width: '210mm', minHeight: '330mm' }}>
                <div className="mb-[3cm]">
                   <DocHeader title="KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT" />
                   <div className="text-center mb-8">
                      <p className="text-[11pt] font-bold uppercase leading-tight">KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT</p>
                      <p className="text-[11pt] font-bold uppercase leading-tight">NOMOR : {record.nomor}</p>
                   </div>
                   <div className="flex justify-between text-[8.5pt] font-bold mb-2">
                      <p>Instansi: Kementerian Hukum</p>
                      <p>Periode: {record.periode}</p>
                   </div>
                   <PersonalInfoTable />
                   <div className="text-[9pt] font-bold mb-2 uppercase">KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT</div>
                   <table className="w-full text-center text-[8.5pt] border-collapse border-2 border-black mb-10">
                      <thead className="bg-gray-200 font-bold border-b-2 border-black">
                         <tr><th colSpan={2} className="p-2 border-r-2 border-black uppercase">Hasil Penilaian Kinerja</th><th rowSpan={2} className="p-2 border-r-2 border-black uppercase w-40">Koefisien Pertahun</th><th rowSpan={2} className="p-2 uppercase">Angka Kredit yang Didapat</th></tr>
                         <tr><th className="p-2 border-r-2 border-black uppercase">Predikat</th><th className="p-2 border-r-2 border-black uppercase">Prosentase</th></tr>
                      </thead>
                      <tbody>
                         <tr className="bg-gray-50 font-bold border-b border-black text-gray-500 italic"><td className="p-1 border-r border-black">1</td><td className="p-1 border-r border-black">2</td><td className="p-1 border-r border-black">3</td><td className="p-1">4</td></tr>
                         <tr className="h-10 font-bold uppercase">
                            <td className="p-2 border-r-2 border-black">{record.predikat}</td>
                            <td className="p-2 border-r-2 border-black">{(Number(record.prosentase) * 100).toFixed(0)}%</td>
                            <td className="p-2 border-r-2 border-black">{record.koefisien}</td>
                            <td className="p-2 font-black text-blue-700">{Number(record.akDiperoleh).toFixed(3)}</td>
                         </tr>
                      </tbody>
                   </table>
                   <div className="flex justify-end text-[10pt] leading-tight text-right mr-10">
                      <div>
                        <p>Ditetapkan di Jakarta</p>
                        <p>Pada tanggal {record.tglDibuat}</p>
                        <p className="font-bold mt-4 mb-24 uppercase">Sekretaris Direktorat Jenderal,</p>
                        <p className="font-bold uppercase underline leading-none">{targetPjb?.nama}</p>
                        <p className="mt-1">NIP {targetPjb?.nip}</p>
                      </div>
                   </div>
                </div>

                <div className="mb-[3cm] pt-[1cm] border-t-2 border-dashed border-gray-300">
                   <DocHeader title="AKUMULASI ANGKA KREDIT" />
                   <div className="text-center mb-8">
                      <p className="text-[11pt] font-bold uppercase leading-tight">AKUMULASI ANGKA KREDIT</p>
                      <p className="text-[11pt] font-bold uppercase leading-tight">NOMOR : {record.nomor}</p>
                   </div>
                   <PersonalInfoTable />
                   <div className="text-[9pt] font-bold mb-2 uppercase">HASIL PENILAIAN ANGKA KREDIT</div>
                   <table className="w-full text-center text-[8pt] border-collapse border-2 border-black">
                      <thead className="bg-gray-200 font-bold border-b-2 border-black uppercase">
                         <tr><th colSpan={4} className="p-2 border-r-2 border-black">Hasil Penilaian Kinerja</th><th rowSpan={2} className="p-2 border-r-2 border-black">Koefisien Pertahun</th><th rowSpan={2} className="p-2">Angka Kredit yang Didapat</th></tr>
                         <tr><th className="p-2 border-r border-black">Tahun</th><th className="p-2 border-r border-black">Periodik</th><th className="p-2 border-r border-black">Predikat</th><th className="p-2 border-r-2 border-black">Prosentase</th></tr>
                      </thead>
                      <tbody>
                         <tr className="bg-gray-50 border-b border-black italic"><td className="p-1 border-r border-black">1</td><td className="p-1 border-r border-black">2</td><td className="p-1 border-r border-black">3</td><td className="p-1 border-r-2 border-black">4</td><td className="p-1 border-r-2 border-black">5</td><td className="p-1">6</td></tr>
                         {(record.akumulasi || []).map((a: any, idx: number) => (
                           <tr key={idx} className="border-b border-black uppercase">
                              <td className="p-2 border-r border-black">{a.tahun}</td>
                              <td className="p-2 border-r border-black">{a.periodik}</td>
                              <td className="p-2 border-r border-black">{a.predikat}</td>
                              <td className="p-2 border-r-2 border-black">{(a.prosentase * 100).toFixed(0)}%</td>
                              <td className="p-2 border-r-2 border-black">{a.koefisien}</td>
                              <td className="p-2 font-bold">{Number(a.ak).toFixed(3)}</td>
                           </tr>
                         ))}
                         <tr className="font-bold border-b border-black uppercase">
                            <td className="p-2 border-r border-black">2024</td>
                            <td className="p-2 border-r border-black">{record.periode}</td>
                            <td className="p-2 border-r border-black">{record.predikat}</td>
                            <td className="p-2 border-r-2 border-black">{(Number(record.prosentase) * 100).toFixed(0)}%</td>
                            <td className="p-2 border-r-2 border-black">{record.koefisien}</td>
                            <td className="p-2">{Number(record.akDiperoleh).toFixed(3)}</td>
                         </tr>
                         <tr className="bg-gray-100 font-bold border-b-2 border-black">
                            <td className="p-2 border-r border-black"></td><td colSpan={4} className="p-2 border-r-2 border-black text-left uppercase">AK Integrasi / Dasar</td><td className="p-2">{Number(record.akIntegrasi).toFixed(3)}</td>
                         </tr>
                         <tr className="bg-gray-200 font-black text-[9pt]">
                            <td className="p-3 border-r-2 border-black"></td><td colSpan={4} className="p-3 border-r-2 border-black text-left uppercase">JUMLAH ANGKA KREDIT YANG DIPEROLEH</td><td className="p-3 text-blue-700">{displayTotalAKHalaman2.toFixed(3)}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                <div className="pt-[1cm] border-t-2 border-dashed border-gray-300">
                   <DocHeader title="PENETAPAN ANGKA KREDIT" />
                   <div className="text-center mb-8">
                      <p className="text-[11pt] font-bold uppercase leading-tight">PENETAPAN ANGKA KREDIT</p>
                      <p className="text-[11pt] font-bold uppercase leading-tight">NOMOR : {record.nomor}</p>
                   </div>
                   <div className="flex justify-between text-[8.5pt] font-bold mb-2">
                      <p>Instansi: Kementerian Hukum</p>
                      <p>Periode: {record.periode}</p>
                   </div>
                   <PersonalInfoTable />
                   <div className="text-[9pt] font-bold mb-2 uppercase">HASIL PENILAIAN ANGKA KREDIT</div>
                   <table className="w-full text-[8.5pt] border-collapse border-2 border-black mb-8">
                      <thead className="bg-gray-200 font-bold text-center border-b-2 border-black uppercase">
                         <tr><th className="p-2 border-r-2 border-black w-8">II</th><th className="p-2 border-r-2 border-black">PENETAPAN ANGKA KREDIT</th><th className="p-2 border-r-2 border-black w-24">LAMA</th><th className="p-2 border-r-2 border-black w-24">BARU</th><th className="p-2 border-r-2 border-black w-24">JUMLAH</th><th className="p-2">KETERANGAN</th></tr>
                      </thead>
                      <tbody>
                         <tr className="bg-gray-50 border-b border-black italic text-center"><td className="p-1 border-r-2 border-black">1</td><td className="p-1 border-r-2 border-black">2</td><td className="p-1 border-r-2 border-black">3</td><td className="p-1 border-r-2 border-black">4</td><td className="p-1 border-r-2 border-black">5</td><td className="p-1">6</td></tr>
                         {[
                           {n: 1, l: 'AK Dasar yang diberikan', v: record.akDasar},
                           {n: 2, l: 'AK JF Lama', v: record.akJFLama},
                           {n: 3, l: 'AK Penyesuaian/Penyetaraan', v: record.akPenyesuaian},
                           {n: 4, l: 'AK Konversi', v: record.akKonversi},
                           {n: 5, l: 'AK dari peningkatan pendidikan', v: record.akPendidikan}
                         ].map(row => (
                           <tr key={row.n} className="border-b border-black">
                              <td className="p-2 text-center border-r-2 border-black font-bold">{row.n}</td>
                              <td className="p-2 border-r-2 border-black">{row.l}</td>
                              <td className="p-2 border-r-2 border-black text-center">-</td>
                              <td className="p-2 border-r-2 border-black text-center font-bold">{Number(row.v).toFixed(3)}</td>
                              <td className="p-2 border-r-2 border-black text-center font-bold">{Number(row.v).toFixed(3)}</td>
                              <td className="p-2"></td>
                           </tr>
                         ))}
                         <tr className="bg-gray-200 font-black">
                            <td colSpan={2} className="p-2 border-r-2 border-black uppercase text-right">JUMLAH ANGKA KREDIT KUMULATIF</td>
                            <td className="p-2 border-r-2 border-black"></td><td className="p-2 border-r-2 border-black"></td>
                            <td className="p-2 text-center text-blue-700">{Number(record.jumlahKredit || 0).toFixed(3)}</td><td className="p-2"></td>
                         </tr>
                      </tbody>
                   </table>

                   <table className="w-full text-[8pt] border-collapse border-2 border-black mb-8 leading-tight">
                      <thead className="bg-gray-100 font-bold text-center border-b border-black uppercase">
                         <tr><th className="p-2 border-r-2 border-black">Keterangan</th><th className="p-2 border-r-2 border-black w-48">Pangkat</th><th className="p-2 w-48">Jenjang Jabatan</th></tr>
                      </thead>
                      <tbody>
                         <tr className="border-b border-black">
                            <td className="p-2 border-r-2 border-black">AK Minimal yang harus dipenuhi</td>
                            <td className="p-2 border-r-2 border-black text-center font-black">{record.akMinPangkat}</td>
                            <td className="p-2 text-center font-black">{record.akMinJenjang}</td>
                         </tr>
                         <tr className="bg-blue-50 font-bold">
                            <td className="p-2 border-r-2 border-black">Kelebihan / Kekurangan AK</td>
                            <td className={`p-2 border-r-2 border-black text-center ${selisihPangkat >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{selisihPangkat.toFixed(3)}</td>
                            <td className={`p-2 text-center ${selisihJenjang >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{selisihJenjang.toFixed(3)}</td>
                         </tr>
                      </tbody>
                   </table>

                   <div className="p-4 border-2 border-black bg-emerald-50 text-center font-black text-[10pt] uppercase mb-10">
                      DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN PANGKAT/JENJANG SETINGKAT LEBIH TINGGI
                   </div>

                   <div className="flex justify-end text-[10pt] leading-tight text-right mr-10">
                      <div>
                        <p>Ditetapkan di Jakarta</p>
                        <p>Pada tanggal {record.tglDibuat}</p>
                        <p className="font-bold mt-4 mb-24 uppercase">Sekretaris Direktorat Jenderal,</p>
                        <p className="font-bold uppercase underline leading-none">{targetPjb?.nama}</p>
                        <p className="mt-1">NIP {targetPjb?.nip}</p>
                      </div>
                   </div>

                   <div className="mt-20 text-[8pt]">
                      <p className="font-bold">Tembusan disampaikan kepada:</p>
                      <ol className="list-decimal ml-4">
                         <li>Sekretaris Jenderal Kementerian Hukum;</li>
                         <li>Direktur Jenderal Kekayaan Intelektual;</li>
                         <li>Kepala Biro Sumber Daya Manusia.</li>
                      </ol>
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
