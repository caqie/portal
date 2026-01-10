
import React, { useState, useEffect, useMemo } from 'react';
import { Laporan, TugasRutin, Pegawai, TaskType } from '../types';
import { BULAN, TASK_LABELS } from '../constants';
import { fetchLaporanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';

const LaporanPage = () => {
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  const [laporanList, setLaporanList] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'generator'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaporan, setEditingLaporan] = useState<Laporan | null>(null);
  
  // States for Generator
  const [genMonth, setGenMonth] = useState(BULAN[new Date().getMonth()]);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [previewData, setPreviewData] = useState<any>(null);
  
  const [searchBulan, setSearchBulan] = useState('');
  const [searchTahun, setSearchTahun] = useState(new Date().getFullYear().toString());
  const [formData, setFormData] = useState<Partial<Laporan>>({});

  useEffect(() => { 
    loadLaporan(); 
  }, []);

  const loadLaporan = async () => {
    setLoading(true);
    try {
      const savedLocal = localStorage.getItem('portal_laporan_db');
      if (savedLocal) {
        setLaporanList(JSON.parse(savedLocal));
      } else {
        const data = await fetchLaporanFromSheets();
        setLaporanList(data);
        localStorage.setItem('portal_laporan_db', JSON.stringify(data));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const generateConsolidatedReport = () => {
    // 1. Ambil Data Pegawai
    const pegRaw = localStorage.getItem('portal_pegawai_db');
    const pegList: Pegawai[] = pegRaw ? JSON.parse(pegRaw) : [];
    
    // 2. Ambil Data Tugas Rutin
    const taskRaw = localStorage.getItem('tugas_rutin_db');
    const allTasks: TugasRutin[] = taskRaw ? JSON.parse(taskRaw) : [];
    
    // 3. Filter Tugas Rutin berdasarkan bulan & tahun
    const monthlyTasks = allTasks.filter(t => t.bulan === genMonth && t.tahun === genYear);
    
    // 4. Hitung Statistik SDM
    const stats = {
      total: pegList.length,
      pns: pegList.filter(p => p.jenisPegawai === 'PNS').length,
      cpns: pegList.filter(p => p.jenisPegawai === 'CPNS').length,
      pppk: pegList.filter(p => p.jenisPegawai === 'PPPK').length,
      pppk_pw: pegList.filter(p => (p.jenisPegawai || '').includes('PW')).length,
    };

    // 5. Kelompokkan Tugas Rutin
    const taskSummary = monthlyTasks.reduce((acc: any, t) => {
      const label = TASK_LABELS[t.jenis];
      if (!acc[label]) acc[label] = [];
      acc[label].push(t.data);
      return acc;
    }, {});

    setPreviewData({
      month: genMonth,
      year: genYear,
      stats,
      tasks: taskSummary,
      generatedAt: new Date().toLocaleString('id-ID')
    });
  };

  const handleSaveConsolidated = () => {
    if (!previewData) return;
    
    const newLaporan: Laporan = {
      id: Date.now().toString(),
      judul: `LAPORAN KONSOLIDASI SDM BULAN ${genMonth.toUpperCase()} ${genYear}`,
      jenis: 'Bulanan',
      periode: genMonth,
      tahun: genYear,
      status: 'Approved',
      createdAt: new Date().toISOString()
    };

    const updated = [newLaporan, ...laporanList];
    setLaporanList(updated);
    localStorage.setItem('portal_laporan_db', JSON.stringify(updated));
    logActivity('CREATE', 'Laporan', `Generate laporan konsolidasi ${genMonth} ${genYear}`);
    setActiveTab('list');
    alert("Laporan berhasil dikonsolidasi dan disimpan ke database.");
  };

  const handleOpenModal = (laporan: Laporan | null = null) => {
    if (laporan) {
      setEditingLaporan(laporan);
      setFormData({ ...laporan });
    } else {
      setEditingLaporan(null);
      setFormData({ judul: '', jenis: 'Bulanan', periode: BULAN[new Date().getMonth()], tahun: new Date().getFullYear(), status: 'Draft', fileUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveManual = () => {
    if (!formData.judul) return alert("Judul wajib diisi");
    let updated: Laporan[];
    if (editingLaporan) {
      updated = laporanList.map(l => l.id === editingLaporan.id ? { ...l, ...formData } as Laporan : l);
    } else {
      const newL: Laporan = { id: Date.now().toString(), judul: formData.judul!, jenis: formData.jenis as any, periode: formData.periode!, tahun: formData.tahun!, status: formData.status as any, fileUrl: formData.fileUrl, createdAt: new Date().toISOString() };
      updated = [newL, ...laporanList];
    }
    setLaporanList(updated);
    localStorage.setItem('portal_laporan_db', JSON.stringify(updated));
    setIsModalOpen(false);
  };

  const filteredLaporan = laporanList.filter(l => (!searchBulan || l.periode === searchBulan) && (!searchTahun || l.tahun.toString() === searchTahun));

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Pusat Pelaporan (REP)</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sistem Konsolidasi Kinerja & Administrasi SDM</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
           <button onClick={() => setActiveTab('list')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Daftar Laporan</button>
           <button onClick={() => setActiveTab('generator')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'generator' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Generator Pintar</button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-8 animate-fadeIn">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-end gap-6 no-print">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="w-48 space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Periode</label><select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 outline-none" value={searchBulan} onChange={(e) => setSearchBulan(e.target.value)}><option value="">Seluruh Bulan</option>{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div className="w-32 space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Tahun</label><select className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-900 shadow-sm outline-none" value={searchTahun} onChange={(e) => setSearchTahun(e.target.value)}><option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option></select></div>
            </div>
            {canEdit && (
              <button onClick={() => handleOpenModal()} className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all"><i className="bi bi-plus-lg mr-2"></i>Entry Manual</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLaporan.map(l => (
                <div key={l.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 hover:shadow-xl transition-all group">
                  <div className="flex items-center justify-between mb-6">
                    <span className={`px-4 py-1 text-[8px] font-black uppercase rounded-lg border tracking-widest ${l.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{l.status}</span>
                    <span className="text-[9px] font-mono text-gray-300 font-bold">REP-{l.id}</span>
                  </div>
                  <h5 className="font-bold text-gray-900 text-sm leading-tight uppercase line-clamp-2 min-h-[2.5rem]">{l.judul}</h5>
                  <div className="mt-4 flex items-center text-[9px] font-bold text-gray-400 uppercase tracking-wider space-x-3">
                    <span>{l.jenis}</span>
                    <span className="h-1 w-1 bg-gray-200 rounded-full"></span>
                    <span>{l.periode} {l.tahun}</span>
                  </div>
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
                    {l.fileUrl ? (
                      <a href={l.fileUrl} target="_blank" className="text-blue-600 font-black text-[9px] uppercase tracking-widest flex items-center space-x-2 hover:underline"><i className="bi bi-file-earmark-pdf-fill"></i><span>Lihat Dokumen</span></a>
                    ) : (
                      <button onClick={() => { setGenMonth(l.periode); setGenYear(l.tahun); generateConsolidatedReport(); setActiveTab('generator'); }} className="text-blue-600 font-black text-[9px] uppercase tracking-widest flex items-center space-x-2"><i className="bi bi-magic"></i><span>Lihat Preview</span></button>
                    )}
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100">
                      {canEdit && <button onClick={() => handleOpenModal(l)} className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><i className="bi bi-pencil-square"></i></button>}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
          {/* Generator Controls */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 sticky top-24">
              <div className="flex items-center space-x-3 mb-2"><div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center text-white"><i className="bi bi-magic"></i></div><h4 className="text-[11px] font-black uppercase tracking-widest">Generator Laporan</h4></div>
              <div className="space-y-4">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Pilih Bulan</label><select value={genMonth} onChange={e => setGenMonth(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none">{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Pilih Tahun</label><input type="number" value={genYear} onChange={e => setGenYear(parseInt(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none" /></div>
                 <button onClick={generateConsolidatedReport} className="w-full py-4 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all">Generate Ringkasan</button>
              </div>
              {previewData && (
                <div className="pt-6 border-t border-gray-100 space-y-3">
                   <button onClick={() => window.print()} className="w-full py-4 bg-white border border-gray-200 text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2"><i className="bi bi-printer"></i> Cetak Laporan</button>
                   <button onClick={handleSaveConsolidated} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 flex items-center justify-center gap-2"><i className="bi bi-cloud-check"></i> Simpan Ke Database</button>
                </div>
              )}
            </div>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-8">
            {previewData ? (
              <div className="bg-white p-[2cm] shadow-2xl min-h-[29.7cm] rounded-sm text-black font-serif print:p-0 print:shadow-none animate-modalEnter mx-auto w-full max-w-[21cm]">
                 <div className="flex flex-col items-center mb-10 text-center">
                    <h1 className="text-[14pt] font-black uppercase leading-tight">Laporan Konsolidasi Administrasi SDM</h1>
                    <h2 className="text-[12pt] font-bold uppercase leading-tight mt-1">Direktorat Jenderal Kekayaan Intelektual</h2>
                    <p className="text-[10pt] font-bold mt-4 uppercase border-y border-black py-2 w-full">Periode: {previewData.month} {previewData.year}</p>
                 </div>

                 <div className="space-y-10 text-[11pt]">
                    {/* Seksi I: Statistik */}
                    <section className="space-y-4">
                       <h3 className="font-bold border-b border-gray-200 pb-1">I. KOMPOSISI SUMBER DAYA MANUSIA</h3>
                       <div className="grid grid-cols-2 gap-x-12 gap-y-2 ml-4">
                          <p>Total Pegawai Aktif</p><p className="font-bold">: {previewData.stats.total} Orang</p>
                          <p>Pegawai Negeri Sipil (PNS)</p><p className="font-bold">: {previewData.stats.pns} Orang</p>
                          <p>CPNS</p><p className="font-bold">: {previewData.stats.cpns} Orang</p>
                          <p>PPPK</p><p className="font-bold">: {previewData.stats.pppk} Orang</p>
                          {previewData.stats.pppk_pw > 0 && <><p>PPPK Paruh Waktu</p><p className="font-bold">: {previewData.stats.pppk_pw} Orang</p></>}
                       </div>
                    </section>

                    {/* Seksi II: Capaian Tugas Rutin */}
                    <section className="space-y-4">
                       <h3 className="font-bold border-b border-gray-200 pb-1">II. REALISASI TUGAS RUTIN DAN PELAYANAN</h3>
                       <div className="ml-4 space-y-6">
                          {Object.keys(previewData.tasks).length > 0 ? Object.entries(previewData.tasks).map(([label, items]: [string, any]) => (
                             <div key={label} className="space-y-2">
                                <p className="font-bold uppercase text-[10pt] underline">{label}</p>
                                <ul className="list-disc ml-6 space-y-1">
                                   {items.map((it: any, i: number) => (
                                      <li key={i} className="text-justify italic">
                                         {Object.entries(it)
                                          .filter(([k]) => !k.includes('link'))
                                          .map(([k, v]) => `${k.replace(/_/g,' ')}: ${v}`)
                                          .join('; ')}
                                      </li>
                                   ))}
                                </ul>
                             </div>
                          )) : (
                             <p className="italic text-gray-400">Tidak ada entri tugas rutin yang tercatat pada periode ini.</p>
                          )}
                       </div>
                    </section>

                    {/* Seksi III: Catatan Penutup */}
                    <section className="space-y-4">
                       <h3 className="font-bold border-b border-gray-200 pb-1">III. CATATAN DAN REKOMENDASI</h3>
                       <p className="text-justify leading-relaxed ml-4">
                          Berdasarkan data yang terkonsolidasi, administrasi kepegawaian pada periode {previewData.month} {previewData.year} telah dilaksanakan sesuai dengan SOP yang berlaku. Seluruh data di atas bersumber dari sinkronisasi database real-time Portal SDM DJKI.
                       </p>
                    </section>
                 </div>

                 <div className="mt-20 flex justify-end">
                    <div className="text-center w-64">
                       <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                       <p className="mb-24">Administrator Sistem,</p>
                       <p className="font-bold underline">PORTAL SDM DJKI</p>
                       <p className="text-[8pt] font-mono">ID Generation: {Date.now()}</p>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="h-full min-h-[600px] border-4 border-dashed border-gray-200 rounded-[3rem] bg-white flex flex-col items-center justify-center text-center p-12 opacity-50">
                 <i className="bi bi-file-earmark-bar-graph text-7xl mb-6 text-gray-200"></i>
                 <h4 className="text-xl font-black text-gray-400 uppercase tracking-widest">Generator Belum Dijalankan</h4>
                 <p className="text-[10px] font-bold text-gray-400 uppercase mt-4 max-w-sm">Pilih periode di panel kiri untuk menghasilkan ringkasan laporan konsolidasi otomatis.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 no-print">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-modalEnter">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center shrink-0"><h4 className="text-sm font-black uppercase text-gray-900">{editingLaporan ? 'Edit Laporan' : 'Entry Manual'}</h4><button onClick={() => setIsModalOpen(false)}><i className="bi bi-x-lg"></i></button></div>
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
               <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Judul Laporan</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs font-bold" value={formData.judul || ''} onChange={(e) => setFormData({...formData, judul: e.target.value})} /></div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Periode</label><select className="w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.periode || ''} onChange={(e) => setFormData({...formData, periode: e.target.value})}>{BULAN.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                  <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Tahun</label><input type="number" className="w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.tahun || 2025} onChange={(e) => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
               </div>
               <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Link Dokumen (Opsional)</label><input type="text" className="w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.fileUrl || ''} onChange={(e) => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://drive.google.com/..." /></div>
               <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Status</label><select className="w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.status || 'Draft'} onChange={(e) => setFormData({...formData, status: e.target.value as any})}><option value="Draft">Draft</option><option value="Approved">Approved</option></select></div>
            </div>
            <div className="px-8 py-6 bg-gray-50 border-t flex justify-end gap-3 shrink-0"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-[10px] font-black uppercase border rounded-xl bg-white">Batal</button><button onClick={handleSaveManual} className="px-10 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Simpan</button></div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
          .shadow-2xl { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default LaporanPage;
