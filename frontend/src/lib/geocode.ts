// Finds typed places (city, barangay, landmark) on the map with OpenStreetMap's free Nominatim geocoder.
// Its usage policy allows at most 1 request per second, so lookups run one at a time with a gap and
// only when a field is finished (on blur), never per keystroke.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const REQUEST_GAP_MS = 1100;

export type LatLng = { lat: number; lng: number };

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<LatLng[]>>();

function search(q: string, settlementOnly: boolean): Promise<LatLng[]> {
  const key = `${settlementOnly ? 's' : 'a'}:${q.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const result = queuedSearch(q, settlementOnly);
  cache.set(key, result);
  result.catch(() => cache.delete(key));
  return result;
}

async function queuedSearch(q: string, settlementOnly: boolean): Promise<LatLng[]> {
  const run = async () => {
    const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const params = new URLSearchParams({ q, format: 'jsonv2', limit: '5', countrycodes: 'ph' });
    if (settlementOnly) params.set('featureType', 'settlement');
    const res = await fetch(`${NOMINATIM_URL}?${params}`, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return [];
    const rows: { lat: string; lon: string }[] = await res.json();
    return rows.map((r) => ({ lat: Number(r.lat), lng: Number(r.lon) })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  };
  const result = queue.then(run, run);
  queue = result.catch(() => undefined);
  return result;
}

// Straight-line distance in km, used to reject same-named places in another part of the country.
export function distanceKm(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

async function firstNear(queries: { q: string; settlementOnly?: boolean }[], near: LatLng, maxKm: number) {
  for (const { q, settlementOnly = false } of queries) {
    try {
      const hit = (await search(`${q}, Philippines`, settlementOnly)).find((p) => distanceKm(p, near) <= maxKm);
      if (hit) return hit;
    } catch {
      return null; // offline or blocked: leave the pin where it is
    }
  }
  return null;
}

// "Tacloban City" is often mapped as just "Tacloban".
const bareCity = (city: string) => city.replace(/\s+city$/i, '').trim();

// City/municipality center, kept within ~150 km of the province so a same-named town elsewhere is skipped.
export function geocodeCity(city: string, province: string, provinceCenter: LatLng) {
  const bare = bareCity(city);
  return firstNear([
    { q: `${city}, ${province}`, settlementOnly: true },
    { q: city, settlementOnly: true },
    ...(bare !== city ? [{ q: bare, settlementOnly: true }] : []),
  ], provinceCenter, 150);
}

// A barangay or landmark inside the city, kept within ~25 km of the city center.
export function geocodeWithinCity(place: string, city: string, cityCenter: LatLng) {
  const bare = bareCity(city);
  return firstNear([
    { q: `${place}, ${city}` },
    ...(bare !== city ? [{ q: `${place}, ${bare}` }] : []),
  ], cityCenter, 25);
}

// Type-ahead suggestions (streets, barangays, malls, landmarks) from Photon, a free OpenStreetMap search
// built for autocomplete (Nominatim's policy forbids that). Results lean toward `near` and stay in the PH.
const PHOTON_URL = 'https://photon.komoot.io/api/';
const PH_BBOX = '116.5,4.2,127,21.3';

export type PlaceSuggestion = LatLng & { id: string; name: string; detail: string };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number; osm_type?: string; name?: string; housenumber?: string; street?: string;
    district?: string; locality?: string; city?: string; county?: string; state?: string; countrycode?: string;
  };
};

export async function suggestPlaces(query: string, near: LatLng, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query, limit: '8', lang: 'en', bbox: PH_BBOX, lat: String(near.lat), lon: String(near.lng),
  });
  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) return [];
  const { features = [] }: { features?: PhotonFeature[] } = await res.json();
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const { geometry, properties: p } of features) {
    if (p.countrycode && p.countrycode !== 'PH') continue;
    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const name = p.name || street;
    if (!name) continue;
    const detail = [...new Set([street !== name ? street : '', p.district || p.locality, p.city || p.county, p.state])]
      .filter(Boolean).join(', ');
    const key = `${name}|${detail}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `${p.osm_type}${p.osm_id}-${out.length}`, name, detail, lat: geometry.coordinates[1], lng: geometry.coordinates[0] });
  }
  return out.slice(0, 6);
}
