
import React, { useState, useEffect, useMemo } from 'react';
import { TASK_LABELS, BULAN, UNIT_KERJA } from '../constants';
import { TaskType, TugasRutin, Pegawai } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';
import SuccessModal from '../components/SuccessModal';

const SectionHeader = ({ icon, label, color = "text-blue-600", bg = "bg-blue-50" }: { icon: string, label: string, color?: string, bg?: string }) => (
  <div className="flex items-center space-x-2 mb-3 mt-4 first:mt-0 col-span-full border-b border-gray-100 pb-2 animate-fadeIn">
    <div className={`h-6 w-6 ${bg} ${color} rounded-md flex items-center justify-center`}>
      <i className={`bi ${icon} text-[10px]`}></i>
    </div>
    <h5 className="text-[9px] font-black text-gray-950 uppercase tracking-widest">{label}</h5>
  </div>
);

const InputField = ({ label, name, type = "text", placeholder = "", value, onChange, fullWidth = false, disabled = false }: any) => (
  <div className={`space-y-0.5 ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="text-[8px] font-black text-gray-700 uppercase tracking-wider block pl-0.5">{label}</label>
    <input 
      type={type} 
      name={name}
      placeholder={placeholder}
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(name, e.target.value)}
      className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950 outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm focus:bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
    />
  </div>
);

const SelectField = ({ label, name, options, value, onChange, fullWidth = false }: any) => (
  <div className={`space-y-0.5 ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="text-[8px] font-black text-gray-700 uppercase tracking-wider block pl-0.5">{label}</label>
    <div className="relative group">
      <select 
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950 outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm focus:bg-white"
      >
        <option value="">Pilih {label}</option>
        {options.map((opt: any) => (
          <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
            {typeof opt === 'string' ? opt : opt.label}
          </option>
        ))}
      </select>
      <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[8px] pointer-events-none"></i>
    </div>
  </div>
);

const TextAreaField = ({ label, name, placeholder = "", value, onChange, fullWidth = true }: any) => (
  <div className={`space-y-0.5 ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="text-[8px] font-black text-gray-700 uppercase tracking-wider block pl-0.5">{label}</label>
    <textarea 
      name={name}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      rows={3}
      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950 outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm focus:bg-white resize-none" 
    />
  </div>
);

const TugasRutinPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [filterBulan, setFilterBulan] = useState('Semua');
  const [filterJenis, setFilterJenis] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingTask, setEditingTask] = useState<TugasRutin | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    const saved = localStorage.getItem('tugas_rutin_db');
    if (saved) setTasks(JSON.parse(saved));
    try {
      const pData = await fetchPegawaiFromSheets();
      setPegawaiList(pData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      (filterBulan === 'Semua' || t.bulan === filterBulan) && 
      (filterJenis === 'ALL' || t.jenis === filterJenis)
    );
  }, [tasks, filterBulan, filterJenis]);

  const handleExport = () => {
    const dataToExport = filteredTasks.map(t => ({
      Bulan: t.bulan,
      Tahun: t.tahun,
      Kategori: TASK_LABELS[t.jenis],
      Detail: t.detail,
      ...t.data
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Laporan Rutin");
    XLSX.writeFile(wb, `Laporan_Rutin_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Tugas Rutin', 'Mengekspor laporan rutin ke Excel');
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = (task: TugasRutin | null = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({ 
        bulan_laporan: task.bulan, 
        tahun_laporan: task.tahun, 
        jenis_tugas: task.jenis,
        ...task.data 
      });
    } else {
      setEditingTask(null);
      setFormData({ 
        bulan_laporan: BULAN[new Date().getMonth()], 
        tahun_laporan: new Date().getFullYear(), 
        jenis_tugas: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.jenis_tugas) {
      alert("Harap pilih kategori tugas");
      return;
    }

    setSyncing(true);
    const { bulan_laporan, tahun_laporan, jenis_tugas, ...restData } = formData;
    const taskDetail = `${TASK_LABELS[jenis_tugas as TaskType]} - ${bulan_laporan} ${tahun_laporan}`;

    const taskPayload: TugasRutin = {
      id: editingTask?.id || Date.now().toString(),
      timestamp: editingTask?.timestamp || new Date().toISOString(),
      bulan: bulan_laporan,
      tahun: parseInt(tahun_laporan),
      jenis: jenis_tugas as TaskType,
      detail: taskDetail,
      data: restData
    };

    try {
      await syncTableRemote('TUGAS_RUTIN', 'SAVE', taskPayload);
      
      const updatedList = editingTask 
        ? tasks.map(t => t.id === editingTask.id ? taskPayload : t)
        : [taskPayload, ...tasks];
      
      setTasks(updatedList);
      localStorage.setItem('tugas_rutin_db', JSON.stringify(updatedList));
      logActivity(editingTask ? 'UPDATE' : 'CREATE', 'Tugas Rutin', `Mencatat tugas: ${taskDetail}`);
      setIsModalOpen(false);
      setShowSuccess(true);
    } catch (e) {
      alert("Gagal sinkronisasi data ke cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Hapus catatan tugas ini dari database?`)) return;
    setSyncing(true);
    try {
      await syncTableRemote('TUGAS_RUTIN', 'DELETE', { id });
      const updatedList = tasks.filter(t => t.id !== id);
      setTasks(updatedList);
      localStorage.setItem('tugas_rutin_db', JSON.stringify(updatedList));
      logActivity('DELETE', 'Tugas Rutin', `Menghapus tugas ID: ${id}`);
    } catch (e) {
      alert("Gagal menghapus data dari cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const renderCategoryFields = () => {
    const common = { onChange: handleInputChange };
    const { jenis_tugas } = formData;
    const val = (name: string) => formData[name] || '';

    switch (jenis_tugas) {
      case TaskType.PELANTIKAN:
        return (
          <>
            <SectionHeader icon="bi-award" label="Detail Pelantikan" />
            <InputField label="Tanggal Pelantikan" name="tanggal_pelantikan" type="date" value={val('tanggal_pelantikan')} {...common} />
            <InputField label="Judul Pelantikan" name="judul_pelantikan" value={val('judul_pelantikan')} {...common} />
            <InputField label="Nama Pelantikan" name="nama_pelantikan" value={val('nama_pelantikan')} {...common} />
            <InputField label="Tempat Pelantikan" name="tempat_pelantikan" value={val('tempat_pelantikan')} {...common} />
            <InputField label="Jumlah Peserta" name="jumlah_peserta_pelantikan" type="number" value={val('jumlah_peserta_pelantikan')} {...common} />
            <InputField label="Link Dokumen Pelantikan" name="link_dokumen_pelantikan" fullWidth value={val('link_dokumen_pelantikan')} {...common} placeholder="https://drive.google.com/..." />
          </>
        );

      case TaskType.APEL:
        return (
          <>
            <SectionHeader icon="bi-megaphone" label="Laporan Apel" color="text-orange-600" bg="bg-orange-50" />
            <InputField label="Tanggal Apel" name="tanggal_apel" type="date" value={val('tanggal_apel')} {...common} />
            <TextAreaField label="Keterangan Apel" name="keterangan_apel" value={val('keterangan_apel')} {...common} />
            <InputField label="Tempat Apel" name="tempat_apel" value={val('tempat_apel')} {...common} />
            <InputField label="Jumlah Peserta" name="jumlah_peserta_apel" type="number" value={val('jumlah_peserta_apel')} {...common} />
            <InputField label="Link Dokumen Apel" name="link_dokumen_apel" fullWidth value={val('link_dokumen_apel')} {...common} />
          </>
        );

      case TaskType.LHKPN:
      case TaskType.LHKASN:
        const pref = jenis_tugas === TaskType.LHKPN ? 'lhkpn' : 'lhkasn';
        return (
          <>
            <SectionHeader icon="bi-safe" label={`Pelaporan ${jenis_tugas}`} color="text-emerald-600" bg="bg-emerald-50" />
            <SelectField label={`Unit ${jenis_tugas}`} name={`unit_${pref}`} options={UNIT_KERJA} value={val(`unit_${pref}`)} {...common} fullWidth />
            <InputField label={`Jumlah ${jenis_tugas}`} name={`jumlah_${pref}`} type="number" value={val(`jumlah_${pref}`)} {...common} />
            <TextAreaField label="Daftar Nama Pelapor" name={`daftar_nama_${pref}`} value={val(`daftar_nama_${pref}`)} {...common} />
            <InputField label={`Link Dokumen ${jenis_tugas}`} name={`link_dokumen_${pref}`} fullWidth value={val(`link_dokumen_${pref}`)} {...common} />
          </>
        );

      case TaskType.KGB:
        return (
          <>
            <SectionHeader icon="bi-cash-stack" label="KGB (Gaji Berkala)" color="text-emerald-600" bg="bg-emerald-50" />
            <SelectField label="Status Pegawai" name="status_pegawai_gaji" options={['PNS', 'CPNS', 'PPPK']} value={val('status_pegawai_gaji')} {...common} />
            <InputField label="Jumlah Diproses" name="jumlah_diproses_gaji" type="number" value={val('jumlah_diproses_gaji')} {...common} />
            <InputField label="Link Dokumen Gaji" name="link_dokumen_gaji" fullWidth value={val('link_dokumen_gaji')} {...common} />
          </>
        );

      case TaskType.PANGKAT:
      case TaskType.JENJANG:
        const isPangkat = jenis_tugas === TaskType.PANGKAT;
        const key = isPangkat ? 'pangkat' : 'jenjang';
        return (
          <>
            <SectionHeader icon="bi-arrow-up-circle" label={`Kenaikan ${isPangkat ? 'Pangkat' : 'Jenjang'}`} color="text-blue-600" bg="bg-blue-50" />
            <InputField label={`Usulan ${key}`} name={`jumlah_usulan_${key}`} type="number" value={val(`jumlah_usulan_${key}`)} {...common} />
            <InputField label={`Selesai ${key}`} name={`jumlah_diterima_${key}`} type="number" value={val(`jumlah_diterima_${key}`)} {...common} />
            <InputField label={`Link Dokumen ${key}`} name={`link_dokumen_${key}`} fullWidth value={val(`link_dokumen_${key}`)} {...common} />
          </>
        );

      case TaskType.CUTI:
        return (
          <>
            <SectionHeader icon="bi-calendar-event" label="Cuti Pegawai" color="text-blue-600" bg="bg-blue-50" />
            <SelectField label="Jenis Cuti" name="jenis_cuti" options={['Tahunan', 'Sakit', 'Melahirkan', 'Besar', 'Alasan Penting', 'CLTN']} value={val('jenis_cuti')} {...common} fullWidth />
            <InputField label="Jumlah" name="jumlah" type="number" value={val('jumlah')} {...common} />
            <InputField label="Link Dokumen" name="link_dokumen_cuti" fullWidth value={val('link_dokumen_cuti')} {...common} />
          </>
        );

      default:
        return (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
             <i className="bi bi-database-exclamation text-4xl text-gray-200 block mb-3"></i>
             <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest">Pilih Kategori Tugas Untuk Memetakan Field Database</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Laporan Berhasil Dicatat" />
      
      <div className="flex flex-col lg:flex-row justify-between items-end gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 w-full max-w-2xl">
          <SelectField label="Filter Bulan" options={['Semua', ...BULAN]} value={filterBulan} onChange={(_:any, v:any) => setFilterBulan(v)} />
          <SelectField label="Filter Kategori" options={[{ value: 'ALL', label: 'SEMUA KATEGORI' }, ...Object.entries(TASK_LABELS).map(([k, v]) => ({ value: k, label: (v as string).toUpperCase() }))]} value={filterJenis} onChange={(_:any, v:any) => setFilterJenis(v)} />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button onClick={handleExport} className="h-12 w-12 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all" title="Ekspor Database">
              <i className="bi bi-file-earmark-excel-fill text-xl"></i>
          </button>
          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex-1 lg:flex-none px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] hover:bg-blue-700 shadow-lg shadow-blue-600/20 uppercase tracking-widest transition-all">
              <i className="bi bi-plus-lg mr-2"></i>Entry Data Baru
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 text-gray-700 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
              <tr>
                <th className="px-8 py-5">Periode</th>
                <th className="px-4 py-5">Kategori</th>
                <th className="px-4 py-5">Ringkasan Laporan</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Sinkronisasi Cloud...</td></tr>
              ) : filteredTasks.length > 0 ? filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-blue-50/5 group transition-all">
                  <td className="px-8 py-5">
                    <p className="text-[10px] font-black text-gray-950 uppercase">{t.bulan} {t.tahun}</p>
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase rounded-lg border border-indigo-100">{TASK_LABELS[t.jenis] || t.jenis}</span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(t.data)
                        .filter(([k,v]) => v && !k.startsWith('link_dokumen'))
                        .slice(0, 4)
                        .map(([k,v]) => (
                          <span key={k} className="text-[7px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-black uppercase">{k.replace(/_/g,' ')}: {String(v)}</span>
                        ))}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit && <button onClick={() => handleOpenModal(t)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border border-gray-100 shadow-sm"><i className="bi bi-pencil-square"></i></button>}
                      {isSuperadmin && <button onClick={() => handleDelete(t.id)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl border border-gray-100 shadow-sm"><i className="bi bi-trash"></i></button>}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-8 py-24 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest opacity-30">Database belum berisi laporan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-3xl max-h-[calc(100dvh-5rem)] flex flex-col rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter">
            <div className="px-10 py-7 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center text-white"><i className="bi bi-database-fill-add"></i></div>
                  <h4 className="text-[14px] font-black text-gray-950 uppercase tracking-tight">{editingTask ? 'Perbarui Entri' : 'Entry Laporan Baru'}</h4>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-8" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <SectionHeader icon="bi-calendar-check" label="I. Administrasi Periode" />
                <SelectField label="Bulan Laporan" name="bulan_laporan" options={BULAN} value={formData.bulan_laporan} onChange={handleInputChange} />
                <InputField label="Tahun" name="tahun_laporan" type="number" value={formData.tahun_laporan} onChange={handleInputChange} />
                <SectionHeader icon="bi-tags" label="II. Klasifikasi Kategori" />
                <SelectField label="Pilih Kategori" name="jenis_tugas" fullWidth options={Object.entries(TASK_LABELS).map(([k, v]) => ({ value: k, label: (v as string).toUpperCase() }))} value={formData.jenis_tugas} onChange={handleInputChange} />
                {renderCategoryFields()}
              </div>
            </form>
            <div className="px-10 py-7 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-[10px] font-black text-gray-500 uppercase bg-white border border-gray-200 rounded-xl active:scale-95 transition-all">Batal</button>
              <button className="px-12 py-3.5 text-[10px] font-black text-white bg-blue-600 rounded-xl shadow-xl shadow-blue-600/20 uppercase active:scale-95 transition-all disabled:bg-blue-300" disabled={syncing} onClick={handleSave}>
                {syncing ? 'Menyimpan ke Cloud...' : 'Simpan Laporan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TugasRutinPage;
