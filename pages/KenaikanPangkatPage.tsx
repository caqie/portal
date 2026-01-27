
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  const [formData, setFormData] = useState<Partial<KenaikanKarir>>({
    jenisUsulan: 'REGULER',
    dari: '',
    menjadi: '',
    tmtUsulan: '01-04-2025',
    status: 'Proses'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, kRes] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchKenaikanFromSheets()
      ]);
      setPegawaiList(pRes);
      setHistory(kRes);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const candidateList = useMemo(() => {
    const now = new Date();
    return pegawaiList.filter(p => {
      if (!p.tmtPangkat) return false;
      const tmtParts = p.tmtPangkat.split('-');
      if (tmtParts.length !== 3) return false;
      const tmt = new Date(parseInt(tmtParts[0]), parseInt(tmtParts[1])-1, parseInt(tmtParts[2]));
      const diffYears = (now.getFullYear() - tmt.getFullYear());
      return diffYears >= 3.5; // Mendekati 4 tahun
    });
  }, [pegawaiList]);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      setFormData({
        ...formData,
        nip: p.nip,
        namaPegawai: p.nama,
        dari: `${p.pangkat} (${p.golRuang})`,
      });
    }
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.menjadi) return alert("Lengkapi data usulan.");
    setSyncing(true);
    const newRecord: KenaikanKarir = {
      ...formData as KenaikanKarir,
      id: Date.now().toString()
    };
    
    try {
      const ok = await syncTableRemote('KENAIKAN', 'SAVE', newRecord);
      if (ok) {
        logActivity('CREATE', 'PROMOSI', `Usulan Pangkat ${formData.jenisUsulan}: ${formData.namaPegawai}`);
        setSelectedKenaikan(newRecord);
        setActiveView('preview');
        setShowSuccess(true);
        loadData();
      }
    } catch (e) { alert("Gagal sinkronisasi."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`Usulan_Pangkat_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
  };

  const record = selectedKenaikan || formData;
  const peg = pegawaiList.find(p => p.nip === record.nip);

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Usulan Berhasil" />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={async () => {
          if (!itemToDelete) return;
          setSyncing(true);
          await syncTableRemote('KENAIKAN', 'DELETE', { id: itemToDelete.id });
          loadData();
          setIsConfirmOpen(false);
          setSyncing(false);
        }} 
        message="Hapus arsip usulan ini?"
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">Usul Kenaikan Pangkat</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">DJKI Enterprise • Reguler & Istimewa Generator</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Daftar Usulan</button>
           {canEdit && <button onClick={() => { setFormData({ jenisUsulan: 'REGULER', tmtUsulan: '01-04-2025', status: 'Proses' }); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat Usulan</button>}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest flex items-center gap-2">
                    <i className="bi bi-person-check-fill"></i> Kandidat Eligible (Reguler)
                 </h5>
                 <div className="mt-6 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {candidateList.map(p => (
                       <div key={p.nip} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                          <p className="text-[11px] font-black text-gray-900 uppercase truncate">{p.nama}</p>
                          <p className="text-[8px] text-gray-400 font-bold mt-1 uppercase">TMT Terakhir: {p.tmtPangkat}</p>
                          <button onClick={() => { handleASNSelect(p.nip); setActiveView('editor'); }} className="mt-3 w-full py-2 bg-white border border-gray-200 text-[9px] font-black uppercase rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">Proses Usul</button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="xl:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr><th className="px-10 py-5">Nama Pegawai</th><th className="px-4 py-5">Jenis Usulan</th><th className="px-4 py-5 text-center">TMT</th><th className="px-10 py-5 text-right">Opsi</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {history.map(h => (
                      <tr key={h.id} className="hover:bg-blue-50/5 group transition-colors">
                         <td className="px-10 py-5">
                            <p className="text-[11px] font-black uppercase text-gray-950">{h.namaPegawai}</p>
                            <p className="text-[9px] font-mono text-blue-600">NIP. {h.nip}</p>
                         </td>
                         <td className="px-4 py-5">
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${h.jenisUsulan === 'ISTIMEWA' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                               {h.jenisUsulan}
                            </span>
                         </td>
                         <td className="px-4 py-5 text-center"><p className="text-[10px] font-bold text-gray-600">{h.tmtUsulan}</p></td>
                         <td className="px-10 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                               <button onClick={() => { setSelectedKenaikan(h); setActiveView('preview'); }} className="h-10 px-6 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Preview</button>
                               {isSuperadmin && <button onClick={() => { setItemToDelete(h); setIsConfirmOpen(true); }} className="h-10 w-10 text-rose-500 rounded-xl hover:bg-rose-50 transition-all"><i className="bi bi-trash-fill"></i></button>}
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-4xl mx-auto animate-modalEnter bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10">
           <div className="border-b pb-6 flex justify-between items-center">
              <div>
                 <h4 className="text-xl font-black uppercase tracking-tighter">Editor Usulan Pangkat</h4>
                 <p className="text-[9px] font-bold text-gray-400 uppercase mt-2">Lengkapi Parameter Usul Kenaikan Pangkat</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                 <button onClick={() => setFormData({...formData, jenisUsulan: 'REGULER'})} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${formData.jenisUsulan === 'REGULER' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Reguler</button>
                 <button onClick={() => setFormData({...formData, jenisUsulan: 'ISTIMEWA'})} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${formData.jenisUsulan === 'ISTIMEWA' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400'}`}>Istimewa</button>
              </div>
           </div>

           <div className="space-y-6">
              <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.pangkat}`}))} value={formData.nip || ''} onChange={handleASNSelect} />
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Pangkat/Gol Saat Ini</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase" value={formData.dari} readOnly /></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Usul Pangkat/Gol Baru</label><input type="text" className="w-full px-5 py-3 bg-white border-2 border-blue-100 rounded-xl text-xs font-black uppercase focus:border-blue-600 outline-none" value={formData.menjadi} onChange={e => setFormData({...formData, menjadi: e.target.value})} placeholder="Contoh: Pembina (IV/a)" /></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">TMT Usulan</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black" value={formData.tmtUsulan} onChange={e => setFormData({...formData, tmtUsulan: e.target.value})} /></div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-500 uppercase ml-2">Basis Usulan</label>
                    <select className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black outline-none" value={formData.jenisUsulan} onChange={e => setFormData({...formData, jenisUsulan: e.target.value})}>
                       <option value="REGULER">Masa Kerja (Reguler)</option>
                       <option value="ISTIMEWA">Prestasi Luar Biasa (Istimewa)</option>
                       <option value="PILIHAN">Jabatan Struktural/Fungsional (Pilihan)</option>
                    </select>
                 </div>
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center">
              <button onClick={handleSave} disabled={syncing} className="px-20 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                 {syncing && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                 <span>Simpan & Pratinjau Dokumen</span>
              </button>
           </div>
        </div>
      )}

      {activeView === 'preview' && record && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Data</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download Nota Usul (F4)</button>
           </div>

           <div className="bg-gray-200/50 py-20 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial p-[1.5cm_2cm]" style={{ width: '210mm', minHeight: '330mm' }}>
                 <div className="flex flex-col items-center text-center mb-8 border-b-2 border-black pb-4">
                    <img src={DEFAULT_LOGO} className="h-16 w-auto mb-2 object-contain" alt="Logo" crossOrigin="anonymous" />
                    <p className="text-[11pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                    <p className="text-[11pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                 </div>

                 <div className="text-center mb-10">
                    <h1 className="text-[14pt] font-bold uppercase underline leading-tight">NOTA USUL KENAIKAN PANGKAT</h1>
                    <p className="text-[11pt] font-bold mt-1">NOMOR : W.1.KP.03.03 - 2025</p>
                 </div>

                 <div className="text-[11pt] space-y-6 text-justify leading-relaxed">
                    <p>Bersama ini disampaikan usulan Kenaikan Pangkat Pegawai Negeri Sipil di lingkungan Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum Republik Indonesia sebagai berikut:</p>
                    
                    <div className="grid grid-cols-[180px_10px_1fr] gap-x-3 ml-8">
                       <span>Nama Pegawai</span><span>:</span><span className="font-bold uppercase">{record.namaPegawai}</span>
                       <span>NIP</span><span>:</span><span>{record.nip}</span>
                       <span>Pangkat/Gol (Lama)</span><span>:</span><span className="uppercase">{record.dari}</span>
                       <span>Pangkat/Gol (Baru)</span><span>:</span><span className="font-bold uppercase text-blue-700">{record.menjadi}</span>
                       <span>TMT Usulan</span><span>:</span><span>{record.tmtUsulan}</span>
                       <span>Jenis Kenaikan</span><span>:</span><span className="uppercase font-bold">{record.jenisUsulan}</span>
                       <span>Unit Kerja</span><span>:</span><span className="uppercase leading-tight">{peg?.unitKerja}</span>
                    </div>

                    <p>Usulan ini didasarkan pada pertimbangan kelayakan administrasi, penilaian kinerja (SKP) periode terakhir dengan nilai Baik/Sangat Baik, serta telah memenuhi persyaratan perundang-undangan yang berlaku mengenai Manajemen Pegawai Negeri Sipil.</p>
                    
                    {record.jenisUsulan === 'ISTIMEWA' && (
                       <div className="p-4 border-2 border-amber-200 bg-amber-50 rounded text-[10pt] font-bold italic">
                          Catatan Khusus: Usulan bersifat Istimewa didasarkan pada pencapaian kinerja luar biasa yang telah mendapat verifikasi internal.
                       </div>
                    )}

                    <p>Demikian nota usulan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya guna proses penetapan Keputusan Kenaikan Pangkat oleh Pejabat Pembina Kepegawaian.</p>

                    <div className="mt-12 ml-[50%] flex flex-col items-start leading-tight">
                       <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                       <p className="font-bold uppercase mb-24 mt-2">Sekretaris Direktorat Jenderal,</p>
                       <p className="font-bold uppercase underline leading-none">Andrieansjah</p>
                       <p className="mt-1">NIP 197410061998031002</p>
                    </div>
                 </div>

                 <div className="mt-20 text-[8.5pt]">
                    <p className="font-bold">Lampiran Berkas Digital (Tersimpan di Cloud):</p>
                    <ol className="list-decimal ml-4 space-y-1">
                       <li>Fotokopi SK Pangkat Terakhir;</li>
                       <li>Fotokopi SK Jabatan (Jika ada);</li>
                       <li>Hasil Penilaian Kinerja (SKP) 2 Tahun Terakhir;</li>
                       <li>Surat Pernyataan Tidak Sedang Menjalani Hukuman Disiplin.</li>
                    </ol>
                 </div>
              </div>
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

export default KenaikanPangkatPage;
