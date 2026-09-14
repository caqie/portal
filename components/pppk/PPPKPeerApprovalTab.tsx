import React, { useState, useMemo } from 'react';
import { EvaluationAssignment, Pegawai } from '../../types';
import {
  getEvaluationAssignments,
  approvePeerAssignment,
  rejectPeerAssignment,
  replacePeerEvaluator,
  getAllEmployees
} from '../../services/pppkEvaluationService';

interface PPPKPeerApprovalTabProps {
  selectedYear: number;
  selectedSemester: 'I' | 'II';
  currentUser?: { nip?: string; nama?: string; role?: string };
  onDataChanged?: () => void;
}

export const PPPKPeerApprovalTab: React.FC<PPPKPeerApprovalTabProps> = ({
  selectedYear,
  selectedSemester,
  currentUser,
  onDataChanged
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Reject Modal State
  const [rejectTarget, setRejectTarget] = useState<EvaluationAssignment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Replace Evaluator Modal State
  const [replaceTarget, setReplaceTarget] = useState<EvaluationAssignment | null>(null);
  const [selectedReplacementNip, setSelectedReplacementNip] = useState('');
  const [replaceSearchQuery, setReplaceSearchQuery] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const allEmployees = useMemo(() => getAllEmployees(), []);

  // Fetch all peer assignments for selected period
  const peerAssignments = useMemo(() => {
    // refreshTrigger is dependency to re-read
    void refreshTrigger;
    const all = getEvaluationAssignments({ evaluatorType: 'REKAN_KERJA' });
    return all.filter(a => a.year === selectedYear && a.semester === selectedSemester);
  }, [selectedYear, selectedSemester, refreshTrigger]);

  // Filtered list
  const filteredList = useMemo(() => {
    return peerAssignments.filter(a => {
      if (filterStatus !== 'ALL' && a.approval_status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubj = a.subject_employee_nama.toLowerCase().includes(q) || a.subject_employee_id.toLowerCase().includes(q);
        const matchEval = a.evaluator_employee_nama.toLowerCase().includes(q) || a.evaluator_employee_id.toLowerCase().includes(q);
        const matchUnit = (a.subject_employee_unit || '').toLowerCase().includes(q) || (a.evaluator_employee_unit || '').toLowerCase().includes(q);
        if (!matchSubj && !matchEval && !matchUnit) return false;
      }
      return true;
    });
  }, [peerAssignments, filterStatus, searchQuery]);

  // Counters
  const counts = useMemo(() => {
    return {
      all: peerAssignments.length,
      pending: peerAssignments.filter(a => a.approval_status === 'PENDING').length,
      approved: peerAssignments.filter(a => a.approval_status === 'APPROVED').length,
      rejected: peerAssignments.filter(a => a.approval_status === 'REJECTED').length
    };
  }, [peerAssignments]);

  const handleApprove = (assignment: EvaluationAssignment) => {
    setActionError(null);
    try {
      approvePeerAssignment(
        assignment.id,
        currentUser?.nip || 'ADMIN-SDM',
        currentUser?.nama || 'Admin SDM'
      );
      setActionSuccess(`Usulan rekan kerja ${assignment.evaluator_employee_nama} untuk ${assignment.subject_employee_nama} berhasil disetujui.`);
      setRefreshTrigger(p => p + 1);
      if (onDataChanged) onDataChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menyetujui usulan penilai.');
    }
  };

  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      setActionError('Alasan penolakan wajib diisi.');
      return;
    }

    setIsRejecting(true);
    setActionError(null);
    try {
      rejectPeerAssignment(
        rejectTarget.id,
        rejectionReason,
        currentUser?.nip || 'ADMIN-SDM',
        currentUser?.nama || 'Admin SDM'
      );
      setActionSuccess(`Usulan rekan kerja ${rejectTarget.evaluator_employee_nama} berhasil ditolak.`);
      setRejectTarget(null);
      setRejectionReason('');
      setRefreshTrigger(p => p + 1);
      if (onDataChanged) onDataChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Gagal menolak usulan penilai.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleConfirmReplace = () => {
    if (!replaceTarget || !selectedReplacementNip) return;

    setIsReplacing(true);
    setActionError(null);
    try {
      replacePeerEvaluator(
        replaceTarget.id,
        selectedReplacementNip,
        currentUser?.nip || 'ADMIN-SDM',
        currentUser?.nama || 'Admin SDM'
      );
      setActionSuccess('Penilai rekan kerja berhasil diganti.');
      setReplaceTarget(null);
      setSelectedReplacementNip('');
      setRefreshTrigger(p => p + 1);
      if (onDataChanged) onDataChanged();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Gagal mengganti penilai rekan kerja.');
    } finally {
      setIsReplacing(false);
    }
  };

  // Replacement candidates: active, not subject, PNS or PPPK
  const replacementCandidates = useMemo(() => {
    if (!replaceTarget) return [];
    return allEmployees.filter(emp => {
      if (emp.nip === replaceTarget.subject_employee_id) return false;
      if (emp.nip === replaceTarget.evaluator_employee_id) return false;
      if ((emp.status || '').toLowerCase().includes('nonaktif')) return false;
      if (replaceSearchQuery.trim()) {
        const q = replaceSearchQuery.toLowerCase();
        return emp.nama.toLowerCase().includes(q) || emp.nip.includes(q) || (emp.unitKerja || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [replaceTarget, allEmployees, replaceSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
              <i className="bi bi-shield-lock-fill"></i>
              Otoritas Admin SDM / Verifikasi Penilai
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Persetujuan Rekan Kerja Penilai (Peer Reviewers Approval)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Verifikasi usulan penilai rekan kerja dari pegawai PPPK. Pastikan penilai memiliki relasi kerja yang relevan dan tidak ada konflik kepentingan.
            </p>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <i className="bi bi-clock-history"></i>
              <span>Menunggu ({counts.pending})</span>
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterStatus === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <i className="bi bi-check2-circle"></i>
              <span>Disetujui ({counts.approved})</span>
            </button>
            <button
              onClick={() => setFilterStatus('REJECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterStatus === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <i className="bi bi-x-circle"></i>
              <span>Ditolak ({counts.rejected})</span>
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterStatus === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Semua ({counts.all})</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama subjek PPPK atau nama rekan kerja..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
          <div className="text-xs text-slate-500 shrink-0 font-medium">
            Menampilkan <span className="font-bold text-slate-800">{filteredList.length}</span> usulan penilai (Periode Semester {selectedSemester} Tahun {selectedYear})
          </div>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <i className="bi bi-check-circle-fill text-emerald-600 text-sm"></i>
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <i className="bi bi-exclamation-triangle-fill text-rose-600 text-sm"></i>
          <span>{actionError}</span>
        </div>
      )}

      {/* Proposals Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <i className="bi bi-inbox text-4xl block mb-2 text-slate-300"></i>
            <p className="text-sm font-semibold">Tidak ada data usulan rekan kerja penilai</p>
            <p className="text-xs mt-1">Gunakan filter status atau kata kunci yang berbeda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-black text-[10px] tracking-wider">
                  <th className="py-3 px-4">Pegawai yang Dinilai (PPPK)</th>
                  <th className="py-3 px-4">Rekan Kerja Diusulkan</th>
                  <th className="py-3 px-4">Status & Approval</th>
                  <th className="py-3 px-4">Status Penilaian</th>
                  <th className="py-3 px-4 text-right">Aksi Admin SDM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map(item => {
                  const isApproved = item.approval_status === 'APPROVED';
                  const isPending = item.approval_status === 'PENDING';
                  const isRejected = item.approval_status === 'REJECTED';
                  const isCompleted = item.assignment_status === 'COMPLETED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Subjek PPPK */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.subject_employee_nama}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">NIP: {item.subject_employee_id}</div>
                        <div className="text-[11px] text-slate-600 truncate max-w-xs">{item.subject_employee_unit || '-'}</div>
                      </td>

                      {/* Rekan Kerja Diusulkan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.evaluator_employee_nama}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                            item.evaluator_employee_status === 'PPPK'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.evaluator_employee_status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">NIP: {item.evaluator_employee_id}</div>
                        <div className="text-[11px] text-slate-600 truncate max-w-xs">{item.evaluator_employee_jabatan || '-'}</div>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3.5 px-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            <i className="bi bi-clock-history"></i> Menunggu Persetujuan
                          </span>
                        )}
                        {isApproved && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              <i className="bi bi-check-circle-fill"></i> Disetujui
                            </span>
                            {item.approved_by && (
                              <div className="text-[10px] text-slate-400 mt-0.5">oleh: {item.approved_by}</div>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                              <i className="bi bi-x-circle-fill"></i> Ditolak
                            </span>
                            {item.rejection_reason && (
                              <div className="text-[10px] text-rose-600 mt-0.5 max-w-xs italic">
                                Alasan: {item.rejection_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Assessment Status */}
                      <td className="py-3.5 px-4">
                        {isCompleted ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <i className="bi bi-check2"></i> Sudah Menilai
                            </span>
                            {item.score !== undefined && (
                              <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                                Nilai: {item.score.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                            <i className="bi bi-hourglass"></i> Belum Menilai
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <i className="bi bi-check-lg"></i> Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setRejectTarget(item);
                                  setRejectionReason('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 transition-colors"
                              >
                                <i className="bi bi-x-lg"></i> Tolak
                              </button>
                            </>
                          )}

                          {/* Tombol Ganti Penilai jika belum submit */}
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                setReplaceTarget(item);
                                setSelectedReplacementNip('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                              title="Ganti Penilai Rekan Kerja"
                            >
                              <i className="bi bi-arrow-left-right"></i> Ganti
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PENOLAKAN REKAN KERJA */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <i className="bi bi-x-circle-fill text-rose-300"></i>
                Tolak Usulan Rekan Kerja Penilai
              </h4>
              <button
                onClick={() => setRejectTarget(null)}
                className="text-slate-300 hover:text-white"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div>Subjek: <span className="font-bold text-slate-900">{rejectTarget.subject_employee_nama}</span></div>
                <div>Rekan Kerja: <span className="font-bold text-slate-900">{rejectTarget.evaluator_employee_nama}</span> ({rejectTarget.evaluator_employee_status})</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Alasan Penolakan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Contoh: Pegawai yang bersangkutan sedang cuti panjang / tidak berada dalam tim kerja terkait..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isRejecting ? 'Memproses...' : 'Tolak Usulan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GANTI PENILAI */}
      {replaceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <i className="bi bi-arrow-left-right text-indigo-400"></i>
                Ganti Rekan Kerja Penilai
              </h4>
              <button
                onClick={() => setReplaceTarget(null)}
                className="text-slate-300 hover:text-white"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs flex-1 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <div>Subjek: <span className="font-bold text-slate-900">{replaceTarget.subject_employee_nama}</span></div>
                <div>Penilai Saat Ini: <span className="font-bold text-slate-900">{replaceTarget.evaluator_employee_nama}</span> ({replaceTarget.evaluator_employee_status})</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Cari & Pilih Pegawai Pengganti (PNS atau PPPK)
                </label>
                <div className="relative mb-2">
                  <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    type="text"
                    value={replaceSearchQuery}
                    onChange={e => setReplaceSearchQuery(e.target.value)}
                    placeholder="Ketik nama atau NIP pengganti..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                  {replacementCandidates.slice(0, 20).map((cand, candIdx) => {
                    const isPPPK = (cand.jenisPegawai || cand.status || '').toUpperCase().includes('PPPK');
                    const isSelected = selectedReplacementNip === cand.nip;

                    return (
                      <div
                        key={`${cand.nip}-${candIdx}`}
                        onClick={() => setSelectedReplacementNip(cand.nip)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 font-bold text-indigo-900'
                            : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div>{cand.nama}</div>
                          <div className="text-[10px] text-slate-400">{cand.nip} - {cand.unitKerja}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                          isPPPK ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isPPPK ? 'PPPK' : 'PNS'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setReplaceTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReplace}
                disabled={isReplacing || !selectedReplacementNip}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white disabled:opacity-50 flex items-center gap-1.5"
              >
                {isReplacing ? 'Menyimpan...' : 'Ganti Penilai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
