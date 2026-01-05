
import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog } from '../types';

const ActivityLogPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
    if (confirm("Hapus seluruh riwayat aktivitas sistem? Tindakan ini tidak dapat dibatalkan.")) {
      localStorage.removeItem('portal_audit_logs');
      setLogs([]);
    }
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Audit Log Aktivitas</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pencatatan Jejak Aktivitas User & Perubahan Data Sistem</p>
        </div>
        <button 
          onClick={clearLogs}
          className="px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-600/20"
        >
          Bersihkan Log
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        <div className="relative group max-w-xl">
          <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input 
            type="text" 
            placeholder="Cari User, NIP, atau Deskripsi Aktivitas..." 
            className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 text-xs font-bold transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-4 py-4">User / NIP</th>
                <th className="px-4 py-4 text-center">Modul</th>
                <th className="px-4 py-4 text-center">Aksi</th>
                <th className="px-6 py-4">Deskripsi Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length > 0 ? filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-blue-50/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-gray-900 uppercase">{l.timestamp.split(',')[0]}</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">{l.timestamp.split(',')[1]}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-[10px] font-black text-gray-900 uppercase leading-none">{l.userName}</p>
                    <p className="text-[8px] font-mono text-gray-400 mt-1 uppercase tracking-tighter">{l.userNip}</p>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[8px] font-black uppercase rounded border border-gray-200">{l.module}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg border ${actionColors[l.action] || 'bg-gray-50 text-gray-500'}`}>{l.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-bold text-gray-600 leading-relaxed uppercase">{l.description}</p>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <i className="bi bi-clock-history text-gray-200 text-5xl mb-4 block"></i>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Belum ada riwayat aktivitas</p>
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
