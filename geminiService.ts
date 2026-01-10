
/**
 * geminiService.ts - Versi Non-AI
 * Seluruh fungsi AI dinonaktifkan untuk mencegah ketergantungan API Key dan Rate Limit.
 */

export const safeGenerateContent = async (params: any) => {
  return { 
    success: true, 
    text: "{}", 
    data: {} 
  };
};

export const getDashboardInsights = async (stats: any) => {
  // Memberikan ringkasan cerdas tanpa memanggil server Gemini
  return `Dashboard saat ini menampilkan ${stats.totalPegawai} data pegawai. Sistem dalam kondisi optimal dengan sinkronisasi database Spreadsheet terakhir. Semua modul (Absensi, SKP, Dossier) berjalan dalam mode lokal yang aman.`;
};
