import { useState } from 'react';
import { ExternalLink, Navigation, X } from 'lucide-react';

import type { LatLng } from '@/api/types';
import { env } from '@/config/env';
import { cn, googleMapsNavLink, wazeLink } from '@/lib/utils';

/**
 * Turn-by-turn handoff for drivers.
 *
 * Navigation is deliberately not built in-app. Drivers already trust Waze and
 * Google Maps, know their voice prompts, and have them configured. Rebuilding
 * that badly would be worse than handing off — so this opens whichever app the
 * driver prefers, with the destination pre-filled.
 *
 * Both are plain deep links: no API key, no SDK, no cost.
 */
export function NavigateButton({
  destination,
  label = 'Navigate',
  className,
}: {
  destination: LatLng;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const options = [
    ...(env.features.waze
      ? [
          {
            id: 'waze',
            name: 'Waze',
            hint: 'Live police, hazards and traffic',
            href: wazeLink(destination),
            colour: '#33CCFF',
          },
        ]
      : []),
    {
      id: 'google',
      name: 'Google Maps',
      hint: 'Lane guidance and offline maps',
      href: googleMapsNavLink(destination),
      colour: '#4285F4',
    },
  ];

  // With a single option there is no choice to present — go straight there.
  if (options.length === 1) {
    return (
      <a
        href={options[0]!.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'pressable inline-flex h-14 items-center justify-center gap-2.5 rounded-pill',
          'brand-gradient px-7 text-body font-semibold text-white shadow-brand',
          className,
        )}
      >
        <Navigation size={18} aria-hidden />
        {label}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'pressable inline-flex h-14 items-center justify-center gap-2.5 rounded-pill',
          'brand-gradient px-7 text-body font-semibold text-white shadow-brand',
          className,
        )}
      >
        <Navigation size={18} aria-hidden />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div
            aria-hidden
            onClick={() => setOpen(false)}
            className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose a navigation app"
            className="relative w-full max-w-sm animate-sheet-up rounded-t-sheet bg-bg p-5 pb-[max(1.25rem,var(--safe-bottom))] shadow-sheet sm:animate-scale-in sm:rounded-sheet sm:pb-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-h4 text-ink">Open in</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-card hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <ul className="space-y-2">
              {options.map((o) => (
                <li key={o.id}>
                  <a
                    href={o.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="pressable flex items-center gap-3.5 rounded-tile border border-line bg-card p-4 transition-colors hover:border-line-strong"
                  >
                    <span
                      aria-hidden
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-tile text-white"
                      style={{ background: o.colour }}
                    >
                      <Navigation size={19} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{o.name}</span>
                      <span className="block text-caption text-ink-muted">{o.hint}</span>
                    </span>

                    <ExternalLink size={16} className="shrink-0 text-ink-subtle" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-center text-micro leading-relaxed text-ink-subtle">
              The destination is passed through automatically. Nothing to type.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
