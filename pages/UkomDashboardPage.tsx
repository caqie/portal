
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Clock, FileText, Play, LogOut, ShieldCheck, AlertTriangle, LogIn, Building } from 'lucide-react';
import { PesertaUkom } from '../types';

const UkomDashboardPage: React.FC = () => {
  const [peserta, setPeserta] = useState<PesertaUkom | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = sessionStorage.getItem('ukom_peserta');
    if (!saved) {
      navigate('/ukom/login');
      return;
    }
    try {
      setPeserta(JSON.parse(saved));
    } catch (e) {
      console.error("Error parsing peserta data:", e);
      navigate('/ukom/login');
    }
  }, [navigate]);

  const handleStart = () => {
    if (window.confirm('Apakah Anda yakin ingin memulai ujian sekarang? Waktu akan mulai berjalan.')) {
      navigate('/ukom/exam');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ukom_peserta');
    navigate('/ukom/login');
  };

  if (!peserta) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Dashboard Peserta</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sistem CAT Uji Kompetensi</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[3rem] shadow-xl shadow-blue-100/50 border border-blue-50 overflow-hidden"
        >
          <div className="p-10 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center gap-6">
                <div className="w-48 h-64 bg-gray-50 rounded-[2rem] overflow-hidden border-4 border-white shadow-xl shadow-blue-100 flex items-center justify-center text-gray-200">
                  {peserta.fotoUrl ? (
                    <img src={peserta.fotoUrl} alt={peserta.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-20 h-20" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Status Peserta</p>
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    peserta.statusUjian === 'Sudah' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {peserta.statusUjian === 'Sudah' ? 'Sudah Ujian' : 'Siap Ujian'}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">Data Diri Peserta</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama Lengkap</p>
                        <p className="text-sm font-black text-gray-900">{peserta.nama}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Nomor Peserta</p>
                        <p className="text-sm font-mono font-bold text-gray-900">{peserta.noPeserta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Unit Kerja</p>
                        <p className="text-sm font-black text-gray-900">{peserta.unitKerja || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Jabatan Fungsional</p>
                        <p className="text-sm font-black text-blue-600">{peserta.jabatanFungsional || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Jenjang Jabatan</p>
                        <p className="text-sm font-black text-blue-600">{peserta.jenjang || 'Umum'}</p>
                      </div>
                    </div>
                    {peserta.password && (
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                          <LogIn className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Password Login</p>
                          <p className="text-sm font-mono font-bold text-gray-900">{peserta.password}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Informasi Ujian</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Durasi Waktu</p>
                        <p className="text-sm font-black text-gray-900">90 Menit</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Jumlah Soal</p>
                        <p className="text-sm font-black text-gray-900">100 Butir</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 p-8 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-6 items-start">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest">Petunjuk Penting</h3>
                <ul className="text-[11px] text-amber-800/80 font-medium space-y-1 list-disc ml-4">
                  <li>Pastikan koneksi internet stabil selama ujian berlangsung.</li>
                  <li>Dilarang membuka tab lain atau keluar dari mode fullscreen.</li>
                  <li>Sistem akan otomatis mengirim jawaban jika waktu habis.</li>
                  <li>Klik tombol "Mulai Ujian" jika Anda sudah siap.</li>
                </ul>
              </div>
            </div>

            <div className="mt-12">
              <button 
                onClick={handleStart}
                disabled={peserta.statusUjian === 'Sudah'}
                className={`w-full py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 ${
                  peserta.statusUjian === 'Sudah' 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                    : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                <span>{peserta.statusUjian === 'Sudah' ? 'Ujian Telah Selesai' : 'Mulai Ujian Sekarang'}</span>
                <Play className={`w-5 h-5 fill-current ${peserta.statusUjian === 'Sudah' ? 'opacity-20' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">DJKI CAT SYSTEM &copy; 2026</p>
        </div>
      </div>
    </div>
  );
};

export default UkomDashboardPage;
