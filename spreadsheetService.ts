
import { Pegawai, AdminUser, Laporan, Dossier, SKP, PAK, KenaikanKarir, Pengembangan, KGB, CloudConfig } from './types';
import { getPangkatFromGol, getGajiEstimasi } from './constants';

const DEFAULT_SPREADSHEET_ID = '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4'; 
const DEFAULT_PEGAWAI_GID = '1631838106';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9zyZrLGmDBRlUOdR1pgftxDfcElY_Fd4BfsCR4Fmd7Qb58MJKAllRkUloFQrbs8lY/exec';

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedGid = localStorage.getItem('db_pegawai_gid');
  const savedCloud = localStorage.getItem('portal_cloud_config');
  const cloud: CloudConfig = savedCloud ? JSON.parse(savedCloud) : { driveFolderId: '', appsScriptUrl: DEFAULT_APPS_SCRIPT_URL, logoUrl: '' };
  
  return {
    spreadsheetId: savedId || DEFAULT_SPREADSHEET_ID,
    pegawaiGid: savedGid || DEFAULT_PEGAWAI_GID,
    appsScriptUrl: cloud.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL
  };
};

/**
 * Upload file ke Google Drive (PRO VERSION)
 */
export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string): Promise<{success: boolean, fileUrl?: string, message?: string}> => {
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl === "") return { success: false, message: "Apps Script URL belum diatur di halaman Settings" };

  try {
    // Karena Google Apps Script melakukan redirect saat POST, kita kirim dalam mode 'cors'
    // tapi karena responnya seringkali opaque, kita harus pastikan Apps Script mengembalikan teks JSON murni.
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'UPLOAD',
        payload: { fileName, mimeType, base64 }
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Upload error:", error);
    return { 
      success: false, 
      message: "Terjadi kesalahan koneksi ke Google. Pastikan Apps Script di-deploy sebagai 'Anyone' dan URL sudah benar." 
    };
  }
};

/**
 * Sinkronisasi data ke Cloud (Google Sheets melalui Apps Script)
 */
export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl === "") return false;

  try {
    const payload = JSON.stringify({
      module: moduleName,
      action: action,
      timestamp: new Date().toISOString(),
      payload: data
    });

    // Gunakan no-cors untuk SAVE/DELETE agar tidak terhambat preflight jika hanya butuh 'fire and forget'
    // Namun untuk data krusial, mode cors lebih baik jika Apps Script mendukung.
    await fetch(appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain' },
      body: payload
    });
    return true;
  } catch (error) {
    console.error(`Sync error on ${moduleName}:`, error);
    return false;
  }
};

export const updatePegawaiRemote = async (pegawai: Pegawai): Promise<boolean> => {
  return await syncTableRemote('PEGAWAI', 'SAVE', pegawai);
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
  const cleanNip = (nip || '').replace(/\D/g, '');
  if (cleanNip.length < 14) return 0;
  const tmtYearStr = cleanNip.substring(8, 12);
  const tmtYear = parseInt(tmtYearStr);
  if (isNaN(tmtYear)) return getGajiEstimasi(gol, 0);
  
  const currentYear = new Date().getFullYear();
  const mk = Math.max(0, currentYear - tmtYear);
  return getGajiEstimasi(gol, mk);
};

export const calculateRetirementDate = (nip: string, jabatan: string, klasifikasi?: string): Date | null => {
  const details = getRetirementDetails(nip, jabatan, klasifikasi);
  return details?.tmtPensiun || null;
};

