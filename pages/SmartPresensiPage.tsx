import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import {
  Pegawai,
  SmartAttendanceType,
  SmartAttendanceRecord,
  LivenessChallenge
} from '../types';
import { formatPegawaiName } from '../constants';
import {
  getFaceRegistrationByNip,
  getAttendanceLocations,
  getSmartAttendanceConfig,
  getSmartAttendanceRecords,
  processSmartAttendance,
  ProcessAttendanceResult
} from '../services/smartPresensi/SmartAttendanceService';
import {
  generateRandomLivenessSequence,
  analyzeLivenessFrame,
  evaluateChallengeSuccess,
  LivenessFrameAnalysis
} from '../services/smartPresensi/LivenessService';

export const SmartPresensiPage: React.FC = () => {
  const { user, logActivity } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Pegawai | null>(null);
  const [isFaceRegistered, setIsFaceRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState<'presensi' | 'riwayat'>('presensi');

  // Attendance Execution State
  const [attendanceType, setAttendanceType] = useState<SmartAttendanceType>('CHECK_IN');
  const [cameraActive, setCameraActive] = useState(false);
  const [stepMessage, setStepMessage] = useState<string>('Siap melakukan presensi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessAttendanceResult | null>(null);

  // Live Biometrics & Liveness State
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeProgress, setChallengeProgress] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [faceDetectedInCamera, setFaceDetectedInCamera] = useState(false);

  // GPS State
  const [gpsCoordinates, setGpsCoordinates] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // History State
  const [attendanceHistory, setAttendanceHistory] = useState<SmartAttendanceRecord[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameHistoryRef = useRef<LivenessFrameAnalysis[]>([]);
  const analysisIntervalRef = useRef<any>(null);

  // Load Employee Profile & Check Registration
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const allPegawai = await fetchPegawaiFromSheets();
        const found = allPegawai.find(p => p.nip === user?.nip) || null;
        if (found) {
          setEmployee(found);
          const reg = getFaceRegistrationByNip(found.nip);
          setIsFaceRegistered(reg?.status === 'REGISTERED');
        } else if (user) {
          const fallback: Pegawai = {
            id: user.id,
            nip: user.nip,
            nama: user.name,
            jabatan: user.role,
            unitKerja: 'Direktorat Jenderal Kekayaan Intelektual',
            gender: 'L',
            golRuang: 'III/a',
            jenisPegawai: 'PNS',
            status: 'Aktif'
          };
          setEmployee(fallback);
          const reg = getFaceRegistrationByNip(user.nip);
          setIsFaceRegistered(reg?.status === 'REGISTERED');
        }

        // Load History
        if (user?.nip) {
          const hist = getSmartAttendanceRecords(user.nip);
          setAttendanceHistory(hist);
        }
      } catch (err) {
        console.error('Error loading employee profile for presensi:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      stopCamera();
    };
  }, [user]);

  // Request GPS Coordinates
  const fetchCurrentLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Browser tidak mendukung geolokasi GPS.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          setGpsCoordinates(coords);
          setGpsError(null);
          resolve(coords);
        },
        (err) => {
          setGpsError(`Akses lokasi ditolak atau GPS tidak aktif (${err.message})`);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // Start Camera Stream (Requested ONLY on user button click)
  const startCamera = async () => {
    setProcessResult(null);
    setLivenessPassed(false);
    setCurrentChallengeIndex(0);
    setChallengeProgress(0);
    frameHistoryRef.current = [];

    // Generate randomized challenges
    const newChallenges = generateRandomLivenessSequence(2);
    setChallenges(newChallenges);

    setStepMessage('Meminta izin & membuka kamera live...');
    try {
      // 1. Acquire GPS in parallel
      fetchCurrentLocation().catch((err) => console.warn('GPS initial acquisition notice:', err));

      // 2. Open Camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setStepMessage('Kamera aktif. Posisikan wajah Anda di tengah lingkaran.');

      // 3. Start Live Liveness & Frame Analyzer Loop
      startLivenessAnalyzer(newChallenges);
    } catch (err: any) {
      console.error('Failed to open camera:', err);
      setStepMessage('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
      alert('Izin kamera diperlukan untuk melakukan presensi biometrik.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setCameraActive(false);
  };

  // Live Liveness Loop
  const startLivenessAnalyzer = (challengeList: LivenessChallenge[]) => {
    let currentIdx = 0;
    let history: LivenessFrameAnalysis[] = [];

    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);

    analysisIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const frameAnalysis = await analyzeLivenessFrame(videoRef.current);
        setFaceDetectedInCamera(frameAnalysis.faceDetected);

        if (!frameAnalysis.faceDetected) {
          setStepMessage('Wajah tidak terdeteksi. Posisikan wajah di dalam bingkai.');
          return;
        }

        history.push(frameAnalysis);
        if (history.length > 25) history.shift();
        frameHistoryRef.current = history;

        const currentChallenge = challengeList[currentIdx];
        if (!currentChallenge) return;

        setStepMessage(`${currentChallenge.instruction} (${currentIdx + 1}/${challengeList.length})`);

        const evalResult = evaluateChallengeSuccess(currentChallenge, history);
        setChallengeProgress(evalResult.progress);

        if (evalResult.passed) {
          // Move to next challenge or finish
          if (currentIdx + 1 < challengeList.length) {
            currentIdx += 1;
            setCurrentChallengeIndex(currentIdx);
            setChallengeProgress(0);
            history = [];
          } else {
            // All challenges passed!
            setLivenessPassed(true);
            setChallengeProgress(100);
            setStepMessage('✓ Verifikasi liveness selesai. Mengunci presensi...');
            clearInterval(analysisIntervalRef.current);

            // Trigger Final Verification Pipeline
            setTimeout(() => {
              executeFinalAttendance();
            }, 600);
          }
        }
      } catch (e) {
        // Frame analysis tick
      }
    }, 200);
  };

  // Execute Final Attendance Pipeline
  const executeFinalAttendance = async () => {
    if (!employee || !videoRef.current) return;

    setIsProcessing(true);
    setStepMessage('Memverifikasi kecocokan wajah & geofence polygon kantor...');

    try {
      // Refresh accurate GPS
      let currentCoords = gpsCoordinates;
      if (!currentCoords || currentCoords.accuracy > 50) {
        try {
          currentCoords = await fetchCurrentLocation();
        } catch (e) {
          // Handled below
        }
      }

      if (!currentCoords) {
        setProcessResult({
          success: false,
          status: 'INVALID_LOCATION',
          requestId: 'ATT-ERR-GPS',
          errorCode: 'GPS_NOT_FOUND',
          message: 'Gagal mendapatkan koordinat GPS. Pastikan izin lokasi diaktifkan.'
        });
        stopCamera();
        setIsProcessing(false);
        return;
      }

      const result = await processSmartAttendance({
        employee,
        videoElement: videoRef.current,
        attendanceType,
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        gpsAccuracy: currentCoords.accuracy,
        livenessPassed: true,
        userRole: user?.role
      });

      setProcessResult(result);
      if (result.success && result.record) {
        setAttendanceHistory(prev => [result.record!, ...prev]);
        logActivity(
          'PRESENSI',
          'Smart Presensi',
          `${attendanceType === 'CHECK_IN' ? 'Presensi Masuk' : 'Presensi Pulang'} berhasil: ${employee.nama} (NIP: ${employee.nip}) di ${result.details?.locationName || 'Kantor'}`
        );
      }
    } catch (err: any) {
      setProcessResult({
        success: false,
        status: 'ABSENT',
        requestId: 'ATT-ERR-SYSTEM',
        errorCode: 'EXEC_ERROR',
        message: err?.message || 'Terjadi kesalahan sistem saat memproses presensi.'
      });
    } finally {
      stopCamera();
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-500">Memuat modul Smart Presensi...</p>
        </div>
      </div>
    );
  }

  const activeLocations = getAttendanceLocations().filter(l => l.status === 'ACTIVE');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 transition-colors"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                Modul Presensi Cerdas • Biometrik Live &amp; Geofence Polygon
              </span>
            </div>
            <h1 className="text-xl font-black text-gray-950 tracking-tight mt-0.5">
              Presensi Online Pegawai
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('presensi')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === 'presensi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-camera-video mr-1.5"></i>
            Presensi Live
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === 'riwayat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <i className="bi bi-clock-history mr-1.5"></i>
            Riwayat Kehadiran
          </button>
        </div>
      </div>

      {activeTab === 'presensi' && (
        <div className="space-y-6">
          {/* Missing Face Registration Notice Banner */}
          {!isFaceRegistered && (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg shrink-0">
                  <i className="bi bi-exclamation-triangle-fill"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">
                    Master Foto Wajah Belum Terdaftar
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Anda belum mendaftarkan foto wajah master untuk pencocokan biometrik presensi.
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(employee ? `/pegawai/${employee.nip}/face-registration` : '/face-registration')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 shadow-md shadow-amber-200"
              >
                <i className="bi bi-cloud-arrow-up mr-1.5"></i>
                Registrasi Wajah Sekarang
              </button>
            </div>
          )}

          {/* Main Stage Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Live Camera & Verification HUD */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                {/* Attendance Type Selector */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Jenis Presensi</h3>
                    <p className="text-[11px] text-gray-400">Pilih sesi kehadiran yang ingin dicatat</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={cameraActive || isProcessing}
                      onClick={() => setAttendanceType('CHECK_IN')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        attendanceType === 'CHECK_IN'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <i className="bi bi-box-arrow-in-right mr-1.5"></i>
                      Masuk
                    </button>
                    <button
                      disabled={cameraActive || isProcessing}
                      onClick={() => setAttendanceType('CHECK_OUT')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        attendanceType === 'CHECK_OUT'
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <i className="bi bi-box-arrow-right mr-1.5"></i>
                      Pulang
                    </button>
                  </div>
                </div>

                {/* Camera Viewport / HUD */}
                <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden border-2 border-slate-800 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${cameraActive ? 'opacity-100' : 'hidden'}`}
                  />

                  {/* Standby Placeholder Screen */}
                  {!cameraActive && !processResult && (
                    <div className="text-center p-6 space-y-4">
                      <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
                        <i className="bi bi-camera"></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Kamera Belum Aktif</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                          Klik tombol di bawah untuk mengaktifkan kamera live dan memulai verifikasi biometrik.
                        </p>
                      </div>
                      <button
                        onClick={startCamera}
                        disabled={!isFaceRegistered}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-900/40 transition-all active:scale-95 inline-flex items-center gap-2"
                      >
                        <i className="bi bi-camera-video-fill"></i>
                        <span>Aktifkan Kamera Live</span>
                      </button>
                    </div>
                  )}

                  {/* Active Camera Overlay HUD */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                      {/* Top HUD Bar */}
                      <div className="flex items-center justify-between bg-slate-950/70 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-white text-[11px] font-mono">
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                          LIVE STREAM
                        </span>

                        <span className="text-slate-300">
                          {faceDetectedInCamera ? '✓ Wajah Terdeteksi' : 'Mencari Wajah...'}
                        </span>
                      </div>

                      {/* Oval Biometric Guide */}
                      <div className="mx-auto w-48 h-60 rounded-[48%] border-2 border-dashed border-blue-400/80 shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center justify-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      </div>

                      {/* Bottom Challenge HUD Prompt */}
                      <div className="bg-slate-950/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white space-y-2 pointer-events-auto">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                            Tantangan Liveness ({currentChallengeIndex + 1}/{challenges.length})
                          </span>
                          <span className="text-[10px] font-mono text-slate-300">
                            {challengeProgress}%
                          </span>
                        </div>

                        {challenges[currentChallengeIndex] && (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center text-base shrink-0">
                              <i className={`bi ${challenges[currentChallengeIndex].icon}`}></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-white truncate">
                                {challenges[currentChallengeIndex].instruction}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {challenges[currentChallengeIndex].subInstruction}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${challengeProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Processing Overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center space-y-3">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-bold">{stepMessage}</p>
                    </div>
                  )}
                </div>

                {/* Status / Message Display */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <i className="bi bi-info-circle-fill text-blue-600"></i>
                    <p className="text-xs font-medium text-gray-700">{stepMessage}</p>
                  </div>

                  {cameraActive && (
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>

              {/* Result Screens */}
              {processResult && (
                <div className={`p-6 rounded-3xl border animate-fadeIn space-y-4 ${
                  processResult.success 
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' 
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                      processResult.success ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      <i className={`bi ${processResult.success ? 'bi-patch-check-fill' : 'bi-x-octagon-fill'}`}></i>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider font-mono">
                          ID: {processResult.requestId}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          processResult.success ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {processResult.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-black tracking-tight">
                        {processResult.message}
                      </h4>

                      {processResult.details && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">Waktu</span>
                            <span className="font-bold text-gray-900">{processResult.details.timeFormatted}</span>
                          </div>

                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">Lokasi Valid</span>
                            <span className="font-bold text-gray-900 truncate block">{processResult.details.locationName}</span>
                          </div>

                          <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                            <span className="text-gray-400 block text-[9px] uppercase font-bold">Skor Biometrik</span>
                            <span className="font-bold text-emerald-700">{processResult.details.faceMatchScore}% Cocok</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                    {!processResult.success && (
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200"
                      >
                        <i className="bi bi-arrow-clockwise mr-1.5"></i>
                        Coba Lagi
                      </button>
                    )}

                    <button
                      onClick={() => setProcessResult(null)}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Identity, Active Geofences, & Schedule */}
            <div className="lg:col-span-5 space-y-6">
              {/* Pegawai Info Card */}
              {employee && (
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0 font-bold overflow-hidden">
                      {employee.foto ? (
                        <img src={employee.foto} alt={employee.nama} className="w-full h-full object-cover" />
                      ) : (
                        <i className="bi bi-person-fill"></i>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">
                        {formatPegawaiName(employee.nama)}
                      </h4>
                      <p className="text-[11px] text-gray-500 font-mono">NIP. {employee.nip}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Unit Kerja:</span>
                      <span className="font-bold text-gray-900 text-right">{employee.unitKerja || 'DJKI Kemenkumham'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Biometrik Wajah:</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        isFaceRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isFaceRegistered ? '✓ Terdaftar' : '✕ Belum Terdaftar'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">GPS &amp; Geolokasi:</span>
                      <span className="font-bold text-gray-900 font-mono text-[11px]">
                        {gpsCoordinates ? `±${Math.round(gpsCoordinates.accuracy)}m` : 'Menunggu Sinyal'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Office Geofences Card */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <i className="bi bi-geo-alt-fill text-blue-600"></i>
                    <span>Lokasi Geofence Aktif</span>
                  </h4>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                    {activeLocations.length} Kantor
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeLocations.map((loc) => (
                    <div key={loc.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900">{loc.name}</span>
                        <span className="text-[9px] font-bold bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 font-mono">
                          {loc.geometry_type} ({loc.polygon_points?.length || 0} Titik)
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{loc.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="p-5 bg-slate-100 rounded-3xl border border-slate-200 text-[11px] text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  <i className="bi bi-shield-lock-fill text-indigo-600"></i>
                  <span>Keamanan &amp; Integritas Data</span>
                </div>
                <p className="leading-relaxed">
                  Presensi diverifikasi secara langsung melalui peramban web tanpa pengunggahan berkas galeri foto statis. Seluruh proses validasi liveness dan polygon geofence dijalankan secara aman di sisi klien.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Kehadiran Tab */}
      {activeTab === 'riwayat' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 tracking-tight">Riwayat Presensi Mandiri</h3>
              <p className="text-xs text-gray-400 mt-0.5">Catatan kehadiran terverifikasi untuk {employee?.nama || user?.name}</p>
            </div>
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              Total {attendanceHistory.length} Catatan
            </span>
          </div>

          {attendanceHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <i className="bi bi-calendar-x text-4xl"></i>
              <p className="text-xs font-bold text-gray-600">Belum ada riwayat presensi yang tercatat.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Tanggal &amp; Waktu</th>
                    <th className="py-3 px-3">Tipe</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Lokasi Geofence</th>
                    <th className="py-3 px-3">Biometrik</th>
                    <th className="py-3 px-3">ID Tiket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendanceHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 font-medium text-gray-900">
                        <div className="font-bold">{rec.attendance_date}</div>
                        <div className="text-[10px] text-gray-400">{rec.attendance_time}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase ${
                          rec.attendance_type === 'CHECK_IN' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {rec.attendance_type === 'CHECK_IN' ? 'Masuk' : 'Pulang'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-1 rounded-lg font-bold text-[10px] uppercase ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-50 text-emerald-700'
                            : rec.status === 'LATE'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-gray-700">
                        <div>{rec.geofence_name}</div>
                        <div className="text-[10px] text-gray-400">Akurasi: ±{rec.gps_accuracy}m</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-emerald-600 font-bold font-mono">
                          {rec.face_match_score}% Match
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[10px] text-gray-400">
                        {rec.attendance_request_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartPresensiPage;
