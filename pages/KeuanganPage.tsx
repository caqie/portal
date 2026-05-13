import React, { useState, useEffect, useMemo, useRef } from 'react';
import { KeuanganRecord, KeuanganPeserta, Pegawai } from '../types';
import { fetchKeuanganFromSheets, syncKeuanganRemote, fetchPegawaiFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, formatPegawaiName } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
import { Plus, Search, Trash2, Edit, Eye, Download, Printer, X, Save, RefreshCw, User } from 'lucide-react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const KeuanganPage = () => {
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [records, setRecords] = useState<KeuanganRecord[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'kuitansi' | 'rincian' | 'spb' | 'sptjm' | 'riil' | 'all'>('kuitansi');
  const [selectedPesertaIdx, setSelectedPesertaIdx] = useState<number>(0);
  const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [docCity, setDocCity] = useState<string>('Bogor');
  const [showPesertaModal, setShowPesertaModal] = useState(false);
  const [editingPesertaIdx, setEditingPesertaIdx] = useState<number | null>(null);
  const [pesertaForm, setPesertaForm] = useState<Partial<KeuanganPeserta>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Semua Status');

  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<KeuanganRecord>>({
    namaKegiatan: '',
    tanggal: new Date().toISOString().split('T')[0],
    mataAnggaran: '',
    tahunAnggaran: new Date().getFullYear().toString(),
    ppkNip: '',
    ppkNama: '',
    bendaharaNip: '',
    bendaharaNama: '',
    unitKerja: UNIT_KERJA[0],
    status: 'Draft',
    transactionId: `RE-SEK/${new Date().getFullYear()}/IV/0103`,
    kotaTtd: 'Bogor',
    tanggalDokumen: new Date().toISOString().split('T')[0],
    keterangan: '',
    peserta: [],
    configBiaya: {
      uangHarian: 0,
      penginapan: 0,
      transport: 0,
      fullboard: 0,
      halfboard: 0
    },
    configSpd: {
      nomorSpdPrefix: '',
      tanggalSpd: new Date().toISOString().split('T')[0],
      tanggalBerangkat: new Date().toISOString().split('T')[0],
      tanggalPulang: new Date().toISOString().split('T')[0],
      tujuanPerjalanan: ''
    }
  });

  useEffect(() => { loadData(); }, []);

  const formatSignatoryName = (name: string) => {
    if (!name) return '';
    const parts = name.split(',');
    if (parts.length > 1) {
      const mainName = parts[0].toUpperCase();
      const titles = parts.slice(1).join(',');
      return `${mainName}, ${titles.trim()}`;
    }
    return name.toUpperCase();
  };

  const loadData = async (bypass = false) => {
    setLoading(true);
    try {
      const [data, p] = await Promise.all([fetchKeuanganFromSheets(bypass), fetchPegawaiFromSheets(bypass)]);
      setRecords(data);
      setPegawai(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = r.namaKegiatan.toLowerCase().includes(searchTerm.toLowerCase()) || (r.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'Semua Status' || r.status === filterStatus;
      return matchSearch && matchStatus;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [records, searchTerm, filterStatus]);

  const handlePrintBrowser = () => {
    window.print();
    logActivity('DOWNLOAD', 'Keuangan', `Cetak Browser Dokumen ${previewType.toUpperCase()} - ${currentPeserta?.nama || 'Semua'}`);
  };

  const handleSave = async () => {
    if (!formData.namaKegiatan || !formData.mataAnggaran) {
      alert("Mohon isi nama kegiatan dan mata anggaran.");
      return;
    }
    setSyncing(true);
    const id = formData.id || `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const payload = { ...formData, id };
    const success = await syncKeuanganRemote('SAVE', payload);
    if (success) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'Keuangan', `${formData.id ? 'Update' : 'Tambah'} kegiatan keuangan: ${formData.namaKegiatan}`);
      setShowSuccess(true);
      setActiveView('list');
      loadData(true);
    } else {
      alert("Gagal menyimpan data.");
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSyncing(true);
    const activity = records.find(r => r.id === selectedId);
    const success = await syncKeuanganRemote('DELETE', { 
      id: selectedId,
      nama: activity?.namaKegiatan
    });
    if (success) {
      logActivity('DELETE', 'Keuangan', `Hapus kegiatan keuangan ID: ${selectedId}`);
      setShowConfirm(false);
      loadData(true);
    } else {
      alert("Gagal menghapus data.");
    }
    setSyncing(false);
  };

  const handlePPKChange = (nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) setFormData({ ...formData, ppkNip: nip, ppkNama: p.nama });
  };

  const handleBendaharaChange = (nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) setFormData({ ...formData, bendaharaNip: nip, bendaharaNama: p.nama });
  };

  const openAddPesertaModal = () => {
    const newPeserta: KeuanganPeserta = {
      id: `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nama: '',
      jabatan: '',
      nip: '',
      nomorSpd: formData.configSpd?.nomorSpdPrefix || '',
      tanggalSpd: formData.configSpd?.tanggalSpd || new Date().toISOString().split('T')[0],
      tanggalBerangkat: formData.configSpd?.tanggalBerangkat || new Date().toISOString().split('T')[0],
      tanggalPulang: formData.configSpd?.tanggalPulang || new Date().toISOString().split('T')[0],
      tujuanPerjalanan: formData.configSpd?.tujuanPerjalanan || '',
      kategori: 'SPPD',
      rincianBiaya: [],
      totalJumlah: 0
    };

    if (formData.configBiaya) {
      const rb = [];
      if (formData.configBiaya.uangHarian > 0) rb.push({ item: 'Uang Harian', rate: formData.configBiaya.uangHarian, qty: 1, total: formData.configBiaya.uangHarian });
      if (formData.configBiaya.penginapan > 0) rb.push({ item: 'Biaya Penginapan', rate: formData.configBiaya.penginapan, qty: 1, total: formData.configBiaya.penginapan });
      if (formData.configBiaya.transport > 0) rb.push({ item: 'Biaya Transport', rate: formData.configBiaya.transport, qty: 1, total: formData.configBiaya.transport });
      if (formData.configBiaya.fullboard > 0) rb.push({ item: 'Uang Harian Fullboard', rate: formData.configBiaya.fullboard, qty: 1, total: formData.configBiaya.fullboard });
      if (formData.configBiaya.halfboard > 0) rb.push({ item: 'Uang Harian Halfboard', rate: formData.configBiaya.halfboard, qty: 1, total: formData.configBiaya.halfboard });
      newPeserta.rincianBiaya = rb;
      newPeserta.totalJumlah = rb.reduce((acc, curr) => acc + curr.total, 0);
    } else {
      newPeserta.rincianBiaya = [{ item: 'Uang Harian', rate: 0, qty: 1, total: 0 }];
    }

    setPesertaForm(newPeserta);
    setEditingPesertaIdx(null);
    setShowPesertaModal(true);
  };

  const openEditPesertaModal = (idx: number) => {
    setPesertaForm({ ...(formData.peserta?.[idx] || {}) });
    setEditingPesertaIdx(idx);
    setShowPesertaModal(true);
  };

  const savePesertaModal = () => {
    if (!pesertaForm.nama) {
      alert("Nama peserta harus diisi.");
      return;
    }
    const list = [...(formData.peserta || [])];
    if (editingPesertaIdx !== null) {
      list[editingPesertaIdx] = pesertaForm as KeuanganPeserta;
    } else {
      list.push(pesertaForm as KeuanganPeserta);
    }
    setFormData({ ...formData, peserta: list });
    setShowPesertaModal(false);
  };

  const closePesertaModal = () => {
    setShowPesertaModal(false);
    setEditingPesertaIdx(null);
    setPesertaForm({});
  };

  const updatePesertaForm = (field: keyof KeuanganPeserta, value: any) => {
    setPesertaForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePesertaSelectForm = (nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) {
      setPesertaForm(prev => ({ ...prev, nip: p.nip, nama: p.nama, jabatan: p.jabatan }));
    }
  };

  const addRincianForm = () => {
    const rb = [...(pesertaForm.rincianBiaya || [])];
    rb.push({ item: '', rate: 0, qty: 1, total: 0 });
    setPesertaForm(prev => ({ ...prev, rincianBiaya: rb }));
  };

  const updateRincianForm = (rIdx: number, field: string, value: any) => {
    const rb = [...(pesertaForm.rincianBiaya || [])];
    rb[rIdx] = { ...rb[rIdx], [field]: value };
    if (field === 'rate' || field === 'qty') {
      rb[rIdx].total = (rb[rIdx].rate || 0) * (rb[rIdx].qty || 0);
    }
    const total = rb.reduce((acc, curr) => acc + (curr.total || 0), 0);
    setPesertaForm(prev => ({ ...prev, rincianBiaya: rb, totalJumlah: total }));
  };

  const removeRincianForm = (rIdx: number) => {
    const rb = (pesertaForm.rincianBiaya || []).filter((_, i) => i !== rIdx);
    const total = rb.reduce((acc, curr) => acc + (curr.total || 0), 0);
    setPesertaForm(prev => ({ ...prev, rincianBiaya: rb, totalJumlah: total }));
  };

  const resetPesertaToStandard = () => {
    const rb: any[] = [];
    if (formData.configBiaya?.uangHarian) rb.push({ item: 'Uang Harian', rate: formData.configBiaya.uangHarian, qty: 1, total: formData.configBiaya.uangHarian });
    if (formData.configBiaya?.penginapan) rb.push({ item: 'Biaya Penginapan', rate: formData.configBiaya.penginapan, qty: 1, total: formData.configBiaya.penginapan });
    if (formData.configBiaya?.transport) rb.push({ item: 'Biaya Transport', rate: formData.configBiaya.transport, qty: 1, total: formData.configBiaya.transport });
    if (formData.configBiaya?.fullboard) rb.push({ item: 'Uang Harian Fullboard', rate: formData.configBiaya.fullboard, qty: 1, total: formData.configBiaya.fullboard });
    if (formData.configBiaya?.halfboard) rb.push({ item: 'Uang Harian Halfboard', rate: formData.configBiaya.halfboard, qty: 1, total: formData.configBiaya.halfboard });
    
    setPesertaForm(prev => ({
      ...prev,
      rincianBiaya: rb,
      totalJumlah: rb.reduce((acc, curr) => acc + curr.total, 0),
      nomorSpd: formData.configSpd?.nomorSpdPrefix || prev.nomorSpd,
      tanggalSpd: formData.configSpd?.tanggalSpd || prev.tanggalSpd,
      tanggalBerangkat: formData.configSpd?.tanggalBerangkat || prev.tanggalBerangkat,
      tanggalPulang: formData.configSpd?.tanggalPulang || prev.tanggalPulang,
      tujuanPerjalanan: formData.configSpd?.tujuanPerjalanan || prev.tujuanPerjalanan,
    }));
  };

  const updatePeserta = (idx: number, field: keyof KeuanganPeserta, value: any) => {
    const list = [...(formData.peserta || [])];
    list[idx] = { ...list[idx], [field]: value };
    setFormData({ ...formData, peserta: list });
  };

  const handlePesertaSelect = (idx: number, nip: string) => {
    const p = pegawai.find(x => x.nip === nip);
    if (p) {
      const list = [...(formData.peserta || [])];
      list[idx] = { ...list[idx], nip: p.nip, nama: p.nama, jabatan: p.jabatan };
      setFormData({ ...formData, peserta: list });
    }
  };

  const addRincian = (pIdx: number) => {
    const list = [...(formData.peserta || [])];
    list[pIdx].rincianBiaya.push({ item: '', rate: 0, qty: 1, total: 0 });
    setFormData({ ...formData, peserta: list });
  };

  const updateRincian = (pIdx: number, rIdx: number, field: string, value: any) => {
    const list = [...(formData.peserta || [])];
    const rincian = [...list[pIdx].rincianBiaya];
    rincian[rIdx] = { ...rincian[rIdx], [field]: value };
    if (field === 'rate' || field === 'qty') {
      rincian[rIdx].total = (rincian[rIdx].rate || 0) * (rincian[rIdx].qty || 0);
    }
    list[pIdx].rincianBiaya = rincian;
    list[pIdx].totalJumlah = rincian.reduce((acc, curr) => acc + (curr.total || 0), 0);
    setFormData({ ...formData, peserta: list });
  };

  const removePeserta = (idx: number) => {
    setFormData({ ...formData, peserta: (formData.peserta || []).filter((_, i) => i !== idx) });
  };

  const removeRincian = (pIdx: number, rIdx: number) => {
    const list = [...(formData.peserta || [])];
    list[pIdx].rincianBiaya = list[pIdx].rincianBiaya.filter((_, i) => i !== rIdx);
    list[pIdx].totalJumlah = list[pIdx].rincianBiaya.reduce((acc, curr) => acc + curr.total, 0);
    setFormData({ ...formData, peserta: list });
  };

  const updateConfigBiaya = (field: string, value: number) => {
    setFormData({
      ...formData,
      configBiaya: {
        ...(formData.configBiaya || { uangHarian: 0, penginapan: 0, transport: 0, fullboard: 0, halfboard: 0 }),
        [field]: value
      }
    });
  };

  const applyConfigToAll = () => {
    if (!formData.configBiaya || !formData.peserta) return;
    const { uangHarian, penginapan, transport, fullboard, halfboard } = formData.configBiaya;
    
    const newList = formData.peserta.map(p => {
      const rincian = [...p.rincianBiaya];
      
      const updateOrAdd = (name: string, rate: number) => {
        const idx = rincian.findIndex(r => r.item.toLowerCase().includes(name.toLowerCase()));
        if (idx !== -1) {
          rincian[idx] = { ...rincian[idx], rate, total: rate * rincian[idx].qty };
        } else if (rate > 0) {
          rincian.push({ item: name, rate, qty: 1, total: rate });
        }
      };

      if (uangHarian !== undefined) updateOrAdd('Uang Harian', uangHarian);
      if (penginapan !== undefined) updateOrAdd('Biaya Penginapan', penginapan);
      if (transport !== undefined) updateOrAdd('Uang Transport', transport);
      if (fullboard !== undefined) updateOrAdd('Uang Harian Fullboard', fullboard);
      if (halfboard !== undefined) updateOrAdd('Uang Harian Halfboard', halfboard);

      return {
        ...p,
        rincianBiaya: rincian,
        totalJumlah: rincian.reduce((acc, curr) => acc + (curr.total || 0), 0)
      };
    });

    setFormData({ ...formData, peserta: newList });
  };

  const updateConfigSpd = (field: string, value: string) => {
    setFormData({
      ...formData,
      configSpd: {
        ...(formData.configSpd || { nomorSpdPrefix: '', tanggalSpd: '', tanggalBerangkat: '', tanggalPulang: '', tujuanPerjalanan: '' }),
        [field]: value
      }
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const terbilang = (n: number): string => {
    const digit = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    if (n < 12) return digit[n];
    if (n < 20) return terbilang(n - 10) + " Belas";
    if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
    if (n < 200) return "Seratus " + terbilang(n - 100);
    if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
    if (n < 2000) return "Seribu " + terbilang(n - 1000);
    if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
    if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
    return "";
  };

  const formatRupiah = (value: number | undefined) => {
    if (value === undefined || value === null) return "";
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const parseRawValue = (displayValue: string) => {
    return parseFloat(displayValue.replace(/\./g, "")) || 0;
  };

  const handleDownloadPdf = async () => {
  if (!pdfRef.current) return;
  setLoading(true);
  
  try {
    const isKuitansi = previewType === 'kuitansi';
    
    const canvas = await html2canvas(pdfRef.current, { 
      scale: 3, // Supaya hasil scan tajam/HD
      useCORS: true, 
      logging: false,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Inisialisasi PDF berdasarkan tipe
    const pdf = new jsPDF({ 
      orientation: isKuitansi ? 'landscape' : 'portrait', 
      unit: 'mm', 
      format: isKuitansi ? 'a5' : 'a4' 
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Standard Shift Logic for Multi-page
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 1) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`${previewType.toUpperCase()}_${currentPeserta?.nama || 'Dokumen'}.pdf`);
  } catch (e) {
    console.error(e);
    alert("Gagal cetak!");
  } finally {
    setLoading(false);
  }
};

  const handleDownloadExcelParticipants = (record: KeuanganRecord) => {
    if (!record.peserta || record.peserta.length === 0) {
      alert("Tidak ada data peserta untuk diunduh.");
      return;
    }
    const data = record.peserta.map((p, index) => ({
      'No': index + 1,
      'Nama': p.nama,
      'NIP': p.nip || '-',
      'Jabatan': p.jabatan,
      'Kategori': p.kategori,
      'Nomor SPD': p.nomorSpd,
      'Tanggal SPD': p.tanggalSpd,
      'Tujuan': p.tujuanPerjalanan,
      'Total Biaya': p.totalJumlah
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Peserta");
    XLSX.writeFile(wb, `Peserta_${record.namaKegiatan.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDownloadAllActivitiesExcel = () => {
    const data = records.map((r, idx) => ({
      'No': idx + 1,
      'Nama Kegiatan': r.namaKegiatan,
      'Tanggal': r.tanggal,
      'Mata Anggaran': r.mataAnggaran,
      'Tahun': r.tahunAnggaran,
      'Unit Kerja': r.unitKerja,
      'Status': r.status,
      'Jumlah Peserta': r.peserta.length,
      'Total Biaya': r.peserta.reduce((acc, p) => acc + p.totalJumlah, 0)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kegiatan_Keuangan");
    XLSX.writeFile(wb, `Data_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintAllDocuments = async (record: KeuanganRecord, type: typeof previewType) => {
    if (!record.peserta || record.peserta.length === 0) return;
    setLoading(true);
    try {
      const isKuitansi = type === 'kuitansi';
      const pdf = new jsPDF({ 
        orientation: isKuitansi ? 'landscape' : 'portrait', 
        unit: 'mm', 
        format: isKuitansi ? 'a5' : 'a4' 
      });

      for (let i = 0; i < record.peserta.length; i++) {
        setSelectedPesertaIdx(i);
        // Wait for React to render the new participant
        await new Promise(resolve => setTimeout(resolve, 600)); 
        
        if (pdfRef.current) {
          const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
          const imgWidth = isKuitansi ? (isKuitansi ? 210 : 210) : 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (i > 0) pdf.addPage(isKuitansi ? 'a5' : 'a4', isKuitansi ? 'landscape' : 'portrait');
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
        }
      }
      
      pdf.save(`ALL_${type.toUpperCase()}_${record.namaKegiatan.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { 
      console.error(e);
      alert("Gagal cetak semua dokumen."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDownloadFullBundle = async (record: KeuanganRecord) => {
    if (!record.peserta || record.peserta.length === 0) return;
    setLoading(true);
    try {
      const types: (typeof previewType)[] = ['kuitansi', 'rincian', 'riil', 'spb', 'sptjm'];
      const pdf = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'mm', 
        format: 'a5' 
      });

      let isFirst = true;

      for (let i = 0; i < record.peserta.length; i++) {
        setSelectedPesertaIdx(i);
        for (const type of types) {
          setPreviewType(type);
          // Wait for React to render
          await new Promise(resolve => setTimeout(resolve, 800)); 
          
          if (pdfRef.current) {
            const isKuitansi = type === 'kuitansi';
            const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
            
            if (!isFirst) {
              pdf.addPage(isKuitansi ? 'a5' : 'a4', isKuitansi ? 'landscape' : 'portrait');
            }
            isFirst = false;

            const imgWidth = isKuitansi ? 210 : 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
          }
        }
      }
      
      pdf.save(`BUNDLE_LENGKAP_${record.namaKegiatan.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { 
      console.error(e);
      alert("Gagal cetak bundle dokumen."); 
    } finally { 
      setLoading(false); 
    }
  };

  const currentPeserta = formData.peserta?.[selectedPesertaIdx];

  const rincianRiil = useMemo(() => {
    return (currentPeserta?.rincianBiaya || []).filter(item => 
      item.item.toLowerCase().includes('transport')
    );
  }, [currentPeserta]);

  const totalRiil = useMemo(() => {
    return rincianRiil.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [rincianRiil]);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete} title="Hapus Kegiatan" message="Apakah Anda yakin ingin menghapus seluruh data kegiatan ini?" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Pertanggungjawaban Keuangan</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
            <i className="bi bi-cash-stack text-emerald-600"></i> Manajemen Kegiatan & Peserta
          </p>
        </div>
        <div className="flex gap-2 no-print">
          {activeView === 'list' ? (
            <>
              <button onClick={handleDownloadAllActivitiesExcel} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-200 flex items-center gap-2 active:scale-95 transition-all">
                <i className="bi bi-file-earmark-excel"></i> Rekap Excel
              </button>
              {(canEdit || isSuperadmin) && (
                <button onClick={() => { 
                  const today = new Date().toISOString().split('T')[0];
                  setFormData({ 
                    namaKegiatan: '', 
                    tanggal: today, 
                    mataAnggaran: '', 
                    tahunAnggaran: new Date().getFullYear().toString(), 
                    ppkNip: '', 
                    ppkNama: '', 
                    bendaharaNip: '', 
                    bendaharaNama: '', 
                    unitKerja: UNIT_KERJA[0], 
                    status: 'Draft', 
                    transactionId: `RE-SEK/${new Date().getFullYear()}/IV/0103`, 
                    kotaTtd: 'Bogor',
                    tanggalDokumen: today,
                    peserta: [] 
                  }); 
                  setDocCity('Bogor');
                  setDocDate(today);
                  setActiveView('editor'); 
                }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-200 flex items-center gap-2 active:scale-95 transition-all">
                  <i className="bi bi-plus-lg"></i> Buat Kegiatan Baru
                </button>
              )}
            </>
          ) : activeView === 'preview' ? (
            <div className="flex gap-2">
              <button onClick={handlePrintBrowser} className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 hover:bg-orange-700 transition-all active:scale-95">
                <i className="bi bi-printer-fill"></i> Cetak Browser
              </button>
              <button onClick={handleDownloadPdf} className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2">
                <i className="bi bi-file-earmark-pdf-fill"></i> Simpan PDF
              </button>
              <button onClick={() => handlePrintAllDocuments(formData as KeuanganRecord, previewType)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                <i className="bi bi-printer-fill"></i> Cetak Semua ({formData.peserta?.length})
              </button>
              <button onClick={() => setActiveView('editor')} className="px-8 py-3 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Kembali</button>
            </div>
          ) : (
            <button onClick={() => setActiveView('list')} className="px-8 py-3 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Batal</button>
          )}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="text" placeholder="Cari nama kegiatan..." className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="px-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option>Semua Status</option>
              <option>Draft</option>
              <option>Diajukan</option>
              <option>Disetujui</option>
              <option>Ditolak</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <div className="bg-white p-20 rounded-[3rem] text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest border border-gray-100">Memuat data kegiatan...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white p-20 rounded-[3rem] text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest border border-gray-100">Belum ada kegiatan keuangan</div>
            ) : filteredRecords.map(r => (
              <div key={r.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${
                        r.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        r.status === 'Ditolak' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        r.status === 'Diajukan' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}>{r.status}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{r.mataAnggaran}</span>
                    </div>
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">{r.namaKegiatan}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                      {new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {r.peserta.length} Peserta • Total: {formatCurrency(r.peserta.reduce((acc, p) => acc + p.totalJumlah, 0))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownloadExcelParticipants(r)} className="h-12 w-12 bg-white border border-gray-100 text-emerald-600 rounded-2xl flex items-center justify-center hover:text-emerald-700 hover:border-emerald-100 transition-all shadow-sm" title="Download Excel Peserta">
                      <i className="bi bi-file-earmark-excel"></i>
                    </button>
                    <button onClick={() => handleDownloadFullBundle(r)} className="h-12 w-12 bg-white border border-gray-100 text-rose-600 rounded-2xl flex items-center justify-center hover:text-rose-700 hover:border-rose-100 transition-all shadow-sm" title="Download Semua PDF (Kuitansi, Rincian, dll)">
                      <i className="bi bi-file-earmark-pdf"></i>
                    </button>
                      {(canEdit || isSuperadmin) && (
                      <>
                        <button onClick={() => { 
                          setFormData(r); 
                          setDocCity(r.kotaTtd || 'Bogor');
                          setDocDate(r.tanggalDokumen || r.tanggal);
                          setActiveView('editor'); 
                        }} className="h-12 px-6 bg-white border border-gray-100 text-gray-600 rounded-2xl flex items-center gap-2 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm font-black text-[10px] uppercase">
                          <i className="bi bi-pencil-square"></i> Edit & Peserta
                        </button>
                        <button onClick={() => { setSelectedId(r.id); setShowConfirm(true); }} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm">
                          <i className="bi bi-trash3"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-6xl mx-auto space-y-8 animate-modalEnter">
          <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-gray-100 shadow-sm space-y-10">
            <div className="space-y-8">
              <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest">1. Konfigurasi Kegiatan</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-full space-y-2">
                  <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Nama Kegiatan</label>
                  <input type="text" placeholder="Contoh: Konsinyering Penyusunan Pola Karir ASN" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.namaKegiatan} onChange={e => setFormData({ ...formData, namaKegiatan: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Mata Anggaran (MAK)</label>
                  <input type="text" placeholder="Contoh: 1597/950/058/AD/524119" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.mataAnggaran} onChange={e => setFormData({ ...formData, mataAnggaran: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Tanggal</label>
                    <input type="date" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Tahun</label>
                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.tahunAnggaran} onChange={e => setFormData({ ...formData, tahunAnggaran: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Kota TTD Dokumen</label>
                    <input type="text" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.kotaTtd || ''} onChange={e => {
                      setFormData({ ...formData, kotaTtd: e.target.value });
                      setDocCity(e.target.value);
                    }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Tanggal Dokumen</label>
                    <input type="date" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.tanggalDokumen || ''} onChange={e => {
                      setFormData({ ...formData, tanggalDokumen: e.target.value });
                      setDocDate(e.target.value);
                    }} />
                  </div>
                </div>
                <div className="space-y-4">
                  <SearchableSelect label="Pejabat Pembuat Komitmen (PPK)" options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={formData.ppkNip || ''} onChange={handlePPKChange} />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Nama PPK (Manual)" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formData.ppkNama || ''} onChange={e => setFormData({ ...formData, ppkNama: e.target.value })} />
                    <input type="text" placeholder="NIP PPK (Manual)" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formData.ppkNip || ''} onChange={e => setFormData({ ...formData, ppkNip: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-4">
                  <SearchableSelect label="Bendahara Pengeluaran" options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={formData.bendaharaNip || ''} onChange={handleBendaharaChange} />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Nama Bendahara (Manual)" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formData.bendaharaNama || ''} onChange={e => setFormData({ ...formData, bendaharaNama: e.target.value })} />
                    <input type="text" placeholder="NIP Bendahara (Manual)" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={formData.bendaharaNip || ''} onChange={e => setFormData({ ...formData, bendaharaNip: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Unit Kerja</label>
                  <select className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.unitKerja} onChange={e => setFormData({ ...formData, unitKerja: e.target.value })}>
                    {UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Status</label>
                  <select className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                    <option>Draft</option>
                    <option>Diajukan</option>
                    {isSuperadmin && (
                      <>
                        <option>Disetujui</option>
                        <option>Ditolak</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 ml-3 tracking-widest">Transaction ID (Kuitansi)</label>
                  <input type="text" placeholder="RE-SEK/2024/IV/0103" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.transactionId || ''} onChange={e => setFormData({ ...formData, transactionId: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest">2. Standar Biaya & SPD (Acuan Peserta)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <p className="text-[9px] font-black text-gray-400 ml-3 tracking-widest border-l-4 border-blue-600 pl-3">Standar Biaya Satuan</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-2">Uang Harian (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.uangHarian)} onChange={e => updateConfigBiaya('uangHarian', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-2">Penginapan (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.penginapan)} onChange={e => updateConfigBiaya('penginapan', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-2">Transport (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.transport)} onChange={e => updateConfigBiaya('transport', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-2">Fullboard (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.fullboard)} onChange={e => updateConfigBiaya('fullboard', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-2">Halfboard (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.halfboard)} onChange={e => updateConfigBiaya('halfboard', parseRawValue(e.target.value))} />
                    </div>
                  </div>
                  <button 
                    onClick={applyConfigToAll}
                    type="button"
                    className="mt-4 w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <i className="bi bi-person-check-fill text-lg"></i>
                    Terapkan Standar Biaya ke Seluruh Peserta
                  </button>
                </div>
                <div className="space-y-6">
                  <p className="text-[9px] font-black text-gray-400 ml-3 tracking-widest border-l-4 border-emerald-600 pl-3">Standar Data SPD</p>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-2">Nomor SPD (Prefix/Default)</label>
                      <input type="text" placeholder="Contoh: SPD/001/DJKI/2024" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.configSpd?.nomorSpdPrefix || ''} onChange={e => updateConfigSpd('nomorSpdPrefix', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 text-center bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                         <label className="text-[8px] font-black text-blue-600 block mb-1">DARI (BERANGKAT)</label>
                         <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none focus:border-blue-600 shadow-sm" value={formData.configSpd?.tanggalBerangkat || ''} onChange={e => updateConfigSpd('tanggalBerangkat', e.target.value)} />
                      </div>
                      <div className="space-y-1 text-center bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                         <label className="text-[8px] font-black text-rose-600 block mb-1">SAMPAI (PULANG)</label>
                         <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none focus:border-blue-600 shadow-sm" value={formData.configSpd?.tanggalPulang || ''} onChange={e => updateConfigSpd('tanggalPulang', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 ml-2">Tanggal SPD (SK)</label>
                        <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.configSpd?.tanggalSpd || ''} onChange={e => updateConfigSpd('tanggalSpd', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 ml-2">Tujuan Perjalanan</label>
                        <input type="text" placeholder="Contoh: Jakarta - Bogor" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.configSpd?.tujuanPerjalanan || ''} onChange={e => updateConfigSpd('tujuanPerjalanan', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                <i className="bi bi-info-circle-fill text-blue-600"></i>
                <p className="text-[9px] font-bold text-blue-800 leading-relaxed">Nilai di atas akan otomatis digunakan sebagai data awal saat Anda menambahkan peserta baru.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex flex-col">
                  <h5 className="text-[10px] font-black text-blue-600 tracking-widest uppercase">3. Daftar Peserta & Perincian</h5>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleDownloadExcelParticipants(formData as KeuanganRecord)} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-sm hover:bg-emerald-100 transition-all">
                      <Download size={12} /> Excel Peserta
                    </button>
                    <button onClick={() => handleDownloadFullBundle(formData as KeuanganRecord)} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-sm hover:bg-rose-100 transition-all">
                      <Download size={12} /> Download Semua PDF
                    </button>
                  </div>
                </div>
                <button onClick={openAddPesertaModal} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                  <Plus size={16} /> Tambah Peserta
                </button>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar pb-3 touch-pan-x">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">No</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Nama / NIP</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Kategori</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Tujuan / SPD</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Biaya</th>
                      <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center sticky right-0 bg-gray-50 border-l border-gray-100 min-w-[120px] shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(formData.peserta || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Belum ada peserta ditambahkan</td>
                      </tr>
                    ) : (
                      (formData.peserta || []).map((p, pIdx) => (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition-all group">
                          <td className="px-6 py-4 text-[11px] font-bold text-gray-500">{pIdx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-gray-900">{formatPegawaiName(p.nama)}</span>
                              <span className="text-[9px] font-bold text-gray-400">NIP. {p.nip || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase border border-blue-100">{p.kategori}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-gray-600">{p.tujuanPerjalanan}</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{p.nomorSpd}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[11px] font-black text-gray-900">{formatCurrency(p.totalJumlah)}</td>
                          <td className="px-6 py-4 sticky right-0 bg-white shadow-[-10px_0_15px_-5px_rgba(0,0,0,0.05)] border-l border-gray-50 min-w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => {
                                setSelectedPesertaIdx(pIdx);
                                setPreviewType('kuitansi');
                                setActiveView('preview');
                                setDocCity(formData.kotaTtd || 'Bogor');
                                setDocDate(formData.tanggalDokumen || formData.tanggal || new Date().toISOString().split('T')[0]);
                              }} className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-all" title="View / Print">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => openEditPesertaModal(pIdx)} className="h-8 w-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-all" title="Edit">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => removePeserta(pIdx)} className="h-8 w-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-100 transition-all" title="Hapus">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>

            <div className="pt-10 border-t flex justify-center">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-200 active:scale-95 transition-all flex items-center gap-3">
                {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Simpan Seluruh Data Kegiatan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Modal */}
      {showPesertaModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closePesertaModal}></div>
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl relative overflow-hidden animate-modalEnter flex flex-col max-h-[90vh]">
            <div className="px-6 md:px-10 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                  {editingPesertaIdx !== null ? 'Edit Peserta' : 'Tambah Peserta'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Lengkapi data perjalanan & biaya</p>
              </div>
              <button onClick={closePesertaModal} className="h-10 w-10 bg-white border border-gray-200 text-gray-400 rounded-xl flex items-center justify-center hover:text-rose-600 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-10">
              {/* Peserta Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <SearchableSelect 
                    label="Pilih Pegawai" 
                    options={pegawai.map(x => ({ value: x.nip, label: x.nama, subLabel: x.jabatan }))} 
                    value={pesertaForm.nip || ''} 
                    onChange={handlePesertaSelectForm} 
                  />
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 ml-3 uppercase tracking-widest">Nama Lengkap</label>
                       <input 
                         type="text" 
                         placeholder="Nama Lengkap" 
                         className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" 
                         value={pesertaForm.nama || ''} 
                         onChange={e => updatePesertaForm('nama', e.target.value)} 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 ml-3 uppercase tracking-widest">Jabatan</label>
                       <input 
                         type="text" 
                         placeholder="Jabatan" 
                         className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" 
                         value={pesertaForm.jabatan || ''} 
                         onChange={e => updatePesertaForm('jabatan', e.target.value)} 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 ml-3 uppercase tracking-widest">Kategori Perjalanan</label>
                       <select 
                         className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" 
                         value={pesertaForm.kategori || 'SPPD'} 
                         onChange={e => updatePesertaForm('kategori', e.target.value)}
                       >
                         <option>SPPD</option>
                         <option>Fullboard</option>
                         <option>Halfboard</option>
                         <option>Transport</option>
                         <option>Honorarium</option>
                         <option>Lainnya</option>
                       </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-3 uppercase tracking-widest">Nomor SPD</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600" value={pesertaForm.nomorSpd || ''} onChange={e => updatePesertaForm('nomorSpd', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 ml-3 uppercase tracking-widest">Tanggal SPD</label>
                      <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600" value={pesertaForm.tanggalSpd || ''} onChange={e => updatePesertaForm('tanggalSpd', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-blue-600 ml-2 uppercase">Keberangkatan</label>
                       <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={pesertaForm.tanggalBerangkat || ''} onChange={e => updatePesertaForm('tanggalBerangkat', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-rose-600 ml-2 uppercase">Kepulangan</label>
                       <input type="date" className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[11px] font-bold outline-none" value={pesertaForm.tanggalPulang || ''} onChange={e => updatePesertaForm('tanggalPulang', e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 ml-3 uppercase tracking-widest">Tujuan Perjalanan</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Jakarta - Bogor" 
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" 
                      value={pesertaForm.tujuanPerjalanan || ''} 
                      onChange={e => updatePesertaForm('tujuanPerjalanan', e.target.value)} 
                    />
                  </div>

                  <button 
                    onClick={resetPesertaToStandard}
                    className="w-full py-3 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-blue-100 hover:bg-blue-100 transition-all"
                  >
                    <RefreshCw size={14} /> Reset ke Config Standar
                  </button>
                </div>
              </div>

              {/* Rincian Biaya Section */}
              <div className="space-y-6 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h6 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Rincian Biaya</h6>
                  <button onClick={addRincianForm} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-blue-700 shadow-md shadow-blue-100 transition-all">
                    <Plus size={14} /> Tambah Baris
                  </button>
                </div>

                <div className="bg-gray-50 rounded-3xl p-4 md:p-6 border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto custom-scrollbar pb-2 touch-pan-x">
                    <div className="space-y-3 min-w-[700px] md:min-w-[850px] py-1">
                      {(pesertaForm.rincianBiaya || []).map((r, rIdx) => (
                        <div key={rIdx} className="grid grid-cols-12 gap-2 md:gap-3 items-center">
                          <div className="col-span-4 md:col-span-5">
                            <input 
                              type="text" 
                              placeholder="Deskripsi" 
                              className="w-full px-3 md:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] md:text-[11px] font-bold outline-none focus:border-blue-600" 
                              value={r.item} 
                              onChange={e => updateRincianForm(rIdx, 'item', e.target.value)} 
                            />
                          </div>
                          <div className="col-span-3 md:col-span-3">
                            <input 
                              type="text" 
                              placeholder="Nilai" 
                              className="w-full px-3 md:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] md:text-[11px] font-bold outline-none focus:border-blue-600" 
                              value={formatRupiah(r.rate)} 
                              onChange={e => updateRincianForm(rIdx, 'rate', parseRawValue(e.target.value))} 
                            />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <input 
                              type="number" 
                              className="w-full px-2 md:px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] md:text-[11px] font-bold outline-none text-center" 
                              value={r.qty} 
                              onChange={e => updateRincianForm(rIdx, 'qty', parseInt(e.target.value) || 0)} 
                            />
                          </div>
                          <div className="col-span-2 md:col-span-2 text-right font-black text-[10px] md:text-[11px] text-gray-900 pr-1 md:pr-2">
                            {formatCurrency(r.total)}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button onClick={() => removeRincianForm(rIdx)} className="h-8 w-8 md:h-9 md:w-9 bg-white text-rose-400 rounded-xl flex items-center justify-center hover:text-rose-600 transition-all border border-gray-100 shadow-sm">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end items-center gap-6">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Biaya Peserta</span>
                    <span className="text-xl font-black text-gray-900">{formatCurrency(pesertaForm.totalJumlah || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 md:px-10 py-6 md:py-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={closePesertaModal} className="px-8 py-3 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm active:scale-95 transition-all">
                Batal
              </button>
              <button onClick={savePesertaModal} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
                <Save size={16} /> Simpan Peserta
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="space-y-8">
          <div className="flex flex-col gap-4 no-print max-w-2xl mx-auto">
            <div className="flex overflow-x-auto gap-4 py-2 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 no-print">
               {['kuitansi', 'rincian', 'riil', 'spb', 'sptjm', 'all'].map(type => (
                <button key={type} onClick={() => setPreviewType(type as any)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all shrink-0 ${previewType === type ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}>
                  {type === 'all' ? 'Cetak Semua' : type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {previewType === 'all' && (
              <div className="flex justify-center no-print mt-2">
                <button 
                  onClick={handlePrintBrowser}
                  className="px-8 py-4 bg-orange-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase shadow-xl shadow-orange-100 flex items-center gap-3 hover:bg-orange-700 transition-all transform hover:-translate-y-1 active:scale-95"
                >
                  <i className="bi bi-printer text-[14px]"></i> Cetak Sekarang (Langsung ke Printer)
                </button>
              </div>
            )}
            
            <div className="flex justify-center gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm no-print">
              <div className="space-y-1 flex-1">
                <label className="text-[8px] font-black text-gray-400 ml-2 tracking-widest">Kota TTD</label>
                <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-600 transition-all" value={docCity} onChange={e => {
                  setDocCity(e.target.value);
                  setFormData(prev => ({ ...prev, kotaTtd: e.target.value }));
                }} />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-[8px] font-black text-gray-400 ml-2 tracking-widest">Tanggal Dokumen</label>
                <input type="date" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold outline-none focus:border-blue-600 transition-all" value={docDate} onChange={e => {
                  setDocDate(e.target.value);
                  setFormData(prev => ({ ...prev, tanggalDokumen: e.target.value }));
                }} />
              </div>
              <div className="flex flex-col justify-end">
                <button 
                  onClick={handleSave} 
                  disabled={syncing}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  {syncing ? <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-check"></i>}
                  Simpan
                </button>
              </div>
            </div>
          </div>

        

          {currentPeserta ? (
            <div className="bg-gray-100 p-2 md:p-4 overflow-x-auto custom-scrollbar no-bg-print">
                       <style>
                         {`
                           @media print {
                             @page {
                               size: ${previewType === 'kuitansi' ? 'A5 landscape' : 'A4 portrait'};
                               margin: 0;
                             }
                             body * {
                               visibility: hidden;
                             }
                             .no-bg-print {
                               background: white !important;
                               padding: 0 !important;
                             }
                             #printable-content, #printable-content * {
                               visibility: visible;
                             }
                             #printable-content {
                               position: absolute;
                               left: 0;
                               top: 0;
                               width: 100%;
                               margin: 0;
                               padding: 0;
                               box-shadow: none !important;
                             }
                             .no-print {
                               display: none !important;
                             }
                             .page-break {
                               page-break-after: always !important;
                               display: block !important;
                             }
                           }
                         `}
                       </style>
                      <div 
                        ref={pdfRef} 
                        id="printable-content"
                        className={`bg-white shadow-xl mx-auto ${previewType === 'all' ? 'print:shadow-none print:m-0 print:w-full' : ''}`}
                        style={{ 
                          width: "210mm", 
                          minHeight: previewType === 'kuitansi' ? "148mm" : "297mm", 
                          padding: (previewType === 'kuitansi' || previewType === 'spb' || previewType === 'all') ? "10mm" : "20mm 20mm 25mm 30mm",
                          boxSizing: "border-box" 
                        }}
                      >
                       {previewType === 'all' && (
                         <style>
                           {`
                             @media print {
                               .page-break { page-break-after: always !important; display: block !important; padding-top: 20mm !important; }
                               .no-print { display: none !important; }
                               body { background: white !important; }
                             }
                           `}
                         </style>
                       )}

                       {(previewType === "kuitansi" || previewType === "all") && (
                         <div className={previewType === 'all' ? 'page-break mb-20 pb-20 border-b-4 border-dashed border-gray-100 last:border-b-0' : 'h-full'}>
                           <div className="border-[1.5pt] border-black text-[9pt] leading-tight h-full flex flex-col p-4 font-sans text-black">
                          {/* HEADER SECTION */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="font-bold">
                              Transaction ID : {formData.transactionId || `RE-SEK/${formData.tahunAnggaran}/IV/0103`}
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-[7pt] italic text-left mb-4">
                                <p>LAMPIRAN</p>
                                <p>PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA</p>
                                <p>NOMOR 190/PMK.05/2012 TENTANG TATA CARA PEMBAYARAN </p>
                                <p>DALAM RANGKA PELAKSANAAN ANGGARAN PENDAPATAN</p>
                                <p>BELANJA NEGARA</p>
                              </div>
                              <div className="font-bold text-[10pt] mb-2 pr-4">{selectedPesertaIdx + 1}</div>
                              <div className="grid grid-cols-[140px_5px_1fr] gap-x-1 text-[9pt] text-left">
                                <span>Tahun Anggaran</span><span>:</span><span>{formData.tahunAnggaran}</span>
                                <span>Nomor Bukti</span><span>:</span><span>{selectedPesertaIdx + 1}</span>
                                <span>Mata Anggaran</span><span>:</span><span className="break-all">{formData.mataAnggaran}</span>
                              </div>
                            </div>
                          </div>

                          {/* TITLE */}
                          <div className="py-2 text-center">
                            <h2 className="text-[11pt] font-bold underline tracking-widest">KUITANSI / BUKTI PEMBAYARAN</h2>
                          </div>

                          {/* CONTENT SECTION */}
                          <div className="px-4 space-y-3 flex-1 mt-4">
                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start">
                              <span className="font-medium">Sudah terima dari</span><span>:</span>
                              <span>Kuasa Pengguna Anggaran / Pejabat Pembuat Komitmen Satker Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum RI</span>
                            </div>

                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-center">
                              <span className="font-medium">Jumlah Uang</span><span>:</span>
                              <span className="font-bold text-[10pt]">
                                {formatCurrency(currentPeserta?.totalJumlah || 0)}
                              </span>
                            </div>

                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start italic">
                              <span className="font-medium">Terbilang</span><span>:</span>
                              <span className="font-semibold text-gray-800 Proper Case"> {terbilang(currentPeserta?.totalJumlah || 0)} Rupiah</span>
                            </div>

                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start">
                              <span className="shrink-0 font-medium">Untuk Pembayaran</span><span>:</span>
                              <span className="leading-normal">
                                Biaya {formData.namaKegiatan} {currentPeserta?.tujuanPerjalanan ? `Ke ${currentPeserta.tujuanPerjalanan}` : ''} pada tanggal {currentPeserta?.tanggalBerangkat && currentPeserta?.tanggalPulang && currentPeserta.tanggalBerangkat !== currentPeserta.tanggalPulang
                                  ? `${new Date(currentPeserta.tanggalBerangkat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})} sampai dengan ${new Date(currentPeserta.tanggalPulang).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}`
                                  : (currentPeserta?.tanggalBerangkat 
                                    ? new Date(currentPeserta.tanggalBerangkat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) 
                                    : (currentPeserta?.tanggalSpd ? new Date(currentPeserta.tanggalSpd).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'))}. 
                              </span>
                            </div>

                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start">
                              <span className="shrink-0 font-medium">Berdasarkan SPD</span><span>:</span>
                              <span className="leading-normal">
                                Sekretaris Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum RI
                              </span>
                            </div>

                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start ml-4">
                              <span>Nomor</span><span>:</span><span>{currentPeserta?.nomorSpd}</span>
                            </div>
                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start ml-4">
                              <span>Tanggal</span><span>:</span><span>{currentPeserta?.tanggalSpd ? new Date(currentPeserta.tanggalSpd).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</span>
                            </div>
                            <div className="grid grid-cols-[150px_10px_1fr] gap-x-2 items-start ml-4">
                              <span>Untuk Perjalanan Dinas dari</span><span>:</span><span>{currentPeserta?.tujuanPerjalanan}</span>
                            </div>
                          </div>

                          {/* SIGNATURE AREA */}
                          <div className="mt-8 border-t-[1pt] border-black">
                            <div className="grid grid-cols-2 text-[8.5pt]">
                              <div className="p-4 text-center space-y-12">
                                <div>
                                  <p>a.n Kuasa Pengguna Anggaran</p>
                                  <p>Pejabat Pembuat Komitmen</p>
                                </div>
                                <div>
                                  <p className="font-bold">{formatSignatoryName(formData.ppkNama || '')}</p>
                                  <p>NIP. {formData.ppkNip}</p>
                                </div>
                              </div>
                              
                              <div className="p-4 text-center space-y-12">
                                <div>
                                  <p>{docCity}, {new Date(docDate).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"})}</p>
                                  <p>Yang Menerima,</p>
                                </div>
                                <div>
                                  <p className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</p>
                                  <p>NIP. {currentPeserta?.nip}</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 border-t border-black p-2 text-center text-[8.5pt]">
                              <p className="">Lunas dibayar tanggal, {new Date(docDate).toLocaleDateString("id-ID", {day:"numeric",month:"long",year:"numeric"})}</p>
                              <p>Bendahara Pengeluaran</p>
                              <div className="mt-12">
                                <p className="font-bold">{formatSignatoryName(formData.bendaharaNama || '')}</p>
                                <p>NIP. {formData.bendaharaNip}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                      {(previewType === 'rincian' || previewType === 'all') && (
                        <div className={previewType === 'all' ? 'page-break mb-20 pb-20 border-b-4 border-dashed border-gray-100 last:border-b-0 pt-10' : ''}>
                          <div className="space-y-6 text-[10pt] font-tahoma text-black">
                  <div className="grid grid-cols-2 gap-8 pt-4 text-[9pt]">
                    <div className="space-y-1">
                      <div className="grid grid-cols-[120px_10px_1fr] items-center text-[10pt]">
                        <span>Lampiran SPD No</span><span>:</span><span className="font-medium">{currentPeserta?.nomorSpd}</span>
                      </div>
                      <div className="grid grid-cols-[120px_10px_1fr] items-center text-[10pt]">
                        <span>Tanggal</span><span>:</span><span className="font-medium">{currentPeserta?.tanggalSpd ? new Date(currentPeserta.tanggalSpd).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : '-'}</span>
                      </div>
                    </div>
                    <div className="text-left text-[7pt] italic">
                      <p>LAMPIRAN</p>
                      <p>PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA </p>
                      <p>NOMOR 113/PMK.05/2012 TENTANG PERJALANAN DINAS JABATAN</p>
                      <p>DALAM NEGERI BAGI PEJABAT NEGARA,PEGAWAI NEGERI,DAN </p>
                      <p>PEGAWAI TIDAK TETAP</p>
                    </div>
                  </div>
                   
                                    <div className="text-center py-6">
                     <h2 className="text-[12pt] font-bold uppercase tracking-wide">RINCIAN BIAYA PERJALANAN DINAS</h2>
                   </div>

                   <table className="w-full border-collapse border-[1.5pt] border-black text-center text-[10pt]">
                     <thead>
                       <tr className="bg-gray-100/50 border-b-[1.5pt] border-black">
                         <th className="border-r border-black p-2 w-10">No.</th>
                         <th className="border-r border-black p-2">Perincian Biaya</th>
                         <th className="border-r border-black p-2 colspan-2 text-center" colSpan={2}>Jumlah</th>
                         <th className="p-2 w-32">Keterangan</th>
                       </tr>
                     </thead>
                     <tbody>
                       {(currentPeserta?.rincianBiaya || []).map((item, idx) => (
                         <tr key={idx} className="border-b border-black h-10">
                           <td className="border-r border-black p-2">{idx + 1}</td>
                           <td className="border-r border-black p-2 text-left">
                             {item.item}
                           </td>
                           <td className="border-r border-black p-2 text-left italic">
                             Rp {item.rate.toLocaleString('id-ID')} x {item.qty}
                           </td>
                           <td className="border-r border-black p-2 text-right">
                             Rp {item.total.toLocaleString('id-ID')}
                           </td>
                           <td className="p-2"></td>
                         </tr>
                       ))}
                       <tr className="font-bold bg-gray-100/50 border-t-[1.5pt] border-black h-10">
                         <td colSpan={3} className="border-r border-black p-2 text-center Proper Case tracking-widest">JUMLAH</td>
                         <td className="border-r border-black p-2 text-right">Rp {(currentPeserta?.totalJumlah || 0).toLocaleString('id-ID')}</td>
                         <td className="p-2"></td>
                       </tr>
                       <tr className="bg-gray-200/50 h-10">
                         <td colSpan={5} className="p-2 text-left border-t border-black px-4 italic font-bold text-xs Proper Case">
                           Terbilang :   {terbilang(currentPeserta?.totalJumlah || 0)} Rupiah 
                         </td>
                       </tr>
                     </tbody>
                   </table>

                   <div className="text-right mr-10 pt-8">
                      <p>{docCity}, {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                   </div>

                   <div className="grid grid-cols-2 gap-10 pt-4">
                     <div className="text-center flex flex-col justify-between min-h-[250px]">
                       <div className="space-y-1 text-left">
                         <p className="ml-10">Telah dibayar sejumlah</p>
                         <div className="flex justify-between px-10 font-bold">
                           <span>Rp</span>
                           <span>{(currentPeserta?.totalJumlah || 0).toLocaleString('id-ID')}</span>
                         </div>
                         <div className="mx-10 border-t border-black pt-1">
                            <p className="italic font-bold text-[8pt] Proper Case text-center">
                              {terbilang(currentPeserta?.totalJumlah || 0)} Rupiah
                            </p>
                         </div>
                         <p className="pt-8 text-center">Bendahara Pengeluaran</p>
                       </div>
                       <div className="space-y-1">
                         <p className="font-bold">{formatSignatoryName(formData.bendaharaNama || '')}</p>
                         <p className="text-[9pt]">NIP. {formData.bendaharaNip}</p>
                       </div>
                     </div>
                     <div className="text-center flex flex-col justify-between min-h-[250px]">
                       <div className="space-y-1 text-left">
                         <p className="ml-10">Telah menerima sejumlah uang sebesar</p>
                         <div className="flex justify-between px-10 font-bold">
                           <span>Rp</span>
                           <span>{(currentPeserta?.totalJumlah || 0).toLocaleString('id-ID')}</span>
                         </div>
                         <div className="mx-10 border-t border-black pt-1">
                            <p className="italic font-bold text-[8pt] Proper Case text-center">
                              {terbilang(currentPeserta?.totalJumlah || 0)} Rupiah
                            </p>
                         </div>
                         <p className="pt-8 text-center">Yang Menerima</p>
                       </div>
                       <div className="space-y-1">
                         <p className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</p>
                         <p className="text-[9pt]">NIP. {currentPeserta?.nip || '-'}</p>
                       </div>
                     </div>
                   </div>

                  <div className="pt-12 mt-12 border-t-[1pt] border-black">
                    <p className="font-bold uppercase text-center  tracking-wide mb-12">PERHITUNGAN SPD RAMPUNG</p>
                    
                    <div className="flex flex-col items-center">
                       <div className="space-y-2 text-[10pt] w-fit mb-20">
                          <div className="grid grid-cols-[200px_10px_1fr] items-center text-left">
                            <span>Ditetapkan Sejumlah</span><span>:</span><span>Rp {(currentPeserta?.totalJumlah || 0).toLocaleString('id-ID')}</span>
                          </div>
                          <div className="grid grid-cols-[200px_10px_1fr] items-center text-left">
                            <span>Yang telah dibayar semula</span><span>:</span><span>-</span>
                          </div>
                          <div className="grid grid-cols-[200px_10px_1fr] items-center text-left font-bold border-t border-black pt-2 mt-2">
                            <span>Sisa Kurang / Lebih</span><span>:</span><span>-</span>
                          </div>
                       </div>

                       <div className="w-full flex justify-end">
                         <div className="text-center space-y-24 w-[300px]">
                           <div>
                             <p>Pejabat Pembuat Komitmen</p>
                           </div>
                           <div className="space-y-1">
                             <p className="font-bold">{formatSignatoryName(formData.ppkNama || '')}</p>
                             <p className="text-[9pt]">NIP. {formData.ppkNip}</p>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {(previewType === 'riil' || previewType === 'all') && (
                <div className={previewType === 'all' ? 'page-break mb-20 pb-20 border-b-4 border-dashed border-gray-100 last:border-b-0 pt-10' : ''}>
                  <div className="space-y-8 text-[10pt] font-tahoma text-black">
                     <div className="grid grid-cols-2 gap-8 pt-4 text-[9pt]">
                    <div className="space-y-1">
                    </div>
                    <div className="text-left text-[7pt] italic">
                      <p>LAMPIRAN</p>
                      <p>PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA </p>
                      <p>NOMOR 113/PMK.05/2012 TENTANG PERJALANAN DINAS JABATAN</p>
                      <p>DALAM NEGERI BAGI PEJABAT NEGARA,PEGAWAI NEGERI,DAN </p>
                      <p>PEGAWAI TIDAK TETAP</p>
                    </div>
                    </div>
                   <div className="text-center py-4">
                     <h2 className="text-[12pt] font-bold uppercase underline">DAFTAR PENGELUARAN RIIL</h2>
                   </div>

                   <div className="space-y-4">
                     <p>Yang bertandatangan di bawah ini:</p>
                     <div className="pl-10 space-y-1">
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</span></div>
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>NIP</span><span>:</span><span>{currentPeserta?.nip || '-'}</span></div>
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Jabatan</span><span>:</span><span className="uppercase">{currentPeserta?.jabatan}</span></div>
                     </div>

                     <p className="leading-relaxed">Berdasarkan Surat Perjalanan Dinas (SPD) Nomor: <span className="font-bold">{currentPeserta?.nomorSpd}</span> Tanggal <span className="font-bold">{currentPeserta?.tanggalSpd ? new Date(currentPeserta.tanggalSpd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>, dengan ini kami menyatakan dengan sesungguhnya bahwa:</p>
                     
                     <div className="space-y-2">
                        <p>1. Biaya transport pegawai dan/atau biaya penginapan di bawah ini yang tidak dapat diperoleh bukti-bukti pengeluarannya meliputi:</p>
                        <table className="w-full border-collapse border border-black text-center">
                          <thead>
                            <tr className="bg-gray-50 border-b border-black">
                              <th className="border-r border-black p-2 w-10">No.</th>
                              <th className="border-r border-black p-2">Uraian</th>
                              <th className="p-2 w-48">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rincianRiil || []).map((item, idx) => (
                              <tr key={idx} className="border-b border-black">
                                <td className="border-r border-black p-2">{idx + 1}</td>
                                <td className="border-r border-black p-2 text-left">{item.item}</td>
                                <td className="p-2 text-right">Rp {item.total.toLocaleString('id-ID')}</td>
                              </tr>
                            ))}
                            <tr className="font-bold bg-gray-50">
                              <td colSpan={2} className="border-r border-black p-2 text-right uppercase">JUMLAH</td>
                              <td className="p-2 text-right">Rp {(totalRiil || 0).toLocaleString('id-ID')}</td>
                            </tr>
                          </tbody>
                        </table>
                     </div>

                     <p>2. Jumlah uang tersebut pada angka 1 di atas benar-benar dikeluarkan untuk pelaksanaan perjalanan dinas dimaksud dan apabila di kemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Negara.</p>
                     <p>Demikian pernyataan ini kami buat dengan sebenarnya, untuk dipergunakan sebagaimana mestinya.</p>
                   </div>

                   <div className="grid grid-cols-2 gap-10 pt-10 text-[10pt]">
                    <div className="text-center space-y-20">
                      <p>Mengetahui / Menyetujui<br/>Pejabat Pembuat Komitmen,</p>
                      <div className="space-y-1">
                        <p className="font-bold">{formatSignatoryName(formData.ppkNama || '')}</p>
                        <p className="text-[9pt]">NIP. {formData.ppkNip}</p>
                      </div>
                    </div>
                    <div className="text-center space-y-20">
                      <p>{docCity}, {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Pelaksana SPD,</p>
                      <div className="space-y-1">
                        <p className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</p>
                        <p className="text-[9pt]">NIP. {currentPeserta?.nip || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {(previewType === 'spb' || previewType === 'all') && (
                <div className={previewType === 'all' ? 'page-break mb-20 pb-20 border-b-4 border-dashed border-gray-100 last:border-b-0 pt-10' : ''}>
                   <div className="text-[9.2pt] font-tahoma border-[1.5pt] border-black p-4 bg-white min-h-[800px] flex flex-col text-black">

                   <div className="space-y-8 text-[10pt] font-tahoma text-black">
                     <div className="grid grid-cols-2 gap-8 pt-4 text-[9pt]">
                    <div className="space-y-1">
                    </div>
                    <div className="text-left text-[7pt] italic">
                      <p>LAMPIRAN</p>
                      <p>PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA</p>
                      <p>NOMOR 190/PMK.05/2012 TENTANG TATA CARA PEMBAYARAN </p>
                      <p>DALAM RANGKA PELAKSANAAN ANGGARAN PENDAPATAN</p>
                      <p>BELANJA NEGARA</p>
                    </div>
                    </div>

                   <div className="text-center space-y-0.5 mb-2">
                     <p className="font-bold text-[10.5pt] uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                     <p className="text-[11.5pt] font-bold underline uppercase pt-2">SURAT PERINTAH BAYAR</p>
                   </div>

                   <div className="flex justify-center gap-10 py-1 border-b border-black mb-2">
                        <p>Tanggal : {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>Nomor : {formData.transactionId || '.........................'}</p>
                   </div>

                   <div className="space-y-0 text-[9.5pt] flex-1">
                      <div className="border-b border-black py-2">
                         <p>Saya yang bertanda tangan di bawah ini selaku Pejabat Pembuat Komitmen memerintahkan Bendahara Pengeluaran agar melakukan pembayaran sejumlah :</p>
                      </div>
                      
                      <div className="border-b border-black py-1.5 flex items-center">
                         <span className="font-bold w-12">Rp</span>
                         <span className="font-bold">{(currentPeserta?.totalJumlah || 0).toLocaleString('id-ID')}</span>
                      </div>

                      <div className="border-b-[2.5pt] border-double border-black py-2 text-center font-bold italic Proper Case">
                          {terbilang(currentPeserta?.totalJumlah || 0)} Rupiah 
                      </div>

                      <div className="space-y-1 py-2 border-b border-black mb-2">
                         <div className="grid grid-cols-[180px_10px_1fr]"><span>Kepada</span><span>:</span><span className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</span></div>
                         <div className="grid grid-cols-[180px_10px_1fr] items-start">
                            <span>Untuk pembayaran</span><span>:</span>
                            <span className="leading-tight text-justify">
                              Biaya Perjalanan dinas dalam rangka {formData.namaKegiatan} {currentPeserta?.tujuanPerjalanan ? `Ke ${currentPeserta.tujuanPerjalanan}` : ''} pada tanggal {currentPeserta?.tanggalBerangkat && currentPeserta?.tanggalPulang && currentPeserta.tanggalBerangkat !== currentPeserta.tanggalPulang
                                ? `${new Date(currentPeserta.tanggalBerangkat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})} sampai dengan ${new Date(currentPeserta.tanggalPulang).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}`
                                : (currentPeserta?.tanggalBerangkat ? new Date(currentPeserta.tanggalBerangkat).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : (currentPeserta?.tanggalSpd ? new Date(currentPeserta.tanggalSpd).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : '-'))}
                            </span>
                         </div>
                         
                         <div className="grid grid-cols-[180px_10px_1fr] pt-2"><span>Atas dasar</span><span>:</span><span></span></div>
                         <div className="grid grid-cols-[180px_10px_1fr]"><span>1. Kuitansi / bukti pembelian</span><span className="text-right pr-2">:</span><span></span></div>
                         <div className="grid grid-cols-[180px_10px_1fr]"><span>2. Nota / bukti penerimaan</span><span className="text-right pr-2">:</span><span></span></div>
                         
                         <div className="grid grid-cols-[180px_10px_1fr] pt-1"><span>Dibebankan pada</span><span>:</span><span></span></div>
                         <div className="grid grid-cols-[180px_10px_1fr]"><span>Kegiatan, Output, MAK</span><span className="text-right pr-2">:</span><span className="font-bold">{formData.mataAnggaran}</span></div>
                         <div className="grid grid-cols-[180px_10px_1fr]"><span>Kode</span><span className="text-right pr-2">:</span><span></span></div>
                      </div>
                       <div className="pt-8 text-[8.2pt]">
                        <div className="grid grid-cols-3 gap-2 text-center mb-1">
                          <div></div>
                          <div></div>
                          <div>{docCity}, {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[8.2pt]">
                          <div className="flex flex-col h-full justify-between min-h-[120px]">
                            <p className="leading-tight">Setuju/lunas dibayar, tgl {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Bendahara Pengeluaran,</p>
                            <div className="space-y-0.5">
                              <p className="font-bold">{formatSignatoryName(formData.bendaharaNama || '')}</p>
                              <p>NIP. {formData.bendaharaNip}</p>
                            </div>
                          </div>
                          <div className="flex flex-col h-full justify-between min-h-[120px]">
                            <p className="leading-tight">Diterima tanggal {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Penerima Uang/ Uang Muka Kerja,</p>
                            <div className="space-y-0.5">
                              <p className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</p>
                              <p>NIP. {currentPeserta?.nip || '-'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col h-full justify-between min-h-[120px]">
                            <div className="text-center space-y-1">
                                <p className="leading-tight">a.n. Kuasa Pengguna Anggaran<br/>Pejabat Pembuat Komitmen,</p>
                            </div>
                            <div className="space-y-0.5 mt-auto">
                              <p className="font-bold">{formatSignatoryName(formData.ppkNama || '')}</p>
                              <p>NIP. {formData.ppkNip}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                   </div>
                   </div>
                </div>
              </div>
            )}

              {(previewType === 'sptjm' || previewType === 'all') && (
                <div className={previewType === 'all' ? 'page-break pt-10' : ''}>
                   <div className="space-y-6 text-[10pt] font-tahoma text-black">
                   <div className="flex items-center border-b-2 border-black pb-4">
                      <img src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" className="h-24 w-24 object-contain" />
                      <div className="text-center flex-1 pr-12">
                        <p className="font-bold text-[12pt] uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p className="font-bold text-[12pt] uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                        <p className="text-[9pt] font-tahoma mt-2">Jl. H.R. Rasuna Said Kav. 8-9 Kuningan, Jakarta Selatan 12190</p>
                        <p className="text-[9pt] font-tahoma">Call Center: 152 </p>
                        <p className="text-[9pt] font-tahoma">Laman: www.dgip.go.id</p>
                      </div>
                   </div>

                   <div className="text-center py-6">
                     <h2 className="text-[11pt] font-bold underline uppercase tracking-wider">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</h2>
                   </div>

                   <div className="space-y-6 text-justify leading-relaxed">
                     <p>Yang bertanda tangan di bawah ini:</p>
                     <div className="pl-10 space-y-2">
                        <div className="grid grid-cols-[130px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</span></div>
                        <div className="grid grid-cols-[130px_10px_1fr]"><span>NIP</span><span>:</span><span>{currentPeserta?.nip || '-'}</span></div>
                        <div className="grid grid-cols-[130px_10px_1fr]"><span>Jabatan</span><span>:</span><span className="uppercase">{currentPeserta?.jabatan}</span></div>
                     </div>

                      <p>Menyatakan dengan sesungguhnya bahwa:</p>
                      <div className="space-y-4">
                         <div className="flex gap-4">
                            <span className="w-4">1.</span>
                            <p>Perhitungan yang terdapat dalam pertanggungjawaban Biaya Perjalanan dinas dalam rangka {formData.namaKegiatan} {currentPeserta?.tujuanPerjalanan ? `Ke ${currentPeserta.tujuanPerjalanan}` : ''} pada tanggal {currentPeserta?.tanggalBerangkat && currentPeserta?.tanggalPulang && currentPeserta.tanggalBerangkat !== currentPeserta.tanggalPulang
                                ? `${new Date(currentPeserta.tanggalBerangkat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})} sampai dengan ${new Date(currentPeserta.tanggalPulang).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}`
                                : (currentPeserta?.tanggalBerangkat ? new Date(currentPeserta.tanggalBerangkat).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : (currentPeserta?.tanggalSpd ? new Date(currentPeserta.tanggalSpd).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}) : '-'))} Sebesar <span className="font-bold">Rp {(currentPeserta?.totalJumlah || 0).toLocaleString('id-ID')}</span></p>
                         </div>
                         {rincianRiil && rincianRiil.length > 0 && (
                            <div className="flex gap-4">
                               <span className="w-4">2.</span>
                               <p>Biaya transportasi darat yang dibayarkan secara lumpsum, tidak menggunakan kendaraan dinas jabatan atau operasional</p>
                            </div>
                         )}
                         <div className="flex gap-4">
                            <span className="w-4">{rincianRiil && rincianRiil.length > 0 ? '3.' : '2.'}</span>
                            <p>Dari jumlah tersebut, apabila di kemudian hari terdapat kelebihan pembayaran atau terdapat hal-hal yang tidak benar atas perjalanan dinas tersebut di atas, saya bersedia untuk mengganti kelebihan atau kerugian negara tersebut untuk menyetorkan ke Kas Negara.</p>
                         </div>
                      </div>

                     <p>Demikian surat pernyataan ini saya buat dengan sebenarnya.</p>
                   </div>

                   <div className="flex justify-end mt-20">
                     <div className="text-center w-80 space-y-24">
                        <p>{docCity}, {new Date(docDate || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Yang membuat pernyataan,</p>
                        <div className="space-y-1">
                          <p className="font-bold">{formatSignatoryName(currentPeserta?.nama || '')}</p>
                          <p>NIP. {currentPeserta?.nip || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-gray-100 max-w-2xl mx-auto shadow-sm">
            <div className="h-16 w-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <User size={32} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Pilih Peserta</h3>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Pilih peserta dari daftar untuk melihat dokumen</p>
          </div>
        )}
      </div>
    )}
    </div>
  );
};

export default KeuanganPage;