
import { Pegawai, AdminUser, Laporan, Dossier, Pengembangan, KGB, CloudConfig, TugasRutin, Kegiatan, ABKAnjab, SpmtSppRecord, PAKRecord, MagangPKL, SKPRecord, PersuratanRecord, KenaikanKarir, SatyaLencanaRecord, KeuanganRecord, AbsensiConfig, SystemConfig, BankSoal, PesertaUkom, HasilUkom } from './types';

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
  UKOM_SESSIONS: '1122334455'
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

export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  const { appsScriptUrl, spreadsheetId, driveFolderId } = getDbConfig();
  if (!appsScriptUrl || appsScriptUrl.trim() === '') return false;
  
  // Validation for DELETE action
  if (action === 'DELETE' && !data?.id && !data?.nip) {
    console.warn(`Sync blocked: Action DELETE for module ${moduleName} requires id or nip. Received:`, data);
    return false;
  }

  const cleanUrl = appsScriptUrl.trim();
  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
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
    const res = await fetch(`${appsScriptUrl}?action=GET_TIME`);
    const data = await res.json();
    if (data.success && data.time) return new Date(data.time);
    return new Date();
  } catch (e) {
    return new Date();
  }
};

export const fetchTableData = async <T>(gidKey: keyof typeof DEFAULT_GIDS, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null): Promise<T[]> => {
  const { spreadsheetId } = getDbConfig();
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
    const response = await fetch(url);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) {
      console.warn(`Access denied or invalid sheet for ${gidKey}. Ensure spreadsheet is published to the web.`);
      throw new Error("Access denied.");
    }
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 1) return [];
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').replace(/""/g, '"').trim().toUpperCase().replace(/[\s_.]/g, ''));
    const result = lines.slice(1).map(line => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
        return mapper(cols, headers);
    }).filter((item): item is T => item !== null);
    if (result.length > 0) localStorage.setItem(storageKey, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error(`Error fetching table data for ${gidKey}:`, error);
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  }
};

export const fetchPegawaiFromSheets = async (): Promise<Pegawai[]> => {
  return fetchTableData<Pegawai>('PEGAWAI', 'portal_pegawai_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
    return {
      id: get('ID'), nip: get('NIP').replace(/\D/g, ''), nama: get('NAMA'), 
      jabatan: get('JABATAN'), 
      klasifikasiJabatan: get('KLASIFIKASI') || get('KLASIFIKASIJABATAN'),
      subBagian: get('SUBBAGIAN'), bagian: get('BAGIAN'),
      unitKerja: get('UNITKERJA') || 'DJKI', gender: (() => {
        const g = (get('GENDER') || get('JENISKELAMIN')).toUpperCase();
        if (g === 'P' || g.startsWith('PEREMPUAN') || g === 'WANITA') return 'P';
        return 'L';
      })() as 'L' | 'P',
      golRuang: get('GOLRUANG'), jenisPegawai: get('JENISPEGAWAI'), status: get('STATUS') || 'Aktif',
      pangkat: get('PANGKAT'), foto: get('FOTO') || get('FOTOURL'),
      tmtPangkat: get('TMTPANGKAT'), tmtJabatan: get('TMTJABATAN'), tmtCpns: get('TMTSTATUS') || get('TMTCPNS'),
      pendidikan: get('PENDIDIKAN'), jurusan: get('JURUSAN'), nik: get('NIK'),
      masaKerja: get('MASAKERJA'), tempatLahir: get('TEMPATLAHIR'), tanggalLahir: get('TANGGALLAHIR'),
      alamat: get('ALAMAT'), eselon: get('ESELON'), agama: get('AGAMA'),
      noHp: get('NOHP'), email: get('EMAIL'), npwp: get('NPWP'), noBpjs: get('NOBPJS'), noKarisKarsu: get('NOKARISKARSU'),
      noTapera: get('NOTAPERA'), noKarpeg: get('NOKARPEG'), noRekeningGaji: get('NOREKENINGGAJI') || get('NOMORREKENINGGAJI'),
      namaBank: get('NAMABANK'),
      usia: get('USIA') || cols[23] || '',
      tglPensiun: get('TGLPENSIUN') || get('TANGGALPENSIUN') || cols[24] || '',
      tmtPensiun: get('TMTPENSIUN') || cols[27] || '',
      tmtPensiunDisplay: get('TMTPENSIUNDISPLAY') || cols[25] || '',
      bup: get('BUP') || cols[26] || '',
      sisaMasaKerja: get('SISAMASAKERJA') || cols[28] || '',
      keteranganPensiun: get('KETERANGANPENSIUN') || cols[29] || '',
      statusPerkawinan: get('STATUSPERKAWINAN') || get('STATUSKAWIN') || get('MARITALSTATUS') || get('STATUS'),
      jenisJabatan: get('JENISJABATAN') || get('TIPEJABATAN') || get('KATEGORIJABATAN'),
      usiaPensiun: get('USIAPENSIUN') || get('BUP'),
      masaKerjaPensiun: get('MKPENSIUN') || get('MASAKERJAPENSIUN') || get('MK_TOTAL'),
      masaKerjaGolongan: get('MKGOLONGAN') || get('MASAKERJAGOLONGAN') || get('MK_GOL'),
      riwayatPendidikan: getJson('RIWAYATPENDIDIKAN'),
      riwayatJabatan: getJson('RIWAYATJABATAN'),
      riwayatPangkat: getJson('RIWAYATPANGKAT'),
      riwayatPelatihan: getJson('RIWAYATPELATIHAN'),
      keluarga: getJson('KELUARGA')
    } as Pegawai;
  });
};

