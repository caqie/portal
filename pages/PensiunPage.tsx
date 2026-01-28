
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
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    instansiInduk: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    provinsi: 'DKI JAKARTA',
    kabKota: 'JAKARTA SELATAN',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL'
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const pRes = await fetchPegawaiFromSheets();
      setPegawaiList(pRes);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      setFormData({
        ...formData,
        nip: p.nip,
        namaPegawai: p.nama,
        bup: ret?.tmtPensiun.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) || '',
        unitKerjaHeader: p.unitKerja,
        tmtGolRuang: p.tmtPangkat || '',
        alamatSekarang: p.alamat || '',
      });
    }
  };

  const handleSave = () => {
    setActiveView('preview');
    setShowSuccess(true);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 210] });
    pdf.addImage(imgData, 'PNG', 0, 0, 330, 210);
    pdf.save(`DPCP_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <div className="flex justify-end no-print gap-3">
         <button onClick={() => setActiveView('editor')} className="px-6 py-2 bg-gray-100 rounded-xl uppercase text-[10px] font-black">Editor</button>
         <button onClick={() => navigate('/layanan')} className="px-6 py-2 bg-gray-100 rounded-xl uppercase text-[10px] font-black">Batal</button>
      </div>

      {activeView === 'editor' && (
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm max-w-4xl mx-auto space-y-8">
           <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.nip} onChange={handleASNSelect} />
           <div className="grid grid-cols-2 gap-4">
              <input type="text" className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs" placeholder="Gaji Pokok Terakhir" value={formData.gajiPokokTerakhir} onChange={e=>setFormData({...formData, gajiPokokTerakhir: e.target.value})} />
              <button onClick={handleSave} className="w-full bg-rose-600 text-white rounded-2xl font-black uppercase text-xs">Simpan DPCP</button>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="flex flex-col items-center">
           <button onClick={handleDownloadPdf} className="mb-6 px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase shadow-xl no-print">Download DPCP PDF (Landscape)</button>
           <div ref={pdfRef} className="bg-white text-black font-arial p-[1cm_1.2cm] border shadow-2xl" style={{ width: '330mm', minHeight: '210mm' }}>
              <div className="flex flex-col items-center text-center mb-8">
                 <img src={LOGO_GARUDA_URL} className="h-14 w-auto mb-2" style={{ filter: 'grayscale(100%)' }} />
                 <h1 className="text-[12pt] font-bold uppercase">BADAN KEPEGAWAIAN NEGARA</h1>
                 <h2 className="text-[10pt] font-bold uppercase">DATA PERORANGAN CALON PENERIMA PENSIUN (DPCP)</h2>
              </div>
              <div className="grid grid-cols-3 text-[8pt] border border-black p-3 text-black font-bold">
                 <p>INSTANSI : {formData.instansiInduk}</p>
                 <p>BUP : {formData.bup}</p>
                 <p>UNIT : {formData.unitKerjaHeader}</p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-20 text-[10pt] text-black">
                 <div>
                    <p className="font-bold border-b border-black pb-1 mb-4 uppercase">KETERANGAN PRIBADI</p>
                    <div className="grid grid-cols-[140px_10px_1fr] gap-y-2">
                       <span>NAMA</span><span>:</span><span className="font-bold uppercase">{formData.namaPegawai}</span>
                       <span>NIP</span><span>:</span><span>{formData.nip}</span>
                    </div>
                 </div>
                 <div className="text-center pt-20">
                    <p className="font-bold uppercase mb-24">{formData.pjbJabatan},</p>
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

export default PensiunPage;
