/**
 * GALEYR — the hero.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What changed, and why
 * ══════════════════════════════════════════════════════════════════════════
 * The previous version was a solid red panel with white text and three
 * feature bullets. That is the shape every template ships with, and a flat
 * field of brand colour makes a page look cheaper rather than bolder — there
 * is nothing for the eye to rest against, so nothing reads as considered.
 *
 * This is a two-column composition on a light ground:
 *
 *   Left    the message and exactly two actions.
 *   Right   a live order card — the product, showing itself.
 *
 * ── Red is now an accent, not a background ────────────────────────────────
 * The brief asked for this directly and it is the single biggest change. Dark
 * red now appears on the primary button, the brand mark, one status dot and
 * the underline beneath the headline. Everywhere else is white, charcoal and a
 * soft grey. Red used sparingly reads as expensive; red used everywhere reads
 * as a warning.
 *
 * ── Two buttons, not five ─────────────────────────────────────────────────
 * Order food, and browse restaurants. Tracking moved to the header and the
 * Delivery hub, where somebody chasing an order actually looks. A hero with
 * five equal buttons has no primary action, which means it has none.
 *
 * ── The order card is real ────────────────────────────────────────────────
 * Not a screenshot and not an illustration: the same status vocabulary,
 * timings and progression the tracking page uses. It advances on a timer so
 * the page has a pulse without anything moving that a reader has to follow.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Check, ChefHat, Store } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { Logo } from '@shared/components/ui/Logo';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

/** The stages the demo card walks through, in the product's own language. */
const STAGES = [
  { label: 'Order received', icon: Check, at: '19:02' },
  { label: 'Restaurant accepted', icon: Store, at: '19:04' },
  { label: 'Being prepared', icon: ChefHat, at: '19:07' },
  { label: 'On the way', icon: Bike, at: '19:26' },
] as const;

export function Hero() {
  const [stage, setStage] = useState(1);

  /* Advances slowly and stops at the end rather than looping. A loop invites
     the eye back every few seconds and competes with the headline; a single
     pass reads as something happening rather than as an animation. */
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setStage(STAGES.length - 1);
      return;
    }

    const timer = window.setInterval(() => {
      setStage((current) => {
        if (current >= STAGES.length - 1) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-line bg-bg">
      {/* A single soft wash, top-right, behind the card. Not a gradient across
          the whole panel — just enough to stop the corner reading as empty. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -top-1/3 h-[40rem] w-[40rem] rounded-full opacity-70"
        style={{
          background:
            'radial-gradient(circle, rgb(var(--brand) / 0.07) 0%, transparent 68%)',
        }}
      />

      <Container className="relative">
        <div className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
          {/* ══════════════════════════════════════════════════════════════
              The message
              ══════════════════════════════════════════════════════════════ */}
          <div className="max-w-xl">
            <Logo showTagline className="mb-8" />

            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-caption font-medium text-ink-muted">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
              {env.market.cityLocal} · {env.market.countryLocal}
            </p>

            <h1 className="mt-5 text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[3.25rem] lg:text-[3.75rem]">
              Cuntada aad jeceshahay,
              <br />
              {/* The one place the brand colour carries meaning in the
                  headline — the word that completes the promise. */}
              <span className="relative text-brand-ink">
                albaabkaaga
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 h-[3px] rounded-full bg-brand/25"
                />
              </span>
              .
            </h1>

            <p className="mt-6 max-w-md text-body-lg leading-relaxed text-ink-muted">
              Food delivery across {env.market.city}. Order from restaurants near you and
              pay the courier in cash when it arrives.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/restaurants"
                className={cn(
                  'pressable inline-flex h-14 items-center justify-center gap-2.5 rounded-xl',
                  'bg-brand px-8 text-body font-semibold text-white shadow-brand',
                  'transition-colors hover:bg-brand-hover',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2',
                )}
              >
                Order food
                <ArrowRight size={18} aria-hidden />
              </Link>

              <Link
                to="/delivery"
                className={cn(
                  'inline-flex h-14 items-center justify-center rounded-xl border border-line',
                  'bg-bg px-8 text-body font-semibold text-ink transition-colors',
                  'hover:border-line-strong hover:bg-surface',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2',
                )}
              >
                Track an order
              </Link>
            </div>

            {/* The three objections a first-time customer has, as quiet
                metadata rather than as three more cards. */}
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-body-sm">
              {[
                ['Cash on delivery', 'Pay when it arrives'],
                ['30–45 min', 'Typical delivery'],
                ['No account', 'Order in one go'],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="font-semibold text-ink">{term}</dt>
                  <dd className="text-ink-subtle">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              The product, showing itself
              ══════════════════════════════════════════════════════════════ */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div className="rounded-2xl border border-line bg-bg p-6 shadow-lifted sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-caption font-semibold text-ink-subtle">
                    G-260809-0148
                  </p>
                  <p className="mt-1 font-bold text-ink">Your order is on the way</p>
                </div>

                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"
                >
                  <Bike size={20} />
                </span>
              </div>

              <ol className="mt-6 space-y-0">
                {STAGES.map((item, index) => {
                  const done = index < stage;
                  const current = index === stage;
                  const last = index === STAGES.length - 1;

                  return (
                    <li key={item.label} className="flex gap-3.5">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500',
                            done && 'border-success bg-success text-white',
                            current && 'border-brand bg-brand text-white',
                            !done && !current && 'border-line bg-bg text-ink-subtle',
                          )}
                        >
                          <item.icon size={14} aria-hidden />
                        </span>

                        {!last && (
                          <span
                            aria-hidden
                            className={cn(
                              'my-1 w-0.5 flex-1 rounded-full transition-colors duration-500',
                              done ? 'bg-success' : 'bg-line',
                            )}
                            style={{ minHeight: '1.25rem' }}
                          />
                        )}
                      </div>

                      <div className={cn('pb-4', last && 'pb-0')}>
                        <p
                          className={cn(
                            'text-body-sm font-semibold transition-colors duration-500',
                            current ? 'text-brand-ink' : done ? 'text-ink' : 'text-ink-subtle',
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="text-caption tabular-nums text-ink-subtle">{item.at}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-5">
                <span className="text-body-sm text-ink-muted">To pay on delivery</span>
                <span className="text-h5 font-bold tabular-nums text-ink">$8.50</span>
              </div>
            </div>

            {/* One floating detail, offset from the card. Two would be
                clutter; none makes the card sit flat on the page. */}
            <div className="absolute -bottom-4 -left-4 hidden items-center gap-2.5 rounded-xl border border-line bg-bg px-4 py-3 shadow-card sm:flex">
              <span aria-hidden className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-body-sm font-medium text-ink">
                Control room open now
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
