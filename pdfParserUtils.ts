export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface ParsedDay {
  dateStr: string;
  date: Date | null;
  dayName: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  status: string | null;
  isWeekend: boolean;
  isHoliday: boolean;
  isEffectiveWorkday: boolean;
  attendanceType: 'PRESENT' | 'DL_FULL' | 'EXCUSED' | 'ABSENT' | 'WEEKEND' | 'HOLIDAY';
  isLate?: boolean;
  lateMinutes?: number;
  isEarlyLeave?: boolean;
  earlyLeaveMinutes?: number;
  requiredCheckInStr?: string;
  requiredCheckOutStr?: string;
}

export interface ParsedAttendance {
  fileName: string;
  nama: string;
  nip: string;
  departemen: string;
  golongan: string;
  jabatan: string;
  periode: string;
  days: ParsedDay[];
  summary: {
    totalCalendarDays: number;
    weekendsCount: number;
    holidaysCount: number;
    effectiveWorkdays: number;
    presentCount: number;
    dlFullCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number;
    lateCount: number;
    earlyLeaveCount: number;
    totalLateMinutes: number;
    totalEarlyLeaveMinutes: number;
  };
}

export const DEFAULT_HOLIDAYS: Holiday[] = [
  // Late 2025
  { date: '2025-12-25', name: 'Hari Raya Natal' },
  { date: '2025-12-26', name: 'Cuti Bersama Natal' },
  // 2026 National Holidays & Joint Leaves (Cuti Bersama)
  { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi' },
  { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad S.A.W.' },
  { date: '2026-02-16', name: 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili' },
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili' },
  { date: '2026-03-18', name: 'Cuti Bersama Hari Suci Nyepi (Tahun Baru Saka 1948)' },
  { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
  { date: '2026-03-20', name: 'Cuti Bersama Idul Fitri 1447 Hijriah' },
  { date: '2026-03-21', name: 'Hari Raya Idul Fitri 1447 Hijriah' },
  { date: '2026-03-22', name: 'Hari Raya Idul Fitri 1447 Hijriah' },
  { date: '2026-03-23', name: 'Cuti Bersama Idul Fitri 1447 Hijriah' },
  { date: '2026-03-24', name: 'Cuti Bersama Idul Fitri 1447 Hijriah' },
  { date: '2026-04-03', name: 'Wafat Yesus Kristus' },
  { date: '2026-04-05', name: 'Kebangkitan Yesus Kristus (Paskah)' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional' },
  { date: '2026-05-14', name: 'Kenaikan Yesus Kristus' },
  { date: '2026-05-15', name: 'Cuti Bersama Kenaikan Yesus Kristus' },
  { date: '2026-05-27', name: 'Idul Adha 1447 Hijriah' },
  { date: '2026-05-28', name: 'Cuti Bersama Idul Adha 1447 Hijriah' },
  { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
  { date: '2026-06-16', name: '1 Muharam Tahun Baru Islam 1448 Hijriah' },
  { date: '2026-08-17', name: 'Proklamasi Kemerdekaan' },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad S.A.W.' },
  { date: '2026-12-24', name: 'Cuti Bersama Kelahiran Yesus Kristus' },
  { date: '2026-12-25', name: 'Kelahiran Yesus Kristus' }
];

export const parseIndoDate = (dateStr: string): Date | null => {
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10);
  
  let month = -1;
  if (monthStr.startsWith('jan')) month = 0;
  else if (monthStr.startsWith('feb')) month = 1;
  else if (monthStr.startsWith('mar')) month = 2;
  else if (monthStr.startsWith('apr')) month = 3;
  else if (monthStr.startsWith('mei') || monthStr === 'may') month = 4;
  else if (monthStr.startsWith('jun')) month = 5;
  else if (monthStr.startsWith('jul')) month = 6;
  else if (monthStr.startsWith('agt') || monthStr.startsWith('agu') || monthStr.startsWith('aug')) month = 7;
  else if (monthStr.startsWith('sep')) month = 8;
  else if (monthStr.startsWith('okt') || monthStr.startsWith('oct')) month = 9;
  else if (monthStr.startsWith('nov')) month = 10;
  else if (monthStr.startsWith('des') || monthStr.startsWith('dec')) month = 11;
  
  if (month === -1 || isNaN(day) || isNaN(year)) return null;
  
  return new Date(year, month, day);
};

export const isHolidayStatus = (status: string): boolean => {
  const lower = status.toLowerCase();
  return (
    lower.includes('cuti bersama') ||
    lower.includes('tahun baru') ||
    lower.includes('imlek') ||
    lower.includes('nyepi') ||
    lower.includes('idul fitri') ||
    lower.includes('idul adha') ||
    lower.includes('wafat') ||
    lower.includes('yesus') ||
    lower.includes('kristus') ||
    lower.includes('isa almasih') ||
    lower.includes('almasih') ||
    lower.includes('paskah') ||
    lower.includes('buruh') ||
    lower.includes('kenaikan') ||
    lower.includes('pancasila') ||
    lower.includes('kemerdekaan') ||
    lower.includes('proklamasi') ||
    lower.includes('maulid') ||
    lower.includes('natal') ||
    lower.includes('isra') ||
    lower.includes('mikraj') ||
    lower.includes('mi\'raj') ||
    lower.includes('hari raya') ||
    lower.includes('kongzili') ||
    lower.includes('islam') ||
    lower.includes('hijriah') ||
    lower.includes('hijriyah') ||
    lower.includes('waisak') ||
    lower.includes('libur')
  );
};

export const getIsoDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const timeToMinutes = (timeStr: string | null): number | null => {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

export const minutesToTimeStr = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const parseLine = (line: string) => {
  const trimmed = line.trim();
  const dateMatch = trimmed.match(/^(\d{1,2}\s+[A-Za-z]{3,10}\s+\d{4})/i);
  if (!dateMatch) return null;
  
  const dateStr = dateMatch[1];
  const rest = trimmed.substring(dateStr.length).trim();
  
  const dayMatch = rest.match(/^(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)/i);
  if (!dayMatch) return null;
  
  const dayName = dayMatch[1];
  let remainder = rest.substring(dayName.length).trim();
  
  const timeRegex = /(\d{2}:\d{2}:\d{2})/g;
  const times = remainder.match(timeRegex) || [];
  
  let status = remainder;
  times.forEach(t => {
    status = status.replace(t, '');
  });
  status = status.trim();
  
  let jamMasuk: string | null = null;
  let jamKeluar: string | null = null;
  
  if (times.length >= 2) {
    jamMasuk = times[0] || null;
    jamKeluar = times[times.length - 1] || null;
  } else if (times.length === 1) {
    const timeStr = times[0] || null;
    if (timeStr) {
      const hourPart = parseInt(timeStr.split(':')[0], 10);
      if (!isNaN(hourPart) && hourPart >= 11) {
        jamKeluar = timeStr;
      } else {
        jamMasuk = timeStr;
      }
    }
  }
  
  return {
    dateStr,
    dayName,
    jamMasuk,
    jamKeluar,
    status: status || null
  };
};

export const isRamadanPeriod = (date: Date, holidays: Holiday[]): boolean => {
  const year = date.getFullYear();
  
  // Find all holidays in this year that contain 'hari raya idul fitri'
  const idulFitriHolidays = holidays
    .filter(h => {
      const isCorrectYear = h.date.startsWith(`${year}-`);
      const nameLower = h.name.toLowerCase();
      return isCorrectYear && nameLower.includes('hari raya idul fitri');
    })
    .map(h => {
      const parts = h.date.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    })
    .sort((a, b) => a.getTime() - b.getTime());

  if (idulFitriHolidays.length === 0) {
    // Fallback if no holiday is found in the list.
    // In 2026, Ramadan starts February 19, 2026 and ends March 20, 2026.
    if (year === 2026) {
      const ramadanStart = new Date(2026, 1, 19); // Feb 19
      const ramadanEnd = new Date(2026, 2, 20);   // Mar 20
      return date >= ramadanStart && date <= ramadanEnd;
    }
    return false;
  }

  const earliestIdulFitri = idulFitriHolidays[0];

  // Ramadan is defined as approximately 30 days before the earliest Idul Fitri holiday
  const ramadanStart = new Date(earliestIdulFitri.getTime());
  ramadanStart.setDate(earliestIdulFitri.getDate() - 30);

  const ramadanEnd = new Date(earliestIdulFitri.getTime());
  ramadanEnd.setDate(earliestIdulFitri.getDate() - 1);

  // Normalize all dates to midnight for comparison
  const targetTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startTime = new Date(ramadanStart.getFullYear(), ramadanStart.getMonth(), ramadanStart.getDate()).getTime();
  const endTime = new Date(ramadanEnd.getFullYear(), ramadanEnd.getMonth(), ramadanEnd.getDate()).getTime();

  return targetTime >= startTime && targetTime <= endTime;
};

export const parseSinglePdf = async (file: File, holidays: Holiday[]): Promise<ParsedAttendance> => {
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js library is not loaded yet');
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    
    // Sort and construct line-by-line with coordinates to support tabular formats
    const linesMap: { [key: number]: any[] } = {};
    items.forEach(item => {
      const y = Math.round(item.transform[5] * 2) / 2;
      let foundY = Object.keys(linesMap).find(existingY => Math.abs(Number(existingY) - y) < 4);
      if (foundY) {
        linesMap[Number(foundY)].push(item);
      } else {
        linesMap[y] = [item];
      }
    });
    
    const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
    let pageText = '';
    sortedY.forEach(y => {
      const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = lineItems.map(item => item.str).join(' ');
      pageText += lineText + '\n';
    });
    fullText += pageText + '\n';
  }
  
  let nama = '';
  let nip = '';
  let departemen = '';
  let golongan = '';
  let jabatan = '';
  let periode = '';
  
  const lines = fullText.split('\n');
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes('nama')) {
      const match = line.match(/nama\s*:\s*(.*)/i);
      if (match) nama = match[1].trim();
    }
    if (lower.includes('nip')) {
      const match = line.match(/nip\s*:\s*([^\s]+)/i) || line.match(/nip\s*:\s*(.*)/i);
      if (match) nip = match[1].trim().replace(/\s+/g, '');
    }
    if (lower.includes('departemen')) {
      const match = line.match(/departemen\s*:\s*(.*)/i);
      if (match) departemen = match[1].trim();
    }
    if (lower.includes('golongan')) {
      const match = line.match(/golongan\s*:\s*(.*)/i);
      if (match) golongan = match[1].trim();
    }
    if (lower.includes('jabatan')) {
      const match = line.match(/jabatan\s*:\s*(.*)/i);
      if (match) jabatan = match[1].trim();
    }
    if (lower.includes('periode')) {
      const match = line.match(/periode\s*:\s*(.*)/i);
      if (match) periode = match[1].trim();
    }
  });

  // Fallbacks
  if (!nama) {
    const namaLine = lines.find(l => l.match(/Nama\s*:/i));
    if (namaLine) nama = namaLine.replace(/.*Nama\s*:\s*/i, '').trim();
  }
  if (!nip) {
    const nipLine = lines.find(l => l.match(/NIP\s*:/i));
    if (nipLine) nip = nipLine.replace(/.*NIP\s*:\s*/i, '').trim().replace(/\s+/g, '');
  }
  if (!departemen) {
    const deptLine = lines.find(l => l.match(/Departemen\s*:/i));
    if (deptLine) departemen = deptLine.replace(/.*Departemen\s*:\s*/i, '').trim();
  }
  if (!golongan) {
    const golLine = lines.find(l => l.match(/Golongan\s*:/i));
    if (golLine) golongan = golLine.replace(/.*Golongan\s*:\s*/i, '').trim();
  }
  if (!jabatan) {
    const jabLine = lines.find(l => l.match(/Jabatan\s*:/i));
    if (jabLine) jabatan = jabLine.replace(/.*Jabatan\s*:\s*/i, '').trim();
  }
  if (!periode) {
    const periodLine = lines.find(l => l.match(/PERIODE\s*:/i));
    if (periodLine) {
      periode = periodLine.replace(/.*PERIODE\s*:\s*/i, '').trim();
    } else {
      const match = fullText.match(/PERIODE:\s*([^\n\r]+)/i);
      if (match) periode = match[1].trim();
    }
  }

  const days: ParsedDay[] = [];
  lines.forEach(line => {
    const parsed = parseLine(line);
    if (parsed) {
      const dateObj = parseIndoDate(parsed.dateStr);
      const dateKey = dateObj ? getIsoDateStr(dateObj) : '';
      
      const isWeekend = parsed.dayName.toLowerCase() === 'sabtu' || 
                        parsed.dayName.toLowerCase() === 'minggu' || 
                        (dateObj ? (dateObj.getDay() === 0 || dateObj.getDay() === 6) : false);
                        
      const isHolidayFromStatus = parsed.status ? isHolidayStatus(parsed.status) : false;
      const isHoliday = holidays.some(h => h.date === dateKey) || isHolidayFromStatus;
      const isEffectiveWorkday = !isWeekend && !isHoliday;
      
      let attendanceType: 'PRESENT' | 'DL_FULL' | 'EXCUSED' | 'ABSENT' | 'WEEKEND' | 'HOLIDAY' = 'ABSENT';
      
      if (isWeekend) {
        attendanceType = 'WEEKEND';
      } else if (isHoliday) {
        attendanceType = 'HOLIDAY';
      } else {
        const hasTime = parsed.jamMasuk !== null || parsed.jamKeluar !== null;
        if (hasTime) {
          if (parsed.status) {
            const lowerStatus = parsed.status.toLowerCase();
            if (lowerStatus.includes('dl full') || lowerStatus.includes('dinas luar full') || lowerStatus === 'dl' || (lowerStatus.includes('dinas luar') && !lowerStatus.includes('half'))) {
              attendanceType = 'DL_FULL';
            } else {
              attendanceType = 'PRESENT';
            }
          } else {
            attendanceType = 'PRESENT';
          }
        } else if (parsed.status) {
          const lowerStatus = parsed.status.toLowerCase();
          if (lowerStatus.includes('dl half') || lowerStatus.includes('dinas luar half') || lowerStatus.includes('ijin sah') || lowerStatus.includes('izin sah')) {
            attendanceType = 'PRESENT';
          } else if (lowerStatus.includes('dl full') || lowerStatus.includes('dinas luar full') || lowerStatus === 'dl' || (lowerStatus.includes('dinas luar') && !lowerStatus.includes('half'))) {
            attendanceType = 'DL_FULL';
          } else if (lowerStatus.includes('tanpa keterangan') || lowerStatus.includes('alpa') || lowerStatus.includes('mangkir')) {
            attendanceType = 'ABSENT';
          } else {
            attendanceType = 'EXCUSED';
          }
        } else {
          attendanceType = 'ABSENT';
        }
      }
      
      let isLate = false;
      let lateMinutes = 0;
      let isEarlyLeave = false;
      let earlyLeaveMinutes = 0;
      let requiredCheckInStr = '';
      let requiredCheckOutStr = '';

      if (isEffectiveWorkday && (attendanceType === 'PRESENT' || attendanceType === 'DL_FULL')) {
        const inMin = timeToMinutes(parsed.jamMasuk);
        const outMin = timeToMinutes(parsed.jamKeluar);
        const lowerDay = parsed.dayName.toLowerCase();

        const hasIzinSah = parsed.status ? (
          parsed.status.toLowerCase().includes('izin sah') || 
          parsed.status.toLowerCase().includes('ijin sah')
        ) : false;

        const isDlHalf = parsed.status ? (
          parsed.status.toLowerCase().includes('dl half') ||
          parsed.status.toLowerCase().includes('dinas luar half')
        ) : false;

        const isDlFull = attendanceType === 'DL_FULL' || (parsed.status ? (
          parsed.status.toLowerCase().includes('dl full') ||
          parsed.status.toLowerCase().includes('dinas luar full') ||
          parsed.status.toLowerCase() === 'dl' ||
          (parsed.status.toLowerCase().includes('dinas luar') && !parsed.status.toLowerCase().includes('half'))
        ) : false);

        const skipLatenessAndEarlyLeave = hasIzinSah || isDlHalf || isDlFull;

        const isRamadan = dateObj ? isRamadanPeriod(dateObj, holidays) : false;

        if (isRamadan) {
          const isFriday = lowerDay === 'jumat';
          requiredCheckInStr = '08:00 (Ramadhan)';
          requiredCheckOutStr = isFriday ? '15:30 (Ramadhan)' : '15:00 (Ramadhan)';
          
          if (!skipLatenessAndEarlyLeave) {
            if (inMin !== null) {
              if (inMin > 480) { // after 08:00 (480 mins)
                isLate = true;
                lateMinutes = inMin - 480;
              }
            }
            if (outMin !== null) {
              const requiredOutMin = isFriday ? 930 : 900; // 15:30 is 930 mins, 15:00 is 900 mins
              if (outMin < requiredOutMin) {
                isEarlyLeave = true;
                earlyLeaveMinutes = requiredOutMin - outMin;
              }
            }
          }
        } else if (lowerDay === 'senin') {
          requiredCheckInStr = '07:30';
          requiredCheckOutStr = '16:00';
          
          if (!skipLatenessAndEarlyLeave) {
            if (inMin !== null) {
              if (inMin > 450) { // after 07:30
                isLate = true;
                lateMinutes = inMin - 450;
              }
            }
            if (outMin !== null) {
              if (outMin < 960) { // before 16:00
                isEarlyLeave = true;
                earlyLeaveMinutes = 960 - outMin;
              }
            }
          }
        } else if (lowerDay === 'selasa' || lowerDay === 'rabu' || lowerDay === 'kamis') {
          requiredCheckInStr = '07:30 - 08:30 (Flexi)';
          
          if (inMin !== null) {
            if (!skipLatenessAndEarlyLeave && inMin > 510) { // after 08:30
              isLate = true;
              lateMinutes = inMin - 510;
            }
            
            // Required checkout time: Check-in + 8.5 hours (510 minutes), capped at 17:30 (1050), min 16:00 (960)
            const calculatedOutMin = Math.max(960, Math.min(1050, inMin + 510));
            requiredCheckOutStr = minutesToTimeStr(calculatedOutMin) + ' (Flexi)';
            
            if (outMin !== null) {
              if (!skipLatenessAndEarlyLeave && outMin < calculatedOutMin) {
                isEarlyLeave = true;
                earlyLeaveMinutes = calculatedOutMin - outMin;
              }
            }
          } else {
            requiredCheckOutStr = '16:00';
            if (!skipLatenessAndEarlyLeave && outMin !== null && outMin < 960) {
              isEarlyLeave = true;
              earlyLeaveMinutes = 960 - outMin;
            }
          }
        } else if (lowerDay === 'jumat') {
          requiredCheckInStr = '07:30';
          requiredCheckOutStr = '16:30';
          
          if (!skipLatenessAndEarlyLeave) {
            if (inMin !== null) {
              if (inMin > 450) { // after 07:30
                isLate = true;
                lateMinutes = inMin - 450;
              }
            }
            if (outMin !== null) {
              if (outMin < 990) { // before 16:30
                isEarlyLeave = true;
                earlyLeaveMinutes = 990 - outMin;
              }
            }
          }
        }
      }

      days.push({
        dateStr: parsed.dateStr,
        date: dateObj,
        dayName: parsed.dayName,
        jamMasuk: parsed.jamMasuk,
        jamKeluar: parsed.jamKeluar,
        status: parsed.status,
        isWeekend,
        isHoliday,
        isEffectiveWorkday,
        attendanceType,
        isLate,
        lateMinutes,
        isEarlyLeave,
        earlyLeaveMinutes,
        requiredCheckInStr,
        requiredCheckOutStr
      });
    }
  });

  const totalCalendarDays = days.length;
  const weekendsCount = days.filter(d => d.isWeekend).length;
  const holidaysCount = days.filter(d => d.isHoliday).length;
  const effectiveWorkdays = days.filter(d => d.isEffectiveWorkday).length;
  
  const presentCount = days.filter(d => d.isEffectiveWorkday && d.attendanceType === 'PRESENT').length;
  const dlFullCount = days.filter(d => d.isEffectiveWorkday && d.attendanceType === 'DL_FULL').length;
  const excusedCount = days.filter(d => d.isEffectiveWorkday && d.attendanceType === 'EXCUSED').length;
  const absentCount = days.filter(d => d.isEffectiveWorkday && d.attendanceType === 'ABSENT').length;
  
  const lateCount = days.filter(d => d.isLate).length;
  const earlyLeaveCount = days.filter(d => d.isEarlyLeave).length;
  const totalLateMinutes = days.reduce((sum, d) => sum + (d.lateMinutes || 0), 0);
  const totalEarlyLeaveMinutes = days.reduce((sum, d) => sum + (d.earlyLeaveMinutes || 0), 0);

  const attendanceRate = effectiveWorkdays > 0 
    ? Math.round(((presentCount + dlFullCount) / effectiveWorkdays) * 100) 
    : 100;

  return {
    fileName: file.name,
    nama: nama || file.name.replace(/\.[^/.]+$/, "").replace(/_/g, ' '),
    nip: nip || '-',
    departemen: departemen || '-',
    golongan: golongan || '-',
    jabatan: jabatan || '-',
    periode: periode || '-',
    days,
    summary: {
      totalCalendarDays,
      weekendsCount,
      holidaysCount,
      effectiveWorkdays,
      presentCount,
      dlFullCount,
      absentCount,
      excusedCount,
      attendanceRate,
      lateCount,
      earlyLeaveCount,
      totalLateMinutes,
      totalEarlyLeaveMinutes
    }
  };
};
