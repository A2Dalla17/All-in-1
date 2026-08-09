/**
 * The live order pipeline, and manual courier assignment.
 *
 * ── Why orders are grouped by stage rather than listed by time ─────────────
 * A person watching this all day is not reading it — they are scanning for the
 * one column that has work in it. "Needs a courier" is a queue with an action;
 * "being cooked" is a column you only look at when something has been sitting
 * in it too long.
 *
 * A single time-ordered list makes both invisible: the order that needs a
 * courier is somewhere in the middle, indistinguishable from six that do not.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bike, Phone, Store } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  assignCourier,
  districtLabel,
  formatUsd,
  listAllOrders,
  listCouriers,
  ORDER_STATUS_LABEL,
  setOrderStatus,
  type OrderStatus,
  type OrderWithDetail,
} from '@shared/api/galeyr';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

/**
 * The board's columns.
 *
 * `courier_assigned` and `out_for_delivery` share one, because from the control
 * room's point of view they are the same situation — a courier has it and the
 * job is to leave them alone unless something goes wrong.
 */
const COLUMNS: { title: string; statuses: OrderStatus[]; urgent?: boolean }[] = [
  { title: 'Waiting for the restaurant', statuses: ['received'], urgent: true },
  { title: 'Being cooked', statuses: ['restaurant_accepted', 'preparing'] },
  { title: 'Needs a courier', statuses: ['ready_for_pickup'], urgent: true },
  { title: 'With a courier', statuses: ['courier_assigned', 'out_for_delivery'] },
];

