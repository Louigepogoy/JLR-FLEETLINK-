import api from '@/lib/api';

export type PendingReview = {
  booking_id: string;
  start_date: string;
  end_date: string;
  completed_at: string;
  vehicle_id: string;
  vehicle_title: string;
  brand: string;
  model: string;
  vehicle_image: string | null;
  my_role: 'customer' | 'owner';
  other_id: string;
  other_name: string;
  other_avatar_url: string | null;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_avatar_url: string | null;
  // Only on a user's reviews: the role they had in that rental, and which vehicle it was.
  reviewee_role?: 'owner' | 'renter';
  vehicle_title?: string;
};

export type ReviewSummary = { average: number | null; count: number; reviews: Review[] };

// Fired after a booking is completed or rated so the rating prompt re-checks right away.
export const REVIEWS_CHANGED_EVENT = 'jlr:reviews-changed';
export const notifyReviewsChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(REVIEWS_CHANGED_EVENT));
};

export const fetchPendingReviews = async () => {
  const res = await api.get('/reviews/pending');
  return res.data.data as PendingReview[];
};

export const submitReview = async (payload: {
  bookingId: string;
  userRating: number;
  vehicleRating?: number;
  comment?: string;
}) => {
  const res = await api.post('/reviews', payload);
  notifyReviewsChanged();
  return res.data.data;
};
