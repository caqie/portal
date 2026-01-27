
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchSPMTSPPFromSheets } from '../spreadsheetService';
import { Pegawai, SpmtSppRecord } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName, DEFAULT_LOGO } from '../constants';
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

const SpmtSppPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [history, setHistory] = useState<SpmtSppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SpmtSppRecord | null>(null);
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Deletion State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SpmtSppRecord | null>(null);

  const [formData, setFormData] = useState<Partial<SpmtSppRecord>>({
    type: 'SPP',
    nomor: '',
    pejabatNip: '',
    pegawaiNip: '',
    nomorSK: '',
    tentangSK: '',
    tanggalSK: '',
    jabatanBaru: '',
    unitKerja: UNIT_KERJA[0],
    tanggalLantikAtauSpmt: '',
    tanggalSppAtauSpmt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tempatTandaTangan: 'Jakarta',
    signatureLabel: ''
  });

  useEffect(() => {
    loadData();
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchSPMTSPPFromSheets()
      ]);
      setPegawaiList(pRes);
      setHistory(sRes);
    } catch (err) { 
      console.error(err);
    } finally { setLoading(false); }
  };

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      setFormData(prev => ({ 
        ...prev, 
        pegawaiNip: nip,
        jabatanBaru: p.jabatan,
        unitKerja: normalizeUnitName(p.unitKerja)
      }));
    }
  };

  const handlePejabatSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      let label = 'Sekretaris Direktorat Jenderal';
      if (formData.type === 'SPMT') label = 'Yang membuat pernyataan,\nSekretaris,';
      else if (p.jabatan?.toUpperCase().includes('DIREKTUR JENDERAL')) label = 'Direktur Jenderal';
      else if (p.jabatan?.toUpperCase().includes('DIREKTUR')) label = p.jabatan;
      
      setFormData(prev => ({ 
        ...prev, 
        pejabatNip: nip,
        signatureLabel: label 
      }));
    }
  };

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => ({
      value: p.nip,
      label: p.nama,
      subLabel: `NIP. ${p.nip} - ${p.jabatan}`
    }))
  , [pegawaiList]);

  const handleSave = async () => {
    if (!formData.pegawaiNip || !formData.pejabatNip || !formData.nomor) {
      return alert("Harap lengkapi Nomor Dokumen, Pejabat, dan Pegawai.");
    }
    setSyncing(true);
    const newRecord: SpmtSppRecord = { ...formData as SpmtSppRecord, id: Date.now().toString() };
    
    try {
      const success = await syncTableRemote('SPMT_SPP', 'SAVE', newRecord);
      if (success) {
        logActivity('CREATE', 'SPMT/SPP', `Buat dokumen ${newRecord.type}: ${newRecord.nomor}`);
        setSelectedRecord(newRecord);
        setActiveView('preview');
        setShowSuccess(true);
        loadData();
      }
    } catch (e) {
      alert("Gagal sinkronisasi.");
    } finally { setSyncing(false); }
  };

  const confirmDelete = (item: SpmtSppRecord) => {
    setItemToDelete(item);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      const success = await syncTableRemote('SPMT_SPP', 'DELETE', { id: itemToDelete.id });
      if (success) {
        logActivity('DELETE', 'SPMT/SPP', `Hapus arsip ${itemToDelete.type}: ${itemToDelete.nomor}`);
        setHistory(prev => prev.filter(h => h.id !== itemToDelete.id));
        setIsConfirmOpen(false);
        setItemToDelete(null);
      }
    } catch (e) { alert("Gagal menghapus."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`${selectedRecord?.type}_${selectedRecord?.pegawaiNip}_Official.pdf`);
  };

  const handleDownloadWord = () => {
    if (!selectedRecord) return;
    const pjb = pegawaiList.find(p => p.nip === selectedRecord.pejabatNip);
    const peg = pegawaiList.find(p => p.nip === selectedRecord.pegawaiNip);

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 18709 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "KEMENTERIAN HUKUM REPUBLIK INDONESIA", bold: true, size: 26, font: "Arial" }),
              new TextRun({ text: "\nDIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL", bold: true, size: 26, font: "Arial" }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({ text: "Jl. H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940", size: 18, font: "Arial" }),
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: selectedRecord.type === 'SPP' ? 'SURAT PERNYATAAN PELANTIKAN' : 'SURAT PERNYATAAN MELAKSANAKAN TUGAS', bold: true, underline: { type: UnderlineType.SINGLE }, size: 28, font: "Arial" }),
              new TextRun({ text: `\nNOMOR : ${selectedRecord.nomor}`, bold: true, size: 24, font: "Arial" }),
            ]
          }),
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Yang bertanda tangan di bawah ini :", font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `Nama\t\t\t: ${pjb?.nama || '-'}`, font: "Arial", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `NIP\t\t\t\t: ${pjb?.nip || '-'}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `Jabatan\t\t\t: ${pjb?.jabatan || '-'}`, font: "Arial" })] }),
          
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "menyatakan dengan sesungguhnya, bahwa yang tersebut di bawah ini :", font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `Nama\t\t\t: ${peg?.nama || '-'}`, font: "Arial", bold: true })] }),
          new Paragraph({ children: [new TextRun({ text: `NIP\t\t\t\t: ${peg?.nip || '-'}`, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: `Jabatan Baru\t\t: ${selectedRecord.jabatanBaru || '-'}`, font: "Arial" })] }),

          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({ text: `Berdasarkan Surat Keputusan Menteri Hukum Republik Indonesia Nomor ${selectedRecord.nomorSK} tanggal ${selectedRecord.tanggalSK}, telah ${selectedRecord.type === 'SPP' ? 'dilantik' : 'nyata melaksanakan tugas'} pada tanggal ${selectedRecord.tanggalLantikAtauSpmt}.`, font: "Arial" }),
            ]
          }),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 800 },
            children: [
                new TextRun({ text: `${selectedRecord.tempatTandaTangan}, ${selectedRecord.tanggalSppAtauSpmt}`, font: "Arial" }),
                new TextRun({ text: `\n${selectedRecord.signatureLabel}\n\n\n\n\n`, bold: true, font: "Arial" }),
                new TextRun({ text: pjb?.nama || '-', bold: true, underline: { type: UnderlineType.SINGLE }, font: "Arial" }),
                new TextRun({ text: `\nNIP ${pjb?.nip || '-'}`, font: "Arial" }),
            ]
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${selectedRecord.type}_${selectedRecord.pegawaiNip}.docx`);
    });
  };

  const TemplateKop = () => (
    <div className="flex flex-col items-center mb-8 text-black border-b-[3pt] border-black pb-2 font-arial">
      <div className="flex items-center w-full px-6">
        <img src={customLogo} className="h-20 w-auto mr-6 object-contain" alt="Logo" crossOrigin="anonymous" />
        <div className="flex-1 text-center">
          <p className="text-[13pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[13pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[9pt] mt-1">Jl. H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940</p>
          <p className="text-[9pt]">Call Center : 152 | Laman : www.dgip.go.id | Pos-el : halodjki@dgip.go.id</p>
        </div>
      </div>
    </div>
  );

  const pejabat = pegawaiList.find(p => p.nip === (selectedRecord?.pejabatNip || formData.pejabatNip));
  const pegawai = pegawaiList.find(p => p.nip === (selectedRecord?.pegawaiNip || formData.pegawaiNip));

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="TND Berhasil Dibuat" />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => setIsConfirmOpen(false)} 
        onConfirm={handleDelete} 
        loading={syncing}
        message={`Hapus arsip dokumen ${itemToDelete?.type} No: ${itemToDelete?.nomor} secara permanen?`}
      />
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Generator SPMT & SPP Digital</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pembuatan Dokumen Tata Naskah Dinas Terautomasi</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip</button>
           <button onClick={() => setActiveView('editor')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat Baru</button>
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Jenis & Nomor</th><th className="px-4 py-5">Pegawai</th><th className="px-4 py-5 text-center">Tgl Dokumen</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {history.map(r => (
                   <tr key={r.id} className="hover:bg-blue-50/5 group">
                      <td className="px-10 py-5"><span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${r.type==='SPP' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{r.type}</span><p className="text-[11px] font-black text-gray-950 mt-2">{r.nomor}</p></td>
                      <td className="px-4 py-5"><p className="text-[11px] font-black uppercase">{pegawaiList.find(p=>p.nip===r.pegawaiNip)?.nama || 'N/A'}</p><p className="text-[9px] font-mono text-gray-400">NIP. {r.pegawaiNip}</p></td>
                      <td className="px-4 py-5 text-center"><span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg border">{r.tanggalSppAtauSpmt}</span></td>
                      <td className="px-10 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button onClick={() => { setSelectedRecord(r); setActiveView('preview'); }} className="h-10 px-6 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-all">Lihat</button>
                           {(isSuperadmin || canEdit) && (
                             <button onClick={() => confirmDelete(r)} className="h-10 w-10 bg-white text-rose-500 rounded-xl flex items-center justify-center border border-rose-100 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                               <i className="bi bi-trash-fill"></i>
                             </button>
                           )}
                        </div>
                      </td>
                   </tr>
                 ))}
                 {history.length === 0 && !loading && (
                    <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Belum ada arsip TND</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-6xl mx-auto animate-modalEnter">
           <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-center border-b pb-8 gap-6">
                 <div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter leading-none">Konfigurasi Surat Pernyataan</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Pilih jenis pernyataan dan lengkapi data</p>
                 </div>
                 <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] w-full md:w-auto">
                    <button onClick={() => setFormData({...formData, type: 'SPP'})} className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'SPP' ? 'bg-white text-gray-950 shadow-md' : 'text-gray-400'}`}>Pelantikan (SPP)</button>
                    <button onClick={() => setFormData({...formData, type: 'SPMT'})} className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'SPMT' ? 'bg-white text-gray-950 shadow-md' : 'text-gray-400'}`}>Laksana Tugas (SPMT)</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-check-fill"></i> Data Penandatangan</h5>
                    <SearchableSelect label="Pilih Pejabat" options={searchablePegawaiOptions} value={formData.pejabatNip || ''} onChange={handlePejabatSelect} />
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Jabatan Penandatangan (TND)</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-black text-gray-950 uppercase" value={formData.signatureLabel} onChange={e => setFormData({...formData, signatureLabel: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Nomor Dokumen</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-black text-gray-950" value={formData.nomor} onChange={e => setFormData({...formData, nomor: e.target.value})} /></div>
                 </div>
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-badge-fill"></i> Data Pegawai</h5>
                    <SearchableSelect label="Pilih Pegawai" options={searchablePegawaiOptions} value={formData.pegawaiNip || ''} onChange={handlePegawaiSelect} />
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">No. SK Menteri Hukum</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-black text-gray-950" value={formData.nomorSK} onChange={e => setFormData({...formData, nomorSK: e.target.value})} placeholder="M.HH-..." /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Tanggal TMT / Lantik</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-black text-gray-950" value={formData.tanggalLantikAtauSpmt} onChange={e => setFormData({...formData, tanggalLantikAtauSpmt: e.target.value})} /></div>
                 </div>
              </div>

              <div className="pt-10 border-t flex justify-center gap-4">
                 <button onClick={() => setActiveView('list')} className="px-12 py-5 bg-white border border-gray-200 text-gray-400 rounded-[2rem] font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">Batal</button>
                 <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all disabled:bg-gray-300">
                    {syncing ? 'Sinkronisasi Cloud...' : 'Generate Dokumen'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedRecord && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('list')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Kembali ke Arsip</button>
              <div className="flex gap-3">
                <button onClick={handleDownloadWord} className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95"><i className="bi bi-file-earmark-word-fill"></i> Word (.docx)</button>
                <button onClick={handleDownloadPdf} className="px-8 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> PDF (F4)</button>
              </div>
           </div>
           <div className="bg-gray-200 py-10 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial" style={{ width: '210mm', height: '330mm', padding: '1.5cm 2cm' }}>
                <TemplateKop />
                <div className="text-center mb-10">
                  <h1 className="text-[14pt] font-bold uppercase underline leading-tight">
                    {selectedRecord.type === 'SPP' ? 'SURAT PERNYATAAN PELANTIKAN' : 'SURAT PERNYATAAN MELAKSANAKAN TUGAS'}
                  </h1>
                  <p className="text-[12.5pt] font-bold mt-1 uppercase">NOMOR : {selectedRecord.nomor}</p>
                </div>
                
                <div className="text-[12pt] space-y-6 text-justify leading-relaxed">
                  <p>Yang bertanda tangan di bawah ini :</p>
                  
                  <div className="grid grid-cols-[180px_10px_1fr] gap-x-3 ml-8 leading-normal">
                    <span>Nama</span><span>:</span><span className="uppercase font-bold">{pejabat?.nama || '-'}</span>
                    <span>NIP</span><span>:</span><span>{pejabat?.nip || '-'}</span>
                    <span>Pangkat/Golongan Ruang</span><span>:</span><span className="uppercase">{pejabat?.pangkat || '-'} / ({pejabat?.golRuang || '-'})</span>
                    <span>Jabatan</span><span>:</span><span className="uppercase">{pejabat?.jabatan || '-'}</span>
                  </div>

                  <p className="pt-2">menyatakan dengan sesungguhnya, bahwa yang tersebut di bawah ini :</p>
                  
                  <div className="grid grid-cols-[180px_10px_1fr] gap-x-3 ml-8 leading-normal">
                    <span>Nama</span><span>:</span><span className="uppercase font-bold">{pegawai?.nama || '-'}</span>
                    <span>NIP</span><span>:</span><span>{pegawai?.nip || '-'}</span>
                    <span>Pangkat/Golongan Ruang</span><span>:</span><span className="uppercase">{pegawai?.pangkat || '-'} / ({pegawai?.golRuang || '-'})</span>
                    <span>Jabatan</span><span>:</span><span className="uppercase">{selectedRecord.jabatanBaru || '-'}</span>
                  </div>

                  <div className="pt-4">
                  {selectedRecord.type === 'SPP' ? (
                    <p>Berdasarkan Surat Keputusan Menteri Hukum Republik Indonesia Nomor {selectedRecord.nomorSK} tanggal {selectedRecord.tanggalSK || '(tanggal SK)'}, telah diangkat dalam jabatan {selectedRecord.jabatanBaru} pada Direktorat Jenderal Kekayaan Intelektual dan telah dilantik oleh Sekretaris Direktorat Jenderal Kekayaan Intelektual pada tanggal {selectedRecord.tanggalLantikAtauSpmt}.</p>
                  ) : (
                    <p>Berdasarkan Surat Keputusan Menteri Hukum Republik Indonesia Nomor {selectedRecord.nomorSK} tanggal {selectedRecord.tanggalSK || '(tanggal SK)'}, telah nyata melaksanakan tugas sebagai {selectedRecord.jabatanBaru} terhitung mulai tanggal {selectedRecord.tanggalLantikAtauSpmt}, pada Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum dan yang bersangkutan diberi tunjangan jabatan sesuai peraturan yang berlaku.</p>
                  )}
                  </div>

                  <p>Demikian Surat Pernyataan {selectedRecord.type === 'SPP' ? 'Pelantikan' : 'Melaksanakan Tugas'} ini saya buat dengan sesungguhnya, dengan mengingat sumpah jabatan dan apabila dikemudian hari isi surat pernyataan ini ternyata tidak benar, yang mengakibatkan kerugian terhadap negara, maka saya bersedia menanggung kerugian tersebut.</p>
                  
                  <div className="mt-12 ml-[50%] flex flex-col items-start leading-tight">
                    <p>{selectedRecord.tempatTandaTangan}, {selectedRecord.tanggalSppAtauSpmt}</p>
                    <p className="font-bold uppercase mb-24 mt-2 whitespace-pre-wrap">{selectedRecord.signatureLabel}</p>
                    <p className="font-bold uppercase underline leading-none">{pejabat?.nama}</p>
                    <p className="mt-1">NIP {pejabat?.nip}</p>
                  </div>
                </div>

                <div className="mt-20 text-[8.5pt]">
                   <p className="font-bold">Tembusan:</p>
                   <ol className="list-decimal ml-4">
                      <li>Direktur Jenderal Kekayaan Intelektual;</li>
                      <li>Kepala Bagian Keuangan;</li>
                      <li>Pejabat Pembuat Daftar Gaji; dan</li>
                      <li>Pegawai yang bersangkutan.</li>
                   </ol>
                </div>
              </div>
           </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default SpmtSppPage;
