
import React, { useState } from 'react';
import { Kegiatan } from '../types';

interface CalendarViewProps {
  events: Kegiatan[];
  onEventClick?: (event: Kegiatan) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick }) => {
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

  const days = [];
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Padding for previous month days
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50/50 border border-gray-100"></div>);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.tanggal === dateStr);
    const isToday = new Date().toISOString().split('T')[0] === dateStr;

    days.push(
      <div key={d} className={`h-24 md:h-32 p-2 border border-gray-100 relative group transition-all hover:bg-blue-50/30 ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}>
        <span className={`text-[10px] font-black ${isToday ? 'text-blue-600' : 'text-gray-400'} uppercase`}>{d}</span>
        <div className="mt-1 space-y-1 overflow-y-auto max-h-[calc(100%-20px)] no-scrollbar">
          {dayEvents.map(e => (
            <div 
              key={e.id} 
              onClick={() => onEventClick?.(e)}
              className="px-2 py-1 bg-blue-600 text-white text-[8px] font-black uppercase rounded shadow-sm cursor-pointer truncate hover:bg-blue-700 transition-colors"
              title={e.judulKegiatan}
            >
              {e.judulKegiatan}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b flex items-center justify-between bg-gray-50/50">
        <h4 className="text-[12px] font-black uppercase tracking-widest text-gray-950">{monthNames[month]} {year}</h4>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="h-10 w-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 transition-all"><i className="bi bi-chevron-left"></i></button>
          <button onClick={nextMonth} className="h-10 w-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 transition-all"><i className="bi bi-chevron-right"></i></button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
          <div key={day} className="py-3 text-center text-[9px] font-black uppercase text-gray-400 tracking-widest">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days}
      </div>
    </div>
  );
};

export default CalendarView;
