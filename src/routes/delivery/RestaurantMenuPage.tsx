/**
 * A restaurant's menu, and the cart.
 *
 * Two panels on a desktop; on a phone the cart is a bar pinned to the bottom
 * that expands, because a cart the customer has to scroll to find is a cart
 * they forget they have.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowUpRight, Clock, Minus, Plus, Smartphone, Star,
  ShoppingBag, Trash2,
} from 'lucide-react';

import { DemoBadge, DemoNotice } from '@/components/delivery/DemoNotice';
import { RestaurantCommunity } from '@/components/delivery/RestaurantCommunity';
import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { ErrorState } from '@shared/components/ui/EmptyState';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  districtLabel,
  formatUsd,
  getMenu,
  getRestaurantBySlug,
  type MenuItem,
} from '@shared/api/galeyr';
import {
  addItem,
  cartSubtotalCents,
  clearCart,
  removeItem,
  replaceRestaurant,
  setQuantity,
  useCart,
} from '@shared/lib/cart';
import { cn } from '@shared/lib/utils';

export function RestaurantMenuPage() {
  /* The route param is a slug now, but may still be a uuid from an older
     link. `getRestaurantBySlug` handles both. */
  const { restaurantId = '' } = useParams();
  const cart = useCart();

  /** Set when a customer adds food while holding another restaurant's order. */
  const [conflict, setConflict] = useState<{ item: MenuItem; holding: string } | null>(null);

  const restaurantQuery = useQuery({
    queryKey: ['galeyr', 'restaurant', restaurantId],
    queryFn: () => getRestaurantBySlug(restaurantId),
    enabled: Boolean(restaurantId),
  });

  const restaurant = restaurantQuery.data;

  /* Keyed on the resolved id, not the URL param — otherwise the same
     restaurant reached by slug and by uuid would occupy two cache entries and
     fetch its menu twice. */
  const menuQuery = useQuery({
    queryKey: ['galeyr', 'menu', restaurant?.id],
    queryFn: () => getMenu(restaurant!.id),
    enabled: Boolean(restaurant?.id),
  });

  /** Items grouped under their category, in the restaurant's own order. */
  const sections = useMemo(() => {
    const { categories = [], items = [] } = menuQuery.data ?? {};

    const grouped = categories.map((category) => ({
      category,
      items: items.filter((i) => i.category_id === category.id),
    }));

    const uncategorised = items.filter((i) => !i.category_id);
    if (uncategorised.length > 0) {
      grouped.push({
        category: {
          id: 'other',
          restaurant_id: restaurant?.id ?? '',
          name: 'Other',
          name_so: null,
          sort_order: 999,
        },
        items: uncategorised,
      });
    }

    // A category with nothing in it is a heading with no content.
    return grouped.filter((g) => g.items.length > 0);
  }, [menuQuery.data, restaurant?.id]);

  if (restaurantQuery.isPending || menuQuery.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="Loading menu" />
      </div>
    );
  }

  if (restaurantQuery.isError || !restaurant) {
    return (
      <Container className="py-16">
        <ErrorState
          title="Restaurant not found"
          description="It may have closed or the link may be wrong."
        />
        <div className="mt-6 flex justify-center">
          <Link to="/restaurants">
            <Button variant="outline">Back to restaurants</Button>
          </Link>
        </div>
      </Container>
    );
  }

  function handleAdd(item: MenuItem) {
    const result = addItem(
      restaurant!.id,
      restaurant!.name,
      { menuItemId: item.id, name: item.name, priceCents: item.price_cents },
    );

    if (!result.ok) setConflict({ item, holding: result.conflictWith ?? 'another restaurant' });
  }

  const subtotal = cartSubtotalCents(cart);
  const belowMinimum = subtotal > 0 && subtotal < restaurant.minimum_order_cents;

  return (
    <Container className="py-8 sm:py-12">
      <Link
        to="/restaurants"
        className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden />
        All restaurants
      </Link>

      {/* ── Cover image ──
          Rendered only when the restaurant has supplied one. A grey placeholder
          block in its place would look like a broken image on every partner who
          has not sent artwork yet — which is all of them at the moment. */}
      {restaurant.cover_image_url && (
        <div className="mt-4 overflow-hidden rounded-card border border-line">
          <img
            src={restaurant.cover_image_url}
            alt=""
            className="aspect-[21/9] w-full object-cover sm:aspect-[3/1]"
          />
        </div>
      )}

      <header className="mt-4 flex flex-wrap items-start gap-4">
        {restaurant.logo_url && (
          <img
            src={restaurant.logo_url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-card border border-line object-cover sm:h-20 sm:w-20"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-h2 font-extrabold tracking-tight text-ink">{restaurant.name}</h1>
            {restaurant.is_demo && <DemoBadge />}

            <span
              className={cn(
                'rounded-pill px-2.5 py-1 text-caption font-bold',
                restaurant.is_accepting_orders
                  ? 'bg-success-soft text-success-ink'
                  : 'bg-surface text-ink-subtle',
              )}
            >
              {restaurant.is_accepting_orders ? 'Open' : 'Closed'}
            </span>

            {/* Only when there are actually ratings. "0.0 ★" on a restaurant's
                first day is worse than no rating at all. */}
            {restaurant.rating != null && (restaurant.rating_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-body-sm font-semibold text-ink">
                <Star size={14} aria-hidden className="fill-warning text-warning" />
                {restaurant.rating.toFixed(1)}
                <span className="font-normal text-ink-subtle">
                  ({restaurant.rating_count})
                </span>
              </span>
            )}
          </div>

          {restaurant.cuisine && restaurant.cuisine.length > 0 && (
            <p className="mt-1.5 text-body-sm text-ink-muted">
              {restaurant.cuisine.join(' · ')}
            </p>
          )}

          {restaurant.description && (
            <p className="mt-2 max-w-prose text-body text-ink-muted">
              {restaurant.description}
            </p>
          )}

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-ink-muted">
            <span>{districtLabel(restaurant.district)} · {restaurant.landmark}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden />
              {restaurant.prep_time_minutes} min prep
            </span>
            <span>{formatUsd(restaurant.delivery_fee_cents)} delivery</span>
            {restaurant.minimum_order_cents > 0 && (
              <span>{formatUsd(restaurant.minimum_order_cents)} minimum</span>
            )}
          </p>

          {/* ── Their site, and ours ──
              An external link only when they actually have one. A "Visit
              website" button leading nowhere is worse than its absence. */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {restaurant.website_url && (
              <a
                href={restaurant.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-ink hover:underline"
              >
                Visit restaurant website
                <ArrowUpRight size={14} aria-hidden />
              </a>
            )}

            {(restaurant.ios_app_url || restaurant.android_app_url) && (
              <span className="inline-flex items-center gap-2 text-body-sm text-ink-muted">
                <Smartphone size={14} aria-hidden />
                Their app:
                {restaurant.ios_app_url && (
                  <a
                    href={restaurant.ios_app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-ink hover:underline"
                  >
                    iPhone
                  </a>
                )}
                {restaurant.android_app_url && (
                  <a
                    href={restaurant.android_app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand-ink hover:underline"
                  >
                    Android
                  </a>
                )}
              </span>
            )}

            {/* GALEYR's own app is not released. Stated as coming soon rather
                than linked to a store page that does not exist. */}
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1 text-caption font-medium text-ink-subtle">
              <Smartphone size={12} aria-hidden />
              GALEYR App — coming soon
            </span>
          </div>
        </div>
      </header>

      {!restaurant.is_accepting_orders && (
        <p className="mt-4 rounded-card border border-line bg-surface px-4 py-3 text-body-sm text-ink-muted">
          This restaurant is not taking orders at the moment. You can still look at the menu.
        </p>
      )}

      {restaurant.is_demo && <DemoNotice className="mt-6" />}

      {/* The restaurant's own offers and announcements. Renders nothing when
          they have none running. */}
      <RestaurantCommunity restaurantId={restaurant.id} restaurantName={restaurant.name} />

      <div className="mt-8 gap-8 lg:flex lg:items-start">
        {/* ── Menu ── */}
        <div className="min-w-0 flex-1 space-y-10">
          {sections.map(({ category, items }) => (
            <section key={category.id}>
              <h2 className="text-h4 font-bold text-ink">
                {category.name}
                {category.name_so && (
                  <span className="ml-2 text-body font-normal text-ink-subtle">
                    {category.name_so}
                  </span>
                )}
              </h2>

              <ul className="mt-4 divide-y divide-line rounded-card border border-line bg-card">
                {items.map((item) => {
                  const inCart = cart.lines.find((l) => l.menuItemId === item.id);

                  return (
                    <li key={item.id} className="flex items-start gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'font-semibold text-ink',
                            !item.is_available && 'text-ink-subtle line-through',
                          )}
                        >
                          {item.name}
                        </p>
                        {item.name_so && (
                          <p className="text-body-sm text-ink-subtle">{item.name_so}</p>
                        )}
                        {item.description && (
                          <p className="mt-1 text-body-sm text-ink-muted">{item.description}</p>
                        )}
                        <p className="mt-2 font-bold text-ink">{formatUsd(item.price_cents)}</p>
                      </div>

                      {!item.is_available ? (
                        <span className="shrink-0 rounded-pill bg-surface px-3 py-1.5 text-caption font-semibold text-ink-subtle">
                          Sold out
                        </span>
                      ) : inCart ? (
                        <QuantityStepper
                          quantity={inCart.quantity}
                          onChange={(q) => setQuantity(item.id, q)}
                        />
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          leadingIcon={<Plus size={15} />}
                          disabled={!restaurant.is_accepting_orders}
                          onClick={() => handleAdd(item)}
                        >
                          Add
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* ── Cart ──
            Sticky on desktop so it stays beside a long menu; on a phone it
            falls back to a normal block at the end of the page, below a
            fixed summary bar. */}
        <aside className="mt-10 lg:sticky lg:top-24 lg:mt-0 lg:w-80 lg:shrink-0">
          <div className="rounded-card border border-line bg-card p-5">
            <h2 className="flex items-center gap-2 text-h5 font-bold text-ink">
              <ShoppingBag size={18} aria-hidden />
              Your order
            </h2>

            {cart.lines.length === 0 ? (
              <p className="mt-4 text-body-sm text-ink-muted">
                Nothing added yet. Choose something from the menu.
              </p>
            ) : (
              <>
                <ul className="mt-4 space-y-3">
                  {cart.lines.map((line) => (
                    <li key={line.menuItemId} className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-sm font-semibold text-ink">
                          {line.name}
                        </p>
                        <p className="text-caption text-ink-muted">
                          {line.quantity} × {formatUsd(line.priceCents)}
                        </p>
                      </div>

                      <span className="shrink-0 text-body-sm font-semibold text-ink">
                        {formatUsd(line.priceCents * line.quantity)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeItem(line.menuItemId)}
                        aria-label={`Remove ${line.name}`}
                        className="shrink-0 rounded-tile p-1 text-ink-subtle hover:bg-surface hover:text-danger"
                      >
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>

                <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-body-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Subtotal</dt>
                    <dd className="font-semibold text-ink">{formatUsd(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-muted">Delivery</dt>
                    <dd className="font-semibold text-ink">
                      {formatUsd(restaurant.delivery_fee_cents)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-2 text-body">
                    <dt className="font-bold text-ink">Total</dt>
                    <dd className="font-bold text-ink">
                      {formatUsd(subtotal + restaurant.delivery_fee_cents)}
                    </dd>
                  </div>
                </dl>

                {belowMinimum && (
                  <p className="mt-3 text-caption font-semibold text-warning-ink">
                    Add {formatUsd(restaurant.minimum_order_cents - subtotal)} more to reach
                    the {formatUsd(restaurant.minimum_order_cents)} minimum.
                  </p>
                )}

                <Link to="/checkout" className="mt-4 block">
                  <Button
                    fullWidth
                    size="lg"
                    disabled={belowMinimum || !restaurant.is_accepting_orders}
                  >
                    Checkout
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-3 w-full text-caption text-ink-subtle hover:text-ink"
                >
                  Clear order
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* ── The one-restaurant rule, explained rather than enforced silently ──
          Wiping a cart without warning is how a customer loses eleven dollars
          of chosen food and never finds out why. */}
      <Modal
        open={conflict !== null}
        onClose={() => setConflict(null)}
        title="Start a new order?"
      >
        <p className="text-body text-ink-muted">
          Your order already has food from <strong className="text-ink">{conflict?.holding}</strong>.
          One delivery comes from one restaurant, so adding this will empty your current order.
        </p>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setConflict(null)}>
            Keep current order
          </Button>
          <Button
            fullWidth
            onClick={() => {
              if (conflict) {
                replaceRestaurant(restaurant.id, restaurant.name, {
                  menuItemId: conflict.item.id,
                  name: conflict.item.name,
                  priceCents: conflict.item.price_cents,
                });
              }
              setConflict(null);
            }}
          >
            Start new order
          </Button>
        </div>
      </Modal>
    </Container>
  );
}

function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-pill border border-line">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label="Reduce quantity"
        className="grid h-9 w-9 place-items-center rounded-pill text-ink-muted hover:bg-surface"
      >
        <Minus size={15} aria-hidden />
      </button>

      <span aria-live="polite" className="w-6 text-center text-body-sm font-bold text-ink">
        {quantity}
      </span>

      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
        className="grid h-9 w-9 place-items-center rounded-pill text-ink-muted hover:bg-surface"
      >
        <Plus size={15} aria-hidden />
      </button>
    </div>
  );
}
