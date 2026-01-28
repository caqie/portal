
import React, { useState, useEffect, useMemo } from 'react';
import { TugasRutin, TaskType } from '../types';
import { fetchTugasRutinFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { BULAN, TASK_LABELS } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import * as XLSX from 'xlsx';

const TugasRutinPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TugasRutin | null>(null);
  const [formData, setFormData] = useState<Partial<TugasRutin>>({ data: {} });
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Data berhasil disimpan.');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TugasRutin | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Filter States
  const [filterMonth, setFilterMonth] = useState(BULAN[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('SEMUA');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchTugasRutinFromSheets();
      setTasks([...data].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchMonth = t.bulan === filterMonth;
      const matchYear = Number(t.tahun) === Number(filterYear);
      const matchType = filterType === 'SEMUA' || t.jenis === filterType;
      return matchMonth && matchYear && matchType;
    });
  }, [tasks, filterMonth, filterYear, filterType]);

  const downloadExcel = () => {
    if (filteredTasks.length === 0) return alert("Tidak ada data untuk diunduh.");
    
    const wb = XLSX.utils.book_new();
    const dataToExport = filteredTasks.map(t => {
      const base = {
        'ID': t.id,
        'Waktu Input': t.timestamp,
        'Bulan': t.bulan,
        'Tahun': t.tahun,
        'Kategori': TASK_LABELS[t.jenis] || t.jenis,
        'Keterangan': t.detail || '-'
      };
      
      // Flatten dynamic data fields into columns
      const extraData = t.data || {};
      return { ...base, ...extraData };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Tugas Rutin");
    XLSX.writeFile(wb, `Tugas_Rutin_${filterMonth}_${filterYear}.xlsx`);
    logActivity('DOWNLOAD', 'Tugas Rutin', `Download Excel periode ${filterMonth} ${filterYear}`);
  };

  const updateDataField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      data: { ...(prev.data || {}), [field]: value }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    
    const payload = { 
      ...formData, 
      id: editingTask?.id || `TR-${Date.now()}`, 
      timestamp: new Date().toISOString() 
    };
    
    const ok = await syncTableRemote('TUGAS_RUTIN', 'SAVE', payload);
    if(ok) { 
      setSuccessMsg(editingTask ? 'Perubahan berhasil disimpan.' : 'Data baru berhasil ditambahkan.');
      await loadData();
      setIsModalOpen(false); 
      setShowSuccess(true); 
    } else {
      alert("Gagal menyimpan ke cloud.");
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('TUGAS_RUTIN', 'DELETE', { id: taskToDelete.id });
      if (success) {
        setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
        setSuccessMsg('Data berhasil dihapus.');
        setShowSuccess(true);
        logActivity('DELETE', 'Tugas Rutin', `Hapus log: ${taskToDelete.id}`);
      }
    } catch (err) {
      alert("Error koneksi database.");
    } finally {
      setIsConfirmOpen(false);
      setSyncing(false);
      setTaskToDelete(null);
    }
  };

  const inputClass = "w-full px-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-black outline-none focus:border-blue-600 transition-all placeholder:text-gray-300";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest block mb-1";

  // Helper untuk menampilkan ringkasan data di tabel
  const renderDataSummary = (t: TugasRutin) => {
    if (!t.data) return <span className="text-gray-400 italic">Tidak ada detail field.</span>;
    
    // Ambil maksimal 4 field pertama yang tidak kosong
    const entries = Object.entries(t.data)
      .filter(([k, v]) => v && !k.includes('link_dokumen'))
      .slice(0, 4);

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {entries.map(([key, val]) => (
          <span key={key} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[7px] font-bold uppercase rounded border border-gray-200">
            {key.replace(/_/g, ' ')}: <span className="text-gray-900">{val as string}</span>
          </span>
        ))}
        {Object.keys(t.data).some(k => k.includes('link_dokumen') && t.data[k]) && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[7px] font-black uppercase rounded border border-blue-100">
            <i className="bi bi-link-45deg"></i> Berkas
          </span>
        )}
      </div>
    );
  };

  const renderDynamicFields = () => {
    const data = formData.data || {};
    const type = formData.jenis;

    const InputField = ({ label, field, type = "text", placeholder = "" }: any) => (
      <div className="space-y-1">
        <label className={labelClass}>{label}</label>
        <input 
          type={type} 
          className={inputClass} 
          value={data[field] || ''} 
          onChange={e => updateDataField(field, e.target.value)} 
          placeholder={placeholder}
        />
      </div>
    );

    const LinkField = ({ label, field }: any) => (
      <div className="col-span-full space-y-1">
        <label className={labelClass}>{label}</label>
        <input 
          type="text" 
          className={`${inputClass} border-blue-50 text-blue-600 font-mono`} 
          value={data[field] || ''} 
          onChange={e => updateDataField(field, e.target.value)} 
          placeholder="https://drive.google.com/..." 
        />
      </div>
    );

    switch (type) {
      case TaskType.PELANTIKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Tanggal Pelantikan" field="tanggal_pelantikan" type="date" />
            <InputField label="Judul Pelantikan" field="judul_pelantikan" />
            <InputField label="Nama Terlantik" field="nama_pelantikan" />
            <InputField label="Tempat" field="tempat_pelantikan" />
            <InputField label="Jumlah Peserta" field="jumlah_peserta_pelantikan" type="number" />
            <LinkField label="Link Dokumen Pelantikan" field="link_dokumen_pelantikan" />
          </div>
        );
      case TaskType.APEL:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Tanggal Apel" field="tanggal_apel" type="date" />
            <InputField label="Keterangan" field="keterangan_apel" />
            <InputField label="Tempat" field="tempat_apel" />
            <InputField label="Jumlah Peserta" field="jumlah_peserta_apel" type="number" />
            <LinkField label="Link Dokumen Apel" field="link_dokumen_apel" />
          </div>
        );
      case TaskType.LHKPN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Unit Kerja" field="unit_lhkpn" />
            <InputField label="Jumlah Pelapor" field="jumlah_lhkpn" type="number" />
            <div className="col-span-full space-y-1">
              <label className={labelClass}>Daftar Nama Pelapor</label>
              <textarea rows={2} className={inputClass} value={data.daftar_nama_lhkpn || ''} onChange={e => updateDataField('daftar_nama_lhkpn', e.target.value)} placeholder="Pisahkan dengan koma..." />
            </div>
            <LinkField label="Link Dokumen LHKPN" field="link_dokumen_lhkpn" />
          </div>
        );
      case TaskType.LHKASN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Unit Kerja" field="unit_lhkasn" />
            <InputField label="Jumlah Pelapor" field="jumlah_lhkasn" type="number" />
            <div className="col-span-full space-y-1">
              <label className={labelClass}>Daftar Nama Pelapor</label>
              <textarea rows={2} className={inputClass} value={data.daftar_nama_lhkasn || ''} onChange={e => updateDataField('daftar_nama_lhkasn', e.target.value)} />
            </div>
            <LinkField label="Link Dokumen LHKASN" field="link_dokumen_lhkasn" />
          </div>
        );
      case TaskType.TUGAS_BELAJAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jenis Tugas Belajar" field="jenis_tugas_belajar" />
            <InputField label="Nama Pegawai" field="nama_tugas_belajar" />
            <InputField label="Jenjang" field="jenjang_pendidikan" />
            <InputField label="Jurusan" field="jurusan_tugas_belajar" />
            <InputField label="Kampus" field="kampus_tugas_belajar" />
            <InputField label="Periode" field="periode_tugas_belajar" />
            <LinkField label="Link Dokumen Tugas Belajar" field="link_dokumen_tugas_belajar" />
          </div>
        );
      case TaskType.MAGANG:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Permohonan" field="jumlah_permohonan" type="number" />
            <InputField label="Unit Tujuan" field="unit_tujuan_magang" />
            <InputField label="Jumlah Peserta" field="jumlah_magang" type="number" />
            <LinkField label="Link Dokumen Magang" field="link_dokumen_magang" />
          </div>
        );
      case TaskType.PENELITIAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Permohonan" field="jumlah_permohonan" type="number" />
            <InputField label="Unit Tujuan" field="unit_tujuan_penelitian" />
            <InputField label="Jumlah Peserta" field="jumlah_penelitian" type="number" />
            <LinkField label="Link Dokumen Penelitian" field="link_dokumen_penelitian" />
          </div>
        );
      case TaskType.SATYA_LENCANA:
        return (
          <div className="grid grid-cols-1 gap-4">
            <InputField label="Kategori Satya Lencana" field="kategori_satya_lencana" placeholder="10, 20, atau 30 Tahun" />
            <LinkField label="Link Dokumen Satya Lencana" field="link_dokumen_satya_lencana" />
          </div>
        );
      case TaskType.GELAR:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Usulan" field="jumlah_pencantuman_gelar" type="number" />
            <InputField label="Nama-nama Pegawai" field="nama_pegawai_gelar" />
            <LinkField label="Link Dokumen Gelar" field="link_dokumen_gelar" />
          </div>
        );
      case TaskType.PANGKAT:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Usulan" field="jumlah_usulan_pangkat" type="number" />
            <InputField label="Jumlah Diterima" field="jumlah_diterima_pangkat" type="number" />
            <LinkField label="Link Dokumen Kenaikan Pangkat" field="link_dokumen_pangkat" />
          </div>
        );
      case TaskType.JENJANG:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Usulan" field="jumlah_usulan_jenjang" type="number" />
            <InputField label="Jumlah Diterima" field="jumlah_diterima_jenjang" type="number" />
            <LinkField label="Link Dokumen Kenaikan Jenjang" field="link_dokumen_jenjang" />
          </div>
        );
      case TaskType.KGB:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Status Pegawai" field="status_pegawai_gaji" />
            <InputField label="Jumlah Diproses" field="jumlah_diproses_gaji" type="number" />
            <LinkField label="Link Dokumen KGB" field="link_dokumen_gaji" />
          </div>
        );
      case TaskType.MUTASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Diproses" field="jumlah_diproses_mutasi" type="number" />
            <InputField label="Nama Pegawai" field="nama_pegawai_mutasi" />
            <InputField label="Jabatan Lama" field="jabatan_lama" />
            <InputField label="Unit Lama" field="unit_kerja_lama" />
            <InputField label="Jabatan Baru" field="jabatan_baru" />
            <InputField label="Unit Baru" field="unit_kerja_baru" />
            <LinkField label="Link Dokumen Mutasi" field="link_dokumen_mutasi" />
          </div>
        );
      case TaskType.KARTU_SUAMI_ISTRI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Usulan Kartu Istri" field="jumlah_usulan_istri" type="number" />
            <InputField label="Diterima Kartu Istri" field="jumlah_diterima_istri" type="number" />
            <InputField label="Usulan Kartu Suami" field="jumlah_usulan_suami" type="number" />
            <InputField label="Diterima Kartu Suami" field="jumlah_diterima_suami" type="number" />
            <LinkField label="Link Dokumen Kartu" field="link_dokumen_kartu_suami_istri" />
          </div>
        );
      case TaskType.KARTU_BPJS:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Usulan BPJS" field="jumlah_usulan_bpjs" type="number" />
            <InputField label="Jumlah Diterima BPJS" field="jumlah_diterima_bpjs" type="number" />
            <LinkField label="Link Dokumen BPJS" field="link_dokumen_kartu_bpjs" />
          </div>
        );
      case TaskType.CUTI:
        return (
          <div className="grid grid-cols-1 gap-4">
            <InputField label="Jenis Cuti" field="jenis_cuti" placeholder="Cuti Tahunan, Alasan Penting, dll" />
            <LinkField label="Link Dokumen Cuti" field="link_dokumen_cuti" />
          </div>
        );
      case TaskType.SPMT_SPP:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah SPMT" field="jumlah_spmt" type="number" />
            <InputField label="Jumlah SPP" field="jumlah_spp" type="number" />
            <LinkField label="Link Dokumen SPMT/SPP" field="link_dokumen_spmt_spp" />
          </div>
        );
      case TaskType.ABSENSI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Unit Kerja" field="unit_absensi" />
            <InputField label="Jumlah Pegawai" field="jumlah_absensi" type="number" />
            <LinkField label="Link Dokumen Absensi" field="link_dokumen_absensi" />
          </div>
        );
      case TaskType.PERKAWINAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Jml Perkawinan" field="jumlah_perkawinan" type="number" />
            <InputField label="Jml Perceraian" field="jumlah_perceraian" type="number" />
            <InputField label="Jml Kelahiran" field="jumlah_kelahiran" type="number" />
            <LinkField label="Link Dokumen" field="link_dokumen_perkawinan" />
          </div>
        );
      case TaskType.HUKUMAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Hukuman Ringan" field="jumlah_ringan" type="number" />
            <InputField label="Hukuman Sedang" field="jumlah_sedang" type="number" />
            <InputField label="Hukuman Berat" field="jumlah_berat" type="number" />
            <LinkField label="Link Dokumen Hukuman" field="link_dokumen_hukuman" />
          </div>
        );
      case TaskType.PENSIUN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Usulan Pensiun" field="jumlah_usulan_pensiun" type="number" />
            <InputField label="Jumlah SK Terbit" field="jumlah_sk_pensiun" type="number" />
            <LinkField label="Link Dokumen Pensiun" field="link_dokumen_pensiun" />
          </div>
        );
      case TaskType.GRATIFIKASI:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Jumlah Gratifikasi" field="jumlah_gratifikasi" type="number" />
            <InputField label="Jumlah Benturan Kepentingan" field="jumlah_benturan_kepentingan" type="number" />
            <LinkField label="Link Dokumen Gratifikasi" field="link_dokumen_gratifikasi" />
          </div>
        );
      case TaskType.UANG_MAKAN:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Periode" field="periode" placeholder="Januari 2025" />
            <InputField label="Keterangan" field="keterangan" />
            <LinkField label="Link Dokumen Uang Makan" field="link_dokumen_uangmakan" />
          </div>
        );
      default:
        return (
          <div className="space-y-1">
            <label className={labelClass}>Ringkasan Aktivitas</label>
            <textarea rows={3} className={inputClass} value={formData.detail || ''} onChange={e => setFormData({...formData, detail: e.target.value})} placeholder="Masukkan detail aktivitas..." />
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" message={successMsg} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => !syncing && setIsConfirmOpen(false)} 
        onConfirm={handleDelete} 
        loading={syncing}
        message="Hapus data tugas rutin ini secara permanen?"
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">Logistik & Tugas Rutin</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Monthly Routine Data Orchestrator</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="h-16 px-8 bg-emerald-600 text-white rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
            <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i>
            Download Rekap Excel
          </button>
          {canEdit && (
            <button onClick={() => { setEditingTask(null); setFormData({ bulan: BULAN[new Date().getMonth()], tahun: new Date().getFullYear(), jenis: TaskType.PELANTIKAN, data: {} }); setIsModalOpen(true); }} className="px-10 h-16 bg-blue-600 text-white rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
               + Tambah Log Baru
            </button>
          )}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full">
           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3 block mb-1">Filter Bulan</label>
           <select className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
              {BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
           </select>
        </div>
        <div className="flex-1 w-full">
           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3 block mb-1">Filter Tahun</label>
           <input type="number" className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} />
        </div>
        <div className="flex-1 w-full">
           <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3 block mb-1">Filter Kategori</label>
           <select className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="SEMUA">SEMUA KATEGORI</option>
              {Object.entries(TASK_LABELS).map(([k,v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}
           </select>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
              <tr>
                <th className="px-8 py-5">Periode & Kategori</th>
                <th className="px-4 py-5">Ringkasan Aktivitas & Detail Field</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={3} className="p-20 text-center text-gray-300 font-black uppercase text-[10px] animate-pulse">Menghubungkan ke Database Cloud...</td></tr>
              ) : filteredTasks.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-8 py-6 w-[250px]">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg uppercase tracking-widest border border-blue-100 inline-block mb-2">
                      {TASK_LABELS[t.jenis] || t.jenis}
                    </span>
                    <p className="text-[11px] font-black text-gray-900 uppercase">{t.bulan} {t.tahun}</p>
                    <p className="text-[8px] font-mono text-gray-400 mt-1">{new Date(t.timestamp).toLocaleString('id-ID')}</p>
                  </td>
                  <td className="px-4 py-6">
                    <p className="text-[12px] font-bold text-gray-950 uppercase">{t.detail || `Rekapitulasi ${TASK_LABELS[t.jenis]}`}</p>
                    {renderDataSummary(t)}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingTask(t); setFormData({ ...t }); setIsModalOpen(true); }} className="h-10 px-6 bg-amber-50 text-amber-600 rounded-xl font-black text-[9px] uppercase border border-amber-100 hover:bg-amber-600 hover:text-white transition-all">Edit</button>
                      {isSuperadmin && <button onClick={() => { setTaskToDelete(t); setIsConfirmOpen(true); }} className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"><i className="bi bi-trash-fill"></i></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredTasks.length === 0 && (
                <tr><td colSpan={3} className="py-32 text-center opacity-40">
                  <i className="bi bi-folder2-open text-5xl text-gray-300 block mb-4"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data Kosong untuk periode ini</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{editingTask ? 'Perbarui Log' : 'Log Baru'}</h4>
                 <button onClick={() => !syncing && setIsModalOpen(false)} className="text-gray-400 hover:text-rose-500"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className={labelClass}>Bulan</label><select className={inputClass} value={formData.bulan} onChange={e => setFormData({...formData, bulan: e.target.value})}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
                    <div className="space-y-1.5"><label className={labelClass}>Tahun</label><input type="number" className={inputClass} value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                 </div>
                 <div className="space-y-1.5"><label className={labelClass}>Kategori Tugas</label><select className={`${inputClass} bg-blue-50 border-blue-100 text-blue-700`} value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as any, data: {}})}>{Object.entries(TASK_LABELS).map(([k,v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}</select></div>
                 
                 <div className="bg-gray-50/50 p-6 rounded-3xl border-2 border-dashed border-gray-100 space-y-4">
                    <h6 className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Field Detail Laporan</h6>
                    {renderDynamicFields()}
                 </div>

                 <div className="space-y-1.5 pt-4">
                    <label className={labelClass}>Keterangan Narasi (Opsional)</label>
                    <textarea rows={2} className={inputClass} value={formData.detail || ''} onChange={e => setFormData({...formData, detail: e.target.value})} placeholder="Ringkasan singkat untuk tampilan daftar..." />
                 </div>

                 <div className="pt-6 border-t flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 bg-white border border-gray-200 text-gray-400 rounded-xl text-[10px] font-black uppercase">Batal</button>
                    <button type="submit" disabled={syncing} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg disabled:bg-gray-400 flex items-center gap-2">
                       {syncing && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       <span>{syncing ? 'Menyimpan...' : 'Simpan Log'}</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TugasRutinPage;
