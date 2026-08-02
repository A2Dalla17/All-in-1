/**
 * AC7 Ride — design tokens
 * ============================================================================
 *
 * Colours resolve through CSS custom properties defined in
 * src/styles/index.css, so a single `.dark` class on <html> flips the app.
 * Never hard-code a hex in a component — if a colour is missing, add it here
 * and to the stylesheet.
 *
 * ── On the brand red ───────────────────────────────────────────────────────
 * The brand is #8B0000. It measures 10.0:1 against white, which is excellent,
 * and 1.97:1 against our near-black — which is unreadable. So the system
 * splits what most palettes conflate:
 *
 *   brand      the FILL. White text sits on it. Deep in both themes.
 *   brand-ink  brand-coloured TEXT and ICONS. Lifts to #E5484D in dark
 *              (5.03:1 on #0B0B0B) so links and active tabs stay legible.
 *   brand-soft the wash behind selected rows and icon chips.
 *
 * Using `text-brand` on a dark surface is the one mistake this split exists to
 * prevent — reach for `text-brand-ink` instead.
 *
 * ── On the type scale ──────────────────────────────────────────────────────
 * Every size a screen needs is named. Arbitrary values like `text-[0.9375rem]`
 * are a smell: they drift, they never line up between screens, and they make a
 * global adjustment impossible. Use the names.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Landing-site accent (ACT). Green, used for positive/verified
           states on the public site — deliberately not the brand red, which
           means 'AC7' rather than 'good'. */
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          ink: 'rgb(var(--accent-ink) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        /* ---- Surfaces — flip with the theme ---------------------------- */
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',

        /* ---- Brand ----------------------------------------------------- */
        brand: {
          /* The fill. White text on this. */
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          /* Brand-coloured text and icons. Theme-aware — safe on any surface. */
          ink: 'rgb(var(--brand-ink) / <alpha-value>)',
          /* Tinted wash for selected rows, icon chips, subtle highlights. */
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover) / <alpha-value>)',
          pressed: 'rgb(var(--brand-pressed) / <alpha-value>)',

          /* Fixed ramp — for charts and gradients, not theme-aware. */
          50: '#FDF2F2',
          100: '#FADEDE',
          200: '#F2B8B8',
          300: '#E58585',
          400: '#CC4444',
          500: '#8B0000',
          600: '#750000',
          700: '#5E0000',
          800: '#450000',
          900: '#2B0000',
        },

        /* ---- Text ------------------------------------------------------ */
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
          subtle: 'rgb(var(--ink-subtle) / <alpha-value>)',
          inverse: 'rgb(var(--ink-inverse) / <alpha-value>)',
        },

        /* ---- Borders --------------------------------------------------- */
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)',
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },

        /* ---- Semantic — each has a fill and a legible ink variant ------- */
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          ink: 'rgb(var(--success-ink) / <alpha-value>)',
          soft: 'rgb(var(--success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          ink: 'rgb(var(--warning-ink) / <alpha-value>)',
          soft: 'rgb(var(--warning-soft) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          ink: 'rgb(var(--danger-ink) / <alpha-value>)',
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'rgb(var(--info) / <alpha-value>)',
          ink: 'rgb(var(--info-ink) / <alpha-value>)',
          soft: 'rgb(var(--info-soft) / <alpha-value>)',
        },

        /* ---- Charts — deep red through neutral ------------------------- */
        chart: {
          1: '#8B0000',
          2: '#B33A3A',
          3: '#D97070',
          4: '#E5A0A0',
          5: '#9CA3AF',
          6: '#6B7280',
        },
      },

      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
      },

      /* ---- Type scale ---------------------------------------------------
         Headings are tightly tracked; body is not. Tight tracking on small
         text hurts legibility, which is why the negative values stop at h5. */
      fontSize: {
        display: ['2.75rem', { lineHeight: '1.06', letterSpacing: '-0.04em', fontWeight: '700' }],
        h1: ['2.125rem', { lineHeight: '1.12', letterSpacing: '-0.035em', fontWeight: '700' }],
        h2: ['1.75rem', { lineHeight: '1.18', letterSpacing: '-0.03em', fontWeight: '700' }],
        h3: ['1.375rem', { lineHeight: '1.25', letterSpacing: '-0.025em', fontWeight: '700' }],
        h4: ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.02em', fontWeight: '600' }],
        h5: ['1rem', { lineHeight: '1.4', letterSpacing: '-0.015em', fontWeight: '600' }],

        /* Body — the workhorses. `body` is the default for prose. */
        'body-lg': ['1.0625rem', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        body: ['0.9375rem', { lineHeight: '1.55' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55' }],

        /* Support */
        caption: ['0.8125rem', { lineHeight: '1.45' }],
        micro: ['0.75rem', { lineHeight: '1.4' }],

        /* Uppercase eyebrows and tab labels only — never for prose. */
        overline: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.14em', fontWeight: '600' }],
        tab: ['0.625rem', { lineHeight: '1.2', letterSpacing: '0.01em', fontWeight: '600' }],

        /* Money. Pair with `.tabular` so columns align. */
        'amount-xl': ['2.375rem', { lineHeight: '1', letterSpacing: '-0.04em', fontWeight: '700' }],
        'amount-lg': [
          '1.75rem',
          { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '700' },
        ],
        amount: ['1.125rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
      },

      /* ---- Radius — one step per surface size ------------------------- */
      borderRadius: {
        chip: '0.625rem',
        control: '0.875rem',
        tile: '1rem',
        card: '1.25rem',
        panel: '1.5rem',
        sheet: '1.75rem',
        pill: '9999px',
      },

      /* ---- Elevation --------------------------------------------------- */
      boxShadow: {
        xs: 'var(--shadow-xs)',
        card: 'var(--shadow-card)',
        lifted: 'var(--shadow-lifted)',
        float: 'var(--shadow-float)',
        sheet: 'var(--shadow-sheet)',
        brand: 'var(--shadow-brand)',
        'brand-lg': 'var(--shadow-brand-lg)',
      },

      /* ---- Layout ------------------------------------------------------ */
      spacing: {
        gutter: '1.25rem' /* the standard screen inset — px-gutter */,
        'safe-top': 'var(--safe-top)',
        'safe-bottom': 'var(--safe-bottom)',
        /* Clearance for the floating tab bar plus the home indicator. */
        tabbar: 'calc(7rem + var(--safe-bottom))',
      },

      maxWidth: {

        /* Landing-site content width. */

        site: '75rem',
        prose: '34rem',
        sheet: '32rem',
      },

      /* ---- Motion ------------------------------------------------------ */
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.32, 0.72, 0, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },

      transitionDuration: {
        instant: '120ms',
        quick: '180ms',
        base: '240ms',
        slow: '380ms',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'sheet-down': {
          from: { transform: 'translateY(0)' },
          to: { transform: 'translateY(100%)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.5' },
          '70%': { transform: 'scale(1.8)', opacity: '0' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'slide-hint': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(5px)' },
        },
        /* Radar sweep while searching for a driver. */
        radar: {
          '0%': { transform: 'scale(0.4)', opacity: '0.55' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        /* Draws the success tick. Pair with pathLength={1} on the <path>. */
        'draw-check': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        /* The car nudging along on loading screens. */
        'drift-x': {
          '0%, 100%': { transform: 'translateX(-6%)' },
          '50%': { transform: 'translateX(6%)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        /* Live-status dot. */
        breathe: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.86)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-out': 'fade-out 160ms cubic-bezier(0.4, 0, 1, 1)',
        'fade-up': 'fade-up 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-down': 'fade-down 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-right': 'slide-in-right 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        'sheet-up': 'sheet-up 380ms cubic-bezier(0.32, 0.72, 0, 1)',
        'sheet-down': 'sheet-down 260ms cubic-bezier(0.4, 0, 1, 1)',
        'scale-in': 'scale-in 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.32, 0.72, 0, 1) infinite',
        'slide-hint': 'slide-hint 1.8s ease-in-out infinite',
        radar: 'radar 2.6s cubic-bezier(0.32, 0.72, 0, 1) infinite',
        'draw-check': 'draw-check 520ms cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'drift-x': 'drift-x 2.4s ease-in-out infinite',
        'spin-slow': 'spin-slow 2.4s linear infinite',
        breathe: 'breathe 2s cubic-bezier(0.32, 0.72, 0, 1) infinite',
      },
    },
  },
  plugins: [],
};
