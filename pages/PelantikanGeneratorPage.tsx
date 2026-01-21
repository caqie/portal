
import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai } from '../types';
import { DEFAULT_LOGO } from '../constants';
import SearchableSelect from '../components/SearchableSelect';

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
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);
  
  const [baData, setBaData] = useState({
    nomor: 'HKI.1-KP.03.04-35',
    hari: 'Jumat',
    tanggal: new Date().getDate(),
    bulanTeks: 'Agustus',
    tahunTeks: 'Dua ribu dua puluh lima',
    tempat: 'Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum Republik Indonesia',
    
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

  const [tempJabatan, setTempJabatan] = useState('Analis Kekayaan Intelektual Ahli Madya');

  useEffect(() => {
    loadPegawai();
    loadHistory();
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setCustomLogo(savedLogo);
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

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList.map(p => ({
      value: p.nip,
      label: p.nama,
      subLabel: `NIP. ${p.nip}`
    }))
  , [pegawaiList]);

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

  const KopSurat = () => (
    <div className="flex flex-col items-center mb-10 text-black border-b-2 border-black pb-4">
      <img 
        src={customLogo} 
        className="h-20 w-auto mb-4 object-contain" 
        alt="Logo Instansi" 
        crossOrigin="anonymous"
      />
      <h3 className="text-[12pt] font-bold text-center leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</h3>
      <h3 className="text-[12pt] font-bold text-center leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</h3>
      <p className="text-[8pt] italic mt-1 text-center">Jalan H.R. Rasuna Said Kav. 8-9 Kuningan, Jakarta Selatan 12940</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">Generator BA & Pakta</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pembuatan Berita Acara & Pakta Integritas Terintegrasi</p>
        </div>
        <div className="flex gap-2">
            <button onClick={handlePrint} disabled={selectedTerlantik.length === 0} className="px-8 py-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center space-x-3 active:scale-95 disabled:bg-gray-300">
                <i className="bi bi-printer-fill text-xl"></i>
                <span className="text-[11px] uppercase tracking-widest">Cetak {selectedTerlantik.length} Set Dokumen</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Panel */}
        <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar sticky top-24">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">1. Pilih Pegawai Terkait</p>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[7px] font-black text-gray-400 uppercase">Jabatan Dalam Dokumen</label>
                            <input type="text" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={tempJabatan} onChange={e => setTempJabatan(e.target.value)} />
                        </div>
                        <SearchableSelect placeholder="+ Cari Pegawai..." options={searchablePegawaiOptions} value="" onChange={addPegawaiToList} />
                        <div className="space-y-2 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {selectedTerlantik.map((t) => (
                                <div key={t.pegawai.nip} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between group">
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-900 uppercase truncate">{t.pegawai.nama}</p>
                                        <p className="text-[8px] text-blue-600 font-bold">{t.pegawai.nip}</p>
                                    </div>
                                    <button onClick={() => removePegawaiFromList(t.pegawai.nip)} className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><i className="bi bi-trash-fill"></i></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">2. Pejabat Penandatangan</p>
                    <div className="space-y-4">
                        <SearchableSelect label="Pejabat Pengambil Sumpah" options={searchablePegawaiOptions} value={baData.pejabatNip} onChange={(val) => handleSelectRole('pejabat', val)} />
                        <SearchableSelect label="Saksi I" options={searchablePegawaiOptions} value={baData.saksi1Nip} onChange={(val) => handleSelectRole('saksi1', val)} />
                        <SearchableSelect label="Saksi II" options={searchablePegawaiOptions} value={baData.saksi2Nip} onChange={(val) => handleSelectRole('saksi2', val)} />
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2">3. Detail Waktu & Dasar Hukum</p>
                    <div className="grid grid-cols-1 gap-3">
                        <input type="text" placeholder="Hari" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.hari} onChange={e => setBaData({...baData, hari: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                             <input type="number" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.tanggal} onChange={e => setBaData({...baData, tanggal: parseInt(e.target.value)})} />
                             <input type="text" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.bulanTeks} onChange={e => setBaData({...baData, bulanTeks: e.target.value})} />
                        </div>
                        <input type="text" placeholder="Tahun (Teks)" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.tahunTeks} onChange={e => setBaData({...baData, tahunTeks: e.target.value})} />
                        <input type="text" placeholder="Nomor SK" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.nomorSK} onChange={e => setBaData({...baData, nomorSK: e.target.value})} />
                        <input type="text" placeholder="Tanggal SK" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[9px] font-bold" value={baData.tanggalSK} onChange={e => setBaData({...baData, tanggalSK: e.target.value})} />
                    </div>
                </div>
            </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-8 space-y-12">
            <div className="bg-gray-200/30 p-8 rounded-[3rem] border border-gray-100 min-h-[600px] flex flex-col items-center">
                {selectedTerlantik.length > 0 ? selectedTerlantik.map((t, index) => (
                    <React.Fragment key={t.pegawai.nip}>
                        {/* BERITA ACARA SUMPAH */}
                        <div className="bg-white p-[2cm] shadow-2xl min-h-[29.7cm] w-[21cm] font-serif text-black page-break mb-10 overflow-hidden">
                            <KopSurat />
                            <div className="text-center mb-8">
                                <h1 className="text-[14pt] font-bold uppercase underline">BERITA ACARA</h1>
                                <h2 className="text-[12pt] font-bold uppercase mt-1">PENGAMBILAN SUMPAH JABATAN</h2>
                                <p className="text-[11pt] font-bold mt-2">NOMOR : {baData.nomor}</p>
                            </div>

                            <div className="text-[11pt] text-justify space-y-4 leading-relaxed">
                                <p>
                                    Pada hari ini <span className="font-bold">{baData.hari}</span> tanggal <span className="font-bold">{terbilang(baData.tanggal)}</span> bulan <span className="font-bold">{baData.bulanTeks}</span> tahun <span className="font-bold">{baData.tahunTeks}</span>, bertempat di {baData.tempat}, saya, <span className="font-bold">{baData.pejabatNama}</span>, <span className="font-bold">{baData.pejabatJabatan}</span>, dengan disaksikan oleh saksi-saksi:
                                </p>

                                <ol className="list-decimal ml-10 space-y-1">
                                    <li><span className="font-bold">{baData.saksi1Nama}</span>, {baData.saksi1Jabatan};</li>
                                    <li><span className="font-bold">{baData.saksi2Nama}</span>, {baData.saksi2Jabatan}.</li>
                                </ol>

                                <p>
                                    telah mengambil sumpah jabatan <span className="font-bold">{t.jabatanBaru}</span> atas nama <span className="font-bold uppercase">{t.pegawai.nama}</span>, yang berdasarkan Keputusan Menteri Hukum Nomor {baData.nomorSK} tanggal {baData.tanggalSK} diangkat sebagai {t.jabatanBaru}.
                                </p>

                                <p>Pegawai Negeri Sipil yang mengangkat sumpah mengucapkan sumpah jabatan sebagai berikut:</p>

                                <div className="italic font-bold px-10 py-4 space-y-2 border-l-4 border-black bg-gray-50">
                                    <p>”Demi Allah, saya bersumpah:”</p>
                                    <p>”bahwa saya, akan setia dan taat kepada Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 serta akan menjalankan segala peraturan perundang-undangan dengan selurus-lurusnya, demi dharma bakti saya kepada bangsa dan negara;”</p>
                                    <p>”bahwa saya dalam menjalankan tugas jabatan, akan menjunjung etika jabatan, bekerja dengan sebaik-baiknya, dan dengan penuh rasa tanggung jawab;”</p>
                                    <p>”bahwa saya, akan menjaga integritas, tidak menyalahgunakan kewenangan, serta menghindarkan diri dari perbuatan tercela.”</p>
                                </div>
                            </div>

                            <div className="mt-16 grid grid-cols-2 text-[11pt]">
                                <div className="text-center flex flex-col items-center">
                                    <p className="mb-24">Yang mengangkat sumpah,</p>
                                    <p className="font-bold uppercase underline">{t.pegawai.nama}</p>
                                    <p>NIP {t.pegawai.nip}</p>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <p>Pejabat yang mengambil sumpah,</p>
                                    <div className="mt-24">
                                        <p className="font-bold uppercase underline">{baData.pejabatNama}</p>
                                        <p>NIP {baData.pejabatNip}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PAKTA INTEGRITAS */}
                        <div className="bg-white p-[2cm] shadow-2xl min-h-[29.7cm] w-[21cm] font-serif text-black page-break mb-10 overflow-hidden">
                            <KopSurat />
                            <div className="text-center mb-10">
                                <h1 className="text-[16pt] font-bold uppercase tracking-widest underline">PAKTA INTEGRITAS</h1>
                            </div>

                            <div className="text-[11pt] space-y-6 leading-relaxed">
                                <p>Saya, <span className="font-bold uppercase">{t.pegawai.nama}</span>, NIP <span className="font-bold">{t.pegawai.nip}</span>, jabatan <span className="font-bold uppercase">{t.jabatanBaru}</span>, menyatakan sebagai berikut :</p>
                                
                                <div className="space-y-3">
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
                                            <span className="w-4 font-bold">{i + 1}.</span>
                                            <p className="flex-1 text-justify">{poin}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-16 flex flex-col items-end">
                                    <p>Jakarta, {baData.tanggalSK}</p>
                                    <div className="mt-10 mr-12 text-center flex flex-col items-center">
                                        <p className="mb-24">Pembuat Pernyataan,</p>
                                        <p className="font-bold uppercase underline">{t.pegawai.nama}</p>
                                        <p>NIP {t.pegawai.nip}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                )) : (
                    <div className="py-40 text-center opacity-30 flex flex-col items-center">
                        <i className="bi bi-file-earmark-medical text-8xl mb-6"></i>
                        <p className="text-xl font-black uppercase tracking-[0.2em]">Pilih Pegawai Untuk Preview</p>
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
            .page-break { 
              display: block !important;
              page-break-after: always !important;
              width: 21cm !important; 
              height: 29.7cm !important;
              margin: 0 auto !important;
              padding: 2cm !important;
              box-shadow: none !important;
              border: none !important;
            }
            @page { size: A4; margin: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default PelantikanGeneratorPage;
