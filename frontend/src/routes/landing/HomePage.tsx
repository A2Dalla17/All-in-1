import { ControlCentre } from '@/components/marketing/ControlCentre';
import { Hero } from '@/components/marketing/Hero';
import { ServiceCards } from '@/components/marketing/ServiceCards';
import { WhyACT } from '@/components/marketing/WhyACT';
import { usePageMeta } from '@/lib/seo';

/**
 * The hub.
 *
 * Composition only — every section owns its own data and layout. That is what
 * makes adding a sixth section, or reordering them for a campaign, a one-line
 * change rather than an edit inside a thousand-line component.
 *
 * The advertising billboard is not listed here: it lives inside the hero,
 * between the tagline and the buttons, because it is part of that first
 * screenful rather than a section following it.
 */
export function HomePage() {
  usePageMeta(
    'Transport, school runs and bookings in London',
    'ACT (AC7 Transport) by AC7 GROUP. Licensed private hire, school run contracts and local bookings across London, with a 24/7 control centre answered by a person.',
  );

  return (
    <>
      <Hero />
      <ServiceCards />
      <WhyACT />
      <ControlCentre />
    </>
  );
}
