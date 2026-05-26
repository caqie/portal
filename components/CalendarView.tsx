
import React, { useState } from 'react';
import { Kegiatan } from '../types';

interface CalendarViewProps {
  events: Kegiatan[];
  onDateClick?: (date: string, events: Kegiatan[]) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events = [], onDateClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Padding for previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    days.push(
      <div key={`prev-${d}`} className="h-24 md:h-32 bg-gray-50/30 border-b border-r border-gray-100/50 p-3 opacity-40">
        <span className="text-[10px] font-bold text-gray-300 uppercase">{d}</span>
      </div>
    );
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const dayEvents = events.filter(e => {
      const start = e.tanggalMulai;
      const end = e.tanggalSelesai || e.tanggalMulai;
      return dateStr >= start && dateStr <= end;
    });

    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <div 
        key={d} 
        onClick={() => onDateClick?.(dateStr, dayEvents)}
        className={`h-24 md:h-32 p-3 border-b border-r border-gray-100 relative group transition-all hover:bg-blue-50/40 cursor-pointer overflow-hidden ${isToday ? 'bg-blue-50/20' : 'bg-white'}`}
      >
        {isToday && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
        )}
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[11px] font-black ${isToday ? 'text-blue-600' : 'text-gray-400'} uppercase tracking-tighter`}>
            {d}
          </span>
          {dayEvents.length > 0 && (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
          )}
        </div>
        <div className="space-y-1.5 overflow-y-auto max-h-[calc(100%-24px)] no-scrollbar">
          {dayEvents.slice(0, 3).map((e, idx) => (
            <div 
              key={`${e.id}-${idx}`} 
              className="px-2 py-1 bg-blue-600/10 text-blue-700 text-[8px] font-black uppercase rounded-md border border-blue-100 truncate hover:bg-blue-600 hover:text-white transition-colors"
              title={e.judulKegiatan}
            >
              {e.judulKegiatan}
            </div>
          ))}
          {dayEvents.length > 3 && (
            <div className="text-[7px] font-black text-gray-400 uppercase tracking-widest text-center py-1 bg-gray-50 rounded-md">
              +{dayEvents.length - 3} Agenda Lainnya
            </div>
          )}
        </div>
      </div>
    );
  }

  // Padding for next month days
  const remainingCells = 42 - days.length; // 6 rows of 7 days
  for (let i = 1; i <= remainingCells; i++) {
    days.push(
      <div key={`next-${i}`} className="h-24 md:h-32 bg-gray-50/30 border-b border-r border-gray-100/50 p-3 opacity-40">
        <span className="text-[10px] font-bold text-gray-300 uppercase">{i}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b flex flex-col md:flex-row items-center justify-between gap-6 bg-white">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h4 className="text-2xl font-black uppercase tracking-tighter text-gray-950 leading-none">{monthNames[month]}</h4>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-2">{year}</span>
          </div>
          <button 
            onClick={goToToday}
            className="px-5 py-2 bg-blue-50 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
          >
            Hari Ini
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={prevMonth} 
            className="h-12 w-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all active:scale-95 group"
          >
            <i className="bi bi-chevron-left text-lg group-hover:-translate-x-0.5 transition-transform"></i>
          </button>
          <button 
            onClick={nextMonth} 
            className="h-12 w-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all active:scale-95 group"
          >
            <i className="bi bi-chevron-right text-lg group-hover:translate-x-0.5 transition-transform"></i>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, i) => (
          <div 
            key={day} 
            className={`py-4 text-center text-[9px] font-black uppercase tracking-[0.2em] ${i === 0 || i === 6 ? 'text-rose-400' : 'text-gray-400'}`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-gray-100">
        {days}
      </div>
    </div>
  );
};

export default CalendarView;
