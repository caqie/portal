import React, { useState, useMemo, useEffect } from 'react';
import { Pegawai, Pengembangan } from '../types';
import { formatPegawaiName } from '../constants';
import {
  MASTER_KOMPETENSI_JABATAN,
  LIST_JABATAN_STANDAR,
  getKompetensiByJabatan,
  KompetensiItem
} from '../kompetensiJabatanData';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';

interface Props {
  pegawaiList: Pegawai[];
  riwayatPelatihanList: Pengembangan[];
  selectedNip?: string;
  onSelectNip?: (nip: string) => void;
  canEdit?: boolean;
  initialSection?: SidebarSection;
}

export type SidebarSection = 
  | 'tentang_saya'
  | 'hasil_assesment'
  | 'standar_kompetensi'
  | 'gap_kompetensi'
  | 'nilai_performa'
  | 'riwayat_jabatan'
  | 'pengayaan_peran'
  | 'sertifikasi'
  | 'pelatihan'
  | 'pembicara'
  | 'pendidikan'
  | 'penghargaan'
  | 'karya_tulis';

export interface MultiRaterCategory {
  y2015: number;
  y2016: number;
  y2017: number;
  y2018: number;
  y2019: number;
  y2020: number;
  y2021: number;
  y2022: number;
  skor: number;
}

export interface TalentProfileData {
  summary: string;
  minat: string;
  visiNilai: string;
  kelebihanKekurangan: string;
  asessmentTerakhir: string;
  asessmentSelanjutnya: string;
  tmtPangkatTerakhir: string;
  tmtJabatanTerakhir: string;
  tmtSpSpmtTerakhir: string;
  isPromotablePangkat: boolean;
  promotablePangkatLabel: string;
  isPromotableJabatan: boolean;
  promotableJabatanLabel: string;
  manajerialScore2023: { [key: string]: number };
  manajerialScore2021: { [key: string]: number };
  manajerialMinimum: { [key: string]: number };
  rekomendasiManajerial?: string;
  perilaku360Radar?: {
    k01: number;
    k02: number;
    k03: number;
    k04: number;
    k05: number;
  };
  perilaku360MultiRater?: {
    atasan: MultiRaterCategory;
    bawahan: MultiRaterCategory;
    rekan: MultiRaterCategory;
    diriSendiri: MultiRaterCategory;
  };
  rekomendasi360?: string;
  perilaku360Scores: {
    teknis: number;
    produktivitas: number;
    kualitas: number;
  };
  gapCompetencyPercentage: number;
}

const DEFAULT_PROFILE_DATA: TalentProfileData = {
  summary: "Aparatur Sipil Negara yang berdedikasi tinggi dengan keahlian di bidang analisis kekayaan intelektual, pengelolaan sumber daya manusia aparatur, serta transformasi digital layanan publik. Berpengalaman dalam penyusunan kebijakan, pengelolaan data talenta, dan perumusan rekomendasi strategis di lingkungan Direktorat Jenderal Kekayaan Intelektual.",
  minat: "Pengembangan sistem manajemen talenta berbasis meritokrasi, pemeriksaan substantif kekayaan intelektual (Paten & Merek), analisis data kinerja organisasi, tata kelola SDM berbasis kompetensi, serta pemanfaatan kecerdasan buatan untuk optimasi alur kerja administrasi pemerintahan.",
  visiNilai: "Menjunjung tinggi nilai BerAKHLAK (Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, dan Kolaboratif). Berkomitmen memberikan kontribusi nyata dalam mewujudkan perlindungan kekayaan intelektual nasional yang berdaya saing global dan tepercaya.",
  kelebihanKekurangan: "Kelebihan: Memiliki kemampuan analitis yang kuat, cepat menguasai regulasi dan teknologi baru, komunikatif, serta adaptif dalam kerja tim lintas fungsi. Area Pengembangan: Terus meningkatkan keahlian teknis pemeriksaan lanjutan standar internasional WIPO dan penguatan negosiasi kebijakan publik multilateral.",
  asessmentTerakhir: "22 April 2023",
  asessmentSelanjutnya: "22 April 2025",
  tmtPangkatTerakhir: "1 April 2021 (4 tahun 2 bulan)",
  tmtJabatanTerakhir: "15 Maret 2024 (1 tahun 3 bulan)",
  tmtSpSpmtTerakhir: "25 Maret 2024 (1 tahun 3 bulan)",
  isPromotablePangkat: true,
  promotablePangkatLabel: "PROMOTABLE UNTUK PANGKAT III/B",
  isPromotableJabatan: false,
  promotableJabatanLabel: "NON PROMOTABLE UNTUK AHLI MUDA",
  manajerialScore2023: {
    M01: 3, M02: 3, M03: 3, M04: 3, M05: 2, M06: 3, M07: 2, M08: 2
  },
  manajerialScore2021: {
    M01: 2, M02: 2, M03: 2, M04: 2, M05: 2, M06: 2, M07: 2, M08: 1
  },
  manajerialMinimum: {
    M01: 3, M02: 2, M03: 2, M04: 3, M05: 3, M06: 2, M07: 2, M08: 3
  },
  rekomendasiManajerial: "Mengikuti kegiatan peningkatan kompetensi untuk meningkatkan aspek Integritas dan Pelayanan Publik agar memenuhi standar minimum jabatan.",
  perilaku360Radar: {
    k01: 88,
    k02: 92,
    k03: 86,
    k04: 84,
    k05: 95
  },
  perilaku360MultiRater: {
    atasan: { y2015: 86.4, y2016: 88.0, y2017: 89.2, y2018: 90.1, y2019: 91.5, y2020: 92.0, y2021: 92.8, y2022: 93.5, skor: 93.5 },
    bawahan: { y2015: 84.0, y2016: 85.5, y2017: 87.0, y2018: 88.5, y2019: 90.0, y2020: 91.2, y2021: 92.0, y2022: 93.0, skor: 93.0 },
    rekan: { y2015: 85.2, y2016: 87.1, y2017: 88.0, y2018: 89.4, y2019: 90.8, y2020: 91.5, y2021: 92.2, y2022: 93.1, skor: 93.1 },
    diriSendiri: { y2015: 87.0, y2016: 88.5, y2017: 89.0, y2018: 90.0, y2019: 91.0, y2020: 92.0, y2021: 93.0, y2022: 93.5, skor: 93.5 }
  },
  rekomendasi360: "Diperlukan peningkatan kompetensi untuk meningkatkan produktivitas, etika kerja dan kemampuan menyelesaikan masalah kompleks.",
  perilaku360Scores: {
    teknis: 7,
    produktivitas: 7,
    kualitas: 8
  },
  gapCompetencyPercentage: 50
};

export interface JabatanHistoryItem {
  id: string;
  jenisJabatan: string;
  namaJabatan: string;
  unitKerja: string;
  unitEselon2: string;
  unitEselon3?: string;
  unitEselon4?: string;
  periodeTeks: string;
  durasi: string;
  noSk: string;
  tanggalSk: string;
  noPelantikan?: string;
  tanggalPelantikan?: string;
  rolePeran?: string;
  isCurrent: boolean;
}

const DEFAULT_JABATAN_LIST: JabatanHistoryItem[] = [
  {
    id: 'jab-1',
    jenisJabatan: 'Fungsional',
    namaJabatan: 'Analis Kekayaan Intelektual Ahli Pertama',
    unitKerja: 'Bagian Program dan Pelaporan, Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    unitEselon2: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    unitEselon3: 'Bagian Program dan Pelaporan',
    periodeTeks: '15 Maret 2024 - Sekarang',
    durasi: '1 Tahun 3 Bulan',
    noSk: 'SEK-08.KP.03.03-2024',
    tanggalSk: '2024-03-15',
    noPelantikan: 'SEK-PL.01.02-2024',
    tanggalPelantikan: '2024-03-25',
    rolePeran: 'Analis Perencanaan Kinerja KI',
    isCurrent: true
  },
  {
    id: 'jab-2',
    jenisJabatan: 'Fungsional',
    namaJabatan: 'Analis Kekayaan Intelektual Ahli Pertama',
    unitKerja: 'Tim Pengelolaan Sumber Daya Manusia, Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    unitEselon2: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    unitEselon3: 'Tim Pengelolaan Sumber Daya Manusia',
    periodeTeks: '1 Juni 2023 - 15 Maret 2024',
    durasi: '9 Bulan',
    noSk: 'SEK-03.KP.03.03-2023',
    tanggalSk: '2023-05-28',
    rolePeran: 'Analis Kompetensi & Karier',
    isCurrent: false
  },
  {
    id: 'jab-3',
    jenisJabatan: 'Pelaksana',
    namaJabatan: 'Analis Pengembangan Pegawai',
    unitKerja: 'Tim Pengelolaan Sumber Daya Manusia, Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    unitEselon2: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
    unitEselon3: 'Tim Pengelolaan Sumber Daya Manusia',
    periodeTeks: '11 November 2022 - 1 Juni 2023',
    durasi: '7 Bulan',
    noSk: 'SEK-11.KP.02.01-2022',
    tanggalSk: '2022-11-10',
    rolePeran: 'Pengelola Diklat & Bangkom',
    isCurrent: false
  }
];

