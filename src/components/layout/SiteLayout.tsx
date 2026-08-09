import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ScrollProgress } from '@shared/components/motion';

/**
 * The shell every page sits inside.
 *
 * ── Two things a single-page app has to do by hand ─────────────────────────
 * A normal website gets both for free from the browser; a router does not.
 *
 *   1. Scroll to the top on navigation. Without it, following a footer link
 *      lands you at the bottom of the next page.
 *   2. Move focus to the main region. Without it, a screen reader user hears
 *      nothing after activating a link — the page changed but their cursor is
 *      still on the link they just left, in a document that no longer exists.
 *
 * The skip link exists for the same reason: keyboard users must be able to get
 * past the navigation without tabbing through every item on every page.
 *
 * ── The reading indicator, and why it is not everywhere ────────────────────
 * A scroll-progress bar answers "how much more of this is there", which is a
 * question people genuinely have on the FAQ, the About page and the legal
 * texts. It is noise on a page you scan rather than read — a restaurant list,
 * a checkout form, the control room — so it is limited to the long ones.
 */
const LONG_READ_PATHS = ['/about', '/faq', '/privacy', '/terms', '/cookies', '/partners'];
export function SiteLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    const main = document.getElementById('main');
    if (main) {
      /* tabIndex -1 makes a non-interactive element focusable programmatically
         without adding it to the tab order. */
      main.focus({ preventScroll: true });
    }
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {LONG_READ_PATHS.includes(pathname) && <ScrollProgress />}

      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Header />

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
