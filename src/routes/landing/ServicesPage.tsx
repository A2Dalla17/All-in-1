/**
 * Services.
 *
 * What AC7 actually does, in the order people ask for it. Airports first,
 * because airport runs are the majority of a London firm's booked-ahead work
 * and the reason most people find the site in the first place.
 */

import { Briefcase, GraduationCap, PackageCheck, Plane, ShoppingBag, Users } from 'lucide-react';

import { Card } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';

import { StoreButtons } from '@/components/marketing/StoreButtons';

const SERVICES = [
  {
    icon: Plane,
    title: 'Airport transfers',
    body:
      'Heathrow, Gatwick, Stansted, Luton and London City. We track the flight, ' +
      'so a delayed landing does not mean a missed car or a waiting charge for ' +
      'time you were still in the air.',
  },
  {
    icon: Users,
    title: 'Everyday journeys',
    body:
      'Across London, at any hour. Saloon, estate or six-seat MPV depending on ' +
      'how many of you there are and how much you are carrying.',
  },
  {
    icon: Briefcase,
    title: 'Business accounts',
    body:
      'Monthly invoicing, named passengers and cost centres, with a statement ' +
      'your accountant can actually reconcile. No one expensing cash receipts.',
  },
  {
    icon: GraduationCap,
    title: 'School runs',
    body:
      'The same vetted driver each day, so the child is not meeting a stranger ' +
      'every morning. Enhanced checks on every driver on this service.',
  },
  {
    icon: PackageCheck,
    title: 'Courier and parcels',
    body:
      'Documents and packages across London, same day, with the collection and ' +
      'delivery both timed and recorded.',
  },
  {
    icon: ShoppingBag,
    title: 'AC7 Deliveries',
    body:
      'Food, shops and community delivery. In development — the control room ' +
      'can tell you when it reaches your area.',
    comingSoon: true,
  },
];

export function ServicesPage() {
  return (
    <>
      <Container size="narrow" className="pt-16 text-center sm:pt-24">
        <h1 className="text-h1 text-ink">What we do</h1>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-ink-muted">
          Licensed minicabs across London and the surrounding counties, booked
          in the app or by phone.
        </p>
      </Container>

      <Section id="services">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <Card
              key={service.title}
              tone="flat"
              className={service.comingSoon ? 'opacity-75' : undefined}
            >
              <span
                aria-hidden
                className="grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
              >
                <service.icon size={22} />
              </span>
              <h2 className="mt-4 flex flex-wrap items-center gap-2 text-h4 text-ink">
                {service.title}
                {service.comingSoon && (
                  <span className="rounded-pill bg-surface px-2.5 py-0.5 text-micro font-medium text-ink-subtle">
                    Coming soon
                  </span>
                )}
              </h2>
              <p className="mt-2 text-body text-ink-muted">{service.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        id="services-download"
        tone="raised"
        title="Book in a few taps"
        description="Fare shown before you confirm, driver details before the car arrives."
      >
        <StoreButtons />
      </Section>
    </>
  );
}
