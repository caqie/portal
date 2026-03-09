
import { Pegawai, AdminUser, Laporan, Dossier, Pengembangan, KGB, CloudConfig, TugasRutin, Kegiatan, ABKAnjab, SpmtSppRecord, PAKRecord, MagangPKL, SKPRecord, PersuratanRecord, KenaikanKarir, SatyaLencanaRecord, KeuanganRecord, AbsensiConfig, SystemConfig, BankSoal, PesertaUkom, HasilUkom } from './types';

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
  CONFIG: '1234567890', // Default or will be synced
  TUGAS_RUTIN: '457929061',
  LAPORAN: '555034467',
  KEGIATAN: '456342206',
  ABK_ANJAB: '11',
  PELANTIKAN: '0', 
  SPMT_SPP: '13',
  PENSIUN: '985690424',
  MAGANG_PKL: '123456789',
  PERSURATAN: '2025010101',
  SATYA_LENCANA: '333444555',
  KEUANGAN: '999888777',
  BANK_SOAL: '111222333',
  PESERTA_UKOM: '444555666',
  HASIL_UKOM: '777888999'
};

const getDbConfig = () => {
  const savedId = localStorage.getItem('db_spreadsheet_id');
  const savedCloud = localStorage.getItem('portal_cloud_config');
  let cloud: CloudConfig;
  try {
    cloud = savedCloud ? JSON.parse(savedCloud) : { driveFolderId: '', appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL), logoUrl: '' };
  } catch (e) {
    cloud = { driveFolderId: '', appsScriptUrl: (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL), logoUrl: '' };
  }
  return {
    spreadsheetId: (savedId && savedId.trim() !== '') ? savedId : (import.meta.env.VITE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID),
    appsScriptUrl: (cloud.appsScriptUrl && cloud.appsScriptUrl.trim() !== '') ? cloud.appsScriptUrl : (import.meta.env.VITE_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL)
  };
};

export const syncTableRemote = async (moduleName: string, action: 'SAVE' | 'DELETE', data: any): Promise<boolean> => {
  const { appsScriptUrl, spreadsheetId } = getDbConfig();
  if (!appsScriptUrl) return false;
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
    if (!response.ok) throw new Error("Network error");
    const result = await response.json();
    return result.success === true;
  } catch (error) { 
    console.error("Remote Sync Error:", error);
    return false; 
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
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>')) throw new Error("Access denied.");
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 1) return [];
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim().toUpperCase().replace(/[\s_.]/g, ''));
    const result = lines.slice(1).map(line => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        return mapper(cols, headers);
    }).filter((item): item is T => item !== null);
    if (result.length > 0) localStorage.setItem(storageKey, JSON.stringify(result));
    return result;
  } catch (error) {
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
      noTapera: get('NOTAPERA'), noKarpeg: get('NOKARPEG'),
      usia: cols[23] || '',
      tglPensiun: cols[24] || '',
      tmtPensiunDisplay: cols[25] || '',
      bup: cols[26] || '',
      sisaMasaKerja: cols[27] || '',
      keteranganPensiun: cols[28] || '',
      statusPerkawinan: get('STATUSPERKAWINAN'),
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
    return { id: get('ID'), nomor: get('NOMOR'), asnNip: get('ASNNIP') };
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

export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string) => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    try {
        const res = await fetch(appsScriptUrl, { method: 'POST', body: JSON.stringify({ action: 'UPLOAD', spreadsheetId, payload: { fileName, mimeType, base64 } }) });
        return await res.json();
    } catch (e) { return { success: false }; }
};

export const syncGidMap = async (): Promise<boolean> => {
    const { appsScriptUrl, spreadsheetId } = getDbConfig();
    try {
        const res = await fetch(`${appsScriptUrl}?ssId=${spreadsheetId}`);
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('portal_gid_map', JSON.stringify(data.gidMap));
            return true;
        }
        return false;
    } catch (e) {
        console.error("syncGidMap Error:", e);
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
      wfaNips: getJson('WFANIPS')
    } as AbsensiConfig;
  });
  return data.length > 0 ? data[0] : { id: 'ABSENSI_GLOBAL', officeWifiSsid: '', officeIpAddresses: '', wfaNips: [] };
};

export const saveAbsensiConfig = (config: AbsensiConfig) => syncTableRemote('CONFIG', 'SAVE', config);

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
    bobotNilai: get('BOBOTNILAI')
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
    statusUjian: get('STATUSUJIAN') as any
  } as PesertaUkom;
});

export const fetchHasilUkomFromSheets = () => fetchTableData<HasilUkom>('HASIL_UKOM', 'ukom_hasil', (cols, headers) => {
  const get = (k: string) => { const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); return (i !== -1 && cols[i]) ? cols[i] : ''; };
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
    waktuSelesai: get('WAKTUSELESAI')
  } as HasilUkom;
});

export const saveHasilUkom = (hasil: HasilUkom) => syncTableRemote('HASIL_UKOM', 'SAVE', hasil);
export const savePesertaUkom = (peserta: PesertaUkom) => syncTableRemote('PESERTA_UKOM', 'SAVE', peserta);
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
