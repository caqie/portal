
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertCircle, 
  Maximize, 
  CheckCircle2,
  HelpCircle,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { BankSoal, PesertaUkom, HasilUkom } from '../types';
import { fetchBankSoalFromSheets, saveHasilUkom, savePesertaUkom } from '../spreadsheetService';

interface AnswerState {
  [soalId: string]: {
    jawaban: string;
    isRagu: boolean;
    options: { key: string; text: string }[]; // Randomized options
  };
}

const UkomExamPage: React.FC = () => {
  const [peserta, setPeserta] = useState<PesertaUkom | null>(null);
  const [questions, setQuestions] = useState<BankSoal[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes in seconds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  const navigate = useNavigate();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [sessionId] = useState(sessionStorage.getItem('ukom_session_id') || 'SESSION-' + Date.now());
  const [logs, setLogs] = useState<{message: string, time: string}[]>([]);

  const addLog = useCallback((message: string) => {
    const log = { message, time: new Date().toLocaleTimeString() };
    setLogs(prev => [...prev.slice(-9), log]);
  }, []);

  // Initialize Exam
  useEffect(() => {
    const savedPeserta = sessionStorage.getItem('ukom_peserta');
    if (!savedPeserta) {
      navigate('/ukom/login');
      return;
    }
    const p = JSON.parse(savedPeserta);
    setPeserta(p);

    const initExam = async () => {
      try {
        const allQuestions = await fetchBankSoalFromSheets();
        
        // Filter by tipeSoal, jenjang and jabatan fungsional
        const filteredQuestions = allQuestions.filter(q => {
          if (q.tipeSoal === 'Umum') return true;
          
          // For Khusus, must match both jabatan and jenjang
          const matchJabatan = q.jabatanFungsional === p.jabatanFungsional;
          const matchJenjang = q.jenjang === p.jenjang;
          return matchJabatan && matchJenjang;
        });

        // Randomize questions
        const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
        
        // Load saved state if exists
        try {
          const savedAnswers = localStorage.getItem(`ukom_answers_${p.noPeserta}`);
          const savedTime = localStorage.getItem(`ukom_time_${p.noPeserta}`);
          const savedQuestions = localStorage.getItem(`ukom_questions_${p.noPeserta}`);

          if (savedQuestions) {
            setQuestions(JSON.parse(savedQuestions));
          } else {
            setQuestions(shuffled);
            localStorage.setItem(`ukom_questions_${p.noPeserta}`, JSON.stringify(shuffled));
          }

          if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers));
          } else {
            // Initialize randomized options for each question
            const initialAnswers: AnswerState = {};
            const targetQuestions = savedQuestions ? JSON.parse(savedQuestions) : shuffled;
            targetQuestions.forEach((q: BankSoal) => {
              const options = [
                { key: 'A', text: q.pilihanA },
                { key: 'B', text: q.pilihanB },
                { key: 'C', text: q.pilihanC },
                { key: 'D', text: q.pilihanD },
                { key: 'E', text: q.pilihanE },
              ].sort(() => Math.random() - 0.5);
              initialAnswers[q.id] = { jawaban: '', isRagu: false, options };
            });
            setAnswers(initialAnswers);
            localStorage.setItem(`ukom_answers_${p.noPeserta}`, JSON.stringify(initialAnswers));
          }

          if (savedTime) {
            setTimeLeft(parseInt(savedTime));
          }
        } catch (e) {
          console.error("Failed to load saved state:", e);
          // Fallback to fresh state
          setQuestions(shuffled);
          const initialAnswers: AnswerState = {};
          shuffled.forEach(q => {
            const options = [
              { key: 'A', text: q.pilihanA },
              { key: 'B', text: q.pilihanB },
              { key: 'C', text: q.pilihanC },
              { key: 'D', text: q.pilihanD },
              { key: 'E', text: q.pilihanE },
            ].sort(() => Math.random() - 0.5);
            initialAnswers[q.id] = { jawaban: '', isRagu: false, options };
          });
          setAnswers(initialAnswers);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        alert('Gagal memuat soal. Silakan refresh halaman.');
      }
    };

    initExam();
  }, [navigate]);

  // WebSocket & Camera Integration
  useEffect(() => {
    if (loading || !peserta) return;

    // Setup Camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        addLog("Akses Kamera Ditolak");
      }
    };
    startCamera();

    // Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      addLog("Terhubung ke Server Pengawas");
      socket.send(JSON.stringify({
        type: 'join',
        sessionId,
        role: 'participant',
        nip: peserta.noPeserta,
        name: peserta.nama
      }));
    };

    // Frame Capture Interval
    const frameInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current && socket.readyState === WebSocket.OPEN) {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = canvas.toDataURL('image/jpeg', 0.5);
          socket.send(JSON.stringify({
            type: 'camera_frame',
            sessionId,
            nip: peserta.noPeserta,
            name: peserta.nama,
            payload: frame
          }));
        }
      }
    }, 5000); // Send frame every 5 seconds

    // Status Update Interval
    const statusInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        const progress = Math.round((Object.values(answers).filter(a => a.jawaban !== '').length / questions.length) * 100) || 0;
        socket.send(JSON.stringify({
          type: 'exam_status',
          sessionId,
          nip: peserta.noPeserta,
          name: peserta.nama,
          payload: {
            progress,
            warnings: warningCount,
            timeLeft: formatTime(timeLeft),
            logs: logs
          }
        }));
      }
    }, 10000); // Send status every 10 seconds

    return () => {
      clearInterval(frameInterval);
      clearInterval(statusInterval);
      socket.close();
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [loading, peserta, sessionId, questions.length, answers, warningCount, timeLeft, logs, addLog]);

  // Timer Logic
  useEffect(() => {
    if (loading || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit();
          return 0;
        }
        const next = prev - 1;
        if (peserta) localStorage.setItem(`ukom_time_${peserta.noPeserta}`, next.toString());
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, submitting, peserta]);

  // Security: Fullscreen & Tab Switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            handleSubmit();
          } else {
            setShowWarning(true);
          }
          return next;
        });
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const preventActions = (e: any) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', preventActions);
    document.addEventListener('copy', preventActions);
    document.addEventListener('paste', preventActions);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', preventActions);
      document.removeEventListener('copy', preventActions);
      document.removeEventListener('paste', preventActions);
    };
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen().catch(err => {
      console.error(`Error attempting to enable full-screen mode: ${err.message}`);
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Calculate Scores
      let twk = 0, tiu = 0, tkp = 0;

      const essayResults: { soalId: string; pertanyaan: string; jawaban: string; bobotMax: number }[] = [];
      
      questions.forEach(q => {
        const ans = answers[q.id];
        if (!ans || !ans.jawaban) return;

        if (q.tipeJawaban === 'ESAI') {
          essayResults.push({
            soalId: q.id,
            pertanyaan: q.pertanyaan,
            jawaban: ans.jawaban,
            bobotMax: parseFloat(q.bobotNilai) || 0
          });
          return;
        }

        if (q.kategori === 'TKP') {
          // TKP: All answers have values
          try {
            const weights = JSON.parse(q.bobotNilai);
            tkp += weights[ans.jawaban] || 0;
          } catch (e) {
            // Fallback if not JSON
            tkp += 0;
          }
        } else {
          // TWK & TIU: Correct = Weight, Wrong = 0
          if (ans.jawaban === q.jawabanBenar) {
            const weight = parseFloat(q.bobotNilai) || 5;
            if (q.kategori === 'TWK') twk += weight;
            if (q.kategori === 'TIU') tiu += weight;
          }
        }
      });

      const total = twk + tiu + tkp;
      const now = new Date();
      
      const result: HasilUkom = {
        noPeserta: peserta!.noPeserta,
        nama: peserta!.nama,
        jenjang: peserta!.jenjang,
        nilaiTwk: twk,
        nilaiTiu: tiu,
        nilaiTkp: tkp,
        totalNilai: total,
        tanggalUjian: now.toISOString().split('T')[0],
        waktuSelesai: now.toLocaleTimeString(),
        essayAnswers: essayResults
      };

      await saveHasilUkom(result);
      await savePesertaUkom({ ...peserta!, statusUjian: 'Sudah' });

      // Cleanup
      localStorage.removeItem(`ukom_answers_${peserta!.noPeserta}`);
      localStorage.removeItem(`ukom_time_${peserta!.noPeserta}`);
      localStorage.removeItem(`ukom_questions_${peserta!.noPeserta}`);
      sessionStorage.removeItem('ukom_peserta');

      alert(`Ujian Selesai!\nTotal Nilai: ${total}\nTWK: ${twk}, TIU: ${tiu}, TKP: ${tkp}`);
      navigate('/ukom/login');
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim hasil. Sistem akan mencoba lagi.');
      setSubmitting(false);
    }
  };

  const handleSelectAnswer = (soalId: string, val: string) => {
    const newAnswers = {
      ...answers,
      [soalId]: { ...answers[soalId], jawaban: val }
    };
    setAnswers(newAnswers);
    localStorage.setItem(`ukom_answers_${peserta!.noPeserta}`, JSON.stringify(newAnswers));
  };

  const toggleRagu = (soalId: string) => {
    const newAnswers = {
      ...answers,
      [soalId]: { ...answers[soalId], isRagu: !answers[soalId].isRagu }
    };
    setAnswers(newAnswers);
    localStorage.setItem(`ukom_answers_${peserta!.noPeserta}`, JSON.stringify(newAnswers));
  };

  const clearAnswer = (soalId: string) => {
    const newAnswers = {
      ...answers,
      [soalId]: { ...answers[soalId], jawaban: '', isRagu: false }
    };
    setAnswers(newAnswers);
    localStorage.setItem(`ukom_answers_${peserta!.noPeserta}`, JSON.stringify(newAnswers));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Menyiapkan Lembar Ujian...</p>
    </div>
  );
  
  if (questions.length === 0) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-10 text-center">
      <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-inner">
        <AlertCircle className="w-10 h-10" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Bank Soal Kosong</h2>
        <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto">
          Belum ada soal yang tersedia untuk jenjang jabatan Anda ({peserta?.jenjang || 'Umum'}). Silakan hubungi admin.
        </p>
      </div>
      <button 
        onClick={() => navigate('/ukom/dashboard')}
        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100"
      >
        Kembali ke Dashboard
      </button>
    </div>
  );

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans select-none">
      {/* Hidden Camera Capture */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />
      
      {/* Header */}
      <header className="h-20 bg-blue-600 text-white flex items-center justify-between px-8 shrink-0 shadow-lg relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tighter">CAT SYSTEM DJKI</h1>
            <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest opacity-80">{peserta?.nama} | {peserta?.noPeserta}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/10">
            <Clock className="w-4 h-4 text-blue-200" />
            <span className="text-lg font-mono font-black tracking-widest">{formatTime(timeLeft)}</span>
          </div>
          {!isFullscreen && (
            <button 
              onClick={enterFullscreen}
              className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest animate-pulse"
            >
              Wajib Fullscreen
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 md:p-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Question Card */}
            <motion.div 
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-white overflow-hidden"
            >
              <div className="p-10 md:p-12 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">{currentIndex + 1}</span>
                    <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-full text-[9px] font-black uppercase tracking-widest">{currentQuestion.kategori}</span>
                  </div>
                  {currentAnswer.isRagu && (
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100">
                      <HelpCircle className="w-3 h-3" />
                      <span>Ragu-Ragu</span>
                    </div>
                  )}
                </div>

                <div className="text-lg font-bold text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.pertanyaan}
                </div>

                {currentQuestion.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                    <img 
                      src={currentQuestion.imageUrl} 
                      alt="Visual Soal" 
                      className="max-w-full h-auto mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {currentQuestion.tipeJawaban === 'ESAI' ? (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Ketik Jawaban Anda:</label>
                    <textarea 
                      value={currentAnswer.jawaban}
                      onChange={e => handleSelectAnswer(currentQuestion.id, e.target.value)}
                      className="w-full p-8 bg-gray-50 border-2 border-gray-100 rounded-[2rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-600 transition-all min-h-[200px]"
                      placeholder="Tuliskan jawaban lengkap Anda di sini..."
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentAnswer.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(currentQuestion.id, opt.key)}
                        className={`w-full p-6 text-left rounded-2xl border-2 transition-all flex items-start gap-5 group ${
                          currentAnswer.jawaban === opt.key 
                            ? 'bg-blue-50 border-blue-600 shadow-lg shadow-blue-100' 
                            : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                          currentAnswer.jawaban === opt.key 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-sm font-bold leading-relaxed ${currentAnswer.jawaban === opt.key ? 'text-blue-900' : 'text-gray-600'}`}>
                          {opt.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="px-10 py-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleRagu(currentQuestion.id)}
                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      currentAnswer.isRagu 
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' 
                        : 'bg-white border border-gray-200 text-gray-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100'
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Ragu-Ragu</span>
                  </button>
                  <button 
                    onClick={() => clearAnswer(currentQuestion.id)}
                    className="px-6 py-3 bg-white border border-gray-200 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Kosongkan</span>
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    className="p-4 bg-white border border-gray-200 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="px-8 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-3"
                  >
                    <span>Soal Berikutnya</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Sidebar Navigation */}
        <aside className="w-96 bg-white border-l border-gray-100 flex flex-col shrink-0 shadow-2xl relative z-0">
          <div className="p-8 border-bottom border-gray-50">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-3">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans && ans.jawaban !== '';
                const isRagu = ans && ans.isRagu;
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-12 rounded-xl text-xs font-black transition-all border-2 ${
                      isCurrent ? 'border-blue-600 scale-110 z-10 shadow-lg' : 'border-transparent'
                    } ${
                      isRagu 
                        ? 'bg-amber-500 text-white shadow-md shadow-amber-200' 
                        : isAnswered 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto p-8 space-y-4 bg-gray-50 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-[9px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                <span>Dijawab</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <div className="w-3 h-3 bg-amber-500 rounded-sm"></div>
                <span>Ragu-Ragu</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-3 h-3 bg-gray-200 rounded-sm"></div>
                <span>Belum</span>
              </div>
            </div>

            <button 
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin mengakhiri ujian? Pastikan semua soal telah diperiksa.')) {
                  handleSubmit();
                }
              }}
              className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
            >
              <Send className="w-4 h-4" />
              <span>Selesai Ujian</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Warnings & Modals */}
      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-md text-center space-y-8"
            >
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Peringatan Keamanan!</h2>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Anda terdeteksi meninggalkan halaman ujian. Dilarang membuka tab lain atau aplikasi lain selama ujian berlangsung.
                </p>
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Peringatan: {warningCount} / 3</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowWarning(false);
                  enterFullscreen();
                }}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200"
              >
                Saya Mengerti, Lanjutkan
              </button>
            </motion.div>
          </motion.div>
        )}

        {!isFullscreen && !showWarning && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-blue-600/95 backdrop-blur-md z-[90] flex items-center justify-center p-6"
          >
            <div className="text-center text-white space-y-10 max-w-lg">
              <div className="w-24 h-24 bg-white/20 rounded-[2rem] flex items-center justify-center mx-auto">
                <Maximize className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Mode Fullscreen Wajib</h2>
                <p className="text-blue-100 text-sm font-medium opacity-80">Untuk menjaga integritas ujian, sistem mewajibkan penggunaan mode layar penuh (fullscreen).</p>
              </div>
              <button 
                onClick={enterFullscreen}
                className="px-12 py-5 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-50 transition-all"
              >
                Aktifkan Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UkomExamPage;
