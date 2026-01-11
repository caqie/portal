import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList 
} from 'recharts';
import { fetchPegawaiFromSheets, calculateRetirementDate } from '../spreadsheetService';
import { Pegawai } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';

const COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatsCard = ({ title, value, icon, color, loading, subValue }: { title: string, value: string | number, icon: string, color: string, loading?: boolean, subValue?: string }) => (
  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-all duration-300 group">
    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${color} relative overflow-hidden`}>
      <i className="bi bi-person-circle absolute -right-4 -bottom-4 text-4xl text-white/10 rotate-12"></i>
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

const NotificationRow = ({ type, name, info, color }: { type: string, name: string, info: string, color: string }) => (
  <div className={`p-4 rounded-2xl border-l-4 ${color} bg-gray-50 flex items-center gap-4 border-y border-r border-gray-100/50`}>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${color.replace('border-', 'bg-').replace('-600', '-100')} ${color.replace('border-', 'text-')}`}>
          {type}
        </span>
        <p className="text-[9px] font-black text-gray-900 uppercase truncate">{name}</p>
      </div>
      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-tight">{info}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // States for Sebaran Jabatan Table
  const [searchJabatan, setSearchJabatan] = useState('');
  const [filterUnitJabatan, setFilterUnitJabatan] = useState('Semua Unit');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const pegData = await fetchPegawaiFromSheets();
      setPegawai(pegData);
      // Open notification modal if not a viewer and has data
      if (user?.role !== 'Viewer') {
        setTimeout(() => setIsNotifOpen(true), 1000);
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic Notifikasi Tahun 2025
  const notifications = useMemo(() => {
    const alerts: any[] = [];
    const currentYear = new Date().getFullYear();

    pegawai.forEach(p => {
      // 1. Pensiun
      const retirementDate = calculateRetirementDate(p.nip, p.jabatan);
      if (retirementDate && retirementDate.getFullYear() === currentYear) {
        alerts.push({ id: `p-${p.nip}`, type: 'PENSIUN', name: p.nama, info: `BUP: ${retirementDate.toLocaleDateString('id-ID', { month: 'long' })} ${currentYear}`, color: 'border-rose-600' });
      }
      // 2. KGB (2 Tahunan)
      if (p.tmtStatus) {
        const tmtDate = new Date(p.tmtStatus);
        if (!isNaN(tmtDate.getTime()) && (currentYear - tmtDate.getFullYear()) % 2 === 0 && currentYear !== tmtDate.getFullYear()) {
           alerts.push({ id: `k-${p.nip}`, type: 'KGB', name: p.nama, info: `Jadwal KGB Rutin ${currentYear}`, color: 'border-emerald-600' });
        }
      }
      // 3. Pangkat (4 Tahunan)
      if (p.tmtPangkat) {
        const tmtPkt = new Date(p.tmtPangkat);
        if (!isNaN(tmtPkt.getTime()) && (currentYear - tmtPkt.getFullYear()) % 4 === 0 && currentYear !== tmtPkt.getFullYear()) {
          alerts.push({ id: `pkt-${p.nip}`, type: 'KENAIKAN PANGKAT', name: p.nama, info: `KP Reguler ${currentYear}`, color: 'border-blue-600' });
        }
      }
      // 4. Jenjang (Estimasi 3 Tahunan)
      if (p.tmtJabatan) {
        const tmtJab = new Date(p.tmtJabatan);
        if (!isNaN(tmtJab.getTime()) && (currentYear - tmtJab.getFullYear()) % 3 === 0 && currentYear !== tmtJab.getFullYear()) {
          alerts.push({ id: `jenj-${p.nip}`, type: 'KENAIKAN JENJANG', name: p.nama, info: `Potensi Jenjang ${currentYear}`, color: 'border-indigo-600' });
        }
      }
    });
    return alerts;
  }, [pegawai]);

  // Statistik Gender & Pendidikan
  const genderData = useMemo(() => {
    const counts = { L: 0, P: 0 };
    pegawai.forEach(p => { if (p.gender === 'P') counts.P++; else counts.L++; });
    return [{ name: 'Laki-laki', value: counts.L }, { name: 'Perempuan', value: counts.P }];
  }, [pegawai]);

  const pendidikanData = useMemo(() => {
    const counts: Record<string, number> = { 'S3': 0, 'S2': 0, 'S1/D4': 0, 'D3': 0, 'SMA': 0, 'LAINNYA': 0 };
    pegawai.forEach(p => {
      const edu = (p.pendidikan || '').toUpperCase();
      if (edu.includes('S3')) counts['S3']++;
      else if (edu.includes('S2')) counts['S2']++;
      else if (edu.includes('S1') || edu.includes('D4')) counts['S1/D4']++;
      else if (edu.includes('D3')) counts['D3']++;
      else if (edu.includes('SMA')) counts['SMA']++;
      else if (edu.trim()) counts['LAINNYA']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(i => i.value > 0);
  }, [pegawai]);

  const sebaranJabatanDetailed = useMemo(() => {
    const map: Record<string, { jabatan: string, unit: string, count: number }> = {};
    pegawai.forEach(p => {
      const key = `${p.jabatan || 'TANPA JABATAN'}|${p.unitKerja || 'TANPA UNIT'}`;
      if (!map[key]) {
        map[key] = { jabatan: p.jabatan || 'TANPA JABATAN', unit: p.unitKerja || 'TANPA UNIT', count: 0 };
      }
      map[key].count++;
    });
    return Object.values(map).filter(item => {
      const matchesSearch = item.jabatan.toLowerCase().includes(searchJabatan.toLowerCase());
      const matchesUnit = filterUnitJabatan === 'Semua Unit' || item.unit === filterUnitJabatan;
      return matchesSearch && matchesUnit;
    }).sort((a, b) => b.count - a.count);
  }, [pegawai, searchJabatan, filterUnitJabatan]);

  const sebaranUnitKomprehensif = useMemo(() => {
    const units = Array.from(new Set(pegawai.map(p => p.unitKerja).filter(u => !!u))).sort();
    return units.map(unit => {
      const members = pegawai.filter(p => p.unitKerja === unit);
      return {
        unit,
        pns: members.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PNS').length,
        cpns: members.filter(p => (p.jenisPegawai || '').toUpperCase() === 'CPNS').length,
        pppk: members.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PPPK').length,
        pppk_pw: members.filter(p => {
          const jp = (p.jenisPegawai || '').toUpperCase();
          return jp.includes('PARUH WAKTU') || jp.includes('PW');
        }).length,
        total: members.length
      };
    });
  }, [pegawai]);

  const mainStats = useMemo(() => {
    const counts = { total: pegawai.length, pns: 0, pppk: 0, cpns: 0, pppk_pw: 0 };
    pegawai.forEach(p => {
      const jp = (p.jenisPegawai || '').toUpperCase();
      if (jp === 'PNS') counts.pns++;
      else if (jp === 'CPNS') counts.cpns++;
      else if (jp === 'PPPK') counts.pppk++;
      else if (jp.includes('PARUH WAKTU') || jp.includes('PW')) counts.pppk_pw++;
    });
    return counts;
  }, [pegawai]);

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      
      {/* 1. Modal Notifikasi Agenda Tahun Ini */}
      {isNotifOpen && !isViewer && notifications.length > 0 && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md animate-fadeIn" onClick={() => setIsNotifOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-[3rem] shadow-2xl border border-white/20 flex flex-col overflow-hidden animate-modalEnter">
            <div className="px-10 py-8 bg-blue-600 text-white shrink-0 relative overflow-hidden">
               <i className="bi bi-bell-fill absolute -right-10 -top-10 text-[12rem] text-white/10 rotate-12"></i>
               <div className="relative z-10">
                 <h3 className="text-xl font-black uppercase tracking-tight">Agenda Karir {new Date().getFullYear()}</h3>
                 <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-2">Ditemukan {notifications.length} Aksi Kepegawaian Tahun Ini</p>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-3">
               {notifications.map((n, i) => (
                 <NotificationRow key={n.id} {...n} />
               ))}
            </div>
            <div className="px-10 py-6 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
               <button 
                 onClick={() => setIsNotifOpen(false)}
                 className="px-10 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
               >
                 Tutup Notifikasi
               </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Pegawai" value={mainStats.total} icon="bi-people-fill" color="bg-blue-600" loading={loading} subValue="Database DJKI" />
        <StatsCard title="Total PNS" value={mainStats.pns} icon="bi-person-vcard-fill" color="bg-indigo-600" loading={loading} subValue="ASN Aktif" />
        <StatsCard title="Total CPNS" value={mainStats.cpns} icon="bi-person-badge-fill" color="bg-amber-600" loading={loading} subValue="Masa Percobaan" />
        <StatsCard title="Total PPPK" value={mainStats.pppk} icon="bi-person-gear-fill" color="bg-emerald-600" loading={loading} subValue="PPPK Penuh Waktu" />
        <StatsCard title="PPPK Paruh Waktu" value={mainStats.pppk_pw} icon="bi-person-workspace" color="bg-cyan-600" loading={loading} subValue="Tenaga Tambahan" />
      </div>

      {/* 3. Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-6">Demografi Gender</h4>
            <div className="w-full h-[300px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                  </PieChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="lg:col-span-7 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col min-h-[400px]">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-6">Tingkat Pendidikan</h4>
            <div className="w-full h-[300px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pendidikanData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '15px', border: 'none', fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="value" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={20}>
                        <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#111827' }} />
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>

      {/* 4. Tabel Sebaran Jabatan */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/30">
           <div>
             <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Detail Sebaran Jabatan</h4>
             <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Grup berdasarkan nama jabatan dan unit kerja</p>
           </div>
           <div className="flex flex-col md:flex-row gap-3">
             <div className="relative group">
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]"></i>
                <input 
                  type="text" 
                  placeholder="Cari Jabatan..." 
                  className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500 transition-all w-full md:w-64"
                  value={searchJabatan}
                  onChange={(e) => setSearchJabatan(e.target.value)}
                />
             </div>
             <select 
               className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500"
               value={filterUnitJabatan}
               onChange={(e) => setFilterUnitJabatan(e.target.value)}
             >
                <option value="Semua Unit">Semua Unit Kerja</option>
                {UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}
             </select>
           </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[7px] font-black border-b border-gray-100 tracking-widest sticky top-0 z-10">
                 <tr>
                    <th className="px-8 py-4">Nama Jabatan Lengkap</th>
                    <th className="px-4 py-4">Unit Kerja</th>
                    <th className="px-8 py-4 text-right">Jumlah</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {sebaranJabatanDetailed.length > 0 ? sebaranJabatanDetailed.map((item, idx) => (
                   <tr key={idx} className="hover:bg-blue-50/5 transition-colors group">
                      <td className="px-8 py-4">
                         <p className="text-[10px] font-black text-gray-800 uppercase leading-tight group-hover:text-blue-600">{item.jabatan}</p>
                      </td>
                      <td className="px-4 py-4">
                         <p className="text-[9px] font-bold text-gray-500 uppercase leading-tight">{item.unit}</p>
                      </td>
                      <td className="px-8 py-4 text-right">
                         <span className="text-[11px] font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-lg">{item.count}</span>
                      </td>
                   </tr>
                 )) : (
                   <tr><td colSpan={3} className="px-8 py-10 text-center text-[10px] font-black text-gray-300 uppercase">Tidak ada data ditemukan</td></tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* 5. Tabel Sebaran Unit Komprehensif */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/30">
           <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Komposisi Pegawai Per Unit Kerja</h4>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[7px] font-black border-b border-gray-100 tracking-widest">
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
                 {sebaranUnitKomprehensif.map((data, idx) => (
                   <tr key={idx} className="hover:bg-blue-50/5 transition-all group">
                      <td className="px-8 py-5">
                         <p className="text-[10px] font-bold text-gray-700 uppercase leading-tight group-hover:text-blue-600">{data.unit}</p>
                      </td>
                      <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-blue-600">{data.pns}</td>
                      <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-indigo-500">{data.cpns}</td>
                      <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-emerald-600">{data.pppk}</td>
                      <td className="px-4 py-5 text-center font-mono text-[11px] font-bold text-cyan-500">{data.pppk_pw}</td>
                      <td className="px-8 py-5 text-right font-black text-gray-900 text-[11px] bg-gray-50/30">
                         {data.total}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;