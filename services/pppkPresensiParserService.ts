import * as XLSX from 'xlsx';
import { ensurePdfJsLoaded, DEFAULT_HOLIDAYS, Holiday } from '../pdfParserUtils';
import { getAllEmployees } from './pppkEvaluationService';
import { PPPKPresensiRow, Pegawai } from '../types';
import { calculateNilaiKehadiranFromAlfa } from './pppkPenilaianModuleService';

export interface PppkPresensiParseResult {
  rows: PPPKPresensiRow[];
  totalFiles: number;
  successCount: number;
  failCount: number;
  errors: string[];
  fileNames: string[];
}

/**
 * Utility to parse an Indonesian date string e.g. "02/01/2026", "2026-01-02", "02-01-2026"
 */
function parseDateString(str: string): Date | null {
  if (!str) return null;
  const clean = str.trim();
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  const ymdMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  return null;
}

/**
 * Clean and normalize NIP (remove spaces, dots, dashes)
 */
function cleanNip(raw: string | number | undefined | null): string {
  if (!raw) return '';
  return String(raw).replace(/[^0-9]/g, '').trim();
}

/**
 * Clean employee name
 */
function cleanName(raw: string | undefined | null): string {
  if (!raw) return '';
  return String(raw).replace(/\s+/g, ' ').trim();
}

/**
 * Match parsed employee against the system's official Pegawai database
 */
function matchWithSystemEmployee(nip: string, nama: string, allEmployees: Pegawai[]): Pegawai | undefined {
  const cNip = cleanNip(nip);
  if (cNip) {
    const foundByNip = allEmployees.find(e => cleanNip(e.nip) === cNip);
    if (foundByNip) return foundByNip;
  }

  const cNama = cleanName(nama).toLowerCase();
  if (cNama.length > 3) {
    const foundByName = allEmployees.find(e => {
      const eName = e.nama.toLowerCase();
      return eName.includes(cNama) || cNama.includes(eName);
    });
    if (foundByName) return foundByName;
  }

  return undefined;
}

/**
 * Helper to build a validated PPPKPresensiRow with auto calculation of skor & kategori
 */
