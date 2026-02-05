import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchPAKFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, PAKRecord } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, PREDIKAT_MULTIPLIER } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Konstanta Koefisien Jenjang
const KOEF_JENJANG: Record<string, number> = {
  'TERAMPIL': 5,
  'AHLI PERTAMA': 12.5,
  'AHLI MUDA': 25,
  'AHLI MADYA': 37.5,
  'AHLI UTAMA': 50
};

const PAKPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  
  const [pakList, setPakList] = useState<PAKRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'editor' | 'preview'>('table');
  const [editorStep, setEditorStep] = useState<'profil' | 'konversi' | 'penetapan'>('profil');
  const [selectedPAK, setSelectedPAK] = useState<any | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pakToDelete, setPakToDelete] = useState<PAKRecord | null>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.04.05-',
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    periode: 'Tahun 2024',
    nomorKarpeg: '',
    tmtGolongan: '',
    tmtJabatan: '',
    jenjang: 'AHLI PERTAMA',
    akTerakhir: 0,
    tahunAKTerakhir: '2023',
    akDasar: 0,
    akJFLama: 0,
    akPenyesuaian: 0,
    akIntegrasi: 0,
    akPendidikan: 0,
    pendidikanBaru: 'TIDAK ADA',
    akMinPangkat: 50,
    akMinJenjang: 100,
    riwayatSkp: [
      { tahun: 2023, bulan: 12, predikat: 'Baik', prosentase: 1.0, koef: 12.5, ak: 12.5 },
    ]
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchPAKFromSheets()]);
      setPegawaiList(pRes);
      setPakList(sRes as any || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fungsionalOptions = useMemo(() => {
    const keywords = ['TERAMPIL', 'PERTAMA', 'MUDA', 'MADYA', 'UTAMA'];
    return pegawaiList
      .filter(p => {
        const isPNS = (p.jenisPegawai || '').toUpperCase() === 'PNS';
        const jab = (p.jabatan || '').toUpperCase();
        return isPNS && keywords.some(k => jab.includes(k));
      })
      .map(p => ({
        value: p.nip,
        label: p.nama,
        subLabel: `NIP. ${p.nip} - ${p.jabatan}`
      }));
  }, [pegawaiList]);

  const signatoryOptions = useMemo(() => {
    return pegawaiList
      .filter(p => {
        const jab = (p.jabatan || '').toUpperCase();
        const ese = (p.eselon || '').toUpperCase();
        return ['I', 'II', 'III', 'IV'].some(lvl => ese.startsWith(lvl)) || ['DIREKTUR', 'SEKRETARIS', 'KEPALA', 'KOORDINATOR'].some(k => jab.includes(k));
      })
      .map(p => ({
        value: p.nip,
        label: p.nama,
        subLabel: `NIP. ${p.nip} - ${p.jabatan}`
      }));
  }, [pegawaiList]);

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const jabUpper = p.jabatan.toUpperCase();
      let detectedJenjang = 'AHLI PERTAMA';
      if (jabUpper.includes('UTAMA')) detectedJenjang = 'AHLI UTAMA';
      else if (jabUpper.includes('MADYA')) detectedJenjang = 'AHLI MADYA';
      else if (jabUpper.includes('MUDA')) detectedJenjang = 'AHLI MUDA';
      else if (jabUpper.includes('PERTAMA')) detectedJenjang = 'AHLI PERTAMA';
      else if (jabUpper.includes('TERAMPIL')) detectedJenjang = 'TERAMPIL';
      
      const defaultKoef = KOEF_JENJANG[detectedJenjang] || 12.5;
      setFormData({
        ...formData,
        nip: p.nip,
        namaPegawai: p.nama,
        jenjang: detectedJenjang,
        tmtGolongan: p.tmtPangkat || '',
        tmtJabatan: p.tmtJabatan || '',
        nomorKarpeg: '',
        riwayatSkp: [
           { tahun: new Date().getFullYear() - 1, bulan: 12, predikat: 'Baik', prosentase: 1.0, koef: defaultKoef, ak: defaultKoef }
        ]
      });
    }
  };

  const currentTotalKonversi = useMemo(() => {
    return (formData.riwayatSkp || []).reduce((acc: number, curr: any) => acc + (Number(curr.ak) || 0), 0);
  }, [formData.riwayatSkp]);

  const currentKumulatif = useMemo(() => {
    return (Number(formData.akDasar) || 0) + 
           (Number(formData.akJFLama) || 0) + 
           (Number(formData.akPenyesuaian) || 0) + 
           currentTotalKonversi + 
           (Number(formData.akPendidikan) || 0) +
           (Number(formData.akIntegrasi) || 0);
  }, [formData, currentTotalKonversi]);

  const handleSave = async () => {
    if (!formData.nip || !formData.penilaiNip) return alert("Lengkapi data subjek dan penilai");
    setSyncing(true);
    const payload = {
      ...formData,
      id: formData.id || `PAK-${formData.nip}-${Date.now()}`,
      akKonversi: currentTotalKonversi,
      jumlahKredit: currentKumulatif,
      status: 'Selesai'
    };
    try {
      const ok = await syncTableRemote('PAK', 'SAVE', payload);
      if (ok) {
        await loadInitialData();
        setSelectedPAK(payload);
        setActiveView('preview');
        setShowSuccess(true);
        logActivity('CREATE', 'PAK', `Terbitkan PAK: ${payload.namaPegawai}`);
      }
    } catch (e) { alert("Gagal simpan."); } finally { setSyncing(false); }
  };

  const handleDeletePAK = async () => {
    if (!pakToDelete) return;
    setSyncing(true);
    const ok = await syncTableRemote('PAK', 'DELETE', { id: pakToDelete.id });
    if (ok) { setPakList(prev => prev.filter(p => p.id !== pakToDelete.id)); setIsConfirmOpen(false); }
    setSyncing(false);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`PAK_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const activeRecord = selectedPAK || formData;
  const pSubjek = pegawaiList.find(p => p.nip === activeRecord.nip);
  const pPenilai = pegawaiList.find(p => p.nip === activeRecord.penilaiNip);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDeletePAK} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 uppercase">PAK Digital Engine</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
               <i className="bi bi-patch-check-fill text-blue-600"></i> Standar Penetapan Angka Kredit BKN
            </p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip PAK</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined, riwayatSkp: []}); setActiveView('editor'); setEditorStep('profil'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Buat Baru</button>}
        </div>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Nama Pegawai</th><th className="px-4 py-5">Nomor PAK</th><th className="px-4 py-5 text-center">AK Kumulatif</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {pakList.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-5">
                          <p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1.5">{p.namaPegawai}</p>
                          <p className="text-[9px] font-mono text-blue-600 font-bold tracking-tighter">NIP. {p.nip}</p>
                       </td>
                       <td className="px-4 py-5"><p className="text-[10px] font-black text-gray-500 uppercase">{p.nomor}</p></td>
                       <td className="px-4 py-5 text-center font-black text-blue-600">{Number(p.jumlahKredit || 0).toFixed(3)}</td>
                       <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setSelectedPAK(p); setActiveView('preview'); }} className="h-9 px-6 rounded-xl bg-gray-950 text-white text-[9px] font-black uppercase shadow-lg">Lihat Dokumen</button>
                         </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-7xl mx-auto space-y-6 animate-modalEnter">
           <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[700px]">
              <div className="flex border-b bg-gray-50/50">
                 {[
                   {id: 'profil', label: '1. Identitas & AK Dasar', icon: 'bi-person-vcard-fill'},
                   {id: 'konversi', label: '2. Konversi SKP', icon: 'bi-calculator-fill'},
                   {id: 'penetapan', label: '3. Finalisasi', icon: 'bi-check-all'}
                 ].map(t => (
                   <button key={t.id} onClick={() => setEditorStep(t.id as any)} className={`px-10 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${editorStep === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>
                      <i className={`bi ${t.icon}`}></i> {t.label}
                   </button>
                 ))}
              </div>
              <div className="p-10 flex-1 overflow-y-auto">
                 {editorStep === 'profil' && (
                    <div className="grid grid-cols-2 gap-12">
                       <div className="space-y-6">
                          <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3">Subjek Fungsional</h5>
                          <SearchableSelect label="Pilih Pegawai" options={fungsionalOptions} value={formData.nip || ''} onChange={handlePegawaiSelect} />
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">AK Dasar</label><input type="number" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.akDasar} onChange={e=>setFormData({...formData, akDasar: parseFloat(e.target.value)||0})} /></div>
                             <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">AK Integrasi</label><input type="number" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.akIntegrasi} onChange={e=>setFormData({...formData, akIntegrasi: parseFloat(e.target.value)||0})} /></div>
                          </div>
                       </div>
                       <div className="space-y-6">
                          <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3">Atribut Dokumen</h5>
                          <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor PAK</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nomor} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Periode</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.periode} onChange={e=>setFormData({...formData, periode: e.target.value})} /></div>
                       </div>
                    </div>
                 )}
              </div>
              <div className="p-10 bg-gray-50 border-t flex justify-center">
                 <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-3xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">Simpan & Lihat Hasil</button>
              </div>
           </div>
        </div>
      )}
      {activeView === 'preview' && (
         <div className="animate-fadeIn space-y-10">
            <div className="flex justify-end gap-3 no-print px-6">
               <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase shadow-xl flex items-center gap-3"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
            </div>
            <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto">
               <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2cm] text-black font-arial" style={{ width: '210mm', minHeight: '330mm' }}>
                  <div className="text-center font-bold text-[12pt] underline mb-8 uppercase">PENETAPAN ANGKA KREDIT</div>
                  <div className="space-y-4 text-[10pt]">
                     <div className="grid grid-cols-[180px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold uppercase">{pSubjek?.nama}</span><span>NIP</span><span>:</span><span>{activeRecord.nip}</span><span>Jabatan</span><span>:</span><span className="uppercase">{activeRecord.jenjang}</span></div>
                     <div className="mt-10 border-2 border-black p-4">
                        <p className="font-bold text-center underline mb-4">ANGKA KREDIT KUMULATIF</p>
                        <p className="text-4xl font-black text-center">{(Number(activeRecord.akIntegrasi || 0) + currentTotalKonversi).toFixed(3)}</p>
                     </div>
                  </div>
                  <div className="mt-40 ml-[55%] text-center text-[11pt]">
                     <p>Jakarta, {activeRecord.tglDibuat}</p>
                     <p className="font-bold mt-4 mb-24 uppercase">{pPenilai?.jabatan || 'SEKRETARIS DIREKTORAT JENDERAL'},</p>
                     <p className="font-bold uppercase underline leading-none">{pPenilai?.nama}</p>
                     <p className="mt-1">NIP {activeRecord.penilaiNip}</p>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default PAKPage;