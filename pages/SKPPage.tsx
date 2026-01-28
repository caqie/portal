
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchSKPFromSheets } from '../spreadsheetService';
import { Pegawai, SKPRecord, HasilKerjaRow, PerilakuKerjaRow } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

// MATRIKS PREDIKAT KINERJA (Permenpan 6/2022)
const getPredikatOtomatis = (hasil: string, perilaku: string) => {
  const h = hasil.toUpperCase();
  const p = perilaku.toUpperCase();

  if (h === 'DI ATAS EKSPEKTASI') {
    if (p === 'DI ATAS EKSPEKTASI') return 'SANGAT BAIK';
    if (p === 'SESUAI EKSPEKTASI') return 'BAIK';
    return 'BUTUH PERBAIKAN';
  }
  if (h === 'SESUAI EKSPEKTASI') {
    if (p === 'DI ATAS EKSPEKTASI') return 'BAIK';
    if (p === 'SESUAI EKSPEKTASI') return 'BAIK';
    return 'KURANG';
  }
  if (h === 'DI BAWAH EKSPEKTASI') {
    if (p === 'DI ATAS EKSPEKTASI') return 'BUTUH PERBAIKAN';
    if (p === 'SESUAI EKSPEKTASI') return 'KURANG';
    return 'SANGAT KURANG';
  }
  return 'BAIK';
};