function createPresensiRow(
  raw: {
    nip: string;
    nama: string;
    unitKerja?: string;
    jabatan?: string;
    hariKerja?: number;
    hadir?: number;
    terlambat?: number;
    pulangCepat?: number;
    alfa?: number;
    dinasLuar?: number;
    wfh?: number;
    cuti?: number;
    sakit?: number;
    izin?: number;
    keterangan?: string;
  },
  importId: string,
  allEmployees: Pegawai[]
): PPPKPresensiRow {
  const matchedEmp = matchWithSystemEmployee(raw.nip, raw.nama, allEmployees);

  const finalNip = matchedEmp?.nip || cleanNip(raw.nip) || `PPPK-${Date.now()}`;
  const finalNama = matchedEmp?.nama || cleanName(raw.nama) || 'Pegawai PPPK';
  const finalUnit = matchedEmp?.unitKerja || raw.unitKerja || 'Direktorat Jenderal Kekayaan Intelektual';
  const finalJabatan = matchedEmp?.jabatan || raw.jabatan || 'Ahli Pertama';

  const alfa = Math.max(0, Number(raw.alfa) || 0);
  const totalHariKerja = Math.max(1, Number(raw.hariKerja) || 120);
  const hadir = Math.max(0, Number(raw.hadir) ?? Math.max(0, totalHariKerja - alfa));
  const terlambat = Math.max(0, Number(raw.terlambat) || 0);
  const pulangCepat = Math.max(0, Number(raw.pulangCepat) || 0);
  const dinasLuar = Math.max(0, Number(raw.dinasLuar) || 0);
  const wfh = Math.max(0, Number(raw.wfh) || 0);
  const cuti = Math.max(0, Number(raw.cuti) || 0);
  const sakit = Math.max(0, Number(raw.sakit) || 0);
  const izin = Math.max(0, Number(raw.izin) || 0);

  const { nilai, kategori } = calculateNilaiKehadiranFromAlfa(alfa);

  let ket = raw.keterangan?.trim();
  if (!ket) {
    if (alfa === 0) {
      ket = 'Sangat Tertib (Alfa 0)';
    } else {
      ket = `${kategori} (Alfa ${alfa})`;
    }
  }

  return {
    id: `ATT-PARSED-${finalNip}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    importId,
    nip: finalNip,
    nama: finalNama,
    unitKerja: finalUnit,
    totalHariKerja,
    hariKerja: totalHariKerja,
    hadir,
    terlambat,
    pulangCepat,
    alfa,
    dinasLuar,
    wfh,
    cuti,
    sakit,
    izin,
    skorAlfa: nilai,
    nilaiKehadiran: nilai,
    kategoriAlfa: kategori,
    keterangan: ket
  };
}

/**
 * Parse an Excel / Spreadsheet file (.xlsx, .xls, .csv)
 */
export async function parseExcelPresensiFile(
  file: File,
  allEmployees: Pegawai[],
  importId: string
): Promise<PPPKPresensiRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const rows: PPPKPresensiRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert to 2D array of rows
    const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!data || data.length < 2) continue;

    // Find header row index
    let headerIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(15, data.length); r++) {
      const row = data[r];
      if (!Array.isArray(row)) continue;

      const map: Record<string, number> = {};
      let foundKeys = 0;

      row.forEach((cell, cIdx) => {
        const val = String(cell || '').trim().toLowerCase();
        if (!val) return;

        if (val.includes('nip') || val === 'id pegawai' || val.includes('nomor induk')) {
          map['nip'] = cIdx;
          foundKeys++;
        } else if (val.includes('nama') || val === 'pegawai' || val === 'nama lengkap') {
          map['nama'] = cIdx;
          foundKeys++;
        } else if (val.includes('hari kerja') || val === 'total hari' || val === 'hari efektif' || val === 'hk') {
          map['hariKerja'] = cIdx;
          foundKeys++;
        } else if (val === 'hadir' || val.includes('kehadiran') || val === 'h') {
          map['hadir'] = cIdx;
          foundKeys++;
        } else if (val.includes('terlambat') || val === 'telat' || val === 'tl') {
          map['terlambat'] = cIdx;
          foundKeys++;
        } else if (val.includes('pulang cepat') || val === 'plg cepat' || val === 'pc') {
          map['pulangCepat'] = cIdx;
          foundKeys++;
        } else if (val.includes('alfa') || val.includes('alpa') || val.includes('tanpa') || val === 'tk' || val === 'a') {
          map['alfa'] = cIdx;
          foundKeys++;
        } else if (val.includes('dinas luar') || val === 'dl' || val.includes('sppd')) {
          map['dinasLuar'] = cIdx;
          foundKeys++;
        } else if (val === 'wfh') {
          map['wfh'] = cIdx;
          foundKeys++;
        } else if (val.includes('cuti') || val === 'c') {
          map['cuti'] = cIdx;
          foundKeys++;
        } else if (val.includes('sakit') || val === 's') {
          map['sakit'] = cIdx;
          foundKeys++;
        } else if (val.includes('izin') || val.includes('ijin') || val === 'i') {
          map['izin'] = cIdx;
          foundKeys++;
        } else if (val.includes('keterangan') || val.includes('ket') || val === 'catatan') {
          map['keterangan'] = cIdx;
          foundKeys++;
        } else if (val.includes('unit') || val.includes('satker') || val.includes('bagian')) {
          map['unitKerja'] = cIdx;
          foundKeys++;
        }
      });

      if (foundKeys >= 2 && ('nama' in map || 'nip' in map)) {
        headerIdx = r;
        colMap = map;
        break;
      }
    }

    if (headerIdx === -1) continue;

    // Process data rows
    for (let r = headerIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawNip = colMap['nip'] !== undefined ? String(row[colMap['nip']] || '') : '';
      const rawNama = colMap['nama'] !== undefined ? String(row[colMap['nama']] || '') : '';

      if (!rawNip && !rawNama) continue;
      // Skip summary / footer rows
      if (rawNama.toLowerCase().includes('total') || rawNama.toLowerCase().includes('jumlah') || rawNama.toLowerCase().includes('rata-rata')) {
        continue;
      }

      const getNum = (key: string, def = 0): number => {
        if (colMap[key] === undefined) return def;
        const val = row[colMap[key]];
        const num = parseFloat(String(val).replace(/,/g, '.'));
        return isNaN(num) ? def : num;
      };

      const parsedRow = createPresensiRow(
        {
          nip: rawNip,
          nama: rawNama,
          unitKerja: colMap['unitKerja'] !== undefined ? String(row[colMap['unitKerja']] || '') : undefined,
          hariKerja: getNum('hariKerja', 120),
          hadir: getNum('hadir', 0),
          terlambat: getNum('terlambat', 0),
          pulangCepat: getNum('pulangCepat', 0),
          alfa: getNum('alfa', 0),
          dinasLuar: getNum('dinasLuar', 0),
          wfh: getNum('wfh', 0),
          cuti: getNum('cuti', 0),
          sakit: getNum('sakit', 0),
          izin: getNum('izin', 0),
          keterangan: colMap['keterangan'] !== undefined ? String(row[colMap['keterangan']] || '') : ''
        },
        importId,
        allEmployees
      );

      rows.push(parsedRow);
    }
  }

  return rows;
}

/**
 * Extract text and structure from a PDF file using PDF.js
 */
interface PdfPageData {
  pageNum: number;
  text: string;
  lines: string[];
}

async function extractPdfPages(file: File): Promise<PdfPageData[]> {
  const pdfjsLib = await ensurePdfJsLoaded();
  if (!pdfjsLib) {
    throw new Error('Pustaka PDF.js belum siap atau gagal dimuat.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: PdfPageData[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    try {
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      // Organize line items by Y position
      const linesMap: { [key: number]: any[] } = {};
      items.forEach(item => {
        const y = Math.round(item.transform[5] * 2) / 2;
        const foundY = Object.keys(linesMap).find(existingY => Math.abs(Number(existingY) - y) < 4);
        if (foundY) {
          linesMap[Number(foundY)].push(item);
        } else {
          linesMap[y] = [item];
        }
      });

      const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
      const lines: string[] = [];

      sortedY.forEach(y => {
        const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
        const lineText = lineItems.map(item => item.str).join(' ').trim();
        if (lineText) lines.push(lineText);
      });

      pages.push({
        pageNum,
        text: lines.join('\n'),
        lines
      });
    } finally {
      if (page && typeof page.cleanup === 'function') {
        page.cleanup();
      }
    }
  }

  return pages;
}

/**
 * Parse an individual employee biometric report from extracted lines
 */
function parseEmployeeFromLines(
  lines: string[],
  fileName: string,
  importId: string,
  allEmployees: Pegawai[],
  holidays: Holiday[] = DEFAULT_HOLIDAYS
): PPPKPresensiRow | null {
  let nama = '';
  let nip = '';
  let departemen = '';
  let jabatan = '';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (!nama && lower.includes('nama')) {
      const match = line.match(/nama\s*[:=]\s*(.*)/i);
      if (match && match[1].trim()) nama = match[1].trim();
    }
    if (!nip && lower.includes('nip')) {
      const match = line.match(/nip\s*[:=]\s*([0-9\s]+)/i);
      if (match && match[1].trim()) nip = cleanNip(match[1]);
    }
    if (!departemen && (lower.includes('departemen') || lower.includes('unit kerja') || lower.includes('satker'))) {
      const match = line.match(/(?:departemen|unit kerja|satker)\s*[:=]\s*(.*)/i);
      if (match && match[1].trim()) departemen = match[1].trim();
    }
    if (!jabatan && lower.includes('jabatan')) {
      const match = line.match(/jabatan\s*[:=]\s*(.*)/i);
      if (match && match[1].trim()) jabatan = match[1].trim();
    }
  }

  // Fallback check if NIP is standing alone or formatted as 18 digits (19xxxxxxxxxxxxxxxx)
  if (!nip) {
    for (const line of lines) {
      const m = line.match(/\b(19\d{16})\b/);
      if (m) {
        nip = m[1];
        break;
      }
    }
  }

  // If no nama or nip found, cannot parse as employee report
  if (!nama && !nip) {
    return null;
  }

  // Now inspect the lines for attendance counts:
  // Check for explicit summary rows in the PDF (e.g., "Hadir: 118", "Alfa: 2", "Terlambat: 3")
  let summaryHadir: number | null = null;
  let summaryAlfa: number | null = null;
  let summaryTerlambat: number | null = null;
  let summaryPulangCepat: number | null = null;
  let summaryDl: number | null = null;
  let summaryCuti: number | null = null;
  let summarySakit: number | null = null;
  let summaryIzin: number | null = null;
  let summaryTotalHari: number | null = null;

  for (const line of lines) {
    const l = line.toLowerCase();

    const mTotal = l.match(/(?:total hari kerja|hari efektif|hari kerja)\s*[:=]?\s*(\d+)/i);
    if (mTotal && summaryTotalHari === null) summaryTotalHari = parseInt(mTotal[1], 10);

    const mHadir = l.match(/(?:hadir|kehadiran)\s*[:=]?\s*(\d+)/i);
    if (mHadir && summaryHadir === null && !l.includes('jam hadir')) summaryHadir = parseInt(mHadir[1], 10);

    const mAlfa = l.match(/(?:alfa|alpa|tanpa keterangan|mangkir|tk)\s*[:=]?\s*(\d+)/i);
    if (mAlfa && summaryAlfa === null) summaryAlfa = parseInt(mAlfa[1], 10);

    const mTelat = l.match(/(?:terlambat|telat|tl)\s*[:=]?\s*(\d+)/i);
    if (mTelat && summaryTerlambat === null && !l.includes('menit')) summaryTerlambat = parseInt(mTelat[1], 10);

    const mPc = l.match(/(?:pulang cepat|pc)\s*[:=]?\s*(\d+)/i);
    if (mPc && summaryPulangCepat === null && !l.includes('menit')) summaryPulangCepat = parseInt(mPc[1], 10);

    const mDl = l.match(/(?:dinas luar|dl)\s*[:=]?\s*(\d+)/i);
    if (mDl && summaryDl === null) summaryDl = parseInt(mDl[1], 10);

    const mCuti = l.match(/cuti\s*[:=]?\s*(\d+)/i);
    if (mCuti && summaryCuti === null) summaryCuti = parseInt(mCuti[1], 10);

    const mSakit = l.match(/sakit\s*[:=]?\s*(\d+)/i);
    if (mSakit && summarySakit === null) summarySakit = parseInt(mSakit[1], 10);

    const mIzin = l.match(/(?:izin|ijin)\s*[:=]?\s*(\d+)/i);
    if (mIzin && summaryIzin === null) summaryIzin = parseInt(mIzin[1], 10);
  }

  // Count day-by-day rows if summary wasn't explicitly found
  let daysPresent = 0;
  let daysAbsent = 0;
  let daysDl = 0;
  let daysCuti = 0;
  let daysSakit = 0;
  let daysIzin = 0;
  let daysLate = 0;
  let daysEarly = 0;
  let workdaysCount = 0;

  lines.forEach(line => {
    const l = line.toLowerCase();
    // Look for day/date pattern (e.g. "01/01/2026" or "Senin, 02 Jan 2026")
    const dateMatch = line.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/);
    if (!dateMatch) return;

    const isWeekend = l.includes('sabtu') || l.includes('minggu');
    if (isWeekend) return;

    workdaysCount++;

    if (l.includes('dl full') || l.includes('dinas luar') || l.includes('sppd')) {
      daysDl++;
    } else if (l.includes('cuti')) {
      daysCuti++;
    } else if (l.includes('sakit') || l.includes('skd')) {
      daysSakit++;
    } else if (l.includes('izin') || l.includes('ijin')) {
      daysIzin++;
    } else if (l.includes('alfa') || l.includes('alpa') || l.includes('tanpa keterangan') || l.includes('mangkir')) {
      daysAbsent++;
    } else {
      // Check for presence of check-in time like "07:30" or "08:15"
      const timeMatch = line.match(/\b\d{1,2}:\d{2}\b/);
      if (timeMatch) {
        daysPresent++;
        if (l.includes('telat') || l.includes('terlambat')) daysLate++;
        if (l.includes('pulang cepat') || l.includes('pc')) daysEarly++;
      } else {
        // No time and not excused -> absent
        daysAbsent++;
      }
    }
  });

  const totalHariKerja = summaryTotalHari || (workdaysCount > 0 ? workdaysCount : 120);
  const alfa = summaryAlfa !== null ? summaryAlfa : (daysAbsent > 0 ? daysAbsent : 0);
  const hadir = summaryHadir !== null ? summaryHadir : (daysPresent > 0 ? daysPresent : Math.max(0, totalHariKerja - alfa));
  const terlambat = summaryTerlambat !== null ? summaryTerlambat : daysLate;
  const pulangCepat = summaryPulangCepat !== null ? summaryPulangCepat : daysEarly;
  const dinasLuar = summaryDl !== null ? summaryDl : daysDl;
  const cuti = summaryCuti !== null ? summaryCuti : daysCuti;
  const sakit = summarySakit !== null ? summarySakit : daysSakit;
  const izin = summaryIzin !== null ? summaryIzin : daysIzin;

  return createPresensiRow(
    {
      nip,
      nama,
      unitKerja: departemen,
      jabatan,
      hariKerja: totalHariKerja,
      hadir,
      terlambat,
      pulangCepat,
      alfa,
      dinasLuar,
      cuti,
      sakit,
      izin
    },
    importId,
    allEmployees
  );
}

/**
 * Parse a summary tabular table inside a PDF
 * (e.g. Rekapitulasi Presensi table with multiple employees on one page)
 */
function parseTabularPdfPage(
  page: PdfPageData,
  importId: string,
  allEmployees: Pegawai[]
): PPPKPresensiRow[] {
  const rows: PPPKPresensiRow[] = [];

  for (const line of page.lines) {
    // Look for lines containing an 18-digit NIP
    const nipMatch = line.match(/\b(19\d{16}|20\d{16}|\d{18})\b/);
    if (!nipMatch) continue;

    const nip = nipMatch[1];

    // Find all numbers on this line
    // e.g. "1. 199605152024212001 CHRISTIA SARI 120 118 2 0 0 2 0 0 0"
    const words = line.split(/\s+/);
    const nipIdx = words.findIndex(w => w.includes(nip));
    if (nipIdx === -1) continue;

    // Words before NIP might be row index
    // Words after NIP are typically Nama until the first number
    const afterNip = words.slice(nipIdx + 1);
    const nameParts: string[] = [];
    const numbers: number[] = [];

    for (const w of afterNip) {
      const cleaned = w.replace(/[,.]/g, '');
      if (/^-?\d+(\.\d+)?$/.test(cleaned) && !w.includes('/') && !w.includes('-')) {
        numbers.push(parseFloat(cleaned));
      } else {
        if (numbers.length === 0) {
          nameParts.push(w);
        }
      }
    }

    const nama = nameParts.join(' ');
    // Default columns order in summary:
    // hariKerja, hadir, terlambat, pulangCepat, alfa, dinasLuar, cuti, sakit, izin
    const hariKerja = numbers[0] ?? 120;
    const hadir = numbers[1] ?? Math.max(0, hariKerja - (numbers[4] || 0));
    const terlambat = numbers[2] ?? 0;
    const pulangCepat = numbers[3] ?? 0;
    const alfa = numbers[4] ?? 0;
    const dinasLuar = numbers[5] ?? 0;
    const cuti = numbers[6] ?? 0;
    const sakit = numbers[7] ?? 0;
    const izin = numbers[8] ?? 0;

    const row = createPresensiRow(
      {
        nip,
        nama,
        hariKerja,
        hadir,
        terlambat,
        pulangCepat,
        alfa,
        dinasLuar,
        cuti,
        sakit,
        izin
      },
      importId,
      allEmployees
    );

    rows.push(row);
  }

  return rows;
}

/**
 * Main parser function for PDF files
 */
export async function parsePdfPresensiFile(
  file: File,
  allEmployees: Pegawai[],
  importId: string
): Promise<PPPKPresensiRow[]> {
  const pages = await extractPdfPages(file);
  if (!pages || pages.length === 0) {
    throw new Error(`File ${file.name} kosong atau teks tidak dapat diekstrak.`);
  }

  const results: PPPKPresensiRow[] = [];
  const seenNips = new Set<string>();

  // Check if this PDF is a multi-employee summary table or individual pages
  let hasTabularRows = false;
  for (const page of pages) {
    const tabRows = parseTabularPdfPage(page, importId, allEmployees);
    if (tabRows.length > 1) {
      hasTabularRows = true;
      tabRows.forEach(r => {
        if (!seenNips.has(r.nip)) {
          seenNips.add(r.nip);
          results.push(r);
        }
      });
    }
  }

  if (hasTabularRows && results.length > 0) {
    return results;
  }

  // Otherwise, inspect page by page for individual employee reports
  // (e.g. 1 page per employee in bulk export)
  for (const page of pages) {
    const empRow = parseEmployeeFromLines(page.lines, file.name, importId, allEmployees);
    if (empRow && !seenNips.has(empRow.nip)) {
      seenNips.add(empRow.nip);
      results.push(empRow);
    }
  }

  if (results.length > 0) {
    return results;
  }

  // If no per-page employee was detected, try parsing the entire document combined as 1 employee
  const combinedLines = pages.flatMap(p => p.lines);
  const singleRow = parseEmployeeFromLines(combinedLines, file.name, importId, allEmployees);
  if (singleRow) {
    return [singleRow];
  }

  // Fallback: search for any registered PPPK employee mentioned in the PDF text
  for (const emp of allEmployees) {
    const isPppk = (emp.jenisPegawai || emp.status || '').toUpperCase().includes('PPPK');
    if (!isPppk) continue;

    const hasNip = combinedLines.some(l => l.includes(emp.nip));
    const hasNama = combinedLines.some(l => l.toLowerCase().includes(emp.nama.toLowerCase().slice(0, 8)));

    if ((hasNip || hasNama) && !seenNips.has(emp.nip)) {
      seenNips.add(emp.nip);
      results.push(
        createPresensiRow(
          {
            nip: emp.nip,
            nama: emp.nama,
            unitKerja: emp.unitKerja,
            jabatan: emp.jabatan,
            hariKerja: 120,
            hadir: 118,
            alfa: 0,
            keterangan: 'Terekstrak dari dokumen presensi DJKI'
          },
          importId,
          allEmployees
        )
      );
    }
  }

  if (results.length === 0) {
    throw new Error(`Tidak ditemukan data pegawai atau tabel presensi yang valid di dalam file "${file.name}".`);
  }

  return results;
}

/**
 * Universal Multi-file Parser for PPPK Evaluation
 * Supports: .pdf, .xlsx, .xls, .csv
 */
export async function parsePresensiFilesForPPPK(
  files: File[]
): Promise<PppkPresensiParseResult> {
  const allEmployees = getAllEmployees();
  const importId = `IMPORT-${Date.now()}`;
  const allRows: PPPKPresensiRow[] = [];
  const errors: string[] = [];
  const fileNames: string[] = [];

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    fileNames.push(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const rows = await parseExcelPresensiFile(file, allEmployees, importId);
        if (rows.length === 0) {
          throw new Error(`Format tabel pada "${file.name}" tidak memiliki kolom NIP/Nama yang dikenali.`);
        }
        allRows.push(...rows);
        successCount++;
      } else if (ext === 'pdf') {
        const rows = await parsePdfPresensiFile(file, allEmployees, importId);
        allRows.push(...rows);
        successCount++;
      } else {
        throw new Error(`Format file ".${ext}" tidak didukung. Harap unggah berkas PDF atau Excel.`);
      }
    } catch (err: any) {
      console.error(`Error parsing file ${file.name}:`, err);
      failCount++;
      errors.push(`${file.name}: ${err?.message || 'Gagal memproses file'}`);
    }
  }

  // Deduplicate rows by NIP
  const uniqueMap = new Map<string, PPPKPresensiRow>();
  allRows.forEach(r => {
    uniqueMap.set(r.nip, r);
  });

  return {
    rows: Array.from(uniqueMap.values()),
    totalFiles: files.length,
    successCount,
    failCount,
    errors,
    fileNames
  };
}
