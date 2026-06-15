import React, { useState, useRef, useEffect, useMemo } from 'react';

interface AutocompleteInputProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  labelClass?: string;
  containerClass?: string;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  options = [],
  placeholder,
  className = '',
  labelClass = '',
  containerClass = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const val = (value || '').toLowerCase().trim();
    if (!val) return options.slice(0, 15); // Show first 15 default options
    return options
      .filter(opt => opt.toLowerCase().includes(val))
      .slice(0, 15);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        onChange(filteredOptions[highlightedIndex]);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${containerClass}`} ref={wrapperRef}>
      {label && <label className={labelClass}>{label}</label>}
      <input
        type="text"
        className={`${className} uppercase`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-[3000] left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filteredOptions.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`px-4 py-2 text-[11px] font-bold text-gray-800 cursor-pointer transition-colors ${
                idx === highlightedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
