import { lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Car, Home, User, Wallet } from 'lucide-react';

import { Spinner } from '@/components/ui/Spinner';
import { ToastProvider } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

import { HomePage } from './HomePage';

const BookRidePage = lazy(() =>
  import('./BookRidePage').then((m) => ({ default: m.BookRidePage })),
);
const TrackRidePage = lazy(() =>
  import('./TrackRidePage').then((m) => ({ default: m.TrackRidePage })),
);
const TripsPage = lazy(() => import('./TripsPage').then((m) => ({ default: m.TripsPage })));
const WalletPage = lazy(() => import('./WalletPage').then((m) => ({ default: m.WalletPage })));
const ProfilePage = lazy(() => import('./ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() =>
  import('./NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const FavouritesPage = lazy(() =>
  import('./FavouritesPage').then((m) => ({ default: m.FavouritesPage })),
);
const SafetyPage = lazy(() => import('./SafetyPage').then((m) => ({ default: m.SafetyPage })));
const SupportPage = lazy(() => import('./SupportPage').then((m) => ({ default: m.SupportPage })));
const ReferPage = lazy(() =>
  import('../shared/ReferPage').then((m) => ({ default: m.ReferPage })),
);
const MessagesPage = lazy(() =>
  import('../shared/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const ChatThreadPage = lazy(() =>
  import('../shared/ChatThreadPage').then((m) => ({ default: m.ChatThreadPage })),
);

/** Left of the centre action, then right — matching the mockup's tab order. */
const LEFT_TABS = [
  { to: '/taxi/app', label: 'Home', icon: Home, end: true },
  { to: '/taxi/app/trips', label: 'My rides', icon: Car, end: false },
] as const;

const RIGHT_TABS = [
  { to: '/taxi/app/wallet', label: 'Wallet', icon: Wallet, end: false },
  { to: '/taxi/app/profile', label: 'Profile', icon: User, end: false },
] as const;

/**
 * Rider shell.
 *
 * Bottom tab bar with a raised centre action, as in the mockup. The bar hides
 * on the booking and tracking screens, which are full-bleed map experiences
 * where a floating bar would sit on top of the sheet.
 */
export function RiderLayout() {
  const location = useLocation();

  const immersive =
    location.pathname.startsWith('/taxi/app/book') || location.pathname.startsWith('/taxi/app/track');

  return (
    <ToastProvider>
      <div className="relative flex min-h-screen flex-col bg-surface">
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="grid min-h-[70vh] place-items-center">
                <Spinner size="lg" className="text-brand-ink" />
              </div>
            }
          >
            <Routes>
              <Route index element={<HomePage />} />
              <Route path="book" element={<BookRidePage />} />
              <Route path="track/:rideId" element={<TrackRidePage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="favourites" element={<FavouritesPage />} />
              <Route path="safety" element={<SafetyPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="refer" element={<ReferPage />} />
              <Route path="messages" element={<MessagesPage />} />
              {/* "new" is not a thread id — it carries ?driver=AC7xxxxx and the
                  page resolves it into a real thread on arrival. */}
              <Route path="chat/new" element={<ChatThreadPage />} />
              <Route path="chat/:threadId" element={<ChatThreadPage />} />
              <Route path="*" element={<Navigate to="/taxi/app" replace />} />
            </Routes>
          </Suspense>
        </main>

        {!immersive && <RiderTabBar />}
      </div>
    </ToastProvider>
  );
}

function RiderTabBar() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 pb-[var(--safe-bottom)]">
      <div className="glass mx-3 mb-2 flex items-end justify-around rounded-card border border-line px-2 pb-1.5 pt-2 shadow-lifted">
        {LEFT_TABS.map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}

        {/* Centre action — raised, matching the mockup */}
        <NavLink
          to="/taxi/app/book"
          className="pressable -mt-6 flex flex-col items-center gap-1"
          aria-label="Book a ride"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full brand-gradient text-white shadow-brand-lg ring-4 ring-bg">
            <Car size={21} aria-hidden />
          </span>
          <span className="text-[0.625rem] font-semibold text-ink">Book ride</span>
        </NavLink>

        {RIGHT_TABS.map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
}

function Tab({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  end: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex min-w-[3.75rem] flex-col items-center gap-1 rounded-tile px-2 py-1.5',
          'transition-colors duration-200',
          isActive ? 'text-brand-ink' : 'text-ink-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative">
            <Icon size={21} aria-hidden strokeWidth={isActive ? 2.4 : 1.9} />
            <span
              aria-hidden
              className={cn(
                'absolute -bottom-[0.3125rem] left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-brand transition-all duration-300 ease-smooth',
                isActive ? 'w-3.5 opacity-100' : 'w-0 opacity-0',
              )}
            />
          </span>
          <span className="text-[0.625rem] font-semibold tracking-[0.01em]">{label}</span>
        </>
      )}
    </NavLink>
  );
}
