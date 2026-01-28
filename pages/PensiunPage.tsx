
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, getRetirementDetails } from '../spreadsheetService';
import { Pegawai, DPCPRecord } from '../types';
import { useAuth } from '../AuthContext';
import SuccessModal from '../components/SuccessModal';
import ConfirmationModal from '../components/ConfirmationModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

const PensiunPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit, isSuperadmin } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('editor');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    instansiInduk: 'KEMENTERIAN HUKUM REPUBLIK INDONESIA',
    unitKerjaHeader: 'DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL',
    provinsi: 'DKI JAKARTA',
    pembayaran: 'KPPN JAKARTA V',
    kabKota: 'JAKARTA SELATAN',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    gajiPokokTerakhir: '0',
    mkgTahun: '0',
    mkgBulan: '0',
    mkpTahun: '0',
    mkpBulan: '0',
    pendidikanDasar: 'SARJANA (S1)',
    pendidikanDasarTahun: '2010',
    mulaiMasukPns: '01-03-2011',
    istriSuami: [{ nama: '', tglLahir: '', tglNikah: '', pekerjaan: '', nip: '-' }],
    anak: [{ nama: '', tglLahir: '', jenisKelamin: 'L', status: 'Kandung' }],
    alamatSekarang: '',
    kecSekarang: '',
    provSekarang: 'DKI JAKARTA',
    alamatPensiun: '',
    kecPensiun: '',
    provPensiun: '',
    kodePosPensiun: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const pRes = await fetchPegawaiFromSheets();
      setPegawaiList(pRes);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(peg => peg.nip === nip);
    if (p) {
      const ret = getRetirementDetails(p.nip, p.jabatan);
      setFormData({
        ...formData,
        nip: p.nip,
        namaPegawai: p.nama,
        pangkat: p.pangkat,
        golRuang: p.golRuang,
        bup: ret?.tmtPensiun.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}) || '',
        tmtGolRuang: p.tmtPangkat || '',
        alamatSekarang: p.alamat || '',
        pendidikanDasar: (p.pendidikan || 'SARJANA').toUpperCase(),
      });
    }
  };

  const handleAddKeluarga = (type: 'istriSuami' | 'anak') => {
    const newRow = type === 'istriSuami' 
      ? { nama: '', tglLahir: '', tglNikah: '', pekerjaan: '', nip: '-' }
      : { nama: '', tglLahir: '', jenisKelamin: 'L', status: 'Kandung' };
    setFormData({ ...formData, [type]: [...formData[type], newRow] });
  };

  const handleSave = () => {
    if (!formData.nip) return alert("Mohon pilih pegawai terlebih dahulu.");
    setActiveView('preview');
    setShowSuccess(true);
    logActivity('CREATE', 'PENSIUN', `Generate DPCP: ${formData.namaPegawai}`);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2.2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [330, 210] });
    pdf.addImage(imgData, 'PNG', 0, 0, 330, 210);
    pdf.save(`DPCP_${formData.namaPegawai?.replace(/\s+/g, '_')}.pdf`);
  };

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[8px] font-black text-gray-400 uppercase ml-2 mb-1 block tracking-widest";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="DPCP Berhasil Dibuat" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
            <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Generator DPCP</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Data Perorangan Calon Penerima Pensiun</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveView('editor')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'editor' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>Editor</button>
           <button onClick={() => setActiveView('preview')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeView === 'preview' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>Pratinjau</button>
        </div>
      </div>

      {activeView === 'editor' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-modalEnter">
           {/* LEFT COLUMN: IDENTITAS & MASA KERJA */}
           <div className="xl:col-span-8 space-y-6">
              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-10">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-4 tracking-widest flex items-center gap-2"><i className="bi bi-person-badge"></i> Data Utama & Masa Kerja</h5>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                       <SearchableSelect label="Pilih Pegawai" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip}`}))} value={formData.nip} onChange={handleASNSelect} />
                    </div>
                    <div className="space-y-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 mb-2">Masa Kerja Golongan (MKG)</p>
                       <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Tahun</label><input type="number" className={inputClass} value={formData.mkgTahun} onChange={e=>setFormData({...formData, mkgTahun: e.target.value})} /></div>
                          <div><label className={labelClass}>Bulan</label><input type="number" className={inputClass} value={formData.mkgBulan} onChange={e=>setFormData({...formData, mkgBulan: e.target.value})} /></div>
                       </div>
                    </div>
                    <div className="space-y-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 mb-2">Masa Kerja Pensiun (MKP)</p>
                       <div className="grid grid-cols-2 gap-4">
                          <div><label className={labelClass}>Tahun</label><input type="number" className={inputClass} value={formData.mkpTahun} onChange={e=>setFormData({...formData, mkpTahun: e.target.value})} /></div>
                          <div><label className={labelClass}>Bulan</label><input type="number" className={inputClass} value={formData.mkpBulan} onChange={e=>setFormData({...formData, mkpBulan: e.target.value})} /></div>
                       </div>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div><label className={labelClass}>Gaji Pokok Terakhir</label><input type="text" className={inputClass} value={formData.gajiPokokTerakhir} onChange={e=>setFormData({...formData, gajiPokokTerakhir: e.target.value})} /></div>
                       <div><label className={labelClass}>Pendidikan Dasar</label><input type="text" className={inputClass} value={formData.pendidikanDasar} onChange={e=>setFormData({...formData, pendidikanDasar: e.target.value})} /></div>
                       <div><label className={labelClass}>Lulus Tahun</label><input type="text" className={inputClass} value={formData.pendidikanDasarTahun} onChange={e=>setFormData({...formData, pendidikanDasarTahun: e.target.value})} /></div>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                 <div className="flex justify-between items-center border-b pb-4">
                    <h5 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-people-fill"></i> Susunan Keluarga (Istri/Suami & Anak)</h5>
                    <div className="flex gap-2">
                       <button onClick={()=>handleAddKeluarga('istriSuami')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase border border-emerald-100">+ Pasangan</button>
                       <button onClick={()=>handleAddKeluarga('anak')} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase border border-blue-100">+ Anak</button>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-gray-950 uppercase tracking-tighter">1. Istri / Suami</p>
                    {formData.istriSuami.map((is: any, idx: number) => (
                       <div key={idx} className="grid grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                          <input placeholder="NAMA" className={inputClass} value={is.nama} onChange={e=>{let list=[...formData.istriSuami]; list[idx].nama=e.target.value; setFormData({...formData, istriSuami:list})}} />
                          <input placeholder="TGL LAHIR" className={inputClass} value={is.tglLahir} onChange={e=>{let list=[...formData.istriSuami]; list[idx].tglLahir=e.target.value; setFormData({...formData, istriSuami:list})}} />
                          <input placeholder="TGL NIKAH" className={inputClass} value={is.tglNikah} onChange={e=>{let list=[...formData.istriSuami]; list[idx].tglNikah=e.target.value; setFormData({...formData, istriSuami:list})}} />
                          <button onClick={()=>{let list=formData.istriSuami.filter((_:any,i:number)=>i!==idx); setFormData({...formData, istriSuami:list})}} className="text-rose-500 hover:text-rose-700 text-lg"><i className="bi bi-x-circle"></i></button>
                       </div>
                    ))}
                    <p className="text-[10px] font-black text-gray-950 uppercase tracking-tighter pt-4">2. Daftar Anak</p>
                    {formData.anak.map((a: any, idx: number) => (
                       <div key={idx} className="grid grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                          <input placeholder="NAMA ANAK" className={inputClass} value={a.nama} onChange={e=>{let list=[...formData.anak]; list[idx].nama=e.target.value; setFormData({...formData, anak:list})}} />
                          <input placeholder="TGL LAHIR" className={inputClass} value={a.tglLahir} onChange={e=>{let list=[...formData.anak]; list[idx].tglLahir=e.target.value; setFormData({...formData, anak:list})}} />
                          <select className={inputClass} value={a.jenisKelamin} onChange={e=>{let list=[...formData.anak]; list[idx].jenisKelamin=e.target.value; setFormData({...formData, anak:list})}}>
                             <option value="L">LAKI-LAKI</option>
                             <option value="P">PEREMPUAN</option>
                          </select>
                          <button onClick={()=>{let list=formData.anak.filter((_:any,i:number)=>i!==idx); setFormData({...formData, anak:list})}} className="text-rose-500 hover:text-rose-700 text-lg"><i className="bi bi-x-circle"></i></button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* RIGHT COLUMN: PEJABAT & ALAMAT */}
           <div className="xl:col-span-4 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
                 <h5 className="text-[11px] font-black text-rose-600 uppercase border-b pb-4 tracking-widest flex items-center gap-2"><i className="bi bi-person-check-fill"></i> Pejabat Berwenang</h5>
                 <SearchableSelect label="Penandatangan" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: p.jabatan}))} value={formData.pjbNip} onChange={v=>{
                    const p = pegawaiList.find(x=>x.nip===v);
                    setFormData({...formData, pjbNip: v, pjbNama: p?.nama.toUpperCase(), pjbJabatan: p?.jabatan.toUpperCase()});
                 }} />
                 <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-1"><label className={labelClass}>Alamat Sekarang</label><textarea className={`${inputClass} h-20 resize-none`} value={formData.alamatSekarang} onChange={e=>setFormData({...formData, alamatSekarang: e.target.value})} /></div>
                    <div className="space-y-1"><label className={labelClass}>Alamat Pensiun</label><textarea className={`${inputClass} h-20 resize-none`} value={formData.alamatPensiun} onChange={e=>setFormData({...formData, alamatPensiun: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className={labelClass}>Kecamatan</label><input className={inputClass} value={formData.kecPensiun} onChange={e=>setFormData({...formData, kecPensiun: e.target.value})} /></div>
                       <div><label className={labelClass}>Kode Pos</label><input className={inputClass} value={formData.kodePosPensiun} onChange={e=>setFormData({...formData, kodePosPensiun: e.target.value})} /></div>
                    </div>
                 </div>
                 <button onClick={handleSave} className="w-full py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-gray-900/20 active:scale-95 transition-all">Finalisasi DPCP</button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && (
        <div className="flex flex-col items-center animate-fadeIn">
           <div className="flex gap-4 mb-10 no-print">
              <button onClick={() => setActiveView('editor')} className="px-10 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase text-[11px] shadow-sm">Kembali Edit</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center gap-3 active:scale-95"><i className="bi bi-file-earmark-pdf-fill text-xl"></i> Download DPCP Resmi (F4)</button>
           </div>
           
           <div className="bg-gray-200/30 p-10 md:p-20 rounded-[4rem] w-full flex justify-center overflow-x-auto no-scrollbar">
              <div ref={pdfRef} className="bg-white text-black font-arial p-[1cm_1.2cm] border shadow-2xl relative overflow-hidden" style={{ width: '330mm', minHeight: '210mm' }}>
                 {/* HEADER */}
                 <div className="flex justify-between items-start mb-6">
                    <img src={LOGO_GARUDA_URL} className="h-16 w-auto" style={{ filter: 'grayscale(100%)' }} crossOrigin="anonymous" />
                    <div className="text-center flex-1 pr-16">
                       <h1 className="text-[14pt] font-bold uppercase leading-tight">BADAN KEPEGAWAIAN NEGARA</h1>
                       <h2 className="text-[12pt] font-bold uppercase mt-1 underline">DATA PERORANGAN CALON PENERIMA PENSIUN (DPCP)</h2>
                       <p className="text-[10pt] font-bold mt-2 uppercase">PEGAWAI NEGERI SIPIL YANG MENCAPAI BATAS USIA PENSIUN</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8 text-[9.5pt] border-t-2 border-black pt-6 text-black">
                    {/* SECTION 1: KETERANGAN PERORANGAN */}
                    <div className="space-y-4">
                       <p className="font-bold border-b border-black pb-1 mb-2 uppercase">I. KETERANGAN PERORANGAN</p>
                       <div className="grid grid-cols-[200px_10px_1fr] gap-y-1.5 leading-normal">
                          <span>1. NAMA LENGKAP</span><span>:</span><span className="font-bold uppercase">{formData.namaPegawai}</span>
                          <span>2. NIP</span><span>:</span><span>{formData.nip}</span>
                          <span>3. PANGKAT / GOL. RUANG</span><span>:</span><span className="uppercase">{formData.pangkat} ({formData.golRuang}) / TMT: {formData.tmtGolRuang}</span>
                          <span>4. JABATAN TERAKHIR</span><span>:</span><span className="uppercase">{formData.pjbJabatan}</span>
                          <span>5. UNIT KERJA TERAKHIR</span><span>:</span><span className="uppercase">{formData.unitKerjaHeader}</span>
                          <span>6. GAJI POKOK TERAKHIR</span><span>:</span><span className="font-bold">Rp. {Number(formData.gajiPokokTerakhir).toLocaleString('id-ID')}</span>
                          <span>7. MASA KERJA GOLONGAN</span><span>:</span><span className="uppercase">{formData.mkgTahun} TAHUN {formData.mkgBulan} BULAN</span>
                          <span>8. MASA KERJA PENSIUN</span><span>:</span><span className="uppercase">{formData.mkpTahun} TAHUN {formData.mkpBulan} BULAN</span>
                          <span>9. PENDIDIKAN TERAKHIR</span><span>:</span><span className="uppercase">{formData.pendidikanDasar} (LULUS THN: {formData.pendidikanDasarTahun})</span>
                          <span>10. MULAI MASUK PNS</span><span>:</span><span className="uppercase">{formData.mulaiMasukPns}</span>
                       </div>

                       <p className="font-bold border-b border-black pb-1 mt-8 mb-2 uppercase">II. ALAMAT</p>
                       <div className="grid grid-cols-[200px_10px_1fr] gap-y-1.5 leading-normal">
                          <span>A. ALAMAT SEKARANG</span><span>:</span><span className="uppercase">{formData.alamatSekarang}</span>
                          <span>B. ALAMAT SESUDAH PENSIUN</span><span>:</span><span className="uppercase">{formData.alamatPensiun}, KEC: {formData.kecPensiun}, KODE POS: {formData.kodePosPensiun}</span>
                       </div>
                    </div>

                    {/* SECTION 2: SUSUNAN KELUARGA */}
                    <div className="space-y-6">
                       <p className="font-bold border-b border-black pb-1 mb-2 uppercase">III. SUSUNAN KELUARGA</p>
                       <div className="space-y-4">
                          <p className="font-bold text-[9pt]">1. ISTRI / SUAMI</p>
                          <table className="w-full border-collapse border border-black text-[8.5pt]">
                             <thead>
                                <tr className="bg-gray-100 uppercase font-bold"><th className="border border-black p-1">NAMA</th><th className="border border-black p-1">TGL LAHIR</th><th className="border border-black p-1">TGL NIKAH</th><th className="border border-black p-1">PEKERJAAN</th></tr>
                             </thead>
                             <tbody>
                                {formData.istriSuami.map((is: any, i: number) => (
                                   <tr key={i}><td className="border border-black p-1 uppercase">{is.nama || '-'}</td><td className="border border-black p-1 text-center">{is.tglLahir || '-'}</td><td className="border border-black p-1 text-center">{is.tglNikah || '-'}</td><td className="border border-black p-1 uppercase text-center">{is.pekerjaan || '-'}</td></tr>
                                ))}
                             </tbody>
                          </table>

                          <p className="font-bold text-[9pt] pt-2">2. ANAK-ANAK</p>
                          <table className="w-full border-collapse border border-black text-[8.5pt]">
                             <thead>
                                <tr className="bg-gray-100 uppercase font-bold"><th className="border border-black p-1 w-8">NO</th><th className="border border-black p-1">NAMA</th><th className="border border-black p-1">JENIS KELAMIN</th><th className="border border-black p-1">TGL LAHIR</th><th className="border border-black p-1">KETERANGAN</th></tr>
                             </thead>
                             <tbody>
                                {formData.anak.map((a: any, i: number) => (
                                   <tr key={i}><td className="border border-black p-1 text-center">{i+1}</td><td className="border border-black p-1 uppercase font-bold">{a.nama || '-'}</td><td className="border border-black p-1 text-center uppercase">{a.jenisKelamin === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</td><td className="border border-black p-1 text-center">{a.tglLahir || '-'}</td><td className="border border-black p-1 uppercase text-center">{a.status || 'Kandung'}</td></tr>
                                ))}
                                {formData.anak.length === 0 && <tr><td colSpan={5} className="border border-black p-2 text-center italic">Tidak Ada Data Anak</td></tr>}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 </div>

                 {/* FOOTER & SIGNATURE */}
                 <div className="mt-12 grid grid-cols-2 gap-20 text-[10pt] leading-tight text-black">
                    <div className="italic text-[8pt] pt-10">
                       <p>* Catatan: Data ini digunakan sebagai dasar penetapan pensiun.</p>
                       <p>Dicetak otomatis melalui Smart HR Portal DJKI.</p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                       <p>Jakarta, {formData.tglDibuat}</p>
                       <p className="font-bold uppercase mt-1 mb-24 whitespace-pre-wrap">{formData.pjbJabatan},</p>
                       <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                       <p className="mt-2">NIP {formData.pjbNip}</p>
                    </div>
                 </div>

                 <div className="absolute bottom-4 left-10 text-[7pt] text-gray-300 font-bold uppercase tracking-widest italic">
                    BADAN KEPEGAWAIAN NEGARA - FORMAT STANDAR DPCP (F4 LANDSCAPE)
                 </div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default PensiunPage;
