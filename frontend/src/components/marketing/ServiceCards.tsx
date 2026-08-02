import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';

import { Container } from '@/components/ui/Container';
import { SERVICES, type ServiceLink } from '@/config/navigation';
import { cn } from '@/lib/utils';

/**
 * The four service cards.
 *
 * ── Why the inactive card is a <div> and not a disabled link ───────────────
 * Marketplace is Phase 2. An <a> with no href is not focusable and is
 * announced as plain text, which is confusing next to three cards that are
 * links; an <a> pointing at "#" or a dead route is worse, because it looks
 * like it works until someone clicks it. A div marked aria-disabled says
 * exactly what is true: this is a thing, and it is not available yet.
 *
 * The card also stops being `interactive` in that state — no lift on hover.
 * A card that responds to the cursor but does nothing when clicked is a small
 * lie, and it is the kind that makes people distrust the rest of the page.
 */
export function ServiceCards() {
  return (
    <section aria-labelledby="services-heading">
      <Container className="pb-20">
        <h2 id="services-heading" className="sr-only">
          Our services
        </h2>

        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <li key={service.id} className="flex">
              <ServiceCard service={service} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ServiceCard({ service }: { service: ServiceLink }) {
  const { icon: Icon, label, tagline, description, cta, comingSoon, to, href } = service;

  const body: ReactNode = (
    <>
      <span
        aria-hidden
        className={cn(
          'grid h-12 w-12 place-items-center rounded-tile transition-colors duration-300',
          comingSoon ? 'bg-elevated text-ink-subtle' : 'bg-brand-soft text-brand-ink',
        )}
      >
        <Icon size={22} />
      </span>

      <h3 className="mt-5 text-h4 text-ink">{label}</h3>
      <p className="mt-1 text-caption font-medium text-brand-ink">{tagline}</p>
      <p className="mt-3 flex-1 text-body-sm leading-relaxed text-ink-muted">{description}</p>

      <span
        className={cn(
          'mt-6 inline-flex items-center gap-1.5 text-body-sm font-semibold',
          comingSoon ? 'text-ink-subtle' : 'text-brand-ink',
        )}
      >
        {cta}
        {comingSoon ? (
          <Lock size={13} aria-hidden />
        ) : (
          <ArrowRight
            size={15}
            aria-hidden
            className="transition-transform duration-300 ease-smooth group-hover:translate-x-1"
          />
        )}
      </span>
    </>
  );

  const shell =
    'group relative flex w-full flex-col rounded-card border border-line p-6 shadow-card';

  if (comingSoon) {
    return (
      <div aria-disabled="true" className={cn(shell, 'bg-card/60')}>
        <span className="absolute right-5 top-5 rounded-pill bg-elevated px-2.5 py-1 text-micro font-semibold text-ink-subtle">
          Coming soon
        </span>
        {body}
      </div>
    );
  }

  const interactive = cn(shell, 'liftable bg-card hover:border-brand/40');

  /* Taxi is a separate deployment, so it needs a real page navigation rather
     than a router push that would 404 inside this app. */
  return href ? (
    <a href={href} className={interactive}>
      {body}
    </a>
  ) : (
    <Link to={to as string} className={interactive}>
      {body}
    </Link>
  );
}
