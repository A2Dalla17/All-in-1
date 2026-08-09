/**
 * Support, and complaints.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * The phone number comes first, and that is not laziness
 * ══════════════════════════════════════════════════════════════════════════
 * A customer whose food is forty minutes late does not want a form. They want a
 * person, now, and GALEYR's whole promise is that somebody answers. So the
 * number is the largest thing on this page and the form is underneath it, for
 * the cases where writing it down is genuinely better — a missing item that
 * needs a photograph, or something at 3am the caller would rather not repeat.
 *
 * ── Both routes land in the same queue ─────────────────────────────────────
 * The form writes to `galeyr_requests` through `galeyr_submit_customer_request`,
 * which is the queue the Control Centre already works from. A separate
 * complaints inbox would be a second place for somebody to forget to look.
 *
 * ── Why an RPC and not an insert policy ────────────────────────────────────
 * An anonymous INSERT policy on that table would let anyone set the priority,
 * the channel and the assigned staff member. The function fixes those: the
 * public can describe a problem, and triage stays with the people doing it.
 */

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Check, MessageSquareWarning, Phone } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Input, Textarea } from '@shared/components/ui/Input';
import { submitCustomerRequest, type RequestKind } from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

/** The things that actually go wrong, so nobody has to invent a category. */
const TOPICS = [
  'My order is late',
  'An item is missing',
  'I was sent the wrong item',
  'The food arrived cold',
  'A problem with the courier',
  'A problem with the amount I was charged',
  'I want to cancel an order',
  'Something else',
];

export function DeliverySupportPage({ mode }: { mode: 'support' | 'complaint' }) {
  const isComplaint = mode === 'complaint';

  const [topic, setTopic] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState('');
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: {
      kind: RequestKind;
      subject: string;
      detail: string;
      contactName: string;
      contactPhone: string;
      orderNumber: string;
    }) => submitCustomerRequest(input),
  });

  const phoneValid = phone.replace(/\D/g, '').length >= 9;
  const valid = topic.length > 0 && phoneValid;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;

    mutation.mutate({
      kind: isComplaint ? 'complaint' : 'customer_support',
      subject: topic,
      detail,
      contactName: name,
      contactPhone: phone,
      orderNumber,
    });
  }

  if (mutation.isSuccess) {
    return (
      <div className="rounded-card border border-line bg-card p-8 text-center">
        <span
          aria-hidden
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success-ink"
        >
          <Check size={26} />
        </span>

        <h2 className="mt-5 text-h4 font-bold text-ink">
          {isComplaint ? 'Your complaint has been received' : 'We have your message'}
        </h2>

        <p className="mt-2 text-body-sm text-ink-muted">Your reference is</p>
        <p className="mt-1 select-all font-mono text-h4 font-extrabold text-ink">
          {mutation.data}
        </p>

        <p className="mx-auto mt-4 max-w-sm text-body-sm text-ink-muted">
          The Control Centre will call you on the number you gave. Keep this reference —
          quote it if you ring us first.
        </p>

        <a href={`tel:${env.controlCentre.tel}`} className="mt-6 inline-block">
          <Button variant="outline" leadingIcon={<Phone size={16} />}>
            {env.controlCentre.display}
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* ── Call us ── */}
      <section className="rounded-card brand-gradient p-6 text-white sm:p-8">
        <h2 className="text-h4 font-bold">
          {isComplaint ? 'Serious problem? Ring us.' : 'The fastest way is to call'}
        </h2>
        <p className="mt-2 max-w-lg text-body-sm text-white/85">
          The Control Centre is open {env.controlCentre.hours.toLowerCase()}. A person
          answers, and they can see your order while you are on the phone.
        </p>

        <a href={`tel:${env.controlCentre.tel}`} className="mt-5 inline-block">
          <Button variant="inverse" size="lg" leadingIcon={<Phone size={17} />}>
            {env.controlCentre.display}
          </Button>
        </a>
      </section>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-h5 font-bold text-ink">
          {isComplaint && <MessageSquareWarning size={19} aria-hidden className="text-brand-ink" />}
          {isComplaint ? 'Or make a complaint in writing' : 'Or send us a message'}
        </h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          {isComplaint
            ? 'This goes straight to the Control Centre and is tracked until it is resolved.'
            : 'We will call you back on the number you give.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <fieldset>
            <legend className="mb-2 text-body-sm font-semibold text-ink">
              What has happened?
            </legend>

            <div className="flex flex-wrap gap-2">
              {TOPICS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={topic === option}
                  onClick={() => setTopic(option)}
                  className={cn(
                    'rounded-pill border px-3.5 py-2 text-body-sm font-medium transition-colors',
                    topic === option
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-card text-ink-muted hover:border-line-strong',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>

            {touched && !topic && (
              <p className="mt-2 text-caption text-danger">Please choose one.</p>
            )}
          </fieldset>

          <Input
            label="Order number (if you have it)"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="G-260809-0001"
            hint="It helps, but you can send this without one."
            inputSize="lg"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              inputSize="lg"
            />

            <Input
              label="Phone number"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={touched && !phoneValid ? 'We need a number to call you back on' : ''}
              autoComplete="tel"
              inputSize="lg"
            />
          </div>

          <Textarea
            label="What happened?"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
            hint="As much detail as you can. Times and item names help."
          />

          {/* ── No photo upload, and said rather than hidden ──
              Evidence photographs would be genuinely useful, but they arrive
              attached to a complaint from an anonymous member of the public,
              into a bucket with no owner and no retention rule. That needs a
              decision about who can see them and for how long, not a file
              input. Until then, WhatsApp is a route that already works. */}
          <p className="rounded-card border border-line bg-surface p-4 text-body-sm text-ink-muted">
            Have a photograph? Send it to us on WhatsApp at{' '}
            <a
              href={`https://wa.me/${env.controlCentre.tel.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-ink"
            >
              {env.controlCentre.display}
            </a>{' '}
            with your reference, and we will attach it to your case.
          </p>

          {mutation.isError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-card border border-danger/40 bg-danger-soft p-4"
            >
              <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger-ink" />
              <p className="text-body-sm text-danger-ink">{mutation.error.message}</p>
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={mutation.isPending}>
            {isComplaint ? 'Submit complaint' : 'Send message'}
          </Button>
        </form>
      </div>
    </div>
  );
}
