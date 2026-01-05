
import { Pegawai, AdminUser, Laporan, Dossier, SKP, PAK, KenaikanKarir, Pengembangan, KGB } from './types';
import { getPangkatFromGol, getGajiEstimasi, UNIT_KERJA } from './constants';

const DEFAULT_SPREADSHEET_ID = '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4'; 
const DEFAULT_PEGAWAI_GID = '1631838106';

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedGid = localStorage.getItem('db_pegawai_gid');
  return {
    spreadsheetId: savedId || DEFAULT_SPREADSHEET_ID,
    pegawaiGid: savedGid || DEFAULT_PEGAWAI_GID
  };
};

const splitCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(currentField.trim());
      currentField = '';
    } else currentField += char;
  }
  result.push(currentField.trim());
  return result.map(field => field.replace(/^"|"$/g, '').trim());
};

export const calculateSalary = (gol: string, nip: string): number => {
  if (!nip || nip.length < 14) return 0;
  const tmtYear = parseInt(nip.substring(8, 12));
  const currentYear = new Date().getFullYear();
  const mk = Math.max(0, currentYear - tmtYear);
  return getGajiEstimasi(gol, mk);
};

export const calculateRetirementDate = (nip: string, jabatan: string): Date | null => {
  if (!nip || nip.length < 8) return null;
  const birthYear = parseInt(nip.substring(0, 4));
  const birthMonth = parseInt(nip.substring(4, 6)) - 1; 
  const birthDay = parseInt(nip.substring(6, 8));
  
  const birthDate = new Date(birthYear, birthMonth, birthDay);
  if (isNaN(birthDate.getTime())) return null;

  const jab = (jabatan || '').toUpperCase();
  let bup = 58; 

  if (jab.includes('AHLI UTAMA')) {
    bup = 65;
  } else if (
    jab.includes('AHLI MADYA') || 
    jab.includes('PIMPINAN TINGGI') || 
    jab.includes('DIREKTUR') || 
    jab.includes('KEPALA KANTOR') ||
    jab.includes('PRATAMA')
  ) {
    bup = 60;
  }

  let retirementMonth = birthMonth + 1;
  let retirementYear = birthYear + bup;
  if (retirementMonth > 11) {
    retirementMonth = 0;
    retirementYear += 1;
  }
  return new Date(retirementYear, retirementMonth, 1);
};

