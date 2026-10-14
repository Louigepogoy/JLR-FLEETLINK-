'use client';

import { useId, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Text input with a dropdown of suggested options that opens as soon as the field is focused (a plain
// <datalist> stays hidden until you type). Typing freely still works: the options are only suggestions.
export default function OptionCombobox({
  value, onChange, options, onPick, placeholder, disabled, required, loading, maxLength, className, hint, onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  onPick?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  maxLength?: number;
  className?: string;
  hint?: string;
  onBlur?: () => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = value.trim().toLowerCase();
  const matches = options
    .filter((o) => !typed || o.toLowerCase().includes(typed))
    .sort((a, b) => Number(!a.toLowerCase().startsWith(typed)) - Number(!b.toLowerCase().startsWith(typed)))
    .slice(0, 60);
  // Nothing to show once the typed text is exactly one of the options.
  const exact = options.some((o) => o.toLowerCase() === typed);
  const showList = open && !disabled && !exact && (matches.length > 0 || loading);

  const pick = (option: string) => {
    setOpen(false);
    onChange(option);
    onPick?.(option);
  };

  return (
    <div className="relative">
      <input
        className={cn(className, '!pr-10')}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); onBlur?.(); }}
        onKeyDown={(e) => {
          if (!showList || matches.length === 0) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % matches.length); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? matches.length - 1 : i - 1)); }
          else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-1 shadow-xl"
        >
          {hint && <li className="px-4 py-1.5 text-xs text-[var(--muted)]">{hint}</li>}
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--muted)]">Loading suggestions…</li>
          ) : matches.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(option); }}
              onMouseEnter={() => setActive(i)}
              className={cn('flex cursor-pointer items-center gap-3 px-4 py-2 text-sm', i === active && 'bg-[var(--primary)]/10')}
            >
              <MapPin className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="truncate">{option}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
