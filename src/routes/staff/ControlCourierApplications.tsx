/**
 * Courier applications — review, verification and background checks.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * The background check is a workflow, not a lookup
 * ══════════════════════════════════════════════════════════════════════════
 * GALEYR cannot query a criminal record database. No private company in Somalia
 * can, and a button that appeared to do so would produce a green tick meaning
 * nothing while the business believed a check had happened. That is worse than
 * no check at all, because it would be relied upon.
 *
 * So this tracks a human process — consent obtained, enquiry made to whoever is
 * actually authorised to make it, outcome recorded — and every change is
 * attributed to a member of staff and written to the audit trail. Who looked at
 * someone's background and when is exactly the thing that has to be answerable
 * later.
 *
 * ── Approval and clearance are two decisions ──────────────────────────────
 * Approving an application creates the courier record. It does NOT set
 * `is_approved` unless the background status is already `completed_clear` — see
 * `galeyr_decide_courier_application`. Collapsing the two is how an unchecked
 * courier ends up on the road carrying a stranger's cash.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Phone, ShieldQuestion, UserRoundSearch, X } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Spinner } from '@shared/components/ui/Spinner';
import { Textarea } from '@shared/components/ui/Input';
import { districtLabel } from '@shared/api/galeyr';
import {
  BACKGROUND_STATUS_LABEL,
  COURIER_STATUS_LABEL,
  decideCourierApplication,
  listCourierApplications,
  requestFurtherInformation,
  setBackgroundStatus,
  VEHICLE_LABEL,
  type BackgroundStatus,
  type CourierApplication,
  type CourierAppStatus,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

import { StaffCodeDialog, useStaffConfirm } from './StaffCodeDialog';

const STATUS_TONE: Record<CourierAppStatus, string> = {
  new: 'bg-warning-soft text-warning-ink',
  under_review: 'bg-info-soft text-info-ink',
  verification: 'bg-info-soft text-info-ink',
  more_info_needed: 'bg-warning-soft text-warning-ink',
  approved: 'bg-success-soft text-success-ink',
  rejected: 'bg-surface text-ink-subtle',
  suspended: 'bg-danger-soft text-danger-ink',
};

const BACKGROUND_TONE: Record<BackgroundStatus, string> = {
  not_started: 'bg-surface text-ink-subtle',
  awaiting_consent: 'bg-warning-soft text-warning-ink',
  submitted: 'bg-info-soft text-info-ink',
  in_progress: 'bg-info-soft text-info-ink',
  more_info_required: 'bg-warning-soft text-warning-ink',
  completed_clear: 'bg-success-soft text-success-ink',
  completed_further_review: 'bg-warning-soft text-warning-ink',
  not_eligible: 'bg-danger-soft text-danger-ink',
};

export function ControlCourierApplications() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState('');
  const { confirm, dialogProps } = useStaffConfirm();

  const query = useQuery({
    queryKey: ['ops', 'courier-applications'],
    queryFn: listCourierApplications,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['ops', 'courier-applications'] });
    void queryClient.invalidateQueries({ queryKey: ['ops', 'audit'] });
  }

  const decide = useMutation({
    mutationFn: ({ id, status, token }: { id: string; status: CourierAppStatus; token: string }) =>
      decideCourierApplication(id, status, token),
    onSuccess: (staffRef, variables) => {
      invalidate();
      setLastAction(`${COURIER_STATUS_LABEL[variables.status]} by ${staffRef}`);
    },
  });

  const background = useMutation({
    mutationFn: ({
      id,
      status,
      token,
      notes,
    }: {
      id: string;
      status: BackgroundStatus;
      token: string;
      notes?: string;
    }) => setBackgroundStatus(id, status, token, notes),
    onSuccess: (staffRef, variables) => {
      invalidate();
      setLastAction(
        `Background check set to "${BACKGROUND_STATUS_LABEL[variables.status]}" by ${staffRef}`,
      );
    },
  });

  const requestInfo = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      requestFurtherInformation(id, message),
    onSuccess: invalidate,
  });

  const grouped = useMemo(() => {
    const all = query.data ?? [];
    return {
      open: all.filter((a) => !['approved', 'rejected'].includes(a.status)),
      closed: all.filter((a) => ['approved', 'rejected'].includes(a.status)),
    };
  }, [query.data]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading courier applications" />
      </div>
    );
  }

  if ((query.data ?? []).length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<UserRoundSearch size={28} />}
        title="No courier applications yet"
        description="Applications from the Become a courier page appear here for review."
      />
    );
  }

  return (
    <div>
      {lastAction && (
        <p className="mb-4 rounded-card border border-success/35 bg-success-soft px-4 py-3 text-body-sm font-semibold text-success-ink">
          {lastAction}
        </p>
      )}

      <p className="text-body-sm text-ink-muted">
        {grouped.open.length} awaiting a decision · {grouped.closed.length} decided
      </p>

      <div className="mt-5 space-y-3">
        {[...grouped.open, ...grouped.closed].map((application) => (
          <ApplicationRow
            key={application.id}
            application={application}
            open={openId === application.id}
            onToggle={() =>
              setOpenId((current) => (current === application.id ? null : application.id))
            }
            busy={
              (decide.isPending && decide.variables?.id === application.id) ||
              (background.isPending && background.variables?.id === application.id)
            }
            onDecide={(status) =>
              confirm({
                actionLabel: `${COURIER_STATUS_LABEL[status]} — ${application.full_name}`,
                detail:
                  status === 'approved'
                    ? 'Creates the courier record. They are not cleared to deliver until the background check is complete.'
                    : undefined,
                onConfirmed: (token) => decide.mutate({ id: application.id, status, token }),
              })
            }
            onBackground={(status, notes) =>
              confirm({
                actionLabel: `Background check — ${application.full_name}`,
                detail: `Set to "${BACKGROUND_STATUS_LABEL[status]}". This is recorded against your name.`,
                onConfirmed: (token) =>
                  background.mutate({ id: application.id, status, token, notes }),
              })
            }
            onRequestInfo={(message) =>
              requestInfo.mutate({ id: application.id, message })
            }
          />
        ))}
      </div>

      <StaffCodeDialog {...dialogProps} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ApplicationRow({
  application,
  open,
  onToggle,
  busy,
  onDecide,
  onBackground,
  onRequestInfo,
}: {
  application: CourierApplication;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  onDecide: (status: CourierAppStatus) => void;
  onBackground: (status: BackgroundStatus, notes?: string) => void;
  onRequestInfo: (message: string) => void;
}) {
  const [infoMessage, setInfoMessage] = useState('');
  const [backgroundNotes, setBackgroundNotes] = useState('');

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
            <span className="font-mono text-caption font-bold text-ink">
              {application.reference}
            </span>
            <h3 className="truncate font-bold text-ink">{application.full_name}</h3>
            <span
              className={cn(
                'rounded-pill px-2 py-0.5 text-caption font-bold',
                STATUS_TONE[application.status],
              )}
            >
              {COURIER_STATUS_LABEL[application.status]}
            </span>
            <span
              className={cn(
                'rounded-pill px-2 py-0.5 text-caption font-bold',
                BACKGROUND_TONE[application.background_status],
              )}
            >
              {BACKGROUND_STATUS_LABEL[application.background_status]}
            </span>
          </div>

          <p className="mt-1 text-body-sm text-ink-muted">
            {VEHICLE_LABEL[application.vehicle_type]}
            {application.district && ` · ${districtLabel(application.district)}`} ·{' '}
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
            <Field
              label="Phone"
              value={
                <a href={`tel:${application.phone}`} className="font-semibold text-brand-ink">
                  {application.phone}
                </a>
              }
            />
            {application.email && <Field label="Email" value={application.email} />}
            {application.date_of_birth && (
              <Field
                label="Date of birth"
                value={new Date(application.date_of_birth).toLocaleDateString(env.locale)}
              />
            )}
            {application.district && (
              <Field label="Lives in" value={districtLabel(application.district)} />
            )}
            <Field label="Delivery method" value={VEHICLE_LABEL[application.vehicle_type]} />
            <Field
              label="Driving licence"
              value={application.has_driving_licence ? 'States they hold one' : 'No'}
            />
            {application.vehicle_details && (
              <Field label="Vehicle" value={application.vehicle_details} />
            )}
            {application.availability && (
              <Field label="Availability" value={application.availability} />
            )}
            {application.emergency_contact_phone && (
              <Field
                label="Emergency contact"
                value={`${application.emergency_contact_name ?? ''} ${application.emergency_contact_phone}`}
              />
            )}
          </dl>

          {application.experience && (
            <div className="mt-4">
              <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
                Experience
              </p>
              <p className="mt-1 whitespace-pre-wrap text-body-sm text-ink">
                {application.experience}
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              Background check
              ══════════════════════════════════════════════════════════════ */}
          <section className="mt-6 rounded-card border border-line bg-surface p-5">
            <h4 className="flex items-center gap-2 font-bold text-ink">
              <ShieldQuestion size={18} aria-hidden className="text-brand-ink" />
              Background check
            </h4>

            <p className="mt-2 text-body-sm text-ink-muted">
              GALEYR cannot search criminal records directly. Record here where the enquiry
              has reached with the authority handling it. Every change is logged against
              your name.
            </p>

            <p className="mt-3 text-body-sm">
              Currently:{' '}
              <strong
                className={cn(
                  'rounded-pill px-2 py-0.5',
                  BACKGROUND_TONE[application.background_status],
                )}
              >
                {BACKGROUND_STATUS_LABEL[application.background_status]}
              </strong>
            </p>

            {application.background_notes && (
              <p className="mt-2 whitespace-pre-wrap rounded-tile bg-card p-3 text-body-sm text-ink-muted">
                {application.background_notes}
              </p>
            )}

            <Textarea
              className="mt-4"
              label="Notes (internal)"
              hint="Only Control Centre staff see this. The applicant never does."
              value={backgroundNotes}
              onChange={(e) => setBackgroundNotes(e.target.value)}
              rows={2}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(BACKGROUND_STATUS_LABEL) as BackgroundStatus[])
                .filter((status) => status !== application.background_status)
                .map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant="outline"
                    loading={busy}
                    onClick={() => onBackground(status, backgroundNotes || undefined)}
                  >
                    {BACKGROUND_STATUS_LABEL[status]}
                  </Button>
                ))}
            </div>
          </section>

          {!decided && (
            <>
              {/* ── Ask for more ── */}
              <section className="mt-6">
                <Textarea
                  label="Request further information"
                  hint="The applicant is told what is missing when you call them."
                  value={infoMessage}
                  onChange={(e) => setInfoMessage(e.target.value)}
                  rows={2}
                  placeholder="We need to see your driving licence before we can continue."
                />

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  leadingIcon={<Phone size={15} />}
                  disabled={infoMessage.trim().length < 5}
                  onClick={() => onRequestInfo(infoMessage.trim())}
                >
                  Mark as needing more information
                </Button>
              </section>

              <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
                <Button
                  leadingIcon={<Check size={16} />}
                  loading={busy}
                  onClick={() => onDecide('approved')}
                >
                  Approve
                </Button>

                <Button variant="outline" loading={busy} onClick={() => onDecide('under_review')}>
                  Mark under review
                </Button>

                <Button variant="outline" loading={busy} onClick={() => onDecide('verification')}>
                  Move to verification
                </Button>

                <Button
                  variant="ghost"
                  leadingIcon={<X size={16} />}
                  loading={busy}
                  onClick={() => onDecide('rejected')}
                >
                  Reject
                </Button>
              </div>
            </>
          )}

          {application.admin_notes && (
            <p className="mt-4 rounded-card bg-surface p-4 text-body-sm text-ink-muted">
              {application.admin_notes}
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
