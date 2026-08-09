/**
 * Motion primitives, adapted from Velora UI.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Where these came from and what changed
 * ══════════════════════════════════════════════════════════════════════════
 * Ported from github.com/ColorlibHQ/velora-ui (MIT, © 2026 Aigars Silkalns).
 * They are not copied verbatim — Velora targets Next.js 16, React 19 and
 * Tailwind 4, and this project is Vite, React 18 and Tailwind 3.4. Four
 * incompatibilities had to be resolved in every one of them:
 *
 *   1. `"use client"` removed. It is a React Server Components directive; in a
 *      Vite SPA every component is already a client component and the pragma is
 *      dead weight.
 *
 *   2. Hydration branches removed. Velora carefully keeps `initial` identical
 *      on server and client because Next renders on a server that cannot know
 *      the user's motion preference. There is no server here, so those
 *      workarounds are gone and reduced motion is handled directly — which is
 *      simpler AND more correct, because it can now skip the animation
 *      entirely rather than running it at zero duration.
 *
 *   3. Tailwind 4 syntax replaced. `from-(--beam-from)` is v4's arbitrary CSS
 *      variable shorthand and silently produces no class in 3.4 — the beam
 *      would render invisible rather than error. `h-0.75` likewise does not
 *      exist in this project's spacing scale.
 *
 *   4. `oklab` colour-mixing replaced with this project's `rgb(var(--brand))`
 *      token model, so these inherit the dark red automatically and follow the
 *      light/dark theme instead of carrying Velora's slate-and-violet palette.
 *
 * ── Why a barrel file rather than one file per component ───────────────────
 * These are small, they share the same import of `motion/react`, and they are
 * always used together. Five files of thirty lines each would be five chunks
 * for the bundler to think about and five imports at every call site.
 *
 * ── Reduced motion is not optional here ────────────────────────────────────
 * Every component below checks it. A delivery site is opened by people who are
 * hungry, sometimes moving, often on a phone — and vestibular sensitivity does
 * not care that the animation is tasteful. `useReducedMotion` reads the OS
 * setting, and where it is on these render as plain, static elements.
 */

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react';

import { cn } from '@shared/lib/utils';

/* -------------------------------------------------------------------------- */
/* BlurFade — reveal on scroll                                                */
/* -------------------------------------------------------------------------- */

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const AXIS = { up: 'y', down: 'y', left: 'x', right: 'x' } as const;
const SIGN = { up: 1, down: -1, left: 1, right: -1 } as const;

export interface BlurFadeProps {
  children: ReactNode;
  className?: string;
  /** Seconds before the animation starts. Stagger a grid by multiplying an index. */
  delay?: number;
  duration?: number;
  direction?: Direction;
  /** Distance travelled, in pixels. */
  offset?: number;
  once?: boolean;
}

/**
 * Fades and un-blurs its children as they enter the viewport.
 *
 * The single highest-value thing in the whole Velora set: it turns a page that
 * pops into existence on scroll into one that resolves. Used on the marketing
 * sections, deliberately NOT on anything operational — a courier assignment
 * board that fades in is a board somebody is waiting on.
 */
