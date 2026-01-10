
import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { fetchUsersFromSheets } from '../spreadsheetService';
import { Pegawai } from '../types';
import { DEFAULT_LOGO } from '../constants';

const LoginPage = () => {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  
  const [systemName, setSystemName] = useState('Portal SDM');
  const [systemLogo, setSystemLogo] = useState<string | null>(DEFAULT_LOGO);

  useEffect(() => {
    const savedName = localStorage.getItem('portal_system_name');
    if (savedName) setSystemName(savedName);
    
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setSystemLogo(savedLogo);
    else setSystemLogo(DEFAULT_LOGO);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const users = await fetchUsersFromSheets();
      let foundUser = users.find(u => u.nip === nip && u.password === password);

      if (foundUser) {
        const savedLocalPegawai = localStorage.getItem('portal_pegawai_db');
        if (savedLocalPegawai) {
          const pegawaiList: Pegawai[] = JSON.parse(savedLocalPegawai);
          const localMatch = pegawaiList.find(p => p.nip === foundUser!.nip);
          if (localMatch && localMatch.foto) {
            foundUser = { ...foundUser, foto: localMatch.foto };
          }
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
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-start sm:justify-center bg-[#F8F9FC] p-4 sm:p-6 font-['Inter'] overflow-y-auto">
      <div className="h-10 sm:hidden shrink-0"></div>
      
      <div className="w-full max-w-[440px] animate-fadeIn pb-20 sm:pb-0">
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-6 sm:p-10 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-600/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>

          <div className="text-center mb-6 sm:mb-10 relative">
            <div className="inline-flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 bg-white rounded-2xl sm:rounded-[2rem] shadow-xl mb-4 group transition-transform hover:scale-110 overflow-hidden p-3 border border-gray-50">
              {systemLogo ? (
                <img src={systemLogo} className="h-full w-full object-contain" alt="Logo" />
              ) : (
                <i className="bi bi-shield-lock-fill text-3xl sm:text-4xl text-blue-600"></i>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
              {systemName.split(' ')[0]} <span className="text-blue-600">{systemName.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-[7px] sm:text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">DJKI • KEMENKUM RI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-1.5">
              <label className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">NIP Pegawai</label>
              <div className="relative group">
                <i className="bi bi-person absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"></i>
                <input 
                  type="text" 
                  required
                  inputMode="numeric"
                  placeholder="Masukkan 18 digit NIP"
                  className="w-full pl-11 pr-4 py-3.5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 text-[13px] sm:text-sm font-bold text-gray-900 transition-all shadow-sm placeholder:text-gray-300 placeholder:font-normal"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-2">Password</label>
              <div className="relative group">
                <i className="bi bi-key absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"></i>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl sm:rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 text-[13px] sm:text-sm font-bold text-gray-900 transition-all shadow-sm placeholder:text-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-3 sm:p-4 rounded-xl flex items-center space-x-3 animate-fadeIn">
                <i className="bi bi-exclamation-triangle-fill shrink-0"></i>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-tight leading-tight">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-400 flex items-center justify-center space-x-2 mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-100 text-center">
            <p className="text-[7px] sm:text-[8px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">Akses khusus Administrator SDM DJKI<br/>Kementerian Hukum RI</p>
          </div>
        </div>
        
        <div className="text-center mt-6 space-y-2 px-2">
            <p className="text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-relaxed">© 2025 DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL • KEMENKUM RI</p>
            <a href="https://caqiestudioproduction.com" target="_blank" rel="noopener noreferrer" className="block text-[7px] sm:text-[8px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-[0.1em] transition-colors">
                Developed by caqiestudioproduction.com
            </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
