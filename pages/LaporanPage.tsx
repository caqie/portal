
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Laporan, TugasRutin, Kegiatan, Pegawai } from '../types';
import { BULAN, UNIT_KERJA, normalizeUnitName, DEFAULT_LOGO, TASK_LABELS } from '../constants';
import { fetchPegawaiFromSheets, fetchTugasRutinFromSheets, fetchKegiatanFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
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
  
  // Signatory State - Default ke Sekretaris (ID NIP Contoh)
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
    // 1. Hitung Statistik Pegawai (Analitik)
    const analytics = UNIT_KERJA.map(unit => {
      const perUnit = pegawai.filter(p => normalizeUnitName(p.unitKerja) === unit && p.status === 'Aktif');
      return {
        unit,
        pns: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PNS').length,
        pppk: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PPPK').length,
        pppkParuh: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PARUH')).length,
        total: perUnit.length
      };
    });

    // 2. Global Gender Stats
    const activePegawai = pegawai.filter(p => p.status === 'Aktif');
    const gender = {
      pria: activePegawai.filter(p => p.gender === 'L').length,
      wanita: activePegawai.filter(p => p.gender === 'P').length
    };

    // 3. Global Education Stats
    const educationMap: Record<string, number> = {};
    activePegawai.forEach(p => {
      let edu = 'LAINNYA';
      const pStr = (p.pendidikan || '').toUpperCase().trim();
      if (pStr.includes('S3')) edu = 'S3';
      else if (pStr.includes('S2')) edu = 'S2';
      else if (pStr.includes('S1')) edu = 'S1';
      else if (pStr.includes('DIV')) edu = 'D-IV';
      else if (pStr.includes('DIII') || pStr.includes('D3')) edu = 'D-III';
      else if (pStr.includes('SMA') || pStr.includes('SMK') || pStr.includes('SLTA')) edu = 'SMA/SMK';
      else if (pStr !== '') edu = pStr;
      educationMap[edu] = (educationMap[edu] || 0) + 1;
    });
    const education = Object.entries(educationMap).map(([label, count]) => ({ label, count })).sort((a,b) => b.count - a.count);

    // 4. Filter Tugas Rutin & Kegiatan
    const filteredTasks = tasks.filter(t => t.bulan === selMonth && Number(t.tahun) === selYear);
    const filteredKegiatan = kegiatan.filter(k => {
      if (!k.tanggal) return false;
      const d = new Date(k.tanggal);
      return BULAN[d.getMonth()] === selMonth && d.getFullYear() === selYear;
    });

    return { analytics, gender, education, filteredTasks, filteredKegiatan };
  }, [pegawai, tasks, kegiatan, selMonth, selYear]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
      pdf.save(`LAPORAN_BULANAN_${selMonth.toUpperCase()}_${selYear}.pdf`);
      saveToHistory('PDF');
      logActivity('DOWNLOAD', 'Laporan', `Download PDF Laporan ${selMonth} ${selYear}`);
    } catch (e) {
      alert("Gagal mengunduh PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    try {
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Statistik Pegawai
        const statsData = reportData.analytics.map(a => ({
          'Unit Kerja': a.unit,
          'PNS': a.pns,
          'PPPK (Penuh Waktu)': a.pppk,
          'PPPK (Paruh Waktu)': a.pppkParuh,
          'Total ASN Aktif': a.total
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statsData), "Statistik Unit Kerja");

        // Sheet 2: Distribusi Gender & Pendidikan
        const genderData = [
          { Kategori: 'Laki-laki', Jumlah: reportData.gender.pria },
          { Kategori: 'Perempuan', Jumlah: reportData.gender.wanita }
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(genderData), "Distribusi Gender");
        
        const eduData = reportData.education.map(e => ({ 'Jenjang Pendidikan': e.label, 'Jumlah ASN': e.count }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eduData), "Sebaran Pendidikan");

        // Sheet 3: Tugas Rutin
        const tasksData = reportData.filteredTasks.map(t => {
          const base = { 'Kategori': TASK_LABELS[t.jenis] || t.jenis, 'Periode': `${t.bulan} ${t.tahun}`, 'Narasi': t.detail || '-' };
          const extra = (t.data && typeof t.data === 'object') ? t.data : {};
          return { ...base, ...extra };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasksData), "Tugas Rutin");

        XLSX.writeFile(wb, `LAPORAN_SDM_KONSOLIDASI_${selMonth.toUpperCase()}_${selYear}.xlsx`);
        saveToHistory('EXCEL');
        logActivity('DOWNLOAD', 'Laporan', `Download Excel Laporan ${selMonth} ${selYear}`);
    } catch(err) {
        alert("Gagal mengekspor Excel.");
    }
  };

  const saveToHistory = (format: string) => {
    const newLap: Laporan = { 
      id: Date.now().toString(), 
      judul: `LAPORAN KONSOLIDASI ${selMonth.toUpperCase()} ${selYear}`, 
      jenis: format, 
      periode: selMonth, 
      tahun: selYear, 
      status: 'Generated', 
      createdAt: new Date().toISOString() 
    };
    const updated = [newLap, ...laporanHistory].slice(0, 20);
    setLaporanHistory(updated);
    localStorage.setItem('portal_laporan_history', JSON.stringify(updated));
    setShowSuccess(true);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Dokumen Berhasil" message="Laporan telah berhasil di-generate dan diunduh." />
      
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
                    <SearchableSelect label="Penandatangan" options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={signatoryNip} onChange={handleSignatoryChange} />
                 </div>
                 <div className="space-y-3 pt-4">
                    <button onClick={handleDownloadPdf} disabled={loading} className="w-full py-5 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                        {loading ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>} Unduh PDF Resmi
                    </button>
                    <button onClick={handleDownloadExcel} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                        <i className="bi bi-file-earmark-spreadsheet-fill"></i> Unduh Excel Terpadu
                    </button>
                 </div>
              </div>
           </div>

           <div className="xl:col-span-8 overflow-hidden">
              <div className="bg-gray-200 py-10 rounded-[3.5rem] flex flex-col items-center overflow-x-auto custom-scrollbar">
                 <div ref={pdfRef} className="bg-white shadow-2xl text-black font-arial p-[1.5cm_1.8cm] leading-tight" style={{ width: '210mm', minHeight: '330mm' }}>
                    <div className="flex items-center border-b-[3pt] border-black pb-4 mb-8">
                       <img src={DEFAULT_LOGO} className="h-20 w-auto mr-6" crossOrigin="anonymous" style={{ filter: 'grayscale(100%)' }} />
                       <div className="text-center flex-1">
                          <p className="text-[13pt] font-bold uppercase text-black">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                          <p className="text-[13pt] font-bold uppercase text-black">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                          <p className="text-[9pt] text-black">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                       </div>
                    </div>

                    <div className="text-center mb-8">
                       <h1 className="text-[14pt] font-bold uppercase underline text-black">LAPORAN KONSOLIDASI DATA SDM</h1>
                       <p className="text-[11pt] font-bold mt-1 uppercase text-black">PERIODE: {selMonth} {selYear}</p>
                    </div>

                    <div className="text-[10pt] space-y-10">
                       <section>
                          <p className="font-bold border-b border-black mb-3 pb-1 text-black uppercase">I. STATISTIK ASN PER UNIT KERJA</p>
                          <table className="w-full border-collapse border-2 border-black text-[8pt] text-black">
                             <thead className="bg-gray-100 font-bold text-black border-b-2 border-black">
                                <tr className="text-center">
                                   <th className="border border-black p-2 w-8 text-black">NO</th>
                                   <th className="border border-black p-2 text-left text-black">UNIT KERJA</th>
                                   <th className="border border-black p-2 w-16 text-black">PNS</th>
                                   <th className="border border-black p-2 w-20 text-black">PPPK (PW)</th>
                                   <th className="border border-black p-2 w-20 text-black">PPPK (PARUH)</th>
                                   <th className="border border-black p-2 w-16 text-black font-black">TOTAL</th>
                                </tr>
                             </thead>
                             <tbody>
                                {reportData.analytics.map((a, i) => (
                                   <tr key={i} className="border-b border-black last:border-0">
                                      <td className="border border-black p-2 text-center text-black">{i+1}</td>
                                      <td className="border border-black p-2 uppercase text-[7pt] text-black font-bold">{a.unit}</td>
                                      <td className="border border-black p-2 text-center text-black">{a.pns}</td>
                                      <td className="border border-black p-2 text-center text-black">{a.pppk}</td>
                                      <td className="border border-black p-2 text-center font-black text-black">{a.pppkParuh}</td>
                                      <td className="border border-black p-2 text-center font-black text-black bg-gray-50">{a.total}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </section>

                       <section className="grid grid-cols-2 gap-8 text-black">
                          <div>
                            <p className="font-bold border-b border-black mb-3 pb-1 uppercase text-black">II. Distribusi Gender</p>
                            <table className="w-full border-collapse border-2 border-black text-[9pt] text-black">
                                <tbody className="font-bold text-black">
                                    <tr className="border-b border-black">
                                      <td className="border border-black p-2 bg-gray-50 uppercase text-black">Laki-Laki</td>
                                      <td className="border border-black p-2 text-center text-black">{reportData.gender.pria}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                      <td className="border border-black p-2 bg-gray-50 uppercase text-black">Perempuan</td>
                                      <td className="border border-black p-2 text-center text-black">{reportData.gender.wanita}</td>
                                    </tr>
                                    <tr className="bg-gray-100 font-black">
                                        <td className="border border-black p-2 uppercase text-black">TOTAL ASN AKTIF</td>
                                        <td className="border border-black p-2 text-center text-black font-black">{reportData.gender.pria + reportData.gender.wanita}</td>
                                    </tr>
                                </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="font-bold border-b border-black mb-3 pb-1 uppercase text-black">III. Sebaran Pendidikan</p>
                            <table className="w-full border-collapse border-2 border-black text-[8.5pt] text-black">
                                <thead>
                                    <tr className="bg-gray-100 font-bold text-black border-b-2 border-black">
                                        <th className="border border-black p-1 text-left text-black">JENJANG</th>
                                        <th className="border border-black p-1 w-16 text-black">JML</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.education.slice(0, 6).map((e, idx) => (
                                        <tr key={idx} className="border-b border-black last:border-0 text-black">
                                          <td className="border border-black p-1 px-2 text-black font-bold uppercase">{e.label}</td>
                                          <td className="border border-black p-1 text-center font-black text-black">{e.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                          </div>
                       </section>

                       <section className="text-black">
                          <p className="font-bold border-b border-black mb-3 pb-1 text-black uppercase">IV. CAPAIAN TUGAS RUTIN BULANAN</p>
                          <table className="w-full border-collapse border-2 border-black text-[9pt] text-black">
                             <thead className="bg-gray-100 font-bold text-black border-b-2 border-black">
                                <tr>
                                   <th className="border border-black p-2 w-10 text-center text-black">NO</th>
                                   <th className="border border-black p-2 text-left text-black uppercase">KATEGORI TUGAS</th>
                                   <th className="border border-black p-2 text-left text-black uppercase">RINGKASAN AKTIVITAS</th>
                                </tr>
                             </thead>
                             <tbody className="text-black">
                                {reportData.filteredTasks.length > 0 ? reportData.filteredTasks.map((t, i) => (
                                   <tr key={t.id} className="border-b border-black last:border-0 text-black">
                                      <td className="border border-black p-2 text-center align-top text-black">{i+1}</td>
                                      <td className="border border-black p-2 font-black uppercase w-1/3 text-black">{TASK_LABELS[t.jenis] || t.jenis}</td>
                                      <td className="border border-black p-2 italic leading-normal text-black font-bold">
                                        {t.detail || 'Terlaksana sesuai prosedur.'}
                                        <div className="mt-1 text-[7pt] font-black not-italic text-black">
                                            {t.data && typeof t.data === 'object' && Object.entries(t.data)
                                                .filter(([k,v]) => v && !k.toLowerCase().includes('link'))
                                                .map(([k,v]) => `${k.replace(/_/g,' ')}: ${v}`)
                                                .join(' | ')
                                            }
                                        </div>
                                      </td>
                                   </tr>
                                )) : (
                                   <tr><td colSpan={3} className="border border-black p-4 text-center italic text-black font-bold">Tidak ada log tugas rutin yang tercatat.</td></tr>
                                )}
                             </tbody>
                          </table>
                       </section>

                       <div className="mt-14 ml-[55%] text-center leading-normal text-black">
                          <p className="text-black">Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                          <p className="font-bold mt-2 mb-24 uppercase text-black">{signatoryData.jabatan},</p>
                          <p className="font-bold uppercase underline text-black">{signatoryData.nama}</p>
                          <p className="text-black font-bold">NIP {signatoryNip}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
            <table className="w-full text-left">
                <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr>
                        <th className="px-10 py-5">Judul Laporan</th>
                        <th className="px-4 py-5 text-center">Format</th>
                        <th className="px-4 py-5 text-center">Periode</th>
                        <th className="px-10 py-5 text-right">Tanggal Generate</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {laporanHistory.length > 0 ? laporanHistory.map(h => (
                        <tr key={h.id} className="hover:bg-blue-50/5 transition-colors">
                            <td className="px-10 py-6"><p className="text-[11px] font-black text-gray-950 uppercase">{h.judul}</p></td>
                            <td className="px-4 py-6 text-center">
                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${h.jenis==='PDF' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{h.jenis}</span>
                            </td>
                            <td className="px-4 py-6 text-center"><p className="text-[10px] font-bold text-gray-500 uppercase">{h.periode} {h.tahun}</p></td>
                            <td className="px-10 py-6 text-right"><p className="text-[10px] font-black text-gray-400">{new Date(h.createdAt).toLocaleString('id-ID')}</p></td>
                        </tr>
                    )) : (
                        <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Belum ada riwayat generate laporan</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default LaporanPage;
