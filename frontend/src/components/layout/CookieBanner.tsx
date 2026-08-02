import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { usePreferences } from '@/lib/preferences';

/**
 * Cookie consent.
 *
 * ── Reject is as easy as accept ────────────────────────────────────────────
 * Two buttons, same size, same prominence, side by side. The pattern where
 * "Accept all" is a large coloured button and refusing means opening a
 * settings panel and unticking things is a dark pattern, and under PECR and UK
 * GDPR it does not produce valid consent either.
 *
 * Nothing non-essential loads before a choice is made — the defaults in
 * lib/preferences are both false — so this banner is not gating behaviour that
 * has already happened.
 */
export function CookieBanner() {
  const { preferences, update } = usePreferences();

  if (preferences.decided) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-heading"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[calc(0.75rem+var(--safe-bottom))] animate-fade-up"
    >
      <div className="glass mx-auto flex max-w-3xl flex-col gap-4 rounded-card p-5 shadow-lifted sm:flex-row sm:items-center">
        <span
          aria-hidden
          className="hidden h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink sm:grid"
        >
          <Cookie size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <h2 id="cookie-heading" className="text-body font-semibold text-ink">
            Cookies
          </h2>
          <p className="mt-1 text-body-sm leading-relaxed text-ink-muted">
            We use essential cookies to make the site work. We would also like to use analytics
            cookies to understand how it is used — only if you agree.{' '}
            <Link to="/cookies" className="text-brand-ink underline underline-offset-4">
              Read more
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
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
      </div>
    </div>
  );
}
