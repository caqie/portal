
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, getRetirementDetails, fetchPengembanganFromSheets, fetchKGBFromSheets } from '../spreadsheetService';
import { Pegawai, Pengembangan, KGB } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import * as XLSX from 'xlsx';

const StatsCard = ({ title, value, icon, color, loading, subtext }: { title: string, value: string | number, icon: string, color: string, loading?: boolean, subtext?: string }) => (
  <div className="bg-white p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-xl transition-all duration-300 group">
    <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-110 ${color}`}>
      <i className={`bi ${icon} text-xl md:text-2xl`}></i>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[8px] md:text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] truncate mb-1">{title}</p>
      {loading ? (
        <div className="h-6 w-16 bg-gray-100 animate-pulse rounded-lg"></div>
      ) : (
        <div className="flex items-baseline gap-2">
           <h3 className="text-lg md:text-2xl font-black text-gray-950 tracking-tighter leading-none">{value}</h3>
           {subtext && <span className="text-[9px] font-bold text-gray-400 uppercase">{subtext}</span>}
        </div>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { logActivity } = useAuth();
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [riwayatBangkom, setRiwayatBangkom] = useState<Pengembangan[]>([]);
  const [riwayatKgb, setRiwayatKgb] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'pensiun' | 'kgb' | 'pangkat' | 'satya' | 'bangkom'>('pensiun');

  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterJenisMatrix, setFilterJenisMatrix] = useState('Semua Jenis');
  const [searchJabatan, setSearchJabatan] = useState('');

  const [filterJenisEdu, setFilterJenisEdu] = useState('Semua Jenis');
  const [filterJenisGender, setFilterJenisGender] = useState('Semua Jenis');
  const [filterJenisGrade, setFilterJenisGrade] = useState('Semua Jenis');

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [pegData, bangkomData, kgbData] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchPengembanganFromSheets(),
        fetchKGBFromSheets()
      ]);
      setPegawai(Array.isArray(pegData) ? pegData : []);
      setRiwayatBangkom(Array.isArray(bangkomData) ? bangkomData : []);
      setRiwayatKgb(Array.isArray(kgbData) ? kgbData : []);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
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

  const unitDistribution = useMemo(() => {
    return UNIT_KERJA.map(unit => {
      const perUnit = activePegawaiList.filter(p => normalizeUnitName(p.unitKerja) === unit);
      return {
        unit,
        pns: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PNS').length,
        cpns: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase() === 'CPNS').length,
        pppk: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase() === 'PPPK').length,
        pppkParuh: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PARUH')).length,
        total: perUnit.length
      };
    }).sort((a, b) => b.total - a.total);
  }, [activePegawaiList]);

  const matrixJabatan = useMemo(() => {
    let list = activePegawaiList;
    if (filterJenisMatrix !== 'Semua Jenis') {
        if (filterJenisMatrix === 'PPPK_PARUH') {
            list = list.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PARUH'));
        } else {
            list = list.filter(p => (p.jenisPegawai || '').toUpperCase() === filterJenisMatrix.toUpperCase());
        }
    }
    if (filterUnit !== 'Semua Unit') {
      list = list.filter(p => normalizeUnitName(p.unitKerja) === filterUnit);
    }
    const groups: Record<string, number> = {};
    list.forEach(p => {
      const jab = (p.jabatan || 'TANPA JABATAN').trim().toUpperCase();
      groups[jab] = (groups[jab] || 0) + 1;
    });
    const term = searchJabatan.toUpperCase().trim();
    return Object.entries(groups)
      .map(([jabatan, total]) => ({ jabatan, total }))
      .filter(item => item.jabatan.includes(term))
      .sort((a, b) => b.total - a.total);
  }, [activePegawaiList, filterUnit, filterJenisMatrix, searchJabatan]);

  const genderStats = useMemo(() => {
    const filteredList = activePegawaiList.filter(p => {
        if (filterJenisGender === 'Semua Jenis') return true;
        return (p.jenisPegawai || '').toUpperCase() === filterJenisGender.toUpperCase();
    });
    return { pria: filteredList.filter(p => p.gender === 'L').length, wanita: filteredList.filter(p => p.gender === 'P').length };
  }, [activePegawaiList, filterJenisGender]);

  const educationStats = useMemo(() => {
    const filteredList = activePegawaiList.filter(p => {
        if (filterJenisEdu === 'Semua Jenis') return true;
        return (p.jenisPegawai || '').toUpperCase() === filterJenisEdu.toUpperCase();
    });
    const eduMap: Record<string, number> = {};
    filteredList.forEach(p => {
      let edu = 'LAINNYA';
      const pStr = (p.pendidikan || '').toUpperCase().trim();
      if (pStr.includes('S3') || pStr.includes('DOKTOR')) edu = 'S3 (DOKTOR)';
      else if (pStr.includes('S2') || pStr.includes('MAGISTER')) edu = 'S2 (MAGISTER)';
      else if (pStr.includes('S1') || pStr.includes('SARJANA')) edu = 'S1 (SARJANA)';
      else if (pStr.includes('DIV') || pStr.includes('D-IV')) edu = 'D-IV / SARJANA TERAPAN';
      else if (pStr.includes('DIII') || pStr.includes('D3') || pStr.includes('D-III')) edu = 'D-III';
      else if (pStr.includes('SMA') || pStr.includes('SMK') || pStr.includes('SLTA')) edu = 'SMA / SEDERAJAT';
      else if (pStr.includes('SMP') || pStr.includes('SLTP')) edu = 'SMP / SEDERAJAT';
      else if (pStr !== '') edu = pStr;
      eduMap[edu] = (eduMap[edu] || 0) + 1;
    });
    return Object.entries(eduMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [activePegawaiList, filterJenisEdu]);

  const gradeStats = useMemo(() => {
    const filteredList = activePegawaiList.filter(p => {
        if (filterJenisGrade === 'Semua Jenis') return true;
        return (p.jenisPegawai || '').toUpperCase() === filterJenisGrade.toUpperCase();
    });
    const gradeMap: Record<string, number> = {};
    filteredList.forEach(p => {
      const g = (p.golRuang || 'LAINNYA').trim().toUpperCase();
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });
    return Object.entries(gradeMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.label.localeCompare(a.label));
  }, [activePegawaiList, filterJenisGrade]);

  const reminders = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const listKGB: any[] = [];
    const listPangkat: any[] = [];
    const listPensiun: any[] = [];
    const listSatya: any[] = [];
    const listBangkom: any[] = [];

    activePegawaiList.forEach(p => {
      // 1. Pensiun
      const ret = getRetirementDetails(p.nip || '', p.jabatan || '');
      if (ret && ret.tmtPensiun && ret.tmtPensiun.getFullYear() === currentYear) {
        listPensiun.push({ nama: p.nama, nip: p.nip, tmt: ret.tmtPensiun.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), sisa: ret.sisaMasaKerja });
      }

      // 2. KGB Reguler (2 Tahunan) - Untuk Semua Jenis Pegawai
      // Menggunakan TMT Pangkat (PNS) atau TMT Status (PPPK/CPNS) sebagai anchor awal
      const anchorDate = p.tmtPangkat || p.tmtStatus;
      if (anchorDate) {
        const tmtParts = String(anchorDate).split(/[-/]/);
        if (tmtParts.length === 3) {
            const tmtYear = tmtParts[0].length === 4 ? parseInt(tmtParts[0]) : parseInt(tmtParts[2]);
            const diffYears = currentYear - tmtYear;
            // Jika selisih tahun genap dan sudah lewat dari tahun TMT
            if (diffYears > 0 && diffYears % 2 === 0) {
                // Cek apakah tahun ini sudah diproses di riwayat KGB
                const sudahDiproses = riwayatKgb.some(k => k.nip === p.nip && k.tmtBaru && k.tmtBaru.includes(currentYear.toString()));
                if (!sudahDiproses) {
                    listKGB.push({ nama: p.nama, nip: p.nip, tmtTerakhir: anchorDate, keterangan: `Jadwal KGB Tahun ${currentYear} (${p.jenisPegawai})` });
                }
            }
        }
      }

      // 3. Pangkat (4 Tahunan) - Biasanya untuk PNS
      if (p.tmtPangkat && (p.jenisPegawai||'').toUpperCase() === 'PNS') {
        const tmtParts = String(p.tmtPangkat).split(/[-/]/);
        if (tmtParts.length === 3) {
            const tmtYear = tmtParts[0].length === 4 ? parseInt(tmtParts[0]) : parseInt(tmtParts[2]);
            const diffYears = currentYear - tmtYear;
            if (diffYears > 0 && diffYears % 4 === 0) {
                listPangkat.push({ nama: p.nama, nip: p.nip, tmtTerakhir: p.tmtPangkat, keterangan: `Jadwal KP Reguler Tahun ${currentYear}` });
            }
        }
      }

      // 4. Satya Lencana
      const cleanNip = String(p.nip || '').replace(/\D/g, '');
      if (cleanNip.length >= 12) {
        const cpnsYear = parseInt(cleanNip.substring(8, 12));
        const workingYears = currentYear - cpnsYear;
        if ([10, 20, 30].includes(workingYears)) {
           listSatya.push({ nama: p.nama, nip: p.nip, tahun: workingYears, pengabdian: `Masa Kerja ${workingYears} Tahun` });
        }
      }

      // 5. Bangkom
      const perUserBangkom = riwayatBangkom.filter(r => r.nip === p.nip && Number(r.tahun) === currentYear);
      const totalJp = perUserBangkom.reduce((acc, curr) => acc + (Number(curr.jumlahJpl) || 0), 0);
      const isPPPK = (p.jenisPegawai || '').toUpperCase().includes('PPPK');
      const targetJp = isPPPK ? 24 : 20;
      if (totalJp < targetJp) {
        listBangkom.push({ nama: p.nama, nip: p.nip, currentJp: totalJp, targetJp: targetJp, keterangan: `Kurang ${targetJp - totalJp} JP`, status: isPPPK ? 'PPPK (Target 24 JP)' : 'PNS (Min 20 JP)' });
      }
    });

    return { kgb: listKGB, pangkat: listPangkat, pensiun: listPensiun, satya: listSatya, bangkom: listBangkom };
  }, [activePegawaiList, riwayatBangkom, riwayatKgb]);

  const totalNotifCount = reminders.kgb.length + reminders.pangkat.length + reminders.pensiun.length + reminders.satya.length + reminders.bangkom.length;

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Intelligence Hub DJKI</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
             <i className="bi bi-cpu-fill text-blue-600"></i> Real-time Analytics Dashboard
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={() => {
            const wb = XLSX.utils.book_new();
            const unitWs = XLSX.utils.json_to_sheet(unitDistribution.map(u => ({ 'Unit Kerja': u.unit, 'PNS': u.pns, 'CPNS': u.cpns, 'PPPK': u.pppk, 'PPPK Paruh Waktu': u.pppkParuh, 'Total ASN': u.total })));
            XLSX.utils.book_append_sheet(wb, unitWs, "Sebaran Unit");
            XLSX.writeFile(wb, `Analitik_SDM_DJKI_${new Date().getTime()}.xlsx`);
            logActivity('DOWNLOAD', 'Analytics', 'Download Full Analytics Dashboard');
          }} className="flex items-center gap-3 bg-emerald-600 p-4 px-8 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
             <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Download Analytics
          </button>
          <button onClick={() => setIsNotifOpen(true)} className="relative flex items-center gap-4 bg-white p-4 px-8 rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all group">
             <i className="bi bi-bell-fill text-xl text-blue-600 group-hover:animate-swing"></i>
             {totalNotifCount > 0 && (
               <span className="absolute -top-2 -right-2 h-6 w-6 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-[#F8F9FC] animate-bounce">
                  {totalNotifCount}
               </span>
             )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard title="Total ASN Aktif" value={activePegawaiList.length} icon="bi-people-fill" color="bg-blue-600" loading={loading} />
        <StatsCard title="Total PNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase() === 'PNS').length} icon="bi-person-vcard" color="bg-indigo-600" loading={loading} />
        <StatsCard title="Total CPNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase() === 'CPNS').length} icon="bi-person-plus" color="bg-cyan-600" loading={loading} />
        <StatsCard title="Total PPPK" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase() === 'PPPK').length} icon="bi-person-check" color="bg-sky-600" loading={loading} />
        <StatsCard title="PPPK Paruh Waktu" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase().includes('PARUH')).length} icon="bi-person-gear" color="bg-rose-600" loading={loading} />
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="mb-10">
            <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Sebaran Pegawai Aktif per Unit Kerja</h4>
            <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-widest text-blue-600">Komposisi Jenis Kepegawaian Internal DJKI</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400">
                  <tr>
                     <th className="px-10 py-6 border-b">Unit Kerja Pengampu</th>
                     <th className="px-4 py-6 border-b text-center">PNS</th>
                     <th className="px-4 py-6 border-b text-center">CPNS</th>
                     <th className="px-4 py-6 border-b text-center">PPPK</th>
                     <th className="px-4 py-6 border-b text-center bg-rose-50 text-rose-600">PPPK Paruh Waktu</th>
                     <th className="px-6 py-6 border-b text-right bg-blue-50 text-blue-600 font-black">Total ASN</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {unitDistribution.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                       <td className="px-10 py-5 font-black text-[10px] text-gray-800 uppercase leading-tight">{row.unit}</td>
                       <td className="px-4 py-5 text-center font-bold text-gray-600">{row.pns}</td>
                       <td className="px-4 py-5 text-center font-bold text-gray-600">{row.cpns}</td>
                       <td className="px-4 py-5 text-center font-bold text-gray-600">{row.pppk}</td>
                       <td className="px-4 py-5 text-center font-black text-rose-600 bg-rose-50/20">{row.pppkParuh}</td>
                       <td className="px-6 py-5 text-right font-black text-[12px] text-blue-600 bg-blue-50/20">{row.total}</td>
                    </tr>
                  ))}
               </tbody>
               <tfoot className="bg-[#111827] text-white">
                  <tr className="font-black uppercase text-[10px]">
                     <td className="px-10 py-5">TOTAL KESELURUHAN</td>
                     <td className="px-4 py-5 text-center">{unitDistribution.reduce((a,b)=>a+b.pns,0)}</td>
                     <td className="px-4 py-5 text-center">{unitDistribution.reduce((a,b)=>a+b.cpns,0)}</td>
                     <td className="px-4 py-5 text-center">{unitDistribution.reduce((a,b)=>a+b.pppk,0)}</td>
                     <td className="px-4 py-5 text-center text-rose-400">{unitDistribution.reduce((a,b)=>a+b.pppkParuh,0)}</td>
                     <td className="px-6 py-5 text-right text-[14px] bg-blue-600">{unitDistribution.reduce((a,b)=>a+b.total,0)}</td>
                  </tr>
               </tfoot>
            </table>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Statistik Gender</h4>
                 <select className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenisGender} onChange={e => setFilterJenisGender(e.target.value)}><option value="Semua Jenis">Semua Jenis</option><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option></select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 bg-sky-50 rounded-3xl border border-sky-100"><p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-1">Laki-laki</p><h5 className="text-3xl font-black text-sky-900">{genderStats.pria}</h5></div>
                 <div className="p-6 bg-pink-50 rounded-3xl border border-pink-100"><p className="text-[9px] font-black text-pink-600 uppercase tracking-widest mb-1">Perempuan</p><h5 className="text-3xl font-black text-pink-900">{genderStats.wanita}</h5></div>
              </div>
           </div>
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Statistik Tingkat Pendidikan</h4>
                 <select className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenisEdu} onChange={e => setFilterJenisEdu(e.target.value)}><option value="Semua Jenis">Semua Jenis</option><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option></select>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {educationStats.map((edu, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                       <span className="text-[10px] font-black text-gray-600 uppercase group-hover:text-blue-600 transition-colors">{edu.label}</span>
                       <span className="text-[12px] font-black text-gray-950">{edu.count} ASN</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
           <div className="flex flex-col mb-10 gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div><h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Matriks Nomenklatur Jabatan</h4><p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-widest text-blue-600">Total Sebaran Nomenklatur Jabatan Terpusat</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Unit Kerja</label><select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}><option>Semua Unit</option>{UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}</select></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Jenis Pegawai</label><select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600" value={filterJenisMatrix} onChange={e => setFilterJenisMatrix(e.target.value)}><option value="Semua Jenis">Semua Jenis</option><option value="PNS">PNS</option><option value="CPNS">CPNS</option><option value="PPPK">PPPK</option><option value="PPPK_PARUH">PPPK Paruh Waktu</option></select></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Cari Jabatan</label><input type="text" placeholder="NAMA JABATAN..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600" value={searchJabatan} onChange={e => setSearchJabatan(e.target.value)} /></div>
              </div>
           </div>
           <div className="overflow-x-auto max-h-[820px] flex-1 custom-scrollbar border border-gray-50 rounded-3xl">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white z-20 shadow-sm text-[8px] font-black uppercase text-gray-400">
                    <tr><th className="px-10 py-6 border-b">Nama Nomenklatur Jabatan</th><th className="px-6 py-6 text-right border-b text-blue-600">Total ASN</th></tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {matrixJabatan.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors"><td className="px-10 py-4 font-bold text-[10px] text-gray-800 uppercase leading-tight">{row.jabatan}</td><td className="px-6 py-4 text-right font-black text-[12px] text-gray-950">{row.total}</td></tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {isNotifOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsNotifOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter h-full md:h-auto md:max-h-[85vh]">
              <div className="p-8 md:p-10 shrink-0 bg-gray-50/50 border-b">
                 <div className="flex items-center justify-between mb-8">
                    <div><h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter">Personnel Monitoring</h4><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Daftar ASN yang Memerlukan Tindakan Administrasi Tahun {new Date().getFullYear()}</p></div>
                    <button onClick={() => setIsNotifOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white rounded-2xl shadow-sm transition-all"><i className="bi bi-x-lg text-xl"></i></button>
                 </div>
                 <div className="flex bg-gray-200 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar gap-1">
                    <button onClick={() => setNotifTab('pensiun')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='pensiun' ? 'bg-white text-rose-600 shadow-md' : 'text-gray-500'}`}>Pensiun ({reminders.pensiun.length})</button>
                    <button onClick={() => setNotifTab('kgb')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='kgb' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}>KGB ({reminders.kgb.length})</button>
                    <button onClick={() => setNotifTab('pangkat')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='pangkat' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>Pangkat ({reminders.pangkat.length})</button>
                    <button onClick={() => setNotifTab('satya')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='satya' ? 'bg-white text-amber-600 shadow-md' : 'text-gray-500'}`}>Satya ({reminders.satya.length})</button>
                    <button onClick={() => setNotifTab('bangkom')} className={`flex-1 min-w-[120px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='bangkom' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500'}`}>Pelatihan ({reminders.bangkom.length})</button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-4">
                 {(reminders[notifTab] || []).map((item, i) => (
                    <div key={i} className="p-5 bg-gray-50/50 border border-gray-100 rounded-3xl flex justify-between items-center group hover:bg-blue-50 transition-all">
                       <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-950 uppercase truncate">{item.nama || 'Tanpa Nama'}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{notifTab === 'bangkom' ? item.status : `TMT: ${item.tmt || item.tmtTerakhir || '-'}`}</p>
                       </div>
                       <span className={`shrink-0 px-3 py-1 bg-white border rounded-lg text-[9px] font-black uppercase ${notifTab === 'bangkom' ? 'text-indigo-600 border-indigo-100' : 'text-gray-500'}`}>{item.sisa || item.keterangan || item.pengabdian || '-'}</span>
                    </div>
                 ))}
                 {(reminders[notifTab] || []).length === 0 && <div className="py-20 text-center opacity-30"><i className="bi bi-check2-circle text-5xl mb-4"></i><p className="text-[10px] font-black uppercase tracking-widest">Semua data terpantau aman</p></div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
