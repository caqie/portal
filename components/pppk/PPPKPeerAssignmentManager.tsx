import React, { useState, useEffect } from 'react';
import { PPPKPeerAssignmentPair, PPPKSemester, Pegawai } from '../../types';
import {
  getPeerAssignmentPairs,
  savePeerAssignmentPair,
  savePeerAssessmentReview,
  getPPPKEmployees,
  getAllEmployees,
  getKetuaTimKerjaList
} from '../../services/pppkEvaluationService';

interface Props {
  selectedYear: number;
  selectedSemester: PPPKSemester;
  currentUserId: string;
  currentUserName: string;
  onRefresh?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// 7 Aspek BerAKHLAK x 4 Indikator = 28 Butir Pertanyaan Standar DJKI
const BERAKHLAK_QUESTIONS = [
  // 1. Berorientasi Pelayanan
  { code: 'BP-1', aspek: 'Berorientasi Pelayanan', text: 'Memahami dan memenuhi kebutuhan masyarakat / pemohon layanan KI dengan ramah dan cekatan' },
  { code: 'BP-2', aspek: 'Berorientasi Pelayanan', text: 'Memberikan pelayanan secara tepat waktu, akurat, dan tanpa diskriminasi' },
  { code: 'BP-3', aspek: 'Berorientasi Pelayanan', text: 'Bersikap terbuka terhadap masukan, kritik, dan keluhan demi kepuasan pengguna layanan' },
  { code: 'BP-4', aspek: 'Berorientasi Pelayanan', text: 'Melakukan perbaikan tiada henti dalam prosedur dan kualitas layanan kedinasan' },
  // 2. Akuntabel
  { code: 'AK-1', aspek: 'Akuntabel', text: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin, dan berintegritas tinggi' },
  { code: 'AK-2', aspek: 'Akuntabel', text: 'Menggunakan fasilitas dan sarana BMN kedinasan secara bertanggung jawab, efektif, dan efisien' },
  { code: 'AK-3', aspek: 'Akuntabel', text: 'Tidak menyalahgunakan kewenangan jabatan dalam pengambilan keputusan teknis permohonan' },
  { code: 'AK-4', aspek: 'Akuntabel', text: 'Menyampaikan laporan hasil pekerjaan secara transparan dan dapat dipertanggungjawabkan' },
  // 3. Kompeten
  { code: 'KP-1', aspek: 'Kompeten', text: 'Meningkatkan kompetensi diri secara berkelanjutan untuk menjawab dinamika kebutuhan tugas' },
  { code: 'KP-2', aspek: 'Kompeten', text: 'Membantu rekan kerja lain belajar dan saling mentransfer ilmu pengetahuan fungsional' },
  { code: 'KP-3', aspek: 'Kompeten', text: 'Melaksanakan tugas dengan standar kualitas kinerja terbaik dan minim kekeliruan administrasi' },
  { code: 'KP-4', aspek: 'Kompeten', text: 'Menguasai SOP, regulasi kekayaan intelektual, dan aplikasi pendukung kerja harian' },
  // 4. Harmonis
  { code: 'HM-1', aspek: 'Harmonis', text: 'Menghargai setiap rekan kerja tanpa membedakan latar belakang suku, agama, dan status kepegawaian' },
  { code: 'HM-2', aspek: 'Harmonis', text: 'Suka menolong rekan kerja yang mengalami kesulitan atau beban tugas tinggi' },
  { code: 'HM-3', aspek: 'Harmonis', text: 'Membangun lingkungan kerja yang kondusif, nyaman, dan saling menghormati' },
  { code: 'HM-4', aspek: 'Harmonis', text: 'Menghindari konflik interpersonal dan selalu mengedepankan musyawarah mufakat' },
  // 5. Loyal
  { code: 'LY-1', aspek: 'Loyal', text: 'Memegang teguh ideologi Pancasila, UUD 1945, serta setia kepada NKRI dan pemerintah' },
  { code: 'LY-2', aspek: 'Loyal', text: 'Menjaga nama baik sesama ASN, pimpinan, unit kerja DJKI, dan instansi Kementerian Hukum & HAM' },
  { code: 'LY-3', aspek: 'Loyal', text: 'Menjaga rahasia jabatan, data pemohon, dan kerahasiaan berkas permohonan kekayaan intelektual' },
  { code: 'LY-4', aspek: 'Loyal', text: 'Siap sedia menjalankan instruksi kedinasan pimpinan yang sah dengan penuh dedikasi' },
  // 6. Adaptif
  { code: 'AD-1', aspek: 'Adaptif', text: 'Cepat menyesuaikan diri menghadapi transformasi digital dan perubahan sistem layanan portal DJKI' },
  { code: 'AD-2', aspek: 'Adaptif', text: 'Terus berinovasi dan mengembangkan kreativitas dalam menyelesaikan kendala operasional' },
  { code: 'AD-3', aspek: 'Adaptif', text: 'Bertindak proaktif dalam merespon penugasan baru tanpa menunggu arahan berulang' },
  { code: 'AD-4', aspek: 'Adaptif', text: 'Mampu memanfaatkan teknologi informasi modern untuk mempercepat produktivitas kerja' },
  // 7. Kolaboratif
  { code: 'KL-1', aspek: 'Kolaboratif', text: 'Memberi kesempatan kepada berbagai pihak di dalam tim kerja untuk berkontribusi aktif' },
  { code: 'KL-2', aspek: 'Kolaboratif', text: 'Terbuka dalam bekerja sama untuk menghasilkan nilai tambah dan percepatan output' },
  { code: 'KL-3', aspek: 'Kolaboratif', text: 'Menggerakkan pemanfaatan berbagai sumber daya kedinasan demi tujuan bersama unit' },
  { code: 'KL-4', aspek: 'Kolaboratif', text: 'Menjaga sinergi tim kerja lintas fungsi antara ASN PNS dan PPPK secara harmonis' }
];

export const PPPKPeerAssignmentManager: React.FC<Props> = ({
  selectedYear,
  selectedSemester,
  currentUserId,
  currentUserName,
  onRefresh,
  showToast
}) => {
  const [pairs, setPairs] = useState<PPPKPeerAssignmentPair[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Tetapkan Penilai
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<PPPKPeerAssignmentPair | null>(null);
  const [assignRole, setAssignRole] = useState<'KETUA_TIM' | 'ATASAN' | 'ADMIN'>('KETUA_TIM');
  const [selectedKetuaTimId, setSelectedKetuaTimId] = useState('');
  const [selectedPnsNip, setSelectedPnsNip] = useState('');
  const [selectedPppkNip, setSelectedPppkNip] = useState('');

  // Modal Penilaian Rekan Kerja
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewPair, setReviewPair] = useState<PPPKPeerAssignmentPair | null>(null);
  const [reviewPeerType, setReviewPeerType] = useState<'PNS' | 'PPPK'>('PNS');
  const [ratings, setRatings] = useState<{ [code: string]: number }>({});

  const allEmployees: Pegawai[] = getAllEmployees();
  const pnsEmployees = allEmployees.filter(p => !p.jenisPegawai?.includes('PPPK'));
  const pppkEmployees = getPPPKEmployees();
  const ketuaTimList = getKetuaTimKerjaList();

  useEffect(() => {
    loadPairs();
  }, [selectedYear, selectedSemester]);

  const loadPairs = () => {
    const data = getPeerAssignmentPairs(selectedYear, selectedSemester);
    setPairs(data);
  };

  // Open Modal Penetapan Rekan Kerja
  const handleOpenAssign = (pair: PPPKPeerAssignmentPair) => {
    setEditingPair(pair);
    setAssignRole(pair.assignedByRole || 'KETUA_TIM');
    setSelectedPnsNip(pair.rekanPnsNip || '');
    setSelectedPppkNip(pair.rekanPppkNip || '');
    
    // Default Ketua Tim jika ada
    const ktt = ketuaTimList.find(k => k.nip === pair.assignedByNip) || ketuaTimList[0];
    if (ktt) setSelectedKetuaTimId(ktt.id);

    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPair) return;

    const pnsObj = pnsEmployees.find(p => p.nip === selectedPnsNip);
    const pppkObj = pppkEmployees.find(p => p.nip === selectedPppkNip);
    const kttObj = ketuaTimList.find(k => k.id === selectedKetuaTimId);

    if (!selectedPnsNip || !selectedPppkNip) {
      showToast('Wajib memilih 1 Rekan Kerja PNS dan 1 Rekan Kerja PPPK.', 'error');
      return;
    }

    if (selectedPppkNip === editingPair.subjectNip) {
      showToast('Rekan Kerja PPPK tidak boleh pegawai yang sama dengan yang dinilai.', 'error');
      return;
    }

    const assignedByName = assignRole === 'KETUA_TIM' && kttObj ? kttObj.nama : currentUserName;
    const assignedByNip = assignRole === 'KETUA_TIM' && kttObj ? kttObj.nip : currentUserId;

    const updated: PPPKPeerAssignmentPair = {
      ...editingPair,
      assignedByRole: assignRole,
      assignedByName,
      assignedByNip,
      rekanPnsNip: selectedPnsNip,
      rekanPnsNama: pnsObj?.nama || selectedPnsNip,
      rekanPnsJabatan: pnsObj?.jabatan || 'PNS Teknis',
      rekanPnsUnit: pnsObj?.unitKerja || editingPair.unitKerja,
      rekanPppkNip: selectedPppkNip,
      rekanPppkNama: pppkObj?.nama || selectedPppkNip,
      rekanPppkJabatan: pppkObj?.jabatan || 'PPPK Teknis',
      rekanPppkUnit: pppkObj?.unitKerja || editingPair.unitKerja,
      status: 'DITETAPKAN'
    };

    savePeerAssignmentPair(updated, currentUserId, currentUserName);
    loadPairs();
    setIsAssignModalOpen(false);
    showToast(`Penilai Rekan Kerja untuk ${editingPair.subjectNama} berhasil ditetapkan oleh ${assignedByName}.`, 'success');
    if (onRefresh) onRefresh();
  };

  // Open Modal Input Nilai Rekan Kerja
  const handleOpenReview = (pair: PPPKPeerAssignmentPair, peerType: 'PNS' | 'PPPK') => {
    setReviewPair(pair);
    setReviewPeerType(peerType);

    // Initial 4.0 for all questions
    const initialRatings: { [code: string]: number } = {};
    BERAKHLAK_QUESTIONS.forEach(q => {
      initialRatings[q.code] = 4;
    });
    setRatings(initialRatings);
    setIsReviewModalOpen(true);
  };

  const handleScoreChange = (code: string, score: number) => {
    setRatings(prev => ({ ...prev, [code]: score }));
  };

  const handleApplyPreset = (score: number) => {
    const next: { [code: string]: number } = {};
    BERAKHLAK_QUESTIONS.forEach(q => {
      next[q.code] = score;
    });
    setRatings(next);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewPair) return;

    const evaluatorNip = reviewPeerType === 'PNS' ? reviewPair.rekanPnsNip : reviewPair.rekanPppkNip;
    const evaluatorNama = reviewPeerType === 'PNS' ? reviewPair.rekanPnsNama : reviewPair.rekanPppkNama;

    const success = savePeerAssessmentReview(
      {
        subjectNip: reviewPair.subjectNip,
        peerType: reviewPeerType,
        ratings,
        year: selectedYear,
        semester: selectedSemester,
        evaluatorNip,
        evaluatorNama
      },
      currentUserId,
      currentUserName
    );

    if (success) {
      loadPairs();
      setIsReviewModalOpen(false);
      showToast(`Penilaian Rekan Kerja ${reviewPeerType} berhasil dikirim dan diakumulasikan ke Dokumen Evaluasi Resmi.`, 'success');
      if (onRefresh) onRefresh();
    } else {
      showToast('Gagal menyimpan penilaian rekan kerja.', 'error');
    }
  };

