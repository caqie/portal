import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';

interface HukdisRecord {
  id: string;
  nip: string;
  nama: string;
  unitKerja: string;
  jabatan: string;
  jenisPelanggaran: string;
  tingkatHukdis: 'Ringan' | 'Sedang' | 'Berat';
  jenisSanksi: string;
  nomorSK: string;
  tmtSK: string;
  tmtSelesai?: string;
  statusPenanganan: 'Proses BAP / Pemeriksaan' | 'Ditetapkan SK' | 'Masa Menjalani Sanksi' | 'Selesai / Pulih';
  keterangan: string;
}

interface LhkpnRecord {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  jenisWajibLapor: 'LHKPN (KPK)' | 'LHKASN (KemenPAN-RB)';
  tahunLapor: string;
  statusLapor: 'Sudah Lapor (Terverifikasi Lengkap)' | 'Proses Perbaikan e-Filing' | 'Belum Lapor';
  nomorTandaTerima?: string;
  tanggalLapor?: string;
}

const INITIAL_HUKDIS: HukdisRecord[] = [
  {
    id: 'HKD-001',
    nip: '198805122010121002',
    nama: 'Bambang Irawan, S.Kom.',
    unitKerja: 'Direktorat Teknologi Informasi KI',
    jabatan: 'Pranata Komputer Ahli Pertama',
    jenisPelanggaran: 'Ketidakhadiran tanpa keterangan sah selama 5 hari kerja kumulatif (PP 94/2021 Pasal 11)',
    tingkatHukdis: 'Ringan',
    jenisSanksi: 'Teguran Tertulis oleh Atasan Langsung',
    nomorSK: 'W.1-KP.08.01-112',
    tmtSK: '2026-03-01',
    tmtSelesai: '2026-09-01',
    statusPenanganan: 'Ditetapkan SK',
    keterangan: 'Telah dilakukan BAP dan konseling pembinaan oleh Tim SDM.'
  },
  {
    id: 'HKD-002',
    nip: '199201152015032004',
    nama: 'Rina Wahyuni, S.H.',
    unitKerja: 'Direktorat Merek dan Indikasi Geografis',
    jabatan: 'Pemeriksa Merek Ahli Pertama',
    jenisPelanggaran: 'Keterlambatan penyelesaian permohonan keberatan merek melebihi SLA tanpa alasan justifikasi sah',
    tingkatHukdis: 'Ringan',
    jenisSanksi: 'Pernyataan Tidak Puas Secara Tertulis',
    nomorSK: 'W.1-KP.08.01-145',
    tmtSK: '2026-05-10',
    tmtSelesai: '2026-11-10',
    statusPenanganan: 'Masa Menjalani Sanksi',
    keterangan: 'Evaluasi berkala bulanan pemenuhan kuota target kinerja.'
  }
];

const INITIAL_LHKPN: LhkpnRecord[] = [
  {
    id: 'LHK-001',
    nip: '197508201999031001',
    nama: 'Dr. Hendra Gunawan, S.H., M.H.',
    jabatan: 'Direktur Hak Cipta dan Desain Industri',
    unitKerja: 'Direktorat Hak Cipta dan Desain Industri',
    jenisWajibLapor: 'LHKPN (KPK)',
    tahunLapor: '2026 (Periodik 2025)',
    statusLapor: 'Sudah Lapor (Terverifikasi Lengkap)',
    nomorTandaTerima: 'NHB-2026-KPK-008912',
    tanggalLapor: '2026-02-15'
  },
  {
    id: 'LHK-002',
    nip: '198004152002121002',
    nama: 'Rahmat Hidayat, S.E., M.Si.',
    jabatan: 'Pejabat Pembuat Komitmen (PPK) SDM & Keuangan',
    unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    jenisWajibLapor: 'LHKPN (KPK)',
    tahunLapor: '2026 (Periodik 2025)',
    statusLapor: 'Sudah Lapor (Terverifikasi Lengkap)',
    nomorTandaTerima: 'NHB-2026-KPK-010432',
    tanggalLapor: '2026-02-18'
  },
  {
    id: 'LHK-003',
    nip: '198411032008012003',
    nama: 'Siti Nurhaliza, S.H., LL.M.',
    jabatan: 'Koordinator Pelayanan Hukum & Fasilitasi KI',
    unitKerja: 'Direktorat Kerja Sama dan Pemberdayaan KI',
    jenisWajibLapor: 'LHKPN (KPK)',
    tahunLapor: '2026 (Periodik 2025)',
    statusLapor: 'Sudah Lapor (Terverifikasi Lengkap)',
    nomorTandaTerima: 'NHB-2026-KPK-012984',
    tanggalLapor: '2026-02-22'
  }
];

