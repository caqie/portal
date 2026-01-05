
import React, { useState, useEffect } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, SKP } from '../types';
import { useAuth } from '../AuthContext';

interface SKPRecord extends SKP {
  status: 'DRAFT' | 'FINAL' | 'UPLOADED';
  tglDibuat: string;
  hasilKerja: any[];
  perilakuKerja: any;
  pejabatPenilai?: Pegawai;
}

const SKPPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'table' | 'create' | 'upload' | 'preview'>('table');
  const [selectedSKP, setSelectedSKP] = useState<SKPRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<any>({ 
    nip: '', 
    tahun: new Date().getFullYear(), 
    penilaiNip: '', 
    predikat: 'Baik', 
    hasilKerja: [{ rhk: 'Meningkatnya efektivitas layanan publik', rencana: 'Laporan layanan tepat waktu', aspek: 'Kuantitas', indikator: 'Jumlah laporan', target: '12 Laporan' }], 
    perilaku: { pelayanan: { ekspektasi: 'Pelayanan prima', feedback: '-' }, akuntabel: { ekspektasi: 'Integritas tinggi', feedback: '-' }, kompeten: { ekspektasi: 'Peningkatan kompetensi', feedback: '-' }, harmonis: { ekspektasi: 'Lingkungan kondusif', feedback: '-' }, loyal: { ekspektasi: 'Kesetiaan pada NKRI', feedback: '-' }, adaptif: { ekspektasi: 'Inovatif', feedback: '-' }, kolaboratif: { ekspektasi: 'Kerja tim', feedback: '-' } } 
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    const pegawais = await fetchPegawaiFromSheets();
    setPegawaiList(pegawais);
    const saved = localStorage.getItem('skp_database');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSkpList(isViewer ? parsed.filter((s: any) => s.nip === user?.nip) : parsed);
    }
    setLoading(false);
  };

  const handleOpenEdit = (skp: SKPRecord) => {
    setEditingId(skp.id);
    setFormData({
      nip: skp.nip,
      tahun: skp.tahun,
      penilaiNip: skp.pejabatPenilai?.nip || '',
      predikat: skp.predikat,
      hasilKerja: skp.hasilKerja,
      perilaku: skp.perilakuKerja
    });
    setActiveView('create');
  };

  const handleSaveSKP = (status: 'DRAFT' | 'FINAL' | 'UPLOADED') => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai");

    let updatedList: SKPRecord[];
    if (editingId) {
      updatedList = skpList.map(s => s.id === editingId ? {
        ...s,
        nip: peg.nip,
        namaPegawai: peg.nama,
        tahun: formData.tahun,
        predikat: formData.predikat,
        status: status,
        hasilKerja: formData.hasilKerja,
        perilakuKerja: formData.perilaku,
        pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip)
      } : s);
      logActivity('UPDATE', 'SKP', `Memperbarui SKP ${formData.tahun} untuk ${peg.nama}`);
    } else {
      const newRecord: SKPRecord = { 
        id: Date.now().toString(), 
        nip: peg.nip, 
        namaPegawai: peg.nama, 
        tahun: formData.tahun, 
        nilaiKinerja: 100, 
        nilaiPerilaku: 100, 
        predikat: formData.predikat, 
        status: status, 
        tglDibuat: new Date().toLocaleDateString('id-ID'), 
        hasilKerja: formData.hasilKerja, 
        perilakuKerja: formData.perilaku, 
        pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip) 
      };
      updatedList = [newRecord, ...skpList];
      logActivity('CREATE', 'SKP', `Membuat SKP baru ${formData.tahun} untuk ${peg.nama}`);
    }

    setSkpList(updatedList);
    localStorage.setItem('skp_database', JSON.stringify(updatedList));
    setActiveView('table');
    setEditingId(null);
    alert("Data SKP Berhasil disimpan.");
  };

  const handleDeleteSKP = (id: string) => {
    const target = skpList.find(s => s.id === id);
    if (target && confirm(`Hapus riwayat SKP ${target.namaPegawai} tahun ${target.tahun}?`)) {
      const updated = skpList.filter(s => s.id !== id);
      setSkpList(updated);
      localStorage.setItem('skp_database', JSON.stringify(updated));
      logActivity('DELETE', 'SKP', `Menghapus SKP ${target.tahun} milik ${target.namaPegawai}`);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">{isViewer ? 'SKP Saya' : 'Manajemen SKP'}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Evaluasi Kinerja • Peraturan BKN No. 6/2022</p>
        </div>
        {canEdit && (
           <div className="flex gap-2">
               <button onClick={() => { setEditingId(null); setFormData({ nip: '', tahun: 2024, penilaiNip: '', predikat: 'Baik', hasilKerja: [{ rhk: 'Meningkatnya efektivitas layanan publik', rencana: 'Laporan layanan tepat waktu', aspek: 'Kuantitas', indikator: 'Jumlah laporan', target: '12 Laporan' }], perilaku: { pelayanan: { ekspektasi: 'Pelayanan prima', feedback: '-' }, akuntabel: { ekspektasi: 'Integritas tinggi', feedback: '-' }, kompeten: { ekspektasi: 'Peningkatan kompetensi', feedback: '-' }, harmonis: { ekspektasi: 'Lingkungan kondusif', feedback: '-' }, loyal: { ekspektasi: 'Kesetiaan pada NKRI', feedback: '-' }, adaptif: { ekspektasi: 'Inovatif', feedback: '-' }, kolaboratif: { ekspektasi: 'Kerja tim', feedback: '-' } } }); setActiveView('create'); }} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"><i className="bi bi-plus-lg"></i>Buat SKP Baru</button>
           </div>
        )}
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center"><h5 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Riwayat SKP</h5></div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-400 uppercase text-[8px] font-black border-b border-gray-100 tracking-widest">
                        <tr><th className="px-8 py-5">Pegawai / NIP</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5">Predikat</th><th className="px-4 py-5 text-center">Status</th><th className="px-8 py-5 text-right">Opsi</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {skpList.length > 0 ? skpList.map((item) => (
                            <tr key={item.id} className="hover:bg-blue-50/5 group transition-all">
                                <td className="px-8 py-5"><p className="text-[10px] font-black text-gray-900 uppercase">{item.namaPegawai}</p><p className="text-[8px] text-gray-400 font-bold">{item.nip}</p></td>
                                <td className="px-4 py-5 text-center font-bold text-[10px] text-gray-900">{item.tahun}</td>
                                <td className="px-4 py-5"><span className="px-2.5 py-1 text-[8px] font-black uppercase rounded bg-blue-50 text-blue-700">{item.predikat}</span></td>
                                <td className="px-4 py-5 text-center"><span className="text-[8px] font-black uppercase text-emerald-600">{item.status}</span></td>
                                <td className="px-8 py-5 text-right">
                                  <div className="flex items-center justify-end space-x-1">
                                    <button onClick={() => {setSelectedSKP(item); setActiveView('preview');}} className="h-8 px-4 bg-[#111827] text-white rounded-lg text-[9px] font-black uppercase hover:bg-black">Preview</button>
                                    {canEdit && <button onClick={() => handleOpenEdit(item)} className="h-8 w-8 flex items-center justify-center text-blue-600 bg-blue-50 rounded-lg"><i className="bi bi-pencil-square"></i></button>}
                                    {isSuperadmin && <button onClick={() => handleDeleteSKP(item.id)} className="h-8 w-8 flex items-center justify-center text-rose-600 bg-rose-50 rounded-lg"><i className="bi bi-trash"></i></button>}
                                  </div>
                                </td>
                            </tr>
                        )) : <tr><td colSpan={5} className="px-8 py-20 text-center text-[10px] font-black text-gray-400 tracking-widest">Tidak ada riwayat evaluasi</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {activeView === 'create' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-modalEnter">
           <div className="px-10 py-7 bg-gray-50 border-b border-gray-100 flex justify-between items-center"><h4 className="text-[14px] font-black uppercase tracking-tight text-gray-900">{editingId ? 'Update SKP Digital' : 'Formulir SKP Digital'}</h4><button onClick={() => setActiveView('table')} className="text-gray-400"><i className="bi bi-x-lg"></i></button></div>
           <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Pilih Pegawai Terlantik</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900 outline-none" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})} disabled={!!editingId}><option value="">-- Cari Nama/NIP --</option>{pegawaiList.map(p => <option key={p.nip} value={p.nip}>{p.nama.toUpperCase()}</option>)}</select></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Tahun Evaluasi</label><input type="number" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.tahun} onChange={e => setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Predikat Akhir</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.predikat} onChange={e => setFormData({...formData, predikat: e.target.value})}><option value="Sangat Baik">SANGAT BAIK</option><option value="Baik">BAIK</option><option value="Butuh Perbaikan">BUTUH PERBAIKAN</option><option value="Kurang">KURANG</option></select></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-2">Pejabat Penilai</label><select className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-900" value={formData.penilaiNip} onChange={e => setFormData({...formData, penilaiNip: e.target.value})}><option value="">-- Pilih Penilai --</option>{pegawaiList.map(p => <option key={p.nip} value={p.nip}>{p.nama.toUpperCase()}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100"><button onClick={() => setActiveView('table')} className="px-8 py-3.5 text-[10px] font-black uppercase border border-gray-200 rounded-xl text-gray-600">Batal</button><button onClick={() => handleSaveSKP('FINAL')} className="px-10 py-3.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/20">{editingId ? 'Update & Sinkronkan' : 'Simpan & Terbitkan'}</button></div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedSKP && (
        <div className="space-y-8 animate-fadeIn max-w-[21cm] mx-auto pb-20">
          <div className="flex justify-end gap-3 no-print">
            <button onClick={() => setActiveView('table')} className="px-8 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600">Kembali</button>
            <button onClick={() => window.print()} className="px-8 py-3 bg-[#111827] text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl"><i className="bi bi-printer"></i> Cetak</button>
          </div>
          <div className="bg-white p-[1.5cm] shadow-2xl border-t-[8px] border-blue-600 print:shadow-none min-h-[29.7cm] text-gray-900">
             <div className="text-center mb-10"><h1 className="text-[14pt] font-bold uppercase tracking-tight">Evaluasi Kinerja Pegawai Negeri Sipil</h1><p className="text-[11pt] font-bold uppercase underline mt-4">Periode: AKHIR TAHUN {selectedSKP.tahun}</p></div>
             <table className="w-full border-collapse border border-black text-[9pt] mb-6">
                <tbody>
                   <tr><td className="border border-black p-3 w-1/2"><strong>PEGAWAI YANG DINILAI</strong><br/>NAMA: {selectedSKP.namaPegawai}<br/>NIP: {selectedSKP.nip}</td><td className="border border-black p-3"><strong>PEJABAT PENILAI</strong><br/>NAMA: {selectedSKP.pejabatPenilai?.nama || '-'}<br/>NIP: {selectedSKP.pejabatPenilai?.nip || '-'}</td></tr>
                </tbody>
             </table>
             <div className="space-y-6">
                <div><h6 className="text-[10pt] font-black uppercase bg-gray-100 p-2 border border-black">I. Capaian Kinerja Organisasi</h6><p className="p-3 border border-black text-[9pt] font-bold">ISTIMEWA / BAIK</p></div>
                <div><h6 className="text-[10pt] font-black uppercase bg-gray-100 p-2 border border-black">II. Hasil Kerja</h6>
                   <table className="w-full border-collapse border border-black text-[8pt]">
                      <thead className="bg-gray-50"><tr><th className="border border-black p-2">Rencana Hasil Kerja</th><th className="border border-black p-2">Target</th><th className="border border-black p-2">Realisasi</th><th className="border border-black p-2">Capaian</th></tr></thead>
                      <tbody>{selectedSKP.hasilKerja.map((h, i) => (<tr key={i}><td className="border border-black p-2">{h.rhk}</td><td className="border border-black p-2 text-center">{h.target}</td><td className="border border-black p-2 text-center">{h.target}</td><td className="border border-black p-2 text-center font-bold">SESUAI EKSPEKTASI</td></tr>))}</tbody>
                   </table>
                </div>
                <div><h6 className="text-[10pt] font-black uppercase bg-gray-100 p-2 border border-black">III. Predikat Kinerja Pegawai</h6><p className="p-4 border border-black text-[14pt] font-black text-center uppercase tracking-widest bg-blue-50/30 text-blue-800">{selectedSKP.predikat}</p></div>
             </div>
             <div className="mt-20 flex justify-between text-[10pt] px-10"><div className="text-center font-bold">Pegawai,<br/><br/><br/><br/><p className="underline">{selectedSKP.namaPegawai}</p></div><div className="text-center font-bold">Pejabat Penilai,<br/><br/><br/><br/><p className="underline">{selectedSKP.pejabatPenilai?.nama || '................'}</p></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKPPage;
