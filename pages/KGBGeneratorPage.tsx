
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

const terbilang = (n: number): string => {
  const kata = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (n < 12) return kata[n];
  if (n < 20) return kata[n - 10] + " Belas";
  if (n < 100) return kata[Math.floor(n / 10)] + " Puluh " + kata[n % 10];
  if (n < 200) return "Seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  if (n < 2000) return "Seribu " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  return n.toString();
};

const KGBGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [kgbHistory, setKgbHistory] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Deletion State
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
    penandatanganNama: 'Andrieansjah',
    penandatanganJabatan: 'Sekretaris Direktorat Jenderal Kekayaan Intelektual',
  });

  useEffect(() => {
    loadInitialData();
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, kRes] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchKGBFromSheets()
      ]);
      setPegawaiList(pRes);
      setKgbHistory(kRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => ({
      value: p.nip,
      label: p.nama,
      subLabel: `NIP. ${p.nip} - ${p.jabatan}`
    }))
  , [pegawaiList]);

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
      loadInitialData(); // Refresh history
    } catch (e) {
      alert("Gagal sinkronisasi data ke cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const confirmDeleteKGB = (item: KGB) => {
    setKgbToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleDeleteKGB = async () => {
    if (!kgbToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('KGB', 'DELETE', { id: kgbToDelete.id });
      if (success) {
        logActivity('DELETE', 'KGB', `Hapus arsip KGB: ${kgbToDelete.namaPegawai}`);
        setKgbHistory(prev => prev.filter(k => k.id !== kgbToDelete.id));
        setIsConfirmOpen(false);
        setKgbToDelete(null);
      }
    } catch (e) {
      alert("Gagal menghapus data di cloud.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`KGB_${formData.nama.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDownloadWord = () => {
    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 18709 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "KEMENTERIAN HUKUM REPUBLIK INDONESIA", bold: true, size: 24, font: "Arial" }),
              new TextRun({ text: "\nDIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL", bold: true, size: 24, font: "Arial" }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({ text: "Jalan H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940", size: 16, font: "Arial" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Nomor : ${formData.nomor}`, font: "Arial" }),
              new TextRun({ text: `\t\t\t\t\t\t${formData.lokasiKppn}, ${formData.tglSurat}`, font: "Arial" }),
            ]
          }),
          new Paragraph({ children: [new TextRun({ text: "Hal : Kenaikan Gaji Berkala", font: "Arial" })] }),
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Yth. ${formData.kppn}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: "di Tempat", font: "Arial" })] }),
          
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Sehubungan dengan telah terpenuhinya masa kerja dan syarat-syarat lainnya, kepada:", font: "Arial" })] }),
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `1. Nama : ${formData.nama}`, font: "Arial", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `2. NIP : ${formData.nip}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `3. Pangkat/Gol : ${formData.pangkatGol}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `4. Jabatan : ${formData.jabatan}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `5. Kantor : ${formData.kantor}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `6. Gaji Pokok Lama : Rp. ${Number(formData.gajiLamaNominal).toLocaleString('id-ID')} ${formData.gajiLamaTeks}`, font: "Arial" })] }),

          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Diberikan kenaikan gaji berkala hingga memperoleh:", font: "Arial" })] }),
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `7. Gaji Pokok Baru : Rp. ${Number(formData.gajiBaruNominal).toLocaleString('id-ID')} ${formData.gajiBaruTeks}`, font: "Arial", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `8. Masa Kerja : ${formData.masaKerjaBaru}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `9. TMT : ${formData.tmtBaru}`, font: "Arial" })] }),

          new Paragraph({ spacing: { before: 400, after: 800 }, children: [new TextRun({ text: "Demikian untuk dipergunakan sebagaimana mestinya.", font: "Arial" })] }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
                new TextRun({ text: "Sekretaris Direktorat Jenderal", bold: true, font: "Arial" }),
                new TextRun({ text: "\n\n\n\n\n", font: "Arial" }),
                new TextRun({ text: formData.penandatanganNama, bold: true, underline: { type: UnderlineType.SINGLE }, font: "Arial" }),
            ]
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `KGB_${formData.nama.replace(/\s+/g, '_')}.docx`);
    });
  };

  const KopSurat = () => (
    <div className="flex flex-col items-center mb-6 text-black border-b-2 border-black pb-2 font-arial text-center">
      <div className="flex items-center w-full px-6">
        <img src={customLogo} className="h-20 w-auto mr-6 object-contain" alt="Logo" crossOrigin="anonymous" />
        <div className="flex-1">
          <p className="text-[12pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[8pt] mt-1">Jalan H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940</p>
          <p className="text-[8pt]">Call Center: 152 | Laman: www.dgip.go.id | Pos-el: halodjki@dgip.go.id</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Data KGB Berhasil Disimpan" />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleDeleteKGB} 
        loading={syncing}
        message={`Hapus arsip dokumen KGB atas nama "${kgbToDelete?.namaPegawai}" secara permanen?`}
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Manajemen KGB Digital</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Penerbitan Surat Kenaikan Gaji Berkala Terautomasi</p>
          </div>
        </div>
        <div className="flex gap-2">
           {activeView !== 'list' && (
             <button onClick={() => setActiveView(activeView === 'preview' ? 'editor' : 'list')} className="px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-[10px] uppercase shadow-sm flex items-center gap-2 active:scale-95 transition-all">
                <i className="bi bi-arrow-left"></i> Kembali
             </button>
           )}
           {activeView === 'list' && canEdit && (
             <button onClick={() => setActiveView('editor')} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
                <i className="bi bi-file-earmark-plus"></i> Terbitkan KGB Baru
             </button>
           )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           {/* TABEL JADWAL KGB */}
           <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest flex items-center gap-2">
                    <i className="bi bi-calendar-event"></i> Jadwal Kenaikan (Eligible)
                 </h5>
                 <div className="mt-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {pegawaiList.slice(0, 8).map(p => (
                      <div key={p.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                         <p className="text-[11px] font-black text-gray-900 uppercase">{p.nama}</p>
                         <p className="text-[9px] text-gray-400 font-bold mt-1">GOL: {p.golRuang} • JAB: {p.jabatan}</p>
                         <button 
                           onClick={() => { handlePegawaiSelect(p.nip); setActiveView('editor'); }}
                           className="mt-3 w-full py-2 bg-white border border-gray-200 text-[9px] font-black uppercase rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all"
                         >
                           Pilih Pegawai
                         </button>
                      </div>
                    ))}
                    {pegawaiList.length === 0 && <div className="py-10 text-center text-gray-300 text-[10px] font-black uppercase">Memuat data...</div>}
                 </div>
              </div>
           </div>

           {/* TABEL ARSIP DOKUMEN KGB */}
           <div className="xl:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              <div className="px-10 py-6 border-b bg-gray-50/50">
                 <h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest flex items-center gap-2">
                    <i className="bi bi-archive"></i> Arsip Dokumen KGB Terbit
                 </h5>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 text-[8px] font-black uppercase border-b tracking-widest">
                       <tr>
                          <th className="px-10 py-5">Nama Pegawai</th>
                          <th className="px-4 py-5">Nomor SK</th>
                          <th className="px-4 py-5 text-center">Gaji Baru</th>
                          <th className="px-10 py-5 text-right">Opsi</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {kgbHistory.map(h => (
                         <tr key={h.id} className="hover:bg-blue-50/5 group transition-colors">
                            <td className="px-10 py-5">
                               <p className="text-[11px] font-black text-gray-950 uppercase">{h.namaPegawai}</p>
                               <p className="text-[9px] font-mono text-blue-600 font-bold">NIP. {h.nip}</p>
                            </td>
                            <td className="px-4 py-5">
                               <p className="text-[10px] font-bold text-gray-600 truncate max-w-[200px]">{h.nomorSk}</p>
                            </td>
                            <td className="px-4 py-5 text-center">
                               <span className="text-[10px] font-black text-emerald-600">Rp {h.gajiBaru.toLocaleString('id-ID')}</span>
                            </td>
                            <td className="px-10 py-5 text-right">
                               <div className="flex justify-end gap-2">
                                 <button onClick={() => { setFormData({...formData, ...h}); setActiveView('preview'); }} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all">Lihat</button>
                                 {(isSuperadmin || canEdit) && (
                                   <button onClick={() => confirmDeleteKGB(h)} className="h-8 w-8 bg-white text-rose-500 rounded-lg flex items-center justify-center border border-rose-100 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all">
                                     <i className="bi bi-trash-fill"></i>
                                   </button>
                                 )}
                               </div>
                            </td>
                         </tr>
                       ))}
                       {kgbHistory.length === 0 && !loading && (
                         <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Belum ada arsip terbit</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ) : activeView === 'editor' ? (
        <div className="max-w-6xl mx-auto space-y-8 animate-modalEnter">
           <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12">
              <div className="border-b pb-8 flex justify-between items-center">
                <div>
                  <h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter leading-none">Formulir KGB Digital</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3">Lengkapi formulir sesuai data SK terakhir dan Gaji baru</p>
                </div>
                <button onClick={() => setActiveView('list')} className="text-[10px] font-black text-rose-500 uppercase hover:underline">Batalkan</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-circle"></i> Data Identitas Pegawai</h5>
                    <SearchableSelect label="Pilih Pegawai" options={searchablePegawaiOptions} value={formData.nip} onChange={handlePegawaiSelect} />
                    <div className="grid grid-cols-1 gap-4">
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Nomor Surat KGB</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.nomor} onChange={e => setFormData({...formData, nomor: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Pangkat / Golongan</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.pangkatGol} onChange={e => setFormData({...formData, pangkatGol: e.target.value})} /></div>
                    </div>
                    
                    <h5 className="text-[10px] font-black text-amber-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2 mt-4"><i className="bi bi-file-earmark-lock-fill"></i> Data Gaji & SK Terakhir</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-full space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Gaji Pokok Lama (Rp)</label><input type="number" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.gajiLamaNominal} onChange={e => {
                         const val = Number(e.target.value);
                         setFormData({...formData, gajiLamaNominal: val, gajiLamaTeks: `(${terbilang(val)} Rupiah)`});
                       }} /></div>
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Nomor SK Terakhir</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.nomorSK} onChange={e => setFormData({...formData, nomorSK: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Tgl SK Terakhir</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.tglSK} onChange={e => setFormData({...formData, tglSK: e.target.value})} placeholder="28 Februari 2024" /></div>
                    </div>
                 </div>

                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-cash-stack"></i> Data Kenaikan Gaji Baru</h5>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Gaji Pokok Baru (Rp)</label><input type="number" className="w-full px-5 py-3 bg-emerald-50 border-emerald-100 border-2 rounded-xl text-[11px] font-black text-emerald-700" value={formData.gajiBaruNominal} onChange={e => {
                         const val = Number(e.target.value);
                         setFormData({...formData, gajiBaruNominal: val, gajiBaruTeks: `(${terbilang(val)} Rupiah)`});
                       }} /></div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">Masa Kerja Baru</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.masaKerjaBaru} onChange={e => setFormData({...formData, masaKerjaBaru: e.target.value})} placeholder="24 Tahun 0 Bulan" /></div>
                          <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-3">TMT KGB Baru</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-[11px] font-black" value={formData.tmtBaru} onChange={e => setFormData({...formData, tmtBaru: e.target.value})} placeholder="01 Maret 2024" /></div>
                       </div>
                    </div>

                    <h5 className="text-[10px] font-black text-gray-600 uppercase border-b pb-3 tracking-widest mt-4 flex items-center gap-2"><i className="bi bi-send-check"></i> Distribusi & Penandatangan</h5>
                    <div className="space-y-4">
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Tujuan KPPN</label><input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold" value={formData.kppn} onChange={e => setFormData({...formData, kppn: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3">Pejabat Penandatangan</label><input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold" value={formData.penandatanganNama} onChange={e => setFormData({...formData, penandatanganNama: e.target.value})} /></div>
                    </div>
                 </div>
              </div>

              <div className="pt-10 border-t flex justify-center">
                 <button 
                  onClick={handleGenerate} 
                  disabled={!formData.nip || syncing}
                  className="px-24 py-5 bg-blue-600 text-white rounded-[2.5rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all disabled:bg-gray-300"
                 >
                   {syncing ? 'Memproses Cloud...' : 'Terbitkan Dokumen KGB'}
                 </button>
              </div>
           </div>
        </div>
      ) : (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-between items-center no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Kembali ke Editor</button>
              <div className="flex gap-3">
                <button onClick={handleDownloadWord} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95"><i className="bi bi-file-earmark-word-fill"></i> Word (.docx)</button>
                <button onClick={handleDownloadPdf} className="px-8 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
              </div>
           </div>
           
           <div className="bg-gray-200 py-10 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial relative" style={{ width: '210mm', height: '330mm', padding: '1.2cm 1.8cm 1cm 1.8cm' }}>
                <KopSurat />
                
                <div className="flex justify-between text-[10pt] mb-6">
                   <div className="space-y-1">
                      <p>Nomor : {formData.nomor}</p>
                      <p>Sifat : Biasa</p>
                      <p>Lampiran : -</p>
                      <p>Hal : Kenaikan Gaji Berkala</p>
                      <p className="pl-8 font-bold">Sdri. {formData.nama}</p>
                   </div>
                   <div className="text-right">
                      <p>{formData.lokasiKppn}, {formData.tglSurat}</p>
                   </div>
                </div>

                <div className="text-[10pt] mb-6 leading-relaxed">
                   <p>Yth. {formData.kppn}</p>
                   <p>di {formData.lokasiKppn}</p>
                </div>

                <div className="text-[10pt] text-justify mb-4">
                   <p>Sehubungan dengan telah terpenuhinya masa kerja dan syarat-syarat lainnya, kepada:</p>
                </div>

                <div className="text-[10pt] space-y-1.5 mb-6">
                   <div className="grid grid-cols-[30px_200px_10px_1fr] leading-tight">
                      <span>1.</span><span>Nama</span><span>:</span><span className="font-bold uppercase">{formData.nama}</span>
                      <span>2.</span><span>NIP</span><span>:</span><span>{formData.nip}</span>
                      <span>3.</span><span>Pangkat / Golongan ruang</span><span>:</span><span>{formData.pangkatGol}</span>
                      <span>4.</span><span>Jabatan</span><span>:</span><span>{formData.jabatan}</span>
                      <span>5.</span><span>Kantor / Tempat</span><span>:</span><span>{formData.kantor}</span>
                      <span>6.</span><span>Gaji Pokok Lama</span><span>:</span><span>Rp. {Number(formData.gajiLamaNominal).toLocaleString('id-ID')} {formData.gajiLamaTeks}</span>
                   </div>
                </div>

                <div className="text-[10pt] text-justify mb-4">
                   <p>atas dasar Surat Keputusan terakhir tentang gaji/pangkat yang ditetapkan:</p>
                </div>

                <div className="text-[10pt] space-y-1.5 mb-6 ml-4">
                   <div className="grid grid-cols-[30px_200px_10px_1fr] leading-tight">
                      <span>a.</span><span>Oleh pejabat</span><span>:</span><span>{formData.pejabatSK}</span>
                      <span>b.</span><span>Tanggal</span><span>:</span><span>{formData.tglSK}</span>
                      <span>c.</span><span>Nomor</span><span>:</span><span>{formData.nomorSK}</span>
                      <span>d.</span><span>Tanggal mulai berlakunya gaji tersebut</span><span>:</span><span>{formData.tmtSK}</span>
                      <span>e.</span><span>Masa kerja golongan pada tanggal tersebut</span><span>:</span><span>{formData.masaKerjaSK}</span>
                   </div>
                </div>

                <div className="text-[10pt] text-justify mb-4">
                   <p>Diberikan kenaikan gaji berkala hingga memperoleh:</p>
                </div>

                <div className="text-[10pt] space-y-1.5 mb-6">
                   <div className="grid grid-cols-[30px_200px_10px_1fr] leading-tight">
                      <span>7.</span><span>Gaji Pokok Baru</span><span>:</span><span className="font-bold">Rp. {Number(formData.gajiBaruNominal).toLocaleString('id-ID')} {formData.gajiBaruTeks}</span>
                      <span>8.</span><span>Berdasarkan masa kerja</span><span>:</span><span>{formData.masaKerjaBaru}</span>
                      <span>9.</span><span>Dalam golongan ruang</span><span>:</span><span>{formData.golRuangBaru}</span>
                      <span>10.</span><span>Terhitung mulai tanggal</span><span>:</span><span>{formData.tmtBaru}</span>
                   </div>
                </div>

                <div className="text-[10pt] text-justify leading-relaxed mb-10">
                   <p>Diharapkan agar sesuai dengan Peraturan Pemerintah RI Nomor 5 Tahun 2024 kepada pegawai tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokok baru.</p>
                </div>

                <div className="flex justify-between items-start mt-12">
                   <div className="h-28 w-28 bg-gray-50 flex items-center justify-center border-2 border-gray-100 rounded-lg">
                      <i className="bi bi-qr-code text-6xl text-gray-300"></i>
                   </div>
                   <div className="text-[10pt] text-center flex flex-col items-center">
                      <p className="font-bold mb-1">Sekretaris Direktorat Jenderal</p>
                      <p className="font-bold mb-20 uppercase">Kekayaan Intelektual,</p>
                      <div className="relative mb-2">
                        <div className="px-6 py-2 border-2 border-blue-600 text-blue-600 rounded-full font-black text-[8pt] flex items-center gap-2">
                           <i className="bi bi-patch-check-fill"></i>
                           KUMHAMPASTI
                        </div>
                      </div>
                      <p className="text-[8pt] text-gray-400 italic mb-2">Ditandatangani secara elektronik oleh :</p>
                      <p className="font-bold text-[11pt] uppercase underline">{formData.penandatanganNama}</p>
                   </div>
                </div>

                <div className="mt-16 text-[8.5pt]">
                   <p className="font-bold">Tembusan :</p>
                   <ol className="list-decimal ml-4 space-y-0.5">
                      <li>Kepala BKN, u.p. Deputi Bidang Informasi Kepegawaian;</li>
                      <li>Kepala Biro SDM Kementerian Hukum RI;</li>
                      <li>Pembuat Daftar Gaji Direktorat Jenderal Kekayaan Intelektual;</li>
                      <li>Pegawai yang bersangkutan.</li>
                   </ol>
                </div>

                <div className="absolute bottom-6 left-8 right-8 text-center text-[7pt] text-gray-400 border-t pt-2">
                   Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Sertifikasi Elektronik (BSrE), BSSN.
                </div>
              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default KGBGeneratorPage;
