import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
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
      const cleanNip = (p.nip || '').replace(/\D/g, '');
      const cpnsYear = cleanNip.length >= 12 ? parseInt(cleanNip.substring(8, 12)) : null;
      const workingYears = cpnsYear ? (filterYear - cpnsYear) : null;
      
      let category = '-';
      if (workingYears === 10) category = '10 TAHUN';
      else if (workingYears === 20) category = '20 TAHUN';
      else if (workingYears === 30) category = '30 TAHUN';

      return { ...p, cpnsYear, workingYears, category };
    }).filter(p => {
      const isEligible = p.workingYears !== null && [10, 20, 30].includes(p.workingYears);
      const matchCategory = filterCategory === 'SEMUA' || p.category === filterCategory;
      return isEligible && matchCategory;
    });
  }, [pegawaiList, filterYear, filterCategory]);

  const handleExport = () => {
    const data = eligiblePegawai.map(p => ({
      'NIP': p.nip,
      'Nama': p.nama,
      'Jabatan': p.jabatan,
      'Unit Kerja': p.unitKerja,
      'Tahun CPNS': p.cpnsYear,
      'Masa Kerja': p.workingYears,
      'Kategori Satyalencana': p.category
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Eligible Satyalencana");
    XLSX.writeFile(wb, `Satyalencana_DJKI_${filterYear}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">Monitoring Satyalencana</h3>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
           <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b">
              <tr><th className="px-10 py-5">Pegawai</th><th className="px-4 py-5 text-center">Tahun CPNS</th><th className="px-10 py-5 text-right">Kategori</th></tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {eligiblePegawai.map(p => (
                <tr key={p.nip} className="hover:bg-blue-50/5 transition-all">
                   <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p></td>
                   <td className="px-4 py-5 text-center font-bold text-gray-600">{p.cpnsYear}</td>
                   <td className="px-10 py-5 text-right"><span className="px-4 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-[9px] font-black">{p.category}</span></td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default SatyaLencanaPage;