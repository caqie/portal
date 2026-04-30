import React, { useState, useEffect } from 'react';
// @ts-ignore
import { MemoryRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Dashboard from './pages/Dashboard';
import PegawaiPage from './pages/PegawaiPage';
import ProfilePegawaiPage from './pages/ProfilePegawaiPage';
import TugasRutinPage from './pages/TugasRutinPage';
import LaporanPage from './pages/LaporanPage';
import DossiersPage from './pages/DossiersPage';
import SettingsPage from './pages/SettingsPage';
import KegiatanPage from './pages/KegiatanPage';
import LoginPage from './pages/LoginPage';
import LayananKepegawaianPage from './pages/LayananKepegawaianPage';
import PelantikanGeneratorPage from './pages/PelantikanGeneratorPage';
import SpmtSppPage from './pages/SpmtSppPage';
import AbsensiOnlinePage from './pages/AbsensiOnlinePage';
import RekapAbsensiPage from './pages/RekapAbsensiPage';
import SKPPage from './pages/SKPPage';
import PAKPage from './pages/PAKPage';
import ABKAnjabPage from './pages/ABKAnjabPage';
import KGBGeneratorPage from './pages/KGBGeneratorPage';
import ActivityLogPage from './pages/ActivityLogPage';
import PensiunPage from './pages/PensiunPage';
import KenaikanPangkatPage from './pages/KenaikanPangkatPage';
import SatyaLencanaPage from './pages/SatyaLencanaPage';
import MagangPKLPage from './pages/MagangPKLPage';
import PersuratanPage from './pages/PersuratanPage';
import PengembanganPage from './pages/PengembanganPage';
import KeuanganPage from './pages/KeuanganPage';
import UkomLoginPage from './pages/UkomLoginPage';
import UkomDashboardPage from './pages/UkomDashboardPage';
import UkomExamPage from './pages/UkomExamPage';
import UkomAdminPage from './pages/UkomAdminPage';
import UkomSupervisorPage from './pages/UkomSupervisorPage';
import { DEFAULT_LOGO, APP_ROUTES } from './constants';
import { syncGidMap, fetchSystemConfig } from './spreadsheetService';
import { SystemConfig } from './types';

const SidebarItem = ({ to, icon, label, active, collapsed, onClick, target }: any) => {
  const handleClick = (e: React.MouseEvent) => {
    if (target === '_blank') {
      e.preventDefault();
      // Simpan path tujuan ke localStorage agar tab baru tahu harus buka apa
      localStorage.setItem('portal_direct_access', to);
      window.open(window.location.origin, '_blank');
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link 
      to={to} 
      onClick={handleClick}
      target={target}
      className={`flex items-center px-4 py-3.5 transition-all duration-300 group relative rounded-xl mx-3 mb-1 ${active ? 'bg-blue-600/10 text-blue-50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.1)]"></div>
      )}
      
      <div className={`flex items-center justify-center ${collapsed ? 'w-full' : 'w-6'} transition-all`}>
        <i className={`bi ${icon} ${active ? 'text-blue-500' : 'text-inherit'} ${collapsed ? 'text-2xl' : 'text-lg'} transition-transform group-hover:scale-110`}></i>
      </div>
      
      {!collapsed && (
        <span className="ml-4 font-bold text-[11px] tracking-[0.1em] whitespace-nowrap overflow-hidden">
          {label}
        </span>
      )}
    </Link>
  );
};

const AppContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1440);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);
  const [runningText, setRunningText] = useState(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM DJKI.');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ maintenance: { all: false, pages: [] }, pageAccess: [] });
  
  const location = useLocation();
  const { user, logout, isSuperadmin, canEdit, isAuthenticated } = useAuth();

  // Mode Ujian Terisolasi (Strict Mode)
  const isUkomStrict = window.location.pathname.includes('ukomdjki') || window.location.search.includes('portal=ukom');

  const loadSystemConfig = async () => {
    const config = await fetchSystemConfig();
    setSystemConfig(config);
  };

  useEffect(() => { 
    // Suppress Vite WebSocket error from console to avoid user confusion
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const msg = args[0] && typeof args[0] === 'string' ? args[0] : '';
      if (msg.includes('[vite] failed to connect to websocket') || msg.includes('WebSocket closed without opened.')) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const msg = args[0] && typeof args[0] === 'string' ? args[0] : '';
      if (msg.includes('[vite] failed to connect to websocket') || msg.includes('WebSocket closed without opened.')) {
        return;
      }
      originalWarn.apply(console, args);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || (typeof reason === 'string' ? reason : reason?.toString() || '');
      if (message.includes('WebSocket closed without opened.') || 
          message.includes('[vite] failed to connect to websocket')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    syncGidMap(); 
    loadSystemConfig();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) setIsSidebarOpen(true);
      setIsCollapsed(width < 1440);
      setIsMobileView(width < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const sync = () => {
      const name = localStorage.getItem('portal_system_name');
      if (name) { setSystemName(name); document.title = name; }
      setSystemLogo(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
      setRunningText(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM DJKI.');
    };
    sync();
    window.addEventListener('storage_updated', sync);
    return () => window.removeEventListener('storage_updated', sync);
  }, []);

  useEffect(() => {
    if (!isUkomStrict) {
      sessionStorage.setItem('portal_last_path', location.pathname + location.search);
    }
  }, [location.pathname, location.search, isUkomStrict]);

  if (isUkomStrict) {
    return (
      <div className="h-screen w-full bg-gray-50 overflow-hidden">
        <Routes>
          <Route path="/ukom/login" element={<UkomLoginPage />} />
          <Route path="/ukom/dashboard" element={<UkomDashboardPage />} />
          <Route path="/ukom/exam" element={<UkomExamPage />} />
          <Route path="/ukom/supervisor" element={<UkomSupervisorPage />} />
          <Route path="*" element={<Navigate to="/ukom/login" replace />} />
        </Routes>
      </div>
    );
  }

  if (!isAuthenticated && !location.pathname.startsWith('/ukom') && location.pathname !== '/login') return <Navigate to="/login" replace />;
  if (location.pathname === '/login' && isAuthenticated) return <Navigate to="/" replace />;
  if (location.pathname === '/login') return <LoginPage />;
  
  const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const isPageInMaintenance = (path: string) => {
    if (systemConfig.maintenance.all) return true;
    return systemConfig.maintenance.pages.includes(path);
  };

  const hasAccess = (path: string) => {
    if (isSuperadmin) return true;
    const access = systemConfig.pageAccess.find(a => a.route === path);
    if (!access) {
      // Default access rules if not configured
      if (['/settings', '/logs'].includes(path)) return isSuperadmin;
      if (['/persuratan', '/tugas-rutin', '/kegiatan', '/laporan', '/keuangan', '/dossiers'].includes(path)) return canEdit || isSuperadmin;
      return true;
    }
    
    const roleMatch = access.roles.includes(user?.role || '');
    const nipMatch = access.nips.includes(user?.nip || '');
    
    return roleMatch || nipMatch;
  };

  const currentPath = location.pathname;
  const isMaintenance = isPageInMaintenance(currentPath) && !isSuperadmin;
  const isDenied = !hasAccess(currentPath);

  const MaintenanceView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div className="h-32 w-32 bg-amber-100 text-amber-600 rounded-[3rem] flex items-center justify-center text-6xl mb-8 animate-bounce">
        <i className="bi bi-tools"></i>
      </div>
      <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">Halaman Dalam Pengembangan</h2>
      <p className="text-gray-500 max-w-md font-medium">Mohon maaf, halaman ini sedang dalam proses pemeliharaan atau pengembangan fitur baru. Silakan kembali lagi nanti.</p>
      <Link to="/" className="mt-10 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold tracking-widest shadow-xl hover:bg-blue-700 transition-all">Kembali ke Dashboard</Link>
    </div>
  );

  const AccessDeniedView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <div className="h-32 w-32 bg-rose-100 text-rose-600 rounded-[3rem] flex items-center justify-center text-6xl mb-8">
        <i className="bi bi-shield-lock-fill"></i>
      </div>
      <h2 className="text-3xl font-black text-gray-900 tracking-tighter mb-4">Akses Terbatas</h2>
      <p className="text-gray-500 max-w-md font-medium">Anda tidak memiliki izin untuk mengakses halaman ini. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.</p>
      <Link to="/" className="mt-10 px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold tracking-widest shadow-xl hover:bg-gray-800 transition-all">Kembali ke Dashboard</Link>
    </div>
  );

  // UKOM Routes (Separate Layout)
  if (location.pathname.startsWith('/ukom') && location.pathname !== '/ukom/admin') {
    if (isPageInMaintenance(location.pathname) && !isSuperadmin) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
          <MaintenanceView />
        </div>
      );
    }
    return (
      <Routes>
        <Route path="/ukom/login" element={<UkomLoginPage />} />
        <Route path="/ukom/dashboard" element={<UkomDashboardPage />} />
        <Route path="/ukom/exam" element={<UkomExamPage />} />
        <Route path="/ukom/supervisor" element={<UkomSupervisorPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F8F9FC] text-gray-900 font-['Inter']">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] lg:hidden animate-fadeIn" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-[120] bg-[#0f172a] transition-all duration-500 lg:relative lg:translate-x-0 border-r border-white/5 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20 md:w-24' : 'w-64 md:w-72'}`}>
        <div className="flex flex-col h-full relative">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="absolute -right-3.5 top-10 bg-blue-600 text-white rounded-full h-7 w-7 border-4 border-[#0f172a] hover:bg-blue-50 transition-all hidden lg:flex items-center justify-center z-[130] shadow-xl"
          >
            <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'} text-[10px]`}></i>
          </button>

          <div className={`pt-8 md:pt-10 pb-6 md:pb-8 flex flex-col items-center ${isCollapsed ? 'px-2' : 'px-6 md:px-8'}`}>
            <Link to="/" className={`relative transition-all duration-500 ${isCollapsed ? 'w-12 h-12 md:w-14 md:h-14' : 'w-20 h-20 md:w-24 md:h-24'} mb-3 md:mb-4 active:scale-95 group`}>
                <div className="w-full h-full bg-white rounded-xl md:rounded-2xl p-2 md:p-2.5 border-2 md:border-4 border-white ring-1 ring-white/10 shadow-2xl flex items-center justify-center overflow-hidden shimmer-effect">
                   <img src={systemLogo || DEFAULT_LOGO} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" />
                </div>
            </Link>
            {!isCollapsed && (
              <div className="text-center transition-all duration-500 whitespace-nowrap overflow-hidden">
                <h1 className="text-[10px] md:text-[11px] font-black text-white tracking-tighter leading-none">{systemName}</h1>
                <p className="text-[6px] md:text-[7px] text-slate-500 mt-1.5 md:mt-2 font-black tracking-[0.3em]">SDM HUB DJKI</p>
              </div>
            )}
          </div>
          
          <nav className="flex-1 mt-2 md:mt-4 overflow-y-auto no-scrollbar space-y-0.5 pb-20">
            {hasAccess('/') && <SidebarItem to="/" icon="bi-grid-1x2-fill" label="Dashboard" active={location.pathname === '/'} collapsed={isCollapsed} />}
            {hasAccess('/pegawai') && <SidebarItem to="/pegawai" icon="bi-person-vcard-fill" label="Database Pegawai" active={location.pathname === '/pegawai'} collapsed={isCollapsed} />}
            
            {hasAccess('/layanan') && (
              <SidebarItem to="/layanan" icon="bi-briefcase-fill" label="Layanan Karir" active={['/layanan', '/kenaikan-pangkat', '/skp', '/pak', '/anjab-abk', '/pensiun', '/kgb-gen', '/spmt-spp', '/pelantikan-gen', '/satya-lencana', '/magang-pkl', '/pengembangan'].some(p => location.pathname.startsWith(p))} collapsed={isCollapsed} />
            )}
            
            {(hasAccess('/persuratan') || hasAccess('/tugas-rutin') || hasAccess('/kegiatan') || hasAccess('/laporan') || hasAccess('/keuangan') || hasAccess('/dossiers')) && (
              <>
                {!isCollapsed && <div className="px-8 py-4 text-[8px] font-black text-slate-500 tracking-[0.2em]">Administrasi</div>}
                {hasAccess('/persuratan') && <SidebarItem to="/persuratan" icon="bi-envelope-paper-fill" label="Persuratan Digital" active={location.pathname === '/persuratan'} collapsed={isCollapsed} />}
                {hasAccess('/tugas-rutin') && <SidebarItem to="/tugas-rutin" icon="bi-clipboard2-check-fill" label="Tugas Rutin" active={location.pathname === '/tugas-rutin'} collapsed={isCollapsed} />}
                {hasAccess('/kegiatan') && <SidebarItem to="/kegiatan" icon="bi-calendar2-event-fill" label="Kalender Kegiatan" active={location.pathname === '/kegiatan'} collapsed={isCollapsed} />}
                {hasAccess('/laporan') && <SidebarItem to="/laporan" icon="bi-file-earmark-bar-graph-fill" label="Laporan Bulanan" active={location.pathname === '/laporan'} collapsed={isCollapsed} />}
                {hasAccess('/keuangan') && <SidebarItem to="/keuangan" icon="bi-cash-stack" label="Keuangan" active={location.pathname === '/keuangan'} collapsed={isCollapsed} />}
                {hasAccess('/dossiers') && <SidebarItem to="/dossiers" icon="bi-folder-fill" label="E-Dossier Digital" active={location.pathname === '/dossiers'} collapsed={isCollapsed} />}
              </>
            )}

            {!isCollapsed && <div className="px-8 py-4 text-[8px] font-black text-slate-500 tracking-[0.2em]">Kehadiran</div>}
            {/* Hanya tampilkan menu absensi di Mobile View */}
            {isMobileView && hasAccess('/absensi-online') && (
              <SidebarItem to="/absensi-online" icon="bi-camera-fill" label="Absensi Wajah" active={location.pathname === '/absensi-online'} collapsed={isCollapsed} />
            )}
            {hasAccess('/rekap-absensi') && <SidebarItem to="/rekap-absensi" icon="bi-clipboard-data-fill" label="Rekapitulasi" active={location.pathname === '/rekap-absensi'} collapsed={isCollapsed} />}

            {!isCollapsed && <div className="px-8 py-4 text-[8px] font-black text-slate-500 tracking-[0.2em]">Uji Kompetensi</div>}
            {hasAccess('/ukom/admin') && <SidebarItem to="/ukom/admin" icon="bi-pc-display-horizontal" label="Admin CAT" active={location.pathname === '/ukom/admin'} collapsed={isCollapsed} />}
            {hasAccess('/ukom/login') && <SidebarItem to="/ukom/login" icon="bi-pencil-square" label="Portal Ujian" active={location.pathname.startsWith('/ukom') && location.pathname !== '/ukom/admin'} collapsed={isCollapsed} target="_blank" />}

            {(hasAccess('/settings') || hasAccess('/logs')) && (
              <>
                {!isCollapsed && <div className="px-8 py-4 text-[8px] font-black text-slate-500 tracking-[0.2em]">Sistem</div>}
                {hasAccess('/settings') && <SidebarItem to="/settings" icon="bi-gear-wide-connected" label="Pengaturan" active={location.pathname === '/settings'} collapsed={isCollapsed} />}
                {hasAccess('/logs') && <SidebarItem to="/logs" icon="bi-clock-history" label="Audit Logs" active={location.pathname === '/logs'} collapsed={isCollapsed} />}
              </>
            )}
          </nav>

          <div className="p-6 border-t border-white/5 shrink-0">
             <button onClick={logout} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-rose-600/10 text-rose-500 rounded-xl font-bold text-[10px] tracking-widest hover:bg-rose-600 hover:text-white transition-all">
                <i className="bi bi-power"></i>
                {!isCollapsed && <span>Logout Sistem</span>}
             </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <header className="bg-white border-b border-gray-100 shrink-0 z-[100]">
          <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3 md:gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden h-9 w-9 md:h-10 md:w-10 flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl shrink-0"><i className="bi bi-list text-xl md:text-2xl"></i></button>
              <div className="hidden sm:block">
                <h2 className="text-xs md:text-sm font-black text-gray-950 tracking-tight">Portal SDM DJKI</h2>
                <p className="text-[8px] md:text-[10px] text-gray-400 font-bold tracking-widest">DJKI Smart Hub 2025</p>
              </div>
            </div>
            
            <div className="hidden lg:flex flex-col items-center bg-gray-50 px-8 py-2 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <i className="bi bi-clock-fill text-blue-600 text-xs"></i>
                <span className="text-[14px] font-black text-gray-950 tracking-tighter tabular-nums">{formattedTime}</span>
              </div>
              <span className="text-[9px] font-black text-gray-400 tracking-widest mt-0.5">{formattedDate}</span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[9px] md:text-[11px] font-black text-gray-950 truncate max-w-[100px] md:max-w-none">{user?.name}</span>
                <span className="text-[7px] md:text-[9px] font-bold text-blue-600 tracking-tighter uppercase">{user?.role}</span>
              </div>
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-lg md:rounded-2xl bg-gray-50 border-2 md:border-4 border-white shadow-xl overflow-hidden shimmer-effect shrink-0">
                 {user?.foto ? <img src={user.foto} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 font-black text-xs md:text-base">?</div>}
              </div>
            </div>
          </div>
          
          {/* RUNNING TEXT TICKER */}
          <div className="h-8 md:h-10 bg-[#111827] border-y border-white/5 flex items-center overflow-hidden relative">
             <div className="bg-blue-600 h-full px-3 md:px-4 flex items-center gap-1.5 md:gap-2 shrink-0 z-10 shadow-[5px_0_15px_rgba(0,0,0,0.3)]">
                <i className="bi bi-megaphone-fill text-white text-[10px] md:text-xs animate-pulse"></i>
                <span className="text-[7px] md:text-[9px] font-black text-white tracking-widest uppercase">Update</span>
             </div>
             <div className="flex-1 overflow-hidden relative h-full flex items-center">
                <div className="animate-marquee whitespace-nowrap">
                   <span className="text-[8px] md:text-[10px] font-black text-slate-300 tracking-widest mx-6 md:mx-10">
                      {runningText}
                   </span>
                   <span className="text-[8px] md:text-[10px] font-black text-slate-300 tracking-widest mx-6 md:mx-10">
                      {runningText}
                   </span>
                </div>
             </div>
             <div className="hidden sm:flex bg-[#111827] h-full px-4 items-center gap-2 shrink-0 z-10 shadow-[-5px_0_15px_rgba(0,0,0,0.3)]">
                <span className="text-[8px] font-bold text-slate-500 tracking-widest italic">{new Date().getFullYear()} © DJKI HUB</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar relative flex flex-col">
          <div className="flex-1">
            {isMaintenance ? (
              <MaintenanceView />
            ) : isDenied ? (
              <AccessDeniedView />
            ) : (
              <div className="max-w-[1600px] mx-auto w-full">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/pegawai" element={<PegawaiPage />} />
                  <Route path="/pegawai/:nip" element={<ProfilePegawaiPage />} />
                  <Route path="/layanan" element={<LayananKepegawaianPage />} />
                  <Route path="/tugas-rutin" element={<TugasRutinPage />} />
                  <Route path="/kegiatan" element={<KegiatanPage />} />
                  <Route path="/laporan" element={<LaporanPage />} />
                  <Route path="/keuangan" element={<KeuanganPage />} />
                  <Route path="/dossiers" element={<DossiersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/logs" element={<ActivityLogPage />} />
                  <Route path="/absensi-online" element={<AbsensiOnlinePage />} />
                  <Route path="/rekap-absensi" element={<RekapAbsensiPage />} />
                  <Route path="/skp" element={<SKPPage />} />
                  <Route path="/pak" element={<PAKPage />} />
                  <Route path="/anjab-abk" element={<ABKAnjabPage />} />
                  <Route path="/pelantikan-gen" element={<PelantikanGeneratorPage />} />
                  <Route path="/spmt-spp" element={<SpmtSppPage />} />
                  <Route path="/kgb-gen" element={<KGBGeneratorPage />} />
                  <Route path="/pensiun" element={<PensiunPage />} />
                  <Route path="/kenaikan-pangkat" element={<KenaikanPangkatPage />} />
                  <Route path="/satya-lencana" element={<SatyaLencanaPage />} />
                  <Route path="/magang-pkl" element={<MagangPKLPage />} />
                  <Route path="/persuratan" element={<PersuratanPage />} />
                  <Route path="/pengembangan" element={< PengembanganPage />} />
                  <Route path="/ukom/admin" element={<UkomAdminPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            )}
          </div>

          <footer className="mt-12 md:mt-16 pt-6 md:pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left shrink-0 pb-4">
            <div className="space-y-1">
              <p className="text-[9px] md:text-[10px] font-black text-gray-900 tracking-widest uppercase">{systemName}</p>
              <p className="text-[7px] md:text-[8px] font-bold text-gray-400 tracking-widest uppercase">Sistem Manajemen SDM DJKI Kemenkumham RI © 2025</p>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <p className="text-[7px] md:text-[8px] font-black text-gray-400 tracking-widest mb-1 uppercase">Dikembangkan Oleh:</p>
              <a href="https://caqiestudioproduction.com" target="_blank" rel="noopener noreferrer" className="text-[8px] md:text-[9px] font-black text-blue-600 hover:text-blue-700 tracking-widest transition-colors flex items-center gap-2 group uppercase">
                caqiestudioproduction.com
                <i className="bi bi-box-arrow-up-right group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const isUkomStrict = window.location.pathname.includes('ukomdjki') || window.location.search.includes('portal=ukom');
  let initialPath = sessionStorage.getItem('portal_last_path') || '/';
  
  if (isUkomStrict) {
    initialPath = '/ukom/login';
  } else {
    // Cek apakah ada permintaan akses langsung (untuk tab baru)
    const directAccess = localStorage.getItem('portal_direct_access');
    if (directAccess) {
      initialPath = directAccess;
      localStorage.removeItem('portal_direct_access');
      sessionStorage.setItem('portal_last_path', initialPath);
    }
  }
  
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </MemoryRouter>
  );
};

export default App;
