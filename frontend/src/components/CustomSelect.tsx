import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Option = { value: string; label: React.ReactNode };

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, placeholder = '请选择', className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(value => !value)} className="w-full rounded-lg border border-stone-200 bg-white py-2.5 px-3 text-left text-xs font-semibold text-stone-700 outline-hidden transition hover:border-stone-300 focus:border-amber-400 flex items-center justify-between gap-2">
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={15} className={`shrink-0 text-stone-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {options.map(option => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); }} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${option.value === value ? 'bg-amber-50 text-amber-900' : 'text-stone-600 hover:bg-stone-50'}`}>
              <span className="truncate">{option.label}</span>
              {option.value === value && <Check size={14} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
