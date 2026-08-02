import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { Container } from '@/components/ui/Container';
import { env } from '@/config/env';
import { LEGAL_NAV, SERVICES } from '@/config/navigation';

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
            <Logo showMeaning />
            <p className="mt-4 max-w-xs text-body-sm leading-relaxed text-ink-muted">
              {env.company.product} — {env.company.productLong}. Transport, school runs and local
              bookings across {env.company.city}.
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
              Control Centre
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
                {env.company.city}, United Kingdom
              </li>
            </ul>
            <p className="mt-3 text-micro text-ink-subtle">{env.controlCentre.hours}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-7 text-caption text-ink-subtle sm:flex-row">
          <p>
            © {year} {env.company.name} ·{' '}
            <span className="text-brand-ink">{env.company.meaning}</span>
          </p>

          {/* The staff entrance lives in Settings, not here. */}
          <p>All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
}