const BERAKHLAK_INIT: PerilakuKerjaRow[] = [
  { poin: 'Berorientasi Pelayanan', deskripsi: 'Memahami dan memenuhi kebutuhan masyarakat; Ramah, cekatan, solutif, dan dapat diandalkan; Melakukan perbaikan tiada henti', ekspektasi: 'Selalu memberikan pelayanan terbaik di atas standar', umpanBalik: 'Sangat responsif terhadap keluhan' },
  { poin: 'Akuntabel', deskripsi: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin dan berintegritas tinggi', ekspektasi: 'Menjadi teladan integritas bagi rekan kerja', umpanBalik: 'Disiplin waktu sangat baik' },
  { poin: 'Kompeten', deskripsi: 'Meningkatkan kompetensi diri; Membantu orang lain belajar; Melaksanakan tugas dengan kualitas terbaik', ekspektasi: 'Aktif mengikuti pengembangan kompetensi diri', umpanBalik: 'Cepat menguasai aplikasi baru' },
  { poin: 'Harmonis', deskripsi: 'Menghargai setiap orang; Suka menolong orang lain; Membangun lingkungan kerja yang kondusif', ekspektasi: 'Membangun suasana kerja yang inklusif', umpanBalik: 'Rekan tim merasa nyaman bekerja bersama' },
  { poin: 'Loyal', deskripsi: 'Memegang teguh ideologi Pancasila; Menjaga nama baik ASN; Menjaga rahasia jabatan', ekspektasi: 'Menempatkan kepentingan bangsa di atas segalanya', umpanBalik: 'Selalu siap sedia saat dibutuhkan pimpinan' },
  { poin: 'Adaptif', deskripsi: 'Cepat menyesuaikan diri; Berinovasi; Bertindak proaktif', ekspektasi: 'Proaktif memberikan usulan perbaikan proses bisnis', umpanBalik: 'Sangat gesit menyesuaikan diri' },
  { poin: 'Kolaboratif', deskripsi: 'Memberi kesempatan kepada berbagai pihak; Terbuka dalam bekerja sama; Menggerakkan pemanfaatan berbagai sumber daya', ekspektasi: 'Aktif berkoordinasi lintas unit kerja', umpanBalik: 'Berhasil memediasi antar divisi' }
];

const SKPPage = () => {
  const navigate = useNavigate();
  const { user, canEdit, logActivity, isSuperadmin } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'editor' | 'preview'>('table');
  const [editorTab, setEditorTab] = useState<'profil' | 'hasil' | 'perilaku' | 'lampiran'>('profil');
  const [selectedSKP, setSelectedSKP] = useState<SKPRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [skpToDelete, setSkpToDelete] = useState<SKPRecord | null>(null);

  const [formData, setFormData] = useState<Partial<SKPRecord>>({
    tahun: 2024,
    periodeMulai: '01 Januari 2024',
    periodeSelesai: '31 Desember 2024',
    tglPenilaian: '02 Januari 2025',
    capaianOrganisasi: 'BAIK',
    ratingHasilKerja: 'SESUAI EKSPEKTASI',
    ratingPerilaku: 'SESUAI EKSPEKTASI',
    predikatKinerja: 'BAIK',
    hasilKerja: [
      { rencanaPimpinan: 'Terselenggaranya pengelolaan SDM yang akuntabel', rencanaPegawai: 'Melakukan verifikasi data pegawai', aspek: 'Kualitas', indikator: 'Persentase ketepatan data', target: '100%', realisasi: '100%', umpanBalik: 'Pertahankan kualitas kerja' }
    ],
    perilakuKerja: BERAKHLAK_INIT,
    lampiran: {
      dukungan: ['Sarana prasarana penunjang tugas', 'Dukungan anggaran operasional'],
      skema: ['Pelaporan periodik melalui sistem', 'Verifikasi oleh atasan langsung'],
      konsekuensi: ['Pemberian reward bagi capaian di atas target', 'Bimbingan kinerja jika tidak mencapai target']
    }
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchSKPFromSheets()]);
      setPegawaiList(pRes);
      setSkpList(sRes as any || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const updatePredikatKinerja = (newRatingHasil?: string, newRatingPerilaku?: string) => {
    const hasil = newRatingHasil || formData.ratingHasilKerja || 'SESUAI EKSPEKTASI';
    const perilaku = newRatingPerilaku || formData.ratingPerilaku || 'SESUAI EKSPEKTASI';
    const predikat = getPredikatOtomatis(hasil, perilaku);
    setFormData(prev => ({ ...prev, ratingHasilKerja: hasil, ratingPerilaku: perilaku, predikatKinerja: predikat }));
  };

  const handleAddHasilKerja = () => {
    setFormData({
      ...formData,
      hasilKerja: [...(formData.hasilKerja || []), { rencanaPimpinan: '', rencanaPegawai: '', aspek: 'Kualitas', indikator: '', target: '', realisasi: '', umpanBalik: '' }]
    });
  };

  const handleRemoveHasilKerja = (index: number) => {
    setFormData({
      ...formData,
      hasilKerja: (formData.hasilKerja || []).filter((_: HasilKerjaRow, i: number) => i !== index)
    });
  };

  const handleSaveSKP = async () => {
    if (!formData.nip || !formData.penilaiNip) return alert("Pilih Pegawai dan Pejabat Penilai");
    setSyncing(true);
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    const newRecord: SKPRecord = { 
      ...formData,
      id: formData.id || Date.now().toString(), 
      namaPegawai: peg?.nama || 'ASN', 
    } as SKPRecord;

    try {
      const success = await syncTableRemote('SKP', 'SAVE', newRecord);
      if (success) {
        await loadInitialData();
        setSelectedSKP(newRecord);
        setActiveView('preview');
        setShowSuccess(true);
        logActivity('CREATE', 'SKP', `Simpan SKP Evaluasi: ${newRecord.namaPegawai}`);
      }
    } catch (e) { alert("Gagal sinkronisasi data."); } finally { setSyncing(false); }
  };

  const confirmDelete = (item: SKPRecord) => { setSkpToDelete(item); setIsConfirmOpen(true); };
  const handleDeleteSKP = async () => {
    if (!skpToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('SKP', 'DELETE', { id: skpToDelete.id });
      if (success) {
        setSkpList(prev => prev.filter((s: SKPRecord) => s.id !== skpToDelete.id));
        setIsConfirmOpen(false);
      }
    } catch (e) { alert("Gagal menghapus."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`EVALUASI_SKP_${selectedSKP?.namaPegawai.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const pjb = pegawaiList.find(p => p.nip === (selectedSKP?.penilaiNip || formData.penilaiNip));
  const peg = pegawaiList.find(p => p.nip === (selectedSKP?.nip || formData.nip));
  const atasan = pegawaiList.find(p => p.nip === (selectedSKP?.atasanPenilaiNip || formData.atasanPenilaiNip));

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Berhasil Disimpan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDeleteSKP} loading={syncing} message={`Hapus data SKP "${skpToDelete?.namaPegawai}"?`} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">SKP & Evaluasi Kinerja</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Smart Performance Evaluator DJKI</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined}); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Input Baru</button>}
        </div>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
              <tr><th className="px-10 py-5">Identitas Pegawai</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5 text-center">Hasil/Perilaku</th><th className="px-4 py-5 text-center">Predikat Akhir</th><th className="px-10 py-5 text-right">Opsi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {skpList.map((s: SKPRecord) => (
                <tr key={s.id} className="hover:bg-blue-50/5 group transition-colors">
                  <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1.5">{s.namaPegawai}</p><p className="text-[9px] font-mono text-blue-600 font-bold tracking-tighter">NIP. {s.nip}</p></td>
                  <td className="px-4 py-5 text-center font-black text-[10px] text-gray-600">{s.tahun}</td>
                  <td className="px-4 py-5 text-center">
                    <p className="text-[7px] font-black text-gray-400 uppercase leading-none">{s.ratingHasilKerja}</p>
                    <p className="text-[7px] font-black text-gray-400 uppercase mt-1 leading-none">{s.ratingPerilaku}</p>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border shadow-sm ${
                      s.predikatKinerja === 'SANGAT BAIK' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      s.predikatKinerja === 'BAIK' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>{s.predikatKinerja}</span>
                  </td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setSelectedSKP(s); setActiveView('preview'); }} className="h-9 px-5 rounded-xl bg-gray-900 text-white text-[9px] font-black uppercase shadow-lg">Lihat PDF</button>
                      {(isSuperadmin || canEdit) && (
                        <button onClick={() => confirmDelete(s)} className="h-9 w-9 bg-white text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 hover:bg-rose-50 transition-all shadow-sm"><i className="bi bi-trash-fill"></i></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {skpList.length === 0 && !loading && (
                 <tr><td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest animate-pulse">Database Evaluasi Kinerja Kosong</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-7xl mx-auto space-y-6 animate-modalEnter">
           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[700px]">
              <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar">
                 {[
                   {id: 'profil', label: '1. Identitas & Rating', icon: 'bi-person-badge-fill'},
                   {id: 'hasil', label: '2. Evaluasi Hasil', icon: 'bi-table'},
                   {id: 'perilaku', label: '3. Evaluasi Perilaku', icon: 'bi-heart-fill'}
                 ].map(t => (
                   <button key={t.id} onClick={() => setEditorTab(t.id as any)} className={`px-10 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${editorTab === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>
                      <i className={`bi ${t.icon}`}></i> {t.label}
                   </button>
                 ))}
              </div>

              <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                 {editorTab === 'profil' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-fadeIn">
                      <div className="space-y-8">
                         <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-fill"></i> Objek Penilaian</h5>
                         <SearchableSelect label="ASN yang Dievaluasi" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }))} value={formData.nip || ''} onChange={v => setFormData({...formData, nip: v})} />
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className={labelClass}>Tahun Evaluasi</label><input type="number" className={inputClass} value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                            <div className="space-y-1.5"><label className={labelClass}>Tanggal Cetak</label><input type="text" className={inputClass} value={formData.tglPenilaian} onChange={e => setFormData({...formData, tglPenilaian: e.target.value})} /></div>
                         </div>
                         <SearchableSelect label="Pejabat Penilai Kinerja" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }))} value={formData.penilaiNip || ''} onChange={v => setFormData({...formData, penilaiNip: v})} />
                      </div>
                      <div className="space-y-8">
                         <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-award-fill"></i> Matriks Rating & Predikat</h5>
                         <div className="p-8 bg-blue-950 rounded-[2.5rem] shadow-2xl space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1.5">
                                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-2">Rating Hasil Kerja</label>
                                  <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-[10px] font-black text-white outline-none focus:bg-white/20" value={formData.ratingHasilKerja} onChange={e => updatePredikatKinerja(e.target.value, undefined)}>
                                     <option value="DI ATAS EKSPEKTASI" className="bg-slate-900">DI ATAS EKSPEKTASI</option>
                                     <option value="SESUAI EKSPEKTASI" className="bg-slate-900">SESUAI EKSPEKTASI</option>
                                     <option value="DI BAWAH EKSPEKTASI" className="bg-slate-900">DI BAWAH EKSPEKTASI</option>
                                  </select>
                               </div>
                               <div className="space-y-1.5">
                                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-2">Rating Perilaku</label>
                                  <select className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-[10px] font-black text-white outline-none focus:bg-white/20" value={formData.ratingPerilaku} onChange={e => updatePredikatKinerja(undefined, e.target.value)}>
                                     <option value="DI ATAS EKSPEKTASI" className="bg-slate-900">DI ATAS EKSPEKTASI</option>
                                     <option value="SESUAI EKSPEKTASI" className="bg-slate-900">SESUAI EKSPEKTASI</option>
                                     <option value="DI BAWAH EKSPEKTASI" className="bg-slate-900">DI BAWAH EKSPEKTASI</option>
                                  </select>
                               </div>
                            </div>
                            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                               <div>
                                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Predikat Akhir Kinerja</p>
                                  <h4 className="text-2xl font-black text-emerald-400">{formData.predikatKinerja}</h4>
                                </div>
                                <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30">Auto Calc</span>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}

                 {editorTab === 'hasil' && (
                   <div className="space-y-8 animate-fadeIn">
                      <div className="flex justify-between items-center mb-4 border-b pb-6">
                         <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-3"><i className="bi bi-diagram-3-fill"></i> Matriks Rencana Hasil Kerja</h5>
                         <button onClick={handleAddHasilKerja} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl">+ Baris Rencana</button>
                      </div>
                      <div className="space-y-6">
                        {(formData.hasilKerja || []).map((row, idx) => (
                          <div key={idx} className="p-8 bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] space-y-6 relative group transition-all hover:border-blue-200 hover:bg-white shadow-sm">
                             <button onClick={() => handleRemoveHasilKerja(idx)} className="absolute top-8 right-8 h-10 w-10 text-rose-500 bg-white border border-rose-100 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-50"><i className="bi bi-x-lg"></i></button>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Rencana Hasil Kerja Pimpinan</label><textarea rows={2} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold leading-relaxed resize-none focus:border-blue-600 outline-none" value={row.rencanaPimpinan} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].rencanaPimpinan = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Rencana Hasil Kerja Pegawai</label><textarea rows={2} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold leading-relaxed resize-none focus:border-blue-600 outline-none" value={row.rencanaPegawai} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].rencanaPegawai = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Indikator</label><input className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-[10px] font-bold outline-none" value={row.indikator} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].indikator = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Realisasi (Bukti Dukung)</label><input className="w-full px-5 py-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] font-black text-blue-700 outline-none" value={row.realisasi} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].realisasi = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                                <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-emerald-600 uppercase ml-2">Umpan Balik Berkelanjutan</label><input className="w-full px-5 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-[10px] font-black text-emerald-700 outline-none" value={row.umpanBalik} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].umpanBalik = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}

                 {editorTab === 'perilaku' && (
                    <div className="space-y-8 animate-fadeIn">
                       <h5 className="text-[11px] font-black text-rose-600 uppercase tracking-widest border-b pb-6 flex items-center gap-3"><i className="bi bi-heart-fill"></i> Standar Perilaku BerAKHLAK</h5>
                       {(formData.perilakuKerja || []).map((row, idx) => (
                          <div key={idx} className="p-8 bg-white border-2 border-gray-50 rounded-[3rem] shadow-sm grid grid-cols-1 md:grid-cols-12 gap-10 items-center hover:bg-rose-50/10 transition-colors">
                             <div className="md:col-span-3">
                                <h6 className="text-[11px] font-black text-gray-950 uppercase tracking-tight">{row.poin}</h6>
                                <p className="text-[8.5px] text-gray-400 font-bold mt-2 uppercase leading-relaxed">{row.deskripsi}</p>
                             </div>
                             <div className="md:col-span-4 space-y-2">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Ekspektasi Khusus</label>
                                <textarea rows={2} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold leading-relaxed resize-none focus:border-rose-600 outline-none" value={row.ekspektasi} onChange={e => {
                                   const newPerilaku = [...(formData.perilakuKerja || [])];
                                   newPerilaku[idx].ekspektasi = e.target.value;
                                   setFormData({...formData, perilakuKerja: newPerilaku});
                                }} />
                             </div>
                             <div className="md:col-span-5 space-y-2">
                                <label className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Umpan Balik Berkelanjutan</label>
                                <textarea rows={2} className="w-full px-5 py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-[11px] font-black text-rose-700 leading-relaxed resize-none focus:border-rose-600 outline-none" value={row.umpanBalik} onChange={e => {
                                   const newPerilaku = [...(formData.perilakuKerja || [])];
                                   newPerilaku[idx].umpanBalik = e.target.value;
                                   setFormData({...formData, perilakuKerja: newPerilaku});
                                }} />
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div className="px-10 py-10 bg-gray-50/50 border-t flex justify-center gap-6">
                 <button onClick={() => setActiveView('table')} className="px-10 py-5 bg-white border-2 border-gray-200 text-gray-400 rounded-3xl font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">Batalkan</button>
                 <button onClick={handleSaveSKP} disabled={syncing} className="px-20 py-5 bg-[#111827] text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 disabled:bg-gray-300 transition-all flex items-center gap-3">
                    {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-upload-fill"></i>}
                    <span>Simpan & Finalisasi Evaluasi</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedSKP && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('table')} className="px-8 py-4 bg-white text-gray-500 border-2 border-gray-100 rounded-3xl text-[11px] font-black uppercase shadow-sm">Kembali ke Arsip</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-[#111827] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.15em] shadow-xl flex items-center gap-4 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill text-xl"></i> CETAK PDF (F4)</button>
           </div>
           
           <div className="bg-gray-200/50 py-20 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial" style={{ width: '210mm', minHeight: '330mm', padding: '1.2cm 1.5cm' }}>
                <div className="text-center mb-8">
                   <p className="text-[11pt] font-bold uppercase text-black leading-tight">EVALUASI KINERJA PEGAWAI NEGERI SIPIL</p>
                   <p className="text-[11pt] font-bold uppercase text-black leading-tight">PENDEKATAN HASIL KERJA KUANTITATIF</p>
                   <p className="text-[10pt] font-bold uppercase text-black mt-1">PERIODE : AKHIR TAHUN {selectedSKP.tahun}</p>
                </div>
                
                <div className="text-[8.5pt] mb-4 border-2 border-black">
                   <div className="grid grid-cols-2">
                      <div className="border-r-2 border-black p-3 space-y-1.5 text-black">
                         <div className="bg-gray-100 p-1 text-center font-bold border-b-2 border-black -m-3 mb-2 uppercase text-black">PEGAWAI YANG DINILAI</div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NAMA</span><span>:</span><span className="font-bold uppercase text-black">{peg?.nama}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NIP</span><span>:</span><span className="text-black">{peg?.nip}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>PANGKAT/GOL</span><span>:</span><span className="uppercase text-black">{peg?.pangkat} / ({peg?.golRuang})</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>JABATAN</span><span>:</span><span className="uppercase text-black">{peg?.jabatan}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>UNIT KERJA</span><span>:</span><span className="uppercase text-black">{peg?.unitKerja}</span></div>
                      </div>
                      <div className="p-3 space-y-1.5 text-black">
                         <div className="bg-gray-100 p-1 text-center font-bold border-b-2 border-black -m-3 mb-2 uppercase text-black">PEJABAT PENILAI KINERJA</div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NAMA</span><span>:</span><span className="font-bold uppercase text-black">{pjb?.nama}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NIP</span><span>:</span><span className="text-black">{pjb?.nip}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>PANGKAT/GOL</span><span>:</span><span className="uppercase text-black">{pjb?.pangkat} / ({pjb?.golRuang})</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>JABATAN</span><span>:</span><span className="uppercase text-black">{pjb?.jabatan}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>UNIT KERJA</span><span>:</span><span className="uppercase text-black">{pjb?.unitKerja}</span></div>
                      </div>
                   </div>
                </div>

                <div className="mb-4">
                  <p className="text-[9pt] font-bold mb-1 uppercase text-black">I. HASIL KERJA</p>
                  <table className="w-full text-[7.5pt] border-collapse border-2 border-black leading-tight text-black">
                    <thead>
                      <tr className="bg-gray-200/80 text-center font-bold uppercase text-black">
                        <th className="border-2 border-black p-2 w-8 text-black">NO</th>
                        <th className="border-2 border-black p-2 w-44 text-black">RENCANA HASIL KERJA PIMPINAN</th>
                        <th className="border-2 border-black p-2 w-44 text-black">RENCANA HASIL KERJA</th>
                        <th className="border-2 border-black p-2 text-black">INDIKATOR & TARGET</th>
                        <th className="border-2 border-black p-2 w-24 text-black">REALISASI</th>
                        <th className="border-2 border-black p-2 w-40 text-black">UMPAN BALIK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSKP.hasilKerja.map((row, i) => (
                        <tr key={i}>
                          <td className="border-2 border-black p-2 text-center align-top text-black">{i+1}</td>
                          <td className="border-2 border-black p-2 align-top text-black">{row.rencanaPimpinan}</td>
                          <td className="border-2 border-black p-2 align-top text-black">{row.rencanaPegawai}</td>
                          <td className="border-2 border-black p-2 align-top text-black">
                             <p className="font-bold">{row.indikator}</p>
                             <p className="mt-1 italic">Target: {row.target}</p>
                          </td>
                          <td className="border-2 border-black p-2 text-center align-top font-bold text-black">{row.realisasi}</td>
                          <td className="border-2 border-black p-2 italic align-top text-black">{row.umpanBalik}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-2 border-black bg-gray-50 p-2 font-bold text-[8.5pt] flex justify-between items-center uppercase mt-[-2px] text-black">
                    <span className="text-black">RATING HASIL KERJA:</span>
                    <span className="tracking-widest text-black">{selectedSKP.ratingHasilKerja}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-[9pt] font-bold mb-1 uppercase text-black">II. PERILAKU KERJA</p>
                  <table className="w-full text-[7pt] border-collapse border-2 border-black leading-tight text-black">
                    <thead>
                      <tr className="bg-gray-200/80 font-bold text-center uppercase text-black">
                        <th className="border-2 border-black p-2 w-10 text-black">NO</th>
                        <th className="border-2 border-black p-2 text-black">POIN PERILAKU (BerAKHLAK)</th>
                        <th className="border-2 border-black p-2 w-64 text-black">EKSPEKTASI KHUSUS</th>
                        <th className="border-2 border-black p-2 w-64 text-black">UMPAN BALIK BERKELANJUTAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSKP.perilakuKerja.map((p, i) => (
                        <tr key={i}>
                          <td className="border-2 border-black p-2 text-center font-bold text-black">{i+1}</td>
                          <td className="border-2 border-black p-2 text-black">
                             <p className="font-bold text-[7.5pt] text-black uppercase">{p.poin}</p>
                          </td>
                          <td className="border-2 border-black p-2 align-top italic text-black">{p.ekspektasi}</td>
                          <td className="border-2 border-black p-2 font-bold italic text-black align-top">{p.umpanBalik}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-2 border-black bg-gray-50 p-2 font-bold text-[8.5pt] flex justify-between items-center uppercase mt-[-2px] text-black">
                    <span className="text-black">RATING PERILAKU KERJA:</span>
                    <span className="tracking-widest text-black">{selectedSKP.ratingPerilaku}</span>
                  </div>
                </div>

                <div className="p-4 border-2 border-black bg-gray-100 text-center space-y-1 mb-10 text-black">
                   <p className="text-[8pt] font-bold uppercase text-gray-500">KESIMPULAN EVALUASI KINERJA:</p>
                   <h4 className="text-[14pt] font-black uppercase tracking-widest text-black underline">{selectedSKP.predikatKinerja}</h4>
                </div>

                <div className="grid grid-cols-2 text-center text-[9.5pt] leading-tight text-black mt-16">
                   <div></div>
                   <div className="flex flex-col items-center">
                      <p className="text-black">Jakarta, {selectedSKP.tglPenilaian}</p>
                      <p className="mb-24 text-black">Pejabat Penilai Kinerja,</p>
                      <p className="font-bold uppercase underline leading-none text-black">{pjb?.nama}</p>
                      <p className="mt-1 text-black">NIP {pjb?.nip}</p>
                   </div>
                </div>
                
                <div className="absolute bottom-6 left-10 text-[7pt] text-gray-300 font-bold uppercase tracking-widest italic">
                    DICETAK MELALUI PORTAL E-KINERJA DJKI PADA {new Date().toLocaleString('id-ID')}
                </div>
              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default SKPPage;
