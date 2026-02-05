import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
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
      const data = await fetchABKAnjabFromSheets();
      setAbkList(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddUraian = () => {
    setFormData({ ...formData, uraianTugas: [...(formData.uraianTugas || []), { tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }] });
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

  const liveCalc = useMemo(() => {
    const totalMenit = (formData.uraianTugas || []).reduce((acc: number, curr: any) => acc + (curr.totalWaktu || 0), 0);
    const jke = formData.jamKerjaEfektif || 75000;
    const kebutuhan = Number((totalMenit / jke).toFixed(2));
    const selisih = Number(((formData.jumlahSaatIni || 0) - kebutuhan).toFixed(2));
    let status: ABKAnjab['status'] = 'IDEAL';
    if (selisih <= -0.5) status = 'KURANG';
    else if (selisih >= 0.5) status = 'LEBIH';
    return { totalMenit, kebutuhan, selisih, status };
  }, [formData]);

  const handleSave = async () => {
    if (!formData.namaJabatan) return alert("Nama jabatan wajib diisi");
    setSyncing(true);
    const newEntry: ABKAnjab = {
      ...formData,
      id: editingId || `ABK-${Date.now()}`,
      namaJabatan: formData.namaJabatan.toUpperCase(),
      totalMenitBebanKerja: liveCalc.totalMenit,
      kebutuhanPegawai: liveCalc.kebutuhan,
      selisih: liveCalc.selisih,
      status: liveCalc.status
    };
    const ok = await syncTableRemote('ABK_ANJAB', 'SAVE', newEntry);
    if (ok) {
      await loadData();
      logActivity(editingId ? 'UPDATE' : 'CREATE', 'ABK', `Simpan ABK: ${newEntry.namaJabatan}`);
      setActiveView('list');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if (!itemToDelete) return;
         setSyncing(true);
         await syncTableRemote('ABK_ANJAB', 'DELETE', { id: itemToDelete.id });
         await loadData();
         setIsConfirmOpen(false);
         setSyncing(false);
      }} />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-none">Analisis Beban Kerja (ABK)</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <i className="bi bi-calculator-fill text-blue-600"></i> Workload Intelligence System DJKI
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeView === 'list' ? (
            canEdit && <button onClick={() => { setEditingId(null); setFormData({namaJabatan: '', unitKerja: UNIT_KERJA[0], jumlahSaatIni: 0, jamKerjaEfektif: 75000, uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]}); setModalTab('profil'); setActiveView('editor'); }} className="h-14 px-8 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">+ Jabatan Baru</button>
          ) : (
            <button onClick={() => setActiveView('list')} className="h-14 px-10 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Batal</button>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-6">Jabatan & Unit</th><th className="px-4 py-6 text-center">Beban (Menit)</th><th className="px-4 py-6 text-center">Kebutuhan</th><th className="px-4 py-6 text-center">Eksisting</th><th className="px-4 py-6 text-center">Status</th><th className="px-10 py-6 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {abkList.map(a => (
                    <tr key={a.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-6">
                          <p className="text-[11px] font-black text-gray-950 uppercase">{a.namaJabatan}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{normalizeUnitName(a.unitKerja)}</p>
                       </td>
                       <td className="px-4 py-6 text-center font-mono font-bold text-gray-600">{a.totalMenitBebanKerja?.toLocaleString()}</td>
                       <td className="px-4 py-6 text-center font-black text-blue-600">{a.kebutuhanPegawai}</td>
                       <td className="px-4 py-6 text-center font-black text-gray-900">{a.jumlahSaatIni}</td>
                       <td className="px-4 py-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${a.status === 'KURANG' ? 'bg-rose-50 text-rose-600 border-rose-100' : a.status === 'LEBIH' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{a.status}</span>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => { setEditingId(a.id); setFormData(a); setModalTab('profil'); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm flex items-center justify-center"><i className="bi bi-pencil-fill"></i></button>
                             {isSuperadmin && <button onClick={() => { setItemToDelete(a); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl shadow-sm flex items-center justify-center"><i className="bi bi-trash-fill"></i></button>}
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-modalEnter bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
           <div className="bg-gray-50/50 border-b p-8 flex justify-between items-center shrink-0">
              <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900">{editingId ? 'Edit Analisis' : 'Penyusunan Analisis Baru'}</h4>
           </div>
           <div className="flex-1 p-10 overflow-y-auto">
              <p className="text-[11px] font-bold text-gray-400">Penyusunan Form ABK Aktif...</p>
           </div>
           <div className="p-8 border-t bg-gray-50 flex justify-center shrink-0">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Simpan Hasil Analisis</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ABKAnjabPage;