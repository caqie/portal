import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchSKPFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
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
  { poin: 'Berorientasi Pelayanan', deskripsi: 'Memahami dan memenuhi kebutuhan masyarakat; Ramah, cekatan, solutif, dan dapat diandalkan; Melakukan perbaikan tiada henti', ekspektasi: 'Ekspektasi Khusus Pimpinan: Memberikan pelayanan di atas standar dan responsif.', umpanBalik: 'Sangat responsif terhadap keluhan pegawai.' },
  { poin: 'Akuntabel', deskripsi: 'Melaksanakan tugas dengan jujur, bertanggung jawab, cermat, disiplin dan berintegritas tinggi', ekspektasi: 'Ekspektasi Khusus Pimpinan: Disiplin waktu dan integritas terjaga.', umpanBalik: 'Selalu hadir tepat waktu dan laporan akurat.' },
  { poin: 'Kompeten', deskripsi: 'Meningkatkan kompetensi diri untuk menjawab tantangan yang selalu berubah', ekspektasi: 'Ekspektasi Khusus Pimpinan: Aktif dalam pengembangan diri.', umpanBalik: 'Berhasil menyelesaikan sertifikasi teknis tahun ini.' },
  { poin: 'Harmonis', deskripsi: 'Menghargai setiap orang apapun latar belakangnya; Suka menolong orang lain', ekspektasi: 'Ekspektasi Khusus Pimpinan: Membangun suasana kerja yang kondusif.', umpanBalik: 'Menjadi penengah yang baik dalam tim.' },
  { poin: 'Loyal', deskripsi: 'Memegang teguh ideologi Pancasila, UUD 1945, setia kepada NKRI', ekspektasi: 'Ekspektasi Khusus Pimpinan: Menjaga rahasia jabatan dan negara.', umpanBalik: 'Sangat menjaga kerahasiaan data kepegawaian.' },
  { poin: 'Adaptif', deskripsi: 'Cepat menyesuaikan diri menghadapi perubahan; Terus berinovasi', ekspektasi: 'Ekspektasi Khusus Pimpinan: Proaktif dalam digitalisasi layanan.', umpanBalik: 'Berhasil menginisiasi sistem pengarsipan digital.' },
  { poin: 'Kolaboratif', deskripsi: 'Memberi kesempatan kepada berbagai pihak untuk berkontribusi', ekspektasi: 'Ekspektasi Khusus Pimpinan: Aktif bersinergi dengan unit lain.', umpanBalik: 'Kolaborasi yang baik dengan bagian keuangan.' }
];

const getCurveData = (capaian: string) => {
  const raw = (capaian || '').toUpperCase();
  let key = 'BAIK';
  if (raw.includes('ISTIMEWA')) key = 'ISTIMEWA';
  else if (raw.includes('SANGAT KURANG')) key = 'SANGAT_KURANG';
  else if (raw.includes('KURANG')) key = 'KURANG';
  else if (raw.includes('CUKUP') || raw.includes('BUTUH PERBAIKAN')) key = 'CUKUP';
  
  const curves: Record<string, string> = {
    ISTIMEWA: "M 20 130 C 100 130, 200 130, 300 85 C 340 60, 360 20, 380 20 C 390 20, 410 80, 420 130",
    BAIK: "M 20 130 C 80 130, 140 120, 200 100 C 250 80, 280 20, 300 20 C 320 20, 360 85, 380 95 C 395 105, 410 120, 420 130",
    CUKUP: "M 20 130 C 50 130, 100 105, 140 70 C 180 35, 200 20, 220 20 C 240 20, 260 35, 300 70 C 340 105, 390 130, 420 130",
    KURANG: "M 20 130 C 30 120, 45 105, 60 95 C 80 85, 120 20, 140 20 C 160 20, 190 80, 220 85 C 280 100, 340 125, 420 130",
    SANGAT_KURANG: "M 20 130 C 30 80, 50 20, 60 20 C 80 20, 100 60, 140 80 C 200 115, 300 130, 420 130"
  };

  const curvePoints: Record<string, { x: number; y: number }[]> = {
    ISTIMEWA: [
      { x: 60, y: 128 },
      { x: 140, y: 125 },
      { x: 220, y: 115 },
      { x: 300, y: 80 },
      { x: 380, y: 20 }
    ],
    BAIK: [
      { x: 60, y: 128 },
      { x: 140, y: 120 },
      { x: 220, y: 85 },
      { x: 300, y: 20 },
      { x: 380, y: 95 }
    ],
    CUKUP: [
      { x: 60, y: 118 },
      { x: 140, y: 70 },
      { x: 220, y: 20 },
      { x: 300, y: 70 },
      { x: 380, y: 118 }
    ],
    KURANG: [
      { x: 60, y: 95 },
      { x: 140, y: 20 },
      { x: 220, y: 85 },
      { x: 300, y: 120 },
      { x: 380, y: 128 }
    ],
    SANGAT_KURANG: [
      { x: 60, y: 20 },
      { x: 140, y: 80 },
      { x: 220, y: 115 },
      { x: 300, y: 125 },
      { x: 380, y: 128 }
    ]
  };

  return {
    key,
    dPath: curves[key],
    fillPath: curves[key] + " L 420 130 L 20 130 Z",
    points: curvePoints[key]
  };
};

