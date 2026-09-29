'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Users, Fuel, Settings2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatPlace } from '@/lib/philippines';
import { RatingBadge } from '@/components/reviews/StarRating';

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
  avg_rating?: number | string | null;
  rating_count?: number;
}

export default function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  // Falls back to the placeholder when the photo file is missing on the server instead of a broken image.
  const [imageFailed, setImageFailed] = useState(false);
  const image = imageFailed ? undefined : vehicle.images?.[0];
  const pickupText = formatPlace(vehicle.city || vehicle.location, vehicle.province);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
        {vehicle.on_maintenance ? (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs rounded-full bg-amber-500/90 text-white font-semibold">
            Under Maintenance
          </span>
        ) : (
          <span className="absolute top-3 left-3 px-2 py-1 text-xs rounded-full bg-emerald-500/90 text-white">
            Verified
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1">{vehicle.title}</h3>
        <p className="text-sm text-[var(--muted)] mb-1">{vehicle.brand} {vehicle.model} - {vehicle.year}</p>
        <RatingBadge average={vehicle.avg_rating} count={vehicle.rating_count} className="mb-3 flex" />

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
            Book Now
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
