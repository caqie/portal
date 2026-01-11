import React, { useState, useEffect, useRef } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, SKP } from '../types';
import { useAuth } from '../AuthContext';
import { LOGO_DJKI_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import { 
  Document, Packer, Paragraph, Table as DocxTable, 
  TableRow as DocxTableRow, TableCell as DocxTableCell, 
  WidthType, AlignmentType, HeadingLevel, BorderStyle
} from 'docx';
import FileSaver from 'file-saver';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// URL Logo Garuda Pancasila untuk dokumen resmi
const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

interface SKPRecord extends SKP {
  status: 'DRAFT' | 'FINAL';
  tglDibuat: string;
  pejabatPenilai?: Pegawai;
  atasanPenilai?: Pegawai;
  periodeMulai: string;
  periodeSelesai: string;
  tglPenilaian: string;
  capaianOrganisasi: string;
  predikatKinerja: string;
  catatan: string;
  dukungan: string[];
  skema: string[];
  konsekuensi: string[];
  hasilKerja: any[];
  perilakuKerja: Record<string, { rating: string, feedback: string, feedbackDukung: string }>;
}

const BERAKHLAK_KEYS = [
  { key: 'pelayanan', label: 'Berorientasi Pelayanan', desc: ['Memahami dan memenuhi kebutuhan masyarakat', 'Ramah, cekatan, solutif, dan dapat diandalkan', 'Melakukan perbaikan tiada henti'] },
  { key: 'akuntabel', label: 'Akuntabel', desc: ['Melaksanakan tugas dengan jujur, bertanggungjawab, cermat, disiplin dan berintegritas tinggi', 'Menggunakan kekayaan dan barang milik negara secara bertanggungjawab, efektif, dan efisien', 'Tidak menyalahgunakan kewenangan jabatan'] },
  { key: 'kompeten', label: 'Kompeten', desc: ['Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah', 'Membantu orang lain belajar', 'Melaksanakan tugas dengan kualitas terbaik'] },
  { key: 'harmonis', label: 'Harmonis', desc: ['Menghargai setiap orang apapun latar belakangnya', 'Suka menolong orang lain', 'Membangun lingkungan kerja yang kondusif'] },
  { key: 'loyal', label: 'Loyal', desc: ['Memegang teguh ideologi Pancasila, UUD 1945, setia kepada NKRI', 'Menjaga nama baik ASN, Pimpinan, Instansi, dan Negara', 'Menjaga rahasia jabatan dan negara'] },
  { key: 'adaptif', label: 'Adaptif', desc: ['Cepat menyesuaikan diri menghadapi perubahan', 'Terus berinovasi dan mengembangkan kreativitas', 'Bertindak proaktif'] },
  { key: 'kolaboratif', label: 'Kolaboratif', desc: ['Memberi kesempatan kepada berbagai pihak untuk berkontribusi', 'Terbuka dalam bekerja sama untuk menghasilkan nilai tambah', 'Menggerakkan pemanfaatan berbagai sumberdaya untuk tujuan bersama'] }
];

const SKPPage = () => {
  const { user, canEdit, isSuperadmin, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [skpList, setSkpList] = useState<SKPRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'table' | 'create' | 'preview'>('table');
  const [activeFormTab, setActiveFormTab] = useState(1);
  const [selectedSKP, setSelectedSKP] = useState<SKPRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nip: '',
    penilaiNip: '',
    atasanNip: '',
    tahun: 2025,
    periodeMulai: '01 Oktober 2025',
    periodeSelesai: '31 Desember 2025',
    tglPenilaian: '06 Januari 2026',
    capaianOrganisasi: 'ISTIMEWA',
    predikatKinerja: 'DIATAS EKSPETASI',
    catatan: '-',
    dukungan: ['Dukungan anggaran operasional', 'Ketersediaan sarana IT'],
    skema: ['Pelaporan progres bulanan', 'Evaluasi berkala per triwulan'],
    konsekuensi: ['Pemberian reward sesuai regulasi', 'Evaluasi kompetensi berkelanjutan'],
    hasilKerja: [
      { rhkAtasan: 'Meningkatnya efektivitas layanan publik', rhk: 'Tersusunnya laporan layanan tepat waktu', aspek: 'Kualitas', indikator: 'Persentase ketepatan data', target: '100%', realisasi: '100%', feedback: 'Pertahankan kualitas data' }
    ],
    perilaku: { 
      pelayanan: { rating: 'SANGAT BAIK', feedback: 'Dapat Dipertahankan', feedbackDukung: 'Ketika Menjelaskan Mudah Dipahami' },
      akuntabel: { rating: 'SANGAT BAIK', feedback: 'Dapat Dipertahankan', feedbackDukung: 'Beani Berterus terang' },
      kompeten: { rating: 'SANGAT BAIK', feedback: 'Sangat Baik', feedbackDukung: 'Selalu Mengupayakan Yang Terbaik' },
      harmonis: { rating: 'SANGAT BAIK', feedback: 'Sangat Baik', feedbackDukung: 'Membangun kerjasama tim' },
      loyal: { rating: 'SANGAT BAIK', feedback: 'Sangat Baik', feedbackDukung: 'Integritas tinggi' },
      adaptif: { rating: 'SANGAT BAIK', feedback: 'Sangat Baik', feedbackDukung: 'Cepat menyesuaikan diri' },
      kolaboratif: { rating: 'SANGAT BAIK', feedback: 'Sangat Baik', feedbackDukung: 'Sinergi antar unit' }
    }
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      const saved = localStorage.getItem('skp_pro_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSkpList(isViewer ? parsed.filter((s: any) => s.nip === user?.nip) : parsed);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setActiveFormTab(1);
    setFormData({
      ...formData,
      nip: isViewer ? user?.nip : '',
      atasanNip: '',
      penilaiNip: '',
    });
    setActiveView('create');
  };

  const handleSaveSKP = () => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai");

    const newRecord: SKPRecord = { 
      id: editingId || Date.now().toString(), 
      nip: peg.nip, 
      namaPegawai: peg.nama, 
      tahun: formData.tahun, 
      nilaiKinerja: 100, 
      nilaiPerilaku: 100, 
      predikat: formData.predikatKinerja as any, 
      status: 'FINAL', 
      tglDibuat: new Date().toLocaleDateString('id-ID'), 
      pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip),
      atasanPenilai: pegawaiList.find(p => p.nip === formData.atasanNip),
      periodeMulai: formData.periodeMulai,
      periodeSelesai: formData.periodeSelesai,
      tglPenilaian: formData.tglPenilaian,
      capaianOrganisasi: formData.capaianOrganisasi,
      predikatKinerja: formData.predikatKinerja,
      catatan: formData.catatan,
      dukungan: formData.dukungan,
      skema: formData.skema,
      konsekuensi: formData.konsekuensi,
      hasilKerja: formData.hasilKerja,
      perilakuKerja: formData.perilaku
    };

    const updatedList = editingId ? skpList.map(s => s.id === editingId ? newRecord : s) : [newRecord, ...skpList];
    setSkpList(updatedList);
    localStorage.setItem('skp_pro_db', JSON.stringify(updatedList));
    logActivity(editingId ? 'UPDATE' : 'CREATE', 'SKP', `Simpan SKP: ${peg.nama}`);
    setActiveView('table');
    setShowSuccess(true);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    const pageHeight = 295;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`SKP_Full_${selectedSKP?.namaPegawai.replace(/\s+/g, '_')}.pdf`);
  };

  // HEADER DENGAN KONTROL LOGO GARUDA
  const PageHeader = ({ title, subtitle, period, showLogo = false }: any) => (
    <div className="flex flex-col items-center mb-10 text-center">
      {showLogo && (
        <div className="w-24 h-24 mb-4">
          <img src={LOGO_GARUDA_URL} className="w-full object-contain" alt="Garuda" />
        </div>
      )}
      {!showLogo && <div className="h-10"></div>} {/* Spacer if logo is missing */}
      <h1 className="text-[12pt] font-bold uppercase leading-tight">{title}</h1>
      {subtitle && <h2 className="text-[11pt] font-bold uppercase mt-1">{subtitle}</h2>}
      <p className="text-[10pt] mt-3 font-bold uppercase">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
      <div className="w-full flex flex-col items-center mt-2">
         <p className="text-[9pt] font-bold uppercase">PERIODE PENILAIAN :</p>
         <p className="text-[10pt] italic">{period || `01 Oktober s.d 31 Desember ${selectedSKP?.tahun}`}</p>
      </div>
    </div>
  );

  const Signatures = ({ date, p1, p2, label1, label2 }: any) => (
    <div className="mt-12 w-full text-[10pt]">
      <div className="text-right mb-12">Jakarta, {date}</div>
      <div className="grid grid-cols-2 gap-10">
        <div className="text-center flex flex-col items-center">
          <p className="mb-24">{label1 || 'Pegawai yang Dinilai,'}</p>
          <p className="font-bold underline uppercase">{p1?.nama || '-'}</p>
          <p>NIP {p1?.nip || '-'}</p>
        </div>
        <div className="text-center flex flex-col items-center">
          <p className="mb-24">{label2 || 'Pejabat Penilai Kinerja,'}</p>
          <p className="font-bold underline uppercase">{p2?.nama || '-'}</p>
          <p>NIP {p2?.nip || '-'}</p>
        </div>
      </div>
    </div>
  );

  const InfoTable = ({ label, p }: { label: string, p?: Pegawai }) => (
    <div className="mb-4">
      <div className="bg-gray-200 p-1.5 font-bold text-[9pt] border border-black uppercase">{label}</div>
      <table className="w-full border-collapse border border-black text-[9pt]">
        <tbody>
          <tr><td className="w-48 border border-black p-1.5 font-bold">NAMA</td><td className="border border-black p-1.5 uppercase">: {p?.nama || '-'}</td></tr>
          <tr><td className="border border-black p-1.5 font-bold">NIP</td><td className="border border-black p-1.5 font-mono">: {p?.nip || '-'}</td></tr>
          <tr><td className="border border-black p-1.5 font-bold">PANGKAT/GOL. RUANG</td><td className="border border-black p-1.5 uppercase">: {p?.pangkat || '-'} / {p?.golRuang || '-'}</td></tr>
          <tr><td className="border border-black p-1.5 font-bold">JABATAN</td><td className="border border-black p-1.5 uppercase">: {p?.jabatan || '-'}</td></tr>
          <tr><td className="border border-black p-1.5 font-bold">UNIT KERJA</td><td className="border border-black p-1.5 uppercase">: {p?.unitKerja || '-'}</td></tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Final Disimpan" message="Dokumen 8 halaman telah siap untuk diekspor." />
      
      {activeView === 'table' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end no-print">
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manajemen SKP Pro</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Standar BKN • Logo Garuda Pancasila • Permenpan 6/2022</p>
            </div>
            {canEdit && (
              <button onClick={handleOpenCreate} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all">
                + Buat Dokumen Baru
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                <tr><th className="px-8 py-5">Pegawai</th><th className="px-4 py-5 text-center">Tahun</th><th className="px-4 py-5">Predikat Kinerja</th><th className="px-8 py-5 text-right">Opsi</th></tr>
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
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded-lg uppercase">{s.predikatKinerja}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedSKP(s); setActiveView('preview'); }} className="h-10 px-4 rounded-xl bg-gray-900 text-white flex items-center gap-2 text-[10px] font-black uppercase transition-all shadow-lg active:scale-95"><i className="bi bi-file-earmark-pdf"></i> Preview</button>
                        {canEdit && <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 flex items-center justify-center border border-gray-100" onClick={() => setSkpList(skpList.filter(x=>x.id!==s.id))}><i className="bi bi-trash-fill"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {skpList.length === 0 && <tr><td colSpan={4} className="py-24 text-center text-gray-300 font-black uppercase text-[11px]">Database SKP Kosong</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'create' && (
        <div className="max-w-5xl mx-auto space-y-8 animate-modalEnter">
           <div className="flex items-center justify-between no-print">
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                {[1, 2, 3, 4].map(i => (
                  <button key={i} onClick={() => setActiveFormTab(i)} className={`px-6 py-2.5 text-[9px] font-black uppercase rounded-xl transition-all ${activeFormTab === i ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
                    Tahap {i}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveView('table')} className="text-rose-500 font-black text-[10px] uppercase">Batalkan</button>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
              {activeFormTab === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                   <div className="space-y-4">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest">A. Identitas Penilai</h4>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Pegawai yang Dinilai</label>
                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})}>
                           <option value="">Pilih</option>{pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Pejabat Penilai</label>
                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.penilaiNip} onChange={e => setFormData({...formData, penilaiNip: e.target.value})}>
                           <option value="">Pilih</option>{pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase">Atasan Pejabat Penilai</label>
                        <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.atasanNip} onChange={e => setFormData({...formData, atasanNip: e.target.value})}>
                           <option value="">Pilih</option>{pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                        </select>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest">B. Periode Penilaian</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Tahun</label><input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.tahun} onChange={e => setFormData({...formData, tahun: e.target.value})} /></div>
                         <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Tgl Dokumen</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.tglPenilaian} onChange={e => setFormData({...formData, tglPenilaian: e.target.value})} /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Mulai</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.periodeMulai} onChange={e => setFormData({...formData, periodeMulai: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Selesai</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold" value={formData.periodeSelesai} onChange={e => setFormData({...formData, periodeSelesai: e.target.value})} /></div>
                   </div>
                </div>
              )}

              {activeFormTab === 2 && (
                <div className="space-y-8 animate-fadeIn">
                   <h4 className="text-blue-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest">Lampiran: Dukungan, Skema & Konsekuensi</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                         <label className="text-[9px] font-black uppercase text-gray-500">Dukungan Sumber Daya</label>
                         {formData.dukungan.map((d:any, i:number) => (
                           <input key={i} className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-[10px] font-bold" value={d} onChange={e => { const nd = [...formData.dukungan]; nd[i] = e.target.value; setFormData({...formData, dukungan: nd}) }} />
                         ))}
                         <button onClick={() => setFormData({...formData, dukungan: [...formData.dukungan, '']})} className="text-[8px] font-black uppercase text-blue-600">+ Tambah</button>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[9px] font-black uppercase text-gray-500">Skema Pertanggungjawaban</label>
                         {formData.skema.map((d:any, i:number) => (
                           <input key={i} className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-[10px] font-bold" value={d} onChange={e => { const nd = [...formData.skema]; nd[i] = e.target.value; setFormData({...formData, skema: nd}) }} />
                         ))}
                         <button onClick={() => setFormData({...formData, skema: [...formData.skema, '']})} className="text-[8px] font-black uppercase text-blue-600">+ Tambah</button>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[9px] font-black uppercase text-gray-500">Konsekuensi</label>
                         {formData.konsekuensi.map((d:any, i:number) => (
                           <input key={i} className="w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-[10px] font-bold" value={d} onChange={e => { const nd = [...formData.konsekuensi]; nd[i] = e.target.value; setFormData({...formData, konsekuensi: nd}) }} />
                         ))}
                         <button onClick={() => setFormData({...formData, konsekuensi: [...formData.konsekuensi, '']})} className="text-[8px] font-black uppercase text-blue-600">+ Tambah</button>
                      </div>
                   </div>
                </div>
              )}

              {activeFormTab === 3 && (
                <div className="space-y-6 animate-fadeIn">
                   <div className="flex justify-between items-center border-b pb-2"><h4 className="text-blue-600 font-black text-[10px] uppercase tracking-widest">Matriks Hasil Kerja Kuantitatif</h4><button onClick={() => setFormData({...formData, hasilKerja: [...formData.hasilKerja, {rhkAtasan: '', rhk: '', aspek: 'Kualitas', indikator: '', target: '', realisasi: '', feedback: ''}]})} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase shadow-sm border border-blue-100">+ Baris Baru</button></div>
                   <div className="overflow-x-auto border rounded-3xl">
                      <table className="w-full">
                         <thead className="bg-gray-50 text-[7px] font-black uppercase text-gray-400 border-b">
                            <tr><th className="p-3">RHK Atasan</th><th className="p-3">Rencana Hasil Kerja</th><th className="p-3 w-32">Target</th><th className="p-3 w-32">Realisasi</th><th className="p-3">Feedback</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {formData.hasilKerja.map((h:any, i:number) => (
                              <tr key={i}>
                                <td className="p-2"><textarea className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" rows={2} value={h.rhkAtasan} onChange={e => { const upd = [...formData.hasilKerja]; upd[i].rhkAtasan = e.target.value; setFormData({...formData, hasilKerja: upd}) }} /></td>
                                <td className="p-2"><textarea className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" rows={2} value={h.rhk} onChange={e => { const upd = [...formData.hasilKerja]; upd[i].rhk = e.target.value; setFormData({...formData, hasilKerja: upd}) }} /></td>
                                <td className="p-2"><input className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" value={h.target} onChange={e => { const upd = [...formData.hasilKerja]; upd[i].target = e.target.value; setFormData({...formData, hasilKerja: upd}) }} /></td>
                                <td className="p-2"><input className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" value={h.realisasi} onChange={e => { const upd = [...formData.hasilKerja]; upd[i].realisasi = e.target.value; setFormData({...formData, hasilKerja: upd}) }} /></td>
                                <td className="p-2"><input className="w-full p-2 bg-transparent text-[10px] font-bold outline-none" value={h.feedback} onChange={e => { const upd = [...formData.hasilKerja]; upd[i].feedback = e.target.value; setFormData({...formData, hasilKerja: upd}) }} /></td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}

              {activeFormTab === 4 && (
                <div className="space-y-10 animate-fadeIn">
                   <div className="grid grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <h4 className="text-emerald-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest">C. Hasil Akhir Evaluasi</h4>
                        <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase">Capaian Kinerja Organisasi</label><select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.capaianOrganisasi} onChange={e => setFormData({...formData, capaianOrganisasi: e.target.value})}><option value="ISTIMEWA">ISTIMEWA</option><option value="BAIK">BAIK</option><option value="CUKUP">CUKUP</option></select></div>
                        <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase">Predikat Kinerja Pegawai</label><select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.predikatKinerja} onChange={e => setFormData({...formData, predikatKinerja: e.target.value})}><option value="DIATAS EKSPETASI">DIATAS EKSPETASI</option><option value="SESUAI EKSPETASI">SESUAI EKSPETASI</option><option value="DIBAWAH EKSPETASI">DIBAWAH EKSPETASI</option></select></div>
                        <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase">Catatan / Rekomendasi</label><textarea className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold resize-none" rows={3} value={formData.catatan} onChange={e => setFormData({...formData, catatan: e.target.value})} /></div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-emerald-600 font-black text-[10px] uppercase border-b pb-2 tracking-widest">D. Perilaku (BerAKHLAK)</h4>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-4 pr-2">
                           {BERAKHLAK_KEYS.map(({key, label}) => (
                             <div key={key} className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[9px] font-black text-gray-500 uppercase">{label}</p>
                                <select className="w-full px-3 py-1.5 bg-white border rounded-lg text-[10px] font-bold" value={formData.perilaku[key].rating} onChange={e => { const np = {...formData.perilaku}; np[key].rating = e.target.value; setFormData({...formData, perilaku: np}) }}><option value="SANGAT BAIK">SANGAT BAIK</option><option value="BAIK">BAIK</option><option value="CUKUP">CUKUP</option></select>
                                <input className="w-full px-3 py-1.5 bg-white border rounded-lg text-[10px] font-bold" placeholder="Umpan balik..." value={formData.perilaku[key].feedback} onChange={e => { const np = {...formData.perilaku}; np[key].feedback = e.target.value; setFormData({...formData, perilaku: np}) }} />
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                   <div className="pt-10 border-t flex justify-center"><button onClick={handleSaveSKP} className="px-20 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase shadow-2xl hover:bg-blue-700 active:scale-95 transition-all">Terbitkan Dokumen SKP Final</button></div>
                </div>
              )}
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedSKP && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-between items-center no-print bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 sticky top-24 z-50">
              <button onClick={() => setActiveView('table')} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase transition-all"><i className="bi bi-arrow-left"></i> Kembali</button>
              <button onClick={handleDownloadPdf} className="px-10 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl shadow-rose-600/20 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF 8 Halaman</button>
           </div>

           <div ref={pdfRef} className="bg-white mx-auto text-black font-serif print-document overflow-hidden">
              
              {/* PAGE 1: DOKUMEN EVALUASI KINERJA - Dengan Logo Garuda */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm] flex flex-col relative">
                 <PageHeader title="DOKUMEN EVALUASI KINERJA PEGAWAI" subtitle="PERIODE : AKHIR" showLogo={true} />
                 <div className="flex-1 space-y-2">
                    <InfoTable label="1. PEGAWAI YANG DINILAI" p={pegawaiList.find(p=>p.nip===selectedSKP.nip)} />
                    <InfoTable label="2. PEJABAT PENILAI KINERJA" p={selectedSKP.pejabatPenilai} />
                    <InfoTable label="3. ATASAN PEJABAT PENILAI KINERJA" p={selectedSKP.atasanPenilai} />
                    
                    <div className="mb-4">
                       <div className="bg-gray-200 p-1.5 font-bold text-[9pt] border border-black uppercase">4. EVALUASI KINERJA</div>
                       <table className="w-full border-collapse border border-black text-[9pt]">
                          <tbody>
                             <tr><td className="w-48 border border-black p-1.5 font-bold">CAPAIAN KINERJA ORGANISASI</td><td className="border border-black p-1.5">: {selectedSKP.capaianOrganisasi}</td></tr>
                             <tr><td className="border border-black p-1.5 font-bold">PREDIKAT KINERJA PEGAWAI</td><td className="border border-black p-1.5 uppercase font-black text-blue-800">: {selectedSKP.predikatKinerja}</td></tr>
                          </tbody>
                       </table>
                    </div>
                    
                    <div className="mb-4">
                       <div className="bg-gray-200 p-1.5 font-bold text-[9pt] border border-black uppercase">5. CATATAN / REKOMENDASI</div>
                       <div className="border border-black p-4 text-[9pt] min-h-[100px]">{selectedSKP.catatan}</div>
                    </div>
                 </div>
                 <Signatures date={selectedSKP.tglPenilaian} p1={pegawaiList.find(p=>p.nip===selectedSKP.nip)} p2={selectedSKP.pejabatPenilai} />
              </div>

              {/* PAGE 2: LAMPIRAN SASARAN KINERJA - Tanpa Logo */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm] flex flex-col">
                 <PageHeader title="LAMPIRAN SASARAN KINERJA PEGAWAI" showLogo={false} />
                 <div className="flex-1 space-y-8">
                    {['DUKUNGAN SUMBER DAYA', 'SKEMA PERTANGGUNGJAWABAN', 'KONSEKUENSI'].map((sect, idx) => (
                      <div key={idx}>
                         <div className="bg-gray-200 p-1.5 font-bold text-[9pt] border border-black uppercase">{sect}</div>
                         <div className="border border-black p-4 text-[9pt] space-y-2">
                            {(idx===0 ? selectedSKP.dukungan : idx===1 ? selectedSKP.skema : selectedSKP.konsekuensi).map((item, i) => (
                              <div key={i} className="flex gap-2"><span>{i+1}.</span><p>{item}</p></div>
                            ))}
                         </div>
                      </div>
                    ))}
                 </div>
                 <Signatures date={selectedSKP.tglPenilaian} p1={pegawaiList.find(p=>p.nip===selectedSKP.nip)} p2={selectedSKP.pejabatPenilai} />
              </div>

              {/* PAGE 3: SASARAN KINERJA PEGAWAI - Tanpa Logo */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm] flex flex-col">
                 <PageHeader title="SASARAN KINERJA PEGAWAI" subtitle="PENDEKATAN HASIL KERJA KUANTITATIF" showLogo={false} />
                 <div className="grid grid-cols-2 border border-black mb-6 text-[8pt]">
                    <div className="border-r border-black p-2 font-bold bg-gray-50">PEGAWAI YANG DINILAI</div>
                    <div className="p-2 font-bold bg-gray-50">PEJABAT PENILAI KINERJA</div>
                    <div className="border-r border-black p-2">{selectedSKP.namaPegawai}</div>
                    <div className="p-2">{selectedSKP.pejabatPenilai?.nama || '-'}</div>
                 </div>
                 <div className="flex-1 overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-[8pt] text-center">
                       <thead className="bg-gray-200">
                          <tr>
                             <th className="border border-black p-1 w-8">NO</th>
                             <th className="border border-black p-1">RENCANA HASIL KERJA ATASAN</th>
                             <th className="border border-black p-1">RENCANA HASIL KERJA</th>
                             <th className="border border-black p-1 w-16">ASPEK</th>
                             <th className="border border-black p-1">INDIKATOR</th>
                             <th className="border border-black p-1 w-16">TARGET</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr><td colSpan={6} className="border border-black p-1 font-bold bg-100 uppercase text-left">A. UTAMA</td></tr>
                          {selectedSKP.hasilKerja.map((h, i) => (
                            <tr key={i}>
                               <td className="border border-black p-1">{i + 1}</td>
                               <td className="border border-black p-1 text-left">{h.rhkAtasan}</td>
                               <td className="border border-black p-1 text-left">{h.rhk}</td>
                               <td className="border border-black p-1">{h.aspek}</td>
                               <td className="border border-black p-1 text-left">{h.indikator || '-'}</td>
                               <td className="border border-black p-1">{h.target}</td>
                            </tr>
                          ))}
                          <tr><td colSpan={6} className="border border-black p-1 font-bold bg-gray-100 uppercase text-left">B. TAMBAHAN</td></tr>
                          <tr><td colSpan={6} className="border border-black p-1">-</td></tr>
                       </tbody>
                    </table>
                 </div>
              </div>

              {/* PAGE 4: PERILAKU KERJA - Tanpa Logo */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm]">
                 <PageHeader title="PERILAKU KERJA" period={`TAHUN ${selectedSKP.tahun}`} showLogo={false} />
                 <table className="w-full border-collapse border border-black text-[9pt]">
                    <thead className="bg-gray-200">
                       <tr><th className="border border-black p-2 w-12">NO</th><th className="border border-black p-2">ASPEK PERILAKU KERJA</th><th className="border border-black p-2">EKSPETASI KHUSUS PIMPINAN</th></tr>
                    </thead>
                    <tbody>
                       {BERAKHLAK_KEYS.map(({key, label, desc}, i) => (
                         <tr key={key}>
                            <td className="border border-black p-2 text-center align-top font-bold">{i+1}</td>
                            <td className="border border-black p-2">
                               <p className="font-bold uppercase mb-1">{label}</p>
                               <ul className="list-disc ml-5 space-y-0.5 text-[8pt]">
                                  {desc.map((d, di) => <li key={di}>{d}</li>)}
                               </ul>
                            </td>
                            <td className="border border-black p-2 italic text-gray-600 align-top">{selectedSKP.perilakuKerja[key]?.feedback || '-'}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
                 <Signatures date={selectedSKP.tglPenilaian} p1={pegawaiList.find(p=>p.nip===selectedSKP.nip)} p2={selectedSKP.pejabatPenilai} />
              </div>

              {/* PAGE 5 & 6: REKAMAN UMPAN BALIK - Tanpa Logo */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm]">
                 <PageHeader title="REKAMAN INFORMASI UMPAN BALIK BERKELANJUTAN" subtitle="BAGI JABATAN FUNGSIONAL UMUM" showLogo={false} />
                 <div className="mb-4">
                    <div className="bg-gray-100 p-1.5 font-bold text-[8pt] border border-black uppercase mb-0.5">HASIL KERJA</div>
                    <table className="w-full border-collapse border border-black text-[7pt] text-center">
                       <thead className="bg-gray-200">
                          <tr><th className="border border-black p-1 w-8">NO</th><th className="border border-black p-1">RENCANA HASIL KERJA</th><th className="border border-black p-1 w-24">TARGET</th><th className="border border-black p-1 w-24">REALISASI</th><th className="border border-black p-1">UMPAN BALIK BERKELANJUTAN</th></tr>
                       </thead>
                       <tbody>
                          {selectedSKP.hasilKerja.map((h, i) => (
                            <tr key={i}><td className="border border-black p-1">{i+1}</td><td className="border border-black p-1 text-left">{h.rhk}</td><td className="border border-black p-1">{h.target}</td><td className="border border-black p-1">{h.realisasi}</td><td className="border border-black p-1 italic">{h.feedback || '-'}</td></tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <div className="mt-8">
                    <div className="bg-gray-100 p-1.5 font-bold text-[8pt] border border-black uppercase mb-0.5">PERILAKU KERJA</div>
                    <table className="w-full border-collapse border border-black text-[7pt]">
                       <thead className="bg-gray-200"><tr className="text-center"><th className="border border-black p-1 w-8">NO</th><th className="border border-black p-1">ASPEK</th><th className="border border-black p-1">UMPAN BALIK BERKELANJUTAN BERDASARKAN BUKTI DUKUNG</th></tr></thead>
                       <tbody>
                          {BERAKHLAK_KEYS.map(({key, label}, i) => (
                            <tr key={key}><td className="border border-black p-1 text-center font-bold">{i+1}</td><td className="border border-black p-1 font-bold">{label}</td><td className="border border-black p-1 italic">{selectedSKP.perilakuKerja[key]?.feedbackDukung || '-'}</td></tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <Signatures date={selectedSKP.tglPenilaian} p1={pegawaiList.find(p=>p.nip===selectedSKP.nip)} p2={selectedSKP.pejabatPenilai} />
              </div>

              {/* PAGE 7: DISTRIBUSI - Tanpa Logo */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm]">
                 <PageHeader title="EVALUASI KINERJA PEGAWAI" subtitle="PERIODE AKHIR TAHUN" showLogo={false} />
                 <div className="mb-10 p-10 border border-black flex flex-col items-center">
                    <p className="text-[11pt] font-bold uppercase mb-8 underline">POLA DISTRIBUSI KINERJA</p>
                    <div className="w-full h-56 bg-white border-b border-l border-black relative flex items-end px-12">
                        <svg viewBox="0 0 100 50" className="w-full h-full text-blue-900 fill-none overflow-visible">
                           <path d="M0,45 Q50,45 80,10 T100,5" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" />
                           <path d="M0,45 Q50,45 75,15 T100,8" stroke="currentColor" strokeWidth="1" />
                        </svg>
                        <div className="absolute bottom-[-25px] left-0 w-full flex justify-between text-[7pt] font-bold uppercase px-2">
                           <span className="text-center">Sangat<br/>Kurang</span><span className="text-center">Kurang</span><span className="text-center">Butuh<br/>Perbaikan</span><span className="text-center">Baik</span><span className="text-center">Sangat<br/>Baik</span>
                        </div>
                    </div>
                    <div className="mt-12 text-center bg-gray-100 border border-black px-12 py-4">
                       <p className="text-[10pt] font-bold">CAPAIAN KINERJA ORGANISASI :</p>
                       <h3 className="text-2xl font-black">{selectedSKP.capaianOrganisasi}</h3>
                    </div>
                 </div>
              </div>

              {/* PAGE 8: FINAL - Tanpa Logo */}
              <div className="page-break p-[1.5cm] min-h-[29.7cm]">
                 <PageHeader title="EVALUASI KINERJA PEGAWAI (HASIL AKHIR)" showLogo={false} />
                 <div className="space-y-6">
                    <table className="w-full border-collapse border border-black text-[9pt]">
                       <thead className="bg-gray-200">
                          <tr><th className="border border-black p-2 w-12">NO</th><th className="border border-black p-2">ASPEK PERILAKU</th><th className="border border-black p-2 w-32 text-center">RATING</th><th className="border border-black p-2">UMPAN BALIK</th></tr>
                       </thead>
                       <tbody>
                          {BERAKHLAK_KEYS.map(({key, label}, i) => (
                            <tr key={key}>
                               <td className="border border-black p-2 text-center">{i+1}</td>
                               <td className="border border-black p-2 font-bold">{label}</td>
                               <td className="border border-black p-2 text-center font-bold">{selectedSKP.perilakuKerja[key]?.rating || 'BAIK'}</td>
                               <td className="border border-black p-2 italic">{selectedSKP.perilakuKerja[key]?.feedback || '-'}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                    
                    <div className="grid grid-cols-2 gap-8 mt-12">
                       <div className="border border-black p-8 text-center flex flex-col justify-center min-h-[160px]">
                          <p className="text-[9pt] font-bold uppercase mb-3 underline">RATING PERILAKU KERJA</p>
                          <div className="text-[15pt] font-bold leading-tight">DIATAS EKSPETASI</div>
                       </div>
                       <div className="border border-black p-8 text-center bg-gray-100 flex flex-col justify-center min-h-[160px]">
                          <p className="text-[9pt] font-bold uppercase mb-3 underline">PREDIKAT KINERJA PEGAWAI</p>
                          <div className="text-[18pt] font-black leading-tight uppercase">{selectedSKP.predikatKinerja}</div>
                       </div>
                    </div>
                 </div>
                 <Signatures date={selectedSKP.tglPenilaian} p1={pegawaiList.find(p=>p.nip===selectedSKP.nip)} p2={selectedSKP.pejabatPenilai} />
              </div>

           </div>
        </div>
      )}

      <style>{`
        @media print {
           .no-print { display: none !important; }
           body { background: white !important; margin: 0; padding: 0; }
           .print-document { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
           .page-break { 
              page-break-after: always; 
              padding: 1.5cm !important;
              min-height: 29.7cm;
              display: block; 
           }
           @page { size: A4; margin: 0; }
        }
        .print-document {
           width: 21cm;
           background: white;
           font-family: 'Times New Roman', Times, serif;
        }
        .page-break {
           border-bottom: 1px dashed #ccc;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
};

export default SKPPage;