
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { KeuanganRecord, KeuanganPeserta, Pegawai } from '../types';
import { fetchKeuanganFromSheets, syncKeuanganRemote, fetchPegawaiFromSheets } from '../spreadsheetService';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
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
  const [previewType, setPreviewType] = useState<'kuitansi' | 'rincian' | 'spb' | 'sptjm'>('kuitansi');
  const [selectedPesertaIdx, setSelectedPesertaIdx] = useState<number>(0);

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
      tujuanPerjalanan: ''
    }
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, p] = await Promise.all([fetchKeuanganFromSheets(), fetchPegawaiFromSheets()]);
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

  const handleSave = async () => {
    if (!formData.namaKegiatan || !formData.mataAnggaran) {
      alert("Mohon isi nama kegiatan dan mata anggaran.");
      return;
    }
    setSyncing(true);
    const id = formData.id || `ACT-${Date.now()}`;
    const payload = { ...formData, id };
    const success = await syncKeuanganRemote('SAVE', payload);
    if (success) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'Keuangan', `${formData.id ? 'Update' : 'Tambah'} kegiatan keuangan: ${formData.namaKegiatan}`);
      setShowSuccess(true);
      setActiveView('list');
      loadData();
    } else {
      alert("Gagal menyimpan data.");
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSyncing(true);
    const success = await syncKeuanganRemote('DELETE', { id: selectedId });
    if (success) {
      logActivity('DELETE', 'Keuangan', `Hapus kegiatan keuangan ID: ${selectedId}`);
      setShowConfirm(false);
      loadData();
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

  const addPeserta = () => {
    const newPeserta: KeuanganPeserta = {
      id: `P-${Date.now()}`,
      nama: '',
      jabatan: '',
      nomorSpd: formData.configSpd?.nomorSpdPrefix || '',
      tanggalSpd: formData.configSpd?.tanggalSpd || new Date().toISOString().split('T')[0],
      tujuanPerjalanan: formData.configSpd?.tujuanPerjalanan || '',
      kategori: 'SPPD',
      rincianBiaya: [],
      totalJumlah: 0
    };

    // Auto-populate rincian biaya based on config
    if (formData.configBiaya) {
      const rb = [];
      if (formData.configBiaya.uangHarian > 0) rb.push({ item: 'Uang Harian', rate: formData.configBiaya.uangHarian, qty: 1, total: formData.configBiaya.uangHarian });
      if (formData.configBiaya.penginapan > 0) rb.push({ item: 'Biaya Penginapan', rate: formData.configBiaya.penginapan, qty: 1, total: formData.configBiaya.penginapan });
      if (formData.configBiaya.transport > 0) rb.push({ item: 'Biaya Transport', rate: formData.configBiaya.transport, qty: 1, total: formData.configBiaya.transport });
      newPeserta.rincianBiaya = rb;
      newPeserta.totalJumlah = rb.reduce((acc, curr) => acc + curr.total, 0);
    } else {
      newPeserta.rincianBiaya = [{ item: '', rate: 0, qty: 1, total: 0 }];
    }

    setFormData({ ...formData, peserta: [...(formData.peserta || []), newPeserta] });
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

  const updateConfigSpd = (field: string, value: string) => {
    setFormData({
      ...formData,
      configSpd: {
        ...(formData.configSpd || { nomorSpdPrefix: '', tanggalSpd: '', tujuanPerjalanan: '' }),
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
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      const p = formData.peserta?.[selectedPesertaIdx];
      pdf.save(`${previewType.toUpperCase()}_${p?.nama?.replace(/\s+/g, '_')}.pdf`);
    } catch (e) { alert("Gagal cetak PDF."); } finally { setLoading(false); }
  };

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
        <div className="flex gap-2">
          {activeView === 'list' ? (
            <>
              {(canEdit || isSuperadmin) && (
                <button onClick={() => { setFormData({ namaKegiatan: '', tanggal: new Date().toISOString().split('T')[0], mataAnggaran: '', tahunAnggaran: new Date().getFullYear().toString(), ppkNip: '', ppkNama: '', bendaharaNip: '', bendaharaNama: '', unitKerja: UNIT_KERJA[0], status: 'Draft', peserta: [] }); setActiveView('editor'); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-200 flex items-center gap-2 active:scale-95 transition-all">
                  <i className="bi bi-plus-lg"></i> Buat Kegiatan Baru
                </button>
              )}
            </>
          ) : activeView === 'preview' ? (
            <div className="flex gap-2">
              <button onClick={handleDownloadPdf} className="px-6 py-3 bg-gray-950 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2">
                <i className="bi bi-file-earmark-pdf-fill"></i> Cetak PDF
              </button>
              <button onClick={() => setActiveView('list')} className="px-8 py-3 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase shadow-sm">Kembali</button>
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
                    {(canEdit || isSuperadmin) && (
                      <>
                        <button onClick={() => { setFormData(r); setActiveView('editor'); }} className="h-12 px-6 bg-white border border-gray-100 text-gray-600 rounded-2xl flex items-center gap-2 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm font-black text-[10px] uppercase">
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
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Nama Kegiatan</label>
                  <input type="text" placeholder="Contoh: Konsinyering Penyusunan Pola Karir ASN" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all uppercase" value={formData.namaKegiatan} onChange={e => setFormData({ ...formData, namaKegiatan: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Mata Anggaran (MAK)</label>
                  <input type="text" placeholder="Contoh: 1597/950/058/AD/524119" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all uppercase" value={formData.mataAnggaran} onChange={e => setFormData({ ...formData, mataAnggaran: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Tanggal</label>
                    <input type="date" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.tanggal} onChange={e => setFormData({ ...formData, tanggal: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Tahun</label>
                    <input type="number" className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.tahunAnggaran} onChange={e => setFormData({ ...formData, tahunAnggaran: e.target.value })} />
                  </div>
                </div>
                <SearchableSelect label="Pejabat Pembuat Komitmen (PPK)" options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={formData.ppkNip || ''} onChange={handlePPKChange} />
                <SearchableSelect label="Bendahara Pengeluaran" options={pegawai.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={formData.bendaharaNip || ''} onChange={handleBendaharaChange} />
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Unit Kerja</label>
                  <select className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.unitKerja} onChange={e => setFormData({ ...formData, unitKerja: e.target.value })}>
                    {UNIT_KERJA.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Status</label>
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
              </div>
            </div>

            <div className="space-y-8">
              <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest">2. Standar Biaya & SPD (Acuan Peserta)</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Standar Biaya Satuan</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Uang Harian (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.uangHarian)} onChange={e => updateConfigBiaya('uangHarian', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Penginapan (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.penginapan)} onChange={e => updateConfigBiaya('penginapan', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Transport (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.transport)} onChange={e => updateConfigBiaya('transport', parseRawValue(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Fullboard (Rp)</label>
                      <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formatRupiah(formData.configBiaya?.fullboard)} onChange={e => updateConfigBiaya('fullboard', parseRawValue(e.target.value))} />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-l-4 border-emerald-600 pl-3">Standar Data SPD</p>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor SPD (Prefix/Default)</label>
                      <input type="text" placeholder="Contoh: SPD/001/DJKI/2024" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all uppercase" value={formData.configSpd?.nomorSpdPrefix || ''} onChange={e => updateConfigSpd('nomorSpdPrefix', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal SPD</label>
                        <input type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all" value={formData.configSpd?.tanggalSpd || ''} onChange={e => updateConfigSpd('tanggalSpd', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tujuan Perjalanan</label>
                        <input type="text" placeholder="Contoh: Jakarta - Bogor" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold outline-none focus:border-blue-600 transition-all uppercase" value={formData.configSpd?.tujuanPerjalanan || ''} onChange={e => updateConfigSpd('tujuanPerjalanan', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                <i className="bi bi-info-circle-fill text-blue-600"></i>
                <p className="text-[9px] font-bold text-blue-800 uppercase leading-relaxed">Nilai di atas akan otomatis digunakan sebagai data awal saat Anda menambahkan peserta baru.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex justify-between items-center border-b pb-4">
                <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">3. Daftar Peserta & Perincian</h5>
                <button onClick={addPeserta} className="px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-blue-100 transition-all">
                  <i className="bi bi-person-plus-fill"></i> Tambah Peserta
                </button>
              </div>

              <div className="space-y-12">
                {(formData.peserta || []).map((p, pIdx) => (
                  <div key={p.id} className="bg-gray-50/50 p-8 md:p-10 rounded-[3rem] border border-gray-100 space-y-8 relative group">
                    <button onClick={() => removePeserta(pIdx)} className="absolute top-6 right-6 h-10 w-10 bg-white text-rose-600 rounded-xl flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                      <i className="bi bi-x-lg"></i>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <SearchableSelect label={`Peserta #${pIdx + 1}`} options={pegawai.map(x => ({ value: x.nip, label: x.nama, subLabel: x.jabatan }))} value={p.nip || ''} onChange={(nip) => handlePesertaSelect(pIdx, nip)} />
                        {!p.nip && (
                          <div className="grid grid-cols-1 gap-4">
                            <input type="text" placeholder="Nama Lengkap (Input Manual)" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold outline-none uppercase" value={p.nama} onChange={e => updatePeserta(pIdx, 'nama', e.target.value)} />
                            <input type="text" placeholder="Jabatan (Input Manual)" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold outline-none uppercase" value={p.jabatan} onChange={e => updatePeserta(pIdx, 'jabatan', e.target.value)} />
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-3">Kategori</label>
                          <select className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold outline-none" value={p.kategori} onChange={e => updatePeserta(pIdx, 'kategori', e.target.value)}>
                            <option>SPPD</option>
                            <option>Fullboard</option>
                            <option>Halfboard</option>
                            <option>Transport</option>
                            <option>Honorarium</option>
                            <option>Lainnya</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-3">Nomor SPD</label>
                            <input type="text" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold outline-none uppercase" value={p.nomorSpd} onChange={e => updatePeserta(pIdx, 'nomorSpd', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-3">Tanggal SPD</label>
                            <input type="date" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold outline-none" value={p.tanggalSpd} onChange={e => updatePeserta(pIdx, 'tanggalSpd', e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-3">Tujuan Perjalanan</label>
                          <input type="text" placeholder="Contoh: Jakarta - Bogor" className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl text-[12px] font-bold outline-none uppercase" value={p.tujuanPerjalanan} onChange={e => updatePeserta(pIdx, 'tujuanPerjalanan', e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                           <button onClick={() => {
                             const list = [...(formData.peserta || [])];
                             const rb = [];
                             if (formData.configBiaya?.uangHarian) rb.push({ item: 'Uang Harian', rate: formData.configBiaya.uangHarian, qty: 1, total: formData.configBiaya.uangHarian });
                             if (formData.configBiaya?.penginapan) rb.push({ item: 'Biaya Penginapan', rate: formData.configBiaya.penginapan, qty: 1, total: formData.configBiaya.penginapan });
                             if (formData.configBiaya?.transport) rb.push({ item: 'Biaya Transport', rate: formData.configBiaya.transport, qty: 1, total: formData.configBiaya.transport });
                             list[pIdx].rincianBiaya = rb;
                             list[pIdx].totalJumlah = rb.reduce((acc, curr) => acc + curr.total, 0);
                             list[pIdx].nomorSpd = formData.configSpd?.nomorSpdPrefix || list[pIdx].nomorSpd;
                             list[pIdx].tanggalSpd = formData.configSpd?.tanggalSpd || list[pIdx].tanggalSpd;
                             list[pIdx].tujuanPerjalanan = formData.configSpd?.tujuanPerjalanan || list[pIdx].tujuanPerjalanan;
                             setFormData({ ...formData, peserta: list });
                           }} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-sm">
                             <i className="bi bi-arrow-counterclockwise"></i> Reset ke Standar
                           </button>
                           <button onClick={() => { setFormData(formData); setSelectedPesertaIdx(pIdx); setPreviewType('kuitansi'); setActiveView('preview'); }} className="px-4 py-2 bg-white border border-gray-200 text-emerald-600 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-sm">
                             <i className="bi bi-printer"></i> Cetak Dokumen
                           </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Rincian Biaya Peserta</p>
                        <button onClick={() => addRincian(pIdx)} className="text-[9px] font-black text-blue-600 uppercase">Tambah Baris</button>
                      </div>
                      <div className="space-y-2">
                        {p.rincianBiaya.map((r, rIdx) => (
                          <div key={rIdx} className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-5"><input type="text" placeholder="Perincian" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none" value={r.item} onChange={e => updateRincian(pIdx, rIdx, 'item', e.target.value)} /></div>
                            <div className="col-span-3"><input type="text" placeholder="Satuan" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none" value={formatRupiah(r.rate)} onChange={e => updateRincian(pIdx, rIdx, 'rate', parseRawValue(e.target.value))} /></div>
                            <div className="col-span-1"><input type="number" placeholder="Qty" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-[11px] font-bold outline-none text-center" value={r.qty} onChange={e => updateRincian(pIdx, rIdx, 'qty', parseInt(e.target.value))} /></div>
                            <div className="col-span-2 text-right font-black text-[10px] text-gray-600">{formatCurrency(r.total)}</div>
                            <div className="col-span-1 text-right"><button onClick={() => removeRincian(pIdx, rIdx)} className="text-rose-400 hover:text-rose-600"><i className="bi bi-trash3"></i></button></div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end pt-4 border-t border-gray-200">
                        <p className="text-[10px] font-black text-gray-400 uppercase mr-4">Total Peserta:</p>
                        <p className="text-[12px] font-black text-gray-900">{formatCurrency(p.totalJumlah)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!formData.peserta || formData.peserta.length === 0) && (
                  <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-[3rem] text-gray-400 font-bold uppercase text-[10px] tracking-widest">Belum ada peserta ditambahkan</div>
                )}
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

      {activeView === 'preview' && (
        <div className="space-y-8">
          <div className="flex justify-center gap-4 no-print">
            {['kuitansi', 'rincian', 'spb', 'sptjm'].map(type => (
              <button key={type} onClick={() => setPreviewType(type as any)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${previewType === type ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}>
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2cm] font-['Arial'] text-black leading-tight" style={{ width: '210mm', minHeight: '297mm' }}>
              
              {previewType === 'kuitansi' && (
                <div className="space-y-8 text-[10pt]">
                  <div className="flex justify-between items-start border-b-2 border-black pb-4">
                    <div className="space-y-1">
                      <p className="font-bold uppercase">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                      <p className="font-bold uppercase">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                    </div>
                    <div className="text-right text-[8pt] italic">
                      <p>LAMPIRAN PMK NO. 190/PMK.05/2012</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-1">
                       <div className="grid grid-cols-[100px_10px_1fr]"><span>Transaction ID</span><span>:</span><span>{formData.id}</span></div>
                    </div>
                    <div className="space-y-1">
                       <div className="grid grid-cols-[100px_10px_1fr]"><span>Tahun Anggaran</span><span>:</span><span>{formData.tahunAnggaran}</span></div>
                       <div className="grid grid-cols-[100px_10px_1fr]"><span>Nomor Bukti</span><span>:</span><span>-</span></div>
                       <div className="grid grid-cols-[100px_10px_1fr]"><span>Mata Anggaran</span><span>:</span><span>{formData.mataAnggaran}</span></div>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <h2 className="text-[12pt] font-bold underline uppercase">KUITANSI / BUKTI PEMBAYARAN</h2>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Sudah terima dari</span><span>:</span><span>Kuasa Pengguna Anggaran / Pejabat Pembuat Komitmen Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum dan HAM RI</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span className="font-bold">Jumlah uang</span><span>:</span><span className="font-bold">{formatCurrency(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0)}</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Terbilang</span><span>:</span><span className="italic font-bold uppercase"># {terbilang(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0)} RUPIAH #</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Untuk pembayaran</span><span>:</span><span>Biaya Perjalanan dinas dalam rangka {formData.namaKegiatan}</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Berdasarkan SPD</span><span>:</span><span>Sekretaris Direktorat Jenderal Kekayaan Intelektual</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Nomor</span><span>:</span><span>{formData.peserta?.[selectedPesertaIdx]?.nomorSpd}</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Tanggal</span><span>:</span><span>{formData.peserta?.[selectedPesertaIdx]?.tanggalSpd}</span></div>
                    <div className="grid grid-cols-[150px_10px_1fr]"><span>Untuk Perjalanan Dinas</span><span>:</span><span>{formData.peserta?.[selectedPesertaIdx]?.tujuanPerjalanan}</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-10 pt-10">
                    <div className="text-center space-y-20">
                      <p>a.n Kuasa Pengguna Anggaran<br/>Pejabat Pembuat Komitmen</p>
                      <div className="space-y-1">
                        <p className="font-bold underline uppercase">{formData.ppkNama}</p>
                        <p>NIP {formData.ppkNip}</p>
                      </div>
                    </div>
                    <div className="text-center space-y-20">
                      <p>Bogor, {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Yang Menerima</p>
                      <div className="space-y-1">
                        <p className="font-bold underline uppercase">{formData.peserta?.[selectedPesertaIdx]?.nama}</p>
                        <p>NIP {formData.peserta?.[selectedPesertaIdx]?.nip || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-10 border-t border-dashed border-black">
                    <p className="italic">Lunas dibayar tanggal, {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold">Bendahara Pengeluaran</p>
                    <div className="mt-20">
                      <p className="font-bold underline uppercase">{formData.bendaharaNama}</p>
                      <p>NIP {formData.bendaharaNip}</p>
                    </div>
                  </div>
                </div>
              )}

              {previewType === 'rincian' && (
                <div className="space-y-8 text-[10pt]">
                   <div className="flex justify-between items-start">
                     <div className="space-y-1">
                       <div className="grid grid-cols-[100px_10px_1fr]"><span>Lampiran SPD No</span><span>:</span><span>{formData.peserta?.[selectedPesertaIdx]?.nomorSpd}</span></div>
                       <div className="grid grid-cols-[100px_10px_1fr]"><span>Tanggal</span><span>:</span><span>{formData.peserta?.[selectedPesertaIdx]?.tanggalSpd}</span></div>
                     </div>
                     <div className="text-right text-[8pt] italic max-w-[200px]">
                       <p>LAMPIRAN PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA NOMOR 113/PMK.05/2012 TENTANG PERJALANAN DINAS JABATAN DALAM NEGERI</p>
                     </div>
                   </div>

                   <div className="text-center py-4">
                     <h2 className="text-[12pt] font-bold uppercase">RINCIAN BIAYA PERJALANAN DINAS</h2>
                   </div>

                   <table className="w-full border-collapse border border-black text-center">
                     <thead>
                       <tr className="bg-gray-50 border-b border-black">
                         <th className="border-r border-black p-2 w-10">No.</th>
                         <th className="border-r border-black p-2">Perincian Biaya</th>
                         <th className="border-r border-black p-2 w-32">Jumlah</th>
                         <th className="p-2 w-32">Keterangan</th>
                       </tr>
                     </thead>
                     <tbody>
                       {(formData.peserta?.[selectedPesertaIdx]?.rincianBiaya || []).map((item, idx) => (
                         <tr key={idx} className="border-b border-black">
                           <td className="border-r border-black p-2">{idx + 1}</td>
                           <td className="border-r border-black p-2 text-left">
                             {item.item} (Rp {item.rate.toLocaleString('id-ID')} x {item.qty})
                           </td>
                           <td className="border-r border-black p-2 text-right">Rp {item.total.toLocaleString('id-ID')}</td>
                           <td className="p-2"></td>
                         </tr>
                       ))}
                       <tr className="font-bold bg-gray-50">
                         <td colSpan={2} className="border-r border-black p-2 text-right uppercase">JUMLAH</td>
                         <td className="border-r border-black p-2 text-right">Rp {(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0).toLocaleString('id-ID')}</td>
                         <td className="p-2"></td>
                       </tr>
                     </tbody>
                   </table>

                   <div className="pt-2">
                     <p className="font-bold italic uppercase">Terbilang :  {terbilang(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0)} RUPIAH </p>
                   </div>

                   <div className="grid grid-cols-2 gap-10 pt-10">
                    <div className="text-center space-y-16">
                      <div className="space-y-1">
                        <p>Telah dibayar sejumlah</p>
                        <p className="font-bold">Rp {(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold underline uppercase">{formData.bendaharaNama}</p>
                        <p>Bendahara Pengeluaran</p>
                      </div>
                    </div>
                    <div className="text-center space-y-16">
                      <div className="space-y-1">
                        <p>Bogor, {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>Telah menerima sejumlah uang sebesar</p>
                        <p className="font-bold">Rp {(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold underline uppercase">{formData.peserta?.[selectedPesertaIdx]?.nama}</p>
                        <p>Yang Menerima</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-black">
                    <p className="font-bold uppercase text-center underline">PERHITUNGAN SPD RAMPUNG</p>
                    <div className="mt-4 space-y-1 max-w-md">
                       <div className="grid grid-cols-[200px_10px_1fr]"><span>Ditetapkan Sejumlah</span><span>:</span><span>Rp {(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0).toLocaleString('id-ID')}</span></div>
                       <div className="grid grid-cols-[200px_10px_1fr]"><span>Yang telah dibayar semula</span><span>:</span><span>-</span></div>
                       <div className="grid grid-cols-[200px_10px_1fr] font-bold"><span>Sisa Kurang / Lebih</span><span>:</span><span>-</span></div>
                    </div>
                    <div className="ml-[60%] mt-10 text-center space-y-20">
                       <p>Pejabat Pembuat Komitmen</p>
                       <div className="space-y-1">
                         <p className="font-bold underline uppercase">{formData.ppkNama}</p>
                         <p>NIP {formData.ppkNip}</p>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {previewType === 'spb' && (
                <div className="space-y-8 text-[10pt]">
                   <div className="text-right text-[8pt] italic">
                     <p>LAMPIRAN PERATURAN MENTERI KEUANGAN REPUBLIK INDONESIA NOMOR 190/PMK.05/2012 TENTANG TATA CARA PEMBAYARAN DALAM RANGKA PELAKSANAAN ANGGARAN PENDAPATAN BELANJA NEGARA</p>
                   </div>

                   <div className="text-center space-y-1">
                     <p className="font-bold uppercase">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                     <p className="font-bold uppercase">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                     <h2 className="text-[12pt] font-bold underline uppercase pt-4">SURAT PERINTAH BAYAR</h2>
                     <div className="flex justify-center gap-10 pt-2">
                        <p>Tanggal : {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p>Nomor : .........................</p>
                     </div>
                   </div>

                   <div className="space-y-4">
                     <p>Saya yang bertanda tangan di bawah ini selaku Pejabat Pembuat Komitmen memerintahkan Bendahara Pengeluaran agar melakukan pembayaran sejumlah :</p>
                     <div className="flex gap-10 items-center">
                        <span className="font-bold">Rp {(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0).toLocaleString('id-ID')}</span>
                        <span className="italic font-bold uppercase"> {terbilang(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0)} RUPIAH </span>
                     </div>
                     
                     <div className="space-y-2">
                        <div className="grid grid-cols-[150px_10px_1fr]"><span>Kepada</span><span>:</span><span className="font-bold uppercase">{formData.peserta?.[selectedPesertaIdx]?.nama}</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr]"><span>Untuk pembayaran</span><span>:</span><span>Biaya Perjalanan dinas dalam rangka {formData.namaKegiatan}</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr] pt-4"><span>Atas dasar</span><span>:</span><span></span></div>
                        <div className="grid grid-cols-[150px_10px_1fr] pl-4"><span>1. Kuitansi / bukti pembelian</span><span>:</span><span>Tersedia</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr] pl-4"><span>2. Nota / bukti penerimaan</span><span>:</span><span>Tersedia</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr] pt-4"><span>Dibebankan pada</span><span>:</span><span></span></div>
                        <div className="grid grid-cols-[150px_10px_1fr] pl-4"><span>Kegiatan, Output, MAK</span><span>:</span><span>{formData.mataAnggaran}</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr] pl-4"><span>Kode</span><span>:</span><span>.........................</span></div>
                     </div>
                   </div>

                   <div className="grid grid-cols-3 gap-4 pt-10 text-center text-[9pt]">
                      <div className="space-y-20">
                        <p>Setuju/lunas dibayar, tanggal {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Bendahara Pengeluaran,</p>
                        <div className="space-y-1">
                          <p className="font-bold underline uppercase">{formData.bendaharaNama}</p>
                          <p>NIP {formData.bendaharaNip}</p>
                        </div>
                      </div>
                      <div className="space-y-20">
                        <p>Diterima tanggal {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Penerima Uang/ Uang Muka Kerja</p>
                        <div className="space-y-1">
                          <p className="font-bold underline uppercase">{formData.peserta?.[selectedPesertaIdx]?.nama}</p>
                          <p>NIP {formData.peserta?.[selectedPesertaIdx]?.nip || '-'}</p>
                        </div>
                      </div>
                      <div className="space-y-20">
                        <p>Jakarta, {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>a.n. Kuasa Pengguna Anggaran<br/>Pejabat Pembuat Komitmen</p>
                        <div className="space-y-1">
                          <p className="font-bold underline uppercase">{formData.ppkNama}</p>
                          <p>NIP {formData.ppkNip}</p>
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {previewType === 'sptjm' && (
                <div className="space-y-8 text-[11pt]">
                   <div className="flex items-center gap-6 border-b-2 border-black pb-4">
                      <img src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" className="h-20" />
                      <div className="text-center flex-1">
                        <p className="font-bold text-[12pt] uppercase">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p className="font-bold text-[12pt] uppercase">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                        <p className="text-[9pt]">Jl. H.R. Rasuna Said Kav. 8-9 Kuningan, Jakarta Selatan 12190</p>
                        <p className="text-[9pt]">Telp. (021) 57905619 - Fax. (021) 57905619</p>
                        <p className="text-[9pt]">Laman : http://www.dgip.go.id/</p>
                      </div>
                   </div>

                   <div className="text-center py-6">
                     <h2 className="text-[14pt] font-bold underline uppercase">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK</h2>
                   </div>

                   <div className="space-y-6 text-justify leading-relaxed">
                     <p>Yang bertanda tangan di bawah ini:</p>
                     <div className="pl-10 space-y-2">
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold uppercase">{formData.peserta?.[selectedPesertaIdx]?.nama}</span></div>
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>NIP</span><span>:</span><span>{formData.peserta?.[selectedPesertaIdx]?.nip || '-'}</span></div>
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Jabatan</span><span>:</span><span className="uppercase">{formData.peserta?.[selectedPesertaIdx]?.jabatan}</span></div>
                     </div>

                     <p>Menyatakan dengan sesungguhnya bahwa:</p>
                     <div className="space-y-4">
                        <div className="flex gap-4">
                           <span>1.</span>
                           <p>Perhitungan yang terdapat dalam pertanggungjawaban Biaya Perjalanan dinas dalam rangka {formData.namaKegiatan} Sebesar <span className="font-bold">Rp {(formData.peserta?.[selectedPesertaIdx]?.totalJumlah || 0).toLocaleString('id-ID')}</span></p>
                        </div>
                        <div className="flex gap-4">
                           <span>2.</span>
                           <p>Dari jumlah tersebut, apabila di kemudian hari terdapat kelebihan pembayaran atau terdapat hal-hal yang tidak benar atas perjalanan dinas tersebut di atas, saya bersedia untuk mengganti kelebihan atau kerugian negara tersebut untuk menyetorkan ke Kas Negara.</p>
                        </div>
                     </div>

                     <p>Demikian surat pernyataan ini saya buat dengan sebenarnya.</p>
                   </div>

                   <div className="ml-[60%] mt-20 text-center space-y-24">
                      <p>Bogor, {new Date(formData.tanggal || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>Yang melakukan perjalanan dinas</p>
                      <div className="space-y-1">
                        <p className="font-bold underline uppercase">{formData.peserta?.[selectedPesertaIdx]?.nama}</p>
                        <p>NIP {formData.peserta?.[selectedPesertaIdx]?.nip || '-'}</p>
                      </div>
                   </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeuanganPage;
