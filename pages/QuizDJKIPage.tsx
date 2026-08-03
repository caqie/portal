import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';

// Types for QuizDJKI
export interface Question {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0: Red, 1: Blue, 2: Yellow, 3: Green
  timeLimit: number; // seconds
  explanation?: string;
}

export interface QuizDeck {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  badge: string;
  color: string;
  questions: Question[];
}

export interface PlayerScore {
  name: string;
  avatar: string;
  score: number;
  streak: number;
  lastPoints: number;
  isCorrect?: boolean;
}

// Preset Quiz Decks
const PRESET_DECKS: QuizDeck[] = [
  {
    id: 'sdm-kepegawaian',
    title: 'Kuis Kepegawaian & ASN DJKI',
    category: 'SDM & Regulasi',
    description: 'Uji pemahaman aturan kepegawaian, disiplin ASN, dan budaya kerja BerAKHLAK.',
    icon: 'bi-person-badge-fill',
    badge: 'Populer',
    color: 'from-purple-600 to-indigo-700',
    questions: [
      {
        id: 'q1',
        question: 'Apa singkatan dari BerAKHLAK sebagai Core Values ASN?',
        options: [
          'Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Adaptif, Kolaboratif',
          'Berprestasi, Aktif, Komitmen, Hasil, Loyal, Amanah, Kerja',
          'Berorientasi Hasil, Akurat, Handal, Loyal, Adaptif, Kinerja',
          'Berintegritas, Akuntabel, Kompeten, Humanis, Adaptif, Konsisten'
        ],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'Core Values BerAKHLAK diluncurkan oleh Presiden RI untuk menyeragamkan nilai-nilai dasar ASN.'
      },
      {
        id: 'q2',
        question: 'Berapa jam kerja efektif ASN per minggu sesuai regulasi standar?',
        options: [
          '35 Jam',
          '37,5 Jam',
          '40 Jam',
          '42,5 Jam'
        ],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Jam kerja efektif ASN Perpres 21/2023 adalah 37 jam 30 menit seminggu.'
      },
      {
        id: 'q3',
        question: 'Hari kerja reguler ASN DJKI dimulai pada jam masuk standar berapa?',
        options: [
          '07:00 WIB',
          '07:30 WIB',
          '08:00 WIB',
          '08:30 WIB'
        ],
        correctIndex: 1,
        timeLimit: 15,
        explanation: 'Jam masuk standar regular ASN DJKI adalah 07:30 WIB dengan opsi fleksibel hingga 08:30 WIB.'
      },
      {
        id: 'q4',
        question: 'Siapakah instansi pembina utama Jabatan Fungsional Pemeriksa Paten & Merek?',
        options: [
          'Kementerian PANRB',
          'Direktorat Jenderal Kekayaan Intelektual (DJKI)',
          'Badan Kepegawaian Negara (BKN)',
          'Lembaga Administrasi Negara (LAN)'
        ],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'DJKI Kementerian Hukum bertindak sebagai Instansi Pembina Jabatan Fungsional KI.'
      },
      {
        id: 'q5',
        question: 'Berapa tahun periodisasi Kenaikan Pangkat Reguler untuk ASN?',
        options: [
          '2 Tahun',
          '3 Tahun',
          '4 Tahun',
          '5 Tahun'
        ],
        correctIndex: 2,
        timeLimit: 15,
        explanation: 'Kenaikan Pangkat Reguler diberikan sekurang-kurangnya setelah 4 tahun dalam pangkat terakhir.'
      }
    ]
  },
  {
    id: 'hak-cipta-merek',
    title: 'Kuis Hak Cipta & Merek DJKI',
    category: 'Kekayaan Intelektual',
    description: 'Tantangan seputar Undang-Undang Hak Cipta No. 28/2014 & UU Merek No. 20/2016.',
    icon: 'bi-c-circle-fill',
    badge: 'Favorit',
    color: 'from-pink-600 to-rose-700',
    questions: [
      {
        id: 'hc1',
        question: 'Berapa lama jangka waktu perlindungan Hak Cipta untuk karya seni/musik selama pencipta hidup?',
        options: [
          'Selama hidup Pencipta + 50 Tahun setelah meninggal',
          'Selama hidup Pencipta + 70 Tahun setelah meninggal',
          '50 Tahun sejak pertama kali diumumkan',
          '20 Tahun sejak tanggal penerimaan'
        ],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Perlindungan Hak Cipta berlaku selama hidup Pencipta dan terus berlangsung hingga 70 tahun setelah Pencipta meninggal.'
      },
      {
        id: 'mr1',
        question: 'Berapa masa berlaku perlindungan sertifikat Merek terdaftar di Indonesia?',
        options: [
          '5 Tahun & tidak dapat diperpanjang',
          '10 Tahun & dapat diperpanjang',
          '20 Tahun & dapat diperpanjang',
          'Seumur hidup penerima Merek'
        ],
        correctIndex: 1,
        timeLimit: 15,
        explanation: 'Merek terdaftar mendapat perlindungan hukum untuk jangka waktu 10 tahun dan dapat diperpanjang.'
      },
      {
        id: 'hc2',
        question: 'Sistem pencatatan Hak Cipta di DJKI menerapkan asas apa?',
        options: [
          'First to File',
          'Deklaratif (First to Create)',
          'Konstitutif',
          'First to Commercialize'
        ],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Hak Cipta timbul secara otomatis (deklaratif) berdasarkan prinsip penciptaan.'
      },
      {
        id: 'mr2',
        question: 'Sistem pendaftaran Merek di Indonesia menggunakan sistem apa?',
        options: [
          'First to Use',
          'First to File',
          'Deklaratif Murni',
          'Sistem Lisensi Terbuka'
        ],
        correctIndex: 1,
        timeLimit: 15,
        explanation: 'Pendaftaran Merek di Indonesia menganut sistem First to File (yang mendaftar pertama yang dilindungi).'
      }
    ]
  },
  {
    id: 'paten-dtlst',
    title: 'Kuis Paten, Desain Industri & Rahasia Dagang',
    category: 'Teknologi & Inovasi',
    description: 'Soal seputar kriteria invensi, novelty, Paten Sederhana & Desain Industri.',
    icon: 'bi-lightbulb-fill',
    badge: 'Tantangan',
    color: 'from-amber-500 to-orange-600',
    questions: [
      {
        id: 'p1',
        question: 'Berapa masa berlaku perlindungan Paten Biasa?',
        options: [
          '10 Tahun',
          '15 Tahun',
          '20 Tahun',
          '25 Tahun'
        ],
        correctIndex: 2,
        timeLimit: 15,
        explanation: 'Paten Biasa diberikan untuk jangka waktu 20 tahun terhitung sejak Tanggal Penerimaan.'
      },
      {
        id: 'p2',
        question: 'Berapa masa berlaku perlindungan Paten Sederhana?',
        options: [
          '5 Tahun',
          '10 Tahun',
          '15 Tahun',
          '20 Tahun'
        ],
        correctIndex: 1,
        timeLimit: 15,
        explanation: 'Paten Sederhana diberikan untuk jangka waktu 10 tahun sejak Tanggal Penerimaan.'
      },
      {
        id: 'di1',
        question: 'Berapa lama masa perlindungan untuk Desain Industri?',
        options: [
          '10 Tahun',
          '20 Tahun',
          '50 Tahun',
          'Seumur Hidup'
        ],
        correctIndex: 0,
        timeLimit: 15,
        explanation: 'Desain Industri dilindungi selama 10 tahun terhitung sejak Tanggal Penerimaan.'
      }
    ]
  }
];

