/**
 * Demo labelling.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why this component exists at all
 * ══════════════════════════════════════════════════════════════════════════
 * GALEYR has no signed restaurant partners yet. The demo restaurants exist
 * so the whole pipeline — order, accept, cook, assign, deliver — can be tested
 * before the first agreement is signed.
 *
 * The risk is not technical. It is that a screenshot of this site, or a link
 * sent to an investor or a restaurant owner, reads as a live marketplace with
 * three partners. That is a claim about business relationships that do not
 * exist, and it is the kind of claim that ends a conversation with a restaurant
 * owner before it starts.
 *
 * So the label is not a courtesy. It travels with the data: `is_demo` is a
 * database column, and every surface that renders a restaurant renders this
 * next to it. Nothing has to remember.
 */

import { FlaskConical } from 'lucide-react';

import { cn } from '@shared/lib/utils';

/** Inline marker shown beside any demo restaurant's name. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-pill border border-warning/40',
        'bg-warning-soft px-2 py-0.5 text-caption font-bold uppercase tracking-wide text-warning-ink',
        className,
      )}
      title="Test data. This is not a real restaurant and cannot take an order."
    >
      <FlaskConical size={11} aria-hidden />
      Demo
    </span>
  );
}

/**
 * The page-level explanation.
 *
 * Shown once at the top of any page listing restaurants — the badge says what a
 * row is, this says what the page is. Written plainly rather than as a
 * disclaimer, because someone skimming should understand it in one line.
 */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-card border border-warning/35 bg-warning-soft p-4',
        className,
      )}
    >
      <FlaskConical size={18} aria-hidden className="mt-0.5 shrink-0 text-warning-ink" />
      <div className="text-body-sm text-warning-ink">
        <p className="font-semibold">Demo data — no real restaurants yet</p>
        <p className="mt-1 text-warning-ink/90">
          GALEYR is being built and tested. Every restaurant and menu shown here is
          invented test data. No real restaurant has partnered with us yet, and nothing
          ordered here will be cooked or delivered.
        </p>
        <p className="mt-1 text-warning-ink/90">
          Waa xog tijaabo ah. Ma jiraan makhaayado dhab ah oo nala shaqeeya wali.
        </p>
      </div>
    </div>
  );
}
