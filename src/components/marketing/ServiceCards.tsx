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
              <Link
                key={service.id}
                to={service.to}
                className={cn(
                  'pressable group flex flex-col rounded-card p-6 transition-colors',
                  primary
                    ? 'brand-gradient text-white shadow-brand md:row-span-2'
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
            );
          })}
        </div>
      </Container>
    </section>
  );
}
