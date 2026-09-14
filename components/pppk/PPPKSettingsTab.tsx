import React, { useState } from 'react';
import { PPPKConfigSettings, PPPKEvaluationAuditLog } from '../../types';

interface PPPKSettingsTabProps {
  settings: PPPKConfigSettings;
  onSaveSettings: (settings: PPPKConfigSettings) => void;
  auditLogs: PPPKEvaluationAuditLog[];
}

const PPPKSettingsTab: React.FC<PPPKSettingsTabProps> = ({
  settings,
  onSaveSettings,
  auditLogs
}) => {
  const [formData, setFormData] = useState<PPPKConfigSettings>({
    ...settings,
    evaluator360Weights: {
      atasanWeight: settings.evaluator360Weights?.atasanWeight ?? 50,
      rekanKerjaWeight: settings.evaluator360Weights?.rekanKerjaWeight ?? 30,
      selfWeight: settings.evaluator360Weights?.selfWeight ?? 20
    },
    allowedEvaluatorTypes: {
      atasan: settings.allowedEvaluatorTypes?.atasan ?? ['PNS', 'PPPK'],
      rekanKerja: settings.allowedEvaluatorTypes?.rekanKerja ?? ['PNS', 'PPPK'],
      self: settings.allowedEvaluatorTypes?.self ?? ['PPPK']
    }
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const totalWeightA = Number(formData.defaultSkpWeight) + Number(formData.defaultBehaviorWeight) + Number(formData.defaultAttendanceWeight);
  const totalWeightB = Number(formData.evaluator360Weights?.atasanWeight || 0) +
                       Number(formData.evaluator360Weights?.rekanKerjaWeight || 0) +
                       Number(formData.evaluator360Weights?.selfWeight || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (totalWeightA !== 100) {
      setErrorMessage(`Total Bobot A (Komponen Utama) harus tepat 100% (saat ini: ${totalWeightA}%).`);
      return;
    }

    if (totalWeightB !== 100) {
      setErrorMessage(`Total Bobot B (Penilai 360°) harus tepat 100% (saat ini: ${totalWeightB}%).`);
      return;
    }

    try {
      onSaveSettings(formData);
      setSuccessMessage('Pengaturan evaluasi PPPK dan Bobot 360° berhasil disimpan.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan pengaturan.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Pengaturan & Parameter Evaluasi Kinerja PPPK</h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Kelola bobot baku, ambang batas predikat kategori, penalti kehadiran, dan pantau jejak audit digital.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <i className="bi bi-check-circle-fill text-emerald-600 text-base"></i>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
          <i className="bi bi-exclamation-triangle-fill text-rose-600 text-base"></i>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Default Weights Configuration - Bobot A */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                  Bobot A
                </span>
                <h3 className="text-sm font-black text-slate-900">Komponen Utama Evaluasi Kinerja PPPK</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bobot kalkulasi nilai akhir semester (SKP + Perilaku + Absensi = 100%)
              </p>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${
              totalWeightA === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              Total Bobot A: {totalWeightA}% {totalWeightA === 100 ? '✓ Tepat 100%' : '✗ Tidak Valid'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">1. Sasaran Kinerja Pegawai (SKP)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.defaultSkpWeight}
                  onChange={(e) => setFormData({ ...formData, defaultSkpWeight: Number(e.target.value) })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Standar BKN: 60%</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">2. Perilaku Kerja 360°</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.defaultBehaviorWeight}
                  onChange={(e) => setFormData({ ...formData, defaultBehaviorWeight: Number(e.target.value) })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Standar BKN: 25%</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">3. Kedisiplinan & Presensi</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.defaultAttendanceWeight}
                  onChange={(e) => setFormData({ ...formData, defaultAttendanceWeight: Number(e.target.value) })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Standar BKN: 15%</span>
            </div>
          </div>
        </div>

        {/* 360 Evaluator Weights Configuration - Bobot B */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase">
                  Bobot B
                </span>
                <h3 className="text-sm font-black text-slate-900">Distribusi Penilai Perilaku 360°</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Bobot kontribusi antar kategori responden penilai (Atasan + Rekan + Self = 100%). Terpisah dari Bobot A.
              </p>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${
              totalWeightB === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              Total Bobot B: {totalWeightB}% {totalWeightB === 100 ? '✓ Tepat 100%' : '✗ Tidak Valid'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Atasan Langsung (PNS / PPPK)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.evaluator360Weights?.atasanWeight ?? 50}
                  onChange={(e) => setFormData({
                    ...formData,
                    evaluator360Weights: {
                      ...formData.evaluator360Weights,
                      atasanWeight: Number(e.target.value)
                    }
                  })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Standar default: 50%</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Rekan Kerja Sejawat (PNS / PPPK)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.evaluator360Weights?.rekanKerjaWeight ?? 30}
                  onChange={(e) => setFormData({
                    ...formData,
                    evaluator360Weights: {
                      ...formData.evaluator360Weights,
                      rekanKerjaWeight: Number(e.target.value)
                    }
                  })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Standar default: 30%</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Penilaian Mandiri (Self / PPPK)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.evaluator360Weights?.selfWeight ?? 20}
                  onChange={(e) => setFormData({
                    ...formData,
                    evaluator360Weights: {
                      ...formData.evaluator360Weights,
                      selfWeight: Number(e.target.value)
                    }
                  })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                  required
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Standar default: 20%</span>
            </div>
          </div>
        </div>

        {/* Evaluator Policy Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Kebijakan Objek Evaluasi & Hak Akses Penilai</h3>
            <p className="text-xs text-slate-500">
              Pemisahan tegas antara objek evaluasi (wajib PPPK) dan penilai (PNS atau PPPK)
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start justify-between p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-950">Objek Evaluasi: WAJIB PPPK (Strict Constraint)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">Wajib</span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Pegawai berstatus PNS dilarang memiliki record pada modul evaluasi kinerja PPPK. Hanya pegawai PPPK yang menjadi subjek evaluasi.
                </p>
              </div>
              <input
                type="checkbox"
                checked={true}
                disabled
                className="w-5 h-5 text-emerald-600 rounded mt-0.5"
              />
            </div>

            <div className="flex items-start justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Atasan Langsung PNS Diizinkan Menilai PPPK
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Atasan langsung yang berasal dari struktur organisasi ASN/PNS sah memberikan penilaian (evaluator_type: ATASAN)
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allowedEvaluatorTypes?.atasan?.includes('PNS') ?? true}
                onChange={(e) => {
                  const current = formData.allowedEvaluatorTypes?.atasan || ['PNS', 'PPPK'];
                  const updated: ('PNS' | 'PPPK')[] = e.target.checked
                    ? Array.from(new Set([...current, 'PNS' as const]))
                    : current.filter(x => x !== 'PNS');
                  setFormData({
                    ...formData,
                    allowedEvaluatorTypes: {
                      ...formData.allowedEvaluatorTypes,
                      atasan: updated.length > 0 ? updated : ['PPPK']
                    }
                  });
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
              />
            </div>

            <div className="flex items-start justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Rekan Kerja PNS Diizinkan Menilai PPPK
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pegawai PNS yang bekerja dalam satu unit kerja dengan PPPK dapat ditugaskan sebagai penilai rekan sejawat (evaluator_type: REKAN_KERJA)
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.allowedEvaluatorTypes?.rekanKerja?.includes('PNS') ?? true}
                onChange={(e) => {
                  const current = formData.allowedEvaluatorTypes?.rekanKerja || ['PNS', 'PPPK'];
                  const updated: ('PNS' | 'PPPK')[] = e.target.checked
                    ? Array.from(new Set([...current, 'PNS' as const]))
                    : current.filter(x => x !== 'PNS');
                  setFormData({
                    ...formData,
                    allowedEvaluatorTypes: {
                      ...formData.allowedEvaluatorTypes,
                      rekanKerja: updated.length > 0 ? updated : ['PPPK']
                    }
                  });
                }}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
              />
            </div>
          </div>
        </div>

        {/* Attendance Penalty Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900">Parameter Penalti Presensi (Absensi)</h3>
            <p className="text-xs text-slate-500">Pengurangan poin dari skor dasar 100 berdasarkan data absensi riil</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Penalti Terlambat (per kejadian)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.attendancePenalty.latePenaltyPerEvent}
                  onChange={(e) => setFormData({
                    ...formData,
                    attendancePenalty: { ...formData.attendancePenalty, latePenaltyPerEvent: Number(e.target.value) }
                  })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                />
                <span className="text-xs font-bold text-slate-500">Poin</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Penalti Pulang Cepat (per kejadian)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.attendancePenalty.earlyLeavePenaltyPerEvent}
                  onChange={(e) => setFormData({
                    ...formData,
                    attendancePenalty: { ...formData.attendancePenalty, earlyLeavePenaltyPerEvent: Number(e.target.value) }
                  })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                />
                <span className="text-xs font-bold text-slate-500">Poin</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1">Penalti Alpa (Tanpa Keterangan)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.attendancePenalty.absencePenaltyPerEvent}
                  onChange={(e) => setFormData({
                    ...formData,
                    attendancePenalty: { ...formData.attendancePenalty, absencePenaltyPerEvent: Number(e.target.value) }
                  })}
                  className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 bg-white"
                />
                <span className="text-xs font-bold text-slate-500">Poin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Pengaturan Fitur Tambahan</h3>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
            <div>
              <span className="text-xs font-bold text-slate-800">Izinkan Penilaian 360° Anonim</span>
              <p className="text-[11px] text-slate-500">Responden dapat memilih untuk menyamarkan nama mereka dari pegawai yang dinilai</p>
            </div>
            <input
              type="checkbox"
              checked={formData.allowAnonymous}
              onChange={(e) => setFormData({ ...formData, allowAnonymous: e.target.checked })}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={totalWeightA !== 100 || totalWeightB !== 100}
            className="px-6 py-2.5 bg-blue-600 disabled:bg-slate-400 text-white text-xs font-black rounded-xl hover:bg-blue-700 shadow-md flex items-center gap-2"
          >
            <i className="bi bi-floppy-fill"></i>
            Simpan Konfigurasi
          </button>
        </div>
      </form>

      {/* Audit Trail Section */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-clock-history text-blue-600 text-base"></i>
            <h3 className="text-sm font-black text-slate-900">Jejak Audit Aktivitas Evaluasi PPPK</h3>
          </div>
          <span className="text-xs text-slate-400">{auditLogs.length} Catatan Terekam</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider sticky top-0">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-3">Pengguna</th>
                <th className="py-3 px-3 text-center">Aksi</th>
                <th className="py-3 px-4">Keterangan / Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Belum ada riwayat aktivitas.
                  </td>
                </tr>
              ) : (
                auditLogs.slice(0, 50).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.createdAt}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        log.action === 'FINALIZE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'CREATE' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'CALCULATE' ? 'bg-indigo-100 text-indigo-800' :
                        log.action === 'DELETE' ? 'bg-rose-100 text-rose-800' :
                        log.action === 'CORRECTION_REQUEST' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default PPPKSettingsTab;