const fetchDataFromSheet = async (sheetName: string): Promise<string[][]> => {
  const { spreadsheetId } = getDbConfig();
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}&t=${Date.now()}`);
    if (!response.ok) throw new Error(`Sheet ${sheetName} tidak merespon`);
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase());
    const dataRows = lines.slice(1).map(line => splitCSVLine(line));
    return [headers, ...dataRows];
  } catch (err) {
    console.error(`Error fetching sheet ${sheetName}:`, err);
    return [];
  }
};

export const fetchPegawaiFromSheets = async (): Promise<Pegawai[]> => {
  const { spreadsheetId, pegawaiGid } = getDbConfig();
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${pegawaiGid}&t=${Date.now()}`);
    if (!response.ok) throw new Error("Gagal akses spreadsheet pegawai");
    
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const rawHeaders = splitCSVLine(lines[0]);
    const normalizedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/[\s_]/g, ''));
    const dataRows = lines.slice(1);

    const result = dataRows.map((line, index) => {
      const columns = splitCSVLine(line);
      if (columns.length < 2) return null;
      
      const getVal = (keywords: string[]) => {
        const normalizedKeywords = keywords.map(k => k.toLowerCase().replace(/[\s_]/g, ''));
        const colIdx = normalizedHeaders.findIndex(h => 
          normalizedKeywords.some(k => h === k || h.includes(k))
        );
        return colIdx !== -1 ? (columns[colIdx] || '').trim() : '';
      };

      const nama = getVal(['nama', 'name', 'pegawai']);
      if (!nama) return null;

      const nip = getVal(['nip', 'nomorinduk', 'idpegawai']).replace(/['\s]/g, '').replace(/[^0-9]/g, '');
      const jabatan = getVal(['jabatan', 'tugas', 'namajabatan']);
      
      // LOGIKA PEMETAAN UNIT KERJA (OPTIMIZED)
      let rawUnitInput = getVal(['unitkerja', 'direktorat', 'penempatan', 'biro', 'bagian', 'unit']).trim();
      let unitKerja = 'Sekretariat Direktorat Jenderal Kekayaan Intelektual'; 
      const cleanInput = rawUnitInput.toLowerCase();

      // Cek apakah input sudah persis sama dengan salah satu UNIT_KERJA
      const exactMatch = UNIT_KERJA.find(u => u.toLowerCase() === cleanInput);
      
      if (exactMatch) {
        unitKerja = exactMatch;
      } else {
        if (cleanInput.includes('cipta') || cleanInput.includes('desain industri')) {
          unitKerja = 'Direktorat Hak Cipta dan Desain Industri';
        } else if (cleanInput.includes('paten') || cleanInput.includes('dtlst') || cleanInput.includes('rahasia dagang')) {
          unitKerja = 'Direktorat Paten, DTLST, dan Rahasia Dagang';
        } else if (cleanInput.includes('merek') || cleanInput.includes('geografis')) {
          unitKerja = 'Direktorat Merek dan Indikasi Geografis';
        } else if (cleanInput.includes('kerja sama') || cleanInput.includes('kerjasama') || cleanInput.includes('pemberdayaan') || cleanInput.includes('edukasi')) {
          unitKerja = 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi';
        } else if (cleanInput.includes('teknologi informasi') || cleanInput.includes('ti') || cleanInput.includes('sistem') || cleanInput.includes('database')) {
          unitKerja = 'Direktorat Teknologi Informasi';
        } else if (cleanInput.includes('penegakan hukum') || cleanInput.includes('penyidikan') || cleanInput.includes('litigasi') || cleanInput.includes('pencegahan')) {
          unitKerja = 'Direktorat Penegakan Hukum';
        } else if (cleanInput.includes('sekretariat') || cleanInput.includes('kepegawaian') || cleanInput.includes('keuangan') || cleanInput.includes('umum') || cleanInput.includes('humas') || cleanInput.includes('perlengkapan')) {
          unitKerja = 'Sekretariat Direktorat Jenderal Kekayaan Intelektual';
        }
      }

      // --- LOGIKA PEMETAAN JENIS PEGAWAI ---
      const rawJenisValue = getVal(['jenispegawai', 'statuskepegawaian', 'kategoripegawai']).toUpperCase();
      let jenisPegawai: Pegawai['jenisPegawai'] = 'PNS'; 

      if (rawJenisValue.includes('PARUH') || rawJenisValue.includes('PW')) {
        jenisPegawai = 'PPPK PARUH WAKTU';
      } else if (rawJenisValue.includes('CPNS') || rawJenisValue.includes('CALON')) {
        jenisPegawai = 'CPNS';
      } else if (rawJenisValue.includes('PPPK') || rawJenisValue.includes('P3K')) {
        jenisPegawai = 'PPPK';
      } else if (rawJenisValue.includes('HONOR') || rawJenisValue.includes('PPNPN') || rawJenisValue.includes('NONASN') || rawJenisValue.includes('KONTRAK')) {
        jenisPegawai = 'HONORER';
      } else if (rawJenisValue.includes('PNS')) {
        jenisPegawai = 'PNS';
      } else if (nip && nip.length < 18 && nip.length > 5) {
        jenisPegawai = 'HONORER';
      }

      // --- LOGIKA PEMETAAN STATUS ---
      let rawStatusValue = getVal(['statusaktif', 'kondisi', 'aktif', 'keteranganstatus']).toLowerCase();
      let status: Pegawai['status'] = 'Aktif';
      if (rawStatusValue.includes('cuti')) status = 'Cuti';
      else if (rawStatusValue.includes('belajar') || rawStatusValue.includes('tubel')) status = 'Tugas Belajar';
      else if (rawStatusValue.includes('pensiun')) status = 'Pensiun';
      else if (rawStatusValue.includes('tidak') || rawStatusValue.includes('keluar') || rawStatusValue.includes('nonaktif')) status = 'Tidak Aktif';

      const golRuang = getVal(['golruang', 'golongan', 'ruang']);
      
      return {
        id: (index + 1).toString(),
        nama, nip, jabatan, unitKerja, 
        bagian: getVal(['bagian', 'seksi', 'subbidang']), 
        jenisPegawai, status,
        gender: (getVal(['jeniskelamin', 'gender', 'sex']) || '').toUpperCase().startsWith('P') ? 'P' : 'L',
        golRuang,
        pangkat: getVal(['pangkat', 'namapangkat']) || getPangkatFromGol(golRuang),
        telepon: getVal(['telp', 'hp', 'wa', 'whatsapp']),
        foto: getVal(['foto', 'gambar', 'photo']),
        tmtPangkat: getVal(['tmtpangkat', 'tmtgol']),
        tmtJabatan: getVal(['tmtjabatan']),
        pendidikan: getVal(['pendidikan', 'lulusan']),
        agama: getVal(['agama'])
      } as Pegawai;
    });

    return result.filter((p): p is Pegawai => p !== null && !!p.nama);
  } catch (error) {
    console.error("Fetch Pegawai Error:", error);
    return [];
  }
};

