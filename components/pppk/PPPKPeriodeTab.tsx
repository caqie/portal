import React, { useState } from 'react';
import { EvaluationPeriod } from '../../types';
import PPPKPeriodeModal from './PPPKPeriodeModal';

interface PPPKPeriodeTabProps {
  periods: EvaluationPeriod[];
  onSavePeriod: (periodData: Partial<EvaluationPeriod>) => void;
  onDeletePeriod: (id: string) => void;
  onSelectPeriod: (year: number, semester: 'I' | 'II') => void;
}

const PPPKPeriodeTab: React.FC<PPPKPeriodeTabProps> = ({
  periods,
  onSavePeriod,
  onDeletePeriod,
  onSelectPeriod
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [periodToEdit, setPeriodToEdit] = useState<EvaluationPeriod | null>(null);

  const handleCreate = () => {
    setPeriodToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (p: EvaluationPeriod) => {
    setPeriodToEdit(p);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Master Periode Evaluasi PPPK</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola periode semester ganjil (Jan–Jun) dan genap (Jul–Des) beserta konfigurasi bobot resmi (harus 100%).
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          <i className="bi bi-calendar-plus"></i>
          Buat Periode Baru
        </button>
      </div>

      {/* Grid of Periods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {periods.map(period => (
          <div
            key={period.id}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between hover:border-blue-300 transition-all"
          >
            <div>
              {/* Header card */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                    period.semester === 'I' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  }`}>
                    {period.semester}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 tracking-tight">{period.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        period.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        period.status === 'CLOSED' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {period.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {period.startDate} s/d {period.endDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(period)}
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors text-xs"
                    title="Edit Periode"
                  >
                    <i className="bi bi-pencil-fill"></i>
                  </button>
                  <button
                    onClick={() => onDeletePeriod(period.id)}
                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition-colors text-xs"
                    title="Hapus Periode"
                  >
                    <i className="bi bi-trash-fill"></i>
                  </button>
                </div>
              </div>

              {/* Weights Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                  Proporsi Bobot Resmi (Total 100%)
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">SKP</span>
                    <strong className="text-blue-600 font-black text-sm">{period.skpWeight}%</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Perilaku 360°</span>
                    <strong className="text-indigo-600 font-black text-sm">{period.behaviorWeight}%</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Presensi</span>
                    <strong className="text-emerald-600 font-black text-sm">{period.attendanceWeight}%</strong>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {period.notes && (
                <p className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-slate-100">
                  "{period.notes}"
                </p>
              )}
            </div>

            {/* Bottom action */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Dibuat oleh: <strong className="text-slate-700">{period.createdBy}</strong>
              </span>
              <button
                onClick={() => onSelectPeriod(period.year, period.semester)}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                Pilih Periode Ini
                <i className="bi bi-arrow-right"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <PPPKPeriodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSavePeriod}
        periodToEdit={periodToEdit}
      />

    </div>
  );
};

export default PPPKPeriodeTab;
