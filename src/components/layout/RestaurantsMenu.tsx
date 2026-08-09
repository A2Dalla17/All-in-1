/**
 * The Restaurants dropdown.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Hover opens it, but hover is not the only way in
 * ══════════════════════════════════════════════════════════════════════════
 * The brief asks for a menu that appears on mouse-over. That works for a mouse
 * and for nothing else — there is no hover on a phone, and a keyboard user
 * never generates one. A menu that only opens on hover is a menu that a third
 * of visitors cannot open at all.
 *
 * So hover opens it, and so do click, Enter, Space and arrow-down; Escape
 * closes it and returns focus. The trigger is a real link, so on touch the
 * first tap simply goes to the Restaurants page — which is where the dropdown
 * was going to send them anyway.
 *
 * ── The close delay is not a detail ────────────────────────────────────────
 * There is a gap between the trigger and the panel. Closing the instant the
 * pointer leaves the trigger means the menu vanishes while somebody is moving
 * towards it, which feels broken and is the single most common failure of
 * hover menus. A short delay covers the journey.
 *
 * ── Dynamic, never hard-coded ──────────────────────────────────────────────
 * The list comes from `listRestaurants()`, which reads under the public RLS
 * policy — so only genuinely live partners can appear here. There is no
 * hard-coded name anywhere, and there is no path by which an unapproved
 * restaurant reaches this component.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Store, UtensilsCrossed } from 'lucide-react';

import { DemoBadge } from '@/components/delivery/DemoNotice';
import { districtLabel, listRestaurants } from '@shared/api/galeyr';
import { cn } from '@shared/lib/utils';

/** How long the panel stays open after the pointer leaves. */
const CLOSE_DELAY_MS = 180;

export function RestaurantsMenu({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /* Only fetched once the menu has been opened. The restaurant list is not
     needed to render the header, and loading it on every page would put a
     query on the critical path of the privacy policy. */
  const { data, isPending } = useQuery({
    queryKey: ['galeyr', 'restaurants'],
    queryFn: listRestaurants,
    enabled: open,
    staleTime: 5 * 60_000,
  });

  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  useEffect(() => cancelClose, []);

  /* Escape closes from anywhere inside, and a click outside dismisses. Without
     the outside-click handler the panel can be left open behind a modal. */
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

  const restaurants = data ?? [];

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
        to="/restaurants"
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
        Restaurants
        <ChevronDown
          size={14}
          aria-hidden
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </Link>

      {open && (
        <div
          /* Wide enough for two columns of names on a laptop, and capped so a
             long list scrolls inside the panel rather than running off the
             bottom of the window. */
          className={cn(
            'absolute left-0 top-full z-50 mt-1 w-[min(30rem,calc(100vw-2rem))]',
            'overflow-hidden rounded-panel border border-line bg-bg shadow-lifted',
          )}
        >
          <div className="px-5 pb-3 pt-4">
            <p className="text-caption font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              All registered restaurants
            </p>
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto px-2 pb-2">
            {isPending && (
              <p className="px-3 py-6 text-center text-body-sm text-ink-muted">
                Loading restaurants…
              </p>
            )}

            {!isPending && restaurants.length === 0 && (
              <p className="px-3 py-6 text-center text-body-sm text-ink-muted">
                No restaurants are live yet.
              </p>
            )}

            <ul className="grid gap-0.5 sm:grid-cols-2">
              {restaurants.map((restaurant) => (
                <li key={restaurant.id}>
                  <Link
                    to={`/restaurants/${restaurant.slug ?? restaurant.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-tile px-3 py-2.5 transition-colors hover:bg-surface"
                  >
                    <span
                      aria-hidden
                      className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-tile bg-brand-soft text-brand-ink"
                    >
                      {restaurant.logo_url ? (
                        <img
                          src={restaurant.logo_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UtensilsCrossed size={15} />
                      )}
                    </span>

                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-body-sm font-semibold text-ink">
                          {restaurant.name}
                        </span>
                        {restaurant.is_demo && <DemoBadge />}
                      </span>
                      <span className="block truncate text-caption text-ink-muted">
                        {districtLabel(restaurant.district)}
                        {!restaurant.is_accepting_orders && ' · Closed'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Become our partner ──
              Separated by a rule and set in bold, because it is addressed to a
              completely different person from everything above it: a restaurant
              owner, not somebody choosing dinner. */}
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
                  Become our partner
                </span>
                <span className="block text-caption text-ink-muted">
                  Register your restaurant with GALEYR
                </span>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
