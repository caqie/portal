
import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets, uploadFileToDrive, syncTableRemote } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';

const SettingsPage = () => {
  const { isSuperadmin, logActivity, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Refs for uploads
  const appLogoInputRef = useRef<HTMLInputElement>(null);
  const templateLogoInputRef = useRef<HTMLInputElement>(null);
  
  // Branding States
  const [systemName, setSystemName] = useState(localStorage.getItem('portal_system_name') || 'Portal SDM');
  const [runningTextValue, setRunningTextValue] = useState(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM DJKI.');
  const [appLogo, setAppLogo] = useState<string>(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
  const [templateLogo, setTemplateLogo] = useState<string>(localStorage.getItem('portal_template_logo') || DEFAULT_LOGO);
  
  // Users States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({ role: 'Viewer' });

  // Maintenance States
  const [maintConfig, setMaintConfig] = useState<MaintenanceConfig>({
    all: false,
    pages: []
  });

  // Database States
  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: localStorage.getItem('db_spreadsheet_id') || '',
    appsScriptUrl: JSON.parse(localStorage.getItem('portal_cloud_config') || '{}').appsScriptUrl || ''
  });

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    // Load Users
    const u = await fetchUsersFromSheets();
    setUsers(u);
    
    // Load Maintenance
    const m = localStorage.getItem('maintenance_config');
    if (m) setMaintConfig(JSON.parse(m));
    
    setLoading(false);
  };

  const handleFileUpload = async (type: 'APP' | 'TEMPLATE', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Maksimal 2MB");

    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const result = await uploadFileToDrive(`${type}_LOGO_${Date.now()}`, file.type, base64);
      
      if (result.success && result.fileUrl) {
        if (type === 'APP') {
          setAppLogo(result.fileUrl);
          localStorage.setItem('portal_system_logo', result.fileUrl);
        } else {
          setTemplateLogo(result.fileUrl);
          localStorage.setItem('portal_template_logo', result.fileUrl);
        }
        window.dispatchEvent(new Event('storage_updated'));
        setSuccessMsg(`Logo ${type === 'APP' ? 'Aplikasi' : 'Template'} berhasil diperbarui.`);
        setShowSuccess(true);
        logActivity('UPDATE', 'Settings', `Update Logo ${type}`);
      } else {
        alert("Gagal upload: " + (result.message || "Periksa koneksi."));
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveBranding = async () => {
    localStorage.setItem('portal_system_name', systemName);
    localStorage.setItem('portal_running_text', runningTextValue);
    window.dispatchEvent(new Event('storage_updated'));
    setSuccessMsg("Pengaturan visual berhasil disimpan.");
    setShowSuccess(true);
  };

  const toggleMaintenance = (page: string) => {
    let newPages = [...maintConfig.pages];
    if (page === 'ALL') {
      const newConfig = { ...maintConfig, all: !maintConfig.all };
      setMaintConfig(newConfig);
      localStorage.setItem('maintenance_config', JSON.stringify(newConfig));
    } else {
      if (newPages.includes(page)) newPages = newPages.filter(p => p !== page);
      else newPages.push(page);
      const newConfig = { ...maintConfig, pages: newPages };
      setMaintConfig(newConfig);
      localStorage.setItem('maintenance_config', JSON.stringify(newConfig));
    }
    window.dispatchEvent(new Event('storage_updated'));
  };

  const handleUserAction = async (action: 'SAVE' | 'DELETE', userData?: AdminUser) => {
    setLoading(true);
    const targetUser = userData || (userFormData as AdminUser);
    const success = await syncTableRemote('USERS', action === 'SAVE' ? 'SAVE' : 'DELETE', targetUser);
    if (success) {
      await loadSettingsData();
      setIsUserModalOpen(false);
      setSuccessMsg(`Data User berhasil ${action === 'SAVE' ? 'disimpan' : 'dihapus'}.`);
      setShowSuccess(true);
    } else {
      alert("Gagal sinkronisasi data user ke Cloud.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn pb-24 lg:pb-10">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" message={successMsg} />
      
      <div className="flex flex-col lg:flex-row min-h-[800px]">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-80 bg-gray-50/50 border-r border-gray-100 p-8 space-y-2 flex flex-row lg:flex-col overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'general', label: 'Branding', icon: 'bi-palette2' },
            { id: 'users', label: 'Manajemen User', icon: 'bi-people-fill' },
            { id: 'maintenance', label: 'Maintenance', icon: 'bi-cone-striped' },
            { id: 'database', label: 'Koneksi Data', icon: 'bi-database-fill-gear' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 lg:flex-none flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#111827] text-white shadow-xl' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}>
              <i className={`bi ${tab.icon} text-lg`}></i>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 md:p-16 overflow-y-auto">
          
          {/* TAB 1: BRANDING */}
          {activeTab === 'general' && (
            <div className="max-w-4xl space-y-12 animate-fadeIn">
              <div className="border-b pb-6">
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Identitas Visual</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kustomisasi Logo Aplikasi dan Template Dokumen Resmi</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Aplikasi */}
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-6">
                   <h6 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Logo Antarmuka (Sidebar)</h6>
                   <div className="h-32 w-32 bg-white rounded-3xl p-4 shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
                      <img src={appLogo} className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                   </div>
                   <button onClick={() => appLogoInputRef.current?.click()} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50">Ganti Logo UI</button>
                   <input type="file" ref={appLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload('APP', e)} />
                </div>

                {/* Logo Template */}
                <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center space-y-6">
                   <h6 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Logo Kop Dokumen (Template)</h6>
                   <div className="h-32 w-32 bg-white rounded-3xl p-4 shadow-xl border-4 border-white overflow-hidden flex items-center justify-center">
                      <img src={templateLogo} className="max-h-full max-w-full object-contain" crossOrigin="anonymous" />
                   </div>
                   <button onClick={() => templateLogoInputRef.current?.click()} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50">Ganti Logo Kop</button>
                   <input type="file" ref={templateLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload('TEMPLATE', e)} />
                </div>
              </div>

              <div className="space-y-6 bg-white p-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Nama Portal Sistem</label>
                  <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-950 uppercase outline-none focus:border-blue-600" value={systemName} onChange={e => setSystemName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Running Info Text</label>
                  <textarea rows={2} className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-bold text-gray-700 resize-none outline-none focus:border-blue-600" value={runningTextValue} onChange={e => setRunningTextValue(e.target.value)} />
                </div>
                <button onClick={saveBranding} className="px-12 py-5 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Simpan Perubahan Branding</button>
              </div>
            </div>
          )}

          {/* TAB 2: MANAJEMEN USER */}
          {activeTab === 'users' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex justify-between items-end border-b pb-6">
                <div>
                  <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Hak Akses Pengguna</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Daftar Administrator dan Operator Sistem</p>
                </div>
                <button onClick={() => { setUserFormData({ role: 'Viewer' }); setIsUserModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">+ Tambah User</button>
              </div>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr><th className="px-8 py-5">Identitas</th><th className="px-4 py-5">Role</th><th className="px-8 py-5 text-right">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="group hover:bg-blue-50/10">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-gray-100 overflow-hidden border flex items-center justify-center font-black text-blue-600">
                              {u.foto ? <img src={u.foto} className="h-full w-full object-cover" /> : u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-gray-950 uppercase">{u.name}</p>
                              <p className="text-[9px] font-mono text-gray-400">NIP. {u.nip}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border ${u.role === 'Superadmin' ? 'bg-rose-50 text-rose-600 border-rose-100' : u.role === 'Editor' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{u.role}</span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setUserFormData(u); setIsUserModalOpen(true); }} className="h-9 w-9 bg-white border rounded-xl text-gray-400 hover:text-blue-600 shadow-sm transition-all"><i className="bi bi-pencil-fill"></i></button>
                            <button onClick={() => handleUserAction('DELETE', u)} className="h-9 w-9 bg-white border rounded-xl text-gray-400 hover:text-rose-600 shadow-sm transition-all" disabled={u.nip === currentUser?.nip}><i className="bi bi-trash-fill"></i></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div className="max-w-3xl space-y-12 animate-fadeIn">
              <div className="border-b pb-6">
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Panel Pemeliharaan</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Kontrol Akses Halaman Saat Update Data Masal</p>
              </div>

              <div className={`p-10 rounded-[3rem] border-4 transition-all ${maintConfig.all ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                       <div className={`h-16 w-16 rounded-3xl flex items-center justify-center text-white shadow-xl ${maintConfig.all ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                          <i className={`bi ${maintConfig.all ? 'bi-lock-fill' : 'bi-shield-check'} text-3xl`}></i>
                       </div>
                       <div>
                          <h5 className={`text-xl font-black uppercase tracking-tight ${maintConfig.all ? 'text-rose-900' : 'text-emerald-900'}`}>Maintenance Global</h5>
                          <p className={`text-[10px] font-bold uppercase ${maintConfig.all ? 'text-rose-600' : 'text-emerald-600'}`}>
                             {maintConfig.all ? 'Sistem Terkunci untuk Seluruh Pengguna' : 'Sistem Berjalan Normal'}
                          </p>
                       </div>
                    </div>
                    <button 
                      onClick={() => toggleMaintenance('ALL')}
                      className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${maintConfig.all ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
                    >
                      {maintConfig.all ? 'Aktifkan Sistem' : 'Kunci Sistem'}
                    </button>
                 </div>
              </div>

              <div className="space-y-6">
                 <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Kontrol Selektif Halaman</h6>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {id: 'absensi', label: 'Modul Absensi Wajah'},
                      {id: 'pegawai', label: 'Database Pegawai'},
                      {id: 'skp', label: 'Evaluasi SKP/E-Kinerja'},
                      {id: 'pak', label: 'Penetapan Angka Kredit'},
                      {id: 'dossier', label: 'E-Dossier (Arsip Drive)'},
                      {id: 'layanan', label: 'Layanan Karir & Diklat'}
                    ].map(page => (
                      <div key={page.id} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] shadow-sm">
                         <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{page.label}</span>
                         <button 
                          onClick={() => toggleMaintenance(page.id)}
                          className={`w-14 h-8 rounded-full relative transition-all ${maintConfig.pages.includes(page.id) ? 'bg-rose-500' : 'bg-gray-200'}`}
                         >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${maintConfig.pages.includes(page.id) ? 'left-7' : 'left-1'}`}></div>
                         </button>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATABASE */}
          {activeTab === 'database' && (
            <div className="max-w-3xl space-y-12 animate-fadeIn">
               <div className="border-b pb-6">
                <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Integrasi Cloud</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Konfigurasi Endpoint Backend Google Apps Script</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Apps Script URL (Backend)</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold text-blue-600" value={dbConfig.appsScriptUrl} onChange={e => setDbConfig({...dbConfig, appsScriptUrl: e.target.value})} placeholder="https://script.google.com/macros/s/.../exec" /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Master Spreadsheet ID</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-mono font-bold text-gray-600" value={dbConfig.spreadsheetId} onChange={e => setDbConfig({...dbConfig, spreadsheetId: e.target.value})} /></div>
                <button onClick={() => { localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId); localStorage.setItem('portal_cloud_config', JSON.stringify({ appsScriptUrl: dbConfig.appsScriptUrl })); setSuccessMsg("Koneksi Database Berhasil Disimpan."); setShowSuccess(true); }} className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Update Konfigurasi Cloud</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* USER MODAL */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md" onClick={() => setIsUserModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-12 animate-modalEnter space-y-8">
              <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Manajemen Akses User</h4>
              <div className="space-y-5">
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">NIP Pegawai</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-black" value={userFormData.nip} onChange={e => setUserFormData({...userFormData, nip: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Nama Lengkap</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-black uppercase" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Password Akses</label><input type="text" className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-black" value={userFormData.password} onChange={e => setUserFormData({...userFormData, password: e.target.value})} /></div>
                 <div className="space-y-1"><label className="text-[8px] font-black text-gray-500 uppercase ml-2">Level Akses</label><select className="w-full px-5 py-4 bg-gray-50 border rounded-2xl text-xs font-black" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})}><option value="Superadmin">Superadmin</option><option value="Editor">Editor</option><option value="Viewer">Viewer (Pegawai)</option></select></div>
              </div>
              <div className="flex gap-3 pt-4">
                 <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-400 rounded-2xl text-[10px] font-black uppercase">Batal</button>
                 <button onClick={() => handleUserAction('SAVE')} className="flex-[1.5] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Simpan Akses</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
