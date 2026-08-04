/**
 * Driver recruitment.
 *
 * ── Why the requirements are listed before the benefits ───────────────────
 * A driver who cannot meet them finds out in ten seconds rather than after
 * filling in a form, and the control room does not spend a week processing
 * applications that were never going to pass. Leading with earnings and hiding
 * the licence requirement further down wastes everybody's time, theirs most.
 *
 * ── Why there is no online application form ───────────────────────────────
 * A driver account cannot be self-served: it needs a TfL private hire licence,
 * hire-and-reward insurance, an MOT, a vehicle licence, right-to-work documents
 * and proof of address, all verified by a person. The honest first step is a
 * phone call.
 */

import { BadgeCheck, CalendarClock, FileCheck2, PoundSterling, Users, Wrench } from 'lucide-react';

import { Card } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';
import { env } from '@shared/config/env';

const REQUIREMENTS = [
  'A current TfL private hire driver licence',
  'A licensed private hire vehicle, or access to one',
  'Hire and reward insurance',
  'A valid MOT and service history',
  'The right to work in the UK',
  'Three proofs of address from the last three months',
];

const BENEFITS = [
  {
    icon: PoundSterling,
    title: 'Paid weekly, no surprises',
    body: 'You see the fare before you accept the job. Earnings are paid weekly and every deduction is itemised.',
  },
  {
    icon: CalendarClock,
    title: 'Your own hours',
    body: 'Go online when it suits you and offline when it does not. No minimum shifts, no penalty for turning work down.',
  },
  {
    icon: Users,
    title: 'A real control room',
    body: 'Staffed 24 hours by people who answer the phone. If a job goes wrong at 3am, someone picks up.',
  },
  {
    icon: BadgeCheck,
    title: 'Your own driver code',
    body: 'Riders check it before they get in. It is how they know the right car arrived, and it is yours.',
  },
  {
    icon: Wrench,
    title: 'Compliance handled',
    body: 'We track your licence, insurance and MOT expiry dates and warn you before any of them lapse.',
  },
  {
    icon: FileCheck2,
    title: 'Steady, booked work',
    body: 'Airport runs, school contracts and account customers — journeys that are booked days ahead, not just what walks past.',
  },
];

export function DriversPage() {
  return (
    <>
      <Container size="narrow" className="pt-16 text-center sm:pt-24">
        <p className="text-caption font-semibold uppercase tracking-wide text-brand-ink">
          Drive with AC7
        </p>
        <h1 className="mt-3 text-h1 text-ink">Licensed drivers, steady work</h1>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-ink-muted">
          AC7 is a London firm run by people who have done the job. Fares you
          can see before you accept, hours you choose, and a control room that
          answers.
        </p>

        <a
          href={`tel:${env.controlCentre.tel}`}
          className="pressable mt-8 inline-flex h-14 items-center justify-center gap-2.5 rounded-pill brand-gradient px-8 text-body font-semibold text-white shadow-brand"
        >
          Speak to the control room — {env.controlCentre.display}
        </a>
      </Container>

      <Section
        id="driver-requirements"
        title="What you need before you apply"
        description="If you are missing any of these, we cannot put you on the road — it is the law, not our policy. Better to know now."
      >
        <Card tone="flat">
          <ul className="grid gap-3 sm:grid-cols-2">
            {REQUIREMENTS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <FileCheck2 size={18} className="mt-0.5 shrink-0 text-brand-ink" aria-hidden />
                <span className="text-body text-ink">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <p className="mt-4 text-body-sm text-ink-muted">
          Riding a motorbike or bicycle for deliveries? The vehicle requirements
          differ — a bicycle has no number plate or MOT. Ring and ask.
        </p>
      </Section>

      <Section id="driver-benefits" tone="raised" title="What you get">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((item) => (
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
      </Section>

      <Section
        id="driver-apply"
        title="How to join"
        description="Four steps. Most drivers are on the road within a week of the first call."
      >
        <ol className="space-y-4">
          {[
            ['Ring the control room', 'A five-minute conversation about your licence, your vehicle and the hours you want.'],
            ['Send your documents', 'Licence, insurance, MOT, right to work and proof of address. Photographs from your phone are fine.'],
            ['We verify them', 'Usually two to three working days. We check the licence is current and the insurance covers hire and reward.'],
            ['Collect your code and go online', 'Your driver code is issued with your account. From then on, you choose when you work.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-body font-bold text-brand-ink"
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-1">
                <h3 className="text-body font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-body text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
