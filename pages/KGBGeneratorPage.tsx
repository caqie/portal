import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchKGBFromSheets, syncTableRemote, uploadFileToDrive } from '../spreadsheetService';
import { Pegawai, KGB } from '../types';
import { useAuth } from '../AuthContext';
import { DEFAULT_LOGO, getGajiEstimasi, normalizeUnitName } from '../constants';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const terbilang = (n: number): string => {
  const words = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
  let result = "";
  if (n < 12) result = words[n];
  else if (n < 20) result = terbilang(n - 10) + " belas";
  else if (n < 100) result = terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
  else if (n < 200) result = "seratus " + terbilang(n - 100);
  else if (n < 1000) result = terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
  else if (n < 2000) result = "seribu " + terbilang(n - 1000);
  else if (n < 1000000) result = terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
  else if (n < 1000000000) result = terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
  return result.replace(/\s+/g, ' ').trim();
};

const KGBGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [kgbHistory, setKgbHistory] = useState<KGB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview' | 'monitoring'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KGB | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<KGB>>({
    nomorSk: 'HKI.1-KP.04.04-',
    tglSurat: new Date().toISOString().split('T')[0],
    nip: '',
    namaPegawai: '',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    gajiLama: 0,
    gajiBaru: 0,
    tmtLama: '',
    tmtBaru: '',
    masaKerjaBaru: '',
    pangkatGol: '',
    jabatan: '',
    unitKerja: '',
    kantor: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    jenisPegawai: 'PNS',
    skTerakhirPejabat: 'Kepala Biro Sumber Daya Manusia',
    skTerakhirTanggal: '',
    skTerakhirNomor: '',
    skTerakhirTmt: '',
    skTerakhirMasaKerja: '',
    masaPerjanjianKerja: '',
    perpanjanganPerjanjianKerja: '-'
  });

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 transition-all text-gray-950 shadow-sm";
  const labelClass = "text-[10px] font-black text-gray-600 uppercase ml-3 tracking-widest block mb-1.5";

  // Memindahkan FormItem ke dalam komponen utama agar dapat mengakses inputClass dan labelClass
  const FormItem = ({ label, children }: any) => (
    <div className="space-y-1.5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [p, k] = await Promise.all([fetchPegawaiFromSheets(), fetchKGBFromSheets()]);
      setPegawaiList(p);
      setKgbHistory(k);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const formatDateForInput = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const cleanDate = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return cleanDate;
    const parts = cleanDate.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    try {
      const d = new Date(cleanDate);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return '';
  };

  const handlePegawaiSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) {
      const mkParts = (p.masaKerja || '0').split(' ');
      const years = parseInt(mkParts[0]) || 0;
      const currentSalary = getGajiEstimasi(p.golRuang, years);
      const nextSalary = getGajiEstimasi(p.golRuang, years + 2);
      
      // Hitung estimasi TMT Baru (TMT Lama + 2 Tahun)
      const tmtLamaDate = new Date(formatDateForInput(p.tmtPangkat || p.tmtCpns));
      const tmtBaruDate = new Date(tmtLamaDate);
      tmtBaruDate.setFullYear(tmtBaruDate.getFullYear() + 2);
      const tmtBaruEstimasi = tmtBaruDate.toISOString().split('T')[0];

      setFormData({ 
        ...formData, 
        nip: p.nip, 
        namaPegawai: p.nama, 
        pangkatGol: p.jenisPegawai === 'PPPK' ? `${p.golRuang} / ${p.jabatan}` : `${p.pangkat} - ${p.golRuang}`,
        jabatan: p.jabatan,
        unitKerja: p.unitKerja,
        jenisPegawai: (p.jenisPegawai as any) === 'PPPK' ? 'PPPK' : 'PNS',
        gajiLama: currentSalary,
        gajiBaru: nextSalary,
        tmtLama: formatDateForInput(p.tmtPangkat || p.tmtCpns),
        tmtBaru: tmtBaruEstimasi, // Auto fill TMT Baru
        masaKerjaBaru: `${years + 2} Tahun 0 Bulan`,
        skTerakhirMasaKerja: `${years} Tahun 0 Bulan`,
        masaPerjanjianKerja: p.jenisPegawai === 'PPPK' ? '5 Tahun' : '',
      });
    }
  };

  const handleEditKgb = (k: KGB) => {
    setFormData({
      ...k,
      tmtLama: formatDateForInput(k.tmtLama),
      tmtBaru: formatDateForInput(k.tmtBaru),
      tglSk: formatDateForInput(k.tglSk),
      // PERBAIKAN: Menggunakan tanggal dari data KGB yang diedit, bukan dari state saat ini
      tglSurat: formatDateForInput(k.tglSurat) 
    });
    setActiveView('editor');
  };

  const handleSave = async () => {
    if (!formData.nip || !formData.tmtBaru) return alert("Lengkapi data KGB, khususnya NIP dan TMT Baru.");
    setSyncing(true);
    const payload = { ...formData, id: formData.id || `KGB-${formData.nip}-${Date.now()}`, status: 'Selesai' };
    const ok = await syncTableRemote('KGB', 'SAVE', payload);
    if (ok) {
      logActivity(formData.id ? 'UPDATE' : 'CREATE', 'KGB', `Simpan KGB: ${formData.namaPegawai}`);
      await loadInitialData();
      setActiveView('preview');
      setShowSuccess(true);
    } else {
        alert("Gagal menyimpan data.");
    }
    setSyncing(false);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
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

      pdf.save(`KGB_${(formData.namaPegawai || 'Pegawai').replace(/\s+/g, '_')}.pdf`);
    } catch (e) { 
        console.error(e);
        alert("Gagal cetak PDF. Cek konsol browser untuk detail."); 
    } finally { setSyncing(false); }
  };

  const handleSaveToDossier = async () => {
    if (!pdfRef.current || !formData.nip) return;
    setSyncing(true);
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      const pdfBase64 = pdf.output('datauristring');
      
      const fileName = `KGB_${(formData.namaPegawai || 'Pegawai').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const res = await uploadFileToDrive(fileName, 'application/pdf', pdfBase64);
      
      if (res.success && res.fileUrl) {
        const payload = {
          id: `DOS-${Date.now()}`,
          nip: formData.nip,
          namaPegawai: formData.namaPegawai,
          tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          keterangan: `Surat Kenaikan Gaji Berkala (KGB)`,
          fileName: fileName,
          fileUrl: res.fileUrl
        };
        const ok = await syncTableRemote('DOSSIER', 'SAVE', payload);
        if (ok) {
          logActivity('CREATE', 'DOSSIER', `Simpan KGB ke Dossier: ${formData.namaPegawai}`);
          alert("Surat KGB berhasil disimpan ke E-Dossier Pegawai.");
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

  const pSubjek = pegawaiList.find(p => p.nip === formData.nip);

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={async () => {
         if(itemToDelete) {
           setSyncing(true);
           const ok = await syncTableRemote('KGB', 'DELETE', { id: itemToDelete.id });
           if(ok) {
               await loadInitialData();
               setIsConfirmOpen(false);
           } else {
               alert("Gagal menghapus data");
           }
           setSyncing(false);
         }
      }} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase">Kenaikan Gaji Berkala</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Otomatisasi Naskah Dinas KGB ASN DJKI</p>
          </div>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
           <button onClick={() => setActiveView('list')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Arsip KGB</button>
           <button onClick={() => setActiveView('monitoring')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'monitoring' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Monitoring KGB</button>
           <button onClick={() => { setFormData({...formData, id: undefined, nip: '', tmtBaru: '' }); setActiveView('editor'); }} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Buat Baru</button>
        </div>
      </div>

      {activeView === 'list' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
           <table className="w-full text-left">
              <thead className="bg-gray-50 text-[9px] font-black uppercase text-gray-600 border-b tracking-widest">
                 <tr><th className="px-10 py-5">Identitas & NIP</th><th className="px-4 py-5">Nomor & TMT Baru</th><th className="px-4 py-5 text-center">Gaji Baru</th><th className="px-10 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {kgbHistory.map(k => (
                   <tr key={k.id} className="hover:bg-blue-50/5 group transition-colors">
                      <td className="px-10 py-5">
                         <p className="text-[11px] font-black text-gray-950 uppercase">{k.namaPegawai}</p>
                         <p className="text-[9px] font-mono text-blue-600 font-bold">NIP. {k.nip}</p>
                      </td>
                      <td className="px-4 py-5">
                         <p className="text-[10px] font-bold text-gray-500 uppercase">{k.nomorSk || '-'}</p>
                         <p className="text-[11px] font-black text-gray-950 uppercase">TMT: {k.tmtBaru}</p>
                      </td>
                      <td className="px-4 py-5 text-center">
                         <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black border border-emerald-100">Rp {Number(k.gajiBaru).toLocaleString('id-ID')}</span>
                      </td>
                      <td className="px-10 py-5 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setFormData(k); setActiveView('preview'); }} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Lihat PDF</button>
                            {canEdit && (
                              <>
                                <button onClick={() => handleEditKgb(k)} className="h-9 w-9 bg-white border border-gray-100 text-amber-500 rounded-xl flex items-center justify-center hover:bg-amber-50 shadow-sm transition-all"><i className="bi bi-pencil-fill"></i></button>
                                {isSuperadmin && <button onClick={() => { setItemToDelete(k); setIsConfirmOpen(true); }} className="h-9 w-9 bg-white border border-gray-100 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-50 shadow-sm transition-all"><i className="bi bi-trash-fill"></i></button>}
                              </>
                            )}
                         </div>
                      </td>
                   </tr>
                 ))}
                 {kgbHistory.length === 0 && (
                     <tr>
                        <td colSpan={4} className="py-20 text-center text-gray-400 font-bold uppercase text-xs">
                            Belum ada riwayat KGB
                        </td>
                     </tr>
                 )}
              </tbody>
           </table>
        </div>
      )}

      {activeView === 'monitoring' && (
        <div className="space-y-6 animate-fadeIn">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <div className="md:col-span-2 relative">
                 <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                 <input 
                    type="text" 
                    placeholder="CARI NAMA ATAU NIP PEGAWAI..." 
                    className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20 transition-all"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                 />
              </div>
              <div>
                 <select 
                    className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20 transition-all"
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                 >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                       <option key={y} value={y}>{y}</option>
                    ))}
                 </select>
              </div>
              <div>
                 <select 
                    className="w-full px-5 py-3.5 bg-gray-50 border-none rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-2 ring-blue-600/20 transition-all"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                 >
                    <option value="">SEMUA BULAN</option>
                    <option value="01">JANUARI</option>
                    <option value="02">FEBRUARI</option>
                    <option value="03">MARET</option>
                    <option value="04">APRIL</option>
                    <option value="05">MEI</option>
                    <option value="06">JUNI</option>
                    <option value="07">JULI</option>
                    <option value="08">AGUSTUS</option>
                    <option value="09">SEPTEMBER</option>
                    <option value="10">OKTOBER</option>
                    <option value="11">NOVEMBER</option>
                    <option value="12">DESEMBER</option>
                 </select>
              </div>
           </div>

           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <tr>
                       <th className="px-10 py-5">Pegawai</th>
                       <th className="px-4 py-5">Pangkat / Golongan</th>
                       <th className="px-4 py-5 text-center">TMT Gaji Terakhir</th>
                       <th className="px-4 py-5 text-center">Estimasi KGB Berikutnya</th>
                       <th className="px-10 py-5 text-right">Aksi</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {pegawaiList.filter(p => {
                       const latestKgb = kgbHistory.filter(k => k.nip === p.nip).sort((a, b) => new Date(b.tmtBaru).getTime() - new Date(a.tmtBaru).getTime())[0];
                       const basisDateStr = latestKgb ? latestKgb.tmtBaru : (p.tmtPangkat || p.tmtCpns);
                       
                       if (!basisDateStr) return false;
                       const basisDate = new Date(formatDateForInput(basisDateStr));
                       const nextKgbDate = new Date(basisDate);
                       nextKgbDate.setFullYear(basisDate.getFullYear() + 2);
                       
                       const matchesSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || p.nip.includes(searchQuery);
                       const matchesYear = nextKgbDate.getFullYear().toString() === filterYear;
                       const matchesMonth = filterMonth === '' || (nextKgbDate.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
                       
                       return matchesSearch && matchesYear && matchesMonth;
                    }).map(p => {
                       const latestKgb = kgbHistory.filter(k => k.nip === p.nip).sort((a, b) => new Date(b.tmtBaru).getTime() - new Date(a.tmtBaru).getTime())[0];
                       const basisDateStr = latestKgb ? latestKgb.tmtBaru : (p.tmtPangkat || p.tmtCpns);
                       const basisDate = new Date(formatDateForInput(basisDateStr!));
                       const nextKgbDate = new Date(basisDate);
                       nextKgbDate.setFullYear(basisDate.getFullYear() + 2);
                       const nextKgbStr = nextKgbDate.toISOString().split('T')[0];

                       return (
                          <tr key={p.id} className="hover:bg-blue-50/5 group transition-all">
                             <td className="px-10 py-6">
                                <p className="text-[11px] font-black text-gray-950 uppercase leading-none">{p.nama}</p>
                                <p className="text-[9px] font-mono text-blue-600 font-bold uppercase mt-1.5 tracking-tighter">NIP. {p.nip}</p>
                             </td>
                             <td className="px-4 py-6">
                                <p className="text-[10px] font-black text-gray-900 uppercase">{p.pangkat || '-'}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{p.golRuang || '-'}</p>
                             </td>
                             <td className="px-4 py-6 text-center">
                                <p className="text-[11px] font-black text-gray-900 uppercase">{basisDateStr}</p>
                                <p className="text-[7px] font-bold text-gray-400 uppercase mt-1">{latestKgb ? 'DARI RIWAYAT KGB' : 'DARI TMT PANGKAT/CPNS'}</p>
                             </td>
                             <td className="px-4 py-6 text-center">
                                <div className="inline-flex flex-col items-center">
                                   <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black border border-amber-100 uppercase">{nextKgbStr}</span>
                                   <p className="text-[7px] font-bold text-gray-400 uppercase mt-1">Periode {nextKgbDate.toLocaleDateString('id-ID', {month: 'long'})}</p>
                                </div>
                             </td>
                             <td className="px-10 py-6 text-right">
                                <button 
                                   onClick={() => {
                                      handlePegawaiSelect(p.nip);
                                      setFormData((prev: any) => ({ ...prev, tmtBaru: nextKgbStr }));
                                      setActiveView('editor');
                                   }}
                                   className="h-9 px-5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all"
                                >
                                   Proses KGB
                                </button>
                             </td>
                          </tr>
                       );
                    }).slice(0, 50)}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-6xl mx-auto bg-white p-10 md:p-14 rounded-[4rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.golRuang} (${p.jenisPegawai})`}))} value={formData.nip || ''} onChange={handlePegawaiSelect} />
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">1. Atribut Surat</h5>
                 <FormItem label="Nomor Surat"><input type="text" className={inputClass} value={formData.nomorSk} onChange={e=>setFormData({...formData, nomorSk: e.target.value})} /></FormItem>
                 <FormItem label="Tanggal Terbit"><input type="date" className={inputClass} value={formData.tglSurat} onChange={e=>setFormData({...formData, tglSurat: e.target.value})} /></FormItem>
                 <FormItem label="Nama Lengkap"><input type="text" className={`${inputClass} font-bold`} value={formData.namaPegawai} onChange={e=>setFormData({...formData, namaPegawai: e.target.value})} /></FormItem>
                 <FormItem label="Pangkat / Golongan"><input type="text" className={inputClass} value={formData.pangkatGol} onChange={e=>setFormData({...formData, pangkatGol: e.target.value})} /></FormItem>
                 <FormItem label="Jabatan"><input type="text" className={inputClass} value={formData.jabatan} onChange={e=>setFormData({...formData, jabatan: e.target.value})} /></FormItem>
                 <FormItem label="Jenis Pegawai">
                    <select className={inputClass} value={formData.jenisPegawai} onChange={e=>setFormData({...formData, jenisPegawai: e.target.value as any})}>
                       <option value="PNS">PNS</option>
                       <option value="PPPK">PPPK</option>
                    </select>
                 </FormItem>
                 {formData.jenisPegawai === 'PPPK' && (
                    <>
                       <FormItem label="Masa Perjanjian"><input type="text" className={inputClass} value={formData.masaPerjanjianKerja} onChange={e=>setFormData({...formData, masaPerjanjianKerja: e.target.value})} /></FormItem>
                       <FormItem label="Perpanjangan Perjanjian"><input type="text" className={inputClass} value={formData.perpanjanganPerjanjianKerja} onChange={e=>setFormData({...formData, perpanjanganPerjanjianKerja: e.target.value})} /></FormItem>
                    </>
                 )}
              </div>
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">2. SK Terakhir (Basis)</h5>
                 <FormItem label="Oleh Pejabat"><input type="text" className={inputClass} value={formData.skTerakhirPejabat} onChange={e=>setFormData({...formData, skTerakhirPejabat: e.target.value})} /></FormItem>
                 <FormItem label="Nomor SK"><input type="text" className={inputClass} value={formData.skTerakhirNomor} onChange={e=>setFormData({...formData, skTerakhirNomor: e.target.value})} /></FormItem>
                 <FormItem label="Tanggal SK"><input type="date" className={inputClass} value={formData.skTerakhirTanggal} onChange={e=>setFormData({...formData, skTerakhirTanggal: e.target.value})} /></FormItem>
                 <FormItem label="TMT SK"><input type="date" className={inputClass} value={formData.skTerakhirTmt} onChange={e=>setFormData({...formData, skTerakhirTmt: e.target.value})} /></FormItem>
                 <FormItem label="Masa Kerja SK"><input type="text" className={inputClass} value={formData.skTerakhirMasaKerja} onChange={e=>setFormData({...formData, skTerakhirMasaKerja: e.target.value})} placeholder="exp: 12 tahun 10 bulan" /></FormItem>
              </div>
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-amber-600 uppercase border-b pb-2 tracking-widest">3. Rincian KGB Baru</h5>
                 <div className="grid grid-cols-2 gap-4">
                    <FormItem label="Gaji Lama"><input type="number" className={inputClass} value={formData.gajiLama} onChange={e=>setFormData({...formData, gajiLama: Number(e.target.value)})} /></FormItem>
                    <FormItem label="Gaji Baru"><input type="number" className={inputClass} value={formData.gajiBaru} onChange={e=>setFormData({...formData, gajiBaru: Number(e.target.value)})} /></FormItem>
                 </div>
                 <FormItem label="TMT KGB Baru"><input type="date" className={inputClass} value={formData.tmtBaru} onChange={e=>setFormData({...formData, tmtBaru: e.target.value})} /></FormItem>
                 <FormItem label="Masa Kerja Baru"><input type="text" className={inputClass} value={formData.masaKerjaBaru} onChange={e=>setFormData({...formData, masaKerjaBaru: e.target.value})} placeholder="exp: 14 tahun 0 bulan" /></FormItem>
                 
                 <h5 className="text-[11px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest mt-4">4. Penandatangan</h5>
                 <SearchableSelect label="Pejabat" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.pjbNip || ''} onChange={v=>{const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, pjbNip:v, pjbNama:p.nama, pjbJabatan:p.jabatan})}} />
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center">
              <button onClick={handleSave} disabled={syncing} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl active:scale-95 transition-all">Generate & Pratinjau</button>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl text-[11px] font-black uppercase shadow-sm">Edit Data</button>
              {canEdit && (
                <button onClick={handleSaveToDossier} disabled={syncing} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                  {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-folder-fill"></i>} Simpan ke E-Dossier
                </button>
              )}
              {canEdit && (
                <button onClick={handleSave} disabled={syncing} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 shadow-xl active:scale-95 transition-all">
                   {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-cloud-arrow-up-fill"></i>} Simpan
                </button>
              )}
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-200 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl font-arial p-[2cm_2cm_2.5cm_3cm] leading-tight text-black" style={{ width: '210mm', minHeight: '297mm', color: '#000000', fontSize: '11pt' }}>
                 
                  {/* KOP SURAT RESMI */}
                  <div className="flex items-start gap-4 border-b-[0.5pt] border-black pb-2 mb-6 text-black">
                     <img src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" style={{ width: '20.04mm', height: '22.90mm' }} crossOrigin="anonymous" />
                     <div className="flex-1 text-center">
                        <p style={{ fontSize: '12pt' }} className="uppercase leading-tight font-normal">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                        <p style={{ fontSize: '12pt' }} className="font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
                        <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Jalan H.R. Rasuna Said Kav 8-9, Kuningan, Jakarta Selatan 12940</p>
                        <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Call Center: 152</p>
                        <p style={{ fontSize: '10pt' }} className="leading-tight font-normal">Laman: www.dgip.go.id. Pos-el: halodjki@dgip.go.id</p>
                      </div>
                   </div>
                 {/* ATRIBUT SURAT */}
                 <div className="flex justify-between mb-6 text-[11pt]">
                    <div className="space-y-0.5">
                       <div className="grid grid-cols-[80px_10px_1fr]"><span>Nomor</span><span>:</span><span>{formData.nomorSk}</span></div>
                       <div className="grid grid-cols-[80px_10px_1fr]"><span>Sifat</span><span>:</span><span>Biasa</span></div>
                       <div className="grid grid-cols-[80px_10px_1fr]"><span>Lampiran</span><span>:</span><span>-</span></div>
                       <div className="grid grid-cols-[80px_10px_1fr]"><span>Hal</span><span>:</span><span className="font-bold">Kenaikan Gaji Berkala {formData.jenisPegawai === 'PPPK' ? 'Pegawai Pemerintah dengan Perjanjian Kerja' : ''}</span></div>
                       <div className="ml-[90px] font-bold uppercase">{formData.namaPegawai}</div>
                    </div>
                    <div className="text-right">
                       <p>{formData.tglSurat ? new Date(formData.tglSurat).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</p>
                    </div>
                 </div>

                 <div className="text-[11pt] mb-6">
                    <p>Yth. Kepala Kantor Pelayanan Perbendaharaan Negara Jakarta V.</p>
                    <p>di Jakarta</p>
                 </div>

                 <div className="text-[11pt] text-justify leading-relaxed mb-6">
                    {formData.jenisPegawai === 'PNS' ? (
                       <p>Sehubungan dengan telah terpenuhinya masa kerja dan syarat-syarat lainnya, kepada:</p>
                    ) : (
                       <p>Berdasarkan Peraturan Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi Nomor 7 Tahun 2023 tentang Kenaikan Gaji Berkala dan Kenaikan Gaji Istimewa bagi Pegawai Pemerintah dengan Perjanjian Kerja, dengan ini diberitahukan bahwa berhubung dengan telah terpenuhinya masa kerja dan syarat-syarat lainnya, kepada:</p>
                    )}
                 </div>

                 {/* DATA PEGAWAI */}
                 <div className="text-[11pt] space-y-1 mb-6">
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>1.</span><span>Nama</span><span>:</span><span className="font-bold uppercase">{formData.namaPegawai}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>2.</span><span>NIP</span><span>:</span><span>{formData.nip}</span></div>
                    <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>3.</span><span>{formData.jenisPegawai === 'PNS' ? 'Pangkat / Golongan ruang' : 'Golongan/Jabatan'}</span><span>:</span><span className="uppercase">{formData.pangkatGol}</span></div>
                    {formData.jenisPegawai === 'PNS' ? (
                       <>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>4.</span><span>Jabatan</span><span>:</span><span className="uppercase">{formData.jabatan}</span></div>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>5.</span><span>Kantor / Tempat</span><span>:</span><span className="uppercase">{formData.kantor}</span></div>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>6.</span><span>Gaji Pokok Lama</span><span>:</span><span>Rp. {Number(formData.gajiLama).toLocaleString('id-ID')} ({terbilang(formData.gajiLama!)} rupiah)</span></div>
                       </>
                    ) : (
                       <>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>4.</span><span>Masa Perjanjian Kerja</span><span>:</span><span>{formData.masaPerjanjianKerja}</span></div>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>5.</span><span>Perpanjangan Perjanjian Kerja</span><span>:</span><span>{formData.perpanjanganPerjanjianKerja}</span></div>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>6.</span><span>Kantor/Unit Kerja</span><span>:</span><span className="uppercase">{formData.kantor}</span></div>
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>7.</span><span>Gaji Pokok Lama</span><span>:</span><span>Rp. {Number(formData.gajiLama).toLocaleString('id-ID')} ({terbilang(formData.gajiLama!)} rupiah)</span></div>
                       </>
                    )}
                 </div>

                 <div className="text-[11pt] mb-6">
                    <p>atas dasar Surat Keputusan terakhir tentang gaji / {formData.jenisPegawai === 'PNS' ? 'pangkat' : 'golongan'} yang ditetapkan:</p>
                    <div className="ml-8 space-y-1 mt-2">
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>a.</span><span>Oleh pejabat</span><span>:</span><span>{formData.skTerakhirPejabat}</span></div>
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>b.</span><span>Tanggal</span><span>:</span><span>{formData.skTerakhirTanggal ? new Date(formData.skTerakhirTanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</span></div>
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>c.</span><span>Nomor</span><span>:</span><span>{formData.skTerakhirNomor}</span></div>
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>d.</span><span>Tanggal mulai berlakunya gaji tersebut</span><span>:</span><span>{formData.skTerakhirTmt ? new Date(formData.skTerakhirTmt).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</span></div>
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>e.</span><span>Masa kerja golongan pada tanggal tersebut</span><span>:</span><span>{formData.skTerakhirMasaKerja}</span></div>
                    </div>
                 </div>

                 <div className="text-[11pt] mb-6">
                    <p>Diberikan kenaikan gaji berkala hingga memperoleh:</p>
                    <div className="space-y-1 mt-2">
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>{formData.jenisPegawai === 'PNS' ? '7.' : '8.'}</span><span>Gaji Pokok Baru</span><span>:</span><span className="font-bold">Rp. {Number(formData.gajiBaru).toLocaleString('id-ID')} ({terbilang(formData.gajiBaru!)} rupiah)</span></div>
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>{formData.jenisPegawai === 'PNS' ? '8.' : '9.'}</span><span>Berdasarkan masa kerja</span><span>:</span><span className="font-bold">{formData.masaKerjaBaru}</span></div>
                       {formData.jenisPegawai === 'PNS' && (
                          <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>9.</span><span>Dalam golongan ruang</span><span>:</span><span className="uppercase font-bold">{formData.pangkatGol}</span></div>
                       )}
                       <div className="grid grid-cols-[30px_180px_10px_1fr]"><span>10.</span><span>Terhitung mulai tanggal</span><span>:</span><span className="font-bold">{formData.tmtBaru ? new Date(formData.tmtBaru).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) : '-'}</span></div>
                    </div>
                 </div>

                 <div className="text-[11pt] text-justify leading-relaxed mb-10">
                    {formData.jenisPegawai === 'PNS' ? (
                       <p>Diharapkan agar sesuai dengan Peraturan Pemerintah RI Nomor 5 Tahun 2024 kepada pegawai tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokok baru.</p>
                    ) : (
                       <p>Sesuai dengan Peraturan Presiden RI Nomor 11 Tahun 2024, kepada pegawai Pemerintah dengan Perjanjian Kerja tersebut dapat dibayarkan penghasilannya berdasarkan gaji pokok baru.</p>
                    )}
                 </div>

                 {/* SIGNATURE */}
                 <div className="ml-[50%] text-center text-[11pt] leading-tight text-black">
                    <p>Sekretaris Direktorat Jenderal</p>
                    <p>Kekayaan Intelektual,</p>
                    <p className="mb-24 uppercase font-bold"></p>
                    <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                 </div>

                 {/* TEMBUSAN */}
                 <div className="mt-10 text-[9pt]">
                    <p className="font-bold">Tembusan:</p>
                    <ol className="list-decimal ml-4">
                       <li>Kepala BKN, u.p. Deputi Bidang Informasi Kepegawaian;</li>
                       <li>Kepala Biro SDM Kementerian Hukum RI;</li>
                       <li>Pembuat Daftar Gaji Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum RI;</li>
                       <li>Pegawai yang bersangkutan.</li>
                    </ol>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default KGBGeneratorPage;