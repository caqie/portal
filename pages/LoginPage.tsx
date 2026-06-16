
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { fetchUsersFromSheets, fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, AdminUser } from '../types';
import { DEFAULT_LOGO } from '../constants';
import DatabaseConfigModal from '../components/DatabaseConfigModal';

const LoginPage = () => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const { login } = useAuth();
  
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);

  useEffect(() => {
    const savedName = localStorage.getItem('portal_system_name');
    if (savedName) setSystemName(savedName);
    
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setSystemLogo(savedLogo);
    else setSystemLogo(DEFAULT_LOGO);

    // Check for any latent connection warning or spreadsheet failure
    const lastErr = sessionStorage.getItem('last_spreadsheet_error');
    if (lastErr) {
      setConnError(lastErr);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Ambil data user untuk verifikasi password
      const users = await fetchUsersFromSheets();
      
      if (users.length === 0) {
        setError('Gagal mengambil data pengguna dari Google Sheet. Koneksi database terganggu atau spreadsheet kosong.');
        const lastErr = sessionStorage.getItem('last_spreadsheet_error') || 'Gagal koneksi ke Sheet USERS';
        setConnError(lastErr);
        setLoading(false);
        return;
      }

      let foundUser = users.find(u => u.nip === nip && u.password === password);

      if (foundUser) {
        if (foundUser.status === 'Nonaktif') {
          setError('Akun Anda dinonaktifkan. Silakan hubungi Superadmin.');
          setLoading(false);
          return;
        }
        // 2. KONEKSI KE SHEET PEGAWAI: Ambil detail profil lengkap berdasarkan NIP
        const pegawaiList = await fetchPegawaiFromSheets();
        const profileMatch = pegawaiList.find(p => p.nip === foundUser!.nip);
        
        if (profileMatch) {
          // Jika NIP ditemukan di database pegawai, gabungkan datanya
          // Ini memungkinkan nama di sidebar/header selalu sinkron dengan database HR
          foundUser = { 
            ...foundUser, 
            name: profileMatch.nama, // Gunakan nama resmi dari database pegawai
            foto: profileMatch.foto,
            // Anda bisa menambahkan field lain jika perlu di interface AdminUser
          };
        }
        
        login(foundUser);
      } else {
        setError('NIP atau Password salah. Silakan periksa kembali.');
      }
    } catch (err) {
      setError('Gagal menghubungkan ke server. Pastikan koneksi internet stabil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center bg-[#f4f7fa] p-4 sm:p-6 font-['Inter'] overflow-hidden relative">
      
      {/* WATERMARK LOGO PATTERN BACKGROUND */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none grayscale"
        style={{ 
          backgroundImage: `url(${systemLogo || DEFAULT_LOGO})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '100px',
          backgroundPosition: 'center'
        }}
      ></div>
      
      {/* DEKORASI GRADIENT BLUR */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full -ml-48 -mb-48 blur-[120px]"></div>
      
      <div className="w-full max-w-[440px] animate-fadeIn pb-10 sm:pb-0 relative z-10">
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 sm:p-10 border border-white/60 relative overflow-hidden backdrop-blur-md">
          
          {/* DATABASE CONFIG TRIGGER BUTTON */}
          <button 
            type="button"
            onClick={() => setIsDbConfigOpen(true)}
            className="absolute top-6 right-6 h-10 w-10 bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border border-gray-100/50 shadow-sm z-20 focus:outline-none"
            title="Pengaturan Koneksi Google Sheets"
          >
            <i className="bi bi-database-fill-gear text-lg"></i>
          </button>
          
          {/* AKSEN WATERMARK ATAS KARTU */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600">
             <div 
               className="w-full h-full opacity-20 grayscale brightness-200"
               style={{ 
                 backgroundImage: `url(${systemLogo || DEFAULT_LOGO})`,
                 backgroundRepeat: 'repeat',
                 backgroundSize: '40px'
               }}
             ></div>
          </div>

          <div className="text-center mb-6 sm:mb-10 relative">
            <div className="group relative inline-block">
              <div className="inline-flex items-center justify-center h-20 w-20 sm:h-28 sm:w-28 bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl mb-4 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl overflow-hidden p-2.5 sm:p-3 border border-gray-50 shimmer-effect relative z-10">
                {systemLogo ? (
                  <img src={systemLogo} className="h-full w-full object-contain relative z-10" alt="Logo" />
                ) : (
                  <i className="bi bi-shield-lock-fill text-2xl sm:text-4xl text-blue-600 relative z-10"></i>
                )}
              </div>
              <div className="absolute -inset-2 bg-blue-500/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>
            
            <h1 className="text-lg sm:text-2xl font-black text-gray-950 uppercase tracking-tight leading-none mt-2">
              {systemName.split(' ')[0]} <span className="text-blue-600">{systemName.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-[7px] sm:text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] mt-3">DJKI • KEMENKUM RI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-[8px] sm:text-[9px] font-black text-gray-700 uppercase tracking-widest block pl-2">Akses NIP Pegawai</label>
              <div className="relative group">
                <i className="bi bi-person absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"></i>
                <input 
                  type="text" 
                  required
                  inputMode="numeric"
                  placeholder="Masukkan 18 digit NIP"
                  className="w-full pl-11 pr-4 py-3 sm:py-4 bg-gray-50/50 border border-gray-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 text-[12px] sm:text-sm font-black text-gray-950 transition-all shadow-sm placeholder:text-gray-300 placeholder:font-normal"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[8px] sm:text-[9px] font-black text-gray-700 uppercase tracking-widest block pl-2">Kata Sandi</label>
              <div className="relative group">
                <i className="bi bi-key absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"></i>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 sm:py-4 bg-gray-50/50 border border-gray-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 text-[12px] sm:text-sm font-black text-gray-950 transition-all shadow-sm placeholder:text-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-lg`}></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 sm:p-4 rounded-xl flex items-center space-x-3 animate-fadeIn">
                <i className="bi bi-exclamation-triangle-fill shrink-0"></i>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight leading-tight">{error}</p>
              </div>
            )}

            {connError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 sm:p-4 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-start space-x-2.5">
                  <i className="bi bi-exclamation-triangle-fill text-amber-500 shrink-0 text-xs sm:text-sm mt-0.5 animate-pulse"></i>
                  <div className="space-y-1">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">Sambungan Spreadsheet Error</p>
                    <p className="text-[8px] sm:text-[9.5px] font-semibold leading-relaxed font-mono opacity-90 bg-white/40 p-1 rounded">"{connError}"</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDbConfigOpen(true)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow shadow-amber-600/20 active:scale-95"
                >
                  Atur ID Spreadsheet & Sync
                </button>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 sm:py-4.5 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-400 flex items-center justify-center space-x-3 mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>OTENTIKASI MASUK</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-100 text-center">
            <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">SISTEM INFORMASI SDM TERPADU<br/>KEMENTERIAN HUKUM RI</p>
          </div>
        </div>
        
        <div className="text-center mt-6 sm:mt-8 space-y-2 px-2">
            <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-relaxed">© 2025 DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL • KEMENKUM RI</p>
            <a href="https://caqiestudioproduction.com" target="_blank" rel="noopener noreferrer" className="block text-[7px] sm:text-[8px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-[0.1em] transition-colors">
                Powered by caqiestudioproduction.com
            </a>
        </div>
      </div>
      <DatabaseConfigModal isOpen={isDbConfigOpen} onClose={() => setIsDbConfigOpen(false)} />
    </div>
  );
};

export default LoginPage;
