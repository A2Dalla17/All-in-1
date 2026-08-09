/**
 * The kitchen's live order board, and the day's history.
 *
 * ── Why it polls ───────────────────────────────────────────────────────────
 * An order that arrives and sits unseen for ten minutes is the single worst
 * failure this product has: the customer is waiting, the restaurant does not
 * know, and nobody finds out until someone rings the control room.
 *
 * Supabase Realtime would be the elegant answer, and is the right one later.
 * Polling every fifteen seconds is the one that works on a tablet whose
 * websocket dies whenever the wifi drops and does not reconnect. Fifteen
 * seconds is a handful of tiny requests a minute — nothing against the cost of
 * missing an order.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Check, ChefHat, Clock, Phone, X } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import { Textarea } from '@shared/components/ui/Input';
import {
  cancelOrder,
  districtLabel,
  formatUsd,
  listRestaurantOrders,
  ORDER_STATUS_LABEL,
  setOrderStatus,
  type OrderStatus,
  type OrderWithDetail,
  type Restaurant,
} from '@shared/api/galeyr';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

/**
 * The one action a restaurant takes on an order at each stage.
 *
 * `from` is not decoration — it is passed to the update as a guard so the write
 * only lands if the order is still where this screen thought it was. Two
 * tablets in one kitchen, or a double tap on a slow connection, would otherwise
 * both succeed and the second could drag an order backwards.
 */
const NEXT_ACTION: Partial<
  Record<OrderStatus, { label: string; next: OrderStatus; from: OrderStatus[] }>
> = {
  received: {
    label: 'Accept order',
    next: 'restaurant_accepted',
    from: ['received'],
  },
  restaurant_accepted: {
    label: 'Start cooking',
    next: 'preparing',
    from: ['restaurant_accepted'],
  },
  preparing: {
    label: 'Food is ready',
    next: 'ready_for_pickup',
    from: ['preparing'],
  },
};

