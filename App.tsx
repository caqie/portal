
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
import SpmtSppPage from './pages/SpmtSppPage';
import AbsensiOnlinePage from './pages/AbsensiOnlinePage';
import RekapAbsensiPage from './pages/RekapAbsensiPage';
import SKPPage from './pages/SKPPage';
import PAKPage from './pages/PAKPage';
import ABKAnjabPage from './pages/ABKAnjabPage';
import ActivityLogPage from './pages/ActivityLogPage';
import { MaintenanceConfig } from './types';
import { DEFAULT_LOGO } from './constants';

const SidebarItem = ({ to, icon, label, active, collapsed, onClick }: { to: string, icon: string, label: string, active: boolean, collapsed: boolean, onClick?: () => void }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center px-5 py-3.5 transition-all duration-300 group relative rounded-2xl mx-2 mb-1 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
  >
    <i className={`bi ${icon} text-xl flex-shrink-0 transition-transform group-hover:scale-110`}></i>
    <span className={`ml-4 font-bold text-[10px] uppercase tracking-[0.2em] whitespace-nowrap overflow-hidden transition-all duration-500 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
      {label}
    </span>
    {active && collapsed && (
      <div className="absolute right-0 w-1 h-6 bg-white rounded-l-full"></div>
    )}
  </Link>
);

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const navs = [
    { to: '/', icon: 'bi-grid-1x2-fill', label: 'Home' },
    { to: '/absensi-online', icon: 'bi-camera-fill', label: 'Absen' },
    { to: '/pegawai', icon: 'bi-person-vcard-fill', label: 'Pegawai' },
    { to: '/dossiers', icon: 'bi-folder-fill', label: 'Arsip' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-3 pb-8 flex justify-between items-center shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
      {navs.map(nav => (
        <Link key={nav.to} to={nav.to} className={`flex flex-col items-center gap-1 transition-all ${location.pathname === nav.to ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${location.pathname === nav.to ? 'bg-blue-50' : ''}`}>
            <i className={`bi ${nav.icon} text-lg`}></i>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">{nav.label}</span>
        </Link>
      ))}
      <Link to="/settings" className={`flex flex-col items-center gap-1 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400'}`}>
         <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${location.pathname === '/settings' ? 'bg-blue-50' : ''}`}>
            <i className="bi bi-gear-wide-connected text-lg"></i>
         </div>
         <span className="text-[8px] font-black uppercase tracking-widest">Opsi</span>
      </Link>
    </div>
  );
};

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
    <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mt-4 max-w-md leading-relaxed">
      Administrator sedang memperbarui data. Silakan kembali beberapa saat lagi.
    </p>
    <div className="mt-10 flex gap-4">
      <Link to="/" className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Kembali ke Beranda</Link>
    </div>
  </div>
);

const PageWrapper = ({ children, module }: { children?: React.ReactNode, module: string }) => {
  const { isSuperadmin } = useAuth();
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const checkMaintenance = () => {
      if (isSuperadmin) { setIsMaintenance(false); return; }
      const configRaw = localStorage.getItem('maintenance_config');
      if (configRaw) {
        const config: MaintenanceConfig = JSON.parse(configRaw);
        setIsMaintenance(config.all || config.pages.includes(module));
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
  const { isAuthenticated, canEdit } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requireAdmin && !canEdit) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1440);
  const [dateTime, setDateTime] = useState(new Date());
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);
  const [runningText, setRunningText] = useState('Selamat Datang di Portal SDM DJKI.');
  
  const location = useLocation();
  const { user, logout, isSuperadmin, canEdit, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
      
      if (window.innerWidth < 1440) setIsCollapsed(true);
      else setIsCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    const sync = () => {
      const name = localStorage.getItem('portal_system_name');
      if (name) { setSystemName(name); document.title = name; }
      setSystemLogo(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
      setRunningText(localStorage.getItem('portal_running_text') || 'Portal SDM DJKI');
    };
    sync();
    window.addEventListener('storage_updated', sync);
    return () => { clearInterval(timer); window.removeEventListener('storage_updated', sync); };
  }, []);

  if (!isAuthenticated && location.pathname !== '/login') return <Navigate to="/login" />;
  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/" /> : <LoginPage />;

  const pageTitle = () => {
    if (location.pathname.includes('pelantikan-gen')) return 'Berita Acara Pelantikan';
    if (location.pathname === '/spmt-spp') return 'Generator SPMT & SPP';
    if (location.pathname === '/skp') return user?.role === 'Viewer' ? 'SKP Saya' : 'SKP / E-Kinerja';
    if (location.pathname === '/pak') return user?.role === 'Viewer' ? 'PAK Saya' : 'Angka Kredit';
    if (location.pathname === '/anjab-abk') return 'Analisis Beban Kerja';
    switch (location.pathname) {
      case '/': return user?.role === 'Viewer' ? 'Personal' : 'Analytics';
      case '/pegawai': return user?.role === 'Viewer' ? 'Profil' : 'Pegawai';
      case '/absensi-online': return 'Presensi';
      case '/rekap-absensi': return 'Riwayat';
      case '/layanan': return 'Karir';
      case '/tugas-rutin': return 'Tugas';
      case '/laporan': return 'Laporan';
      case '/kegiatan': return 'Agenda';
      case '/dossiers': return 'Arsip';
      case '/settings': return 'Settings';
      case '/logs': return 'Logs';
      default: return systemName;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F8F9FC] text-gray-900 font-['Inter']">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[110] lg:hidden animate-fadeIn" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-[120] bg-[#111827] transition-all duration-500 lg:relative lg:translate-x-0 border-r border-white/5 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full relative">
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-12 bg-blue-600 text-white rounded-full p-1.5 border-4 border-[#111827] hover:bg-blue-700 transition-all hidden lg:flex items-center justify-center z-[130] shadow-xl">
            <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'left'} text-[10px] font-black`}></i>
          </button>

          <div className={`pt-10 pb-6 flex flex-col items-center ${isCollapsed ? 'px-2' : 'px-8'}`}>
            {/* LOGO CONTAINER WITH WHITE BACKGROUND */}
            <div className={`relative transition-all duration-500 ${isCollapsed ? 'w-12 h-12' : 'w-20 h-20'} mb-4`}>
                <div className="w-full h-full bg-white rounded-2xl p-2 shadow-2xl ring-4 ring-white/10 overflow-hidden group flex items-center justify-center">
                   {systemLogo ? <img src={systemLogo} className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500" /> : <i className="bi bi-shield-lock text-blue-600 text-2xl"></i>}
                </div>
            </div>
            <div className={`text-center transition-all duration-500 whitespace-nowrap overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
              <h1 className="text-[12px] font-black text-white tracking-tighter uppercase leading-none">
                {systemName.split(' ')[0]} <span className="text-blue-500">{systemName.split(' ').slice(1).join(' ')}</span>
              </h1>
              <p className="text-[7px] text-gray-500 mt-2 font-black uppercase tracking-[0.4em]">KEMENTERIAN HUKUM</p>
            </div>
          </div>
          
          <nav className="flex-1 mt-6 overflow-y-auto no-scrollbar space-y-1 pb-24 lg:pb-10">
            <SidebarItem to="/" icon="bi-grid-1x2-fill" label="Dashboard" active={location.pathname === '/'} collapsed={isCollapsed} />
            <SidebarItem to="/absensi-online" icon="bi-camera-fill" label="Absen Wajah" active={location.pathname === '/absensi-online'} collapsed={isCollapsed} />
            <SidebarItem to="/rekap-absensi" icon="bi-journal-check" label="Riwayat Absen" active={location.pathname === '/rekap-absensi'} collapsed={isCollapsed} />
            <SidebarItem to="/pegawai" icon="bi-person-vcard-fill" label="Pegawai" active={location.pathname === '/pegawai'} collapsed={isCollapsed} />
            <SidebarItem to="/skp" icon="bi-graph-up-arrow" label="SKP / E-Kinerja" active={location.pathname === '/skp'} collapsed={isCollapsed} />
            <SidebarItem to="/pak" icon="bi-award-fill" label="Angka Kredit" active={location.pathname === '/pak'} collapsed={isCollapsed} />
            <SidebarItem to="/layanan" icon="bi-briefcase-fill" label="Layanan Karir" active={location.pathname === '/layanan'} collapsed={isCollapsed} />
            <SidebarItem to="/anjab-abk" icon="bi-calculator-fill" label="ABK & ANJAB" active={location.pathname === '/anjab-abk'} collapsed={isCollapsed} />
            <SidebarItem to="/dossiers" icon="bi-folder-fill" label="E-Dossier" active={location.pathname === '/dossiers'} collapsed={isCollapsed} />
            
            {canEdit && (
              <>
                <div className={`px-8 py-4 text-[8px] font-black text-gray-600 uppercase tracking-[0.3em] ${isCollapsed ? 'hidden' : 'block'}`}>Admin</div>
                <SidebarItem to="/pelantikan-gen" icon="bi-award-fill" label="Pelantikan & BA" active={location.pathname === '/pelantikan-gen'} collapsed={isCollapsed} />
                <SidebarItem to="/spmt-spp" icon="bi-file-earmark-text-fill" label="SPMT & SPP" active={location.pathname === '/spmt-spp'} collapsed={isCollapsed} />
                <SidebarItem to="/tugas-rutin" icon="bi-clipboard2-check-fill" label="Tugas Rutin" active={location.pathname === '/tugas-rutin'} collapsed={isCollapsed} />
                <SidebarItem to="/laporan" icon="bi-file-earmark-bar-graph-fill" label="Laporan" active={location.pathname === '/laporan'} collapsed={isCollapsed} />
                <SidebarItem to="/kegiatan" icon="bi-calendar3-range-fill" label="Agenda" active={location.pathname === '/kegiatan'} collapsed={isCollapsed} />
              </>
            )}

            {isSuperadmin && (
              <>
                <div className={`px-8 py-4 text-[8px] font-black text-gray-600 uppercase tracking-[0.3em] ${isCollapsed ? 'hidden' : 'block'}`}>Sistem</div>
                <SidebarItem to="/logs" icon="bi-clock-history" label="Audit Log" active={location.pathname === '/logs'} collapsed={isCollapsed} />
                <SidebarItem to="/settings" icon="bi-gear-wide-connected" label="Settings" active={location.pathname === '/settings'} collapsed={isCollapsed} />
              </>
            )}
          </nav>

          <div className="p-4 mt-auto hidden lg:block">
            <button onClick={logout} className={`flex items-center px-5 py-4 w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all rounded-2xl ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <i className="bi bi-power text-xl"></i>
              {!isCollapsed && <span className="ml-4 font-bold text-[10px] uppercase tracking-widest">Keluar Sistem</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FC] relative overflow-hidden">
        {/* Universal Header */}
        <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 text-gray-900 bg-gray-50 rounded-2xl lg:hidden">
              <i className="bi bi-list text-xl"></i>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                 <h2 className="text-sm md:text-lg font-black text-gray-950 tracking-tighter uppercase truncate leading-none">{pageTitle()}</h2>
                 <span className="hidden md:inline-block px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded-md uppercase animate-pulse">Live</span>
              </div>
              <div className="flex items-center space-x-2 mt-1.5 overflow-hidden">
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider shrink-0">{dateTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                <span className="text-gray-200 shrink-0">|</span>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{dateTime.toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-gray-900 uppercase leading-none truncate max-w-[150px]">{user?.name}</p>
              <p className="text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1.5">{user?.role}</p>
            </div>
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-blue-600 flex items-center justify-center text-white font-black shrink-0 relative group cursor-pointer">
              {user?.foto ? <img src={user.foto} className="h-full w-full object-cover" /> : user?.name.charAt(0)}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" onClick={logout}>
                 <i className="bi bi-power text-xl"></i>
              </div>
            </div>
          </div>
        </header>

        {/* Marquee Info Bar */}
        <div className="bg-[#111827] text-white py-2 overflow-hidden shrink-0 border-b border-white/5 relative z-10">
          <div className="whitespace-nowrap animate-marquee inline-block">
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] px-12 border-r border-white/10">{runningText}</span>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] px-12 border-r border-white/10">{runningText}</span>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 lg:p-10 pb-32 lg:pb-10 relative">
          <div className="max-w-[1600px] mx-auto w-full">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<PageWrapper module="dashboard"><Dashboard /></PageWrapper>} />
                <Route path="/pegawai" element={<PageWrapper module="pegawai"><PegawaiPage /></PageWrapper>} />
                <Route path="/skp" element={<PageWrapper module="skp"><SKPPage /></PageWrapper>} />
                <Route path="/pak" element={<PageWrapper module="pak"><PAKPage /></PageWrapper>} />
                <Route path="/anjab-abk" element={<PageWrapper module="anjab"><ABKAnjabPage /></PageWrapper>} />
                <Route path="/absensi-online" element={<PageWrapper module="absensi"><AbsensiOnlinePage /></PageWrapper>} />
                <Route path="/rekap-absensi" element={<PageWrapper module="absensi"><RekapAbsensiPage /></PageWrapper>} />
                <Route path="/layanan" element={<PageWrapper module="layanan"><LayananKepegawaianPage /></PageWrapper>} />
                <Route path="/dossiers" element={<PageWrapper module="dossier"><DossiersPage /></PageWrapper>} />
                
                <Route path="/spmt-spp" element={<ProtectedRoute requireAdmin><SpmtSppPage /></ProtectedRoute>} />
                <Route path="/pelantikan-gen" element={<ProtectedRoute requireAdmin><PelantikanGeneratorPage /></ProtectedRoute>} />
                <Route path="/kegiatan" element={<ProtectedRoute requireAdmin><PageWrapper module="kegiatan"><KegiatanPage /></PageWrapper></ProtectedRoute>} />
                <Route path="/tugas-rutin" element={<ProtectedRoute requireAdmin><PageWrapper module="tugas_rutin"><TugasRutinPage /></PageWrapper></ProtectedRoute>} />
                <Route path="/laporan" element={<ProtectedRoute requireAdmin><PageWrapper module="laporan"><LaporanPage /></PageWrapper></ProtectedRoute>} />
                <Route path="/logs" element={<ProtectedRoute requireAdmin><ActivityLogPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requireAdmin><SettingsPage /></ProtectedRoute>} />
            </Routes>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <MobileBottomNav />
      </main>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        
        /* Premium Table Transitions */
        tr { transition: all 0.2s ease-in-out; }
        
        @media print { .no-print { display: none !important; } }
        
        /* Mobile Touch Optimizations */
        @media (max-width: 1024px) {
           button:active { transform: scale(0.96); }
           .card-hover:active { transform: scale(0.98); }
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