export const getRetirementDetails = (nip: string, jabatan: string, klasifikasi?: string) => {
  const cleanNip = (nip || '').replace(/\D/g, '');
  if (cleanNip.length < 8) return null;
  
  const birthYear = parseInt(cleanNip.substring(0, 4));
  const birthMonth = parseInt(cleanNip.substring(4, 6)) - 1; 
  const birthDay = parseInt(cleanNip.substring(6, 8));
  
  if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null;
  
  const birthDate = new Date(birthYear, birthMonth, birthDay);
  if (isNaN(birthDate.getTime())) return null;

  const now = new Date();
  const jab = (jabatan || '').toUpperCase();
  const klas = (klasifikasi || '').toUpperCase();
  
  let usiaPensiun = 58; 
  if (klas.includes('UTAMA')) usiaPensiun = 65;
  else if (klas.includes('MADYA') || klas.includes('PIMPINAN TINGGI')) usiaPensiun = 60;
  else if (klas.includes('PERTAMA') || klas.includes('MUDA') || klas.includes('PELAKSANA') || klas.includes('KETERAMPILAN') || klas.includes('ADMINISTRASI') || klas.includes('ADMIN')) usiaPensiun = 58;
  else {
    if (jab.includes('UTAMA')) usiaPensiun = 65;
    else if (jab.includes('MADYA') || jab.includes('DIREKTUR') || jab.includes('KEPALA KANTOR') || jab.includes('PIMPINAN')) usiaPensiun = 60;
    else if (jab.includes('PERTAMA') || jab.includes('MUDA') || jab.includes('PELAKSANA') || jab.includes('ADMIN')) usiaPensiun = 58;
  }

  const tglPensiun = new Date(birthYear + usiaPensiun, birthMonth, birthDay);
  let tmtMonth = birthMonth + 1;
  let tmtYear = birthYear + usiaPensiun;
  if (tmtMonth > 11) { tmtMonth = 0; tmtYear += 1; }
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
  return { birthDate, tglPensiun, tmtPensiun, usiaPensiun, currentAge, sisaMasaKerja, mpp: mppDate, jenisPensiun: 'BUP' };
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
      
      const getVal = (keyVariations: string[]) => {
        for (const key of keyVariations) {
          const normalizedKey = key.toUpperCase().replace(/[\s_]/g, '');
          const idx = headers.indexOf(normalizedKey);
          if (idx !== -1 && columns[idx]) return (columns[idx] || '').trim();
        }
        return '';
      };

      const rawNip = getVal(['NIP', 'NOMORINDUK']);
      const nip = rawNip.replace(/\D/g, ''); 
      const nama = getVal(['NAMA', 'NAMAPEGAWAI', 'FULLNAME']);
      if (!nama || !nip) return null;

      const rawUnit = getVal(['UNITKERJA', 'DIREKTORAT', 'KERJA', 'ORGANISASI']) || 'Sekretariat DJKI';
      const gol = getVal(['GOLRUANG', 'GOL', 'GOLONGAN']);
      const jk = (getVal(['JENISKELAMIN', 'GENDER', 'JK']) || 'L').toUpperCase();
      const statusPeg = getVal(['STATUSPEGAWAI', 'STATUS', 'AKTIF']) || 'Aktif';

      return {
        id: (index + 1).toString(),
        nip,
        nama,
        jabatan: getVal(['JABATAN', 'NAMAJABATAN', 'POSISI']),
        bagian: getVal(['BAGIAN', 'SUBBAGIAN', 'SEKSI', 'POKJA']),
        unitKerja: rawUnit, 
        gender: (jk.startsWith('P') || jk.includes('WANITA')) ? 'P' : 'L',
        golRuang: gol,
        jenisPegawai: getVal(['JENISPEGAWAI', 'KATEGORI', 'STATUSASN']) as any,
        foto: getVal(['FOTOURL', 'FOTO', 'LINKFOTO', 'PICTURE']),
        tempatLahir: getVal(['TEMPATLAHIR', 'TMPLAHIR']),
        tanggalLahir: getVal(['TANGGALLAHIR', 'TGLLAHIR']),
        pangkat: getVal(['PANGKAT', 'RANK']) || getPangkatFromGol(gol),
        tmtPangkat: getVal(['TMTPANGKAT', 'TMTGOLONGAN']),
        klasifikasiJabatan: getVal(['KLASIFIKASIJABATAN', 'KLASIFIKASI', 'JENISJABATAN']),
        eselon: getVal(['ESELON', 'LEVEL']),
        pendidikan: getVal(['PENDIDIKAN', 'PENDIDIKANTERAKHIR', 'JENJANG', 'IJAZAH']),
        bidang: getVal(['BIDANG', 'BIDANGSTUDI', 'JURUSAN', 'PROGRAMSTUDI', 'PROGDI']),
        agama: getVal(['AGAMA', 'RELIGION']),
        telepon: getVal(['NOTELEPON', 'WA', 'HP', 'TELP', 'PHONE']),
        alamat: getVal(['ALAMAT', 'DOMISILI', 'ADDRESS']),
        tmtJabatan: getVal(['TMTJABATAN', 'TMT_JABATAN']),
        tmtStatus: getVal(['TMTSTATUS', 'TMTASN', 'TMTSTATUSPEGAWAI']),
        status: statusPeg as any
      } as Pegawai;
    });

    const filtered = result.filter((p): p is Pegawai => p !== null && !!p.nama);
    localStorage.setItem('portal_pegawai_db', JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error("Fetch Pegawai Error:", error);
    const saved = localStorage.getItem('portal_pegawai_db');
    return saved ? JSON.parse(saved) : [];
  }
};

/**
 * Fetch generic data from a sheet using GID
 */
