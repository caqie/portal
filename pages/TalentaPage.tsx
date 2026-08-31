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

  // Assessment/Evaluation form state (aligned with BKN 411/2025 Standard)
  const [formPenilaian, setFormPenilaian] = useState({
    id: '',
    nilai_skp: 80,       // Storing Sumbu Y (Kinerja) Score (0-100)
    kompetensi: 80,      // Storing Sumbu X (Potensial) Score (0-100)
    integritas: 100,
    disiplin: 80,
    leadership: 80,
    teamwork: 80,
    inovasi: 80,
    komunikasi: 80,
    pendidikan: 'S1',
    pengalaman: 3,

    // BKN 411/2025 Standard Sub-components
    bkn_kinerja_utama: 80,            // Penilaian Kinerja (SKP) (60%)
    bkn_penghargaan: 0,               // Penghargaan (15%)
    bkn_penugasan_tim: 0,             // Penugasan Tim Kerja (15%)
    bkn_umpan_balik_360: 80,          // Umpan Balik 360 (10%)
    
    bkn_penilaian_kompetensi: 80,     // Sumbu X: Penilaian Kompetensi (20%)
    bkn_pengembangan_kompetensi: 0,   // Sumbu X: Pengembangan Kompetensi (10%)
    bkn_pengalaman_jabatan: 60,       // Sumbu X: Pengalaman Jabatan (10%)
    bkn_penilaian_potensi: 80,        // Sumbu X: Penilaian Potensi (25%)
    bkn_pendidikan: 'S1',             // Sumbu X: Pendidikan Formal (10%)
    bkn_kesesuaian_ilmu: 100,         // Sumbu X: Kesesuaian Bidang Ilmu (10%)
    bkn_rekam_disiplin: 100,          // Sumbu X: Rekam Jejak Disiplin (15%)

    // Experience calculation items (averaged into bkn_pengalaman_jabatan)
    exp_lama_jabatan: 60,
    exp_keragaman_riwayat: 60,
    exp_penugasan_nondefinitif: 0,

    // Potential rating items (summed/converted to bkn_penilaian_potensi)
    pot_intel: 3,
    pot_inter: 3,
    pot_diri: 3,
    pot_kritis: 3,
    pot_masalah: 3,
    pot_emosi: 3,
    pot_belajar: 3,
    pot_motivasi: 3,

    // Adaptive technical competency integration (Tabel 14 & 16)
    target_jenjang: 'Jabatan Administrator',
    nilai_kompetensi_teknis: 80,
    integrasi_kemampuan_teknis: false,
  });

  // Helper to pack and unpack extra BKN attributes into the DB created_at timestamp column
  const packBknMetadata = (createdAt: string, data: any) => {
    const cleanTime = createdAt.split(';')[0];
    return `${cleanTime};${JSON.stringify(data)}`;
  };

  const unpackBknData = (record: PenilaianTalenta) => {
    const defaultData = {
      bkn_kinerja_utama: record.leadership ?? 80,
      bkn_penghargaan: record.inovasi ?? 0,
      bkn_penugasan_tim: record.komunikasi ?? 0,
      bkn_umpan_balik_360: record.teamwork ?? 80,
      bkn_penilaian_kompetensi: record.inovasi ?? 80,
      bkn_pengembangan_kompetensi: record.komunikasi ?? 0,
      bkn_pengalaman_jabatan: record.pengalaman ? Math.min(record.pengalaman * 10, 100) : 60,
      bkn_penilaian_potensi: record.disiplin ?? 80,
      bkn_pendidikan: record.pendidikan ?? 'S1',
      bkn_kesesuaian_ilmu: 100,
      bkn_rekam_disiplin: record.integritas ?? 100,
      exp_lama_jabatan: 60,
      exp_keragaman_riwayat: 60,
      exp_penugasan_nondefinitif: 0,
      pot_intel: 3,
      pot_inter: 3,
      pot_diri: 3,
      pot_kritis: 3,
      pot_masalah: 3,
      pot_emosi: 3,
      pot_belajar: 3,
      pot_motivasi: 3,
      target_jenjang: 'Jabatan Administrator',
      nilai_kompetensi_teknis: 80,
      integrasi_kemampuan_teknis: false
    };

    if (!record.created_at) return defaultData;
    const parts = record.created_at.split(';');
    if (parts.length < 2) return defaultData;
    try {
      const parsed = JSON.parse(parts[1]);
      return { ...defaultData, ...parsed };
    } catch (e) {
      return defaultData;
    }
  };

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
      setPegawaiList((peg || []).filter(p => (p.status || 'Aktif').trim().toUpperCase() === 'AKTIF'));
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

  // Formula otomatis sesuai Keputusan Kepala BKN Nomor 411 Tahun 2025
  const calculateBknSumbuY = (data: any) => {
    // Penilaian Kinerja (Kinerja Utama): Bobot 60%
    const skpVal = parseFloat(data.bkn_kinerja_utama ?? data.leadership ?? data.nilai_skp ?? 80);
    // Kinerja Penguat:
    const penghargaanVal = parseFloat(data.bkn_penghargaan ?? data.inovasi ?? 0);
    const penugasanVal = parseFloat(data.bkn_penugasan_tim ?? data.komunikasi ?? 0);
    const umpanBalikVal = parseFloat(data.bkn_umpan_balik_360 ?? data.teamwork ?? 80);

    const sumbuY = (skpVal * 0.60) + (penghargaanVal * 0.15) + (penugasanVal * 0.15) + (umpanBalikVal * 0.10);
    return parseFloat(sumbuY.toFixed(2));
  };

  const calculateBknSumbuX = (data: any) => {
    // 1. Penilaian Kompetensi (Bobot 20%)
    const kompetensiVal = parseFloat(data.bkn_penilaian_kompetensi ?? data.inovasi ?? data.kompetensi ?? 80);
    // 2. Pengembangan Kompetensi (Bobot 10%)
    const pengembanganVal = parseFloat(data.bkn_pengembangan_kompetensi ?? data.komunikasi ?? 0);
    // 3. Pengalaman Jabatan (Bobot 10%)
    const pengalamanVal = parseFloat(data.bkn_pengalaman_jabatan ?? (data.pengalaman ? Math.min(data.pengalaman * 10, 100) : 60));
    // 4. Penilaian Potensi (Bobot 25%)
    const potensiVal = parseFloat(data.bkn_penilaian_potensi ?? data.disiplin ?? 80);
    
    // 5. Tingkat Pendidikan Formal (Bobot 10%)
    const pendStr = data.bkn_pendidikan ?? data.pendidikan ?? 'S1';
    const pendScoreMap: Record<string, number> = { 'S3': 100, 'S2': 90, 'S1': 80, 'D4': 80, 'D3': 70, 'SLTA': 60 };
    const pendVal = pendScoreMap[pendStr] || 80;
    
    // 6. Kesesuaian Bidang Ilmu (Bobot 10%)
    const kesesuaianVal = parseFloat(data.bkn_kesesuaian_ilmu ?? 100);
    
    // 7. Verifikasi Rekam Jejak Disiplin (Bobot 15%)
    const disiplinVal = parseFloat(data.bkn_rekam_disiplin ?? data.integritas ?? 100);

    const sumbuX = 
      (kompetensiVal * 0.20) + 
      (pengembanganVal * 0.10) + 
      (pengalamanVal * 0.10) + 
      (potensiVal * 0.25) + 
      (pendVal * 0.10) + 
      (kesesuaianVal * 0.10) + 
      (disiplinVal * 0.15);

    return parseFloat(sumbuX.toFixed(2));
  };

  const calculateTotalNilai = (data: any) => {
    const sumbuY = calculateBknSumbuY(data);
    const sumbuX = calculateBknSumbuX(data);
    const talentaScore = (0.50 * sumbuY) + (0.50 * sumbuX);

    // Apply adaptive competencies if enabled
    if (data.integrasi_kemampuan_teknis) {
      let bobotTalenta = 0.60;
      let bobotTeknis = 0.40;
      if (data.target_jenjang === 'JPT Madya') {
        bobotTalenta = 0.80;
        bobotTeknis = 0.20;
      } else if (data.target_jenjang === 'JPT Pratama') {
        bobotTalenta = 0.70;
        bobotTeknis = 0.30;
      } else if (data.target_jenjang === 'Jabatan Administrator') {
        bobotTalenta = 0.60;
        bobotTeknis = 0.40;
      } else if (data.target_jenjang === 'Jabatan Pengawas') {
        bobotTalenta = 0.50;
        bobotTeknis = 0.50;
      }
      const finalScore = (bobotTalenta * talentaScore) + (bobotTeknis * (parseFloat(data.nilai_kompetensi_teknis) || 80));
      return parseFloat(finalScore.toFixed(2));
    }

    return parseFloat(talentaScore.toFixed(2));
  };

  const getKategoriTalenta = (score: number): 'Future Leader' | 'High Potential' | 'Talent Ready' | 'Need Development' => {
    if (score >= 90) return 'Future Leader';
    if (score >= 80) return 'High Potential';
    if (score >= 70) return 'Talent Ready';
    return 'Need Development';
  };

  const getSkpCategory = (score: number) => {
    if (score > 100) {
      return {
        label: 'Di Atas Ekspektasi',
        description: 'Sebagian besar atau seluruh hasil kerja Anda melampaui target yang ditetapkan, serta memberikan dampak tambahan yang positif bagi unit kerja atau instansi. (Nilai Akhir Kinerja > 100)',
        color: 'text-indigo-600 bg-indigo-50 border-indigo-100'
      };
    } else if (score >= 90) {
      return {
        label: 'Sesuai Ekspektasi',
        description: 'Hasil kerja Anda tepat sasaran, memenuhi target, dan sesuai dengan standar kualitas yang telah ditentukan. (Nilai Akhir Kinerja 90 - 100)',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100'
      };
    } else {
      return {
        label: 'Di Bawah Ekspektasi',
        description: 'Hasil kerja tidak mencapai target dan memerlukan perbaikan atau pembinaan. (Nilai Akhir Kinerja < 90)',
        color: 'text-rose-600 bg-rose-50 border-rose-100'
      };
    }
  };

  // Calculate ninebox placement coordinates based precisely on BKN 411/2025 thresholds (80 and 60)
  const classifyScoreRange = (score: number) => {
    if (score >= 80) return 'HIGH';
    if (score >= 60) return 'MEDIUM';
    return 'LOW';
  };

  const calculateNineBoxPos = (kinerjaScore: number, potensiScore: number) => {
    const kinType = classifyScoreRange(kinerjaScore);
    const potType = classifyScoreRange(potensiScore);

    if (kinType === 'HIGH' && potType === 'HIGH') return { box: 'Box 9: Future Star', rec: 'Promosi / Penugasan Khusus / Akselerasi Karir' };
    if (kinType === 'HIGH' && potType === 'MEDIUM') return { box: 'Box 7: High Professional', rec: 'Rotasi Jabatan / Pengembangan Kepemimpinan / Suksesor' };
    if (kinType === 'HIGH' && potType === 'LOW') return { box: 'Box 4: Effective Employee', rec: 'Bimbingan Teknis / Peningkatan Potensi / Mentoring' };
    if (kinType === 'MEDIUM' && potType === 'HIGH') return { box: 'Box 8: High Performer', rec: 'Coaching / Tugas Belajar / Peningkatan Kinerja' };
    if (kinType === 'MEDIUM' && potType === 'MEDIUM') return { box: 'Box 5: Core Employee', rec: 'Pengembangan Kompetensi / Jalur Karir Mandiri' };
    if (kinType === 'MEDIUM' && potType === 'LOW') return { box: 'Box 2: Dilemma', rec: 'Pembinaan Kinerja / Pelatihan Terfokus' };
    if (kinType === 'LOW' && potType === 'HIGH') return { box: 'Box 6: High Potential', rec: 'Evaluasi Jabatan / Program Re-edukasi' };
    if (kinType === 'LOW' && potType === 'MEDIUM') return { box: 'Box 3: Enigma', rec: 'Performance Improvement Plan (PIP) / Pendampingan' };
    return { box: 'Box 1: Low Performer', rec: 'PIP Intensif / Penempatan Ulang' };
  };

  // Handle select employee in Evaluation Form
  useEffect(() => {
    if (selectedPegawaiId) {
      const existingPenilaian = penilaianList.find(p => p.pegawai_id === selectedPegawaiId || p.pegawai_id === findPegawai(selectedPegawaiId)?.nip);
      if (existingPenilaian) {
        const bknData = unpackBknData(existingPenilaian);
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
          ...bknData
        });
      } else {
        // Prepare blank default evaluation
        const peg = findPegawai(selectedPegawaiId);
        setFormPenilaian({
          id: `TAL-${selectedPegawaiId}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
          nilai_skp: 80,
          kompetensi: 80,
          integritas: 100,
          disiplin: 80,
          leadership: 80,
          teamwork: 80,
          inovasi: 80,
          komunikasi: 80,
          pendidikan: peg?.pendidikan || 'S1',
          pengalaman: parseInt(peg?.masaKerja || '0') || 3,

          // BKN 411/2025 Standard Default Sub-components
          bkn_kinerja_utama: 80,
          bkn_penghargaan: 0,
          bkn_penugasan_tim: 0,
          bkn_umpan_balik_360: 80,
          bkn_penilaian_kompetensi: 80,
          bkn_pengembangan_kompetensi: 0,
          bkn_pengalaman_jabatan: 60,
          bkn_penilaian_potensi: 80,
          bkn_pendidikan: peg?.pendidikan || 'S1',
          bkn_kesesuaian_ilmu: 100,
          bkn_rekam_disiplin: 100,

          // Experience calculation items (averaged into bkn_pengalaman_jabatan)
          exp_lama_jabatan: 60,
          exp_keragaman_riwayat: 60,
          exp_penugasan_nondefinitif: 0,

          // Potential rating items (summed/converted to bkn_penilaian_potensi)
          pot_intel: 3,
          pot_inter: 3,
          pot_diri: 3,
          pot_kritis: 3,
          pot_masalah: 3,
          pot_emosi: 3,
          pot_belajar: 3,
          pot_motivasi: 3,

          target_jenjang: 'Jabatan Administrator',
          nilai_kompetensi_teknis: 80,
          integrasi_kemampuan_teknis: false,
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
    
    // Perform live calculation of Sumbu Y, Sumbu X, and overall score
    const sumbuY = calculateBknSumbuY(formPenilaian);
    const sumbuX = calculateBknSumbuX(formPenilaian);
    const total_nilai = calculateTotalNilai(formPenilaian);
    const kategori_talenta = getKategoriTalenta(total_nilai);

    const bknObj = {
      bkn_kinerja_utama: formPenilaian.bkn_kinerja_utama,
      bkn_penghargaan: formPenilaian.bkn_penghargaan,
      bkn_penugasan_tim: formPenilaian.bkn_penugasan_tim,
      bkn_umpan_balik_360: formPenilaian.bkn_umpan_balik_360,
      bkn_penilaian_kompetensi: formPenilaian.bkn_penilaian_kompetensi,
      bkn_pengembangan_kompetensi: formPenilaian.bkn_pengembangan_kompetensi,
      bkn_pengalaman_jabatan: formPenilaian.bkn_pengalaman_jabatan,
      bkn_penilaian_potensi: formPenilaian.bkn_penilaian_potensi,
      bkn_pendidikan: formPenilaian.bkn_pendidikan,
      bkn_kesesuaian_ilmu: formPenilaian.bkn_kesesuaian_ilmu,
      bkn_rekam_disiplin: formPenilaian.bkn_rekam_disiplin,
      exp_lama_jabatan: formPenilaian.exp_lama_jabatan,
      exp_keragaman_riwayat: formPenilaian.exp_keragaman_riwayat,
      exp_penugasan_nondefinitif: formPenilaian.exp_penugasan_nondefinitif,
      pot_intel: formPenilaian.pot_intel,
      pot_inter: formPenilaian.pot_inter,
      pot_diri: formPenilaian.pot_diri,
      pot_kritis: formPenilaian.pot_kritis,
      pot_masalah: formPenilaian.pot_masalah,
      pot_emosi: formPenilaian.pot_emosi,
      pot_belajar: formPenilaian.pot_belajar,
      pot_motivasi: formPenilaian.pot_motivasi,
      target_jenjang: formPenilaian.target_jenjang,
      nilai_kompetensi_teknis: formPenilaian.nilai_kompetensi_teknis,
      integrasi_kemampuan_teknis: formPenilaian.integrasi_kemampuan_teknis
    };

    const payloadPenilaian: PenilaianTalenta = {
      id: formPenilaian.id || `TAL-${peg.nip}-${Date.now()}`,
      pegawai_id: peg.nip, // save NIP consistently
      nilai_skp: sumbuY,    // Save calculated Sumbu Y (Kinerja)
      kompetensi: sumbuX,   // Save calculated Sumbu X (Potensial)
      integritas: formPenilaian.bkn_rekam_disiplin,
      disiplin: Math.round(formPenilaian.bkn_penilaian_potensi),
      leadership: formPenilaian.bkn_kinerja_utama,
      teamwork: formPenilaian.bkn_umpan_balik_360,
      inovasi: formPenilaian.bkn_penilaian_kompetensi,
      komunikasi: formPenilaian.bkn_pengembangan_kompetensi,
      pendidikan: formPenilaian.bkn_pendidikan,
      pengalaman: formPenilaian.bkn_pengalaman_jabatan,
      total_nilai,
      kategori_talenta,
      created_at: packBknMetadata(new Date().toISOString(), bknObj)
    };

    // Auto calculate and update NineBox coordinates directly using BKN thresholds (80 and 60)
    const nbInfo = calculateNineBoxPos(sumbuY, sumbuX);
    const payloadNineBox: NineBoxTalenta = {
      id: `NB-${peg.nip}`,
      pegawai_id: peg.nip,
      kinerja: sumbuY,
      potensi: sumbuX,
      posisi_box: nbInfo.box,
      rekomendasi: nbInfo.rec
    };

    // Determine readiness level
    const existingPool = talentPoolList.find(t => t.pegawai_id === peg.nip);
    let rl = 'Medium';
    if (total_nilai >= 80) rl = 'High';
    else if (total_nilai < 60) rl = 'Low';

    const payloadTalentPool: TalentPool = {
      id: existingPool?.id || `TP-${peg.nip}`,
      pegawai_id: peg.nip,
      ranking: existingPool?.ranking || (talentPoolList.length + 1),
      status_talenta: total_nilai >= 80 && parseInt(peg.masaKerja || '0') >= 5 ? 'Layak Promosi' : 'Kader Potensial',
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
        showAlert('success', `Berhasil menyimpan penilaian untuk ${peg.nama} (BKN-411/2025). Total Nilai: ${total_nilai} (${kategori_talenta})`);
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

  const isRegularUser = !canEdit;

  // Find logged-in user profile from pegawai list
  const currentUserPegawai = useMemo(() => {
    if (!user) return null;
    return pegawaiList.find(p => 
      (user.nip && (p.nip === user.nip || p.id === user.nip)) ||
      (user.name && p.nama && (p.nama.toLowerCase().trim() === user.name.toLowerCase().trim() || p.nama.toLowerCase().includes(user.name.toLowerCase())))
    ) || null;
  }, [pegawaiList, user]);

  const targetUserNip = currentUserPegawai?.nip || currentUserPegawai?.id || user?.nip || '';

  const myPenilaian = useMemo(() => {
    if (!targetUserNip && !currentUserPegawai) return null;
    return penilaianList.find(p => 
      (targetUserNip && p.pegawai_id === targetUserNip) ||
      (currentUserPegawai && (p.pegawai_id === currentUserPegawai.id || p.pegawai_id === currentUserPegawai.nip))
    ) || null;
  }, [penilaianList, targetUserNip, currentUserPegawai]);

  const myTalentPool = useMemo(() => {
    if (!targetUserNip && !currentUserPegawai) return null;
    return talentPoolList.find(t => 
      (targetUserNip && t.pegawai_id === targetUserNip) ||
      (currentUserPegawai && (t.pegawai_id === currentUserPegawai.id || t.pegawai_id === currentUserPegawai.nip))
    ) || null;
  }, [talentPoolList, targetUserNip, currentUserPegawai]);

  const myPengembanganList = useMemo(() => {
    if (!targetUserNip && !currentUserPegawai) return [];
    return pengembanganList.filter(p => 
      (targetUserNip && p.pegawai_id === targetUserNip) ||
      (currentUserPegawai && (p.pegawai_id === currentUserPegawai.id || p.pegawai_id === currentUserPegawai.nip))
    );
  }, [pengembanganList, targetUserNip, currentUserPegawai]);

  // Auto-select logged-in user when in regular user mode
  useEffect(() => {
    if (isRegularUser && currentUserPegawai && !selectedPegawaiId) {
      setSelectedPegawaiId(currentUserPegawai.id || currentUserPegawai.nip);
    }
  }, [isRegularUser, currentUserPegawai, selectedPegawaiId]);

  // Fallback tab for regular users if on restricted tabs
  useEffect(() => {
    if (isRegularUser && (activeTab === 'TALENT_POOL' || activeTab === 'IMPORT_EXPORT')) {
      setActiveTab('DASHBOARD');
    }
  }, [isRegularUser, activeTab]);

  // Filter pegawai list based on roles
  const filteredPegawaiList = useMemo(() => {
    if (isRegularUser) {
      if (currentUserPegawai) return [currentUserPegawai];
      if (user?.nip) return pegawaiList.filter(p => p.nip === user.nip);
      return [];
    }
    return pegawaiList;
  }, [pegawaiList, isRegularUser, currentUserPegawai, user]);

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
    let sourcePenilaian = isRegularUser 
      ? (myPenilaian ? [myPenilaian] : []) 
      : penilaianList;
    let sourceTalentPool = isRegularUser 
      ? (myTalentPool ? [myTalentPool] : []) 
      : talentPoolList;

    let list = sourcePenilaian.map((pen, i) => {
      const peg = findPegawai(pen.pegawai_id) || (isRegularUser ? currentUserPegawai : null);
      const pool = sourceTalentPool.find(t => t.pegawai_id === pen.pegawai_id);
      return {
        ...pen,
        nama: peg ? formatPegawaiName(peg.nama) : 'Karyawan',
        jabatan: peg?.jabatan || 'Jabatan Fungsional',
        unit_kerja: peg?.unitKerja || 'DJKI',
        foto: peg?.foto || '',
        masa_kerja: parseInt(peg?.masaKerja || '0') || 0,
        status_talenta: pool?.status_talenta || 'Kader Potensial',
        readiness_level: pool?.readiness_level || 'Medium',
        rekomendasi_jabatan: pool?.rekomendasi_jabatan || peg?.jabatan || 'Jabatan Target'
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
  }, [penilaianList, talentPoolList, pegawaiList, filterUnitKerja, filterJabatan, filterKategori, searchQuery, isRegularUser, myPenilaian, myTalentPool, currentUserPegawai]);

  // Special promotion readiness filter (Rekomendasi Promosi)
  // Kebutuhan: nilai > 85, masa kerja >= 5 tahun, leadership tinggi (>= 80)
  const promotionCandidates = useMemo(() => {
    return processedTalentPool.filter(p => p.total_nilai > 85 && p.masa_kerja >= 5 && p.leadership >= 80);
  }, [processedTalentPool]);

  // Radar data for personal assessment
  const myRadarData = useMemo(() => {
    const p = myPenilaian;
    if (!p) {
      return [
        { subject: 'SKP (Kinerja)', value: 0, fullMark: 100 },
        { subject: 'Kompetensi', value: 0, fullMark: 100 },
        { subject: 'Kepemimpinan', value: 0, fullMark: 100 },
        { subject: 'Integritas', value: 0, fullMark: 100 },
        { subject: 'Disiplin', value: 0, fullMark: 100 },
        { subject: 'Kerjasama Tim', value: 0, fullMark: 100 },
        { subject: 'Inovasi', value: 0, fullMark: 100 },
        { subject: 'Komunikasi', value: 0, fullMark: 100 }
      ];
    }
    return [
      { subject: 'SKP (Kinerja)', value: p.nilai_skp || 80, fullMark: 100 },
      { subject: 'Kompetensi', value: p.kompetensi || 80, fullMark: 100 },
      { subject: 'Kepemimpinan', value: p.leadership || 80, fullMark: 100 },
      { subject: 'Integritas', value: p.integritas || 100, fullMark: 100 },
      { subject: 'Disiplin', value: p.disiplin || 80, fullMark: 100 },
      { subject: 'Kerjasama Tim', value: p.teamwork || 80, fullMark: 100 },
      { subject: 'Inovasi', value: p.inovasi || 80, fullMark: 100 },
      { subject: 'Komunikasi', value: p.komunikasi || 80, fullMark: 100 }
    ];
  }, [myPenilaian]);

  // Aggregate stats for charts
  const competencyChartData = useMemo(() => {
    if (isRegularUser) {
      if (!myPenilaian) return [];
      return [
        { name: 'SKP', value: myPenilaian.nilai_skp || 0 },
        { name: 'Kompetensi', value: myPenilaian.kompetensi || 0 },
        { name: 'Leadership', value: myPenilaian.leadership || 0 },
        { name: 'Integritas', value: myPenilaian.integritas || 0 },
        { name: 'Disiplin', value: myPenilaian.disiplin || 0 },
        { name: 'Teamwork', value: myPenilaian.teamwork || 0 },
        { name: 'Inovasi', value: myPenilaian.inovasi || 0 },
        { name: 'Komunikasi', value: myPenilaian.komunikasi || 0 }
      ];
    }

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
  }, [penilaianList, isRegularUser, myPenilaian]);

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
      {isRegularUser && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-between gap-4 text-blue-900 no-print shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
              <i className="bi bi-shield-lock-fill"></i>
            </div>
            <div>
              <p className="text-xs font-black text-blue-950 uppercase tracking-wider">Akses Mandiri Pegawai (Private & Confidential)</p>
              <p className="text-[11px] font-medium text-blue-700/90 mt-0.5">
                Anda login sebagai <span className="font-bold text-blue-950">{user?.name || 'Pegawai'}</span> (NIP. {targetUserNip || '-'}). Sistem hanya menampilkan hasil penilaian kompetensi, evaluasi BKN Kepka 411/2025, dan rencana pengembangan karir personal Anda.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 hidden sm:inline-block">
            Self-Service
          </span>
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
        {isRegularUser ? (
          <>
            <button 
              onClick={() => setActiveTab('DASHBOARD')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              <i className="bi bi-person-badge text-xs"></i>
              Profil Talenta Saya
            </button>
            <button 
              onClick={() => setActiveTab('NINEBOX')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 flex items-center gap-2 ${activeTab === 'NINEBOX' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              <i className="bi bi-grid-3x3-gap-fill text-xs"></i>
              9-Box Matrix Saya
            </button>
            <button 
              onClick={() => setActiveTab('PROMOSI')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 flex items-center gap-2 ${activeTab === 'PROMOSI' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              <i className="bi bi-award-fill text-xs"></i>
              Status Kesiapan Karir
            </button>
            <button 
              onClick={() => setActiveTab('PENGEMBANGAN')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 flex items-center gap-2 ${activeTab === 'PENGEMBANGAN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              <i className="bi bi-journal-bookmark-fill text-xs"></i>
              Program Pengembangan Saya
            </button>
            <button 
              onClick={() => setActiveTab('PENILAIAN')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 flex items-center gap-2 ${activeTab === 'PENILAIAN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              <i className="bi bi-card-checklist text-xs"></i>
              Rincian Evaluasi BKN
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => setActiveTab('DASHBOARD')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'DASHBOARD' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              Dashboard Talenta
            </button>
            <button 
              onClick={() => { setActiveTab('PENILAIAN'); setSelectedPegawaiId(''); }} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'PENILAIAN' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              Form Penilaian
            </button>
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
            <button 
              onClick={() => setActiveTab('IMPORT_EXPORT')} 
              className={`px-5 py-4 font-black text-[10px] tracking-widest uppercase transition-all shrink-0 border-b-2 ${activeTab === 'IMPORT_EXPORT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
            >
              Import / Export
            </button>
          </>
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
          {activeTab === 'DASHBOARD' && (
            isRegularUser ? (
              /* DEDICATED PERSONAL TALENT DASHBOARD FOR REGULAR USER */
              <div className="space-y-8 animate-fadeIn">
                {/* 1. EMPLOYEE HERO IDENTITY CARD */}
                <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-white shrink-0">
                      {currentUserPegawai?.foto ? (
                        <img src={currentUserPegawai.foto} alt={currentUserPegawai.nama} className="h-full w-full object-cover" />
                      ) : (
                        currentUserPegawai?.nama?.charAt(0) || user?.name?.charAt(0) || 'P'
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg md:text-xl font-black text-gray-950">
                          {currentUserPegawai ? formatPegawaiName(currentUserPegawai.nama) : (user?.name || 'Pegawai DJKI')}
                        </h3>
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          ASN DJKI
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-600 font-mono">NIP. {targetUserNip || '-'}</p>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        {currentUserPegawai?.jabatan || 'Jabatan Fungsional'} • {currentUserPegawai?.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full md:w-auto shrink-0">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Masa Kerja & Pendidikan</span>
                    <p className="text-xs font-bold text-slate-800">
                      {currentUserPegawai?.masaKerja || '0'} Tahun Pengabdian • {currentUserPegawai?.pendidikan || 'S1'}
                    </p>
                    <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1">
                      Status: {currentUserPegawai?.status || 'Aktif'}
                    </span>
                  </div>
                </div>

                {/* 2. FOUR PERSONAL METRIC CARDS */}
                {myPenilaian ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {/* POSISI 9-BOX */}
                      {(() => {
                        const nb = calculateNineBoxPos(myPenilaian.nilai_skp || 0, myPenilaian.kompetensi || 0);
                        const isTop = nb.box.includes('Box 9') || nb.box.includes('Box 8') || nb.box.includes('Box 7');
                        return (
                          <div className={`p-6 rounded-3xl border shadow-sm ${isTop ? 'bg-gradient-to-br from-blue-900 to-indigo-950 text-white border-blue-800' : 'bg-white text-gray-900 border-gray-100'}`}>
                            <span className={`text-[8px] font-black tracking-wider block uppercase mb-1 ${isTop ? 'text-blue-300' : 'text-slate-400'}`}>
                              Posisi 9-Box Matrix
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-xl font-black tracking-tight ${isTop ? 'text-white' : 'text-blue-600'}`}>
                                {nb.box}
                              </span>
                            </div>
                            <p className={`text-[9px] font-bold mt-2 ${isTop ? 'text-blue-200' : 'text-slate-500'}`}>
                              {nb.rec}
                            </p>
                          </div>
                        );
                      })()}

                      {/* TOTAL SKOR TALENTA */}
                      <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <span className="text-[8px] font-black text-slate-400 tracking-wider block uppercase mb-1">Total Nilai Talenta</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-gray-950 tracking-tighter">{myPenilaian.total_nilai}</span>
                          <span className="text-xs font-bold text-gray-400">/ 100</span>
                        </div>
                        <div className="mt-2">
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider inline-block ${
                            myPenilaian.kategori_talenta === 'Future Leader' ? 'bg-indigo-100 text-indigo-700' :
                            myPenilaian.kategori_talenta === 'High Potential' ? 'bg-blue-100 text-blue-700' :
                            myPenilaian.kategori_talenta === 'Talent Ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            Kategori: {myPenilaian.kategori_talenta}
                          </span>
                        </div>
                      </div>

                      {/* SUMBU KINERJA (Y) */}
                      <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <span className="text-[8px] font-black text-indigo-500 tracking-wider block uppercase mb-1">Sumbu Kinerja (Y)</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-indigo-600 tracking-tighter">{myPenilaian.nilai_skp}</span>
                          <span className="text-xs font-bold text-indigo-400">/ 100</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold mt-2">
                          SKP Utama, Penghargaan, Tim Kerja & Umpan Balik
                        </p>
                      </div>

                      {/* SUMBU POTENSI (X) */}
                      <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <span className="text-[8px] font-black text-emerald-500 tracking-wider block uppercase mb-1">Sumbu Potensi & Asesmen (X)</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-emerald-600 tracking-tighter">{myPenilaian.kompetensi}</span>
                          <span className="text-xs font-bold text-emerald-400">/ 100</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold mt-2">
                          Asesmen BKN, Pendidikan, Pengalaman & Disiplin
                        </p>
                      </div>
                    </div>

                    {/* 3. CHARTS & ANALYTICAL BREAKDOWN */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* RADAR CHART KOMPETENSI PRIBADI */}
                      <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase">Radar Kompetensi Pribadi</h4>
                            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Skala 0 - 100</span>
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold mb-6">Pemetaan 8 pilar kompetensi & perilaku ASN berdasarkan Kepka BKN 411/2025</p>
                        </div>

                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={myRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#475569' }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8' }} />
                              <Radar name="Skor Anda" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.45} />
                              <ChartTooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* RINCIAN 8 PILAR & PROMOSI READINESS */}
                      <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between">
                        <div>
                          <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Rincian Skor Indikator Penilaian</h4>
                          <p className="text-[9px] text-gray-400 font-bold mb-4">Nilai individual per dimensi evaluasi</p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">SKP Kinerja</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.nilai_skp}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Kompetensi</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.kompetensi}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Leadership</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.leadership}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Integritas</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.integritas}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Disiplin</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.disiplin}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Kerjasama</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.teamwork}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Inovasi</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.inovasi}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[8px] font-black text-slate-400 uppercase block">Komunikasi</span>
                              <span className="text-lg font-black text-slate-800">{myPenilaian.komunikasi}</span>
                            </div>
                          </div>
                        </div>

                        {/* STATUS KELAYAKAN SUKSESI */}
                        <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rekomendasi Suksesi & Karir</span>
                            <span className="text-[9px] font-black text-blue-400">{myTalentPool?.status_talenta || 'Kader Potensial'}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-200">
                            Target Jenjang: <span className="text-white font-extrabold">{myTalentPool?.rekomendasi_jabatan || currentUserPegawai?.jabatan || 'Jabatan Terget'}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
                            Berdasarkan hasil pemetaan talenta, Anda disarankan untuk terus meningkatkan Jam Pelajaran (JP) pelatihan teknis dan kepemimpinan tahunan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* NO DATA NOTIFICATION */
                  <div className="p-12 bg-white rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
                    <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                      <i className="bi bi-clock-history"></i>
                    </div>
                    <h4 className="text-base font-black text-gray-900">Data Penilaian Talenta Anda Sedang Dimutakhirkan</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                      Hasil evaluasi kompetensi dan pemetaan 9-box matrix berdasarkan standar Kepka BKN Nomor 411 Tahun 2025 untuk NIP <span className="font-mono font-bold text-gray-800">{targetUserNip || '-'}</span> sedang dalam proses verifikasi oleh Tim Kepegawaian & SDM DJKI.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* ENTERPRISE GLOBAL TALENT DASHBOARD FOR ADMIN / SUPERADMIN */
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
            )
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
                    <div className="space-y-8 animate-fadeIn text-[#1e293b]">
                      
                      {/* INFORMASI UMUM */}
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase text-blue-700 tracking-wider">Metode Penilaian</p>
                          <p className="text-[11px] font-bold text-gray-700 mt-0.5">Keputusan Kepala BKN Nomor 411 Tahun 2025 tentang Manajemen Talenta ASN</p>
                        </div>
                        <span className="px-3 py-1 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl">Regulasi Resmi</span>
                      </div>

                      {/* BAGIAN I: SUMBU KINERJA (Y) */}
                      <div className="p-6 bg-slate-50/70 rounded-3xl border border-slate-100 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                            <span className="h-5 w-5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">Y</span>
                            Sumbu Kinerja (Y) - Bobot 100%
                          </h5>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg font-mono">
                            Skor: {calculateBknSumbuY(formPenilaian).toFixed(2)} / 100
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 1. Kinerja Utama (60%) */}
                          <div className="space-y-1.5 col-span-1 md:col-span-2">
                            <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider flex justify-between">
                              <span>1. Kinerja Utama / Hasil Kerja SKP (Bobot 60%)</span>
                              <span className="text-gray-400">Parameter Utama</span>
                            </label>
                            <select
                              className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500 shadow-sm"
                              value={formPenilaian.bkn_kinerja_utama}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setFormPenilaian({ ...formPenilaian, bkn_kinerja_utama: val, nilai_skp: val });
                              }}
                            >
                              <option value="110">Di Atas Ekspektasi (Sangat Baik / Terpuji) - [110 Poin]</option>
                              <option value="100">Sesuai Ekspektasi (Baik) - [100 Poin]</option>
                              <option value="80">Sesuai Ekspektasi (Cukup) - [80 Poin]</option>
                              <option value="60">Di Bawah Ekspektasi (Kurang) - [60 Poin]</option>
                              <option value="40">Di Bawah Ekspektasi (Sangat Kurang) - [40 Poin]</option>
                            </select>
                            <p className="text-[9px] text-gray-400 font-medium">Berdasarkan hasil SKP akhir tahun pegawai bersangkutan.</p>
                          </div>

                          {/* 2. Penghargaan (15%) */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider block">
                              2. Kinerja Penguat: Penghargaan (Bobot 15%)
                            </label>
                            <select
                              className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500 shadow-sm"
                              value={formPenilaian.bkn_penghargaan}
                              onChange={(e) => setFormPenilaian({ ...formPenilaian, bkn_penghargaan: parseFloat(e.target.value) || 0 })}
                            >
                              <option value="100">Penghargaan Tingkat Internasional - [100 Poin]</option>
                              <option value="85">Penghargaan Tingkat Nasional - [85 Poin]</option>
                              <option value="70">Satyalancana Karya Satya / Lintas Instansi - [70 Poin]</option>
                              <option value="50">Penghargaan Instansi Internal (DJKI/Kemenkumham) - [50 Poin]</option>
                              <option value="0">Tidak Memiliki Penghargaan Khusus - [0 Poin]</option>
                            </select>
                          </div>

                          {/* 3. Penugasan Tim Kerja (15%) */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider block">
                              3. Penugasan khusus / Tim Kerja (Bobot 15%)
                            </label>
                            <select
                              className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500 shadow-sm"
                              value={formPenilaian.bkn_penugasan_tim}
                              onChange={(e) => setFormPenilaian({ ...formPenilaian, bkn_penugasan_tim: parseFloat(e.target.value) || 0 })}
                            >
                              <option value="100">Ketua Tim Kerja Lintas Instansi/Nasional - [100 Poin]</option>
                              <option value="85">Ketua Tim Kerja Internal DJKI - [85 Poin]</option>
                              <option value="70">Anggota Tim Kerja Lintas Instansi - [70 Poin]</option>
                              <option value="50">Anggota Tim Kerja Internal DJKI - [50 Poin]</option>
                              <option value="0">Bukan Bagian dari Penugasan Tim Khusus - [0 Poin]</option>
                            </select>
                          </div>

                          {/* 4. Umpan Balik Perilaku 360 (10%) */}
                          <div className="space-y-1.5 col-span-1 md:col-span-2">
                            <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider block">
                              4. Umpan Balik Perilaku Kerja 360 Derajat (Bobot 10%)
                            </label>
                            <select
                              className="bg-white border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500 shadow-sm"
                              value={formPenilaian.bkn_umpan_balik_360}
                              onChange={(e) => setFormPenilaian({ ...formPenilaian, bkn_umpan_balik_360: parseFloat(e.target.value) || 0 })}
                            >
                              <option value="100">Sangat Positif (Seluruh Pihak Melampaui) - [100 Poin]</option>
                              <option value="85">Positif (Mayoritas Sesuai ekspektasi) - [85 Poin]</option>
                              <option value="70">Cukup (Ada catatan perbaikan dari rekan) - [70 Poin]</option>
                              <option value="40">Negatif (Membutuhkan pembinaan komunikasi) - [40 Poin]</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* BAGIAN II: SUMBU POTENSIAL (X) */}
                      <div className="p-6 bg-slate-50/70 rounded-3xl border border-slate-100 space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                            <span className="h-5 w-5 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-[10px]">X</span>
                            Sumbu Potensial (X) - Bobot 100%
                          </h5>
                          <span className="text-xs font-black text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-lg font-mono">
                            Skor: {calculateBknSumbuX(formPenilaian).toFixed(2)} / 100
                          </span>
                        </div>

                        <div className="space-y-6">
                          
                          {/* 1. Kompetensi (40% Total: 20% Asesmen, 10% Pengembangan, 10% Pengalaman) */}
                          <div className="p-4 bg-white rounded-2xl border border-slate-100/80 space-y-4">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b pb-1">1. Pilar Kompetensi Kerja (Bobot 40% dari Sumbu Potensial)</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Penilaian Kompetensi (20%) */}
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block font-sans">A. Nilai Penilaian Kompetensi Asesmen (20%)</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="bg-slate-50 border border-gray-200 text-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold w-full focus:outline-blue-500"
                                  value={formPenilaian.bkn_penilaian_kompetensi}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setFormPenilaian({ ...formPenilaian, bkn_penilaian_kompetensi: val, inovasi: val });
                                  }}
                                />
                              </div>

                              {/* Pengembangan Kompetensi (10%) */}
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block font-sans">B. Pengembangan Kompetensi (10%)</label>
                                <select
                                  className="bg-slate-50 border border-gray-200 text-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold w-full focus:outline-blue-500"
                                  value={formPenilaian.bkn_pengembangan_kompetensi}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setFormPenilaian({ ...formPenilaian, bkn_pengembangan_kompetensi: val });
                                  }}
                                >
                                  <option value="100">&ge; 20 JP Pelatihan Kompeten Setahun - [100 Poin]</option>
                                  <option value="80">10-19 JP Pelatihan Kompeten - [80 Poin]</option>
                                  <option value="60">5-9 JP Pelatihan / Workshop - [60 Poin]</option>
                                  <option value="40">1-4 JP Pelatihan - [40 Poin]</option>
                                  <option value="0">Tidak Ada Pelatihan Diikuti - [0 Poin]</option>
                                </select>
                              </div>

                              {/* Pengalaman Jabatan (10% - Rata-rata dari metrics pengalaman) */}
                              <div className="col-span-1 md:col-span-2 p-3 bg-slate-50 rounded-xl space-y-3">
                                <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wider block font-sans">C. Pengalaman Jabatan Komulatif (10%) - Rerata: {formPenilaian.bkn_pengalaman_jabatan} Poin</span>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Lama Masa Kerja</span>
                                    <select
                                      className="bg-white border border-gray-100 text-[10px] font-bold rounded-lg px-2 py-1 w-full"
                                      value={formPenilaian.exp_lama_jabatan}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const newAvg = Math.round((val + formPenilaian.exp_keragaman_riwayat + formPenilaian.exp_penugasan_nondefinitif) / 3);
                                        setFormPenilaian({ ...formPenilaian, exp_lama_jabatan: val, bkn_pengalaman_jabatan: newAvg });
                                      }}
                                    >
                                      <option value="100">&ge; 5 Tahun - [100]</option>
                                      <option value="80">3 - 4 Tahun - [80]</option>
                                      <option value="60">1 - 2 Tahun - [60]</option>
                                      <option value="40">&lt; 1 Tahun - [40]</option>
                                    </select>
                                  </div>

                                  <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Keragaman Riwayat</span>
                                    <select
                                      className="bg-white border border-gray-100 text-[10px] font-bold rounded-lg px-2 py-1 w-full"
                                      value={formPenilaian.exp_keragaman_riwayat}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const newAvg = Math.round((formPenilaian.exp_lama_jabatan + val + formPenilaian.exp_penugasan_nondefinitif) / 3);
                                        setFormPenilaian({ ...formPenilaian, exp_keragaman_riwayat: val, bkn_pengalaman_jabatan: newAvg });
                                      }}
                                    >
                                      <option value="100">Lintas Instansi - [100]</option>
                                      <option value="80">Lintas Unit Kerja DJKI - [80]</option>
                                      <option value="60">Hanya di 1 Unit Kerja - [60]</option>
                                    </select>
                                  </div>

                                  <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Tugas Non-Definitif</span>
                                    <select
                                      className="bg-white border border-gray-100 text-[10px] font-bold rounded-lg px-2 py-1 w-full"
                                      value={formPenilaian.exp_penugasan_nondefinitif}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        const newAvg = Math.round((formPenilaian.exp_lama_jabatan + formPenilaian.exp_keragaman_riwayat + val) / 3);
                                        setFormPenilaian({ ...formPenilaian, exp_penugasan_nondefinitif: val, bkn_pengalaman_jabatan: newAvg });
                                      }}
                                    >
                                      <option value="100">Pj. Kepala Daerah - [100]</option>
                                      <option value="80">Plt. Jabatan Tinggi - [80]</option>
                                      <option value="60">Plt. Jabatan Setara - [60]</option>
                                      <option value="40">Plh. Jabatan Setara - [40]</option>
                                      <option value="0">Tidak Ada - [0]</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 2. Potensi (25% Total - Berdasarkan 8 subindokator potensi) */}
                          <div className="p-4 bg-white rounded-2xl border border-slate-100/80 space-y-4">
                            <div className="flex justify-between items-center border-b pb-1">
                              <p className="text-[10px] font-black text-[#14b8a6] uppercase tracking-widest">2. Penilaian Potensi Individu (Bobot 25% dari Sumbu Potensial)</p>
                              <span className="text-[10px] font-black font-mono text-teal-600">Terhitung: {formPenilaian.bkn_penilaian_potensi.toFixed(0)} Poin</span>
                            </div>

                            <p className="text-[9px] text-[#475569] leading-relaxed">Asesmen 8 aspek potensi manusia (Poin skala 0 - 5 untuk masing-masing pilar di bawah):</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50/50 p-3 rounded-xl">
                              {[
                                { key: 'pot_intel', name: 'Agility Intel' },
                                { key: 'pot_inter', name: 'Interpersonal' },
                                { key: 'pot_diri', name: 'Mawas Diri' },
                                { key: 'pot_kritis', name: 'Kritis Kreatif' },
                                { key: 'pot_masalah', name: 'Selesaikan Masalah' },
                                { key: 'pot_emosi', name: 'Emosi Stabil' },
                                { key: 'pot_belajar', name: 'Kecap Belajar' },
                                { key: 'pot_motivasi', name: 'Motivasi Achv' },
                              ].map((item) => (
                                <div key={item.key} className="space-y-1">
                                  <span className="text-[7.5px] font-extrabold text-slate-500 uppercase tracking-widest block truncate text-center">{item.name}</span>
                                  <select
                                    className="bg-white border border-gray-100 text-[10px] font-bold text-slate-800 rounded-lg px-1.5 py-0.5 w-full text-center shadow-sm"
                                    value={(formPenilaian as any)[item.key]}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      const nextPen = { ...formPenilaian, [item.key]: val };
                                      // recalculate out of a total max sum of 40 points mapped to scale 100
                                      const sum = nextPen.pot_intel + nextPen.pot_inter + nextPen.pot_diri + nextPen.pot_kritis +
                                                  nextPen.pot_masalah + nextPen.pot_emosi + nextPen.pot_belajar + nextPen.pot_motivasi;
                                      const calcPot = parseFloat(((sum / 40) * 100).toFixed(2));
                                      setFormPenilaian({ ...nextPen, bkn_penilaian_potensi: calcPot, disiplin: calcPot });
                                    }}
                                  >
                                    <option value="5">5 - Istimewa</option>
                                    <option value="4">4 - Sangat Baik</option>
                                    <option value="3">3 - Baik / Rata2</option>
                                    <option value="2">2 - Cukup</option>
                                    <option value="1">1 - Kurang</option>
                                    <option value="0">0 - Nihil</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 3. Kualifikasi Pendidikan (10% + 10%) */}
                          <div className="p-4 bg-white rounded-2xl border border-slate-100/80 space-y-4">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b pb-1 col-span-2">3. Pilar Kualifikasi (Pendidikan Formal & Kesesuaian Ilmu) (Bobot 20%)</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">A. Tingkat Pendidikan Formal (Bobot 10%)</label>
                                <select 
                                  className="bg-slate-50 border border-gray-200 text-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold w-full focus:outline-blue-500"
                                  value={formPenilaian.bkn_pendidikan}
                                  onChange={(e) => setFormPenilaian({ ...formPenilaian, bkn_pendidikan: e.target.value, pendidikan: e.target.value })}
                                >
                                  <option value="S3">Doktor (S3) - [100 Poin]</option>
                                  <option value="S2">Magister (S2) - [90 Poin]</option>
                                  <option value="S1">Sarjana (S1 / D4) - [80 Poin]</option>
                                  <option value="D3">Diploma III (D3) - [70 Poin]</option>
                                  <option value="SLTA">SLTA / Sederajat - [60 Poin]</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest">B. Kesesuaian Bidang Ilmu (Bobot 10%)</label>
                                <select 
                                  className="bg-slate-50 border border-gray-200 text-[#1e293b] rounded-xl px-3 py-2 text-xs font-bold w-full focus:outline-blue-500"
                                  value={formPenilaian.bkn_kesesuaian_ilmu}
                                  onChange={(e) => setFormPenilaian({ ...formPenilaian, bkn_kesesuaian_ilmu: parseFloat(e.target.value) || 0 })}
                                >
                                  <option value="100">Sangat Relevan dengan Tugas Jabatan - [100 Poin]</option>
                                  <option value="75">Cukup Relevan dengan rumpun tugas - [75 Poin]</option>
                                  <option value="50">Tidak Relevan - [50 Poin]</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* 4. Rekam Jejak Disiplin / Integritas (15%) */}
                          <div className="space-y-2 p-4 bg-white rounded-2xl border border-slate-100/80">
                            <label className="text-[10px] font-black text-[#dc2626] uppercase tracking-widest block border-b pb-1 col-span-2 text-rose-600">4. Verifikasi Rekam Jejak Disiplin, Kode Etik & Integritas (Bobot 15%)</label>
                            <select
                              className="bg-slate-50 border border-gray-200 text-[#1e293b] rounded-xl px-4 py-3 text-xs font-bold w-full focus:outline-blue-500 shadow-sm"
                              value={formPenilaian.bkn_rekam_disiplin}
                              onChange={(e) => setFormPenilaian({ ...formPenilaian, bkn_rekam_disiplin: parseFloat(e.target.value) || 0, integritas: parseFloat(e.target.value) || 0 })}
                            >
                              <option value="100">Bersih / Tidak Pernah Dijatuhi Hukuman Disiplin (Hukdis) - [100 Poin]</option>
                              <option value="75">Pernah Dijatuhi Hukdis Ringan - [75 Poin]</option>
                              <option value="50">Pernah Dijatuhi Hukdis Sedang - [50 Poin]</option>
                              <option value="25">Pernah Dijatuhi Hukdis Berat (Telah Dilewati) - [25 Poin]</option>
                              <option value="0">Sedang Menjalani Hukdis Aktif atau Kasus Hukum - [0 Poin]</option>
                            </select>
                          </div>

                        </div>
                      </div>

                      {/* BAGIAN III: ADAPTASI KOMPETENSI TEKNIS */}
                      <div className="p-6 bg-[#f0fdf4]/80 rounded-3xl border border-[#bbf7d0]/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase text-[#15803d] tracking-wider">Integrasi Kemampuan Teknis (Tabel 14 & 16 BKN)</p>
                            <p className="text-[11px] font-bold text-gray-700 mt-0.5">Adaptasi khusus sukesi kualifikasi teknis spesifik jabatan</p>
                          </div>
                          
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={formPenilaian.integrasi_kemampuan_teknis}
                              onChange={(e) => setFormPenilaian({ ...formPenilaian, integrasi_kemampuan_teknis: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="ml-2 text-[10px] font-black uppercase text-slate-700 font-sans">Aktif</span>
                          </label>
                        </div>

                        {formPenilaian.integrasi_kemampuan_teknis && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#bbf7d0]/30 animate-fadeIn text-[#15803d]">
                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase tracking-wider block">Target Jenjang Jabatan</span>
                              <select
                                className="bg-white border border-[#bbf7d0] text-slate-800 rounded-xl px-3 py-2 text-xs font-bold w-full"
                                value={formPenilaian.target_jenjang}
                                onChange={(e) => setFormPenilaian({ ...formPenilaian, target_jenjang: e.target.value })}
                              >
                                <option value="JPT Madya">JPT Madya (80% Talenta, 20% Teknis)</option>
                                <option value="JPT Pratama">JPT Pratama (70% Talenta, 30% Teknis)</option>
                                <option value="Jabatan Administrator">Jabatan Administrator (60% Talenta, 40% Teknis)</option>
                                <option value="Jabatan Pengawas">Jabatan Pengawas (50% Talenta, 50% Teknis)</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase tracking-wider block">Nilai Asesmen Teknis Spesifik (0 - 100)</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                className="bg-white border border-[#bbf7d0] text-slate-800 rounded-xl px-3 py-2 text-xs font-bold w-full"
                                value={formPenilaian.nilai_kompetensi_teknis}
                                onChange={(e) => setFormPenilaian({ ...formPenilaian, nilai_kompetensi_teknis: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        )}
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

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Metrik Sumbu BKN-411/2025:</p>
                        
                        {/* SUMBU Y KINERJA DETAILS */}
                        <div className="p-3 bg-slate-800/80 rounded-xl space-y-1.5 border border-white/5">
                          <div className="flex justify-between text-[10px] font-extrabold text-indigo-400">
                            <span>SUMBU Y (Kinerja)</span>
                            <span>{calculateBknSumbuY(formPenilaian).toFixed(2)} Poin</span>
                          </div>
                          <div className="text-[9.5px]/4 text-slate-300 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">1. Kinerja Utama (60%):</span>
                              <span>{(formPenilaian.bkn_kinerja_utama * 0.6).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">2. Penghargaan (15%):</span>
                              <span>{(formPenilaian.bkn_penghargaan * 0.15).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">3. Penugasan Kerja (15%):</span>
                              <span>{(formPenilaian.bkn_penugasan_tim * 0.15).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">4. Umpan Balik 360 (10%):</span>
                              <span>{(formPenilaian.bkn_umpan_balik_360 * 0.10).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>

                        {/* SUMBU X POTENSIAL DETAILS */}
                        <div className="p-3 bg-slate-800/80 rounded-xl space-y-1.5 border border-white/5">
                          <div className="flex justify-between text-[10px] font-extrabold text-teal-400">
                            <span>SUMBU X (Potensial)</span>
                            <span>{calculateBknSumbuX(formPenilaian).toFixed(2)} Poin</span>
                          </div>
                          <div className="text-[9.5px]/4 text-slate-300 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-slate-400">1. Pilar Kompetensi (40%):</span>
                              <span>{((formPenilaian.bkn_penilaian_kompetensi * 0.20) + (formPenilaian.bkn_pengembangan_kompetensi * 0.10) + (formPenilaian.bkn_pengalaman_jabatan * 0.10)).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">2. Pilar Potensi (25%):</span>
                              <span>{(formPenilaian.bkn_penilaian_potensi * 0.25).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">3. Pilar Kualifikasi (20%):</span>
                              <span>{(((formPenilaian.bkn_pendidikan === 'S3' ? 100 : formPenilaian.bkn_pendidikan === 'S2' ? 90 : formPenilaian.bkn_pendidikan === 'S1' ? 80 : formPenilaian.bkn_pendidikan === 'D3' ? 70 : 60) * 0.10) + (formPenilaian.bkn_kesesuaian_ilmu * 0.10)).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">4. Disiplin & Integritas (15%):</span>
                              <span>{(formPenilaian.bkn_rekam_disiplin * 0.15).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* CALCULATED VALUE OUTCOME */}
                      <div className="p-4 bg-slate-800 rounded-2xl border border-white/5 space-y-2">
                        <span className="text-[8px] font-black text-blue-400 tracking-widest uppercase">Skor Akumulasi Total Akhir</span>
                        <div className="text-3xl font-black text-white">{calculateTotalNilai(formPenilaian)}</div>
                        <div className="text-[9px] font-black text-slate-300">
                          Kategori Evaluasi: <span className="text-blue-400 font-bold uppercase">{getKategoriTalenta(calculateTotalNilai(formPenilaian))}</span>
                        </div>
                      </div>

                      {/* CORE COORDINATE NINEBOX DISPLAY */}
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Penempatan 9-Box</span>
                        <p className="text-xs font-extrabold text-[#10b981]">{calculateNineBoxPos(calculateBknSumbuY(formPenilaian), calculateBknSumbuX(formPenilaian)).box}</p>
                        <p className="text-[9pt] text-slate-400 leading-relaxed mt-1">{calculateNineBoxPos(calculateBknSumbuY(formPenilaian), calculateBknSumbuX(formPenilaian)).rec}</p>
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

          {/* TAB 2 (READ ONLY): PERSONAL EVALUATION DETAILS FOR REGULAR USER */}
          {activeTab === 'PENILAIAN' && !canEdit && (
            <div className="p-6 md:p-8 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h4 className="text-[14px] font-black tracking-widest text-[#1e293b] uppercase mb-1">Rincian Evaluasi Kompetensi BKN 411/2025</h4>
                  <p className="text-[10px] text-gray-400 font-bold">Transparansi Penilaian Talenta Personal Anda</p>
                </div>
                <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  Kepka BKN No. 411/2025
                </span>
              </div>

              {myPenilaian ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* SUMBU Y */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Sumbu Kinerja (Y)</span>
                      <span className="text-sm font-black text-indigo-600 font-mono">{myPenilaian.nilai_skp} / 100</span>
                    </div>
                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between p-2.5 bg-white rounded-xl">
                        <span className="font-semibold text-slate-500">Kinerja Utama / SKP</span>
                        <span className="font-bold font-mono">{myPenilaian.nilai_skp}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-white rounded-xl">
                        <span className="font-semibold text-slate-500">Integritas & Disiplin</span>
                        <span className="font-bold font-mono">{myPenilaian.integritas || 100}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-white rounded-xl">
                        <span className="font-semibold text-slate-500">Kerjasama / Teamwork</span>
                        <span className="font-bold font-mono">{myPenilaian.teamwork || 80}</span>
                      </div>
                    </div>
                  </div>

                  {/* SUMBU X */}
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-xs font-black text-teal-700 uppercase tracking-wider">Sumbu Potensi & Asesmen (X)</span>
                      <span className="text-sm font-black text-teal-600 font-mono">{myPenilaian.kompetensi} / 100</span>
                    </div>
                    <div className="space-y-2 text-xs text-slate-700">
                      <div className="flex justify-between p-2.5 bg-white rounded-xl">
                        <span className="font-semibold text-slate-500">Asesmen Kompetensi Teknis</span>
                        <span className="font-bold font-mono">{myPenilaian.kompetensi}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-white rounded-xl">
                        <span className="font-semibold text-slate-500">Kepemimpinan / Leadership</span>
                        <span className="font-bold font-mono">{myPenilaian.leadership}</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-white rounded-xl">
                        <span className="font-semibold text-slate-500">Inovasi & Komunikasi</span>
                        <span className="font-bold font-mono">{myPenilaian.inovasi || 80}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                  Data rincian evaluasi talenta belum tersedia untuk akun Anda.
                </div>
              )}
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
                        <td className="py-4 text-center font-mono">
                          <span className="font-extrabold text-[#111827] text-[12px] block">{p.nilai_skp}</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider mt-1 border shadow-xs ${
                            p.nilai_skp > 100 ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                            p.nilai_skp >= 90 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                          }`}>
                            {p.nilai_skp > 100 ? 'Di Atas' : p.nilai_skp >= 90 ? 'Sesuai' : 'Di Bawah'}
                          </span>
                        </td>
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
              <div className={`${canEdit ? 'lg:col-span-2' : 'col-span-1 lg:col-span-3'} p-6 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-6`}>
                <div>
                  <h4 className="text-[12px] font-black tracking-widest text-[#1e293b] uppercase mb-1">
                    {isRegularUser ? 'Daftar Program Pengembangan Saya' : 'Daftar Program Pengembangan Aktif'}
                  </h4>
                  <p className="text-[9px] text-gray-400 font-bold">
                    {isRegularUser ? 'Pemantauan kegiatan pelatihan, mentoring, coaching, dan rotasi Anda' : 'Pemantauan kegiatan pelatihan, mentoring, coaching, dan rotasi yang terdaftar'}
                  </p>
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
                      {(isRegularUser ? myPengembanganList : pengembanganList).map((p) => {
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
                      {(isRegularUser ? myPengembanganList : pengembanganList).length === 0 && (
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
