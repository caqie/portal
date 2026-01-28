
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

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ABKAnjab | null>(null);

  const [formData, setFormData] = useState<any>({
    namaJabatan: '',
    unitKerja: UNIT_KERJA[0],
    jumlahSaatIni: 0,
    jamKerjaEfektif: 75000, 
    ikhtisarJabatan: '',
    kualifikasiPendidikan: '',
    risikoBahaya: '',
    uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pegData, abkData] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchABKAnjabFromSheets()
      ]);
      setPegawaiList(pegData);
      setAbkList(abkData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
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

  // MESIN KALKULASI PRESISI
  const liveCalc = useMemo(() => {
    const totalMenit = (formData.uraianTugas || []).reduce((acc: number, curr: any) => acc + (curr.totalWaktu || 0), 0);
    const jke = formData.jamKerjaEfektif || 75000;
    const kebutuhan = Number((totalMenit / jke).toFixed(2));
    const selisih = Number(((formData.jumlahSaatIni || 0) - kebutuhan).toFixed(2));
    
    let status: ABKAnjab['status'] = 'IDEAL';
    if (selisih <= -0.4) status = 'KURANG';
    else if (selisih >= 0.4) status = 'LEBIH';

    return { totalMenit, kebutuhan, selisih, status };
  }, [formData]);

  const handleSave = async () => {
    if (!formData.namaJabatan) return alert("Nama jabatan wajib diisi");
    setSyncing(true);

    const newEntry: ABKAnjab = {
      ...formData,
      id: editingId || Date.now().toString(),
      namaJabatan: formData.namaJabatan!.toUpperCase(),
      totalMenitBebanKerja: liveCalc.totalMenit,
      kebutuhanPegawai: liveCalc.kebutuhan,
      selisih: liveCalc.selisih,
      status: liveCalc.status
    };

    try {
      const ok = await syncTableRemote('ABK_ANJAB', 'SAVE', newEntry);
      if (ok) {
        await loadData();
        logActivity(editingId ? 'UPDATE' : 'CREATE', 'ABK_ANJAB', `Analisis Jabatan: ${newEntry.namaJabatan}`);
        setActiveView('list');
        setShowSuccess(true);
      }
    } catch (err) {
      alert("Gagal sinkronisasi data.");
    } finally {
      setSyncing(false);
    }
  };

  const confirmDelete = (item: ABKAnjab) => { setItemToDelete(item); setIsConfirmOpen(true); };
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    await syncTableRemote('ABK_ANJAB', 'DELETE', { id: itemToDelete.id });
    await loadData();
    setIsConfirmOpen(false);
    setSyncing(false);
  };

  const handleExportExcel = () => {
    const data = abkList.map(a => ({
      'Jabatan': a.namaJabatan,
      'Unit Kerja': a.unitKerja,
      'Eksisting': a.jumlahSaatIni,
      'Beban Kerja (Mnt)': a.totalMenitBebanKerja,
      'Kebutuhan Riil': a.kebutuhanPegawai,
      'Selisih': a.selisih,
      'Status': a.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database ABK");
    XLSX.writeFile(wb, `ABK_DJKI_${Date.now()}.xlsx`);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} loading={syncing} message={`Hapus data analisis "${itemToDelete?.namaJabatan}"?`} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter">Analisis Beban Kerja</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-calculator-fill text-blue-600"></i> Smart Workload Engine DJKI
          </p>
        </div>
        <div className="flex gap-2">
          {activeView === 'list' && (
            <>
              <button onClick={handleExportExcel} className="h-14 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2">
                <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Ekspor Excel
              </button>
              {canEdit && (
                <button onClick={() => { setEditingId(null); setModalTab('profil'); setFormData({namaJabatan: '', unitKerja: UNIT_KERJA[0], jumlahSaatIni: 0, jamKerjaEfektif: 75000, ikhtisarJabatan: '', kualifikasiPendidikan: '', risikoBahaya: '', uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]}); setActiveView('editor'); }} className="h-14 px-8 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">+ Register Jabatan</button>
              )}
            </>
          )}
          {activeView === 'editor' && <button onClick={() => setActiveView('list')} className="h-14 px-10 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Batal</button>}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
                <tr>
                  <th className="px-10 py-6">Jabatan Nomenklatur</th>
                  <th className="px-4 py-6 text-center">Beban (Menit)</th>
                  <th className="px-4 py-6 text-center">Kebutuhan ASN</th>
                  <th className="px-4 py-6 text-center">Eksisting</th>
                  <th className="px-4 py-6 text-center">Status ABK</th>
                  <th className="px-10 py-6 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="py-24 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse tracking-widest">Sinkronisasi Cloud...</td></tr>
                ) : abkList.map(a => (
                  <tr key={a.id} className="hover:bg-blue-50/5 group transition-all">
                    <td className="px-10 py-6">
                      <p className="text-[11px] font-black text-gray-950 uppercase leading-none">{a.namaJabatan}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase mt-1.5 tracking-tighter">{normalizeUnitName(a.unitKerja)}</p>
                    </td>
                    <td className="px-4 py-6 text-center font-mono font-bold text-[10px] text-gray-600">{a.totalMenitBebanKerja.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-6 text-center font-black text-[12px] text-blue-600">{a.kebutuhanPegawai}</td>
                    <td className="px-4 py-6 text-center font-black text-[12px] text-gray-900">{a.jumlahSaatIni}</td>
                    <td className="px-4 py-6 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${
                        a.status === 'KURANG' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                        a.status === 'LEBIH' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingId(a.id); setFormData(a); setModalTab('profil'); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm flex items-center justify-center"><i className="bi bi-pencil-fill"></i></button>
                        {isSuperadmin && <button onClick={() => confirmDelete(a)} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl shadow-sm flex items-center justify-center"><i className="bi bi-trash-fill"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-modalEnter bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
          <div className="bg-gray-50/50 border-b p-8 flex justify-between items-center shrink-0">
             <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900">{editingId ? 'Update Analisis' : 'Penyusunan Analisis Baru'}</h4>
             <div className="flex bg-gray-200 p-1 rounded-2xl gap-1">
                {['profil', 'anjab', 'abk'].map(t => (
                  <button key={t} onClick={() => setModalTab(t as any)} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${modalTab === t ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>{t}</button>
                ))}
             </div>
          </div>

          <div className="flex-1 p-10 md:p-14 overflow-y-auto custom-scrollbar">
             {modalTab === 'profil' && (
               <div className="grid grid-cols-2 gap-12 animate-fadeIn">
                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">Identitas Jabatan</h5>
                     <div className="space-y-4">
                        <div><label className={labelClass}>Nomenklatur Jabatan</label><input type="text" className={inputClass} value={formData.namaJabatan} onChange={e => setFormData({...formData, namaJabatan: e.target.value})} placeholder="CONTOH: ANALIS SDM APARATUR MUDA" /></div>
                        <div><label className={labelClass}>Unit Kerja</label><select className={inputClass} value={formData.unitKerja} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                     </div>
                  </div>
                  <div className="space-y-6">
                     <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest">Konfigurasi Eksisting</h5>
                     <div className="space-y-4">
                        <div><label className={labelClass}>Jumlah ASN Saat Ini (Orang)</label><input type="number" className={inputClass} value={formData.jumlahSaatIni} onChange={e => setFormData({...formData, jumlahSaatIni: parseInt(e.target.value) || 0})} /></div>
                        <div><label className={labelClass}>Jam Kerja Efektif (JKE) Menit/Thn</label><input type="number" className={inputClass} value={formData.jamKerjaEfektif} onChange={e => setFormData({...formData, jamKerjaEfektif: parseInt(e.target.value) || 75000})} /></div>
                     </div>
                  </div>
               </div>
             )}

             {modalTab === 'anjab' && (
               <div className="space-y-10 animate-fadeIn max-w-4xl mx-auto">
                  <div><label className={labelClass}>Ikhtisar Jabatan (Ringkasan Tugas)</label><textarea rows={4} className={`${inputClass} h-32 resize-none normal-case font-bold`} value={formData.ikhtisarJabatan} onChange={e => setFormData({...formData, ikhtisarJabatan: e.target.value})} placeholder="Uraikan tugas pokok dan fungsi secara ringkas..." /></div>
                  <div className="grid grid-cols-2 gap-8">
                     <div><label className={labelClass}>Kualifikasi Pendidikan</label><input type="text" className={inputClass} value={formData.kualifikasiPendidikan} onChange={e => setFormData({...formData, kualifikasiPendidikan: e.target.value})} placeholder="S1 HUKUM / S1 MANAJEMEN" /></div>
                     <div><label className={labelClass}>Risiko Bahaya</label><input type="text" className={inputClass} value={formData.risikoBahaya} onChange={e => setFormData({...formData, risikoBahaya: e.target.value})} placeholder="KELELAHAN MATA, STRES KERJA" /></div>
                  </div>
               </div>
             )}

             {modalTab === 'abk' && (
               <div className="space-y-8 animate-fadeIn">
                  {/* RINGKASAN KALKULASI LIVE */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-3xl"></div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Total Beban</p>
                        <h4 className="text-xl font-black">{liveCalc.totalMenit.toLocaleString('id-ID')} <span className="text-[10px] font-normal text-blue-300">Mnt</span></h4>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Kebutuhan Riil</p>
                        <h4 className="text-xl font-black text-blue-100">{liveCalc.kebutuhan} <span className="text-[10px] font-normal text-blue-300">ASN</span></h4>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Selisih (Eks-Keb)</p>
                        <h4 className={`text-xl font-black ${liveCalc.selisih < 0 ? 'text-rose-400' : liveCalc.selisih > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{liveCalc.selisih}</h4>
                     </div>
                     <div className="flex flex-col justify-center items-end">
                        <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg border ${
                           liveCalc.status === 'KURANG' ? 'bg-rose-600 border-rose-500' : 
                           liveCalc.status === 'LEBIH' ? 'bg-amber-600 border-amber-500' : 
                           'bg-emerald-600 border-emerald-500'
                        }`}>{liveCalc.status}</span>
                     </div>
                  </div>

                  <div className="flex justify-between items-center border-b pb-4">
                     <h6 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Uraian Tugas & Norma Waktu</h6>
                     <button onClick={handleAddUraian} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">+ Baris Tugas</button>
                  </div>

                  <div className="space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar pr-3">
                     {formData.uraianTugas.map((u: any, i: number) => (
                        <div key={i} className="group p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:border-blue-300 transition-all grid grid-cols-12 gap-5 items-end relative">
                           <div className="col-span-12 md:col-span-6 space-y-1.5">
                              <label className="text-[8px] font-black text-gray-400 uppercase">Kegiatan / Tugas</label>
                              <input type="text" className={`${inputClass} bg-white`} value={u.tugas} onChange={e => handleUraianChange(i, 'tugas', e.target.value)} placeholder="Misal: Menyusun draft SK Mutasi" />
                           </div>
                           <div className="col-span-4 md:col-span-2 space-y-1.5">
                              <label className="text-[8px] font-black text-gray-400 uppercase text-center block">Volume (Thn)</label>
                              <input type="number" className={`${inputClass} bg-white text-center`} value={u.volume} onChange={e => handleUraianChange(i, 'volume', parseInt(e.target.value) || 0)} />
                           </div>
                           <div className="col-span-4 md:col-span-2 space-y-1.5">
                              <label className="text-[8px] font-black text-gray-400 uppercase text-center block">Norma (Mnt)</label>
                              <input type="number" className={`${inputClass} bg-white text-center`} value={u.normaWaktu} onChange={e => handleUraianChange(i, 'normaWaktu', parseInt(e.target.value) || 0)} />
                           </div>
                           <div className="col-span-3 md:col-span-1 space-y-1.5">
                              <label className="text-[8px] font-black text-blue-600 uppercase text-center block">Subtotal</label>
                              <div className="w-full h-12 bg-blue-50 flex items-center justify-center rounded-2xl font-black text-blue-600 text-[11px] border border-blue-100">{u.totalWaktu}</div>
                           </div>
                           <div className="col-span-1 flex justify-center">
                              <button onClick={() => handleRemoveUraian(i)} className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><i className="bi bi-trash-fill"></i></button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
             )}
          </div>

          <div className="p-10 border-t bg-gray-50 flex justify-center gap-6 shrink-0">
             <button onClick={() => setActiveView('list')} className="px-14 py-5 bg-white border border-gray-200 text-gray-400 rounded-3xl font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">Batalkan</button>
             <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                <span>Simpan Hasil Analisis</span>
             </button>
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

export default ABKAnjabPage;
