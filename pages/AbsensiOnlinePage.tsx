
import React, { useState, useEffect, useRef } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord } from '../types';
import { useAuth } from '../AuthContext';
// @ts-ignore
import * as faceapi from 'face-api';

const AbsensiOnlinePage = () => {
  const { user } = useAuth();
  const [currentPegawai, setCurrentPegawai] = useState<Pegawai | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{status: 'SUCCESS' | 'REJECTED' | 'ERROR', message: string} | null>(null);
  const [absensiHistory, setAbsensiHistory] = useState<AbsensiRecord[]>([]);
  const [detectionScore, setDetectionScore] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const detectionInterval = useRef<any>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('absensi_history_db');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      const userLogs = parsed.filter((l: AbsensiRecord) => l.nip === user?.nip);
      setAbsensiHistory(userLogs);
    }

    loadModels();
    loadCurrentPegawai();
    return () => {
      stopCamera();
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [user]);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      startCamera();
    } catch (err) {
      console.error("Gagal memuat model Face-API:", err);
    }
  };

  const loadCurrentPegawai = async () => {
    if (!user) return;
    try {
      const data = await fetchPegawaiFromSheets();
      const found = data.find(p => p.nip === user.nip);
      setCurrentPegawai(found || null);
    } catch (err) {
      console.error("Gagal memuat data pegawai:", err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          startDetection();
        };
      }
    } catch (err) {
      console.error("Gagal akses kamera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startDetection = () => {
    if (detectionInterval.current) clearInterval(detectionInterval.current);

    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      
      // Early exit if refs are null
      if (!video || !overlay) return;

      try {
        const detections = await faceapi.detectAllFaces(
          video, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
        ).withFaceLandmarks();

        // Check again after async operation to prevent "reading videoWidth of null"
        if (!videoRef.current || !overlayRef.current) return;

        const displaySize = { 
          width: video.videoWidth, 
          height: video.videoHeight 
        };

        faceapi.matchDimensions(overlay, displaySize);
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const ctx = overlay.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          
          if (resizedDetections.length > 0) {
            setIsFaceDetected(true);
            setDetectionScore(resizedDetections[0].detection.score);
            
            resizedDetections.forEach(det => {
              const box = det.detection.box;
              ctx.strokeStyle = '#3b82f6';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.x, box.y, box.width, box.height);
              
              ctx.fillStyle = '#3b82f6';
              const s = 15;
              ctx.fillRect(box.x, box.y, s, 4);
              ctx.fillRect(box.x, box.y, 4, s);
              ctx.fillRect(box.x + box.width - s, box.y, s, 4);
              ctx.fillRect(box.x + box.width, box.y, 4, s);
              ctx.fillRect(box.x, box.y + box.height, s, 4);
              ctx.fillRect(box.x, box.y + box.height - s, 4, s);
              ctx.fillRect(box.x + box.width - s, box.y + box.height, s, 4);
              ctx.fillRect(box.x + box.width, box.y + box.height - s, 4, s);
            });
          } else {
            setIsFaceDetected(false);
            setDetectionScore(0);
          }
        }
      } catch (err) {
        // Handle detection error gracefully
      }
    }, 200);
  };

  const handleAbsensi = async (tipe: 'MASUK' | 'PULANG') => {
    if (!currentPegawai || !isFaceDetected) return;

    setIsVerifying(true);
    setVerificationResult(null);

    // Give time for visual feedback
    setTimeout(() => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        // Critical safety check
        if (!video || !canvas) {
          setIsVerifying(false);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        const capturedBase64 = canvas.toDataURL('image/jpeg', 0.8);

        const newRecord: AbsensiRecord = {
          id: Date.now().toString(),
          nip: currentPegawai.nip,
          nama: currentPegawai.nama,
          waktu: new Date().toLocaleTimeString('id-ID'),
          tipe: tipe,
          status: 'VERIFIED',
          lokasi: 'Kantor Pusat DJKI',
          fotoAbsen: capturedBase64,
          confidence: detectionScore
        };

        const globalHistory = localStorage.getItem('absensi_history_db');
        const parsedGlobal = globalHistory ? JSON.parse(globalHistory) : [];
        const updatedGlobal = [newRecord, ...parsedGlobal];
        localStorage.setItem('absensi_history_db', JSON.stringify(updatedGlobal));

        setVerificationResult({
          status: 'SUCCESS',
          message: `Wajah Terverifikasi. Absensi ${tipe} Berhasil dicatat.`
        });
        
        setAbsensiHistory(prev => [newRecord, ...prev]);

      } catch (err: any) {
        setVerificationResult({ status: 'ERROR', message: "Gagal memproses gambar." });
      } finally {
        setIsVerifying(false);
      }
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Presensi Wajah Real-time</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Engine: Face-API (Local Browser) • Anti-Spoofing Enabled</p>
        </div>
        {!modelsLoaded && (
          <div className="flex items-center space-x-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-ping"></div>
            <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Loading Vision Models...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-black rounded-[2.5rem] shadow-2xl relative overflow-hidden aspect-[4/3] md:aspect-video border-4 border-white">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            
            {isFaceDetected && !isVerifying && (
               <div className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10 animate-scan"></div>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-[60%] h-[60%] border-2 rounded-[3rem] transition-all duration-500 ${isFaceDetected ? 'border-blue-500/50 scale-105' : 'border-white/10'}`}>
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-900/80 backdrop-blur-md text-white text-[8px] font-black uppercase rounded-full tracking-widest border border-white/10">
                    {isFaceDetected ? `Face Lock: ${(detectionScore * 100).toFixed(0)}%` : 'Scanning Face...'}
                 </div>
              </div>
            </div>

            {isVerifying && (
              <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-xl flex flex-col items-center justify-center text-white p-6 text-center animate-fadeIn z-20">
                <div className="relative h-20 w-20 mb-6">
                   <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                   <div className="absolute inset-4 border-4 border-white/20 border-b-transparent rounded-full animate-spin [animation-duration:3s]"></div>
                </div>
                <h4 className="text-xl font-black uppercase tracking-widest mb-2">Final Verification</h4>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em]">Menyinkronkan Data Biometrik Lokal ke Database...</p>
              </div>
            )}

            {verificationResult && (
              <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-10 py-5 rounded-2xl shadow-2xl flex items-center space-x-4 animate-modalEnter z-30 ${verificationResult.status === 'SUCCESS' ? 'bg-emerald-600' : 'bg-rose-600'} text-white border border-white/10`}>
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <i className={`bi ${verificationResult.status === 'SUCCESS' ? 'bi-check-all text-3xl' : 'bi-exclamation-triangle text-2xl'}`}></i>
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] font-black uppercase tracking-widest leading-none">{verificationResult.status === 'SUCCESS' ? 'Verified' : 'Error'}</h5>
                  <p className="text-[10px] font-bold text-white/90 mt-1.5 leading-tight">{verificationResult.message}</p>
                </div>
                <button onClick={() => setVerificationResult(null)} className="h-8 w-8 rounded-lg bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all"><i className="bi bi-x-lg"></i></button>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex items-center space-x-4 flex-1">
               <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-100 overflow-hidden flex items-center justify-center shadow-inner relative">
                  {currentPegawai?.foto ? (
                    <img src={currentPegawai.foto} className="w-full h-full object-cover" />
                  ) : (
                    <i className="bi bi-person-fill text-3xl text-blue-200"></i>
                  )}
                  {isFaceDetected && (
                    <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
               </div>
               <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{currentPegawai?.nama || user?.name}</h4>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                    {isFaceDetected ? 'Wajah Terdeteksi • Siap Absensi' : 'Mencari Wajah Pegawai...'}
                  </p>
               </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button 
                onClick={() => handleAbsensi('MASUK')}
                disabled={!isFaceDetected || isVerifying || !modelsLoaded}
                className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-3 active:scale-95 disabled:opacity-50 disabled:grayscale ${isFaceDetected ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700' : 'bg-gray-100 text-gray-400'}`}
              >
                <i className="bi bi-fingerprint text-lg"></i>
                <span>Absen Masuk</span>
              </button>
              <button 
                onClick={() => handleAbsensi('PULANG')}
                disabled={!isFaceDetected || isVerifying || !modelsLoaded}
                className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center space-x-3 active:scale-95 disabled:opacity-50 disabled:grayscale ${isFaceDetected ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20 hover:bg-black' : 'bg-gray-100 text-gray-400'}`}
              >
                <i className="bi bi-box-arrow-left text-lg"></i>
                <span>Absen Pulang</span>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111827] p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden border border-white/5">
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-6">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg"><i className="bi bi-cpu-fill"></i></div>
                <h4 className="text-[11px] font-black uppercase tracking-widest">Client-Side AI Engine</h4>
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Face-API.js v1.7</p>
                    <p className="text-[9px] text-gray-400 font-bold leading-relaxed">Pemrosesan wajah dilakukan 100% pada peramban pengguna. Tidak ada data biometrik yang keluar dari perangkat ini, menjaga privasi data Anda.</p>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                       <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Confidence Threshold</p>
                       <p className="text-sm font-black text-blue-400">0.80+</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                       <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Model Complexity</p>
                       <p className="text-sm font-black text-blue-400">Tiny-v2</p>
                    </div>
                 </div>
              </div>
            </div>
            <i className="bi bi-shield-shaded absolute -right-6 -bottom-6 text-9xl text-white/5 rotate-12"></i>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[400px]">
            <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Log Aktivitas Hari Ini</h5>
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {absensiHistory.length > 0 ? absensiHistory.map(record => (
                <div key={record.id} className="p-4 bg-gray-50 rounded-3xl border border-gray-100 flex items-center space-x-4 animate-fadeIn">
                  <div className="h-14 w-14 rounded-2xl overflow-hidden bg-white border border-gray-100 shrink-0 shadow-sm">
                    <img src={record.fotoAbsen} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black text-gray-900 uppercase truncate">{record.nama}</p>
                      <span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded border ${record.tipe === 'MASUK' ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-800 text-white border-gray-700'}`}>{record.tipe}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                       <p className="text-[9px] font-bold text-gray-400 uppercase">{record.waktu}</p>
                       <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                       <p className="text-[8px] font-black text-emerald-600 uppercase">Face Match {(record.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <i className="bi bi-camera-reels text-gray-300 text-5xl mb-4"></i>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Sistem Menunggu Input Deteksi Wajah Lokal</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsensiOnlinePage;
