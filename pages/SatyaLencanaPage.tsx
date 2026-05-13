
import React, { useState, useEffect, useMemo, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchSatyaLencanaFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { Pegawai, SatyaLencanaRecord } from '../types';
import { useAuth } from '../AuthContext';
import { formatPegawaiName } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';

const SatyaLencanaPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [penerimaList, setPenerimaList] = useState<SatyaLencanaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'monitoring' | 'riwayat'>('monitoring');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SatyaLencanaRecord>>({});
  
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SatyaLencanaRecord | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchSatyaLencanaFromSheets()
      ]);
      setPegawaiList(pData);
      setPenerimaList(sData || []);
    } catch (e) {
      console.error("Gagal memuat data Satyalencana", e);
    } finally {
      setLoading(false);
    }
  };

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const result = [];
    for (let i = 0; i <= 10; i++) {
      result.push(current + i);
    }
    return result;
  }, []);

  // Logika Monitoring Kelayakan
  const eligiblePegawai = useMemo(() => {
    return pegawaiList.map(p => {
      const cleanNip = (p.nip || '').replace(/\D/g, '');
      const cpnsYear = cleanNip.length >= 12 ? parseInt(cleanNip.substring(8, 12)) : null;
      const workingYears = cpnsYear ? (filterYear - cpnsYear) : null;
      
      let category = '-';
      if (workingYears === 10) category = '10 TAHUN';
      else if (workingYears === 20) category = '20 TAHUN';
      else if (workingYears === 30) category = '30 TAHUN';

      // Cek apakah sudah pernah menerima untuk kategori ini
      const sudahTerima = penerimaList.some(r => r.nip === p.nip && r.kategori === category);

      return { ...p, cpnsYear, workingYears, category, sudahTerima };
    }).filter(p => {
      const isEligible = p.workingYears !== null && [10, 20, 30].includes(p.workingYears);
      const matchSearch = (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || p.nip.includes(searchTerm);
      return isEligible && matchSearch && !p.sudahTerima;
    });
  }, [pegawaiList, penerimaList, filterYear, searchTerm]);

  // Logika Filter Riwayat Penerima
  const filteredPenerima = useMemo(() => {
    return penerimaList.filter(p => 
      ((p.namaPegawai || '').toLowerCase().includes(searchTerm.toLowerCase()) || p.nip.includes(searchTerm))
    ).sort((a, b) => b.tahunTerima - a.tahunTerima);
  }, [penerimaList, searchTerm]);

  const handleUploadCert = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`SATYA_${formData.nip}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        setFormData(prev => ({ ...prev, fileSertifikatUrl: res.fileUrl }));
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.kategori || !formData.tahunTerima) return alert("Mohon lengkapi data wajib.");
    setSyncing(true);
    
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    const payload: SatyaLencanaRecord = {
      ...formData as any,
      id: formData.id || `SL-${formData.nip}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      namaPegawai: peg?.nama || 'ASN'
    };

    const ok = await syncTableRemote('SATYA_LENCANA', 'SAVE', payload);
    if (ok) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'Satyalencana', `Simpan Penerima: ${payload.namaPegawai} (${payload.kategori})`);
      await loadData();
      setIsModalOpen(false);
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    const ok = await syncTableRemote('SATYA_LENCANA', 'DELETE', { 
      id: itemToDelete.id, 
      nip: itemToDelete.nip,
      nama: itemToDelete.namaPegawai 
    });
    if (ok) {
      logActivity('DELETE', 'Satyalencana', `Hapus Data Penerima: ${itemToDelete.namaPegawai}`);
      await loadData();
      setIsConfirmOpen(false);
    }
    setSyncing(false);
  };

  const handleExportEligible = () => {
    const data = eligiblePegawai.map(p => ({
      'NIP': p.nip, 'Nama': p.nama, 'Unit Kerja': p.unitKerja, 'Tahun CPNS': p.cpnsYear, 'Masa Kerja': p.workingYears, 'Kategori': p.category
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kelayakan Satyalencana");
    XLSX.writeFile(wb, `Monitoring_Satyalencana_DJKI_${filterYear}.xlsx`);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 transition-all shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} loading={syncing} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter">Satyalencana Karya Satya</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
               <i className="bi bi-star-fill text-amber-500"></i> Penghargaan Atas Pengabdian ASN DJKI
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportEligible} className="px-6 h-14 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-2 active:scale-95 transition-all">
             <i className="bi bi-file-earmark-spreadsheet text-lg"></i> Ekspor Data
          </button>
          {canEdit && (
            <button onClick={() => { setFormData({ kategori: '10 TAHUN', tahunTerima: new Date().getFullYear() }); setIsModalOpen(true); }} className="px-10 h-14 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">
              + Catat Penerima Baru
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input type="text" placeholder="Cari Nama atau NIP..." className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] shrink-0">
           <button onClick={() => setActiveTab('monitoring')} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'monitoring' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Monitoring Kelayakan</button>
           <button onClick={() => setActiveTab('riwayat')} className={`px-8 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'riwayat' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Riwayat Penerima</button>
        </div>
        {activeTab === 'monitoring' && (
           <select className="px-8 py-4 bg-gray-50 border-2 border-transparent rounded-[1.8rem] text-[10px] font-black uppercase outline-none focus:border-blue-600 shadow-inner" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>PROYEKSI TAHUN {y}</option>)}
           </select>
        )}
      </div>

      {activeTab === 'monitoring' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left">
                 <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr>
                       <th className="px-10 py-5">Pegawai & NIP</th>
                       <th className="px-4 py-5">Masa Kerja (Thn)</th>
                       <th className="px-4 py-5">Tahun CPNS</th>
                       <th className="px-4 py-5 text-center">Kategori Kelayakan</th>
                       <th className="px-10 py-5 text-right">Opsi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {eligiblePegawai.map((p, i) => (
                      <tr key={`${p.nip}-${i}`} className="hover:bg-blue-50/5 group transition-colors">
                         <td className="px-10 py-6">
                            <p className="text-[11px] font-black text-gray-950 mb-1">{formatPegawaiName(p.nama)}</p>
                            <p className="text-[9px] font-mono text-blue-600 font-bold uppercase">NIP. {p.nip}</p>
                         </td>
                         <td className="px-4 py-6 font-black text-gray-700">{p.workingYears} TAHUN</td>
                         <td className="px-4 py-6 font-bold text-gray-400">{p.cpnsYear}</td>
                         <td className="px-4 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border shadow-sm ${
                              p.category === '30 TAHUN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              p.category === '20 TAHUN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>{p.category}</span>
                         </td>
                         <td className="px-10 py-6 text-right">
                            {canEdit && (
                              <button onClick={() => { setFormData({ nip: p.nip, kategori: p.category, tahunTerima: filterYear }); setIsModalOpen(true); }} className="px-6 py-2 bg-[#111827] text-white rounded-xl text-[9px] font-black uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-all">Proses Terima</button>
                            )}
                         </td>
                      </tr>
                    ))}
                    {eligiblePegawai.length === 0 && (
                      <tr><td colSpan={5} className="py-32 text-center opacity-30"><i className="bi bi-award text-5xl mb-4 block"></i><p className="text-[10px] font-black uppercase tracking-widest">Tidak ada kelayakan baru di periode ini</p></td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left">
                 <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr>
                       <th className="px-10 py-5">Penerima</th>
                       <th className="px-4 py-5">Kategori</th>
                       <th className="px-4 py-5">Nomor Keppres & Tahun</th>
                       <th className="px-4 py-5 text-center">Sertifikat</th>
                       <th className="px-10 py-5 text-right">Opsi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredPenerima.map(r => (
                      <tr key={r.id} className="hover:bg-blue-50/5 group transition-colors">
                         <td className="px-10 py-6">
                            <p className="text-[11px] font-black text-gray-950 mb-1">{formatPegawaiName(r.namaPegawai)}</p>
                            <p className="text-[9px] font-mono text-gray-400 font-bold uppercase">NIP. {r.nip}</p>
                         </td>
                         <td className="px-4 py-6">
                            <span className={`px-3 py-1 rounded text-[8px] font-black uppercase border ${
                              r.kategori === '30 TAHUN' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              r.kategori === '20 TAHUN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>{r.kategori}</span>
                         </td>
                         <td className="px-4 py-6">
                            <p className="text-[10px] font-black text-gray-800 uppercase leading-tight line-clamp-1">{r.nomorKeppres}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">TAHUN {r.tahunTerima}</p>
                         </td>
                         <td className="px-4 py-6 text-center">
                            {r.fileSertifikatUrl ? (
                               <button onClick={() => window.open(r.fileSertifikatUrl, '_blank')} className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all mx-auto"><i className="bi bi-file-earmark-check-fill text-lg"></i></button>
                            ) : <span className="text-[8px] font-bold text-gray-300 italic uppercase">Belum Diupload</span>}
                         </td>
                         <td className="px-10 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                               {canEdit && <button onClick={() => { setFormData(r); setIsModalOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-sm"><i className="bi bi-pencil-fill"></i></button>}
                               {isSuperadmin && <button onClick={() => { setItemToDelete(r); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"><i className="bi bi-trash-fill"></i></button>}
                            </div>
                         </td>
                      </tr>
                    ))}
                    {filteredPenerima.length === 0 && (
                      <tr><td colSpan={5} className="py-32 text-center opacity-30"><i className="bi bi-archive text-5xl mb-4 block"></i><p className="text-[10px] font-black uppercase tracking-widest">Belum ada riwayat penerima terdaftar</p></td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => !syncing && !uploading && setIsModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh] border border-white/20">
              <div className="p-8 border-b bg-gray-50 flex justify-between items-center shrink-0">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">{formData.id ? 'Perbarui Data Penerima' : 'Catat Penerima Satyalencana'}</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Registrasi Piagam Penghargaan Presiden</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all"><i className="bi bi-x-lg text-xl"></i></button>
              </div>
              
              <form onSubmit={handleSave} className="p-10 overflow-y-auto custom-scrollbar space-y-8">
                 <SearchableSelect label="Pegawai Penerima" options={pegawaiList.map(p => ({ value: p.nip, label: formatPegawaiName(p.nama), subLabel: `NIP. ${p.nip} - ${p.unitKerja}` }))} value={formData.nip || ''} onChange={v => setFormData({...formData, nip: v})} />
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-amber-600 uppercase border-b pb-2 tracking-widest">Detail Penghargaan</h5>
                       <div><label className={labelClass}>Kategori Satyalencana</label><select className={inputClass} value={formData.kategori} onChange={e=>setFormData({...formData, kategori: e.target.value})}><option>10 TAHUN</option><option>20 TAHUN</option><option>30 TAHUN</option></select></div>
                       <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Tahun Penerimaan</label><input type="number" className={inputClass} value={formData.tahunTerima} onChange={e=>setFormData({...formData, tahunTerima: Number(e.target.value)})} /></div>
                          <div><label className={labelClass}>Nomor Keppres</label><input type="text" className={inputClass} value={formData.nomorKeppres} onChange={e=>setFormData({...formData, nomorKeppres: e.target.value})} placeholder="exp: 10/TK/TAHUN..." /></div>
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                       <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">Digitalisasi Piagam</h5>
                       <div className={`p-8 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-4 transition-all ${formData.fileSertifikatUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                             {uploading ? <div className="h-8 w-8 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin"></div> : <i className={`bi ${formData.fileSertifikatUrl ? 'bi-patch-check-fill text-emerald-600 text-3xl' : 'bi-cloud-arrow-up-fill text-blue-600 text-3xl'}`}></i>}
                          </div>
                          <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-gray-950">{formData.fileSertifikatUrl ? 'Arsip Berhasil Terunggah' : 'Unggah Scan Piagam'}</p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">PDF / JPG / PNG (Maks 10MB)</p>
                          </div>
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-white border border-gray-100 text-blue-600 rounded-xl text-[9px] font-black uppercase shadow-sm active:scale-95 transition-all">Pilih File</button>
                          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUploadCert} />
                       </div>
                       {formData.fileSertifikatUrl && <button type="button" onClick={() => window.open(formData.fileSertifikatUrl, '_blank')} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Pratinjau File</button>}
                    </div>
                 </div>
              </form>
              
              <div className="p-8 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                 <button onClick={handleSave} disabled={syncing || uploading} className="px-16 py-4 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 disabled:bg-gray-300 flex items-center gap-3">
                    {(syncing || uploading) && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                    <span>Simpan Data Penerima</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SatyaLencanaPage;
