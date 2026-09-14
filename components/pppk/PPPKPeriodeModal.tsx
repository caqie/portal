import React, { useState, useEffect } from 'react';
import { EvaluationPeriod, PPPKSemester, EvaluationPeriodStatus } from '../../types';
import { getSemesterDates } from '../../services/pppkEvaluationService';

interface PPPKPeriodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (periodData: Partial<EvaluationPeriod>) => void;
  periodToEdit?: EvaluationPeriod | null;
}

const PPPKPeriodeModal: React.FC<PPPKPeriodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  periodToEdit
}) => {
  const [year, setYear] = useState<number>(2026);
  const [semester, setSemester] = useState<PPPKSemester>('I');
  const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<EvaluationPeriodStatus>('OPEN');
  const [skpWeight, setSkpWeight] = useState<number>(60);
  const [behaviorWeight, setBehaviorWeight] = useState<number>(25);
  const [attendanceWeight, setAttendanceWeight] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (periodToEdit) {
      setYear(periodToEdit.year);
      setSemester(periodToEdit.semester);
      setName(periodToEdit.name);
      setStatus(periodToEdit.status);
      setSkpWeight(periodToEdit.skpWeight);
      setBehaviorWeight(periodToEdit.behaviorWeight);
      setAttendanceWeight(periodToEdit.attendanceWeight);
      setNotes(periodToEdit.notes || '');
    } else {
      setYear(2026);
      setSemester('I');
      setName('2026 Semester I');
      setStatus('OPEN');
      setSkpWeight(60);
      setBehaviorWeight(25);
      setAttendanceWeight(15);
      setNotes('');
    }
    setErrorMessage('');
  }, [periodToEdit, isOpen]);

  // When year or semester changes, auto update name
  useEffect(() => {
    if (!periodToEdit) {
      setName(`${year} Semester ${semester}`);
    }
  }, [year, semester, periodToEdit]);

  const dates = getSemesterDates(year, semester);
  const totalWeight = Number(skpWeight) + Number(behaviorWeight) + Number(attendanceWeight);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (totalWeight !== 100) {
      setErrorMessage(`Total bobot penilaian harus tepat 100%. Saat ini: ${totalWeight}%.`);
      return;
    }

    try {
      onSave({
        id: periodToEdit?.id,
        year,
        semester,
        name,
        status,
        skpWeight: Number(skpWeight),
        behaviorWeight: Number(behaviorWeight),
        attendanceWeight: Number(attendanceWeight),
        notes
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan periode.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold">
              <i className="bi bi-calendar-range"></i>
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {periodToEdit ? 'Edit Periode Evaluasi' : 'Buat Periode Evaluasi Semester'}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Atur tahun anggaran, semester, dan konfigurasi bobot resmi
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

          <div className="grid grid-cols-2 gap-4">
            {/* Year */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Tahun Anggaran
              </label>
              <input
                type="number"
                min="2020"
                max="2035"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={!!periodToEdit}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                required
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as PPPKSemester)}
                disabled={!!periodToEdit}
                className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              >
                <option value="I">Semester I (Ganjil)</option>
                <option value="II">Semester II (Genap)</option>
              </select>
            </div>
          </div>

          {/* Auto Determined Date Range Notice */}
          <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <div>
              <span className="font-bold text-blue-950">Rentang Tanggal Otomatis:</span>
              <p className="text-[11px] text-blue-700 mt-0.5 font-mono">
                {dates.startDate} s/d {dates.endDate}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold">
              {semester === 'I' ? '6 Bulan (Jan - Jun)' : '6 Bulan (Jul - Des)'}
            </span>
          </div>

          {/* Period Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Periode
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Status Periode
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EvaluationPeriodStatus)}
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="OPEN">OPEN (Sedang Berjalan & Aktif)</option>
              <option value="DRAFT">DRAFT (Persiapan Periode)</option>
              <option value="CLOSED">CLOSED (Ditutup / Selesai)</option>
            </select>
          </div>

          {/* Weights Section with 100% validation check */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Konfigurasi Bobot Penilaian
              </h3>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                totalWeight === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                Total: {totalWeight}% {totalWeight === 100 ? '✓ (Valid)' : '✗ (Harus 100%)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">SKP (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={skpWeight}
                  onChange={(e) => setSkpWeight(Number(e.target.value))}
                  className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-300 bg-white text-center"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Perilaku 360° (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={behaviorWeight}
                  onChange={(e) => setBehaviorWeight(Number(e.target.value))}
                  className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-300 bg-white text-center"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Absensi (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={attendanceWeight}
                  onChange={(e) => setAttendanceWeight(Number(e.target.value))}
                  className="w-full text-xs font-black p-2.5 rounded-xl border border-slate-300 bg-white text-center"
                  required
                />
              </div>
            </div>
            {totalWeight !== 100 && (
              <p className="text-[11px] text-rose-600 font-bold">
                Peringatan: Selisih {Math.abs(100 - totalWeight)}% dari batas wajib 100%.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Periode (Opsional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan terkait periode evaluasi semester ini..."
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
              disabled={totalWeight !== 100}
              className="px-6 py-2 bg-blue-600 disabled:bg-slate-400 text-white text-xs font-black rounded-xl hover:bg-blue-700 shadow-md flex items-center gap-1.5"
            >
              <i className="bi bi-check-circle-fill"></i>
              Simpan Periode
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default PPPKPeriodeModal;
