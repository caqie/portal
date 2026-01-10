
import React, { useState, useEffect } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';

const SettingsPage = () => {
  const { isSuperadmin, logActivity } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Branding States
  const [systemName, setSystemName] = useState(localStorage.getItem('portal_system_name') || 'Portal SDM');
  const [runningTextValue, setRunningTextValue] = useState(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM Direktorat Jenderal Kekayaan Intelektual - Kementerian Hukum RI.');
  const [systemLogo, setSystemLogo] = useState<string | null>(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
  
  // Config States
  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => {
    const saved = localStorage.getItem('portal_cloud_config');
    return saved ? JSON.parse(saved) : { driveFolderId: '', appsScriptUrl: '', logoUrl: '' };
  });
  
  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4',
    pegawaiGid: localStorage.getItem('db_pegawai_gid') || '1631838106'
  });
  
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>(() => {
    const saved = localStorage.getItem('maintenance_config');
    return saved ? JSON.parse(saved) : { all: false, pages: [] };
  });

  // User Management
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({});

  useEffect(() => {
    const loadUsers = async () => {
      const saved = localStorage.getItem('portal_users_db');
      if (saved) {
        setUsers(JSON.parse(saved));
      } else {
        try {
          const initial = await fetchUsersFromSheets();
          setUsers(initial);
          localStorage.setItem('portal_users_db', JSON.stringify(initial));
        } catch (e) {
          console.error("Gagal memuat user dari sheets", e);
        }
      }
    };
    loadUsers();
  }, []);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portal_system_name', systemName);
    localStorage.setItem('portal_running_text', runningTextValue);
    if (systemLogo) localStorage.setItem('portal_system_logo', systemLogo);
    window.dispatchEvent(new Event('storage_updated'));
    logActivity('UPDATE', 'Settings', 'Memperbarui branding sistem.');
    setSuccessMsg('Branding sistem berhasil diperbarui secara global.');
    setShowSuccess(true);
  };

  const handleSaveDatabase = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId);
    localStorage.setItem('db_pegawai_gid', dbConfig.pegawaiGid);
    localStorage.setItem('portal_cloud_config', JSON.stringify(cloudConfig));
    logActivity('UPDATE', 'Settings', 'Memperbarui konfigurasi Database & Cloud.');
    setSuccessMsg('Konfigurasi koneksi database telah disimpan.');
    setShowSuccess(true);
  };

  const handleToggleMaintenance = (page: string) => {
    let newPages = [...maintenanceConfig.pages];
    if (newPages.includes(page)) {
      newPages = newPages.filter(p => p !== page);
    } else {
      newPages.push(page);
    }
    
    const newConfig = { ...maintenanceConfig, pages: newPages };
    setMaintenanceConfig(newConfig);
    localStorage.setItem('maintenance_config', JSON.stringify(newConfig));
    window.dispatchEvent(new Event('storage_updated'));
  };

  const handleSaveUser = () => {
    if (!userFormData.nip || !userFormData.name) return alert("NIP dan Nama wajib diisi");
    let updated: AdminUser[];
    if (editingUser) {
      updated = users.map(u => u.id === editingUser.id ? { ...u, ...userFormData } as AdminUser : u);
      logActivity('UPDATE', 'Settings', `Mengedit hak akses user: ${userFormData.name}`);
    } else {
      updated = [{ ...userFormData, id: Date.now().toString() } as AdminUser, ...users];
      logActivity('CREATE', 'Settings', `Menambah user administrator baru: ${userFormData.name}`);
    }
    setUsers(updated);
    localStorage.setItem('portal_users_db', JSON.stringify(updated));
    setIsUserModalOpen(false);
    setSuccessMsg('Data pengguna berhasil diperbarui.');
    setShowSuccess(true);
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Hapus akses user ini?')) {
      const userToDelete = users.find(u => u.id === id);
      const updated = users.filter(x => x.id !== id);
      setUsers(updated);
      localStorage.setItem('portal_users_db', JSON.stringify(updated));
      logActivity('DELETE', 'Settings', `Menghapus akses user: ${userToDelete?.name}`);
    }
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn mb-20">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Pengaturan Disimpan" message={successMsg} />
      
      <div className="flex flex-col lg:flex-row min-h-[700px]">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 bg-gray-50/50 border-r border-gray-100 p-8 space-y-2">
          <div className="mb-8">
            <h3 className="text-[12px] font-black text-gray-900 uppercase tracking-widest">Sistem Konfigurasi</h3>
            <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">Kelola preferensi portal SDM</p>
          </div>
          {[
            { id: 'general', label: 'Branding & Identitas', icon: 'bi-palette2' },
            { id: 'users', label: 'Manajemen Administrator', icon: 'bi-shield-lock' },
            { id: 'database', label: 'Koneksi Spreadsheet', icon: 'bi-database-fill-gear' },
            { id: 'maintenance', label: 'Mode Pemeliharaan', icon: 'bi-cone-striped' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#111827] text-white shadow-xl shadow-gray-900/20' : 'text-gray-400 hover:bg-white hover:text-gray-900'}`}
            >
              <i className={`bi ${tab.icon} text-lg`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-12">
          {activeTab === 'general' && (
            <div className="max-w-2xl animate-fadeIn">
              <h4 className="text-sm font-black uppercase text-gray-900 mb-8 tracking-widest">Identitas Portal</h4>
              <form onSubmit={handleSaveBranding} className="space-y-8">
                <div className="flex items-center space-x-8 p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                   <div className="h-32 w-32 rounded-3xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-inner p-4">
                      {systemLogo ? <img src={systemLogo} className="h-full w-full object-contain" /> : <i className="bi bi-image text-4xl text-gray-200"></i>}
                   </div>
                   <div className="flex-1 space-y-4">
                      <p className="text-[9px] font-black uppercase text-gray-900 tracking-widest">URL Logo Instansi (PNG/SVG)</p>
                      <input 
                        type="text" 
                        placeholder="Contoh: https://link-ke-logo.png" 
                        className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-500 transition-all" 
                        value={systemLogo || ''} 
                        onChange={e => setSystemLogo(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={() => setSystemLogo(DEFAULT_LOGO)} 
                        className="text-[8px] font-black text-blue-600 uppercase hover:underline"
                      >
                        Gunakan Logo Default DJKI
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Nama Portal Utama</label>
                    <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all" value={systemName} onChange={e => setSystemName(e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Teks Berjalan (Running Announcement)</label>
                    <textarea rows={4} className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none" value={runningTextValue} onChange={e => setRunningTextValue(e.target.value)} />
                    <p className="text-[8px] text-gray-400 font-bold ml-3 italic">Pesan ini akan muncul di bar marquee bagian atas aplikasi.</p>
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan Perubahan Branding</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-black uppercase text-gray-900 tracking-widest">Akun Administrator</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Akses kendali sistem SDM</p>
                </div>
                <button onClick={() => { setEditingUser(null); setUserFormData({ role: 'Viewer' }); setIsUserModalOpen(true); }} className="px-8 py-3.5 bg-[#111827] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">+ Tambah Akses</button>
              </div>
              
              <div className="overflow-hidden border border-gray-100 rounded-[2.5rem] shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b border-gray-100 tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Informasi Profil</th>
                      <th className="px-4 py-5">Hak Akses</th>
                      <th className="px-8 py-5 text-right">Opsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-blue-50/5 group transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center space-x-4">
                             <div className="h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black text-xs">
                                {u.foto ? <img src={u.foto} className="h-full w-full object-cover rounded-xl" /> : u.name.charAt(0)}
                             </div>
                             <div>
                               <p className="text-[11px] font-black text-gray-900 uppercase">{u.name}</p>
                               <p className="text-[9px] font-mono text-blue-600 font-bold mt-1">{u.nip}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          <span className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase ${u.role === 'Superadmin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : u.role === 'Editor' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingUser(u); setUserFormData(u); setIsUserModalOpen(true); }} className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"><i className="bi bi-pencil-square"></i></button>
                            {u.role !== 'Superadmin' && <button onClick={() => handleDeleteUser(u.id)} className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"><i className="bi bi-trash"></i></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="max-w-2xl animate-fadeIn">
              <h4 className="text-sm font-black uppercase text-gray-900 mb-8 tracking-widest">Koneksi Database & Cloud</h4>
              <form onSubmit={handleSaveDatabase} className="space-y-8">
                <div className="space-y-6">
                  <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start space-x-4 mb-4">
                     <i className="bi bi-info-circle-fill text-emerald-500 text-lg mt-1"></i>
                     <p className="text-[10px] font-bold text-emerald-800 leading-relaxed uppercase">
                        Sistem ini menggunakan Google Sheets sebagai database utama. Pastikan link Spreadsheet disetel ke "Anyone with the link can view" agar sistem dapat menarik data.
                     </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Spreadsheet ID Utama</label>
                    <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all" value={dbConfig.spreadsheetId} onChange={e => setDbConfig({...dbConfig, spreadsheetId: e.target.value})} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">GID Sheet Pegawai</label>
                    <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all" value={dbConfig.pegawaiGid} onChange={e => setDbConfig({...dbConfig, pegawaiGid: e.target.value})} />
                  </div>

                  <div className="pt-4 border-t border-gray-100 mt-8">
                    <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-6">Penyimpanan Cloud (Google Drive)</h5>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Folder ID Utama (Dossiers)</label>
                        <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all" value={cloudConfig.driveFolderId} onChange={e => setCloudConfig({...cloudConfig, driveFolderId: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Google Apps Script URL (API)</label>
                        <input type="text" placeholder="https://script.google.com/macros/s/..." className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-xs font-bold text-gray-900 outline-none focus:bg-white focus:border-blue-500 transition-all" value={cloudConfig.appsScriptUrl} onChange={e => setCloudConfig({...cloudConfig, appsScriptUrl: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">Simpan Konfigurasi Koneksi</button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-8 animate-fadeIn">
               <div>
                  <h4 className="text-sm font-black uppercase text-gray-900 tracking-widest">Pemeliharaan Modul</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Kunci modul selama update database berlangsung</p>
               </div>
               
               <div className="p-8 bg-amber-50 border border-amber-100 rounded-[3rem] flex items-center space-x-6">
                  <div className="h-16 w-16 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-amber-500/30"><i className="bi bi-cone-striped text-3xl"></i></div>
                  <div className="flex-1">
                     <h5 className="text-[12px] font-black uppercase text-amber-900 leading-none">Status Maintenance Aktif</h5>
                     <p className="text-[10px] font-bold text-amber-700 uppercase mt-2 leading-relaxed">
                        Jika maintenance diaktifkan, modul yang dipilih hanya dapat diakses oleh Superadmin. User dengan role Editor atau Viewer akan melihat layar pemeliharaan.
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'dashboard', label: 'Dashboard Analytics' },
                    { id: 'pegawai', label: 'Database Pegawai' },
                    { id: 'absensi', label: 'Absensi Online' },
                    { id: 'layanan', label: 'Layanan Karir' },
                    { id: 'skp', label: 'Evaluasi SKP' },
                    { id: 'dossier', label: 'E-Dossier / Arsip' },
                    { id: 'laporan', label: 'Laporan Konsolidasi' },
                    { id: 'tugas_rutin', label: 'Pencatatan Tugas Rutin' }
                  ].map(mod => (
                    <div key={mod.id} className="p-6 bg-white rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm hover:border-amber-200 transition-all group">
                       <div className="flex items-center space-x-3">
                          <div className={`h-2 w-2 rounded-full ${maintenanceConfig.pages.includes(mod.id) ? 'bg-amber-500 animate-pulse' : 'bg-gray-200'}`}></div>
                          <span className="text-[11px] font-black uppercase text-gray-900 tracking-tight">{mod.label}</span>
                       </div>
                       <button 
                        onClick={() => handleToggleMaintenance(mod.id)}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${maintenanceConfig.pages.includes(mod.id) ? 'bg-amber-500' : 'bg-gray-200'}`}
                       >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm transition-all duration-300 ${maintenanceConfig.pages.includes(mod.id) ? 'left-7' : 'left-1'}`}></div>
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* User Management Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md" onClick={() => setIsUserModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-modalEnter">
             <div className="flex items-center space-x-4 mb-8">
                <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><i className="bi bi-person-plus-fill text-2xl"></i></div>
                <h3 className="text-sm font-black uppercase text-gray-900 tracking-widest">{editingUser ? 'Edit Administrator' : 'Administrator Baru'}</h3>
             </div>
             
             <div className="space-y-5">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Nama Lengkap User</label>
                   <input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">NIP (Sebagai Username)</label>
                   <input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={userFormData.nip || ''} onChange={e => setUserFormData({...userFormData, nip: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Kata Sandi Akses</label>
                   <input type="password" placeholder="••••••••" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Tingkatan Hak Akses</label>
                   <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}>
                      <option value="Viewer">Viewer (Hanya Baca)</option>
                      <option value="Editor">Editor (Input Data)</option>
                      <option value="Superadmin">Superadmin (Kendali Penuh)</option>
                   </select>
                </div>
             </div>
             
             <div className="mt-10 flex gap-3">
                <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all">Batalkan</button>
                <button onClick={handleSaveUser} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan Data</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
