/**
 * Pricing.
 *
 * ── Why there is no fare table ────────────────────────────────────────────
 * Publishing per-mile rates on a marketing page invites the one comparison
 * that never goes well: a rate card read out of context against a competitor's
 * headline number, with neither minimum fare nor waiting time in view.
 *
 * What people actually want to know is whether the price will change after
 * they have committed. So this page explains how the fare is built and what
 * does and does not move it — and sends them to the app for the real number
 * on their real journey.
 */

import { Check, Clock, Info, Receipt } from 'lucide-react';

import { Card } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';
import { env } from '@shared/config/env';

import { StoreButtons } from '@/components/marketing/StoreButtons';

const INCLUDED = [
  'The price you are quoted before you confirm',
  'A licensed driver and a licensed, insured vehicle',
  'Flight tracking on airport pickups',
  'A receipt for every journey',
  'No charge for traffic on the agreed route',
];

const CHANGES = [
  {
    title: 'A change to the journey',
    body: 'A new destination or an extra stop is a different journey, so it is a different price. You are told before it is applied.',
  },
  {
    title: 'Waiting beyond the free period',
    body: 'Every booking includes free waiting time. Beyond that the driver is being paid to sit still, and it is charged by the minute.',
  },
  {
    title: 'Busy periods',
    body: 'On New Year\'s Eve and during severe weather, fares rise so that enough drivers are on the road to answer the demand. You always see the price first.',
  },
];

export function PricingPage() {
  return (
    <>
      <Container size="narrow" className="pt-16 text-center sm:pt-24">
        <h1 className="text-h1 text-ink">Know the price before you go</h1>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-ink-muted">
          No meter, no guessing. The fare appears before you confirm and does
          not move because the traffic did.
        </p>
      </Container>

      <Section id="pricing-how" title="How a fare is worked out">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Receipt,
              title: 'A starting charge',
              body: 'Covers dispatch and getting a car to you. Fixed, and the same whatever the weather.',
            },
            {
              icon: Info,
              title: 'The distance',
              body: 'Measured on the actual driving route, not a straight line across the river.',
            },
            {
              icon: Clock,
              title: 'The time',
              body: 'Because a driver held up in traffic is still working. Charging distance alone would mean nobody accepts those jobs.',
            },
          ].map((item) => (
            <Card key={item.title} tone="flat">
              <span
                aria-hidden
                className="grid h-11 w-11 place-items-center rounded-tile bg-brand-soft text-brand-ink"
              >
                <item.icon size={20} />
              </span>
              <h2 className="mt-4 text-h4 text-ink">{item.title}</h2>
              <p className="mt-2 text-body text-ink-muted">{item.body}</p>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-body-sm text-ink-muted">
          Short journeys have a minimum fare. A half-mile run still costs the
          driver the approach, the wait and the fuel, and without a minimum
          nobody would accept one — which would leave you without a car at all.
        </p>
      </Section>

      <Section id="pricing-included" tone="raised" title="Always included">
        <ul className="grid gap-3 sm:grid-cols-2">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden />
              <span className="text-body text-ink">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="pricing-changes"
        title="What can change the price"
        description="Three things, and you are told about all of them before they apply."
      >
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
          {CHANGES.map((item) => (
            <div key={item.title} className="bg-card p-5">
              <h3 className="text-body font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-body text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="pricing-quote"
        tone="raised"
        title="Get a price for your journey"
        description={`Enter where you are going in the app, or ring the control room on ${env.controlCentre.display}.`}
      >
        <StoreButtons />
      </Section>
    </>
  );
}
