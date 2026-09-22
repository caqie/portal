import React, { useState, useMemo } from 'react';
import {
  PPPKPenugasanPenilai,
  PPPKPenilaianHasilKerjaDoc,
  PPPKRhkItem,
  PPPKBuktiDukung,
  Pegawai,
  EvaluationPeriod
} from '../../../types';
import { SimRole } from './RoleAndPeriodSelectorBar';
import {
  getHasilKerjaDoc,
  saveHasilKerjaDoc,
  getPenugasanPenilaiList,
  getMasterPeriods
} from '../../../services/pppkPenilaianModuleService';

interface PPPKPenilaianHasilKerjaTabProps {
  activeRole: SimRole;
  activePegawai: Pegawai | null;
  selectedPeriod?: EvaluationPeriod | undefined;
  selectedPeriodId?: string;
  assignments?: PPPKPenugasanPenilai[];
  selectedAssignmentId?: string;
  preselectedAssignmentId?: string;
  onNavigateNext?: (penugasanId?: string) => void;
  onRefreshData?: () => void;
  onRefreshAll?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PPPKPenilaianHasilKerjaTab: React.FC<PPPKPenilaianHasilKerjaTabProps> = ({
  activeRole,
  activePegawai,
  selectedPeriod,
  selectedPeriodId,
  assignments,
  selectedAssignmentId,
  preselectedAssignmentId,
  onNavigateNext,
  onRefreshData,
  onRefreshAll,
  showToast
}) => {
  const safeShowToast = (msg: string, type?: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
  };

  const safeRefresh = () => {
    if (onRefreshData) onRefreshData();
    if (onRefreshAll) onRefreshAll();
  };

  const effectiveAssignments = useMemo(() => {
    if (assignments && Array.isArray(assignments) && assignments.length > 0) return assignments;
    return getPenugasanPenilaiList() || [];
  }, [assignments]);

  const effectivePeriod = useMemo(() => {
    if (selectedPeriod) return selectedPeriod;
    const periods = getMasterPeriods();
    if (selectedPeriodId) {
      return periods.find(p => p.id === selectedPeriodId) || periods[0];
    }
    return periods[0];
  }, [selectedPeriod, selectedPeriodId]);

  const periodAssignments = useMemo(() => {
    const list = effectiveAssignments || [];
    if (!effectivePeriod) return list;
    const filtered = list.filter(a => a && a.periodeId === effectivePeriod.id);
    return filtered.length > 0 ? filtered : list;
  }, [effectiveAssignments, effectivePeriod]);

  const targetSelectedId = preselectedAssignmentId || selectedAssignmentId;

  // Find target assignment
  const defaultAssign = useMemo(() => {
    const list = periodAssignments || [];
    if (activeRole === 'PPPK_DINILAI' && activePegawai) {
      return list.find(a => a && a.pppkDinilaiId === activePegawai.nip) || list[0];
    }
    if (targetSelectedId) {
      return list.find(a => a && a.id === targetSelectedId) || list[0];
    }
    return list[0];
  }, [periodAssignments, activeRole, activePegawai, targetSelectedId]);

  const [currentAssignId, setCurrentAssignId] = useState<string>(defaultAssign?.id || '');

  // Keep currentAssignId in sync when defaultAssign or targetSelectedId changes
  React.useEffect(() => {
    if (defaultAssign?.id && !currentAssignId) {
      setCurrentAssignId(defaultAssign.id);
    }
  }, [defaultAssign?.id]);

  const activeAssignment = useMemo(() => {
    const list = periodAssignments || [];
    return list.find(a => a && a.id === currentAssignId) || defaultAssign;
  }, [periodAssignments, currentAssignId, defaultAssign]);

  // Document state
  const [doc, setDoc] = useState<PPPKPenilaianHasilKerjaDoc | undefined>(() => {
    return activeAssignment ? getHasilKerjaDoc(activeAssignment.id) : undefined;
  });

  // Keep synced if activeAssignment changes
  React.useEffect(() => {
    if (activeAssignment) {
      setDoc(getHasilKerjaDoc(activeAssignment.id));
    }
  }, [activeAssignment?.id]);

  // Check if finalized/locked
  const isLocked = activeAssignment?.status === 'FINAL';

  // State for Add RHK Row Modal
  const [isAddRhkOpen, setIsAddRhkOpen] = useState(false);
  const [newRhkText, setNewRhkText] = useState('');
  const [newTarget, setNewTarget] = useState<number>(10);
  const [newSatuan, setNewSatuan] = useState('Laporan / Dokumen');

  // Handle Add RHK
  const handleAddRhk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doc || !activeAssignment) return;
    if (!newRhkText.trim()) {
      safeShowToast('Deskripsi Rencana Hasil Kerja wajib diisi.', 'error');
      return;
    }