export const DisiplinLhkpnPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperadmin, canEdit, logActivity } = useAuth();

  const [activeTab, setActiveTab] = useState<'hukdis' | 'lhkpn' | 'bap' | 'edukasi'>('hukdis');
  const [hukdisList, setHukdisList] = useState<HukdisRecord[]>(INITIAL_HUKDIS);
  const [lhkpnList, setLhkpnList] = useState<LhkpnRecord[]>(INITIAL_LHKPN);

  // Success Notification
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Modals for Hukdis
  const [isHukdisModalOpen, setIsHukdisModalOpen] = useState(false);
  const [isEditHukdisMode, setIsEditHukdisMode] = useState(false);
  const [selectedHukdis, setSelectedHukdis] = useState<HukdisRecord | null>(null);
  const [hukdisForm, setHukdisForm] = useState<Partial<HukdisRecord>>({
    nip: '',
    nama: '',
    unitKerja: UNIT_KERJA[0],
    jabatan: '',
    jenisPelanggaran: '',
    tingkatHukdis: 'Ringan',
    jenisSanksi: 'Teguran Lisan / Tertulis',
    nomorSK: 'W.1-KP.08.01-001',
    tmtSK: new Date().toISOString().split('T')[0],
    tmtSelesai: '',
    statusPenanganan: 'Proses BAP / Pemeriksaan',
    keterangan: 'Tercatat dalam rekam jejak kepatuhan ASN'
  });

  // Modals for LHKPN
  const [isLhkpnModalOpen, setIsLhkpnModalOpen] = useState(false);
  const [isEditLhkpnMode, setIsEditLhkpnMode] = useState(false);
  const [selectedLhkpn, setSelectedLhkpn] = useState<LhkpnRecord | null>(null);
  const [lhkpnForm, setLhkpnForm] = useState<Partial<LhkpnRecord>>({
    nip: '',
    nama: '',
    jabatan: '',
    unitKerja: UNIT_KERJA[0],
    jenisWajibLapor: 'LHKPN (KPK)',
    tahunLapor: `${new Date().getFullYear()} (Periodik ${new Date().getFullYear() - 1})`,
    statusLapor: 'Sudah Lapor (Terverifikasi Lengkap)',
    nomorTandaTerima: '',
    tanggalLapor: new Date().toISOString().split('T')[0]
  });

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'HUKDIS' | 'LHKPN'; id: string; name: string } | null>(null);

  // Hukdis Handlers
  const handleOpenAddHukdis = () => {
    setIsEditHukdisMode(false);
    setSelectedHukdis(null);
    setHukdisForm({
      nip: '',
      nama: '',
      unitKerja: UNIT_KERJA[0],
      jabatan: '',
      jenisPelanggaran: '',
      tingkatHukdis: 'Ringan',
      jenisSanksi: 'Teguran Lisan / Tertulis',
      nomorSK: `W.1-KP.08.01-${Math.floor(Math.random() * 800 + 100)}`,
      tmtSK: new Date().toISOString().split('T')[0],
      tmtSelesai: '',
      statusPenanganan: 'Proses BAP / Pemeriksaan',
      keterangan: 'Tercatat dalam rekam jejak kepatuhan ASN'
    });
    setIsHukdisModalOpen(true);
  };

  const handleOpenEditHukdis = (item: HukdisRecord) => {
    setIsEditHukdisMode(true);
    setSelectedHukdis(item);
    setHukdisForm({ ...item });
    setIsHukdisModalOpen(true);
  };

  const handleSaveHukdis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hukdisForm.nama || !hukdisForm.nip) {
      alert('Mohon lengkapi NIP dan nama pegawai.');
      return;
    }

    if (isEditHukdisMode && selectedHukdis) {
      setHukdisList(prev => prev.map(h => h.id === selectedHukdis.id ? {
        ...h,
        ...hukdisForm
      } as HukdisRecord : h));
      setSuccessMsg(`Catatan Hukdis ${hukdisForm.nama} berhasil diperbarui.`);
      logActivity('UPDATE', 'Disiplin & LHKPN', `Update Hukdis: ${hukdisForm.nama}`);
    } else {
      const newHukdis: HukdisRecord = {
        id: `HKD-${Date.now().toString().slice(-4)}`,
        nip: hukdisForm.nip || '',
        nama: hukdisForm.nama || '',
        unitKerja: hukdisForm.unitKerja || UNIT_KERJA[0],
        jabatan: hukdisForm.jabatan || 'Pegawai DJKI',
        jenisPelanggaran: hukdisForm.jenisPelanggaran || '',
        tingkatHukdis: hukdisForm.tingkatHukdis || 'Ringan',
        jenisSanksi: hukdisForm.jenisSanksi || 'Teguran Tertulis',
        nomorSK: hukdisForm.nomorSK || 'W.1-KP.08.01-001',
        tmtSK: hukdisForm.tmtSK || new Date().toISOString().split('T')[0],
        tmtSelesai: hukdisForm.tmtSelesai || '',
        statusPenanganan: hukdisForm.statusPenanganan || 'Proses BAP / Pemeriksaan',
        keterangan: hukdisForm.keterangan || 'Tercatat dalam rekam jejak kepatuhan ASN'
      };
      setHukdisList([newHukdis, ...hukdisList]);
      setSuccessMsg(`Catatan Hukdis ${newHukdis.nama} berhasil ditambahkan.`);
      logActivity('CREATE', 'Disiplin & LHKPN', `Catat Kasus Disiplin: ${newHukdis.nama} (${newHukdis.tingkatHukdis})`);
    }

    setIsHukdisModalOpen(false);
    setShowSuccess(true);
  };

  // LHKPN Handlers
  const handleOpenAddLhkpn = () => {
    setIsEditLhkpnMode(false);
    setSelectedLhkpn(null);
    setLhkpnForm({
      nip: '',
      nama: '',
      jabatan: '',
      unitKerja: UNIT_KERJA[0],
      jenisWajibLapor: 'LHKPN (KPK)',
      tahunLapor: `${new Date().getFullYear()} (Periodik ${new Date().getFullYear() - 1})`,
      statusLapor: 'Sudah Lapor (Terverifikasi Lengkap)',
      nomorTandaTerima: `NHB-${new Date().getFullYear()}-KPK-${Math.floor(Math.random() * 80000 + 10000)}`,
      tanggalLapor: new Date().toISOString().split('T')[0]
    });
    setIsLhkpnModalOpen(true);
  };

  const handleOpenEditLhkpn = (item: LhkpnRecord) => {
    setIsEditLhkpnMode(true);
    setSelectedLhkpn(item);
    setLhkpnForm({ ...item });
    setIsLhkpnModalOpen(true);
  };

  const handleSaveLhkpn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lhkpnForm.nama || !lhkpnForm.nip) {
      alert('Mohon lengkapi NIP dan nama wajib lapor.');
      return;
    }

    if (isEditLhkpnMode && selectedLhkpn) {
      setLhkpnList(prev => prev.map(l => l.id === selectedLhkpn.id ? {
        ...l,
        ...lhkpnForm
      } as LhkpnRecord : l));
      setSuccessMsg(`Data LHKPN/LHKASN ${lhkpnForm.nama} berhasil diperbarui.`);
      logActivity('UPDATE', 'Disiplin & LHKPN', `Update LHKPN: ${lhkpnForm.nama}`);
    } else {
      const newLhk: LhkpnRecord = {
        id: `LHK-${Date.now().toString().slice(-4)}`,
        nip: lhkpnForm.nip || '',
        nama: lhkpnForm.nama || '',
        jabatan: lhkpnForm.jabatan || 'Pejabat Wajib Lapor',
        unitKerja: lhkpnForm.unitKerja || UNIT_KERJA[0],
        jenisWajibLapor: lhkpnForm.jenisWajibLapor || 'LHKPN (KPK)',
        tahunLapor: lhkpnForm.tahunLapor || `${new Date().getFullYear()}`,
        statusLapor: lhkpnForm.statusLapor || 'Sudah Lapor (Terverifikasi Lengkap)',
        nomorTandaTerima: lhkpnForm.nomorTandaTerima || `NHB-${new Date().getFullYear()}-001`,
        tanggalLapor: lhkpnForm.tanggalLapor || new Date().toISOString().split('T')[0]
      };
      setLhkpnList([newLhk, ...lhkpnList]);
      setSuccessMsg(`Wajib lapor ${newLhk.nama} berhasil ditambahkan.`);
      logActivity('CREATE', 'Disiplin & LHKPN', `Tambah Wajib Lapor: ${newLhk.nama}`);
    }

    setIsLhkpnModalOpen(false);
    setShowSuccess(true);
  };

  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'HUKDIS') {
      setHukdisList(prev => prev.filter(h => h.id !== itemToDelete.id));
      setSuccessMsg(`Catatan Hukdis ${itemToDelete.name} berhasil dihapus.`);
      logActivity('DELETE', 'Disiplin & LHKPN', `Hapus Hukdis: ${itemToDelete.name}`);
    } else {
      setLhkpnList(prev => prev.filter(l => l.id !== itemToDelete.id));
      setSuccessMsg(`Data Wajib Lapor ${itemToDelete.name} berhasil dihapus.`);
      logActivity('DELETE', 'Disiplin & LHKPN', `Hapus LHKPN: ${itemToDelete.name}`);
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
        message={`Apakah Anda yakin ingin menghapus data ${itemToDelete?.name}? Tindakan ini tidak dapat dibatalkan.`}
      />

      {/* Header Banner with Back Button */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-red-950 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
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
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">
                  Sub-Tim 3: Manajemen Karier, Kinerja &amp; Disiplin ASN
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
                Penegakan Disiplin Pegawai (PP 94/2021) &amp; Kepatuhan LHKPN
              </h1>
              <p className="text-xs text-rose-200 mt-1 max-w-2xl leading-relaxed">
                Penatausahaan BAP pemeriksaan pelanggaran disiplin, penerbitan draf SK Hukdis (Ringan, Sedang, Berat), monitoring rekam jejak integritas, serta kepatuhan LHKPN KPK &amp; LHKASN KemenPAN-RB.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <button
                  onClick={handleOpenAddHukdis}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="bi bi-file-earmark-plus-fill"></i>
                  <span>+ Catat Kasus Disiplin</span>
                </button>
                <button
                  onClick={handleOpenAddLhkpn}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="bi bi-person-plus-fill"></i>
                  <span>+ Wajib Lapor LHKPN</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Highlight KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">Total Kasus Disiplin</span>
            <p className="text-xl font-black text-white mt-0.5">{hukdisList.length} Kasus</p>
            <span className="text-[9px] text-emerald-300 font-semibold">Tingkat Disiplin: 99.8% (Tinggi)</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">Kepatuhan LHKPN (KPK)</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">100.0%</p>
            <span className="text-[9px] text-white/80 font-bold">{lhkpnList.length} Wajib Lapor Tuntas</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">Kepatuhan LHKASN</span>
            <p className="text-xl font-black text-cyan-300 mt-0.5">100.0%</p>
            <span className="text-[9px] text-white/80 font-bold">Seluruh ASN DJKI Selesai</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-rose-200 uppercase tracking-wider">SK Hukdis Terbit</span>
            <p className="text-xl font-black text-amber-300 mt-0.5">
              {hukdisList.filter(h => h.statusPenanganan.includes('Ditetapkan') || h.statusPenanganan.includes('Masa')).length} SK
            </p>
            <span className="text-[9px] text-white/80 font-bold">Terintegrasi SIASN BKN</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between bg-white p-3 md:p-4 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('hukdis')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'hukdis' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-shield-slash"></i>
            <span>Rekapitulasi Hukdis ({hukdisList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lhkpn')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'lhkpn' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-wallet2"></i>
            <span>Monitoring LHKPN &amp; LHKASN ({lhkpnList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bap')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'bap' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-file-earmark-text"></i>
            <span>Alur BAP &amp; Tim Pemeriksa</span>
          </button>

          <button
            onClick={() => setActiveTab('edukasi')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'edukasi' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className="bi bi-book"></i>
            <span>Matriks Sanksi PP 94/2021</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REKAPITULASI HUKDIS */}
      {activeTab === 'hukdis' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="py-3 px-4">Pegawai &amp; Unit Kerja</th>
                    <th className="py-3 px-4">Uraian Pelanggaran</th>
                    <th className="py-3 px-4 text-center">Tingkat &amp; Sanksi</th>
                    <th className="py-3 px-4">No. SK &amp; TMT</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {hukdisList.map((item) => (
                    <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{item.nama}</span>
                        <span className="font-mono text-[11px] text-gray-500 block">NIP: {item.nip}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{item.unitKerja}</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                          {item.jenisPelanggaran}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase mb-1 ${
                          item.tingkatHukdis === 'Ringan' ? 'bg-amber-100 text-amber-800' :
                          item.tingkatHukdis === 'Sedang' ? 'bg-orange-100 text-orange-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.tingkatHukdis}
                        </span>
                        <span className="text-[11px] font-bold text-gray-800 block">
                          {item.jenisSanksi}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-indigo-700 block">{item.nomorSK}</span>
                        <span className="text-[10px] text-gray-500 block">TMT: {item.tmtSK}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.statusPenanganan === 'Selesai / Pulih' ? 'bg-emerald-100 text-emerald-800' :
                          item.statusPenanganan === 'Ditetapkan SK' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.statusPenanganan}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditHukdis(item)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                            title="Edit Kasus Hukdis"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setItemToDelete({ type: 'HUKDIS', id: item.id, name: `Kasus Disiplin ${item.nama}` });
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                              title="Hapus Kasus"
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

      {/* TAB 2: LHKPN */}
      {activeTab === 'lhkpn' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[10px] font-black">
                  <tr>
                    <th className="py-3 px-4">Nama &amp; Jabatan Wajib Lapor</th>
                    <th className="py-3 px-4">Unit Kerja</th>
                    <th className="py-3 px-4 text-center">Kategori</th>
                    <th className="py-3 px-4">Nomor Tanda Terima &amp; Tanggal</th>
                    <th className="py-3 px-4 text-center">Status LHKPN</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {lhkpnList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{item.nama}</span>
                        <span className="font-mono text-[11px] text-gray-500 block">NIP: {item.nip}</span>
                        <span className="text-[10px] text-gray-600 block mt-0.5 font-medium">{item.jabatan}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-medium">
                        {item.unitKerja}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-black rounded-full text-[9px] uppercase">
                          {item.jenisWajibLapor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-emerald-700 block">{item.nomorTandaTerima || '-'}</span>
                        <span className="text-[10px] text-gray-400 block">{item.tanggalLapor}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full uppercase">
                          {item.statusLapor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditLhkpn(item)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-all"
                            title="Edit LHKPN"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setItemToDelete({ type: 'LHKPN', id: item.id, name: `LHKPN ${item.nama}` });
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                              title="Hapus LHKPN"
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

      {/* TAB 3: ALUR BAP */}
      {activeTab === 'bap' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase">Tahapan &amp; Alur Pemeriksaan Pelanggaran Disiplin (PP 94/2021)</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">1</span>
              <h4 className="font-bold text-gray-900">Pemanggilan Resmi</h4>
              <p className="text-[11px] text-gray-500">Surat Panggilan I &amp; II dari Atasan Langsung dengan tenggat 7 hari kerja.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">2</span>
              <h4 className="font-bold text-gray-900">Pemeriksaan &amp; BAP</h4>
              <p className="text-[11px] text-gray-500">Penyusunan Berita Acara Pemeriksaan (BAP) bersama Tim Pemeriksa Disiplin.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">3</span>
              <h4 className="font-bold text-gray-900">Laporan Hasil Pemeriksaan</h4>
              <p className="text-[11px] text-gray-500">Penyampaian LHP dan rekomendasi tingkat hukuman kepada Pejabat Pembina Kepegawaian.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">4</span>
              <h4 className="font-bold text-gray-900">Penetapan SK Hukdis</h4>
              <p className="text-[11px] text-gray-500">Penerbitan Keputusan Hukdis dan penginputan ke aplikasi I-Disiplin BKN &amp; SIASN.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MATRIKS SANKSI PP 94/2021 */}
      {activeTab === 'edukasi' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase">Hukuman Ringan</span>
            <h4 className="font-bold text-gray-900 text-xs mt-1">Jenis Sanksi:</h4>
            <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-1">
              <li>Teguran Lisan</li>
              <li>Teguran Tertulis</li>
              <li>Pernyataan Tidak Puas secara Tertulis</li>
            </ul>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="px-2.5 py-1 bg-orange-100 text-orange-800 text-[10px] font-black rounded-full uppercase">Hukuman Sedang</span>
            <h4 className="font-bold text-gray-900 text-xs mt-1">Jenis Sanksi:</h4>
            <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-1">
              <li>Pemotongan Tukin 25% selama 6 bulan</li>
              <li>Pemotongan Tukin 25% selama 9 bulan</li>
              <li>Pemotongan Tukin 25% selama 12 bulan</li>
            </ul>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full uppercase">Hukuman Berat</span>
            <h4 className="font-bold text-gray-900 text-xs mt-1">Jenis Sanksi:</h4>
            <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-1">
              <li>Penurunan jabatan setingkat lebih rendah 12 bulan</li>
              <li>Pembebasan dari jabatan menjadi jabatan pelaksana 12 bulan</li>
              <li>Pemberhentian dengan hormat tidak atas permintaan sendiri</li>
            </ul>
          </div>
        </div>
      )}

      {/* MODAL HUKDIS */}
      {isHukdisModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditHukdisMode ? 'Edit Kasus Disiplin Pegawai' : 'Catat Kasus Pelanggaran Disiplin'}
              </h3>
              <button onClick={() => setIsHukdisModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveHukdis} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">NIP Pegawai</label>
                  <input
                    type="text"
                    value={hukdisForm.nip || ''}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, nip: e.target.value })}
                    placeholder="19xxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nama Pegawai</label>
                  <input
                    type="text"
                    value={hukdisForm.nama || ''}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, nama: e.target.value })}
                    placeholder="Nama lengkap & gelar..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Unit Kerja</label>
                  <select
                    value={hukdisForm.unitKerja}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, unitKerja: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  >
                    {UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={hukdisForm.jabatan || ''}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, jabatan: e.target.value })}
                    placeholder="Contoh: Analis SDM Aparatur"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Uraian Pelanggaran</label>
                <textarea
                  rows={2}
                  value={hukdisForm.jenisPelanggaran || ''}
                  onChange={(e) => setHukdisForm({ ...hukdisForm, jenisPelanggaran: e.target.value })}
                  placeholder="Deskripsi pasal dan bentuk pelanggaran..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tingkat Hukdis</label>
                  <select
                    value={hukdisForm.tingkatHukdis}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, tingkatHukdis: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jenis Sanksi</label>
                  <input
                    type="text"
                    value={hukdisForm.jenisSanksi || ''}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, jenisSanksi: e.target.value })}
                    placeholder="Contoh: Teguran Tertulis"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nomor SK</label>
                  <input
                    type="text"
                    value={hukdisForm.nomorSK || ''}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, nomorSK: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Penanganan</label>
                  <select
                    value={hukdisForm.statusPenanganan}
                    onChange={(e) => setHukdisForm({ ...hukdisForm, statusPenanganan: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Proses BAP / Pemeriksaan">Proses BAP / Pemeriksaan</option>
                    <option value="Ditetapkan SK">Ditetapkan SK</option>
                    <option value="Masa Menjalani Sanksi">Masa Menjalani Sanksi</option>
                    <option value="Selesai / Pulih">Selesai / Pulih</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsHukdisModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg"
                >
                  {isEditHukdisMode ? 'Simpan Perubahan' : 'Catat Kasus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LHKPN */}
      {isLhkpnModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-base font-black text-gray-900">
                {isEditLhkpnMode ? 'Edit Wajib Lapor LHKPN' : 'Tambah Wajib Lapor LHKPN / LHKASN'}
              </h3>
              <button onClick={() => setIsLhkpnModalOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSaveLhkpn} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">NIP</label>
                  <input
                    type="text"
                    value={lhkpnForm.nip || ''}
                    onChange={(e) => setLhkpnForm({ ...lhkpnForm, nip: e.target.value })}
                    placeholder="19xxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nama Pejabat</label>
                  <input
                    type="text"
                    value={lhkpnForm.nama || ''}
                    onChange={(e) => setLhkpnForm({ ...lhkpnForm, nama: e.target.value })}
                    placeholder="Nama lengkap..."
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Kategori Pelaporan</label>
                  <select
                    value={lhkpnForm.jenisWajibLapor}
                    onChange={(e) => setLhkpnForm({ ...lhkpnForm, jenisWajibLapor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="LHKPN (KPK)">LHKPN (KPK)</option>
                    <option value="LHKASN (KemenPAN-RB)">LHKASN (KemenPAN-RB)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tahun Lapor</label>
                  <input
                    type="text"
                    value={lhkpnForm.tahunLapor || ''}
                    onChange={(e) => setLhkpnForm({ ...lhkpnForm, tahunLapor: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Jabatan</label>
                <input
                  type="text"
                  value={lhkpnForm.jabatan || ''}
                  onChange={(e) => setLhkpnForm({ ...lhkpnForm, jabatan: e.target.value })}
                  placeholder="Contoh: Direktur / PPK / Pokja Pengadaan"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Unit Kerja</label>
                <select
                  value={lhkpnForm.unitKerja}
                  onChange={(e) => setLhkpnForm({ ...lhkpnForm, unitKerja: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                >
                  {UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nomor Tanda Terima (NHB)</label>
                  <input
                    type="text"
                    value={lhkpnForm.nomorTandaTerima || ''}
                    onChange={(e) => setLhkpnForm({ ...lhkpnForm, nomorTandaTerima: e.target.value })}
                    placeholder="NHB-2026-KPK-xxxxx"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status Pelaporan</label>
                  <select
                    value={lhkpnForm.statusLapor}
                    onChange={(e) => setLhkpnForm({ ...lhkpnForm, statusLapor: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="Sudah Lapor (Terverifikasi Lengkap)">Sudah Lapor (Terverifikasi Lengkap)</option>
                    <option value="Proses Perbaikan e-Filing">Proses Perbaikan e-Filing</option>
                    <option value="Belum Lapor">Belum Lapor</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLhkpnModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-lg"
                >
                  {isEditLhkpnMode ? 'Simpan Perubahan' : 'Simpan Wajib Lapor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisiplinLhkpnPage;
