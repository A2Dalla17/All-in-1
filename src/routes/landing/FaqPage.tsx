/**
 * Frequently asked questions.
 *
 * ── Why <details> and not a JavaScript accordion ──────────────────────────
 * The native element is keyboard operable, announced correctly by screen
 * readers, works before JavaScript loads, and — the part people forget — its
 * contents are found by the browser's own Ctrl+F. A custom accordion hides
 * text from search until the right panel happens to be open.
 */

import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';
import { env } from '@shared/config/env';

interface Faq {
  q: string;
  a: string;
}

const GROUPS: { heading: string; items: Faq[] }[] = [
  {
    heading: 'Booking',
    items: [
      {
        q: 'How do I book a car?',
        a: 'Through the app, or by ringing the control room on ' +
          env.controlCentre.display +
          '. The line is open 24 hours a day, every day of the year.',
      },
      {
        q: 'Can I book in advance?',
        a: 'Yes. Journeys can be booked days or weeks ahead, which is what most people do for early airport runs. You will be reminded before the driver sets off.',
      },
      {
        q: 'How far ahead should I book an airport run?',
        a: 'The evening before is usually enough. For flights before 6am, book the day before so a driver is allocated rather than found at short notice.',
      },
    ],
  },
  {
    heading: 'Fares',
    items: [
      {
        q: 'How is the fare worked out?',
        a: 'From the distance and the expected journey time, plus a fixed starting charge. You see the price before you confirm — there is no meter running and no surprise at the end.',
      },
      {
        q: 'Is the quoted price what I pay?',
        a: 'Yes, unless the journey itself changes — a new destination, an extra stop, or a long wait. Traffic on the agreed route does not change the price.',
      },
      {
        q: 'How do I pay?',
        a: 'Card in the app, or cash directly to the driver. Account customers are invoiced monthly.',
      },
    ],
  },
  {
    heading: 'Drivers and safety',
    items: [
      {
        q: 'Are your drivers licensed?',
        a: 'Every driver holds a private hire licence, and every vehicle is licensed and insured for hire and reward. We check licences, insurance, MOT and right to work before a driver takes a single job, and we re-check them as they expire.',
      },
      {
        q: 'How do I know I am getting into the right car?',
        a: 'Every driver has an AC7 code. You are given the code, the registration and the driver name before the car arrives, and you can look up any code on this website without signing in.',
      },
      {
        q: 'What if I leave something in the car?',
        a: 'Ring the control room as soon as you notice. We know which driver did your journey and can usually reunite you with it the same day.',
      },
    ],
  },
  {
    heading: 'Accounts',
    items: [
      {
        q: 'Do you do business accounts?',
        a: 'Yes. Monthly invoicing, named passengers, cost centres and a statement you can hand to your accountant. Ring the control room to set one up.',
      },
      {
        q: 'Can I get a receipt?',
        a: 'A receipt is issued for every journey and kept in your ride history in the app. Email the control room if you need one re-sent.',
      },
    ],
  },
];

export function FaqPage() {
  return (
    <>
      <Container size="narrow" className="pt-16 text-center sm:pt-24">
        <h1 className="text-h1 text-ink">Questions, answered</h1>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-ink-muted">
          If yours is not here, the control room will answer it on the phone in
          less time than it takes to read this page.
        </p>
      </Container>

      {GROUPS.map((group) => (
        <Section key={group.heading} id={`faq-${group.heading.toLowerCase()}`} title={group.heading}>
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
            {group.items.map((item) => (
              <details key={item.q} className="group bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-body font-medium text-ink transition-colors hover:bg-surface">
                  {item.q}
                  <span
                    aria-hidden
                    className="shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-body text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
