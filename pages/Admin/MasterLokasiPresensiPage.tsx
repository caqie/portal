import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
  AttendanceLocation,
  PolygonPoint,
  GeofenceGeometryType
} from '../../types';
import {
  getAttendanceLocations,
  saveAttendanceLocation,
  deleteAttendanceLocation
} from '../../services/smartPresensi/SmartAttendanceService';
import { isPointInPolygon, isPointInCircle } from '../../services/smartPresensi/GeofenceService';

export const MasterLokasiPresensiPage: React.FC = () => {
  const { user, isSuperadmin, logActivity } = useAuth();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<AttendanceLocation[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<AttendanceLocation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [geometryType, setGeometryType] = useState<GeofenceGeometryType>('POLYGON');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [accuracyLimit, setAccuracyLimit] = useState(35);
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([]);
  const [centerLat, setCenterLat] = useState<number>(-6.1834);
  const [centerLng, setCenterLng] = useState<number>(106.6382);
  const [radiusMeter, setRadiusMeter] = useState<number>(150);

  // Coordinate Tester
  const [testLat, setTestLat] = useState<string>('-6.1834');
  const [testLng, setTestLng] = useState<string>('106.6382');
  const [testResult, setTestResult] = useState<{ isInside: boolean; message: string } | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = () => {
    const list = getAttendanceLocations();
    setLocations(list);
    if (list.length > 0 && !selectedLoc) {
      handleSelectLocation(list[0]);
    }
  };

  const handleSelectLocation = (loc: AttendanceLocation) => {
    setSelectedLoc(loc);
    setName(loc.name);
    setDescription(loc.description);
    setGeometryType(loc.geometry_type);
    setStatus(loc.status);
    setAccuracyLimit(loc.accuracy_limit || 35);
    setPolygonPoints(loc.polygon_points || []);
    setCenterLat(loc.center_latitude || -6.1834);
    setCenterLng(loc.center_longitude || 106.6382);
    setRadiusMeter(loc.radius_meter || 150);
    setIsEditing(false);
    setIsCreating(false);
    setTestResult(null);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedLoc(null);
    setName('');
    setDescription('');
    setGeometryType('POLYGON');
    setStatus('ACTIVE');
    setAccuracyLimit(35);
    setPolygonPoints([
      { latitude: -6.1831, longitude: 106.6378, label: 'Titik 1' },
      { latitude: -6.1829, longitude: 106.6386, label: 'Titik 2' },
      { latitude: -6.1839, longitude: 106.6389, label: 'Titik 3' },
      { latitude: -6.1841, longitude: 106.6382, label: 'Titik 4' }
    ]);
    setCenterLat(-6.1834);
    setCenterLng(106.6382);
    setRadiusMeter(150);
    setTestResult(null);
  };

  const handleAddPoint = () => {
    const lastPoint = polygonPoints[polygonPoints.length - 1] || { latitude: -6.1834, longitude: 106.6382 };
    setPolygonPoints([
      ...polygonPoints,
      {
        latitude: Number((lastPoint.latitude + 0.0002).toFixed(6)),
        longitude: Number((lastPoint.longitude + 0.0002).toFixed(6)),
        label: `Titik ${polygonPoints.length + 1}`
      }
    ]);
  };

  const handleRemovePoint = (index: number) => {
    if (polygonPoints.length <= 3) {
      alert('Polygon membutuhkan minimal 3 titik koordinat untuk membentuk area tertutup.');
      return;
    }
    const updated = polygonPoints.filter((_, i) => i !== index);
    setPolygonPoints(updated);
  };

  const handleUpdatePoint = (index: number, field: keyof PolygonPoint, val: any) => {
    const updated = [...polygonPoints];
    updated[index] = { ...updated[index], [field]: val };
    setPolygonPoints(updated);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Nama lokasi wajib diisi.');
      return;
    }

    if (geometryType === 'POLYGON' && polygonPoints.length < 3) {
      alert('Polygon harus memiliki minimal 3 titik koordinat.');
      return;
    }

    const now = new Date().toLocaleString('id-ID');
    const id = isCreating ? `loc_${Date.now()}` : (selectedLoc?.id || `loc_${Date.now()}`);

    const newLoc: AttendanceLocation = {
      id,
      name,
      description,
      geometry_type: geometryType,
      status,
      accuracy_limit: accuracyLimit,
      polygon_points: polygonPoints,
      center_latitude: centerLat,
      center_longitude: centerLng,
      radius_meter: radiusMeter,
      created_at: selectedLoc?.created_at || now,
      created_by: selectedLoc?.created_by || user?.name || 'Admin',
      updated_at: now,
      updated_by: user?.name || 'Admin'
    };

    saveAttendanceLocation(newLoc);
    logActivity(
      isCreating ? 'CREATE' : 'UPDATE',
      'Master Lokasi Presensi',
      `${isCreating ? 'Menambahkan' : 'Memperbarui'} lokasi presensi ${newLoc.name} (${geometryType})`
    );

    loadLocations();
    setSelectedLoc(newLoc);
    setIsEditing(false);
    setIsCreating(false);
    alert('Lokasi geofence presensi berhasil disimpan.');
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus lokasi presensi ini?')) {
      deleteAttendanceLocation(id);
      logActivity('DELETE', 'Master Lokasi Presensi', `Menghapus lokasi ID ${id}`);
      loadLocations();
      setSelectedLoc(null);
    }
  };

  const handleRunCoordinateTest = () => {
    const lat = parseFloat(testLat);
    const lng = parseFloat(testLng);

    if (isNaN(lat) || isNaN(lng)) {
      setTestResult({ isInside: false, message: 'Koordinat uji tidak valid.' });
      return;
    }

    let isInside = false;
    if (geometryType === 'POLYGON') {
      isInside = isPointInPolygon({ latitude: lat, longitude: lng }, polygonPoints);
    } else {
      isInside = isPointInCircle({ latitude: lat, longitude: lng }, { latitude: centerLat, longitude: centerLng }, radiusMeter);
    }

    setTestResult({
      isInside,
      message: isInside 
        ? `✓ Kordinat (${lat}, ${lng}) berada DI DALAM area geofence ${name || 'ini'}.` 
        : `✕ Koordinat (${lat}, ${lng}) berada DI LUAR area geofence ${name || 'ini'}.`
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fadeIn">
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
                Konfigurasi Geofencing • Master Lokasi Kantor
              </span>
            </div>
            <h1 className="text-xl font-black text-gray-950 tracking-tight mt-0.5">
              Master Lokasi Presensi
            </h1>
          </div>
        </div>

        <button
          onClick={handleStartCreate}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-100 flex items-center gap-2"
        >
          <i className="bi bi-plus-lg"></i>
          <span>Tambah Lokasi Kantor</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Locations */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider px-2">
              Daftar Lokasi Terdaftar ({locations.length})
            </h3>

            <div className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedLoc?.id === loc.id && !isCreating
                      ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                      : 'bg-slate-50/60 hover:bg-slate-100/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 truncate">{loc.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      loc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {loc.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 line-clamp-1 mt-1">{loc.description}</p>

                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-gray-400">
                    <span>{loc.geometry_type}</span>
                    <span>•</span>
                    <span>{loc.polygon_points?.length || 0} Titik</span>
                    <span>•</span>
                    <span>Maks ±{loc.accuracy_limit}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Location Editor & Interactive Polygon Tester */}
        <div className="lg:col-span-8 space-y-6">
          {(selectedLoc || isCreating) && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 tracking-tight">
                    {isCreating ? 'Tambah Lokasi Kantor Baru' : `Pengaturan Geofence: ${selectedLoc?.name}`}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Konfigurasi batas polygon N-titik dan toleransi akurasi GPS</p>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing && selectedLoc && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                      >
                        <i className="bi bi-pencil mr-1.5"></i>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedLoc.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold"
                      >
                        <i className="bi bi-trash mr-1.5"></i>
                        Hapus
                      </button>
                    </>
                  )}

                  {isEditing && (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          if (isCreating && locations.length > 0) handleSelectLocation(locations[0]);
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-md shadow-blue-200"
                      >
                        Simpan
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Nama Lokasi Kantor</label>
                  <input
                    disabled={!isEditing}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 disabled:opacity-75"
                    placeholder="mis. Kantor DJKI Tangerang"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Batas Toleransi Akurasi GPS (Meter)</label>
                  <input
                    disabled={!isEditing}
                    type="number"
                    value={accuracyLimit}
                    onChange={(e) => setAccuracyLimit(parseInt(e.target.value) || 30)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 disabled:opacity-75 font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Deskripsi &amp; Alamat</label>
                  <textarea
                    disabled={!isEditing}
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 disabled:opacity-75"
                    placeholder="Alamat lengkap gedung kantor..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Tipe Geometri Geofence</label>
                  <select
                    disabled={!isEditing}
                    value={geometryType}
                    onChange={(e) => setGeometryType(e.target.value as GeofenceGeometryType)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 disabled:opacity-75"
                  >
                    <option value="POLYGON">POLYGON (N-Titik Sudut Kawasan Kantor)</option>
                    <option value="CIRCLE">CIRCLE (Titik Pusat + Radius Meter)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Status Lokasi</label>
                  <select
                    disabled={!isEditing}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 disabled:opacity-75"
                  >
                    <option value="ACTIVE">AKTIF (Digunakan untuk Validasi)</option>
                    <option value="INACTIVE">NONAKTIF</option>
                  </select>
                </div>
              </div>

              {/* Polygon Vertices Manager (When Polygon Selected) */}
              {geometryType === 'POLYGON' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                        Titik Sudut Polygon Geofence ({polygonPoints.length} Vertices)
                      </h4>
                      <p className="text-[11px] text-gray-400">Koordinat titik keliling area gedung kantor</p>
                    </div>

                    {isEditing && (
                      <button
                        onClick={handleAddPoint}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100"
                      >
                        <i className="bi bi-plus-lg mr-1"></i>
                        Tambah Titik
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {polygonPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-[10px] shrink-0">
                          {idx + 1}
                        </span>

                        <input
                          disabled={!isEditing}
                          type="text"
                          value={pt.label || `Titik ${idx + 1}`}
                          onChange={(e) => handleUpdatePoint(idx, 'label', e.target.value)}
                          className="w-1/3 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none"
                          placeholder="Label Titik"
                        />

                        <input
                          disabled={!isEditing}
                          type="number"
                          step="0.000001"
                          value={pt.latitude}
                          onChange={(e) => handleUpdatePoint(idx, 'latitude', parseFloat(e.target.value))}
                          className="w-1/3 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono outline-none"
                          placeholder="Latitude"
                        />

                        <input
                          disabled={!isEditing}
                          type="number"
                          step="0.000001"
                          value={pt.longitude}
                          onChange={(e) => handleUpdatePoint(idx, 'longitude', parseFloat(e.target.value))}
                          className="w-1/3 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono outline-none"
                          placeholder="Longitude"
                        />

                        {isEditing && (
                          <button
                            onClick={() => handleRemovePoint(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                            title="Hapus Titik"
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Circle Settings (When Circle Selected) */}
              {geometryType === 'CIRCLE' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Titik Pusat &amp; Radius Geofence Circle
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400">Center Latitude</label>
                      <input
                        disabled={!isEditing}
                        type="number"
                        step="0.000001"
                        value={centerLat}
                        onChange={(e) => setCenterLat(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400">Center Longitude</label>
                      <input
                        disabled={!isEditing}
                        type="number"
                        step="0.000001"
                        value={centerLng}
                        onChange={(e) => setCenterLng(parseFloat(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400">Radius (Meter)</label>
                      <input
                        disabled={!isEditing}
                        type="number"
                        value={radiusMeter}
                        onChange={(e) => setRadiusMeter(parseInt(e.target.value) || 150)}
                        className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Real-Time Coordinate Tester Tool */}
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <i className="bi bi-geo-alt-fill text-indigo-600"></i>
                    <span>Penguji Akurasi Koordinat Geofence</span>
                  </h4>
                  <span className="text-[10px] text-gray-400">Uji langsung algoritma point-in-polygon</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="number"
                    step="0.000001"
                    value={testLat}
                    onChange={(e) => setTestLat(e.target.value)}
                    placeholder="Latitude Uji"
                    className="w-full sm:w-1/3 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                  />
                  <input
                    type="number"
                    step="0.000001"
                    value={testLng}
                    onChange={(e) => setTestLng(e.target.value)}
                    placeholder="Longitude Uji"
                    className="w-full sm:w-1/3 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                  />
                  <button
                    onClick={handleRunCoordinateTest}
                    className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shrink-0"
                  >
                    Uji Koordinat
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    testResult.isInside ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterLokasiPresensiPage;
