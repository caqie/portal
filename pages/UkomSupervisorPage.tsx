
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Monitor, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  LayoutGrid,
  List,
  Search,
  Eye,
  Edit3,
  Save,
  ChevronRight
} from 'lucide-react';
import { PesertaUkom, BankSoal, HasilUkom, UkomSession } from '../types';
import { fetchPesertaUkomFromSheets, fetchBankSoalFromSheets, saveHasilUkom, fetchHasilUkomFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';

interface ParticipantFeed {
  nip: string;
  name: string;
  frame: string;
  status: any;
  lastUpdate: number;
}

const UkomSupervisorPage: React.FC = () => {
  const { user, isSuperadmin } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'DEFAULT_SESSION';
  
  const [feeds, setFeeds] = useState<Record<string, ParticipantFeed>>({});
  const [pesertaList, setPesertaList] = useState<PesertaUkom[]>([]);
  const [selectedPeserta, setSelectedPeserta] = useState<PesertaUkom | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasilList, setHasilList] = useState<HasilUkom[]>([]);
  const [currentHasil, setCurrentHasil] = useState<HasilUkom | null>(null);
  const [gradingScores, setGradingScores] = useState<Record<string, number>>({});

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const [p, h] = await Promise.all([
          fetchPesertaUkomFromSheets(),
          fetchHasilUkomFromSheets()
        ]);
        setPesertaList(p);
        setHasilList(h);
        setLoading(false);
      } catch (e) {
        console.error(e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedPeserta) {
      const hasil = hasilList.find(h => h.noPeserta === selectedPeserta.noPeserta);
      setCurrentHasil(hasil || null);
      
      // Initialize grading scores from existing essay results
      if (hasil?.essayAnswers) {
        const scores: Record<string, number> = {};
        hasil.essayAnswers.forEach(ea => {
          if (ea.nilai !== undefined) scores[ea.soalId] = ea.nilai;
        });
        setGradingScores(scores);
      } else {
        setGradingScores({});
      }
    } else {
      setCurrentHasil(null);
      setGradingScores({});
    }
  }, [selectedPeserta, hasilList]);

  const handleSaveEssayScore = async (soalId: string) => {
    if (!currentHasil) return;

    const score = gradingScores[soalId] || 0;
    const updatedEssayAnswers = currentHasil.essayAnswers?.map(ea => 
      ea.soalId === soalId ? { ...ea, nilai: score } : ea
    );

    // Recalculate total value
    const essayTotal = updatedEssayAnswers?.reduce((acc, curr) => acc + (curr.nilai || 0), 0) || 0;
    const newTotal = currentHasil.nilaiTwk + currentHasil.nilaiTiu + currentHasil.nilaiTkp + essayTotal;

    const updatedHasil = {
      ...currentHasil,
      essayAnswers: updatedEssayAnswers,
      totalNilai: newTotal
    };

    try {
      await saveHasilUkom(updatedHasil);
      setHasilList(prev => prev.map(h => h.noPeserta === updatedHasil.noPeserta ? updatedHasil : h));
      setCurrentHasil(updatedHasil);
      alert('Nilai esai berhasil disimpan.');
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan nilai.');
    }
  };

  const handleFinishGrading = async () => {
    if (!currentHasil) return;
    
    // Check if all essays are graded
    const allGraded = currentHasil.essayAnswers?.every(ea => ea.nilai !== undefined);
    if (!allGraded) {
      if (!window.confirm('Beberapa soal esai belum dinilai. Tetap selesaikan penilaian?')) return;
    }

    alert('Penilaian untuk peserta ini telah diselesaikan.');
    setSelectedPeserta(null);
  };

  useEffect(() => {
    // Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
      console.log("Connected to monitoring server");
      ws.send(JSON.stringify({
        type: 'join',
        sessionId,
        role: 'supervisor',
        nip: user?.nip || 'ADMIN',
        name: user?.name || 'Supervisor'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'camera_frame') {
        setFeeds(prev => ({
          ...prev,
          [data.nip]: {
            ...prev[data.nip],
            nip: data.nip,
            name: data.name,
            frame: data.frame,
            lastUpdate: Date.now()
          }
        }));
      }

      if (data.type === 'exam_status') {
        setFeeds(prev => ({
          ...prev,
          [data.nip]: {
            ...prev[data.nip],
            status: data.status,
            lastUpdate: Date.now()
          }
        }));
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [sessionId, user]);

  const filteredPeserta = pesertaList.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.noPeserta.includes(searchQuery)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Monitoring Dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Header */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none">Dashboard Pengawas UKOM</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Sesi: {sessionId} | Real-time Monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Live Monitoring Active</span>
          </div>
          <div className="h-10 w-[1px] bg-gray-100"></div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-black text-gray-900 uppercase">{user?.name}</p>
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">Supervisor</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
               {user?.foto ? <img src={user.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-blue-600 font-black">?</div>}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Participant List */}
        <aside className="w-80 bg-white border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Cari Peserta..." 
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-bold uppercase outline-none focus:border-blue-600 transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Daftar Peserta</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black">{filteredPeserta.length}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-2 custom-scrollbar">
            {filteredPeserta.map(p => {
              const feed = feeds[p.noPeserta];
              const isOnline = feed && (Date.now() - feed.lastUpdate < 15000);
              
              return (
                <button 
                  key={p.noPeserta}
                  onClick={() => setSelectedPeserta(p)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${selectedPeserta?.noPeserta === p.noPeserta ? 'bg-blue-50 border-blue-600 shadow-md' : 'bg-white border-transparent hover:bg-gray-50'}`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
                      {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400" />}
                    </div>
                    {isOnline && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[10px] font-black text-gray-900 uppercase truncate">{p.nama}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase truncate">{p.noPeserta}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${selectedPeserta?.noPeserta === p.noPeserta ? 'text-blue-600' : 'text-gray-300'}`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content: Monitoring Grid */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-900'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid View
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-400 hover:text-gray-900'}`}
              >
                <List className="w-4 h-4" />
                List View
              </button>
            </div>

            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Online
               </div>
               <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  Offline
               </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredPeserta.map(p => {
                const feed = feeds[p.noPeserta];
                const isOnline = feed && (Date.now() - feed.lastUpdate < 15000);
                
                return (
                  <motion.div 
                    layout
                    key={p.noPeserta}
                    className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-blue-900/5 transition-all"
                  >
                    <div className="aspect-video bg-gray-950 relative overflow-hidden">
                      {isOnline && feed.frame ? (
                        <img src={feed.frame} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-3">
                          <Monitor className="w-10 h-10 opacity-20" />
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">No Signal</p>
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/10">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className="text-[8px] font-black text-white uppercase tracking-widest">{isOnline ? 'Live' : 'Offline'}</span>
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] font-black text-white uppercase truncate">{p.nama}</p>
                        <p className="text-[8px] font-bold text-white/60 uppercase truncate">{p.noPeserta}</p>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                        <span>Progress</span>
                        <span className="text-blue-600">{feed?.status?.progress || 0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all duration-500" 
                          style={{ width: `${feed?.status?.progress || 0}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase">Warnings: {feed?.status?.warnings || 0}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedPeserta(p)}
                          className="px-4 py-2 bg-gray-50 text-gray-900 rounded-xl text-[8px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                        >
                          Detail & Nilai
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
              <table className="min-w-[800px] w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Peserta</th>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Progress</th>
                    <th className="px-8 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest">Warnings</th>
                    <th className="px-8 py-5 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPeserta.map(p => {
                    const feed = feeds[p.noPeserta];
                    const isOnline = feed && (Date.now() - feed.lastUpdate < 15000);
                    
                    return (
                      <tr key={p.noPeserta} className="group hover:bg-blue-50/10 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                              {p.fotoUrl ? <img src={p.fotoUrl} className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-gray-400 m-auto mt-2.5" />}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-gray-900 uppercase">{p.nama}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">NIP. {p.noPeserta}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[8px] font-black uppercase ${isOnline ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            {isOnline ? 'Online' : 'Offline'}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600" style={{ width: `${feed?.status?.progress || 0}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-blue-600">{feed?.status?.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-[10px] font-black ${feed?.status?.warnings > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                            {feed?.status?.warnings || 0}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => setSelectedPeserta(p)}
                            className="h-10 w-10 bg-white border border-gray-200 rounded-xl text-gray-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm flex items-center justify-center transition-all m-auto mr-0"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* Detail & Grading Modal */}
      <AnimatePresence>
        {selectedPeserta && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" 
              onClick={() => setSelectedPeserta(null)}
            ></motion.div>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-5xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
            >
              {/* Modal Header */}
              <div className="p-8 border-b bg-gray-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-2xl border border-gray-100 p-1 shadow-xl overflow-hidden">
                    {selectedPeserta.fotoUrl ? <img src={selectedPeserta.fotoUrl} className="w-full h-full object-cover rounded-xl" /> : <Users className="w-8 h-8 text-gray-300 m-auto mt-3" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{selectedPeserta.nama}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">No. Peserta: {selectedPeserta.noPeserta} | {selectedPeserta.jenjang}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPeserta(null)}
                  className="h-12 w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all"
                >
                  <List className="w-6 h-6 rotate-45" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Live Feed & Status */}
                <div className="w-1/2 p-10 border-r border-gray-100 overflow-y-auto custom-scrollbar space-y-8">
                  <div className="aspect-video bg-gray-950 rounded-[2rem] overflow-hidden relative shadow-2xl border-4 border-white">
                    {feeds[selectedPeserta.noPeserta]?.frame ? (
                      <img src={feeds[selectedPeserta.noPeserta].frame} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-3">
                        <Monitor className="w-12 h-12 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">No Live Signal</p>
                      </div>
                    )}
                    <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                      <div className={`w-2 h-2 rounded-full ${feeds[selectedPeserta.noPeserta] ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                      <span className="text-[9px] font-black text-white uppercase tracking-widest">Live Feed</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Progress Ujian</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-blue-600 leading-none">{feeds[selectedPeserta.noPeserta]?.status?.progress || 0}</span>
                        <span className="text-sm font-black text-blue-400 pb-1">%</span>
                      </div>
                    </div>
                    <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                      <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Peringatan Keamanan</p>
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-rose-600 leading-none">{feeds[selectedPeserta.noPeserta]?.status?.warnings || 0}</span>
                        <span className="text-sm font-black text-rose-400 pb-1">KALI</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Log Aktivitas Terakhir</h4>
                    <div className="space-y-2">
                      {(feeds[selectedPeserta.noPeserta]?.status?.logs || []).slice(-5).reverse().map((log: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <p className="text-[10px] font-bold text-gray-600 uppercase flex-1">{log.message}</p>
                          <span className="text-[8px] font-black text-gray-400">{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Essay Grading */}
                <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar space-y-8 bg-gray-50/50">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Penilaian Soal Esai</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Berikan nilai pada jawaban esai peserta</p>
                  </div>

                  <div className="space-y-6">
                    {currentHasil?.essayAnswers && currentHasil.essayAnswers.length > 0 ? (
                      currentHasil.essayAnswers.map((ea, idx) => (
                        <div key={ea.soalId} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-widest">Soal Esai #{idx + 1}</span>
                              <span className="text-[10px] font-black text-blue-600 uppercase">Bobot Max: {ea.bobotMax}</span>
                            </div>
                            {ea.nilai !== undefined && (
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">Sudah Dinilai</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-800 leading-relaxed">{ea.pertanyaan}</p>
                          
                          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Jawaban Peserta:</p>
                            <p className="text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">{ea.jawaban || '(Tidak ada jawaban)'}</p>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Input Nilai (0 - {ea.bobotMax})</label>
                            <div className="flex gap-4">
                              <input 
                                type="number" 
                                max={ea.bobotMax}
                                min={0}
                                value={gradingScores[ea.soalId] ?? ''}
                                onChange={e => setGradingScores({ ...gradingScores, [ea.soalId]: parseFloat(e.target.value) })}
                                className="w-24 px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-lg font-black outline-none focus:border-blue-600 transition-all"
                                placeholder="0"
                              />
                              <button 
                                onClick={() => handleSaveEssayScore(ea.soalId)}
                                className="flex-1 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all"
                              >
                                <Save className="w-4 h-4" />
                                Simpan Nilai
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white p-12 rounded-[2rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-400 uppercase tracking-tighter">Tidak Ada Soal Esai</p>
                          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">Peserta ini tidak memiliki jawaban esai untuk dinilai</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-gray-50 border-t shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-4 text-amber-600 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-[9px] font-black uppercase leading-relaxed">Pastikan Anda telah meninjau seluruh jawaban <br/>sebelum memberikan penilaian akhir.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedPeserta(null)}
                    className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                    Tutup Detail
                  </button>
                  <button 
                    onClick={handleFinishGrading}
                    className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-3 hover:bg-black"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Selesaikan Penilaian
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default UkomSupervisorPage;
