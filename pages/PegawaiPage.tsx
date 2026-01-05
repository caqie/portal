
import React, { useState, useEffect } from 'react';
import { UNIT_KERJA, PANGKAT_MAP, getPangkatFromGol } from '../constants';
import { Pegawai } from '../types';
import { fetchPegawaiFromSheets, calculateRetirementDate } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import * as XLSX from 'xlsx';

const JENIS_PEGAWAI_OPTIONS = ['PNS', 'CPNS', 'PPPK', 'PPPK PARUH WAKTU', 'HONORER'];
const STATUS_OPTIONS = ['Aktif', 'Tidak Aktif', 'Cuti', 'Tugas Belajar', 'Pensiun'];

const PegawaiPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('Semua Unit');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activePegawai, setActivePegawai] = useState<Pegawai | null>(null);
  const [formData, setFormData] = useState<Partial<Pegawai>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPegawaiFromSheets();
      setPegawaiList(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleExport = () => {
    const dataToExport = filteredPegawai.map(p => ({
      NIP: p.nip,
      Nama: p.nama,
      Jabatan: p.jabatan,
      'Unit Kerja Utama': p.unitKerja,
      'Bagian/Seksi': p.bagian || '-',
      Golongan: p.golRuang,
      Pangkat: p.pangkat,
      Status: p.status,
      'Jenis Pegawai': p.jenisPegawai,
      Pendidikan: p.pendidikan || '-',
      Telepon: p.telepon
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, `Database_Pegawai_DJKI_${new Date().toLocaleDateString()}.xlsx`);
    logActivity('DOWNLOAD', 'Pegawai', 'Mengekspor database pegawai ke Excel');
  };

  const filteredPegawai = pegawaiList.filter(p => {
    if (isViewer) return p.nip === user?.nip;
    const term = searchTerm.toLowerCase();
    const matchesSearch = (p.nama?.toLowerCase() || '').includes(term) || (p.nip?.includes(term));
    const matchesUnit = selectedUnit === 'Semua Unit' || (p.unitKerja || '').includes(selectedUnit);
    return matchesSearch && matchesUnit;
  });

  const handleOpenDetail = (p: Pegawai) => { 
    setActivePegawai(p); 
    setIsDetailModalOpen(true); 
  };
  
  const handleEdit = (p: Pegawai) => { 
    setActivePegawai(p);
    setFormData({ ...p }); 
    setIsFormModalOpen(true); 
  };

  const handleSave = () => {
    if (!formData.nama || !formData.nip) {
      alert("Nama dan NIP wajib diisi!");
      return;
    }

    const updatedData = { ...formData } as Pegawai;

    if (activePegawai) { 
      setPegawaiList(prev => prev.map(p => p.id === activePegawai.id ? { ...p, ...updatedData } : p));
      logActivity('UPDATE', 'Pegawai', `Memperbarui data pegawai: ${updatedData.nama}`);
    } else { 
      setPegawaiList(prev => [{ ...updatedData, id: Date.now().toString() }, ...prev]);
      logActivity('CREATE', 'Pegawai', `Menambah pegawai baru: ${updatedData.nama}`);
    }

    setIsFormModalOpen(false);
    alert("Data berhasil disimpan secara lokal.");
  };

  const handleDelete = (p: Pegawai) => {
    if (confirm(`Hapus data ${p.nama}?`)) {
      setPegawaiList(prev => prev.filter(item => item.id !== p.id));
      logActivity('DELETE', 'Pegawai', `Menghapus data pegawai: ${p.nama}`);
    }
  };

  const handleGolChange = (gol: string) => {
    setFormData({ ...formData, golRuang: gol, pangkat: getPangkatFromGol(gol) });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="relative group flex-1">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input type="text" placeholder="Cari NIP atau Nama..." className="w-full pl-10 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 shadow-sm text-[10px] font-bold text-gray-900 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
           <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-[10px] font-black text-gray-900 outline-none shadow-sm cursor-pointer appearance-none max-w-[200px]">
             <option value="Semua Unit">Semua Direktorat</option>
             {UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}
           </select>
           <button onClick={handleExport} className="h-12 w-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all">
              <i className="bi bi-file-earmark-excel-fill text-xl"></i>
           </button>
           {canEdit && (
             <button onClick={() => { setFormData({status:'Aktif', jenisPegawai:'PNS', gender:'L', unitKerja:UNIT_KERJA[0]}); setActivePegawai(null); setIsFormModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 whitespace-nowrap"><i className="bi bi-plus-lg mr-2"></i>Tambah Pegawai</button>
           )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
              <tr><th className="px-8 py-5">Pegawai</th><th className="px-4 py-5">Jabatan & Jenis</th><th className="px-4 py-5 text-center">Golongan</th><th className="px-4 py-5">Unit Kerja Utama</th><th className="px-8 py-5 text-right">Opsi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Syncing Database...</td></tr>
              ) : filteredPegawai.length > 0 ? filteredPegawai.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/5 group transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-xl overflow-hidden bg-blue-50 flex items-center justify-center font-black text-blue-300 border border-blue-100 shrink-0">
                        {p.foto ? <img src={p.foto} className="h-full w-full object-cover" /> : p.nama.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-900 uppercase truncate">{p.nama}</p>
                        <p className="text-[8px] font-mono text-gray-400 mt-1">{p.nip}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase line-clamp-1">{p.jabatan}</p>
                    <p className="text-[7px] text-blue-500 font-black uppercase mt-1">{p.jenisPegawai}</p>
                  </td>
                  <td className="px-4 py-5 text-center"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg">{p.golRuang || '-'}</span></td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-bold text-gray-500 uppercase line-clamp-1">{p.unitKerja}</p>
                    <p className="text-[7px] font-bold text-gray-400 uppercase mt-0.5 truncate max-w-[150px]">{p.bagian}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => handleOpenDetail(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all"><i className="bi bi-eye-fill"></i></button>
                      {canEdit && <button onClick={() => handleEdit(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all"><i className="bi bi-pencil-fill"></i></button>}
                      {isSuperadmin && <button onClick={() => handleDelete(p)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-white rounded-xl border border-transparent hover:border-gray-100 transition-all"><i className="bi bi-trash-fill"></i></button>}
                    </div>
                  </td>
                </tr>
              )) : <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Data tidak ditemukan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && activePegawai && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter">
             <div className="relative h-48 bg-[#111827] flex flex-col items-center justify-center text-white overflow-hidden">
                <div className="absolute top-8 right-8 z-10"><button onClick={() => setIsDetailModalOpen(false)} className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><i className="bi bi-x-lg"></i></button></div>
                <div className="h-24 w-24 rounded-3xl bg-blue-600 border-4 border-white/10 shadow-2xl overflow-hidden mb-3 relative z-10">
                   {activePegawai.foto ? <img src={activePegawai.foto} className="w-full h-full object-cover" /> : <span className="text-4xl font-black">{activePegawai.nama.charAt(0)}</span>}
                </div>
                <h4 className="text-xl font-black uppercase tracking-tight relative z-10">{activePegawai.nama}</h4>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-2 relative z-10">{activePegawai.nip}</p>
                <i className="bi bi-person-badge-fill absolute -left-10 -bottom-10 text-[12rem] text-white/5 rotate-12"></i>
             </div>
             <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                <div className="space-y-4">
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Jabatan</p><p className="text-xs font-black text-gray-900 uppercase leading-tight">{activePegawai.jabatan}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Unit Kerja Utama</p><p className="text-xs font-black text-blue-600 uppercase leading-tight">{activePegawai.unitKerja}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Bagian / Seksi</p><p className="text-xs font-bold text-gray-600 uppercase leading-tight">{activePegawai.bagian || '-'}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Status & Jenis</p><p className="text-xs font-black text-gray-900 uppercase">{activePegawai.status} • {activePegawai.jenisPegawai}</p></div>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pangkat / Golongan</p><p className="text-xs font-black text-gray-900 uppercase">{activePegawai.pangkat} ({activePegawai.golRuang})</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pendidikan</p><p className="text-xs font-black text-gray-900 uppercase">{activePegawai.pendidikan || '-'}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kontak</p><p className="text-xs font-black text-gray-900 uppercase">{activePegawai.telepon || '-'}</p></div>
                   <div className="space-y-1"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">TMT BUP</p><p className="text-xs font-black text-rose-600 uppercase">{calculateRetirementDate(activePegawai.nip, activePegawai.jabatan)?.toLocaleDateString('id-ID', { month:'long', year:'numeric' })}</p></div>
                </div>
                <div className="col-span-full pt-6 border-t border-gray-100 flex justify-center gap-3">
                   {canEdit && <button onClick={() => { setIsDetailModalOpen(false); handleEdit(activePegawai); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Edit Data</button>}
                   <button onClick={() => setIsDetailModalOpen(false)} className="px-8 py-3 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Tutup</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsFormModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-3xl max-h-[90dvh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter">
             <div className="px-10 py-7 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
               <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-900">
                 {activePegawai ? 'Update Data Pegawai' : 'Entry Pegawai Baru'}
               </h4>
               <button onClick={() => setIsFormModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-gray-900 transition-all"><i className="bi bi-x-lg"></i></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Nama Lengkap</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} /></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">NIP</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})} disabled={!!activePegawai} /></div>
                   
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Unit Kerja Utama</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.unitKerja || ''} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Jabatan</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})} /></div>
                   
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Golongan</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.golRuang || ''} onChange={e => handleGolChange(e.target.value)}>{Object.keys(PANGKAT_MAP).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                     <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Gender</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.gender || 'L'} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Jenis</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.jenisPegawai || ''} onChange={e => setFormData({...formData, jenisPegawai: e.target.value as any})}>{JENIS_PEGAWAI_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                      <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Status</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value as any})}>{STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                   </div>
                   
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">WhatsApp / Telp</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.telepon || ''} onChange={e => setFormData({...formData, telepon: e.target.value})} /></div>
                   <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">URL Foto (Profil)</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.foto || ''} onChange={e => setFormData({...formData, foto: e.target.value})} placeholder="https://..." /></div>
                </div>
             </div>
             <div className="px-10 py-7 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsFormModalOpen(false)} className="px-8 py-3.5 text-[10px] font-black uppercase border border-gray-200 rounded-xl bg-white text-gray-600 active:scale-95 transition-all">Batal</button>
                <button onClick={handleSave} className="px-12 py-3.5 text-[10px] font-black uppercase bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan Perubahan</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PegawaiPage;
