
import React from 'react';
import { TaskType } from './types';

export const TASK_LABELS: Record<TaskType, string> = {
  [TaskType.PELANTIKAN]: 'Pelantikan',
  [TaskType.APEL]: 'Apel',
  [TaskType.LHKPN]: 'LHKPN',
  [TaskType.LHKASN]: 'LHKASN',
  [TaskType.TUGAS_BELAJAR]: 'Tugas Belajar',
  [TaskType.MAGANG]: 'Magang',
  [TaskType.PENELITIAN]: 'Penelitian',
  [TaskType.SATYA_LENCANA]: 'Satya Lencana',
  [TaskType.GELAR]: 'Pencantuman Gelar',
  [TaskType.PANGKAT]: 'Kenaikan Pangkat',
  [TaskType.JENJANG]: 'Kenaikan Jenjang',
  [TaskType.GAJI]: 'Gaji',
  [TaskType.MUTASI]: 'Mutasi',
  [TaskType.KARTU_SUAMI_ISTRI]: 'Kartu Suami/Istri',
  [TaskType.KARTU_BPJS]: 'Kartu BPJS',
  [TaskType.CUTI]: 'Cuti',
  [TaskType.SPMT_SPP]: 'SPMT/SPP',
  [TaskType.ABSENSI]: 'Absensi',
  [TaskType.PERKAWINAN]: 'Perkawinan, Perceraian, Kelahiran',
  [TaskType.HUKUMAN]: 'Hukuman Disiplin',
  [TaskType.PENSIUN]: 'Usulan Pensiun',
  [TaskType.GRATIFIKASI]: 'Gratifikasi & Benturan Kepentingan',
  [TaskType.KGB]: 'Kenaikan Gaji Berkala'
};

export const UNIT_KERJA = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, DTLST, dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerja Sama, Pemberdayaan, dan Edukasi',
  'Direktorat Teknologi Informasi',
  'Direktorat Penegakan Hukum'
];

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const AK_KOEFISIEN: Record<string, number> = {
  'AHLI UTAMA': 50,
  'AHLI MADYA': 37.5,
  'AHLI MUDA': 25,
  'AHLI PERTAMA': 12.5,
  'PENYELIA': 25,
  'MAHIR': 12.5,
  'TERAMPIL': 5,
  'PEMULA': 3.75
};

export const PREDIKAT_MULTIPLIER: Record<string, number> = {
  'Sangat Baik': 1.5,
  'Baik': 1.0,
  'Butuh Perbaikan': 0.75,
  'Kurang': 0.5,
  'Sangat Kurang': 0.25
};

export const AK_KUMULATIF_TARGET: Record<string, number> = {
  'AHLI MUDA': 100,
  'AHLI MADYA': 200,
  'AHLI UTAMA': 450,
  'MAHIR': 60,
  'PENYELIA': 100
};

export const PANGKAT_MAP: Record<string, string> = {
  'IV/e': 'Pembina Utama',
  'IV/d': 'Pembina Utama Madya',
  'IV/c': 'Pembina Utama Muda',
  'IV/b': 'Pembina Tingkat I',
  'IV/a': 'Pembina',
  'III/d': 'Penata Tingkat I',
  'III/c': 'Penata',
  'III/b': 'Penata Muda Tingkat I',
  'III/a': 'Penata Muda',
  'II/d': 'Pengatur Tingkat I',
  'II/c': 'Pengatur',
  'II/b': 'Pengatur Muda Tingkat I',
  'II/a': 'Pengatur Muda'
};

export const getPangkatFromGol = (gol: string): string => {
  if (!gol) return '';
  const cleanGol = gol.toUpperCase().trim();
  return PANGKAT_MAP[cleanGol] || '';
};

export const GAJI_POKOK_REF: Record<number, Record<string, number>> = {
  0: { 'I/a': 1230000, 'I/b': 1268400, 'I/c': 1308100, 'II/a': 1565800, 'II/b': 1614800, 'III/a': 2022100, 'IV/a': 2217700, 'IV/e': 2508200 },
  32: { 'I/a': 1829700, 'I/b': 1886900, 'I/c': 1945900, 'II/a': 2465400, 'II/b': 2542400, 'III/a': 3283200, 'IV/a': 3491700, 'IV/e': 4200000 }
};

export const getGajiEstimasi = (gol: string, mk: number): number => {
  const years = Object.keys(GAJI_POKOK_REF).map(Number).sort((a,b) => b-a);
  const closestYear = years.find(y => mk >= y) || 0;
  return GAJI_POKOK_REF[closestYear]?.[gol.toUpperCase()] || 0;
};
