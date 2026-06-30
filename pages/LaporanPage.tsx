
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TugasRutin, Kegiatan, Pegawai, TaskType } from '../types';
import { BULAN, UNIT_KERJA, normalizeUnitName, TASK_LABELS, PANGKAT_MAP, formatPegawaiName } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import { fetchPegawaiFromSheets, fetchTugasRutinFromSheets, fetchKegiatanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const getJabatanClassification = (p: Pegawai): string => {
  const es = (p.eselon || '').trim().toUpperCase();
  const j = (p.jabatan || '').trim().toUpperCase();
  const kl = (p.klasifikasiJabatan || p.jenisJabatan || '').trim().toUpperCase();

  // 1. Primary Source of Truth: Trust Column AN (Jenis Jabatan) from Spreadsheet
  if (kl.includes('PIMPINAN TINGGI') || kl.includes('JPT')) return 'JPT';
  if (kl.includes('STRUKTURAL') || kl.includes('ADMINISTRATOR') || kl.includes('PENGAWAS') || kl.includes('MANAJERIAL')) return 'STRUKTURAL';
  if (kl.includes('FUNGSIONAL TERTENTU') || kl.includes('JFT') || kl === 'FUNGSIONAL') return 'FUNGSIONAL';
  if (kl.includes('FUNGSIONAL UMUM') || kl.includes('JFU') || kl.includes('PELAKSANA')) return 'PELAKSANA';

  // 2. Secondary: Force JFT markers in name (if says AHLI/MADYA/MUDA/PERTAMA, etc)
  if (j.includes('AHLI') || j.includes('MADYA') || j.includes('MUDA') || 
      j.includes('PERTAMA') || j.includes('UTAMA') || j.includes('TERAMPIL') || 
      j.includes('MAHIR') || j.includes('PENYELIA') || j.includes('PELAKSANA LANJUTAN')) return 'FUNGSIONAL';

  // 3. Fallback: Management Keywords - JPT (Eselon I & II)
  if (j.includes('DIREKTUR JENDERAL') || j.includes('SEKRETARIS DIREKTORAT JENDERAL') || 
      j.includes('SEKRETARIS UTAMA') || j.includes('STAF AHLI') || j.includes('INSPEKTUR') || 
      j.includes('KEPALA BIRO') || j.includes('KEPALA PUSAT') || j.includes('DIREKTUR') || 
      j.includes('SEKRETARIS DIREKTORAT')) {
    return 'JPT';
  }

  // 4. Fallback: Management Keywords - Structural (Eselon III & IV)
  if (j.includes('KEPALA BAGIAN') || j.includes('KABAG') || 
      j.includes('KEPALA SUBDIREKTORAT') || j.includes('KASUBDIT') || 
      j.includes('KEPALA BIDANG') || j.includes('KABID') ||
      j.includes('KEPALA SEKSI') || j.includes('KASI') || 
      j.includes('KEPALA SUBBAGIAN') || j.includes('KASUBBAG') || 
      j.includes('KOORDINATOR') || j.includes('SUBKOORDINATOR') ||
      j.includes('KEPALA KANTOR') || j.includes('KEPALA SATUAN') ||
      j.startsWith('KEPALA ') || j.includes(' KEPALA ')) {
    return 'STRUKTURAL';
  }

  // 5. Fallback: Pelaksana (JFU) Specific Title Keywords
  if (j.includes('ANALIS') || j.includes('PENATA KELOLA') || j.includes('PENATA LAYANAN') || 
      j.includes('PENELAAH') || j.includes('PENGADMINISTRASI') || j.includes('PENGELOLA') || 
      j.includes('PENGOLAH') || j.includes('PENYUSUN') || j.includes('DOKUMENTALIS') || 
      j.includes('OPERATOR') || j.includes('FASILITATOR') || j.includes('SEKRETARIS PIMPINAN') ||
      j.includes('KONSELOR') || j.includes('PENGENDALI KONTEN') || j.includes('PETUGAS') || 
      j.includes('PRAMU') || j.includes('PENGEMUDI') || j.includes('TEKNISI') || 
      j.includes('STAF') || j.includes('STAFF')) {
    return 'PELAKSANA';
  }

  // 6. Fallback: Eselon
  if (es && es !== '-') {
    if (es.startsWith('IV') || es.startsWith('4')) return 'STRUKTURAL';
    if (es.startsWith('III') || es.startsWith('3')) return 'STRUKTURAL';
    if (es.startsWith('II') || es.startsWith('2')) return 'JPT';
    if (es.startsWith('I') || es.startsWith('1')) return 'JPT';
  }

  return 'PELAKSANA';
};

const LaporanPage = () => {
  const { logActivity } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [tasks, setTasks] = useState<TugasRutin[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [selMonth, setSelMonth] = useState(BULAN[new Date().getMonth()]);
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [nomorNota, setNomorNota] = useState(`HKI.1-PR.04.01-${Math.floor(Math.random() * 1000)}`);
  const [tanggalNota, setTanggalNota] = useState(new Date().toISOString().split('T')[0]);
  const [signatoryNip, setSignatoryNip] = useState('197012161993031002'); 
  const [signatoryData, setSignatoryData] = useState({ nama: 'SARIMAN', jabatan: 'KETUA TIM KERJA PENGELOLAAN SDM' });

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async (bypass = false) => {
    setLoading(true);
    try {
      const [p, t, k] = await Promise.all([
        fetchPegawaiFromSheets(bypass), 
        fetchTugasRutinFromSheets(bypass), 
        fetchKegiatanFromSheets(bypass)
      ]);
      setPegawai(p); setTasks(t); setKegiatan(k);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const formatSignatoryName = (name: string) => {
    return formatPegawaiName(name);
  };

  const handleSignatoryChange = (nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) {
      setSignatoryNip(nip);
      setSignatoryData({ nama: p.nama, jabatan: p.jabatan?.toUpperCase() || 'PEJABAT TERKAIT' });
    }
  };

  const stats = useMemo(() => {
    const active = pegawai.filter(p => {
      const s = (p.status || 'Aktif').trim().toUpperCase();
      return s === 'AKTIF';
    });
    
    const getStatsForType = (typeKey: string) => {
      const list = active.filter(p => {
        const type = (p.jenisPegawai || '').toUpperCase().trim();
        if (typeKey.toUpperCase() === 'PNS') return type === 'PNS';
        if (typeKey.toUpperCase() === 'PPPK') return type.includes('PPPK') && !type.includes('PARUH');
        return type.includes(typeKey.toUpperCase());
      });
      
      const units: Record<string, number> = {};
      UNIT_KERJA.forEach(u => units[u] = list.filter(p => normalizeUnitName(p.unitKerja) === u).length);

      const ranks: Record<string, number> = {};
      Object.keys(PANGKAT_MAP).forEach(g => ranks[g] = list.filter(p => p.golRuang === g).length);

      const gender = { L: list.filter(p => p.gender === 'L').length, P: list.filter(p => p.gender === 'P').length };

      const edu: Record<string, number> = {};
      list.forEach(p => { 
        const e = (p.pendidikan || 'LAINNYA').toUpperCase(); 
        edu[e] = (edu[e] || 0) + 1; 
      });

      const countJab = (p: Pegawai) => {
        const type = getJabatanClassification(p);
        if (type === 'JPT' || type === 'STRUKTURAL') return 'STRUKTURAL';
        if (type === 'FUNGSIONAL') return 'FUNGSIONAL';
        return 'PELAKSANA';
      };

      const jab = {
        jft: list.filter(p => countJab(p) === 'FUNGSIONAL').length,
        pelaksana: list.filter(p => countJab(p) === 'PELAKSANA').length,
        struktural: list.filter(p => countJab(p) === 'STRUKTURAL').length
      };

      return { total: list.length, units, ranks, gender, edu, jab };
    };

    return {
      pns: getStatsForType('PNS'),
      cpns: getStatsForType('CPNS'),
      pppk: getStatsForType('PPPK'),
      pppkParuh: getStatsForType('PARUH'),
      tasks: tasks.filter(t => t.bulan === selMonth && Number(t.tahun) === selYear),
      kegiatan: kegiatan.filter(k => {
          const kDate = new Date(k.tanggal);
          return kDate.getFullYear() === selYear && BULAN[kDate.getMonth()] === selMonth;
      })
    };
  }, [pegawai, tasks, kegiatan, selMonth, selYear]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { 
        scale: 3, 
        useCORS: true, 
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add margins to the PDF output
      const marginX = 10; 
      const marginY = 15;
      
      const imgWidth = pdfWidth - (2 * marginX);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pageHeight = pdfHeight - (2 * marginY);
      let heightLeft = imgHeight;
      let position = marginY;

      // Page 1
      pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Additional pages
      while (heightLeft > 0) {
        position = (heightLeft - imgHeight) + marginY;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`LAPORAN_BULANAN_SDM_${selMonth.toUpperCase()}_${selYear}.pdf`);
      logActivity('DOWNLOAD', 'Laporan', `Cetak PDF Nota Dinas Laporan ${selMonth} ${selYear}`);
      setShowSuccess(true);
    } catch (e) { 
      console.error(e);
      alert("Gagal cetak PDF."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handlePrintBrowser = () => {
    window.print();
    logActivity('DOWNLOAD', 'Laporan', `Cetak Browser Nota Dinas Laporan ${selMonth} ${selYear}`);
  };

  const MiniTable = ({ headers, rows }: { headers: string[], rows: (string|number)[][] }) => (
    <table className="w-full border-[1pt] border-black text-center text-[7.5pt] border-collapse my-2 text-black break-inside-avoid">
      <thead className="bg-[#f2f2f2] display-table-header-group">
        <tr className="border-b-[1pt] border-black">
          {headers.map((h, i) => <th key={i} className="border-r-[1pt] border-black p-1 font-bold text-black uppercase">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b-[1pt] border-black last:border-0 break-inside-avoid">
            {row.map((cell, j) => <td key={j} className="border-r-[1pt] border-black p-1 last:border-0 text-black">{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 uppercase">Nota Dinas Laporan Bulanan</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="bi bi-file-earmark-bar-graph text-blue-600"></i> Format Standar Naskah Dinas (A4)
          </p>
        </div>
        <div className="flex gap-3 no-print">
          <button onClick={handlePrintBrowser} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <i className="bi bi-printer-fill text-lg"></i>
            Print Browser
          </button>
          <button onClick={handleDownloadPdf} disabled={loading} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill text-lg"></i>} 
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
         <div className="xl:col-span-4 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
               <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest">Konfigurasi Naskah</h5>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Bulan</label><select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black uppercase" value={selMonth} onChange={e => setSelMonth(e.target.value)}>{BULAN.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tahun</label><input type="number" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black" value={selYear} onChange={e => setSelYear(parseInt(e.target.value))} /></div>
               </div>
               <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Nota Dinas</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black" value={nomorNota} onChange={e => setNomorNota(e.target.value)} /></div>
               <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Nota Dinas</label><input type="date" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-black" value={tanggalNota} onChange={e => setTanggalNota(e.target.value)} /></div>
               <SearchableSelect label="Dari (Pejabat Penandatangan)" options={pegawai.filter(p => (p.status || 'Aktif').trim().toLowerCase() === 'aktif').map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={signatoryNip} onChange={handleSignatoryChange} />
            </div>
         </div>

         <div className="xl:col-span-8 flex justify-center">
            <div className="bg-gray-400/10 p-4 md:p-10 rounded-[2rem] md:rounded-[3rem] overflow-x-auto custom-scrollbar w-full">
               <div ref={pdfRef} className="bg-white shadow-2xl font-arial p-[1.5cm_1.5cm_2cm_2.5cm] md:p-[2cm_2cm_2.5cm_3cm] leading-tight text-black mx-auto" style={{ width: '210mm', minHeight: '297mm', fontSize: '11pt' }}>
                  
                  {/* KOP SURAT RESMI */}
                  <div className="text-center mb-6 text-black">
                     <div className="flex-1 text-center">
                        <p style={{ fontSize: '12pt' }} className="uppercase leading-tight font-normal">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p style={{ fontSize: '12pt' }} className="font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                     </div>
                  </div>
                  
                  <div className="text-center mb-6 text-black">
                     <h1 className="text-[12pt] font-bold uppercase">NOTA DINAS</h1>
                     <p className="text-[11pt] font-normal mt-1 uppercase">NOMOR : {nomorNota}</p>
                  </div>
                  
                  {/* ATRIBUT NOTA DINAS */}
                  <div className="text-[11pt] mb-6 space-y-1.5 leading-snug text-black">
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Yth</span><span>:</span><div className="font-normal">1. Sekretaris Direktorat Jenderal Kekayaan Intelektual<br/>2. Kepala Bagian Program dan Pelaporan</div></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Dari</span><span>:</span><span className="font-normal">Tim Kerja Pengelolaan Sumber Daya Manusia</span></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Hal</span><span>:</span><span className="font-normal">Laporan Bulanan Tim Kerja Pengelolaan Sumber Daya Manusia Bulan {selMonth} {selYear}</span></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Lampiran</span><span>:</span><span>satu berkas</span></div>
                     <div className="grid grid-cols-[80px_10px_1fr]"><span>Tanggal</span><span>:</span><span>{new Date(tanggalNota).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                  </div>
                  
                  <div className="h-[0.5pt] bg-black w-full mb-6"></div> 

                  <div className="text-[11pt] space-y-6 text-justify leading-relaxed text-black">
                     <p>Dengan hormat kami melaporkan hasil pekerjaan Tim Kerja Pengelolaan Sumber Daya Manusia pada bulan {selMonth} {selYear}, sebagai berikut:</p>
                     
                     {/* 1. DATA PEGAWAI */}
                     <section className="space-y-4 break-inside-avoid">
                        <p className="font-bold">1. Data Pegawai</p>
                        
                        {/* 1.1 PNS */}
                        <div className="pl-4 space-y-3 break-inside-avoid">
                           <p className="font-bold">1.1 Data PNS</p>
                           <p>Jumlah PNS DJKI: <span className="font-bold">{stats.pns.total} Orang</span></p>
                           
                           <p className="text-[9pt] font-bold italic">a. Berdasarkan Pangkat</p>
                           <MiniTable 
                             headers={['Pangkat', ...Object.keys(PANGKAT_MAP).slice(4), 'KBP']} 
                             rows={[['Jumlah', ...Object.keys(PANGKAT_MAP).slice(4).map(g => stats.pns.ranks[g]), 0]]} 
                           />

                           <p className="text-[9pt] font-bold italic mt-3">b. Berdasarkan Unit Kerja</p>
                           <div className="grid grid-cols-2 gap-x-4 break-inside-avoid">
                              <MiniTable 
                                headers={['Unit', 'Jumlah']} 
                                rows={UNIT_KERJA.slice(0,4).map(u => [u.replace('Direktorat Jenderal Kekayaan Intelektual', 'DJKI').substring(0, 30), stats.pns.units[u]])}
                              />
                              <MiniTable 
                                headers={['Unit', 'Jumlah']} 
                                rows={UNIT_KERJA.slice(4).map(u => [u.replace('Direktorat Jenderal Kekayaan Intelektual', 'DJKI').substring(0, 30), stats.pns.units[u]])}
                              />
                           </div>

                           <div className="grid grid-cols-2 gap-x-6 mt-4 break-inside-avoid">
                              <div>
                                 <p className="text-[9pt] font-bold italic">c. Berdasarkan Jenis Kelamin</p>
                                 <MiniTable headers={['Jenis Kelamin', 'Laki-Laki', 'Perempuan']} rows={[['Jumlah', stats.pns.gender.L, stats.pns.gender.P]]} />
                              </div>
                              <div>
                                 <p className="text-[9pt] font-bold italic">d. Berdasarkan Jabatan</p>
                                 <MiniTable headers={['Jabatan', 'Struktural', 'JFT', 'Pelaksana']} rows={[['Jumlah', stats.pns.jab.struktural, stats.pns.jab.jft, stats.pns.jab.pelaksana]]} />
                              </div>
                           </div>
                        </div>

                        {/* 1.2 CPNS */}
                        <div className="pl-4 space-y-3 mt-6 break-inside-avoid">
                           <p className="font-bold">1.2 Data CPNS</p>
                           <p>Jumlah CPNS DJKI: <span className="font-bold">{stats.cpns.total} Orang</span></p>
                           <MiniTable 
                                headers={['Unit Kerja Utama', 'Jumlah ASN']} 
                                rows={UNIT_KERJA.filter(u => stats.cpns.units[u] > 0).map(u => [u.toUpperCase(), stats.cpns.units[u]])}
                              />
                        </div>

                        {/* 1.3 PPPK */}
                        <div className="pl-4 space-y-3 mt-6 break-inside-avoid">
                           <p className="font-bold">1.3 Data PPPK</p>
                           <p>Jumlah PPPK DJKI: <span className="font-bold">{stats.pppk.total} Orang</span></p>
                           <MiniTable 
                                headers={['Unit Pengampu', 'Jumlah PPPK']} 
                                rows={UNIT_KERJA.filter(u => stats.pppk.units[u] > 0).map(u => [u.toUpperCase(), stats.pppk.units[u]])}
                              />
                        </div>

                        {/* 1.4 PPPK Paruh Waktu */}
                        <div className="pl-4 space-y-3 mt-6 break-inside-avoid">
                           <p className="font-bold">1.4 Data PPPK Paruh Waktu</p>
                           <p>Jumlah PPPK Paruh Waktu DJKI: <span className="font-bold">{stats.pppkParuh.total} Orang</span></p>
                           <MiniTable 
                                headers={['Unit Pengampu', 'Jumlah PPPK Paruh Waktu']} 
                                rows={UNIT_KERJA.filter(u => stats.pppkParuh.units[u] > 0).map(u => [u.toUpperCase(), stats.pppkParuh.units[u]])}
                              />
                        </div>
                     </section>

                     {/* 2. TUGAS RUTIN */}
                     <section className="space-y-4 pt-4 text-black break-inside-avoid">
                        <p className="font-bold">2. Tugas Rutin Kepegawaian</p>
                        {(() => {
                           // Group tasks by jenis
                           const grouped = stats.tasks.reduce((acc, t) => {
                              if (!acc[t.jenis]) acc[t.jenis] = [];
                              acc[t.jenis].push(t);
                              return acc;
                           }, {} as Record<string, TugasRutin[]>);

                           const groupEntries = Object.entries(grouped);

                           if (groupEntries.length === 0) {
                              return <p className="pl-4 italic text-black opacity-60">Tidak ada realisasi tugas rutin yang dilaporkan.</p>;
                           }

                           return groupEntries.map(([jenis, typeTasks], groupIdx) => {
                              // Get unique keys from data across all tasks of this type
                              const allDataKeys = Array.from(new Set(
                                 typeTasks.flatMap(t => Object.keys(t.data || {}))
                              )).filter(k => k);

                              return (
                                 <div key={jenis} className="pl-2 mb-8 break-inside-avoid">
                                    <p className="font-bold text-[10.5pt] text-black mb-2 uppercase">2.{groupIdx + 1} {TASK_LABELS[jenis as TaskType] || jenis}</p>
                                    <table className="w-full border-[1pt] border-black text-[7.5pt] border-collapse text-black">
                                       <thead className="bg-[#f2f2f2] font-bold text-center display-table-header-group">
                                          <tr className="border-b-[1pt] border-black">
                                             <th className="p-1 border-r-[1pt] border-black w-6">No.</th>
                                             {allDataKeys.map(k => (
                                                <th key={k} className="p-1 border-r-[1pt] border-black uppercase text-[7pt]">{k.replace(/_/g, ' ')}</th>
                                             ))}
                                             <th className="p-1 border-r-[1pt] border-black uppercase text-[7.5pt]">Deskripsi Pelaksanaan</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {typeTasks.map((t, i) => (
                                             <tr key={t.id} className="border-b-[1pt] border-black last:border-0 align-top break-inside-avoid">
                                                <td className="p-1 border-r-[1pt] border-black text-center">{i + 1}</td>
                                                {allDataKeys.map(k => (
                                                   <td key={k} className="p-1 border-r-[1pt] border-black text-center">
                                                      {(t.data as any)?.[k] || '-'}
                                                   </td>
                                                ))}
                                                <td className="p-1 text-justify italic leading-snug">{t.detail || '-'}</td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              );
                           });
                        })()}
                     </section>

                     {/* 3. KEGIATAN */}
                     <section className="space-y-4 pt-4 text-black break-inside-avoid">
                        <p className="font-bold">3. Kegiatan</p>
                        <table className="w-full border-[1pt] border-black text-[7.5pt] border-collapse text-black">
                           <thead className="bg-[#f2f2f2] font-bold text-center display-table-header-group">
                              <tr className="border-b-[1pt] border-black">
                                 <th className="p-1 border-r-[1pt] border-black w-6 text-black">No.</th>
                                 <th className="p-1 border-r-[1pt] border-black w-24 text-black uppercase">Tanggal</th>
                                 <th className="p-1 border-r-[1pt] border-black text-black uppercase">Judul Kegiatan</th>
                                 <th className="p-1 border-r-[1pt] border-black text-black uppercase">Tempat</th>
                                 <th className="p-1 border-r-[1pt] border-black w-10 text-black uppercase">Peserta</th>
                                 <th className="p-1 text-black uppercase">Laporan Singkat</th>
                              </tr>
                           </thead>
                           <tbody>
                              {stats.kegiatan.map((k, i) => (
                                 <tr key={k.id} className="border-b-[1pt] border-black last:border-0 align-top break-inside-avoid">
                                    <td className="p-1 border-r-[1pt] border-black text-center text-black">{i+1}</td>
                                    <td className="p-1 border-r-[1pt] border-black text-black">{k.tanggal}</td>
                                    <td className="p-1 border-r-[1pt] border-black font-bold uppercase text-black">{k.judulKegiatan}</td>
                                    <td className="p-1 border-r-[1pt] border-black text-black">{k.tempat}</td>
                                    <td className="p-1 border-r-[1pt] border-black text-center text-black">{k.jumlahPeserta}</td>
                                    <td className="p-1 text-justify leading-snug text-black">{k.laporanSingkat}</td>
                                 </tr>
                              ))}
                              {stats.kegiatan.length === 0 && <tr><td colSpan={6} className="p-4 text-center italic text-black opacity-60">Tidak ada kegiatan yang tercatat.</td></tr>}
                           </tbody>
                        </table>
                     </section>

                     {/* PENUTUP */}
                     <div className="pt-6 text-black break-inside-avoid">
                        <p>Terkait dengan hal-hal yang kami laporkan, mohon kiranya Bapak berkenan memberikan arahan lebih lanjut.</p>
                        <p className="mt-2">Atas perhatian dan perkenan Bapak, kami ucapkan terima kasih.</p>
                     </div>

                     {/* TANDA TANGAN */}
                     <div className="mt-14 ml-[55%] text-left text-[10.5pt] leading-tight text-black break-inside-avoid">
                        <p className="font-normal text-black">Ketua Tim Kerja Pengelolaan Sumber Daya Manusia,</p>
                        <div className="h-24"></div>
                        <p className="font-normal text-black font-bold">{formatSignatoryName(signatoryData.nama)}</p>
                        <p className="mt-1 text-black">NIP {signatoryNip}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <style>{`
        .font-arial { font-family: Arial, Helvetica, sans-serif !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0; }
          .xl\\:col-span-8 { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .bg-gray-400\\/10 { background: none !important; padding: 0 !important; border-radius: 0 !important; width: 100% !important; }
          .shadow-2xl { shadow: none !important; box-shadow: none !important; }
          .font-arial { 
            width: 210mm !important; 
            min-height: 297mm !important; 
            padding: 2cm 2cm 2.5cm 3cm !important; 
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
          }
          .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
          .display-table-header-group { display: table-header-group !important; }
        }
      `}</style>
    </div>
  );
};

export default LaporanPage;
