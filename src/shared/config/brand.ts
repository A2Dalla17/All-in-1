/**
 * GALEYR — brand constants.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Two logos, two jobs, never swapped
 * ══════════════════════════════════════════════════════════════════════════
 *
 *   GALEYR (wings + wordmark)      → the product. Header, footer, everywhere.
 *   GR (monogram + AC7 credit)     → the opening sequence, and nothing else.
 *
 * They are not interchangeable and must never be combined into a third mark.
 * Keeping both paths here — rather than as string literals scattered through a
 * dozen components — is what makes that rule enforceable: there is one place
 * where a wrong path could be introduced, and it is this one.
 *
 * ── The hierarchy ──────────────────────────────────────────────────────────
 *   GALEYR          the consumer brand. What people order from.
 *   Galeyrka Duulo  the tagline. Small, quiet, never competing with the mark.
 *   AC7 GROUP       the parent. Credited, not advertised.
 *
 * "AC7 GALEYR" is an internal name. It appears in the repository, in migrations
 * and in these comments; it does not appear on any surface a customer sees.
 */

export const brand = {
  /** The consumer-facing name. Always this, on its own. */
  name: 'GALEYR',

  /** Sits beneath the mark. Small and elegant — see Logo. */
  tagline: 'Galeyrka Duulo',

  /** The parent-company credit. Rendered as "Galeyr Powered by AC7 Group". */
  poweredBy: 'Powered by AC7 Group',

  /** The company behind it. Used in legal pages, not in marketing headings. */
  parent: 'AC7 GROUP',
  parentMeaning: 'Aragti Cad',

  logo: {
    /** Hero and large placements. */
    webp: '/brand/galeyr-logo.webp',
    png: '/brand/galeyr-logo.png',
    /** Header and anywhere under ~200px wide. Roughly a third of the bytes. */
    smallWebp: '/brand/galeyr-logo-sm.webp',
    smallPng: '/brand/galeyr-logo-sm.png',
  },

  /**
   * The intro monogram. Referenced by exactly one component, `BrandIntro`.
   *
   * If this path appears anywhere else, the hierarchy has been broken: the GR
   * mark carries the parent company's name, and putting it in the product would
   * tell a customer they are using AC7 GROUP rather than GALEYR.
   */
  intro: {
    webp: '/brand/gr-intro.webp',
    png: '/brand/gr-intro.png',
  },
} as const;

/* -------------------------------------------------------------------------- */
/* The opening sequence                                                        */
/* -------------------------------------------------------------------------- */

/**
 * How long the intro runs, in milliseconds.
 *
 * The brief asked for 17–21 seconds; this sits in the middle of that range and
 * the animation timings below are derived from it, so changing this one number
 * re-times the whole sequence proportionally rather than breaking it.
 */
export const INTRO_DURATION_MS = 18_000;

/**
 * When the skip control appears.
 *
 * Not at zero — a skip button visible from the first frame reads as an apology
 * for the thing it is attached to, and most people will hit it reflexively
 * before the animation has established anything. Two seconds is long enough for
 * the monogram to land.
 */
export const INTRO_SKIP_AFTER_MS = 2_200;

/**
 * ── Why the intro plays once per visitor rather than on every load ─────────
 *
 * An eighteen-second sequence before the landing page is a strong first
 * impression and a punishing second one. This is a food delivery service: the
 * person opening it is hungry, often on a slow connection, and frequently a
 * repeat customer who has already seen the intro. Making them sit through it
 * again on the way to lunch is how a brand moment turns into a reason to order
 * somewhere else.
 *
 * So: full sequence on a first visit, straight to the product thereafter. The
 * flag lives in localStorage, which means it is per-browser and clearing site
 * data brings the intro back — the right behaviour for something that exists to
 * introduce the brand.
 *
 * To play it on every visit instead, set INTRO_ONCE_PER_VISITOR to false. That
 * is the only change required; nothing else reads the flag.
 */
export const INTRO_ONCE_PER_VISITOR = true;

/** Bumping this shows the intro again to everyone — for a rebrand or relaunch. */
export const INTRO_STORAGE_KEY = 'galeyr.intro.seen.v1';