export const fetchSatyaLencanaFromSheets = () => fetchTableData<SatyaLencanaRecord>('SATYA_LENCANA', 'satya_lencana_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), kategori: get('KATEGORI'), tahunTerima: parseInt(get('TAHUNTERIMA')) || new Date().getFullYear(), nomorKeppres: get('NOMORKEPPRES'), fileSertifikatUrl: get('FILESERTIFIKATURL') } as SatyaLencanaRecord;
});

export const fetchABKAnjabFromSheets = () => fetchTableData<ABKAnjab>('ABK_ANJAB', 'abk_db', (cols, headers) => {
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
});

export const fetchPersuratanFromSheets = () => fetchTableData<PersuratanRecord>('PERSURATAN', 'portal_persuratan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), jenisSurat: get('JENISSURAT'), nomorSurat: get('NOMORSURAT'), tanggalSurat: get('TANGGALSURAT'), perihal: get('PERIHAL'), lampiran: get('LAMPIRAN'), tujuan: get('TUJUAN'), dari: get('DARI'), isiRingkas: get('ISIRINGKAS'), pjbNama: get('PJBNAMA'), pjbNip: get('PJBNIP'), pjbJabatan: get('PJBJABATAN'), status: get('STATUS'), statusBaca: get('STATUSBACA'), statusProses: get('STATUSPROSES'), pengirimNip: get('PENGIRIMNIP') } as PersuratanRecord;
});

export const fetchPengembanganFromSheets = () => fetchTableData<Pengembangan>('PENGEMBANGAN', 'portal_pengembangan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), namaKegiatan: get('NAMAKEGIATAN'), jumlahJpl: parseFloat(get('JUMLAHJPL')) || 0, tahun: parseInt(get('TAHUN')) || new Date().getFullYear(), fileSertifikatUrl: get('FILESERTIFIKATURL') } as Pengembangan;
});

export const fetchKGBFromSheets = () => fetchTableData<KGB>('KGB', 'portal_kgb_db', (cols, headers) => {
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
});

export const fetchSKPFromSheets = () => fetchTableData<any>('SKP', 'skp_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tahun: get('TAHUN'), predikatKinerja: get('PREDIKATKINERJA') };
});

export const fetchMagangPKLFromSheets = () => fetchTableData<any>('MAGANG_PKL', 'portal_magang_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nama: get('NAMA'), institusi: get('INSTITUSI'), status: get('STATUS') };
});

export const fetchTugasRutinFromSheets = () => fetchTableData<TugasRutin>('TUGAS_RUTIN', 'tugas_rutin_db', (cols, headers) => {
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
});

export const fetchKegiatanFromSheets = () => fetchTableData<Kegiatan>('KEGIATAN', 'kegiatan_db', (cols, headers) => {
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
});

export const fetchDossiersFromSheets = () => fetchTableData<Dossier>('DOSSIER', 'portal_dossiers_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { 
      id: get('ID'), 
      nip: get('NIP'), 
      namaPegawai: get('NAMAPEGAWAI'),
      tanggal: get('TANGGAL'),
      keterangan: get('KETERANGAN'),
      fileName: get('FILENAME'), 
      fileUrl: get('FILEURL') 
    } as Dossier;
});