export function PortalOrders({ restaurant }: { restaurant: Restaurant }) {
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [cancelling, setCancelling] = useState<OrderWithDetail | null>(null);

  const query = useQuery({
    queryKey: ['galeyr', 'restaurant-orders', restaurant.id, showHistory],
    queryFn: () => listRestaurantOrders(restaurant.id, { active: !showHistory }),
    refetchInterval: showHistory ? false : 15_000,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'restaurant-orders'] });
  }

  const advance = useMutation({
    mutationFn: ({ id, next, from }: { id: string; next: OrderStatus; from: OrderStatus[] }) =>
      setOrderStatus(id, next, from),
    onSuccess: invalidate,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelOrder(id, reason),
    onSuccess: () => {
      invalidate();
      setCancelling(null);
    },
  });

  const orders = query.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-pill bg-surface p-1">
          {[
            { id: false, label: 'Live orders' },
            { id: true, label: 'History' },
          ].map((option) => (
            <button
              key={String(option.id)}
              type="button"
              onClick={() => setShowHistory(option.id)}
              className={cn(
                'rounded-pill px-4 py-2 text-body-sm font-semibold transition-colors',
                showHistory === option.id
                  ? 'bg-card text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!showHistory && (
          <p className="text-caption text-ink-subtle">Updates automatically</p>
        )}
      </div>

      {query.isPending && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading orders" />
        </div>
      )}

      {!query.isPending && orders.length === 0 && (
        <EmptyState
          className="py-16"
          title={showHistory ? 'No past orders yet' : 'No live orders'}
          description={
            showHistory
              ? 'Completed and cancelled orders will appear here.'
              : 'New orders appear here as soon as customers place them.'
          }
        />
      )}

      <div className="mt-6 space-y-4">
        {orders.map((order) => {
          const action = NEXT_ACTION[order.status];
          const done = order.status === 'delivered' || order.status === 'cancelled';

          return (
            <article
              key={order.id}
              className={cn(
                'rounded-card border bg-card p-5',
                order.status === 'received'
                  ? 'border-brand shadow-brand'  /* a new order should be impossible to miss */
                  : 'border-line',
              )}
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-body-sm font-bold text-ink">
                    {order.order_number}
                  </p>
                  <p className="mt-1 text-body-sm text-ink-muted">
                    {ORDER_STATUS_LABEL[order.status].en}
                    {' · '}
                    {new Date(order.placed_at).toLocaleTimeString(env.locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <p className="text-h5 font-bold text-ink">{formatUsd(order.total_cents)}</p>
              </header>

              <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-body-sm">
                {(order.galeyr_order_items ?? []).map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span className="text-ink">
                      <strong className="font-bold">{item.quantity}×</strong> {item.item_name}
                      {item.notes && (
                        <span className="ml-2 text-ink-muted">— {item.notes}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-ink-muted">
                      {formatUsd(item.line_total_cents)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="mt-3 rounded-card bg-warning-soft px-3 py-2 text-body-sm text-warning-ink">
                  Note from customer: {order.notes}
                </p>
              )}

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-body-sm text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Bike size={15} aria-hidden />
                  <dd>
                    {districtLabel(order.district)} · {order.landmark}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={15} aria-hidden />
                  <dd>{restaurant.prep_time_minutes} min prep</dd>
                </div>
              </dl>

              {/* ── The customer's phone ──
                  Shown to the kitchen because an order with a missing item or
                  an unclear note is resolved with one call. Withholding it
                  turns a thirty-second fix into a cancelled order. */}
              <a
                href={`tel:${order.customer_phone}`}
                className="mt-3 inline-flex items-center gap-2 text-body-sm font-semibold text-brand-ink"
              >
                <Phone size={15} aria-hidden />
                {order.customer_name} · {order.customer_phone}
              </a>

              {!done && (
                <div className="mt-5 flex flex-wrap gap-3">
                  {action && (
                    <Button
                      size="lg"
                      leadingIcon={
                        action.next === 'preparing' ? (
                          <ChefHat size={17} />
                        ) : (
                          <Check size={17} />
                        )
                      }
                      loading={advance.isPending && advance.variables?.id === order.id}
                      onClick={() =>
                        advance.mutate({
                          id: order.id,
                          next: action.next,
                          from: action.from,
                        })
                      }
                    >
                      {action.label}
                    </Button>
                  )}

                  {/* Past `ready_for_pickup` the order belongs to the courier
                      and the control room, so the kitchen has no button —
                      showing one that failed would be worse than none. */}
                  {!action && (
                    <p className="text-body-sm text-ink-muted">
                      Waiting for a courier. The control room is assigning one.
                    </p>
                  )}

                  <Button
                    variant="ghost"
                    size="lg"
                    leadingIcon={<X size={17} />}
                    onClick={() => setCancelling(order)}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {advance.isError && advance.variables?.id === order.id && (
                <p role="alert" className="mt-3 text-body-sm text-danger">
                  {advance.error.message}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* ── Cancelling requires a reason ──
          Not bureaucracy: the reason is shown to the customer on the tracking
          page. "Cancelled" with no explanation is what makes someone ring the
          control room angry, and the control room has no idea either. */}
      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title={`Cancel ${cancelling?.order_number ?? 'order'}?`}
      >
        <CancelForm
          busy={cancel.isPending}
          error={cancel.isError ? cancel.error.message : ''}
          onCancel={() => setCancelling(null)}
          onConfirm={(reason) => {
            if (cancelling) cancel.mutate({ id: cancelling.id, reason });
          }}
        />
      </Modal>
    </div>
  );
}

const REASONS = [
  'We have run out of an item',
  'The kitchen is closing',
  'We are too busy to take this order',
  'The customer asked to cancel',
];

function CancelForm({
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');

  return (
    <div>
      <p className="text-body-sm text-ink-muted">
        The customer will see this reason when they track their order. Please be clear.
      </p>

      {/* Presets, because typing a sentence on a tablet mid-service does not
          happen — and a blank box produces "x" or nothing at all. */}
      <div className="mt-4 flex flex-wrap gap-2">
        {REASONS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setReason(preset)}
            className={cn(
              'rounded-pill border px-3 py-1.5 text-caption font-medium transition-colors',
              reason === preset
                ? 'border-brand bg-brand text-white'
                : 'border-line text-ink-muted hover:border-line-strong',
            )}
          >
            {preset}
          </button>
        ))}
      </div>

      <Textarea
        className="mt-4"
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
      />

      {error && (
        <p role="alert" className="mt-3 text-body-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button variant="outline" fullWidth onClick={onCancel}>
          Keep the order
        </Button>
        <Button
          variant="danger"
          fullWidth
          loading={busy}
          disabled={reason.trim().length < 3}
          onClick={() => onConfirm(reason.trim())}
        >
          Cancel order
        </Button>
      </div>
    </div>
  );
}
