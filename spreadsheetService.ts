
import { Pegawai, AdminUser, Laporan, Dossier, Pengembangan, KGB, CloudConfig, TugasRutin, Kegiatan, ABKAnjab, SpmtSppRecord, PAKRecord, MagangPKL, SKPRecord, PersuratanRecord, KenaikanKarir, SatyaLencanaRecord, KeuanganRecord, AbsensiConfig, SystemConfig, BankSoal, PesertaUkom, HasilUkom, PenilaianTalenta, TalentPool, AssessmentTalenta, NineBoxTalenta, PengembanganTalenta } from './types';

const DEFAULT_SPREADSHEET_ID = '1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4'; 
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby8dTUPkAb1f8EeH3DxXjTd9IZ-yAMUWxSfci9ZBLkMf3gxH3as4GlALPtER6JM-BWD/exec';
const DEFAULT_DRIVE_FOLDER_ID = '19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O';

export const DEFAULT_GIDS = {
  USERS: '1215792031',
  PEGAWAI: '1631838106',
  DOSSIER: '1228512575',
  SKP: '1037719914',
  PAK: '1699747260',
  KENAIKAN: '108729233',
  PENGEMBANGAN: '747902508',
  KGB: '1233453234',
  ABSENSI: '1044338428',
  CONFIG: '398812913', 
  TUGAS_RUTIN: '457929061',
  LAPORAN: '555034467',
  KEGIATAN: '456342206',
  ABK_ANJAB: '922561147',
  PELANTIKAN: '559339264', 
  SPMT_SPP: '2105382325',
  PENSIUN: '985690424',
  MAGANG_PKL: '1436884143',
  PERSURATAN: '2080049158',
  SATYA_LENCANA: '333444555',
  KEUANGAN: '111444065',
  BANK_SOAL: '1585181979',
  PESERTA_UKOM: '2100046442',
  HASIL_UKOM: '777888999',
  UKOM_SESSIONS: '1122334455',
  PENILAIAN_TALENTA: '718101',
  TALENT_POOL: '718102',
  ASSESSMENT_TALENTA: '718103',
  NINEBOX: '718104',
  PENGEMBANGAN_TALENTA: '718105'
};

export const EXPECTED_COLUMNS_SCHEMA = {
  USERS: ['ID', 'NIP', 'NAME', 'PASSWORD', 'ROLE', 'STATUS'],
  PEGAWAI: ['ID', 'NIP', 'NAMA', 'JABATAN', 'UNIT KERJA', 'GOL RUANG', 'JENIS PEGAWAI', 'STATUS'],
  DOSSIER: ['ID', 'NIP', 'NAMAPEGAWAI', 'FILENAME', 'FILEURL'],
  SKP: ['ID', 'NIP', 'NAMAPEGAWAI', 'TAHUN', 'PREDIKATKINERJA'],
  PAK: ['ID', 'NIP', 'NAMAPEGAWAI', 'NOMOR', 'JUMLAHKREDIT'],
  KENAIKAN: ['ID', 'NIP', 'NAMAPEGAWAI', 'DARI', 'MENJADI', 'STATUS'],
  PENGEMBANGAN: ['ID', 'NIP', 'NAMAPEGAWAI', 'NAMAKEGIATAN', 'JUMLAHJPL', 'TAHUN'],
  KGB: ['ID', 'NIP', 'NAMAPEGAWAI', 'TMTLAMA', 'TMTBARU', 'GAJIBARU', 'STATUS'],
  TUGAS_RUTIN: ['ID', 'TIMESTAMP', 'BULAN', 'TAHUN', 'JENIS', 'DATA'],
  KEGIATAN: ['ID', 'JUDULKEGIATAN', 'TANGGAL', 'TEMPAT', 'STATUS'],
  ABK_ANJAB: ['ID', 'NAMAJABATAN', 'UNITKERJA', 'KEBUTUHANPEGAWAI'],
  PELANTIKAN: ['ID', 'NOMOR', 'ASNNIP', 'DATA'],
  PENSIUN: ['ID', 'NIP', 'NAMAPEGAWAI', 'DATA'],
  MAGANG_PKL: ['ID', 'NAMA', 'INSTITUSI', 'STATUS'],
  PERSURATAN: ['ID', 'JENISSURAT', 'NOMORSURAT', 'PREHAL', 'STATUS'],
  SATYA_LENCANA: ['ID', 'NIP', 'NAMAPEGAWAI', 'KATEGORI', 'TAHUNTERIMA'],
  KEUANGAN: ['ID', 'NAMAKEGIATAN', 'TANGGAL', 'STATUS', 'MATAANGGARAN', 'TAHUNANGGARAN', 'PPKNIP', 'PPKNAMA', 'BENDAHARANIP', 'BENDAHARANAMA', 'UNITKERJA', 'KETERANGAN', 'TRANSACTIONID', 'KOTATTD', 'TANGGALDOKUMEN', 'PESERTA', 'CONFIGBIAYA', 'CONFIGSPD'],
  BANK_SOAL: ['IDSOAL', 'PERTANYAAN', 'JAWABANBENAR'],
  PESERTA_UKOM: ['NOPESERTA', 'NAMA', 'JENJANG'],
  HASIL_UKOM: ['NOPESERTA', 'NAMA', 'TOTALNILAI'],
  PENILAIAN_TALENTA: ['ID', 'PEGAWAI_ID', 'NILAI_SKP', 'KOMPETENSI', 'INTEGRITAS', 'DISIPLIN', 'LEADERSHIP', 'TEAMWORK', 'INOVASI', 'KOMUNIKASI', 'PENDIDIKAN', 'PENGALAMAN', 'TOTAL_NILAI', 'KATEGORI_TALENTA', 'CREATED_AT'],
  TALENT_POOL: ['ID', 'PEGAWAI_ID', 'RANKING', 'STATUS_TALENTA', 'READINESS_LEVEL', 'REKOMENDASI_JABATAN', 'CREATED_AT'],
  ASSESSMENT_TALENTA: ['ID', 'PEGAWAI_ID', 'HASIL_ASSESSMENT', 'POTENSI', 'KOMPETENSI', 'ASSESSOR', 'CATATAN', 'TANGGAL_ASSESSMENT'],
  NINEBOX: ['ID', 'PEGAWAI_ID', 'KINERJA', 'POTENSI', 'POSISI_BOX', 'REKOMENDASI'],
  PENGEMBANGAN_TALENTA: ['ID', 'PEGAWAI_ID', 'JENIS_PENGEMBANGAN', 'NAMA_PELATIHAN', 'PENYELENGGARA', 'TANGGAL_MULAI', 'TANGGAL_SELESAI', 'STATUS']
};

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedCloud = localStorage.getItem('portal_cloud_config');
  let cloud: CloudConfig;
  try {
    cloud = savedCloud ? JSON.parse(savedCloud) : { driveFolderId: DEFAULT_DRIVE_FOLDER_ID, appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL), logoUrl: '' };
  } catch (e) {
    cloud = { driveFolderId: DEFAULT_DRIVE_FOLDER_ID, appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL), logoUrl: '' };
  }
  return {
    spreadsheetId: (savedId && savedId.trim() !== '') ? savedId : (import.meta.env.VITE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID),
    appsScriptUrl: (cloud.appsScriptUrl && cloud.appsScriptUrl.trim() !== '') ? cloud.appsScriptUrl : (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL),
    driveFolderId: cloud.driveFolderId || DEFAULT_DRIVE_FOLDER_ID
  };
};