export function BlurFade({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  offset = 16,
  once = true,
}: BlurFadeProps) {
  const reduced = useReducedMotion();

  /* Rendered as a plain div under reduced motion. Velora runs the animation at
     zero duration instead, because Next needs the markup to match what the
     server produced; with no server, not animating at all is cheaper and
     avoids a filter property that some phones composite badly. */
  if (reduced) return <div className={className}>{children}</div>;

  const hidden =
    direction === 'none'
      ? { opacity: 0, filter: 'blur(6px)' }
      : {
          opacity: 0,
          filter: 'blur(6px)',
          [AXIS[direction]]: SIGN[direction] * offset,
        };

  return (
    <motion.div
      className={cn(className)}
      initial={hidden}
      whileInView={{ opacity: 1, filter: 'blur(0px)', x: 0, y: 0 }}
      /* -10% bottom margin means the reveal fires slightly before the element
         reaches the fold, so it has finished by the time it is being read. */
      viewport={{ once, margin: '0px 0px -10% 0px' }}
      transition={{ delay, duration, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* NumberTicker — counts up when scrolled into view                            */
/* -------------------------------------------------------------------------- */

export interface NumberTickerProps {
  value: number;
  startValue?: number;
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Counts a number up when it comes into view.
 *
 * ── Where this is and is not appropriate ───────────────────────────────────
 * Good on the Control Room dashboard, where "orders today" climbing to its
 * value draws the eye to a figure that changed.
 *
 * Not used for money owed or collected. A total that animates is a total
 * somebody might read mid-count, and misreading $14.00 as $4.00 on a doorstep
 * is a real argument. Cash figures render instantly.
 */
export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  decimalPlaces = 0,
  prefix = '',
  suffix = '',
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(startValue);
  const spring = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView) return;

    if (reduced) {
      motionValue.jump(value);
      return;
    }

    const timer = window.setTimeout(() => motionValue.set(value), delay * 1000);
    return () => window.clearTimeout(timer);
  }, [inView, reduced, motionValue, value, delay]);

  /* Writes textContent directly rather than through state. A spring emits on
     every frame, and sixty setState calls a second would re-render the whole
     dashboard for a number nobody is interacting with. */
  useEffect(() => {
    const format = (n: number) =>
      `${prefix}${new Intl.NumberFormat('en-GB', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(n)}${suffix}`;

    return spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = format(latest);
    });
  }, [spring, prefix, suffix, decimalPlaces]);

  return (
    <span ref={ref} className={cn('inline-block tabular-nums', className)}>
      {/* Server-less, but this still matters: it is what a reader sees for the
          frame before the spring starts, and what remains if JS fails. */}
      {`${prefix}${startValue.toFixed(decimalPlaces)}${suffix}`}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* BorderBeam — a light travelling around a card's border                      */
/* -------------------------------------------------------------------------- */

export interface BorderBeamProps {
  className?: string;
  /** Length of the beam, in pixels. */
  size?: number;
  /** Seconds for one full circuit. */
  duration?: number;
  delay?: number;
  reverse?: boolean;
}

/**
 * A light that travels around the border of its positioned ancestor.
 *
 * The parent needs `relative` and a rounded border. Used sparingly — on one
 * element at a time — because two of these on a screen stop reading as
 * emphasis and start reading as decoration.
 *
 * ── The Tailwind 4 trap ────────────────────────────────────────────────────
 * Velora writes `from-(--beam-from)`, which is v4 shorthand for an arbitrary
 * CSS variable. Tailwind 3.4 does not parse it and emits nothing — no error, no
 * class, just an invisible beam that looks like the component is broken. The
 * gradient is written as an inline style here instead, which works on both.
 */
export function BorderBeam({
  className,
  size = 64,
  duration = 6,
  delay = 0,
  reverse = false,
}: BorderBeamProps) {
  const reduced = useReducedMotion();

  /* A light circling forever is precisely the kind of perpetual movement
     reduced motion exists to stop. Rendered as nothing rather than paused. */
  if (reduced) return null;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent',
        '[mask-clip:padding-box,border-box] [mask-composite:intersect]',
        '[mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]',
      )}
    >
      <motion.div
        className={cn('absolute aspect-square', className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            /* The project's brand token, so this follows the theme instead of
               carrying Velora's violet. */
            background:
              'linear-gradient(to left, rgb(var(--brand)), rgb(var(--brand-hover)), transparent)',
          } as CSSProperties
        }
        initial={{ offsetDistance: reverse ? '100%' : '0%' }}
        animate={{ offsetDistance: reverse ? '0%' : '100%' }}
        transition={{ repeat: Infinity, ease: 'linear', duration, delay: -delay }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SpotlightCard — a glow that follows the cursor                              */
/* -------------------------------------------------------------------------- */

export interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  /** Radius of the glow, in pixels. */
  radius?: number;
}

/**
 * A soft brand-coloured glow that follows the pointer across the card.
 *
 * ── No motion library, and no React state ──────────────────────────────────
 * The handler writes two CSS custom properties straight onto the node. Putting
 * the cursor position in state would re-render the card — and everything inside
 * it — on every mousemove, which on a grid of restaurants is a genuinely
 * expensive way to draw a gradient.
 *
 * It is also why this needs no reduced-motion branch: nothing moves unless the
 * user is actively moving the pointer, which is not vestibular motion. It is
 * simply absent on touch, where there is no hover.
 */
export function SpotlightCard({ children, className, radius = 320 }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onMouseMove={(event) => {
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
        el.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
      }}
      className={cn('group relative overflow-hidden', className)}
      style={{ '--spot-radius': `${radius}px` } as CSSProperties}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(var(--spot-radius) circle at var(--spot-x, 50%) var(--spot-y, 50%), rgb(var(--brand) / 0.10), transparent 65%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ScrollProgress — reading position                                           */
/* -------------------------------------------------------------------------- */

/**
 * A hairline at the top of the window showing how far down the page you are.
 *
 * Worth it on the long pages — FAQ, About, the legal texts — where "how much
 * more of this is there" is a real question. `h-[3px]` rather than Velora's
 * `h-0.75`, which is a Tailwind 4 spacing value this project does not define.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaled = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 32,
    restDelta: 0.001,
  });
  const reduced = useReducedMotion();

  return (
    <motion.div
      aria-hidden
      className={cn(
        'fixed inset-x-0 top-0 z-[60] h-[3px] origin-left brand-gradient',
        className,
      )}
      /* Under reduced motion it tracks scroll exactly rather than springing —
         still useful, no easing overshoot. */
      style={{ scaleX: reduced ? scrollYProgress : scaled }}
    />
  );
}
