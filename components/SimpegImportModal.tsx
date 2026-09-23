import React, { useState, useEffect } from 'react';
import { 
  SIMPEG_PANGKAT_DATA, 
  SIMPEG_PENDIDIKAN_DATA, 
  SIMPEG_GAJI_DATA, 
  SIMPEG_PELATIHAN_DATA, 
  SIMPEG_KELUARGA_DATA,
  SIMPEG_JABATAN_DATA
} from '../data/simpegData';
import { parseDateToYYYYMMDD } from '../spreadsheetService';

export type SimpegCategory = 'jabatan' | 'pangkat' | 'pendidikan' | 'gaji' | 'pelatihan' | 'keluarga';

interface SimpegImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: SimpegCategory;
  onApply: (category: SimpegCategory, mode: 'APPEND' | 'REPLACE', rows: any[]) => void;
  targetPegawaiName?: string;
  targetPegawaiNip?: string;
}

const CATEGORY_CONFIG: Record<SimpegCategory, {
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
  badgeBg: string;
  sampleCount: number;
  sampleDescription: string;
  sampleData: any[];
  columns: string[];
}> = {
  jabatan: {
    title: 'Riwayat Jabatan',
    subtitle: 'Jabatan Struktural, Fungsional & Penugasan',
    icon: 'bi-briefcase-fill',
    colorClass: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    sampleCount: SIMPEG_JABATAN_DATA.length,
    sampleDescription: '14 riwayat jabatan otentik SIMPEG Kemenkumham (Kasubsi s.d. Direktur Jenderal)',
    sampleData: SIMPEG_JABATAN_DATA,
    columns: ['No. SK', 'Tgl SK', 'Nama Jabatan', 'Unit Kerja', 'TMT Jabatan', 'Pejabat', 'Eselon']
  },
  pangkat: {
    title: 'Riwayat Pangkat & Golongan',
    subtitle: 'Kenaikan Pangkat Reguler, Penyesuaian Ijazah & Pilihan',
    icon: 'bi-award-fill',
    colorClass: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    sampleCount: SIMPEG_PANGKAT_DATA.length,
    sampleDescription: '11 riwayat pangkat otentik SIMPEG Kemenkumham (Gol. II/a Pengatur Muda s.d. IV/d Pembina Utama Madya)',
    sampleData: SIMPEG_PANGKAT_DATA,
    columns: ['Gol. Ruang', 'Pangkat', 'TMT Pangkat', 'No. SK', 'Tgl SK', 'Pejabat Penetap', 'Jenis KP', 'Masa Kerja', 'Ket']
  },
  pendidikan: {
    title: 'Riwayat Pendidikan',
    subtitle: 'Pendidikan Formal SD s.d. Pascasarjana (S2)',
    icon: 'bi-mortarboard-fill',
    colorClass: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    sampleCount: SIMPEG_PENDIDIKAN_DATA.length,
    sampleDescription: '5 riwayat pendidikan otentik SIMPEG (SD, SMP Dumai, SMAN 6 Pekanbaru, S1 Hukum Univ. Muhammadiyah, S2 Univ. Sebelas Maret)',
    sampleData: SIMPEG_PENDIDIKAN_DATA,
    columns: ['Jenjang', 'Nama Sekolah / Institusi', 'Jurusan', 'No. STTB / Ijazah', 'Tgl STTB', 'Tahun', 'Pemakaian']
  },
  gaji: {
    title: 'Riwayat Gaji Pokok & KGB',
    subtitle: 'Kenaikan Gaji Berkala (KGB) & Kenaikan Pangkat',
    icon: 'bi-cash-coin',
    colorClass: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sampleCount: SIMPEG_GAJI_DATA.length,
    sampleDescription: '19 riwayat gaji berkala & KP otentik SIMPEG Kemenkumham (II/a Rp 2.022.200 s.d. IV/d Rp 5.321.200)',
    sampleData: SIMPEG_GAJI_DATA,
    columns: ['No. SK', 'Tgl SK', 'TMT SK', 'Pangkat/Gol', 'Gaji Pokok (Rp)', 'Masa Kerja', 'Pejabat', 'Jenis Kenaikan', 'KPPN']
  },
  pelatihan: {
    title: 'Riwayat Pelatihan & Diklat',
    subtitle: 'Prajabatan, Diklatpim, Teknis & Fungsional',
    icon: 'bi-journal-check',
    colorClass: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    sampleCount: SIMPEG_PELATIHAN_DATA.length,
    sampleDescription: '14 riwayat diklat otentik SIMPEG (Prajabatan, Adum, Spama/Pim III, Spamen/Pim II, Sespa/Pim I, Kesamaptaan, PPNS, Intelijen, PBJ, TOF)',
    sampleData: SIMPEG_PELATIHAN_DATA,
    columns: ['Jenis Diklat', 'Nama Pelatihan', 'Angkatan', 'Tahun', 'Tgl Mulai - Selesai', 'Jam', 'Penyelenggara', 'No. STTPP']
  },
  keluarga: {
    title: 'Informasi Keluarga',
    subtitle: 'Pasangan (Suami/Istri), Anak, dan Tanggungan',
    icon: 'bi-people-fill',
    colorClass: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    sampleCount: SIMPEG_KELUARGA_DATA.length,
    sampleDescription: 'Data keluarga resmi SIMPEG (Istri & Anak, status tunjangan & NIK)',
    sampleData: SIMPEG_KELUARGA_DATA,
    columns: ['Hubungan', 'Nama Lengkap', 'Tempat Lahir', 'Tgl Lahir', 'L/P', 'Pekerjaan', 'NIK', 'Tunjangan']
  }
};

