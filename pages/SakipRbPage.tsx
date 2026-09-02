import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';

interface LkeAreaItem {
  id: string;
  nomor: string;
  indikator: string;
  targetKemenpan: string;
  skor: number;
  bobot: number;
  dataDukung: string;
  linkEviden?: string;
  status: 'Lengkap & Terverifikasi' | 'Menunggu Verifikasi Tim RB' | 'Belum Lengkap';
}

interface IkuSdmItem {
  id: string;
  indikator: string;
  targetTahunan: string;
  realisasiSdSaatIni: string;
  persentaseCapaian: number;
  subTimPenanggungJawab: string;
  status: 'Tercapai' | 'On Track' | 'Perlu Akselerasi';
}

interface WbsRecord {
  id: string;
  tanggal: string;
  jenisLaporan: 'Benturan Kepentingan' | 'Pengaduan WBS' | 'Pelaporan Gratifikasi';
  uraian: string;
  tindakLanjut: string;
  status: 'Selesai Ditindaklanjuti' | 'Dalam Proses Telaah' | 'Nihil / Sesuai Prosedur';
}

const INITIAL_LKE_SDM: LkeAreaItem[] = [
  {
    id: 'LKE-01',
    nomor: '3.1.a',
    indikator: 'Perencanaan Kebutuhan Pegawai Sesuai Peta Jabatan (ABK)',
    targetKemenpan: 'Penyusunan ABK dan Anjab Terintegrasi SIASN',
    skor: 4.8,
    bobot: 5.0,
    dataDukung: 'Dokumen ABK 2026, Peta Jabatan DJKI, Surat Usulan Formasi ke Biro SDM',
    status: 'Lengkap & Terverifikasi'
  },
  {
    id: 'LKE-02',
    nomor: '3.1.b',
    indikator: 'Pola Mutasi & Rotasi Internal Berbasis Sistem Merit',
    targetKemenpan: 'Tersedianya Pola Karier dan Talent Pool Jabatan Fungsional',
    skor: 4.5,
    bobot: 5.0,
    dataDukung: 'Matriks Mutasi Internal Semester 1, Notula Rapat Tim Penilai Kinerja',
    status: 'Lengkap & Terverifikasi'
  },
  {
    id: 'LKE-03',
    nomor: '3.2.a',
    indikator: 'Pengembangan Kompetensi Pegawai Berbasis Kebutuhan (TNA & 20 JP)',
    targetKemenpan: 'Minimal 80% Pegawai Memenuhi 20 JP Bangkom Per Tahun',
    skor: 4.7,
    bobot: 5.0,
    dataDukung: 'Log Bangkom Portal SDM, Rekap Sertifikat Diklat Teknis & Fungsional KI',
    status: 'Lengkap & Terverifikasi'
  },
  {
    id: 'LKE-04',
    nomor: '3.2.b',
    indikator: 'Penetapan Kinerja Individu Selaras Dengan Perjanjian Kinerja Unit (SKP)',
    targetKemenpan: '100% Penetapan SKP Awal Tahun & Evaluasi Periodik Triwulanan',
    skor: 4.9,
    bobot: 5.0,
    dataDukung: 'Rekap SKP E-Kinerja BKN, Matriks Cascading IKU Pimpinan ke Anggota Tim',
    status: 'Lengkap & Terverifikasi'
  },
  {
    id: 'LKE-05',
    nomor: '3.3.a',
    indikator: 'Penegakan Aturan Disiplin, Kode Etik & Kode Perilaku ASN',
    targetKemenpan: 'Penanganan Pelanggaran Disiplin Sesuai PP 94/2021 Tepat Waktu',
    skor: 5.0,
    bobot: 5.0,
    dataDukung: 'Laporan Monitoring Presensi Bulanan, SK Tim Pemeriksa Hukdis, Pakta Integritas',
    status: 'Lengkap & Terverifikasi'
  },
  {
    id: 'LKE-06',
    nomor: '3.3.b',
    indikator: 'Kepatuhan LHKPN & LHKASN Serta Bebas Benturan Kepentingan',
    targetKemenpan: 'Tingkat Kepatuhan 100% Sebelum Batas Akhir Pelaporan',
    skor: 5.0,
    bobot: 5.0,
    dataDukung: 'Tanda Terima Elektronik e-LHKPN KPK & Rekapitulasi Pelaporan Serentak SDM',
    status: 'Lengkap & Terverifikasi'
  }
];

