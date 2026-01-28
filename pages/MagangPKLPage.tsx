
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchMagangPKLFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, MagangPKL } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import * as XLSX from 'xlsx';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
// @ts-ignore
import saveAs from 'file-saver';

const MagangPKLPage = () => {
  const navigate = useNavigate();
  const { canEdit, isSuperadmin, logActivity } = useAuth();
  
  const [pesertaList, setPesertaList] = useState<MagangPKL[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // View States
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'generator'>('list');
  const [genStep, setGenStep] = useState<'SELECT' | 'PREVIEW'>('SELECT');
  const [docType, setDocType] = useState<'BALASAN' | 'NOTA' | 'SERTIFIKAT'>('BALASAN');

  // Filter & Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'SEMUA' | 'Proses' | 'Selesai'>('SEMUA');
  const [filterPenempatan, setFilterPenempatan] = useState('SEMUA');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MagangPKL | null>(null);

  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<MagangPKL>>({
    jenis: 'MAGANG',
    status: 'Proses',
    penempatan: 'Belum Ditempatkan',
    tanggalMulai: new Date().toISOString().split('T')[0],
    tanggalSelesai: '',
    pjbNama: 'Andrieansjah',
    pjbNip: '197410061998031002',
    pjbJabatan: 'Sekretaris Direktorat Jenderal'
  });

  // Data Loading
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([fetchPegawaiFromSheets(), fetchMagangPKLFromSheets()]);
      setPegawaiList(p);
      setPesertaList(m);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Stats
  const stats = useMemo(() => {
    const active = pesertaList.filter(p => p.status === 'Proses');
    const finished = pesertaList.filter(p => p.status === 'Selesai');
    const unplaced = active.filter(p => p.penempatan === 'Belum Ditempatkan' || !p.penempatan);
    
    const unitCounts = UNIT_KERJA.map(unit => ({
      name: unit,
      count: active.filter(p => p.penempatan === unit).length
    })).filter(u => u.count > 0);

    return { total: pesertaList.length, active: active.length, finished: finished.length, unplaced: unplaced.length, units: unitCounts };
  }, [pesertaList]);

  const filteredData = useMemo(() => {
    return pesertaList.filter(p => {
      const matchSearch = (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.nisNim || '').includes(searchTerm);
      const matchStatus = filterStatus === 'SEMUA' || p.status === filterStatus;
      const matchPlacement = filterPenempatan === 'SEMUA' || p.penempatan === filterPenempatan;
      return matchSearch && matchStatus && matchPlacement;
    });
  }, [pesertaList, searchTerm, filterStatus, filterPenempatan]);

  // CRUD Handlers
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.nisNim) return alert("Nama dan NIM/NIS wajib diisi");
    setSyncing(true);
    const payload = { ...formData, id: formData.id || Date.now().toString() };
    const ok = await syncTableRemote('MAGANG_PKL', 'SAVE', payload);
    if (ok) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'MAGANG_PKL', `Simpan data magang: ${formData.nama}`);
      await loadData();
      setActiveView('list');
      setShowSuccess(true);
    }
    setSyncing(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    const ok = await syncTableRemote('MAGANG_PKL', 'DELETE', { id: itemToDelete.id });
    if (ok) {
      logActivity('DELETE', 'MAGANG_PKL', `Hapus data magang: ${itemToDelete.nama}`);
      await loadData();
      setIsConfirmOpen(false);
    }
    setSyncing(false);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Data Peserta Lengkap
    const dataRows = filteredData.map(p => ({
      'Nama Peserta': p.nama,
      'NIM/NIS': p.nisNim,
      'Institusi': p.institusi,
      'Jurusan': p.jurusan,
      'Jenis': p.jenis,
      'Penempatan': p.penempatan,
      'Status': p.status,
      'Tanggal Mulai': p.tanggalMulai,
      'Tanggal Selesai': p.tanggalSelesai
    }));
    const wsData = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, wsData, "Daftar Peserta Magang PKL");

    // Sheet 2: Ringkasan Statistik
    const summaryData = [
      { 'Kategori Statistik': 'Total Terdaftar', 'Jumlah': stats.total },
      { 'Kategori Statistik': 'Masih Proses (Aktif)', 'Jumlah': stats.active },
      { 'Kategori Statistik': 'Sudah Selesai', 'Jumlah': stats.finished },
      { 'Kategori Statistik': 'Belum Ditempatkan di Unit', 'Jumlah': stats.unplaced },
      { 'Kategori Statistik': '', 'Jumlah': '' },
      ...stats.units.map(u => ({ 'Kategori Statistik': `Penempatan: ${u.name}`, 'Jumlah': u.count }))
    ];
    const wsStats = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsStats, "Ringkasan Penempatan");

    XLSX.writeFile(wb, `Database_Magang_PKL_DJKI_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'MAGANG_PKL', 'Ekspor Excel Lengkap (Data & Statistik)');
  };

  // Document Batch Generation Logic
  const selectedPeserta = useMemo(() => pesertaList.filter(p => selectedIds.includes(p.id)), [pesertaList, selectedIds]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 330);
    pdf.save(`${docType}_MAGANG_BATCH_${Date.now()}.pdf`);
    setSyncing(false);
  };

  const handleDownloadWord = async () => {
    if (selectedPeserta.length === 0) return;
    const pjb = pegawaiList.find(p => p.nip === formData.pjbNip) || { nama: formData.pjbNama, nip: formData.pjbNip, jabatan: formData.pjbJabatan };

    const tableRows = selectedPeserta.map((p, i) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (i + 1).toString() })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.nama.toUpperCase(), bold: true })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.nisNim })], alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (p.jurusan || '').toUpperCase() })] })], width: { size: 35, type: WidthType.PERCENTAGE } }),
      ]
    }));

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 18709 } } }, // F4 approx
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL", bold: true, size: 28, font: "Arial" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: docType === 'BALASAN' ? "SURAT BALASAN PENERIMAAN" : docType === 'NOTA' ? "NOTA DINAS PENYAMPAIAN" : "SURAT KETERANGAN", bold: true, underline: { type: UnderlineType.SINGLE }, size: 24, font: "Arial" })] }),
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "Berikut adalah daftar nama peserta:", font: "Arial" })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NAMA", bold: true })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NIM/NIS", bold: true })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "JURUSAN", bold: true })], alignment: AlignmentType.CENTER })] }),
                ]
              }),
              ...tableRows
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 1200 },
            children: [
              new TextRun({ text: `Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, font: "Arial" }),
              new TextRun({ text: `\n${pjb.jabatan}\n\n\n\n\n`, bold: true, font: "Arial" }),
              new TextRun({ text: pjb.nama || '', bold: true, underline: { type: UnderlineType.SINGLE }, font: "Arial" }),
              new TextRun({ text: `\nNIP ${pjb.nip || ''}`, font: "Arial" }),
            ]
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${docType}_Batch_${Date.now()}.docx`);
    });
  };

  const handleGlobalBack = () => {
    if (activeView === 'list') {
      navigate('/layanan');
    } else {
      setActiveView('list');
      setGenStep('SELECT');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Berhasil" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} loading={syncing} />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleGlobalBack}
            className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all"
            title="Kembali"
          >
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-gray-950 uppercase tracking-tighter leading-none">Magang & PKL Management</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Sertifikat & Administrasi Peserta Terpadu DJKI</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeView === 'list' && (
            <>
              <button onClick={() => { setFormData({ jenis: 'MAGANG', status: 'Proses', penempatan: 'Belum Ditempatkan', tanggalMulai: new Date().toISOString().split('T')[0], pjbNama: 'Andrieansjah', pjbNip: '197410061998031002', pjbJabatan: 'Sekretaris Direktorat Jenderal' }); setActiveView('editor'); }} className="px-6 py-3 bg-[#111827] text-white rounded-2xl font-black text-[9px] uppercase shadow-xl tracking-widest">+ Peserta Baru</button>
              <button onClick={() => { setGenStep('SELECT'); setActiveView('generator'); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[9px] uppercase shadow-xl tracking-widest flex items-center gap-2">
                <i className="bi bi-file-earmark-pdf"></i> Batch Dokumen
              </button>
            </>
          )}
          {activeView !== 'list' && <button onClick={() => setActiveView('list')} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest">Batal</button>}
          <button onClick={() => navigate('/layanan')} className="h-10 w-10 flex items-center justify-center bg-white border border-gray-100 rounded-xl text-gray-400"><i className="bi bi-house"></i></button>
        </div>
      </div>

      {/* STATS SECTION */}
      {activeView === 'list' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Peserta</p><h4 className="text-2xl font-black">{stats.total}</h4></div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Aktif (Proses)</p><h4 className="text-2xl font-black text-blue-600">{stats.active}</h4></div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Selesai</p><h4 className="text-2xl font-black text-emerald-600">{stats.finished}</h4></div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm"><p className="text-[8px] font-black text-rose-600 uppercase tracking-widest mb-1">Belum Ditempatkan</p><h4 className="text-2xl font-black text-rose-600">{stats.unplaced}</h4></div>
        </div>
      )}

      {/* LIST VIEW */}
      {activeView === 'list' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="text" placeholder="Cari Nama atau NIM/NIS..." className="w-full pl-12 pr-4 py-3.5 bg-gray-50 rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="px-6 py-3.5 bg-gray-50 rounded-2xl text-[9px] font-black uppercase outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="SEMUA">SEMUA STATUS</option>
              <option value="Proses">MASIH PROSES</option>
              <option value="Selesai">SUDAH SELESAI</option>
            </select>
            <select className="px-6 py-3.5 bg-gray-50 rounded-2xl text-[9px] font-black uppercase outline-none" value={filterPenempatan} onChange={e => setFilterPenempatan(e.target.value)}>
              <option value="SEMUA">SEMUA PENEMPATAN</option>
              <option value="Belum Ditempatkan">BELUM DITEMPATKAN</option>
              {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 30)}...</option>)}
            </select>
            <button onClick={handleExportExcel} className="px-6 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest border border-emerald-700 shadow-lg active:scale-95 transition-all">
              <i className="bi bi-file-earmark-spreadsheet-fill mr-2"></i> Ekspor Excel
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                <tr>
                  <th className="px-8 py-5">Peserta & Institusi</th>
                  <th className="px-4 py-5">Penempatan</th>
                  <th className="px-4 py-5 text-center">Periode</th>
                  <th className="px-4 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Opsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/5 group transition-all">
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p>
                      <p className="text-[9px] font-bold text-blue-600 mt-0.5">{p.nisNim} • {p.institusi}</p>
                    </td>
                    <td className="px-4 py-5">
                      <p className={`text-[9px] font-black uppercase leading-tight ${p.penempatan === 'Belum Ditempatkan' ? 'text-rose-500 italic' : 'text-gray-600'}`}>{p.penempatan || '-'}</p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <p className="text-[9px] font-bold text-gray-500 uppercase">{p.tanggalMulai} s/d</p>
                      <p className="text-[9px] font-bold text-gray-500 uppercase">{p.tanggalSelesai || '?'}</p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${p.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{p.status}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setFormData(p); setActiveView('editor'); }} className="h-8 w-8 flex items-center justify-center bg-white border rounded-lg text-blue-600"><i className="bi bi-pencil"></i></button>
                        {isSuperadmin && <button onClick={() => { setItemToDelete(p); setIsConfirmOpen(true); }} className="h-8 w-8 flex items-center justify-center bg-white border rounded-lg text-rose-600"><i className="bi bi-trash"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan={5} className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Data tidak ditemukan atau filter tidak sesuai</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDITOR VIEW (CRUD) */}
      {activeView === 'editor' && (
        <div className="max-w-4xl mx-auto animate-modalEnter">
          <form onSubmit={handleSave} className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Nama Lengkap</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">NIM / NIS</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.nisNim || ''} onChange={e => setFormData({...formData, nisNim: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Institusi Asal</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.institusi || ''} onChange={e => setFormData({...formData, institusi: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Jurusan / Prodi</label><input type="text" className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.jurusan || ''} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Jenis Program</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as any})}><option value="MAGANG">MAGANG</option><option value="PKL">PKL</option></select></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Penempatan Unit</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.penempatan} onChange={e => setFormData({...formData, penempatan: e.target.value})}>
                <option value="Belum Ditempatkan">BELUM DITEMPATKAN</option>
                {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
              </select></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Tanggal Mulai</label><input type="date" className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black text-xs" value={formData.tanggalMulai || ''} onChange={e => setFormData({...formData, tanggalMulai: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Tanggal Selesai</label><input type="date" className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black text-xs" value={formData.tanggalSelesai || ''} onChange={e => setFormData({...formData, tanggalSelesai: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-3">Status Administrasi</label><select className="w-full px-6 py-3.5 bg-gray-50 border-2 rounded-2xl font-black uppercase text-xs outline-none focus:border-blue-600" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="Proses">DALAM PROSES</option><option value="Selesai">SUDAH SELESAI</option></select></div>
            </div>
            
            <div className="pt-8 border-t space-y-8">
              <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><i className="bi bi-person-check"></i> Pejabat Penandatangan Dokumen</h5>
              <SearchableSelect label="Pilih Pejabat (untuk TND)" options={pegawaiList.map(p => ({ value: p.nip, label: p.nama, subLabel: p.jabatan }))} value={formData.pjbNip || ''} onChange={v => { const p = pegawaiList.find(x => x.nip === v); setFormData({...formData, pjbNip: v, pjbNama: p?.nama, pjbJabatan: p?.jabatan}); }} />
            </div>

            <div className="pt-10 flex justify-center">
              <button type="submit" disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">
                {syncing ? 'Sinkronisasi Cloud...' : 'Simpan Data Peserta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GENERATOR VIEW (BATCH DOKUMEN) */}
      {activeView === 'generator' && (
        <div className="max-w-7xl mx-auto animate-modalEnter space-y-10">
          {genStep === 'SELECT' ? (
            <div className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b pb-8">
                <div>
                  <h4 className="text-xl font-black uppercase text-gray-950 tracking-tighter">Pilih Jenis Dokumen Terpadu</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Daftar peserta yang masih dalam status 'Proses'</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-[1.5rem]">
                  <button onClick={() => setDocType('BALASAN')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${docType === 'BALASAN' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Surat Balasan</button>
                  <button onClick={() => setDocType('NOTA')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${docType === 'NOTA' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Nota Dinas</button>
                  <button onClick={() => setDocType('SERTIFIKAT')} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${docType === 'SERTIFIKAT' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Sertifikat</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pesertaList.filter(p => p.status === 'Proses').map(p => (
                  <div key={p.id} onClick={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : (docType === 'SERTIFIKAT' ? [p.id] : [...prev, p.id]))} className={`p-6 border-2 rounded-[2rem] cursor-pointer transition-all ${selectedIds.includes(p.id) ? 'border-blue-600 bg-blue-50/50 shadow-lg' : 'border-gray-50 bg-gray-50/30'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-white ${selectedIds.includes(p.id) ? 'bg-blue-600' : 'bg-gray-200'}`}>{selectedIds.includes(p.id) ? <i className="bi bi-check-lg"></i> : <i className="bi bi-person"></i>}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase truncate">{p.nama}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-1 truncate">{p.institusi}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t flex justify-center">
                <button disabled={selectedIds.length === 0} onClick={() => setGenStep('PREVIEW')} className="px-24 py-5 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 disabled:bg-gray-200">Pratinjau Dokumen Terpadu</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-8">
               <div className="flex gap-4 no-print">
                  <button onClick={() => setGenStep('SELECT')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Ubah Pilihan</button>
                  <button onClick={handleDownloadWord} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"><i className="bi bi-file-earmark-word"></i> Word (.docx)</button>
                  <button onClick={handleDownloadPdf} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf"></i> Download PDF (F4)</button>
               </div>

               <div className="bg-gray-300/50 py-10 w-full flex flex-col items-center overflow-x-auto no-scrollbar">
                  <div ref={pdfRef} className="bg-white text-black font-arial p-[1.5cm_2cm] border shadow-2xl relative" style={{ width: '210mm', minHeight: '330mm' }}>
                     <div className="flex flex-col items-center text-center mb-8 border-b-[3pt] border-black pb-4 text-black">
                        <img src={LOGO_PENGAYOMAN_URL} className="h-20 w-auto mb-2 object-contain" alt="Logo" crossOrigin="anonymous" />
                        <p className="text-[12pt] font-bold leading-tight uppercase text-black">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p className="text-[12pt] font-bold uppercase leading-tight text-black">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                        <p className="text-[8.5pt] mt-1 text-black font-normal">Jalan H.R. Rasuna Said Kav 8-9, Kuningan Jakarta Selatan 12940</p>
                     </div>

                     <div className="text-center mb-10 text-black">
                        <h1 className="text-[14pt] font-bold uppercase underline text-black">
                          {docType === 'BALASAN' ? "SURAT BALASAN PENERIMAAN" : docType === 'NOTA' ? "NOTA DINAS PENYAMPAIAN" : "SURAT KETERANGAN MAGANG / PKL"}
                        </h1>
                        <p className="text-[11pt] font-bold mt-1 text-black uppercase">NOMOR: W.1.KP.04.05-{new Date().getFullYear()}</p>
                     </div>

                     <div className="text-[11pt] space-y-6 text-justify leading-relaxed text-black">
                        <p className="text-black">
                          {docType === 'BALASAN' ? "Merujuk pada surat permohonan magang dari institusi terkait, bersama ini disampaikan bahwa Direktorat Jenderal Kekayaan Intelektual menyetujui pelaksanaan program bagi nama-nama sebagai berikut:" : 
                           docType === 'NOTA' ? "Disampaikan kepada Direktur terkait untuk dapat memfasilitasi dan menempatkan peserta magang/PKL berikut pada unit kerja yang dituju sesuai jadwal pelaksanaan:" :
                           "Diterangkan dengan sesungguhnya bahwa nama yang tercantum di bawah ini telah menyelesaikan program praktik di lingkungan DJKI:"}
                        </p>
                        
                        <table className="w-full border-collapse border border-black text-[10pt] text-black">
                           <thead>
                              <tr className="bg-gray-100 font-bold uppercase">
                                 <th className="border border-black p-2 w-10 text-center">NO</th>
                                 <th className="border border-black p-2 text-center">NAMA PESERTA</th>
                                 <th className="border border-black p-2 text-center">NIM / NIS</th>
                                 <th className="border border-black p-2 text-center">JURUSAN / PRODI</th>
                              </tr>
                           </thead>
                           <tbody>
                              {selectedPeserta.map((p, i) => (
                                <tr key={p.id}>
                                   <td className="border border-black p-2 text-center">{i+1}</td>
                                   <td className="border border-black p-2 font-bold uppercase">{p.nama}</td>
                                   <td className="border border-black p-2 text-center">{p.nisNim}</td>
                                   <td className="border border-black p-2 uppercase">{p.jurusan}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>

                        <p className="text-black">Demikian disampaikan untuk dapat dipergunakan sebagaimana mestinya.</p>

                        <div className="mt-20 ml-[55%] flex flex-col items-center leading-tight text-black text-center">
                           <p className="text-black">Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                           <p className="font-bold uppercase mb-24 mt-2 text-black">{formData.pjbJabatan},</p>
                           <p className="font-bold uppercase underline leading-none text-black">{formData.pjbNama}</p>
                           <p className="mt-1 text-black font-bold">NIP {formData.pjbNip}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default MagangPKLPage;
