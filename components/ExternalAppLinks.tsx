import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { getExternalAppLogo } from './ExternalAppLogos';

export interface ExternalApp {
  id: string;
  name: string;
  shortName: string;
  url: string;
  category: 'user' | 'admin';
  badge: string;
  adminOnly?: boolean;
}

export const EXTERNAL_APPS: ExternalApp[] = [
  // ==========================================
  // UNTUK SEMUA PEGAWAI
  // ==========================================
  {
    id: 'simpeg',
    name: 'SIMPEG Kemenkumham',
    shortName: 'SIMPEG',
    url: 'https://simpeg.kemenkum.go.id/devp/siap/signin.php',
    category: 'user',
    badge: 'Kemenkumham',
    adminOnly: false
  },
  {
    id: 'seraya',
    name: 'SERAYA LHKPN & SPT',
    shortName: 'SERAYA',
    url: 'https://seraya.kemenkum.go.id/',
    category: 'user',
    badge: 'LHKPN / SPT',
    adminOnly: false
  },
  {
    id: 'siasn',
    name: 'SIASN BKN (ASN Digital)',
    shortName: 'SIASN BKN',
    url: 'https://sso-siasn.bkn.go.id/auth/realms/public-siasn/protocol/openid-connect/auth?client_id=bkn-portal&redirect_uri=https%3A%2F%2Fasndigital.bkn.go.id%2F&state=63790e88-2703-4a42-8ed1-e24b179ef940&response_mode=fragment&response_type=code&scope=openid&nonce=f15a217a-deea-4c6e-92cf-5480598135f4&code_challenge=o5rD4DYFRXm4pq8MVr1Kg1bbKEDAmWUR42Jxc7esxrk&code_challenge_method=S256',
    category: 'user',
    badge: 'BKN RI',
    adminOnly: false
  },

  // ==========================================
  // KHUSUS ADMIN SDM
  // ==========================================
  {
    id: 'siap_admin',
    name: 'SIAP Admin SDM',
    shortName: 'SIAP Admin',
    url: 'https://simpeg.kemenkum.go.id/siap/index.php/login',
    category: 'admin',
    badge: 'Admin SDM',
    adminOnly: true
  },
  {
    id: 'dossier_admin',
    name: 'Dossier Arsip Digital',
    shortName: 'Dossier',
    url: 'https://simpeg.kemenkum.go.id/dossier/index.php/login',
    category: 'admin',
    badge: 'E-Dossier',
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
  subtitle = "Akses langsung portal layanan kepegawaian Kemenkumham dan BKN RI",
  compact = false,
  className = "",
  showAdminOverride
}) => {
  const { user, isSuperadmin, canEdit } = useAuth();
  const [filterCategory, setFilterCategory] = useState<'all' | 'user' | 'admin'>('all');

  const isAdmin = showAdminOverride !== undefined 
    ? showAdminOverride 
    : (isSuperadmin || canEdit || user?.role === 'Editor' || user?.role?.includes('Admin'));

  // Filter apps based on user role & active category
  const accessibleApps = EXTERNAL_APPS.filter(app => {
    if (app.adminOnly && !isAdmin) return false;
    if (filterCategory === 'user') return app.category === 'user';
    if (filterCategory === 'admin') return app.category === 'admin';
    return true;
  });

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Compact layout (e.g. for small sidebar or widget)
  if (compact) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <i className="bi bi-box-arrow-up-right text-blue-600 text-xs"></i>
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider">{title}</h4>
          </div>
          {isAdmin && (
            <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Admin
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {accessibleApps.map((app) => (
            <div
              key={app.id}
              onClick={() => handleOpenLink(app.url)}
              className="group bg-white hover:bg-slate-50 border border-gray-200/90 hover:border-blue-400 rounded-xl p-2 transition-all cursor-pointer shadow-xs hover:shadow-sm flex flex-col items-center justify-center text-center"
            >
              <div className="w-full h-12 bg-blue-50/40 border border-blue-100/60 rounded-lg p-1.5 flex items-center justify-center group-hover:bg-blue-50/80 transition-colors">
                {getExternalAppLogo(app.id, "w-full h-full object-contain")}
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-gray-800 group-hover:text-blue-600 truncate w-full">
                {app.shortName}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Model sesuai gambar referensi: Card putih dengan inner-box biru muda lembut & teks di bawah
  return (
    <div className={`bg-white rounded-2xl border border-gray-200/80 p-4 md:p-5 shadow-xs ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-gray-100 mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[9px] font-black tracking-wider text-blue-600 uppercase">
              Tautan Eksternal
            </span>
          </div>
          <h3 className="text-sm md:text-base font-black text-gray-950 tracking-tight mt-0.5 flex items-center gap-1.5">
            <i className="bi bi-grid-fill text-blue-600 text-xs"></i>
            <span>{title}</span>
          </h3>
          <p className="text-[11px] text-gray-500 font-medium mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Filter Badges if Admin */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-gray-100/90 p-0.5 rounded-lg shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                filterCategory === 'all' 
                  ? 'bg-white text-gray-900 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Semua ({EXTERNAL_APPS.length})
            </button>
            <button
              onClick={() => setFilterCategory('user')}
              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                filterCategory === 'user' 
                  ? 'bg-white text-blue-600 shadow-xs' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Pegawai (3)
            </button>
            <button
              onClick={() => setFilterCategory('admin')}
              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                filterCategory === 'admin' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              Admin (2)
            </button>
          </div>
        )}
      </div>

      {/* Row of Cards matching user's image */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {accessibleApps.map((app) => (
          <div
            key={app.id}
            onClick={() => handleOpenLink(app.url)}
            className="group relative bg-white border border-gray-200/90 hover:border-blue-400 rounded-2xl p-2.5 sm:p-3 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col items-center justify-between text-center hover:-translate-y-0.5"
          >
            {/* Inner Light-Blue Logo Container */}
            <div className="w-full h-16 sm:h-20 bg-blue-50/45 border border-blue-100/70 rounded-xl p-2.5 flex items-center justify-center group-hover:bg-blue-50/80 group-hover:border-blue-200 transition-all duration-200">
              <div className="w-full h-full max-w-[130px] flex items-center justify-center">
                {getExternalAppLogo(app.id, "w-full h-full object-contain filter drop-shadow-2xs group-hover:scale-105 transition-transform duration-200")}
              </div>
            </div>

            {/* Centered Title Label Below */}
            <div className="w-full mt-2.5 flex items-center justify-center gap-1">
              <span className="text-xs sm:text-[13px] font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                {app.shortName}
              </span>
              {app.adminOnly && (
                <span className="px-1 py-0.2 rounded text-[7px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                  ADMIN
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExternalAppLinks;
