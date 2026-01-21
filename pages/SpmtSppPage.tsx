
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, SpmtSppRecord } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const SpmtSppPage = () => {
  const { canEdit, logActivity } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [history, setHistory] = useState<SpmtSppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SpmtSppRecord | null>(null);
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);
  const pdfRef = useRef<HTMLDivElement>(null);

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
    const saved = localStorage.getItem('portal_spmt_spp_db');
    if (saved) setHistory(JSON.parse(saved));
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchPegawaiFromSheets();
      setPegawaiList(res);
      localStorage.setItem('portal_pegawai_db', JSON.stringify(res));
    } catch (err) { 
      console.error(err);
      const saved = localStorage.getItem('portal_pegawai_db');
      if (saved) setPegawaiList(JSON.parse(saved));
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
      if (p.jabatan?.toUpperCase().includes('DIREKTUR JENDERAL')) label = 'Direktur Jenderal';
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

  const handleSave = () => {
    if (!formData.pegawaiNip || !formData.pejabatNip || !formData.nomor) {
      return alert("Harap lengkapi Nomor Dokumen, Pejabat, dan Pegawai.");
    }

    const newRecord: SpmtSppRecord = { ...formData as SpmtSppRecord, id: Date.now().toString() };
    const updated = [newRecord, ...history];
    setHistory(updated);
    localStorage.setItem('portal_spmt_spp_db', JSON.stringify(updated));
    logActivity('CREATE', 'SPMT/SPP', `Membuat dokumen ${newRecord.type} untuk ${pegawaiList.find(p => p.nip === newRecord.pegawaiNip)?.nama}`);
    setSelectedRecord(newRecord);
    setActiveView('preview');
    setShowSuccess(true);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    // Menggunakan format F4 (210 x 330 mm)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`${selectedRecord?.type}_${selectedRecord?.pegawaiNip}_${new Date().getTime()}.pdf`);
  };

  const KopSurat = () => (
    <div className="flex flex-col items-center mb-8 text-black border-b-[3pt] border-black pb-2">
      <div className="flex items-center w-full px-10">
        <img src={customLogo} className="h-24 w-auto mr-8 object-contain" alt="Logo" crossOrigin="anonymous" />
        <div className="flex-1 text-center font-serif">
          <p className="text-[14pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[14pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[9pt] mt-2 italic">Jalan H.R. Rasuna Said Kav. 8-9 Kuningan, Jakarta Selatan 12940</p>
          <p className="text-[9pt]">Call Center : 152 | Laman : www.dgip.go.id | Pos-el : halodjki@dgip.go.id</p>
        </div>
      </div>
    </div>
  );

  const pejabat = pegawaiList.find(p => p.nip === (selectedRecord?.pejabatNip || formData.pejabatNip));
  const pegawai = pegawaiList.find(p => p.nip === (selectedRecord?.pegawaiNip || formData.pegawaiNip));

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Dokumen Berhasil Dibuat" />
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-none">Generator SPMT & SPP (Standar TND)</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pembuatan Surat Pernyataan Resmi Berdasarkan Format Kemenkum RI</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}>Arsip</button>
           <button onClick={() => setActiveView('editor')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'}`}>Generator</button>
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Kategori & No</th><th className="px-4 py-5">ASN Terkait</th><th className="px-4 py-5 text-center">Tgl Terbit</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {history.map(r => (
                   <tr key={r.id} className="hover:bg-blue-50/5 group transition-all">
                      <td className="px-10 py-5"><span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${r.type==='SPP' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{r.type}</span><p className="text-[11px] font-black text-gray-950 mt-2 uppercase">{r.nomor}</p></td>
                      <td className="px-4 py-5"><p className="text-[11px] font-black text-gray-900 uppercase mb-1">{pegawaiList.find(p=>p.nip===r.pegawaiNip)?.nama || 'N/A'}</p><p className="text-[9px] font-mono text-blue-600 font-bold">NIP. {r.pegawaiNip}</p></td>
                      <td className="px-4 py-5 text-center"><span className="text-[10px] font-black text-gray-600 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{r.tanggalSppAtauSpmt}</span></td>
                      <td className="px-10 py-5 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setSelectedRecord(r); setActiveView('preview'); }} className="h-10 px-6 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Preview</button></div></td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-6xl mx-auto animate-modalEnter">
           <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-center border-b pb-8 gap-6">
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Konfigurasi Dokumen TND</h4>
                 <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem] w-full md:w-auto">
                    <button onClick={() => setFormData({...formData, type: 'SPP'})} className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'SPP' ? 'bg-white text-gray-950 shadow-md' : 'text-gray-400'}`}>Pelantikan (SPP)</button>
                    <button onClick={() => setFormData({...formData, type: 'SPMT'})} className={`flex-1 md:flex-none px-10 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${formData.type === 'SPMT' ? 'bg-white text-gray-950 shadow-md' : 'text-gray-400'}`}>Laksana Tugas (SPMT)</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-check-fill"></i> I. Data Pejabat Penandatangan</h5>
                    <SearchableSelect label="Pilih Pejabat" options={searchablePegawaiOptions} value={formData.pejabatNip || ''} onChange={handlePejabatSelect} />
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Label Jabatan Penandatangan</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl text-[11px] font-black text-gray-950 uppercase" value={formData.signatureLabel} onChange={e => setFormData({...formData, signatureLabel: e.target.value})} placeholder="Contoh: Sekretaris Direktorat Jenderal" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Nomor Surat / Dokumen</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl text-[11px] font-black text-gray-950" value={formData.nomor} onChange={e => setFormData({...formData, nomor: e.target.value})} placeholder="CONTOH: HKI.1-KP.03.04-100" /></div>
                 </div>
                 <div className="space-y-8">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-3 tracking-widest flex items-center gap-2"><i className="bi bi-person-badge-fill"></i> II. Data Pegawai Terkait</h5>
                    <SearchableSelect label="Pilih Pegawai" options={searchablePegawaiOptions} value={formData.pegawaiNip || ''} onChange={handlePegawaiSelect} />
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Berdasarkan Keputusan Nomor</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl text-[11px] font-black text-gray-950" value={formData.nomorSK} onChange={e => setFormData({...formData, nomorSK: e.target.value})} placeholder="Contoh: M.HH-10.KP.03.01 Tahun 2025" /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Jabatan & Penempatan Baru</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl text-[11px] font-black text-gray-950 uppercase" value={formData.jabatanBaru} onChange={e => setFormData({...formData, jabatanBaru: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Tanggal Mulai Melaksanakan Tugas</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 rounded-2xl text-[11px] font-black text-gray-950" value={formData.tanggalLantikAtauSpmt} onChange={e => setFormData({...formData, tanggalLantikAtauSpmt: e.target.value})} placeholder="Contoh: 10 Agustus 2025" /></div>
                 </div>
              </div>

              <div className="pt-10 border-t flex justify-center">
                 <button onClick={handleSave} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all hover:bg-blue-700">Generate Dokumen Resmi</button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedRecord && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Kembali</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl flex items-center gap-3 transition-all active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> Simpan PDF (F4)</button>
           </div>
           <div className="bg-gray-200 p-10 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-serif" style={{ width: '210mm', height: '330mm', padding: '1.5cm 2cm' }}>
                <KopSurat />
                <div className="text-center mb-10">
                  <h1 className="text-[14pt] font-bold uppercase underline leading-tight">
                    {selectedRecord.type === 'SPP' ? 'SURAT PERNYATAAN PELANTIKAN' : 'SURAT PERNYATAAN MELAKSANAKAN TUGAS'}
                  </h1>
                  <p className="text-[12pt] font-bold mt-2 uppercase tracking-wide">NOMOR : {selectedRecord.nomor}</p>
                </div>
                
                <div className="text-[12pt] space-y-8 text-justify leading-relaxed">
                  <p>Yang bertanda tangan di bawah ini :</p>
                  
                  <div className="grid grid-cols-[160px_10px_1fr] gap-x-3 ml-8">
                    <span>Nama</span><span>:</span><span className="uppercase font-bold">{pejabat?.nama || '-'}</span>
                    <span>NIP</span><span>:</span><span>{pejabat?.nip || '-'}</span>
                    <span>Pangkat/Gol. Ruang</span><span>:</span><span className="uppercase">{pejabat?.pangkat || '-'} / ({pejabat?.golRuang || '-'})</span>
                    <span>Jabatan</span><span>:</span><span className="uppercase">{pejabat?.jabatan || '-'}</span>
                  </div>

                  <p>{selectedRecord.type === 'SPP' ? 'Menyatakan dengan sesungguhnya, bahwa :' : 'Menyatakan dengan sesungguhnya, bahwa Pegawai Negeri Sipil yang tersebut di bawah ini :'}</p>
                  
                  <div className="grid grid-cols-[160px_10px_1fr] gap-x-3 ml-8">
                    <span>Nama</span><span>:</span><span className="uppercase font-bold">{pegawai?.nama || '-'}</span>
                    <span>NIP</span><span>:</span><span>{pegawai?.nip || '-'}</span>
                    <span>Pangkat/Gol. Ruang</span><span>:</span><span className="uppercase">{pegawai?.pangkat || '-'} / ({pegawai?.golRuang || '-'})</span>
                    <span>Jabatan</span><span>:</span><span className="uppercase">{selectedRecord.jabatanBaru || '-'}</span>
                  </div>

                  {selectedRecord.type === 'SPP' ? (
                    <p>Berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor {selectedRecord.nomorSK}, yang bersangkutan pada tanggal {selectedRecord.tanggalLantikAtauSpmt} telah dilantik dalam jabatan {selectedRecord.jabatanBaru} pada Direktorat Jenderal Kekayaan Intelektual.</p>
                  ) : (
                    <p>Berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor {selectedRecord.nomorSK}, yang bersangkutan pada tanggal {selectedRecord.tanggalLantikAtauSpmt} telah nyata melaksanakan tugas pada Direktorat Jenderal Kekayaan Intelektual.</p>
                  )}

                  <p>Demikian surat pernyataan ini saya buat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.</p>
                  
                  <div className="mt-16 ml-[50%] flex flex-col items-start">
                    <p>{selectedRecord.tempatTandaTangan}, {selectedRecord.tanggalSppAtauSpmt}</p>
                    <p className="font-bold uppercase mb-24 mt-1 leading-tight">{selectedRecord.signatureLabel}</p>
                    <p className="font-bold uppercase underline">{pejabat?.nama}</p>
                    <p>NIP {pejabat?.nip}</p>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
      <style>{`
        @media print { .no-print { display: none !important; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default SpmtSppPage;
