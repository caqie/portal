import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  Pegawai,
  EvaluationPeriod,
  PPPKJenisPejabatPenilai
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  usulkanPejabatPenilai,
  verifikasiUsulanPejabatPenilai,
  tetapkanRekanKerjaGanda,
  getPenugasanPenilaiList,
  getMasterPeriods,
  updatePenugasanPenilai,
  deletePenugasanPenilai,
  resetRekanKerja
} from '../../../services/pppkPenilaianModuleService';
import { getAllEmployees } from '../../../services/pppkEvaluationService';

interface PPPKPenetapanPenilaiTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  allPegawai?: Pegawai[];
  allEmployees?: Pegawai[];
  selectedAssignmentId?: string;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  onNavigateToNext?: (penugasanId?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PPPKPenetapanPenilaiTab: React.FC<PPPKPenetapanPenilaiTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  allPegawai,
  allEmployees,
  selectedAssignmentId,
  onRefreshData,
  onRefreshAll,
  onNavigateToNext,
  showToast
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const safeRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
  };

  const effectiveAllPegawai = useMemo(() => {
    if (allPegawai && Array.isArray(allPegawai) && allPegawai.length > 0) return allPegawai;
    if (allEmployees && Array.isArray(allEmployees) && allEmployees.length > 0) return allEmployees;
    return getAllEmployees() || [];
  }, [allPegawai, allEmployees]);

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

  // Filtered assignments for period
  const periodAssignments = useMemo(() => {
    const list = effectiveAssignments || [];
    if (!effectivePeriod) return list;
    const filtered = list.filter(a => a && a.periodeId === effectivePeriod.id);
    return filtered.length > 0 ? filtered : list;
  }, [effectiveAssignments, effectivePeriod]);

  // Target assignment selection for Pejabat Penilai or Admin
  const [activeAssignId, setActiveAssignId] = useState<string>(
    selectedAssignmentId || (periodAssignments[0]?.id ?? '')
  );

  // Active targeted assignment
  const activeAssignment = useMemo(() => {
    const list = periodAssignments || [];
    if (activeRole === 'PPPK_DINILAI' && activePegawai) {
      const myAssign = list.find(a => a && a.pppkDinilaiId === activePegawai.nip);
      if (myAssign) return myAssign;
    }
    return list.find(a => a && a.id === activeAssignId) || list[0];
  }, [periodAssignments, activeAssignId, activeRole, activePegawai]);

  // PPPK Form State for Usulkan Pejabat Penilai
  const [jenisPejabat, setJenisPejabat] = useState<PPPKJenisPejabatPenilai>('KETUA_TIM_KERJA');
  const [selectedPejabatNip, setSelectedPejabatNip] = useState<string>('');

  // Admin Verification Modal/State
  const [rejectReason, setRejectReason] = useState<string>('');
  const [verifModalOpen, setVerifModalOpen] = useState<boolean>(false);
  const [verifTarget, setVerifTarget] = useState<PPPKPenugasanPenilai | null>(null);

  // Edit Assignment Modal/State (for Admin & Pejabat Penilai)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<PPPKPenugasanPenilai | null>(null);
  const [editJenisPejabat, setEditJenisPejabat] = useState<PPPKJenisPejabatPenilai>('KETUA_TIM_KERJA');
  const [editPejabatNip, setEditPejabatNip] = useState<string>('');
  const [editPnsNip, setEditPnsNip] = useState<string>('');
  const [editPppkNip, setEditPppkNip] = useState<string>('');
  const [editAtasanNip, setEditAtasanNip] = useState<string>('');
  const [editStatus, setEditStatus] = useState<PPPKPenugasanPenilai['status']>('DISETUJUI');

  // Delete / Reset Confirmation Modal/State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<PPPKPenugasanPenilai | null>(null);
  const [deleteActionType, setDeleteActionType] = useState<'DELETE_ASSIGNMENT' | 'RESET_PEERS'>('DELETE_ASSIGNMENT');

  // Pejabat Penilai Penetapan Rekan State
  const [selectedPnsNip, setSelectedPnsNip] = useState<string>('');
  const [selectedPppkNip, setSelectedPppkNip] = useState<string>('');
  const [selectedAtasanNip, setSelectedAtasanNip] = useState<string>('');

  // Categorized employee lists
  const pnsList = useMemo(() => {
    return (effectiveAllPegawai || []).filter(p => !(p.jenisPegawai || p.status || '').toUpperCase().includes('PPPK'));
  }, [effectiveAllPegawai]);

  const pppkList = useMemo(() => {
    return (effectiveAllPegawai || []).filter(p => (p.jenisPegawai || p.status || '').toUpperCase().includes('PPPK'));
  }, [effectiveAllPegawai]);

  // Handle PPPK Submitting Proposal
  const handleUsulkan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePegawai || !effectivePeriod) return;

    if (!selectedPejabatNip) {
      safeShowToast('Pilih nama pejabat penilai dari database pegawai terlebih dahulu.', 'error');
      return;
    }

    const pejabatPegawai = effectiveAllPegawai.find(p => p.nip === selectedPejabatNip);
    if (!pejabatPegawai) {
      safeShowToast('Data pejabat penilai tidak ditemukan.', 'error');
      return;
    }

    try {
      usulkanPejabatPenilai(
        effectivePeriod.id,
        effectivePeriod.year,
        effectivePeriod.semester,
        activePegawai,
        jenisPejabat,
        pejabatPegawai,
        activePegawai.nip,
        activePegawai.nama
      );
      safeRefresh();
      safeShowToast('Usulan Pejabat Penilai berhasil dikirim ke Admin SDM untuk diverifikasi.', 'success');
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal mengajukan usulan pejabat penilai.', 'error');
    }
  };

  // Handle Admin Approval / Rejection
  const handleAdminApprove = (target: PPPKPenugasanPenilai) => {
    try {
      verifikasiUsulanPejabatPenilai(
        target.id,
        true,
        'Disetujui oleh Admin SDM sesuai struktur organisasi dan SK penugasan.',
        activePegawai?.nip || 'admin',
        activePegawai?.nama || 'Admin SDM'
      );
      safeRefresh();
      safeShowToast(`Usulan Pejabat Penilai untuk ${target.pppkNama} berhasil disetujui.`, 'success');
    } catch (err: any) {
      safeShowToast(err.message, 'error');
    }
  };

  const handleAdminReject = () => {
    if (!verifTarget) return;
    if (!rejectReason || rejectReason.trim().length < 5) {
      safeShowToast('Wajib memberikan alasan penolakan minimal 5 karakter.', 'error');
      return;
    }

    try {
      verifikasiUsulanPejabatPenilai(
        verifTarget.id,
        false,
        rejectReason,
        activePegawai?.nip || 'admin',
        activePegawai?.nama || 'Admin SDM'
      );
      setVerifModalOpen(false);
      setRejectReason('');
      setVerifTarget(null);
      safeRefresh();
      safeShowToast('Usulan berhasil ditolak dan status dikembalikan ke PPPK.', 'info');
    } catch (err: any) {
      safeShowToast(err.message, 'error');
    }
  };

  // Handle Pejabat Penilai Submitting Peers
  const handleSimpanRekan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;

    if (!selectedPnsNip) {
      safeShowToast('Pilih Rekan Kerja PNS (Bobot 20%) terlebih dahulu.', 'error');
      return;
    }
    if (!selectedPppkNip) {
      safeShowToast('Pilih Rekan Kerja PPPK (Bobot 20%) terlebih dahulu.', 'error');
      return;
    }

    const rekanPns = effectiveAllPegawai.find(p => p.nip === selectedPnsNip);
    const rekanPppk = effectiveAllPegawai.find(p => p.nip === selectedPppkNip);
    const atasanPejabat = effectiveAllPegawai.find(p => p.nip === selectedAtasanNip);

    if (!rekanPns || !rekanPppk) {
      safeShowToast('Data rekan kerja tidak valid.', 'error');
      return;
    }

    try {
      tetapkanRekanKerjaGanda(
        activeAssignment.id,
        rekanPns,
        rekanPppk,
        atasanPejabat,
        activePegawai?.nip || 'pejabat',
        activePegawai?.nama || 'Pejabat Penilai'
      );
      safeRefresh();
      safeShowToast('Penetapan 1 Rekan PNS + 1 Rekan PPPK berhasil! Tugas penilaian otomatis dibuat.', 'success');
      if (onNavigateToNext) {
        onNavigateToNext(activeAssignment.id);
      }
    } catch (err: any) {
      safeShowToast(err.message, 'error');
    }
  };

  // Open Edit Modal (Admin & Pejabat Penilai)
  const handleOpenEdit = (a: PPPKPenugasanPenilai) => {
    setEditTarget(a);
    setEditJenisPejabat(a.jenisPejabatPenilai || 'KETUA_TIM_KERJA');
    setEditPejabatNip(a.pejabatPenilaiId || '');
    setEditPnsNip(a.rekanPnsId || '');
    setEditPppkNip(a.rekanPppkId || '');
    setEditAtasanNip(a.atasanPejabatPenilaiId || '');
    setEditStatus(a.status);
    setEditModalOpen(true);
  };

  // Save Edit Assignment
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      const updates: Partial<PPPKPenugasanPenilai> = {};

      if (activeRole === 'ADMIN') {
        if (editPejabatNip) {
          const pej = effectiveAllPegawai.find(p => p.nip === editPejabatNip);
          if (pej) {
            updates.pejabatPenilaiId = pej.nip;
            updates.pejabatPenilaiNama = pej.nama;
            updates.pejabatPenilaiNip = pej.nip;
            updates.pejabatPenilaiJabatan = pej.jabatan;
            updates.pejabatPenilaiUnit = pej.unitKerja;
            updates.pejabatPenilaiPangkat = pej.pangkat || 'Pembina (IV/a)';
            updates.jenisPejabatPenilai = editJenisPejabat;
          }
        }
        updates.status = editStatus;
      }

      // Rekan PNS
      if (editPnsNip) {
        const pns = effectiveAllPegawai.find(p => p.nip === editPnsNip);
        if (pns) {
          updates.rekanPnsId = pns.nip;
          updates.rekanPnsNama = pns.nama;
          updates.rekanPnsNip = pns.nip;
          updates.rekanPnsJabatan = pns.jabatan;
          updates.rekanPnsUnit = pns.unitKerja;
        }
      } else if (activeRole === 'ADMIN') {
        updates.rekanPnsId = undefined;
        updates.rekanPnsNama = undefined;
        updates.rekanPnsNip = undefined;
        updates.rekanPnsJabatan = undefined;
        updates.rekanPnsUnit = undefined;
      }

      // Rekan PPPK
      if (editPppkNip) {
        const pppk = effectiveAllPegawai.find(p => p.nip === editPppkNip);
        if (pppk) {
          updates.rekanPppkId = pppk.nip;
          updates.rekanPppkNama = pppk.nama;
          updates.rekanPppkNip = pppk.nip;
          updates.rekanPppkJabatan = pppk.jabatan;
          updates.rekanPppkUnit = pppk.unitKerja;
        }
      } else if (activeRole === 'ADMIN') {
        updates.rekanPppkId = undefined;
        updates.rekanPppkNama = undefined;
        updates.rekanPppkNip = undefined;
        updates.rekanPppkJabatan = undefined;
        updates.rekanPppkUnit = undefined;
      }

      // Atasan Pejabat
      if (editAtasanNip) {
        const atasan = effectiveAllPegawai.find(p => p.nip === editAtasanNip);
        if (atasan) {
          updates.atasanPejabatPenilaiId = atasan.nip;
          updates.atasanPejabatPenilaiNama = atasan.nama;
          updates.atasanPejabatPenilaiNip = atasan.nip;
          updates.atasanPejabatPenilaiJabatan = atasan.jabatan;
          updates.atasanPejabatPenilaiPangkat = atasan.pangkat;
          updates.atasanPejabatPenilaiUnit = atasan.unitKerja;
        }
      }

      // Auto update status to DALAM_PENILAIAN if both peers filled and not final
      if (updates.rekanPnsId && updates.rekanPppkId && editTarget.status !== 'FINAL' && updates.status !== 'FINAL') {
        updates.status = 'DALAM_PENILAIAN';
      }

      updatePenugasanPenilai(
        editTarget.id,
        updates,
        activePegawai?.nip || 'user',
        activePegawai?.nama || 'User'
      );

      setEditModalOpen(false);
      setEditTarget(null);
      safeRefresh();
      safeShowToast(`Penetapan penilai untuk ${editTarget.pppkNama} berhasil diperbarui.`, 'success');
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal memperbarui penugasan penilai.', 'error');
    }
  };

  // Open Delete / Reset Modal
  const handleOpenDelete = (a: PPPKPenugasanPenilai, type: 'DELETE_ASSIGNMENT' | 'RESET_PEERS') => {
    setDeleteTarget(a);
    setDeleteActionType(type);
    setDeleteModalOpen(true);
  };

  // Confirm Delete / Reset
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    try {
      if (deleteActionType === 'DELETE_ASSIGNMENT') {
        deletePenugasanPenilai(
          deleteTarget.id,
          activePegawai?.nip || 'admin',
          activePegawai?.nama || 'Admin SDM'
        );
        safeShowToast(`Penugasan penilai untuk ${deleteTarget.pppkNama} berhasil dihapus dari sistem.`, 'info');
      } else {
        resetRekanKerja(
          deleteTarget.id,
          activePegawai?.nip || 'pejabat',
          activePegawai?.nama || 'Pejabat Penilai'
        );
        safeShowToast(`Penetapan rekan kerja untuk ${deleteTarget.pppkNama} berhasil direset/dikosongkan.`, 'info');
      }

      setDeleteModalOpen(false);
      setDeleteTarget(null);
      safeRefresh();
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal memproses aksi.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Info Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
              Submenu 2
            </span>
            <span className="text-xs text-slate-500 font-bold">Workflow Penetapan Penilai 360°</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Penetapan Pejabat Penilai & Rekan Kerja
          </h3>
          <p className="text-xs text-slate-600">
            Setiap PPPK dinilai oleh 1 Pejabat Penilai (60%) + 1 Rekan PNS (20%) + 1 Rekan PPPK (20%).
          </p>
        </div>

        {/* Selected Assignment Selector if Admin / Pejabat */}
        {(activeRole === 'ADMIN' || activeRole === 'PEJABAT_PENILAI') && periodAssignments.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">Pilih Subjek PPPK:</span>
            <select
              value={activeAssignment?.id || ''}
              onChange={(e) => {
                setActiveAssignId(e.target.value);
                const a = periodAssignments.find(x => x.id === e.target.value);
                if (a) {
                  setSelectedPnsNip(a.rekanPnsId || '');
                  setSelectedPppkNip(a.rekanPppkId || '');
                  setSelectedAtasanNip(a.atasanPejabatPenilaiId || '');
                }
              }}
              className="px-3 py-1 bg-white rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {periodAssignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.pppkNama} ({a.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* SECTION 1: PPPK PERSPECTIVE (USULKAN PEJABAT PENILAI) */}
      {(activeRole === 'PPPK_DINILAI' || activeRole === 'ADMIN') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h4 className="text-sm font-black text-slate-800">
                Formulir Pengusulan Pejabat Penilai Kinerja (oleh PPPK)
              </h4>
            </div>
            <span className="text-xs text-slate-500">Objek: {activePegawai?.nama || 'Christia Sari'}</span>
          </div>

          <form onSubmit={handleUsulkan} className="p-6 space-y-5">
            
            {/* Radio: Jenis Pejabat Penilai */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Jenis Pejabat Penilai Kinerja:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                
                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  jenisPejabat === 'KETUA_TIM_KERJA'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="jenisPejabat"
                    checked={jenisPejabat === 'KETUA_TIM_KERJA'}
                    onChange={() => setJenisPejabat('KETUA_TIM_KERJA')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-black">Ketua Tim Kerja</div>
                    <div className="text-[11px] text-slate-500">Pimpinan tim fungsional operasional</div>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  jenisPejabat === 'PEJABAT_MANAJERIAL'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="jenisPejabat"
                    checked={jenisPejabat === 'PEJABAT_MANAJERIAL'}
                    onChange={() => setJenisPejabat('PEJABAT_MANAJERIAL')}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-black">Pejabat Manajerial / Struktural</div>
                    <div className="text-[11px] text-slate-500">Koordinator / Direktur / Atasan Langsung</div>
                  </div>
                </label>

              </div>
            </div>

            {/* Select Pejabat from Pegawai Database */}
            <div className="space-y-2 max-w-2xl">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Pilih Pejabat Penilai dari Database Kepegawaian:
              </label>
              <select
                value={selectedPejabatNip}
                onChange={(e) => setSelectedPejabatNip(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Pilih Pejabat Penilai --</option>
                {pnsList.map(p => (
                  <option key={p.nip} value={p.nip}>
                    {p.nama} | NIP: {p.nip} | {p.jabatan}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Pejabat penilai yang dipilih akan menilai Rencana Hasil Kerja (RHK) serta mengisi 28 butir perilaku.
              </p>
            </div>

            {/* Preview Selected Pejabat Info */}
            {selectedPejabatNip && (
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 max-w-2xl text-xs space-y-1">
                {(() => {
                  const target = effectiveAllPegawai.find(p => p.nip === selectedPejabatNip);
                  return (
                    <>
                      <div className="font-black text-indigo-900">{target?.nama}</div>
                      <div className="text-slate-600 font-mono">NIP: {target?.nip}</div>
                      <div className="text-slate-600">Jabatan: {target?.jabatan}</div>
                      <div className="text-slate-600">Unit: {target?.unitKerja}</div>
                    </>
                  );
                })()}
              </div>
            )}

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-900/20 flex items-center gap-2"
            >
              <i className="bi bi-send-fill"></i>
              Kirim Usulan Pejabat Penilai
            </button>

          </form>
        </div>
      )}

      {/* SECTION 2: ADMIN & PEJABAT PENILAI MANAGEMENT TABLE */}
      {(activeRole === 'ADMIN' || activeRole === 'PEJABAT_PENILAI') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="text-sm font-black text-slate-800">
                {activeRole === 'ADMIN'
                  ? 'Daftar & Pengelolaan Penetapan Penilai 360° (Kewenangan Admin SDM)'
                  : 'Daftar PPPK Terbimbing & Penetapan Rekan Kerja (Kewenangan Pejabat Penilai)'}
              </h4>
            </div>
            <span className="text-xs text-slate-500 font-bold">
              {activeRole === 'ADMIN'
                ? 'Admin memiliki akses penuh untuk Edit (ubah pejabat, rekan, atasan, status) & Hapus penugasan'
                : 'Pejabat Penilai dapat mengedit rekan kerja/atasan atau mereset penetapan rekan'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4">PPPK Pengusul</th>
                  <th className="py-3 px-4">Pejabat Penilai</th>
                  <th className="py-3 px-4">Rekan Penilai (PNS & PPPK)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periodAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">Tidak ada usulan atau penugasan pada periode ini.</td>
                  </tr>
                ) : (
                  periodAssignments.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{a.pppkNama}</div>
                        <div className="text-slate-500 font-mono text-[11px]">NIP: {a.pppkNip}</div>
                        <div className="text-[11px] text-slate-600">{a.pppkJabatan}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-indigo-900">{a.pejabatPenilaiNama}</div>
                        <div className="text-slate-500 text-[11px]">{a.pejabatPenilaiJabatan}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {a.jenisPejabatPenilai === 'KETUA_TIM_KERJA' ? 'Ketua Tim Kerja' : 'Pejabat Manajerial'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {a.rekanPnsNama || a.rekanPppkNama ? (
                          <div className="space-y-1">
                            {a.rekanPnsNama && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[9px]">PNS</span>
                                <span className="font-semibold text-slate-800">{a.rekanPnsNama}</span>
                              </div>
                            )}
                            {a.rekanPppkNama && (
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px]">PPPK</span>
                                <span className="font-semibold text-slate-800">{a.rekanPppkNama}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            Belum Ditetapkan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                          a.status === 'DISETUJUI' || a.status === 'DALAM_PENILAIAN' || a.status === 'FINAL'
                            ? 'bg-emerald-100 text-emerald-800'
                            : a.status === 'MENUNGGU_VERIFIKASI'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Admin Approve / Reject if waiting verification */}
                          {activeRole === 'ADMIN' && a.status === 'MENUNGGU_VERIFIKASI' && (
                            <>
                              <button
                                onClick={() => handleAdminApprove(a)}
                                title="Setujui Usulan"
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 shadow-sm transition-all"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => {
                                  setVerifTarget(a);
                                  setVerifModalOpen(true);
                                }}
                                title="Tolak Usulan"
                                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 shadow-sm transition-all"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {/* Edit Button for Admin & Pejabat Penilai */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(a)}
                            title={activeRole === 'ADMIN' ? 'Edit Seluruh Penugasan' : 'Edit Rekan Kerja Penilai'}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-xs border border-indigo-200 flex items-center gap-1 transition-all"
                          >
                            <i className="bi bi-pencil-square"></i>
                            <span>Edit</span>
                          </button>

                          {/* Delete / Reset Button */}
                          {activeRole === 'ADMIN' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(a, 'DELETE_ASSIGNMENT')}
                              title="Hapus Penugasan Penilai dari Sistem"
                              className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-xs border border-rose-200 flex items-center gap-1 transition-all"
                            >
                              <i className="bi bi-trash3"></i>
                              <span>Hapus</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(a, 'RESET_PEERS')}
                              disabled={!a.rekanPnsId && !a.rekanPppkId}
                              title={a.rekanPnsId || a.rekanPppkId ? 'Reset / Kosongkan Rekan Penilai' : 'Rekan belum dipilih'}
                              className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-amber-50 rounded-lg font-bold text-xs border border-amber-200 flex items-center gap-1 transition-all"
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                              <span>Reset Rekan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: PEJABAT PENILAI ASSIGNING 1 REKAN PNS + 1 REKAN PPPK */}
      {(activeRole === 'PEJABAT_PENILAI' || activeRole === 'ADMIN') && activeAssignment && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h4 className="text-sm font-black text-slate-800">
                Penetapan Rekan Kerja (1 Rekan PNS + 1 Rekan PPPK) oleh Pejabat Penilai
              </h4>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Subjek: {activeAssignment.pppkNama}
            </span>
          </div>

          <form onSubmit={handleSimpanRekan} className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Rekan Kerja PNS (Bobot 20%) */}
              <div className="bg-teal-50/40 p-5 rounded-2xl border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="bi bi-person-badge-fill text-teal-600"></i>
                    1. Rekan Kerja PNS (Bobot 20%)
                  </h5>
                  <span className="text-[10px] font-bold bg-teal-200/60 text-teal-800 px-2 py-0.5 rounded">
                    Wajib PNS
                  </span>
                </div>

                <select
                  value={selectedPnsNip || activeAssignment.rekanPnsId || ''}
                  onChange={(e) => setSelectedPnsNip(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-teal-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Pilih Rekan Kerja PNS --</option>
                  {pnsList
                    .filter(p => p.nip !== activeAssignment.pppkDinilaiId)
                    .map(p => (
                      <option key={p.nip} value={p.nip}>
                        {p.nama} ({p.jabatan})
                      </option>
                    ))}
                </select>

                <p className="text-[11px] text-teal-700/80">
                  Rekan kerja PNS yang ditunjuk akan mengisi kuesioner 28 pertanyaan perilaku secara independen.
                </p>
              </div>

              {/* Rekan Kerja PPPK (Bobot 20%) */}
              <div className="bg-purple-50/40 p-5 rounded-2xl border border-purple-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="bi bi-people-fill text-purple-600"></i>
                    2. Rekan Kerja PPPK (Bobot 20%)
                  </h5>
                  <span className="text-[10px] font-bold bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded">
                    Wajib PPPK
                  </span>
                </div>

                <select
                  value={selectedPppkNip || activeAssignment.rekanPppkId || ''}
                  onChange={(e) => setSelectedPppkNip(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-purple-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Pilih Rekan Kerja PPPK --</option>
                  {pppkList
                    .filter(p => p.nip !== activeAssignment.pppkDinilaiId)
                    .map(p => (
                      <option key={p.nip} value={p.nip}>
                        {p.nama} ({p.jabatan})
                      </option>
                    ))}
                </select>

                <p className="text-[11px] text-purple-700/80">
                  Rekan kerja PPPK tidak boleh merupakan pegawai yang sedang dinilai (harus rekan sejawat lain).
                </p>
              </div>

            </div>

            {/* Atasan Pejabat Penilai Kinerja */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 max-w-2xl">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Atasan Pejabat Penilai Kinerja (Mengetahui Dokumen Evaluasi):
              </label>
              <select
                value={selectedAtasanNip || activeAssignment.atasanPejabatPenilaiId || ''}
                onChange={(e) => setSelectedAtasanNip(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Pilih Atasan Pejabat Penilai --</option>
                {pnsList.map(p => (
                  <option key={p.nip} value={p.nip}>
                    {p.nama} | {p.pangkat || 'Pembina'} | {p.jabatan}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-purple-700 text-white font-black text-xs hover:bg-purple-800 transition-all shadow-md shadow-purple-900/20 flex items-center gap-2"
              >
                <i className="bi bi-check2-all"></i>
                Simpan & Tetapkan Rekan Kerja Penilai
              </button>

              <div className="flex items-center gap-2">
                {(activeAssignment.rekanPnsId || activeAssignment.rekanPppkId) && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(activeAssignment, 'RESET_PEERS')}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center gap-1.5 transition-all"
                  >
                    <i className="bi bi-arrow-counterclockwise"></i>
                    Reset Rekan
                  </button>
                )}
                {activeRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(activeAssignment, 'DELETE_ASSIGNMENT')}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-all"
                  >
                    <i className="bi bi-trash3"></i>
                    Hapus Penugasan
                  </button>
                )}
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Rejection Modal */}
      {verifModalOpen && verifTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <i className="bi bi-x-circle-fill text-rose-500"></i>
              Tolak Usulan Pejabat Penilai
            </h4>
            <p className="text-xs text-slate-600">
              Pengusul: <strong>{verifTarget.pppkNama}</strong>
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Alasan Penolakan (Wajib Diisi):</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Pejabat yang diusulkan bukan ketua tim yang menaungi substansi tugas PPPK bersangkutan."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              ></textarea>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAdminReject}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700"
              >
                Konfirmasi Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal (Admin SDM & Pejabat Penilai) */}
      {editModalOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                <i className="bi bi-pencil-square text-indigo-600"></i>
                Edit Penetapan Penilai (360°)
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeRole === 'ADMIN' ? 'Admin Full Access' : 'Pejabat Penilai'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800">
                Pegawai PPPK: <span className="text-indigo-700">{editTarget.pppkNama}</span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">NIP: {editTarget.pppkNip}</div>
              <div className="text-slate-600 text-[11px]">{editTarget.pppkJabatan} - {editTarget.pppkUnitKerja || 'DJKI'}</div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              
              {/* Admin-only: Pejabat Penilai, Jenis Jabatan, Status */}
              {activeRole === 'ADMIN' && (
                <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
                  <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                    <i className="bi bi-shield-check text-indigo-600"></i>
                    Kewenangan Pejabat Penilai (Admin SDM)
                  </div>
                  
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Pejabat Penilai:</label>
                    <select
                      value={editPejabatNip}
                      onChange={(e) => setEditPejabatNip(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      {effectiveAllPegawai.map(p => (
                        <option key={p.nip} value={p.nip}>
                          {p.nama} ({p.nip}) - {p.jabatan}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Jenis Jabatan Penilai:</label>
                      <select
                        value={editJenisPejabat}
                        onChange={(e) => setEditJenisPejabat(e.target.value as PPPKJenisPejabatPenilai)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="KETUA_TIM_KERJA">Ketua Tim Kerja</option>
                        <option value="PEJABAT_MANAJERIAL">Pejabat Manajerial</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Status Penugasan:</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as PPPKPenugasanPenilai['status'])}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-black text-indigo-800 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="MENUNGGU_VERIFIKASI">MENUNGGU_VERIFIKASI</option>
                        <option value="DISETUJUI">DISETUJUI</option>
                        <option value="DALAM_PENILAIAN">DALAM_PENILAIAN</option>
                        <option value="DITOLAK">DITOLAK</option>
                        <option value="FINAL">FINAL</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Rekan PNS & PPPK (Admin SDM & Pejabat Penilai) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-blue-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    Rekan Kerja PNS (Bobot 20%):
                  </label>
                  <select
                    value={editPnsNip}
                    onChange={(e) => setEditPnsNip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Belum Ditetapkan / Kosongkan --</option>
                    {pnsList.map(p => (
                      <option key={p.nip} value={p.nip}>
                        {p.nama} ({p.nip}) - {p.jabatan}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Rekan Kerja PPPK (Bobot 20%):
                  </label>
                  <select
                    value={editPppkNip}
                    onChange={(e) => setEditPppkNip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Belum Ditetapkan / Kosongkan --</option>
                    {pppkList.map(p => (
                      <option key={p.nip} value={p.nip}>
                        {p.nama} ({p.nip}) - {p.jabatan}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Atasan Pejabat Penilai */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Atasan Pejabat Penilai (Mengetahui Dokumen):</label>
                <select
                  value={editAtasanNip}
                  onChange={(e) => setEditAtasanNip(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Belum Ditentukan / Sesuai Default --</option>
                  {effectiveAllPegawai.map(p => (
                    <option key={p.nip} value={p.nip}>
                      {p.nama} ({p.nip}) - {p.jabatan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 text-xs shadow-md shadow-indigo-900/20"
                >
                  Simpan Perubahan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete / Reset Confirmation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                deleteActionType === 'DELETE_ASSIGNMENT' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
              }`}>
                <i className={`bi ${deleteActionType === 'DELETE_ASSIGNMENT' ? 'bi-trash3-fill text-lg' : 'bi-arrow-counterclockwise text-lg'}`}></i>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {deleteActionType === 'DELETE_ASSIGNMENT'
                    ? 'Hapus Penugasan Penilai'
                    : 'Reset Rekan Kerja Penilai'}
                </h4>
                <p className="text-[11px] text-slate-500">Konfirmasi Aksi Manajemen</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-700 border border-slate-200">
              <div>Pegawai: <strong>{deleteTarget.pppkNama}</strong></div>
              <div className="text-[11px] font-mono text-slate-500">NIP: {deleteTarget.pppkNip}</div>
              {deleteActionType === 'RESET_PEERS' && (
                <div className="text-[11px] text-amber-800 font-semibold pt-1">
                  Rekan saat ini: PNS ({deleteTarget.rekanPnsNama || '-'}), PPPK ({deleteTarget.rekanPppkNama || '-'})
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteActionType === 'DELETE_ASSIGNMENT'
                ? 'Apakah Anda yakin ingin menghapus penugasan penilai ini? Seluruh data tugas penilaian dan kuesioner terkait pada periode ini akan dihapus permanen dari sistem.'
                : 'Apakah Anda yakin ingin mereset penunjukan Rekan PNS & Rekan PPPK untuk pegawai ini? Data rekan kerja akan dikosongkan dan status kembali menjadi DISETUJUI sehingga dapat dipilih ulang.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-md ${
                  deleteActionType === 'DELETE_ASSIGNMENT'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                }`}
              >
                {deleteActionType === 'DELETE_ASSIGNMENT' ? 'Ya, Hapus Permanen' : 'Ya, Reset Rekan'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
