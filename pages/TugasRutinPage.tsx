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

  // Statistik per kategori untuk filter yang aktif
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredTasks.forEach(t => {
      const label = TASK_LABELS[t.jenis] || t.jenis;
      stats[label] = (stats[label] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  }, [filteredTasks]);

  const handleExportExcel = () => {
    if (filteredTasks.length === 0) return alert("Tidak ada data untuk diekspor pada periode ini.");
    
    const wb = XLSX.utils.book_new();
    
    // 1. Sheet Ringkasan (Semua Kategori)
    const summaryData = filteredTasks.map(t => ({
      'Bulan': t.bulan,
      'Tahun': t.tahun,
      'Kategori Tugas': TASK_LABELS[t.jenis] || t.jenis,
      'Narasi Realisasi': t.detail,
      'Timestamp Cloud': t.timestamp
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "RINGKASAN_GLOBAL");

    // 2. Sheet per Kategori (Data Detail Dinamis)
    const grouped = filteredTasks.reduce((acc, task) => {
      if (!acc[task.jenis]) acc[task.jenis] = [];
      
      // Ratakan data (flatten) agar field dinamis jadi kolom Excel
      const flatRow: any = {
        'NIP_PENGINPUT': task.id.split('-')[1] || '-', // Contoh ekstraksi NIP dari ID
        'BULAN': task.bulan,
        'TAHUN': task.tahun,
        'NARASI_DETAIL': task.detail
      };

      // Tambahkan data atribut spesifik
      if (task.data) {
        Object.entries(task.data).forEach(([key, val]) => {
          const cleanKey = key.toUpperCase().replace(/_/g, ' ');
          flatRow[cleanKey] = val;
        });
      }

      acc[task.jenis].push(flatRow);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(grouped).forEach(([jenis, data]) => {
      const label = (TASK_LABELS[jenis] || jenis).substring(0, 31);
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, label);
    });

    XLSX.writeFile(wb, `LAPORAN_RUTIN_SDM_${filterMonth.toUpperCase()}_${filterYear}.xlsx`);
    logActivity('DOWNLOAD', 'Tugas Rutin', `Ekspor Excel Periode ${filterMonth} ${filterYear}`);
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
      case TaskType.LHKPN:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Unit Kerja" field="unit_lhkpn" options={UNIT_KERJA} />
            <Input label="Jumlah LHKPN" field="jumlah_lhkpn" typeAttr="number" />
            <TextArea label="Daftar Nama LHKPN" field="daftar_nama_lhkpn" />
            <Input label="Link Dokumen" field="link_dokumen_lhkpn" />
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
      case TaskType.KGB:
        return (
          <div className="grid grid-cols-2 gap-6">
            <Select label="Status Pegawai" field="status_pegawai_gaji" options={['PNS', 'CPNS', 'PPPK']} />
            <Input label="Jumlah Diproses" field="jumlah_diproses_gaji" typeAttr="number" />
            <div className="col-span-full"><Input label="Link Dokumen" field="link_dokumen_gaji" /></div>
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
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-6 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
             <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i>
             Ekspor Excel
          </button>
          {canEdit && (
            <button onClick={() => { setEditingTask(null); setFormData({ bulan: filterMonth, tahun: filterYear, jenis: TaskType.PELANTIKAN, data: {} }); setIsModalOpen(true); }} className="flex-[1.5] md:flex-none px-10 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">+ Log Baru</button>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 no-print">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1"><label className={labelClass}>Bulan Laporan</label><select className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></div>
          <div className="flex-1"><label className={labelClass}>Tahun Laporan</label><input type="number" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-black outline-none focus:border-blue-600 transition-all" value={filterYear} onChange={e => setFilterYear(parseInt(e.target.value))} /></div>
        </div>

        <div className="space-y-4">
           <h6 className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-4">Ringkasan Input Kategori ({filterMonth} {filterYear}):</h6>
           <div className="flex flex-wrap gap-3">
              {categoryStats.length > 0 ? categoryStats.map(([label, count]) => (
                <div key={label} className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3 animate-fadeIn">
                   <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                   <span className="text-[10px] font-black text-gray-800 uppercase">{label}</span>
                   <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-lg">{count}</span>
                </div>
              )) : (
                <div className="w-full py-6 text-center border-2 border-dashed border-gray-100 rounded-[2rem]">
                   <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Belum ada tugas rutin yang diinput untuk periode ini</p>
                </div>
              )}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-[#111827] text-[8px] font-black uppercase text-gray-400 border-b border-white/5 tracking-widest">
            <tr>
              <th className="px-10 py-6 w-72">Kategori & Waktu</th>
              <th className="px-4 py-6">Ringkasan Realisasi & Detail Atribut</th>
              <th className="px-10 py-6 text-right">Opsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={3} className="py-24 text-center text-gray-300 font-black text-[10px] uppercase animate-pulse">Menghubungkan Cloud...</td></tr>
            ) : filteredTasks.map(t => (
              <tr key={t.id} className="hover:bg-blue-50/5 group transition-all">
                <td className="px-10 py-7 align-top">
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg border border-blue-100 uppercase tracking-widest w-fit">{TASK_LABELS[t.jenis] || t.jenis}</span>
                    <p className="text-[12px] font-black text-gray-950 uppercase">{t.bulan} {t.tahun}</p>
                    <p className="text-[8px] font-mono text-gray-400 tracking-tighter">ID: {t.id}</p>
                  </div>
                </td>
                <td className="px-4 py-7 align-top">
                  <p className="text-[11px] font-bold text-gray-950 uppercase leading-relaxed mb-4">{t.detail || 'Data Administrasi Terlampir.'}</p>
                  
                  {/* Tampilan Data Atribut Dinamis di Tabel */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    {t.data && Object.entries(t.data).map(([k, v]) => v && (
                      <div key={k} className="flex flex-col">
                        <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">{k.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] font-black text-blue-600 uppercase truncate" title={String(v)}>{String(v)}</span>
                      </div>
                    ))}
                    {(!t.data || Object.keys(t.data).length === 0) && (
                       <span className="text-[8px] font-bold text-gray-300 italic uppercase">Tidak ada atribut tambahan</span>
                    )}
                  </div>
                </td>
                <td className="px-10 py-7 text-right align-top">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setEditingTask(t); setFormData({ ...t }); setIsModalOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all"><i className="bi bi-pencil-fill"></i></button>
                    {isSuperadmin && <button onClick={() => { setTaskToDelete(t); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl shadow-sm hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"><i className="bi bi-trash-fill"></i></button>}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTasks.length === 0 && !loading && (
               <tr>
                  <td colSpan={3} className="py-32 text-center opacity-30">
                     <i className="bi bi-clipboard2-x text-6xl block mb-4"></i>
                     <p className="text-[11px] font-black uppercase tracking-widest">Database log kosong pada periode ini</p>
                  </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <h4 className="text-xl font-black uppercase text-gray-900 tracking-tighter">{editingTask ? 'Perbarui Log' : 'Registrasi Log Baru'}</h4>
                 <button onClick={() => !syncing && setIsModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
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

                 <div className="pt-8 border-t flex justify-end gap-4 shrink-0">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase shadow-sm active:scale-95 transition-all">Batalkan</button>
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