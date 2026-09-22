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
  onApply
}) => {
  const [activeCategory, setActiveCategory] = useState<SimpegCategory>(initialCategory);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory, isOpen]);

  useEffect(() => {
    setPastedText('');
    setParsedRows([]);
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
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Resmi Kemenkumham
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
            className="h-9 w-9 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-all"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>

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
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <i className={`bi ${cfg.icon}`}></i>
                <span>{cfg.title.split('&')[0].trim()}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-mono ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                  {cfg.sampleCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* OPTION 1: INSTANT SCREENSHOT PRE-LOADED DATA */}
          <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/80 rounded-2xl relative overflow-hidden shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1">
                    <i className="bi bi-lightning-charge-fill"></i> Opsi 1: Pilihan Cepat
                  </span>
                  <span className="text-[11px] font-black text-emerald-950 uppercase">
                    Data Otentik SIMPEG Kemenkumham
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 font-medium">
                  {currentConfig.sampleDescription}
                </p>
                <div className="text-[9px] font-mono text-emerald-700 flex items-center gap-2 pt-0.5">
                  <span>✓ {currentConfig.sampleCount} baris data siap pakai</span>
                  <span>•</span>
                  <span>Format sesuai standar SIMPEG pusat</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleApplySample('APPEND')}
                  className="px-4 py-2.5 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 rounded-xl font-black text-[9px] uppercase transition-all shadow-xs"
                  title="Tambahkan data ini ke riwayat yang sudah ada"
                >
                  <i className="bi bi-plus-circle mr-1"></i> Tambahkan ({currentConfig.sampleCount})
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySample('REPLACE')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase rounded-xl shadow-sm transition-all"
                  title="Hapus riwayat lama dan terapkan dataset lengkap ini"
                >
                  <i className="bi bi-check2-circle mr-1"></i> Terapkan Semua ({currentConfig.sampleCount})
                </button>
              </div>
            </div>

            {/* Micro preview of sample rows */}
            <div className="mt-3.5 pt-3 border-t border-emerald-200/60 flex flex-wrap gap-1.5 items-center">
              <span className="text-[9px] font-black text-gray-500 uppercase mr-1">Pratinjau:</span>
              {currentConfig.sampleData.slice(0, 4).map((item, idx) => {
                const label = item.namaJabatan || item.pangkat || item.jenjang || item.gajiPokok || item.namaPelatihan || item.nama;
                const sub = item.tmtJabatan || item.golRuang || item.tahunLulus || item.tahun || item.hubungan;
                return (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-100 rounded-md text-[9px] text-gray-700 font-medium truncate max-w-[200px]">
                    <span className="font-bold text-emerald-700">{sub ? `${sub}:` : ''}</span>
                    <span className="truncate">{label}</span>
                  </span>
                );
              })}
              {currentConfig.sampleData.length > 4 && (
                <span className="text-[9px] font-bold text-emerald-700">
                  +{currentConfig.sampleData.length - 4} lainnya...
                </span>
              )}
            </div>
          </div>

          {/* OPTION 2: PASTE TEXT FROM SIMPEG TABLE OR EXCEL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white flex items-center gap-1">
                  <i className="bi bi-clipboard-data"></i> Opsi 2: Tempel (Paste) Teks Tabel
                </span>
                <span className="text-[11px] font-black text-gray-800 uppercase">
                  Dari Portal SIMPEG Web atau Excel
                </span>
              </div>
              {parsedRows.length > 0 && (
                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                  ✓ {parsedRows.length} baris terdeteksi
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-500">
              Buka halaman SIMPEG Kemenkumham, blok/sorot tabel baris data, tekan <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[9px] font-mono">Ctrl+C</kbd>, lalu tempelkan (<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[9px] font-mono">Ctrl+V</kbd>) di kotak teks di bawah:
            </p>

            <textarea
              rows={5}
              value={pastedText}
              onChange={e => handleParseText(e.target.value)}
              placeholder={`Contoh tempel (baris tabel dipisahkan tab/kolom):\n${
                activeCategory === 'pangkat'
                  ? 'IV/d\tPembina Utama Madya\t2025-10-01\t00503/KEP/AA/15001/25\t2025-08-13\tPresiden RI\tPilihan\t28\t7\tKP'
                  : activeCategory === 'pendidikan'
                  ? 'D4/S1\tSARJANA UNIV. MUHAMMADIYAH JAKARTA\tHUKUM PIDANA\tJAKARTA\tREKTOR\t002609\t1994-12-16\t1994\tPenyesuaian Ijazah'
                  : activeCategory === 'gaji'
                  ? '00503/KEP/AA/15001/25\t2025-08-13\t2025-10-01\tIV/d\t5.321.200\t28\t7\tPresiden RI\tKenaikan Pangkat\t-'
                  : activeCategory === 'pelatihan'
                  ? 'Teknis\tPPNS Ditjen Imigrasi\tVIII\t1996\t1996-01-15\t1996-03-14\t0\tBOGOR\tLEMPOLRI\t000043\t1996-03-14\t-'
                  : activeCategory === 'keluarga'
                  ? 'Istri\tHj. SITI AISYAH, S.E.\tJAKARTA\t1972-04-14\tP\tWIRASWASTA\t3175000000000001\tKawin\tDapat Tunjangan'
                  : '170/TPA TAHUN 2025\t2025-11-12\tDirektur Jenderal Kekayaan Intelektual\tDITJEN KI\t2025-11-28\tPresiden RI\tI.a'
              }`}
              className="w-full px-4 py-3 bg-gray-50/70 border border-gray-200 rounded-2xl text-[10px] font-mono outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
            />

            {/* PREVIEW OF PARSED ROWS */}
            {parsedRows.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-wide">
                    Pratinjau Hasil Pembacaan Tabel ({parsedRows.length} Baris):
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto border border-blue-200 rounded-xl bg-white shadow-xs">
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
                    className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-[9px] font-black uppercase transition-all"
                  >
                    Tambahkan Data Hasil Salin ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyParsed('REPLACE')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 shadow-sm transition-all"
                  >
                    Gantikan Semua dengan Hasil Salin ({parsedRows.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-2">
            <i className="bi bi-shield-check text-emerald-600 text-sm"></i>
            <span>Sinkronisasi otomatis ke profil induk & berkas dossier.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpegImportModal;
