import { Clock, Headphones, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';

import { Card } from '@shared/components/ui/Card';
import { Section } from '@shared/components/ui/Section';

/**
 * Why choose ACT.
 *
 * The copy avoids numbers we cannot stand behind. "Under four minutes" or
 * "10,000 happy customers" would look more impressive and would be a claim the
 * company has to defend the first time someone waits twelve minutes. Every
 * line below describes a commitment rather than a statistic.
 */
const REASONS = [
  {
    icon: ShieldCheck,
    title: 'Professional drivers',
    body: 'Licensed, insured, and identifiable by a code you can check before you get into the car.',
  },
  {
    icon: Users,
    title: 'Trusted community',
    body: 'Built for the people who use it, by people who live and work in the same city.',
  },
  {
    icon: Star,
    title: 'Reliable service',
    body: 'Booked weeks ahead or hailed right now, the car turns up. That is the whole promise.',
  },
  {
    icon: Headphones,
    title: '24/7 support',
    body: 'A person on the phone at any hour — not a form that gets answered next week.',
  },
  {
    icon: Sparkles,
    title: 'Fast booking',
    body: 'Three taps in the app, or one call if you would rather somebody else did it for you.',
  },
  {
    icon: Clock,
    title: 'Book ahead',
    body: 'Airport runs and early starts can be arranged in advance and assigned to a named driver.',
  },
] as const;

export function WhyACT() {
  return (
    <Section
      id="why-act"
      tone="raised"
      eyebrow="Why choose ACT"
      title="Transport you can plan your day around"
      description="The things that matter when someone is waiting on a kerb, or a parent is waiting for a school bus."
    >
      <ul className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map(({ icon: Icon, title, body }) => (
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
  );
}
