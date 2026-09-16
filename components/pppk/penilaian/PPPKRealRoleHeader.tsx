import React from 'react';
import { EvaluationPeriod, Pegawai } from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';

export interface PPPKRealRoleHeaderProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  realRoles: SimRole[];
  onSelectRealRole: (role: SimRole) => void;
  periods: EvaluationPeriod[];
  selectedPeriodId: string;
  onChangePeriod: (id: string) => void;
  isUserSuperadmin: boolean;
  isSimulationMode: boolean;
  onToggleSimulationMode: () => void;
  assignmentsCount?: number;
  pendingApprovalCount?: number;
  inProgressCount?: number;
  finalCount?: number;
}

export const PPPKRealRoleHeader: React.FC<PPPKRealRoleHeaderProps> = ({
  activeRole,
  activePegawai,
  realRoles,
  onSelectRealRole,
  periods = [],
  selectedPeriodId,
  onChangePeriod,
  isUserSuperadmin,
  isSimulationMode,
  onToggleSimulationMode,
  assignmentsCount = 0,
  pendingApprovalCount = 0,
  inProgressCount = 0,
  finalCount = 0
}) => {
  const currentPeriod = periods.find(p => p.id === selectedPeriodId) || periods[0];

  // Role metadata helper
  const getRoleBadge = (role: SimRole) => {
    switch (role) {
      case 'ADMIN':
        return {
          title: 'Administrator SDM DJKI',
          desc: 'Pengelola Data & Otoritas Sistem',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: 'bi-shield-check',
          color: 'text-rose-600'
        };
      case 'PEJABAT_PENILAI':
        return {
          title: 'Pejabat Penilai Kinerja',
          desc: 'Atasan Langsung / Ketua Tim Kerja',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: 'bi-award-fill',
          color: 'text-blue-600'
        };
      case 'PPPK_DINILAI':
      case 'PPPK':
        return {
          title: 'Pegawai PPPK yang Dinilai',
          desc: 'Subjek Evaluasi Kinerja Periodik',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: 'bi-person-badge-fill',
          color: 'text-amber-600'
        };
      case 'PNS_PENILAI':
      case 'REKAN_PNS':
        return {
          title: 'Rekan Kerja Penilai (PNS)',
          desc: 'Penilai 360° Perilaku BerAKHLAK (20%)',
          badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
          icon: 'bi-people-fill',
          color: 'text-teal-600'
        };
      case 'PPPK_PENILAI':
      case 'REKAN_PPPK':
        return {
          title: 'Rekan Kerja Penilai (PPPK)',
          desc: 'Penilai 360° Perilaku BerAKHLAK (20%)',
          badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: 'bi-person-check-fill',
          color: 'text-purple-600'
        };
      default:
        return {
          title: 'Pegawai DJKI',
          desc: 'Pengguna Sistem Evaluasi',
          badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: 'bi-person',
          color: 'text-slate-600'
        };
    }
  };

  const currentRoleInfo = getRoleBadge(activeRole);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Top Identity Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* User Identity Info */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="relative shrink-0">
            {activePegawai?.foto ? (
              <img
                src={activePegawai.foto}
                alt={activePegawai.nama}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm ring-2 ring-slate-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-sm">
                {activePegawai?.nama ? activePegawai.nama.charAt(0).toUpperCase() : 'P'}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="Aktif di Sistem"></span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                {activePegawai?.nama || 'Pegawai Terotentikasi DJKI'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${currentRoleInfo.badgeBg} flex items-center gap-1`}>
                <i className={`bi ${currentRoleInfo.icon}`}></i>
                {currentRoleInfo.title}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono text-slate-700 font-bold">NIP. {activePegawai?.nip || '-'}</span>
              <span>•</span>
              <span>{activePegawai?.jabatan || 'Jabatan Fungsional'}</span>
              <span>•</span>
              <span className="text-blue-700 font-semibold">{activePegawai?.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual'}</span>
            </p>
          </div>
        </div>

        {/* Right Section: Periode Selector & Superadmin Test Mode Action */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          
          {/* Active Period Dropdown */}
          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition-colors">
            <i className="bi bi-calendar3 text-blue-600 text-xs"></i>
            <span className="text-xs font-bold text-slate-500">Periode:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => onChangePeriod(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-800 border-none focus:outline-none cursor-pointer pr-1"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id} className="bg-white text-slate-800 font-medium">
                  {p.year} (Semester {p.semester})
                </option>
              ))}
            </select>
          </div>

          {/* Superadmin Mode Uji Coba Toggle Button (ONLY for Superadmin) */}
          {isUserSuperadmin && (
            <button
              onClick={onToggleSimulationMode}
              className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                isSimulationMode
                  ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400/40'
                  : 'bg-slate-900 text-amber-300 hover:bg-slate-800 border border-amber-400/30'
              }`}
              title="Khusus Superadmin: Buka mode simulator untuk menguji hak akses lintas 5 peran dan impersonasi akun"
            >
              <i className={`bi ${isSimulationMode ? 'bi-toggle-on text-base' : 'bi-toggle-off text-base'}`}></i>
              <span>Mode Uji Coba Hak Akses</span>
              {isSimulationMode && (
                <span className="ml-1 px-1.5 py-0.2 bg-black/30 rounded text-[9px] uppercase font-mono">
                  Aktif
                </span>
              )}
            </button>
          )}

        </div>
      </div>

      {/* Multiple Authentic Roles Switcher (if user legitimately holds > 1 role, e.g. PPPK and also Peer Evaluator) */}
      {realRoles && realRoles.length > 1 && !isSimulationMode && (
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <i className="bi bi-person-lines-fill text-blue-600 text-sm"></i>
            <div>
              <span className="text-xs font-extrabold text-slate-800">Pilih Peran Resmi Anda:</span>
              <p className="text-[11px] text-slate-500">Anda memiliki lebih dari 1 peran resmi yang sah pada periode evaluasi ini.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {realRoles.map((r) => {
              const meta = getRoleBadge(r);
              const isSelected = activeRole === r;
              return (
                <button
                  key={r}
                  onClick={() => onSelectRealRole(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <i className={`bi ${meta.icon}`}></i>
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Role Context & Responsibilities Info Bar */}
      <div className="bg-slate-50 px-3.5 py-2.5 rounded-xl text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100">
        <div className="flex items-center gap-2">
          <i className="bi bi-info-circle-fill text-blue-600 shrink-0"></i>
          <span>
            {activeRole === 'ADMIN' && (
              <><strong>Akses Admin SDM:</strong> Anda dapat mengelola penugasan, upload presensi PDF, memantau kemajuan unit kerja, dan mengonfigurasi master periode.</>
            )}
            {activeRole === 'PEJABAT_PENILAI' && (
              <><strong>Akses Pejabat Penilai:</strong> Anda bertugas menetapkan rekan kerja, memberi penilaian SKP, menilai 28 butir perilaku (60%), dan merekomendasikan perpanjangan perjanjian kinerja.</>
            )}
            {(activeRole === 'PPPK_DINILAI' || activeRole === 'PPPK') && (
              <><strong>Akses Pegawai PPPK:</strong> Anda dapat mengajukan usulan pejabat penilai, menginput rencana hasil kerja & bukti dukung SKP, serta meninjau dokumen evaluasi kinerja akhir.</>
            )}
            {(activeRole === 'PNS_PENILAI' || activeRole === 'REKAN_PNS') && (
              <><strong>Akses Rekan Kerja (PNS):</strong> Anda bertugas menilai 28 butir instrumen perilaku BerAKHLAK secara objektif dan rahasia untuk rekan kerja PPPK yang ditugaskan.</>
            )}
            {(activeRole === 'PPPK_PENILAI' || activeRole === 'REKAN_PPPK') && (
              <><strong>Akses Rekan Kerja (PPPK):</strong> Anda bertugas menilai 28 butir instrumen perilaku BerAKHLAK secara independen untuk rekan kerja sesama PPPK yang ditugaskan.</>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[11px] font-semibold text-slate-500">
          <span>Periode: <strong className="text-slate-800">{currentPeriod?.year} (Sem. {currentPeriod?.semester})</strong></span>
          <span>•</span>
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold">
            Sesi Otentik
          </span>
        </div>
      </div>
    </div>
  );
};
