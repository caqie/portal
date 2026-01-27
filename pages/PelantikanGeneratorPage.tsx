
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai } from '../types';
import { useAuth } from '../AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";
const LOGO_KEMENKUMHAM_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Logo_Kemenkumham_RI.svg/1024px-Logo_Kemenkumham_RI.svg.png";

const PelantikanGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Bulk State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedNips, setSelectedNips] = useState<string[]>([]);
  const [bulkSearch, setBulkSearch] = useState('');
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  
  const [bulkOverrides, setBulkOverrides] = useState<Record<string, { 
    jabatan?: string, 
    nomorSK?: string, 
    tanggalSK?: string,
    agama?: string,
    rohaniawan?: string,
    isNonMuslim?: boolean,
    kataPelantikan?: string,
    penutupKataPelantikan?: string
  }>>({});

  const CORE_OATH_TEXT = "bahwa saya akan setia dan taat kepada Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 serta akan menjalankan segala peraturan perundang-undangan dengan selurus-lurusnya demi dharma bakti saya kepada bangsa dan negara.";

  const [formData, setFormData] = useState<any>({
    nomorBA: 'HKI.1-KP.03.04-',
    hari: 'Senin',
    tanggalLantik: '03 Februari 2025',
    tempat: 'Aula Direktorat Jenderal Kekayaan Intelektual',
    nomorSK: 'M.HH-9.KP.03.03 TAHUN 2025',
    tanggalSK: '06 Januari 2025',
    rohaniawan: 'Drs. H. Ahmad Fauzi',
    agama: 'Islam',
    isNonMuslim: false,
    kataPelantikan: 'Demi Allah saya bersumpah, ' + CORE_OATH_TEXT,
    penutupKataPelantikan: 'Semoga Tuhan menolong saya.',
    pjbNama: 'Andrieansjah',
    pjbNip: '197410061998031002',
    pjbJabatan: 'Sekretaris Direktorat Jenderal Kekayaan Intelektual',
    saksi1Nama: '', saksi1Jabatan: '', saksi1Nip: '',
    saksi2Nama: '', saksi2Jabatan: '', saksi2Nip: '',
    asnNip: '', asnNama: '', asnPangkat: '', asnGolRuang: '', asnJabatan: ''
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const res = await fetchPegawaiFromSheets();
      setPegawaiList(res);
      const saved = localStorage.getItem('portal_pelantikan_hybrid_v2');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredPegawaiForBulk = useMemo(() => {
    return pegawaiList.filter(p => 
      p.nama.toLowerCase().includes(bulkSearch.toLowerCase()) || 
      p.nip.includes(bulkSearch)
    );
  }, [pegawaiList, bulkSearch]);

  // LOGIKA DETEKSI MULTI-AGAMA (TERMASUK HINDU & BUDHA)
  const getAutoReligiousSettings = (agamaPegawai: string) => {
    const agama = (agamaPegawai || 'Islam').toLowerCase();
    let prefix = "Demi Allah saya bersumpah";
    let isJanji = false;

    if (agama.includes('islam')) {
        prefix = "Demi Allah saya bersumpah";
        isJanji = false;
    } else if (agama.includes('hindu')) {
        prefix = "Om Atah Parama Wisesa saya bersumpah";
        isJanji = false;
    } else if (agama.includes('budha') || agama.includes('buddha')) {
        prefix = "Demi Sang Hyang Adi Buddha saya berjanji";
        isJanji = true;
    } else if (agama.includes('kristen') || agama.includes('katolik') || agama.includes('protestan')) {
        prefix = "Demi Tuhan saya berjanji";
        isJanji = true;
    } else {
        prefix = "Demi Tuhan saya berjanji";
        isJanji = true;
    }

    return {
        isNonMuslim: isJanji,
        kataPelantikan: `${prefix}, ${CORE_OATH_TEXT}`
    };
  };

  const toggleNipSelection = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    setSelectedNips(prev => {
      const isRemoving = prev.includes(nip);
      if (isRemoving) {
        const newOverrides = { ...bulkOverrides };
        delete newOverrides[nip];
        setBulkOverrides(newOverrides);
        return prev.filter(n => n !== nip);
      } else {
        const auto = getAutoReligiousSettings(p?.agama || 'Islam');
        setBulkOverrides(prevOv => ({
          ...prevOv,
          [nip]: { 
            jabatan: p?.jabatan || '', 
            nomorSK: formData.nomorSK, 
            tanggalSK: formData.tanggalSK,
            agama: p?.agama || 'Islam',
            rohaniawan: formData.rohaniawan,
            isNonMuslim: auto.isNonMuslim,
            kataPelantikan: auto.kataPelantikan,
          }
        }));
        return [...prev, nip];
      }
    });
  };

  const updateBulkOverride = (nip: string, field: string, value: any) => {
    setBulkOverrides(prev => {
        const updated = { ...prev[nip], [field]: value };
        // Jika user mengubah toggle secara manual, kita sesuaikan diksi sumpah/janji saja tanpa mengubah preamble religius
        if (field === 'isNonMuslim') {
            const currentText = updated.kataPelantikan || formData.kataPelantikan;
            if (value === true) {
                updated.kataPelantikan = currentText.replace('bersumpah', 'berjanji');
            } else {
                updated.kataPelantikan = currentText.replace('berjanji', 'bersumpah');
            }
        }
        return { ...prev, [nip]: updated };
    });
  };

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const auto = getAutoReligiousSettings(p.agama || 'Islam');
      setFormData({
        ...formData,
        asnNama: p.nama, asnNip: p.nip, asnPangkat: p.pangkat || '', asnGolRuang: p.golRuang || '', asnJabatan: p.jabatan || '',
        agama: p.agama || 'Islam',
        isNonMuslim: auto.isNonMuslim,
        kataPelantikan: auto.kataPelantikan
      });
    }
  };

  const handleSave = async () => {
    if (isBulkMode && selectedNips.length === 0) return alert("Pilih pegawai.");
    if (!isBulkMode && !formData.asnNip) return alert("Pilih ASN.");

    let batch = [];
    if (isBulkMode) {
      batch = selectedNips.map(nip => {
        const p = pegawaiList.find(peg => peg.nip === nip);
        const ov = bulkOverrides[nip] || {};
        return {
          ...formData,
          id: `${Date.now()}-${nip}`,
          asnNama: p?.nama, asnNip: p?.nip, asnPangkat: p?.pangkat, asnGolRuang: p?.golRuang,
          asnJabatan: ov.jabatan || p?.jabatan || formData.asnJabatan,
          nomorSK: ov.nomorSK || formData.nomorSK,
          tanggalSK: ov.tanggalSK || formData.tanggalSK,
          agama: ov.agama || formData.agama,
          rohaniawan: ov.rohaniawan || formData.rohaniawan,
          isNonMuslim: ov.isNonMuslim !== undefined ? ov.isNonMuslim : formData.isNonMuslim,
          kataPelantikan: ov.kataPelantikan || formData.kataPelantikan,
          timestamp: new Date().toLocaleString('id-ID')
        };
      });
    } else {
      batch = [{ ...formData, id: Date.now().toString(), timestamp: new Date().toLocaleString('id-ID') }];
    }

    setGeneratedBatch(batch);
    const updatedHistory = [...batch, ...history].slice(0, 100);
    setHistory(updatedHistory);
    localStorage.setItem('portal_pelantikan_hybrid_v2', JSON.stringify(updatedHistory));
    
    logActivity('CREATE', 'PELANTIKAN', `Generate ${batch.length} BA (Hybrid & Multi-Religion)`);
    setActiveView('preview');
    setShowSuccess(true);
  };

  const handleDownloadPdf = async () => {
    setLoading(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
      for (let i = 0; i < generatedBatch.length; i++) {
        const record = generatedBatch[i];
        const baElement = document.getElementById(`ba-page-${record.id}`);
        if (baElement) {
          if (i > 0) pdf.addPage([210, 330], 'portrait');
          const canvasBA = await html2canvas(baElement, { scale: 1.8, useCORS: true });
          pdf.addImage(canvasBA.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
        }
        const paktaElement = document.getElementById(`pakta-page-${record.id}`);
        if (paktaElement) {
          pdf.addPage([330, 210], 'landscape');
          const canvasPakta = await html2canvas(paktaElement, { scale: 1.8, useCORS: true });
          pdf.addImage(canvasPakta.toDataURL('image/png'), 'PNG', 0, 0, 330, 210);
        }
      }
      pdf.save(`Pelantikan_MultiAgama_${Date.now()}.pdf`);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Dokumen Siap" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => {
         const updated = history.filter(h => h.id !== itemToDelete.id);
         setHistory(updated);
         localStorage.setItem('portal_pelantikan_hybrid_v2', JSON.stringify(updated));
         setIsConfirmOpen(false);
      }} message="Hapus arsip pelantikan ini?" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">BA & Pakta (Hybrid Multi-Agama)</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">DJKI KEMENKUMHAM • Mendukung Preamble Hindu & Budha</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip</button>
           <button onClick={() => { setIsBulkMode(false); setSelectedNips([]); setBulkOverrides({}); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat Baru</button>
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">No. BA</th><th className="px-4 py-5">ASN Terlantik</th><th className="px-4 py-5 text-center">Agama</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {history.map(h => (
                   <tr key={h.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{h.nomorBA}</p></td>
                      <td className="px-4 py-5"><p className="text-[11px] font-black uppercase">{h.asnNama}</p><p className="text-[9px] font-mono text-blue-600">NIP. {h.asnNip}</p></td>
                      <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-gray-100 text-gray-600 text-[8px] font-black rounded-lg border uppercase">{h.agama}</span></td>
                      <td className="px-10 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => { setGeneratedBatch([h]); setActiveView('preview'); }} className="h-10 px-6 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-all">Pratinjau</button>
                           {isSuperadmin && <button onClick={() => { setItemToDelete(h); setIsConfirmOpen(true); }} className="h-10 w-10 text-rose-500 rounded-xl hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"><i className="bi bi-trash-fill"></i></button>}
                        </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-7xl mx-auto space-y-8 animate-modalEnter">
           <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12">
              
              <div className="flex items-center justify-between border-b pb-6">
                <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Konfigurasi Pelantikan</h4>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                   <button onClick={() => setIsBulkMode(false)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isBulkMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Satu Pegawai</button>
                   <button onClick={() => setIsBulkMode(true)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isBulkMode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Banyak Pegawai (Bulk)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-calendar-check"></i> Detail Seremoni Utama</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">No. BA</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.nomorBA} onChange={e => setFormData({...formData, nomorBA: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Hari</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.hari} onChange={e => setFormData({...formData, hari: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.tanggalLantik} onChange={e => setFormData({...formData, tanggalLantik: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Lokasi</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.tempat} onChange={e => setFormData({...formData, tempat: e.target.value})} /></div>
                    </div>
                    
                    <div className="pt-6 border-t">
                       {isBulkMode ? (
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Langkah 1: Pilih Pegawai Terlantik ({selectedNips.length})</label>
                            <div className="relative mb-4">
                               <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                               <input type="text" placeholder="Cari Nama/NIP..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 rounded-xl text-xs font-bold outline-none focus:border-blue-600 shadow-sm" value={bulkSearch} onChange={e => setBulkSearch(e.target.value)} />
                            </div>
                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar border rounded-2xl divide-y">
                               {filteredPegawaiForBulk.map(p => (
                                 <div key={p.nip} onClick={() => toggleNipSelection(p.nip)} className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedNips.includes(p.nip) ? 'bg-blue-50' : ''}`}>
                                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${selectedNips.includes(p.nip) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200'}`}>
                                       {selectedNips.includes(p.nip) && <i className="bi bi-check text-sm font-black"></i>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <p className="text-[11px] font-black uppercase truncate">{p.nama}</p>
                                       <div className="flex gap-2 items-center mt-1">
                                          <p className="text-[9px] text-gray-400 font-bold uppercase">{p.agama || 'Islam'}</p>
                                          <span className={`px-2 py-0.5 rounded text-[6px] font-black uppercase ${['islam', 'hindu'].includes((p.agama || '').toLowerCase()) ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {['islam', 'hindu'].includes((p.agama || '').toLowerCase()) ? 'Sumpah' : 'Janji'}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                       ) : (
                         <div className="space-y-4">
                            <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `Agama: ${p.agama || '-'}`}))} value={formData.asnNip} onChange={handleASNSelect} />
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jabatan Lantik</label><input type="text" className="w-full px-5 py-3 bg-white border-2 rounded-xl text-xs font-black" value={formData.asnJabatan} onChange={e => setFormData({...formData, asnJabatan: e.target.value})} /></div>
                               <div className="space-y-1">
                                  <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Agama</label>
                                  <input type="text" className="w-full px-5 py-3 bg-white border-2 rounded-xl text-xs font-black uppercase" value={formData.agama} onChange={e => setFormData({...formData, agama: e.target.value})} />
                               </div>
                            </div>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-rose-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-patch-check-fill"></i> Dasar SK & Sumpah (Global)</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SK</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.nomorSK} onChange={e => setFormData({...formData, nomorSK: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Rohaniawan</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.rohaniawan} onChange={e => setFormData({...formData, rohaniawan: e.target.value})} /></div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                       <input type="checkbox" className="h-5 w-5 rounded-lg text-rose-600" checked={formData.isNonMuslim} onChange={e => {
                           const val = e.target.checked;
                           const text = val ? formData.kataPelantikan.replace('bersumpah', 'berjanji') : formData.kataPelantikan.replace('berjanji', 'bersumpah');
                           setFormData({...formData, isNonMuslim: val, kataPelantikan: text});
                       }} />
                       <span className="text-[10px] font-black text-rose-700 uppercase">Gunakan Diksi "Berjanji" (Global)</span>
                    </div>
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Teks Kata Sumpah</label><textarea rows={3} className="w-full px-5 py-3 bg-white border-2 rounded-2xl text-[11px] font-bold leading-relaxed resize-none focus:border-blue-600 outline-none" value={formData.kataPelantikan} onChange={e => setFormData({...formData, kataPelantikan: e.target.value})} /></div>
                 </div>
              </div>

              {isBulkMode && selectedNips.length > 0 && (
                <div className="pt-8 border-t animate-fadeIn">
                   <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2 mb-6"><i className="bi bi-list-stars"></i> Langkah 2: Sesuaikan Per Pegawai</h5>
                   <div className="overflow-x-auto border rounded-[2rem]">
                      <table className="w-full text-left">
                         <thead className="bg-gray-50 text-[7px] font-black uppercase text-gray-400 border-b">
                            <tr>
                               <th className="px-6 py-4">Nama Pegawai</th>
                               <th className="px-4 py-4">Jabatan Baru</th>
                               <th className="px-4 py-4">Agama</th>
                               <th className="px-4 py-4">Rohaniawan</th>
                               <th className="px-4 py-4 text-center">Diksi</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {selectedNips.map(nip => {
                               const p = pegawaiList.find(x => x.nip === nip);
                               const ov = bulkOverrides[nip] || {};
                               return (
                                  <tr key={nip} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-6 py-4 min-w-[180px]">
                                        <p className="text-[10px] font-black text-gray-900 uppercase leading-none">{p?.nama}</p>
                                        <p className="text-[8px] font-mono text-blue-600 mt-1">NIP. {nip}</p>
                                     </td>
                                     <td className="px-4 py-2">
                                        <input type="text" className="w-full px-3 py-2 bg-white border rounded-xl text-[10px] font-bold" value={ov.jabatan || ''} onChange={e => updateBulkOverride(nip, 'jabatan', e.target.value)} />
                                     </td>
                                     <td className="px-4 py-2">
                                        <input type="text" className="w-full px-3 py-2 bg-white border rounded-xl text-[10px] font-bold uppercase" value={ov.agama || ''} onChange={e => updateBulkOverride(nip, 'agama', e.target.value)} />
                                     </td>
                                     <td className="px-4 py-2">
                                        <input type="text" className="w-full px-3 py-2 bg-white border rounded-xl text-[10px] font-bold" value={ov.rohaniawan || ''} onChange={e => updateBulkOverride(nip, 'rohaniawan', e.target.value)} />
                                     </td>
                                     <td className="px-4 py-2 text-center">
                                        <button 
                                          onClick={() => updateBulkOverride(nip, 'isNonMuslim', !ov.isNonMuslim)}
                                          className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border shadow-sm transition-all ${ov.isNonMuslim ? 'bg-rose-600 text-white border-rose-700' : 'bg-blue-600 text-white border-blue-700'}`}
                                        >
                                           {ov.isNonMuslim ? 'JANJI' : 'SUMPAH'}
                                        </button>
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}

              {/* SAKSI & PEJABAT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t">
                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-people-fill"></i> Para Saksi</h5>
                    <div className="space-y-4">
                       <div className="p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100 space-y-4">
                          <SearchableSelect label="Saksi 1" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: p.nip}))} value={formData.saksi1Nip} onChange={v => { const p = pegawaiList.find(x => x.nip === v); setFormData({ ...formData, saksi1Nama: p?.nama, saksi1Nip: p?.nip, saksi1Jabatan: p?.jabatan }); }} />
                          <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jabatan</label><input type="text" className="w-full px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={formData.saksi1Jabatan} onChange={e => setFormData({...formData, saksi1Jabatan: e.target.value})} /></div>
                       </div>
                       <div className="p-6 bg-blue-50/30 rounded-3xl border border-blue-100 space-y-4">
                          <SearchableSelect label="Saksi 2" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: p.nip}))} value={formData.saksi2Nip} onChange={v => { const p = pegawaiList.find(x => x.nip === v); setFormData({ ...formData, saksi2Nama: p?.nama, saksi2Nip: p?.nip, saksi2Jabatan: p?.jabatan }); }} />
                          <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jabatan</label><input type="text" className="w-full px-4 py-2 bg-white border rounded-lg text-[10px] font-bold" value={formData.saksi2Jabatan} onChange={e => setFormData({...formData, saksi2Jabatan: e.target.value})} /></div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-gray-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-workspace"></i> Pejabat Pengambil Sumpah</h5>
                    <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Pejabat</label><input type="text" className="w-full px-5 py-3 bg-white border-2 rounded-xl text-xs font-black" value={formData.pjbNama} onChange={e => setFormData({...formData, pjbNama: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">NIP</label><input type="text" className="w-full px-5 py-3 bg-white border-2 rounded-xl text-xs font-black" value={formData.pjbNip} onChange={e => setFormData({...formData, pjbNip: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jabatan</label><textarea rows={2} className="w-full px-5 py-3 bg-white border-2 rounded-xl text-[10px] font-black" value={formData.pjbJabatan} onChange={e => setFormData({...formData, pjbJabatan: e.target.value})} /></div>
                    </div>
                 </div>
              </div>

              <div className="pt-10 border-t flex justify-center">
                 <button onClick={handleSave} className="px-24 py-5 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all">
                   {isBulkMode ? `Generate ${selectedNips.length} Dokumen Mixed` : 'Pratinjau Dokumen'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-between items-center no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase shadow-sm">Kembali Edit</button>
              <div className="flex gap-4">
                <span className="text-[11px] font-black text-gray-400 uppercase flex items-center gap-2">Total: {generatedBatch.length} Batch</span>
                <button onClick={handleDownloadPdf} disabled={loading} className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                   {loading ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-file-earmark-pdf-fill"></i>} 
                   Download PDF Hybrid (Portrait-Landscape)
                </button>
              </div>
           </div>
           
           <div className="bg-gray-300 py-10 flex flex-col items-center gap-10 overflow-x-auto no-scrollbar">
              <div className="flex flex-col gap-10">
                 {generatedBatch.map((record) => (
                    <React.Fragment key={record.id}>
                       {/* BERITA ACARA - PORTRAIT F4 */}
                       <div id={`ba-page-${record.id}`} className="bg-white shadow-2xl text-black font-arial relative leading-relaxed overflow-hidden" style={{ width: '210mm', minHeight: '330mm', padding: '1.5cm 2.2cm' }}>
                          <div className="flex flex-col items-center text-center mb-8">
                             <img src={LOGO_GARUDA_URL} className="h-20 w-auto mb-4 object-contain" alt="Garuda" crossOrigin="anonymous" />
                             <h1 className="text-[14pt] font-bold uppercase underline">BERITA ACARA</h1>
                             <h2 className="text-[12pt] font-bold uppercase mt-1">PENGAMBILAN {record.isNonMuslim ? 'JANJI' : 'SUMPAH'} JABATAN PEGAWAI NEGERI SIPIL</h2>
                             <p className="text-[11pt] font-bold mt-1 uppercase">NOMOR : {record.nomorBA}</p>
                          </div>

                          <div className="text-[11pt] text-justify space-y-4">
                             <p>Pada hari ini <span className="font-bold">{record.hari}</span>, <span className="font-bold uppercase">{record.tanggalLantik}</span>, bertempat di {record.tempat}, saya, <span className="font-bold uppercase">{record.pjbNama}</span>, <span className="font-bold uppercase">{record.pjbJabatan}</span>, dengan disaksikan oleh 2 (dua) orang saksi masing-masing:</p>
                             <ol className="list-decimal ml-10 space-y-0.5">
                                <li><span className="font-bold uppercase">{record.saksi1Nama}</span>, {record.saksi1Jabatan};</li>
                                <li><span className="font-bold uppercase">{record.saksi2Nama}</span>, {record.saksi2Jabatan}.</li>
                             </ol>
                             <p>telah mengambil {record.isNonMuslim ? 'Janji' : 'Sumpah'} jabatan <span className="font-bold uppercase">{record.asnJabatan}</span> atas nama <span className="font-bold uppercase">{record.asnNama}</span>, NIP. {record.asnNip}, Pangkat/Gol Ruang {record.asnPangkat} ({record.asnGolRuang}), yang berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor {record.nomorSK} tanggal {record.tanggalSK} diangkat sebagai {record.asnJabatan}.</p>
                             <p>Saksi-saksi tersebut hadir bersama-sama dengan Rohaniawan <span className="font-bold">{record.rohaniawan}</span> (Agama {record.agama}).</p>
                             <p>Pegawai Negeri Sipil yang mengucapkan kata-kata sebagai berikut:</p>
                             <p className="italic font-bold text-center uppercase tracking-wider leading-relaxed px-4">"{record.kataPelantikan}"</p>
                             <p className="font-bold text-center mt-2 italic">"{record.penutupKataPelantikan || 'Semoga Tuhan menolong saya.'}"</p>
                             <p>Demikian berita acara pengambilan {record.isNonMuslim ? 'Janji' : 'Sumpah'} jabatan ini dibuat dengan sebenar-benarnya untuk dapat digunakan sebagaimana mestinya.</p>
                          </div>

                          <div className="mt-14 grid grid-cols-2 text-[11pt] text-center leading-tight">
                             <div className="flex flex-col items-center">
                                <p className="mb-24">Yang mengangkat {record.isNonMuslim ? 'janji' : 'sumpah'},</p>
                                <p className="font-bold uppercase underline leading-none">{record.asnNama}</p>
                                <p className="mt-1">NIP {record.asnNip}</p>
                             </div>
                             <div className="flex flex-col items-center">
                                <p className="font-bold">Pejabat</p>
                                <p className="mb-24">Yang mengambil {record.isNonMuslim ? 'janji' : 'sumpah'},</p>
                                <p className="font-bold uppercase underline leading-none">{record.pjbNama}</p>
                                <p className="mt-1">NIP {record.pjbNip}</p>
                             </div>
                          </div>

                          <div className="mt-10 flex flex-col items-center text-center text-[11pt]">
                             <p className="font-bold uppercase mb-4">SAKSI-SAKSI,</p>
                             <div className="grid grid-cols-2 w-full">
                                <div className="flex flex-col items-center">
                                   <p className="font-bold uppercase underline leading-none">{record.saksi1Nama}</p>
                                   <p className="mt-1">NIP {record.saksi1Nip}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                   <p className="font-bold uppercase underline leading-none">{record.saksi2Nama}</p>
                                   <p className="mt-1">NIP {record.saksi2Nip}</p>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* PAKTA INTEGRITAS - LANDSCAPE F4 */}
                       <div id={`pakta-page-${record.id}`} className="bg-white shadow-2xl text-black font-arial relative leading-relaxed overflow-hidden" style={{ width: '330mm', minHeight: '210mm', padding: '1.2cm 2.5cm' }}>
                          <div className="flex flex-col items-center text-center mb-6">
                             <img src={LOGO_KEMENKUMHAM_URL} className="h-16 w-auto mb-2 object-contain" alt="Kemenkumham" crossOrigin="anonymous" />
                             <p className="text-[11pt] font-bold uppercase leading-none">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                             <h1 className="text-[15pt] font-bold uppercase mt-3 tracking-widest border-b-2 border-black px-10 pb-1">PAKTA INTEGRITAS</h1>
                          </div>

                          <div className="grid grid-cols-1 gap-6 text-[10.5pt]">
                             <p>Saya, <span className="font-bold uppercase">{record.asnNama}</span>, <span className="font-bold uppercase">{record.asnJabatan}</span>, menyatakan sebagai berikut:</p>
                             
                             <div className="grid grid-cols-2 gap-x-12">
                                <ol className="list-decimal ml-8 space-y-2 text-justify">
                                   <li>Berperan secara pro aktif dalam upaya pencegahan dan pemberantasan KKN;</li>
                                   <li>Tidak meminta atau menerima pemberian secara langsung atau tidak langsung berupa suap, hadiah, atau bentuk lainnya yang tidak sesuai dengan ketentuan;</li>
                                   <li>Bersikap transparan, jujur, objektif, dan akuntabel dalam melaksanakan tugas;</li>
                                   <li>Menghindari pertentangan kepentingan dalam pelaksanaan tugas;</li>
                                </ol>
                                <ol className="list-decimal ml-8 space-y-2 text-justify" start={5}>
                                   <li>Memberi contoh dalam kepatuhan terhadap peraturan perundang-undangan dalam melaksanakan tugas dan sesama pegawai secara konsisten;</li>
                                   <li>Akan menyampaikan informasi penyimpangan integritas di DJKI serta turut menjaga kerahasiaan saksi atas pelanggaran peraturan;</li>
                                   <li>Bila saya melanggar hal-hal tersebut di atas, saya siap menghadapi konsekuensinya.</li>
                                </ol>
                             </div>

                             <div className="mt-6 grid grid-cols-2 items-start">
                                <div className="flex flex-col items-center text-center leading-tight">
                                   <p className="font-bold">Mengetahui/Menyaksikan:</p>
                                   <p className="mt-1">{record.pjbJabatan}</p>
                                   <p className="mb-20 font-bold uppercase underline mt-20">{record.pjbNama}</p>
                                   <p>NIP {record.pjbNip}</p>
                                </div>
                                <div className="flex flex-col items-center text-center leading-tight">
                                   <p>Jakarta, {record.tanggalSK}</p>
                                   <p className="font-bold">Pembuat Pernyataan,</p>
                                   <div className="my-3 border-2 border-dashed border-gray-300 p-4 rounded bg-gray-50/50 flex flex-col items-center">
                                      <p className="text-[7pt] text-gray-400 font-bold uppercase">Meterai 10000</p>
                                   </div>
                                   <p className="font-bold uppercase underline">{record.asnNama}</p>
                                   <p>NIP {record.asnNip}</p>
                                </div>
                             </div>
                          </div>
                          <div className="absolute bottom-4 left-10 text-[7pt] text-gray-400 font-bold uppercase">Format Landscape Pakta Integritas (F4)</div>
                       </div>
                    </React.Fragment>
                 ))}
              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default PelantikanGeneratorPage;
