'use client';

import { useEffect, useState } from 'react';
import { fetchBarangays, fetchCities } from '@/lib/psgc';

type Loaded = { key: string; list: string[] };

// Suggestion lists that follow the chosen province/city: the province's cities and municipalities, and
// the barangays of the chosen city. Both are empty until loaded (or when the PSGC API can't be reached),
// so inputs keep working as plain text boxes.
export function useCityOptions(province: string, fallback: string[] = []) {
  const [loaded, setLoaded] = useState<Loaded>({ key: '', list: [] });
  useEffect(() => {
    if (!province) return;
    let cancelled = false;
    fetchCities(province).then((list) => { if (!cancelled) setLoaded({ key: province, list }); });
    return () => { cancelled = true; };
  }, [province]);
  const fetched = loaded.key === province ? loaded.list : [];
  return {
    options: [...new Set([...fetched, ...fallback])].sort((a, b) => a.localeCompare(b)),
    loading: Boolean(province) && loaded.key !== province,
  };
}

export function useBarangayOptions(province: string, city: string) {
  const [loaded, setLoaded] = useState<Loaded>({ key: '', list: [] });
  const key = `${province}|${city.trim().toLowerCase()}`;
  useEffect(() => {
    if (!province || !city.trim()) return;
    let cancelled = false;
    // Wait for the owner to stop typing so each keystroke doesn't trigger a lookup.
    const timer = setTimeout(() => {
      fetchBarangays(province, city).then((list) => { if (!cancelled) setLoaded({ key, list }); });
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [province, city, key]);
  const ready = loaded.key === key;
  return { options: ready ? loaded.list : [], loading: Boolean(province && city.trim()) && !ready };
}
