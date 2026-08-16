/**
 * "Partner with GALEYR" — the restaurant application.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What submitting this form does, and does not, do
 * ══════════════════════════════════════════════════════════════════════════
 * It creates a row in `galeyr_restaurant_applications` with status `pending`.
 * It does NOT create a restaurant, does NOT publish anything, and does NOT make
 * a name appear anywhere a customer can see. Only an administrator, through
 * `galeyr_approve_application`, turns an application into a restaurant — and
 * even then it is created `approved`, not `active`.
 *
 * That separation is the whole point. If this form published a listing, any
 * stranger could type a well-known restaurant's name and have GALEYR
 * advertising a partnership that business has never heard of. There is no
 * technical harm in that row existing; the harm is the claim.
 *
 * The page says so plainly, because a restaurant owner filling this in deserves
 * to know they are starting a conversation, not signing something.
 */

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Check, FileText, HandCoins, Headphones, Bike } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { Input, Textarea } from '@shared/components/ui/Input';
import { DISTRICTS, submitApplication, type District } from '@shared/api/galeyr';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

const CUISINES = [
  'Somali',
  'Fast Food',
  'International',
  'Grills',
  'Seafood',
  'Bakery',
  'Juice & Drinks',
  'Desserts',
];

export function PartnersPage() {
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState<District | ''>('');
  const [landmark, setLandmark] = useState('');
  const [cuisine, setCuisine] = useState<string[]>([]);
  const [branches, setBranches] = useState('1');
  const [openingHours, setOpeningHours] = useState('');
  const [menuNotes, setMenuNotes] = useState('');
  const [businessNotes, setBusinessNotes] = useState('');
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({ mutationFn: submitApplication });

  const errors = {
    restaurantName: restaurantName.trim().length < 2 ? 'Enter your restaurant name' : '',
    ownerName: ownerName.trim().length < 2 ? 'Enter your name' : '',
    phone: phone.replace(/\D/g, '').length >= 9 ? '' : 'Enter a phone number we can call',
    district: district ? '' : 'Choose your district',
    landmark: landmark.trim().length < 3 ? 'Describe where the restaurant is' : '',
  };
  const isValid = Object.values(errors).every((e) => !e);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid || !district) return;

    mutation.mutate({
      restaurant_name: restaurantName.trim(),
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      district,
      landmark: landmark.trim(),
      cuisine,
      branches: Math.max(1, Number(branches) || 1),
      opening_hours: openingHours.trim() || undefined,
      menu_notes: menuNotes.trim() || undefined,
      business_notes: businessNotes.trim() || undefined,
    });
  }

  if (mutation.isSuccess) {
    return (
      <Container className="py-16" size="narrow">
        <div className="rounded-card border border-line bg-card p-8 text-center">
          <span
            aria-hidden
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success-ink"
          >
            <Check size={30} />
          </span>

          <h1 className="mt-6 text-h3 font-extrabold text-ink">
            Codsigaaga waa la helay
          </h1>
          <p className="mt-3 text-body text-ink-muted">
            Thank you. Your application is with our team for review.
          </p>

          {/* Exact, because vagueness here is what makes an applicant chase. */}
          <div className="mt-6 rounded-card border border-line bg-surface p-5 text-left text-body-sm text-ink-muted">
            <p className="font-semibold text-ink">What happens next</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>Someone from GALEYR will call you on the number you gave.</li>
              <li>We visit or speak with you about your menu, prices and hours.</li>
              <li>
                If we both want to go ahead, we agree terms in writing before anything of
                yours appears on the site.
              </li>
            </ol>
            <p className="mt-4">
              Your restaurant is <strong className="text-ink">not listed</strong> and nothing
              is public until you have agreed to work with us.
            </p>
          </div>

          <p className="mt-6 text-body-sm text-ink-muted">
            Questions? Call{' '}
            <a href={`tel:${env.controlCentre.tel}`} className="font-semibold text-brand-ink">
              {env.controlCentre.display}
            </a>
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-12" size="narrow">
      <h1 className="text-h2 font-extrabold tracking-tight text-ink">
        Become Our Partner
      </h1>
      <p className="mt-2 text-body-lg text-ink-muted">
        Sell to more of Mogadishu without hiring a delivery team.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Bike, title: 'Our couriers', text: 'You cook. We collect and deliver.' },
          { icon: Headphones, title: 'A control room', text: 'A person answers when something goes wrong.' },
          { icon: HandCoins, title: 'Cash on delivery', text: 'How Mogadishu already pays.' },
        ].map((benefit) => (
          <li key={benefit.title} className="rounded-card border border-line bg-card p-5">
            <benefit.icon size={20} aria-hidden className="text-brand-ink" />
            <p className="mt-3 font-semibold text-ink">{benefit.title}</p>
            <p className="mt-1 text-body-sm text-ink-muted">{benefit.text}</p>
          </li>
        ))}
      </ul>

      {/* ── Said before the form, not after ──
          Someone deciding whether to spend five minutes on this should know
          upfront that it is not a contract and not an instant listing. */}
      <div className="mt-8 flex items-start gap-3 rounded-card border border-info/35 bg-info-soft p-4">
        <FileText size={18} aria-hidden className="mt-0.5 shrink-0 text-info-ink" />
        <div className="text-body-sm text-info-ink">
          <p className="font-semibold">This is an application, not an agreement</p>
          <p className="mt-1">
            Sending this form does not list your restaurant and does not commit you to
            anything. We review it, call you, and only add your restaurant once we have both
            agreed terms.
          </p>
          <p className="mt-1">
            Foomkani ma aha heshiis. Waan kula soo xiriiri doonaa ka hor inta aan wax la
            daabicin.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">Your restaurant</h2>

          <Input
            label="Restaurant name"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            error={touched ? errors.restaurantName : ''}
            inputSize="lg"
          />

          <div>
            <label htmlFor="p-district" className="mb-1.5 block text-body-sm font-semibold text-ink">
              District · Degmo
            </label>
            <select
              id="p-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value as District)}
              className={cn(
                'h-12 w-full rounded-input border bg-card px-4 text-body text-ink',
                'focus:outline-none focus:ring-2 focus:ring-brand/25',
                touched && errors.district ? 'border-danger' : 'border-line focus:border-brand',
              )}
            >
              <option value="">Choose a district</option>
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {touched && errors.district && (
              <p className="mt-1.5 text-caption text-danger">{errors.district}</p>
            )}
          </div>

          <Input
            label="Landmark"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            error={touched ? errors.landmark : ''}
            hint="Something a courier would recognise."
            inputSize="lg"
          />

          <fieldset>
            <legend className="mb-2 text-body-sm font-semibold text-ink">
              What do you cook? (choose any)
            </legend>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((option) => {
                const selected = cuisine.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setCuisine((current) =>
                        selected ? current.filter((c) => c !== option) : [...current, option],
                      )
                    }
                    className={cn(
                      'rounded-pill border px-3.5 py-2 text-body-sm font-medium transition-colors',
                      selected
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-card text-ink-muted hover:border-line-strong',
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Input
            label="How many branches?"
            type="number"
            min={1}
            value={branches}
            onChange={(e) => setBranches(e.target.value)}
            inputSize="lg"
          />

          <Input
            label="Opening hours (optional)"
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            placeholder="8am – 10pm every day"
            inputSize="lg"
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">How do we reach you?</h2>

          <Input
            label="Your name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            error={touched ? errors.ownerName : ''}
            autoComplete="name"
            inputSize="lg"
          />

          <Input
            label="Phone number"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={touched ? errors.phone : ''}
            hint="We will call this number. WhatsApp is fine."
            placeholder="061 123 4567"
            autoComplete="tel"
            inputSize="lg"
          />

          <Input
            label="Email (optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputSize="lg"
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">Tell us a little more</h2>

          <Textarea
            label="What is on your menu? (optional)"
            value={menuNotes}
            onChange={(e) => setMenuNotes(e.target.value)}
            hint="A few dishes and rough prices is plenty. Do not send a full menu yet."
            rows={3}
          />

          <Textarea
            label="Anything else we should know? (optional)"
            value={businessNotes}
            onChange={(e) => setBusinessNotes(e.target.value)}
            rows={3}
          />
        </section>

        {mutation.isError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-card border border-danger/40 bg-danger-soft p-4"
          >
            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger-ink" />
            <p className="text-body-sm text-danger-ink">{mutation.error.message}</p>
          </div>
        )}

        <Button type="submit" size="xl" fullWidth loading={mutation.isPending}>
          Send application
        </Button>

        <p className="text-center text-caption text-ink-subtle">
          By sending this you agree we may call you about it. Nothing is published until we
          have spoken.
        </p>
      </form>
    </Container>
  );
}
