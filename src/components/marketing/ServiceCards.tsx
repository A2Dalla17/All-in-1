/**
 * The three ways to be part of AC7 GALEYR: order, deliver, or list a restaurant.
 *
 * ── Not a services menu ────────────────────────────────────────────────────
 * These are not four products with one greyed out. They are the three sides of
 * one marketplace, and every card leads somewhere that works today.
 *
 * Ordering comes first and is visually heavier, because customers outnumber
 * couriers and restaurants by a very long way and the page has one job.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { BlurFade, SpotlightCard } from '@shared/components/motion';
import { SERVICES } from '@shared/config/navigation';
import { cn } from '@shared/lib/utils';

export function ServiceCards() {
  return (
    <section id="services" className="py-16 sm:py-20">
      <Container>
        <div className="grid gap-4 md:grid-cols-3">
          {SERVICES.map((service, i) => {
            /* The first card — ordering — is the primary action, and is filled
               rather than outlined so it wins the glance. */
            const primary = i === 0;

            return (
              /* Staggered by 90ms per card. Enough that the eye follows them in
                 order — which is the order they should be read in — without the
                 last one arriving so late it feels broken. */
              <BlurFade
                key={service.id}
                delay={i * 0.09}
                className={cn('flex', primary && 'md:row-span-2')}
              >
              {/* Three nested wrappers, each doing one job: BlurFade is the
                  grid item and owns the row span, SpotlightCard owns the hover
                  glow, Link owns the navigation. `h-full` has to be threaded
                  through all of them or the primary card stops filling its two
                  rows and leaves a gap beside the other two. */}
              <SpotlightCard className="flex h-full w-full rounded-card">
              <Link
                to={service.to}
                className={cn(
                  'pressable group flex h-full w-full flex-col rounded-card p-6 transition-colors',
                  primary
                    ? 'brand-gradient text-white shadow-brand'
                    : 'border border-line bg-card hover:border-line-strong',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-12 w-12 place-items-center rounded-tile',
                    primary ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand-ink',
                  )}
                >
                  <service.icon size={22} />
                </span>

                <h2
                  className={cn(
                    'mt-5 text-h4',
                    primary ? 'text-white' : 'text-ink',
                  )}
                >
                  {service.label}
                </h2>

                {service.labelSo && (
                  <p
                    className={cn(
                      'mt-0.5 text-body-sm',
                      primary ? 'text-white/70' : 'text-ink-subtle',
                    )}
                  >
                    {service.labelSo}
                  </p>
                )}

                <p
                  className={cn(
                    'mt-3 flex-1 text-body',
                    primary ? 'text-white/85' : 'text-ink-muted',
                  )}
                >
                  {service.description}
                </p>

                <span
                  className={cn(
                    'mt-5 inline-flex items-center gap-1.5 text-body-sm font-semibold',
                    primary ? 'text-white' : 'text-brand-ink',
                  )}
                >
                  {service.cta}
                  <ArrowRight
                    size={16}
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
              </SpotlightCard>
              </BlurFade>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