export const loadSharedConfigFromServer = async (): Promise<void> => {
  try {
    const savedId = localStorage.getItem('db_spreadsheet_id');
    const savedCloud = localStorage.getItem('portal_cloud_config');
    
    // Check if the current client state has a custom (non-default and non-empty) Google Spreadsheet ID
    const hasCustomLocalId = savedId && savedId.trim() !== '' && savedId !== DEFAULT_SPREADSHEET_ID;
    
    const res = await fetch('/api/spreadsheet-config');
    if (res.ok) {
      const data = await res.json();
      
      // Case A: Server is fresh or has default fallback, but browser has a custom configurated ID.
      // We automatically register this ID on the server in the background so that it is shared globally!
      const isServerEmptyOrDefault = !data.spreadsheetId || data.spreadsheetId === DEFAULT_SPREADSHEET_ID;
      if (hasCustomLocalId && isServerEmptyOrDefault) {
        let cloudConfig = { appsScriptUrl: DEFAULT_APPS_SCRIPT_URL, driveFolderId: DEFAULT_DRIVE_FOLDER_ID };
        try {
          if (savedCloud) {
            const parsed = JSON.parse(savedCloud);
            if (parsed.appsScriptUrl) cloudConfig.appsScriptUrl = parsed.appsScriptUrl;
            if (parsed.driveFolderId) cloudConfig.driveFolderId = parsed.driveFolderId;
          }
        } catch (e) {}
        
        await saveSharedConfigToServer(savedId!, cloudConfig.appsScriptUrl, cloudConfig.driveFolderId);
        console.log("[Config Sync] Push local developer preview configs to server successfully!");
        return;
      }

      // Case B: Server has a custom configurated ID.
      // We force-pull it into the current client's localStorage so that all users have the correct database ID automatically!
      if (data.spreadsheetId) {
        const localId = localStorage.getItem('db_spreadsheet_id');
        const localCloudStr = localStorage.getItem('portal_cloud_config');
        const remoteCloudStr = JSON.stringify({
          appsScriptUrl: data.appsScriptUrl,
          driveFolderId: data.driveFolderId
        });
        
        if (localId !== data.spreadsheetId || localCloudStr !== remoteCloudStr) {
          localStorage.setItem('db_spreadsheet_id', data.spreadsheetId);
          localStorage.setItem('portal_cloud_config', remoteCloudStr);
          window.dispatchEvent(new Event('storage_updated'));
          console.log("[Config Sync] Loaded correct spreadsheet config from shared server storage.");
        }
      }
    }
  } catch (e) {
    console.error("Gagal melakukan penyesuaian konfigurasi cloud:", e);
  }
};

export const saveSharedConfigToServer = async (
  spreadsheetId: string, 
  appsScriptUrl: string, 
  driveFolderId: string
): Promise<boolean> => {
  try {
    const res = await fetch('/api/spreadsheet-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spreadsheetId, appsScriptUrl, driveFolderId })
    });
    return res.ok;
  } catch (e) {
    console.error("Gagal menyimpan konfigurasi ke cloud server:", e);
    return false;
  }
};

export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
  
  // Validation for DELETE action
  if (action === 'DELETE' && !data?.id && !data?.nip && !data?.nama) {
    console.warn(`Sync blocked: Action DELETE for module ${moduleName} requires id, nip, or nama. Received:`, data);
    return false;
  }

  const cleanUrl = appsScriptUrl.trim();
  try {
    const finalUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        module: moduleName.toUpperCase().trim(), 
        action: action, 
        spreadsheetId: spreadsheetId,
        driveFolderId: driveFolderId,
        timestamp: new Date().toISOString(), 
        payload: data 
      })
    });
    if (!response.ok) throw new Error(`Network error: ${response.status} ${response.statusText}`);
    const result = await response.json();
    if (!result.success) {
      console.error("Remote Sync Business Error:", result.message || "Unknown error", "Payload:", data);
    }
    return result.success === true;
  } catch (error) { 
    console.error("Remote Sync Exception:", error);
    return false; 
  }
};

export const getServerTime = async (): Promise<Date> => {
  const { appsScriptUrl } = getDbConfig();
  try {
    // We can use a simple GET request to a special action in Apps Script
    // Or just fetch headers from a reliable source if Apps Script is too slow.
    // For now, let's assume we can get it from Apps Script.
    const targetUrl = `${appsScriptUrl}?action=GET_TIME`;
    const finalUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(finalUrl);
    const data = await res.json();
    if (data.success && data.time) return new Date(data.time);
    return new Date();
  } catch (e) {
    return new Date();
  }
};

