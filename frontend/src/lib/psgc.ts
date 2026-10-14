// Cities/municipalities and barangays of the Philippines from the free, public PSGC API
// (https://psgc.gitlab.io/api — the official Philippine Standard Geographic Code list). Used to suggest
// the barangays (puroks/areas) of a chosen city, so owners and renters don't have to guess spellings.
// Everything is best-effort: when the API is unreachable the callers fall back to free typing.
const PSGC_URL = 'https://psgc.gitlab.io/api';
const NCR_REGION = '130000000';

type PsgcPlace = { code: string; name: string };

const cache = new Map<string, Promise<PsgcPlace[]>>();
const getList = (path: string) => {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetch(`${PSGC_URL}/${path}`)
      .then((res) => {
        if (!res.ok) throw new Error(`PSGC ${res.status}`);
        return res.json() as Promise<PsgcPlace[]>;
      })
      .then((rows) => rows.map(({ code, name }) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)));
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit;
};

// "City of Cebu" / "Cebu City" / "Dasmariñas City" all compare equal.
export const normalizePlace = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, '').replace(/^city of\s+/, '').replace(/\s+city$/, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Province names here differ slightly from PSGC (e.g. "Cotabato" vs "Cotabato (North Cotabato)").
async function provinceCode(province: string) {
  const list = await getList('provinces.json');
  const wanted = normalizePlace(province);
  return list.find((p) => normalizePlace(p.name) === wanted)?.code
    ?? list.find((p) => normalizePlace(p.name).startsWith(wanted))?.code
    ?? null;
}

/** Every city and municipality of a province (Metro Manila = the NCR cities). */
export async function fetchCities(province: string): Promise<string[]> {
  try {
    if (province === 'Metro Manila') {
      return (await getList(`regions/${NCR_REGION}/cities-municipalities.json`)).map((c) => c.name);
    }
    const code = await provinceCode(province);
    if (!code) return [];
    return (await getList(`provinces/${code}/cities-municipalities.json`)).map((c) => c.name);
  } catch {
    return [];
  }
}

/** The barangays of a city/municipality, e.g. for "Cordova" in "Cebu". Empty when unknown. */
export async function fetchBarangays(province: string, city: string): Promise<string[]> {
  try {
    const wanted = normalizePlace(city);
    if (!province || !wanted) return [];
    const cities = province === 'Metro Manila'
      ? await getList(`regions/${NCR_REGION}/cities-municipalities.json`)
      : await (async () => {
          const code = await provinceCode(province);
          return code ? getList(`provinces/${code}/cities-municipalities.json`) : [];
        })();
    const match = cities.find((c) => normalizePlace(c.name) === wanted);
    if (!match) return [];
    return (await getList(`cities-municipalities/${match.code}/barangays.json`)).map((b) => b.name);
  } catch {
    return [];
  }
}
