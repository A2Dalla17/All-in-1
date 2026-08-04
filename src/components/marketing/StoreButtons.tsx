/**
 * App Store and Google Play buttons.
 *
 * ── Why this is a component and not markup pasted into each page ──────────
 * These appear in the hero, the navigation, the driver page and the footer.
 * Duplicating them means the day the real store URLs arrive, someone has to
 * find four copies and will find three.
 *
 * ── Why they degrade instead of 404ing ────────────────────────────────────
 * The apps are not published yet, so the store URLs are empty. A button that
 * looks live and leads to a missing store page is worse than no button: the
 * visitor concludes the company is broken rather than that the app is coming.
 * Until a URL is configured these render as "coming soon" and do not pretend
 * to be links.
 *
 * The web app link is always shown, because it is the one thing that works
 * today — somebody who wants a car right now can still get one.
 */

import { Apple, Globe, Play } from 'lucide-react';

import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

interface StoreButtonsProps {
  /** `light` for dark backgrounds, `dark` for light ones. */
  tone?: 'light' | 'dark';
  className?: string;
  /** Stack on mobile, side by side from sm up. */
  stack?: boolean;
}

export function StoreButtons({ tone = 'dark', className, stack = true }: StoreButtonsProps) {
  const shell = cn(
    'inline-flex h-14 items-center gap-3 rounded-control px-5 transition-colors',
    tone === 'light'
      ? 'bg-white text-ink hover:bg-white/90'
      : 'bg-ink text-white hover:bg-ink/90',
  );

  const pending = cn(
    'inline-flex h-14 items-center gap-3 rounded-control border px-5',
    tone === 'light'
      ? 'border-white/35 text-white/80'
      : 'border-line-strong text-ink-muted',
  );

  return (
    <div
      className={cn(
        'flex gap-3',
        stack ? 'flex-col sm:flex-row sm:flex-wrap' : 'flex-row flex-wrap',
        className,
      )}
    >
      {env.appStores.ios ? (
        <a href={env.appStores.ios} target="_blank" rel="noopener noreferrer" className={shell}>
          <Apple size={24} aria-hidden />
          <span className="text-left leading-tight">
            <span className="block text-micro opacity-70">Download on the</span>
            <span className="block text-body font-semibold">App Store</span>
          </span>
        </a>
      ) : (
        <span className={pending}>
          <Apple size={24} aria-hidden />
          <span className="text-left leading-tight">
            <span className="block text-micro opacity-70">Coming soon to</span>
            <span className="block text-body font-semibold">App Store</span>
          </span>
        </span>
      )}

      {env.appStores.android ? (
        <a href={env.appStores.android} target="_blank" rel="noopener noreferrer" className={shell}>
          <Play size={22} aria-hidden />
          <span className="text-left leading-tight">
            <span className="block text-micro opacity-70">Get it on</span>
            <span className="block text-body font-semibold">Google Play</span>
          </span>
        </a>
      ) : (
        <span className={pending}>
          <Play size={22} aria-hidden />
          <span className="text-left leading-tight">
            <span className="block text-micro opacity-70">Coming soon to</span>
            <span className="block text-body font-semibold">Google Play</span>
          </span>
        </span>
      )}

      {/* The one that works today — but only shown if it actually exists.
          A "book in your browser" button pointing nowhere is worse than no
          button, because it looks like the whole company is broken rather
          than like the app is still coming. */}
      {env.appUrl && (
        <a
          href={env.appUrl}
          className={cn(
            'inline-flex h-14 items-center gap-3 rounded-control border px-5 transition-colors',
            tone === 'light'
              ? 'border-white/35 text-white hover:bg-white/10'
              : 'border-line-strong text-ink hover:bg-surface',
          )}
        >
          <Globe size={22} aria-hidden />
          <span className="text-left leading-tight">
            <span className="block text-micro opacity-70">Book now in your</span>
            <span className="block text-body font-semibold">Browser</span>
          </span>
        </a>
      )}
    </div>
  );
}
