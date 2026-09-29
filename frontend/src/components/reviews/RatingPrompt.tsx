'use client';

import { useCallback, useEffect, useState } from 'react';
import ReviewModal from '@/components/reviews/ReviewModal';
import { fetchPendingReviews, REVIEWS_CHANGED_EVENT, type PendingReview } from '@/lib/reviews';

const POLL_MS = 60000;
const DISMISSED_KEY = 'jlr-dismissed-rating-prompts';

// "Later" hides a prompt for the rest of this browser session; the booking can still be rated
// from My Bookings / Booking Requests.
const readDismissed = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeDismissed = (ids: string[]) => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode etc.): the prompt just reappears next load.
  }
};

// Pops up the rating form automatically once a rental is completed, like ride/food delivery apps.
export default function RatingPrompt() {
  const [pending, setPending] = useState<PendingReview[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  const load = useCallback(() => {
    fetchPendingReviews().then(setPending).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    window.addEventListener(REVIEWS_CHANGED_EVENT, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener(REVIEWS_CHANGED_EVENT, load);
    };
  }, [load]);

  const current = pending.find((p) => !dismissed.includes(p.booking_id)) || null;

  const dismiss = () => {
    if (!current) return;
    const next = [...dismissed, current.booking_id];
    setDismissed(next);
    writeDismissed(next);
  };

  return (
    <ReviewModal
      pending={current}
      onClose={dismiss}
      onSubmitted={(bookingId) => setPending((list) => list.filter((p) => p.booking_id !== bookingId))}
    />
  );
}
