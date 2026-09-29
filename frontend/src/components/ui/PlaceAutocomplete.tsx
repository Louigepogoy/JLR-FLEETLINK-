'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { suggestPlaces, type LatLng, type PlaceSuggestion } from '@/lib/geocode';
import { cn } from '@/lib/utils';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

// Text input that suggests streets, barangays, and landmarks as you type (like ride-hailing apps).
// Typing freely still works; picking a suggestion also hands back its map position.
export default function PlaceAutocomplete({
  value, onChange, onPick, onBlur, near, placeholder, required, className,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (place: PlaceSuggestion) => void;
  onBlur?: () => void;
  near: LatLng;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  useEffect(() => () => {
    clearTimeout(timer.current);
    request.current?.abort();
  }, []);

  const search = (text: string) => {
    clearTimeout(timer.current);
    request.current?.abort();
    if (text.trim().length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      request.current = controller;
      try {
        const results = await suggestPlaces(text.trim(), near, controller.signal);
        setSuggestions(results);
        setActive(-1);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  const pick = (place: PlaceSuggestion) => {
    setOpen(false);
    setSuggestions([]);
    onPick(place);
  };

  const showList = open && value.trim().length >= MIN_CHARS && (suggestions.length > 0 || !loading);

  return (
    <div className="relative">
      <input
        className={cn(className, '!pr-10')}
        placeholder={placeholder}
        required={required}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          search(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={(e) => {
          if (!showList || suggestions.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]" />}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-72 overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--background)] py-1 shadow-xl"
        >
          {suggestions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--muted)]">No matching street or place. Keep typing, or pin it on the map.</li>
          ) : suggestions.map((place, i) => (
            <li
              key={place.id}
              role="option"
              aria-selected={i === active}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                pick(place);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-start gap-3 px-4 py-2.5 text-sm',
                i === active && 'bg-[var(--primary)]/10'
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{place.name}</span>
                {place.detail && <span className="block truncate text-xs text-[var(--muted)]">{place.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
