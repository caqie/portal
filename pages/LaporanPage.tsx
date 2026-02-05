
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TugasRutin, Kegiatan, Pegawai, TaskType } from '../types';
import { BULAN, UNIT_KERJA, normalizeUnitName, DEFAULT_TEMPLATE_LOGO, TASK_LABELS, PANGKAT_MAP } from '../constants';
import { fetchPegawaiFromSheets, fetchTugasRutinFromSheets, fetchKegiatanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const LaporanPage = () => {
  const { logActivity } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  
  const [activeTab, setActiveTab] = useState<'generator' | 'analytics'>('generator');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [selMonth, setSelMonth] = useState(BULAN[new Date().getMonth()]);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [nomorNota, setNomorNota] = useState(`HKI.1-PR.04.01-${Math.floor(Math.random() * 100)}`);
  const [signatoryNip, setSignatoryNip] = useState('197410061998031002'); 
  const [signatoryData, setSignatoryData] = useState({ nama: 'ANDRIEANSJAH', jabatan: 'KETUA TIM KERJA PENGELOLAAN SDM' });

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [p, t, k] = await Promise.all([fetchPegawaiFromSheets(), fetchTugasRutinFromSheets(), fetchKegiatanFromSheets()]);
      setPegawai(p); setTasks(t); setKegiatan(k);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSignatoryChange = (nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) {
      setSignatoryNip(nip);
      setSignatoryData({ nama: p.nama.toUpperCase(), jabatan: p.jabatan?.toUpperCase() || 'PEJABAT TERKAIT' });
    }
  };

  const stats = useMemo(() => {
    const active = pegawai.filter(p => (p.status || '').toLowerCase() === 'aktif');
    
    const filterByJenis = (jenis: string) => active.filter(p => (p.jenisPegawai || '').toUpperCase() === jenis.toUpperCase());
    
    const pns = filterByJenis('PNS');
    const cpns = filterByJenis('CPNS');
    const pppk = active.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PPPK'));

    const getUnitCount = (list: Pegawai[]) => {
      const counts: Record<string, number> = {};
      UNIT_KERJA.forEach(u => counts[u] = list.filter(p => normalizeUnitName(p.unitKerja) === u).length);
      return counts;
    };

    const getRankCount = (list: Pegawai[]) => {
      const counts: Record<string, number> = {};
      Object.keys(PANGKAT_MAP).forEach(g => counts[g] = list.filter(p => p.golRuang === g).length);
      return counts;
    };

    const getJabatanStats = (list: Pegawai[]) => {
       const jft = list.filter(p => (p.jabatan || '').toUpperCase().includes('AHLI') || (p.jabatan || '').toUpperCase().includes('TERAMPIL')).length;
       const pelaksana = list.filter(p => (p.jabatan || '').toUpperCase().includes('PELAKSANA') || (p.jabatan || '').toUpperCase().includes('OPERATOR') || (p.jabatan || '').toUpperCase().includes('PENGELOLA')).length;
       const struktural = list.length - jft - pelaksana;
       return { jft, pelaksana, struktural };
    };

    const filteredTasks = tasks.filter(t => t.bulan === selMonth && Number(t.tahun) === selYear);

    return {
      pns: { total: pns.length, units: getUnitCount(pns), ranks: getRankCount(pns), jabatan: getJabatanStats(pns) },
      cpns: { total: cpns.length, units: getUnitCount(cpns), ranks: getRankCount(cpns) },
      pppk: { total: pppk.length, units: getUnitCount(pppk) },
      tasks: filteredTasks
    };
  }, [pegawai, tasks, selMonth, selYear]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297);
      pdf.save(`LAPORAN_BULANAN_SDM_${selMonth.toUpperCase()}_${selYear}.pdf`);
      logActivity('DOWNLOAD', 'Laporan', `Cetak PDF Nota Dinas Laporan ${selMonth} ${selYear}`);
      setShowSuccess(true);
    } catch (e) { alert("Gagal cetak PDF."); } finally { setLoading(false); }
  };

  const TableHeader = ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-[#D1D5DB] border-2 border-black font-bold text-center text-[7pt] uppercase">
      {children}
    </thead>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 uppercase">Nota Dinas Laporan Bulanan</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-file-earmark-bar-graph text-blue-600"></i> Standar Naskah Dinas Kementrian Hukum
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleDownloadPdf} disabled={loading} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>} Cetak Nota Dinas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
         {/* SIDEBAR CONFIG */}
         <div className="xl:col-span-4 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
               <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest">Atribut Laporan</h5>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Bulan</label><select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black uppercase" value={selMonth} onChange={e => setSelMonth(e.target.value)}>{BULAN.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tahun</label><input type="number" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black" value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} /></div>
               </div>
               <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Nota Dinas</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black" value={nomorNota} onChange={e => setNomorNota(e.target.value)} /></div>
               <SearchableSelect label="Penandatangan Laporan" options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={signatoryNip} onChange={handleSignatoryChange} />
            </div>
         </div>

         {/* PREVIEW A4 PORTRAIT */}
         <div className="xl:col-span-8 flex justify-center">
            <div className="bg-gray-400/10 p-6 md:p-10 rounded-[3rem] overflow-x-auto no-scrollbar flex justify-center w-full">
               <div ref={pdfRef} className="bg-white shadow-2xl font-arial p-[1.5cm_1.5cm] leading-tight text-black" style={{ width: '210mm', minHeight: '297mm' }}>
                  
                  {/* KOP SURAT */}
                  <div className="flex flex-col items-center border-b-[2.5pt] border-black pb-1 mb-6">
                     <p className="text-[12pt] font-bold uppercase text-center leading-tight">KEMENTERIAN HUKUM</p>
                     <p className="text-[12pt] font-bold uppercase text-center leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                  </div>
                  
                  <div className="text-center mb-6">
                     <h1 className="text-[13pt] font-bold uppercase underline leading-tight">NOTA DINAS</h1>
                     <p className="text-[11pt] font-bold mt-1 uppercase">NOMOR : {nomorNota}</p>
                  </div>
                  
                  {/* ATRIBUT NOTA DINAS */}
                  <div className="text-[10pt] mb-6 space-y-1.5 leading-snug">
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Yth</span><span>:</span><div className="font-bold">1. Sekretaris Direktorat Jenderal Kekayaan Intelektual<br/>2. Kepala Bagian Program dan Pelaporan</div></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Dari</span><span>:</span><span className="font-bold uppercase">{signatoryData.jabatan}</span></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Hal</span><span>:</span><span className="font-bold">Laporan Bulanan Tim Kerja Pengelolaan Sumber Daya Manusia Bulan {selMonth} {selYear}</span></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Lampiran</span><span>:</span><span>Satu Berkas</span></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Tanggal</span><span>:</span><span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                  </div>
                  
                  <div className="h-[1pt] bg-black w-full mb-6"></div>

                  <div className="text-[10pt] space-y-6 text-justify leading-relaxed">
                     <p>Dengan hormat kami melaporkan hasil pekerjaan Tim Kerja Pengelolaan Sumber Daya Manusia pada bulan {selMonth} {selYear}, sebagai berikut:</p>
                     
                     {/* SEKSI 1: DATA PEGAWAI */}
                     <section className="space-y-4">
                        <p className="font-bold">1. Data Pegawai</p>
                        <div className="pl-4 space-y-4">
                           <p className="font-bold">1.1 Data PNS</p>
                           <p>Jumlah PNS DJKI: <span className="font-bold">{stats.pns.total} Orang</span></p>
                           
                           {/* Tabel Pangkat */}
                           <p className="text-[9pt] font-bold">a. Berdasarkan Pangkat</p>
                           <table className="w-full border-2 border-black text-center text-[7.5pt] border-collapse">
                              <TableHeader>
                                 <tr className="border-b-2 border-black">
                                    {Object.keys(PANGKAT_MAP).slice(4).map(g => <th key={g} className="border-r border-black p-1">{g}</th>)}
                                    <th className="p-1">KBP</th>
                                 </tr>
                              </TableHeader>
                              <tbody>
                                 <tr>
                                    {Object.keys(PANGKAT_MAP).slice(4).map(g => <td key={g} className="border-r border-black p-1.5">{stats.pns.ranks[g] || 0}</td>)}
                                    <td className="p-1.5 font-bold">0</td>
                                 </tr>
                              </tbody>
                           </table>

                           {/* Tabel Unit Kerja */}
                           <p className="text-[9pt] font-bold mt-4">b. Berdasarkan Unit Kerja</p>
                           <table className="w-full border-2 border-black text-[7.5pt] border-collapse">
                              <TableHeader>
                                 <tr className="border-b-2 border-black"><th className="p-1 border-r border-black">Unit</th><th className="p-1">Jumlah</th></tr>
                              </TableHeader>
                              <tbody>
                                 {UNIT_KERJA.map(u => (
                                    <tr key={u} className="border-b border-black last:border-0">
                                       <td className="p-1.5 border-r border-black uppercase">{u.replace('Direktorat Jenderal Kekayaan Intelektual', 'DJKI')}</td>
                                       <td className="p-1.5 text-center font-bold">{stats.pns.units[u]}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </section>

                     {/* SEKSI 2: TUGAS RUTIN */}
                     <section className="space-y-4 mt-8">
                        <p className="font-bold">2. Tugas Rutin Kepegawaian</p>
                        {stats.tasks.map((t, i) => (
                           <div key={t.id} className="pl-4">
                              <p className="font-bold">2.{i+1} {TASK_LABELS[t.jenis]}</p>
                              <div className="mt-2 p-2 border-2 border-black bg-gray-50 italic text-[9pt]">
                                 {t.detail}
                              </div>
                           </div>
                        ))}
                        {stats.tasks.length === 0 && (
                          <p className="pl-4 italic text-gray-400">Tidak ada log tugas rutin tercatat untuk periode ini.</p>
                        )}
                     </section>

                     {/* PENUTUP */}
                     <p className="mt-8">Terkait dengan hal-hal yang kami laporkan, mohon kiranya Bapak berkenan memberikan arahan lebih lanjut.</p>
                     <p>Atas perhatian dan perkenan Bapak, kami ucapkan terima kasih.</p>

                     {/* TANDA TANGAN */}
                     <div className="mt-14 ml-[55%] text-center text-[10.5pt] leading-tight">
                        <p className="font-bold uppercase mb-24">{signatoryData.jabatan},</p>
                        <p className="font-bold uppercase underline leading-none">{signatoryData.nama}</p>
                        <p className="mt-1">NIP {signatoryNip}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <style>{`
        .font-arial { font-family: Arial, Helvetica, sans-serif !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default LaporanPage;