const fetchTableData = async <T>(gidKey: string, defaultGid: string, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null): Promise<T[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = localStorage.getItem(gidKey) || defaultGid;
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    if (!response.ok) throw new Error(`Gagal akses spreadsheet GID: ${gid}`);
    
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    const dataRows = lines.slice(1);

    const result = dataRows.map(line => mapper(splitCSVLine(line), headers)).filter((item): item is T => item !== null);
    localStorage.setItem(storageKey, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`Fetch Error (${storageKey}):`, error);
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  }
};

export const fetchUsersFromSheets = () => fetchTableData<AdminUser>('db_users_gid', '0', 'portal_users_db', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    name: get(['NAME', 'NAMA']),
    password: get(['PASSWORD', 'SANDI']),
    role: get(['ROLE', 'AKSES']) as any,
    foto: get(['FOTO', 'PICTURE'])
  };
});

export const fetchDossiersFromSheets = () => fetchTableData<Dossier>('db_dossier_gid', '1', 'portal_dossiers_db', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    namaPegawai: get(['NAMAPEGAWAI', 'NAMA']),
    tanggal: get(['TANGGAL', 'DATE']),
    keterangan: get(['KETERANGAN', 'DESC']),
    fileName: get(['FILENAME', 'NAMAFILE']),
    fileUrl: get(['FILEURL', 'LINK']),
    driveFileId: get(['DRIVEFILEID'])
  };
});

export const fetchSKPFromSheets = () => fetchTableData<SKP>('db_skp_gid', '2', 'skp_pro_db_v2', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    namaPegawai: get(['NAMAPEGAWAI', 'NAMA']),
    tahun: parseInt(get(['TAHUN', 'YEAR'])) || 0,
    nilaiKinerja: parseFloat(get(['NILAIKINERJA'])) || 0,
    nilaiPerilaku: parseFloat(get(['NILAIPERILAKU'])) || 0,
    predikat: get(['PREDIKAT']) as any,
    fileUrl: get(['FILEURL', 'LINK'])
  };
});

export const fetchPAKFromSheets = () => fetchTableData<PAK>('db_pak_gid', '3', 'pak_pro_db_v4', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    namaPegawai: get(['NAMAPEGAWAI', 'NAMA']),
    periode: get(['PERIODE']),
    jumlahKredit: parseFloat(get(['JUMLAHKREDIT', 'AK'])) || 0,
    keterangan: get(['KETERANGAN']),
    status: get(['STATUS']) as any
  };
});

export const fetchKenaikanFromSheets = () => fetchTableData<KenaikanKarir>('db_kenaikan_gid', '4', 'portal_kenaikan_db', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    namaPegawai: get(['NAMAPEGAWAI', 'NAMA']),
    jenisUsulan: get(['JENISUSULAN', 'TYPE']) as any,
    dari: get(['DARI', 'FROM']),
    menjadi: get(['MENJADI', 'TO']),
    tmtUsulan: get(['TMTUSULAN', 'TMT']),
    status: get(['STATUS']) as any
  };
});

export const fetchPengembanganFromSheets = () => fetchTableData<Pengembangan>('db_pengembangan_gid', '5', 'portal_pengembangan_db', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    namaPegawai: get(['NAMAPEGAWAI', 'NAMA']),
    namaKegiatan: get(['NAMAKEGIATAN', 'KEGIATAN']),
    tanggalMulai: get(['TANGGALMULAI', 'STARTDATE']),
    tanggalSelesai: get(['TANGGALSELESAI', 'ENDDATE']),
    jumlahJpl: parseInt(get(['JUMLAHJPL', 'JPL'])) || 0,
    penyelenggara: get(['PENYELENGGARA']),
    sertifikatUrl: get(['SERTIFIKATURL', 'LINK'])
  };
});

export const fetchKGBFromSheets = () => fetchTableData<KGB>('db_kgb_gid', '6', 'portal_kgb_db', (cols, headers) => {
  const get = (keys: string[]) => {
    const idx = headers.findIndex(h => keys.some(k => k.toUpperCase().replace(/[\s_]/g, '') === h));
    return idx !== -1 ? cols[idx] : '';
  };
  return {
    id: get(['ID']),
    nip: get(['NIP']),
    namaPegawai: get(['NAMAPEGAWAI', 'NAMA']),
    tmtLama: get(['TMTLAMA']),
    tmtBaru: get(['TMTBARU']),
    gajiLama: parseFloat(get(['GAJILAMA'])) || 0,
    gajiBaru: parseFloat(get(['GAJIBARU'])) || 0,
    nomorSk: get(['NOMORSK']),
    tglSk: get(['TGLSK']),
    status: get(['STATUS']) as any
  };
});
