
import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import * as XLSX from 'xlsx';

const ActivityLogPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Confirmation state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const savedLogs = localStorage.getItem('portal_audit_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.userNip.includes(searchTerm) ||
      l.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.module.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  const clearLogs = () => {
    localStorage.removeItem('portal_audit_logs');
    setLogs([]);
    setIsConfirmOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredLogs.map(l => ({
      'Waktu': l.timestamp,
      'User': l.userName,
      'NIP': l.userNip,
      'Modul': l.module,
      'Aksi': l.action,
      'Deskripsi': l.description
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log Aktivitas");
    XLSX.writeFile(wb, `Audit_Logs_SDM_DJKI_${new Date().getTime()}.xlsx`);
  };

  const actionColors: Record<string, string> = {
    'CREATE': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'UPDATE': 'bg-blue-50 text-blue-600 border-blue-100',
    'DELETE': 'bg-rose-50 text-rose-600 border-rose-100',
    'DOWNLOAD': 'bg-amber-50 text-amber-600 border-amber-100',
    'LOGIN': 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={clearLogs}
        title="Bersihkan Semua Log"
        message="Hapus seluruh riwayat aktivitas sistem? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Bersihkan Log"
      />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Audit Log Aktivitas</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pencatatan Jejak Aktivitas User & Perubahan Data Sistem</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <i className="bi bi-file-earmark-spreadsheet text-lg"></i>
            <span>Ekspor Excel</span>
          </button>
          <button 
            onClick={() => setIsConfirmOpen(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-600/20"
          >
            Bersihkan Log
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 bg-gray-50/30">
          <div className="relative flex-1">
            <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input 
              type="text" 
              placeholder="Cari User, NIP, atau Detail Aktivitas..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-600 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[8px] font-black uppercase text-gray-400 border-b tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Waktu Aktivitas</th>
                <th className="px-4 py-5">Administrator</th>
                <th className="px-4 py-5">Modul</th>
                <th className="px-4 py-5 text-center">Aksi</th>
                <th className="px-8 py-5">Deskripsi Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/5 transition-all">
                  <td className="px-8 py-5 text-[10px] font-black text-gray-500">{log.timestamp}</td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-black text-gray-900 uppercase">{log.userName}</p>
                    <p className="text-[8px] font-mono text-blue-600 font-bold tracking-tighter">{log.userNip}</p>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{log.module}</span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase border ${actionColors[log.action] || 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase leading-relaxed max-w-md">{log.description}</p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest opacity-40">
                    <i className="bi bi-clock-history text-5xl mb-4 block"></i>
                    Belum ada riwayat aktivitas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
