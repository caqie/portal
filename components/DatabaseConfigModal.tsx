import React, { useState, useEffect } from 'react';
import { syncGidMap, saveSharedConfigToServer } from '../spreadsheetService';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedSpreadsheetId = localStorage.getItem('db_spreadsheet_id') || '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4';
      let savedAppsScriptUrl = '';
      let savedDriveFolderId = '';
      
      try {
        const cloudConfig = JSON.parse(localStorage.getItem('portal_cloud_config') || '{}');
        savedAppsScriptUrl = cloudConfig.appsScriptUrl || '';
        savedDriveFolderId = cloudConfig.driveFolderId || '';
      } catch (e) {
        console.error(e);
      }
      
      setSpreadsheetId(savedSpreadsheetId);
      setAppsScriptUrl(savedAppsScriptUrl);
      setDriveFolderId(savedDriveFolderId);
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      // 1. Save directly to localStorage & Sync to Server (for other users)
      localStorage.setItem('db_spreadsheet_id', spreadsheetId.trim());
      localStorage.setItem('portal_cloud_config', JSON.stringify({
        appsScriptUrl: appsScriptUrl.trim(),
        driveFolderId: driveFolderId.trim()
      }));

      // Persist configuration to the cloud server
      await saveSharedConfigToServer(
        spreadsheetId.trim(),
        appsScriptUrl.trim(),
        driveFolderId.trim()
      );

      // Fire event to notify app components of storage update
      window.dispatchEvent(new Event('storage_updated'));

      // 2. Perform Sync GID maps automatically to retrieve sub-sheet GIDs
      setStatusMsg({ type: 'success', text: 'Konfigurasi disimpan. Sedang menyelaraskan GID Sheet...' });
      
      const success = await syncGidMap();
      if (success) {
        setStatusMsg({ 
          type: 'success', 
          text: 'Konfigurasi & GID Peta berhasil diselaraskan secara otomatis! Aplikasi akan disegarkan...' 
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setStatusMsg({ 
          type: 'success', 
          text: 'Konfigurasi tersimpan secara lokal. GID map tidak dapat disinkronisasi saat ini karena Apps Script tidak merespons (abaikan jika Apps Script belum di-deploy). Mengatur ulang aplikasi...' 
        });
        setTimeout(() => {
          window.location.reload();
        }, 2500);
      }
    } catch (err: any) {
      setStatusMsg({ 
        type: 'error', 
        text: 'Gagal saat menyimpan atau sinkronisasi: ' + (err.message || String(err)) 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10009] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-6 md:p-10 flex flex-col animate-modalEnter border border-gray-100 max-h-[92vh] overflow-y-auto text-gray-950">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5 mb-6">
          <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner shrink-0">
            <i className="bi bi-database-fill-gear text-2xl"></i>
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black text-gray-950 uppercase tracking-tight">
              Koneksi Sumber Data (Google Sheets)
            </h3>
            <p className="text-[9px] md:text-[10px] text-gray-500 font-bold mt-0.5">
              Atur integrasi cloud database untuk domain aktif saat ini.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Spreadsheet ID */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block ml-1">
              Google Spreadsheet ID
            </label>
            <input 
              type="text"
              required
              placeholder="Contoh: 1Bh77MMU8d6fgNTKhovLE5MkG0-3C..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 text-[11px] font-black tracking-wide text-gray-950 focus:bg-white transition-all"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
            />
            <p className="text-[8px] text-gray-400 font-bold ml-1">
              Salin kode acak panjang dari URL Google Sheet Anda di antara <code className="bg-gray-100 px-1 py-0.5 font-mono text-gray-700">/d/</code> dan <code className="bg-gray-100 px-1 py-0.5 font-mono text-gray-700">/edit</code>.
            </p>
          </div>

          {/* Apps Script Web App URL */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block ml-1">
              Google Apps Script App URL (Optional)
            </label>
            <input 
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 text-[11px] font-black tracking-wide text-gray-950 focus:bg-white transition-all font-mono"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
            />
            <p className="text-[8px] text-gray-400 font-bold ml-1">
              Digunakan untuk pengeditan dan pemrosesan remote. Kosongkan jika Anda hanya ingin membaca data via Web.
            </p>
          </div>

          {/* Drive Folder ID */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block ml-1">
              Google Drive Folder ID (Optional)
            </label>
            <input 
              type="text"
              placeholder="Contoh: 19OkO6ZAMnTXaxy-58ntHRV..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 text-[11px] font-black tracking-wide text-gray-950 focus:bg-white transition-all font-mono"
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
            />
            <p className="text-[8px] text-gray-400 font-bold ml-1">
              ID Folder Google Drive untuk mengunggah dokumen dossier pegawai.
            </p>
          </div>

          {/* Status Message Display */}
          {statusMsg && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 animate-fadeIn text-[9px] sm:text-[10px] font-black ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
              <i className={`bi shrink-0 text-base ${statusMsg.type === 'success' ? 'bi-patch-check-fill animate-pulse' : 'bi-exclamation-octagon-fill'}`}></i>
              <p className="leading-normal">{statusMsg.text}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Simpan & Terapkan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DatabaseConfigModal;
