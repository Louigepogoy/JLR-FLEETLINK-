'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export const STAR_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Excellent'];

// Read-only stars; supports halves by clipping a filled star over an empty one.
export function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block">
            <Star className={cn(className, 'text-amber-400/30')} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={cn(className, 'fill-amber-400 text-amber-400')} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

// "★ 4.8 (12)" summary, or "New" when there are no ratings yet.
export function RatingBadge({
  average, count, className,
}: {
  average: number | string | null | undefined;
  count: number | null | undefined;
  className?: string;
}) {
  if (!count || average == null) {
    return <span className={cn('text-xs text-[var(--muted)]', className)}>No ratings yet</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span className="font-semibold">{Number(average).toFixed(1)}</span>
      <span className="text-xs text-[var(--muted)]">({count} {count === 1 ? 'rating' : 'ratings'})</span>
    </span>
  );
}

export function StarInput({
  value, onChange, label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="text-center">
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="p-0.5 transition-transform hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star className={cn('h-9 w-9', n <= shown ? 'fill-amber-400 text-amber-400' : 'text-amber-400/30')} />
          </button>
        ))}
      </div>
      <p className="mt-1 h-4 text-xs text-[var(--muted)]">{shown ? STAR_LABELS[shown - 1] : 'Tap a star'}</p>
    </div>
  );
}
