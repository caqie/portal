import React, { useState } from 'react';
import { BehaviorAspect } from '../../types';

interface PPPKAspectsTabProps {
  aspects: BehaviorAspect[];
  onSaveAspect: (aspect: BehaviorAspect) => void;
  onDeleteAspect: (id: string) => void;
}

const PPPKAspectsTab: React.FC<PPPKAspectsTabProps> = ({
  aspects,
  onSaveAspect,
  onDeleteAspect
}) => {
  const [editingAspect, setEditingAspect] = useState<BehaviorAspect | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingAspect(null);
    setName('');
    setDescription('');
    setWeight(10);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (asp: BehaviorAspect) => {
    setEditingAspect(asp);
    setName(asp.name);
    setDescription(asp.description);
    setWeight(asp.weight);
    setIsActive(asp.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveAspect({
      id: editingAspect ? editingAspect.id : 'asp_' + Date.now().toString(36),
      name: name.trim(),
      description: description.trim(),
      weight: Number(weight),
      isActive,
      sortOrder: editingAspect ? editingAspect.sortOrder : aspects.length + 1
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Master Aspek Perilaku Kerja (BerAKHLAK)</h2>
          <p className="text-xs text-slate-500 font-medium">
            Daftar indikator dan aspek penilaian perilaku kerja 360° yang digunakan pada kuesioner evaluasi PPPK.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          <i className="bi bi-plus-lg"></i>
          Tambah Aspek
        </button>
      </div>

      {/* Aspects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aspects.map((asp, idx) => (
          <div
            key={asp.id}
            className={`p-5 rounded-2xl border transition-all ${
              asp.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100">
                  {idx + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">{asp.name}</h3>
                    {!asp.isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        Non-Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{asp.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(asp)}
                  className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-xs"
                  title="Edit Aspek"
                >
                  <i className="bi bi-pencil-fill"></i>
                </button>
                <button
                  onClick={() => onDeleteAspect(asp.id)}
                  className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-xs"
                  title="Hapus Aspek"
                >
                  <i className="bi bi-trash-fill"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edit/Add Aspect */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-black">
                {editingAspect ? 'Edit Aspek Perilaku' : 'Tambah Aspek Perilaku Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Nama Aspek Perilaku
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Integritas & Moralitas..."
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Deskripsi / Indikator Perilaku
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan ringkas perilaku kerja yang dinilai..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="aspActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="aspActiveCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Aspek Aktif (Ditampilkan pada formulir 360°)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 shadow-md"
                >
                  Simpan Aspek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PPPKAspectsTab;
