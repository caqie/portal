
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchPelantikanFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai } from '../types';
import { useAuth } from '../AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import SuccessModal from '../components/SuccessModal';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

const PelantikanGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [docType, setDocType] = useState<'BA' | 'PAKTA'>('BA');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.03.04-',
    hari: 'Senin',
    tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tempat: 'Aula Direktorat Jenderal Kekayaan Intelektual, Jakarta',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    asnNip: '', asnNama: '', asnPangkat: '', asnGolRuang: '', asnJabatan: ''
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const p = await fetchPegawaiFromSheets();
      setPegawaiList(p);
      setLoading(false);
    };
    load();
  }, []);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) setFormData({ ...formData, asnNip: p.nip, asnNama: p.nama, asnPangkat: p.pangkat, asnGolRuang: p.golRuang, asnJabatan: p.jabatan });
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`${docType}_Pelantikan_${formData.asnNama.replace(/\s+/g, '_')}.pdf`);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl font-black text-gray-900 uppercase">BA Pelantikan & Pakta Integritas</h3>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setDocType('BA')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${docType === 'BA' ? 'bg-[#111827] text-white' : 'text-gray-400'}`}>Berita Acara</button>
           <button onClick={() => setDocType('PAKTA')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${docType === 'PAKTA' ? 'bg-[#111827] text-white' : 'text-gray-400'}`}>Pakta Integritas</button>
        </div>
      </div>

      {activeView === 'editor' ? (
        <div className="max-w-4xl mx-auto bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10 animate-modalEnter">
           <SearchableSelect label="Pilih Pegawai Yang Dilantik" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}`}))} value={formData.asnNip} onChange={handleASNSelect} />
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                 <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">Detail Pelaksanaan</h5>
                 <div className="space-y-1"><label className={labelClass}>Nomor BA/Dokumen</label><input type="text" className={inputClass} value={formData.nomor} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Hari Pelantikan</label><input type="text" className={inputClass} value={formData.hari} onChange={e=>setFormData({...formData, hari: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Tempat Pelaksanaan</label><input type="text" className={inputClass} value={formData.tempat} onChange={e=>setFormData({...formData, tempat: e.target.value})} /></div>
              </div>
              <div className="space-y-4">
                 <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">Data Saksi & Penilai</h5>
                 <SearchableSelect label="Pejabat Pengambil Sumpah" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.pjbNip} onChange={v=>{const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, pjbNip:v, pjbNama:p.nama, pjbJabatan:p.jabatan})}} />
              </div>
           </div>
           <div className="pt-10 border-t flex justify-center">
              <button onClick={() => setActiveView('preview')} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Pratinjau Dokumen F4</button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-10">
           <div className="flex gap-4 no-print">
              <button onClick={() => setActiveView('editor')} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-[11px]">Kembali</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-300 py-10 rounded-[4rem] overflow-x-auto w-full flex justify-center no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[2cm_2.2cm] font-arial text-black" style={{ width: '210mm', minHeight: '330mm' }}>
                 <div className="flex flex-col items-center text-center mb-14">
                    <img src={LOGO_GARUDA_URL} className="h-24 w-auto mb-8 grayscale" crossOrigin="anonymous" />
                    {docType === 'BA' ? (
                       <>
                         <h1 className="text-[14pt] font-bold uppercase underline leading-tight">BERITA ACARA PENGAMBILAN SUMPAH/JANJI JABATAN</h1>
                         <p className="text-[12pt] font-bold mt-2">NOMOR : {formData.nomor}</p>
                       </>
                    ) : (
                       <h1 className="text-[16pt] font-black uppercase underline leading-tight">PAKTA INTEGRITAS</h1>
                    )}
                 </div>

                 {docType === 'BA' ? (
                    <div className="text-[11.5pt] text-justify space-y-6 text-black leading-[2]">
                       <p>Pada hari ini <span className="font-bold">{formData.hari}</span> tanggal <span className="font-bold">{formData.tanggal}</span> bertempat di <span className="font-bold">{formData.tempat}</span>, saya:</p>
                       <div className="grid grid-cols-[140px_10px_1fr] ml-10 leading-tight gap-y-1">
                          <span className="font-bold">NAMA</span><span>:</span><span className="font-bold uppercase">{formData.pjbNama}</span>
                          <span>NIP</span><span>:</span><span>{formData.pjbNip}</span>
                          <span>JABATAN</span><span>:</span><span className="uppercase">{formData.pjbJabatan}</span>
                       </div>
                       <p>Telah mengambil Sumpah Jabatan / Janji Jabatan dari:</p>
                       <div className="grid grid-cols-[140px_10px_1fr] ml-10 leading-tight gap-y-1">
                          <span className="font-bold">NAMA</span><span>:</span><span className="font-bold uppercase underline">{formData.asnNama}</span>
                          <span>NIP</span><span>:</span><span>{formData.asnNip}</span>
                          <span>JABATAN</span><span>:</span><span className="uppercase">{formData.asnJabatan}</span>
                       </div>
                       <p>Sumpah/Janji Jabatan ini dilakukan berdasarkan Keputusan Menteri Hukum Republik Indonesia.</p>
                       <div className="mt-14 ml-[50%] text-center flex flex-col items-center">
                          <p className="mb-28 uppercase font-bold">Pejabat Pengambil Sumpah,</p>
                          <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                          <p className="mt-1">NIP {formData.pjbNip}</p>
                       </div>
                    </div>
                 ) : (
                    <div className="text-[12pt] text-justify space-y-8 text-black leading-relaxed">
                       <p>Saya yang bertanda tangan di bawah ini:</p>
                       <div className="grid grid-cols-[140px_10px_1fr] ml-10 leading-tight gap-y-2">
                          <span className="font-bold">NAMA</span><span>:</span><span className="font-bold uppercase">{formData.asnNama}</span>
                          <span>NIP</span><span>:</span><span>{formData.asnNip}</span>
                          <span>JABATAN</span><span>:</span><span className="uppercase">{formData.asnJabatan}</span>
                       </div>
                       <p>Menyatakan dengan sesungguhnya bahwa saya akan menjalankan tugas dan tanggung jawab jabatan saya dengan penuh integritas, profesionalisme, dan menjunjung tinggi nilai-nilai organisasi Kementerian Hukum Republik Indonesia.</p>
                       <p>Apabila saya melanggar hal-hal tersebut di atas, saya bersedia menerima sanksi sesuai dengan peraturan perundang-undangan yang berlaku.</p>
                       <div className="mt-14 ml-[50%] text-center flex flex-col items-center">
                          <p>Jakarta, {formData.tanggal}</p>
                          <p className="mb-28 uppercase font-bold mt-2">Pembuat Pernyataan,</p>
                          <p className="font-bold uppercase underline leading-none">{formData.asnNama}</p>
                          <p className="mt-1">NIP {formData.asnNip}</p>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PelantikanGeneratorPage;
