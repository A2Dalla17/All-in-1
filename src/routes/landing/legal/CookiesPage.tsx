import { Link } from 'react-router-dom';

import { LegalPage, LegalSection } from '@/components/layout/LegalPage';
import { Button } from '@shared/components/ui/Button';
import { env } from '@shared/config/env';
import { usePageMeta } from '@shared/lib/seo';
import { usePreferences } from '@shared/lib/preferences';

export function CookiesPage() {
  usePageMeta('Cookie policy', 'What cookies AC7 GROUP uses and how to control them.');
  const { preferences, update } = usePreferences();

  return (
    <LegalPage
      title="Cookie policy"
      updated="2 August 2026"
      intro="What we store on your device, why, and how to change your mind at any time."
    >
      <LegalSection heading="Essential cookies">
        <p>
          These make the site work and cannot be switched off. They keep you signed in, remember
          the choice you made about this very banner, and protect forms against cross-site
          request forgery. They store no advertising identifier and are never shared.
        </p>
      </LegalSection>

      <LegalSection heading="Analytics">
        <p>
          Analytics helps us see which pages people use and where they get stuck. It is{' '}
          <strong>off by default</strong> and nothing is loaded until you turn it on. If you never
          answer the banner, nothing runs.
        </p>
      </LegalSection>

      <LegalSection heading="Marketing">
        <p>
          Used to measure whether an advertising campaign brought someone to the site. Also off by
          default. We do not sell personal data, and advertisers on this site receive no personal
          information about you.
        </p>
      </LegalSection>

      <LegalSection heading="Your current choices">
        <p>
          These are your live settings, stored on this device only. Changing them here takes
          effect immediately.
        </p>

        <div className="mt-5 space-y-3">
          <Choice
            label="Analytics cookies"
            description="Help us understand which pages are used."
            checked={preferences.analytics}
            onChange={(analytics) => update({ analytics, decided: true })}
          />
          <Choice
            label="Marketing cookies"
            description="Measure whether an advert brought you here."
            checked={preferences.marketing}
            onChange={(marketing) => update({ marketing, decided: true })}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => update({ analytics: false, marketing: false, decided: true })}
          >
            Reject non-essential
          </Button>
          <Button
            variant="primary"
            onClick={() => update({ analytics: true, marketing: true, decided: true })}
          >
            Accept all
          </Button>
        </div>
      </LegalSection>

      <LegalSection heading="Controlling cookies in your browser">
        <p>
          Every major browser lets you block or delete cookies in its settings. Blocking essential
          cookies will stop parts of the site working, including staying signed in.
        </p>
        <p>
          Questions? Email{' '}
          <a href={`mailto:${env.controlCentre.email}`}>{env.controlCentre.email}</a>, or see our{' '}
          <Link to="/privacy">privacy policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A real checkbox with a styled appearance, not a div pretending to be one.
 * A native input brings keyboard support, the correct role and the correct
 * announcement for free — all of which have to be rebuilt by hand otherwise,
 * and usually are not.
 */
function Choice({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-tile border border-line bg-card p-4 transition-colors hover:border-line-strong">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        /* accent-brand rather than an arbitrary rgb(): the utility reads the
           theme token, so the native checkbox follows the brand colour if it
           ever changes again. */
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand"
      />
      <span className="min-w-0">
        <span className="block text-body font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-body-sm text-ink-muted">{description}</span>
      </span>
    </label>
  );
}
