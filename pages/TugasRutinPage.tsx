
import React, { useState, useEffect } from 'react';
import { TugasRutin, TaskType } from '../types';
import { fetchTugasRutinFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { BULAN, TASK_LABELS } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';

const TugasRutinPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TugasRutin | null>(null);
  const [formData, setFormData] = useState<Partial<TugasRutin>>({
    data: {}
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TugasRutin | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Define shared classes in component scope to avoid "not found" errors in the main render block
  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black outline-none focus:border-blue-600 transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest";

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTugasRutinFromSheets();
      setTasks(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    const payload = { 
      ...formData, 
      id: editingTask?.id || Date.now().toString(), 
      timestamp: new Date().toISOString() 
    };
    const success = await syncTableRemote('TUGAS_RUTIN', 'SAVE', payload);
    if (success) {
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
      logActivity(editingTask ? 'UPDATE' : 'CREATE', 'Log Tugas', `Simpan log: ${payload.jenis}`);
    } else {
      alert("Gagal menyimpan ke cloud. Cek koneksi Anda.");
    }
    setSyncing(false);
  };

  const updateDataField = (field: string, value: any) => {
    setFormData({
      ...formData,
      data: {
        ...(formData.data || {}),
        [field]: value
      }
    });
  };

  const renderDynamicFields = () => {
    const data = formData.data || {};
    // Removed local definitions of inputClass and labelClass since they are now at component scope

    switch (formData.jenis) {
      case TaskType.PELANTIKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Tanggal Pelantikan</label><input type="date" className={inputClass} value={data.tanggal_pelantikan || ''} onChange={e => updateDataField('tanggal_pelantikan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Judul Pelantikan</label><input type="text" className={inputClass} value={data.judul_pelantikan || ''} onChange={e => updateDataField('judul_pelantikan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Nama Terlantik</label><input type="text" className={inputClass} value={data.nama_pelantikan || ''} onChange={e => updateDataField('nama_pelantikan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Tempat Pelantikan</label><input type="text" className={inputClass} value={data.tempat_pelantikan || ''} onChange={e => updateDataField('tempat_pelantikan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Peserta</label><input type="number" className={inputClass} value={data.jumlah_peserta_pelantikan || ''} onChange={e => updateDataField('jumlah_peserta_pelantikan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_pelantikan || ''} onChange={e => updateDataField('link_dokumen_pelantikan', e.target.value)} /></div>
          </div>
        );
      case TaskType.APEL:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Tanggal Apel</label><input type="date" className={inputClass} value={data.tanggal_apel || ''} onChange={e => updateDataField('tanggal_apel', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Tempat Apel</label><input type="text" className={inputClass} value={data.tempat_apel || ''} onChange={e => updateDataField('tempat_apel', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Peserta</label><input type="number" className={inputClass} value={data.jumlah_peserta_apel || ''} onChange={e => updateDataField('jumlah_peserta_apel', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Keterangan</label><input type="text" className={inputClass} value={data.keterangan_apel || ''} onChange={e => updateDataField('keterangan_apel', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_apel || ''} onChange={e => updateDataField('link_dokumen_apel', e.target.value)} /></div>
          </div>
        );
      case TaskType.LHKPN:
      case TaskType.LHKASN:
        const p = formData.jenis.toLowerCase();
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Unit Kerja</label><input type="text" className={inputClass} value={data[`unit_${p}`] || ''} onChange={e => updateDataField(`unit_${p}`, e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Laporan</label><input type="number" className={inputClass} value={data[`jumlah_${p}`] || ''} onChange={e => updateDataField(`jumlah_${p}`, e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Daftar Nama</label><textarea className={inputClass} rows={3} value={data[`daftar_nama_${p}`] || ''} onChange={e => updateDataField(`daftar_nama_${p}`, e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data[`link_dokumen_${p}`] || ''} onChange={e => updateDataField(`link_dokumen_${p}`, e.target.value)} /></div>
          </div>
        );
      case TaskType.TUGAS_BELAJAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Jenis Tubel</label><input type="text" className={inputClass} value={data.jenis_tugas_belajar || ''} onChange={e => updateDataField('jenis_tugas_belajar', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Nama Pegawai</label><input type="text" className={inputClass} value={data.nama_tugas_belajar || ''} onChange={e => updateDataField('nama_tugas_belajar', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jenjang</label><input type="text" className={inputClass} value={data.jenjang_pendidikan || ''} onChange={e => updateDataField('jenjang_pendidikan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jurusan</label><input type="text" className={inputClass} value={data.jurusan_tugas_belajar || ''} onChange={e => updateDataField('jurusan_tugas_belajar', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Kampus</label><input type="text" className={inputClass} value={data.kampus_tugas_belajar || ''} onChange={e => updateDataField('kampus_tugas_belajar', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Periode</label><input type="text" className={inputClass} value={data.periode_tugas_belajar || ''} onChange={e => updateDataField('periode_tugas_belajar', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_tugas_belajar || ''} onChange={e => updateDataField('link_dokumen_tugas_belajar', e.target.value)} /></div>
          </div>
        );
      case TaskType.MUTASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Nama Pegawai</label><input type="text" className={inputClass} value={data.nama_pegawai_mutasi || ''} onChange={e => updateDataField('nama_pegawai_mutasi', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Diproses</label><input type="number" className={inputClass} value={data.jumlah_diproses_mutasi || ''} onChange={e => updateDataField('jumlah_diproses_mutasi', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jabatan Lama</label><input type="text" className={inputClass} value={data.jabatan_lama || ''} onChange={e => updateDataField('jabatan_lama', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Unit Lama</label><input type="text" className={inputClass} value={data.unit_kerja_lama || ''} onChange={e => updateDataField('unit_kerja_lama', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jabatan Baru</label><input type="text" className={inputClass} value={data.jabatan_baru || ''} onChange={e => updateDataField('jabatan_baru', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Unit Baru</label><input type="text" className={inputClass} value={data.unit_kerja_baru || ''} onChange={e => updateDataField('unit_kerja_baru', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_mutasi || ''} onChange={e => updateDataField('link_dokumen_mutasi', e.target.value)} /></div>
          </div>
        );
      case TaskType.KARTU_SUAMI_ISTRI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Usulan Istri</label><input type="number" className={inputClass} value={data.jumlah_usulan_istri || ''} onChange={e => updateDataField('jumlah_usulan_istri', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Diterima Istri</label><input type="number" className={inputClass} value={data.jumlah_diterima_istri || ''} onChange={e => updateDataField('jumlah_diterima_istri', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Usulan Suami</label><input type="number" className={inputClass} value={data.jumlah_usulan_suami || ''} onChange={e => updateDataField('jumlah_usulan_suami', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Diterima Suami</label><input type="number" className={inputClass} value={data.jumlah_diterima_suami || ''} onChange={e => updateDataField('jumlah_diterima_suami', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_kartu_suami_istri || ''} onChange={e => updateDataField('link_dokumen_kartu_suami_istri', e.target.value)} /></div>
          </div>
        );
      case TaskType.PERKAWINAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Jumlah Perkawinan</label><input type="number" className={inputClass} value={data.jumlah_perkawinan || ''} onChange={e => updateDataField('jumlah_perkawinan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Perceraian</label><input type="number" className={inputClass} value={data.jumlah_perceraian || ''} onChange={e => updateDataField('jumlah_perceraian', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Kelahiran</label><input type="number" className={inputClass} value={data.jumlah_kelahiran || ''} onChange={e => updateDataField('jumlah_kelahiran', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_perkawinan || ''} onChange={e => updateDataField('link_dokumen_perkawinan', e.target.value)} /></div>
          </div>
        );
      case TaskType.GRATIFIKASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Jumlah Gratifikasi</label><input type="number" className={inputClass} value={data.jumlah_gratifikasi || ''} onChange={e => updateDataField('jumlah_gratifikasi', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Benturan Kepentingan</label><input type="number" className={inputClass} value={data.jumlah_benturan_kepentingan || ''} onChange={e => updateDataField('jumlah_benturan_kepentingan', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_gratifikasi || ''} onChange={e => updateDataField('link_dokumen_gratifikasi', e.target.value)} /></div>
          </div>
        );
      case TaskType.HUKUMAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Hukuman Ringan</label><input type="number" className={inputClass} value={data.jumlah_ringan || ''} onChange={e => updateDataField('jumlah_ringan', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Hukuman Sedang</label><input type="number" className={inputClass} value={data.jumlah_sedang || ''} onChange={e => updateDataField('jumlah_sedang', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Hukuman Berat</label><input type="number" className={inputClass} value={data.jumlah_berat || ''} onChange={e => updateDataField('jumlah_berat', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_hukuman || ''} onChange={e => updateDataField('link_dokumen_hukuman', e.target.value)} /></div>
          </div>
        );
      case TaskType.PENSIUN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Jumlah Usulan</label><input type="number" className={inputClass} value={data.jumlah_usulan_pensiun || ''} onChange={e => updateDataField('jumlah_usulan_pensiun', e.target.value)} /></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah SK</label><input type="number" className={inputClass} value={data.jumlah_sk_pensiun || ''} onChange={e => updateDataField('jumlah_sk_pensiun', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_pensiun || ''} onChange={e => updateDataField('link_dokumen_pensiun', e.target.value)} /></div>
          </div>
        );
      case TaskType.GAJI:
      case TaskType.KGB:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            <div className="space-y-1"><label className={labelClass}>Status Pegawai</label><select className={inputClass} value={data.status_pegawai_gaji || ''} onChange={e => updateDataField('status_pegawai_gaji', e.target.value)}><option value="PNS">PNS</option><option value="PPPK">PPPK</option></select></div>
            <div className="space-y-1"><label className={labelClass}>Jumlah Diproses</label><input type="number" className={inputClass} value={data.jumlah_diproses_gaji || ''} onChange={e => updateDataField('jumlah_diproses_gaji', e.target.value)} /></div>
            <div className="col-span-full space-y-1"><label className={labelClass}>Link Dokumen</label><input type="text" className={inputClass} value={data.link_dokumen_gaji || ''} onChange={e => updateDataField('link_dokumen_gaji', e.target.value)} /></div>
          </div>
        );
      default:
        return (
          <div className="space-y-2"><label className={labelClass}>Narasi Detail</label><textarea rows={5} className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl text-xs font-bold leading-relaxed focus:border-blue-600 outline-none resize-none shadow-inner" value={formData.detail || ''} onChange={e => setFormData({...formData, detail: e.target.value})} placeholder="Input detail manual jika kategori tidak terdefinisi..." /></div>
        );
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={async () => {
          if (!taskToDelete) return;
          setSyncing(true);
          const success = await syncTableRemote('TUGAS_RUTIN', 'DELETE', { id: taskToDelete.id });
          if (success) {
            await loadData();
            setIsConfirmOpen(false);
            logActivity('DELETE', 'Log Tugas', `Hapus log: ${taskToDelete.jenis}`);
          } else {
            alert("Gagal menghapus dari cloud.");
          }
          setSyncing(false);
        }} 
        message={`Hapus log ini secara permanen dari cloud?`}
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">Logistik & Tugas</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Monthly Personnel Service Logs • DJKI Cloud</p>
        </div>
        {canEdit && (
          <button onClick={() => { setEditingTask(null); setFormData({ bulan: BULAN[new Date().getMonth()], tahun: new Date().getFullYear(), jenis: TaskType.PELANTIKAN, data: {} }); setIsModalOpen(true); }} className="w-full md:w-auto h-16 px-10 bg-[#111827] text-white rounded-[1.8rem] font-black text-[11px] uppercase shadow-2xl tracking-widest transition-all active:scale-95 flex items-center justify-center gap-4">
             <i className="bi bi-plus-lg text-lg"></i> Tambah Log Tugas
          </button>
        )}
      </div>

      <div className="bg-white rounded-[3rem] md:rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-gray-50">
           {loading ? Array(4).fill(0).map((_,i)=><div key={i} className="p-8 h-40 animate-pulse bg-gray-50/50"></div>) : (
             tasks.length > 0 ? tasks.map(t => (
               <div key={t.id} className="p-8 flex flex-col md:flex-row md:items-center gap-6 group hover:bg-blue-50/10 transition-colors">
                  <div className="flex-1 space-y-4">
                     <div className="flex justify-between items-start">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg uppercase border border-blue-100 tracking-widest">{TASK_LABELS[t.jenis] || t.jenis}</span>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.bulan} {t.tahun}</p>
                     </div>
                     <p className="text-[13px] font-bold text-gray-950 uppercase leading-relaxed line-clamp-2">{t.detail || `Log aktivitas ${TASK_LABELS[t.jenis] || t.jenis}`}</p>
                     <div className="flex items-center gap-3">
                        <div className="h-6 w-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-[10px]"><i className="bi bi-clock"></i></div>
                        <p className="text-[9px] font-black text-gray-400 uppercase">Input: {new Date(t.timestamp).toLocaleString('id-ID')}</p>
                     </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                     <button onClick={() => { setEditingTask(t); setFormData({ ...t }); setIsModalOpen(true); }} className="h-12 px-6 flex items-center justify-center bg-amber-50 text-amber-600 rounded-2xl border border-amber-100 transition-all hover:bg-amber-600 hover:text-white"><i className="bi bi-pencil-square mr-2"></i> <span className="text-[9px] font-black uppercase">Edit</span></button>
                     {isSuperadmin && <button onClick={() => { setTaskToDelete(t); setIsConfirmOpen(true); }} className="h-12 w-12 flex items-center justify-center bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 transition-all hover:bg-rose-600 hover:text-white"><i className="bi bi-trash-fill"></i></button>}
                  </div>
               </div>
             )) : (
                <div className="py-32 text-center">
                   <i className="bi bi-clipboard-x text-6xl text-gray-200 block mb-6"></i>
                   <p className="text-[11px] font-black uppercase text-gray-300 tracking-widest">Belum ada log tugas yang tersimpan</p>
                </div>
             )
           )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-4">
           <div className="fixed inset-0 bg-gray-950/85 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-4xl md:rounded-[3.5rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col h-full md:h-auto md:max-h-[95vh]">
              <div className="p-8 md:p-10 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter leading-none">{editingTask ? 'Perbarui Log Tugas' : 'Registrasi Log Baru'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-3">Smart Categorization Engine • Real-Time Cloud</p>
                 </div>
                 <button onClick={() => !syncing && setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center bg-white border border-gray-100 text-gray-400 hover:text-rose-500 rounded-2xl transition-all shadow-sm"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-8 md:p-10 overflow-y-auto custom-scrollbar space-y-10 flex-1">
                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-3"><i className="bi bi-1-circle-fill"></i> Klasifikasi Periode & Kategori</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Bulan</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600 transition-all" value={formData.bulan} onChange={e => setFormData({...formData, bulan: e.target.value})}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">Tahun</label><input type="number" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all" value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-indigo-600 uppercase ml-2 tracking-widest">Jenis Tugas Rutin</label><select className="w-full px-6 py-3.5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-xs font-black outline-none focus:border-indigo-600" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as any, data: {} })}>{Object.entries(TASK_LABELS).map(([val, label]) => <option key={val} value={val}>{label.toUpperCase()}</option>)}</select></div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest flex items-center gap-3"><i className="bi bi-2-circle-fill"></i> Detail Data Spesifik Kategori</h5>
                    <div className="bg-gray-50/30 p-6 rounded-[2.5rem] border border-dashed border-gray-200 min-h-[150px]">
                        {renderDynamicFields()}
                    </div>
                 </div>

                 <div className="space-y-2"><label className={labelClass}>Ringkasan Narasi (Muncul di List)</label><textarea rows={2} className="w-full px-8 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold leading-relaxed outline-none focus:border-blue-600 resize-none" value={formData.detail || ''} onChange={e => setFormData({...formData, detail: e.target.value})} placeholder="Opsional: Tuliskan ringkasan singkat log ini..." /></div>
              </form>
              <div className="p-8 md:p-10 bg-gray-50 border-t flex flex-col md:flex-row gap-4 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal</button>
                 <button onClick={handleSave} disabled={syncing} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-4 transition-all">
                    {syncing ? <div className="h-5 w-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-upload-fill text-xl"></i>} 
                    <span>{syncing ? 'Menyinkronkan...' : 'Simpan Log ke Cloud'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TugasRutinPage;