const AVATARS = ['🚀', '🦁', '⚡', '🎯', '💎', '🔥', '👑', '🦉', '🦊', '🦄', '🐲', '🏆'];

export const QuizDJKIPage: React.FC = () => {
  // Modes: 'menu' | 'host_lobby' | 'host_game' | 'player_join' | 'play' | 'podium' | 'creator'
  const [mode, setMode] = useState<'menu' | 'host_lobby' | 'host_game' | 'player_join' | 'play' | 'podium' | 'creator'>('menu');
  
  // Selected Deck & Custom Decks
  const [decks, setDecks] = useState<QuizDeck[]>(() => {
    const saved = localStorage.getItem('quizdjki_custom_decks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return [...PRESET_DECKS, ...parsed];
      } catch (e) {}
    }
    return PRESET_DECKS;
  });
  const [selectedDeck, setSelectedDeck] = useState<QuizDeck>(PRESET_DECKS[0]);

  // Game Config & State
  const [gamePin, setGamePin] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🚀');
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Auto-detect URL query parameter ?pin=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setGamePin(pinParam);
      setMode('player_join');
    }
  }, []);

  // Dynamic QR Code generation for host room
  useEffect(() => {
    if (gamePin && mode === 'host_lobby') {
      const roomUrl = `${window.location.origin}/quizdjki?pin=${gamePin}`;
      QRCode.toDataURL(roomUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e0642',
          light: '#ffffff'
        }
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Error generating QR Code:', err));
    }
  }, [gamePin, mode]);

  // Gameplay State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [lastGainedPoints, setLastGainedPoints] = useState<number>(0);
  const [showQuestionResult, setShowQuestionResult] = useState<boolean>(false);

  // Creator State
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState('DJKI Knowledge');
  const [customDescription, setCustomDescription] = useState('');
  const [customQuestions, setCustomQuestions] = useState<Question[]>([
    {
      id: 'q_custom_1',
      question: 'Contoh Soal: Apa warna logo utama DJKI?',
      options: ['Biru & Emas', 'Merah & Putih', 'Hijau & Kuning', 'Hitam & Perak'],
      correctIndex: 0,
      timeLimit: 20
    }
  ]);

  // Audio Context Synthesizer for sound effects
  const playSound = (type: 'correct' | 'wrong' | 'tick' | 'fanfare' | 'click') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'correct') {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc1.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc2.frequency.setValueAtTime(1046.50, now + 0.2); // C6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
      } else if (type === 'wrong') {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'tick') {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'click') {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'fanfare') {
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.25, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.5);
        });
      }
    } catch (e) {}
  };

  // Timer Effect for Question Play
  useEffect(() => {
    let timer: any = null;
    if ((mode === 'play' || mode === 'host_game') && !showQuestionResult) {
      if (timeLeft > 0) {
        timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 4 && prev > 1) playSound('tick');
            return prev - 1;
          });
        }, 1000);
      } else {
        // Time expired!
        handleTimeUp();
      }
    }
    return () => clearInterval(timer);
  }, [mode, timeLeft, showQuestionResult]);

  // Handle Generate Host Room
  const startHostLobby = (deck: QuizDeck) => {
    setSelectedDeck(deck);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    setGamePin(pin);
    // Initial bot players for fun lobby demo
    setPlayers([
      { name: 'Rani (Hak Cipta)', avatar: '🚀', score: 0, streak: 0, lastPoints: 0 },
      { name: 'Budi (Paten)', avatar: '⚡', score: 0, streak: 0, lastPoints: 0 },
      { name: 'Siti (Merek)', avatar: '💎', score: 0, streak: 0, lastPoints: 0 }
    ]);
    setMode('host_lobby');
    playSound('click');
  };

  // Add dummy bot player to host lobby
  const addBotPlayer = () => {
    const names = ['Ahmad (Anjab)', 'Dewi (Keuangan)', 'Rizal (TI)', 'Maya (Hukum)', 'Farhan (Sekretariat)', 'Lia (Edukasi)'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    if (!players.some(p => p.name === randomName)) {
      setPlayers(prev => [...prev, { name: randomName, avatar: randomAvatar, score: 0, streak: 0, lastPoints: 0 }]);
      playSound('click');
    }
  };

  // Start Live Game from Host Lobby
  const startHostGame = () => {
    setCurrentQuestionIndex(0);
    setTimeLeft(selectedDeck.questions[0].timeLimit || 20);
    setShowQuestionResult(false);
    setSelectedOption(null);
    setHasAnswered(false);
    setMode('host_game');
    playSound('click');
  };

  // Solo Start Game
  const startSoloGame = (deck: QuizDeck) => {
    setSelectedDeck(deck);
    setPlayerName(playerName || 'Pemain DJKI');
    setCurrentQuestionIndex(0);
    setTimeLeft(deck.questions[0].timeLimit || 20);
    setScore(0);
    setStreak(0);
    setLastGainedPoints(0);
    setSelectedOption(null);
    setHasAnswered(false);
    setShowQuestionResult(false);
    setMode('play');
    playSound('click');
  };

  // Player Answer Selection
  const handleAnswerSelect = (optionIndex: number) => {
    if (hasAnswered || showQuestionResult) return;
    setSelectedOption(optionIndex);
    setHasAnswered(true);

    const currentQ = selectedDeck.questions[currentQuestionIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    if (isCorrect) {
      playSound('correct');
      // Speed bonus points calculation (Max 1000 pts base)
      const speedMultiplier = timeLeft / currentQ.timeLimit;
      const basePoints = Math.round(500 + 500 * speedMultiplier);
      const newStreak = streak + 1;
      const streakBonus = Math.min(newStreak * 100, 500);
      const totalPoints = basePoints + streakBonus;

      setScore(prev => prev + totalPoints);
      setStreak(newStreak);
      setLastGainedPoints(totalPoints);
    } else {
      playSound('wrong');
      setStreak(0);
      setLastGainedPoints(0);
    }

    // Delay briefly then reveal results
    setTimeout(() => {
      setShowQuestionResult(true);
    }, 1200);
  };

  // Time Up Handler
  const handleTimeUp = () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setStreak(0);
    setLastGainedPoints(0);
    playSound('wrong');
    setShowQuestionResult(true);
  };

  // Next Question or Finish Game
  const nextQuestion = () => {
    playSound('click');
    if (currentQuestionIndex + 1 < selectedDeck.questions.length) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      setTimeLeft(selectedDeck.questions[nextIdx].timeLimit || 20);
      setSelectedOption(null);
      setHasAnswered(false);
      setShowQuestionResult(false);

      // Simulate bot updates if in Host Game mode
      if (mode === 'host_game') {
        setPlayers(prev => prev.map(p => {
          const isBotCorrect = Math.random() > 0.3;
          const gained = isBotCorrect ? Math.floor(600 + Math.random() * 400) : 0;
          return {
            ...p,
            score: p.score + gained,
            lastPoints: gained,
            streak: isBotCorrect ? p.streak + 1 : 0,
            isCorrect: isBotCorrect
          };
        }));
      }
    } else {
      // Game ended! Go to Podium
      playSound('fanfare');
      setMode('podium');
    }
  };

  // Create Custom Quiz Deck
  const handleSaveCustomQuiz = () => {
    if (!customTitle.trim()) {
      alert('Mohon isi judul kuis.');
      return;
    }
    const newDeck: QuizDeck = {
      id: `custom_${Date.now()}`,
      title: customTitle,
      category: customCategory,
      description: customDescription || 'Kuis kustom buatan Pegawai DJKI.',
      icon: 'bi-patch-question-fill',
      badge: 'Kustom',
      color: 'from-emerald-600 to-teal-700',
      questions: customQuestions
    };

    const saved = localStorage.getItem('quizdjki_custom_decks');
    let existingCustoms: QuizDeck[] = [];
    if (saved) {
      try { existingCustoms = JSON.parse(saved); } catch (e) {}
    }
    const updatedCustoms = [...existingCustoms, newDeck];
    localStorage.setItem('quizdjki_custom_decks', JSON.stringify(updatedCustoms));
    setDecks([...PRESET_DECKS, ...updatedCustoms]);
    alert('Kuis Kustom QuizDJKI berhasil disimpan!');
    setMode('menu');
  };

  return (
    <div className="min-h-screen bg-[#250850] text-white font-sans selection:bg-pink-500 selection:text-white flex flex-col relative overflow-hidden no-print">
      {/* Background Animated Blobs & Neon Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* TOP NAVBAR */}
      <header className="bg-[#1e0642]/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-10 w-10 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-pink-500/30 group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-300">
                QuizDJKI
              </h1>
              <p className="text-[9px] font-bold text-purple-300/70 tracking-widest uppercase">
                Interactive Learning & Trivia DJKI
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_self"
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white rounded-xl text-xs font-bold tracking-wider transition-all border border-white/10 flex items-center gap-1.5"
            title="Kembali ke Portal SDM DJKI"
          >
            <i className="bi bi-box-arrow-left"></i>
            <span className="hidden sm:inline">Portal SDM</span>
          </a>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              soundEnabled
                ? 'bg-purple-600/40 border-purple-400/50 text-purple-200'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}
            title="Toggle Sound Effects"
          >
            <i className={`bi ${soundEnabled ? 'bi-volume-up-fill text-emerald-400' : 'bi-volume-mute-fill'}`}></i>
            <span className="hidden sm:inline">{soundEnabled ? 'Audio ON' : 'Mute'}</span>
          </button>

          {mode !== 'menu' && (
            <button
              onClick={() => setMode('menu')}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold tracking-wider transition-all border border-white/10"
            >
              <i className="bi bi-house-door-fill mr-1"></i>
              Menu Utama
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center z-10">

        {/* 1. MENU HOME VIEW */}
        {mode === 'menu' && (
          <div className="space-y-8 animate-fadeIn">
            {/* HERO CARD */}
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-950/90 border-2 border-purple-500/30 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-6 backdrop-blur-xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 rounded-full text-pink-300 text-xs font-black tracking-widest uppercase mb-2">
                <span className="animate-pulse">🔥</span> Game Kuis Interaktif Pegawai DJKI
              </div>

              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Asah Wawasan KI & Kepegawaian dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-300">QuizDJKI!</span>
              </h2>

              <p className="text-purple-200/80 text-sm md:text-base max-w-2xl mx-auto font-medium">
                Sistem game edukasi interaktif ala Kahoot khusus untuk insan DJKI. Mainkan secara seru bersama rekan kerja atau uji kemampuan mandiri!
              </p>

              {/* ACTION MODES BUTTONS */}
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button
                  onClick={() => startHostLobby(decks[0])}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-base rounded-2xl shadow-xl shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-pink-400/30"
                >
                  <i className="bi bi-display-fill text-xl"></i>
                  <span>Host Game Baru (Ruang Kelas)</span>
                </button>

                <button
                  onClick={() => setMode('player_join')}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-emerald-400/30"
                >
                  <i className="bi bi-controller text-xl"></i>
                  <span>Gabung dengan PIN</span>
                </button>

                <button
                  onClick={() => setMode('creator')}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/20 transition-all flex items-center gap-2"
                >
                  <i className="bi bi-plus-circle-fill text-amber-400"></i>
                  <span>Buat Kuis Kustom</span>
                </button>
              </div>
            </div>

            {/* FEATURED DECKS SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">Pilih Dek Kuis DJKI</h3>
                  <p className="text-xs text-purple-300/70">Pilih topik kuis untuk langsung mulai latihan mandiri (Solo Mode) atau Host Game</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className="bg-[#1e0642]/90 border border-purple-500/30 hover:border-pink-500/60 rounded-3xl p-6 flex flex-col justify-between space-y-6 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 text-purple-300 text-[10px] font-black rounded-full uppercase tracking-wider">
                          {deck.category}
                        </span>
                        <span className="px-2.5 py-0.5 bg-pink-500/30 text-pink-300 text-[10px] font-extrabold rounded-full">
                          {deck.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${deck.color} flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                          <i className={`bi ${deck.icon}`}></i>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-base leading-snug group-hover:text-pink-300 transition-colors">
                            {deck.title}
                          </h4>
                          <span className="text-xs font-bold text-purple-300/70">{deck.questions.length} Pertanyaan</span>
                        </div>
                      </div>

                      <p className="text-xs text-purple-200/70 leading-relaxed">
                        {deck.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => startSoloGame(deck)}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <i className="bi bi-play-fill text-base"></i> Solo
                      </button>
                      <button
                        onClick={() => startHostLobby(deck)}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-black tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <i className="bi bi-broadcast text-base"></i> Host
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. HOST LOBBY VIEW (WAITING SCREEN WITH PIN) */}
        {mode === 'host_lobby' && (
          <div className="bg-[#1e0642]/90 border-2 border-purple-500/40 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-8 animate-fadeIn max-w-4xl mx-auto backdrop-blur-xl">
            <div className="space-y-2">
              <span className="px-4 py-1.5 bg-purple-500/20 text-purple-300 text-xs font-extrabold rounded-full tracking-widest uppercase border border-purple-400/30">
                RUANG HOST GAME QUIZDJKI
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white">{selectedDeck.title}</h2>
            </div>

            {/* PIN & QR CODE GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center max-w-2xl mx-auto">
              {/* BIG PIN BOX */}
              <div className="bg-gradient-to-br from-purple-900 to-indigo-950 border-4 border-pink-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                <p className="text-xs font-black text-pink-300 tracking-widest uppercase mb-1">GAME PIN RUANGAN</p>
                <div className="text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-white to-cyan-300 py-2">
                  {gamePin}
                </div>
                <p className="text-[11px] text-purple-300/80 mt-2 font-medium text-center">
                  Atau buka <span className="font-bold text-yellow-300">{window.location.origin}/quizdjki</span> dan ketik PIN di atas.
                </p>
              </div>

              {/* DYNAMIC QR CODE DISPLAY */}
              <div className="bg-white/10 border-2 border-purple-400/40 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-3 backdrop-blur-md">
                <p className="text-xs font-black text-emerald-300 tracking-widest uppercase flex items-center gap-1.5">
                  <i className="bi bi-qr-code-scan text-base"></i> SCAN QR CODE VIA HP
                </p>
                {qrCodeUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-emerald-400/80 hover:scale-105 transition-transform">
                    <img src={qrCodeUrl} alt="Game Room QR Code" className="w-36 h-36 md:w-40 md:h-40 rounded-lg" />
                  </div>
                ) : (
                  <div className="w-36 h-36 bg-purple-900/50 rounded-2xl flex items-center justify-center text-xs text-purple-300 animate-pulse">
                    Mengenerate QR Code...
                  </div>
                )}
                <p className="text-[10px] text-purple-200/70 font-medium">
                  Scan QR Code untuk langsung masuk ke menu input Nickname
                </p>
              </div>
            </div>

            {/* JOINED PLAYERS LOBBY */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between max-w-md mx-auto">
                <span className="text-xs font-bold text-purple-200">
                  <i className="bi bi-people-fill text-pink-400 mr-2"></i>
                  Pemain Bergabung ({players.length}):
                </span>
                <button
                  onClick={addBotPlayer}
                  className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-bold rounded-lg border border-purple-400/30 transition-all"
                >
                  + Tambah Bot Simulasi
                </button>
              </div>

              <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto min-h-[100px] items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                {players.length === 0 ? (
                  <p className="text-xs text-purple-300/50 italic">Menunggu pemain bergabung dengan PIN...</p>
                ) : (
                  players.map((p, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 rounded-2xl flex items-center gap-2 text-sm font-bold text-white shadow-md animate-bounce"
                    >
                      <span className="text-lg">{p.avatar}</span>
                      <span>{p.name}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* START BUTTON */}
            <div className="pt-4 flex justify-center gap-4">
              <button
                onClick={() => setMode('menu')}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/20 transition-all"
              >
                Batal
              </button>
              <button
                onClick={startHostGame}
                className="px-10 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black text-base rounded-2xl shadow-xl shadow-pink-500/30 transition-all hover:scale-105"
              >
                MULAI GAME SEKARANG 🚀
              </button>
            </div>
          </div>
        )}

        {/* 3. PLAYER JOIN WITH PIN VIEW */}
        {mode === 'player_join' && (
          <div className="bg-[#1e0642]/90 border-2 border-purple-500/40 rounded-3xl p-8 md:p-10 shadow-2xl text-center space-y-6 animate-fadeIn max-w-md mx-auto backdrop-blur-xl">
            <div className="h-16 w-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30">
              🎮
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Gabung Game QuizDJKI</h2>
              <p className="text-xs text-purple-300/70 mt-1">Masukkan Game PIN yang diberikan Host</p>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">GAME PIN (6 Digit)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={gamePin}
                  onChange={(e) => setGamePin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 842109"
                  className="w-full px-4 py-3 bg-black/30 border-2 border-purple-500/50 rounded-2xl text-center text-2xl font-black tracking-widest text-yellow-300 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">NAMA / NICKNAME PEGAWAI</label>
                <input
                  type="text"
                  maxLength={20}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Masukkan Nama Anda..."
                  className="w-full px-4 py-3 bg-black/30 border-2 border-purple-500/50 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">PILIH AVATAR EMOJI</label>
                <div className="flex flex-wrap gap-2 justify-center p-3 bg-black/20 rounded-2xl border border-white/5">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      onClick={() => setSelectedAvatar(av)}
                      className={`h-10 w-10 rounded-xl text-xl flex items-center justify-center transition-transform ${
                        selectedAvatar === av
                          ? 'bg-pink-500 scale-110 shadow-lg shadow-pink-500/50 border-2 border-white'
                          : 'bg-white/5 hover:bg-white/20'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!playerName.trim()) {
                  alert('Mohon isi nama Anda.');
                  return;
                }
                startSoloGame(decks[0]);
              }}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-500/30 transition-all hover:scale-102 active:scale-95"
            >
              MASUK KE GAME 🚀
            </button>
          </div>
        )}

        {/* 4. GAMEPLAY PLAYING VIEW (KAHOOT STYLE QUESTION SCREEN) */}
        {(mode === 'play' || mode === 'host_game') && (
          <div className="space-y-6 animate-fadeIn">
            {/* TOP STATUS HEADER */}
            <div className="flex items-center justify-between bg-[#1e0642]/80 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-pink-500/20 text-pink-300 font-extrabold text-xs rounded-full border border-pink-400/30">
                  Soal {currentQuestionIndex + 1} / {selectedDeck.questions.length}
                </span>
                <span className="text-xs font-bold text-purple-200/70 hidden sm:inline">{selectedDeck.title}</span>
              </div>

              {/* TIMER CIRCLE */}
              <div className="flex items-center gap-2">
                <div className={`h-12 w-12 rounded-full border-4 flex items-center justify-center font-black text-lg shadow-lg ${
                  timeLeft <= 5 ? 'border-red-500 text-red-400 bg-red-500/10 animate-ping' : 'border-pink-500 text-white bg-pink-500/20'
                }`}>
                  {timeLeft}
                </div>
              </div>

              {/* SCORE & STREAK */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">SKOR ANDA</p>
                  <p className="text-xl font-black text-yellow-300">{score.toLocaleString()}</p>
                </div>
                {streak > 1 && (
                  <div className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-xl text-xs font-black flex items-center gap-1 animate-bounce">
                    🔥 {streak}x
                  </div>
                )}
              </div>
            </div>

            {/* QUESTION DISPLAY CARD */}
            <div className="bg-gradient-to-br from-purple-900/90 to-indigo-950/90 border-2 border-purple-500/40 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <p className="text-xs font-bold text-purple-300/80 uppercase tracking-widest mb-3">PERTANYAAN</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-snug">
                {selectedDeck.questions[currentQuestionIndex].question}
              </h2>
            </div>

            {/* 4 KAHOOT COLOR TILES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option 1: RED TRIANGLE */}
              <button
                disabled={hasAnswered}
                onClick={() => handleAnswerSelect(0)}
                className={`p-6 rounded-2xl text-left font-bold text-white text-lg transition-all transform active:scale-95 flex items-center gap-4 shadow-xl border-2 ${
                  showQuestionResult
                    ? selectedDeck.questions[currentQuestionIndex].correctIndex === 0
                      ? 'bg-[#e21b3c] border-emerald-400 ring-4 ring-emerald-400/50 scale-102'
                      : 'bg-[#e21b3c]/40 border-transparent opacity-40'
                    : selectedOption === 0
                    ? 'bg-[#e21b3c] border-white ring-4 ring-white/50 scale-102'
                    : 'bg-[#e21b3c] hover:bg-[#c01330] border-transparent hover:scale-101'
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-black/20 flex items-center justify-center text-xl shrink-0 font-black">
                  ▲
                </div>
                <span className="flex-1">{selectedDeck.questions[currentQuestionIndex].options[0]}</span>
              </button>

              {/* Option 2: BLUE DIAMOND */}
              <button
                disabled={hasAnswered}
                onClick={() => handleAnswerSelect(1)}
                className={`p-6 rounded-2xl text-left font-bold text-white text-lg transition-all transform active:scale-95 flex items-center gap-4 shadow-xl border-2 ${
                  showQuestionResult
                    ? selectedDeck.questions[currentQuestionIndex].correctIndex === 1
                      ? 'bg-[#1368ce] border-emerald-400 ring-4 ring-emerald-400/50 scale-102'
                      : 'bg-[#1368ce]/40 border-transparent opacity-40'
                    : selectedOption === 1
                    ? 'bg-[#1368ce] border-white ring-4 ring-white/50 scale-102'
                    : 'bg-[#1368ce] hover:bg-[#0f54a8] border-transparent hover:scale-101'
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-black/20 flex items-center justify-center text-xl shrink-0 font-black">
                  ◆
                </div>
                <span className="flex-1">{selectedDeck.questions[currentQuestionIndex].options[1]}</span>
              </button>

              {/* Option 3: YELLOW CIRCLE */}
              <button
                disabled={hasAnswered}
                onClick={() => handleAnswerSelect(2)}
                className={`p-6 rounded-2xl text-left font-bold text-white text-lg transition-all transform active:scale-95 flex items-center gap-4 shadow-xl border-2 ${
                  showQuestionResult
                    ? selectedDeck.questions[currentQuestionIndex].correctIndex === 2
                      ? 'bg-[#ffa602] border-emerald-400 ring-4 ring-emerald-400/50 scale-102'
                      : 'bg-[#ffa602]/40 border-transparent opacity-40'
                    : selectedOption === 2
                    ? 'bg-[#ffa602] border-white ring-4 ring-white/50 scale-102'
                    : 'bg-[#ffa602] hover:bg-[#d98d00] border-transparent hover:scale-101'
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-black/20 flex items-center justify-center text-xl shrink-0 font-black">
                  ●
                </div>
                <span className="flex-1">{selectedDeck.questions[currentQuestionIndex].options[2]}</span>
              </button>

              {/* Option 4: GREEN SQUARE */}
              <button
                disabled={hasAnswered}
                onClick={() => handleAnswerSelect(3)}
                className={`p-6 rounded-2xl text-left font-bold text-white text-lg transition-all transform active:scale-95 flex items-center gap-4 shadow-xl border-2 ${
                  showQuestionResult
                    ? selectedDeck.questions[currentQuestionIndex].correctIndex === 3
                      ? 'bg-[#26890c] border-emerald-400 ring-4 ring-emerald-400/50 scale-102'
                      : 'bg-[#26890c]/40 border-transparent opacity-40'
                    : selectedOption === 3
                    ? 'bg-[#26890c] border-white ring-4 ring-white/50 scale-102'
                    : 'bg-[#26890c] hover:bg-[#1e6f09] border-transparent hover:scale-101'
                }`}
              >
                <div className="h-10 w-10 rounded-xl bg-black/20 flex items-center justify-center text-xl shrink-0 font-black">
                  ■
                </div>
                <span className="flex-1">{selectedDeck.questions[currentQuestionIndex].options[3]}</span>
              </button>
            </div>

            {/* INTERMEDIATE RESULT BANNER */}
            {showQuestionResult && (
              <div className="bg-[#1e0642] border-2 border-purple-500/50 p-6 rounded-3xl text-center space-y-4 animate-bounce">
                {selectedOption === selectedDeck.questions[currentQuestionIndex].correctIndex ? (
                  <div className="text-emerald-400 space-y-1">
                    <p className="text-2xl font-black">BENAR! 🎉 +{lastGainedPoints} Poin</p>
                    <p className="text-xs text-emerald-200">Kecepatan & Akurasi Sangat Baik!</p>
                  </div>
                ) : (
                  <div className="text-red-400 space-y-1">
                    <p className="text-2xl font-black">KURANG TEPAT! 😅</p>
                    <p className="text-xs text-red-200">
                      Jawaban Benar:{' '}
                      <span className="font-bold">
                        {selectedDeck.questions[currentQuestionIndex].options[selectedDeck.questions[currentQuestionIndex].correctIndex]}
                      </span>
                    </p>
                  </div>
                )}

                {selectedDeck.questions[currentQuestionIndex].explanation && (
                  <div className="p-3 bg-black/30 rounded-2xl text-xs text-purple-200 text-left border border-white/5">
                    <span className="font-bold text-amber-300">Penjelasan: </span>
                    {selectedDeck.questions[currentQuestionIndex].explanation}
                  </div>
                )}

                <button
                  onClick={nextQuestion}
                  className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm rounded-2xl shadow-xl hover:scale-105 transition-transform"
                >
                  PERTANYAAN SELANJUTNYA ➔
                </button>
              </div>
            )}
          </div>
        )}

        {/* 5. PODIUM & WINNER CELEBRATION */}
        {mode === 'podium' && (
          <div className="bg-[#1e0642]/90 border-2 border-purple-500/40 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-8 animate-fadeIn max-w-2xl mx-auto backdrop-blur-xl">
            <div className="space-y-2">
              <span className="px-4 py-1.5 bg-yellow-500/20 text-yellow-300 text-xs font-black rounded-full border border-yellow-400/30 uppercase tracking-widest">
                HASIL AKHIR QUIZDJKI 🏆
              </span>
              <h2 className="text-3xl font-black text-white">Selamat atas Pencapaian Anda!</h2>
            </div>

            {/* 3D PODIUM COLUMNS */}
            <div className="flex items-end justify-center gap-4 h-48 pt-6 border-b border-white/10 pb-4">
              {/* 2nd Place */}
              <div className="flex flex-col items-center space-y-2 w-28">
                <span className="text-2xl">🥈</span>
                <span className="text-xs font-bold text-purple-200 truncate max-w-full">Rani (Hak Cipta)</span>
                <div className="w-full bg-slate-400 h-24 rounded-t-2xl flex items-center justify-center font-black text-slate-900 text-lg shadow-lg">
                  2
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center space-y-2 w-32">
                <span className="text-3xl animate-bounce">👑</span>
                <span className="text-sm font-black text-yellow-300 truncate max-w-full">
                  {playerName || 'Pemain Utama DJKI'} {selectedAvatar}
                </span>
                <div className="w-full bg-gradient-to-t from-amber-500 to-yellow-300 h-36 rounded-t-2xl flex items-center justify-center font-black text-amber-950 text-2xl shadow-2xl border-t-4 border-yellow-200">
                  1
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center space-y-2 w-28">
                <span className="text-2xl">🥉</span>
                <span className="text-xs font-bold text-purple-200 truncate max-w-full">Budi (Paten)</span>
                <div className="w-full bg-amber-700 h-16 rounded-t-2xl flex items-center justify-center font-black text-amber-100 text-lg shadow-lg">
                  3
                </div>
              </div>
            </div>

            {/* SCORE STATS SUMMARY */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-black/30 rounded-2xl border border-white/10 text-left">
              <div>
                <p className="text-[10px] font-bold text-purple-300/70 uppercase">TOTAL SKOR AKHIR</p>
                <p className="text-2xl font-black text-yellow-300">{score.toLocaleString()} Pts</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-purple-300/70 uppercase">TOPIK KUIS</p>
                <p className="text-sm font-bold text-white truncate">{selectedDeck.title}</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setMode('menu')}
                className="px-8 py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-sm rounded-2xl shadow-xl hover:scale-105 transition-transform"
              >
                KEMBALI KE MENU KUIS 🏠
              </button>
            </div>
          </div>
        )}

        {/* 6. CUSTOM QUIZ CREATOR */}
        {mode === 'creator' && (
          <div className="bg-[#1e0642]/90 border-2 border-purple-500/40 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6 animate-fadeIn max-w-3xl mx-auto backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-black text-white">Buat Kuis Kustom DJKI</h2>
                <p className="text-xs text-purple-300/70">Tambahkan topik kuis baru untuk instansi Anda</p>
              </div>
              <button
                onClick={() => setMode('menu')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
              >
                Batal
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-purple-200 mb-1">JUDUL KUIS</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Contoh: Kuis Kode Etik & Tata Tertib DJKI"
                  className="w-full px-4 py-3 bg-black/30 border border-purple-500/50 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">KATEGORI</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Contoh: SDM / Keuangan / KI"
                    className="w-full px-4 py-3 bg-black/30 border border-purple-500/50 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">DESKRIPSI RINGKAS</label>
                  <input
                    type="text"
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Deskripsi singkat kuis..."
                    className="w-full px-4 py-3 bg-black/30 border border-purple-500/50 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* QUESTIONS LIST CREATOR */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Daftar Pertanyaan ({customQuestions.length})</h3>
                  <button
                    onClick={() => {
                      setCustomQuestions(prev => [
                        ...prev,
                        {
                          id: `q_custom_${Date.now()}`,
                          question: '',
                          options: ['', '', '', ''],
                          correctIndex: 0,
                          timeLimit: 20
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 bg-pink-500/30 text-pink-300 text-xs font-bold rounded-xl border border-pink-400/40 hover:bg-pink-500/50"
                  >
                    + Tambah Soal
                  </button>
                </div>

                {customQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-black/30 rounded-2xl border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-pink-400">Soal #{idx + 1}</span>
                      {customQuestions.length > 1 && (
                        <button
                          onClick={() => setCustomQuestions(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 text-xs hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomQuestions(prev => prev.map((item, i) => i === idx ? { ...item, question: val } : item));
                      }}
                      placeholder="Masukkan Teks Pertanyaan..."
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${q.id}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => {
                              setCustomQuestions(prev => prev.map((item, i) => i === idx ? { ...item, correctIndex: optIdx } : item));
                            }}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomQuestions(prev => prev.map((item, i) => {
                                if (i !== idx) return item;
                                const newOpts = [...item.options] as [string, string, string, string];
                                newOpts[optIdx] = val;
                                return { ...item, options: newOpts };
                              }));
                            }}
                            placeholder={`Opsi ${['A (Merah)', 'B (Biru)', 'C (Kuning)', 'D (Hijau)'][optIdx]}`}
                            className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveCustomQuiz}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-sm rounded-2xl shadow-xl hover:scale-102 transition-transform"
            >
              SIMPAN KUIS KUSTOM 💾
            </button>
          </div>
        )}

      </main>
    </div>
  );
};

export default QuizDJKIPage;
