import React, { useState, useMemo } from 'react';
import {
  EvaluationPeriod,
  EvaluationPeriodStatus,
  PPPKMasterPertanyaanPerilaku,
  PPPKAuditLogEntry,
  Pegawai
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  getMasterPertanyaanPerilaku,
  saveMasterPertanyaanPerilaku,
  getAuditLogs,
  getMasterPeriods,
  saveMasterPeriod,
  deleteMasterPeriod
} from '../../../services/pppkPenilaianModuleService';

interface PPPKPengaturanPeriodeTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  periods?: EvaluationPeriod[];
  onSavePeriod?: (p: EvaluationPeriod) => void;
  onDeletePeriod?: (id: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  onRefresh?: () => void;
}

export const PPPKPengaturanPeriodeTab: React.FC<PPPKPengaturanPeriodeTabProps> = ({
  activeRole,
  activePegawai,
  periods,
  onSavePeriod,
  onDeletePeriod,
  showToast,
  onRefreshData,
  onRefreshAll,
  onRefresh
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const safeRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
    if (onRefresh) onRefresh();
  };

  const effectivePeriods = useMemo(() => {
    if (periods && Array.isArray(periods) && periods.length > 0) return periods;
    return getMasterPeriods() || [];
  }, [periods]);

  const [subTab, setSubTab] = useState<'PERIODE' | 'PERTANYAAN' | 'AUDIT'>('PERIODE');

  // Master questions
  const [questions, setQuestions] = useState<PPPKMasterPertanyaanPerilaku[]>(() => {
    try {
      return getMasterPertanyaanPerilaku() || [];
    } catch (e) {
      return [];
    }
  });

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<PPPKAuditLogEntry[]>(() => {
    try {
      return getAuditLogs() || [];
    } catch (e) {
      return [];
    }
  });

  // Period Form Modal
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriod | null>(null);

  const [periodForm, setPeriodForm] = useState<{
    name: string;
    year: number;
    semester: 'I' | 'II';
    startDate: string;
    endDate: string;
    status: EvaluationPeriodStatus;
  }>({
    name: '',
    year: new Date().getFullYear(),
    semester: 'I',
    startDate: '',
    endDate: '',
    status: 'OPEN'
  });

  const openAddPeriod = () => {
    setEditingPeriod(null);
    setPeriodForm({
      name: `Periode Semester I Tahun ${new Date().getFullYear()}`,
      year: new Date().getFullYear(),
      semester: 'I',
      startDate: `${new Date().getFullYear()}-01-01`,
      endDate: `${new Date().getFullYear()}-06-30`,
      status: 'OPEN'
    });
    setIsPeriodModalOpen(true);
  };

  const openEditPeriod = (p: EvaluationPeriod) => {
    setEditingPeriod(p);
    setPeriodForm({
      name: p.name,
      year: p.year,
      semester: p.semester,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status
    });
    setIsPeriodModalOpen(true);
  };

  const handleSavePeriodForm = (e: React.FormEvent) => {
    e.preventDefault();
    const periodToSave: EvaluationPeriod = {
      id: editingPeriod ? editingPeriod.id : `PERIOD-${periodForm.year}-${periodForm.semester}-${Date.now()}`,
      name: periodForm.name,
      year: Number(periodForm.year),
      semester: periodForm.semester,
      startDate: periodForm.startDate,
      endDate: periodForm.endDate,
      status: periodForm.status,
      skpWeight: 60,
      behaviorWeight: 25,
      attendanceWeight: 15,
      createdAt: editingPeriod?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingPeriod?.createdBy || activePegawai?.nama || 'Admin SDM',
      updatedBy: activePegawai?.nama || 'Admin SDM'
    };

    try {
      saveMasterPeriod(periodToSave, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
      if (onSavePeriod) {
        onSavePeriod(periodToSave);
      }
      setIsPeriodModalOpen(false);
      safeRefresh();
      safeShowToast(`Periode ${periodToSave.name} berhasil disimpan.`, 'success');
      setAuditLogs(getAuditLogs() || []);
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal menyimpan periode.', 'error');
    }
  };

  const handleDeletePeriodClick = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus periode ini?')) return;
    try {
      deleteMasterPeriod(id, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
      if (onDeletePeriod) {
        onDeletePeriod(id);
      }
      safeRefresh();
      safeShowToast('Periode evaluasi berhasil dihapus.', 'info');
      setAuditLogs(getAuditLogs() || []);
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal menghapus periode.', 'error');
    }
  };

  // Edit Question Modal / In-line
  const [editingQuestion, setEditingQuestion] = useState<PPPKMasterPertanyaanPerilaku | null>(null);

  const handleSaveQuestion = (q: PPPKMasterPertanyaanPerilaku) => {
    const updated = questions.map(item => (item.id === q.id ? q : item));
    setQuestions(updated);
    try {
      saveMasterPertanyaanPerilaku(updated, activePegawai?.nip || 'admin', activePegawai?.nama || 'Admin SDM');
      setEditingQuestion(null);
      safeShowToast(`Butir pertanyaan ${q.id} berhasil diperbarui.`, 'success');
      setAuditLogs(getAuditLogs() || []);
    } catch (err: any) {
      safeShowToast(err.message || 'Gagal memperbarui butir pertanyaan.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white">
              Submenu 10
            </span>
            <span className="text-xs text-slate-500 font-bold">Konfigurasi Sistem & Jejak Audit</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Pengaturan Periode & Master Penilaian
          </h3>
          <p className="text-xs text-slate-600">
            Kelola master periode evaluasi, 28 butir panduan perilaku Core Values ASN, serta jejak audit kepegawaian.
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setSubTab('PERIODE')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'PERIODE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-black'
            }`}
          >
            Master Periode
          </button>
          <button
            onClick={() => setSubTab('PERTANYAAN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'PERTANYAAN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-black'
            }`}
          >
            28 Soal BerAKHLAK
          </button>
          <button
            onClick={() => {
              setAuditLogs(getAuditLogs());
              setSubTab('AUDIT');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'AUDIT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-black'
            }`}
          >
            Jejak Audit ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PERIODE */}
      {subTab === 'PERIODE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900">Daftar Periode Evaluasi Kinerja</h4>
              <p className="text-xs text-slate-500">Periode aktif menentukan kalender kerja evaluasi PPPK</p>
            </div>
            {activeRole === 'ADMIN' && (
              <button
                type="button"
                onClick={openAddPeriod}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <i className="bi bi-plus-circle-fill"></i>
                Tambah Periode Baru
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                  <th className="py-3 px-4">Nama Periode</th>
                  <th className="py-3 px-3 text-center">Tahun</th>
                  <th className="py-3 px-3 text-center">Semester</th>
                  <th className="py-3 px-4 text-center">Rentang Tanggal</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  {activeRole === 'ADMIN' && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {effectivePeriods.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3 text-center font-bold">{p.year}</td>
                    <td className="py-3 px-3 text-center font-semibold">Semester {p.semester}</td>
                    <td className="py-3 px-4 text-center text-slate-600 font-mono text-[11px]">
                      {p.startDate} s.d. {p.endDate}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        p.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    {activeRole === 'ADMIN' && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditPeriod(p)}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePeriodClick(p.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: 28 PERTANYAAN */}
      {subTab === 'PERTANYAAN' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900">Master 28 Butir Pertanyaan Perilaku BerAKHLAK</h4>
            <p className="text-xs text-slate-500">7 Aspek Core Values x 4 Butir Indikator Perilaku</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3 w-36">Aspek</th>
                  <th className="py-3 px-4">Panduan Perilaku</th>
                  <th className="py-3 px-4">Indikator Perilaku</th>
                  {activeRole === 'ADMIN' && <th className="py-3 px-3 text-center w-16">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {questions.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">{q.no}</td>
                    <td className="py-3 px-3 font-bold text-purple-900">{q.aspek}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{q.perilaku}</td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">{q.indikator}</td>
                    {activeRole === 'ADMIN' && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingQuestion(q)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: AUDIT LOG */}
      {subTab === 'AUDIT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900">Jejak Rekam Audit Kepegawaian (Audit Trail)</h4>
            <p className="text-xs text-slate-500">Mencatat setiap aksi penugasan, perubahan status, scoring, dan buka kembali evaluasi</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-3">Pengguna</th>
                  <th className="py-3 px-3">Aksi</th>
                  <th className="py-3 px-3">Modul Target</th>
                  <th className="py-3 px-4">Rincian Perubahan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{log.timestamp}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{log.userName}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-indigo-700">{log.targetDoc}</td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">{log.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period Add/Edit Modal */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h4 className="text-sm font-black text-slate-900">
              {editingPeriod ? 'Edit Periode Evaluasi' : 'Tambah Periode Evaluasi'}
            </h4>
            <form onSubmit={handleSavePeriodForm} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Nama Periode:</label>
                <input
                  type="text"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tahun:</label>
                  <input
                    type="number"
                    value={periodForm.year}
                    onChange={(e) => setPeriodForm({ ...periodForm, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Semester:</label>
                  <select
                    value={periodForm.semester}
                    onChange={(e) => setPeriodForm({ ...periodForm, semester: e.target.value as 'I' | 'II' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="I">Semester I</option>
                    <option value="II">Semester II</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tgl Mulai:</label>
                  <input
                    type="date"
                    value={periodForm.startDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Tgl Selesai:</label>
                  <input
                    type="date"
                    value={periodForm.endDate}
                    onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Status Periode:</label>
                <select
                  value={periodForm.status}
                  onChange={(e) => setPeriodForm({ ...periodForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OPEN">OPEN (Dibuka untuk Penilaian)</option>
                  <option value="CLOSED">CLOSED (Ditutup)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h4 className="text-sm font-black text-slate-900">
              Edit Butir Pertanyaan {editingQuestion.id} ({editingQuestion.aspek})
            </h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Panduan Perilaku:</label>
                <input
                  type="text"
                  value={editingQuestion.perilaku}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, perilaku: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Indikator Penilaian:</label>
                <textarea
                  value={editingQuestion.indikator}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, indikator: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuestion(editingQuestion)}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700"
              >
                Simpan Butir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
