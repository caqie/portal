
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchPegawaiFromSheets, fetchPAKFromSheets } from '../spreadsheetService';
import { Pegawai, PAKRecord } from '../types';
import { useAuth } from '../AuthContext';
import { AK_KOEFISIEN, PREDIKAT_MULTIPLIER, DEFAULT_LOGO } from '../constants';
import SuccessModal from '../components/SuccessModal';
import SearchableSelect from '../components/SearchableSelect';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { jsPDF } from 'jspdf';

const PAKPage = () => {
  const { user, canEdit, logActivity } = useAuth();
  const isViewer = user?.role === 'Viewer';
  
  const [pakList, setPakList] = useState<PAKRecord[]>([]);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'table' | 'create' | 'preview'>('table');
  const [selectedPAK, setSelectedPAK] = useState<PAKRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customLogo, setCustomLogo] = useState<string>(DEFAULT_LOGO);
  const pdfRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<any>({
    nip: '',
    nomor: '',
    nomorKarpeg: '-',
    tglDibuat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    tempatDibuat: 'Jakarta',
    periodeMulai: '01 Januari 2024',
    periodeSelesai: '31 Desember 2024',
    jumlahBulan: 12,
    predikat: 'Baik',
    hasBonusIjazah: false,
    akDasar: 0,
    akJFLama: 0,
    akPenyetaraan: 0,
    akKonversi: 0,
    akPendidikan: 0,
    rekomendasi: 'DAPAT DIPERTIMBANGKAN UNTUK KENAIKAN PANGKAT/JENJANG SETINGKAT LEBIH TINGGI',
    penilaiNip: '',
    historyRows: []
  });

  useEffect(() => { 
    loadInitialData();
    const savedLogo = localStorage.getItem('portal_system_logo');
    if (savedLogo) setCustomLogo(savedLogo);
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const pegawais = await fetchPegawaiFromSheets();
      setPegawaiList(pegawais);
      const sheetPAK = await fetchPAKFromSheets();
      const savedLocal = localStorage.getItem('pak_pro_db_v4');
      const localPAK = savedLocal ? JSON.parse(savedLocal) : [];
      const combined = [...localPAK, ...sheetPAK.map(s => ({ ...s, id: `sheet-${s.id}` }))];
      setPakList(isViewer ? combined.filter((s: any) => s.nip === user?.nip) : combined);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const searchablePegawaiOptions = useMemo(() => 
    pegawaiList
      .filter(p => p.jenisPegawai === 'PNS' && (p.klasifikasiJabatan?.toUpperCase().includes('FUNGSIONAL') || p.jabatan?.toUpperCase().includes('AHLI') || p.jabatan?.toUpperCase().includes('TERAMPIL')))
      .map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }))
  , [pegawaiList]);

  const searchablePenandatanganOptions = useMemo(() => 
    pegawaiList
      .filter(p => {
        const klas = (p.klasifikasiJabatan || '').toUpperCase();
        return klas.includes('PIMPINAN TINGGI') || klas.includes('ADMINISTRASI') || p.jabatan?.toUpperCase().includes('SEKRETARIS') || p.jabatan?.toUpperCase().includes('DIREKTUR');
      })
      .map(p => ({ value: p.nip, label: p.nama, subLabel: `NIP. ${p.nip} - ${p.jabatan}` }))
  , [pegawaiList]);

  const handleCalculate = () => {
    const peg = pegawaiList.find(p => p.nip === formData.nip);
    if (!peg) return alert("Pilih Pegawai terlebih dahulu");

    const jabUpper = (peg.jabatan || '').toUpperCase();
    let koefisienKey = 'AHLI PERTAMA';
    if (jabUpper.includes('UTAMA')) koefisienKey = 'AHLI UTAMA';
    else if (jabUpper.includes('MADYA')) koefisienKey = 'AHLI MADYA';
    else if (jabUpper.includes('MUDA')) koefisienKey = 'AHLI MUDA';
    else if (jabUpper.includes('PENYELIA')) koefisienKey = 'PENYELIA';
    else if (jabUpper.includes('MAHIR')) koefisienKey = 'MAHIR';
    else if (jabUpper.includes('TERAMPIL')) koefisienKey = 'TERAMPIL';
    else if (jabUpper.includes('PEMULA')) koefisienKey = 'PEMULA';
                      
    const koef = AK_KOEFISIEN[koefisienKey] || 12.5;
    const mult = PREDIKAT_MULTIPLIER[formData.predikat] || 1.0;
    
    const factorPeriodik = formData.jumlahBulan / 12;
    const akHasilKonversi = factorPeriodik * mult * koef;

    let bonusAK = 0;
    if (formData.hasBonusIjazah && (formData.predikat === 'Baik' || formData.predikat === 'Sangat Baik')) {
        bonusAK = 0.25 * koef;
    }

    setFormData({
      ...formData,
      koefisien: koef,
      prosentase: mult * 100,
      akKonversi: akHasilKonversi,
      akPendidikan: bonusAK,
      akBaru: akHasilKonversi + bonusAK,
      historyRows: [
        { tahun: new Date().getFullYear().toString(), period: formData.jumlahBulan, predikat: formData.predikat, prosentase: mult * 100, koefisien: koef, ak: akHasilKonversi }
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
      pejabatPenilai: pegawaiList.find(p => p.nip === formData.penilaiNip)
    };
    const updatedList = [newRecord, ...pakList];
    setPakList(updatedList);
    localStorage.setItem('pak_pro_db_v4', JSON.stringify(updatedList.filter(p => !p.id.startsWith('sheet'))));
    logActivity('CREATE', 'PAK', `Terbitkan PAK PNS: ${peg.nama}`);
    setActiveView('table');
    setShowSuccess(true);
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    const canvasElements = pdfRef.current.querySelectorAll('.page-template');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [210, 330] });

    for (let i = 0; i < canvasElements.length; i++) {
      const canvas = await html2canvas(canvasElements[i] as HTMLElement, { 
        scale: 2.5, 
        useCORS: true,
        logging: false,
        allowTaint: true
      });
      const imgData = canvas.toDataURL('image/png');
      if (i > 0) pdf.addPage([210, 330], 'portrait');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 330);
    }
    pdf.save(`DOKUMEN_PAK_F4_${selectedPAK?.namaPegawai.replace(/\s+/g, '_')}.pdf`);
  };

  const TemplateHeader = () => (
    <div className="flex flex-col mb-6 border-b-2 border-black pb-2 text-black">
      <div className="flex items-center">
        <img 
          src={customLogo} 
          className="h-16 w-auto mr-4 object-contain" 
          alt="Logo Instansi" 
          crossOrigin="anonymous"
        />
        <div className="flex-1 text-center font-serif">
          <p className="text-[12pt] font-bold leading-tight">KEMENTERIAN HUKUM REPUBLIK INDONESIA</p>
          <p className="text-[12pt] font-bold uppercase leading-tight">DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL</p>
          <p className="text-[8pt] italic leading-tight">Jalan H.R. Rasuna Said Kav. 8-9 Kuningan, Jakarta Selatan 12940</p>
          <p className="text-[8pt] leading-tight">Call Center: 152 | Laman: www.dgip.go.id, Pos-el: halodjki@dgip.go.id</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} title="PAK Berhasil Terbit" />
      
      {activeView === 'table' && (
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase">PAK PNS Fungsional (F4)</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Konversi & Penetapan Angka Kredit • Template Resmi F4</p>
            </div>
            {canEdit && (
              <button onClick={() => setActiveView('create')} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                + Penetapan PAK Terintegrasi
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[8px] font-black uppercase text-gray-500 border-b tracking-widest">
                <tr><th className="px-8 py-5">PNS Fungsional</th><th className="px-4 py-5">Periode</th><th className="px-4 py-5 text-center">AK Kumulatif</th><th className="px-8 py-5 text-right">Opsi</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pakList.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/5 group transition-colors">
                    <td className="px-8 py-5">
                      <p className="text-[11px] font-black text-gray-950 uppercase">{p.namaPegawai}</p>
                      <p className="text-[9px] font-mono text-blue-600 font-bold">{p.nip}</p>
                    </td>
                    <td className="px-4 py-5 font-black text-[10px] text-gray-700 uppercase">{p.periode}</td>
                    <td className="px-4 py-5 text-center">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100">{(p.jumlahKredit || 0).toFixed(3)}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedPAK(p); setActiveView('preview'); }} className="h-10 px-4 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase shadow-lg"><i className="bi bi-file-earmark-pdf"></i> Preview F4</button>
                        {canEdit && <button className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 hover:text-rose-600 flex items-center justify-center border border-gray-100" onClick={() => { setPakList(pakList.filter(x => x.id !== p.id)); localStorage.setItem('pak_pro_db_v4', JSON.stringify(pakList.filter(x => x.id !== p.id && !x.id.startsWith('sheet')))); }}><i className="bi bi-trash-fill"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'create' && (
        <div className="max-w-5xl mx-auto space-y-8 animate-modalEnter">
           <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b pb-6">
                <h4 className="text-xl font-black text-gray-900 uppercase">Input PAK Terintegrasi (F4 Standar)</h4>
                <button onClick={() => setActiveView('table')} className="text-rose-500 font-black text-[10px] uppercase">Batal</button>
              </div>

              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">I. Informasi Perorangan</h5>
                    <SearchableSelect label="Pilih PNS Fungsional" options={searchablePegawaiOptions} value={formData.nip} onChange={(val) => setFormData({...formData, nip: val})} />
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">Nomor PAK</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950" value={formData.nomor} onChange={e => setFormData({...formData, nomor: e.target.value})} placeholder="HKI.1-KP.03.04..." />
                       </div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">No. Seri Karpeg</label>
                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950" value={formData.nomorKarpeg} onChange={e => setFormData({...formData, nomorKarpeg: e.target.value})} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">Predikat Kinerja</label>
                        <select className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-black text-gray-950" value={formData.predikat} onChange={e => setFormData({...formData, predikat: e.target.value})}>
                            {Object.keys(PREDIKAT_MULTIPLIER).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
                        </select>
                       </div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">Jumlah Bulan</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950" value={formData.jumlahBulan} onChange={e => setFormData({...formData, jumlahBulan: parseInt(e.target.value) || 12})} />
                       </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600" checked={formData.hasBonusIjazah} onChange={e => setFormData({...formData, hasBonusIjazah: e.target.checked})} />
                        <label className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Mendapat Ijazah Lebih Tinggi (+25%)</label>
                    </div>
                    <button onClick={handleCalculate} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Hitung Angka Kredit</button>
                 </div>

                 <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-emerald-600 uppercase border-b pb-2 tracking-widest">II. Unsur Angka Kredit (Integrasi)</h5>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">AK Dasar Diberikan</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950" value={formData.akDasar} onChange={e => setFormData({...formData, akDasar: parseFloat(e.target.value) || 0})} />
                       </div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">AK JF Lama</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950" value={formData.akJFLama} onChange={e => setFormData({...formData, akJFLama: parseFloat(e.target.value) || 0})} />
                       </div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">AK Penyesuaian/Penyetaraan</label>
                        <input type="number" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-black text-gray-950" value={formData.akPenyetaraan} onChange={e => setFormData({...formData, akPenyetaraan: parseFloat(e.target.value) || 0})} />
                       </div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">AK Konversi (Live)</label>
                        <div className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-black text-blue-700">{(formData.akKonversi || 0).toFixed(3)}</div>
                       </div>
                    </div>
                    <SearchableSelect label="Pejabat Penandatangan" options={searchablePenandatanganOptions} value={formData.penilaiNip} onChange={(val) => setFormData({...formData, penilaiNip: val})} />
                    <div className="space-y-1"><label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1">Rekomendasi</label>
                        <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black h-20 text-gray-950 uppercase outline-none focus:border-blue-600" value={formData.rekomendasi} onChange={e => setFormData({...formData, rekomendasi: e.target.value})} />
                    </div>
                 </div>
              </div>
              <div className="pt-8 border-t flex justify-center">
                 <button onClick={handleSave} className="px-24 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase shadow-2xl active:scale-95 transition-all">Terbitkan Dokumen PAK</button>
              </div>
           </div>
        </div>
      )}

      {activeView === 'preview' && selectedPAK && (
        <div className="animate-fadeIn space-y-10">
           <div className="flex justify-between items-center no-print">
              <button onClick={() => setActiveView('table')} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase">Kembali</button>
              <button onClick={handleDownloadPdf} className="px-10 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2 transition-all active:scale-95"><i className="bi bi-file-earmark-pdf-fill"></i> Simpan PDF (Folio/F4)</button>
           </div>

           <div ref={pdfRef} className="space-y-10 bg-gray-200 p-10 overflow-x-auto no-scrollbar flex flex-col items-center">
              <div className="bg-white shadow-2xl p-[1.5cm_2cm] page-template" style={{ width: '210mm', height: '330mm', color: 'black', fontFamily: 'serif' }}>
                 <TemplateHeader />
                 <h2 className="text-[12pt] font-bold text-center mb-1 uppercase">KONVERSI PREDIKAT KINERJA KE ANGKA KREDIT</h2>
                 <h2 className="text-[11pt] font-bold text-center mb-6 uppercase">NOMOR: {selectedPAK.nomor}</h2>
                 <div className="grid grid-cols-2 gap-4 text-[9pt] mb-4">
                    <p>Instansi: Kementerian Hukum</p>
                    <p className="text-right">Periode: {selectedPAK.periode}</p>
                 </div>
                 <div className="border border-black mb-6">
                    <div className="bg-gray-100 p-2 font-bold text-center border-b border-black text-[10pt] uppercase">PEJABAT FUNGSIONAL YANG DINILAI</div>
                    {[
                      ['1 Nama', selectedPAK.namaPegawai],
                      ['2 NIP', selectedPAK.nip],
                      ['3 Nomor Seri Karpeg', selectedPAK.nomorKarpeg],
                      ['4 Tempat lahir', pegawaiList.find(p=>p.nip===selectedPAK.nip)?.tempatLahir || '-'],
                      ['5 Jenis Kelamin', pegawaiList.find(p=>p.nip===selectedPAK.nip)?.gender === 'L' ? 'Laki-laki' : 'Perempuan'],
                      ['6 Pangkat/Golongan', `${pegawaiList.find(p=>p.nip===selectedPAK.nip)?.pangkat || '-'} / ${pegawaiList.find(p=>p.nip===selectedPAK.nip)?.golRuang || '-'}`],
                      ['7 Jabatan', pegawaiList.find(p=>p.nip===selectedPAK.nip)?.jabatan || '-'],
                      ['8 Unit Kerja', pegawaiList.find(p=>p.nip===selectedPAK.nip)?.unitKerja || '-']
                    ].map(([label, val]) => (
                      <div key={label} className="grid grid-cols-[200px_10px_1fr] border-b border-black last:border-0 p-1.5 text-[9pt]">
                        <span>{label}</span><span>:</span><span className="uppercase">{val}</span>
                      </div>
                    ))}
                 </div>
                 <table className="w-full border-collapse border border-black text-center text-[9pt] mb-12">
                    <thead className="bg-gray-100 font-bold uppercase text-[8pt]">
                       <tr><th className="border border-black p-2" colSpan={2}>Hasil Penilaian Kinerja</th><th className="border border-black p-2" rowSpan={2}>Koefisien</th><th className="border border-black p-2" rowSpan={2}>AK Diperoleh</th></tr>
                       <tr><th className="border border-black p-2">PREDIKAT</th><th className="border border-black p-2">PROSENTASE</th></tr>
                    </thead>
                    <tbody className="font-bold">
                       <tr className="h-10">
                          <td className="border border-black p-2 uppercase">{selectedPAK.predikat}</td>
                          <td className="border border-black p-2">{selectedPAK.prosentase}%</td>
                          <td className="border border-black p-2">{selectedPAK.koefisien}</td>
                          <td className="border border-black p-2 text-[12pt]">{selectedPAK.akKonversi.toFixed(3)}</td>
                       </tr>
                    </tbody>
                 </table>
                 <div className="ml-[55%] text-[10pt] mb-16">
                    <p>Ditetapkan di Jakarta</p>
                    <p>Pada tanggal {selectedPAK.tglDibuat}</p>
                    <p className="mt-2 font-bold uppercase">{selectedPAK.pejabatPenilai?.jabatan}</p>
                    <div className="mt-24">
                       <p className="font-bold underline uppercase">{selectedPAK.pejabatPenilai?.nama || '-'}</p>
                       <p>NIP {selectedPAK.pejabatPenilai?.nip || '-'}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default PAKPage;
