
// @google/genai guidelines: Fixed incorrect React import (React is not a named export)
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { fetchPegawaiFromSheets, calculateRetirementDate, fetchKGBFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord, KGB } from '../types';
import { useAuth } from '../AuthContext';

const StatsCard = ({ title, value, icon, color, loading, subValue }: { title: string, value: string | number, icon: string, color: string, loading?: boolean, subValue?: string }) => (
  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all duration-300 group">
    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${color}`}>
      <i className="bi bi-person-circle absolute -right-10 -bottom-10 text-[12rem] text-white/5 rotate-12"></i>
      <i className={`bi ${icon} text-xl`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest truncate">{title}</p>
      {loading ? (
        <div className="h-6 w-16 bg-gray-100 animate-pulse rounded mt-1"></div>
      ) : (
        <>
          <h3 className="text-lg lg:text-xl font-black text-gray-900 tracking-tight leading-none mt-1">{value}</h3>
          {subValue && <p className="text-[7px] font-bold text-gray-400 uppercase mt-1">{subValue}</p>}
        </>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [kgbList, setKgbList] = useState<KGB[]>([]);
  const [personalAbsensi, setPersonalAbsensi] = useState<AbsensiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedUnitForJabatan, setSelectedUnitForJabatan] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [pegData, kgbData] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchKGBFromSheets()
      ]);
      setPegawai(pegData);
      setKgbList(kgbData);
      
      // Set default filter unit kerja pertama yang ditemukan
      if (pegData.length > 0) {
        const units = Array.from(new Set(pegData.map(p => p.unitKerja).filter(u => !!u))).sort();
        if (units.length > 0) setSelectedUnitForJabatan(units[0]);
      }

      const savedAbsen = localStorage.getItem('absensi_history_db');
      if (savedAbsen) {
        const parsed = JSON.parse(savedAbsen);
        setPersonalAbsensi(parsed.filter((a: any) => a.nip === user?.nip));
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // DAFTAR UNIT KERJA UNIK DARI DATABASE SPREADSHEET
  const uniqueUnits = useMemo(() => {
    const units = new Set(pegawai.map(p => p.unitKerja).filter(u => !!u));
    return Array.from(units).sort();
  }, [pegawai]);

  const personalData = useMemo(() => {
    return pegawai.find(p => p.nip === user?.nip);
  }, [pegawai, user]);

  const stats = useMemo(() => {
    const counts = { total: pegawai.length, pns: 0, cpns: 0, pppk: 0, pppk_pw: 0, aktif: 0, cuti: 0, tugasBelajar: 0, pensiunCount: 0 };
    pegawai.forEach(p => {
      const jenis = (p.jenisPegawai || '').toUpperCase();
      if (jenis === 'PNS') counts.pns++;
      else if (jenis === 'CPNS') counts.cpns++;
      else if (jenis === 'PPPK') counts.pppk++;
      else if (jenis.includes('PARUH WAKTU') || jenis.includes('PW')) counts.pppk_pw++;
      if (p.status === 'Aktif') counts.aktif++;
    });
    return counts;
  }, [pegawai]);

  const unitStats = useMemo(() => {
    const statsMap: Record<string, any> = {};
    uniqueUnits.forEach(unit => {
      statsMap[unit] = { pns: 0, cpns: 0, pppk: 0, pppk_pw: 0, total: 0 };
    });

    pegawai.forEach(p => {
      const unitKey = p.unitKerja;
      if (statsMap[unitKey]) {
        const jenis = (p.jenisPegawai || '').toUpperCase();
        if (jenis === 'PNS') statsMap[unitKey].pns++;
        else if (jenis === 'CPNS') statsMap[unitKey].cpns++;
        else if (jenis === 'PPPK') statsMap[unitKey].pppk++;
        else if (jenis.includes('PARUH WAKTU') || jenis.includes('PW')) statsMap[unitKey].pppk_pw++;
        statsMap[unitKey].total++;
      }
    });
    return statsMap;
  }, [pegawai, uniqueUnits]);

  const jabatanPerUnit = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {};
    uniqueUnits.forEach(unit => { stats[unit] = {}; });
    pegawai.forEach(p => {
      const unit = p.unitKerja;
      const jab = (p.jabatan || 'TANPA JABATAN').toUpperCase();
      if (stats[unit]) {
        stats[unit][jab] = (stats[unit][jab] || 0) + 1;
      }
    });
    return stats;
  }, [pegawai, uniqueUnits]);

  const currentJabatanData = useMemo(() => {
    // Fixed: Explicitly typed 'data' to ensure 'count' is inferred as a number for the arithmetic operation in sort
    const data: Record<string, number> = jabatanPerUnit[selectedUnitForJabatan] || {};
    return Object.entries(data).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [jabatanPerUnit, selectedUnitForJabatan]);

  const pendidikanData = useMemo(() => {
    const counts: Record<string, number> = { 'S3': 0, 'S2': 0, 'S1': 0, 'D4': 0, 'D3': 0, 'D2': 0, 'D1': 0, 'SMA/SEDERAJAT': 0, 'LAINNYA': 0 };
    pegawai.forEach(p => {
      const edu = (p.pendidikan || '').toUpperCase();
      if (edu.includes('S3')) counts['S3']++;
      else if (edu.includes('S2')) counts['S2']++;
      else if (edu.includes('S1')) counts['S1']++;
      else if (edu.includes('D4')) counts['D4']++;
      else if (edu.includes('D3')) counts['D3']++;
      else if (edu.includes('SMA') || edu.includes('SMK')) counts['SMA/SEDERAJAT']++;
      else if (edu.trim()) counts['LAINNYA']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(item => item.value > 0);
  }, [pegawai]);

  const genderData = [
    { name: 'Laki-laki', value: pegawai.filter(p => p.gender === 'L').length },
    { name: 'Perempuan', value: pegawai.filter(p => p.gender === 'P').length },
  ];

  if (isViewer) {
    return (
      <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-20">
         <div className="bg-[#111827] p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
           <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="h-24 w-24 rounded-3xl bg-blue-600 border-4 border-white/10 overflow-hidden shadow-2xl flex-shrink-0">
                 {user?.foto ? <img src={user.foto} className="w-full h-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-4xl font-black">{user?.name.charAt(0)}</div>}
              </div>
              <div className="text-center md:text-left">
                 <h2 className="text-2xl font-black uppercase tracking-tight leading-none">Halo, {user?.name}</h2>
                 <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">{personalData?.jabatan || 'PEGAWAI DJKI'}</p>
                 <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                    <span className="px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest">NIP: {user?.nip}</span>
                    <span className="px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest">{personalData?.unitKerja || 'Unit Kerja'}</span>
                 </div>
              </div>
           </div>
           <i className="bi bi-person-circle absolute -right-10 -bottom-10 text-[12rem] text-white/5 rotate-12"></i>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <StatsCard title="Kehadiran" value={personalAbsensi.filter(a => a.tipe === 'MASUK').length} icon="bi-calendar-check" color="bg-blue-600" loading={loading} />
           <StatsCard title="Status" value={personalData?.status || 'Aktif'} icon="bi-person-badge" color="bg-indigo-600" loading={loading} />
           <StatsCard title="Pangkat" value={personalData?.golRuang || '-'} icon="bi-award" color="bg-amber-600" loading={loading} />
           <StatsCard title="Unit" value={personalData?.unitKerja.split(' ')[0] || 'DJKI'} icon="bi-building" color="bg-emerald-600" loading={loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total PNS" value={stats.pns} icon="bi-person-vcard-fill" color="bg-blue-600" loading={loading} subValue="Pegawai Negeri Sipil" />
        <StatsCard title="Total CPNS" value={stats.cpns} icon="bi-person-badge-fill" color="bg-indigo-600" loading={loading} subValue="Calon Pegawai Negeri Sipil" />
        <StatsCard title="Total PPPK" value={stats.pppk} icon="bi-person-gear-fill" color="bg-emerald-600" loading={loading} subValue="PPPK Penuh Waktu" />
        <StatsCard title="Total PPPK PW" value={stats.pppk_pw} icon="bi-person-workspace" color="bg-cyan-600" loading={loading} subValue="PPPK Paruh Waktu" />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
        <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-blue-50/10 shrink-0">
          <div>
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Sebaran Pegawai Per Unit (Real-time)</h4>
            <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Dihitung otomatis dari database unitKerja</p>
          </div>
          <button onClick={loadDashboardData} className="h-10 w-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 hover:rotate-180 transition-all">
             <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-8 py-5">Nama Unit Kerja</th>
                <th className="px-4 py-5 text-center">PNS</th>
                <th className="px-4 py-5 text-center">CPNS</th>
                <th className="px-4 py-5 text-center">PPPK</th>
                <th className="px-4 py-5 text-center">PPPK PW</th>
                <th className="px-8 py-5 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center animate-pulse text-[10px] font-black text-gray-300 uppercase">Sinkronisasi Database...</td></tr>
              ) : uniqueUnits.length > 0 ? uniqueUnits.map(unitName => (
                <tr key={unitName} className="hover:bg-blue-50/5 transition-all group">
                  <td className="px-8 py-5">
                     <p className="text-[10px] font-bold text-gray-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{unitName}</p>
                  </td>
                  <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-blue-600">{unitStats[unitName]?.pns || 0}</td>
                  <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-indigo-500">{unitStats[unitName]?.cpns || 0}</td>
                  <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-emerald-600">{unitStats[unitName]?.pppk || 0}</td>
                  <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-cyan-500">{unitStats[unitName]?.pppk_pw || 0}</td>
                  <td className="px-8 py-5 text-right font-black text-gray-900 text-[11px] bg-gray-50/30">{unitStats[unitName]?.total || 0}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Tidak ada data unit kerja ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="px-8 py-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50/50 shrink-0 gap-4">
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Detail Jabatan Per Unit</h4>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Pilih unit kerja untuk melihat komposisi jabatan</p>
            </div>
            <select 
              value={selectedUnitForJabatan} 
              onChange={(e) => setSelectedUnitForJabatan(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase text-gray-900 shadow-sm outline-none focus:border-blue-500 transition-all max-w-[250px]"
            >
              {uniqueUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest sticky top-0 z-10">
                <tr><th className="px-8 py-5 w-16">No</th><th className="px-4 py-5">Nama Jabatan</th><th className="px-8 py-5 text-right w-32">Jumlah</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {currentJabatanData.length > 0 ? currentJabatanData.map((jab, idx) => (
                  <tr key={jab.name} className="hover:bg-blue-50/5 transition-all group">
                    <td className="px-8 py-5 text-[10px] font-black text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-5"><p className="text-[10px] font-black text-gray-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{jab.name}</p></td>
                    <td className="px-8 py-5 text-right"><span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg">{jab.count}</span></td>
                  </tr>
                )) : <tr><td colSpan={3} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-30">Pilih unit untuk melihat data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-[600px] flex flex-col">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-2">Statistik Pendidikan</h4>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mb-6">Distribusi Jenjang Pendidikan Pegawai</p>
            <div className="flex-1">
              {isMounted && !loading && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pendidikanData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={20}>
                      {pendidikanData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][index % 5]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-[320px] flex flex-col">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Komposisi Pegawai Berdasarkan Gender</h4>
            <div className="flex-1 relative">
              {isMounted && !loading && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-[320px] flex flex-col items-center justify-center text-center">
             <div className="h-20 w-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 shadow-inner">
                <i className="bi bi-check-circle-fill text-4xl"></i>
             </div>
             <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Kualitas Data Terverifikasi</h4>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 max-w-xs mx-auto">
                Seluruh statistik di Dashboard ini dihitung secara real-time berdasarkan data mentah dari Spreadsheet.
                Jika data unit di Spreadsheet berubah, Dashboard akan langsung menyesuaikan.
             </p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
