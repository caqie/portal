import React, { useState, useMemo } from 'react';
import { Pegawai, Pengembangan } from '../types';
import { formatPegawaiName } from '../constants';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  ComposedChart,
  Line
} from 'recharts';
import {
  PegawaiCompetencyDetail,
  UnitKerjaCompetencyStats,
  JenjangCompetencyStats,
  RumpunJabatanStats,
  DimensiStats,
  LIST_UNIT_KERJA_DJKI,
  SHORT_UNIT_NAMES,
  DIMENSI_MANAJERIAL_METADATA,
  getPegawaiCompetencyDetail,
  FALLBACK_REPRESENTATIVE_PEGAWAI,
  calculateUnitKerjaStats,
  calculateJenjangStats,
  calculateRumpunStats,
  calculateDimensiStats
} from '../kompetensiDashboardData';

interface Props {
  pegawaiList: Pegawai[];
  riwayatPelatihanList: Pengembangan[];
  onSelectPegawaiForProfile?: (nip: string) => void;
}

const COLORS = {
  indigo: '#4f46e5',
  indigoLight: '#818cf8',
  emerald: '#10b981',
  emeraldLight: '#34d399',
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  rose: '#f43f5e',
  blue: '#0284c7',
  cyan: '#06b6d4',
  purple: '#8b5cf6',
  slate: '#64748b',
  grayLight: '#f1f5f9'
};

const PIE_COLORS = [
  '#10b981', // Optimal - Emerald
  '#4f46e5', // Memenuhi Standar - Indigo
  '#0284c7', // Cukup - Sky Blue
  '#f59e0b', // Perlu Pembinaan - Amber
  '#f43f5e'  // Gap Tinggi - Rose
];

