import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { fetchPegawaiFromSheets } from '../spreadsheetService'; // Asumsi path ini benar
import { Pegawai } from '../types'; // Asumsi path ini benar
import { useAuth } from '../AuthContext';
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
    tanggal: new Date().toISOString().split('T')[0],
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
        const oathTexts = getOathTexts(p.agama || '');
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
    
    // PAKTA uses Landscape (330x210), BA uses Portrait (210x330) - F4 Folio
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
                 <div className="space-y-1"><label className={labelClass}>Tanggal Lantik</label><input type="date" className={inputClass} value={formData.tanggal} onChange={e=>setFormData({...formData, tanggal: e.target.value})} /></div>
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
                 <h5 className="text-[11px] font-black text-amber-600 uppercase border-b pb-2 tracking-widest">3. Narasi Sumpah</h5>
                 <div className="space-y-1">
                    <label className={labelClass}>Agama Pegawai</label>
                    <input type="text" className={readOnlyClass} value={formData.asnAgama || '-'} readOnly />
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>Kata Pembuka</label>
                    <input type="text" className={readOnlyClass} value={formData.kataPelantikan} readOnly />
                 </div>
                 {formData.penutupKataPelantikan && (
                     <div className="space-y-1">
                        <label className={labelClass}>Kata Penutup</label>
                        <textarea className={`${readOnlyClass} min-h-[100px] normal-case`} readOnly value={formData.penutupKataPelantikan} />
                     </div>
                 )}
              </div>
           </div>

           <div className="pt-10 border-t flex justify-center">
              <button onClick={() => setActiveView('preview')} className="px-24 py-5 bg-[#111827] text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Pratinjau Dokumen F4</button>
           </div>
        </div>
      ) : (
        // --- PREVIEW SECTION ---
        <div className="flex flex-col items-center gap-6 no-print w-full">
           {/* 1. BUTTONS */}
           <div className="flex gap-4 z-10 bg-white/80 backdrop-blur p-2 rounded-xl shadow-sm">
              <button onClick={() => setActiveView('editor')} className="px-6 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl font-bold uppercase text-[10px] transition-all">Kembali ke Editor</button>
              <button onClick={handleDownloadPdf} className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold uppercase text-[10px] transition-all">Download PDF</button>
           </div>
           
           {/* 2. SCROLLABLE CONTAINER */}
           <div className="w-full bg-gray-200 py-12 px-4 overflow-x-auto border-y border-gray-300 flex justify-center">
              
              {/* 3. SCALING WRAPPER */}
              <div className="origin-top transform scale-[0.5] md:scale-[0.6] lg:scale-[0.8] xl:scale-[0.9] 2xl:scale-100 transition-transform duration-300">
                
                {/* 4. PAPER ELEMENT */}
                <div 
                    ref={pdfRef} 
  className={`
    bg-white shadow-2xl text-black font-arial box-border overflow-hidden
    ${docType === 'PAKTA' ? 'border-double border-[6px] border-black my-10 mx-auto' : ''}
  `}
  style={{ 
    width: docType === 'PAKTA' ? '330mm' : '210mm', 
    minHeight: docType === 'PAKTA' ? '210mm' : '330mm',
    /* Padding di sini adalah "margin internal" untuk memberi sisa kertas di dalam border */
    padding: docType === 'PAKTA' ? '20mm 25mm' : '25mm 30mm 30mm 35mm'
  }}
                     >
                 
                 {docType === 'BA' ? (
                    // --- TEMPLATE BERITA ACARA (PORTRAIT F4) ---
                    <div className="h-full flex flex-col justify-between text-[11.5pt] leading-relaxed">
                       {/* HEADER */}
                       <div className="flex flex-col items-center text-center mb-8">
                          <img src={LOGO_GARUDA_URL} style={{ width: '70px', height: 'auto' }} className="mb-4" crossOrigin="anonymous" />
                          <h1 className="font-bold uppercase tracking-wider text-[14pt]">BERITA ACARA</h1>
                          <h2 className="font-bold uppercase tracking-wider text-[12pt]">PENGAMBILAN SUMPAH JABATAN PEGAWAI NEGERI SIPIL</h2>
                          <p className="font-bold mt-2">NOMOR : {formData.nomor}</p>
                       </div>

                       {/* CONTENT */}
                       <div className="text-justify space-y-4">
                          <p>
                             Pada hari <span className="font-bold">{formatTanggalLengkap(formData.tanggal)}</span>, bertempat di {formData.tempat}, saya, <span className="font-bold uppercase">{formData.pjbNama}</span>, <span className="font-bold uppercase">{formData.pjbJabatan}</span> Kementerian Hukum Republik Indonesia, dengan disaksikan oleh 2 (dua) orang saksi masing-masing:
                          </p>
                          <div className="grid gap-x-8 ml-4">
                             <div>1. <span className="font-bold uppercase">{formData.saksi1Nama}</span>, {formData.saksi1Jabatan};</div>
                             <div>2. <span className="font-bold uppercase">{formData.saksi2Nama}</span>, {formData.saksi2Jabatan}.</div>
                          </div>
                          <p>
                             telah mengambil sumpah jabatan <span className="font-bold uppercase">{formData.asnJabatan}</span> atas nama <span className="font-bold uppercase">{formData.asnNama}</span>, yang berdasarkan Keputusan Menteri Hukum Republik Indonesia Nomor <span className="font-bold">{formData.nomorSk}</span> tanggal <span className="font-bold">{formData.tanggalSk}</span> diangkat sebagai <span className="font-bold uppercase">{formData.asnJabatan}</span>.
                          </p>
                          <p>Pegawai Negeri Sipil yang mengangkat sumpah tersebut mengucapkan sumpah jabatan sebagai berikut:</p>
                          
                          <div className="font-serif text-[12pt] pl-6">
                             <p>”{formData.kataPelantikan}:</p>
                             <p className="mb-2 pl-6">bahwa saya, akan setia dan taat kepada Undang-Undang Dasar Negara Republik Indonesia Tahun 1945 serta akan menjalankan segala peraturan perundang-undangan dengan selurus-lurusnya, demi dharma bakti saya kepada bangsa dan negara;</p>
                             <p className="mb-2 pl-6">bahwa saya dalam menjalankan tugas jabatan, akan menjunjung etika jabatan, bekerja dengan sebaik-baiknya, dan dengan penuh rasa tanggung jawab;</p>
                             <p className="pl-6">bahwa saya, akan menjaga integritas, tidak menyalahgunakan kewenangan, serta menghindarkan diri dari perbuatan tercela.”</p>
                          </div>
                          
                          {formData.penutupKataPelantikan && (
                              <p className="italic font-bold pl-6">{formData.penutupKataPelantikan}</p>
                          )}

                          <p>Demikian berita acara pengambilan sumpah jabatan ini dibuat dengan sebenar-benarnya untuk dapat digunakan sebagaimana mestinya.</p>
                       </div>

                       {/* SIGNATURES */}
                       <div className="mt-16 space-y-12">
                          <div className="grid grid-cols-2 gap-10 text-center">
                             <div className="flex flex-col items-center">
                                <p className="font-bold uppercase mb-24">Pejabat yang Mengambil Sumpah,</p>
                                <p className="font-bold uppercase underline leading-none">{formData.pjbNama}</p>
                                <p className="mt-1">NIP {formData.pjbNip}</p>
                             </div>
                             <div className="flex flex-col items-center">
                                <p className="font-bold uppercase mb-24">Yang Mengucapkan Sumpah,</p>
                                <p className="font-bold uppercase underline leading-none">{formData.asnNama}</p>
                                <p className="mt-1">NIP {formData.asnNip}</p>
                             </div>
                          </div>

                          <div className="border-t border-dashed border-gray-300 pt-8">
                             <p className="text-center font-bold uppercase mb-8">Saksi-Saksi,</p>
                             <div className="grid grid-cols-2 gap-10 text-center">
                                <div className="flex flex-col items-center">
                                   <p className="mb-24"></p>
                                   <p className="font-bold uppercase font-bold">{formData.saksi1Nama}</p>
                                   <p className="mt-1">NIP {formData.saksi1Nip}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                   <p className="mb-24"></p>
                                   <p className="font-bold uppercase font-bold">{formData.saksi2Nama}</p>
                                   <p className="mt-1">NIP {formData.saksi2Nip}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 ) : (
                    // --- TEMPLATE PAKTA INTEGRITAS (LANDSCAPE F4) ---
                    <div className="h-full flex flex-col text-[11pt] leading-relaxed font-arial">
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
                    <p>Saya, <span className="font-bold uppercase">{formData.asnNama || '...'}</span>, sebagai <span className="font-bold uppercase">{formData.asnJabatan || '...'}</span>, menyatakan sebagai berikut :</p>
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
                      <p className="mb-1">Jakarta, {new Date(formData.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>

                  {/* TANDA TANGAN */}
                <div className="mt-auto grid grid-cols-2 pt-10 items-end"> 
  {/* Kolom 1 (Kiri) */}
  <div className="text-center flex flex-col h-full justify-between">
    <div>
      <p className="font-bold uppercase mb-1">Menyaksikan,</p>
      <p className="font-bold uppercase leading-tight">{formData.pjbJabatan}</p>
    </div>
    
    {/* Box Nama & NIP (Dipaksa sejajar bawah) */}
    <div className="mt-12"> 
      <p className="font-bold uppercase underline decoration-2">{formData.pjbNama}</p>
      <p className="mt-1 text-sm">NIP {formData.pjbNip}</p>
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
      <p className="font-bold uppercase underline decoration-2">{formData.asnNama || '...'}</p>
      <p className="mt-1 text-sm">NIP {formData.asnNip}</p>
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