'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Car, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { StarInput } from '@/components/reviews/StarRating';
import { apiErrorMessage } from '@/lib/chat';
import { submitReview, type PendingReview } from '@/lib/reviews';
import { formatDate } from '@/lib/utils';

// "How was your trip?" popup shown after a completed rental. Customers rate the vehicle and the owner;
// owners rate the customer.
export default function ReviewModal({
  pending, onClose, onSubmitted, laterLabel = 'Later',
}: {
  pending: PendingReview | null;
  onClose: () => void;
  onSubmitted: (bookingId: string) => void;
  laterLabel?: string;
}) {
  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card max-h-[90vh] w-full max-w-md overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Keyed so the form resets when the next pending rating is shown. */}
            <ReviewForm key={pending.booking_id} pending={pending} onClose={onClose} onSubmitted={onSubmitted} laterLabel={laterLabel} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ReviewForm({
  pending, onClose, onSubmitted, laterLabel,
}: {
  pending: PendingReview;
  onClose: () => void;
  onSubmitted: (bookingId: string) => void;
  laterLabel: string;
}) {
  const isCustomer = pending.my_role === 'customer';
  const [vehicleRating, setVehicleRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = userRating > 0 && (!isCustomer || vehicleRating > 0);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(isCustomer ? 'Please rate both the vehicle and the owner' : 'Please rate the customer');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({
        bookingId: pending.booking_id,
        userRating,
        vehicleRating: isCustomer ? vehicleRating : undefined,
        comment: comment.trim() || undefined,
      });
      toast.success('Thanks for your rating!');
      onSubmitted(pending.booking_id);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not submit rating'));
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{isCustomer ? 'How was your trip?' : 'How was your renter?'}</h2>
          <p className="text-xs text-[var(--muted)]">
            {formatDate(pending.start_date)} — {formatDate(pending.end_date)}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-xl bg-[var(--primary)]/5 p-3">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--primary)]/10">
          {pending.vehicle_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pending.vehicle_image} alt={pending.vehicle_title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center"><Car className="h-5 w-5 text-[var(--primary)]" /></div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{pending.vehicle_title}</p>
          <p className="truncate text-xs text-[var(--muted)]">
            {isCustomer ? 'Owner' : 'Renter'}: {pending.other_name}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {isCustomer && <StarInput label="Rate the vehicle" value={vehicleRating} onChange={setVehicleRating} />}
        <StarInput
          label={isCustomer ? `Rate the owner, ${pending.other_name}` : `Rate the renter, ${pending.other_name}`}
          value={userRating}
          onChange={setUserRating}
        />
        <div>
          <label className="mb-1 block text-sm font-medium">Write a review (optional)</label>
          <textarea
            className="input-field"
            rows={3}
            maxLength={1000}
            placeholder={isCustomer ? 'e.g. Clean car, on-time pickup, friendly owner' : 'e.g. Returned the car on time and clean'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-[var(--muted)]">Keep it respectful. Reviews with bad words are not allowed.</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={onClose} className="btn-outline flex-1 text-sm">{laterLabel}</button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="btn-primary flex flex-1 items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit Rating
        </button>
      </div>
    </>
  );
}
