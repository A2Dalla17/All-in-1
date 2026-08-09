/**
 * The opening sequence.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What it is for
 * ══════════════════════════════════════════════════════════════════════════
 * Eighteen seconds establishing AC7 GROUP → GALEYR before the customer reaches
 * the product. The GR monogram is the parent company's mark and appears here
 * and nowhere else in the application.
 *
 * ── Five movements, timed as fractions of the whole ────────────────────────
 * Every timing below is a proportion of INTRO_DURATION_MS rather than a
 * hard-coded millisecond value, so changing the duration in brand.ts re-times
 * the sequence instead of leaving the fade-out stranded three seconds after the
 * screen has already gone.
 *
 *   0–18%    the mark arrives out of darkness
 *   18–40%   it settles; the light sweep passes across it
 *   40–66%   "Powered by AC7 Group" resolves beneath
 *   66–88%   held, breathing
 *   88–100%  everything fades to the landing page
 *
 * ── The parts that are not decoration ──────────────────────────────────────
 *
 * 1. It blocks. The landing page is not rendered underneath and does not paint
 *    until this finishes, which is what the brief asked for. That is also why
 *    everything below is CSS animation on two elements rather than anything
 *    heavier — the sequence must not itself be the reason the first paint is
 *    slow.
 *
 * 2. It is escapable. Skip button after ~2s, Escape key, and any click. A
 *    full-screen overlay with no exit is a trap for anyone who landed here by
 *    accident, and on a metered connection it is an expensive one.
 *
 * 3. It respects prefers-reduced-motion. Vestibular disorders are real and an
 *    eighteen-second scaling, sweeping animation is exactly the trigger. Those
 *    users get a still frame for two seconds and then the site.
 *
 * 4. It does not run in a background tab. Someone who opened this in a tab they
 *    have not looked at yet should see the intro when they arrive, not find it
 *    already finished.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  brand,
  INTRO_DURATION_MS,
  INTRO_SKIP_AFTER_MS,
} from '@shared/config/brand';
import { cn } from '@shared/lib/utils';

/** Fade to the landing page. Long enough to read as a dissolve, not a cut. */
const FADE_OUT_MS = 900;

export function BrandIntro({ onFinished }: { onFinished: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [canSkip, setCanSkip] = useState(false);

  /* Guards against finishing twice — the timer and a click can both fire, and
     calling onFinished twice would re-run the parent's transition. */
  const finished = useRef(false);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;

    setLeaving(true);
    window.setTimeout(onFinished, FADE_OUT_MS);
  }, [onFinished]);

  /* ── The clock ──
     Held in a ref and started only once the tab is visible. A setTimeout in a
     background tab is throttled but still runs, so without this someone who
     opens the site in a new tab and switches to it forty seconds later arrives
     to find the intro over — having been shown to nobody. */
  useEffect(() => {
    if (reducedMotion) {
      const short = window.setTimeout(finish, 2_000);
      return () => window.clearTimeout(short);
    }

    let mainTimer: number | undefined;
    let skipTimer: number | undefined;

    function start() {
      if (mainTimer !== undefined) return;
      mainTimer = window.setTimeout(finish, INTRO_DURATION_MS);
      skipTimer = window.setTimeout(() => setCanSkip(true), INTRO_SKIP_AFTER_MS);
    }

    if (document.visibilityState === 'visible') {
      start();
    } else {
      document.addEventListener('visibilitychange', start, { once: true });
    }

    return () => {
      window.clearTimeout(mainTimer);
      window.clearTimeout(skipTimer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [finish, reducedMotion]);

  /* Escape always works, from the first frame, whatever the skip button is
     doing. A keyboard user should never be held by an animation. */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        finish();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    /* The page behind must not scroll while a full-screen overlay is up —
       on iOS it scrolls under the fixed layer and looks broken. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [finish]);

  const d = INTRO_DURATION_MS / 1000;

  return (
    <div
      role="dialog"
      aria-label={`${brand.name} — ${brand.poweredBy}`}
      onClick={finish}
      className={cn(
        'fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center',
        'overflow-hidden bg-[#120404]',
        'transition-opacity duration-[900ms] ease-smooth',
        leaving && 'pointer-events-none opacity-0',
      )}
    >
      {/* ── Background ──
          Two very slow radial washes drifting against each other. Cheap
          (transform and opacity only, no repaint) and it stops the eighteen
          seconds from feeling like a frozen image. */}
      {!reducedMotion && (
        <>
          <span
            aria-hidden
            className="galeyr-intro-aura absolute h-[120vmax] w-[120vmax] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(139,26,26,0.42) 0%, rgba(94,0,0,0.16) 42%, transparent 68%)',
              animationDuration: `${d * 0.62}s`,
            }}
          />
          <span
            aria-hidden
            className="galeyr-intro-aura-slow absolute h-[90vmax] w-[90vmax] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(168,31,31,0.30) 0%, transparent 60%)',
              animationDuration: `${d * 0.9}s`,
            }}
          />
        </>
      )}

      {/* A fine vignette so the mark sits in the frame rather than floating on
          a flat colour. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 34%, rgba(0,0,0,0.62) 100%)',
        }}
      />

      {/* ── The monogram ── */}
      <div className="relative flex flex-col items-center px-6">
        <div className="relative">
          <picture>
            <source srcSet={brand.intro.webp} type="image/webp" />
            <img
              src={brand.intro.png}
              alt=""
              width={774}
              height={484}
              /* Decoded synchronously so the first frame of the animation is
                 the artwork and not an empty box that pops in. */
              decoding="sync"
              fetchPriority="high"
              className={cn(
                /* Sized in vmin so it fills a phone held upright and a laptop
                   equally, without a media-query ladder. Capped so it does not
                   become absurd on a large monitor. */
                'w-[min(62vmin,26rem)] max-w-full brightness-0 invert',
                !reducedMotion && 'galeyr-intro-mark',
              )}
              style={
                reducedMotion ? undefined : { animationDuration: `${d}s` }
              }
            />
          </picture>

          {/* The light sweep — a highlight travelling across the mark once,
              early. Masked to the image so it reads as light on metal rather
              than a bar crossing the screen. */}
          {!reducedMotion && (
            <span
              aria-hidden
              className="galeyr-intro-sweep pointer-events-none absolute inset-0"
              style={{
                animationDuration: `${d}s`,
                background:
                  'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.55) 50%, transparent 62%)',
                WebkitMaskImage: `url(${brand.intro.png})`,
                maskImage: `url(${brand.intro.png})`,
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
              }}
            />
          )}
        </div>

        {/* ── The credit ──
            The supplied artwork already carries "POWERED BY AC7 GROUP", so
            nothing is written here. A second copy in HTML beneath it would be
            the same words twice — and adding text to a supplied logo is exactly
            what the brief ruled out. The rule is instead expressed as a hairline
            that draws out beneath the mark as it settles. */}
        {!reducedMotion && (
          <span
            aria-hidden
            className="galeyr-intro-rule mt-8 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent"
            style={{ animationDuration: `${d}s` }}
          />
        )}
      </div>

      {/* ── Skip ──
          Quiet, low contrast, bottom of the frame. Present but not competing. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          finish();
        }}
        className={cn(
          'absolute bottom-10 rounded-pill border border-white/20 px-5 py-2.5',
          'text-caption font-medium tracking-wide text-white/55',
          'transition-all duration-500 hover:border-white/40 hover:text-white',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          canSkip || reducedMotion
            ? 'opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        Skip
      </button>
    </div>
  );
}
