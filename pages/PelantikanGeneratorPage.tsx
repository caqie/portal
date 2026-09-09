import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, fetchPelantikanFromSheets, uploadFileToDrive } from '../spreadsheetService'; // Asumsi path ini benar
import { Pegawai } from '../types'; // Asumsi path ini benar
import { useAuth } from '../AuthContext';
import { formatPegawaiName, formatNip } from '../constants';
import { LOGO_GARUDA_EMAS_URL, LOGO_GARUDA_RESMI_URL } from '../assets/branding';
import SearchableSelect from '../components/SearchableSelect';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Helper Function: Angka Terbilang
const terbilang = (nilai: number) => {
    const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";
    if (nilai < 12) {
        temp = " " + huruf[nilai];
    } else if (nilai < 20) {
        temp = terbilang(nilai - 10) + " Belas";
    } else if (nilai < 100) {
        temp = terbilang(Math.floor(nilai / 10)) + " Puluh" + terbilang(nilai % 10);
    } else if (nilai < 200) {
        temp = " Seratus" + terbilang(nilai - 100);
    } else if (nilai < 1000) {
        temp = terbilang(Math.floor(nilai / 100)) + " Ratus" + terbilang(nilai % 100);
    } else if (nilai < 2000) {
        temp = " Seribu" + terbilang(nilai - 1000);
    } else if (nilai < 1000000) {
        temp = terbilang(Math.floor(nilai / 1000)) + " Ribu" + terbilang(nilai % 1000);
    }
    return temp;
};

// Helper Function: Format Tanggal Lengkap
const formatTanggalLengkap = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const dayName = days[date.getDay()];
        const dayNum = date.getDate();
        const monthName = months[date.getMonth()];
        const yearNum = date.getFullYear();

        const terbilangHari = terbilang(dayNum).trim();
        const terbilangTahun = terbilang(yearNum).trim();

        return `${dayName} Tanggal ${terbilangHari} Bulan ${monthName} Tahun ${terbilangTahun}`;
    } catch (e) {
        return dateString;
    }
};

// Helper Function: Get Oath Texts based on Religion
const getOathTexts = (agama: string) => {
    const a = agama?.toLowerCase() || '';
    let pembuka = "Demi Tuhan, saya bersumpah";
    let penutup = "";

    if (a.includes('islam')) {
        pembuka = "Demi Allah, saya bersumpah";
        penutup = "";
    } else if (a.includes('kristen')) {
        pembuka = "Demi Tuhan, saya berjanji";
        penutup = "Semoga Tuhan memberkati kita.";
    } else if (a.includes('katolik')) {
        pembuka = "Demi Allah, saya bersumpah";
        penutup = "Semoga Tuhan memberkati kita.";
    }
    return { pembuka, penutup };
};

const PelantikanGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [docType, setDocType] = useState<'BA' | 'PAKTA'>('BA');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [selectedNips, setSelectedNips] = useState<string[]>([]);
  const [activePreviewNip, setActivePreviewNip] = useState<string>('');
  const [asnSearchQuery, setAsnSearchQuery] = useState('');

  const initialFormData = {
    nomor: 'HKI.1-KP.03.04-',
    hari: 'Rabu',
    tanggal: new Date().toISOString().split('T')[0],
    tempat: 'Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum Republik Indonesia',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    asnNip: '', asnNama: '', asnPangkat: '', asnGolRuang: '', asnJabatan: '', asnJabatanBaru: '', asnJabatanLama: '', asnAgama: '',
    saksi1Nama: '', saksi1Nip: '', saksi1Jabatan: '',
    saksi2Nama: '', saksi2Nip: '', saksi2Jabatan: '',
    nomorSk: '',
    tanggalSk: '',
    kataPelantikan: '',
    penutupKataPelantikan: ''
  };

  const [formData, setFormData] = useState<any>(initialFormData);
  const [logoVariant, setLogoVariant] = useState<'emas' | 'resmi'>('emas');
  const [asnJabatanMap, setAsnJabatanMap] = useState<Record<string, string>>({});
  const [globalJabatanBaru, setGlobalJabatanBaru] = useState<string>('');

  useEffect(() => {
    if (selectedNips.length > 0) {
      if (!selectedNips.includes(activePreviewNip)) {
        setActivePreviewNip(selectedNips[0]);
      }
    } else {
      setActivePreviewNip('');
    }
  }, [selectedNips, activePreviewNip]);

  const activePegawai = useMemo(() => {
    return pegawaiList.find(p => p.nip === activePreviewNip);
  }, [pegawaiList, activePreviewNip]);

  const currentPreviewData = useMemo(() => {
    if (!activePegawai) {
      const jbt = (formData.asnJabatanBaru || formData.asnJabatan || '').trim();
      return {
        ...formData,
        asnJabatan: jbt,
        asnJabatanBaru: jbt
      };
    }
    const oathTexts = getOathTexts(activePegawai.agama || '');
    const jabatanBaru = (asnJabatanMap[activePegawai.nip] || formData.asnJabatanBaru || formData.asnJabatan || '').trim();
    return {
      ...formData,
      asnNip: activePegawai.nip,
      asnNama: activePegawai.nama,
      asnPangkat: activePegawai.pangkat || '',
      asnGolRuang: activePegawai.golRuang || '',
      asnJabatan: jabatanBaru,
      asnJabatanBaru: jabatanBaru,
      asnJabatanLama: activePegawai.jabatan || '',
      asnAgama: activePegawai.agama || '',
      kataPelantikan: oathTexts.pembuka,
      penutupKataPelantikan: oathTexts.penutup
    };
  }, [formData, activePegawai, asnJabatanMap]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (bypass = false) => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([fetchPegawaiFromSheets(bypass), fetchPelantikanFromSheets(bypass)]);
      setPegawaiList(p);
      setHistoryList(h || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) {
        const oathTexts = getOathTexts(p.agama || '');
        const jbt = (asnJabatanMap[p.nip] || formData.asnJabatanBaru || formData.asnJabatan || '').trim();
        setFormData({ 
            ...formData, 
            asnNip: p.nip, 
            asnNama: p.nama, 
            asnPangkat: p.pangkat, 
            asnGolRuang: p.golRuang, 
            asnJabatan: jbt,
            asnJabatanBaru: jbt,
            asnJabatanLama: p.jabatan || '',
            asnAgama: p.agama,
            kataPelantikan: oathTexts.pembuka, 
            penutupKataPelantikan: oathTexts.penutup
        });
    }
  };

  const handleSave = async () => {
    if (selectedNips.length === 0) return alert("Pilih pegawai terlebih dahulu");

    // Validasi Jabatan Baru
    if (!editingId) {
      const missingJabatan = selectedNips.filter(nip => {
        const j = (asnJabatanMap[nip] || formData.asnJabatanBaru || formData.asnJabatan || '').trim();
        return !j;
      });
      if (missingJabatan.length > 0) {
        const sample = pegawaiList.find(x => x.nip === missingJabatan[0]);
        if (!confirm(`Terdapat ${missingJabatan.length} pegawai (misal: ${sample?.nama || missingJabatan[0]}) yang belum diisi Jabatan Baru. Apakah Anda yakin ingin menyimpan?`)) {
          return;
        }
      }
    }

    setSyncing(true);
    try {
      if (editingId) {
        const jabatanBaru = (formData.asnJabatanBaru || formData.asnJabatan || '').trim();
        const updatedFormData = {
          ...formData,
          asnJabatan: jabatanBaru,
          asnJabatanBaru: jabatanBaru
        };
        const payload = {
          id: editingId,
          nomor: updatedFormData.nomor,
          asnNip: updatedFormData.asnNip,
          type: docType,
          data: JSON.stringify(updatedFormData)
        };
        const ok = await syncTableRemote('PELANTIKAN', 'SAVE', payload);
        if (ok) {
          logActivity('UPDATE', 'Pelantikan', `Simpan Dokumen Pelantikan: ${formData.asnNama} (Jabatan Baru: ${jabatanBaru})`);
          await loadData();
          setShowSuccess(true);
          setActiveView('list');
        }
      } else {
        let successCount = 0;
        for (let i = 0; i < selectedNips.length; i++) {
          const nip = selectedNips[i];
          const p = pegawaiList.find(x => x.nip === nip);
          if (p) {
            const oathTexts = getOathTexts(p.agama || '');
            const jabatanBaru = (asnJabatanMap[p.nip] || formData.asnJabatanBaru || formData.asnJabatan || '').trim();
            const singleAsnData = {
              ...formData,
              asnNip: p.nip,
              asnNama: p.nama,
              asnPangkat: p.pangkat || '',
              asnGolRuang: p.golRuang || '',
              asnJabatan: jabatanBaru,
              asnJabatanBaru: jabatanBaru,
              asnJabatanLama: p.jabatan || '',
              asnAgama: p.agama || '',
              kataPelantikan: oathTexts.pembuka,
              penutupKataPelantikan: oathTexts.penutup
            };
            const payload = {
              id: `PEL-${Date.now()}-${i}`,
              nomor: formData.nomor,
              asnNip: p.nip,
              type: docType,
              data: JSON.stringify(singleAsnData)
            };
            const ok = await syncTableRemote('PELANTIKAN', 'SAVE', payload);
            if (ok) {
              successCount++;
            }
          }
        }
        if (successCount > 0) {
          logActivity('CREATE', 'Pelantikan', `Buat Dokumen Pelantikan Baru untuk ${successCount} Pegawai`);
          await loadData();
          setShowSuccess(true);
          setActiveView('list');
        } else {
          alert("Gagal menyimpan dokumen.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    const p = pegawaiList.find(x => x.nip === itemToDelete.asnNip);
    const deletePayload = { 
      id: itemToDelete.id || '', 
      nip: itemToDelete.asnNip || '',
      nama: p?.nama || 'Dokumen Pelantikan'
    };

    if (!deletePayload.id && !deletePayload.nip) {
        alert("Gagal menghapus: Identifikasi data (ID atau NIP) tidak ditemukan.");
        setIsConfirmOpen(false);
        return;
    }

    setSyncing(true);
    try {
      const ok = await syncTableRemote('PELANTIKAN', 'DELETE', deletePayload);
      if (ok) {
        logActivity('DELETE', 'Pelantikan', `Hapus Dokumen Pelantikan: ${deletePayload.nama} (ID: ${deletePayload.id})`);
        await loadData(true);
        setIsConfirmOpen(false);
      } else {
        alert("Gagal menghapus data dari server.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan teknis saat menghapus.");
    } finally {
      setSyncing(false);
    }
  };

  const handleEdit = (item: any) => {
    try {
      const data = item.data && item.data.trim() ? JSON.parse(item.data) : {};
      const jbt = data.asnJabatanBaru || data.asnJabatan || '';
      data.asnJabatanBaru = jbt;
      data.asnJabatan = jbt;
      setFormData(data);
      if (data.asnNip) {
        setAsnJabatanMap({ [data.asnNip]: jbt });
        setGlobalJabatanBaru(jbt);
      }
      setEditingId(item.id);
      setDocType(item.type || 'BA');
      setSelectedNips(data.asnNip ? [data.asnNip] : []);
      setActivePreviewNip(data.asnNip || '');
      setActiveView('editor');
    } catch (e) {
      console.error("Error parsing data", e);
      alert("Gagal memuat data untuk diedit. Format data mungkin tidak valid.");
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    try {
        const isLandscape = docType === 'PAKTA';
        const pdfWidth = isLandscape ? 330 : 210;
        const pdfHeight = isLandscape ? 210 : 330;

        const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
        const pdf = new jsPDF({ 
            orientation: isLandscape ? 'landscape' : 'portrait', 
            unit: 'mm', 
            format: [pdfWidth, pdfHeight] 
        });
        
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${docType}_Pelantikan_${currentPreviewData.asnNama.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
        alert("Gagal cetak PDF.");
    } finally {
        setSyncing(false);
    }
  };

  const handleSaveToDossier = async () => {
    if (!pdfRef.current || !currentPreviewData.asnNip) return;
    setSyncing(true);
    try {
      const isLandscape = docType === 'PAKTA';
      const pdfWidth = isLandscape ? 330 : 210;
      const pdfHeight = isLandscape ? 210 : 330;

      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true });
      const pdf = new jsPDF({ 
          orientation: isLandscape ? 'landscape' : 'portrait', 
          unit: 'mm', 
          format: [pdfWidth, pdfHeight] 
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBase64 = pdf.output('datauristring');
      
      const fileName = `${docType}_Pelantikan_${currentPreviewData.asnNama.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const res = await uploadFileToDrive(fileName, 'application/pdf', pdfBase64);
      
      if (res.success && res.fileUrl) {
        const payload = {
          id: `DOS-${Date.now()}`,
          nip: currentPreviewData.asnNip,
          namaPegawai: currentPreviewData.asnNama,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: `Dokumen ${docType} Pelantikan / Pakta Integritas`,
          fileName: fileName,
          fileUrl: res.fileUrl
        };
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          logActivity('CREATE', 'DOSSIER', `Simpan Pelantikan ke Dossier: ${currentPreviewData.asnNama}`);
          alert(`Dokumen pelantikan untuk ${currentPreviewData.asnNama} berhasil disimpan ke E-Dossier Pegawai.`);
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

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 ml-3 tracking-widest block mb-1.5";
  const readOnlyClass = "w-full px-5 py-3.5 bg-gray-100 border-2 border-gray-200 rounded-2xl text-[12px] font-black outline-none text-gray-600 cursor-not-allowed";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleDelete} loading={syncing} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">BA Pelantikan & Pakta Integritas</h3>
        </div>
        <div className="flex gap-2">
          {activeView === 'list' && canEdit && (
            <button onClick={() => { 
              setFormData(initialFormData); 
              setEditingId(null); 
              setSelectedNips([]);
              setAsnSearchQuery('');
              setActivePreviewNip('');
              setActiveView('editor'); 
            }} className="px-10 h-14 bg-[#111827] text-white rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">+ Buat Dokumen Baru</button>
          )}
          {activeView !== 'list' && (
            <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
               <button onClick={() => setDocType('BA')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${docType === 'BA' ? 'bg-[#111827] text-white' : 'text-gray-400'}`}>Berita Acara</button>
               <button onClick={() => setDocType('PAKTA')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${docType === 'PAKTA' ? 'bg-[#111827] text-white' : 'text-gray-400'}`}>Pakta Integritas</button>
            </div>
          )}
        </div>
      </div>

      {activeView === 'list' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                 <tr>
                    <th className="px-10 py-6">Pegawai</th>
                    <th className="px-4 py-6">Nomor Dokumen</th>
                    <th className="px-4 py-6 text-center">Jenis</th>
                    <th className="px-10 py-6 text-right">Opsi</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {historyList.map((h, idx) => {
                    const p = pegawaiList.find(x => x.nip === h.asnNip);
                    return (
                       <tr key={h.id || idx} className="hover:bg-blue-50/5 group transition-all">
                          <td className="px-10 py-6">
                             <p className="text-[12px] font-black text-gray-950 uppercase">{p?.nama || 'Unknown'}</p>
                             <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                 <span className="text-[9px] font-mono text-blue-600">NIP. {h.asnNip}</span>
                                 {(() => {
                                   try {
                                     const parsed = h.data && h.data.trim() ? JSON.parse(h.data) : null;
                                     const jbt = parsed?.asnJabatan || parsed?.asnJabatanBaru;
                                     if (jbt) {
                                       return (
                                         <span className="text-[8.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md uppercase">
                                            {jbt}
                                         </span>
                                       );
                                     }
                                   } catch(e) {}
                                   return null;
                                 })()}
                              </div>
                          </td>
                          <td className="px-4 py-6">
                             <p className="text-[11px] font-black text-gray-700 uppercase">{h.nomor}</p>
                          </td>
                          <td className="px-4 py-6 text-center">
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${h.type === 'PAKTA' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{h.type || 'BA'}</span>
                          </td>
                          <td className="px-10 py-6 text-right">
                             <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => { 
                                   try {
                                      const data = h.data && h.data.trim() ? JSON.parse(h.data) : {};
                                      setFormData(data);
                                      setDocType(h.type || 'BA');
                                      setSelectedNips(data.asnNip ? [data.asnNip] : []);
                                      setActivePreviewNip(data.asnNip || '');
                                      setActiveView('preview');
                                   } catch(e) { alert("Gagal memuat pratinjau"); }
                                }} className="h-9 px-4 bg-[#111827] text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-black transition-all cursor-pointer"><i className="bi bi-file-earmark-pdf"></i> PDF</button>
                                {canEdit && (
                                   <button onClick={() => handleEdit(h)} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl shadow-sm flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all"><i className="bi bi-pencil-fill"></i></button>
                                )}
                                {isSuperadmin && (
                                   <button onClick={() => { setItemToDelete(h); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl shadow-sm flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><i className="bi bi-trash-fill"></i></button>
                                )}
                             </div>
                          </td>
                       </tr>
                    );
                 })}
                 {historyList.length === 0 && !loading && (
                    <tr><td colSpan={4} className="py-32 text-center opacity-30"><i className="bi bi-file-earmark-text text-5xl mb-4 block"></i><p className="text-[10px] font-black uppercase tracking-widest">Belum ada riwayat dokumen</p></td></tr>
                 )}
              </tbody>
           </table>
        </div>
      ) : activeView === 'editor' ? (
        <div className="max-w-6xl mx-auto bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           {editingId ? (
             <div className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                   <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                     <i className="bi bi-pencil-square text-blue-600"></i> Mode Ubah Dokumen Pelantikan
                   </h5>
                   <span className="text-[9px] font-bold text-gray-500 font-mono">ID: {editingId}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>Pegawai Yang Dilantik</label>
                    <input type="text" className={readOnlyClass} value={`${formData.asnNama} (NIP. ${formData.asnNip})`} readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Jabatan Lama (Master Data)</label>
                    <input type="text" className={readOnlyClass} value={formData.asnJabatanLama || (pegawaiList.find(x => x.nip === formData.asnNip)?.jabatan) || '-'} readOnly />
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <label className="text-[10.5px] font-black text-blue-700 uppercase tracking-widest block">
                    <i className="bi bi-briefcase-fill mr-1.5 text-blue-600"></i> Jabatan Baru (Yang Dilantik) *
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-3.5 bg-white border-2 border-blue-500 focus:border-blue-600 rounded-2xl text-[12px] font-extrabold uppercase outline-none focus:ring-4 focus:ring-blue-100 shadow-sm transition-all"
                    value={formData.asnJabatanBaru || formData.asnJabatan || ''} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData((prev: any) => ({ ...prev, asnJabatanBaru: val, asnJabatan: val }));
                      if (formData.asnNip) {
                        setAsnJabatanMap(prev => ({ ...prev, [formData.asnNip]: val }));
                      }
                    }}
                    placeholder="Ketikkan Jabatan Baru yang Dilantik (contoh: Pemeriksa Paten Ahli Pertama)..."
                  />
                  <p className="text-[9px] text-gray-500 font-medium">Jabatan baru ini akan dicetak pada teks Berita Acara Pelantikan dan Pakta Integritas.</p>
                </div>
             </div>
           ) : (
             <div className="space-y-6">
               <div className="space-y-4">
                 <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest block mb-1">
                   PILIH PEGAWAI YANG DILANTIK (BISA PILIH MULTIPEL)
                 </label>
                 <div className="space-y-3">
                   {/* Search Input */}
                   <div className="relative">
                     <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                     <input
                       type="text"
                       placeholder="CARI PEGAWAI BERDASARKAN NAMA, NIP, ATAU JABATAN..."
                       className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border-2 border-gray-100 focus:border-blue-600 focus:bg-white rounded-2xl text-[11px] font-bold uppercase outline-none transition-all shadow-sm"
                       value={asnSearchQuery}
                       onChange={e => setAsnSearchQuery(e.target.value)}
                     />
                     {asnSearchQuery && (
                       <button
                         type="button"
                         onClick={() => setAsnSearchQuery('')}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 transition-all font-bold cursor-pointer"
                       >
                         <i className="bi bi-x-lg text-xs"></i>
                       </button>
                     )}
                   </div>

                   {/* Controls */}
                   <div className="flex flex-wrap items-center gap-2 text-[8px] md:text-[9.5px]">
                     <button
                       type="button"
                       onClick={() => {
                         const visible = pegawaiList
                           .filter(p => {
                             const q = asnSearchQuery.toLowerCase();
                             return !q || p.nama?.toLowerCase().includes(q) || p.nip?.includes(q) || p.jabatan?.toLowerCase().includes(q);
                           })
                           .map(p => p.nip)
                           .filter(Boolean);
                         setSelectedNips(prev => Array.from(new Set([...prev, ...visible])));
                       }}
                       className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase rounded-lg transition-all cursor-pointer"
                     >
                       Centang Semua yang Tampil
                     </button>
                     <button
                       type="button"
                       onClick={() => setSelectedNips([])}
                       className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black uppercase rounded-lg transition-all cursor-pointer"
                     >
                       Bersihkan Pilihan
                     </button>
                     <span className="ml-auto flex items-center pr-2 font-black uppercase text-gray-500 tracking-wider">
                       Terpilih: <span className="text-blue-600 font-extrabold ml-1">{selectedNips.length} Pegawai</span>
                     </span>
                   </div>

                   {/* Checklist Box */}
                   <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                     {pegawaiList
                       .filter(p => {
                         const q = asnSearchQuery.toLowerCase();
                         return !q || p.nama?.toLowerCase().includes(q) || p.nip?.includes(q) || p.jabatan?.toLowerCase().includes(q);
                       })
                       .map(p => {
                         const isChecked = selectedNips.includes(p.nip);
                         return (
                           <label
                             key={p.nip}
                             className={`flex items-start md:items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                               isChecked
                                 ? 'bg-blue-50/60 border-blue-200/50 hover:bg-blue-50 text-blue-900 border-blue-100'
                                 : 'bg-white border-transparent hover:bg-gray-150/50 text-gray-800'
                             }`}
                           >
                             <input
                               type="checkbox"
                               checked={isChecked}
                               onChange={() => {
                                 setSelectedNips(prev =>
                                   isChecked ? prev.filter(nip => nip !== p.nip) : [...prev, p.nip]
                                 );
                               }}
                               className="w-4.5 h-4.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer mt-0.5 md:mt-0"
                             />
                             <div className="min-w-0">
                               <span className="text-[10px] md:text-[11px] font-black uppercase block tracking-tight leading-none text-gray-950">
                                 {p.nama}
                               </span>
                               <span className="text-[8px] font-mono font-bold text-gray-400 mt-1 block">
                                 NIP. {p.nip} — {p.jabatan || 'No Jabatan'}
                               </span>
                             </div>
                           </label>
                         );
                       })}
                     {pegawaiList.filter(p => {
                       const q = asnSearchQuery.toLowerCase();
                       return !q || p.nama?.toLowerCase().includes(q) || p.nip?.includes(q) || p.jabatan?.toLowerCase().includes(q);
                     }).length === 0 && (
                       <p className="text-center text-[9px] font-black text-gray-400 uppercase py-6 tracking-wide">
                         Pegawai Tidak Ditemukan
                       </p>
                     )}
                   </div>
                 </div>
               </div>

               {/* JABATAN BARU CONFIGURATION CARD */}
               {selectedNips.length > 0 && (
                 <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 border-2 border-blue-200/90 p-6 md:p-8 rounded-[2.5rem] shadow-xs space-y-6">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-200/60 pb-4">
                     <div>
                       <h4 className="text-[12px] font-black text-blue-950 uppercase tracking-widest flex items-center gap-2">
                         <i className="bi bi-award-fill text-blue-600 text-base"></i>
                         Penetapan Jabatan Baru Yang Dilantik ({selectedNips.length} Pegawai Terpilih)
                       </h4>
                       <p className="text-[10px] text-blue-800/80 font-medium mt-0.5">
                         Tentukan jabatan baru untuk dicetak pada naskah Berita Acara & Pakta Integritas (menggantikan jabatan lama master data).
                       </p>
                     </div>
                   </div>

                   {/* Bulk Apply Input */}
                   <div className="bg-white p-4.5 rounded-2xl border border-blue-200/70 shadow-sm space-y-2">
                     <label className="text-[9.5px] font-black text-gray-700 uppercase tracking-wider block">
                       Terapkan Jabatan Baru Serentak (Jika Semua Pegawai Dilantik pada Jabatan yang Sama):
                     </label>
                     <div className="flex flex-col sm:flex-row gap-2">
                       <input
                         type="text"
                         placeholder="CONTOH: PEMERIKSA MEREK AHLI PERTAMA / ANALIS KEBIJAKAN AHLI MUDA..."
                         value={globalJabatanBaru}
                         onChange={e => setGlobalJabatanBaru(e.target.value)}
                         onKeyDown={e => {
                           if (e.key === 'Enter') {
                             e.preventDefault();
                             if (!globalJabatanBaru.trim()) return;
                             const newMap = { ...asnJabatanMap };
                             selectedNips.forEach(nip => {
                               newMap[nip] = globalJabatanBaru.trim();
                             });
                             setAsnJabatanMap(newMap);
                             setFormData((prev: any) => ({
                               ...prev,
                               asnJabatanBaru: globalJabatanBaru.trim(),
                               asnJabatan: globalJabatanBaru.trim()
                             }));
                           }
                         }}
                         className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 focus:border-blue-600 focus:bg-white rounded-xl text-[11px] font-extrabold uppercase outline-none transition-all shadow-inner"
                       />
                       <button
                         type="button"
                         onClick={() => {
                           if (!globalJabatanBaru.trim()) {
                             alert("Ketikkan nama jabatan baru terlebih dahulu.");
                             return;
                           }
                           const newMap = { ...asnJabatanMap };
                           selectedNips.forEach(nip => {
                             newMap[nip] = globalJabatanBaru.trim();
                           });
                           setAsnJabatanMap(newMap);
                           setFormData((prev: any) => ({
                             ...prev,
                             asnJabatanBaru: globalJabatanBaru.trim(),
                             asnJabatan: globalJabatanBaru.trim()
                           }));
                         }}
                         className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black uppercase text-[10px] rounded-xl tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                       >
                         <i className="bi bi-check2-all text-sm"></i> Terapkan ke Semua ({selectedNips.length})
                       </button>
                     </div>
                   </div>

                   {/* Individual Pegawai Jabatan Baru List */}
                   <div className="space-y-2.5">
                     <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-500 tracking-wider px-2">
                       <span>Daftar Pegawai Terpilih & Jabatan Baru Masing-Masing:</span>
                       <span className="text-blue-600 font-bold">Dapat disesuaikan jika jabatan berbeda</span>
                     </div>
                     <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                       {selectedNips.map((nip, idx) => {
                         const p = pegawaiList.find(x => x.nip === nip);
                         const currentJbt = asnJabatanMap[nip] || formData.asnJabatanBaru || '';
                         return (
                           <div
                             key={nip}
                             className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-blue-300 transition-all"
                           >
                             <div className="min-w-0 flex-1">
                               <div className="flex items-center gap-2">
                                 <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black flex items-center justify-center shrink-0">
                                   {idx + 1}
                                 </span>
                                 <span className="text-[11px] font-black uppercase text-gray-900 truncate">
                                   {p?.nama || nip}
                                 </span>
                               </div>
                               <div className="flex flex-wrap items-center gap-2 mt-1 ml-7 text-[8.5px]">
                                 <span className="font-mono text-gray-500">NIP. {nip}</span>
                                 <span className="text-gray-400">•</span>
                                 <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                                   Jabatan Lama: {p?.jabatan || '-'}
                                 </span>
                               </div>
                             </div>
                             
                             <div className="w-full md:w-80 shrink-0">
                               <div className="relative">
                                 <input
                                   type="text"
                                   value={currentJbt}
                                   onChange={e => {
                                     const val = e.target.value;
                                     setAsnJabatanMap(prev => ({ ...prev, [nip]: val }));
                                     if (activePreviewNip === nip || selectedNips.length === 1) {
                                       setFormData((prev: any) => ({ ...prev, asnJabatanBaru: val, asnJabatan: val }));
                                     }
                                   }}
                                   placeholder="Ketikkan Jabatan Baru..."
                                   className={`w-full px-3.5 py-2.5 rounded-xl text-[10.5px] font-bold uppercase outline-none transition-all border ${
                                     currentJbt.trim()
                                       ? 'bg-blue-50/40 border-blue-300 text-blue-950 focus:border-blue-600 focus:bg-white'
                                       : 'bg-rose-50/40 border-rose-300 text-rose-950 placeholder-rose-400 focus:border-rose-500 focus:bg-white'
                                   }`}
                                 />
                                 {!currentJbt.trim() && (
                                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase text-rose-600 pointer-events-none">
                                     Wajib Diisi
                                   </span>
                                 )}
                               </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">1. Atribut Pelantikan</h5>
                 <div className="space-y-1">
                    <label className={labelClass}>Varian Lambang Negara</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setLogoVariant('emas')}
                        className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                          logoVariant === 'emas'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <img src={LOGO_GARUDA_EMAS_URL} alt="Emas" className="w-4 h-4 object-contain" />
                        Garuda Emas
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoVariant('resmi')}
                        className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl transition-all border flex items-center justify-center gap-2 cursor-pointer ${
                          logoVariant === 'resmi'
                            ? 'bg-[#111827] text-white border-[#111827] shadow-sm ring-2 ring-gray-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <img src={LOGO_GARUDA_RESMI_URL} alt="Berwarna" className="w-4 h-4 object-contain" />
                        Garuda Berwarna
                      </button>
                    </div>
                 </div>
                 <div className="space-y-1"><label className={labelClass}>Nomor BA</label><input type="text" className={inputClass} value={formData.nomor} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></div>
                 <div className="space-y-1">
                    <label className={labelClass}>Jabatan Baru Yang Dilantik</label>
                    <input 
                      type="text" 
                      className={`${inputClass} font-bold text-blue-900 bg-blue-50/20`}
                      value={currentPreviewData.asnJabatan || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        setFormData((prev: any) => ({ ...prev, asnJabatanBaru: val, asnJabatan: val }));
                        setGlobalJabatanBaru(val);
                        if (activePreviewNip) {
                          setAsnJabatanMap(prev => ({ ...prev, [activePreviewNip]: val }));
                        }
                      }} 
                      placeholder="Jabatan Baru Yang Dilantik"
                    />
                 </div>
                 <div className="space-y-1"><label className={labelClass}>Tanggal Lantik</label><input type="date" className={inputClass} value={formData.tanggal} onChange={e=>setFormData({...formData, tanggal: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Tempat</label><input type="text" className={inputClass} value={formData.tempat} onChange={e=>setFormData({...formData, tempat: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Nomor SK</label><input type="text" className={inputClass} value={formData.nomorSk} onChange={e=>setFormData({...formData, nomorSk: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Tanggal SK</label><input type="text" className={inputClass} value={formData.tanggalSk} onChange={e=>setFormData({...formData, tanggalSk: e.target.value})} /></div>
              </div>

              <div className="space-y-6">
                 <div className="flex items-center justify-between border-b pb-2">
                    <h5 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">2. Saksi & Pejabat</h5>
                    <span className="text-[9px] font-semibold text-gray-400">Nama & Gelar sesuai database</span>
                 </div>
                 
                 <div className="space-y-2">
                    <SearchableSelect 
                      label="Pejabat Pengambil Sumpah" 
                      options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan || ''}`}))} 
                      value={formData.pjbNip} 
                      onChange={v=>{
                        const p=pegawaiList.find(x=>x.nip===v); 
                        if(p) setFormData({...formData, pjbNip:v, pjbNama: p.nama, pjbJabatan:p.jabatan});
                      }} 
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Nama & Gelar Pejabat</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.pjbNama} 
                          onChange={e=>setFormData({...formData, pjbNama: e.target.value})}
                          placeholder="Nama & Gelar Pejabat"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Jabatan Pejabat</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.pjbJabatan} 
                          onChange={e=>setFormData({...formData, pjbJabatan: e.target.value})}
                          placeholder="Jabatan Pejabat"
                        />
                      </div>
                    </div>
                 </div>
                 
                 <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h6 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Saksi 1</h6>
                    <SearchableSelect 
                       label="Pilih Saksi 1" 
                       options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan || ''}`}))} 
                       value={formData.saksi1Nip} 
                       onChange={v=>{
                         const p=pegawaiList.find(x=>x.nip===v); 
                         if(p) setFormData({...formData, saksi1Nip:v, saksi1Nama: p.nama, saksi1Jabatan:p.jabatan});
                       }} 
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Nama & Gelar Saksi 1</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.saksi1Nama} 
                          onChange={e=>setFormData({...formData, saksi1Nama: e.target.value})}
                          placeholder="Nama & Gelar Saksi 1"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Jabatan Saksi 1</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.saksi1Jabatan} 
                          onChange={e=>setFormData({...formData, saksi1Jabatan: e.target.value})}
                          placeholder="Jabatan Saksi 1"
                        />
                      </div>
                    </div>
                 </div>

                 <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h6 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Saksi 2</h6>
                    <SearchableSelect 
                       label="Pilih Saksi 2" 
                       options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan || ''}`}))} 
                       value={formData.saksi2Nip} 
                       onChange={v=>{
                         const p=pegawaiList.find(x=>x.nip===v); 
                         if(p) setFormData({...formData, saksi2Nip:v, saksi2Nama: p.nama, saksi2Jabatan:p.jabatan});
                       }} 
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Nama & Gelar Saksi 2</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.saksi2Nama} 
                          onChange={e=>setFormData({...formData, saksi2Nama: e.target.value})}
                          placeholder="Nama & Gelar Saksi 2"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Jabatan Saksi 2</label>
                        <input 
                          type="text" 
                          className={inputClass} 
                          value={formData.saksi2Jabatan} 
                          onChange={e=>setFormData({...formData, saksi2Jabatan: e.target.value})}
                          placeholder="Jabatan Saksi 2"
                        />
                      </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-amber-600 uppercase border-b pb-2 tracking-widest">3. Narasi Sumpah</h5>
                 {selectedNips.length > 1 ? (
                   <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200/60 text-amber-800 text-[10px] md:text-[11px] font-medium leading-relaxed">
                     <p className="font-black uppercase tracking-wider mb-2 flex items-center gap-1.5"><i className="bi bi-info-circle-fill text-amber-600 text-xs"></i> Mode Multi-Pegawai</p>
                     Agama, Kata Pembuka, dan Kata Penutup sumpah pelantikan akan ditentukan **secara otomatis** sesuai dengan data agama masing-masing pegawai yang dicentang saat dokumen disimpan atau dicetak.
                   </div>
                 ) : (
                   <>
                     <div className="space-y-1">
                        <label className={labelClass}>Agama Pegawai</label>
                        <input type="text" className={readOnlyClass} value={currentPreviewData.asnAgama || '-'} readOnly />
                     </div>
                     <div className="space-y-1">
                        <label className={labelClass}>Kata Pembuka</label>
                        <input type="text" className={readOnlyClass} value={currentPreviewData.kataPelantikan || ''} readOnly />
                     </div>
                     {currentPreviewData.penutupKataPelantikan && (
                         <div className="space-y-1">
                            <label className={labelClass}>Kata Penutup</label>
                            <textarea className={`${readOnlyClass} min-h-[100px] normal-case`} readOnly value={currentPreviewData.penutupKataPelantikan} />
                         </div>
                     )}
                   </>
                 )}
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center gap-4">
              <button onClick={() => setActiveView('preview')} className="px-12 py-5 bg-white border border-gray-200 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 transition-all">Pratinjau Dokumen</button>
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-3">
                 {syncing && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                 <span>Simpan Dokumen</span>
              </button>
           </div>
        </div>
      ) : (
        // --- PREVIEW SECTION ---
        <div className="flex flex-col items-center gap-6 no-print w-full">
           {/* 1. BUTTONS */}
           <div className="flex gap-4 z-10 bg-white/80 backdrop-blur p-2 rounded-xl shadow-sm">
              <button onClick={() => setActiveView('editor')} className="px-6 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold uppercase text-[10px] transition-all">Kembali ke Editor</button>
              {canEdit && (
                <button onClick={handleSaveToDossier} disabled={syncing} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 transition-all">
                   {syncing ? <div className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-folder-fill"></i>} Simpan ke Dossier
                </button>
              )}
              {canEdit && (
                <button onClick={handleSave} disabled={syncing} className="px-6 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all">
                   {syncing ? <div className="h-3 w-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-arrow-up-fill"></i>} Simpan
                </button>
              )}
              <button onClick={handleDownloadPdf} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold uppercase text-[10px] transition-all cursor-pointer">Download PDF</button>
            </div>

            {/* Toggle active pegawai for multi-preview */}
            {selectedNips.length > 1 && (
              <div className="flex flex-col items-center gap-2 bg-slate-50 p-4 border border-slate-200 rounded-2xl w-full max-w-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PILIH PEGAWAI UNTUK DIPRATINJAU & DIUNDUH ({selectedNips.length} TERPILIH)</span>
                <div className="flex flex-wrap justify-center gap-1.5 mt-1 border-0">
                  {selectedNips.map(nip => {
                    const p = pegawaiList.find(x => x.nip === nip);
                    const jbt = asnJabatanMap[nip] || formData.asnJabatanBaru || formData.asnJabatan;
                    const isActive = activePreviewNip === nip;
                    return (
                      <button
                        key={nip}
                        onClick={() => setActivePreviewNip(nip)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer border ${isActive ? 'bg-[#111827] text-white border-[#111827] shadow-sm' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'}`}
                      >
                        <i className={`bi ${isActive ? 'bi-eye-fill text-blue-400' : 'bi-eye text-slate-400'}`}></i>
                        <span>{p?.nama || nip}</span>
                        {jbt && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
                            {jbt}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="hidden"></div>
           
           {/* 2. SCROLLABLE CONTAINER */}
           <div className="w-full bg-gray-200 py-12 px-4 overflow-x-auto border-y border-gray-300 flex justify-center">
              
              {/* 3. SCALING WRAPPER */}
              <div className="origin-top transform scale-[0.5] md:scale-[0.6] lg:scale-[0.8] xl:scale-[0.9] 2xl:scale-100 transition-transform duration-300">
                
                {/* 4. PAPER ELEMENT */}
                <div 
                    ref={pdfRef} 
  className={`
    bg-white shadow-2xl text-black font-arial box-border overflow-hidden
    ${docType === 'PAKTA' ? 'border-double border-[6px] border-black my-9 mx-auto' : ''}
  `}
  style={{ 
    width: docType === 'PAKTA' ? '330mm' : '210mm', 
    minHeight: docType === 'PAKTA' ? '210mm' : '330mm',
    /* Padding di sini adalah "margin internal" untuk memberi sisa kertas di dalam border */
    padding: docType === 'PAKTA' ? '20mm 25mm' : '20mm 25mm 20mm 25mm',
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif'
  }}
                     >
                 
                  {docType === 'BA' ? (
                    // --- TEMPLATE BERITA ACARA (PORTRAIT F4) ---
                    <div 
                      className="h-full flex flex-col text-[11pt] leading-snug font-arial text-black"
                      style={{ fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif' }}
                    >
                       {/* HEADER */}
                       <div className="flex flex-col items-center text-center mb-6 pt-1">
                          <img 
                            src={logoVariant === 'resmi' ? LOGO_GARUDA_RESMI_URL : LOGO_GARUDA_EMAS_URL} 
                            style={{ width: '80px', height: 'auto' }} 
                            className="mb-3.5 object-contain" 
                            crossOrigin="anonymous" 
                            alt="Lambang Negara Garuda Pancasila"
                          />
                          <h1 className="font-bold uppercase tracking-widest text-[13pt] mb-1 leading-tight text-black">BERITA ACARA</h1>
                          <h2 className="font-bold uppercase tracking-wider text-[11pt] mb-1 leading-tight text-black">PENGAMBILAN SUMPAH JABATAN PEGAWAI NEGERI SIPIL</h2>
                          <p className="font-normal text-[10.5pt] text-gray-900">NOMOR : {currentPreviewData.nomor || 'HKI.1-KP.03.04-...'}</p>
                       </div>

                       {/* CONTENT */}
                       <div className="text-justify space-y-3.5 px-1 text-[11pt] leading-normal">
                          <p className="indent-0">
                             Pada hari <span className="font-normal">{formatTanggalLengkap(currentPreviewData.tanggal)}</span>, bertempat di {currentPreviewData.tempat || 'Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum Republik Indonesia'}, saya, <span className="font-bold">{formatPegawaiName(currentPreviewData.pjbNama)}</span>, <span className="font-bold">{currentPreviewData.pjbJabatan}</span> Kementerian Hukum Republik Indonesia, dengan disaksikan oleh 2 (dua) orang saksi masing-masing :
                          </p>
                          <div className="space-y-1.5 ml-4 py-1 text-[10.5pt]">
                             <div className="flex gap-2">
                               <span className="w-5 font-bold">1.</span>
                               <span><span className="font-bold">{formatPegawaiName(currentPreviewData.saksi1Nama)}</span>, {currentPreviewData.saksi1Jabatan};</span>
                             </div>
                             <div className="flex gap-2">
                               <span className="w-5 font-bold">2.</span>
                               <span><span className="font-bold">{formatPegawaiName(currentPreviewData.saksi2Nama)}</span>, {currentPreviewData.saksi2Jabatan}.</span>
                             </div>
                          </div>
                          <p>
                             telah mengambil sumpah jabatan <span className="font-normal">{currentPreviewData.asnJabatan}</span> atas nama <span className="font-bold">{formatPegawaiName(currentPreviewData.asnNama)}</span>, yang berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor <span className="font-normal">{currentPreviewData.nomorSk}</span> tanggal <span className="font-normal">{currentPreviewData.tanggalSk}</span> diangkat sebagai <span className="font-normal">{currentPreviewData.asnJabatan}</span>.
                          </p>
                          <p>Pegawai Negeri Sipil yang mengangkat sumpah tersebut mengucapkan sumpah jabatan sebagai berikut:</p>
                          
                          <div className="italic space-y-2 py-1">
                             <p>”{currentPreviewData.kataPelantikan}:</p>
                             <div className="pl-8 space-y-1.5">
                                <p>bahwa saya, akan setia dan taat kepada Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 serta akan menjalankan segala peraturan perundang-undangan dengan selurus-lurusnya, demi dharma bakti saya kepada bangsa dan negara;</p>
                                <p>bahwa saya dalam menjalankan tugas jabatan, akan menjunjung etika jabatan, bekerja dengan sebaik-baiknya, dan dengan penuh rasa tanggung jawab;</p>
                                <p>bahwa saya, akan menjaga integritas, tidak menyalahgunakan kewenangan, serta menghindarkan diri dari perbuatan tercela.”</p>
                             </div>
                          </div>
                          
                          {currentPreviewData.penutupKataPelantikan && (
                              <p className="italic font-bold text-center mt-1 text-[10.5pt]">{currentPreviewData.penutupKataPelantikan}</p>
                          )}

                          <p className="mt-3">Demikian berita acara pengambilan sumpah jabatan ini dibuat dengan sebenar-benarnya untuk dapat digunakan sebagaimana mestinya.</p>
                       </div>

                       {/* SIGNATURES */}
                       <div className="mt-8 space-y-6">
                          {/* Baris 1: Yang Mengangkat Sumpah & Pejabat Yang Mengambil Sumpah */}
                          <div className="grid grid-cols-2 gap-x-12 text-center text-[10.5pt]">
                             {/* Kolom Kiri: Yang Mengangkat Sumpah */}
                             <div className="flex flex-col items-center">
                                <div className="min-h-[44px] flex items-end justify-center pb-2">
                                   <p className="leading-snug font-normal text-black">Yang mengangkat sumpah,</p>
                                </div>
                                <div className="h-16 w-full flex items-center justify-center">
                                   {/* Ruang Tanda Tangan */}
                                </div>
                                <div className="flex flex-col items-center text-center">
                                   <p className="font-bold underline underline-offset-2 text-[11pt] tracking-normal leading-normal text-black">
                                      {formatPegawaiName(currentPreviewData.asnNama || '')}
                                   </p>
                                   <p className="text-[10pt] font-normal text-gray-900 mt-1">
                                      {formatNip(currentPreviewData.asnNip)}
                                   </p>
                                </div>
                             </div>

                             {/* Kolom Kanan: Pejabat Yang Mengambil Sumpah */}
                             <div className="flex flex-col items-center">
                                <div className="min-h-[44px] flex items-end justify-center pb-2">
                                   <p className="leading-snug font-normal text-black">Pejabat<br />Yang mengambil sumpah,</p>
                                </div>
                                <div className="h-16 w-full flex items-center justify-center">
                                   {/* Ruang Tanda Tangan */}
                                </div>
                                <div className="flex flex-col items-center text-center">
                                   <p className="font-bold underline underline-offset-2 text-[11pt] tracking-normal leading-normal text-black">
                                      {formatPegawaiName(currentPreviewData.pjbNama || '')}
                                   </p>
                                   <p className="text-[10pt] font-normal text-gray-900 mt-1">
                                      {formatNip(currentPreviewData.pjbNip)}
                                   </p>
                                </div>
                             </div>
                          </div>

                          {/* Baris 2: Saksi-Saksi */}
                          <div className="flex flex-col items-center pt-2">
                             <p className="font-bold uppercase tracking-wider text-[11pt] mb-3 text-black">SAKSI-SAKSI,</p>
                             <div className="grid grid-cols-2 gap-x-12 w-full text-center text-[10.5pt]">
                                <div className="flex flex-col items-center">
                                   <div className="min-h-[26px] flex items-end justify-center pb-1">
                                      <p className="leading-snug font-normal text-black">1. Saksi I,</p>
                                   </div>
                                   <div className="h-16 w-full flex items-center justify-center">
                                      {/* Ruang Tanda Tangan */}
                                   </div>
                                   <div className="flex flex-col items-center text-center">
                                      <p className="font-bold underline underline-offset-2 text-[11pt] tracking-normal leading-normal text-black">
                                         {formatPegawaiName(currentPreviewData.saksi1Nama || '')}
                                      </p>
                                      <p className="text-[10pt] font-normal text-gray-900 mt-1">
                                         {formatNip(currentPreviewData.saksi1Nip)}
                                      </p>
                                   </div>
                                </div>

                                <div className="flex flex-col items-center">
                                   <div className="min-h-[26px] flex items-end justify-center pb-1">
                                      <p className="leading-snug font-normal text-black">2. Saksi II,</p>
                                   </div>
                                   <div className="h-16 w-full flex items-center justify-center">
                                      {/* Ruang Tanda Tangan */}
                                   </div>
                                   <div className="flex flex-col items-center text-center">
                                      <p className="font-bold underline underline-offset-2 text-[11pt] tracking-normal leading-normal text-black">
                                         {formatPegawaiName(currentPreviewData.saksi2Nama || '')}
                                      </p>
                                      <p className="text-[10pt] font-normal text-gray-900 mt-1">
                                         {formatNip(currentPreviewData.saksi2Nip)}
                                      </p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  ) : (
                    // --- TEMPLATE PAKTA INTEGRITAS (LANDSCAPE F4) ---
                    <div 
                      className="h-full flex flex-col text-[11pt] leading-relaxed font-arial text-black"
                      style={{ fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif' }}
                    >
                       {/* HEADER */}
                       <div className="flex flex-col items-center text-center mb-8">
                        <img 
                              src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" 
                              style={{ width: '20.04mm', height: '22.90mm' }} 
                              crossOrigin="anonymous" 
                              className="mb-4"
                        />
                        <p className="font-bold uppercase leading-none text-[12pt] m-0">KEMENTERIAN HUKUM</p>
                        <p className="font-bold uppercase leading-none text-[12pt] m-0">REPUBLIK INDONESIA</p>
                        <p className="font-black uppercase text-[14pt] mt-4 tracking-widest leading-none">PAKTA INTEGRITAS</p>
                     </div>

                       {/* CONTENT */}
                     
                  {/* PEMBUKA */}
                  <div className="text-center flex flex-col items-center">
                    <p>Saya, <span className="font-bold">{formatPegawaiName(currentPreviewData.asnNama || '')}</span>, sebagai <span className="font-bold uppercase">{currentPreviewData.asnJabatan || '...'}</span>, menyatakan sebagai berikut :</p>
                  </div>

                  {/* ISI 7 POIN (SESUAI DOKUMEN PDF) */}
                  <div className="grid grid-cols-2 gap-x-16 text-justify mt-6 mb-4 leading-snug">
                    <ol className="list-decimal ml-8 space-y-2">
                      <li>Berperan secara pro aktif dalam upaya pencegahan dan pemberantasan Korupsi, Kolusi dan Nepotisme serta tidak melibatkan diri dalam perbuatan tercela;</li>
                      <li>Tidak meminta atau menerima pemberian secara langsung atau tidak langsung berupa suap, hadiah, bantuan, atau bentuk lainnya yang tidak sesuai dengan ketentuan yang berlaku;</li>
                      <li>Bersikap transparan, jujur, objektif, dan akuntabel dalam melaksanakan tugas;</li>
                      <li>Menghindari pertentangan kepentingan (conflict of interest) dalam pelaksanaan tugas;</li>
                    </ol>
                    <ol className="list-decimal ml-8 space-y-2" start={5}>
                      <li>Memberi contoh dalam kepatuhan terhadap peraturan perundang-undangan dalam melaksanakan tugas, terutama kepada pegawai yang berada di bawah pengawasan saya dan sesama pegawai di lingkungan kerja saya secara konsisten;</li>
                      <li>Akan menyampaikan informasi penyimpangan integritas di Direktorat Jenderal Kekayaan Intelektual serta turut menjaga kerahasiaan saksi atas pelanggaran peraturan yang dilaporkannya;</li>
                      <li>Bila saya melanggar hal-hal tersebut di atas, saya siap menghadapi konsekuensinya.</li>
                    </ol>
                  </div>

                   <div className="text-center flex flex-col items-center">
                      <p className="mb-1">Jakarta, {new Date(currentPreviewData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>

                  {/* TANDA TANGAN */}
                <div className="mt-auto grid grid-cols-2 pt-10 items-end"> 
  {/* Kolom 1 (Kiri) */}
  <div className="text-center flex flex-col h-full justify-between">
    <div>
      <p className="font-bold uppercase mb-1">Menyaksikan,</p>
      <p className="font-bold uppercase leading-tight">{currentPreviewData.pjbJabatan}</p>
    </div>
    
    {/* Box Nama & NIP (Dipaksa sejajar bawah) */}
    <div className="mt-12"> 
      <p className="font-bold underline underline-offset-2 text-[11pt]">{formatPegawaiName(currentPreviewData.pjbNama || '')}</p>
      <p className="mt-1 text-sm text-gray-800">{formatNip(currentPreviewData.pjbNip)}</p>
    </div>
  </div>

  {/* Kolom 2 (Kanan) */}
  <div className="text-center flex flex-col h-full justify-between relative">
    <div>
      <p className="font-bold uppercase mb-1">Pembuat Pernyataan,</p>
      {/* Container Materai: Menggunakan absolute agar tidak mendorong teks Nama */}
      <div className="relative h-0">
         <div className="border border-dashed border-gray-400 p-1 text-[7pt] text-gray-400 rotate-[-12deg] absolute -top-8 left-1/2 -translate-x-full w-20">
            MATERAI 10.000
         </div>
      </div>
    </div>

    {/* Box Nama & NIP (Akan sejajar dengan kolom kiri karena mt-12 yang sama) */}
    <div className="mt-12">
      <p className="font-bold underline underline-offset-2 text-[11pt]">{formatPegawaiName(currentPreviewData.asnNama || '...')}</p>
      <p className="mt-1 text-sm text-gray-800">{formatNip(currentPreviewData.asnNip)}</p>
    </div>
  </div>
</div>

                    </div>
                 )}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PelantikanGeneratorPage;