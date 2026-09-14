import React, { useState, useEffect, useMemo } from 'react';
import {
  PPPKEvaluation,
  BehaviorAssessment,
  BehaviorAspect,
  PPPKRespondentType,
  BehaviorAssessmentDetail,
  Pegawai
} from '../../types';
import {
  getBehaviorAspects,
  getEligibleEvaluators,
  getAllEmployees,
  getPPPKSettings
} from '../../services/pppkEvaluationService';

interface PPPKBehaviorAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: PPPKEvaluation | null;
  onSaveAssessment: (assessment: BehaviorAssessment) => void;
  currentUser?: { nip?: string; nama?: string; role?: string };
}

const PPPKBehaviorAssessmentModal: React.FC<PPPKBehaviorAssessmentModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  onSaveAssessment,
  currentUser
}) => {
  const aspects = useMemo(() => getBehaviorAspects().filter(a => a.isActive), []);
  const settings = useMemo(() => getPPPKSettings(), []);
  const allEmployees = useMemo(() => getAllEmployees(), []);

  const [respondentType, setRespondentType] = useState<PPPKRespondentType>('ATASAN');
  const [selectedEvaluatorNip, setSelectedEvaluatorNip] = useState<string>('');
  const [evaluatorName, setEvaluatorName] = useState('');
  const [evaluatorStatus, setEvaluatorStatus] = useState<'PNS' | 'PPPK'>('PNS');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [generalComment, setGeneralComment] = useState('');

  // Eligible evaluators based on selected relationship
  const eligibleEvaluators = useMemo(() => {
    if (!evaluation) return [];
    const relType = respondentType === 'REKAN' ? 'REKAN_KERJA' : (respondentType as any);
    return getEligibleEvaluators(evaluation.employeeId, relType, settings);
  }, [evaluation, respondentType, settings]);

  useEffect(() => {
    if (!evaluation) return;

    // Default evaluator selection when relation changes
    if (respondentType === 'SELF') {
      setSelectedEvaluatorNip(evaluation.employeeId);
      setEvaluatorName(evaluation.nama);
      setEvaluatorStatus('PPPK');
    } else if (eligibleEvaluators.length > 0) {
      const first = eligibleEvaluators[0];
      setSelectedEvaluatorNip(first.nip);
      setEvaluatorName(first.nama);
      const isPppk = (first.jenisPegawai || first.status || '').toUpperCase().includes('PPPK');
      setEvaluatorStatus(isPppk ? 'PPPK' : 'PNS');
    }

    // Initialize default scores to 4 out of 5
    const initialScores: Record<string, number> = {};
    const initialComments: Record<string, string> = {};
    aspects.forEach(a => {
      initialScores[a.id] = 4;
      initialComments[a.id] = '';
    });
    setScores(initialScores);
    setComments(initialComments);
  }, [aspects, evaluation, respondentType, eligibleEvaluators, isOpen]);

  const handleEvaluatorChange = (nip: string) => {
    setSelectedEvaluatorNip(nip);
    const emp = allEmployees.find(p => p.nip === nip);
    if (emp) {
      setEvaluatorName(emp.nama);
      const isPppk = (emp.jenisPegawai || emp.status || '').toUpperCase().includes('PPPK');
      setEvaluatorStatus(isPppk ? 'PPPK' : 'PNS');
    }
  };

  // Compute live averages
  const { averageScale5, convertedScale100 } = useMemo(() => {
    const keys = Object.keys(scores);
    if (keys.length === 0) return { averageScale5: 0, convertedScale100: 0 };
    let sum = 0;
    keys.forEach(k => { sum += scores[k]; });
    const avg5 = Math.round((sum / keys.length) * 100) / 100;
    const conv100 = Math.round(((avg5 / 5) * 100) * 100) / 100;
    return { averageScale5: avg5, convertedScale100: conv100 };
  }, [scores]);

  if (!isOpen || !evaluation) return null;

  const wAtasan = settings.evaluator360Weights?.atasanWeight ?? 50;
  const wRekan = settings.evaluator360Weights?.rekanKerjaWeight ?? 30;
  const wSelf = settings.evaluator360Weights?.selfWeight ?? 20;

  const currentWeightB = respondentType === 'ATASAN' ? wAtasan : (respondentType === 'SELF' ? wSelf : wRekan);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const details: BehaviorAssessmentDetail[] = aspects.map(asp => ({
      id: 'det_' + Date.now() + '_' + asp.id,
      assessmentId: '',
      aspectId: asp.id,
      aspectName: asp.name,
      score: scores[asp.id] || 4,
      comment: comments[asp.id] || ''
    }));

    const evalType = respondentType === 'REKAN' ? 'REKAN_KERJA' : (respondentType as any);

    const assessment: BehaviorAssessment = {
      id: 'ASSESS-360-' + evaluation.id + '-' + Date.now().toString(36),
      evaluationId: evaluation.id,

      // OBJEK EVALUASI: WAJIB PPPK
      subject_employee_id: evaluation.employeeId,
      subject_employee_name: evaluation.nama,
      subject_employee_status: 'PPPK',
      subject_employee_unit: evaluation.unitKerja,
      subject_employee_jabatan: evaluation.jabatan,

      // PENILAI / EVALUATOR: DAPAT PNS ATAU PPPK
      evaluator_employee_id: selectedEvaluatorNip,
      evaluator_employee_name: isAnonymous ? 'Penilai Rahasia' : evaluatorName,
      evaluator_employee_status: evaluatorStatus,
      evaluator_type: evalType,

      periodId: evaluation.periodId,
      year: evaluation.year,
      semester: evaluation.semester,
      respondentId: isAnonymous ? 'ANONYMOUS' : selectedEvaluatorNip,
      respondentName: isAnonymous ? 'Responden Rahasia' : evaluatorName,
      respondentType,
      isAnonymous,
      status: 'SUBMITTED',
      details,
      averageScore: averageScale5,
      convertedScore: convertedScale100,
      score: convertedScale100,
      averageScoreScale5: averageScale5,
      comment: generalComment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      createdAt: new Date().toLocaleString('id-ID'),
      updatedAt: new Date().toLocaleString('id-ID'),
      submittedAt: new Date().toLocaleString('id-ID')
    };

    onSaveAssessment(assessment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-bold">
              <i className="bi bi-star-fill text-amber-400"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                  Objek: Wajib PPPK
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase">
                  Penilai: PNS / PPPK
                </span>
                <span className="text-xs text-slate-400 font-mono">10 Aspek BerAKHLAK</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">Instrumen Penilaian Perilaku 360° PPPK</h2>
              <p className="text-xs text-slate-300 font-medium">Periode {evaluation.year} Semester {evaluation.semester}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">

          {/* Dual Party Card: Objek Evaluasi vs Penilai */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: Objek Evaluasi (WAJIB PPPK) */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                  1. Objek Evaluasi (Yang Dinilai)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                  WAJIB PPPK
                </span>
              </div>
              <h4 className="text-xs font-black text-emerald-950">{evaluation.nama}</h4>
              <p className="text-[11px] text-emerald-800 mt-0.5 font-mono">NIP. {evaluation.employeeId}</p>
              <p className="text-[11px] text-emerald-700 mt-1">{evaluation.jabatan}</p>
              <p className="text-[10px] text-emerald-600">{evaluation.unitKerja}</p>
            </div>

            {/* Box 2: Penilai (Dapat PNS atau PPPK) */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">
                  2. Penilai (Evaluator)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  evaluatorStatus === 'PNS' ? 'bg-sky-600 text-white' : 'bg-indigo-600 text-white'
                }`}>
                  {evaluatorStatus} Diizinkan
                </span>
              </div>
              <h4 className="text-xs font-black text-indigo-950">{evaluatorName || 'Pilih Penilai'}</h4>
              <p className="text-[11px] text-indigo-800 mt-0.5 font-mono">
                {selectedEvaluatorNip ? `NIP. ${selectedEvaluatorNip}` : 'Pilih dari daftar di bawah'}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-indigo-700 font-semibold">
                <i className="bi bi-info-circle"></i>
                <span>Penilai dapat merupakan PNS (misal Atasan langsung PNS)</span>
              </div>
            </div>

          </div>
          
          {/* Respondent Role Selection */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Konfigurasi Peran & Identitas Penilai
              </h3>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Bobot B: {currentWeightB}% terhadap Nilai Perilaku 360°
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Hubungan Kerja (Kategori Penilai)
                </label>
                <select
                  value={respondentType}
                  onChange={(e) => setRespondentType(e.target.value as PPPKRespondentType)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ATASAN">Atasan Langsung (PNS / PPPK) — Bobot B: {wAtasan}%</option>
                  <option value="REKAN">Rekan Sejawat / Peer (PNS / PPPK) — Bobot B: {wRekan}%</option>
                  <option value="SELF">Penilaian Mandiri (Self / PPPK) — Bobot B: {wSelf}%</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {respondentType === 'ATASAN' && 'Atasan PPPK dapat merupakan pegawai PNS dari struktur organisasi.'}
                  {respondentType === 'REKAN' && 'Rekan kerja dalam satu unit dapat berstatus PNS atau sesama PPPK.'}
                  {respondentType === 'SELF' && 'Penilaian refleksi diri oleh pegawai PPPK yang bersangkutan.'}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Pilih Pegawai Penilai ({respondentType === 'SELF' ? 'Pegawai PPPK' : 'PNS / PPPK'})
                </label>
                {respondentType === 'SELF' ? (
                  <input
                    type="text"
                    value={`${evaluation.nama} (PPPK)`}
                    disabled
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-700"
                  />
                ) : (
                  <select
                    value={selectedEvaluatorNip}
                    onChange={(e) => handleEvaluatorChange(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {eligibleEvaluators.map((emp, idx) => {
                      const isPppk = (emp.jenisPegawai || emp.status || '').toUpperCase().includes('PPPK');
                      const tag = isPppk ? 'PPPK' : 'PNS';
                      return (
                        <option key={`${emp.nip || 'eval'}-${idx}`} value={emp.nip}>
                          [{tag}] {emp.nama} — {emp.jabatan}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="anonCheckbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="anonCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                <strong>Jaga Kerahasiaan (Anonim):</strong> Identitas nama penilai disamarkan dari display pegawai, namun relasi jabatan dan status tetap tercatat pada audit internal.
              </label>
            </div>
          </div>

          {/* Live Score Counter & Bobot B Explainer */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wider block">
                Skor Penilai Saat Ini ({respondentType})
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-black text-white">{averageScale5.toFixed(2)}</span>
                <span className="text-xs text-slate-300">/ 5.00</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/20 text-indigo-100 ml-2">
                  Konversi: {convertedScale100.toFixed(2)} / 100
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-300 md:text-right">
              <span className="font-bold text-amber-300 block">Bobot B (Penilai): {currentWeightB}%</span>
              <span>Bobot A (Nilai Akhir PPPK): 25%</span>
            </div>
          </div>

          {/* 10 Aspects Questionnaire */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Kuesioner Penilaian 10 Aspek Perilaku BerAKHLAK
            </h3>

            {aspects.map((aspect, index) => (
              <div key={aspect.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{aspect.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{aspect.description}</p>
                    </div>
                  </div>

                  {/* 1-5 Rating Selector */}
                  <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setScores({ ...scores, [aspect.id]: val })}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                          scores[aspect.id] === val
                            ? 'bg-indigo-600 text-white shadow-sm scale-105'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Note per aspect */}
                <input
                  type="text"
                  value={comments[aspect.id] || ''}
                  onChange={(e) => setComments({ ...comments, [aspect.id]: e.target.value })}
                  placeholder="Catatan perilaku spesifik untuk aspek ini (opsional)..."
                  className="w-full text-[11px] p-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>

          {/* General Feedback / Recommendation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rekomendasi & Catatan Umum Penilai
            </label>
            <textarea
              rows={2}
              value={generalComment}
              onChange={(e) => setGeneralComment(e.target.value)}
              placeholder="Berikan umpan balik konstruktif untuk pengembangan kompetensi pegawai PPPK..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 shadow-md flex items-center gap-2"
            >
              <i className="bi bi-send-fill"></i>
              Kirim Penilaian 360° ({evaluatorStatus} → PPPK)
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PPPKBehaviorAssessmentModal;
