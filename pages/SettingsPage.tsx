
import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';

const SettingsPage = () => {
  const { isSuperadmin, logActivity } = useAuth();
  const [activeTab, setActiveTab] = useState('general_setting');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'offline' | 'checking'>('checking');
  
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({});
  
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);
  const [runningTextValue, setRunningTextValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>({
    all: false,
    pages: []
  });

  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: '',
    pegawaiGid: ''
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig>({
    driveFolderId: '',
    appsScriptUrl: '',
    logoUrl: ''
  });

  const SYSTEM_MODULES = [
    { id: 'dashboard', label: 'Dashboard & Analytics', icon: 'bi-grid-1x2' },
    { id: 'pegawai', label: 'Database Pegawai', icon: 'bi-person-vcard' },
    { id: 'skp', label: 'Evaluasi SKP / E-Kinerja', icon: 'bi-graph-up-arrow' },
    { id: 'layanan', label: 'Layanan Karir & PAK', icon: 'bi-briefcase' },
    { id: 'absensi', label: 'Presensi Wajah & Rekap', icon: 'bi-camera' },
    { id: 'tugas_rutin', label: 'Manajemen Tugas Rutin', icon: 'bi-clipboard2-check' },
    { id: 'laporan', label: 'Pusat Pelaporan (REP)', icon: 'bi-file-earmark-bar-graph' },
    { id: 'kegiatan', label: 'Agenda & Logistik', icon: 'bi-calendar3-range' },
    { id: 'dossier', label: 'E-Dossier (Arsip Digital)', icon: 'bi-folder' },
  ];

  useEffect(() => {
    checkConnection();
    
    const savedName = localStorage.getItem('portal_system_name');
    if (savedName) setSystemName(savedName);
    
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setSystemLogo(savedLogo);
    else setSystemLogo(DEFAULT_LOGO);

    const savedText = localStorage.getItem('portal_running_text');
    if (savedText) setRunningTextValue(savedText);

    const savedId = localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4';
    const savedGid = localStorage.getItem('db_pegawai_gid') || '1631838106';
    setDbConfig({ spreadsheetId: savedId, pegawaiGid: savedGid });

    const savedCloud = localStorage.getItem('portal_cloud_config');
    if (savedCloud) setCloudConfig(JSON.parse(savedCloud));

    const savedMaintenance = localStorage.getItem('maintenance_config');
    if (savedMaintenance) setMaintenanceConfig(JSON.parse(savedMaintenance));

    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) return alert("Ukuran logo maksimal 1MB");
      const reader = new FileReader();
      reader.onloadend = () => {
        setSystemLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveGeneralSetting = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portal_system_name', systemName);
    localStorage.setItem('portal_running_text', runningTextValue);
    if (systemLogo && systemLogo !== DEFAULT_LOGO) {
      localStorage.setItem('portal_system_logo', systemLogo);
    } else if (systemLogo === DEFAULT_LOGO) {
      localStorage.removeItem('portal_system_logo');
    }
    
    window.dispatchEvent(new Event('storage_updated'));
    logActivity('UPDATE', 'Settings', 'Memperbarui branding sistem (Nama & Logo).');
    alert('Pengaturan umum berhasil disimpan.');
  };

  const handleSaveCloud = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portal_cloud_config', JSON.stringify(cloudConfig));
    logActivity('UPDATE', 'Cloud Settings', 'Memperbarui konfigurasi Google Drive.');
    alert('Konfigurasi Cloud Storage berhasil disimpan.');
  };

  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId);
    localStorage.setItem('db_pegawai_gid', dbConfig.pegawaiGid);
    logActivity('UPDATE', 'Database', 'Mengubah sumber data spreadsheet.');
    alert('Konfigurasi Database diperbarui.');
    window.location.reload();
  };

  const toggleMaintenancePage = (pageId: string) => {
    setMaintenanceConfig(prev => {
      const newPages = prev.pages.includes(pageId)
        ? prev.pages.filter(p => p !== pageId)
        : [...prev.pages, pageId];
      return { ...prev, pages: newPages };
    });
  };

  const handleSaveMaintenance = () => {
    localStorage.setItem('maintenance_config', JSON.stringify(maintenanceConfig));
    window.dispatchEvent(new Event('storage_updated'));
    alert('Status pemeliharaan diperbarui.');
  };

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      await fetchUsersFromSheets();
      setDbStatus('connected');
    } catch {
      setDbStatus('offline');
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const savedLocal = localStorage.getItem('portal_users_db');
      if (savedLocal) setAdminUsers(JSON.parse(savedLocal));
      else {
        const data = await fetchUsersFromSheets();
        setAdminUsers(data);
      }
    } catch (err) { console.error(err); } finally { setLoadingUsers(false); }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedList: AdminUser[];
    if (editingUser) {
      updatedList = adminUsers.map(u => u.id === editingUser.id ? { ...u, ...userFormData } as AdminUser : u);
    } else {
      updatedList = [{ id: Date.now().toString(), ...userFormData } as AdminUser, ...adminUsers];
    }
    setAdminUsers(updatedList);
    localStorage.setItem('portal_users_db', JSON.stringify(updatedList));
    setIsUserModalOpen(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden animate-fadeIn min-h-[70vh] mb-20">
      <div className="bg-gray-900 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`h-2 w-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'} `}></span>
          <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Mode: {dbStatus === 'connected' ? 'Cloud Synced' : 'Offline'}</span>
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-gray-50/20 overflow-x-auto no-scrollbar">
        {[
          { id: 'general_setting', label: 'General Setting', icon: 'bi-palette-fill' },
          { id: 'cloud', label: 'Google Drive', icon: 'bi-cloud-fill' },
          { id: 'users', label: 'Pengguna', icon: 'bi-shield-lock' },
          { id: 'database', label: 'Spreadsheet', icon: 'bi-table' },
          { id: 'maintenance', label: 'Maintenance', icon: 'bi-tools' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-10 py-7 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center space-x-3 shrink-0 ${activeTab === tab.id ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
            <i className={`bi ${tab.icon} text-base`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-10">
        {activeTab === 'general_setting' && (
          <form onSubmit={handleSaveGeneralSetting} className="max-w-4xl space-y-10 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <div className="col-span-full border-b pb-2"><h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Branding Portal</h6></div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase pl-2">Nama Portal / Sistem</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold shadow-sm focus:bg-white focus:border-blue-500 transition-all" 
                      value={systemName} 
                      onChange={(e) => setSystemName(e.target.value)} 
                      placeholder="Contoh: Portal SDM DJKI"
                    />
                    <p className="text-[8px] text-gray-400 font-bold uppercase pl-2 mt-1 italic">* Nama ini akan muncul di Judul Browser, Sidebar, dan Halaman Login.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase pl-2">Pengumuman Berjalan (Running Text)</label>
                    <textarea 
                      rows={3} 
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold shadow-sm focus:bg-white focus:border-blue-500 transition-all resize-none" 
                      value={runningTextValue} 
                      onChange={(e) => setRunningTextValue(e.target.value)} 
                    />
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="col-span-full border-b pb-2"><h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Logo Kustom</h6></div>
                  
                  <div className="flex flex-col items-center p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 border-dashed">
                     <div className="h-32 w-32 rounded-[2rem] bg-white border-2 border-white shadow-xl overflow-hidden mb-6 flex items-center justify-center relative group">
                        {systemLogo ? (
                          <img src={systemLogo} className="w-full h-full object-contain p-2" alt="Preview Logo" />
                        ) : (
                          <i className="bi bi-shield-lock-fill text-5xl text-gray-200"></i>
                        )}
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white"
                        >
                          <i className="bi bi-camera text-2xl"></i>
                          <span className="text-[8px] font-black uppercase mt-1">Ganti Logo</span>
                        </button>
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                     <div className="text-center">
                        <p className="text-[10px] font-black text-gray-900 uppercase">Logo Sistem</p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">PNG/JPG (Maks 1MB)</p>
                     </div>
                  </div>
                  
                  {systemLogo && systemLogo !== DEFAULT_LOGO && (
                    <button 
                      type="button" 
                      onClick={() => setSystemLogo(DEFAULT_LOGO)}
                      className="w-full py-2.5 text-[8px] font-black uppercase text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all"
                    >
                      Reset ke Ikon Default
                    </button>
                  )}
               </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
               <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                 <i className="bi bi-check-circle-fill mr-2"></i> Simpan Pengaturan Branding
               </button>
            </div>
          </form>
        )}

        {activeTab === 'cloud' && (
          <form onSubmit={handleSaveCloud} className="max-w-3xl space-y-8 animate-fadeIn">
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-3xl flex items-start space-x-4">
                <i className="bi bi-info-circle-fill text-blue-600 text-xl"></i>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-blue-600 uppercase">Integrasi Google Drive</p>
                  <p className="text-[9px] text-blue-500 leading-relaxed uppercase">Gunakan Google Apps Script sebagai API untuk mengunggah file (Foto & Dossier) langsung ke Google Drive guna menghindari limitasi penyimpanan Spreadsheet.</p>
                </div>
            </div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Root Folder ID (Google Drive)</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold" value={cloudConfig.driveFolderId} onChange={(e) => setCloudConfig({...cloudConfig, driveFolderId: e.target.value})} placeholder="Ex: 1Bh77MMU8..." /></div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Google Apps Script API URL</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold" value={cloudConfig.appsScriptUrl} onChange={(e) => setCloudConfig({...cloudConfig, appsScriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/..." /></div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Custom Logo URL (Sistem)</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold" value={cloudConfig.logoUrl} onChange={(e) => setCloudConfig({...cloudConfig, logoUrl: e.target.value})} placeholder="URL Gambar Logo DJKI" /></div>
            <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-2"><i className="bi bi-cloud-check"></i> Hubungkan Cloud</button>
          </form>
        )}

        {activeTab === 'database' && (
          <form onSubmit={handleSaveDbConfig} className="max-w-3xl space-y-8 animate-fadeIn">
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Spreadsheet ID Utama</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold" value={dbConfig.spreadsheetId} onChange={(e) => setDbConfig({...dbConfig, spreadsheetId: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">GID Sheet Pegawai</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold" value={dbConfig.pegawaiGid} onChange={(e) => setDbConfig({...dbConfig, pegawaiGid: e.target.value})} /></div>
            <button type="submit" className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Terapkan Perubahan</button>
          </form>
        )}
        
        {activeTab === 'users' && (
           <div className="space-y-8 animate-fadeIn">
              <div className="flex justify-between items-center"><h5 className="text-xl font-black text-gray-900 uppercase">Akses Admin</h5><button onClick={() => setIsUserModalOpen(true)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20">Tambah User</button></div>
              <div className="bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-white text-[8px] font-black text-gray-400 uppercase border-b">
                       <tr><th className="px-8 py-5">Nama</th><th className="px-6 py-5">Role</th><th className="px-8 py-5 text-right">Aksi</th></tr>
                    </thead>
                    <tbody className="divide-y">
                       {adminUsers.map(u => (
                          <tr key={u.id} className="hover:bg-white transition-all">
                             <td className="px-8 py-5 font-black text-gray-900 uppercase text-xs">{u.name}</td>
                             <td className="px-6 py-5"><span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-lg">{u.role}</span></td>
                             <td className="px-8 py-5 text-right"><button onClick={() => { setEditingUser(u); setUserFormData(u); setIsUserModalOpen(true); }} className="text-blue-600"><i className="bi bi-pencil-square"></i></button></td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'maintenance' && (
           <div className="space-y-8 animate-fadeIn max-w-4xl">
              <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${maintenanceConfig.all ? 'bg-rose-600 animate-pulse' : 'bg-gray-400'}`}><i className="bi bi-power text-3xl"></i></div>
                    <div><h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Global Maintenance</h4><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kunci Akses Sistem Secara Menyeluruh</p></div>
                  </div>
                  <button onClick={() => setMaintenanceConfig({...maintenanceConfig, all: !maintenanceConfig.all})} className={`px-10 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${maintenanceConfig.all ? 'bg-rose-600 text-white' : 'bg-white border text-gray-400'}`}>{maintenanceConfig.all ? 'ON' : 'OFF'}</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {SYSTEM_MODULES.map(m => (
                    <button key={m.id} onClick={() => toggleMaintenancePage(m.id)} className={`p-6 rounded-[2rem] border transition-all text-left ${maintenanceConfig.pages.includes(m.id) ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                       <i className={`bi ${m.icon} text-xl mb-4 block`}></i>
                       <h6 className="text-[10px] font-black uppercase text-gray-900">{m.label}</h6>
                       <p className="text-[8px] font-bold text-gray-400 uppercase mt-2">{maintenanceConfig.pages.includes(m.id) ? 'MAINTENANCE' : 'ACTIVE'}</p>
                    </button>
                 ))}
              </div>
              <button onClick={handleSaveMaintenance} className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl">Update Status Sistem</button>
           </div>
        )}
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalEnter">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h4 className="text-sm font-black text-gray-900 uppercase">User Access</h4>
               <button onClick={() => setIsUserModalOpen(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-10 space-y-6">
              <input type="text" placeholder="NIP" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-bold" value={userFormData.nip || ''} onChange={e => setUserFormData({...userFormData, nip: e.target.value})} />
              <input type="text" placeholder="Nama" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-bold" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
              <select className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-bold" value={userFormData.role || 'Viewer'} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="Superadmin">SUPERADMIN</option><option value="Editor">EDITOR</option><option value="Viewer">VIEWER</option></select>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-8 py-3.5 bg-gray-100 rounded-xl text-[10px] font-black uppercase">Batal</button><button type="submit" className="px-10 py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
