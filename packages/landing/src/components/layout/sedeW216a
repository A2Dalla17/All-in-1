import type { ReactNode } from 'react';

import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';

/**
 * Shared shell for the policy pages.
 *
 * ── The notice at the top is deliberate ────────────────────────────────────
 * These documents were drafted to be accurate about how the platform actually
 * works — what is collected, where it is stored, who can see it. They have not
 * been reviewed by a solicitor, and a privacy policy for a company handling
 * children's school transport has obligations under UK GDPR that generic
 * template text does not cover. Saying so in the page is more honest than
 * quietly shipping boilerplate that reads as if it had been.
 *
 * Remove the notice once the documents have had a legal review.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <Container size="narrow" className="py-16 sm:py-20">
      <header className="border-b border-line pb-8">
        <h1 className="text-h1 text-ink">{title}</h1>
        <p className="mt-3 text-body leading-relaxed text-ink-muted">{intro}</p>
        <p className="mt-4 text-caption text-ink-subtle">
          Last updated {updated} · {env.company.name}, {env.company.city}
        </p>
      </header>

      <div className="mt-6 rounded-tile border border-warning-ink/30 bg-warning-soft/60 px-5 py-4">
        <p className="text-body-sm leading-relaxed text-ink">
          <strong className="font-semibold text-warning-ink">Draft — pending legal review.</strong>{' '}
          This document describes how the platform genuinely works, but it has not yet been
          reviewed by a solicitor. Do not rely on it as a final legal notice.
        </p>
      </div>

      {/*
        Spacing is applied here rather than on every heading and paragraph in
        the page bodies, so all three policy pages share one rhythm and adding
        a section cannot get it wrong.
      */}
      <div
        className={[
          'mt-10 space-y-8',
          '[&_h2]:text-h3 [&_h2]:text-ink [&_h2]:mb-3',
          '[&_h3]:text-h4 [&_h3]:text-ink [&_h3]:mb-2 [&_h3]:mt-5',
          '[&_p]:text-body [&_p]:leading-relaxed [&_p]:text-ink-muted [&_p]:mb-3',
          '[&_ul]:space-y-2 [&_ul]:text-body [&_ul]:text-ink-muted [&_ul]:mb-3',
          '[&_li]:pl-1',
          '[&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-4',
          '[&_strong]:text-ink [&_strong]:font-semibold',
        ].join(' ')}
      >
        {children}
      </div>
    </Container>
  );
}

/** A titled block within a policy page. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  );
}
