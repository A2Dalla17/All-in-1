/**
 * Questions people actually ask.
 *
 * ── Written to answer, not to reassure ─────────────────────────────────────
 * Every entry here is a real objection to ordering food from a company nobody
 * has heard of yet: can I trust you with my money, what if it does not come,
 * who do I shout at. Answering those honestly — including "we are new, and here
 * is our phone number" — is worth more than a page of promises.
 *
 * The awkward ones are included on purpose. A FAQ that only asks itself easy
 * questions is marketing, and readers can tell.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

interface Faq {
  question: string;
  questionSo?: string;
  answer: string;
}

const SECTIONS: { title: string; faqs: Faq[] }[] = [
  {
    title: 'Ordering',
    faqs: [
      {
        question: 'Do I need an account?',
        questionSo: 'Ma u baahanahay akoon?',
        answer:
          'No. You choose your food, give a name, a phone number and where you are, and that is it. Keep your order number — it and your phone number are how you find the order again.',
      },
      {
        question: 'How do I pay?',
        questionSo: 'Sidee baan u bixiyaa?',
        answer:
          'Cash, to the courier, when the food arrives. You pay nothing before it reaches you. Card and mobile money are not connected yet, and we would rather leave them off than offer a payment method that fails.',
      },
      {
        question: 'How long does delivery take?',
        answer:
          'Usually 30 to 45 minutes. Each restaurant shows its own preparation time before you order, and how long the courier takes depends on how far you are.',
      },
      {
        question: 'Why can I only order from one restaurant at a time?',
        answer:
          'One order is one courier making one journey to one kitchen. Two restaurants would mean two pickups, two waits and two delivery fees — a different service, not a longer list.',
      },
      {
        question: 'Is there a minimum order?',
        answer:
          'Each restaurant sets its own, and it is shown on their page and in your basket before you check out.',
      },
    ],
  },
  {
    title: 'Delivery and address',
    faqs: [
      {
        question: 'Why do you ask for a landmark instead of an address?',
        questionSo: 'Maxaad ii weydiineysaa calaamad?',
        answer:
          'Because that is how Mogadishu works. There are no postcodes and most streets are not signed, so a courier finds you by district, then by something they recognise, then by calling you. A street address would be a worse answer, not a better one.',
      },
      {
        question: 'What if the courier cannot find me?',
        answer:
          'They will call the number you gave. Keep your phone nearby. If they still cannot reach you, our control room will ring you.',
      },
      {
        question: 'Which parts of Mogadishu do you deliver to?',
        answer:
          'The districts each restaurant covers. When you choose your district at checkout you will only see restaurants that can reach you.',
      },
    ],
  },
  {
    title: 'When something goes wrong',
    faqs: [
      {
        question: 'My order is late. What do I do?',
        answer: `Track it first — it will show you exactly which stage it is at. If it looks stuck, call the control room on ${env.controlCentre.display}. A person answers.`,
      },
      {
        question: 'The food is wrong or missing.',
        answer: `Call us on ${env.controlCentre.display} while the courier is still with you if you can. We will sort it out with the restaurant.`,
      },
      {
        question: 'Can I cancel?',
        answer:
          'Call the control room. If the restaurant has not started cooking, cancelling is straightforward. Once the food is being made it is harder, because someone has already paid for the ingredients.',
      },
      {
        question: 'A restaurant cancelled my order. Am I charged?',
        answer:
          'No. You pay on delivery, so if nothing arrives you pay nothing. The reason the restaurant gave will be shown when you track the order.',
      },
    ],
  },
  {
    title: 'About GALEYR',
    faqs: [
      {
        // The question a careful person asks, so it is answered rather than avoided.
        question: 'You are new. Why should I trust you?',
        answer:
          'You should not have to, and the way we are set up means you do not: you pay nothing until food is in your hands, and there is a phone number on every page with a person behind it. Judge us on the first order.',
      },
      {
        question: 'Are these real restaurants?',
        answer:
          'Not yet. Everything on the site today is clearly labelled demo data while we build and test. We will not put a restaurant on here until they have agreed to work with us — listing a business that never said yes would be dishonest.',
      },
      {
        question: 'I run a restaurant. How do I join?',
        questionSo: 'Makhaayad ma leeyahay. Sidee baan idiinku biiraa?',
        answer:
          'Send us an application from the Partner page. It is not a contract — we call you, talk it through, and nothing of yours goes on the site until you have agreed.',
      },
      {
        question: 'I want to deliver for you.',
        answer: `Call the control room on ${env.controlCentre.display}. We check identification in person rather than through a form.`,
      },
      {
        question: 'What happened to the taxi service?',
        answer:
          'AC7 GROUP still runs it. GALEYR is focused on food delivery in Mogadishu, and doing one thing properly comes before doing two things halfway.',
      },
    ],
  },
];

export function FaqPage() {
  return (
    <Container className="py-8 sm:py-12" size="narrow">
      <h1 className="text-h2 font-extrabold tracking-tight text-ink">
        Su'aalaha badanaa la weydiiyo
      </h1>
      <p className="mt-2 text-body-lg text-ink-muted">
        Common questions about ordering with GALEYR.
      </p>

      <div className="mt-10 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-h4 font-bold text-ink">{section.title}</h2>

            <div className="mt-4 divide-y divide-line rounded-card border border-line bg-card">
              {section.faqs.map((faq) => (
                <FaqRow key={faq.question} faq={faq} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-card border border-line bg-surface p-6 text-center">
        <p className="font-semibold text-ink">Still stuck?</p>
        <p className="mt-1 text-body-sm text-ink-muted">
          The control room is open {env.controlCentre.hours.toLowerCase()}.
        </p>
        <a
          href={`tel:${env.controlCentre.tel}`}
          className="mt-3 inline-block text-h5 font-bold text-brand-ink"
        >
          {env.controlCentre.display}
        </a>
        <p className="mt-4 text-body-sm text-ink-muted">
          Or{' '}
          <Link to="/contact" className="font-semibold text-brand-ink">
            send us a message
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}

function FaqRow({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <span>
          <span className="font-semibold text-ink">{faq.question}</span>
          {faq.questionSo && (
            <span className="mt-0.5 block text-body-sm text-ink-subtle">
              {faq.questionSo}
            </span>
          )}
        </span>

        <ChevronDown
          size={18}
          aria-hidden
          className={cn(
            'mt-0.5 shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && <p className="px-5 pb-5 text-body text-ink-muted">{faq.answer}</p>}
    </div>
  );
}
