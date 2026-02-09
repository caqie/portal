
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchKenaikanFromSheets } from '../spreadsheetService';
import { Pegawai, KenaikanKarir } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, PANGKAT_MAP, DEFAULT_TEMPLATE_LOGO } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const KenaikanPangkatPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin, user: currentUser } = useAuth();
  
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [history, setHistory] = useState<KenaikanKarir[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedKenaikan, setSelectedKenaikan] = useState<any | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KenaikanKarir | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    jenisUsulan: 'REGULER',
    dari: '',
    menjadi: '',
    tmtUsulan: '2025-04-01',
    status: 'Proses',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    nomorNota: 'HKI.1-KP.04.01-',
    keterangan: 'Memenuhi Syarat Kenaikan Pangkat.'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, kRes] = await Promise.all([fetchPegawaiFromSheets(), fetchKenaikanFromSheets()]);
      setPegawaiList(pRes);
      setHistory(kRes || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const RANKS = Object.keys(PANGKAT_MAP);
      const currentIdx = RANKS.indexOf(p.golRuang || 'III/a');
      const nextRank = currentIdx !== -1 && currentIdx < RANKS.length - 1 ? RANKS[currentIdx + 1] : p.golRuang;
      
      setFormData({ 
        ...formData, 
        nip: p.nip, 
        namaPegawai: p.nama, 
        dari: `${p.pangkat} (${p.golRuang})`, 
        menjadi: `${PANGKAT_MAP[nextRank || '']} (${nextRank})`,
        jabatan: p.jabatan,
        unitKerja: p.unitKerja
      });
    }
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.menjadi) return alert("Lengkapi data usulan.");
    setSyncing(true);
    const newRecord: KenaikanKarir = { 
      ...formData as any, 
      id: formData.id || `KP-${formData.nip}-${Date.now()}`,
      status: formData.status || 'Proses'
    };
    try {
      const ok = await syncTableRemote('KENAIKAN', 'SAVE', newRecord);
      if (ok) { 
        logActivity('CREATE', 'Kenaikan Pangkat', `Buat Usulan KP: ${formData.namaPegawai}`);
        setSelectedKenaikan(newRecord); 
        setActiveView('preview'); 
        setShowSuccess(true); 
        loadData(); 
      }
    } catch (e) { alert("Gagal sinkronisasi data."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
      pdf.save(`Nota_Usulan_KP_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { alert("Gagal cetak PDF."); } finally { setSyncing(false); }
  };

  const record = selectedKenaikan || formData;
  const pSubjek = pegawaiList.find(p => p.nip === record.nip);
  const pPenandatangan = pegawaiList.find(p => p.nip === record.pjbNip);

  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";
  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-bold uppercase focus:border-blue-600 outline-none transition-all text-gray-950";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if(itemToDelete) {
           setSyncing(true);
           const ok = await syncTableRemote('KENAIKAN', 'DELETE', { id: itemToDelete.id });
           if(ok) { loadData(); setIsConfirmOpen(false); }
           setSyncing(false);
         }
      }} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
           <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Manajemen Kenaikan Pangkat</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
               <i className="bi bi-award-fill text-blue-600"></i> Usulan Kenaikan Pangkat & Penyesuaian Ijazah
            </p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-[#111827] text-white shadow-lg' : 'text-gray-400'}`}>Arsip Usulan</button>
           {canEdit && (
             <button onClick={() => { setFormData({...formData, id: undefined, nip: ''}); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-[#111827] text-white shadow-lg' : 'text-gray-400'}`}>Buat Usulan</button>
           )}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Pegawai & NIP</th><th className="px-4 py-5">Usulan Kenaikan</th><th className="px-4 py-5 text-center">TMT Usulan</th><th className="px-4 py-5 text-center">Status</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {history.map(h => (
                   <tr key={h.id} className="hover:bg-blue-50/5 group transition-all">
                      <td className="px-10 py-5">
                         <p className="text-[11px] font-black text-gray-950 uppercase mb-1">{h.namaPegawai}</p>
                         <p className="text-[9px] font-mono text-blue-600 font-bold uppercase">NIP. {h.nip}</p>
                      </td>
                      <td className="px-4 py-5">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{h.dari}</span>
                            <i className="bi bi-arrow-right text-gray-300"></i>
                            <span className="text-[10px] font-black text-blue-600 uppercase">{h.menjadi}</span>
                         </div>
                         <p className="text-[8px] font-black text-gray-300 uppercase mt-1">Jenis: {h.jenisUsulan}</p>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-[11px] text-gray-900">{h.tmtUsulan}</td>
                      <td className="px-4 py-5 text-center">
                         <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${h.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{h.status}</span>
                      </td>
                      <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setSelectedKenaikan(h); setFormData(h); setActiveView('preview'); }} className="h-9 px-5 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Lihat Nota</button>
                            {isSuperadmin && (
                              <button onClick={() => { setItemToDelete(h); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="bi bi-trash-fill"></i></button>
                            )}
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-5xl mx-auto bg-white p-10 md:p-16 rounded-[4rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           <SearchableSelect label="1. Pilih Pegawai Subjek Usulan" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.golRuang} (${p.jabatan})`}))} value={formData.nip} onChange={handleASNSelect} />
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">2. Detail Kenaikan</h5>
                 <div><label className={labelClass}>Jenis Usulan KP</label><select className={inputClass} value={formData.jenisUsulan} onChange={e=>setFormData({...formData, jenisUsulan: e.target.value})}><option value="REGULER">REGULER (4 TAHUN)</option><option value="PILIHAN / JABATAN">PILIHAN (JABATAN STRUKTURAL / FUNGSIONAL)</option><option value="PENYESUAIAN IJAZAH">PENYESUAIAN IJAZAH</option><option value="PRESTASI LUAR BIASA">PRESTASI LUAR BIASA</option></select></div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>Pangkat Saat Ini</label><input readOnly className={`${inputClass} bg-gray-100`} value={formData.dari} /></div>
                    <div><label className={labelClass}>Pangkat Tujuan</label><input className={inputClass} value={formData.menjadi} onChange={e=>setFormData({...formData, menjadi: e.target.value})} /></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>TMT Usulan</label><input type="date" className={inputClass} value={formData.tmtUsulan} onChange={e=>setFormData({...formData, tmtUsulan: e.target.value})} /></div>
                    <div><label className={labelClass}>Nomor Nota Dinas</label><input className={inputClass} value={formData.nomorNota} onChange={e=>setFormData({...formData, nomorNota: e.target.value})} /></div>
                 </div>
              </div>
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">3. Otorisasi & Validasi</h5>
                 <SearchableSelect label="Pejabat Penandaatangan Nota" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: p.jabatan}))} value={formData.pjbNip} onChange={v=>{ const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, pjbNip:v, pjbNama:p.nama, pjbJabatan:p.jabatan}); }} />
                 <div><label className={labelClass}>Catatan Tim Verifikasi</label><textarea rows={3} className={`${inputClass} resize-none normal-case h-28`} value={formData.keterangan} onChange={e=>setFormData({...formData, keterangan: e.target.value})} /></div>
                 <div><label className={labelClass}>Status Usulan</label><select className={inputClass} value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}><option value="Proses">DALAM PROSES VERIFIKASI</option><option value="Selesai">SUDAH DITERBITKAN SK</option><option value="Ditolak">BERKAS TMS (TIDAK MEMENUHI SYARAT)</option></select></div>
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                 {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                 <span>Simpan & Generate Nota Usulan</span>
              </button>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Data</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-300 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2.2cm] font-arial text-black" style={{ width: '210mm', minHeight: '330mm' }}>
                 {/* KOP SURAT */}
                 <div className="flex items-center border-b-[3pt] border-black pb-4 mb-8">
                    <img src={LOGO_PENGAYOMAN_URL} className="h-20 mr-6" crossOrigin="anonymous" />
                    <div className="text-center flex-1">
                       <p className="text-[14pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                       <p className="text-[13pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                       <p className="text-[9pt] font-normal leading-tight mt-1">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                    </div>
                 </div>

                 <div className="text-center mb-10">
                    <h1 className="text-[14pt] font-bold uppercase underline leading-tight">NOTA USULAN KENAIKAN PANGKAT</h1>
                    <p className="text-[11pt] font-bold mt-1">NOMOR : {record.nomorNota}</p>
                 </div>

                 <div className="text-[11pt] space-y-8 text-justify leading-relaxed">
                    <p>Bersama ini disampaikan usulan Kenaikan Pangkat bagi Pegawai Negeri Sipil di lingkungan Direktorat Jenderal Kekayaan Intelektual, dengan data sebagai berikut:</p>
                    
                    <div className="ml-8 grid grid-cols-[180px_10px_1fr] gap-y-2">
                       <span>Nama Lengkap</span><span>:</span><span className="font-bold uppercase underline">{record.namaPegawai}</span>
                       <span>NIP</span><span>:</span><span className="font-bold">{record.nip}</span>
                       <span>Pangkat / Golongan Lama</span><span>:</span><span className="uppercase">{record.dari}</span>
                       <span>Pangkat / Golongan Baru</span><span>:</span><span className="font-bold uppercase text-blue-700">{record.menjadi}</span>
                       <span>Jabatan</span><span>:</span><span className="uppercase">{record.jabatan}</span>
                       <span>Unit Kerja</span><span>:</span><span className="uppercase">{record.unitKerja}</span>
                       <span>TMT Usulan</span><span>:</span><span className="font-bold">{new Date(record.tmtUsulan).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>
                       <span>Jenis Usulan</span><span>:</span><span className="uppercase">{record.jenisUsulan}</span>
                    </div>

                    <div className="p-6 bg-gray-50 border-2 border-black rounded-xl">
                       <p className="font-bold mb-2 uppercase text-[10pt]">Catatan Verifikasi:</p>
                       <p className="italic text-[10pt]">{record.keterangan || '-'}</p>
                    </div>

                    <p>Demikian usulan ini dibuat untuk dapat diproses lebih lanjut sesuai dengan ketentuan peraturan perundang-undangan yang berlaku.</p>

                    <div className="mt-20 ml-[50%] text-center leading-tight">
                       <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                       <p className="font-bold uppercase mb-28 mt-4 leading-tight">{record.pjbJabatan},</p>
                       <p className="font-bold uppercase underline leading-none">{record.pjbNama}</p>
                       <p className="mt-1">NIP {record.pjbNip}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default KenaikanPangkatPage;
