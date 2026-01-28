
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, getRetirementDetails } from '../spreadsheetService';
import { Pegawai, DPCPRecord } from '../types';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

const PensiunPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [dpcpHistory, setDpcpHistory] = useState<DPCPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [listTab, setListTab] = useState<'candidates' | 'history'>('candidates');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DPCPRecord | null>(null);

  const [formData, setFormData] = useState<any>({
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    instansiInduk: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    provinsi: 'DKI JAKARTA',
    kabKota: 'JAKARTA SELATAN',
    pembayaran: 'BANK MANDIRI / KPPN JAKARTA V',
    istriSuami: [{ nama: '', tglLahir: '', tglKawin: '', istriKe: '1' }],
    anak: [{ nama: '', tglLahir: '', status: 'KANDUNG', ayahIbu: '' }],
    riwayatKepegawaian: { tmtCpns: '', masaKerjaTotal: '', pendidikanAwal: '' },
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL'
  } as any);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pRes = await fetchPegawaiFromSheets();
      setPegawaiList(pRes);
      const saved = localStorage.getItem('portal_dpcp_v2_history');
      if (saved) setDpcpHistory(JSON.parse(saved));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Filter Pegawai yang akan pensiun (BUP < 2 Tahun)
  const candidateList = useMemo(() => {
    const now = new Date();
    return pegawaiList.map(p => {
      const details = getRetirementDetails(p.nip, p.jabatan);
      return { ...p, retirement: details };
    }).filter(p => {
      if (!p.retirement) return false;
      const diffMonths = (p.retirement.tmtPensiun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return diffMonths > -1 && diffMonths <= 24; // Retiring in next 2 years or just retired
    }).sort((a, b) => (a.retirement?.tmtPensiun.getTime() || 0) - (b.retirement?.tmtPensiun.getTime() || 0));
  }, [pegawaiList]);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      setFormData({
        ...formData,
        id: undefined, // Reset ID for new entry
        nip: p.nip,
        namaPegawai: p.nama,
        bup: ret?.tmtPensiun.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) || '',
        unitKerjaHeader: p.unitKerja,
        tmtGolRuang: p.tmtPangkat || '',
        mulaiMasukPns: p.tmtStatus || '',
        alamatSekarang: p.alamat || '',
        provSekarang: 'DKI JAKARTA',
        istriSuami: formData.istriSuami || [{ nama: '', tglLahir: '', tglKawin: '', istriKe: '1' }],
        anak: formData.anak || [{ nama: '', tglLahir: '', status: 'KANDUNG', ayahIbu: '' }]
      });
    }
  };

  const handlePjbSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      setFormData({
        ...formData,
        pjbNip: p.nip,
        pjbNama: p.nama,
        pjbJabatan: p.jabatan
      });
    }
  };

  const startProcessingDPCP = (nip: string) => {
    handleASNSelect(nip);
    setActiveView('editor');
  };

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      const bupYear = ret ? ret.tmtPensiun.getFullYear() : 'N/A';
      return { 
        value: p.nip, 
        label: p.nama, 
        subLabel: `NIP. ${p.nip} - BUP: ${bupYear}` 
      };
    })
  , [pegawaiList]);

  const handleAddKeluarga = (type: 'pasangan' | 'anak') => {
    if (type === 'pasangan') {
      setFormData({ ...formData, istriSuami: [...(formData.istriSuami || []), { nama: '', tglLahir: '', tglKawin: '', istriKe: '' }] });
    } else {
      setFormData({ ...formData, anak: [...(formData.anak || []), { nama: '', tglLahir: '', status: 'KANDUNG', ayahIbu: '' }] });
    }
  };

  const handleSave = async () => {
    if (!formData.nip) return alert("Pilih ASN terlebih dahulu.");
    setSyncing(true);
    const newRecord: DPCPRecord = {
      ...formData as DPCPRecord,
      id: (formData as any).id || Date.now().toString(),
    };

    const updated = [newRecord, ...dpcpHistory.filter(h => (h as any).id !== (newRecord as any).id)];
    setDpcpHistory(updated);
    localStorage.setItem('portal_dpcp_v2_history', JSON.stringify(updated));
    
    logActivity('CREATE', 'DPCP', `Buat DPCP Resmi: ${formData.namaPegawai}`);
    setActiveView('preview');
    setShowSuccess(true);
    setSyncing(false);
  };

  const confirmDelete = (item: DPCPRecord) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    const updated = dpcpHistory.filter(h => (h as any).id !== (itemToDelete as any).id);
    setDpcpHistory(updated);
    localStorage.setItem('portal_dpcp_v2_history', JSON.stringify(updated));
    setIsConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 210] });
    pdf.addImage(imgData, 'PNG', 0, 0, 330, 210);
    pdf.save(`DPCP_BKN_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
  };

  const selectedASN = pegawaiList.find(p => p.nip === formData.nip);

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="DPCP Berhasil Dibuat" />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleDelete} 
        message={`Hapus arsip DPCP "${itemToDelete?.namaPegawai}"?`}
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">Manajemen Pensiun ASN</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Monitoring BUP & Generator DPCP Resmi BKN</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400'}`}>Monitoring</button>
           {canEdit && <button onClick={() => { setFormData({ ...formData, id: undefined, tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) } as any); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400'}`}>Input DPCP</button>}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="space-y-6">
           <div className="flex bg-gray-100/50 p-1 rounded-2xl w-fit">
              <button onClick={() => setListTab('candidates')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${listTab === 'candidates' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Calon Pensiun (BUP)</button>
              <button onClick={() => setListTab('history')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${listTab === 'history' ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400'}`}>Arsip DPCP Terbit</button>
           </div>

           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              {listTab === 'candidates' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                       <tr><th className="px-10 py-5">Pegawai</th><th className="px-4 py-5">Jabatan</th><th className="px-4 py-5 text-center">TMT Pensiun</th><th className="px-4 py-5 text-center">Sisa Kerja</th><th className="px-10 py-5 text-right">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {candidateList.map(p => (
                         <tr key={p.nip} className="hover:bg-rose-50/10 group">
                            <td className="px-10 py-5">
                               <p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p>
                               <p className="text-[9px] font-mono text-gray-400">NIP. {p.nip}</p>
                            </td>
                            <td className="px-4 py-5"><p className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[200px]">{p.jabatan}</p></td>
                            <td className="px-4 py-5 text-center">
                               <p className="text-[10px] font-black text-gray-900">{p.retirement?.tmtPensiun.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                            </td>
                            <td className="px-4 py-5 text-center">
                               <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${p.retirement?.sisaMasaKerja === 'Pensiun' ? 'bg-gray-100 text-gray-400' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                 {p.retirement?.sisaMasaKerja}
                               </span>
                            </td>
                            <td className="px-10 py-5 text-right">
                               <button 
                                 onClick={() => startProcessingDPCP(p.nip)}
                                 className="h-10 px-6 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                               >
                                 Proses DPCP
                               </button>
                            </td>
                         </tr>
                       ))}
                       {candidateList.length === 0 && !loading && (
                          <tr><td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Tidak ada pegawai mendekati BUP (2 Thn)</td></tr>
                       )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                       <tr><th className="px-10 py-5">Nama Pegawai</th><th className="px-4 py-5 text-center">BUP</th><th className="px-4 py-5">Unit Kerja</th><th className="px-10 py-5 text-right">Opsi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {dpcpHistory.map(h => (
                         <tr key={(h as any).id} className="hover:bg-rose-50/5 group">
                            <td className="px-10 py-5">
                               <p className="text-[11px] font-black text-gray-950 uppercase">{h.namaPegawai}</p>
                               <p className="text-[9px] font-mono text-rose-600 font-bold tracking-tighter">NIP. {h.nip}</p>
                            </td>
                            <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg border">{h.bup}</span></td>
                            <td className="px-4 py-5"><p className="text-[10px] font-bold text-gray-500 uppercase truncate max-w-[250px]">{h.unitKerjaHeader}</p></td>
                            <td className="px-10 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                 <button onClick={() => { setFormData(h); setActiveView('preview'); }} className="h-10 px-6 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-all">Pratinjau</button>
                                 {(isSuperadmin || canEdit) && (
                                   <button onClick={() => confirmDelete(h)} className="h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                     <i className="bi bi-trash-fill"></i>
                                   </button>
                                 )}
                              </div>
                            </td>
                         </tr>
                       ))}
                       {dpcpHistory.length === 0 && (
                          <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Belum ada dokumen DPCP Resmi terbit</td></tr>
                       )}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-7xl mx-auto space-y-8 animate-modalEnter">
           <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12">
              <div className="border-b pb-8">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter leading-none">Isian Data DPCP (Form BKN)</h4>
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Data ini akan dikonversi ke format Landscape F4 secara otomatis</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-rose-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-fill"></i> Data Utama & Header</h5>
                    <SearchableSelect label="Pilih Pegawai" options={searchablePegawaiOptions} value={formData.nip || ''} onChange={handleASNSelect} />
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Instansi Induk</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black uppercase" value={formData.instansiInduk} onChange={e => setFormData({...formData, instansiInduk: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Unit Kerja</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black uppercase" value={formData.unitKerjaHeader} onChange={e => setFormData({...formData, unitKerjaHeader: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Provinsi</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black uppercase" value={formData.provinsi} onChange={e => setFormData({...formData, provinsi: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Kab/Kota</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black uppercase" value={formData.kabKota} onChange={e => setFormData({...formData, kabKota: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">BUP</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black uppercase" value={formData.bup} onChange={e => setFormData({...formData, bup: e.target.value})} /></div>
                    </div>

                    <h5 className="text-[10px] font-black text-gray-950 uppercase border-b pb-3 tracking-widest flex items-center gap-2 mt-4"><i className="bi bi-person-check-fill"></i> Data Penandatangan</h5>
                    <SearchableSelect label="Pilih Pejabat Penandatangan" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}`}))} value={formData.pjbNip} onChange={handlePjbSelect} />
                    <div className="space-y-1.5 mt-4"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Jabatan Penandatangan (TND)</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase" value={formData.pjbJabatan} onChange={e => setFormData({...formData, pjbJabatan: e.target.value})} /></div>
                 </div>

                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-clock-history"></i> Keterangan Pribadi (Poin 1)</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Gaji Pokok Terakhir (Rp)</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.gajiPokokTerakhir} onChange={e => setFormData({...formData, gajiPokokTerakhir: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">TMT Pangkat Terakhir</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.tmtGolRuang} onChange={e => setFormData({...formData, tmtGolRuang: e.target.value})} /></div>
                    </div>
                    <div className="p-4 bg-indigo-50/50 rounded-2xl space-y-4">
                       <p className="text-[9px] font-black uppercase text-indigo-800">Masa Kerja Golongan (MKG)</p>
                       <div className="grid grid-cols-3 gap-2">
                          <input type="text" placeholder="Thn" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={formData.mkgTahun} onChange={e => setFormData({...formData, mkgTahun: e.target.value})} />
                          <input type="text" placeholder="Bln" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={formData.mkgBulan} onChange={e => setFormData({...formData, mkgBulan: e.target.value})} />
                          <input type="text" placeholder="Tgl" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={formData.mkgTgl} onChange={e => setFormData({...formData, mkgTgl: e.target.value})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Dasar Pengangkatan Pertama</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black uppercase" value={formData.pendidikanDasar} onChange={e => setFormData({...formData, pendidikanDasar: e.target.value})} placeholder="S1 HUKUM" /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Lulus Tahun</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.pendidikanDasarTahun} onChange={e => setFormData({...formData, pendidikanDasarTahun: e.target.value})} /></div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t">
                 <div className="space-y-8">
                    <div className="flex justify-between items-center border-b pb-3">
                       <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-people-fill"></i> Keterangan Keluarga (Poin 2)</h5>
                       <div className="flex gap-2">
                          <button onClick={() => handleAddKeluarga('pasangan')} className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border uppercase">+ Suami/Istri</button>
                          <button onClick={() => handleAddKeluarga('anak')} className="text-[8px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border uppercase">+ Anak</button>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Daftar Suami / Istri</p>
                       {formData.istriSuami?.map((is: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl">
                             <input type="text" placeholder="Nama" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold uppercase" value={is.nama} onChange={e => {
                                const list = [...formData.istriSuami!]; list[idx].nama = e.target.value; setFormData({...formData, istriSuami: list});
                             }} />
                             <input type="text" placeholder="Tgl Lahir" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={is.tglLahir} onChange={e => {
                                const list = [...formData.istriSuami!]; list[idx].tglLahir = e.target.value; setFormData({...formData, istriSuami: list});
                             }} />
                             <input type="text" placeholder="Tgl Kawin" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={is.tglKawin} onChange={e => {
                                const list = [...formData.istriSuami!]; list[idx].tglKawin = e.target.value; setFormData({...formData, istriSuami: list});
                             }} />
                             <input type="text" placeholder="Istri Ke-" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={is.istriKe} onChange={e => {
                                const list = [...formData.istriSuami!]; list[idx].istriKe = e.target.value; setFormData({...formData, istriSuami: list});
                             }} />
                          </div>
                       ))}
                    </div>

                    <div className="space-y-4">
                       <p className="text-[9px] font-black text-gray-400 uppercase">Daftar Anak</p>
                       {formData.anak?.map((a: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-blue-50/20 border border-blue-100 rounded-2xl">
                             <input type="text" placeholder="Nama" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold uppercase" value={a.nama} onChange={e => {
                                const list = [...formData.anak!]; list[idx].nama = e.target.value; setFormData({...formData, anak: list});
                             }} />
                             <input type="text" placeholder="Tgl Lahir" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={a.tglLahir} onChange={e => {
                                const list = [...formData.anak!]; list[idx].tglLahir = e.target.value; setFormData({...formData, anak: list});
                             }} />
                             <select className="px-4 py-2 bg-white border rounded-lg text-[10px] font-black" value={a.status} onChange={e => {
                                const list = [...formData.anak!]; list[idx].status = e.target.value as 'KANDUNG' | 'TIRI' | 'ANGKAT'; setFormData({...formData, anak: list});
                             }}><option value="KANDUNG">KANDUNG</option><option value="TIRI">TIRI</option><option value="ANGKAT">ANGKAT</option></select>
                             <input type="text" placeholder="Nama Ayah/Ibu" className="px-4 py-2 bg-white border rounded-lg text-[10px] font-bold uppercase" value={a.ayahIbu} onChange={e => {
                                const list = [...formData.anak!]; list[idx].ayahIbu = e.target.value; setFormData({...formData, anak: list});
                             }} />
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-geo-alt-fill"></i> Data Alamat (Poin 3)</h5>
                    <div className="space-y-4">
                       <p className="text-[9px] font-black text-gray-400 uppercase">A. Alamat Sekarang</p>
                       <textarea rows={2} placeholder="Alamat Lengkap" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-[11px] font-bold uppercase" value={formData.alamatSekarang} onChange={e => setFormData({...formData, alamatSekarang: e.target.value})} />
                       <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Kecamatan" className="px-4 py-2 bg-gray-50 border rounded-xl text-[11px] font-bold uppercase" value={formData.kecSekarang} onChange={e => setFormData({...formData, kecSekarang: e.target.value})} />
                          <input type="text" placeholder="Provinsi" className="px-4 py-2 bg-gray-50 border rounded-xl text-[11px] font-bold uppercase" value={formData.provSekarang} onChange={e => setFormData({...formData, provSekarang: e.target.value})} />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <p className="text-[9px] font-black text-gray-400 uppercase">B. Alamat Sesudah Pensiun</p>
                       <textarea rows={2} placeholder="Alamat Sesudah Pensiun" className="w-full px-5 py-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-bold uppercase" value={formData.alamatPensiun} onChange={e => setFormData({...formData, alamatPensiun: e.target.value})} />
                       <div className="grid grid-cols-3 gap-2">
                          <input type="text" placeholder="Kec" className="px-4 py-2 bg-gray-50 border rounded-xl text-[11px] font-bold uppercase" value={formData.kecPensiun} onChange={e => setFormData({...formData, kecPensiun: e.target.value})} />
                          <input type="text" placeholder="Prov" className="px-4 py-2 bg-gray-50 border rounded-xl text-[11px] font-bold uppercase" value={formData.provPensiun} onChange={e => setFormData({...formData, provPensiun: e.target.value})} />
                          <input type="text" placeholder="Pos" className="px-4 py-2 bg-gray-50 border rounded-xl text-[11px] font-bold" value={formData.kodePosPensiun} onChange={e => setFormData({...formData, kodePosPensiun: e.target.value})} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-10 border-t flex justify-center">
                 <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-rose-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all">
                   {syncing ? 'Memproses Data...' : 'Terbitkan Dokumen DPCP Resmi'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase shadow-sm">Edit Ulang</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                 <i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (LANDSCAPE F4)
              </button>
           </div>
           
           <div className="bg-gray-200/40 py-10 flex flex-col items-center overflow-x-auto no-scrollbar">
              {/* PAGE WRAPPER: LANDSCAPE F4 (330mm x 210mm) */}
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial relative leading-tight" style={{ width: '330mm', minHeight: '210mm', padding: '1cm 1.2cm' }}>
                
                {/* LOGO & HEADER */}
                <div className="flex flex-col items-center text-center mb-6">
                   <img src={LOGO_GARUDA_URL} className="h-14 w-auto mb-2 object-contain" alt="Garuda" crossOrigin="anonymous" />
                   <h1 className="text-[11pt] font-bold leading-tight uppercase">BADAN KEPEGAWAIAN NEGARA</h1>
                   <p className="text-[8pt] font-bold leading-tight uppercase border-b border-black pb-1 mb-1 w-full max-w-[400px]">JL. LETJEN SOETOYO 12 JAKARTA 13640</p>
                   <h2 className="text-[10pt] font-bold uppercase leading-tight mt-2">DATA PERORANGAN CALON PENERIMA PENSIUN (DPCP) PEGAWAI NEGERI SIPIL</h2>
                </div>

                {/* INFO TOP BAR (LANDSCAPE OPTIMIZED) */}
                <div className="grid grid-cols-3 text-[7.5pt] mb-6 border border-black p-2 bg-gray-50/50">
                   <div className="space-y-1">
                      <p>INSTANSI INDUK : <span className="font-bold">{formData.instansiInduk || '................................'}</span></p>
                      <p>PROVINSI : <span className="font-bold">{formData.provinsi || '................................'}</span></p>
                   </div>
                   <div className="space-y-1 border-x border-black px-4">
                      <p>KAB/KOTA : <span className="font-bold">{formData.kabKota || '................................'}</span></p>
                      <p>UNIT KERJA : <span className="font-bold">{formData.unitKerjaHeader || '................................'}</span></p>
                   </div>
                   <div className="space-y-1 pl-4">
                      <p>PEMBAYARAN : <span className="font-bold">{formData.pembayaran || '................................'}</span></p>
                      <p>BUP : <span className="font-bold text-rose-600">{formData.bup || '................................'}</span></p>
                   </div>
                </div>

                <div className="grid grid-cols-[1.1fr_1.1fr_1fr] gap-4">
                   {/* KOLOM 1: KETERANGAN PRIBADI */}
                   <div className="space-y-2 border border-black p-3">
                      <p className="font-bold text-[8.5pt] border-b border-black pb-1 mb-2">1. KETERANGAN PRIBADI</p>
                      <div className="grid grid-cols-[120px_5px_1fr] gap-y-1 text-[7.5pt]">
                         <span className="font-bold">A. NAMA</span><span>:</span><span className="uppercase font-bold">{formData.namaPegawai}</span>
                         <span>B. NIP</span><span>:</span><span>{formData.nip}</span>
                         <span>C. TGL LAHIR</span><span>:</span><span className="uppercase">{selectedASN?.tempatLahir}, {selectedASN?.tanggalLahir}</span>
                         <span>D. JABATAN</span><span>:</span><span className="uppercase leading-tight">{selectedASN?.jabatan}</span>
                         <span className="leading-tight">E. PANGKAT/GOL</span><span>:</span><span className="uppercase">{selectedASN?.pangkat} / ({selectedASN?.golRuang}) TMT: {formData.tmtGolRuang}</span>
                         <span className="leading-tight">F. GAJI TERAKHIR</span><span>:</span><span>Rp. {formData.gajiPokokTerakhir || '....................'}</span>
                         <span className="leading-tight">G. MK GOLONGAN</span><span>:</span><span>{formData.mkgTahun || '..'} THN {formData.mkgBulan || '..'} BLN</span>
                         <span className="leading-tight">H. MK PENSIUN</span><span>:</span><span>{formData.mkpTahun || '..'} THN {formData.mkpBulan || '..'} BLN</span>
                         <span className="leading-tight">I. DASAR CPNS</span><span>:</span><span>{formData.pendidikanDasar || '..........'} ({formData.pendidikanDasarTahun || '....'})</span>
                         <span>J. MASUK PNS</span><span>:</span><span>{formData.mulaiMasukPns || '................'}</span>
                      </div>
                   </div>

                   {/* KOLOM 2: DATA KELUARGA (ISTRI & ANAK) */}
                   <div className="space-y-4">
                      {/* ISTRI/SUAMI */}
                      <div className="border border-black p-2">
                        <p className="font-bold text-[8pt] mb-1 uppercase">2A. NAMA ISTRI / SUAMI</p>
                        <table className="w-full border-collapse border border-black text-[7pt]">
                           <thead className="bg-gray-100 font-bold">
                              <tr>
                                 <th className="border border-black px-1 w-4">NO</th>
                                 <th className="border border-black px-1">NAMA</th>
                                 <th className="border border-black px-1">TGL LAHIR</th>
                                 <th className="border border-black px-1">KAWIN TGL</th>
                              </tr>
                           </thead>
                           <tbody>
                              {(formData.istriSuami || Array(2).fill({})).map((is: any, i: number) => (
                                 <tr key={i} className="h-4">
                                    <td className="border border-black text-center">{i+1}</td>
                                    <td className="border border-black px-1 uppercase">{is.nama}</td>
                                    <td className="border border-black text-center">{is.tglLahir}</td>
                                    <td className="border border-black text-center">{is.tglKawin}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                      </div>

                      {/* ANAK */}
                      <div className="border border-black p-2">
                        <p className="font-bold text-[8pt] mb-1 uppercase">2B. NAMA ANAK</p>
                        <table className="w-full border-collapse border border-black text-[6.8pt]">
                           <thead className="bg-gray-100">
                              <tr>
                                 <th className="border border-black px-1 w-4">NO</th>
                                 <th className="border border-black px-1">NAMA</th>
                                 <th className="border border-black px-1">TGL LAHIR</th>
                                 <th className="border border-black px-1">STT</th>
                                 <th className="border border-black px-1">AYAH/IBU</th>
                              </tr>
                           </thead>
                           <tbody>
                              {(formData.anak || Array(3).fill({})).map((a: any, i: number) => (
                                 <tr key={i} className="h-4">
                                    <td className="border border-black text-center">{i+1}</td>
                                    <td className="border border-black px-1 uppercase leading-none">{a.nama}</td>
                                    <td className="border border-black text-center">{a.tglLahir}</td>
                                    <td className="border border-black text-center text-[5.5pt]">{a.status?.substring(0,2)}</td>
                                    <td className="border border-black px-1 uppercase leading-none">{a.ayahIbu}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                      </div>
                   </div>

                   {/* KOLOM 3: ALAMAT & PENGESAHAN */}
                   <div className="space-y-4">
                      <div className="border border-black p-3 space-y-2">
                         <p className="font-bold text-[8pt] border-b border-black pb-1 uppercase">3. ALAMAT LENGKAP</p>
                         <div className="grid grid-cols-[80px_5px_1fr] gap-x-2 text-[7.5pt]">
                            <span className="font-bold">SEKARANG</span><span>:</span><span className="uppercase text-[7pt] leading-tight">{formData.alamatSekarang}</span>
                            <span>KECAMATAN</span><span>:</span><span className="uppercase">{formData.kecSekarang}</span>
                            <span className="font-bold leading-tight">PASCA PENSIUN</span><span>:</span><span className="uppercase text-[7pt] leading-tight">{formData.alamatPensiun}</span>
                            <span>PROV/POS</span><span>:</span><span className="uppercase">{formData.provPensiun} / {formData.kodePosPensiun}</span>
                         </div>
                      </div>

                      <div className="p-2 border-2 border-dashed border-black bg-gray-50 text-[7pt] font-bold">
                         <p>4. PERNYATAAN:</p>
                         <p className="leading-tight mt-1">DENGAN INI MENYATAKAN TELAH MENGEMBALIKAN BARANG INVENTARIS MILIK NEGARA YANG DIPINJAMKAN SELAMA MASA JABATAN.</p>
                      </div>

                      {/* SIGNATURES (LANDSCAPE OPTIMIZED SIDE BY SIDE) */}
                      <div className="grid grid-cols-2 gap-2 text-[8.5pt] text-center pt-2">
                         <div>
                            <p className="font-bold text-[7pt] mb-10 uppercase">{formData.pjbJabatan}</p>
                            <p className="font-bold uppercase underline">{formData.pjbNama}</p>
                            <p className="text-[7pt]">NIP {formData.pjbNip}</p>
                         </div>
                         <div>
                            <p className="text-[7pt] mb-1">{formData.tglDibuat}</p>
                            <p className="font-bold text-[7pt] mb-8 uppercase">PEGAWAI BERSANGKUTAN</p>
                            <p className="font-bold uppercase underline">{formData.namaPegawai}</p>
                            <p className="text-[7pt]">NIP {formData.nip}</p>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="absolute bottom-4 left-6 border-2 border-black px-4 py-1 text-[7.5pt] font-black uppercase tracking-wider">
                   Formulir BKN - Format Landscape F4 (330mm)
                </div>

              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; margin: 0; padding: 0; }
            .bg-white { box-shadow: none !important; border: none !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default PensiunPage;
