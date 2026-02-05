import { Pegawai, AdminUser, Laporan, Dossier, SKP, PAK, KenaikanKarir, Pengembangan, KGB, CloudConfig, TugasRutin, Kegiatan, ABKAnjab, SpmtSppRecord, PAKRecord, MagangPKL, SKPRecord, DPCPRecord, PersuratanRecord } from './types';

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
  PELANTIKAN: '0', 
  SPMT_SPP: '13',
  PENSIUN: '985690424',
  MAGANG_PKL: '123456789',
  PERSURATAN: '2025010101'
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

export const fetchPersuratanFromSheets = () => fetchTableData<PersuratanRecord>('PERSURATAN', 'portal_persuratan_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { 
    id: get('ID'), 
    jenisSurat: get('JENISSURAT') as any, 
    nomorSurat: get('NOMORSURAT'), 
    tanggalSurat: get('TANGGALSURAT'), 
    perihal: get('PERIHAL'), 
    lampiran: get('LAMPIRAN'), 
    tujuan: get('TUJUAN'), 
    dari: get('DARI'), 
    isiRingkas: get('ISIRINGKAS'), 
    tembusan: get('TEMBUSAN'), 
    pjbNama: get('PJBNAMA'), 
    pjbNip: get('PJBNIP'), 
    pjbJabatan: get('PJBJABATAN'), 
    status: get('STATUS') as any,
    fileUrl: get('FILEURL'),
    sifatSurat: get('SIFATSURAT'),
    prioritas: get('PRIORITAS') as any,
    tanggalMulai: get('TANGGALMULAI'),
    tanggalAkhir: get('TANGGALAKHIR'),
    lokasi: get('LOKASI'),
    fileSuratUrl: get('FILESURATURL'),
    fileLampiranUrl: get('FILELAMPIRANURL'),
    isParaf: get('ISPARAF') === 'true',
    ttdNip: get('TTDNIP'),
    pemeriksaNip: get('PEMERIKSANIP'),
    pengirimNip: get('PENGIRIMNIP'),
    statusBaca: get('STATUSBACA') as any,
    statusProses: get('STATUSPROSES') as any,
    kategoriAsal: get('KATEGORIASAL') as any,
    riwayatDisposisi: get('RIWAYATDISPOSISI'),
    catatanDisposisi: get('CATATANDISPOSISI')
  };
});

export const fetchPengembanganFromSheets = () => fetchTableData<Pengembangan>('PENGEMBANGAN', 'portal_pengembangan_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return {
    id: get('ID'),
    nip: get('NIP'),
    namaPegawai: get('NAMAPEGAWAI'),
    namaKegiatan: get('NAMAKEGIATAN'),
    jenisPengembangan: get('JENISPENGEMBANGAN'),
    kategori: get('KATEGORI') as any,
    tanggalMulai: get('TANGGALMULAI'),
    tanggalSelesai: get('TANGGALSELESAI'),
    jumlahJpl: parseFloat(get('JUMLAHJPL')) || 0,
    penyelenggara: get('PENYELENGGARA'),
    nomorSertifikat: get('NOMORSERTIFIKAT'),
    fileSertifikatUrl: get('FILESERTIFIKATURL'),
    tahun: parseInt(get('TAHUN')) || new Date().getFullYear()
  };
});

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

export const uploadFileToDrive = async (fileName: string, mimeType: string, base64: string): Promise<{ success: boolean; fileUrl?: string; message?: string }> => {
  const { appsScriptUrl, spreadsheetId } = getDbConfig();
  if (!appsScriptUrl) return { success: false, message: "Apps Script URL not configured." };
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ 
        action: 'UPLOAD', 
        spreadsheetId: spreadsheetId,
        payload: { fileName, mimeType, base64 } 
      })
    });
    if (!response.ok) throw new Error("Network error");
    return await response.json();
  } catch (error: any) { 
    return { success: false, message: error.toString() };
  }
};

