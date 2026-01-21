
import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, MaintenanceConfig, CloudConfig } from '../types';
import { fetchUsersFromSheets, uploadFileToDrive } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
// Fix: Add quotes to import string literal and correct path
import SuccessModal from '../components/SuccessModal';

const SettingsPage = () => {
  const { isSuperadmin, logActivity } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Branding States
  const [systemName, setSystemName] = useState(localStorage.getItem('portal_system_name') || 'Portal SDM');
  const [runningTextValue, setRunningTextValue] = useState(localStorage.getItem('portal_running_text') || 'Selamat Datang di Portal SDM DJKI.');
  const [systemLogo, setSystemLogo] = useState<string | null>(localStorage.getItem('portal_system_logo') || DEFAULT_LOGO);
  
  // Database States
  const [dbConfig, setDbConfig] = useState({
    spreadsheetId: localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4',
    pegawaiGid: localStorage.getItem('db_pegawai_gid') || '1631838106',
    appsScriptUrl: JSON.parse(localStorage.getItem('portal_cloud_config') || '{}').appsScriptUrl || ''
  });
  
  // Maintenance States
  const [maintenance, setMaintenance] = useState<MaintenanceConfig>(() => {
    const saved = localStorage.getItem('maintenance_config');
    return saved ? JSON.parse(saved) : { all: false, pages: [] };
  });

  // User States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<AdminUser>>({});

  useEffect(() => {
    const loadUsers = async () => {
      const saved = localStorage.getItem('portal_users_db');
      if (saved) { setUsers(JSON.parse(saved)); } 
      else { 
        try { 
          const initial = await fetchUsersFromSheets(); 
          setUsers(initial); 
          localStorage.setItem('portal_users_db', JSON.stringify(initial)); 
        } catch (e) { console.error(e); } 
      }
    };
    loadUsers();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) return alert("Maksimal ukuran logo 2MB");

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const result = await uploadFileToDrive(`LOGO_INSTANSI_${Date.now()}`, file.type, base64);
      
      if (result.success && result.fileUrl) {
        setSystemLogo(result.fileUrl);
        localStorage.setItem('portal_system_logo', result.fileUrl);
        window.dispatchEvent(new Event('storage_updated'));
        setSuccessMsg("Logo instansi berhasil diunggah ke Google Drive dan diperbarui.");
        setShowSuccess(true);
      } else {
        alert("Gagal upload: " + (result.message || "Pastikan Apps Script URL benar"));
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('portal_system_name', systemName);
    localStorage.setItem('portal_running_text', runningTextValue);
    window.dispatchEvent(new Event('storage_updated'));
    setSuccessMsg('Tampilan visual sistem berhasil diperbarui.');
    setShowSuccess(true);
  };

  const handleSaveDatabase = () => {
    localStorage.setItem('db_spreadsheet_id', dbConfig.spreadsheetId);
    localStorage.setItem('db_pegawai_gid', dbConfig.pegawaiGid);
    const cloud: CloudConfig = { driveFolderId: '', appsScriptUrl: dbConfig.appsScriptUrl, logoUrl: systemLogo || '' };
    localStorage.setItem('portal_cloud_config', JSON.stringify(cloud));
    setSuccessMsg('Konfigurasi sinkronisasi database berhasil disimpan.');
    setShowSuccess(true);
  };
  
  // ... (Sisa fungsi lainnya tetap sama)

  return (
    <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden animate-fadeIn pb-24 lg:pb-10">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" message={successMsg} />
      
      <div className="flex flex-col lg:flex-row min-h-[700px]">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 bg-gray-50/50 border-r border-gray-100 p-6 md:p-10 space-y-2 flex flex-row lg:flex-col overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'general', label: 'Branding', icon: 'bi-palette2' },
            { id: 'users', label: 'Akses', icon: 'bi-shield-lock' },
            { id: 'database', label: 'Database', icon: 'bi-database-fill-gear' },
            { id: 'maintenance', label: 'Panel', icon: 'bi-cone-striped' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 lg:flex-none flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-[#111827] text-white shadow-xl' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}>
              <i className={`bi ${tab.icon} text-lg`}></i>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6 md:p-12 lg:p-16 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="max-w-3xl animate-fadeIn space-y-12">
              <div className="border-b pb-8">
                <h4 className="text-2xl font-black text-gray-900 uppercase">Visual Branding</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Identitas Digital & Logo Instansi</p>
              </div>
              
              <div className="p-8 md:p-10 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center gap-10">
                 <div className="h-40 w-40 rounded-3xl bg-white border-4 border-white flex items-center justify-center p-6 shadow-2xl overflow-hidden shrink-0 group relative">
                    <img src={systemLogo || DEFAULT_LOGO} className="h-full w-full object-contain" crossOrigin="anonymous" />
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                 </div>
                 <div className="flex-1 space-y-5">
                    <h6 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Master Dokumen</h6>
                    <p className="text-[9px] text-gray-400 font-bold uppercase leading-relaxed">Logo ini akan otomatis tampil di Kop Surat BA Pelantikan, PAK, SPMT, SPP, dan DRH Pegawai.</p>
                    <div className="flex gap-3">
                       <button onClick={() => logoInputRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95">Ganti Logo (Drive)</button>
                       <button onClick={() => { setSystemLogo(DEFAULT_LOGO); localStorage.setItem('portal_system_logo', DEFAULT_LOGO); window.dispatchEvent(new Event('storage_updated')); }} className="px-6 py-3 bg-white text-rose-500 border border-rose-100 rounded-xl font-black text-[9px] uppercase tracking-widest">Reset</button>
                    </div>
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                 </div>
              </div>

              <form onSubmit={handleSaveBranding} className="space-y-6">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Nama Portal</label><input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-black text-gray-950 uppercase outline-none focus:border-blue-600" value={systemName} onChange={e => setSystemName(e.target.value)} /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-3">Running Text</label><textarea rows={3} className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 resize-none outline-none focus:border-blue-600" value={runningTextValue} onChange={e => setRunningTextValue(e.target.value)} /></div>
                <button type="submit" className="px-12 py-5 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">Simpan Perubahan Visual</button>
              </form>
            </div>
          )}
          
          {/* ... (Tab lainnya tetap sama) */}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
