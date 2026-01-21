
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList 
} from 'recharts';
import { fetchPegawaiFromSheets, calculateRetirementDate } from '../spreadsheetService';
import { Pegawai } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import * as XLSX from 'xlsx';

const COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatsCard = ({ title, value, icon, color, loading, subValue }: { title: string, value: string | number, icon: string, color: string, loading?: boolean, subValue?: string }) => (
  <div className="bg-white p-6 md:p-7 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-gray-100 flex items-center space-x-5 md:space-x-6 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
    <div className={`h-14 w-14 md:h-16 md:w-16 rounded-[1.5rem] md:rounded-3xl flex items-center justify-center text-white shadow-xl shrink-0 ${color} relative z-10`}>
      <i className={`bi ${icon} text-2xl md:text-3xl`}></i>
    </div>
    <div className="min-w-0 flex-1 relative z-10">
      <p className="text-[9px] md:text-[11px] text-gray-500 font-black uppercase tracking-[0.2em] truncate mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-20 bg-gray-50 animate-pulse rounded-xl"></div>
      ) : (
        <>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tighter leading-none">{value}</h3>
          {subValue && <p className="text-[8px] md:text-[9px] font-black text-blue-600 uppercase mt-2 tracking-widest">{subValue}</p>}
        </>
      )}
    </div>
    <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${color.replace('bg-', 'bg-')}`}></div>
  </div>
);

const Dashboard = () => {
  const { user, logActivity } = useAuth();
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'pensiun' | 'kgb' | 'pangkat'>('pensiun');
  const [jobFilterUnit, setJobFilterUnit] = useState('Semua Unit');

  useEffect(() => {
    loadDashboardData();
    window.addEventListener('storage_updated', loadDashboardData);
    return () => window.removeEventListener('storage_updated', loadDashboardData);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const pegData = await fetchPegawaiFromSheets();
      setPegawai(pegData);
    } catch (error) {
      const saved = localStorage.getItem('portal_pegawai_db');
      if (saved) setPegawai(JSON.parse(saved));
    } finally {
      setLoading(false);
    }
  };

  const activePegawaiList = useMemo(() => {
    return pegawai.filter(p => {
      const s = (p.status || 'Aktif').trim().toLowerCase();
      return s !== 'tidak aktif' && s !== 'pensiun';
    });
  }, [pegawai]);

  const categorizedNotifs = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const data = { pensiun: [] as any[], kgb: [] as any[], pangkat: [] as any[] };
    const pnsOnly = pegawai.filter(p => p.jenisPegawai === 'PNS');

    pnsOnly.forEach(p => {
      try {
        const retirementDate = calculateRetirementDate(p.nip, p.jabatan);
        if (retirementDate && retirementDate.getFullYear() === currentYear) {
          data.pensiun.push({ id: p.nip, nip: p.nip, name: p.nama, category: 'BUP PENSIUN', info: retirementDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), color: 'text-rose-600', bg: 'bg-rose-50' });
        }
        if (p.tmtStatus) {
          const tmtDate = new Date(p.tmtStatus);
          if (!isNaN(tmtDate.getTime()) && (currentYear - tmtDate.getFullYear()) % 2 === 0) {
            data.kgb.push({ id: p.nip, nip: p.nip, name: p.nama, category: 'KGB BERKALA', info: `Jatuh Tempo: ${currentYear}`, color: 'text-emerald-600', bg: 'bg-emerald-50' });
          }
        }
        if (p.tmtPangkat) {
          const tmtPkt = new Date(p.tmtPangkat);
          if (!isNaN(tmtPkt.getTime())) {
            const selisih = currentYear - tmtPkt.getFullYear();
            if (selisih > 0 && selisih % 4 === 0) {
              data.pangkat.push({ id: p.nip, nip: p.nip, name: p.nama, category: 'KP REGULER', info: `Gol: ${p.golRuang}`, color: 'text-blue-600', bg: 'bg-blue-50' });
            }
          }
        }
      } catch (e) {}
    });
    return data;
  }, [pegawai]);

  const totalNotifs = categorizedNotifs.pensiun.length + categorizedNotifs.kgb.length + categorizedNotifs.pangkat.length;

  const genderData = useMemo(() => [
    { name: 'LAKI-LAKI', value: activePegawaiList.filter(p => p.gender === 'L').length },
    { name: 'PEREMPUAN', value: activePegawaiList.filter(p => p.gender === 'P').length }
  ], [activePegawaiList]);

  const educationData = useMemo(() => {
    const counts: Record<string, number> = {};
    activePegawaiList.forEach(p => {
      const eduRaw = (p.pendidikan || 'LAINNYA').toUpperCase();
      let label = 'LAINNYA';
      if (eduRaw.startsWith('S3')) label = 'S3';
      else if (eduRaw.startsWith('S2')) label = 'S2';
      else if (eduRaw.startsWith('S1')) label = 'S1';
      else if (eduRaw.startsWith('DIV')) label = 'D4';
      else if (eduRaw.startsWith('DIII')) label = 'D3';
      else if (eduRaw.includes('SLTA') || eduRaw.includes('SMA')) label = 'SLTA';
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [activePegawaiList]);

  const sebaranStatusUnit = useMemo(() => {
    return UNIT_KERJA.map(unit => {
      const members = activePegawaiList.filter(p => normalizeUnitName(p.unitKerja) === unit);
      return {
        unit,
        pns: members.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PNS').length,
        cpns: members.filter(p => (p.jenisPegawai || '').toUpperCase() === 'CPNS').length,
        pppkFull: members.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PPPK').length,
        pppkPart: members.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PARUH WAKTU')).length,
        total: members.length
      };
    });
  }, [activePegawaiList]);

  const sebaranNamaJabatan = useMemo(() => {
    const jobCounts: Record<string, number> = {};
    const filteredForJobs = jobFilterUnit === 'Semua Unit' 
      ? activePegawaiList 
      : activePegawaiList.filter(p => normalizeUnitName(p.unitKerja) === jobFilterUnit);

    filteredForJobs.forEach(p => {
      const job = (p.jabatan || 'TIDAK TERIDENTIFIKASI').toUpperCase();
      jobCounts[job] = (jobCounts[job] || 0) + 1;
    });
    return Object.entries(jobCounts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [activePegawaiList, jobFilterUnit]);

  const handleDownloadDashboard = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Kekuatan Unit
    const unitData = sebaranStatusUnit.map(u => ({
      'Unit Kerja': u.unit,
      'PNS': u.pns,
      'CPNS': u.cpns,
      'PPPK': u.pppkFull,
      'PPPK Paruh Waktu': u.pppkPart,
      'Total': u.total
    }));
    const wsUnit = XLSX.utils.json_to_sheet(unitData);
    XLSX.utils.book_append_sheet(wb, wsUnit, "Kekuatan Unit");

    // Sheet 2: Demografi
    const demoData = [
      { 'Kategori': 'Gender: Laki-laki', 'Jumlah': genderData[0].value },
      { 'Kategori': 'Gender: Perempuan', 'Jumlah': genderData[1].value },
      { 'Kategori': '---', 'Jumlah': '---' },
      ...educationData.map(e => ({ 'Kategori': `Pendidikan: ${e.name}`, 'Jumlah': e.value }))
    ];
    const wsDemo = XLSX.utils.json_to_sheet(demoData);
    XLSX.utils.book_append_sheet(wb, wsDemo, "Statistik Demografi");

    // Sheet 3: Sebaran Jabatan (Mendalam dengan breakdown per Unit)
    const jobDetailedData: any[] = [];
    
    sebaranNamaJabatan.forEach(j => {
      // Ambil seluruh pegawai dengan jabatan ini
      const employeesWithThisJob = activePegawaiList.filter(p => (p.jabatan || '').toUpperCase() === j.name);
      
      // Buat distribusi unit untuk jabatan ini
      const distribution: Record<string, number> = {};
      employeesWithThisJob.forEach(p => {
        const u = normalizeUnitName(p.unitKerja);
        distribution[u] = (distribution[u] || 0) + 1;
      });

      // Jika sedang difilter, hanya tampilkan unit tersebut
      const unitsToProcess = jobFilterUnit === 'Semua Unit' 
        ? Object.keys(distribution) 
        : Object.keys(distribution).filter(u => u === jobFilterUnit);

      unitsToProcess.forEach(unitName => {
        jobDetailedData.push({
          'Nama Jabatan': j.name,
          'Unit Kerja': unitName,
          'Jumlah di Unit Ini': distribution[unitName],
          'Total Keseluruhan (Sesuai Filter UI)': j.total
        });
      });
    });

    const wsJob = XLSX.utils.json_to_sheet(jobDetailedData);
    XLSX.utils.book_append_sheet(wb, wsJob, "Sebaran Jabatan Per Unit");

    // Sheet 4: Agenda Prioritas
    const agendaData: any[] = [];
    categorizedNotifs.pensiun.forEach(a => agendaData.push({ 'Tipe': 'PENSIUN', 'NIP': ` ${a.nip}`, 'Nama': a.name, 'Keterangan': a.info }));
    categorizedNotifs.kgb.forEach(a => agendaData.push({ 'Tipe': 'KGB', 'NIP': ` ${a.nip}`, 'Nama': a.name, 'Keterangan': a.info }));
    categorizedNotifs.pangkat.forEach(a => agendaData.push({ 'Tipe': 'PANGKAT', 'NIP': ` ${a.nip}`, 'Nama': a.name, 'Keterangan': a.info }));
    
    const wsAgenda = XLSX.utils.json_to_sheet(agendaData);
    XLSX.utils.book_append_sheet(wb, wsAgenda, "Agenda Prioritas 2025");

    // Execute Download
    const fileName = `DASHBOARD_ANALYTICS_SDM_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    logActivity('DOWNLOAD', 'Dashboard', 'Mengekspor rekapitulasi dashboard mendetail ke Excel');
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn relative pb-24 lg:pb-0">
      {/* MOBILE NOTIF BUTTON */}
      <button 
        onClick={() => setIsNotifOpen(true)}
        className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 z-[110] h-14 w-14 md:h-16 md:w-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
      >
        <div className="absolute -top-1 -right-1 h-6 w-6 bg-rose-600 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-lg">
          {totalNotifs}
        </div>
        <i className="bi bi-bell-fill text-xl md:text-2xl"></i>
      </button>

      {/* Header with Download Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter leading-none">Real-time Analytics</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Monitoring Kekuatan SDM DJKI Secara Komprehensif</p>
        </div>
        <button 
          onClick={handleDownloadDashboard}
          className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-3 active:scale-95"
        >
          <i className="bi bi-file-earmark-excel-fill text-lg"></i>
          <span>Unduh Analytics</span>
        </button>
      </div>

      {/* Responsive Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-8">
        <StatsCard title="Personel Aktif" value={activePegawaiList.length} icon="bi-people-fill" color="bg-blue-600" loading={loading} subValue="Status Terverifikasi" />
        <StatsCard title="Total PNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase()==='PNS').length} icon="bi-person-vcard-fill" color="bg-indigo-600" loading={loading} subValue="ASN Definitif" />
        <StatsCard title="Total CPNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase()==='CPNS').length} icon="bi-person-badge-fill" color="bg-amber-600" loading={loading} subValue="Masa Percobaan" />
        <StatsCard title="Total PPPK" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase()==='PPPK').length} icon="bi-person-gear-fill" color="bg-emerald-600" loading={loading} subValue="Kontrak Kerja" />
        <StatsCard title="Paruh Waktu" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase().includes('PARUH WAKTU')).length} icon="bi-person-workspace" color="bg-cyan-600" loading={loading} subValue="PPPK Terbatas" />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
        <div className="lg:col-span-4 bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
           <div className="mb-6 md:mb-10">
              <h4 className="text-[14px] md:text-[16px] font-black text-gray-950 uppercase tracking-[0.25em] leading-none">Peta Gender</h4>
              <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase mt-2 md:mt-3 tracking-widest">Komposisi Jenis Kelamin</p>
           </div>
           <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={genderData} cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" paddingAngle={5} dataKey="value">
                   {genderData.map((e, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                 </Pie>
                 <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: '900' }} />
                 <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase' }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
           <div className="mb-6 md:mb-10">
              <h4 className="text-[14px] md:text-[16px] font-black text-gray-950 uppercase tracking-[0.25em] leading-none">Statistik Pendidikan</h4>
              <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase mt-2 md:mt-3 tracking-widest">Kualifikasi Akademik ASN</p>
           </div>
           <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={educationData} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} style={{ fontSize: '9px', fontWeight: '900', fill: '#64748b' }} />
                 <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', fontSize: '10px' }} />
                 <Bar dataKey="value" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={16}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: '#2563eb' }} />
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Adaptive Table: Sebaran Status */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 md:px-12 py-8 md:py-10 border-b border-gray-50 bg-emerald-50/20 flex justify-between items-center">
           <div>
              <h4 className="text-[14px] md:text-[16px] font-black text-gray-950 uppercase tracking-[0.2em]">Kekuatan Unit</h4>
              <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase mt-2 tracking-widest">Distribusi ASN Per Unit Kerja</p>
           </div>
           <div className="h-10 w-10 md:h-12 md:w-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><i className="bi bi-diagram-3-fill text-xl"></i></div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left min-w-[800px]">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[7px] md:text-[9px] font-black border-b tracking-widest border-gray-100">
                 <tr>
                    <th className="px-6 md:px-12 py-5 md:py-6">Direktorat / Unit</th>
                    <th className="px-3 py-5 text-center">PNS</th>
                    <th className="px-3 py-5 text-center">CPNS</th>
                    <th className="px-3 py-5 text-center">PPPK</th>
                    <th className="px-3 py-5 text-center">PPPK PW</th>
                    <th className="px-6 md:px-12 py-5 text-right">Total</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {sebaranStatusUnit.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/10 transition-colors group">
                       <td className="px-6 md:px-12 py-4 md:py-5"><p className="text-[11px] md:text-[12px] font-black text-gray-900 uppercase leading-tight group-hover:text-emerald-700">{row.unit}</p></td>
                       <td className="px-3 py-4 text-center font-bold text-gray-600 text-[11px]">{row.pns}</td>
                       <td className="px-3 py-4 text-center font-bold text-gray-600 text-[11px]">{row.cpns}</td>
                       <td className="px-3 py-4 text-center font-bold text-gray-600 text-[11px]">{row.pppkFull}</td>
                       <td className="px-3 py-4 text-center font-bold text-gray-600 text-[11px]">{row.pppkPart}</td>
                       <td className="px-6 md:px-12 py-4 text-right"><span className="inline-block px-4 md:px-5 py-1.5 bg-blue-50 text-blue-600 text-[11px] md:text-[12px] font-black rounded-xl border border-blue-100">{row.total}</span></td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      {/* Adaptive Grid for Job Distribution */}
      <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 md:px-12 py-8 md:py-10 border-b border-gray-50 bg-gray-950 flex flex-col md:flex-row justify-between items-center gap-6 text-white">
           <div>
              <h4 className="text-[14px] md:text-[16px] font-black uppercase tracking-[0.2em]">Nomenklatur Jabatan</h4>
              <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase mt-2 tracking-widest">Detail Personel Berdasarkan Jabatan</p>
           </div>
           <select 
              className="w-full md:w-auto bg-white/10 border border-white/20 rounded-2xl px-6 py-3 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/30 text-white cursor-pointer"
              value={jobFilterUnit}
              onChange={(e) => setJobFilterUnit(e.target.value)}
           >
              <option className="bg-gray-900 text-white" value="Semua Unit">Seluruh Unit Kerja</option>
              {UNIT_KERJA.map(u => <option key={u} className="bg-gray-900 text-white" value={u}>{u.toUpperCase()}</option>)}
           </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 md:p-8 overflow-y-auto max-h-[500px] custom-scrollbar bg-gray-50/50">
           {sebaranNamaJabatan.map((job, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-blue-300 transition-all hover:shadow-lg group">
                 <p className="text-[10px] md:text-[11px] font-black text-gray-900 uppercase leading-tight pr-4">{job.name}</p>
                 <span className="h-10 w-10 md:h-12 md:w-12 bg-blue-50 text-blue-600 text-[12px] md:text-[14px] font-black rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{job.total}</span>
              </div>
           ))}
           {sebaranNamaJabatan.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-20">
                 <i className="bi bi-search text-5xl mb-4 block"></i>
                 <p className="text-[11px] font-black uppercase tracking-widest">Data Tidak Ditemukan</p>
              </div>
           )}
        </div>
      </div>

      {/* RESPONSIVE NOTIFICATION MODAL */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-10">
          <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-xl animate-fadeIn" onClick={() => setIsNotifOpen(false)}></div>
          <div className="relative bg-white w-full max-w-4xl h-[90vh] md:h-auto md:max-h-[85dvh] rounded-t-[3rem] md:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter border border-white/20">
            <div className="px-8 md:px-12 py-8 md:py-10 border-b border-gray-100 bg-gray-50 shrink-0">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tighter">Agenda Prioritas</h3>
                  <button onClick={() => setIsNotifOpen(false)} className="h-10 w-10 md:h-12 md:w-12 bg-white border border-gray-100 rounded-full text-gray-400 flex items-center justify-center hover:text-rose-600 shadow-sm transition-all"><i className="bi bi-x-lg text-lg"></i></button>
               </div>
               <div className="flex bg-white p-1.5 rounded-[1.5rem] md:rounded-[2rem] shadow-inner border border-gray-100 overflow-x-auto no-scrollbar">
                  {[
                    {id:'pensiun', label:'Pensiun', count:categorizedNotifs.pensiun.length, color:'rose'},
                    {id:'kgb', label:'KGB', count:categorizedNotifs.kgb.length, color:'emerald'},
                    {id:'pangkat', label:'Pangkat', count:categorizedNotifs.pangkat.length, color:'blue'}
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setActiveNotifTab(tab.id as any)} 
                      className={`flex-1 min-w-[100px] px-4 md:px-8 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeNotifTab === tab.id ? `bg-${tab.color}-600 text-white shadow-lg` : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-white">
               <div className="space-y-4 animate-fadeIn">
                  {categorizedNotifs[activeNotifTab].map((agenda: any) => (
                    <div key={agenda.id} className="p-5 md:p-6 bg-gray-50 rounded-3xl border border-gray-100 flex flex-col md:flex-row justify-between items-center group hover:bg-white hover:shadow-xl transition-all duration-300">
                       <div className="flex items-center gap-4 md:gap-6 mb-4 md:mb-0 w-full md:w-auto">
                          <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl ${agenda.bg} ${agenda.color} flex items-center justify-center border border-current/10 shrink-0`}>
                             <i className={`bi ${activeNotifTab === 'pensiun' ? 'bi-door-open-fill' : activeNotifTab === 'kgb' ? 'bi-cash-stack' : 'bi-arrow-up-right-circle-fill'} text-xl md:text-2xl`}></i>
                          </div>
                          <div className="min-w-0">
                             <h5 className="text-[12px] md:text-[13px] font-black text-gray-950 uppercase truncate leading-tight mb-1">{agenda.name}</h5>
                             <p className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-tighter">NIP. {agenda.nip}</p>
                          </div>
                       </div>
                       <div className="text-right w-full md:w-auto flex md:flex-col justify-between md:justify-center items-center md:items-end">
                          <span className={`px-3 md:px-4 py-1.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase border md:mb-2 ${agenda.bg} ${agenda.color} border-current/10`}>
                             {agenda.category}
                          </span>
                          <p className="text-[10px] md:text-[11px] font-bold text-gray-900 uppercase tracking-widest">{agenda.info}</p>
                       </div>
                    </div>
                  ))}
                  {categorizedNotifs[activeNotifTab].length === 0 && (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center">
                       <i className="bi bi-clipboard-check text-5xl mb-4"></i>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Agenda Kosong</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
