
import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets, uploadFileToDrive, syncTableRemote, syncGidMap, DEFAULT_GIDS } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, DEFAULT_TEMPLATE_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';

const SettingsPage = () => {
  const { isSuperadmin, logActivity, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingGid, setSyncingGid] = useState(false);
  
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const templateLogoInputRef = useRef<HTMLInputElement>(null);
  
  const [systemName, setSystemName] = useState(localStorage.getItem('portal_system_name') || 'Portal SDM');
  const [runningTextValue, setRunningTextValue] = useState(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM DJKI.');
  const [appLogo, setAppLogo] = useState<string>(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
  const [templateLogo, setTemplateLogo] = useState<string>(localStorage.getItem('portal_template_logo') || DEFAULT_TEMPLATE_LOGO);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({ role: 'Viewer' });

  const [maintConfig, setMaintConfig] = useState<MaintenanceConfig>({ all: false, pages: [] });

  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4',
    appsScriptUrl: JSON.parse(localStorage.getItem('portal_cloud_config') || '{}').appsScriptUrl || 'https://script.google.com/macros/s/AKfycbz9zyZrLGmDBRlUOdR1pgftxDfcElY_Fd4BfsCR4Fmd7Qb58MJKAllRkUloFQrbs8lY/exec'
  });

  useEffect(() => {
    loadSettingsData();
  }, [activeTab]);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const u = await fetchUsersFromSheets();
        setUsers(u);
      }
      const m = localStorage.getItem('maintenance_config');
      if (m) setMaintConfig(JSON.parse(m));
    } catch (e) {
      console.error("Gagal memuat data pengaturan:", e);
    }
    setLoading(false);
  };

  const handleLogoUpload = async (type: 'APP' | 'TEMPLATE', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const result = await uploadFileToDrive(`${type}_LOGO_${Date.now()}`, file.type, base64);
      if (result.success && result.fileUrl) {
        if (type === 'APP') { setAppLogo(result.fileUrl); localStorage.setItem('portal_system_logo', result.fileUrl); }
        else { setTemplateLogo(result.fileUrl); localStorage.setItem('portal_template_logo', result.fileUrl); }
        window.dispatchEvent(new Event('storage_updated'));
        setSuccessMsg(`Logo berhasil diperbarui.`);
        setShowSuccess(true);
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAutoSyncGid = async () => {
    setSyncingGid(true);
    const success = await syncGidMap();
    if (success) {
      setSuccessMsg("Struktur Database Berhasil Disinkronkan. Seluruh GID telah diperbarui otomatis.");
      setShowSuccess(true);
      logActivity('UPDATE', 'Settings', 'Auto-Sync GID dari Apps Script');
    } else {
      alert("Gagal sinkronisasi GID. Pastikan Apps Script URL sudah benar.");
    }
    setSyncingGid(false);
  };

  const toggleMaintenance = (page: string) => {
    let newConfig: MaintenanceConfig;
    if (page === 'ALL') newConfig = { ...maintConfig, all: !maintConfig.all };
    else {
      let newPages = maintConfig.pages.includes(page) ? maintConfig.pages.filter(p => p !== page) : [...maintConfig.pages, page];
      newConfig = { ...maintConfig, pages: newPages };
    }
    setMaintConfig(newConfig);
    localStorage.setItem('maintenance_config', JSON.stringify(newConfig));
    window.dispatchEvent(new Event('storage_updated'));
  };

  const handleUserAction = async (action: 'SAVE' | 'DELETE', userData?: AdminUser) => {
    setLoading(true);
    const targetUser = userData || (userFormData as AdminUser);
    if (action === 'SAVE' && !targetUser.id) targetUser.id = `USR-${Date.now()}`;

    const success = await syncTableRemote('USERS', action === 'SAVE' ? 'SAVE' : 'DELETE', targetUser);
    if (success) {
      setTimeout(async () => {
        const u = await fetchUsersFromSheets();
        setUsers(u);
        setIsUserModalOpen(false);
        setSuccessMsg(`Data User berhasil diproses di cloud.`);
        setShowSuccess(true);
        setLoading(false);
      }, 1000);
    } else {
      alert("Gagal sinkronisasi ke cloud.");
      setLoading(false);
    }
  };

  const saveCloudConfig = () => {
    localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId);
    localStorage.setItem('portal_cloud_config', JSON.stringify({ 
      appsScriptUrl: dbConfig.appsScriptUrl,
      driveFolderId: JSON.parse(localStorage.getItem('portal_cloud_config') || '{}').driveFolderId || ''
    }));
    window.dispatchEvent(new Event('storage_updated'));
    setSuccessMsg("Konfigurasi Database Cloud Berhasil Disimpan.");
    setShowSuccess(true);
  };

  const openSpreadsheet = () => {
    window.open(`https://docs.google.com/spreadsheets/d/${dbConfig.spreadsheetId}/edit`, '_blank');
  };

  return (
    <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn pb-24 lg:pb-10">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Konfigurasi Berhasil" message={successMsg} />
      
      <div className="flex flex-col lg:flex-row min-h-[800px]">
        <div className="w-full lg:w-80 bg-gray-50/50 border-r border-gray-100 p-8 flex flex-row lg:flex-col overflow-x-auto no-scrollbar shrink-0 gap-2">
          {[
            { id: 'general', label: 'Branding', icon: 'bi-palette2' },
            { id: 'users', label: 'Manajemen User', icon: 'bi-people-fill' },
            { id: 'maintenance', label: 'Maintenance', icon: 'bi-cone-striped' },
            { id: 'database', label: 'Integrasi Cloud', icon: 'bi-database-fill-gear' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 lg:flex-none flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#111827] text-white shadow-xl' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}>
              <i className={`bi ${tab.icon} text-lg`}></i>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 p-8 md:p-16 overflow-y-auto custom-scrollbar">
          {activeTab === 'general' && (
            <div className="max-w-4xl space-y-12 animate-fadeIn">
              <div className="border-b pb-6">
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Identitas Visual</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kustomisasi logo dan teks informasi sistem</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-6">
                   <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Logo Sidebar</h6>
                   <div className="h-32 w-32 bg-white rounded-3xl p-4 shadow-xl border-4 border-white flex items-center justify-center overflow-hidden">
                      <img src={appLogo} className="max-h-full max-w-full object-contain" alt="App Logo" crossOrigin="anonymous" />
                   </div>
                   <button onClick={() => appLogoInputRef.current?.click()} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase shadow-sm">Ganti Logo</button>
                   <input type="file" ref={appLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('APP', e)} />
                </div>
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-6">
                   <h6 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Logo Kop Surat</h6>
                   <div className="h-32 w-32 bg-white rounded-3xl p-4 shadow-xl border-4 border-white flex items-center justify-center overflow-hidden">
                      <img src={templateLogo} className="max-h-full max-w-full object-contain" alt="Template Logo" crossOrigin="anonymous" />
                   </div>
                   <button onClick={() => templateLogoInputRef.current?.click()} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase shadow-sm">Ganti Logo</button>
                   <input type="file" ref={templateLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoUpload('TEMPLATE', e)} />
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Nama Portal</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-950 uppercase" value={systemName} onChange={e => setSystemName(e.target.value)} /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Running Text</label><textarea rows={2} className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[11px] font-bold text-gray-700 resize-none" value={runningTextValue} onChange={e => setRunningTextValue(e.target.value)} /></div>
                <button onClick={() => { localStorage.setItem('portal_system_name', systemName); localStorage.setItem('portal_running_text', runningTextValue); window.dispatchEvent(new Event('storage_updated')); setShowSuccess(true); }} className="px-12 py-5 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Simpan Perubahan</button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-end border-b pb-6 gap-4">
                <div>
                  <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Database User (Cloud)</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Daftar administrator terdaftar di Sheet 'users'</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={loadSettingsData} className={`h-12 w-12 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 rounded-xl hover:text-blue-600 transition-all ${loading ? 'animate-spin' : ''}`}><i className="bi bi-arrow-clockwise text-xl"></i></button>
                   <button onClick={() => { setUserFormData({ role: 'Viewer' }); setIsUserModalOpen(true); }} className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg tracking-widest">+ Registrasi User</button>
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b">
                    <tr><th className="px-10 py-5">Identitas Administrator</th><th className="px-4 py-5 text-center">Level</th><th className="px-10 py-5 text-right">Opsi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr><td colSpan={3} className="px-8 py-24 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse">Menghubungkan Spreadsheet...</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="group hover:bg-blue-50/10 transition-colors">
                        <td className="px-10 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-blue-600 border border-white shadow-inner overflow-hidden">
                              {u.foto ? <img src={u.foto} className="h-full w-full object-cover" /> : u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-gray-950 uppercase">{u.name}</p>
                              <p className="text-[9px] font-mono text-gray-400">NIP. {u.nip}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${u.role === 'Superadmin' ? 'bg-rose-50 text-rose-600 border-rose-100' : u.role === 'Editor' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{u.role}</span>
                        </td>
                        <td className="px-10 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setUserFormData(u); setIsUserModalOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 shadow-sm"><i className="bi bi-pencil-square"></i></button>
                            <button onClick={() => handleUserAction('DELETE', u)} className="h-9 w-9 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-rose-600 shadow-sm" disabled={u.nip === currentUser?.nip}><i className="bi bi-trash-fill"></i></button>
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
            <div className="max-w-4xl space-y-12 animate-fadeIn">
               <div className="border-b pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Integrasi Cloud & GID Otomatis</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sistem sekarang mendeteksi ID Sheet (GID) secara otomatis melalui Apps Script.</p>
                  </div>
                  <button onClick={openSpreadsheet} className="px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
                    <i className="bi bi-box-arrow-up-right"></i>
                    Buka Spreadsheet
                  </button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <h6 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">Endpoint Koneksi</h6>
                    <div className="space-y-4">
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-2">Apps Script URL</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-mono text-blue-600" value={dbConfig.appsScriptUrl} onChange={e => setDbConfig({...dbConfig, appsScriptUrl: e.target.value})} /></div>
                       <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase ml-2">Spreadsheet ID</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-mono" value={dbConfig.spreadsheetId} onChange={e => setDbConfig({...dbConfig, spreadsheetId: e.target.value})} /></div>
                       <button onClick={saveCloudConfig} className="w-full py-4 bg-[#111827] text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Simpan Endpoint</button>
                    </div>
                  </div>
                  
                  <div className="space-y-8 flex flex-col justify-center items-center text-center p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                    <div className="h-20 w-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl shadow-xl shadow-blue-600/20 mb-4">
                       <i className={`bi ${syncingGid ? 'bi-arrow-repeat animate-spin' : 'bi-magic'}`}></i>
                    </div>
                    <div>
                       <h5 className="text-[14px] font-black uppercase text-gray-900 leading-tight">Sinkronisasi GID Otomatis</h5>
                       <p className="text-[10px] text-gray-500 font-bold uppercase mt-3 tracking-widest leading-relaxed">
                          Tidak perlu lagi menginput GID manual. Tekan tombol di bawah untuk mendeteksi seluruh struktur sheet di Spreadsheet Anda.
                       </p>
                    </div>
                    <button 
                      onClick={handleAutoSyncGid} 
                      disabled={syncingGid}
                      className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/30 active:scale-95 transition-all disabled:bg-gray-300"
                    >
                      {syncingGid ? 'Menghubungkan...' : 'Sinkronkan GID Sekarang'}
                    </button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="max-w-3xl space-y-10 animate-fadeIn">
               <div className="border-b pb-6">
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Panel Pemeliharaan</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kunci akses sistem untuk non-administrator</p>
              </div>
              <div className={`p-8 rounded-[3rem] border-4 transition-all ${maintConfig.all ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${maintConfig.all ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                          <i className={`bi ${maintConfig.all ? 'bi-lock-fill' : 'bi-shield-check'} text-2xl`}></i>
                       </div>
                       <div>
                          <h5 className="text-lg font-black uppercase text-gray-950">Lock Global Sistem</h5>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">{maintConfig.all ? 'Sistem Terkunci Total' : 'Sistem Berjalan Normal'}</p>
                       </div>
                    </div>
                    <button onClick={() => toggleMaintenance('ALL')} className={`px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${maintConfig.all ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'}`}>{maintConfig.all ? 'Buka Kunci' : 'Kunci Sistem'}</button>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {[
                   {id: 'pegawai', label: 'Database Pegawai'},
                   {id: 'absensi', label: 'Absensi Wajah'},
                   {id: 'skp', label: 'E-Kinerja (SKP)'},
                   {id: 'pak', label: 'Angka Kredit (PAK)'}
                 ].map(m => (
                   <div key={m.id} className="p-6 bg-white border border-gray-100 rounded-3xl flex items-center justify-between shadow-sm">
                      <span className="text-[11px] font-black text-gray-800 uppercase">{m.label}</span>
                      <button onClick={() => toggleMaintenance(m.id)} className={`w-12 h-7 rounded-full relative transition-all duration-300 ${maintConfig.pages.includes(m.id) ? 'bg-rose-500' : 'bg-gray-200'}`}>
                         <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${maintConfig.pages.includes(m.id) ? 'left-6' : 'left-1'}`}></div>
                      </button>
                   </div>
                 ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={() => setIsUserModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-modalEnter space-y-6 flex flex-col border border-white/20">
              <div className="flex items-center gap-4 border-b pb-6 shrink-0">
                 <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner"><i className="bi bi-person-badge-fill"></i></div>
                 <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Manajemen Akses</h4>
              </div>
              <div className="space-y-4">
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Login NIP</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={userFormData.nip} onChange={e => setUserFormData({...userFormData, nip: e.target.value})} placeholder="Masukkan 18 Digit NIP" /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Nama Lengkap</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} placeholder="NAMA LENGKAP" /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Password</label><input type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hak Akses</label><select className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none focus:border-blue-600" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="Superadmin">Superadmin</option><option value="Editor">Editor</option><option value="Viewer">Viewer (Pegawai)</option></select></div>
              </div>
              <div className="flex gap-3 pt-4 shrink-0">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95">Batal</button>
                 <button onClick={() => handleUserAction('SAVE')} disabled={loading} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-600/30 active:scale-95 disabled:bg-blue-300">
                    {loading ? 'Menyinkronkan...' : 'Simpan ke Cloud'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
