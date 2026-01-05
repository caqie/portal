
// @google/genai guidelines: Fixed incorrect React import (React is not a named export)
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { fetchPegawaiFromSheets, calculateRetirementDate, fetchKGBFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord, KGB } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';

const StatsCard = ({ title, value, icon, color, loading, subValue }: { title: string, value: string | number, icon: string, color: string, loading?: boolean, subValue?: string }) => (
  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all duration-300 group">
    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${color}`}>
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
  const [selectedUnitForJabatan, setSelectedUnitForJabatan] = useState(UNIT_KERJA[0]);

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

  const personalData = useMemo(() => {
    return pegawai.find(p => p.nip === user?.nip);
  }, [pegawai, user]);

  // Statistik Presisi Berdasarkan Jenis Pegawai & Status
  const stats = useMemo(() => {
    const counts = { 
      total: pegawai.length, 
      pns: 0, 
      cpns: 0, 
      pppk: 0, 
      pppk_pw: 0, 
      aktif: 0,
      cuti: 0,
      tugasBelajar: 0,
      pensiunCount: 0
    };

    pegawai.forEach(p => {
      const jenis = (p.jenisPegawai || '').toUpperCase();
      if (jenis === 'PNS') counts.pns++;
      else if (jenis === 'CPNS') counts.cpns++;
      else if (jenis === 'PPPK') counts.pppk++;
      else if (jenis === 'PPPK PARUH WAKTU' || jenis === 'PPPK PW') counts.pppk_pw++;

      const status = p.status;
      if (status === 'Aktif') counts.aktif++;
      else if (status === 'Cuti') counts.cuti++;
      else if (status === 'Tugas Belajar') counts.tugasBelajar++;
      else if (status === 'Pensiun') counts.pensiunCount++;
    });

    return counts;
  }, [pegawai]);

  // Statistik Pendidikan dengan Normalisasi
  const pendidikanData = useMemo(() => {
    const counts: Record<string, number> = {
      'S3': 0, 'S2': 0, 'S1': 0, 'D4': 0, 'D3': 0, 'D2': 0, 'D1': 0, 'SMA/SEDERAJAT': 0, 'LAINNYA': 0
    };

    pegawai.forEach(p => {
      const edu = (p.pendidikan || '').toUpperCase();
      if (edu.includes('S3') || edu.includes('DOKTOR')) counts['S3']++;
      else if (edu.includes('S2') || edu.includes('MAGISTER')) counts['S2']++;
      else if (edu.includes('S1') || edu.includes('SARJANA') || edu.includes('S-1')) counts['S1']++;
      else if (edu.includes('D4') || edu.includes('D-IV')) counts['D4']++;
      else if (edu.includes('D3') || edu.includes('D-III')) counts['D3']++;
      else if (edu.includes('D2') || edu.includes('D-II')) counts['D2']++;
      else if (edu.includes('D1') || edu.includes('D-I')) counts['D1']++;
      else if (edu.includes('SMA') || edu.includes('SMK') || edu.includes('SLTA') || edu.includes('SEDERAJAT')) counts['SMA/SEDERAJAT']++;
      else if (edu.trim() !== '') counts['LAINNYA']++;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [pegawai]);

  // Notifikasi Kepegawaian Otomatis
  const notifications = useMemo(() => {
    const alerts: { id: string, type: 'PENSIUN' | 'PANGKAT' | 'KGB', title: string, sub: string, color: string }[] = [];
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);

    pegawai.forEach(p => {
      const retDate = calculateRetirementDate(p.nip, p.jabatan);
      if (retDate && retDate <= oneYearLater && retDate >= today) {
        alerts.push({
          id: `pensiun-${p.nip}`,
          type: 'PENSIUN',
          title: p.nama,
          sub: `BUP: ${retDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
          color: 'bg-rose-50'
        });
      }

      if (p.nip && p.nip.length >= 12) {
        const tmtYear = parseInt(p.nip.substring(8, 12));
        const diff = today.getFullYear() - tmtYear;
        if (diff > 0 && diff % 4 === 0) {
          alerts.push({
            id: `pangkat-${p.nip}`,
            type: 'PANGKAT',
            title: p.nama,
            sub: `Estimasi KP Reguler ${today.getFullYear()}`,
            color: 'bg-amber-50'
          });
        }
      }

      if (p.nip && p.nip.length >= 12) {
        const tmtYear = parseInt(p.nip.substring(8, 12));
        const diff = today.getFullYear() - tmtYear;
        if (diff > 0 && diff % 2 === 0) {
          alerts.push({
            id: `kgb-${p.nip}`,
            type: 'KGB',
            title: p.nama,
            sub: `Waktunya Kenaikan Gaji Berkala`,
            color: 'bg-emerald-50'
          });
        }
      }
    });

    return alerts.slice(0, 15);
  }, [pegawai]);

  // Perhitungan Sebaran Unit Kerja Utama
  const unitStats = useMemo(() => {
    const initialStats: Record<string, any> = {};
    UNIT_KERJA.forEach(unit => {
      initialStats[unit] = { pns: 0, cpns: 0, pppk: 0, pppk_pw: 0, total: 0 };
    });

    pegawai.forEach(p => {
      let unitKey = p.unitKerja;
      if (initialStats[unitKey]) {
        const jenis = (p.jenisPegawai || '').toUpperCase();
        if (jenis === 'PNS') initialStats[unitKey].pns++;
        else if (jenis === 'CPNS') initialStats[unitKey].cpns++;
        else if (jenis === 'PPPK') initialStats[unitKey].pppk++;
        else if (jenis === 'PPPK PARUH WAKTU' || jenis === 'PPPK PW') initialStats[unitKey].pppk_pw++;
        initialStats[unitKey].total++;
      }
    });

    return initialStats;
  }, [pegawai]);

  // Perhitungan Sebaran Jabatan Per Direktorat
  const jabatanPerUnit = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {};
    UNIT_KERJA.forEach(unit => { stats[unit] = {}; });
    
    pegawai.forEach(p => {
      const unit = p.unitKerja;
      const jab = (p.jabatan || 'TANPA JABATAN').toUpperCase();
      if (stats[unit]) {
        stats[unit][jab] = (stats[unit][jab] || 0) + 1;
      }
    });
    
    return stats;
  }, [pegawai]);

  const currentJabatanData = useMemo(() => {
    const data = jabatanPerUnit[selectedUnitForJabatan] || {};
    return Object.entries(data)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [jabatanPerUnit, selectedUnitForJabatan]);

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
           <div className="bg-[#111827] p-6 rounded-[2.5rem] shadow-xl text-white border border-white/5 h-full">
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-2">
                    <i className="bi bi-bell-fill text-blue-400"></i>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Siaga Kepegawaian</h4>
                 </div>
                 <span className="h-6 w-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] font-black">{notifications.length}</span>
              </div>
              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                 {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-all">
                       <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${n.color.replace('bg-','')} animate-pulse`} style={{backgroundColor: n.color.includes('rose') ? '#f43f5e' : n.color.includes('amber') ? '#f59e0b' : '#10b981'}}></div>
                       <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase truncate text-gray-200">{n.title}</p>
                          <p className="text-[8px] font-bold text-gray-500 uppercase mt-1">{n.sub}</p>
                       </div>
                       <div className="px-2 py-0.5 bg-white/10 rounded text-[7px] font-black uppercase text-gray-400">{n.type}</div>
                    </div>
                 )) : (
                    <div className="py-20 text-center opacity-30">
                       <i className="bi bi-shield-check text-4xl block mb-2"></i>
                       <p className="text-[8px] font-black uppercase tracking-widest">Database Aman</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[500px]">
          <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-blue-50/10 shrink-0">
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Sebaran Pegawai Per Direktorat</h4>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Struktur Organisasi Utama DJKI</p>
            </div>
            <button onClick={loadDashboardData} className="h-10 w-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 hover:scale-110 transition-all">
               <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-5">Direktorat / Unit</th>
                  <th className="px-4 py-5 text-center">PNS</th>
                  <th className="px-4 py-5 text-center">CPNS</th>
                  <th className="px-4 py-5 text-center">PPPK</th>
                  <th className="px-4 py-5 text-center">PPPK PW</th>
                  <th className="px-8 py-5 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={6} className="px-8 py-20 text-center animate-pulse text-[10px] font-black text-gray-300 uppercase">Sinkronisasi...</td></tr>
                ) : UNIT_KERJA.map(unitName => (
                  <tr key={unitName} className="hover:bg-blue-50/5 transition-all group">
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-bold text-gray-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{unitName}</p>
                    </td>
                    <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-blue-600 bg-blue-50/5">{unitStats[unitName]?.pns || 0}</td>
                    <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-indigo-500">{unitStats[unitName]?.cpns || 0}</td>
                    <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-emerald-600">{unitStats[unitName]?.pppk || 0}</td>
                    <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-cyan-500">{unitStats[unitName]?.pppk_pw || 0}</td>
                    <td className="px-8 py-5 text-right font-black text-gray-900 text-[11px] bg-gray-50/30">{unitStats[unitName]?.total || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabel Sebaran Jabatan Per Direktorat */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="px-8 py-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50/50 shrink-0 gap-4">
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Sebaran Jabatan Per Direktorat</h4>
              <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Detail Profesi Berdasarkan Unit Kerja</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Filter Unit:</span>
              <select 
                value={selectedUnitForJabatan} 
                onChange={(e) => setSelectedUnitForJabatan(e.target.value)}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase text-gray-900 shadow-sm outline-none focus:border-blue-500 transition-all max-w-[250px]"
              >
                {UNIT_KERJA.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest sticky top-0 z-10">
                <tr>
                  <th className="px-8 py-5 w-16">No</th>
                  <th className="px-4 py-5">Nama Jabatan</th>
                  <th className="px-8 py-5 text-right w-32">Jumlah Pegawai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={3} className="px-8 py-20 text-center animate-pulse text-[10px] font-black text-gray-300 uppercase">Mengolah Data Jabatan...</td></tr>
                ) : currentJabatanData.length > 0 ? currentJabatanData.map((jab, idx) => (
                  <tr key={jab.name} className="hover:bg-blue-50/5 transition-all group">
                    <td className="px-8 py-5 text-[10px] font-black text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-5">
                      <p className="text-[10px] font-black text-gray-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{jab.name}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg">{jab.count}</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-30">Tidak ada data untuk unit ini</td></tr>
                )}
              </tbody>
              {currentJabatanData.length > 0 && (
                <tfoot className="bg-gray-50/50 sticky bottom-0">
                  <tr>
                    <td colSpan={2} className="px-8 py-4 text-[9px] font-black text-gray-500 uppercase text-right">Total Akumulasi</td>
                    <td className="px-8 py-4 text-right">
                      <span className="text-[11px] font-black text-gray-900">{currentJabatanData.reduce((acc, curr) => acc + curr.count, 0)}</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Statistik Pendidikan */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="px-8 py-6 border-b border-gray-50 bg-indigo-50/10 shrink-0">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Statistik Pendidikan Pegawai</h4>
            <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Distribusi Jenjang Pendidikan Terakhir</p>
          </div>
          <div className="flex-1 p-6">
            {isMounted && !loading && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pendidikanData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Jumlah Pegawai" 
                    fill="#4f46e5" 
                    radius={[0, 10, 10, 0]}
                    barSize={24}
                  >
                    {pendidikanData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="px-8 py-4 bg-gray-50 text-center">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Pegawai Tervalidasi: {pegawai.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 h-[320px] flex flex-col">
            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Komposisi Pegawai Berdasarkan Gender</h4>
            <div className="flex-1 w-full relative">
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
                Statistik ini dihitung secara real-time dari database pegawai DJKI.
                Total mencakup kategori PNS, CPNS, PPPK, dan PPPK Paruh Waktu.
             </p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
