import { Pegawai } from '../types';

export type HierarchyLevel = 'ditjen' | 'direktorat' | 'subdit_bagian' | 'subbagian';

export interface OrganisasiNodeDef {
  id: string;
  nama: string;
  shortName: string;
  level: HierarchyLevel;
  parentId?: string;
  colorType: 'red' | 'orange' | 'green' | 'blue';
  pimpinanKeywords: string[];
  unitKeywords: string[];
  subBagianKeywords?: string[];
  bagianKeywords?: string[];
  children?: OrganisasiNodeDef[];
}

export interface PopulatedOrganisasiNode extends OrganisasiNodeDef {
  pimpinan: Pegawai | null;
  totalPegawai: number;
  directPegawai: Pegawai[];
  children?: PopulatedOrganisasiNode[];
}

/**
 * STRUKTUR RESMI SOTK DIREKTORAT JENDERAL KEKAYAAN INTELEKTUAL (DJKI)
 * Sesuai Peraturan Organisasi dan Tata Kerja Kementerian Hukum & HAM / DJKI
 * Berdasarkan Bagan Hierarki:
 * - Merah: Direktorat Jenderal Kekayaan Intelektual
 * - Jingga: Direktorat / Sekretariat
 * - Hijau: Subdirektorat / Bagian
 * - Biru: Subbagian Tata Usaha / Seksi
 */
