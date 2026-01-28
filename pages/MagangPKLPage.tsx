
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchMagangPKLFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, MagangPKL } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const MagangPKLPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity } = useAuth();
  const [pesertaList, setPesertaList] = useState<MagangPKL[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<MagangPKL>>({
    jenis: 'MAGANG',
    status: 'Proses',
    pjbNama: 'Andrieansjah',
    pjbNip: '197410061998031002',
    pjbJabatan: 'Sekretaris Direktorat Jenderal'
  });

  useEffect(() => {
    const load = async () => {
      const [p, m] = await Promise.all([fetchPegawaiFromSheets(), fetchMagangPKLFromSheets()]);
      setPegawaiList(p);
      setPesertaList(m);
    };
    load();
  }, []);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2 });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`Magang_DJKI_${formData.nama}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <div className="flex justify-between items-center no-print">
         <h3 className="text-2xl font-black text-gray-900 uppercase">Magang & PKL</h3>
         <div className="flex gap-2">
            <button onClick={() => setActiveView('editor')} className="px-6 py-2 bg-blue-600 text-white rounded-xl uppercase text-[10px] font-black">Register Baru</button>
            <button onClick={() => navigate('/layanan')} className="px-6 py-2 bg-gray-200 rounded-xl uppercase text-[10px] font-black">Batal</button>
         </div>
      </div>

      {activeView === 'editor' && (
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 max-w-4xl mx-auto space-y-6">
           <input type="text" className="w-full p-4 border-2 rounded-2xl font-black uppercase text-xs" placeholder="Nama Peserta" value={formData.nama} onChange={e=>setFormData({...formData, nama: e.target.value})} />
           <button onClick={() => setActiveView('preview')} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs">Pratinjau Dokumen</button>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="flex flex-col items-center">
           <button onClick={handleDownloadPdf} className="mb-6 px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase shadow-xl no-print">Download PDF (F4)</button>
           <div ref={pdfRef} className="bg-white text-black font-arial p-[1.5cm_2cm] border shadow-2xl" style={{ width: '210mm', minHeight: '330mm' }}>
              <div className="flex flex-col items-center text-center mb-8 border-b-2 border-black pb-4 text-black">
                 <img src={DEFAULT_LOGO} className="h-16 w-auto mb-2" style={{ filter: 'grayscale(100%)' }} />
                 <p className="text-[11pt] font-bold leading-tight uppercase">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                 <p className="text-[11pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
              </div>
              <div className="text-center mb-10 text-black">
                 <h1 className="text-[14pt] font-bold uppercase underline">SURAT KETERANGAN MAGANG</h1>
              </div>
              <div className="text-[11pt] space-y-6 text-justify leading-relaxed text-black">
                 <p>Diterangkan bahwa <span className="font-bold uppercase">{formData.nama}</span> telah melaksanakan program magang di lingkungan Direktorat Jenderal Kekayaan Intelektual.</p>
                 <div className="mt-20 ml-[50%] flex flex-col items-start leading-tight text-black">
                    <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                    <p className="font-bold uppercase mb-24 mt-2">{formData.pjbJabatan},</p>
                    <p className="font-bold uppercase underline">{formData.pjbNama}</p>
                    <p>NIP {formData.pjbNip}</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MagangPKLPage;