const INITIAL_IKU: IkuSdmItem[] = [
  {
    id: 'IKU-01',
    indikator: 'Indeks Profesionalitas ASN (IP-ASN) DJKI',
    targetTahunan: '85.00 Poin (Kategori Sangat Tinggi)',
    realisasiSdSaatIni: '87.40 Poin',
    persentaseCapaian: 102.8,
    subTimPenanggungJawab: 'Sub Tim Bangkom & Karier',
    status: 'Tercapai'
  },
  {
    id: 'IKU-02',
    indikator: 'Persentase Pegawai Memenuhi Minimal 20 Jam Pelajaran (JP) Diklat',
    targetTahunan: '85.0 % Pegawai',
    realisasiSdSaatIni: '92.5 % Pegawai',
    persentaseCapaian: 108.8,
    subTimPenanggungJawab: 'Sub Tim Bangkom',
    status: 'Tercapai'
  },
  {
    id: 'IKU-03',
    indikator: 'Tingkat Kepatuhan Pelaporan LHKPN & LHKASN Pegawai',
    targetTahunan: '100.0 %',
    realisasiSdSaatIni: '100.0 % (15 Wajib Lapor)',
    persentaseCapaian: 100.0,
    subTimPenanggungJawab: 'Sub Tim Manajemen Karier & Disiplin',
    status: 'Tercapai'
  },
  {
    id: 'IKU-04',
    indikator: 'Ketepatan Waktu Penyelesaian Layanan Kenaikan Pangkat & Gaji Berkala',
    targetTahunan: '98.0 %',
    realisasiSdSaatIni: '99.2 %',
    persentaseCapaian: 101.2,
    subTimPenanggungJawab: 'Sub Tim Perencanaan & Layanan',
    status: 'Tercapai'
  },
  {
    id: 'IKU-05',
    indikator: 'Indeks Implementasi Core Values BerAKHLAK & Employer Branding',
    targetTahunan: '80.00 Poin',
    realisasiSdSaatIni: '82.60 Poin',
    persentaseCapaian: 103.2,
    subTimPenanggungJawab: 'Seluruh Sub Tim SDM',
    status: 'Tercapai'
  }
];

const INITIAL_WBS: WbsRecord[] = [
  {
    id: 'WBS-01',
    tanggal: '2026-07-10',
    jenisLaporan: 'Benturan Kepentingan',
    uraian: 'Deklarasi bebas benturan kepentingan dalam tim seleksi mutasi internal pegawai',
    tindakLanjut: 'Penandatanganan pakta integritas dan penetapan tim independen',
    status: 'Selesai Ditindaklanjuti'
  },
  {
    id: 'WBS-02',
    tanggal: '2026-08-02',
    jenisLaporan: 'Pelaporan Gratifikasi',
    uraian: 'Laporan penerimaan cinderamata seminar oleh pejabat fungsional pemeriksa',
    tindakLanjut: 'Telah diserahkan dan diverifikasi oleh Unit Pengendalian Gratifikasi (UPG)',
    status: 'Selesai Ditindaklanjuti'
  }
];