    const newItem: PPPKRhkItem = {
      id: `RHK-${Date.now()}`,
      no: (doc.items || []).length + 1,
      rencanaHasilKerja: newRhkText,
      target: Number(newTarget),
      satuan: newSatuan,
      realisasi: Number(newTarget),
      satuanRealisasi: newSatuan,
      buktiDukung: [],
      ratingOtomatis: 'SESUAI EKSPEKTASI',
      umpanBalikPenilai: ''
    };

    const updatedDoc: PPPKPenilaianHasilKerjaDoc = {
      ...doc,
      items: [...(doc.items || []), newItem]
    };

    saveHasilKerjaDoc(updatedDoc, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
    setDoc(updatedDoc);
    setIsAddRhkOpen(false);
    setNewRhkText('');
    safeRefresh();
    safeShowToast('Rencana Hasil Kerja baru berhasil ditambahkan.', 'success');
  };

  // Handle Delete RHK
  const handleDeleteRhk = (id: string) => {
    if (!doc || isLocked) return;
    if (!window.confirm('Hapus butir Rencana Hasil Kerja ini?')) return;

    const filtered = (doc.items || []).filter(i => i.id !== id).map((item, idx) => ({ ...item, no: idx + 1 }));
    const updatedDoc = { ...doc, items: filtered };
    saveHasilKerjaDoc(updatedDoc, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
    setDoc(updatedDoc);
    safeRefresh();
    safeShowToast('Butir RHK berhasil dihapus.', 'info');
  };

  // Handle Target or Realisasi Change
  const handleItemChange = (id: string, field: keyof PPPKRhkItem, value: any) => {
    if (!doc || isLocked) return;
    const updatedItems = (doc.items || []).map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });

