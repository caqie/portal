
import React, { useState, useRef, useEffect, useMemo } from 'react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Cari...", 
  label,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const safeOptions = Array.isArray(options) ? options : [];

  const selectedOption = useMemo(() => 
    safeOptions.find(opt => opt.value === value), 
  [safeOptions, value]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return safeOptions;
    const term = searchTerm.toLowerCase();
    return safeOptions.filter(opt => 
      (opt.label && opt.label.toLowerCase().includes(term)) || 
      (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  }, [safeOptions, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={wrapperRef}>
      {label && (
        <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-2 block">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-5 py-3.5 bg-gray-50 border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
          isOpen ? 'border-blue-600 bg-white ring-4 ring-blue-50' : 'border-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="min-w-0 flex-1">
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-gray-950 uppercase truncate">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-[8px] font-bold text-blue-600 uppercase tracking-tighter">
                  {selectedOption.subLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] font-bold text-gray-300 uppercase">{placeholder}</span>
          )}
        </div>
        <i className={`bi bi-chevron-down text-[10px] transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600' : 'text-gray-400'}`}></i>
      </div>

      {isOpen && (
        <div className="absolute z-[2000] top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-modalEnter flex flex-col max-h-[320px]">
          <div className="p-3 border-b border-gray-50 bg-gray-50/50 shrink-0">
            <div className="relative">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              <input 
                autoFocus
                type="text" 
                placeholder="Ketik Nama atau NIP..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-blue-500 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => (
                <div 
                  key={`${opt.value}-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-5 py-3.5 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${
                    value === opt.value ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase ${value === opt.value ? 'text-blue-700' : 'text-gray-950'}`}>
                    {opt.label}
                  </p>
                  {opt.subLabel && (
                    <p className="text-[8px] font-bold text-gray-400 mt-0.5">{opt.subLabel}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-10 text-center">
                <i className="bi bi-person-x text-3xl text-gray-200 block mb-2"></i>
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Tidak Ditemukan</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e880; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default SearchableSelect;
