/**
 * ACT — the single route table for the whole platform
 *
 * One application, one build, one deployment. The landing site and the taxi
 * product are modules within it, not separate apps stitched together at the
 * CDN.
 *
 *   /                  Landing site (public)
 *   /about /privacy /terms /cookies /settings
 *   /taxi/*            Taxi application
 *   /school-runs/*     School Runs        — module not built yet
 *   /bookings/*        Bookings           — module not built yet
 *   /marketplace       Marketplace        — Phase 2
 *   /admin/*           Control Centre
 *
 * ── The one journey ────────────────────────────────────────────────────────
 * Landing site → Taxi application. Pressing Taxi or Book Taxi goes straight
 * into the product: `/taxi` resolves to sign-in, or to the signed-in user's
 * home if there is a session. There is no taxi marketing page in between and
 * no second front door — the standalone one was deleted, and this router has
 * nowhere for it to come back.
 *
 * ── Why the modules share this file rather than owning their own routers ───
 * They do own their own: RiderLayout, DriverLayout, AdminLayout and the
 * landing SiteLayout each hold their internal routes. What lives here is only
 * the top-level namespace allocation — the contract between modules. Keeping
 * that in one readable table is what stops two modules quietly claiming the
 * same path, which is the failure mode a route-based monolith actually has.
 *
 * ── What is eager and what is lazy ─────────────────────────────────────────
 * The landing home page is imported directly: it is what nearly every visitor
 * loads first, and splitting it only adds a round trip before anything paints.
 * Every module below is lazy, so a visitor reading the terms page never
 * downloads the driver app.
 */

import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import type { UserRole } from '@/api/types';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { applyPreferences, usePreferences } from '@/lib/preferences';
import { useAuth } from '@/providers/AuthProvider';
import { HomePage } from '@/routes/landing/HomePage';

/* -------------------------------------------------------------------------- */
/* Landing site                                                               */
/* -------------------------------------------------------------------------- */

