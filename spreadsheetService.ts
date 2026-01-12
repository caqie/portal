
import { Pegawai, AdminUser, Laporan, Dossier, SKP, PAK, KenaikanKarir, Pengembangan, KGB } from './types';
import { getPangkatFromGol, getGajiEstimasi } from './constants';

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

export const calculateRetirementDate = (nip: string, jabatan: string, klasifikasi?: string): Date | null => {
  const details = getRetirementDetails(nip, jabatan, klasifikasi);
  return details?.tmtPensiun || null;
};

export const getRetirementDetails = (nip: string, jabatan: string, klasifikasi?: string) => {
  if (!nip || nip.length < 8) return null;
  
  const birthYear = parseInt(nip.substring(0, 4));
  const birthMonth = parseInt(nip.substring(4, 6)) - 1; 
  const birthDay = parseInt(nip.substring(6, 8));
  const birthDate = new Date(birthYear, birthMonth, birthDay);
  
  if (isNaN(birthDate.getTime())) return null;

  const now = new Date();
  const jab = (jabatan || '').toUpperCase();
  const klas = (klasifikasi || '').toUpperCase();
  
  /**
   * LOGIKA BUP (Batas Usia Pensiun) BERDASARKAN KLASIFIKASI JABATAN RIIL:
   * 1. 65 Tahun: FUNGSIONAL AHLI UTAMA
   * 2. 60 Tahun: FUNGSIONAL AHLI MADYA, PIMPINAN TINGGI
   * 3. 58 Tahun: FUNGSIONAL AHLI PERTAMA, FUNGSIONAL AHLI MUDA, FUNGSIONAL KETERAMPILAN, PELAKSANA, PEJABAT ADMINISTRASI
   */
  let usiaPensiun = 58; 
  
  // Prioritas Cek Berdasarkan Kolom Klasifikasi Jabatan (String Riil dari Spreadsheet)
  if (klas.includes('UTAMA')) {
    usiaPensiun = 65;
  } else if (klas.includes('MADYA') || klas.includes('PIMPINAN TINGGI')) {
    usiaPensiun = 60;
  } else if (
    klas.includes('PERTAMA') || 
    klas.includes('MUDA') || 
    klas.includes('PELAKSANA') || 
    klas.includes('KETERAMPILAN') ||
    klas.includes('ADMINISTRASI')
  ) {
    usiaPensiun = 58;
  } else {
    // Fallback ke Nama Jabatan jika Klasifikasi Kosong atau Tidak Cocok
    if (jab.includes('UTAMA')) usiaPensiun = 65;
    else if (jab.includes('MADYA') || jab.includes('DIREKTUR') || jab.includes('KEPALA KANTOR') || jab.includes('PIMPINAN')) usiaPensiun = 60;
    else if (jab.includes('PERTAMA') || jab.includes('MUDA') || jab.includes('PELAKSANA') || jab.includes('ADMIN')) usiaPensiun = 58;
  }

  const tglPensiun = new Date(birthYear + usiaPensiun, birthMonth, birthDay);
  
  let tmtMonth = birthMonth + 1;
  let tmtYear = birthYear + usiaPensiun;
  if (tmtMonth > 11) {
    tmtMonth = 0;
    tmtYear += 1;
  }
  const tmtPensiun = new Date(tmtYear, tmtMonth, 1);

  let currentAge = now.getFullYear() - birthYear;
  const m = now.getMonth() - birthMonth;
  if (m < 0 || (m === 0 && now.getDate() < birthDay)) currentAge--;

  const diffTime = tmtPensiun.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let sisaMasaKerja = 'Pensiun';
  if (diffDays > 0) {
    const totalMonths = Math.floor(diffDays / 30.4375);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    sisaMasaKerja = `${years} Thn ${months} Bln`;
  }

  const mppDate = new Date(tmtPensiun);
  mppDate.setFullYear(mppDate.getFullYear() - 1);

  return {
    birthDate,
    tglPensiun,
    tmtPensiun,
    usiaPensiun,
    currentAge,
    sisaMasaKerja,
    mpp: mppDate,
    jenisPensiun: 'BUP'
  };
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
    const headers = rawHeaders.map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    const dataRows = lines.slice(1);

    const result = dataRows.map((line, index) => {
      const columns = splitCSVLine(line);
      if (columns.length < 2) return null;
      
      const getVal = (key: string) => {
        const normalizedKey = key.toUpperCase().replace(/[\s_]/g, '');
        const idx = headers.indexOf(normalizedKey);
        return idx !== -1 ? (columns[idx] || '').trim() : '';
      };

      const nip = getVal('NIP').replace(/['\s]/g, '');
      const nama = getVal('NAMA');
      if (!nama || !nip) return null;

      const rawUnit = (getVal('unitKerja') || getVal('UNITKERJA') || getVal('DIREKTORAT') || 'Sekretariat DJKI').trim();
      const gol = getVal('GOLRUANG') || getVal('GOL');
      const jk = (getVal('JENISKELAMIN') || getVal('GENDER')).toUpperCase();
      const statusPeg = (getVal('STATUSPEGAWAI') || getVal('STATUS') || 'Aktif').trim();

      return {
        id: (index + 1).toString(),
        nip,
        nama,
        jabatan: getVal('JABATAN').trim(),
        bagian: getVal('BAGIAN').trim(),
        unitKerja: rawUnit, 
        gender: jk.startsWith('P') ? 'P' : 'L',
        golRuang: gol,
        jenisPegawai: getVal('JENISPEGAWAI') as any,
        foto: getVal('FOTOURL') || getVal('FOTO'),
        tempatLahir: getVal('TEMPATLAHIR'),
        tanggalLahir: getVal('TANGGALLAHIR'),
        pangkat: getVal('PANGKAT') || getPangkatFromGol(gol),
        tmtPangkat: getVal('TMTPANGKAT'),
        klasifikasiJabatan: (getVal('KLASIFIKASIJABATAN') || getVal('KLASIFIKASI') || getVal('JENISJABATAN')).trim(),
        eselon: getVal('ESELON'),
        pendidikan: getVal('PENDIDIKAN'),
        bidang: getVal('BIDANG'),
        agama: getVal('AGAMA'),
        telepon: getVal('NOTELEPON') || getVal('WA'),
        alamat: getVal('ALAMAT'),
        tmtJabatan: getVal('TMTJABATAN'),
        tmtStatus: getVal('TMTSTATUS'),
        status: statusPeg as any
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
    
    const hIdx = (key: string) => headers.indexOf(key.toUpperCase().replace(/[\s_]/g, ''));
    
    const idxNip = hIdx('NIP');
    const idxName = hIdx('NAME');
    const idxPass = hIdx('PASSWORD');
    const idxRole = hIdx('ROLE');

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