export const fetchPegawaiFromSheets = async (): Promise<Pegawai[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = getGid('PEGAWAI');
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toUpperCase().replace(/[\s_.]/g, ''));
    const dataRaw = lines.slice(1).map((line, index) => {
      const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      const getVal = (keys: string[]) => {
        for (const key of keys) {
          const target = key.toUpperCase().replace(/[\s_.]/g, '');
          const idx = headers.indexOf(target);
          if (idx !== -1 && columns[idx]) return columns[idx];
        }
        return '';
      };
      const nip = getVal(['NIP']).replace(/\D/g, '');
      return {
        id: getVal(['ID']) || (index + 1).toString(),
        nip: nip,
        nama: getVal(['NAMA']),
        gelar: getVal(['GELAR']), 
        jabatan: getVal(['JABATAN']),
        unitKerja: getVal(['UNITKERJA']) || 'DJKI',
        gender: (getVal(['JENISKELAMIN']).toUpperCase().startsWith('P')) ? 'P' : 'L',
        golRuang: getVal(['GOLRUANG']),
        jenisPegawai: getVal(['JENISPEGAWAI']),
        foto: getVal(['FOTO', 'FOTOURL']),
        status: (getVal(['STATUS']) || 'Aktif'),
        pangkat: getVal(['PANGKAT']),
        tmtPangkat: getVal(['TMTPANGKAT']),
        tmtJabatan: getVal(['TMTJABATAN']),
        klasifikasiJabatan: getVal(['KLASIFIKASIJABATAN']),
        eselon: getVal(['ESELON']),
        pendidikan: getVal(['PENDIDIKAN']),
        jurusan: getVal(['JURURUSAN', 'JURUSAN']),
        agama: getVal(['AGAMA']),
        telepon: getVal(['TELEPON']),
        alamat: getVal(['ALAMAT']),
        tmtStatus: getVal(['TMTSTATUS']),
        tempatLahir: getVal(['TEMPATLAHIR']),
        tanggalLahir: getVal(['TANGGALLAHIR']),
        nik: getVal(['NIK']),
        masaKerja: getVal(['MASAKERJA'])
      } as Pegawai;
    }).filter(p => p.nama && p.nip);
    const data = Array.from(new Map(dataRaw.map(p => [p.nip, p])).values());
    localStorage.setItem('portal_pegawai_db', JSON.stringify(data));
    return data;
  } catch (error) {
    const saved = localStorage.getItem('portal_pegawai_db');
    return saved ? JSON.parse(saved) : [];
  }
};

export const fetchDossiersFromSheets = async (): Promise<Dossier[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = getGid('DOSSIER');
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toUpperCase().replace(/[\s_.]/g, ''));
    const data = lines.slice(1).map((line, index) => {
      const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
      const getVal = (keys: string[]) => {
        for (const key of keys) {
          const target = key.toUpperCase().replace(/[\s_.]/g, '');
          const idx = headers.indexOf(target);
          if (idx !== -1 && columns[idx]) return columns[idx];
        }
        return '';
      };
      return {
        id: getVal(['ID']) || (index + 1).toString(),
        nip: getVal(['NIP']),
        namaPegawai: getVal(['NAMAPEGAWAI', 'NAMA']),
        tanggal: getVal(['TANGGAL']),
        keterangan: getVal(['KETERANGAN']),
        fileName: getVal(['FILENAME', 'NAMABERKAS']),
        fileUrl: getVal(['FILEURL', 'LINK'])
      } as Dossier;
    }).filter(d => d.nip && d.fileUrl);
    localStorage.setItem('portal_dossiers_db', JSON.stringify(data));
    return data;
  } catch (error) {
    const saved = localStorage.getItem('portal_dossiers_db');
    return saved ? JSON.parse(saved) : [];
  }
};

