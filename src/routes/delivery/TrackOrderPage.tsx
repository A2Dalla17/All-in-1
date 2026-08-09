/**
 * Track an order.
 *
 * Reached two ways: typed in from the header by someone who ordered an hour
 * ago, or linked to straight after checkout with the number already filled in.
 * Both land here so there is one implementation of the progress display.
 */

import { Fragment, useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Check, CircleDashed, Phone, XCircle } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { Input } from '@shared/components/ui/Input';
import {
  districtLabel,
  formatUsd,
  ORDER_STAGES,
  ORDER_STATUS_LABEL,
  trackOrder,
  type OrderStatus,
  type TrackedOrder,
} from '@shared/api/galeyr';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

export function TrackOrderPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { orderNumber: fromUrl } = useParams();
  const location = useLocation();
  const prefilledPhone = (location.state as { phone?: string } | null)?.phone ?? '';

  const [orderNumber, setOrderNumber] = useState(fromUrl ?? '');
  const [phone, setPhone] = useState(prefilledPhone);
  const [notFound, setNotFound] = useState(false);

  const mutation = useMutation({
    mutationFn: () => trackOrder(orderNumber, phone),
    onSuccess: (order) => setNotFound(order === null),
  });

  /* Arriving from checkout, both fields are already known — looking them up
     automatically saves a customer retyping what they just typed. */
  const { mutate } = mutation;
  useEffect(() => {
    if (fromUrl && prefilledPhone) mutate();
  }, [fromUrl, prefilledPhone, mutate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNotFound(false);
    mutation.mutate();
  }

  const order = mutation.data ?? null;

  /* Inside the Delivery Hub the page title and the surrounding Container are
     already provided by the layout, so rendering them again would produce two
     headings and double padding. */
  const Wrapper = embedded ? Fragment : Container;
  const wrapperProps = embedded ? {} : { className: 'py-8 sm:py-12', size: 'narrow' as const };

  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <>
          <h1 className="text-h2 font-extrabold tracking-tight text-ink">Track your order</h1>
          <p className="mt-2 text-body text-ink-muted">
            Enter your order number and the phone number you gave when you ordered.
          </p>
        </>
      )}

      {embedded && (
        <h2 className="text-h4 font-bold text-ink">Track your order</h2>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Input
          label="Order number"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="G-260809-0001"
          inputSize="lg"
          autoCapitalize="characters"
        />

        <Input
          label="Phone number"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="061 123 4567"
          leadingIcon={<Phone size={18} />}
          inputSize="lg"
          /* Said plainly, because a customer who mistypes it and sees "not
             found" will otherwise assume the order itself is lost. */
          hint="The same number you used when ordering."
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={mutation.isPending}
          disabled={!orderNumber.trim() || !phone.trim() || mutation.isPending}
        >
          Find my order
        </Button>
      </form>

      {notFound && (
        <div
          role="status"
          className="mt-6 rounded-card border border-line bg-surface p-5 text-body-sm text-ink-muted"
        >
          <p className="font-semibold text-ink">We could not find that order</p>
          <p className="mt-1">
            Check the order number and make sure the phone number is the one you gave when
            ordering. If you are still stuck, call the control room on{' '}
            <a href={`tel:${env.controlCentre.tel}`} className="font-semibold text-brand-ink">
              {env.controlCentre.display}
            </a>
            .
          </p>
        </div>
      )}

      {mutation.isError && (
        <p role="alert" className="mt-6 text-body-sm text-danger">
          {mutation.error.message}
        </p>
      )}

      {order && <OrderProgress order={order} />}
    </Wrapper>
  );
}

/* -------------------------------------------------------------------------- */

export function OrderProgress({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === 'cancelled';

  /**
   * Timestamps per stage, so a completed step can show when it happened.
   * `received` uses placed_at; `preparing` has no column of its own and
   * borrows the acceptance time, which is when the kitchen started.
   */
  const stamps: Record<OrderStatus, string | null> = {
    received: order.placed_at,
    restaurant_accepted: order.accepted_at,
    preparing: order.accepted_at,
    ready_for_pickup: order.ready_at,
    courier_assigned: order.assigned_at,
    out_for_delivery: order.picked_up_at,
    delivered: order.delivered_at,
    cancelled: order.cancelled_at,
  };

  const currentIndex = ORDER_STAGES.indexOf(order.status);

  return (
    <section className="mt-8 rounded-card border border-line bg-card p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
            {order.order_number}
          </p>
          <h2 className="mt-1 text-h4 font-bold text-ink">{order.restaurant_name}</h2>
          <p className="mt-1 text-body-sm text-ink-muted">
            {districtLabel(order.district)} · {order.landmark}
          </p>
        </div>

        <div className="text-right">
          <p className="text-h4 font-bold text-ink">{formatUsd(order.total_cents)}</p>
          <p className="text-caption text-ink-muted">Cash on delivery</p>
        </div>
      </header>

      {cancelled ? (
        <div className="mt-6 flex items-start gap-3 rounded-card border border-danger/35 bg-danger-soft p-4">
          <XCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger-ink" />
          <div className="text-body-sm text-danger-ink">
            <p className="font-semibold">This order was cancelled</p>
            {order.cancellation_reason && <p className="mt-1">{order.cancellation_reason}</p>}
            <p className="mt-1">You do not owe anything.</p>
          </div>
        </div>
      ) : (
        <ol className="mt-6 space-y-0">
          {ORDER_STAGES.map((stage, index) => {
            const done = index < currentIndex;
            const current = index === currentIndex;
            const stamp = stamps[stage];

            return (
              <li key={stage} className="flex gap-4">
                {/* Marker and the line joining it to the next step. The line is
                    omitted on the last item so the list does not trail off. */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2',
                      done && 'border-success bg-success text-white',
                      current && 'border-brand bg-brand text-white',
                      !done && !current && 'border-line bg-card text-ink-subtle',
                    )}
                  >
                    {done ? (
                      <Check size={15} aria-hidden />
                    ) : (
                      <CircleDashed size={15} aria-hidden />
                    )}
                  </span>

                  {index < ORDER_STAGES.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        'w-0.5 flex-1 py-0',
                        done ? 'bg-success' : 'bg-line',
                      )}
                      style={{ minHeight: '1.5rem' }}
                    />
                  )}
                </div>

                <div className={cn('pb-6', index === ORDER_STAGES.length - 1 && 'pb-0')}>
                  <p
                    className={cn(
                      'text-body font-semibold',
                      current ? 'text-brand-ink' : done ? 'text-ink' : 'text-ink-subtle',
                    )}
                  >
                    {ORDER_STATUS_LABEL[stage].en}
                  </p>
                  <p className="text-caption text-ink-subtle">
                    {ORDER_STATUS_LABEL[stage].so}
                  </p>

                  {stamp && (done || current) && (
                    <p className="mt-0.5 text-caption text-ink-muted">
                      {new Date(stamp).toLocaleTimeString(env.locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {order.courier_name && !cancelled && (
        <div className="mt-2 rounded-card border border-line bg-surface p-4">
          <p className="text-body-sm text-ink-muted">Your courier</p>
          <p className="font-semibold text-ink">
            {order.courier_name}
            {order.courier_code && (
              <span className="ml-2 text-body-sm font-normal text-ink-muted">
                {order.courier_code}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`tel:${env.controlCentre.tel}`}>
          <Button variant="outline" leadingIcon={<Phone size={16} />}>
            Call the control room
          </Button>
        </a>
        <Link to="/restaurants">
          <Button variant="ghost">Order again</Button>
        </Link>
      </div>
    </section>
  );
}
