import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchKenaikanFromSheets } from '../spreadsheetService';
import { Pegawai, KenaikanKarir } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, PANGKAT_MAP } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const KenaikanPangkatPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [history, setHistory] = useState<KenaikanKarir[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedKenaikan, setSelectedKenaikan] = useState<KenaikanKarir | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KenaikanKarir | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    jenisUsulan: 'REGULER',
    dari: '',
    menjadi: '',
    tmtUsulan: '01-04-2025',
    status: 'Proses',
    pjbNama: 'Andrieansjah',
    pjbNip: '197410061998031002',
    pjbJabatan: 'Sekretaris Direktorat Jenderal'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, kRes] = await Promise.all([fetchPegawaiFromSheets(), fetchKenaikanFromSheets()]);
      setPegawaiList(pRes);
      setHistory(kRes);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const RANKS = ['I/a', 'I/b', 'I/c', 'I/d', 'II/a', 'II/b', 'II/c', 'II/d', 'III/a', 'III/b', 'III/c', 'III/d', 'IV/a', 'IV/b', 'IV/c', 'IV/d', 'IV/e'];
      const currentIdx = RANKS.indexOf(p.golRuang || 'III/a');
      const nextRank = currentIdx !== -1 && currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : p.golRuang;
      setFormData({ 
        ...formData, 
        nip: p.nip, 
        namaPegawai: p.nama, 
        dari: `${p.pangkat} (${p.golRuang})`, 
        menjadi: `${PANGKAT_MAP[nextRank || '']} (${nextRank})`,
        unitKerja: p.unitKerja
      });
    }
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.menjadi) return alert("Lengkapi data usulan.");
    setSyncing(true);
    const newRecord: KenaikanKarir = { ...formData as KenaikanKarir, id: formData.id || Date.now().toString() };
    try {
      const ok = await syncTableRemote('KENAIKAN', 'SAVE', newRecord);
      if (ok) { setSelectedKenaikan(newRecord); setActiveView('preview'); setShowSuccess(true); loadData(); }
    } catch (e) { alert("Gagal sinkronisasi."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`Usulan_Pangkat_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const record = selectedKenaikan || formData;

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
           <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl font-black text-gray-900 uppercase">Usulan Kenaikan Pangkat</h3>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip Usulan</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined}); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Buat Usulan</button>}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Identitas Pegawai</th><th className="px-4 py-5">Kenaikan</th><th className="px-4 py-5 text-center">Status</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {history.map(h => (
                   <tr key={h.id} className="hover:bg-blue-50/5 group">
                      <td className="px-10 py-5"><p className="text-[11px] font-black uppercase">{h.namaPegawai}</p><p className="text-[9px] font-mono text-blue-600">NIP. {h.nip}</p></td>
                      <td className="px-4 py-5"><p className="text-[10px] font-bold text-gray-500 uppercase">{h.dari} <i className="bi bi-arrow-right mx-1"></i> {h.menjadi}</p></td>
                      <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase border border-amber-100">{h.status}</span></td>
                      <td className="px-10 py-5 text-right"><button onClick={() => { setSelectedKenaikan(h); setActiveView('preview'); }} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-lg opacity-0 group-hover:opacity-100">Lihat Nota</button></td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-4xl mx-auto bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10 animate-modalEnter">
           <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.golRuang}`}))} value={formData.nip} onChange={handleASNSelect} />
        </div>
      )}
    </div>
  );
};

export default KenaikanPangkatPage;