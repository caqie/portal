
import { TaskType } from './types';

// Logo DJKI (Yellow & Blue) - Base64 Data
export const DEFAULT_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAADICAYAAABS39xWAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAACOQSURBVHgB7Z07bBzXmcfv7F6U+KIsyrIixfJ6OInlyG6S2In9iN0Yjh07FpLGSNMEiY808ZCm8eEm8REfceIjAWIkPhIgeSRpYqRJisZJ0iRInMRAECBO4jgOknrtyI/FUmzLVhYl8SFF8i6L+/9nhre7szO7szO7s7P7+QEG+8js7swunvOf7zvnXidmZ2fF5OTkF7p00n6Lg8G9rWzO/qR9G93F7vN/fNfPzYI70M3Zf3e09m1yN2v/+N/+55/P2TfX/reL9uX99uV9Hof9AAbIe7W3L9z7679Xz1N/R/29ev56Pnsee357Xvsetp+fM699P9v3tO872v981f7Xm/f+u8e17812M9LpEOfOnRPZbFZEUeS6O3m7OTo6Ksqf2uMh/pGIn9X/8XfUf8f7SvxAER9W7y+9X/0/9fM/nZ2Y8L8+9O7pP9v9n98N97vP74b7v3P7f3r3997nfnvXf893S0REu/6+2v989/7eI+L48X4Xj+v383r/i/r9XInX+9K/YvL9IibF+MTvX1zLIn7nI568p09E/E5H9f563InJj8pY6X0iXq8O7hXfH8Q4/f5fSI+9bj388P3976/UP/P0s/v8s+H3vvc73xfS79/vkn/O9fv7Yvx67d3vEf99z7vY99/UPw7H8bvfa97P1fvk/f5veL9/IzV/mfp5/wd63nqYr3fPqb3vfS+U/+Geq56vnp+S7/3pb+39/yXfq96Xvte976/fE17X6l/Pk0/x+fp7+59v3quS9/r39/73e/t7M/wfaff6d/f+9/v7//sW693/3/rS9/S+P6V/f9f17mN6f0p/l9X+r97v5TfPfvvef19+6+f5m6f++fG+X73fqedv7Ruv7XvO0/v90O91799R79Xv7Uv/ivov/Z7X9n6f++9z+5//2/9Mv/W/f0f//1fK72Vv/+0/63P9/0rfz/rf86P+/7n+r6Xf837vX/+vX+dfP6be/9b7vve/6+/3f/5v6XN/7/8P6Xd36ff/T+nntN9lP6fd8P7mX+/8Pf7fV6r89vV7X3p97/l/pt/Tve/U39v6+7L/70v7fF/v95Vefu5VfV/79/3f7f/O6/u7/v9Uv+dr+xqvX+Ofv7be/+rvrf/f76u/t6f/V3rfX377uX+jPPf7X8tvv/y7v6p9XfVvlvU/f7X/uep7v7Lfd/n1vXfP83v5d7/T73P9Xun9LP3vXN77/F7X77/89n9Vv/dyfS9V/9v7+S/7Gpf9f3P9v3/pZ59dnJyYmKydRvfze7wf3zXz82CO9DN2X93tPZtcjdr//jf/uefzzvXvP1vF+3L++3L+zwO+wEMkPdqb1+499d/r56n/o76e/X89Xz2PPb89rz2Pew/P2de+36272nfd7T/+ar9rzfv/XePa9+b7W6k7/mOjo76+7v/N6XPH9r3un5O/R31X/o9r+39PvfP0r/73D7v79f/r9T/r9Xv995X77P9/v6v9PP6vV67n/v5Tf759Xut9n+r1f8V++9XfX8X/+/8zP5X+rvLv/e9Vvuf9f++r5T69/S9qf+m0n9vX++97p9P9v+h3/u/z8/rv7/m+l7p3/vS9/S++X/+6Xuvf1/v/y+r9P9Uv9f/Hfr9Xup3/v9L9399X+t//n/X/7r+f6b6+3r/n9L/O/2af0e/m/6f6wf7+X7f/n/Xf/r+f6b6+3r/n9L/O/2af0e/m/6f6vf7pX9H/0/XZ39H+r7W69f6Nf7+K/+u/3n5zbJ+ri8/t+v/V+qfLfXv1Pvtyn/m77/y/an3f+r/rvTvleU/9f2p9/dq/yz9Tvp39P2952/Vv9/z29/5vfx9Lf3v+v+p9L9el/6eLv0+9et6v/3/KX3u9H7q1/X/qp+9//mO//7f+/7+v7v9P3f6Xv6Pe97ut/Pq9/Xv6X+/vXz++p79f/+V//T3+P//U7//9e/73/9Xv/+rv976f3q79Xl97r3by2/76X3l37vS2+f+nnv1fte+n/6uXrf/b/ra9Xf3/Nvfa7vVf6uv6f6vlbv+59V7/8p7T+v1X7X/+9c/6/S97P+9/yo/3966/+v//2f+/+9Uv8sfS/9v6XW87Y69f+X2v+V0u+U/t3yv6vW76reT/V39X39X73+L+n7+p9+Xp/Tz+un9vW96+X9P76G93Wf7+X7Tv1Xf893S0REu/7W3+m99/L9p/69796rfk0/t9Y/R79v//9Uf+/X/9u9/8zP39T+3m/pZ5+dmJys+9vlyH036X30ff8jP/49fKOf96Nf0I//9u0f+8/lZ37sh/5zH/vBP+e1fPj90vH7fT/qY/P3vY99/0f7e//v4+D/4/v7Xv63H3u/+9v30r/n73v5379n7/8N97vP997nfnvXf89376//u9/+9v/P7f/p3d97n/vtXf893y0REe36+2r/8937e4+I48f7Xfyu38/r/S/q93MlXu9L/4rJ94uYFOPTv39xLYv4nY948p4+EfE7HdX763EnJj8qY6X3iXi9OrhXfH8Q4/f5fSI+9bj388P3976/UP/P0s/v8s+H3vvc73xfS79/vkn/O9fv7Yvx67d3vEf99z7vY99/UPw7H8bvfa97P1fvk/f5veL9/IzV/mfp5/wd63nqYr3fPqb3vfS+U/+Geq56vnp+S7/3pb+39/yXfq96Xvte976/fE17X6l/Pk0/x+fp7+59v3quS9/r39/73e/t7M/wfaff6d/f+9/v7//sW693/3/rS9/S+P6V/f9f17mN6f0p/l9X+r97v5TfPfvvef19+6+f5m6f++fG+X73fqedv7Ruv7XvO0/v90O91799R79Xv7Uv/ivov/Z7X9n6f++9z+5//2/9Mv/W/f0f//1fK72Vv/+0/63P9/0rfz/rf86P+/7n+r6Xf837vX/+vX+dfP6be/9b7vve/6+/3f/5v6XN/7/8P6Xd36ff/T+nntN9lP6fd8P7mX+/8Pf7fV6r89vV7X3p97/l/pt/Tve/U39v6+7L/70v7fF/v95Vefu5VfV/79/3f7f/O6/u7/v9Uv+dr+xqvX+Ofv7be/+rvrf/f76u/t6f/V3rfX377uX+jPPf7X8tvv/y7v6p9XfVvlvU/f7X/uep7v7Lfd/n1vXfP83v5d7/T73P9Xun9LP3vXN77/F7X77/89n9Vv/dyfS9V/9v7+S/7Gpf9f3P9v3/pZ59dnJyYmKydRvfze7wf3zXz82CO9DN2X93tPZtcjdr//jf/uefzzvXvP1vF+3L++3L+zwO+wEMkPdqb1+499d/r56n/o76e/X89Xz2PPb89rz2Pew/P2de+36272nfd7T/+ar9rzfv/XePa9+b7W6k7/mOjo76+7v/N6XPH9r3un5O/R31X/o9r+39PvfP0r/73D7v79f/r9T/r9Xv995X77P9/v6v9PP6vV67n/v5Tf759Xut9n+r1f8V++9XfX8X/+/8zP5X+rvLv/e9Vvuf9f++r5T69/S9qf+m0n9vX++97p9P9v+h3/u/z8/rv7/m+l7p3/vS9/S++X/+6Xuvf1/v/y+r9P9Uv9f/Hfr9Xup3/v9L9399X+t//n/X/7r+f6b6+3r/n9L/O/2af0e/m/6f6vf7pX9H/0/XZ39H+r7W69f6Nf7+K/+u/3n5zbJ+ri8/t+v/V+qfLfXv1Pvtyn/m77/y/an3f+r/rvTvleU/9f2p9/dq/yz9Tvp39P2952/Vv9/z29/5vfx9Lf3v+v+p9L9el/6eLv0+9et6v/3/KX3u9H7q1/X/qp+9//mO//7f+/7+v7v9P3f6Xv6Pe97ut/Pq9/Xv6X+/vXz++p79f/+V//T3+P//U7//9e/73/9Xv/+rv976f3q79Xl97r3by2/76X3l37vS2+f+nnv1fte+n/6uXrf/b/ra9Xf3/Nvfa7vVf6uv6f6vlbv+59V7/8p7T+v1X7X/+9c/6/S97P+9/yo/3966/+v//2f+/+9Uv8sfS/9v6XW87Y69f+X2v+V0u+U/t3yv6vW76reT/V39X39X73+L+n7+p9+Xp/Tz+un9vW96+X9P76G93Wf7+X7Tv1Xf893S0REu/7W3+m99/L9p/69796rfk0/t9Y/R79v//9Uf+/X/9u9/8zP39T+3m/pZ5+dmJys+9vlyH036X30ff8jP/49fKOf96Nf0I//9u0f+8/lZ37sh/5zH/vBP+e1fPj90vH7fT/qY/P3vY99/0f7e//v4+D/4/v7Xv63H3u/+9v30r/n73v5379n7/8N97vP997nfnvXf89376//u9/+9v/P7f/p3d97n/vtXf893y0REe36+2r/8937e4+I48f7Xfyu38/r/S/q93MlXu9L/4rJ94uYFOPTv39xLYv4nY948p4+EfE7HdX763EnJj8qY6X3iXi9OrhXfH8Q4/f5fSI+9bj388P3976/UP/P0s/v8s+H3vvc73xfS79/vkn/O9fv7Yvx67d3vEf99z7vY99/UPw7H8bvfa97P1fvk/f5veL9/IzV/mfp5/wd63nqYr3fPqb3vfS+U/+Geq56vnp+S7/3pb+39/yXfq96Xvte976/fE17X6l/Pk0/x+fp7+59v3quS9/r39/73e/t7M/wfaff6d/f+9/v7//sW693/3/rS9/S+P6V/f9f17mN6f0p/l9X+r97v5TfPfvvef19+6+f5m6f++fG+X73fqedv7Ruv7XvO0/v90O91799R79Xv7Uv/ivov/Z7X9n6f++9z+5//2/9Mv/W/f0f//1fK72Vv/+0/63P9/0rfz/rf86P+/7n+r6Xf837vX/+vX+dfP6be/9b7vve/6+/3f/5v6XN/7/8P6Xd36ff/T+nntN9lP6fd8P7mX+/8Pf7fV6r89vV7X3p97/l/pt/Tve/U39v6+7L/70v7fF/v95Vefu5VfV/79/3f7f/O6/u7/v9Uv+dr+xqvX+Ofv7be/+rvrf/f76u/t6f/V3rfX377uX+jPPf7X8tvv/y7v6p9XfVvlvU/f7X/uep7v7Lfd/n1vXfP83v5d7/T73P9Xun9LP3vXN77/F7X77/89n9Vv/dyfS9V/9v7+S/7Gpf9f3P9v3/pZ59dnJyYmKydRvfze7wf3zXz82CO9DN2X93tPZtcjdr//jf/uefzzvXvP1vF+3L++3L+zwO+wEMkPdqb1+499d/r56n/o76e/X89Xz2PPb89rz2Pew/P2de+36272nfd7T/+ar9rzfv/XePa9+b7W6k7/mOjo76+7v/N6XPH9";

