import React, { useState, useEffect, useMemo, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { ABKAnjab, Pegawai } from '../types';
import { fetchPegawaiFromSheets, syncTableRemote, fetchABKAnjabFromSheets } from '../spreadsheetService';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// MASTER DATA JABATAN SESUAI PERMINTAAN USER (PermenPANRB 41/2018 + SIASN)
const MASTER_JABATAN = [
  // 1. ARSIPARIS
  { label: "ARSIPARIS PELAKSANA", code: "2.02.01.01", class: "5", type: "JF", minEducation: "D-III Kearsipan / Bidang Terkait" },
  { label: "ARSIPARIS PELAKSANA LANJUTAN", code: "2.02.01.02", class: "6", type: "JF", minEducation: "D-III Kearsipan / Bidang Terkait" },
  { label: "ARSIPARIS PERTAMA", code: "2.02.01.03", class: "8", type: "JF", minEducation: "S-1 Kearsipan / Ilmu Informasi / Perpustakaan" },
  { label: "ARSIPARIS MUDA", code: "2.02.01.04", class: "9", type: "JF", minEducation: "S-1 Kearsipan / Ilmu Informasi / Perpustakaan" },
  { label: "ARSIPARIS MADYA", code: "2.02.01.05", class: "11", type: "JF", minEducation: "S-1 Kearsipan / Ilmu Informasi / Perpustakaan" },
  
  // 2. PRANATA KOMPUTER
  { label: "PRANATA KOMPUTER PELAKSANA", code: "2.03.01.01", class: "6", type: "JF", minEducation: "D-III Teknik Informatika / Sistem Informasi" },
  { label: "PRANATA KOMPUTER PERTAMA", code: "2.03.01.02", class: "8", type: "JF", minEducation: "S-1 Teknik Informatika / Sistem Informasi / Ilmu Komputer" },
  { label: "PRANATA KOMPUTER MUDA", code: "2.03.01.03", class: "9", type: "JF", minEducation: "S-1 Teknik Informatika / Sistem Informasi / Ilmu Komputer" },
  { label: "PRANATA KOMPUTER MADYA", code: "2.03.01.04", class: "11", type: "JF", minEducation: "S-1 Teknik Informatika / Sistem Informasi / Ilmu Komputer" },
  
  // 3. PEMERIKSA KEKAYAAN INTELEKTUAL (PATEN)
  { label: "PEMERIKSA PATEN PERTAMA", code: "2.16.01.01", class: "9", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  { label: "PEMERIKSA PATEN MUDA", code: "2.16.01.02", class: "10", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  { label: "PEMERIKSA PATEN MADYA", code: "2.16.01.03", class: "12", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  { label: "PEMERIKSA PATEN UTAMA", code: "2.16.01.04", class: "14", type: "JF", minEducation: "S-1 Teknik / MIPA / Farmasi / Ilmu Terkait" },
  
  // 4. PEMERIKSA KEKAYAAN INTELEKTUAL (MEREK)
  { label: "PEMERIKSA MEREK PERTAMA", code: "2.16.02.01", class: "9", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  { label: "PEMERIKSA MEREK MUDA", code: "2.16.02.02", class: "10", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  { label: "PEMERIKSA MEREK MADYA", code: "2.16.02.03", class: "12", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  { label: "PEMERIKSA MEREK UTAMA", code: "2.16.02.04", class: "14", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Desain / Ilmu Terkait" },
  
  // 5. PEMERIKSA KEKAYAAN INTELEKTUAL (DESAIN INDUSTRI)
  { label: "PEMERIKSA DESAIN INDUSTRI PERTAMA", code: "2.16.03.01", class: "9", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },
  { label: "PEMERIKSA DESAIN INDUSTRI MUDA", code: "2.16.03.02", class: "10", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },
  { label: "PEMERIKSA DESAIN INDUSTRI MADYA", code: "2.16.03.03", class: "12", type: "JF", minEducation: "S-1 Desain Produk / Seni Rupa / Teknik" },
  
  // 6. ANALIS KEKAYAAN INTELEKTUAL
  { label: "ANALIS KI AHLI PERTAMA", code: "2.16.04.01", class: "9", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  { label: "ANALIS KI AHLI MUDA", code: "2.16.04.02", class: "10", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  { label: "ANALIS KI AHLI MADYA", code: "2.16.04.03", class: "12", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  { label: "ANALIS KI AHLI UTAMA", code: "2.16.04.04", class: "14", type: "JF", minEducation: "S-1 Hukum / Ekonomi / Sosial / Manajemen" },
  
  // 7. ANALIS HUKUM
  { label: "ANALIS HUKUM PERTAMA", code: "2.05.01.01", class: "9", type: "JF", minEducation: "S-1 Hukum" },
  { label: "ANALIS HUKUM MUDA", code: "2.05.01.02", class: "10", type: "JF", minEducation: "S-1 Hukum" },
  { label: "ANALIS HUKUM MADYA", code: "2.05.01.03", class: "12", type: "JF", minEducation: "S-1 Hukum" },
  
  // 8. ANALIS KEBIJAKAN
  { label: "ANALIS KEBIJAKAN PERTAMA", code: "2.06.01.01", class: "9", type: "JF", minEducation: "S-1 Semua Jurusan" },
  { label: "ANALIS KEBIJAKAN MUDA", code: "2.06.01.02", class: "10", type: "JF", minEducation: "S-1 Semua Jurusan" },
  { label: "ANALIS KEBIJAKAN MADYA", code: "2.06.01.03", class: "12", type: "JF", minEducation: "S-1 Semua Jurusan" },
  
  // 9. PRANATA HUMAS
  { label: "PRANATA HUMAS PERTAMA", code: "2.08.01.01", class: "9", type: "JF", minEducation: "S-1 Komunikasi / Hubungan Internasional" },
  { label: "PRANATA HUMAS MUDA", code: "2.08.01.02", class: "10", type: "JF", minEducation: "S-1 Komunikasi / Hubungan Internasional" },
  { label: "PRANATA HUMAS MADYA", code: "2.08.01.03", class: "12", type: "JF", minEducation: "S-1 Komunikasi / Hubungan Internasional" },
  
  // 10. PUSTAKAWAN
  { label: "PUSTAKAWAN MUDA", code: "2.02.02.02", class: "9", type: "JF", minEducation: "S-1 Perpustakaan / Ilmu Informasi" },
  { label: "PUSTAKAWAN MADYA", code: "2.02.02.03", class: "11", type: "JF", minEducation: "S-1 Perpustakaan / Ilmu Informasi" },
  
  // 11. PENYULUH HUKUM
  { label: "PENYULUH HUKUM PERTAMA", code: "2.05.02.01", class: "9", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PENYULUH HUKUM MUDA", code: "2.05.02.02", class: "10", type: "JF", minEducation: "S-1 Hukum" },
  { label: "PENYULUH HUKUM MADYA", code: "2.05.02.03", class: "12", type: "JF", minEducation: "S-1 Hukum" },
  
  // B. JABATAN PELAKSANA
  { label: "PENGOLAH DATA DAN INFORMASI", code: "4.01.01", class: "6", type: "JFU", minEducation: "D-III Teknik Informatika / Manajemen" },
  { label: "PENGADMINISTRASI PERKANTORAN", code: "4.01.02", class: "5", type: "JFU", minEducation: "SMA / SMK / D-III Perkantoran" },
  { label: "PENGELOLA DATA KEPEGAWAIAN", code: "4.01.03", class: "6", type: "JFU", minEducation: "D-III Kepegawaian / Manajemen / Administrasi" },
  { label: "PENGELOLA UMUM OPERASIONAL", code: "4.01.04", class: "6", type: "JFU", minEducation: "D-III Semua Jurusan" },
  { label: "PENGELOLA LAYANAN OPERASIONAL", code: "4.01.05", class: "6", type: "JFU", minEducation: "D-III Semua Jurusan" },
  { label: "OPERATOR LAYANAN OPERASIONAL", code: "4.01.06", class: "5", type: "JFU", minEducation: "SMA / SMK Sederajat" },
  { label: "SEKRETARIS PIMPINAN", code: "4.01.07", class: "7", type: "JFU", minEducation: "D-III Sekretaris / Administrasi Perkantoran" },
  
  // C. JABATAN PIMPINAN TINGGI & ADMINISTRATOR
  { label: "DIREKTUR JENDERAL", code: "1.01.01", class: "17", type: "JPT", minEducation: "S-2 / S-3 Hukum / Manajemen / Kebijakan Publik" },
  { label: "DIREKTUR", code: "1.01.02", class: "16", type: "JPT", minEducation: "S-2 / S-3 Hukum / Manajemen / Kebijakan Publik" },
  { label: "SEKRETARIS DIREKTORAT JENDERAL", code: "1.02.01", class: "15", type: "JPT", minEducation: "S-2 / S-3 Hukum / Manajemen / Kebijakan Publik" },
  { label: "KEPALA BAGIAN", code: "1.03.01", class: "14", type: "ADM", minEducation: "S-1 / S-2 Hukum / Manajemen / Administrasi" },
  { label: "KEPALA SUBDIREKTORAT", code: "1.04.01", class: "13", type: "ADM", minEducation: "S-1 / S-2 Hukum / Manajemen / Administrasi" },
  { label: "KEPALA SUBBAGIAN", code: "1.05.01", class: "9", type: "ADM", minEducation: "S-1 Hukum / Manajemen / Administrasi" }
];

const ABKAnjabPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  
  const [abkList, setAbkList] = useState<ABKAnjab[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview' | 'master'>('list');
  const [modalTab, setModalTab] = useState<'identitas' | 'kualifikasi' | 'uraian' | 'atribut' | 'syarat' | 'hasil'>('identitas');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ABKAnjab | null>(null);

  const [formData, setFormData] = useState<any>({
    namaJabatan: '',
    kodeJabatan: '-',
    unitUtama: '-',
    unitMadya: 'Direktorat Jenderal Kekayaan Intelektual',
    unitPratama: 'Direktorat Merek dan Indikasi Geografis',
    unitKerja: UNIT_KERJA[0],
    jenisJabatan: 'PELAKSANA',
    kelasJabatan: '',
    jumlahSaatIni: 0,
    jamKerjaEfektif: 75000,
    ikhtisarJabatan: '',
    pendidikanFormal: '',
    diklat: 'Pelatihan Dasar; Pelatihan Teknis Jabatan',
    pengalamanKerja: '',
    tanggungJawab: '',
    wewenang: '',
    bahanKerja: 'Disposisi Pimpinan; Laporan Kegiatan; Peraturan Perundangan',
    perangkatKerja: 'SOP; Komputer / Laptop; Koneksi Internet',
    korelasiJabatan: 'Atasan Langsung (Arahan); Rekan Sejawat (Koordinasi)',
    lingkunganKerja: 'Lokasi: Dalam Ruangan; Suhu: Dingin; Udara: Sejuk; Penerangan: Terang; Suara: Tenang',
    risikoBahaya: 'Kelelahan Mata; Kejenuhan',
    bakatKerja: 'V: Verbal; Q: Ketelitian; G: Intelegensia',
    temperamenKerja: 'R: REPCON; S: PUS; T: STS',
    minatKerja: 'Konvensional; Realistik; Sosial',
    upayaFisik: 'Duduk; Berjalan; Melihat; Berbicara',
    kondisiFisik: 'Sehat Jasmani dan Rohani',
    fungsiPekerjaan: 'Memadukan data; Mengkoordinasi data; Menganalisis data',
    uraianTugas: [{ tugas: '', hasilKerja: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }]
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [pData, aData] = await Promise.all([fetchPegawaiFromSheets(), fetchABKAnjabFromSheets()]);
      setPegawaiList(pData);
      setAbkList(aData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const countAsnPopulation = (jabatanLabel: string, unitName: string) => {
    if (!jabatanLabel || !unitName) return 0;
    const normalizedTargetUnit = normalizeUnitName(unitName);
    return pegawaiList.filter(p => 
      normalizeUnitName(p.unitKerja) === normalizedTargetUnit && 
      (p.jabatan || '').toUpperCase().trim() === jabatanLabel.toUpperCase().trim()
    ).length;
  };

  const handleJabatanSelect = (val: string) => {
    const master = MASTER_JABATAN.find(j => j.label === val);
    if (master) {
      const count = countAsnPopulation(master.label, formData.unitKerja);
      const jenis = master.type === 'JFU' ? 'PELAKSANA' : (master.type === 'JF' ? 'FUNGSIONAL' : 'STRUKTUR');
      const jke = jenis === 'PELAKSANA' ? 75000 : 1250;
      
      setFormData({
        ...formData,
        namaJabatan: master.label,
        kodeJabatan: master.code,
        kelasJabatan: master.class,
        jenisJabatan: jenis,
        jamKerjaEfektif: jke,
        jumlahSaatIni: count,
        ikhtisarJabatan: `Melaksanakan tugas ${master.label.toLowerCase()} sesuai dengan ketentuan peraturan perundang-undangan untuk kelancaran tugas organisasi.`
      });
    } else {
      setFormData({ ...formData, namaJabatan: val });
    }
  };

  const handleUnitChange = (newUnit: string) => {
    const count = countAsnPopulation(formData.namaJabatan, newUnit);
    setFormData({ ...formData, unitKerja: newUnit, jumlahSaatIni: count });
  };

  const handleUraianChange = (index: number, field: string, value: any) => {
    const updatedUraian = [...(formData.uraianTugas || [])];
    const item = { ...updatedUraian[index], [field]: value };
    if (field === 'volume' || field === 'normaWaktu') {
      item.totalWaktu = (Number(item.volume) || 0) * (Number(item.normaWaktu) || 0);
    }
    updatedUraian[index] = item;
    setFormData({ ...formData, uraianTugas: updatedUraian });
  };

  const liveCalc = useMemo(() => {
    const currentUraian = Array.isArray(formData.uraianTugas) ? formData.uraianTugas : [];
    const totalBeban = currentUraian.reduce((acc: number, curr: any) => acc + (curr.totalWaktu || 0), 0);
    const jke = Number(formData.jamKerjaEfektif) || (formData.jenisJabatan === 'PELAKSANA' ? 75000 : 1250);
    const kebutuhan = Number((totalBeban / jke).toFixed(2));
    const selisih = Number(((formData.jumlahSaatIni || 0) - kebutuhan).toFixed(2));
    let status: ABKAnjab['status'] = 'IDEAL';
    if (selisih <= -0.5) status = 'KURANG';
    else if (selisih >= 0.5) status = 'LEBIH';
    return { totalBeban, kebutuhan, selisih, status };
  }, [formData]);

  const handleSave = async () => {
    if (!formData.namaJabatan) return alert("Nama Jabatan wajib diisi");
    setSyncing(true);
    const newEntry: ABKAnjab = {
      ...formData,
      id: editingId || `ABK-${Date.now()}`,
      namaJabatan: formData.namaJabatan.toUpperCase(),
      totalMenitBebanKerja: formData.jenisJabatan === 'PELAKSANA' ? liveCalc.totalBeban : liveCalc.totalBeban * 60,
      kebutuhanPegawai: liveCalc.kebutuhan,
      selisih: liveCalc.selisih,
      status: liveCalc.status
    };
    const ok = await syncTableRemote('ABK_ANJAB', 'SAVE', newEntry);
    if (ok) {
      await loadInitialData();
      logActivity(editingId ? 'UPDATE' : 'CREATE', 'ABK', `Update Anjab-ABK: ${newEntry.namaJabatan}`);
      setActiveView('list');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      const ok = await syncTableRemote('ABK_ANJAB', 'DELETE', { 
        id: itemToDelete.id,
        nama: itemToDelete.namaJabatan
      });
      if (ok) {
        logActivity('DELETE', 'ABK', `Hapus Analisis Jabatan: ${itemToDelete.namaJabatan}`);
        setAbkList(prev => prev.filter(i => i.id !== itemToDelete.id));
        setIsConfirmOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    const imgWidth = 210;
    const pageHeight = 330;
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
    pdf.save(`ANJAB_ABK_${formData.namaJabatan.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-200 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[10px] font-black text-gray-600 uppercase ml-3 tracking-widest block mb-1.5";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal 
        isOpen={isConfirmOpen} 
        onClose={() => !syncing && setIsConfirmOpen(false)} 
        onConfirm={handleDelete}
        loading={syncing}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Analisis Jabatan & Beban Kerja</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">DJKI Personnel Engineering System</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeView === 'list' && (
             <button onClick={() => setActiveView('master')} className="h-14 px-8 bg-white border-2 border-gray-900 text-gray-900 rounded-2xl font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all flex items-center gap-2">
                <i className="bi bi-journal-text text-lg"></i> Standar Jabatan
             </button>
          )}
          {activeView === 'list' && canEdit && (
             <button onClick={() => { setEditingId(null); setActiveView('editor'); setModalTab('identitas'); }} className="h-14 px-10 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">+ Susun Analisis Jabatan</button>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-600 border-b tracking-widest">
                 <tr><th className="px-10 py-6">Nomenklatur Jabatan</th><th className="px-4 py-6 text-center">Beban Kerja (Jam)</th><th className="px-4 py-6 text-center">Kebutuhan ASN</th><th className="px-4 py-6 text-center">Status</th><th className="px-10 py-6 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {abkList.map(a => (
                    <tr key={a.id} className="hover:bg-blue-50/5 group transition-all">
                       <td className="px-10 py-6">
                          <p className="text-[12px] font-black text-gray-950 uppercase leading-none">{a.namaJabatan}</p>
                          <p className="text-[9px] font-bold text-blue-600 uppercase mt-2">{normalizeUnitName(a.unitKerja)}</p>
                       </td>
                       <td className="px-4 py-6 text-center">
                          <p className="text-[11px] font-black text-gray-900">{(a.totalMenitBebanKerja / 60).toLocaleString()} JAM</p>
                          <p className="text-[7px] font-bold text-gray-400 uppercase">{a.totalMenitBebanKerja.toLocaleString()} MENIT</p>
                       </td>
                       <td className="px-4 py-6 text-center">
                          <p className="text-[13px] font-black text-gray-950">{a.kebutuhanPegawai}</p>
                          <p className="text-[7px] font-bold text-gray-400 uppercase">ASN Ideal</p>
                       </td>
                       <td className="px-4 py-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[8px] font-black border ${a.status === 'KURANG' ? 'bg-rose-50 text-rose-600 border-rose-100' : a.status === 'LEBIH' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{a.status}</span>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                             <button onClick={() => { setFormData(a); setActiveView('preview'); }} className="h-9 px-4 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-lg"><i className="bi bi-file-earmark-pdf"></i> PDF</button>
                             {canEdit && (
                                <button onClick={() => { setEditingId(a.id); setFormData(a); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"><i className="bi bi-pencil-fill"></i></button>
                             )}
                             {isSuperadmin && (
                                <button onClick={() => { setItemToDelete(a); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl shadow-sm flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="bi bi-trash-fill"></i></button>
                             )}
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : activeView === 'master' ? (
        <div className="animate-fadeIn space-y-6">
           <div className="flex items-center justify-between px-6">
              <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Daftar Standar Jabatan & Kualifikasi</h4>
              <button onClick={() => setActiveView('list')} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[9px] font-black uppercase hover:bg-gray-200 transition-all">Kembali ke Monitoring</button>
           </div>
           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-600 border-b tracking-widest">
                    <tr>
                       <th className="px-10 py-6">Nama Jabatan</th>
                       <th className="px-4 py-6 text-center">Kelas</th>
                       <th className="px-4 py-6 text-center">Jenis</th>
                       <th className="px-10 py-6">Kualifikasi Pendidikan Minimal</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {MASTER_JABATAN.map((m, idx) => (
                       <tr key={idx} className="hover:bg-blue-50/5 transition-all">
                          <td className="px-10 py-6">
                             <p className="text-[11px] font-black text-gray-950 uppercase leading-none">{m.label}</p>
                             <p className="text-[8px] font-bold text-gray-400 uppercase mt-1.5 tracking-widest">{m.code}</p>
                          </td>
                          <td className="px-4 py-6 text-center">
                             <span className="h-8 w-8 inline-flex items-center justify-center bg-gray-900 text-white rounded-lg text-[11px] font-black">{m.class}</span>
                          </td>
                          <td className="px-4 py-6 text-center">
                             <span className={`px-2 py-1 rounded-md text-[8px] font-black border ${m.type === 'JF' ? 'bg-blue-50 text-blue-600 border-blue-100' : m.type === 'JPT' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>{m.type}</span>
                          </td>
                          <td className="px-10 py-6">
                             <p className="text-[10px] font-bold text-gray-700 uppercase leading-relaxed">{(m as any).minEducation || '-'}</p>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      ) : activeView === 'editor' ? (
        <div className="max-w-7xl mx-auto bg-white rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[850px] animate-modalEnter">
           <div className="flex border-b bg-gray-50/50 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: 'identitas', label: '1. Identitas Jabatan', icon: 'bi-person-badge' },
                { id: 'kualifikasi', label: '2. Kualifikasi & Kompetensi', icon: 'bi-mortarboard' },
                { id: 'uraian', label: '3. Uraian Tugas & ABK', icon: 'bi-table' },
                { id: 'atribut', label: '4. Bahan, Alat & Korelasi', icon: 'bi-gear-wide-connected' },
                { id: 'syarat', label: '5. Kondisi & Syarat Kerja', icon: 'bi-shield-check' },
                { id: 'hasil', label: '6. Ringkasan Formasi', icon: 'bi-graph-up-arrow' }
              ].map(t => (
                <button key={t.id} onClick={() => setModalTab(t.id as any)} className={`px-10 py-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all border-b-4 shrink-0 ${modalTab === t.id ? 'border-blue-600 text-blue-600 bg-white shadow-inner' : 'border-transparent text-gray-500'}`}>
                   <i className={`bi ${t.icon} text-lg`}></i> {t.label}
                </button>
              ))}
           </div>

           <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              {modalTab === 'identitas' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Detail Nomenklatur</h5>
                      
                      <SearchableSelect 
                        label="Cari Nomenklatur Jabatan" 
                        options={MASTER_JABATAN.map(j => ({ value: j.label, label: j.label, subLabel: `${j.type} • Kelas ${j.class}` }))} 
                        value={formData.namaJabatan} 
                        onChange={handleJabatanSelect} 
                        placeholder="Pilih atau Ketik Nama Jabatan..."
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Kode Jabatan (SIASN)</label><input className={`${inputClass} bg-blue-50/30`} value={formData.kodeJabatan} onChange={e=>setFormData({...formData, kodeJabatan: e.target.value})} /></div>
                        <div><label className={labelClass}>Jenis Jabatan</label>
                          <select className={inputClass} value={formData.jenisJabatan} onChange={e => {
                            const jenis = e.target.value;
                            setFormData({ ...formData, jenisJabatan: jenis, jamKerjaEfektif: jenis === 'PELAKSANA' ? 75000 : 1250 });
                          }}>
                            <option value="PELAKSANA">PELAKSANA</option>
                            <option value="FUNGSIONAL">FUNGSIONAL</option>
                            <option value="STRUKTUR">STRUKTUR</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Kelas Jabatan</label><input className={`${inputClass} bg-blue-50/30`} value={formData.kelasJabatan} onChange={e=>setFormData({...formData, kelasJabatan: e.target.value})} /></div>
                        <div><label className={labelClass}>Jam Kerja Efektif / Thn</label><input type="number" className={inputClass} value={formData.jamKerjaEfektif} onChange={e => setFormData({...formData, jamKerjaEfektif: parseInt(e.target.value) || 75000})} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>JPT Madya</label><input className={inputClass} value={formData.unitMadya} onChange={e=>setFormData({...formData, unitMadya: e.target.value})} /></div>
                        <div><label className={labelClass}>JPT Pratama</label><input className={inputClass} value={formData.unitPratama} onChange={e=>setFormData({...formData, unitPratama: e.target.value})} /></div>
                      </div>
                      
                      <SearchableSelect 
                        label="Unit Kerja Pengampu" 
                        options={UNIT_KERJA.map(u=>({value:u, label:u.toUpperCase()}))} 
                        value={formData.unitKerja} 
                        onChange={handleUnitChange} 
                      />
                   </div>
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Ringkasan Pekerjaan</h5>
                      <div><label className={labelClass}>Ikhtisar Jabatan (Summary)</label><textarea rows={6} className={`${inputClass} normal-case h-44 resize-none font-bold`} value={formData.ikhtisarJabatan} onChange={e => setFormData({...formData, ikhtisarJabatan: e.target.value})} placeholder="Uraikan ringkasan tugas pokok jabatan..." /></div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="relative">
                            <label className={labelClass}>ASN Eksisting (Database)</label>
                            <input type="number" readOnly className={`${inputClass} bg-blue-50 border-blue-200 text-blue-900 font-black cursor-not-allowed`} value={formData.jumlahSaatIni} />
                            <p className="text-[8px] font-black text-blue-600 mt-1 uppercase tracking-tighter">* Kalkulasi otomatis per Jabatan & Unit</p>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {modalTab === 'kualifikasi' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Kompetensi Formal</h5>
                      <div><label className={labelClass}>Pendidikan Formal Minimal</label><textarea className={`${inputClass} normal-case h-24 resize-none font-bold`} value={formData.pendidikanFormal} onChange={e=>setFormData({...formData, pendidikanFormal: e.target.value})} placeholder="Misal: Sarjana (S-1) / Diploma IV Bidang Hukum..." /></div>
                      <div><label className={labelClass}>Pendidikan & Pelatihan (Diklat)</label><textarea className={`${inputClass} normal-case h-24 resize-none font-bold`} value={formData.diklat} onChange={e=>setFormData({...formData, diklat: e.target.value})} /></div>
                   </div>
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Karir & Pengalaman</h5>
                      <div><label className={labelClass}>Pengalaman Kerja</label><textarea className={`${inputClass} normal-case h-52 resize-none font-bold`} value={formData.pengalamanKerja} onChange={e=>setFormData({...formData, pengalamanKerja: e.target.value})} placeholder="Misal: Memiliki pengalaman di bidang pemeriksaan substantif minimal 2 tahun..." /></div>
                   </div>
                </div>
              )}

              {modalTab === 'uraian' && (
                 <div className="space-y-8 animate-fadeIn">
                    <div className="flex justify-between items-center border-b pb-4">
                       <div>
                         <h5 className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Tugas Pokok & Beban Kerja (ABK)</h5>
                         <p className="text-[9px] font-black text-gray-500 uppercase mt-1">Norma Waktu dihitung dalam satuan <span className="text-blue-600">{formData.jenisJabatan === 'PELAKSANA' ? 'MENIT' : 'JAM'}</span></p>
                       </div>
                       <button onClick={() => setFormData({ ...formData, uraianTugas: [...(formData.uraianTugas || []), { tugas: '', hasilKerja: '', volume: 0, normaWaktu: 0, totalWaktu: 0 }] })} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">+ Butir Tugas</button>
                    </div>
                    <div className="overflow-hidden border border-gray-200 rounded-[2.5rem]">
                       <table className="w-full text-left">
                          <thead className="bg-gray-100 text-[10px] font-black uppercase text-gray-700">
                             <tr><th className="px-6 py-5">Uraian Butir Kegiatan</th><th className="px-4 py-5">Hasil Kerja</th><th className="px-4 py-5 text-center w-24">Jumlah Hasil</th><th className="px-4 py-5 text-center w-32">Waktu ({formData.jenisJabatan === 'PELAKSANA' ? 'Menit' : 'Jam'})</th><th className="px-4 py-5 text-right w-32">Beban ({formData.jenisJabatan === 'PELAKSANA' ? 'Menit' : 'Jam'})</th><th className="px-6 py-5 w-12"></th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                             {formData.uraianTugas.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-blue-50/5 transition-all">
                                   <td className="px-6 py-3"><input type="text" className="w-full bg-transparent border-none outline-none text-[11px] font-bold uppercase text-gray-950" value={row.tugas} onChange={e => handleUraianChange(i, 'tugas', e.target.value)} placeholder="Tulis butir tugas..." /></td>
                                   <td className="px-4 py-3"><input type="text" className="w-full bg-transparent border-none outline-none text-[11px] font-black text-gray-600 uppercase" value={row.hasilKerja} onChange={e => handleUraianChange(i, 'hasilKerja', e.target.value)} placeholder="Bentuk Hasil..." /></td>
                                   <td className="px-4 py-3 text-center"><input type="number" className="w-full bg-gray-100 border-none rounded-xl px-2 py-2 text-center text-[11px] font-black text-gray-950" value={row.volume} onChange={e => handleUraianChange(i, 'volume', parseFloat(e.target.value) || 0)} /></td>
                                   <td className="px-4 py-3 text-center"><input type="number" step="0.00001" className="w-full bg-gray-100 border-none rounded-xl px-2 py-2 text-center text-[11px] font-black text-gray-950" value={row.normaWaktu} onChange={e => handleUraianChange(i, 'normaWaktu', parseFloat(e.target.value) || 0)} /></td>
                                   <td className="px-4 py-3 text-right"><span className="text-[12px] font-black text-gray-950">{Number(row.totalWaktu || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</span></td>
                                   <td className="px-6 py-3"><button onClick={() => setFormData({...formData, uraianTugas: formData.uraianTugas.filter((_:any,idx:number)=>idx!==i)})} className="text-gray-400 hover:text-rose-600 transition-colors"><i className="bi bi-trash text-lg"></i></button></td>
                                </tr>
                             ))}
                          </tbody>
                          <tfoot className="bg-blue-50/30">
                             <tr className="font-black text-[11px] text-blue-700 uppercase">
                                <td className="px-6 py-5" colSpan={4}>TOTAL BEBAN KERJA JABATAN PER TAHUN</td>
                                <td className="px-4 py-5 text-right text-[13px]">{liveCalc.totalBeban.toLocaleString()} {formData.jenisJabatan === 'PELAKSANA' ? 'MENIT' : 'JAM'}</td>
                                <td></td>
                             </tr>
                          </tfoot>
                       </table>
                    </div>
                 </div>
              )}

              {modalTab === 'atribut' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                    <div className="space-y-6">
                       <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Sumber Daya & Hubungan</h5>
                       <div><label className={labelClass}>Bahan Kerja</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none font-bold`} value={formData.bahanKerja} onChange={e=>setFormData({...formData, bahanKerja: e.target.value})} placeholder="Contoh: Disposisi pimpinan, Peraturan perundangan..." /></div>
                       <div><label className={labelClass}>Perangkat Kerja</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none font-bold`} value={formData.perangkatKerja} onChange={e=>setFormData({...formData, perangkatKerja: e.target.value})} placeholder="Contoh: Standar Operasional Prosedur (SOP), Komputer..." /></div>
                       <div><label className={labelClass}>Korelasi Jabatan</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none font-bold`} value={formData.korelasiJabatan} onChange={e=>setFormData({...formData, korelasiJabatan: e.target.value})} placeholder="Contoh: Direktur (Arahan tugas), Kepala Bagian (Koordinasi)..." /></div>
                    </div>
                    <div className="space-y-6">
                       <h5 className="text-[11px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Otoritas Jabatan</h5>
                       <div><label className={labelClass}>Tanggung Jawab</label><textarea rows={6} className={`${inputClass} normal-case h-44 resize-none font-bold`} value={formData.tanggungJawab} onChange={e=>setFormData({...formData, tanggungJawab: e.target.value})} /></div>
                       <div><label className={labelClass}>Wewenang</label><textarea rows={6} className={`${inputClass} normal-case h-44 resize-none font-bold`} value={formData.wewenang} onChange={e=>setFormData({...formData, wewenang: e.target.value})} /></div>
                    </div>
                 </div>
              )}

              {modalTab === 'syarat' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-3 tracking-widest">A. Kondisi Psikofisik</h5>
                      <div><label className={labelClass}>Kondisi Fisik</label><textarea rows={3} className={`${inputClass} normal-case h-24 resize-none font-bold`} value={formData.kondisiFisik} onChange={e=>setFormData({...formData, kondisiFisik: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Bakat Kerja</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none text-[11px] font-bold`} value={formData.bakatKerja} onChange={e=>setFormData({...formData, bakatKerja: e.target.value})} /></div>
                        <div><label className={labelClass}>Temperamen Kerja</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none text-[11px] font-bold`} value={formData.temperamenKerja} onChange={e=>setFormData({...formData, temperamenKerja: e.target.value})} /></div>
                      </div>
                      <div><label className={labelClass}>Upaya Fisik</label><textarea className={`${inputClass} normal-case font-bold`} value={formData.upayaFisik} onChange={e=>setFormData({...formData, upayaFisik: e.target.value})} /></div>
                   </div>
                   <div className="space-y-6">
                      <h5 className="text-[11px] font-black text-indigo-600 uppercase border-b pb-3 tracking-widest">B. Lingkungan & Fungsi</h5>
                      <div><label className={labelClass}>Lingkungan Kerja</label><textarea rows={3} className={`${inputClass} normal-case h-24 resize-none font-bold`} value={formData.lingkunganKerja} onChange={e=>setFormData({...formData, lingkunganKerja: e.target.value})} /></div>
                      <div><label className={labelClass}>Risiko Bahaya</label><textarea rows={3} className={`${inputClass} normal-case h-24 resize-none font-bold`} value={formData.risikoBahaya} onChange={e=>setFormData({...formData, risikoBahaya: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Minat Kerja</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none text-[11px] font-bold`} value={formData.minatKerja} onChange={e=>setFormData({...formData, minatKerja: e.target.value})} /></div>
                        <div><label className={labelClass}>Fungsi Pekerjaan</label><textarea rows={4} className={`${inputClass} normal-case h-32 resize-none text-[11px] font-bold`} value={formData.fungsiPekerjaan} onChange={e=>setFormData({...formData, fungsiPekerjaan: e.target.value})} /></div>
                      </div>
                   </div>
                </div>
              )}

              {modalTab === 'hasil' && (
                <div className="max-w-4xl mx-auto flex flex-col items-center animate-fadeIn pt-10">
                   <div className="p-12 bg-gray-950 rounded-[4rem] text-white space-y-10 shadow-2xl relative overflow-hidden w-full">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                      <div className="relative z-10 text-center space-y-3">
                         <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">Hasil Analisis Beban Kerja</p>
                         <h2 className="text-8xl font-black text-blue-400 tracking-tighter">{liveCalc.kebutuhan}</h2>
                         <p className="text-[12px] font-black uppercase text-blue-200">Kebutuhan Pegawai Ideal</p>
                      </div>
                      <div className="relative z-10 grid grid-cols-3 gap-8 border-t border-white/10 pt-10">
                         <div className="text-center">
                            <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Pegawai Eksisting</p>
                            <h4 className="text-2xl font-black">{formData.jumlahSaatIni}</h4>
                         </div>
                         <div className="text-center border-x border-white/10">
                            <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Selisih Formasi</p>
                            <h4 className={`text-2xl font-black ${liveCalc.selisih < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{liveCalc.selisih}</h4>
                         </div>
                         <div className="text-center">
                            <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Status Beban</p>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${liveCalc.status==='KURANG'?'bg-rose-500 text-white':liveCalc.status==='LEBIH'?'bg-amber-500 text-white':'bg-emerald-500 text-white'}`}>{liveCalc.status}</span>
                         </div>
                      </div>
                   </div>
                </div>
              )}
           </div>

           <div className="p-10 border-t bg-gray-50 flex justify-center shrink-0">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-4">
                 {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                 <span>Simpan Seluruh Rekayasa Jabatan</span>
              </button>
           </div>
        </div>
      ) : (
        /* PREVIEW MODE - HIGH CONTRAST PRINT READY */
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-900 border border-gray-300 rounded-2xl text-[11px] font-black uppercase shadow-sm">Edit Analisis</button>
              <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           
           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar rounded-[3rem]">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2cm] font-arial text-black" style={{ width: '210mm', color: '#000000' }}>
                 <div className="text-center mb-10 border-b-2 border-black pb-4">
                    <h1 className="text-[14pt] font-bold uppercase underline leading-tight text-black">INFORMASI JABATAN</h1>
                 </div>

                 <div className="space-y-6 text-[10.5pt] leading-relaxed text-black">
                    <div className="space-y-2">
                       <p className="font-bold">1. NAMA JABATAN: <span className="uppercase">{formData.namaJabatan}</span></p>
                       <p className="font-bold">2. KODE JABATAN: {formData.kodeJabatan}</p>
                       <p className="font-bold">3. UNIT KERJA:</p>
                       <div className="grid grid-cols-[140px_10px_1fr] ml-4 text-black">
                          <span>a. JPT Utama</span><span>:</span><span className="uppercase">{formData.unitUtama}</span>
                          <span>b. JPT Madya</span><span>:</span><span className="uppercase">{formData.unitMadya}</span>
                          <span>c. JPT Pratama</span><span>:</span><span className="uppercase">{formData.unitPratama}</span>
                          <span>d. Bagian / Unit</span><span>:</span><span className="uppercase">{formData.unitKerja}</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">4. IKHTISAR JABATAN:</p>
                       <p className="ml-4 text-justify text-black">{formData.ikhtisarJabatan}</p>
                    </div>

                    <div className="space-y-2">
                       <p className="font-bold">5. KUALIFIKASI JABATAN:</p>
                       <div className="grid grid-cols-[160px_10px_1fr] ml-4 text-black">
                          <span>a. Pendidikan Formal</span><span>:</span><span className="uppercase">{formData.pendidikanFormal}</span>
                          <span>b. Diklat</span><span>:</span><span>{formData.diklat}</span>
                          <span>c. Pengalaman Kerja</span><span>:</span><span>{formData.pengalamanKerja}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <p className="font-bold">6. TUGAS POKOK:</p>
                       <table className="w-full border-collapse border-2 border-black text-[9pt] text-black">
                          <thead className="bg-gray-100 font-bold text-center">
                             <tr className="border-b-2 border-black">
                                <th className="p-1 border-r-2 border-black w-8">No</th>
                                <th className="p-1 border-r-2 border-black">Uraian Tugas</th>
                                <th className="p-1 border-r-2 border-black w-24">Hasil Kerja</th>
                                <th className="p-1 border-r-2 border-black w-14">Jumlah Hasil</th>
                                <th className="p-1 border-r-2 border-black w-14">Waktu ({formData.jenisJabatan === 'PELAKSANA' ? 'Menit' : 'Jam'})</th>
                                <th className="p-1 w-16">Beban ({formData.jenisJabatan === 'PELAKSANA' ? 'Menit' : 'Jam'})</th>
                             </tr>
                          </thead>
                          <tbody>
                             {formData.uraianTugas.map((ut: any, idx: number) => (
                                <tr key={idx} className="border-b-2 border-black">
                                   <td className="p-1 border-r-2 border-black text-center">{idx + 1}</td>
                                   <td className="p-1 border-r-2 border-black text-justify leading-tight">{ut.tugas}</td>
                                   <td className="p-1 border-r-2 border-black text-center uppercase">{ut.hasilKerja}</td>
                                   <td className="p-1 border-r-2 border-black text-center font-bold">{ut.volume}</td>
                                   <td className="p-1 border-r-2 border-black text-center">{ut.normaWaktu}</td>
                                   <td className="p-1 text-center font-bold">{Number(ut.totalWaktu).toFixed(2)}</td>
                                </tr>
                             ))}
                             <tr className="font-bold bg-gray-50 border-t-2 border-black">
                                <td colSpan={5} className="p-1 border-r-2 border-black text-right uppercase">Total Beban Kerja Jabatan ({formData.jenisJabatan === 'PELAKSANA' ? 'Menit' : 'Jam'})</td>
                                <td className="p-1 text-center">{liveCalc.totalBeban.toFixed(2)}</td>
                             </tr>
                             <tr className="font-bold bg-blue-50/50 border-t-2 border-black">
                                <td colSpan={5} className="p-1 border-r-2 border-black text-right uppercase">Kebutuhan Pegawai ASN Ideal</td>
                                <td className="p-1 text-center underline decoration-2">{liveCalc.kebutuhan}</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 text-black">
                       <div className="space-y-2">
                          <p className="font-bold">7. BAHAN KERJA:</p>
                          <p className="ml-4 whitespace-pre-wrap text-[10pt]">{formData.bahanKerja}</p>
                       </div>
                       <div className="space-y-2">
                          <p className="font-bold">8. PERANGKAT KERJA:</p>
                          <p className="ml-4 whitespace-pre-wrap text-[10pt]">{formData.perangkatKerja}</p>
                       </div>
                    </div>

                    <div className="space-y-2 text-black">
                       <p className="font-bold">9. TANGGUNG JAWAB & WEWENANG:</p>
                       <p className="ml-4 text-[10pt]"><span className="font-bold">A. TJ:</span> {formData.tanggungJawab}</p>
                       <p className="ml-4 text-[10pt]"><span className="font-bold">B. W:</span> {formData.wewenang}</p>
                    </div>

                    <div className="space-y-2 text-black">
                       <p className="font-bold">10. SYARAT JABATAN LAINNYA:</p>
                       <div className="grid grid-cols-[140px_10px_1fr] ml-4 text-[10pt] gap-y-0.5">
                          <span>Bakat Kerja</span><span>:</span><span className="font-bold">{formData.bakatKerja}</span>
                          <span>Temperamen</span><span>:</span><span className="font-bold">{formData.temperamenKerja}</span>
                          <span>Minat Kerja</span><span>:</span><span className="font-bold">{formData.minatKerja}</span>
                          <span>Upaya Fisik</span><span>:</span><span className="font-bold">{formData.upayaFisik}</span>
                       </div>
                    </div>
                    
                    <div className="mt-10 border-t-2 border-black pt-6 text-[11pt] font-bold text-black">
                       <p>KELAS JABATAN: {formData.kelasJabatan}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ABKAnjabPage;
