import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
  getFaceRegistrationByNip,
  getSmartAttendanceRecords
} from '../../services/smartPresensi/SmartAttendanceService';
import { SmartAttendanceRecord } from '../../types';

export const PresensiTodayWidget: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [todayRecords, setTodayRecords] = useState<SmartAttendanceRecord[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' WIB'
      );
    }, 1000);

    const now = new Date();
    setCurrentTime(
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' WIB'
    );

    if (user?.nip) {
      const reg = getFaceRegistrationByNip(user.nip);
      setIsFaceRegistered(reg?.status === 'REGISTERED');

      const todayStr = now.toISOString().split('T')[0];
      const records = getSmartAttendanceRecords(user.nip, todayStr);
      setTodayRecords(records);
    }

    return () => clearInterval(timer);
  }, [user]);

  const checkInRec = todayRecords.find(r => r.attendance_type === 'CHECK_IN' && (r.status === 'PRESENT' || r.status === 'LATE'));
  const checkOutRec = todayRecords.find(r => r.attendance_type === 'CHECK_OUT' && (r.status === 'PRESENT' || r.status === 'EARLY_LEAVE'));

  const todayDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
              Smart Presensi &bull; Geofence &amp; Biometrik
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Presensi Kehadiran Hari Ini
          </h3>

          <p className="text-xs text-slate-300 flex items-center gap-2">
            <span>{todayDateFormatted}</span>
            <span>&bull;</span>
            <span className="font-mono font-bold text-blue-300">{currentTime || '08:00:00 WIB'}</span>
          </p>
        </div>

        {/* Status Pills & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs">
            <span className="text-slate-400 text-[10px] font-black uppercase">Masuk:</span>
            <span className={`font-bold font-mono ${checkInRec ? 'text-emerald-400' : 'text-slate-400'}`}>
              {checkInRec ? checkInRec.attendance_time : '--:--:--'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs">
            <span className="text-slate-400 text-[10px] font-black uppercase">Pulang:</span>
            <span className={`font-bold font-mono ${checkOutRec ? 'text-emerald-400' : 'text-slate-400'}`}>
              {checkOutRec ? checkOutRec.attendance_time : '--:--:--'}
            </span>
          </div>

          <button
            onClick={() => navigate('/presensi')}
            className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all"
          >
            <i className="bi bi-camera-video-fill"></i>
            <span>Buka Presensi</span>
          </button>

          {!isFaceRegistered && (
            <button
              onClick={() => navigate('/face-registration')}
              className="flex-1 md:flex-none px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-1.5 transition-all"
            >
              <i className="bi bi-cloud-arrow-up"></i>
              <span>Daftar Foto Wajah</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresensiTodayWidget;
