'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BadgeCheck, CalendarDays, Car, Copy, Headset, KeyRound, Loader2, Lock, MessageCircle, Phone, Route, UserX,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EmptyState from '@/components/ui/EmptyState';
import VehicleCard from '@/components/vehicles/VehicleCard';
import api from '@/lib/api';
import { apiErrorMessage, messagesPath, startConversation } from '@/lib/chat';
import type { ReviewSummary } from '@/lib/reviews';
import ReviewList from '@/components/reviews/ReviewList';
import { RatingBadge } from '@/components/reviews/StarRating';
import { useAuthStore } from '@/store/authStore';

type PublicProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  is_verified: boolean;
  vehicles_listed: number;
  rentals_hosted: number;
  trips_completed: number;
  avg_rating: number | string | null;
  rating_count: number;
  // Present (possibly null) for signed-in viewers; guests get phone_hidden instead.
  phone?: string | null;
  phone_hidden?: boolean;
  vehicles: Parameters<typeof VehicleCard>[0]['vehicle'][];
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [reviews, setReviews] = useState<ReviewSummary | null>(null);

  useEffect(() => {
    api.get(`/users/${id}/profile`)
      .then((res) => setProfile(res.data.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
    api.get(`/reviews/user/${id}`)
      .then((res) => setReviews(res.data.data))
      .catch(() => setReviews({ average: null, count: 0, reviews: [] }));
  }, [id]);

  const handleMessage = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to send a message');
      router.push('/auth/login');
      return;
    }
    setMessaging(true);
    try {
      const conversation = await startConversation({ userId: String(id) });
      router.push(messagesPath(user?.role, conversation.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start chat'));
      setMessaging(false);
    }
  };

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success('Contact number copied');
    } catch {
      toast.error('Could not copy the number');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="skeleton h-48 rounded-2xl" />
            <div className="skeleton h-64 rounded-2xl" />
          </div>
        </main>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <EmptyState
              icon={UserX}
              title="Profile not found"
              description="This account may have been deactivated or doesn't exist."
              actionLabel="Browse Vehicles"
              actionHref="/vehicles"
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const isMe = user?.id === profile.id;
  const stats = [
    { icon: Car, label: 'Vehicles listed', value: profile.vehicles_listed },
    { icon: KeyRound, label: 'Rentals hosted', value: profile.rentals_hosted },
    { icon: Route, label: 'Trips completed', value: profile.trips_completed },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full gradient-bg flex items-center justify-center text-white text-3xl font-bold">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
                ) : (
                  profile.full_name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold break-words">{profile.full_name}</h1>
                <RatingBadge average={profile.avg_rating} count={profile.rating_count} className="mt-1 flex" />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {profile.role === 'admin' && (
                    <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 font-semibold text-violet-500">
                      <Headset className="h-3.5 w-3.5" /> JLR Fleetlink Support
                    </span>
                  )}
                  {profile.is_verified ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-600">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified driver&apos;s license
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-500/15 px-2.5 py-1 text-[var(--muted)]">Not yet verified</span>
                  )}
                  <span className="flex items-center gap-1 text-[var(--muted)]">
                    <CalendarDays className="h-3.5 w-3.5" /> Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-[var(--primary)]" />
                  {profile.phone_hidden ? (
                    <Link href="/auth/login" className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--primary)] hover:underline">
                      <Lock className="h-3.5 w-3.5" /> Sign in to see contact number
                    </Link>
                  ) : profile.phone ? (
                    <>
                      <a href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`} className="font-medium hover:underline" title="Call">
                        {profile.phone}
                      </a>
                      <button
                        onClick={() => copyPhone(profile.phone as string)}
                        className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs text-[var(--primary)] hover:bg-[var(--primary)]/10"
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </button>
                    </>
                  ) : (
                    <span className="text-[var(--muted)]">No contact number provided</span>
                  )}
                </div>
              </div>

              {isMe ? (
                <Link href="/profile" className="btn-outline text-sm text-center">Edit my profile</Link>
              ) : (
                <button onClick={handleMessage} disabled={messaging} className="btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                  {messaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Message
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl bg-[var(--primary)]/5 p-3 text-center">
                  <Icon className="mx-auto mb-1 h-4 w-4 text-[var(--primary)]" />
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[11px] text-[var(--muted)]">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <h2 className="text-xl font-bold mb-4">
            {isMe ? 'My vehicles' : `${profile.full_name.split(' ')[0]}'s vehicles`}
          </h2>
          {profile.vehicles.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-[var(--muted)]">No vehicles listed yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.vehicles.map((vehicle, i) => <VehicleCard key={vehicle.id} vehicle={vehicle} index={i} />)}
            </div>
          )}

          <div className="mt-8">
            <ReviewList title={isMe ? 'Reviews about me' : `Reviews for ${profile.full_name.split(' ')[0]}`} summary={reviews} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
