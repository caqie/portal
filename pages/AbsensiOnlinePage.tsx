import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchAbsensiConfig, saveAbsensiRecord, fetchAbsensiHistoryFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord, AbsensiConfig } from '../types';
import { useAuth } from '../AuthContext';
import * as faceapi from '@vladmandic/face-api';

const AbsensiOnlinePage = () => {
  const { user, isSuperadmin } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [canAccess, setCanAccess] = useState(false);
  const [currentPegawai, setCurrentPegawai] = useState<Pegawai | null>(null);
  const [status, setStatus] = useState({ model: 'Loading...', camera: 'Waiting...', data: 'Checking...' });
  const [modelsLoaded, setModelsLoaded] = useState(false);
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
  const [networkStatus, setNetworkStatus] = useState<string>('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);

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
  const detectionInterval = useRef<any>(null);
  const faceMatcher = useRef<any>(null);
  const lastLandmarks = useRef<any>(null);
  const livenessHistory = useRef<number[]>([]);

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

  // Deteksi Resize untuk Restriksi
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check Access Permission
  useEffect(() => {
    setCanAccess(isMobile || isSuperadmin);
  }, [isMobile, isSuperadmin]);

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

  useEffect(() => {
    if (!canAccess) return; // Jangan inisialisasi jika tidak punya akses

    loadHistory();
    const init = async () => {
      try {
        await loadModels();
        const peg = await loadCurrentPegawai();
        if (peg && peg.foto) {
          await prepareFaceMatcher(peg);
        } else if (peg && !peg.foto) {
          setStatus(prev => ({ ...prev, data: 'No Photo' }));
          setErrorMessage("Foto profil belum tersedia. Unggah foto di modul Pegawai.");
        }
      } catch (err) {
        setErrorMessage("Inisialisasi sistem biometrik gagal.");
      }
    };
    init();
    checkNetwork();
    return () => {
      stopCamera();
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [user, canAccess]);

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
          console.warn("All IP discovery services failed.");
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
        setNetworkStatus(isWfa ? 'Validated (WFA)' : isOffice ? 'Validated (Office)' : 'Bypassed (Superadmin)');
      } else {
        setIsNetworkValid(false);
        setErrorMessage(`Akses Ditolak: Lokasi Anda (${ip}) di luar jangkauan kantor.`);
      }
    } catch (e) {
      console.error("Network check failed:", e);
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
      // Use a reliable CDN for models
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      
      // Load models sequentially to avoid overwhelming the browser
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      
      setModelsLoaded(true);
      setStatus(prev => ({ ...prev, model: 'Ready' }));
      await startCamera();
    } catch (err) {
      console.error("Model loading failed:", err);
      setStatus(prev => ({ ...prev, model: 'Error' }));
      setErrorMessage("Gagal memuat model AI biometrik. Periksa koneksi internet Anda.");
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
      setStatus(prev => ({ ...prev, data: 'Error' }));
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
      
      // Ensure the photo URL is direct and handle potential CORS issues
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
        setErrorMessage("Foto profil tidak dapat diproses oleh AI. Gunakan foto wajah yang jelas.");
      }
    } catch (err) {
      console.error("Face matcher preparation failed:", err);
      setStatus(prev => ({ ...prev, data: 'Failed' }));
      setErrorMessage("Gagal menyinkronkan data biometrik wajah.");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus(prev => ({ ...prev, camera: 'Active' }));
        videoRef.current.onloadedmetadata = () => startDetection();
      }
    } catch (err) {
      setStatus(prev => ({ ...prev, camera: 'Denied' }));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const startDetection = () => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !modelsLoaded || isProcessing) return;

      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
        .withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        setIsFaceDetected(true);
        setDetectionScore(detection.detection.score);
        console.log("Face detected with score:", detection.detection.score);

        // Basic Liveness Detection: Check for micro-movements in landmarks
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
          
          // We want some movement (not a static photo) but not too much (not blurred)
          // Photos usually have 0 or very consistent movement if the camera is shaking
          // Real faces have micro-tremors and muscle movements
          livenessHistory.current.push(avgMovement);
          if (livenessHistory.current.length > 10) livenessHistory.current.shift();
          
          const avgLiveness = livenessHistory.current.reduce((a, b) => a + b, 0) / livenessHistory.current.length;
          setLivenessScore(avgLiveness);
        }
        lastLandmarks.current = detection.landmarks.positions;
        
        // Threshold for liveness: avgMovement should be between 0.01 and 10.0
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
    }, 200);
  };

  const handleAutoAbsensi = async () => {
    if (isProcessing || (!isNetworkValid && !isSuperadmin) || !user) {
      console.log("Auto-absensi blocked:", { isProcessing, isNetworkValid, isSuperadmin });
      return;
    }
    setIsProcessing(true);
    
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const d = now.getDate().toString().padStart(2, '0');
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const y = now.getFullYear();
      const todayStr = `${d}/${m}/${y}`;
      const { limitMasuk } = getScheduleRules();

      const tipe: 'MASUK' | 'PULANG' = currentHour < 12 ? 'MASUK' : 'PULANG';

      // Check existing history from state (which is synced with server on load)
      const alreadyCheckIn = absensiHistory.find(l => l.tipe === 'MASUK');
      const alreadyCheckOut = absensiHistory.find(l => l.tipe === 'PULANG');

      if (tipe === 'MASUK' && alreadyCheckIn) {
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

      const record: any = {
        id: `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        nip: currentPegawai?.nip || user?.nip,
        nama: currentPegawai?.nama || user?.name,
        tanggal: todayStr,
        waktu: currentTimeStr,
        tipe,
        status: isLate ? 'TERLAMBAT' : 'TEPAT WAKTU',
        lokasi: absensiConfig?.wfaNips.includes(user?.nip || '') ? 'WFA (REMOTE)' : 'DJKI OFFICE NODE',
        confidence: detectionScore.toFixed(4)
      };

      const ok = await saveAbsensiRecord(record);
      if (ok) {
        await loadHistory();
        speak("Terima kasih, presensi berhasil terkirim ke database.");
        setVerificationResult({ 
          status: 'SUCCESS', 
          message: `Presensi ${tipe} Berhasil`, 
          type: tipe, 
          late: isLate 
        });
      } else {
        throw new Error("Cloud sync failed");
      }

      setTimeout(() => resetState(), 5000);
    } catch (err) {
      console.error("Absensi processing failed:", err);
      setIsProcessing(false);
      speak("Maaf, terjadi kesalahan saat mengirim data ke cloud. Pastikan internet Anda stabil.");
      setErrorMessage("Gagal memproses data absensi ke Cloud Database.");
    }
  };

  const resetState = () => {
    setIsProcessing(false);
    setMatchStabilizedTime(0);
    setVerificationResult(null);
    setFailedAttempts(0);
  };

  useEffect(() => {
    if (isFaceDetected && !isFaceMatched && !isProcessing) {
      const timer = setTimeout(() => {
        speak("Maaf, verifikasi wajah gagal. Silakan coba lagi.");
        setFailedAttempts(prev => prev + 1);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isFaceDetected, isFaceMatched, isProcessing]);

  // UI UNTUK DESKTOP (RESTRICTED)
  if (!canAccess || (!isNetworkValid && !isSuperadmin)) {
    const isWfa = absensiConfig?.wfaNips.includes(user?.nip || '');
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-fadeIn text-center p-10">
        <div className={`w-32 h-32 ${!isNetworkValid ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-rose-50 text-rose-500 border-rose-100'} rounded-[3rem] flex items-center justify-center mb-8 border-4 shadow-2xl animate-pulse`}>
           <i className={`bi ${!isNetworkValid ? 'bi-wifi-off' : 'bi-phone-vibrate'} text-6xl`}></i>
        </div>
        <h2 className="text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">
            {!isNetworkValid ? 'Network Restricted' : 'Security Restricted'}
        </h2>
        <p className={`text-[11px] font-black ${!isNetworkValid ? 'text-amber-600' : 'text-rose-600'} uppercase tracking-[0.3em] mt-4`}>
            {!isNetworkValid ? 'Outside Office Network' : 'Mobile Device Access Only'}
        </p>
        
        <div className="mt-10 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl max-w-md">
           <p className="text-sm font-bold text-gray-500 leading-relaxed uppercase">
              {!isNetworkValid 
                ? `Sistem mendeteksi Anda berada di luar jaringan kantor. Silakan hubungkan perangkat Anda ke Wi-Fi ${absensiConfig?.officeWifiSsid || 'Kantor'} untuk melakukan absensi reguler.`
                : 'Mohon maaf, fitur pemindaian biometrik wajah hanya tersedia melalui perangkat mobile atau tablet.'
              }
           </p>
           {!isNetworkValid && (
             <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase">Your Current IP:</p>
                <p className="text-xs font-mono font-bold text-gray-600">{userIp || 'Detecting...'}</p>
                {isSuperadmin && (
                  <button 
                    onClick={() => setIsNetworkValid(true)}
                    className="mt-4 w-full py-3 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Bypass & Test Presensi (Superadmin Only)
                  </button>
                )}
             </div>
           )}
           <div className="h-[1px] w-24 bg-gray-100 mx-auto my-6"></div>
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
             {isWfa ? 'Anda memiliki akses WFA, namun terjadi kendala verifikasi jaringan.' : 'Hanya pegawai dengan izin WFA yang dapat absen dari jaringan luar.'}
           </p>
        </div>
        
        <button onClick={() => navigate('/')} className="mt-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-blue-600 transition-colors">
           <i className="bi bi-arrow-left mr-2"></i> Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const rules = getScheduleRules();

  return (
    <div className="space-y-6 animate-fadeIn pb-24 text-black font-['Inter']">
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
      {/* HEADER & DIAGNOSTICS */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <h3 className="text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Smart Absence Node</h3>
          <div className="flex flex-wrap gap-2 mt-4">
             <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${status.model==='Ready'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-gray-50 text-gray-400'}`}>AI Engine: {status.model}</div>
             <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${status.camera==='Active'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-gray-50 text-gray-400'}`}>Visual: {status.camera}</div>
             <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border ${status.data==='Verified'?'bg-emerald-50 text-emerald-600 border-emerald-100':'bg-amber-50 text-amber-600 border-amber-100'}`}>Sync: {status.data}</div>
          </div>
        </div>
        <div className="bg-white p-4 px-6 rounded-[1.5rem] border border-gray-100 shadow-sm">
           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule Today:</p>
           <h5 className="text-xs font-black text-blue-600 uppercase tracking-tight">{rules.desc}</h5>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 animate-fadeIn">
          <div className="h-12 w-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
            <i className="bi bi-exclamation-triangle-fill text-xl"></i>
          </div>
          <div>
            <h6 className="text-[11px] font-black text-rose-900 uppercase">System Error Detected</h6>
            <p className="text-[10px] font-bold text-rose-600 uppercase mt-1">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <i className="bi bi-x-circle-fill text-xl"></i>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-slate-900 rounded-[3.5rem] overflow-hidden relative aspect-square md:aspect-video shadow-2xl border-[12px] border-white ring-1 ring-gray-100 group flex items-center justify-center">
            
            {/* CIRCULAR CAMERA CONTAINER */}
            <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-full overflow-hidden border-8 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-10">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onPlay={() => startDetection()}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" 
              />
              
              {/* SCANNING LINE ANIMATION */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] absolute top-0 animate-[scan_3s_ease-in-out_infinite]"></div>
              </div>

              {/* REAL-TIME CLOCK OVERLAY */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-30">
                 <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/10 flex flex-col items-center">
                    <p className="text-[14px] font-black text-white tracking-[0.2em] leading-none mb-0.5">
                       {currentDateTime.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest leading-none">
                       {currentDateTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                 </div>
                 <div className="h-4 w-0.5 bg-blue-500/50 mt-1"></div>
              </div>

              {/* FACE FRAME */}
              <div className={`absolute inset-0 border-4 rounded-full transition-all duration-300 ${isFaceMatched ? 'border-emerald-500 shadow-[inset_0_0_40px_rgba(16,185,129,0.2)]' : isFaceDetected ? 'border-blue-500/50' : 'border-white/5'}`}></div>
            </div>

            {/* BACKGROUND DECORATION */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]"></div>
            </div>

            {/* SCANNING OVERLAY */}
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

               <div className="absolute bottom-6 flex flex-col items-center gap-3">
                   {!isFaceDetected && (
                    <div className="bg-black/60 backdrop-blur-xl px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-3">
                       <i className="bi bi-person-bounding-box text-blue-400 animate-pulse"></i> Scan Wajah Sedang Aktif...
                    </div>
                  )}
                  {isFaceDetected && !isFaceMatched && (
                    <div className="bg-rose-600/90 backdrop-blur-xl px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3">
                       <i className="bi bi-shield-lock-fill"></i> Identitas Belum Sesuai
                    </div>
                  )}
                  {isFaceMatched && !isProcessing && (
                    <button 
                      onClick={handleAutoAbsensi}
                      className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all backdrop-blur-xl px-10 py-5 rounded-full text-white text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-4 shadow-[0_20px_50px_rgba(37,99,235,0.4)] border-2 border-blue-400 group/btn"
                    >
                       <i className="bi bi-fingerprint text-xl group-hover/btn:scale-125 transition-transform"></i>
                       Klik Untuk Presensi Sekarang
                    </button>
                  )}
                  {isFaceMatched && !isProcessing && (
                    <div className="bg-emerald-500/80 backdrop-blur-md px-6 py-2 rounded-full text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-2 mt-2">
                       <div className="h-1.5 w-1.5 bg-white rounded-full animate-ping"></div>
                       Sistem Akan Mengambil Data Otomatis Dalam 3 Detik
                    </div>
                  )}
               </div>
            </div>

            {/* VERIFICATION SPLASH */}
            {verificationResult && (
               <div className={`absolute inset-0 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-10 z-50 animate-fadeIn ${verificationResult.status === 'SUCCESS' ? 'bg-emerald-600/95' : 'bg-rose-600/95'}`}>
                  <div className="h-28 w-28 bg-white/20 rounded-full flex items-center justify-center mb-8 shadow-2xl border-4 border-white/10">
                     <i className={`bi ${verificationResult.status === 'SUCCESS' ? 'bi-check-lg' : 'bi-exclamation-octagon-fill'} text-6xl`}></i>
                  </div>
                  <h4 className="text-4xl font-black uppercase tracking-tighter text-center">{verificationResult.status === 'SUCCESS' ? 'Presensi Diterima' : 'Gagal Verifikasi'}</h4>
                  <p className="text-lg font-bold mt-4 text-center max-w-md">{verificationResult.message}</p>
                  
                  {verificationResult.status === 'SUCCESS' && (
                     <div className="mt-10 flex gap-4">
                        <div className="px-6 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase border border-white/20">WAKTU: {new Date().toLocaleTimeString()}</div>
                        <div className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase border ${verificationResult.late ? 'bg-rose-500/30 border-rose-300' : 'bg-emerald-500/30 border-emerald-300'}`}>
                           STATUS: {verificationResult.late ? 'TERLAMBAT' : 'TEPAT WAKTU'}
                        </div>
                     </div>
                  )}
               </div>
            )}
          </div>

          {/* PROFILE SUMMARY */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
             <div className="flex items-center gap-6 flex-1">
                <div className="h-20 w-20 rounded-[2rem] bg-gray-50 border-4 border-white ring-1 ring-gray-100 overflow-hidden shadow-xl shrink-0">
                   {currentPegawai?.foto ? <img src={currentPegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-600 font-black text-2xl">?</div>}
                </div>
                <div className="min-w-0">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Authenticated Identity:</p>
                   <h4 className="text-xl font-black text-gray-950 uppercase truncate leading-tight">{currentPegawai?.nama || user?.name}</h4>
                   <div className="flex items-center gap-4 mt-2">
                      <span className={`h-2 w-2 rounded-full ${isFaceMatched ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Confidence: {(detectionScore * 100).toFixed(0)}%</p>
                   </div>
                </div>
             </div>
             <div className="h-16 w-[1px] bg-gray-100 hidden md:block"></div>
             <div className="text-center md:text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Presensi Hari Ini</p>
                <h5 className="text-lg font-black text-blue-600 uppercase">
                  {absensiHistory.length === 0 ? 'BELUM ABSEN' : 
                   absensiHistory.length === 1 ? 'SUDAH MASUK' : 'LENGKAP'}
                </h5>
             </div>
          </div>
        </div>

        {/* LOGS PANEL */}
        <div className="xl:col-span-4 bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
           <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <div>
                <h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">Aktivitas Node</h5>
                <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">Real-time Presence Feed</p>
              </div>
              <i className="bi bi-cpu text-blue-600 text-xl"></i>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white">
              {absensiHistory.map((h, i) => (
                <div key={`${h.id}-${i}`} className="p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] flex items-center gap-5 transition-all hover:bg-white shadow-sm">
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl ${h.tipe === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <i className={`bi ${h.tipe === 'MASUK' ? 'bi-box-arrow-in-right' : 'bi-box-arrow-right'}`}></i>
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-gray-950 uppercase">{h.tipe}</span>
                         <span className="text-[11px] font-black text-blue-600 tabular-nums">{h.waktu}</span>
                      </div>
                      <div className="flex justify-between mt-1 items-center">
                         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">{h.lokasi}</p>
                         <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] font-black ${h.status === 'TERLAMBAT' ? 'text-rose-600' : 'text-emerald-600'}`}>{h.status}</span>
                            {h.simpegStatus === 'SUCCESS' && <i className="bi bi-check-circle-fill text-emerald-500 text-[10px]" title="Sync SIMPEG OK"></i>}
                            {h.simpegStatus === 'FAILED' && <i className="bi bi-exclamation-circle-fill text-rose-500 text-[10px]" title="Sync SIMPEG Gagal"></i>}
                            {h.simpegStatus === 'PENDING' && <i className="bi bi-arrow-repeat text-amber-500 text-[10px] animate-spin"></i>}
                         </div>
                      </div>
                   </div>
                </div>
              ))}
              {absensiHistory.length === 0 && (
                <div className="py-24 text-center opacity-30 flex flex-col items-center">
                   <i className="bi bi-camera-video text-6xl mb-4"></i>
                   <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Sistem Aktif & Menunggu<br/>Deteksi Wajah...</p>
                </div>
              )}
           </div>
           <div className="p-8 bg-[#111827] text-center">
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
                 AUTOMATED BIOMETRIC PRESENCE<br/>v5.0 CONTACTLESS SYSTEM
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AbsensiOnlinePage;
