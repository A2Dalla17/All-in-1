/**
 * AC7 GALEYR — hero.
 *
 * ── One message ────────────────────────────────────────────────────────────
 * Food delivery in Mogadishu. Not a transport group, not four services, not
 * "coming soon" to anything. A company that lists everything it might do reads
 * as a company that does none of it yet.
 *
 * ── Somali first, English beneath ──────────────────────────────────────────
 * The headline is the Somali line, because the customer is Somali. English sits
 * underneath as support rather than as the primary — the reverse of how a
 * London-built product would do it, and the reason this will feel local rather
 * than imported.
 *
 * ── Why the restaurant search is the hero action ───────────────────────────
 * The single thing a visitor wants is to see whether anywhere near them
 * delivers. Putting that decision in the hero rather than behind a "learn more"
 * is the difference between a brochure and a shop.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Wallet } from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Brand wash. Kept as a CSS gradient rather than an image: this page has
          to open on a weak connection in Mogadishu, and a hero photograph is
          the single heaviest thing most marketing sites ship. */}
      <div aria-hidden className="absolute inset-0 brand-gradient" />
      <div
        aria-hidden
        className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/[0.06]"
      />

      <Container className="relative py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-white/75">
            {env.market.cityLocal} · {env.market.countryLocal}
          </p>

          <h1 className="mt-4 text-h1 font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
            Cuntada aad jeceshahay,
            <br />
            albaabkaaga.
          </h1>

          <p className="mt-5 max-w-prose text-body-lg text-white/85">
            Food delivery made simple. Order from restaurants across Mogadishu
            and pay the courier in cash when it arrives.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={env.services.restaurants}
              className="pressable inline-flex h-14 items-center justify-center gap-2.5 rounded-pill bg-white px-8 text-body font-semibold text-brand-700 shadow-lifted"
            >
              Dalbo hadda · Order now
              <ArrowRight size={18} aria-hidden />
            </Link>

            <Link
              to={env.services.track}
              className="inline-flex h-14 items-center justify-center rounded-pill border border-white/35 px-8 text-body font-semibold text-white transition-colors hover:bg-white/10"
            >
              Track your order
            </Link>
          </div>

          {/* The three objections a first-time customer actually has, answered
              before they are asked: what does it cost me, when does it come,
              and do I have to pay before I see the food. */}
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {[
              { icon: Wallet, text: 'Cash on delivery' },
              { icon: Clock, text: '30–45 minutes' },
              { icon: ArrowRight, text: 'No account needed' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-2 text-body-sm text-white/85">
                <item.icon size={16} aria-hidden className="shrink-0" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
