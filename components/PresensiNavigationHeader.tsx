import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

interface PresensiNavigationHeaderProps {
  activeTab?: string;
  title?: string;
  subtitle?: string;
}

export const PresensiNavigationHeader: React.FC<PresensiNavigationHeaderProps> = ({
  title = "Pusat Layanan Presensi & Kehadiran",
  subtitle = "Sistem Presensi Biometrik Cerdas, Geofencing, Rekapitulasi & Uang Makan DJKI"
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSuperadmin, canEdit, isAdminUangMakan } = useAuth();

  const isCurrent = (path: string) => {
    if (path === '/presensi') return location.pathname === '/presensi';
    return location.pathname.startsWith(path);
  };

  const hasAdminAccess = isSuperadmin || canEdit || user?.role?.includes('Admin');

  return (
    <div className="bg-white rounded-[2rem] p-5 md:p-6 border border-gray-100 shadow-sm space-y-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors shrink-0"
            title="Kembali ke Dashboard"
          >
            <i className="bi bi-arrow-left text-base"></i>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                Presensi &amp; Kehadiran Terpadu
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-gray-950 tracking-tight mt-0.5">
              {title}
            </h1>
            <p className="text-xs text-gray-400 font-medium hidden sm:block mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-gray-100">
        <button
          onClick={() => navigate('/presensi')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
            isCurrent('/presensi')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
          }`}
        >
          <i className="bi bi-camera-video-fill"></i>
          <span>Presensi Online</span>
        </button>

        <button
          onClick={() => navigate('/face-registration')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
            isCurrent('/face-registration')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
          }`}
        >
          <i className="bi bi-person-bounding-box"></i>
          <span>Registrasi Wajah</span>
        </button>

        <button
          onClick={() => navigate('/rekap-absensi')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
            isCurrent('/rekap-absensi')
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
          }`}
        >
          <i className="bi bi-clipboard-data-fill"></i>
          <span>Rekapitulasi Absensi</span>
        </button>

        {(hasAdminAccess || isAdminUangMakan) && (
          <button
            onClick={() => navigate('/uang-makan')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
              isCurrent('/uang-makan')
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
            }`}
          >
            <i className="bi bi-cash-coin"></i>
            <span>Uang Makan</span>
          </button>
        )}

        {hasAdminAccess && (
          <>
            <button
              onClick={() => navigate('/admin/attendance')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
                isCurrent('/admin/attendance') && !isCurrent('/admin/attendance/locations')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
              }`}
            >
              <i className="bi bi-bar-chart-fill"></i>
              <span>Monitoring Realtime</span>
            </button>

            <button
              onClick={() => navigate('/admin/attendance/locations')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all shrink-0 flex items-center gap-2 ${
                isCurrent('/admin/attendance/locations')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60'
              }`}
            >
              <i className="bi bi-geo-alt-fill"></i>
              <span>Lokasi Geofence</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
