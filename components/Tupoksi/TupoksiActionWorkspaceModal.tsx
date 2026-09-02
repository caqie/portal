import React, { useState, useEffect } from 'react';
import { TupoksiSDMItem, SDMRole } from '../../types';
import { SUB_TEAMS_INFO } from '../../tupoksiConstants';
import { Link } from 'react-router-dom';

interface TupoksiActionWorkspaceModalProps {
  item: TupoksiSDMItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: string, progres: number) => void;
}

export const TupoksiActionWorkspaceModal: React.FC<TupoksiActionWorkspaceModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateStatus
}) => {
  if (!isOpen || !item) return null;

  const subInfo = (SUB_TEAMS_INFO as any)[item.subTeam] || SUB_TEAMS_INFO.PERENCANAAN_LAYANAN;

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<'WORKSPACE' | 'DOCS' | 'CHECKLIST' | 'HISTORY'>('WORKSPACE');
  const [progresValue, setProgresValue] = useState<number>(item.progres || 0);
  const [statusValue, setStatusValue] = useState<string>(item.status || 'DALAM_PROSES');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Dynamic Workspace Tools States
  // 1. Roadmap State
  const [roadmapYear, setRoadmapYear] = useState<string>('2026');
  const [roadmapMilestones, setRoadmapMilestones] = useState([
    { year: '2025', target: 'Pondasi Digitalisasi Layanan SDM Terpadu & Pemutakhiran Database 1.077 ASN', status: 'Selesai' },
    { year: '2026', target: 'Penerapan Sistem Merit Penuh, Talent Pool 9-Box & CAT Ukom Terintegrasi', status: 'On-Going' },
    { year: '2027', target: 'Otomasi Prediktif Formasi & AI-Assisted Career Pathing DJKI', status: 'Direncanakan' },
    { year: '2028', target: 'Akreditasi Lembaga Pelatihan Mandiri Kekayaan Intelektual Terstandar WIPO', status: 'Direncanakan' },
    { year: '2029', target: 'SDM DJKI Berdaya Saing Global & Transformasi Birokrasi BerAKHLAK Paripurna', status: 'Direncanakan' }
  ]);

  // 2. ABK Calculator State
  const [abkInput, setAbkInput] = useState({
    namaJabatan: 'Pemeriksa Paten Ahli Pertama',
    volumeTahunan: 2400,
    waktuNormaMenit: 1200,
    jamKerjaEfektif: 75000
  });
  const abkTotalMenit = abkInput.volumeTahunan * abkInput.waktuNormaMenit;
  const abkKebutuhan = (abkTotalMenit / abkInput.jamKerjaEfektif).toFixed(1);

  // 3. Welfare / Kartu / BPJS State
  const [welfareForm, setWelfareForm] = useState({
    jenisLayanan: 'KARPEG',
    nip: '198504122008121001',
    nama: 'BAMBANG HERMANTO, S.T., M.Kom.',
    tmtPangkat: '2021-10-01',
    noSurat: 'SDM/KARIS/2026/089',
    keterangan: 'Kelengkapan SK CPNS, PNS, dan Foto 3x4 telah terlampir.'
  });

  // 4. SAKIP & RB Governance State
  const [sakipArea, setSakipArea] = useState('Penataan SDM');
  const [gratifikasiLog, setGratifikasiLog] = useState([
    { tanggal: '2026-08-15', peristiwa: 'Pemberian Souvenir Seminar dari Pemda', nilai: 'Rp 250.000', status: 'Dilaporkan ke UPG DJKI' },
    { tanggal: '2026-08-20', peristiwa: 'Laporan Nihil Gratifikasi Pelayanan Paten', nilai: 'Rp 0', status: 'Terverifikasi Bersih' }
  ]);

  // 5. SPMT & Protocol State
  const [spmtForm, setSpmtForm] = useState({
    nipPegawai: '199208202015032002',
    namaPegawai: 'NURUL HIDAYAH, S.H., M.H.',
    jabatanBaru: 'Pemeriksa Merek Ahli Pertama',
    tmtPelantikan: '2026-09-01',
    pejabatPelantik: 'Direktur Jenderal Kekayaan Intelektual'
  });

  // 6. TNA Assessment State
  const [tnaScore, setTnaScore] = useState({
    teknisKI: 85,
    manajerial: 78,
    sosioKultural: 92,
    digital: 80
  });

  // 7. Tubel / Ibel State
  const [tubelData, setTubelData] = useState({
    pegawai: 'ANDI PRASETYO, S.Kom. (199511102022031001)',
    program: 'S2 Magister Keamanan Siber - ITB',
    beasiswa: 'LPDP Targeted ASN',
    rekomendasi: 'DISETUJUI - Memenuhi syarat masa kerja > 2 tahun dan SKP Sangat Baik'
  });

  // 8. PAK Conversion Calculator State
  const [pakInput, setPakInput] = useState({
    jenjang: 'Ahli Muda (Koefisien: 25)',
    predikat: 'Sangat Baik (150%)',
    koefisienDasar: 25,
    persentase: 1.5,
    hasilAK: 37.5
  });

  const handleCalculatePAK = (koef: number, persentase: number) => {
    setPakInput(prev => ({
      ...prev,
      koefisienDasar: koef,
      persentase: persentase,
      hasilAK: koef * persentase
    }));
  };

  // 9. Disiplin PP 94 Case State
  const [disiplinForm, setDisiplinForm] = useState({
    nipTerperiksa: '198504122008121001',
    namaTerperiksa: 'BAMBANG HERMANTO, S.T., M.Kom.',
    dugaanPelanggaran: 'Ketidakhadiran kerja tanpa keterangan sah selama 4 hari kumulatif',
    tahapPemeriksaan: 'Panggilan Klarifikasi I',
    rekomendasiSanksi: 'Teguran Lisan / Pembinaan Atasan Langsung'
  });

  // 10. IKP Survey State
  const [ikpScores, setIkpScores] = useState({
    responsivitas: 4,
    kemudahanSOP: 4,
    akuntabilitas: 4,
    keramahan: 4,
    integritasBebasPungli: 4
  });

  const ikpAverage = (
    (ikpScores.responsivitas + ikpScores.kemudahanSOP + ikpScores.akuntabilitas + ikpScores.keramahan + ikpScores.integritasBebasPungli) / 5
  ).toFixed(2);

  const handleSaveProgress = () => {
    if (onUpdateStatus) {
      onUpdateStatus(item.id, statusValue, progresValue);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Determine which specific interactive tool fits this tupoksi code
  const code = item.kodeTupoksi.toUpperCase();

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose}></div>

      {/* MODAL CONTAINER */}
      <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-modalEnter">
        {/* MODAL HEADER */}
        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl font-black ${subInfo.bgColor} text-white shadow-lg`}>
              <i className="bi bi-gear-wide-connected"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/10 text-blue-300 border border-white/10">
                  {item.kodeTupoksi}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {subInfo.name}
                </span>
              </div>
              <h3 className="text-base md:text-lg font-black text-white leading-snug mt-1 max-w-2xl truncate">
                {item.judul}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-10 w-10 rounded-2xl bg-white/10 hover:bg-rose-500 hover:text-white text-slate-300 flex items-center justify-center transition-all"
          >
            <i className="bi bi-x-lg text-lg"></i>
          </button>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="bg-slate-50 px-8 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('WORKSPACE')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'WORKSPACE'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <i className="bi bi-cpu-fill"></i>
              Modul Eksekusi Tugas
            </button>
            <button
              onClick={() => setActiveTab('CHECKLIST')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'CHECKLIST'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <i className="bi bi-check2-square"></i>
              Indikator & Output
            </button>
            <button
              onClick={() => setActiveTab('DOCS')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'DOCS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
              }`}
            >
              <i className="bi bi-file-earmark-text"></i>
              Template & Regulasi
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase">Status:</span>
              <select
                value={statusValue}
                onChange={e => setStatusValue(e.target.value)}
                className="text-xs font-black text-slate-800 bg-transparent outline-none uppercase"
              >
                <option value="DALAM_PROSES">Dalam Proses</option>
                <option value="TERUS_BERJALAN">Rutin / On-Going</option>
                <option value="SELESAI">Selesai</option>
                <option value="BELUM_DIMULAI">Belum Dimulai</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase">Progres:</span>
              <span className="text-xs font-black text-blue-600">{progresValue}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progresValue}
                onChange={e => setProgresValue(Number(e.target.value))}
                className="w-20 accent-blue-600"
              />
            </div>

            <button
              onClick={handleSaveProgress}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
            >
              <i className="bi bi-floppy-fill"></i> Simpan
            </button>
          </div>
        </div>

        {/* TOAST SAVE */}
        {savedSuccess && (
          <div className="bg-emerald-50 text-emerald-800 px-8 py-2 text-xs font-bold border-b border-emerald-200 flex items-center gap-2">
            <i className="bi bi-check-circle-fill text-emerald-600"></i>
            Perubahan progres dan status berhasil disimpan.
          </div>
        )}

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-6">
          {activeTab === 'WORKSPACE' && (
            <div className="space-y-6">
              {/* DESCRIPTION & TARGET CARD */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Uraian Ruang Lingkup:</span>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">{item.deskripsi}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Target Luaran / Output:</span>
                  <p className="text-xs font-bold text-slate-900 mt-1 leading-relaxed">{item.targetOutput}</p>
                  {item.appModuleLink && (
                    <div className="mt-3">
                      <Link
                        to={item.appModuleLink}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                      >
                        <i className="bi bi-arrow-up-right-square-fill"></i>
                        Buka Halaman Modul Penuh ({item.appModuleLink})
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* SPECIFIC INTERACTIVE TOOL BASED ON TUPOKSI CODE */}
              {/* 1. ROADMAP TOOL (PL-01) */}
              {(code.includes('PL-01') || code.includes('ROADMAP')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Interactive Roadmap SDM 2025-2029</h4>
                      <p className="text-xs text-slate-500">Peta jalan transformasi tata kelola SDM DJKI</p>
                    </div>
                    <button
                      onClick={() => alert("Roadmap SDM berhasil diekspor ke PDF/Ringkasan Eksekutif.")}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5"
                    >
                      <i className="bi bi-file-earmark-pdf-fill text-rose-400"></i> Export Roadmap
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
                    {roadmapMilestones.map((m, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black text-blue-600">{m.year}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${m.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' : m.status === 'On-Going' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-snug">{m.target}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. ABK CALCULATOR (PL-02) */}
              {(code.includes('PL-02') || code.includes('ABK')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase">Kalkulator Formasi ABK Cepat</h4>
                    <p className="text-xs text-slate-500">Simulasi penghitungan formasi jabatan berbasis Beban Kerja Tahunan / Jam Kerja Efektif (75.000 menit)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Nama Jabatan</label>
                      <input
                        type="text"
                        value={abkInput.namaJabatan}
                        onChange={e => setAbkInput({ ...abkInput, namaJabatan: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Volume Beban Kerja/Tahun</label>
                      <input
                        type="number"
                        value={abkInput.volumeTahunan}
                        onChange={e => setAbkInput({ ...abkInput, volumeTahunan: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Norma Waktu (Menit/Berkas)</label>
                      <input
                        type="number"
                        value={abkInput.waktuNormaMenit}
                        onChange={e => setAbkInput({ ...abkInput, waktuNormaMenit: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Hasil Perhitungan Kebutuhan Riil:</span>
                      <p className="text-xs text-blue-950 mt-0.5">Total Waktu: <strong>{abkTotalMenit.toLocaleString()}</strong> menit dibagi 75.000 menit standar</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-700">{abkKebutuhan}</span>
                      <span className="text-xs font-bold text-blue-900 ml-1">Orang Pegawai</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. WELFARE / KARTU / BPJS TOOL (PL-03 / PL-04) */}
              {(code.includes('PL-03') || code.includes('KARTU') || code.includes('BPJS') || code.includes('KESEJAHTERAAN')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Toolkit Usulan Kartu & Kesejahteraan Pegawai</h4>
                      <p className="text-xs text-slate-500">Generator berkas usulan KARPEG, KARIS/KARSU, BPJS, Tapera & KP4</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-black">
                      Integrasi BKN & BPJS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Jenis Layanan</label>
                      <select
                        value={welfareForm.jenisLayanan}
                        onChange={e => setWelfareForm({ ...welfareForm, jenisLayanan: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                      >
                        <option value="KARPEG">Kartu Pegawai (KARPEG)</option>
                        <option value="KARIS_KARSU">Kartu Istri/Suami (KARIS/KARSU)</option>
                        <option value="BPJS_KES">Pendaftaran/Mutasi BPJS Kesehatan</option>
                        <option value="BPJS_TK">BPJS Ketenagakerjaan (JKK & JKM)</option>
                        <option value="TAPERA">Pemutakhiran Rekening BP Tapera</option>
                        <option value="SANTUNAN">Santunan Kelahiran/Kematian & KP4</option>
                        <option value="PURNA_BAKTI">Pembekalan Masa Persiapan Pensiun</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">NIP Pegawai Pemohon</label>
                      <input
                        type="text"
                        value={welfareForm.nip}
                        onChange={e => setWelfareForm({ ...welfareForm, nip: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Nama Lengkap</label>
                      <input
                        type="text"
                        value={welfareForm.nama}
                        onChange={e => setWelfareForm({ ...welfareForm, nama: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => alert(`Pengantar Usulan ${welfareForm.jenisLayanan} untuk ${welfareForm.nama} berhasil digenerate dan dikirim ke loket verifikasi!`)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
                    >
                      <i className="bi bi-send-check-fill mr-1.5"></i> Proses & Generate Surat Pengantar
                    </button>
                  </div>
                </div>
              )}

              {/* 4. SAKIP & RB GOVERNANCE (PL-05) */}
              {(code.includes('PL-05') || code.includes('SAKIP') || code.includes('RB') || code.includes('GRATIFIKASI')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Manajemen SAKIP, LKE RB & Kepatuhan Gratifikasi</h4>
                      <p className="text-xs text-slate-500">Pemantauan kepatuhan tata kelola, benturan kepentingan & WBS</p>
                    </div>
                    <button
                      onClick={() => alert("Laporan SAKIP & LKE RB berhasil dikompilasi.")}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1"
                    >
                      <i className="bi bi-file-earmark-check-fill"></i> Kompilasi SAKIP SDM
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Kepatuhan Gratifikasi</span>
                      <p className="text-lg font-black text-emerald-600 mt-1">100% Nihil Ilegal</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Semua laporan UPG terekam</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Nilai SAKIP SDM</span>
                      <p className="text-lg font-black text-blue-600 mt-1">88.45 (Sangat Baik)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Target IKU tercapai</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase">WBS SDM</span>
                      <p className="text-lg font-black text-purple-600 mt-1">0 Aduan Aktif</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Tindak lanjut selesai 100%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. TNA & GAP KOMPETENSI (BK-01) */}
              {(code.includes('BK-01') || code.includes('TNA') || code.includes('KOMPETENSI')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Training Needs Analysis (TNA) & Gap Kompetensi</h4>
                      <p className="text-xs text-slate-500">Pemetaan standar kompetensi teknis KI, manajerial & sosio-kultural</p>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black">
                      Gap Index: 83.75 / 100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Teknis KI (Paten/Merek)</span>
                      <p className="text-base font-black text-slate-800">{tnaScore.teknisKI}%</p>
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${tnaScore.teknisKI}%` }}></div>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Manajerial</span>
                      <p className="text-base font-black text-slate-800">{tnaScore.manajerial}%</p>
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: `${tnaScore.manajerial}%` }}></div>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Sosio-Kultural</span>
                      <p className="text-base font-black text-slate-800">{tnaScore.sosioKultural}%</p>
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${tnaScore.sosioKultural}%` }}></div>
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Digital Literacy</span>
                      <p className="text-base font-black text-slate-800">{tnaScore.digital}%</p>
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full" style={{ width: `${tnaScore.digital}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. PAK CONVERSION CALCULATOR (MK-01 / PERMENPAN-RB 1/2023) */}
              {(code.includes('MK-01') || code.includes('PAK') || code.includes('PANGKAT') || code.includes('KGB')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Kalkulator Konversi Predikat SKP ke Angka Kredit JF (PermenPAN-RB 1/2023)</h4>
                      <p className="text-xs text-slate-500">Hitung otomatis perolehan Angka Kredit Tahunan berdasarkan jenjang dan rating kinerja</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black">
                      PermenPAN-RB No. 1/2023
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Jenjang Jabatan Fungsional</label>
                      <select
                        onChange={e => {
                          const koef = Number(e.target.value);
                          handleCalculatePAK(koef, pakInput.persentase);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="12.5">Ahli Pertama (Koefisien: 12.5)</option>
                        <option value="25" selected>Ahli Muda (Koefisien: 25.0)</option>
                        <option value="37.5">Ahli Madya (Koefisien: 37.5)</option>
                        <option value="50">Ahli Utama (Koefisien: 50.0)</option>
                        <option value="3.75">Keahlian Terampil (Koefisien: 3.75)</option>
                        <option value="7.5">Keahlian Mahir (Koefisien: 7.5)</option>
                        <option value="12.5">Keahlian Penyelia (Koefisien: 12.5)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Predikat Kinerja Tahunan (SKP)</label>
                      <select
                        onChange={e => {
                          const pct = Number(e.target.value);
                          handleCalculatePAK(pakInput.koefisienDasar, pct);
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      >
                        <option value="1.5" selected>Sangat Baik (150%)</option>
                        <option value="1.0">Baik (100%)</option>
                        <option value="0.75">Cukup / Butuh Perbaikan (75%)</option>
                        <option value="0.5">Kurang (50%)</option>
                        <option value="0.25">Sangat Kurang (25%)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Perolehan Angka Kredit Konversi:</span>
                      <p className="text-xs text-emerald-900 mt-0.5">Koefisien ({pakInput.koefisienDasar}) x Persentase ({pakInput.persentase * 100}%)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-emerald-700">{pakInput.hasilAK}</span>
                      <span className="text-xs font-bold text-emerald-900 ml-1">Angka Kredit</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 7. DISIPLIN PP 94/2021 & SIDANG KODE ETIK (MK-03) */}
              {(code.includes('MK-03') || code.includes('DISIPLIN') || code.includes('ETIK') || code.includes('LHKASN')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Alur Penegakan Disiplin ASN (PP No. 94/2021)</h4>
                      <p className="text-xs text-slate-500">Generator Panggilan Klarifikasi, BAP Pemeriksaan & SK Hukuman Disiplin</p>
                    </div>
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black">
                      PP 94/2021 & Perka BKN 6/2022
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Nama / NIP Terperiksa</label>
                      <input
                        type="text"
                        value={`${disiplinForm.namaTerperiksa} (${disiplinForm.nipTerperiksa})`}
                        onChange={e => setDisiplinForm({ ...disiplinForm, namaTerperiksa: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase">Tahapan Penanganan</label>
                      <select
                        value={disiplinForm.tahapPemeriksaan}
                        onChange={e => setDisiplinForm({ ...disiplinForm, tahapPemeriksaan: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase"
                      >
                        <option value="Surat Panggilan Klarifikasi I">Surat Panggilan Klarifikasi I</option>
                        <option value="Surat Panggilan Klarifikasi II">Surat Panggilan Klarifikasi II</option>
                        <option value="Pemeriksaan Berita Acara (BAP)">Pemeriksaan Berita Acara (BAP)</option>
                        <option value="Sidang Majelis Kode Etik">Sidang Majelis Kode Etik</option>
                        <option value="Penerbitan SK Hukuman Disiplin">Penerbitan SK Hukuman Disiplin</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => alert(`Draf dokumen ${disiplinForm.tahapPemeriksaan} untuk ${disiplinForm.namaTerperiksa} berhasil dibuat!`)}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                    >
                      <i className="bi bi-printer-fill mr-1.5"></i> Generate Berkas {disiplinForm.tahapPemeriksaan}
                    </button>
                  </div>
                </div>
              )}

              {/* 8. IKP SURVEY ENGINE (BK-05) */}
              {(code.includes('BK-05') || code.includes('IKP') || code.includes('SURVEI')) && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Instrumen Survei Indeks Kepuasan Pegawai (IKP) SDM</h4>
                      <p className="text-xs text-slate-500">Evaluasi kepuasan layanan Pokja SDM dengan skala 1 sampai 4</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-blue-600">{ikpAverage}</span>
                      <span className="text-xs font-bold text-slate-400"> / 4.00 (Sangat Memuaskan)</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-700">1. Kecepatan respon petugas layanan SDM</span>
                      <span className="font-black text-blue-600">Sangat Baik (4/4)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-700">2. Kejelasan alur SOP & persyaratan dokumen</span>
                      <span className="font-black text-blue-600">Sangat Baik (4/4)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl">
                      <span className="font-bold text-slate-700">3. Integritas dan zero pungutan liar</span>
                      <span className="font-black text-emerald-600">100% Bersih (4/4)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'CHECKLIST' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase">Indikator Keberhasilan & Bukti Dukung (Evidence)</h4>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-600" />
                  <span className="text-xs font-bold text-slate-800">1. Penyusunan instrumen dan verifikasi data awal</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded accent-blue-600" />
                  <span className="text-xs font-bold text-slate-800">2. Koordinasi lintas subbagian dan unit kerja eselon II</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked={progresValue >= 80} className="h-4 w-4 rounded accent-blue-600" />
                  <span className="text-xs font-bold text-slate-800">3. Pembuatan draf dokumen output & pengesahan pimpinan</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked={progresValue >= 100} className="h-4 w-4 rounded accent-blue-600" />
                  <span className="text-xs font-bold text-slate-800">4. Unggah data dukung ke e-Dossier / Portal SAKIP & RB</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'DOCS' && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase">Regulasi Acuan & Template Standar</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-600">
                    <i className="bi bi-file-earmark-pdf-fill text-lg"></i>
                    <h5 className="text-xs font-black uppercase text-slate-900">Peraturan Terkait</h5>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    UU No. 20/2023 tentang ASN, PP No. 94/2021 tentang Disiplin PNS, PermenPAN-RB No. 1/2023 tentang Jabatan Fungsional.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <i className="bi bi-file-earmark-word-fill text-lg"></i>
                    <h5 className="text-xs font-black uppercase text-slate-900">Template Berkas Kerja</h5>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Format resmi instrumen data dukung, formulir pemeriksaan, dan nota dinas kepegawaian standar Kementerian Hukum & HAM.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Penanggung Jawab: <strong className="text-slate-800">{item.penanggungJawab || 'Ketua Tim SDM'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
          >
            Tutup Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default TupoksiActionWorkspaceModal;
