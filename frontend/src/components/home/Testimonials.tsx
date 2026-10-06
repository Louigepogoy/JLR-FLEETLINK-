'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Quote, Star } from 'lucide-react';
import api from '@/lib/api';
import { Stars } from '@/components/reviews/StarRating';
import { IlloTile } from '@/components/illustrations/SpotIllustrations';
import type { Review } from '@/lib/reviews';
import { formatDate } from '@/lib/utils';
import { formatPlace } from '@/lib/philippines';

type HomeReview = Review & { vehicle_id: string; vehicle_title: string; city?: string; province?: string };
type HomeReviews = { average: number | null; count: number; reviews: HomeReview[] };

/** Home page "Reviews" section: real ratings and comments from renters after completed trips. */
export default function Testimonials() {
  const [data, setData] = useState<HomeReviews | null>(null);

  useEffect(() => {
    api.get('/reviews/recent').then((res) => setData(res.data.data)).catch(() => setData({ average: null, count: 0, reviews: [] }));
  }, []);

  return (
    <section id="testimonials" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12" data-reveal>
          <h2 className="text-4xl font-bold mb-4">What Renters <span className="gradient-text">Say</span></h2>
          <p className="text-[var(--muted)] max-w-2xl mx-auto">
            Real reviews from renters after completed trips — only people who actually rented a vehicle can leave one.
          </p>
          {data && data.count > 0 && data.average !== null && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 px-4 py-1.5 text-sm font-semibold">
              <Stars value={data.average} /> {data.average.toFixed(1)} average from {data.count} review{data.count === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {!data ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : data.reviews.length === 0 ? (
          <div className="glass-card mx-auto flex max-w-xl flex-col items-center gap-3 p-10 text-center">
            <IlloTile className="h-16 w-16">
              <Star className="h-[45%] w-[45%] text-[var(--primary)]" strokeWidth={1.75} />
            </IlloTile>
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm text-[var(--muted)]">
              Reviews appear here after renters complete their trips and rate the vehicle. Be one of the first!
            </p>
            <Link href="/vehicles" className="btn-primary mt-2 text-sm">Browse Vehicles</Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.reviews.map((r) => (
              <div key={r.id} className="glass-card flex flex-col p-6">
                <div className="mb-3 flex items-center justify-between">
                  <Stars value={r.rating} />
                  <Quote className="h-6 w-6 text-[var(--primary)]/30" />
                </div>
                <p className="mb-5 flex-1 text-sm leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-[var(--card-border)] pt-4">
                  {r.reviewer_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.reviewer_avatar_url} alt={r.reviewer_name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full gradient-bg font-semibold text-white">
                      {r.reviewer_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold">{r.reviewer_name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      Rented <Link href={`/vehicles/${r.vehicle_id}`} className="text-[var(--primary)] hover:underline">{r.vehicle_title}</Link>
                      {r.city ? ` · ${formatPlace(r.city, r.province)}` : ''} · {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
