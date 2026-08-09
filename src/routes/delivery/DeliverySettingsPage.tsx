/**
 * Delivery settings.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Only settings that actually do something
 * ══════════════════════════════════════════════════════════════════════════
 * The brief lists saved addresses, notification preferences and account
 * settings. Most of those cannot exist yet, and they are absent rather than
 * present-and-inert:
 *
 *   · Saved addresses need an account, and ordering deliberately requires none.
 *   · Notifications need a channel. There is no push, no SMS gateway and no
 *     email sender wired up, so a toggle would control nothing.
 *
 * A settings page full of switches that do nothing is worse than a short one.
 * It teaches a customer that the controls here are decorative — exactly the
 * wrong lesson for the page where they will later turn off marketing messages.
 *
 * So this carries the three preferences that genuinely take effect, and says
 * plainly what is missing and how to do it today.
 */

import { Link } from 'react-router-dom';
import { Bell, MapPin, Palette, ShieldCheck } from 'lucide-react';

import { usePreferences } from '@shared/lib/preferences';
import { env } from '@shared/config/env';

export function DeliverySettingsPage() {
  const { preferences, update } = usePreferences();

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-line bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-h5 font-bold text-ink">
          <Palette size={18} aria-hidden className="text-brand-ink" />
          On this device
        </h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          These take effect immediately and are remembered in this browser.
        </p>

        <div className="mt-5 space-y-3">
          <Toggle
            checked={preferences.reduceMotion}
            onChange={(value) => update({ reduceMotion: value })}
            title="Reduce motion"
            description="Turns off animations across the site. Also honoured automatically if your phone is already set to reduce motion."
          />

          <Toggle
            checked={preferences.analytics}
            onChange={(value) => update({ analytics: value, decided: true })}
            title="Usage analytics"
            description="Helps us see which parts of the site are slow or confusing. Off unless you turn it on."
          />

          <Toggle
            checked={preferences.marketing}
            onChange={(value) => update({ marketing: value, decided: true })}
            title="Offers and marketing"
            description="Lets us show you offers based on what you have ordered. Off unless you turn it on."
          />
        </div>
      </section>

      {/* ── What does not exist yet ──
          Named, with the thing that works today next to it. */}
      <section className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-h5 font-bold text-ink">Not available yet</h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          We would rather leave these out than show switches that do nothing.
        </p>

        <ul className="mt-4 space-y-4">
          <li className="flex items-start gap-3">
            <MapPin size={17} aria-hidden className="mt-0.5 shrink-0 text-ink-subtle" />
            <div className="text-body-sm">
              <p className="font-semibold text-ink">Saved addresses</p>
              <p className="mt-0.5 text-ink-muted">
                Ordering does not need an account, so there is nowhere to save an address
                yet. Your district and landmark are asked at checkout each time — two
                fields.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <Bell size={17} aria-hidden className="mt-0.5 shrink-0 text-ink-subtle" />
            <div className="text-body-sm">
              <p className="font-semibold text-ink">Notifications</p>
              <p className="mt-0.5 text-ink-muted">
                We call you instead. The courier rings when they are close, and the Control
                Centre rings if there is a problem. Push notifications arrive with the
                GALEYR app.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-3">
            <ShieldCheck size={17} aria-hidden className="mt-0.5 shrink-0 text-ink-subtle" />
            <div className="text-body-sm">
              <p className="font-semibold text-ink">Your data</p>
              <p className="mt-0.5 text-ink-muted">
                To ask what we hold about you, or to have it removed, call the Control
                Centre on{' '}
                <a href={`tel:${env.controlCentre.tel}`} className="font-semibold text-brand-ink">
                  {env.controlCentre.display}
                </a>
                . See our{' '}
                <Link to="/privacy" className="font-semibold text-brand-ink">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}

/**
 * A labelled switch.
 *
 * The whole row is the control — a checkbox alone is a 16px target, which on a
 * phone is a coin toss. Wrapping it in the label makes the target the full
 * width of the card.
 */
function Toggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:rgb(var(--brand))]"
      />
      <span className="text-body-sm">
        <span className="font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-ink-muted">{description}</span>
      </span>
    </label>
  );
}
