import React, { useState } from 'react';
import { PPPKEvaluation, EvaluationPeriod } from '../../types';
import { exportPPPKEvaluationToPDF } from './PPPKExportUtils';

interface PPPKDetailEvaluationModalProps {
  evaluation: PPPKEvaluation | null;
  period?: EvaluationPeriod;
  isOpen: boolean;
  onClose: () => void;
  onRecalculate: (id: string) => void;
  onFinalize: (id: string) => void;
  onRequestCorrection: (id: string, reason: string) => void;
  onApproveCorrection: (id: string) => void;
  onOpenBehaviorAssessment: (evaluation: PPPKEvaluation) => void;
  currentUserRole?: string;
}

const PPPKDetailEvaluationModal: React.FC<PPPKDetailEvaluationModalProps> = ({
  evaluation,
  isOpen,
  onClose,
  onRecalculate,
  onFinalize,
  onRequestCorrection,
  onApproveCorrection,
  onOpenBehaviorAssessment,
  currentUserRole = 'superadmin'
}) => {
  const [showCorrectionPrompt, setShowCorrectionPrompt] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  if (!isOpen || !evaluation) return null;

  const handleRequestCorrectionSubmit = () => {
    if (!correctionReason.trim()) {
      alert('Mohon masukkan alasan permohonan koreksi nilai secara lengkap.');
      return;
    }
    onRequestCorrection(evaluation.id, correctionReason);
    setShowCorrectionPrompt(false);
    setCorrectionReason('');
  };

  const isSuperadmin = currentUserRole.toLowerCase().includes('admin') || currentUserRole.toLowerCase().includes('sdm');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-start justify-between relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center text-2xl font-black shrink-0">
              {evaluation.isFinal ? <i className="bi bi-lock-fill text-emerald-400"></i> : <i className="bi bi-file-earmark-person"></i>}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Tahun {evaluation.year} — Semester {evaluation.semester}
                </span>
                {evaluation.isFinal ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <i className="bi bi-shield-check"></i>
                    FINAL (TERKUNCI)
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {evaluation.status}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">{evaluation.nama}</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                NIP. {evaluation.employeeId} • {evaluation.jabatan} • {evaluation.unitKerja}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Status Alert for Final or Correction */}
          {evaluation.isFinal && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-lock-fill text-emerald-600 text-xl mt-0.5"></i>
                <div>
                  <p className="text-xs font-black text-emerald-900">Nilai Evaluasi Telah Difinalisasi & Disahkan</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Data terkunci pada snapshot resmi oleh <strong>{evaluation.finalizedBy || 'Admin'}</strong> pada {evaluation.finalizedAt}. Perubahan nilai memerlukan alur pengajuan koreksi resmi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCorrectionPrompt(true)}
                className="px-3 py-1.5 bg-white text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 hover:bg-emerald-100 shadow-sm shrink-0 flex items-center gap-1.5"
              >
                <i className="bi bi-pencil-square"></i>
                Ajukan Koreksi
              </button>
            </div>
          )}

          {evaluation.status === 'CORRECTION_REQUESTED' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-xl mt-0.5"></i>
                <div>
                  <p className="text-xs font-black text-amber-900">Permohonan Koreksi Sedang Menunggu Persetujuan</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    <strong>Alasan:</strong> "{evaluation.correctionReason}" (diajukan oleh {evaluation.correctionRequestedBy} pada {evaluation.correctionRequestedAt})
                  </p>
                </div>
              </div>
              {isSuperadmin && (
                <button
                  onClick={() => onApproveCorrection(evaluation.id)}
                  className="px-3 py-1.5 bg-amber-600 text-white text-xs font-black rounded-xl hover:bg-amber-700 shadow-sm shrink-0 flex items-center gap-1.5"
                >
                  <i className="bi bi-unlock-fill"></i>
                  Setujui & Buka Kunci
                </button>
              )}
            </div>
          )}

          {/* Prompt Reason Input */}
          {showCorrectionPrompt && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="text-xs font-black text-slate-800">Alasan Permohonan Koreksi Resmi:</label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Contoh: Terdapat pembaruan data presensi terlambat yang telah disetujui atasan / revisi capaian SKP..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCorrectionPrompt(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={handleRequestCorrectionSubmit}
                  className="px-4 py-1.5 text-xs font-black bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
                >
                  Kirim Permohonan
                </button>
              </div>
            </div>
          )}

          {/* Big Summary Score Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-black text-blue-300 uppercase tracking-wider">Hasil Evaluasi Kinerja Akhir</span>
              <div className="flex items-baseline gap-4 mt-2">
                <span className="text-5xl font-black text-white tracking-tight">{evaluation.finalScore.toFixed(2)}</span>
                <span className="text-sm text-slate-300 font-medium">/ 100.00</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  evaluation.category === 'Sangat Baik' ? 'bg-emerald-500 text-white' :
                  evaluation.category === 'Baik' ? 'bg-blue-500 text-white' :
                  evaluation.category === 'Cukup' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  Predikat: {evaluation.category}
                </span>
                <span className="text-xs text-slate-400">
                  Dihitung otomatis: {evaluation.calculatedAt}
                </span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-xs space-y-2">
              <span className="font-bold text-blue-200 uppercase tracking-wider text-[10px] block mb-1">Rincian Kontribusi Skor:</span>
              <div className="flex items-center justify-between gap-6 text-slate-200">
                <span>1. SKP ({evaluation.skpWeight}%)</span>
                <strong className="text-white font-mono">{evaluation.skpContribution.toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between gap-6 text-slate-200">
                <span>2. Perilaku 360° ({evaluation.behaviorWeight}%)</span>
                <strong className="text-white font-mono">{evaluation.behaviorContribution.toFixed(2)}</strong>
              </div>
              <div className="flex items-center justify-between gap-6 text-slate-200">
                <span>3. Absensi ({evaluation.attendanceWeight}%)</span>
                <strong className="text-white font-mono">{evaluation.attendanceContribution.toFixed(2)}</strong>
              </div>
              <div className="border-t border-white/20 pt-2 flex items-center justify-between gap-6 text-white font-black">
                <span>Total Nilai Akhir</span>
                <span className="text-emerald-300 font-mono text-sm">{evaluation.finalScore.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Three Pillars Assessment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. SKP Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Sasaran Kinerja (SKP)</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    Bobot {evaluation.skpWeight}%
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Nilai Capaian:</span>
                    <span className="text-base font-black text-slate-900">{evaluation.skpScore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Predikat SKP:</span>
                    <span className="font-bold text-slate-800">{evaluation.skpPredikat || 'Sesuai Ekspektasi'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Kontribusi Akhir:</span>
                    <span className="font-black text-blue-600 font-mono">+{evaluation.skpContribution.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Data bersumber dari modul SKP Portal SDM DJKI
              </div>
            </div>

            {/* 2. Perilaku 360 Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Perilaku Kerja 360°</h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Bobot {evaluation.behaviorWeight}%
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Nilai Konversi:</span>
                    <span className="text-base font-black text-slate-900">{evaluation.behaviorScore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Skala 1–5 (Rata-rata):</span>
                    <span className="font-bold text-slate-800">
                      {((evaluation.behaviorScore / 100) * 5).toFixed(2)} / 5.00
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Kontribusi Akhir:</span>
                    <span className="font-black text-indigo-600 font-mono">+{evaluation.behaviorContribution.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">10 Aspek BerAKHLAK</span>
                {!evaluation.isFinal && (
                  <button
                    onClick={() => onOpenBehaviorAssessment(evaluation)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    Input 360°
                    <i className="bi bi-chevron-right"></i>
                  </button>
                )}
              </div>
            </div>

            {/* 3. Absensi Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Kedisiplinan & Presensi</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Bobot {evaluation.attendanceWeight}%
                  </span>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Nilai Presensi:</span>
                    <span className="text-base font-black text-slate-900">{evaluation.attendanceScore.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Basis Perhitungan:</span>
                    <span className="font-bold text-slate-800">100 - Penalti Terlambat/Alpa</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Kontribusi Akhir:</span>
                    <span className="font-black text-emerald-600 font-mono">+{evaluation.attendanceContribution.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Terhubung ke modul Smart Presensi DJKI
              </div>
            </div>
          </div>

          {/* Final Snapshot Details if available */}
          {evaluation.finalSnapshot && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="bi bi-camera-fill text-slate-500"></i>
                  Data Rekam Snapshot Resmi (Immutable)
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">Disahkan: {evaluation.finalSnapshot.finalizedAt}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Hari Kerja Efektif</span>
                  <strong className="text-slate-800">{evaluation.finalSnapshot.attendanceSummary?.workDays || 120} Hari</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Kehadiran Riil</span>
                  <strong className="text-slate-800">{evaluation.finalSnapshot.attendanceSummary?.presentDays || 118} Hari</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Terlambat / Pulang Cepat</span>
                  <strong className="text-slate-800">
                    {evaluation.finalSnapshot.attendanceSummary?.lateCount || 0} / {evaluation.finalSnapshot.attendanceSummary?.earlyLeaveCount || 0} Kali
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Responden 360°</span>
                  <strong className="text-slate-800">{evaluation.finalSnapshot.behaviorSummary?.respondentCount || 3} Responden</strong>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Finalize Box */}
          {showFinalizeConfirm && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-octagon-fill text-red-600 text-xl mt-0.5"></i>
                <div>
                  <h4 className="text-xs font-black text-red-900">Konfirmasi Finalisasi Evaluasi Kinerja PPPK</h4>
                  <p className="text-xs text-red-700 mt-1">
                    Setelah difinalisasi, seluruh nilai komponen (SKP, 360°, Absensi), bobot, dan predikat akhir akan <strong>TERKUNCI SECARA PERMANEN</strong> ke dalam snapshot resmi. Evaluasi tidak dapat dihitung ulang atau diedit langsung kecuali melalui persetujuan permohonan koreksi resmi.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowFinalizeConfirm(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onFinalize(evaluation.id);
                    setShowFinalizeConfirm(false);
                  }}
                  className="px-4 py-1.5 text-xs font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
                >
                  <i className="bi bi-lock-fill"></i>
                  Ya, Finalisasi & Kunci
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPPPKEvaluationToPDF(evaluation)}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 shadow-sm flex items-center gap-1.5"
            >
              <i className="bi bi-file-earmark-pdf-fill text-rose-400"></i>
              Cetak Dokumen PDF
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!evaluation.isFinal && (
              <>
                <button
                  onClick={() => onRecalculate(evaluation.id)}
                  className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold rounded-xl hover:bg-blue-100 flex items-center gap-1.5"
                >
                  <i className="bi bi-arrow-repeat"></i>
                  Hitung Ulang Skor
                </button>
                <button
                  onClick={() => setShowFinalizeConfirm(true)}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
                >
                  <i className="bi bi-lock-fill"></i>
                  Finalisasi Nilai
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-300"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PPPKDetailEvaluationModal;