export const fetchUsersFromSheets = async (): Promise<AdminUser[]> => {
  try {
    const [headers, ...rows] = await fetchDataFromSheet('users');
    if (headers.length === 0 || rows.length === 0) throw new Error("Data users kosong");
    const hIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.replace(/[\s_]/g, '').includes(k.toUpperCase())));
    const idxNip = hIdx(['NIP', 'ID']);
    const idxName = hIdx(['NAME', 'NAMA']);
    const idxPass = hIdx(['PASSWORD', 'PASS']);
    const idxRole = hIdx(['ROLE', 'AKSES']);
    return rows.map((columns, index) => {
      const roleStr = (idxRole !== -1 ? (columns[idxRole] || '') : '').toUpperCase();
      let mappedRole: AdminUser['role'] = 'Viewer';
      if (roleStr.includes('SUPER')) mappedRole = 'Superadmin';
      else if (roleStr.includes('EDITOR')) mappedRole = 'Editor';
      return {
        id: (index + 1).toString(),
        nip: (idxNip !== -1 ? (columns[idxNip] || '') : '').replace(/['\s]/g, ''),
        name: idxName !== -1 ? columns[idxName] : 'User',
        password: idxPass !== -1 ? columns[idxPass] : '',
        role: mappedRole
      };
    }).filter(u => u.nip && u.nip.length > 5);
  } catch (err) {
    return [{ id: '1', nip: '1234567890', name: 'Admin SDM', password: 'admin', role: 'Superadmin' }];
  }
};

export const fetchSKPFromSheets = async (): Promise<SKP[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('skp');
  return rows.map((cols, i) => ({
    id: (i+1).toString(),
    nip: cols[headers.indexOf('NIP')],
    namaPegawai: cols[headers.indexOf('NAMA')],
    tahun: parseInt(cols[headers.indexOf('TAHUN')]),
    nilaiKinerja: parseFloat(cols[headers.indexOf('KINERJA')]),
    nilaiPerilaku: parseFloat(cols[headers.indexOf('PERILAKU')]),
    predikat: cols[headers.indexOf('PREDIKAT')] as any,
  })).filter(x => x.nip);
};

