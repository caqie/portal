import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets, fetchPelantikanFromSheets, syncTableRemote } from '../spreadsheetService';
import { Pegawai } from '../types';
import { useAuth } from '../AuthContext';
import { LOGO_PENGAYOMAN_URL } from '../assets/branding';
import SearchableSelect from '../components/SearchableSelect';
import SuccessModal from '../components/SuccessModal';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const LOGO_GARUDA_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/National_emblem_of_Indonesia_Garuda_Pancasila.svg/800px-National_emblem_of_Indonesia_Garuda_Pancasila.svg.png";

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
    
    // Default values
    let pembuka = "Demi Tuhan, saya bersumpah";
    let penutup = "";

    if (a.includes('islam')) {
        pembuka = "Demi Allah, saya bersumpah";
        penutup = "Semoga Allah SWT memberikan bimbingan dan petunjuk-Nya kepada kita semua.";
    } else if (a.includes('kristen')) {
        pembuka = "Demi Tuhan, saya berjanji"; // Sesuai permintaan user
        penutup = "Semoga Tuhan memberkati kita.";
    } else if (a.includes('katolik')) {
        pembuka = "Demi Allah, saya bersumpah";
        penutup = "Semoga Tuhan memberkati kita.";
    }
    // Agama lain (Hindu, Buddha, Konghucu) menggunakan default tanpa penutup

    return { pembuka, penutup };
};

