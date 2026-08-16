import { Link } from 'react-router-dom';
import { ArrowRight, Store } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { GALEYR_CATEGORIES } from '@shared/config/categories';
import { env } from '@shared/config/env';
import { usePageMeta } from '@shared/lib/seo';

/**
 * Our Partners — the business categories Galeyr delivers from.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What this page is, and what it deliberately is not
 * ══════════════════════════════════════════════════════════════════════════
 * It is the answer to "what can Galeyr actually get me?" — twelve categories,
 * in one view, with no scrolling required to grasp the breadth.
 *
 * It is NOT a directory of individual businesses. That lives in the customer
 * app, which is built for browsing, filtering and ordering. A second listing
 * here would be a worse copy of it that drifts out of date.
 *
 * ── Ordered the way you asked ─────────────────────────────────────────────
 * Restaurant → Supermarket → Shop → Pharmacy → Cosmetics → Electronics →
 * Warehouse → and the rest. That order comes from the registry, so it is
 * changed in one place rather than here.
 *
 * ── Every tile crosses applications ───────────────────────────────────────
 * These are <a> elements, not react-router <Link>s. The customer app is a
 * separate application on a different origin; routing to it in-app would 404.
 * The origin is read from env so the two halves deploy independently.
 */
export function OurPartnersPage() {
  usePageMeta(
    'Our Partners',
    'Galeyr delivers from restaurants, supermarkets, shops, pharmacies, ' +
      'cosmetics, electronics and warehouses across Mogadishu.',
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-96"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 50% 0%, rgb(165 12 12 / 0.08), transparent 62%)',
          }}
        />
        <Container size="narrow" className="relative py-20 text-center">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-ink">
            Our Partners
          </p>
          <h1 className="mt-4 text-h1 text-ink">Everything you need, delivered</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-ink-muted">
            Galeyr is not a food delivery company. We deliver from businesses right
            across Mogadishu — restaurants, supermarkets, shops, pharmacies,
            cosmetics, electronics and warehouses.
          </p>
        </Container>
      </section>

      <Container className="py-16">
        <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALEYR_CATEGORIES.map((category) => (
            <li key={category.slug} className="flex">
              <a
                href={`${env.customerAppUrl}/c/${category.slug}`}
                className="group flex w-full items-start gap-4 rounded-panel border border-line bg-card p-5 shadow-card transition-colors hover:border-brand/40 hover:bg-brand-soft"
              >
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink transition-colors group-hover:bg-brand group-hover:text-white"
                >
                  <Store size={19} />
                </span>

                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{category.label}</span>
                  {/* Somali under English rather than instead of it. Both are
                      read in Mogadishu and choosing one excludes somebody. */}
                  <span className="mt-0.5 block text-caption text-ink-subtle">
                    {category.labelSo}
                  </span>
                  <span className="mt-2 block text-body-sm leading-snug text-ink-muted">
                    {category.blurb}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>

      {/* ── Addressed to the other side of the marketplace ──
          Someone reading a list of categories is often a business owner
          working out whether theirs fits. It does — that is the point of
          twelve categories — so the invitation belongs here. */}
      <section className="border-t border-line bg-surface py-16">
        <Container size="narrow" className="text-center">
          <h2 className="text-h2 text-ink">Do you run a business in Mogadishu?</h2>
          <p className="mx-auto mt-4 max-w-xl text-body leading-relaxed text-ink-muted">
            Restaurant, supermarket, pharmacy, warehouse — if you sell it, Galeyr can
            deliver it. Reach more of the city without hiring a delivery team.
          </p>
          <Link to="/partners" className="mt-8 inline-block">
            <Button variant="primary" size="lg" trailingIcon={<ArrowRight size={16} />}>
              Become Our Partner
            </Button>
          </Link>
        </Container>
      </section>
    </>
  );
}
