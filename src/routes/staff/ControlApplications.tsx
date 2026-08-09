/**
 * Reviewing restaurant applications.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * The rule this screen exists to enforce
 * ══════════════════════════════════════════════════════════════════════════
 * Approving an application does NOT put a restaurant on the site.
 *
 * `galeyr_approve_application` creates the restaurant with status `approved`,
 * not `active`. Going live is a separate, deliberate act on the Restaurants
 * tab, normally after the menu has been loaded and someone has confirmed the
 * owner actually agreed to work with us.
 *
 * Two steps because the mistake they prevent is not recoverable in the way that
 * matters. Un-listing a restaurant takes a click; a restaurant owner who finds
 * their name advertised on a delivery service they never agreed to has already
 * formed an opinion of AC7 GALEYR, and that does not get undone.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Phone, X } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Spinner } from '@shared/components/ui/Spinner';
import { Textarea } from '@shared/components/ui/Input';
import {
  approveApplication,
  districtLabel,
  listApplications,
  setApplicationStatus,
  type ApplicationStatus,
  type RestaurantApplication,
} from '@shared/api/galeyr';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

const STATUS_TONE: Record<ApplicationStatus, string> = {
  pending: 'bg-warning-soft text-warning-ink',
  under_review: 'bg-info-soft text-info-ink',
  approved: 'bg-success-soft text-success-ink',
  rejected: 'bg-surface text-ink-subtle',
  more_info_needed: 'bg-info-soft text-info-ink',
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'New',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  more_info_needed: 'Waiting on them',
};

export function ControlApplications() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['galeyr', 'applications'],
    queryFn: listApplications,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'applications'] });
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'control-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['galeyr', 'admin-restaurants'] });
  }

  const setStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ApplicationStatus; notes?: string }) =>
      setApplicationStatus(id, status, notes),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: approveApplication,
    onSuccess: invalidate,
  });

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading applications" />
      </div>
    );
  }

  const applications = query.data ?? [];

  if (applications.length === 0) {
    return (
      <EmptyState
        className="py-16"
        title="No applications yet"
        description="Restaurants that apply through the Partner page appear here for review."
      />
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((application) => (
        <ApplicationRow
          key={application.id}
          application={application}
          open={openId === application.id}
          onToggle={() =>
            setOpenId((current) => (current === application.id ? null : application.id))
          }
          busy={
            (setStatus.isPending && setStatus.variables?.id === application.id) ||
            (approve.isPending && approve.variables === application.id)
          }
          error={
            approve.isError && approve.variables === application.id
              ? approve.error.message
              : ''
          }
          onSetStatus={(status, notes) =>
            setStatus.mutate({ id: application.id, status, notes })
          }
          onApprove={() => approve.mutate(application.id)}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ApplicationRow({
  application,
  open,
  onToggle,
  busy,
  error,
  onSetStatus,
  onApprove,
}: {
  application: RestaurantApplication;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  error: string;
  onSetStatus: (status: ApplicationStatus, notes?: string) => void;
  onApprove: () => void;
}) {
  const [notes, setNotes] = useState(application.admin_notes ?? '');

  const decided = application.status === 'approved' || application.status === 'rejected';

  return (
    <article className="rounded-card border border-line bg-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-ink">{application.restaurant_name}</h3>
            <span
              className={cn(
                'rounded-pill px-2 py-0.5 text-caption font-bold',
                STATUS_TONE[application.status],
              )}
            >
              {STATUS_LABEL[application.status]}
            </span>
          </div>

          <p className="mt-1 text-body-sm text-ink-muted">
            {application.owner_name} · {districtLabel(application.district)} ·{' '}
            {new Date(application.created_at).toLocaleDateString(env.locale)}
          </p>
        </div>

        <ChevronDown
          size={18}
          aria-hidden
          className={cn('shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="border-t border-line p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" value={application.owner_name} />
            <Field
              label="Phone"
              value={
                <a href={`tel:${application.phone}`} className="font-semibold text-brand-ink">
                  {application.phone}
                </a>
              }
            />
            {application.email && <Field label="Email" value={application.email} />}
            <Field label="District" value={districtLabel(application.district)} />
            <Field label="Landmark" value={application.landmark} />
            <Field label="Branches" value={String(application.branches)} />
            {application.cuisine && application.cuisine.length > 0 && (
              <Field label="Cuisine" value={application.cuisine.join(', ')} />
            )}
            {application.opening_hours && (
              <Field label="Hours" value={application.opening_hours} />
            )}
          </dl>

          {application.menu_notes && (
            <div className="mt-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
                Menu notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-ink">
                {application.menu_notes}
              </p>
            </div>
          )}

          {application.business_notes && (
            <div className="mt-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
                Other notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-ink">
                {application.business_notes}
              </p>
            </div>
          )}

          {!decided && (
            <>
              <Textarea
                className="mt-5"
                label="Internal notes"
                hint="Only AC7 GALEYR staff can see this. The applicant never does."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              {/* ── Approval, and what it deliberately does not do ──
                  Said on the button's own label, because the person clicking it
                  is the last check before a business's name could end up
                  somewhere it does not belong. */}
              <div className="mt-5 rounded-card border border-info/35 bg-info-soft p-4 text-body-sm text-info-ink">
                Approving creates the restaurant but does <strong>not</strong> publish it.
                It stays hidden from customers until you set it live on the Restaurants
                tab — do that only once they have agreed to work with us.
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  leadingIcon={<Check size={16} />}
                  loading={busy}
                  onClick={onApprove}
                >
                  Approve — create restaurant
                </Button>

                <Button
                  variant="outline"
                  loading={busy}
                  onClick={() => onSetStatus('under_review', notes)}
                >
                  Mark under review
                </Button>

                <Button
                  variant="outline"
                  leadingIcon={<Phone size={16} />}
                  loading={busy}
                  onClick={() => onSetStatus('more_info_needed', notes)}
                >
                  Need more from them
                </Button>

                <Button
                  variant="ghost"
                  leadingIcon={<X size={16} />}
                  loading={busy}
                  onClick={() => onSetStatus('rejected', notes)}
                >
                  Reject
                </Button>
              </div>
            </>
          )}

          {decided && application.admin_notes && (
            <div className="mt-4 rounded-card bg-surface p-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
                Internal notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-ink">
                {application.admin_notes}
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-body-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-0.5 text-body-sm text-ink">{value}</dd>
    </div>
  );
}
