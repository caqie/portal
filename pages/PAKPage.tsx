import React, { useState, useEffect, useRef } from 'react';
import { fetchPegawaiFromSheets } from '../spreadsheetService';
import { Pegawai, PAKRecord } from '../types';
import { useAuth } from '../AuthContext';
import { AK_KOEFISIEN, PREDIKAT_MULTIPLIER } from '../constants';
import SuccessModal from '../components/SuccessModal';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

// URL Logo Pengayoman Pohon Beringin Resmi (High Resolution)
const LOGO_PENGAYOMAN_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Logo_Kemenkumham_RI.svg/1024px-Logo_Kemenkumham_RI.svg.png";

const PAKPage = () => {
  const { user, canEdit, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [pakList, setPakList] = useState<PAKRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'table' | 'create' | 'preview'>('table');
  const [selectedPAK, setSelectedPAK] = useState<PAKRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nip: '',
    nomor: 'W.1-KI.03.04-1234',
    nomorKarpeg: '-',
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tempatDibuat: 'Jakarta',
    periodeMulai: '01 Januari 2024',
    periodeSelesai: '31 Desember 2024',
    predikat: 'Baik',
    akDasar: 0,
    akJFLama: 0,
    akPenyetaraan: 0,
    akKonversi: 0,
    akPendidikan: 0,
    rekomendasi: 'Dapat dipertimbangkan untuk kenaikan pangkat setingkat lebih tinggi.',
    penilaiNip: '',
    historyRows: [
      { tahun: '2023', period: '12', predikat: 'Baik', prosentase: 100, koefisien: 12.5, ak: 12.5 }
    ]
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      const saved = localStorage.getItem('pak_pro_db');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPakList(isViewer ? parsed.filter((s: any) => s.nip === user?.nip) : parsed);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleCalculate = () => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai terlebih dahulu");

    const jabUpper = (peg.jabatan || '').toUpperCase();
    let koefisienKey = 'AHLI PERTAMA';
    
    if (jabUpper.includes('UTAMA')) koefisienKey = 'AHLI UTAMA';
    else if (jabUpper.includes('MADYA')) koefisienKey = 'AHLI MADYA';
    else if (jabUpper.includes('MUDA')) koefisienKey = 'AHLI MUDA';
    else if (jabUpper.includes('PERTAMA')) koefisienKey = 'AHLI PERTAMA';
    else if (jabUpper.includes('PENYELIA')) koefisienKey = 'PENYELIA';
    else if (jabUpper.includes('MAHIR')) koefisienKey = 'MAHIR';
    else if (jabUpper.includes('TERAMPIL')) koefisienKey = 'TERAMPIL';
    else if (jabUpper.includes('PEMULA')) koefisienKey = 'PEMULA';
                      
    const koef = AK_KOEFISIEN[koefisienKey] || 12.5;
    const mult = PREDIKAT_MULTIPLIER[formData.predikat] || 1.0;
    const akBaru = koef * mult;

    setFormData({
      ...formData,
      koefisien: koef,
      prosentase: mult * 100,
      akBaru: akBaru,
      akKonversi: akBaru,
      historyRows: [
        { 
          tahun: new Date(formData.periodeSelesai).getFullYear().toString() || '2024', 
          period: '12', 
          predikat: formData.predikat, 
          prosentase: mult * 100, 
          koefisien: koef, 
          ak: akBaru 
        }
      ]
    });
  };

  const handleSave = () => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai");

    const totalAK = Number(formData.akDasar) + Number(formData.akJFLama) + Number(formData.akPenyetaraan) + Number(formData.akKonversi) + Number(formData.akPendidikan);

    const newRecord: PAKRecord = {
      id: Date.now().toString(),
      nip: peg.nip,
      namaPegawai: peg.nama,
      periode: `${formData.periodeMulai} s.d ${formData.periodeSelesai}`,
      jumlahKredit: totalAK,
      keterangan: formData.rekomendasi,
      status: 'Selesai',
      ...formData,
      akBaru: formData.akKonversi || 0,
      pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip)
    };

    const updatedList = [newRecord, ...pakList];
    setPakList(updatedList);
    localStorage.setItem('pak_pro_db', JSON.stringify(updatedList));
    logActivity('CREATE', 'PAK', `Generate PAK Terintegrasi: ${peg.nama}`);
    setActiveView('table');
    setShowSuccess(true);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    const pageHeight = 295;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`PAK_3_Halaman_${selectedPAK?.namaPegawai.replace(/\s+/g, '_')}.pdf`);
  };

  const KopSurat = () => (
    <div className="flex flex-col mb-8">
      <div className="flex items-center pb-3">
        <div className="w-24 h-24 mr-6 flex flex-col items-center flex-shrink-0">
          <img 
            src={LOGO_PENGAYOMAN_URL} 
            className="w-full h-full object-contain" 
            alt="Pengayoman" 
          />
        </div>
        <div className="flex-1 text-center">
          <p className="text-[13pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[13pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[9pt] mt-1 italic">Jalan H.R. Rasuna Said kav.8-9 Kuningan, Jakarta Selatan</p>
          <p className="text-[9pt]">Call Center: 152 | Laman: www.dgip.go.id | Pos-el: halodjki@dgip.go.id</p>
        </div>
      </div>
      <div className="border-b-[2pt] border-black w-full"></div>
      <div className="border-b-[0.5pt] border-black w-full mt-[1.5pt]"></div>
    </div>
  );

  const KeteranganPerorangan = ({ p, pNo }: { p?: Pegawai, pNo?: string }) => (
    <div className="mb-6">
      <div className="bg-gray-100 p-1 font-bold border border-black text-[9pt] uppercase px-4">KETERANGAN PERORANGAN</div>
      <table className="w-full border-collapse border border-black text-[9pt]">
        <tbody>
          {[
            ['1', 'Nama', p?.nama],
            ['2', 'NIP', p?.nip],
            ['3', 'Nomor Seri Karpeg', pNo],
            ['4', 'Tempat, tanggal lahir', `${p?.tempatLahir || '-'}, ${p?.tanggalLahir || '-'}`],
            ['5', 'Jenis Kelamin', p?.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
            ['6', 'Pangkat / Golongan ruang / TMT', `${p?.pangkat || '-'} / ${p?.golRuang || '-'} / ${p?.tmtPangkat || '-'}`],
            ['7', 'Jabatan / TMT', `${p?.jabatan || '-'} / ${p?.tmtJabatan || '-'}`],
            ['8', 'Unit Kerja', p?.unitKerja]
          ].map(([no, label, val]) => (
            <tr key={no}>
              <td className="border border-black p-1.5 w-10 text-center">{no}</td>
              <td className="border border-black p-1.5 w-64">{label}</td>
              <td className="border border-black p-1.5">: {val || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const Tembusan = () => (
    <div className="mt-10 text-[8pt] space-y-1">
      <p className="font-bold underline">Tembusan disampaikan kepada:</p>
      <p>1. Sekretaris Jenderal Kementerian Hukum;</p>
      <p>2. Direktur Jenderal Kekayaan Intelektual;</p>
      <p>3. Kepala Biro Kepegawaian;</p>
      <p>4. Sekretaris Direktorat Jenderal Kekayaan Intelektual</p>
    </div>
  );

  const FooterDokumen = ({ date, place, penilai, label = 'Pejabat Penilai Kinerja' }: any) => (
    <div className="mt-12">
      <div className="ml-[55%] text-[10pt] space-y-20">
        <div>
          <p>Ditetapkan di {place || 'Jakarta'}</p>
          <p>Pada Tanggal {date}</p>
          <p className="mt-4 font-bold">{label},</p>
        </div>
        <div>
          <p className="font-bold underline uppercase">{penilai?.nama || 'NAMA PEJABAT'}</p>
          <p>NIP {penilai?.nip || '1234567890'}</p>
        </div>
      </div>
      <Tembusan />
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="PAK Berhasil Terbit" message="Dokumen PAK 3 halaman telah disimpan di sistem." />
      
      {activeView === 'table' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Engine PAK 3 Halaman</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Standar BKN • Konversi Predikat Kinerja • Versi 2023</p>
            </div>
            {canEdit && (
              <button onClick={() => setActiveView('create')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all">
                + Penetapan PAK Baru
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-400 border-b tracking-widest">
                <tr><th className="px-8 py-5">Pegawai</th><th className="px-4 py-5">Masa Penilaian</th><th className="px-4 py-5 text-center">Total AK</th><th className="px-8 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pakList.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/5 group transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-black text-gray-900 uppercase">{p.namaPegawai}</p>
                      <p className="text-[9px] font-mono text-blue-600 font-bold">{p.nip}</p>
                    </td>
                    <td className="px-4 py-5 font-bold text-[10px] text-gray-500">{p.periode}</td>
                    <td className="px-4 py-5 text-center">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg">{p.jumlahKredit.toFixed(3)}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedPAK(p); setActiveView('preview'); }} className="h-10 px-4 rounded-xl bg-gray-900 text-white flex items-center gap-2 text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"><i className="bi bi-file-earmark-pdf"></i> Preview</button>
                        {canEdit && <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 flex items-center justify-center border border-gray-100" onClick={() => setPakList(pakList.filter(x=>x.id!==p.id))}><i className="bi bi-trash-fill"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {pakList.length === 0 && <tr><td colSpan={4} className="py-24 text-center text-gray-300 font-black uppercase text-[11px]">Database PAK Kosong</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'create' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-modalEnter">
           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b pb-6">
                <h4 className="text-xl font-black text-gray-900 uppercase">Konfigurasi PAK Terintegrasi</h4>
                <button onClick={() => setActiveView('table')} className="text-rose-500 font-black text-[10px] uppercase">Batal</button>
              </div>

              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">I. Data Administrasi</h5>
                    <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nip} onChange={e => setFormData({...formData, nip: e.target.value})}>
                        <option value="">Pilih Pegawai</option>{pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                    </select>
                    <input type="text" placeholder="Nomor Dokumen PAK" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nomor} onChange={e => setFormData({...formData, nomor: e.target.value})} />
                    <input type="text" placeholder="Nomor Karpeg" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.nomorKarpeg} onChange={e => setFormData({...formData, nomorKarpeg: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Awal Periode</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.periodeMulai} onChange={e => setFormData({...formData, periodeMulai: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase">Akhir Periode</label><input type="text" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.periodeSelesai} onChange={e => setFormData({...formData, periodeSelesai: e.target.value})} /></div>
                    </div>
                    <select className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-700" value={formData.predikat} onChange={e => setFormData({...formData, predikat: e.target.value})}>
                        {Object.keys(PREDIKAT_MULTIPLIER).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                    </select>
                    <button onClick={handleCalculate} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20">Hitung Angka Kredit Konversi</button>
                 </div>

                 <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">II. Rincian Angka Kredit</h5>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">AK Dasar</label><input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-[11px] font-bold" value={formData.akDasar} onChange={e => setFormData({...formData, akDasar: parseFloat(e.target.value) || 0})} /></div>
                       <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">AK JF Lama</label><input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-[11px] font-bold" value={formData.akJFLama} onChange={e => setFormData({...formData, akJFLama: parseFloat(e.target.value) || 0})} /></div>
                       <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">AK Penyetaraan</label><input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-[11px] font-bold" value={formData.akPenyetaraan} onChange={e => setFormData({...formData, akPenyetaraan: parseFloat(e.target.value) || 0})} /></div>
                       <div className="space-y-1"><label className="text-[7px] font-black text-gray-400 uppercase">AK Pendidikan</label><input type="number" className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-[11px] font-bold" value={formData.akPendidikan} onChange={e => setFormData({...formData, akPendidikan: parseFloat(e.target.value) || 0})} /></div>
                    </div>
                    {formData.akBaru && (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                        <span className="text-[9px] font-black text-emerald-800 uppercase">AK Konversi Hasil Hitung</span>
                        <span className="text-xl font-black text-emerald-600">{formData.akBaru.toFixed(3)}</span>
                      </div>
                    )}
                    <div className="space-y-1 pt-2"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-2">Pejabat Penandatangan</label>
                      <select className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold" value={formData.penilaiNip} onChange={e => setFormData({...formData, penilaiNip: e.target.value})}>
                        <option value="">Pilih Pejabat</option>{pegawaiList.map(p => <option key={p.id} value={p.nip}>{p.nama}</option>)}
                      </select>
                    </div>
                    <textarea placeholder="Rekomendasi" className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-xs font-bold h-24 resize-none" value={formData.rekomendasi} onChange={e => setFormData({...formData, rekomendasi: e.target.value})} />
                 </div>
              </div>

              <div className="pt-8 border-t flex justify-center">
                 <button onClick={handleSave} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all">Simpan & Terbitkan PAK 3 Halaman</button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedPAK && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-between items-center no-print sticky top-24 z-50 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white/20">
              <button onClick={() => setActiveView('table')} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2"><i className="bi bi-arrow-left"></i> Kembali</button>
              <button onClick={handleDownloadPdf} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl active:scale-95 flex items-center gap-2"><i className="bi bi-file-earmark-pdf-fill"></i> Download PDF 3 Halaman</button>
           </div>

           <div ref={pdfRef} className="bg-white mx-auto text-black font-serif print-document overflow-hidden shadow-2xl">
              
              {/* PAGE 1: KONVERSI PREDIKAT KINERJA */}
              <div className="page-break relative">
                 <KopSurat />
                 <h2 className="text-[12pt] font-bold text-center mb-1">KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT</h2>
                 <p className="text-[11pt] font-bold text-center mb-8 uppercase">NOMOR : {selectedPAK.nomor}</p>
                 
                 <div className="flex justify-between text-[10pt] mb-4 px-2">
                   <p><span className="font-bold">Instansi:</span> Kementerian Hukum RI</p>
                   <p><span className="font-bold">Periode:</span> {selectedPAK.periode}</p>
                 </div>

                 <KeteranganPerorangan p={pegawaiList.find(p=>p.nip===selectedPAK.nip)} pNo={selectedPAK.nomorKarpeg} />

                 <div className="mb-6">
                    <div className="bg-gray-100 p-2 font-bold border border-black text-[10pt] uppercase text-center mb-[-1px]">KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT</div>
                    <table className="w-full border-collapse border border-black text-[10pt] text-center">
                       <thead className="bg-gray-50">
                          <tr>
                             <th className="border border-black p-3" colSpan={2}>Hasil Penilaian Kinerja</th>
                             <th className="border border-black p-3" rowSpan={2}>Koefisien Pertahun</th>
                             <th className="border border-black p-3" rowSpan={2}>Angka Kredit yang Didapat</th>
                          </tr>
                          <tr>
                             <th className="border border-black p-3 w-1/3">PREDIKAT</th>
                             <th className="border border-black p-3">PROSENTASE</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr><td className="border border-black p-1 text-[8pt] italic font-bold">1</td><td className="border border-black p-1 text-[8pt] italic font-bold">2</td><td className="border border-black p-1 text-[8pt] italic font-bold">3</td><td className="border border-black p-1 text-[8pt] italic font-bold">4</td></tr>
                          <tr className="h-24">
                             <td className="border border-black p-3 font-bold uppercase">{selectedPAK.predikat}</td>
                             <td className="border border-black p-3">{selectedPAK.prosentase}%</td>
                             <td className="border border-black p-3 font-mono">{selectedPAK.koefisien}</td>
                             <td className="border border-black p-3 font-black text-xl">{selectedPAK.akBaru.toFixed(3)}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <FooterDokumen date={selectedPAK.tglDibuat} place={selectedPAK.tempatDibuat} penilai={selectedPAK.pejabatPenilai} />
              </div>

              {/* PAGE 2: AKUMULASI ANGKA KREDIT */}
              <div className="page-break relative">
                 <KopSurat />
                 <h2 className="text-[12pt] font-bold text-center mb-1">AKUMULASI ANGKA KREDIT</h2>
                 <p className="text-[11pt] font-bold text-center mb-8 uppercase">NOMOR : {selectedPAK.nomor}</p>
                 
                 <div className="flex justify-between text-[10pt] mb-4 px-2">
                   <p><span className="font-bold">Instansi:</span> Kementerian Hukum RI</p>
                   <p><span className="font-bold">Masa Penilaian:</span> {selectedPAK.periode}</p>
                 </div>

                 <KeteranganPerorangan p={pegawaiList.find(p=>p.nip===selectedPAK.nip)} pNo={selectedPAK.nomorKarpeg} />

                 <div className="mb-6">
                    <div className="bg-gray-100 p-2 font-bold border border-black text-[10pt] uppercase text-center mb-[-1px]">HASIL PENILAIAN ANGKA KREDIT</div>
                    <table className="w-full border-collapse border border-black text-[9pt] text-center">
                       <thead className="bg-gray-50">
                          <tr>
                             <th className="border border-black p-2" rowSpan={2}>TAHUN</th>
                             <th className="border border-black p-2" rowSpan={2}>PERIODIK (BULAN)</th>
                             <th className="border border-black p-2" colSpan={2}>Hasil Penilaian Kinerja</th>
                             <th className="border border-black p-2" rowSpan={2}>Koefisien Pertahun</th>
                             <th className="border border-black p-2" rowSpan={2}>Angka Kredit yang Didapat</th>
                          </tr>
                          <tr>
                             <th className="border border-black p-2">PREDIKAT</th>
                             <th className="border border-black p-2">PROSENTASE</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr><td className="border border-black p-1 text-[7pt]">1</td><td className="border border-black p-1 text-[7pt]">2</td><td className="border border-black p-1 text-[7pt]">3</td><td className="border border-black p-1 text-[7pt]">4</td><td className="border border-black p-1 text-[7pt]">5</td><td className="border border-black p-1 text-[7pt]">6</td></tr>
                          {(selectedPAK.historyRows || []).map((row, i) => (
                             <tr key={i} className="h-10">
                                <td className="border border-black p-2">{row.tahun}</td>
                                <td className="border border-black p-2">{row.period}</td>
                                <td className="border border-black p-2 font-bold uppercase">{row.predikat}</td>
                                <td className="border border-black p-2">{row.prosentase}%</td>
                                <td className="border border-black p-2 font-mono">{row.koefisien}</td>
                                <td className="border border-black p-2 font-bold">{row.ak.toFixed(3)}</td>
                             </tr>
                          ))}
                          <tr className="h-10 bg-gray-100 font-black">
                             <td className="border border-black p-2 uppercase" colSpan={5}>JUMLAH ANGKA KREDIT YANG DIPEROLEH</td>
                             <td className="border border-black p-2">{selectedPAK.akKonversi.toFixed(3)}</td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <FooterDokumen date={selectedPAK.tglDibuat} place={selectedPAK.tempatDibuat} penilai={selectedPAK.pejabatPenilai} />
              </div>

              {/* PAGE 3: PENETAPAN ANGKA KREDIT */}
              <div className="page-break relative">
                 <KopSurat />
                 <h2 className="text-[12pt] font-bold text-center mb-1 uppercase">PENETAPAN ANGKA KREDIT</h2>
                 <p className="text-[11pt] font-bold text-center mb-8 uppercase">NOMOR : {selectedPAK.nomor}</p>
                 
                 <div className="flex justify-between text-[10pt] mb-4 px-2">
                   <p><span className="font-bold">Instansi:</span> Kementerian Hukum RI</p>
                   <p><span className="font-bold">Masa Penilaian:</span> {selectedPAK.periode}</p>
                 </div>

                 <KeteranganPerorangan p={pegawaiList.find(p=>p.nip===selectedPAK.nip)} pNo={selectedPAK.nomorKarpeg} />

                 <div className="mb-6">
                    <div className="bg-gray-100 p-2 font-bold border border-black text-[10pt] uppercase text-center mb-[-1px]">HASIL PENILAIAN ANGKA KREDIT</div>
                    <table className="w-full border-collapse border border-black text-[9pt]">
                       <thead className="bg-gray-50 text-center">
                          <tr>
                             <th className="border border-black p-2 w-12">II</th>
                             <th className="border border-black p-2">PENETAPAN ANGKA KREDIT</th>
                             <th className="border border-black p-2 w-24">LAMA</th>
                             <th className="border border-black p-2 w-24">BARU</th>
                             <th className="border border-black p-2 w-28">JUMLAH</th>
                             <th className="border border-black p-2">KETERANGAN</th>
                          </tr>
                       </thead>
                       <tbody>
                          <tr><td className="border border-black p-1 text-[7pt] text-center">1</td><td className="border border-black p-1 text-[7pt] text-center">2</td><td className="border border-black p-1 text-[7pt] text-center">3</td><td className="border border-black p-1 text-[7pt] text-center">4</td><td className="border border-black p-1 text-[7pt] text-center">5</td><td className="border border-black p-1 text-[7pt] text-center">6</td></tr>
                          <tr><td className="border border-black p-2 text-center"></td><td className="border border-black p-2">1. AK Dasar yang diberikan</td><td className="border border-black p-2 text-center">0</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akDasar.toFixed(3)}</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akDasar.toFixed(3)}</td><td className="border border-black p-2"></td></tr>
                          <tr><td className="border border-black p-2 text-center"></td><td className="border border-black p-2">2. AK JF Lama</td><td className="border border-black p-2 text-center">0</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akJFLama.toFixed(3)}</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akJFLama.toFixed(3)}</td><td className="border border-black p-2"></td></tr>
                          <tr><td className="border border-black p-2 text-center"></td><td className="border border-black p-2">3. AK Penyesuaian/Penyetaraan</td><td className="border border-black p-2 text-center">0</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akPenyetaraan.toFixed(3)}</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akPenyetaraan.toFixed(3)}</td><td className="border border-black p-2"></td></tr>
                          <tr><td className="border border-black p-2 text-center"></td><td className="border border-black p-2">4. AK Konversi</td><td className="border border-black p-2 text-center">0</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akKonversi.toFixed(3)}</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akKonversi.toFixed(3)}</td><td className="border border-black p-2"></td></tr>
                          <tr><td className="border border-black p-2 text-center"></td><td className="border border-black p-2">5. AK Peningkatan Pendidikan</td><td className="border border-black p-2 text-center">0</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akPendidikan.toFixed(3)}</td><td className="border border-black p-2 text-center font-mono">{selectedPAK.akPendidikan.toFixed(3)}</td><td className="border border-black p-2"></td></tr>
                          <tr className="bg-gray-100 font-black">
                             <td className="border border-black p-2 text-center" colSpan={4}>JUMLAH ANGKA KREDIT KUMULATIF</td>
                             <td className="border border-black p-2 text-center font-mono text-[11pt]">{selectedPAK.jumlahKredit.toFixed(3)}</td>
                             <td className="border border-black p-2"></td>
                          </tr>
                       </tbody>
                    </table>
                 </div>

                 <div className="mb-6">
                    <div className="bg-gray-100 p-2 font-bold border border-black text-[10pt] uppercase mb-[-1px] px-4">(REKOMENDASI)</div>
                    <div className="border border-black p-4 text-[10pt] italic text-justify min-h-[100px] leading-relaxed">
                      {selectedPAK.rekomendasi}
                    </div>
                 </div>

                 <FooterDokumen date={selectedPAK.tglDibuat} place={selectedPAK.tempatDibuat} penilai={selectedPAK.pejabatPenilai} />
              </div>

           </div>
        </div>
      )}

      <style>{`
        @media print {
           .no-print { display: none !important; }
           body { background: white !important; margin: 0; padding: 0; }
           .print-document { box-shadow: none !important; border: none !important; width: 100% !important; margin: 0 !important; }
           .page-break { 
              page-break-after: always; 
              padding: 2cm !important;
              min-height: 29.7cm;
              display: flex;
              flex-direction: column;
              border-bottom: none !important;
           }
           @page { size: A4; margin: 0; }
        }
        .print-document {
           width: 21cm;
           background: white;
           font-family: 'Times New Roman', Times, serif;
        }
        .page-break {
           padding: 2cm;
           min-height: 29.7cm;
           display: flex;
           flex-direction: column;
           border-bottom: 1px dashed #eee;
        }
      `}</style>
    </div>
  );
};

export default PAKPage;
