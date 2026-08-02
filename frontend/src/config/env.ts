/**
 * AC7 Ride — runtime configuration
 *
 * Every environment-dependent value in the app resolves here. No component,
 * hook or API module may hard-code a URL or a key.
 *
 * Copy `.env.example` to `.env.development.local` and fill in the blanks.
 */

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === 'true';
}

/**
 * Base URL for the REST API.
 *
 * Left empty in development: Vite proxies `/api` straight to the Kong gateway
 * (see vite.config.ts), so requests are same-origin and CORS never applies.
 * In production set `VITE_API_BASE_URL` to the gateway origin.
 */
const API_BASE_URL = readString(import.meta.env['VITE_API_BASE_URL'], '');

/**
 * WebSocket origin. When empty we derive it from the current page origin,
 * upgrading http→ws and https→wss, which is correct behind the dev proxy and
 * behind any sane production reverse proxy.
 */
function resolveWsBase(): string {
  const explicit = import.meta.env['VITE_WS_BASE_URL']?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}`;
}

export const env = {
  /** REST base, e.g. "" (proxied) or "https://api.ac7ride.com". No trailing slash. */
  apiBaseUrl: API_BASE_URL.replace(/\/+$/, ''),

  /** API version prefix used by every service behind Kong. */
  apiPrefix: '/api/v1',

  /** WebSocket origin, resolved lazily so it can read window.location. */
  get wsBaseUrl(): string {
    return resolveWsBase();
  },

  /**
   * Browser-side Google Maps key (Maps JavaScript API).
   *
   * This is SEPARATE from the backend's GOOGLE_MAPS_API_KEY, which stays
   * server-side and powers /maps/* routing, ETA and traffic. This key only
   * renders tiles and MUST be restricted by HTTP referrer in Google Cloud
   * Console — a browser key is public by definition.
   *
   * When unset the app degrades to a static map placeholder rather than
   * crashing, so the whole product remains usable without a key.
   */
  googleMapsBrowserKey: readString(import.meta.env['VITE_GOOGLE_MAPS_BROWSER_KEY'], ''),

  /** Map libraries to load. `places` powers destination autocomplete fallback. */
  googleMapsLibraries: ['places', 'geometry'] as const,

  /**
   * Where the map opens before the user's location is known — Charing Cross,
   * the point all distances from London are officially measured from.
   *
   * This is a starting view, not a boundary. The tile layer is the whole
   * world, so a rider can pan to anywhere and search anywhere; London is
   * simply where the camera begins when there is no GPS fix yet.
   */
  defaultMapCenter: {
    lat: Number(import.meta.env['VITE_DEFAULT_MAP_LAT'] ?? 51.5074),
    lng: Number(import.meta.env['VITE_DEFAULT_MAP_LNG'] ?? -0.1278),
  },

  /** Zoom for that opening view — close enough to read street names. */
  defaultMapZoom: Number(import.meta.env['VITE_DEFAULT_MAP_ZOOM'] ?? 13),

  /** ISO 4217 code used when the backend does not return one on a record. */
  defaultCurrency: readString(import.meta.env['VITE_DEFAULT_CURRENCY'], 'GBP'),

  /**
   * Control centre — the number on the landing page for people who would rather
   * ring than install anything. Stored in E.164 so it can be used as a tel:
   * href directly; formatted for display separately.
   */
  controlCentre: {
    tel: readString(import.meta.env['VITE_CONTROL_CENTRE_TEL'], '+447833172989'),
    display: readString(import.meta.env['VITE_CONTROL_CENTRE_DISPLAY'], '+44 7833 172989'),
    email: readString(import.meta.env['VITE_CONTROL_CENTRE_EMAIL'], 'support@ac7group.co.uk'),
    hours: readString(import.meta.env['VITE_CONTROL_CENTRE_HOURS'], 'Open 24 hours, every day'),
  },

  /**
   * Who we are. Used by the landing site, the legal pages and the document
   * title. Not environment-dependent — it lives here so the name appears once
   * rather than in thirty JSX strings.
   */
  company: {
    name: 'AC7 GROUP',
    meaning: 'Aragti Cad',
    product: 'ACT',
    productLong: 'AC7 Transport',
    city: 'London',
  },

  /**
   * Where each module lives.
   *
   * -- Why these are paths and not URLs -----------------------------------
   * `taxi` used to be VITE_TAXI_URL: an absolute link to a separate Vercel
   * deployment at a2-taxi.vercel.app. Pressing Book Taxi left the site, loaded
   * a second application, and landed on that application's own marketing page.
   * Two deployments, two builds, two front doors, and a user journey with a
   * dead end in the middle.
   *
   * They are now routes inside this single application. A route cannot drift
   * out of sync with the deployment it points at, cannot be left pointing at a
   * stale build, and costs no second full page load. If one of these ever
   * becomes an absolute URL again, the platform has quietly been split back
   * into two.
   */
  services: {
    taxi: '/taxi',
    schoolRuns: '/school-runs',
    bookings: '/bookings',
    /** Phase 2. Empty means the card renders as Coming Soon. */
    marketplace: '',
  },

  /**
   * Native app store listings.
   *
   * Empty until the apps are actually published. The landing page checks for
   * that and offers the web app instead, rather than sending someone to a
   * store page that does not exist — a dead download button is worse than
   * no download button.
   */
  appStores: {
    ios: readString(import.meta.env['VITE_APP_STORE_URL'], ''),
    android: readString(import.meta.env['VITE_PLAY_STORE_URL'], ''),
  },

  /** BCP 47 locale — drives number, date and currency formatting. */
  locale: readString(import.meta.env['VITE_LOCALE'], 'en-GB'),

  /** Dialling prefix used in phone-number placeholders and hints. */
  phonePrefix: readString(import.meta.env['VITE_PHONE_PREFIX'], '+44'),

  /** How often the driver app pushes its position to /geo/location, in ms. */
  driverLocationPingMs: Number(import.meta.env['VITE_DRIVER_PING_MS'] ?? 5000),

  /** Feature flags — let unfinished surfaces ship dark rather than broken. */
  features: {
    waze: readBool(import.meta.env['VITE_FEATURE_WAZE'], true),
    negotiation: readBool(import.meta.env['VITE_FEATURE_NEGOTIATION'], false),
    pooling: readBool(import.meta.env['VITE_FEATURE_POOLING'], false),
    corporate: readBool(import.meta.env['VITE_FEATURE_CORPORATE'], false),
  },

  /**
   * Design-preview build: serve every screen from fixtures instead of the API.
   *
   * Set ONLY on the Vercel preview project, so the design can be reviewed on a
   * real phone before the Go services are deployed. With it unset — which is
   * the default everywhere, including any real production build — the preview
   * module is dead code and the bundler removes it entirely.
   *
   * This is a display fixture. It changes no authentication logic and relaxes
   * no check; see src/preview/README.md.
   */
  previewMode: readBool(import.meta.env['VITE_PREVIEW_MODE'], false),

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

/** True when a browser Maps key is configured; drives the map fallback. */
export const hasGoogleMapsKey = (): boolean => env.googleMapsBrowserKey.length > 0;
