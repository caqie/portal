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

const BERAKHLAK_INIT: PerilakuKerjaRow[] = [
  { poin: 'Berorientasi Pelayanan', deskripsi: 'Memahami dan memenuhi kebutuhan masyarakat; Ramah, cekatan, solutif, dan dapat diandalkan; Melakukan perbaikan tiada henti', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Ketika Menjelaskan Mudah Dipahami' },
  { poin: 'Akuntabel', deskripsi: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin dan berintegritas tinggi; Menggunakan kekayaan dan barang milik negara secara bertanggung jawab, efektif dan efisien; Tidak menyalahgunakan kewenangan jabatan', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Berani Berterus terang dan Mengakui Kesalahan' },
  { poin: 'Kompeten', deskripsi: 'Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah; Membantu orang lain belajar; Melaksanakan tugas dengan kualitas terbaik', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Selalu Mengupayakan Yang Terbaik' },
  { poin: 'Harmonis', deskripsi: 'Menghargai setiap orang apapun latar belakangnya; Suka menolong orang lain; Membangun lingkungan kerja yang kondusif', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Untuk Dapat Dipertahankan' },
  { poin: 'Loyal', deskripsi: 'Memegang teguh ideologi Pancasila dan Undang-Undang Dasar Negara Republik Indonesia; Setia kepada NKRI; Menjaga nama baik ASN, Pimpinan, Instansi; Menjaga rahasia jabatan', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Selalu siap Ketika Pimpinan Membutuhkan' },
  { poin: 'Adaptif', deskripsi: 'Cepat menyesuaikan diri menghadapi perubahan; Terus berinovasi dan mengembangkan kreativitas; Bertindak proaktif', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Semangat Untuk Mempelajari Hal Baru' },
  { poin: 'Kolaboratif', deskripsi: 'Memberi kesempatan kepada berbagai pihak untuk berkontribusi; Terbuka dalam bekerja sama; Menggerakkan pemanfaatan berbagai sumber daya', ekspektasi: 'Untuk Dapat Dipertahankan', umpanBalik: 'Selalu Melibatkan Unit Kerja Lain' }
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
    tahun: 2026,
    periodeMulai: '01 Januari 2026',
    periodeSelesai: '31 Desember 2026',
    tglPenilaian: '06 Januari 2026',
    capaianOrganisasi: 'ISTIMEWA',
    ratingHasilKerja: 'DI ATAS EKSPEKTASI',
    ratingPerilaku: 'DI ATAS EKSPEKTASI',
    predikatKinerja: 'SANGAT BAIK',
    hasilKerja: [
      { rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan', rencanaPegawai: 'Terlaksananya pelayanan administrasi kepegawaian', aspek: 'Kualitas', indikator: 'Persentase layanan administrasi kepegawaian yang diselesaikan', target: '100%', realisasi: '100%', umpanBalik: 'Secara Keseluruhan Sudah Sesuai' }
    ],
    perilakuKerja: BERAKHLAK_INIT,
    lampiran: {
      dukungan: ['Dibutuhkan dukungan sarana prasarana berupa PC, printer, scanner'],
      skema: ['Laporan triwulan', 'Bukti kerja dalam bentuk laporan'],
      konsekuensi: ['Bila target tercapai akan mendapat apresiasi', 'Bila target tidak tercapai maka harus ada percepatan']
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

  const handleAddHasilKerja = () => {
    setFormData({
      ...formData,
      hasilKerja: [...(formData.hasilKerja || []), { rencanaPimpinan: '', rencanaPegawai: '', aspek: 'Kualitas', indikator: '', target: '', realisasi: '', umpanBalik: '' }]
    });
  };

  const handleRemoveHasilKerja = (index: number) => {
    setFormData({
      ...formData,
      hasilKerja: (formData.hasilKerja || []).filter((_, i) => i !== index)
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
        logActivity('CREATE', 'SKP', `Simpan SKP: ${newRecord.namaPegawai}`);
      }
    } catch (e) { alert("Gagal sinkronisasi."); } finally { setSyncing(false); }
  };

  const confirmDelete = (item: SKPRecord) => {
    setSkpToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleDeleteSKP = async () => {
    if (!skpToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('SKP', 'DELETE', { id: skpToDelete.id });
      if (success) {
        setSkpList(prev => prev.filter(s => s.id !== skpToDelete.id));
        setIsConfirmOpen(false);
        setSkpToDelete(null);
      }
    } catch (e) { alert("Gagal menghapus."); } finally { setSyncing(false); }
  };

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }))
  , [pegawaiList]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`SKP_${selectedSKP?.namaPegawai.replace(/\s+/g, '_')}.pdf`);
  };

  const pjb = pegawaiList.find(p => p.nip === (selectedSKP?.penilaiNip || formData.penilaiNip));
  const peg = pegawaiList.find(p => p.nip === (selectedSKP?.nip || formData.nip));
  const atasan = pegawaiList.find(p => p.nip === (selectedSKP?.atasanPenilaiNip || formData.atasanPenilaiNip));

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Berhasil Dibuat" />
      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteSKP}
        loading={syncing}
        message={`Hapus data SKP "${skpToDelete?.namaPegawai}"?`}
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">SKP PRO</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sistem Evaluasi Kinerja Kuantitatif</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined}); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat Baru</button>}
        </div>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
              <tr><th className="px-10 py-5">Identitas Pegawai</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5 text-center">Predikat</th><th className="px-10 py-5 text-right">Opsi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {skpList.map(s => (
                <tr key={s.id} className="hover:bg-blue-50/5 group transition-colors">
                  <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1.5">{s.namaPegawai}</p><p className="text-[9px] font-mono text-blue-600 font-bold tracking-tighter">NIP. {s.nip}</p></td>
                  <td className="px-4 py-5 text-center font-black text-[10px] text-gray-600">{s.tahun}</td>
                  <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-blue-50 text-blue-700 text-[8px] font-black rounded-lg border border-blue-100 uppercase">{s.predikatKinerja}</span></td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setSelectedSKP(s); setActiveView('preview'); }} className="h-10 px-6 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase shadow-lg transition-all">Lihat</button>
                      {(isSuperadmin || canEdit) && (
                        <button onClick={() => confirmDelete(s)} className="h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 hover:bg-rose-50 transition-all"><i className="bi bi-trash-fill"></i></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {skpList.length === 0 && !loading && (
                 <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Belum ada dokumen SKP terbit</td></tr>
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
                   {id: 'profil', label: '1. Profil & Periode', icon: 'bi-person-badge-fill'},
                   {id: 'hasil', label: '2. Hasil Kerja', icon: 'bi-table'},
                   {id: 'perilaku', label: '3. Perilaku Kerja', icon: 'bi-heart-fill'},
                   {id: 'lampiran', label: '4. Lampiran', icon: 'bi-paperclip'}
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
                         <SearchableSelect label="Pegawai yang Dinilai" options={searchablePegawaiOptions} value={formData.nip || ''} onChange={v => setFormData({...formData, nip: v})} />
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Tahun</label><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Tgl Penilaian</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.tglPenilaian} onChange={e => setFormData({...formData, tglPenilaian: e.target.value})} /></div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Periode Mulai</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.periodeMulai} onChange={e => setFormData({...formData, periodeMulai: e.target.value})} /></div>
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Periode Selesai</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={formData.periodeSelesai} onChange={e => setFormData({...formData, periodeSelesai: e.target.value})} /></div>
                         </div>
                      </div>
                      <div className="space-y-8">
                         <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-check-fill"></i> Tim Penilai</h5>
                         <SearchableSelect label="Pejabat Penilai Kinerja" options={searchablePegawaiOptions} value={formData.penilaiNip || ''} onChange={v => setFormData({...formData, penilaiNip: v})} />
                         <SearchableSelect label="Atasan Pejabat Penilai" options={searchablePegawaiOptions} value={formData.atasanPenilaiNip || ''} onChange={v => setFormData({...formData, atasanPenilaiNip: v})} />
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Capaian Organisasi</label><select className="w-full px-5 py-3.5 bg-blue-50 border-2 border-blue-100 rounded-2xl text-xs font-black text-blue-700 outline-none focus:border-blue-600" value={formData.capaianOrganisasi} onChange={e => setFormData({...formData, capaianOrganisasi: e.target.value})}><option value="ISTIMEWA">ISTIMEWA</option><option value="BAIK">BAIK</option><option value="KURANG">KURANG</option></select></div>
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Predikat Akhir</label><select className="w-full px-5 py-3.5 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-xs font-black text-emerald-700 outline-none focus:border-emerald-600" value={formData.predikatKinerja} onChange={e => setFormData({...formData, predikatKinerja: e.target.value})}><option value="SANGAT BAIK">SANGAT BAIK</option><option value="BAIK">BAIK</option><option value="BUTUH PERBAIKAN">BUTUH PERBAIKAN</option><option value="KURANG">KURANG</option></select></div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Rating Hasil Kerja</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none" value={formData.ratingHasilKerja} onChange={e => setFormData({...formData, ratingHasilKerja: e.target.value.toUpperCase()})} /></div>
                            <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Rating Perilaku</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none" value={formData.ratingPerilaku} onChange={e => setFormData({...formData, ratingPerilaku: e.target.value.toUpperCase()})} /></div>
                         </div>
                      </div>
                   </div>
                 )}

                 {editorTab === 'hasil' && (
                   <div className="space-y-8 animate-fadeIn">
                      <div className="flex justify-between items-center mb-4 border-b pb-6">
                         <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-3"><i className="bi bi-diagram-3-fill"></i> Matriks Rencana Hasil Kerja</h5>
                         <button onClick={handleAddHasilKerja} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl active:scale-95 transition-all">+ Baris Rencana</button>
                      </div>
                      <div className="space-y-6">
                        {(formData.hasilKerja || []).map((row, idx) => (
                          <div key={idx} className="p-8 bg-gray-50 border-2 border-gray-100 rounded-[2.5rem] space-y-6 relative group transition-all hover:border-blue-200 hover:bg-white shadow-sm">
                             <button onClick={() => handleRemoveHasilKerja(idx)} className="absolute top-8 right-8 h-10 w-10 text-rose-500 bg-white border border-rose-100 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-rose-50"><i className="bi bi-x-lg"></i></button>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Rencana Hasil Kerja Pimpinan</label><textarea rows={2} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold leading-relaxed resize-none focus:border-blue-600 outline-none" value={row.rencanaPimpinan} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].rencanaPimpinan = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Rencana Hasil Kerja Pegawai</label><textarea rows={2} className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold leading-relaxed resize-none focus:border-blue-600 outline-none" value={row.rencanaPegawai} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].rencanaPegawai = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Aspek</label><select className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={row.aspek} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].aspek = e.target.value as any;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }}><option>Kualitas</option><option>Kuantitas</option><option>Waktu</option><option>Biaya</option></select></div>
                                <div className="md:col-span-2 space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Indikator Kinerja Individu</label><input className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold focus:border-blue-600 outline-none" value={row.indikator} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].indikator = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Target</label><input className="w-full px-5 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs font-black text-center focus:border-blue-600 outline-none" value={row.target} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].target = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                                <div className="space-y-2"><label className="text-[9px] font-black text-blue-600 uppercase ml-2">Realisasi (Bukti Dukung)</label><input className="w-full px-5 py-4 bg-blue-50 border-2 border-blue-100 rounded-2xl text-xs font-black text-blue-700 focus:border-blue-600 outline-none" value={row.realisasi} onChange={e => {
                                   const newHasil = [...(formData.hasilKerja || [])];
                                   newHasil[idx].realisasi = e.target.value;
                                   setFormData({...formData, hasilKerja: newHasil});
                                }} /></div>
                                <div className="space-y-2"><label className="text-[9px] font-black text-emerald-600 uppercase ml-2">Umpan Balik Pimpinan</label><input className="w-full px-5 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl text-xs font-black text-emerald-700 focus:border-emerald-600 outline-none" value={row.umpanBalik} onChange={e => {
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

                 {editorTab === 'lampiran' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-fadeIn">
                       <div className="space-y-6">
                          <h6 className="text-[10px] font-black text-gray-950 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-2"><i className="bi bi-box-seam-fill text-blue-600"></i> Dukungan Sumber Daya</h6>
                          {(formData.lampiran?.dukungan || []).map((d, i) => (
                             <textarea key={i} rows={2} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600 resize-none" value={d} onChange={e => {
                                const newDuk = [...(formData.lampiran?.dukungan || [])];
                                newDuk[i] = e.target.value;
                                setFormData({...formData, lampiran: {...formData.lampiran!, dukungan: newDuk}});
                             }} />
                          ))}
                       </div>
                       <div className="space-y-6">
                          <h6 className="text-[10px] font-black text-gray-950 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-2"><i className="bi bi-layout-text-window-reverse text-indigo-600"></i> Skema Pertanggungjawaban</h6>
                          {(formData.lampiran?.skema || []).map((s, i) => (
                             <textarea key={i} rows={2} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-indigo-600 resize-none" value={s} onChange={e => {
                                const newSkem = [...(formData.lampiran?.skema || [])];
                                newSkem[i] = e.target.value;
                                setFormData({...formData, lampiran: {...formData.lampiran!, skema: newSkem}});
                             }} />
                          ))}
                       </div>
                       <div className="space-y-6">
                          <h6 className="text-[10px] font-black text-gray-950 uppercase tracking-[0.2em] border-b pb-4 flex items-center gap-2"><i className="bi bi-exclamation-triangle-fill text-rose-600"></i> Konsekuensi</h6>
                          {(formData.lampiran?.konsekuensi || []).map((k, i) => (
                             <textarea key={i} rows={2} className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-rose-600 resize-none" value={k} onChange={e => {
                                const newKon = [...(formData.lampiran?.konsekuensi || [])];
                                newKon[i] = e.target.value;
                                setFormData({...formData, lampiran: {...formData.lampiran!, konsekuensi: newKon}});
                             }} />
                          ))}
                       </div>
                    </div>
                 )}
              </div>

              <div className="px-10 py-10 bg-gray-50/50 border-t flex justify-center gap-6">
                 <button onClick={() => setActiveView('table')} className="px-10 py-5 bg-white border-2 border-gray-200 text-gray-400 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all">Batalkan</button>
                 <button onClick={handleSaveSKP} disabled={syncing} className="px-20 py-5 bg-[#111827] text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 disabled:bg-gray-300 transition-all flex items-center gap-3">
                    {syncing ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-upload-fill"></i>}
                    <span>{syncing ? 'Memproses Cloud...' : 'Simpan & Finalisasi Dokumen'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedSKP && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('table')} className="px-8 py-4 bg-white text-gray-500 border-2 border-gray-100 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-sm">Kembali ke Arsip</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-[#111827] text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.15em] shadow-xl flex items-center gap-4 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill text-xl"></i> CETAK PDF (F4)</button>
           </div>
           
           <div className="bg-gray-200/50 py-20 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial" style={{ width: '210mm', height: '330mm', padding: '1.2cm 1.5cm' }}>
                <div className="text-center mb-8">
                   <p className="text-[11pt] font-bold uppercase leading-tight">REKAMAN INFORMASI UMPAN BALIK BERKELANJUTAN</p>
                   <p className="text-[11pt] font-bold uppercase leading-tight">PENDEKATAN HASIL KERJA KUANTITATIF</p>
                   <p className="text-[10pt] font-bold uppercase mt-1">BAGI JABATAN FUNGSIONAL UMUM</p>
                   <p className="text-[10pt] font-bold uppercase">PERIODE : AKHIR</p>
                </div>
                
                <div className="text-[8.5pt] mb-4 border-2 border-black">
                   <div className="grid grid-cols-2">
                      <div className="border-r-2 border-black p-3 space-y-1.5">
                         <div className="bg-gray-100 p-1 text-center font-bold border-b-2 border-black -m-3 mb-2 uppercase">PEGAWAI YANG DINILAI</div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NAMA</span><span>:</span><span className="font-bold uppercase">{peg?.nama}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NIP</span><span>:</span><span>{peg?.nip}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>PANGKAT/GOL</span><span>:</span><span className="uppercase">{peg?.pangkat} / ({peg?.golRuang})</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>JABATAN</span><span>:</span><span className="uppercase">{peg?.jabatan}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>UNIT KERJA</span><span>:</span><span className="uppercase">{peg?.unitKerja}</span></div>
                      </div>
                      <div className="p-3 space-y-1.5">
                         <div className="bg-gray-100 p-1 text-center font-bold border-b-2 border-black -m-3 mb-2 uppercase">PEJABAT PENILAI KINERJA</div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NAMA</span><span>:</span><span className="font-bold uppercase">{pjb?.nama}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>NIP</span><span>:</span><span>{pjb?.nip}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>PANGKAT/GOL</span><span>:</span><span className="uppercase">{pjb?.pangkat} / ({pjb?.golRuang})</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>JABATAN</span><span>:</span><span className="uppercase">{pjb?.jabatan}</span></div>
                         <div className="grid grid-cols-[100px_5px_1fr] gap-x-2"><span>UNIT KERJA</span><span>:</span><span className="uppercase">{pjb?.unitKerja}</span></div>
                      </div>
                   </div>
                </div>

                <div className="mb-4">
                  <p className="text-[9pt] font-bold mb-1 uppercase">HASIL KERJA</p>
                  <table className="w-full text-[7.5pt] border-collapse border-2 border-black leading-tight">
                    <thead>
                      <tr className="bg-gray-200/80 text-center font-bold uppercase">
                        <th className="border-2 border-black p-2 w-8">NO</th>
                        <th className="border-2 border-black p-2 w-44">RENCANA HASIL KERJA PIMPINAN YANG DIINTERVENSI</th>
                        <th className="border-2 border-black p-2 w-44">RENCANA HASIL KERJA</th>
                        <th className="border-2 border-black p-2 w-24">ASPEK</th>
                        <th className="border-2 border-black p-2">INDIKATOR KINERJA INDIVIDU</th>
                        <th className="border-2 border-black p-2 w-16">TARGET</th>
                        <th className="border-2 border-black p-2 w-20">REALISASI</th>
                        <th className="border-2 border-black p-2 w-40">UMPAN BALIK BERKELANJUTAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSKP.hasilKerja.map((row, i) => (
                        <tr key={i}>
                          <td className="border-2 border-black p-2 text-center align-top">{i+1}</td>
                          <td className="border-2 border-black p-2 align-top">{row.rencanaPimpinan}</td>
                          <td className="border-2 border-black p-2 align-top">{row.rencanaPegawai}</td>
                          <td className="border-2 border-black p-2 text-center align-top font-bold">{row.aspek}</td>
                          <td className="border-2 border-black p-2 align-top">{row.indikator}</td>
                          <td className="border-2 border-black p-2 text-center align-top font-bold">{row.target}</td>
                          <td className="border-2 border-black p-2 text-center align-top font-bold">{row.realisasi}</td>
                          <td className="border-2 border-black p-2 italic align-top">{row.umpanBalik}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="border-2 border-black p-2 font-bold uppercase" colSpan={8}>B. KINERJA TAMBAHAN</td>
                      </tr>
                      <tr>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                        <td className="border-2 border-black p-2 text-center">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mb-4">
                  <div className="border-2 border-black bg-blue-50/50 p-2 font-bold text-[9pt] flex justify-between items-center uppercase border-b-0">
                    <span>RATING HASIL KERJA*</span>
                    <span className="text-blue-700 tracking-widest">{selectedSKP.ratingHasilKerja}</span>
                  </div>
                  <p className="text-[9pt] font-bold mb-1 uppercase">PERILAKU KERJA</p>
                  <table className="w-full text-[7pt] border-collapse border-2 border-black leading-tight">
                    <thead>
                      <tr className="bg-gray-200/80 font-bold text-center uppercase">
                        <th className="border-2 border-black p-2 w-10">NO</th>
                        <th className="border-2 border-black p-2">POIN PERILAKU KERJA (BERAKHLAK)</th>
                        <th className="border-2 border-black p-2 w-64">EKSPEKTASI KHUSUS PIMPINAN</th>
                        <th className="border-2 border-black p-2 w-64">UMPAN BALIK BERKELANJUTAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSKP.perilakuKerja.map((p, i) => (
                        <tr key={i}>
                          <td className="border-2 border-black p-2 text-center font-bold">{i+1}</td>
                          <td className="border-2 border-black p-2">
                             <p className="font-bold text-[7.5pt]">{p.poin}</p>
                             <p className="text-[6.5pt] text-gray-600 italic leading-none">{p.deskripsi}</p>
                          </td>
                          <td className="border-2 border-black p-2 align-top italic">{p.ekspektasi}</td>
                          <td className="border-2 border-black p-2 font-bold italic text-blue-800 align-top">{p.umpanBalik}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-2 gap-x-4 mb-4">
                   <div className="border-2 border-black bg-rose-50/50 p-2 font-bold text-[9pt] flex justify-between items-center uppercase">
                      <span>RATING PERILAKU*</span>
                      <span className="text-rose-700 tracking-widest">{selectedSKP.ratingPerilaku}</span>
                   </div>
                   <div className="border-2 border-black bg-emerald-50/50 p-2 font-bold text-[9pt] flex justify-between items-center uppercase">
                      <span>PREDIKAT KINERJA*</span>
                      <span className="text-emerald-700 tracking-widest">{selectedSKP.predikatKinerja}</span>
                   </div>
                </div>

                <div className="mt-8 grid grid-cols-2 text-center text-[9.5pt] leading-tight">
                   <div></div>
                   <div className="flex flex-col items-center">
                      <p>Jakarta, {selectedSKP.tglPenilaian}</p>
                      <p className="mb-20">Pejabat Penilai Kinerja,</p>
                      <p className="font-bold uppercase underline leading-none">{pjb?.nama}</p>
                      <p className="mt-1">NIP {pjb?.nip}</p>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .bg-white { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default SKPPage;