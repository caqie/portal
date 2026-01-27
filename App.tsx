
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
import KGBGeneratorPage from './pages/KGBGeneratorPage';
import ActivityLogPage from './pages/ActivityLogPage';
import PensiunPage from './pages/PensiunPage';
import KenaikanPangkatPage from './pages/KenaikanPangkatPage';
import { MaintenanceConfig } from './types';
import { DEFAULT_LOGO } from './constants';
import { syncGidMap } from './spreadsheetService';

const SidebarItem = ({ to, icon, label, active, collapsed, onClick }: { to: string, icon: string, label: string, active: boolean, collapsed: boolean, onClick?: () => void }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center px-4 py-3.5 transition-all duration-300 group relative rounded-xl mx-3 mb-1 ${active ? 'bg-blue-600/10 text-blue-500' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
  >
    {active && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_12px_rgba(59,130,246,0.8)]"></div>
    )}
    
    <div className={`flex items-center justify-center ${collapsed ? 'w-full' : 'w-6'} transition-all`}>
      <i className={`bi ${icon} ${active ? 'text-blue-500' : 'text-inherit'} ${collapsed ? 'text-2xl' : 'text-lg'} transition-transform group-hover:scale-110`}></i>
    </div>
    
    <span className={`ml-4 font-bold text-[11px] uppercase tracking-[0.1em] whitespace-nowrap overflow-hidden transition-all duration-500 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
      {label}
    </span>
    
    {collapsed && (
      <div className="absolute left-16 bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10 z-[200] whitespace-nowrap uppercase tracking-widest shadow-2xl">
        {label}
      </div>
    )}
  </Link>
);

const MobileBottomNav = () => {
  const location = useLocation();
  const navs = [
    { to: '/', icon: 'bi-grid-1x2-fill', label: 'Home' },
    { to: '/absensi-online', icon: 'bi-camera-fill', label: 'Absen' },
    { to: '/pegawai', icon: 'bi-person-vcard-fill', label: 'ASN' },
    { to: '/layanan', icon: 'bi-briefcase-fill', label: 'Karir' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-2xl border-t border-gray-100 px-6 py-4 pb-10 flex justify-between items-center shadow-[0_-20px_50px_-10px_rgba(0,0,0,0.1)]">
      {navs.map(nav => {
        const isActive = location.pathname === nav.to;
        return (
          <Link key={nav.to} to={nav.to} className={`flex flex-col items-center gap-2 transition-all ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-blue-50 shadow-inner' : ''}`}>
              <i className={`bi ${nav.icon} text-2xl`}></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{nav.label}</span>
          </Link>
        );
      })}
      <Link to="/settings" className={`flex flex-col items-center gap-2 ${location.pathname === '/settings' ? 'text-blue-600' : 'text-gray-400'}`}>
         <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${location.pathname === '/settings' ? 'bg-blue-50' : ''}`}>
            <i className="bi bi-gear-wide-connected text-2xl"></i>
         </div>
         <span className="text-[9px] font-black uppercase tracking-[0.2em]">Opsi</span>
      </Link>
    </div>
  );
};

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

  if (isMaintenance) return (
    <div className="h-full w-full flex flex-col items-center justify-center p-10 text-center animate-fadeIn bg-white rounded-[3rem] border border-gray-100 shadow-sm">
      <div className="relative mb-10">
        <div className="h-32 w-32 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shadow-inner">
          <i className="bi bi-cone-striped text-6xl"></i>
        </div>
        <div className="absolute -top-3 -right-3 h-14 w-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white border-8 border-white animate-bounce shadow-xl">
          <i className="bi bi-hammer text-2xl"></i>
        </div>
      </div>
      <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">System Maintenance</h3>
      <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-6 max-w-md leading-relaxed px-6">
        Administrator sedang memperbarui core database. Silakan kembali dalam beberapa menit.
      </p>
    </div>
  );
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
  const [runningTextValue, setRunningTextValue] = useState('Selamat Datang di Portal SDM DJKI.');
  
  const location = useLocation();
  const { user, logout, isSuperadmin, canEdit, isAuthenticated } = useAuth();

  useEffect(() => { syncGidMap(); }, []);

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
      setRunningTextValue(localStorage.getItem('portal_running_text') || 'Portal SDM DJKI');
    };
    sync();
    window.addEventListener('storage_updated', sync);
    return () => { clearInterval(timer); window.removeEventListener('storage_updated', sync); };
  }, []);

  if (!isAuthenticated && location.pathname !== '/login') return <Navigate to="/login" />;
  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/" /> : <LoginPage />;

  const pageTitle = () => {
    if (location.pathname === '/pelantikan-gen') return 'Pelantikan Hub';
    if (location.pathname === '/spmt-spp') return 'Digital TND';
    if (location.pathname === '/skp') return 'Performance';
    if (location.pathname === '/pak') return 'Credit Point';
    if (location.pathname === '/anjab-abk') return 'Workload Analys';
    if (location.pathname === '/kgb-gen') return 'Salaries Hub';
    if (location.pathname === '/pensiun') return 'Retirement';
    if (location.pathname === '/kenaikan-pangkat') return 'Promotion Hub';
    switch (location.pathname) {
      case '/': return 'Home Console';
      case '/pegawai': return 'Personnel DB';
      case '/absensi-online': return 'Attendance';
      case '/rekap-absensi': return 'History Logs';
      case '/layanan': return 'Career Portal';
      case '/tugas-rutin': return 'Task Manager';
      case '/laporan': return 'Consolidation';
      case '/kegiatan': return 'Daily Agenda';
      case '/dossiers': return 'Cloud Dossier';
      case '/settings': return 'Core Config';
      case '/logs': return 'Audit History';
      default: return systemName;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F8F9FC] text-gray-900 font-['Inter']">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] lg:hidden animate-fadeIn" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* SIDEBAR MAIN CONTAINER */}
      <aside className={`fixed inset-y-0 left-0 z-[120] bg-[#0f172a] transition-all duration-500 lg:relative lg:translate-x-0 border-r border-white/5 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <div className="flex flex-col h-full relative">
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="absolute -right-3.5 top-10 bg-blue-600 text-white rounded-full h-7 w-7 border-4 border-[#0f172a] hover:bg-blue-500 transition-all hidden lg:flex items-center justify-center z-[130] shadow-xl"
          >
            <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'} text-[10px]`}></i>
          </button>

          {/* Logo & Branding Area - White Background & Shimmer Effect */}
          <div className={`pt-10 pb-8 flex flex-col items-center ${isCollapsed ? 'px-2' : 'px-8'}`}>
            <Link to="/" className={`relative transition-all duration-500 ${isCollapsed ? 'w-14 h-14' : 'w-24 h-24'} mb-4 active:scale-95`}>
                <div className="w-full h-full bg-white rounded-2xl p-2 border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden group hover:shadow-blue-500/40 transition-all shimmer-effect">
                   {systemLogo ? <img src={systemLogo} className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500" /> : <i className="bi bi-shield-lock text-blue-500 text-2xl"></i>}
                </div>
            </Link>
            <div className={`text-center transition-all duration-500 whitespace-nowrap overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
              <h1 className="text-[13px] font-black text-white tracking-tighter uppercase leading-none">
                {systemName.split(' ')[0]} <span className="text-blue-500">{systemName.split(' ').slice(1).join(' ')}</span>
              </h1>
              <p className="text-[7px] text-slate-500 mt-2 font-black uppercase tracking-[0.3em]">Kementerian Hukum</p>
            </div>
          </div>
          
          <nav className="flex-1 mt-4 overflow-y-auto no-scrollbar space-y-0.5 pb-20">
            <div className={`px-8 py-3 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ${isCollapsed ? 'hidden' : 'block'}`}>Utama</div>
            <SidebarItem to="/" icon="bi-grid-1x2-fill" label="Home" active={location.pathname === '/'} collapsed={isCollapsed} />
            <SidebarItem to="/absensi-online" icon="bi-camera-fill" label="Absen Wajah" active={location.pathname === '/absensi-online'} collapsed={isCollapsed} />
            <SidebarItem to="/pegawai" icon="bi-person-vcard-fill" label="Pegawai" active={location.pathname === '/pegawai'} collapsed={isCollapsed} />
            <SidebarItem to="/layanan" icon="bi-briefcase-fill" label="Karir" active={['/layanan', '/skp', '/pak', '/anjab-abk', '/spmt-spp', '/pelantikan-gen', '/kgb-gen', '/pensiun', '/kenaikan-pangkat'].includes(location.pathname)} collapsed={isCollapsed} />
            
            {(canEdit || isSuperadmin) && (
              <>
                <div className={`px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ${isCollapsed ? 'hidden' : 'block'}`}>Administrasi</div>
                <SidebarItem to="/tugas-rutin" icon="bi-clipboard2-check-fill" label="Log Tugas" active={location.pathname === '/tugas-rutin'} collapsed={isCollapsed} />
                <SidebarItem to="/laporan" icon="bi-file-earmark-bar-graph-fill" label="Generator" active={location.pathname === '/laporan'} collapsed={isCollapsed} />
                <SidebarItem to="/dossiers" icon="bi-folder-fill" label="Cloud Dossier" active={location.pathname === '/dossiers'} collapsed={isCollapsed} />
              </>
            )}

            {isSuperadmin && (
              <>
                <div className={`px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ${isCollapsed ? 'hidden' : 'block'}`}>Konfigurasi</div>
                <SidebarItem to="/logs" icon="bi-clock-history" label="Audit Logs" active={location.pathname === '/logs'} collapsed={isCollapsed} />
                <SidebarItem to="/settings" icon="bi-gear-wide-connected" label="Settings" active={location.pathname === '/settings'} collapsed={isCollapsed} />
              </>
            )}
          </nav>

          <div className="p-4 mt-auto hidden lg:block border-t border-white/5">
            <button 
              onClick={logout} 
              className={`flex items-center px-4 py-3.5 w-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all rounded-xl ${isCollapsed ? 'justify-center' : ''}`}
              title="Logout System"
            >
              <i className="bi bi-power text-xl"></i>
              {!isCollapsed && <span className="ml-4 font-bold text-[11px] uppercase tracking-widest">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FC] relative overflow-hidden">
        <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-gray-100 px-6 md:px-10 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="h-10 w-10 flex items-center justify-center text-gray-900 bg-gray-50 rounded-xl lg:hidden active:scale-90 transition-all">
              <i className="bi bi-list text-2xl"></i>
            </button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-black text-gray-950 tracking-tighter uppercase truncate leading-none">{pageTitle()}</h2>
              <div className="flex items-center space-x-2 mt-1.5 overflow-hidden">
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest shrink-0">{dateTime.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                <span className="text-gray-200 shrink-0">•</span>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{dateTime.toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long'})}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-black text-gray-950 uppercase leading-none truncate max-w-[180px]">{user?.name}</p>
              <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest mt-1.5">{user?.role}</p>
            </div>
            <div className="h-11 w-11 md:h-12 md:w-12 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-blue-600 flex items-center justify-center text-white font-black shrink-0 relative group cursor-pointer active:scale-95 transition-all">
              {user?.foto ? <img src={user.foto} className="h-full w-full object-cover" /> : user?.name.charAt(0)}
            </div>
          </div>
        </header>

        <div className="bg-slate-900 text-white py-2 overflow-hidden shrink-0 border-b border-white/5 relative z-10">
          <div className="whitespace-nowrap animate-marquee inline-block">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] px-16 opacity-80">{runningTextValue}</span>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] px-16 opacity-80">{runningTextValue}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:p-12 pb-40 lg:pb-12 relative">
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
                <Route path="/kgb-gen" element={<ProtectedRoute requireAdmin><KGBGeneratorPage /></ProtectedRoute>} />
                <Route path="/pensiun" element={<PageWrapper module="pensiun"><PensiunPage /></PageWrapper>} />
                <Route path="/kenaikan-pangkat" element={<PageWrapper module="pangkat"><KenaikanPangkatPage /></PageWrapper>} />
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

        <MobileBottomNav />
      </main>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 40s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @media print { .no-print { display: none !important; } }
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
