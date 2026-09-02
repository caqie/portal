export interface DipaPokItem {
  id: string;
  level: 'PROGRAM' | 'KEGIATAN' | 'KRO' | 'RO' | 'KOMPONEN' | 'SUBKOMPONEN' | 'AKUN' | 'DETAIL_HEADER' | 'DETAIL_ITEM';
  kode: string;
  nama: string;
  rincianPerhitungan?: string;
  volume?: number | string;
  satuan?: string;
  hargaSatuan?: number;
  jumlah: number;
  realisasi?: number;
  penguranganPenambahan?: number;
  kategoriAkun?: '51' | '52' | '53';
  isBlokir?: boolean;
  keterangan?: string;
  subTim?: 'Sub-Tim 1 (Perencanaan & Layanan)' | 'Sub-Tim 2 (Mutasi & Pengembangan)' | 'Sub-Tim 3 (Kesejahteraan & Disiplin)';
  children?: DipaPokItem[];
}

export const DIPA_SDM_POK_DATA: DipaPokItem[] = [
  {
    id: 'prog-135-05-wa',
    level: 'PROGRAM',
    kode: '135.05.WA',
    nama: 'Program Dukungan Manajemen',
    jumlah: 21134433000,
    realisasi: 531752000,
    penguranganPenambahan: 531752000,
    children: [
      {
        id: 'keg-7122',
        level: 'KEGIATAN',
        kode: '7122',
        nama: 'Manajemen Dukungan dan Dukungan Teknis Lainnya Ditjen',
        jumlah: 21134433000,
        realisasi: 531752000,
        penguranganPenambahan: 531752000,
        children: [
          // ==================== KRO 7122.EBA ====================
          {
            id: 'kro-7122-eba',
            level: 'KRO',
            kode: '7122.EBA',
            nama: 'Layanan Manajemen Internal (Base Line)',
            jumlah: 6621672000,
            realisasi: 199261000,
            penguranganPenambahan: 199261000,
            children: [
              {
                id: 'ro-7122-eba-002',
                level: 'RO',
                kode: '7122.EBA.002',
                nama: 'Layanan Dukungan Manajemen Internal Sekretariat Unit Ditjen Kekayaan Intelektual',
                jumlah: 6621672000,
                realisasi: 199261000,
                penguranganPenambahan: 199261000,
                children: [
                  {
                    id: 'komp-054-eba',
                    level: 'KOMPONEN',
                    kode: '054',
                    nama: 'Pendidikan Lanjutan Pegawai / Layanan Manajemen Internal SDM',
                    jumlah: 4303371000,
                    realisasi: 87761000,
                    penguranganPenambahan: 87761000,
                    children: [
                      {
                        id: 'subkomp-054-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Penyusunan Analisis Beban Kerja (ABK) dan Analisis Jabatan (ANJAB) Pegawai DJKI',
                        jumlah: 1004925000,
                        realisasi: 89300000,
                        penguranganPenambahan: 89300000,
                        subTim: 'Sub-Tim 1 (Perencanaan & Layanan)',
                        children: [
                          {
                            id: 'akun-054-a-521213',
                            level: 'AKUN',
                            kode: '521213',
                            nama: 'Belanja Honor Output Kegiatan (KPPN 139-Jakarta V)',
                            jumlah: 78450000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-abk-honor',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Anggota Tim Pelaksana Kegiatan ABK dan Analisis Jabatan',
                                rincianPerhitungan: '50 ORG x 6 BLN',
                                volume: 300,
                                satuan: 'OB',
                                hargaSatuan: 261500,
                                jumlah: 78450000,
                                realisasi: 78450000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-a-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (KPPN 139-Jakarta V)',
                            jumlah: 317000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-abk-jasa-anjab',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Konsultasi Penyusunan Analisis Jabatan (ANJAB)',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 17000000,
                                jumlah: 17000000,
                                realisasi: 17000000
                              },
                              {
                                id: 'item-abk-jasa-abk1',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Konsultasi Pembuatan Analisis Beban Kerja (ABK) dan Analisis Beban Pegawai',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 100000000,
                                jumlah: 100000000,
                                realisasi: 100000000
                              },
                              {
                                id: 'item-abk-jasa-abk2',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Konsultasi Pembuatan Analisis Beban Kerja (ABK) Pegawai DJKI',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 100000000,
                                jumlah: 100000000,
                                realisasi: 100000000
                              },
                              {
                                id: 'item-abk-jasa-abk3',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Konsultasi Pembuatan Analisis Beban Kerja (ABK)',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 100000000,
                                jumlah: 100000000,
                                realisasi: 100000000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-a-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (KPPN 139-Jakarta V)',
                            jumlah: 18720000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-abk-narasumber',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon I/setara',
                                rincianPerhitungan: '4 ORG x 1 JAM x 3 KEG',
                                volume: 12,
                                satuan: 'OJ',
                                hargaSatuan: 1560000,
                                jumlah: 18720000,
                                realisasi: 18720000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-a-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (KPPN 139-Jakarta V)',
                            jumlah: 590755000,
                            realisasi: 89300000,
                            penguranganPenambahan: 89300000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-abk-bpsdm-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> BPSDM Transport Darat (Akun Blokir)',
                                rincianPerhitungan: '60 ORG x 15 KALI x 3 KEG',
                                volume: 2700,
                                satuan: 'OK',
                                hargaSatuan: 103417,
                                jumlah: 279225000,
                                isBlokir: true,
                                realisasi: 89300000,
                                penguranganPenambahan: 89300000,
                                keterangan: 'Tanda Blokir POK - Realisasi / Pengurangan'
                              },
                              {
                                id: 'item-abk-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat',
                                rincianPerhitungan: '50 ORG x 8 KALI x 2 KEG',
                                volume: 800,
                                satuan: 'OK',
                                hargaSatuan: 179800,
                                jumlah: 143840000,
                                realisasi: 24800000,
                                penguranganPenambahan: 24800000
                              },
                              {
                                id: 'item-abk-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Diklat',
                                rincianPerhitungan: '40 ORG x 4 HARI x 3 KEG',
                                volume: 480,
                                satuan: 'OH',
                                hargaSatuan: 349375,
                                jumlah: 167700000,
                                realisasi: 64500000,
                                penguranganPenambahan: 64500000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-054-b',
                        level: 'SUBKOMPONEN',
                        kode: 'B',
                        nama: 'Evaluasi Kinerja Pegawai Pemerintah dengan Perjanjian Kerja (P3K)',
                        jumlah: 1216825000,
                        subTim: 'Sub-Tim 1 (Perencanaan & Layanan)',
                        children: [
                          {
                            id: 'akun-054-b-521213',
                            level: 'AKUN',
                            kode: '521213',
                            nama: 'Belanja Honor Output Kegiatan (Honor Tim Evaluasi P3K Blokir)',
                            jumlah: 111900000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-p3k-honor-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Anggota Tim Pelaksana Kegiatan (Blokir)',
                                rincianPerhitungan: '25 ORG x 12 BLN',
                                volume: 300,
                                satuan: 'OB',
                                hargaSatuan: 373000,
                                jumlah: 111900000,
                                isBlokir: true
                              }
                            ]
                          },
                          {
                            id: 'akun-054-b-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Narasumber Evaluasi Kinerja P3K)',
                            jumlah: 42880000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-p3k-narasumber-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal (Blokir)',
                                rincianPerhitungan: '8 ORG x 1 JAM x 2 KEG',
                                volume: 16,
                                satuan: 'OJ',
                                hargaSatuan: 1560000,
                                jumlah: 42880000,
                                isBlokir: true
                              }
                            ]
                          },
                          {
                            id: 'akun-054-b-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Evaluasi P3K)',
                            jumlah: 312066000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-p3k-eo1',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan Blokir',
                                rincianPerhitungan: '1 PKT x 2 KEG',
                                volume: 2,
                                satuan: 'PKT',
                                hargaSatuan: 60000000,
                                jumlah: 120000000,
                                isBlokir: true
                              },
                              {
                                id: 'item-p3k-eo2',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT x 1 KEG',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 192066000,
                                jumlah: 192066000,
                                realisasi: 192066000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-b-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 493119000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-p3k-meeting-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah (Blokir)',
                                rincianPerhitungan: '133 ORG x 4 PKT x 1 KEG',
                                volume: 532,
                                satuan: 'OP',
                                hargaSatuan: 926916,
                                jumlah: 493119000,
                                isBlokir: true
                              },
                              {
                                id: 'item-p3k-peserta-meeting',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Peserta Paket Meeting: Uang Harian & Transport',
                                rincianPerhitungan: '60 ORG x 4 HARI x 1 KEG',
                                volume: 240,
                                satuan: 'OH',
                                hargaSatuan: 172500,
                                jumlah: 41400000,
                                realisasi: 41400000
                              },
                              {
                                id: 'item-p3k-transport-lokal',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Dalam Kota',
                                rincianPerhitungan: '60 ORG x 1 KALI x 1 KEG',
                                volume: 60,
                                satuan: 'OK',
                                hargaSatuan: 170000,
                                jumlah: 10200000,
                                realisasi: 10200000
                              },
                              {
                                id: 'item-p3k-fullboard-eselon',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '60 ORG x 3 PKT x 1 KEG',
                                volume: 180,
                                satuan: 'OP',
                                hargaSatuan: 1197000,
                                jumlah: 215460000,
                                realisasi: 215460000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-054-c',
                        level: 'SUBKOMPONEN',
                        kode: 'C',
                        nama: 'Uji Kompetensi Teknis Peningkatan Kompetensi Bagi Pejabat Fungsional di Lingkungan DJKI',
                        jumlah: 362657000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-054-c-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Narasumber Ukom Teknis)',
                            jumlah: 12480000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ukom-narasumber',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon I/setara',
                                rincianPerhitungan: '8 ORG x 1 JAM x 2 KEG',
                                volume: 8,
                                satuan: 'OJ',
                                hargaSatuan: 1560000,
                                jumlah: 12480000,
                                realisasi: 12480000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-c-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Ukom)',
                            jumlah: 60000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ukom-eo',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 60000000,
                                jumlah: 60000000,
                                realisasi: 60000000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-c-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota (Ukom)',
                            jumlah: 290177000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ukom-paket',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '110 ORG x 3 PKT x 1 KEG',
                                volume: 330,
                                satuan: 'OP',
                                hargaSatuan: 879324,
                                jumlah: 290177000,
                                realisasi: 290177000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-054-d',
                        level: 'SUBKOMPONEN',
                        kode: 'D',
                        nama: 'Pelatihan Peningkatan Kompetensi Pegawai DJKI',
                        jumlah: 1366454000,
                        realisasi: 23136000,
                        penguranganPenambahan: 23136000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-054-d-521219',
                            level: 'AKUN',
                            kode: '521219',
                            nama: 'Belanja Jasa Lainnya (Pengembangan & Pelatihan Pegawai)',
                            jumlah: 1299254000,
                            realisasi: 36264000,
                            penguranganPenambahan: 36264000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-diklat-biaya',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Pengembangan dan Pelatihan Pegawai Blokir',
                                rincianPerhitungan: '25 ORG x 5 KEG',
                                volume: 125,
                                satuan: 'OK',
                                hargaSatuan: 9120000,
                                jumlah: 1140000000,
                                isBlokir: true
                              },
                              {
                                id: 'item-diklat-sertifikasi',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Biaya Ujian Sertifikasi Kompetensi',
                                rincianPerhitungan: '20 ORG x 5 KEG',
                                volume: 100,
                                satuan: 'OK',
                                hargaSatuan: 1592540,
                                jumlah: 159254000,
                                realisasi: 36264000,
                                penguranganPenambahan: 36264000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-d-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Jawa Barat Diklat)',
                            jumlah: 67200000,
                            realisasi: 36264000,
                            penguranganPenambahan: 36264000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-diklat-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Jawa Barat - Transport Darat PP',
                                rincianPerhitungan: '40 ORG x 6 KALI x 1 KEG',
                                volume: 240,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 31200000,
                                realisasi: 36264000,
                                penguranganPenambahan: 36264000
                              },
                              {
                                id: 'item-diklat-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Jawa Barat - Uang Harian Diklat',
                                rincianPerhitungan: '20 ORG x 6 HARI x 1 KEG',
                                volume: 120,
                                satuan: 'OH',
                                hargaSatuan: 300000,
                                jumlah: 36000000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-054-e',
                        level: 'SUBKOMPONEN',
                        kode: 'E',
                        nama: 'Pelatihan Teknis Pembentukan Peraturan Perundang-undangan (Penyusunan Peraturan Kebijakan)',
                        jumlah: 124900000,
                        realisasi: 52275000,
                        penguranganPenambahan: 52275000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-054-e-521211',
                            level: 'AKUN',
                            kode: '521211',
                            nama: 'Belanja Bahan (Pelatihan Teknis)',
                            jumlah: 51608000,
                            realisasi: 52275000,
                            penguranganPenambahan: 52275000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-peruu-makan',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Makan Rapat Evaluasi',
                                rincianPerhitungan: '50 ORG x 2 KALI x 2 KEG',
                                volume: 100,
                                satuan: 'OK',
                                hargaSatuan: 57000,
                                jumlah: 4860000,
                                realisasi: 1000000,
                                penguranganPenambahan: 1000000
                              },
                              {
                                id: 'item-peruu-kudapan',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Kudapan Peserta Rapat',
                                rincianPerhitungan: '71 PKT x 3 HARI x 2 KEG',
                                volume: 426,
                                satuan: 'OK',
                                hargaSatuan: 24000,
                                jumlah: 5940000,
                                realisasi: 8100000,
                                penguranganPenambahan: 8100000
                              },
                              {
                                id: 'item-peruu-kit',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Seminar Kit (Pembungkus dan Obat-obatan)',
                                rincianPerhitungan: '71 PKT',
                                volume: 71,
                                satuan: 'PKT',
                                hargaSatuan: 300000,
                                jumlah: 13200000,
                                realisasi: 41009000,
                                penguranganPenambahan: 41009000
                              },
                              {
                                id: 'item-peruu-ganda',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Penggandaan/Penjilidan',
                                rincianPerhitungan: '2 PKT',
                                volume: 2,
                                satuan: 'PKT',
                                hargaSatuan: 500000,
                                jumlah: 1000000,
                                realisasi: 2166000,
                                penguranganPenambahan: 2166000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-e-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Pelatihan Per-UU)',
                            jumlah: 73292000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-peruu-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Transportasi Koordinasi (Jakarta-Depok)',
                                rincianPerhitungan: '4 ORG x 2 KALI x 2 HARI x 2 KEG',
                                volume: 32,
                                satuan: 'OK',
                                hargaSatuan: 248000,
                                jumlah: 7936000
                              },
                              {
                                id: 'item-peruu-transport-jabar',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Transportasi Peserta (Jawa Barat)',
                                rincianPerhitungan: '66 ORG x 2 KALI x 1 KEG',
                                volume: 132,
                                satuan: 'OK',
                                hargaSatuan: 300000,
                                jumlah: 39600000
                              },
                              {
                                id: 'item-peruu-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Uang Harian Peserta',
                                rincianPerhitungan: '66 ORG x 3 HARI x 1 KEG',
                                volume: 198,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 25740000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-054-f',
                        level: 'SUBKOMPONEN',
                        kode: 'F',
                        nama: 'Biaya Bimbingan Teknis Pengelolaan Manajemen Talenta di Lingkungan DJKI (BPSDM)',
                        jumlah: 227600000,
                        realisasi: 27600000,
                        penguranganPenambahan: 27600000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-054-f-521219',
                            level: 'AKUN',
                            kode: '521219',
                            nama: 'Belanja Jasa Lainnya (Bimtek Manajemen Talenta)',
                            jumlah: 200000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-talenta-bpsdm',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Biaya Pelatihan Teknis Pengelolaan Manajemen Talenta',
                                rincianPerhitungan: '40 ORG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 5000000,
                                jumlah: 200000000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-f-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Bimtek Talenta)',
                            jumlah: 27600000,
                            realisasi: 27600000,
                            penguranganPenambahan: 27600000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-talenta-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Jawa Barat - Transport Darat PP',
                                rincianPerhitungan: '40 ORG x 2 KALI x 1 KEG',
                                volume: 80,
                                satuan: 'OK',
                                hargaSatuan: 150000,
                                jumlah: 12000000,
                                realisasi: 12000000,
                                penguranganPenambahan: 12000000
                              },
                              {
                                id: 'item-talenta-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Jawa Barat - Uang Harian Diklat',
                                rincianPerhitungan: '40 ORG x 3 HARI x 1 KEG',
                                volume: 120,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 15600000,
                                realisasi: 15600000,
                                penguranganPenambahan: 15600000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  // ==================== KOMPONEN 055 (KRO EBA) ====================
                  {
                    id: 'komp-055-eba',
                    level: 'KOMPONEN',
                    kode: '055',
                    nama: 'Peningkatan Core Value Jabatan',
                    jumlah: 2318301000,
                    realisasi: 111500000,
                    penguranganPenambahan: 111500000,
                    children: [
                      {
                        id: 'subkomp-055-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Peningkatan Duta Integritas Bagi Pegawai DJKI',
                        jumlah: 1098326000,
                        realisasi: 20800000,
                        penguranganPenambahan: 20800000,
                        subTim: 'Sub-Tim 3 (Kesejahteraan & Disiplin)',
                        children: [
                          {
                            id: 'akun-055-a-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Narasumber Integritas)',
                            jumlah: 27040000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-integritas-narasumber-es1-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon I/setara (Blokir)',
                                rincianPerhitungan: '4 ORG x 1 JAM x 1 KEG',
                                volume: 4,
                                satuan: 'OJ',
                                hargaSatuan: 1560000,
                                jumlah: 6240000,
                                isBlokir: true
                              },
                              {
                                id: 'item-integritas-narasumber-es2-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon II/setara (Blokir)',
                                rincianPerhitungan: '4 ORG x 1 JAM x 1 KEG',
                                volume: 4,
                                satuan: 'OJ',
                                hargaSatuan: 1400000,
                                jumlah: 5600000,
                                isBlokir: true
                              },
                              {
                                id: 'item-integritas-narasumber-es3',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon III/setara',
                                rincianPerhitungan: '8 ORG x 1 JAM x 1 KEG',
                                volume: 8,
                                satuan: 'OJ',
                                hargaSatuan: 1000000,
                                jumlah: 8000000
                              },
                              {
                                id: 'item-integritas-narasumber-es4',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon IV/setara',
                                rincianPerhitungan: '8 ORG x 1 JAM x 1 KEG',
                                volume: 8,
                                satuan: 'OJ',
                                hargaSatuan: 900000,
                                jumlah: 7200000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-a-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Duta Integritas)',
                            jumlah: 260000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-integritas-eo-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan (Blokir)',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 60000000,
                                jumlah: 60000000,
                                isBlokir: true
                              },
                              {
                                id: 'item-integritas-eo',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 200000000,
                                jumlah: 200000000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-a-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 358106000,
                            realisasi: 20800000,
                            penguranganPenambahan: 20800000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-integritas-meeting-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah (Blokir)',
                                rincianPerhitungan: '120 ORG x 4 PKT x 1 KEG',
                                volume: 480,
                                satuan: 'OP',
                                hargaSatuan: 746055,
                                jumlah: 358106000,
                                isBlokir: true
                              },
                              {
                                id: 'item-integritas-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Paket Meeting Fullboard',
                                rincianPerhitungan: '70 ORG x 1 KALI x 1 KEG',
                                volume: 70,
                                satuan: 'OK',
                                hargaSatuan: 300000,
                                jumlah: 21000000,
                                realisasi: 5600000,
                                penguranganPenambahan: 5600000
                              },
                              {
                                id: 'item-integritas-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Dalam Kota',
                                rincianPerhitungan: '70 ORG x 5 HARI x 1 KEG',
                                volume: 350,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 45500000,
                                realisasi: 8000000,
                                penguranganPenambahan: 8000000
                              },
                              {
                                id: 'item-integritas-fullboard',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '70 ORG x 4 PKT x 1 KEG',
                                volume: 280,
                                satuan: 'OP',
                                hargaSatuan: 1381000,
                                jumlah: 386680000,
                                realisasi: 7200000,
                                penguranganPenambahan: 7200000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-055-b',
                        level: 'SUBKOMPONEN',
                        kode: 'B',
                        nama: 'Verifikasi dan Validasi Angka Kredit',
                        jumlah: 560066000,
                        realisasi: 132300000,
                        penguranganPenambahan: 132300000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-055-b-521211',
                            level: 'AKUN',
                            kode: '521211',
                            nama: 'Belanja Bahan (Seminar Kit Verifikasi AK)',
                            jumlah: 7450000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ak-kit',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Seminar Kit Blokir',
                                rincianPerhitungan: '50 ORG x 1 PKT',
                                volume: 50,
                                satuan: 'OP',
                                hargaSatuan: 149000,
                                jumlah: 7450000,
                                isBlokir: true
                              }
                            ]
                          },
                          {
                            id: 'akun-055-b-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Verifikasi AK)',
                            jumlah: 317500000,
                            realisasi: 132300000,
                            penguranganPenambahan: 132300000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ak-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat PP (Blokir)',
                                rincianPerhitungan: '40 ORG x 2 KALI x 2 KEG',
                                volume: 160,
                                satuan: 'OK',
                                hargaSatuan: 310000,
                                jumlah: 49600000,
                                isBlokir: true,
                                realisasi: 24800000,
                                penguranganPenambahan: 24800000
                              },
                              {
                                id: 'item-ak-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Diklat (Blokir)',
                                rincianPerhitungan: '40 ORG x 5 HARI x 3 KEG',
                                volume: 400,
                                satuan: 'OH',
                                hargaSatuan: 483750,
                                jumlah: 193500000,
                                isBlokir: true,
                                realisasi: 107500000,
                                penguranganPenambahan: 107500000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-055-c',
                        level: 'SUBKOMPONEN',
                        kode: 'C',
                        nama: 'Konsinyering Peningkatan Core Value dan Budaya Kerja di Lingkungan DJKI',
                        jumlah: 659909000,
                        realisasi: 20800000,
                        penguranganPenambahan: 20800000,
                        subTim: 'Sub-Tim 3 (Kesejahteraan & Disiplin)',
                        children: [
                          {
                            id: 'akun-055-c-521211',
                            level: 'AKUN',
                            kode: '521211',
                            nama: 'Belanja Bahan (Konsinyering)',
                            jumlah: 6700000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-core-kit',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Seminar Kit Kegiatan',
                                rincianPerhitungan: '40 PKT x 1 KEG',
                                volume: 40,
                                satuan: 'PKT',
                                hargaSatuan: 167500,
                                jumlah: 6700000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-c-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Konsinyering)',
                            jumlah: 223081000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-core-eo',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 193081000,
                                jumlah: 193081000
                              },
                              {
                                id: 'item-core-sewa',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Sewa Perlengkapan Blokir',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 30000000,
                                jumlah: 30000000,
                                isBlokir: true
                              }
                            ]
                          },
                          {
                            id: 'akun-055-c-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Narasumber Konsinyering)',
                            jumlah: 6240000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-core-narasumber',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon I/setara',
                                rincianPerhitungan: '4 ORG x 1 JAM x 1 KEG',
                                volume: 4,
                                satuan: 'OJ',
                                hargaSatuan: 1560000,
                                jumlah: 6240000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-c-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 416969000,
                            realisasi: 20800000,
                            penguranganPenambahan: 20800000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-core-meeting-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah Blokir',
                                rincianPerhitungan: '55 ORG x 3 PKT x 1 KEG',
                                volume: 165,
                                satuan: 'OP',
                                hargaSatuan: 970358,
                                jumlah: 160109000,
                                isBlokir: true
                              },
                              {
                                id: 'item-core-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Paket Meeting Fullboard',
                                rincianPerhitungan: '60 ORG x 4 HARI x 1 KEG',
                                volume: 240,
                                satuan: 'OH',
                                hargaSatuan: 172500,
                                jumlah: 41400000,
                                realisasi: 5600000,
                                penguranganPenambahan: 5600000
                              },
                              {
                                id: 'item-core-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Dalam Kota',
                                rincianPerhitungan: '60 ORG x 1 KALI x 1 KEG',
                                volume: 60,
                                satuan: 'OK',
                                hargaSatuan: 170000,
                                jumlah: 10200000,
                                realisasi: 8000000,
                                penguranganPenambahan: 8000000
                              },
                              {
                                id: 'item-core-fullboard',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '60 ORG x 3 PKT x 1 KEG',
                                volume: 180,
                                satuan: 'OP',
                                hargaSatuan: 1197000,
                                jumlah: 215460000,
                                realisasi: 7200000,
                                penguranganPenambahan: 7200000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },

          // ==================== KRO 7122.EBC ====================
          {
            id: 'kro-7122-ebc',
            level: 'KRO',
            kode: '7122.EBC',
            nama: 'Layanan Manajemen SDM [Base Line]',
            jumlah: 2227420000,
            realisasi: 66615000,
            penguranganPenambahan: 66615000,
            children: [
              {
                id: 'ro-7122-ebc-210',
                level: 'RO',
                kode: '7122.EBC.210',
                nama: 'Layanan Manajemen SDM',
                jumlah: 2227420000,
                realisasi: 66615000,
                penguranganPenambahan: 66615000,
                children: [
                  {
                    id: 'komp-051-ebc',
                    level: 'KOMPONEN',
                    kode: '051',
                    nama: 'Penguatan Budaya Kerja dan Citra Institusi',
                    jumlah: 77381000,
                    children: [
                      {
                        id: 'subkomp-051-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Pelayanan Prima bagi Pegawai Ditjen KI',
                        jumlah: 77381000,
                        subTim: 'Sub-Tim 3 (Kesejahteraan & Disiplin)',
                        children: [
                          {
                            id: 'akun-051-a-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 77381000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-prima-meeting-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Paket Meeting Fullboard Eselon III ke bawah (Blokir)',
                                rincianPerhitungan: '40 ORG x 3 HARI x 1 KEG',
                                volume: 120,
                                satuan: 'OH',
                                hargaSatuan: 644842,
                                jumlah: 77381000,
                                isBlokir: true
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'komp-052-ebc',
                    level: 'KOMPONEN',
                    kode: '052',
                    nama: 'Pengelolaan Kinerja Pegawai',
                    jumlah: 338100000,
                    realisasi: 66615000,
                    penguranganPenambahan: 66615000,
                    children: [
                      {
                        id: 'subkomp-052-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Persiapan dan Pengisian Data Layanan I-Mut dalam rangka Pengangkatan/Pemindahan Jabatan Fungsional',
                        jumlah: 338100000,
                        realisasi: 66615000,
                        penguranganPenambahan: 66615000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-052-a-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (I-Mut)',
                            jumlah: 338100000,
                            realisasi: 66615000,
                            penguranganPenambahan: 66615000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-imut-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat',
                                rincianPerhitungan: '40 ORG x 5 HARI x 1 KEG',
                                volume: 200,
                                satuan: 'OH',
                                hargaSatuan: 499500,
                                jumlah: 99900000,
                                realisasi: 54560000,
                                penguranganPenambahan: 54560000
                              },
                              {
                                id: 'item-imut-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Diklat',
                                rincianPerhitungan: '45 ORG x 5 HARI x 2 KEG',
                                volume: 450,
                                satuan: 'OH',
                                hargaSatuan: 430000,
                                jumlah: 193500000,
                                realisasi: 121175000,
                                penguranganPenambahan: 121175000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'komp-053-ebc',
                    level: 'KOMPONEN',
                    kode: '053',
                    nama: 'Pengembangan Talenta dan Karier Pegawai',
                    jumlah: 319359000,
                    realisasi: 5025000,
                    penguranganPenambahan: 5025000,
                    children: [
                      {
                        id: 'subkomp-053-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Penyusunan Kurikulum dan Modul Pelatihan Analisis Kekayaan Intelektual',
                        jumlah: 319359000,
                        realisasi: 5025000,
                        penguranganPenambahan: 5025000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-053-a-521213',
                            level: 'AKUN',
                            kode: '521213',
                            nama: 'Belanja Honor Output Kegiatan (Honor Penyusun Modul KI)',
                            jumlah: 6025000,
                            realisasi: 5025000,
                            penguranganPenambahan: 5025000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-modul-honor',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honor Penyusun Modul',
                                rincianPerhitungan: '50 OP',
                                volume: 50,
                                satuan: 'OP',
                                hargaSatuan: 120500,
                                jumlah: 6025000,
                                realisasi: 5025000,
                                penguranganPenambahan: 5025000
                              }
                            ]
                          },
                          {
                            id: 'akun-053-a-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 258334000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-modul-meeting',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '70 ORG x 3 PKT x 1 KEG',
                                volume: 210,
                                satuan: 'OP',
                                hargaSatuan: 1230162,
                                jumlah: 258334000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'komp-054-ebc',
                    level: 'KOMPONEN',
                    kode: '054',
                    nama: 'Pengembangan Kompetensi Pegawai',
                    jumlah: 316212000,
                    children: [
                      {
                        id: 'subkomp-054-ebc-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Pelatihan Public Speaking bagi Pegawai Ditjen KI',
                        jumlah: 316212000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-054-ebc-a-521219',
                            level: 'AKUN',
                            kode: '521219',
                            nama: 'Belanja Barang Non Operasional Lainnya',
                            jumlah: 200000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-public-speaking-biaya',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Biaya Pelatihan Public Speaking bagi Pegawai Ditjen KI',
                                rincianPerhitungan: '40 ORG x 1 KEG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 5000000,
                                jumlah: 200000000
                              }
                            ]
                          },
                          {
                            id: 'akun-054-ebc-a-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Jawa Barat)',
                            jumlah: 26100000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-public-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transportasi Darat PP',
                                rincianPerhitungan: '30 ORG x 2 KALI x 1 KEG',
                                volume: 60,
                                satuan: 'OK',
                                hargaSatuan: 240000,
                                jumlah: 14400000
                              },
                              {
                                id: 'item-public-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Diklat',
                                rincianPerhitungan: '30 ORG x 3 HARI x 1 KEG',
                                volume: 90,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 11700000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'komp-055-ebc',
                    level: 'KOMPONEN',
                    kode: '055',
                    nama: 'Pemberian Penghargaan dan Pengakuan',
                    jumlah: 505490000,
                    children: [
                      {
                        id: 'subkomp-055-ebc-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Verifikasi dan Validasi Usulan Penerima Penghargaan Satyalancana Karya Satya (SLKS)',
                        jumlah: 505490000,
                        subTim: 'Sub-Tim 3 (Kesejahteraan & Disiplin)',
                        children: [
                          {
                            id: 'akun-055-ebc-a-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (SLKS)',
                            jumlah: 505490000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-slks-tiket',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat (Sumatera)',
                                rincianPerhitungan: '50 ORG x 5 HARI x 2 KEG',
                                volume: 500,
                                satuan: 'OH',
                                hargaSatuan: 246500,
                                jumlah: 123250000
                              },
                              {
                                id: 'item-slks-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat',
                                rincianPerhitungan: '41 ORG x 10 KALI x 2 KEG',
                                volume: 820,
                                satuan: 'OK',
                                hargaSatuan: 250146,
                                jumlah: 205120000
                              },
                              {
                                id: 'item-slks-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian',
                                rincianPerhitungan: '41 ORG x 10 HARI x 2 KEG',
                                volume: 820,
                                satuan: 'OH',
                                hargaSatuan: 216000,
                                jumlah: 177120000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    id: 'komp-056-ebc',
                    level: 'KOMPONEN',
                    kode: '056',
                    nama: 'Pemberhentian Pegawai & Disiplin',
                    jumlah: 670878000,
                    children: [
                      {
                        id: 'subkomp-056-ebc-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Sosialisasi Pemberian Penghargaan dan Hukuman Disiplin serta Sanksi Administratif',
                        jumlah: 670878000,
                        subTim: 'Sub-Tim 3 (Kesejahteraan & Disiplin)',
                        children: [
                          {
                            id: 'akun-056-ebc-a-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Narasumber Disiplin)',
                            jumlah: 20800000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-disiplin-narasumber-es1',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon I/setara',
                                rincianPerhitungan: '1 ORG x 4 JAM x 1 KEG',
                                volume: 4,
                                satuan: 'OJ',
                                hargaSatuan: 1560000,
                                jumlah: 6240000
                              },
                              {
                                id: 'item-disiplin-narasumber-es2',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon II/setara',
                                rincianPerhitungan: '2 ORG x 4 JAM x 1 KEG',
                                volume: 8,
                                satuan: 'OJ',
                                hargaSatuan: 1000000,
                                jumlah: 8000000
                              },
                              {
                                id: 'item-disiplin-narasumber-es3',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon III/setara',
                                rincianPerhitungan: '2 ORG x 4 JAM x 1 KEG',
                                volume: 8,
                                satuan: 'OJ',
                                hargaSatuan: 900000,
                                jumlah: 7200000
                              }
                            ]
                          },
                          {
                            id: 'akun-056-ebc-a-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Disiplin)',
                            jumlah: 193081000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-disiplin-eo',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 193081000,
                                jumlah: 193081000
                              }
                            ]
                          },
                          {
                            id: 'akun-056-ebc-a-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 200137000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-disiplin-meeting-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah Blokir',
                                rincianPerhitungan: '75 ORG x 3 PKT x 1 KEG',
                                volume: 225,
                                satuan: 'OP',
                                hargaSatuan: 889498,
                                jumlah: 200137000,
                                isBlokir: true
                              },
                              {
                                id: 'item-disiplin-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Paket Meeting Fullboard',
                                rincianPerhitungan: '60 ORG x 4 HARI x 1 KEG',
                                volume: 240,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 31200000
                              },
                              {
                                id: 'item-disiplin-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Dalam Kota',
                                rincianPerhitungan: '60 ORG x 1 KALI x 1 KEG',
                                volume: 60,
                                satuan: 'OK',
                                hargaSatuan: 170000,
                                jumlah: 10200000
                              },
                              {
                                id: 'item-disiplin-fullboard',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '60 ORG x 3 PKT x 1 KEG',
                                volume: 180,
                                satuan: 'OP',
                                hargaSatuan: 1197000,
                                jumlah: 215460000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },

          // ==================== KRO 7122.EBD ====================
          {
            id: 'kro-7122-ebd',
            level: 'KRO',
            kode: '7122.EBD',
            nama: 'Layanan Manajemen Kinerja Internal [Base Line]',
            jumlah: 12285341000,
            realisasi: 265876000,
            penguranganPenambahan: 265876000,
            children: [
              {
                id: 'ro-7122-ebd-002',
                level: 'RO',
                kode: '7122.EBD.002',
                nama: 'Fasilitasi Peningkatan dan Evaluasi Kinerja',
                jumlah: 12285341000,
                realisasi: 265876000,
                penguranganPenambahan: 265876000,
                children: [
                  {
                    id: 'komp-055-ebd',
                    level: 'KOMPONEN',
                    kode: '055',
                    nama: 'Pengembangan Profesi dan Peningkatan Jabatan',
                    jumlah: 4795977000,
                    realisasi: 102020000,
                    penguranganPenambahan: 102020000,
                    children: [
                      {
                        id: 'subkomp-055-ebd-a',
                        level: 'SUBKOMPONEN',
                        kode: 'A',
                        nama: 'Koordinasi dan Konsultasi Kepegawaian',
                        jumlah: 1116556000,
                        realisasi: 118020000,
                        penguranganPenambahan: 118020000,
                        subTim: 'Sub-Tim 1 (Perencanaan & Layanan)',
                        children: [
                          {
                            id: 'akun-055-ebd-a-521211',
                            level: 'AKUN',
                            kode: '521211',
                            nama: 'Belanja Bahan (Rapat Koordinasi)',
                            jumlah: 174000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-koordinasi-snack',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Konsumsi Snack Rapat',
                                rincianPerhitungan: '50 ORG x 50 KEG',
                                volume: 2500,
                                satuan: 'OK',
                                hargaSatuan: 24000,
                                jumlah: 60000000
                              },
                              {
                                id: 'item-koordinasi-makan',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Konsumsi Makan Rapat',
                                rincianPerhitungan: '50 ORG x 40 KEG',
                                volume: 2000,
                                satuan: 'OK',
                                hargaSatuan: 57000,
                                jumlah: 114000000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-ebd-a-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Narasumber Koordinasi)',
                            jumlah: 139600000,
                            realisasi: 51200000,
                            penguranganPenambahan: 51200000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-koordinasi-narasumber-es1-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Blokir',
                                rincianPerhitungan: '2 ORG x 4 JAM x 6 KEG',
                                volume: 48,
                                satuan: 'OJ',
                                hargaSatuan: 970000,
                                jumlah: 46560000,
                                isBlokir: true
                              },
                              {
                                id: 'item-koordinasi-narasumber-es1',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon I/setara',
                                rincianPerhitungan: '4 ORG x 1 JAM x 5 KEG',
                                volume: 20,
                                satuan: 'OJ',
                                hargaSatuan: 1400000,
                                jumlah: 28000000,
                                realisasi: 5600000,
                                penguranganPenambahan: 5600000
                              },
                              {
                                id: 'item-koordinasi-narasumber-es2',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon II/setara',
                                rincianPerhitungan: '4 ORG x 1 JAM x 5 KEG',
                                volume: 20,
                                satuan: 'OJ',
                                hargaSatuan: 1000000,
                                jumlah: 20000000,
                                realisasi: 2800000,
                                penguranganPenambahan: 2800000
                              },
                              {
                                id: 'item-koordinasi-narasumber-es3',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon III/setara',
                                rincianPerhitungan: '5 ORG x 2 JAM x 4 KEG',
                                volume: 40,
                                satuan: 'OJ',
                                hargaSatuan: 900000,
                                jumlah: 36000000,
                                realisasi: 21600000,
                                penguranganPenambahan: 21600000
                              },
                              {
                                id: 'item-koordinasi-narasumber-es4',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Narasumber Eksternal Eselon IV/setara',
                                rincianPerhitungan: '1 ORG x 1 JAM x 10 KEG',
                                volume: 10,
                                satuan: 'OJ',
                                hargaSatuan: 904000,
                                jumlah: 9040000,
                                realisasi: 21200000,
                                penguranganPenambahan: 21200000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-ebd-a-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Koordinasi Kepegawaian)',
                            jumlah: 520555000,
                            realisasi: 24320000,
                            penguranganPenambahan: 24320000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-koordinasi-tiket-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat PP (Blokir)',
                                rincianPerhitungan: '2 ORG x 1 KEG',
                                volume: 6,
                                satuan: 'OK',
                                hargaSatuan: 1191333,
                                jumlah: 7148000,
                                isBlokir: true
                              },
                              {
                                id: 'item-koordinasi-taksi-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Taksi Asal/Daerah PP (Blokir)',
                                rincianPerhitungan: '2 ORG x 2 KALI x 1 KEG',
                                volume: 8,
                                satuan: 'OK',
                                hargaSatuan: 300000,
                                jumlah: 2400000,
                                isBlokir: true
                              },
                              {
                                id: 'item-koordinasi-tiket-pesawat',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat PP',
                                rincianPerhitungan: '65 ORG x 3 HARI x 6 KEG',
                                volume: 390,
                                satuan: 'OH',
                                hargaSatuan: 845820,
                                jumlah: 329870000,
                                realisasi: 14188000,
                                penguranganPenambahan: 14188000
                              },
                              {
                                id: 'item-koordinasi-transport-darat',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transportasi Darat PP',
                                rincianPerhitungan: '5 ORG x 2 KALI x 4 KEG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 171000,
                                jumlah: 6840000,
                                realisasi: 5312000,
                                penguranganPenambahan: 5312000
                              },
                              {
                                id: 'item-koordinasi-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Perjalanan Dinas',
                                rincianPerhitungan: '13 ORG x 4 HARI x 8 KEG',
                                volume: 416,
                                satuan: 'OH',
                                hargaSatuan: 430000,
                                jumlah: 178880000,
                                realisasi: 4820000,
                                penguranganPenambahan: 4820000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-ebd-a-524113',
                            level: 'AKUN',
                            kode: '524113',
                            nama: 'Belanja Perjalanan Dinas Dalam Kota (Koordinasi)',
                            jumlah: 282401000,
                            realisasi: 42500000,
                            penguranganPenambahan: 42500000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-koordinasi-pjdk-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Biaya Penanganan Blokir - Uang Harian PJDK Lebih Dari 8 Jam',
                                rincianPerhitungan: '10 ORG x 3 HARI x 5 KEG',
                                volume: 150,
                                satuan: 'OH',
                                hargaSatuan: 646007,
                                jumlah: 96901000,
                                isBlokir: true,
                                realisasi: 16900000,
                                penguranganPenambahan: 16900000
                              },
                              {
                                id: 'item-koordinasi-transport-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Biaya Penanganan Blokir - Transport Dalam Kota',
                                rincianPerhitungan: '8 ORG x 1 HARI x 5 KEG',
                                volume: 40,
                                satuan: 'OH',
                                hargaSatuan: 1900000,
                                jumlah: 76000000,
                                isBlokir: true,
                                realisasi: 12850000,
                                penguranganPenambahan: 12850000
                              },
                              {
                                id: 'item-koordinasi-uang-harian-es4-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Biaya Penanganan Blokir - Uang Harian PJDK Pejabat Eselon IV/Golongan',
                                rincianPerhitungan: '10 ORG x 3 HARI x 5 KEG',
                                volume: 150,
                                satuan: 'OH',
                                hargaSatuan: 730000,
                                jumlah: 109500000,
                                isBlokir: true,
                                realisasi: 12750000,
                                penguranganPenambahan: 12750000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-055-ebd-b',
                        level: 'SUBKOMPONEN',
                        kode: 'B',
                        nama: 'Penilaian Kinerja Jabatan Fungsional Pemeriksa Kekayaan Intelektual',
                        jumlah: 548490000,
                        realisasi: 60000000,
                        penguranganPenambahan: 60000000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-055-ebd-b-521213',
                            level: 'AKUN',
                            kode: '521213',
                            nama: 'Belanja Honor Output Kegiatan (Tim Penilai Kinerja JF Blokir)',
                            jumlah: 486900000,
                            realisasi: 60000000,
                            penguranganPenambahan: 60000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-penilai-honor-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Anggota Tim Pelaksana Kegiatan (Blokir)',
                                rincianPerhitungan: '11 ORG x 12 BLN',
                                volume: 132,
                                satuan: 'OB',
                                hargaSatuan: 506818,
                                jumlah: 66900000,
                                isBlokir: true,
                                realisasi: 60000000,
                                penguranganPenambahan: 60000000
                              },
                              {
                                id: 'item-penilai-honor-sk',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Tim Penilai Angka Kredit JF KI',
                                rincianPerhitungan: '70 ORG x 12 BLN',
                                volume: 840,
                                satuan: 'OB',
                                hargaSatuan: 500000,
                                jumlah: 420000000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-055-ebd-i',
                        level: 'SUBKOMPONEN',
                        kode: 'I',
                        nama: 'Pendidikan dan Pelatihan Pembentukan Penyidik Pegawai Negeri Sipil (PPNS)',
                        jumlah: 1408000000,
                        realisasi: 44000000,
                        penguranganPenambahan: 44000000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-055-ebd-i-521219',
                            level: 'AKUN',
                            kode: '521219',
                            nama: 'Belanja Barang Non Operasional Lainnya (Diklat PPNS)',
                            jumlah: 1116000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ppns-biaya',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Biaya Pelatihan Diklat Pembentukan Penyidik Pegawai Negeri Sipil PPNS',
                                rincianPerhitungan: '40 ORG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 27900000,
                                jumlah: 1116000000
                              }
                            ]
                          },
                          {
                            id: 'akun-055-ebd-i-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (PPNS)',
                            jumlah: 292000000,
                            realisasi: 44000000,
                            penguranganPenambahan: 44000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ppns-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat PP',
                                rincianPerhitungan: '40 ORG x 2 KALI x 1 KEG',
                                volume: 80,
                                satuan: 'OK',
                                hargaSatuan: 300000,
                                jumlah: 24000000,
                                realisasi: 44000000,
                                penguranganPenambahan: 44000000
                              },
                              {
                                id: 'item-ppns-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Diklat',
                                rincianPerhitungan: '40 ORG x 60 HARI x 1 KEG',
                                volume: 2400,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 312000000,
                                realisasi: 41800000,
                                penguranganPenambahan: 41800000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  // ==================== KOMPONEN 056 (KRO EBD) ====================
                  {
                    id: 'komp-056-ebd',
                    level: 'KOMPONEN',
                    kode: '056',
                    nama: 'Penataan Mutasi Jabatan / Fasilitasi Kinerja Jabatan',
                    jumlah: 7489364000,
                    realisasi: 163856000,
                    penguranganPenambahan: 163856000,
                    children: [
                      {
                        id: 'subkomp-056-b',
                        level: 'SUBKOMPONEN',
                        kode: 'B',
                        nama: 'Biaya Mutasi Pegawai dan Pensiunan Pegawai',
                        jumlah: 163924000,
                        realisasi: 80000000,
                        penguranganPenambahan: 80000000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-056-b-521219',
                            level: 'AKUN',
                            kode: '521219',
                            nama: 'Belanja Barang Non Operasional Lainnya',
                            jumlah: 63828000,
                            realisasi: 80000000,
                            penguranganPenambahan: 80000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-mutasi-gudang-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Pengepakan dan Penggudangan (Blokir)',
                                rincianPerhitungan: '1 THN',
                                volume: 1,
                                satuan: 'THN',
                                hargaSatuan: 50328000,
                                jumlah: 50328000,
                                isBlokir: true,
                                realisasi: 40000000,
                                penguranganPenambahan: 40000000
                              },
                              {
                                id: 'item-mutasi-angkut',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Angkutan Barang Mutasi',
                                rincianPerhitungan: '1 THN',
                                volume: 1,
                                satuan: 'THN',
                                hargaSatuan: 20000000,
                                jumlah: 20000000,
                                realisasi: 20000000,
                                penguranganPenambahan: 20000000
                              },
                              {
                                id: 'item-pensiun-gudang',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Pengepakan dan Penggudangan Pensiun',
                                rincianPerhitungan: '1 THN',
                                volume: 1,
                                satuan: 'THN',
                                hargaSatuan: 20000000,
                                jumlah: 20000000,
                                realisasi: 20000000,
                                penguranganPenambahan: 20000000
                              }
                            ]
                          },
                          {
                            id: 'akun-056-b-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Mutasi & Pensiun)',
                            jumlah: 100096000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-mutasi-tiket-blokir',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat PP Blokir',
                                rincianPerhitungan: '5 ORG x 16 KEG',
                                volume: 80,
                                satuan: 'OK',
                                hargaSatuan: 1251200,
                                jumlah: 100096000,
                                isBlokir: true
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-c',
                        level: 'SUBKOMPONEN',
                        kode: 'C',
                        nama: 'Pembekalan Persiapan Masa Pensiun Pegawai DJKI',
                        jumlah: 831612000,
                        realisasi: 82828000,
                        penguranganPenambahan: 82828000,
                        subTim: 'Sub-Tim 3 (Kesejahteraan & Disiplin)',
                        children: [
                          {
                            id: 'akun-056-c-522141',
                            level: 'AKUN',
                            kode: '522141',
                            nama: 'Belanja Sewa (Sewa Perlengkapan Pensiun)',
                            jumlah: 96958500,
                            realisasi: 3041500,
                            penguranganPenambahan: 3041500,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-pensiun-sewa',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Sewa Perlengkapan Kegiatan',
                                rincianPerhitungan: '1 PKT',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 96958500,
                                jumlah: 96958500,
                                realisasi: 3041500,
                                penguranganPenambahan: 3041500
                              }
                            ]
                          },
                          {
                            id: 'akun-056-c-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Pensiun)',
                            jumlah: 257413500,
                            realisasi: 2586500,
                            penguranganPenambahan: 2586500,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-pensiun-eo',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT x 1 KEG',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 60000000,
                                jumlah: 60000000,
                                realisasi: 2586500,
                                penguranganPenambahan: 2586500
                              }
                            ]
                          },
                          {
                            id: 'akun-056-c-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 467400000,
                            realisasi: 60000000,
                            penguranganPenambahan: 60000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-pensiun-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Paket Meeting',
                                rincianPerhitungan: '100 ORG x 5 HARI x 1 KEG',
                                volume: 500,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 65000000,
                                realisasi: 13000000,
                                penguranganPenambahan: 13000000
                              },
                              {
                                id: 'item-pensiun-fullboard',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '100 ORG x 4 PKT x 1 KEG',
                                volume: 400,
                                satuan: 'OP',
                                hargaSatuan: 1006000,
                                jumlah: 402400000,
                                realisasi: 47200000,
                                penguranganPenambahan: 47200000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-d',
                        level: 'SUBKOMPONEN',
                        kode: 'D',
                        nama: 'Pelaksanaan Uji Kompetensi Pemetaan Uji Kompetensi Bagi JF',
                        jumlah: 348100000,
                        realisasi: 132300000,
                        penguranganPenambahan: 132300000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-056-d-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (BPSDM)',
                            jumlah: 348100000,
                            realisasi: 132300000,
                            penguranganPenambahan: 132300000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-pemetaan-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat PP',
                                rincianPerhitungan: '50 ORG x 10 KALI x 2 KEG',
                                volume: 500,
                                satuan: 'OK',
                                hargaSatuan: 273200,
                                jumlah: 136600000,
                                realisasi: 24800000,
                                penguranganPenambahan: 24800000
                              },
                              {
                                id: 'item-pemetaan-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian',
                                rincianPerhitungan: '50 ORG x 10 HARI x 2 KEG',
                                volume: 600,
                                satuan: 'OH',
                                hargaSatuan: 423000,
                                jumlah: 211500000,
                                realisasi: 107500000,
                                penguranganPenambahan: 107500000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-e',
                        level: 'SUBKOMPONEN',
                        kode: 'E',
                        nama: 'Uji Kompetensi Bagi JF di Bidang Kekayaan Intelektual',
                        jumlah: 1760345000,
                        realisasi: 2021975000,
                        penguranganPenambahan: 2021975000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-056-e-521213',
                            level: 'AKUN',
                            kode: '521213',
                            nama: 'Belanja Honor Output Kegiatan (Honor Penguji Ukom)',
                            jumlah: 93450000,
                            realisasi: 93450000,
                            penguranganPenambahan: 93450000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ukomki-honor-penguji',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Honorarium Penguji Ukom Teknis',
                                rincianPerhitungan: '180 OB',
                                volume: 180,
                                satuan: 'OB',
                                hargaSatuan: 500000,
                                jumlah: 90000000,
                                realisasi: 90000000,
                                penguranganPenambahan: 90000000
                              }
                            ]
                          },
                          {
                            id: 'akun-056-e-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Ukom)',
                            jumlah: 208969000,
                            realisasi: 208969000,
                            penguranganPenambahan: 208969000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ukomki-eo',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Jasa Penyelenggara Kegiatan',
                                rincianPerhitungan: '1 PKT x 1 KEG',
                                volume: 1,
                                satuan: 'PKT',
                                hargaSatuan: 191031000,
                                jumlah: 191031000,
                                realisasi: 208969000,
                                penguranganPenambahan: 208969000
                              }
                            ]
                          },
                          {
                            id: 'akun-056-e-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota',
                            jumlah: 1331046000,
                            realisasi: 1472954000,
                            penguranganPenambahan: 1472954000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-ukomki-tiket',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat (PP)',
                                rincianPerhitungan: '250 ORG x 4 HARI x 1 KEG',
                                volume: 1250,
                                satuan: 'OH',
                                hargaSatuan: 170947,
                                jumlah: 213710000,
                                realisasi: 213710000,
                                penguranganPenambahan: 213710000
                              },
                              {
                                id: 'item-ukomki-uang-harian',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Paket Meeting Fullboard',
                                rincianPerhitungan: '250 ORG x 4 HARI x 1 KEG',
                                volume: 1250,
                                satuan: 'OH',
                                hargaSatuan: 123032,
                                jumlah: 153790000,
                                realisasi: 175210000,
                                penguranganPenambahan: 175210000
                              },
                              {
                                id: 'item-ukomki-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Dalam Kota',
                                rincianPerhitungan: '250 ORG x 1 KALI x 1 KEG',
                                volume: 250,
                                satuan: 'OK',
                                hargaSatuan: 170000,
                                jumlah: 42500000,
                                realisasi: 42500000,
                                penguranganPenambahan: 42500000
                              },
                              {
                                id: 'item-ukomki-fullboard',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Paket Meeting Fullboard Eselon III ke bawah',
                                rincianPerhitungan: '250 ORG x 4 PKT x 1 KEG',
                                volume: 1000,
                                satuan: 'OP',
                                hargaSatuan: 1134756,
                                jumlah: 1134756000,
                                realisasi: 1259244000,
                                penguranganPenambahan: 1259244000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-f',
                        level: 'SUBKOMPONEN',
                        kode: 'F',
                        nama: 'Pelatihan Peningkatan Kapasitas Pegawai terkait Advokasi Hukum',
                        jumlah: 219300000,
                        realisasi: 1400000,
                        penguranganPenambahan: 1400000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-056-f-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (Advokasi)',
                            jumlah: 20700000,
                            realisasi: 1400000,
                            penguranganPenambahan: 1400000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-advokasi-tiket',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat PP',
                                rincianPerhitungan: '30 ORG x 1 KEG',
                                volume: 30,
                                satuan: 'OK',
                                hargaSatuan: 1400000,
                                jumlah: 42000000,
                                realisasi: 1400000,
                                penguranganPenambahan: 1400000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-h',
                        level: 'SUBKOMPONEN',
                        kode: 'H',
                        nama: 'Pelatihan Kepemimpinan Nasional TK.II (PKN Tk. II)',
                        jumlah: 344500000,
                        realisasi: 94697000,
                        penguranganPenambahan: 94697000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-056-h-522151',
                            level: 'AKUN',
                            kode: '522151',
                            nama: 'Belanja Jasa Profesi (Pengajar PKN)',
                            jumlah: 268500000,
                            realisasi: 3000000,
                            penguranganPenambahan: 3000000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-pkn-policy-brief',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: 'Pembuatan Policy Brief',
                                rincianPerhitungan: '12 OJP',
                                volume: 12,
                                satuan: 'OJP',
                                hargaSatuan: 250000,
                                jumlah: 3000000,
                                realisasi: 3000000,
                                penguranganPenambahan: 3000000
                              }
                            ]
                          },
                          {
                            id: 'akun-056-h-524111',
                            level: 'AKUN',
                            kode: '524111',
                            nama: 'Belanja Perjalanan Dinas Biasa (PKN)',
                            jumlah: 76000000,
                            realisasi: 234127000,
                            penguranganPenambahan: 234127000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-pkn-penginapan-pendamping',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Penginapan Pendamping (Jawa Barat)',
                                rincianPerhitungan: '35 ORG x 3 HARI x 1 KEG',
                                volume: 105,
                                satuan: 'OH',
                                hargaSatuan: 500000,
                                jumlah: 52500000,
                                realisasi: 13500000,
                                penguranganPenambahan: 13500000
                              },
                              {
                                id: 'item-pkn-uang-harian-pendamping',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Uang Harian Pendamping (Jawa Barat)',
                                rincianPerhitungan: '36 ORG x 1 HARI x 1 KEG',
                                volume: 36,
                                satuan: 'OH',
                                hargaSatuan: 130000,
                                jumlah: 4680000,
                                realisasi: 4680000,
                                penguranganPenambahan: 4680000
                              }
                            ]
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-j',
                        level: 'SUBKOMPONEN',
                        kode: 'J',
                        nama: 'Uji Kompetensi Lanjutan Bagi Pejabat Fungsional di Lingkungan Ditjen KI',
                        jumlah: 1151970000,
                        realisasi: 1151970000,
                        penguranganPenambahan: 1151970000,
                        subTim: 'Sub-Tim 2 (Mutasi & Pengembangan)',
                        children: [
                          {
                            id: 'akun-056-j-521213',
                            level: 'AKUN',
                            kode: '521213',
                            nama: 'Belanja Honor Output Kegiatan',
                            jumlah: 93450000,
                            realisasi: 93450000,
                            penguranganPenambahan: 93450000,
                            kategoriAkun: '52'
                          },
                          {
                            id: 'akun-056-j-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya / Sewa & EO Ukom',
                            jumlah: 195000000,
                            realisasi: 195000000,
                            penguranganPenambahan: 195000000,
                            kategoriAkun: '52'
                          },
                          {
                            id: 'akun-056-j-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting',
                            jumlah: 672960000,
                            realisasi: 672960000,
                            penguranganPenambahan: 672960000,
                            kategoriAkun: '52'
                          }
                        ]
                      },
                      {
                        id: 'subkomp-056-k',
                        level: 'SUBKOMPONEN',
                        kode: 'K',
                        nama: 'Bimbingan Teknis Pengelolaan Peningkatan dan Teknis Kepegawaian',
                        jumlah: 643170000,
                        realisasi: 643170000,
                        penguranganPenambahan: 643170000,
                        subTim: 'Sub-Tim 1 (Perencanaan & Layanan)',
                        children: [
                          {
                            id: 'akun-056-k-522191',
                            level: 'AKUN',
                            kode: '522191',
                            nama: 'Belanja Jasa Lainnya (EO Bimtek)',
                            jumlah: 195000000,
                            realisasi: 195000000,
                            penguranganPenambahan: 195000000,
                            kategoriAkun: '52'
                          },
                          {
                            id: 'akun-056-k-524119',
                            level: 'AKUN',
                            kode: '524119',
                            nama: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota',
                            jumlah: 131900000,
                            realisasi: 131900000,
                            penguranganPenambahan: 131900000,
                            kategoriAkun: '52',
                            children: [
                              {
                                id: 'item-bimtek-tiket',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Tiket Pesawat PP',
                                rincianPerhitungan: '40 ORG x 1 KEG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 2800000,
                                jumlah: 112000000,
                                realisasi: 112000000,
                                penguranganPenambahan: 112000000
                              },
                              {
                                id: 'item-bimtek-transport',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Transport Darat PP',
                                rincianPerhitungan: '40 ORG x 1 KALI x 1 KEG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 400000,
                                jumlah: 16000000,
                                realisasi: 16000000,
                                penguranganPenambahan: 16000000
                              },
                              {
                                id: 'item-bimtek-taksi',
                                level: 'DETAIL_ITEM',
                                kode: '-',
                                nama: '>> Taksi Awal/Daerah',
                                rincianPerhitungan: '40 ORG x 1 KALI x 1 KEG',
                                volume: 40,
                                satuan: 'OK',
                                hargaSatuan: 200000,
                                jumlah: 3900000,
                                realisasi: 3900000,
                                penguranganPenambahan: 3900000
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
];
