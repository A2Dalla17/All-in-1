/**
 * Contact.
 *
 * The phone number leads, and it is a real tel: link rather than text to copy.
 * Most people reaching this page want a car now or have a problem with a
 * journey that already happened — neither is served by a contact form that
 * promises a reply within two working days.
 */

import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { Card } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';
import { env } from '@shared/config/env';

export function ContactPage() {
  return (
    <>
      <Container size="narrow" className="pt-16 text-center sm:pt-24">
        <h1 className="text-h1 text-ink">Talk to us</h1>
        <p className="mx-auto mt-4 max-w-prose text-body-lg text-ink-muted">
          The control room is staffed around the clock, every day of the year.
        </p>

        <a
          href={`tel:${env.controlCentre.tel}`}
          className="pressable mt-8 inline-flex h-16 items-center justify-center gap-3 rounded-pill brand-gradient px-9 text-h4 font-semibold text-white shadow-brand"
        >
          <Phone size={22} aria-hidden />
          {env.controlCentre.display}
        </a>
      </Container>

      <Section id="contact-details" title="Other ways to reach us">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card tone="flat">
            <div className="flex items-start gap-3.5">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink">
                <Mail size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">Email</p>
                <a
                  href={`mailto:${env.controlCentre.email}`}
                  className="mt-0.5 block break-words text-body-sm text-brand-ink hover:underline"
                >
                  {env.controlCentre.email}
                </a>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Best for receipts, lost property and account questions.
                </p>
              </div>
            </div>
          </Card>

          <Card tone="flat">
            <div className="flex items-start gap-3.5">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink">
                <Clock size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">Opening hours</p>
                <p className="mt-0.5 text-body-sm text-ink">{env.controlCentre.hours}</p>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Including bank holidays and Christmas Day.
                </p>
              </div>
            </div>
          </Card>

          <Card tone="flat" className="sm:col-span-2">
            <div className="flex items-start gap-3.5">
              <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink">
                <MapPin size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">Where we operate</p>
                <p className="mt-0.5 text-body-sm text-ink-muted">
                  Greater London and the surrounding counties, with airport runs
                  to Heathrow, Gatwick, Stansted, Luton and London City.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