const renderCurve = (capaian: string) => {
  const { key, dPath, fillPath, points } = getCurveData(capaian);
  const gradId = `curveGrad-${key}`;
  return (
    <svg width="100%" viewBox="0 0 440 180" className="mx-auto" style={{ maxWidth: '440px' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Horizontal Baseline */}
      <line x1="20" y1="130" x2="420" y2="130" stroke="#000" strokeWidth="2" />
      
      {/* Fill Under Curve */}
      <path d={fillPath} fill={`url(#${gradId})`} />
      
      {/* Main Curve Line */}
      <path d={dPath} fill="none" stroke="#2563eb" strokeWidth="3" />

      {/* Projection Dashed Lines and Points */}
      {points.map((p, idx) => {
        const isPeak = (key === 'ISTIMEWA' && idx === 4) ||
                       (key === 'BAIK' && idx === 3) ||
                       (key === 'CUKUP' && idx === 2) ||
                       (key === 'KURANG' && idx === 1) ||
                       (key === 'SANGAT_KURANG' && idx === 0);
        return (
          <g key={idx}>
            {/* Vertical dashed line */}
            <line x1={p.x} y1="130" x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
            {/* Point dot */}
            <circle cx={p.x} cy={p.y} r={isPeak ? "6" : "4"} fill={isPeak ? "#ef4444" : "#3b82f6"} stroke="#fff" strokeWidth="1.5" />
            {/* Mini tag for peak */}
            {isPeak && (
              <g>
                <rect x={p.x - 20} y={p.y - 18} width="40" height="12" rx="3" fill="#ef4444" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="6px" fill="#fff" fontWeight="bold">PUNCAK</text>
              </g>
            )}
          </g>
        );
      })}

      {/* X-Axis labels */}
      <text x="60" y="145" textAnchor="middle" fontSize="7px" fontWeight="bold" fill="#334155">Sangat Kurang</text>
      <text x="140" y="145" textAnchor="middle" fontSize="7px" fontWeight="bold" fill="#334155">Kurang</text>
      <text x="220" y="145" textAnchor="middle" fontSize="7px" fontWeight="bold" fill="#334155">Butuh Perbaikan</text>
      <text x="300" y="145" textAnchor="middle" fontSize="7px" fontWeight="bold" fill="#334155">Baik</text>
      <text x="380" y="145" textAnchor="middle" fontSize="7px" fontWeight="bold" fill="#334155">Sangat Baik</text>

      {/* X Axis Legend */}
      <text x="220" y="165" textAnchor="middle" fontSize="9px" fontWeight="800" fill="#0f172a" letterSpacing="1">PREDIKAT KINERJA INDIVIDU PEGAWAI</text>
    </svg>
  );
};

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
  const [showGuide, setShowGuide] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const calculatePredikatKinerja = (hasil: string, perilaku: string) => {
    const h = (hasil || '').toUpperCase();
    const p = (perilaku || '').toUpperCase();
    
    if (h === 'DI ATAS EKSPEKTASI') {
      if (p === 'DI ATAS EKSPEKTASI') return 'SANGAT BAIK';
      if (p === 'SESUAI EKSPEKTASI') return 'BAIK';
      if (p === 'DI BAWAH EKSPEKTASI') return 'KURANG / MISCONDUCT';
    } else if (h === 'SESUAI EKSPEKTASI') {
      if (p === 'DI ATAS EKSPEKTASI') return 'BAIK';
      if (p === 'SESUAI EKSPEKTASI') return 'BAIK';
      if (p === 'DI BAWAH EKSPEKTASI') return 'KURANG / MISCONDUCT';
    } else if (h === 'DI BAWAH EKSPEKTASI') {
      if (p === 'DI ATAS EKSPEKTASI') return 'BUTUH PERBAIKAN';
      if (p === 'SESUAI EKSPEKTASI') return 'BUTUH PERBAIKAN';
      if (p === 'DI BAWAH EKSPEKTASI') return 'SANGAT KURANG';
    }
    return 'BAIK';
  };

  const getPredikatBadgeStyle = (predikat: string) => {
    const p = (predikat || '').toUpperCase();
    if (p === 'SANGAT BAIK') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (p === 'BAIK') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (p.includes('BUTUH PERBAIKAN')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (p.includes('KURANG') && p.includes('MISCONDUCT')) return 'bg-orange-50 text-orange-750 border-orange-200';
    if (p === 'SANGAT KURANG') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

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
      { rencanaPimpinan: 'Terwujudnya pengelolaan administrasi dan layanan kepegawaian yang tertib, akurat, dan sesuai ketentuan', rencanaPegawai: 'Terlaksananya pelayanan administrasi kepegawaian di lingkungan DJKI', aspek: 'Kualitas', indikator: 'Persentase layanan administrasi kepegawaian yang diselesaikan', target: '100%', realisasi: '100%', umpanBalik: 'Sangat Baik' }
    ],
    perilakuKerja: INITIAL_PERILAKU,
    lampiran: {
      dukunganSumberDaya: '1. Dukungan sarana prasarana berupa perangkat komputer dan akses database kepegawaian.\n2. Bimbingan teknis terkait regulasi terbaru.',
      skemaPertanggungjawaban: '1. Laporan berkala setiap bulan.\n2. Bukti dokumen (E-Dossier).',
      konsekuensi: '1. Penghargaan berupa usulan kenaikan pangkat tepat waktu bila memenuhi target.\n2. Teguran lisan dan bimbingan khusus bila target tidak tercapai.'
    }
  });

  useEffect(() => { loadInitialData(); }, []);

  const calculatedPredikat = useMemo(() => {
    return calculatePredikatKinerja(formData.ratingHasilKerja, formData.ratingPerilaku);
  }, [formData.ratingHasilKerja, formData.ratingPerilaku]);

  useEffect(() => {
    if (formData.predikatKinerja !== calculatedPredikat) {
      setFormData((prev: any) => ({ ...prev, predikatKinerja: calculatedPredikat }));
    }
  }, [calculatedPredikat]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([fetchPegawaiFromSheets(), fetchSKPFromSheets()]);
      setPegawaiList(pRes);
      setSkpList(sRes as any || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const searchableOptions = useMemo(() => pegawaiList.map(p => ({
    value: p.nip,
    label: p.nama,
    subLabel: `NIP. ${p.nip} - ${p.jabatan}`
  })), [pegawaiList]);

  const addHasilKerja = () => {
    setFormData({
      ...formData,
      hasilKerja: [...formData.hasilKerja, { rencanaPimpinan: '', rencanaPegawai: '', aspek: 'Kualitas', indikator: '', target: '', realisasi: '', umpanBalik: '' }]
    });
  };

  const removeHasilKerja = (index: number) => {
    const newList = [...formData.hasilKerja];
    newList.splice(index, 1);
    setFormData({ ...formData, hasilKerja: newList });
  };

  const handleHasilKerjaChange = (index: number, field: string, value: string) => {
    const newList = [...formData.hasilKerja];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, hasilKerja: newList });
  };

  const handlePerilakuChange = (index: number, field: string, value: string) => {
    const newList = [...formData.perilakuKerja];
    newList[index] = { ...newList[index], [field]: value };
    setFormData({ ...formData, perilakuKerja: newList });
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.penilaiNip) return alert("Mohon lengkapi data subjek dan penilai");
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
        logActivity(formData.id ? 'UPDATE' : 'CREATE', 'SKP', `Terbitkan SKP: ${payload.namaPegawai}`);
      }
    } catch (e) { alert("Gagal menyimpan ke database cloud."); } finally { setSyncing(false); }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`SKP_${formData.namaPegawai?.replace(/\s+/g, '_')}_${formData.tahun}.pdf`);
    } catch (e) {
      alert("Gagal cetak PDF.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveToDossier = async () => {
    if (!pdfRef.current || !formData.nip) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      const pdfBase64 = pdf.output('datauristring');
      
      const fileName = `SKP_${formData.namaPegawai?.replace(/\s+/g, '_')}_${formData.tahun}_${Date.now()}.pdf`;
      const res = await uploadFileToDrive(fileName, 'application/pdf', pdfBase64);
      
      if (res.success && res.fileUrl) {
        const payload = {
          id: `DOS-${Date.now()}`,
          nip: formData.nip,
          namaPegawai: formData.namaPegawai,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: `Dokumen Hasil Evaluasi Kinerja (SKP) Tahun ${formData.tahun}`,
          fileName: fileName,
          fileUrl: res.fileUrl
        };
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          logActivity('CREATE', 'DOSSIER', `Simpan SKP ke Dossier: ${formData.namaPegawai}`);
          alert("Dokumen SKP berhasil disimpan ke E-Dossier Pegawai.");
        }
      } else {
        alert("Gagal mengunggah file ke Drive.");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan ke Dossier.");
    } finally {
      setSyncing(false);
    }
  };

  const activeRecord = selectedSKP || formData;
  const pSubjek = pegawaiList.find(p => p.nip === activeRecord.nip);
  const pPenilai = pegawaiList.find(p => p.nip === activeRecord.penilaiNip);
  const pAtasan = pegawaiList.find(p => p.nip === activeRecord.atasanPenilaiNip);

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-gray-100 border border-black p-1 text-[9pt] font-bold uppercase text-center">{title}</div>
  );

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="SKP Diterbitkan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if(!itemToDelete) return;
         setSyncing(true);
         const ok = await syncTableRemote('SKP', 'DELETE', { 
           id: itemToDelete.id, 
           nip: itemToDelete.nip,
           nama: itemToDelete.namaPegawai
         });
         if(ok) { setSkpList(prev => prev.filter(s => s.id !== itemToDelete.id)); setIsConfirmOpen(false); }
         setSyncing(false);
      }} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'table' ? navigate('/layanan') : setActiveView('table')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">E-Kinerja SKP Generator</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
               <i className="bi bi-patch-check-fill text-blue-600"></i> Standar Permenpan RB 6/2022
            </p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('table')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Arsip SKP</button>
           {canEdit && <button onClick={() => { setFormData({...formData, id: undefined, hasilKerja: [formData.hasilKerja[0]]}); setActiveView('editor'); setEditorStep('identitas'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>Buat SKP Baru</button>}
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
                       <td className="px-4 py-5 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${getPredikatBadgeStyle(s.predikatKinerja)}`}>{s.predikatKinerja}</span>
                       </td>
                       <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button onClick={() => { setSelectedSKP(s); setActiveView('preview'); }} className="h-9 px-6 rounded-xl bg-gray-950 text-white text-[9px] font-black uppercase shadow-lg">Lihat Dokumen</button>
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

              <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
                 {editorStep === 'identitas' && (
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                      <div className="space-y-6">
                         <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Data Subjek & Penilai</h5>
                         <SearchableSelect label="Pegawai Yang Dinilai" options={searchableOptions} value={formData.nip} onChange={v => {
                            const p = pegawaiList.find(x => x.nip === v);
                            if(p) setFormData({...formData, nip: v, namaPegawai: p.nama});
                         }} />
                         <div className="grid grid-cols-2 gap-4">
                            <SearchableSelect label="Pejabat Penilai" options={searchableOptions} value={formData.penilaiNip} onChange={v => setFormData({...formData, penilaiNip: v})} />
                            <SearchableSelect label="Atasan Penilai" options={searchableOptions} value={formData.atasanPenilaiNip} onChange={v => setFormData({...formData, atasanPenilaiNip: v})} />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Tahun</label><input type="number" className={inputClass} value={formData.tahun} onChange={e=>setFormData({...formData, tahun: parseInt(e.target.value)})} /></div>
                            <div><label className={labelClass}>Tanggal Cetak</label><input type="text" className={inputClass} value={formData.tglPenilaian} onChange={e=>setFormData({...formData, tglPenilaian: e.target.value})} /></div>
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="flex justify-between items-center border-b pb-3 mb-4">
                            <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                               <i className="bi bi-star-fill text-rose-500 animate-pulse"></i> B. Rating Kinerja Akhir (Permen PANRB 6/2022)
                            </h5>
                            <button type="button" onClick={() => setShowGuide(true)} className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                               <i className="bi bi-book"></i> Panduan &amp; Matriks
                            </button>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            
                            {/* Capaian Organisasi */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                               <label className={labelClass}>Capaian Organisasi</label>
                               <select className={`${inputClass} bg-white shadow-sm border-gray-200`} value={formData.capaianOrganisasi} onChange={e=>setFormData({...formData, capaianOrganisasi: e.target.value})}>
                                  <option>BAIK</option>
                                  <option>ISTIMEWA</option>
                                  <option>CUKUP / BUTUH PERBAIKAN</option>
                                  <option>KURANG</option>
                                  <option>SANGAT KURANG</option>
                               </select>
                               <div className="text-[9.5px] font-semibold leading-relaxed p-2.5 rounded-xl bg-white border border-slate-100 text-gray-500">
                                  {formData.capaianOrganisasi === 'ISTIMEWA' && "✓ Melampaui target & trajectory yang ditetapkan pimpinan (Sangat memuaskan)."}
                                  {formData.capaianOrganisasi === 'BAIK' && "✓ Hasil kerja tepat sasaran, memenuhi target, & sesuai standar kualitas."}
                                  {formData.capaianOrganisasi?.includes('CUKUP') && "✓ Menunjukkan progres positif namun masih butuh bimbingan & perbaikan."}
                                  {formData.capaianOrganisasi === 'KURANG' && "✓ Sebagian sasaran strategis tidak terpenihu atau di bawah standar."}
                                  {formData.capaianOrganisasi === 'SANGAT KURANG' && "✓ Realisasi kerja sangat jauh di bawah target (Critical gap)."}
                               </div>
                            </div>

                            {/* Rating Hasil Kerja */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                               <label className={labelClass}>Rating Hasil Kerja</label>
                               <select className={`${inputClass} bg-white shadow-sm border-gray-200`} value={formData.ratingHasilKerja} onChange={e=>setFormData({...formData, ratingHasilKerja: e.target.value})}>
                                  <option>SESUAI EKSPEKTASI</option>
                                  <option>DI ATAS EKSPEKTASI</option>
                                  <option>DI BAWAH EKSPEKTASI</option>
                               </select>
                               <div className="text-[9.5px] font-semibold leading-relaxed p-2.5 rounded-xl bg-white border border-slate-100 text-gray-500 font-semibold">
                                  {formData.ratingHasilKerja === 'DI ATAS EKSPEKTASI' && "Seluruh hasil kerja di atas ekspektasi & tidak ada hasil utama di bawah ekspektasi. Umpan balik pimpinan positif."}
                                  {formData.ratingHasilKerja === 'SESUAI EKSPEKTASI' && "Sebagian besar hasil kerja sesuai target, hanya sebagian sangat kecil hasil utama di bawah ekspektasi."}
                                  {formData.ratingHasilKerja === 'DI BAWAH EKSPEKTASI' && "Sebagian besar/seluruh hasil kerja tidak memenuhi standar yang ditentukan pimpinan."}
                                </div>
                            </div>

                            {/* Rating Perilaku */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                               <label className={labelClass}>Rating Perilaku Kerja</label>
                               <select className={`${inputClass} bg-white shadow-sm border-gray-200`} value={formData.ratingPerilaku} onChange={e=>setFormData({...formData, ratingPerilaku: e.target.value})}>
                                  <option>SESUAI EKSPEKTASI</option>
                                  <option>DI ATAS EKSPEKTASI</option>
                                  <option>DI BAWAH EKSPEKTASI</option>
                               </select>
                               <div className="text-[9.5px] font-semibold leading-relaxed p-2.5 rounded-xl bg-white border border-slate-100 text-gray-500 font-semibold">
                                  {formData.ratingPerilaku === 'DI ATAS EKSPEKTASI' && "Konsisten mendemonstrasikan nilai BerAKHLAK & menjadi penggerak/role model di lingkungan kerja."}
                                  {formData.ratingPerilaku === 'SESUAI EKSPEKTASI' && "Konsisten running nilai dasar ASN BerAKHLAK untuk diri pribadi secara penuh."}
                                  {formData.ratingPerilaku === 'DI BAWAH EKSPEKTASI' && "Belum secara konsisten mendemonstrasikan asas dasar perilaku BerAKHLAK, butuh perbaikan."}
                                </div>
                            </div>

                            {/* Predikat Kinerja */}
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-2">
                               <div className="flex justify-between items-center">
                                  <label className="text-[9px] font-black text-blue-800 uppercase tracking-widest pl-3 block mb-1">Predikat Kinerja</label>
                                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/30 px-2 py-0.5 rounded border border-blue-200/50">TERHITUNG OTOMATIS</span>
                               </div>
                               <div className="relative">
                                  <input 
                                     type="text" 
                                     readOnly 
                                     className={`${inputClass} bg-white border-blue-200 text-blue-900 border font-extrabold text-[11px] uppercase shadow-inner block pr-12`}
                                     value={formData.predikatKinerja} 
                                  />
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                     <i className="bi bi-cpu-fill text-blue-500 text-sm animate-pulse"></i>
                                  </div>
                               </div>
                               <div className="text-[9.5px] font-semibold leading-relaxed p-2.5 rounded-xl bg-white border border-blue-100/50 text-blue-950/80">
                                  <span>Matriks Persilangan Regulasi:</span>
                                  <p className="font-extrabold mt-1 text-[10px] text-blue-700 font-semibold">
                                     Hasil Kerja ({formData.ratingHasilKerja}) + Perilaku ({formData.ratingPerilaku}) ➔ {formData.predikatKinerja}
                                  </p>
                                </div>
                             </div>

                         </div>
                      </div>
                   </div>
                 )}

                 {editorStep === 'hasil_kerja' && (
                   <div className="space-y-8 animate-fadeIn">
                      <div className="flex justify-between items-center border-b pb-4">
                         <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Rencana Hasil Kerja & Evaluasi</h5>
                         <button onClick={addHasilKerja} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">+ Tambah RHK</button>
                      </div>
                      <div className="space-y-6">
                         {formData.hasilKerja.map((row: any, i: number) => (
                           <div key={i} className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 relative group/row">
                              <button onClick={() => removeHasilKerja(i)} className="absolute top-4 right-4 h-8 w-8 bg-rose-50 text-rose-500 rounded-lg opacity-0 group-hover/row:opacity-100 transition-all"><i className="bi bi-trash-fill"></i></button>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                 <div className="space-y-4">
                                    <div><label className={labelClass}>RHK Atasan (Intervensi)</label><textarea rows={2} className={`${inputClass} resize-none normal-case`} value={row.rencanaPimpinan} onChange={e=>handleHasilKerjaChange(i, 'rencanaPimpinan', e.target.value)} /></div>
                                    <div><label className={labelClass}>RHK Pegawai</label><textarea rows={2} className={`${inputClass} resize-none normal-case`} value={row.rencanaPegawai} onChange={e=>handleHasilKerjaChange(i, 'rencanaPegawai', e.target.value)} /></div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelClass}>Aspek</label><select className={inputClass} value={row.aspek} onChange={e=>handleHasilKerjaChange(i, 'aspek', e.target.value)}><option>Kualitas</option><option>Kuantitas</option><option>Waktu</option><option>Biaya</option></select></div>
                                    <div><label className={labelClass}>Target</label><input className={inputClass} value={row.target} onChange={e=>handleHasilKerjaChange(i, 'target', e.target.value)} /></div>
                                    <div className="col-span-full"><label className={labelClass}>Indikator Kinerja Individu</label><input className={inputClass} value={row.indikator} onChange={e=>handleHasilKerjaChange(i, 'indikator', e.target.value)} /></div>
                                    <div><label className={labelClass}>Realisasi</label><input className={inputClass} value={row.realisasi} onChange={e=>handleHasilKerjaChange(i, 'realisasi', e.target.value)} /></div>
                                    <div><label className={labelClass}>Umpan Balik (Feedback)</label><input className={inputClass} value={row.umpanBalik} onChange={e=>handleHasilKerjaChange(i, 'umpanBalik', e.target.value)} /></div>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}

                 {editorStep === 'perilaku' && (
                    <div className="space-y-6 animate-fadeIn">
                       <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">Perilaku Kerja (Core Values BerAKHLAK)</h5>
                       <div className="grid grid-cols-1 gap-4">
                          {formData.perilakuKerja.map((p: any, i: number) => (
                             <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 grid grid-cols-12 gap-6 items-center">
                                <div className="col-span-3">
                                   <p className="text-[11px] font-black text-gray-900 uppercase">{p.poin}</p>
                                </div>
                                <div className="col-span-4">
                                   <label className={labelClass}>Ekspektasi Khusus</label>
                                   <textarea rows={2} className={`${inputClass} resize-none text-[10px] normal-case`} value={p.ekspektasi} onChange={e=>handlePerilakuChange(i, 'ekspektasi', e.target.value)} />
                                </div>
                                <div className="col-span-5">
                                   <label className={labelClass}>Feedback Pimpinan</label>
                                   <textarea rows={2} className={`${inputClass} resize-none text-[10px] normal-case`} value={p.umpanBalik} onChange={e=>handlePerilakuChange(i, 'umpanBalik', e.target.value)} />
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {editorStep === 'lampiran' && (
                    <div className="space-y-8 animate-fadeIn max-w-4xl">
                       <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">Lampiran SKP (Opsional)</h5>
                       <div className="space-y-6">
                          <div><label className={labelClass}>Dukungan Sumber Daya</label><textarea rows={4} className={`${inputClass} resize-none normal-case`} value={formData.lampiran.dukunganSumberDaya} onChange={e=>setFormData({...formData, lampiran: {...formData.lampiran, dukunganSumberDaya: e.target.value}})} /></div>
                          <div><label className={labelClass}>Skema Pertanggungjawaban</label><textarea rows={4} className={`${inputClass} resize-none normal-case`} value={formData.lampiran.skemaPertanggungjawaban} onChange={e=>setFormData({...formData, lampiran: {...formData.lampiran, skemaPertanggungjawaban: e.target.value}})} /></div>
                          <div><label className={labelClass}>Konsekuensi</label><textarea rows={4} className={`${inputClass} resize-none normal-case`} value={formData.lampiran.konsekuensi} onChange={e=>setFormData({...formData, lampiran: {...formData.lampiran, konsekuensi: e.target.value}})} /></div>
                       </div>
                    </div>
                 )}
              </div>

              <div className="p-10 bg-gray-50 border-t flex justify-center shrink-0">
                 <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Simpan & Lihat Hasil</button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
         <div className="animate-fadeIn space-y-10">
            <div className="flex justify-end gap-3 no-print px-6">
               <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Kembali</button>
               {canEdit && (
                 <button onClick={handleSaveToDossier} disabled={syncing} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                   {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-folder-fill"></i>} Simpan ke Dossier
                 </button>
               )}
               {canEdit && (
                 <button onClick={handleSave} disabled={syncing} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                   {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-arrow-up-fill"></i>} Simpan
                 </button>
               )}
               <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (5 Hal)</button>
            </div>
            
            <div className="bg-gray-300 py-10 flex flex-col items-center gap-10 overflow-x-auto no-scrollbar">
               <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_1.5cm] font-arial text-black space-y-20" style={{ width: '210mm' }}>
                  
                  {/* HALAMAN 1: SAMPUL/EVALUASI */}
                  <div className="min-h-[267mm] flex flex-col">
                     <div className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 text-center">
                        <p className="text-[12pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                        <div className="h-1 bg-black w-full my-2"></div>
                        <p className="text-[13pt] font-bold uppercase mt-6 underline leading-tight">DOKUMEN EVALUASI KINERJA PEGAWAI</p>
                        <p className="text-[11pt] font-bold uppercase leading-tight">PERIODE: {activeRecord.periodeMulai} S.D {activeRecord.periodeSelesai}</p>
                     </div>

                     <div className="space-y-8">
                        <div>
                           <SectionHeader title="1. IDENTITAS PEGAWAI" />
                           <table className="w-full border-collapse border border-black text-[9pt]">
                              <tbody>
                                 <tr className="border border-black">
                                    <td className="w-10 p-2 border-r border-black text-center">1</td>
                                    <td className="w-48 p-2 border-r border-black">Nama</td>
                                    <td className="p-2 font-bold uppercase">{pSubjek?.nama || '-'}</td>
                                 </tr>
                                 <tr className="border border-black">
                                    <td className="p-2 border-r border-black text-center">2</td>
                                    <td className="p-2 border-r border-black">NIP</td>
                                    <td className="p-2">{activeRecord.nip}</td>
                                 </tr>
                                 <tr className="border border-black">
                                    <td className="p-2 border-r border-black text-center">3</td>
                                    <td className="p-2 border-r border-black">Pangkat/Gol</td>
                                    <td className="p-2 uppercase">{pSubjek?.pangkat} ({pSubjek?.golRuang})</td>
                                 </tr>
                                 <tr className="border border-black">
                                    <td className="p-2 border-r border-black text-center">4</td>
                                    <td className="p-2 border-r border-black">Jabatan</td>
                                    <td className="p-2 uppercase">{pSubjek?.jabatan}</td>
                                 </tr>
                                 <tr className="border border-black">
                                    <td className="p-2 border-r border-black text-center">5</td>
                                    <td className="p-2 border-r border-black">Unit Kerja</td>
                                    <td className="p-2 uppercase">{pSubjek?.unitKerja}</td>
                                 </tr>
                              </tbody>
                           </table>
                        </div>

                        <div>
                           <SectionHeader title="2. PEJABAT PENILAI KINERJA" />
                           <table className="w-full border-collapse border border-black text-[9pt]">
                              <tbody>
                                 <tr className="border border-black"><td className="w-10 p-2 border-r border-black text-center">1</td><td className="w-48 p-2 border-r border-black">Nama</td><td className="p-2 font-bold uppercase">{pPenilai?.nama || '-'}</td></tr>
                                 <tr className="border border-black"><td className="p-2 border-r border-black text-center">2</td><td className="p-2 border-r border-black">NIP</td><td className="p-2">{activeRecord.penilaiNip}</td></tr>
                                 <tr className="border border-black"><td className="p-2 border-r border-black text-center">3</td><td className="p-2 border-r border-black">Jabatan</td><td className="p-2 uppercase">{pPenilai?.jabatan}</td></tr>
                              </tbody>
                           </table>
                        </div>

                        <div>
                           <SectionHeader title="3. ATASAN PEJABAT PENILAI KINERJA" />
                           <table className="w-full border-collapse border border-black text-[9pt] mb-6">
                              <tbody>
                                 <tr className="border border-black"><td className="w-10 p-2 border-r border-black text-center">1</td><td className="w-48 p-2 border-r border-black">Nama</td><td className="p-2 font-bold uppercase">{pAtasan?.nama || '-'}</td></tr>
                                 <tr className="border border-black"><td className="w-10 p-2 border-r border-black text-center">2</td><td className="p-2 border-r border-black">NIP</td><td className="p-2">{activeRecord.atasanPenilaiNip || '-'}</td></tr>
                                 <tr className="border border-black"><td className="w-10 p-2 border-r border-black text-center">3</td><td className="p-2 border-r border-black">Jabatan</td><td className="p-2 uppercase">{pAtasan?.jabatan || '-'}</td></tr>
                              </tbody>
                           </table>
                        </div>

                        <div>
                           <SectionHeader title="4. HASIL EVALUASI KINERJA" />
                           <div className="border border-black p-6 space-y-4">
                              <div className="flex justify-between items-center">
                                 <span className="text-[10pt] font-bold">A. CAPAIAN KINERJA ORGANISASI</span>
                                 <span className="px-6 py-2 bg-gray-100 border border-black text-[12pt] font-black">{activeRecord.capaianOrganisasi}</span>
                              </div>
                              <div className="border border-black p-4 flex flex-col items-center bg-gray-50/20 rounded-xl space-y-2">
                                 <p className="text-[8.5pt] font-black tracking-widest uppercase text-center text-gray-700">POLA DISTRIBUSI PENILAIAN KINERJA PEGAWAI (ORGANISASI {activeRecord.capaianOrganisasi})</p>
                                 <div className="w-full bg-white border border-gray-200/50 p-2 rounded-lg">
                                    {renderCurve(activeRecord.capaianOrganisasi)}
                                 </div>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-[10pt] font-bold">B. RATING HASIL KERJA</span>
                                 <span className="px-6 py-2 bg-gray-100 border border-black text-[10pt] font-black">{activeRecord.ratingHasilKerja}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-[10pt] font-bold">C. RATING PERILAKU KERJA</span>
                                 <span className="px-6 py-2 bg-gray-100 border border-black text-[10pt] font-black">{activeRecord.ratingPerilaku}</span>
                              </div>
                              <div className="mt-8 pt-8 border-t-2 border-black flex flex-col items-center">
                                 <p className="text-[11pt] font-bold mb-2">PREDIKAT KINERJA PEGAWAI</p>
                                 <p className="text-[24pt] font-black underline">{activeRecord.predikatKinerja}</p>
                              </div>
                           </div>
                        </div>

                        <div className="mt-auto grid grid-cols-2 text-[10pt] text-center pt-20">
                           <div className="flex flex-col items-center">
                              <p className="mb-24 uppercase">Pegawai yang Dinilai,</p>
                              <p className="font-bold uppercase underline leading-none">{pSubjek?.nama}</p>
                              <p className="mt-1">NIP {activeRecord.nip}</p>
                           </div>
                           <div className="flex flex-col items-center">
                              <p className="mb-4">Jakarta, {activeRecord.tglPenilaian}</p>
                              <p className="mb-24 uppercase">Pejabat Penilai Kinerja,</p>
                              <p className="font-bold uppercase underline leading-none">{pPenilai?.nama}</p>
                              <p className="mt-1">NIP {activeRecord.penilaiNip}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* HALAMAN 2: TABEL HASIL KERJA */}
                  <div className="min-h-[267mm]">
                     <div className="text-center font-bold text-[12pt] underline mb-8 uppercase">RENCANA HASIL KERJA DAN EVALUASI</div>
                     <table className="w-full border-collapse border-2 border-black text-[8pt]">
                        <thead className="bg-gray-100 text-center font-bold">
                           <tr className="border-b-2 border-black">
                              <th className="p-2 border-r border-black w-8">NO</th>
                              <th className="p-2 border-r border-black w-40">RENCANA HASIL KERJA ATASAN</th>
                              <th className="p-2 border-r border-black w-40">RENCANA HASIL KERJA</th>
                              <th className="p-2 border-r border-black w-16">ASPEK</th>
                              <th className="p-2 border-r border-black">INDIKATOR & TARGET</th>
                              <th className="p-2 border-r border-black">REALISASI</th>
                              <th className="p-2">FEEDBACK</th>
                           </tr>
                        </thead>
                        <tbody>
                           {activeRecord.hasilKerja.map((rhk: any, idx: number) => (
                              <tr key={idx} className="border-b border-black align-top">
                                 <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                                 <td className="p-2 border-r border-black">{rhk.rencanaPimpinan}</td>
                                 <td className="p-2 border-r border-black font-bold">{rhk.rencanaPegawai}</td>
                                 <td className="p-2 border-r border-black text-center">{rhk.aspek}</td>
                                 <td className="p-2 border-r border-black">
                                    <p className="italic mb-1">{rhk.indikator}</p>
                                    <p className="font-bold">Target: {rhk.target}</p>
                                 </td>
                                 <td className="p-2 border-r border-black text-center font-bold">{rhk.realisasi}</td>
                                 <td className="p-2 italic">{rhk.umpanBalik}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* HALAMAN 3: PERILAKU KERJA */}
                  <div className="min-h-[267mm]">
                     <div className="text-center font-bold text-[12pt] underline mb-8 uppercase">PERILAKU KERJA DAN FEEDBACK</div>
                     <table className="w-full border-collapse border-2 border-black text-[8.5pt]">
                        <thead className="bg-gray-100 text-center font-bold">
                           <tr className="border-b-2 border-black">
                              <th className="p-2 border-r border-black w-8">NO</th>
                              <th className="p-2 border-r border-black w-48">PERILAKU KERJA / CORE VALUES</th>
                              <th className="p-2 border-r border-black">EKSPEKTASI KHUSUS PIMPINAN</th>
                              <th className="p-2">UMPAN BALIK (FEEDBACK)</th>
                           </tr>
                        </thead>
                        <tbody>
                           {activeRecord.perilakuKerja.map((p: any, idx: number) => (
                              <tr key={idx} className="border-b border-black align-top">
                                 <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                                 <td className="p-2 border-r border-black">
                                    <p className="font-bold uppercase mb-1">{p.poin}</p>
                                    <p className="text-[7.5pt] text-gray-600 leading-tight">{p.deskripsi}</p>
                                 </td>
                                 <td className="p-2 border-r border-black">{p.ekspektasi}</td>
                                 <td className="p-2 italic">{p.umpanBalik}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* HALAMAN 4: LAMPIRAN */}
                  <div className="min-h-[267mm]">
                     <div className="text-center font-bold text-[12pt] underline mb-8 uppercase">LAMPIRAN SASARAN KINERJA PEGAWAI</div>
                     <div className="space-y-8 text-[10pt]">
                        <div>
                           <p className="font-bold mb-2">I. DUKUNGAN SUMBER DAYA</p>
                           <div className="p-4 border border-black whitespace-pre-wrap">{activeRecord.lampiran?.dukunganSumberDaya}</div>
                        </div>
                        <div>
                           <p className="font-bold mb-2">II. SKEMA PERTANGGUNGJAWABAN</p>
                           <div className="p-4 border border-black whitespace-pre-wrap">{activeRecord.lampiran?.skemaPertanggungjawaban}</div>
                        </div>
                        <div>
                           <p className="font-bold mb-2">III. KONSEKUENSI</p>
                           <div className="p-4 border border-black whitespace-pre-wrap">{activeRecord.lampiran?.konsekuensi}</div>
                        </div>
                     </div>
                  </div>

               </div>
            </div>
         </div>
      )}
       {/* PANDUAN & MATRIKS MODAL */}
       {showGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn no-print text-black">
             <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-modalEnter">
                
                {/* Modal Header */}
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                         <i className="bi bi-book-half text-lg animate-bounce"></i>
                      </div>
                      <div className="text-left">
                         <h4 className="text-xs font-black text-gray-900 uppercase">Panduan &amp; Matriks Penilaian Kinerja</h4>
                         <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Permen PANRB Nomor 6 Tahun 2022</p>
                      </div>
                   </div>
                   <button onClick={() => setShowGuide(false)} className="h-10 w-10 text-gray-400 hover:text-gray-950 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:shadow-sm transition-all">
                      <i className="bi bi-x-lg text-sm"></i>
                   </button>
                </div>

                {/* Modal Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1 text-left">
                   
                   {/* 1. Rumus SKP Category */}
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                         <span className="h-2 w-2 bg-blue-600 rounded-full"></span> 1. Klasifikasi Penilaian SKP
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold">
                         <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/20 space-y-1">
                            <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest block">DI ATAS EKSPEKTASI</span>
                            <div className="text-[11px] font-black text-blue-950 mt-1">Nilai SKP &gt; 100 Poin</div>
                            <p className="text-[9.5px] leading-relaxed text-blue-900/80 font-medium pt-1">Sebagian besar atau seluruh hasil kerja Anda melampaui target yang ditetapkan, serta memberikan dampak tambahan yang positif bagi unit kerja atau instansi. (Sesuai dengan panduan penetapan kementerian/lembaga).</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/20 space-y-1">
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">SESUAI EKSPEKTASI</span>
                            <div className="text-[11px] font-black text-emerald-950 mt-1">Nilai SKP 90 - 100 Poin</div>
                            <p className="text-[9.5px] leading-relaxed text-emerald-900/80 font-medium pt-1">Hasil kerja Anda tepat sasaran, memenuhi target, dan sesuai dengan standar kualitas yang telah ditentukan.</p>
                         </div>
                         <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200/20 space-y-1">
                            <span className="text-[9px] font-black text-rose-800 uppercase tracking-widest block">DI BAWAH EKSPEKTASI</span>
                            <div className="text-[11px] font-black text-rose-950 mt-1">Nilai SKP &lt; 90 Poin</div>
                            <p className="text-[9.5px] leading-relaxed text-rose-900/80 font-medium pt-1">Hasil kerja tidak mencapai target dan memerlukan perbaikan, evaluasi, bimbingan, atau pembinaan lebih lanjut.</p>
                         </div>
                      </div>
                   </div>

                   {/* 2. Matriks Persilangan */}
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                         <span className="h-2 w-2 bg-indigo-600 rounded-full"></span> 2. Matriks Kuadran Predikat Kinerja ASN
                      </h5>
                      <div className="overflow-x-auto rounded-3xl border border-gray-150 shadow-sm max-w-full">
                         <table className="w-full text-center border-collapse text-xs">
                            <thead>
                               <tr className="bg-gray-50 border-b border-gray-150">
                                  <th className="p-4 font-black text-gray-400 text-[8px] uppercase tracking-wider border-r border-gray-150 w-36">Hasil Kerja \ Perilaku</th>
                                  <th className="p-4 font-black text-rose-900 text-[9px] uppercase tracking-wider bg-rose-50/30 border-r border-gray-150">DI BAWAH EKSPEKTASI</th>
                                  <th className="p-4 font-black text-emerald-105 text-[9px] uppercase tracking-wider bg-emerald-50/30 border-r border-gray-150">SESUAI EKSPEKTASI</th>
                                  <th className="p-4 font-black text-blue-900 text-[9px] uppercase tracking-wider bg-blue-50/30">DI ATAS EKSPEKTASI</th>
                               </tr>
                            </thead>
                            <tbody>
                               <tr className="border-b border-gray-150">
                                  <td className="p-4 font-black bg-blue-50/30 border-r border-gray-150 text-[9px] uppercase text-left">DI ATAS EKSPEKTASI</td>
                                  <td className="p-4 border-r border-gray-150 bg-yellow-50/65">
                                     <span className="px-2 py-1 rounded bg-orange-100 text-orange-900 text-[9px] font-black uppercase">KURANG / MISCONDUCT</span>
                                  </td>
                                  <td className="p-4 border-r border-gray-150 bg-emerald-50/40">
                                     <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 text-[9px] font-black uppercase">BAIK</span>
                                  </td>
                                  <td className="p-4 bg-blue-50/45">
                                     <span className="px-2 py-1 rounded bg-blue-100 text-blue-900 text-[9px] font-black uppercase">SANGAT BAIK</span>
                                  </td>
                               </tr>
                               <tr className="border-b border-gray-150">
                                  <td className="p-4 font-black bg-emerald-50/30 border-r border-gray-150 text-[9px] uppercase text-left">SESUAI EKSPEKTASI</td>
                                  <td className="p-4 border-r border-gray-150 bg-yellow-50/65">
                                     <span className="px-2 py-1 rounded bg-orange-100 text-orange-900 text-[9px] font-black uppercase">KURANG / MISCONDUCT</span>
                                  </td>
                                  <td className="p-4 border-r border-gray-150 bg-emerald-50/40">
                                     <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 text-[9px] font-black uppercase">BAIK</span>
                                  </td>
                                  <td className="p-4 bg-emerald-50/45">
                                     <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-900 text-[9px] font-black uppercase">BAIK</span>
                                  </td>
                               </tr>
                               <tr>
                                  <td className="p-4 font-black bg-rose-50/30 border-r border-gray-150 text-[9px] uppercase text-left">DI BAWAH EKSPEKTASI</td>
                                  <td className="p-4 border-r border-gray-150 bg-red-50/45">
                                     <span className="px-2 py-1 rounded bg-red-100 text-red-900 text-[9px] font-black uppercase">SANGAT KURANG</span>
                                  </td>
                                  <td className="p-4 border-r border-gray-150 bg-amber-50/45">
                                     <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">BUTUH PERBAIKAN</span>
                                  </td>
                                  <td className="p-4 bg-amber-50/45">
                                     <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 text-[9px] font-black uppercase">BUTUH PERBAIKAN</span>
                                  </td>
                               </tr>
                            </tbody>
                         </table>
                      </div>
                   </div>

                   {/* 3. Core Values BerAKHLAK */}
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                         <span className="h-2 w-2 bg-emerald-600 rounded-full"></span> 3. Core Values BerAKHLAK ASN
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100"><strong className="text-[9px] text-gray-900 uppercase block mb-1">Berorientasi Pelayanan</strong><p className="text-[9.5px] leading-relaxed text-gray-500 font-medium">Memahami &amp; memenuhi kebutuhan masyarakat dengan ramah, solutif, cekatan &amp; dapat diandalkan.</p></div>
                         <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100"><strong className="text-[9px] text-gray-900 uppercase block mb-1">Akuntabel</strong><p className="text-[9.5px] leading-relaxed text-gray-500 font-medium font-semibold">Melaksanakan tugas secara jujur, bertanggung jawab, cermat, disiplin, berintegritas tinggi.</p></div>
                         <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100"><strong className="text-[9px] text-gray-900 uppercase block mb-1">Kompeten</strong><p className="text-[9.5px] leading-relaxed text-gray-500 font-medium">Meningkatkan kompetensi diri untuk menjawab tantangan, membantu orang lain belajar.</p></div>
                         <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100"><strong className="text-[9px] text-gray-900 uppercase block mb-1">Harmonis</strong><p className="text-[9.5px] leading-relaxed text-gray-500 font-medium font-semibold">Saling peduli, menghargai perbedaan latar belakang, membangun lingkungan kerja kondusif.</p></div>
                      </div>
                   </div>

                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                   <button onClick={() => setShowGuide(false)} className="px-8 h-12 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all hover:bg-slate-950">
                      Saya Mengerti
                   </button>
                </div>

             </div>
          </div>
       )}
    </div>
  );
};

export default SKPPage;