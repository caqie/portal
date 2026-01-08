
import React, { useState, useEffect } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';

const SettingsPage = () => {
  const { isSuperadmin, logActivity } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'offline' | 'checking'>('checking');
  
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({});
  const [runningTextValue, setRunningTextValue] = useState('');

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

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portal_running_text', runningTextValue);
    window.dispatchEvent(new Event('storage_updated'));
    logActivity('UPDATE', 'Settings', 'Memperbarui konfigurasi umum sistem.');
    alert('Konfigurasi sistem berhasil diperbarui.');
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
          { id: 'general', label: 'Umum', icon: 'bi-sliders' },
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
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="max-w-3xl space-y-8 animate-fadeIn">
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Pengumuman Berjalan</label><textarea rows={2} className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold shadow-sm" value={runningTextValue} onChange={(e) => setRunningTextValue(e.target.value)} /></div>
            <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">Simpan Konfigurasi</button>
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
