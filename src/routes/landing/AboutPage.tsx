import { Link } from 'react-router-dom';
import { ArrowRight, Bike, HeartHandshake, Phone, Store, Target } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Card } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { Section } from '@shared/components/ui/Section';
import { env } from '@shared/config/env';
import { usePageMeta } from '@shared/lib/seo';

/**
 * About GALEYR.
 *
 * ── No invented history ────────────────────────────────────────────────────
 * The business is new. There is no founding date, no headcount, no "trusted by
 * thousands", and no restaurant logos — because there are no restaurant
 * partners yet, and a wall of logos nobody agreed to is the single fastest way
 * to lose the trust of the next owner who sees their competitor on it.
 *
 * Every claim here is either structurally true or an intention stated as one.
 * The page says outright that the service is being built. That reads as more
 * credible than the alternative, and it is the only version that survives being
 * checked.
 */
export function AboutPage() {
  usePageMeta(
    'About us',
    'GALEYR — food delivery in Mogadishu. Part of AC7 GROUP.',
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
          <h1 className="mt-4 text-h1 text-ink">Cunto la keeno, si fudud</h1>
          <p className="mt-5 text-body-lg leading-relaxed text-ink-muted">
            GALEYR delivers food across {env.market.city}. You order from a restaurant
            near you, a courier collects it, and you pay cash when it reaches your door.
          </p>
          <p className="mt-4 text-body leading-relaxed text-ink-muted">
            We are part of {env.company.name} —{' '}
            <span className="text-brand-ink">{env.company.meaning}</span>.
          </p>
        </Container>
      </section>

      {/* ── Said plainly, near the top ──
          Anyone can see the site has three restaurants called "Demo". Naming
          that before they work it out is the difference between a company that
          is early and a company that is pretending. */}
      <Container size="narrow" className="pt-12">
        <div className="rounded-card border border-warning/35 bg-warning-soft p-5 text-body-sm text-warning-ink">
          <p className="font-semibold">We are still being built</p>
          <p className="mt-1">
            GALEYR has not signed its first restaurant yet. Everything you can see on
            the site today is clearly labelled demo data, used to test that ordering,
            cooking, dispatch and delivery all work before a single real order is taken. We
            will not list a restaurant until they have agreed to work with us.
          </p>
        </div>
      </Container>

      <Section
        id="how-it-works"
        title="How it works"
        description="Four steps, and a person watching all of them."
      >
        <ol className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: '1', title: 'Dalbo', en: 'Order', body: 'Choose a restaurant and pick your food. No account needed.' },
            { n: '2', title: 'Karis', en: 'Cooked', body: 'The restaurant accepts and starts cooking straight away.' },
            { n: '3', title: 'Keenid', en: 'Delivered', body: 'A courier collects it and calls you when they are close.' },
            { n: '4', title: 'Bixi', en: 'Pay', body: 'Cash to the courier, once the food is in your hands.' },
          ].map((step) => (
            <li key={step.n} className="flex">
              <Card className="w-full">
                <span
                  aria-hidden
                  className="grid h-11 w-11 place-items-center rounded-tile bg-brand-soft text-h5 font-bold text-brand-ink"
                >
                  {step.n}
                </span>
                <h3 className="mt-4 text-h4 text-ink">{step.title}</h3>
                <p className="text-body-sm text-ink-subtle">{step.en}</p>
                <p className="mt-2 text-body-sm leading-relaxed text-ink-muted">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="principles"
        tone="raised"
        title="How we work"
        description="Three commitments that decide what happens when something goes wrong — which is when a delivery company is actually judged."
      >
        <ul className="stagger grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Phone,
              title: 'Somebody always answers',
              body: 'The control room is staffed and the number is on every page. If the website cannot fix it, a person will — including taking the whole order over the phone.',
            },
            {
              icon: HeartHandshake,
              title: 'You pay when the food arrives',
              body: 'Cash on delivery, always. Nothing leaves your pocket before the food is in your hands, so a late or missing order costs you nothing but time.',
            },
            {
              icon: Target,
              title: 'We would rather say no',
              body: 'If a restaurant cannot cook it or we cannot deliver it, we say so instead of accepting the order and letting somebody down at dinner time.',
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

      <Container className="py-20">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-panel border border-line bg-card p-8 shadow-card">
            <span
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
            >
              <Store size={22} />
            </span>
            <h2 className="mt-4 text-h3 text-ink">Run a restaurant?</h2>
            <p className="mt-3 text-body leading-relaxed text-ink-muted">
              Reach more of {env.market.city} without hiring a delivery team. Applying is a
              conversation, not a contract.
            </p>
            <Link to="/partners" className="mt-6 inline-block">
              <Button variant="primary" trailingIcon={<ArrowRight size={16} />}>
                Register your restaurant
              </Button>
            </Link>
          </div>

          <div className="rounded-panel border border-line bg-card p-8 shadow-card">
            <span
              aria-hidden
              className="grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
            >
              <Bike size={22} />
            </span>
            <h2 className="mt-4 text-h3 text-ink">Have a motorbike?</h2>
            <p className="mt-3 text-body leading-relaxed text-ink-muted">
              Work your own hours, get paid per delivery, and have a control room behind you
              when an address turns out to be wrong.
            </p>
            <Link to="/couriers" className="mt-6 inline-block">
              <Button variant="secondary" trailingIcon={<ArrowRight size={16} />}>
                Deliver with us
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href={`tel:${env.controlCentre.tel}`}>
            <Button variant="outline" size="lg" leadingIcon={<Phone size={17} />}>
              <span className="tabular">{env.controlCentre.display}</span>
            </Button>
          </a>
        </div>
      </Container>
    </>
  );
}
