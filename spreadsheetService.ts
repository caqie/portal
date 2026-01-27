
import { Pegawai, AdminUser, Laporan, Dossier, SKP, PAK, KenaikanKarir, Pengembangan, KGB, CloudConfig, TugasRutin, Kegiatan, ABKAnjab, SpmtSppRecord, PAKRecord } from './types';
import { getPangkatFromGol, getGajiEstimasi, resolveEducationInfo } from './constants';

const DEFAULT_SPREADSHEET_ID = '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4'; 
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9zyZrLGmDBRlUOdR1pgftxDfcElY_Fd4BfsCR4Fmd7Qb58MJKAllRkUloFQrbs8lY/exec';

export const DEFAULT_GIDS = {
  USERS: '1215792031',
  PEGAWAI: '1631838106',
  DOSSIER: '958942051',
  SKP: '1037719914',
  PAK: '1699747260',
  KENAIKAN: '108729233',
  PENGEMBANGAN: '747902508',
  KGB: '1233453234',
  ABSENSI: '1044338428',
  TUGAS_RUTIN: '457929061',
  LAPORAN: '555034467',
  KEGIATAN: '456342206',
  ABK_ANJAB: '11',
  PELANTIKAN: '12',
  SPMT_SPP: '13',
  PENSIUN: '985690424'
};

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedCloud = localStorage.getItem('portal_cloud_config');
  let cloud: CloudConfig;
  try {
    cloud = savedCloud ? JSON.parse(savedCloud) : { driveFolderId: '', appsScriptUrl: DEFAULT_APPS_SCRIPT_URL, logoUrl: '' };
  } catch (e) {
    cloud = { driveFolderId: '', appsScriptUrl: DEFAULT_APPS_SCRIPT_URL, logoUrl: '' };
  }
  return {
    spreadsheetId: (savedId && savedId.trim() !== '') ? savedId : DEFAULT_SPREADSHEET_ID,
    appsScriptUrl: (cloud.appsScriptUrl && cloud.appsScriptUrl.trim() !== '') ? cloud.appsScriptUrl : DEFAULT_APPS_SCRIPT_URL
  };
};

export const syncGidMap = async (): Promise<boolean> => {
  const { appsScriptUrl, spreadsheetId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl === "") return false;
  try {
    const response = await fetch(`${appsScriptUrl}?ssId=${spreadsheetId}`, { method: 'GET', mode: 'cors' });
    if (!response.ok) return false;
    const data = await response.json();
    if (data.success && data.gidMap) {
      localStorage.setItem('portal_gid_map', JSON.stringify(data.gidMap));
      return true;
    }
    return false;
  } catch (e) { return false; }
};

export const getGid = (moduleKey: keyof typeof DEFAULT_GIDS): string => {
  const savedMapRaw = localStorage.getItem('portal_gid_map');
  const targetKey = moduleKey.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (savedMapRaw) {
    try {
      const map = JSON.parse(savedMapRaw);
      for (const key in map) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalizedKey === targetKey || normalizedKey.includes(targetKey) || targetKey.includes(normalizedKey)) {
          return map[key];
        }
      }
    } catch (e) {}
  }
  return (DEFAULT_GIDS as any)[moduleKey];
};

export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  const { appsScriptUrl, spreadsheetId } = getDbConfig();
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        module: moduleName.toUpperCase().trim(), 
        action: action, 
        spreadsheetId: spreadsheetId,
        timestamp: new Date().toISOString(), 
        payload: data 
      })
    });
    const result = await response.json();
    return result.success === true;
  } catch (error) { return false; }
};

export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string): Promise<{success: boolean, fileUrl?: string, message?: string}> => {
  const { appsScriptUrl } = getDbConfig();
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'UPLOAD', payload: { fileName, mimeType, base64 } })
    });
    return await response.json();
  } catch (error) { return { success: false, message: "Gagal terhubung ke Cloud." }; }
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

const validateCsvContent = (text: string) => {
  if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
    throw new Error("Akses Spreadsheet Ditolak.");
  }
};

