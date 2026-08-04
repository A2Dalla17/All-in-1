import { Link } from 'react-router-dom';
import { ArrowRight, Building2, HeartHandshake, Phone, Target } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Card } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';
import { env } from '@shared/config/env';
import { SERVICES } from '@shared/config/navigation';
import { usePageMeta } from '@shared/lib/seo';

/**
 * About Us.
 *
 * Written without invented history. The company is new, so there are no
 * founding dates, no headcount and no "since 2009" — every claim here is
 * either structurally true (what the group does, how it is organised) or a
 * stated intention clearly framed as one.
 */
export function AboutPage() {
  usePageMeta(
    'About us',
    'AC7 GROUP — Aragti Cad. A London transport group operating taxi, school runs and local booking services under one control centre.',
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
            About us
          </p>
          <h1 className="mt-4 text-h1 text-ink">
            One group, one number, every journey
          </h1>
          <p className="mt-5 text-body-lg leading-relaxed text-ink-muted">
            {env.company.name} — <span className="text-brand-ink">{env.company.meaning}</span> —
            brings taxi, school transport and local bookings together under a single control
            centre, so there is always one place to call and one team accountable.
          </p>
        </Container>
      </section>

      {/* What we do */}
      <Section
        id="what-we-do"
        title="What we run"
        description="Each service is a separate operation with its own drivers, rules and dashboards. They share a control centre, not a codebase compromise."
      >
        <ul className="stagger grid gap-4 sm:grid-cols-2">
          {SERVICES.map((service) => {
            const { icon: Icon } = service;
            return (
              <li key={service.id} className="flex">
                <Card className="w-full">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
                    >
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-h4 text-ink">
                        {service.label}
                        {service.comingSoon && (
                          <span className="ml-2 align-middle text-micro font-semibold text-ink-subtle">
                            Coming soon
                          </span>
                        )}
                      </h3>
                      <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Principles */}
      <Section
        id="principles"
        tone="raised"
        title="How we work"
        description="Three commitments that decide how the business is run when something goes wrong."
      >
        <ul className="stagger grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Phone,
              title: 'Somebody always answers',
              body: 'The control centre is staffed around the clock. If the app cannot do it, a person will — including taking the whole booking over the phone.',
            },
            {
              icon: HeartHandshake,
              title: 'Drivers are accountable, not anonymous',
              body: 'Every driver carries a permanent code. Anyone can check it before getting in and see exactly who is driving them.',
            },
            {
              icon: Target,
              title: 'We would rather say no',
              body: 'If we cannot cover a route properly we say so, rather than accepting the work and letting somebody down on the morning it matters.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex">
              <Card className="w-full">
                <span
                  aria-hidden
                  className="grid h-11 w-11 place-items-center rounded-tile bg-brand-soft text-brand-ink"
                >
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-h4 text-ink">{title}</h3>
                <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">{body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      {/* Work with us */}
      <Container className="py-20">
        <div className="rounded-panel border border-line bg-card p-8 text-center shadow-card sm:p-12">
          <span
            aria-hidden
            className="mx-auto grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
          >
            <Building2 size={22} />
          </span>
          <h2 className="mt-4 text-h1 text-ink">Councils, schools and businesses</h2>
          <p className="mx-auto mt-4 max-w-xl text-body leading-relaxed text-ink-muted">
            We take on contracted school routes and corporate accounts. Talk to the control
            centre and we will put you through to the right person.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`tel:${env.controlCentre.tel}`}>
              <Button variant="primary" size="lg" leadingIcon={<Phone size={17} />}>
                <span className="tabular">{env.controlCentre.display}</span>
              </Button>
            </a>
            <Link to="/school-runs">
              <Button variant="secondary" size="lg" trailingIcon={<ArrowRight size={16} />}>
                School Runs portal
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
