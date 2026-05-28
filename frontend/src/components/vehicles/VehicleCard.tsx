'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Users, Fuel, Settings2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Vehicle {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  vehicle_type: string;
  price_per_day: number;
  location: string;
  seats: number;
  fuel_type: string;
  transmission: string;
  images?: string[];
  status: string;
}

export default function VehicleCard({ vehicle, index = 0 }: { vehicle: Vehicle; index?: number }) {
  const image = vehicle.images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
      className="glass-card overflow-hidden group"
    >
      <div className="relative h-48 bg-gradient-to-br from-sky-500/20 to-violet-500/20 overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={vehicle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">🚗</div>
        )}
        <span className="absolute top-3 right-3 px-2 py-1 text-xs rounded-full glass-card capitalize">
          {vehicle.vehicle_type}
        </span>
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-lg mb-1">{vehicle.title}</h3>
        <p className="text-sm text-[var(--muted)] mb-3">{vehicle.brand} {vehicle.model} · {vehicle.year}</p>

        <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)] mb-4">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vehicle.location}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{vehicle.seats} seats</span>
          <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{vehicle.fuel_type}</span>
          <span className="flex items-center gap-1"><Settings2 className="w-3 h-3" />{vehicle.transmission}</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-[var(--primary)]">{formatCurrency(vehicle.price_per_day)}</span>
            <span className="text-xs text-[var(--muted)]">/day</span>
          </div>
          <Link href={`/vehicles/${vehicle.id}`} className="btn-primary text-sm py-2 px-4">
            Book Now
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