const safeParseArray = (raw: string | null): any[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const autoHealedKeys = new Set<string>();

const attemptAutoHeal = async (gidKey: keyof typeof DEFAULT_GIDS): Promise<boolean> => {
  if (autoHealedKeys.has(gidKey)) return false;
  autoHealedKeys.add(gidKey);
  
  const schema = (EXPECTED_COLUMNS_SCHEMA as any)[gidKey];
  if (!schema) return false;
  
  const { appsScriptUrl } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
  
  try {
    console.log(`[Auto-Heal] Lacking sheet or got error for ${gidKey}. Attempting remote initialization...`);
    const dummyRow: any = { id: `INIT-${Date.now()}` };
    schema.forEach((col: string) => {
      dummyRow[col.toLowerCase().replace(/[\s_]/g, '')] = "";
    });
    
    // Create missing sheet remote using Apps Script
    const ok = await syncTableRemote(gidKey, 'SAVE', dummyRow);
    if (ok) {
      // Immediately delete the dummy row
      await syncTableRemote(gidKey, 'DELETE', { id: dummyRow.id });
      // Sync local GID maps so we get the correct GID
      await syncGidMap();
      console.log(`[Auto-Heal] Successfully initialized sheet and synced GID for ${gidKey}!`);
      return true;
    }
  } catch (err) {
    console.error(`[Auto-Heal] Failed during repair of ${gidKey}:`, err);
  }
  return false;
};

export const fetchTableData = async <T>(gidKey: keyof typeof DEFAULT_GIDS, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null, bypassCache = false): Promise<T[]> => {
  const { spreadsheetId, appsScriptUrl, driveFolderId } = getDbConfig();

  if (!bypassCache) {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
  }

  // 1. Primary Action: Fetch via Google Apps Script API 'GET' action
  if (appsScriptUrl && appsScriptUrl.trim() !== '') {
    try {
      const cleanUrl = appsScriptUrl.trim();
      const finalUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
      const apiResponse = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET',
          module: gidKey.toUpperCase().trim(),
          spreadsheetId: spreadsheetId,
          driveFolderId: driveFolderId
        })
      });

      if (apiResponse.ok) {
        const textResult = await apiResponse.text();
        const jsonResult = JSON.parse(textResult);
        if (jsonResult.success && Array.isArray(jsonResult.data)) {
          console.log(`[Apps Script Fetch] Successfully fetched data for ${gidKey} via Apps Script GET API. Row count: ${jsonResult.data.length}`);
          const rawData = jsonResult.data;
          
          // Construct unique headers list
          const rawHeaders: string[] = [];
          rawData.forEach((row: any) => {
            if (row && typeof row === 'object') {
              Object.keys(row).forEach(k => {
                if (!rawHeaders.includes(k)) rawHeaders.push(k);
              });
            }
          });

          const mappedHeaders = rawHeaders.map(h => h.trim().toUpperCase().replace(/[\s_.]/g, ''));
          
          const result = rawData.map((row: any) => {
            const cols = rawHeaders.map(h => {
              const val = row[h];
              if (val === undefined || val === null) return '';
              if (typeof val === 'object') return JSON.stringify(val);
              return String(val);
            });
            if (cols.every(c => !c)) return null;
            return mapper(cols, mappedHeaders);
          }).filter((item: any): item is T => item !== null);

          if (result.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(result));
          } else {
            localStorage.removeItem(storageKey);
          }
          
          sessionStorage.removeItem('last_spreadsheet_error');
          sessionStorage.removeItem('last_spreadsheet_error_gid');
          return result;
        } else {
          console.warn(`[Apps Script Fetch] Apps Script response indicated failure or invalid format for ${gidKey}:`, jsonResult.message);
        }
      }
    } catch (e) {
      console.warn(`[Apps Script Fetch] Failed to query Apps Script GET API for ${gidKey}. Falling back to CSV export.`, e);
    }
  }

  // 2. Fallback Action: CSV Export from Google Sheets directly
  const savedMapRaw = localStorage.getItem('portal_gid_map');
  let gid = (DEFAULT_GIDS as any)[gidKey];
  
  if (savedMapRaw) {
    try {
      const map = JSON.parse(savedMapRaw);
      const targetKey = gidKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key in map) {
        if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === targetKey) { gid = map[key]; break; }
      }
    } catch (e) {}
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`;
    const finalUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(finalUrl);
    if (!response.ok || (response.headers.get('content-type') || '').includes('html')) {
       const healed = await attemptAutoHeal(gidKey);
       if (healed) {
           return fetchTableData(gidKey, storageKey, mapper, bypassCache);
       }
       if (!response.ok) {
          if (response.status === 400 || response.status === 404) {
            console.warn(`Table/Sheet for ${gidKey} (GID ${gid}) is not yet initialized or does not exist in the spreadsheet (HTTP ${response.status}). Returning empty array.`);
            return safeParseArray(localStorage.getItem(storageKey));
          }
          throw new Error(`HTTP Error ${response.status}`);
       }
    }
    
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) {
       const healed = await attemptAutoHeal(gidKey);
       if (healed) {
           return fetchTableData(gidKey, storageKey, mapper, bypassCache);
       }
       console.warn(`Access denied or invalid sheet for ${gidKey}. Ensure spreadsheet is published to the web.`);
       throw new Error(`Akses ke sheet ${gidKey} ditolak. Pastikan Spreadsheet dipublikasikan ke web sebagai CSV.`);
    }

    const lines = csvText.split(/\r?\n/).filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^[,"'\s]+$/.test(trimmed)) return false;
      return true;
    });

    if (lines.length < 1) return [];
    
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').replace(/""/g, '"').trim().toUpperCase().replace(/[\s_.]/g, ''));
    
    const result = lines.slice(1).map(line => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        if (cols.every(c => !c)) return null;
        return mapper(cols, headers);
    }).filter((item): item is T => item !== null);

    if (result.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(result));
    } else {
      localStorage.removeItem(storageKey);
    }
    if (gidKey === 'USERS' || gidKey === 'PEGAWAI') {
      sessionStorage.removeItem('last_spreadsheet_error');
      sessionStorage.removeItem('last_spreadsheet_error_gid');
    }
    return result;
  } catch (error) {
    console.error(`Error fetching table data for ${gidKey}:`, error);
    
    try {
      const healed = await attemptAutoHeal(gidKey);
      if (healed) {
        return fetchTableData(gidKey, storageKey, mapper, bypassCache);
      }
    } catch (healErr) {
      console.error(`Auto-heal retry failed for ${gidKey}:`, healErr);
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    const isCritical = gidKey === 'USERS' || gidKey === 'PEGAWAI';
    
    if (isCritical) {
      sessionStorage.setItem('last_spreadsheet_error', errMsg);
      sessionStorage.setItem('last_spreadsheet_error_gid', `${gidKey} (GID: ${gid})`);
      sessionStorage.setItem('last_spreadsheet_error_time', Date.now().toString());
    } else {
      console.warn(`[Optional Connection Warning] Module ${gidKey} failed to load: ${errMsg}`);
      sessionStorage.setItem(`error_module_${gidKey.toLowerCase()}`, errMsg);
    }
    
    if (bypassCache) throw error;
    return safeParseArray(localStorage.getItem(storageKey));
  }
};

export const fetchPegawaiFromSheets = async (bypassCache = false): Promise<Pegawai[]> => {
  return fetchTableData<Pegawai>('PEGAWAI', 'portal_pegawai_db', (cols, headers) => {
    const get = (k: string) => { 
      const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
      return (i !== -1 && cols[i]) ? cols[i] : ''; 
    };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
    
    // Identity fields with fallbacks
    const nama = (get('NAMA') || get('NAMAPEGAWAI') || get('FULLNAME')).trim();
    const nipRaw = get('NIP') || get('NIPBARU') || get('ASN_NIP') || get('NIP_ASN');
    const nip = nipRaw ? nipRaw.replace(/\D/g, '') : '';
    const sid = get('ID');
    
    // VALIDATION: Skip garbage rows
    if (!nama && !nip && !sid) return null;
    
    // Check for "Corrupted" names: suspiciously short (degree codes) or address-like strings
    const upperNama = nama.toUpperCase();
    const looksLikeDegree = (nama.length < 8 && (upperNama.startsWith('S.') || upperNama.startsWith('M.') || upperNama.startsWith('A.')));
    const isAddressOrInfo = (upperNama.includes('PONDOK') || upperNama.includes('JALAN') || upperNama.includes('KEC.') || upperNama.includes('KAB.'));
    
    // If it has NO NIP and the name looks suspicious, filter it out
    if (!nip && (looksLikeDegree || isAddressOrInfo || nama.length < 3)) {
      console.warn("Filtering suspected corrupted row:", { nama, nip, id: sid });
      return null;
    }
    
    const p = {
      id: sid || `PEG-${nip || Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
      nip: nip, 
      nama: nama || '(NAMA KOSONG)', 
      statusPerkawinan: get('STATUSPERKAWINAN') || get('STATUSKAWIN') || get('MARITALSTATUS') || get('STATUS_KAWIN'),
      jabatan: get('JABATAN') || get('NAMAJABATAN') || get('JAB'), 
      jenisJabatan: get('JENISJABATAN') || get('TIPEJABATAN') || get('KATEGORIJABATAN'),
      klasifikasiJabatan: get('KLASIFIKASI') || get('KLASIFIKASIJABATAN') || get('KATEGORI'),
      subBagian: get('SUBBAGIAN') || get('SUB_BAGIAN'), 
      bagian: get('BAGIAN'),
      unitKerja: get('UNITKERJA') || get('UNIT_KERJA') || 'DJKI', 
      gender: (() => {
        const g = (get('GENDER') || get('JENISKELAMIN') || get('JK') || get('LP') || '').toUpperCase();
        if (g === 'P' || g.startsWith('PEREMPUAN') || g === 'WANITA' || g === 'W') return 'P';
        return 'L';
      })() as 'L' | 'P',
      golRuang: get('GOLRUANG') || get('GOLONGAN') || get('PANGKATGOL'), 
      jenisPegawai: get('JENISPEGAWAI') || get('KATEGORIPEG') || get('TYPE'), 
      status: (() => {
        const rawStatus = (get('STATUS') || get('STATUSPEGAWAI') || '').trim();
        if (!rawStatus) return 'Aktif';
        const lower = rawStatus.toLowerCase();
        if (lower === 'aktif' || lower === 'active' || lower.startsWith('aktif')) return 'Aktif';
        if (lower === 'tidak aktif' || lower === 'non aktif' || lower === 'non-aktif' || lower === 'inactive' || lower.startsWith('tidak')) return 'Tidak Aktif';
        if (lower === 'pensiun' || lower === 'retired' || lower.startsWith('pensiun') || lower.startsWith('bup')) return 'Pensiun';
        if (lower === 'tugas belajar' || lower === 'tubel' || lower.startsWith('tugas')) return 'Tugas Belajar';
        return rawStatus.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      })(),
      pangkat: get('PANGKAT'), 
      foto: get('FOTO') || get('FOTOURL') || get('PHOTO'),
      tmtPangkat: get('TMTPANGKAT') || get('TMT_PANGKAT'), 
      tmtJabatan: get('TMTJABATAN') || get('TMT_JABATAN'), 
      tmtCpns: get('TMTSTATUS') || get('TMTCPNS') || get('TMT_ASN'),
      pendidikan: get('PENDIDIKAN') || get('PEND'), 
      jurusan: get('JURUSAN'), 
      nik: (get('NIK') || get('NO_NIK')).replace(/\D/g, ''),
      masaKerja: get('MASAKERJA') || get('MK_TOTAL'), 
      tempatLahir: get('TEMPATLAHIR') || get('TMP_LAHIR'), 
      tanggalLahir: get('TANGGALLAHIR') || get('TGL_LAHIR'),
      alamat: get('ALAMAT'), 
      eselon: get('ESELON'), 
      agama: get('AGAMA'),
      noHp: get('NOHP') || get('TELEPON') || get('WA'), 
      email: get('EMAIL'), 
      npwp: get('NPWP'), 
      noBpjs: get('NOBPJS') || get('BPJS'), 
      noKarisKarsu: get('NOKARISKARSU'),
      noTAPERA: get('NOTAPERA'), 
      noKarpeg: get('NOKARPEG') || get('KARTU_PEG'), 
      noRekeningGaji: get('NOREKENINGGAJI') || get('NOMORREKENINGGAJI') || get('NO_REK'),
      namaBank: get('NAMABANK') || get('BANK'),
      usia: get('USIA'),
      tglPensiun: get('TGLPENSIUN') || get('TANGGALPENSIUN'),
      tmtPensiun: get('TMTPENSIUN'),
      tmtPensiunDisplay: get('TMTPENSIUNDISPLAY'),
      bup: get('BUP'),
      sisaMasaKerja: get('SISAMASAKERJA'),
      keteranganPensiun: get('KETERANGANPENSIUN'),
      usiaPensiun: get('USIAPENSIUN'),
      masaKerjaPensiun: get('MKPENSIUN') || get('MASAKERJAPENSIUN'),
      masaKerjaGolongan: get('MKGOLONGAN') || get('MASAKERJAGOLONGAN') || get('MK_GOL'),
      riwayatPendidikan: getJson('RIWAYATPENDIDIKAN'),
      riwayatJabatan: getJson('RIWAYATJABATAN'),
      riwayatPangkat: getJson('RIWAYATPANGKAT'),
      riwayatPelatihan: getJson('RIWAYATPELATIHAN'),
      keluarga: getJson('KELUARGA')
    } as Pegawai;

    // A. Classification Enrichment (Forced dynamic check)
    const es = (p.eselon || '').trim().toUpperCase();
    const j = (p.jabatan || '').trim().toUpperCase();
    const kl = (p.klasifikasiJabatan || p.jenisJabatan || '').trim().toUpperCase();
    
    if (kl.includes('PIMPINAN TINGGI') || kl.includes('JPT')) {
      p.klasifikasiJabatan = 'JPT';
    } else if (kl.includes('STRUKTURAL') || kl.includes('ADMINISTRATOR') || kl.includes('PENGAWAS') || kl.includes('MANAJERIAL')) {
      p.klasifikasiJabatan = 'STRUKTURAL';
    } else if (kl.includes('FUNGSIONAL TERTENTU') || kl.includes('JFT') || kl === 'FUNGSIONAL') {
      p.klasifikasiJabatan = 'FUNGSIONAL';
    } else if (kl.includes('FUNGSIONAL UMUM') || kl.includes('JFU') || kl.includes('PELAKSANA')) {
      p.klasifikasiJabatan = 'PELAKSANA';
    } else if (j.includes('AHLI') || j.includes('MADYA') || j.includes('MUDA') || 
               j.includes('PERTAMA') || j.includes('UTAMA') || j.includes('TERAMPIL') || 
               j.includes('MAHIR') || j.includes('PENYELIA') || j.includes('PELAKSANA LANJUTAN')) {
      p.klasifikasiJabatan = 'FUNGSIONAL';
    } else if (j.includes('DIREKTUR JENDERAL') || j.includes('SEKRETARIS DIREKTORAT JENDERAL') || 
               j.includes('SEKRETARIS UTAMA') || j.includes('STAF AHLI') || j.includes('INSPEKTUR') || 
               j.includes('KEPALA BIRO') || j.includes('KEPALA PUSAT') || j.includes('DIREKTUR') || 
               j.includes('SEKRETARIS DIREKTORAT')) {
      p.klasifikasiJabatan = 'JPT';
    } else if (es.startsWith('I') || es.startsWith('II')) {
      p.klasifikasiJabatan = 'JPT';
    } else if (es.startsWith('III') || es.startsWith('IV') || es.startsWith('V')) {
      p.klasifikasiJabatan = 'STRUKTURAL';
    } else {
      p.klasifikasiJabatan = 'PELAKSANA';
    }

    // B. Identity & Retirement Enrichment
    if (p.tanggalLahir) {
      const cleanBirth = (p.tanggalLahir.trim());
      let parsedBirthStr = '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanBirth)) parsedBirthStr = cleanBirth;
      else if (cleanBirth.includes('T')) parsedBirthStr = cleanBirth.split('T')[0];
      else {
        const parts = cleanBirth.split(/[-/]/);
        if (parts.length === 3) {
          if (parts[0].length <= 2 && parts[2].length === 4) parsedBirthStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          else if (parts[0].length === 4) parsedBirthStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
      
      if (!parsedBirthStr) {
        try {
          const d = new Date(cleanBirth);
          if (!isNaN(d.getTime())) parsedBirthStr = d.toISOString().split('T')[0];
        } catch (e) {}
      }

      if (parsedBirthStr) {
        const birth = new Date(parsedBirthStr);
        if (!isNaN(birth.getTime())) {
          // Age if missing
          if (!p.usia || p.usia === '-') {
            const today = new Date();
            let years = today.getFullYear() - birth.getFullYear();
            let months = today.getMonth() - birth.getMonth();
            if (months < 0) {
              years--;
              months += 12;
            }
            p.usia = `${years} Thn ${months} Bln`;
          }

          // Retirement age limit (BUP)
          if (!p.bup || p.bup === '-') {
            const isHighLevel = p.eselon && p.eselon !== '-' && p.eselon !== '';
            const isFungsionalAhli = p.jabatan?.toUpperCase().includes('MADYA') || p.jabatan?.toUpperCase().includes('UTAMA');
            p.bup = (isHighLevel || isFungsionalAhli) ? '60' : '58';
          }

          const bupYears = parseInt(p.bup);
          const retirementDate = new Date(birth.getFullYear() + bupYears, birth.getMonth() + 1, 1);
          
          if (!p.tglPensiun || p.tglPensiun === '-') {
            p.tglPensiun = retirementDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          }

          if (!p.tmtPensiun || p.tmtPensiun === '-') {
            p.tmtPensiun = `${retirementDate.getFullYear()}-${String(retirementDate.getMonth() + 1).padStart(2, '0')}-01`;
          }

          // Auto Pensiun Status
          const today = new Date();
          let checkDate = retirementDate;
          if (p.tmtPensiun && p.tmtPensiun !== '-') {
            let tmtClean = p.tmtPensiun.trim();
            let parsedTmtStr = '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(tmtClean)) parsedTmtStr = tmtClean;
            else if (tmtClean.includes('T')) parsedTmtStr = tmtClean.split('T')[0];
            else {
              const parts = tmtClean.split(/[-/]/);
              if (parts.length === 3) {
                if (parts[0].length <= 2 && parts[2].length === 4) parsedTmtStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                else if (parts[0].length === 4) parsedTmtStr = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              }
            }
            if (parsedTmtStr) {
              const tmtDate = new Date(parsedTmtStr);
              if (!isNaN(tmtDate.getTime())) {
                checkDate = tmtDate;
              }
            }
          }
          
          if (today >= checkDate) {
            if (p.status === 'Aktif' || p.status === 'Tugas Belajar') {
              p.status = 'Pensiun';
            }
          }
        }
      }
    }

    return p;
  }, bypassCache);
};

