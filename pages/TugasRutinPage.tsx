
import React, { useState, useEffect, useMemo } from 'react';
import { TugasRutin, TaskType } from '../types';
import { fetchTugasRutinFromSheets, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { BULAN, TASK_LABELS, UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
// @ts-ignore
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

  const terisiKategori = useMemo(() => {
    return Array.from(new Set(filteredTasks.map(t => t.jenis)));
  }, [filteredTasks]);

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
    const payload = { 
      ...formData, 
      id: taskId, 
      timestamp: new Date().toISOString() 
    };
    const ok = await syncTableRemote('TUGAS_RUTIN', 'SAVE', payload);
    if(ok) { 
      setSuccessMsg(`Data log ${TASK_LABELS[formData.jenis || ''] || 'tugas'} berhasil disinkronkan.`);
      await loadData();
      setIsModalOpen(false); 
      setShowSuccess(true); 
      logActivity(editingTask ? 'UPDATE' : 'CREATE', 'Tugas Rutin', `Update log: ${formData.jenis}`);
    }
    setSyncing(false);
  };

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  const renderDynamicInputs = () => {
    const data = formData.data || {};
    const type = formData.jenis;
    const Input = ({ label, field, placeholder = "", typeAttr = "text" }: any) => (
      <div className="space-y-1.5">
        <label className={labelClass}>{label}</label>
        <input type={typeAttr} className={inputClass} value={data[field] || ''} onChange={e => updateDataField(field, e.target.value)} placeholder={placeholder} />
      </div>
    );

    const TextArea = ({ label, field, placeholder = "" }: any) => (
      <div className="col-span-full space-y-1.5">
        <label className={labelClass}>{label}</label>
        <textarea rows={2} className={`${inputClass} normal-case h-20 resize-none font-bold`} value={data[field] || ''} onChange={e => updateDataField(field, e.target.value)} placeholder={placeholder} />
      </div>
    );

    const Select = ({ label, field, options }: any) => (
      <div className="space-y-1.5">
        <label className={labelClass}>{label}</label>
        <select className={inputClass} value={data[field] || ''} onChange={e => updateDataField(field, e.target.value)}>
          <option value="">Pilih...</option>
          {options.map((o: string) => <option key={o} value={o}>{o.toUpperCase()}</option>)}
        </select>
      </div>
    );

    switch(type) {
      case TaskType.PELANTIKAN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Tanggal Pelantikan" field="tanggal_pelantikan" typeAttr="date" />
            <Input label="Judul Pelantikan" field="judul_pelantikan" />
            <Input label="Nama Pelantikan" field="nama_pelantikan" />
            <Input label="Tempat Pelantikan" field="tempat_pelantikan" />
            <Input label="Jumlah Peserta" field="jumlah_peserta_pelantikan" typeAttr="number" />
            <Input label="Link Dokumen" field="link_dokumen_pelantikan" placeholder="URL Google Drive" />
          </div>
        );
      case TaskType.APEL:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Tanggal Apel" field="tanggal_apel" typeAttr="date" />
            <Input label="Keterangan Apel" field="keterangan_apel" />
            <Input label="Tempat Apel" field="tempat_apel" />
            <Input label="Jumlah Peserta" field="jumlah_peserta_apel" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_apel" /></div>
          </div>
        );
      case TaskType.LHKPN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Unit Kerja" field="unit_lhkpn" options={UNIT_KERJA} />
            <Input label="Jumlah LHKPN" field="jumlah_lhkpn" typeAttr="number" />
            <TextArea label="Daftar Nama LHKPN" field="daftar_nama_lhkpn" />
            <Input label="Link Dokumen" field="link_dokumen_lhkpn" />
          </div>
        );
      case TaskType.LHKASN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Unit Kerja" field="unit_lhkasn" options={UNIT_KERJA} />
            <Input label="Jumlah LHKASN" field="jumlah_lhkasn" typeAttr="number" />
            <TextArea label="Daftar Nama LHKASN" field="daftar_nama_lhkasn" />
            <Input label="Link Dokumen" field="link_dokumen_lhkasn" />
          </div>
        );
      case TaskType.TUGAS_BELAJAR:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Jenis Tugas Belajar" field="jenis_tugas_belajar" options={['Mandiri', 'Beasiswa Pemerintah', 'Beasiswa Luar Negeri']} />
            <Input label="Nama Pegawai" field="nama_tugas_belajar" />
            <Input label="Jenjang Pendidikan" field="jenjang_pendidikan" placeholder="S1/S2/S3" />
            <Input label="Jurusan" field="jurusan_tugas_belajar" />
            <Input label="Kampus" field="kampus_tugas_belajar" />
            <Input label="Periode" field="periode_tugas_belajar" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_tugas_belajar" /></div>
          </div>
        );
      case TaskType.MAGANG:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Permohonan" field="jumlah_permohonan" typeAttr="number" />
            <Select label="Unit Tujuan" field="unit_tujuan_magang" options={UNIT_KERJA} />
            <Input label="Jumlah Magang" field="jumlah_magang" typeAttr="number" />
            <Input label="Link Dokumen" field="link_dokumen_magang" />
          </div>
        );
      case TaskType.PENELITIAN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Permohonan" field="jumlah_permohonan" typeAttr="number" />
            <Select label="Unit Tujuan" field="unit_tujuan_penelitian" options={UNIT_KERJA} />
            <Input label="Jumlah Penelitian" field="jumlah_penelitian" typeAttr="number" />
            <Input label="Link Dokumen" field="link_dokumen_penelitian" />
          </div>
        );
      case TaskType.SATYA_LENCANA:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select label="Kategori" field="kategori_satya_lencana" options={['10 Tahun', '20 Tahun', '30 Tahun']} />
            <Input label="Link Dokumen" field="link_dokumen_satya_lencana" />
          </div>
        );
      case TaskType.GELAR:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Pencantuman Gelar" field="jumlah_pencantuman_gelar" typeAttr="number" />
            <Input label="Nama Pegawai" field="nama_pegawai_gelar" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_gelar" /></div>
          </div>
        );
      case TaskType.PANGKAT:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Usulan" field="jumlah_usulan_pangkat" typeAttr="number" />
            <Input label="Jumlah Diterima" field="jumlah_diterima_pangkat" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_pangkat" /></div>
          </div>
        );
      case TaskType.JENJANG:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Usulan" field="jumlah_usulan_jenjang" typeAttr="number" />
            <Input label="Jumlah Diterima" field="jumlah_diterima_jenjang" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_jenjang" /></div>
          </div>
        );
      case TaskType.KGB:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Status Pegawai" field="status_pegawai_gaji" options={['PNS', 'CPNS', 'PPPK']} />
            <Input label="Jumlah Diproses" field="jumlah_diproses_gaji" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_gaji" /></div>
          </div>
        );
      case TaskType.MUTASI:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Diproses" field="jumlah_diproses_mutasi" typeAttr="number" />
            <Input label="Nama Pegawai" field="nama_pegawai_mutasi" />
            <Input label="Jabatan Lama" field="jabatan_lama" />
            <Input label="Unit Kerja Lama" field="unit_kerja_lama" />
            <Input label="Jabatan Baru" field="jabatan_baru" />
            <Input label="Unit Kerja Baru" field="unit_kerja_baru" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_mutasi" /></div>
          </div>
        );
      case TaskType.KARTU_SUAMI_ISTRI:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Usulan Kartu Istri" field="jumlah_usulan_istri" typeAttr="number" />
            <Input label="Diterima Kartu Istri" field="jumlah_diterima_istri" typeAttr="number" />
            <Input label="Usulan Kartu Suami" field="jumlah_usulan_suami" typeAttr="number" />
            <Input label="Diterima Kartu Suami" field="jumlah_diterima_suami" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_kartu_suami_istri" /></div>
          </div>
        );
      case TaskType.KARTU_BPJS:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Usulan BPJS" field="jumlah_usulan_bpjs" typeAttr="number" />
            <Input label="Jumlah Diterima BPJS" field="jumlah_diterima_bpjs" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_kartu_bpjs" /></div>
          </div>
        );
      case TaskType.CUTI:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Jenis Cuti Terbanyak" field="jenis_cuti" options={['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan', 'Cuti Besar', 'Cuti Alasan Penting']} />
            <Input label="Link Dokumen" field="link_dokumen_cuti" />
          </div>
        );
      case TaskType.SPMT_SPP:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah SPMT" field="jumlah_spmt" typeAttr="number" />
            <Input label="Jumlah SPP" field="jumlah_spp" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_spmt_spp" /></div>
          </div>
        );
      case TaskType.ABSENSI:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Unit Kerja" field="unit_absensi" options={UNIT_KERJA} />
            <Input label="Jumlah Absensi (Orang)" field="jumlah_absensi" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_absensi" /></div>
          </div>
        );
      case TaskType.PERKAWINAN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Perkawinan" field="jumlah_perkawinan" typeAttr="number" />
            <Input label="Jumlah Perceraian" field="jumlah_perceraian" typeAttr="number" />
            <Input label="Jumlah Kelahiran" field="jumlah_kelahiran" typeAttr="number" />
            <Input label="Link Dokumen" field="link_dokumen_perkawinan" />
          </div>
        );
      case TaskType.HUKUMAN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Hukuman Ringan" field="jumlah_ringan" typeAttr="number" />
            <Input label="Hukuman Sedang" field="jumlah_sedang" typeAttr="number" />
            <Input label="Hukuman Berat" field="jumlah_berat" typeAttr="number" />
            <Input label="Link Dokumen" field="link_dokumen_hukuman" />
          </div>
        );
      case TaskType.PENSIUN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Usulan Pensiun" field="jumlah_usulan_pensiun" typeAttr="number" />
            <Input label="Jumlah SK Pensiun" field="jumlah_sk_pensiun" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_pensiun" /></div>
          </div>
        );
      case TaskType.GRATIFIKASI:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Jumlah Laporan Gratifikasi" field="jumlah_gratifikasi" typeAttr="number" />
            <Input label="Jumlah Benturan Kepentingan" field="jumlah_benturan_kepentingan" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_gratifikasi_benturan" /></div>
          </div>
        );
      case TaskType.UANG_MAKAN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Periode Tagihan" field="periode" placeholder="Contoh: Januari 2025" />
            <Input label="Keterangan" field="keterangan" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_uang_makan" /></div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Input label="Volume / Jumlah" field="jumlah" placeholder="0" />
            <Input label="Satuan" field="satuan" placeholder="Berkas / Orang / Kegiatan" />
            <div className="col-span-full"><Input label="Keterangan Atribut" field="atribut" placeholder="Detail spesifik data..." /></div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => !syncing && setIsConfirmOpen(false)} onConfirm={async () => {
         if(taskToDelete) {
           setSyncing(true);
           const ok = await syncTableRemote('TUGAS_RUTIN', 'DELETE', { id: taskToDelete.id });
           if(ok) { await loadData(); setIsConfirmOpen(false); setShowSuccess(true); }
           setSyncing(false);
         }
      }} loading={syncing} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter">Administrasi Rutin</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sinkronisasi Database Logistik & Kepegawaian DJKI</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button onClick={() => { setEditingTask(null); setFormData({ bulan: filterMonth, tahun: filterYear, jenis: TaskType.PELANTIKAN, data: {} }); setIsModalOpen(true); }} className="px-10 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">+ Register Log Baru</button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 no-print">
        <div className="flex-1"><label className={labelClass}>Bulan Laporan</label><select className="w-full px-5 py-3 bg-gray-50 border-2 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
        <div className="flex-1"><label className={labelClass}>Tahun Laporan</label><input type="number" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-2xl text-[10px] font-black outline-none focus:border-blue-600" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} /></div>
      </div>

      <div className="flex flex-wrap gap-2 px-2">
         <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-2 py-1.5">Pencapaian Periode Ini:</span>
         {terisiKategori.map(k => (
           <span key={k} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg border border-emerald-100 uppercase tracking-widest animate-fadeIn"><i className="bi bi-check-circle-fill mr-1.5"></i> {TASK_LABELS[k] || k}</span>
         ))}
         {terisiKategori.length === 0 && <span className="text-[9px] font-bold text-gray-300 uppercase italic">Log untuk periode ini masih kosong</span>}
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
            <tr><th className="px-10 py-5 w-72">Kategori & Waktu</th><th className="px-4 py-5">Ringkasan Realisasi</th><th className="px-10 py-5 text-right">Opsi</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="py-24 text-center text-gray-300 font-black text-[10px] uppercase animate-pulse">Menghubungkan Cloud...</td></tr>
            ) : filteredTasks.map(t => (
              <tr key={t.id} className="hover:bg-blue-50/5 group">
                <td className="px-10 py-7">
                  <span className="px-3 py-1 bg-gray-900 text-white text-[8px] font-black rounded uppercase tracking-widest inline-block mb-2">{TASK_LABELS[t.jenis] || t.jenis}</span>
                  <p className="text-[12px] font-black text-gray-950 uppercase">{t.bulan} {t.tahun}</p>
                </td>
                <td className="px-4 py-7">
                  <p className="text-[11px] font-bold text-gray-950 uppercase leading-relaxed">{t.detail || 'Data Administrasi Terlampir.'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {t.data && Object.entries(t.data).slice(0, 12).map(([k, v]) => v && (
                      <span key={k} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[7px] font-bold uppercase rounded border border-gray-200">
                        {k.replace(/_/g, ' ')}: <span className="text-gray-950">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-10 py-7 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingTask(t); setFormData({ ...t }); setIsModalOpen(true); }} className="h-9 px-5 bg-amber-50 text-amber-600 rounded-xl font-black text-[9px] uppercase border border-amber-100 shadow-sm">Edit</button>
                    {isSuperadmin && <button onClick={() => { setTaskToDelete(t); setIsConfirmOpen(true); }} className="h-9 w-9 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-center justify-center shadow-sm"><i className="bi bi-trash-fill"></i></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
                 <h4 className="text-xl font-black uppercase text-gray-900 tracking-tighter">{editingTask ? 'Perbarui Log' : 'Registrasi Log Baru'}</h4>
                 <button onClick={() => !syncing && setIsModalOpen(false)} className="text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-2 gap-6">
                    <div><label className={labelClass}>Bulan</label><select className={inputClass} value={formData.bulan} onChange={e => setFormData({...formData, bulan: e.target.value})}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
                    <div><label className={labelClass}>Tahun</label><input type="number" className={inputClass} value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                 </div>
                 <div>
                    <label className={labelClass}>Kategori Administrasi</label>
                    <select className={`${inputClass} border-blue-100 text-blue-700`} value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as any, data: {}})}>
                        {Object.entries(TASK_LABELS).sort((a,b) => a[1].localeCompare(b[1])).map(([k,v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}
                    </select>
                 </div>
                 
                 <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border-2 border-dashed border-blue-100 space-y-6">
                    <h6 className="text-[9px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><i className="bi bi-info-circle-fill"></i> Data Atribut Spesifik ({TASK_LABELS[formData.jenis || '']})</h6>
                    {renderDynamicInputs()}
                 </div>

                 <div>
                    <label className={labelClass}>Ringkasan Narasi (Tampil di Laporan Bulanan)</label>
                    <textarea rows={3} className={`${inputClass} h-32 resize-none normal-case font-bold`} value={formData.detail || ''} onChange={e => setFormData({...formData, detail: e.target.value})} placeholder="Uraikan detail pencapaian tugas rutin bulan ini agar pimpinan mendapatkan gambaran utuh..." />
                 </div>

                 <div className="pt-8 border-t flex justify-end gap-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase shadow-sm">Batalkan</button>
                    <button type="submit" disabled={syncing} className="px-16 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-4 active:scale-95 disabled:bg-gray-300">
                       {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                       <span>Simpan & Sinkronkan</span>
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TugasRutinPage;
