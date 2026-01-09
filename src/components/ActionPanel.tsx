import React from 'react';

interface Props {
  options: string[];
  onSelect: (val: string) => void;
  disabled: boolean;
}

export function ActionPanel({ options, onSelect, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          disabled={disabled}
          className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 
                     border border-slate-600 rounded transition-colors font-medium text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {opt}
        </button>
      ))}
    </div>
  );
}