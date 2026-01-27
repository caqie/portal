
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, getRetirementDetails } from '../spreadsheetService';
import { Pegawai } from '../types';
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
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'pensiun' | 'kgb' | 'pangkat' | 'satya'>('pensiun');

  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  const [filterJenisMatrix, setFilterJenisMatrix] = useState('Semua Jenis');

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const pegData = await fetchPegawaiFromSheets();
      setPegawai(pegData);
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

  // --- ANALISA SEBARAN PEGAWAI PER UNIT KERJA ---
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

  // --- MATRIKS NOMENKLATUR JABATAN (DENGAN FILTER JENIS) ---
  const matrixJabatan = useMemo(() => {
    let list = activePegawaiList;
    if (filterJenisMatrix !== 'Semua Jenis') {
        if (filterJenisMatrix === 'PARUH') {
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

    return Object.entries(groups).map(([jabatan, total]) => ({ jabatan, total }))
      .sort((a, b) => b.total - a.total);
  }, [activePegawaiList, filterUnit, filterJenisMatrix]);

  // --- STATISTIK GENDER & PENDIDIKAN (LOGIKA REAL DARI SHEET) ---
  const genderStats = useMemo(() => ({
    pria: activePegawaiList.filter(p => p.gender === 'L').length,
    wanita: activePegawaiList.filter(p => p.gender === 'P').length
  }), [activePegawaiList]);

  const educationStats = useMemo(() => {
    const eduMap: Record<string, number> = {};
    activePegawaiList.forEach(p => {
      let edu = 'LAINNYA';
      // Mengambil data murni dari kolom pendidikan jika tersedia
      const pStr = (p.pendidikan || '').toUpperCase().trim();
      
      if (pStr.includes('S3') || pStr.includes('DOKTOR')) edu = 'S3 (DOKTOR)';
      else if (pStr.includes('S2') || pStr.includes('MAGISTER')) edu = 'S2 (MAGISTER)';
      else if (pStr.includes('S1') || pStr.includes('SARJANA')) edu = 'S1 (SARJANA)';
      else if (pStr.includes('DIV') || pStr.includes('D-IV')) edu = 'D-IV / SARJANA TERAPAN';
      else if (pStr.includes('DIII') || pStr.includes('D3') || pStr.includes('D-III')) edu = 'D-III';
      else if (pStr.includes('SMA') || pStr.includes('SMK') || pStr.includes('SLTA')) edu = 'SMA / SEDERAJAT';
      else if (pStr.includes('SMP') || pStr.includes('SLTP')) edu = 'SMP / SEDERAJAT';
      else if (pStr !== '') edu = pStr; // Jika ada teks tapi tidak masuk kategori di atas
      
      eduMap[edu] = (eduMap[edu] || 0) + 1;
    });
    return Object.entries(eduMap).map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [activePegawaiList]);

  // --- DOWNLOAD ANALYTICS ---
  const handleDownloadAnalytics = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Sebaran Per Unit
    const unitWs = XLSX.utils.json_to_sheet(unitDistribution.map(u => ({
      'Unit Kerja': u.unit,
      'PNS': u.pns,
      'CPNS': u.cpns,
      'PPPK': u.pppk,
      'PPPK Paruh Waktu': u.pppkParuh,
      'Total ASN': u.total
    })));
    XLSX.utils.book_append_sheet(wb, unitWs, "Sebaran Unit");

    // Sheet 2: Matriks Jabatan
    const jabWs = XLSX.utils.json_to_sheet(matrixJabatan.map(j => ({
      'Nomenklatur Jabatan': j.jabatan,
      'Jumlah Pegawai': j.total
    })));
    XLSX.utils.book_append_sheet(wb, jabWs, "Matriks Jabatan");

    // Sheet 3: Statistik Tambahan
    const extraData = [
      { Kategori: 'Gender Laki-laki', Jumlah: genderStats.pria },
      { Kategori: 'Gender Perempuan', Jumlah: genderStats.wanita },
      ...educationStats.map(e => ({ Kategori: `Pendidikan ${e.label}`, Jumlah: e.count }))
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extraData), "Statistik Pendukung");

    XLSX.writeFile(wb, `Analitik_SDM_DJKI_${new Date().getTime()}.xlsx`);
  };

  const reminders = useMemo(() => {
    const now = new Date();
    const listKGB: any[] = [];
    const listPangkat: any[] = [];
    const listPensiun: any[] = [];
    const listSatya: any[] = [];

    activePegawaiList.forEach(p => {
      // Logic Pensiun
      const ret = getRetirementDetails(p.nip, p.jabatan || '');
      if (ret) {
        const diffMonths = (ret.tmtPensiun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (diffMonths > -1 && diffMonths <= 24) {
          listPensiun.push({ nama: p.nama, nip: p.nip, tmt: ret.tmtPensiun.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), sisa: ret.sisaMasaKerja });
        }
      }
      // Logic KGB & Pangkat (berdasarkan TMT Pangkat Terakhir)
      if (p.tmtPangkat) {
        const tmtParts = p.tmtPangkat.split('-');
        if (tmtParts.length === 3) {
            const tmtDate = new Date(parseInt(tmtParts[0]), parseInt(tmtParts[1])-1, parseInt(tmtParts[2]));
            const diffMonths = (now.getFullYear() - tmtDate.getFullYear()) * 12 + (now.getMonth() - tmtDate.getMonth());
            
            // KGB setiap 2 tahun (24 bulan), notif muncul di bulan ke-22 atau ke-23
            if (diffMonths > 0 && (diffMonths % 24 >= 22)) {
                listKGB.push({ nama: p.nama, nip: p.nip, tmtTerakhir: p.tmtPangkat, keterangan: `KGB Berikutnya: ${24 - (diffMonths % 24)} bulan lagi` });
            }
            // Pangkat setiap 4 tahun (48 bulan), notif muncul di bulan ke-46 atau ke-47
            if (diffMonths >= 46 && (diffMonths % 48 >= 46 || diffMonths % 48 === 0)) {
                listPangkat.push({ nama: p.nama, nip: p.nip, tmtTerakhir: p.tmtPangkat, keterangan: `KP Berikutnya: ${48 - (diffMonths % 48)} bulan lagi` });
            }
        }
      }
      // Logic Satya Lencana (Berdasarkan NIP digit 9-12)
      const cleanNip = p.nip.replace(/\s/g, '');
      if (cleanNip.length >= 14) {
        const cpnsYear = parseInt(cleanNip.substring(8, 12));
        const diffYears = now.getFullYear() - cpnsYear;
        if ([10, 20, 30].includes(diffYears)) {
           listSatya.push({ nama: p.nama, nip: p.nip, tahun: diffYears, pengabdian: `${diffYears} Tahun` });
        }
      }
    });
    return { kgb: listKGB, pangkat: listPangkat, pensiun: listPensiun, satya: listSatya };
  }, [activePegawaiList]);

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Intelligence Hub DJKI</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
             <i className="bi bi-cpu-fill text-blue-600"></i> Real-time Analytics Dashboard
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button onClick={handleDownloadAnalytics} className="flex items-center gap-3 bg-emerald-600 p-4 px-8 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
             <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i>
             Download Analytics
          </button>
          <button onClick={() => setIsNotifOpen(true)} className="relative flex items-center gap-4 bg-white p-4 px-8 rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all group">
             <i className="bi bi-bell-fill text-xl text-blue-600 group-hover:animate-swing"></i>
             {reminders.kgb.length + reminders.pangkat.length + reminders.pensiun.length + reminders.satya.length > 0 && (
               <span className="absolute -top-2 -right-2 h-6 w-6 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-[#F8F9FC] animate-bounce">
                  {reminders.kgb.length + reminders.pangkat.length + reminders.pensiun.length + reminders.satya.length}
               </span>
             )}
          </button>
        </div>
      </div>

      {/* QUICK ANALYTICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard title="Total ASN Aktif" value={activePegawaiList.length} icon="bi-people-fill" color="bg-blue-600" loading={loading} />
        <StatsCard title="Total PNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase() === 'PNS').length} icon="bi-person-vcard" color="bg-indigo-600" loading={loading} />
        <StatsCard title="Total CPNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase() === 'CPNS').length} icon="bi-person-plus" color="bg-cyan-600" loading={loading} />
        <StatsCard title="Total PPPK" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase() === 'PPPK').length} icon="bi-person-check" color="bg-sky-600" loading={loading} />
        <StatsCard title="PPPK Paruh Waktu" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase().includes('PARUH')).length} icon="bi-person-gear" color="bg-rose-600" loading={loading} />
      </div>

      {/* TABEL SEBARAN PER UNIT KERJA */}
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
        {/* STATISTIK GENDER & PENDIDIKAN */}
        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em] mb-6">Statistik Gender</h4>
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

           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em] mb-6">Statistik Tingkat Pendidikan</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {educationStats.map((edu, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl hover:bg-blue-50 transition-colors group">
                       <span className="text-[10px] font-black text-gray-600 uppercase group-hover:text-blue-600 transition-colors">{edu.label}</span>
                       <span className="text-[12px] font-black text-gray-950">{edu.count} ASN</span>
                    </div>
                 ))}
                 {educationStats.length === 0 && (
                    <div className="py-10 text-center text-gray-300 uppercase text-[10px] font-black">Data tidak terdeteksi</div>
                 )}
              </div>
           </div>
        </div>

        {/* MATRIKS SEBARAN JABATAN */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
              <div>
                 <h4 className="text-[12px] font-black text-gray-950 uppercase tracking-[0.3em]">Matriks Nomenklatur Jabatan</h4>
                 <p className="text-[8px] text-gray-400 font-bold uppercase mt-1 tracking-widest text-blue-600">Total Sebaran Nomenklatur Jabatan Terpusat</p>
              </div>
              <div className="flex flex-wrap gap-2">
                 <select className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[8px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                    <option value="Semua Unit">Unit Kerja</option>
                    {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 20)}...</option>)}
                 </select>
                 <select className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[8px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterJenisMatrix} onChange={e => setFilterJenisMatrix(e.target.value)}>
                    <option value="Semua Jenis">Jenis ASN</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="PARUH">Paruh Waktu</option>
                 </select>
              </div>
           </div>
           
           <div className="overflow-x-auto max-h-[480px] flex-1 custom-scrollbar border border-gray-50 rounded-3xl">
              <table className="w-full text-left border-collapse">
                 <thead className="sticky top-0 bg-white z-20 shadow-sm text-[8px] font-black uppercase text-gray-400">
                    <tr>
                       <th className="px-10 py-6 border-b">Nama Nomenklatur Jabatan</th>
                       <th className="px-6 py-6 text-right border-b text-blue-600">Total ASN</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {matrixJabatan.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                         <td className="px-10 py-4 font-bold text-[10px] text-gray-800 uppercase leading-tight">{row.jabatan}</td>
                         <td className="px-6 py-4 text-right font-black text-[12px] text-gray-950">{row.total}</td>
                      </tr>
                    ))}
                    {matrixJabatan.length === 0 && (
                      <tr><td colSpan={2} className="py-20 text-center text-gray-300 font-black uppercase text-[10px]">Data tidak tersedia</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* NOTIFICATION MODAL (AKTIF & TERHUBUNG DATA) */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-0 md:p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsNotifOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl md:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter h-full md:h-auto md:max-h-[85vh]">
              <div className="p-8 md:p-10 shrink-0 bg-gray-50/50 border-b">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h4 className="text-2xl font-black uppercase text-gray-950 tracking-tighter">Personnel Monitoring</h4>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Daftar ASN yang Memerlukan Tindakan Administrasi</p>
                    </div>
                    <button onClick={() => setIsNotifOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white rounded-2xl shadow-sm transition-all"><i className="bi bi-x-lg text-xl"></i></button>
                 </div>
                 <div className="flex bg-gray-200 p-1.5 rounded-[1.5rem] overflow-x-auto no-scrollbar gap-1">
                    <button onClick={() => setNotifTab('pensiun')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='pensiun' ? 'bg-white text-rose-600 shadow-md' : 'text-gray-500'}`}>Pensiun ({reminders.pensiun.length})</button>
                    <button onClick={() => setNotifTab('kgb')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='kgb' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}>KGB ({reminders.kgb.length})</button>
                    <button onClick={() => setNotifTab('pangkat')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='pangkat' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>Pangkat ({reminders.pangkat.length})</button>
                    <button onClick={() => setNotifTab('satya')} className={`flex-1 min-w-[100px] py-3.5 text-[9px] font-black uppercase rounded-2xl transition-all ${notifTab==='satya' ? 'bg-white text-amber-600 shadow-md' : 'text-gray-500'}`}>Satya ({reminders.satya.length})</button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar space-y-4 min-h-[300px]">
                 {notifTab === 'pensiun' && reminders.pensiun.map((item, i) => (
                    <div key={i} className="p-5 bg-rose-50/30 border border-rose-100 rounded-3xl flex justify-between items-center group hover:bg-rose-50 transition-all">
                       <div>
                          <p className="text-[11px] font-black text-gray-950 uppercase">{item.nama}</p>
                          <p className="text-[9px] font-bold text-rose-600 uppercase mt-1">TMT Pensiun: {item.tmt}</p>
                       </div>
                       <span className="px-3 py-1 bg-white border border-rose-100 rounded-lg text-[9px] font-black text-rose-600 shadow-sm">{item.sisa}</span>
                    </div>
                 ))}
                 
                 {notifTab === 'kgb' && reminders.kgb.map((item, i) => (
                    <div key={i} className="p-5 bg-emerald-50/30 border border-emerald-100 rounded-3xl flex justify-between items-center group hover:bg-emerald-50 transition-all">
                       <div>
                          <p className="text-[11px] font-black text-gray-950 uppercase">{item.nama}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">NIP. {item.nip}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-emerald-600 uppercase">{item.keterangan}</p>
                          <p className="text-[7px] text-gray-400 uppercase mt-1">TMT Terakhir: {item.tmtTerakhir}</p>
                       </div>
                    </div>
                 ))}

                 {notifTab === 'pangkat' && reminders.pangkat.map((item, i) => (
                    <div key={i} className="p-5 bg-blue-50/30 border border-blue-100 rounded-3xl flex justify-between items-center group hover:bg-blue-50 transition-all">
                       <div>
                          <p className="text-[11px] font-black text-gray-950 uppercase">{item.nama}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">NIP. {item.nip}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[9px] font-black text-blue-600 uppercase">{item.keterangan}</p>
                          <p className="text-[7px] text-gray-400 uppercase mt-1">TMT Terakhir: {item.tmtTerakhir}</p>
                       </div>
                    </div>
                 ))}

                 {notifTab === 'satya' && reminders.satya.map((item, i) => (
                    <div key={i} className="p-5 bg-amber-50/30 border border-amber-100 rounded-3xl flex justify-between items-center group hover:bg-amber-50 transition-all">
                       <div>
                          <p className="text-[11px] font-black text-gray-950 uppercase">{item.nama}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">NIP. {item.nip}</p>
                       </div>
                       <span className="px-4 py-1.5 bg-amber-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-amber-500/20 uppercase tracking-widest">{item.pengabdian}</span>
                    </div>
                 ))}

                 {(reminders[notifTab] || []).length === 0 && (
                    <div className="py-20 text-center opacity-40">
                       <i className="bi bi-shield-check text-6xl text-gray-300 block mb-6"></i>
                       <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Tidak ada notifikasi aktif untuk kategori ini</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        @keyframes swing {
           0% { transform: rotate(0deg); }
           20% { transform: rotate(15deg); }
           40% { transform: rotate(-10deg); }
           60% { transform: rotate(5deg); }
           80% { transform: rotate(-5deg); }
           100% { transform: rotate(0deg); }
        }
        .group:hover .group-hover\\:animate-swing { animation: swing 0.8s ease-in-out; }
      `}</style>
    </div>
  );
};

export default Dashboard;
