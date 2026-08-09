/**
 * AC7 GALEYR — the route table.
 *
 * ── This is the product, not a brochure ───────────────────────────────────
 * It used to be a marketing site for the London taxi business, whose only job
 * was to explain the service and hand over an app-store link.
 *
 * It is now the delivery business itself. A customer browses, orders and tracks
 * here; a restaurant runs its kitchen here; the control room dispatches here.
 * There is no mobile app to download yet, so if it cannot be done on this site
 * it cannot be done at all.
 *
 * ── Three audiences, one router ───────────────────────────────────────────
 *   · Public       — home, restaurants, checkout, tracking, legal
 *   · Restaurants  — /portal
 *   · Control room — /control
 *
 * The staff routes are behind `StaffGate`, which decides what to render. It is
 * NOT what keeps anybody out: every restriction that matters is row level
 * security in Postgres, so pasting /control into the address bar renders a page
 * that returns nothing and can write nothing. See StaffGate for the full note.
 */

import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

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

/* ── The delivery product ──────────────────────────────────────────────────
   Ordering is what this site is for, but it is not what most visitors load
   first — they arrive on the home page. Splitting these keeps the menu, the
   cart and the checkout out of the bundle someone downloads to read the
   privacy policy, which matters on a connection where every kilobyte is
   noticeable. */
const RestaurantsPage = lazy(() =>
  import('./routes/delivery/RestaurantsPage').then((m) => ({ default: m.RestaurantsPage })),
);
const RestaurantMenuPage = lazy(() =>
  import('./routes/delivery/RestaurantMenuPage').then((m) => ({
    default: m.RestaurantMenuPage,
  })),
);
const CheckoutPage = lazy(() =>
  import('./routes/delivery/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const OrderPlacedPage = lazy(() =>
  import('./routes/delivery/OrderPlacedPage').then((m) => ({ default: m.OrderPlacedPage })),
);
const TrackOrderPage = lazy(() =>
  import('./routes/delivery/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage })),
);
const PartnersPage = lazy(() =>
  import('./routes/delivery/PartnersPage').then((m) => ({ default: m.PartnersPage })),
);
const CouriersPage = lazy(() =>
  import('./routes/delivery/CouriersPage').then((m) => ({ default: m.CouriersPage })),
);
const CourierApplyPage = lazy(() =>
  import('./routes/delivery/CourierApplyPage').then((m) => ({ default: m.CourierApplyPage })),
);

/* ── The Delivery Hub ──────────────────────────────────────────────────────
   A layout route with its own sidebar. Track is the index, so /delivery lands
   on tracking rather than on a menu of links — the person opening this page
   usually wants to know where their food is. */
const DeliveryHubPage = lazy(() =>
  import('./routes/delivery/DeliveryHubPage').then((m) => ({ default: m.DeliveryHubPage })),
);
const DeliverySupportPage = lazy(() =>
  import('./routes/delivery/DeliverySupportPage').then((m) => ({
    default: m.DeliverySupportPage,
  })),
);
const DeliverySettingsPage = lazy(() =>
  import('./routes/delivery/DeliverySettingsPage').then((m) => ({
    default: m.DeliverySettingsPage,
  })),
);

/* ── Staff ────────────────────────────────────────────────────────────────
   The restaurant portal and the control room. Lazy for the usual reason and
   one more: a customer ordering lunch should never download the admin
   interface. That is a bundle-size point, not a security one — the security
   is row level security in Postgres, which does not care what code a browser
   is holding. See StaffGate. */
const StaffGate = lazy(() =>
  import('./routes/staff/StaffGate').then((m) => ({ default: m.StaffGate })),
);
const PortalPage = lazy(() =>
  import('./routes/staff/PortalPage').then((m) => ({ default: m.PortalPage })),
);
const ControlRoomPage = lazy(() =>
  import('./routes/staff/ControlRoomPage').then((m) => ({ default: m.ControlRoomPage })),
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

            {/* ── Ordering ──
                /track has two forms on purpose. The bare one is for a customer
                typing their number in from the header; the one with the number
                in the path is what the confirmation screen links to, so they do
                not retype what they just saw. Both render the same page. */}
            <Route path="restaurants" element={<RestaurantsPage />} />
            {/* The param is a slug now; uuids still resolve for older links. */}
            <Route path="restaurants/:restaurantId" element={<RestaurantMenuPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order/:orderNumber" element={<OrderPlacedPage />} />

            {/* ── Delivery Hub ──
                /track and /track/:orderNumber are kept as redirects rather than
                deleted: they are printed on confirmation screens people have
                already seen, and in messages already sent. */}
            <Route path="delivery" element={<DeliveryHubPage />}>
              <Route index element={<TrackOrderPage embedded />} />
              <Route path="track/:orderNumber" element={<TrackOrderPage embedded />} />
              <Route path="support" element={<DeliverySupportPage mode="support" />} />
              <Route path="complaint" element={<DeliverySupportPage mode="complaint" />} />
              <Route path="settings" element={<DeliverySettingsPage />} />
            </Route>

            <Route path="track" element={<Navigate to="/delivery" replace />} />
            <Route path="track/:orderNumber" element={<TrackOrderPage />} />

            <Route path="partners" element={<PartnersPage />} />
            <Route path="couriers" element={<CouriersPage />} />
            <Route path="couriers/apply" element={<CourierApplyPage />} />

            {/* ── Staff ──
                Not linked from anywhere on the public site. That is not a
                security measure — an unlinked URL is still a public URL — it
                simply keeps a customer from wandering into a sign-in form. */}
            <Route
              path="portal"
              element={
                <StaffGate area="portal">
                  <PortalPage />
                </StaffGate>
              }
            />

            <Route path="about" element={<AboutPage />} />
            <Route path="faq" element={<FaqPage />} />

            {/* ── Old taxi URLs ──
                /services, /drivers and /pricing described the London minicab
                business. They are redirected rather than deleted because they
                are in search results and in messages people have already sent
                — a 404 loses a visitor who was trying to reach us. Each points
                at the delivery page that answers the same question. */}
            {/* Aliases. Somebody demonstrating this will type one of these. */}
            <Route path="control-centre" element={<Navigate to="/control" replace />} />
            <Route path="operations" element={<Navigate to="/control" replace />} />
            <Route path="admin" element={<Navigate to="/control?s=admin" replace />} />

            <Route path="services" element={<Navigate to="/restaurants" replace />} />
            <Route path="drivers" element={<Navigate to="/couriers" replace />} />
            <Route path="pricing" element={<Navigate to="/faq" replace />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="settings" element={<SiteSettingsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="cookies" element={<CookiesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* ── The Control Centre renders outside SiteLayout ──
              It is a full-screen operations console with its own sidebar and
              top bar. Wrapping it in the public header and footer would put a
              marketing navigation bar and a cookie policy link above an order
              board, and steal the vertical space the console needs.

              Still behind StaffGate, and still — as everywhere — actually
              protected by row level security rather than by routing. */}
          <Route
            path="control"
            element={
              <StaffGate area="control">
                <ControlRoomPage />
              </StaffGate>
            }
          />
        </Routes>
      </Suspense>

      <CookieBanner />
    </>
  );
}
