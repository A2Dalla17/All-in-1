/**
 * Checkout.
 *
 * ── The address problem, and why this form looks like this ─────────────────
 * Mogadishu has no postcodes and most streets have no signed names. A courier
 * finds a customer by district, then by a landmark, then by ringing them. That
 * is not a limitation to work around — it is how the city works — so the form
 * asks for exactly those three things and nothing else.
 *
 * A search box expecting "123 Main Street" would be unanswerable, and a map pin
 * would be a worse address than "Hodan, near the blue mosque".
 *
 * ── No account ─────────────────────────────────────────────────────────────
 * Registration before a first order is the largest drop-off point in food
 * delivery, and it buys the customer nothing: the order is found later by
 * number plus phone. So there is no sign-up here, and no password.
 */

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Banknote, Phone } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Input, Textarea } from '@shared/components/ui/Input';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  DISTRICTS,
  formatUsd,
  getRestaurant,
  placeOrder,
  type District,
} from '@shared/api/galeyr';
import { cartSubtotalCents, clearCart, useCart } from '@shared/lib/cart';
import { cn } from '@shared/lib/utils';

/**
 * Somali mobile numbers are nine digits after the country code. Checking the
 * digit count rather than a strict pattern accepts `0611234567`,
 * `+252 61 123 4567` and `252611234567` — all of which a person may reasonably
 * type, and all of which reach the same phone.
 */
function phoneIsPlausible(value: string): boolean {
  return value.replace(/\D/g, '').length >= 9;
}

export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState<District | ''>('');
  const [landmark, setLandmark] = useState('');
  const [addressNotes, setAddressNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  const { data: restaurant, isPending } = useQuery({
    queryKey: ['galeyr', 'restaurant', cart.restaurantId],
    queryFn: () => getRestaurant(cart.restaurantId as string),
    enabled: Boolean(cart.restaurantId),
  });

  const mutation = useMutation({
    mutationFn: placeOrder,
    onSuccess: (result) => {
      /* Cleared only after the database has confirmed the order. Clearing
         optimistically and then failing would leave the customer with neither
         an order nor the food they had chosen. */
      clearCart();
      navigate(`/order/${result.orderNumber}`, {
        state: { totalCents: result.totalCents, phone },
      });
    },
  });

  if (cart.lines.length === 0) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Your order is empty"
          description="Choose a restaurant and add some food first."
          action={
            <Link to="/restaurants">
              <Button>Browse restaurants</Button>
            </Link>
          }
        />
      </Container>
    );
  }

  if (isPending || !restaurant) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="Loading" />
      </div>
    );
  }

  const subtotal = cartSubtotalCents(cart);
  const total = subtotal + restaurant.delivery_fee_cents;

  const errors = {
    name: name.trim().length < 2 ? 'Please enter your name' : '',
    phone: phoneIsPlausible(phone) ? '' : 'Enter a phone number the courier can call',
    district: district ? '' : 'Choose your district',
    landmark: landmark.trim().length < 3 ? 'Describe a landmark near you' : '',
  };
  const isValid = Object.values(errors).every((e) => !e);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid || !district) return;

    mutation.mutate({
      restaurantId: restaurant!.id,
      customerName: name,
      customerPhone: phone,
      district,
      landmark,
      addressNotes,
      notes,
      /* Item ids and quantities only. Prices are looked up server-side — see
         galeyr_place_order. */
      items: cart.lines.map((l) => ({ menu_item_id: l.menuItemId, quantity: l.quantity })),
    });
  }

  return (
    <Container className="py-8 sm:py-12" size="narrow">
      <h1 className="text-h2 font-extrabold tracking-tight text-ink">Checkout</h1>
      <p className="mt-2 text-body text-ink-muted">
        From <strong className="text-ink">{restaurant.name}</strong>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8" noValidate>
        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">Who is this for?</h2>

          <Input
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={touched ? errors.name : ''}
            autoComplete="name"
            inputSize="lg"
          />

          <Input
            label="Phone number"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={touched ? errors.phone : ''}
            hint="The courier will call this number when they are close."
            placeholder="061 123 4567"
            leadingIcon={<Phone size={18} />}
            autoComplete="tel"
            inputSize="lg"
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">Where is it going?</h2>

          <div>
            <label
              htmlFor="district"
              className="mb-1.5 block text-body-sm font-semibold text-ink"
            >
              District · Degmo
            </label>
            <select
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value as District)}
              className={cn(
                'h-12 w-full rounded-input border bg-card px-4 text-body text-ink',
                'focus:outline-none focus:ring-2 focus:ring-brand/25',
                touched && errors.district ? 'border-danger' : 'border-line focus:border-brand',
              )}
            >
              <option value="">Choose a district</option>
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {touched && errors.district && (
              <p className="mt-1.5 text-caption text-danger">{errors.district}</p>
            )}
          </div>

          <Input
            label="Landmark"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            error={touched ? errors.landmark : ''}
            hint="Something the courier will recognise — a mosque, a school, a well-known shop."
            placeholder="Near the blue mosque"
            inputSize="lg"
          />

          <Textarea
            label="Extra directions (optional)"
            value={addressNotes}
            onChange={(e) => setAddressNotes(e.target.value)}
            hint="Gate colour, floor, which side of the road."
            rows={2}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-h5 font-bold text-ink">Anything else?</h2>
          <Textarea
            label="Note for the restaurant (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="No onions, please"
            rows={2}
          />
        </section>

        {/* ── Payment ──
            One method, stated rather than chosen. A radio group with a single
            option is a decision that isn't one. Card and mobile money are in
            the schema and will appear here when they are actually connected —
            not before, because an option that fails is worse than an absent
            one. */}
        <section className="rounded-card border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <Banknote size={20} aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
            <div>
              <p className="font-semibold text-ink">Cash on delivery</p>
              <p className="mt-0.5 text-body-sm text-ink-muted">
                Pay the courier {formatUsd(total)} when your food arrives. Lacag caddaan ah.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-line bg-card p-5">
          <h2 className="text-h5 font-bold text-ink">Your order</h2>

          <ul className="mt-4 space-y-2 text-body-sm">
            {cart.lines.map((line) => (
              <li key={line.menuItemId} className="flex justify-between gap-4">
                <span className="text-ink-muted">
                  {line.quantity} × {line.name}
                </span>
                <span className="shrink-0 font-semibold text-ink">
                  {formatUsd(line.priceCents * line.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-body-sm">
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
              <dt className="font-bold text-ink">Total to pay</dt>
              <dd className="font-bold text-ink">{formatUsd(total)}</dd>
            </div>
          </dl>

          {/* The displayed total is this browser's arithmetic. The database
              re-prices from the menu when the order is created, so a stale cart
              cannot lock in yesterday's price. */}
        </section>

        {mutation.isError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-card border border-danger/40 bg-danger-soft p-4"
          >
            <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger-ink" />
            <p className="text-body-sm text-danger-ink">{mutation.error.message}</p>
          </div>
        )}

        <Button
          type="submit"
          size="xl"
          fullWidth
          loading={mutation.isPending}
          disabled={mutation.isPending}
        >
          Place order · {formatUsd(total)}
        </Button>
      </form>
    </Container>
  );
}
