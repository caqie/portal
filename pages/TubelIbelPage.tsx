import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, formatPegawaiName, DEFAULT_TEMPLATE_LOGO } from '../constants';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai } from '../types';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';

export interface TubelIbelRecord {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  golRuang: string;
  jenisProgram: 'TUGAS_BELAJAR' | 'IZIN_BELAJAR' | 'PERPANJANGAN_TUBEL';
  jenjang: 'D4' | 'S1' | 'S2' | 'S3' | 'Spesialis';
  universitas: string;
  fakultasProdi: string;
  akreditasiProdi: 'Unggul / A' | 'Baik Sekali / B' | 'Internasional';
  lokasiKampus: 'Dalam Negeri' | 'Luar Negeri';
  negaraKampus: string;
  sumberDana: 'APBN (DIPA DJKI)' | 'LPDP' | 'Bappenas' | 'Beasiswa Luar Negeri (AAS/Chevening/Stuned)' | 'Biaya Mandiri (Ibel)' | 'Mitra Donor';
  tahunMulai: number;
  tahunSelesaiTarget: number;
  semesterSaatIni: number;
  ipkTerakhir: number;
  nomorSk: string;
  tmtSk: string;
  tmtSelesaiSk: string;
  pejabatPenetap: string;
  status: 'Pengajuan' | 'Verifikasi Berkas' | 'Aktif Kuliah' | 'Perpanjangan' | 'Lulus / Selesai' | 'Pengaktifan Kembali' | 'Dibatalkan';
  judulTesisDisertasi?: string;
  catatan?: string;
  laporanSemester?: {
    semester: number;
    ipk: number;
    keterangan: string;
    tanggalLapor: string;
    statusVerifikasi: 'Disetujui' | 'Perlu Perbaikan';
  }[];
}

const INITIAL_TUBEL_DATA: TubelIbelRecord[] = [
  {
    id: 'TB-2026-001',
    nip: '199203152014021002',
    nama: 'DIMAS ADITYA PRATAMA, S.H., M.H.',
    jabatan: 'Pemeriksa Paten Ahli Muda',
    unitKerja: 'Direktorat Paten, DTLST dan Rahasia Dagang',
    golRuang: 'III/c',
    jenisProgram: 'TUGAS_BELAJAR',
    jenjang: 'S3',
    universitas: 'Melbourne Law School - University of Melbourne',
    fakultasProdi: 'Doctor of Philosophy in Intellectual Property Law',
    akreditasiProdi: 'Internasional',
    lokasiKampus: 'Luar Negeri',
    negaraKampus: 'Australia',
    sumberDana: 'LPDP',
    tahunMulai: 2024,
    tahunSelesaiTarget: 2027,
    semesterSaatIni: 4,
    ipkTerakhir: 3.92,
    nomorSk: 'SEK-KP.06.02-1204',
    tmtSk: '2024-02-01',
    tmtSelesaiSk: '2027-01-31',
    pejabatPenetap: 'Sekretaris Jenderal Kemenkumham',
    status: 'Aktif Kuliah',
    judulTesisDisertasi: 'Comparative Analysis of AI-Generated Inventions and Patentability Standards in ASEAN and Australia',
    catatan: 'Beasiswa LPDP Target Targeted Group ASN. Progres riset disertasi berjalan lancar.',
    laporanSemester: [
      { semester: 1, ipk: 3.90, keterangan: 'Coursework completion with High Distinction', tanggalLapor: '2024-07-20', statusVerifikasi: 'Disetujui' },
      { semester: 2, ipk: 3.95, keterangan: 'Passed Confirmation of Candidature Examination', tanggalLapor: '2024-12-15', statusVerifikasi: 'Disetujui' },
      { semester: 3, ipk: 3.92, keterangan: 'Data gathering & doctrinal comparative research', tanggalLapor: '2025-07-10', statusVerifikasi: 'Disetujui' }
    ]
  },
  {
    id: 'TB-2026-002',
    nip: '198905202010122001',
    nama: 'RATNA KUSUMA DEWI, S.T., M.Kom.',
    jabatan: 'Pranata Komputer Ahli Pertama',
    unitKerja: 'Direktorat Teknologi Informasi KI',
    golRuang: 'III/b',
    jenisProgram: 'TUGAS_BELAJAR',
    jenjang: 'S2',
    universitas: 'Institut Teknologi Bandung (ITB)',
    fakultasProdi: 'Magister Informatika - Cyber Security & AI',
    akreditasiProdi: 'Unggul / A',
    lokasiKampus: 'Dalam Negeri',
    negaraKampus: 'Indonesia',
    sumberDana: 'APBN (DIPA DJKI)',
    tahunMulai: 2025,
    tahunSelesaiTarget: 2027,
    semesterSaatIni: 2,
    ipkTerakhir: 3.85,
    nomorSk: 'W.1-KP.06.02-882',
    tmtSk: '2025-08-01',
    tmtSelesaiSk: '2027-07-31',
    pejabatPenetap: 'Direktur Jenderal Kekayaan Intelektual',
    status: 'Aktif Kuliah',
    judulTesisDisertasi: 'Sistem Deteksi Kemiripan Logo Merek Otomatis Berbasis Deep Learning Vision Transformer',
    catatan: 'Dibiayai melalui DIPA DJKI Program Penguatan Kapasitas SDM TI Kekayaan Intelektual.',
    laporanSemester: [
      { semester: 1, ipk: 3.85, keterangan: 'Menyelesaikan 18 SKS mata kuliah dasar & lanjut', tanggalLapor: '2026-01-25', statusVerifikasi: 'Disetujui' }
    ]
  },
  {
    id: 'TB-2026-003',
    nip: '199511082019011003',
    nama: 'FAJAR NUGRAHA, S.H.',
    jabatan: 'Analis Kekayaan Intelektual Ahli Pertama',
    unitKerja: 'Direktorat Hak Cipta dan Desain Industri',
    golRuang: 'III/a',
    jenisProgram: 'IZIN_BELAJAR',
    jenjang: 'S2',
    universitas: 'Universitas Indonesia (UI)',
    fakultasProdi: 'Magister Ilmu Hukum - Konsentrasi Hukum Ekonomi & KI',
    akreditasiProdi: 'Unggul / A',
    lokasiKampus: 'Dalam Negeri',
    negaraKampus: 'Indonesia',
    sumberDana: 'Biaya Mandiri (Ibel)',
    tahunMulai: 2024,
    tahunSelesaiTarget: 2026,
    semesterSaatIni: 4,
    ipkTerakhir: 3.78,
    nomorSk: 'SDM.1-KP.06.03-341',
    tmtSk: '2024-08-15',
    tmtSelesaiSk: '2026-08-14',
    pejabatPenetap: 'Sekretaris DJKI',
    status: 'Lulus / Selesai',
    judulTesisDisertasi: 'Perlindungan Hak Cipta Terhadap Karya Seni Digital Non-Fungible Token (NFT) di Indonesia',
    catatan: 'Telah lulus yudisium pada Juli 2026 dan mengajukan penyesuaian ijazah.',
    laporanSemester: [
      { semester: 1, ipk: 3.75, keterangan: 'Lulus 16 SKS', tanggalLapor: '2025-01-10', statusVerifikasi: 'Disetujui' },
      { semester: 2, ipk: 3.80, keterangan: 'Lulus 16 SKS', tanggalLapor: '2025-07-12', statusVerifikasi: 'Disetujui' },
      { semester: 3, ipk: 3.78, keterangan: 'Seminar Proposal Tesis', tanggalLapor: '2026-01-15', statusVerifikasi: 'Disetujui' },
      { semester: 4, ipk: 3.80, keterangan: 'Sidang Tesis & Yudisium', tanggalLapor: '2026-07-28', statusVerifikasi: 'Disetujui' }
    ]
  },
  {
    id: 'TB-2026-004',
    nip: '198708142011012002',
    nama: 'DRS. BAMBANG HENDRAWAN, M.Si.',
    jabatan: 'Pemeriksa Merek Ahli Madya',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    golRuang: 'IV/a',
    jenisProgram: 'PERPANJANGAN_TUBEL',
    jenjang: 'S3',
    universitas: 'Universitas Gadjah Mada (UGM)',
    fakultasProdi: 'Doktor Ilmu Hukum',
    akreditasiProdi: 'Unggul / A',
    lokasiKampus: 'Dalam Negeri',
    negaraKampus: 'Indonesia',
    sumberDana: 'Bappenas',
    tahunMulai: 2022,
    tahunSelesaiTarget: 2026,
    semesterSaatIni: 8,
    ipkTerakhir: 3.88,
    nomorSk: 'SEK-KP.06.02-210',
    tmtSk: '2022-09-01',
    tmtSelesaiSk: '2026-08-31',
    pejabatPenetap: 'Sekretaris Jenderal',
    status: 'Perpanjangan',
    judulTesisDisertasi: 'Rekonstruksi Perlindungan Indikasi Geografis Produk Pertanian Berbasis Kearifan Lokal',
    catatan: 'Permohonan perpanjangan semester 7-8 disetujui karena publikasi jurnal internasional bereputasi.',
    laporanSemester: []
  }
];

