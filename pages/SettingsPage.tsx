
import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig, AbsensiConfig, Pegawai, SystemConfig, PageAccess } from '../types';
import { fetchUsersFromSheets, uploadFileToDrive, syncTableRemote, syncGidMap, fetchAbsensiConfig, saveAbsensiConfig, fetchPegawaiFromSheets, fetchSystemConfig, saveSystemConfig } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, DEFAULT_TEMPLATE_LOGO, APP_ROUTES } from '../constants';
import SuccessModal from '../components/SuccessModal';

const SettingsPage = () => {
  const { isSuperadmin, logActivity, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncingGid, setSyncingGid] = useState(false);
  
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const templateLogoInputRef = useRef<HTMLInputElement>(null);
  
  const [systemName, setSystemName] = useState(localStorage.getItem('portal_system_name') || 'Portal SDM');
  const [runningTextValue, setRunningTextValue] = useState(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM DJKI.');
  const [appLogo, setAppLogo] = useState<string>(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
  const [templateLogo, setTemplateLogo] = useState<string>(localStorage.getItem('portal_template_logo') || DEFAULT_TEMPLATE_LOGO);
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [absensiConfig, setAbsensiConfig] = useState<AbsensiConfig>({ id: 'ABSENSI_GLOBAL', officeWifiSsid: '', officeIpAddresses: '', wfaNips: [] });
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ maintenance: { all: false, pages: [] }, pageAccess: [] });
  const [wfaSearch, setWfaSearch] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({ role: 'Viewer' });

  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4',
    appsScriptUrl: JSON.parse(localStorage.getItem('portal_cloud_config') || '{}').appsScriptUrl || '',
    driveFolderId: JSON.parse(localStorage.getItem('portal_cloud_config') || '{}').driveFolderId || ''
  });

  useEffect(() => { loadSettingsData(); }, [activeTab]);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') { const u = await fetchUsersFromSheets(); setUsers(u); }
      if (activeTab === 'absensi') {
        const [config, pList] = await Promise.all([fetchAbsensiConfig(), fetchPegawaiFromSheets()]);
        setAbsensiConfig(config);
        setPegawaiList(pList);
      }
      if (activeTab === 'access') {
        const config = await fetchSystemConfig();
        setSystemConfig(config);
      }
    } catch (e) { console.error("Gagal memuat data pengaturan:", e); }
    setLoading(false);
  };

  const saveSystemSettings = async () => {
    setLoading(true);
    const ok = await saveSystemConfig(systemConfig);
    if (ok) {
      setSuccessMsg("Pengaturan Akses & Pemeliharaan Berhasil Disimpan.");
      setShowSuccess(true);
      logActivity('UPDATE', 'Settings', 'Update Pengaturan Akses & Pemeliharaan');
    } else {
      alert("Gagal menyimpan pengaturan sistem.");
    }
    setLoading(false);
  };

  const toggleMaintenancePage = (path: string) => {
    setSystemConfig(prev => {
      const exists = prev.maintenance.pages.includes(path);
      const newPages = exists 
        ? prev.maintenance.pages.filter(p => p !== path)
        : [...prev.maintenance.pages, path];
      return { ...prev, maintenance: { ...prev.maintenance, pages: newPages } };
    });
  };

  const updatePageAccess = (path: string, field: 'roles' | 'nips', value: string) => {
    setSystemConfig(prev => {
      const existing = prev.pageAccess.find(a => a.route === path);
      const values = value.split(',').map(v => v.trim()).filter(v => v !== '');
      
      let newAccess: PageAccess[];
      if (existing) {
        newAccess = prev.pageAccess.map(a => a.route === path ? { ...a, [field]: values } : a);
      } else {
        newAccess = [...prev.pageAccess, { route: path, roles: field === 'roles' ? values : [], nips: field === 'nips' ? values : [] }];
      }
      return { ...prev, pageAccess: newAccess };
    });
  };

  const toggleRoleAccess = (path: string, role: string) => {
    setSystemConfig(prev => {
      const existing = prev.pageAccess.find(a => a.route === path);
      let newAccess: PageAccess[];
      
      if (existing) {
        const roles = existing.roles.includes(role)
          ? existing.roles.filter(r => r !== role)
          : [...existing.roles, role];
        newAccess = prev.pageAccess.map(a => a.route === path ? { ...a, roles } : a);
      } else {
        newAccess = [...prev.pageAccess, { route: path, roles: [role], nips: [] }];
      }
      return { ...prev, pageAccess: newAccess };
    });
  };

  const bulkRoleAccess = (path: string, action: 'all' | 'none') => {
    setSystemConfig(prev => {
      const existing = prev.pageAccess.find(a => a.route === path);
      const allRoles = ['Superadmin', 'Editor', 'Viewer'];
      let newAccess: PageAccess[];
      
      if (existing) {
        newAccess = prev.pageAccess.map(a => a.route === path ? { ...a, roles: action === 'all' ? allRoles : [] } : a);
      } else {
        newAccess = [...prev.pageAccess, { route: path, roles: action === 'all' ? allRoles : [], nips: [] }];
      }
      return { ...prev, pageAccess: newAccess };
    });
  };

  const handleUploadLogo = async (type: 'APP' | 'TEMPLATE', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const res = await uploadFileToDrive(`LOGO_${type}_${Date.now()}`, file.type, base64);
      if (res.success && res.fileUrl) {
        if (type === 'APP') setAppLogo(res.fileUrl);
        else setTemplateLogo(res.fileUrl);
        setSuccessMsg(`Logo ${type === 'APP' ? 'Aplikasi' : 'Kop Surat'} berhasil diunggah.`);
        setShowSuccess(true);
      } else if (res.message) {
        alert(res.message);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveGeneralSettings = () => {
    localStorage.setItem('portal_system_name', systemName);
    localStorage.setItem('portal_running_text', runningTextValue);
    localStorage.setItem('portal_system_logo', appLogo);
    localStorage.setItem('portal_template_logo', templateLogo);
    window.dispatchEvent(new Event('storage_updated'));
    setSuccessMsg("Pengaturan Branding & Teks Berhasil Disimpan.");
    setShowSuccess(true);
    logActivity('UPDATE', 'Settings', 'Update Branding & Teks Sistem');
  };

  const saveCloudConfig = () => {
    localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId);
    localStorage.setItem('portal_cloud_config', JSON.stringify({ appsScriptUrl: dbConfig.appsScriptUrl, driveFolderId: dbConfig.driveFolderId }));
    window.dispatchEvent(new Event('storage_updated'));
    setSuccessMsg("Konfigurasi Database & Drive Berhasil Disimpan.");
    setShowSuccess(true);
    logActivity('UPDATE', 'Settings', 'Update Konfigurasi Cloud Database');
  };

  const handleSyncGid = async () => {
    setSyncingGid(true);
    const ok = await syncGidMap();
    if (ok) {
        setSuccessMsg("Peta GID Spreadsheet Berhasil Disinkronkan.");
        setShowSuccess(true);
    } else {
        alert("Gagal sinkronisasi GID. Periksa Apps Script URL.");
    }
    setSyncingGid(false);
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
        setSuccessMsg(`Data User ${targetUser.name} berhasil diproses.`);
        setShowSuccess(true);
        setLoading(false);
      }, 1000);
    } else { 
        alert("Gagal sinkronisasi ke cloud."); 
        setLoading(false); 
    }
  };

  const saveAbsensiSettings = async () => {
    setLoading(true);
    const ok = await saveAbsensiConfig(absensiConfig);
    if (ok) {
        setSuccessMsg("Pengaturan Absensi Berhasil Disimpan.");
        setShowSuccess(true);
        logActivity('UPDATE', 'Settings', 'Update Pengaturan Absensi (Reguler/WFA)');
    } else {
        alert("Gagal menyimpan pengaturan absensi.");
    }
    setLoading(false);
  };

  const toggleWfaUser = (nip: string) => {
    setAbsensiConfig(prev => {
        const exists = prev.wfaNips.includes(nip);
        if (exists) return { ...prev, wfaNips: prev.wfaNips.filter(n => n !== nip) };
        return { ...prev, wfaNips: [...prev.wfaNips, nip] };
    });
  };

  const inputClass = "w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-2";

  return (
    <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn pb-24 lg:pb-10">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Konfigurasi Berhasil" message={successMsg} />
      
      <div className="flex flex-col lg:flex-row min-h-[800px]">
        {/* TAB NAVIGATION */}
        <div className="w-full lg:w-80 bg-gray-50/50 border-r border-gray-100 p-8 flex flex-row lg:flex-col overflow-x-auto shrink-0 gap-2">
          {[
            { id: 'general', label: 'Branding & Teks', icon: 'bi-palette2' }, 
            { id: 'database', label: 'Integrasi Cloud', icon: 'bi-database-fill-gear' }, 
            { id: 'absensi', label: 'Pengaturan Absensi', icon: 'bi-clock-history' },
            { id: 'access', label: 'Manajemen Akses', icon: 'bi-shield-lock-fill' },
            { id: 'users', label: 'Manajemen User', icon: 'bi-people-fill' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 lg:flex-none flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#111827] text-white shadow-xl' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}>
              <i className={`bi ${tab.icon} text-lg`}></i>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 p-8 md:p-16 overflow-y-auto custom-scrollbar">
          
          {/* TAB GENERAL: BRANDING & TEKS */}
          {activeTab === 'general' && (
            <div className="space-y-12 animate-fadeIn max-w-4xl">
              <div>
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Identitas & Branding</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kustomisasi antarmuka dan pesan sistem</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div>
                        <label className={labelClass}>Nama Sistem / Portal</label>
                        <input type="text" className={inputClass} value={systemName} onChange={e => setSystemName(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>Teks Berjalan (Ticker)</label>
                        <textarea rows={3} className={`${inputClass} normal-case h-24 resize-none`} value={runningTextValue} onChange={e => setRunningTextValue(e.target.value)} />
                    </div>
                 </div>

                 <div className="space-y-8">
                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                       <div className="h-20 w-20 bg-white rounded-2xl p-2 border-2 border-white shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={appLogo} className="h-full w-full object-contain" />
                       </div>
                       <div className="flex-1">
                          <p className={labelClass}>Logo Aplikasi</p>
                          <button onClick={() => appLogoInputRef.current?.click()} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95">Ganti Logo</button>
                          <input type="file" ref={appLogoInputRef} className="hidden" accept="image/*" onChange={e => handleUploadLogo('APP', e)} />
                       </div>
                    </div>
                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                       <div className="h-20 w-20 bg-white rounded-2xl p-2 border-2 border-white shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
                          <img src={templateLogo} className="h-full w-full object-contain" />
                       </div>
                       <div className="flex-1">
                          <p className={labelClass}>Logo Kop Surat (TND)</p>
                          <button onClick={() => templateLogoInputRef.current?.click()} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95">Ganti Logo Kop</button>
                          <input type="file" ref={templateLogoInputRef} className="hidden" accept="image/*" onChange={e => handleUploadLogo('TEMPLATE', e)} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-8 border-t">
                 <button onClick={saveGeneralSettings} disabled={uploading} className="px-16 py-4 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                    {uploading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-check-circle-fill"></i>}
                    Simpan Perubahan Branding
                 </button>
              </div>
            </div>
          )}

          {/* TAB DATABASE: INTEGRASI CLOUD */}
          {activeTab === 'database' && (
            <div className="space-y-12 animate-fadeIn max-w-4xl">
              <div>
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Arsitektur Cloud</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sinkronisasi Google Spreadsheet & Drive API</p>
              </div>

              <div className="space-y-8 bg-blue-50/50 p-10 rounded-[3rem] border border-blue-100">
                 <div className="space-y-6">
                    <div>
                        <label className={labelClass}>Spreadsheet Database ID</label>
                        <input type="text" className={`${inputClass} font-mono normal-case`} value={dbConfig.spreadsheetId} onChange={e => setDbConfig({...dbConfig, spreadsheetId: e.target.value})} placeholder="Paste ID Spreadsheet di sini..." />
                    </div>
                    <div>
                        <label className={labelClass}>Google Apps Script Web App URL</label>
                        <input type="text" className={`${inputClass} font-mono normal-case`} value={dbConfig.appsScriptUrl} onChange={e => setDbConfig({...dbConfig, appsScriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/.../exec" />
                    </div>
                    <div>
                        <label className={labelClass}>Drive Folder ID (Uploads)</label>
                        <input type="text" className={`${inputClass} font-mono normal-case`} value={dbConfig.driveFolderId} onChange={e => setDbConfig({...dbConfig, driveFolderId: e.target.value})} placeholder="ID Folder Drive untuk arsip digital..." />
                    </div>
                 </div>

                 <div className="flex flex-wrap gap-4">
                    <button onClick={saveCloudConfig} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all">Simpan Konfigurasi</button>
                    <button onClick={handleSyncGid} disabled={syncingGid} className="px-12 py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 flex items-center gap-3">
                       {syncingGid ? <div className="h-4 w-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div> : <i className="bi bi-arrow-repeat text-lg"></i>}
                       Sinkronkan Peta GID
                    </button>
                 </div>
              </div>

              <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex gap-6">
                 <div className="h-12 w-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg"><i className="bi bi-exclamation-triangle-fill text-2xl"></i></div>
                 <div>
                    <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-widest">Peringatan Keamanan</h5>
                    <p className="text-[10px] text-amber-700 font-medium mt-2 leading-relaxed uppercase">Perubahan ID database dapat menyebabkan sistem tidak dapat memuat data jika ID tersebut tidak valid atau tidak memiliki izin akses yang tepat.</p>
                 </div>
              </div>
            </div>
          )}

          {/* TAB ABSENSI: PENGATURAN ABSENSI */}
          {activeTab === 'absensi' && (
            <div className="space-y-12 animate-fadeIn max-w-5xl">
              <div>
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Konfigurasi Absensi</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Atur batasan jaringan kantor dan hak akses WFA</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* OFFICE NETWORK SETTINGS */}
                <div className="space-y-8 bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg"><i className="bi bi-wifi"></i></div>
                    <h5 className="text-[12px] font-black text-gray-900 uppercase tracking-widest">Jaringan Kantor (Reguler)</h5>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>Nama Wi-Fi Kantor (SSID)</label>
                      <input type="text" className={inputClass} value={absensiConfig.officeWifiSsid} onChange={e => setAbsensiConfig({...absensiConfig, officeWifiSsid: e.target.value})} placeholder="Contoh: @DJKI_FREE_WIFI" />
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-2 ml-3">* Pegawai reguler wajib terhubung ke Wi-Fi ini</p>
                    </div>
                    <div>
                      <label className={labelClass}>IP Address Kantor (Public IP / Ranges)</label>
                      <input type="text" className={`${inputClass} font-mono`} value={absensiConfig.officeIpAddresses} onChange={e => setAbsensiConfig({...absensiConfig, officeIpAddresses: e.target.value})} placeholder="Contoh: 103.12.34.56, 103.12.34.0/24" />
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-2 ml-3">* Pisahkan dengan koma untuk banyak IP atau gunakan format CIDR (1.2.3.0/24)</p>
                    </div>
                  </div>
                </div>

                {/* WFA WHITELIST */}
                <div className="space-y-6 bg-emerald-50/50 p-10 rounded-[3rem] border border-emerald-100 flex flex-col h-[600px]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg"><i className="bi bi-house-heart"></i></div>
                      <h5 className="text-[12px] font-black text-gray-900 uppercase tracking-widest">Akses WFA (Work From Anywhere)</h5>
                    </div>
                    <span className="px-4 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black">{absensiConfig.wfaNips.length} Pegawai</span>
                  </div>
                  
                  <div className="relative">
                    <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600"></i>
                    <input 
                        type="text" 
                        className="w-full pl-12 pr-5 py-4 bg-white border-2 border-emerald-100 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-emerald-600 transition-all" 
                        placeholder="Cari Nama / NIP Pegawai..." 
                        value={wfaSearch}
                        onChange={e => setWfaSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                    {pegawaiList
                      .filter(p => p.nama.toLowerCase().includes(wfaSearch.toLowerCase()) || p.nip.includes(wfaSearch))
                      .map(p => {
                        const isWfa = absensiConfig.wfaNips.includes(p.nip);
                        return (
                          <div 
                            key={p.nip} 
                            onClick={() => toggleWfaUser(p.nip)}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isWfa ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-900 hover:border-emerald-200'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs ${isWfa ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                                {p.nama.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase leading-tight">{p.nama}</p>
                                <p className={`text-[8px] font-bold ${isWfa ? 'text-white/70' : 'text-gray-400'}`}>NIP. {p.nip}</p>
                              </div>
                            </div>
                            {isWfa && <i className="bi bi-check-circle-fill text-lg"></i>}
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t flex items-center justify-between">
                 <div className="flex items-center gap-4 text-amber-600 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100">
                    <i className="bi bi-info-circle-fill text-xl"></i>
                    <p className="text-[9px] font-black uppercase leading-relaxed">Pegawai yang tidak ada di daftar WFA <br/>hanya bisa absen jika terhubung Wi-Fi Kantor.</p>
                 </div>
                 <button onClick={saveAbsensiSettings} disabled={loading} className="px-16 py-5 bg-[#111827] text-white rounded-[2rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                    {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-upload-fill text-lg"></i>}
                    Simpan Konfigurasi Absensi
                 </button>
              </div>
            </div>
          )}

          {/* TAB ACCESS: MANAJEMEN AKSES & PEMELIHARAAN */}
          {activeTab === 'access' && (
            <div className="space-y-12 animate-fadeIn max-w-6xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Akses & Pemeliharaan</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kontrol akses halaman dan status pengembangan</p>
                </div>
                <button onClick={saveSystemSettings} disabled={loading} className="px-10 py-4 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 flex items-center gap-3">
                  {loading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-upload-fill"></i>}
                  Simpan Semua Perubahan
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* MAINTENANCE MODE */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-12 w-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg"><i className="bi bi-tools"></i></div>
                      <h5 className="text-[12px] font-black text-amber-900 uppercase tracking-widest">Mode Pemeliharaan</h5>
                    </div>
                    <div className="space-y-4">
                      <label className="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-amber-100 cursor-pointer hover:border-amber-300 transition-all">
                        <input 
                          type="checkbox" 
                          className="h-6 w-6 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500"
                          checked={systemConfig.maintenance.all}
                          onChange={e => setSystemConfig({...systemConfig, maintenance: {...systemConfig.maintenance, all: e.target.checked}})}
                        />
                        <span className="text-[11px] font-black text-amber-900 uppercase">Tutup Seluruh Sistem</span>
                      </label>
                      <p className="text-[8px] text-amber-600 font-bold uppercase ml-2">* Jika aktif, seluruh halaman akan menampilkan pesan pemeliharaan kecuali untuk Superadmin.</p>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-[500px]">
                    <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Halaman Dalam Pengembangan</h5>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {APP_ROUTES.map(route => (
                        <div 
                          key={route.path}
                          onClick={() => toggleMaintenancePage(route.path)}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${systemConfig.maintenance.pages.includes(route.path) ? 'bg-amber-500 border-amber-500 text-white shadow-md' : 'bg-white border-gray-50 text-gray-900 hover:border-amber-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <i className={`bi ${route.icon} text-lg`}></i>
                            <span className="text-[10px] font-black uppercase">{route.label}</span>
                          </div>
                          {systemConfig.maintenance.pages.includes(route.path) && <i className="bi bi-cone-striped"></i>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* PAGE ACCESS CONTROL */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-100 rounded-[3rem] overflow-hidden shadow-sm flex flex-col h-[700px]">
                    <div className="p-8 bg-gray-50 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h5 className="text-[12px] font-black text-gray-900 uppercase tracking-widest">Kontrol Akses Halaman</h5>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Superadmin memiliki akses penuh ke semua halaman</span>
                      </div>
                      <div className="relative w-full md:w-64">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input 
                          type="text" 
                          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-blue-600 transition-all"
                          placeholder="Cari Halaman..."
                          value={accessSearch}
                          onChange={e => setAccessSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                      {APP_ROUTES.filter(r => r.label.toLowerCase().includes(accessSearch.toLowerCase()) || r.path.toLowerCase().includes(accessSearch.toLowerCase())).map(route => {
                        const access = systemConfig.pageAccess.find(a => a.route === route.path);
                        return (
                          <div key={route.path} className="p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 space-y-6">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm text-blue-600"><i className={`bi ${route.icon}`}></i></div>
                                <div>
                                  <h6 className="text-[11px] font-black text-gray-900 uppercase">{route.label}</h6>
                                  <p className="text-[9px] font-mono text-gray-400">{route.path}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => bulkRoleAccess(route.path, 'all')} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase border border-blue-100 hover:bg-blue-600 hover:text-white transition-all">All</button>
                                <button onClick={() => bulkRoleAccess(route.path, 'none')} className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[8px] font-black uppercase border border-gray-200 hover:bg-gray-200 hover:text-gray-600 transition-all">None</button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className={labelClass}>Role yang Diizinkan</label>
                                <div className="flex flex-wrap gap-3 mt-2">
                                  {['Superadmin', 'Editor', 'Viewer'].map(role => {
                                    const isChecked = access?.roles.includes(role);
                                    return (
                                      <label key={role} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:border-blue-200'}`}>
                                        <input 
                                          type="checkbox" 
                                          className="hidden"
                                          checked={isChecked}
                                          onChange={() => toggleRoleAccess(route.path, role)}
                                        />
                                        <i className={`bi ${isChecked ? 'bi-check-square-fill' : 'bi-square'} text-sm`}></i>
                                        <span className="text-[10px] font-black uppercase tracking-wider">{role}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                                <p className="text-[8px] text-gray-400 font-bold uppercase mt-3 ml-2">* Superadmin disarankan tetap dicentang</p>
                              </div>
                              <div>
                                <label className={labelClass}>NIP Khusus (Whitelist)</label>
                                <input 
                                  type="text" 
                                  className={`${inputClass} font-mono`}
                                  placeholder="Contoh: 19800101..., 19900202..."
                                  value={access?.nips.join(', ') || ''}
                                  onChange={e => updatePageAccess(route.path, 'nips', e.target.value)}
                                />
                                <p className="text-[8px] text-gray-400 font-bold uppercase mt-2 ml-2">* Pisahkan dengan koma</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB USERS CONTENT */}
          {activeTab === 'users' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-end border-b pb-6 gap-4">
                <div>
                  <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Manajemen User Cloud</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kelola akun administrator sistem</p>
                </div>
                <button onClick={() => { setUserFormData({ role: 'Viewer' }); setIsUserModalOpen(true); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg tracking-widest">+ Admin Baru</button>
              </div>
              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-x-auto custom-scrollbar shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
                    <tr><th className="px-10 py-5">Identitas & NIP</th><th className="px-4 py-5 text-center">Role</th><th className="px-10 py-5 text-right">Opsi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="group hover:bg-blue-50/10 transition-colors">
                        <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{u.name}</p><p className="text-[9px] font-mono text-gray-400">NIP. {u.nip}</p></td>
                        <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase border border-blue-100">{u.role}</span></td>
                        <td className="px-10 py-5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { setUserFormData(u); setIsUserModalOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 rounded-xl text-amber-500 hover:bg-amber-500 hover:text-white shadow-sm flex items-center justify-center transition-all"><i className="bi bi-pencil-square"></i></button>
                                {isSuperadmin && u.nip !== currentUser?.nip && (
                                    <button onClick={() => { if(window.confirm('Hapus user ini?')) handleUserAction('DELETE', u) }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 hover:bg-rose-500 hover:text-white shadow-sm flex items-center justify-center transition-all"><i className="bi bi-trash-fill"></i></button>
                                )}
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
      </div>

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-md" onClick={() => !loading && setIsUserModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-modalEnter flex flex-col max-h-[90vh] border border-white/20">
              {/* STICKY HEADER */}
              <div className="p-8 border-b bg-gray-50 shrink-0 flex justify-between items-center relative z-30">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner"><i className="bi bi-person-badge-fill"></i></div>
                    <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Otorisasi Admin</h4>
                 </div>
                 <button onClick={() => setIsUserModalOpen(false)} className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                    <i className="bi bi-x-lg text-xl"></i>
                 </button>
              </div>
              {/* SCROLLABLE BODY */}
              <div className="flex-1 p-10 space-y-4 overflow-y-auto custom-scrollbar bg-white">
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">NIP Pegawai</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={userFormData.nip || ''} onChange={e => setUserFormData({...userFormData, nip: e.target.value.replace(/\D/g, '')})} /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Nama Lengkap</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black uppercase outline-none" value={userFormData.name || ''} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Kata Sandi</label><input type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={userFormData.password || ''} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-2">Role Akses</label><select className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-black outline-none" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="Superadmin">Superadmin</option><option value="Editor">Editor</option><option value="Viewer">Viewer</option></select></div>
              </div>
              {/* STICKY FOOTER */}
              <div className="p-8 bg-gray-50 border-t shrink-0 flex gap-3 relative z-30">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batalkan</button>
                 <button onClick={() => handleUserAction('SAVE')} disabled={loading} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-blue-600/30 active:scale-95 disabled:bg-blue-300">
                    {loading ? 'Processing...' : 'Simpan User'}
                 </button>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SettingsPage;
