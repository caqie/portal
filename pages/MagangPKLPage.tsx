
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchMagangPKLFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai, MagangPKL } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, AlignmentType, UnderlineType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
// @ts-ignore
import saveAs from 'file-saver';
import * as XLSX from 'xlsx';

const MagangPKLPage = () => {
  const navigate = useNavigate();
  const { canEdit, logActivity, isSuperadmin } = useAuth();
  
  const [pesertaList, setPesertaList] = useState<MagangPKL[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [previewType, setPreviewType] = useState<'BALASAN' | 'NOTA' | 'SERTIFIKAT'>('BALASAN');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('SEMUA');
  const [filterPenempatan, setFilterPenempatan] = useState('SEMUA');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MagangPKL | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<MagangPKL>>({
    jenis: 'MAGANG',
    status: 'Proses',
    penempatan: 'Belum Ditempatkan',
    pjbNama: 'Andrieansjah',
    pjbNip: '197410061998031002',
    pjbJabatan: 'Sekretaris Direktorat Jenderal'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([fetchPegawaiFromSheets(), fetchMagangPKLFromSheets()]);
      setPegawaiList(pRes);
      setPesertaList(mRes);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredPeserta = useMemo(() => {
    return pesertaList.filter(p => {
      const matchesSearch = (p.nama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.institusi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (p.nisNim || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'SEMUA' || p.status === filterStatus;
      const matchesPenempatan = filterPenempatan === 'SEMUA' || p.penempatan === filterPenempatan;
      return matchesSearch && matchesStatus && matchesPenempatan;
    });
  }, [pesertaList, searchTerm, filterStatus, filterPenempatan]);

  const selectedParticipants = useMemo(() => {
    return pesertaList.filter(p => selectedIds.includes(p.id));
  }, [pesertaList, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPeserta.length) setSelectedIds([]);
    else setSelectedIds(filteredPeserta.map(p => p.id));
  };

  const handlePjbSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      setFormData({ ...formData, pjbNip: p.nip, pjbNama: p.nama, pjbJabatan: p.jabatan });
    }
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.institusi) return alert("Lengkapi nama dan institusi");
    setSyncing(true);
    const payload: MagangPKL = {
      ...formData as MagangPKL,
      id: formData.id || Date.now().toString()
    };
    try {
      const ok = await syncTableRemote('MAGANG_PKL', 'SAVE', payload);
      if (ok) {
        logActivity('CREATE', 'MAGANG', `Simpan data Magang: ${payload.nama}`);
        setShowSuccess(true);
        setActiveView('list');
        loadData();
      }
    } catch (e) { alert("Gagal sinkronisasi."); } finally { setSyncing(false); }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSyncing(true);
    try {
      await syncTableRemote('MAGANG_PKL', 'DELETE', { id: itemToDelete.id });
      setPesertaList(prev => prev.filter(p => p.id !== itemToDelete.id));
      setIsConfirmOpen(false);
    } catch (e) { alert("Gagal hapus."); } finally { setSyncing(false); }
  };

  const handleOpenPreviewBulk = () => {
    if (selectedParticipants.length === 0) return alert("Pilih minimal 1 peserta dari tabel.");
    setActiveView('preview');
  };

  const exportExcel = () => {
    if (filteredPeserta.length === 0) return alert("Tidak ada data untuk diekspor.");
    
    const data = filteredPeserta.map((p, index) => ({
      'NO': index + 1,
      'NAMA LENGKAP': p.nama.toUpperCase(),
      'NIS / NIM': p.nisNim || '-',
      'INSTITUSI': p.institusi.toUpperCase(),
      'JURUSAN / PRODI': p.jurusan.toUpperCase(),
      'JENIS PROGRAM': p.jenis,
      'TANGGAL MULAI': p.tanggalMulai,
      'TANGGAL SELESAI': p.tanggalSelesai,
      'UNIT PENEMPATAN': p.penempatan.toUpperCase(),
      'STATUS': p.status.toUpperCase()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Peserta Magang PKL");
    
    // Auto-width column logic
    const maxWidths = data.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? row[key].toString().length : 5;
        acc[i] = Math.max(acc[i] || 0, val, key.length);
      });
      return acc;
    }, []);
    ws['!cols'] = maxWidths.map((w: number) => ({ w: w + 2 }));

    XLSX.writeFile(wb, `Data_Magang_PKL_DJKI_${Date.now()}.xlsx`);
    logActivity('DOWNLOAD', 'MAGANG', `Ekspor Excel data magang (${filteredPeserta.length} record)`);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setLoading(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.5, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    pdf.save(`Dokumen_Kolektif_Magang_${Date.now()}.pdf`);
    setLoading(false);
  };

  const handleDownloadWord = () => {
    if (selectedParticipants.length === 0) return;

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NAMA", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 35, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NIS/NIM", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "JURUSAN/PRODI", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
        ],
      }),
      ...selectedParticipants.map((p, i) => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (i + 1).toString(), size: 20 })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.nama.toUpperCase(), size: 20, bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.nisNim || '-', size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.jurusan, size: 20 })] })] }),
        ]
      }))
    ];

    const participantTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows,
    });

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 18709 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "KEMENTERIAN HUKUM REPUBLIK INDONESIA", bold: true, size: 24, font: "Arial" }),
              new TextRun({ text: "\nDIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL", bold: true, size: 24, font: "Arial" }),
              new TextRun({ text: "\nJalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940", size: 16, font: "Arial" }),
            ]
          }),
          new Paragraph({ children: [new TextRun({ text: "________________________________________________________________________", bold: true })] }),
          
          ...(previewType === 'BALASAN' ? [
            new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Nomor : ${formData.nomorSurat || 'W.1.KP.03.04-...'}\t\t\tJakarta, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}`, font: "Arial" })] }),
            new Paragraph({ children: [new TextRun({ text: "Hal : Penerimaan Magang / PKL", font: "Arial" })] }),
            new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Yth. Pimpinan Perguruan Tinggi / Sekolah\ndi Tempat`, font: "Arial" })] }),
            new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Sehubungan dengan surat permohonan Magang/PKL, dengan ini kami sampaikan bahwa Direktorat Jenderal Kekayaan Intelektual MENERIMA peserta sebagaimana daftar berikut untuk melaksanakan program dimaksud.`, font: "Arial" })] }),
            new Paragraph({ spacing: { before: 400 } }),
            participantTable,
          ] : [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [new TextRun({ text: "NOTA DINAS", bold: true, underline: { type: UnderlineType.SINGLE }, size: 28 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `NOMOR : ${formData.nomorSurat || 'W.1.KP.03.03-...'}` })] }),
            new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Yth : Kepala Unit Kerja Terkait\nDari : ${formData.pjbJabatan}\nHal : Penyampaian Peserta Magang/PKL`, font: "Arial" })] }),
            new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `Bersama ini kami sampaikan data peserta yang akan ditugaskan di lingkungan unit kerja Saudara sebagai berikut:`, font: "Arial" })] }),
            new Paragraph({ spacing: { before: 400 } }),
            participantTable,
          ]),

          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 1200 },
            children: [
              new TextRun({ text: `${formData.pjbJabatan},`, bold: true, font: "Arial" }),
              new TextRun({ text: "\n\n\n\n\n", font: "Arial" }),
              new TextRun({ text: `${formData.pjbNama}`, bold: true, underline: { type: UnderlineType.SINGLE }, font: "Arial" }),
              new TextRun({ text: `\nNIP ${formData.pjbNip}`, font: "Arial" }),
            ]
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `Dokumen_Magang_Kolektif_${Date.now()}.docx`);
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="Data Magang Disimpan" />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} message="Hapus data peserta ini?" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">Magang & PKL DJKI</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Manajemen Peserta & Generator Dokumen</p>
          </div>
        </div>
        <div className="flex gap-2">
           {activeView === 'list' && (
             <>
               <button onClick={exportExcel} className="h-12 px-6 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
                 <i className="bi bi-file-earmark-spreadsheet"></i> Ekspor Excel
               </button>
               {selectedIds.length > 0 && (
                  <button onClick={handleOpenPreviewBulk} className="h-12 px-6 bg-gray-950 text-white rounded-xl font-black text-[9px] uppercase shadow-xl flex items-center gap-2 animate-bounce">
                    <i className="bi bi-file-earmark-pdf"></i> Generate Dokumen ({selectedIds.length})
                  </button>
               )}
               <button onClick={() => { setFormData({ jenis: 'MAGANG', status: 'Proses', penempatan: 'Belum Ditempatkan', pjbNama: 'Andrieansjah', pjbNip: '197410061998031002', pjbJabatan: 'Sekretaris Direktorat Jenderal' }); setActiveView('editor'); }} className="h-12 px-8 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">+ Register Baru</button>
             </>
           )}
        </div>
      </div>

      {activeView === 'list' && (
        <div className="space-y-8">
           <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                 <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                 <input type="text" placeholder="Cari Nama, NIS/NIM, atau Institusi..." className="w-full pl-12 pr-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="w-full md:w-48 px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                 <option value="SEMUA">Status: SEMUA</option>
                 <option value="Proses">PROSES</option>
                 <option value="Selesai">SELESAI</option>
              </select>
              <select className="w-full md:w-64 px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all" value={filterPenempatan} onChange={e => setFilterPenempatan(e.target.value)}>
                 <option value="SEMUA">Penempatan: SEMUA</option>
                 {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase().substring(0, 25)}...</option>)}
              </select>
           </div>

           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr>
                      <th className="px-6 py-5 text-center">
                         <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedIds.length === filteredPeserta.length && filteredPeserta.length > 0} onChange={handleSelectAll} />
                      </th>
                      <th className="px-4 py-5">Peserta</th>
                      <th className="px-4 py-5">Institusi & Jurusan</th>
                      <th className="px-4 py-5 text-center">Status</th>
                      <th className="px-10 py-5 text-right">Opsi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {filteredPeserta.map(p => (
                       <tr key={p.id} className={`hover:bg-blue-50/5 group transition-colors ${selectedIds.includes(p.id) ? 'bg-blue-50/30' : ''}`}>
                          <td className="px-6 py-5 text-center">
                             <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={selectedIds.includes(p.id)} onChange={() => handleToggleSelect(p.id)} />
                          </td>
                          <td className="px-4 py-5">
                             <p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p>
                             <p className="text-[9px] font-mono text-blue-600 font-bold">{p.nisNim || 'Tanpa NIS/NIM'}</p>
                             <span className={`mt-1 px-2 py-0.5 rounded text-[7px] font-black uppercase border inline-block ${p.jenis === 'MAGANG' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>{p.jenis}</span>
                          </td>
                          <td className="px-4 py-5"><p className="text-[10px] font-black text-gray-500 uppercase">{p.institusi}</p><p className="text-[8px] text-gray-400 font-bold uppercase">{p.jurusan}</p></td>
                          <td className="px-4 py-5 text-center">
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${p.status === 'Proses' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{p.status}</span>
                             <p className="text-[7px] text-gray-400 font-bold uppercase mt-1 truncate max-w-[120px]">{p.penempatan}</p>
                          </td>
                          <td className="px-10 py-5 text-right">
                             <div className="flex justify-end gap-2">
                                <button onClick={() => { setSelectedIds([p.id]); setActiveView('preview'); }} className="h-9 px-4 bg-gray-950 text-white rounded-xl text-[8px] font-black uppercase shadow-lg">Docs</button>
                                <button onClick={() => { setFormData(p); setActiveView('editor'); }} className="h-9 w-9 bg-white border border-gray-100 rounded-xl text-amber-600 shadow-sm flex items-center justify-center"><i className="bi bi-pencil-fill"></i></button>
                                {isSuperadmin && <button onClick={() => { setItemToDelete(p); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 rounded-xl text-rose-500 shadow-sm flex items-center justify-center"><i className="bi bi-trash-fill"></i></button>}
                             </div>
                          </td>
                       </tr>
                    ))}
                    {filteredPeserta.length === 0 && !loading && (
                      <tr><td colSpan={5} className="py-24 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Tidak ada data yang sesuai filter</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-4xl mx-auto animate-modalEnter bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-10">
           <div className="border-b pb-6">
              <h4 className="text-xl font-black uppercase tracking-tighter">Registrasi Peserta Magang/PKL</h4>
           </div>
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nama Lengkap</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">NIS / NIM</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.nisNim} onChange={e => setFormData({...formData, nisNim: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jenis Program</label><select className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black outline-none focus:border-blue-600" value={formData.jenis} onChange={e => setFormData({...formData, jenis: e.target.value as any})}><option value="MAGANG">MAGANG</option><option value="PKL">PKL</option></select></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Jurusan / Prodi</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.jurusan} onChange={e => setFormData({...formData, jurusan: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Institusi</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.institusi} onChange={e => setFormData({...formData, institusi: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Mulai</label><input type="date" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black outline-none focus:border-blue-600" value={formData.tanggalMulai} onChange={e => setFormData({...formData, tanggalMulai: e.target.value})} /></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Tanggal Selesai</label><input type="date" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black outline-none focus:border-blue-600" value={formData.tanggalSelesai} onChange={e => setFormData({...formData, tanggalSelesai: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Penempatan</label><select className="w-full px-5 py-3 bg-blue-50 border-2 border-blue-100 rounded-xl text-xs font-black uppercase outline-none focus:border-blue-600" value={formData.penempatan} onChange={e => setFormData({...formData, penempatan: e.target.value})}><option value="Belum Ditempatkan">BELUM DITEMPATKAN</option>{UNIT_KERJA.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                 <div className="space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Status Program</label><select className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black outline-none focus:border-blue-600" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}><option value="Proses">BERJALAN (PROSES)</option><option value="Selesai">SUDAH SELESAI</option></select></div>
              </div>
              
              <div className="pt-6 border-t">
                 <h5 className="text-[10px] font-black text-gray-950 uppercase mb-4 tracking-widest">Penandatangan Dokumen</h5>
                 <SearchableSelect label="Pilih Pejabat" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: p.jabatan}))} value={formData.pjbNip || ''} onChange={handlePjbSelect} />
                 <div className="mt-4 space-y-1.5"><label className="text-[8px] font-black text-gray-400 uppercase ml-2">Nomor Surat (Optional)</label><input type="text" className="w-full px-5 py-3 bg-gray-50 border-2 rounded-xl text-xs font-black outline-none focus:border-blue-600" value={formData.nomorSurat} onChange={e => setFormData({...formData, nomorSurat: e.target.value})} placeholder="Contoh: HKI.1-KP.03.04-123" /></div>
              </div>
           </div>
           <div className="pt-8 border-t flex justify-center gap-3">
              <button onClick={() => setActiveView('list')} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Batal</button>
              <button onClick={handleSave} disabled={syncing} className="px-20 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                 {syncing && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                 <span>Simpan Data Peserta</span>
              </button>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex flex-wrap justify-center gap-2 no-print px-6">
              {['BALASAN', 'NOTA', 'SERTIFIKAT'].map(t => (
                <button key={t} onClick={() => setPreviewType(t as any)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${previewType === t ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>{t === 'BALASAN' ? 'Surat Balasan' : t === 'NOTA' ? 'Nota Dinas' : 'Sertifikat/Suker'}</button>
              ))}
              <div className="w-full md:w-auto ml-auto flex gap-2">
                <button onClick={() => setActiveView('editor')} className="px-6 py-3 bg-white text-gray-500 border border-gray-200 rounded-xl text-[9px] font-black uppercase">Edit Data</button>
                <button onClick={handleDownloadWord} className="px-6 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[9px] font-black uppercase shadow-sm flex items-center gap-2"><i className="bi bi-file-earmark-word-fill"></i> Word</button>
                <button onClick={handleDownloadPdf} className="px-8 py-3 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-xl flex items-center gap-2"><i className="bi bi-file-earmark-pdf-fill"></i> PDF (F4)</button>
              </div>
           </div>

           <div className="bg-gray-200/50 py-10 flex flex-col items-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl overflow-hidden text-black font-arial p-[1.5cm_2cm]" style={{ width: '210mm', minHeight: '330mm' }}>
                 <div className="flex flex-col items-center text-center mb-6 border-b-[2pt] border-black pb-2">
                    <img src={DEFAULT_LOGO} className="h-16 w-auto mb-2 object-contain" alt="Logo" crossOrigin="anonymous" />
                    <p className="text-[11pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                    <p className="text-[11pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                    <p className="text-[8pt] font-bold mt-1">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                 </div>

                 {previewType === 'BALASAN' && (
                    <div className="text-[11pt] space-y-6 text-justify leading-relaxed">
                       <div className="flex justify-between">
                          <div className="space-y-1">
                             <p>Nomor : {formData.nomorSurat || 'W.1.KP.03.04-...'}</p>
                             <p>Hal : Penerimaan Magang / PKL</p>
                          </div>
                          <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                       </div>
                       <p className="mt-4">Yth. Pimpinan Institusi Terkait<br/>di Tempat</p>
                       <p>Sehubungan dengan surat permohonan Magang/PKL, dengan ini kami sampaikan bahwa Direktorat Jenderal Kekayaan Intelektual <strong>MENERIMA</strong> nama-nama peserta sebagaimana terlampir/berikut untuk melaksanakan program dimaksud.</p>
                       
                       <table className="w-full border-collapse border border-black text-[9pt]">
                          <thead>
                             <tr className="bg-gray-100">
                                <th className="border border-black p-1 w-10">NO</th>
                                <th className="border border-black p-1">NAMA PESERTA</th>
                                <th className="border border-black p-1 w-32">NIS/NIM</th>
                                <th className="border border-black p-1">JURUSAN/PRODI</th>
                             </tr>
                          </thead>
                          <tbody>
                             {selectedParticipants.map((p, i) => (
                                <tr key={p.id}>
                                   <td className="border border-black p-1 text-center">{i + 1}</td>
                                   <td className="border border-black p-1 font-bold uppercase">{p.nama}</td>
                                   <td className="border border-black p-1 text-center">{p.nisNim || '-'}</td>
                                   <td className="border border-black p-1 uppercase">{p.jurusan}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>

                       <p>Pelaksanaan program akan disesuaikan dengan kurikulum yang berlaku dan ditempatkan pada unit kerja di lingkungan DJKI. Selama masa magang, para peserta wajib mematuhi segala peraturan kedinasan yang berlaku.</p>
                       <p>Demikian kami sampaikan, atas kerja samanya diucapkan terima kasih.</p>
                       <div className="mt-12 ml-[55%] text-left leading-tight">
                          <p className="font-bold uppercase mb-24">{formData.pjbJabatan},</p>
                          <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                          <p className="mt-1">NIP {formData.pjbNip}</p>
                       </div>
                    </div>
                 )}

                 {previewType === 'NOTA' && (
                    <div className="text-[11pt] space-y-6 text-justify leading-relaxed">
                       <div className="text-center mb-8">
                          <h1 className="text-[13pt] font-bold uppercase underline">NOTA DINAS</h1>
                          <p className="text-[11pt] font-bold uppercase">NOMOR : {formData.nomorSurat || 'W.1.KP.03.03-...'}</p>
                       </div>
                       <div className="grid grid-cols-[100px_10px_1fr] gap-x-2">
                          <span>Yth</span><span>:</span><span>Kepala Unit Kerja Terkait</span>
                          <span>Dari</span><span>:</span><span>{formData.pjbJabatan}</span>
                          <span>Hal</span><span>:</span><span>Penyampaian Peserta Magang/PKL</span>
                          <span>Tanggal</span><span>:</span><span>{new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span>
                       </div>
                       <hr className="border-black"/>
                       <p>Bersama ini kami sampaikan data peserta yang akan ditugaskan di lingkungan unit kerja Saudara sebagai berikut:</p>
                       <table className="w-full border-collapse border border-black text-[9pt]">
                          <thead>
                             <tr className="bg-gray-100">
                                <th className="border border-black p-1 w-10">NO</th>
                                <th className="border border-black p-1">NAMA PESERTA</th>
                                <th className="border border-black p-1 w-32">NIS/NIM</th>
                                <th className="border border-black p-1">JURUSAN/PRODI</th>
                             </tr>
                          </thead>
                          <tbody>
                             {selectedParticipants.map((p, i) => (
                                <tr key={p.id}>
                                   <td className="border border-black p-1 text-center">{i + 1}</td>
                                   <td className="border border-black p-1 font-bold uppercase">{p.nama}</td>
                                   <td className="border border-black p-1 text-center">{p.nisNim || '-'}</td>
                                   <td className="border border-black p-1 uppercase">{p.jurusan}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                       <p>Diharapkan Saudara dapat memberikan bimbingan dan arahan teknis sesuai dengan tugas dan fungsi pada unit kerja masing-masing.</p>
                       <p>Demikian untuk dipedomani dan dilaksanakan.</p>
                       <div className="mt-12 ml-[55%] text-left leading-tight">
                          <p className="font-bold uppercase mb-24">{formData.pjbJabatan},</p>
                          <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                       </div>
                    </div>
                 )}

                 {previewType === 'SERTIFIKAT' && (
                    <div className="space-y-10">
                       {selectedParticipants.map((p, i) => (
                          <div key={p.id} className={i > 0 ? "pt-[2cm] border-t-2 border-dashed border-gray-300 mt-10" : ""}>
                             <div className="text-center mt-10 mb-10">
                                <h1 className="text-[15pt] font-bold uppercase underline">SURAT KETERANGAN</h1>
                                <p className="text-[11pt] font-bold uppercase">NOMOR : {formData.nomorSurat || 'W.1.KP.03.04-...'}</p>
                             </div>
                             <p>Yang bertanda tangan di bawah ini menerangkan bahwa:</p>
                             <div className="grid grid-cols-[150px_10px_1fr] gap-x-3 ml-8 my-6">
                                <span>Nama</span><span>:</span><span className="font-bold uppercase">{p.nama}</span>
                                <span>NIS / NIM</span><span>:</span><span className="font-bold">{p.nisNim || '-'}</span>
                                <span>Asal Institusi</span><span>:</span><span className="uppercase">{p.institusi}</span>
                                <span>Jurusan / Prodi</span><span>:</span><span className="uppercase">{p.jurusan}</span>
                             </div>
                             <p className="text-justify">Telah melaksanakan program <strong>{p.jenis}</strong> pada Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum Republik Indonesia, terhitung mulai tanggal {p.tanggalMulai} sampai dengan {p.tanggalSelesai}.</p>
                             <p className="text-justify mt-4">Selama melaksanakan kegiatan tersebut, yang bersangkutan telah menunjukkan kesungguhan, disiplin, dan dedikasi yang baik dalam membantu pelaksanaan tugas-tugas administratif pada unit kerja {p.penempatan}.</p>
                             <p className="mt-10">Demikian surat keterangan ini diberikan agar dapat dipergunakan sebagaimana mestinya.</p>
                             <div className="mt-14 ml-[55%] text-left leading-tight">
                                <p>Jakarta, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                                <p className="font-bold uppercase mb-24 mt-2">{formData.pjbJabatan},</p>
                                <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                                <p className="mt-1">NIP {formData.pjbNip}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MagangPKLPage;