export const fetchSatyaLencanaFromSheets = (bypassCache = false) => fetchTableData<SatyaLencanaRecord>('SATYA_LENCANA', 'satya_lencana_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), kategori: get('KATEGORI'), tahunTerima: parseInt(get('TAHUNTERIMA')) || new Date().getFullYear(), nomorKeppres: get('NOMORKEPPRES'), fileSertifikatUrl: get('FILESERTIFIKATURL') } as SatyaLencanaRecord;
}, bypassCache);

export const fetchABKAnjabFromSheets = (bypassCache = false) => fetchTableData<ABKAnjab>('ABK_ANJAB', 'abk_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return { 
    id: get('ID'), namaJabatan: get('NAMAJABATAN'), unitKerja: get('UNITKERJA'), 
    jumlahSaatIni: parseInt(get('JUMLAHSAATINI')) || 0, 
    totalMenitBebanKerja: parseFloat(get('TOTALMENITBEBANKERJA')) || 0, 
    kebutuhanPegawai: parseFloat(get('KEBUTUHANPEGAWAI')) || 0, 
    selisih: parseFloat(get('SELISIH')) || 0, status: get('STATUS') as any, 
    jenisJabatan: (get('JENISJABATAN') || 'PELAKSANA') as any,
    ikhtisarJabatan: get('IKHTISARJABATAN'), kualifikasiPendidikan: get('KUALIFIKASIPENDIDIKAN'),
    tanggungJawab: get('TANGGUNGJAWAB'), wewenang: get('WEWENANG'), syaratJabatan: get('SYARATJABATAN'),
    lingkunganKerja: get('LINGKUNGANKERJA'), risikoBahaya: get('RISIKOBAHAYA'), bakatKerja: get('BAKATKERJA'),
    temperamenKerja: get('TEMPERAMENKERJA'), minatKerja: get('MINATKERJA'), upayaFisik: get('UPAYAFISIK'),
    kondisiFisik: get('KONDISIFISIK'), jamKerjaEfektif: parseInt(get('JAMKERJAEFEKTIF')) || 75000,
    uraianTugas: getJson('URAIANTUGAS')
  };
}, bypassCache);

