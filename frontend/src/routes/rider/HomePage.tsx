/**
 * ACT — rider home
 *
 * The map, where you are, and where you are going.
 *
 * ── Map above, sheet below ─────────────────────────────────────────────────
 * The first attempt floated cards over a full-bleed map. On a phone that left
 * the controls stranded in the middle of nowhere; on a desktop the cards
 * stretched the full width of the window. Uber and Bolt both solve it the
 * same way and for the same reason: the map takes the top, a sheet owns the
 * bottom, and the sheet can be dragged up when the rider needs more room —
 * for a list of search results — or pushed down when they want to see where
 * they are.
 *
 * The sheet is capped at max-w-lg so a wide monitor gets a panel rather than
 * a control strip two feet across.
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
import { DragSheet } from '@/components/ui/DragSheet';
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
  /* Raising the sheet on focus rather than on results means the list has room
     the moment it arrives, instead of appearing under the fold and then
     jumping. It also gets the field clear of the on-screen keyboard. */
  const [searchFocused, setSearchFocused] = useState(false);
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
    <div className="fixed inset-0 flex flex-col">
      {/*
        Map takes the top and is never covered by the sheet.

        `isolate` is load-bearing. Leaflet assigns its own z-indexes — tile
        pane 200, markers 600, popups 700, controls 800, up to 1000 — and
        those are absolute values in whatever stacking context they land in.
        Without isolation they painted over the entire interface, leaving only
        Leaflet's own zoom control visible. Isolating scopes those numbers
        inside this element so ordinary application layering works again.
      */}
      <div className="relative isolate z-0 flex-1">
        <MapView
          center={centre}
          zoom={hasLocation ? 15 : 12}
          {...(position ? { pickup: position } : {})}
          halo={hasLocation}
          fitBounds={false}
          className="h-full w-full"
        />

        {user?.rider_code && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-pill bg-card/90 px-3 py-1.5 text-caption font-semibold shadow-card backdrop-blur">
            <span className="text-ink-subtle">Your code</span>
            <span className="font-mono text-brand-ink">{user.rider_code}</span>
          </span>
        )}
      </div>

      <DragSheet expandWhen={searchFocused || results.length > 0}>
        <div className="space-y-4">
          {/* Where to — the reason the sheet exists, so it leads. */}
          <div>
            {hasLocation && (
              <p className="mb-2 flex items-center gap-2 text-body-sm text-ink-muted">
                <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span className="truncate">{pickupLabel ?? 'Your current location'}</span>
              </p>
            )}

            <label className="flex h-12 items-center gap-2.5 rounded-control border border-line bg-surface px-3.5">
              <Search size={18} className="shrink-0 text-ink-subtle" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
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
          </div>

          {results.length > 0 && (
            <ul className="-mx-2">
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

          {/* Location. Below the search box, because typing an address works
              whether or not location is granted — it is a help, not a gate. */}
          {!hasLocation && results.length === 0 && (
            <div className="rounded-card border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
                >
                  <Navigation size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-ink">
                    {permission === 'denied' ? 'Location is switched off' : 'Use my location'}
                  </p>
                  <p className="mt-0.5 text-body-sm text-ink-muted">
                    {permission === 'denied'
                      ? 'Turn it on in your browser settings, or just type your pickup address.'
                      : 'Sets your pickup automatically and finds the nearest car.'}
                  </p>
                </div>
              </div>

              {permission !== 'denied' && (
                <button
                  type="button"
                  disabled={askedForLocation && isLocating}
                  onClick={() => setAskedForLocation(true)}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-control border border-brand-ink/35 text-body-sm font-semibold text-brand-ink transition-colors hover:bg-brand-soft disabled:opacity-60"
                >
                  {askedForLocation && isLocating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden />
                      Finding you
                    </>
                  ) : (
                    <>
                      <Crosshair size={16} aria-hidden />
                      Allow location
                    </>
                  )}
                </button>
              )}

              {geoError && askedForLocation && (
                <p className="mt-2 text-body-sm text-danger-ink">{geoError}</p>
              )}
            </div>
          )}

          {results.length === 0 && (
            <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3.5 opacity-80">
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-card text-ink-subtle"
              >
                <ShoppingBag size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-body-sm font-semibold text-ink">
                  AC7 Deliveries
                  <span className="inline-flex items-center gap-1 rounded-pill bg-card px-2 py-0.5 text-micro font-medium text-ink-subtle">
                    <Lock size={10} aria-hidden />
                    Coming soon
                  </span>
                </p>
                <p className="mt-0.5 text-body-sm text-ink-muted">
                  Food, shops and parcels across London.
                </p>
              </div>
            </div>
          )}
        </div>
      </DragSheet>
    </div>
  );
}
