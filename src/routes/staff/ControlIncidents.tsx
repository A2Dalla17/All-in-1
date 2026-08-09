/**
 * Incidents — the record of what went wrong.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why incidents are separate from orders and from requests
 * ══════════════════════════════════════════════════════════════════════════
 * An order is a delivery. A request is work arriving at the Control Centre — a
 * phone call, a menu change, a broken bike. An incident is specifically
 * something that went wrong with a delivery, attached to the restaurant it went
 * wrong at.
 *
 * Keeping them apart is what makes "how many things went wrong this week, and
 * at which restaurants" a question with an answer. Folding them into one table
 * would make every count a mixture of problems and routine work.
 *
 * ── They cannot be deleted ─────────────────────────────────────────────────
 * There is no delete policy on `galeyr_incidents` and no delete control here.
 * Closing is the correct end state. A restaurant's record of repeated late
 * preparation is exactly the thing that would be convenient to erase, which is
 * exactly why it cannot be.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Store } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Input, Textarea } from '@shared/components/ui/Input';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import { listRestaurantsAdmin } from '@shared/api/galeyr';
import {
  createIncident,
  INCIDENT_FLOW,
  INCIDENT_STATUS_LABEL,
  INCIDENT_TYPE_LABEL,
  listIncidents,
  listStaff,
  updateIncident,
  type Incident,
  type IncidentStatus,
  type IncidentType,
  type Priority,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

const PRIORITY_TONE: Record<Priority, string> = {
  low: 'bg-surface text-ink-subtle',
  normal: 'bg-info-soft text-info-ink',
  high: 'bg-warning-soft text-warning-ink',
  urgent: 'bg-danger-soft text-danger-ink',
};

const STATUS_TONE: Record<IncidentStatus, string> = {
  open: 'bg-danger-soft text-danger-ink',
  investigating: 'bg-warning-soft text-warning-ink',
  action_required: 'bg-warning-soft text-warning-ink',
  resolved: 'bg-success-soft text-success-ink',
  closed: 'bg-surface text-ink-subtle',
};

export function ControlIncidents() {
  const queryClient = useQueryClient();
  const [showClosed, setShowClosed] = useState(false);
  const [creating, setCreating] = useState(false);

  const incidents = useQuery({
    queryKey: ['ops', 'incidents', showClosed],
    queryFn: () => listIncidents({ openOnly: !showClosed }),
    /* Refreshed on a timer for the same reason the order board is: an incident
       raised by a colleague on another screen must appear without anyone
       remembering to reload. */
    refetchInterval: 30_000,
  });

  const staff = useQuery({ queryKey: ['ops', 'staff'], queryFn: listStaff });
  const restaurants = useQuery({
    queryKey: ['galeyr', 'admin-restaurants'],
    queryFn: listRestaurantsAdmin,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['ops', 'incidents'] });
  }

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateIncident>[1] }) =>
      updateIncident(id, patch),
    onSuccess: invalidate,
  });

  const create = useMutation({
    mutationFn: createIncident,
    onSuccess: () => {
      invalidate();
      setCreating(false);
    },
  });

  const staffByeId = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.id, s])),
    [staff.data],
  );

  if (incidents.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading incidents" />
      </div>
    );
  }

  const list = incidents.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-pill bg-surface p-1">
          {[
            { id: false, label: 'Open' },
            { id: true, label: 'All' },
          ].map((option) => (
            <button
              key={String(option.id)}
              type="button"
              onClick={() => setShowClosed(option.id)}
              className={cn(
                'rounded-pill px-4 py-2 text-body-sm font-semibold transition-colors',
                showClosed === option.id
                  ? 'bg-card text-ink shadow-xs'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Button leadingIcon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Raise incident
        </Button>
      </div>

      {list.length === 0 && (
        <EmptyState
          className="py-16"
          icon={<AlertTriangle size={28} />}
          title={showClosed ? 'No incidents recorded' : 'Nothing open'}
          description="Delays, missing items, courier problems and complaints are recorded here and assigned to the restaurant's line manager."
        />
      )}

      <div className="mt-5 space-y-3">
        {list.map((incident) => (
          <IncidentRow
            key={incident.id}
            incident={incident}
            assignedName={
              incident.assigned_staff_id
                ? staffByeId.get(incident.assigned_staff_id)?.staff_ref ?? '—'
                : null
            }
            busy={update.isPending && update.variables?.id === incident.id}
            onAdvance={(status) => update.mutate({ id: incident.id, patch: { status } })}
          />
        ))}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Raise an incident" size="md">
        <IncidentForm
          restaurants={(restaurants.data ?? []).map((r) => ({ id: r.id, name: r.name }))}
          busy={create.isPending}
          error={create.isError ? create.error.message : ''}
          onCancel={() => setCreating(false)}
          onCreate={(values) => create.mutate(values)}
        />
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function IncidentRow({
  incident,
  assignedName,
  busy,
  onAdvance,
}: {
  incident: Incident;
  assignedName: string | null;
  busy: boolean;
  onAdvance: (status: IncidentStatus) => void;
}) {
  /* The next step in the lifecycle, offered as a single button. A dropdown of
     five statuses invites someone to jump an incident straight to "closed"
     without the investigating step ever being recorded. */
  const currentIndex = INCIDENT_FLOW.indexOf(incident.status);
  const next = INCIDENT_FLOW[currentIndex + 1];

  return (
    <article
      className={cn(
        'rounded-card border bg-card p-4',
        incident.priority === 'urgent' ? 'border-danger/50' : 'border-line',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-caption font-bold text-ink">
              {incident.reference}
            </span>
            <span
              className={cn(
                'rounded-pill px-2 py-0.5 text-caption font-bold',
                STATUS_TONE[incident.status],
              )}
            >
              {INCIDENT_STATUS_LABEL[incident.status]}
            </span>
            <span
              className={cn(
                'rounded-pill px-2 py-0.5 text-caption font-bold capitalize',
                PRIORITY_TONE[incident.priority],
              )}
            >
              {incident.priority}
            </span>
          </div>

          <p className="mt-2 font-semibold text-ink">
            {INCIDENT_TYPE_LABEL[incident.type]}
          </p>
          <p className="mt-0.5 text-body-sm text-ink-muted">{incident.summary}</p>

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-subtle">
            {incident.galeyr_restaurants?.name && (
              <span className="inline-flex items-center gap-1">
                <Store size={12} aria-hidden />
                {incident.galeyr_restaurants.name}
              </span>
            )}
            <span>
              Assigned to{' '}
              <strong className="font-semibold text-ink">
                {assignedName ?? 'nobody yet'}
              </strong>
            </span>
            <span>
              {new Date(incident.created_at).toLocaleString(env.locale, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        </div>

        {next && (
          <Button size="sm" variant="outline" loading={busy} onClick={() => onAdvance(next)}>
            {INCIDENT_STATUS_LABEL[next]}
          </Button>
        )}
      </header>

      {incident.detail && (
        <p className="mt-3 border-t border-line pt-3 text-body-sm text-ink-muted">
          {incident.detail}
        </p>
      )}
    </article>
  );
}

function IncidentForm({
  restaurants,
  busy,
  error,
  onCancel,
  onCreate,
}: {
  restaurants: { id: string; name: string }[];
  busy: boolean;
  error: string;
  onCancel: () => void;
  onCreate: (values: {
    type: IncidentType;
    priority: Priority;
    summary: string;
    detail?: string;
    restaurant_id?: string | null;
    customer_phone?: string | null;
  }) => void;
}) {
  const [type, setType] = useState<IncidentType>('delivery_delay');
  const [priority, setPriority] = useState<Priority>('normal');
  const [restaurantId, setRestaurantId] = useState('');
  const [summary, setSummary] = useState('');
  const [detail, setDetail] = useState('');
  const [phone, setPhone] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (summary.trim().length < 4) return;

    onCreate({
      type,
      priority,
      summary: summary.trim(),
      detail: detail.trim() || undefined,
      restaurant_id: restaurantId || null,
      customer_phone: phone.trim() || null,
    });
  }

  const selectClass =
    'h-12 w-full rounded-input border border-line bg-card px-4 text-body text-ink ' +
    'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inc-type" className="mb-1.5 block text-body-sm font-semibold text-ink">
            What happened
          </label>
          <select
            id="inc-type"
            value={type}
            onChange={(e) => setType(e.target.value as IncidentType)}
            className={selectClass}
          >
            {(Object.keys(INCIDENT_TYPE_LABEL) as IncidentType[]).map((key) => (
              <option key={key} value={key}>
                {INCIDENT_TYPE_LABEL[key]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="inc-priority" className="mb-1.5 block text-body-sm font-semibold text-ink">
            Priority
          </label>
          <select
            id="inc-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className={selectClass}
          >
            {(['low', 'normal', 'high', 'urgent'] as Priority[]).map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="inc-restaurant" className="mb-1.5 block text-body-sm font-semibold text-ink">
          Restaurant
        </label>
        <select
          id="inc-restaurant"
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          className={selectClass}
        >
          <option value="">Not restaurant-specific</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {/* Said out loud, because it is the mechanism that makes anyone
            accountable and it is not otherwise visible. */}
        <p className="mt-1.5 text-caption text-ink-subtle">
          Choosing a restaurant assigns this to its line manager automatically.
        </p>
      </div>

      <Input
        label="Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Order 40 minutes late, customer called twice"
        inputSize="lg"
      />

      <Input
        label="Customer phone (optional)"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <Textarea
        label="Detail (optional)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={3}
      />

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth loading={busy} disabled={summary.trim().length < 4}>
          Raise incident
        </Button>
      </div>
    </form>
  );
}
