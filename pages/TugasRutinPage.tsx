
import React, { useState, useEffect } from 'react';
import { TASK_LABELS, BULAN, UNIT_KERJA } from '../constants';
import { TaskType, TugasRutin, Pegawai } from '../types';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';

const SectionHeader = ({ icon, label, color = "text-blue-600", bg = "bg-blue-50" }: { icon: string, label: string, color?: string, bg?: string }) => (
  <div className="flex items-center space-x-2 mb-3 mt-4 first:mt-0 col-span-full border-b border-gray-100 pb-2">
    <div className={`h-6 w-6 ${bg} ${color} rounded-md flex items-center justify-center`}>
      <i className={`bi ${icon} text-[10px]`}></i>
    </div>
    <h5 className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{label}</h5>
  </div>
);

const InputField = ({ label, name, type = "text", placeholder = "", value, onChange, fullWidth = false, disabled = false }: any) => (
  <div className={`space-y-0.5 ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider block pl-0.5">{label}</label>
    <input 
      type={type} 
      name={name}
      placeholder={placeholder}
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(name, e.target.value)}
      className={`w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-900 outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm focus:bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
    />
  </div>
);

const SelectField = ({ label, name, options, value, onChange, fullWidth = false }: any) => (
  <div className={`space-y-0.5 ${fullWidth ? 'col-span-full' : ''}`}>
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider block pl-0.5">{label}</label>
    <div className="relative group">
      <select 
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-900 outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm focus:bg-white"
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
    <label className="text-[8px] font-black text-gray-400 uppercase tracking-wider block pl-0.5">{label}</label>
    <textarea 
      name={name}
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      rows={3}
      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-900 outline-none focus:ring-1 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm focus:bg-white resize-none" 
    />
  </div>
);

const TugasRutinPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [filterBulan, setFilterBulan] = useState('');
  const [filterJenis, setFilterJenis] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TugasRutin | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredLogs.map(t => ({
      Bulan: t.bulan,
      Tahun: t.tahun,
      Kategori: TASK_LABELS[t.jenis],
      ...t.data
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Laporan Rutin");
    XLSX.writeFile(wb, `Laporan_Rutin_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Tugas Rutin', 'Mengekspor laporan rutin');
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

  const handleSave = () => {
    if (!formData.jenis_tugas) {
      alert("Harap pilih kategori tugas");
      return;
    }

    const { bulan_laporan, tahun_laporan, jenis_tugas, ...restData } = formData;
    let updatedList: TugasRutin[];
    
    const taskDetail = `${TASK_LABELS[jenis_tugas as TaskType]} - ${bulan_laporan} ${tahun_laporan}`;

    if (editingTask) {
      updatedList = tasks.map(t => t.id === editingTask.id ? {
        ...t,
        bulan: bulan_laporan,
        tahun: parseInt(tahun_laporan),
        jenis: jenis_tugas,
        detail: taskDetail,
        data: restData
      } : t);
      logActivity('UPDATE', 'Tugas Rutin', `Update: ${taskDetail}`);
    } else {
      const newTask: TugasRutin = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        bulan: bulan_laporan,
        tahun: parseInt(tahun_laporan),
        jenis: jenis_tugas,
        detail: taskDetail,
        data: restData
      };
      updatedList = [newTask, ...tasks];
      logActivity('CREATE', 'Tugas Rutin', `Entry: ${taskDetail}`);
    }
    
    setTasks(updatedList);
    localStorage.setItem('tugas_rutin_db', JSON.stringify(updatedList));
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(`Hapus data ini?`)) {
      const updatedList = tasks.filter(t => t.id !== id);
      setTasks(updatedList);
      localStorage.setItem('tugas_rutin_db', JSON.stringify(updatedList));
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

      case TaskType.TUGAS_BELAJAR:
        return (
          <>
            <SectionHeader icon="bi-mortarboard" label="Tugas Belajar" color="text-blue-600" bg="bg-blue-50" />
            <SelectField label="Jenis Tugas Belajar" name="jenis_tugas_belajar" options={['Internal', 'Eksternal', 'Beasiswa']} value={val('jenis_tugas_belajar')} {...common} />
            <InputField label="Nama Pegawai" name="nama_tugas_belajar" value={val('nama_tugas_belajar')} {...common} />
            <SelectField label="Jenjang Pendidikan" name="jenjang_pendidikan" options={['D3', 'D4', 'S1', 'S2', 'S3']} value={val('jenjang_pendidikan')} {...common} />
            <InputField label="Jurusan" name="jurusan_tugas_belajar" value={val('jurusan_tugas_belajar')} {...common} />
            <InputField label="Kampus" name="kampus_tugas_belajar" value={val('kampus_tugas_belajar')} {...common} />
            <InputField label="Periode" name="periode_tugas_belajar" value={val('periode_tugas_belajar')} {...common} placeholder="Contoh: 2024-2026" />
            <InputField label="Link Dokumen" name="link_dokumen_tugas_belajar" fullWidth value={val('link_dokumen_tugas_belajar')} {...common} />
          </>
        );

      case TaskType.MAGANG:
      case TaskType.PENELITIAN:
        const isMagang = jenis_tugas === TaskType.MAGANG;
        const sub = isMagang ? 'magang' : 'penelitian';
        return (
          <>
            <SectionHeader icon={isMagang ? "bi-building" : "bi-search"} label={isMagang ? "Magang" : "Penelitian"} color="text-cyan-600" bg="bg-cyan-50" />
            <InputField label="Jumlah Permohonan" name="jumlah_permohonan" type="number" value={val('jumlah_permohonan')} {...common} />
            <InputField label={`Unit Tujuan ${isMagang ? 'Magang' : 'Penelitian'}`} name={`unit_tujuan_${sub}`} value={val(`unit_tujuan_${sub}`)} {...common} />
            <InputField label={`Jumlah ${isMagang ? 'Magang' : 'Penelitian'}`} name={`jumlah_${sub}`} type="number" value={val(`jumlah_${sub}`)} {...common} />
            <InputField label={`Link Dokumen ${isMagang ? 'Magang' : 'Penelitian'}`} name={`link_dokumen_${sub}`} fullWidth value={val(`link_dokumen_${sub}`)} {...common} />
          </>
        );

      case TaskType.SATYA_LENCANA:
        return (
          <>
            <SectionHeader icon="bi-patch-check" label="Satya Lencana" color="text-amber-600" bg="bg-amber-50" />
            <SelectField label="Kategori Satya Lencana" name="kategori_satya_lencana" options={['10 Tahun', '20 Tahun', '30 Tahun']} value={val('kategori_satya_lencana')} {...common} fullWidth />
            <InputField label="Jumlah" name="jumlah" type="number" value={val('jumlah')} {...common} />
            <InputField label="Link Dokumen" name="link_dokumen_satya_lencana" fullWidth value={val('link_dokumen_satya_lencana')} {...common} />
          </>
        );

      case TaskType.GELAR:
        return (
          <>
            <SectionHeader icon="bi-mortarboard-fill" label="Pencantuman Gelar" color="text-violet-600" bg="bg-violet-50" />
            <InputField label="Jumlah Pencantuman Gelar" name="jumlah_pencantuman_gelar" type="number" value={val('jumlah_pencantuman_gelar')} {...common} />
            <InputField label="Nama Pegawai" name="nama_pegawai_gelar" value={val('nama_pegawai_gelar')} {...common} />
            <InputField label="Link Dokumen Gelar" name="link_dokumen_gelar" fullWidth value={val('link_dokumen_gelar')} {...common} />
          </>
        );

      case TaskType.PANGKAT:
      case TaskType.JENJANG:
        const isPangkat = jenis_tugas === TaskType.PANGKAT;
        const key = isPangkat ? 'pangkat' : 'jenjang';
        return (
          <>
            <SectionHeader icon="bi-arrow-up-circle" label={`Kenaikan ${isPangkat ? 'Pangkat' : 'Jenjang'}`} color="text-blue-600" bg="bg-blue-50" />
            <InputField label={`Jumlah Usulan ${key.charAt(0).toUpperCase() + key.slice(1)}`} name={`jumlah_usulan_${key}`} type="number" value={val(`jumlah_usulan_${key}`)} {...common} />
            <InputField label={`Jumlah Diterima ${key.charAt(0).toUpperCase() + key.slice(1)}`} name={`jumlah_diterima_${key}`} type="number" value={val(`jumlah_diterima_${key}`)} {...common} />
            <InputField label={`Link Dokumen ${key.charAt(0).toUpperCase() + key.slice(1)}`} name={`link_dokumen_${key}`} fullWidth value={val(`link_dokumen_${key}`)} {...common} />
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

      case TaskType.MUTASI:
        return (
          <>
            <SectionHeader icon="bi-arrow-left-right" label="Mutasi Pegawai" color="text-amber-600" bg="bg-amber-50" />
            <InputField label="Jumlah Diproses Mutasi" name="jumlah_diproses_mutasi" type="number" value={val('jumlah_diproses_mutasi')} {...common} />
            <InputField label="Nama Pegawai" name="nama_pegawai_mutasi" value={val('nama_pegawai_mutasi')} {...common} />
            <InputField label="Jabatan Lama" name="jabatan_lama" value={val('jabatan_lama')} {...common} />
            <InputField label="Unit Kerja Lama" name="unit_kerja_lama" value={val('unit_kerja_lama')} {...common} />
            <InputField label="Jabatan Baru" name="jabatan_baru" value={val('jabatan_baru')} {...common} />
            <InputField label="Unit Kerja Baru" name="unit_kerja_baru" value={val('unit_kerja_baru')} {...common} />
            <InputField label="Link Dokumen Mutasi" name="link_dokumen_mutasi" fullWidth value={val('link_dokumen_mutasi')} {...common} />
          </>
        );

      case TaskType.KARTU_SUAMI_ISTRI:
        return (
          <>
            <SectionHeader icon="bi-person-vcard" label="Kartu Suami / Istri" color="text-pink-600" bg="bg-pink-50" />
            <div className="grid grid-cols-2 gap-4 col-span-full">
              <InputField label="Usulan Kartu Istri" name="jumlah_usulan_istri" type="number" value={val('jumlah_usulan_istri')} {...common} />
              <InputField label="Diterima Kartu Istri" name="jumlah_diterima_istri" type="number" value={val('jumlah_diterima_istri')} {...common} />
              <InputField label="Usulan Kartu Suami" name="jumlah_usulan_suami" type="number" value={val('jumlah_usulan_suami')} {...common} />
              <InputField label="Diterima Kartu Suami" name="jumlah_diterima_suami" type="number" value={val('jumlah_diterima_suami')} {...common} />
            </div>
            <InputField label="Link Dokumen" name="link_dokumen_kartu_suami_istri" fullWidth value={val('link_dokumen_kartu_suami_istri')} {...common} />
          </>
        );

      case TaskType.KARTU_BPJS:
        return (
          <>
            <SectionHeader icon="bi-card-list" label="Kartu BPJS" color="text-emerald-600" bg="bg-emerald-50" />
            <InputField label="Jumlah Usulan BPJS" name="jumlah_usulan_bpjs" type="number" value={val('jumlah_usulan_bpjs')} {...common} />
            <InputField label="Jumlah Diterima" name="jumlah_diterima_bpjs" type="number" value={val('jumlah_diterima_bpjs')} {...common} />
            <InputField label="Link Dokumen BPJS" name="link_dokumen_kartu_bpjs" fullWidth value={val('link_dokumen_kartu_bpjs')} {...common} />
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

      case TaskType.SPMT_SPP:
        return (
          <>
            <SectionHeader icon="bi-file-earmark-check" label="SPMT / SPP" color="text-violet-600" bg="bg-violet-50" />
            <InputField label="Jumlah SPMT" name="jumlah_spmt" type="number" value={val('jumlah_spmt')} {...common} />
            <InputField label="Jumlah SPP" name="jumlah_spp" type="number" value={val('jumlah_spp')} {...common} />
            <InputField label="Link Dokumen SPMT/SPP" name="link_dokumen_spmt_spp" fullWidth value={val('link_dokumen_spmt_spp')} {...common} />
          </>
        );

      case TaskType.ABSENSI:
        return (
          <>
            <SectionHeader icon="bi-clock-history" label="Absensi" color="text-orange-600" bg="bg-orange-50" />
            <SelectField label="Unit Absensi" name="unit_absensi" options={UNIT_KERJA} value={val('unit_absensi')} {...common} fullWidth />
            <InputField label="Jumlah Absensi" name="jumlah_absensi" type="number" value={val('jumlah_absensi')} {...common} />
            <InputField label="Link Dokumen Absensi" name="link_dokumen_absensi" fullWidth value={val('link_dokumen_absensi')} {...common} />
          </>
        );

      case TaskType.PERKAWINAN:
        return (
          <>
            <SectionHeader icon="bi-heart-pulse" label="Perkawinan, Perceraian, Kelahiran" color="text-pink-600" bg="bg-pink-50" />
            <InputField label="Jumlah Perkawinan" name="jumlah_perkawinan" type="number" value={val('jumlah_perkawinan')} {...common} />
            <InputField label="Jumlah Perceraian" name="jumlah_perceraian" type="number" value={val('jumlah_perceraian')} {...common} />
            <InputField label="Jumlah Kelahiran" name="jumlah_kelahiran" type="number" value={val('jumlah_kelahiran')} {...common} />
            <InputField label="Link Dokumen" name="link_dokumen_perkawinan" fullWidth value={val('link_dokumen_perkawinan')} {...common} />
          </>
        );

      case TaskType.HUKUMAN:
        return (
          <>
            <SectionHeader icon="bi-exclamation-octagon" label="Hukuman Disiplin" color="text-rose-600" bg="bg-rose-50" />
            <InputField label="Jumlah Ringan" name="jumlah_ringan" type="number" value={val('jumlah_ringan')} {...common} />
            <InputField label="Jumlah Sedang" name="jumlah_sedang" type="number" value={val('jumlah_sedang')} {...common} />
            <InputField label="Jumlah Berat" name="jumlah_berat" type="number" value={val('jumlah_berat')} {...common} />
            <InputField label="Link Dokumen Hukuman" name="link_dokumen_hukuman" fullWidth value={val('link_dokumen_hukuman')} {...common} />
          </>
        );

      case TaskType.PENSIUN:
        return (
          <>
            <SectionHeader icon="bi-door-open" label="Usulan Pensiun" color="text-rose-600" bg="bg-rose-50" />
            <InputField label="Jumlah Usulan Pensiun" name="jumlah_usulan_pensiun" type="number" value={val('jumlah_usulan_pensiun')} {...common} />
            <InputField label="Jumlah SK Pensiun" name="jumlah_sk_pensiun" type="number" value={val('jumlah_sk_pensiun')} {...common} />
            <InputField label="Link Dokumen Pensiun" name="link_dokumen_pensiun" fullWidth value={val('link_dokumen_pensiun')} {...common} />
          </>
        );

      case TaskType.GRATIFIKASI:
        return (
          <>
            <SectionHeader icon="bi-shield-exclamation" label="Gratifikasi & Benturan Kepentingan" color="text-amber-600" bg="bg-amber-50" />
            <InputField label="Jumlah Gratifikasi" name="jumlah_gratifikasi" type="number" value={val('jumlah_gratifikasi')} {...common} />
            <InputField label="Jumlah Benturan Kepentingan" name="jumlah_benturan_kepentingan" type="number" value={val('jumlah_benturan_kepentingan')} {...common} />
            <InputField label="Link Dokumen" name="link_dokumen_gratifikasi_benturan_kepentingan" fullWidth value={val('link_dokumen_gratifikasi_benturan_kepentingan')} {...common} />
          </>
        );

      default:
        return (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
             <i className="bi bi-database-exclamation text-4xl text-gray-200 block mb-3"></i>
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Pilih Kategori Tugas Untuk Memetakan Field Database</p>
          </div>
        );
    }
  };

  const filteredTasks = tasks.filter(t => 
    (!filterBulan || t.bulan === filterBulan) && 
    (filterJenis === 'ALL' || t.jenis === filterJenis)
  );

  const filteredLogs = tasks.filter(t => 
    (!filterBulan || t.bulan === filterBulan) && 
    (filterJenis === 'ALL' || t.jenis === filterJenis)
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-end gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 w-full max-w-2xl">
          <SelectField label="Bulan" options={BULAN} value={filterBulan} onChange={(_:any, v:any) => setFilterBulan(v)} />
          <SelectField label="Kategori" options={[{ value: 'ALL', label: 'SEMUA KATEGORI' }, ...Object.entries(TASK_LABELS).map(([k, v]) => ({ value: k, label: v.toUpperCase() }))]} value={filterJenis} onChange={(_:any, v:any) => setFilterJenis(v)} />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button onClick={handleExport} className="h-12 w-12 flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl shadow-sm hover:bg-emerald-600 hover:text-white transition-all" title="Ekspor Database">
              <i className="bi bi-file-earmark-excel-fill text-xl"></i>
          </button>
          {canEdit && (
            <button onClick={() => handleOpenModal()} className="flex-1 lg:flex-none px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] hover:bg-blue-700 shadow-lg shadow-blue-600/20 uppercase tracking-widest transition-all"><i className="bi bi-plus-lg mr-2"></i>Entry Data Baru</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
              <tr>
                <th className="px-8 py-5">Periode</th>
                <th className="px-4 py-5">Kategori</th>
                <th className="px-4 py-5">Ringkasan Laporan</th>
                <th className="px-8 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Menghubungkan ke Database...</td></tr>
              ) : filteredTasks.length > 0 ? filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-blue-50/5 group transition-all">
                  <td className="px-8 py-5">
                    <p className="text-[10px] font-black text-gray-900 uppercase">{t.bulan} {t.tahun}</p>
                    <p className="text-[7px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">ID: {t.id}</p>
                  </td>
                  <td className="px-4 py-5">
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[8px] font-black uppercase rounded-lg border border-indigo-100">{TASK_LABELS[t.jenis]}</span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(t.data)
                        .filter(([k,v]) => v && !k.startsWith('link_dokumen'))
                        .slice(0, 4)
                        .map(([k,v]) => (
                          <span key={k} className="text-[7px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-black uppercase">{k.replace(/_/g,' ')}: {String(v)}</span>
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
                <tr><td colSpan={4} className="px-8 py-24 text-center text-[11px] font-black text-gray-400 uppercase tracking-widest opacity-30">Database belum berisi laporan untuk kriteria ini</td></tr>
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
                  <h4 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">{editingTask ? 'Perbarui Entri Laporan' : 'Entry Laporan Rutin'}</h4>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-8" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                <SectionHeader icon="bi-calendar-check" label="I. Administrasi Periode" />
                <SelectField label="Bulan Laporan" name="bulan_laporan" options={BULAN} value={formData.bulan_laporan} onChange={handleInputChange} />
                <InputField label="Tahun" name="tahun_laporan" type="number" value={formData.tahun_laporan} onChange={handleInputChange} />
                
                <SectionHeader icon="bi-tags" label="II. Klasifikasi Kategori" />
                <SelectField 
                  label="Pilih Kategori Tugas" 
                  name="jenis_tugas" 
                  fullWidth 
                  options={Object.entries(TASK_LABELS).map(([k, v]) => ({ value: k, label: v.toUpperCase() }))} 
                  value={formData.jenis_tugas} 
                  onChange={handleInputChange} 
                />
                
                {renderCategoryFields()}
              </div>
            </form>
            <div className="px-10 py-7 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3.5 text-[10px] font-black text-gray-500 uppercase bg-white border border-gray-200 rounded-xl active:scale-95 transition-all">Batalkan</button>
              <button className="px-12 py-3.5 text-[10px] font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 uppercase active:scale-95 transition-all" onClick={handleSave}>Simpan Laporan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TugasRutinPage;