export const fetchPegawaiFromSheets = async (): Promise<Pegawai[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = getGid('PEGAWAI');
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    validateCsvContent(csvText);
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    const data = lines.slice(1).map((line, index) => {
      const columns = splitCSVLine(line);
      const getVal = (keys: string[]) => {
        for (const key of keys) {
          const idx = headers.indexOf(key.toUpperCase().replace(/[\s_]/g, ''));
          if (idx !== -1) return columns[idx] || '';
        }
        return '';
      };

      const nama = getVal(['NAMA']);
      const gelar = getVal(['GELAR']); 
      let pendidikan = getVal(['PENDIDIKAN']);
      
      if (!pendidikan || pendidikan.trim() === '') {
        const info = resolveEducationInfo(gelar || nama);
        if (info) pendidikan = info.display;
      }

      return {
        id: getVal(['ID']) || (index + 1).toString(),
        nip: getVal(['NIP']).replace(/\D/g, ''),
        nama: nama,
        gelar: gelar,
        jabatan: getVal(['JABATAN']),
        unitKerja: getVal(['UNITKERJA']) || 'DJKI',
        gender: (getVal(['JENISKELAMIN']).toUpperCase().startsWith('P')) ? 'P' : 'L',
        golRuang: getVal(['GOLRUANG']),
        jenisPegawai: getVal(['JENISPEGAWAI']) as any,
        foto: getVal(['FOTO', 'FOTOURL', 'AVATAR', 'IMAGE', 'FOTO_URL']),
        status: (getVal(['STATUS']) || 'Aktif') as any,
        pangkat: getVal(['PANGKAT']),
        tmtPangkat: getVal(['TMTPANGKAT']),
        pendidikan: pendidikan,
        tmtStatus: getVal(['TMTSTATUS']),
        tempatLahir: getVal(['TEMPATLAHIR']),
        tanggalLahir: getVal(['TANGGALLAHIR']),
        alamat: getVal(['ALAMAT']),
        telepon: getVal(['TELEPON']),
        agama: getVal(['AGAMA']),
        eselon: getVal(['ESELON']),
        tmtJabatan: getVal(['TMTJABATAN']),
        klasifikasiJabatan: getVal(['KLASIFIKASIJABATAN']),
        bidang: getVal(['BIDANG'])
      } as Pegawai;
    }).filter(p => p.nama && p.nip);
    if (data.length > 0) localStorage.setItem('portal_pegawai_db', JSON.stringify(data));
    return data;
  } catch (error) {
    const saved = localStorage.getItem('portal_pegawai_db');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
};

export const fetchUsersFromSheets = async (): Promise<AdminUser[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = getGid('USERS');
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    validateCsvContent(csvText);
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    return lines.slice(1).map((line, idx) => {
      const cols = splitCSVLine(line);
      const get = (keys: string[]) => {
        for (const k of keys) {
          const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, ''));
          if (i !== -1) return cols[i] || '';
        }
        return '';
      };
      return { id: get(['ID']), nip: get(['NIP']).replace(/\D/g, ''), name: get(['NAME', 'NAMA']), password: get(['PASSWORD']), role: (get(['ROLE']) || 'Viewer') as any, foto: get(['FOTO']) };
    }).filter(u => u.nip && u.name);
  } catch (e) { return []; }
};

export const fetchTableData = async <T>(gidKey: keyof typeof DEFAULT_GIDS, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null): Promise<T[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = getGid(gidKey);
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    validateCsvContent(csvText);
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map(h => h.trim().toUpperCase().replace(/[\s_]/g, ''));
    const result = lines.slice(1).map(line => mapper(splitCSVLine(line), headers)).filter((item): item is T => item !== null);
    if (result.length > 0) localStorage.setItem(storageKey, JSON.stringify(result));
    return result;
  } catch (error) {
    const saved = localStorage.getItem(storageKey);
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }
};

export const fetchDossiersFromSheets = () => fetchTableData<Dossier>('DOSSIER', 'portal_dossiers_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tanggal: get('TANGGAL'), keterangan: get('KETERANGAN'), fileName: get('FILENAME'), fileUrl: get('FILEURL') };
});

export const fetchTugasRutinFromSheets = () => fetchTableData<TugasRutin>('TUGAS_RUTIN', 'tugas_rutin_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  const getJson = (k: string) => { 
    const val = get(k); 
    if (!val) return {};
    try { 
      return JSON.parse(val); 
    } catch(e) { 
      return val; 
    } 
  };
  return { id: get('ID'), timestamp: get('TIMESTAMP'), bulan: get('BULAN'), tahun: parseInt(get('TAHUN')) || 0, jenis: get('JENIS') as any, detail: get('DETAIL'), data: getJson('DATA') };
});

export const fetchSKPFromSheets = () => fetchTableData<SKP>('SKP', 'skp_pro_db_v2', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tahun: parseInt(get('TAHUN')) || 0, predikatKinerja: get('PREDIKATKINERJA'), capaianOrganisasi: get('CAPAIANORGANISASI') } as any;
});

