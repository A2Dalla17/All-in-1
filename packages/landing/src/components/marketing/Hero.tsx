import { ShieldCheck } from 'lucide-react';

import { CommunityShowcase } from '@/components/marketing/CommunityShowcase';
import { Container } from '@/components/ui/Container';
import { env } from '@/config/env';

/**
 * Hero.
 *
 * Identity, then inventory: name, meaning, tagline, advertising billboard.
 * Nothing else.
 *
 * ── Why there are no call-to-action buttons here ───────────────────────────
 * There were two — Book Taxi and Call Control Centre — and both were the third
 * copy of something already on the page. Taxi is in the header navigation and
 * is the first of the four service cards directly below. The control centre
 * number is in the header, in its own section further down, and in the footer.
 *
 * Removing them costs nothing in reach and buys the billboard the whole of the
 * first screen. Every route those buttons offered is still one click away, and
 * the advertising space — which is the thing being sold — is no longer
 * competing with a duplicate of the navigation.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient glow. Inline rather than a Tailwind arbitrary value: a
          radial-gradient contains commas and slashes that have to be escaped
          into an unreadable class for no benefit. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-48 h-[34rem]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 0%, rgb(165 12 12 / 0.10), transparent 62%)',
        }}
      />

      <Container className="relative pb-12 pt-20 text-center sm:pt-28">
        <p className="mb-5 inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-caption font-medium text-ink-muted">
          <ShieldCheck size={13} aria-hidden className="text-brand-ink" />
          Licensed private hire across {env.company.city}
        </p>

        <h1 className="text-display text-ink">{env.company.name}</h1>

        <p className="mt-3 text-h2 font-semibold text-brand-ink">{env.company.meaning}</p>

        <p className="mx-auto mt-6 max-w-2xl text-body-lg leading-relaxed text-ink-muted">
          Transport, school runs and local bookings — run properly, answered by a person, and
          built to be relied on every single day.
        </p>

        {/* The advertising billboard closes the hero.
            No buttons follow it: Taxi is in the header, the control centre
            number is in the header, its own section and the footer, and the
            four service cards sit immediately below this. Repeating either
            here added a third copy of both without adding a route to anything
            new. */}
        <CommunityShowcase className="mt-10" />
      </Container>
    </section>
  );
}
