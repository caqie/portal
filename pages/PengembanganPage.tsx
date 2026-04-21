
import React, { useState, useEffect, useMemo, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchPengembanganFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { Pegawai, Pengembangan } from '../types';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';

const PengembanganPage = () => {
  const navigate = useNavigate();
  const { user, logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [riwayatList, setRiwayatList] = useState<Pengembangan[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'monitoring' | 'riwayat'>('monitoring');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Pengembangan>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Pengembangan | null>(null);
  
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    for (let i = -5; i <= 5; i++) {
      result.push(current + i);
    }
    // Urutkan dari yang terbaru (depan) ke terlama (belakang)
    return result.sort((a, b) => b - a);
  }, []);
  
  const certInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([fetchPegawaiFromSheets(), fetchPengembanganFromSheets()]);
      setPegawaiList(p);
      setRiwayatList(r || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const monitoringData = useMemo(() => {
    return pegawaiList.map(p => {
      const perUser = riwayatList.filter(r => r.nip === p.nip && Number(r.tahun) === filterYear);
      const totalJp = perUser.reduce((acc, curr) => acc + (Number(curr.jumlahJpl) || 0), 0);
      const isPPPK = (p.jenisPegawai || '').toUpperCase().includes('PPPK');
      const targetJp = isPPPK ? 24 : 20;
      const progress = Math.min((totalJp / targetJp) * 100, 100);
      return { ...p, totalJp, targetJp, progress, isEligible: totalJp >= targetJp };
    }).filter(p => (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || p.nip.includes(searchTerm))
      .sort((a, b) => a.totalJp - b.totalJp);
  }, [pegawaiList, riwayatList, filterYear, searchTerm]);

  const handleUploadCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`CERT_${formData.nip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        setFormData(prev => ({ ...prev, fileSertifikatUrl: res.fileUrl }));
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.namaKegiatan || !formData.jumlahJpl) return alert("Mohon lengkapi data wajib.");
    setSyncing(true);
    
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    const payload: Pengembangan = {
      ...formData as any,
      id: formData.id || `BANG-${Date.now()}`,
      namaPegawai: peg?.nama || 'ASN',
      tahun: Number(formData.tahun) || new Date().getFullYear()
    };

    const ok = await syncTableRemote('PENGEMBANGAN', 'SAVE', payload);
    if (ok) {
      logActivity('CREATE', 'Bangkom', `Input Pelatihan: ${payload.namaKegiatan}`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleExportExcel = () => {
    const data = monitoringData.map(p => ({
      'NIP': p.nip,
      'Nama': p.nama,
      'Jenis ASN': p.jenisPegawai,
      'Tahun': filterYear,
      'Total JP': p.totalJp,
      'Minimal JP': p.targetJp,
      'Status': p.isEligible ? 'MEMENUHI' : 'BELUM MEMENUHI'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring Bangkom");
    XLSX.writeFile(wb, `Monitoring_Bangkom_DJKI_${filterYear}.xlsx`);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
        if (!itemToDelete) return;
        setSyncing(true);
        await syncTableRemote('PENGEMBANGAN', 'DELETE', { id: itemToDelete.id });
        await loadData();
        setIsConfirmOpen(false);
        setSyncing(false);
      }} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Pengembangan Kompetensi</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <i className="bi bi-mortarboard-fill text-indigo-600"></i> Monitoring Wajib Bangkom ASN DJKI
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportExcel} className="px-6 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-2 active:scale-95 transition-all">
             <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Ekspor Report
          </button>
          {canEdit && (
            <button onClick={() => { setFormData({ jenisPengembangan: 'Klasikal', kategori: 'Pelatihan', tahun: filterYear, jumlahJpl: 0, tanggalMulai: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="px-10 h-14 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">
              + Catat Pelatihan
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Cari Nama atau NIP..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] shrink-0">
           <button onClick={() => setActiveTab('monitoring')} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'monitoring' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}>Monitoring JP</button>
           <button onClick={() => setActiveTab('riwayat')} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'riwayat' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-400'}`}>Riwayat Lengkap</button>
        </div>
        <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 shadow-inner" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>TAHUN {y}</option>)}
        </select>
      </div>

      {activeTab === 'monitoring' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {loading ? Array(6).fill(0).map((_,i) => <div key={i} className="h-44 bg-white rounded-[3rem] animate-pulse"></div>) : 
            monitoringData.map(p => (
              <div key={p.nip} className="bg-white p-7 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all relative overflow-hidden group">
                 <div className="flex items-center gap-5 mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-gray-50 border-2 border-white shadow-lg overflow-hidden shrink-0">
                       {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-indigo-600 font-black text-xl">{p.nama.charAt(0)}</div>}
                    </div>
                    <div className="min-w-0">
                       <h4 className="text-[12px] font-black text-gray-950 uppercase truncate leading-tight">{p.nama}</h4>
                       <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{p.jenisPegawai} • {p.totalJp} JP</p>
                    </div>
                    {p.isEligible ? (
                       <div className="ml-auto h-8 w-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner"><i className="bi bi-patch-check-fill"></i></div>
                    ) : (
                       <div className="ml-auto h-8 w-8 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shadow-inner"><i className="bi bi-clock-history"></i></div>
                    )}
                 </div>
                 
                 <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase text-gray-400 tracking-widest">
                       <span>Pencapaian JP</span>
                       <span className={p.isEligible ? 'text-emerald-600' : 'text-rose-600'}>{p.totalJp} / {p.targetJp} JP</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                       <div className={`h-full transition-all duration-1000 ${p.isEligible ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.3)]'}`} style={{ width: `${p.progress}%` }}></div>
                    </div>
                    <p className="text-[7px] font-bold text-gray-400 uppercase italic">
                       {p.isEligible ? 'Target terpenuhi untuk tahun ini' : `Kurang ${p.targetJp - p.totalJp} JP lagi`}
                    </p>
                 </div>
              </div>
            )
           )}
         </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr>
                    <th className="px-10 py-5">Pegawai & Waktu</th>
                    <th className="px-4 py-5">Nama Kegiatan</th>
                    <th className="px-4 py-5 text-center">Volume</th>
                    <th className="px-4 py-5 text-center">Sertifikat</th>
                    <th className="px-10 py-5 text-right">Opsi</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {riwayatList.filter(r => r.tahun === filterYear).map(r => (
                   <tr key={r.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-10 py-5">
                         <p className="text-[11px] font-black text-gray-950 uppercase">{r.namaPegawai}</p>
                         <p className="text-[9px] font-bold text-indigo-600">{r.tanggalMulai} s/d {r.tanggalSelesai}</p>
                      </td>
                      <td className="px-4 py-5">
                         <p className="text-[11px] font-black text-gray-800 uppercase leading-tight line-clamp-1">{r.namaKegiatan}</p>
                         <span className="text-[8px] px-2 py-0.5 bg-gray-100 rounded font-black text-gray-400 uppercase tracking-tighter">{r.kategori} • {r.jenisPengembangan}</span>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-gray-950">{r.jumlahJpl} JP</td>
                      <td className="px-4 py-5 text-center">
                         {r.fileSertifikatUrl ? (
                            <button onClick={() => window.open(r.fileSertifikatUrl, '_blank')} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[8px] font-black uppercase border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">Lihat File</button>
                         ) : <span className="text-[8px] font-bold text-gray-300 italic uppercase">Tidak Ada</span>}
                      </td>
                      <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            {canEdit && (
                              <>
                                <button onClick={() => { setFormData(r); setIsModalOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl flex items-center justify-center hover:bg-amber-50"><i className="bi bi-pencil-fill"></i></button>
                                <button onClick={() => { setItemToDelete(r); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-50"><i className="bi bi-trash-fill"></i></button>
                              </>
                            )}
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Log Pengembangan Kompetensi</h4>
                 <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-8">
                 <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jenisPegawai}` }))} value={formData.nip || ''} onChange={v => setFormData({...formData, nip: v})} />
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest">Detail Kegiatan</h5>
                       <FormItem label="Nama Kegiatan / Pelatihan"><input type="text" className={inputClass} value={formData.namaKegiatan || ''} onChange={e => setFormData({...formData, namaKegiatan: e.target.value})} placeholder="MISAL: DIKLAT TEKNIS PEMERIKSA PATEN" /></FormItem>
                       <div className="grid grid-cols-2 gap-4">
                          <FormItem label="Jenis"><select className={inputClass} value={formData.jenisPengembangan} onChange={e => setFormData({...formData, jenisPengembangan: e.target.value})}><option>Klasikal</option><option>Non-Klasikal</option></select></FormItem>
                          <FormItem label="Kategori"><select className={inputClass} value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as any})}><option>Pelatihan</option><option>Seminar</option><option>Kursus</option><option>E-learning</option><option>Coaching</option><option>Mentoring</option><option>Lainnya</option></select></FormItem>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <FormItem label="Tgl Mulai"><input type="date" className={inputClass} value={formData.tanggalMulai} onChange={e => setFormData({...formData, tanggalMulai: e.target.value})} /></FormItem>
                          <FormItem label="Tgl Selesai"><input type="date" className={inputClass} value={formData.tanggalSelesai} onChange={e => setFormData({...formData, tanggalSelesai: e.target.value})} /></FormItem>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <FormItem label="Jumlah JP"><input type="number" className={inputClass} value={formData.jumlahJpl} onChange={e => setFormData({...formData, jumlahJpl: Number(e.target.value)})} /></FormItem>
                          <FormItem label="Tahun Laporan"><input type="number" className={inputClass} value={formData.tahun} onChange={e => setFormData({...formData, tahun: Number(e.target.value)})} /></FormItem>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">Sertifikasi & Bukti</h5>
                       <FormItem label="Penyelenggara"><input type="text" className={inputClass} value={formData.penyelenggara} onChange={e => setFormData({...formData, penyelenggara: e.target.value})} /></FormItem>
                       <FormItem label="Nomor Sertifikat"><input type="text" className={inputClass} value={formData.nomorSertifikat} onChange={e => setFormData({...formData, nomorSertifikat: e.target.value})} /></FormItem>
                       
                       <div className={`p-8 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-4 transition-all ${formData.fileSertifikatUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                             {uploading ? <div className="h-8 w-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div> : <i className={`bi ${formData.fileSertifikatUrl ? 'bi-check-circle-fill text-emerald-600 text-3xl' : 'bi-cloud-arrow-up text-indigo-600 text-3xl'}`}></i>}
                          </div>
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-gray-950">{formData.fileSertifikatUrl ? 'Sertifikat Terunggah' : 'Unggah Sertifikat'}</p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">PDF / JPG / PNG (Maks 10MB)</p>
                          </div>
                          <button type="button" onClick={() => certInputRef.current?.click()} className="px-6 py-2.5 bg-white border border-gray-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase shadow-sm">Pilih File Sertifikat</button>
                          <input type="file" ref={certInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUploadCert} />
                       </div>
                    </div>
                 </div>
              </form>
              <div className="p-8 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="px-16 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 disabled:bg-gray-300 flex items-center gap-3">
                    {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan & Sinkronkan</span>
                 </button>
              </div>
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

export default PengembanganPage;
