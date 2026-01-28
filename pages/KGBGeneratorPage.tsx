
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchKGBFromSheets } from '../spreadsheetService';
import { Pegawai, KGB } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType } from 'docx';
// @ts-ignore
import saveAs from 'file-saver';

const KGBGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [kgbHistory, setKgbHistory] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [kgbToDelete, setKgbToDelete] = useState<KGB | null>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.04.04-',
    tglSurat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    kppn: 'Kepala Kantor Pelayanan Perbendaharaan Negara Jakarta V',
    lokasiKppn: 'Jakarta',
    nip: '',
    nama: '',
    pangkatGol: '',
    jabatan: '',
    kantor: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    gajiLamaNominal: 0,
    gajiLamaTeks: '',
    pejabatSK: 'Sekretaris Direktorat Jenderal Kekayaan Intelektual',
    tglSK: '',
    nomorSK: '',
    tmtSK: '',
    masaKerjaSK: '',
    gajiBaruNominal: 0,
    gajiBaruTeks: '',
    masaKerjaBaru: '',
    golRuangBaru: '',
    tmtBaru: '',
    penandatanganNip: '197410061998031002',
    penandatanganNama: 'Andrieansjah',
    penandatanganJabatan: 'Sekretaris Direktorat Jenderal Kekayaan Intelektual',
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, kRes] = await Promise.all([fetchPegawaiFromSheets(), fetchKGBFromSheets()]);
      setPegawaiList(pRes);
      setKgbHistory(kRes);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      setFormData({
        ...formData,
        nip: p.nip,
        nama: p.nama,
        pangkatGol: `${p.pangkat} - ${p.golRuang}`,
        jabatan: p.jabatan,
        golRuangBaru: `${p.pangkat} ${p.golRuang}`
      });
    }
  };

  const handleGenerate = async () => {
    setSyncing(true);
    const payload: KGB = {
      id: Date.now().toString(),
      nip: formData.nip,
      namaPegawai: formData.nama,
      tmtLama: formData.tmtSK,
      tmtBaru: formData.tmtBaru,
      gajiLama: Number(formData.gajiLamaNominal),
      gajiBaru: Number(formData.gajiBaruNominal),
      nomorSk: formData.nomor,
      tglSk: formData.tglSurat,
      status: 'Selesai'
    };
    try {
      await syncTableRemote('KGB', 'SAVE', payload);
      logActivity('CREATE', 'KGB', `Terbitkan KGB: ${formData.nama}`);
      setActiveView('preview');
      setShowSuccess(true);
      loadInitialData();
    } catch (e) { alert("Gagal sinkronisasi."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`KGB_${formData.nama.replace(/\s+/g, '_')}.pdf`);
  };

  const KopSurat = () => (
    <div className="flex flex-col items-center mb-6 text-black border-b-2 border-black pb-2 font-arial text-center">
      <div className="flex items-center w-full px-6">
        <img src={DEFAULT_LOGO} className="h-20 w-auto mr-6 object-contain" alt="Logo" crossOrigin="anonymous" style={{ filter: 'grayscale(100%)' }} />
        <div className="flex-1">
          <p className="text-[12pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[8pt] mt-1">Jalan H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Data Berhasil" />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl font-black text-gray-900 uppercase">Generator KGB</h3>
        </div>
        <div className="flex gap-2">
           {activeView === 'list' && <button onClick={() => setActiveView('editor')} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Terbitkan KGB Baru</button>}
        </div>
      </div>

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Kembali</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-200 py-10 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial p-[1.2cm_1.8cm]" style={{ width: '210mm', height: '330mm' }}>
                <KopSurat />
                <div className="flex justify-between text-[10pt] mb-6 text-black">
                   <div className="space-y-1">
                      <p>Nomor : {formData.nomor}</p>
                      <p>Hal : Kenaikan Gaji Berkala</p>
                   </div>
                   <div className="text-right"><p>{formData.lokasiKppn}, {formData.tglSurat}</p></div>
                </div>
                <div className="text-[10pt] mb-6 text-black">
                   <p>Yth. {formData.kppn}</p>
                </div>
                <div className="text-[10pt] space-y-1.5 mb-6 text-black">
                   <div className="grid grid-cols-[30px_200px_10px_1fr] leading-tight">
                      <span>1.</span><span>Nama</span><span>:</span><span className="font-bold uppercase">{formData.nama}</span>
                      <span>2.</span><span>NIP</span><span>:</span><span>{formData.nip}</span>
                      <span>3.</span><span>Pangkat / Golongan</span><span>:</span><span>{formData.pangkatGol}</span>
                      <span>4.</span><span>Gaji Pokok Baru</span><span>:</span><span className="font-bold">Rp. {Number(formData.gajiBaruNominal).toLocaleString('id-ID')}</span>
                      <span>5.</span><span>TMT</span><span>:</span><span>{formData.tmtBaru}</span>
                   </div>
                </div>
                <div className="flex justify-end items-start mt-24 text-black">
                   <div className="text-[10pt] text-center flex flex-col items-center">
                      <p className="font-bold mb-20 uppercase">{formData.penandatanganJabatan},</p>
                      <p className="font-bold text-[11pt] uppercase underline">{formData.penandatanganNama}</p>
                      <p>NIP {formData.penandatanganNip}</p>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default KGBGeneratorPage;