// Months of the year in Indonesian
export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// List of work units in the organization
export const UNIT_KERJA = [
  'Sekretariat Direktorat Jenderal Kekayaan Intelektual',
  'Direktorat Hak Cipta dan Desain Industri',
  'Direktorat Paten, DTLST dan Rahasia Dagang',
  'Direktorat Merek dan Indikasi Geografis',
  'Direktorat Kerjasama dan Pemberdayaan Kekayaan Intelektual',
  'Direktorat Teknologi Informasi Kekayaan Intelektual',
  'Direktorat Penyidikan dan Penyelesaian Sengketa'
];

// Mapping of salary grades to official ranks
export const PANGKAT_MAP: Record<string, string> = {
  'I/a': 'Juru Muda',
  'I/b': 'Juru Muda Tingkat I',
  'I/c': 'Juru',
  'I/d': 'Juru Tingkat I',
  'II/a': 'Pengatur Muda',
  'II/b': 'Pengatur Muda Tingkat I',
  'II/c': 'Pengatur',
  'II/d': 'Pengatur Tingkat I',
  'III/a': 'Penata Muda',
  'III/b': 'Penata Muda Tingkat I',
  'III/c': 'Penata',
  'III/d': 'Penata Tingkat I',
  'IV/a': 'Pembina',
  'IV/b': 'Pembina Tingkat I',
  'IV/c': 'Pembina Utama Muda',
  'IV/d': 'Pembina Utama Madya',
  'IV/e': 'Pembina Utama'
};

