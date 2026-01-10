import React, { useState, useEffect } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, SKP } from '../types';
import { useAuth } from '../AuthContext';
import { LOGO_DJKI_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';

interface SKPRecord extends SKP {
  status: 'DRAFT' | 'FINAL' | 'UPLOADED';
  tglDibuat: string;
  hasilKerja: any[];
  perilakuKerja: any;
  pejabatPenilai?: Pegawai;
  atasanPejabat?: Pegawai;
  capaianOrganisasi?: string;
  predikatKinerja?: string;
}

const SKPPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'table' | 'create' | 'preview'>('table');
  const [selectedSKP, setSelectedSKP] = useState<SKPRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Logo system from localStorage or fallback to default
  const systemLogo = localStorage.getItem('portal_system_logo') || LOGO_DJKI_URL;

  const [formData, setFormData] = useState<any>({ 
    nip: '', 
    tahun: 2025, 
    penilaiNip: '', 
    atasanNip: '',
    predikat: 'Baik',
    capaianOrganisasi: 'ISTIMEWA',
    predikatKinerja: 'DIATAS EKSPETASI',
    hasilKerja: [
      { rhk: 'Meningkatnya efektivitas layanan publik', rencana: 'Laporan layanan tepat waktu', aspek: 'Kuantitas', indikator: 'Jumlah laporan', target: '12 Laporan', realisasi: '12 Laporan', feedback: 'Sangat Baik' }
    ], 
    perilaku: { 
      pelayanan: { feedback: 'Dapat dipertahankan' }, 
      akuntabel: { feedback: 'Disiplin tinggi' }, 
      kompeten: { feedback: 'Terus belajar' }, 
      harmonis: { feedback: 'Kerjasama baik' }, 
      loyal: { feedback: 'Dedikasi tinggi' }, 
      adaptif: { feedback: 'Cepat belajar' }, 
      kolaboratif: { feedback: 'Sinergi bagus' } 
    } 
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      const saved = localStorage.getItem('skp_database');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSkpList(isViewer ? parsed.filter((s: any) => s.nip === user?.nip) : parsed);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      nip: isViewer ? user?.nip : '',
      tahun: 2025,
      penilaiNip: '',
      atasanNip: '',
      predikat: 'Sangat Baik',
      capaianOrganisasi: 'ISTIMEWA',
      predikatKinerja: 'DIATAS EKSPETASI',
      hasilKerja: [{ rhk: '', rencana: '', aspek: 'Kualitas', indikator: '', target: '', realisasi: '', feedback: '' }],
      perilaku: { pelayanan: { feedback: '' }, akuntabel: { feedback: '' }, kompeten: { feedback: '' }, harmonis: { feedback: '' }, loyal: { feedback: '' }, adaptif: { feedback: '' }, kolaboratif: { feedback: '' } }
    });
    setActiveView('create');
  };

  const handleSaveSKP = (status: 'DRAFT' | 'FINAL') => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai");

    const newRecord: SKPRecord = { 
      id: editingId || Date.now().toString(), 
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
      pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip),
      atasanPejabat: pegawaiList.find(p => p.nip === formData.atasanNip),
      capaianOrganisasi: formData.capaianOrganisasi,
      predikatKinerja: formData.predikatKinerja
    };

    let updatedList: SKPRecord[];
    if (editingId) {
      updatedList = skpList.map(s => s.id === editingId ? newRecord : s);
      logActivity('UPDATE', 'SKP', `Update SKP ${formData.tahun} - ${peg.nama}`);
    } else {
      updatedList = [newRecord, ...skpList];
      logActivity('CREATE', 'SKP', `Buat SKP ${formData.tahun} - ${peg.nama}`);
    }

    setSkpList(updatedList);
    localStorage.setItem('skp_database', JSON.stringify(updatedList));
    setActiveView('table');
    setShowSuccess(true);
  };

  const handlePreview = (skp: SKPRecord) => {
    setSelectedSKP(skp);
    setActiveView('preview');
  };

  const addHasilKerja = () => {
    setFormData({ ...formData, hasilKerja: [...formData.hasilKerja, { rhk: '', rencana: '', aspek: 'Kualitas', indikator: '', target: '', realisasi: '', feedback: '' }] });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Berhasil Disimpan" message="Dokumen penilaian kinerja telah diperbarui dan siap digunakan." />
      
      {activeView === 'table' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center no-print">
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase">Evaluasi SKP</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Sistem Penilaian Kinerja Terintegrasi BKN</p>
            </div>
            {canEdit && (
              <button onClick={handleOpenCreate} className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl">
                + Buat Evaluasi Baru
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b">
                <tr><th className="px-8 py-5">Nama Pegawai / NIP</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5">Predikat</th><th className="px-8 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {skpList.map(s => (
                  <tr key={s.id} className="hover:bg-blue-50/5 group transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-black text-gray-900 uppercase">{s.namaPegawai}</p>
                      <p className="text-[9px] font-mono text-blue-600 font-bold">{s.nip}</p>
                    </td>
                    <td className="px-4 py-5 text-center font-bold text-[10px]">{s.tahun}</td>
                    <td className="px-4 py-5">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg uppercase">{s.predikat}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handlePreview(s)} className="h-9 w-9 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 flex items-center justify-center border border-gray-100"><i className="bi bi-eye-fill"></i></button>
                        {canEdit && (
                          <button onClick={() => { setEditingId(s.id); setFormData(s); setActiveView('create'); }} className="h-9 w-9 rounded-xl bg-gray-50 text-gray-400 hover:text-amber-600 flex items-center justify-center border border-gray-100"><i className="bi bi-pencil-fill"></i></button>
                        )}
                        {isSuperadmin && (
                          <button onClick={() => { if(confirm('Hapus SKP ini?')) setSkpList(skpList.filter(x => x.id !== s.id)); }} className="h-9 w-9 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 flex items-center justify-center border border-gray-100"><i className="bi bi-trash-fill"></i></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'create' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm p-12 space-y-10 animate-modalEnter">
           <div className="flex justify-between items-center border-b pb-6">
              <h4 className="text-xl font-black uppercase text-gray-900">Form Input Evaluasi SKP</h4>
              <button onClick={() => setActiveView('table')} className="text-gray-400 hover:text-rose-500"><i className="bi bi-x-lg text-xl"></i></button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest">I. Informasi Pejabat</h5>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase">Pegawai yang Dinilai</label>
                    <select className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl font-bold text-xs" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})}>
                       <option value="">Pilih Pegawai</option>
                       {pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama} ({p.nip})</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-gray-400 uppercase">Pejabat Penilai Kinerja</label>
                    <select className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl font-bold text-xs" value={formData.penilaiNip} onChange={e => setFormData({...formData, penilaiNip: e.target.value})}>
                       <option value="">Pilih Pejabat</option>
                       {pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                    </select>
                 </div>
              </div>
              <div className="space-y-4">
                 <h5 className="text-[10px] font-black uppercase text-blue-600 tracking-widest">II. Hasil Kinerja</h5>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-gray-400 uppercase">Tahun Evaluasi</label>
                       <input type="number" className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl font-bold text-xs" value={formData.tahun} onChange={e => setFormData({...formData, tahun: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-gray-400 uppercase">Predikat Kinerja</label>
                       <select className="w-full px-5 py-3.5 bg-gray-50 border rounded-xl font-bold text-xs" value={formData.predikat} onChange={e => setFormData({...formData, predikat: e.target.value})}>
                          <option value="Sangat Baik">Sangat Baik</option>
                          <option value="Baik">Baik</option>
                          <option value="Cukup">Cukup</option>
                       </select>
                    </div>
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <h5 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">III. Tabel Rencana Hasil Kerja</h5>
                 <button onClick={addHasilKerja} className="text-[9px] font-black text-blue-600 uppercase">+ Tambah Baris</button>
              </div>
              <div className="overflow-x-auto border rounded-2xl">
                 <table className="w-full">
                    <thead className="bg-gray-50 text-[7px] font-black uppercase text-gray-400 border-b">
                       <tr><th className="p-3">Rencana Hasil Kerja</th><th className="p-3">Indikator</th><th className="p-3">Target</th><th className="p-3">Realisasi</th><th className="p-3">Feedback</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                       {formData.hasilKerja.map((h:any, i:number) => (
                         <tr key={i}>
                            <td className="p-2"><textarea className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" rows={2} value={h.rhk} onChange={e => { const updated = [...formData.hasilKerja]; updated[i].rhk = e.target.value; setFormData({...formData, hasilKerja: updated}) }} /></td>
                            <td className="p-2"><textarea className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" rows={2} value={h.indikator} onChange={e => { const updated = [...formData.hasilKerja]; updated[i].indikator = e.target.value; setFormData({...formData, hasilKerja: updated}) }} /></td>
                            <td className="p-2"><input type="text" className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" value={h.target} onChange={e => { const updated = [...formData.hasilKerja]; updated[i].target = e.target.value; setFormData({...formData, hasilKerja: updated}) }} /></td>
                            <td className="p-2"><input type="text" className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" value={h.realisasi} onChange={e => { const updated = [...formData.hasilKerja]; updated[i].realisasi = e.target.value; setFormData({...formData, hasilKerja: updated}) }} /></td>
                            <td className="p-2"><input type="text" className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" value={h.feedback} onChange={e => { const updated = [...formData.hasilKerja]; updated[i].feedback = e.target.value; setFormData({...formData, hasilKerja: updated}) }} /></td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-6">
              <button onClick={() => setActiveView('table')} className="px-8 py-4 text-[10px] font-black uppercase text-gray-500 bg-gray-50 rounded-2xl">Batal</button>
              <button onClick={() => handleSaveSKP('FINAL')} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Simpan & Terbitkan</button>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedSKP && (
        <div className="space-y-8 animate-fadeIn">
           <div className="flex justify-between items-center no-print">
              <button onClick={() => setActiveView('table')} className="px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><i className="bi bi-arrow-left"></i> Kembali</button>
              <button onClick={() => window.print()} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl shadow-blue-600/20"><i className="bi bi-printer-fill"></i> Download / Cetak SKP</button>
           </div>

           {/* HIGH FIDELITY GOVERNMENT TEMPLATE */}
           <div className="bg-white p-[2cm] shadow-2xl min-h-[29.7cm] w-[21cm] mx-auto text-black font-serif page-break">
              {/* Header */}
              <div className="flex items-center justify-center mb-8 relative">
                 <div className="absolute left-0 w-20">
                    <img src={systemLogo} className="w-full object-contain" alt="Logo" />
                 </div>
                 <div className="text-center">
                    <h1 className="text-[12pt] font-bold uppercase leading-tight">DOKUMEN EVALUASI KINERJA PEGAWAI</h1>
                    <h2 className="text-[11pt] font-bold uppercase leading-tight mt-1">PERIODE : AKHIR</h2>
                    <p className="text-[10pt] mt-2">Periode Penilaian : 01 Oktober s.d 31 Desember {selectedSKP.tahun}</p>
                 </div>
              </div>

              {/* Data Pegawai Table */}
              <div className="space-y-0.5 mb-6">
                 <div className="bg-blue-100/50 p-1 font-bold text-[9pt] border border-black uppercase">1. PEGAWAI YANG DINILAI</div>
                 <table className="w-full border-collapse border border-black text-[9pt]">
                    <tbody>
                       <tr><td className="w-48 border border-black p-1 uppercase">NAMA</td><td className="border border-black p-1">: {selectedSKP.namaPegawai}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">NIP</td><td className="border border-black p-1 font-mono">: {selectedSKP.nip}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">PANGKAT/GOL RUANG</td><td className="border border-black p-1">: {pegawaiList.find(p => p.nip === selectedSKP.nip)?.pangkat || '-'} / {pegawaiList.find(p => p.nip === selectedSKP.nip)?.golRuang || '-'}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">JABATAN</td><td className="border border-black p-1">: {pegawaiList.find(p => p.nip === selectedSKP.nip)?.jabatan || '-'}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">UNIT KERJA</td><td className="border border-black p-1">: {pegawaiList.find(p => p.nip === selectedSKP.nip)?.unitKerja || '-'}</td></tr>
                    </tbody>
                 </table>
              </div>

              <div className="space-y-0.5 mb-6">
                 <div className="bg-blue-100/50 p-1 font-bold text-[9pt] border border-black uppercase">2. PEJABAT PENILAI KINERJA</div>
                 <table className="w-full border-collapse border border-black text-[9pt]">
                    <tbody>
                       <tr><td className="w-48 border border-black p-1 uppercase">NAMA</td><td className="border border-black p-1">: {selectedSKP.pejabatPenilai?.nama || '-'}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">NIP</td><td className="border border-black p-1 font-mono">: {selectedSKP.pejabatPenilai?.nip || '-'}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">PANGKAT/GOL RUANG</td><td className="border border-black p-1">: {selectedSKP.pejabatPenilai?.pangkat || '-'} / {selectedSKP.pejabatPenilai?.golRuang || '-'}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">JABATAN</td><td className="border border-black p-1">: {selectedSKP.pejabatPenilai?.jabatan || '-'}</td></tr>
                       <tr><td className="border border-black p-1 uppercase">UNIT KERJA</td><td className="border border-black p-1">: {selectedSKP.pejabatPenilai?.unitKerja || '-'}</td></tr>
                    </tbody>
                 </table>
              </div>

              {/* Tabel Evaluasi Kinerja */}
              <div className="bg-blue-100/50 p-1 font-bold text-[9pt] border border-black uppercase mb-0.5">HASIL KERJA</div>
              <table className="w-full border-collapse border border-black text-[8pt] text-center mb-6">
                 <thead className="bg-blue-50/50">
                    <tr>
                       <th className="border border-black p-1 w-8">NO</th>
                       <th className="border border-black p-1">RENCANA HASIL KERJA</th>
                       <th className="border border-black p-1 w-20">ASPEK</th>
                       <th className="border border-black p-1">INDIKATOR KINERJA INDIVIDU</th>
                       <th className="border border-black p-1 w-24">TARGET</th>
                       <th className="border border-black p-1 w-24">REALISASI</th>
                       <th className="border border-black p-1">UMPAN BALIK</th>
                    </tr>
                 </thead>
                 <tbody>
                    {selectedSKP.hasilKerja.map((h, i) => (
                       <tr key={i}>
                          <td className="border border-black p-1">{i + 1}</td>
                          <td className="border border-black p-1 text-left">{h.rhk}</td>
                          <td className="border border-black p-1">{h.aspek}</td>
                          <td className="border border-black p-1 text-left">{h.indikator}</td>
                          <td className="border border-black p-1">{h.target}</td>
                          <td className="border border-black p-1">{h.realisasi}</td>
                          <td className="border border-black p-1 italic text-gray-600">{h.feedback}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>

              {/* Rating Section */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                 <div className="border border-black p-2 text-center">
                    <p className="text-[8pt] font-bold uppercase mb-1">CAPAIAN KINERJA ORGANISASI</p>
                    <div className="text-[12pt] font-black uppercase text-blue-700">{selectedSKP.capaianOrganisasi || 'ISTIMEWA'}</div>
                 </div>
                 <div className="border border-black p-2 text-center">
                    <p className="text-[8pt] font-bold uppercase mb-1">PREDIKAT KINERJA PEGAWAI</p>
                    <div className="text-[12pt] font-black uppercase text-emerald-700">{selectedSKP.predikatKinerja || 'DIATAS EKSPETASI'}</div>
                 </div>
              </div>

              {/* Tanda Tangan */}
              <div className="mt-20 grid grid-cols-2 text-[10pt]">
                 <div className="text-center flex flex-col items-center">
                    <p className="mb-24">Pegawai yang Dinilai,</p>
                    <p className="font-bold underline uppercase">{selectedSKP.namaPegawai}</p>
                    <p>NIP {selectedSKP.nip}</p>
                 </div>
                 <div className="text-center flex flex-col items-center">
                    <p className="mb-24">Pejabat Penilai Kinerja,</p>
                    <p className="font-bold underline uppercase">{selectedSKP.pejabatPenilai?.nama || '-'}</p>
                    <p>NIP {selectedSKP.pejabatPenilai?.nip || '-'}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        @media print {
           .no-print { display: none !important; }
           body { background: white !important; padding: 0 !important; margin: 0 !important; }
           main { padding: 0 !important; overflow: visible !important; }
           #root { overflow: visible !important; }
           .page-break { 
              page-break-after: always; 
              display: block; 
              margin: 0 auto !important; 
              box-shadow: none !important;
              border: none !important;
           }
           @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default SKPPage;