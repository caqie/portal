import React, { useState, useEffect, useMemo } from 'react';
import { fetchPegawaiFromSheets, getRetirementDetails, fetchPengembanganFromSheets, fetchKGBFromSheets, fetchKegiatanFromSheets, fetchAbsensiHistoryFromSheets } from '../spreadsheetService';
import { Pegawai, Pengembangan, KGB, Kegiatan, AbsensiRecord } from '../types';
import { useAuth } from '../AuthContext';
import { UNIT_KERJA, normalizeUnitName } from '../constants';
import * as XLSX from 'xlsx';
import CalendarView from '../components/CalendarView';

const StatsCard = ({ title, value, icon, color, loading, subtext }: { title: string, value: string | number, icon: string, color: string, loading?: boolean, subtext?: string }) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center space-x-3 md:space-x-4 hover:shadow-xl transition-all duration-300 group">
    <div className={`h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-110 ${color}`}>
      <i className={`bi ${icon} text-lg md:text-2xl`}></i>
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[7px] md:text-[9px] text-gray-400 font-black tracking-[0.1em] md:tracking-[0.2em] truncate mb-0.5 md:mb-1 uppercase">{title}</p>
      {loading ? (
        <div className="h-5 md:h-6 w-12 md:w-16 bg-gray-100 animate-pulse rounded-lg"></div>
      ) : (
        <div className="flex items-baseline gap-1 md:gap-2">
           <h3 className="text-base md:text-2xl font-black text-gray-950 tracking-tighter leading-none">{value}</h3>
           {subtext && <span className="text-[8px] md:text-[9px] font-bold text-gray-400">{subtext}</span>}
        </div>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { user, logActivity } = useAuth();
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [todayAbsensi, setTodayAbsensi] = useState<AbsensiRecord[]>([]);
  const [riwayatBangkom, setRiwayatBangkom] = useState<Pengembangan[]>([]);
  const [riwayatKgb, setRiwayatKgb] = useState<KGB[]>([]);
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'pensiun' | 'kgb' | 'pangkat' | 'satya' | 'bangkom'>('pensiun');
  const [selectedMonth, setSelectedMonth] = useState<string>('Semua');

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [selectedCalendarEvents, setSelectedCalendarEvents] = useState<Kegiatan[]>([]);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const [filterUnit, setFilterUnit] = useState('Semua Unit');
  const [filterJenisMatrix, setFilterJenisMatrix] = useState<string[]>([]); // Ubah ke Array untuk Multi-select
  const [searchJabatan, setSearchJabatan] = useState('');

  const [filterJenisEdu, setFilterJenisEdu] = useState('Semua Jenis');
  const [filterJenisGender, setFilterJenisGender] = useState('Semua Jenis');
  const [filterJenisGrade, setFilterJenisGrade] = useState('Semua Jenis');

  useEffect(() => { 
    if (user) loadDashboardData(); 
  }, [user?.nip]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [pegData, bangkomData, kgbData, kegiatanData, absensiData] = await Promise.all([
        fetchPegawaiFromSheets(),
        fetchPengembanganFromSheets(),
        fetchKGBFromSheets(),
        fetchKegiatanFromSheets(),
        user?.nip ? fetchAbsensiHistoryFromSheets(user.nip) : Promise.resolve([])
      ]);
      setPegawai(Array.isArray(pegData) ? pegData : []);
      setRiwayatBangkom(Array.isArray(bangkomData) ? bangkomData : []);
      setRiwayatKgb(Array.isArray(kgbData) ? kgbData : []);
      setKegiatan(Array.isArray(kegiatanData) ? kegiatanData : []);
      setTodayAbsensi(absensiData || []);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const activePegawaiList = useMemo(() => {
    return pegawai.filter(p => {
      const s = (p.status || 'Aktif').trim().toUpperCase();
      // Only include truly active statuses: "AKTIF" and "TUGAS BELAJAR"
      // Exclude "TIDAK AKTIF" and "PENSIUN" as requested
      return s === 'AKTIF' || s === 'TUGAS BELAJAR';
    });
  }, [pegawai]);

  const unitDistribution = useMemo(() => {
    return UNIT_KERJA.map(unit => {
      const perUnit = activePegawaiList.filter(p => normalizeUnitName(p.unitKerja) === unit);
      return {
        unit,
        pns: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase().trim() === 'PNS').length,
        cpns: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase().trim().includes('CPNS')).length,
        // PPPK here should only count Full Time (Exclude Paruh Waktu for accurate sebaran)
        pppk: perUnit.filter(p => {
          const jen = (p.jenisPegawai || '').toUpperCase();
          return jen.includes('PPPK') && !jen.includes('PARUH');
        }).length,
        pppkParuh: perUnit.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PARUH')).length,
        total: perUnit.length
      };
    }).sort((a, b) => b.total - a.total);
  }, [activePegawaiList]);

  const matrixJabatan = useMemo(() => {
    let list = activePegawaiList;
    
    // Filter Multi-select Jenis Pegawai
    if (filterJenisMatrix.length > 0) {
        list = list.filter(p => {
            const jen = (p.jenisPegawai || '').toUpperCase();
            return filterJenisMatrix.some(f => {
                if (f === 'PPPK_PARUH') return jen.includes('PARUH');
                return jen === f;
            });
        });
    }

    if (filterUnit !== 'Semua Unit') {
      list = list.filter(p => normalizeUnitName(p.unitKerja) === filterUnit);
    }
    
    const groups: Record<string, { total: number, klasifikasi: string, jabatan: string, jenis: string }> = {};
    
    list.forEach(p => {
      const jab = (p.jabatan || 'TANPA JABATAN').trim().toUpperCase();
      const jen = (p.jenisPegawai || 'ASN').trim().toUpperCase();
      
      // Improved Classification Logic
      let klas = (p.klasifikasiJabatan || '').trim().toUpperCase();
      if (!klas || klas === 'LAINNYA') {
        if (jab.includes('AHLI') || jab.includes('TERAMPIL') || jab.includes('MAHIR') || jab.includes('PENYELIA')) klas = 'FUNGSIONAL';
        else if (jab.includes('DIREKTUR') || jab.includes('KEPALA') || jab.includes('SEKRETARIS')) {
            if (jab.includes('BIRO') || jab.includes('DIREKTORAT') || jab.includes('DITJEN')) klas = 'JPT';
            else if (jab.includes('BAGIAN') || jab.includes('SUBDIREKTORAT')) klas = 'ADMINISTRATOR';
            else klas = 'PENGAWAS';
        }
        else if (jab.includes('PENGADMINISTRASI') || jab.includes('PENGOLAH') || jab.includes('PENYUSUN') || jab.includes('PETUGAS')) klas = 'PELAKSANA';
        else klas = 'LAINNYA';
      }
      
      const key = `${jab}|${jen}|${klas}`;

      if (!groups[key]) {
        groups[key] = { total: 0, klasifikasi: klas, jabatan: jab, jenis: jen };
      }
      groups[key].total += 1;
    });

    const term = searchJabatan.toUpperCase().trim();
    return Object.values(groups)
      .filter(item => 
        item.jabatan.includes(term) || 
        item.klasifikasi.includes(term) // Sekarang bisa cari berdasarkan klasifikasi
      )
      .sort((a, b) => b.total - a.total);
  }, [activePegawaiList, filterUnit, filterJenisMatrix, searchJabatan]);

  const toggleFilterJenis = (val: string) => {
    setFilterJenisMatrix(prev => 
      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
    );
  };

  const genderStats = useMemo(() => {
    const filteredList = activePegawaiList.filter(p => {
        if (filterJenisGender === 'Semua Jenis') return true;
        const jen = (p.jenisPegawai || '').toUpperCase();
        const target = filterJenisGender.toUpperCase();
        if (target === 'PPPK') return jen.includes('PPPK');
        if (target === 'PNS') return jen === 'PNS';
        return jen.includes(target);
    });
    return { pria: filteredList.filter(p => p.gender === 'L').length, wanita: filteredList.filter(p => p.gender === 'P').length };
  }, [activePegawaiList, filterJenisGender]);

  const educationStats = useMemo(() => {
    const filteredList = activePegawaiList.filter(p => {
        if (filterJenisEdu === 'Semua Jenis') return true;
        const jen = (p.jenisPegawai || '').toUpperCase();
        const target = filterJenisEdu.toUpperCase();
        if (target === 'PPPK') return jen.includes('PPPK');
        if (target === 'PNS') return jen === 'PNS';
        return jen.includes(target);
    });
    const eduMap: Record<string, number> = {};
    filteredList.forEach(p => {
      let edu = 'LAINNYA';
      const pStr = (p.pendidikan || '').toUpperCase().trim();
      if (pStr.includes('S3') || pStr.includes('DOKTOR')) edu = 'S3 (DOKTOR)';
      else if (pStr.includes('S2') || pStr.includes('MAGISTER')) edu = 'S2 (MAGISTER)';
      else if (pStr.includes('S1') || pStr.includes('SARJANA')) edu = 'S1 (SARJANA)';
      else if (pStr.includes('DIV') || pStr.includes('D-IV')) edu = 'D-IV / SARJANA TERAPAN';
      else if (pStr.includes('DIII') || pStr.includes('D3') || pStr.includes('D-III')) edu = 'D-III';
      else if (pStr.includes('SMA') || pStr.includes('SMK') || pStr.includes('SLTA')) edu = 'SMA / SEDERAJAT';
      else if (pStr.includes('SMP') || pStr.includes('SLTP')) edu = 'SMP / SEDERAJAT';
      else if (pStr !== '') edu = pStr;
      eduMap[edu] = (eduMap[edu] || 0) + 1;
    });
    return Object.entries(eduMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [activePegawaiList, filterJenisEdu]);

  const gradeStats = useMemo(() => {
    const filteredList = activePegawaiList.filter(p => {
        if (filterJenisGrade === 'Semua Jenis') return true;
        const jen = (p.jenisPegawai || '').toUpperCase();
        const target = filterJenisGrade.toUpperCase();
        if (target === 'PPPK') return jen.includes('PPPK');
        if (target === 'PNS') return jen === 'PNS';
        return jen.includes(target);
    });
    const gradeMap: Record<string, number> = {};
    filteredList.forEach(p => {
      const g = (p.golRuang || 'LAINNYA').trim().toUpperCase();
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });
    return Object.entries(gradeMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.label.localeCompare(a.label));
  }, [activePegawaiList, filterJenisGrade]);

  const reminders = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const listKGB: any[] = [];
    const listPangkat: any[] = [];
    const listPensiun: any[] = [];
    const listSatya: any[] = [];
    const listBangkom: any[] = [];

    activePegawaiList.forEach(p => {
      const ret = getRetirementDetails(p.nip || '', p.jabatan || '');
      
      // Filter by Month if selected
      const checkMonth = (dateStr: string | undefined) => {
        if (selectedMonth === 'Semua') return true;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            // Try parsing manually if Date fails (e.g. DD-MM-YYYY)
            const parts = dateStr.split(/[-/]/);
            if (parts.length === 3) {
                const m = parts[0].length === 4 ? parseInt(parts[1]) : parseInt(parts[1]);
                return m === parseInt(selectedMonth);
            }
            return false;
        }
        return (d.getMonth() + 1) === parseInt(selectedMonth);
      };

      if (ret && ret.tmtPensiun && ret.tmtPensiun.getFullYear() === currentYear) {
        if (selectedMonth === 'Semua' || (ret.tmtPensiun.getMonth() + 1) === parseInt(selectedMonth)) {
            listPensiun.push({ nama: p.nama, nip: p.nip, tmt: ret.tmtPensiun.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), sisa: ret.sisaMasaKerja });
        }
      }
      const anchorDate = p.tmtPangkat || p.tmtCpns;
      if (anchorDate) {
        const tmtParts = String(anchorDate).split(/[-/]/);
        if (tmtParts.length === 3) {
            const tmtYear = tmtParts[0].length === 4 ? parseInt(tmtParts[0]) : parseInt(tmtParts[2]);
            const tmtMonth = tmtParts[0].length === 4 ? parseInt(tmtParts[1]) : parseInt(tmtParts[1]);
            const diffYears = currentYear - tmtYear;
            if (diffYears > 0 && diffYears % 2 === 0) {
                if (selectedMonth === 'Semua' || tmtMonth === parseInt(selectedMonth)) {
                    const sudahDiproses = riwayatKgb.some(k => k.nip === p.nip && k.tmtBaru && k.tmtBaru.includes(currentYear.toString()));
                    if (!sudahDiproses) {
                        listKGB.push({ nama: p.nama, nip: p.nip, tmtTerakhir: anchorDate, keterangan: `Jadwal KGB Tahun ${currentYear}` });
                    }
                }
            }
        }
      }
      if (p.tmtPangkat && (p.jenisPegawai||'').toUpperCase() === 'PNS') {
        const tmtParts = String(p.tmtPangkat).split(/[-/]/);
        if (tmtParts.length === 3) {
            const tmtYear = tmtParts[0].length === 4 ? parseInt(tmtParts[0]) : parseInt(tmtParts[2]);
            const tmtMonth = tmtParts[0].length === 4 ? parseInt(tmtParts[1]) : parseInt(tmtParts[1]);
            const diffYears = currentYear - tmtYear;
            if (diffYears > 0 && diffYears % 4 === 0) {
                if (selectedMonth === 'Semua' || tmtMonth === parseInt(selectedMonth)) {
                    listPangkat.push({ nama: p.nama, nip: p.nip, tmtTerakhir: p.tmtPangkat, keterangan: `Jadwal KP Tahun ${currentYear}` });
                }
            }
        }
      }
      const cleanNip = String(p.nip || '').replace(/\D/g, '');
      if (cleanNip.length >= 12) {
        const cpnsYear = parseInt(cleanNip.substring(8, 12));
        const cpnsMonth = parseInt(cleanNip.substring(12, 14));
        const workingYears = currentYear - cpnsYear;
        if ([10, 20, 30].includes(workingYears)) {
           if (selectedMonth === 'Semua' || cpnsMonth === parseInt(selectedMonth)) {
               listSatya.push({ nama: p.nama, nip: p.nip, tahun: workingYears, pengabdian: `Masa Kerja ${workingYears} Thn` });
           }
        }
      }
      const perUserBangkom = riwayatBangkom.filter(r => r.nip === p.nip && Number(r.tahun) === currentYear);
      const totalJp = perUserBangkom.reduce((acc, curr) => acc + (Number(curr.jumlahJpl) || 0), 0);
      const isPPPK = (p.jenisPegawai || '').toUpperCase().includes('PPPK');
      const targetJp = isPPPK ? 24 : 20;
      if (totalJp < targetJp) {
        listBangkom.push({ nama: p.nama, nip: p.nip, currentJp: totalJp, targetJp: targetJp, keterangan: `Kurang ${targetJp - totalJp} JP`, status: isPPPK ? 'PPPK' : 'PNS' });
      }
    });
    return { kgb: listKGB, pangkat: listPangkat, pensiun: listPensiun, satya: listSatya, bangkom: listBangkom };
  }, [activePegawaiList, riwayatBangkom, riwayatKgb, selectedMonth]);

  const totalNotifCount = reminders.kgb.length + reminders.pangkat.length + reminders.pensiun.length + reminders.satya.length + reminders.bangkom.length;

  const handleDownloadFullAnalytics = () => {
    const wb = XLSX.utils.book_new();
    
    // 1. Sebaran Unit
    const unitWs = XLSX.utils.json_to_sheet(unitDistribution.map(u => ({ 
      'Unit Kerja Pengampu': u.unit, 
      'PNS': u.pns, 'CPNS': u.cpns, 'PPPK': u.pppk, 'PPPK Paruh Waktu': u.pppkParuh, 'Total ASN': u.total 
    })));
    XLSX.utils.book_append_sheet(wb, unitWs, "Sebaran Unit");

    // 2. Statistik Gender
    const genderWs = XLSX.utils.json_to_sheet([
        { 'Kategori': 'Laki-laki', 'Jumlah': genderStats.pria },
        { 'Kategori': 'Perempuan', 'Jumlah': genderStats.wanita },
        { 'Kategori': 'Total', 'Jumlah': genderStats.pria + genderStats.wanita }
    ]);
    XLSX.utils.book_append_sheet(wb, genderWs, "Statistik Gender");

    // 3. Statistik Pendidikan
    const eduWs = XLSX.utils.json_to_sheet(educationStats.map(e => ({
        'Jenjang Pendidikan': e.label,
        'Jumlah ASN': e.count
    })));
    XLSX.utils.book_append_sheet(wb, eduWs, "Statistik Pendidikan");

    // 4. Sebaran Golongan
    const gradeWs = XLSX.utils.json_to_sheet(gradeStats.map(g => ({
        'Golongan / Ruang': g.label,
        'Jumlah ASN': g.count
    })));
    XLSX.utils.book_append_sheet(wb, gradeWs, "Sebaran Golongan");

    // 5. Matriks Jabatan (Summary)
    const jabWs = XLSX.utils.json_to_sheet(matrixJabatan.map(j => ({
        'Nama Jabatan': j.jabatan,
        'Klasifikasi': j.klasifikasi,
        'Jenis Pegawai': j.jenis,
        'Total ASN': j.total
    })));
    XLSX.utils.book_append_sheet(wb, jabWs, "Matriks Jabatan");

    XLSX.writeFile(wb, `PortalSDM_Full_Analytics_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Dashboard', 'Download Full Analytics Statistics');
  };

  const handleExportJabatan = () => {
    const wb = XLSX.utils.book_new();
    
    // Apply Global Filters
    let listForExport = activePegawaiList;
    if (filterJenisMatrix.length > 0) {
        listForExport = listForExport.filter(p => {
            const jen = (p.jenisPegawai || '').toUpperCase();
            return filterJenisMatrix.some(f => {
                if (f === 'PPPK_PARUH') return jen.includes('PARUH');
                return jen === f;
            });
        });
    }
    if (filterUnit !== 'Semua Unit') {
      listForExport = listForExport.filter(p => normalizeUnitName(p.unitKerja) === filterUnit);
    }

    // Helper for Kelas Jabatan (Permenkum 38/2025 Placeholder Logic)
    const getKelasJabatan = (p: Pegawai) => {
        if (p.kelasJabatan) return p.kelasJabatan;
        const jab = (p.jabatan || '').toUpperCase();
        const eselon = (p.eselon || '').toUpperCase();
        
        // JPT
        if (eselon === 'I.A') return '17';
        if (eselon === 'I.B') return '16';
        if (eselon === 'II.A') return '15';
        if (eselon === 'II.B') return '14';
        
        // Administrator / Pengawas
        if (eselon === 'III.A') return '12';
        if (eselon === 'III.B') return '11';
        if (eselon === 'IV.A') return '9';
        if (eselon === 'IV.B') return '8';

        // Fungsional
        if (jab.includes('AHLI UTAMA')) return '14';
        if (jab.includes('AHLI MADYA')) return '12';
        if (jab.includes('AHLI MUDA')) return '9';
        if (jab.includes('AHLI PERTAMA')) return '8';
        
        if (jab.includes('PENYELIA')) return '8';
        if (jab.includes('MAHIR')) return '7';
        if (jab.includes('TERAMPIL')) return '6';
        if (jab.includes('PEMULA')) return '5';

        // Pelaksana
        if (p.golRuang?.startsWith('IV')) return '9';
        if (p.golRuang?.startsWith('III')) return '7';
        if (p.golRuang?.startsWith('II')) return '5';
        
        return '-';
    };

    const getGroupedData = (list: Pegawai[]) => {
      const groups: Record<string, { total: number, klasifikasi: string, jabatan: string, jenis: string, unitKerja: string, kelasJabatan: string }> = {};
      const term = searchJabatan.toUpperCase().trim();

      list.forEach(p => {
        const jab = (p.jabatan || 'TANPA JABATAN').trim().toUpperCase();
        const jen = (p.jenisPegawai || 'ASN').trim().toUpperCase();
        
        // Improved Classification Logic (same as matrixJabatan memo)
        let klas = (p.klasifikasiJabatan || '').trim().toUpperCase();
        if (!klas || klas === 'LAINNYA') {
          if (jab.includes('AHLI') || jab.includes('TERAMPIL') || jab.includes('MAHIR') || jab.includes('PENYELIA')) klas = 'FUNGSIONAL';
          else if (jab.includes('DIREKTUR') || jab.includes('KEPALA') || jab.includes('SEKRETARIS')) {
              if (jab.includes('BIRO') || jab.includes('DIREKTORAT') || jab.includes('DITJEN')) klas = 'JPT';
              else if (jab.includes('BAGIAN') || jab.includes('SUBDIREKTORAT')) klas = 'ADMINISTRATOR';
              else klas = 'PENGAWAS';
          }
          else if (jab.includes('PENGADMINISTRASI') || jab.includes('PENGOLAH') || jab.includes('PENYUSUN') || jab.includes('PETUGAS')) klas = 'PELAKSANA';
          else klas = 'LAINNYA';
        }

        // Filter by Search Term
        if (term && !jab.includes(term) && !klas.includes(term)) return;

        const unit = normalizeUnitName(p.unitKerja);
        const kelas = getKelasJabatan(p);
        const key = `${jab}|${jen}|${klas}|${unit}|${kelas}`;
        if (!groups[key]) {
          groups[key] = { total: 0, klasifikasi: klas, jabatan: jab, jenis: jen, unitKerja: unit, kelasJabatan: kelas };
        }
        groups[key].total += 1;
      });
      return Object.values(groups).sort((a, b) => {
        const u = a.unitKerja.localeCompare(b.unitKerja);
        return u !== 0 ? u : b.total - a.total;
      });
    };

    // 1. Sheet "Semua Unit"
    const allGrouped = getGroupedData(listForExport);
    const wsAll = XLSX.utils.json_to_sheet(allGrouped.map((j, i) => ({
      'No': i + 1,
      'Nama Jabatan': j.jabatan,
      'Unit Kerja': j.unitKerja,
      'Klasifikasi': j.klasifikasi,
      'Kelas Jabatan (Permenkum 38/2025)': j.kelasJabatan,
      'Jenis Pegawai': j.jenis,
      'Total': j.total
    })));
    XLSX.utils.book_append_sheet(wb, wsAll, "Semua Unit");

    // 2. Individual Sheets for each Unit (Filtered)
    UNIT_KERJA.forEach(unitName => {
      const unitData = listForExport.filter(p => normalizeUnitName(p.unitKerja) === unitName);
      if (unitData.length === 0) return; // Skip if no data for this unit after filtering

      const groupedUnit = getGroupedData(unitData);
      const wsUnit = XLSX.utils.json_to_sheet(groupedUnit.map((j, i) => ({
        'No': i + 1,
        'Nama Jabatan': j.jabatan,
        'Unit Kerja': j.unitKerja,
        'Klasifikasi': j.klasifikasi,
        'Kelas Jabatan (Permenkum 38/2025)': j.kelasJabatan,
        'Jenis Pegawai': j.jenis,
        'Total': j.total
      })));
      
      // Shorten sheet name for Excel (max 31 chars)
      let sName = unitName;
      if (sName.includes('Sekretariat')) sName = 'Sekretariat';
      else if (sName.includes('Hak Cipta')) sName = 'Hak Cipta';
      else if (sName.includes('Paten')) sName = 'Paten';
      else if (sName.includes('Merek')) sName = 'Merek';
      else if (sName.includes('Kerja Sama')) sName = 'Kerja Sama';
      else if (sName.includes('Teknologi Informasi')) sName = 'TI';
      else if (sName.includes('Penegakan Hukum')) sName = 'Penegakan Hukum';
      else sName = sName.substring(0, 31);

      XLSX.utils.book_append_sheet(wb, wsUnit, sName);
    });

    XLSX.writeFile(wb, `Matriks_Jabatan_DJKI_Filtered_${new Date().getTime()}.xlsx`);
    logActivity('DOWNLOAD', 'Dashboard', 'Export Excel Matriks Jabatan (Filtered)');
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div className="w-full md:w-auto">
          <h3 className="text-xl md:text-3xl font-black text-gray-950 tracking-tighter leading-none">Intelligence Hub DJKI</h3>
          <p className="text-[9px] md:text-[10px] text-gray-400 font-bold tracking-[0.2em] md:tracking-[0.3em] mt-2 md:mt-3 flex items-center gap-2 md:gap-3">
             <i className="bi bi-cpu-fill text-blue-600"></i> Real-time Analytics Dashboard
          </p>
        </div>
        <div className="flex gap-2 md:gap-3 w-full md:w-auto">
          <button onClick={handleDownloadFullAnalytics} className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 bg-emerald-600 p-3 md:p-4 px-4 md:px-8 rounded-xl md:rounded-2xl text-white text-[9px] md:text-[10px] font-black tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
             <i className="bi bi-file-earmark-spreadsheet-fill text-base md:text-lg"></i> 
             <span className="hidden xs:inline">Download Stats</span>
             <span className="xs:hidden">Stats</span>
          </button>
          <button onClick={() => setIsNotifOpen(true)} className="relative flex items-center justify-center gap-2 md:gap-4 bg-white p-3 md:p-4 px-4 md:px-8 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all group">
             <i className="bi bi-bell-fill text-lg md:text-xl text-blue-600 group-hover:animate-swing"></i>
             {totalNotifCount > 0 && (
               <span className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 h-5 w-5 md:h-6 md:w-6 bg-rose-600 text-white text-[9px] md:text-[10px] font-black rounded-full flex items-center justify-center border-2 md:border-4 border-[#F8F9FC] animate-bounce">
                  {totalNotifCount}
               </span>
             )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <StatsCard title="Total ASN Aktif" value={activePegawaiList.length} icon="bi-people-fill" color="bg-blue-600" loading={loading} />
        <StatsCard title="Total PNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase().trim() === 'PNS').length} icon="bi-person-vcard" color="bg-indigo-600" loading={loading} />
        <StatsCard title="Total CPNS" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase().trim().includes('CPNS')).length} icon="bi-person-plus" color="bg-cyan-600" loading={loading} />
        <StatsCard title="Total PPPK" value={activePegawaiList.filter(p => (p.jenisPegawai || '').toUpperCase().includes('PPPK')).length} icon="bi-person-check" color="bg-sky-600" loading={loading} />
        <StatsCard title="PPPK Paruh Waktu" value={activePegawaiList.filter(p => (p.jenisPegawai||'').toUpperCase().includes('PARUH')).length} icon="bi-person-gear" color="bg-rose-600" loading={loading} />
      </div>

      <div className="bg-white p-4 md:p-10 rounded-2xl md:rounded-[3.5rem] border border-gray-100 shadow-sm overflow-hidden">
         <div className="mb-4 md:mb-10">
            <h4 className="text-[9px] md:text-[12px] font-black text-gray-950 tracking-[0.2em] md:tracking-[0.3em] uppercase">Sebaran Pegawai Aktif per Unit Kerja</h4>
         </div>
         <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead className="bg-gray-50 text-[7px] md:text-[8px] font-black text-gray-400 border-b">
                  <tr>
                     <th className="px-4 md:px-10 py-3 md:py-6 border-b">Unit Kerja</th>
                     <th className="px-2 md:px-4 py-3 md:py-6 border-b text-center">PNS</th>
                     <th className="px-2 md:px-4 py-3 md:py-6 border-b text-center">CPNS</th>
                     <th className="px-2 md:px-4 py-3 md:py-6 border-b text-center">PPPK</th>
                     <th className="px-2 md:px-4 py-3 md:py-6 border-b text-center bg-rose-50 text-rose-600">PARUH</th>
                     <th className="px-4 md:px-6 py-3 md:py-6 border-b text-right bg-blue-50 text-blue-600 font-black">Total</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {unitDistribution.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                       <td className="px-4 md:px-10 py-3 md:py-5 font-black text-[8px] md:text-[10px] text-gray-800 leading-tight">{row.unit}</td>
                       <td className="px-2 md:px-4 py-3 md:py-5 text-center font-bold text-gray-600 text-[9px] md:text-base">{row.pns}</td>
                       <td className="px-2 md:px-4 py-3 md:py-5 text-center font-bold text-gray-600 text-[9px] md:text-base">{row.cpns}</td>
                       <td className="px-2 md:px-4 py-3 md:py-5 text-center font-bold text-gray-600 text-[9px] md:text-base">{row.pppk}</td>
                       <td className="px-2 md:px-4 py-3 md:py-5 text-center font-black text-rose-600 bg-rose-50/20 text-[9px] md:text-base">{row.pppkParuh}</td>
                       <td className="px-4 md:px-6 py-3 md:py-5 text-right font-black text-[9px] md:text-[12px] text-blue-600 bg-blue-50/20">{row.total}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
           {/* STATISTIK GENDER */}
           <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <h4 className="text-[10px] md:text-[12px] font-black text-gray-950 tracking-[0.2em] md:tracking-[0.3em] uppercase">Statistik Gender</h4>
                 <select className="w-full sm:w-auto px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black outline-none focus:border-blue-600 transition-all" value={filterJenisGender} onChange={e => setFilterJenisGender(e.target.value)}>
                    <option value="Semua Jenis">Semua Jenis</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                 <div className="p-4 md:p-6 bg-sky-50 rounded-2xl md:rounded-3xl border border-sky-100">
                    <p className="text-[8px] md:text-[9px] font-black text-sky-600 tracking-widest mb-1 uppercase">Laki-laki</p>
                    <h5 className="text-2xl md:text-3xl font-black text-sky-900">{genderStats.pria}</h5>
                 </div>
                 <div className="p-4 md:p-6 bg-pink-50 rounded-2xl md:rounded-3xl border border-pink-100">
                    <p className="text-[8px] md:text-[9px] font-black text-pink-600 tracking-widest mb-1 uppercase">Perempuan</p>
                    <h5 className="text-2xl md:text-3xl font-black text-pink-900">{genderStats.wanita}</h5>
                 </div>
              </div>
           </div>
           
           {/* STATISTIK PENDIDIKAN */}
           <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <h4 className="text-[10px] md:text-[12px] font-black text-gray-950 tracking-[0.2em] md:tracking-[0.3em] uppercase">Statistik Pendidikan</h4>
                 <select className="w-full sm:w-auto px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black outline-none focus:border-blue-600 transition-all" value={filterJenisEdu} onChange={e => setFilterJenisEdu(e.target.value)}>
                    <option value="Semua Jenis">Semua Jenis</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                 </select>
              </div>
              <div className="space-y-2 md:space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                 {educationStats.map((edu, i) => (
                    <div key={i} className="flex justify-between items-center p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl hover:bg-blue-50 transition-colors group">
                       <span className="text-[9px] md:text-[10px] font-black text-gray-600 group-hover:text-blue-600 transition-colors uppercase">{edu.label}</span>
                       <span className="text-[11px] md:text-[12px] font-black text-gray-950">{edu.count} ASN</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* SEBARAN GOLONGAN */}
           <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <h4 className="text-[10px] md:text-[12px] font-black text-gray-950 tracking-[0.2em] md:tracking-[0.3em] uppercase">Sebaran Golongan</h4>
                 <select className="w-full sm:w-auto px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black outline-none focus:border-blue-600 transition-all" value={filterJenisGrade} onChange={e => setFilterJenisGrade(e.target.value)}>
                    <option value="Semua Jenis">Semua Jenis</option>
                    <option value="PNS">PNS</option>
                    <option value="CPNS">CPNS</option>
                    <option value="PPPK">PPPK</option>
                 </select>
              </div>
              <div className="overflow-x-auto max-h-[400px] custom-scrollbar border border-gray-50 rounded-2xl md:rounded-3xl">
                <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="sticky top-0 bg-gray-50 z-20 text-[8px] font-black text-gray-400">
                        <tr>
                            <th className="px-6 md:px-8 py-4 md:py-5 border-b">Golongan / Ruang</th>
                            <th className="px-4 md:px-6 py-4 md:py-5 text-right border-b text-blue-600">Total ASN</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {gradeStats.map((grade, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 md:px-8 py-3 md:py-4 font-black text-[9px] md:text-[10px] text-gray-800">{grade.label}</td>
                                <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-[11px] md:text-[12px] text-gray-950">{grade.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
           </div>
        </div>

        {/* MATRIKS JABATAN */}
        <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
           <div className="flex flex-col mb-6 md:mb-10 gap-4 md:gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h4 className="text-[9px] md:text-[12px] font-black text-gray-950 tracking-[0.2em] md:tracking-[0.3em] uppercase">Matriks Nomenklatur Jabatan</h4>
                    <p className="text-[7px] md:text-[8px] text-gray-400 font-bold mt-1 tracking-widest text-blue-600 uppercase">Total Sebaran Nomenklatur Jabatan Terpusat</p>
                 </div>
                 <button onClick={handleExportJabatan} className="w-full sm:w-auto px-6 py-2.5 bg-[#111827] text-white rounded-xl text-[8px] font-black shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95">
                    <i className="bi bi-file-earmark-spreadsheet text-sm"></i>
                    Export Excel
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 ml-2 tracking-widest uppercase">Unit Kerja</label>
                    <select className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black outline-none focus:border-blue-600" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
                       <option>Semua Unit</option>
                       {UNIT_KERJA.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-gray-400 ml-2 tracking-widest uppercase">Cari Jabatan / Klasifikasi</label>
                    <div className="relative">
                       <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                       <input type="text" placeholder="MISAL: FUNGSIONAL, PELAKSANA, PENYELIA..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black outline-none focus:border-blue-600" value={searchJabatan} onChange={e => setSearchJabatan(e.target.value)} />
                    </div>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-gray-400 ml-2 tracking-widest block uppercase">Filter Multi-Jenis Pegawai</label>
                 <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {[
                      { id: 'PNS', label: 'PNS' },
                      { id: 'CPNS', label: 'CPNS' },
                      { id: 'PPPK', label: 'PPPK' },
                      { id: 'PPPK_PARUH', label: 'PPPK Paruh Waktu' }
                    ].map(btn => (
                      <button 
                        key={btn.id} 
                        onClick={() => toggleFilterJenis(btn.id)}
                        className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[7px] md:text-[8px] font-black transition-all border flex items-center gap-1.5 md:gap-2 ${
                          filterJenisMatrix.includes(btn.id) 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-gray-400 border-gray-100 hover:border-blue-200'
                        }`}
                      >
                        {filterJenisMatrix.includes(btn.id) && <i className="bi bi-check-circle-fill"></i>}
                        {btn.label}
                      </button>
                    ))}
                    {filterJenisMatrix.length > 0 && (
                      <button onClick={() => setFilterJenisMatrix([])} className="px-2 py-1.5 text-[7px] md:text-[8px] font-black text-rose-500 hover:underline flex items-center gap-1">
                        <i className="bi bi-x-circle"></i> Reset
                      </button>
                    )}
                 </div>
              </div>
           </div>
           <div className="overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6 max-h-[600px] md:max-h-[820px] flex-1 custom-scrollbar border border-gray-50 rounded-2xl md:rounded-3xl">
              <table className="w-full text-left border-collapse min-w-[600px]">
                 <thead className="sticky top-0 bg-white z-20 shadow-sm text-[7px] md:text-[8px] font-black text-gray-400">
                    <tr>
                       <th className="px-4 md:px-10 py-3 md:py-6 border-b">Nama Nomenklatur Jabatan</th>
                       <th className="px-2 md:px-4 py-3 md:py-6 border-b text-center">Klasifikasi</th>
                       <th className="px-2 md:px-4 py-3 md:py-6 border-b text-center">Jenis Pegawai</th>
                       <th className="px-4 md:px-6 py-3 md:py-6 text-right border-b text-blue-600">Total ASN</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {matrixJabatan.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                         <td className="px-4 md:px-10 py-3 md:py-4 font-bold text-[8px] md:text-[10px] text-gray-800 leading-tight">{row.jabatan}</td>
                         <td className="px-2 md:px-4 py-3 md:py-4 text-center">
                            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[6px] md:text-[8px] font-black border ${
                              row.klasifikasi === 'FUNGSIONAL' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              row.klasifikasi === 'PELAKSANA' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              row.klasifikasi === 'JPT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              row.klasifikasi === 'ADMINISTRATOR' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              row.klasifikasi === 'PENGAWAS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              row.klasifikasi === 'JPT / ADM' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              row.klasifikasi === 'ADM' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-gray-50 text-gray-400 border-gray-100'
                            }`}>
                              {row.klasifikasi}
                            </span>
                         </td>
                         <td className="px-2 md:px-4 py-3 md:py-4 text-center">
                            <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[6px] md:text-[8px] font-black border ${
                              row.jenis === 'PNS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              row.jenis === 'PPPK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              row.jenis === 'CPNS' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                              'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                               {row.jenis}
                            </span>
                         </td>
                         <td className="px-4 md:px-6 py-3 md:py-4 text-right font-black text-[9px] md:text-[12px] text-gray-950">{row.total}</td>
                      </tr>
                    ))}
                    {matrixJabatan.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center opacity-30">
                          <i className="bi bi-search text-5xl mb-4 block"></i>
                          <p className="text-[10px] font-black tracking-widest">Data tidak ditemukan dengan filter saat ini</p>
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      <div className="relative">
         <div className="absolute top-8 right-32 z-10 hidden md:block">
            <p className="text-[9px] font-bold text-gray-400 tracking-[0.3em]">Jadwal Direktorat Terintegrasi</p>
         </div>
         <div className="absolute top-6 right-8 z-10 hidden md:block">
            <a href="#/kegiatan" className="px-6 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
               <i className="bi bi-gear-fill"></i>
               Kelola
            </a>
         </div>
         <CalendarView 
            events={kegiatan} 
            onDateClick={(date, evs) => {
              setSelectedCalendarDate(date);
              setSelectedCalendarEvents(evs);
              setIsCalendarModalOpen(true);
            }}
          />
      </div>

      {user && (
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
               <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <i className="bi bi-fingerprint text-2xl"></i>
               </div>
               <div>
                  <h4 className="text-sm font-black text-gray-950 uppercase tracking-widest">Status Presensi Anda</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
               </div>
            </div>
            <div className="flex gap-4">
               <div className={`flex-1 p-4 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 ${todayAbsensi.find(a => a.tipe === 'MASUK') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-transparent text-gray-400 opacity-60'}`}>
                  <i className={`bi ${todayAbsensi.find(a => a.tipe === 'MASUK') ? 'bi-check-circle-fill' : 'bi-dash-circle'} text-2xl`}></i>
                  <p className="text-[9px] font-black uppercase tracking-widest">MASUK</p>
                  {todayAbsensi.find(a => a.tipe === 'MASUK') && <p className="text-sm font-black">{todayAbsensi.find(a => a.tipe === 'MASUK')?.waktu}</p>}
               </div>
               <div className={`flex-1 p-4 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 ${todayAbsensi.find(a => a.tipe === 'PULANG') ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-gray-50 border-transparent text-gray-400 opacity-60'}`}>
                  <i className={`bi ${todayAbsensi.find(a => a.tipe === 'PULANG') ? 'bi-check-circle-fill' : 'bi-dash-circle'} text-2xl`}></i>
                  <p className="text-[9px] font-black uppercase tracking-widest">PULANG</p>
                  {todayAbsensi.find(a => a.tipe === 'PULANG') && <p className="text-sm font-black">{todayAbsensi.find(a => a.tipe === 'PULANG')?.waktu}</p>}
               </div>
            </div>
            <a href="#/absensi" className="mt-8 py-4 bg-gray-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center shadow-xl shadow-gray-950/20 active:scale-95 transition-all">
              Lakukan Presensi Biometrik
            </a>
        </div>
      )}

      {/* CALENDAR DETAIL MODAL */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsCalendarModalOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter max-h-[90vh] mt-auto sm:mt-0">
              <div className="p-6 md:p-10 bg-gray-50 border-b shrink-0 flex justify-between items-center">
                 <div>
                    <h4 className="text-xl md:text-2xl font-black text-gray-950 tracking-tighter">Agenda Direktorat</h4>
                    <p className="text-[9px] md:text-[10px] font-bold text-blue-600 tracking-widest mt-1.5 md:mt-2">
                       {selectedCalendarDate ? new Date(selectedCalendarDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </p>
                 </div>
                 <button onClick={() => setIsCalendarModalOpen(false)} className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                    <i className="bi bi-x-lg text-lg md:text-xl"></i>
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-6 bg-white">
                 {selectedCalendarEvents.length > 0 ? (
                    selectedCalendarEvents.map((ev, i) => (
                       <div key={i} className="p-6 md:p-8 bg-gray-50/50 border border-gray-100 rounded-[2rem] md:rounded-[2.5rem] space-y-4 md:space-y-6 hover:bg-blue-50/30 transition-all group">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                             <div className="flex-1">
                                <h5 className="text-lg md:text-xl font-black text-gray-950 leading-tight group-hover:text-blue-600 transition-colors uppercase">{ev.judulKegiatan}</h5>
                                <div className="flex flex-wrap gap-3 md:gap-4 mt-3 md:mt-4">
                                   <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-gray-400">
                                      <i className="bi bi-clock-fill text-blue-600"></i>
                                      {ev.jamMulai || '00:00'} - {ev.jamSelesai || 'Selesai'}
                                   </div>
                                   <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-gray-400">
                                      <i className="bi bi-geo-alt-fill text-rose-600"></i>
                                      {ev.tempat || 'TBA'}
                                   </div>
                                </div>
                             </div>
                             <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black border ${
                                ev.status === 'SELESAI' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                ev.status === 'BATAL' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-blue-50 text-blue-600 border-blue-100'
                             }`}>
                                {ev.status || 'TERJADWAL'}
                             </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 md:gap-4">
                             <div className="p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-gray-100">
                                <p className="text-[7px] md:text-[8px] font-black text-gray-400 tracking-widest mb-1 uppercase">Jumlah Peserta</p>
                                <p className="text-xs md:text-sm font-black text-gray-900">{ev.jumlahPeserta || 0} Orang</p>
                             </div>
                             <div className="p-3 md:p-4 bg-white rounded-xl md:rounded-2xl border border-gray-100">
                                <p className="text-[7px] md:text-[8px] font-black text-gray-400 tracking-widest mb-1 uppercase">Asal Peserta</p>
                                <p className="text-xs md:text-sm font-black text-gray-900 truncate">{ev.asalPeserta || '-'}</p>
                             </div>
                          </div>

                          {ev.laporanSingkat && (
                             <div className="space-y-1.5 md:space-y-2">
                                <p className="text-[7px] md:text-[8px] font-black text-gray-400 tracking-widest ml-2 uppercase">Laporan Singkat</p>
                                <div className="p-4 md:p-5 bg-white rounded-xl md:rounded-2xl border border-gray-100 text-[10px] md:text-[11px] text-gray-600 leading-relaxed italic">
                                   "{ev.laporanSingkat}"
                                </div>
                             </div>
                          )}

                          {ev.linkDriveFoto && (
                             <a href={ev.linkDriveFoto} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 md:gap-3 w-full py-3.5 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] uppercase">
                                <i className="bi bi-images text-base md:text-lg"></i>
                                Lihat Dokumentasi Foto
                             </a>
                          )}
                       </div>
                    ))
                 ) : (
                    <div className="py-20 text-center opacity-30">
                       <i className="bi bi-calendar-x text-6xl mb-4 block"></i>
                       <p className="text-[10px] font-black tracking-widest">Tidak ada agenda pada tanggal ini</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* NOTIFIKASI MODAL */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-center p-4 pt-[140px] pb-10">
           <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setIsNotifOpen(false)}></div>
           <div className="relative bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-modalEnter max-h-full mt-auto sm:mt-0">
              
              <div className="p-6 md:p-10 shrink-0 bg-gray-50/50 border-b relative z-50">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
                    <div>
                      <h4 className="text-xl md:text-2xl font-black text-gray-950 tracking-tighter">Personnel Monitoring</h4>
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-400 tracking-widest mt-1.5 md:mt-2 uppercase">Tindakan Administrasi Tahun {new Date().getFullYear()}</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                       <div className="flex-1 sm:flex-none relative">
                          <select 
                            className="w-full sm:w-40 px-4 py-2 bg-white border border-gray-200 rounded-xl text-[9px] font-black outline-none focus:border-blue-600 appearance-none pr-10 shadow-sm"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                          >
                             <option value="Semua">SEMUA BULAN</option>
                             {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, idx) => (
                                <option key={m} value={idx + 1}>{m.toUpperCase()}</option>
                             ))}
                          </select>
                          <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                       </div>
                       <button onClick={() => setIsNotifOpen(false)} className="h-10 w-10 md:h-12 md:w-12 flex items-center justify-center text-gray-400 hover:text-rose-500 bg-white border border-gray-100 rounded-xl md:rounded-2xl shadow-sm transition-all hover:shadow-md active:scale-95">
                          <i className="bi bi-x-lg text-lg md:text-xl"></i>
                       </button>
                    </div>
                 </div>
                 <div className="flex bg-gray-200 p-1 md:p-1.5 rounded-xl md:rounded-2xl overflow-x-auto no-scrollbar gap-1">
                    <button onClick={() => setNotifTab('pensiun')} className={`flex-1 min-w-[80px] md:min-w-[100px] py-2.5 md:py-3.5 text-[8px] md:text-[9px] font-black rounded-lg md:rounded-xl transition-all uppercase ${notifTab==='pensiun' ? 'bg-white text-rose-600 shadow-md' : 'text-gray-500'}`}>Pensiun ({reminders.pensiun.length})</button>
                    <button onClick={() => setNotifTab('kgb')} className={`flex-1 min-w-[80px] md:min-w-[100px] py-2.5 md:py-3.5 text-[8px] md:text-[9px] font-black rounded-lg md:rounded-xl transition-all uppercase ${notifTab==='kgb' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-500'}`}>KGB ({reminders.kgb.length})</button>
                    <button onClick={() => setNotifTab('pangkat')} className={`flex-1 min-w-[80px] md:min-w-[100px] py-2.5 md:py-3.5 text-[8px] md:text-[9px] font-black rounded-lg md:rounded-xl transition-all uppercase ${notifTab==='pangkat' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}>Pangkat ({reminders.pangkat.length})</button>
                    <button onClick={() => setNotifTab('satya')} className={`flex-1 min-w-[80px] md:min-w-[100px] py-2.5 md:py-3.5 text-[8px] md:text-[9px] font-black rounded-lg md:rounded-xl transition-all uppercase ${notifTab==='satya' ? 'bg-white text-amber-600 shadow-md' : 'text-gray-500'}`}>Satya ({reminders.satya.length})</button>
                    <button onClick={() => setNotifTab('bangkom')} className={`flex-1 min-w-[80px] md:min-w-[100px] py-2.5 md:py-3.5 text-[8px] md:text-[9px] font-black rounded-lg md:rounded-xl transition-all uppercase ${notifTab==='bangkom' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500'}`}>Pelatihan ({reminders.bangkom.length})</button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar space-y-3 md:space-y-4 bg-white">
                 {(reminders[notifTab] || []).map((item, i) => (
                    <div key={`${item.nip || i}-${i}`} className="p-4 md:p-5 bg-gray-50/50 border border-gray-100 rounded-2xl md:rounded-[2rem] flex items-center gap-4 md:gap-5 hover:bg-blue-50 transition-all shadow-sm group">
                       <div className="min-w-0 flex-1">
                          <p className="text-[10px] md:text-[11px] font-black text-gray-950 truncate uppercase">{item.nama || 'Tanpa Nama'}</p>
                          <p className="text-[8px] md:text-[9px] font-bold text-gray-400 mt-1 uppercase">{item.tmt || item.tmtTerakhir || '-'}</p>
                       </div>
                       <span className="shrink-0 px-2.5 md:px-3 py-1 bg-white border rounded-lg text-[8px] md:text-[9px] font-black text-gray-500 uppercase">{item.sisa || item.keterangan || item.pengabdian || '-'}</span>
                    </div>
                 ))}
                 {(reminders[notifTab] || []).length === 0 && <div className="py-20 text-center opacity-30"><p className="text-[10px] font-black tracking-widest">Data terpantau aman</p></div>}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;