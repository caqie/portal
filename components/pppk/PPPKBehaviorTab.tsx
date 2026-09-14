import React, { useState, useMemo } from 'react';
import { PPPKEvaluation, BehaviorAssessment } from '../../types';
import {
  getBehaviorAssessments,
  getBehaviorAspects,
  getPPPKSettings,
  calculateAverageBehaviorScore
} from '../../services/pppkEvaluationService';

interface PPPKBehaviorTabProps {
  evaluations: PPPKEvaluation[];
  selectedYear: number;
  selectedSemester: 'I' | 'II';
  onOpenAssessmentModal: (ev: PPPKEvaluation) => void;
}

const PPPKBehaviorTab: React.FC<PPPKBehaviorTabProps> = ({
  evaluations,
  selectedYear,
  selectedSemester,
  onOpenAssessmentModal
}) => {
  const aspects = useMemo(() => getBehaviorAspects().filter(a => a.isActive), []);
  const assessments = useMemo(() => getBehaviorAssessments(), []);
  const settings = useMemo(() => getPPPKSettings(), []);

  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Filter evaluations for current active period
  const currentEvals = useMemo(() => {
    return evaluations.filter(e => Number(e.year) === selectedYear && e.semester === selectedSemester);
  }, [evaluations, selectedYear, selectedSemester]);

  const wAtasan = settings.evaluator360Weights?.atasanWeight ?? 50;
  const wRekan = settings.evaluator360Weights?.rekanKerjaWeight ?? 30;
  const wSelf = settings.evaluator360Weights?.selfWeight ?? 20;

  return (
    <div className="space-y-6">
      
      {/* Overview & Architectural Policy Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
              <i className="bi bi-people-fill"></i>
              Multi-Rater 360° (Atasan Langsung, Rekan Kerja, Self)
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Penilaian Perilaku Kerja 360° PPPK
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Evaluasi 10 aspek perilaku BerAKHLAK. Bobot B (Penilai 360°) dihitung terpisah dari Bobot A (Komponen Akhir: 60% SKP, 25% Perilaku, 15% Absensi).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white flex items-center gap-1.5">
              <i className="bi bi-shield-check text-emerald-400"></i>
              Objek: Wajib PPPK
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
              <i className="bi bi-person-check-fill"></i>
              Penilai: PNS / PPPK
            </span>
          </div>
        </div>

        {/* 2 Rules Pill Explained */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
            <i className="bi bi-patch-check-fill text-emerald-600 text-lg shrink-0 mt-0.5"></i>
            <div className="text-xs">
              <span className="font-black text-emerald-950 block">1. Objek Evaluasi: WAJIB PPPK</span>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Hanya pegawai berstatus PPPK yang dapat memiliki lembar evaluasi kinerja. Pegawai PNS tidak boleh menjadi objek evaluasi di modul ini.
              </p>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-2.5">
            <i className="bi bi-diagram-3-fill text-indigo-600 text-lg shrink-0 mt-0.5"></i>
            <div className="text-xs">
              <span className="font-black text-indigo-950 block">2. Penilai: PNS Diizinkan Menilai PPPK</span>
              <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                Penilai TIDAK harus PPPK. Atasan langsung dan rekan kerja dalam satu unit dapat berstatus PNS dan sah menilai PPPK.
              </p>
            </div>
          </div>
        </div>

        {/* Bobot B (Penilai 360) Summary Bar */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-700 uppercase tracking-wider text-[10px]">
              Distribusi Bobot B (Penilai 360°):
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 font-bold">
              Atasan: {wAtasan}%
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-bold">
              Rekan Kerja: {wRekan}%
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold">
              Self: {wSelf}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            Total Bobot B = {wAtasan + wRekan + wSelf}% (Konversi skala 1–5 ke 0–100)
          </span>
        </div>
      </div>

      {/* 10 Aspects Grid Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {aspects.map((asp, idx) => (
          <div key={asp.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 font-black text-[10px] flex items-center justify-center mb-2">
                {idx + 1}
              </span>
              <h3 className="text-xs font-black text-slate-900 leading-snug">{asp.name}</h3>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{asp.description}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-indigo-600 font-bold">
              <span>Bobot Relatif</span>
              <span>10%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table of PPPK Employees and their 360° status */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Daftar Pegawai PPPK & Skor Perilaku 360° ({selectedYear} Sem. {selectedSemester})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Klik nama pegawai untuk melihat rincian penilaian dari Atasan (PNS), Rekan (PNS/PPPK), dan Self
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">{currentEvals.length} Pegawai PPPK Terdaftar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Pegawai Objek (PPPK)</th>
                <th className="py-3.5 px-3 text-center">Partisipasi Penilai</th>
                <th className="py-3.5 px-3 text-center">Rata-Rata (1–5)</th>
                <th className="py-3.5 px-3 text-center">Konversi (0–100)</th>
                <th className="py-3.5 px-3 text-center">Kontribusi (25%)</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {currentEvals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Belum ada data evaluasi PPPK pada periode ini.
                  </td>
                </tr>
              ) : (
                currentEvals.map((ev, idx) => {
                  const scale5 = ((ev.behaviorScore / 100) * 5).toFixed(2);
                  
                  // Filter assessments for this employee
                  const empAssessments = assessments.filter(
                    a => (a.subject_employee_id === ev.employeeId || a.employeeId === ev.employeeId) &&
                         Number(a.year) === selectedYear &&
                         a.semester === selectedSemester
                  );

                  const hasAtasan = empAssessments.some(a => (a.evaluator_type || a.respondentType) === 'ATASAN');
                  const hasRekan = empAssessments.some(a => {
                    const t = (a.evaluator_type || a.respondentType) as string;
                    return t === 'REKAN' || t === 'REKAN_KERJA';
                  });
                  const hasSelf = empAssessments.some(a => (a.evaluator_type || a.respondentType) === 'SELF');

                  const isExpanded = expandedEmployeeId === ev.employeeId;

                  return (
                    <React.Fragment key={ev.id}>
                      <tr
                        onClick={() => setExpandedEmployeeId(isExpanded ? null : ev.employeeId)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              PPPK
                            </span>
                            <span className="font-bold text-slate-900">{ev.nama}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            NIP. {ev.employeeId} • {ev.unitKerja}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              title={`Atasan: ${hasAtasan ? 'Sudah Menilai' : 'Belum Menilai'}`}
                              className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${
                                hasAtasan ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-400'
                              }`}
                            >
                              A
                            </span>
                            <span
                              title={`Rekan Kerja: ${hasRekan ? 'Sudah Menilai' : 'Belum Menilai'}`}
                              className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${
                                hasRekan ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                              }`}
                            >
                              R
                            </span>
                            <span
                              title={`Self: ${hasSelf ? 'Sudah Menilai' : 'Belum Menilai'}`}
                              className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center ${
                                hasSelf ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
                              }`}
                            >
                              S
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {empAssessments.length} Responden
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-black text-slate-900">{scale5}</span>
                          <span className="text-[10px] text-slate-400 block">/ 5.00</span>
                        </td>
                        <td className="py-3 px-3 text-center font-black text-indigo-600 font-mono">
                          {ev.behaviorScore.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-800 font-mono">
                          +{ev.behaviorContribution.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {ev.isFinal ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              TERKUNCI
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Buka
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          {!ev.isFinal ? (
                            <button
                              onClick={() => onOpenAssessmentModal(ev)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1 shadow-sm"
                            >
                              <i className="bi bi-pencil-square"></i>
                              + Nilai 360°
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sudah Final</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable row: Breakdown of 360° respondents */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="p-4">
                            <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                  <i className="bi bi-people text-indigo-600"></i>
                                  Rincian Responden Penilai untuk {ev.nama} (Objek Wajib PPPK)
                                </h4>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Bobot B: Atasan {wAtasan}%, Rekan {wRekan}%, Self {wSelf}%
                                </span>
                              </div>

                              {empAssessments.length === 0 ? (
                                <div className="text-center py-4 text-xs text-slate-400">
                                  Belum ada penilaian 360° yang masuk untuk pegawai ini. Klik "+ Nilai 360°" untuk menginput penilaian.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {empAssessments.map((ass) => {
                                    const role = ass.evaluator_type || ass.respondentType;
                                    const status = ass.evaluator_employee_status || (role === 'SELF' ? 'PPPK' : 'PNS');
                                    const name = ass.evaluator_employee_name || ass.respondentName || 'Penilai';
                                    const score5 = ass.averageScoreScale5 || ass.averageScore || 4.0;
                                    const score100 = ass.convertedScore || ass.score || 80;

                                    return (
                                      <div key={ass.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                              {role === 'ATASAN' ? 'ATASAN LANGSUNG' : (role === 'SELF' ? 'SELF ASSESSMENT' : 'REKAN SEJAWAT')}
                                            </span>
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                              status === 'PNS' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                              {status}
                                            </span>
                                          </div>
                                          <p className="text-xs font-bold text-slate-900">{name}</p>
                                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                            NIP. {ass.evaluator_employee_id || ass.respondentId}
                                          </p>
                                        </div>

                                        <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                                          <span className="text-[11px] text-slate-500">Skor:</span>
                                          <div className="text-right">
                                            <span className="text-xs font-black text-slate-900">{score5.toFixed(2)} / 5</span>
                                            <span className="text-[10px] text-indigo-600 font-bold block">
                                              ({score100.toFixed(1)} / 100)
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default PPPKBehaviorTab;
