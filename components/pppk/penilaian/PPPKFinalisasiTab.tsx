import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  Pegawai,
  EvaluationPeriod
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  validatePreFinalisasi,
  finalisasiPenilaian,
  bukaKembaliPenilaian,
  getPenugasanPenilaiList,
  getMasterPeriods
} from '../../../services/pppkPenilaianModuleService';

interface PPPKFinalisasiTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  selectedAssignmentId?: string;
  preselectedAssignmentId?: string;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  onRefresh?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateTab?: (tabKey: string, assignmentId?: string) => void;
  onFinalizedSuccess?: (assignmentId?: string) => void;
}

export const PPPKFinalisasiTab: React.FC<PPPKFinalisasiTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  selectedAssignmentId,
  preselectedAssignmentId,
  onRefreshData,
  onRefreshAll,
  onRefresh,
  showToast,
  onNavigateTab,
  onFinalizedSuccess
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const safeRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
    if (onRefresh) onRefresh();
  };

  const effectiveAssignments = useMemo(() => {
    if (assignments && Array.isArray(assignments) && assignments.length > 0) return assignments;
    return getPenugasanPenilaiList() || [];
  }, [assignments]);

  const effectivePeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod;
    const periods = getMasterPeriods();
    if (selectedPeriodId) {
      return periods.find(p => p.id === selectedPeriodId) || periods[0];
    }
    return periods[0];
  }, [selectedPeriod, selectedPeriodId]);

  const periodAssignments = useMemo(() => {
    const list = effectiveAssignments || [];
    if (!effectivePeriod) return list;
    const filtered = list.filter(a => a && a.periodeId === effectivePeriod.id);
    return filtered.length > 0 ? filtered : list;
  }, [effectiveAssignments, effectivePeriod]);

  const targetSelectedId = preselectedAssignmentId || selectedAssignmentId;

  // Find target assignment
  const defaultAssign = useMemo(() => {
    const list = periodAssignments || [];
    if (targetSelectedId) {
      return list.find(a => a && a.id === targetSelectedId) || list[0];
    }
    return list[0];
  }, [periodAssignments, targetSelectedId]);

  const [currentAssignId, setCurrentAssignId] = useState<string>(defaultAssign?.id || '');

  React.useEffect(() => {
    if (defaultAssign?.id && !currentAssignId) {
      setCurrentAssignId(defaultAssign.id);
    }
  }, [defaultAssign?.id]);

  const activeAssignment = useMemo(() => {
    const list = periodAssignments || [];
    return list.find(a => a && a.id === currentAssignId) || defaultAssign;
  }, [periodAssignments, currentAssignId, defaultAssign]);

  // Pre-finalization check
  const preCheck = useMemo(() => {
    if (!activeAssignment) return null;
    try {
      return validatePreFinalisasi(activeAssignment.id);
    } catch (e) {
      return null;
    }
  }, [activeAssignment]);

  const isFinal = activeAssignment?.status === 'FINAL';

  // Modal states
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  // Handle Finalize
  const handleConfirmFinalize = () => {
    if (!activeAssignment) return;
    try {
      finalisasiPenilaian(
        activeAssignment.id,
        activePegawai?.nip || 'user',
        activePegawai?.nama || 'User'
      );
      setIsFinalizeModalOpen(false);
      safeRefresh();
      safeShowToast(`Evaluasi Kinerja untuk ${activeAssignment.pppkNama} berhasil difinalisasi dan dikunci resmi!`, 'success');
      if (onFinalizedSuccess) {
        onFinalizedSuccess(activeAssignment.id);
      }
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal memfinalisasi evaluasi.', 'error');
    }
  };

  // Handle Re-open (Admin only)
  const handleConfirmReopen = () => {
    if (!activeAssignment) return;
    if (!reopenReason || reopenReason.trim().length < 8) {
      safeShowToast('Alasan pembukaan kembali evaluasi wajib diisi minimal 8 karakter.', 'error');
      return;
    }

    try {
      bukaKembaliPenilaian(
        activeAssignment.id,
        reopenReason,
        activePegawai?.nip || 'admin',
        activePegawai?.nama || 'Admin SDM'
      );
      setIsReopenModalOpen(false);
      setReopenReason('');
      safeRefresh();
      safeShowToast(`Status penilaian ${activeAssignment.pppkNama} berhasil dibuka kembali (Re-opened).`, 'info');
    } catch (err: any) {
      safeShowToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
              Submenu 7
            </span>
            <span className="text-xs text-slate-500 font-bold">Validasi Prasyarat & Penguncian Dokumen</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Finalisasi & Kunci Evaluasi PPPK
          </h3>
          <p className="text-xs text-slate-600">
            Subjek: <strong className="text-slate-900">{activeAssignment?.pppkNama}</strong> | Periode {effectivePeriod?.semester} {effectivePeriod?.year}
          </p>
        </div>

        {/* Subjek Selector */}
        {periodAssignments.length > 1 && (
          <select
            value={currentAssignId}
            onChange={(e) => setCurrentAssignId(e.target.value)}
            className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500"
          >
            {periodAssignments.map(a => (
              <option key={a.id} value={a.id}>
                {a.pppkNama} ({a.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Lock State Status Banner */}
      {isFinal ? (
        <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider font-black text-emerald-800">
                  Status Dokumen: FINAL & TERKUNCI
                </span>
                <h4 className="text-xl font-black text-emerald-950 mt-0.5">
                  Evaluasi Kinerja Telah Difinalisasi
                </h4>
                <p className="text-xs text-emerald-800">
                  Seluruh data Hasil Kerja, Nilai Perilaku 360°, dan Kehadiran telah dibekukan untuk penerbitan SK Evaluasi Kinerja Resmi.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (onNavigateTab) {
                    onNavigateTab('laporan', activeAssignment?.id);
                  } else if (onFinalizedSuccess && activeAssignment?.id) {
                    onFinalizedSuccess(activeAssignment.id);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-black text-xs hover:bg-emerald-800 transition-all flex items-center gap-1.5 shadow"
              >
                <i className="bi bi-printer-fill"></i>
                Cetak Dokumen Resmi
              </button>

              {activeRole === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-100 text-rose-800 hover:bg-rose-200 font-bold text-xs border border-rose-300 transition-all flex items-center gap-1.5"
                >
                  <i className="bi bi-unlock-fill text-rose-600"></i>
                  Buka Kembali (Re-Open)
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-300 p-6 rounded-3xl shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xl font-bold">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                Dokumen Penilaian Belum Difinalisasi
              </h4>
              <p className="text-xs text-amber-800">
                Pastikan seluruh 7 kriteria prasyarat di bawah telah terpenuhi sebelum mengunci evaluasi.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Finalization Checklist Table */}
      {preCheck && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800">
              Daftar Checklist Kelengkapan Validasi Sistem
            </h4>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
              preCheck.valid
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {preCheck.valid ? 'Semua Syarat Terpenuhi' : `${preCheck.errors.length} Syarat Belum Terpenuhi`}
            </span>
          </div>

          <div className="p-6 space-y-3">
            {preCheck.checklist.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  item.passed
                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50/40 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    item.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    <i className={`bi ${item.passed ? 'bi-check-lg' : 'bi-x-lg'}`}></i>
                  </span>
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[11px] opacity-80">{item.detail}</div>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {item.passed ? 'LENGKAP' : 'BELUM'}
                </span>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          {!isFinal && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {preCheck.valid
                  ? 'Kriteria terpenuhi. Anda dapat memfinalisasi evaluasi sekarang.'
                  : 'Selesaikan tahapan yang belum lengkap untuk dapat melakukan finalisasi.'}
              </div>

              {(activeRole === 'PEJABAT_PENILAI' || activeRole === 'ADMIN') && (
                <button
                  type="button"
                  disabled={!preCheck.valid}
                  onClick={() => setIsFinalizeModalOpen(true)}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-md flex items-center gap-2 ${
                    preCheck.valid
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <i className="bi bi-lock-fill"></i>
                  Finalisasi & Kunci Penilaian
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Finalize Modal */}
      {isFinalizeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              <i className="bi bi-shield-lock"></i>
            </div>
            <div className="text-center">
              <h4 className="text-base font-black text-slate-900">
                Konfirmasi Finalisasi Evaluasi Kinerja
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Apakah Anda yakin ingin mengunci evaluasi kinerja untuk{' '}
                <strong>{activeAssignment?.pppkNama}</strong>? Setelah difinalisasi, seluruh nilai tidak dapat diubah kembali kecuali dibuka oleh Admin SDM.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmFinalize}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md"
              >
                Ya, Kunci & Finalisasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-Open Modal for Admin */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <i className="bi bi-unlock-fill text-amber-600"></i>
              Buka Kembali Evaluasi (Re-open by Admin)
            </h4>
            <p className="text-xs text-slate-600">
              Tindakan ini akan mengembalikan status ke <strong>DALAM_PENILAIAN</strong> dan dicatat ke dalam Jejak Audit Kepegawaian.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Alasan Pembukaan Kembali (Wajib Diisi):</label>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Contoh: Perbaikan bukti dukung RHK nomor 3 sesuai arahan pimpinan unit..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700"
              >
                Konfirmasi Buka Kembali
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
