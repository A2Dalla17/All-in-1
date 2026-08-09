/**
 * Couriers.
 *
 * ── Read-only, on purpose ──────────────────────────────────────────────────
 * This lists who can be assigned work and shows the state of each one. It does
 * not create couriers, and it does not approve them.
 *
 * A courier is trusted with a stranger's food, their address and their cash.
 * Approval means someone has met them and checked their identification — a
 * button on a web page cannot represent that, and one that pretended to would
 * make onboarding look complete while the check that matters had not happened.
 *
 * Couriers are added directly by an administrator until there is a real
 * verification process to attach a button to. See the note on the Couriers
 * landing page, which takes the same position for the same reason.
 */

import { useQuery } from '@tanstack/react-query';
import { Bike, Phone, ShieldCheck } from 'lucide-react';

import { EmptyState } from '@shared/components/ui/EmptyState';
import { Spinner } from '@shared/components/ui/Spinner';
import { listCouriers } from '@shared/api/galeyr';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

export function ControlCouriers() {
  const { data, isPending } = useQuery({
    queryKey: ['galeyr', 'couriers'],
    queryFn: listCouriers,
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading couriers" />
      </div>
    );
  }

  const couriers = data ?? [];

  if (couriers.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<Bike size={28} />}
        title="No couriers yet"
        description="Couriers are added by an administrator after their identification has been checked in person. Until one exists, orders that are ready for pickup cannot be assigned."
      />
    );
  }

  return (
    <div>
      <p className="text-body-sm text-ink-muted">
        {couriers.filter((c) => c.is_approved && c.is_active).length} of {couriers.length} can
        be assigned work.
      </p>

      <div className="mt-4 space-y-3">
        {couriers.map((courier) => {
          const assignable = courier.is_approved && courier.is_active;

          return (
            <article
              key={courier.id}
              className={cn(
                'flex flex-wrap items-center gap-4 rounded-card border bg-card p-5',
                assignable ? 'border-line' : 'border-line opacity-70',
              )}
            >
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-soft text-brand-ink"
              >
                <Bike size={20} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold text-ink">{courier.full_name}</h3>

                  {courier.is_approved ? (
                    <span className="inline-flex items-center gap-1 rounded-pill bg-success-soft px-2 py-0.5 text-caption font-bold text-success-ink">
                      <ShieldCheck size={11} aria-hidden />
                      Approved
                    </span>
                  ) : (
                    <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-caption font-bold text-warning-ink">
                      Not approved
                    </span>
                  )}

                  {!courier.is_active && (
                    <span className="rounded-pill bg-surface px-2 py-0.5 text-caption font-bold text-ink-subtle">
                      Inactive
                    </span>
                  )}
                </div>

                <p className="mt-1 text-body-sm text-ink-muted">
                  {courier.courier_code} · {courier.vehicle_type} ·{' '}
                  {courier.total_deliveries} deliveries
                </p>

                <a
                  href={`tel:${courier.phone}`}
                  className="mt-1 inline-flex items-center gap-1 text-caption font-semibold text-brand-ink"
                >
                  <Phone size={12} aria-hidden />
                  {courier.phone}
                </a>
              </div>

              <span
                className={cn(
                  'shrink-0 rounded-pill px-3 py-1.5 text-caption font-bold',
                  courier.is_available
                    ? 'bg-success-soft text-success-ink'
                    : 'bg-surface text-ink-subtle',
                )}
              >
                {courier.is_available ? 'Free' : 'Busy'}
              </span>
            </article>
          );
        })}
      </div>

      <p className="mt-6 rounded-card border border-line bg-surface p-4 text-body-sm text-ink-muted">
        To add a courier, check their identification in person first. People who want to
        deliver are told to call the control room on{' '}
        <a href={`tel:${env.controlCentre.tel}`} className="font-semibold text-brand-ink">
          {env.controlCentre.display}
        </a>
        .
      </p>
    </div>
  );
}
