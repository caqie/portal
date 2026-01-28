
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai } from '../types';
import * as XLSX from 'xlsx';

const SatyaLencanaPage = () => {
  const navigate = useNavigate();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterCategory, setFilterCategory] = useState<string>('SEMUA');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchPegawaiFromSheets();
        setPegawaiList(data);
      } catch (e) {
        console.error("Gagal memuat data pegawai", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const eligiblePegawai = useMemo(() => {
    return pegawaiList.map(p => {
      // NIP digit 9-12 adalah tahun CPNS
      const cleanNip = (p.nip || '').replace(/\D/g, '');
      const cpnsYear = cleanNip.length >= 12 ? parseInt(cleanNip.substring(8, 12)) : null;
      const workingYears = cpnsYear ? (filterYear - cpnsYear) : null;
      
      let category = '-';
      if (workingYears === 10) category = 'X TAHUN';
      else if (workingYears === 20) category = 'XX TAHUN';
      else if (workingYears === 30) category = 'XXX TAHUN';

      return { ...p, cpnsYear, workingYears, category };
    }).filter(p => {
      const isEligible = p.workingYears !== null && [10, 20, 30].includes(p.workingYears);
      const matchesCategory = filterCategory === 'SEMUA' || 
        (filterCategory === '10' && p.workingYears === 10) ||
        (filterCategory === '20' && p.workingYears === 20) ||
        (filterCategory === '30' && p.workingYears === 30);
      
      return isEligible && matchesCategory;
    }).sort((a, b) => (b.workingYears || 0) - (a.workingYears || 0));
  }, [pegawaiList, filterYear, filterCategory]);

  const handleExport = () => {
    const data = eligiblePegawai.map(p => ({
      'Nama Pegawai': p.nama,
      'NIP': p.nip,
      'Tahun CPNS': p.cpnsYear,
      'Masa Kerja Proyeksi': p.workingYears,
      'Kategori Satya Lencana': p.category,
      'Unit Kerja': p.unitKerja
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Satya Lencana");
    XLSX.writeFile(wb, `Satya_Lencana_DJKI_${filterYear}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Monitoring Satya Lencana</h3>
            <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Sistem Seleksi Otomatis Masa Kerja 10, 20, 30 Tahun</p>
          </div>
        </div>
        <button onClick={handleExport} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-3 active:scale-95 transition-all">
           <i className="bi bi-file-earmark-spreadsheet-fill text-lg"></i> Ekspor Excel
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full md:w-auto">
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3 block mb-1">Tahun Proyeksi</label>
          <select 
            className="w-full px-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all"
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>TAHUN {y}</option>)}
          </select>
        </div>
        <div className="flex-1 w-full md:w-auto">
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-3 block mb-1">Kategori Penghargaan</label>
          <select 
            className="w-full px-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="SEMUA">SEMUA KATEGORI</option>
            <option value="10">10 TAHUN (X)</option>
            <option value="20">20 TAHUN (XX)</option>
            <option value="30">30 TAHUN (XXX)</option>
          </select>
        </div>
        <div className="h-full pt-5">
           <div className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center gap-3">
              <i className="bi bi-person-check-fill"></i>
              <span className="text-[10px] font-black uppercase">{eligiblePegawai.length} ASN Eligible</span>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Identitas ASN</th>
                <th className="px-4 py-6 text-center">Tahun CPNS</th>
                <th className="px-4 py-6 text-center">Masa Kerja</th>
                <th className="px-4 py-6 text-center">Kategori Lencana</th>
                <th className="px-10 py-6">Unit Kerja Pengampu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr><td colSpan={5} className="py-32 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest animate-pulse">Sinkronisasi Database Pegawai...</td></tr>
              ) : eligiblePegawai.map(p => (
                <tr key={p.nip} className="hover:bg-blue-50/5 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black border-2 border-white shadow-md">
                          {p.nama.charAt(0)}
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p>
                          <p className="text-[9px] font-mono text-blue-600 mt-1">NIP. {p.nip}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-6 text-center font-bold text-[10px] text-gray-500">{p.cpnsYear || '-'}</td>
                  <td className="px-4 py-6 text-center">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-600">{p.workingYears} TAHUN</span>
                  </td>
                  <td className="px-4 py-6 text-center">
                    <div className={`inline-flex px-4 py-1 rounded-full text-[9px] font-black uppercase border ${
                       p.workingYears === 30 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                       p.workingYears === 20 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                       'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                       <i className="bi bi-star-fill mr-2"></i> {p.category}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight truncate max-w-[300px]">{p.unitKerja}</p>
                  </td>
                </tr>
              ))}
              {eligiblePegawai.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-32 text-center opacity-40">
                     <i className="bi bi-shield-check text-6xl text-gray-300 block mb-6"></i>
                     <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                        Tidak ada pegawai yang eligible<br/>untuk tahun proyeksi {filterYear}
                     </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 flex items-start gap-6">
         <div className="h-12 w-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-lg">
            <i className="bi bi-info-circle-fill"></i>
         </div>
         <div>
            <h5 className="text-sm font-black uppercase text-amber-900 mb-2 tracking-tighter">Informasi Kriteria Pengusulan</h5>
            <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
               Data di atas merupakan hasil automasi seleksi berdasarkan digit NIP. Sesuai Peraturan Pemerintah, pengusulan Satya Lencana Karya Satika mensyaratkan Pegawai Negeri Sipil yang telah bekerja dengan penuh kesetiaan, pengabdian, kecakapan, kejujuran, dan disiplin secara terus menerus selama 10, 20, atau 30 tahun serta tidak pernah dijatuhi hukuman disiplin tingkat sedang atau berat.
            </p>
         </div>
      </div>
    </div>
  );
};

export default SatyaLencanaPage;