export const SakipRbPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperadmin, canEdit, logActivity } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'lke' | 'iku' | 'ipasn' | 'pengawasan'>('lke');
  const [lkeList, setLkeList] = useState<LkeAreaItem[]>(INITIAL_LKE_SDM);
  const [ikuList, setIkuList] = useState<IkuSdmItem[]>(INITIAL_IKU);
  const [wbsList, setWbsList] = useState<WbsRecord[]>(INITIAL_WBS);

  // Success Notification
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals for LKE
  const [isLkeModalOpen, setIsLkeModalOpen] = useState(false);
  const [isEditLkeMode, setIsEditLkeMode] = useState(false);
  const [selectedLke, setSelectedLke] = useState<LkeAreaItem | null>(null);
  const [lkeForm, setLkeForm] = useState<Partial<LkeAreaItem>>({
    nomor: '',
    indikator: '',
    targetKemenpan: '',
    skor: 5.0,
    bobot: 5.0,
    dataDukung: '',
    status: 'Lengkap & Terverifikasi'
  });

  // Modals for IKU
  const [isIkuModalOpen, setIsIkuModalOpen] = useState(false);
  const [isEditIkuMode, setIsEditIkuMode] = useState(false);
  const [selectedIku, setSelectedIku] = useState<IkuSdmItem | null>(null);
  const [ikuForm, setIkuForm] = useState<Partial<IkuSdmItem>>({
    indikator: '',
    targetTahunan: '',
    realisasiSdSaatIni: '',
    persentaseCapaian: 100,
    subTimPenanggungJawab: 'Sub Tim Bangkom',
    status: 'Tercapai'
  });

  // Modals for WBS
  const [isWbsModalOpen, setIsWbsModalOpen] = useState(false);
  const [isEditWbsMode, setIsEditWbsMode] = useState(false);
  const [selectedWbs, setSelectedWbs] = useState<WbsRecord | null>(null);
  const [wbsForm, setWbsForm] = useState<Partial<WbsRecord>>({
    tanggal: new Date().toISOString().split('T')[0],
    jenisLaporan: 'Benturan Kepentingan',
    uraian: '',
    tindakLanjut: '',
    status: 'Selesai Ditindaklanjuti'
  });

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'LKE' | 'IKU' | 'WBS'; id: string; name: string } | null>(null);

  // Total LKE Score
  const totalSkorLke = lkeList.reduce((acc, curr) => acc + curr.skor, 0);
  const totalBobotLke = lkeList.reduce((acc, curr) => acc + curr.bobot, 0);
  const lkeNilaiAkhir = totalBobotLke > 0 ? ((totalSkorLke / totalBobotLke) * 100).toFixed(2) : '0';

  // LKE CRUD Handlers
  const handleOpenAddLke = () => {
    setIsEditLkeMode(false);
    setSelectedLke(null);
    setLkeForm({
      nomor: `3.${lkeList.length + 1}.a`,
      indikator: '',
      targetKemenpan: '',
      skor: 5.0,
      bobot: 5.0,
      dataDukung: '',
      status: 'Lengkap & Terverifikasi'
    });
    setIsLkeModalOpen(true);
  };

  const handleOpenEditLke = (item: LkeAreaItem) => {
    setIsEditLkeMode(true);
    setSelectedLke(item);
    setLkeForm({ ...item });
    setIsLkeModalOpen(true);
  };

  const handleSaveLke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lkeForm.indikator) {
      alert('Mohon isi nama indikator LKE.');
      return;
    }

    if (isEditLkeMode && selectedLke) {
      setLkeList(prev => prev.map(l => l.id === selectedLke.id ? {
        ...l,
        ...lkeForm,
        skor: Number(lkeForm.skor) || 0,
        bobot: Number(lkeForm.bobot) || 0
      } as LkeAreaItem : l));
      setSuccessMsg(`Indikator LKE "${lkeForm.indikator}" berhasil diperbarui.`);
      logActivity('UPDATE', 'SAKIP & RB', `Memperbarui LKE: ${lkeForm.indikator}`);
    } else {
      const newLke: LkeAreaItem = {
        id: `LKE-${Date.now().toString().slice(-4)}`,
        nomor: lkeForm.nomor || '3.x',
        indikator: lkeForm.indikator || '',
        targetKemenpan: lkeForm.targetKemenpan || '',
        skor: Number(lkeForm.skor) || 5.0,
        bobot: Number(lkeForm.bobot) || 5.0,
        dataDukung: lkeForm.dataDukung || 'Tercatat dalam portal eviden RB',
        status: lkeForm.status || 'Lengkap & Terverifikasi'
      };
      setLkeList([...lkeList, newLke]);
      setSuccessMsg(`Indikator LKE baru berhasil ditambahkan.`);
      logActivity('CREATE', 'SAKIP & RB', `Menambah Indikator LKE: ${newLke.indikator}`);
    }

    setIsLkeModalOpen(false);
    setShowSuccess(true);
  };

  // IKU CRUD Handlers
  const handleOpenAddIku = () => {
    setIsEditIkuMode(false);
    setSelectedIku(null);
    setIkuForm({
      indikator: '',
      targetTahunan: '',
      realisasiSdSaatIni: '',
      persentaseCapaian: 100,
      subTimPenanggungJawab: 'Sub Tim Bangkom',
      status: 'Tercapai'
    });
    setIsIkuModalOpen(true);
  };

  const handleOpenEditIku = (item: IkuSdmItem) => {
    setIsEditIkuMode(true);
    setSelectedIku(item);
    setIkuForm({ ...item });
    setIsIkuModalOpen(true);
  };

  const handleSaveIku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ikuForm.indikator) {
      alert('Mohon isi nama IKU.');
      return;
    }

    if (isEditIkuMode && selectedIku) {
      setIkuList(prev => prev.map(i => i.id === selectedIku.id ? {
        ...i,
        ...ikuForm,
        persentaseCapaian: Number(ikuForm.persentaseCapaian) || 0
      } as IkuSdmItem : i));
      setSuccessMsg(`IKU "${ikuForm.indikator}" berhasil diperbarui.`);
      logActivity('UPDATE', 'SAKIP & RB', `Memperbarui IKU: ${ikuForm.indikator}`);
    } else {
      const newIku: IkuSdmItem = {
        id: `IKU-${Date.now().toString().slice(-4)}`,
        indikator: ikuForm.indikator || '',
        targetTahunan: ikuForm.targetTahunan || '',
        realisasiSdSaatIni: ikuForm.realisasiSdSaatIni || '',
        persentaseCapaian: Number(ikuForm.persentaseCapaian) || 100,
        subTimPenanggungJawab: ikuForm.subTimPenanggungJawab || 'Sub Tim SDM',
        status: ikuForm.status || 'Tercapai'
      };
      setIkuList([...ikuList, newIku]);
      setSuccessMsg(`IKU baru berhasil ditambahkan.`);
      logActivity('CREATE', 'SAKIP & RB', `Menambah IKU: ${newIku.indikator}`);
    }

    setIsIkuModalOpen(false);
    setShowSuccess(true);
  };

  // WBS CRUD Handlers
  const handleOpenAddWbs = () => {
    setIsEditWbsMode(false);
    setSelectedWbs(null);
    setWbsForm({
      tanggal: new Date().toISOString().split('T')[0],
      jenisLaporan: 'Benturan Kepentingan',
      uraian: '',
      tindakLanjut: '',
      status: 'Selesai Ditindaklanjuti'
    });
    setIsWbsModalOpen(true);
  };

  const handleOpenEditWbs = (item: WbsRecord) => {
    setIsEditWbsMode(true);
    setSelectedWbs(item);
    setWbsForm({ ...item });
    setIsWbsModalOpen(true);
  };

  const handleSaveWbs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wbsForm.uraian) {
      alert('Mohon isi uraian laporan / kegiatan.');
      return;
    }

    if (isEditWbsMode && selectedWbs) {
      setWbsList(prev => prev.map(w => w.id === selectedWbs.id ? {
        ...w,
        ...wbsForm
      } as WbsRecord : w));
      setSuccessMsg(`Catatan pengawasan berhasil diperbarui.`);
      logActivity('UPDATE', 'SAKIP & RB', `Update Pengawasan WBS: ${wbsForm.jenisLaporan}`);
    } else {
      const newWbs: WbsRecord = {
        id: `WBS-${Date.now().toString().slice(-4)}`,
        tanggal: wbsForm.tanggal || new Date().toISOString().split('T')[0],
        jenisLaporan: wbsForm.jenisLaporan || 'Benturan Kepentingan',
        uraian: wbsForm.uraian || '',
        tindakLanjut: wbsForm.tindakLanjut || '',
        status: wbsForm.status || 'Selesai Ditindaklanjuti'
      };
      setWbsList([...wbsList, newWbs]);
      setSuccessMsg(`Catatan pengawasan baru berhasil ditambahkan.`);
      logActivity('CREATE', 'SAKIP & RB', `Menambah Catatan Pengawasan: ${newWbs.jenisLaporan}`);
    }

    setIsWbsModalOpen(false);
    setShowSuccess(true);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'LKE') {
      setLkeList(prev => prev.filter(l => l.id !== itemToDelete.id));
      setSuccessMsg(`Indikator LKE "${itemToDelete.name}" berhasil dihapus.`);
      logActivity('DELETE', 'SAKIP & RB', `Hapus LKE: ${itemToDelete.name}`);
    } else if (itemToDelete.type === 'IKU') {
      setIkuList(prev => prev.filter(i => i.id !== itemToDelete.id));
      setSuccessMsg(`IKU "${itemToDelete.name}" berhasil dihapus.`);
      logActivity('DELETE', 'SAKIP & RB', `Hapus IKU: ${itemToDelete.name}`);
    } else {
      setWbsList(prev => prev.filter(w => w.id !== itemToDelete.id));
      setSuccessMsg(`Catatan pengawasan berhasil dihapus.`);
      logActivity('DELETE', 'SAKIP & RB', `Hapus WBS: ${itemToDelete.name}`);
    }
    setIsDeleteModalOpen(false);
    setShowSuccess(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 animate-fadeIn text-gray-900">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message={successMsg} />
      
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Konfirmasi Hapus Data"
        message={`Apakah Anda yakin ingin menghapus "${itemToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
      />

      {/* Header Banner with Back Button */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
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
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                  Pokja SDM • Reformasi Birokrasi &amp; Akuntabilitas Kinerja
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
                SAKIP, LKE Reformasi Birokrasi &amp; Indeks SDM
              </h1>
              <p className="text-xs text-blue-200 mt-1 max-w-2xl leading-relaxed">
                Pengelolaan Lembar Kerja Evaluasi (LKE) Area Penataan Sistem Manajemen SDM Aparatur, Perjanjian Kinerja/IKU SDM, Indeks Profesionalitas ASN (IP-ASN), Core Values BerAKHLAK, dan Pengawasan Benturan Kepentingan/WBS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-right">
              <span className="text-[10px] uppercase font-bold text-cyan-200 block">Indeks Nilai LKE SDM</span>
              <span className="text-2xl font-black text-emerald-300">{lkeNilaiAkhir}%</span>
              <span className="text-[9px] text-white/80 block font-bold">Kategori: A (MEMUASKAN)</span>
            </div>
          </div>
        </div>

        {/* Highlight 4 Pilar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[9px] font-bold text-blue-200 uppercase">Indeks IP-ASN</span>
            <p className="text-base font-black text-white mt-0.5">87.40 / 100</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[9px] font-bold text-blue-200 uppercase">Pemenuhan 20 JP</span>
            <p className="text-base font-black text-emerald-300 mt-0.5">92.5% ASN</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[9px] font-bold text-blue-200 uppercase">Kepatuhan LHKPN</span>
            <p className="text-base font-black text-cyan-300 mt-0.5">100.0% (Lengkap)</p>
          </div>
          <div className="bg-white/5 p-3 rounded-xl border border-white/5">
            <span className="text-[9px] font-bold text-blue-200 uppercase">Indeks BerAKHLAK</span>
            <p className="text-base font-black text-amber-300 mt-0.5">82.60 Poin</p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('lke')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'lke' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-ui-checks-grid"></i>
            <span>LKE Area Penataan SDM ({lkeList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('iku')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'iku' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-bullseye"></i>
            <span>IKU &amp; Perjanjian Kinerja SDM ({ikuList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ipasn')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'ipasn' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-award"></i>
            <span>Dimensi IP-ASN &amp; BerAKHLAK</span>
          </button>

          <button
            onClick={() => setActiveTab('pengawasan')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'pengawasan' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-shield-check"></i>
            <span>Benturan Kepentingan &amp; WBS ({wbsList.length})</span>
          </button>
        </div>

        {canEdit && (
          <div>
            {activeTab === 'lke' && (
              <button
                onClick={handleOpenAddLke}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <i className="bi bi-plus-lg"></i>
                <span>+ Indikator LKE</span>
              </button>
            )}
            {activeTab === 'iku' && (
              <button
                onClick={handleOpenAddIku}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <i className="bi bi-plus-lg"></i>
                <span>+ Indikator IKU</span>
              </button>
            )}
            {activeTab === 'pengawasan' && (
              <button
                onClick={handleOpenAddWbs}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <i className="bi bi-plus-lg"></i>
                <span>+ Catatan Pengawasan</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: LKE SDM */}
      {activeTab === 'lke' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase">Lembar Kerja Evaluasi (LKE) RB Area Penataan Sistem SDM</h3>
              <p className="text-xs text-gray-500">Pemenuhan eviden, kriteria penilaian, dan data dukung reformasi birokrasi sub-tim kepegawaian.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="py-3 px-4 w-16">No</th>
                    <th className="py-3 px-4">Indikator &amp; Target KemenPAN-RB</th>
                    <th className="py-3 px-4">Eviden / Data Dukung Terunggah</th>
                    <th className="py-3 px-4 text-center">Skor / Bobot</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {lkeList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {item.nomor}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{item.indikator}</span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">Target: {item.targetKemenpan}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-[11px] text-gray-700 font-medium">
                          {item.dataDukung}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className="text-emerald-700 font-black">{item.skor}</span> / <span className="text-gray-500">{item.bobot}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'Lengkap & Terverifikasi' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditLke(item)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all"
                            title="Edit Indikator LKE & Eviden"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setItemToDelete({ type: 'LKE', id: item.id, name: item.indikator });
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                              title="Hapus Indikator"
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IKU & PERJANJIAN KINERJA */}
      {activeTab === 'iku' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ikuList.map((iku) => (
              <div key={iku.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xs font-black text-gray-900 leading-snug">{iku.indikator}</h4>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase shrink-0 ${
                    iku.status === 'Tercapai' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {iku.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-bold">Target PK</span>
                    <span className="font-bold text-gray-900">{iku.targetTahunan}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase block font-bold">Realisasi</span>
                    <span className="font-black text-emerald-700">{iku.realisasiSdSaatIni}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[10px] text-gray-500 font-bold">PIC: {iku.subTimPenanggungJawab}</span>
                  <span className="font-black text-indigo-700">Capaian: {iku.persentaseCapaian}%</span>
                </div>

                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(iku.persentaseCapaian, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenEditIku(iku)}
                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                  >
                    Edit IKU
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setItemToDelete({ type: 'IKU', id: iku.id, name: iku.indikator });
                        setIsDeleteModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: IP-ASN & BERAKHLAK */}
      {activeTab === 'ipasn' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase">4 Dimensi Indeks Profesionalitas ASN (IP-ASN)</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">1. Dimensi Kualifikasi (Maks. 25)</span>
                  <span className="text-[11px] text-gray-500">Pendidikan formal S1/S2/S3 linear</span>
                </div>
                <span className="font-black text-blue-700 text-sm">24.50 Poin</span>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">2. Dimensi Kompetensi (Maks. 40)</span>
                  <span className="text-[11px] text-gray-500">Diklat 20 JP, sertifikasi teknis &amp; fungsional</span>
                </div>
                <span className="font-black text-emerald-700 text-sm">38.20 Poin</span>
              </div>

              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">3. Dimensi Kinerja (Maks. 30)</span>
                  <span className="text-[11px] text-gray-500">Predikat SKP Baik &amp; Sangat Baik</span>
                </div>
                <span className="font-black text-indigo-700 text-sm">29.10 Poin</span>
              </div>

              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">4. Dimensi Disiplin (Maks. 5)</span>
                  <span className="text-[11px] text-gray-500">Bebas hukuman disiplin sedang/berat</span>
                </div>
                <span className="font-black text-purple-700 text-sm">5.00 Poin</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase">Implementasi Core Values ASN BerAKHLAK</h3>
            <p className="text-xs text-gray-500">Tingkat internalisasi nilai-nilai Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif.</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <span className="font-bold text-gray-800">Berorientasi Pelayanan</span>
                <span className="font-black text-emerald-600">84.2 Poin</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <span className="font-bold text-gray-800">Akuntabel &amp; Loyal</span>
                <span className="font-black text-emerald-600">86.5 Poin</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <span className="font-bold text-gray-800">Kompeten &amp; Adaptif</span>
                <span className="font-black text-emerald-600">81.0 Poin</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <span className="font-bold text-gray-800">Harmonis &amp; Kolaboratif</span>
                <span className="font-black text-emerald-600">83.8 Poin</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PENGAWASAN & WBS */}
      {activeTab === 'pengawasan' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 uppercase">Monitoring Benturan Kepentingan, Pengendalian Gratifikasi &amp; WBS SDM</h3>
            <p className="text-xs text-gray-500">Pencatatan penanganan benturan kepentingan dalam layanan mutasi, promosi, dan tugas kedinasan kepegawaian.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wbsList.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="font-mono text-xs font-black text-indigo-600">{item.jenisLaporan}</span>
                  <span className="text-[10px] text-gray-400">{item.tanggal}</span>
                </div>
                <div className="text-xs">
                  <span className="font-bold text-gray-800 block mb-0.5">Uraian Kasus / Kejadian:</span>
                  <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl">{item.uraian}</p>
                </div>
                <div className="text-xs">
                  <span className="font-bold text-gray-800 block mb-0.5">Tindak Lanjut Penanganan:</span>
                  <p className="text-emerald-700 bg-emerald-50/50 p-2.5 rounded-xl font-medium">{item.tindakLanjut}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase">
                    {item.status}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditWbs(item)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                    >
                      Edit
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setItemToDelete({ type: 'WBS', id: item.id, name: item.jenisLaporan });
                          setIsDeleteModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL LKE */}
      {isLkeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditLkeMode ? 'Edit Indikator LKE SDM' : 'Tambah Indikator LKE Baru'}
              </h3>
              <button onClick={() => setIsLkeModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveLke} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nomor Indikator</label>
                  <input
                    type="text"
                    value={lkeForm.nomor || ''}
                    onChange={(e) => setLkeForm({ ...lkeForm, nomor: e.target.value })}
                    placeholder="Contoh: 3.1.c"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Verifikasi</label>
                  <select
                    value={lkeForm.status}
                    onChange={(e) => setLkeForm({ ...lkeForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Lengkap & Terverifikasi">Lengkap &amp; Terverifikasi</option>
                    <option value="Menunggu Verifikasi Tim RB">Menunggu Verifikasi Tim RB</option>
                    <option value="Belum Lengkap">Belum Lengkap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nama Indikator</label>
                <input
                  type="text"
                  value={lkeForm.indikator || ''}
                  onChange={(e) => setLkeForm({ ...lkeForm, indikator: e.target.value })}
                  placeholder="Uraian indikator penilaian RB..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Target KemenPAN-RB</label>
                <input
                  type="text"
                  value={lkeForm.targetKemenpan || ''}
                  onChange={(e) => setLkeForm({ ...lkeForm, targetKemenpan: e.target.value })}
                  placeholder="Target standar reformasi birokrasi..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Skor Capaian</label>
                  <input
                    type="number"
                    step="0.1"
                    value={lkeForm.skor || 0}
                    onChange={(e) => setLkeForm({ ...lkeForm, skor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Bobot Maksimal</label>
                  <input
                    type="number"
                    step="0.1"
                    value={lkeForm.bobot || 0}
                    onChange={(e) => setLkeForm({ ...lkeForm, bobot: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Eviden &amp; Data Dukung Terunggah</label>
                <textarea
                  rows={2}
                  value={lkeForm.dataDukung || ''}
                  onChange={(e) => setLkeForm({ ...lkeForm, dataDukung: e.target.value })}
                  placeholder="Daftar surat, SK, notula, rekapitulasi..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLkeModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {isEditLkeMode ? 'Simpan Perubahan' : 'Tambah Indikator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IKU */}
      {isIkuModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditIkuMode ? 'Edit IKU SDM' : 'Tambah IKU SDM Baru'}
              </h3>
              <button onClick={() => setIsIkuModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveIku} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nama Indikator Kinerja</label>
                <input
                  type="text"
                  value={ikuForm.indikator || ''}
                  onChange={(e) => setIkuForm({ ...ikuForm, indikator: e.target.value })}
                  placeholder="Contoh: Indeks Profesionalitas ASN..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Target Tahunan</label>
                  <input
                    type="text"
                    value={ikuForm.targetTahunan || ''}
                    onChange={(e) => setIkuForm({ ...ikuForm, targetTahunan: e.target.value })}
                    placeholder="Contoh: 85.0 Poin"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Realisasi</label>
                  <input
                    type="text"
                    value={ikuForm.realisasiSdSaatIni || ''}
                    onChange={(e) => setIkuForm({ ...ikuForm, realisasiSdSaatIni: e.target.value })}
                    placeholder="Contoh: 87.4 Poin"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Persentase Capaian (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ikuForm.persentaseCapaian || 0}
                    onChange={(e) => setIkuForm({ ...ikuForm, persentaseCapaian: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-indigo-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status</label>
                  <select
                    value={ikuForm.status}
                    onChange={(e) => setIkuForm({ ...ikuForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Tercapai">Tercapai</option>
                    <option value="On Track">On Track</option>
                    <option value="Perlu Akselerasi">Perlu Akselerasi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Sub Tim Penanggung Jawab (PIC)</label>
                <input
                  type="text"
                  value={ikuForm.subTimPenanggungJawab || ''}
                  onChange={(e) => setIkuForm({ ...ikuForm, subTimPenanggungJawab: e.target.value })}
                  placeholder="Contoh: Sub Tim Bangkom & Karier"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsIkuModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {isEditIkuMode ? 'Simpan Perubahan' : 'Tambah IKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WBS */}
      {isWbsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditWbsMode ? 'Edit Catatan Pengawasan' : 'Tambah Catatan Pengawasan'}
              </h3>
              <button onClick={() => setIsWbsModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveWbs} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={wbsForm.tanggal || ''}
                    onChange={(e) => setWbsForm({ ...wbsForm, tanggal: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jenis Laporan</label>
                  <select
                    value={wbsForm.jenisLaporan}
                    onChange={(e) => setWbsForm({ ...wbsForm, jenisLaporan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Benturan Kepentingan">Benturan Kepentingan</option>
                    <option value="Pelaporan Gratifikasi">Pelaporan Gratifikasi</option>
                    <option value="Pengaduan WBS">Pengaduan WBS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Uraian Kasus / Kejadian</label>
                <textarea
                  rows={2}
                  value={wbsForm.uraian || ''}
                  onChange={(e) => setWbsForm({ ...wbsForm, uraian: e.target.value })}
                  placeholder="Uraian konteks kegiatan, potensi benturan kepentingan..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  required
                ></textarea>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tindak Lanjut Penanganan</label>
                <textarea
                  rows={2}
                  value={wbsForm.tindakLanjut || ''}
                  onChange={(e) => setWbsForm({ ...wbsForm, tindakLanjut: e.target.value })}
                  placeholder="Langkah pencegahan atau verifikasi yang telah dilakukan..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                ></textarea>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Penanganan</label>
                <select
                  value={wbsForm.status}
                  onChange={(e) => setWbsForm({ ...wbsForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                >
                  <option value="Selesai Ditindaklanjuti">Selesai Ditindaklanjuti</option>
                  <option value="Dalam Proses Telaah">Dalam Proses Telaah</option>
                  <option value="Nihil / Sesuai Prosedur">Nihil / Sesuai Prosedur</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsWbsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {isEditWbsMode ? 'Simpan Catatan' : 'Tambah Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SakipRbPage;