export const fetchPersuratanFromSheets = (bypassCache = false) => fetchTableData<PersuratanRecord>('PERSURATAN', 'portal_persuratan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), jenisSurat: get('JENISSURAT'), nomorSurat: get('NOMORSURAT'), tanggalSurat: get('TANGGALSURAT'), perihal: get('PERIHAL'), lampiran: get('LAMPIRAN'), tujuan: get('TUJUAN'), dari: get('DARI'), isiRingkas: get('ISIRINGKAS'), pjbNama: get('PJBNAMA'), pjbNip: get('PJBNIP'), pjbJabatan: get('PJBJABATAN'), status: get('STATUS'), statusBaca: get('STATUSBACA'), statusProses: get('STATUSPROSES'), pengirimNip: get('PENGIRIMNIP') } as PersuratanRecord;
}, bypassCache);

export const fetchPengembanganFromSheets = (bypassCache = false) => fetchTableData<Pengembangan>('PENGEMBANGAN', 'portal_pengembangan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), namaKegiatan: get('NAMAKEGIATAN'), jumlahJpl: parseFloat(get('JUMLAHJPL')) || 0, tahun: parseInt(get('TAHUN')) || new Date().getFullYear(), fileSertifikatUrl: get('FILESERTIFIKATURL') } as Pengembangan;
}, bypassCache);

export const fetchKGBFromSheets = (bypassCache = false) => fetchTableData<KGB>('KGB', 'portal_kgb_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      nip: get('NIP'), 
      namaPegawai: get('NAMAPEGAWAI'), 
      tmtLama: get('TMTLAMA'),
      tmtBaru: get('TMTBARU'), 
      gajiLama: parseFloat(get('GAJILAMA')) || 0,
      gajiBaru: parseFloat(get('GAJIBARU')) || 0,
      nomorSk: get('NOMORSK'),
      tglSk: get('TGLSK'),
      status: get('STATUS') as any,
      pjbNama: get('PJBNAMA'),
      pjbNip: get('PJBNIP'),
      pjbJabatan: get('PJBJABATAN'),
      pangkatGol: get('PANGKATGOL'),
      jabatan: get('JABATAN'),
      kantor: get('KANTOR'),
      unitKerja: get('UNITKERJA'),
      tglSurat: get('TGLSURAT'),
      skTerakhirPejabat: get('SKTERAKHIRPEJABAT'),
      skTerakhirTanggal: get('SKTERAKHIRTANGGAL'),
      skTerakhirNomor: get('SKTERAKHIRNOMOR'),
      skTerakhirTmt: get('SKTERAKHIRTMT'),
      skTerakhirMasaKerja: get('SKTERAKHIRMASAKERJA'),
      masaKerjaBaru: get('MASAKERJABARU'),
      golonganBaru: get('GOLONGANBARU'),
      masaPerjanjianKerja: get('MASAPERJANJIANKERJA'),
      perpanjanganPerjanjianKerja: get('PERPANJANGANPERJANJIANKERJA'),
      jenisPegawai: get('JENISPEGAWAI') as any
    } as KGB;
}, bypassCache);

export const fetchSKPFromSheets = (bypassCache = false) => fetchTableData<any>('SKP', 'skp_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tahun: get('TAHUN'), predikatKinerja: get('PREDIKATKINERJA') };
}, bypassCache);

export const fetchMagangPKLFromSheets = (bypassCache = false) => fetchTableData<any>('MAGANG_PKL', 'portal_magang_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nama: get('NAMA'), institusi: get('INSTITUSI'), status: get('STATUS') };
}, bypassCache);

export const fetchTugasRutinFromSheets = (bypassCache = false) => fetchTableData<TugasRutin>('TUGAS_RUTIN', 'tugas_rutin_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const dataStr = get('DATA');
    let parsedData = {};
    try { parsedData = dataStr ? JSON.parse(dataStr) : {}; } catch(e) {}
    return { 
      id: get('ID'), 
      timestamp: get('TIMESTAMP'), 
      bulan: get('BULAN'), 
      tahun: parseInt(get('TAHUN')) || new Date().getFullYear(), 
      jenis: get('JENIS') as any, 
      detail: get('DETAIL'),
      data: parsedData
    };
}, bypassCache);

export const fetchKegiatanFromSheets = (bypassCache = false) => fetchTableData<Kegiatan>('KEGIATAN', 'kegiatan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      judulKegiatan: get('JUDULKEGIATAN'), 
      tanggal: get('TANGGAL'), 
      tanggalMulai: get('TANGGALMULAI') || get('TANGGAL'),
      tanggalSelesai: get('TANGGALSELESAI') || get('TANGGAL'),
      jamMulai: get('JAMMULAI'),
      jamSelesai: get('JAMSELESAI'),
      tempat: get('TEMPAT'),
      jumlahPeserta: parseInt(get('JUMLAHPESERTA')) || 0,
      asalPeserta: get('ASALPESERTA'),
      laporanSingkat: get('LAPORANSINGKAT'),
      linkDriveFoto: get('LINKDRIVEFOTO'),
      status: get('STATUS')
    } as Kegiatan;
}, bypassCache);

export const fetchDossiersFromSheets = (bypassCache = false) => fetchTableData<Dossier>('DOSSIER', 'portal_dossiers_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      nip: (get('NIP') || '').replace(/\D/g, ''), 
      namaPegawai: get('NAMAPEGAWAI'),
      tanggal: get('TANGGAL'),
      keterangan: get('KETERANGAN'),
      fileName: get('FILENAME'), 
      fileUrl: get('FILEURL') 
    } as Dossier;
}, bypassCache);

export const fetchUsersFromSheets = (bypassCache = false) => fetchTableData<AdminUser>('USERS', 'portal_users_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      nip: (get('NIP') || '').replace(/\D/g, ''), 
      name: get('NAME'), 
      password: get('PASSWORD'), 
      role: (get('ROLE') as any) || 'Viewer', 
      foto: get('FOTO'),
      status: (get('STATUS') as any) || 'Aktif'
    };
}, bypassCache);

export const fetchPelantikanFromSheets = (bypassCache = false) => fetchTableData<any>('PELANTIKAN', 'pelantikan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const id = get('ID');
    const nip = get('ASNNIP') || get('ASN_NIP') || get('NIP') || get('NIPASN');
    const nomor = get('NOMOR');
    const data = get('DATA');
    
    if (!id && !nip && !nomor) return null;
    
    return { id, nomor, asnNip: nip, data };
}, bypassCache);

