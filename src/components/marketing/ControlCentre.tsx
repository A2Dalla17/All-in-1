/**
 * The phone number.
 *
 * ── Why this is a whole section on a delivery site ─────────────────────────
 * Ordering online is unfamiliar to a lot of people here, and a business whose
 * only contact route is a form feels like one that cannot be held to account.
 * A number that a person answers is what makes a first order feel safe — and
 * for the first months of this business, plenty of orders will come by phone
 * rather than through the site. That is fine. The website exists to make the
 * business operable, not to force a channel.
 */

import { Phone, MessageCircle } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';

export function ControlCentre() {
  const digits = env.controlCentre.tel.replace(/\D/g, '');

  return (
    <section id="control-room" className="py-16 sm:py-20">
      <Container>
        <div className="overflow-hidden rounded-card border border-line bg-card">
          <div className="grid gap-8 p-8 sm:p-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-brand-ink">
                Wac Galeyr
              </p>
              <h2 className="mt-2 text-h2 text-ink">Would rather just ring us?</h2>
              <p className="mt-3 text-body-lg text-ink-muted">
                The control room takes orders by phone and on WhatsApp, every
                day. Tell us what you want and where you are — we will do the
                rest.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`tel:${env.controlCentre.tel}`}
                className="pressable inline-flex h-14 items-center justify-center gap-2.5 rounded-pill brand-gradient px-7 text-body font-semibold text-white shadow-brand"
              >
                <Phone size={18} aria-hidden />
                {env.controlCentre.display}
              </a>

              {/* WhatsApp is how most of Mogadishu actually communicates.
                  Leaving it out because a website "should" have a contact form
                  would be building for the wrong country. */}
              <a
                href={`https://wa.me/${digits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2.5 rounded-pill border border-line-strong px-7 text-body font-semibold text-ink transition-colors hover:bg-surface"
              >
                <MessageCircle size={18} aria-hidden />
                WhatsApp
              </a>

              <p className="mt-1 text-center text-body-sm text-ink-subtle">
                {env.controlCentre.hours}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