export const fetchTableData = async <T>(gidKey: keyof typeof DEFAULT_GIDS, storageKey: string, mapper: (cols: string[], headers: string[]) => T | null): Promise<T[]> => {
  const { spreadsheetId } = getDbConfig();
  const gid = getGid(gidKey);
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}&t=${Date.now()}`);
    const csvText = await response.text();
    if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html')) throw new Error("Access denied.");
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

export const fetchUsersFromSheets = () => fetchTableData<AdminUser>('USERS', 'portal_users_db', (cols, headers) => {
    const get = (k: string) => { 
      const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
      return (i !== -1 && cols[i]) ? cols[i] : ''; 
    };
    return { id: get('ID'), nip: get('NIP'), name: get('NAME'), role: get('ROLE') as any, foto: get('FOTO'), password: get('PASSWORD') };
});

export const fetchKGBFromSheets = () => fetchTableData<KGB>('KGB', 'portal_kgb_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { 
    id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), tmtLama: get('TMTLAMA'), tmtBaru: get('TMTBARU'), 
    gajiLama: parseFloat(get('GAJILAMA')) || 0, gajiBaru: parseFloat(get('GAJIBARU')) || 0, nomorSk: get('NOMORSK'), 
    tglSk: get('TGLSK'), status: get('STATUS') as any, pjbNama: get('PJBNAMA'), pjbNip: get('PJBNIP'), pjbJabatan: get('PJBJABATAN')
  };
});

export const fetchTugasRutinFromSheets = () => fetchTableData<TugasRutin>('TUGAS_RUTIN', 'tugas_rutin_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  let dynamicData = {};
  try { const dataStr = get('DATA'); if (dataStr) dynamicData = JSON.parse(dataStr); } catch (e) { }
  return { id: get('ID'), timestamp: get('TIMESTAMP'), bulan: get('BULAN'), tahun: parseInt(get('TAHUN')) || 0, jenis: get('JENIS') as any, detail: get('DETAIL'), data: dynamicData };
});

export const fetchSKPFromSheets = () => fetchTableData<SKPRecord>('SKP', 'skp_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  const getJson = (k: string) => { const val = get(k); try { return val ? JSON.parse(val) : []; } catch(e) { return []; } };
  return { 
    id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), penilaiNip: get('PENILAINIP'), atasanPenilaiNip: get('ATASANPENILAINIP'),
    tahun: parseInt(get('TAHUN')) || 0, periodeMulai: get('PERIODEMULAI'), periodeSelesai: get('PERIODESELESAI'), tglPenilaian: get('TGLPENILAIAN'),
    capaianOrganisasi: get('CAPAIANORGANISASI'), ratingHasilKerja: get('RATINGHASILKERJA'), ratingPerilaku: get('RATINGPERILAKU'),
    predikatKinerja: get('PREDIKATKINERJA'), hasilKerja: getJson('HASILKERJA'), perilakuKerja: getJson('PERILAKUKERJA'), lampiran: getJson('LAMPIRAN')
  } as SKPRecord;
});

export const fetchPAKFromSheets = () => fetchTableData<PAKRecord>('PAK', 'pak_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  const getJson = (k: string) => { try { const v = get(k); return v ? JSON.parse(v) : []; } catch(e) { return []; } };
  return { 
    id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), nomor: get('NOMOR'), periode: get('PERIODE'), tglDibuat: get('TGLDIBUAT'),
    penilaiNip: get('PENILAINIP'), akKonversi: parseFloat(get('AKKONVERSI')) || 0, jumlahKredit: parseFloat(get('JUMLAHKREDIT')) || 0, akumulasi: getJson('AKUMULASI')
  } as any;
});

export const fetchKenaikanFromSheets = () => fetchTableData<KenaikanKarir>('KENAIKAN', 'kenaikan_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { id: get('ID'), nip: get('NIP'), namaPegawai: get('NAMAPEGAWAI'), jenisUsulan: get('JENISUSULAN'), dari: get('DARI'), menjadi: get('MENJADI'), tmtUsulan: get('TMTUSULAN'), status: get('STATUS') } as KenaikanKarir;
});

export const fetchKegiatanFromSheets = () => fetchTableData<Kegiatan>('KEGIATAN', 'kegiatan_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { id: get('ID'), tanggal: get('TANGGAL'), judulKegiatan: get('JUDULKEGIATAN'), tempat: get('TEMPAT'), jumlahPeserta: parseInt(get('JUMLAHPESERTA')) || 0, asalPeserta: get('ASALPESERTA'), laporanSingkat: get('LAPORANSINGKAT'), linkDriveFoto: get('LINKDRIVEFOTO'), status: get('STATUS') as any };
});

export const fetchSPMTSPPFromSheets = () => fetchTableData<SpmtSppRecord>('SPMT_SPP', 'spmt_spp_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { id: get('ID'), type: get('TYPE') as any, nomor: get('NOMOR'), pejabatNip: get('PEJABATNIP'), pegawaiNip: get('PEGAWAINIP'), nomorSK: get('NOMORSK'), tentangSK: get('TENTANGSK'), tanggalSK: get('TANGGALSK'), jabatanBaru: get('JABATANBARU'), unitKerja: get('UNITKERJA'), tanggalLantikAtauSpmt: get('TANGGALLANTIKATAUSPMT'), tanggalSppAtauSpmt: get('TANGGALSPPATAUSPMT'), tempatTandaTangan: get('TEMPATANDATANGAN'), signatureLabel: get('SIGNATURELABEL') } as SpmtSppRecord;
});

export const fetchABKAnjabFromSheets = () => fetchTableData<ABKAnjab>('ABK_ANJAB', 'abk_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { id: get('ID'), namaJabatan: get('NAMAJABATAN'), unitKerja: get('UNITKERJA'), jumlahSaatIni: parseInt(get('JUMLAHSAATINI')) || 0, totalMenitBebanKerja: parseFloat(get('TOTALMENITBEBANKERJA')) || 0, kebutuhanPegawai: parseFloat(get('KEBUTUHANPEGAWAI')) || 0, selisih: parseFloat(get('SELISIH')) || 0, status: get('STATUS') as any, kualifikasiPendidikan: get('KUALIFIKASIPENDIDIKAN') };
});

export const fetchMagangPKLFromSheets = () => fetchTableData<MagangPKL>('MAGANG_PKL', 'portal_magang_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { 
    id: get('ID'), nama: get('NAMA'), nisNim: get('NISNIM'), institusi: get('INSTITUSI'), jurusan: get('JURURUSAN'), 
    jenis: get('JENIS') as any, tanggalMulai: get('TANGGALMULAI'), tanggalSelesai: get('TANGGALSELESAI'), 
    penempatan: get('PENEMPATAN'), status: get('STATUS') as any, nomorSurat: get('NOMORSURAT'),
    pjbNip: get('PJBNIP'), pjbNama: get('PJBNAMA'), pjbJabatan: get('PJBJABATAN')
  };
});

export const fetchPelantikanFromSheets = () => fetchTableData<any>('PELANTIKAN', 'portal_pelantikan_db', (cols, headers) => {
  const get = (k: string) => { 
    const i = headers.indexOf(k.toUpperCase().replace(/[\s_.]/g, '')); 
    return (i !== -1 && cols[i]) ? cols[i] : ''; 
  };
  return { id: get('ID'), nomorBA: get('NOMORBA'), hari: get('HARI'), tanggalLantik: get('TANGGALLANTIK'), tempat: get('TEMPAT'), pjbNama: get('PJBNAMA'), pjbNip: get('PJBNIP'), pjbJabatan: get('PJBJABATAN'), asnNip: get('ASNNIP'), asnNama: get('ASNNAMA'), asnPangkat: get('ASNPANGKAT'), asnGolRuang: get('ASNGOLRUANG'), asnJabatan: get('ASNJABATAN') };
});