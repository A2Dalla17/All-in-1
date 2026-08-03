/**
 * ACT — address search and reverse geocoding
 *
 * ── Why this replaced the Go geo service ───────────────────────────────────
 * Address search used to call /api/v1/geo on the Go backend. That backend is
 * deployed nowhere, so every search returned the SPA's index.html and failed
 * on a JSON parse — the search box accepted typing and then did nothing. A
 * search that silently does nothing is worse than one that says it is
 * unavailable, and both are worse than one that works.
 *
 * Nominatim is OpenStreetMap's own geocoder: free, no key, and the same data
 * behind the map tiles already in use, so a pin and its label agree.
 *
 * ── The usage policy is real, and this respects it ─────────────────────────
 * Nominatim's terms allow at most one request per second and require an
 * identifying Referer or User-Agent. Browsers forbid setting User-Agent, but
 * they send Referer automatically, which satisfies it. The debounce below is
 * not a UX nicety — it is the rate limit. Exceeding it gets an application
 * blocked, so requests are also aborted when superseded rather than left to
 * finish and be discarded.
 *
 * ── Why results are biased to the UK ───────────────────────────────────────
 * AC7 operates in London. Without a country filter, "Richmond" returns
 * Virginia before Surrey and the first result is almost always wrong.
 */

export interface PlaceSuggestion {
  id: string;
  /** Short name — "Heathrow Terminal 5". */
  label: string;
  /** Full address for the second line. */
  address: string;
  lat: number;
  lng: number;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org';

/** Nominatim's minimum spacing between requests. Not negotiable. */
export const SEARCH_DEBOUNCE_MS = 1100;

interface NominatimPlace {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
}

function toSuggestion(p: NominatimPlace): PlaceSuggestion {
  const parts = p.display_name.split(',').map((s) => s.trim());
  return {
    id: String(p.place_id),
    /* `name` is the venue when there is one — "Heathrow Terminal 5" rather
       than the first comma-separated fragment of a long postal address. */
    label: p.name?.trim() || parts[0] || p.display_name,
    address: parts.slice(1).join(', ') || p.display_name,
    lat: Number(p.lat),
    lng: Number(p.lon),
  };
}

/**
 * Search for an address.
 *
 * `signal` matters: the caller aborts the previous request on each keystroke,
 * which both keeps within the rate limit and prevents a slow earlier response
 * overwriting the results of a later one.
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL(`${ENDPOINT}/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'gb');
  /* Viewbox around Greater London, weighted but not exclusive: a rider
     booking a run to Manchester should still find it. */
  url.searchParams.set('viewbox', '-0.51,51.69,0.33,51.28');
  url.searchParams.set('bounded', '0');

  const response = await fetch(url, {
    signal: signal ?? null,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) throw new Error('Address search is unavailable right now.');

  const data = (await response.json()) as NominatimPlace[];
  return data.map(toSuggestion);
}

/** Turn a map position into an address, for "use my current location". */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PlaceSuggestion | null> {
  const url = new URL(`${ENDPOINT}/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');

  try {
    const response = await fetch(url, {
      signal: signal ?? null,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return toSuggestion((await response.json()) as NominatimPlace);
  } catch {
    /* A failed reverse lookup is cosmetic — the coordinates are still usable
       for a pickup, they just show as "Current location" instead of a street
       name. Never let it break the booking flow. */
    return null;
  }
}
