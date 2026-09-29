'use client';

// Leaflet maps of the Philippines. Leaflet touches `window` on import, so only load this file through
// the next/dynamic wrappers in ./index.ts (ssr: false).
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PHILIPPINES_CENTER } from '@/lib/philippines';
import { formatCurrency } from '@/lib/utils';
import { useThemeStore } from '@/store/themeStore';

// With NEXT_PUBLIC_CARTO_KEY set (frontend/.env.local), the maps use CARTO's Voyager / Dark Matter tiles.
// Without it they fall back to the free, keyless OpenStreetMap tiles (fine for moderate traffic — see
// https://operations.osmfoundation.org/policies/tiles/), darkened by a CSS filter in globals.css.
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const cartoTileUrl = (style: 'voyager' | 'dark_all') =>
  `https://basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${encodeURIComponent(CARTO_KEY ?? '')}`;
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

// `ph-map--carto` turns off the CSS dark filter, since CARTO ships its own dark tiles.
const MAP_CLASS = CARTO_KEY ? 'ph-map ph-map--carto' : 'ph-map';

// Keeps panning roughly within the Philippines.
const PH_MAX_BOUNDS = L.latLngBounds([3.5, 114.5], [22.5, 128.5]);
const PH_VIEW_ZOOM = 6;

function ThemedTiles() {
  const theme = useThemeStore((s) => s.theme);
  const map = useMap();
  // CARTO has real dark tiles, so make sure the OpenStreetMap dark filter never inverts them (an inline
  // style wins over the stylesheet even if a cached globals.css still carries the old rule).
  useEffect(() => {
    if (CARTO_KEY) map.getPane('tilePane')?.style.setProperty('filter', 'none');
  }, [map]);
  if (!CARTO_KEY) return <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />;
  const style = theme === 'dark' ? 'dark_all' : 'voyager';
  // key= remounts the layer so switching themes swaps the tiles.
  return <TileLayer key={style} url={cartoTileUrl(style)} attribution={CARTO_ATTRIBUTION} maxZoom={20} />;
}

const EXPAND_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
const COLLAPSE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>';

// Full-screen toggle (top right). Scroll-wheel zoom is on while full screen, then restored. Styled inline
// so it works even when a stale globals.css is served. Hidden where the browser can't do it (iPhone Safari).
function FullscreenControl() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    if (!container.requestFullscreen) return;
    const wheelWasOn = map.scrollWheelZoom.enabled();
    const control = new L.Control({ position: 'topright' });
    let button: HTMLAnchorElement | null = null;
    control.onAdd = () => {
      const bar = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      button = L.DomUtil.create('a', '', bar) as HTMLAnchorElement;
      button.href = '#';
      button.role = 'button';
      Object.assign(button.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.preventDefault(e);
        if (document.fullscreenElement === container) document.exitFullscreen();
        else container.requestFullscreen().catch(() => {});
      });
      return bar;
    };
    const sync = () => {
      const full = document.fullscreenElement === container;
      if (button) {
        button.innerHTML = full ? COLLAPSE_SVG : EXPAND_SVG;
        button.title = full ? 'Exit full screen' : 'Full screen';
        button.setAttribute('aria-label', button.title);
      }
      container.style.borderRadius = full ? '0' : '';
      if (full) map.scrollWheelZoom.enable();
      else if (!wheelWasOn) map.scrollWheelZoom.disable();
      map.invalidateSize();
    };
    control.addTo(map);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      control.remove();
    };
  }, [map]);
  return null;
}

// Map pins are HTML (divIcon) instead of Leaflet's default image markers, which break under bundlers
// and can't be themed.
const pinIcon = (label?: string) => L.divIcon({
  className: 'ph-map-marker',
  html: label
    ? `<span class="ph-map-price">${label}</span>`
    : '<span class="ph-map-dot"></span>',
  iconSize: label ? [0, 0] : [22, 22],
  iconAnchor: label ? [0, 0] : [11, 11],
  popupAnchor: [0, -14],
});

