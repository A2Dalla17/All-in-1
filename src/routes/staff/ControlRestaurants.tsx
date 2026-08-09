/**
 * Restaurants, and the switch that puts one in front of customers.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * `active` is the only status a customer can see
 * ══════════════════════════════════════════════════════════════════════════
 * The public read policy is `status = 'active'`. Everything else — pending,
 * under review, approved, suspended, rejected — is invisible to the outside
 * world however it got into the table.
 *
 * So moving a restaurant to Active is the single most consequential action in
 * this whole product. It is a public statement that a business has agreed to
 * work with GALEYR. This screen therefore asks for confirmation and says so
 * in words, rather than offering a quiet dropdown that changes the answer
 * without comment.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Phone } from 'lucide-react';

import { DemoBadge } from '@/components/delivery/DemoNotice';
import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  districtLabel,
  formatUsd,
  listRestaurantsAdmin,
  type Restaurant,
  type RestaurantStatus,
} from '@shared/api/galeyr';
import { setRestaurantStatusAsStaff } from '@shared/api/ops';
import { cn } from '@shared/lib/utils';

import { StaffCodeDialog, useStaffConfirm } from './StaffCodeDialog';

const STATUS_LABEL: Record<RestaurantStatus, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  approved: 'Approved — not live',
  active: 'Live',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

const STATUS_TONE: Record<RestaurantStatus, string> = {
  pending: 'bg-warning-soft text-warning-ink',
  under_review: 'bg-info-soft text-info-ink',
  approved: 'bg-info-soft text-info-ink',
  active: 'bg-success-soft text-success-ink',
  suspended: 'bg-danger-soft text-danger-ink',
  rejected: 'bg-surface text-ink-subtle',
};

export function ControlRestaurants() {
  const queryClient = useQueryClient();
  const [goingLive, setGoingLive] = useState<Restaurant | null>(null);
  const [lastAction, setLastAction] = useState<string>('');
  const { confirm, dialogProps } = useStaffConfirm();

  const query = useQuery({
    queryKey: ['galeyr', 'admin-restaurants'],
    queryFn: listRestaurantsAdmin,
  });

  /* Takes a confirmation token rather than acting directly. The token comes
     from the staff-code dialog and is single use — see StaffCodeDialog for why
     the code itself never reaches this call. */
  const mutate = useMutation({
    mutationFn: ({
      id,
      status,
      token,
    }: {
      id: string;
      status: RestaurantStatus;
      token: string;
    }) => setRestaurantStatusAsStaff(id, status, token),
    onSuccess: (staffRef, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['galeyr', 'admin-restaurants'] });
      void queryClient.invalidateQueries({ queryKey: ['galeyr', 'control-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['ops', 'audit'] });
      setGoingLive(null);
      setLastAction(
        `${variables.status === 'active' ? 'Set live' : 'Taken offline'} by ${staffRef}`,
      );
    },
  });

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading restaurants" />
      </div>
    );
  }

  const restaurants = query.data ?? [];

  if (restaurants.length === 0) {
    return (
      <EmptyState
        className="py-16"
        title="No restaurants yet"
        description="Approved applications appear here, ready to be set live."
      />
    );
  }

  return (
    <>
      {/* ── Attribution, shown back to the operator ──
          "Set live by A2" confirms the audit entry was written under their name
          — which is the only way they can tell the trail is working. */}
      {lastAction && (
        <p className="mb-4 rounded-card border border-success/35 bg-success-soft px-4 py-3 text-body-sm font-semibold text-success-ink">
          {lastAction}
        </p>
      )}

      <div className="space-y-3">
        {restaurants.map((restaurant) => {
          const live = restaurant.status === 'active';

          return (
            <article
              key={restaurant.id}
              className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-card p-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-bold text-ink">{restaurant.name}</h3>
                  {restaurant.is_demo && <DemoBadge />}
                  <span
                    className={cn(
                      'rounded-pill px-2 py-0.5 text-caption font-bold',
                      STATUS_TONE[restaurant.status],
                    )}
                  >
                    {STATUS_LABEL[restaurant.status]}
                  </span>
                </div>

                <p className="mt-1 text-body-sm text-ink-muted">
                  {districtLabel(restaurant.district)} · {restaurant.landmark}
                </p>

                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-subtle">
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="inline-flex items-center gap-1 font-semibold text-brand-ink"
                  >
                    <Phone size={12} aria-hidden />
                    {restaurant.phone}
                  </a>
                  <span>{formatUsd(restaurant.delivery_fee_cents)} delivery</span>
                  <span>{restaurant.commission_rate}% commission</span>
                  {live && !restaurant.is_accepting_orders && (
                    <span className="font-semibold text-warning-ink">
                      Paused by the restaurant
                    </span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                {live ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leadingIcon={<EyeOff size={15} />}
                    loading={mutate.isPending && mutate.variables?.id === restaurant.id}
                    onClick={() =>
                      confirm({
                        actionLabel: `Take ${restaurant.name} offline`,
                        detail: 'Customers will no longer see it or be able to order.',
                        onConfirmed: (token) =>
                          mutate.mutate({ id: restaurant.id, status: 'suspended', token }),
                      })
                    }
                  >
                    Take offline
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    leadingIcon={<Eye size={15} />}
                    disabled={restaurant.status === 'rejected'}
                    onClick={() => setGoingLive(restaurant)}
                  >
                    Set live
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* ── The confirmation ──
          Naming the restaurant back to the person, and stating exactly what
          becomes public, so this cannot be done on autopilot. */}
      <Modal
        open={goingLive !== null}
        onClose={() => setGoingLive(null)}
        title="Put this restaurant in front of customers?"
      >
        <p className="text-body text-ink">
          <strong>{goingLive?.name}</strong> will appear on the public site and customers
          will be able to place real orders with them.
        </p>

        <ul className="mt-4 space-y-2 text-body-sm text-ink-muted">
          <li>· Only do this if they have agreed to work with GALEYR.</li>
          <li>· Check their menu and prices are loaded and correct.</li>
          <li>· Check the phone number reaches someone who will answer.</li>
        </ul>

        {goingLive?.is_demo && (
          <p className="mt-4 rounded-card border border-warning/35 bg-warning-soft p-3 text-body-sm text-warning-ink">
            This is a demo restaurant. It is labelled as test data everywhere it appears,
            so customers will not mistake it for a real one.
          </p>
        )}

        {mutate.isError && (
          <p role="alert" className="mt-4 text-body-sm text-danger">
            {mutate.error.message}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setGoingLive(null)}>
            Not yet
          </Button>
          <Button
            fullWidth
            loading={mutate.isPending}
            onClick={() => {
              if (!goingLive) return;
              confirm({
                actionLabel: `Set ${goingLive.name} live`,
                detail: 'They will appear on the public site and can take real orders.',
                onConfirmed: (token) =>
                  mutate.mutate({ id: goingLive.id, status: 'active', token }),
              });
            }}
          >
            Yes, set live
          </Button>
        </div>
      </Modal>

      <StaffCodeDialog {...dialogProps} />
    </>
  );
}
