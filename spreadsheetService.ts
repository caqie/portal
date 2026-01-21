
import { Pegawai, AdminUser, Laporan, Dossier, SKP, PAK, KenaikanKarir, Pengembangan, KGB, CloudConfig } from './types';
import { getPangkatFromGol, getGajiEstimasi } from './constants';

const DEFAULT_SPREADSHEET_ID = '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4'; 
const DEFAULT_PEGAWAI_GID = '1631838106';
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9zyZrLGmDBRlUOdR1pgftxDfcElY_Fd4BfsCR4Fmd7Qb58MJKAllRkUloFQrbs8lY/exec';

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedCloud = localStorage.getItem('portal_cloud_config');
  const cloud: CloudConfig = savedCloud ? JSON.parse(savedCloud) : { driveFolderId: '', appsScriptUrl: DEFAULT_APPS_SCRIPT_URL, logoUrl: '' };
  
  return {
    spreadsheetId: savedId || DEFAULT_SPREADSHEET_ID,
    appsScriptUrl: cloud.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL
  };
};

/**
 * Memastikan koneksi ke Backend aktif
 */
export const checkConnection = async (): Promise<boolean> => {
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl) return false;
  try {
    const response = await fetch(appsScriptUrl);
    const data = await response.json();
    return data.success === true;
  } catch (e) {
    return false;
  }
};

const DEFAULT_ADMIN: AdminUser = {
  id: 'root-admin',
  nip: '123456789012345678',
  name: 'SYSTEM ADMINISTRATOR',
  password: 'admin123',
  role: 'Superadmin',
  foto: ''
};

export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string): Promise<{success: boolean, fileUrl?: string, message?: string}> => {
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl) return { success: false, message: "Apps Script URL belum diatur." };

  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'UPLOAD',
        payload: { fileName, mimeType, base64 }
      })
    });
    return await response.json();
  } catch (error) {
    return { success: false, message: "Gagal terhubung ke Google Apps Script." };
  }
};

export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl) return false;

  try {
    const payload = JSON.stringify({
      module: moduleName,
      action: action,
      timestamp: new Date().toISOString(),
      payload: data
    });

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
  const tmtYear = parseInt(cleanNip.substring(8, 12));
  if (isNaN(tmtYear)) return getGajiEstimasi(gol, 0);
  const mk = Math.max(0, new Date().getFullYear() - tmtYear);
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
  
  const jab = (jabatan || '').toUpperCase();
  const klas = (klasifikasi || '').toUpperCase();
  let usiaPensiun = 58; 
  if (klas.includes('UTAMA')) usiaPensiun = 65;
  else if (klas.includes('MADYA') || klas.includes('PIMPINAN TINGGI')) usiaPensiun = 60;
  else if (klas.includes('PERTAMA') || klas.includes('MUDA') || klas.includes('PELAKSANA')) usiaPensiun = 58;

  let tmtMonth = birthMonth + 1;
  let tmtYear = birthYear + usiaPensiun;
  if (tmtMonth > 11) { tmtMonth = 0; tmtYear += 1; }
  const tmtPensiun = new Date(tmtYear, tmtMonth, 1);

  const diffTime = tmtPensiun.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let sisaMasaKerja = diffDays > 0 ? `${Math.floor(diffDays/365)} Thn ${Math.floor((diffDays%365)/30)} Bln` : 'Pensiun';

  return { birthDate, tmtPensiun, usiaPensiun, sisaMasaKerja };
};

