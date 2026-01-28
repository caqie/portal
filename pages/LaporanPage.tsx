
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Laporan, TugasRutin, Kegiatan, Pegawai } from '../types';
import { BULAN, UNIT_KERJA, normalizeUnitName, DEFAULT_LOGO, TASK_LABELS } from '../constants';
import { fetchPegawaiFromSheets, fetchTugasRutinFromSheets, fetchKegiatanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LaporanPage = () => {
  const { logActivity } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [laporanHistory, setLaporanHistory] = useState<Laporan[]>([]);
  
  const [activeTab, setActiveTab] = useState<'list' | 'generator'>('generator');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter & Config State
  const [selMonth, setSelMonth] = useState(BULAN[new Date().getMonth()]);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  
  // Signatory State - Default ke Sekretaris
  const [signatoryNip, setSignatoryNip] = useState('197410061998031002'); 
  const [signatoryData, setSignatoryData] = useState({
    nama: 'Andrieansjah',
    jabatan: 'Sekretaris Direktorat Jenderal'
  });

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [p, t, k] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchTugasRutinFromSheets(),
        fetchKegiatanFromSheets()
      ]);
      setPegawai(p);
      setTasks(t);
      setKegiatan(k);
      
      const saved = localStorage.getItem('portal_laporan_history');
      if (saved) setLaporanHistory(JSON.parse(saved));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSignatoryChange = (nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) {
      setSignatoryNip(nip);
      setSignatoryData({
        nama: p.nama,
        jabatan: p.jabatan || 'Pejabat Terkait'
      });
    }
  };

  const reportData = useMemo(() => {
    const analytics = UNIT_KERJA.map(unit => ({
      unit,
      total: pegawai.filter(p => normalizeUnitName(p.unitKerja) === unit).length,
      pns: pegawai.filter(p => normalizeUnitName(p.unitKerja) === unit && p.jenisPegawai === 'PNS').length,
      pppk: pegawai.filter(p => normalizeUnitName(p.unitKerja) === unit && p.jenisPegawai === 'PPPK').length
    }));

    const filteredTasks = tasks.filter(t => t.bulan === selMonth && Number(t.tahun) === selYear);
    const filteredKegiatan = kegiatan.filter(k => {
      if (!k.tanggal) return false;
      const d = new Date(k.tanggal);
      return BULAN[d.getMonth()] === selMonth && d.getFullYear() === selYear;
    });

    return { analytics, filteredTasks, filteredKegiatan };
  }, [pegawai, tasks, kegiatan, selMonth, selYear]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setLoading(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`LAPORAN_BULANAN_${selMonth.toUpperCase()}_${selYear}.pdf`);
    saveToHistory('PDF');
    setLoading(false);
  };

  const saveToHistory = (format: string) => {
    const newLap: Laporan = { id: Date.now().toString(), judul: `LAPORAN KONSOLIDASI ${selMonth.toUpperCase()} ${selYear}`, jenis: format, periode: selMonth, tahun: selYear, status: 'Generated', createdAt: new Date().toISOString() };
    const updated = [newLap, ...laporanHistory].slice(0, 20);
    setLaporanHistory(updated);
    localStorage.setItem('portal_laporan_history', JSON.stringify(updated));
    setShowSuccess(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Dokumen Berhasil" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">Konsolidasi Bulanan</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Personnel Service Data Orchestrator</p>
        </div>
        <div className="flex bg-white p-2 rounded-[1.8rem] shadow-sm border border-gray-100">
            <button onClick={() => setActiveTab('generator')} className={`px-10 h-12 text-[11px] font-black uppercase rounded-2xl transition-all ${activeTab === 'generator' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400'}`}>Generator</button>
            <button onClick={() => setActiveTab('list')} className={`px-10 h-12 text-[11px] font-black uppercase rounded-2xl transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-400'}`}>Riwayat</button>
        </div>
      </div>

      {activeTab === 'generator' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest border-b pb-4">Konfigurasi Laporan</h5>
                 
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Bulan</label>
                          <select className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-[11px] font-black" value={selMonth} onChange={e => setSelMonth(e.target.value)}>{BULAN.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select>
                       </div>
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Tahun</label>
                          <input type="number" className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-[11px] font-black" value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} />
                       </div>
                    </div>

                    <SearchableSelect 
                      label="Penandatangan" 
                      options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} 
                      value={signatoryNip} 
                      onChange={handleSignatoryChange} 
                    />
                 </div>
                 
                 <button onClick={handleDownloadPdf} disabled={loading} className="w-full py-5 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                    {loading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>} Unduh PDF Resmi (F4)
                 </button>
              </div>
           </div>

           <div className="xl:col-span-8 overflow-hidden">
              <div className="bg-gray-200 py-10 rounded-[3.5rem] flex flex-col items-center overflow-x-auto custom-scrollbar">
                 {/* WARNA TEKS DIBUAT HITAM PEKAT (#000000) UNTUK STANDAR KEDINASAN */}
                 <div ref={pdfRef} className="bg-white shadow-2xl text-[#000000] font-arial p-[1.5cm_1.8cm] leading-tight" style={{ width: '210mm', minHeight: '330mm' }}>
                    <div className="flex items-center border-b-[3pt] border-black pb-4 mb-8">
                       <img src={DEFAULT_LOGO} className="h-20 w-auto mr-6" crossOrigin="anonymous" />
                       <div className="text-center flex-1">
                          <p className="text-[13pt] font-bold uppercase text-[#000000]">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                          <p className="text-[13pt] font-bold uppercase text-[#000000]">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                          <p className="text-[9pt] text-[#000000]">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                       </div>
                    </div>

                    <div className="text-center mb-8">
                       <h1 className="text-[14pt] font-bold uppercase underline text-[#000000]">LAPORAN KONSOLIDASI DATA SDM</h1>
                       <p className="text-[11pt] font-bold mt-1 uppercase text-[#000000]">PERIODE: {selMonth} {selYear}</p>
                    </div>

                    <div className="text-[10pt] space-y-10">
                       <section>
                          <p className="font-bold border-b border-black mb-3 pb-1 text-[#000000]">I. STATISTIK PEGAWAI PER UNIT KERJA</p>
                          <table className="w-full border-collapse border border-black text-[9pt] text-[#000000]">
                             <thead className="bg-gray-100">
                                <tr className="text-center font-bold">
                                   <th className="border border-black p-2">NO</th>
                                   <th className="border border-black p-2 text-left">UNIT KERJA</th>
                                   <th className="border border-black p-2">PNS</th>
                                   <th className="border border-black p-2">PPPK</th>
                                   <th className="border border-black p-2">TOTAL</th>
                                </tr>
                             </thead>
                             <tbody>
                                {reportData.analytics.map((a, i) => (
                                   <tr key={i}>
                                      <td className="border border-black p-2 text-center">{i+1}</td>
                                      <td className="border border-black p-2 uppercase text-[8pt]">{a.unit}</td>
                                      <td className="border border-black p-2 text-center">{a.pns}</td>
                                      <td className="border border-black p-2 text-center">{a.pppk}</td>
                                      <td className="border border-black p-2 text-center font-bold">{a.total}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </section>

                       <section>
                          <p className="font-bold border-b border-black mb-3 pb-1 text-[#000000]">II. LOG TUGAS RUTIN TERPENUHI</p>
                          <table className="w-full border-collapse border border-black text-[9pt] text-[#000000]">
                             <thead className="bg-gray-100 font-bold">
                                <tr>
                                   <th className="border border-black p-2 w-10 text-center">NO</th>
                                   <th className="border border-black p-2 text-left">KATEGORI TUGAS</th>
                                   <th className="border border-black p-2 text-left">RINGKASAN AKTIVITAS</th>
                                </tr>
                             </thead>
                             <tbody>
                                {reportData.filteredTasks.length > 0 ? reportData.filteredTasks.map((t, i) => (
                                   <tr key={t.id}>
                                      <td className="border border-black p-2 text-center">{i+1}</td>
                                      <td className="border border-black p-2 font-bold uppercase">{TASK_LABELS[t.jenis]}</td>
                                      <td className="border border-black p-2 italic">{t.detail || 'Terlaksana sesuai prosedur.'}</td>
                                   </tr>
                                )) : (
                                   <tr><td colSpan={3} className="border border-black p-4 text-center italic text-gray-500">Tidak ada log data.</td></tr>
                                )}
                             </tbody>
                          </table>
                       </section>

                       <div className="mt-20 ml-[55%] text-center text-[#000000]">
                          <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                          <p className="font-bold mt-2 mb-28 uppercase text-[#000000]">{signatoryData.jabatan},</p>
                          <p className="font-bold uppercase underline text-[#000000]">{signatoryData.nama}</p>
                          <p className="text-[#000000]">NIP {signatoryNip}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-10 min-h-[500px] text-center opacity-40">
           <i className="bi bi-clock-history text-6xl block mb-4"></i>
           <p className="text-[11px] font-black uppercase tracking-widest">Fitur Riwayat akan muncul setelah dokumen di-generate</p>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;