export const SOTK_DJKI_STRUCTURE: OrganisasiNodeDef = {
  id: 'ditjen-ki',
  nama: 'Direktorat Jenderal Kekayaan Intelektual',
  shortName: 'DJKI',
  level: 'ditjen',
  colorType: 'red',
  pimpinanKeywords: ['direktur jenderal kekayaan intelektual', 'dirjen ki'],
  unitKeywords: ['direktorat jenderal kekayaan intelektual', 'ditjen ki'],
  children: [
    // 1. Direktorat Paten
    {
      id: 'dit-paten',
      nama: 'Direktorat Paten, Desain Tata Letak Sirkuit Terpadu, dan Rahasia Dagang',
      shortName: 'Dit. Paten, DTLST & RD',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['direktur paten'],
      unitKeywords: ['paten', 'dtlst', 'rahasia dagang'],
      children: [
        {
          id: 'subdit-paten-yan',
          nama: 'Subdirektorat Permohonan dan Pelayanan',
          shortName: 'Subdit. Permohonan & Pelayanan',
          level: 'subdit_bagian',
          parentId: 'dit-paten',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat permohonan dan pelayanan'],
          unitKeywords: ['paten'],
          subBagianKeywords: ['permohonan', 'pelayanan', 'subdirektorat permohonan']
        },
        {
          id: 'subdit-paten-kbp',
          nama: 'Subdirektorat Fasilitasi Komisi Banding Paten',
          shortName: 'Subdit. Fasilitasi KBP',
          level: 'subdit_bagian',
          parentId: 'dit-paten',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat fasilitasi komisi banding paten'],
          unitKeywords: ['paten'],
          subBagianKeywords: ['komisi banding paten', 'banding paten', 'fasilitasi komisi banding']
        },
        {
          id: 'subbag-paten-tu',
          nama: 'Subbagian Tata Usaha',
          shortName: 'Subbag. TU Paten',
          level: 'subbagian',
          parentId: 'dit-paten',
          colorType: 'blue',
          pimpinanKeywords: ['kepala subbagian tata usaha'],
          unitKeywords: ['paten'],
          subBagianKeywords: ['tata usaha', 'subbagian tata usaha']
        }
      ]
    },

    // 2. Direktorat Merek dan Indikasi Geografis
    {
      id: 'dit-merek',
      nama: 'Direktorat Merek dan Indikasi Geografis',
      shortName: 'Dit. Merek & IG',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['direktur merek dan indikasi geografis'],
      unitKeywords: ['merek', 'indikasi geografis'],
      children: [
        {
          id: 'subdit-merek-yan',
          nama: 'Subdirektorat Permohonan dan Pelayanan',
          shortName: 'Subdit. Permohonan & Pelayanan',
          level: 'subdit_bagian',
          parentId: 'dit-merek',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat permohonan dan pelayanan'],
          unitKeywords: ['merek'],
          subBagianKeywords: ['permohonan', 'pelayanan', 'subdirektorat permohonan']
        },
        {
          id: 'subdit-merek-kbm',
          nama: 'Subdirektorat Fasilitasi Komisi Banding Merek',
          shortName: 'Subdit. Fasilitasi KBM',
          level: 'subdit_bagian',
          parentId: 'dit-merek',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat fasilitasi komisi banding merek'],
          unitKeywords: ['merek'],
          subBagianKeywords: ['komisi banding merek', 'banding merek', 'fasilitasi komisi banding']
        },
        {
          id: 'subbag-merek-tu',
          nama: 'Subbagian Tata Usaha',
          shortName: 'Subbag. TU Merek',
          level: 'subbagian',
          parentId: 'dit-merek',
          colorType: 'blue',
          pimpinanKeywords: ['kepala subbagian tata usaha'],
          unitKeywords: ['merek'],
          subBagianKeywords: ['tata usaha', 'subbagian tata usaha']
        }
      ]
    },

    // 3. Direktorat Hak Cipta dan Desain Industri
    {
      id: 'dit-hakcipta',
      nama: 'Direktorat Hak Cipta dan Desain Industri',
      shortName: 'Dit. Hak Cipta & DI',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['direktur hak cipta dan desain industri', 'direktur hak cipta'],
      unitKeywords: ['hak cipta', 'desain industri', 'cipta'],
      children: [
        {
          id: 'subdit-cipta-yan',
          nama: 'Subdirektorat Permohonan dan Pelayanan',
          shortName: 'Subdit. Permohonan & Pelayanan',
          level: 'subdit_bagian',
          parentId: 'dit-hakcipta',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat permohonan dan pelayanan'],
          unitKeywords: ['hak cipta', 'cipta', 'desain industri'],
          subBagianKeywords: ['permohonan', 'pelayanan', 'subdirektorat permohonan']
        },
        {
          id: 'subbag-cipta-tu',
          nama: 'Subbagian Tata Usaha',
          shortName: 'Subbag. TU Hak Cipta',
          level: 'subbagian',
          parentId: 'dit-hakcipta',
          colorType: 'blue',
          pimpinanKeywords: ['kepala subbagian tata usaha'],
          unitKeywords: ['hak cipta', 'cipta', 'desain industri'],
          subBagianKeywords: ['tata usaha', 'subbagian tata usaha']
        }
      ]
    },

    // 4. Direktorat Kerja Sama, Pemberdayaan, dan Edukasi
    {
      id: 'dit-kerjasama',
      nama: 'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi',
      shortName: 'Dit. Kerja Sama & Edukasi',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['direktur kerja sama, pemberdayaan, dan edukasi', 'direktur kerja sama'],
      unitKeywords: ['kerja sama', 'kerjasama', 'pemberdayaan', 'edukasi'],
      children: [
        {
          id: 'subdit-ks-kerjasama',
          nama: 'Subdirektorat Kerja Sama',
          shortName: 'Subdit. Kerja Sama',
          level: 'subdit_bagian',
          parentId: 'dit-kerjasama',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat kerja sama'],
          unitKeywords: ['kerja sama', 'kerjasama'],
          subBagianKeywords: ['subdirektorat kerja sama', 'kerja sama luar negeri', 'kerja sama dalam negeri']
        },
        {
          id: 'subdit-ks-edukasi',
          nama: 'Subdirektorat Pemberdayaan dan Edukasi Kekayaan Intelektual',
          shortName: 'Subdit. Pemberdayaan & Edukasi',
          level: 'subdit_bagian',
          parentId: 'dit-kerjasama',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat pemberdayaan dan edukasi'],
          unitKeywords: ['kerja sama', 'kerjasama'],
          subBagianKeywords: ['pemberdayaan', 'edukasi', 'subdirektorat pemberdayaan']
        },
        {
          id: 'subbag-ks-tu',
          nama: 'Subbagian Tata Usaha',
          shortName: 'Subbag. TU Kerja Sama',
          level: 'subbagian',
          parentId: 'dit-kerjasama',
          colorType: 'blue',
          pimpinanKeywords: ['kepala subbagian tata usaha'],
          unitKeywords: ['kerja sama', 'kerjasama'],
          subBagianKeywords: ['tata usaha', 'subbagian tata usaha']
        }
      ]
    },

    // 5. Sekretariat Direktorat Jenderal Kekayaan Intelektual
    {
      id: 'sekretariat-djki',
      nama: 'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
      shortName: 'Sekretariat Ditjen',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['sekretaris direktorat jenderal kekayaan intelektual', 'sesditjen'],
      unitKeywords: ['sekretariat'],
      children: [
        {
          id: 'bagian-program',
          nama: 'Bagian Program dan Pelaporan',
          shortName: 'Bagian Program & Pelaporan',
          level: 'subdit_bagian',
          parentId: 'sekretariat-djki',
          colorType: 'green',
          pimpinanKeywords: ['kepala bagian program dan pelaporan'],
          unitKeywords: ['sekretariat'],
          subBagianKeywords: ['program dan pelaporan', 'program', 'pelaporan']
        },
        {
          id: 'bagian-keuangan',
          nama: 'Bagian Keuangan',
          shortName: 'Bagian Keuangan',
          level: 'subdit_bagian',
          parentId: 'sekretariat-djki',
          colorType: 'green',
          pimpinanKeywords: ['kepala bagian keuangan'],
          unitKeywords: ['sekretariat'],
          subBagianKeywords: ['keuangan', 'bagian keuangan', 'perbendaharaan', 'anggaran']
        },
        {
          id: 'bagian-umum',
          nama: 'Bagian Umum',
          shortName: 'Bagian Umum',
          level: 'subdit_bagian',
          parentId: 'sekretariat-djki',
          colorType: 'green',
          pimpinanKeywords: ['kepala bagian umum'],
          unitKeywords: ['sekretariat'],
          subBagianKeywords: ['bagian umum', 'umum'],
          children: [
            {
              id: 'subbag-tu-protokol',
              nama: 'Subbagian Tata Usaha Pimpinan dan Protokol',
              shortName: 'Subbag. TU Pimpinan & Protokol',
              level: 'subbagian',
              parentId: 'bagian-umum',
              colorType: 'blue',
              pimpinanKeywords: ['kepala subbagian tata usaha pimpinan dan protokol', 'kasubag tu pimpinan'],
              unitKeywords: ['sekretariat'],
              subBagianKeywords: ['protokol', 'pimpinan dan protokol', 'tata usaha pimpinan']
            },
            {
              id: 'subbag-rumah-tangga',
              nama: 'Subbagian Rumah Tangga',
              shortName: 'Subbag. Rumah Tangga',
              level: 'subbagian',
              parentId: 'bagian-umum',
              colorType: 'blue',
              pimpinanKeywords: ['kepala subbagian rumah tangga'],
              unitKeywords: ['sekretariat'],
              subBagianKeywords: ['rumah tangga', 'subbagian rumah tangga', 'pengelolaan bmn']
            }
          ]
        }
      ]
    },

    // 6. Direktorat Teknologi Informasi
    {
      id: 'dit-ti',
      nama: 'Direktorat Teknologi Informasi Kekayaan Intelektual',
      shortName: 'Dit. TI KI',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['direktur teknologi informasi'],
      unitKeywords: ['teknologi informasi', ' ti '],
      children: [
        {
          id: 'subbag-ti-tu',
          nama: 'Subbagian Tata Usaha',
          shortName: 'Subbag. TU TI',
          level: 'subbagian',
          parentId: 'dit-ti',
          colorType: 'blue',
          pimpinanKeywords: ['kepala subbagian tata usaha'],
          unitKeywords: ['teknologi informasi'],
          subBagianKeywords: ['tata usaha', 'subbagian tata usaha']
        }
      ]
    },

    // 7. Direktorat Penegakan Hukum
    {
      id: 'dit-gakkum',
      nama: 'Direktorat Penegakan Hukum',
      shortName: 'Dit. Penegakan Hukum',
      level: 'direktorat',
      parentId: 'ditjen-ki',
      colorType: 'orange',
      pimpinanKeywords: ['direktur penegakan hukum'],
      unitKeywords: ['penegakan hukum', 'gakkum', 'penyidikan', 'sengketa'],
      children: [
        {
          id: 'subdit-gakkum-sengketa',
          nama: 'Subdirektorat Pencegahan dan Sengketa Alternatif',
          shortName: 'Subdit. Pencegahan & Sengketa',
          level: 'subdit_bagian',
          parentId: 'dit-gakkum',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat pencegahan dan sengketa alternatif'],
          unitKeywords: ['penegakan hukum'],
          subBagianKeywords: ['pencegahan', 'sengketa alternatif', 'penyelesaian sengketa']
        },
        {
          id: 'subdit-gakkum-sidik',
          nama: 'Subdirektorat Penindakan dan Penyidikan',
          shortName: 'Subdit. Penindakan & Penyidikan',
          level: 'subdit_bagian',
          parentId: 'dit-gakkum',
          colorType: 'green',
          pimpinanKeywords: ['kepala subdirektorat penindakan dan penyidikan'],
          unitKeywords: ['penegakan hukum'],
          subBagianKeywords: ['penindakan', 'penyidikan', 'subdirektorat penindakan']
        },
        {
          id: 'subbag-gakkum-tu',
          nama: 'Subbagian Tata Usaha',
          shortName: 'Subbag. TU Penegakan Hukum',
          level: 'subbagian',
          parentId: 'dit-gakkum',
          colorType: 'blue',
          pimpinanKeywords: ['kepala subbagian tata usaha'],
          unitKeywords: ['penegakan hukum'],
          subBagianKeywords: ['tata usaha', 'subbagian tata usaha']
        }
      ]
    }
  ]
};

