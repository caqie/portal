import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchSKPFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, SKPRecord, HasilKerjaRow, PerilakuKerjaRow } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

const INITIAL_PERILAKU: PerilakuKerjaRow[] = [
  { poin: 'Berorientasi Pelayanan', deskripsi: 'Memahami dan memenuhi kebutuhan masyarakat; Ramah, cekatan, solutif, dan dapat diandalkan; Melakukan perbaikan tiada henti', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Ketika Menjelaskan Mudah Dipahami' },
  { poin: 'Akuntabel', deskripsi: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin dan berintegritas tinggi; Menggunakan kekayaan dan barang milik negara secara bertanggung jawab, efektif dan efisien; Tidak menyalahgunakan kewenangan jabatan', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Berani Berterus Terang dan Mengakui Kesalahan' },
  { poin: 'Kompeten', deskripsi: 'Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah; Membantu orang lain belajar; Melaksanakan tugas dengan kualitas terbaik', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Selalu Mengupayakan Yang Terbaik' },
  { poin: 'Harmonis', deskripsi: 'Menghargai setiap orang apapun latar belakangnya; Suka menolong orang lain; Membangun lingkungan kerja yang kondusif', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Siap Memberikan Bantuan dan Pendampingan' },
  { poin: 'Loyal', deskripsi: 'Memegang teguh ideologi Pancasila, UUD 1945, setia kepada NKRI serta pemerintahan yang sah; Menjaga nama baik ASN, Pimpinan, Instansi, dan Negara; Menjaga rahasia jabatan dan negara', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Selalu Siap Ketika Dibutuhkan' },
  { poin: 'Adaptif', deskripsi: 'Cepat menyesuaikan diri menghadapi perubahan; Terus berinovasi dan mengembangkan kreativitas; Bertindak proaktif', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Semangat Mempelajari Hal Baru' },
  { poin: 'Kolaboratif', deskripsi: 'Memberi kesempatan kepada berbagai pihak untuk berkontribusi; Terbuka dalam bekerja sama untuk menghasilkan nilai tambah; Menggerakkan pemanfaatan berbagai sumber daya untuk tujuan bersama', ekspektasi: 'Ekspektasi Khusus Pimpinan: Untuk Dapat Dipertahankan', umpanBalik: 'Selalu Melibatkan Unit Kerja Lain' }
];

const SKPPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'table' | 'editor' | 'preview'>('table');
  const [editorStep, setEditorStep] = useState<'identitas' | 'hasil_kerja' | 'perilaku' | 'lampiran'>('identitas');
  const [selectedSKP, setSelectedSKP] = useState<any | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SKPRecord | null>(null);

  const [formData, setFormData] = useState<any>({
    nip: '',
    namaPegawai: '',
    penilaiNip: '',
    atasanPenilaiNip: '',
    tahun: new Date().getFullYear(),
    periodeMulai: '01 Januari 2024',
    periodeSelesai: '31 Desember 2024',
    tglPenilaian: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    capaianOrganisasi: 'BAIK',
    ratingHasilKerja: 'SESUAI EKSPEKTASI',
    ratingPerilaku: 'SESUAI EKSPEKTASI',
    predikatKinerja: 'BAIK',
    hasilKerja: [
      { rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan', rencanaPegawai: 'Terlaksananya pelayanan administrasi kepegawaian di lingkungan Direktorat Jenderal Kekayaan Intelektual', aspek: 'Kualitas', indikator: 'Persentase layanan administrasi kepegawaian yang diselesaikan', target: '100%', realisasi: '100%', umpanBalik: 'Secara Keseluruhan Sudah Sesuai dengan Data' }
    ],
    perilakuKerja: INITIAL_PERILAKU,
    lampiran: {
      dukunganSumberDaya: '1. Dibutuhkan dukungan sarana prasarana berupa PC, printer, scanner untuk mengelola dan menyusun dokumen kearsipan; 2. Pelatihan dibidang SDM dan Operator Layanan Operasional',
      skemaPertanggungjawaban: '1. Laporan triwulan; 2. Bukti kerja dalam bentuk laporan',
      konsekuensi: '1. Bila target tercapai sesuai rencana maka akan mendapat apresiasi dari atasan langsung; 2. Bila target tidak tercapai maka harus ada percepatan kegiatan selanjutnya'
    }
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchSKPFromSheets()]);
      setPegawaiList(pRes);
      setSkpList(sRes as any || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fungsionalOptions = useMemo(() => {
    const keys = ['TERAMPIL', 'PERTAMA', 'MUDA', 'MADYA', 'UTAMA'];
    return pegawaiList
      .filter(p => {
        const isPNS = (p.jenisPegawai || '').toUpperCase() === 'PNS';
        const jab = (p.jabatan || '').toUpperCase();
        return isPNS && keys.some(k => jab.includes(k));
      })
      .map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }));
  }, [pegawaiList]);

  const pjbOptions = useMemo(() => {
    return pegawaiList
      .filter(p => {
        const ese = (p.eselon || '').toUpperCase();
        const jab = (p.jabatan || '').toUpperCase();
        return ['I','II','III','IV'].some(l => ese.startsWith(l)) || jab.includes('KEPALA') || jab.includes('KOORDINATOR');
      })
      .map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }));
  }, [pegawaiList]);

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) setFormData({ ...formData, nip: p.nip, namaPegawai: p.nama });
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.penilaiNip) return alert("Lengkapi data subjek dan penilai");
    setSyncing(true);
    const payload = {
      ...formData,
      id: formData.id || `SKP-${formData.nip}-${Date.now()}`,
      status: 'Selesai'
    };
    try {
      const ok = await syncTableRemote('SKP', 'SAVE', payload);
      if (ok) {
        await loadInitialData();
        setSelectedSKP(payload);
        setActiveView('preview');
        setShowSuccess(true);
        logActivity('CREATE', 'SKP', `Terbitkan SKP 5 Halaman: ${payload.namaPegawai}`);
      }
    } catch (e) { alert("Gagal simpan."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`SKP_TERPADU_5HAL_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const activeRecord = selectedSKP || formData;
  const pSubjek = pegawaiList.find(p => p.nip === activeRecord.nip);
  const pPenilai = pegawaiList.find(p => p.nip === activeRecord.penilaiNip);
  const pAtasan = pegawaiList.find(p => p.nip === activeRecord.atasanPenilaiNip);

  const DocHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="flex flex-col items-center mb-6 text-black border-b-[2.5pt] border-black pb-3 font-arial text-center relative">
       <p className="text-[11.5pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
       <p className="text-[11.5pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
       <div className="h-1 bg-black w-full my-1"></div>
       <p className="text-[11pt] font-bold uppercase mt-4 underline leading-tight">{title}</p>
       {subtitle ? <p className="text-[10pt] font-bold uppercase leading-tight">{subtitle}</p> : <p className="text-[10pt] font-bold uppercase leading-tight">PERIODE : AKHIR</p>}
    </div>
  );

  const IdentityTable = ({ subjek, penilai }: any) => (
    <table className="w-full text-[8.5pt] border-collapse mb-6 font-arial text-black">
      <tbody>
        <tr className="font-bold bg-gray-100 border border-black">
          <td className="w-8 p-1 text-center border-r border-black">NO</td>
          <td className="p-1 border-r border-black" colSpan={2}>PEGAWAI YANG DINILAI</td>
          <td className="w-8 p-1 text-center border-r border-black">NO</td>
          <td className="p-1" colSpan={2}>PEJABAT PENILAI KINERJA</td>
        </tr>
        <tr className="border border-black">
          <td className="text-center p-1 border-r border-black">1</td>
          <td className="p-1 border-r border-black w-24">NAMA</td>
          <td className="p-1 border-r border-black font-bold uppercase">: {subjek?.nama || '-'}</td>
          <td className="text-center p-1 border-r border-black">1</td>
          <td className="p-1 border-r border-black w-24">NAMA</td>
          <td className="p-1 font-bold uppercase">: {penilai?.nama || '-'}</td>
        </tr>
        <tr className="border border-black">
          <td className="text-center p-1 border-r border-black">2</td>
          <td className="p-1 border-r border-black">NIP</td>
          <td className="p-1 border-r border-black">: {subjek?.nip || '-'}</td>
          <td className="text-center p-1 border-r border-black">2</td>
          <td className="p-1 border-r border-black">NIP</td>
          <td className="p-1">: {penilai?.nip || '-'}</td>
        </tr>
        <tr className="border border-black">
          <td className="text-center p-1 border-r border-black">3</td>
          <td className="p-1 border-r border-black">PANGKAT</td>
          <td className="p-1 border-r border-black uppercase">: {subjek?.pangkat || '-'} / ({subjek?.golRuang || '-'})</td>
          <td className="text-center p-1 border-r border-black">3</td>
          <td className="p-1 border-r border-black">PANGKAT</td>
          <td className="p-1 uppercase">: {penilai?.pangkat || '-'} / ({penilai?.golRuang || '-'})</td>
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Diterbitkan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if(!itemToDelete) return;
         setSyncing(true);
         const ok = await syncTableRemote('SKP', 'DELETE', { id: itemToDelete.id });
         if(ok) { setSkpList(prev => prev.filter(s => s.id !== itemToDelete.id)); setIsConfirmOpen(false); }
         setSyncing(false);
      }} message="Hapus dokumen SKP ini?" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">E-Kinerja SKP Generator</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
               <i className="bi bi-patch-check-fill text-blue-600"></i> Standar Permenpan RB 6/2022 (5 Halaman)
            </p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip SKP</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined, hasilKerja: []}); setActiveView('editor'); setEditorStep('identitas'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat Baru</button>}
        </div>
      </div>

      {activeView === 'table' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Nama Pegawai</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5 text-center">Predikat</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {skpList.map(s => (
                    <tr key={s.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-5">
                          <p className="text-[11px] font-black text-gray-950 uppercase leading-none mb-1.5">{s.namaPegawai}</p>
                          <p className="text-[9px] font-mono text-blue-600 font-bold tracking-tighter">NIP. {s.nip}</p>
                       </td>
                       <td className="px-4 py-5 text-center font-black text-gray-400">{s.tahun}</td>
                       <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase border border-emerald-100">{s.predikatKinerja}</span></td>
                       <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setSelectedSKP(s); setActiveView('preview'); }} className="h-9 px-6 rounded-xl bg-gray-950 text-white text-[9px] font-black uppercase shadow-lg">Lihat 5 Hal</button>
                           {(isSuperadmin || canEdit) && <button onClick={() => { setItemToDelete(s); setIsConfirmOpen(true); }} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><i className="bi bi-trash-fill"></i></button>}
                         </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-7xl mx-auto space-y-6 animate-modalEnter">
           <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[750px]">
              <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar">
                 {[
                   {id: 'identitas', label: '1. Identitas & Rating', icon: 'bi-person-vcard-fill'},
                   {id: 'hasil_kerja', label: '2. Rencana Kerja', icon: 'bi-table'},
                   {id: 'perilaku', label: '3. Perilaku Kerja', icon: 'bi-chat-heart-fill'},
                   {id: 'lampiran', label: '4. Lampiran SKP', icon: 'bi-paperclip'}
                 ].map(t => (
                   <button key={t.id} onClick={() => setEditorStep(t.id as any)} className={`px-10 py-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 ${editorStep === t.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400'}`}>
                      <i className={`bi ${t.icon}`}></i> {t.label}
                   </button>
                 ))}
              </div>
              <div className="p-10 flex-1 overflow-y-auto">
                 {editorStep === 'identitas' && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3">Data Individu Pegawai (PNS)</h5>
                         <SearchableSelect label="Pilih Pegawai Yang Dinilai" options={fungsionalOptions} value={formData.nip || ''} onChange={handlePegawaiSelect} />
                         <div className="grid grid-cols-2 gap-4">
                            <SearchableSelect label="Pejabat Penilai Kinerja" options={pjbOptions} value={formData.penilaiNip || ''} onChange={v => setFormData({...formData, penilaiNip: v})} />
                            <SearchableSelect label="Atasan Penilai Kinerja" options={pjbOptions} value={formData.atasanPenilaiNip || ''} onChange={v => setFormData({...formData, atasanPenilaiNip: v})} />
                         </div>
                      </div>
                   </div>
                 )}
              </div>
              <div className="px-10 py-10 bg-gray-50/50 border-t flex justify-center gap-6">
                 <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Simpan SKP</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SKPPage;