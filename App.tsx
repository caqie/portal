
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
import SatyaLencanaPage from './pages/SatyaLencanaPage';
import MagangPKLPage from './pages/MagangPKLPage';
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

const AppContent = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1440);
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);
  
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

  useEffect(() => {
    const sync = () => {
      const name = localStorage.getItem('portal_system_name');
      if (name) { setSystemName(name); document.title = name; }
      setSystemLogo(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
    };
    sync();
    window.addEventListener('storage_updated', sync);
    return () => { window.removeEventListener('storage_updated', sync); };
  }, []);

  if (!isAuthenticated && location.pathname !== '/login') return <Navigate to="/login" />;
  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/" /> : <LoginPage />;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[#F8F9FC] text-gray-900 font-['Inter']">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[110] lg:hidden animate-fadeIn" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-[120] bg-[#0f172a] transition-all duration-500 lg:relative lg:translate-x-0 border-r border-white/5 flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <div className="flex flex-col h-full relative">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="absolute -right-3.5 top-10 bg-blue-600 text-white rounded-full h-7 w-7 border-4 border-[#0f172a] hover:bg-blue-500 transition-all hidden lg:flex items-center justify-center z-[130] shadow-xl"
          >
            <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'} text-[10px]`}></i>
          </button>

          <div className={`pt-10 pb-8 flex flex-col items-center ${isCollapsed ? 'px-2' : 'px-8'}`}>
            <Link to="/" className={`relative transition-all duration-500 ${isCollapsed ? 'w-14 h-14' : 'w-24 h-24'} mb-4 active:scale-95 group`}>
                <div className="w-full h-full bg-white rounded-2xl p-2.5 border-4 border-white ring-1 ring-white/10 shadow-2xl flex items-center justify-center overflow-hidden shimmer-effect">
                   <img src={systemLogo || DEFAULT_LOGO} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-110" />
                </div>
            </Link>
            <div className={`text-center transition-all duration-500 whitespace-nowrap overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
              <h1 className="text-[11px] font-black text-white tracking-tighter uppercase leading-none">
                {systemName}
              </h1>
              <p className="text-[7px] text-slate-500 mt-2 font-black uppercase tracking-[0.3em]">SDM HUB DJKI</p>
            </div>
          </div>
          
          <nav className="flex-1 mt-4 overflow-y-auto no-scrollbar space-y-0.5 pb-20">
            <SidebarItem to="/" icon="bi-grid-1x2-fill" label="Dashboard" active={location.pathname === '/'} collapsed={isCollapsed} />
            <SidebarItem to="/pegawai" icon="bi-person-vcard-fill" label="Database Pegawai" active={location.pathname === '/pegawai'} collapsed={isCollapsed} />
            <SidebarItem to="/layanan" icon="bi-briefcase-fill" label="Layanan Karir" active={['/layanan', '/kenaikan-pangkat', '/skp', '/pak', '/anjab-abk', '/pensiun', '/kgb-gen', '/spmt-spp', '/pelantikan-gen', '/satya-lencana', '/magang-pkl'].some(p => location.pathname.startsWith(p))} collapsed={isCollapsed} />
            
            {(canEdit || isSuperadmin) && (
              <>
                <div className={`px-8 py-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ${isCollapsed ? 'hidden' : 'block'}`}>Administrasi</div>
                <SidebarItem to="/tugas-rutin" icon="bi-clipboard2-check-fill" label="Tugas Rutin" active={location.pathname === '/tugas-rutin'} collapsed={isCollapsed} />
                <SidebarItem to="/kegiatan" icon="bi-calendar2-event-fill" label="Agenda Kegiatan" active={location.pathname === '/kegiatan'} collapsed={isCollapsed} />
                <SidebarItem to="/laporan" icon="bi-file-earmark-bar-graph-fill" label="Laporan Bulanan" active={location.pathname === '/laporan'} collapsed={isCollapsed} />
                <SidebarItem to="/dossiers" icon="bi-folder-fill" label="E-Dossier Digital" active={location.pathname === '/dossiers'} collapsed={isCollapsed} />
              </>
            )}

            {isSuperadmin && (
              <>
                <div className={`px-8 py-4 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ${isCollapsed ? 'hidden' : 'block'}`}>Sistem</div>
                <SidebarItem to="/logs" icon="bi-clock-history" label="Audit Activity Log" active={location.pathname === '/logs'} collapsed={isCollapsed} />
                <SidebarItem to="/settings" icon="bi-gear-fill" label="Pengaturan Sistem" active={location.pathname === '/settings'} collapsed={isCollapsed} />
              </>
            )}
          </nav>
          <div className="p-4 mt-auto hidden lg:block border-t border-white/5">
            <button onClick={logout} className={`flex items-center px-4 py-3.5 w-full text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all rounded-xl ${isCollapsed ? 'justify-center' : ''}`}>
              <i className="bi bi-power text-xl"></i>
              {!isCollapsed && <span className="ml-4 font-bold text-[11px] uppercase tracking-widest">Keluar</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#F8F9FC] relative overflow-hidden">
        <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-gray-100 px-6 md:px-10 py-4 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden h-10 w-10 flex items-center justify-center bg-gray-100 rounded-xl"><i className="bi bi-list text-xl"></i></button>
              <h2 className="text-lg font-black uppercase tracking-tighter text-gray-950">Portal SDM <span className="text-blue-600">Integrasi</span></h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black uppercase text-gray-900 leading-none">{user?.name}</p>
                 <p className="text-[7px] font-bold text-blue-600 uppercase mt-1 tracking-widest">{user?.role}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black overflow-hidden shadow-lg border-2 border-white">
                 {user?.foto ? <img src={user.foto} className="h-full w-full object-cover" /> : user?.name.charAt(0)}
              </div>
           </div>
        </header>
        <div className="bg-slate-900 text-white py-1.5 overflow-hidden shrink-0 border-b border-white/5">
          <div className="whitespace-nowrap animate-marquee inline-block">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-16 opacity-70">SISTEM INTEGRASI KEPEGAWAIAN DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL • KEMENTERIAN HUKUM RI</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative custom-scrollbar">
          <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pegawai" element={<PegawaiPage />} />
              <Route path="/layanan" element={<LayananKepegawaianPage />} />
              <Route path="/tugas-rutin" element={<TugasRutinPage />} />
              <Route path="/kegiatan" element={<KegiatanPage />} />
              <Route path="/laporan" element={<LaporanPage />} />
              <Route path="/dossiers" element={<DossiersPage />} />
              <Route path="/logs" element={<ActivityLogPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/kenaikan-pangkat" element={<KenaikanPangkatPage />} />
              <Route path="/skp" element={<SKPPage />} />
              <Route path="/pak" element={<PAKPage />} />
              <Route path="/anjab-abk" element={<ABKAnjabPage />} />
              <Route path="/pensiun" element={<PensiunPage />} />
              <Route path="/kgb-gen" element={<KGBGeneratorPage />} />
              <Route path="/spmt-spp" element={<SpmtSppPage />} />
              <Route path="/pelantikan-gen" element={<PelantikanGeneratorPage />} />
              <Route path="/satya-lencana" element={<SatyaLencanaPage />} />
              <Route path="/magang-pkl" element={<MagangPKLPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <HashRouter>
      <AppContent />
    </HashRouter>
  </AuthProvider>
);

export default App;