/**
 * Mencari node definisi berdasarkan ID
 */
export const findNodeDefById = (id: string, current: OrganisasiNodeDef = SOTK_DJKI_STRUCTURE): OrganisasiNodeDef | null => {
  if (current.id === id) return current;
  if (current.children) {
    for (const child of current.children) {
      const res = findNodeDefById(id, child);
      if (res) return res;
    }
  }
  return null;
};

/**
 * Mendapatkan daftar seluruh node dalam bentuk flat array
 */
export const getAllNodeDefs = (current: OrganisasiNodeDef = SOTK_DJKI_STRUCTURE): OrganisasiNodeDef[] => {
  const result: OrganisasiNodeDef[] = [current];
  if (current.children) {
    for (const child of current.children) {
      result.push(...getAllNodeDefs(child));
    }
  }
  return result;
};

/**
 * Mencari pimpinan pejabat definitif dari suatu unit organisasi
 */
export const findPimpinanForNode = (node: OrganisasiNodeDef, allPegawai: Pegawai[]): Pegawai | null => {
  if (!allPegawai || allPegawai.length === 0) return null;

  // 1. Coba cari berdasarkan keyword pimpinan yang spesifik di unit ini
  for (const kw of node.pimpinanKeywords) {
    const found = allPegawai.find(p => {
      const jab = (p.jabatan || '').toLowerCase();
      const u = (p.unitKerja || '').toLowerCase();
      const sb = (p.subBagian || '').toLowerCase();

      if (!jab.includes(kw)) return false;

      // Verifikasi kesesuaian unit kerja jika pimpinan selevel kasubag/kasubdit
      if (node.level === 'subbagian' || node.level === 'subdit_bagian') {
        const matchesUnit = node.unitKeywords.some(uk => u.includes(uk) || jab.includes(uk) || sb.includes(uk));
        return matchesUnit;
      }
      return true;
    });

    if (found) return found;
  }

  return null;
};