export const fetchPensiunFromSheets = (bypassCache = false) => fetchTableData<any>('PENSIUN', 'pensiun_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const id = get('ID');
    const nip = get('NIP') || get('ASNNIP') || get('ASN_NIP');
    const nama = get('NAMAPEGAWAI') || get('NAMA');
    
    if (!id && !nip && !nama) return null;
    
    return { id, nip, namaPegawai: nama, data: get('DATA') };
}, bypassCache);

export const fetchPAKFromSheets = (bypassCache = false) => fetchTableData<any>('PAK', 'pak_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), nomor: get('NOMOR'), jumlahKredit: parseFloat(get('JUMLAHKREDIT')) || 0 };
}, bypassCache);

export const fetchSPMTSPPFromSheets = (bypassCache = false) => fetchTableData<SpmtSppRecord>('SPMT_SPP', 'spmt_spp_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), type: get('TYPE') as any, nomor: get('NOMOR'), pegawaiNip: get('PEGAWAINIP') } as SpmtSppRecord;
}, bypassCache);

export const fetchKenaikanFromSheets = (bypassCache = false) => fetchTableData<KenaikanKarir>('KENAIKAN', 'kenaikan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), dari: get('DARI'), menjadi: get('MENJADI'), status: get('STATUS') } as KenaikanKarir;
}, bypassCache);

export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string): Promise<{ success: boolean; fileUrl?: string; message?: string }> => {
    const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') {
        return { success: false, message: "URL Apps Script tidak dikonfigurasi." };
    }
    
    if (!driveFolderId || driveFolderId.trim() === '') {
        return { success: false, message: "ID Folder Drive tidak dikonfigurasi di menu Pengaturan." };
    }
    
    const cleanUrl = appsScriptUrl.trim();
    if (!base64) {
        return { success: false, message: "Data file kosong." };
    }

    // Strip data URL prefix and any whitespace/newlines that might corrupt the base64 string
    const cleanBase64 = (base64.includes(',') ? base64.split(',')[1] : base64).replace(/\s/g, '');
    
    // Ensure we have a valid mimeType and sanitized fileName
    const safeMimeType = (mimeType || 'image/jpeg').trim();
    const safeFileName = (fileName || `UPLOAD_${Date.now()}`).trim().replace(/[/\\?%*:|"<>]/g, '-');
    
    try {
        const finalUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
        const response = await fetch(finalUrl, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'UPLOAD', 
                spreadsheetId, 
                driveFolderId,
                payload: { 
                    fileName: safeFileName, 
                    mimeType: safeMimeType, 
                    base64: cleanBase64 
                } 
            }) 
        });

        if (!response.ok) {
            return { success: false, message: `Server error: ${response.status}` };
        }

        const text = await response.text();
        try {
            const result = JSON.parse(text);
            if (!result.success && !result.message) {
                result.message = "Gagal memproses file di server Google.";
            }
            return result;
        } catch (parseError) {
            console.error("Parse Error:", text);
            // Check if it's a HTML error page (common when Apps Script crashes)
            if (text.includes('<!DOCTYPE html>') || text.includes('scriptErrorName')) {
                return { success: false, message: "Server Google Apps Script mengalami gangguan atau memori penuh. Coba gunakan file yang lebih kecil." };
            }
            return { success: false, message: "Format respon server tidak valid." };
        }
    } catch (e) { 
        console.error("Upload Exception:", e);
        return { success: false, message: "Terjadi kesalahan koneksi saat mengunggah." }; 
    }
};

export const syncGidMap = async (): Promise<boolean> => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') {
        console.warn("syncGidMap: Apps Script URL is empty.");
        return false;
    }

    const cleanUrl = appsScriptUrl.trim();

    // Try POST first (more reliable in some environments)
    try {
        const finalUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
        const postRes = await fetch(finalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'GET_GID_MAP', spreadsheetId })
        });
        
        if (postRes.ok) {
            const data = await postRes.json();
            if (data.success) {
                localStorage.setItem('portal_gid_map', JSON.stringify(data.gidMap));
                return true;
            }
        }
    } catch (postError) {
        console.warn(`syncGidMap POST failed for ${cleanUrl}:`, postError);
    }
    
    // Fallback to GET if POST failed or action not recognized
    try {
        const separator = cleanUrl.includes('?') ? '&' : '?';
        const getUrl = `${cleanUrl}${separator}ssId=${spreadsheetId}`;
        const finalUrl = `/api/proxy?url=${encodeURIComponent(getUrl)}`;
        const getRes = await fetch(finalUrl);
        if (getRes.ok) {
            const data = await getRes.json();
            if (data.success) {
                localStorage.setItem('portal_gid_map', JSON.stringify(data.gidMap));
                return true;
            }
        }
        return false;
    } catch (e) {
        console.error(`syncGidMap GET failed for ${cleanUrl}:`, e);
        return false;
    }
};

export const fetchKeuanganFromSheets = (bypassCache = false) => fetchTableData<KeuanganRecord>('KEUANGAN', 'portal_keuangan_db', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return { 
    id: get('ID'), 
    namaKegiatan: get('NAMAKEGIATAN'),
    tanggal: get('TANGGAL'), 
    mataAnggaran: get('MATAANGGARAN'),
    tahunAnggaran: get('TAHUNANGGARAN'),
    ppkNip: get('PPKNIP'),
    ppkNama: get('PPKNAMA'),
    bendaharaNip: get('BENDAHARANIP'),
    bendaharaNama: get('BENDAHARANAMA'),
    unitKerja: get('UNITKERJA'),
    status: (get('STATUS') || 'Draft') as any, 
    keterangan: get('KETERANGAN'), 
    transactionId: get('TRANSACTIONID'),
    kotaTtd: get('KOTATTD') || 'Bogor',
    tanggalDokumen: get('TANGGALDOKUMEN'),
    peserta: getJson('PESERTA'),
    configBiaya: getJson('CONFIGBIAYA'),
    configSpd: getJson('CONFIGSPD')
  } as KeuanganRecord;
}, bypassCache);

export const syncKeuanganRemote = (action: 'SAVE' | 'DELETE', data: any) => syncTableRemote('KEUANGAN', action, data);

export const fetchAbsensiConfig = async (bypassCache = false): Promise<AbsensiConfig> => {
  const data = await fetchTableData<AbsensiConfig>('CONFIG', 'portal_absensi_config', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
    if (get('ID') !== 'ABSENSI_GLOBAL') return null;
    return {
      id: get('ID'),
      officeWifiSsid: get('OFFICEWIFISSID'),
      officeIpAddresses: get('OFFICEIPADDRESSES') || get('OFFICEIPADDRESS'),
      wfaNips: getJson('WFANIPS'),
      simpegEnabled: get('SIMPEGENABLED') === 'TRUE' || get('SIMPEGENABLED') === 'true',
      simpegApiUrl: get('SIMPEGAPIURL'),
      simpegApiKey: get('SIMPEGAPIKEY')
    } as AbsensiConfig;
  }, bypassCache);
  return data.length > 0 ? data[0] : { 
    id: 'ABSENSI_GLOBAL', 
    officeWifiSsid: '', 
    officeIpAddresses: '', 
    wfaNips: [],
    simpegEnabled: false,
    simpegApiUrl: '',
    simpegApiKey: ''
  };
};

export const saveAbsensiConfig = (config: AbsensiConfig) => syncTableRemote('CONFIG', 'SAVE', config);

