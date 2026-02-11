import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord } from '../types';
import { useAuth } from '../AuthContext';
// @ts-ignore
import * as faceapi from '@vladmandic/face-api';

const AbsensiOnlinePage = () => {
  const { user } = useAuth();
  const [currentPegawai, setCurrentPegawai] = useState<Pegawai | null>(null);
  const [status, setStatus] = useState({ model: 'Loading...', camera: 'Waiting...', data: 'Checking...' });
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isFaceMatched, setIsFaceMatched] = useState(false);
  const [matchStabilizedTime, setMatchStabilizedTime] = useState(0); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{status: 'SUCCESS' | 'REJECTED' | 'ERROR', message: string, type?: string, late?: boolean} | null>(null);
  const [absensiHistory, setAbsensiHistory] = useState<AbsensiRecord[]>([]);
  const [detectionScore, setDetectionScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionInterval = useRef<any>(null);
  const faceMatcher = useRef<any>(null);

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
    return () => {
      stopCamera();
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [user]);

  const loadHistory = () => {
    const saved = localStorage.getItem('absensi_history_db');
    if (saved) {
      const parsed = JSON.parse(saved);
      const today = new Date().toLocaleDateString('id-ID');
      const userLogs = parsed.filter((l: any) => l.nip === user?.nip && l.tanggal === today);
      setAbsensiHistory(userLogs);
    }
  };

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      setStatus(prev => ({ ...prev, model: 'Ready' }));
      await startCamera();
    } catch (err) {
      setStatus(prev => ({ ...prev, model: 'Error' }));
      throw err;
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
      setStatus(prev => ({ ...prev, data: 'Syncing Face...' }));
      const img = await faceapi.fetchImage(pegawai.foto + '?cache=none');
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
      setStatus(prev => ({ ...prev, data: 'Failed' }));
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

      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
        .withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        setIsFaceDetected(true);
        setDetectionScore(detection.detection.score);
        
        if (faceMatcher.current && detection.detection.score > 0.7) {
          const bestMatch = faceMatcher.current.findBestMatch(detection.descriptor);
          const matched = bestMatch.label !== 'unknown';
          setIsFaceMatched(matched);

          if (matched) {
            setMatchStabilizedTime(prev => {
              if (prev >= 100) {
                handleAutoAbsensi();
                return 100;
              }
              return prev + 20; // Deteksi stabil selama ~1.5 - 2 detik
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
      }
    }, 250);
  };

  const handleAutoAbsensi = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentTimeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const todayStr = now.toLocaleDateString('id-ID');
    const { limitMasuk } = getScheduleRules();

    // Tipe otomatis: Masuk (<12:00), Pulang (>=12:00)
    const tipe: 'MASUK' | 'PULANG' = currentHour < 12 ? 'MASUK' : 'PULANG';

    const savedLogs = JSON.parse(localStorage.getItem('absensi_history_db') || '[]');
    const alreadyCheckIn = savedLogs.find((l: any) => l.nip === user?.nip && l.tanggal === todayStr && l.tipe === 'MASUK');
    const alreadyCheckOut = savedLogs.find((l: any) => l.nip === user?.nip && l.tanggal === todayStr && l.tipe === 'PULANG');

    // Aturan Masuk: Ambil yang paling pagi (Jika sudah ada, abaikan scan berikutnya)
    if (tipe === 'MASUK' && alreadyCheckIn) {
      setVerificationResult({ status: 'REJECTED', message: `Data MASUK sudah tercatat pada ${alreadyCheckIn.waktu} WIB.`, type: 'MASUK' });
      setTimeout(() => resetState(), 4000);
      return;
    }

    // Hitung Keterlambatan (Hanya untuk MASUK)
    let isLate = false;
    if (tipe === 'MASUK') {
        const [lH, lM, lS] = limitMasuk.split(':').map(Number);
        const limitDate = new Date();
        limitDate.setHours(lH, lM, lS);
        if (now > limitDate) isLate = true;
    }

    const record: any = {
      id: Date.now().toString(),
      nip: currentPegawai?.nip || user?.nip,
      nama: currentPegawai?.nama || user?.name,
      tanggal: todayStr,
      waktu: currentTimeStr,
      tipe,
      status: isLate ? 'TERLAMBAT' : 'TEPAT WAKTU',
      lokasi: 'DJKI Automated Node',
      confidence: detectionScore
    };

    let updatedLogs = [...savedLogs];
    if (tipe === 'PULANG' && alreadyCheckOut) {
      // Aturan Pulang: Ambil yang paling akhir (Timpa data lama)
      updatedLogs = savedLogs.map((l: any) => 
        (l.nip === user?.nip && l.tanggal === todayStr && l.tipe === 'PULANG') ? record : l
      );
    } else {
      updatedLogs = [record, ...savedLogs];
    }

    localStorage.setItem('absensi_history_db', JSON.stringify(updatedLogs));
    loadHistory();
    
    setVerificationResult({ 
      status: 'SUCCESS', 
      message: `Presensi ${tipe} Berhasil`, 
      type: tipe, 
      late: isLate 
    });

    // Cooldown 5 detik
    setTimeout(() => resetState(), 5000);
  };

  const resetState = () => {
    setIsProcessing(false);
    setMatchStabilizedTime(0);
    setVerificationResult(null);
  };

  const rules = getScheduleRules();

  return (
    <div className="space-y-6 animate-fadeIn pb-24 text-black font-['Inter']">
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-[#0f172a] rounded-[3.5rem] overflow-hidden relative aspect-video shadow-2xl border-[12px] border-white ring-1 ring-gray-100 group">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            
            {/* SCANNING OVERLAY */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
               <div className={`w-[40%] h-[75%] border-2 rounded-[3.5rem] transition-all duration-500 relative ${isFaceMatched ? 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.4)] scale-105' : isFaceDetected ? 'border-blue-400' : 'border-white/10'}`}>
                  {isFaceMatched && !isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                       <svg className="w-full h-full -rotate-90 p-6">
                          <circle cx="50%" cy="50%" r="44%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                          <circle cx="50%" cy="50%" r="44%" fill="none" stroke="#fbbf24" strokeWidth="8" strokeDasharray="100, 100" strokeDashoffset={100 - matchStabilizedTime} strokeLinecap="round" className="transition-all duration-200" />
                       </svg>
                       <div className="absolute text-white font-black text-2xl animate-pulse">
                          {Math.ceil((100 - matchStabilizedTime) / 33)}
                       </div>
                    </div>
                  )}
               </div>

               <div className="absolute bottom-10 flex flex-col items-center gap-3">
                  {!isFaceDetected && (
                    <div className="bg-black/60 backdrop-blur-xl px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
                       <i className="bi bi-person-bounding-box mr-3 text-blue-400"></i> Posisikan Wajah Anda
                    </div>
                  )}
                  {isFaceDetected && !isFaceMatched && (
                    <div className="bg-rose-600/90 backdrop-blur-xl px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                       <i className="bi bi-shield-lock-fill mr-3"></i> Identitas Belum Singkron
                    </div>
                  )}
                  {isFaceMatched && !isProcessing && (
                    <div className="bg-amber-500 backdrop-blur-xl px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl">
                       <div className="h-2 w-2 bg-white rounded-full animate-ping"></div>
                       Wajah Terkunci... Mohon Diam
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
              {absensiHistory.map(h => (
                <div key={h.id} className="p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] flex items-center gap-5 transition-all hover:bg-white shadow-sm">
                   <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl ${h.tipe === 'MASUK' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <i className={`bi ${h.tipe === 'MASUK' ? 'bi-box-arrow-in-right' : 'bi-box-arrow-right'}`}></i>
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-gray-950 uppercase">{h.tipe}</span>
                         <span className="text-[11px] font-black text-blue-600 tabular-nums">{h.waktu}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate">{h.lokasi}</p>
                         <span className={`text-[8px] font-black ${h.status === 'TERLAMBAT' ? 'text-rose-600' : 'text-emerald-600'}`}>{h.status}</span>
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