  const filteredPairs = pairs.filter(p =>
    p.subjectNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.subjectNip.includes(searchTerm) ||
    p.rekanPnsNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rekanPppkNama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10 pointer-events-none">
          <i className="bi bi-people-fill text-[160px]"></i>
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 text-xs font-bold uppercase tracking-wider">
            <i className="bi bi-check2-all"></i> Penilaian 360° Ganda (PNS & PPPK)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Penetapan & Penilaian Rekan Kerja (PNS & PPPK)
          </h2>
          <p className="text-sm text-purple-100/90 leading-relaxed">
            Sesuai regulasi penilaian kinerja 360°, setiap pegawai PPPK dinilai oleh <strong>2 Rekan Kerja</strong>:
            <strong> 1 Rekan Kerja PNS</strong> dan <strong>1 Rekan Kerja PPPK</strong> dalam unit/tim yang sama, 
            yang <strong>ditetapkan oleh Atasan Langsung atau Ketua Tim Kerja</strong>.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 font-bold flex items-center gap-2">
              <i className="bi bi-calendar3 text-amber-300"></i>
              Periode: {selectedYear} / Sem. {selectedSemester}
            </span>
            <span className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 font-bold flex items-center gap-2">
              <i className="bi bi-person-check text-emerald-300"></i>
              Total Terdaftar: <strong>{pairs.length}</strong> PPPK
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="Cari nama PPPK yang dinilai atau rekan penilai..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 font-medium"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Ditetapkan oleh: <strong>Ketua Tim Kerja / Atasan Langsung</strong>
        </div>
      </div>

      {/* Table of Pairs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                <th className="p-3.5 text-center w-12">No</th>
                <th className="p-3.5 min-w-[200px]">PPPK yang Dinilai</th>
                <th className="p-3.5 min-w-[170px]">Ditetapkan Oleh</th>
                <th className="p-3.5 min-w-[220px] bg-blue-50/40">
                  <div className="flex items-center gap-1.5 text-blue-900">
                    <i className="bi bi-award-fill text-blue-600"></i>
                    1. Rekan Kerja PNS
                  </div>
                </th>
                <th className="p-3.5 min-w-[220px] bg-purple-50/40">
                  <div className="flex items-center gap-1.5 text-purple-900">
                    <i className="bi bi-person-badge text-purple-600"></i>
                    2. Rekan Kerja PPPK
                  </div>
                </th>
                <th className="p-3.5 text-center min-w-[110px]">Rata-rata Rekan</th>
                <th className="p-3.5 text-center w-28">Aksi Penetapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPairs.map((p, idx) => {
                const avgPns = p.rekanPnsScoreAvg ?? 0;
                const avgPppk = p.rekanPppkScoreAvg ?? 0;
                let combinedAvg = 0;
                if (avgPns && avgPppk) combinedAvg = (avgPns + avgPppk) / 2;
                else if (avgPns) combinedAvg = avgPns;
                else if (avgPppk) combinedAvg = avgPppk;

                return (
                  <tr key={p.id} className="hover:bg-purple-50/20 transition-colors">
                    <td className="p-3.5 text-center text-slate-400 font-bold">{idx + 1}</td>

                    {/* PPPK Subject */}
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 text-xs">{p.subjectNama}</p>
                      <p className="font-mono text-[10px] text-slate-500">NIP. {p.subjectNip}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{p.unitKerja}</p>
                    </td>

                    {/* Penetap */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          p.assignedByRole === 'KETUA_TIM'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}>
                          {p.assignedByRole === 'KETUA_TIM' ? 'Ketua Tim Kerja' : 'Atasan Langsung'}
                        </span>
                        <p className="text-xs font-bold text-slate-800">{p.assignedByName || 'Ketua Tim Kerja SDM'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIP. {p.assignedByNip}</p>
                      </div>
                    </td>

                    {/* Rekan PNS */}
                    <td className="p-3.5 bg-blue-50/20">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{p.rekanPnsNama || 'Belum Ditetapkan'}</p>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            p.rekanPnsStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.rekanPnsStatus === 'COMPLETED' ? 'Sudah Dinilai' : 'Menunggu'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">NIP. {p.rekanPnsNip || '-'}</p>
                        {p.rekanPnsStatus === 'COMPLETED' && p.rekanPnsScoreAvg ? (
                          <div className="text-[11px] font-bold text-blue-800 flex items-center justify-between pt-0.5">
                            <span>Skor BerAKHLAK:</span>
                            <span className="bg-blue-100 px-1.5 py-0.2 rounded font-black">{p.rekanPnsScoreAvg.toFixed(2)}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(p, 'PNS')}
                            className="mt-1 w-full py-1 text-[10px] font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-200 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <i className="bi bi-pencil-fill"></i>
                            Input Nilai Rekan PNS
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Rekan PPPK */}
                    <td className="p-3.5 bg-purple-50/20">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate max-w-[150px]">{p.rekanPppkNama || 'Belum Ditetapkan'}</p>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            p.rekanPppkStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.rekanPppkStatus === 'COMPLETED' ? 'Sudah Dinilai' : 'Menunggu'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">NIP. {p.rekanPppkNip || '-'}</p>
                        {p.rekanPppkStatus === 'COMPLETED' && p.rekanPppkScoreAvg ? (
                          <div className="text-[11px] font-bold text-purple-800 flex items-center justify-between pt-0.5">
                            <span>Skor BerAKHLAK:</span>
                            <span className="bg-purple-100 px-1.5 py-0.2 rounded font-black">{p.rekanPppkScoreAvg.toFixed(2)}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(p, 'PPPK')}
                            className="mt-1 w-full py-1 text-[10px] font-bold text-purple-700 bg-purple-100/70 hover:bg-purple-200 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <i className="bi bi-pencil-fill"></i>
                            Input Nilai Rekan PPPK
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Combined Average */}
                    <td className="p-3.5 text-center">
                      {combinedAvg > 0 ? (
                        <div>
                          <span className="text-sm font-black text-slate-900">{combinedAvg.toFixed(2)}</span>
                          <span className="block text-[9px] text-slate-500 font-bold">Skor Rata-Rata</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenAssign(p)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-600 hover:text-white text-slate-700 font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        title="Tetapkan atau ganti rekan kerja penilai"
                      >
                        <i className="bi bi-sliders"></i>
                        Tetapkan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tetapkan Rekan Kerja */}
      {isAssignModalOpen && editingPair && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Penetapan Penilai Rekan Kerja
                </h3>
                <p className="text-xs text-slate-500">
                  Untuk Pegawai: <strong>{editingPair.subjectNama}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              {/* Otoritas Penetap */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  Otoritas Yang Memilih & Menetapkan Rekan Kerja:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignRole('KETUA_TIM')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
                      assignRole === 'KETUA_TIM'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <i className="bi bi-diagram-3-fill"></i>
                    Ketua Tim Kerja
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignRole('ATASAN')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border ${
                      assignRole === 'ATASAN'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <i className="bi bi-person-fill"></i>
                    Atasan Langsung
                  </button>
                </div>

                {assignRole === 'KETUA_TIM' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-600">Pilih Ketua Tim Kerja Penilai:</label>
                    <select
                      value={selectedKetuaTimId}
                      onChange={(e) => setSelectedKetuaTimId(e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                    >
                      {ketuaTimList.map(k => (
                        <option key={k.id} value={k.id}>
                          {k.namaTimKerja} — {k.nama} (NIP. {k.nip})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 1. Pilih Rekan Kerja PNS */}
              <div className="space-y-1.5 p-4 bg-blue-50/50 rounded-2xl border border-blue-200/60">
                <label className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <i className="bi bi-award-fill text-blue-600"></i>
                  1. Rekan Kerja PNS (Pegawai Negeri Sipil) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedPnsNip}
                  onChange={(e) => setSelectedPnsNip(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-blue-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-600 text-slate-800"
                >
                  <option value="">-- Pilih Rekan Kerja PNS --</option>
                  {pnsEmployees.map(p => (
                    <option key={p.nip} value={p.nip}>
                      {p.nama} — {p.jabatan || 'PNS'} ({p.unitKerja})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-800/80">
                  Rekan kerja ASN PNS di unit/tim yang sama yang mengetahui perilaku harian pegawai.
                </p>
              </div>

              {/* 2. Pilih Rekan Kerja PPPK */}
              <div className="space-y-1.5 p-4 bg-purple-50/50 rounded-2xl border border-purple-200/60">
                <label className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                  <i className="bi bi-person-badge text-purple-600"></i>
                  2. Rekan Kerja PPPK (Pegawai Pemerintah dg Perjanjian Kerja) <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedPppkNip}
                  onChange={(e) => setSelectedPppkNip(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-purple-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-600 text-slate-800"
                >
                  <option value="">-- Pilih Rekan Kerja PPPK --</option>
                  {pppkEmployees
                    .filter(p => p.nip !== editingPair.subjectNip)
                    .map(p => (
                      <option key={p.nip} value={p.nip}>
                        {p.nama} — {p.jabatan || 'PPPK'} ({p.unitKerja})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-purple-800/80">
                  Sesama pegawai PPPK yang bertugas dalam tim yang sama.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <i className="bi bi-check2-circle"></i>
                  Simpan Penetapan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Input Penilaian Rekan Kerja (Formulir BerAKHLAK) */}
      {isReviewModalOpen && reviewPair && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  reviewPeerType === 'PNS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  Formulir Penilaian Rekan Kerja {reviewPeerType}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Evaluasi Perilaku BerAKHLAK Pegawai PPPK
                </h3>
                <p className="text-xs text-slate-500">
                  Pegawai yang Dinilai: <strong>{reviewPair.subjectNama}</strong> | Penilai: <strong>{reviewPeerType === 'PNS' ? reviewPair.rekanPnsNama : reviewPair.rekanPppkNama}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-600 text-[11px]">Isi Cepat Nilai:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset(5)}
                  className="px-2.5 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold rounded-lg text-[11px]"
                >
                  Semua 5 (Sangat Baik)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(4)}
                  className="px-2.5 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 font-bold rounded-lg text-[11px]"
                >
                  Semua 4 (Baik)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(3)}
                  className="px-2.5 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 font-bold rounded-lg text-[11px]"
                >
                  Semua 3 (Cukup)
                </button>
              </div>
            </div>

            {/* Questions List */}
            <form onSubmit={handleSaveReview} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {BERAKHLAK_QUESTIONS.map((q, qIdx) => {
                  const currentScore = ratings[q.code] || 4;
                  return (
                    <div key={q.code} className="p-3.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                            {q.code}
                          </span>
                          <span className="text-[11px] font-bold text-purple-700">{q.aspek}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-snug">{q.text}</p>
                      </div>

                      {/* Score Selector (1 to 5) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3, 4, 5].map(score => (
                          <button
                            key={score}
                            type="button"
                            onClick={() => handleScoreChange(q.code, score)}
                            className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                              currentScore === score
                                ? 'bg-purple-600 text-white shadow-md scale-105'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {score}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-600">
                  Rata-rata Skor: <strong>{(Object.values(ratings).reduce((a, b) => a + b, 0) / (Object.values(ratings).length || 1)).toFixed(2)}</strong> (dari skala 5.00)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <i className="bi bi-send-fill"></i>
                    Kirim Penilaian Rekan Kerja
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