/**
 * Menentukan node struktur organisasi yang paling tepat untuk seorang pegawai
 */
export const mapPegawaiToOrganisasiNode = (pegawai: Pegawai): OrganisasiNodeDef => {
  const u = (pegawai.unitKerja || '').toLowerCase();
  const b = (pegawai.bagian || '').toLowerCase();
  const sb = (pegawai.subBagian || '').toLowerCase();
  const j = (pegawai.jabatan || '').toLowerCase();

  // 1. Cek apakah Dirjen
  if (j.includes('direktur jenderal kekayaan intelektual') || (u.includes('direktorat jenderal') && j.includes('dirjen'))) {
    return SOTK_DJKI_STRUCTURE;
  }

  // 2. Sekretariat Ditjen
  if (u.includes('sekretariat') || j.includes('sekretaris direktorat jenderal')) {
    const sesNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'sekretariat-djki');
    if (sesNode) {
      // Subbagian TU Pimpinan & Protokol
      if (sb.includes('protokol') || sb.includes('pimpinan') || j.includes('protokol') || j.includes('pimpinan')) {
        const bgnUmum = sesNode.children?.find(c => c.id === 'bagian-umum');
        const node = bgnUmum?.children?.find(c => c.id === 'subbag-tu-protokol');
        if (node) return node;
      }
      // Subbagian Rumah Tangga
      if (sb.includes('rumah tangga') || j.includes('rumah tangga') || sb.includes('bmn')) {
        const bgnUmum = sesNode.children?.find(c => c.id === 'bagian-umum');
        const node = bgnUmum?.children?.find(c => c.id === 'subbag-rumah-tangga');
        if (node) return node;
      }
      // Bagian Umum
      if (sb.includes('umum') || b.includes('umum') || j.includes('umum')) {
        const node = sesNode.children?.find(c => c.id === 'bagian-umum');
        if (node) return node;
      }
      // Bagian Program & Pelaporan
      if (sb.includes('program') || sb.includes('pelaporan') || b.includes('program') || j.includes('program') || j.includes('pelaporan')) {
        const node = sesNode.children?.find(c => c.id === 'bagian-program');
        if (node) return node;
      }
      // Bagian Keuangan
      if (sb.includes('keuangan') || b.includes('keuangan') || j.includes('keuangan') || sb.includes('anggaran') || sb.includes('perbendaharaan')) {
        const node = sesNode.children?.find(c => c.id === 'bagian-keuangan');
        if (node) return node;
      }
      return sesNode;
    }
  }

  // 3. Direktorat Paten
  if (u.includes('paten') || u.includes('dtlst') || u.includes('rahasia dagang')) {
    const dirNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'dit-paten');
    if (dirNode) {
      if (sb.includes('tata usaha') || j.includes('tata usaha')) {
        const node = dirNode.children?.find(c => c.id === 'subbag-paten-tu');
        if (node) return node;
      }
      if (sb.includes('banding paten') || j.includes('banding paten')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-paten-kbp');
        if (node) return node;
      }
      if (sb.includes('permohonan') || sb.includes('pelayanan') || j.includes('pemeriksa paten')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-paten-yan');
        if (node) return node;
      }
      return dirNode;
    }
  }

  // 4. Direktorat Merek & Indikasi Geografis
  if (u.includes('merek') || u.includes('indikasi geografis')) {
    const dirNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'dit-merek');
    if (dirNode) {
      if (sb.includes('tata usaha') || j.includes('tata usaha')) {
        const node = dirNode.children?.find(c => c.id === 'subbag-merek-tu');
        if (node) return node;
      }
      if (sb.includes('banding merek') || j.includes('banding merek')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-merek-kbm');
        if (node) return node;
      }
      if (sb.includes('permohonan') || sb.includes('pelayanan') || j.includes('pemeriksa merek')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-merek-yan');
        if (node) return node;
      }
      return dirNode;
    }
  }

  // 5. Direktorat Hak Cipta & Desain Industri
  if (u.includes('hak cipta') || u.includes('cipta') || u.includes('desain industri')) {
    const dirNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'dit-hakcipta');
    if (dirNode) {
      if (sb.includes('tata usaha') || j.includes('tata usaha')) {
        const node = dirNode.children?.find(c => c.id === 'subbag-cipta-tu');
        if (node) return node;
      }
      if (sb.includes('permohonan') || sb.includes('pelayanan') || j.includes('desain industri') || j.includes('hak cipta')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-cipta-yan');
        if (node) return node;
      }
      return dirNode;
    }
  }

  // 6. Direktorat Kerja Sama, Pemberdayaan, dan Edukasi
  if (u.includes('kerja sama') || u.includes('kerjasama') || u.includes('pemberdayaan') || u.includes('edukasi')) {
    const dirNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'dit-kerjasama');
    if (dirNode) {
      if (sb.includes('tata usaha') || j.includes('tata usaha')) {
        const node = dirNode.children?.find(c => c.id === 'subbag-ks-tu');
        if (node) return node;
      }
      if (sb.includes('edukasi') || sb.includes('pemberdayaan') || j.includes('edukasi') || j.includes('pemberdayaan')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-ks-edukasi');
        if (node) return node;
      }
      if (sb.includes('kerja sama') || sb.includes('kerjasama') || j.includes('kerja sama')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-ks-kerjasama');
        if (node) return node;
      }
      return dirNode;
    }
  }

  // 7. Direktorat TI
  if (u.includes('teknologi informasi') || u.includes(' ti ') || u.endsWith(' ti')) {
    const dirNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'dit-ti');
    if (dirNode) {
      if (sb.includes('tata usaha') || j.includes('tata usaha')) {
        const node = dirNode.children?.find(c => c.id === 'subbag-ti-tu');
        if (node) return node;
      }
      return dirNode;
    }
  }

  // 8. Direktorat Penegakan Hukum
  if (u.includes('penegakan hukum') || u.includes('penyidikan') || u.includes('sengketa')) {
    const dirNode = SOTK_DJKI_STRUCTURE.children?.find(c => c.id === 'dit-gakkum');
    if (dirNode) {
      if (sb.includes('tata usaha') || j.includes('tata usaha')) {
        const node = dirNode.children?.find(c => c.id === 'subbag-gakkum-tu');
        if (node) return node;
      }
      if (sb.includes('sengketa') || sb.includes('pencegahan') || j.includes('sengketa') || j.includes('pencegahan')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-gakkum-sengketa');
        if (node) return node;
      }
      if (sb.includes('penindakan') || sb.includes('penyidikan') || j.includes('penindakan') || j.includes('penyidikan')) {
        const node = dirNode.children?.find(c => c.id === 'subdit-gakkum-sidik');
        if (node) return node;
      }
      return dirNode;
    }
  }

  return SOTK_DJKI_STRUCTURE;
};

