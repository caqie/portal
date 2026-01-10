import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Dashboard from './pages/Dashboard';
import PegawaiPage from './pages/PegawaiPage';
import TugasRutinPage from './pages/TugasRutinPage';
import LaporanPage from './pages/LaporanPage';
import DossiersPage from './pages/DossiersPage';
import SettingsPage from './pages/SettingsPage';
import KegiatanPage from './pages/KegiatanPage';
import LoginPage from './pages/LoginPage';
import LayananKepegawaianPage from './pages/LayananKepegawaianPage';
import PelantikanGeneratorPage from './pages/PelantikanGeneratorPage';
import AbsensiOnlinePage from './pages/AbsensiOnlinePage';
import RekapAbsensiPage from './pages/RekapAbsensiPage';
import SKPPage from './pages/SKPPage';
import ActivityLogPage from './pages/ActivityLogPage';
import { MaintenanceConfig } from './types';
import { DEFAULT_LOGO } from './constants';

const SidebarItem = ({ to, icon, label, active, collapsed, onClick }: { to: string, icon: string, label: string, active: boolean, collapsed: boolean, onClick?: () => void }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center px-5 py-3 transition-all duration-300 group relative rounded-xl mx-2 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
  >
    <i className={`bi ${icon} text-lg flex-shrink-0 transition-transform group-hover:scale-110`}></i>
    <span className={`ml-4 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-500 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
      {label}
    </span>
  </Link>
);

const MaintenanceScreen = () => (
  <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-fadeIn bg-white rounded-[3rem] border border-gray-100">
    <div className="relative mb-8">
      <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
        <i className="bi bi-cone-striped text-5xl"></i>
      </div>
      <div className="absolute -top-2 -right-2 h-10 w-10 bg-amber-500 rounded-full flex items-center justify-center text-white border-4 border-white animate-bounce">
        <i className="bi bi-hammer text-xl"></i>
      </div>
    </div>
    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Halaman Sedang Maintenance</h3>
    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-4 max-w-md leading-relaxed">
      Mohon maaf atas ketidaknyamanannya. Administrator sedang memperbarui data atau melakukan pemeliharaan pada modul ini untuk performa yang lebih baik.
    </p>
    <div className="mt-10 flex gap-4">
      <Link to="/" className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">Kembali ke Beranda</Link>
    </div>
  </div>
);

const PageWrapper = ({ children, module }: { children?: React.ReactNode, module: string }) => {
  const { isSuperadmin } = useAuth();
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = () => {
      if (isSuperadmin) {
        setIsMaintenance(false);
        return;
      }
      
      const configRaw = localStorage.getItem('maintenance_config');
      if (configRaw) {
        const config: MaintenanceConfig = JSON.parse(configRaw);
        if (config.all || config.pages.includes(module)) {
          setIsMaintenance(true);
        } else {
          setIsMaintenance(false);
        }
      }
    };

    checkMaintenance();
    window.addEventListener('storage_updated', checkMaintenance);
    return () => window.removeEventListener('storage_updated', checkMaintenance);
  }, [module, isSuperadmin]);

  if (isMaintenance) return <MaintenanceScreen />;
  return <>{children}</>;
};

const ProtectedRoute = ({ children, requireAdmin = false }: { children?: React.ReactNode, requireAdmin?: boolean }) => {
  const { isAuthenticated, isSuperadmin, canEdit } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requireAdmin && !canEdit) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dateTime, setDateTime] = useState(new Date());
  
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);
  const [runningText, setRunningText] = useState('Selamat Datang di Portal SDM Direktorat Jenderal Kekayaan Intelektual - Kementerian Hukum RI.');
  
  const location = useLocation();
  const { user, logout, isSuperadmin, canEdit, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    
    const handleStorageSync = () => {
      const savedName = localStorage.getItem('portal_system_name');
      if (savedName) {
        setSystemName(savedName);
        document.title = savedName; 
      } else {
        document.title = "Portal SDM - DJKI Kemenkum RI";
      }

      const savedLogo = localStorage.getItem('portal_system_logo');
      if (savedLogo) setSystemLogo(savedLogo);
      else setSystemLogo(DEFAULT_LOGO);

      const savedText = localStorage.getItem('portal_running_text');
      if (savedText) setRunningText(savedText);
    };
    
    handleStorageSync();
    window.addEventListener('storage_updated', handleStorageSync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage_updated', handleStorageSync);
    };
  }, []);

  if (!isAuthenticated && location.pathname !== '/login') return <Navigate to="/login" />;
  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/" /> : <LoginPage />;

  const pageTitle = () => {
    if (location.pathname.includes('pelantikan-gen')) return 'Berita Acara Pelantikan';
    if (location.pathname === '/skp') return user?.role === 'Viewer' ? 'SKP Saya' : 'Evaluasi Kinerja (SKP)';
    switch (location.pathname) {
      case '/': return user?.role === 'Viewer' ? 'Dashboard Personal' : 'Dashboard Analytics';
      case '/pegawai': return user?.role === 'Viewer' ? 'Profil Saya' : 'Database Pegawai';
      case '/absensi-online': return 'Absensi Face Recognition';
      case '/rekap-absensi': return 'Riwayat Kehadiran';
      case '/layanan': return user?.role === 'Viewer' ? 'Karir Saya' : 'Layanan Karir';
      case '/tugas-rutin': return 'Tugas Rutin';
      case '/laporan': return 'Laporan';
      case '/kegiatan': return 'Agenda';
      case '/dossiers': return user?.role === 'Viewer' ? 'Arsip Saya' : 'Dossier';
      case '/settings': return 'Settings';
      case '/logs': return 'Audit Log Aktivitas';
      default: return systemName;
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F8F9FC]">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[80] lg:hidden animate-fadeIn" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-[90] bg-[#111827] transition-all duration-300 lg:relative lg:translate-x-0 border-r border-gray-800 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full relative">
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-blue-600 text-white rounded-full p-1 border-2 border-[#111827] hover:bg-blue-700 transition-all hidden lg:flex items-center justify-center z-[100] shadow-xl active:scale-95">
            <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'left'} text-[8px]`}></i>
          </button>

          <div className={`pt-8 pb-4 flex flex-col items-center ${isCollapsed ? 'px-2' : 'px-6'}`}>
            <div className={`group relative transition-all duration-500 ${isCollapsed ? 'w-10 h-10' : 'w-14 h-14'} mb-3 flex items-center justify-center`}>
              <div className="w-full h-full shimmer-effect rounded-xl transition-transform duration-500 group-hover:scale-110">
                {systemLogo ? (
                  <img src={systemLogo} className="h-full w-full object-contain" alt="Logo" />
                ) : (
                  <i className="bi bi-shield-lock text-blue-500 text-2xl"></i>
                )}
              </div>
            </div>
            <div className={`text-center transition-all duration-500 whitespace-nowrap overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
              <h1 className="text-sm font-black text-white tracking-tight leading-none uppercase">
                {systemName.split(' ')[0]} <span className="text-blue-600">{systemName.split(' ').slice(1).join(' ')}</span>
              </h1>
              <p className="text-[6px] text-gray-500 mt-1 font-black uppercase tracking-[0.3em]">DJKI • KEMENKUM RI</p>
            </div>
          </div>
          
          <nav className="flex-1 mt-4 overflow-y-auto no-scrollbar space-y-0.5 pb-10">
            <SidebarItem to="/" icon="bi-grid-1x2-fill" label="Dashboard" active={location.pathname === '/'} collapsed={isCollapsed} />
            <SidebarItem to="/absensi-online" icon="bi-camera-fill" label="Absen Wajah" active={location.pathname === '/absensi-online'} collapsed={isCollapsed} />
            <SidebarItem to="/rekap-absensi" icon="bi-journal-check" label={user?.role === 'Viewer' ? "Riwayat Absen" : "Rekap Absensi"} active={location.pathname === '/rekap-absensi'} collapsed={isCollapsed} />
            <SidebarItem to="/pegawai" icon="bi-person-vcard-fill" label={user?.role === 'Viewer' ? "Profil Saya" : "Pegawai"} active={location.pathname === '/pegawai'} collapsed={isCollapsed} />
            <SidebarItem to="/skp" icon="bi-graph-up-arrow" label={user?.role === 'Viewer' ? "SKP Saya" : "SKP / E-Kinerja"} active={location.pathname === '/skp'} collapsed={isCollapsed} />
            <SidebarItem to="/layanan" icon="bi-briefcase-fill" label={user?.role === 'Viewer' ? "Karir Saya" : "Layanan Karir"} active={location.pathname === '/layanan'} collapsed={isCollapsed} />
            <SidebarItem to="/dossiers" icon="bi-folder-fill" label={user?.role === 'Viewer' ? "Arsip Saya" : "Dossier"} active={location.pathname === '/dossiers'} collapsed={isCollapsed} />
            
            {canEdit && (
              <>
                <div className={`px-8 py-2 text-[8px] font-black text-gray-500 uppercase tracking-widest ${isCollapsed ? 'hidden' : 'block'} mt-4`}>Admin Control</div>
                <SidebarItem to="/tugas-rutin" icon="bi-clipboard2-check-fill" label="Tugas Rutin" active={location.pathname === '/tugas-rutin'} collapsed={isCollapsed} />
                <SidebarItem to="/laporan" icon="bi-file-earmark-bar-graph-fill" label="Laporan" active={location.pathname === '/laporan'} collapsed={isCollapsed} />
                <SidebarItem to="/kegiatan" icon="bi-calendar3-range-fill" label="Agenda" active={location.pathname === '/kegiatan'} collapsed={isCollapsed} />
              </>
            )}

            {isSuperadmin && (
              <>
                <div className={`px-8 py-2 text-[8px] font-black text-gray-500 uppercase tracking-widest ${isCollapsed ? 'hidden' : 'block'} mt-4`}>Sistem</div>
                <SidebarItem to="/logs" icon="bi-clock-history" label="Log Aktivitas" active={location.pathname === '/logs'} collapsed={isCollapsed} />
                <SidebarItem to="/settings" icon="bi-gear-wide-connected" label="Settings" active={location.pathname === '/settings'} collapsed={isCollapsed} />
              </>
            )}
          </nav>

          <div className="p-4 mt-auto">
            <button onClick={logout} className={`flex items-center px-5 py-3 w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all rounded-xl ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <i className="bi bi-box-arrow-left text-lg"></i>
              {!isCollapsed && <span className="ml-4 font-bold text-[9px] uppercase tracking-widest">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FC] overflow-hidden relative">
        {/* Global Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none no-print">
            <h1 className="text-[10vw] font-black text-blue-900/[0.02] -rotate-[15deg] uppercase tracking-[0.4em] text-center leading-none">
              PORTAL SDM DJKI
            </h1>
        </div>

        <header className="sticky top-0 z-[70] bg-white/95 backdrop-blur-md border-b border-gray-200/50 px-4 lg:px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={toggleSidebar} className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all lg:hidden">
              <i className="bi bi-list text-xl"></i>
            </button>
            <div className="min-w-0">
              <h2 className="text-[11px] lg:text-sm font-black text-gray-900 tracking-tight leading-none uppercase truncate relative z-10">{pageTitle()}</h2>
              {/* Fix: Ganti 'hidden xs:flex' menjadi 'flex' agar jam muncul di semua ukuran layar */}
              <div className="flex items-center space-x-2 mt-1 relative z-10">
                <p className="text-[8px] lg:text-[9px] font-black text-blue-600 uppercase tracking-widest">
                  {dateTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <span className="text-[8px] text-gray-300">•</span>
                <p className="text-[8px] lg:text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  {dateTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 relative z-10">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black text-gray-900 uppercase truncate max-w-[120px]">{user?.name}</p>
              <p className="text-[7px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">{user?.role}</p>
            </div>
            <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
              {user?.foto ? <img src={user.foto} className="h-full w-full object-cover" /> : user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="bg-[#111827] text-white py-1.5 overflow-hidden shrink-0 border-b border-white/5 relative z-10">
          <div className="whitespace-nowrap animate-marquee inline-block">
            <span className="text-[7px] lg:text-[9px] font-black uppercase tracking-[0.2em] px-10 border-r border-white/20">{runningText}</span>
            <span className="text-[7px] lg:text-[9px] font-black uppercase tracking-[0.2em] px-10 border-r border-white/20">{runningText}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 lg:p-6 pb-20 lg:pb-6 relative z-10">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PageWrapper module="dashboard"><Dashboard /></PageWrapper>} />
            <Route path="/pegawai" element={<PageWrapper module="pegawai"><PegawaiPage /></PageWrapper>} />
            <Route path="/skp" element={<PageWrapper module="skp"><SKPPage /></PageWrapper>} />
            <Route path="/absensi-online" element={<PageWrapper module="absensi"><AbsensiOnlinePage /></PageWrapper>} />
            <Route path="/rekap-absensi" element={<PageWrapper module="absensi"><RekapAbsensiPage /></PageWrapper>} />
            <Route path="/layanan" element={<PageWrapper module="layanan"><LayananKepegawaianPage /></PageWrapper>} />
            <Route path="/dossiers" element={<PageWrapper module="dossier"><DossiersPage /></PageWrapper>} />
            
            {/* Protected Administrative Routes */}
            <Route path="/pelantikan-gen" element={<ProtectedRoute requireAdmin><PelantikanGeneratorPage /></ProtectedRoute>} />
            <Route path="/kegiatan" element={<ProtectedRoute requireAdmin><PageWrapper module="kegiatan"><KegiatanPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/tugas-rutin" element={<ProtectedRoute requireAdmin><PageWrapper module="tugas_rutin"><TugasRutinPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/laporan" element={<ProtectedRoute requireAdmin><PageWrapper module="laporan"><LaporanPage /></PageWrapper></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute requireAdmin><ActivityLogPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requireAdmin><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </div>
        
        <footer className="bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-1.5 relative z-10">
            <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest text-center sm:text-left">© 2025 DJKI • KEMENTERIAN HUKUM RI</p>
            <a href="https://caqiestudioproduction.com" target="_blank" rel="noopener noreferrer" className="text-[7px] font-black text-blue-600 uppercase tracking-widest hover:underline transition-all text-center sm:text-right">Developed by caqiestudioproduction.com</a>
        </footer>
      </main>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        @media print {
            .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;