import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { fetchPegawaiFromSheets } from '../../spreadsheetService';
import { Pegawai, SmartAttendanceRecord } from '../../types';
import { formatPegawaiName } from '../../constants';
import {
  getSmartAttendanceRecords,
  getAttendanceLocations,
  getFaceRegistrations
} from '../../services/smartPresensi/SmartAttendanceService';
import { PresensiNavigationHeader } from '../../components/PresensiNavigationHeader';

export const AdminAttendanceDashboardPage: React.FC = () => {
  const { user, isSuperadmin, logActivity } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<SmartAttendanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SmartAttendanceRecord | null>(null);

  // Filters
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pList = await fetchPegawaiFromSheets();
      setPegawaiList(pList);
      const records = getSmartAttendanceRecords();
      setAttendanceRecords(records);
    } catch (e) {
      console.error('Error loading attendance records for admin:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      if (selectedDate && rec.attendance_date !== selectedDate) return false;
      if (unitFilter !== 'ALL' && rec.unitKerja !== unitFilter) return false;
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
      if (locationFilter !== 'ALL' && rec.geofence_id !== locationFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.nama.toLowerCase().includes(q);
        const matchNip = rec.employee_id.includes(q);
        const matchReq = rec.attendance_request_id.toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchReq) return false;
      }
      return true;
    });
  }, [attendanceRecords, selectedDate, unitFilter, statusFilter, locationFilter, searchQuery]);

  // Statistics Summary for selected date
  const stats = useMemo(() => {
    const totalEmployees = pegawaiList.length || 0;
    const recordsOnDate = attendanceRecords.filter(r => r.attendance_date === selectedDate);
    
    // Unique checked-in employees
    const attendedNips = new Set(recordsOnDate.map(r => r.employee_id));
    const attendedCount = attendedNips.size;
    const absentCount = Math.max(0, totalEmployees - attendedCount);

    const lateCount = recordsOnDate.filter(r => r.status === 'LATE').length;
    const earlyLeaveCount = recordsOnDate.filter(r => r.status === 'EARLY_LEAVE').length;
    const invalidLocCount = recordsOnDate.filter(r => r.status === 'INVALID_LOCATION' || r.status === 'GPS_INACCURATE').length;
    const biometricIssueCount = recordsOnDate.filter(r => r.status === 'INVALID_FACE' || r.status === 'LIVENESS_FAILED').length;

    return {
      totalEmployees,
      attendedCount,
      absentCount,
      lateCount,
      earlyLeaveCount,
      invalidLocCount,
      biometricIssueCount
    };
  }, [attendanceRecords, pegawaiList, selectedDate]);

  const uniqueUnits = useMemo(() => {
    const set = new Set<string>();
    pegawaiList.forEach(p => { if (p.unitKerja) set.add(p.unitKerja); });
    return Array.from(set);
  }, [pegawaiList]);

  const locations = getAttendanceLocations();

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data presensi yang sesuai filter untuk diekspor.');
      return;
    }

    const headers = [
      'ID Tiket',
      'NIP',
      'Nama Pegawai',
      'Unit Kerja',
      'Tanggal',
      'Waktu',
      'Jenis',
      'Status',
      'Lokasi Geofence',
      'Akurasi GPS (m)',
      'Skor Biometrik (%)',
      'Verifikasi Liveness'
    ];

    const rows = filteredRecords.map(r => [
      `"${r.attendance_request_id}"`,
      `"${r.employee_id}"`,
      `"${r.nama}"`,
      `"${r.unitKerja}"`,
      `"${r.attendance_date}"`,
      `"${r.attendance_time}"`,
      `"${r.attendance_type}"`,
      `"${r.status}"`,
      `"${r.geofence_name}"`,
      r.gps_accuracy,
      r.face_match_score,
      r.liveness_verified ? 'LULUS' : 'GAGAL'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_presensi_${selectedDate || 'semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logActivity('EXPORT', 'Presensi Dashboard', `Mengekspor ${filteredRecords.length} catatan presensi`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-500">Memuat dashboard monitoring presensi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fadeIn">
      {/* Universal Presensi Hub Header */}
      <PresensiNavigationHeader 
        title="Monitoring Kehadiran & Biometrik"
        subtitle="Admin Center • Pemantauan Presensi Real-Time, Liveness Score, GPS & Geofence"
      />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
          <span className="text-xs font-black text-gray-900 tracking-tight">Log Aktivitas Kehadiran Realtime</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/attendance/locations')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
          >
            <i className="bi bi-geo-alt-fill text-blue-600"></i>
            <span>Master Lokasi Geofence</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-100 transition-all"
          >
            <i className="bi bi-file-earmark-spreadsheet-fill"></i>
            <span>Ekspor Data (CSV)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-gray-400">Total Pegawai</span>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{stats.totalEmployees}</p>
          <span className="text-[10px] text-gray-400">Database Master</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-200/80 space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800">Hadir Hari Ini</span>
          <p className="text-2xl font-black text-emerald-700 tracking-tight">{stats.attendedCount}</p>
          <span className="text-[10px] text-emerald-600 font-bold">Terverifikasi</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-3xl border border-amber-200/80 space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-800">Terlambat</span>
          <p className="text-2xl font-black text-amber-700 tracking-tight">{stats.lateCount}</p>
          <span className="text-[10px] text-amber-600 font-bold">Lewat Flexy Time</span>
        </div>

        <div className="bg-purple-50/70 p-4 rounded-3xl border border-purple-200/80 space-y-1">
          <span className="text-[10px] font-black uppercase text-purple-800">Pulang Cepat</span>
          <p className="text-2xl font-black text-purple-700 tracking-tight">{stats.earlyLeaveCount}</p>
          <span className="text-[10px] text-purple-600 font-bold">Sebelum Jam Pulang</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-3xl border border-rose-200/80 space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-800">Belum Presensi</span>
          <p className="text-2xl font-black text-rose-700 tracking-tight">{stats.absentCount}</p>
          <span className="text-[10px] text-rose-600 font-bold">Belum Masuk</span>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Anomali / Ditolak</span>
          <p className="text-2xl font-black text-white tracking-tight">{stats.invalidLocCount + stats.biometricIssueCount}</p>
          <span className="text-[10px] text-slate-300">Geofence / Biometrik</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Tanggal Presensi</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold font-mono outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Cari Pegawai / Tiket</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nama, NIP, atau ATT ID..."
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Unit Kerja</label>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="ALL">Semua Unit Kerja</option>
              {uniqueUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Status Kehadiran</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="PRESENT">Hadir Tepat Waktu (PRESENT)</option>
              <option value="LATE">Terlambat (LATE)</option>
              <option value="EARLY_LEAVE">Pulang Cepat (EARLY_LEAVE)</option>
              <option value="INVALID_LOCATION">Di Luar Lokasi (INVALID_LOCATION)</option>
              <option value="GPS_INACCURATE">Akurasi Lemah (GPS_INACCURATE)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Lokasi Geofence</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
            >
              <option value="ALL">Semua Lokasi</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Log Data Presensi Terverifikasi ({filteredRecords.length})
            </h3>
            <p className="text-xs text-gray-400">Seluruh catatan kehadiran biometrik &amp; geolokasi terdaftar</p>
          </div>

          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-gray-600 rounded-xl text-xs font-bold"
          >
            <i className="bi bi-arrow-clockwise mr-1"></i>
            Segarkan
          </button>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <i className="bi bi-journal-x text-4xl"></i>
            <p className="text-xs font-bold text-gray-600">Tidak ada data presensi yang sesuai dengan kriteria filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Pegawai</th>
                  <th className="py-3.5 px-4">Tanggal &amp; Waktu</th>
                  <th className="py-3.5 px-4">Tipe</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Geofence Lokasi</th>
                  <th className="py-3.5 px-4">Biometrik</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{formatPegawaiName(rec.nama)}</div>
                      <div className="text-[10px] text-gray-400 font-mono">NIP. {rec.employee_id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-800">{rec.attendance_date}</div>
                      <div className="text-[10px] text-gray-400">{rec.attendance_time}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] uppercase ${
                        rec.attendance_type === 'CHECK_IN' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {rec.attendance_type === 'CHECK_IN' ? 'Masuk' : 'Pulang'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        rec.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'LATE'
                          ? 'bg-amber-100 text-amber-800'
                          : rec.status === 'EARLY_LEAVE'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-gray-800">{rec.geofence_name}</div>
                      <div className="text-[10px] text-gray-400">Akurasi: ±{rec.gps_accuracy}m ({rec.geofence_type})</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-emerald-600 font-mono">{rec.face_match_score}% Cocok</div>
                      <div className="text-[10px] text-gray-400">Liveness: {rec.liveness_verified ? 'Lulus' : 'Gagal'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono">
                  {selectedRecord.attendance_request_id}
                </span>
                <h3 className="text-base font-black text-gray-900 tracking-tight mt-0.5">
                  Detail Catatan Presensi
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Nama Pegawai:</span>
                  <span className="font-bold text-gray-900">{selectedRecord.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">NIP:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedRecord.employee_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unit Kerja:</span>
                  <span className="font-medium text-gray-700">{selectedRecord.unitKerja}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Waktu Presensi</span>
                  <span className="font-bold text-gray-900 text-xs">{selectedRecord.attendance_date} {selectedRecord.attendance_time}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Jenis Presensi</span>
                  <span className="font-bold text-blue-600 text-xs">{selectedRecord.attendance_type}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Lokasi Geofence:</span>
                  <span className="font-bold text-gray-900">{selectedRecord.geofence_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tipe Geometri:</span>
                  <span className="font-mono text-gray-700">{selectedRecord.geofence_type} (Point: {selectedRecord.geofence_result})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Koordinat GPS:</span>
                  <span className="font-mono text-gray-700">{selectedRecord.latitude.toFixed(6)}, {selectedRecord.longitude.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Akurasi Sinyal GPS:</span>
                  <span className="font-mono font-bold text-emerald-700">±{selectedRecord.gps_accuracy} Meter</span>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl space-y-2 border border-emerald-200">
                <div className="flex justify-between">
                  <span className="text-emerald-800 font-bold">Skor Biometrik Wajah:</span>
                  <span className="font-mono font-black text-emerald-700">{selectedRecord.face_match_score}% Match</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-800 font-bold">Verifikasi Liveness:</span>
                  <span className="font-bold text-emerald-700">LULUS (Live Interactive Challenge)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceDashboardPage;
