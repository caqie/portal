
import React, { useState, useEffect, useMemo } from 'react';
import { ABKAnjab, Pegawai } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote } from '../spreadsheetService';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';

const ABKAnjabPage = () => {
  const { canEdit, logActivity } = useAuth();
  const [abkList, setAbkList] = useState<ABKAnjab[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'profil' | 'anjab' | 'abk'>('profil');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const saved = localStorage.getItem('portal_abk_anjab_db');
    if (saved) setAbkList(JSON.parse(saved));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pegData = await fetchPegawaiFromSheets();
      setPegawaiList(pegData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddUraian = () => {
    setFormData({ ...formData, uraianTugas: [...(formData.uraianTugas || []), { tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }] });
  };

  const handleRemoveUraian = (index: number) => {
    const updatedUraian = (formData.uraianTugas || []).filter((_, i) => i !== index);
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
      // Sync ke Cloud
      await syncTableRemote('ABK_ANJAB', 'SAVE', newEntry);

      const updatedList = editingId ? abkList.map(a => a.id === editingId ? newEntry : a) : [newEntry, ...abkList];
      setAbkList(updatedList);
      localStorage.setItem('portal_abk_anjab_db', JSON.stringify(updatedList));
      logActivity(editingId ? 'UPDATE' : 'CREATE', 'ABK_ANJAB', `Analisis Lengkap: ${newEntry.namaJabatan}`);
      setIsModalOpen(false);
      setShowSuccess(true);
    } catch (err) {
      alert("Gagal sinkronisasi ke database cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data analisis ini dari database?")) return;
    setSyncing(true);
    try {
      await syncTableRemote('ABK_ANJAB', 'DELETE', { id });
      const updated = abkList.filter(x => x.id !== id);
      setAbkList(updated);
      localStorage.setItem('portal_abk_anjab_db', JSON.stringify(updated));
      logActivity('DELETE', 'ABK_ANJAB', `Menghapus analisis ID: ${id}`);
    } catch (e) {
      alert("Gagal menghapus data dari cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => ({
    total: abkList.length,
    kurang: abkList.filter(a => a.status === 'KURANG').length,
    lebih: abkList.filter(a => a.status === 'LEBIH').length,
    ideal: abkList.filter(a => a.status === 'IDEAL').length
  }), [abkList]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Data Analisis Disimpan" />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Pusat Analisis Jabatan & Beban</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Integrasi Dokumen ANJAB dan ABK ASN DJKI</p>
        </div>
        {canEdit && (
          <button onClick={() => { 
            setEditingId(null); 
            setModalTab('profil');
            setFormData({namaJabatan: '', unitKerja: UNIT_KERJA[0], jumlahSaatIni: 0, jamKerjaEfektif: 75000, ikhtisarJabatan: '', kualifikasiPendidikan: '', tanggungJawab: '', wewenang: '', bahanKerja: '', perangkatKerja: '', korelasiJabatan: '', uraianTugas: [{ tugas: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]}); 
            setIsModalOpen(true); 
          }} className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
            <i className="bi bi-file-earmark-plus-fill text-lg"></i>
            <span>Register Analisis Baru</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center space-x-5">
           <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><i className="bi bi-briefcase-fill text-xl"></i></div>
           <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Database Jabatan</p><h4 className="text-xl font-black text-gray-900">{stats.total}</h4></div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-sm flex items-center space-x-5">
           <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><i className="bi bi-person-fill-dash text-xl"></i></div>
           <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kekurangan ASN</p><h4 className="text-xl font-black text-rose-600">{stats.kurang}</h4></div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-amber-100 shadow-sm flex items-center space-x-5">
           <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><i className="bi bi-person-fill-add text-xl"></i></div>
           <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Kelebihan ASN</p><h4 className="text-xl font-black text-amber-600">{stats.lebih}</h4></div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm flex items-center space-x-5">
           <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><i className="bi bi-check-circle-fill text-xl"></i></div>
           <div><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Status Ideal</p><h4 className="text-xl font-black text-emerald-600">{stats.ideal}</h4></div>
        </div>
      </div>

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
              {abkList.map(a => (
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
                      <button onClick={() => { setEditingId(a.id); setFormData(a); setModalTab('profil'); setIsModalOpen(true); }} className="h-10 w-10 flex items-center justify-center bg-white text-gray-400 hover:text-blue-600 rounded-xl border shadow-sm transition-all"><i className="bi bi-pencil-fill"></i></button>
                      <button onClick={() => handleDelete(a.id)} className="h-10 w-10 flex items-center justify-center bg-white text-gray-400 hover:text-rose-600 rounded-xl border shadow-sm transition-all"><i className="bi bi-trash-fill"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {(abkList.length === 0 || loading) && (
                 <tr><td colSpan={6} className="px-8 py-20 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">{loading ? 'Memuat Database...' : 'Belum ada database Anjab/ABK terdaftar'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-6xl max-h-[95dvh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter border border-white/20">
            {/* Modal Header */}
            <div className="px-10 py-6 bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><i className="bi bi-file-earmark-medical-fill text-lg"></i></div>
                  <h4 className="text-[14px] font-black uppercase text-gray-950 tracking-tight leading-none">Formulir Analisis Jabatan & Beban Kerja</h4>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="h-10 w-10 text-gray-400 hover:text-rose-500 transition-all flex items-center justify-center bg-gray-50 rounded-full"><i className="bi bi-x-lg font-black"></i></button>
            </div>

            {/* Navigasi Tab Terpisah */}
            <div className="px-10 py-4 bg-gray-50/50 border-b border-gray-100 flex gap-6 shrink-0">
               {[
                 {id: 'profil', label: '1. Profil & Syarat Jabatan', icon: 'bi-info-circle-fill'},
                 {id: 'anjab', label: '2. Detail Analisis Jabatan (ANJAB)', icon: 'bi-person-vcard-fill'},
                 {id: 'abk', label: '3. Perhitungan Beban Kerja (ABK)', icon: 'bi-calculator-fill'}
               ].map(tab => (
                 <button 
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as any)}
                  className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${modalTab === tab.id ? 'bg-[#111827] text-white shadow-xl' : 'text-gray-400 hover:bg-white hover:text-gray-900 border border-transparent'}`}
                 >
                   <i className={`bi ${tab.icon} text-lg`}></i>
                   {tab.label}
                 </button>
               ))}
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              {/* TAB 1: PROFIL & KUALIFIKASI */}
              {modalTab === 'profil' && (
                <div className="space-y-8 animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-5">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Nama Jabatan</label>
                            <input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[12px] font-black text-gray-950 outline-none focus:border-blue-600 uppercase" value={formData.namaJabatan} onChange={e => setFormData({...formData, namaJabatan: e.target.value})} placeholder="CONTOH: ANALIS KEKAYAAN INTELEKTUAL" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Unit Kerja Penempatan</label>
                            <select className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[12px] font-black text-gray-950 outline-none focus:border-blue-600" value={formData.unitKerja} onChange={e => setFormData({...formData, unitKerja: e.target.value})}>
                              {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                            </select>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">SDM Saat Ini (Eksisting)</label>
                            <input type="number" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[12px] font-black text-gray-950 outline-none focus:border-blue-600" value={formData.jumlahSaatIni} onChange={e => setFormData({...formData, jumlahSaatIni: Number(e.target.value)})} />
                         </div>
                      </div>
                      <div className="space-y-5">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Pendidikan Minimal</label>
                            <input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[12px] font-black text-gray-950 outline-none focus:border-blue-600" value={formData.kualifikasiPendidikan} onChange={e => setFormData({...formData, kualifikasiPendidikan: e.target.value})} placeholder="CONTOH: S1 HUKUM / TEKNIK" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Ikhtisar Jabatan (Tupoksi Utama)</label>
                            <textarea className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[12px] font-bold text-gray-700 outline-none focus:border-blue-600 h-32 resize-none" value={formData.ikhtisarJabatan} onChange={e => setFormData({...formData, ikhtisarJabatan: e.target.value})} placeholder="Menjelaskan fungsi utama jabatan ini dalam organisasi..." />
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB 2: DETAIL ANJAB */}
              {modalTab === 'anjab' && (
                <div className="space-y-10 animate-fadeIn">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-3">Bahan Kerja</label>
                           <textarea className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[11px] font-bold text-gray-700 h-28 resize-none outline-none focus:border-blue-600" value={formData.bahanKerja} onChange={e => setFormData({...formData, bahanKerja: e.target.value})} placeholder="Daftar bahan yang diolah (Contoh: Dokumen Permohonan Paten, Data Pemohon)" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-3">Perangkat Kerja</label>
                           <textarea className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[11px] font-bold text-gray-700 h-28 resize-none outline-none focus:border-blue-600" value={formData.perangkatKerja} onChange={e => setFormData({...formData, perangkatKerja: e.target.value})} placeholder="Alat kerja yang digunakan (Contoh: Komputer, Aplikasi KI, SOP)" />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-3">Korelasi Jabatan</label>
                           <textarea className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] text-[11px] font-bold text-gray-700 h-28 resize-none outline-none focus:border-blue-600" value={formData.korelasiJabatan} onChange={e => setFormData({...formData, korelasiJabatan: e.target.value})} placeholder="Hubungan kerja (Contoh: Atasan Langsung, Pemohon, Instansi Terkait)" />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-3">Tanggung Jawab Jabatan</label>
                           <textarea className="w-full px-6 py-4 bg-white border-2 border-emerald-100 rounded-[1.5rem] text-[11px] font-bold text-gray-700 h-36 resize-none outline-none focus:border-emerald-600" value={formData.tanggungJawab} onChange={e => setFormData({...formData, tanggungJawab: e.target.value})} placeholder="Poin-poin tanggung jawab terhadap output kerja..." />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-3">Wewenang Jabatan</label>
                           <textarea className="w-full px-6 py-4 bg-white border-2 border-emerald-100 rounded-[1.5rem] text-[11px] font-bold text-gray-700 h-36 resize-none outline-none focus:border-emerald-600" value={formData.wewenang} onChange={e => setFormData({...formData, wewenang: e.target.value})} placeholder="Hak untuk mengambil keputusan atau tindakan..." />
                        </div>
                        <div className="space-y-1.5">
                           <label className="text-[9px] font-black text-rose-600 uppercase tracking-widest ml-3">Risiko Bahaya Kerja</label>
                           <input type="text" className="w-full px-6 py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-[11px] font-black text-rose-700 outline-none focus:border-rose-600 uppercase" value={formData.risikoBahaya} onChange={e => setFormData({...formData, risikoBahaya: e.target.value})} placeholder="Contoh: Kelelahan Mata, Stress Kerja" />
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB 3: PERHITUNGAN ABK */}
              {modalTab === 'abk' && (
                <div className="space-y-8 animate-fadeIn">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100">
                      <div>
                        <h5 className="text-[12px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-3"><i className="bi bi-list-stars text-xl"></i> Rincian Tugas & Beban Tahunan</h5>
                        <p className="text-[8px] font-bold text-blue-600 uppercase mt-1">Gunakan Satuan Menit Untuk Norma Waktu</p>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="space-y-0.5">
                            <label className="text-[7px] font-black text-blue-400 uppercase tracking-widest ml-2">Jam Kerja Efektif (JKE)</label>
                            <input type="number" className="px-4 py-2 bg-white border border-blue-200 rounded-xl text-[10px] font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 w-32" value={formData.jamKerjaEfektif} onChange={e => setFormData({...formData, jamKerjaEfektif: Number(e.target.value)})} />
                         </div>
                         <button onClick={handleAddUraian} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2 mt-3"><i className="bi bi-plus-circle-fill"></i> Tambah Baris Tugas</button>
                      </div>
                   </div>

                   <div className="space-y-4">
                      {formData.uraianTugas?.map((item: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-5 bg-white rounded-[2rem] border border-gray-100 items-end hover:shadow-xl transition-all group relative">
                          <div className="md:col-span-5 space-y-1">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Uraian Tugas Pokok</label>
                             <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold text-gray-950 focus:border-blue-500 outline-none uppercase" value={item.tugas} onChange={e => handleUraianChange(idx, 'tugas', e.target.value)} placeholder="Mencatat data permohonan..." />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Vol/Thn</label>
                             <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black text-gray-950 text-center" value={item.volume} onChange={e => handleUraianChange(idx, 'volume', e.target.value)} />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Norma (Mnt)</label>
                             <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-black text-gray-950 text-center" value={item.normaWaktu} onChange={e => handleUraianChange(idx, 'normaWaktu', e.target.value)} />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                             <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Total Beban</label>
                             <div className="w-full px-4 py-3 bg-indigo-50 text-[11px] font-black text-indigo-700 text-center rounded-2xl border border-indigo-100 shadow-inner">{(item.totalWaktu || 0).toLocaleString('id-ID')}</div>
                          </div>
                          <div className="md:col-span-1">
                             <button onClick={() => handleRemoveUraian(idx)} className="h-11 w-full bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl transition-all border border-rose-100 flex items-center justify-center"><i className="bi bi-trash-fill"></i></button>
                          </div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="p-10 bg-[#111827] rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-[100px]"></div>
                      <div className="flex items-center gap-8 relative z-10">
                        <div className="h-16 w-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-3xl border border-white/10"><i className="bi bi-lightning-charge-fill text-blue-400"></i></div>
                        <div>
                          <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1.5">Beban Kerja Akumulasi</p>
                          <h4 className="text-4xl font-black">{liveCalculation.totalMenit.toLocaleString('id-ID')} <span className="text-[12px] opacity-40">MENIT / TAHUN</span></h4>
                        </div>
                      </div>
                      <div className="h-20 w-px bg-white/10 hidden md:block"></div>
                      <div className="text-center md:text-right relative z-10">
                        <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-1.5">Kebutuhan ASN Riil</p>
                        <h4 className="text-4xl font-black text-emerald-400">{liveCalculation.kebutuhan} <span className="text-[12px] text-white/50 uppercase">ASN</span></h4>
                        <div className={`mt-3 inline-block px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${liveCalculation.selisih < -0.5 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                           Selisih: {liveCalculation.selisih > 0 ? `+${liveCalculation.selisih}` : liveCalculation.selisih} ({liveCalculation.selisih < -0.5 ? 'Kurang' : liveCalculation.selisih > 0.5 ? 'Lebih' : 'Ideal'})
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
               <div className="hidden md:flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${syncing ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`}></div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{syncing ? 'Sinkronisasi Cloud...' : 'Seluruh Perubahan Terkalkulasi Otomatis'}</p>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none px-10 py-4 text-[10px] font-black uppercase text-gray-500 bg-white border-2 border-gray-200 rounded-2xl shadow-sm active:scale-95 transition-all">Tutup</button>
                  <button onClick={handleSave} disabled={syncing} className="flex-[1.5] md:flex-none px-16 py-4 text-[10px] font-black uppercase text-white bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/30 active:scale-95 transition-all hover:bg-blue-700 disabled:bg-blue-300">
                    {syncing ? 'Memproses Cloud...' : 'Simpan Analisis Jabatan & Beban'}
                  </button>
               </div>
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

export default ABKAnjabPage;
