/**
 * The "Our Partners" dropdown.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why this lists CATEGORIES and no longer lists restaurants
 * ══════════════════════════════════════════════════════════════════════════
 * It used to fetch every live restaurant and show them by name. That was
 * right when Galeyr was a food delivery company. It is not one.
 *
 * Galeyr delivers from supermarkets, pharmacies, cosmetics shops, electronics
 * shops and warehouses too — so a dropdown of restaurant names told every
 * other kind of business that the platform was not for them, and told
 * customers that Galeyr was a food app.
 *
 * It now lists the twelve business categories. Browsing individual businesses
 * happens in the customer app, which is the place built for it; this menu's
 * job is to show BREADTH in one glance.
 *
 * ── Hover opens it, but hover is not the only way in ──────────────────────
 * The brief asks for a menu on mouse-over. That works for a mouse and for
 * nothing else — there is no hover on a phone, and a keyboard user never
 * generates one. A menu that only opens on hover is a menu a third of
 * visitors cannot open at all.
 *
 * So hover opens it, and so do click, Enter, Space and arrow-down; Escape
 * closes it. The trigger is a real link, so on touch the first tap simply
 * goes to the Our Partners page — which lists the same categories.
 *
 * ── The close delay is not a detail ───────────────────────────────────────
 * There is a gap between the trigger and the panel. Closing the instant the
 * pointer leaves the trigger means the menu vanishes while somebody is moving
 * towards it, which feels broken and is the commonest failure of hover menus.
 * A short delay covers the journey.
 *
 * ── The file name is unchanged on purpose ─────────────────────────────────
 * Renaming the file to PartnersMenu.tsx would touch every importer for no
 * behavioural gain. The exported component is `PartnersMenu`; the old name is
 * re-exported so nothing breaks.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Store } from 'lucide-react';

import { GALEYR_CATEGORIES } from '@shared/config/categories';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

/** How long the panel stays open after the pointer leaves. */
const CLOSE_DELAY_MS = 180;

export function PartnersMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  useEffect(() => cancelClose, []);

  /* Escape closes from anywhere inside, and a click outside dismisses.
     Without the outside-click handler the panel can be left open behind a
     modal. */
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <Link
        to="/our-partners"
        aria-expanded={open}
        aria-haspopup="true"
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'flex min-h-11 items-center gap-1.5 rounded-control px-3 py-2',
          'text-body-sm font-medium transition-colors hover:bg-surface',
          active ? 'text-brand-ink' : 'text-ink',
        )}
      >
        Our Partners
        <ChevronDown
          size={14}
          aria-hidden
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </Link>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-[min(34rem,calc(100vw-2rem))]',
            'overflow-hidden rounded-panel border border-line bg-bg shadow-lifted',
          )}
        >
          <div className="px-5 pb-3 pt-4">
            <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              What we deliver
            </p>
          </div>

          <div className="max-h-[min(26rem,60vh)] overflow-y-auto px-2 pb-2">
            <ul className="grid gap-0.5 sm:grid-cols-2">
              {GALEYR_CATEGORIES.map((category) => (
                <li key={category.slug}>
                  {/* An <a>, not a <Link>: the customer app is a separate
                      application on a different origin, so react-router would
                      404 on it. The origin comes from env so the two halves
                      can deploy independently. */}
                  <a
                    href={`${env.customerAppUrl}/c/${category.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-tile px-3 py-2.5 transition-colors hover:bg-surface"
                  >
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
                    >
                      <Store size={15} />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-semibold text-ink">
                        {category.label}
                      </span>
                      <span className="block truncate text-caption text-ink-muted">
                        {category.labelSo}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Become Our Partner ──
              Separated by a rule and set in bold, because it addresses a
              completely different person from everything above it: a business
              owner, not somebody deciding what to order. */}
          <div className="border-t border-line bg-surface p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/partners');
              }}
              className="group flex w-full items-center gap-3 rounded-tile px-3 py-3 text-left transition-colors hover:bg-card"
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-tile brand-gradient text-white"
              >
                <Store size={17} />
              </span>

              <span>
                <span className="block text-body font-extrabold uppercase tracking-wide text-brand-ink">
                  Become Our Partner
                </span>
                <span className="block text-caption text-ink-muted">
                  Restaurant, shop, pharmacy, warehouse — list your business
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Old name, kept so existing importers keep working. */
export const RestaurantsMenu = PartnersMenu;