const AboutPage = lazy(() =>
  import('@/routes/landing/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const SiteSettingsPage = lazy(() =>
  import('@/routes/landing/SiteSettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const PrivacyPage = lazy(() =>
  import('@/routes/landing/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('@/routes/landing/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const CookiesPage = lazy(() =>
  import('@/routes/landing/legal/CookiesPage').then((m) => ({ default: m.CookiesPage })),
);
const NotFoundPage = lazy(() =>
  import('@/routes/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

/* -------------------------------------------------------------------------- */
/* Taxi module                                                                */
/* -------------------------------------------------------------------------- */

const LoginPage = lazy(() =>
  import('@/routes/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/routes/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/routes/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const TwoFactorPage = lazy(() =>
  import('@/routes/auth/TwoFactorPage').then((m) => ({ default: m.TwoFactorPage })),
);
const RiderLayout = lazy(() =>
  import('@/routes/rider/RiderLayout').then((m) => ({ default: m.RiderLayout })),
);
const DriverLayout = lazy(() =>
  import('@/routes/driver/DriverLayout').then((m) => ({ default: m.DriverLayout })),
);
const DriverLookupPage = lazy(() =>
  import('@/routes/DriverLookupPage').then((m) => ({ default: m.DriverLookupPage })),
);
const CardsPage = lazy(() =>
  import('@/routes/CardsPage').then((m) => ({ default: m.CardsPage })),
);

/* -------------------------------------------------------------------------- */
/* Control Centre                                                             */
/* -------------------------------------------------------------------------- */

const AdminLayout = lazy(() =>
  import('@/routes/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
);
const AdvertsPage = lazy(() =>
  import('@/routes/landing/adverts-admin/AdvertsPage').then((m) => ({ default: m.AdvertsPage })),
);
const AdminSignInPage = lazy(() =>
  import('@/routes/landing/adverts-admin/SignInPage').then((m) => ({ default: m.SignInPage })),
);
const PinGate = lazy(() =>
  import('@/routes/landing/adverts-admin/PinGate').then((m) => ({ default: m.PinGate })),
);
const RequireAdmin = lazy(() =>
  import('@/routes/landing/adverts-admin/RequireAdmin').then((m) => ({ default: m.RequireAdmin })),
);

/* -------------------------------------------------------------------------- */
/* Guards                                                                     */
/* -------------------------------------------------------------------------- */

/** Where each role lands inside the taxi module after signing in. */
const HOME_FOR_ROLE: Record<UserRole, string> = {
  rider: '/taxi/app',
  driver: '/taxi/driver',
  admin: '/admin',
};

/**
 * The entry point of the taxi module.
 *
 * This is what Book Taxi resolves to. Signed in: straight to the role's home.
 * Signed out: the sign-in screen. Waiting for the session matters — redirecting
 * early bounces a signed-in driver to /taxi/login on every hard refresh.
 */
function TaxiEntry() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <FullPageSpinner label="Loading" />;
  if (isAuthenticated && role) return <Navigate to={HOME_FOR_ROLE[role]} replace />;
  return <Navigate to="/taxi/login" replace />;
}

function RequireAuth({ allow, children }: { allow: UserRole[]; children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="Signing you in" />;

  if (!isAuthenticated) {
    return <Navigate to="/taxi/login" state={{ from: location.pathname }} replace />;
  }
  if (role && !allow.includes(role)) {
    return <Navigate to={HOME_FOR_ROLE[role]} replace />;
  }
  return <>{children}</>;
}

/** Sends an already-signed-in user away from sign-in and register. */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) return <FullPageSpinner label="Loading" />;
  if (isAuthenticated && role) return <Navigate to={HOME_FOR_ROLE[role]} replace />;
  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */

export function App() {
  const { preferences } = usePreferences();

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  return (
    <>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          {/* ---------------- Landing site ---------------- */}
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="settings" element={<SiteSettingsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="cookies" element={<CookiesPage />} />
          </Route>

          {/* ---------------- Taxi module ----------------
              /taxi goes straight into the product. There is deliberately no
              marketing page at this path — the landing site is the only front
              door the platform has. */}
          <Route path="/taxi" element={<TaxiEntry />} />
          <Route
            path="/taxi/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/taxi/register"
            element={
              <RedirectIfAuthed>
                <RegisterPage />
              </RedirectIfAuthed>
            }
          />
          <Route path="/taxi/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/taxi/two-factor" element={<TwoFactorPage />} />

          {/* Driver code lookup — public on purpose. Someone deciding whether
              to get into a car cannot be asked to register first; that would
              defeat the point of the check. */}
          <Route path="/taxi/d" element={<DriverLookupPage />} />
          <Route path="/taxi/d/:code" element={<DriverLookupPage />} />

          {/* Printable street cards. Public: whoever prints them is not
              necessarily signed in, and the page holds nothing private. */}
          <Route path="/taxi/cards" element={<CardsPage />} />

          <Route
            path="/taxi/app/*"
            element={
              <RequireAuth allow={['rider', 'driver', 'admin']}>
                <RiderLayout />
              </RequireAuth>
            }
          />
          <Route
            path="/taxi/driver/*"
            element={
              <RequireAuth allow={['driver', 'admin']}>
                <DriverLayout />
              </RequireAuth>
            }
          />

          {/* ---------------- Control Centre ----------------
              Taxi operations and the landing site's advert showcase are one
              console: they are the same job done by the same people. */}
          <Route path="/admin/signin" element={<AdminSignInPage />} />
          <Route
            path="/admin/adverts"
            element={
              <RequireAdmin>
                <PinGate>
                  <AdvertsPage />
                </PinGate>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RequireAuth allow={['admin']}>
                <AdminLayout />
              </RequireAuth>
            }
          />

          {/* ---------------- Modules not built yet ----------------
              School Runs, Bookings and Marketplace are named in the navigation
              because they are committed product. They are NOT stubbed with a
              "coming soon" page here: a placeholder route is a page that looks
              finished and is not. Until each module exists these paths fall
              through to the 404, which offers the control centre number — an
              honest answer that stops being reached the moment the real module
              is added below. */}

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>

      <CookieBanner />
    </>
  );
}
