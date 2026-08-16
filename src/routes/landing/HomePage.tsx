import { ControlCentre } from '@/components/marketing/ControlCentre';
import { Hero } from '@/components/marketing/Hero';
import { CategoryStrip } from '@/components/delivery/CategoryStrip';
import { ServiceCards } from '@/components/marketing/ServiceCards';
import { WhyACT } from '@/components/marketing/WhyACT';
import { usePageMeta } from '@shared/lib/seo';

/**
 * The hub.
 *
 * Composition only — every section owns its own data and layout. That is what
 * makes adding a section, or reordering them for a campaign, a one-line change
 * rather than an edit inside a thousand-line component.
 *
 * ── Why the billboard sits third ───────────────────────────────────────────
 * Ordering is the job of this page, so the hero and the three ways in come
 * first. Community Advertising follows immediately — high enough that an
 * advertiser is genuinely buying attention rather than the bottom of a scroll,
 * but not so high that it stands between a hungry customer and the food.
 *
 * It used to live inside the hero. That framing made paid placement look like
 * decoration; as a section of its own it reads as what it is.
 */
export function HomePage() {
  usePageMeta(
    'Everything you need, delivered',
    'GALEYR delivers across Mogadishu — restaurants, supermarkets, pharmacies, ' +
      'shops and warehouses. Pay the courier in cash on delivery, and track your ' +
      'order. Powered by AC7 Group.',
  );

  return (
    <>
      <Hero />
      {/* Directly under the hero, ahead of everything else. A visitor who
          reads "delivery" assumes food; if they are not corrected within a
          few seconds they file Galeyr as another food app and leave. */}
      <CategoryStrip />
      <ServiceCards />
      {/* ── Community Advertising has moved to the customer app ──
          It is paid inventory, and it belongs in front of people who are
          about to order rather than people reading a marketing page. It is
          still managed from the Control Centre; only where it renders changed.
          `CommunityShowcase` remains in the repository, unused, so nothing is
          lost if it is ever wanted back here. */}
      <WhyACT />
      <ControlCentre />
    </>
  );
}
