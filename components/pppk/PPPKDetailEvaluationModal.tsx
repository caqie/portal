import React, { useState, useEffect } from 'react';
import { PPPKEvaluation, EvaluationPeriod } from '../../types';
import {
  exportPPPKCompleteBundlePDF,
  exportPPPKEvaluasiKinerjaPDF,
  exportPPPKPerilakuKerjaPDF,
  exportPPPKHasilKerjaPDF
} from '../../services/pppkOfficialDocumentService';
import { PPPKOfficialDoc1Preview } from './PPPKOfficialDoc1Preview';
import { PPPKOfficialDoc2Preview } from './PPPKOfficialDoc2Preview';
import { PPPKOfficialDoc3Preview } from './PPPKOfficialDoc3Preview';
import { PPPKOfficialDocEditor } from './PPPKOfficialDocEditor';

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
  onEvaluationUpdated?: (updated: PPPKEvaluation) => void;
}

type ModalTab = 'summary' | 'doc1' | 'doc2' | 'doc3' | 'editor';

const PPPKDetailEvaluationModal: React.FC<PPPKDetailEvaluationModalProps> = ({
  evaluation,
  isOpen,
  onClose,
  onRecalculate,
  onFinalize,
  onRequestCorrection,
  onApproveCorrection,
  onOpenBehaviorAssessment,
  currentUserRole = 'superadmin',
  onEvaluationUpdated
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('doc1');
  const [currentEval, setCurrentEval] = useState<PPPKEvaluation | null>(evaluation);
  const [showCorrectionPrompt, setShowCorrectionPrompt] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    setCurrentEval(evaluation);
  }, [evaluation]);

  if (!isOpen || !currentEval) return null;

  const handleRequestCorrectionSubmit = () => {
    if (!correctionReason.trim()) {
      alert('Mohon masukkan alasan permohonan koreksi nilai secara lengkap.');
      return;
    }
    onRequestCorrection(currentEval.id, correctionReason);
    setShowCorrectionPrompt(false);
    setCorrectionReason('');
  };

  const handleSavedFromEditor = (updated: PPPKEvaluation) => {
    setCurrentEval(updated);
    if (onEvaluationUpdated) {
      onEvaluationUpdated(updated);
    }
  };

  const isSuperadmin = currentUserRole.toLowerCase().includes('admin') || currentUserRole.toLowerCase().includes('sdm');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center text-2xl font-black shrink-0">
              {currentEval.isFinal ? <i className="bi bi-lock-fill text-emerald-400"></i> : <i className="bi bi-file-earmark-person"></i>}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Tahun {currentEval.year} — Semester {currentEval.semester}
                </span>
                {currentEval.isFinal ? (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <i className="bi bi-shield-check"></i>
                    FINAL (TERKUNCI)
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    {currentEval.status}
                  </span>
                )}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Permenpan RB 6/2022
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">{currentEval.nama}</h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                NIP. {currentEval.employeeId} • {currentEval.jabatan} • {currentEval.unitKerja}
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

        {/* Tab Navigation */}
        <div className="bg-slate-800 px-4 pt-2 border-b border-slate-700 flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('doc1')}
            className={`px-3.5 py-2.5 rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'doc1'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <i className="bi bi-file-earmark-text-fill text-blue-500"></i>
            Dokumen 1: Evaluasi Kinerja (Hal 1–2)
          </button>

          <button
            onClick={() => setActiveTab('doc2')}
            className={`px-3.5 py-2.5 rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'doc2'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <i className="bi bi-file-earmark-ruled-fill text-indigo-500"></i>
            Dokumen 2: Perilaku BerAKHLAK (Hal 3–4)
          </button>

          <button
            onClick={() => setActiveTab('doc3')}
            className={`px-3.5 py-2.5 rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'doc3'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <i className="bi bi-file-earmark-check-fill text-emerald-500"></i>
            Dokumen 3: Hasil Kerja (Hal 5)
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3.5 py-2.5 rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'summary'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <i className="bi bi-bar-chart-line-fill text-amber-500"></i>
            Ringkasan Skor & Metrik
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-2.5 rounded-t-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'editor'
                ? 'bg-white text-slate-900 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <i className="bi bi-pencil-square text-rose-400"></i>
            Atur Pejabat & Data Cetak
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          
          {/* Status Alert for Final or Correction */}
          {currentEval.isFinal && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-lock-fill text-emerald-600 text-xl mt-0.5"></i>
                <div>
                  <p className="text-xs font-black text-emerald-900">Nilai Evaluasi Telah Difinalisasi & Disahkan</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Data terkunci pada snapshot resmi oleh <strong>{currentEval.finalizedBy || 'Admin'}</strong> pada {currentEval.finalizedAt}. Perubahan nilai memerlukan alur pengajuan koreksi resmi.
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

          {currentEval.status === 'CORRECTION_REQUESTED' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-xl mt-0.5"></i>
                <div>
                  <p className="text-xs font-black text-amber-900">Permohonan Koreksi Sedang Menunggu Persetujuan</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    <strong>Alasan:</strong> "{currentEval.correctionReason}" (diajukan oleh {currentEval.correctionRequestedBy} pada {currentEval.correctionRequestedAt})
                  </p>
                </div>
              </div>
              {isSuperadmin && (
                <button
                  onClick={() => onApproveCorrection(currentEval.id)}
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

          {/* TAB 1: DOKUMEN 1 PREVIEW */}
          {activeTab === 'doc1' && (
            <PPPKOfficialDoc1Preview evaluation={currentEval} />
          )}

          {/* TAB 2: DOKUMEN 2 PREVIEW */}
          {activeTab === 'doc2' && (
            <PPPKOfficialDoc2Preview evaluation={currentEval} />
          )}

          {/* TAB 3: DOKUMEN 3 PREVIEW */}
          {activeTab === 'doc3' && (
            <PPPKOfficialDoc3Preview evaluation={currentEval} />
          )}

          {/* TAB 4: RINGKASAN SKOR & METRIK */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Big Summary Score Card */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 rounded-3xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-black text-blue-300 uppercase tracking-wider">Hasil Evaluasi Kinerja Akhir</span>
                  <div className="flex items-baseline gap-4 mt-2">
                    <span className="text-5xl font-black text-white tracking-tight">{currentEval.finalScore.toFixed(2)}</span>
                    <span className="text-sm text-slate-300 font-medium">/ 100.00</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                      currentEval.category === 'Sangat Baik' ? 'bg-emerald-500 text-white' :
                      currentEval.category === 'Baik' ? 'bg-blue-500 text-white' :
                      currentEval.category === 'Cukup' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      Predikat: {currentEval.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      Dihitung otomatis: {currentEval.calculatedAt}
                    </span>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-xs space-y-2">
                  <span className="font-bold text-blue-200 uppercase tracking-wider text-[10px] block mb-1">Rincian Kontribusi Skor:</span>
                  <div className="flex items-center justify-between gap-6 text-slate-200">
                    <span>1. SKP ({currentEval.skpWeight}%)</span>
                    <strong className="text-white font-mono">{currentEval.skpContribution.toFixed(2)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-6 text-slate-200">
                    <span>2. Perilaku 360° ({currentEval.behaviorWeight}%)</span>
                    <strong className="text-white font-mono">{currentEval.behaviorContribution.toFixed(2)}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-6 text-slate-200">
                    <span>3. Absensi ({currentEval.attendanceWeight}%)</span>
                    <strong className="text-white font-mono">{currentEval.attendanceContribution.toFixed(2)}</strong>
                  </div>
                  <div className="border-t border-white/20 pt-2 flex items-center justify-between gap-6 text-white font-black">
                    <span>Total Nilai Akhir</span>
                    <span className="text-emerald-300 font-mono text-sm">{currentEval.finalScore.toFixed(2)}</span>
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
                        Bobot {currentEval.skpWeight}%
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Nilai Capaian:</span>
                        <span className="text-base font-black text-slate-900">{currentEval.skpScore.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Predikat SKP:</span>
                        <span className="font-bold text-slate-800">{currentEval.skpPredikat || 'Sesuai Ekspektasi'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Kontribusi Akhir:</span>
                        <span className="font-black text-blue-600 font-mono">+{currentEval.skpContribution.toFixed(2)}</span>
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
                        Bobot {currentEval.behaviorWeight}%
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Nilai Konversi:</span>
                        <span className="text-base font-black text-slate-900">{currentEval.behaviorScore.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Skala 1–5 (Rata-rata):</span>
                        <span className="font-bold text-slate-800">
                          {((currentEval.behaviorScore / 100) * 5).toFixed(2)} / 5.00
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Kontribusi Akhir:</span>
                        <span className="font-black text-indigo-600 font-mono">+{currentEval.behaviorContribution.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">7 Aspek BerAKHLAK (28 Butir)</span>
                    {!currentEval.isFinal && (
                      <button
                        onClick={() => onOpenBehaviorAssessment(currentEval)}
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
                        Bobot {currentEval.attendanceWeight}%
                      </span>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Nilai Presensi:</span>
                        <span className="text-base font-black text-slate-900">{currentEval.attendanceScore.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Basis Perhitungan:</span>
                        <span className="font-bold text-slate-800">100 - Penalti Terlambat/Alpa</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Kontribusi Akhir:</span>
                        <span className="font-black text-emerald-600 font-mono">+{currentEval.attendanceContribution.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                    Terhubung ke modul Smart Presensi DJKI
                  </div>
                </div>
              </div>

              {/* Final Snapshot Details if available */}
              {currentEval.finalSnapshot && (
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <i className="bi bi-camera-fill text-slate-500"></i>
                      Data Rekam Snapshot Resmi (Immutable)
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">Disahkan: {currentEval.finalSnapshot.finalizedAt}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Hari Kerja Efektif</span>
                      <strong className="text-slate-800">{currentEval.finalSnapshot.attendanceSummary?.workDays || 120} Hari</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Kehadiran Riil</span>
                      <strong className="text-slate-800">{currentEval.finalSnapshot.attendanceSummary?.presentDays || 118} Hari</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Terlambat / Pulang Cepat</span>
                      <strong className="text-slate-800">
                        {currentEval.finalSnapshot.attendanceSummary?.lateCount || 0} / {currentEval.finalSnapshot.attendanceSummary?.earlyLeaveCount || 0} Kali
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Responden 360°</span>
                      <strong className="text-slate-800">{currentEval.finalSnapshot.behaviorSummary?.respondentCount || 3} Responden</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: EDITOR PEJABAT & DATA */}
          {activeTab === 'editor' && (
            <PPPKOfficialDocEditor evaluation={currentEval} onSaved={handleSavedFromEditor} />
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
                    onFinalize(currentEval.id);
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 relative">
            
            {/* Primary Action: Download 5-page Complete Bundle */}
            <button
              onClick={() => exportPPPKCompleteBundlePDF(currentEval)}
              className="px-4 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
              title="Unduh 3 dokumen resmi lengkap: Evaluasi Kinerja (2 hal), Perilaku BerAKHLAK (2 hal), Hasil Kerja (1 hal)"
            >
              <i className="bi bi-file-earmark-pdf-fill text-rose-400 text-sm"></i>
              <span>Cetak Berkas Lengkap (5 Hal PDF)</span>
            </button>

            {/* Dropdown for individual documents */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <span>Pilih Dokumen</span>
                <i className="bi bi-chevron-down text-[10px]"></i>
              </button>

              {showExportMenu && (
                <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Cetak Dokumen Satuan
                  </div>
                  <button
                    onClick={() => {
                      exportPPPKEvaluasiKinerjaPDF(currentEval);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 flex items-center gap-2"
                  >
                    <i className="bi bi-file-earmark-text text-blue-600"></i>
                    <span>Formulir 1: Evaluasi Kinerja (2 Hal)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportPPPKPerilakuKerjaPDF(currentEval);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2"
                  >
                    <i className="bi bi-file-earmark-ruled text-indigo-600"></i>
                    <span>Formulir 2: Perilaku BerAKHLAK (2 Hal)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportPPPKHasilKerjaPDF(currentEval);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 flex items-center gap-2"
                  >
                    <i className="bi bi-file-earmark-check text-emerald-600"></i>
                    <span>Formulir 3: Hasil Kerja (1 Hal)</span>
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center gap-2">
            {!currentEval.isFinal && (
              <>
                <button
                  onClick={() => onRecalculate(currentEval.id)}
                  className="px-3.5 py-2 bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold rounded-xl hover:bg-blue-100 flex items-center gap-1.5"
                >
                  <i className="bi bi-arrow-repeat"></i>
                  Hitung Ulang Skor
                </button>
                <button
                  onClick={() => setShowFinalizeConfirm(true)}
                  className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
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
