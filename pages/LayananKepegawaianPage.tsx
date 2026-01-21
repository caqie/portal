
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchSKPFromSheets, 
  fetchPAKFromSheets, 
  fetchKenaikanFromSheets, 
  fetchPengembanganFromSheets, 
  fetchPegawaiFromSheets, 
  getRetirementDetails, 
  fetchKGBFromSheets,
  syncTableRemote
} from '../spreadsheetService';
import { AK_KOEFISIEN, PREDIKAT_MULTIPLIER } from '../constants';
import { SKP, PAK, KenaikanKarir, Pengembangan, Pegawai, KGB } from '../types';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';

const ServiceCard = ({ icon, label, description, color, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`p-6 rounded-[2rem] border transition-all text-left flex flex-col h-full group no-print ${active ? `bg-white border-${color}-200 shadow-xl ring-4 ring-${color}-50` : 'bg-white/50 border-gray-100 hover:border-gray-300'}`}
  >
    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform bg-${color}-600`}>
      <i className={`bi ${icon} text-xl`}></i>
    </div>
    <h4 className="text-[12px] font-black text-gray-900 uppercase tracking-tight mb-2 leading-tight">{label}</h4>
    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">{description}</p>
  </button>
);

const LayananKepegawaianPage = () => {
  const { user, canEdit, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  const navigate = useNavigate();
  
  const [activeModule, setActiveModule] = useState<'skp' | 'pak' | 'kenaikan' | 'pengembangan' | 'pensiun' | 'kgb'>('skp');
  const [rawData, setRawData] = useState<any[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterYear, setFilterYear] = useState<string>('SEMUA');
  
  // States for CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => { 
    setFilterYear('SEMUA');
    loadModuleData(); 
  }, [activeModule]);

  const loadModuleData = async () => {
    setLoading(true);
    try {
      let res: any[] = [];
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);

      if (activeModule === 'skp') res = await fetchSKPFromSheets();
      else if (activeModule === 'pak') res = await fetchPAKFromSheets();
      else if (activeModule === 'kenaikan') res = await fetchKenaikanFromSheets();
      else if (activeModule === 'pengembangan') res = await fetchPengembanganFromSheets();
      else if (activeModule === 'kgb') res = await fetchKGBFromSheets();
      else if (activeModule === 'pensiun') res = pegawais;
      
      if (isViewer) {
        setRawData(res.filter((item: any) => (item.nip || item.id) === user?.nip));
      } else {
        setRawData(res);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleOpenRegister = () => {
    setEditingId(null);
    if (activeModule === 'kgb') {
      setFormData({ nip: '', tmtLama: '', tmtBaru: '', gajiLama: 0, gajiBaru: 0, nomorSk: '', tglSk: '', status: 'Proses' });
    } else if (activeModule === 'kenaikan') {
      setFormData({ nip: '', jenisUsulan: 'Pangkat', dari: '', menjadi: '', tmtUsulan: '', status: 'Usulan' });
    } else if (activeModule === 'pengembangan') {
      setFormData({ nip: '', namaKegiatan: '', tanggalMulai: '', tanggalSelesai: '', jumlahJpl: 0, penyelenggara: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveData = async () => {
    if (!formData.nip) return alert("Pilih Pegawai terlebih dahulu");
    setSyncing(true);
    
    const moduleKey = activeModule.toUpperCase();
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    const payload = {
      ...formData,
      id: editingId || Date.now().toString(),
      namaPegawai: peg?.nama || 'ASN',
      timestamp: new Date().toISOString()
    };

    try {
      await syncTableRemote(moduleKey, 'SAVE', payload);
      await loadModuleData();
      setIsModalOpen(false);
      setShowSuccess(true);
      logActivity('UPDATE', moduleKey, `Simpan data ${activeModule} untuk ${payload.namaPegawai}`);
    } catch (e) {
      alert("Gagal sinkronisasi ke cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteData = async (id: string) => {
    if (!confirm("Hapus data ini dari database cloud?")) return;
    setSyncing(true);
    try {
      await syncTableRemote(activeModule.toUpperCase(), 'DELETE', { id });
      await loadModuleData();
      logActivity('DELETE', activeModule.toUpperCase(), `Menghapus record ID: ${id}`);
    } catch (e) {
      alert("Gagal menghapus data cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const getYearFromData = (item: any): string => {
    if (activeModule === 'pensiun') {
      const det = getRetirementDetails(item.nip, item.jabatan || '', item.klasifikasiJabatan || '');
      return det ? det.tmtPensiun.getFullYear().toString() : '';
    }
    const dateStr = item.tmtBaru || item.tmtUsulan || item.tanggalMulai || (item.tahun ? item.tahun.toString() : '');
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : '';
  };

  const filteredData = useMemo(() => {
    if (filterYear === 'SEMUA') return rawData;
    return rawData.filter(item => getYearFromData(item) === filterYear);
  }, [rawData, filterYear, activeModule]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    rawData.forEach(item => {
      const y = getYearFromData(item);
      if (y) years.add(y);
    });
    return Array.from(years).sort();
  }, [rawData]);

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }))
  , [pegawaiList]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Database Terupdate" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">{isViewer ? 'Log Karir Personal' : 'Pusat Layanan Karir PNS'}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sinkronisasi Database Layanan Kepegawaian DJKI</p>
        </div>
        {!isViewer && (
           <div className="flex gap-2 no-print">
               {['kgb', 'kenaikan', 'pengembangan'].includes(activeModule) && (
                 <button onClick={handleOpenRegister} className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">+ Register Data</button>
               )}
               {activeModule === 'skp' && <button onClick={() => navigate('/skp')} className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"><i className="bi bi-graph-up-arrow"></i><span>Evaluasi SKP</span></button>}
           </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 no-print">
        <ServiceCard icon="bi-graph-up-arrow" label="SKP" description="Kinerja ASN" color="blue" active={activeModule === 'skp'} onClick={() => setActiveModule('skp')} />
        <ServiceCard icon="bi-award" label="PAK" description="Fungsional" color="indigo" active={activeModule === 'pak'} onClick={() => setActiveModule('pak')} />
        <ServiceCard icon="bi-cash-stack" label="KGB" description="Gaji Berkala" color="emerald" active={activeModule === 'kgb'} onClick={() => setActiveModule('kgb')} />
        <ServiceCard icon="bi-arrow-up-right-circle" label="Pangkat" description="Kenaikan Karir" color="amber" active={activeModule === 'kenaikan'} onClick={() => setActiveModule('kenaikan')} />
        <ServiceCard icon="bi-journal-check" label="Diklat" description="Pengembangan" color="cyan" active={activeModule === 'pengembangan'} onClick={() => setActiveModule('pengembangan')} />
        <ServiceCard icon="bi-door-open" label="Pensiun" description="Batas Usia" color="rose" active={activeModule === 'pensiun'} onClick={() => setActiveModule('pensiun')} />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          <div className="px-8 py-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/30 gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest shrink-0">Daftar {activeModule.toUpperCase()}</h5>
                <select className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase outline-none shadow-sm" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                    <option value="SEMUA">Semua Tahun</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                 {syncing && <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>}
                 <button onClick={loadModuleData} className="h-10 w-10 bg-white border border-gray-200 text-gray-400 rounded-xl flex items-center justify-center hover:text-blue-600 transition-all shadow-sm"><i className="bi bi-arrow-clockwise"></i></button>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-[7px] font-black border-b border-gray-100 tracking-widest">
                      <tr>
                          <th className="px-8 py-4">Nama Pegawai (PNS)</th>
                          <th className="px-4 py-4">NIP</th>
                          <th className="px-4 py-4">Unit Kerja</th>
                          {activeModule === 'kgb' && <><th className="px-4 py-4">TMT Baru</th><th className="px-4 py-4 text-right">Gaji Baru</th><th className="px-8 py-4 text-center">Status</th></>}
                          {activeModule === 'pak' && <><th className="px-4 py-4">Periode</th><th className="px-4 py-4 text-center">AK</th></>}
                          {activeModule === 'kenaikan' && <><th className="px-4 py-4">Jenis</th><th className="px-4 py-4">Menjadi</th><th className="px-8 py-4 text-center">Status</th></>}
                          {activeModule === 'pengembangan' && <><th className="px-4 py-4">Kegiatan</th><th className="px-4 py-4 text-center">JPL</th></>}
                          {activeModule === 'pensiun' && <><th className="px-4 py-4">TMT Pensiun</th><th className="px-4 py-4">Sisa Kerja</th></>}
                          {!isViewer && activeModule !== 'pensiun' && <th className="px-8 py-4 text-right">Aksi</th>}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {loading ? (
                          <tr><td colSpan={20} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Sinkronisasi Basis Data Cloud...</td></tr>
                      ) : filteredData.map((item: any) => (
                        <tr key={item.id} className="hover:bg-blue-50/10 transition-all group">
                            <td className="px-8 py-4"><p className="text-[10px] font-black text-gray-900 uppercase">{item.namaPegawai || item.nama}</p></td>
                            <td className="px-4 py-4"><p className="text-[8px] font-mono text-gray-400 font-bold">{item.nip}</p></td>
                            <td className="px-4 py-4"><p className="text-[9px] font-bold text-gray-500 uppercase truncate max-w-[150px]">{item.unitKerja || pegawaiList.find(p => p.nip === item.nip)?.unitKerja || '-'}</p></td>
                            
                            {activeModule === 'kgb' && (
                              <><td className="px-4 py-4 text-[10px] font-black text-blue-600">{item.tmtBaru}</td>
                              <td className="px-4 py-4 text-right text-[10px] font-black text-emerald-600">Rp {Number(item.gajiBaru || 0).toLocaleString('id-ID')}</td>
                              <td className="px-8 py-4 text-center"><span className="px-2 py-0.5 text-[8px] font-black uppercase rounded border border-emerald-100 bg-emerald-50 text-emerald-700">{item.status}</span></td></>
                            )}
                            {activeModule === 'pak' && (
                              <><td className="px-4 py-4 text-[10px] font-bold text-gray-900">{item.periode}</td>
                              <td className="px-4 py-4 text-center"><span className="px-2 py-0.5 text-[8px] font-black rounded bg-indigo-50 text-indigo-700">{(Number(item.jumlahKredit) || 0).toFixed(3)}</span></td></>
                            )}
                            {activeModule === 'kenaikan' && (
                              <><td className="px-4 py-4 text-[9px] font-black uppercase text-gray-400">{item.jenisUsulan}</td>
                              <td className="px-4 py-4 text-[10px] font-black text-blue-600">{item.menjadi}</td>
                              <td className="px-8 py-4 text-center"><span className="px-2 py-0.5 text-[8px] font-black uppercase rounded border border-amber-100 bg-amber-50 text-amber-700">{item.status}</span></td></>
                            )}
                            {activeModule === 'pengembangan' && (
                              <><td className="px-4 py-4 text-[9px] font-bold text-gray-600 uppercase truncate max-w-[150px]">{item.namaKegiatan}</td>
                              <td className="px-4 py-4 text-center font-black text-[10px]">{item.jumlahJpl}</td></>
                            )}
                            {activeModule === 'pensiun' && (
                              <><td className="px-4 py-4 text-rose-600 font-black">{getRetirementDetails(item.nip, item.jabatan || '', item.klasifikasiJabatan || '')?.tmtPensiun.toLocaleDateString('id-ID')}</td>
                              <td className="px-4 py-4 text-[9px] font-black uppercase">{getRetirementDetails(item.nip, item.jabatan || '', item.klasifikasiJabatan || '')?.sisaMasaKerja}</td></>
                            )}
                            
                            {!isViewer && activeModule !== 'pensiun' && (
                              <td className="px-8 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => handleDeleteData(item.id)} className="h-8 w-8 text-gray-400 hover:text-rose-600 rounded-lg flex items-center justify-center bg-white border shadow-sm"><i className="bi bi-trash-fill"></i></button>
                                </div>
                              </td>
                            )}
                        </tr>
                      ))}
                      {filteredData.length === 0 && !loading && (
                        <tr><td colSpan={10} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Belum ada data untuk periode ini</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* CRUD MODAL FOR SERVICES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-modalEnter border border-white/20 flex flex-col space-y-8">
             <div className="flex items-center gap-5 border-b pb-6 shrink-0">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-xl bg-blue-600`}>
                   <i className="bi bi-database-fill-add text-2xl"></i>
                </div>
                <div>
                   <h4 className="text-[16px] font-black uppercase text-gray-950 tracking-tight leading-none">Register Record {activeModule.toUpperCase()}</h4>
                   <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Sinkronisasi Database ASN DJKI</p>
                </div>
             </div>

             <div className="space-y-5 overflow-y-auto custom-scrollbar max-h-[60vh] pr-2">
                <SearchableSelect label="Pegawai Terkait" options={searchablePegawaiOptions} value={formData.nip} onChange={(val) => setFormData({...formData, nip: val})} />
                
                {activeModule === 'kgb' && (
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">TMT Baru</label><input type="date" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black" value={formData.tmtBaru} onChange={e => setFormData({...formData, tmtBaru: e.target.value})} /></div>
                     <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Gaji Baru</label><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black" value={formData.gajiBaru} onChange={e => setFormData({...formData, gajiBaru: e.target.value})} /></div>
                     <div className="col-span-full space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Nomor SK</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black uppercase" value={formData.nomorSk} onChange={e => setFormData({...formData, nomorSk: e.target.value})} /></div>
                  </div>
                )}

                {activeModule === 'kenaikan' && (
                  <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-full space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Jenis Usulan</label><select className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black" value={formData.jenisUsulan} onChange={e => setFormData({...formData, jenisUsulan: e.target.value})}><option value="Pangkat">Pangkat</option><option value="Jabatan">Jabatan</option></select></div>
                     <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Dari (Lama)</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black uppercase" value={formData.dari} onChange={e => setFormData({...formData, dari: e.target.value})} /></div>
                     <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Menjadi (Baru)</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black uppercase" value={formData.menjadi} onChange={e => setFormData({...formData, menjadi: e.target.value})} /></div>
                     <div className="col-span-full space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">TMT Usulan</label><input type="date" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black" value={formData.tmtUsulan} onChange={e => setFormData({...formData, tmtUsulan: e.target.value})} /></div>
                  </div>
                )}

                {activeModule === 'pengembangan' && (
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Nama Kegiatan Diklat</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black uppercase" value={formData.namaKegiatan} onChange={e => setFormData({...formData, namaKegiatan: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">JPL</label><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black" value={formData.jumlahJpl} onChange={e => setFormData({...formData, jumlahJpl: e.target.value})} /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Penyelenggara</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border rounded-2xl text-[11px] font-black uppercase" value={formData.penyelenggara} onChange={e => setFormData({...formData, penyelenggara: e.target.value})} /></div>
                      </div>
                   </div>
                )}
             </div>

             <div className="flex gap-3 pt-4 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">Batal</button>
                <button onClick={handleSaveData} disabled={syncing} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 active:scale-95 disabled:bg-blue-300">
                  {syncing ? 'Sinkronisasi Cloud...' : 'Simpan Data'}
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

export default LayananKepegawaianPage;