export type MapVehicle = {
  id: string;
  title: string;
  price_per_day: number | string;
  latitude: number | string;
  longitude: number | string;
  city?: string;
  province?: string;
  images?: string[];
};

// Shows the whole country unless the search is narrowed to a place, then zooms to its pins.
function FitToVehicles({ points, zoomToPins }: { points: [number, number][]; zoomToPins: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (zoomToPins && points.length === 1) map.setView(points[0], 12);
    else if (zoomToPins && points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 12 });
    else map.setView([PHILIPPINES_CENTER.lat, PHILIPPINES_CENTER.lng], PH_VIEW_ZOOM);
  }, [map, points, zoomToPins]);
  return null;
}

// Whole-Philippines map with a price pin for every listed vehicle.
export function PhilippinesVehicleMap({
  vehicles, zoomToPins = false, className = 'h-[480px]',
}: {
  vehicles: MapVehicle[];
  zoomToPins?: boolean;
  className?: string;
}) {
  const located = useMemo(
    () => vehicles
      .map((v) => ({ ...v, lat: Number(v.latitude), lng: Number(v.longitude) }))
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng)),
    [vehicles]
  );
  const points = useMemo(() => located.map((v) => [v.lat, v.lng] as [number, number]), [located]);

  return (
    <MapContainer
      center={[PHILIPPINES_CENTER.lat, PHILIPPINES_CENTER.lng]}
      zoom={PH_VIEW_ZOOM}
      minZoom={5}
      maxBounds={PH_MAX_BOUNDS}
      maxBoundsViscosity={0.8}
      scrollWheelZoom={false}
      className={`${MAP_CLASS} w-full ${className}`}
    >
      <ThemedTiles />
      <FullscreenControl />
      <FitToVehicles points={points} zoomToPins={zoomToPins} />
      {located.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lng]} icon={pinIcon(formatCurrency(v.price_per_day).replace('.00', ''))}>
          <Popup>
            <Link href={`/vehicles/${v.id}`} className="ph-map-popup">
              {v.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.images[0]} alt={v.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              )}
              <strong>{v.title}</strong>
              <span>{[v.city, v.province].filter(Boolean).join(', ')}</span>
              <span className="ph-map-popup-price">{formatCurrency(v.price_per_day)}/day · View</span>
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickToPlace({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom); }, [map, lat, lng, zoom]);
  return null;
}

// Pickup-pin picker for the vehicle form: click the map or drag the pin. `focus` recenters the map
// (e.g. on the chosen province) without moving the pin.
export function LocationPickerMap({
  lat, lng, focus, onChange, className = 'h-72',
}: {
  lat: number;
  lng: number;
  focus: { lat: number; lng: number; zoom: number };
  onChange: (lat: number, lng: number) => void;
  className?: string;
}) {
  const icon = useMemo(() => pinIcon(), []);
  return (
    <MapContainer center={[lat, lng]} zoom={focus.zoom} minZoom={5} maxBounds={PH_MAX_BOUNDS} className={`${MAP_CLASS} w-full ${className}`}>
      <ThemedTiles />
      <FullscreenControl />
      <Recenter lat={focus.lat} lng={focus.lng} zoom={focus.zoom} />
      <ClickToPlace onChange={onChange} />
      <Marker
        position={[lat, lng]}
        icon={icon}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const { lat: newLat, lng: newLng } = (e.target as L.Marker).getLatLng();
            onChange(newLat, newLng);
          },
        }}
      />
    </MapContainer>
  );
}

// Read-only map with the vehicle's pickup pin.
export function PickupMap({ lat, lng, className = 'h-56' }: { lat: number; lng: number; className?: string }) {
  const icon = useMemo(() => pinIcon(), []);
  return (
    <MapContainer center={[lat, lng]} zoom={15} minZoom={5} scrollWheelZoom={false} className={`${MAP_CLASS} w-full ${className}`}>
      <ThemedTiles />
      <FullscreenControl />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}