export const fetchPAKFromSheets = async (): Promise<PAK[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('pak');
  return rows.map((cols, i) => ({
    id: (i+1).toString(),
    nip: cols[headers.indexOf('NIP')],
    namaPegawai: cols[headers.indexOf('NAMA')],
    periode: cols[headers.indexOf('PERIODE')],
    jumlahKredit: parseFloat(cols[headers.indexOf('KREDIT')]),
    keterangan: cols[headers.indexOf('KETERANGAN')],
    status: cols[headers.indexOf('STATUS')] as any,
  })).filter(x => x.nip);
};

export const fetchKenaikanFromSheets = async (): Promise<KenaikanKarir[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('kenaikan');
  return rows.map((cols, i) => ({
    id: (i+1).toString(),
    nip: cols[headers.indexOf('NIP')],
    namaPegawai: cols[headers.indexOf('NAMA')],
    jenisUsulan: cols[headers.indexOf('JENIS')] as any,
    dari: cols[headers.indexOf('DARI')],
    menjadi: cols[headers.indexOf('MENJADI')],
    tmtUsulan: cols[headers.indexOf('TMT')],
    status: cols[headers.indexOf('STATUS')] as any,
  })).filter(x => x.nip);
};

export const fetchPengembanganFromSheets = async (): Promise<Pengembangan[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('pengembangan');
  return rows.map((cols, i) => ({
    id: (i+1).toString(),
    nip: cols[headers.indexOf('NIP')],
    namaPegawai: cols[headers.indexOf('NAMA')],
    namaKegiatan: cols[headers.indexOf('KEGIATAN')],
    tanggalMulai: cols[headers.indexOf('MULAI')],
    tanggalSelesai: cols[headers.indexOf('SELESAI')],
    jumlahJpl: parseInt(cols[headers.indexOf('JPL')]),
    penyelenggara: cols[headers.indexOf('PENYELENGGARA')],
  })).filter(x => x.nip);
};

export const fetchKGBFromSheets = async (): Promise<KGB[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('kgb');
  return rows.map((cols, i) => ({
    id: (i+1).toString(),
    nip: cols[headers.indexOf('NIP')],
    namaPegawai: cols[headers.indexOf('NAMA')],
    tmtLama: cols[headers.indexOf('TMT_LAMA')],
    tmtBaru: cols[headers.indexOf('TMT_BARU')],
    gajiLama: parseFloat(cols[headers.indexOf('GAJI_LAMA')]),
    gajiBaru: parseFloat(cols[headers.indexOf('GAJI_BARU')]),
    nomorSk: cols[headers.indexOf('NOMOR_SK')],
    tglSk: cols[headers.indexOf('TANGGAL_SK')],
    status: cols[headers.indexOf('STATUS')] as any,
  })).filter(x => x.nip);
};

export const fetchLaporanFromSheets = async (): Promise<Laporan[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('laporan');
  return rows.map((columns, index) => ({
    id: (index + 1).toString(),
    judul: columns[headers.indexOf('JUDUL')],
    jenis: columns[headers.indexOf('JENIS')] as any,
    periode: columns[headers.indexOf('PERIODE')],
    tahun: parseInt(columns[headers.indexOf('TAHUN')]) || 2024,
    status: columns[headers.indexOf('STATUS')] as any,
    fileUrl: columns[headers.indexOf('FILE_URL')],
    createdAt: columns[headers.indexOf('CREATED_AT')]
  })).filter(l => l.judul);
};

export const fetchDossiersFromSheets = async (): Promise<Dossier[]> => {
  const [headers, ...rows] = await fetchDataFromSheet('dossiers');
  return rows.map((columns, index) => ({
    id: (index + 1).toString(),
    nip: columns[headers.indexOf('NIP')]?.replace(/['\s]/g, '') || '',
    namaPegawai: columns[headers.indexOf('NAMA_PEGAWAI')] || '',
    tanggal: columns[headers.indexOf('TANGGAL')] || '',
    keterangan: columns[headers.indexOf('KETERANGAN')] || '',
    fileName: columns[headers.indexOf('FILE_NAME')] || ''
  })).filter(d => d.nip);
};
