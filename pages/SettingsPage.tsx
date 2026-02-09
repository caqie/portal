
import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets, uploadFileToDrive, syncTableRemote, syncGidMap } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, DEFAULT_TEMPLATE_LOGO } from '../constants';
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
    } catch (e) { console.error("Gagal memuat data pengaturan:", e); }
    setLoading(false);
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

  const inputClass = "w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-2";

  return (
    <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn pb-24 lg:pb-10">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Konfigurasi Berhasil" message={successMsg} />
      
      <div className="flex flex-col lg:flex-row min-h-[800px]">
        {/* TAB NAVIGATION */}
        <div className="w-full lg:w-80 bg-gray-50/50 border-r border-gray-100 p-8 flex flex-row lg:flex-col overflow-x-auto no-scrollbar shrink-0 gap-2">
          {[
            { id: 'general', label: 'Branding & Teks', icon: 'bi-palette2' }, 
            { id: 'database', label: 'Integrasi Cloud', icon: 'bi-database-fill-gear' }, 
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
              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
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
