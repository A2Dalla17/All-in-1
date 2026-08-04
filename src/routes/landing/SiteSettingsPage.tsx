/* The Staff / Admin console card was removed from this public page.
   The console is reached at /admin directly; advertising it on a page
   any visitor can open told strangers where the door is without making
   the door any stronger. Row level security is what protects it, but
   there is no reason to hand out the address. */
import { Link } from 'react-router-dom';
import { Accessibility, ChevronRight, Cookie, Mail, Phone, ShieldCheck } from 'lucide-react';

import { Card, CardHeader } from '@shared/components/ui/Card';
import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';
import { LEGAL_NAV } from '@shared/config/navigation';
import { usePageMeta } from '@shared/lib/seo';
import { usePreferences } from '@shared/lib/preferences';

/**
 * Settings.
 *
 * Everything here is genuinely wired: the toggles write to the same store the
 * cookie banner reads, and the motion preference sets a class the stylesheet
 * actually honours. A settings screen full of switches that do nothing is the
 * fastest way to lose someone's trust in the rest of the product.
 *
 * There is no theme switch, and that is deliberate: ACT has one visual
 * identity — white with deep red, matching the Taxi platform — and a second
 * palette would be a second thing to keep contrast-correct.
 */
export function SettingsPage() {
  usePageMeta('Settings', 'Manage your cookie and accessibility preferences.');
  const { preferences, update } = usePreferences();

  return (
    <Container size="narrow" className="py-16 sm:py-20">
      <header className="border-b border-line pb-8">
        <h1 className="text-h1 text-ink">Settings</h1>
        <p className="mt-3 text-body leading-relaxed text-ink-muted">
          Preferences are stored on this device only. Nothing here is sent to us or tied to your
          account.
        </p>
      </header>

      {/* Privacy */}
      <section className="mt-10">
        <Card>
          <CardHeader
            title="Privacy"
            description="Non-essential cookies are off until you turn them on."
          />

          <div className="space-y-3">
            <Toggle
              icon={<Cookie size={18} />}
              label="Analytics cookies"
              description="Help us see which pages people use and where they get stuck."
              checked={preferences.analytics}
              onChange={(analytics) => update({ analytics, decided: true })}
            />
            <Toggle
              icon={<ShieldCheck size={18} />}
              label="Marketing cookies"
              description="Measure whether an advertising campaign brought you here."
              checked={preferences.marketing}
              onChange={(marketing) => update({ marketing, decided: true })}
            />
          </div>
        </Card>
      </section>

      {/* Accessibility */}
      <section className="mt-4">
        <Card>
          <CardHeader
            title="Accessibility"
            description="We already follow your system's reduce-motion setting. This forces it off regardless."
          />

          <Toggle
            icon={<Accessibility size={18} />}
            label="Reduce motion"
            description="Removes fades, slides and hover lifts across the site."
            checked={preferences.reduceMotion}
            onChange={(reduceMotion) => update({ reduceMotion })}
          />
        </Card>
      </section>

      {/* Legal */}
      <section className="mt-4">
        <Card padded={false}>
          <div className="p-6 pb-2">
            <CardHeader title="Policies" description="How we handle your data." />
          </div>
          <ul>
            {LEGAL_NAV.map((item) => (
              <li key={item.to} className="border-t border-line">
                <Link
                  to={item.to}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface"
                >
                  <span className="text-body text-ink">{item.label}</span>
                  <ChevronRight size={17} aria-hidden className="text-ink-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Staff */}
      {/* Contact */}
      <section className="mt-4">
        <Card>
          <CardHeader title="Need a hand?" description="The control centre is open around the clock." />
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={`tel:${env.controlCentre.tel}`}
              className="flex flex-1 items-center gap-3 rounded-tile border border-line bg-elevated px-4 py-3.5 transition-colors hover:border-brand/40"
            >
              <Phone size={18} aria-hidden className="shrink-0 text-brand-ink" />
              <span className="tabular text-body font-medium text-ink">
                {env.controlCentre.display}
              </span>
            </a>
            <a
              href={`mailto:${env.controlCentre.email}`}
              className="flex flex-1 items-center gap-3 rounded-tile border border-line bg-elevated px-4 py-3.5 transition-colors hover:border-brand/40"
            >
              <Mail size={18} aria-hidden className="shrink-0 text-brand-ink" />
              <span className="min-w-0 break-all text-body font-medium text-ink">
                {env.controlCentre.email}
              </span>
            </a>
          </div>
        </Card>
      </section>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A switch built on a real checkbox.
 *
 * The input carries the state and the keyboard behaviour; the span beside it
 * is the visual. `peer` lets the visual follow `:checked` in CSS, so there is
 * no JavaScript keeping appearance and state in sync — and therefore no way
 * for them to disagree.
 */
function Toggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-tile border border-line bg-elevated p-4 transition-colors hover:border-line-strong">
      <span aria-hidden className="shrink-0 text-brand-ink">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-body-sm leading-relaxed text-ink-muted">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      {/* The knob is a CHILD of the track, not a sibling of the input, so a
          bare peer-checked utility on the knob would never match: Tailwind
          compiles those to `.peer:checked ~ &`, which requires siblinghood.
          The arbitrary child selector reaches the knob from the track instead.

          Worth knowing: Tailwind's scanner is plain text and does not parse
          JSX, so writing a class name inside a comment is enough to emit CSS
          for it. That is why this note describes the utility rather than
          spelling it out. */}
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-pill bg-line-strong transition-colors duration-200 peer-checked:bg-brand peer-checked:[&>span]:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-ink"
      >
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-smooth" />
      </span>
    </label>
  );
}
