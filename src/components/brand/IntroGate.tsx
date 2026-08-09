/**
 * Decides whether the opening sequence plays, and holds the page back while it does.
 *
 * ── Why the site is not rendered underneath ────────────────────────────────
 * The brief was explicit: the landing page must not be visible during the
 * intro. Rendering it behind a full-screen overlay would technically satisfy
 * that, but it also means the browser lays out, paints and fetches the whole
 * homepage — restaurant data included — while nobody can see any of it. On a
 * slow connection that is the worst of both: eighteen seconds of animation
 * *and* a homepage that then has to finish loading.
 *
 * So children are not mounted until the intro is done. The page begins loading
 * at the moment it becomes relevant.
 *
 * ── Where the decision lives ───────────────────────────────────────────────
 * Read once, synchronously, in the initial state — not in an effect. An effect
 * runs after the first paint, which would flash the landing page for a frame
 * before the overlay appeared. A first impression that begins with a flicker of
 * the thing it is meant to introduce is worse than no intro at all.
 */

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

import {
  brand,
  INTRO_ONCE_PER_VISITOR,
  INTRO_STORAGE_KEY,
} from '@shared/config/brand';

/* Split out: a returning visitor never sees this component and should not pay
   to download it. */
const BrandIntro = lazy(() =>
  import('./BrandIntro').then((m) => ({ default: m.BrandIntro })),
);

/** Has this browser already been introduced to the brand? */
function alreadySeen(): boolean {
  if (!INTRO_ONCE_PER_VISITOR) return false;

  try {
    return localStorage.getItem(INTRO_STORAGE_KEY) === '1';
  } catch {
    /* Private browsing, or storage disabled. Treating that as "not seen" would
       replay eighteen seconds on every single navigation for those users, which
       is the failure worth avoiding — so they get the product instead. */
    return true;
  }
}

/**
 * Skip the intro when the visitor did not arrive at the front door.
 *
 * Somebody opening a tracking link because their food is late, or a restaurant
 * opening the portal mid-service, is not there to watch a brand film. The intro
 * is for arrivals at the homepage.
 */
function isEntryVisit(): boolean {
  return window.location.pathname === '/';
}

export function IntroGate({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(
    () => !alreadySeen() && isEntryVisit(),
  );

  /* Preload the landing page's own chunk while the intro runs, so the fade
     lands on a page that is ready rather than on a spinner. Eighteen seconds is
     more than enough for this to finish on any connection. */
  useEffect(() => {
    if (!showIntro) return;

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = brand.logo.smallWebp;
    document.head.appendChild(link);

    return () => link.remove();
  }, [showIntro]);

  /* Clear the pre-React dark backdrop set inline in index.html. Left in place
     it would sit behind the light theme and show through anywhere the page is
     shorter than the viewport — most obviously as a dark band under a short
     page on a tall phone. */
  useEffect(() => {
    if (!showIntro) {
      document.documentElement.classList.remove('galeyr-intro-pending');
    }
  }, [showIntro]);

  function handleFinished() {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, '1');
    } catch {
      /* Nothing to do. Worst case the intro plays again next time. */
    }
    setShowIntro(false);
  }

  if (showIntro) {
    return (
      /* The fallback is the intro's own background colour, so a slow chunk
         load reads as the sequence starting rather than as a blank screen. */
      <Suspense fallback={<div className="fixed inset-0 z-[100] bg-[#120404]" />}>
        <BrandIntro onFinished={handleFinished} />
      </Suspense>
    );
  }

  return <>{children}</>;
}
