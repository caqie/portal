import React, { useState, useEffect, useMemo } from 'react';
import { TugasRutin, TaskType } from '../types';
import { fetchTugasRutinFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { BULAN, TASK_LABELS, UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
// import * as XLSX from 'xlsx'; // Uncomment jika digunakan

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

  const currentYear = new Date().getFullYear();
  const [filterMonth, setFilterMonth] = useState(BULAN[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(currentYear);

  useEffect(() => { loadData(); }, []);

  const loadData = async (bypass = false) => {
    setLoading(true);
    try {
      const data = await fetchTugasRutinFromSheets(bypass);
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

  // Mengubah signature menjadi React.MouseEvent<HTMLButtonElement> karena tombol di luar form
  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Mencegah form submit default jika ada
    
    // Validasi sederhana
    if (!formData.jenis) {
        alert("Silakan pilih kategori administrasi terlebih dahulu.");
        return;
    }
    if (!formData.bulan) {
        alert("Silakan pilih bulan laporan.");
        return;
    }

    setSyncing(true);
    const taskId = editingTask?.id || `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const payload: TugasRutin = { 
      id: taskId,
      timestamp: new Date().toISOString(),
      bulan: formData.bulan || '',
      tahun: formData.tahun || new Date().getFullYear(),
      jenis: formData.jenis as any,
      detail: '', // Detail dikosongkan sesuai request sebelumnya
      data: formData.data || {}
    };

    try {
      const ok = await syncTableRemote('TUGAS_RUTIN', 'SAVE', payload);
      if(ok) { 
        setSuccessMsg(`Data log ${TASK_LABELS[formData.jenis || ''] || 'tugas'} berhasil disinkronkan.`);
        await loadData(true);
        setIsModalOpen(false); 
        setShowSuccess(true); 
      } else {
          alert("Gagal menyimpan data ke server. Pastikan URL Apps Script sudah benar.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan teknis saat menyimpan.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteTask = async () => {
    if(!taskToDelete) return;
    setSyncing(true);
    try {
      const ok = await syncTableRemote('TUGAS_RUTIN', 'DELETE', { 
        id: taskToDelete.id,
        jenis: taskToDelete.jenis,
        nama: TASK_LABELS[taskToDelete.jenis] || taskToDelete.jenis
      });
      if(ok) {
        logActivity('DELETE', 'Tugas Rutin', `Hapus log: ${TASK_LABELS[taskToDelete.jenis]}`);
        setSuccessMsg("Data log tugas berhasil dihapus secara permanen.");
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

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 ml-3 tracking-widest block mb-1.5";

  // --- Helper Components (Dipindahkan ke luar renderDynamicInputs untuk mencegah Remount/Focus Loss) ---
  
  const renderInput = (label: string, field: string, typeAttr = "text", full = false, placeholder = "") => (
    <div className={`space-y-1.5 ${full ? 'col-span-full' : ''}`}>
      <label className={labelClass}>{label}</label>
      <input 
        type={typeAttr} 
        className={inputClass} 
        value={(formData.data && formData.data[field]) || ''} 
        onChange={e => updateDataField(field, e.target.value)} 
        placeholder={placeholder} 
      />
    </div>
  );

  const renderTextArea = (label: string, field: string, placeholder = "") => (
    <div className="space-y-1.5 col-span-full">
      <label className={labelClass}>{label}</label>
      <textarea 
        rows={2} 
        className={`${inputClass} normal-case h-20 resize-none font-bold`} 
        value={(formData.data && formData.data[field]) || ''} 
        onChange={e => updateDataField(field, e.target.value)} 
        placeholder={placeholder} 
      />
    </div>
  );

  const renderLinkInput = (label: string, field: string) => (
    renderInput(label, field, "text", true, "https://drive.google.com/...")
  );

  const renderDynamicInputs = () => {
    const type = formData.jenis;
    
    // Jika jenis belum dipilih, tampilkan pesan
    if (!type) return <div className="text-center text-gray-400 py-10 font-bold text-xs">Pilih Kategori untuk menampilkan form</div>;

    switch(type) {
      case TaskType.PELANTIKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Tanggal Pelantikan", "tanggal_pelantikan", "date")}
            {renderInput("Judul Pelantikan", "judul_pelantikan")}
            {renderInput("Nama Pelantikan", "nama_pelantikan")}
            {renderInput("Tempat Pelantikan", "tempat_pelantikan")}
            {renderInput("Jumlah Peserta", "jumlah_peserta_pelantikan", "number")}
            {renderLinkInput("Link Dokumen Pelantikan", "link_dokumen_pelantikan")}
          </div>
        );
      case TaskType.APEL:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Tanggal Apel", "tanggal_apel", "date")}
            {renderInput("Tempat Apel", "tempat_apel")}
            {renderInput("Jumlah Peserta", "jumlah_peserta_apel", "number")}
            {renderTextArea("Keterangan Apel", "keterangan_apel")}
            {renderLinkInput("Link Dokumen Apel", "link_dokumen_apel")}
          </div>
        );
      case TaskType.LHKPN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Unit LHKPN", "unit_lhkpn")}
            {renderInput("Jumlah LHKPN", "jumlah_lhkpn", "number")}
            {renderTextArea("Daftar Nama LHKPN", "daftar_nama_lhkpn")}
            {renderLinkInput("Link Dokumen LHKPN", "link_dokumen_lhkpn")}
          </div>
        );
      case TaskType.LHKASN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Unit LHKASN", "unit_lhkasn")}
            {renderInput("Jumlah LHKASN", "jumlah_lhkasn", "number")}
            {renderTextArea("Daftar Nama LHKASN", "daftar_nama_lhkasn")}
            {renderLinkInput("Link Dokumen LHKASN", "link_dokumen_lhkasn")}
          </div>
        );
      case TaskType.TUGAS_BELAJAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jenis Tugas Belajar", "jenis_tugas_belajar")}
            {renderInput("Nama Pegawai", "nama_tugas_belajar")}
            {renderInput("Jenjang Pendidikan", "jenjang_pendidikan")}
            {renderInput("Jurusan", "jurusan_tugas_belajar")}
            {renderInput("Kampus", "kampus_tugas_belajar")}
            {renderInput("Periode", "periode_tugas_belajar")}
            {renderLinkInput("Link Dokumen Tugas Belajar", "link_dokumen_tugas_belajar")}
          </div>
        );
      case TaskType.MAGANG:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Permohonan", "jumlah_permohonan", "number")}
            {renderInput("Unit Tujuan", "unit_tujuan_magang")}
            {renderInput("Jumlah Peserta Magang", "jumlah_magang", "number")}
            {renderLinkInput("Link Dokumen Magang", "link_dokumen_magang")}
          </div>
        );
      case TaskType.PENELITIAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Permohonan", "jumlah_permohonan", "number")}
            {renderInput("Unit Tujuan", "unit_tujuan_penelitian")}
            {renderInput("Jumlah Peserta Penelitian", "jumlah_penelitian", "number")}
            {renderLinkInput("Link Dokumen Penelitian", "link_dokumen_penelitian")}
          </div>
        );
      case TaskType.SATYA_LENCANA:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Kategori Satyalencana", "kategori_satya_lencana", "text", false, "10 / 20 / 30 TAHUN")}
            {renderLinkInput("Link Dokumen Satyalencana", "link_dokumen_satya_lencana")}
          </div>
        );
      case TaskType.GELAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Pencantuman Gelar", "jumlah_pencantuman_gelar", "number")}
            {renderTextArea("Nama-nama Pegawai", "nama_pegawai_gelar")}
            {renderLinkInput("Link Dokumen Gelar", "link_dokumen_gelar")}
          </div>
        );
      case TaskType.PANGKAT:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Usulan", "jumlah_usulan_pangkat", "number")}
            {renderInput("Jumlah Diterima", "jumlah_diterima_pangkat", "number")}
            {renderLinkInput("Link Dokumen Pangkat", "link_dokumen_pangkat")}
          </div>
        );
      case TaskType.JENJANG:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Usulan Jenjang", "jumlah_usulan_jenjang", "number")}
            {renderInput("Jumlah Diterima Jenjang", "jumlah_diterima_jenjang", "number")}
            {renderLinkInput("Link Dokumen Jenjang", "link_dokumen_jenjang")}
          </div>
        );
      case TaskType.GAJI:
      case TaskType.KGB:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Status Pegawai", "status_pegawai_gaji", "text", false, "PNS / PPPK")}
            {renderInput("Jumlah Diproses", "jumlah_diproses_gaji", "number")}
            {renderLinkInput("Link Dokumen Gaji/KGB", "link_dokumen_gaji")}
          </div>
        );
      case TaskType.MUTASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Diproses", "jumlah_diproses_mutasi", "number")}
            {renderInput("Nama Pegawai", "nama_pegawai_mutasi")}
            {renderInput("Jabatan Lama", "jabatan_lama")}
            {renderInput("Unit Kerja Lama", "unit_kerja_lama")}
            {renderInput("Jabatan Baru", "jabatan_baru")}
            {renderInput("Unit Kerja Baru", "unit_kerja_baru")}
            {renderLinkInput("Link Dokumen Mutasi", "link_dokumen_mutasi")}
          </div>
        );
      case TaskType.KARTU_SUAMI_ISTRI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Usulan Istri", "jumlah_usulan_istri", "number")}
            {renderInput("Jumlah Diterima Istri", "jumlah_diterima_istri", "number")}
            {renderInput("Jumlah Usulan Suami", "jumlah_usulan_suami", "number")}
            {renderInput("Jumlah Diterima Suami", "jumlah_diterima_suami", "number")}
            {renderLinkInput("Link Dokumen Karis/Karsu", "link_dokumen_kartu_suami_istri")}
          </div>
        );
      case TaskType.KARTU_BPJS:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Usulan BPJS", "jumlah_usulan_bpjs", "number")}
            {renderInput("Jumlah Diterima BPJS", "jumlah_diterima_bpjs", "number")}
            {renderLinkInput("Link Dokumen BPJS", "link_dokumen_kartu_bpjs")}
          </div>
        );
      case TaskType.CUTI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jenis Cuti", "jenis_cuti", "text", false, "Tahunan / Sakit / Melahirkan...")}
            {renderLinkInput("Link Dokumen Cuti", "link_dokumen_cuti")}
          </div>
        );
      case TaskType.SPMT_SPP:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah SPMT", "jumlah_spmt", "number")}
            {renderInput("Jumlah SPP", "jumlah_spp", "number")}
            {renderLinkInput("Link Dokumen SPMT/SPP", "link_dokumen_spmt_spp")}
          </div>
        );
      case TaskType.ABSENSI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Unit Absensi", "unit_absensi")}
            {renderInput("Jumlah Absensi", "jumlah_absensi", "number")}
            {renderLinkInput("Link Dokumen Absensi", "link_dokumen_absensi")}
          </div>
        );
      case TaskType.PERKAWINAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Perkawinan", "jumlah_perkawinan", "number")}
            {renderInput("Jumlah Perceraian", "jumlah_perceraian", "number")}
            {renderInput("Jumlah Kelahiran", "jumlah_kelahiran", "number")}
            {renderLinkInput("Link Dokumen Perkawinan", "link_dokumen_perkawinan")}
          </div>
        );
      case TaskType.HUKUMAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderInput("Jumlah Ringan", "jumlah_ringan", "number")}
            {renderInput("Jumlah Sedang", "jumlah_sedang", "number")}
            {renderInput("Jumlah Berat", "jumlah_berat", "number")}
            {renderLinkInput("Link Dokumen Hukuman", "link_dokumen_hukuman")}
          </div>
        );
      case TaskType.PENSIUN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Usulan Pensiun", "jumlah_usulan_pensiun", "number")}
            {renderInput("Jumlah SK Pensiun", "jumlah_sk_pensiun", "number")}
            {renderLinkInput("Link Dokumen Pensiun", "link_dokumen_pensiun")}
          </div>
        );
      case TaskType.GRATIFIKASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Jumlah Gratifikasi", "jumlah_gratifikasi", "number")}
            {renderInput("Jumlah Benturan Kepentingan", "jumlah_benturan_kepentingan", "number")}
            {renderLinkInput("Link Dokumen Gratifikasi", "link_dokumen_gratifikasi")}
          </div>
        );
      case TaskType.UANG_MAKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput("Periode", "periode", "text", false, "BULAN DAN TAHUN")}
            {renderTextArea("Keterangan", "keterangan")}
            {renderLinkInput("Link Dokumen Uang Makan", "link_dokumen_uangmakan")}
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-2 gap-6">
            {renderInput("Volume / Jumlah", "jumlah", "number")}
            {renderInput("Satuan", "satuan", "text", false, "Berkas / Orang / Kegiatan")}
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
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tighter">Administrasi Rutin</h3>
          <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-clipboard-check-fill text-blue-600"></i> Integrasi Laporan Bulanan Subbagian Mutasi & Gaji
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {canEdit && (
            <button 
                onClick={() => { 
                    setEditingTask(null); 
                    // Reset form untuk data baru
                    setFormData({ 
                        bulan: filterMonth, 
                        tahun: filterYear, 
                        jenis: TaskType.PELANTIKAN, // Default tipe
                        detail: '', 
                        data: {} 
                    }); 
                    setIsModalOpen(true); 
                }} 
                className="flex-1 md:flex-none px-10 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] shadow-2xl active:scale-95 transition-all"
            >
                + Registrasi Log Baru
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black outline-none focus:border-blue-600 shadow-inner" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {BULAN.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black outline-none focus:border-blue-600 shadow-inner" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex-1 flex justify-end">
           <span className="px-6 py-4 bg-blue-50 text-blue-600 rounded-[1.8rem] text-[10px] font-black border border-blue-100">{filteredTasks.length} Catatan Periode Ini</span>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto custom-scrollbar">
           <table className="min-w-[800px] w-full text-left">
             <thead className="bg-[#111827] text-[8px] font-black text-gray-400 border-b border-white/5 tracking-widest">
               <tr><th className="px-10 py-6 w-72">Kategori & Waktu</th><th className="px-4 py-6">Atribut Capaian Administrasi</th><th className="px-10 py-6 text-right">Opsi</th></tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
               {filteredTasks.map(t => (
                 <tr key={t.id} className="hover:bg-blue-50/5 group transition-all">
                   <td className="px-10 py-7 align-top">
                     <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 tracking-widest w-fit">{TASK_LABELS[t.jenis] || t.jenis}</span>
                     <p className="text-[12px] font-black text-gray-950 mt-2">{t.bulan} {t.tahun}</p>
                   </td>
                   <td className="px-4 py-7 align-top">
                      {t.data && Object.keys(t.data).length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                            {Object.entries(t.data).map(([k, v]) => (
                               <div key={k} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl flex flex-col">
                                  <span className="text-[7px] font-black text-gray-400 tracking-tighter">{k.replace(/_/g, ' ')}</span>
                                  <span className="text-[10px] font-black text-gray-800 truncate max-w-[150px]">{String(v)}</span>
                               </div>
                            ))}
                         </div>
                      ) : (
                         <p className="text-[10px] font-bold text-gray-300 italic">Tidak ada data atribut spesifik</p>
                      )}
                   </td>
                   <td className="px-10 py-7 text-right align-top">
                     <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => { 
                           setEditingTask(t); 
                           // Pastikan data tercopy dengan benar termasuk data object
                           setFormData({ ...t, data: t.data || {} }); 
                           setIsModalOpen(true); 
                       }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all">
                           <i className="bi bi-pencil-fill"></i>
                       </button>
                       {isSuperadmin && (
                           <button onClick={() => { setTaskToDelete(t); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center transition-all hover:bg-rose-500 hover:text-white">
                               <i className="bi bi-trash-fill"></i>
                           </button>
                       )}
                     </div>
                   </td>
                 </tr>
               ))}
               {filteredTasks.length === 0 && (
                 <tr>
                    <td colSpan={3} className="py-32 text-center opacity-30">
                       <i className="bi bi-clipboard-x text-5xl mb-4 block"></i>
                       <p className="text-[10px] font-black tracking-widest">Belum ada data untuk periode ini</p>
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
                    <h4 className="text-xl font-black text-gray-900 tracking-tighter">{editingTask ? 'Perbarui Log Capaian' : 'Registrasi Laporan Rutin'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 mt-1 tracking-widest italic">Penyusunan Output Laporan Bulanan</p>
                 </div>
                 <button onClick={() => !syncing && setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                    <i className="bi bi-x-lg text-xl"></i>
                 </button>
              </div>
              
              <form onSubmit={(e) => e.preventDefault()} className="flex-1 p-8 md:p-10 space-y-8 overflow-y-auto custom-scrollbar bg-white">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Periode Bulan</label>
                        <select className={inputClass} value={formData.bulan} onChange={e => setFormData({...formData, bulan: e.target.value})}>
                            {BULAN.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Periode Tahun</label>
                        <input type="number" className={inputClass} value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} />
                    </div>
                 </div>
                 
                 <div>
                    <label className={labelClass}>Kategori Administrasi / Tugas</label>
                    <select 
                        className={`${inputClass} border-blue-100 text-blue-700 font-black`} 
                        value={formData.jenis} 
                        onChange={e => {
                            setFormData({
                                ...formData, 
                                jenis: e.target.value as any, 
                                data: {} // Reset data saat ganti kategori
                            });
                        }}
                    >
                        {Object.entries(TASK_LABELS).sort((a,b) => a[1].localeCompare(b[1])).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                 </div>

                 <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border-2 border-dashed border-blue-100 space-y-6">
                    <h6 className="text-[9px] font-black text-blue-600 tracking-widest border-b pb-2 flex items-center gap-2">
                        <i className="bi bi-info-circle-fill"></i> Atribut Spesifik Kategori
                    </h6>
                    {renderDynamicInputs()}
                 </div>
              </form>

              <div className="p-6 md:p-8 bg-gray-50 border-t shrink-0 flex justify-end gap-4 z-50 relative">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black shadow-sm active:scale-95 transition-all">Batalkan</button>
                 <button 
                    type="button" // Diganti ke button karena tidak di dalam form tag submit
                    onClick={handleSave} 
                    disabled={syncing} 
                    className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] shadow-xl flex items-center gap-4 active:scale-95 disabled:bg-gray-300"
                 >
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