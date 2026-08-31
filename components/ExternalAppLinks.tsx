import React, { useState } from 'react';
import { useAuth } from '../AuthContext';

export interface ExternalApp {
  id: string;
  name: string;
  shortName: string;
  url: string;
  description: string;
  category: 'user' | 'admin';
  categoryLabel: string;
  icon: string;
  badge: string;
  bgGradient: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  adminOnly?: boolean;
}

export const EXTERNAL_APPS: ExternalApp[] = [
  // ==========================================
  // UNTUK SEMUA USER
  // ==========================================
  {
    id: 'simpeg',
    name: 'Aplikasi SIMPEG Kemenkumham',
    shortName: 'SIMPEG Pegawai',
    url: 'https://simpeg.kemenkum.go.id/devp/siap/signin.php',
    description: 'Sistem Informasi Manajemen Kepegawaian Kemenkumham untuk akses data profil, riwayat kepangkatan, presensi, dan layanan mandiri ASN.',
    category: 'user',
    categoryLabel: 'Semua Pegawai',
    icon: 'bi-person-badge-fill',
    badge: 'Portal Pegawai',
    bgGradient: 'from-blue-600 to-indigo-700',
    accentColor: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'text-blue-600',
    adminOnly: false
  },
  {
    id: 'seraya',
    name: 'Aplikasi SERAYA Kemenkumham',
    shortName: 'SERAYA LHKPN/SPT',
    url: 'https://seraya.kemenkum.go.id/',
    description: 'Sistem Pelaporan Harta Kekayaan (LHKPN / LHKASN) & Kepatuhan Penyampaian SPT Pajak Tahunan bagi seluruh ASN Kemenkumham.',
    category: 'user',
    categoryLabel: 'Semua Pegawai',
    icon: 'bi-shield-check',
    badge: 'LHKPN & SPT Pajak',
    bgGradient: 'from-emerald-600 to-teal-700',
    accentColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'text-emerald-600',
    adminOnly: false
  },
  {
    id: 'siasn',
    name: 'Aplikasi SIASN BKN (ASN Digital)',
    shortName: 'SIASN BKN',
    url: 'https://sso-siasn.bkn.go.id/auth/realms/public-siasn/protocol/openid-connect/auth?client_id=bkn-portal&redirect_uri=https%3A%2F%2Fasndigital.bkn.go.id%2F&state=63790e88-2703-4a42-8ed1-e24b179ef940&response_mode=fragment&response_type=code&scope=openid&nonce=f15a217a-deea-4c6e-92cf-5480598135f4&code_challenge=o5rD4DYFRXm4pq8MVr1Kg1bbKEDAmWUR42Jxc7esxrk&code_challenge_method=S256',
    description: 'Sistem Informasi Aparatur Sipil Negara Terintegrasi BKN RI (MyASN, Layanan Kenaikan Pangkat, Mutasi, Pencantuman Gelar & Pensiun Nasional).',
    category: 'user',
    categoryLabel: 'Semua Pegawai',
    icon: 'bi-globe2',
    badge: 'Nasional BKN RI',
    bgGradient: 'from-sky-600 to-cyan-700',
    accentColor: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeText: 'text-sky-600',
    adminOnly: false
  },

  // ==========================================
  // KHUSUS ADMIN
  // ==========================================
  {
    id: 'siap_admin',
    name: 'Aplikasi SIAP SIMPEG (Administrator)',
    shortName: 'SIAP SIMPEG Admin',
    url: 'https://simpeg.kemenkum.go.id/siap/index.php/login',
    description: 'Modul Administrator Sistem Informasi Administrasi Pegawai (SIAP) untuk verifikasi data, pengelolaan SK, mutasi, dan administrasi kepegawaian.',
    category: 'admin',
    categoryLabel: 'Khusus Admin SDM',
    icon: 'bi-gear-wide-connected',
    badge: 'KHUSUS ADMIN',
    bgGradient: 'from-rose-600 to-red-700',
    accentColor: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'text-rose-600',
    adminOnly: true
  },
  {
    id: 'dossier_admin',
    name: 'Aplikasi Dossier Digital (Administrator)',
    shortName: 'Dossier Admin',
    url: 'https://simpeg.kemenkum.go.id/dossier/index.php/login',
    description: 'Modul Pengelolaan Arsip Elektronik (E-Dossier) Kepegawaian Kemenkumham untuk validasi dan manajemen berkas digital ASN.',
    category: 'admin',
    categoryLabel: 'Khusus Admin SDM',
    icon: 'bi-folder-check',
    badge: 'KHUSUS ADMIN',
    bgGradient: 'from-purple-600 to-violet-700',
    accentColor: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeText: 'text-purple-600',
    adminOnly: true
  }
];