/** Minutes since an order was placed. */
function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export function ControlPipeline() {
  const queryClient = useQueryClient();
  const [assigning, setAssigning] = useState<OrderWithDetail | null>(null);

  const orders = useQuery({
    queryKey: ['galeyr', 'all-orders', 'active'],
    queryFn: () => listAllOrders({ active: true }),
    refetchInterval: 15_000,
  });

  const couriers = useQuery({
    queryKey: ['galeyr', 'couriers'],
    queryFn: listCouriers,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'all-orders'] });
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'control-stats'] });
  }

  const assign = useMutation({
    mutationFn: ({ orderId, courierId }: { orderId: string; courierId: string }) =>
      assignCourier(orderId, courierId),
    onSuccess: () => {
      invalidate();
      setAssigning(null);
    },
  });

  const advance = useMutation({
    mutationFn: ({ id, next, from }: { id: string; next: OrderStatus; from: OrderStatus[] }) =>
      setOrderStatus(id, next, from),
    onSuccess: invalidate,
  });

  const columns = useMemo(() => {
    const all = orders.data ?? [];
    return COLUMNS.map((column) => ({
      ...column,
      orders: all.filter((o) => column.statuses.includes(o.status)),
    }));
  }, [orders.data]);

  if (orders.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading orders" />
      </div>
    );
  }

  if ((orders.data ?? []).length === 0) {
    return (
      <EmptyState
        className="py-16"
        title="Nothing in progress"
        description="Every order has been delivered or cancelled. New orders appear here automatically."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((column) => (
          <section key={column.title}>
            <h2 className="flex items-center gap-2 text-body-sm font-bold uppercase tracking-wide text-ink-subtle">
              {column.title}
              <span
                className={cn(
                  'grid h-5 min-w-5 place-items-center rounded-pill px-1 text-[11px] font-bold leading-none',
                  column.urgent && column.orders.length > 0
                    ? 'bg-brand text-white'
                    : 'bg-surface text-ink-muted',
                )}
              >
                {column.orders.length}
              </span>
            </h2>

            <div className="mt-3 space-y-3">
              {column.orders.length === 0 && (
                <p className="rounded-card border border-dashed border-line px-3 py-6 text-center text-caption text-ink-subtle">
                  Empty
                </p>
              )}

              {column.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAssign={() => setAssigning(order)}
                  onAdvance={(next, from) => advance.mutate({ id: order.id, next, from })}
                  busy={advance.isPending && advance.variables?.id === order.id}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Modal
        open={assigning !== null}
        onClose={() => setAssigning(null)}
        title={`Assign a courier to ${assigning?.order_number ?? ''}`}
      >
        {assigning && (
          <AssignForm
            order={assigning}
            couriers={(couriers.data ?? []).filter((c) => c.is_approved && c.is_active)}
            loading={couriers.isPending}
            busy={assign.isPending}
            error={assign.isError ? assign.error.message : ''}
            onAssign={(courierId) => assign.mutate({ orderId: assigning.id, courierId })}
          />
        )}
      </Modal>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function OrderCard({
  order,
  onAssign,
  onAdvance,
  busy,
}: {
  order: OrderWithDetail;
  onAssign: () => void;
  onAdvance: (next: OrderStatus, from: OrderStatus[]) => void;
  busy: boolean;
}) {
  const age = minutesSince(order.placed_at);

  /**
   * Twenty-five minutes with no movement is the point at which a person should
   * pick up the phone.
   *
   * It is deliberately a dumb clock, not a comparison against the restaurant's
   * stated prep time. The failure this catches is a kitchen that has not looked
   * at its tablet, and such a kitchen's prep-time estimate is not the number to
   * trust.
   */
  const stale = age > 25 && order.status !== 'out_for_delivery';

  return (
    <article
      className={cn(
        'rounded-card border bg-card p-4',
        stale ? 'border-danger/50' : 'border-line',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <p className="font-mono text-caption font-bold text-ink">{order.order_number}</p>
        <p
          className={cn(
            'shrink-0 text-caption font-semibold',
            stale ? 'text-danger' : 'text-ink-subtle',
          )}
        >
          {age} min
        </p>
      </header>

      {stale && (
        <p className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-danger">
          <AlertTriangle size={13} aria-hidden />
          Chase this one
        </p>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-body-sm font-semibold text-ink">
        <Store size={14} aria-hidden className="shrink-0 text-ink-muted" />
        <span className="truncate">{order.galeyr_restaurants?.name ?? 'Restaurant'}</span>
      </p>

      <p className="mt-1 text-caption text-ink-muted">
        {districtLabel(order.district)} · {order.landmark}
      </p>

      <p className="mt-2 text-caption text-ink-muted">
        {(order.galeyr_order_items ?? []).length} items · {formatUsd(order.total_cents)}
      </p>

      {order.galeyr_couriers && (
        <p className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-ink">
          <Bike size={13} aria-hidden />
          {order.galeyr_couriers.full_name}
        </p>
      )}

      {/* ── The two phone numbers ──
          The whole reason a control room exists. Every problem here is fixed by
          calling one of them, so neither should ever be more than one tap away. */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <a
          href={`tel:${order.customer_phone}`}
          className="inline-flex items-center gap-1 text-caption font-semibold text-brand-ink"
        >
          <Phone size={12} aria-hidden />
          Customer
        </a>

        {order.galeyr_restaurants?.phone && (
          <a
            href={`tel:${order.galeyr_restaurants.phone}`}
            className="inline-flex items-center gap-1 text-caption font-semibold text-brand-ink"
          >
            <Phone size={12} aria-hidden />
            Restaurant
          </a>
        )}

        {order.galeyr_couriers?.phone && (
          <a
            href={`tel:${order.galeyr_couriers.phone}`}
            className="inline-flex items-center gap-1 text-caption font-semibold text-brand-ink"
          >
            <Phone size={12} aria-hidden />
            Courier
          </a>
        )}
      </div>

      {order.status === 'ready_for_pickup' && (
        <Button size="sm" fullWidth className="mt-3" onClick={onAssign}>
          Assign courier
        </Button>
      )}

      {order.status === 'courier_assigned' && (
        <Button
          size="sm"
          variant="outline"
          fullWidth
          className="mt-3"
          loading={busy}
          onClick={() => onAdvance('out_for_delivery', ['courier_assigned'])}
        >
          Picked up
        </Button>
      )}

      {order.status === 'out_for_delivery' && (
        <Button
          size="sm"
          variant="success"
          fullWidth
          className="mt-3"
          loading={busy}
          onClick={() => onAdvance('delivered', ['out_for_delivery'])}
        >
          Delivered
        </Button>
      )}

      <p className="mt-2 text-center text-caption text-ink-subtle">
        {ORDER_STATUS_LABEL[order.status].en}
      </p>
    </article>
  );
}

function AssignForm({
  order,
  couriers,
  loading,
  busy,
  error,
  onAssign,
}: {
  order: OrderWithDetail;
  couriers: { id: string; full_name: string; courier_code: string; phone: string; is_available: boolean; total_deliveries: number }[];
  loading: boolean;
  busy: boolean;
  error: string;
  onAssign: (courierId: string) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner label="Loading couriers" />
      </div>
    );
  }

  if (couriers.length === 0) {
    return (
      <div className="py-4">
        <p className="text-body text-ink-muted">
          There are no approved, active couriers to assign. Add one under the Couriers tab
          first.
        </p>
        <p className="mt-3 text-body-sm text-ink-muted">
          In the meantime, call the restaurant on{' '}
          <a
            href={`tel:${order.galeyr_restaurants?.phone ?? env.controlCentre.tel}`}
            className="font-semibold text-brand-ink"
          >
            {order.galeyr_restaurants?.phone ?? env.controlCentre.display}
          </a>{' '}
          and let them know there will be a wait.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-body-sm text-ink-muted">
        Going to {districtLabel(order.district)} · {order.landmark}
      </p>

      <ul className="mt-4 divide-y divide-line rounded-card border border-line">
        {couriers.map((courier) => (
          <li key={courier.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{courier.full_name}</p>
              <p className="text-caption text-ink-muted">
                {courier.courier_code} · {courier.total_deliveries} deliveries
              </p>
            </div>

            {/* Shown, not enforced. A courier's own "available" flag is a self
                report that goes stale; the person in the control room knows who
                is actually free because they just spoke to them. */}
            <span
              className={cn(
                'shrink-0 rounded-pill px-2 py-1 text-caption font-semibold',
                courier.is_available
                  ? 'bg-success-soft text-success-ink'
                  : 'bg-surface text-ink-subtle',
              )}
            >
              {courier.is_available ? 'Free' : 'Busy'}
            </span>

            <Button size="sm" loading={busy} onClick={() => onAssign(courier.id)}>
              Assign
            </Button>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
