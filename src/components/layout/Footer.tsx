import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';

import { Logo, PoweredByAc7 } from '@shared/components/ui/Logo';
import { Container } from '@shared/components/ui/Container';
import { brand } from '@shared/config/brand';
import { env } from '@shared/config/env';
import { LEGAL_NAV, SERVICES } from '@shared/config/navigation';

/**
 * Site footer.
 *
 * Both link groups are real <nav> landmarks with distinct accessible names.
 * A screen reader user listing landmarks on a page with three unnamed navs
 * hears "navigation, navigation, navigation" and has to enter each one to find
 * out what it is.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Identity */}
          <div className="lg:col-span-1">
            <Logo showTagline />
            <p className="mt-5 max-w-xs text-body-sm leading-relaxed text-ink-muted">
              Food delivery across {env.market.city}. Order from restaurants near you and
              pay the courier in cash when it arrives.
            </p>
          </div>

          {/* Services */}
          <nav aria-labelledby="footer-services">
            <h2
              id="footer-services"
              className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle"
            >
              Services
            </h2>
            <ul className="mt-4 space-y-2.5">
              {SERVICES.map((service) => (
                <li key={service.id}>
                  {service.comingSoon ? (
                    <span className="text-body-sm text-ink-subtle">
                      {service.label}
                      <span className="ml-2 text-micro">Coming soon</span>
                    </span>
                  ) : service.href ? (
                    <a
                      href={service.href}
                      className="text-body-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {service.label}
                    </a>
                  ) : (
                    <Link
                      to={service.to as string}
                      className="text-body-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {service.label}
                    </Link>
                  )}
                </li>
              ))}
              <li>
                <Link
                  to="/about"
                  className="text-body-sm text-ink-muted transition-colors hover:text-ink"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-labelledby="footer-legal">
            <h2
              id="footer-legal"
              className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle"
            >
              Legal
            </h2>
            <ul className="mt-4 space-y-2.5">
              {LEGAL_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-body-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h2 className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Control Room
            </h2>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={`tel:${env.controlCentre.tel}`}
                  className="inline-flex items-center gap-2 text-body-sm font-medium text-ink transition-colors hover:text-brand-ink"
                >
                  <Phone size={15} aria-hidden className="shrink-0 text-brand-ink" />
                  <span className="tabular">{env.controlCentre.display}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${env.controlCentre.email}`}
                  className="inline-flex items-center gap-2 break-all text-body-sm text-ink-muted transition-colors hover:text-ink"
                >
                  <Mail size={15} aria-hidden className="shrink-0 text-brand-ink" />
                  {env.controlCentre.email}
                </a>
              </li>
              <li className="inline-flex items-center gap-2 text-body-sm text-ink-muted">
                <MapPin size={15} aria-hidden className="shrink-0 text-brand-ink" />
                {env.market.city}, {env.market.country}
              </li>
            </ul>
            <p className="mt-3 text-micro text-ink-subtle">{env.controlCentre.hours}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-7 text-caption text-ink-subtle sm:flex-row">
          {/* ── The official footer branding ──
              "Galeyr Powered by AC7 Group", in that form, rendered by the one
              component that owns the wording. Not "AC7 GALEYR" — that is an
              internal name and appears on no customer-facing surface. */}
          <PoweredByAc7 />

          <p>
            © {year} {brand.parent} · All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
