import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  fetchPegawaiFromSheets, 
  fetchPenilaianTalentaFromSheets, 
  fetchTalentPoolFromSheets, 
  fetchAssessmentTalentaFromSheets, 
  fetchNineBoxFromSheets, 
  fetchPengembanganTalentaFromSheets, 
  syncTableRemote 
} from '../spreadsheetService';
import { 
  Pegawai, 
  PenilaianTalenta, 
  TalentPool, 
  AssessmentTalenta, 
  NineBoxTalenta, 
  PengembanganTalenta 
} from '../types';
import { useAuth } from '../AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { formatPegawaiName } from '../constants';
import * as XLSX from 'xlsx';

// Recharts for graphics
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

type TabType = 'DASHBOARD' | 'PENILAIAN' | 'TALENT_POOL' | 'NINEBOX' | 'PROMOSI' | 'PENGEMBANGAN' | 'IMPORT_EXPORT';

export default function TalentaPage() {
  const { user, canEdit } = useAuth();
  
  // State lists
  const [activeTab, setActiveTab] = useState<TabType>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [penilaianList, setPenilaianList] = useState<PenilaianTalenta[]>([]);
  const [talentPoolList, setTalentPoolList] = useState<TalentPool[]>([]);
  const [assessmentList, setAssessmentList] = useState<AssessmentTalenta[]>([]);
  const [nineBoxList, setNineBoxList] = useState<NineBoxTalenta[]>([]);
  const [pengembanganList, setPengembanganList] = useState<PengembanganTalenta[]>([]);

  // Selection & Search filter states
  const [selectedPegawaiId, setSelectedPegawaiId] = useState('');
  const [filterUnitKerja, setFilterUnitKerja] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Assessment/Evaluation form state
  const [formPenilaian, setFormPenilaian] = useState({
    id: '',
    nilai_skp: 80,
    kompetensi: 80,
    integritas: 80,
    disiplin: 80,
    leadership: 80,
    teamwork: 80,
    inovasi: 80,
    komunikasi: 80,
    pendidikan: 'S1',
    pengalaman: 3,
  });

  // Competency/Development form state
  const [formPengembangan, setFormPengembangan] = useState({
    pegawai_id: '',
    jenis_pengembangan: 'Mentoring',
    nama_pelatihan: '',
    penyelenggara: 'DJKI Kemenkumham RI',
    tanggal_mulai: '',
    tanggal_selesai: '',
    status: 'Belum mulai'
  });

  // Notification / Alert state
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'danger' | 'warning', text: string } | null>(null);

  // Load all data
  const loadData = async (bypassCache = false) => {
    setLoading(true);
    try {
      const [peg, pen, tp, ass, nb, dev] = await Promise.all([
        fetchPegawaiFromSheets(bypassCache),
        fetchPenilaianTalentaFromSheets(bypassCache),
        fetchTalentPoolFromSheets(bypassCache),
        fetchAssessmentTalentaFromSheets(bypassCache),
        fetchNineBoxFromSheets(bypassCache),
        fetchPengembanganTalentaFromSheets(bypassCache)
      ]);
      setPegawaiList(peg);
      setPenilaianList(pen);
      setTalentPoolList(tp);
      setAssessmentList(ass);
      setNineBoxList(nb);
      setPengembanganList(dev);
    } catch (e) {
      console.error(e);
      showAlert('danger', 'Gagal memuat beberapa tabel data dari Spreadsheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Utility to show temporary message
  const showAlert = (type: 'success' | 'danger' | 'warning', text: string) => {
    setAlertInfo({ type, text });
    setTimeout(() => setAlertInfo(null), 5000);
  };

  // Helper mapping
  const findPegawai = (idOrNip: string): Pegawai | undefined => {
    return pegawaiList.find(p => p.id === idOrNip || p.nip === idOrNip);
  };

  // 3. Formula Formula automatically calculated total_nilai:
  // total_nilai = (skp*0.30)+(kompetensi*0.20)+(leadership*0.15)+(integritas*0.10)+(disiplin*0.10)+(teamwork*0.05)+(inovasi*0.05)+(komunikasi*0.05)
  const calculateTotalNilai = (data: any) => {
    const rawVal = 
      (parseFloat(data.nilai_skp) || 0) * 0.30 +
      (parseFloat(data.kompetensi) || 0) * 0.20 +
      (parseFloat(data.leadership) || 0) * 0.15 +
      (parseFloat(data.integritas) || 0) * 0.10 +
      (parseFloat(data.disiplin) || 0) * 0.10 +
      (parseFloat(data.teamwork) || 0) * 0.05 +
      (parseFloat(data.inovasi) || 0) * 0.05 +
      (parseFloat(data.komunikasi) || 0) * 0.05;
    return parseFloat(rawVal.toFixed(2));
  };

  const getKategoriTalenta = (score: number): 'Future Leader' | 'High Potential' | 'Talent Ready' | 'Need Development' => {
    if (score >= 90) return 'Future Leader';
    if (score >= 80) return 'High Potential';
    if (score >= 70) return 'Talent Ready';
    return 'Need Development';
  };

  // Calculate ninebox placement coordinates automatically derived:
  const classifyScoreRange = (score: number) => {
    if (score >= 85) return 'HIGH';
    if (score >= 70) return 'MEDIUM';
    return 'LOW';
  };

  const calculateNineBoxPos = (kinerjaScore: number, potensiScore: number) => {
    const kinType = classifyScoreRange(kinerjaScore);
    const potType = classifyScoreRange(potensiScore);

    if (kinType === 'HIGH' && potType === 'HIGH') return { box: 'Box 9: Future Star', rec: 'Promosi / Penugasan Khusus / Akselerasi Karir' };
    if (kinType === 'HIGH' && potType === 'MEDIUM') return { box: 'Box 8: High Performer', rec: 'Pengembangan Kompetensi / Rotasi Jabatan' };
    if (kinType === 'HIGH' && potType === 'LOW') return { box: 'Box 7: High Professional', rec: 'Pertahankan Performa / Mentoring Rekan Kerja' };
    if (kinType === 'MEDIUM' && potType === 'HIGH') return { box: 'Box 6: High Potential', rec: 'Coaching Kepemimpinan / Project Akselerasi' };
    if (kinType === 'MEDIUM' && potType === 'MEDIUM') return { box: 'Box 5: Core Employee', rec: 'Pelatihan Kompetensi / Jalur Karir Pendamping' };
    if (kinType === 'MEDIUM' && potType === 'LOW') return { box: 'Box 4: Effective Employee', rec: 'Coaching Kompetensi Spesifik / Penyegaran Tugas' };
    if (kinType === 'LOW' && potType === 'HIGH') return { box: 'Box 3: Enigma', rec: 'Evaluasi Penempatan Kerja / Program Re-edukasi' };
    if (kinType === 'LOW' && potType === 'MEDIUM') return { box: 'Box 2: Dilemma', rec: 'Penyusunan PIP (Performance Improvement Plan) / Konseling' };
    return { box: 'Box 1: Low Performer', rec: 'PIP Intensif / Mutasi ke Posisi Lebih Sesuai' };
  };

  // Handle select employee in Evaluation Form
  useEffect(() => {
    if (selectedPegawaiId) {
      const existingPenilaian = penilaianList.find(p => p.pegawai_id === selectedPegawaiId || p.pegawai_id === findPegawai(selectedPegawaiId)?.nip);
      if (existingPenilaian) {
        setFormPenilaian({
          id: existingPenilaian.id,
          nilai_skp: existingPenilaian.nilai_skp || 80,
          kompetensi: existingPenilaian.kompetensi || 80,
          integritas: existingPenilaian.integritas || 80,
          disiplin: existingPenilaian.disiplin || 80,
          leadership: existingPenilaian.leadership || 80,
          teamwork: existingPenilaian.teamwork || 80,
          inovasi: existingPenilaian.inovasi || 80,
          komunikasi: existingPenilaian.komunikasi || 80,
          pendidikan: existingPenilaian.pendidikan || 'S1',
          pengalaman: existingPenilaian.pengalaman || 3,
        });
      } else {
        // Prepare blank default evaluation
        const peg = findPegawai(selectedPegawaiId);
        setFormPenilaian({
          id: `TAL-${selectedPegawaiId}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          nilai_skp: 80,
          kompetensi: 80,
          integritas: 80,
          disiplin: 80,
          leadership: 80,
          teamwork: 80,
          inovasi: 80,
          komunikasi: 80,
          pendidikan: peg?.pendidikan || 'S1',
          pengalaman: parseInt(peg?.masaKerja || '0') || 3,
        });
      }
    }
  }, [selectedPegawaiId, penilaianList]);

  // Handle Penilaian Submission
  const handleSavePenilaian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPegawaiId) {
      showAlert('warning', 'Pilih pegawai terlebih dahulu.');
      return;
    }

    const peg = findPegawai(selectedPegawaiId);
    if (!peg) {
      showAlert('danger', 'Pegawai tidak valid.');
      return;
    }

    setSubmitting(true);
    const total_nilai = calculateTotalNilai(formPenilaian);
    const kategori_talenta = getKategoriTalenta(total_nilai);

    const payloadPenilaian: PenilaianTalenta = {
      id: formPenilaian.id || `TAL-${peg.nip}-${Date.now()}`,
      pegawai_id: peg.nip, // save NIP consistently
      nilai_skp: formPenilaian.nilai_skp,
      kompetensi: formPenilaian.kompetensi,
      integritas: formPenilaian.integritas,
      disiplin: formFormPenilaianValue('disiplin'),
      leadership: formFormPenilaianValue('leadership'),
      teamwork: formFormPenilaianValue('teamwork'),
      inovasi: formFormPenilaianValue('inovasi'),
      komunikasi: formFormPenilaianValue('komunikasi'),
      pendidikan: formPenilaian.pendidikan,
      pengalaman: formPenilaian.pengalaman,
      total_nilai,
      kategori_talenta,
      created_at: new Date().toISOString()
    };

    // Auto calculate and update NineBox coordinates directly
    const nbInfo = calculateNineBoxPos(formPenilaian.nilai_skp, formPenilaian.kompetensi);
    const payloadNineBox: NineBoxTalenta = {
      id: `NB-${peg.nip}`,
      pegawai_id: peg.nip,
      kinerja: formPenilaian.nilai_skp,
      potensi: formPenilaian.kompetensi,
      posisi_box: nbInfo.box,
      rekomendasi: nbInfo.rec
    };

    // Determine ranking on talent_pool
    const existingPool = talentPoolList.find(t => t.pegawai_id === peg.nip);
    let rl = 'Medium';
    if (total_nilai >= 90) rl = 'High';
    else if (total_nilai < 70) rl = 'Low';

    const payloadTalentPool: TalentPool = {
      id: existingPool?.id || `TP-${peg.nip}`,
      pegawai_id: peg.nip,
      ranking: existingPool?.ranking || (talentPoolList.length + 1),
      status_talenta: total_nilai >= 90 && parseInt(peg.masaKerja || '0') >= 5 ? 'Layak Promosi' : 'Kader Potensial',
      readiness_level: rl,
      rekomendasi_jabatan: peg.jabatan,
      created_at: new Date().toISOString()
    };

    try {
      // Sync all three tables side-by-side
      const p1 = syncTableRemote('PENILAIAN_TALENTA', 'SAVE', payloadPenilaian);
      const p2 = syncTableRemote('NINEBOX', 'SAVE', payloadNineBox);
      const p3 = syncTableRemote('TALENT_POOL', 'SAVE', payloadTalentPool);
      
      const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

      if (res1 && res2 && res3) {
        showAlert('success', `Berhasil menyimpan penilaian untuk ${peg.nama}. Total Nilai: ${total_nilai} (${kategori_talenta})`);
        loadData(true); // force reload sheets
      } else {
        showAlert('danger', 'Gagal mensinkronisasikan satu atau lebih sheet data.');
      }
    } catch (err) {
      console.error(err);
      showAlert('danger', 'Error koneksi saat menyimpan penilaian.');
    } finally {
      setSubmitting(false);
    }
  };

  const formFormPenilaianValue = (key: string) => {
    return (formPenilaian as any)[key] || 0;
  };

  // Handle Save Training / Pengembangan
  const handleSavePengembangan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPengembangan.pegawai_id) {
       showAlert('warning', 'Pilih pegawai.');
       return;
    }
    const targetPeg = findPegawai(formPengembangan.pegawai_id);
    if (!targetPeg) return;

    setSubmitting(true);
    const payload: PengembanganTalenta = {
      id: `DEV-${Date.now()}`,
      pegawai_id: targetPeg.nip,
      jenis_pengembangan: formPengembangan.jenis_pengembangan,
      nama_pelatihan: formPengembangan.nama_pelatihan,
      penyelenggara: formPengembangan.penyelenggara,
      tanggal_mulai: formPengembangan.tanggal_mulai,
      tanggal_selesai: formPengembangan.tanggal_selesai,
      status: formPengembangan.status
    };

    try {
      const res = await syncTableRemote('PENGEMBANGAN_TALENTA', 'SAVE', payload);
      if (res) {
        showAlert('success', 'Program pengembangan berhasil didaftarkan.');
        setFormPengembangan({
          pegawai_id: '',
          jenis_pengembangan: 'Mentoring',
          nama_pelatihan: '',
          penyelenggara: 'DJKI Kemenkumham RI',
          tanggal_mulai: '',
          tanggal_selesai: '',
          status: 'Belum mulai'
        });
        loadData(true);
      } else {
        showAlert('danger', 'Gagal menyimpan program pengembangan.');
      }
    } catch (err) {
      showAlert('danger', 'Koneksi error.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete evaluation
  const handleDeletePenilaian = async (penilaian: PenilaianTalenta) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus penilaian talenta untuk pegawai ini?')) return;
    setLoading(true);
    try {
      const p1 = syncTableRemote('PENILAIAN_TALENTA', 'DELETE', { id: penilaian.id });
      const p2 = syncTableRemote('NINEBOX', 'DELETE', { id: `NB-${penilaian.pegawai_id}` });
      const p3 = syncTableRemote('TALENT_POOL', 'DELETE', { id: `TP-${penilaian.pegawai_id}` });
      await Promise.all([p1, p2, p3]);
      showAlert('success', 'Data penilaian talenta terhapus.');
      loadData(true);
    } catch (e) {
      showAlert('danger', 'Gagal menghapus data.');
    } finally {
      setLoading(false);
    }
  };

  // Filter pegawai list based on roles
  const filteredPegawaiList = useMemo(() => {
    if ((user?.role as string) === 'Pegawai' && user?.nip) {
      return pegawaiList.filter(p => p.nip === user.nip);
    }
    return pegawaiList;
  }, [pegawaiList, user]);

  const selectOptions = useMemo(() => {
    return filteredPegawaiList.map(p => ({
      value: p.id,
      label: formatPegawaiName(p.nama),
      subLabel: `NIP. ${p.nip} • ${p.jabatan}`
    }));
  }, [filteredPegawaiList]);

  // Compute calculated values
  const totalPegawaiCount = pegawaiList.length;
  const evaluatedCount = penilaianList.length;
  const futureLeaderCount = penilaianList.filter(p => p.total_nilai >= 90).length;
  const highPotentialCount = penilaianList.filter(p => p.total_nilai >= 80 && p.total_nilai < 90).length;

  // Filtered Evaluation and Talent Pool list for View Tab
  const processedTalentPool = useMemo(() => {
    let list = penilaianList.map((pen, i) => {
      const peg = findPegawai(pen.pegawai_id);
      const pool = talentPoolList.find(t => t.pegawai_id === pen.pegawai_id);
      return {
        ...pen,
        nama: peg ? formatPegawaiName(peg.nama) : 'Karyawan',
        jabatan: peg?.jabatan || 'Jabatan Fungsional',
        unit_kerja: peg?.unitKerja || 'DJKI',
        foto: peg?.foto || '',
        masa_kerja: parseInt(peg?.masaKerja || '0') || 0,
        status_talenta: pool?.status_talenta || 'Kader Potensial',
        readiness_level: pool?.readiness_level || 'Medium',
        rekomendasi_jabatan: pool?.rekomendasi_jabatan || peg?.jabatan || 'Jabatan Terget'
      };
    });

    // Sort descending by total score to establish absolute ranking
    list.sort((a, b) => b.total_nilai - a.total_nilai);

    // Filter query searches
    if (filterUnitKerja) {
      list = list.filter(item => item.unit_kerja.toLowerCase().includes(filterUnitKerja.toLowerCase()));
    }
    if (filterJabatan) {
      list = list.filter(item => item.jabatan.toLowerCase().includes(filterJabatan.toLowerCase()));
    }
    if (filterKategori) {
      list = list.filter(item => item.kategori_talenta === filterKategori);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.nama.toLowerCase().includes(q) || 
        item.pegawai_id.includes(q) || 
        item.jabatan.toLowerCase().includes(q)
      );
    }

    // Assign ranking indexes in current filter
    return list.map((item, index) => ({
      ...item,
      live_ranking: index + 1
    }));
  }, [penilaianList, talentPoolList, pegawaiList, filterUnitKerja, filterJabatan, filterKategori, searchQuery]);

  // Special promotion readiness filter (Rekomendasi Promosi)
  // Kebutuhan: nilai > 85, masa kerja > 5 tahun, leadership tinggi
  const promotionCandidates = useMemo(() => {
    return processedTalentPool.filter(p => p.total_nilai > 85 && p.masa_kerja >= 5 && p.leadership >= 80);
  }, [processedTalentPool]);

  // Aggregate stats for charts
  const competencyChartData = useMemo(() => {
    if (penilaianList.length === 0) return [];
    
    // average competencies across assessed workers
    let skpSum = 0, kompetensiSum = 0, leadSum = 0, integSum = 0, dispSum = 0, teamSum = 0, innoSum = 0, commSum = 0;
    penilaianList.forEach(p => {
      skpSum += p.nilai_skp || 0;
      kompetensiSum += p.kompetensi || 0;
      leadSum += p.leadership || 0;
      integSum += p.integritas || 0;
      dispSum += p.disiplin || 0;
      teamSum += p.teamwork || 0;
      innoSum += p.inovasi || 0;
      commSum += p.komunikasi || 0;
    });

    const total = penilaianList.length;
    return [
      { name: 'SKP', value: Math.round(skpSum / total) },
      { name: 'Kompetensi', value: Math.round(kompetensiSum / total) },
      { name: 'Leadership', value: Math.round(leadSum / total) },
      { name: 'Integritas', value: Math.round(integSum / total) },
      { name: 'Disiplin', value: Math.round(dispSum / total) },
      { name: 'Teamwork', value: Math.round(teamSum / total) },
      { name: 'Inovasi', value: Math.round(innoSum / total) },
      { name: 'Komunikasi', value: Math.round(commSum / total) }
    ];
  }, [penilaianList]);

  const pendidikanChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    processedTalentPool.forEach(p => {
      const pId = p.pendidikan || 'Lainnya';
      counts[pId] = (counts[pId] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [processedTalentPool]);

  const unitsChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    processedTalentPool.forEach(p => {
      const un = p.unit_kerja || 'DJKI';
      counts[un] = (counts[un] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    }));
  }, [processedTalentPool]);

  // Nine Box Visual Categorization Map
  const nineBoxGroups = useMemo(() => {
    const groups: Record<string, typeof processedTalentPool> = {
      'Box 9: Future Star': [],
      'Box 8: High Performer': [],
      'Box 7: High Professional': [],
      'Box 6: High Potential': [],
      'Box 5: Core Employee': [],
      'Box 4: Effective Employee': [],
      'Box 3: Enigma': [],
      'Box 2: Dilemma': [],
      'Box 1: Low Performer': []
    };

    processedTalentPool.forEach(p => {
      const nbInfo = calculateNineBoxPos(p.nilai_skp, p.kompetensi);
      if (groups[nbInfo.box]) {
        groups[nbInfo.box].push(p);
      } else {
        groups['Box 1: Low Performer'].push(p);
      }
    });

    return groups;
  }, [processedTalentPool]);

  // Excel Importing logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showAlert('warning', 'File Excel kosong atau format tidak sesuai.');
          return;
        }

        setLoading(true);
        let importSuccessCount = 0;
        let skipCount = 0;

        for (const row of data) {
          // Validation checks
          const nip = String(row.NIP || row.pegawai_id || row.Nip || '').replace(/\D/g, '');
          if (!nip || nip.length < 5) {
            skipCount++;
            continue;
          }

          // Check if NIP is existing in Pegawai database
          const targetP = pegawaiList.find(p => p.nip === nip);
          if (!targetP) {
            skipCount++;
            continue; // employee must exist in primary database
          }

          // Read numeric fields
          const skp = parseFloat(row.NILAI_SKP || row.SKP || row.nilai_skp) || 80;
          const komp = parseFloat(row.KOMPETENSI || row.kompetensi) || 80;
          const integ = parseFloat(row.INTEGRITAS || row.integritas) || 80;
          const disp = parseFloat(row.DISIPLIN || row.disiplin) || 80;
          const lead = parseFloat(row.LEADERSHIP || row.leadership) || 80;
          const team = parseFloat(row.TEAMWORK || row.teamwork) || 80;
          const inno = parseFloat(row.INOVASI || row.inovasi) || 80;
          const comm = parseFloat(row.KOMUNIKASI || row.komunikasi) || 80;
          const pend = String(row.PENDIDIKAN || row.pendidikan || targetP.pendidikan || 'S1');
          const exp = parseFloat(row.PENGALAMAN || row.pengalaman || targetP.masaKerja) || 3;

          const tempObj = {
            nilai_skp: skp,
            kompetensi: komp,
            integritas: integ,
            disiplin: disp,
            leadership: lead,
            teamwork: team,
            inovasi: inno,
            komunikasi: comm
          };

          const total_nilai = calculateTotalNilai(tempObj);
          const kategori_talenta = getKategoriTalenta(total_nilai);

          const payloadPen: PenilaianTalenta = {
            id: `TAL-${nip}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            pegawai_id: nip,
            nilai_skp: skp,
            kompetensi: komp,
            integritas: integ,
            disiplin: disp,
            leadership: lead,
            teamwork: team,
            inovasi: inno,
            komunikasi: comm,
            pendidikan: pend,
            pengalaman: exp,
            total_nilai,
            kategori_talenta,
            created_at: new Date().toISOString()
          };

          // Synchronize spreadsheet directly
          const nbInfo = calculateNineBoxPos(skp, komp);
          const payloadNB: NineBoxTalenta = {
            id: `NB-${nip}`,
            pegawai_id: nip,
            kinerja: skp,
            potensi: komp,
            posisi_box: nbInfo.box,
            rekomendasi: nbInfo.rec
          };

          const rl = total_nilai >= 90 ? 'High' : (total_nilai < 70 ? 'Low' : 'Medium');
          const payloadPool: TalentPool = {
            id: `TP-${nip}`,
            pegawai_id: nip,
            ranking: talentPoolList.length + importSuccessCount + 1,
            status_talenta: total_nilai >= 90 ? 'Layak Promosi' : 'Kader Potensial',
            readiness_level: rl,
            rekomendasi_jabatan: targetP.jabatan,
            created_at: new Date().toISOString()
          };

          await Promise.all([
            syncTableRemote('PENILAIAN_TALENTA', 'SAVE', payloadPen),
            syncTableRemote('NINEBOX', 'SAVE', payloadNB),
            syncTableRemote('TALENT_POOL', 'SAVE', payloadPool)
          ]);

          importSuccessCount++;
        }

        showAlert('success', `Excel Berhasil di-Import! Berhasil diunggah: ${importSuccessCount} baris. Terlewat/Nol NIP: ${skipCount}`);
        loadData(true);
      } catch (err) {
        console.error(err);
        showAlert('danger', 'Gagal memparsing file Excel.');
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export to Excel function
  const handleExportExcel = () => {
    const rawExportData = processedTalentPool.map(p => ({
      'Ranking': p.live_ranking,
      'NIP Pegawai': p.pegawai_id,
      'Nama Pegawai': p.nama,
      'Jabatan': p.jabatan,
      'Unit Kerja': p.unit_kerja,
      'SKP': p.nilai_skp,
      'Kompetensi': p.kompetensi,
      'Leadership': p.leadership,
      'Integritas': p.integritas,
      'Disiplin': p.disiplin,
      'Total Nilai': p.total_nilai,
      'Kategori Talenta': p.kategori_talenta,
      'Rekomendasi Promosi': p.status_talenta,
      'Readiness': p.readiness_level
    }));

    const ws = XLSX.utils.json_to_sheet(rawExportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Talent Pool');
    XLSX.writeFile(wb, `Laporan_Talent_Pool_DJKI_${Date.now()}.xlsx`);
    showAlert('success', 'Download Excel Berhasil.');
  };

  // Handle manual print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h3 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tighter leading-none">Manajemen Talenta ASN</h3>
          <p className="text-[10px] md:text-[11px] text-gray-400 font-bold tracking-[0.3em] mt-4 uppercase">Instrospeksi Kompetensi & Suksesi Karir Terstruktur</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => loadData(true)} 
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-100 rounded-xl font-black text-[10px] tracking-widest uppercase flex items-center gap-2 shadow-sm transition-all"
          >
            {loading ? <div className="h-3 w-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div> : <i className="bi bi-arrow-clockwise"></i>}
            Sync Sheets
          </button>
        </div>
      </div>

      {/* SYSTEM ROLE SCOPE ALERT INFO */}
      {(user?.role as string) === 'Pegawai' && (
        <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-4 text-blue-800 no-print">
          <i className="bi bi-info-circle-fill text-xl"></i>
          <div>
            <p className="text-xs font-bold">Scope Terbatas</p>
            <p className="text-[10px] font-medium text-blue-600/80">Anda masuk sebagai Pegawai. Anda hanya dapat melihat penilaian personal dan profil suksesi karir Anda sendiri sesuai peraturan perundang-undangan.</p>
          </div>
        </div>
      )}

      {/* ALERT TOAST COMPONENT */}
      {alertInfo && (
        <div className={`p-4 rounded-2xl flex items-center justify-between shadow-xl animate-fadeIn no-print ${alertInfo.type === 'success' ? 'bg-emerald-500 text-white' : alertInfo.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <i className="bi bi-check-circle-fill text-lg"></i>
            <span className="text-[11px] font-black tracking-wide leading-tight">{alertInfo.text}</span>
          </div>
          <button onClick={() => setAlertInfo(null)} className="text-white hover:opacity-80 font-bold text-sm"><i className="bi bi-x-lg"></i></button>
        </div>
      )}

      {/* TAB NAVIGATION PANEL */}
      <div className="flex overflow-x-auto gap-1 border-b border-gray-100 no-print">
        {(user?.role as string) !== 'Pegawai' && (
          <button 
            onClick={() => setActiveTab('DASHBOARD')} 
            className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'DASHBOARD' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
          >
            Dashboard Talenta
          </button>
        )}
        {canEdit && (
          <button 
            onClick={() => { setActiveTab('PENILAIAN'); setSelectedPegawaiId(''); }} 
            className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'PENILAIAN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
          >
            Form Penilaian
          </button>
        )}
        <button 
          onClick={() => setActiveTab('TALENT_POOL')} 
          className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'TALENT_POOL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
        >
          Talent Pool Rankings
        </button>
        <button 
          onClick={() => setActiveTab('NINEBOX')} 
          className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'NINEBOX' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
        >
          9-Box Matrix
        </button>
        <button 
          onClick={() => setActiveTab('PROMOSI')} 
          className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'PROMOSI' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
        >
          Rekomendasi Promosi
        </button>
        <button 
          onClick={() => setActiveTab('PENGEMBANGAN')} 
          className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'PENGEMBANGAN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
        >
          Pengembangan ASN
        </button>
        {canEdit && (
          <button 
            onClick={() => setActiveTab('IMPORT_EXPORT')} 
            className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'IMPORT_EXPORT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
          >
            Import / Export
          </button>
        )}
      </div>

      {/* MAIN VIEWPORT */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Sinkronisasi Google Sheets database...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TAB 1: DASHBOARD TALENTA */}
          {activeTab === 'DASHBOARD' && (user?.role as string) !== 'Pegawai' && (
            <div className="space-y-8">
              {/* STAT CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <span className="text-[7px] md:text-[8px] font-black text-slate-400 tracking-wider block uppercase mb-1">Database Pegawai</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-gray-950 tracking-tighter">{totalPegawaiCount}</span>
                    <span className="text-[9px] font-bold text-gray-400">Pegawai</span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-2">DJKI Kemenkumham RI</p>
                </div>

                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <span className="text-[7px] md:text-[8px] font-black text-blue-500 tracking-wider block uppercase mb-1">Evaluated Talent Pool</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-blue-600 tracking-tighter">{evaluatedCount}</span>
                    <span className="text-[9px] font-bold text-blue-400">Pegawai Evaluasi</span>
                  </div>
                  <p className="text-[9px] text-emerald-500 font-bold mt-2">
                    {totalPegawaiCount ? Math.round((evaluatedCount / totalPegawaiCount) * 100) : 0}% terisi
                  </p>
                </div>

                <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-sm">
                  <span className="text-[7px] md:text-[8px] font-black text-blue-400 tracking-wider block uppercase mb-1">Future Leader Level 9</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-blue-400 tracking-tighter">{futureLeaderCount}</span>
                    <span className="text-[9px] font-bold text-slate-400">Superstars</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold mt-2">Nilai total ≥ 90</p>
                </div>

                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <span className="text-[7px] md:text-[8px] font-black text-purple-500 tracking-wider block uppercase mb-1">High Potential Level 8</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-purple-600 tracking-tighter">{highPotentialCount}</span>
                    <span className="text-[9px] font-bold text-purple-400">Pegawai</span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-2">Nilai total 80 - 90</p>
                </div>
              </div>

              {/* CHARTS CONTAINER - 2 COLUMN */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. KOMPETENSI AGGREGATE SUMMARY */}
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Kompetensi Average Global</h4>
                    <p className="text-[9px] text-gray-400 font-bold mb-6">Distribusi Nilai Rata-rata dari Seluruh Evaluasi Talenta</p>
                  </div>
                  <div className="h-64">
                    {competencyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={competencyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94a3b8' }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                          <ChartTooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fontWeight: 'bold' }}>
                            {competencyChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold">Belum ada data evaluasi.</div>
                    )}
                  </div>
                </div>

                {/* 2. PENDIDIKAN DIAGRAM & UNIT STATS */}
                <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Distribusi Pendidikan & Unit Kerja</h4>
                    <p className="text-[9px] text-gray-400 font-bold mb-6">Persentasi latar belakang pilar pendidikan talent pool</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-48 relative">
                      {pendidikanChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pendidikanChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={60}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pendidikanChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#6366f1', '#a855f7', '#14b8a6', '#f59e0b'][index % 5]} />
                              ))}
                            </Pie>
                            <ChartTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-400 text-xs font-bold">Nihil.</div>
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[14px] font-black text-gray-800">{evaluatedCount}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">Evaluasi</span>
                      </div>
                    </div>

                    <div className="space-y-3 flex flex-col justify-center">
                      <p className="text-[9px] font-black text-slate-600 block uppercase border-b pb-1">Statistik Pendidikan</p>
                      {pendidikanChartData.map((p, idx) => (
                        <div key={p.name} className="flex justify-between items-center text-[9px] font-bold text-gray-600">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#6366f1', '#a855f7', '#14b8a6', '#f59e0b'][idx % 5] }}></span>
                            {p.name}
                          </span>
                          <span>{p.value} Orang</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* STATISTIK UNIT KERJA & TOP 5 RANKING TALENTA */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* UNIT WORK CHART */}
                <div className="lg:col-span-1 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Populasi per Unit Kerja</h4>
                    <p className="text-[9px] text-gray-400 font-bold mb-6">Jumlah pegawai terevaluasi di setiap unit direktorat</p>
                  </div>
                  <div className="h-56">
                    {unitsChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={unitsChartData} margin={{ left: -15, right: 10 }}>
                          <XAxis type="number" tick={{ fontSize: 9 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fontWeight: 'bold' }} width={80} />
                          <ChartTooltip />
                          <Bar dataKey="value" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">Nihil.</div>
                    )}
                  </div>
                </div>

                {/* TOP 5 TALENT RANKS TABLE */}
                <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Top 5 Berdasarkan Perangkingan</h4>
                      <p className="text-[9px] text-gray-400 font-bold">Kader terbaik dengan nilai akumulasi suksesi tertinggi</p>
                    </div>
                    <button onClick={() => setActiveTab('TALENT_POOL')} className="text-[9px] font-bold text-blue-600 hover:text-blue-700 tracking-wider flex items-center gap-1">
                      Selengkapnya <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-gray-100 text-[9px] font-black text-slate-400 uppercase">
                          <th className="pb-3 text-center w-12">Rank</th>
                          <th className="pb-3">Pegawai NIP</th>
                          <th className="pb-3">Jabatan & Golongan</th>
                          <th className="pb-3 text-right">Skor Total</th>
                          <th className="pb-3 text-center">Kategori</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                        {processedTalentPool.slice(0, 5).map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 text-center font-black text-blue-600">
                              #{idx + 1}
                            </td>
                            <td className="py-3">
                              <span className="font-extrabold text-[#1e293b] block">{p.nama}</span>
                              <span className="text-[9px] text-slate-400 block font-mono">NIP. {p.pegawai_id}</span>
                            </td>
                            <td className="py-3">
                              <span className="block truncate max-w-[200px]">{p.jabatan}</span>
                              <span className="text-[9px] text-slate-400 block uppercase">{p.unit_kerja}</span>
                            </td>
                            <td className="py-3 text-right font-black text-[#1e293b]">{p.total_nilai}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                p.kategori_talenta === 'Future Leader' ? 'bg-indigo-100 text-indigo-700' :
                                p.kategori_talenta === 'High Potential' ? 'bg-blue-100 text-blue-700' :
                                p.kategori_talenta === 'Talent Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {p.kategori_talenta}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {processedTalentPool.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400 font-bold">Belum ada pegawai yang dinilai.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORM INPUT EVALUASI / PENILAIAN */}
          {activeTab === 'PENILAIAN' && canEdit && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* INPUT FORM CONTAINER */}
              <div className="lg:col-span-2 p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Evaluasi Kompetensi Pegawai</h4>
                <p className="text-[9px] text-gray-400 font-bold mb-8">Masukkan nilai penilaian kinerja (Penilaian Talenta ASN) sesuai standar regulasi</p>

                <form onSubmit={handleSavePenilaian} className="space-y-6">
                  {/* SEARCHABLE EMPLOYEE SELECT */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <SearchableSelect 
                      label="Evaluasi Pegawai"
                      placeholder="Cari Pegawai berdasarkan Nama / NIP..."
                      options={selectOptions}
                      value={selectedPegawaiId}
                      onChange={setSelectedPegawaiId}
                    />
                  </div>

                  {selectedPegawaiId && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SKP */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Penilaian SKP (Kinerja) (Bobot 30%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.nilai_skp}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, nilai_skp: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* KOMPETENSI */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Kompetensi Teknis/Sosiokultural (Bobot 20%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.kompetensi}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, kompetensi: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* LEADERSHIP */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Leadership / Kepemimpinan (Bobot 15%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.leadership}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, leadership: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* INTEGRITAS */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Integritas / Nilai Pancasila (Bobot 10%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.integritas}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, integritas: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* DISIPLIN */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Tingkat Kedisiplinan (Bobot 10%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.disiplin}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, disiplin: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* TEAMWORK */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Kolaborasi & Teamwork (Bobot 5%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.teamwork}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, teamwork: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* INOVASI */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Inovasi Kreativitas (Bobot 5%)</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.inovasi}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, inovasi: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* KOMUNIKASI */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Kemampuan Komunikasi (Bobot 5%)</label>
                          <input 
                            type="number" 
                            min="0" 
max="100" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.komunikasi}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, komunikasi: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        {/* PENDIDIKAN */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Tingkat Pendidikan Terakhir</label>
                          <select 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.pendidikan}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, pendidikan: e.target.value })}
                          >
                            <option value="D3">D3</option>
                            <option value="D4">D4 / Sarjana Terapan</option>
                            <option value="S1">S1 / Sarjana</option>
                            <option value="S2">S2 / Magister</option>
                            <option value="S3">S3 / Doktor</option>
                          </select>
                        </div>

                        {/* PENGALAMAN */}
                        <div className="space-y-1.5">
                          <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Pengalaman Kerja (Tahun)</label>
                          <input 
                            type="number" 
                            min="0" 
                            required 
                            className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500"
                            value={formPenilaian.pengalaman}
                            onChange={(e) => setFormPenilaian({ ...formPenilaian, pengalaman: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <button 
                          type="button" 
                          onClick={() => setSelectedPegawaiId('')} 
                          className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold text-[10px] uppercase tracking-wider"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit" 
                          disabled={submitting}
                          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-md disabled:bg-blue-400"
                        >
                          {submitting ? 'Menyimpan...' : 'Simpan Realtime'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* LIVE FORMULA CALCULATION SIDEBAR PREVIEW */}
              <div className="lg:col-span-1 p-6 bg-slate-900 text-white rounded-3xl flex flex-col justify-between">
                <div>
                  <h4 className="text-[12px] font-black tracking-widest text-slate-400 uppercase mb-4">Ringkasan Perhitungan</h4>
                  {selectedPegawaiId ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center font-black">
                         {findPegawai(selectedPegawaiId)?.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black">{findPegawai(selectedPegawaiId)?.nama}</p>
                          <p className="text-[9px] text-slate-400 font-mono">NIP. {findPegawai(selectedPegawaiId)?.nip}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400">Pecahan Formula Regresi SDM:</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                          <span>SKP *(30%)</span>
                          <span>{(formPenilaian.nilai_skp * 0.3).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                          <span>Kompetensi *(20%)</span>
                          <span>{(formPenilaian.kompetensi * 0.2).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                          <span>Leadership *(15%)</span>
                          <span>{(formPenilaian.leadership * 0.15).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                          <span>Integritas & Disiplin *(20%)</span>
                          <span>{((formPenilaian.integritas * 0.1) + (formPenilaian.disiplin * 0.1)).toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                          <span>Teamwork, Kom, Inovasi *(15%)</span>
                          <span>{((formPenilaian.teamwork * 0.05) + (formPenilaian.inovasi * 0.05) + (formPenilaian.komunikasi * 0.05)).toFixed(1)}</span>
                        </div>
                      </div>

                      {/* CALCULATED VALUE OUTCOME */}
                      <div className="p-4 bg-slate-800 rounded-2xl border border-white/5 space-y-2">
                        <span className="text-[8px] font-black text-blue-400 tracking-widest uppercase">Skor Akumulasi Akhir</span>
                        <div className="text-3xl font-black text-white">{calculateTotalNilai(formPenilaian)}</div>
                        <div className="text-[9px] font-black text-slate-300">
                          Kategori: <span className="text-blue-400 font-bold uppercase">{getKategoriTalenta(calculateTotalNilai(formPenilaian))}</span>
                        </div>
                      </div>

                      {/* CORE COORDINATE NINEBOX DISPLAY */}
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Penempatan 9-Box</span>
                        <p className="text-xs font-extrabold text-[#10b981]">{calculateNineBoxPos(formPenilaian.nilai_skp, formPenilaian.kompetensi).box}</p>
                        <p className="text-[9px] text-slate-400 leading-relaxed mt-1">{calculateNineBoxPos(formPenilaian.nilai_skp, formPenilaian.kompetensi).rec}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs">Pilih salah satu pegawai untuk memvisualisasikan data regresi.</div>
                  )}
                </div>
                <div className="mt-8 border-t border-white/5 pt-4 text-[9px] text-slate-500 leading-relaxed font-bold uppercase tracking-wide">
                  DJKI ASN TALENT CALCULATOR Standard
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TALENT POOL RANKING LIST */}
          {activeTab === 'TALENT_POOL' && (
            <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <div>
                  <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Kaderisasi Talent Pool Rankings</h4>
                  <p className="text-[9px] text-gray-400 font-bold">Hasil ranking talent yang dihitung berdasarkan formula komprehensif</p>
                </div>
                {/* TOOLBAR EXPORTS */}
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportExcel} 
                    className="px-4 py-2 bg-slate-900 border border-slate-950 text-white rounded-xl font-bold text-[9px] tracking-widest uppercase flex items-center gap-2 shadow-sm hover:bg-slate-800 transition-all"
                  >
                    <i className="bi bi-file-earmark-spreadsheet-fill"></i>
                    Export Excel
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 border border-blue-700 text-white rounded-xl font-bold text-[9px] tracking-widest uppercase flex items-center gap-2 shadow-md hover:bg-blue-700 transition-all"
                  >
                    <i className="bi bi-printer-fill"></i>
                    Print / Cetak PDF
                  </button>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 no-print">
                <div>
                  <input 
                    type="text" 
                    placeholder="Search Cepat..." 
                    className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-medium w-full focus:outline-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <select 
                    className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-semibold w-full focus:outline-blue-500"
                    value={filterUnitKerja}
                    onChange={(e) => setFilterUnitKerja(e.target.value)}
                  >
                    <option value="">Semua Direktorat</option>
                    <option value="Direktorat Jenderal">Direktorat Jenderal</option>
                    <option value="Sekretariat">Sekretariat</option>
                    <option value="Direktorat Cipta">Direktorat Cipta</option>
                    <option value="Direktorat Paten">Direktorat Paten</option>
                    <option value="Direktorat Merek">Direktorat Merek</option>
                  </select>
                </div>
                <div>
                  <select 
                    className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-semibold w-full focus:outline-blue-500"
                    value={filterJabatan}
                    onChange={(e) => setFilterJabatan(e.target.value)}
                  >
                    <option value="">Semua Jabatan</option>
                    <option value="Fungsional">Fungsional</option>
                    <option value="Staf">Staf</option>
                    <option value="Seksi">Seksi</option>
                    <option value="Pemeriksa">Pemeriksa</option>
                  </select>
                </div>
                <div>
                  <select 
                    className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-semibold w-full focus:outline-blue-500"
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                  >
                    <option value="">Semua Kategori</option>
                    <option value="Future Leader">Future Leader</option>
                    <option value="High Potential">High Potential</option>
                    <option value="Talent Ready">Talent Ready</option>
                    <option value="Need Development">Need Development</option>
                  </select>
                </div>
              </div>

              {/* LIST TABLE DESKTOP */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-slate-400 uppercase">
                      <th className="pb-4 text-center w-14">Rank</th>
                      <th className="pb-4">Nama / NIP</th>
                      <th className="pb-4">Instansi/Unit</th>
                      <th className="pb-4 text-center">SKP (30%)</th>
                      <th className="pb-4 text-center">Kompetensi (20%)</th>
                      <th className="pb-4 text-center">Leadership (15%)</th>
                      <th className="pb-4 text-center">Masa Kerja</th>
                      <th className="pb-4 text-right">Skor Total</th>
                      <th className="pb-4 text-center">Kategori</th>
                      {canEdit && <th className="pb-4 text-center no-print">Manajemen</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-semibold text-slate-700">
                    {processedTalentPool.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 text-center font-black text-indigo-600 text-[13px]">{p.live_ranking}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-700">
                              {p.nama.charAt(0)}
                            </div>
                            <div>
                              <span className="font-extrabold text-[#111827] block text-[12px]">{p.nama}</span>
                              <span className="text-[9px] text-slate-400 block font-mono">NIP. {p.pegawai_id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="block truncate max-w-[200px]">{p.jabatan}</span>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{p.unit_kerja}</span>
                        </td>
                        <td className="py-4 text-center font-bold text-slate-600 font-mono">{p.nilai_skp}</td>
                        <td className="py-4 text-center font-bold text-slate-600 font-mono">{p.kompetensi}</td>
                        <td className="py-4 text-center font-bold text-slate-600 font-mono">{p.leadership}</td>
                        <td className="py-4 text-center text-slate-500 font-mono">{p.masa_kerja} Tahun</td>
                        <td className="py-4 text-right font-black text-[#1e293b] text-[13px] font-mono">{p.total_nilai}</td>
                        <td className="py-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            p.kategori_talenta === 'Future Leader' ? 'bg-indigo-100 text-indigo-700' :
                            p.kategori_talenta === 'High Potential' ? 'bg-blue-100 text-blue-700' :
                            p.kategori_talenta === 'Talent Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {p.kategori_talenta}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="py-4 text-center no-print">
                            <button 
                              onClick={() => { setSelectedPegawaiId(findPegawai(p.pegawai_id)?.id || ''); setActiveTab('PENILAIAN'); }}
                              className="h-7 w-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg inline-flex items-center justify-center transition-all mr-1.5"
                              title="Sunting Penilaian"
                            >
                              <i className="bi bi-pencil-fill text-[10px]"></i>
                            </button>
                            <button 
                              onClick={() => handleDeletePenilaian(p)}
                              className="h-7 w-7 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg inline-flex items-center justify-center transition-all"
                              title="Hapus Penilaian"
                            >
                              <i className="bi bi-trash3-fill text-[10px]"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {processedTalentPool.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-gray-400 font-bold">Tidak ada data pegawai yang dapat ditampilkan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: NINE BOX MATRIX */}
          {activeTab === 'NINEBOX' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 no-print">
                <div>
                  <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Visualisasi 9-Box Matrix ASN</h4>
                  <p className="text-[9px] text-gray-400 font-bold">Pemetaan multi-sumbu: X (Potensi / Kompetensi), Y (Kinerja / Penilaian SKP)</p>
                </div>
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 border border-slate-950 text-white rounded-xl font-bold text-[9px] tracking-widest uppercase flex items-center gap-2 shadow-sm transition-all"
                >
                  <i className="bi bi-printer-fill"></i>
                  Cetak 9-Box
                </button>
              </div>

              {/* 3x3 MATRIX ENGINE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="nine-box-grid">
                
                {/* 1. HIGH KINERJA ROW: Box 7, 8, 9 */}
                {/* BOX 7: High Professional (Low Potensi, High Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#f8fafc] border-2 border-slate-200/50 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[8px] font-black rounded tracking-widest">BOX 7</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kin: High | Pot: Low</span>
                    </div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-1">High Professional</h5>
                    <p className="text-[8px] text-slate-400 font-bold leading-relaxed mb-4">Pegawai mandiri dengan performa kerja solid tapi pengembangan potensi lambat.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 7: High Professional']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-slate-100 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-sky-200 text-sky-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 7: High Professional'] || nineBoxGroups['Box 7: High Professional'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOX 8: High Performer / Growth Talent (Medium Potensi, High Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#f5f3ff] border-2 border-purple-100 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[8px] font-black rounded tracking-widest">BOX 8</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kin: High | Pot: Med</span>
                    </div>
                    <h5 className="text-[11px] font-black text-[#5b21b6] uppercase tracking-tighter mb-1">High Performer</h5>
                    <p className="text-[8px] text-purple-400 font-bold leading-relaxed mb-4">Pegawai berpotensi sedang yang menunjukkan kinerja operasional sangat memuaskan.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 8: High Performer']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-purple-50 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-purple-200 text-purple-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 8: High Performer'] || nineBoxGroups['Box 8: High Performer'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOX 9: Future Star (High Potensi, High Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#eff6ff] border-2 border-blue-200 flex flex-col justify-between min-h-[220px] shadow-sm ring-2 ring-blue-500/20">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded tracking-widest">BOX 9 (FUTURE STAR)</span>
                      <span className="text-[8px] font-black text-blue-600 uppercase">Kin: High | Pot: High</span>
                    </div>
                    <h5 className="text-[11px] font-black text-blue-800 uppercase tracking-tighter mb-1">Future Star</h5>
                    <p className="text-[8px] text-blue-400 font-bold leading-relaxed mb-4">Kader prioritas berpotensi luar biasa & berprestasi gemilang.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 9: Future Star']?.map(p => (
                        <div key={p.id} className="p-2 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-blue-600 text-white font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-blue-600 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 9: Future Star'] || nineBoxGroups['Box 9: Future Star'].length === 0) && (
                        <p className="text-[8.5px] text-slate-450 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. MEDIUM KINERJA ROW: Box 4, 5, 6 */}
                {/* BOX 4: Effective Employee (Low Potensi, Med Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#f8fafc] border-2 border-slate-200/50 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[8px] font-black rounded tracking-widest">BOX 4</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kin: Med | Pot: Low</span>
                    </div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter mb-1">Effective Employee</h5>
                    <p className="text-[8px] text-slate-400 font-bold leading-relaxed mb-4">Pekerja stabil dengan kinerja harian andal, membutuhkan fokus pelatihan spesifik.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 4: Effective Employee']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-slate-100 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-slate-300 text-slate-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 4: Effective Employee'] || nineBoxGroups['Box 4: Effective Employee'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOX 5: Core Employee / Key Player (Medium Potensi, Med Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#ecfdf5] border-2 border-emerald-100 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded tracking-widest">BOX 5</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kin: Med | Pot: Med</span>
                    </div>
                    <h5 className="text-[11px] font-black text-[#047857] uppercase tracking-tighter mb-1">Core Employee</h5>
                    <p className="text-[8px] text-emerald-450 font-bold leading-relaxed mb-4">Inti dari organisasi. Kinerja dan karakteristik potensi selaras dengan andal.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 5: Core Employee']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-emerald-50 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-emerald-200 text-emerald-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 5: Core Employee'] || nineBoxGroups['Box 5: Core Employee'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOX 6: High Potential (Medium Kinerja, High Potensi) */}
                <div className="p-5 rounded-3xl bg-[#eff6ff] border-2 border-blue-100 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-850 text-[8px] font-black rounded tracking-widest">BOX 6</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">Kin: Med | Pot: High</span>
                    </div>
                    <h5 className="text-[11px] font-black text-[#1e40af] uppercase tracking-tighter mb-1">High Potential</h5>
                    <p className="text-[8px] text-blue-400 font-bold leading-relaxed mb-4">Pegawai dengan visi kepemimpinan yang progresif, menunggu akselerasi operasional.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 6: High Potential']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-blue-50 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 6: High Potential'] || nineBoxGroups['Box 6: High Potential'].length === 0) && (
                        <p className="text-[8.5px] text-slate-450 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. LOW KINERJA ROW: Box 1, 2, 3 */}
                {/* BOX 1: Low Performer (Low Potensi, Low Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#fff1f2] border-2 border-rose-100 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[8px] font-black rounded tracking-widest">BOX 1</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kin: Low | Pot: Low</span>
                    </div>
                    <h5 className="text-[11px] font-black text-rose-800 uppercase tracking-tighter mb-1">Low Performer</h5>
                    <p className="text-[8px] text-rose-400 font-bold leading-relaxed mb-4">Pegawai yang membutuhkan peningkatan substansial / bimbingan klinis kinerja intensif PIP.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 1: Low Performer']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-rose-50 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-rose-200 text-rose-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 1: Low Performer'] || nineBoxGroups['Box 1: Low Performer'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOX 2: Dilemma (Medium Potensi, Low Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#fffbeb] border-2 border-amber-100 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-black rounded tracking-widest">BOX 2</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">Kin: Low | Pot: Med</span>
                    </div>
                    <h5 className="text-[11px] font-black text-[#b45309] uppercase tracking-tighter mb-1">Dilemma</h5>
                    <p className="text-[8px] text-amber-500 font-bold leading-relaxed mb-4">Potensi kompetensi moderat namun kontribusi kerja harian masih sangat rendah.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 2: Dilemma']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-amber-50 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-amber-250 text-amber-700 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 2: Dilemma'] || nineBoxGroups['Box 2: Dilemma'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOX 3: Enigma (High Potensi, Low Kinerja) */}
                <div className="p-5 rounded-3xl bg-[#fffbeb] border-2 border-amber-100 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-black rounded tracking-widest">BOX 3</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase">Kin: Low | Pot: High</span>
                    </div>
                    <h5 className="text-[11px] font-black text-[#9a3412] uppercase tracking-tighter mb-1">Enigma</h5>
                    <p className="text-[8px] text-amber-500 font-bold leading-relaxed mb-4">Potensi istimewa namun memiliki hambatan teknis berat sehingga kinerja jeblok.</p>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                      {nineBoxGroups['Box 3: Enigma']?.map(p => (
                        <div key={p.id} className="p-2 bg-white rounded-xl border border-amber-50 flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-lg bg-amber-200 text-amber-600 font-black text-[9px] flex items-center justify-center shrink-0">{p.nama.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-extrabold text-slate-800 truncate leading-none mb-1">{p.nama}</p>
                            <p className="text-[7.5px] text-slate-400 truncate font-mono">{p.jabatan}</p>
                          </div>
                        </div>
                      ))}
                      {(!nineBoxGroups['Box 3: Enigma'] || nineBoxGroups['Box 3: Enigma'].length === 0) && (
                        <p className="text-[8.5px] text-slate-400 italic">Belum ada pegawai</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: REKOMENDASI PROMOSI */}
          {activeTab === 'PROMOSI' && (
            <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div>
                <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Rekomendasi Suksesi & Promosi ASN</h4>
                <p className="text-[9px] text-gray-400 font-bold">Kriteria Layak Promosi: Akumulasi Nilai Talenta &gt; 85, Masa Kerja &gt;= 5 Tahun, Leadership Tinggi (&gt;= 80)</p>
              </div>

              {/* TABLE OF PROMOTION CANDIDATES */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black text-slate-400 uppercase">
                      <th className="pb-3 text-center w-12">No</th>
                      <th className="pb-3">Calon Promosi / NIP</th>
                      <th className="pb-3">Jabatan Saat Ini</th>
                      <th className="pb-3 text-center">Masa Kerja</th>
                      <th className="pb-3 text-center">Skor Talenta</th>
                      <th className="pb-3 text-center">Skor Kepemimpinan</th>
                      <th className="pb-3 text-center">Status Kelayakan</th>
                      <th className="pb-3 text-center">Rekomendasi Jabatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-semibold text-slate-700">
                    {promotionCandidates.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 text-center font-black text-gray-500">{idx + 1}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                            <div>
                              <span className="font-extrabold text-[#111827] block">{p.nama}</span>
                              <span className="text-[9px] text-slate-400 font-mono block">NIP. {p.pegawai_id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="block truncate max-w-[200px]">{p.jabatan}</span>
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{p.unit_kerja}</span>
                        </td>
                        <td className="py-4 text-center text-slate-600 font-mono">{p.masa_kerja} Tahun</td>
                        <td className="py-4 text-center font-bold text-slate-900 font-mono">{p.total_nilai}</td>
                        <td className="py-4 text-center font-bold text-slate-900 font-mono">{p.leadership}</td>
                        <td className="py-4 text-center">
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[9px] uppercase tracking-wider block">
                            Layak Promosi
                          </span>
                        </td>
                        <td className="py-4 text-center text-indigo-600 font-extrabold uppercase text-[10px]">
                          Eselon Tingkat Lanjut / {p.rekomendasi_jabatan}
                        </td>
                      </tr>
                    ))}
                    {promotionCandidates.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400 font-bold">Saat ini belum ada karyawan yang memenuhi kriteria Layak Promosi (Nilai &gt; 85, Masa Kerja &gt;= 5 Thn, Lead &gt;= 80)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: PENGEMBANGAN PEGAWAI */}
          {activeTab === 'PENGEMBANGAN' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* FORM PROGRAM PENGEMBANGAN (COACHING, MENTORING, ROTASI) */}
              {canEdit && (
                <div className="lg:col-span-1 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm self-start">
                  <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Daftar Remediasi / Pelatihan</h4>
                  <p className="text-[9px] text-gray-400 font-bold mb-6">Tambahkan program bimbingan karir seperti Coaching, Mentoring, atau Rotasi Jabatan</p>

                  <form onSubmit={handleSavePengembangan} className="space-y-4">
                    {/* SELECT EMPLOYEE */}
                    <SearchableSelect 
                      label="Pegawai Sasaran"
                      placeholder="Cari Pegawai..."
                      options={selectOptions}
                      value={formPengembangan.pegawai_id}
                      onChange={(val) => setFormPengembangan({ ...formPengembangan, pegawai_id: val })}
                    />

                    {/* JENIS INSTRUKSI */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Jenis Pengembangan</label>
                      <select 
                        className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-bold w-full focus:outline-blue-500"
                        value={formPengembangan.jenis_pengembangan}
                        onChange={(e) => setFormPengembangan({ ...formPengembangan, jenis_pengembangan: e.target.value })}
                      >
                        <option value="Coaching">Coaching Mandiri</option>
                        <option value="Mentoring">Mentoring Suksesi</option>
                        <option value="Pelatihan">Pelatihan Kompetensi</option>
                        <option value="Rotasi Jabatan">Rotasi Jabatan Struktur</option>
                      </select>
                    </div>

                    {/* NAMA PROGRAM */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Nama Pelatihan / Program</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="contoh: Diklat Kepemimpinan / Coaching PIP" 
                        className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-bold w-full focus:outline-blue-500"
                        value={formPengembangan.nama_pelatihan}
                        onChange={(e) => setFormPengembangan({ ...formPengembangan, nama_pelatihan: e.target.value })}
                      />
                    </div>

                    {/* DURATION */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mulai</label>
                        <input 
                          type="date" 
                          required 
                          className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-semibold w-full focus:outline-blue-500"
                          value={formPengembangan.tanggal_mulai}
                          onChange={(e) => setFormPengembangan({ ...formPengembangan, tanggal_mulai: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Selesai</label>
                        <input 
                          type="date" 
                          required 
                          className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-semibold w-full focus:outline-blue-500"
                          value={formPengembangan.tanggal_selesai}
                          onChange={(e) => setFormPengembangan({ ...formPengembangan, tanggal_selesai: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* STATUS */}
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest">Status Pelaksanaan</label>
                      <select 
                        className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-2.5 text-xs font-bold w-full focus:outline-blue-500"
                        value={formPengembangan.status}
                        onChange={(e) => setFormPengembangan({ ...formPengembangan, status: e.target.value })}
                      >
                        <option value="Belum mulai">Belum mulai</option>
                        <option value="Berjalan">Berjalan</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>

                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[9px] uppercase tracking-wider shadow-md disabled:bg-blue-400"
                    >
                      {submitting ? 'Menyimpan...' : 'Daftarkan Program'}
                    </button>
                  </form>
                </div>
              )}

              {/* LIST TRAINING PROGRAMS TABLE */}
              <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Daftar Program Pengembangan Aktif</h4>
                  <p className="text-[9px] text-gray-400 font-bold">Pemantauan kegiatan pelatihan, mentoring, coaching, dan rotasi yang terdaftar</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-[9px] font-black text-slate-400 uppercase">
                        <th className="pb-3">Pegawai NIP</th>
                        <th className="pb-3">Program & Penyelenggara</th>
                        <th className="pb-3 text-center">Tipe</th>
                        <th className="pb-3 text-center">Tanggal Pelaksanaan</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-semibold text-slate-700">
                      {pengembanganList.map((p) => {
                        const peg = findPegawai(p.pegawai_id);
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3">
                              <span className="font-extrabold text-[#111827] block">{peg ? formatPegawaiName(peg.nama) : 'Karyawan'}</span>
                              <span className="text-[9px] text-slate-400 block font-mono">NIP. {p.pegawai_id}</span>
                            </td>
                            <td className="py-3">
                              <span className="block font-bold">{p.nama_pelatihan}</span>
                              <span className="text-[9px] text-slate-400 block uppercase font-bold">{p.penyelenggara}</span>
                            </td>
                            <td className="py-3 text-center">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[8px] font-black uppercase tracking-wider">
                                {p.jenis_pengembangan}
                              </span>
                            </td>
                            <td className="py-3 text-center text-slate-500 font-mono text-[9px]">
                              {p.tanggal_mulai} s/d {p.tanggal_selesai}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                p.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                                p.status === 'Berjalan' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {pengembanganList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">Saat ini belum ada bimbingan pengembangan karir yang didaftarkan.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: IMPORT EXCEL DATA */}
          {activeTab === 'IMPORT_EXPORT' && canEdit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* EXCEL IMPORT */}
              <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Import Data Penilaian Via Excel</h4>
                <p className="text-[9px] text-gray-400 font-bold leading-relaxed">
                  Gunakan template standard XLS. Pastikan terdapat kolom **NIP**, **NILAI_SKP**, **KOMPETENSI**, **LEADERSHIP**, dan **INTEGRITAS** sebelum mengupload berkas evaluasi. Sistem akan melakukan validasi ganda secara otomatis.
                </p>

                <div className="p-8 border-2 border-dashed border-slate-250 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center text-center">
                  <i className="bi bi-file-earmark-arrow-up text-4xl text-slate-400 mb-3 block"></i>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase mb-4">Seret Berkas ke Sini atau Ambil Manual</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".xls,.xlsx" 
                    onChange={handleImportExcel} 
                    className="text-xs font-semibold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-black file:uppercase file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
                  />
                </div>
              </div>

              {/* REPORT TEMPLATES & MANUALS */}
              <div className="p-6 md:p-8 bg-slate-900 text-white rounded-3xl space-y-6">
                <div>
                  <h4 className="text-[12px] font-black tracking-widest text-slate-400 uppercase mb-1">Pedoman Impor Data</h4>
                  <p className="text-[9px] text-slate-500 font-bold leading-relaxed">Panduan pengerjaan excel import talenta ASN</p>
                </div>
                <div className="space-y-3 text-[10px] text-slate-300 font-medium leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">1</span>
                    Kolom NIP wajib diisi lengkap (18 digit angka tanpa spasi) dan pegawai harus sudah terdaftar di Primary Sheets.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">2</span>
                    Rentang skor kompetensi dan performa SKP adalah 0 sampai dengan 100.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[8px] text-white">3</span>
                    Sistem akan secara otomatis me-reinkarnasi ranking talent pool pasca import berhasil dilaksanakan.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
