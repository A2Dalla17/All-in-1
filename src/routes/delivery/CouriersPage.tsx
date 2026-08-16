/**
 * "Deliver with GALEYR" — the courier page.
 *
 * ── The form exists now, and the phone number stays ───────────────────────
 * This page used to offer only a phone number, because there was no review
 * process behind an application and a form that dropped names into a queue
 * nobody read would have been worse — an applicant waiting for a call that was
 * never coming.
 *
 * That process now exists: applications land in the Control Centre, are
 * reviewed, carry a background-check workflow and are approved against a staff
 * code. So the form is real.
 *
 * The phone number stays alongside it. Plenty of people who would make good
 * couriers would rather talk to a person than fill in twelve fields on a
 * phone, and turning them away to save a button would be a poor trade.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, Clock, Headphones, MessageCircle, Phone } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';

const REASONS = [
  {
    icon: Clock,
    title: 'Your own hours',
    titleSo: 'Saacadahaaga',
    text: 'Work when it suits you. There is no shift you have to sign up for.',
  },
  {
    icon: Banknote,
    title: 'Paid per delivery',
    titleSo: 'Lacag keeni kasta',
    text: 'You know what a job pays before you accept it.',
  },
  {
    icon: Headphones,
    title: 'A control room behind you',
    titleSo: 'Xarun ku taageerta',
    text: 'When an address is wrong or a customer will not answer, someone picks up.',
  },
];

export function CouriersPage() {
  /* wa.me expects digits only — no plus, no spaces. */
  const whatsapp = env.controlCentre.tel.replace(/\D/g, '');

  return (
    <Container className="py-8 sm:py-12" size="narrow">
      <h1 className="text-h2 font-extrabold tracking-tight text-ink">
        Nala shaqee — deliver with GALEYR
      </h1>
      <p className="mt-2 text-body-lg text-ink-muted">
        Have a motorbike and know Mogadishu? We are looking for couriers.
      </p>

      <ul className="mt-8 space-y-4">
        {REASONS.map((reason) => (
          <li
            key={reason.title}
            className="flex items-start gap-4 rounded-card border border-line bg-card p-5"
          >
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
            >
              <reason.icon size={20} />
            </span>
            <div>
              <p className="font-semibold text-ink">{reason.title}</p>
              <p className="text-body-sm text-ink-subtle">{reason.titleSo}</p>
              <p className="mt-1.5 text-body-sm text-ink-muted">{reason.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-card border border-line bg-surface p-6">
        <h2 className="text-h5 font-bold text-ink">What you need</h2>
        <ul className="mt-3 space-y-2 text-body-sm text-ink-muted">
          <li>· A motorbike or bicycle you can use for work</li>
          <li>· A phone that can receive calls and WhatsApp</li>
          <li>· Good knowledge of the districts you want to work in</li>
          <li>· Somali identification we can check</li>
        </ul>
      </section>

      {/* ── Applying ──
          Deliberately a conversation, not a form. See the note at the top. */}
      <section className="mt-8 rounded-card brand-gradient p-6 text-white">
        <h2 className="text-h5 font-bold">Ready to start?</h2>
        <p className="mt-2 text-body-sm text-white/85">
          Send an application, or call us. Either way we check your documents in person
          before you start.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link to="/couriers/apply" className="flex-1">
            <Button variant="inverse" size="lg" fullWidth trailingIcon={<ArrowRight size={17} />}>
              Apply now
            </Button>
          </Link>

          <a href={`tel:${env.controlCentre.tel}`} className="flex-1">
            <Button
              variant="outline"
              size="lg"
              fullWidth
              className="border-white/40 text-white hover:bg-white/10"
              leadingIcon={<Phone size={17} />}
            >
              {env.controlCentre.display}
            </Button>
          </a>

          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button
              variant="outline"
              size="lg"
              fullWidth
              className="border-white/40 text-white hover:bg-white/10"
              leadingIcon={<MessageCircle size={17} />}
            >
              WhatsApp
            </Button>
          </a>
        </div>

        <p className="mt-4 text-caption text-white/70">{env.controlCentre.hours}</p>
      </section>

      <p className="mt-8 text-center text-body-sm text-ink-muted">
        Run a restaurant instead?{' '}
        <Link to="/partners" className="font-semibold text-brand-ink">
          Become Our Partner
        </Link>
      </p>
    </Container>
  );
}