// Helper to get rank from salary grade
export const getPangkatFromGol = (gol: string): string => PANGKAT_MAP[gol] || '-';

// Display labels for different task types
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
  [TaskType.PERKAWINAN]: 'Perkawinan/Perceraian',
  [TaskType.HUKUMAN]: 'Hukuman Disiplin',
  [TaskType.PENSIUN]: 'Pensiun',
  [TaskType.GRATIFIKASI]: 'Gratifikasi',
  [TaskType.KGB]: 'Kenaikan Gaji Berkala'
};

// Coefficient for credit points based on job level
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

// Multiplier for credit points based on performance predicate
export const PREDIKAT_MULTIPLIER: Record<string, number> = {
  'Sangat Baik': 1.5,
  'Baik': 1.0,
  'Butuh Perbaikan': 0.75,
  'Kurang': 0.5,
  'Sangat Kurang': 0.25
};

// Target cumulative credit points for promotion
export const AK_KUMULATIF_TARGET: Record<string, number> = {
  'AHLI UTAMA': 200,
  'AHLI MADYA': 150,
  'AHLI MUDA': 100,
  'AHLI PERTAMA': 50
};

// Estimated basic salary calculation based on grade and years of service
export const getGajiEstimasi = (gol: string, mk: number): number => {
  let base = 2500000;
  if (gol.startsWith('I/')) base = 1560800;
  else if (gol.startsWith('II/')) base = 2022200;
  else if (gol.startsWith('III/')) base = 2579400;
  else if (gol.startsWith('IV/')) base = 3044300;
  
  return base + (mk * 100000);
};
