'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BadgeCheck, LocateFixed, MapPin, Users, Fuel, Settings2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatPlace } from '@/lib/philippines';
import { RatingBadge } from '@/components/reviews/StarRating';
import { canRent, useAuthStore } from '@/store/authStore';

interface Vehicle {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  vehicle_type: string;
  price_per_day: number;
  location: string;
  province?: string;
  city?: string;
  barangay?: string;
  pickup_address?: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  images?: string[];
  status: string;
  on_maintenance?: boolean;
  verification_status?: string;
  avg_rating?: number | string | null;
  rating_count?: number;
  // Straight-line km from the renter, set only when Browse Vehicles is sorted by "Near me".
  distance_km?: number | null;
}

const formatDistance = (km: number) => (km < 10 ? `${km.toFixed(1)} km away` : `${Math.round(km)} km away`);

export default function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  // Falls back to the placeholder when the photo file is missing on the server instead of a broken image.
  const [imageFailed, setImageFailed] = useState(false);
  // Admins can't book, so their card button just opens the listing.
  const isAdmin = useAuthStore((s) => s.isAuthenticated && s.user?.role === 'admin');
  // Owner accounts can't book, so their card button just opens the listing too.
  const viewOnly = useAuthStore((s) => s.isAuthenticated && s.user?.role !== 'admin' && !canRent(s.user));
  const image = imageFailed ? undefined : vehicle.images?.[0];
  const pickupText = formatPlace(vehicle.city || vehicle.location, vehicle.province);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      // Stagger within a row of cards only, so cards far down the list don't wait seconds to appear.
      transition={{ duration: 0.5, ease: 'easeOut', delay: (index % 4) * 0.08 }}
      whileHover={{ y: -5 }}
      className="glass-card overflow-hidden group"
    >
      <div className="relative h-48 bg-gradient-to-br from-sky-500/20 via-emerald-500/10 to-amber-400/20 overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={vehicle.title}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-2xl font-bold text-[var(--primary)]">JLR</div>
        )}
        <span className="absolute top-3 right-3 px-2 py-1 text-xs rounded-full glass-card capitalize">
          {vehicle.vehicle_type}
        </span>
        {vehicle.verification_status === 'approved' ? (
          <span className="absolute top-3 left-3 flex items-center gap-1 whitespace-nowrap px-2 py-1 text-xs rounded-full bg-emerald-600/90 text-white font-semibold shadow-sm">
            <BadgeCheck className="w-3.5 h-3.5" /> Approved by Admin
          </span>
        ) : (
          <span className="absolute top-3 left-3 whitespace-nowrap px-2 py-1 text-xs rounded-full bg-slate-700/80 text-white">
            Pending Review
          </span>
        )}
        {vehicle.on_maintenance ? (
          <span className="absolute bottom-3 left-3 whitespace-nowrap px-2 py-1 text-xs rounded-full bg-amber-500/90 text-white font-semibold">
            Under Maintenance
          </span>
        ) : (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 whitespace-nowrap px-2 py-1 text-xs rounded-full bg-white/90 text-emerald-700 font-semibold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1">{vehicle.title}</h3>
        <p className="text-sm text-[var(--muted)] mb-1">{vehicle.brand} {vehicle.model} - {vehicle.year}</p>
        <RatingBadge average={vehicle.avg_rating} count={vehicle.rating_count} className="mb-3 flex" />
        {vehicle.distance_km != null && (
          <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
            <LocateFixed className="h-3.5 w-3.5" /> {formatDistance(Number(vehicle.distance_km))}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)] mb-4">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{pickupText}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{vehicle.seats} seats</span>
          <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{vehicle.fuel_type}</span>
          <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" />{vehicle.transmission}</span>
        </div>
        {vehicle.pickup_address && (
          <p className="mb-4 text-xs text-[var(--muted)]">Pickup area: {vehicle.pickup_address}</p>
        )}

        {/* The price may wrap onto two lines on narrow cards, but the button never squeezes or breaks. */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 leading-tight">
            <span className="text-xl font-bold text-[var(--primary)]">{formatCurrency(vehicle.price_per_day)}</span>
            <span className="text-xs text-[var(--muted)]">/day</span>
          </div>
          <Link href={`/vehicles/${vehicle.id}`} className="btn-primary shrink-0 whitespace-nowrap text-sm py-2 px-4">
            {isAdmin || viewOnly ? 'View Details' : 'Book Now'}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
