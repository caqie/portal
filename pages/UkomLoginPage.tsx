
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, User, Calendar, AlertCircle } from 'lucide-react';
import { fetchPesertaUkomFromSheets } from '../spreadsheetService';
import { PesertaUkom } from '../types';

const UkomLoginPage: React.FC = () => {
  const [noPeserta, setNoPeserta] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const pesertaList = await fetchPesertaUkomFromSheets();
      const peserta = pesertaList.find((p: PesertaUkom) => 
        p.noPeserta === noPeserta && 
        (p.password ? p.password === password : p.tanggalLahir === password)
      );

      if (peserta) {
        if (peserta.statusUjian === 'Sudah') {
          setError('Anda sudah mengikuti ujian ini.');
        } else {
          sessionStorage.setItem('ukom_peserta', JSON.stringify(peserta));
          navigate('/ukom/dashboard');
        }
      } else {
        setError('Nomor Peserta atau Password tidak valid.');
      }
    } catch (err) {
      setError('Gagal menghubungkan ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100 border border-blue-50 overflow-hidden"
      >
        <div className="bg-blue-600 p-10 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_0%,transparent_70%)]"></div>
          </div>
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl mb-6"
          >
            <LogIn className="w-10 h-10" />
          </motion.div>
          <h1 className="text-2xl font-black uppercase tracking-tighter mb-2">CAT SYSTEM</h1>
          <p className="text-blue-100 text-xs font-medium uppercase tracking-widest opacity-80">Uji Kompetensi Pegawai</p>
        </div>

        <form onSubmit={handleLogin} className="p-10 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nomor Peserta / NIP</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="text" 
                  value={noPeserta}
                  onChange={e => setNoPeserta(e.target.value)}
                  placeholder="Contoh: 19880101..."
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password / Tanggal Lahir</label>
              <div className="relative">
                <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan Password atau YYYY-MM-DD"
                  className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  required
                />
              </div>
              <p className="text-[9px] text-gray-400 italic ml-4">Gunakan Password yang diberikan atau Tanggal Lahir (YYYY-MM-DD)</p>
            </div>
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
