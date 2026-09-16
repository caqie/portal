import React, { useState } from 'react';
import { PPPKKetuaTimKerja, Pegawai } from '../../types';
import {
  getKetuaTimKerjaList,
  saveKetuaTimKerja,
  deleteKetuaTimKerja,
  getPPPKEmployees,
  getAllEmployees
} from '../../services/pppkEvaluationService';

interface Props {
  currentUserId: string;
  currentUserName: string;
  onRefresh?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PPPKKetuaTimManager: React.FC<Props> = ({
  currentUserId,
  currentUserName,
  onRefresh,
  showToast
}) => {
  const [ketuaTimList, setKetuaTimList] = useState<PPPKKetuaTimKerja[]>(getKetuaTimKerjaList());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDirektorat, setSelectedDirektorat] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PPPKKetuaTimKerja> | null>(null);

  // Assign PPPK Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeKetuaTim, setActiveKetuaTim] = useState<PPPKKetuaTimKerja | null>(null);
  const [assignedNips, setAssignedNips] = useState<string[]>([]);

  const allPppk: Pegawai[] = getPPPKEmployees();
  const allEmployees: Pegawai[] = getAllEmployees();

  const reloadData = () => {
    setKetuaTimList(getKetuaTimKerjaList());
    if (onRefresh) onRefresh();
  };

