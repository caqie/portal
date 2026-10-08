import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchAbsensiConfig, saveAbsensiRecord, fetchAbsensiHistoryFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord, AbsensiConfig } from '../types';
import { useAuth } from '../AuthContext';
import * as faceapi from '@vladmandic/face-api';
import { PresensiNavigationHeader } from '../components/PresensiNavigationHeader';

const AbsensiOnlinePage = () => {
  const { user, isSuperadmin } = useAuth();
  const navigate = useNavigate();
  const [currentPegawai, setCurrentPegawai] = useState<Pegawai | null>(null);
  const [status, setStatus] = useState({ model: 'Loading...', camera: 'Waiting...', data: 'Checking...' });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isFaceMatched, setIsFaceMatched] = useState(false);
  const [matchStabilizedTime, setMatchStabilizedTime] = useState(0); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{status: 'SUCCESS' | 'REJECTED' | 'ERROR', message: string, type?: string, late?: boolean} | null>(null);
  const [absensiHistory, setAbsensiHistory] = useState<AbsensiRecord[]>([]);
  const [absensiConfig, setAbsensiConfig] = useState<AbsensiConfig | null>(null);
  const [userIp, setUserIp] = useState<string>('');
  const [isNetworkValid, setIsNetworkValid] = useState<boolean>(true);
  const [detectionScore, setDetectionScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [livenessScore, setLivenessScore] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionInterval = useRef<any>(null);
  const faceMatcher = useRef<any>(null);
  const lastLandmarks = useRef<any>(null);
  const livenessHistory = useRef<number[]>([]);

  // Real-time Clock Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date(Date.now() + serverTimeOffset));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  // Sync Server Time
  useEffect(() => {
    const syncTime = async () => {
      try {
        const { getServerTime } = await import('../spreadsheetService');
        const sTime = await getServerTime();
        setServerTimeOffset(sTime.getTime() - Date.now());
      } catch (e) {
        console.error("Failed to sync server time:", e);
      }
    };
    syncTime();
  }, []);

  const isIpInRange = (ip: string, range: string) => {
    if (!ip || !range) return false;
    const trimmedRange = range.trim();
    if (!trimmedRange) return false;
    if (!trimmedRange.includes('/')) return ip === trimmedRange;
    
    try {
      const [rangeIp, prefix] = trimmedRange.split('/');
      const mask = parseInt(prefix, 10);
      
      const ipToLong = (ipAddr: string) => {
        return ipAddr.split('.').reduce((long, octet) => (long << 8) + parseInt(octet, 10), 0) >>> 0;
      };
      
      const ipLong = ipToLong(ip);
      const rangeLong = ipToLong(rangeIp);
      
      const netmask = mask === 0 ? 0 : (0xFFFFFFFF << (32 - mask)) >>> 0;
      
      return (ipLong & netmask) === (rangeLong & netmask);
    } catch (e) {
      return false;
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Aturan Jam Kerja & Flexy Time
  const getScheduleRules = () => {
    const now = new Date();
    const day = now.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri
    
    let limitMasuk = "07:30:00";
    let limitPulang = "16:00:00";
    let desc = "Jam Masuk Normal 07:30";

    if (day === 1) { 
      limitMasuk = "08:00:00"; 
      desc = "Flexy Time Senin (08:00)";
    } else if (day >= 2 && day <= 4) { 
      limitMasuk = "08:30:00"; 
      desc = "Flexy Time Sel-Kam (08:30)";
    } else if (day === 5) { 
      limitMasuk = "07:30:00"; 
      limitPulang = "16:30:00";
      desc = "Jumat Tanpa Flexy (07:30)";
    }

    return { limitMasuk, limitPulang, desc };
  };

  // Resilient Camera Launcher with Multi-Tier Fallback
  const startCamera = async (deviceId?: string, targetFacingMode?: 'user' | 'environment') => {
    setCameraError(null);
    setStatus(prev => ({ ...prev, camera: 'Connecting...' }));

    // Stop existing stream first to release camera hardware
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = "Browser ini tidak mendukung akses kamera (WebRTC getUserMedia). Gunakan Google Chrome, Microsoft Edge, atau Safari modern.";
      setCameraError(msg);
      setStatus(prev => ({ ...prev, camera: 'Unsupported' }));
      return;
    }

    const currentMode = targetFacingMode || facingMode;
    let stream: MediaStream | null = null;
    let lastErr: any = null;

    // ATTEMPT 1: Specific deviceId or ideal facingMode + ideal resolution
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: currentMode },
              width: { ideal: 640 },
              height: { ideal: 480 }
            },
        audio: false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e1: any) {
      console.warn("Camera attempt 1 failed:", e1);
      lastErr = e1;
    }

    // ATTEMPT 2: FacingMode only without exact dimension constraints
    if (!stream && !deviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentMode },
          audio: false
        });
      } catch (e2: any) {
        console.warn("Camera attempt 2 failed:", e2);
        lastErr = e2;
      }
    }

    // ATTEMPT 3: Simplest constraint { video: true } (supports any webcam, external cam, virtual cam)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (e3: any) {
        console.error("Camera attempt 3 failed:", e3);
        lastErr = e3;
      }
    }

    if (!stream) {
      setStatus(prev => ({ ...prev, camera: 'Denied' }));
      setCameraActive(false);

      let humanMsg = "Kamera tidak dapat diakses.";
      if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
        humanMsg = "Izin kamera ditolak di browser. Silakan klik ikon gembok/kamera di bilah alamat URL browser Anda, ubah izin Kamera menjadi 'Izinkan', lalu klik tombol Aktifkan Kamera di bawah.";
      } else if (lastErr?.name === 'NotFoundError' || lastErr?.name === 'DevicesNotFoundError') {
        humanMsg = "Kamera tidak terdeteksi. Pastikan webcam terhubung dan driver kamera aktif di perangkat Anda.";
      } else if (lastErr?.name === 'NotReadableError' || lastErr?.name === 'TrackStartError') {
        humanMsg = "Kamera sedang digunakan oleh aplikasi lain (Zoom, Teams, Google Meet, Skype). Silakan tutup aplikasi tersebut dan coba lagi.";
      } else if (lastErr?.name === 'OverconstrainedError') {
        humanMsg = "Resolusi kamera tidak didukung perangkat ini.";
      } else {
        humanMsg = `Gagal mengaktifkan kamera: ${lastErr?.message || 'Periksa koneksi webcam Anda'}`;
      }
      setCameraError(humanMsg);
      return;
    }

    // Camera stream acquired successfully!
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('autoplay', 'true');
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn("video.play() notice:", playErr);
      }
    }

    setCameraActive(true);
    setStatus(prev => ({ ...prev, camera: 'Active' }));
    setCameraError(null);

    // Enumerate video devices for quick switcher
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter(d => d.kind === 'videoinput');
      setAvailableCameras(videoDevs);
      if (deviceId) {
        setSelectedDeviceId(deviceId);
      } else if (videoDevs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevs[0].deviceId);
      }
    } catch (enumErr) {
      console.warn("Device enumeration error:", enumErr);
    }

    startDetection();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject as MediaStream;
      s.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }
    setCameraActive(false);
    setStatus(prev => ({ ...prev, camera: 'Stopped' }));
  };

  const toggleFacingMode = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    await startCamera(undefined, nextMode);
  };

  const handleDeviceChange = async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    await startCamera(newDeviceId);
  };

  // Main Page Initialization
  useEffect(() => {
    loadHistory();
    checkNetwork();

    // 1. Launch Camera immediately so live visual is always active
    startCamera();

    // 2. Concurrently load AI models & employee biometric template
    const initBiometrics = async () => {
      try {
        await loadModels();
        const peg = await loadCurrentPegawai();
        if (peg && peg.foto) {
          await prepareFaceMatcher(peg);
        } else if (peg && !peg.foto) {
          setStatus(prev => ({ ...prev, data: 'No Photo' }));
        }
      } catch (err) {
        console.warn("Biometrics loading warning (camera still operational):", err);
      }
    };
    initBiometrics();

    return () => {
      stopCamera();
    };
  }, [user]);

  const checkNetwork = async () => {
    try {
      // 1. Fetch Config
      const config = await fetchAbsensiConfig().catch(() => null);
      if (config) setAbsensiConfig(config);

      // 2. Fetch IP with Fallback
      let ip = 'Unknown';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ip = data.ip;
      } catch (e) {
        try {
          const res2 = await fetch('https://ipapi.co/json/');
          const data2 = await res2.json();
          ip = data2.ip;
        } catch (e2) {
          console.warn("All IP discovery services fallback notice.");
        }
      }
      setUserIp(ip);

      if (!config) {
        setIsNetworkValid(true);
        return;
      }

      const isWfa = config.wfaNips.includes(user?.nip || '');
      const allowedRanges = (config.officeIpAddresses || '').split(',').map(s => s.trim()).filter(s => s !== '');
      const isOffice = allowedRanges.length === 0 || (ip !== 'Unknown' && allowedRanges.some(range => isIpInRange(ip, range)));
      
      if (isWfa || isOffice || user?.role === 'Superadmin') {
        setIsNetworkValid(true);
      } else {
        // We notify user without completely cutting off camera UI
        setIsNetworkValid(false);
      }
    } catch (e) {
      console.warn("Network check error:", e);
      setIsNetworkValid(true); 
    }
  };

  const loadHistory = async () => {
    if (!user?.nip) return;
    const history = await fetchAbsensiHistoryFromSheets(user.nip);
    setAbsensiHistory(history);
  };

  const loadModels = async () => {
    try {
      setStatus(prev => ({ ...prev, model: 'Loading...' }));
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      
      setModelsLoaded(true);
      setStatus(prev => ({ ...prev, model: 'Ready' }));
    } catch (err) {
      console.warn("AI biometric model load notice (falling back to manual photo capture):", err);
      setStatus(prev => ({ ...prev, model: 'Manual Mode' }));
    }
  };

  const loadCurrentPegawai = async () => {
    try {
      const pegData = await fetchPegawaiFromSheets();
      const found = pegData.find(p => p.nip === user?.nip);
      setCurrentPegawai(found || null);
      if (found) setStatus(prev => ({ ...prev, data: 'Identified' }));
      return found || null;
    } catch (e) {
      setStatus(prev => ({ ...prev, data: 'Offline' }));
      return null;
    }
  };

  const prepareFaceMatcher = async (pegawai: Pegawai) => {
    try {
      if (!pegawai.foto) {
        setStatus(prev => ({ ...prev, data: 'No Photo' }));
        return;
      }
      
      setStatus(prev => ({ ...prev, data: 'Syncing Face...' }));
      
      const photoUrl = pegawai.foto.includes('drive.google.com') 
        ? pegawai.foto.replace('file/d/', 'uc?id=').replace('/view?usp=sharing', '')
        : pegawai.foto;

      if (!photoUrl) return;

      const img = await faceapi.fetchImage(photoUrl + (photoUrl.includes('?') ? '&' : '?') + 'cache=none');
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor();

      if (detections) {
        const labeledDescriptor = new faceapi.LabeledFaceDescriptors(pegawai.nip, [detections.descriptor]);
        faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptor, 0.45);
        setStatus(prev => ({ ...prev, data: 'Verified' }));
      } else {
        setStatus(prev => ({ ...prev, data: 'Photo Invalid' }));
      }
    } catch (err) {
      console.warn("Face matcher preparation notice:", err);
      setStatus(prev => ({ ...prev, data: 'Manual Match' }));
    }
  };

  const startDetection = () => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !modelsLoaded || isProcessing) return;

      try {
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
          .withFaceLandmarks().withFaceDescriptor();

        if (detection) {
          setIsFaceDetected(true);
          setDetectionScore(detection.detection.score);

          // Liveness micro-movement evaluation
          if (lastLandmarks.current) {
            const currentLandmarks = detection.landmarks.positions;
            const prevLandmarks = lastLandmarks.current;
            let movement = 0;
            for (let i = 0; i < currentLandmarks.length; i++) {
              movement += Math.sqrt(
                Math.pow(currentLandmarks[i].x - prevLandmarks[i].x, 2) +
                Math.pow(currentLandmarks[i].y - prevLandmarks[i].y, 2)
              );
            }
            const avgMovement = movement / currentLandmarks.length;
            livenessHistory.current.push(avgMovement);
            if (livenessHistory.current.length > 10) livenessHistory.current.shift();
            
            const avgLiveness = livenessHistory.current.reduce((a, b) => a + b, 0) / livenessHistory.current.length;
            setLivenessScore(avgLiveness);
          }
          lastLandmarks.current = detection.landmarks.positions;
          
          const isLive = livenessScore > 0.01 && livenessScore < 10;

          if (faceMatcher.current && detection.detection.score > 0.4 && isLive) {
            const bestMatch = faceMatcher.current.findBestMatch(detection.descriptor);
            const matched = bestMatch.label !== 'unknown';
            setIsFaceMatched(matched);

            if (matched) {
              setMatchStabilizedTime(prev => {
                if (prev >= 100) {
                  handleAutoAbsensi();
                  return 100;
                }
                return prev + 10; 
              });
            } else {
              setMatchStabilizedTime(0);
            }
          } else {
            setIsFaceMatched(false);
            setMatchStabilizedTime(0);
          }
        } else {
          setIsFaceDetected(false);
          setIsFaceMatched(false);
          setMatchStabilizedTime(0);
          lastLandmarks.current = null;
        }
      } catch (detErr) {
        // Silently tolerate frame processing slips
      }
    }, 200);
  };

  // Capture Snapshot Frame from Video
  const captureSnapshot = (): string => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(videoRef.current.videoWidth, 640);
      canvas.height = Math.min(videoRef.current.videoHeight, 480);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.warn("Snapshot capture warning:", e);
    }
    return '';
  };

  // Submit Absensi (Handles both Automatic AI Match and Direct Instant Submission)
  const handleAutoAbsensi = async (forcedTipe?: 'MASUK' | 'PULANG') => {
    if (isProcessing || !user) return;
    setIsProcessing(true);
    
    try {
      const now = new Date(Date.now() + serverTimeOffset);
      const currentHour = now.getHours();
      const currentTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const d = now.getDate().toString().padStart(2, '0');
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const y = now.getFullYear();
      const todayStr = `${d}/${m}/${y}`;
      const { limitMasuk } = getScheduleRules();

      const tipe: 'MASUK' | 'PULANG' = forcedTipe || (currentHour < 12 ? 'MASUK' : 'PULANG');

      // Check existing history
      const alreadyCheckIn = absensiHistory.find(l => l.tipe === 'MASUK');
      const alreadyCheckOut = absensiHistory.find(l => l.tipe === 'PULANG');

      if (!forcedTipe && tipe === 'MASUK' && alreadyCheckIn) {
        speak("Maaf, Anda sudah melakukan absensi masuk hari ini.");
        setVerificationResult({ status: 'REJECTED', message: `Data MASUK sudah tercatat pada ${alreadyCheckIn.waktu} WIB.`, type: 'MASUK' });
        setTimeout(() => resetState(), 4000);
        return;
      }

      let isLate = false;
      if (tipe === 'MASUK') {
        const [lH, lM, lS] = limitMasuk.split(':').map(Number);
        const limitDate = new Date();
        limitDate.setHours(lH, lM, lS);
        if (now > limitDate) isLate = true;
      }

      const snapshotPhoto = captureSnapshot();

      const lokasiKet = isNetworkValid 
        ? 'DJKI OFFICE NODE' 
        : `WFA / LUAR KANTOR (IP: ${userIp || 'Remote'})`;

      const record: any = {
        id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nip: currentPegawai?.nip || user?.nip,
        nama: currentPegawai?.nama || user?.name,
        tanggal: todayStr,
        waktu: currentTimeStr,
        tipe,
        status: isLate ? 'TERLAMBAT' : 'TEPAT WAKTU',
        lokasi: lokasiKet,
        confidence: isFaceMatched ? (detectionScore || 0.95).toFixed(4) : 'PHOTO_VERIFIED',
        foto: snapshotPhoto || undefined
      };

      const ok = await saveAbsensiRecord(record);
      if (ok) {
        await loadHistory();
        speak(`Terima kasih, presensi ${tipe.toLowerCase()} berhasil disimpan.`);
        setVerificationResult({ 
          status: 'SUCCESS', 
          message: `Presensi ${tipe} Berhasil`, 
          type: tipe, 
          late: isLate 
        });
      } else {
        throw new Error("Gagal menyimpan ke server");
      }

      setTimeout(() => resetState(), 5000);
    } catch (err: any) {
      console.error("Absensi processing failed:", err);
      setErrorMessage("Gagal memproses absensi: " + (err.message || "Kesalahan koneksi"));
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setIsProcessing(false);
    setMatchStabilizedTime(0);
    setVerificationResult(null);
    setFailedAttempts(0);
  };

  useEffect(() => {
    if (isFaceDetected && !isFaceMatched && !isProcessing && modelsLoaded && currentPegawai?.foto) {
      const timer = setTimeout(() => {
        setFailedAttempts(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isFaceDetected, isFaceMatched, isProcessing, modelsLoaded, currentPegawai]);

  const rules = getScheduleRules();

  return (
    <div className="space-y-6 animate-fadeIn pb-24 text-slate-900 font-['Inter']">
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>

      {/* Universal Navigation Hub Header */}
      <PresensiNavigationHeader 
        title="Presensi Online Biometrik"
        subtitle="Verifikasi Wajah Live, Kamera Pengawas & Geolocation DJKI"
      />

      {/* HEADER & DIAGNOSTICS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
            <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">Smart Biometric Node</h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
             <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${status.model==='Ready'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-gray-50 text-gray-600 border-gray-200'}`}>
               AI Engine: {status.model}
             </div>
             <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${status.camera==='Active'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
               Kamera: {status.camera}
             </div>
             <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${status.data==='Verified'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>
               Profil: {status.data}
             </div>
             <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border ${isNetworkValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
               Lokasi: {isNetworkValid ? 'Jaringan Kantor' : 'WFA / Luar Kantor'}
             </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 px-6 rounded-2xl border border-gray-100 self-stretch md:self-auto text-left md:text-right">
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Jadwal Hari Ini</p>
           <h5 className="text-xs font-black text-blue-600 uppercase tracking-tight">{rules.desc}</h5>
           <p className="text-[10px] text-gray-500 mt-1 font-mono">Batas Masuk: {rules.limitMasuk} WIB</p>
        </div>
      </div>

      {/* Network Alert (Non-blocking) */}
      {!isNetworkValid && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-3 text-amber-800 text-xs">
          <div className="flex items-center gap-3">
            <i className="bi bi-info-circle-fill text-amber-600 text-lg shrink-0"></i>
            <div>
              <p className="font-bold">Terdeteksi Di Luar Jaringan Kantor (IP: {userIp || 'Mendeteksi...'})</p>
              <p className="text-[11px] text-amber-700">Presensi Anda tetap dapat dilakukan dan akan tercatat dengan status WFA / Luar Jaringan.</p>
            </div>
          </div>
          {isSuperadmin && (
            <button 
              onClick={() => setIsNetworkValid(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[9px] font-black uppercase shrink-0"
            >
              Mode Superadmin
            </button>
          )}
        </div>
      )}

      {/* Camera Permission / Error Warning with Action Button */}
      {cameraError && (
        <div className="bg-rose-50 border-2 border-rose-200 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <i className="bi bi-camera-video-off-fill text-2xl"></i>
            </div>
            <div>
              <h5 className="text-sm font-black text-rose-900 uppercase">Kendala Akses Kamera</h5>
              <p className="text-xs text-rose-700 mt-1 max-w-2xl leading-relaxed">{cameraError}</p>
              <p className="text-[11px] text-rose-600 font-bold mt-2">
                Tip: Pastikan izin kamera aktif pada browser Anda (klik ikon gembok di sebelah kiri bilah URL).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => startCamera()}
              className="flex-1 md:flex-none px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="bi bi-arrow-repeat"></i>
              <span>Coba Lagi Akses Kamera</span>
            </button>
          </div>
        </div>
      )}

      {/* General System Error */}
      {errorMessage && !cameraError && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <i className="bi bi-exclamation-triangle-fill text-amber-600 text-lg"></i>
            <span className="font-bold text-amber-900">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-700 hover:text-amber-900 font-bold text-xs">
            Tutup
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* LEFT COLUMN: CAMERA VIEWER & CONTROLS */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] overflow-hidden relative aspect-square md:aspect-video shadow-2xl border-[8px] md:border-[12px] border-white ring-1 ring-gray-100 group flex items-center justify-center">
            
            {/* CIRCULAR CAMERA HUD CONTAINER */}
            <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full overflow-hidden border-8 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10 bg-slate-950 flex items-center justify-center">
              
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onPlay={() => startDetection()}
                className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0'}`} 
              />
              
              {/* Standby / Error Overlay if Camera Not Streaming */}
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-slate-950/90 backdrop-blur-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center text-3xl mb-3 shadow-inner">
                    <i className="bi bi-camera-video-off"></i>
                  </div>
                  <h4 className="text-white text-xs font-black uppercase tracking-wider mb-1">Kamera Belum Aktif</h4>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mb-4">
                    Klik tombol di bawah untuk menyalakan webcam atau kamera perangkat Anda.
                  </p>
                  <button
                    onClick={() => startCamera()}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-900/50 flex items-center gap-2 transition-all"
                  >
                    <i className="bi bi-camera-video-fill"></i>
                    <span>Aktifkan Kamera</span>
                  </button>
                </div>
              )}

              {/* SCANNING LINE ANIMATION */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] absolute top-0 animate-[scan_3s_ease-in-out_infinite]"></div>
                </div>
              )}

              {/* REAL-TIME CLOCK OVERLAY */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
                 <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/10 flex flex-col items-center shadow-lg">
                    <p className="text-[13px] font-black text-white tracking-[0.2em] leading-none mb-0.5">
                       {currentDateTime.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                    </p>
                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest leading-none">
                       {currentDateTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                 </div>
                 <div className="h-3 w-0.5 bg-blue-500/50 mt-1"></div>
              </div>

              {/* FACE FRAME BORDER */}
              {cameraActive && (
                <div className={`absolute inset-0 border-4 rounded-full transition-all duration-300 pointer-events-none ${isFaceMatched ? 'border-emerald-500 shadow-[inset_0_0_40px_rgba(16,185,129,0.3)]' : isFaceDetected ? 'border-blue-500/70' : 'border-white/10'}`}></div>
              )}
            </div>

            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]"></div>
            </div>

            {/* SCANNING & STATUS OVERLAYS */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
                <div className="w-80 h-80 md:w-[450px] md:h-[450px] border border-white/10 rounded-full flex items-center justify-center">
                  {isFaceMatched && !isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-80 h-80 md:w-[400px] md:h-[400px] -rotate-90">
                        <circle cx="50%" cy="50%" r="48%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                        <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray="100, 100" strokeDashoffset={100 - matchStabilizedTime} strokeLinecap="round" className="transition-all duration-200" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Bottom HUD badges & instant trigger */}
                <div className="absolute bottom-6 flex flex-col items-center gap-2 pointer-events-auto">
                  {!isFaceDetected && (
                    <div className="bg-black/70 backdrop-blur-xl px-6 py-2.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2.5 shadow-lg">
                      <i className="bi bi-person-bounding-box text-blue-400 animate-pulse"></i>
                      <span>Posisikan Wajah di Lingkaran</span>
                    </div>
                  )}

                  {isFaceDetected && !isFaceMatched && (
                    <div className="bg-slate-900/90 backdrop-blur-xl px-6 py-2.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-blue-500/30 flex items-center gap-2.5 shadow-xl">
                      <i className="bi bi-search text-blue-400"></i>
                      <span>Mendeteksi Biometrik Wajah...</span>
                    </div>
                  )}

                  {isFaceMatched && !isProcessing && (
                    <button 
                      onClick={() => handleAutoAbsensi()}
                      className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all px-8 py-3.5 rounded-full text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_15px_40px_rgba(16,185,129,0.5)] border-2 border-emerald-400 cursor-pointer"
                    >
                      <i className="bi bi-fingerprint text-lg"></i>
                      <span>Verifikasi Otomatis Terdeteksi &bull; Klik Untuk Rekam</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* VERIFICATION SPLASH */}
            {verificationResult && (
              <div className={`absolute inset-0 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-8 z-50 animate-fadeIn ${verificationResult.status === 'SUCCESS' ? 'bg-emerald-600/95' : 'bg-rose-600/95'}`}>
                <div className="h-24 w-24 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-white/10">
                  <i className={`bi ${verificationResult.status === 'SUCCESS' ? 'bi-check-lg' : 'bi-exclamation-octagon-fill'} text-5xl`}></i>
                </div>
                <h4 className="text-3xl font-black uppercase tracking-tight text-center">
                  {verificationResult.status === 'SUCCESS' ? 'Presensi Berhasil Diterima' : 'Gagal Verifikasi'}
                </h4>
                <p className="text-base font-bold mt-2 text-center max-w-md opacity-90">{verificationResult.message}</p>
                
                {verificationResult.status === 'SUCCESS' && (
                  <div className="mt-8 flex gap-3">
                    <div className="px-5 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase border border-white/20">
                      WAKTU: {new Date().toLocaleTimeString()} WIB
                    </div>
                    <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase border ${verificationResult.late ? 'bg-rose-500/30 border-rose-300' : 'bg-emerald-500/30 border-emerald-300'}`}>
                      STATUS: {verificationResult.late ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CAMERA TOOLBAR CONTROLS */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Start / Restart Camera */}
              <button
                onClick={() => {
                  if (cameraActive) {
                    stopCamera();
                  } else {
                    startCamera();
                  }
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                  cameraActive 
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/20'
                }`}
              >
                <i className={`bi ${cameraActive ? 'bi-camera-video-off-fill' : 'bi-camera-video-fill'}`}></i>
                <span>{cameraActive ? 'Matikan Kamera' : 'Nyalakan Kamera'}</span>
              </button>

              {/* Switch Facing Mode (Front / Rear) */}
              <button
                onClick={toggleFacingMode}
                className="px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all"
                title="Beralih Kamera Depan / Belakang"
              >
                <i className="bi bi-arrow-repeat"></i>
                <span className="hidden sm:inline">Ganti Kamera ({facingMode === 'user' ? 'Depan' : 'Belakang'})</span>
              </button>

              {/* Device Selector if multiple cameras available */}
              {availableCameras.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium text-gray-700 outline-none max-w-[180px]"
                >
                  {availableCameras.map((cam, idx) => (
                    <option key={cam.deviceId || idx} value={cam.deviceId}>
                      {cam.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Instant Snapshot Attendance Fallback Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={isProcessing}
                onClick={() => handleAutoAbsensi('MASUK')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <i className="bi bi-box-arrow-in-right"></i>
                <span>Foto Masuk</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => handleAutoAbsensi('PULANG')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <i className="bi bi-box-arrow-right"></i>
                <span>Foto Pulang</span>
              </button>
            </div>
          </div>

          {/* PROFILE SUMMARY */}
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 flex-1 min-w-0">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl md:rounded-3xl bg-gray-50 border-4 border-white ring-1 ring-gray-100 overflow-hidden shadow-xl shrink-0">
                {currentPegawai?.foto ? (
                  <img src={currentPegawai.foto} className="h-full w-full object-cover" alt="Foto Pegawai" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-600 font-black text-2xl">?</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Identitas Pegawai Terverifikasi</p>
                <h4 className="text-lg md:text-xl font-black text-gray-950 uppercase truncate leading-tight">
                  {currentPegawai?.nama || user?.name}
                </h4>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span className="font-mono font-bold text-gray-700">NIP: {currentPegawai?.nip || user?.nip}</span>
                  <span>&bull;</span>
                  <span className="truncate">{currentPegawai?.jabatan || user?.role}</span>
                </div>
              </div>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-8 text-left md:text-right shrink-0">
              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Status Kehadiran Hari Ini</p>
              <h5 className="text-lg font-black text-blue-600 uppercase">
                {absensiHistory.length === 0 ? 'Belum Presensi' : 
                 absensiHistory.length === 1 ? 'Sudah Masuk' : 'Lengkap (Masuk & Pulang)'}
              </h5>
              <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                {absensiHistory.length} Sesi Tercatat
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ATTENDANCE LOG FEED */}
        <div className="xl:col-span-4 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
            <div>
              <h5 className="text-xs font-black text-gray-950 uppercase tracking-wider">Aktivitas Presensi Hari Ini</h5>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Real-time Presence Feed</p>
            </div>
            <i className="bi bi-clock-history text-blue-600 text-lg"></i>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-white">
            {absensiHistory.map((h, i) => (
              <div key={`${h.id}-${i}`} className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl flex items-center gap-4 transition-all hover:bg-white shadow-sm">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${h.tipe === 'MASUK' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                  <i className={`bi ${h.tipe === 'MASUK' ? 'bi-box-arrow-in-right' : 'bi-box-arrow-right'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gray-950 uppercase">{h.tipe}</span>
                    <span className="text-xs font-black text-blue-600 tabular-nums">{h.waktu} WIB</span>
                  </div>
                  <div className="flex justify-between mt-1 items-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight truncate max-w-[140px]">{h.lokasi}</p>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${h.status === 'TERLAMBAT' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {h.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {absensiHistory.length === 0 && (
              <div className="py-24 text-center opacity-40 flex flex-col items-center">
                <i className="bi bi-camera-video text-5xl mb-3 text-slate-400"></i>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Belum Ada Data Presensi<br/>
                  <span className="text-[10px] font-normal lowercase">Posisikan wajah pada kamera atau klik tombol foto di bawah.</span>
                </p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-900 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
              SISTEM PRESENSI BIOMETRIK DJKI<br/>
              <span className="text-slate-500 text-[8px]">KEMENKUM RI &bull; v6.0 AI SMART ATTENDANCE</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsensiOnlinePage;
