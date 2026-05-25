
import React from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const MenuCard = ({ icon, label, description, color, onClick, badge, adminOnly = false }: any) => {
  const { canEdit } = useAuth();
  if (adminOnly && !canEdit) return null;

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-600 shadow-blue-600/20",
    indigo: "bg-indigo-600 shadow-indigo-600/20",
    emerald: "bg-emerald-600 shadow-emerald-600/20",
    amber: "bg-amber-600 shadow-amber-600/20",
    cyan: "bg-cyan-600 shadow-cyan-600/20",
    rose: "bg-rose-600 shadow-rose-600/20",
    violet: "bg-violet-600 shadow-violet-600/20",
    slate: "bg-slate-700 shadow-slate-700/20",
    teal: "bg-teal-600 shadow-teal-600/20"
  };

  return (
    <button 
      onClick={onClick}
      className="group p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 transition-all duration-300 text-left flex flex-col h-full relative overflow-hidden shadow-sm hover:shadow-2xl hover:border-blue-100 hover:bg-blue-50/5"
    >
      <div className={`h-14 w-14 md:h-16 md:w-16 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center text-white shadow-xl mb-6 md:mb-8 group-hover:scale-110 transition-transform ${colorClasses[color]}`}>
        <i className={`bi ${icon} text-2xl md:text-3xl`}></i>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-base md:text-lg font-black text-gray-900 tracking-tighter leading-tight">{label}</h4>
            {badge && <span className="px-2 py-0.5 bg-rose-500 text-white text-[7px] font-black rounded tracking-widest">{badge}</span>}
          </div>
          <p className="text-[9px] md:text-[10px] text-gray-400 font-bold tracking-widest leading-relaxed line-clamp-2 md:line-clamp-none">{description}</p>
        </div>
        
        <div className="mt-6 md:mt-8 flex items-center gap-2 text-gray-300 group-hover:text-blue-600 transition-colors">
          <span className="text-[8px] font-black tracking-[0.2em]">Buka Layanan</span>
          <i className="bi bi-arrow-right-short text-xl group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>
      <div className={`absolute -right-6 -bottom-6 h-32 w-32 rounded-full opacity-[0.02] group-hover:scale-150 transition-transform duration-700 ${colorClasses[color].split(' ')[0]}`}></div>
    </button>
  );
};

const LayananKepegawaianPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const services = [
    { id: 'talenta', icon: 'bi-star-half', label: 'Manajemen Talenta ASN', description: 'Perhitungan Talenta, Talent Pool, Sembilan Kotak (Nine Box Matrix), & Kesiapan Promosi', color: 'violet', route: '/talenta' },
    { id: 'bangkom', icon: 'bi-mortarboard-fill', label: 'Bangkom & Pelatihan', description: 'Monitoring Kewajiban Minimal 20 JP PNS & 24 JP PPPK / Tahun', color: 'indigo', route: '/pengembangan' },
    { id: 'pangkat', icon: 'bi-award-fill', label: 'Kenaikan Pangkat', description: 'Usulan Kenaikan Pangkat Reguler & Istimewa (Prestasi Luar Biasa)', color: 'blue', route: '/kenaikan-pangkat' },
    { id: 'skp', icon: 'bi-graph-up-arrow', label: 'E-Kinerja (SKP)', description: 'Evaluasi & Penilaian Kinerja Pegawai (Permenpan 6/2022)', color: 'blue', route: '/skp' },
    { id: 'pak', icon: 'bi-patch-check-fill', label: 'Angka Kredit (PAK)', description: 'Penetapan Angka Kredit Fungsional & TND Konversi', color: 'indigo', route: '/pak' },
    { id: 'magang', icon: 'bi-mortarboard-fill', label: 'Magang & PKL', description: 'Manajemen Peserta Magang, Penempatan Unit, & Sertifikat Suker', color: 'teal', route: '/magang-pkl' },
    { id: 'satya', icon: 'bi-star-fill', label: 'Satyalencana', description: 'Monitoring Pengabdian 10, 20, 30 Tahun & Usulan Penghargaan', color: 'amber', route: '/satya-lencana' },
    { id: 'kgb', icon: 'bi-cash-stack', label: 'KGB', description: 'Generator Surat Kenaikan Gaji Berkala Sesuai Template TND', color: 'emerald', route: '/kgb-gen', adminOnly: true, badge: 'Admin' },
    { id: 'anjab', icon: 'bi-calculator-fill', label: 'ANJAB & ABK', description: 'Analisis Jabatan & Perhitungan Beban Kerja Organisasi', color: 'cyan', route: '/anjab-abk' },
    { id: 'pensiun', icon: 'bi-door-open-fill', label: 'DPCP Generator', description: 'Monitoring Batas Usia Pensiun & Generator Dokumen DPCP', color: 'rose', route: '/pensiun' },
    { id: 'spmt', icon: 'bi-file-earmark-text-fill', label: 'Generator TND', description: 'Pembuatan Dokumen SPMT & SPP Sesuai Naskah Dinas', color: 'slate', route: '/spmt-spp', adminOnly: true, badge: 'Admin' },
    { id: 'ba', icon: 'bi-patch-check-fill', label: 'Berita Acara', description: 'Generator BA Pelantikan & Pakta Integritas Terpadu', color: 'blue', route: '/pelantikan-gen', adminOnly: true, badge: 'Admin' },
  ];

  const firstName = (user?.name || 'Administrator').split(' ')[0];

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-24">
      <div className="text-center md:text-left">
        <h3 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tighter leading-none">Pusat Layanan Karir</h3>
        <p className="text-[9px] md:text-[11px] text-gray-400 font-bold tracking-[0.3em] mt-4">Integrasi Manajemen Pengembangan & Administrasi ASN DJKI</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {services.map((s) => (
          <MenuCard key={s.id} {...s} onClick={() => s.route ? navigate(s.route) : alert("Fitur sedang dalam pengembangan.")} />
        ))}
      </div>

      <div className="bg-[#111827] rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-14 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-[120px]"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="px-3 py-1 bg-blue-600 text-white text-[8px] font-black rounded tracking-widest">Informasi Karir</span>
            <h4 className="text-xl md:text-2xl font-black mt-4 tracking-tight">Halo, {firstName}!</h4>
            <p className="text-[9px] md:text-[11px] text-gray-400 font-bold mt-3 leading-relaxed">
              Semua layanan administrasi karir Anda terpusat di sini. Pastikan data di E-Dossier selalu diperbarui.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
             <div className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-3xl">
                <p className="text-[7px] md:text-[8px] font-black text-blue-400 mb-2">Role Anda</p>
                <h5 className="text-xs md:sm font-black truncate">{user?.role || 'Guest'}</h5>
             </div>
             <div className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-3xl">
                <p className="text-[7px] md:text-[8px] font-black text-emerald-400 mb-2">Status Server</p>
                <h5 className="text-xs md:text-sm font-black">Aktif / Cloud</h5>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayananKepegawaianPage;
