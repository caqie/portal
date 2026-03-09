
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Trophy, 
  Download, 
  RefreshCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Upload,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  AlertCircle,
  Printer,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { PesertaUkom, HasilUkom, BankSoal, Pegawai } from '../types';
import { 
  fetchPesertaUkomFromSheets, 
  fetchHasilUkomFromSheets, 
  savePesertaUkom, 
  deletePesertaUkom,
  saveBankSoalBulk,
  fetchPegawaiFromSheets,
  fetchBankSoalFromSheets
} from '../spreadsheetService';

const PASSING_GRADE = {
  TWK: 65,
  TIU: 80,
  TKP: 166
};

const JABATAN_LIST = [
  'PEMERIKSA PATEN',
  'PEMERIKSA MEREK',
  'PEMERIKSA DESAIN INDUSTRI',
  'ANALIS KEKAYAAN INTELEKTUAL'
];

const JENJANG_LIST = [
  'AHLI PERTAMA',
  'AHLI MUDA',
  'AHLI MADYA',
  'AHLI UTAMA'
];

const generateDefaultPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  const all = upper + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each
  password += upper[Math.floor(Math.random() * upper.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest to 8 characters
  for (let i = 0; i < 5; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const UkomAdminPage: React.FC = () => {
  const [peserta, setPeserta] = useState<PesertaUkom[]>([]);
  const [hasil, setHasil] = useState<HasilUkom[]>([]);
  const [allPegawai, setAllPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pegawaiSearch, setPegawaiSearch] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('Semua');
  const [activeTab, setActiveTab] = useState<'PESERTA' | 'HASIL' | 'SOAL'>('HASIL');
  const [showPesertaModal, setShowPesertaModal] = useState(false);
  const [showSoalModal, setShowSoalModal] = useState(false);
  const [editingPeserta, setEditingPeserta] = useState<PesertaUkom | null>(null);
  const [editingSoal, setEditingSoal] = useState<BankSoal | null>(null);
  const [bankSoal, setBankSoal] = useState<BankSoal[]>([]);
  const [pesertaForm, setPesertaForm] = useState<PesertaUkom>({ 
    noPeserta: '', 
    nama: '', 
    tanggalLahir: '', 
    jabatanFungsional: '',
    jenjang: '', 
    unitKerja: '', 
    fotoUrl: '', 
    password: '', 
    statusUjian: 'Belum' 
  });
  const [soalForm, setSoalForm] = useState<BankSoal>({
    id: '',
    kategori: 'TWK',
    tipeSoal: 'Umum',
    jabatanFungsional: '',
    jenjang: 'Umum',
    pertanyaan: '',
    pilihanA: '',
    pilihanB: '',
    pilihanC: '',
    pilihanD: '',
    pilihanE: '',
    jawabanBenar: 'A',
    bobotNilai: '5'
  });
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, h, peg, s] = await Promise.all([
        fetchPesertaUkomFromSheets(),
        fetchHasilUkomFromSheets(),
        fetchPegawaiFromSheets(),
        fetchBankSoalFromSheets()
      ]);
      setPeserta(p);
      setHasil(h.sort((a: HasilUkom, b: HasilUkom) => b.totalNilai - a.totalNilai));
      setAllPegawai(peg);
      setBankSoal(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetStatus = async (noPeserta: string) => {
    if (!window.confirm('Reset status ujian peserta ini?')) return;
    const p = peserta.find(x => x.noPeserta === noPeserta);
    if (p) {
      const success = await savePesertaUkom({ ...p, statusUjian: 'Belum' });
      if (success) {
        alert('Status berhasil direset.');
        loadData();
      }
    }
  };

  const handleDeletePeserta = async (noPeserta: string) => {
    if (!window.confirm('Hapus peserta ini secara permanen?')) return;
    try {
      const success = await deletePesertaUkom(noPeserta);
      if (success) {
        alert('Peserta berhasil dihapus.');
        loadData();
      } else {
        alert('Gagal menghapus peserta. Pastikan koneksi internet stabil.');
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert('Terjadi kesalahan sistem saat menghapus peserta.');
    }
  };

  const handleSavePeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await savePesertaUkom(pesertaForm);
    if (success) {
      alert('Data peserta berhasil disimpan.');
      setShowPesertaModal(false);
      setEditingPeserta(null);
      setPegawaiSearch('');
      setPesertaForm({ 
        noPeserta: '', 
        nama: '', 
        tanggalLahir: '', 
        jabatanFungsional: '',
        jenjang: '', 
        unitKerja: '', 
        fotoUrl: '', 
        password: '', 
        statusUjian: 'Belum' 
      });
      loadData();
    }
  };

  const handleSaveSoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await saveBankSoalBulk([soalForm]);
    if (success) {
      alert('Data soal berhasil disimpan.');
      setShowSoalModal(false);
      setEditingSoal(null);
      loadData();
    }
  };

  const handleUploadBankSoal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

          const formattedSoal: BankSoal[] = data.map(row => ({
            id: row.IDSOAL || row.id || Math.random().toString(36).substr(2, 9),
            kategori: row.KATEGORI || row.kategori,
            tipeSoal: row.TIPESOAL || row.tipeSoal || 'Umum',
            jabatanFungsional: row.JABATANFUNGSIONAL || row.jabatanFungsional || '',
            jenjang: row.JENJANG || row.jenjang || 'Umum',
            pertanyaan: row.PERTANYAAN || row.pertanyaan,
            imageUrl: row.IMAGEURL || row.imageUrl || '',
            pilihanA: row.PILIHANA || row.pilihanA,
            pilihanB: row.PILIHANB || row.pilihanB,
            pilihanC: row.PILIHANC || row.pilihanC,
            pilihanD: row.PILIHAND || row.pilihanD,
            pilihanE: row.PILIHANE || row.pilihanE,
            jawabanBenar: row.JAWABANBENAR || row.jawabanBenar,
            bobotNilai: typeof row.BOBOTNILAI === 'object' ? JSON.stringify(row.BOBOTNILAI) : (row.BOBOTNILAI || row.bobotNilai).toString()
          }));

        const success = await saveBankSoalBulk(formattedSoal);
        if (success) {
          alert(`Berhasil mengunggah ${formattedSoal.length} soal.`);
        } else {
          alert('Gagal mengunggah soal ke server.');
        }
      } catch (err) {
        console.error(err);
        alert('Format file tidak valid. Pastikan header sesuai template.');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        IDSOAL: 'S001',
        KATEGORI: 'TWK',
        TIPESOAL: 'Umum',
        JABATANFUNGSIONAL: '',
        JENJANG: 'Umum',
        PERTANYAAN: 'Pancasila sebagai dasar negara Indonesia disahkan pada tanggal...',
        IMAGEURL: '',
        PILIHANA: '1 Juni 1945',
        PILIHANB: '17 Agustus 1945',
        PILIHANC: '18 Agustus 1945',
        PILIHAND: '22 Juni 1945',
        PILIHANE: '27 Desember 1949',
        JAWABANBENAR: 'C',
        BOBOTNILAI: '5'
      },
      {
        IDSOAL: 'S002',
        KATEGORI: 'KI',
        TIPESOAL: 'Khusus',
        JABATANFUNGSIONAL: 'PEMERIKSA PATEN',
        JENJANG: 'AHLI MUDA',
        PERTANYAAN: 'Berapa lama masa perlindungan paten biasa di Indonesia menurut UU No. 13 Tahun 2016?',
        IMAGEURL: '',
        PILIHANA: '10 Tahun',
        PILIHANB: '20 Tahun',
        PILIHANC: '25 Tahun',
        PILIHAND: '50 Tahun',
        PILIHANE: 'Seumur Hidup',
        JAWABANBENAR: 'B',
        BOBOTNILAI: '5'
      },
      {
        IDSOAL: 'S003',
        KATEGORI: 'KI',
        TIPESOAL: 'Khusus',
        JABATANFUNGSIONAL: 'PEMERIKSA MEREK',
        JENJANG: 'AHLI PERTAMA',
        PERTANYAAN: 'Merek yang tidak dapat didaftarkan adalah merek yang...',
        IMAGEURL: '',
        PILIHANA: 'Memiliki daya pembeda',
        PILIHANB: 'Bertentangan dengan ideologi negara',
        PILIHANC: 'Menggunakan nama orang terkenal dengan izin',
        PILIHAND: 'Merupakan kata umum dalam bahasa asing',
        PILIHANE: 'Memiliki kombinasi warna yang unik',
        JAWABANBENAR: 'B',
        BOBOTNILAI: '5'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Bank_Soal.xlsx');
  };

  const exportToExcel = () => {
    const data = activeTab === 'HASIL' ? hasil : peserta;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `UKOM_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintCard = (p: PesertaUkom) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Kartu Ujian - ${p.nama}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; display: flex; justify-content: center; background: #f8fafc; }
            .card { 
              width: 450px; 
              background: white;
              border: 1px solid #e2e8f0; 
              border-radius: 30px; 
              padding: 40px; 
              position: relative; 
              overflow: hidden; 
              box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
            }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 25px; margin-bottom: 25px; }
            .header h1 { margin: 0; font-size: 20px; color: #1e40af; text-transform: uppercase; letter-spacing: -0.5px; font-weight: 900; }
            .header p { margin: 5px 0 0; font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            
            .content { display: flex; gap: 30px; }
            .photo-box { 
              width: 120px; 
              height: 160px; 
              background: #f1f5f9; 
              border-radius: 15px; 
              overflow: hidden;
              border: 1px solid #e2e8f0;
              flex-shrink: 0;
            }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            .photo-placeholder { height: 100%; display: flex; items-center; justify-content: center; color: #cbd5e1; font-size: 10px; text-align: center; padding: 20px; font-weight: 700; }
            
            .info { flex-grow: 1; display: flex; flex-direction: column; gap: 15px; }
            .info-item { }
            .label { font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px; }
            .value { font-size: 13px; color: #1e293b; font-weight: 700; line-height: 1.2; }
            .value.nip { font-family: monospace; font-size: 14px; }
            .value.password { color: #2563eb; font-family: monospace; background: #eff6ff; padding: 4px 8px; border-radius: 6px; display: inline-block; }
            
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #f1f5f9; text-align: center; font-size: 9px; color: #94a3b8; font-weight: 700; }
            .watermark { position: absolute; top: -20px; right: -20px; font-size: 120px; color: #f8fafc; z-index: -1; transform: rotate(-20deg); font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="watermark">CAT</div>
            <div class="header">
              <h1>Kartu Peserta Ukom</h1>
              <p>Direktorat Jenderal Kekayaan Intelektual</p>
            </div>
            <div class="content">
              <div class="photo-box">
                ${p.fotoUrl ? `<img src="${p.fotoUrl}" alt="Foto Peserta" />` : `<div class="photo-placeholder">PAS FOTO 3X4</div>`}
              </div>
              <div class="info">
                <div class="info-item">
                  <div class="label">Nama Lengkap</div>
                  <div class="value">${p.nama}</div>
                </div>
                <div class="info-item">
                  <div class="label">NIP / No. Peserta</div>
                  <div class="value nip">${p.noPeserta}</div>
                </div>
                <div class="info-item">
                  <div class="label">Unit Kerja</div>
                  <div class="value">${p.unitKerja || '-'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Jabatan Fungsional</div>
                  <div class="value">${p.jabatanFungsional || '-'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Jenjang Jabatan</div>
                  <div class="value">${p.jenjang || 'Umum'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Password Login</div>
                  <div class="value password">${p.password || p.tanggalLahir}</div>
                </div>
              </div>
            </div>
            <div class="footer">
              DJKI CAT SYSTEM &copy; 2026<br/>
              Simpan kartu ini dengan baik untuk akses ujian
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  const filteredPeserta = peserta.filter(p => 
    (jenjangFilter === 'Semua' || p.jenjang === jenjangFilter || p.jabatanFungsional === jenjangFilter) &&
    (p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.noPeserta.includes(searchTerm))
  );

  const filteredHasil = hasil.filter(h => 
    (jenjangFilter === 'Semua' || h.jenjang === jenjangFilter || h.jabatanFungsional === jenjangFilter) &&
    (h.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
     h.noPeserta.includes(searchTerm))
  );

  const availableFilters = Array.from(new Set([
    ...peserta.map(p => p.jenjang),
    ...peserta.map(p => p.jabatanFungsional),
    ...hasil.map(h => h.jenjang),
    ...hasil.map(h => h.jabatanFungsional)
  ])).filter(Boolean).sort();

  const stats = {
    total: filteredPeserta.length,
    sudah: filteredPeserta.filter(p => p.statusUjian === 'Sudah').length,
    belum: filteredPeserta.filter(p => p.statusUjian === 'Belum').length,
    avg: filteredHasil.length > 0 ? (filteredHasil.reduce((acc, curr) => acc + curr.totalNilai, 0) / filteredHasil.length).toFixed(1) : 0,
    topScore: filteredHasil.length > 0 ? Math.max(...filteredHasil.map(h => h.totalNilai)) : 0
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Admin Panel UKOM</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em]">Monitoring Hasil & Peserta Ujian CAT</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={loadData}
            className="p-4 bg-white border border-gray-200 text-gray-400 rounded-2xl hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={exportToExcel}
            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center gap-3"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[
            { label: 'Total Peserta', val: stats.total, icon: Users, color: 'blue' },
            { label: 'Sudah Ujian', val: stats.sudah, icon: CheckCircle2, color: 'emerald' },
            { label: 'Belum Ujian', val: stats.belum, icon: XCircle, color: 'rose' },
            { label: 'Rata-Rata', val: stats.avg, icon: BarChart3, color: 'indigo' },
            { label: 'Nilai Tertinggi', val: stats.topScore, icon: Trophy, color: 'amber' },
          ].map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 bg-${s.color}-50 text-${s.color}-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{s.label}</p>
                <p className="text-xl font-black text-gray-900 leading-none">{s.val}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-[3rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-50 p-1.5 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('HASIL')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'HASIL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Hasil Ujian
                </button>
                <button 
                  onClick={() => setActiveTab('PESERTA')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PESERTA' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Daftar Peserta
                </button>
                <button 
                  onClick={() => setActiveTab('SOAL')}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SOAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Bank Soal
                </button>
              </div>
              
              {activeTab === 'PESERTA' && (
                <button 
                  onClick={() => {
                    setEditingPeserta(null);
                    setPegawaiSearch('');
                    setPesertaForm({ 
                      noPeserta: '', 
                      nama: '', 
                      tanggalLahir: '', 
                      jabatanFungsional: '',
                      jenjang: '', 
                      unitKerja: '',
                      fotoUrl: '',
                      password: generateDefaultPassword(), 
                      statusUjian: 'Belum' 
                    });
                    setShowPesertaModal(true);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Peserta</span>
                </button>
              )}

              {activeTab === 'SOAL' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const template = [
                        {
                          IDSOAL: 'S001',
                          KATEGORI: 'TWK',
                          TIPESOAL: 'Umum',
                          JABATANFUNGSIONAL: '',
                          JENJANG: 'Umum',
                          PERTANYAAN: 'Pancasila sebagai dasar negara Indonesia disahkan pada tanggal...',
                          IMAGEURL: '',
                          PILIHANA: '1 Juni 1945',
                          PILIHANB: '17 Agustus 1945',
                          PILIHANC: '18 Agustus 1945',
                          PILIHAND: '22 Juni 1945',
                          PILIHANE: '27 Desember 1949',
                          JAWABANBENAR: 'C',
                          BOBOTNILAI: '5'
                        }
                      ];
                      const ws = XLSX.utils.json_to_sheet(template);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Soal");
                      XLSX.writeFile(wb, "Template_Soal_UKOM.xlsx");
                    }}
                    className="px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Template Excel</span>
                  </button>
                  <button 
                    onClick={() => {
                      setEditingSoal(null);
                      setSoalForm({
                        id: 'S' + Math.floor(Math.random() * 10000),
                        kategori: 'TWK',
                        tipeSoal: 'Umum',
                        jabatanFungsional: '',
                        jenjang: 'Umum',
                        pertanyaan: '',
                        pilihanA: '',
                        pilihanB: '',
                        pilihanC: '',
                        pilihanD: '',
                        pilihanE: '',
                        jawabanBenar: 'A',
                        bobotNilai: '5'
                      });
                      setShowSoalModal(true);
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Soal</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button 
                  onClick={downloadTemplate}
                  className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-600 hover:border-blue-100 transition-all"
                  title="Download Template Bank Soal"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <label className="cursor-pointer p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-600 hover:border-blue-100 transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Soal</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleUploadBankSoal} disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="relative w-full md:w-96">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Cari nama atau nomor peserta..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={jenjangFilter}
                onChange={e => setJenjangFilter(e.target.value)}
                className="px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all"
              >
                <option value="Semua">Semua Filter</option>
                {availableFilters.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {activeTab === 'SOAL' ? 'ID' : 'Rank'}
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {activeTab === 'SOAL' ? 'Pertanyaan' : 'Data Peserta'}
                  </th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {activeTab === 'SOAL' ? 'Kategori / Tipe' : 'Jenjang'}
                  </th>
                  {activeTab === 'HASIL' ? (
                    <>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">TWK</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">TIU</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">TKP</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Total</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Waktu</th>
                    </>
                  ) : activeTab === 'PESERTA' ? (
                    <>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tgl Lahir</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Jabatan / Jenjang</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeTab === 'HASIL' ? (
                  filteredHasil.map((h, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i < 3 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                          {i + 1}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div>
                          <p className="text-sm font-black text-gray-900">{h.nama}</p>
                          <p className="text-[10px] font-mono font-bold text-gray-400">{h.noPeserta}</p>
                          <p className="text-[9px] font-bold text-blue-600 uppercase mt-1">{h.jabatanFungsional}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {h.jenjang || '-'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center font-bold text-gray-600">{h.nilaiTwk}</td>
                      <td className="px-8 py-6 text-center font-bold text-gray-600">{h.nilaiTiu}</td>
                      <td className="px-8 py-6 text-center font-bold text-gray-600">{h.nilaiTkp}</td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full font-black text-sm">
                            {h.totalNilai}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest ${
                            h.nilaiTwk >= PASSING_GRADE.TWK && 
                            h.nilaiTiu >= PASSING_GRADE.TIU && 
                            h.nilaiTkp >= PASSING_GRADE.TKP 
                              ? 'text-emerald-500' 
                              : 'text-rose-500'
                          }`}>
                            {h.nilaiTwk >= PASSING_GRADE.TWK && 
                             h.nilaiTiu >= PASSING_GRADE.TIU && 
                             h.nilaiTkp >= PASSING_GRADE.TKP 
                               ? 'Lulus PG' 
                               : 'Tidak Lulus PG'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-bold text-gray-500">{h.tanggalUjian}</p>
                        <p className="text-[10px] text-gray-400">{h.waktuSelesai}</p>
                      </td>
                    </tr>
                  ))
                ) : activeTab === 'PESERTA' ? (
                  filteredPeserta.map((p, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-8 py-6 text-xs font-bold text-gray-400">#{i + 1}</td>
                      <td className="px-8 py-6">
                        <div>
                          <p className="text-sm font-black text-gray-900">{p.nama}</p>
                          <p className="text-[10px] font-mono font-bold text-gray-400">{p.noPeserta}</p>
                          <p className="text-[9px] font-bold text-blue-600 uppercase mt-1">{p.jabatanFungsional}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {p.jenjang || '-'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-xs font-bold text-gray-500">{p.tanggalLahir}</td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          p.statusUjian === 'Sudah' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {p.statusUjian}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => handlePrintCard(p)}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-emerald-600 hover:border-emerald-100 transition-all"
                            title="Cetak Kartu Ujian"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingPeserta(p);
                              setPesertaForm(p);
                              setShowPesertaModal(true);
                            }}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-600 hover:border-blue-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleResetStatus(p.noPeserta)}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-amber-600 hover:border-amber-100 transition-all"
                            title="Reset Status Ujian"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeletePeserta(p.noPeserta)}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-rose-600 hover:border-rose-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  bankSoal.filter(s => 
                    s.pertanyaan.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    s.id.includes(searchTerm)
                  ).map((s, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-8 py-6 text-xs font-bold text-gray-400">{s.id}</td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2">{s.pertanyaan}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit">
                            {s.kategori}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit ${
                            s.tipeSoal === 'Umum' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {s.tipeSoal}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-black text-gray-900">{s.jabatanFungsional || 'SEMUA JABATAN'}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase">{s.jenjang || 'SEMUA JENJANG'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => {
                              setEditingSoal(s);
                              setSoalForm(s);
                              setShowSoalModal(true);
                            }}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-600 hover:border-blue-100 transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('Hapus soal ini?')) {
                                // Logic for delete soal could be added to spreadsheetService
                                alert('Fitur hapus soal akan segera hadir.');
                              }
                            }}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-rose-600 hover:border-rose-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Peserta Modal */}
      {showPesertaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="bg-blue-600 p-8 text-white">
              <h2 className="text-xl font-black uppercase tracking-tighter">{editingPeserta ? 'Edit Peserta' : 'Tambah Peserta Baru'}</h2>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Lengkapi data peserta ujian CAT</p>
            </div>
            <form onSubmit={handleSavePeserta} className="p-8 space-y-6">
              {!editingPeserta && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Cari dari Data Pegawai</label>
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Ketik nama atau NIP..."
                      value={pegawaiSearch}
                      onChange={e => setPegawaiSearch(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    />
                  </div>
                  {pegawaiSearch && (
                    <div className="mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-50 z-10 relative">
                      {allPegawai
                        .filter(p => p.nama.toLowerCase().includes(pegawaiSearch.toLowerCase()) || p.nip.includes(pegawaiSearch))
                        .slice(0, 5)
                        .map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPesertaForm({
                                ...pesertaForm,
                                noPeserta: p.nip,
                                nama: p.nama,
                                tanggalLahir: p.tanggalLahir || '',
                                jabatanFungsional: p.jabatan || '',
                                jenjang: '', // Will be filled manually or from other logic
                                unitKerja: p.unitKerja || '',
                                fotoUrl: p.foto || '',
                                password: generateDefaultPassword()
                              });
                              setPegawaiSearch('');
                            }}
                            className="w-full px-6 py-4 text-left hover:bg-blue-50 transition-all flex items-center justify-between group"
                          >
                            <div>
                              <p className="text-xs font-black text-gray-900 group-hover:text-blue-600">{p.nama}</p>
                              <p className="text-[10px] font-mono font-bold text-gray-400">{p.nip}</p>
                            </div>
                            <Plus className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100" />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nomor Peserta / NIP</label>
                  <input 
                    type="text" 
                    value={pesertaForm.noPeserta}
                    onChange={e => setPesertaForm({ ...pesertaForm, noPeserta: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    required
                    disabled={!!editingPeserta}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={pesertaForm.nama}
                    onChange={e => setPesertaForm({ ...pesertaForm, nama: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Tanggal Lahir (YYYY-MM-DD)</label>
                  <input 
                    type="text" 
                    value={pesertaForm.tanggalLahir}
                    onChange={e => setPesertaForm({ ...pesertaForm, tanggalLahir: e.target.value })}
                    placeholder="Contoh: 1990-12-31"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Jabatan Fungsional</label>
                    <select 
                      value={pesertaForm.jabatanFungsional}
                      onChange={e => setPesertaForm({ ...pesertaForm, jabatanFungsional: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      required
                    >
                      <option value="">Pilih Jabatan</option>
                      {JABATAN_LIST.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Jenjang Jabatan</label>
                    <select 
                      value={pesertaForm.jenjang}
                      onChange={e => setPesertaForm({ ...pesertaForm, jenjang: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      required
                    >
                      <option value="">Pilih Jenjang</option>
                      {JENJANG_LIST.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Unit Kerja</label>
                  <input 
                    type="text" 
                    value={pesertaForm.unitKerja}
                    onChange={e => setPesertaForm({ ...pesertaForm, unitKerja: e.target.value })}
                    placeholder="Contoh: Dit. TI"
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">URL Foto Peserta</label>
                  <input 
                    type="text" 
                    value={pesertaForm.fotoUrl}
                    onChange={e => setPesertaForm({ ...pesertaForm, fotoUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Password Login (Otomatis)</label>
                  <input 
                    type="text" 
                    value={pesertaForm.password}
                    onChange={e => setPesertaForm({ ...pesertaForm, password: e.target.value })}
                    placeholder="Password akan digenerate otomatis"
                    className="w-full px-6 py-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-sm font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  />
                  <p className="text-[9px] text-gray-400 italic ml-4">Kombinasi Huruf Kapital, Angka, dan Simbol</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Status Ujian</label>
                  <select 
                    value={pesertaForm.statusUjian}
                    onChange={e => setPesertaForm({ ...pesertaForm, statusUjian: e.target.value as any })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                  >
                    <option value="Belum">Belum Ujian</option>
                    <option value="Sudah">Sudah Ujian</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPesertaModal(false);
                    setPegawaiSearch('');
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Soal Modal */}
      {showSoalModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="bg-indigo-600 p-8 text-white">
              <h2 className="text-xl font-black uppercase tracking-tighter">{editingSoal ? 'Edit Soal' : 'Tambah Soal Baru'}</h2>
              <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-80">Kelola bank soal ujian CAT</p>
            </div>
            <form onSubmit={handleSaveSoal} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Kategori</label>
                  <select 
                    value={soalForm.kategori}
                    onChange={e => setSoalForm({ ...soalForm, kategori: e.target.value as any })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    required
                  >
                    <option value="TWK">TWK</option>
                    <option value="TIU">TIU</option>
                    <option value="TKP">TKP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Tipe Soal</label>
                  <select 
                    value={soalForm.tipeSoal}
                    onChange={e => setSoalForm({ ...soalForm, tipeSoal: e.target.value as any })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    required
                  >
                    <option value="Umum">Umum (Semua)</option>
                    <option value="Khusus">Khusus (Jabatan/Jenjang)</option>
                  </select>
                </div>
              </div>

              {soalForm.tipeSoal === 'Khusus' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Jabatan Fungsional</label>
                    <select 
                      value={soalForm.jabatanFungsional}
                      onChange={e => setSoalForm({ ...soalForm, jabatanFungsional: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                      required
                    >
                      <option value="">Pilih Jabatan</option>
                      {JABATAN_LIST.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Jenjang Jabatan</label>
                    <select 
                      value={soalForm.jenjang}
                      onChange={e => setSoalForm({ ...soalForm, jenjang: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                      required
                    >
                      <option value="">Pilih Jenjang</option>
                      <option value="Umum">Umum</option>
                      {JENJANG_LIST.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Pertanyaan</label>
                <textarea 
                  value={soalForm.pertanyaan}
                  onChange={e => setSoalForm({ ...soalForm, pertanyaan: e.target.value })}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all min-h-[100px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {['A', 'B', 'C', 'D', 'E'].map(opt => (
                  <div key={opt} className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Pilihan {opt}</label>
                    <input 
                      type="text" 
                      value={(soalForm as any)[`pilihan${opt}`]}
                      onChange={e => setSoalForm({ ...soalForm, [`pilihan${opt}`]: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Jawaban Benar</label>
                  <select 
                    value={soalForm.jawabanBenar}
                    onChange={e => setSoalForm({ ...soalForm, jawabanBenar: e.target.value })}
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    required
                  >
                    {['A', 'B', 'C', 'D', 'E'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Bobot Nilai</label>
                  <input 
                    type="text" 
                    value={soalForm.bobotNilai}
                    onChange={e => setSoalForm({ ...soalForm, bobotNilai: e.target.value })}
                    placeholder='Contoh: 5 atau {"A":5,"B":4...}'
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowSoalModal(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[300] flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="text-white font-black uppercase tracking-widest text-xs">Sedang Mengunggah Soal...</p>
        </div>
      )}
    </div>
  );
};

export default UkomAdminPage;
