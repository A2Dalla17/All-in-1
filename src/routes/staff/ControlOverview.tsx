/**
 * Operations overview — the first screen of the shift.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Ordered by what needs a person, not by what is easy to count
 * ══════════════════════════════════════════════════════════════════════════
 * Most dashboards open with a row of totals. Totals are the least useful thing
 * on an operations screen: "142 orders this week" tells nobody what to do next.
 *
 * This opens with Critical — orders that have sat too long, urgent incidents —
 * then Action required, then the running totals. Somebody sitting down at 2am
 * should be able to see whether anything is on fire without reading a number
 * and doing arithmetic.
 *
 * ── The staleness rule ────────────────────────────────────────────────────
 * An order counts as late at 25 minutes without reaching the courier. That is
 * deliberately a dumb clock rather than a comparison against each restaurant's
 * own prep estimate: the failure this catches is a kitchen that has not looked
 * at its tablet, and such a kitchen's estimate is not the number to trust.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, Bike, CheckCircle2, ClipboardList,
  Clock, Store, UserCheck,
} from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Skeleton } from '@shared/components/ui/Skeleton';
import { NumberTicker } from '@shared/components/motion';
import {
  formatUsd, getControlRoomStats, listAllOrders, listApplications,
  ORDER_STATUS_LABEL,
} from '@shared/api/galeyr';
import {
  currentStaff, INCIDENT_TYPE_LABEL, listCourierApplications, listIncidents,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

import type { ControlSection } from './ControlShell';

const LATE_AFTER_MINUTES = 25;

export function ControlOverview({ onSection }: { onSection: (s: ControlSection) => void }) {
  const staff = useQuery({ queryKey: ['ops', 'me'], queryFn: currentStaff });

  const stats = useQuery({
    queryKey: ['galeyr', 'control-stats'],
    queryFn: getControlRoomStats,
    refetchInterval: 30_000,
  });

  const orders = useQuery({
    queryKey: ['galeyr', 'all-orders', 'active'],
    queryFn: () => listAllOrders({ active: true }),
    refetchInterval: 20_000,
  });

  const incidents = useQuery({
    queryKey: ['ops', 'incidents', true],
    queryFn: () => listIncidents({ openOnly: true }),
    refetchInterval: 60_000,
  });

  const restaurantApps = useQuery({ queryKey: ['galeyr', 'applications'], queryFn: listApplications });
  const courierApps = useQuery({ queryKey: ['ops', 'courier-applications'], queryFn: listCourierApplications });

  const live = orders.data ?? [];

  const critical = useMemo(() => {
    const late = live.filter((order) => {
      const minutes = (Date.now() - new Date(order.placed_at).getTime()) / 60_000;
      return minutes > LATE_AFTER_MINUTES && order.status !== 'out_for_delivery';
    });

    const urgent = (incidents.data ?? []).filter(
      (i) => i.priority === 'urgent' || i.priority === 'high',
    );

    return { late, urgent };
  }, [live, incidents.data]);

  const actionRequired = useMemo(() => {
    const needsCourier = live.filter((o) => o.status === 'ready_for_pickup');

    const pendingRestaurants = (restaurantApps.data ?? []).filter((a) =>
      ['pending', 'under_review', 'more_info_needed'].includes(a.status),
    );
    const pendingCouriers = (courierApps.data ?? []).filter(
      (a) => !['approved', 'rejected'].includes(a.status),
    );

    return { needsCourier, pendingRestaurants, pendingCouriers };
  }, [live, restaurantApps.data, courierApps.data]);

  const s = stats.data;
  const loading = stats.isPending || orders.isPending;

  const criticalCount = critical.late.length + critical.urgent.length;
  const actionCount =
    actionRequired.needsCourier.length +
    actionRequired.pendingRestaurants.length +
    actionRequired.pendingCouriers.length;

  return (
    <div className="space-y-8">
      {/* ── Greeting and shift state ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-body-sm text-ink-muted">
            {new Date().toLocaleDateString(env.locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <h2 className="mt-1 text-h3 font-bold tracking-tight text-ink">
            {staff.data ? `Sabaax, ${staff.data.display_name}` : 'Operations overview'}
          </h2>
        </div>

        <div
          className={cn(
            'rounded-lg border px-4 py-2.5 text-body-sm font-semibold',
            criticalCount > 0
              ? 'border-danger/40 bg-danger-soft text-danger-ink'
              : 'border-success/40 bg-success-soft text-success-ink',
          )}
        >
          {criticalCount > 0
            ? `${criticalCount} thing${criticalCount === 1 ? '' : 's'} need attention`
            : 'Nothing critical right now'}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Critical
          ══════════════════════════════════════════════════════════════════ */}
      {loading ? (
        <SkeletonBlock rows={3} />
      ) : (
        criticalCount > 0 && (
          <Panel
            tone="danger"
            icon={AlertTriangle}
            title="Critical"
            description="Late deliveries and urgent incidents."
          >
            <ul className="divide-y divide-line">
              {critical.late.slice(0, 5).map((order) => {
                const minutes = Math.floor(
                  (Date.now() - new Date(order.placed_at).getTime()) / 60_000,
                );

                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="font-mono text-caption font-bold text-ink">
                      {order.order_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-sm text-ink">
                      {order.galeyr_restaurants?.name ?? 'Restaurant'} ·{' '}
                      {ORDER_STATUS_LABEL[order.status].en}
                    </span>
                    <span className="shrink-0 text-body-sm font-bold text-danger">
                      {minutes} min
                    </span>
                  </li>
                );
              })}

              {critical.urgent.slice(0, 4).map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="font-mono text-caption font-bold text-ink">
                    {incident.reference}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body-sm text-ink">
                    {INCIDENT_TYPE_LABEL[incident.type]} — {incident.summary}
                  </span>
                  <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[0.6875rem] font-bold capitalize text-danger-ink">
                    {incident.priority}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button size="sm" variant="outline" onClick={() => onSection('orders')}>
                Open the order board
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onSection('incidents')}>
                All incidents
              </Button>
            </div>
          </Panel>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Action required
          ══════════════════════════════════════════════════════════════════ */}
      {!loading && actionCount > 0 && (
        <Panel
          tone="warning"
          icon={ClipboardList}
          title="Action required"
          description="Queues waiting on a decision from the Control Centre."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <QueueTile
              label="Waiting for a courier"
              count={actionRequired.needsCourier.length}
              icon={Bike}
              onClick={() => onSection('orders')}
            />
            <QueueTile
              label="Restaurant applications"
              count={actionRequired.pendingRestaurants.length}
              icon={Store}
              onClick={() => onSection('restaurant-apps')}
            />
            <QueueTile
              label="Courier applications"
              count={actionRequired.pendingCouriers.length}
              icon={UserCheck}
              onClick={() => onSection('courier-apps')}
            />
          </div>
        </Panel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          Today
          ══════════════════════════════════════════════════════════════════ */}
      <section>
        <h3 className="text-body-sm font-semibold uppercase tracking-[0.1em] text-ink-subtle">
          Today
        </h3>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[6.5rem] rounded-xl" />
            ))
          ) : (
            <>
              <Metric label="Orders" value={s?.ordersToday} icon={ClipboardList} />
              <Metric
                label="In progress"
                value={s?.active}
                icon={Clock}
                tone={s && s.active > 0 ? 'brand' : 'neutral'}
              />
              <Metric label="Delivered" value={s?.completedToday} icon={CheckCircle2} />
              {/* Money never animates — a total counting upward can be read
                  mid-count, and a misread figure is a reconciliation problem. */}
              <Metric
                label="Revenue"
                text={s ? formatUsd(s.revenueTodayCents) : '—'}
                icon={CheckCircle2}
                hint="Delivered orders only"
              />
            </>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          Live operations
          ══════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-body-sm font-semibold uppercase tracking-[0.1em] text-ink-subtle">
            Live operations
          </h3>
          <button
            type="button"
            onClick={() => onSection('orders')}
            className="inline-flex items-center gap-1 text-body-sm font-semibold text-brand-ink hover:underline"
          >
            Full board
            <ArrowRight size={14} aria-hidden />
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-bg">
          {loading ? (
            <div className="p-4">
              <SkeletonBlock rows={5} />
            </div>
          ) : live.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span
                aria-hidden
                className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-ink-subtle"
              >
                <ClipboardList size={22} />
              </span>
              <p className="mt-4 font-semibold text-ink">Nothing in progress</p>
              <p className="mt-1 text-body-sm text-ink-muted">
                Every order has been delivered or cancelled. New orders appear here
                automatically.
              </p>
            </div>
          ) : (
            <>
              {/* A real table on a laptop; stacked rows on a phone. A data table
                  squeezed onto 375px is the classic operations-tool failure —
                  either it overflows sideways or the columns become unreadable. */}
              <table className="hidden w-full text-left md:table">
                <thead>
                  <tr className="border-b border-line text-[0.6875rem] uppercase tracking-[0.08em] text-ink-subtle">
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Restaurant</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Age</th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {live.slice(0, 8).map((order) => {
                    const minutes = Math.floor(
                      (Date.now() - new Date(order.placed_at).getTime()) / 60_000,
                    );
                    const late = minutes > LATE_AFTER_MINUTES;

                    return (
                      <tr key={order.id} className="transition-colors hover:bg-surface">
                        <td className="px-4 py-3 font-mono text-caption font-bold text-ink">
                          {order.order_number}
                        </td>
                        <td className="max-w-[14rem] truncate px-4 py-3 text-body-sm text-ink">
                          {order.galeyr_restaurants?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={order.status} />
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 text-body-sm tabular-nums',
                            late ? 'font-bold text-danger' : 'text-ink-muted',
                          )}
                        >
                          {minutes} min
                        </td>
                        <td className="px-4 py-3 text-right text-body-sm font-semibold tabular-nums text-ink">
                          {formatUsd(order.total_cents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <ul className="divide-y divide-line md:hidden">
                {live.slice(0, 6).map((order) => {
                  const minutes = Math.floor(
                    (Date.now() - new Date(order.placed_at).getTime()) / 60_000,
                  );
                  const late = minutes > LATE_AFTER_MINUTES;

                  return (
                    <li key={order.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-caption font-bold text-ink">
                          {order.order_number}
                        </span>
                        <span
                          className={cn(
                            'text-body-sm tabular-nums',
                            late ? 'font-bold text-danger' : 'text-ink-muted',
                          )}
                        >
                          {minutes} min
                        </span>
                      </div>
                      <p className="mt-1 truncate text-body-sm text-ink">
                        {order.galeyr_restaurants?.name ?? '—'}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <StatusPill status={order.status} />
                        <span className="text-body-sm font-semibold tabular-nums text-ink">
                          {formatUsd(order.total_cents)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Panel({
  tone,
  icon: Icon,
  title,
  description,
  children,
}: {
  tone: 'danger' | 'warning';
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-5 sm:p-6',
        tone === 'danger' ? 'border-danger/35 bg-danger-soft/40' : 'border-warning/35 bg-warning-soft/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
            tone === 'danger' ? 'bg-danger-soft text-danger-ink' : 'bg-warning-soft text-warning-ink',
          )}
        >
          <Icon size={18} />
        </span>
        <div>
          <h3 className="font-bold text-ink">{title}</h3>
          <p className="text-body-sm text-ink-muted">{description}</p>
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function QueueTile({
  label,
  count,
  icon: Icon,
  onClick,
}: {
  label: string;
  count: number;
  icon: typeof Bike;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-4 text-left transition-colors',
        count > 0
          ? 'border-line bg-bg hover:border-brand hover:bg-brand-soft/40'
          : 'cursor-default border-line bg-bg opacity-50',
      )}
    >
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted"
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-h5 font-bold tabular-nums text-ink">{count}</span>
        <span className="block truncate text-body-sm text-ink-muted">{label}</span>
      </span>
    </button>
  );
}

function Metric({
  label,
  value,
  text,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value?: number | undefined;
  text?: string;
  hint?: string;
  icon: typeof ClipboardList;
  tone?: 'neutral' | 'brand';
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        tone === 'brand' ? 'border-brand/30 bg-brand-soft/50' : 'border-line bg-bg',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
          {label}
        </p>
        <Icon size={15} aria-hidden className="text-ink-subtle" />
      </div>

      <p className="mt-2 text-h3 font-bold tracking-tight tabular-nums text-ink">
        {text !== undefined ? text : value !== undefined ? <NumberTicker value={value} /> : '—'}
      </p>

      {hint && <p className="mt-0.5 text-[0.6875rem] text-ink-subtle">{hint}</p>}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  received: 'bg-brand-soft text-brand-ink',
  restaurant_accepted: 'bg-info-soft text-info-ink',
  preparing: 'bg-info-soft text-info-ink',
  ready_for_pickup: 'bg-warning-soft text-warning-ink',
  courier_assigned: 'bg-warning-soft text-warning-ink',
  out_for_delivery: 'bg-success-soft text-success-ink',
  delivered: 'bg-success-soft text-success-ink',
  cancelled: 'bg-surface text-ink-subtle',
};

function StatusPill({ status }: { status: keyof typeof ORDER_STATUS_LABEL }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
        STATUS_TONE[status] ?? 'bg-surface text-ink-muted',
      )}
    >
      {ORDER_STATUS_LABEL[status].en}
    </span>
  );
}

/**
 * Skeletons rather than a spinner.
 *
 * A spinner says "wait"; a skeleton says "a table is arriving, roughly this
 * shape". On a console that reloads every twenty seconds the difference is
 * whether the layout jumps each time.
 */
function SkeletonBlock({ rows }: { rows: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 rounded-lg" />
      ))}
    </div>
  );
}