/**
 * Representasi Pejabat Negara: Menteri Hukum Republik Indonesia
 * Sebagai Pejabat Pembina Kepegawaian (PPK) yang menilai Direktur Jenderal
 */
export const MENTERI_HUKUM_OFFICIAL: Pegawai = {
  id: 'pejabat-menteri-hukum',
  nip: 'MENTERI-HUKUM-RI',
  nama: 'Menteri Hukum RI',
  jabatan: 'Menteri Hukum Republik Indonesia',
  unitKerja: 'Kementerian Hukum RI',
  gender: 'L',
  golRuang: 'Pejabat Negara',
  jenisPegawai: 'Pejabat Negara',
  status: 'Aktif'
};

/**
 * Mencari pejabat Administrator (Eselon III: Kasubdit / Kabag) yang berada di bawah suatu unit/direktorat
 */
export const findEselonIIIForUnit = (
  unitDef: OrganisasiNodeDef,
  allPegawai: Pegawai[]
): { official: Pegawai | null; subditNode: OrganisasiNodeDef | null } => {
  if (!unitDef.children || unitDef.children.length === 0) {
    return { official: null, subditNode: null };
  }

  // Ambil seluruh node level subdit_bagian di bawah direktorat/unit ini
  const subditNodes = unitDef.children.filter(c => c.level === 'subdit_bagian');
  if (subditNodes.length === 0) {
    return { official: null, subditNode: null };
  }

  // 1. Coba cari pimpinan definitif per subdit
  for (const sNode of subditNodes) {
    const leader = findPimpinanForNode(sNode, allPegawai);
    if (leader) {
      return { official: leader, subditNode: sNode };
    }
  }

  // 2. Pencarian fleksibel: cari pegawai yang menduduki jabatan kasubdit/kabag di unit kerja terkait
  const uKws = unitDef.unitKeywords || [];
  const foundAny = allPegawai.find(p => {
    const jab = (p.jabatan || '').toLowerCase();
    const u = (p.unitKerja || '').toLowerCase();
    const isEselonIII =
      jab.includes('kepala subdirektorat') ||
      jab.includes('kasubdit') ||
      jab.includes('kepala bagian') ||
      jab.includes('kabag');
    if (!isEselonIII) return false;
    return uKws.some(k => u.includes(k) || jab.includes(k));
  });

  if (foundAny) {
    return { official: foundAny, subditNode: subditNodes[0] };
  }

  return { official: null, subditNode: null };
};

