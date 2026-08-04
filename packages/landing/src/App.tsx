/**
 * AC7 — the landing website's route table
 *
 * This is ac7taxi.com. Every route here is a public marketing or legal page.
 *
 * ── What is deliberately NOT here ─────────────────────────────────────────
 * There is no /taxi, no /login, no rider or driver or admin route. Those live
 * in packages/app, which this package does not depend on and cannot import.
 * That is enforced by the dependency graph rather than by discipline: adding a
 * rider screen to this file would require adding @ac7/app as a dependency of
 * the website, which is a change nobody makes by accident.
 *
 * The old unified router had all of it in one table and shipped the driver
 * dashboard to anyone reading the privacy policy.
 *
 * ── How someone gets to the actual product ────────────────────────────────
 * Through the app stores. The website's job is to explain the service and hand
 * the visitor a download link — which is why the store buttons appear in the
 * hero, in the navigation and in the footer, rather than once at the bottom.
 */

import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import { CookieBanner } from '@/components/layout/CookieBanner';
import { SiteLayout } from '@/components/layout/SiteLayout';
import { FullPageSpinner } from '@shared/components/ui/Spinner';
import { applyPreferences, usePreferences } from '@shared/lib/preferences';

import { HomePage } from './routes/landing/HomePage';

/* Home is imported directly: it is what nearly every visitor loads first, and
   splitting it only adds a round trip before anything paints. Everything else
   is lazy. */
const AboutPage = lazy(() =>
  import('./routes/landing/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const ServicesPage = lazy(() =>
  import('./routes/landing/ServicesPage').then((m) => ({ default: m.ServicesPage })),
);
const DriversPage = lazy(() =>
  import('./routes/landing/DriversPage').then((m) => ({ default: m.DriversPage })),
);
const PricingPage = lazy(() =>
  import('./routes/landing/PricingPage').then((m) => ({ default: m.PricingPage })),
);
const FaqPage = lazy(() =>
  import('./routes/landing/FaqPage').then((m) => ({ default: m.FaqPage })),
);
const ContactPage = lazy(() =>
  import('./routes/landing/ContactPage').then((m) => ({ default: m.ContactPage })),
);
const SiteSettingsPage = lazy(() =>
  import('./routes/landing/SiteSettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const PrivacyPage = lazy(() =>
  import('./routes/landing/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('./routes/landing/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
);
const CookiesPage = lazy(() =>
  import('./routes/landing/legal/CookiesPage').then((m) => ({ default: m.CookiesPage })),
);
const NotFoundPage = lazy(() =>
  import('./routes/landing/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

export function App() {
  const { preferences } = usePreferences();

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  return (
    <>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="drivers" element={<DriversPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="settings" element={<SiteSettingsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="cookies" element={<CookiesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>

      <CookieBanner />
    </>
  );
}
