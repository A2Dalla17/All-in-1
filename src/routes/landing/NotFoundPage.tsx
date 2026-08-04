/**
 * 404.
 *
 * Every wrong turn on a minicab website is somebody who wanted a car, so this
 * offers the two things that actually help — the phone number and the way
 * home — rather than an apology and a dead end.
 */

import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';

export function NotFoundPage() {
  return (
    <Container size="narrow" className="py-24 text-center sm:py-32">
      <p className="text-caption font-semibold uppercase tracking-wide text-brand-ink">404</p>
      <h1 className="mt-3 text-h1 text-ink">This page has moved on</h1>
      <p className="mx-auto mt-4 max-w-prose text-body-lg text-ink-muted">
        The link is broken or the page no longer exists. If you were trying to
        book, the control room answers 24 hours a day.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={`tel:${env.controlCentre.tel}`}
          className="pressable inline-flex h-14 items-center justify-center gap-2.5 rounded-pill brand-gradient px-7 text-body font-semibold text-white shadow-brand"
        >
          <Phone size={18} aria-hidden />
          {env.controlCentre.display}
        </a>
        <Link
          to="/"
          className="inline-flex h-14 items-center justify-center rounded-pill border border-line-strong px-7 text-body font-semibold text-ink transition-colors hover:bg-surface"
        >
          Back to home
        </Link>
      </div>
    </Container>
  );
}
