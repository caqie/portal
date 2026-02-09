
import React, { useState, useEffect, useMemo } from 'react';
import { TugasRutin, TaskType } from '../types';
import { fetchTugasRutinFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { BULAN, TASK_LABELS, UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import * as XLSX from 'xlsx';

const TugasRutinPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TugasRutin | null>(null);
  const [formData, setFormData] = useState<Partial<TugasRutin>>({ detail: '', data: {} });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Data berhasil disimpan.');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TugasRutin | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [filterMonth, setFilterMonth] = useState(BULAN[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTugasRutinFromSheets();
      setTasks([...data].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.bulan === filterMonth && Number(t.tahun) === filterYear);
  }, [tasks, filterMonth, filterYear]);

  const updateDataField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      data: { ...(prev.data || {}), [field]: value }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    const taskId = editingTask?.id || `TR-${Date.now()}`;
    // Detail dikosongkan karena field form narasi dihilangkan sesuai request
    const payload = { 
      ...formData, 
      id: taskId, 
      detail: '', 
      timestamp: new Date().toISOString() 
    };
    const ok = await syncTableRemote('TUGAS_RUTIN', 'SAVE', payload);
    if(ok) { 
      setSuccessMsg(`Data log ${TASK_LABELS[formData.jenis || ''] || 'tugas'} berhasil disinkronkan.`);
      await loadData();
      setIsModalOpen(false); 
      setShowSuccess(true); 
    }
    setSyncing(false);
  };

  const handleDeleteTask = async () => {
    if(!taskToDelete) return;
    setSyncing(true);
    try {
      const ok = await syncTableRemote('TUGAS_RUTIN', 'DELETE', { id: taskToDelete.id });
      if(ok) {
        logActivity('DELETE', 'Tugas Rutin', `Hapus log: ${TASK_LABELS[taskToDelete.jenis]}`);
        setSuccessMsg("Data log tugas berhasil dihapus secara permanen.");
        // Update state lokal langsung agar UI responsif tanpa nunggu fetch ulang
        setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
        setIsConfirmOpen(false);
        setShowSuccess(true);
      } else {
        alert("Gagal menghapus data dari server.");
      }
    } catch (e) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setSyncing(false);
    }
  };

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  const renderDynamicInputs = () => {
    const data = formData.data || {};
    const type = formData.jenis;
    
    const Input = ({ label, field, placeholder = "", typeAttr = "text", full = false }: any) => (
      <div className={`space-y-1.5 ${full ? 'col-span-full' : ''}`}>
        <label className={labelClass}>{label}</label>
        <input type={typeAttr} className={inputClass} value={data[field] || ''} onChange={e => updateDataField(field, e.target.value)} placeholder={placeholder} />
      </div>
    );

    const TextArea = ({ label, field, placeholder = "" }: any) => (
      <div className="space-y-1.5 col-span-full">
        <label className={labelClass}>{label}</label>
        <textarea rows={2} className={`${inputClass} normal-case h-20 resize-none font-bold`} value={data[field] || ''} onChange={e => updateDataField(field, e.target.value)} placeholder={placeholder} />
      </div>
    );

    const LinkInput = ({ label, field }: any) => (
      <Input label={label} field={field} placeholder="https://drive.google.com/..." full={true} />
    );

    switch(type) {
      case TaskType.PELANTIKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Tanggal Pelantikan" field="tanggal_pelantikan" typeAttr="date" />
            <Input label="Judul Pelantikan" field="judul_pelantikan" />
            <Input label="Nama Pelantikan" field="nama_pelantikan" />
            <Input label="Tempat Pelantikan" field="tempat_pelantikan" />
            <Input label="Jumlah Peserta" field="jumlah_peserta_pelantikan" typeAttr="number" />
            <LinkInput label="Link Dokumen Pelantikan" field="link_dokumen_pelantikan" />
          </div>
        );
      case TaskType.APEL:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Tanggal Apel" field="tanggal_apel" typeAttr="date" />
            <Input label="Tempat Apel" field="tempat_apel" />
            <Input label="Jumlah Peserta" field="jumlah_peserta_apel" typeAttr="number" />
            <TextArea label="Keterangan Apel" field="keterangan_apel" />
            <LinkInput label="Link Dokumen Apel" field="link_dokumen_apel" />
          </div>
        );
      case TaskType.LHKPN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Unit LHKPN" field="unit_lhkpn" />
            <Input label="Jumlah LHKPN" field="jumlah_lhkpn" typeAttr="number" />
            <TextArea label="Daftar Nama LHKPN" field="daftar_nama_lhkpn" />
            <LinkInput label="Link Dokumen LHKPN" field="link_dokumen_lhkpn" />
          </div>
        );
      case TaskType.LHKASN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Unit LHKASN" field="unit_lhkasn" />
            <Input label="Jumlah LHKASN" field="jumlah_lhkasn" typeAttr="number" />
            <TextArea label="Daftar Nama LHKASN" field="daftar_nama_lhkasn" />
            <LinkInput label="Link Dokumen LHKASN" field="link_dokumen_lhkasn" />
          </div>
        );
      case TaskType.TUGAS_BELAJAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jenis Tugas Belajar" field="jenis_tugas_belajar" />
            <Input label="Nama Pegawai" field="nama_tugas_belajar" />
            <Input label="Jenjang Pendidikan" field="jenjang_pendidikan" />
            <Input label="Jurusan" field="jurusan_tugas_belajar" />
            <Input label="Kampus" field="kampus_tugas_belajar" />
            <Input label="Periode" field="periode_tugas_belajar" />
            <LinkInput label="Link Dokumen Tugas Belajar" field="link_dokumen_tugas_belajar" />
          </div>
        );
      case TaskType.MAGANG:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Permohonan" field="jumlah_permohonan" typeAttr="number" />
            <Input label="Unit Tujuan" field="unit_tujuan_magang" />
            <Input label="Jumlah Peserta Magang" field="jumlah_magang" typeAttr="number" />
            <LinkInput label="Link Dokumen Magang" field="link_dokumen_magang" />
          </div>
        );
      case TaskType.PENELITIAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Permohonan" field="jumlah_permohonan" typeAttr="number" />
            <Input label="Unit Tujuan" field="unit_tujuan_penelitian" />
            <Input label="Jumlah Peserta Penelitian" field="jumlah_penelitian" typeAttr="number" />
            <LinkInput label="Link Dokumen Penelitian" field="link_dokumen_penelitian" />
          </div>
        );
      case TaskType.SATYA_LENCANA:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Kategori Satyalencana" field="kategori_satya_lencana" placeholder="10 / 20 / 30 TAHUN" />
            <LinkInput label="Link Dokumen Satyalencana" field="link_dokumen_satya_lencana" />
          </div>
        );
      case TaskType.GELAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Pencantuman Gelar" field="jumlah_pencantuman_gelar" typeAttr="number" />
            <TextArea label="Nama-nama Pegawai" field="nama_pegawai_gelar" />
            <LinkInput label="Link Dokumen Gelar" field="link_dokumen_gelar" />
          </div>
        );
      case TaskType.PANGKAT:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Usulan" field="jumlah_usulan_pangkat" typeAttr="number" />
            <Input label="Jumlah Diterima" field="jumlah_diterima_pangkat" typeAttr="number" />
            <LinkInput label="Link Dokumen Pangkat" field="link_dokumen_pangkat" />
          </div>
        );
      case TaskType.JENJANG:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Usulan Jenjang" field="jumlah_usulan_jenjang" typeAttr="number" />
            <Input label="Jumlah Diterima Jenjang" field="jumlah_diterima_jenjang" typeAttr="number" />
            <LinkInput label="Link Dokumen Jenjang" field="link_dokumen_jenjang" />
          </div>
        );
      case TaskType.GAJI:
      case TaskType.KGB:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Status Pegawai" field="status_pegawai_gaji" placeholder="PNS / PPPK" />
            <Input label="Jumlah Diproses" field="jumlah_diproses_gaji" typeAttr="number" />
            <LinkInput label="Link Dokumen Gaji/KGB" field="link_dokumen_gaji" />
          </div>
        );
      case TaskType.MUTASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Diproses" field="jumlah_diproses_mutasi" typeAttr="number" />
            <Input label="Nama Pegawai" field="nama_pegawai_mutasi" />
            <Input label="Jabatan Lama" field="jabatan_lama" />
            <Input label="Unit Kerja Lama" field="unit_kerja_lama" />
            <Input label="Jabatan Baru" field="jabatan_baru" />
            <Input label="Unit Kerja Baru" field="unit_kerja_baru" />
            <LinkInput label="Link Dokumen Mutasi" field="link_dokumen_mutasi" />
          </div>
        );
      case TaskType.KARTU_SUAMI_ISTRI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Usulan Istri" field="jumlah_usulan_istri" typeAttr="number" />
            <Input label="Jumlah Diterima Istri" field="jumlah_diterima_istri" typeAttr="number" />
            <Input label="Jumlah Usulan Suami" field="jumlah_usulan_suami" typeAttr="number" />
            <Input label="Jumlah Diterima Suami" field="jumlah_diterima_suami" typeAttr="number" />
            <LinkInput label="Link Dokumen Karis/Karsu" field="link_dokumen_kartu_suami_istri" />
          </div>
        );
      case TaskType.KARTU_BPJS:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Usulan BPJS" field="jumlah_usulan_bpjs" typeAttr="number" />
            <Input label="Jumlah Diterima BPJS" field="jumlah_diterima_bpjs" typeAttr="number" />
            <LinkInput label="Link Dokumen BPJS" field="link_dokumen_kartu_bpjs" />
          </div>
        );
      case TaskType.CUTI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jenis Cuti" field="jenis_cuti" placeholder="Tahunan / Sakit / Melahirkan..." />
            <LinkInput label="Link Dokumen Cuti" field="link_dokumen_cuti" />
          </div>
        );
      case TaskType.SPMT_SPP:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah SPMT" field="jumlah_spmt" typeAttr="number" />
            <Input label="Jumlah SPP" field="jumlah_spp" typeAttr="number" />
            <LinkInput label="Link Dokumen SPMT/SPP" field="link_dokumen_spmt_spp" />
          </div>
        );
      case TaskType.ABSENSI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Unit Absensi" field="unit_absensi" />
            <Input label="Jumlah Absensi" field="jumlah_absensi" typeAttr="number" />
            <LinkInput label="Link Dokumen Absensi" field="link_dokumen_absensi" />
          </div>
        );
      case TaskType.PERKAWINAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Perkawinan" field="jumlah_perkawinan" typeAttr="number" />
            <Input label="Jumlah Perceraian" field="jumlah_perceraian" typeAttr="number" />
            <Input label="Jumlah Kelahiran" field="jumlah_kelahiran" typeAttr="number" />
            <LinkInput label="Link Dokumen Perkawinan" field="link_dokumen_perkawinan" />
          </div>
        );
      case TaskType.HUKUMAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Jumlah Ringan" field="jumlah_ringan" typeAttr="number" />
            <Input label="Jumlah Sedang" field="jumlah_sedang" typeAttr="number" />
            <Input label="Jumlah Berat" field="jumlah_berat" typeAttr="number" />
            <LinkInput label="Link Dokumen Hukuman" field="link_dokumen_hukuman" />
          </div>
        );
      case TaskType.PENSIUN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Usulan Pensiun" field="jumlah_usulan_pensiun" typeAttr="number" />
            <Input label="Jumlah SK Pensiun" field="jumlah_sk_pensiun" typeAttr="number" />
            <LinkInput label="Link Dokumen Pensiun" field="link_dokumen_pensiun" />
          </div>
        );
      case TaskType.GRATIFIKASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Jumlah Gratifikasi" field="jumlah_gratifikasi" typeAttr="number" />
            <Input label="Jumlah Benturan Kepentingan" field="jumlah_benturan_kepentingan" typeAttr="number" />
            <LinkInput label="Link Dokumen Gratifikasi" field="link_dokumen_gratifikasi" />
          </div>
        );
      case TaskType.UANG_MAKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Periode" field="periode" placeholder="BULAN DAN TAHUN" />
            <TextArea label="Keterangan" field="keterangan" />
            <LinkInput label="Link Dokumen Uang Makan" field="link_dokumen_uangmakan" />
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Volume / Jumlah" field="jumlah" typeAttr="number" />
            <Input label="Satuan" field="satuan" placeholder="Berkas / Orang / Kegiatan" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => !syncing && setIsConfirmOpen(false)} 
        onConfirm={handleDeleteTask} 
        loading={syncing} 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter">Administrasi Rutin</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-clipboard-check-fill text-blue-600"></i> Integrasi Laporan Bulanan Subbagian Mutasi & Gaji
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {canEdit && (
            <button onClick={() => { setEditingTask(null); setFormData({ bulan: filterMonth, tahun: filterYear, jenis: TaskType.PELANTIKAN, detail: '', data: {} }); setIsModalOpen(true); }} className="flex-1 md:flex-none px-10 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">+ Registrasi Log Baru</button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 shadow-inner" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
        </select>
        <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 shadow-inner" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {[2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex-1 flex justify-end">
           <span className="px-6 py-4 bg-blue-50 text-blue-600 rounded-[1.8rem] text-[10px] font-black uppercase border border-blue-100">{filteredTasks.length} Catatan Periode Ini</span>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead className="bg-[#111827] text-[8px] font-black uppercase text-gray-400 border-b border-white/5 tracking-widest">
               <tr><th className="px-10 py-6 w-72">Kategori & Waktu</th><th className="px-4 py-6">Atribut Capaian Administrasi</th><th className="px-10 py-6 text-right">Opsi</th></tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filteredTasks.map(t => (
                 <tr key={t.id} className="hover:bg-blue-50/5 group transition-all">
                   <td className="px-10 py-7 align-top">
                     <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase tracking-widest w-fit">{TASK_LABELS[t.jenis] || t.jenis}</span>
                     <p className="text-[12px] font-black text-gray-950 uppercase mt-2">{t.bulan} {t.tahun}</p>
                   </td>
                   <td className="px-4 py-7 align-top">
                      {t.data && Object.keys(t.data).length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                            {Object.entries(t.data).map(([k, v]) => (
                               <div key={k} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl flex flex-col">
                                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">{k.replace(/_/g, ' ')}</span>
                                  <span className="text-[10px] font-black text-gray-800 uppercase truncate max-w-[150px]">{String(v)}</span>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <p className="text-[10px] font-bold text-gray-300 italic uppercase">Tidak ada data atribut spesifik</p>
                      )}
                   </td>
                   <td className="px-10 py-7 text-right align-top">
                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => { setEditingTask(t); setFormData({ ...t }); setIsModalOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all"><i className="bi bi-pencil-fill"></i></button>
                       {isSuperadmin && <button onClick={() => { setTaskToDelete(t); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center transition-all hover:bg-rose-500 hover:text-white"><i className="bi bi-trash-fill"></i></button>}
                     </div>
                   </td>
                 </tr>
               ))}
               {filteredTasks.length === 0 && (
                 <tr>
                    <td colSpan={3} className="py-32 text-center opacity-30">
                       <i className="bi bi-clipboard-x text-5xl mb-4 block"></i>
                       <p className="text-[10px] font-black uppercase tracking-widest">Belum ada data untuk periode ini</p>
                    </td>
                 </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 pt-[140px] pb-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-full border border-white/20">
              
              <div className="p-6 md:p-8 border-b bg-gray-50 shrink-0 flex justify-between items-center z-50 relative">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-900 tracking-tighter">{editingTask ? 'Perbarui Log Capaian' : 'Registrasi Laporan Rutin'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest italic">Penyusunan Output Laporan Bulanan</p>
                 </div>
                 <button onClick={() => !syncing && setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                    <i className="bi bi-x-lg text-xl"></i>
                 </button>
              </div>
              
              <form onSubmit={handleSave} className="flex-1 p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar bg-white">
                 <div className="grid grid-cols-2 gap-6">
                    <div><label className={labelClass}>Periode Bulan</label><select className={inputClass} value={formData.bulan} onChange={e => setFormData({...formData, bulan: e.target.value})}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
                    <div><label className={labelClass}>Periode Tahun</label><input type="number" className={inputClass} value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                 </div>
                 
                 <div>
                    <label className={labelClass}>Kategori Administrasi / Tugas</label>
                    <select className={`${inputClass} border-blue-100 text-blue-700 font-black`} value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as any, data: {}})}>
                        {Object.entries(TASK_LABELS).sort((a,b) => a[1].localeCompare(b[1])).map(([k,v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}
                    </select>
                 </div>

                 <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border-2 border-dashed border-blue-100 space-y-6">
                    <h6 className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><i className="bi bi-info-circle-fill"></i> Atribut Spesifik Kategori</h6>
                    {renderDynamicInputs()}
                 </div>

                 {/* Field Narasi Ringkasan Realisasi dihilangkan sesuai permintaan */}
              </form>

              <div className="p-6 md:p-8 bg-gray-50 border-t shrink-0 flex justify-end gap-4 z-50 relative">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all">Batalkan</button>
                 <button type="submit" onClick={handleSave} disabled={syncing} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-4 active:scale-95 disabled:bg-gray-300">
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

export default TugasRutinPage;