export const fetchPegawaiFromSheets = async (): Promise<Pegawai[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = localStorage.getItem('db_pegawai_gid') || DEFAULT_PEGAWAI_GID;
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    if (!response.ok) throw new Error("Spreadsheet access denied");
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    
    const result = lines.slice(1).map((line, index) => {
      const columns = splitCSVLine(line);
      const getVal = (keys: string[]) => {
        for (const key of keys) {
          const idx = headers.indexOf(key.toUpperCase().replace(/[\s_]/g, ''));
          if (idx !== -1) return columns[idx] || '';
        }
        return '';
      };
      const nip = getVal(['NIP']).replace(/\D/g, '');
      const nama = getVal(['NAMA']);
      if (!nama || !nip) return null;

      return {
        id: (index + 1).toString(),
        nip, nama,
        jabatan: getVal(['JABATAN']),
        unitKerja: getVal(['UNITKERJA']) || 'DJKI',
        gender: (getVal(['JENISKELAMIN']).toUpperCase().startsWith('P')) ? 'P' : 'L',
        golRuang: getVal(['GOLRUANG']),
        jenisPegawai: getVal(['JENISPEGAWAI']) as any,
        foto: getVal(['FOTOURL']),
        status: (getVal(['STATUS']) || 'Aktif') as any,
        pangkat: getVal(['PANGKAT']) || getPangkatFromGol(getVal(['GOLRUANG'])),
        tmtPangkat: getVal(['TMTPANGKAT']),
        tempatLahir: getVal(['TEMPATLAHIR']),
        tanggalLahir: getVal(['TANGGALLAHIR']),
        pendidikan: getVal(['PENDIDIKAN']),
        bidang: getVal(['BIDANG']),
        agama: getVal(['AGAMA']),
        telepon: getVal(['TELEPON']),
        alamat: getVal(['ALAMAT']),
        tmtJabatan: getVal(['TMTJABATAN']),
        tmtStatus: getVal(['TMTSTATUS'])
      } as Pegawai;
    }).filter((p): p is Pegawai => p !== null);

    localStorage.setItem('portal_pegawai_db', JSON.stringify(result));
    return result;
  } catch (error) {
    const saved = localStorage.getItem('portal_pegawai_db');
    return saved ? JSON.parse(saved) : [];
  }
};

const fetchTableData = async <T>(gidKey: string, defaultGid: string, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null): Promise<T[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = localStorage.getItem(gidKey) || defaultGid;
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    const result = lines.slice(1).map(line => mapper(splitCSVLine(line), headers)).filter((item): item is T => item !== null);
    localStorage.setItem(storageKey, JSON.stringify(result));
    return result;
  } catch (error) {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  }
};

export const fetchUsersFromSheets = async () => {
  const fetched = await fetchTableData<AdminUser>('db_users_gid', '0', 'portal_users_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), name: get('NAME'), password: get('PASSWORD'), role: get('ROLE') as any, foto: get('FOTO') };
  });
  return fetched.some(u => u.nip === DEFAULT_ADMIN.nip) ? fetched : [DEFAULT_ADMIN, ...fetched];
};

export const fetchDossiersFromSheets = () => fetchTableData<Dossier>('db_dossier_gid', '1', 'portal_dossiers_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tanggal: get('TANGGAL'), keterangan: get('KETERANGAN'), fileName: get('FILENAME'), fileUrl: get('FILEURL') };
});

export const fetchSKPFromSheets = () => fetchTableData<SKP>('db_skp_gid', '2', 'skp_pro_db_v2', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tahun: parseInt(get('TAHUN')) || 0, nilaiKinerja: 0, nilaiPerilaku: 0, predikat: 'Baik' as any, fileUrl: get('FILEURL') };
});

export const fetchPAKFromSheets = () => fetchTableData<PAK>('db_pak_gid', '3', 'pak_pro_db_v4', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), periode: get('PERIODE'), jumlahKredit: parseFloat(get('JUMLAHKREDIT')) || 0, keterangan: get('KETERANGAN'), status: 'Selesai' as any };
});

export const fetchKenaikanFromSheets = () => fetchTableData<KenaikanKarir>('db_kenaikan_gid', '4', 'portal_kenaikan_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), jenisUsulan: get('JENISUSULAN') as any, dari: get('DARI'), menjadi: get('MENJADI'), tmtUsulan: get('TMTUSULAN'), status: get('STATUS') as any };
});

export const fetchPengembanganFromSheets = () => fetchTableData<Pengembangan>('db_pengembangan_gid', '5', 'portal_pengembangan_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), namaKegiatan: get('NAMAKEGIATAN'), tanggalMulai: get('TANGGALMULAI'), tanggalSelesai: get('TANGGALSELESAI'), jumlahJpl: parseInt(get('JUMLAHJPL')) || 0, penyelenggara: get('PENYELENGGARA') };
});

export const fetchKGBFromSheets = () => fetchTableData<KGB>('db_kgb_gid', '6', 'portal_kgb_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tmtLama: get('TMTLAMA'), tmtBaru: get('TMTBARU'), gajiLama: parseFloat(get('GAJILAMA')) || 0, gajiBaru: parseFloat(get('GAJIBARU')) || 0, nomorSk: get('NOMORSK'), tglSk: get('TGLSK'), status: get('STATUS') as any };
});