export const fetchPAKFromSheets = () => fetchTableData<PAKRecord>('PAK', 'pak_pro_db_v4', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), periode: get('PERIODE'), jumlahKredit: parseFloat(get('JUMLAHKREDIT')) || 0, status: get('STATUS') as any } as any;
});

export const fetchKenaikanFromSheets = () => fetchTableData<KenaikanKarir>('KENAIKAN', 'portal_kenaikan_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), jenisUsulan: get('JENISUSULAN') as any, dari: get('DARI'), menjadi: get('MENJADI'), tmtUsulan: get('TMTUSULAN'), status: get('STATUS') as any };
});

export const fetchPengembanganFromSheets = () => fetchTableData<Pengembangan>('PENGEMBANGAN', 'portal_pengembangan_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), namaKegiatan: get('NAMAKEGIATAN'), tanggalMulai: get('TANGGALMULAI'), tanggalSelesai: get('TANGGALSELESAI'), jumlahJpl: parseInt(get('JUMLAHJPL')) || 0, penyelenggara: get('PENYELENGGARA') };
});

export const fetchKGBFromSheets = () => fetchTableData<KGB>('KGB', 'portal_kgb_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tmtLama: get('TMTLAMA'), tmtBaru: get('TMTBARU'), gajiLama: parseFloat(get('GAJILAMA')) || 0, gajiBaru: parseFloat(get('GAJIBARU')) || 0, nomorSk: get('NOMORSK'), tglSk: get('TGLSk'), status: get('STATUS') as any };
});

export const fetchKegiatanFromSheets = () => fetchTableData<Kegiatan>('KEGIATAN', 'portal_agenda_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), tanggal: get('TANGGAL'), judulKegiatan: get('JUDULKEGIATAN'), tempat: get('TEMPAT'), jumlahPeserta: parseInt(get('JUMLAHPESERTA')) || 0, asalPeserta: get('ASALPESERTA'), laporanSingkat: get('LAPORANSINGKAT'), linkDriveFoto: get('LINKDRIVEFOTO'), status: get('STATUS') as any };
});

export const fetchABKAnjabFromSheets = () => fetchTableData<ABKAnjab>('ABK_ANJAB', 'portal_abk_anjab_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), namaJabatan: get('NAMAJABATAN'), unitKerja: get('UNITKERJA'), jumlahSaatIni: parseInt(get('JUMLAHSAATINI')) || 0, status: get('STATUS') as any } as any;
});

export const getRetirementDetails = (nip: string, jabatan: string, klasifikasi?: string) => {
  const cleanNip = (nip || '').replace(/\D/g, '');
  if (cleanNip.length < 8) return null;
  const birthYear = parseInt(cleanNip.substring(0, 4));
  const birthMonth = parseInt(cleanNip.substring(4, 6)) - 1;
  
  let usiaPensiun = 58;
  const j = (jabatan || '').toUpperCase();
  
  if (j.includes('UTAMA')) {
    usiaPensiun = 65;
  } else if (
    j.includes('MADYA') || 
    j.includes('DIREKTUR') || 
    j.includes('SEKRETARIS DIREKTORAT')
  ) {
    usiaPensiun = 60;
  }
  
  const tmtPensiun = new Date(birthYear + usiaPensiun, birthMonth + 1, 1);
  const now = new Date();
  const diffTime = tmtPensiun.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  let sisaMasaKerja = diffDays <= 0 ? "Pensiun" : `${Math.floor(diffDays / 365)} thn ${Math.floor((diffDays % 365) / 30)} bln`;
  return { tmtPensiun, sisaMasaKerja };
};

export const fetchSPMTSPPFromSheets = () => fetchTableData<SpmtSppRecord>('SPMT_SPP', 'portal_spmt_spp_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_]/g, '')); return i !== -1 ? cols[i] : ''; };
  return { id: get('ID'), type: get('TYPE') as any, nomor: get('NOMOR'), pejabatNip: get('PEJABATNIP'), pegawaiNip: get('PEGAWAINIP'), nomorSK: get('NOMORSK'), tentangSK: get('TENTANGSK'), tanggalSK: get('TANGGALSK'), jabatanBaru: get('JABATANBARU'), unitKerja: get('UNITKERJA'), tanggalLantikAtauSpmt: get('TANGGALLANTIKATAUSPMT'), tanggalSppAtauSpmt: get('TANGGALSppATAUSPMT'), tempatTandaTangan: get('TEMPAT TANDATANGAN'), signatureLabel: get('SIGNATURELABEL') };
});