export const TubelIbelPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperadmin, canEdit, logActivity } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'daftar' | 'monitoring' | 'perpanjangan' | 'generator' | 'regulasi'>('daftar');
  const [tubelList, setTubelList] = useState<TubelIbelRecord[]>(INITIAL_TUBEL_DATA);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<'Semua' | 'TUGAS_BELAJAR' | 'IZIN_BELAJAR' | 'PERPANJANGAN_TUBEL'>('Semua');
  const [filterJenjang, setFilterJenjang] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterLokasi, setFilterLokasi] = useState<string>('Semua');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TubelIbelRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<TubelIbelRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<TubelIbelRecord>>({
    jenisProgram: 'TUGAS_BELAJAR',
    jenjang: 'S2',
    akreditasiProdi: 'Unggul / A',
    lokasiKampus: 'Dalam Negeri',
    negaraKampus: 'Indonesia',
    sumberDana: 'LPDP',
    tahunMulai: new Date().getFullYear(),
    tahunSelesaiTarget: new Date().getFullYear() + 2,
    semesterSaatIni: 1,
    ipkTerakhir: 0,
    status: 'Pengajuan',
    tmtSk: new Date().toISOString().split('T')[0],
    tmtSelesaiSk: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
    pejabatPenetap: 'Sekretaris Jenderal'
  });

  // Modal Laporan Semester
  const [isLaporanModalOpen, setIsLaporanModalOpen] = useState(false);
  const [laporanForm, setLaporanForm] = useState({
    semester: 1,
    ipk: 3.5,
    keterangan: '',
    tanggalLapor: new Date().toISOString().split('T')[0],
    statusVerifikasi: 'Disetujui' as const
  });

  // Generator Document State
  const [genDocType, setGenDocType] = useState<'SK_TUBEL' | 'REKOMENDASI_IBEL' | 'KET_SELESAI' | 'PENGAKTIFAN_KEMBALI'>('SK_TUBEL');
  const [genSelectedId, setGenSelectedId] = useState<string>('');
  const [genNomorSurat, setGenNomorSurat] = useState<string>('SEK-KP.06.02-892');
  const [genTglSurat, setGenTglSurat] = useState<string>(new Date().toISOString().split('T')[0]);
  const [genPenandatangan, setGenPenandatangan] = useState<string>('Sekretaris Jenderal Kemenkumham RI');

  // Success Notification
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPegawai();
  }, []);

  const loadPegawai = async () => {
    setLoading(true);
    try {
      const p = await fetchPegawaiFromSheets();
      setPegawaiList(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered List
  const filteredData = useMemo(() => {
    return tubelList.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchSearch = item.nama.toLowerCase().includes(q) ||
        item.nip.includes(q) ||
        item.universitas.toLowerCase().includes(q) ||
        item.fakultasProdi.toLowerCase().includes(q);
      
      const matchJenis = filterJenis === 'Semua' || item.jenisProgram === filterJenis;
      const matchJenjang = filterJenjang === 'Semua' || item.jenjang === filterJenjang;
      const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
      const matchLokasi = filterLokasi === 'Semua' || item.lokasiKampus === filterLokasi;

      return matchSearch && matchJenis && matchJenjang && matchStatus && matchLokasi;
    });
  }, [tubelList, searchQuery, filterJenis, filterJenjang, filterStatus, filterLokasi]);

  // Statistics
  const stats = useMemo(() => {
    const total = tubelList.length;
    const tubel = tubelList.filter(t => t.jenisProgram === 'TUGAS_BELAJAR').length;
    const ibel = tubelList.filter(t => t.jenisProgram === 'IZIN_BELAJAR').length;
    const aktif = tubelList.filter(t => t.status === 'Aktif Kuliah' || t.status === 'Perpanjangan').length;
    const lulus = tubelList.filter(t => t.status === 'Lulus / Selesai' || t.status === 'Pengaktifan Kembali').length;
    const luarNegeri = tubelList.filter(t => t.lokasiKampus === 'Luar Negeri').length;
    return { total, tubel, ibel, aktif, lulus, luarNegeri };
  }, [tubelList]);

  // Handlers CRUD
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setSelectedRecord(null);
    setFormData({
      jenisProgram: 'TUGAS_BELAJAR',
      jenjang: 'S2',
      akreditasiProdi: 'Unggul / A',
      lokasiKampus: 'Dalam Negeri',
      negaraKampus: 'Indonesia',
      sumberDana: 'LPDP',
      tahunMulai: new Date().getFullYear(),
      tahunSelesaiTarget: new Date().getFullYear() + 2,
      semesterSaatIni: 1,
      ipkTerakhir: 3.5,
      status: 'Pengajuan',
      tmtSk: new Date().toISOString().split('T')[0],
      tmtSelesaiSk: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0],
      pejabatPenetap: 'Sekretaris Jenderal'
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (record: TubelIbelRecord) => {
    setIsEditMode(true);
    setSelectedRecord(record);
    setFormData({ ...record });
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nip || !formData.universitas || !formData.fakultasProdi) {
      alert('Mohon lengkapi NIP Pegawai, Universitas, dan Program Studi.');
      return;
    }

    const p = pegawaiList.find(peg => peg.nip === formData.nip);

    if (isEditMode && selectedRecord) {
      const updatedList = tubelList.map(item => {
        if (item.id === selectedRecord.id) {
          return {
            ...item,
            ...formData,
            nama: p ? formatPegawaiName(p.nama) : formData.nama || item.nama,
            jabatan: p?.jabatan || formData.jabatan || item.jabatan,
            unitKerja: p?.unitKerja || formData.unitKerja || item.unitKerja,
            golRuang: p?.golRuang || formData.golRuang || item.golRuang
          } as TubelIbelRecord;
        }
        return item;
      });
      setTubelList(updatedList);
      setSuccessMsg(`Data Tugas Belajar/Izin Belajar ${formData.nama || selectedRecord.nama} berhasil diperbarui.`);
      logActivity('UPDATE', 'Tugas Belajar & Ibel', `Update data Tubel/Ibel: ${formData.nama || selectedRecord.nama}`);
    } else {
      const newRec: TubelIbelRecord = {
        id: `TB-${Date.now()}`,
        nip: formData.nip,
        nama: p ? formatPegawaiName(p.nama) : (formData.nama || 'Pegawai DJKI'),
        jabatan: p?.jabatan || formData.jabatan || 'Fungsional Umum',
        unitKerja: p?.unitKerja || formData.unitKerja || 'Sekretariat DJKI',
        golRuang: p?.golRuang || formData.golRuang || 'III/a',
        jenisProgram: formData.jenisProgram || 'TUGAS_BELAJAR',
        jenjang: formData.jenjang || 'S2',
        universitas: formData.universitas || '',
        fakultasProdi: formData.fakultasProdi || '',
        akreditasiProdi: formData.akreditasiProdi || 'Unggul / A',
        lokasiKampus: formData.lokasiKampus || 'Dalam Negeri',
        negaraKampus: formData.negaraKampus || 'Indonesia',
        sumberDana: formData.sumberDana || 'LPDP',
        tahunMulai: Number(formData.tahunMulai) || new Date().getFullYear(),
        tahunSelesaiTarget: Number(formData.tahunSelesaiTarget) || (new Date().getFullYear() + 2),
        semesterSaatIni: Number(formData.semesterSaatIni) || 1,
        ipkTerakhir: Number(formData.ipkTerakhir) || 0,
        nomorSk: formData.nomorSk || `SEK-KP.06.02-${Math.floor(Math.random() * 900 + 100)}`,
        tmtSk: formData.tmtSk || new Date().toISOString().split('T')[0],
        tmtSelesaiSk: formData.tmtSelesaiSk || new Date().toISOString().split('T')[0],
        pejabatPenetap: formData.pejabatPenetap || 'Sekretaris Jenderal',
        status: formData.status || 'Pengajuan',
        judulTesisDisertasi: formData.judulTesisDisertasi || '',
        catatan: formData.catatan || '',
        laporanSemester: []
      };
      setTubelList([newRec, ...tubelList]);
      setSuccessMsg(`Usulan Tugas Belajar/Izin Belajar untuk ${newRec.nama} berhasil ditambahkan.`);
      logActivity('CREATE', 'Tugas Belajar & Ibel', `Registrasi Tubel/Ibel: ${newRec.nama} (${newRec.jenjang} - ${newRec.universitas})`);
    }

    setIsFormModalOpen(false);
    setShowSuccess(true);
  };

  const handleDeleteConfirm = () => {
    if (!recordToDelete) return;
    const updated = tubelList.filter(t => t.id !== recordToDelete.id);
    setTubelList(updated);
    setIsDeleteModalOpen(false);
    setSuccessMsg(`Data ${recordToDelete.nama} berhasil dihapus.`);
    setShowSuccess(true);
    logActivity('DELETE', 'Tugas Belajar & Ibel', `Menghapus data Tubel/Ibel: ${recordToDelete.nama}`);
  };

  // Add Semester Report
  const handleSaveLaporanSemester = () => {
    if (!selectedRecord) return;
    const currentReports = selectedRecord.laporanSemester || [];
    const newReports = [
      ...currentReports.filter(r => r.semester !== laporanForm.semester),
      { ...laporanForm }
    ].sort((a, b) => a.semester - b.semester);

    const updatedList = tubelList.map(item => {
      if (item.id === selectedRecord.id) {
        return {
          ...item,
          semesterSaatIni: Math.max(item.semesterSaatIni, laporanForm.semester),
          ipkTerakhir: laporanForm.ipk,
          laporanSemester: newReports
        };
      }
      return item;
    });

    setTubelList(updatedList);
    setSelectedRecord({
      ...selectedRecord,
      semesterSaatIni: Math.max(selectedRecord.semesterSaatIni, laporanForm.semester),
      ipkTerakhir: laporanForm.ipk,
      laporanSemester: newReports
    });
    setIsLaporanModalOpen(false);
    setSuccessMsg(`Laporan kemajuan semester ${laporanForm.semester} berhasil ditambahkan.`);
    setShowSuccess(true);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredData.map((item, idx) => ({
      No: idx + 1,
      NIP: item.nip,
      Nama: item.nama,
      Jabatan: item.jabatan,
      'Unit Kerja': item.unitKerja,
      'Gol/Ruang': item.golRuang,
      'Jenis Program': item.jenisProgram,
      Jenjang: item.jenjang,
      Universitas: item.universitas,
      'Program Studi': item.fakultasProdi,
      Akreditasi: item.akreditasiProdi,
      Lokasi: item.lokasiKampus,
      Negara: item.negaraKampus,
      'Sumber Beasiswa/Dana': item.sumberDana,
      'Tahun Mulai': item.tahunMulai,
      'Target Selesai': item.tahunSelesaiTarget,
      Semester: item.semesterSaatIni,
      IPK: item.ipkTerakhir,
      'Nomor SK': item.nomorSk,
      'TMT SK': item.tmtSk,
      'TMT Selesai': item.tmtSelesaiSk,
      Status: item.status,
      'Judul Tesis/Disertasi': item.judulTesisDisertasi || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tubel_Ibel_DJKI');
    XLSX.writeFile(wb, `Data_Tugas_Belajar_Izin_Belajar_DJKI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const genRecord = useMemo(() => {
    if (!genSelectedId) return tubelList[0] || null;
    return tubelList.find(t => t.id === genSelectedId) || tubelList[0] || null;
  }, [tubelList, genSelectedId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fadeIn text-gray-900">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Konfirmasi Hapus Data Tubel / Ibel"
        message={`Apakah Anda yakin ingin menghapus data Tugas Belajar / Izin Belajar atas nama ${recordToDelete?.nama}? Tindakan ini tidak dapat dibatalkan.`}
      />

      {/* TOP HEADER WITH BACK BUTTON */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start md:items-center gap-4">
            {/* BACK BUTTON */}
            <button
              onClick={() => navigate('/tupoksi-sdm')}
              className="h-12 w-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all shadow-md shrink-0 active:scale-95"
              title="Kembali ke Matriks Tupoksi SDM"
            >
              <i className="bi bi-arrow-left text-xl"></i>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Sub-Tim 2: Pengembangan Kompetensi (Bangkom)
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
                Tugas Belajar &amp; Izin Belajar (Tubel / Ibel)
              </h1>
              <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                Manajemen Beasiswa S1/S2/S3/Spesialis, Monitoring Capaian IPK &amp; Progres Semester, Generator Draf SK Tubel, Izin Belajar Mandiri, serta Pengaktifan Kembali ASN DJKI.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
            >
              <i className="bi bi-file-earmark-excel-fill text-emerald-400"></i>
              <span>Export Excel</span>
            </button>
            {canEdit && (
              <button
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
              >
                <i className="bi bi-plus-circle-fill"></i>
                <span>+ Usulan Tubel / Ibel</span>
              </button>
            )}
          </div>
        </div>

        {/* QUICK STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Total Peserta</span>
            <p className="text-xl font-black text-white mt-0.5">{stats.total}</p>
            <span className="text-[9px] text-emerald-300 font-semibold">Pegawai Terdaftar</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Tugas Belajar</span>
            <p className="text-xl font-black text-indigo-300 mt-0.5">{stats.tubel}</p>
            <span className="text-[9px] text-white/80 font-bold">Beasiswa Penuh</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Izin Belajar</span>
            <p className="text-xl font-black text-cyan-300 mt-0.5">{stats.ibel}</p>
            <span className="text-[9px] text-white/80 font-bold">Biaya Mandiri</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Aktif Studi</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{stats.aktif}</p>
            <span className="text-[9px] text-emerald-300 font-bold">Sedang Kuliah</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Luar Negeri</span>
            <p className="text-xl font-black text-amber-300 mt-0.5">{stats.luarNegeri}</p>
            <span className="text-[9px] text-amber-200 font-bold">Kampus Global</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Lulus / Selesai</span>
            <p className="text-xl font-black text-blue-300 mt-0.5">{stats.lulus}</p>
            <span className="text-[9px] text-blue-200 font-bold">Alumni Tubel</span>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('daftar')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'daftar'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="bi bi-person-lines-fill"></i>
          <span>Daftar Peserta Tubel / Ibel</span>
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'monitoring'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="bi bi-graph-up-arrow"></i>
          <span>Monitoring Semester &amp; IPK</span>
        </button>

        <button
          onClick={() => setActiveTab('perpanjangan')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'perpanjangan'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="bi bi-clock-history"></i>
          <span>Perpanjangan &amp; Pengaktifan</span>
        </button>

        <button
          onClick={() => setActiveTab('generator')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'generator'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="bi bi-file-earmark-pdf-fill"></i>
          <span>Generator SK &amp; Rekomendasi</span>
        </button>

        <button
          onClick={() => setActiveTab('regulasi')}
          className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'regulasi'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <i className="bi bi-journal-bookmark-fill"></i>
          <span>Pedoman &amp; Syarat (SE MenPAN)</span>
        </button>
      </div>

      {/* TAB 1: DAFTAR PESERTA TUBEL & IBEL */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari Nama, NIP, Kampus, Prodi..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={filterJenis}
                onChange={e => setFilterJenis(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none text-gray-700"
              >
                <option value="Semua">Semua Program</option>
                <option value="TUGAS_BELAJAR">Tugas Belajar (Beasiswa)</option>
                <option value="IZIN_BELAJAR">Izin Belajar (Mandiri)</option>
                <option value="PERPANJANGAN_TUBEL">Perpanjangan Tubel</option>
              </select>

              <select
                value={filterJenjang}
                onChange={e => setFilterJenjang(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none text-gray-700"
              >
                <option value="Semua">Semua Jenjang</option>
                <option value="D4">D4</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3 / Doktoral</option>
                <option value="Spesialis">Spesialis</option>
              </select>

              <select
                value={filterLokasi}
                onChange={e => setFilterLokasi(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none text-gray-700"
              >
                <option value="Semua">Semua Lokasi</option>
                <option value="Dalam Negeri">Dalam Negeri</option>
                <option value="Luar Negeri">Luar Negeri</option>
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none text-gray-700"
              >
                <option value="Semua">Semua Status</option>
                <option value="Aktif Kuliah">Aktif Kuliah</option>
                <option value="Pengajuan">Pengajuan</option>
                <option value="Perpanjangan">Perpanjangan</option>
                <option value="Lulus / Selesai">Lulus / Selesai</option>
                <option value="Pengaktifan Kembali">Pengaktifan Kembali</option>
              </select>
            </div>
          </div>

          {/* TABLE OF RECORDS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3.5">Pegawai &amp; Unit Kerja</th>
                    <th className="px-4 py-3.5">Program &amp; Jenjang</th>
                    <th className="px-4 py-3.5">Universitas &amp; Prodi</th>
                    <th className="px-4 py-3.5">Beasiswa / Dana</th>
                    <th className="px-4 py-3.5 text-center">Semester / IPK</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-all">
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{item.nama}</div>
                        <div className="text-[11px] text-gray-500 font-mono">NIP. {item.nip} • {item.golRuang}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{item.jabatan}</div>
                        <div className="text-[9px] text-blue-600 font-semibold">{item.unitKerja}</div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                          item.jenisProgram === 'TUGAS_BELAJAR'
                            ? 'bg-indigo-100 text-indigo-800'
                            : item.jenisProgram === 'IZIN_BELAJAR'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.jenisProgram.replace('_', ' ')}
                        </span>
                        <div className="font-bold text-gray-900 mt-1">Jenjang: <span className="text-blue-600">{item.jenjang}</span></div>
                        <div className="text-[10px] text-gray-500">Target: {item.tahunMulai} - {item.tahunSelesaiTarget}</div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900">{item.universitas}</div>
                        <div className="text-[11px] text-gray-600">{item.fakultasProdi}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            item.lokasiKampus === 'Luar Negeri' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <i className={`bi ${item.lokasiKampus === 'Luar Negeri' ? 'bi-globe-americas' : 'bi-geo-alt-fill'} mr-1`}></i>
                            {item.negaraKampus}
                          </span>
                          <span className="text-gray-400">• Akreditasi: {item.akreditasiProdi}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900">{item.sumberDana}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">SK: {item.nomorSk}</div>
                        <div className="text-[9px] text-gray-400">TMT: {item.tmtSk}</div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                          <span className="text-[10px] font-bold text-gray-500">Semester {item.semesterSaatIni}</span>
                          <span className="text-xs font-black text-emerald-600">IPK: {item.ipkTerakhir > 0 ? item.ipkTerakhir.toFixed(2) : '-'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'Aktif Kuliah'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Lulus / Selesai'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'Perpanjangan'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'Pengajuan'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRecord(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all"
                            title="Detail & Laporan Progres"
                          >
                            <i className="bi bi-eye-fill"></i>
                          </button>
                          
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all"
                                title="Edit Data"
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              
                              <button
                                onClick={() => {
                                  setRecordToDelete(item);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all"
                                title="Hapus Data"
                              >
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        <i className="bi bi-inbox text-3xl block mb-2 text-gray-300"></i>
                        Tidak ada data Tugas Belajar / Izin Belajar yang sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONITORING SEMESTER & IPK */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-start gap-3">
            <i className="bi bi-info-circle-fill text-blue-600 text-lg shrink-0 mt-0.5"></i>
            <div className="text-xs text-blue-900 leading-relaxed">
              <p className="font-bold mb-0.5">Pedoman Monitoring Evaluasi Berkala:</p>
              Sesuai SE MenPAN-RB No. 28/2021, setiap ASN yang menjalani Tugas Belajar wajib menyampaikan Laporan Kemajuan Pendidikan setiap semester kepada Pejabat Pembina Kepegawaian (PPK) melalui Pokja SDM dengan melampirkan Kartu Hasil Studi (KHS) dan transkrip nilai terverifikasi.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tubelList.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        item.jenisProgram === 'TUGAS_BELAJAR' ? 'bg-indigo-100 text-indigo-800' : 'bg-cyan-100 text-cyan-800'
                      }`}>
                        {item.jenisProgram.replace('_', ' ')} • {item.jenjang}
                      </span>
                      <h4 className="text-sm font-black text-gray-900 mt-1.5">{item.nama}</h4>
                      <p className="text-[11px] text-gray-500 font-mono">NIP. {item.nip}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 font-bold block">IPK Kumulatif</span>
                      <span className="text-lg font-black text-emerald-600">{item.ipkTerakhir.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <p className="font-bold text-gray-800">{item.universitas}</p>
                    <p className="text-gray-600 text-[11px]">{item.fakultasProdi}</p>
                    {item.judulTesisDisertasi && (
                      <p className="text-gray-500 text-[10px] italic mt-1.5">
                        <i className="bi bi-book mr-1"></i>
                        "{item.judulTesisDisertasi}"
                      </p>
                    )}
                  </div>

                  {/* PROGRES SEMESTER BAR */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-600 mb-1">
                      <span>Progres Studi: Semester {item.semesterSaatIni}</span>
                      <span>Target: {item.tahunMulai} - {item.tahunSelesaiTarget}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (item.semesterSaatIni / (item.jenjang === 'S3' ? 8 : item.jenjang === 'S2' ? 4 : 8)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* RIWAYAT LAPORAN SEMESTER */}
                  <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Riwayat KHS Terverifikasi</p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.laporanSemester && item.laporanSemester.length > 0 ? (
                        item.laporanSemester.map(sem => (
                          <span key={sem.semester} className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                            Sem {sem.semester}: IPK {sem.ipk.toFixed(2)}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Belum ada unggahan KHS semester</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    item.status === 'Aktif Kuliah' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {item.status}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setSelectedRecord(item);
                        setLaporanForm({
                          semester: item.semesterSaatIni + 1,
                          ipk: item.ipkTerakhir || 3.5,
                          keterangan: '',
                          tanggalLapor: new Date().toISOString().split('T')[0],
                          statusVerifikasi: 'Disetujui'
                        });
                        setIsLaporanModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <i className="bi bi-plus-circle"></i>
                      <span>Input KHS Semester</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PERPANJANGAN & PENGAKTIFAN KEMBALI */}
      {activeTab === 'perpanjangan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ALUR PERPANJANGAN */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg">
                  <i className="bi bi-clock-history"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Ketentuan Perpanjangan Tugas Belajar</h3>
                  <p className="text-[10px] text-gray-500">Maksimal 1 (satu) tahun atau 2 (dua) semester</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <p className="font-bold text-amber-900 mb-1">Persyaratan Pengajuan Perpanjangan:</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px]">
                    <li>Surat Rekomendasi resmi dari Pembimbing Akademik / Dekan Universitas</li>
                    <li>Transkrip Nilai / KHS seluruh semester yang telah dijalani</li>
                    <li>Rencana Jadwal Penyelesaian Tugas Akhir / Disertasi (Time Table)</li>
                    <li>Surat Persetujuan Perpanjangan Pendanaan dari Pemberi Beasiswa (LPDP/DIPA)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ALUR PENGAKTIFAN KEMBALI */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg">
                  <i className="bi bi-person-check-fill"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Pengaktifan Kembali Hak ASN Pasca Lulus</h3>
                  <p className="text-[10px] text-gray-500">Pemberitahuan resmi selesai tugas belajar ke BKN &amp; Biro Kepegawaian</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <p className="font-bold text-emerald-900 mb-1">Dokumen Kelengkapan Lulusan:</p>
                  <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
                    <li>Fotokopi Ijazah dan Transkrip Nilai yang telah dilegalisir</li>
                    <li>Surat Keputusan Penyetaraan Ijazah Luar Negeri (khusus lulusan luar negeri dari Kemendikbudristek)</li>
                    <li>Laporan Akhir Tugas Belajar &amp; Hardcopy/Softcopy Karya Ilmiah Tesis/Disertasi</li>
                    <li>Surat Keterangan Lulus dari Perguruan Tinggi</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GENERATOR SK & REKOMENDASI */}
      {activeTab === 'generator' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
              <i className="bi bi-file-earmark-text text-blue-600"></i>
              Konfigurasi Generator Dokumen Resmi Tubel / Ibel
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pilih Dokumen</label>
                <select
                  value={genDocType}
                  onChange={e => setGenDocType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="SK_TUBEL">Draf SK Tugas Belajar (Kemenkumham)</option>
                  <option value="REKOMENDASI_IBEL">Surat Rekomendasi Izin Belajar Mandiri</option>
                  <option value="KET_SELESAI">Surat Keterangan Selesai Tugas Belajar</option>
                  <option value="PENGAKTIFAN_KEMBALI">SK Pengaktifan Kembali Tugas Pegawai</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pilih Pegawai / Peserta</label>
                <select
                  value={genSelectedId}
                  onChange={e => setGenSelectedId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  {tubelList.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nama} - {item.universitas} ({item.jenjang})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nomor Surat</label>
                <input
                  type="text"
                  value={genNomorSurat}
                  onChange={e => setGenNomorSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tanggal Surat</label>
                <input
                  type="date"
                  value={genTglSurat}
                  onChange={e => setGenTglSurat(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-2"
              >
                <i className="bi bi-printer-fill"></i>
                <span>Cetak / Simpan PDF Dokumen</span>
              </button>
            </div>
          </div>

          {/* DOKUMEN PREVIEW (PRINT AREA) */}
          {genRecord && (
            <div ref={printRef} className="bg-white p-8 md:p-12 rounded-2xl border border-gray-200 shadow-md max-w-4xl mx-auto font-serif text-gray-950 leading-relaxed">
              {/* KOP SURAT */}
              <div className="text-center border-b-4 border-double border-gray-900 pb-4 mb-6">
                <h3 className="text-sm md:text-base font-black uppercase tracking-wider">KEMENTERIAN HUKUM REPUBLIK INDONESIA</h3>
                <h2 className="text-base md:text-lg font-black uppercase tracking-wide">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</h2>
                <p className="text-[11px] font-sans text-gray-600">Jalan H.R. Rasuna Said Kav. 8-9, Kuningan, Jakarta Selatan 12940</p>
                <p className="text-[10px] font-sans text-gray-600">Telepon: (021) 57905611 | Laman: www.dgip.go.id</p>
              </div>

              {/* JUDUL DOKUMEN */}
              <div className="text-center mb-6">
                <h4 className="text-sm font-black uppercase underline tracking-wider">
                  {genDocType === 'SK_TUBEL' && 'SURAT KEPUTUSAN PEMBERIAN TUGAS BELAJAR'}
                  {genDocType === 'REKOMENDASI_IBEL' && 'SURAT REKOMENDASI IZIN BELAJAR'}
                  {genDocType === 'KET_SELESAI' && 'SURAT KETERANGAN SELESAI TUGAS BELAJAR'}
                  {genDocType === 'PENGAKTIFAN_KEMBALI' && 'SURAT KEPUTUSAN PENGAKTIFAN KEMBALI PEGAWAI'}
                </h4>
                <p className="text-xs font-sans mt-0.5">NOMOR: {genNomorSurat}</p>
              </div>

              {/* ISI DOKUMEN */}
              <div className="text-xs font-sans space-y-4">
                <p>
                  Yang bertanda tangan di bawah ini:
                </p>
                <div className="pl-6 space-y-1">
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Nama</span><span className="col-span-3 font-bold">: {genPenandatangan}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Instansi</span><span className="col-span-3 font-bold">: Direktorat Jenderal Kekayaan Intelektual</span></div>
                </div>

                <p>
                  Memberikan rekomendasi / penetapan kepada Pegawai Negeri Sipil di bawah ini:
                </p>

                <div className="pl-6 space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Nama Lengkap</span><span className="col-span-3 font-bold text-gray-900">: {genRecord.nama}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">NIP</span><span className="col-span-3 font-mono">: {genRecord.nip}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Pangkat / Gol. Ruang</span><span className="col-span-3">: {genRecord.golRuang}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Jabatan</span><span className="col-span-3">: {genRecord.jabatan}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Unit Kerja</span><span className="col-span-3">: {genRecord.unitKerja}</span></div>
                </div>

                <p>
                  Untuk menempuh pendidikan formal jalur {genRecord.jenisProgram.replace('_', ' ')} pada:
                </p>

                <div className="pl-6 space-y-1.5 bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Jenjang Pendidikan</span><span className="col-span-3 font-bold text-blue-900">: Program {genRecord.jenjang}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Perguruan Tinggi</span><span className="col-span-3 font-bold">: {genRecord.universitas}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Fakultas / Program Studi</span><span className="col-span-3">: {genRecord.fakultasProdi}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Lokasi / Negara</span><span className="col-span-3">: {genRecord.lokasiKampus} ({genRecord.negaraKampus})</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Sumber Pembiayaan</span><span className="col-span-3">: {genRecord.sumberDana}</span></div>
                  <div className="grid grid-cols-4 gap-2"><span className="text-gray-600">Masa Studi</span><span className="col-span-3">: {genRecord.tahunMulai} s.d. {genRecord.tahunSelesaiTarget}</span></div>
                </div>

                <p className="text-justify leading-relaxed">
                  Demikian surat ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya dan kepada yang bersangkutan diwajibkan mematuhi seluruh ketentuan disiplin ASN serta menyampaikan laporan kemajuan belajar secara berkala setiap semester.
                </p>

                <div className="pt-8 flex justify-end">
                  <div className="text-center w-64">
                    <p>Jakarta, {genTglSurat}</p>
                    <p className="font-bold mt-1">An. MENTERI HUKUM RI</p>
                    <p className="text-[11px] font-bold">Sekretaris Direktorat Jenderal,</p>
                    <div className="h-20"></div>
                    <p className="font-black underline uppercase">ANGGARA PRASETYA, S.H., M.H.</p>
                    <p className="text-[10px] font-mono text-gray-600">NIP. 197805122002121001</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REGULASI & PEDOMAN */}
      {activeTab === 'regulasi' && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <i className="bi bi-book-fill text-blue-600"></i>
              Regulasi Terkait Tugas Belajar &amp; Izin Belajar ASN
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-900 text-sm mb-1">1. SE MenPAN-RB No. 28 Tahun 2021</h4>
                <p className="text-gray-600 leading-relaxed">
                  Mengatur tentang Pengembangan Kompetensi Pegawai Negeri Sipil Melalui Jalur Pendidikan Formal (Tugas Belajar), persyaratan akreditasi prodi minimal B / Baik Sekali, batas usia maksimal usulan, dan pendanaan beasiswa.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-900 text-sm mb-1">2. PermenPAN-RB No. 1 Tahun 2023</h4>
                <p className="text-gray-600 leading-relaxed">
                  Mengatur jabatan fungsional, konversi angka kredit saat menjalani tugas belajar, dan pengakuan ijazah baru yang relevan dengan tugas dan fungsi instansi DJKI.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TAMBAH / EDIT TUBEL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {isEditMode ? 'Edit Data Tugas Belajar / Izin Belajar' : 'Tambah Usulan Tugas Belajar / Izin Belajar'}
                </h3>
                <p className="text-xs text-gray-500">Lengkapi formulir pendaftaran beasiswa dan izin belajar ASN DJKI</p>
              </div>
              <button onClick={() => setIsFormModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pilih Pegawai (NIP &amp; Nama)</label>
                <SearchableSelect
                  options={pegawaiList.map(p => ({
                    value: p.nip,
                    label: `${formatPegawaiName(p.nama)} (${p.nip}) - ${p.unitKerja}`
                  }))}
                  value={formData.nip || ''}
                  onChange={val => {
                    const selected = pegawaiList.find(p => p.nip === val);
                    setFormData({
                      ...formData,
                      nip: val,
                      nama: selected ? formatPegawaiName(selected.nama) : '',
                      jabatan: selected?.jabatan || '',
                      unitKerja: selected?.unitKerja || '',
                      golRuang: selected?.golRuang || 'III/a'
                    });
                  }}
                  placeholder="Cari NIP atau Nama Pegawai..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Jenis Program</label>
                  <select
                    value={formData.jenisProgram}
                    onChange={e => setFormData({ ...formData, jenisProgram: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  >
                    <option value="TUGAS_BELAJAR">Tugas Belajar (Beasiswa / DIPA)</option>
                    <option value="IZIN_BELAJAR">Izin Belajar (Mandiri / Swadana)</option>
                    <option value="PERPANJANGAN_TUBEL">Perpanjangan Tugas Belajar</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Jenjang Pendidikan</label>
                  <select
                    value={formData.jenjang}
                    onChange={e => setFormData({ ...formData, jenjang: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  >
                    <option value="D4">D4</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2 / Magister</option>
                    <option value="S3">S3 / Doktoral</option>
                    <option value="Spesialis">Spesialis</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Perguruan Tinggi / Universitas</label>
                  <input
                    type="text"
                    value={formData.universitas || ''}
                    onChange={e => setFormData({ ...formData, universitas: e.target.value })}
                    placeholder="Contoh: Universitas Indonesia / Univ of Melbourne"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Fakultas / Program Studi</label>
                  <input
                    type="text"
                    value={formData.fakultasProdi || ''}
                    onChange={e => setFormData({ ...formData, fakultasProdi: e.target.value })}
                    placeholder="Contoh: Magister Ilmu Hukum Kekayaan Intelektual"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Lokasi Kampus</label>
                  <select
                    value={formData.lokasiKampus}
                    onChange={e => setFormData({ ...formData, lokasiKampus: e.target.value as any, negaraKampus: e.target.value === 'Dalam Negeri' ? 'Indonesia' : formData.negaraKampus || 'Australia' })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  >
                    <option value="Dalam Negeri">Dalam Negeri</option>
                    <option value="Luar Negeri">Luar Negeri</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Negara</label>
                  <input
                    type="text"
                    value={formData.negaraKampus || 'Indonesia'}
                    onChange={e => setFormData({ ...formData, negaraKampus: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Akreditasi Prodi</label>
                  <select
                    value={formData.akreditasiProdi}
                    onChange={e => setFormData({ ...formData, akreditasiProdi: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  >
                    <option value="Unggul / A">Unggul / A</option>
                    <option value="Baik Sekali / B">Baik Sekali / B</option>
                    <option value="Internasional">Internasional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Sumber Beasiswa / Dana</label>
                  <select
                    value={formData.sumberDana}
                    onChange={e => setFormData({ ...formData, sumberDana: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  >
                    <option value="LPDP">LPDP (Kemenkeu)</option>
                    <option value="APBN (DIPA DJKI)">APBN (DIPA DJKI)</option>
                    <option value="Bappenas">Beasiswa Pusbindiklatren Bappenas</option>
                    <option value="Beasiswa Luar Negeri (AAS/Chevening/Stuned)">Beasiswa Luar Negeri (AAS/Chevening)</option>
                    <option value="Biaya Mandiri (Ibel)">Biaya Mandiri (Izin Belajar)</option>
                    <option value="Mitra Donor">Mitra Donor Internasional</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Tahun Mulai</label>
                  <input
                    type="number"
                    value={formData.tahunMulai || 2026}
                    onChange={e => setFormData({ ...formData, tahunMulai: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Target Selesai</label>
                  <input
                    type="number"
                    value={formData.tahunSelesaiTarget || 2028}
                    onChange={e => setFormData({ ...formData, tahunSelesaiTarget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nomor SK Tubel / Rekomendasi</label>
                  <input
                    type="text"
                    value={formData.nomorSk || ''}
                    onChange={e => setFormData({ ...formData, nomorSk: e.target.value })}
                    placeholder="Contoh: SEK-KP.06.02-889"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Status Studi</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                  >
                    <option value="Pengajuan">Pengajuan</option>
                    <option value="Verifikasi Berkas">Verifikasi Berkas</option>
                    <option value="Aktif Kuliah">Aktif Kuliah</option>
                    <option value="Perpanjangan">Perpanjangan</option>
                    <option value="Lulus / Selesai">Lulus / Selesai</option>
                    <option value="Pengaktifan Kembali">Pengaktifan Kembali</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Rencana Judul Tesis / Disertasi (Opsional)</label>
                <input
                  type="text"
                  value={formData.judulTesisDisertasi || ''}
                  onChange={e => setFormData({ ...formData, judulTesisDisertasi: e.target.value })}
                  placeholder="Topik penelitian bidang Kekayaan Intelektual..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg"
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Daftarkan Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL PESERTA */}
      {isDetailModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase bg-indigo-100 text-indigo-800">
                  {selectedRecord.jenisProgram.replace('_', ' ')} • {selectedRecord.jenjang}
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">{selectedRecord.nama}</h3>
                <p className="text-xs text-gray-500 font-mono">NIP. {selectedRecord.nip} • {selectedRecord.jabatan}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Universitas</span>
                  <p className="font-bold text-gray-900">{selectedRecord.universitas}</p>
                  <p className="text-gray-600 text-[11px]">{selectedRecord.fakultasProdi}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block uppercase">Beasiswa &amp; Lokasi</span>
                  <p className="font-bold text-gray-900">{selectedRecord.sumberDana}</p>
                  <p className="text-gray-600 text-[11px]">{selectedRecord.lokasiKampus} ({selectedRecord.negaraKampus})</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Judul Tesis / Disertasi</span>
                <p className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-blue-950 font-medium italic">
                  {selectedRecord.judulTesisDisertasi || 'Belum diinput / masih dalam tahap perkuliahan mata kuliah'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Riwayat Laporan Semester (KHS)</span>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setLaporanForm({
                          semester: selectedRecord.semesterSaatIni + 1,
                          ipk: selectedRecord.ipkTerakhir || 3.5,
                          keterangan: '',
                          tanggalLapor: new Date().toISOString().split('T')[0],
                          statusVerifikasi: 'Disetujui'
                        });
                        setIsLaporanModalOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Tambah Laporan KHS
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedRecord.laporanSemester && selectedRecord.laporanSemester.length > 0 ? (
                    selectedRecord.laporanSemester.map(sem => (
                      <div key={sem.semester} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">Semester {sem.semester} • IPK: {sem.ipk.toFixed(2)}</p>
                          <p className="text-gray-500 text-[11px]">{sem.keterangan || 'Laporan kemajuan reguler'}</p>
                          <p className="text-gray-400 text-[9px]">Tanggal lapor: {sem.tanggalLapor}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                          {sem.statusVerifikasi}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl">Belum ada data laporan kemajuan semester.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 bg-gray-900 text-white font-bold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT LAPORAN SEMESTER */}
      {isLaporanModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-black text-gray-900 mb-1">Input Laporan KHS Semester</h3>
            <p className="text-xs text-gray-500 mb-4">Catat capaian IPK dan perkembangan studi semester ini</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Semester</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={laporanForm.semester}
                  onChange={e => setLaporanForm({ ...laporanForm, semester: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">IPK Semester Ini (Skala 4.00)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={laporanForm.ipk}
                  onChange={e => setLaporanForm({ ...laporanForm, ipk: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Catatan / Keterangan Kemajuan</label>
                <textarea
                  rows={2}
                  value={laporanForm.keterangan}
                  onChange={e => setLaporanForm({ ...laporanForm, keterangan: e.target.value })}
                  placeholder="Contoh: Lulus mata kuliah metodologi riset dan ujian proposal tesis"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setIsLaporanModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveLaporanSemester}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg"
                >
                  Simpan KHS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TubelIbelPage;
