import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { SmartAttendanceConfig } from '../../types';
import {
  getSmartAttendanceConfig,
  saveSmartAttendanceConfig,
  DEFAULT_SCHEDULES
} from '../../services/smartPresensi/SmartAttendanceService';

export const AttendanceSettingsPage: React.FC = () => {
  const { user, isSuperadmin, logActivity } = useAuth();
  const navigate = useNavigate();

  const [config, setConfig] = useState<SmartAttendanceConfig>(getSmartAttendanceConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setConfig(getSmartAttendanceConfig());
  }, []);

  const handleSave = () => {
    saveSmartAttendanceConfig(config);
    logActivity('UPDATE', 'Pengaturan Presensi', 'Memperbarui ambang batas biometrik dan toleransi GPS presensi');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/attendance')}
            className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                Konfigurasi Parameter • Smart Presensi
              </span>
            </div>
            <h1 className="text-xl font-black text-gray-950 tracking-tight mt-0.5">
              Pengaturan Modul Presensi
            </h1>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <i className="bi bi-floppy-fill"></i>
          <span>Simpan Konfigurasi</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-800 animate-fadeIn">
          <i className="bi bi-check-circle-fill text-emerald-600 text-lg"></i>
          <span className="text-xs font-bold">Konfigurasi presensi berhasil diperbarui.</span>
        </div>
      )}

      {/* Parameter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biometrics Thresholds */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <i className="bi bi-person-bounding-box text-blue-600"></i>
            <span>Ambang Batas Biometrik</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <label className="text-gray-700">Skor Kecocokan Wajah Minimal (%)</label>
                <span className="text-blue-600 font-mono">{config.face_match_threshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                step="5"
                value={config.face_match_threshold}
                onChange={(e) => setConfig({ ...config, face_match_threshold: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Batas persentase kesamaan live face recognition terhadap template foto terdaftar.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Batas Waktu Liveness (Detik)</label>
              <input
                type="number"
                value={config.liveness_timeout}
                onChange={(e) => setConfig({ ...config, liveness_timeout: parseInt(e.target.value) || 15 })}
                className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* Geofence & GPS Policy */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <i className="bi bi-geo-alt-fill text-indigo-600"></i>
            <span>Geofence &amp; Geolokasi GPS</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Batas Toleransi Akurasi GPS (Meter)</label>
              <input
                type="number"
                value={config.gps_accuracy_limit}
                onChange={(e) => setConfig({ ...config, gps_accuracy_limit: parseInt(e.target.value) || 35 })}
                className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold font-mono outline-none"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Jika akurasi GPS perangkat melebihi nilai ini, presensi ditolak dengan pesan akurasi lemah.
              </p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Kebijakan Batas Area Geofence</label>
              <select
                value={config.geofence_boundary_policy}
                onChange={(e) => setConfig({ ...config, geofence_boundary_policy: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="INSIDE">INSIDE (Toleransi garis batas 3-5 meter)</option>
                <option value="STRICT">STRICT (Ketepatan mutlak titik di dalam polygon)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Default Work Schedule Display */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <i className="bi bi-clock-fill text-emerald-600"></i>
          <span>Jadwal Jam Kerja &amp; Flexy Time DJKI Kemenkumham</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {DEFAULT_SCHEDULES.map((sch) => (
            <div key={sch.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-gray-900 block">{sch.dayName}</span>
              <div className="text-[11px] text-gray-600">
                <p>Masuk: <span className="font-mono font-bold text-blue-600">{sch.checkInStart} - {sch.checkInLimit}</span></p>
                <p>Pulang: <span className="font-mono font-bold text-indigo-600">{sch.checkOutStart}</span></p>
              </div>
              <p className="text-[9px] text-gray-400 font-medium pt-1">{sch.flexyDesc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceSettingsPage;
