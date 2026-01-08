
import React, { useState, useEffect, useRef } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, AbsensiRecord } from '../types';
import { useAuth } from '../AuthContext';
// @ts-ignore
import * as faceapi from '@vladmandic/face-api';

const AbsensiOnlinePage = () => {
  const { user } = useAuth();
  const [currentPegawai, setCurrentPegawai] = useState<Pegawai | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isFaceMatched, setIsFaceMatched] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{status: 'SUCCESS' | 'REJECTED' | 'ERROR', message: string} | null>(null);
  const [absensiHistory, setAbsensiHistory] = useState<AbsensiRecord[]>([]);
  const [detectionScore, setDetectionScore] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const detectionInterval = useRef<any>(null);
  const faceMatcher = useRef<any>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('absensi_history_db');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      const userLogs = parsed.filter((l: AbsensiRecord) => l.nip === user?.nip);
      setAbsensiHistory(userLogs);
    }

    const init = async () => {
      await loadModels();
      const peg = await loadCurrentPegawai();
      if (peg) {
        if (peg.foto && (peg.foto.startsWith('http') || peg.foto.startsWith('data:image'))) {
          await prepareFaceMatcher(peg);
        } else {
          setErrorMessage("Foto profil tidak valid atau belum diunggah. Silakan unggah foto di menu Profil.");
        }
      }
    };
    
    init();

    return () => {
      stopCamera();
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [user]);

  const loadModels = async () => {
    try {
      // Menggunakan URL model yang lebih stabil dari github pages vladmandic
      const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      await startCamera();
    } catch (err) {
      console.error("Gagal memuat model Face-API:", err);
      setErrorMessage("Gagal memuat mesin kecerdasan buatan. Periksa koneksi internet Anda.");
    }
  };

  const loadCurrentPegawai = async () => {
    if (!user) return null;
    try {
      const savedLocal = localStorage.getItem('portal_pegawai_db');
      let data: Pegawai[] = [];
      if (savedLocal) {
        data = JSON.parse(savedLocal);
      } else {
        data = await fetchPegawaiFromSheets();
      }
      
      const found = data.find(p => p.nip === user.nip);
      setCurrentPegawai(found || null);
      return found || null;
    } catch (err) {
      console.error("Gagal memuat data pegawai:", err);
      return null;
    }
  };

  const prepareFaceMatcher = async (pegawai: Pegawai) => {
    if (!pegawai.foto) return;
    try {
      const img = await faceapi.fetchImage(pegawai.foto);
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 128 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detections) {
        const labeledDescriptor = new faceapi.LabeledFaceDescriptors(
          pegawai.nip,
          [detections.descriptor]
        );
        faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptor, 0.55);
        console.log("Biometric Matcher Ready.");
      } else {
        setErrorMessage("Wajah tidak terdeteksi pada foto profil Anda. Gunakan foto yang lebih jelas.");
      }
    } catch (err) {
      console.error("Gagal menyiapkan face matcher:", err);
      setErrorMessage("Gagal mengunduh foto profil sebagai referensi biometrik.");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
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
      setErrorMessage("Kamera tidak diizinkan atau tidak ditemukan.");
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
      
      if (!video || !overlay || !modelsLoaded || video.paused || video.ended) return;

      try {
        const detection = await faceapi.detectSingleFace(
          video, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptor();

        if (!videoRef.current || !overlayRef.current) return;

        const displaySize = { 
          width: video.videoWidth, 
          height: video.videoHeight 
        };

        faceapi.matchDimensions(overlay, displaySize);
        
        const ctx = overlay.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlay.width, overlay.height);
          
          if (detection) {
            const resized = faceapi.resizeResults(detection, displaySize);
            const box = resized.detection.box;
            
            setIsFaceDetected(true);
            setDetectionScore(resized.detection.score);
            
            let isMatched = false;
            if (faceMatcher.current) {
              const bestMatch = faceMatcher.current.findBestMatch(resized.descriptor);
              isMatched = bestMatch.label !== 'unknown';
              setIsFaceMatched(isMatched);
            }

            const color = isMatched ? '#10b981' : (faceMatcher.current ? '#ef4444' : '#3b82f6');
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            ctx.fillStyle = color;
            ctx.font = 'bold 12px Inter';
            const label = isMatched ? 'IDENTITAS TERKONFIRMASI' : (faceMatcher.current ? 'WAJAH TIDAK COCOK' : 'MEMINDAI...');
            ctx.fillText(label, box.x, box.y - 10);
            
          } else {
            setIsFaceDetected(false);
            setIsFaceMatched(false);
            setDetectionScore(0);
          }
        }
      } catch (err) {
        // Drop frame processing
      }
    }, 200); 
  };

  const handleAbsensi = async (tipe: 'MASUK' | 'PULANG') => {
    if (!currentPegawai || !isFaceDetected) return;
    
    if (faceMatcher.current && !isFaceMatched) {
      setVerificationResult({ 
        status: 'REJECTED', 
        message: "Pencocokan gagal. Pastikan posisi wajah sesuai dengan foto profil." 
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    setTimeout(() => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        
        const capturedBase64 = canvas.toDataURL('image/jpeg', 0.6);

        const newRecord: AbsensiRecord = {
          id: Date.now().toString(),
          nip: currentPegawai.nip,
          nama: currentPegawai.nama,
          waktu: new Date().toLocaleTimeString('id-ID'),
          tipe: tipe,
          status: 'VERIFIED',
          lokasi: 'DJKI Smart Office',
          fotoAbsen: capturedBase64,
          confidence: detectionScore
        };

        const globalHistory = localStorage.getItem('absensi_history_db');
        const parsedGlobal = globalHistory ? JSON.parse(globalHistory) : [];
        localStorage.setItem('absensi_history_db', JSON.stringify([newRecord, ...parsedGlobal]));

        setVerificationResult({
          status: 'SUCCESS',
          message: `Presensi ${tipe} Berhasil dicatat.`
        });
        
        setAbsensiHistory(prev => [newRecord, ...prev]);
      } catch (err: any) {
        setVerificationResult({ status: 'ERROR', message: "Gagal memproses data biometrik." });
      } finally {
        setIsVerifying(false);
      }
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Presensi Wajah</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sinkronisasi Biometrik DJKI • Optimized Engine</p>
        </div>
        <div className="flex items-center gap-3">
          {!modelsLoaded && !errorMessage && (
            <div className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>
              <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Inisialisasi AI...</span>
            </div>
          )}
          {errorMessage && (
            <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 flex items-center space-x-2 text-rose-600">
               <i className="bi bi-exclamation-triangle-fill"></i>
               <span className="text-[9px] font-black uppercase tracking-widest">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-black rounded-[3rem] shadow-2xl relative overflow-hidden aspect-[4/3] md:aspect-video border-8 border-white group">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full scale-x-[-1]" />
            <canvas ref={canvasRef} className="hidden" />
            
            {isFaceDetected && !isVerifying && !verificationResult && (
               <div className="absolute left-0 right-0 h-1.5 bg-blue-500 shadow-[0_0_25px_rgba(59,130,246,1)] z-10 animate-scan"></div>
            )}

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-[50%] h-[60%] border-2 rounded-[4rem] transition-all duration-300 ${isFaceMatched ? 'border-emerald-500 scale-105' : isFaceDetected ? 'border-blue-500/50' : 'border-white/10'}`}>
                 <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-2 backdrop-blur-xl text-white text-[9px] font-black uppercase rounded-full tracking-widest border border-white/20 ${isFaceMatched ? 'bg-emerald-600' : 'bg-gray-900/80'}`}>
                    {isFaceMatched ? 'MATCHER OK' : isFaceDetected ? 'MEMERIKSA...' : 'POSISIKAN WAJAH'}
                 </div>
              </div>
            </div>

            {isVerifying && (
              <div className="absolute inset-0 bg-blue-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 z-20">
                <div className="h-16 w-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h4 className="text-sm font-black uppercase tracking-widest">Memproses...</h4>
              </div>
            )}

            {verificationResult && (
              <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 animate-modalEnter z-30 ${verificationResult.status === 'SUCCESS' ? 'bg-emerald-600' : 'bg-rose-600'} text-white border border-white/20 w-[80%]`}>
                <i className={`bi ${verificationResult.status === 'SUCCESS' ? 'bi-patch-check-fill text-2xl' : 'bi-exclamation-octagon-fill text-2xl'}`}></i>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase leading-tight">{verificationResult.message}</p>
                </div>
                <button onClick={() => setVerificationResult(null)} className="text-white/60 hover:text-white"><i className="bi bi-x-circle-fill"></i></button>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex items-center space-x-5 flex-1">
               <div className="h-16 w-16 rounded-2xl bg-gray-100 overflow-hidden relative shadow-inner">
                  {currentPegawai?.foto ? <img src={currentPegawai.foto} className="w-full h-full object-cover" /> : <i className="bi bi-person-fill text-3xl text-gray-300 flex items-center justify-center h-full"></i>}
                  {isFaceMatched && <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center animate-pulse"><i className="bi bi-check-lg text-emerald-600 text-2xl font-black"></i></div>}
               </div>
               <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight leading-none">{currentPegawai?.nama || user?.name}</h4>
                  <p className={`text-[8px] font-black uppercase tracking-widest mt-2 ${isFaceMatched ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {isFaceMatched ? 'Wajah Sesuai' : 'Verifikasi Dibutuhkan'}
                  </p>
               </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => handleAbsensi('MASUK')} disabled={!isFaceMatched || isVerifying || !modelsLoaded} className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale ${isFaceMatched ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'bg-gray-100 text-gray-400'}`}>MASUK</button>
              <button onClick={() => handleAbsensi('PULANG')} disabled={!isFaceMatched || isVerifying || !modelsLoaded} className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale ${isFaceMatched ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/30' : 'bg-gray-100 text-gray-400'}`}>PULANG</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111827] p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400 mb-6">Metrik Biometrik</h4>
            <div className="space-y-4">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[9px] text-gray-400 font-bold leading-relaxed uppercase">
                      Pencocokan wajah dilakukan secara lokal di peramban Anda untuk keamanan data. Pastikan pencahayaan cukup dan wajah tidak terhalang.
                  </p>
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center"><p className="text-[7px] text-gray-500 uppercase font-black">Accuracy</p><p className="text-[11px] font-black text-emerald-400">{(detectionScore * 100).toFixed(0)}%</p></div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-center"><p className="text-[7px] text-gray-500 uppercase font-black">Reference</p><p className="text-[11px] font-black text-emerald-400">{currentPegawai?.foto ? 'FOUND' : 'MISSING'}</p></div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[400px]">
            <div className="px-8 py-5 border-b border-gray-50 flex justify-between items-center"><h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Log Aktivitas</h5></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {absensiHistory.length > 0 ? absensiHistory.map(record => (
                <div key={record.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm"><img src={record.fotoAbsen} className="w-full h-full object-cover" /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between"><span className={`px-2 py-0.5 text-[7px] font-black uppercase rounded ${record.tipe === 'MASUK' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>{record.tipe}</span><p className="text-[9px] font-bold text-gray-400">{record.waktu}</p></div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Status OK</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30"><i className="bi bi-camera-reels text-4xl mb-4"></i><p className="text-[9px] font-black uppercase tracking-widest">Kosong</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsensiOnlinePage;