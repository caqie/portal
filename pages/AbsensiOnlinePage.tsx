
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
      if (peg && peg.foto) await prepareFaceMatcher(peg);
      else if (!peg?.foto) setErrorMessage("Foto profil belum diunggah. Silakan lengkapi profil Anda.");
    };
    
    init();
    return () => {
      stopCamera();
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, [user]);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      await startCamera();
    } catch (err) {
      setErrorMessage("Gagal memuat engine biometrik.");
    }
  };

  const loadCurrentPegawai = async () => {
    try {
      const pegData = await fetchPegawaiFromSheets();
      const found = pegData.find(p => p.nip === user?.nip);
      setCurrentPegawai(found || null);
      return found || null;
    } catch (e) { return null; }
  };

  const prepareFaceMatcher = async (pegawai: Pegawai) => {
    if (!pegawai.foto) return;
    try {
      const img = await faceapi.fetchImage(pegawai.foto);
      const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 128 }))
        .withFaceLandmarks().withFaceDescriptor();

      if (detections) {
        const labeledDescriptor = new faceapi.LabeledFaceDescriptors(pegawai.nip, [detections.descriptor]);
        faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptor, 0.55);
      }
    } catch (err) { console.error(err); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => startDetection();
      }
    } catch (err) { setErrorMessage("Izin kamera ditolak."); }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const startDetection = () => {
    detectionInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !modelsLoaded) return;

      const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.5 }))
        .withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        setIsFaceDetected(true);
        setDetectionScore(detection.detection.score);
        if (faceMatcher.current) {
          const bestMatch = faceMatcher.current.findBestMatch(detection.descriptor);
          setIsFaceMatched(bestMatch.label !== 'unknown');
        }
      } else {
        setIsFaceDetected(false);
        setIsFaceMatched(false);
      }
    }, 300);
  };

  const handleAbsensi = async (tipe: 'MASUK' | 'PULANG') => {
    if (!isFaceMatched) return;
    setIsVerifying(true);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (videoRef.current && canvas) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        const captured = canvas.toDataURL('image/jpeg', 0.6);
        
        const record: AbsensiRecord = {
          id: Date.now().toString(),
          nip: currentPegawai?.nip || '',
          nama: currentPegawai?.nama || '',
          waktu: new Date().toLocaleTimeString('id-ID'),
          tipe,
          status: 'VERIFIED',
          lokasi: 'DJKI Smart Office',
          fotoAbsen: captured,
          confidence: detectionScore
        };

        const existing = JSON.parse(localStorage.getItem('absensi_history_db') || '[]');
        localStorage.setItem('absensi_history_db', JSON.stringify([record, ...existing]));
        setAbsensiHistory(prev => [record, ...prev]);
        setVerificationResult({ status: 'SUCCESS', message: `Absensi ${tipe} Berhasil!` });
      }
      setIsVerifying(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 md:space-y-10 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl md:text-4xl font-black text-gray-950 uppercase tracking-tighter leading-none">Presensi Wajah</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-3">Smart Office Biometric Authentication</p>
        </div>
        {errorMessage && (
           <div className="bg-rose-50 px-6 py-3 rounded-2xl text-rose-600 text-[10px] font-black uppercase border border-rose-100 flex items-center gap-3 animate-bounce">
              <i className="bi bi-exclamation-octagon-fill text-lg"></i> {errorMessage}
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* CAMERA SECTION */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-[#111827] rounded-[3rem] md:rounded-[4rem] overflow-hidden relative aspect-square md:aspect-video shadow-2xl border-4 md:border-[12px] border-white ring-1 ring-gray-100 group">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full hidden" />
            <canvas ref={canvasRef} className="hidden" />

            {/* SCANNING OVERLAY */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
               <div className={`w-[70%] h-[70%] md:w-[50%] md:h-[80%] border-2 rounded-[4rem] transition-all duration-700 ${isFaceMatched ? 'border-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.5)] scale-105' : isFaceDetected ? 'border-blue-500 animate-pulse' : 'border-white/20'}`}></div>
               <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/40 animate-scan"></div>
               
               {!isFaceDetected && (
                 <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full mt-10 text-white text-[10px] font-black uppercase tracking-widest">
                    <i className="bi bi-person-bounding-box mr-3"></i> Posisikan Wajah Anda
                 </div>
               )}
            </div>

            {isVerifying && (
               <div className="absolute inset-0 bg-blue-950/90 backdrop-blur-lg flex flex-col items-center justify-center text-white p-6 z-20">
                  <div className="h-16 w-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6"></div>
                  <h4 className="text-xl font-black uppercase tracking-widest">Verifying Identity</h4>
                  <p className="text-[10px] font-bold text-blue-300 uppercase mt-2">Checking Biometric Patterns...</p>
               </div>
            )}

            {verificationResult && (
               <div className={`absolute bottom-10 left-10 right-10 p-6 rounded-3xl shadow-2xl flex items-center gap-6 animate-modalEnter z-30 ${verificationResult.status==='SUCCESS'?'bg-emerald-600':'bg-rose-600'} text-white`}>
                  <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                     <i className={`bi ${verificationResult.status==='SUCCESS'?'bi-patch-check-fill':'bi-exclamation-triangle-fill'} text-3xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[11px] font-black uppercase tracking-widest">{verificationResult.status}</h5>
                    <p className="text-sm font-bold mt-1">{verificationResult.message}</p>
                  </div>
                  <button onClick={() => setVerificationResult(null)} className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all"><i className="bi bi-x-lg"></i></button>
               </div>
            )}
          </div>

          {/* ACTION BAR */}
          <div className="bg-white p-6 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
               <div className="h-16 w-16 md:h-20 md:w-20 rounded-[2rem] bg-gray-100 border-4 border-white ring-1 ring-gray-100 overflow-hidden shadow-xl flex-shrink-0">
                  {currentPegawai?.foto ? <img src={currentPegawai.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center bg-blue-50 text-blue-600 font-black text-2xl">?</div>}
               </div>
               <div className="min-w-0">
                  <h4 className="text-sm md:text-lg font-black text-gray-950 uppercase truncate leading-tight">{currentPegawai?.nama || user?.name}</h4>
                  <div className={`mt-2 flex items-center gap-3 px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all ${isFaceMatched ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    <span className={`h-2 w-2 rounded-full ${isFaceMatched ? 'bg-emerald-600 animate-pulse' : 'bg-gray-300'}`}></span>
                    {isFaceMatched ? `Wajah Terverifikasi (${(detectionScore * 100).toFixed(0)}%)` : 'Scanning...'}
                  </div>
               </div>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
               <button onClick={() => handleAbsensi('MASUK')} disabled={!isFaceMatched || isVerifying} className={`flex-1 md:flex-none h-16 px-12 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${isFaceMatched ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Presensi Masuk</button>
               <button onClick={() => handleAbsensi('PULANG')} disabled={!isFaceMatched || isVerifying} className={`flex-1 md:flex-none h-16 px-12 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${isFaceMatched ? 'bg-gray-900 text-white shadow-gray-900/30' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Presensi Pulang</button>
            </div>
          </div>
        </div>

        {/* LOGS SECTION */}
        <div className="xl:col-span-4 bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px] md:h-auto">
           <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center shrink-0">
              <div>
                <h5 className="text-[11px] font-black text-gray-950 uppercase tracking-widest">Daily Activity</h5>
                <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">Logs for Today</p>
              </div>
              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 uppercase">{absensiHistory.length} Log</span>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white">
              {absensiHistory.map(h => (
                <div key={h.id} className="p-5 bg-gray-50/50 border border-gray-100 rounded-[2rem] flex items-center gap-5 hover:bg-white transition-all shadow-sm group">
                   <div className="h-14 w-14 rounded-2xl bg-white border-2 border-white ring-1 ring-gray-100 overflow-hidden shadow-lg shrink-0 group-hover:scale-110 transition-transform"><img src={h.fotoAbsen} className="h-full w-full object-cover" /></div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${h.tipe==='MASUK'?'bg-emerald-600 text-white':'bg-amber-600 text-white'}`}>{h.tipe}</span><p className="text-[10px] font-black text-gray-950">{h.waktu}</p></div>
                      <div className="flex items-center justify-between"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Status Verified</p><p className="text-[9px] font-black text-blue-600">{(h.confidence * 100).toFixed(0)}% Match</p></div>
                   </div>
                </div>
              ))}
              {absensiHistory.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <i className="bi bi-camera-video text-6xl mb-6"></i>
                    <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">Belum ada aktivitas presensi<br/>yang tercatat hari ini</p>
                 </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default AbsensiOnlinePage;
