/**
 * The confirmation screen.
 *
 * ── Its one job ────────────────────────────────────────────────────────────
 * Make sure the customer leaves with the order number. Payment is cash on
 * delivery and there is no account, so the number plus their phone is the only
 * way back to this order — if they close the tab without it, the control room
 * has to find it by name over the phone.
 *
 * So the number is the largest thing on the page, it can be copied in one tap,
 * and the tracking link carries it in the URL.
 */

import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, Copy, Phone } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { formatUsd } from '@shared/api/galeyr';
import { env } from '@shared/config/env';

export function OrderPlacedPage() {
  const { orderNumber = '' } = useParams();
  const location = useLocation();
  const state = location.state as { totalCents?: number; phone?: string } | null;

  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard access is refused on insecure origins and in some in-app
         browsers. The number is on screen in large text either way, so there
         is nothing to recover from — just no confirmation tick. */
    }
  }

  return (
    <Container className="py-12 sm:py-16" size="narrow">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success-ink"
        >
          <Check size={30} />
        </span>

        <h1 className="mt-6 text-h2 font-extrabold tracking-tight text-ink">
          Dalabkaaga waa la helay
        </h1>
        <p className="mt-2 text-body-lg text-ink-muted">
          Your order is with the restaurant. They will confirm it shortly.
        </p>
      </div>

      <div className="mt-8 rounded-card border border-line bg-card p-6 text-center">
        <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
          Your order number
        </p>

        <p className="mt-2 select-all font-mono text-h3 font-extrabold tracking-tight text-ink">
          {orderNumber}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          leadingIcon={copied ? <Check size={15} /> : <Copy size={15} />}
          onClick={() => void copy()}
        >
          {copied ? 'Copied' : 'Copy number'}
        </Button>

        <p className="mt-4 text-body-sm text-ink-muted">
          Write this down. You will need it, with your phone number, to track your order.
        </p>
      </div>

      {state?.totalCents !== undefined && (
        <div className="mt-4 flex items-center justify-between rounded-card border border-line bg-surface p-5">
          <div>
            <p className="font-semibold text-ink">To pay on delivery</p>
            <p className="text-body-sm text-ink-muted">Cash · Lacag caddaan ah</p>
          </div>
          <p className="text-h4 font-bold text-ink">{formatUsd(state.totalCents)}</p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {/* The phone number is passed through in router state rather than the
            URL. A tracking link containing someone's phone number would be
            copied into chats, logged by proxies and left in browser history —
            and it is half of what is needed to open the order. */}
        <Link to={`/track/${orderNumber}`} state={{ phone: state?.phone }} className="block">
          <Button size="lg" fullWidth>
            Track this order
          </Button>
        </Link>

        <a href={`tel:${env.controlCentre.tel}`} className="block">
          <Button variant="outline" size="lg" fullWidth leadingIcon={<Phone size={16} />}>
            Call the control room
          </Button>
        </a>
      </div>

      <p className="mt-8 text-center text-body-sm text-ink-muted">
        A courier will call you on your phone when they are close.
      </p>
    </Container>
  );
}
