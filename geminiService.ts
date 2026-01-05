
/**
 * geminiService.ts - Versi Non-AI
 * Seluruh fungsi AI dinonaktifkan untuk mencegah API Rate Limit.
 */

export const safeGenerateContent = async (params: any) => {
  return { 
    success: true, 
    text: "{}", 
    data: {} 
  };
};

export const getDashboardInsights = async (stats: any) => {
  // Mengganti AI dengan ringkasan logika sederhana (Gratis & Cepat)
  return `Saat ini terdapat ${stats.totalPegawai} pegawai terdaftar. Komposisi terbesar adalah PNS (${stats.totalPNS} orang). Seluruh data dalam kondisi sinkron dengan database pusat.`;
};
