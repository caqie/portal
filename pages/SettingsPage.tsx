
import React, { useState, useEffect } from 'react';
import { AdminUser, MaintenanceConfig } from '../types';
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
  
  // Form State for User
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({});
  const [runningTextValue, setRunningTextValue] = useState('');

  // Maintenance Config State
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>({
    all: false,
    pages: []
  });

  // Database Configuration State
  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: '',
    pegawaiGid: ''
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
    else setRunningTextValue('Selamat Datang di Portal SDM Direktorat Jenderal Kekayaan Intelektual - Kementerian Hukum RI. Jaga Integritas, Tingkatkan Kinerja!');

    const savedId = localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4';
    const savedGid = localStorage.getItem('db_pegawai_gid') || '1631838106';
    setDbConfig({ spreadsheetId: savedId, pegawaiGid: savedGid });

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

  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbConfig.spreadsheetId || !dbConfig.pegawaiGid) {
        alert("ID Spreadsheet dan GID tidak boleh kosong!");
        return;
    }
    localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId);
    localStorage.setItem('db_pegawai_gid', dbConfig.pegawaiGid);
    logActivity('UPDATE', 'Database', `Superadmin mengubah sumber data.`);
    alert('Konfigurasi Database berhasil diperbarui.');
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

  const toggleMaintenanceAll = () => {
    setMaintenanceConfig(prev => ({ ...prev, all: !prev.all }));
  };

  const handleSaveMaintenance = () => {
    localStorage.setItem('maintenance_config', JSON.stringify(maintenanceConfig));
    window.dispatchEvent(new Event('storage_updated'));
    logActivity('UPDATE', 'System', `Memperbarui status pemeliharaan sistem. All: ${maintenanceConfig.all}`);
    alert('Status pemeliharaan sistem berhasil diperbarui.');
  };

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      const users = await fetchUsersFromSheets();
      if (users.length > 0 && users[0].nip === '198501012010011001') {
        setDbStatus('offline');
      } else {
        setDbStatus('connected');
      }
    } catch {
      setDbStatus('offline');
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const savedLocal = localStorage.getItem('portal_users_db');
      if (savedLocal) {
        setAdminUsers(JSON.parse(savedLocal));
      } else {
        const data = await fetchUsersFromSheets();
        setAdminUsers(data);
      }
      checkConnection();
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOpenUserModal = (user: AdminUser | null = null) => {
    if (user) {
      setEditingUser(user);
      setUserFormData({ 
        nip: user.nip,
        name: user.name,
        password: user.password,
        role: user.role,
        foto: user.foto 
      });
    } else {
      setEditingUser(null);
      setUserFormData({ role: 'Viewer', password: '', name: '', nip: '', foto: '' });
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.nip || !userFormData.name) return alert("NIP dan Nama wajib diisi");

    let updatedList: AdminUser[];
    if (editingUser) {
      updatedList = adminUsers.map(u => u.id === editingUser.id ? { ...u, ...userFormData } as AdminUser : u);
      logActivity('UPDATE', 'User Management', `Memperbarui data pengguna: ${userFormData.name}`);
    } else {
      const newUser: AdminUser = {
        id: Date.now().toString(),
        nip: userFormData.nip!,
        name: userFormData.name!,
        password: userFormData.password || '123456',
        role: userFormData.role as any || 'Viewer',
        foto: userFormData.foto
      };
      updatedList = [newUser, ...adminUsers];
      logActivity('CREATE', 'User Management', `Menambah pengguna baru: ${newUser.name}`);
    }

    setAdminUsers(updatedList);
    localStorage.setItem('portal_users_db', JSON.stringify(updatedList));
    alert("Data pengguna berhasil disimpan.");
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm(`Hapus akses pengguna ini?`)) {
      const updatedList = adminUsers.filter(u => u.id !== id);
      setAdminUsers(updatedList);
      localStorage.setItem('portal_users_db', JSON.stringify(updatedList));
      logActivity('DELETE', 'User Management', `Menghapus pengguna.`);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden animate-fadeIn min-h-[70vh] mb-20">
      <div className="bg-gray-900 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`h-2 w-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'} `}></span>
          <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">
            Mode: {dbStatus === 'connected' ? 'Cloud Synchronized' : 'Local Persistence'}
          </span>
        </div>
      </div>

      <div className="flex border-b border-gray-100 bg-gray-50/20 overflow-x-auto no-scrollbar">
        {[
          { id: 'general', label: 'Umum', icon: 'bi-sliders' },
          { id: 'users', label: 'Pengguna', icon: 'bi-shield-lock' },
          { id: 'database', label: 'Database', icon: 'bi-cloud-check-fill' },
          { id: 'maintenance', label: 'Maintenance', icon: 'bi-tools' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-10 py-7 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center space-x-3 shrink-0 ${
              activeTab === tab.id ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            <i className={`bi ${tab.icon} text-base`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-10">
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="max-w-3xl space-y-8 animate-fadeIn">
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Nama Sistem</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 shadow-sm" defaultValue="Portal SDM - DJKI Kemenkum RI" /></div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-blue-600 uppercase pl-2">Pengumuman Berjalan</label><textarea rows={2} className="w-full px-6 py-4 bg-blue-50/30 border border-blue-100 rounded-2xl text-xs font-bold text-gray-900 shadow-sm resize-none" value={runningTextValue} onChange={(e) => setRunningTextValue(e.target.value)} /></div>
            <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Simpan Konfigurasi</button>
          </form>
        )}

        {activeTab === 'database' && (
          <form onSubmit={handleSaveDbConfig} className="max-w-3xl space-y-8 animate-fadeIn">
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex items-start space-x-4">
                <i className="bi bi-exclamation-triangle-fill text-amber-600 text-xl"></i>
                <p className="text-[10px] font-bold text-amber-600 leading-relaxed uppercase">Pengubahan ID Spreadsheet akan mereset sumber data aplikasi secara real-time.</p>
            </div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Google Spreadsheet ID</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold text-gray-900" value={dbConfig.spreadsheetId} onChange={(e) => setDbConfig({...dbConfig, spreadsheetId: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase pl-2">Pegawai Sheet GID</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold text-gray-900" value={dbConfig.pegawaiGid} onChange={(e) => setDbConfig({...dbConfig, pegawaiGid: e.target.value})} /></div>
            <button type="submit" className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center gap-2"><i className="bi bi-cloud-arrow-up-fill"></i> Terapkan Koneksi</button>
          </form>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-10 animate-fadeIn max-w-4xl">
            <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all ${maintenanceConfig.all ? 'bg-rose-600 animate-pulse' : 'bg-gray-400'}`}>
                  <i className="bi bi-power text-3xl"></i>
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Global Maintenance Mode</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Kunci Seluruh Modul Sistem DJKI</p>
                </div>
              </div>
              <button 
                onClick={toggleMaintenanceAll}
                className={`px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${maintenanceConfig.all ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20' : 'bg-white border border-gray-200 text-gray-500'}`}
              >
                {maintenanceConfig.all ? 'ON - Pemeliharaan Aktif' : 'OFF - Sistem Normal'}
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Pemeliharaan Modular</h5>
                <span className="text-[9px] font-bold text-gray-400 uppercase italic">Pilih modul spesifik untuk di-*maintenance*</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {SYSTEM_MODULES.map(module => (
                  <button 
                    key={module.id}
                    onClick={() => toggleMaintenancePage(module.id)}
                    className={`p-6 rounded-[2rem] border transition-all text-left group ${maintenanceConfig.pages.includes(module.id) || maintenanceConfig.all ? 'bg-amber-50 border-amber-200 ring-4 ring-amber-50' : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${maintenanceConfig.pages.includes(module.id) || maintenanceConfig.all ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-400'}`}>
                        <i className={`bi ${module.icon} text-lg`}></i>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${maintenanceConfig.pages.includes(module.id) || maintenanceConfig.all ? 'border-amber-600 bg-amber-600' : 'border-gray-200 bg-white'}`}>
                        { (maintenanceConfig.pages.includes(module.id) || maintenanceConfig.all) && <i className="bi bi-check text-white text-xs"></i> }
                      </div>
                    </div>
                    <h6 className={`text-[11px] font-black uppercase tracking-tight ${maintenanceConfig.pages.includes(module.id) || maintenanceConfig.all ? 'text-amber-800' : 'text-gray-900'}`}>{module.label}</h6>
                    <p className="text-[8px] font-bold text-gray-400 uppercase mt-2 tracking-widest">Status: {maintenanceConfig.pages.includes(module.id) || maintenanceConfig.all ? 'OFFLINE' : 'ONLINE'}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100 flex justify-end">
              <button 
                onClick={handleSaveMaintenance}
                className="px-12 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-black active:scale-95 transition-all"
              >
                Simpan & Terapkan Status Sistem
              </button>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h5 className="text-xl font-black text-gray-900 uppercase">Database Hak Akses</h5>
              {isSuperadmin && <button onClick={() => handleOpenUserModal()} className="px-8 py-4 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95"><i className="bi bi-person-plus-fill mr-2"></i>Tambah Admin</button>}
            </div>
            
            <div className="bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden">
                 <table className="w-full text-left">
                    <thead className="bg-white/50 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                       <tr><th className="px-8 py-5">Nama Pengguna</th><th className="px-6 py-5">NIP</th><th className="px-6 py-5 text-center">Role</th><th className="px-8 py-5 text-right">Opsi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white transition-all group">
                          <td className="px-8 py-5">
                            <div className="flex items-center space-x-4">
                              <div className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 overflow-hidden">
                                {user.foto ? <img src={user.foto} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                              </div>
                              <p className="text-xs font-black text-gray-900 uppercase">{user.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-[10px] font-black font-mono text-gray-900">{user.nip}</td>
                          <td className="px-6 py-5 text-center"><span className="px-3 py-1 bg-blue-50 text-blue-700 text-[8px] font-black uppercase rounded-lg">{user.role}</span></td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => handleOpenUserModal(user)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-blue-600 bg-white rounded-xl border border-gray-100"><i className="bi bi-pencil-square"></i></button>
                              {isSuperadmin && <button onClick={() => handleDeleteUser(user.id)} className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-rose-600 bg-white rounded-xl border border-gray-100"><i className="bi bi-trash"></i></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
            </div>
          </div>
        )}
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">{editingUser ? 'Edit Data Pengguna' : 'Entry Pengguna Baru'}</h4>
               <button onClick={() => setIsUserModalOpen(false)} className="h-10 w-10 text-gray-400"><i className="bi bi-x-lg"></i></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-10 space-y-6">
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">NIP Pegawai</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none" value={userFormData.nip || ''} onChange={e => setUserFormData({...userFormData, nip: e.target.value})} /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Nama Lengkap</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Password</label><input type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none" value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Hak Akses</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={userFormData.role || 'Viewer'} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="Superadmin">SUPERADMIN</option><option value="Editor">EDITOR</option><option value="Viewer">VIEWER</option></select></div>
              </div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Foto URL</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none" value={userFormData.foto || ''} onChange={e => setUserFormData({...userFormData, foto: e.target.value})} /></div>
            </form>
            <div className="px-8 py-6 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-8 py-3 text-[10px] font-black uppercase border border-gray-200 rounded-xl bg-white text-gray-600">Batal</button>
              <button type="submit" className="px-10 py-3 text-[10px] font-black text-white bg-blue-600 rounded-xl shadow-xl active:scale-95 uppercase tracking-widest">Simpan Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
