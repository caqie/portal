import React, { useMemo } from 'react';
import { PPPKEvaluation, EvaluationPeriod } from '../../types';

interface PPPKDashboardTabProps {
  evaluations: PPPKEvaluation[];
  periods: EvaluationPeriod[];
  selectedYear: number;
  selectedSemester: 'I' | 'II';
  onSelectPeriod: (year: number, semester: 'I' | 'II') => void;
  onNavigateToTab: (tab: string) => void;
  totalPPPKCount: number;
}

const PPPKDashboardTab: React.FC<PPPKDashboardTabProps> = ({
  evaluations,
  periods,
  selectedYear,
  selectedSemester,
  onSelectPeriod,
  onNavigateToTab,
  totalPPPKCount
}) => {
  // Current active period evaluations
  const currentEvals = useMemo(() => {
    return evaluations.filter(e => Number(e.year) === selectedYear && e.semester === selectedSemester);
  }, [evaluations, selectedYear, selectedSemester]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalAssessed = currentEvals.length;
    const finalizedCount = currentEvals.filter(e => e.isFinal).length;
    const inProgressCount = currentEvals.filter(e => !e.isFinal && e.status !== 'DRAFT').length;
    const draftCount = currentEvals.filter(e => e.status === 'DRAFT').length;
    const notAssessedCount = Math.max(0, totalPPPKCount - totalAssessed);

    let sumFinal = 0;
    let sumSKP = 0;
    let sumBehavior = 0;
    let sumAttendance = 0;

    const categoryCounts = {
      'Sangat Baik': 0,
      'Baik': 0,
      'Cukup': 0,
      'Kurang': 0,
      'Sangat Kurang': 0
    };

    currentEvals.forEach(e => {
      sumFinal += e.finalScore;
      sumSKP += e.skpScore;
      sumBehavior += e.behaviorScore;
      sumAttendance += e.attendanceScore;

      if (e.category in categoryCounts) {
        categoryCounts[e.category as keyof typeof categoryCounts]++;
      }
    });

    const avgFinal = totalAssessed > 0 ? Math.round((sumFinal / totalAssessed) * 100) / 100 : 0;
    const avgSKP = totalAssessed > 0 ? Math.round((sumSKP / totalAssessed) * 100) / 100 : 0;
    const avgBehavior = totalAssessed > 0 ? Math.round((sumBehavior / totalAssessed) * 100) / 100 : 0;
    const avgAttendance = totalAssessed > 0 ? Math.round((sumAttendance / totalAssessed) * 100) / 100 : 0;

    return {
      totalAssessed,
      finalizedCount,
      inProgressCount,
      draftCount,
      notAssessedCount,
      avgFinal,
      avgSKP,
      avgBehavior,
      avgAttendance,
      categoryCounts
    };
  }, [currentEvals, totalPPPKCount]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Period Selector */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-bold tracking-wider uppercase mb-3 border border-blue-400/20">
              <i className="bi bi-award-fill"></i>
              Portal Evaluasi Kinerja PPPK Berbasis Semester
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Dashboard Kinerja PPPK DJKI
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl font-medium">
              Monitoring capaian SKP (60%), Penilaian Perilaku 360° (25%), dan Presensi (15%) secara transparan, otomatis, dan akuntabel.
            </p>
          </div>

          {/* Quick Period Switcher */}
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex flex-col gap-2 shrink-0">
            <span className="text-[10px] font-black text-blue-200 tracking-widest uppercase">Pilih Periode Semester</span>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => onSelectPeriod(Number(e.target.value), selectedSemester)}
                className="bg-slate-900/80 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/20">
                <button
                  onClick={() => onSelectPeriod(selectedYear, 'I')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${selectedSemester === 'I' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  Semester I
                </button>
                <button
                  onClick={() => onSelectPeriod(selectedYear, 'II')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${selectedSemester === 'II' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  Semester II
                </button>
              </div>
            </div>
            <span className="text-[9px] text-slate-400 font-medium text-center">
              {selectedSemester === 'I' ? '01 Januari — 30 Juni' : '01 Juli — 31 Desember'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total PPPK */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total PPPK</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <i className="bi bi-people-fill"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{totalPPPKCount}</span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Pegawai Pemerintah DJKI</p>
          </div>
        </div>

        {/* Sudah Dievaluasi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Terekam Evaluasi</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
              <i className="bi bi-file-earmark-check-fill"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stats.totalAssessed}</span>
            <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
              {totalPPPKCount > 0 ? Math.round((stats.totalAssessed / totalPPPKCount) * 100) : 0}% cakupan periode
            </p>
          </div>
        </div>

        {/* Final & Terkunci */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disahkan (Final)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              <i className="bi bi-lock-fill"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tight">{stats.finalizedCount}</span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Snapshot Nilai Terkunci</p>
          </div>
        </div>

        {/* Belum Selesai / Review */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dalam Proses</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              <i className="bi bi-hourglass-split"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-amber-600 tracking-tight">{stats.inProgressCount + stats.draftCount}</span>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Menunggu review/draft</p>
          </div>
        </div>

        {/* Rata-Rata Nilai Akhir */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Rata-Rata Nilai</span>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg text-white">
              <i className="bi bi-graph-up"></i>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-black text-white tracking-tight">{stats.avgFinal.toFixed(2)}</span>
            <p className="text-[11px] text-blue-100 font-semibold mt-0.5">
              Skala 0–100 ({stats.avgFinal >= 90 ? 'Sangat Baik' : stats.avgFinal >= 80 ? 'Baik' : 'Cukup'})
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Row: Component Averages & Category Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Component Averages */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Capaian Komponen Evaluasi</h3>
              <p className="text-xs text-slate-400 font-medium">Rata-rata skor seluruh PPPK pada {selectedYear} Semester {selectedSemester}</p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">Bobot Baku</span>
          </div>

          <div className="space-y-4">
            {/* SKP */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Sasaran Kinerja Pegawai (SKP)
                </span>
                <span className="text-slate-900 font-black">{stats.avgSKP.toFixed(2)} <span className="text-slate-400 font-normal">/ 100 (Bobot 60%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.avgSKP)}%` }}></div>
              </div>
            </div>

            {/* Perilaku 360 */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  Penilaian Perilaku Kerja 360°
                </span>
                <span className="text-slate-900 font-black">{stats.avgBehavior.toFixed(2)} <span className="text-slate-400 font-normal">/ 100 (Bobot 25%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.avgBehavior)}%` }}></div>
              </div>
            </div>

            {/* Absensi */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Kedisiplinan & Presensi (Absensi)
                </span>
                <span className="text-slate-900 font-black">{stats.avgAttendance.toFixed(2)} <span className="text-slate-400 font-normal">/ 100 (Bobot 15%)</span></span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.avgAttendance)}%` }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <i className="bi bi-calculator text-blue-600 text-xl"></i>
              <div>
                <p className="text-xs font-bold text-slate-800">Formula Nilai Akhir Otomatis</p>
                <p className="text-[10px] text-slate-500 font-mono">(SKP × 60%) + (Perilaku × 25%) + (Absensi × 15%)</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('settings')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
            >
              Ubah Bobot
            </button>
          </div>
        </div>

        {/* Category Predicate Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Distribusi Predikat Kinerja</h3>
                <p className="text-xs text-slate-400 font-medium">Klasifikasi predikat hasil evaluasi semester</p>
              </div>
              <button
                onClick={() => onNavigateToTab('daftar')}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
              >
                Lihat Daftar
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Sangat Baik', count: stats.categoryCounts['Sangat Baik'], range: '90 – 100', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Baik', count: stats.categoryCounts['Baik'], range: '80 – 89.99', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
                { label: 'Cukup', count: stats.categoryCounts['Cukup'], range: '70 – 79.99', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
                { label: 'Kurang', count: stats.categoryCounts['Kurang'], range: '60 – 69.99', color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
                { label: 'Sangat Kurang', count: stats.categoryCounts['Sangat Kurang'], range: '< 60', color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50' }
              ].map((item) => {
                const pct = stats.totalAssessed > 0 ? Math.round((item.count / stats.totalAssessed) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`w-28 text-xs font-bold ${item.text}`}>{item.label}</span>
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="text-xs font-black text-slate-800 w-12 text-right">{item.count} org</span>
                    <span className="text-[10px] text-slate-400 w-10 text-right">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Evaluasi Belum Ada / Belum Dinilai: <strong className="text-slate-800">{stats.notAssessedCount} Pegawai</strong></span>
            <button
              onClick={() => onNavigateToTab('daftar')}
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              Mulai Input Evaluasi →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPPKDashboardTab;
