import React from 'react';
import { EvaluationPeriod, Pegawai } from '../../../types';

export type SimRole =
  | 'ADMIN'
  | 'PEJABAT_PENILAI'
  | 'PPPK'
  | 'PPPK_DINILAI'
  | 'REKAN_PNS'
  | 'PNS_PENILAI'
  | 'REKAN_PPPK'
  | 'PPPK_PENILAI';

export interface RoleAndPeriodSelectorBarProps {
  activeRole: SimRole;
  setActiveRole?: (role: SimRole) => void;
  onChangeRole?: (role: SimRole) => void;
  selectedPeriodId: string;
  setSelectedPeriodId?: (id: string) => void;
  onChangePeriod?: (id: string) => void;
  periods: EvaluationPeriod[];
  activePegawai: Pegawai | null;
  setActivePegawaiNip?: (nip: string) => void;
  onChangePegawai?: (p: Pegawai | null) => void;
  allPegawai?: Pegawai[];
  allEmployees?: Pegawai[];
  assignmentsCount?: number;
  pendingApprovalCount?: number;
  inProgressCount?: number;
  finalCount?: number;
}

export const RoleAndPeriodSelectorBar: React.FC<RoleAndPeriodSelectorBarProps> = ({
  activeRole,
  setActiveRole,
  onChangeRole,
  selectedPeriodId,
  setSelectedPeriodId,
  onChangePeriod,
  activePegawai,
  setActivePegawaiNip,
  onChangePegawai,
  allPegawai,
  allEmployees,
  periods = [],
  assignmentsCount,
  pendingApprovalCount,
  inProgressCount,
  finalCount
}) => {
  const currentPeriod = periods.find(p => p.id === selectedPeriodId);
  const employeeList = allPegawai || allEmployees || [];

  const handleRoleChange = (role: SimRole) => {
    if (onChangeRole) onChangeRole(role);
    if (setActiveRole) setActiveRole(role);
  };

  const handlePeriodChange = (id: string) => {
    if (onChangePeriod) onChangePeriod(id);
    if (setSelectedPeriodId) setSelectedPeriodId(id);
  };

  const handlePegawaiChange = (nip: string) => {
    const found = employeeList.find(e => e.nip === nip) || null;
    if (onChangePegawai) onChangePegawai(found);
    if (setActivePegawaiNip) setActivePegawaiNip(nip);
  };

  // Filter eligible employees for active simulator selection
  const pppkList = employeeList.filter(p => (p.jenisPegawai || (p as any).status || (p as any).status_kepegawaian || '').toUpperCase().includes('PPPK'));
  const pnsList = employeeList.filter(p => !(p.jenisPegawai || (p as any).status || (p as any).status_kepegawaian || '').toUpperCase().includes('PPPK'));

  const isRoleActive = (role: SimRole) => {
    if (activeRole === role) return true;
    if (role === 'PPPK_DINILAI' && activeRole === 'PPPK') return true;
    if (role === 'PNS_PENILAI' && activeRole === 'REKAN_PNS') return true;
    if (role === 'PPPK_PENILAI' && activeRole === 'REKAN_PPPK') return true;
    return false;
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Branding & Role Pill */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md">
            <i className="bi bi-shield-lock-fill text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-blue-400 font-black">Portal SDM DJKI</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Mode Uji Hak Akses (Role Switcher)
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Penilaian Kinerja PPPK
              <span className="text-xs font-normal text-slate-400">| Core Values ASN BerAKHLAK</span>
            </h2>
          </div>
        </div>

        {/* Right: Period & Profile Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Active Period Dropdown */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <i className="bi bi-calendar3 text-slate-400 text-xs"></i>
            <span className="text-xs text-slate-400 font-semibold">Periode:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-white border-none focus:outline-none cursor-pointer pr-2"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.year} (Sem. {p.semester})
                </option>
              ))}
            </select>
          </div>

          {/* Persona Employee Selector */}
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <i className="bi bi-person-badge text-blue-400 text-xs"></i>
            <span className="text-xs text-slate-400 font-semibold">Bertindak Sebagai:</span>
            <select
              value={activePegawai?.nip || ''}
              onChange={(e) => handlePegawaiChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-amber-300 border-none focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <optgroup label="PPPK Dinilai" className="bg-slate-900 text-slate-400">
                {pppkList.map(p => (
                  <option key={p.nip} value={p.nip} className="bg-slate-900 text-amber-300">
                    {p.nama} (PPPK)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Pejabat / Rekan PNS" className="bg-slate-900 text-slate-400">
                {pnsList.map(p => (
                  <option key={p.nip} value={p.nip} className="bg-slate-900 text-blue-300">
                    {p.nama} (PNS)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

        </div>
      </div>

      {/* Role Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
        <span className="text-[11px] font-bold text-slate-400 mr-2 flex items-center gap-1">
          <i className="bi bi-sliders"></i> Role Simulator:
        </span>

        {/* 1. Admin */}
        <button
          onClick={() => handleRoleChange('ADMIN')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isRoleActive('ADMIN')
              ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 border border-rose-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <i className="bi bi-gear-wide-connected"></i>
          1. Admin SDM
        </button>

        {/* 2. Pejabat Penilai */}
        <button
          onClick={() => handleRoleChange('PEJABAT_PENILAI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isRoleActive('PEJABAT_PENILAI')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <i className="bi bi-award-fill"></i>
          2. Pejabat Penilai Kinerja
        </button>

        {/* 3. PPPK Dinilai */}
        <button
          onClick={() => handleRoleChange('PPPK_DINILAI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isRoleActive('PPPK_DINILAI')
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40 border border-amber-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <i className="bi bi-person-fill"></i>
          3. PPPK yang Dinilai
        </button>

        {/* 4. Rekan PNS */}
        <button
          onClick={() => handleRoleChange('PNS_PENILAI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isRoleActive('PNS_PENILAI')
              ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40 border border-teal-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <i className="bi bi-people-fill"></i>
          4. Rekan Kerja PNS (20%)
        </button>

        {/* 5. Rekan PPPK */}
        <button
          onClick={() => handleRoleChange('PPPK_PENILAI')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isRoleActive('PPPK_PENILAI')
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 border border-purple-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <i className="bi bi-person-check-fill"></i>
          5. Rekan Kerja PPPK (20%)
        </button>
      </div>

      {/* Role explanation info pill */}
      <div className="bg-slate-800/60 px-3 py-2 rounded-xl text-xs text-slate-300 flex items-center justify-between border border-slate-700/60">
        <div className="flex items-center gap-2">
          <i className="bi bi-info-circle text-blue-400"></i>
          <span>
            {activeRole === 'ADMIN' && 'Admin: Akses penuh monitoring progress, verifikasi usulan penilai, upload absensi bulk, pembukaan kembali evaluasi, audit log, & master data.'}
            {activeRole === 'PEJABAT_PENILAI' && 'Pejabat Penilai: Menilai multi-PPPK, menetapkan 1 Rekan PNS + 1 Rekan PPPK, menilai Hasil Kerja (RHK) & Perilaku 28 butir (bobot 60%).'}
            {activeRole === 'PPPK_DINILAI' && 'PPPK yang Dinilai: Mengisi RHK & upload bukti dukung, mengusulkan Pejabat Penilai (Ketua Tim/Manajerial), dan melihat hasil akhir.'}
            {activeRole === 'PNS_PENILAI' && 'Rekan PNS: Hak akses terisolasi untuk menilai 28 butir perilaku kerja rekan PPPK secara objektif dan rahasia.'}
            {activeRole === 'PPPK_PENILAI' && 'Rekan PPPK: Hak akses terisolasi untuk menilai 28 butir perilaku kerja sesama rekan PPPK secara independen.'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 ml-3 whitespace-nowrap">
          NIP Aktif: {activePegawai?.nip || '-'}
        </span>
      </div>
    </div>
  );
};
