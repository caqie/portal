
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, User, Calendar, AlertCircle, ShieldCheck, Users, ArrowLeft } from 'lucide-react';
import { fetchPesertaUkomFromSheets, fetchUsersFromSheets } from '../spreadsheetService';
import { PesertaUkom, AdminUser } from '../types';
import { useAuth } from '../AuthContext';

const UkomLoginPage: React.FC = () => {
  const [loginMode, setLoginMode] = useState<'PESERTA' | 'PENGAWAS'>('PESERTA');
  const [noPeserta, setNoPeserta] = useState('');
  const [password, setPassword] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (loginMode === 'PESERTA') {
        const pesertaList = await fetchPesertaUkomFromSheets();
        const peserta = pesertaList.find((p: PesertaUkom) => 
          p.noPeserta === noPeserta && 
          (p.password ? p.password === password : p.tanggalLahir === password)
        );

        if (peserta) {
          if (peserta.isLocked) {
            setIsLocked(true);
            if (!unlockPassword) {
              setError('Akun Anda terkunci karena pelanggaran keamanan. Silakan masukkan Password Buka Kunci dari Admin.');
              setLoading(false);
              return;
            }
            if (peserta.unlockPassword !== unlockPassword) {
              setError('Password Buka Kunci tidak valid.');
              setLoading(false);
              return;
            }
          }

          if (peserta.statusUjian === 'Sudah') {
            setError('Anda sudah mengikuti ujian ini.');
          } else {
            sessionStorage.setItem('ukom_peserta', JSON.stringify(peserta));
            navigate('/ukom/dashboard');
          }
        } else {
          setError('Nomor Peserta atau Password tidak valid.');
        }
      } else {
        // Supervisor Login
        const users = await fetchUsersFromSheets();
        const user = users.find((u: AdminUser) => u.nip === noPeserta && u.password === password);
        
        if (user) {
          login(user);
          navigate('/ukom/admin'); // Redirect to admin/session list first
        } else {
          setError('NIP atau Password Pengawas tidak valid.');
        }
      }
    } catch (err) {
      setError('Gagal menghubungkan ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-blue-50 overflow-hidden"
      >
        <div className="bg-blue-600 p-10 text-center text-white relative overflow-hidden">
          {/* Tombol Kembali hanya muncul jika user adalah Admin/Editor yang sudah login di sistem utama */}
          {isAuthenticated && (
            <button 
              onClick={handleBackToMain}
              className="absolute top-6 left-6 h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center hover:bg-white/30 transition-all z-20"
              title="Kembali ke Portal Utama"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_0%,transparent_70%)]"></div>
          </div>
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl mb-6"
          >
            {loginMode === 'PESERTA' ? <LogIn className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
          </motion.div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">CAT SYSTEM</h1>
          <p className="text-blue-100 text-xs font-medium uppercase tracking-widest opacity-80">
            {loginMode === 'PESERTA' ? 'Uji Kompetensi Pegawai' : 'Panel Pengawas & Admin'}
          </p>
        </div>

        <div className="px-10 pt-8">
          <div className="flex bg-gray-50 p-1.5 rounded-2xl">
            <button 
              onClick={() => { setLoginMode('PESERTA'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMode === 'PESERTA' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Peserta
            </button>
            <button 
              onClick={() => { setLoginMode('PENGAWAS'); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loginMode === 'PENGAWAS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Pengawas
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                {loginMode === 'PESERTA' ? 'Nomor Peserta / NIP' : 'NIP Pengawas'}
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="text" 
                  value={noPeserta}
                  onChange={e => setNoPeserta(e.target.value)}
                  placeholder={loginMode === 'PESERTA' ? "Contoh: 19880101..." : "Masukkan NIP Anda"}
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan Password"
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  required
                />
              </div>
              {loginMode === 'PESERTA' && (
                <p className="text-[9px] text-gray-400 italic ml-4">Gunakan Password yang diberikan atau Tanggal Lahir (YYYY-MM-DD)</p>
              )}
            </div>

            {isLocked && loginMode === 'PESERTA' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-4">Password Buka Kunci (Admin)</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                  <input 
                    type="password" 
                    value={unlockPassword}
                    onChange={e => setUnlockPassword(e.target.value)}
                    placeholder="Masukkan Password Buka Kunci"
                    className="w-full pl-14 pr-6 py-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white transition-all"
                    required
                  />
                </div>
              </motion.div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="p-8 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DJKI CAT SYSTEM &copy; 2026</p>
        </div>
      </motion.div>
    </div>
  );
};

export default UkomLoginPage;