export const TalentDevelopmentView: React.FC<Props> = ({
  pegawaiList,
  riwayatPelatihanList,
  selectedNip,
  onSelectNip,
  canEdit = true,
  initialSection
}) => {
  // Select employee (default to selected, or Nizar Fikri, or Wahdan Hafizh, or first in list)
  const activePegawai = useMemo(() => {
    if (selectedNip) {
      const found = pegawaiList.find(p => p.nip === selectedNip);
      if (found) return found;
    }
    const nizar = pegawaiList.find(p => p.nama.toLowerCase().includes('nizar') || p.nip === '198911292010121001');
    if (nizar) return nizar;
    const wahdan = pegawaiList.find(p => p.nama.toLowerCase().includes('wahdan') || p.nip === '199402012015031001');
    if (wahdan) return wahdan;
    if (pegawaiList.length > 0) return pegawaiList[0];
    return {
      id: 'PEG-NIZAR',
      nip: '198911292010121001',
      nama: 'NIZAR FIKRI, SH, M.H.',
      golRuang: 'III/c',
      pangkat: 'Penata',
      jabatan: 'ANALIS SDM APARATUR MUDA',
      unitKerja: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
      subBagian: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
      bagian: 'Sekretariat',
      gender: 'L' as const,
      jenisPegawai: 'PNS',
      status: 'Aktif'
    };
  }, [pegawaiList, selectedNip]);

  // Active navigation section from left sidebar
  const [activeSection, setActiveSection] = useState<SidebarSection>(initialSection || 'tentang_saya');

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);
  
  // Sub tab for Asesmen
  const [asessmentSubTab, setAsessmentSubTab] = useState<'manajerial' | 'perilaku360' | 'skala360' | 'kehadiran_teknis'>('manajerial');

  // =========================================================================
  // STANDAR KOMPETENSI JABATAN & GAP ANALYSIS LOGIC
  // =========================================================================
  // Default target jabatan based on employee's current position
  const defaultTargetJabatan = useMemo(() => {
    const res = getKompetensiByJabatan(activePegawai.jabatan || '');
    return res.matchedJabatan;
  }, [activePegawai.jabatan]);

  const [selectedJabatanTarget, setSelectedJabatanTarget] = useState<string>(defaultTargetJabatan);

  // Sync target jabatan when activePegawai changes
  useEffect(() => {
    setSelectedJabatanTarget(defaultTargetJabatan);
  }, [defaultTargetJabatan]);

  // Filter & search for Standar Kompetensi
  const [skjSearch, setSkjSearch] = useState('');
  const [skjJenisFilter, setSkjJenisFilter] = useState<'Semua' | 'Teknis' | 'Manajerial' | 'Sosial Kultural' | 'Fungsional' | 'Struktural'>('Semua');

  // Competency items for currently selected jabatan
  const kompetensiForSelectedJabatan = useMemo(() => {
    return MASTER_KOMPETENSI_JABATAN.filter(k => k.jabatan === selectedJabatanTarget);
  }, [selectedJabatanTarget]);

  // Filtered competencies in Standar Kompetensi table
  const filteredKompetensiList = useMemo(() => {
    return kompetensiForSelectedJabatan.filter(item => {
      const matchesJenis = skjJenisFilter === 'Semua' || item.jenis === skjJenisFilter;
      const matchesSearch = !skjSearch || 
        item.namaKompetensi.toLowerCase().includes(skjSearch.toLowerCase()) ||
        (item.lembaga && item.lembaga.toLowerCase().includes(skjSearch.toLowerCase())) ||
        item.jenis.toLowerCase().includes(skjSearch.toLowerCase());
      return matchesJenis && matchesSearch;
    });
  }, [kompetensiForSelectedJabatan, skjJenisFilter, skjSearch]);

  // Employee's actual completed trainings for this NIP
  const employeeTrainings = useMemo(() => {
    return riwayatPelatihanList.filter(r => r.nip === activePegawai.nip);
  }, [riwayatPelatihanList, activePegawai.nip]);

  // User-toggled fulfillment state in local storage
  const storageKeyFulfilled = `talent_fulfilled_${activePegawai.nip}_${selectedJabatanTarget.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const [manualFulfilled, setManualFulfilled] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(storageKeyFulfilled);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKeyFulfilled);
      setManualFulfilled(saved ? JSON.parse(saved) : {});
    } catch {
      setManualFulfilled({});
    }
  }, [storageKeyFulfilled]);

  // Check if a competency is fulfilled
  const checkIsFulfilled = (komp: KompetensiItem): boolean => {
    if (manualFulfilled[komp.id] !== undefined) {
      return manualFulfilled[komp.id];
    }
    // Auto-detect from completed trainings
    const nameNorm = komp.namaKompetensi.toLowerCase();
    const hasMatchingTraining = employeeTrainings.some(t => {
      const tName = (t.namaKegiatan || '').toLowerCase();
      if (tName.includes(nameNorm) || nameNorm.includes(tName)) return true;
      const wipoMatch = komp.namaKompetensi.match(/DL-\d+/i);
      if (wipoMatch && tName.includes(wipoMatch[0].toLowerCase())) return true;
      return false;
    });
    return hasMatchingTraining;
  };

  const toggleFulfillment = (kompId: string) => {
    const komp = kompetensiForSelectedJabatan.find(k => k.id === kompId);
    const currentVal = komp ? checkIsFulfilled(komp) : false;
    const updated = { ...manualFulfilled, [kompId]: !currentVal };
    setManualFulfilled(updated);
    try {
      localStorage.setItem(storageKeyFulfilled, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Gap metrics
  const totalRequiredKompetensi = kompetensiForSelectedJabatan.length;
  const fulfilledKompetensiCount = useMemo(() => {
    return kompetensiForSelectedJabatan.filter(k => checkIsFulfilled(k)).length;
  }, [kompetensiForSelectedJabatan, manualFulfilled, employeeTrainings]);

  const gapPercentage = useMemo(() => {
    if (totalRequiredKompetensi === 0) return 100;
    return Math.round((fulfilledKompetensiCount / totalRequiredKompetensi) * 100);
  }, [fulfilledKompetensiCount, totalRequiredKompetensi]);

  // Filter for Gap Kompetensi view
  const [gapFilter, setGapFilter] = useState<'Semua' | 'SKJ' | 'Sertifikasi' | 'Pelatihan'>('Semua');

  // Local storage profile data
  const storageKeyProfile = `talent_profile_${activePegawai.nip}`;
  const [profileData, setProfileData] = useState<TalentProfileData>(() => {
    try {
      const saved = localStorage.getItem(storageKeyProfile);
      return saved ? { ...DEFAULT_PROFILE_DATA, ...JSON.parse(saved) } : DEFAULT_PROFILE_DATA;
    } catch {
      return DEFAULT_PROFILE_DATA;
    }
  });

  // Local storage for Riwayat Jabatan
  const storageKeyJabatan = `talent_jabatan_${activePegawai.nip}`;
  const [jabatanList, setJabatanList] = useState<JabatanHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyJabatan);
      return saved ? JSON.parse(saved) : DEFAULT_JABATAN_LIST;
    } catch {
      return DEFAULT_JABATAN_LIST;
    }
  });

  // Keep state updated when activePegawai changes
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(storageKeyProfile);
      setProfileData(savedProfile ? { ...DEFAULT_PROFILE_DATA, ...JSON.parse(savedProfile) } : DEFAULT_PROFILE_DATA);
    } catch {
      setProfileData(DEFAULT_PROFILE_DATA);
    }

    try {
      const savedJabatan = localStorage.getItem(storageKeyJabatan);
      setJabatanList(savedJabatan ? JSON.parse(savedJabatan) : DEFAULT_JABATAN_LIST);
    } catch {
      setJabatanList(DEFAULT_JABATAN_LIST);
    }
  }, [storageKeyProfile, storageKeyJabatan]);

  // Edit "Tentang Saya" Modal State
  const [isEditTentangOpen, setIsEditTentangOpen] = useState(false);
  const [editTentangForm, setEditTentangForm] = useState({
    summary: profileData.summary,
    minat: profileData.minat,
    visiNilai: profileData.visiNilai,
    kelebihanKekurangan: profileData.kelebihanKekurangan,
    isPromotablePangkat: profileData.isPromotablePangkat,
    promotablePangkatLabel: profileData.promotablePangkatLabel,
    isPromotableJabatan: profileData.isPromotableJabatan,
    promotableJabatanLabel: profileData.promotableJabatanLabel,
  });

  // Edit Header & Promotability Modal State
  const [isEditHeaderOpen, setIsEditHeaderOpen] = useState(false);
  const [editHeaderForm, setEditHeaderForm] = useState({
    asessmentTerakhir: profileData.asessmentTerakhir,
    asessmentSelanjutnya: profileData.asessmentSelanjutnya,
    tmtPangkatTerakhir: profileData.tmtPangkatTerakhir,
    tmtJabatanTerakhir: profileData.tmtJabatanTerakhir,
    tmtSpSpmtTerakhir: profileData.tmtSpSpmtTerakhir,
    isPromotablePangkat: profileData.isPromotablePangkat,
    promotablePangkatLabel: profileData.promotablePangkatLabel,
    isPromotableJabatan: profileData.isPromotableJabatan,
    promotableJabatanLabel: profileData.promotableJabatanLabel,
  });

  // Edit Data Asesmen (Perilaku 360 & Manajerial) Modal State
  const [isEditAsesmenOpen, setIsEditAsesmenOpen] = useState(false);
  const [editAsesmenTab, setEditAsesmenTab] = useState<'perilaku360' | 'manajerial'>('perilaku360');
  const [editAsesmenForm, setEditAsesmenForm] = useState({
    radarK01: 88,
    radarK02: 92,
    radarK03: 86,
    radarK04: 84,
    radarK05: 95,
    rekomendasi360: '',
    multiRater: DEFAULT_PROFILE_DATA.perilaku360MultiRater!,
    manajerial2023: { ...DEFAULT_PROFILE_DATA.manajerialScore2023 },
    rekomendasiManajerial: '',
  });

  // Save Header / Promotability changes
  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...profileData,
      ...editHeaderForm
    };
    setProfileData(updated);
    try {
      localStorage.setItem(storageKeyProfile, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setIsEditHeaderOpen(false);
  };

  // Save Asesmen changes (Radar 360, Multi Rater, Manajerial, Rekomendasi)
  const handleSaveAsesmen = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: TalentProfileData = {
      ...profileData,
      perilaku360Radar: {
        k01: Number(editAsesmenForm.radarK01) || 0,
        k02: Number(editAsesmenForm.radarK02) || 0,
        k03: Number(editAsesmenForm.radarK03) || 0,
        k04: Number(editAsesmenForm.radarK04) || 0,
        k05: Number(editAsesmenForm.radarK05) || 0,
      },
      perilaku360MultiRater: editAsesmenForm.multiRater,
      rekomendasi360: editAsesmenForm.rekomendasi360,
      manajerialScore2023: editAsesmenForm.manajerial2023,
      rekomendasiManajerial: editAsesmenForm.rekomendasiManajerial
    };
    setProfileData(updated);
    try {
      localStorage.setItem(storageKeyProfile, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setIsEditAsesmenOpen(false);
  };

  // Add / Edit Riwayat Jabatan Modal State (Page 7)
  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState(false);
  const [jabatanFormData, setJabatanFormData] = useState<Partial<JabatanHistoryItem>>({
    jenisJabatan: 'Fungsional',
    namaJabatan: 'Pemeriksa Merek Ahli Muda',
    unitEselon2: 'Direktorat Kerja Sama, Pemberdayaan dan Edukasi',
    unitEselon3: 'Sub Direktorat Kerja Sama',
    unitEselon4: '-',
    rolePeran: 'Pemeriksa Substantif Merek',
    periodeTeks: '',
    durasi: '',
    noSk: '',
    tanggalSk: '',
    noPelantikan: '',
    tanggalPelantikan: ''
  });

  // Save Tentang Saya changes
  const handleSaveTentang = () => {
    const updated = {
      ...profileData,
      ...editTentangForm
    };
    setProfileData(updated);
    try {
      localStorage.setItem(storageKeyProfile, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setIsEditTentangOpen(false);
  };

  // Save Jabatan Form changes
  const handleSaveJabatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jabatanFormData.namaJabatan) {
      alert("Nama jabatan harus diisi.");
      return;
    }
    const newItem: JabatanHistoryItem = {
      id: jabatanFormData.id || `jab-${Date.now()}`,
      jenisJabatan: jabatanFormData.jenisJabatan || 'Fungsional',
      namaJabatan: jabatanFormData.namaJabatan || '',
      unitKerja: `${jabatanFormData.unitEselon3 || ''}, ${jabatanFormData.unitEselon2 || ''}`,
      unitEselon2: jabatanFormData.unitEselon2 || '',
      unitEselon3: jabatanFormData.unitEselon3 || '',
      unitEselon4: jabatanFormData.unitEselon4 || '-',
      periodeTeks: jabatanFormData.periodeTeks || `${jabatanFormData.tanggalSk || 'Baru'} - Sekarang`,
      durasi: jabatanFormData.durasi || 'Baru',
      noSk: jabatanFormData.noSk || '',
      tanggalSk: jabatanFormData.tanggalSk || '',
      noPelantikan: jabatanFormData.noPelantikan || '',
      tanggalPelantikan: jabatanFormData.tanggalPelantikan || '',
      rolePeran: jabatanFormData.rolePeran || '',
      isCurrent: jabatanFormData.isCurrent !== undefined ? jabatanFormData.isCurrent : true
    };

    let updated: JabatanHistoryItem[];
    if (jabatanFormData.id) {
      updated = jabatanList.map(j => j.id === newItem.id ? newItem : j);
    } else {
      updated = [newItem, ...jabatanList.map(j => ({ ...j, isCurrent: false }))];
    }
    setJabatanList(updated);
    try {
      localStorage.setItem(storageKeyJabatan, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setIsJabatanModalOpen(false);
  };

  // Radar chart data for Manajerial (8 aspects, Page 2)
  const manajerialChartData = [
    { aspect: '(M.01) Integritas', code: 'M.01', eksisting: profileData.manajerialScore2023.M01 || 3, minimum: profileData.manajerialMinimum.M01 || 3, fullMark: 4 },
    { aspect: '(M.02) Kerja Sama', code: 'M.02', eksisting: profileData.manajerialScore2023.M02 || 3, minimum: profileData.manajerialMinimum.M02 || 2, fullMark: 4 },
    { aspect: '(M.03) Komunikasi', code: 'M.03', eksisting: profileData.manajerialScore2023.M03 || 3, minimum: profileData.manajerialMinimum.M03 || 2, fullMark: 4 },
    { aspect: '(M.04) Orientasi Pada Hasil', code: 'M.04', eksisting: profileData.manajerialScore2023.M04 || 3, minimum: profileData.manajerialMinimum.M04 || 3, fullMark: 4 },
    { aspect: '(M.05) Pelayanan Publik', code: 'M.05', eksisting: profileData.manajerialScore2023.M05 || 2, minimum: profileData.manajerialMinimum.M05 || 3, fullMark: 4 },
    { aspect: '(M.06) Pengembangan Diri', code: 'M.06', eksisting: profileData.manajerialScore2023.M06 || 3, minimum: profileData.manajerialMinimum.M06 || 2, fullMark: 4 },
    { aspect: '(M.07) Mengelola Perubahan', code: 'M.07', eksisting: profileData.manajerialScore2023.M07 || 2, minimum: profileData.manajerialMinimum.M07 || 2, fullMark: 4 },
    { aspect: '(M.08) Pengambilan Keputusan', code: 'M.08', eksisting: profileData.manajerialScore2023.M08 || 2, minimum: profileData.manajerialMinimum.M08 || 3, fullMark: 4 },
  ];

  // Radar chart data for Perilaku 360 (5 aspects, Page 5)
  const perilaku360ChartData = [
    { aspect: '(K.01) Kompetensi Kerja', eksisting: profileData.perilaku360Radar?.k01 ?? 88, target: 80, fullMark: 100 },
    { aspect: '(K.02) Perilaku & Sikap', eksisting: profileData.perilaku360Radar?.k02 ?? 92, target: 85, fullMark: 100 },
    { aspect: '(K.03) Komunikasi', eksisting: profileData.perilaku360Radar?.k03 ?? 86, target: 80, fullMark: 100 },
    { aspect: '(K.04) Inisiatif & Kreatifitas', eksisting: profileData.perilaku360Radar?.k04 ?? 84, target: 80, fullMark: 100 },
    { aspect: '(K.05) Kepatuhan Nilai Budaya', eksisting: profileData.perilaku360Radar?.k05 ?? 95, target: 90, fullMark: 100 },
  ];

  // Employee Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Navigation Items according to Mockup
  const sidebarItems: { key: SidebarSection; label: string; preview?: string }[] = [
    { key: 'tentang_saya', label: 'Tentang Saya', preview: profileData.summary ? profileData.summary.slice(0, 58) + '...' : 'Ringkasan profil dan minat kerja' },
    { key: 'hasil_assesment', label: 'Hasil Assesment' },
    { key: 'standar_kompetensi', label: 'Standar Kompetensi' },
    { key: 'gap_kompetensi', label: 'Gap Kompetensi' },
    { key: 'nilai_performa', label: 'Nilai Performa' },
    { key: 'riwayat_jabatan', label: 'Riwayat Jabatan' },
    { key: 'pengayaan_peran', label: 'Pengayaan Peran' },
    { key: 'sertifikasi', label: 'Sertifikasi' },
    { key: 'pelatihan', label: 'Pelatihan' },
    { key: 'pembicara', label: 'Pembicara' },
    { key: 'pendidikan', label: 'Pendidikan' },
    { key: 'penghargaan', label: 'Penghargaan' },
    { key: 'karya_tulis', label: 'Karya Tulis' },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* EMPLOYEE SELECTOR & QUICK BAR */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
            <i className="bi bi-person-bounding-box text-base"></i>
          </div>
          <div className="flex-1 min-w-[200px]">
            <span className="text-[9px] font-black uppercase text-gray-400 block tracking-widest">Pilih Pegawai Asesmen</span>
            <select
              value={activePegawai.nip}
              onChange={(e) => onSelectNip && onSelectNip(e.target.value)}
              className="w-full text-xs font-black text-gray-900 bg-transparent border-0 outline-none cursor-pointer"
            >
              {pegawaiList.map(p => (
                <option key={p.nip} value={p.nip}>
                  {formatPegawaiName(p.nama)} — {p.nip} ({p.jabatan || 'ASN'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
            <i className="bi bi-check-circle-fill"></i> Data Talenta Terverifikasi
          </span>
        </div>
      </div>

      {/* HEADER PROFILE CARD (EXACT REPLICA OF PAGES 1-9 HEADER) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Avatar MW */}
          <div className="lg:col-span-1 flex justify-center lg:justify-start">
            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-[#64748b] text-white flex items-center justify-center font-bold text-2xl md:text-3xl shadow-md border-4 border-white tracking-tight">
              {getInitials(activePegawai.nama)}
            </div>
          </div>

          {/* Kolom Kiri: Data Pegawai */}
          <div className="lg:col-span-4 space-y-1 text-xs">
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 text-gray-400 font-bold">Nama</span>
              <span className="col-span-8 font-black text-gray-950">{formatPegawaiName(activePegawai.nama)}</span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 text-gray-400 font-bold">NIP</span>
              <span className="col-span-8 font-bold text-gray-800 tracking-wide">{activePegawai.nip}</span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 text-gray-400 font-bold">Gol. / Pangkat</span>
              <span className="col-span-8 font-medium text-gray-800">
                {activePegawai.golRuang || 'III/a'} / {activePegawai.pangkat || 'Penata Muda'}
              </span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 text-gray-400 font-bold">Jabatan / Grade</span>
              <span className="col-span-8 font-medium text-gray-800 leading-snug">
                {activePegawai.jabatan || 'Analis Kekayaan Intelektual Ahli Pertama / 8'}
              </span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 text-gray-400 font-bold">Tim Kerja / Unit</span>
              <span className="col-span-8 font-medium text-gray-800">
                {activePegawai.subBagian || 'Tim Pengelolaan SDM'} / {activePegawai.bagian || 'Sekretariat'}
              </span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 text-gray-400 font-bold">Satuan Kerja</span>
              <span className="col-span-8 font-medium text-gray-800">
                {activePegawai.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual'}
              </span>
            </div>
          </div>

          {/* Kolom Tengah: Info Asesmen & TMT */}
          <div className="lg:col-span-4 space-y-1 text-xs border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-6 text-gray-400 font-bold">Asesmen Terakhir</span>
              <span className="col-span-6 font-bold text-gray-800">{profileData.asessmentTerakhir}</span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-6 text-gray-400 font-bold">Asesmen Selanjutnya</span>
              <span className="col-span-6 font-bold text-gray-800">{profileData.asessmentSelanjutnya}</span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-6 text-gray-400 font-bold">TMT. Pangkat Terakhir</span>
              <span className="col-span-6 font-medium text-gray-800">{profileData.tmtPangkatTerakhir}</span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-6 text-gray-400 font-bold">TMT. Jabatan Terakhir</span>
              <span className="col-span-6 font-medium text-gray-800">{profileData.tmtJabatanTerakhir}</span>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-6 text-gray-400 font-bold">TMT. SP/SPMT Terakhir</span>
              <span className="col-span-6 font-medium text-gray-800">{profileData.tmtSpSpmtTerakhir}</span>
            </div>
          </div>

          {/* Kolom Kanan: Badges Promotability */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 items-start lg:items-end justify-center">
            {profileData.isPromotablePangkat ? (
              <span className="px-4 py-2 bg-[#22c55e] text-white rounded-xl text-[11px] font-black uppercase tracking-tight shadow-sm text-center">
                {profileData.promotablePangkatLabel}
              </span>
            ) : (
              <span className="px-4 py-2 bg-[#e11d48] text-white rounded-xl text-[11px] font-black uppercase tracking-tight shadow-sm text-center">
                {profileData.promotablePangkatLabel || 'Non Promotable Pangkat'}
              </span>
            )}

            {profileData.isPromotableJabatan ? (
              <span className="px-4 py-2 bg-[#22c55e] text-white rounded-xl text-[11px] font-black uppercase tracking-tight shadow-sm text-center">
                {profileData.promotableJabatanLabel}
              </span>
            ) : (
              <span className="px-4 py-2 bg-[#be123c] text-white rounded-xl text-[11px] font-black uppercase tracking-tight shadow-sm text-center">
                {profileData.promotableJabatanLabel}
              </span>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditHeaderForm({
                    asessmentTerakhir: profileData.asessmentTerakhir,
                    asessmentSelanjutnya: profileData.asessmentSelanjutnya,
                    tmtPangkatTerakhir: profileData.tmtPangkatTerakhir,
                    tmtJabatanTerakhir: profileData.tmtJabatanTerakhir,
                    tmtSpSpmtTerakhir: profileData.tmtSpSpmtTerakhir,
                    isPromotablePangkat: profileData.isPromotablePangkat,
                    promotablePangkatLabel: profileData.promotablePangkatLabel,
                    isPromotableJabatan: profileData.isPromotableJabatan,
                    promotableJabatanLabel: profileData.promotableJabatanLabel,
                  });
                  setIsEditHeaderOpen(true);
                }}
                className="mt-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                title="Edit Info Asesmen & Status Promotable"
              >
                <i className="bi bi-pencil-square text-indigo-600"></i>
                <span>Edit Info Asesmen</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: SIDEBAR ACCORDION + MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR ACCORDION / NAVIGATION */}
        <div className="lg:col-span-3 space-y-2">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-3 space-y-1.5">
            {sidebarItems.map((item) => {
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-gray-100 text-gray-950 font-black shadow-inner'
                      : 'bg-white text-gray-700 hover:bg-gray-50 font-bold'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs tracking-tight flex items-center gap-2">
                      <span className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}>
                        {isActive ? '●' : '○'}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.preview && (
                      <p className="text-[10px] text-gray-400 font-normal mt-1 truncate leading-tight">
                        {item.preview}
                      </p>
                    )}
                  </div>
                  <i className={`bi bi-chevron-${isActive ? 'up' : 'down'} text-xs text-gray-400 shrink-0`}></i>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="lg:col-span-9">
          {/* SECTION 1: TENTANG SAYA (PAGE 1) */}
          {activeSection === 'tentang_saya' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Tentang Saya
                </h3>
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditTentangForm({
                        summary: profileData.summary,
                        minat: profileData.minat,
                        visiNilai: profileData.visiNilai,
                        kelebihanKekurangan: profileData.kelebihanKekurangan,
                        isPromotablePangkat: profileData.isPromotablePangkat,
                        promotablePangkatLabel: profileData.promotablePangkatLabel,
                        isPromotableJabatan: profileData.isPromotableJabatan,
                        promotableJabatanLabel: profileData.promotableJabatanLabel,
                      });
                      setIsEditTentangOpen(true);
                    }}
                    className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Edit Tentang Saya"
                  >
                    <i className="bi bi-pencil-square text-lg"></i>
                  </button>
                )}
              </div>

              {/* 1. Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-gray-950 uppercase tracking-tight">
                  Summary
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed text-justify">
                  {profileData.summary}
                </p>
              </div>

              {/* 2. Minat */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-gray-950 uppercase tracking-tight">
                  Minat
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed text-justify">
                  {profileData.minat}
                </p>
              </div>

              {/* 3. Visi & Nilai Pribadi */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-gray-950 uppercase tracking-tight">
                  Visi & Nilai Pribadi
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed text-justify">
                  {profileData.visiNilai}
                </p>
              </div>

              {/* 4. Kelebihan & Kekurangan */}
              <div className="space-y-2">
                <h4 className="text-sm font-black text-gray-950 uppercase tracking-tight">
                  Kelebihan & Kekurangan
                </h4>
                <p className="text-xs text-gray-700 leading-relaxed text-justify">
                  {profileData.kelebihanKekurangan}
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: HASIL ASSESMENT (PAGES 2, 3, 5, 6) */}
          {activeSection === 'hasil_assesment' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                    Hasil Assesment
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Evaluasi Kompetensi Manajerial, Sosial Kultural & Perilaku 360
                  </p>
                </div>

                {/* Sub Tab Switcher & Edit Button */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex flex-wrap bg-gray-100 p-1 rounded-2xl">
                    <button
                      onClick={() => setAsessmentSubTab('manajerial')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        asessmentSubTab === 'manajerial' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Manajerial
                    </button>
                    <button
                      onClick={() => setAsessmentSubTab('perilaku360')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        asessmentSubTab === 'perilaku360' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Perilaku 360
                    </button>
                    <button
                      onClick={() => setAsessmentSubTab('skala360')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        asessmentSubTab === 'skala360' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Skala Rating 0-10
                    </button>
                    <button
                      onClick={() => setAsessmentSubTab('kehadiran_teknis')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                        asessmentSubTab === 'kehadiran_teknis' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
                      }`}
                    >
                      Kehadiran & Teknis
                    </button>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditAsesmenTab(asessmentSubTab === 'manajerial' ? 'manajerial' : 'perilaku360');
                        setEditAsesmenForm({
                          radarK01: profileData.perilaku360Radar?.k01 ?? 88,
                          radarK02: profileData.perilaku360Radar?.k02 ?? 92,
                          radarK03: profileData.perilaku360Radar?.k03 ?? 86,
                          radarK04: profileData.perilaku360Radar?.k04 ?? 84,
                          radarK05: profileData.perilaku360Radar?.k05 ?? 95,
                          rekomendasi360: profileData.rekomendasi360 || DEFAULT_PROFILE_DATA.rekomendasi360 || '',
                          multiRater: profileData.perilaku360MultiRater || DEFAULT_PROFILE_DATA.perilaku360MultiRater!,
                          manajerial2023: { ...(profileData.manajerialScore2023 || DEFAULT_PROFILE_DATA.manajerialScore2023) },
                          rekomendasiManajerial: profileData.rekomendasiManajerial || DEFAULT_PROFILE_DATA.rekomendasiManajerial || '',
                        });
                        setIsEditAsesmenOpen(true);
                      }}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Edit Nilai & Rekomendasi Asesmen"
                    >
                      <i className="bi bi-pencil-square text-xs"></i>
                      <span>Edit Data Asesmen</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUBTAB 1: MANAJERIAL RADAR & HISTORICAL TABLE (PAGE 2) */}
              {asessmentSubTab === 'manajerial' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-gray-900 uppercase">
                      Manajerial
                    </h4>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <span className="h-3 w-3 rounded-full bg-amber-500 inline-block"></span> Level Eksisting
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <span className="h-3 w-3 rounded-full bg-purple-500 inline-block"></span> Level Minimum
                      </span>
                    </div>
                  </div>

                  {/* Radar Chart Manajerial */}
                  <div className="h-80 w-full flex items-center justify-center bg-gray-50/50 rounded-2xl border border-gray-100 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius="75%" data={manajerialChartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="aspect" tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 4]} tick={{ fontSize: 9 }} />
                        <Radar name="Level Eksisting" dataKey="eksisting" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.45} />
                        <Radar name="Level Minimum" dataKey="minimum" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Historical Comparison Table by Year */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px]">
                          <th className="p-2.5 border border-gray-200">Tahun</th>
                          <th className="p-2.5 border border-gray-200">M.01</th>
                          <th className="p-2.5 border border-gray-200">M.02</th>
                          <th className="p-2.5 border border-gray-200">M.03</th>
                          <th className="p-2.5 border border-gray-200">M.04</th>
                          <th className="p-2.5 border border-gray-200">M.05</th>
                          <th className="p-2.5 border border-gray-200">M.06</th>
                          <th className="p-2.5 border border-gray-200">M.07</th>
                          <th className="p-2.5 border border-gray-200">M.08</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50 font-bold">
                          <td className="p-2.5 border border-gray-200 bg-gray-50">2023</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M01 ?? 3) >= 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M01 ?? 3}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M02 ?? 3) >= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M02 ?? 3}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M03 ?? 3) >= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M03 ?? 3}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M04 ?? 3) >= 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M04 ?? 3}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M05 ?? 2) >= 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M05 ?? 2}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M06 ?? 3) >= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M06 ?? 3}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M07 ?? 2) >= 2 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M07 ?? 2}</td>
                          <td className={`p-2.5 border border-gray-200 ${Number(profileData.manajerialScore2023?.M08 ?? 2) >= 3 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{profileData.manajerialScore2023?.M08 ?? 2}</td>
                        </tr>
                        <tr className="hover:bg-gray-50 text-gray-600 font-medium">
                          <td className="p-2.5 border border-gray-200 bg-gray-50 font-bold">2021</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M01 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M02 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M03 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M04 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M05 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M06 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M07 ?? 2}</td>
                          <td className="p-2.5 border border-gray-200">{profileData.manajerialScore2021?.M08 ?? 1}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Rekomendasi Box (Page 2) */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                      Rekomendasi:
                    </span>
                    <p className="text-xs text-gray-800 leading-relaxed">
                      {profileData.rekomendasiManajerial || DEFAULT_PROFILE_DATA.rekomendasiManajerial}
                    </p>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: PERILAKU KERJA 360 RADAR & MULTI-RATER TABLE (PAGE 5) */}
              {asessmentSubTab === 'perilaku360' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-black text-gray-900 uppercase">
                        Perilaku Kerja - 360
                      </h4>
                      <p className="text-[10px] text-gray-400 font-semibold">
                        Sesuai PP 30 Tahun 2019 (Orientasi Pelayanan, Komitmen, Inisiatif Kerja, Kerja Sama, Kepemimpinan)
                      </p>
                    </div>
                  </div>

                  {/* Radar Chart Perilaku 360 */}
                  <div className="h-80 w-full flex items-center justify-center bg-gray-50/50 rounded-2xl border border-gray-100 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius="75%" data={perilaku360ChartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="aspect" tick={{ fill: '#334155', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Skor Riil" dataKey="eksisting" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} />
                        <Radar name="Standar Target" dataKey="target" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Multi-Rater Table (Page 5) */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[9px]">
                          <th className="p-2 border border-gray-200 text-left">Ket.</th>
                          <th className="p-2 border border-gray-200">2015</th>
                          <th className="p-2 border border-gray-200">2016</th>
                          <th className="p-2 border border-gray-200">2017</th>
                          <th className="p-2 border border-gray-200">2018</th>
                          <th className="p-2 border border-gray-200">2019</th>
                          <th className="p-2 border border-gray-200">2020</th>
                          <th className="p-2 border border-gray-200">2021</th>
                          <th className="p-2 border border-gray-200">2022</th>
                          <th className="p-2 border border-gray-200 bg-blue-50 text-blue-900">Skor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {[
                          { label: 'Atasan', key: 'atasan' as const },
                          { label: 'Bawahan', key: 'bawahan' as const },
                          { label: 'Rekan', key: 'rekan' as const },
                          { label: 'Diri Sendiri', key: 'diriSendiri' as const },
                        ].map((row) => {
                          const data = profileData.perilaku360MultiRater?.[row.key] || DEFAULT_PROFILE_DATA.perilaku360MultiRater![row.key];
                          return (
                            <tr key={row.key}>
                              <td className="p-2 border border-gray-200 text-left font-bold bg-gray-50">{row.label}</td>
                              <td className="p-2 border border-gray-200">{data.y2015}</td>
                              <td className="p-2 border border-gray-200">{data.y2016}</td>
                              <td className="p-2 border border-gray-200">{data.y2017}</td>
                              <td className="p-2 border border-gray-200">{data.y2018}</td>
                              <td className="p-2 border border-gray-200">{data.y2019}</td>
                              <td className="p-2 border border-gray-200">{data.y2020}</td>
                              <td className="p-2 border border-gray-200">{data.y2021}</td>
                              <td className="p-2 border border-gray-200">{data.y2022}</td>
                              <td className="p-2 border border-gray-200 font-black text-emerald-700 bg-emerald-50">{data.skor}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Rekomendasi Box (Page 5) */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                      Rekomendasi:
                    </span>
                    <p className="text-xs text-gray-800 leading-relaxed">
                      {profileData.rekomendasi360 || DEFAULT_PROFILE_DATA.rekomendasi360}
                    </p>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: SKALA RATING 0-10 INTERAKTIF (PAGE 3) */}
              {asessmentSubTab === 'skala360' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-base font-black text-gray-900 uppercase">
                      Perilaku Kerja - 360
                    </h4>
                    <p className="text-xs text-indigo-600 font-black uppercase mt-0.5">
                      (K.01) Kompetensi Kerja
                    </p>
                  </div>

                  {/* 1. Kemampuan Teknis */}
                  <div className="space-y-2 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-800">
                        Kemampuan Teknis
                      </span>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                        Skor: {profileData.perilaku360Scores.teknis} / 10
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const isSelected = profileData.perilaku360Scores.teknis === idx;
                        let colorClass = 'bg-[#f43f5e] text-white'; // 0-6
                        if (idx >= 7 && idx <= 8) colorClass = 'bg-[#eab308] text-white'; // 7-8
                        if (idx >= 9) colorClass = 'bg-[#10b981] text-white'; // 9-10
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...profileData,
                                perilaku360Scores: { ...profileData.perilaku360Scores, teknis: idx }
                              };
                              setProfileData(updated);
                              localStorage.setItem(storageKeyProfile, JSON.stringify(updated));
                            }}
                            className={`h-10 w-10 md:h-12 md:w-12 rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? `${colorClass} ring-4 ring-blue-600 ring-offset-2 scale-110 shadow-lg`
                                : `${colorClass} opacity-75 hover:opacity-100`
                            }`}
                          >
                            {idx}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Produktivitas */}
                  <div className="space-y-2 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-800">
                        Produktivitas
                      </span>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                        Skor: {profileData.perilaku360Scores.produktivitas} / 10
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const isSelected = profileData.perilaku360Scores.produktivitas === idx;
                        let colorClass = 'bg-[#f43f5e] text-white';
                        if (idx >= 7 && idx <= 8) colorClass = 'bg-[#eab308] text-white';
                        if (idx >= 9) colorClass = 'bg-[#10b981] text-white';
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const updated = {
                                ...profileData,
                                perilaku360Scores: { ...profileData.perilaku360Scores, produktivitas: idx }
                              };
                              setProfileData(updated);
                              localStorage.setItem(storageKeyProfile, JSON.stringify(updated));
                            }}
                            className={`h-10 w-10 md:h-12 md:w-12 rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? `${colorClass} ring-4 ring-blue-600 ring-offset-2 scale-110 shadow-lg`
                                : `${colorClass} opacity-75 hover:opacity-100`
                            }`}
                          >
                            {idx}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 4: KEHADIRAN, SOSIAL KULTURAL & TEKNIS (PAGE 6) */}
              {asessmentSubTab === 'kehadiran_teknis' && (
                <div className="space-y-8">
                  {/* Kehadiran */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-black text-gray-900 uppercase">
                      Perilaku Kerja - Kehadiran
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[9px]">
                            <th className="p-2 border border-gray-200 text-left">Ket.</th>
                            <th className="p-2 border border-gray-200">2015</th>
                            <th className="p-2 border border-gray-200">2016</th>
                            <th className="p-2 border border-gray-200">2017</th>
                            <th className="p-2 border border-gray-200">2018</th>
                            <th className="p-2 border border-gray-200">2019</th>
                            <th className="p-2 border border-gray-200">2020</th>
                            <th className="p-2 border border-gray-200">2021</th>
                            <th className="p-2 border border-gray-200">2022</th>
                            <th className="p-2 border border-gray-200 bg-blue-50 text-blue-900">Skor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          <tr>
                            <td className="p-2 border border-gray-200 text-left font-bold bg-gray-50">Alpha</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200 font-black text-emerald-700 bg-emerald-50">100</td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-gray-200 text-left font-bold bg-gray-50">Terlambat</td>
                            <td className="p-2 border border-gray-200">2</td>
                            <td className="p-2 border border-gray-200">1</td>
                            <td className="p-2 border border-gray-200">3</td>
                            <td className="p-2 border border-gray-200">2</td>
                            <td className="p-2 border border-gray-200">1</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200">1</td>
                            <td className="p-2 border border-gray-200">0</td>
                            <td className="p-2 border border-gray-200 font-black text-emerald-700 bg-emerald-50">95</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Sosial Kultural & Teknis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <h5 className="text-xs font-black uppercase text-gray-900">Sosial Kultural</h5>
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-200 text-gray-700 font-bold uppercase text-[9px]">
                            <th className="p-2 border border-gray-300">Tahun</th>
                            <th className="p-2 border border-gray-300">SK.01</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2 border border-gray-300 font-bold">2023</td>
                            <td className="p-2 border border-gray-300 text-emerald-700 font-black">Level 2</td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-gray-300 font-bold">2021</td>
                            <td className="p-2 border border-gray-300 text-gray-700 font-bold">Level 1</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-[10px] text-gray-600 leading-tight">
                        <strong>Rekomendasi:</strong> Mengikuti kegiatan peningkatan kompetensi untuk meningkatkan aspek Perekat Bangsa.
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <h5 className="text-xs font-black uppercase text-gray-900">Teknis</h5>
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-200 text-gray-700 font-bold uppercase text-[9px]">
                            <th className="p-2 border border-gray-300">Tahun</th>
                            <th className="p-2 border border-gray-300">T</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-2 border border-gray-300 font-bold">2023</td>
                            <td className="p-2 border border-gray-300 text-emerald-700 font-black">Level 3</td>
                          </tr>
                          <tr>
                            <td className="p-2 border border-gray-300 font-bold">2021</td>
                            <td className="p-2 border border-gray-300 text-gray-700 font-bold">Level 2</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-[10px] text-gray-600 leading-tight">
                        <strong>Rekomendasi:</strong> Mengikuti kegiatan peningkatan kompetensi untuk meningkatkan kemampuan teknis KI.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: STANDAR KOMPETENSI (MATCHING IMAGE CONTOH KOMPETENSI SESUAI JABATAN) */}
          {activeSection === 'standar_kompetensi' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                      <i className="bi bi-diagram-3-fill"></i>
                    </span>
                    Standar Kompetensi Jabatan (SKJ)
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Katalog Kompetensi Teknis, Manajerial, Sosial Kultural & Fungsional Berdasarkan Jabatan DJKI
                  </p>
                </div>

                <button
                  onClick={() => setActiveSection('gap_kompetensi')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-tight shadow-md flex items-center gap-2 self-start md:self-auto cursor-pointer transition-all"
                >
                  <i className="bi bi-clipboard-check"></i>
                  <span>Lihat Gap Pegawai Ini</span>
                </button>
              </div>

              {/* Position Selector Bar */}
              <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                      <i className="bi bi-briefcase-fill text-blue-600"></i>
                      Pilih Jabatan Target untuk Standar Kompetensi:
                    </label>
                    <div className="relative">
                      <select
                        value={selectedJabatanTarget}
                        onChange={(e) => setSelectedJabatanTarget(e.target.value)}
                        className="w-full sm:min-w-[360px] max-w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-sm uppercase"
                      >
                        {LIST_JABATAN_STANDAR.map((jbt) => (
                          <option key={jbt} value={jbt}>
                            {jbt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
                    <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[11px] font-black text-gray-700 shadow-xs">
                      Total: <strong className="text-blue-600">{kompetensiForSelectedJabatan.length}</strong> Kompetensi
                    </span>
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-bold">
                      Teknis: {kompetensiForSelectedJabatan.filter(k => k.jenis === 'Teknis').length}
                    </span>
                    <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-[10px] font-bold">
                      Manajerial: {kompetensiForSelectedJabatan.filter(k => k.jenis === 'Manajerial').length}
                    </span>
                    <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold">
                      Sosbud: {kompetensiForSelectedJabatan.filter(k => k.jenis === 'Sosial Kultural').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Jenis Filter Tabs */}
                <div className="flex flex-wrap bg-gray-100 p-1 rounded-2xl gap-1">
                  {(['Semua', 'Teknis', 'Manajerial', 'Sosial Kultural', 'Fungsional', 'Struktural'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSkjJenisFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                        skjJenisFilter === tab
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[220px]">
                  <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    value={skjSearch}
                    onChange={(e) => setSkjSearch(e.target.value)}
                    placeholder="Cari nama kompetensi..."
                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                  {skjSearch && (
                    <button
                      onClick={() => setSkjSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Authentic Competency Table Matching User's Image */}
              <div className="overflow-hidden border border-gray-200 rounded-2xl shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100/90 text-gray-700 font-black uppercase text-[10px] border-b border-gray-200">
                        <th className="py-3 px-4 w-12 text-center border-r border-gray-200">No</th>
                        <th className="py-3 px-4 w-1/3 border-r border-gray-200">Jabatan</th>
                        <th className="py-3 px-4 border-r border-gray-200">Kompetensi</th>
                        <th className="py-3 px-4 w-32 border-r border-gray-200 text-center">Jenis</th>
                        <th className="py-3 px-4 w-44">Lembaga / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredKompetensiList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">
                            Tidak ditemukan kompetensi yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredKompetensiList.map((item, idx) => {
                          let jenisBadge = 'bg-blue-50 text-blue-700 border-blue-200';
                          if (item.jenis === 'Manajerial') jenisBadge = 'bg-purple-50 text-purple-700 border-purple-200';
                          if (item.jenis === 'Sosial Kultural') jenisBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                          if (item.jenis === 'Fungsional') jenisBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (item.jenis === 'Struktural') jenisBadge = 'bg-rose-50 text-rose-700 border-rose-200';

                          return (
                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-2.5 px-4 text-center font-bold text-gray-500 border-r border-gray-100">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-4 font-bold text-gray-800 border-r border-gray-100 text-[11px] uppercase tracking-tight">
                                {item.jabatan}
                              </td>
                              <td className="py-2.5 px-4 font-black text-gray-950 border-r border-gray-100">
                                <div className="flex items-center gap-2">
                                  <span>{item.namaKompetensi}</span>
                                  {item.namaKompetensi.startsWith('DL-') && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[9px] font-black uppercase shrink-0">
                                      WIPO
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-center border-r border-gray-100">
                                <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-[10px] font-black uppercase ${jenisBadge}`}>
                                  {item.jenis}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-gray-600 text-[11px] font-medium">
                                {item.lembaga ? (
                                  <span className="flex items-center gap-1.5 text-gray-700">
                                    <i className="bi bi-building text-[10px] text-gray-400"></i>
                                    {item.lembaga}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">Standar DJKI / BKN</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informative Footer */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
                <i className="bi bi-info-circle-fill text-blue-600 text-base mt-0.5 shrink-0"></i>
                <div className="space-y-0.5">
                  <p className="font-bold">Dasar Regulasi Standar Kompetensi Jabatan</p>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Kamus kompetensi disusun berdasarkan PermenPANRB No. 38 Tahun 2017 tentang Standar Kompetensi Jabatan ASN, Keputusan Menkumham tentang Standar Kompetensi Teknis Kekayaan Intelektual, serta kurikulum WIPO Academy Distance Learning.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: GAP KOMPETENSI (PAGE 4) WITH DYNAMIC REAL DATA */}
          {activeSection === 'gap_kompetensi' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight flex items-center gap-2.5">
                    <span className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-sm">
                      <i className="bi bi-sliders"></i>
                    </span>
                    Gap & Kesesuaian Kompetensi
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                    Evaluasi Kesenjangan Standar Kompetensi Jabatan terhadap Profil Pegawai
                  </p>
                </div>

                <button
                  onClick={() => setActiveSection('standar_kompetensi')}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold uppercase flex items-center gap-2 self-start sm:self-auto transition-all cursor-pointer"
                >
                  <i className="bi bi-eye"></i>
                  <span>Buka Katalog Standar (SKJ)</span>
                </button>
              </div>

              {/* Target Position Selection Bar */}
              <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">
                    Evaluasi Terhadap Standar Jabatan:
                  </span>
                  <select
                    value={selectedJabatanTarget}
                    onChange={(e) => setSelectedJabatanTarget(e.target.value)}
                    className="w-full md:min-w-[340px] px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 uppercase cursor-pointer"
                  >
                    {LIST_JABATAN_STANDAR.map((jbt) => (
                      <option key={jbt} value={jbt}>
                        {jbt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-right space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">Jabatan Pegawai Saat Ini</span>
                  <span className="font-bold text-gray-800 bg-white px-3 py-1.5 rounded-xl border border-gray-200 inline-block">
                    {activePegawai.jabatan || 'ASN DJKI'}
                  </span>
                </div>
              </div>

              {/* Kesesuaian Kompetensi Meter (Page 4 Style) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-black text-gray-900 uppercase">
                      Kesesuaian Kompetensi
                    </h4>
                    <span className="text-[11px] font-bold text-gray-500">
                      {fulfilledKompetensiCount} dari {totalRequiredKompetensi} kompetensi standar terpenuhi
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-black px-4 py-1.5 rounded-xl shadow-xs ${
                      gapPercentage >= 80 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : gapPercentage >= 60 
                        ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {gapPercentage}%
                    </span>
                  </div>
                </div>

                {/* Gradient bar (pink to orange to yellow, exactly matching Page 4) */}
                <div className="h-6 w-full rounded-2xl p-1 bg-gray-100 border border-gray-200 shadow-inner">
                  <div
                    className="h-full rounded-xl bg-gradient-to-r from-[#ec4899] via-[#f97316] to-[#eab308] shadow-sm transition-all duration-700"
                    style={{ width: `${Math.max(gapPercentage, 5)}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-500">
                    Status: <strong className={gapPercentage >= 75 ? 'text-emerald-700' : 'text-amber-700'}>
                      {gapPercentage >= 80 
                        ? 'Sangat Memenuhi Standar Kompetensi' 
                        : gapPercentage >= 60 
                        ? 'Memenuhi Sebagian (Perlu Penguatan Kompetensi)' 
                        : 'Perlu Akselerasi Pelatihan Terarah'}
                    </strong>
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    Klik item di bawah untuk mengubah status pemenuhan
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {(['Semua', 'SKJ', 'Sertifikasi', 'Pelatihan'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setGapFilter(tab)}
                      className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                        gapFilter === tab
                          ? 'bg-[#86efac] text-[#14532d] shadow-sm ring-2 ring-emerald-300'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Column Checklist Comparison (Page 4 Style) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                {/* Kolom Kiri: Kompetensi Minimum Pekerjaan */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                      Kompetensi Minimum Pekerjaan ({selectedJabatanTarget})
                    </h5>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {kompetensiForSelectedJabatan.length} Butir
                    </span>
                  </div>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {kompetensiForSelectedJabatan.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Tidak ada daftar kompetensi untuk jabatan ini.</p>
                    ) : (
                      kompetensiForSelectedJabatan.map((komp) => {
                        const isDone = checkIsFulfilled(komp);
                        return (
                          <div
                            key={komp.id}
                            onClick={() => toggleFulfillment(komp.id)}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                              isDone
                                ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                                : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
                            }`}
                          >
                            <div className="flex items-start gap-2.5 text-xs pr-2">
                              <span className={`font-black text-sm shrink-0 mt-0.5 ${isDone ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {isDone ? '✓' : '✕'}
                              </span>
                              <div>
                                <span className={`font-bold block ${isDone ? 'text-gray-900' : 'text-gray-800'}`}>
                                  {komp.namaKompetensi}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {komp.jenis} {komp.lembaga ? `• ${komp.lembaga}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase shrink-0 ${
                              isDone ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/60 text-rose-800'
                            }`}>
                              {isDone ? 'Terpenuhi' : 'Belum'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Kolom Kanan: Kompetensi yang Dimiliki Pegawai */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h5 className="text-xs font-black text-gray-900 uppercase tracking-wide">
                      Kompetensi yang Dimiliki ({formatPegawaiName(activePegawai.nama)})
                    </h5>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                      {fulfilledKompetensiCount} Terverifikasi
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {/* List Fulfilled Items */}
                    {kompetensiForSelectedJabatan
                      .filter(k => checkIsFulfilled(k))
                      .map((komp) => (
                        <div
                          key={`owned-${komp.id}`}
                          className="flex items-center justify-between p-3 rounded-2xl border border-emerald-200 bg-white shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5 text-xs">
                            <span className="text-emerald-600 font-black text-sm mt-0.5">✓</span>
                            <div>
                              <span className="text-gray-900 font-bold block">{komp.namaKompetensi}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{komp.jenis} • Portofolio Pegawai</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                            Valid
                          </span>
                        </div>
                      ))}

                    {/* Actual trainings recorded in system */}
                    {employeeTrainings.map((pel) => (
                      <div
                        key={pel.id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-blue-100 bg-blue-50/40"
                      >
                        <div className="flex items-start gap-2.5 text-xs">
                          <span className="text-blue-600 font-black text-sm mt-0.5">✓</span>
                          <div>
                            <span className="text-gray-900 font-bold block">{pel.namaKegiatan}</span>
                            <span className="text-[10px] text-blue-700 font-medium">
                              Tahun {pel.tahun} • {pel.jumlahJpl} JP • {pel.kategori || 'Diklat'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-blue-700 bg-white px-2 py-0.5 rounded-md uppercase border border-blue-200">
                          Sertifikat
                        </span>
                      </div>
                    ))}

                    {fulfilledKompetensiCount === 0 && employeeTrainings.length === 0 && (
                      <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-xs italic">
                        Belum ada kompetensi yang tercatat untuk pegawai ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rekomendasi Box for Gap Closure */}
              <div className="p-5 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-100 rounded-3xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-black text-xs uppercase tracking-wide">
                  <i className="bi bi-lightbulb-fill text-amber-500"></i>
                  <span>Rekomendasi Rencana Pengembangan Kompetensi (HCDP):</span>
                </div>
                <div className="text-xs text-gray-800 leading-relaxed space-y-1">
                  {kompetensiForSelectedJabatan.filter(k => !checkIsFulfilled(k)).length > 0 ? (
                    <>
                      <p>
                        Untuk memenuhi standar jabatan <strong>{selectedJabatanTarget}</strong>, pegawai disarankan memprioritaskan keikutsertaan pada program:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 pl-2 font-medium text-gray-700">
                        {kompetensiForSelectedJabatan
                          .filter(k => !checkIsFulfilled(k))
                          .slice(0, 4)
                          .map(k => (
                            <li key={k.id}>
                              <strong>{k.namaKompetensi}</strong> ({k.jenis}) {k.lembaga ? `- ${k.lembaga}` : ''}
                            </li>
                          ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-emerald-800 font-bold">
                      Semua kompetensi minimum untuk jabatan ini telah terpenuhi dengan baik. Pegawai direkomendasikan untuk pengayaan peran (enrichment) dan proyek strategis DJKI.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: NILAI PERFORMA */}
          {activeSection === 'nilai_performa' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Nilai Performa & SKP
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Evaluasi Kinerja Tahunan Aparatur Sipil Negara
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Tahun 2024</span>
                  <div className="text-xl font-black text-emerald-600">Sangat Baik</div>
                  <p className="text-[10px] text-gray-600">Hasil Kerja: Di Atas Ekspektasi | Perilaku: Di Atas Ekspektasi</p>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Tahun 2023</span>
                  <div className="text-xl font-black text-blue-600">Baik</div>
                  <p className="text-[10px] text-gray-600">Hasil Kerja: Sesuai Ekspektasi | Perilaku: Sesuai Ekspektasi</p>
                </div>
                <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-1">
                  <span className="text-[10px] font-black uppercase text-gray-400">Tahun 2022</span>
                  <div className="text-xl font-black text-blue-600">Baik</div>
                  <p className="text-[10px] text-gray-600">Hasil Kerja: Sesuai Ekspektasi | Perilaku: Sesuai Ekspektasi</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: RIWAYAT JABATAN (PAGES 7 & 8) */}
          {activeSection === 'riwayat_jabatan' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Riwayat Jabatan
                </h3>
                {canEdit && (
                  <button
                    onClick={() => {
                      setJabatanFormData({
                        jenisJabatan: 'Fungsional',
                        namaJabatan: 'Pemeriksa Merek Ahli Muda',
                        unitEselon2: 'Direktorat Kerja Sama, Pemberdayaan dan Edukasi',
                        unitEselon3: 'Sub Direktorat Kerja Sama',
                        unitEselon4: '-',
                        rolePeran: 'Pemeriksa Merek',
                        periodeTeks: '',
                        durasi: '',
                        noSk: '',
                        tanggalSk: '',
                        noPelantikan: '',
                        tanggalPelantikan: ''
                      });
                      setIsJabatanModalOpen(true);
                    }}
                    className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all cursor-pointer"
                    title="Tambah / Ubah Data Jabatan"
                  >
                    <i className="bi bi-pencil-square text-lg"></i>
                  </button>
                )}
              </div>

              {/* Timeline List (Page 8) */}
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-gray-200">
                {jabatanList.map((jabatan, idx) => (
                  <div key={jabatan.id || idx} className="relative flex items-start gap-6 group">
                    {/* Circle Indicator */}
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform ${
                        jabatan.isCurrent
                          ? 'bg-[#22c55e] text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-[#64748b] text-white'
                      }`}
                    >
                      <i className={`bi ${jabatan.isCurrent ? 'bi-briefcase-fill' : 'bi-clock-history'} text-base`}></i>
                    </div>

                    {/* Content Box */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <h4 className="text-sm font-black text-gray-950 uppercase">
                          {jabatan.namaJabatan}
                        </h4>
                        <div className="h-0.5 w-12 bg-gray-300 my-1.5"></div>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed">
                          {jabatan.unitKerja}
                        </p>
                        {jabatan.noSk && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            SK: {jabatan.noSk} ({jabatan.tanggalSk})
                          </p>
                        )}
                      </div>

                      <div className="text-left md:text-right shrink-0">
                        <span className="text-xs font-black text-gray-900 block">
                          {jabatan.periodeTeks}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 block mt-0.5">
                          {jabatan.durasi}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 7: PENGAYAAN PERAN */}
          {activeSection === 'pengayaan_peran' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Pengayaan Peran (Enrichment / Task Force)
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Penugasan Gugus Tugas, Pokja, dan Tim Khusus
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black text-gray-900 uppercase">Anggota Pokja Manajemen Perubahan Reformasi Birokrasi</h5>
                    <p className="text-[11px] text-gray-600">Sekretariat DJKI • Tahun 2024</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase">Aktif</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black text-gray-900 uppercase">Tim Implementasi Sistem Merit & Manajemen Talenta</h5>
                    <p className="text-[11px] text-gray-600">Bagian Kepegawaian DJKI • Tahun 2023 - 2024</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg uppercase">Aktif</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: SERTIFIKASI */}
          {activeSection === 'sertifikasi' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Sertifikasi Profesi & Keahlian
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <i className="bi bi-patch-check-fill text-emerald-600 text-lg"></i>
                    <h5 className="text-xs font-black text-gray-900 uppercase">Sertifikasi Pengadaan Barang/Jasa (PBJ) Level 1</h5>
                  </div>
                  <p className="text-[11px] text-gray-600">Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah (LKPP) • 2022</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <i className="bi bi-patch-check-fill text-blue-600 text-lg"></i>
                    <h5 className="text-xs font-black text-gray-900 uppercase">WIPO Academy: DL-101 Intellectual Property</h5>
                  </div>
                  <p className="text-[11px] text-gray-600">World Intellectual Property Organization (WIPO) • 2023</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 9: PELATIHAN (INTEGRATED WITH PENGEMBANGAN LOGS) */}
          {activeSection === 'pelatihan' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Riwayat Pelatihan & Diklat
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                  Log Bangkom Terdaftar di Portal SDM DJKI
                </p>
              </div>

              {riwayatPelatihanList.filter(r => r.nip === activePegawai.nip).length > 0 ? (
                <div className="space-y-3">
                  {riwayatPelatihanList.filter(r => r.nip === activePegawai.nip).map(r => (
                    <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-black text-gray-900 uppercase">{r.namaKegiatan}</h5>
                        <p className="text-[10px] text-gray-500 mt-0.5 font-bold">
                          {r.kategori} • {r.jenisPengembangan} • {r.jumlahJpl} JP • Tahun {r.tahun}
                        </p>
                      </div>
                      {r.fileSertifikatUrl && (
                        <button
                          onClick={() => window.open(r.fileSertifikatUrl, '_blank')}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase border border-blue-100"
                        >
                          Sertifikat
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs">
                  Belum ada catatan pelatihan spesifik untuk NIP ini. Gunakan tombol &quot;+ Catat Pelatihan&quot; di tab Monitoring untuk menambahkan.
                </div>
              )}
            </div>
          )}

          {/* SECTION 10: PEMBICARA */}
          {activeSection === 'pembicara' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Narasumber & Pembicara
                </h3>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <h5 className="text-xs font-black text-gray-900 uppercase">Sosialisasi Pengenalan KI Bagi Mahasiswa & Startup</h5>
                <p className="text-[11px] text-gray-600">Universitas Indonesia • Tahun 2024</p>
              </div>
            </div>
          )}

          {/* SECTION 11: PENDIDIKAN */}
          {activeSection === 'pendidikan' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Pendidikan Formal
                </h3>
              </div>
              <div className="space-y-3">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <h5 className="text-xs font-black text-gray-900 uppercase">S1 - Ilmu Administrasi Negara / Publik</h5>
                    <p className="text-[11px] text-gray-600">Universitas Terkemuka • Lulus Tahun 2017</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg">Ijazah Terverifikasi</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 12: PENGHARGAAN */}
          {activeSection === 'penghargaan' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Penghargaan & Prestasi
                </h3>
              </div>
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-1">
                <div className="flex items-center gap-2 text-amber-900">
                  <i className="bi bi-award-fill text-lg text-amber-600"></i>
                  <h5 className="text-xs font-black uppercase">Satya Lancana Karya Satya X Tahun</h5>
                </div>
                <p className="text-[11px] text-gray-600">Keppres Republik Indonesia • Pengabdian 10 Tahun ASN</p>
              </div>
            </div>
          )}

          {/* SECTION 13: KARYA TULIS */}
          {activeSection === 'karya_tulis' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-fadeIn">
              <div className="border-b border-gray-100 pb-5">
                <h3 className="text-xl md:text-2xl font-black text-gray-950 uppercase tracking-tight">
                  Karya Tulis & Publikasi
                </h3>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <h5 className="text-xs font-black text-gray-900 uppercase">Policy Brief: Strategi Percepatan Komersialisasi Hak Cipta di Era AI</h5>
                <p className="text-[11px] text-gray-600">Jurnal Kebijakan Kekayaan Intelektual DJKI • 2024</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL EDIT TENTANG SAYA */}
      {isEditTentangOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsEditTentangOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-hidden text-gray-950 z-20">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <h4 className="text-base font-black uppercase tracking-tight">Ubah Data Tentang Saya</h4>
              <button onClick={() => setIsEditTentangOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Summary</label>
                <textarea
                  rows={4}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-blue-600"
                  value={editTentangForm.summary}
                  onChange={(e) => setEditTentangForm({ ...editTentangForm, summary: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Minat</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-blue-600"
                  value={editTentangForm.minat}
                  onChange={(e) => setEditTentangForm({ ...editTentangForm, minat: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Visi & Nilai Pribadi</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-blue-600"
                  value={editTentangForm.visiNilai}
                  onChange={(e) => setEditTentangForm({ ...editTentangForm, visiNilai: e.target.value })}
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Kelebihan & Kekurangan</label>
                <textarea
                  rows={3}
                  className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-blue-600"
                  value={editTentangForm.kelebihanKekurangan}
                  onChange={(e) => setEditTentangForm({ ...editTentangForm, kelebihanKekurangan: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditTentangOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTentang}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DATA JABATAN (EXACT REPLICA OF PAGE 7) */}
      {isJabatanModalOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsJabatanModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[92vh] overflow-hidden text-gray-950 z-20">
            {/* Header Modal Page 7 */}
            <div className="text-center border-b pb-4 shrink-0">
              <h3 className="text-xl font-black text-gray-950 uppercase tracking-tight">
                Data Jabatan
              </h3>
            </div>

            <form onSubmit={handleSaveJabatan} className="overflow-y-auto py-5 space-y-4 flex-1 text-xs">
              {/* Jenis Jabatan & Nama Jabatan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Jenis Jabatan*</label>
                  <select
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.jenisJabatan}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, jenisJabatan: e.target.value })}
                  >
                    <option value="Fungsional">Fungsional</option>
                    <option value="Struktural">Struktural</option>
                    <option value="Pelaksana">Pelaksana</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Nama Jabatan*</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.namaJabatan || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, namaJabatan: e.target.value })}
                    placeholder="Misal: Pemeriksa Merek Ahli Muda"
                    required
                  />
                </div>
              </div>

              {/* Tanggal SK / SP & No SK / SP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tanggal SK / SP*</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.tanggalSk || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, tanggalSk: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">No. SK / SP*</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.noSk || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, noSk: e.target.value })}
                    placeholder="Nomor SK / SP..."
                  />
                </div>
              </div>

              {/* Tanggal Pelantikan & No Surat Pelantikan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tanggal Pelantikan</label>
                  <input
                    type="date"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.tanggalPelantikan || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, tanggalPelantikan: e.target.value })}
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">No. Surat Pernyataan Pelantikan</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.noPelantikan || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, noPelantikan: e.target.value })}
                    placeholder="Nomor Surat Pernyataan Pelantikan..."
                  />
                </div>
              </div>

              {/* Unit Eselon II */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Unit Eselon II*</label>
                <select
                  className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                  value={jabatanFormData.unitEselon2 || ''}
                  onChange={(e) => setJabatanFormData({ ...jabatanFormData, unitEselon2: e.target.value })}
                >
                  <option value="Sekretariat Direktorat Jenderal Kekayaan Intelektual">Sekretariat Direktorat Jenderal Kekayaan Intelektual</option>
                  <option value="Direktorat Hak Cipta dan Desain Industri">Direktorat Hak Cipta dan Desain Industri</option>
                  <option value="Direktorat Paten, DTLST dan Rahasia Dagang">Direktorat Paten, DTLST dan Rahasia Dagang</option>
                  <option value="Direktorat Merek dan Indikasi Geografis">Direktorat Merek dan Indikasi Geografis</option>
                  <option value="Direktorat Kerja Sama, Pemberdayaan dan Edukasi">Direktorat Kerja Sama, Pemberdayaan dan Edukasi</option>
                  <option value="Direktorat Penyidikan dan Penyelesaian Sengketa">Direktorat Penyidikan dan Penyelesaian Sengketa</option>
                </select>
              </div>

              {/* Unit Eselon III */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Unit Eselon III</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                  value={jabatanFormData.unitEselon3 || ''}
                  onChange={(e) => setJabatanFormData({ ...jabatanFormData, unitEselon3: e.target.value })}
                  placeholder="Misal: Sub Direktorat Kerja Sama"
                />
              </div>

              {/* Unit Eselon IV */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Unit Eselon IV</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                  value={jabatanFormData.unitEselon4 || '-'}
                  onChange={(e) => setJabatanFormData({ ...jabatanFormData, unitEselon4: e.target.value })}
                />
              </div>

              {/* Role / Peran */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Role / Peran</label>
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                  value={jabatanFormData.rolePeran || ''}
                  onChange={(e) => setJabatanFormData({ ...jabatanFormData, rolePeran: e.target.value })}
                  placeholder="Misal: Pemeriksa Substantif Merek"
                />
              </div>

              {/* Periode & Durasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Label Periode</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.periodeTeks || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, periodeTeks: e.target.value })}
                    placeholder="Contoh: 15 Maret 2024 - Sekarang"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Durasi</label>
                  <input
                    type="text"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-semibold outline-none focus:border-blue-600"
                    value={jabatanFormData.durasi || ''}
                    onChange={(e) => setJabatanFormData({ ...jabatanFormData, durasi: e.target.value })}
                    placeholder="Contoh: 1 Tahun 3 Bulan"
                  />
                </div>
              </div>

              {/* Action Buttons: Batal & Simpan (Page 7) */}
              <div className="pt-5 border-t flex justify-center gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsJabatanModalOpen(false)}
                  className="px-10 py-3 bg-[#be123c] hover:bg-[#9f1239] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-10 py-3 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT HEADER & PROMOTABILITY */}
      {isEditHeaderOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsEditHeaderOpen(false)}></div>
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-hidden text-gray-950 z-20">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div>
                <h4 className="text-base font-black uppercase tracking-tight">Ubah Info Header & Status Asesmen</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Asesmen, TMT Pangkat/Jabatan & Promotabilitas</p>
              </div>
              <button onClick={() => setIsEditHeaderOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Asesmen Terakhir</label>
                  <input
                    type="text"
                    className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 font-semibold"
                    value={editHeaderForm.asessmentTerakhir}
                    onChange={(e) => setEditHeaderForm({ ...editHeaderForm, asessmentTerakhir: e.target.value })}
                    placeholder="Contoh: 2023"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Asesmen Selanjutnya</label>
                  <input
                    type="text"
                    className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 font-semibold"
                    value={editHeaderForm.asessmentSelanjutnya}
                    onChange={(e) => setEditHeaderForm({ ...editHeaderForm, asessmentSelanjutnya: e.target.value })}
                    placeholder="Contoh: 2026"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">TMT. Pangkat Terakhir</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 font-semibold"
                  value={editHeaderForm.tmtPangkatTerakhir}
                  onChange={(e) => setEditHeaderForm({ ...editHeaderForm, tmtPangkatTerakhir: e.target.value })}
                  placeholder="Contoh: 01 April 2023"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">TMT. Jabatan Terakhir</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 font-semibold"
                  value={editHeaderForm.tmtJabatanTerakhir}
                  onChange={(e) => setEditHeaderForm({ ...editHeaderForm, tmtJabatanTerakhir: e.target.value })}
                  placeholder="Contoh: 01 November 2023"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">TMT. SP/SPMT Terakhir</label>
                <input
                  type="text"
                  className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 font-semibold"
                  value={editHeaderForm.tmtSpSpmtTerakhir}
                  onChange={(e) => setEditHeaderForm({ ...editHeaderForm, tmtSpSpmtTerakhir: e.target.value })}
                  placeholder="Contoh: 01 Desember 2023"
                />
              </div>

              <div className="border-t pt-3 space-y-3">
                <span className="font-black text-gray-900 block uppercase text-[11px]">Status Promotabilitas</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                    <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editHeaderForm.isPromotablePangkat}
                        onChange={(e) => setEditHeaderForm({
                          ...editHeaderForm,
                          isPromotablePangkat: e.target.checked,
                          promotablePangkatLabel: e.target.checked ? 'Promotable Pangkat' : 'Non Promotable Pangkat',
                        })}
                        className="rounded accent-emerald-600 h-4 w-4"
                      />
                      <span>Promotable Pangkat</span>
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 bg-white border rounded-lg text-xs outline-none"
                      value={editHeaderForm.promotablePangkatLabel}
                      onChange={(e) => setEditHeaderForm({ ...editHeaderForm, promotablePangkatLabel: e.target.value })}
                      placeholder="Label badge pangkat"
                    />
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                    <label className="flex items-center gap-2 font-bold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editHeaderForm.isPromotableJabatan}
                        onChange={(e) => setEditHeaderForm({
                          ...editHeaderForm,
                          isPromotableJabatan: e.target.checked,
                          promotableJabatanLabel: e.target.checked ? 'Promotable Jabatan' : 'Non Promotable Jabatan',
                        })}
                        className="rounded accent-emerald-600 h-4 w-4"
                      />
                      <span>Promotable Jabatan</span>
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 bg-white border rounded-lg text-xs outline-none"
                      value={editHeaderForm.promotableJabatanLabel}
                      onChange={(e) => setEditHeaderForm({ ...editHeaderForm, promotableJabatanLabel: e.target.value })}
                      placeholder="Label badge jabatan"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditHeaderOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveHeader}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA ASESMEN (MANAJERIAL & 360) */}
      {isEditAsesmenOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={() => setIsEditAsesmenOpen(false)}></div>
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[92vh] overflow-hidden text-gray-950 z-20">
            <div className="flex items-center justify-between border-b pb-4 shrink-0">
              <div>
                <h4 className="text-base font-black uppercase tracking-tight">Ubah Data Hasil Asesmen</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Penyesuaian Nilai Radar, Tabel Multi-Rater & Rekomendasi</p>
              </div>
              <button onClick={() => setIsEditAsesmenOpen(false)} className="text-gray-400 hover:text-gray-600">
                <i className="bi bi-x-lg text-lg"></i>
              </button>
            </div>

            {/* Sub-tab in modal */}
            <div className="flex gap-2 border-b pt-3 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setEditAsesmenTab('manajerial')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  editAsesmenTab === 'manajerial' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                1. Kompetensi Manajerial
              </button>
              <button
                type="button"
                onClick={() => setEditAsesmenTab('perilaku360')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  editAsesmenTab === 'perilaku360' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                2. Perilaku Kerja 360
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-5 flex-1 text-xs">
              {/* TAB 1: MANAJERIAL FORM */}
              {editAsesmenTab === 'manajerial' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-amber-900 text-[11px] leading-relaxed">
                    <span className="font-bold">Standar Kompetensi Manajerial (Skala 0 - 4):</span> Nilai level eksisting untuk tiap indikator M.01 sampai M.08 pada asesmen terakhir.
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'M01', label: 'M.01 Integritas' },
                      { key: 'M02', label: 'M.02 Kerjasama' },
                      { key: 'M03', label: 'M.03 Komunikasi' },
                      { key: 'M04', label: 'M.04 Orientasi Hasil' },
                      { key: 'M05', label: 'M.05 Pelayanan Publik' },
                      { key: 'M06', label: 'M.06 Pengembangan' },
                      { key: 'M07', label: 'M.07 Perubahan' },
                      { key: 'M08', label: 'M.08 Pengambilan Keputusan' },
                    ].map((m) => (
                      <div key={m.key} className="p-3 bg-gray-50 border rounded-xl space-y-1">
                        <label className="font-bold text-gray-700 block text-[11px] truncate" title={m.label}>
                          {m.label}
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="4"
                          className="w-full p-2 bg-white border rounded-lg font-bold text-center text-sm outline-none focus:border-blue-600"
                          value={editAsesmenForm.manajerial2023[m.key] ?? 3}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setEditAsesmenForm({
                              ...editAsesmenForm,
                              manajerial2023: {
                                ...editAsesmenForm.manajerial2023,
                                [m.key]: val,
                              },
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Rekomendasi Manajerial</label>
                    <textarea
                      rows={3}
                      className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 leading-relaxed"
                      value={editAsesmenForm.rekomendasiManajerial}
                      onChange={(e) => setEditAsesmenForm({ ...editAsesmenForm, rekomendasiManajerial: e.target.value })}
                      placeholder="Masukkan tindak lanjut rekomendasi pengembangan manajerial..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PERILAKU 360 FORM */}
              {editAsesmenTab === 'perilaku360' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <span className="font-black text-gray-900 block uppercase text-[11px]">
                      Nilai Radar Perilaku 360 (PP 30/2019, Skala 0 - 100)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { key: 'radarK01', label: 'Orientasi Pelayanan (K01)' },
                        { key: 'radarK02', label: 'Komitmen (K02)' },
                        { key: 'radarK03', label: 'Inisiatif Kerja (K03)' },
                        { key: 'radarK04', label: 'Kerja Sama (K04)' },
                        { key: 'radarK05', label: 'Kepemimpinan (K05)' },
                      ].map((item) => (
                        <div key={item.key} className="p-2.5 bg-gray-50 border rounded-xl space-y-1">
                          <label className="font-bold text-gray-700 block text-[10px] truncate" title={item.label}>
                            {item.label}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            className="w-full p-1.5 bg-white border rounded-lg font-bold text-center text-sm outline-none focus:border-blue-600"
                            value={(editAsesmenForm as any)[item.key]}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditAsesmenForm({
                                ...editAsesmenForm,
                                [item.key]: val,
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Multi-rater edit */}
                  <div className="space-y-2">
                    <span className="font-black text-gray-900 block uppercase text-[11px]">
                      Tabel Penilaian Multi-Rater (Atasan, Bawahan, Rekan, Diri Sendiri)
                    </span>
                    <div className="overflow-x-auto border rounded-2xl p-1 bg-gray-50">
                      <table className="w-full text-center text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold uppercase text-[9px]">
                            <th className="p-2 text-left">Penilai</th>
                            <th className="p-1">2020</th>
                            <th className="p-1">2021</th>
                            <th className="p-1">2022</th>
                            <th className="p-1 bg-blue-50 text-blue-900">Skor Akhir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {[
                            { key: 'atasan' as const, label: 'Atasan' },
                            { key: 'bawahan' as const, label: 'Bawahan' },
                            { key: 'rekan' as const, label: 'Rekan' },
                            { key: 'diriSendiri' as const, label: 'Diri Sendiri' },
                          ].map((rater) => {
                            const raterData = editAsesmenForm.multiRater[rater.key];
                            return (
                              <tr key={rater.key}>
                                <td className="p-2 text-left font-bold">{rater.label}</td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-16 p-1 bg-white border rounded text-center text-xs"
                                    value={raterData.y2020}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setEditAsesmenForm({
                                        ...editAsesmenForm,
                                        multiRater: {
                                          ...editAsesmenForm.multiRater,
                                          [rater.key]: { ...raterData, y2020: val },
                                        },
                                      });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-16 p-1 bg-white border rounded text-center text-xs"
                                    value={raterData.y2021}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setEditAsesmenForm({
                                        ...editAsesmenForm,
                                        multiRater: {
                                          ...editAsesmenForm.multiRater,
                                          [rater.key]: { ...raterData, y2021: val },
                                        },
                                      });
                                    }}
                                  />
                                </td>
                                <td className="p-1">
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-16 p-1 bg-white border rounded text-center text-xs"
                                    value={raterData.y2022}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setEditAsesmenForm({
                                        ...editAsesmenForm,
                                        multiRater: {
                                          ...editAsesmenForm.multiRater,
                                          [rater.key]: { ...raterData, y2022: val },
                                        },
                                      });
                                    }}
                                  />
                                </td>
                                <td className="p-1 bg-blue-50/50">
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="w-16 p-1 bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 rounded text-center text-xs"
                                    value={raterData.skor}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setEditAsesmenForm({
                                        ...editAsesmenForm,
                                        multiRater: {
                                          ...editAsesmenForm.multiRater,
                                          [rater.key]: { ...raterData, skor: val },
                                        },
                                      });
                                    }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Rekomendasi Perilaku 360</label>
                    <textarea
                      rows={3}
                      className="w-full p-3 bg-gray-50 border rounded-xl outline-none focus:border-blue-600 leading-relaxed"
                      value={editAsesmenForm.rekomendasi360}
                      onChange={(e) => setEditAsesmenForm({ ...editAsesmenForm, rekomendasi360: e.target.value })}
                      placeholder="Masukkan tindak lanjut rekomendasi perilaku 360..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditAsesmenOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAsesmen}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentDevelopmentView;
