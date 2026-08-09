/**
 * Become a courier — the application.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Only courier questions
 * ══════════════════════════════════════════════════════════════════════════
 * Nothing about restaurants, menus or premises. A courier and a restaurant are
 * different applications with different documents and a different review, and a
 * shared form would ask most people most of the wrong questions.
 *
 * ── What it does NOT collect, and why ─────────────────────────────────────
 * The document upload is described here but not implemented as a file input.
 * Identity documents are collected in person.
 *
 * That is a deliberate decision, not an omission. A passport or a national ID
 * uploaded from a phone by an anonymous applicant creates a permanent, highly
 * sensitive record before anybody has decided the applicant is real — and it
 * arrives with no owner, no retention rule and no answer to "who may look at
 * this, and for how long". The private bucket and the metadata table exist so
 * that upload can be switched on the moment those questions have answers; the
 * form asks people to bring documents to the office instead.
 *
 * Checking an ID in person is also the only version that actually verifies
 * anything: a photograph of a document proves somebody has a photograph.
 */

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, FileCheck2, Phone, ShieldCheck } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { Input, Textarea } from '@shared/components/ui/Input';
import { DISTRICTS, type District } from '@shared/api/galeyr';
import {
  listDocumentRequirements,
  submitCourierApplication,
  VEHICLE_LABEL,
  type VehicleType,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { usePageMeta } from '@shared/lib/seo';
import { cn } from '@shared/lib/utils';

const selectClass =
  'h-12 w-full rounded-input border border-line bg-card px-4 text-body text-ink ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25';

export function CourierApplyPage() {
  usePageMeta('Become a courier', 'Apply to deliver with GALEYR in Mogadishu.');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [district, setDistrict] = useState<District | ''>('');
  const [addressNotes, setAddressNotes] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [vehicle, setVehicle] = useState<VehicleType>('motorbike');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [hasLicence, setHasLicence] = useState(false);
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [touched, setTouched] = useState(false);

  /* What to bring is read from the database, because which documents are
     acceptable is a business and legal decision an administrator changes — not
     a constant a developer picks. */
  const documents = useQuery({
    queryKey: ['ops', 'doc-requirements', 'courier'],
    queryFn: () => listDocumentRequirements('courier'),
  });

  const mutation = useMutation({ mutationFn: submitCourierApplication });

  const errors = {
    fullName: fullName.trim().length < 3 ? 'Enter your full name' : '',
    phone: phone.replace(/\D/g, '').length >= 9 ? '' : 'Enter a phone number we can call',
    district: district ? '' : 'Choose the area you live in',
  };
  const valid = Object.values(errors).every((e) => !e);

  /* A licence is required for anything motorised. Asked as a question rather
     than assumed, because a bicycle courier needs none and would otherwise be
     blocked from applying. */
  const needsLicence = vehicle === 'motorbike' || vehicle === 'car';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid || !district) return;

    mutation.mutate({
      full_name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      date_of_birth: dob || undefined,
      district,
      address_notes: addressNotes.trim() || undefined,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      vehicle_type: vehicle,
      vehicle_details: vehicleDetails.trim() || undefined,
      has_driving_licence: hasLicence,
      experience: experience.trim() || undefined,
      availability: availability.trim() || undefined,
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

          <h1 className="mt-6 text-h3 font-extrabold text-ink">Codsigaaga waa la helay</h1>
          <p className="mt-3 text-body text-ink-muted">
            Your courier application has been received.
          </p>

          <p className="mt-4 inline-block rounded-pill bg-warning-soft px-4 py-2 text-body-sm font-bold uppercase tracking-wide text-warning-ink">
            Pending verification
          </p>

          <div className="mt-6 rounded-card border border-line bg-surface p-5 text-left text-body-sm text-ink-muted">
            <p className="font-semibold text-ink">What happens next</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>The Control Centre reviews your application.</li>
              <li>Someone calls you to arrange checking your documents in person.</li>
              <li>
                We complete our verification checks. This can take longer for some
                applicants, and we will tell you if we need anything more.
              </li>
              <li>If everything is in order, we set you up to start delivering.</li>
            </ol>

            <p className="mt-4">
              Bring your original documents to that meeting — we check them in person rather
              than from photographs.
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
        Noqo wadaha GALEYR
      </h1>
      <p className="mt-2 text-body-lg text-ink-muted">
        Become a courier. Work your own hours, get paid per delivery.
      </p>

      {/* ── What you will need ──
          Shown before the form. Somebody who cannot produce identification
          should find that out in ten seconds, not after filling in twelve
          fields. */}
      <section className="mt-8 rounded-card border border-info/35 bg-info-soft p-5">
        <h2 className="flex items-center gap-2 font-semibold text-info-ink">
          <FileCheck2 size={18} aria-hidden />
          What you will need to bring
        </h2>

        <ul className="mt-3 space-y-1.5 text-body-sm text-info-ink/90">
          {(documents.data ?? []).map((requirement) => (
            <li key={requirement.id}>
              · {requirement.label}
              {requirement.is_required && (
                <strong className="ml-1 font-bold">(required)</strong>
              )}
              {requirement.description && (
                <span className="block pl-3 text-caption opacity-80">
                  {requirement.description}
                </span>
              )}
            </li>
          ))}
          {(documents.data ?? []).length === 0 && (
            <li>· Somali identification we can check in person.</li>
          )}
        </ul>

        <p className="mt-4 text-caption text-info-ink/90">
          We check original documents in person — please do not send photographs of them.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">About you</h2>

          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={touched ? errors.fullName : ''}
            hint="As it appears on your identification."
            autoComplete="name"
            inputSize="lg"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone number"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={touched ? errors.phone : ''}
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
          </div>

          <Input
            label="Date of birth (optional)"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            hint="We may need this to confirm your identity."
            inputSize="lg"
          />

          <div>
            <label htmlFor="c-district" className="mb-1.5 block text-body-sm font-semibold text-ink">
              Which area do you live in?
            </label>
            <select
              id="c-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value as District)}
              className={cn(selectClass, touched && errors.district && 'border-danger')}
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

          <Textarea
            label="Where in that area? (optional)"
            value={addressNotes}
            onChange={(e) => setAddressNotes(e.target.value)}
            rows={2}
            hint="A landmark near your home."
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">How you will deliver</h2>

          <div>
            <label htmlFor="c-vehicle" className="mb-1.5 block text-body-sm font-semibold text-ink">
              Delivery method
            </label>
            <select
              id="c-vehicle"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value as VehicleType)}
              className={selectClass}
            >
              {(Object.keys(VEHICLE_LABEL) as VehicleType[]).map((key) => (
                <option key={key} value={key}>
                  {VEHICLE_LABEL[key]}
                </option>
              ))}
            </select>
          </div>

          {needsLicence && (
            <label className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
              <input
                type="checkbox"
                checked={hasLicence}
                onChange={(e) => setHasLicence(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:rgb(var(--brand))]"
              />
              <span className="text-body-sm">
                <span className="font-semibold text-ink">I hold a valid driving licence</span>
                <span className="mt-0.5 block text-ink-muted">
                  Required to deliver by {VEHICLE_LABEL[vehicle].toLowerCase()}. We will check
                  it in person.
                </span>
              </span>
            </label>
          )}

          <Input
            label="Vehicle details (optional)"
            value={vehicleDetails}
            onChange={(e) => setVehicleDetails(e.target.value)}
            placeholder="Make, colour, plate number"
            inputSize="lg"
          />

          <Textarea
            label="Delivery experience (optional)"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            rows={2}
            hint="Have you delivered before? Which areas do you know well?"
          />

          <Input
            label="When can you work? (optional)"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Evenings and weekends"
            inputSize="lg"
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">Emergency contact</h2>
          <p className="text-body-sm text-ink-muted">
            Somebody we can call if you have an accident while working.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Their name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              inputSize="lg"
            />
            <Input
              label="Their phone number"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              inputSize="lg"
            />
          </div>
        </section>

        {/* ── Verification, stated plainly ──
            An applicant is entitled to know that checks happen before they hand
            over a date of birth and an emergency contact. */}
        <section className="flex items-start gap-3 rounded-card border border-line bg-surface p-5">
          <ShieldCheck size={20} aria-hidden className="mt-0.5 shrink-0 text-brand-ink" />
          <div className="text-body-sm text-ink-muted">
            <p className="font-semibold text-ink">We check who we work with</p>
            <p className="mt-1">
              Couriers carry customers' food, their addresses and their cash. We verify
              identification in person and carry out background checks where they apply. You
              will be asked for your consent before any check is made.
            </p>
          </div>
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

        <p className="text-center text-body-sm text-ink-muted">
          Would rather talk to someone first? Call{' '}
          <a href={`tel:${env.controlCentre.tel}`} className="font-semibold text-brand-ink">
            <Phone size={13} aria-hidden className="inline" /> {env.controlCentre.display}
          </a>
        </p>
      </form>
    </Container>
  );
}