export const KompetensiDashboardView: React.FC<Props> = ({
  pegawaiList,
  riwayatPelatihanList,
  onSelectPegawaiForProfile
}) => {
  // Mode Tampilan Visual
  const [activeSubTab, setActiveSubTab] = useState<'unit_kerja' | 'jabatan' | 'dimensi' | 'daftar_pegawai'>('unit_kerja');

  // Filter State
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('Semua Unit');
  const [selectedJenjangFilter, setSelectedJenjangFilter] = useState<string>('Semua Jenjang');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Semua Status');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Unit terpilih untuk komparasi radar
  const [radarUnitCompare, setRadarUnitCompare] = useState<string>(LIST_UNIT_KERJA_DJKI[0]);

  // Gabungkan data pegawai nyata dengan data representative fallback jika data awal sangat sedikit
  const combinedPegawaiList = useMemo(() => {
    const list = [...pegawaiList];
    // Jika pegawai nyata kurang dari 12, lengkapi dengan sample representative agar visualisasi kaya
    if (list.length < 12) {
      FALLBACK_REPRESENTATIVE_PEGAWAI.forEach(fallback => {
        if (!list.some(p => p.nip === fallback.nip)) {
          list.push(fallback as Pegawai);
        }
      });
    }
    return list;
  }, [pegawaiList]);

  // Hitung detail kompetensi untuk seluruh pegawai
  const allPegawaiDetails = useMemo(() => {
    return combinedPegawaiList.map(p => getPegawaiCompetencyDetail(p));
  }, [combinedPegawaiList]);

  // Filter list pegawai berdasarkan pilihan dropdown & search
  const filteredPegawaiDetails = useMemo(() => {
    return allPegawaiDetails.filter(p => {
      const matchUnit = selectedUnitFilter === 'Semua Unit' || 
        p.unitKerja.toLowerCase().includes(selectedUnitFilter.toLowerCase()) ||
        selectedUnitFilter.toLowerCase().includes(p.unitKerja.toLowerCase());
      
      const matchJenjang = selectedJenjangFilter === 'Semua Jenjang' || p.jenjangJabatan === selectedJenjangFilter;
      
      const matchStatus = selectedStatusFilter === 'Semua Status' || p.statusPemenuhan === selectedStatusFilter;

      const matchSearch = !searchTerm ||
        p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nip.includes(searchTerm) ||
        p.jabatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());

      return matchUnit && matchJenjang && matchStatus && matchSearch;
    });
  }, [allPegawaiDetails, selectedUnitFilter, selectedJenjangFilter, selectedStatusFilter, searchTerm]);

  // Statistik Agregat Organisasi
  const orgMetrics = useMemo(() => {
    const total = allPegawaiDetails.length;
    if (total === 0) {
      return {
        totalPegawai: 0,
        avgManajerial: 0,
        avgPerilaku360: 0,
        fitRate: 0,
        optimalCount: 0,
        fitCount: 0,
        gapCount: 0,
        bestUnit: '-',
        weakestDimension: '-'
      };
    }

    const sumM = allPegawaiDetails.reduce((acc, p) => acc + p.skorManajerialAvg, 0);
    const sum360 = allPegawaiDetails.reduce((acc, p) => acc + p.skorPerilaku360Avg, 0);
    const fitCount = allPegawaiDetails.filter(p => p.statusPemenuhan !== 'Perlu Pengembangan').length;
    const optimalCount = allPegawaiDetails.filter(p => p.statusPemenuhan === 'Optimal').length;
    const gapCount = total - fitCount;

    // Unit terbaik
    const unitStats = calculateUnitKerjaStats(allPegawaiDetails);
    const sortedUnit = [...unitStats].sort((a, b) => b.avgManajerial - a.avgManajerial);
    const bestUnit = sortedUnit[0]?.shortName || '-';

    // Dimensi terlemah
    const dimStats = calculateDimensiStats(allPegawaiDetails);
    const sortedDim = [...dimStats].sort((a, b) => a.rataRata - b.rataRata);
    const weakestDim = sortedDim[0] ? `${sortedDim[0].nama} (${sortedDim[0].kode})` : '-';

    return {
      totalPegawai: total,
      avgManajerial: parseFloat((sumM / total).toFixed(2)),
      avgPerilaku360: parseFloat((sum360 / total).toFixed(1)),
      fitRate: Math.round((fitCount / total) * 100),
      optimalCount,
      fitCount,
      gapCount,
      bestUnit,
      weakestDimension: weakestDim
    };
  }, [allPegawaiDetails]);

  // Statistik Unit Kerja
  const unitKerjaStats = useMemo(() => {
    return calculateUnitKerjaStats(allPegawaiDetails);
  }, [allPegawaiDetails]);

  // Data Bar Chart Unit Kerja
  const barUnitData = useMemo(() => {
    return unitKerjaStats.map(u => ({
      name: u.shortName,
      fullName: u.unitKerja,
      skor: u.avgManajerial,
      standar: u.standarRataRata,
      gap: u.gapRataRata,
      pegawai: u.totalPegawai,
      fitPct: u.fitPercentage,
      kategori: u.kategori
    }));
  }, [unitKerjaStats]);

  // Data Distribusi Kategori Kecakapan (Donut Chart)
  const categoryDistributionData = useMemo(() => {
    const optimal = allPegawaiDetails.filter(p => p.skorManajerialAvg >= 3.5).length;
    const memenuhi = allPegawaiDetails.filter(p => p.skorManajerialAvg >= 2.8 && p.skorManajerialAvg < 3.5).length;
    const cukup = allPegawaiDetails.filter(p => p.skorManajerialAvg >= 2.2 && p.skorManajerialAvg < 2.8).length;
    const perlu = allPegawaiDetails.filter(p => p.skorManajerialAvg < 2.2).length;

    return [
      { name: 'Optimal / Sangat Baik (3.5 - 4.0)', value: optimal, count: optimal, color: '#10b981' },
      { name: 'Memenuhi Standar (2.8 - 3.49)', value: memenuhi, count: memenuhi, color: '#4f46e5' },
      { name: 'Cukup (2.2 - 2.79)', value: cukup, count: cukup, color: '#0284c7' },
      { name: 'Perlu Pembinaan (< 2.2)', value: perlu, count: perlu, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [allPegawaiDetails]);

  // Data Pemenuhan Standar SKJ per Unit Kerja (Stacked Bar)
  const stackedFitData = useMemo(() => {
    return unitKerjaStats.map(u => ({
      name: u.shortName,
      memenuhi: u.fitCount,
      gap: u.gapCount,
      total: u.totalPegawai,
      fitPct: u.fitPercentage
    }));
  }, [unitKerjaStats]);

  // Data Komparasi Radar Unit Kerja vs Rata-Rata DJKI
  const radarUnitData = useMemo(() => {
    const targetUnit = unitKerjaStats.find(u => u.unitKerja === radarUnitCompare) || unitKerjaStats[0];
    const dimTotal = calculateDimensiStats(allPegawaiDetails);

    return DIMENSI_MANAJERIAL_METADATA.map(meta => {
      const unitVal = targetUnit?.dimensiScores ? (targetUnit.dimensiScores as any)[meta.kode] || 0 : 0;
      const avgDjki = dimTotal.find(d => d.kode === meta.kode)?.rataRata || 2.8;

      return {
        subject: meta.label,
        kode: meta.kode,
        unitNilai: unitVal,
        djkiNilai: avgDjki,
        fullMark: 4
      };
    });
  }, [unitKerjaStats, radarUnitCompare, allPegawaiDetails]);

  // Statistik Jenjang Jabatan
  const jenjangStats = useMemo(() => {
    return calculateJenjangStats(allPegawaiDetails);
  }, [allPegawaiDetails]);

  // Statistik Rumpun Jabatan
  const rumpunStats = useMemo(() => {
    return calculateRumpunStats(allPegawaiDetails);
  }, [allPegawaiDetails]);

  // Data 8 Dimensi Manajerial
  const dimensiStats = useMemo(() => {
    return calculateDimensiStats(allPegawaiDetails);
  }, [allPegawaiDetails]);

  // Data Radar 5 Aspek Perilaku Kerja 360
  const radar360Data = useMemo(() => {
    const count = allPegawaiDetails.length || 1;
    const sum = { pelayanan: 0, komitmen: 0, inisiatif: 0, kerjasama: 0, kepemimpinan: 0 };

    allPegawaiDetails.forEach(p => {
      sum.pelayanan += p.perilaku360Scores.pelayanan;
      sum.komitmen += p.perilaku360Scores.komitmen;
      sum.inisiatif += p.perilaku360Scores.inisiatif;
      sum.kerjasama += p.perilaku360Scores.kerjasama;
      sum.kepemimpinan += p.perilaku360Scores.kepemimpinan;
    });

    return [
      { subject: 'Orientasi Pelayanan', nilai: Math.round(sum.pelayanan / count), target: 90 },
      { subject: 'Komitmen', nilai: Math.round(sum.komitmen / count), target: 90 },
      { subject: 'Inisiatif Kerja', nilai: Math.round(sum.inisiatif / count), target: 88 },
      { subject: 'Kerjasama', nilai: Math.round(sum.kerjasama / count), target: 90 },
      { subject: 'Kepemimpinan', nilai: Math.round(sum.kepemimpinan / count), target: 85 }
    ];
  }, [allPegawaiDetails]);

  // Handler Ekspor Excel Data Visualisasi
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Rekapitulasi per Unit Kerja
    const sheet1Data = unitKerjaStats.map(u => ({
      'Unit Kerja': u.unitKerja,
      'Singkatan': u.shortName,
      'Jumlah Pegawai': u.totalPegawai,
      'Rata-Rata Skor Manajerial (1-4)': u.avgManajerial,
      'Standar Minimum Acuan': u.standarRataRata,
      'Gap Skor': u.gapRataRata,
      'Rata-Rata Perilaku 360 (1-100)': u.avgPerilaku360,
      'Jumlah Memenuhi Standar': u.fitCount,
      'Jumlah Butuh Pengembangan': u.gapCount,
      'Tingkat Pemenuhan (%)': `${u.fitPercentage}%`,
      'Kategori Kelayakan': u.kategori
    }));
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    XLSX.utils.book_append_sheet(wb, ws1, 'Rekap Unit Kerja');

    // Sheet 2: Rekapitulasi per Jenjang Jabatan
    const sheet2Data = jenjangStats.map(j => ({
      'Jenjang Jabatan': j.jenjang,
      'Jumlah Pegawai': j.totalPegawai,
      'Rata-Rata Skor Manajerial': j.avgManajerial,
      'Standar Minimum': j.standarMinimum,
      'Gap Skor': j.gap,
      'Tingkat Pemenuhan (%)': `${j.fitPercentage}%`
    }));
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws2, 'Rekap Jenjang');

    // Sheet 3: Rincian Seluruh Pegawai Terasesmen
    const sheet3Data = allPegawaiDetails.map(p => ({
      'NIP': p.nip,
      'Nama Pegawai': p.nama,
      'Jabatan': p.jabatan,
      'Unit Kerja': p.unitKerja,
      'Jenjang': p.jenjangJabatan,
      'Rumpun': p.rumpunJabatan,
      'Skor Manajerial (Avg)': p.skorManajerialAvg,
      'Standar Minimum': p.standarMinimum,
      'Gap Skor': p.gapSkor,
      'Skor Perilaku 360': p.skorPerilaku360Avg,
      'Status Pemenuhan': p.statusPemenuhan,
      'Promotabel Pangkat': p.isPromotablePangkat ? 'YA' : 'TIDAK',
      'Promotabel Jabatan': p.isPromotableJabatan ? 'YA' : 'TIDAK',
      'Rekomendasi Bangkom': p.rekomendasiBangkom
    }));
    const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
    XLSX.utils.book_append_sheet(wb, ws3, 'Data Pegawai Lengkap');

    XLSX.writeFile(wb, `Dashboard_Kompetensi_DJKI_${new Date().getFullYear()}.xlsx`);
  };

  // Custom Tooltip Recharts untuk Bar Chart Unit Kerja
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-950 text-white p-4 rounded-2xl shadow-2xl border border-gray-800 text-[11px] max-w-xs backdrop-blur-md">
          <p className="font-black text-indigo-400 uppercase tracking-tight text-xs mb-1">{data.fullName}</p>
          <div className="space-y-1.5 pt-2 border-t border-gray-800 text-gray-300">
            <div className="flex justify-between">
              <span>Rata-Rata Skor:</span>
              <span className="font-black text-white text-xs">{data.skor} / 4.00</span>
            </div>
            <div className="flex justify-between">
              <span>Standar Acuan:</span>
              <span className="font-bold text-gray-400">{data.standar}</span>
            </div>
            <div className="flex justify-between">
              <span>Gap Capaian:</span>
              <span className={`font-black ${data.gap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.gap >= 0 ? `+${data.gap}` : data.gap}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Tingkat Pemenuhan:</span>
              <span className="font-black text-emerald-400">{data.fitPct}%</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Pegawai:</span>
              <span className="font-bold text-white">{data.pegawai} Orang</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* HEADER DASHBOARD */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
              <i className="bi bi-bar-chart-line-fill text-2xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-950 uppercase tracking-tight">
                Dashboard Visualisasi Kompetensi Pegawai
              </h2>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Direktorat Jenderal Kekayaan Intelektual • Berdasarkan PermenPAN-RB 38/2017 & PP 30/2019
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Tombol Ekspor Excel */}
          <button
            onClick={handleExportExcel}
            className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="bi bi-file-earmark-spreadsheet-fill text-base"></i>
            <span>Unduh Laporan Excel</span>
          </button>

          {/* Tombol Cetak */}
          <button
            onClick={() => window.print()}
            className="px-5 py-3.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-200 rounded-2xl font-black text-[10px] uppercase shadow-sm flex items-center gap-2 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="bi bi-printer-fill text-base"></i>
            <span>Cetak Dashboard</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Skor Manajerial */}
        <div className="bg-white p-6 rounded-[2.2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Rata-Rata Manajerial</span>
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-black">
              <i className="bi bi-award-fill"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-950 tracking-tight">{orgMetrics.avgManajerial}</span>
            <span className="text-xs font-black text-gray-400">/ 4.00</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-700 uppercase">
              {orgMetrics.avgManajerial >= 3.0 ? 'Kategori Baik' : 'Cukup'}
            </span>
            <span className="text-[9px] font-bold text-gray-400">8 Dimensi</span>
          </div>
        </div>

        {/* Card 2: SKJ Fit Rate */}
        <div className="bg-white p-6 rounded-[2.2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Tingkat Keterpenuhan (Fit)</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-black">
              <i className="bi bi-check-circle-fill"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 tracking-tight">{orgMetrics.fitRate}%</span>
          </div>
          <div className="mt-3 text-[9px] font-bold text-gray-400 flex justify-between items-center">
            <span>{orgMetrics.fitCount} Memenuhi</span>
            <span className="text-rose-500 font-black">{orgMetrics.gapCount} Ada Gap</span>
          </div>
        </div>

        {/* Card 3: Skor Perilaku 360 */}
        <div className="bg-white p-6 rounded-[2.2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Indeks Perilaku 360</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-600 tracking-tight">{orgMetrics.avgPerilaku360}</span>
            <span className="text-xs font-black text-gray-400">/ 100</span>
          </div>
          <div className="mt-3">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 uppercase">
              Sangat Baik (PP 30)
            </span>
          </div>
        </div>

        {/* Card 4: Unit Kerja Tertinggi */}
        <div className="bg-white p-6 rounded-[2.2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Unit Kerja Unggul</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-black">
              <i className="bi bi-trophy-fill"></i>
            </div>
          </div>
          <div className="truncate">
            <span className="text-lg font-black text-gray-950 uppercase tracking-tight block truncate">
              {orgMetrics.bestUnit}
            </span>
          </div>
          <div className="mt-3 text-[9px] font-bold text-gray-400">
            Skor Manajerial Tertinggi
          </div>
        </div>

        {/* Card 5: Prioritas Bangkom */}
        <div className="bg-white p-6 rounded-[2.2rem] border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Fokus Peningkatan</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-sm font-black">
              <i className="bi bi-lightning-charge-fill"></i>
            </div>
          </div>
          <div className="truncate">
            <span className="text-xs font-black text-rose-600 uppercase block truncate">
              {orgMetrics.weakestDimension}
            </span>
          </div>
          <div className="mt-3 text-[9px] font-bold text-gray-400">
            Kebutuhan Diklat Tertinggi
          </div>
        </div>
      </div>

      {/* FILTER & NAVIGASI TAB VISUALISASI */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Navigasi Sub-Tab */}
        <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('unit_kerja')}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'unit_kerja'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <i className="bi bi-building text-sm"></i>
            <span>Distribusi Unit Kerja</span>
          </button>

          <button
            onClick={() => setActiveSubTab('jabatan')}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'jabatan'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <i className="bi bi-diagram-3 text-sm"></i>
            <span>Distribusi Jabatan & Jenjang</span>
          </button>

          <button
            onClick={() => setActiveSubTab('dimensi')}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'dimensi'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <i className="bi bi-pie-chart-fill text-sm"></i>
            <span>Analisis 8 Dimensi & 360</span>
          </button>

          <button
            onClick={() => setActiveSubTab('daftar_pegawai')}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'daftar_pegawai'
                ? 'bg-white text-indigo-600 shadow-md'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <i className="bi bi-table text-sm"></i>
            <span>Matriks & Drilldown Pegawai</span>
          </button>
        </div>

        {/* Filter Cepat */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedUnitFilter}
            onChange={e => setSelectedUnitFilter(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-600 transition-all cursor-pointer"
          >
            <option value="Semua Unit">Semua Unit Kerja ({allPegawaiDetails.length})</option>
            {LIST_UNIT_KERJA_DJKI.map(u => (
              <option key={u} value={u}>
                {SHORT_UNIT_NAMES[u] || u}
              </option>
            ))}
          </select>

          <select
            value={selectedJenjangFilter}
            onChange={e => setSelectedJenjangFilter(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-600 transition-all cursor-pointer"
          >
            <option value="Semua Jenjang">Semua Jenjang Jabatan</option>
            <option value="JPT Pratama / Eselon II">JPT Pratama / Eselon II</option>
            <option value="Administrator (Eselon III)">Administrator (Eselon III)</option>
            <option value="JF Ahli Madya">JF Ahli Madya</option>
            <option value="Pengawas / Subkoordinator">Pengawas / Subkoordinator</option>
            <option value="JF Ahli Muda">JF Ahli Muda</option>
            <option value="JF Ahli Pertama">JF Ahli Pertama</option>
            <option value="JF Keterampilan">JF Keterampilan</option>
            <option value="Jabatan Pelaksana">Jabatan Pelaksana</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-indigo-600 transition-all cursor-pointer"
          >
            <option value="Semua Status">Semua Status Kelayakan</option>
            <option value="Optimal">Optimal (Melampaui Standar)</option>
            <option value="Memenuhi">Memenuhi Standar</option>
            <option value="Perlu Pengembangan">Perlu Pengembangan / Gap</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: DISTRIBUSI BERDASARKAN UNIT KERJA
         ========================================================================= */}
      {activeSubTab === 'unit_kerja' && (
        <div className="space-y-8">
          {/* Bar Chart: Rata-rata Skor Manajerial per Unit Kerja vs Standar */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Rata-Rata Skor Kompetensi Manajerial Berdasarkan Unit Kerja
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Skala 1.00 - 4.00 • Garis putus-putus merah menunjukkan ambang batas standar minimum (2.75)
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block"></span> Skor Aktual
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-rose-500 inline-block border border-dashed border-rose-500"></span> Standar Minimum
                </span>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barUnitData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    domain={[0, 4]}
                    tickCount={5}
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <ReferenceLine
                    y={2.75}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Standar Min (2.75)',
                      position: 'top',
                      fill: '#f43f5e',
                      fontSize: 10,
                      fontWeight: 800
                    }}
                  />
                  <Bar
                    dataKey="skor"
                    name="Skor Manajerial"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  >
                    {barUnitData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.skor >= 3.1 ? '#4f46e5' : entry.skor >= 2.75 ? '#0284c7' : '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid 2 Kolom: Donut Distribusi Kategori & Stacked Bar Pemenuhan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pie / Donut Chart: Kategori Kecakapan */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Sebaran Kategori Kecakapan Pegawai
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Distribusi persentase seluruh pegawai terpetakan berdasarkan level capaian kompetensi
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryDistributionData.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${val} Pegawai (${Math.round((val / allPegawaiDetails.length) * 100)}%)`,
                        item.payload.name
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Manual Donut */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                {categoryDistributionData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-md shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-[10px] font-bold text-gray-600 truncate">{item.name}:</span>
                    <span className="text-[10px] font-black text-gray-950 ml-auto">{item.count} Orang</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stacked Bar Chart: Fit vs Gap per Unit Kerja */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Tingkat Keterpenuhan Standar Jabatan (SKJ Fit Rate)
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Komparasi jumlah pegawai yang memenuhi standar vs butuh pengembangan per unit kerja
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stackedFitData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#334155' }}
                      width={110}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `${val} Orang`,
                        name === 'memenuhi' ? 'Memenuhi Standar' : 'Butuh Diklat (Gap)'
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}
                      formatter={v => (v === 'memenuhi' ? 'Memenuhi Standar' : 'Ada Gap Kompetensi')}
                    />
                    <Bar dataKey="memenuhi" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="gap" fill="#f43f5e" stackId="a" radius={[0, 6, 6, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[10px] font-bold text-gray-400 italic">
                *Pegawai dengan gap kompetensi diprioritaskan pada kalender diklat klasikal / e-learning tahun berjalan.
              </p>
            </div>
          </div>

          {/* Radar Chart Komparasi: Unit Kerja Terpilih vs Rata-Rata Total DJKI */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Profil Radar 8 Kompetensi Manajerial: Unit Kerja vs Rata-Rata DJKI
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Bandingkan profil kompetensi spesifik unit kerja terhadap benchmark organisasi DJKI
                </p>
              </div>

              {/* Selector Unit Kerja untuk Radar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-gray-400">Pilih Unit:</span>
                <select
                  value={radarUnitCompare}
                  onChange={e => setRadarUnitCompare(e.target.value)}
                  className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase outline-none cursor-pointer"
                >
                  {LIST_UNIT_KERJA_DJKI.map(u => (
                    <option key={u} value={u}>
                      {SHORT_UNIT_NAMES[u] || u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarUnitData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#1e293b' }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 4]}
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                    />
                    <Radar
                      name={SHORT_UNIT_NAMES[radarUnitCompare] || radarUnitCompare}
                      dataKey="unitNilai"
                      stroke="#4f46e5"
                      fill="#4f46e5"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Rata-Rata Total DJKI"
                      dataKey="djkiNilai"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} / 4.00`, name]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Box Rincian Dimensi Unit Terpilih */}
              <div className="lg:col-span-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-200/60 space-y-4">
                <div className="border-b pb-3">
                  <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">Unit Evaluasi</span>
                  <h4 className="text-sm font-black text-gray-950 uppercase leading-tight mt-0.5">
                    {radarUnitCompare}
                  </h4>
                </div>

                <div className="space-y-2 text-[11px]">
                  {radarUnitData.map(d => {
                    const diff = parseFloat((d.unitNilai - d.djkiNilai).toFixed(2));
                    return (
                      <div key={d.kode} className="flex justify-between items-center py-1 border-b border-gray-200/40">
                        <span className="font-bold text-gray-700">{d.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-950">{d.unitNilai}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              diff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {diff >= 0 ? `+${diff}` : diff}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: DISTRIBUSI BERDASARKAN JABATAN & JENJANG
         ========================================================================= */}
      {activeSubTab === 'jabatan' && (
        <div className="space-y-8">
          {/* Bar Chart Jenjang Jabatan */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Rata-Rata Skor Manajerial Berdasarkan Jenjang Jabatan
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Komparasi skor capaian riil terhadap standar minimum kualifikasi jabatan ASN DJKI
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={jenjangStats}
                  margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="jenjang"
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                    interval={0}
                    angle={-10}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis domain={[0, 4]} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      `${val} / 4.00`,
                      name === 'avgManajerial' ? 'Skor Riil Capaian' : 'Standar Minimum Jabatan'
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}
                    formatter={v => (v === 'avgManajerial' ? 'Skor Rata-Rata Riil' : 'Standar Minimum')}
                  />
                  <Bar dataKey="avgManajerial" fill="#4f46e5" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="standarMinimum" fill="#cbd5e1" radius={[8, 8, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid 2 Kolom: Rumpun Jabatan & Analisis Gap Jabatan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Rumpun Jabatan DJKI */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Capaian Rata-Rata per Rumpun Fungsional DJKI
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Pemeriksa Paten, Pemeriksa Merek, Pemeriksa Desain, Analis KI, TI, dan SDM
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rumpunStats}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis
                      dataKey="rumpun"
                      type="category"
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#1e293b' }}
                      width={140}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${val} / 4.00`, 'Rata-Rata Skor']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    />
                    <Bar dataKey="avgManajerial" fill="#0284c7" radius={[0, 8, 8, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gap Kompetensi per Rumpun */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Analisis Gap Kompetensi per Rumpun
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Selisih (+) Surplus Melampaui Standar atau (-) Defisit Memerlukan Intervensi
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {rumpunStats.map(r => {
                  const isPositive = r.gap >= 0;
                  return (
                    <div key={r.rumpun} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-gray-950 uppercase">{r.rumpun}</h4>
                        <p className="text-[10px] font-bold text-gray-400">
                          {r.totalPegawai} Pegawai • {r.fitPercentage}% Memenuhi Standar
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                            isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPositive ? `+${r.gap} (Surplus)` : `${r.gap} (Gap)`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ANALISIS 8 DIMENSI MANAJERIAL & PERILAKU 360
         ========================================================================= */}
      {activeSubTab === 'dimensi' && (
        <div className="space-y-8">
          {/* Peringkat 8 Dimensi Manajerial PermenPAN-RB 38/2017 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                  Profil 8 Dimensi Kompetensi Manajerial PermenPAN-RB 38/2017
                </h3>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Evaluasi kekuatan dan area pengembangan kompetensi ASN di lingkungan DJKI
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Bar Chart Horizontal Dimensi */}
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dimensiStats}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis
                      dataKey="nama"
                      type="category"
                      tick={{ fontSize: 10, fontWeight: 800, fill: '#1e293b' }}
                      width={130}
                    />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${val} / 4.00 (${item.payload.persenKeterpenuhan}% Pegawai Memenuhi)`,
                        item.payload.nama
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    />
                    <Bar
                      dataKey="rataRata"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={22}
                    >
                      {dimensiStats.map((d, index) => (
                        <Cell
                          key={`dim-cell-${index}`}
                          fill={d.rataRata >= 3.2 ? '#10b981' : d.rataRata >= 2.8 ? '#4f46e5' : '#f59e0b'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabel Matriks 8 Dimensi & Rekomendasi */}
              <div className="space-y-3">
                {dimensiStats.map(dim => {
                  const meta = DIMENSI_MANAJERIAL_METADATA.find(m => m.kode === dim.kode);
                  return (
                    <div key={dim.kode} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                            {dim.kode}
                          </span>
                          <span className="text-xs font-black text-gray-950 uppercase">{dim.nama}</span>
                        </div>
                        <p className="text-[9px] text-gray-400 line-clamp-1">{meta?.deskripsi}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-gray-950 block">{dim.rataRata}</span>
                        <span
                          className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            dim.rataRata >= 3.2
                              ? 'bg-emerald-100 text-emerald-800'
                              : dim.rataRata >= 2.8
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {dim.kategori}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Radar Chart Perilaku Kerja 360 (PP 30/2019) */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                Distribusi Nilai Perilaku Kerja 360 (PP 30/2019)
              </h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Penilaian 5 aspek perilaku kerja ASN: Orientasi Pelayanan, Komitmen, Inisiatif, Kerjasama, Kepemimpinan
              </p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radar360Data}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 800, fill: '#1e293b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Radar
                    name="Capaian Riil (Rata-Rata)"
                    dataKey="nilai"
                    stroke="#0284c7"
                    fill="#0284c7"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Target Ekspektasi"
                    dataKey="target"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} / 100`, name]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: MATRIKS DETAIL & DRILLDOWN PEGAWAI
         ========================================================================= */}
      {activeSubTab === 'daftar_pegawai' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden space-y-6 p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-950 uppercase tracking-tight">
                Matriks Nilai Kompetensi Pegawai ({filteredPegawaiDetails.length} Pegawai)
              </h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Klik tombol aksi untuk melihat profil talenta & asesmen individual secara mendalam
              </p>
            </div>

            {/* Input Cari */}
            <div className="w-full md:w-80 relative">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Cari nama, NIP, atau jabatan..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-black uppercase outline-none focus:border-indigo-600 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-[1000px] w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b tracking-wider">
                <tr>
                  <th className="px-6 py-4">Pegawai & NIP</th>
                  <th className="px-4 py-4">Jabatan & Jenjang</th>
                  <th className="px-4 py-4">Unit Kerja</th>
                  <th className="px-4 py-4 text-center">Skor Manajerial</th>
                  <th className="px-4 py-4 text-center">Perilaku 360</th>
                  <th className="px-4 py-4 text-center">Status Pemenuhan</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredPegawaiDetails.map(peg => (
                  <tr key={peg.nip} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-gray-950 text-[12px]">{formatPegawaiName(peg.nama)}</p>
                      <p className="text-[10px] font-bold text-gray-400 tracking-wider">NIP. {peg.nip}</p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-black text-gray-800 text-[11px] uppercase leading-tight line-clamp-1">
                        {peg.jabatan}
                      </p>
                      <span className="text-[9px] font-bold text-indigo-600">{peg.jenjangJabatan}</span>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-[10px] font-bold text-gray-600 uppercase line-clamp-1">
                        {SHORT_UNIT_NAMES[peg.unitKerja] || peg.unitKerja}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="font-black text-gray-950 text-xs">{peg.skorManajerialAvg}</span>
                      <span className="text-[9px] text-gray-400 font-bold block">
                        Min: {peg.standarMinimum} ({peg.gapSkor >= 0 ? `+${peg.gapSkor}` : peg.gapSkor})
                      </span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span className="font-black text-blue-600 text-xs">{peg.skorPerilaku360Avg}</span>
                      <span className="text-[9px] text-gray-400 font-bold block">PP 30</span>
                    </td>

                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-xl text-[9px] font-black uppercase ${
                          peg.statusPemenuhan === 'Optimal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : peg.statusPemenuhan === 'Memenuhi'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {peg.statusPemenuhan}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {onSelectPegawaiForProfile && (
                        <button
                          onClick={() => onSelectPegawaiForProfile(peg.nip)}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <span>Buka Asesmen</span>
                          <i className="bi bi-arrow-right ml-1.5"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default KompetensiDashboardView;