    const updatedDoc = { ...doc, items: updatedItems };
    setDoc(updatedDoc);
  };

  // Handle File Upload for Bukti Dukung
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, rhkId: string) => {
    if (!doc || isLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const newBukti: PPPKBuktiDukung = {
      id: `BUKTI-${Date.now()}`,
      nama: file.name,
      url: URL.createObjectURL(file),
      ukuran: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      tipe: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      tanggalUpload: new Date().toLocaleDateString('id-ID'),
      uploader: activePegawai?.nama || 'PPPK'
    };

    const updatedItems = (doc.items || []).map(item => {
      if (item.id === rhkId) {
        return {
          ...item,
          buktiDukung: [...(item.buktiDukung || []), newBukti]
        };
      }
      return item;
    });

    const updatedDoc = { ...doc, items: updatedItems };
    saveHasilKerjaDoc(updatedDoc, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
    setDoc(updatedDoc);
    safeRefresh();
    safeShowToast(`Bukti dukung "${file.name}" berhasil diunggah.`, 'success');
  };

  // Handle Remove Bukti Dukung
  const handleRemoveBukti = (rhkId: string, buktiId: string) => {
    if (!doc || isLocked) return;
    const updatedItems = (doc.items || []).map(item => {
      if (item.id === rhkId) {
        return {
          ...item,
          buktiDukung: (item.buktiDukung || []).filter(b => b.id !== buktiId)
        };
      }
      return item;
    });

    const updatedDoc = { ...doc, items: updatedItems };
    saveHasilKerjaDoc(updatedDoc, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
    setDoc(updatedDoc);
    safeRefresh();
    safeShowToast('Bukti dukung dihapus.', 'info');
  };

  // Save All Changes
  const handleSaveDoc = () => {
    if (!doc) return;
    saveHasilKerjaDoc(doc, activePegawai?.nip || 'user', activePegawai?.nama || 'User');
    safeRefresh();
    safeShowToast('Seluruh data Penilaian Hasil Kerja berhasil disimpan dan dirating.', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-600 text-white">
              Submenu 3
            </span>
            <span className="text-xs text-slate-500 font-bold">Rencana Hasil Kerja (RHK) & Penilaian Capaian</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Penilaian Hasil Kerja PPPK
          </h3>
          <p className="text-xs text-slate-600">
            Subjek: <strong className="text-slate-900">{activeAssignment?.pppkNama}</strong> (NIP. {activeAssignment?.pppkNip}) | Pejabat Penilai: <strong className="text-blue-900">{activeAssignment?.pejabatPenilaiNama}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subjek Selector for Admin/Pejabat */}
          {(activeRole === 'ADMIN' || activeRole === 'PEJABAT_PENILAI') && periodAssignments.length > 1 && (
            <select
              value={currentAssignId}
              onChange={(e) => setCurrentAssignId(e.target.value)}
              className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-cyan-500"
            >
              {periodAssignments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.pppkNama}
                </option>
              ))}
            </select>
          )}

          {!isLocked && (
            <>
              <button
                type="button"
                onClick={() => setIsAddRhkOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-50 text-cyan-800 hover:bg-cyan-100 font-bold text-xs border border-cyan-200 transition-all flex items-center gap-1.5"
              >
                <i className="bi bi-plus-circle-fill text-cyan-600"></i>
                Tambah RHK
              </button>
              <button
                type="button"
                onClick={handleSaveDoc}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 font-black text-xs transition-all shadow-md shadow-cyan-900/20 flex items-center gap-1.5"
              >
                <i className="bi bi-save-fill"></i>
                Simpan & Hitung Rating
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Rating Banner */}
      {doc && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">Rangkuman Capaian Hasil Kerja</span>
            <div className="flex items-center gap-3 mt-1">
              <h4 className="text-xl font-black">{doc.ratingHasilKerjaFinal}</h4>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                doc.ratingHasilKerjaFinal === 'DIATAS EKSPEKTASI'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : doc.ratingHasilKerjaFinal === 'SESUAI EKSPEKTASI'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {doc.items.length} Butir Rencana Kerja
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 max-w-sm">
            Rating ditentukan secara deterministik berdasarkan komparasi Realisasi terhadap Target, serta pertimbangan pejabat penilai.
          </div>
        </div>
      )}

      {/* RHK Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-sm font-black text-slate-800">
            Daftar Rencana Hasil Kerja, Target, Realisasi & Bukti Dukung
          </h4>
          <span className="text-xs text-slate-500">KemenPANRB No. 6 Tahun 2022</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-4 min-w-[240px]">Rencana Hasil Kerja (RHK)</th>
                <th className="py-3 px-3 w-28 text-center">Target</th>
                <th className="py-3 px-3 w-28 text-center">Realisasi</th>
                <th className="py-3 px-4 min-w-[200px]">Bukti Dukung</th>
                <th className="py-3 px-3 text-center">Rating Otomatis</th>
                {(activeRole === 'PEJABAT_PENILAI' || activeRole === 'ADMIN') && (
                  <th className="py-3 px-4 min-w-[180px]">Umpan Balik Penilai</th>
                )}
                {!isLocked && <th className="py-3 px-3 text-center w-12">Hapus</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {doc?.items.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-3 text-center font-bold text-slate-500">{item.no}</td>
                  
                  {/* RHK Text */}
                  <td className="py-3 px-4">
                    {!isLocked ? (
                      <textarea
                        value={item.rencanaHasilKerja}
                        onChange={(e) => handleItemChange(item.id, 'rencanaHasilKerja', e.target.value)}
                        rows={2}
                        className="w-full p-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500"
                      />
                    ) : (
                      <div className="font-semibold text-slate-900 leading-relaxed">
                        {item.rencanaHasilKerja}
                      </div>
                    )}
                  </td>

                  {/* Target */}
                  <td className="py-3 px-3 text-center">
                    {!isLocked ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          value={item.target}
                          onChange={(e) => handleItemChange(item.id, 'target', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-bold rounded border border-slate-300 text-xs"
                        />
                        <div className="text-[10px] text-slate-500">{item.satuan}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-black text-slate-900">{item.target}</div>
                        <div className="text-[10px] text-slate-500">{item.satuan}</div>
                      </div>
                    )}
                  </td>

                  {/* Realisasi */}
                  <td className="py-3 px-3 text-center">
                    {!isLocked ? (
                      <div className="space-y-1">
                        <input
                          type="number"
                          value={item.realisasi}
                          onChange={(e) => handleItemChange(item.id, 'realisasi', Number(e.target.value))}
                          className="w-16 px-2 py-1 text-center font-bold rounded border border-slate-300 text-xs text-blue-600"
                        />
                        <div className="text-[10px] text-slate-500">{item.satuanRealisasi || item.satuan}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-black text-blue-700">{item.realisasi}</div>
                        <div className="text-[10px] text-slate-500">{item.satuanRealisasi || item.satuan}</div>
                      </div>
                    )}
                  </td>

                  {/* Bukti Dukung (Upload, Preview, Download, Delete) */}
                  <td className="py-3 px-4">
                    <div className="space-y-2">
                      {item.buktiDukung.map(b => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                            <i className="bi bi-file-earmark-pdf-fill text-rose-500"></i>
                            <span className="truncate font-medium text-slate-700">{b.nama}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 p-0.5"
                              title="Download / Preview"
                            >
                              <i className="bi bi-download"></i>
                            </a>
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBukti(item.id, b.id)}
                                className="text-rose-500 hover:text-rose-700 p-0.5"
                                title="Hapus Dokumen"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {!isLocked && (
                        <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors">
                          <i className="bi bi-paperclip"></i>
                          Unggah Bukti
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, item.id)}
                          />
                        </label>
                      )}
                    </div>
                  </td>

                  {/* Rating Otomatis */}
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                      item.realisasi > item.target
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.realisasi === item.target
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.realisasi > item.target
                        ? 'DIATAS EKSPEKTASI'
                        : item.realisasi === item.target
                        ? 'SESUAI EKSPEKTASI'
                        : 'DIBAWAH EKSPEKTASI'}
                    </span>
                  </td>

                  {/* Umpan Balik Penilai */}
                  {(activeRole === 'PEJABAT_PENILAI' || activeRole === 'ADMIN') && (
                    <td className="py-3 px-4">
                      {!isLocked ? (
                        <input
                          type="text"
                          value={item.umpanBalikPenilai || ''}
                          onChange={(e) => handleItemChange(item.id, 'umpanBalikPenilai', e.target.value)}
                          placeholder="Catatan pimpinan..."
                          className="w-full px-2 py-1 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-cyan-500"
                        />
                      ) : (
                        <div className="text-slate-600 italic">{item.umpanBalikPenilai || '-'}</div>
                      )}
                    </td>
                  )}

                  {!isLocked && (
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRhk(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Hapus Baris"
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

      {/* Add RHK Modal */}
      {isAddRhkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <i className="bi bi-plus-circle-fill text-cyan-600"></i>
              Tambah Butir Rencana Hasil Kerja (RHK)
            </h4>
            <form onSubmit={handleAddRhk} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Rencana Hasil Kerja:</label>
                <textarea
                  value={newRhkText}
                  onChange={(e) => setNewRhkText(e.target.value)}
                  placeholder="Contoh: Menyiapkan bahan konsep tanggapan hukum permohonan kekayaan intelektual..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target:</label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Satuan:</label>
                  <input
                    type="text"
                    value={newSatuan}
                    onChange={(e) => setNewSatuan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddRhkOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black text-white bg-cyan-600 hover:bg-cyan-700"
                >
                  Simpan Butir RHK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
