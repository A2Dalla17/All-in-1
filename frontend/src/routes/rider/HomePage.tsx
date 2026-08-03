/**
 * ACT — rider home
 *
 * The map, where you are, and where you are going.
 *
 * ── Why the map is the page rather than a card on it ───────────────────────
 * The previous version had no map at all — a brand panel, a greeting and an
 * input that navigated away. Every transport app a rider has used puts the map
 * behind everything and floats the controls over it, and that is not fashion:
 * the map answers "is there a car near me" before a single word is read, and
 * somebody standing on a kerb is looking at their surroundings, not at a form.
 *
 * ── Why location is asked for with a button, not on load ───────────────────
 * A permission prompt that fires the instant a page opens gets refused, and
 * once refused the browser will not ask again — the rider has to dig through
 * site settings to undo it. Asking after a deliberate tap, with the reason
 * visible above it, is the difference between a yes and a permanent no.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Loader2, Lock, MapPin, Navigation, Search, ShoppingBag } from 'lucide-react';

import { MapView } from '@/components/map/MapView';
import { Card } from '@/components/ui/Card';
import { env } from '@/config/env';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  reverseGeocode,
  searchPlaces,
  SEARCH_DEBOUNCE_MS,
  type PlaceSuggestion,
} from '@/lib/geocode';
import { useAuth } from '@/providers/AuthProvider';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { position, permission, isLocating, error: geoError } = useGeolocation();

  const [askedForLocation, setAskedForLocation] = useState(false);
  const [pickupLabel, setPickupLabel] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const centre = position ?? env.defaultMapCenter;
  const hasLocation = Boolean(position);

  /* Name the pickup once a fix arrives. Cosmetic — the coordinates work
     regardless — so a failure here is swallowed rather than surfaced. */
  useEffect(() => {
    if (!position) return;
    let cancelled = false;
    void reverseGeocode(position.lat, position.lng).then((place) => {
      if (!cancelled && place) setPickupLabel(place.label);
    });
    return () => {
      cancelled = true;
    };
  }, [position]);

  /* Debounced search. The delay is Nominatim's rate limit rather than a UX
     choice, and the previous request is aborted so a slow early response
     cannot overwrite a newer one. */
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setSearchError(null);

      searchPlaces(query, controller.signal)
        .then(setResults)
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setSearchError('Address search is unavailable right now.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const choose = useCallback(
    (place: PlaceSuggestion) => {
      const params = new URLSearchParams({
        to: place.label,
        lat: String(place.lat),
        lng: String(place.lng),
      });
      navigate(`/taxi/app/book?${params.toString()}`);
    },
    [navigate],
  );

  return (
    <div className="relative min-h-screen">
      {/* Map fills the screen behind everything. */}
      <div className="absolute inset-0">
        <MapView
          center={centre}
          zoom={hasLocation ? 15 : 12}
          {...(position ? { pickup: position } : {})}
          halo={hasLocation}
          fitBounds={false}
          className="h-full w-full"
        />
      </div>

      <div className="relative flex min-h-screen flex-col justify-between pb-tabbar pt-safe-top">
        <div className="px-gutter pt-4">
          {user?.rider_code && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-card/90 px-3 py-1.5 text-caption font-semibold shadow-card backdrop-blur">
              <span className="text-ink-subtle">Your code</span>
              <span className="font-mono text-brand-ink">{user.rider_code}</span>
            </span>
          )}
        </div>

        <div className="space-y-3 px-gutter">
          {!hasLocation && (
            <Card tone="raised">
              <div className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
                >
                  <Navigation size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-ink">
                    {permission === 'denied' ? 'Location is switched off' : 'Where are you now?'}
                  </p>
                  <p className="mt-0.5 text-body-sm text-ink-muted">
                    {permission === 'denied'
                      ? 'Turn it back on in your browser settings, or type your pickup address instead.'
                      : 'We use it to show your pickup point and find the nearest car.'}
                  </p>
                </div>
              </div>

              {permission !== 'denied' && (
                <button
                  type="button"
                  disabled={askedForLocation && isLocating}
                  onClick={() => setAskedForLocation(true)}
                  className="brand-gradient mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-control text-body font-semibold text-white shadow-brand transition-[filter] hover:brightness-[1.06] disabled:opacity-60"
                >
                  {askedForLocation && isLocating ? (
                    <>
                      <Loader2 size={17} className="animate-spin" aria-hidden />
                      Finding you
                    </>
                  ) : (
                    <>
                      <Crosshair size={17} aria-hidden />
                      Allow location
                    </>
                  )}
                </button>
              )}

              {geoError && askedForLocation && (
                <p className="mt-2 text-body-sm text-danger-ink">{geoError}</p>
              )}
            </Card>
          )}

          <Card tone="raised">
            {hasLocation && (
              <p className="mb-3 flex items-center gap-2 text-body-sm text-ink-muted">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span className="truncate">{pickupLabel ?? 'Your current location'}</span>
              </p>
            )}

            <label className="flex h-12 items-center gap-2.5 rounded-control border border-line bg-bg px-3.5">
              <Search size={18} className="shrink-0 text-ink-subtle" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where to?"
                aria-label="Where to?"
                className="h-full w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-subtle"
              />
              {searching && (
                <Loader2 size={16} className="shrink-0 animate-spin text-ink-subtle" aria-hidden />
              )}
            </label>

            {searchError && (
              <p role="alert" className="mt-2 text-body-sm text-danger-ink">
                {searchError}
              </p>
            )}

            {results.length > 0 && (
              <ul className="mt-2 max-h-64 overflow-y-auto">
                {results.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => choose(place)}
                      className="flex min-h-14 w-full items-center gap-3 rounded-tile px-2 py-2 text-left hover:bg-surface"
                    >
                      <MapPin size={17} className="shrink-0 text-ink-subtle" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-body font-medium text-ink">
                          {place.label}
                        </span>
                        <span className="block truncate text-body-sm text-ink-muted">
                          {place.address}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex items-center gap-3.5 rounded-card border border-line bg-card/90 p-4 opacity-80 shadow-card backdrop-blur">
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-surface text-ink-subtle"
            >
              <ShoppingBag size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-body font-semibold text-ink">
                AC7 Deliveries
                <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-0.5 text-micro font-medium text-ink-subtle">
                  <Lock size={10} aria-hidden />
                  Coming soon
                </span>
              </p>
              <p className="mt-0.5 text-body-sm text-ink-muted">
                Food, shops and parcels across London.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
