import { Clock, Headphones, Mail, MapPin, Phone } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { env } from '@/config/env';

/**
 * The control centre block.
 *
 * The PRD calls the control centre the heart of the ecosystem, and this is the
 * section that has to earn that on the page: a single very large call button,
 * with the supporting details beneath it rather than competing with it.
 *
 * The email is a mailto and the address is plain text — deliberately not a
 * map link, which would open a third-party app and lose the person mid-task.
 */
export function ControlCentre() {
  return (
    <section aria-labelledby="control-centre-heading">
      <Container className="py-20">
        <div className="edge-light relative overflow-hidden rounded-panel border border-line bg-card p-8 text-center shadow-card sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 50% 0%, rgb(165 12 12 / 0.07), transparent 60%)',
            }}
          />

          <div className="relative">
            <span
              aria-hidden
              className="mx-auto grid h-14 w-14 place-items-center rounded-tile bg-brand-soft text-brand-ink"
            >
              <Headphones size={26} />
            </span>

            <h2 id="control-centre-heading" className="mt-5 text-h1 text-ink">
              Control Centre
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-body-lg leading-relaxed text-ink-muted">
              Our operators book taxis, arrange school runs and sort out bookings on your behalf.
              No app, no account — just call and speak to somebody.
            </p>

            <a href={`tel:${env.controlCentre.tel}`} className="mt-9 inline-block">
              <Button variant="primary" size="xl" leadingIcon={<Phone size={20} />}>
                <span className="tabular">{env.controlCentre.display}</span>
              </Button>
            </a>

            <dl className="mx-auto mt-10 grid max-w-2xl gap-6 border-t border-line pt-8 sm:grid-cols-3">
              <div>
                <dt className="flex items-center justify-center gap-1.5 text-caption text-ink-subtle">
                  <Mail size={13} aria-hidden />
                  Email
                </dt>
                <dd className="mt-1.5">
                  <a
                    href={`mailto:${env.controlCentre.email}`}
                    className="break-all text-body-sm font-medium text-brand-ink hover:underline"
                  >
                    {env.controlCentre.email}
                  </a>
                </dd>
              </div>

              <div>
                <dt className="flex items-center justify-center gap-1.5 text-caption text-ink-subtle">
                  <Clock size={13} aria-hidden />
                  Opening hours
                </dt>
                <dd className="mt-1.5 text-body-sm font-medium text-ink">
                  {env.controlCentre.hours}
                </dd>
              </div>

              <div>
                <dt className="flex items-center justify-center gap-1.5 text-caption text-ink-subtle">
                  <MapPin size={13} aria-hidden />
                  Serving
                </dt>
                <dd className="mt-1.5 text-body-sm font-medium text-ink">
                  {env.company.city} and surrounding areas
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
