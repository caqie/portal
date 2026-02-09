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
  const [filterJenisMatrix, setFilterJenisMatrix] = useState<string[]>([]); // Ubah ke Array untuk Multi-select
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
    
    // Filter Multi-select Jenis Pegawai
    if (filterJenisMatrix.length > 0) {
        list = list.filter(p => {
            const jen = (p.jenisPegawai || '').toUpperCase();
            return filterJenisMatrix.some(f => {
                if (f === 'PPPK_PARUH') return jen.includes('PARUH');
                return jen === f;
            });
        });
    }

    if (filterUnit !== 'Semua Unit') {
      list = list.filter(p => normalizeUnitName(p.unitKerja) === filterUnit);
    }
    
    const groups: Record<string, { total: number, klasifikasi: string, jabatan: string, jenis: string }> = {};
    
    list.forEach(p => {
      const jab = (p.jabatan || 'TANPA JABATAN').trim().toUpperCase();
      const jen = (p.jenisPegawai || 'ASN').trim().toUpperCase();
      const klas = (p.klasifikasiJabatan || 'LAINNYA').trim().toUpperCase();
      
      const key = `${jab}|${jen}|${klas}`;

      if (!groups[key]) {
        groups[key] = { total: 0, klasifikasi: klas, jabatan: jab, jenis: jen };
      }
      groups[key].total += 1;
    });

    const term = searchJabatan.toUpperCase().trim();
    return Object.values(groups)
      .filter(item => 
        item.jabatan.includes(term) || 
        item.klasifikasi.includes(term) // Sekarang bisa cari berdasarkan klasifikasi
      )
      .sort((a, b) => b.total - a.total);
  }, [activePegawaiList, filterUnit, filterJenisMatrix, searchJabatan]);

  const toggleFilterJenis = (val: string) => {
    setFilterJenisMatrix(prev => 
      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
    );
  };

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
      const ret = getRetirementDetails(p.nip || '', p.jabatan || '');
      if (ret && ret.tmtPensiun && ret.tmtPensiun.getFullYear() === currentYear) {
        listPensiun.push({ nama: p.nama, nip: p.nip, tmt: ret.tmtPensiun.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), sisa: ret.sisaMasaKerja });
      }
      const anchorDate = p.tmtPangkat || p.tmtStatus;
      if (anchorDate) {
        const tmtParts = String(anchorDate).split(/[-/]/);
        if (tmtParts.length === 3) {
            const tmtYear = tmtParts[0].length === 4 ? parseInt(tmtParts[0]) : parseInt(tmtParts[2]);
            const diffYears = currentYear - tmtYear;
            if (diffYears > 0 && diffYears % 2 === 0) {
                const sudahDiproses = riwayatKgb.some(k => k.nip === p.nip && k.tmtBaru && k.tmtBaru.includes(currentYear.toString()));
                if (!sudahDiproses) {
                    listKGB.push({ nama: p.nama, nip: p.nip, tmtTerakhir: anchorDate, keterangan: `Jadwal KGB Tahun ${currentYear}` });
                }
            }
        }
      }
      if (p.tmtPangkat && (p.jenisPegawai||'').toUpperCase() === 'PNS') {
        const tmtParts = String(p.tmtPangkat).split(/[-/]/);
        if (tmtParts.length === 3) {
            const tmtYear = tmtParts[0].length === 4 ? parseInt(tmtParts[0]) : parseInt(tmtParts[2]);
            const diffYears = currentYear - tmtYear;
            if (diffYears > 0 && diffYears % 4 === 0) {
                listPangkat.push({ nama: p.nama, nip: p.nip, tmtTerakhir: p.tmtPangkat, keterangan: `Jadwal KP Tahun ${currentYear}` });
            }
        }
      }
      const cleanNip = String(p.nip || '').replace(/\D/g, '');
      if (cleanNip.length >= 12) {
        const cpnsYear = parseInt(cleanNip.substring(8, 12));
        const workingYears = currentYear - cpnsYear;
        if ([10, 20, 30].includes(workingYears)) {
           listSatya.push({ nama: p.nama, nip: p.nip, tahun: workingYears, pengabdian: `Masa Kerja ${workingYears} Thn` });
        }
      }
      const perUserBangkom = riwayatBangkom.filter(r => r.nip === p.nip && Number(r.tahun) === currentYear);
      const totalJp = perUserBangkom.reduce((acc, curr) => acc + (Number(curr.jumlahJpl) || 0), 0);
      const isPPPK = (p.jenisPegawai || '').toUpperCase().includes('PPPK');
      const targetJp = isPPPK ? 24 : 20;
      if (totalJp < targetJp) {
        listBangkom.push({ nama: p.nama, nip: p.nip, currentJp: totalJp, targetJp: targetJp, keterangan: `Kurang ${targetJp - totalJp} JP`, status: isPPPK ? 'PPPK' : 'PNS' });
      }
    });
    return { kgb: listKGB, pangkat: listPangkat, pensiun: listPensiun, satya: listSatya, bangkom: listBangkom };
  }, [activePegawaiList, riwayatBangkom, riwayatKgb]);

  const totalNotifCount = reminders.kgb.length + reminders.pangkat.length + reminders.pensiun.length + reminders.satya.length + reminders.bangkom.length;

  const handleDownloadFullAnalytics = () => {
    const wb = XLSX.utils.book_new();
    const unitWs = XLSX.utils.json_to_sheet(unitDistribution.map(u => ({ 
      'Unit Kerja Pengampu': u.unit, 
      'PNS': u.pns, 'CPNS': u.cpns, 'PPPK': u.pppk, 'PPPK Paruh Waktu': u.pppkParuh, 'Total ASN': u.total 
    })));
    XLSX.utils.book_append_sheet(wb, unitWs, "Sebaran Unit");
    XLSX.writeFile(wb, `PortalSDM_Analytics_${new Date().getTime()}.xlsx`);
  };

  const handleExportJabatan = () => {
    const ws = XLSX.utils.json_to_sheet(matrixJabatan.map(j => ({ 
      'Nama Jabatan': j.jabatan, 
      'Klasifikasi': j.klasifikasi,
      'Jenis Pegawai': j.jenis,
      'Jumlah Pegawai': j.total 
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriks Jabatan");
    XLSX.writeFile(wb, `Matriks_Jabatan_DJKI_${new Date().getTime()}.xlsx`);
  };

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
          <button onClick={handleDownloadFullAnalytics} className="flex-1 md:flex-none flex items-center gap-3 bg-emerald-600 p-4 px-8 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
             <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Download Stats
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
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b">
                  <tr>
                     <th className="px-10 py-6 border-b">Unit Kerja</th>
                     <th className="px-4 py-6 border-b text-center">PNS</th>
                     <th className="px-4 py-6 border-b text-center">CPNS</th>
                     <th className="px-4 py-6 border-b text-center">PPPK</th>
                     <th className="px-4 py-6 border-b text-center bg-rose-50 text-rose-600">PARUH</th>
                     <th className="px-6 py-6 border-b text-right bg-blue-50 text-blue-600 font-black">Total</th>
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
            </table>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
           {/* STATISTIK GENDER */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Statistik Gender</h4>
                 <select className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenisGender} onChange={e => setFilterJenisGender(e.target.value)}>
                    <option value="Semua Jenis">Semua Jenis</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 bg-sky-50 rounded-3xl border border-sky-100">
                    <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-1">Laki-laki</p>
                    <h5 className="text-3xl font-black text-sky-900">{genderStats.pria}</h5>
                 </div>
                 <div className="p-6 bg-pink-50 rounded-3xl border border-pink-100">
                    <p className="text-[9px] font-black text-pink-600 uppercase tracking-widest mb-1">Perempuan</p>
                    <h5 className="text-3xl font-black text-pink-900">{genderStats.wanita}</h5>
                 </div>
              </div>
           </div>
           
           {/* STATISTIK PENDIDIKAN */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Statistik Tingkat Pendidikan</h4>
                 <select className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenisEdu} onChange={e => setFilterJenisEdu(e.target.value)}>
                    <option value="Semua Jenis">Semua Jenis</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                 </select>
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

           {/* SEBARAN GOLONGAN */}
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Sebaran Golongan / Ruang</h4>
                 <select className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenisGrade} onChange={e => setFilterJenisGrade(e.target.value)}>
                    <option value="Semua Jenis">Semua Jenis</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                 </select>
              </div>
              <div className="overflow-x-auto max-h-[400px] custom-scrollbar border border-gray-50 rounded-3xl">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-50 z-20 text-[8px] font-black uppercase text-gray-400">
                        <tr>
                            <th className="px-8 py-5 border-b">Golongan / Ruang</th>
                            <th className="px-6 py-5 text-right border-b text-blue-600">Total ASN</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {gradeStats.map((grade, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-4 font-black text-[10px] text-gray-800">{grade.label}</td>
                                <td className="px-6 py-4 text-right font-black text-[12px] text-gray-950">{grade.count}</td>
                            </tr>
                        ))}
                    </tbody>
                    {gradeStats.length > 0 && (
                        <tfoot className="bg-blue-50/30">
                            <tr className="font-black text-[10px] text-blue-600 uppercase">
                                <td className="px-8 py-4">Total Terdata</td>
                                <td className="px-6 py-4 text-right">{gradeStats.reduce((acc, curr) => acc + curr.count, 0)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
              </div>
           </div>
        </div>

        {/* MATRIKS JABATAN */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
           <div className="flex flex-col mb-10 gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Matriks Nomenklatur Jabatan</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-widest text-blue-600">Total Sebaran Nomenklatur Jabatan Terpusat</p>
                 </div>
                 <button onClick={handleExportJabatan} className="px-6 py-2.5 bg-[#111827] text-white rounded-xl text-[8px] font-black uppercase shadow-lg flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95">
                    <i className="bi bi-file-earmark-spreadsheet text-sm"></i>
                    Export Excel
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Unit Kerja</label>
                    <select className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                       <option>Semua Unit</option>
                       {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest">Cari Jabatan / Klasifikasi</label>
                    <div className="relative">
                       <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                       <input type="text" placeholder="MISAL: FUNGSIONAL, PELAKSANA, PENYELIA..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600" value={searchJabatan} onChange={e => setSearchJabatan(e.target.value)} />
                    </div>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-gray-400 uppercase ml-2 tracking-widest block">Filter Multi-Jenis Pegawai (Pilih beberapa sekaligus)</label>
                 <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'PNS', label: 'PNS' },
                      { id: 'CPNS', label: 'CPNS' },
                      { id: 'PPPK', label: 'PPPK' },
                      { id: 'PPPK_PARUH', label: 'PPPK Paruh Waktu' }
                    ].map(btn => (
                      <button 
                        key={btn.id} 
                        onClick={() => toggleFilterJenis(btn.id)}
                        className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all border flex items-center gap-2 ${
                          filterJenisMatrix.includes(btn.id) 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'
                        }`}
                      >
                        {filterJenisMatrix.includes(btn.id) && <i className="bi bi-check-circle-fill"></i>}
                        {btn.label}
                      </button>
                    ))}
                    {filterJenisMatrix.length > 0 && (
                      <button onClick={() => setFilterJenisMatrix([])} className="px-4 py-2 text-[8px] font-black text-rose-500 uppercase hover:underline flex items-center gap-1">
                        <i className="bi bi-x-circle"></i> Reset Filter
                      </button>
                    )}
                 </div>
              </div>
           </div>
           <div className="overflow-x-auto max-h-[820px] flex-1 custom-scrollbar border border-gray-50 rounded-3xl">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white z-20 shadow-sm text-[8px] font-black uppercase text-gray-400">
                    <tr>
                       <th className="px-10 py-6 border-b">Nama Nomenklatur Jabatan</th>
                       <th className="px-4 py-6 border-b text-center">Klasifikasi</th>
                       <th className="px-4 py-6 border-b text-center">Jenis Pegawai</th>
                       <th className="px-6 py-6 text-right border-b text-blue-600">Total ASN</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {matrixJabatan.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                         <td className="px-10 py-4 font-bold text-[10px] text-gray-800 uppercase leading-tight">{row.jabatan}</td>
                         <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                              row.klasifikasi === 'FUNGSIONAL' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              row.klasifikasi === 'PELAKSANA' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              row.klasifikasi === 'JPT / ADM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              row.klasifikasi === 'JPT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              row.klasifikasi === 'ADM' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-gray-50 text-gray-400 border-gray-100'
                            }`}>
                              {row.klasifikasi}
                            </span>
                         </td>
                         <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${
                              row.jenis === 'PNS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              row.jenis === 'PPPK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              row.jenis === 'CPNS' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                               {row.jenis}
                            </span>
                         </td>
                         <td className="px-6 py-4 text-right font-black text-[12px] text-gray-950">{row.total}</td>
                      </tr>
                    ))}
                    {matrixJabatan.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center opacity-30">
                          <i className="bi bi-search text-5xl mb-4 block"></i>
                          <p className="text-[10px] font-black uppercase tracking-widest">Data tidak ditemukan dengan filter saat ini</p>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* NOTIFIKASI MODAL */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 pt-[140px] pb-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsNotifOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter max-h-full">
              
              <div className="p-8 md:p-10 shrink-0 bg-gray-50/50 border-b relative z-50">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter">Personnel Monitoring</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Tindakan Administrasi Tahun {new Date().getFullYear()}</p>
                    </div>
                    <button onClick={() => setIsNotifOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                       <i className="bi bi-x-lg text-xl"></i>
                    </button>
                 </div>
                 <div className="flex bg-gray-200 p-1.5 rounded-2xl overflow-x-auto no-scrollbar gap-1">
                    <button onClick={() => setNotifTab('pensiun')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-xl transition-all ${notifTab==='pensiun' ? 'bg-white text-rose-600 shadow-md' : 'text-gray-500'}`}>Pensiun ({reminders.pensiun.length})</button>
                    <button onClick={() => setNotifTab('kgb')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-xl transition-all ${notifTab==='kgb' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}>KGB ({reminders.kgb.length})</button>
                    <button onClick={() => setNotifTab('pangkat')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-xl transition-all ${notifTab==='pangkat' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>Pangkat ({reminders.pangkat.length})</button>
                    <button onClick={() => setNotifTab('satya')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-xl transition-all ${notifTab==='satya' ? 'bg-white text-amber-600 shadow-md' : 'text-gray-500'}`}>Satya ({reminders.satya.length})</button>
                    <button onClick={() => setNotifTab('bangkom')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-xl transition-all ${notifTab==='bangkom' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500'}`}>Pelatihan ({reminders.bangkom.length})</button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-4 bg-white">
                 {(reminders[notifTab] || []).map((item, i) => (
                    <div key={i} className="p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] flex items-center gap-5 hover:bg-blue-50 transition-all shadow-sm group">
                       <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-950 uppercase truncate">{item.nama || 'Tanpa Nama'}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">{item.tmt || item.tmtTerakhir || '-'}</p>
                       </div>
                       <span className="shrink-0 px-3 py-1 bg-white border rounded-lg text-[9px] font-black uppercase text-gray-500">{item.sisa || item.keterangan || item.pengabdian || '-'}</span>
                    </div>
                 ))}
                 {(reminders[notifTab] || []).length === 0 && <div className="py-20 text-center opacity-30"><p className="text-[10px] font-black uppercase tracking-widest">Data terpantau aman</p></div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;