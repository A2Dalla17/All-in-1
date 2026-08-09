/**
 * Restaurant profile and takings.
 *
 * ── What a restaurant may change, and what it may not ──────────────────────
 * Editable here: the things a restaurant knows better than we do — its phone
 * number, its landmark, how long it takes to cook, its description.
 *
 * Not editable here: `status`, `commission_rate`, `is_demo`. Those are terms of
 * the relationship between two businesses, not settings. A restaurant lowering
 * its own commission, or switching itself from `pending` to `active` and
 * appearing on the site before anyone has agreed to work with it, is not a
 * feature — and the database refuses it regardless of what this form sends,
 * because the staff UPDATE policy is what governs the write, not this file.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, TrendingUp } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Input, Textarea } from '@shared/components/ui/Input';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  DISTRICTS,
  formatUsd,
  listRestaurantOrders,
  updateRestaurantProfile,
  type District,
  type Restaurant,
} from '@shared/api/galeyr';

export function PortalSettings({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState(restaurant.phone);
  const [landmark, setLandmark] = useState(restaurant.landmark);
  const [district, setDistrict] = useState<District>(restaurant.district);
  const [description, setDescription] = useState(restaurant.description ?? '');
  const [nameSo, setNameSo] = useState(restaurant.name_so ?? '');
  const [prepTime, setPrepTime] = useState(String(restaurant.prep_time_minutes));

  const save = useMutation({
    mutationFn: () =>
      updateRestaurantProfile(restaurant.id, {
        phone: phone.trim(),
        landmark: landmark.trim(),
        district,
        description: description.trim() || null,
        name_so: nameSo.trim() || null,
        prep_time_minutes: Math.max(5, Math.min(120, Number(prepTime) || 25)),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['galeyr', 'my-restaurants'] }),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,20rem] lg:items-start">
      <section>
        <h2 className="text-h5 font-bold text-ink">Your details</h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          Customers and couriers see these.
        </p>

        <div className="mt-5 space-y-4">
          <Input
            label="Somali name (optional)"
            value={nameSo}
            onChange={(e) => setNameSo(e.target.value)}
            inputSize="lg"
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <Input
            label="Phone number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            hint="Our control room calls this when there is a problem with an order."
            inputSize="lg"
          />

          <div>
            <label
              htmlFor="r-district"
              className="mb-1.5 block text-body-sm font-semibold text-ink"
            >
              District
            </label>
            <select
              id="r-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value as District)}
              className="h-12 w-full rounded-input border border-line bg-card px-4 text-body text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              {DISTRICTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Landmark"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            hint="How a courier finds your kitchen."
            inputSize="lg"
          />

          <Input
            label="Preparation time (minutes)"
            type="number"
            min={5}
            max={120}
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            /* An honest number here is worth more than a flattering one: a
               customer told 20 minutes who waits 45 complains, whereas one told
               45 who waits 40 is pleased. */
            hint="Be realistic. Customers see this before they order."
            inputSize="lg"
          />

          {save.isError && (
            <p role="alert" className="text-body-sm text-danger">
              {save.error.message}
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button size="lg" loading={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>

            {save.isSuccess && !save.isPending && (
              <span className="flex items-center gap-1.5 text-body-sm font-semibold text-success-ink">
                <Check size={16} aria-hidden />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Read-only, and said plainly rather than hidden. A restaurant should
            be able to see its own commercial terms; it just cannot set them. */}
        <dl className="mt-8 rounded-card border border-line bg-surface p-5 text-body-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Delivery fee to customer</dt>
            <dd className="font-semibold text-ink">
              {formatUsd(restaurant.delivery_fee_cents)}
            </dd>
          </div>
          <div className="mt-2 flex justify-between gap-4">
            <dt className="text-ink-muted">Minimum order</dt>
            <dd className="font-semibold text-ink">
              {formatUsd(restaurant.minimum_order_cents)}
            </dd>
          </div>
          {restaurant.commission_rate !== undefined && (
            <div className="mt-2 flex justify-between gap-4">
              <dt className="text-ink-muted">AC7 GALEYR commission</dt>
              <dd className="font-semibold text-ink">{restaurant.commission_rate}%</dd>
            </div>
          )}
          <p className="mt-4 text-caption text-ink-subtle">
            These are agreed with AC7 GALEYR. To change them, speak to the control room.
          </p>
        </dl>
      </section>

      <Revenue restaurantId={restaurant.id} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * What the restaurant has taken.
 *
 * ── Delivered orders only ──────────────────────────────────────────────────
 * Payment is cash on delivery. An order being cooked is not money, and a
 * cancelled one never was. Counting either would show a restaurant income it
 * does not have — and this is the number an owner will use to decide whether
 * AC7 GALEYR is worth staying with, so it has to be the truth.
 */
function Revenue({ restaurantId }: { restaurantId: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['galeyr', 'restaurant-orders', restaurantId, true],
    queryFn: () => listRestaurantOrders(restaurantId, { active: false }),
  });

  const summary = useMemo(() => {
    const orders = data ?? [];
    const delivered = orders.filter((o) => o.status === 'delivered');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const deliveredToday = delivered.filter(
      (o) => new Date(o.placed_at) >= startOfToday,
    );

    /* The restaurant's share is the food, not the delivery fee — that belongs
       to AC7 GALEYR and the courier, and including it would overstate what the
       kitchen actually earns. */
    const food = (list: typeof delivered) =>
      list.reduce((sum, o) => sum + o.subtotal_cents, 0);

    return {
      today: deliveredToday.length,
      todayCents: food(deliveredToday),
      total: delivered.length,
      totalCents: food(delivered),
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [data]);

  return (
    <aside className="rounded-card border border-line bg-card p-5">
      <h2 className="flex items-center gap-2 text-h5 font-bold text-ink">
        <TrendingUp size={18} aria-hidden />
        Your takings
      </h2>

      {isPending ? (
        <div className="flex justify-center py-8">
          <Spinner label="Loading" />
        </div>
      ) : (
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-body-sm text-ink-muted">Delivered today</dt>
            <dd className="text-h3 font-extrabold text-ink">
              {formatUsd(summary.todayCents)}
            </dd>
            <dd className="text-caption text-ink-subtle">
              {summary.today} order{summary.today === 1 ? '' : 's'}
            </dd>
          </div>

          <div className="border-t border-line pt-4">
            <dt className="text-body-sm text-ink-muted">Delivered in the last 100 orders</dt>
            <dd className="text-h4 font-bold text-ink">{formatUsd(summary.totalCents)}</dd>
            <dd className="text-caption text-ink-subtle">{summary.total} orders</dd>
          </div>

          {summary.cancelled > 0 && (
            <div className="border-t border-line pt-4">
              <dt className="text-body-sm text-ink-muted">Cancelled</dt>
              <dd className="text-h4 font-bold text-ink">{summary.cancelled}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="mt-5 border-t border-line pt-4 text-caption text-ink-subtle">
        Food only — the delivery fee is not yours. Commission is settled separately and is
        not deducted from these figures.
      </p>
    </aside>
  );
}
