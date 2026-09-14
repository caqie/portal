import React, { useState, useEffect, useMemo } from 'react';
import { PPPKEvaluation, EvaluationPeriod, Pegawai } from '../../types';
import {
  getPPPKEmployees,
  getExistingSKPForEmployee,
  calculateAverageBehaviorScore,
  calculateAttendanceForPeriod,
  calculateContributions
} from '../../services/pppkEvaluationService';

interface PPPKFormEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PPPKEvaluation>) => void;
  periods: EvaluationPeriod[];
  evaluationToEdit?: PPPKEvaluation | null;
}

const PPPKFormEvaluationModal: React.FC<PPPKFormEvaluationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  periods,
  evaluationToEdit
}) => {
  const pppkEmployees = useMemo(() => getPPPKEmployees(), []);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [skpScore, setSkpScore] = useState<number>(90);
  const [behaviorScore, setBehaviorScore] = useState<number>(85);
  const [attendanceScore, setAttendanceScore] = useState<number>(95);
  const [skpPredikat, setSkpPredikat] = useState<string>('Baik');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Selected period object
  const currentPeriod = useMemo(() => {
    return periods.find(p => p.id === selectedPeriodId) || periods[0];
  }, [periods, selectedPeriodId]);

  // Selected employee object
  const currentEmployee = useMemo(() => {
    return pppkEmployees.find(p => p.nip === selectedEmployeeId || p.id === selectedEmployeeId);
  }, [pppkEmployees, selectedEmployeeId]);

  // Initialize or reset form
  useEffect(() => {
    if (evaluationToEdit) {
      setSelectedPeriodId(evaluationToEdit.periodId);
      setSelectedEmployeeId(evaluationToEdit.employeeId);
      setSkpScore(evaluationToEdit.skpScore);
      setBehaviorScore(evaluationToEdit.behaviorScore);
      setAttendanceScore(evaluationToEdit.attendanceScore);
      setSkpPredikat(evaluationToEdit.skpPredikat || 'Baik');
      setNotes(evaluationToEdit.notes || '');
    } else {
      const defaultPeriod = periods.find(p => p.status === 'OPEN') || periods[0];
      if (defaultPeriod) setSelectedPeriodId(defaultPeriod.id);
      if (pppkEmployees.length > 0) setSelectedEmployeeId(pppkEmployees[0].nip);
      setSkpScore(90);
      setBehaviorScore(88);
      setAttendanceScore(95);
      setSkpPredikat('Baik');
      setNotes('');
    }
    setErrorMessage('');
  }, [evaluationToEdit, periods, pppkEmployees, isOpen]);

  // When employee or period changes during NEW creation, auto-fetch suggested scores
  const handleAutoFetchData = () => {
    if (!selectedEmployeeId || !currentPeriod) return;

    // 1. Fetch SKP
    const skp = getExistingSKPForEmployee(selectedEmployeeId, currentPeriod.year, currentPeriod.semester);
    setSkpScore(skp.score);
    setSkpPredikat(skp.predikat);

    // 2. Fetch 360 Behavior
    const beh = calculateAverageBehaviorScore(selectedEmployeeId, currentPeriod.id);
    setBehaviorScore(beh.convertedScore);

    // 3. Fetch Attendance
    const att = calculateAttendanceForPeriod(selectedEmployeeId, currentPeriod.startDate, currentPeriod.endDate);
    setAttendanceScore(att.finalScore);
  };

  // Real-time calculation
  const computed = useMemo(() => {
    if (!currentPeriod) {
      return { skpContribution: 0, behaviorContribution: 0, attendanceContribution: 0, finalScore: 0, category: 'Baik' };
    }
    return calculateContributions(
      skpScore,
      behaviorScore,
      attendanceScore,
      currentPeriod.skpWeight,
      currentPeriod.behaviorWeight,
      currentPeriod.attendanceWeight
    );
  }, [skpScore, behaviorScore, attendanceScore, currentPeriod]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedEmployeeId) {
      setErrorMessage('Pilih pegawai PPPK terlebih dahulu.');
      return;
    }
    if (!selectedPeriodId) {
      setErrorMessage('Pilih periode evaluasi terlebih dahulu.');
      return;
    }

    try {
      onSave({
        id: evaluationToEdit ? evaluationToEdit.id : undefined,
        employeeId: selectedEmployeeId,
        periodId: selectedPeriodId,
        skpScore,
        skpPredikat,
        behaviorScore,
        attendanceScore,
        notes
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold">
              <i className="bi bi-file-earmark-plus"></i>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {evaluationToEdit ? 'Edit Evaluasi PPPK' : 'Input Evaluasi Kinerja PPPK Baru'}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Pilih pegawai PPPK dan sesuaikan komponen capaian semester
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl">
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
              <i className="bi bi-exclamation-octagon-fill text-rose-500 text-base"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Period Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Periode Evaluasi Semester
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              disabled={!!evaluationToEdit}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.startDate} s/d {p.endDate}) — Status: {p.status}
                </option>
              ))}
            </select>
          </div>

          {/* PPPK Employee Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Pegawai PPPK yang Dinilai (Hanya PPPK)
              </label>
              {!evaluationToEdit && (
                <button
                  type="button"
                  onClick={handleAutoFetchData}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <i className="bi bi-magic"></i>
                  Ambil Otomatis dari Database
                </button>
              )}
            </div>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={!!evaluationToEdit}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            >
              {pppkEmployees.map((emp, idx) => (
                <option key={`${emp.nip || 'pppk'}-${idx}`} value={emp.nip}>
                  {emp.nama} — NIP. {emp.nip} ({emp.unitKerja || emp.jabatan})
                </option>
              ))}
            </select>
            {currentEmployee && (
              <div className="mt-2 p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">{currentEmployee.nama}</span>
                  <p className="text-[11px] text-blue-700">{currentEmployee.jabatan} • {currentEmployee.unitKerja}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {currentEmployee.jenisPegawai || 'PPPK'}
                </span>
              </div>
            )}
          </div>

          {/* 3 Component Scores */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Nilai Capaian Komponen (Skala 0 – 100)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* SKP */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-slate-800">1. Nilai SKP</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                    Bobot {currentPeriod?.skpWeight || 60}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={skpScore}
                  onChange={(e) => setSkpScore(Number(e.target.value))}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[11px] text-slate-500 block mt-1.5">
                  Kontribusi: <strong className="text-blue-600 font-mono">+{computed.skpContribution.toFixed(2)}</strong>
                </span>
              </div>

              {/* Behavior 360 */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-slate-800">2. Nilai Perilaku</span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                    Bobot {currentPeriod?.behaviorWeight || 25}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={behaviorScore}
                  onChange={(e) => setBehaviorScore(Number(e.target.value))}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[11px] text-slate-500 block mt-1.5">
                  Kontribusi: <strong className="text-indigo-600 font-mono">+{computed.behaviorContribution.toFixed(2)}</strong>
                </span>
              </div>

              {/* Attendance */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black text-slate-800">3. Nilai Presensi</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Bobot {currentPeriod?.attendanceWeight || 15}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={attendanceScore}
                  onChange={(e) => setAttendanceScore(Number(e.target.value))}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span className="text-[11px] text-slate-500 block mt-1.5">
                  Kontribusi: <strong className="text-emerald-600 font-mono">+{computed.attendanceContribution.toFixed(2)}</strong>
                </span>
              </div>

            </div>
          </div>

          {/* Live Output Simulation Card */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-blue-300 uppercase tracking-wider block">Kalkulasi Otomatis Nilai Akhir</span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl font-black text-white">{computed.finalScore.toFixed(2)}</span>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${
                  computed.category === 'Sangat Baik' ? 'bg-emerald-500 text-white' :
                  computed.category === 'Baik' ? 'bg-blue-500 text-white' :
                  computed.category === 'Cukup' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  Predikat: {computed.category}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-300 font-mono">
              <div>({skpScore}×{currentPeriod?.skpWeight}%) + ({behaviorScore}×{currentPeriod?.behaviorWeight}%) + ({attendanceScore}×{currentPeriod?.attendanceWeight}%)</div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Evaluator (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan prestasi khusus, pencapaian inovasi, atau rekomendasi perbaikan kinerja..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
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
              className="px-6 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 shadow-md flex items-center gap-1.5"
            >
              <i className="bi bi-check-circle-fill"></i>
              Simpan Evaluasi
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PPPKFormEvaluationModal;
