import React, { useState, useMemo } from 'react';
import { Pegawai, EvaluationAssignment } from '../../types';
import {
  getAllEmployees,
  getPPPKSettings,
  proposePeerEvaluators
} from '../../services/pppkEvaluationService';
import { getAtasanLangsung } from '../../services/strukturOrganisasiService';

interface PPPKPeerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectEmployee: Pegawai | null;
  periodId: string;
  onSuccess: (newAssignments: EvaluationAssignment[]) => void;
  currentUser?: { nip?: string; nama?: string; role?: string };
}

export const PPPKPeerSelectionModal: React.FC<PPPKPeerSelectionModalProps> = ({
  isOpen,
  onClose,
  subjectEmployee,
  periodId,
  onSuccess,
  currentUser
}) => {
  const settings = useMemo(() => getPPPKSettings(), []);
  const allEmployees = useMemo(() => getAllEmployees(), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PNS' | 'PPPK'>('ALL');
  const [unitFilter, setUnitFilter] = useState<string>('ALL');
  const [selectedNips, setSelectedNips] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const minPeers = settings.peerEvaluatorMin || 2;
  const maxPeers = settings.peerEvaluatorMax || 4;

  // Dapatkan Atasan Langsung subjek untuk mencegah dipilih
  const atasanInfo = useMemo(() => {
    if (!subjectEmployee) return { atasan: null };
    return getAtasanLangsung(subjectEmployee, allEmployees);
  }, [subjectEmployee, allEmployees]);

  const atasanNip = atasanInfo.atasan?.nip;

  // Daftar Unit Kerja untuk filter dropdown
  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    allEmployees.forEach(e => {
      if (e.unitKerja) units.add(e.unitKerja);
    });
    return Array.from(units).sort();
  }, [allEmployees]);

  // Filter kandidat rekan kerja yang sah
  const eligiblePeers = useMemo(() => {
    if (!subjectEmployee) return [];

    return allEmployees.filter(emp => {
      // 1. Bukan dirinya sendiri
      if (emp.nip === subjectEmployee.nip) return false;

      // 2. Bukan atasan langsung
      if (atasanNip && emp.nip === atasanNip) return false;

      // 3. Pegawai harus aktif (tidak nonaktif)
      const empStatus = (emp.status || '').toLowerCase();
      if (empStatus.includes('nonaktif') || empStatus.includes('keluar') || empStatus.includes('pensiun')) {
        return false;
      }

      // 4. Status kepegawaian (PNS atau PPPK)
      const isPPPK = (emp.jenisPegawai || emp.status || '').toUpperCase().includes('PPPK');
      const pStatus: 'PNS' | 'PPPK' = isPPPK ? 'PPPK' : 'PNS';
      if (statusFilter !== 'ALL' && pStatus !== statusFilter) return false;

      // 5. Unit kerja filter
      if (unitFilter !== 'ALL' && emp.unitKerja !== unitFilter) return false;

      // 6. Search query (nama, NIP, jabatan, unit)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (emp.nama || '').toLowerCase().includes(q);
        const matchNip = (emp.nip || '').toLowerCase().includes(q);
        const matchJabatan = (emp.jabatan || '').toLowerCase().includes(q);
        const matchUnit = (emp.unitKerja || '').toLowerCase().includes(q);
        if (!matchNama && !matchNip && !matchJabatan && !matchUnit) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritaskan rekan satu unit kerja di posisi teratas
      const aSameUnit = a.unitKerja === subjectEmployee.unitKerja ? 1 : 0;
      const bSameUnit = b.unitKerja === subjectEmployee.unitKerja ? 1 : 0;
      if (aSameUnit !== bSameUnit) return bSameUnit - aSameUnit;
      return a.nama.localeCompare(b.nama);
    });
  }, [subjectEmployee, allEmployees, atasanNip, statusFilter, unitFilter, searchQuery]);

  const handleToggleSelect = (nip: string) => {
    setErrorMessage(null);
    if (selectedNips.includes(nip)) {
      setSelectedNips(prev => prev.filter(n => n !== nip));
    } else {
      if (selectedNips.length >= maxPeers) {
        setErrorMessage(`Maksimal ${maxPeers} rekan kerja penilai yang dapat dipilih.`);
        return;
      }
      setSelectedNips(prev => [...prev, nip]);
    }
  };

  const handleSubmit = async () => {
    if (!subjectEmployee) return;
    setErrorMessage(null);

    if (selectedNips.length < minPeers) {
      setErrorMessage(`Silakan pilih minimal ${minPeers} rekan kerja penilai (saat ini dipilih: ${selectedNips.length}).`);
      return;
    }

    if (selectedNips.length > maxPeers) {
      setErrorMessage(`Maksimal ${maxPeers} rekan kerja penilai yang dapat dipilih.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = proposePeerEvaluators(
        subjectEmployee.nip,
        periodId,
        selectedNips,
        currentUser?.nip || 'PPPK-USER',
        currentUser?.nama || subjectEmployee.nama
      );
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengajukan rekan kerja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !subjectEmployee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <i className="bi bi-person-plus-fill text-lg"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Pilih Rekan Kerja Penilai (Peer Reviewers)
              </h3>
              <p className="text-xs text-slate-300">
                Pegawai yang Dinilai: <span className="font-semibold text-indigo-300">{subjectEmployee.nama}</span> ({subjectEmployee.nip})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Guidance Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/70 px-6 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <i className="bi bi-info-circle-fill text-amber-600 text-sm mt-0.5 shrink-0"></i>
          <div>
            <p className="font-semibold">
              Anda dapat mengusulkan rekan kerja yang mengetahui pelaksanaan pekerjaan Anda selama periode evaluasi.
            </p>
            <p className="text-amber-800 mt-0.5">
              Kriteria: Satu unit/lingkungan kerja, berstatus aktif, bukan diri sendiri, bukan atasan langsung. <span className="font-bold underline">PNS dan PPPK diperbolehkan menjadi penilai.</span> Usulan akan diteruskan ke Admin SDM untuk diverifikasi.
            </p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-1">
              <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, jabatan..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Status PNS / PPPK Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
              >
                <option value="ALL">Semua Status (PNS & PPPK)</option>
                <option value="PNS">Hanya PNS</option>
                <option value="PPPK">Hanya PPPK</option>
              </select>
            </div>

            {/* Unit Kerja Filter */}
            <div>
              <select
                value={unitFilter}
                onChange={e => setUnitFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
              >
                <option value="ALL">Semua Unit Kerja</option>
                {uniqueUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selection Counter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Jumlah Dipilih:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                selectedNips.length >= minPeers && selectedNips.length <= maxPeers
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {selectedNips.length} / {maxPeers} (Min: {minPeers})
              </span>
              {selectedNips.length < minPeers && (
                <span className="text-[11px] text-amber-600 italic">
                  *Pilih minimal {minPeers - selectedNips.length} pegawai lagi
                </span>
              )}
            </div>

            {atasanInfo.atasan && (
              <div className="text-[11px] text-slate-500">
                Atasan Langsung terproteksi: <span className="font-semibold text-slate-700">{atasanInfo.atasan.nama}</span> (tidak dapat dipilih)
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-shake">
            <i className="bi bi-exclamation-triangle-fill text-rose-500 text-sm"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Candidate List Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {eligiblePeers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <i className="bi bi-people text-4xl stroke-1 mb-2 block text-slate-300"></i>
              <p className="text-sm font-semibold">Tidak ditemukan kandidat rekan kerja yang sesuai</p>
              <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter unit kerja.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eligiblePeers.map((emp, empIdx) => {
                const isSelected = selectedNips.includes(emp.nip);
                const isPPPK = (emp.jenisPegawai || emp.status || '').toUpperCase().includes('PPPK');
                const isSameUnit = emp.unitKerja === subjectEmployee.unitKerja;

                return (
                  <div
                    key={`${emp.nip}-${empIdx}`}
                    onClick={() => handleToggleSelect(emp.nip)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="mt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by container
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 pointer-events-none"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {emp.nama}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          isPPPK ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isPPPK ? 'PPPK' : 'PNS'}
                        </span>
                        {isSameUnit && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Satu Unit
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                        <div className="truncate"><span className="text-slate-400">NIP:</span> {emp.nip}</div>
                        <div className="truncate"><span className="text-slate-400">Jabatan:</span> {emp.jabatan || '-'}</div>
                        <div className="truncate text-slate-600 font-medium"><span className="text-slate-400">Unit:</span> {emp.unitKerja || '-'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Dipilih: <span className="font-bold text-slate-900">{selectedNips.length}</span> dari batas maksimal <span className="font-bold text-slate-900">{maxPeers}</span> orang.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedNips.length < minPeers || selectedNips.length > maxPeers}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm ${
                isSubmitting || selectedNips.length < minPeers || selectedNips.length > maxPeers
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin"></i>
                  <span>Mengajukan...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-check"></i>
                  <span>Ajukan Penilai ({selectedNips.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
