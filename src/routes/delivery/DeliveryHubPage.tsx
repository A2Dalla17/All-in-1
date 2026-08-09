/**
 * The Delivery Hub — the customer's own side of GALEYR.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why this is not another restaurant list
 * ══════════════════════════════════════════════════════════════════════════
 * Restaurants answers "what can I order". Delivery answers "what is happening
 * with the order I already placed, and who do I speak to". Two navigation items
 * that both opened a restaurant list would be one item with two names.
 *
 * Tracking leads, because that is what somebody opening this page at 8pm on a
 * Friday actually wants — the support and complaint routes matter enormously,
 * but they are the second thing, reached once tracking has not answered it.
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Bike, HeadphonesIcon, MessageSquareWarning, Settings2, Truck,
} from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { usePageMeta } from '@shared/lib/seo';
import { cn } from '@shared/lib/utils';

interface HubSection {
  to: string;
  /** True for the index route, which would otherwise match every child path. */
  end?: boolean;
  label: string;
  labelSo: string;
  description: string;
  icon: typeof Truck;
}

const SECTIONS: readonly HubSection[] = [
  {
    to: '/delivery',
    end: true,
    label: 'Track your order',
    labelSo: 'Raadi dalabkaaga',
    description: 'See exactly where your food is.',
    icon: Truck,
  },
  {
    to: '/delivery/support',
    label: 'Support and help',
    labelSo: 'Caawimaad',
    description: 'Something wrong with an order.',
    icon: HeadphonesIcon,
  },
  {
    to: '/delivery/complaint',
    label: 'Make a complaint',
    labelSo: 'Cabasho',
    description: 'Tell us what went wrong.',
    icon: MessageSquareWarning,
  },
  {
    to: '/delivery/settings',
    label: 'Delivery settings',
    labelSo: 'Dejinta',
    description: 'Language and preferences.',
    icon: Settings2,
  },
  {
    to: '/couriers',
    label: 'Become a courier',
    labelSo: 'Noqo wadaha',
    description: 'Deliver with GALEYR.',
    icon: Bike,
  },
];

export function DeliveryHubPage() {
  const { pathname } = useLocation();

  usePageMeta(
    'Delivery',
    'Track your GALEYR order, get help, make a complaint, or apply to become a courier.',
  );

  return (
    <Container className="py-8 sm:py-12">
      <header className="max-w-2xl">
        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-ink">
          GALEYR Delivery
        </p>
        <h1 className="mt-2 text-h2 font-extrabold tracking-tight text-ink">
          Keenista — your deliveries
        </h1>
        <p className="mt-2 text-body text-ink-muted">
          Track an order, get help, or tell us when something has gone wrong.
        </p>
      </header>

      {/* ── The hub's own navigation ──
          A horizontal scroller on a phone rather than a wrapping grid: five
          items that wrap to three rows push the actual content below the fold,
          and tracking is the thing people came for.

          On a tablet it becomes a two-column grid, and on a laptop a sidebar —
          three deliberately different layouts rather than one shrunk down. */}
      <div className="mt-8 lg:flex lg:gap-10">
        <nav
          aria-label="Delivery sections"
          className={cn(
            'flex gap-2 overflow-x-auto pb-2',
            'sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0',
            'lg:sticky lg:top-24 lg:block lg:w-64 lg:shrink-0 lg:space-y-1 lg:self-start',
          )}
        >
          {SECTIONS.map((section) => {
            const active = section.end
              ? pathname === section.to
              : pathname.startsWith(section.to);

            return (
              <Link
                key={section.to}
                to={section.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-card border p-3.5 transition-colors',
                  'min-w-[13rem] sm:min-w-0 lg:w-full',
                  active
                    ? 'border-brand bg-brand-soft'
                    : 'border-line bg-card hover:border-line-strong',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-tile',
                    active ? 'brand-gradient text-white' : 'bg-surface text-ink-muted',
                  )}
                >
                  <section.icon size={17} />
                </span>

                <span className="min-w-0">
                  <span
                    className={cn(
                      'block truncate text-body-sm font-semibold',
                      active ? 'text-brand-ink' : 'text-ink',
                    )}
                  >
                    {section.label}
                  </span>
                  <span className="block truncate text-caption text-ink-subtle">
                    {section.labelSo}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 min-w-0 flex-1 lg:mt-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
