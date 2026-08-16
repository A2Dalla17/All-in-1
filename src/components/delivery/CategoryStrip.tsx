import { ArrowRight } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { GALEYR_CATEGORIES } from '@shared/config/categories';
import { env } from '@shared/config/env';

/**
 * What Galeyr delivers.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * This section exists to correct one wrong assumption
 * ══════════════════════════════════════════════════════════════════════════
 * Anyone who lands on a delivery site expects food. Galeyr delivers from
 * supermarkets, pharmacies, cosmetics shops, electronics shops and
 * warehouses too, and if a visitor does not learn that in the first few
 * seconds they will file it as "another food app" and never come back.
 *
 * So it sits directly under the hero, above every other section, and it shows
 * ALL twelve categories rather than a curated handful. Breadth is the message;
 * hiding half of it behind "see more" would defeat the section's only purpose.
 *
 * ── Every tile crosses into the customer app ──────────────────────────────
 * The landing site does not browse the marketplace — the customer app does,
 * at `/c/<slug>`. So each tile is an ordinary <a>, not a react-router <Link>:
 * this is a different application on a different origin, and routing to it
 * in-app would 404.
 *
 * The origin comes from `env.customerAppUrl` rather than being hard-coded,
 * because the two halves deploy independently — localhost:3100 in
 * development, app.galeyr.com in production.
 *
 * The slugs must match the customer app's registry exactly. That contract is
 * documented at the top of `shared/config/categories.ts`; break it and a tile
 * leads to a "category not found" page.
 */
export function CategoryStrip() {
  return (
    <section aria-labelledby="what-we-deliver" className="border-b border-line bg-surface py-16">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-ink">
              Everything you need
            </p>
            <h2 id="what-we-deliver" className="mt-3 text-h2 text-ink">
              Not just food
            </h2>
            <p className="mt-3 max-w-xl text-body leading-relaxed text-ink-muted">
              Galeyr delivers from businesses right across Mogadishu — restaurants,
              supermarkets, pharmacies, shops and warehouses.
            </p>
          </div>

          <a
            href={`${env.customerAppUrl}/categories`}
            className="inline-flex items-center gap-2 text-body-sm font-semibold text-brand-ink hover:underline"
          >
            Browse all
            <ArrowRight size={16} aria-hidden />
          </a>
        </div>

        <ul className="stagger mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {GALEYR_CATEGORIES.map((c) => (
            <li key={c.slug} className="flex">
              <a
                href={`${env.customerAppUrl}/c/${c.slug}`}
                className="group w-full rounded-card border border-line bg-card p-4 transition-colors hover:border-brand/40 hover:bg-brand-soft"
              >
                <span className="block font-semibold text-ink">{c.label}</span>
                {/* The Somali name sits under the English one rather than
                    replacing it. Both are read in Mogadishu, and picking one
                    excludes somebody. */}
                <span className="mt-0.5 block text-caption text-ink-subtle">
                  {c.labelSo}
                </span>
                <span className="mt-2 block text-body-sm leading-snug text-ink-muted">
                  {c.blurb}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