export const fetchUsersFromSheets = () => fetchTableData<AdminUser>('USERS', 'portal_users_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), name: get('NAME'), password: get('PASSWORD'), role: get('ROLE') as any, foto: get('FOTO') };
});

export const fetchPelantikanFromSheets = () => fetchTableData<any>('PELANTIKAN', 'pelantikan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nomor: get('NOMOR'), asnNip: get('ASNNIP'), data: get('DATA') };
});

export const fetchPensiunFromSheets = () => fetchTableData<any>('PENSIUN', 'pensiun_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), data: get('DATA') };
});

export const fetchPAKFromSheets = () => fetchTableData<any>('PAK', 'pak_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), nomor: get('NOMOR'), jumlahKredit: parseFloat(get('JUMLAHKREDIT')) || 0 };
});

export const fetchSPMTSPPFromSheets = () => fetchTableData<SpmtSppRecord>('SPMT_SPP', 'spmt_spp_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), type: get('TYPE') as any, nomor: get('NOMOR'), pegawaiNip: get('PEGAWAINIP') } as SpmtSppRecord;
});

export const fetchKenaikanFromSheets = () => fetchTableData<KenaikanKarir>('KENAIKAN', 'kenaikan_db', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), dari: get('DARI'), menjadi: get('MENJADI'), status: get('STATUS') } as KenaikanKarir;
});

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
        const response = await fetch(cleanUrl, { 
            method: 'POST', 
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
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
        const postRes = await fetch(cleanUrl, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
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
        const getRes = await fetch(getUrl, { mode: 'cors' });
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

export const fetchKeuanganFromSheets = () => fetchTableData<KeuanganRecord>('KEUANGAN', 'portal_keuangan_db', (cols, headers) => {
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
    peserta: getJson('PESERTA'),
    configBiaya: getJson('CONFIGBIAYA'),
    configSpd: getJson('CONFIGSPD')
  } as KeuanganRecord;
});

export const syncKeuanganRemote = (action: 'SAVE' | 'DELETE', data: any) => syncTableRemote('KEUANGAN', action, data);

export const fetchAbsensiConfig = async (): Promise<AbsensiConfig> => {
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
  });
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

export const fetchSystemConfig = async (): Promise<SystemConfig> => {
  const data = await fetchTableData<SystemConfig>('CONFIG', 'portal_system_config', (cols, headers) => {
    const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
    const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };
    if (get('ID') !== 'SYSTEM_CONFIG') return null;
    return {
      maintenance: getJson('MAINTENANCE') || { all: false, pages: [] },
      pageAccess: getJson('PAGEACCESS') || []
    } as SystemConfig;
  });
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
export const deleteUkomSession = (id: string) => syncTableRemote('UKOM_SESSIONS', 'DELETE', { id });

export const savePegawai = async (pegawai: Partial<Pegawai>): Promise<boolean> => {
  // Filter out fields that are typically calculated by ArrayFormula in the spreadsheet
  // to prevent overwriting formulas with static values.
  const calculatedFields = [
    'pangkat', 'jenisJabatan', 'klasifikasiJabatan', 'masaKerja', 
    'masaKerjaGolongan', 'masaKerjaPensiun', 'usia', 'tglPensiun', 
    'tmtPensiun', 'tmtPensiunDisplay', 'usiaPensiun', 'bup', 
    'sisaMasaKerja', 'keteranganPensiun', 'tmtCpns'
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
export const lockPesertaUkom = (noPeserta: string) => syncTableRemote('PESERTA_UKOM', 'SAVE', { noPeserta, isLocked: true });
export const unlockPesertaUkom = (noPeserta: string, unlockPassword: string) => syncTableRemote('PESERTA_UKOM', 'SAVE', { noPeserta, isLocked: false, unlockPassword });
export const deletePesertaUkom = (noPeserta: string) => syncTableRemote('PESERTA_UKOM', 'DELETE', { id: noPeserta, noPeserta });
export const saveBankSoalBulk = (soalList: BankSoal[]) => syncTableRemote('BANK_SOAL', 'SAVE', soalList);
export const saveBankSoal = (soal: BankSoal) => syncTableRemote('BANK_SOAL', 'SAVE', soal);
export const deleteBankSoal = (id: string) => syncTableRemote('BANK_SOAL', 'DELETE', { id });

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
