/**
 * MY RESTAURANTS — the line manager's view.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What a line manager is
 * ══════════════════════════════════════════════════════════════════════════
 * One named person inside GALEYR owns the operational relationship with each
 * restaurant. Whoever approves a restaurant becomes its line manager, and every
 * incident raised against that restaurant lands in their queue by default.
 *
 * Without it, "this restaurant is late again" belongs to everybody, which in a
 * control room means nobody — the complaint gets acknowledged four times and
 * actioned zero.
 *
 * ── Why this is a filter and not a wall ────────────────────────────────────
 * Every operator can still see every restaurant and every incident; the RLS
 * policies grant reads to all staff deliberately. At 2am one person covers the
 * whole city, and an incident they cannot see is an incident nobody answers.
 *
 * So this screen narrows rather than restricts. It answers "what is mine" —
 * which is a question about accountability, not about permission.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, Phone, Store, UserCheck } from 'lucide-react';

import { EmptyState } from '@shared/components/ui/EmptyState';
import { Spinner } from '@shared/components/ui/Spinner';
import { districtLabel, listRestaurantsAdmin } from '@shared/api/galeyr';
import {
  currentStaff,
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPE_LABEL,
  listIncidents,
  type Incident,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

export function ControlMyRestaurants() {
  const staff = useQuery({ queryKey: ['ops', 'me'], queryFn: currentStaff });

  const restaurants = useQuery({
    queryKey: ['galeyr', 'admin-restaurants'],
    queryFn: listRestaurantsAdmin,
  });

  const incidents = useQuery({
    queryKey: ['ops', 'incidents', 'mine', staff.data?.id],
    queryFn: () => listIncidents({ assignedTo: staff.data?.id }),
    enabled: Boolean(staff.data?.id),
  });

  const mine = useMemo(
    () =>
      (restaurants.data ?? []).filter(
        (r) => (r as { line_manager_id?: string | null }).line_manager_id === staff.data?.id,
      ),
    [restaurants.data, staff.data?.id],
  );

  /** Open incidents grouped by the restaurant they belong to. */
  const openByRestaurant = useMemo(() => {
    const map = new Map<string, Incident[]>();

    for (const incident of incidents.data ?? []) {
      if (incident.status === 'resolved' || incident.status === 'closed') continue;
      if (!incident.restaurant_id) continue;

      const list = map.get(incident.restaurant_id) ?? [];
      list.push(incident);
      map.set(incident.restaurant_id, list);
    }

    return map;
  }, [incidents.data]);

  if (staff.isPending || restaurants.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading your restaurants" />
      </div>
    );
  }

  if (!staff.data) {
    return (
      <EmptyState
        className="py-16"
        title="You are not on the staff roster"
        description="Ask a platform administrator to add you before using the Control Centre."
      />
    );
  }

  const unassignedToMe = (incidents.data ?? []).filter(
    (i) => !i.restaurant_id && i.status !== 'resolved' && i.status !== 'closed',
  );

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-tile bg-brand-soft text-body font-bold text-brand-ink">
            {staff.data.staff_ref}
          </span>
          <div>
            <p className="font-bold text-ink">{staff.data.display_name}</p>
            <p className="text-caption text-ink-muted">
              {mine.length} restaurant{mine.length === 1 ? '' : 's'} ·{' '}
              {openByRestaurant.size + unassignedToMe.length > 0 ? (
                <span className="font-semibold text-danger">
                  {(incidents.data ?? []).filter(
                    (i) => i.status !== 'resolved' && i.status !== 'closed',
                  ).length}{' '}
                  open incidents
                </span>
              ) : (
                'no open incidents'
              )}
            </p>
          </div>
        </div>
      </header>

      {mine.length === 0 && (
        <EmptyState
          className="py-16"
          icon={<Store size={28} />}
          title="No restaurants assigned to you"
          description="When you approve a restaurant application you become that restaurant's line manager, and it appears here."
        />
      )}

      <div className="mt-6 space-y-4">
        {mine.map((restaurant) => {
          const open = openByRestaurant.get(restaurant.id) ?? [];

          return (
            <article
              key={restaurant.id}
              className={cn(
                'rounded-card border bg-card p-5',
                open.length > 0 ? 'border-danger/40' : 'border-line',
              )}
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-bold text-ink">{restaurant.name}</h3>
                    <span
                      className={cn(
                        'rounded-pill px-2 py-0.5 text-caption font-bold',
                        restaurant.status === 'active'
                          ? 'bg-success-soft text-success-ink'
                          : 'bg-surface text-ink-subtle',
                      )}
                    >
                      {restaurant.status === 'active' ? 'Live' : restaurant.status}
                    </span>
                  </div>

                  <p className="mt-1 text-body-sm text-ink-muted">
                    {districtLabel(restaurant.district)} · {restaurant.landmark}
                  </p>
                </div>

                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex shrink-0 items-center gap-1.5 text-body-sm font-semibold text-brand-ink"
                >
                  <Phone size={14} aria-hidden />
                  Call
                </a>
              </header>

              {open.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 border-t border-line pt-4 text-body-sm text-ink-muted">
                  <UserCheck size={15} aria-hidden className="text-success-ink" />
                  Nothing open. You are the line manager for this restaurant.
                </p>
              ) : (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="flex items-center gap-2 text-body-sm font-semibold text-danger">
                    <AlertTriangle size={15} aria-hidden />
                    {open.length} open incident{open.length === 1 ? '' : 's'}
                  </p>

                  <ul className="mt-3 space-y-2">
                    {open.slice(0, 4).map((incident) => (
                      <li
                        key={incident.id}
                        className="flex flex-wrap items-center gap-3 rounded-tile bg-surface px-3 py-2 text-body-sm"
                      >
                        <span className="font-mono text-caption font-bold text-ink">
                          {incident.reference}
                        </span>
                        <span className="text-ink">{INCIDENT_TYPE_LABEL[incident.type]}</span>
                        <span className="text-ink-muted">
                          {INCIDENT_STATUS_LABEL[incident.status]}
                        </span>
                        <span className="ml-auto text-caption text-ink-subtle">
                          {new Date(incident.created_at).toLocaleString(env.locale, {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {open.length > 4 && (
                    <p className="mt-2 text-caption text-ink-subtle">
                      and {open.length - 4} more — see the Incidents tab.
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Incidents assigned to this person but not tied to a restaurant —
          a courier problem, a technical fault. Without this they would be
          assigned and invisible. */}
      {unassignedToMe.length > 0 && (
        <section className="mt-8">
          <h3 className="flex items-center gap-2 text-body-sm font-bold uppercase tracking-wide text-ink-subtle">
            <ClipboardList size={15} aria-hidden />
            Assigned to you, not restaurant-specific
          </h3>

          <ul className="mt-3 space-y-2">
            {unassignedToMe.map((incident) => (
              <li
                key={incident.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-card px-4 py-3 text-body-sm"
              >
                <span className="font-mono text-caption font-bold text-ink">
                  {incident.reference}
                </span>
                <span className="text-ink">{INCIDENT_TYPE_LABEL[incident.type]}</span>
                <span className="truncate text-ink-muted">{incident.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
