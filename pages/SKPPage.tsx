
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, SKP } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

interface SKPRecord extends SKP {
  status: 'DRAFT' | 'FINAL';
  tglDibuat: string;
  pejabatPenilai?: Pegawai;
  atasanPenilai?: Pegawai;
  periodeMulai: string;
  periodeSelesai: string;
  tglPenilaian: string;
  capaianOrganisasi: string;
  predikatKinerja: string;
  catatan: string;
  dukungan: string[];
  skema: string[];
  konsekuensi: string[];
  hasilKerja: any[];
  perilakuKerja: Record<string, { rating: string, feedback: string }>;
}

const BERAKHLAK_KEYS = [
  { key: 'pelayanan', label: 'Berorientasi Pelayanan' },
  { key: 'akuntabel', label: 'Akuntabel' },
  { key: 'kompeten', label: 'Kompeten' },
  { key: 'harmonis', label: 'Harmonis' },
  { key: 'loyal', label: 'Loyal' },
  { key: 'adaptif', label: 'Adaptif' },
  { key: 'kolaboratif', label: 'Kolaboratif' }
];

const SKPPage = () => {
  const { user, canEdit, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'create' | 'preview'>('table');
  const [activeFormTab, setActiveFormTab] = useState(1);
  const [selectedSKP, setSelectedSKP] = useState<SKPRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);

  const [formData, setFormData] = useState<any>({
    nip: '',
    penilaiNip: '',
    atasanNip: '',
    tahun: new Date().getFullYear(),
    periodeMulai: '01 Januari 2025',
    periodeSelesai: '31 Desember 2025',
    tglPenilaian: '05 Januari 2026',
    capaianOrganisasi: 'BAIK',
    predikatKinerja: 'SESUAI EKSPEKTASI',
    catatan: '-',
    dukungan: ['Dukungan Anggaran Operasional', 'Sarana Prasarana IT'],
    hasilKerja: [
      { rhkAtasan: '', rhk: '', aspek: 'Kualitas', indikator: '', target: '100%', realisasi: '100%', feedback: 'BAIK' }
    ],
    perilaku: BERAKHLAK_KEYS.reduce((acc, {key}) => ({...acc, [key]: { rating: 'SESUAI EKSPEKTASI', feedback: 'Dapat dipertahankan' }}), {})
  });

  useEffect(() => { 
    loadInitialData();
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      const saved = localStorage.getItem('skp_pro_db_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSkpList(isViewer ? parsed.filter((s: any) => s.nip === user?.nip) : parsed);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => ({
      value: p.nip,
      label: p.nama,
      subLabel: `NIP. ${p.nip} - ${p.jabatan}`
    }))
  , [pegawaiList]);

  const handleSaveSKP = async () => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai terlebih dahulu");

    setSyncing(true);
    const newRecord: SKPRecord = { 
      ...formData,
      id: editingId || Date.now().toString(), 
      namaPegawai: peg.nama, 
      status: 'FINAL', 
      tglDibuat: new Date().toLocaleDateString('id-ID'), 
      pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip),
      atasanPenilai: pegawaiList.find(p => p.nip === formData.atasanNip),
      perilakuKerja: formData.perilaku
    };

    try {
      await syncTableRemote('SKP', 'SAVE', newRecord);
      const updatedList = editingId ? skpList.map(s => s.id === editingId ? newRecord : s) : [newRecord, ...skpList];
      setSkpList(updatedList);
      localStorage.setItem('skp_pro_db_v2', JSON.stringify(updatedList));
      logActivity(editingId ? 'UPDATE' : 'CREATE', 'SKP', `Simpan SKP: ${peg.nama}`);
      setActiveView('table');
      setShowSuccess(true);
    } catch (e) {
      alert("Gagal sinkronisasi data cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus dokumen SKP ini secara permanen?")) return;
    setSyncing(true);
    try {
      await syncTableRemote('SKP', 'DELETE', { id });
      const updated = skpList.filter(x => x.id !== id);
      setSkpList(updated);
      localStorage.setItem('skp_pro_db_v2', JSON.stringify(updated));
      logActivity('DELETE', 'SKP', `Menghapus SKP ID: ${id}`);
    } catch (e) {
      alert("Gagal menghapus data dari cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const PagePortrait = ({ children, isCover = false }: any) => (
    <div className={`bg-white mx-auto print-page portrait-page text-black font-serif overflow-hidden relative shadow-2xl mb-10 ${isCover ? 'flex flex-col items-center justify-center p-[2cm]' : 'p-[1.5cm_2cm]'}`}>
      {children}
    </div>
  );

  const PageLandscape = ({ children }: any) => (
    <div className="bg-white mx-auto print-page landscape-page text-black font-serif overflow-hidden relative shadow-2xl mb-10 p-[1.5cm_2cm]">
      {children}
    </div>
  );

  const DocHeader = ({ title, period, showGaruda = false }: any) => (
    <div className="flex flex-col items-center mb-8 text-center text-black">
      {showGaruda ? (
        <img src={LOGO_GARUDA_URL} className="w-20 h-20 mb-6" alt="Garuda" />
      ) : (
        <img src={customLogo} className="h-16 w-auto mb-4 object-contain" alt="Logo Instansi" crossOrigin="anonymous" />
      )}
      <h1 className="text-[14pt] font-bold uppercase leading-tight">{title}</h1>
      <p className="text-[11pt] font-bold uppercase mt-1">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
      <div className="mt-4 border-y-2 border-black py-2 px-10">
        <p className="text-[10pt] font-bold uppercase">PERIODE PENILAIAN:</p>
        <p className="text-[11pt] font-bold uppercase">{period}</p>
      </div>
    </div>
  );

  const IdentitySection = ({ p, label }: any) => (
    <div className="mb-6 text-black">
      <div className="bg-gray-100 p-2 font-bold border-2 border-black text-[10pt] uppercase text-center">{label}</div>
      <table className="w-full border-collapse border-x-2 border-b-2 border-black text-[10pt]">
        <tbody>
          {[
            ['Nama', p?.nama],
            ['NIP', p?.nip],
            ['Pangkat/Gol', `${p?.pangkat || '-'} / ${p?.golRuang || '-'}`],
            ['Jabatan', p?.jabatan],
            ['Unit Kerja', p?.unitKerja]
          ].map(([k, v]) => (
            <tr key={k}>
              <td className="border border-black p-2 w-48 font-bold">{k}</td>
              <td className="border border-black p-2 font-bold uppercase">: {v || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const SignatureBox = ({ date, pLeft, pRight, labelLeft, labelRight }: any) => (
    <div className="mt-12 w-full text-[11pt] text-black">
      <div className="text-right mb-10">Jakarta, {date}</div>
      <div className="grid grid-cols-2 gap-10">
        <div className="text-center flex flex-col items-center">
          <p className="mb-24 leading-tight">{labelLeft || 'Pegawai yang Dinilai,'}</p>
          <p className="font-bold underline uppercase">{pLeft?.nama || '-'}</p>
          <p className="font-bold uppercase">NIP {pLeft?.nip || '-'}</p>
        </div>
        <div className="text-center flex flex-col items-center">
          <p className="mb-24 leading-tight">{labelRight || 'Pejabat Penilai Kinerja,'}</p>
          <p className="font-bold underline uppercase">{pRight?.nama || '-'}</p>
          <p className="font-bold uppercase">NIP {pRight?.nip || '-'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Berhasil Diterbitkan" />
      
      {activeView === 'table' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 no-print">
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Sasaran Kinerja Pegawai (SKP)</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Digitalisasi Evaluasi Kinerja ASN Berbasis Permenpan RB 6/2022</p>
            </div>
            {canEdit && (
              <button onClick={() => { 
                setEditingId(null); 
                setActiveFormTab(1);
                setActiveView('create'); 
              }} className="w-full md:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                + Buat Dokumen SKP
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                  <tr><th className="px-8 py-5">Identitas Pegawai</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5">Predikat Akhir</th><th className="px-8 py-5 text-right">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {skpList.map(s => (
                    <tr key={s.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-8 py-5">
                        <p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1">{s.namaPegawai}</p>
                        <p className="text-[9px] font-mono text-blue-600 font-bold">NIP. {s.nip}</p>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-[10px] text-gray-600">{s.tahun}</td>
                      <td className="px-4 py-5">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded-lg border border-emerald-100 uppercase">{s.predikatKinerja}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setSelectedSKP(s); setActiveView('preview'); }} className="h-10 px-6 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><i className="bi bi-printer"></i> Preview</button>
                          {canEdit && <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 flex items-center justify-center border border-gray-100 transition-all" onClick={() => handleDelete(s.id)}><i className="bi bi-trash-fill"></i></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(skpList.length === 0 || loading) && (
                    <tr><td colSpan={4} className="px-8 py-24 text-center opacity-30 text-[10px] font-black uppercase tracking-widest">{loading ? 'Menghubungkan...' : 'Belum ada dokumen SKP diterbitkan'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'create' && (
        <div className="max-w-6xl mx-auto space-y-8 animate-modalEnter">
           <div className="flex items-center justify-between no-print">
              <div className="flex bg-white p-1.5 rounded-[1.5rem] border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
                {[
                  { id: 1, label: 'Pihak Terlibat' },
                  { id: 2, label: 'Periode & Administrasi' },
                  { id: 3, label: 'Hasil Kerja (RHK)' },
                  { id: 4, label: 'Evaluasi & Perilaku' }
                ].map(step => (
                  <button key={step.id} onClick={() => setActiveFormTab(step.id)} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${activeFormTab === step.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                    Langkah {step.id}: {step.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveView('table')} className="px-6 py-2.5 text-rose-500 font-black text-[10px] uppercase border border-rose-100 rounded-xl bg-white hover:bg-rose-50">Batalkan</button>
           </div>

           <div className="bg-white p-10 md:p-14 rounded-[3rem] border border-gray-100 shadow-sm space-y-10 min-h-[500px] flex flex-col">
              {activeFormTab === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">
                   <div className="space-y-6">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest flex items-center gap-2"><i className="bi bi-person-badge"></i> Pegawai Dinilai</h4>
                      <SearchableSelect label="Pilih ASN" options={searchablePegawaiOptions} value={formData.nip} onChange={(val) => setFormData({...formData, nip: val})} disabled={isViewer} />
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-emerald-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest flex items-center gap-2"><i className="bi bi-person-check"></i> Pejabat Penilai</h4>
                      <SearchableSelect label="Pilih Penilai" options={searchablePegawaiOptions} value={formData.penilaiNip} onChange={(val) => setFormData({...formData, penilaiNip: val})} />
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-indigo-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest flex items-center gap-2"><i className="bi bi-person-workspace"></i> Atasan Penilai</h4>
                      <SearchableSelect label="Pilih Atasan" options={searchablePegawaiOptions} value={formData.atasanNip} onChange={(val) => setFormData({...formData, atasanNip: val})} />
                   </div>
                </div>
              )}

              {activeFormTab === 2 && (
                <div className="max-w-2xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Tahun Pelaporan</label>
                      <input type="number" className="w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-black outline-none focus:border-blue-600 transition-all" value={formData.tahun} onChange={e => setFormData({...formData, tahun: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Tgl Tanda Tangan</label>
                      <input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-black outline-none focus:border-blue-600 transition-all" value={formData.tglPenilaian} onChange={e => setFormData({...formData, tglPenilaian: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Mulai Periode</label>
                      <input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-black outline-none focus:border-blue-600 transition-all" value={formData.periodeMulai} onChange={e => setFormData({...formData, periodeMulai: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-2">Akhir Periode</label>
                      <input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl text-sm font-black outline-none focus:border-blue-600 transition-all" value={formData.periodeSelesai} onChange={e => setFormData({...formData, periodeSelesai: e.target.value})} />
                   </div>
                </div>
              )}

              {activeFormTab === 3 && (
                <div className="space-y-6 animate-fadeIn">
                   <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><i className="bi bi-bullseye"></i> Rencana Hasil Kerja & Target Tahunan</h4>
                      <button onClick={() => setFormData({...formData, hasilKerja: [...formData.hasilKerja, {rhkAtasan: '', rhk: '', aspek: 'Kualitas', indikator: '', target: '100%', realisasi: '100%', feedback: 'BAIK'}]})} className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">+ Tambah RHK</button>
                   </div>
                   <div className="overflow-x-auto border border-gray-100 rounded-[2rem] shadow-inner bg-gray-50/30">
                      <table className="w-full text-[10px] font-black uppercase">
                         <thead className="bg-gray-100/80 text-gray-500 border-b border-gray-200">
                            <tr><th className="p-4 w-1/4 text-left">RHK Atasan Intervensi</th><th className="p-4 w-1/4 text-left">Rencana Hasil Kerja</th><th className="p-4 text-left">Indikator Kinerja</th><th className="p-4 w-24">Target</th><th className="p-4 w-24">Realisasi</th><th className="p-4 w-10"></th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {formData.hasilKerja.map((h:any, i:number) => (
                              <tr key={i} className="hover:bg-white transition-colors group">
                                <td className="p-3"><textarea className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-gray-900 font-bold uppercase transition-all" rows={2} value={h.rhkAtasan} onChange={e => { const u = [...formData.hasilKerja]; u[i].rhkAtasan = e.target.value; setFormData({...formData, hasilKerja: u}) }} /></td>
                                <td className="p-3"><textarea className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-gray-900 font-bold uppercase transition-all" rows={2} value={h.rhk} onChange={e => { const u = [...formData.hasilKerja]; u[i].rhk = e.target.value; setFormData({...formData, hasilKerja: u}) }} /></td>
                                <td className="p-3"><textarea className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-gray-900 font-bold uppercase transition-all" rows={2} value={h.indikator} onChange={e => { const u = [...formData.hasilKerja]; u[i].indikator = e.target.value; setFormData({...formData, hasilKerja: u}) }} /></td>
                                <td className="p-3"><input className="w-full px-3 py-4 bg-white border border-gray-200 rounded-xl text-center font-black" value={h.target} onChange={e => { const u = [...formData.hasilKerja]; u[i].target = e.target.value; setFormData({...formData, hasilKerja: u}) }} /></td>
                                <td className="p-3"><input className="w-full px-3 py-4 bg-white border border-gray-200 rounded-xl text-center font-black text-blue-600" value={h.realisasi} onChange={e => { const u = [...formData.hasilKerja]; u[i].realisasi = e.target.value; setFormData({...formData, hasilKerja: u}) }} /></td>
                                <td className="p-3"><button onClick={() => setFormData({...formData, hasilKerja: formData.hasilKerja.filter((_:any,idx:number)=>idx!==i)})} className="h-10 w-10 text-gray-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><i className="bi bi-trash"></i></button></td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}

              {activeFormTab === 4 && (
                <div className="space-y-10 animate-fadeIn flex-1">
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-6">
                           <h4 className="text-emerald-600 font-black text-[10px] uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-check2-circle"></i> Hasil Evaluasi Akhir</h4>
                           <div className="space-y-4">
                              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Capaian Organisasi</label><select className="w-full px-5 py-4 bg-white border-2 rounded-2xl text-[11px] font-black text-gray-950 outline-none focus:border-emerald-600 transition-all" value={formData.capaianOrganisasi} onChange={e => setFormData({...formData, capaianOrganisasi: e.target.value})}><option value="ISTIMEWA">ISTIMEWA</option><option value="BAIK">BAIK</option><option value="CUKUP">CUKUP</option></select></div>
                              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Predikat Kinerja ASN</label><select className="w-full px-5 py-4 bg-white border-2 rounded-2xl text-[11px] font-black text-gray-950 outline-none focus:border-emerald-600 transition-all" value={formData.predikatKinerja} onChange={e => setFormData({...formData, predikatKinerja: e.target.value})}><option value="DI ATAS EKSPEKTASI">DI ATAS EKSPEKTASI</option><option value="SESUAI EKSPEKTASI">SESUAI EKSPEKTASI</option><option value="DI BAWAH EKSPEKTASI">DI BAWAH EKSPEKTASI</option></select></div>
                              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Catatan Evaluasi</label><textarea className="w-full px-5 py-4 bg-white border-2 rounded-2xl text-[11px] font-bold text-gray-700 h-24 outline-none focus:border-emerald-600 transition-all resize-none" value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} /></div>
                           </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-blue-600 font-black text-[10px] uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-shield-check"></i> Perilaku Kerja BerAKHLAK</h4>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                           {BERAKHLAK_KEYS.map(({key, label}) => (
                             <div key={key} className="p-5 bg-white rounded-2xl border-2 border-gray-50 hover:border-blue-100 transition-all shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                   <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{label}</p>
                                   <select className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[9px] font-black uppercase rounded-lg outline-none border border-blue-100" value={formData.perilaku[key].rating} onChange={e => { const np = {...formData.perilaku}; np[key].rating = e.target.value; setFormData({...formData, perilaku: np}) }}><option value="DI ATAS EKSPEKTASI">DI ATAS EKSPEKTASI</option><option value="SESUAI EKSPEKTASI">SESUAI EKSPEKTASI</option><option value="DI BAWAH EKSPEKTASI">DI BAWAH EKSPEKTASI</option></select>
                                </div>
                                <input className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold text-gray-600 outline-none focus:bg-white" placeholder="Umpan balik perilaku..." value={formData.perilaku[key].feedback} onChange={e => { const np = {...formData.perilaku}; np[key].feedback = e.target.value; setFormData({...formData, perilaku: np}) }} />
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                   <div className="pt-10 border-t flex justify-end gap-4 mt-auto">
                      <button onClick={() => setActiveFormTab(3)} className="px-10 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest">Kembali</button>
                      <button onClick={handleSaveSKP} disabled={syncing} className="px-16 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all hover:bg-blue-700 disabled:bg-blue-300">
                        {syncing ? 'Sinkronisasi Cloud...' : 'Simpan & Terbitkan SKP'}
                      </button>
                   </div>
                </div>
              )}
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedSKP && (
         <div className="print-document animate-fadeIn">
            <PagePortrait isCover>
                <DocHeader title="SASARAN KINERJA PEGAWAI" period={`${selectedSKP.periodeMulai} S.D ${selectedSKP.periodeSelesai}`} showGaruda />
                <div className="mt-20 w-full space-y-12">
                    <IdentitySection label="PEGAWAI YANG DINILAI" p={pegawaiList.find(p=>p.nip===selectedSKP.nip)} />
                    <IdentitySection label="PEJABAT PENILAI KINERJA" p={selectedSKP.pejabatPenilai} />
                    <IdentitySection label="ATASAN PEJABAT PENILAI KINERJA" p={selectedSKP.atasanPenilai} />
                </div>
            </PagePortrait>

            <PageLandscape>
                <DocHeader title="HASIL EVALUASI KINERJA PEGAWAI ASN" period={`${selectedSKP.periodeMulai} S.D ${selectedSKP.periodeSelesai}`} />
                <table className="w-full border-collapse border-2 border-black text-[9pt] mt-6">
                    <thead className="bg-gray-100 font-bold text-center">
                        <tr>
                            <th className="border-2 border-black p-2 w-10">NO</th>
                            <th className="border-2 border-black p-2">RENCANA HASIL KERJA</th>
                            <th className="border-2 border-black p-2">INDIKATOR KINERJA INDIVIDU</th>
                            <th className="border-2 border-black p-2">TARGET</th>
                            <th className="border-2 border-black p-2">REALISASI</th>
                            <th className="border-2 border-black p-2">FEEDBACK</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedSKP.hasilKerja.map((h, i) => (
                            <tr key={i}>
                                <td className="border border-black p-2 text-center font-bold">{i+1}</td>
                                <td className="border border-black p-2 font-bold uppercase">{h.rhk}</td>
                                <td className="border border-black p-2">{h.indikator}</td>
                                <td className="border border-black p-2 text-center font-bold">{h.target}</td>
                                <td className="border border-black p-2 text-center font-bold text-blue-700">{h.realisasi}</td>
                                <td className="border border-black p-2 italic">{h.feedback}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-8 border-2 border-black p-4">
                    <div className="grid grid-cols-2 gap-10">
                        <div className="space-y-2">
                            <p className="font-bold underline uppercase">CAPAIAN KINERJA ORGANISASI:</p>
                            <p className="text-[14pt] font-black text-blue-700 uppercase">{selectedSKP.capaianOrganisasi}</p>
                        </div>
                        <div className="space-y-2 text-right">
                            <p className="font-bold underline uppercase">PREDIKAT KINERJA PEGAWAI:</p>
                            <p className="text-[14pt] font-black text-emerald-700 uppercase">{selectedSKP.predikatKinerja}</p>
                        </div>
                    </div>
                </div>

                <SignatureBox 
                    date={selectedSKP.tglPenilaian} 
                    pLeft={pegawaiList.find(p=>p.nip===selectedSKP.nip)} 
                    pRight={selectedSKP.pejabatPenilai} 
                />
            </PageLandscape>
         </div>
      )}

      <style>{`
        @media print {
           .no-print { display: none !important; }
           body { background: white !important; padding: 0 !important; margin: 0 !important; }
           .print-document { width: 100% !important; margin: 0 !important; background: white !important; padding: 0 !important; }
           .print-page { margin: 0 !important; box-shadow: none !important; border: none !important; width: 210mm !important; height: 296mm !important; page-break-after: always !important; display: block !important; color: black !important; }
           .landscape-page { width: 297mm !important; height: 209mm !important; }
           @page { margin: 0; }
           .portrait-page { size: portrait; }
           .landscape-page { size: landscape; }
           * { color: black !important; border-color: black !important; }
           .bg-gray-50, .bg-gray-100, .bg-gray-200 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
        }
        .print-document { display: flex; flex-direction: column; align-items: center; background: #e2e8f0; padding: 2rem 0; }
        .print-page { width: 21cm; min-height: 29.7cm; background: white; }
        .landscape-page { width: 29.7cm; min-height: 21cm; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default SKPPage;
