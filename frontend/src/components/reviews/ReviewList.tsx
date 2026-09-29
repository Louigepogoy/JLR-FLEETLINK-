'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { RatingBadge, Stars } from '@/components/reviews/StarRating';
import { profilePath } from '@/lib/chat';
import type { ReviewSummary } from '@/lib/reviews';
import { formatDate } from '@/lib/utils';

export default function ReviewList({ title, summary }: { title: string; summary: ReviewSummary | null }) {
  return (
    <div className="glass-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> {title}
        </h2>
        {summary && <RatingBadge average={summary.average} count={summary.count} />}
      </div>

      {!summary ? (
        <div className="space-y-3">
          <div className="skeleton h-16 rounded-xl" />
          <div className="skeleton h-16 rounded-xl" />
        </div>
      ) : summary.reviews.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No reviews yet. Ratings appear here after completed rentals.</p>
      ) : (
        <ul className="space-y-4">
          {summary.reviews.map((r) => (
            <li key={r.id} className="flex gap-3 border-b border-[var(--card-border)] pb-4 last:border-0 last:pb-0">
              <Link href={profilePath(r.reviewer_id)} className="shrink-0">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full gradient-bg text-sm font-bold text-white">
                  {r.reviewer_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.reviewer_avatar_url} alt={r.reviewer_name} className="h-full w-full object-cover" />
                  ) : (
                    r.reviewer_name.charAt(0).toUpperCase()
                  )}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <Link href={profilePath(r.reviewer_id)} className="font-medium hover:underline">{r.reviewer_name}</Link>
                  <span className="text-[11px] text-[var(--muted)]">{formatDate(r.created_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} className="h-3.5 w-3.5" />
                  {r.reviewee_role && (
                    <span className="text-[11px] text-[var(--muted)]">
                      as {r.reviewee_role === 'owner' ? 'owner' : 'renter'}{r.vehicle_title ? ` · ${r.vehicle_title}` : ''}
                    </span>
                  )}
                </div>
                {r.comment && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{r.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
