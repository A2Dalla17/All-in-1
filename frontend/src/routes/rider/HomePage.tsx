import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, Briefcase, ChevronRight, Clock, Heart,
  Home as HomeIcon, MapPin, Menu, MessageSquare, Moon, Sun,
} from 'lucide-react';

import type { FavoritePlace } from '@/api/types';
import { IconButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFavorites, useMyRides } from '@/hooks/queries';
import { cn, fullName } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';

/**
 * Rider home.
 *
 * The whole screen exists to get someone to one action: entering a
 * destination. Everything else — greeting, hero, shortcuts — earns its place
 * by making that action feel closer, not by competing with it.
 *
 * The route card overlaps the hero by design. That overlap is what pulls the
 * eye down from the brand panel into the input, and it is why the card carries
 * the heaviest shadow on the screen.
 */
export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  const { data: favorites, isLoading: loadingFavorites } = useFavorites();
  const { data: rides } = useMyRides({ per_page: 1 });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = user?.first_name || fullName(user) || 'there';
  const activeRide = rides?.items?.find((r) => !['completed', 'cancelled'].includes(r.status));

  return (
    <div className="min-h-full bg-surface pb-[calc(7rem+var(--safe-bottom))]">
      {/* ---- Header ----------------------------------------------------- */}
      <header className="flex items-center justify-between px-5 pb-1 pt-[calc(0.75rem+var(--safe-top))]">
        <IconButton label="Open menu">
          <Menu size={20} />
        </IconButton>

        <div className="text-center">
          <p className="text-body-lg font-extrabold leading-none tracking-[-0.035em] text-ink">
            AC7 <span className="text-brand-ink">RIDE</span>
          </p>
          <p className="mt-1 text-[0.5625rem] font-semibold uppercase tracking-[0.22em] text-ink-subtle">
            Premium rides
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggle}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </IconButton>

          <IconButton label="Messages" onClick={() => navigate('/taxi/app/messages')}>
            <MessageSquare size={19} />
          </IconButton>

          <IconButton
            label="Notifications"
            className="relative"
            onClick={() => navigate('/taxi/app/notifications')}
          >
            <Bell size={19} />
            <span
              aria-hidden
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand ring-[2.5px] ring-bg"
            />
          </IconButton>
        </div>
      </header>

      <div className="stagger">
        {/* ---- Greeting ------------------------------------------------- */}
        <section className="px-5 pt-7">
          <h1 className="text-[1.75rem] font-bold leading-[1.15] tracking-[-0.035em] text-ink">
            {greeting},
          </h1>
          <p className="text-[1.75rem] font-bold leading-[1.15] tracking-[-0.035em] text-brand-ink">
            {firstName}
          </p>
          <p className="mt-2.5 text-caption font-medium tracking-wide text-ink-muted">
            Safe · Reliable · Premium
          </p>
        </section>

        {/* ---- Active ride ---------------------------------------------- */}
        {activeRide && (
          <section className="px-5 pt-5">
            <button
              type="button"
              onClick={() => navigate(`/taxi/app/track/${activeRide.id}`)}
              className="liftable flex w-full items-center gap-3.5 rounded-card border border-brand/20 bg-brand/[0.05] p-4 text-left"
            >
              <span aria-hidden className="relative grid h-11 w-11 shrink-0 place-items-center">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/30" />
                <span className="relative grid h-11 w-11 place-items-center rounded-full brand-gradient text-white shadow-brand">
                  <MapPin size={18} />
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-ink">
                  Ride in progress
                </span>
                <span className="mt-0.5 block truncate text-caption text-ink-muted">
                  {activeRide.dropoff_address}
                </span>
              </span>

              <ChevronRight size={18} className="shrink-0 text-brand-ink" aria-hidden />
            </button>
          </section>
        )}

        {/* ---- Hero ------------------------------------------------------ */}
        <section className="px-5 pt-6">
          <div className="edge-light relative overflow-hidden rounded-[1.5rem] brand-gradient px-6 pb-16 pt-7 shadow-brand-lg">
            {/* Road arc — the one decorative element, kept faint */}
            <svg
              aria-hidden
              viewBox="0 0 420 220"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]"
              preserveAspectRatio="xMaxYMax slice"
            >
              <path
                d="M-40 200 Q 130 130 230 165 T 460 95"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M-40 224 Q 150 152 250 188 T 460 118"
                fill="none"
                stroke="white"
                strokeWidth="1"
                strokeOpacity="0.55"
              />
              <circle cx="330" cy="128" r="46" fill="white" fillOpacity="0.06" />
            </svg>

            <div className="relative">
              <p className="text-[1.375rem] font-bold leading-tight tracking-[-0.03em] text-white">
                Premium rides
              </p>

              <ul className="mt-3.5 space-y-1.5">
                {['Reliable drivers', 'Your comfort', 'Our standard'].map((line) => (
                  <li key={line} className="text-body-sm leading-relaxed text-white/75">
                    {line}
                  </li>
                ))}
              </ul>

              <span aria-hidden className="mt-5 block h-[3px] w-11 rounded-full bg-white/80" />
            </div>
          </div>
        </section>

        {/* ---- Route card — overlaps the hero on purpose ------------------ */}
        <section className="-mt-11 px-5">
          <div className="relative z-10 rounded-[1.25rem] bg-card p-3.5 shadow-lifted">
            <button
              type="button"
              onClick={() => navigate('/taxi/app/book')}
              className="w-full text-left"
              aria-label="Choose pickup and destination"
            >
              <div className="flex items-center gap-3.5 rounded-tile px-2 py-3.5 transition-colors hover:bg-surface">
                <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center">
                  <span className="h-3 w-3 rounded-full border-[3px] border-brand bg-card" />
                </span>
                <span className="flex-1 text-body font-medium text-ink-muted">
                  Where from?
                </span>
                <ChevronRight size={17} className="text-ink-subtle" aria-hidden />
              </div>

              <div className="ml-[1.9rem] h-px bg-line" />

              <div className="flex items-center gap-3.5 rounded-tile px-2 py-3.5 transition-colors hover:bg-surface">
                <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center text-brand-ink">
                  <MapPin size={17} />
                </span>
                <span className="flex-1 text-body font-medium text-ink-muted">
                  Where to?
                </span>
                <ChevronRight size={17} className="text-ink-subtle" aria-hidden />
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/taxi/app/book')}
              className="pressable mt-3 flex h-[3.5rem] w-full items-center justify-center gap-3 rounded-pill brand-gradient text-body font-semibold tracking-[-0.01em] text-white shadow-brand transition-shadow hover:shadow-brand-lg"
            >
              Find a ride
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-full bg-white/20"
              >
                <ArrowRight size={16} />
              </span>
            </button>
          </div>
        </section>

        {/* ---- Shortcuts -------------------------------------------------- */}
        <section className="px-5 pt-6">
          <div className="grid grid-cols-4 gap-2.5">
            {loadingFavorites
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[5.75rem] rounded-tile" />)
              : buildShortcuts(favorites).map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => navigate(action.to)}
                    className="liftable group flex flex-col items-center gap-2.5 rounded-tile bg-card px-2 py-4 shadow-card"
                  >
                    <span
                      aria-hidden
                      className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand-ink transition-transform duration-300 ease-smooth group-hover:scale-110"
                    >
                      {action.icon}
                    </span>
                    <span className="text-[0.6875rem] font-semibold tracking-wide text-ink">
                      {action.label}
                    </span>
                  </button>
                ))}
          </div>
        </section>

        {/* ---- Promo ------------------------------------------------------ */}
        <section className="px-5 pt-5">
          <div className="edge-light relative overflow-hidden rounded-card bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 p-6">
            <svg
              aria-hidden
              viewBox="0 0 320 170"
              className="pointer-events-none absolute right-0 top-0 h-full w-52 opacity-30"
            >
              <path
                d="M45 135 L95 82 L135 112 L185 52 L250 74"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="5 5"
                strokeLinecap="round"
              />
              <circle cx="45" cy="135" r="6.5" fill="white" />
              <circle cx="250" cy="74" r="6.5" fill="white" />
            </svg>

            <div className="relative max-w-[62%]">
              <p className="text-body-lg font-bold leading-snug tracking-[-0.02em] text-white">
                Premium rides
              </p>
              <p className="text-body-lg font-bold leading-snug tracking-[-0.02em] text-white">
                Better experience
              </p>
              <p className="text-body-lg font-bold leading-snug tracking-[-0.02em] text-white/60">
                Every time
              </p>

              <button
                type="button"
                onClick={() => navigate('/taxi/app/book')}
                className="pressable mt-4 inline-flex items-center gap-2 rounded-pill bg-white px-4 py-2.5 text-caption font-semibold text-brand shadow-sm"
              >
                Learn more
                <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface Shortcut {
  label: string;
  icon: React.ReactNode;
  to: string;
}

/**
 * Home and Work point at the saved place when one exists, and at the saved
 * places screen when it does not — so the tile is always useful rather than
 * sometimes dead.
 */
function buildShortcuts(favorites: FavoritePlace[] | undefined): Shortcut[] {
  const has = (label: string) =>
    favorites?.some((p) => p.label.toLowerCase() === label.toLowerCase());

  return [
    {
      label: 'Home',
      icon: <HomeIcon size={19} />,
      to: has('home') ? '/taxi/app/book?favourite=home' : '/taxi/app/favourites',
    },
    {
      label: 'Work',
      icon: <Briefcase size={19} />,
      to: has('work') ? '/taxi/app/book?favourite=work' : '/taxi/app/favourites',
    },
    { label: 'Saved', icon: <Heart size={19} />, to: '/taxi/app/favourites' },
    { label: 'History', icon: <Clock size={19} />, to: '/taxi/app/trips' },
  ];
}

export const homePageClassNames = cn;
