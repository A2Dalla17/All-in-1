/**
 * A restaurant's own Community Offers and Announcements.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * This belongs to the restaurant, not to GALEYR
 * ══════════════════════════════════════════════════════════════════════════
 * Distinct from the billboard on the GALEYR homepage, which is inventory GALEYR
 * sells. These are a restaurant's own discounts, new dishes, Ramadan offers and
 * announcements, and they appear only on that restaurant's page.
 *
 * Keeping the two apart matters commercially: one is paid placement, the other
 * is part of what a partner gets. A single table would make "who published this,
 * and did anyone pay for it" unanswerable.
 *
 * ── Nothing here is filtered in JavaScript ─────────────────────────────────
 * Published, in date, and belonging to a live restaurant are all enforced by
 * `galeyr_promotions_public_read`. An expired offer cannot reach this component
 * even if the query forgot to exclude it — which matters, because a discount
 * that has ended is a promise the restaurant has to honour or refuse at the
 * door.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Megaphone, Tag } from 'lucide-react';

import { BlurFade } from '@shared/components/motion';
import { listPromotions, PROMOTION_KIND_LABEL, type Promotion } from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

export function RestaurantCommunity({
  restaurantId,
  restaurantName,
}: {
  restaurantId: string;
  restaurantName: string;
}) {
  const { data, isPending } = useQuery({
    queryKey: ['ops', 'promotions', restaurantId],
    queryFn: () => listPromotions(restaurantId),
  });

  const promotions = data ?? [];

  /* Nothing running is the normal state for most restaurants most of the time.
     An empty "Community" heading over a blank space reads as broken, so the
     whole section is omitted rather than shown empty. */
  if (isPending || promotions.length === 0) return null;

  return (
    <section aria-labelledby="community-heading" className="mt-10">
      <div className="flex items-center gap-2">
        <Megaphone size={19} aria-hidden className="text-brand-ink" />
        <h2 id="community-heading" className="text-h4 font-bold text-ink">
          Community offers &amp; announcements
        </h2>
      </div>
      <p className="mt-1 text-body-sm text-ink-muted">
        Posted by {restaurantName}.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {promotions.map((promotion, i) => (
          <BlurFade key={promotion.id} delay={Math.min(i, 6) * 0.06}>
            <PromotionCard promotion={promotion} />
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  const endsSoon =
    promotion.valid_until &&
    new Date(promotion.valid_until).getTime() - Date.now() < 3 * 86_400_000;

  /* An external link is opened in a new tab with `noopener noreferrer`. Without
     `noopener` the opened page gets a handle on this one through window.opener
     and can navigate it somewhere else — a redirect that looks like it came
     from GALEYR. The restaurant is a partner, not a reason to skip it. */
  const isExternal = promotion.cta_href?.startsWith('http');

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-card">
      {promotion.image_url && (
        <img
          src={promotion.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[16/9] w-full object-cover"
        />
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-2.5 py-1 text-caption font-bold uppercase tracking-wide text-brand-ink">
            <Tag size={11} aria-hidden />
            {PROMOTION_KIND_LABEL[promotion.kind]}
          </span>

          {promotion.discount_label && (
            <span className="rounded-pill bg-success-soft px-2.5 py-1 text-caption font-bold text-success-ink">
              {promotion.discount_label}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-h5 font-bold text-ink">{promotion.title}</h3>

        {promotion.description && (
          <p className="mt-2 flex-1 text-body-sm text-ink-muted">{promotion.description}</p>
        )}

        {promotion.valid_until && (
          <p
            className={cn(
              'mt-3 text-caption font-medium',
              endsSoon ? 'text-danger' : 'text-ink-subtle',
            )}
          >
            {endsSoon ? 'Ends ' : 'Valid until '}
            {new Date(promotion.valid_until).toLocaleDateString(env.locale, {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        )}

        {promotion.cta_label && promotion.cta_href && (
          <a
            href={promotion.cta_href}
            {...(isExternal
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
            className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-ink hover:underline"
          >
            {promotion.cta_label}
            {isExternal && <ArrowUpRight size={14} aria-hidden />}
          </a>
        )}
      </div>
    </article>
  );
}