const sendToSimpeg = async (record: any, config: AbsensiConfig): Promise<{ success: boolean; error?: string }> => {
  if (!config.simpegEnabled || !config.simpegApiUrl) return { success: false, error: 'SIMPEG integration disabled or URL missing' };

  try {
    const payload = {
      nip: record.nip,
      nama: record.nama,
      tanggal: record.tanggal,
      waktu: record.waktu,
      tipe: record.tipe,
      status: record.status,
      lokasi: record.lokasi,
      confidence: record.confidence,
      source: 'PORTAL-SDM-DJKI'
    };

    const response = await fetch(config.simpegApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.simpegApiKey ? { 'Authorization': `Bearer ${config.simpegApiKey}`, 'X-API-KEY': config.simpegApiKey } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Gagal sinkron ke SIMPEG:', errorText);
      return { success: false, error: errorText };
    } else {
      console.log('Sinkron SIMPEG Berhasil');
      return { success: true };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('SIMPEG Integration Error:', errorMsg);
    return { success: false, error: errorMsg };
  }
};

export const resendAbsensiToSimpeg = async (record: any): Promise<boolean> => {
  const config = await fetchAbsensiConfig();
  if (!config) return false;
  
  const result = await sendToSimpeg(record, config);
  
  // Update record with status
  return syncTableRemote('ABSENSI', 'SAVE', { 
    id: record.id, 
    simpegStatus: result.success ? 'SUCCESS' : 'FAILED',
    simpegError: result.error || null
  });
};

export const saveAbsensiRecord = async (record: any): Promise<boolean> => {
  const ok = await syncTableRemote('ABSENSI', 'SAVE', { ...record, simpegStatus: 'PENDING' });
  
  if (ok) {
    // Try background sync to SIMPEG if configured
    fetchAbsensiConfig().then(async config => {
      if (config && config.simpegEnabled) {
        const result = await sendToSimpeg(record, config);
        // Update the row with the result in background
        syncTableRemote('ABSENSI', 'SAVE', { 
          id: record.id, 
          simpegStatus: result.success ? 'SUCCESS' : 'FAILED',
          simpegError: result.error || null
        });
      }
    }).catch(err => console.error("Could not fetch config for SIMPEG sync", err));
  }
  
  return ok;
};

export const fetchAbsensiHistoryFromSheets = async (nip: string): Promise<any[]> => {
  const all = await fetchTableData<any>('ABSENSI', 'portal_absensi_history_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      nip: (get('NIP') || '').replace(/\D/g, ''),
      nama: get('NAMA'),
      tanggal: get('TANGGAL'),
      waktu: get('WAKTU'),
      tipe: get('TIPE'),
      status: get('STATUS'),
      lokasi: get('LOKASI'),
      confidence: parseFloat(get('CONFIDENCE')) || 0,
      simpegStatus: get('SIMPEGSTATUS') as any,
      simpegError: get('SIMPEGERROR')
    };
  });
  const now = new Date();
  const d = now.getDate().toString().padStart(2, '0');
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const y = now.getFullYear();
  const today = `${d}/${m}/${y}`;
  const todayAlt = `${y}-${m}-${d}`;
  
  return all.filter(r => 
    r.nip === nip.replace(/\D/g, '') && 
    (r.tanggal === today || r.tanggal === todayAlt || r.tanggal?.includes(today))
  );
};

export const fetchAllAbsensiHistoryFromSheets = async (): Promise<any[]> => {
  return fetchTableData<any>('ABSENSI', 'portal_absensi_history_global', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      nip: (get('NIP') || '').replace(/\D/g, ''),
      nama: get('NAMA'),
      tanggal: get('TANGGAL'),
      waktu: get('WAKTU'),
      tipe: get('TIPE'),
      status: get('STATUS'),
      lokasi: get('LOKASI'),
      confidence: parseFloat(get('CONFIDENCE')) || 0,
      simpegStatus: get('SIMPEGSTATUS') as any,
      simpegError: get('SIMPEGERROR')
    };
  });
};

export const fetchSystemConfig = async (bypassCache = true): Promise<SystemConfig> => {
  const data = await fetchTableData<SystemConfig>('CONFIG', 'portal_system_config', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };
    if (get('ID') !== 'SYSTEM_CONFIG') return null;
    return {
      maintenance: getJson('MAINTENANCE') || { all: false, pages: [] },
      pageAccess: getJson('PAGEACCESS') || [],
      systemName: get('SYSTEMNAME') || get('SYSTEM_NAME') || '',
      runningText: get('RUNNINGTEXT') || get('RUNNING_TEXT') || '',
      systemLogo: get('SYSTEMLOGO') || get('SYSTEM_LOGO') || '',
      templateLogo: get('TEMPLATELOGO') || get('TEMPLATE_LOGO') || ''
    } as SystemConfig;
  }, bypassCache);
  return data.length > 0 ? data[0] : { 
    maintenance: { all: false, pages: [] }, 
    pageAccess: [] 
  };
};

export const saveSystemConfig = (config: any) => syncTableRemote('CONFIG', 'SAVE', { id: 'SYSTEM_CONFIG', ...config });

export const fetchBankSoalFromSheets = () => fetchTableData<BankSoal>('BANK_SOAL', 'ukom_bank_soal', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  return {
    id: get('IDSOAL'),
    kategori: get('KATEGORI') as any,
    tipeSoal: (get('TIPESOAL') || 'Umum') as any,
    jabatanFungsional: get('JABATANFUNGSIONAL'),
    jenjang: get('JENJANG'),
    pertanyaan: get('PERTANYAAN'),
    imageUrl: get('IMAGEURL'),
    pilihanA: get('PILIHANA'),
    pilihanB: get('PILIHANB'),
    pilihanC: get('PILIHANC'),
    pilihanD: get('PILIHAND'),
    pilihanE: get('PILIHANE'),
    jawabanBenar: get('JAWABANBENAR'),
    bobotNilai: get('BOBOTNILAI'),
    tipeJawaban: get('TIPEJAWABAN') as any
  } as BankSoal;
});

export const fetchPesertaUkomFromSheets = () => fetchTableData<PesertaUkom>('PESERTA_UKOM', 'ukom_peserta', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  return {
    noPeserta: get('NOPESERTA'),
    nama: get('NAMA'),
    tanggalLahir: get('TANGGALLAHIR'),
    jabatanFungsional: get('JABATANFUNGSIONAL'),
    jenjang: get('JENJANG'),
    unitKerja: get('UNITKERJA'),
    fotoUrl: get('FOTOURL') || get('FOTO'),
    password: get('PASSWORD'),
    statusUjian: get('STATUSUJIAN') as any,
    isLocked: get('ISLOCKED') === 'TRUE',
    unlockPassword: get('UNLOCKPASSWORD')
  } as PesertaUkom;
});

export const fetchHasilUkomFromSheets = () => fetchTableData<HasilUkom>('HASIL_UKOM', 'ukom_hasil', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };
  return {
    noPeserta: get('NOPESERTA'),
    nama: get('NAMA'),
    jabatanFungsional: get('JABATANFUNGSIONAL'),
    jenjang: get('JENJANG'),
    nilaiTwk: parseFloat(get('NILAITWK')) || 0,
    nilaiTiu: parseFloat(get('NILAITIU')) || 0,
    nilaiTkp: parseFloat(get('NILAITKP')) || 0,
    totalNilai: parseFloat(get('TOTALNILAI')) || 0,
    tanggalUjian: get('TANGGALUJIAN'),
    waktuSelesai: get('WAKTUSELESAI'),
    essayAnswers: getJson('ESSAYANSWERS')
  } as HasilUkom;
});

export const fetchUkomSessionsFromSheets = () => fetchTableData<any>('UKOM_SESSIONS', 'ukom_sessions', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return {
    id: get('ID'),
    namaSesi: get('NAMASESI'),
    tanggal: get('TANGGAL'),
    waktuMulai: get('WAKTUMULAI'),
    waktuSelesai: get('WAKTUSELESAI'),
    supervisorNips: getJson('SUPERVISORNIPS'),
    pesertaIds: getJson('PESERTAIDS'),
    status: get('STATUS')
  };
});

export const saveUkomSession = (session: any) => syncTableRemote('UKOM_SESSIONS', 'SAVE', session);
export const deleteUkomSession = (id: string, nama?: string) => syncTableRemote('UKOM_SESSIONS', 'DELETE', { id, nama });