  const handleOpenCreate = () => {
    setEditingItem({
      nama: '',
      nip: '',
      pangkatGolRuang: 'Penata Tk. I (III/d)',
      jabatan: 'Analis SDM Aparatur Ahli Muda / Ketua Tim Kerja',
      namaTimKerja: '',
      unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
      direktorat: 'Sekretariat DJKI',
      status: 'AKTIF',
      anggotaPppkNip: [],
      catatan: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PPPKKetuaTimKerja) => {
    setEditingItem({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, nama: string) => {
    if (!window.confirm(`Hapus data Ketua Tim Kerja: ${nama}?`)) return;
    try {
      deleteKetuaTimKerja(id, currentUserId, currentUserName);
      reloadData();
      showToast(`Ketua Tim Kerja ${nama} berhasil dihapus.`, 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal menghapus data', 'error');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.nama || !editingItem?.nip || !editingItem?.namaTimKerja) {
      showToast('Mohon lengkapi Nama, NIP, dan Nama Tim Kerja.', 'error');
      return;
    }

    try {
      saveKetuaTimKerja(editingItem, currentUserId, currentUserName);
      reloadData();
      setIsModalOpen(false);
      setEditingItem(null);
      showToast('Data Ketua Tim Kerja berhasil disimpan.', 'success');
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan data', 'error');
    }
  };

  const handleOpenAssign = (k: PPPKKetuaTimKerja) => {
    setActiveKetuaTim(k);
    setAssignedNips(k.anggotaPppkNip || []);
    setIsAssignModalOpen(true);
  };

  const handleTogglePppk = (nip: string) => {
    if (assignedNips.includes(nip)) {
      setAssignedNips(assignedNips.filter(n => n !== nip));
    } else {
      setAssignedNips([...assignedNips, nip]);
    }
  };

  const handleSaveAssign = () => {
    if (!activeKetuaTim) return;
    try {
      saveKetuaTimKerja(
        { ...activeKetuaTim, anggotaPppkNip: assignedNips },
        currentUserId,
        currentUserName
      );
      reloadData();
      setIsAssignModalOpen(false);
      showToast(`Daftar PPPK binaan untuk ${activeKetuaTim.namaTimKerja} diperbarui (${assignedNips.length} pegawai).`, 'success');
    } catch (e: any) {
      showToast('Gagal menyimpan alokasi PPPK', 'error');
    }
  };

  const filteredList = ketuaTimList.filter(k => {
    const matchSearch =
      k.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.nip.includes(searchTerm) ||
      k.namaTimKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.unitKerja.toLowerCase().includes(searchTerm.toLowerCase());

    const matchDir = selectedDirektorat === 'ALL' || k.direktorat === selectedDirektorat;
    return matchSearch && matchDir;
  });

  const direktoratOptions = Array.from(new Set(ketuaTimList.map(k => k.direktorat || 'Sekretariat DJKI')));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10 pointer-events-none">
          <i className="bi bi-diagram-3-fill text-[160px]"></i>
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold uppercase tracking-wider">
            <i className="bi bi-shield-check"></i> Master Penilai Non-Struktural
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Manajemen Ketua Tim Kerja & Alokasi Penilai PPPK
          </h2>
          <p className="text-sm text-blue-100/90 leading-relaxed">
            Sesuai penyederhanaan birokrasi dan Permenpan RB, evaluasi kinerja pegawai PPPK dapat dinilai langsung oleh 
            <strong> Ketua Tim Kerja (Subkoordinator / Koordinator)</strong> yang membawahi penugasan teknis harian selain Pejabat Struktural.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <i className="bi bi-plus-circle-fill text-blue-600"></i>
              Tambah Ketua Tim Kerja
            </button>
            <div className="px-3 py-2 bg-white/10 rounded-xl border border-white/20 text-xs flex items-center gap-2">
              <i className="bi bi-people-fill text-amber-300"></i>
              <span>Total: <strong>{ketuaTimList.length}</strong> Tim Kerja</span>
            </div>
            <div className="px-3 py-2 bg-white/10 rounded-xl border border-white/20 text-xs flex items-center gap-2">
              <i className="bi bi-person-badge-fill text-emerald-300"></i>
              <span>Total PPPK Binaan: <strong>{ketuaTimList.reduce((acc, k) => acc + (k.anggotaPppkNip?.length || 0), 0)}</strong> Pegawai</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[280px] relative">
          <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input
            type="text"
            placeholder="Cari Ketua Tim, NIP, atau nama Tim Kerja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">Direktorat:</span>
          <select
            value={selectedDirektorat}
            onChange={(e) => setSelectedDirektorat(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-slate-700"
          >
            <option value="ALL">Semua Unit / Direktorat</option>
            {direktoratOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredList.map((k) => {
          const anggotaCount = k.anggotaPppkNip?.length || 0;
          return (
            <div
              key={k.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                    {k.direktorat || 'Sekretariat'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    k.status === 'AKTIF' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {k.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                    {k.namaTimKerja}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{k.unitKerja}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                      {k.nama.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{k.nama}</p>
                      <p className="text-[10px] font-mono text-slate-500">NIP. {k.nip}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-200/60 flex items-center justify-between">
                    <span>Pangkat / Gol:</span>
                    <span className="font-bold text-slate-800">{k.pangkatGolRuang}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                    <span>Jabatan:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[170px]" title={k.jabatan}>{k.jabatan}</span>
                  </div>
                </div>

                {/* Anggota PPPK Stats */}
                <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="text-indigo-900 font-bold flex items-center gap-1.5">
                    <i className="bi bi-people-fill text-indigo-600"></i>
                    PPPK Binaan:
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-600 text-white font-black text-[11px] rounded-lg shadow-sm">
                    {anggotaCount} Orang
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenAssign(k)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[11px] transition-colors flex items-center justify-center gap-1.5"
                >
                  <i className="bi bi-person-plus-fill"></i>
                  Alokasi PPPK
                </button>
                <button
                  onClick={() => handleOpenEdit(k)}
                  className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Edit Data Ketua Tim"
                >
                  <i className="bi bi-pencil-square text-sm"></i>
                </button>
                <button
                  onClick={() => handleDelete(k.id, k.nama)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Hapus"
                >
                  <i className="bi bi-trash text-sm"></i>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <i className="bi bi-inbox text-4xl text-slate-300"></i>
          <p className="mt-2 text-sm font-bold text-slate-600">Tidak ada Ketua Tim Kerja yang cocok.</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow hover:bg-blue-700"
          >
            Tambah Ketua Tim Baru
          </button>
        </div>
      )}

      {/* Modal Add / Edit Ketua Tim */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingItem.id ? 'Edit Ketua Tim Kerja' : 'Tambah Ketua Tim Kerja Baru'}
                </h3>
                <p className="text-xs text-slate-500">Master penilai kinerja fungsional / manajerial PPPK</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Nama Tim Kerja <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Tim Kerja Perencanaan & Layanan SDM"
                  value={editingItem.namaTimKerja || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, namaTimKerja: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Nama Ketua Tim <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap & gelar"
                    value={editingItem.nama || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, nama: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">NIP <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="18 digit NIP"
                    value={editingItem.nip || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, nip: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Pangkat / Golongan Ruang</label>
                  <input
                    type="text"
                    placeholder="Contoh: Penata Tk. I (III/d)"
                    value={editingItem.pangkatGolRuang || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, pangkatGolRuang: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Jabatan Fungsional</label>
                  <input
                    type="text"
                    placeholder="Contoh: Analis SDM Aparatur Ahli Muda"
                    value={editingItem.jabatan || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, jabatan: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Direktorat</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sekretariat DJKI"
                    value={editingItem.direktorat || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, direktorat: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Unit Kerja</label>
                  <input
                    type="text"
                    placeholder="Sekretariat Direktorat Jenderal Kekayaan Intelektual"
                    value={editingItem.unitKerja || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unitKerja: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Catatan / Tugas Pokok Tim</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan lingkup penugasan..."
                  value={editingItem.catatan || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, catatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alokasi PPPK Binaan */}
      {isAssignModalOpen && activeKetuaTim && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Alokasi Anggota PPPK Binaan
                </h3>
                <p className="text-xs text-slate-500">
                  {activeKetuaTim.namaTimKerja} — Ketua: <strong>{activeKetuaTim.nama}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-200/60 text-xs flex items-center gap-2">
              <i className="bi bi-info-circle-fill text-blue-600 text-base shrink-0"></i>
              <span>
                Pilih pegawai PPPK yang berada di bawah bimbingan dan penilaian Ketua Tim ini. Pegawai yang dipilih akan otomatis memiliki opsi dinilai oleh Ketua Tim saat penyusunan SKP & Evaluasi.
              </span>
            </div>

            {/* List PPPK with Checkbox */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {allPppk.map((p) => {
                const isChecked = assignedNips.includes(p.nip);
                return (
                  <div
                    key={p.nip}
                    onClick={() => handleTogglePppk(p.nip)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isChecked ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div
                        className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.nama}</p>
                        <p className="text-[10px] text-slate-500 font-mono">NIP. {p.nip} • {p.jabatan}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isChecked ? 'Terpilih' : 'Tidak Dipilih'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600">
                Terpilih: <strong>{assignedNips.length}</strong> pegawai PPPK
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssign}
                  className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <i className="bi bi-check-lg"></i>
                  Simpan Alokasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
