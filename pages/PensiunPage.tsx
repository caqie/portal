
import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, syncTableRemote, getRetirementDetails } from '../spreadsheetService';
import { Pegawai } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const PensiunPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterJenis, setFilterJenis] = useState('Semua Jenis');
  const [filterYearStart, setFilterYearStart] = useState('Semua');
  const [filterYearEnd, setFilterYearEnd] = useState('Semua');

  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    instansiInduk: 'KEMENTERIAN HUKUM',
    provinsi: 'DKI JAKARTA',
    kabupaten: 'DKI JAKARTA',
    unitKerjaHeader: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    pembayaran: 'DKI JAKARTA',
    bup: '60',
    pjbNama: 'Anggoro Dasananto',
    pjbNip: '196412081991031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    
    nip: '',
    namaPegawai: '',
    tempatLahir: '',
    tanggalLahir: '',
    jabatan: '',
    pangkat: '',
    golRuang: '',
    gajiPokokTerakhir: 'Rp. 0',
    mkgTahun: '0',
    mkgBulan: '0',
    mkpTahun: '0',
    mkpBulan: '0',
    mkSebelumPnsTahun: '0',
    mkSebelumPnsBulan: '0',
    alamatSekarang: '',
    alamatPensiun: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await fetchPegawaiFromSheets();
      setPegawaiList(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const retiringCandidates = useMemo(() => {
    return pegawaiList.map(p => {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      return { ...p, retirement: ret };
    }).filter(p => {
      if (!p.retirement) return false;
      const termMatch = `${p.nama} ${p.nip}`.toLowerCase().includes(searchTerm.toLowerCase());
      const unitMatch = filterUnit === 'Semua Unit' || normalizeUnitName(p.unitKerja) === filterUnit;
      const jenisMatch = filterJenis === 'Semua Jenis' || (p.jenisPegawai || '').toUpperCase() === filterJenis.toUpperCase();
      
      const pYear = p.retirement.tmtPensiun.getFullYear();
      const yearStartMatch = filterYearStart === 'Semua' || pYear >= parseInt(filterYearStart);
      const yearEndMatch = filterYearEnd === 'Semua' || pYear <= parseInt(filterYearEnd);
      
      const now = new Date();
      const diffYears = (p.retirement.tmtPensiun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      // If a specific period is selected, we show all for that period regardless of the 5-year window
      const isWithinWindow = diffYears <= 5;
      const hasYearFilter = filterYearStart !== 'Semua' || filterYearEnd !== 'Semua';
      
      return termMatch && unitMatch && jenisMatch && (hasYearFilter ? (yearStartMatch && yearEndMatch) : isWithinWindow);
    }).sort((a, b) => a.retirement!.tmtPensiun.getTime() - b.retirement!.tmtPensiun.getTime());
  }, [pegawaiList, searchTerm, filterUnit, filterJenis, filterYearStart, filterYearEnd]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    pegawaiList.forEach(p => {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      if (ret) years.add(ret.tmtPensiun.getFullYear().toString());
    });
    return Array.from(years).sort();
  }, [pegawaiList]);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      
      // Parse Masa Kerja if available (format usually "XX Tahun YY Bulan")
      let mkgT = '0', mkgB = '0';
      if (p.masaKerja) {
        const match = p.masaKerja.match(/(\d+)\s*Tahun\s*(\d+)\s*Bulan/i);
        if (match) {
          mkgT = match[1];
          mkgB = match[2];
        }
      }

      setFormData({ 
        ...formData, 
        nip: p.nip, 
        namaPegawai: p.nama, 
        pangkat: p.pangkat || '', 
        golRuang: p.golRuang || '',
        jabatan: p.jabatan || '',
        tempatLahir: p.tempatLahir || '',
        tanggalLahir: p.tanggalLahir || '',
        alamatSekarang: p.alamat || '',
        alamatPensiun: p.alamat || '',
        bup: ret?.bup.toString() || '60',
        mulaiMasukPns: p.tmtCpns || '',
        pendidikanDasar: p.pendidikan || '',
        mkgTahun: mkgT,
        mkgBulan: mkgB,
        mkpTahun: mkgT, // Default to MKG if MKP not explicitly in Pegawai
        mkpBulan: mkgB,
        mkSebelumPnsTahun: '0',
        mkSebelumPnsBulan: '0',
        unitKerjaHeader: p.unitKerja || formData.unitKerjaHeader,
        istriSuami: p.keluarga?.filter(k => k.hubungan.toUpperCase().includes('ISTRI') || k.hubungan.toUpperCase().includes('SUAMI')).map(k => ({
          nama: k.nama,
          tglLahir: k.tanggalLahir || '',
          kawinTgl: '',
          urutan: '1'
        })) || [{ nama: '', tglLahir: '', kawinTgl: '', urutan: '1' }],
        anak: p.keluarga?.filter(k => k.hubungan.toUpperCase().includes('ANAK')).map(k => ({
          nama: k.nama,
          tglLahir: k.tanggalLahir || '',
          kandung: 'YA',
          tiri: '-',
          ayahIbu: p.nama
        })) || [{ nama: '', tglLahir: '', kandung: 'YA', tiri: '-', ayahIbu: '' }]
      });
      setActiveView('editor');
    }
  };

  const addIstriSuami = () => setFormData({ ...formData, istriSuami: [...formData.istriSuami, { nama: '', tglLahir: '', kawinTgl: '', urutan: (formData.istriSuami.length + 1).toString() }] });
  const removeIstriSuami = (index: number) => {
    const list = [...formData.istriSuami];
    list.splice(index, 1);
    setFormData({ ...formData, istriSuami: list });
  };

  const addAnak = () => setFormData({ ...formData, anak: [...formData.anak, { nama: '', tglLahir: '', kandung: 'YA', tiri: '-', ayahIbu: '' }] });
  const removeAnak = (index: number) => {
    const list = [...formData.anak];
    list.splice(index, 1);
    setFormData({ ...formData, anak: list });
  };

  const copyAlamat = () => setFormData({ ...formData, alamatPensiun: formData.alamatSekarang });

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    setSyncing(true);
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
    pdf.save(`DPCP_${formData.namaPegawai.replace(/\s+/g, '_')}.pdf`);
    setSyncing(false);
  };

  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";
  const inputClass = "w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[12px] font-bold uppercase focus:border-blue-600 outline-none transition-all";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
           <button onClick={() => activeView === 'list' ? navigate('/layanan') : setActiveView('list')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
           </button>
           <div>
             <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">DPCP Generator</h3>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
               <i className="bi bi-door-open-fill text-rose-600"></i> Data Perorangan Calon Penerima Pensiun
             </p>
           </div>
        </div>
        <div className="flex gap-2">
           {activeView === 'list' ? (
             <button onClick={() => {
                const calculateAge = (birthDateStr: string) => {
                  if (!birthDateStr) return 0;
                  const birthDate = new Date(birthDateStr);
                  const today = new Date();
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const m = today.getMonth() - birthDate.getMonth();
                  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                  return age;
                };

                const exportData = retiringCandidates.map(p => {
                  return {
                    'NIP': p.nip,
                    'NAMA': p.nama,
                    'JABATAN': p.jabatan,
                    'unit kerja': p.unitKerja,
                    'TMT_JABATAN': p.tmtJabatan || '-',
                    'GOL_RUANG': p.golRuang,
                    'TANGGAL_LAHIR': p.tanggalLahir,
                    'GENDER': p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
                    'Usia': p.usia || '-',
                    'Tgl Pensiun': p.tglPensiun || '-',
                    'TMT Pensiun': p.tmtPensiunDisplay || '-',
                    'Usia Pensiun': p.bup || '-',
                    'Sisa Masa Kerja': p.sisaMasaKerja || '-'
                  };
                });

                const ws = XLSX.utils.json_to_sheet(exportData);
                const wb = XLSX.utils.book_new(); 
                XLSX.utils.book_append_sheet(wb, ws, "Calon Pensiun");
                XLSX.writeFile(wb, `Data_Pensiun_DJKI_${new Date().getFullYear()}.xlsx`);
             }} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase shadow-lg flex items-center gap-2">
                <i className="bi bi-file-earmark-spreadsheet-fill"></i> Ekspor Excel
             </button>
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
                <input type="text" placeholder="Cari Calon Pensiun..." className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-xs font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <select className="px-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                  <option>Semua Unit</option>
                  {UNIT_KERJA.map(u => <option key={u}>{u}</option>)}
                </select>
                <select className="px-6 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all shadow-inner" value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
                  <option>Semua Jenis</option>
                  <option>PNS</option>
                  <option>CPNS</option>
                  <option>PPPK</option>
                </select>
                <div className="flex items-center gap-2 bg-gray-50 border-2 border-transparent rounded-2xl px-4 shadow-inner">
                  <span className="text-[8px] font-black text-gray-400 uppercase">Dari:</span>
                  <select className="bg-transparent text-[10px] font-black uppercase outline-none" value={filterYearStart} onChange={e => setFilterYearStart(e.target.value)}>
                    <option>Semua</option>
                    {availableYears.map(y => <option key={y}>{y}</option>)}
                  </select>
                  <span className="text-[8px] font-black text-gray-400 uppercase">Sampai:</span>
                  <select className="bg-transparent text-[10px] font-black uppercase outline-none" value={filterYearEnd} onChange={e => setFilterYearEnd(e.target.value)}>
                    <option>Semua</option>
                    {availableYears.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
           </div>
           <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                  <tr><th className="px-10 py-5">Pegawai</th><th className="px-4 py-5 text-center">TMT Pensiun</th><th className="px-4 py-5 text-center">Sisa Masa Kerja</th><th className="px-10 py-5 text-right">Opsi</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {retiringCandidates.map(p => (
                    <tr key={p.nip} className="hover:bg-blue-50/5 group transition-all">
                      <td className="px-10 py-5"><p className="text-[11px] font-black text-gray-950 uppercase">{p.nama}</p><p className="text-[9px] font-mono text-blue-600">NIP. {p.nip}</p></td>
                      <td className="px-4 py-5 text-center font-black text-rose-600">{p.tmtPensiunDisplay || (p.retirement?.tmtPensiun.toLocaleDateString('id-ID'))}</td>
                      <td className="px-4 py-5 text-center"><span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black border border-rose-100">{p.sisaMasaKerja || p.masaKerja || '-'}</span></td>
                      <td className="px-10 py-5 text-right"><button onClick={() => handleASNSelect(p.nip)} className="h-9 px-6 bg-gray-950 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all opacity-0 group-hover:opacity-100">Buat DPCP</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      )}

      {activeView === 'editor' && (
        <div className="max-w-6xl mx-auto bg-white p-10 md:p-14 rounded-[4rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-rose-600 uppercase border-b pb-2 tracking-widest">1. Header Dokumen</h5>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-full"><label className={labelClass}>Instansi Induk</label><input type="text" className={inputClass} value={formData.instansiInduk} onChange={e=>setFormData({...formData, instansiInduk: e.target.value})} /></div>
                    <div><label className={labelClass}>Provinsi</label><input type="text" className={inputClass} value={formData.provinsi} onChange={e=>setFormData({...formData, provinsi: e.target.value})} /></div>
                    <div><label className={labelClass}>Kabupaten</label><input type="text" className={inputClass} value={formData.kabupaten} onChange={e=>setFormData({...formData, kabupaten: e.target.value})} /></div>
                    <div className="col-span-full"><label className={labelClass}>Unit Kerja</label><input type="text" className={inputClass} value={formData.unitKerjaHeader} onChange={e=>setFormData({...formData, unitKerjaHeader: e.target.value})} /></div>
                    <div><label className={labelClass}>Pembayaran</label><input type="text" className={inputClass} value={formData.pembayaran} onChange={e=>setFormData({...formData, pembayaran: e.target.value})} /></div>
                    <div><label className={labelClass}>BUP</label><input type="number" className={inputClass} value={formData.bup} onChange={e=>setFormData({...formData, bup: e.target.value})} /></div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">2. Keterangan Pribadi</h5>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-full"><label className={labelClass}>Nama Lengkap</label><input type="text" className={inputClass} value={formData.namaPegawai} onChange={e=>setFormData({...formData, namaPegawai: e.target.value})} /></div>
                    <div><label className={labelClass}>NIP</label><input type="text" className={inputClass} value={formData.nip} onChange={e=>setFormData({...formData, nip: e.target.value})} /></div>
                    <div><label className={labelClass}>Jabatan</label><input type="text" className={inputClass} value={formData.jabatan} onChange={e=>setFormData({...formData, jabatan: e.target.value})} /></div>
                    <div><label className={labelClass}>Tempat Lahir</label><input type="text" className={inputClass} value={formData.tempatLahir} onChange={e=>setFormData({...formData, tempatLahir: e.target.value})} /></div>
                    <div><label className={labelClass}>Tgl Lahir</label><input type="date" className={inputClass} value={formData.tanggalLahir} onChange={e=>setFormData({...formData, tanggalLahir: e.target.value})} /></div>
                    <div><label className={labelClass}>Pangkat</label><input type="text" className={inputClass} value={formData.pangkat} onChange={e=>setFormData({...formData, pangkat: e.target.value})} /></div>
                    <div><label className={labelClass}>Gol/Ruang</label><input type="text" className={inputClass} value={formData.golRuang} onChange={e=>setFormData({...formData, golRuang: e.target.value})} /></div>
                    <div><label className={labelClass}>Gaji Pokok</label><input type="text" className={inputClass} value={formData.gajiPokokTerakhir} onChange={e=>setFormData({...formData, gajiPokokTerakhir: e.target.value})} /></div>
                    <div><label className={labelClass}>Pendidikan Pertama</label><input type="text" className={inputClass} value={formData.pendidikanDasar} onChange={e=>setFormData({...formData, pendidikanDasar: e.target.value})} /></div>
                    <div className="col-span-full"><label className={labelClass}>Mulai Masuk PNS</label><input type="date" className={inputClass} value={formData.mulaiMasukPns} onChange={e=>setFormData({...formData, mulaiMasukPns: e.target.value})} /></div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">3. Masa Kerja & Alamat</h5>
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>MKG (Tahun)</label><input type="number" className={inputClass} value={formData.mkgTahun} onChange={e=>setFormData({...formData, mkgTahun: e.target.value})} /></div>
                    <div><label className={labelClass}>MKG (Bulan)</label><input type="number" className={inputClass} value={formData.mkgBulan} onChange={e=>setFormData({...formData, mkgBulan: e.target.value})} /></div>
                    <div><label className={labelClass}>MKP (Tahun)</label><input type="number" className={inputClass} value={formData.mkpTahun} onChange={e=>setFormData({...formData, mkpTahun: e.target.value})} /></div>
                    <div><label className={labelClass}>MKP (Bulan)</label><input type="number" className={inputClass} value={formData.mkpBulan} onChange={e=>setFormData({...formData, mkpBulan: e.target.value})} /></div>
                    <div><label className={labelClass}>MK Sebelum PNS (Thn)</label><input type="number" className={inputClass} value={formData.mkSebelumPnsTahun} onChange={e=>setFormData({...formData, mkSebelumPnsTahun: e.target.value})} /></div>
                    <div><label className={labelClass}>MK Sebelum PNS (Bln)</label><input type="number" className={inputClass} value={formData.mkSebelumPnsBulan} onChange={e=>setFormData({...formData, mkSebelumPnsBulan: e.target.value})} /></div>
                    
                    <div className="col-span-full">
                      <div className="flex justify-between items-end mb-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Alamat Sekarang</label>
                      </div>
                      <textarea className={`${inputClass} h-24 resize-none`} value={formData.alamatSekarang} onChange={e=>setFormData({...formData, alamatSekarang: e.target.value})} />
                    </div>
                    
                    <div className="col-span-full">
                      <div className="flex justify-between items-end mb-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest">Alamat Pensiun</label>
                        <button onClick={copyAlamat} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Salin Alamat Sekarang</button>
                      </div>
                      <textarea className={`${inputClass} h-24 resize-none`} value={formData.alamatPensiun} onChange={e=>setFormData({...formData, alamatPensiun: e.target.value})} />
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h5 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest">4. Penandatangan & Tanggal</h5>
                 <div className="space-y-4">
                    <SearchableSelect label="Pejabat Penilai" options={pegawaiList.map(p=>({value:p.nip, label:p.nama, subLabel:p.jabatan}))} value={formData.pjbNip} onChange={v=>{ const p = pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, pjbNip:v, pjbNama:p.nama, pjbJabatan:p.jabatan}); }} />
                    <div><label className={labelClass}>Tanggal Dibuat</label><input type="text" className={inputClass} value={formData.tglDibuat} onChange={e=>setFormData({...formData, tglDibuat: e.target.value})} /></div>
                 </div>
              </div>
           </div>

           <div className="space-y-6 pt-6 border-t">
              <div className="flex justify-between items-center"><h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">5. Data Suami / Istri</h5><button onClick={addIstriSuami} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[8px] font-black uppercase">+ Baris</button></div>
              <div className="space-y-4">
                 {formData.istriSuami.map((is: any, i: number) => (
                    <div key={i} className="relative group">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 pr-12">
                         <div><label className={labelClass}>Nama</label><input placeholder="Nama" className={inputClass} value={is.nama} onChange={e => { const list = [...formData.istriSuami]; list[i].nama = e.target.value; setFormData({ ...formData, istriSuami: list }); }} /></div>
                         <div><label className={labelClass}>Tgl Lahir</label><input type="date" placeholder="Tgl Lahir" className={inputClass} value={is.tglLahir} onChange={e => { const list = [...formData.istriSuami]; list[i].tglLahir = e.target.value; setFormData({ ...formData, istriSuami: list }); }} /></div>
                         <div><label className={labelClass}>Tgl Kawin</label><input type="date" placeholder="Tgl Kawin" className={inputClass} value={is.kawinTgl} onChange={e => { const list = [...formData.istriSuami]; list[i].kawinTgl = e.target.value; setFormData({ ...formData, istriSuami: list }); }} /></div>
                         <div><label className={labelClass}>Urutan Ke</label><input placeholder="Urutan Ke" className={inputClass} value={is.urutan} onChange={e => { const list = [...formData.istriSuami]; list[i].urutan = e.target.value; setFormData({ ...formData, istriSuami: list }); }} /></div>
                      </div>
                      <button onClick={() => removeIstriSuami(i)} className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-white border border-rose-100 text-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-rose-50">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                 ))}
              </div>
           </div>

           <div className="space-y-6 pt-6 border-t">
              <div className="flex justify-between items-center"><h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">6. Data Anak</h5><button onClick={addAnak} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[8px] font-black uppercase">+ Baris</button></div>
              <div className="space-y-4">
                 {formData.anak.map((a: any, i: number) => (
                    <div key={i} className="relative group">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 pr-12">
                         <div><label className={labelClass}>Nama Anak</label><input placeholder="Nama Anak" className={inputClass} value={a.nama} onChange={e => { const list = [...formData.anak]; list[i].nama = e.target.value; setFormData({ ...formData, anak: list }); }} /></div>
                         <div><label className={labelClass}>Tgl Lahir</label><input type="date" placeholder="Tgl Lahir" className={inputClass} value={a.tglLahir} onChange={e => { const list = [...formData.anak]; list[i].tglLahir = e.target.value; setFormData({ ...formData, anak: list }); }} /></div>
                         <div><label className={labelClass}>Status</label><select className={inputClass} value={a.kandung} onChange={e => { const list = [...formData.anak]; list[i].kandung = e.target.value; setFormData({ ...formData, anak: list }); }}><option value="YA">YA (Kandung)</option><option value="TIDAK">TIDAK</option></select></div>
                         <div><label className={labelClass}>Ayah/Ibu</label><input placeholder="Nama Ayah/Ibu" className={inputClass} value={a.ayahIbu} onChange={e => { const list = [...formData.anak]; list[i].ayahIbu = e.target.value; setFormData({ ...formData, anak: list }); }} /></div>
                      </div>
                      <button onClick={() => removeAnak(i)} className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-white border border-rose-100 text-rose-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-rose-50">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                 ))}
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center gap-4">
              <button onClick={() => {
                if(window.confirm('Apakah Anda yakin ingin mengosongkan form?')) {
                  setFormData({
                    ...formData,
                    nip: '', namaPegawai: '', tempatLahir: '', tanggalLahir: '', jabatan: '', pangkat: '', golRuang: '',
                    gajiPokokTerakhir: 'Rp. 0', mkgTahun: '0', mkgBulan: '0', mkpTahun: '0', mkpBulan: '0',
                    mkSebelumPnsTahun: '0', mkSebelumPnsBulan: '0', pendidikanDasar: '', mulaiMasukPns: '',
                    istriSuami: [{ nama: '', tglLahir: '', kawinTgl: '', urutan: '1' }],
                    anak: [{ nama: '', tglLahir: '', kandung: 'YA', tiri: '-', ayahIbu: '' }],
                    alamatSekarang: '', alamatPensiun: ''
                  });
                }
              }} className="px-12 py-5 bg-white border border-gray-200 text-gray-400 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 transition-all">Reset Form</button>
              <button onClick={() => setActiveView('preview')} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Pratinjau Dokumen BKN</button>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-end gap-3 no-print px-6">
              <button onClick={() => setActiveView('editor')} className="px-8 py-4 bg-white text-gray-500 border border-gray-200 rounded-2xl text-[11px] font-black uppercase">Edit Data</button>
              <button onClick={handleDownloadPdf} disabled={syncing} className="px-10 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95">
                 {syncing ? <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <i className="bi bi-file-earmark-pdf-fill"></i>} Download PDF
              </button>
           </div>
           <div className="bg-gray-400/20 py-10 flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1cm_1.5cm] font-arial text-black" style={{ width: '297mm', minHeight: '210mm', color: '#000000' }}>
                 <div className="text-[8pt] grid grid-cols-[120px_10px_1fr] gap-x-2 leading-tight uppercase font-bold mb-4">
                    <span>INSTANSI INDUK</span><span>:</span><span>{formData.instansiInduk}</span>
                    <span>PROPINSI</span><span>:</span><span>{formData.provinsi}</span>
                    <span>KABUPATEN</span><span>:</span><span>{formData.kabupaten}</span>
                    <span>UNIT KERJA</span><span>:</span><span>{formData.unitKerjaHeader}</span>
                    <span>PEMBAYARAN</span><span>:</span><span>{formData.pembayaran}</span>
                    <span>BUP</span><span>:</span><span>{formData.bup}</span>
                 </div>
                 
                 <div className="text-center mb-6">
                    <h1 className="text-[11pt] font-bold uppercase underline leading-tight">DATA PERORANGAN CALON PENERIMA PENSIUN (DPCP) PEGAWAI NEGERI SIPIL YANG MENCAPAI BATAS USIA PENSIUN</h1>
                 </div>

                 <div className="grid grid-cols-2 gap-x-12 text-[8.5pt] leading-[1.4]">
                    <div className="space-y-4">
                       <div>
                          <p className="font-bold border-b border-black inline-block mb-1">1 KETERANGAN PRIBADI</p>
                          <div className="grid grid-cols-[180px_10px_1fr] gap-y-0.5">
                             <span>A. NAMA</span><span>:</span><span className="font-bold uppercase">{formData.namaPegawai}</span>
                             <span>B. NIP</span><span>:</span><span className="font-bold">{formData.nip}</span>
                             <span>C. TEMPAT / TANGGAL LAHIR</span><span>:</span><span className="uppercase">{formData.tempatLahir}, {formData.tanggalLahir}</span>
                             <span>D. JABATAN PEKERJAAN</span><span>:</span><span className="uppercase">{formData.jabatan}</span>
                             <span>E. PANGKAT / GOLONGAN</span><span>:</span><span className="uppercase">{formData.pangkat} ({formData.golRuang})</span>
                             <span>F. GAJI POKOK TERAKHIR</span><span>:</span><span>{formData.gajiPokokTerakhir}</span>
                             <span>G. MASA KERJA GOLONGAN</span><span>:</span><span>{formData.mkgTahun} TAHUN {formData.mkgBulan} BULAN</span>
                             <span>H. MASA KERJA PENSIUN</span><span>:</span><span>{formData.mkpTahun} TAHUN {formData.mkpBulan} BULAN</span>
                             <span>I. MASA KERJA SEBELUM PNS</span><span>:</span><span>{formData.mkSebelumPnsTahun} TAHUN {formData.mkSebelumPnsBulan} BULAN</span>
                             <span>J. PENDIDIKAN PERTAMA</span><span>:</span><span className="uppercase">{formData.pendidikanDasar}</span>
                             <span>K. MULAI MASUK PNS</span><span>:</span><span>{formData.mulaiMasukPns}</span>
                          </div>
                       </div>

                       <div>
                          <p className="font-bold border-b border-black inline-block mb-1">2 KETERANGAN KELUARGA</p>
                          <p className="font-bold mb-1 uppercase">A. SUAMI / ISTRI</p>
                          <table className="w-full border-collapse text-center text-[7pt]">
                             <thead>
                                <tr className="border-t border-b border-black uppercase font-bold">
                                   <th className="p-1 border-l border-black">NO</th>
                                   <th className="p-1 border-l border-black">NAMA</th>
                                   <th className="p-1 border-l border-black">TGL. LAHIR</th>
                                   <th className="p-1 border-l border-black">KAWIN TGL</th>
                                   <th className="p-1 border-l border-r border-black">KE</th>
                                </tr>
                             </thead>
                             <tbody>
                                {formData.istriSuami.map((is: any, i: number) => (
                                   <tr key={i} className="border-b border-black h-6">
                                      <td className="p-1 border-l border-black">{i+1}</td>
                                      <td className="p-1 border-l border-black uppercase">{is.nama}</td>
                                      <td className="p-1 border-l border-black">{is.tglLahir}</td>
                                      <td className="p-1 border-l border-black">{is.kawinTgl}</td>
                                      <td className="p-1 border-l border-r border-black">{is.urutan}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div>
                          <p className="font-bold mb-1 uppercase">B. ANAK-ANAK</p>
                          <table className="w-full border-collapse text-center text-[7pt]">
                             <thead>
                                <tr className="border-t border-b border-black uppercase font-bold">
                                   <th className="p-1 border-l border-black">NO</th>
                                   <th className="p-1 border-l border-black">NAMA</th>
                                   <th className="p-1 border-l border-black">TGL LAHIR</th>
                                   <th className="p-1 border-l border-black text-[6pt]">KANDUNG/TIRI</th>
                                   <th className="p-1 border-l border-r border-black">AYAH / IBU</th>
                                </tr>
                             </thead>
                             <tbody>
                                {formData.anak.map((a: any, i: number) => (
                                   <tr key={i} className="border-b border-black h-6">
                                      <td className="p-1 border-l border-black">{i+1}</td>
                                      <td className="p-1 border-l border-black uppercase">{a.nama}</td>
                                      <td className="p-1 border-l border-black">{a.tglLahir}</td>
                                      <td className="p-1 border-l border-black uppercase">{a.kandung === 'YA' ? 'KANDUNG' : 'TIRI'}</td>
                                      <td className="p-1 border-l border-r border-black uppercase">{a.ayahIbu}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>

                       <div>
                          <p className="font-bold border-b border-black inline-block mb-1 uppercase">3 ALAMAT</p>
                          <div className="grid grid-cols-[140px_10px_1fr] gap-y-1">
                             <span className="font-bold">A. SEKARANG</span><span>:</span><span className="uppercase">{formData.alamatSekarang}</span>
                             <span className="font-bold">B. PENSIUN</span><span>:</span><span className="uppercase">{formData.alamatPensiun}</span>
                          </div>
                       </div>
                       <div><p className="text-[7.5pt] font-bold leading-tight">4 DENGAN INI MENYATAKAN AKAN MENGEMBALIKAN SELURUH BARANG INVENTARIS MILIK NEGARA SETELAH DIBERHENTIKAN DENGAN HORMAT SEBAGAI PEGAWAI NEGERI SIPIL DAN APABILA SAYA TIDAK MEMATUHI SAYA BERSEDIA DIAMBIL TINDAKAN SESUAI PERATURAN PERUNDANG-UNDANGAN YANG BERLAKU</p></div>
                       <div><p className="font-bold uppercase text-[8.5pt]">5 DEMIKIAN DATA INI DIBUAT DENGAN SESUNGGUHNYA.</p></div>
                    </div>
                 </div>

                 <div className="mt-8 flex justify-between text-[8.5pt] leading-tight text-black">
                    <div className="w-[45%] text-center flex flex-col items-center">
                       <p className="font-bold uppercase mb-1">MENGETAHUI :</p>
                       <p className="font-bold uppercase mb-16">{formData.pjbJabatan}</p>
                       <p className="font-bold uppercase underline leading-none">( {formData.pjbNama} )</p>
                       <p className="mt-1 font-bold">NIP {formData.pjbNip}</p>
                    </div>
                    <div className="w-[45%] text-center flex flex-col items-center">
                       <p>JAKARTA, {formData.tglDibuat}</p>
                       <p className="font-bold uppercase mt-1 mb-16">PEGAWAI NEGERI SIPIL YANG BERSANGKUTAN</p>
                       <p className="font-bold uppercase underline leading-none">( {formData.namaPegawai} )</p>
                       <p className="mt-1 font-bold">NIP {formData.nip}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PensiunPage;