interface ExternalAppLinksProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
  showAdminOverride?: boolean;
}

export const ExternalAppLinks: React.FC<ExternalAppLinksProps> = ({
  title = "Pusat Tautan Aplikasi Kepegawaian",
  subtitle = "Akses cepat ke portal layanan kepegawaian Kemenkumham dan BKN RI",
  compact = false,
  className = "",
  showAdminOverride
}) => {
  const { user, isSuperadmin, canEdit } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'user' | 'admin'>('all');

  const isAdmin = showAdminOverride !== undefined 
    ? showAdminOverride 
    : (isSuperadmin || canEdit || user?.role === 'Editor' || user?.role?.includes('Admin'));

  // Filter apps based on role
  const accessibleApps = EXTERNAL_APPS.filter(app => {
    if (app.adminOnly && !isAdmin) return false;
    if (filterCategory === 'user') return app.category === 'user';
    if (filterCategory === 'admin') return app.category === 'admin';
    return true;
  });

  const handleCopyLink = (app: ExternalApp, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(app.url);
    setCopiedId(app.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (compact) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-box-arrow-up-right text-blue-600 text-sm"></i>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">{title}</h4>
          </div>
          {isAdmin && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Admin Mode
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {accessibleApps.map((app) => (
            <div
              key={app.id}
              onClick={() => handleOpenLink(app.url)}
              className="p-3 bg-white hover:bg-slate-50 border border-gray-200 hover:border-blue-400 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-md flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${app.bgGradient} text-white flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                  <i className={`bi ${app.icon}`}></i>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 truncate">{app.shortName}</p>
                    {app.adminOnly && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-rose-100 text-rose-700">ADMIN</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{app.badge}</p>
                </div>
              </div>
              <i className="bi bi-arrow-up-right text-gray-400 group-hover:text-blue-600 text-xs shrink-0"></i>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-3xl border border-gray-100/90 p-5 md:p-7 shadow-sm ${className}`}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase">
              Tautan Eksternal Terintegrasi
            </span>
          </div>
          <h3 className="text-base md:text-lg font-black text-gray-950 tracking-tight mt-0.5 flex items-center gap-2">
            <i className="bi bi-grid-fill text-blue-600"></i>
            <span>{title}</span>
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Filter Badges if Admin */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                filterCategory === 'all' 
                  ? 'bg-white text-gray-900 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Semua ({EXTERNAL_APPS.length})
            </button>
            <button
              onClick={() => setFilterCategory('user')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                filterCategory === 'user' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Semua User (3)
            </button>
            <button
              onClick={() => setFilterCategory('admin')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                filterCategory === 'admin' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              Khusus Admin (2)
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {accessibleApps.map((app) => (
          <div
            key={app.id}
            onClick={() => handleOpenLink(app.url)}
            className={`group relative rounded-2xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
              app.adminOnly 
                ? 'bg-gradient-to-br from-rose-50/40 via-white to-white border-rose-200/80 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10' 
                : 'bg-gradient-to-br from-slate-50/50 via-white to-white border-gray-200/80 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10'
            }`}
          >
            {/* Top Row: Icon, Badge & Action */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3.5">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${app.bgGradient} text-white flex items-center justify-center text-xl shadow-md group-hover:scale-105 group-hover:rotate-1 transition-all shrink-0`}>
                  <i className={`bi ${app.icon}`}></i>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black tracking-wider uppercase border ${app.badgeBg}`}>
                    {app.badge}
                  </span>
                  <button
                    onClick={(e) => handleCopyLink(app, e)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Salin Link URL"
                  >
                    <i className={`bi ${copiedId === app.id ? 'bi-check-lg text-emerald-600' : 'bi-clipboard'} text-xs`}></i>
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-black text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                {app.name}
              </h4>
              <p className="text-xs text-gray-500 font-normal mt-1.5 line-clamp-2 leading-relaxed">
                {app.description}
              </p>
            </div>

            {/* Bottom Row: Link Status & Launch Button */}
            <div className="mt-4 pt-3.5 border-t border-gray-100/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-gray-400 font-mono truncate max-w-[170px]">
                {app.url.replace(/^https?:\/\//, '').split('/')[0]}
              </span>
              
              <div className={`flex items-center gap-1.5 font-bold ${app.adminOnly ? 'text-rose-600 group-hover:translate-x-1' : 'text-blue-600 group-hover:translate-x-1'} transition-transform`}>
                <span>Buka Aplikasi</span>
                <i className="bi bi-box-arrow-up-right text-[10px]"></i>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExternalAppLinks;
