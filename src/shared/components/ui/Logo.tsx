import { Link } from 'react-router-dom';

import { brand } from '@shared/config/brand';
import { cn } from '@shared/lib/utils';

/**
 * The GALEYR lockup.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * The brand hierarchy, and why it is built into this component
 * ══════════════════════════════════════════════════════════════════════════
 *   GALEYR            ← the consumer brand. This is what a customer orders from.
 *   Galeyrka Duulo    ← the tagline, small and quiet.
 *   AC7 GROUP         ← the parent, credited in the footer and the intro only.
 *
 * The previous version put "AC7 GROUP" in the header as the primary name, with
 * a generic "A7" tile in place of a mark. That inverted the hierarchy: the
 * company a customer has no reason to care about led, and the service they came
 * for was nowhere.
 *
 * ── The artwork is used, not recreated ─────────────────────────────────────
 * This renders the supplied GALEYR file. It is not redrawn in SVG, not
 * approximated in CSS, and not restyled. The only processing applied was
 * removing the JPEG's white card and cropping the empty margin — without that
 * it renders as a white rectangle on the dark red hero and as a postage stamp
 * inside a large empty box. The mark's own proportions are untouched, and
 * `w-auto` keeps them that way at every size.
 */
export function Logo({
  /** Adds the tagline beneath. Off in the header, where vertical space is tight. */
  showTagline = false,
  /** `light` for placement on the dark red gradient or the footer. */
  tone = 'default',
  className,
}: {
  showTagline?: boolean;
  tone?: 'default' | 'light';
  className?: string;
}) {
  return (
    <Link
      to="/"
      className={cn('group inline-flex flex-col items-start', className)}
      aria-label={`${brand.name} — home`}
    >
      <picture>
        {/* WebP first, PNG for anything that cannot take it. The small variant
            is ~24KB against ~67KB for the hero asset — worth the two lines on
            a connection where the header is the first paint. */}
        <source srcSet={brand.logo.smallWebp} type="image/webp" />
        <img
          src={brand.logo.smallPng}
          alt={brand.name}
          width={360}
          height={161}
          /* Eager and high priority: this is above the fold and part of the
             first impression. Lazy-loading the logo produces a header that
             visibly pops in after the text. */
          loading="eager"
          fetchPriority="high"
          className={cn(
            'h-8 w-auto transition-transform duration-300 ease-smooth group-hover:scale-[1.03] sm:h-9',
            /* The artwork is dark red. On the brand gradient or the near-black
               footer that has almost no contrast, so it is lifted to white
               there. `brightness-0 invert` is a filter on the rendered pixels —
               it recolours nothing in the file and distorts no proportion. */
            tone === 'light' && 'brightness-0 invert',
          )}
        />
      </picture>

      {showTagline && (
        /* Small, letterspaced, not bold — it sits under the mark rather than
           competing with it. */
        <span
          className={cn(
            'mt-1.5 text-[0.6875rem] font-normal tracking-[0.22em]',
            tone === 'light' ? 'text-white/70' : 'text-ink-subtle',
          )}
        >
          {brand.tagline.toUpperCase()}
        </span>
      )}
    </Link>
  );
}

/**
 * The parent-company credit.
 *
 * One component so the wording cannot drift. "Galeyr Powered by AC7 Group" is
 * the agreed form; "AC7 GALEYR" is not, anywhere a customer can see.
 */
export function PoweredByAc7({
  tone = 'default',
  className,
}: {
  tone?: 'default' | 'light';
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-caption font-normal tracking-wide',
        tone === 'light' ? 'text-white/60' : 'text-ink-subtle',
        className,
      )}
    >
      <span className="font-semibold">{brand.name}</span> {brand.poweredBy}
    </p>
  );
}
