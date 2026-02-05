import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchKGBFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, KGB } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, getGajiEstimasi } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const KGBGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [kgbHistory, setKgbHistory] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KGB | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.04.04-',
    tglSurat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    nip: '',
    namaPegawai: '',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    gajiLama: 0,
    gajiBaru: 0,
    tmtLama: '',
    tmtBaru: '',
    masaKerjaTahun: 0,
    golongan: ''
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([fetchPegawaiFromSheets(), fetchKGBFromSheets()]);
      setPegawaiList(p);
      setKgbHistory(k);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) {
      const mkParts = (p.masaKerja || '0').split(' ');
      const years = parseInt(mkParts[0]) || 0;
      const currentSalary = getGajiEstimasi(p.golRuang, years);
      const nextSalary = getGajiEstimasi(p.golRuang, years + 2);
      setFormData({ 
        ...formData, 
        nip: p.nip, 
        namaPegawai: p.nama, 
        golongan: p.golRuang,
        gajiLama: currentSalary,
        gajiBaru: nextSalary,
        tmtLama: p.tmtPangkat || '',
        masaKerjaTahun: years
      });
    }
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.tmtBaru) return alert("Lengkapi data KGB.");
    setSyncing(true);
    const payload = { ...formData, id: formData.id || `KGB-${formData.nip}-${Date.now()}`, status: 'Selesai' };
    const ok = await syncTableRemote('KGB', 'SAVE', payload);
    if (ok) {
      logActivity('CREATE', 'KGB', `Terbitkan KGB: ${formData.namaPegawai}`);
      await loadInitialData();
      setActiveView('preview');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
    pdf.save(`KGB_${formData.namaPegawai.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl font-black text-gray-900 uppercase">Kenaikan Gaji Berkala</h3>
        </div>
      </div>
      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b">
                 <tr><th className="px-10 py-5">Pegawai</th><th className="px-4 py-5 text-center">Gaji Baru</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {kgbHistory.map(k => (
                   <tr key={k.id} className="hover:bg-blue-50/5 group">
                      <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{k.namaPegawai}</p></td>
                      <td className="px-4 py-5 text-center font-black text-emerald-600">Rp {Number(k.gajiBaru).toLocaleString('id-ID')}</td>
                      <td className="px-10 py-5 text-right"><button onClick={() => { setFormData(k); setActiveView('preview'); }} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase">Lihat</button></td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

export default KGBGeneratorPage;