export const savePegawai = async (pegawai: Partial<Pegawai>): Promise<boolean> => {
  // Filter out fields that are typically calculated by ArrayFormula in the spreadsheet
  // to prevent overwriting formulas with static values.
  const calculatedFields = [
    'pangkat',
    'masaKerja', 
    'masaKerjaGolongan', 'masaKerjaPensiun', 'usia', 'tglPensiun', 
    'tmtPensiun', 'tmtPensiunDisplay', 'usiaPensiun', 'bup', 
    'sisaMasaKerja', 'keteranganPensiun'
  ];
  
  const payload = { ...pegawai };
  calculatedFields.forEach(field => {
    delete (payload as any)[field];
  });
  
  return syncTableRemote('PEGAWAI', 'SAVE', payload);
};

export const findPegawaiByNip = async (nip: string): Promise<Pegawai | null> => {
    const all = await fetchPegawaiFromSheets();
    const cleanNip = nip.replace(/\D/g, '');
    return all.find(p => (p.nip || '').replace(/\D/g, '') === cleanNip) || null;
};

export const saveHasilUkom = (hasil: HasilUkom) => syncTableRemote('HASIL_UKOM', 'SAVE', hasil);
export const savePesertaUkom = (peserta: PesertaUkom) => syncTableRemote('PESERTA_UKOM', 'SAVE', peserta);

/**
 * MAPPING & AUDIT TOOLS
 */

export const auditSpreadsheet = async () => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') return [];
    
    const expected = Object.keys(EXPECTED_COLUMNS_SCHEMA).map(key => ({
        name: key,
        requiredColumns: (EXPECTED_COLUMNS_SCHEMA as any)[key]
    }));

    try {
        const res = await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'AUDIT_DATABASE',
                spreadsheetId,
                payload: { expectedSheets: expected }
            })
        });
        const data = await res.json();
        return data.auditResults || [];
    } catch (e) {
        console.error("Audit failed:", e);
        return [];
    }
};

export const deleteSheetRemote = async (sheetId: string) => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
    
    try {
        const res = await fetch(appsScriptUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'DELETE_SHEET',
                spreadsheetId,
                payload: sheetId
            })
        });
        const data = await res.json();
        return data.success === true;
    } catch (e) {
        return false;
    }
};
export const lockPesertaUkom = (noPeserta: string) => syncTableRemote('PESERTA_UKOM', 'SAVE', { noPeserta, isLocked: true });
export const unlockPesertaUkom = (noPeserta: string, unlockPassword: string) => syncTableRemote('PESERTA_UKOM', 'SAVE', { noPeserta, isLocked: false, unlockPassword });
export const deletePesertaUkom = (noPeserta: string) => syncTableRemote('PESERTA_UKOM', 'DELETE', { id: noPeserta, noPeserta });
export const saveBankSoalBulk = (soalList: BankSoal[]) => syncTableRemote('BANK_SOAL', 'SAVE', soalList);
export const saveBankSoal = (soal: BankSoal) => syncTableRemote('BANK_SOAL', 'SAVE', soal);
export const deleteBankSoal = (id: string, nama?: string) => syncTableRemote('BANK_SOAL', 'DELETE', { id, nama });

export const getRetirementDetails = (nip: string, jabatan: string) => {
  const cleanNip = (nip || '').replace(/\D/g, '');
  if (cleanNip.length < 8) return null;
  const birthYear = parseInt(cleanNip.substring(0, 4));
  const birthMonth = parseInt(cleanNip.substring(4, 6)) - 1;
  const jabUpper = (jabatan || '').toUpperCase();
  let usiaPensiun = 58;
  if (jabUpper.includes('UTAMA')) usiaPensiun = 65;
  else if (jabUpper.includes('MADYA') || jabUpper.includes('DIREKTUR') || jabUpper.includes('SEKRETARIS DIREKTORAT')) usiaPensiun = 60;
  const tmtPensiun = new Date(birthYear + usiaPensiun, birthMonth + 1, 1);
  const now = new Date();
  const diffDays = Math.ceil((tmtPensiun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
  let sisaMasaKerja = diffDays <= 0 ? "Pensiun" : `${Math.floor(diffDays / 12)} thn ${diffDays % 12} bln`;
  return { tmtPensiun, sisaMasaKerja, bup: usiaPensiun };
};

export const fetchPenilaianTalentaFromSheets = (bypassCache = false) => fetchTableData<PenilaianTalenta>('PENILAIAN_TALENTA', 'talenta_penilaian_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      nilai_skp: parseFloat(get('NILAISKP')) || parseFloat(get('NILAI_SKP')) || 0,
      kompetensi: parseFloat(get('KOMPETENSI')) || 0,
      integritas: parseFloat(get('INTEGRITAS')) || 0,
      disiplin: parseFloat(get('DISIPLIN')) || 0,
      leadership: parseFloat(get('LEADERSHIP')) || 0,
      teamwork: parseFloat(get('TEAMWORK')) || 0,
      inovasi: parseFloat(get('INOVASI')) || 0,
      komunikasi: parseFloat(get('KOMUNIKASI')) || 0,
      pendidikan: get('PENDIDIKAN'),
      pengalaman: parseFloat(get('PENGALAMAN')) || 0,
      total_nilai: parseFloat(get('TOTALNILAI')) || parseFloat(get('TOTAL_NILAI')) || 0,
      kategori_talenta: get('KATEGORITALENTA') || get('KATEGORI_TALENTA'),
      created_at: get('CREATEDAT') || get('CREATED_AT') || new Date().toISOString()
    } as PenilaianTalenta;
}, bypassCache);

export const fetchTalentPoolFromSheets = (bypassCache = false) => fetchTableData<TalentPool>('TALENT_POOL', 'talenta_talent_pool_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      ranking: parseInt(get('RANKING')) || 0,
      status_talenta: get('STATUSTALENTA') || get('STATUS_TALENTA'),
      readiness_level: get('READINESSLEVEL') || get('READINESS_LEVEL'),
      rekomendasi_jabatan: get('REKOMENDASIJABATAN') || get('REKOMENDASI_JABATAN'),
      created_at: get('CREATEDAT') || get('CREATED_AT') || new Date().toISOString()
    } as TalentPool;
}, bypassCache);

export const fetchAssessmentTalentaFromSheets = (bypassCache = false) => fetchTableData<AssessmentTalenta>('ASSESSMENT_TALENTA', 'talenta_assessment_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      hasil_assessment: get('HASILASSESSMENT') || get('HASIL_ASSESSMENT'),
      potensi: parseFloat(get('POTENSI')) || 0,
      kompetensi: parseFloat(get('KOMPETENSI')) || 0,
      assessor: get('ASSESSOR'),
      catatan: get('CATATAN'),
      tanggal_assessment: get('TANGGALASSESSMENT') || get('TANGGAL_ASSESSMENT')
    } as AssessmentTalenta;
}, bypassCache);

export const fetchNineBoxFromSheets = (bypassCache = false) => fetchTableData<NineBoxTalenta>('NINEBOX', 'talenta_ninebox_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      kinerja: parseFloat(get('KINERJA')) || 0,
      potensi: parseFloat(get('POTENSI')) || 0,
      posisi_box: get('POSISIBOX') || get('POSISI_BOX'),
      rekomendasi: get('REKOMENDASI')
    } as NineBoxTalenta;
}, bypassCache);

export const fetchPengembanganTalentaFromSheets = (bypassCache = false) => fetchTableData<PengembanganTalenta>('PENGEMBANGAN_TALENTA', 'talenta_pengembangan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return {
      id: get('ID'),
      pegawai_id: get('PEGAWAIID') || get('PEGAWAI_ID') || get('NIP'),
      jenis_pengembangan: get('JENISPENGEMBANGAN') || get('JENIS_PENGEMBANGAN'),
      nama_pelatihan: get('NAMAPELATIHAN') || get('NAMA_PELATIHAN'),
      penyelenggara: get('PENYELENGGARA'),
      tanggal_mulai: get('TANGGALMULAI') || get('TANGGAL_MULAI'),
      tanggal_selesai: get('TANGGALSELESAI') || get('TANGGAL_SELESAI'),
      status: get('STATUS')
    } as PengembanganTalenta;
}, bypassCache);