export const SimpegImportModal: React.FC<SimpegImportModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'jabatan',
  onApply,
  targetPegawaiName,
  targetPegawaiNip
}) => {
  const [activeCategory, setActiveCategory] = useState<SimpegCategory>(initialCategory);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [showDummySample, setShowDummySample] = useState(false);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, isOpen]);

  useEffect(() => {
    setPastedText('');
    setParsedRows([]);
    setShowDummySample(false);
  }, [activeCategory]);

  if (!isOpen) return null;

  const currentConfig = CATEGORY_CONFIG[activeCategory];

  // Universal line parser for any SIMPEG table paste
  const handleParseText = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    const results: any[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip header rows
      if (/(no\s*sk|nama\s*jabatan|pangkat|gol|jenjang|tmt|gaji|pelatihan|hubungan|sttb|ijazah)/i.test(line) && lines.indexOf(rawLine) === 0) {
        continue;
      }

      let cols: string[] = [];
      if (line.includes('\t')) {
        cols = line.split('\t').map(c => c.trim());
      } else if (line.includes('|')) {
        cols = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
      } else if (line.includes(';')) {
        cols = line.split(';').map(c => c.trim());
      } else {
        cols = line.split(/\s{2,}/).map(c => c.trim());
      }

      if (cols.length >= 2) {
        if (activeCategory === 'jabatan') {
          results.push({
            nomorSk: cols[0] || '',
            tanggalSk: parseDateToYYYYMMDD(cols[1]) || cols[1] || '',
            namaJabatan: cols[2] || '',
            unitKerja: cols[3] || '',
            tmtJabatan: parseDateToYYYYMMDD(cols[4]) || cols[4] || '',
            pejabatPenetap: cols[5] || '',
            eselon: cols[6] || '',
            tmtEselon: parseDateToYYYYMMDD(cols[7]) || cols[7] || '',
            nomorPelantikan: cols[8] || '',
            tanggalPelantikan: parseDateToYYYYMMDD(cols[9]) || cols[9] || '',
          });
        } else if (activeCategory === 'pangkat') {
          results.push({
            golRuang: cols[0] || '',
            pangkat: cols[1] || '',
            tmtPangkat: parseDateToYYYYMMDD(cols[2]) || cols[2] || '',
            nomorSk: cols[3] || '',
            tanggalSk: parseDateToYYYYMMDD(cols[4]) || cols[4] || '',
            pejabatPenetap: cols[5] || '',
            jenisKp: cols[6] || 'Reguler',
            masaKerjaTahun: cols[7] || '',
            masaKerjaBulan: cols[8] || '',
            keterangan: cols[9] || 'KP'
          });
        } else if (activeCategory === 'pendidikan') {
          results.push({
            jenjang: cols[0] || '',
            institusi: cols[1] || '',
            namaSekolah: cols[1] || '',
            jurusan: cols[2] || '-',
            alamatSekolah: cols[3] || '',
            kepalaSekolah: cols[4] || '',
            nomorIjazah: cols[5] || '',
            tanggalIjazah: parseDateToYYYYMMDD(cols[6]) || cols[6] || '',
            tahunLulus: cols[7] || (cols[6] ? cols[6].slice(0, 4) : ''),
            pemakaianIjazah: cols[8] || '-'
          });
        } else if (activeCategory === 'gaji') {
          results.push({
            nomorSk: cols[0] || '',
            tanggalSk: parseDateToYYYYMMDD(cols[1]) || cols[1] || '',
            tmtSk: parseDateToYYYYMMDD(cols[2]) || cols[2] || '',
            pangkat: cols[3] || '',
            gajiPokok: cols[4] || '',
            masaKerjaTahun: cols[5] || '0',
            masaKerjaBulan: cols[6] || '0',
            pejabatPenetap: cols[7] || '',
            jenisKenaikanGaji: cols[8] || 'Gaji Berkala',
            kppn: cols[9] || '-'
          });
        } else if (activeCategory === 'pelatihan') {
          results.push({
            jenisDiklat: cols[0] || 'Teknis',
            namaPelatihan: cols[1] || '',
            angkatan: cols[2] || '-',
            tahun: cols[3] || '',
            tanggalMulai: parseDateToYYYYMMDD(cols[4]) || cols[4] || '',
            tanggalSelesai: parseDateToYYYYMMDD(cols[5]) || cols[5] || '',
            durasi: cols[6] || '0',
            tempat: cols[7] || '',
            penyelenggara: cols[8] || '',
            nomorSertifikat: cols[9] || '',
            tanggalSertifikat: parseDateToYYYYMMDD(cols[10]) || cols[10] || '',
            prestasi: cols[11] || '-'
          });
        } else if (activeCategory === 'keluarga') {
          results.push({
            hubungan: cols[0] || 'Anak',
            nama: cols[1] || '',
            tempatLahir: cols[2] || '',
            tanggalLahir: parseDateToYYYYMMDD(cols[3]) || cols[3] || '',
            jenisKelamin: cols[4] || 'L',
            pekerjaan: cols[5] || '',
            nik: cols[6] || '',
            statusPerkawinan: cols[7] || '',
            keteranganTunjangan: cols[8] || 'Dapat Tunjangan'
          });
        }
      }
    }
    setParsedRows(results);
  };

  const handleApplySample = (mode: 'APPEND' | 'REPLACE') => {
    const confirmMsg = `PERINGATAN:\nData ini adalah DATA CONTOH SIMULASI (milik pejabat simulasi: Kasubsi s.d. Direktur Jenderal), BUKAN data asli ${targetPegawaiName || 'pegawai ini'}.\n\nApakah Anda yakin ingin memuat data contoh ini ke profil ${targetPegawaiName || 'pegawai ini'}?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    onApply(activeCategory, mode, currentConfig.sampleData);
    onClose();
  };

  const handleApplyParsed = (mode: 'APPEND' | 'REPLACE') => {
    if (parsedRows.length === 0) return;
    onApply(activeCategory, mode, parsedRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-2xl bg-white shadow-xs border border-gray-100 flex items-center justify-center text-xl ${currentConfig.colorClass}`}>
              <i className={`bi ${currentConfig.icon}`}></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">
                  Import SIMPEG: {currentConfig.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                  Format Resmi Kemenkumham
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                {currentConfig.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

        {/* TARGET PEGAWAI INFO BANNER */}
        {targetPegawaiName && (
          <div className="px-6 py-2.5 bg-blue-50/60 border-b border-blue-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                <i className="bi bi-person-fill"></i>
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">Target Pegawai:</span>
              <span className="text-xs font-black text-blue-950 uppercase">{targetPegawaiName}</span>
              {targetPegawaiNip && (
                <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-md">
                  NIP. {targetPegawaiNip}
                </span>
              )}
            </div>
            <span className="text-[9px] font-bold text-blue-700">
              ✓ Data akan disimpan khusus untuk pegawai ini
            </span>
          </div>
        )}

        {/* CATEGORY SWITCHER TABS */}
        <div className="px-6 pt-3 pb-2 bg-gray-50/70 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['jabatan', 'pangkat', 'pendidikan', 'gaji', 'pelatihan', 'keluarga'] as SimpegCategory[]).map(catKey => {
            const cfg = CATEGORY_CONFIG[catKey];
            const isActive = activeCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey)}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <i className={`bi ${cfg.icon}`}></i>
                <span>{cfg.title.split('&')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* PRIMARY METHOD: PASTE TEXT FROM SIMPEG TABLE OR EXCEL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white flex items-center gap-1">
                  <i className="bi bi-clipboard-data-fill"></i> Metode Utama (Disarankan)
                </span>
                <span className="text-[11px] font-black text-gray-900 uppercase">
                  Salin & Tempel Tabel Riwayat Milik Pegawai Ini
                </span>
              </div>
              {parsedRows.length > 0 && (
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <i className="bi bi-check-circle-fill"></i> {parsedRows.length} baris data terdeteksi
                </span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-gray-600 space-y-1 leading-relaxed">
              <p className="font-bold text-gray-800">
                Cara mengisi data riwayat asli pegawai:
              </p>
              <ol className="list-decimal list-inside text-[10px] text-gray-600 space-y-0.5 font-medium">
                <li>Buka portal SIMPEG Kemenkumham / file Excel rekap riwayat milik <strong>{targetPegawaiName || 'pegawai ini'}</strong>.</li>
                <li>Sorot (blok) seluruh baris pada tabel riwayat {currentConfig.title}, lalu tekan <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono font-bold">Ctrl+C</kbd> (Salin).</li>
                <li>Klik di kotak di bawah dan tekan <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[9px] font-mono font-bold">Ctrl+V</kbd> (Tempel). Sistem otomatis memetakan kolom-kolomnya!</li>
              </ol>
            </div>

            <textarea
              rows={5}
              value={pastedText}
              onChange={e => handleParseText(e.target.value)}
              placeholder={`Tempel (Ctrl+V) baris tabel dari SIMPEG atau Excel di sini...\nContoh format per baris:\n${
                activeCategory === 'pangkat'
                  ? 'IV/d\tPembina Utama Madya\t2025-10-01\t00503/KEP/AA/15001/25\t2025-08-13\tPresiden RI\tPilihan\t28\t7\tKP'
                  : activeCategory === 'pendidikan'
                  ? 'D4/S1\tUNIVERSITAS INDONESIA\tILMU HUKUM\tJAKARTA\tREKTOR\t002609\t1994-12-16\t1994\tPenyesuaian Ijazah'
                  : activeCategory === 'gaji'
                  ? '00503/KEP/AA/15001/25\t2025-08-13\t2025-10-01\tIV/d\t5.321.200\t28\t7\tPresiden RI\tKenaikan Pangkat\t-'
                  : activeCategory === 'pelatihan'
                  ? 'Teknis\tDiklat Pemeriksa Paten\tVIII\t2022\t2022-01-15\t2022-03-14\t120\tJAKARTA\tBPSDM\t000043\t2022-03-14\t-'
                  : activeCategory === 'keluarga'
                  ? 'Istri\tNAMA PASANGAN\tJAKARTA\t1985-04-14\tP\tWIRASWASTA\t3175000000000001\tKawin\tDapat Tunjangan'
                  : 'SK-123/KP/2023\t2023-11-01\tPemeriksa Paten Ahli Madya\tDirektorat Paten, DTLST dan RD\t2023-11-01\tMenteri Hukum dan HAM\t-\t-\t-\t-'
              }`}
              className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-2xl text-[10px] font-mono outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />

            {/* PREVIEW OF PARSED ROWS */}
            {parsedRows.length > 0 && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-wide">
                    Pratinjau Hasil Pembacaan Tabel ({parsedRows.length} Baris):
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto border border-blue-200 rounded-xl bg-white shadow-xs">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-blue-50/80 border-b border-blue-200 text-blue-900 font-bold uppercase text-[9px] divide-x divide-blue-200">
                        <th className="py-2 px-2 text-center w-8">#</th>
                        {currentConfig.columns.slice(0, 5).map((colName, cIdx) => (
                          <th key={cIdx} className="py-2 px-3">{colName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map((r, i) => (
                        <tr key={i} className="hover:bg-blue-50/30 divide-x divide-gray-100">
                          <td className="py-2 px-2 text-center font-bold text-gray-400">{i + 1}</td>
                          {Object.values(r).slice(0, 5).map((val: any, vIdx) => (
                            <td key={vIdx} className="py-2 px-3 font-medium text-gray-800 truncate max-w-[150px]">
                              {String(val || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleApplyParsed('APPEND')}
                    className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer"
                  >
                    + Tambahkan Hasil Salin ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyParsed('REPLACE')}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                  >
                    Terapkan Semua Hasil Salin ({parsedRows.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECONDARY / TEST OPTION: SAMPLE DUMMY TEMPLATE (COLLAPSIBLE WITH PROMINENT WARNING) */}
          <div className="pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowDummySample(!showDummySample)}
              className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-gray-800 flex items-center justify-between w-full py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <i className="bi bi-flask text-amber-500"></i>
                <span>Opsi Simulasi / Pengujian (Data Contoh Dummy Format)</span>
              </span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                {showDummySample ? 'Tutup Pilihan Contoh' : 'Buka Contoh Template'}
                <i className={`bi ${showDummySample ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
              </span>
            </button>

            {showDummySample && (
              <div className="mt-3 p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-slate-50 border border-amber-200/90 rounded-2xl relative overflow-hidden shadow-xs space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs shrink-0 mt-0.5">
                    <i className="bi bi-exclamation-triangle-fill"></i>
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-black text-amber-950 uppercase tracking-tight">
                      Perhatian: Data Ini Bukan Milik {targetPegawaiName || 'Pegawai Ini'}
                    </h5>
                    <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                      Ini adalah <strong>data contoh simulasi format ({currentConfig.sampleDescription})</strong> yang digunakan untuk pengujian tampilan atau demonstrasi. 
                      Jangan terapkan jika Anda ingin memasukkan riwayat asli pegawai.
                    </p>
                  </div>
                </div>

                {/* Micro preview of sample rows */}
                <div className="pt-2 border-t border-amber-200/60 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] font-black text-amber-800 uppercase mr-1">Pratinjau Contoh:</span>
                  {currentConfig.sampleData.slice(0, 3).map((item, idx) => {
                    const label = item.namaJabatan || item.pangkat || item.jenjang || item.gajiPokok || item.namaPelatihan || item.nama;
                    const sub = item.tmtJabatan || item.golRuang || item.tahunLulus || item.tahun || item.hubungan;
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 rounded-md text-[9px] text-gray-700 font-medium truncate max-w-[200px]">
                        <span className="font-bold text-amber-700">{sub ? `${sub}:` : ''}</span>
                        <span className="truncate">{label}</span>
                      </span>
                    );
                  })}
                  {currentConfig.sampleData.length > 3 && (
                    <span className="text-[9px] font-bold text-amber-700">
                      +{currentConfig.sampleData.length - 3} lainnya...
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
                  <span className="text-[9px] font-mono text-amber-700 font-bold">
                    Contoh format standar: {currentConfig.sampleCount} baris
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplySample('APPEND')}
                      className="px-3.5 py-2 bg-white text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-xl font-black text-[9px] uppercase transition-all shadow-xs cursor-pointer"
                      title="Tambahkan data contoh ini ke riwayat (Hanya untuk pengujian)"
                    >
                      <i className="bi bi-plus-circle mr-1"></i> Tambah Contoh ({currentConfig.sampleCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySample('REPLACE')}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] uppercase rounded-xl shadow-xs transition-all cursor-pointer"
                      title="Gantikan riwayat dengan data contoh simulasi (Hanya untuk pengujian)"
                    >
                      <i className="bi bi-arrow-repeat mr-1"></i> Ganti Contoh ({currentConfig.sampleCount})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-2">
            <i className="bi bi-shield-check text-blue-600 text-sm"></i>
            <span>Setiap data yang dimasukkan otomatis tersimpan ke profil pegawai terpilih.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpegImportModal;
