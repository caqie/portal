
import React, { useState, useEffect } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai } from '../types';

interface Terlantik {
  pegawai: Pegawai;
  jabatanBaru: string;
}

interface PelantikanHistory {
  id: string;
  timestamp: string;
  baData: any;
  terlantik: Terlantik[];
}

const terbilang = (n: number): string => {
  const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if (n < 12) return words[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  if (n < 200) return "Seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  if (n < 2000) return "Seribu " + terbilang(n - 1000);
  if (n < 10000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  return n.toString();
};

const PelantikanGeneratorPage = () => {
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [selectedTerlantik, setSelectedTerlantik] = useState<Terlantik[]>([]);
  const [history, setHistory] = useState<PelantikanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [baData, setBaData] = useState({
    nomor: 'HKI.1-KP.03.04-35',
    hari: 'Jumat',
    tanggal: new Date().getDate(),
    bulanTeks: 'Agustus',
    tahunTeks: 'Dua ribu dua puluh lima',
    tempat: 'Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia',
    
    pejabatNama: 'RAZILU',
    pejabatJabatan: 'Direktur Jenderal Kekayaan Intelektual',
    pejabatNip: '196511281991031002',
    
    saksi1Nama: 'AGUNG DAMAR SASONGKO',
    saksi1Jabatan: 'Direktur Hak Cipta dan Desain Industri',
    saksi1Nip: '196912261994031001',
    
    saksi2Nama: 'CANDRA DARUSMAN',
    saksi2Jabatan: 'Tim Pengawas LMK dan LMKN',
    saksi2Nip: '',
    
    nomorSK: 'M.HH-6.KI.01.04 Tahun 2025',
    tanggalSK: '08 Agustus 2025'
  });

  const [tempJabatan, setTempJabatan] = useState('Komisioner Lembaga Manajemen Kolektif Nasional Pencipta');

  useEffect(() => {
    loadPegawai();
    loadHistory();
  }, []);

  const loadPegawai = async () => {
    setLoading(true);
    const res = await fetchPegawaiFromSheets();
    setPegawaiList(res);
    setLoading(false);
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('pelantikan_history');
    if (saved) setHistory(JSON.parse(saved));
  };

  const saveToHistory = () => {
    if (selectedTerlantik.length === 0) return;
    const newRecord: PelantikanHistory = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('id-ID'),
      baData: { ...baData },
      terlantik: [...selectedTerlantik]
    };
    const updated = [newRecord, ...history];
    setHistory(updated);
    localStorage.setItem('pelantikan_history', JSON.stringify(updated));
    alert("Dokumen berhasil disimpan ke riwayat.");
  };

  const loadFromHistory = (item: PelantikanHistory) => {
    setBaData(item.baData);
    setSelectedTerlantik(item.terlantik);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistory = (id: string) => {
    if (confirm("Hapus riwayat ini?")) {
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      localStorage.setItem('pelantikan_history', JSON.stringify(updated));
    }
  };

  const addPegawaiToList = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p && !selectedTerlantik.find(t => t.pegawai.nip === nip)) {
      setSelectedTerlantik([...selectedTerlantik, { pegawai: p, jabatanBaru: tempJabatan }]);
    }
  };

  const removePegawaiFromList = (nip: string) => {
    setSelectedTerlantik(selectedTerlantik.filter(t => t.pegawai.nip !== nip));
  };

  const handleSelectRole = (role: 'pejabat' | 'saksi1' | 'saksi2', nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (!p) return;

    if (role === 'pejabat') {
      setBaData(prev => ({ ...prev, pejabatNama: p.nama, pejabatNip: p.nip, pejabatJabatan: p.jabatan }));
    } else if (role === 'saksi1') {
      setBaData(prev => ({ ...prev, saksi1Nama: p.nama, saksi1Nip: p.nip, saksi1Jabatan: p.jabatan }));
    } else if (role === 'saksi2') {
      setBaData(prev => ({ ...prev, saksi2Nama: p.nama, saksi2Nip: p.nip, saksi2Jabatan: p.jabatan }));
    }
  };

  const handlePrint = () => {
    saveToHistory();
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Bulk Generator BA</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Generate Dokumen Massal • Satu File PDF</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.history.back()} className="px-6 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95">Kembali</button>
            <button 
                onClick={handlePrint} 
                disabled={selectedTerlantik.length === 0}
                className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center space-x-3 active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
            >
                <i className="bi bi-file-earmark-pdf text-xl"></i>
                <span className="text-[11px] uppercase tracking-widest">Cetak {selectedTerlantik.length} Dokumen</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Panel */}
        <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar sticky top-24">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">1. Pilih Pegawai Terlantik</p>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[7px] font-black text-gray-400 uppercase">Jabatan Baru (Default)</label>
                            <input type="text" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={tempJabatan} onChange={e => setTempJabatan(e.target.value)} />
                        </div>
                        <select 
                            className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-bold outline-none"
                            onChange={(e) => addPegawaiToList(e.target.value)}
                            value=""
                        >
                            <option value="">+ Tambah Pegawai Ke Daftar</option>
                            {pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                        </select>
                        
                        {/* List Pegawai Terpilih */}
                        <div className="space-y-2 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {selectedTerlantik.map((t, idx) => (
                                <div key={t.pegawai.nip} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group animate-fadeIn">
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-900 uppercase truncate">{t.pegawai.nama}</p>
                                        <p className="text-[8px] text-blue-600 font-bold">{t.pegawai.nip}</p>
                                    </div>
                                    <button onClick={() => removePegawaiFromList(t.pegawai.nip)} className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                        <i className="bi bi-trash-fill"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">2. Pejabat & Saksi</p>
                    <div className="space-y-4">
                        <div className="space-y-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                             <label className="text-[8px] font-black text-gray-400 uppercase">Pejabat Pengambil Sumpah</label>
                             <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[9px] font-bold" onChange={(e) => handleSelectRole('pejabat', e.target.value)}>
                                <option value="">Pilih Pejabat</option>
                                {pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                             </select>
                             <input type="text" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[9px] font-bold mt-2" value={baData.pejabatNama} onChange={e => setBaData({...baData, pejabatNama: e.target.value})} />
                        </div>
                        <div className="space-y-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                             <label className="text-[8px] font-black text-gray-400 uppercase">Saksi I</label>
                             <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[9px] font-bold" onChange={(e) => handleSelectRole('saksi1', e.target.value)}>
                                <option value="">Pilih Saksi I</option>
                                {pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                             </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">3. Waktu & Lokasi</p>
                    <div className="grid grid-cols-1 gap-3">
                        <input type="text" placeholder="Hari" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.hari} onChange={e => setBaData({...baData, hari: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                             <input type="number" placeholder="Tgl" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.tanggal} onChange={e => setBaData({...baData, tanggal: parseInt(e.target.value)})} />
                             <input type="text" placeholder="Bulan (Teks)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.bulanTeks} onChange={e => setBaData({...baData, bulanTeks: e.target.value})} />
                        </div>
                        <input type="text" placeholder="Tahun (Teks)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.tahunTeks} onChange={e => setBaData({...baData, tahunTeks: e.target.value})} />
                        <textarea placeholder="Tempat Pelantikan" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold h-20" value={baData.tempat} onChange={e => setBaData({...baData, tempat: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">4. Dasar SK Menteri</p>
                    <input type="text" placeholder="Nomor SK" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.nomorSK} onChange={e => setBaData({...baData, nomorSK: e.target.value})} />
                    <input type="text" placeholder="Tanggal SK" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.tanggalSK} onChange={e => setBaData({...baData, tanggalSK: e.target.value})} />
                </div>

                <button onClick={saveToHistory} className="w-full py-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all">Simpan Draft Riwayat</button>
            </div>
        </div>

        {/* Preview Panel & History */}
        <div className="lg:col-span-8 space-y-12 pb-20 overflow-x-auto no-scrollbar">
            {/* RIWAYAT TABLE SECTION */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden no-print mb-8">
                <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Riwayat Pembuatan Dokumen</h5>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[8px] font-black rounded-full uppercase">Penyimpanan Lokal</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-400 uppercase text-[7px] font-black border-b border-gray-100 tracking-widest">
                            <tr>
                                <th className="px-8 py-4">Nomor BA</th>
                                <th className="px-4 py-4">Waktu Pelantikan</th>
                                <th className="px-4 py-4 text-center">Terlantik</th>
                                <th className="px-8 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {history.length > 0 ? history.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/5 transition-all group">
                                    <td className="px-8 py-4">
                                        <p className="text-[9px] font-black text-gray-900 uppercase truncate max-w-[150px]">{item.baData.nomor}</p>
                                        <p className="text-[7px] text-gray-400 font-bold mt-0.5">{item.timestamp}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <p className="text-[9px] font-bold text-gray-600 uppercase">{item.baData.hari}, {item.baData.tanggal} {item.baData.bulanTeks}</p>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg">{item.terlantik.length} Org</span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex justify-end gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => loadFromHistory(item)} title="Edit Kembali" className="h-8 w-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-100 transition-all shadow-sm">
                                                <i className="bi bi-pencil-square text-xs"></i>
                                            </button>
                                            <button onClick={() => deleteHistory(item.id)} title="Hapus Riwayat" className="h-8 w-8 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg border border-gray-100 transition-all shadow-sm">
                                                <i className="bi bi-trash text-xs"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="px-8 py-10 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">Belum ada riwayat dokumen</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PREVIEW DOCUMENTS */}
            <div className="bg-gray-200/30 p-4 rounded-[2.5rem]">
                {selectedTerlantik.length > 0 ? selectedTerlantik.map((t, index) => (
                    <React.Fragment key={t.pegawai.nip}>
                        {/* BERITA ACARA */}
                        <div className="bg-white p-[2cm] shadow-xl min-h-[29.7cm] w-[21cm] mx-auto font-serif leading-relaxed text-black relative page-break mb-10" id={`ba-${index}`}>
                            <div className="flex flex-col items-center mb-10">
                                <div className="w-20 h-20 mb-4">
                                    <svg viewBox="0 0 100 100" className="fill-[#D4AF37]">
                                        <path d="M50 5 L60 30 L85 30 L65 45 L75 70 L50 55 L25 70 L35 45 L15 30 L40 30 Z" />
                                    </svg>
                                </div>
                                <h1 className="text-[14pt] font-bold uppercase text-center leading-tight">BERITA ACARA</h1>
                                <h2 className="text-[12pt] font-bold uppercase text-center leading-tight">PENGAMBILAN SUMPAH JABATAN PEGAWAI NEGERI SIPIL</h2>
                                <p className="text-[11pt] font-bold mt-2">NOMOR : {baData.nomor}</p>
                            </div>

                            <div className="text-[11pt] text-justify space-y-5">
                                <p>
                                    Pada hari ini <span className="font-bold">{baData.hari}</span> tanggal <span className="font-bold">{terbilang(baData.tanggal)}</span> bulan <span className="font-bold">{baData.bulanTeks}</span> tahun <span className="font-bold">{baData.tahunTeks}</span>, bertempat di {baData.tempat}, saya, <span className="font-bold">{baData.pejabatNama}</span>, <span className="font-bold">{baData.pejabatJabatan}</span>, dengan disaksikan oleh 2 (dua) orang saksi masing-masing:
                                </p>

                                <ol className="list-decimal ml-10 space-y-1">
                                    <li><span className="font-bold">{baData.saksi1Nama}</span>, {baData.saksi1Jabatan};</li>
                                    <li><span className="font-bold">{baData.saksi2Nama}</span>, {baData.saksi2Jabatan}.</li>
                                </ol>

                                <p>
                                    telah mengambil sumpah jabatan <span className="font-bold">{t.jabatanBaru}</span> atas nama <span className="font-bold uppercase">{t.pegawai.nama}</span>, yang berdasarkan Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia Nomor {baData.nomorSK} tanggal {baData.tanggalSK} diangkat sebagai {t.jabatanBaru}.
                                </p>

                                <p>
                                    Pegawai Negeri Sipil yang mengangkat sumpah tersebut mengucapkan sumpah jabatan sebagai berikut:
                                </p>

                                <div className="italic font-bold px-10 py-4 space-y-4">
                                    <p>”Demi Allah, saya bersumpah:</p>
                                    <p>bahwa saya, akan setia dan taat kepada Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 serta akan menjalankan segala peraturan perundang-undangan dengan selurus-lurusnya, demi dharma bakti saya kepada bangsa dan negara;</p>
                                    <p>bahwa saya dalam menjalankan tugas jabatan, akan menjunjung etika jabatan, bekerja dengan sebaik-baiknya, dan dengan penuh rasa tanggung jawab;</p>
                                    <p>bahwa saya, akan menjaga integritas, tidak menyalahgunakan kewenangan, serta menghindarkan diri dari perbuatan tercela.”</p>
                                </div>

                                <p>
                                    Demikian berita acara pengambilan sumpah jabatan ini dibuat dengan sebenar-benarnya untuk dapat digunakan sebagaimana mestinya.
                                </p>
                            </div>

                            <div className="mt-16 grid grid-cols-2 text-[11pt]">
                                <div className="text-center flex flex-col items-center">
                                    <p className="mb-24">Yang mengangkat sumpah,</p>
                                    <p className="font-bold uppercase underline">{t.pegawai.nama}</p>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <p className="leading-tight">Pejabat<br/>Yang mengambil sumpah,</p>
                                    <div className="mt-16">
                                        <p className="font-bold uppercase underline">{baData.pejabatNama}</p>
                                        <p>NIP {baData.pejabatNip}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-16 flex flex-col items-center w-full">
                                <p className="font-bold mb-10">SAKSI-SAKSI,</p>
                                <div className="grid grid-cols-2 w-full text-center text-[11pt]">
                                    <div className="flex flex-col items-center px-4">
                                        <p className="mb-20 leading-tight">{baData.saksi1Nama}</p>
                                        <p>NIP {baData.saksi1Nip}</p>
                                    </div>
                                    <div className="flex flex-col items-center px-4">
                                        <p className="mb-20 leading-tight">{baData.saksi2Nama}</p>
                                        <p>{baData.saksi2Nip ? `NIP ${baData.saksi2Nip}` : ''}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PAKTA INTEGRITAS */}
                        <div className="bg-white p-[2cm] shadow-xl min-h-[29.7cm] w-[21cm] mx-auto font-serif leading-relaxed text-black relative page-break mb-10" id={`pakta-${index}`}>
                            <div className="flex flex-col items-center mb-10">
                                <div className="w-16 h-16 bg-[#111827] rounded-lg mb-6 flex items-center justify-center">
                                    <i className="bi bi-shield-lock text-white text-3xl"></i>
                                </div>
                                <h3 className="text-[10pt] font-bold text-center">KEMENTERIAN HUKUM REPUBLIK INDONESIA</h3>
                                <h1 className="text-[14pt] font-bold uppercase text-center mt-4">PAKTA INTEGRITAS</h1>
                            </div>

                            <div className="text-[11pt] space-y-6">
                                <p>Saya, <span className="font-bold uppercase">{t.pegawai.nama}</span>, jabatan <span className="font-bold uppercase">{t.jabatanBaru}</span>, menyatakan sebagai berikut :</p>
                                
                                <div className="space-y-4">
                                    {[
                                        "Berperan secara pro aktif dalam upaya pencegahan dan pemberantasan Korupsi, Kolusi dan Nepotisme serta tidak melibatkan diri dalam perbuatan tercela;",
                                        "Tidak meminta atau menerima pemberian secara langsung atau tidak langsung berupa suap, hadiah, bantuan, atau bentuk lainnya yang tidak sesuai dengan ketentuan yang berlaku;",
                                        "Bersikap transparan, jujur, objektif, dan akuntabel dalam melaksanakan tugas;",
                                        "Menghindari pertentangan kepentingan (conflict of interest) dalam pelaksanaan tugas;",
                                        "Memberi contoh dalam kepatuhan terhadap peraturan perundang-undangan dalam melaksanakan tugas dan sesama pegawai di lingkungan kerja saya secara konsisten;",
                                        "Akan menyampaikan informasi penyimpangan integritas di Direktorat Jenderal Kekayaan Intelektual serta turut menjaga kerahasiaan saksi atas pelanggaran peraturan yang dilaporkannya;",
                                        "Bila saya melanggar hal-hal tersebut di atas, saya siap menghadapi konsekuensinya;"
                                    ].map((poin, i) => (
                                        <div key={i} className="flex gap-4">
                                            <span className="w-4">{i + 1}.</span>
                                            <p className="flex-1 text-justify">{poin}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-16">
                                    <p>Jakarta, {baData.tanggalSK}</p>
                                    
                                    <div className="grid grid-cols-2 mt-8 text-center">
                                        <div className="flex flex-col items-center">
                                            <p>Menyaksikan:</p>
                                            <p className="mb-24">{baData.pejabatJabatan}</p>
                                            <p className="font-bold uppercase underline">{baData.pejabatNama}</p>
                                            <p>NIP {baData.pejabatNip}</p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <p className="mb-32">Pembuat Pernyataan,</p>
                                            <p className="font-bold uppercase underline">{t.pegawai.nama}</p>
                                            <p>NIP {t.pegawai.nip}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                )) : (
                    <div className="h-full min-h-[600px] border-4 border-dashed border-gray-300 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 bg-white">
                        <i className="bi bi-people-fill text-8xl text-gray-200 mb-6"></i>
                        <h4 className="text-2xl font-black text-gray-400 uppercase tracking-widest">Daftar Terlantik Kosong</h4>
                        <p className="text-gray-400 mt-4 max-w-md font-bold text-xs uppercase leading-loose">Silakan pilih pegawai dari menu sebelah kiri untuk menghasilkan dokumen Berita Acara dan Pakta Integritas secara massal.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      <style>{`
        @media print {
            .no-print { display: none !important; }
            body { background: white !important; padding: 0 !important; margin: 0 !important; }
            main { padding: 0 !important; overflow: visible !important; }
            #root { overflow: visible !important; }
            .shadow-xl, .shadow-sm { box-shadow: none !important; border: none !important; }
            
            .page-break { 
              display: block !important;
              page-break-after: always !important;
              width: 21cm !important; 
              height: 29.7cm !important;
              margin: 0 auto !important;
              padding: 2cm !important;
            }
            
            @page { 
              size: A4; 
              margin: 0; 
            }
        }
        .page-break {
            font-family: 'Times New Roman', Times, serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
      `}</style>
    </div>
  );
};

export default PelantikanGeneratorPage;
