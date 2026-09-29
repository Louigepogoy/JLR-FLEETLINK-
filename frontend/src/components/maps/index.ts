'use client';

import dynamic from 'next/dynamic';
import { createElement } from 'react';

// Leaflet needs the browser, so the maps are loaded client-side only, with a skeleton meanwhile.
const loading = () => createElement('div', { className: 'skeleton h-full min-h-56 w-full rounded-2xl' });

export const PhilippinesVehicleMap = dynamic(
  () => import('./LeafletMaps').then((m) => m.PhilippinesVehicleMap),
  { ssr: false, loading }
);
export const LocationPickerMap = dynamic(
  () => import('./LeafletMaps').then((m) => m.LocationPickerMap),
  { ssr: false, loading }
);
export const PickupMap = dynamic(
  () => import('./LeafletMaps').then((m) => m.PickupMap),
  { ssr: false, loading }
);

export type { MapVehicle } from './LeafletMaps';
