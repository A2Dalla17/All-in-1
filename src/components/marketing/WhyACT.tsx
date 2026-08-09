/**
 * How ordering works, in four steps.
 *
 * ── Why a how-it-works and not a features list ─────────────────────────────
 * Food delivery is new to most people in Mogadishu. The objection is not "is
 * this better than the alternative" — it is "what actually happens if I do
 * this, and do I have to pay a stranger before I get my food". Four steps
 * answer that. A list of features would not.
 */

import { ClipboardList, CookingPot, Bike, HandCoins } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Dalbo',
    en: 'Order',
    body: 'Pick a restaurant, choose your food, and tell us your district and a landmark. No account needed.',
  },
  {
    icon: CookingPot,
    title: 'Karis',
    en: 'They cook',
    body: 'The restaurant accepts and starts cooking. You can watch the status change on the tracking page.',
  },
  {
    icon: Bike,
    title: 'Keenid',
    en: 'We deliver',
    body: 'A Galeyr courier collects it and brings it to you. They ring when they are close.',
  },
  {
    icon: HandCoins,
    title: 'Bixi',
    en: 'Pay on arrival',
    body: 'Pay the courier in cash when the food is in your hands. Nothing up front.',
  },
];

export function WhyACT() {
  return (
    <section id="how-it-works" className="bg-surface py-16 sm:py-20">
      <Container>
        <p className="text-caption font-semibold uppercase tracking-wide text-brand-ink">
          Sidee u shaqeysaa
        </p>
        <h2 className="mt-2 text-h2 text-ink">How it works</h2>
        <p className="mt-3 max-w-prose text-body-lg text-ink-muted">
          Four steps, and you only pay when the food reaches you.
        </p>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
                >
                  <step.icon size={20} />
                </span>
                <span
                  aria-hidden
                  className="text-h2 font-extrabold leading-none text-line-strong"
                >
                  {i + 1}
                </span>
              </div>

              <h3 className="mt-4 text-h4 text-ink">{step.title}</h3>
              <p className="text-body-sm font-medium text-ink-subtle">{step.en}</p>
              <p className="mt-2 text-body text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