/**
 * Logika Penentuan Otomatis Pejabat Penilai Kinerja (Atasan Langsung)
 * Sesuai Regulasi Manajemen ASN & SOTK DJKI:
 * - Staf / Pelaksana / Fungsional di Subbagian -> Atasannya adalah Kepala Subbagian (Kasubag)
 * - Staf / Pelaksana / Fungsional di Subdirektorat -> Atasannya adalah Kepala Subdirektorat (Kasubdit)
 * - Staf / Pelaksana / Fungsional di Bagian -> Atasannya adalah Kepala Bagian (Kabag)
 * - Kasubag TU Pimpinan & Kasubag Rumah Tangga -> Atasannya adalah Kabag Umum
 * - Kasubag TU (Eselon IV) -> Dinilai oleh Eselon III (Kasubdit/Kabag), jika tidak ada Eselon III maka dinilai langsung oleh Eselon II / Direktur
 * - Kasubdit & Kabag (Eselon III) -> Atasannya adalah Direktur / Sesditjen (Eselon II)
 * - Direktur & Sesditjen (Eselon II) -> Atasannya adalah Direktur Jenderal (Dirjen - Eselon I)
 * - Dirjen (Eselon I) -> Atasannya adalah Menteri Hukum RI
 */
export const getAtasanLangsung = (
  pegawai: Pegawai | null | undefined,
  allPegawai: Pegawai[]
): {
  atasan: Pegawai | null;
  atasanPenilai: Pegawai | null;
  unitNode: OrganisasiNodeDef;
  levelLabel: string;
  dasarPenilaian: string;
} => {
  if (!pegawai || !allPegawai || allPegawai.length === 0) {
    return {
      atasan: null,
      atasanPenilai: null,
      unitNode: SOTK_DJKI_STRUCTURE,
      levelLabel: '-',
      dasarPenilaian: 'Data pegawai belum dipilih'
    };
  }

  const cleanNip = (pegawai.nip || '').replace(/\D/g, '');
  const jab = (pegawai.jabatan || '').toLowerCase();
  const dirjen = findPimpinanForNode(SOTK_DJKI_STRUCTURE, allPegawai);
  const unitNode = mapPegawaiToOrganisasiNode(pegawai);

  // 1. Kasus: Pegawai adalah Direktur Jenderal (Eselon I)
  // Atasan langsung dan Pejabat Penilainya adalah Menteri Hukum RI
  if (
    jab.includes('direktur jenderal kekayaan intelektual') || 
    jab === 'direktur jenderal' ||
    jab.startsWith('direktur jenderal') ||
    (cleanNip && dirjen && (dirjen.nip || '').replace(/\D/g, '') === cleanNip)
  ) {
    return {
      atasan: MENTERI_HUKUM_OFFICIAL,
      atasanPenilai: null,
      unitNode: SOTK_DJKI_STRUCTURE,
      levelLabel: 'Pimpinan Tertinggi Unit Eselon I (Dirjen)',
      dasarPenilaian: 'Pejabat Penilai Kinerja Direktur Jenderal adalah Menteri Hukum RI sebagai Pejabat Pembina Kepegawaian (PPK).'
    };
  }

  // 2. Kasus: Pegawai adalah Direktur atau Sekretaris Ditjen (Eselon II)
  if (
    jab.startsWith('direktur') || 
    jab.startsWith('sekretaris direktorat jenderal') ||
    jab.includes('sekretaris ditjen')
  ) {
    return {
      atasan: dirjen,
      atasanPenilai: MENTERI_HUKUM_OFFICIAL,
      unitNode,
      levelLabel: 'Pimpinan Tinggi Pratama (Eselon II)',
      dasarPenilaian: 'Pejabat Penilai Kinerja Direktur / Sesditjen adalah Direktur Jenderal Kekayaan Intelektual secara langsung, dengan Atasan Penilai Menteri Hukum RI.'
    };
  }

  // 3. Kasus: Pegawai adalah Kepala Bagian (Kabag) atau Kepala Subdirektorat (Kasubdit) - Eselon III / Administrator
  if (
    jab.startsWith('kepala bagian') || 
    jab.startsWith('kepala subdirektorat') ||
    jab.startsWith('kasubdit') ||
    jab.startsWith('kabag')
  ) {
    const parentDirektoratDef = findNodeDefById(unitNode.parentId || unitNode.id);
    const direkturOrSes = parentDirektoratDef ? findPimpinanForNode(parentDirektoratDef, allPegawai) : null;
    return {
      atasan: direkturOrSes || dirjen,
      atasanPenilai: dirjen,
      unitNode,
      levelLabel: 'Pejabat Administrator (Eselon III)',
      dasarPenilaian: `Pejabat Penilai Kinerja Administrator adalah ${direkturOrSes?.nama ? `${direkturOrSes.nama} (${direkturOrSes.jabatan})` : (parentDirektoratDef?.nama || 'Direktur Terkait')}, dengan Atasan Penilai Direktur Jenderal.`
    };
  }

  // 4. Kasus: Pegawai adalah Kepala Subbagian (Kasubag) - Eselon IV / Pengawas
  // Aturan SOTK:
  // - Karena Kasubag TU adalah Eselon IV, maka yang menilai adalah Eselon III (Kasubdit / Kepala Bagian)
  // - Terkecuali jika tidak ada Eselon III (misal di Dit. TI yang tidak punya Subdit, atau posisi Kasubdit kosong),
  //   maka yang menilai langsung adalah Eselon II (Direktur / Sesditjen)
  const isKasubagTU = 
    jab.includes('subbagian tata usaha') ||
    jab.includes('subbag tata usaha') ||
    jab.includes('subbag tu') ||
    jab.includes('kasubag tu') ||
    jab.includes('kasubbag tu');

  const isKasubagGeneral = 
    jab.startsWith('kepala subbagian') ||
    jab.startsWith('kepala sub bagian') ||
    jab.startsWith('kasubag') ||
    jab.startsWith('kasubbag') ||
    isKasubagTU;

  if (isKasubagGeneral) {
    // 4a. Kasubag di Sekretariat Ditjen / Bagian Umum (misal: Subbag TU Pimpinan & Protokol, Subbag Rumah Tangga)
    if (unitNode.parentId === 'bagian-umum' || unitNode.parentId === 'bagian-program' || unitNode.parentId === 'bagian-keuangan') {
      const bgnDef = findNodeDefById(unitNode.parentId);
      const kabag = bgnDef ? findPimpinanForNode(bgnDef, allPegawai) : null;
      const sesDef = findNodeDefById('sekretariat-djki')!;
      const sesdit = findPimpinanForNode(sesDef, allPegawai);

      if (kabag && (kabag.nip || '').replace(/\D/g, '') !== cleanNip) {
        return {
          atasan: kabag,
          atasanPenilai: sesdit || dirjen,
          unitNode,
          levelLabel: 'Pejabat Pengawas (Eselon IV)',
          dasarPenilaian: `Pejabat Penilai Kinerja Kepala Subbagian adalah ${kabag.nama} (${kabag.jabatan} - Eselon III), dengan Atasan Penilai ${sesdit?.nama ? `${sesdit.nama} (${sesdit.jabatan})` : 'Sekretaris Ditjen'}.`
        };
      } else {
        // Jika jabatan Kabag belum terisi definitif
        return {
          atasan: sesdit || dirjen,
          atasanPenilai: dirjen,
          unitNode,
          levelLabel: 'Pejabat Pengawas (Eselon IV)',
          dasarPenilaian: `Dikarenakan jabatan Eselon III (Kepala Bagian) belum terisi, Pejabat Penilai Kinerja dialihkan langsung ke ${sesdit?.nama ? `${sesdit.nama} (${sesdit.jabatan})` : 'Sekretaris Ditjen'} (Eselon II), dengan Atasan Penilai Direktur Jenderal.`
        };
      }
    }

    // 4b. Kasubag Tata Usaha di Direktorat Teknis
    const parentDirDef = findNodeDefById(unitNode.parentId || '') || unitNode;
    const direkturUnit = findPimpinanForNode(parentDirDef, allPegawai);

    // Cari apakah pada unit/direktorat ini ada Eselon III (Kasubdit)
    const { official: eselonIIIPenilai, subditNode: matchingSubditNode } = findEselonIIIForUnit(parentDirDef, allPegawai);

    if (eselonIIIPenilai && (eselonIIIPenilai.nip || '').replace(/\D/g, '') !== cleanNip) {
      // Ada Eselon III (Kasubdit) di direktorat ini
      return {
        atasan: eselonIIIPenilai,
        atasanPenilai: direkturUnit || dirjen,
        unitNode,
        levelLabel: 'Kepala Subbagian Tata Usaha (Eselon IV)',
        dasarPenilaian: `Pejabat Penilai Kinerja Kepala Subbagian Tata Usaha (Eselon IV) adalah ${eselonIIIPenilai.nama} (${eselonIIIPenilai.jabatan} - Eselon III), dengan Atasan Penilai adalah ${direkturUnit?.nama ? `${direkturUnit.nama} (${direkturUnit.jabatan})` : `${parentDirDef.nama} (Eselon II)`}.`
      };
    } else {
      // Terkecuali tidak ada Eselon III (misal di Dit. TI yang tidak memiliki formasi subdirektorat, atau posisi kasubdit kosong)
      const hasSubditFormasi = (parentDirDef.children || []).some(c => c.level === 'subdit_bagian');
      const penjelasanAlasan = hasSubditFormasi
        ? `belum tersedianya pejabat definitif Eselon III (Kasubdit) di lingkungan ${parentDirDef.nama}`
        : `unit ${parentDirDef.nama} tidak memiliki struktur Eselon III (Kasubdit)`;

      return {
        atasan: direkturUnit || dirjen,
        atasanPenilai: dirjen,
        unitNode,
        levelLabel: 'Kepala Subbagian Tata Usaha (Eselon IV)',
        dasarPenilaian: `Dikarenakan ${penjelasanAlasan}, maka Pejabat Penilai Kinerja Kepala Subbagian Tata Usaha dinilai langsung oleh ${direkturUnit?.nama ? `${direkturUnit.nama} (${direkturUnit.jabatan})` : `${parentDirDef.nama} (Eselon II)`}, dengan Atasan Penilai Direktur Jenderal.`
      };
    }
  }

  // 5. Kasus: Staf / Pelaksana / Fungsional (Pemeriksa, Analis, Arsiparis, Pranata Komputer, dll)
  // Atasan langsung adalah Pimpinan Definitif dari unit/subunit tempatnya bernaung
  const pimpinanUnitLangsung = findPimpinanForNode(unitNode, allPegawai);

  if (pimpinanUnitLangsung && (pimpinanUnitLangsung.nip || '').replace(/\D/g, '') !== cleanNip) {
    // Cari atasan dari penilai untuk SKP (Kakek Atasan)
    let atasanPenilai: Pegawai | null = null;
    if (unitNode.parentId) {
      const parentDef = findNodeDefById(unitNode.parentId);
      if (parentDef) {
        atasanPenilai = findPimpinanForNode(parentDef, allPegawai);
      }
    }

    return {
      atasan: pimpinanUnitLangsung,
      atasanPenilai: atasanPenilai || dirjen,
      unitNode,
      levelLabel: 'Pegawai / Fungsional / Pelaksana',
      dasarPenilaian: `Pejabat Penilai Kinerja adalah ${pimpinanUnitLangsung.jabatan} (${unitNode.nama}) sebagai Atasan Langsung.`
    };
  }

  // 6. Fallback jika pimpinan unit terkecil sedang kosong/Plt: cari pimpinan unit di atasnya (Direktur / Sesditjen)
  let fallbackAtasan: Pegawai | null = null;
  if (unitNode.parentId) {
    const parentDef = findNodeDefById(unitNode.parentId);
    if (parentDef) {
      fallbackAtasan = findPimpinanForNode(parentDef, allPegawai);
    }
  }
  if (!fallbackAtasan) {
    fallbackAtasan = dirjen;
  }

  return {
    atasan: fallbackAtasan,
    atasanPenilai: dirjen,
    unitNode,
    levelLabel: 'Pegawai / Fungsional',
    dasarPenilaian: `Pejabat Penilai Kinerja dialihkan ke ${fallbackAtasan?.jabatan || 'Pimpinan Unit'} sebagai Pejabat Atasan Terkait.`
  };
};

