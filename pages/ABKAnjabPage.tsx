
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ABKAnjab, Pegawai } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, fetchABKAnjabFromSheets } from '../spreadsheetService';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import * as XLSX from 'xlsx';

const ABKAnjabPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  const [abkList, setAbkList] = useState<ABKAnjab[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor'>('list');
  const [modalTab, setModalTab] = useState<'profil' | 'anjab' | 'abk'>('profil');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Confirmation state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ABKAnjab | null>(null);

  const [formData, setFormData] = useState<any>({
    namaJabatan: '',
    unitKerja: UNIT_KERJA[0],
    jumlahSaatIni: 0,
    jamKerjaEfektif: 75000, 
    ikhtisarJabatan: '',
    kualifikasiPendidikan: '',
    kualifikasiPelatihan: '',
    pengalamanKerja: '',
    tanggungJawab: '',
    wewenang: '',
    risikoBahaya: '',
    bahanKerja: '',
    perangkatKerja: '',
    korelasiJabatan: '',
    uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pegData = await fetchPegawaiFromSheets();
      setPegawaiList(pegData);
      const abkData = await fetchABKAnjabFromSheets();
      setAbkList(abkData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleExportExcel = () => {
    const data = abkList.map(a => ({
      'Nama Jabatan': a.namaJabatan,
      'Unit Kerja': a.unitKerja,
      'Jumlah Eksisting': a.jumlahSaatIni,
      'Beban Kerja (Menit)': a.totalMenitBebanKerja,
      'Kebutuhan ASN': a.kebutuhanPegawai,
      'Selisih': a.selisih,
      'Status': a.status,
      'Pendidikan': a.kualifikasiPendidikan
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database ANJAB ABK");
    XLSX.writeFile(wb, `Analisis_Jabatan_DJKI_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'ABK_ANJAB', 'Mengekspor daftar analisis ke Excel');
  };

  const handleAddUraian = () => {
    setFormData({ ...formData, uraianTugas: [...(formData.uraianTugas || []), { tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }] });
  };

  const handleRemoveUraian = (index: number) => {
    const updatedUraian = (formData.uraianTugas || []).filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, uraianTugas: updatedUraian });
  };

  const handleUraianChange = (index: number, field: string, value: any) => {
    const updatedUraian = [...(formData.uraianTugas || [])];
    const item = { ...updatedUraian[index], [field]: value };
    if (field === 'volume' || field === 'normaWaktu') {
      item.totalWaktu = (Number(item.volume) || 0) * (Number(item.normaWaktu) || 0);
    }
    updatedUraian[index] = item;
    setFormData({ ...formData, uraianTugas: updatedUraian });
  };

  const liveCalculation = useMemo(() => {
    const totalMenit = (formData.uraianTugas || []).reduce((acc: number, curr: any) => acc + (curr.totalWaktu || 0), 0);
    const jke = formData.jamKerjaEfektif || 75000;
    const kebutuhan = Number((totalMenit / jke).toFixed(2));
    const selisih = Number(((formData.jumlahSaatIni || 0) - kebutuhan).toFixed(2));
    return { totalMenit, kebutuhan, selisih };
  }, [formData]);

  const handleSave = async () => {
    if (!formData.namaJabatan) return alert("Nama jabatan wajib diisi");
    
    setSyncing(true);
    const { totalMenit, kebutuhan, selisih } = liveCalculation;
    let status: ABKAnjab['status'] = 'IDEAL';
    if (selisih < -0.5) status = 'KURANG';
    else if (selisih > 0.5) status = 'LEBIH';

    const newEntry: ABKAnjab = {
      ...formData,
      id: editingId || Date.now().toString(),
      namaJabatan: formData.namaJabatan!.toUpperCase(),
      totalMenitBebanKerja: totalMenit,
      kebutuhanPegawai: kebutuhan,
      selisih: selisih,
      status: status
    };

    try {
      await syncTableRemote('ABK_ANJAB', 'SAVE', newEntry);
      await loadData();
      logActivity(editingId ? 'UPDATE' : 'CREATE', 'ABK_ANJAB', `Analisis Lengkap: ${newEntry.namaJabatan}`);
      setActiveView('list');
      setShowSuccess(true);
    } catch (err) {
      alert("Gagal sinkronisasi.");
    } finally {
      setSyncing(false);
    }
  };

  const confirmDelete = (item: ABKAnjab) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      await syncTableRemote('ABK_ANJAB', 'DELETE', { id: itemToDelete.id });
      await loadData();
      logActivity('DELETE', 'ABK_ANJAB', `Hapus analisis: ${itemToDelete.namaJabatan}`);
      setIsConfirmOpen(false);
      setItemToDelete(null);
    } catch (e) {
      alert("Gagal menghapus data.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Analisis Disimpan" />
      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        loading={syncing}
        message={`Hapus data analisis jabatan "${itemToDelete?.namaJabatan}" secara permanen?`}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Analisis Jabatan & ABK</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Integrasi Perhitungan Beban Kerja Organisasi DJKI</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleExportExcel} className="h-12 w-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm hover:bg-emerald-600 hover:text-white transition-all" title="Ekspor Excel">
                <i className="bi bi-file-earmark-spreadsheet-fill text-xl"></i>
            </button>
            <button onClick={loadData} className="h-12 w-12 flex items-center justify-center bg-gray-50 text-gray-400 border border-gray-200 rounded-2xl shadow-sm hover:text-blue-600 transition-all" title="Refresh Data">
                <i className={`bi bi-arrow-clockwise text-xl ${loading ? 'animate-spin' : ''}`}></i>
            </button>
            {activeView === 'list' && canEdit && (
              <button onClick={() => { 
                setEditingId(null); 
                setModalTab('profil');
                setFormData({namaJabatan: '', unitKerja: UNIT_KERJA[0], jumlahSaatIni: 0, jamKerjaEfektif: 75000, ikhtisarJabatan: '', kualifikasiPendidikan: '', tanggungJawab: '', wewenang: '', bahanKerja: '', perangkatKerja: '', korelasiJabatan: '', uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]}); 
                setActiveView('editor'); 
              }} className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl active:scale-95 flex items-center gap-2">
                <i className="bi bi-file-earmark-plus-fill text-lg"></i>
                <span>Register Baru</span>
              </button>
            )}
            {activeView === 'editor' && (
              <button onClick={() => setActiveView('list')} className="px-8 py-4 bg-white border border-gray-200 text-gray-400 rounded-[1.5rem] font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">Batal</button>
            )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Nomenklatur Jabatan</th>
                  <th className="px-4 py-6 text-center">Unit Kerja</th>
                  <th className="px-4 py-6 text-center">Beban (Mnt)</th>
                  <th className="px-4 py-6 text-center">Kebutuhan</th>
                  <th className="px-4 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                   <tr><td colSpan={6} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Sinkronisasi Database Cloud...</td></tr>
                ) : abkList.map(a => (
                  <tr key={a.id} className="hover:bg-blue-50/5 group transition-all duration-300">
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1.5">{a.namaJabatan}</p>
                      <div className="flex gap-2">
                         <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[7px] font-black uppercase">{a.kualifikasiPendidikan || 'Pendidikan Belum Diatur'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{normalizeUnitName(a.unitKerja)}</p>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border">{a.totalMenitBebanKerja.toLocaleString('id-ID')}</span>
                    </td>
                    <td className="px-4 py-6 text-center text-[11px] font-black text-blue-600">{a.kebutuhanPegawai}</td>
                    <td className="px-4 py-6 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase border ${
                        a.status === 'KURANG' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        a.status === 'LEBIH' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingId(a.id); setFormData(a); setActiveView('editor'); }} className="h-10 w-10 flex items-center justify-center bg-white text-gray-400 hover:text-blue-600 rounded-xl border shadow-sm transition-all"><i className="bi bi-pencil-fill"></i></button>
                        {(isSuperadmin || canEdit) && (
                          <button onClick={() => confirmDelete(a)} className="h-10 w-10 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 rounded-xl border shadow-sm transition-all"><i className="bi bi-trash-fill"></i></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-modalEnter bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="flex justify-between items-center mb-10 border-b pb-6">
              <h4 className="text-xl font-black uppercase tracking-tighter">{editingId ? 'Update Analisis' : 'Input Analisis Baru'}</h4>
              <div className="flex gap-1 bg-gray-100 p-1.5 rounded-2xl">
                 <button onClick={() => setModalTab('profil')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${modalTab === 'profil' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Profil</button>
                 <button onClick={() => setModalTab('anjab')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${modalTab === 'anjab' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Anjab</button>
                 <button onClick={() => setModalTab('abk')} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${modalTab === 'abk' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>ABK</button>
              </div>
           </div>

           {modalTab === 'profil' && (
              <div className="grid grid-cols-2 gap-8 animate-fadeIn">
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Nomenklatur Jabatan</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-black uppercase" value={formData.namaJabatan} onChange={e => setFormData({...formData, namaJabatan: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Unit Kerja</label><select className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-black uppercase" value={formData.unitKerja} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Jumlah ASN Eksisting</label><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-black" value={formData.jumlahSaatIni} onChange={e => setFormData({...formData, jumlahSaatIni: parseInt(e.target.value) || 0})} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Jam Kerja Efektif (Thn)</label><input type="number" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-black" value={formData.jamKerjaEfektif} onChange={e => setFormData({...formData, jamKerjaEfektif: parseInt(e.target.value) || 75000})} /></div>
                 </div>
              </div>
           )}

           {modalTab === 'anjab' && (
              <div className="space-y-6 animate-fadeIn">
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Ikhtisar Jabatan</label><textarea className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-bold" rows={3} value={formData.ikhtisarJabatan} onChange={e => setFormData({...formData, ikhtisarJabatan: e.target.value})} /></div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Kualifikasi Pendidikan</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-black" value={formData.kualifikasiPendidikan} onChange={e => setFormData({...formData, kualifikasiPendidikan: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Risiko Bahaya</label><input type="text" className="w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl text-[12px] font-black" value={formData.risikoBahaya} onChange={e => setFormData({...formData, risikoBahaya: e.target.value})} /></div>
                 </div>
              </div>
           )}

           {modalTab === 'abk' && (
              <div className="space-y-8 animate-fadeIn">
                 <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                    <div>
                       <p className="text-[8px] font-black text-gray-400 uppercase">Perkiraan Kebutuhan</p>
                       <h5 className="text-xl font-black text-blue-600">{liveCalculation.kebutuhan} ASN</h5>
                    </div>
                    <button onClick={handleAddUraian} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">+ Uraian Tugas</button>
                 </div>
                 <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {formData.uraianTugas.map((u: any, i: number) => (
                       <div key={i} className="p-4 border border-gray-100 rounded-2xl grid grid-cols-[1fr_80px_80px_100px_40px] gap-3 items-end">
                          <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">Uraian Tugas</label><input type="text" className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={u.tugas} onChange={e => handleUraianChange(i, 'tugas', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">Vol</label><input type="number" className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={u.volume} onChange={e => handleUraianChange(i, 'volume', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">Norma (Mnt)</label><input type="number" className="w-full px-3 py-2 bg-gray-50 rounded-lg text-[10px] font-bold" value={u.normaWaktu} onChange={e => handleUraianChange(i, 'normaWaktu', e.target.value)} /></div>
                          <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">Total (Mnt)</label><div className="w-full px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black">{u.totalWaktu}</div></div>
                          <button onClick={() => handleRemoveUraian(i)} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><i className="bi bi-trash"></i></button>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           <div className="mt-12 flex justify-center border-t pt-8">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-emerald-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all">
                 {syncing ? 'Sinkronisasi Cloud...' : 'Simpan Analisis Lengkap'}
              </button>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default ABKAnjabPage;
