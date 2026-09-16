import React, { useState, useEffect } from 'react';
import { PPPKSkpSubmission, PPPKSkpItem, PPPKSemester, Pegawai } from '../../types';
import {
  getSkpSubmissions,
  saveSkpSubmission,
  submitSkpToAssessor,
  reviewAndGradeSkp,
  getPPPKEmployees,
  getKetuaTimKerjaList,
  getAllEmployees
} from '../../services/pppkEvaluationService';

interface Props {
  selectedYear: number;
  selectedSemester: PPPKSemester;
  currentUserId: string;
  currentUserName: string;
  onRefresh?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PPPKSkpManager: React.FC<Props> = ({
  selectedYear,
  selectedSemester,
  currentUserId,
  currentUserName,
  onRefresh,
  showToast
}) => {
  const [activeRoleView, setActiveRoleView] = useState<'PEGAWAI' | 'PENILAI'>('PEGAWAI');
  const [submissions, setSubmissions] = useState<PPPKSkpSubmission[]>([]);

  // Pegawai View State
  const [selectedPppkNip, setSelectedPppkNip] = useState<string>('');
  const [currentSubmission, setCurrentSubmission] = useState<PPPKSkpSubmission | null>(null);

  // Penilai View State
  const [reviewModalSub, setReviewModalSub] = useState<PPPKSkpSubmission | null>(null);
  const [reviewRating, setReviewRating] = useState<'DIATAS EKSPEKTASI' | 'SESUAI EKSPEKTASI' | 'DIBAWAH EKSPEKTASI'>('SESUAI EKSPEKTASI');
  const [reviewNotes, setReviewNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');

  const pppkEmployees: Pegawai[] = getPPPKEmployees();
  const ketuaTimList = getKetuaTimKerjaList();
  const allEmployees: Pegawai[] = getAllEmployees();

  useEffect(() => {
    loadSubmissions();
  }, [selectedYear, selectedSemester]);

  const loadSubmissions = () => {
    const list = getSkpSubmissions(selectedYear, selectedSemester);
    setSubmissions(list);

    if (list.length > 0 && !selectedPppkNip) {
      setSelectedPppkNip(list[0].employeeId);
      setCurrentSubmission(list[0]);
    } else if (selectedPppkNip) {
      const found = list.find(s => s.employeeId === selectedPppkNip);
      setCurrentSubmission(found || null);
    }
  };

  useEffect(() => {
    if (selectedPppkNip) {
      const found = submissions.find(s => s.employeeId === selectedPppkNip);
      if (found) {
        setCurrentSubmission(found);
      } else {
        // Init draft submission for selected employee
        const emp = pppkEmployees.find(p => p.nip === selectedPppkNip);
        if (emp) {
          const newDraft: PPPKSkpSubmission = {
            id: `SKP-${selectedYear}-${selectedSemester}-${emp.nip}`,
            employeeId: emp.nip,
            namaPegawai: emp.nama,
            nipPegawai: emp.nip,
            jabatanPegawai: emp.jabatan,
            unitKerja: emp.unitKerja,
            year: selectedYear,
            semester: selectedSemester,
            status: 'DRAFT',
            penilaiType: 'KETUA_TIM',
            penilaiNama: ketuaTimList[0]?.nama || 'Dr. H. Rahmat Santoso, S.H., M.H.',
            penilaiNip: ketuaTimList[0]?.nip || '197905122003121002',
            penilaiJabatan: ketuaTimList[0]?.jabatan || 'Ketua Tim Kerja SDM',
            penilaiUnitKerja: ketuaTimList[0]?.unitKerja || emp.unitKerja,
            items: [
              {
                id: 'SKP-ITEM-1',
                no: 1,
                rencanaHasilKerja: 'Pengelolaan berkas dan dokumen permohonan kekayaan intelektual',
                indikatorKinerja: 'Jumlah berkas administrasi yang diverifikasi secara lengkap',
                target: 120,
                satuan: 'Berkas Permohonan',
                realisasi: 125,
                capaianPersen: 104.17
              },
              {
                id: 'SKP-ITEM-2',
                no: 2,
                rencanaHasilKerja: 'Penyusunan laporan rekapitulasi data layanan publik',
                indikatorKinerja: 'Tersedianya rekap berkala bulanan yang valid dan tepat waktu',
                target: 6,
                satuan: 'Laporan Semesteran',
                realisasi: 6,
                capaianPersen: 100
              }
            ],
            totalTarget: 126,
            totalRealisasi: 131,
            rataRataCapaianPersen: 102.08,
            ratingHasilKerja: 'SESUAI EKSPEKTASI',
            createdAt: new Date().toLocaleString('id-ID'),
            updatedAt: new Date().toLocaleString('id-ID'),
            createdBy: currentUserName,
            updatedBy: currentUserName
          };
          setCurrentSubmission(newDraft);
        }
      }
    }
  }, [selectedPppkNip, submissions]);

  // Add Item to SKP
  const handleAddItem = () => {
    if (!currentSubmission) return;
    const newNo = (currentSubmission.items?.length || 0) + 1;
    const newItem: PPPKSkpItem = {
      id: `ITEM-${Date.now()}`,
      no: newNo,
      rencanaHasilKerja: '',
      indikatorKinerja: '',
      target: 10,
      satuan: 'Laporan / Dokumen',
      realisasi: 10,
      capaianPersen: 100
    };
    setCurrentSubmission({
      ...currentSubmission,
      items: [...(currentSubmission.items || []), newItem]
    });
  };

  const handleUpdateItem = (index: number, field: keyof PPPKSkpItem, value: any) => {
    if (!currentSubmission || !currentSubmission.items) return;
    const items = [...currentSubmission.items];
    const it = { ...items[index], [field]: value };

    if (field === 'target' || field === 'realisasi') {
      const tgt = field === 'target' ? Number(value) : it.target;
      const rel = field === 'realisasi' ? Number(value) : it.realisasi;
      it.capaianPersen = tgt > 0 ? Math.round((rel / tgt) * 100 * 10) / 10 : 100;
    }

    items[index] = it;
    setCurrentSubmission({ ...currentSubmission, items });
  };

  const handleDeleteItem = (index: number) => {
    if (!currentSubmission || !currentSubmission.items) return;
    const items = currentSubmission.items.filter((_, idx) => idx !== index).map((it, idx) => ({ ...it, no: idx + 1 }));
    setCurrentSubmission({ ...currentSubmission, items });
  };

  // Save Draft SKP
  const handleSaveDraft = () => {
    if (!currentSubmission) return;
    try {
      const saved = saveSkpSubmission(currentSubmission, currentUserId, currentUserName);
      setCurrentSubmission(saved);
      loadSubmissions();
      showToast('Draft SKP berhasil disimpan.', 'success');
      if (onRefresh) onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan SKP', 'error');
    }
  };

  // Submit SKP to Assessor
  const handleSubmitToAssessor = () => {
    if (!currentSubmission) return;
    if (!currentSubmission.items || currentSubmission.items.length === 0) {
      showToast('Wajib memasukkan minimal 1 butir rencana hasil kerja.', 'error');
      return;
    }

    if (!window.confirm(`Kirim pengajuan SKP ini kepada ${currentSubmission.penilaiNama} (${currentSubmission.penilaiType === 'KETUA_TIM' ? 'Ketua Tim Kerja' : 'Atasan Langsung'}) untuk dinilai?`)) return;

    try {
      // Ensure saved first then submit
      saveSkpSubmission(currentSubmission, currentUserId, currentUserName);
      const submitted = submitSkpToAssessor(currentSubmission.id, currentUserId, currentUserName);
      setCurrentSubmission(submitted);
      loadSubmissions();
      showToast(`SKP berhasil diajukan kepada ${submitted.penilaiNama}. Menunggu verifikasi & penilaian.`, 'success');
      if (onRefresh) onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Gagal mengajukan SKP', 'error');
    }
  };

  // Penilai handles
  const handleOpenReview = (sub: PPPKSkpSubmission) => {
    setReviewModalSub(sub);
    setReviewRating(sub.ratingHasilKerja || 'SESUAI EKSPEKTASI');
    setReviewNotes(sub.catatanPenilai || '');
    setRevisionNotes(sub.catatanRevisi || '');
  };

  const handleApproveSkp = () => {
    if (!reviewModalSub) return;
    try {
      reviewAndGradeSkp(
        reviewModalSub.id,
        {
          ratingHasilKerja: reviewRating,
          catatanPenilai: reviewNotes,
          status: 'DISETUJUI'
        },
        currentUserId,
        currentUserName
      );
      setReviewModalSub(null);
      loadSubmissions();
      showToast(`SKP ${reviewModalSub.namaPegawai} berhasil disetujui dengan Rating: ${reviewRating}. Dokumen Evaluasi Resmi telah tersinkronisasi.`, 'success');
      if (onRefresh) onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Gagal menyetujui SKP', 'error');
    }
  };

  const handleRequestRevision = () => {
    if (!reviewModalSub) return;
    if (!revisionNotes.trim()) {
      showToast('Wajib memberikan catatan perbaikan revisi.', 'error');
      return;
    }

    try {
      reviewAndGradeSkp(
        reviewModalSub.id,
        {
          ratingHasilKerja: reviewRating,
          catatanRevisi: revisionNotes,
          status: 'PERLU_REVISI'
        },
        currentUserId,
        currentUserName
      );
      setReviewModalSub(null);
      loadSubmissions();
      showToast(`Permintaan revisi SKP telah dikirimkan kepada ${reviewModalSub.namaPegawai}.`, 'info');
      if (onRefresh) onRefresh();
    } catch (e: any) {
      showToast(e.message || 'Gagal mengirim revisi', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10 pointer-events-none">
          <i className="bi bi-file-earmark-ruled text-[160px]"></i>
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 text-xs font-bold uppercase tracking-wider">
            <i className="bi bi-bullseye"></i> Modul Sasaran Kinerja Pegawai (SKP)
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Modul Penyusunan & Penilaian SKP PPPK
          </h2>
          <p className="text-sm text-cyan-100/90 leading-relaxed">
            Alur kerja mandiri SKP PPPK: Pegawai menyusun rencana target & realisasi hasil kerja, menentukan penilai 
            (<strong>Ketua Tim Kerja atau Atasan Langsung</strong>), mengirimkan pengajuan, serta memperoleh reviu, 
            catatan umpan balik, dan <strong>Rating Hasil Kerja</strong> resmi.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <div className="bg-white/10 p-1 rounded-2xl border border-white/20 inline-flex">
              <button
                onClick={() => setActiveRoleView('PEGAWAI')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeRoleView === 'PEGAWAI'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <i className="bi bi-pencil-square"></i>
                Penyusunan SKP Pegawai
              </button>
              <button
                onClick={() => setActiveRoleView('PENILAI')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeRoleView === 'PENILAI'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <i className="bi bi-check2-circle"></i>
                Verifikasi & Penilaian (Atasan / Ketua Tim)
                {submissions.filter(s => s.status === 'DIAJUKAN').length > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
                    {submissions.filter(s => s.status === 'DIAJUKAN').length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: PEGAWAI PPPK (Penyusunan & Pengajuan SKP) */}
      {activeRoleView === 'PEGAWAI' && (
        <div className="space-y-5">
          {/* Employee Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <span className="text-xs font-bold text-slate-600 shrink-0">Pilih Pegawai PPPK:</span>
              <select
                value={selectedPppkNip}
                onChange={(e) => setSelectedPppkNip(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-600 text-slate-800"
              >
                {pppkEmployees.map(p => (
                  <option key={p.nip} value={p.nip}>
                    {p.nama} — NIP. {p.nip} ({p.jabatan})
                  </option>
                ))}
              </select>
            </div>

            {currentSubmission && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Status SKP:</span>
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                  currentSubmission.status === 'DISETUJUI'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : currentSubmission.status === 'DIAJUKAN'
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                    : currentSubmission.status === 'PERLU_REVISI'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {currentSubmission.status}
                </span>
              </div>
            )}
          </div>

          {currentSubmission && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
              {/* Revision Alert if any */}
              {currentSubmission.status === 'PERLU_REVISI' && currentSubmission.catatanRevisi && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900">
                  <i className="bi bi-exclamation-octagon-fill text-rose-600 text-xl shrink-0 mt-0.5"></i>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider">Catatan Revisi dari Penilai:</h4>
                    <p className="text-xs font-medium">{currentSubmission.catatanRevisi}</p>
                    <p className="text-[11px] text-rose-600 font-bold mt-1">Silakan perbaiki data di bawah lalu klik "Kirim Ulang SKP".</p>
                  </div>
                </div>
              )}

              {/* Approval Info if Approved */}
              {currentSubmission.status === 'DISETUJUI' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between flex-wrap gap-3 text-emerald-950">
                  <div className="flex items-center gap-3">
                    <i className="bi bi-patch-check-fill text-emerald-600 text-2xl"></i>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider">SKP Telah Disetujui & Dinilai</h4>
                      <p className="text-xs text-emerald-800">
                        Penilai: <strong>{currentSubmission.penilaiNama}</strong> ({currentSubmission.penilaiType === 'KETUA_TIM' ? 'Ketua Tim Kerja' : 'Atasan Langsung'})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 block">RATING HASIL KERJA:</span>
                    <span className="text-sm font-black text-emerald-900 bg-emerald-200/80 px-3 py-1 rounded-xl">
                      {currentSubmission.ratingHasilKerja || 'SESUAI EKSPEKTASI'}
                    </span>
                  </div>
                </div>
              )}

              {/* Penilai Selector Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                    <i className="bi bi-person-check-fill text-blue-600"></i>
                    Tentukan Pejabat / Ketua Tim Penilai Kinerja:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentSubmission.status === 'DISETUJUI'}
                      onClick={() => setCurrentSubmission({ ...currentSubmission, penilaiType: 'KETUA_TIM' })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        currentSubmission.penilaiType === 'KETUA_TIM'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Ketua Tim Kerja
                    </button>
                    <button
                      type="button"
                      disabled={currentSubmission.status === 'DISETUJUI'}
                      onClick={() => setCurrentSubmission({ ...currentSubmission, penilaiType: 'STRUKTURAL' })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        currentSubmission.penilaiType === 'STRUKTURAL'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Atasan Langsung (Struktural)
                    </button>
                  </div>
                </div>

                {currentSubmission.penilaiType === 'KETUA_TIM' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Pilih Ketua Tim Kerja:</label>
                      <select
                        disabled={currentSubmission.status === 'DISETUJUI'}
                        value={ketuaTimList.find(k => k.nip === currentSubmission.penilaiNip)?.id || ''}
                        onChange={(e) => {
                          const k = ketuaTimList.find(item => item.id === e.target.value);
                          if (k) {
                            setCurrentSubmission({
                              ...currentSubmission,
                              penilaiNama: k.nama,
                              penilaiNip: k.nip,
                              penilaiPangkatGolRuang: k.pangkatGolRuang,
                              penilaiJabatan: k.jabatan,
                              penilaiUnitKerja: k.unitKerja
                            });
                          }
                        }}
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                      >
                        {ketuaTimList.map(k => (
                          <option key={k.id} value={k.id}>
                            {k.namaTimKerja} — {k.nama} (NIP. {k.nip})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs flex items-center gap-2">
                      <i className="bi bi-info-circle-fill text-amber-600 shrink-0"></i>
                      <span className="text-amber-900 text-[11px]">
                        Ketua Tim Kerja akan memverifikasi capaian target dan memberikan rating hasil kerja resmi.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Pilih Pejabat Atasan Langsung (Struktural):</label>
                      <select
                        disabled={currentSubmission.status === 'DISETUJUI'}
                        value={currentSubmission.penilaiNip}
                        onChange={(e) => {
                          const emp = allEmployees.find(item => item.nip === e.target.value);
                          if (emp) {
                            setCurrentSubmission({
                              ...currentSubmission,
                              penilaiNama: emp.nama,
                              penilaiNip: emp.nip,
                              penilaiPangkatGolRuang: emp.pangkat || 'Pembina (IV/a)',
                              penilaiJabatan: emp.jabatan,
                              penilaiUnitKerja: emp.unitKerja
                            });
                          }
                        }}
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                      >
                        {allEmployees.filter(e => !e.jenisPegawai?.includes('PPPK')).slice(0, 15).map(emp => (
                          <option key={emp.nip} value={emp.nip}>
                            {emp.nama} — {emp.jabatan} (NIP. {emp.nip})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs flex items-center gap-2">
                      <i className="bi bi-info-circle-fill text-blue-600 shrink-0"></i>
                      <span className="text-blue-900 text-[11px]">
                        Atasan Langsung Pejabat Penilai Kinerja Eselon III/Koordinator.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <i className="bi bi-list-task text-cyan-600"></i>
                    Matriks Rencana Hasil Kerja & Target Capaian
                  </h4>
                  {currentSubmission.status !== 'DISETUJUI' && (
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs rounded-xl border border-cyan-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <i className="bi bi-plus-circle-fill text-cyan-600"></i>
                      Tambah Butir Rencana Kerja
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="p-3 text-center w-12">No</th>
                        <th className="p-3 min-w-[240px]">Rencana Hasil Kerja</th>
                        <th className="p-3 min-w-[200px]">Indikator Kinerja Individu</th>
                        <th className="p-3 text-center w-20">Target</th>
                        <th className="p-3 min-w-[120px]">Satuan</th>
                        <th className="p-3 text-center w-20">Realisasi</th>
                        <th className="p-3 text-center w-24">% Capaian</th>
                        {currentSubmission.status !== 'DISETUJUI' && (
                          <th className="p-3 text-center w-14">Aksi</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentSubmission.items?.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          
                          <td className="p-2">
                            <textarea
                              rows={2}
                              disabled={currentSubmission.status === 'DISETUJUI'}
                              value={it.rencanaHasilKerja}
                              onChange={(e) => handleUpdateItem(idx, 'rencanaHasilKerja', e.target.value)}
                              placeholder="Ketik rencana hasil kerja..."
                              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 font-medium"
                            />
                          </td>

                          <td className="p-2">
                            <textarea
                              rows={2}
                              disabled={currentSubmission.status === 'DISETUJUI'}
                              value={it.indikatorKinerja}
                              onChange={(e) => handleUpdateItem(idx, 'indikatorKinerja', e.target.value)}
                              placeholder="Indikator tolok ukur..."
                              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 font-medium"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              disabled={currentSubmission.status === 'DISETUJUI'}
                              value={it.target}
                              onChange={(e) => handleUpdateItem(idx, 'target', e.target.value)}
                              className="w-16 p-1.5 text-center font-bold text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600"
                            />
                          </td>

                          <td className="p-2">
                            <input
                              type="text"
                              disabled={currentSubmission.status === 'DISETUJUI'}
                              value={it.satuan}
                              onChange={(e) => handleUpdateItem(idx, 'satuan', e.target.value)}
                              className="w-full p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 font-medium"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              disabled={currentSubmission.status === 'DISETUJUI'}
                              value={it.realisasi}
                              onChange={(e) => handleUpdateItem(idx, 'realisasi', e.target.value)}
                              className="w-16 p-1.5 text-center font-black text-xs bg-white border border-cyan-300 rounded-xl focus:outline-none focus:border-cyan-600 text-cyan-900"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                              it.capaianPersen >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : it.capaianPersen >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {it.capaianPersen}%
                            </span>
                          </td>

                          {currentSubmission.status !== 'DISETUJUI' && (
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus butir"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Terakhir diperbarui: <strong>{currentSubmission.updatedAt || '-'}</strong>
                </div>

                {currentSubmission.status !== 'DISETUJUI' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <i className="bi bi-floppy mr-1.5"></i>
                      Simpan Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitToAssessor}
                      className="px-5 py-2 text-xs font-black text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <i className="bi bi-send-fill"></i>
                      {currentSubmission.status === 'PERLU_REVISI' ? 'Kirim Ulang Hasil Revisi' : 'Ajukan SKP ke Penilai'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: PENILAI (Verifikasi & Penilaian SKP) */}
      {activeRoleView === 'PENILAI' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <i className="bi bi-inbox-fill text-blue-600"></i>
              Daftar Antrean Pengajuan SKP PPPK
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Total Pengajuan: <strong>{submissions.length}</strong> Pegawai
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map((sub) => {
              const totalItems = sub.items?.length || 0;
              const avgCapaian = totalItems > 0
                ? Math.round((sub.items!.reduce((acc, it) => acc + (it.capaianPersen || 0), 0) / totalItems) * 10) / 10
                : 0;

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        sub.status === 'DISETUJUI'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : sub.status === 'DIAJUKAN'
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 animate-pulse'
                          : sub.status === 'PERLU_REVISI'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {sub.tanggalPengajuan || sub.createdAt?.split(' ')[0] || 'Draft'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900">{sub.namaPegawai}</h4>
                      <p className="text-[10px] font-mono text-slate-500">NIP. {sub.employeeId}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">{sub.jabatanPegawai}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Penilai Dituju:</span>
                        <span className="font-bold text-slate-900 truncate max-w-[150px]">{sub.penilaiNama}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Tipe Penilai:</span>
                        <span className="font-bold text-blue-700">{sub.penilaiType === 'KETUA_TIM' ? 'Ketua Tim Kerja' : 'Atasan Langsung'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                        <span>Rata-rata Capaian:</span>
                        <span className="font-black text-emerald-700">{avgCapaian}% ({totalItems} butir)</span>
                      </div>
                    </div>

                    {sub.ratingHasilKerja && (
                      <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200/60 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 block">RATING HASIL KERJA</span>
                        <span className="text-xs font-black text-emerald-900">{sub.ratingHasilKerja}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenReview(sub)}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="bi bi-search"></i>
                    {sub.status === 'DISETUJUI' ? 'Lihat Detail Penilaian' : 'Reviu & Berikan Nilai SKP'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL REVIU & PENILAIAN SKP OLEH ATASAN / KETUA TIM */}
      {reviewModalSub && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-cyan-100 text-cyan-800">
                  Panel Verifikasi Penilai ({reviewModalSub.penilaiType === 'KETUA_TIM' ? 'Ketua Tim Kerja' : 'Atasan Langsung'})
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Reviu & Penetapan Rating Hasil Kerja SKP
                </h3>
                <p className="text-xs text-slate-500">
                  Pegawai: <strong>{reviewModalSub.namaPegawai}</strong> (NIP. {reviewModalSub.employeeId})
                </p>
              </div>
              <button
                onClick={() => setReviewModalSub(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1">
              {/* List of items */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5 min-w-[200px]">Rencana Kerja & Indikator</th>
                      <th className="p-2.5 text-center w-16">Target</th>
                      <th className="p-2.5 text-center w-16">Realisasi</th>
                      <th className="p-2.5 text-center w-20">% Capaian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewModalSub.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <p className="font-bold text-slate-900">{it.rencanaHasilKerja}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{it.indikatorKinerja}</p>
                        </td>
                        <td className="p-2.5 text-center font-medium">{it.target} {it.satuan}</td>
                        <td className="p-2.5 text-center font-black text-cyan-800">{it.realisasi} {it.satuan}</td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            it.capaianPersen >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {it.capaianPersen}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Penetapan Rating Hasil Kerja */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <label className="text-xs font-black text-slate-800 block">
                  Tentukan Rating Hasil Kerja (Sesuai Permenpan RB No. 6 Tahun 2022):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewRating('DIATAS EKSPEKTASI')}
                    className={`p-3 rounded-xl text-xs font-black transition-all border text-left cursor-pointer ${
                      reviewRating === 'DIATAS EKSPEKTASI'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <i className="bi bi-star-fill text-amber-300"></i>
                      <span>DIATAS EKSPEKTASI</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${reviewRating === 'DIATAS EKSPEKTASI' ? 'text-emerald-100' : 'text-slate-400'}`}>
                      Capaian realisasi melebihi target dan berkontribusi signifikan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewRating('SESUAI EKSPEKTASI')}
                    className={`p-3 rounded-xl text-xs font-black transition-all border text-left cursor-pointer ${
                      reviewRating === 'SESUAI EKSPEKTASI'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <i className="bi bi-check-circle-fill text-blue-200"></i>
                      <span>SESUAI EKSPEKTASI</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${reviewRating === 'SESUAI EKSPEKTASI' ? 'text-blue-100' : 'text-slate-400'}`}>
                      Target terpenuhi sesuai standar dan indikator yang ditetapkan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewRating('DIBAWAH EKSPEKTASI')}
                    className={`p-3 rounded-xl text-xs font-black transition-all border text-left cursor-pointer ${
                      reviewRating === 'DIBAWAH EKSPEKTASI'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <i className="bi bi-exclamation-circle-fill text-rose-200"></i>
                      <span>DIBAWAH EKSPEKTASI</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${reviewRating === 'DIBAWAH EKSPEKTASI' ? 'text-rose-100' : 'text-slate-400'}`}>
                      Sebagian target tidak tercapai atau membutuhkan pembinaan.
                    </p>
                  </button>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-slate-700">Umpan Balik / Catatan Penilai:</label>
                  <textarea
                    rows={2}
                    placeholder="Ketik catatan apresiasi atau evaluasi kinerja..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-rose-700">Catatan Perbaikan (Diisi jika meminta revisi):</label>
                  <input
                    type="text"
                    placeholder="Contoh: Lampirkan bukti dukung laporan bulan Mei..."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-rose-200 rounded-xl focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRequestRevision}
                className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                <i className="bi bi-arrow-counterclockwise mr-1"></i>
                Minta Revisi
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalSub(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleApproveSkp}
                  className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <i className="bi bi-check-circle-fill"></i>
                  Setujui & Terbitkan Nilai Hasil Kerja
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