// FIX 1: Menambahkan 'c' pada 'const'
const PelantikanGeneratorPage = () => {
  const navigate = useNavigate();
  const { logActivity, canEdit } = useAuth();
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'editor' | 'preview'>('editor');
  const [docType, setDocType] = useState<'BA' | 'PAKTA'>('BA');
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nomor: 'HKI.1-KP.03.04-',
    hari: 'Rabu',
    tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tempat: 'Direktorat Jenderal Kekayaan Intelektual Kementerian Hukum Republik Indonesia',
    pjbNama: 'ANDRIEANSJAH',
    pjbNip: '197410061998031002',
    pjbJabatan: 'SEKRETARIS DIREKTORAT JENDERAL',
    asnNip: '', asnNama: '', asnPangkat: '', asnGolRuang: '', asnJabatan: '', asnAgama: '',
    saksi1Nama: '', saksi1Nip: '', saksi1Jabatan: '',
    saksi2Nama: '', saksi2Nip: '', saksi2Jabatan: '',
    nomorSk: '',
    tanggalSk: '',
    kataPelantikan: '',
    penutupKataPelantikan: ''
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const p = await fetchPegawaiFromSheets();
      setPegawaiList(p);
      setLoading(false);
    };
    load();
  }, []);

  const handleASNSelect = (nip: string) => {
    const p = pegawaiList.find(x => x.nip === nip);
    if (p) {
        // FIX 2: Memanggil fungsi getOathTexts di sini
        const oathTexts = getOathTexts(p.agama);
        setFormData({ 
            ...formData, 
            asnNip: p.nip, 
            asnNama: p.nama, 
            asnPangkat: p.pangkat, 
            asnGolRuang: p.golRuang, 
            asnJabatan: p.jabatan,
            asnAgama: p.agama,
            kataPelantikan: oathTexts.pembuka, 
            penutupKataPelantikan: oathTexts.penutup
        });
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    
    // Set format PDF berdasarkan tipe dokumen
    // F4 Standard is 210mm x 330mm
    // Portrait: 210 (W) x 330 (H)
    // Landscape: 330 (W) x 210 (H)
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
    pdf.save(`${docType}_Pelantikan_${formData.asnNama.replace(/\s+/g, '_')}.pdf`);
  };

  const inputClass = "w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all";
  const labelClass = "text-[9px] font-black text-gray-400 uppercase ml-3 tracking-widest block mb-1.5";
  const readOnlyClass = "w-full px-5 py-3.5 bg-gray-100 border-2 border-gray-200 rounded-2xl text-[12px] font-black uppercase outline-none text-gray-600 cursor-not-allowed";

  return (
    <div className="space-y-8 animate-fadeIn pb-24 text-black">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/layanan')} className="h-12 w-12 bg-white border border-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:text-blue-600 shadow-sm transition-all">
             <i className="bi bi-arrow-left text-xl"></i>
          </button>
          <h3 className="text-2xl font-black text-gray-900 uppercase">BA Pelantikan & Pakta Integritas</h3>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setDocType('BA')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${docType === 'BA' ? 'bg-[#111827] text-white' : 'text-gray-400'}`}>Berita Acara</button>
           <button onClick={() => setDocType('PAKTA')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase ${docType === 'PAKTA' ? 'bg-[#111827] text-white' : 'text-gray-400'}`}>Pakta Integritas</button>
        </div>
      </div>

      {activeView === 'editor' ? (
        <div className="max-w-6xl mx-auto bg-white p-10 md:p-14 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-12 animate-modalEnter">
           <SearchableSelect label="Pilih Pegawai Yang Dilantik" options={pegawaiList.map(p=>({value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}`}))} value={formData.asnNip} onChange={handleASNSelect} />
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">1. Atribut Pelantikan</h5>
                 <div className="space-y-1"><label className={labelClass}>Nomor BA</label><input type="text" className={inputClass} value={formData.nomor} onChange={e=>setFormData({...formData, nomor: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Tanggal Lantik</label><input type="text" className={inputClass} value={formData.tanggal} onChange={e=>setFormData({...formData, tanggal: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Tempat</label><input type="text" className={inputClass} value={formData.tempat} onChange={e=>setFormData({...formData, tempat: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Nomor SK</label><input type="text" className={inputClass} value={formData.nomorSk} onChange={e=>setFormData({...formData, nomorSk: e.target.value})} /></div>
                 <div className="space-y-1"><label className={labelClass}>Tanggal SK</label><input type="text" className={inputClass} value={formData.tanggalSk} onChange={e=>setFormData({...formData, tanggalSk: e.target.value})} /></div>
              </div>

              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">2. Saksi & Pejabat</h5>
                 <SearchableSelect label="Pejabat Pengambil Sumpah" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.pjbNip} onChange={v=>{const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, pjbNip:v, pjbNama:p.nama, pjbJabatan:p.jabatan})}} />
                 
                 <div className="space-y-4 pt-4">
                    <h6 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Saksi 1</h6>
                    <SearchableSelect label="Pilih Saksi 1" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.saksi1Nip} onChange={v=>{const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, saksi1Nip:v, saksi1Nama:p.nama, saksi1Jabatan:p.jabatan})}} />
                 </div>

                 <div className="space-y-4 pt-4">
                    <h6 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Saksi 2</h6>
                    <SearchableSelect label="Pilih Saksi 2" options={pegawaiList.map(p=>({value: p.nip, label: p.nama}))} value={formData.saksi2Nip} onChange={v=>{const p=pegawaiList.find(x=>x.nip===v); if(p) setFormData({...formData, saksi2Nip:v, saksi2Nama:p.nama, saksi2Jabatan:p.jabatan})}} />
                 </div>
              </div>

              <div className="space-y-6">
                 <h5 className="text-[11px] font-black text-amber-600 uppercase border-b pb-2 tracking-widest">3. Narasi Sumpah (Otomatis)</h5>
                 <div className="space-y-1">
                    <label className={labelClass}>Agama Pegawai</label>
                    <input type="text" className={readOnlyClass} value={formData.asnAgama || '-'} readOnly />
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Kata Pembuka Sumpah</label>
                    <input type="text" className={readOnlyClass} value={formData.kataPelantikan} readOnly />
                 </div>
                 {formData.penutupKataPelantikan && (
                     <div className="space-y-1">
                        <label className={labelClass}>Kata Penutup</label>
                        <textarea className={`${readOnlyClass} min-h-[100px] normal-case`} readOnly value={formData.penutupKataPelantikan} />
                     </div>
                 )}
                 {!formData.penutupKataPelantikan && formData.asnAgama && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-[10px] text-gray-500 font-bold uppercase text-center">Tidak ada kata penutup untuk agama ini</p>
                    </div>
                 )}
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center">
              <button onClick={() => setActiveView('preview')} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Pratinjau Dokumen F4</button>
           </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-10">
           <div className="flex gap-4 no-print">
              <button onClick={() => setActiveView('editor')} className="px-10 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase text-[11px]">Kembali</button>
              <button onClick={handleDownloadPdf} className="px-12 py-4 bg-gray-950 text-white rounded-2xl font-black uppercase text-[11px] flex items-center gap-3 shadow-xl active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF (F4)</button>
           </div>
           <div className="bg-gray-300 py-10 rounded-[4rem] overflow-x-auto w-full flex justify-center no-scrollbar">
              {/* Dynamic Size based on Doc Type */}
              <div ref={pdfRef} className="bg-white shadow-2xl p-[1.5cm_2.2cm] font-arial text-black" style={{ 
                  width: docType === 'PAKTA' ? '330mm' : '210mm', 
                  minHeight: docType === 'PAKTA' ? '210mm' : '330mm' 
              }}>
                 
                 {docType === 'BA' ? (
                    <div className="text-black flex flex-col h-full justify-between">
                       {/* HEADER BA */}
                       <div className="flex flex-col items-center text-center mb-8">
                          <img src={LOGO_GARUDA_URL} className="h-24 w-auto mb-4" crossOrigin="anonymous" />
                          <h1 className="text-[14pt] font-bold uppercase leading-tight">BERITA ACARA</h1>
                          <h1 className="text-[14pt] font-bold uppercase leading-tight">PENGAMBILAN SUMPAH JABATAN PEGAWAI NEGERI SIPIL</h1>
                          <p className="text-[12pt] font-bold mt-2 uppercase">NOMOR : {formData.nomor}</p>
                       </div>

                       {/* BODY BA */}
                       <div className="text-[11.5pt] text-justify space-y-4 leading-[1.6]">
                          <p>
                             Pada hari <span className="font-bold">{formatTanggalLengkap(formData.tanggal)}</span>, bertempat di {formData.tempat}, saya, <span className="font-bold uppercase">{formData.pjbNama}</span> <span className="font-bold uppercase">{formData.pjbJabatan}</span> Kementerian Hukum Republik Indonesia, dengan disaksikan oleh 2 (dua) orang saksi masing-masing :
                          </p>
                          <ol className="list-decimal ml-8 space-y-1">
                             <li><span className="font-bold">{formData.saksi1Nama}</span>, {formData.saksi1Jabatan};</li>
                             <li><span className="font-bold">{formData.saksi2Nama}</span>, {formData.saksi2Jabatan}.</li>
                          </ol>
                          <p>
                             telah mengambil sumpah jabatan <span className="font-bold uppercase">{formData.asnJabatan}</span> atas nama <span className="font-bold uppercase">{formData.asnNama}</span>, yang berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor <span className="font-bold">{formData.nomorSk}</span> tanggal <span className="font-bold">{formData.tanggalSk}</span> diangkat sebagai <span className="font-bold uppercase">{formData.asnJabatan}</span>.
                          </p>
                          <p>
                             Pegawai Negeri Sipil yang mengangkat sumpah tersebut mengucapkan sumpah jabatan sebagai berikut:
                          </p>
                          
                          <div className="italic font-bold ml-4">
                             ”{formData.kataPelantikan}:
                          </div>
                          <div className="italic ml-8">
                             <p className="mb-0">bahwa saya, akan setia dan taat kepada Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 serta akan menjalankan segala peraturan perundang-undangan dengan selurus-lurusnya, demi dharma bakti saya kepada bangsa dan negara;</p>
                             <p className="mt-2 mb-0">bahwa saya dalam menjalankan tugas jabatan, akan menjunjung etika jabatan, bekerja dengan sebaik-baiknya, dan dengan penuh rasa tanggung jawab;</p>
                             <p className="mt-2 mb-0">bahwa saya, akan menjaga integritas, tidak menyalahgunakan kewenangan, serta menghindarkan diri dari perbuatan tercela.”</p>
                          </div>
                          
                          {/* Penutup hanya muncul jika ada isinya (Kristen/Katolik/Islam) */}
                          {formData.penutupKataPelantikan && (
                              <div className="italic font-bold ml-4">
                                 {formData.penutupKataPelantikan}
                              </div>
                          )}

                          <p>
                             Demikian berita acara pengambilan sumpah jabatan ini dibuat dengan sebenar-benarnya untuk dapat digunakan sebagaimana mestinya.
                          </p>
                       </div>

                       {/* SIGNATURES BA */}
                       <div className="mt-16 space-y-12">
                          <div className="grid grid-cols-2 gap-10 text-[11.5pt]">
                             <div className="text-center flex flex-col items-center">
                                <p className="mb-24 uppercase font-bold">Yang mengangkat sumpah,</p>
                                <p className="font-bold uppercase underline leading-none">{formData.asnNama}</p>
                                <p className="mt-1">NIP {formData.asnNip}</p>
                             </div>
                             <div className="text-center flex flex-col items-center">
                                <p className="uppercase font-bold leading-tight">Pejabat</p>
                                <p className="mb-24 uppercase font-bold leading-tight">Yang mengambil sumpah,</p>
                                <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                                <p className="mt-1">NIP {formData.pjbNip}</p>
                             </div>
                          </div>

                          <div className="flex flex-col items-center w-full">
                             <p className="font-bold uppercase mb-8">SAKSI-SAKSI,</p>
                             <div className="grid grid-cols-2 w-full gap-10 text-[11.5pt]">
                                <div className="text-center flex flex-col items-center">
                                   <p className="mb-24 uppercase font-bold"></p>
                                   <p className="font-bold uppercase font-bold">{formData.saksi1Nama}</p>
                                   <p className="mt-1">NIP {formData.saksi1Nip}</p>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                   <p className="mb-24 uppercase font-bold"></p>
                                   <p className="font-bold uppercase font-bold">{formData.saksi2Nama}</p>
                                   <p className="mt-1">NIP {formData.saksi2Nip}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="text-black flex flex-col h-full justify-between">
                       {/* HEADER PAKTA - LANDSCAPE LAYOUT */}
                       <div className="flex flex-col items-center text-center mb-8">
                          <img src="https://lh3.googleusercontent.com/d/167R3ZH6_bKeNbjZ-FituldKmzu3FOoAR" className="h-20" />
                          <p className="text-[12pt] font-bold uppercase leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
                          <h1 className="text-[18pt] font-black uppercase mt-4 tracking-widest">PAKTA INTEGRITAS</h1>
                       </div>

                       {/* BODY PAKTA */}
                       <div className="text-[12pt] space-y-4 leading-relaxed text-justify">
                          <p>Saya, <span className="font-bold uppercase">{formData.asnNama}</span>, <span className="font-bold uppercase">{formData.asnJabatan}</span>, menyatakan sebagai berikut :</p>
                          <ol className="space-y-3 ml-4 list-decimal">
                             <li>Berperan secara pro aktif dalam upaya pencegahan dan pemberantasan Korupsi, Kolusi dan Nepotisme serta tidak melibatkan diri dalam perbuatan tercela;</li>
                             <li>Tidak meminta atau menerima pemberian secara langsung atau tidak langsung berupa suap, hadiah, bantuan, atau bentuk lainnya yang tidak sesuai dengan ketentuan yang berlaku;</li>
                             <li>Bersikap transparan, jujur, objektif, dan akuntabel dalam melaksanakan tugas;</li>
                             <li>Menghindari pertentangan kepentingan (conflict of interest) dalam pelaksanaan tugas;</li>
                             <li>Memberi contoh dalam kepatuhan terhadap peraturan perundang-undangan dalam melaksanakan tugas dan sesama pegawai di lingkungan kerja saya secara konsisten;</li>
                             <li>Akan menyampaikan informasi penyimpangan integritas di Direktorat Jenderal Kekayaan Intelektual serta turut menjaga kerahasiaan saksi atas pelanggaran peraturan yang dilaporkannya;</li>
                             <li>Bila saya melanggar hal-hal tersebut di atas, saya siap menghadapi konsekuensinya;</li>
                          </ol>
                          
                          <div className="mt-12 space-y-16">
                             <div className="text-right">
                                Jakarta, <span className="font-bold">{formData.tanggal}</span>
                             </div>

                             <div className="grid grid-cols-2 gap-20 text-[11.5pt] px-10">
                                <div className="flex flex-col items-start text-left">
                                   <p className="font-bold">Menyaksikan:</p>
                                   <p className="font-bold uppercase leading-tight">{formData.pjbJabatan}</p>
                                   <p className="font-bold uppercase leading-tight mb-24">Kementerian Hukum Republik Indonesia,</p>
                                   <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                                   <p className="mt-1">NIP {formData.pjbNip}</p>
                                </div>
                                <div className="flex flex-col items-center text-right">
                                   <p className="mb-24 font-bold">Pembuat Pernyataan,</p>
                                   <p className="font-bold uppercase underline leading-none">{formData.asnNama}</p>
                                   <p className="mt-1">NIP {formData.asnNip}</p>
                                </div>
                             </div>
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

export default PelantikanGeneratorPage;