/**
 * Membangun pohon struktur lengkap dengan data riil pegawai terpopulasi
 */
export const buildPopulatedOrganisasiTree = (allPegawai: Pegawai[]): PopulatedOrganisasiNode => {
  const populateNode = (def: OrganisasiNodeDef): PopulatedOrganisasiNode => {
    const pimpinan = findPimpinanForNode(def, allPegawai);
    
    // Temukan seluruh pegawai yang berada di node ini secara tepat
    const directPegawai = allPegawai.filter(p => {
      const node = mapPegawaiToOrganisasiNode(p);
      return node.id === def.id;
    });

    const populatedChildren = def.children ? def.children.map(c => populateNode(c)) : undefined;

    // Total pegawai = direct pegawai + seluruh bawahan di children
    let totalCount = directPegawai.length;
    if (populatedChildren) {
      for (const c of populatedChildren) {
        totalCount += c.totalPegawai;
      }
    }

    return {
      ...def,
      pimpinan,
      totalPegawai: totalCount,
      directPegawai,
      children: populatedChildren
    };
  };

  return populateNode(SOTK_DJKI_STRUCTURE);
};

/**
 * Mengambil seluruh pegawai yang berada di suatu node beserta seluruh anak/sub-unit di bawahnya
 */
export const getAllPegawaiForNode = (node: PopulatedOrganisasiNode): Pegawai[] => {
  const result: Pegawai[] = [...(node.directPegawai || [])];
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result.push(...getAllPegawaiForNode(child));
    }
  }
  return result;
};

