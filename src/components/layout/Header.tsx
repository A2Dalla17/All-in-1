import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Lock,
  Menu,
  Phone,
  Settings,
  ShoppingBag,
  X,
} from 'lucide-react';

import { PartnersMenu } from '@/components/layout/RestaurantsMenu';
import { Logo } from '@shared/components/ui/Logo';
import { Container } from '@shared/components/ui/Container';
import { env } from '@shared/config/env';
import { HEADER_NAV } from '@shared/config/navigation';
import { cartCount, useCart } from '@shared/lib/cart';
import { cn } from '@shared/lib/utils';

/**
 * Site header.
 *
 * ── The mobile menu is the fiddly part ─────────────────────────────────────
 * Three behaviours that are easy to omit and immediately noticeable when they
 * are missing:
 *
 *   1. Escape closes it. Without this a keyboard user who opens the menu has
 *      no way out except tabbing through every item.
 *   2. It closes on navigation. React Router does not unmount the header
 *      between routes, so the panel would otherwise stay open over the new page.
 *   3. Body scroll locks while it is open. Otherwise the page behind scrolls
 *      under the panel on iOS, which feels broken.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  /* The cart persists across pages and reloads, so without a permanent
     indicator a customer can wander off the menu page and forget an order is
     half-built — then start again from scratch, or leave. */
  const itemsInCart = cartCount(useCart());

  /* Close on navigation. */
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  /* Escape closes, and focus returns to the button that opened it — otherwise
     focus is left on a hidden element and the next Tab goes somewhere random. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  /* A hairline only once the page has moved. At the very top the header should
     sit flush against the hero with nothing dividing them. */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'glass sticky top-0 z-50 transition-colors duration-300',
        scrolled ? 'border-b border-line' : 'border-b border-transparent',
      )}
    >
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Logo />

            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex items-center gap-0.5">
                {HEADER_NAV.map((item) =>
                  /* Restaurants gets the dropdown; everything else is a plain
                     link. The special case lives here rather than inside
                     NavItem so NavItem stays a dumb link. */
                  item.label === 'Our Partners' ? (
                    <li key={item.label}>
                      <PartnersMenu active={location.pathname.startsWith('/our-partners')} />
                    </li>
                  ) : (
                    <li key={item.label}>
                      <NavItem {...item} />
                    </li>
                  ),
                )}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${env.controlCentre.tel}`}
              className="hidden min-h-11 items-center gap-2 rounded-control px-3 py-2 text-body-sm font-medium text-ink transition-colors hover:bg-surface md:inline-flex"
            >
              <Phone size={15} aria-hidden />
              <span className="tabular">{env.controlCentre.display}</span>
            </a>

            {/* Shown only when there is something in it. An always-visible
                empty cart is a permanent invitation to a dead end. */}
            {itemsInCart > 0 && (
              <Link
                to="/checkout"
                aria-label={`Your order — ${itemsInCart} item${itemsInCart === 1 ? '' : 's'}`}
                className="relative grid h-11 w-11 place-items-center rounded-control text-ink transition-colors hover:bg-surface"
              >
                <ShoppingBag size={19} aria-hidden />
                <span
                  aria-hidden
                  className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-pill bg-brand px-1 text-[11px] font-bold leading-none text-white"
                >
                  {itemsInCart}
                </span>
              </Link>
            )}

            <Link
              to="/settings"
              aria-label="Settings"
              className="grid h-11 w-11 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Settings size={19} aria-hidden />
            </Link>

            <button
              ref={toggleRef}
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((value) => !value)}
              className="grid h-11 w-11 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface hover:text-ink lg:hidden"
            >
              {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile navigation */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line bg-surface lg:hidden"
      >
        <Container>
          <nav aria-label="Main" className="py-2">
            <ul>
              {HEADER_NAV.map((item) => (
                <li key={item.label} className="border-b border-line last:border-0">
                  <MobileNavItem {...item} />
                </li>
              ))}
            </ul>
          </nav>

          <a
            href={`tel:${env.controlCentre.tel}`}
            className="mb-4 mt-2 flex items-center justify-center gap-2 rounded-control bg-brand-soft px-4 py-3 text-body font-semibold text-brand-ink"
          >
            <Phone size={17} aria-hidden />
            <span className="tabular">{env.controlCentre.display}</span>
          </a>
        </Container>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */

interface NavItemProps {
  label: string;
  to?: string;
  href?: string;
  comingSoon?: boolean;
  children?: readonly NavItemProps[];
}

function NavItem({ label, to, href, comingSoon, children }: NavItemProps) {
  const base =
    /* min-h-11 is the 44px minimum touch target. These measured 39px:
       fine under a mouse, marginal under a thumb on a tablet, and the
       header is the one component every page shares. Raising the floor
       rather than the padding keeps the visual density unchanged. */
    'inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 py-2 text-body-sm font-medium transition-colors';

  /* A group opens a submenu instead of navigating. Built on <details> rather
     than React state: it closes on Escape, is keyboard operable and is
     announced as expandable by screen readers, all without a single event
     handler. A hand-rolled dropdown has to reimplement every one of those and
     usually forgets Escape. */
  if (children && children.length > 0) {
    return (
      <details className="group relative">
        <summary
          className={cn(
            base,
            'cursor-pointer list-none text-ink-muted hover:bg-surface hover:text-ink',
            'marker:hidden [&::-webkit-details-marker]:hidden',
          )}
        >
          {label}
          <ChevronDown
            size={14}
            aria-hidden
            className="transition-transform group-open:rotate-180"
          />
        </summary>

        <ul className="absolute left-0 top-full z-50 mt-1 min-w-[13rem] rounded-card border border-line bg-card p-1.5 shadow-lifted">
          {children.map((child) => (
            <li key={child.label}>
              <NavLink
                to={child.to as string}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-2 rounded-control px-3 py-2 text-body-sm font-medium',
                    isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink hover:bg-surface',
                  )
                }
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </details>
    );
  }

  if (comingSoon) {
    return (
      <span
        title="Coming soon"
        className={cn(base, 'cursor-default text-ink-subtle')}
        /* Not a button and not a link, because it does nothing. Marking it
           disabled tells assistive technology that rather than leaving a
           mysterious unfocusable word in the navigation. */
        aria-disabled="true"
      >
        {label}
        <Lock size={11} aria-hidden />
      </span>
    );
  }

  if (href) {
    return (
      <a href={href} className={cn(base, 'text-ink-muted hover:bg-surface hover:text-ink')}>
        {label}
      </a>
    );
  }

  return (
    <NavLink
      to={to as string}
      className={({ isActive }) =>
        cn(base, isActive ? 'bg-card text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink')
      }
    >
      {label}
    </NavLink>
  );
}

function MobileNavItem({ label, to, href, comingSoon }: NavItemProps) {
  const base = 'flex items-center justify-between py-3.5 text-body font-medium';

  if (comingSoon) {
    return (
      <span aria-disabled="true" className={cn(base, 'text-ink-subtle')}>
        {label}
        <span className="rounded-pill bg-elevated px-2.5 py-1 text-micro">Coming soon</span>
      </span>
    );
  }

  if (href) {
    return (
      <a href={href} className={cn(base, 'text-ink')}>
        {label}
      </a>
    );
  }

  return (
    <NavLink
      to={to as string}
      className={({ isActive }) => cn(base, isActive ? 'text-brand-ink' : 'text-ink')}
    >
      {label}
    </NavLink>
  );
}
