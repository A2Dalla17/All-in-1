/**
 * The 24-hour support queue.
 *
 * Everything arriving at the Control Centre that is not yet an order or an
 * incident: a phone call, a restaurant asking for a menu change, a courier with
 * a broken bike, an IT request.
 *
 * ── Ordered oldest-first inside each priority ─────────────────────────────
 * The opposite of most lists. A queue sorted newest-first quietly starves the
 * oldest item — the one that has been waiting longest is pushed further down
 * every time something new arrives. Oldest-first is what makes it a queue
 * rather than a stack.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headphones, Phone } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Skeleton } from '@shared/components/ui/Skeleton';
import {
  listRequests, REQUEST_CHANNEL_LABEL, REQUEST_KIND_LABEL, updateRequest,
  type OpsRequest, type Priority, type RequestStatus,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

const PRIORITY_TONE: Record<Priority, string> = {
  low: 'bg-surface text-ink-subtle',
  normal: 'bg-info-soft text-info-ink',
  high: 'bg-warning-soft text-warning-ink',
  urgent: 'bg-danger-soft text-danger-ink',
};

const NEXT: Record<RequestStatus, RequestStatus | null> = {
  new: 'assigned',
  assigned: 'in_progress',
  in_progress: 'resolved',
  resolved: 'closed',
  closed: null,
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function ControlSupportQueue() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ['ops', 'requests'],
    queryFn: () => listRequests(true),
    refetchInterval: 30_000,
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      updateRequest(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ops', 'requests'] });
      void queryClient.invalidateQueries({ queryKey: ['ops', 'nav-counts'] });
    },
  });

  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const requests = data ?? [];

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-bg px-6 py-16 text-center">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface text-ink-subtle"
        >
          <Headphones size={22} />
        </span>
        <p className="mt-4 font-semibold text-ink">The queue is clear</p>
        <p className="mx-auto mt-1 max-w-sm text-body-sm text-ink-muted">
          Calls and messages from customers, restaurants and couriers appear here as they
          arrive.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <RequestRow
          key={request.id}
          request={request}
          busy={advance.isPending && advance.variables?.id === request.id}
          onAdvance={(status) => advance.mutate({ id: request.id, status })}
        />
      ))}
    </ul>
  );
}

function RequestRow({
  request,
  busy,
  onAdvance,
}: {
  request: OpsRequest;
  busy: boolean;
  onAdvance: (status: RequestStatus) => void;
}) {
  const waitingMinutes = Math.floor(
    (Date.now() - new Date(request.created_at).getTime()) / 60_000,
  );
  const next = NEXT[request.status];

  return (
    <li
      className={cn(
        'rounded-xl border bg-bg p-4 sm:p-5',
        request.priority === 'urgent' ? 'border-danger/40' : 'border-line',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-caption font-bold text-ink">
              {request.reference}
            </span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[0.6875rem] font-semibold text-ink-muted">
              {STATUS_LABEL[request.status]}
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[0.6875rem] font-bold capitalize',
                PRIORITY_TONE[request.priority],
              )}
            >
              {request.priority}
            </span>
          </div>

          <p className="mt-2 font-semibold text-ink">{request.subject}</p>

          {request.detail && (
            <p className="mt-1 text-body-sm text-ink-muted">{request.detail}</p>
          )}

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-subtle">
            <span>{REQUEST_KIND_LABEL[request.kind]}</span>
            <span>{REQUEST_CHANNEL_LABEL[request.channel]}</span>
            <span>
              waiting {waitingMinutes < 60
                ? `${waitingMinutes} min`
                : `${Math.floor(waitingMinutes / 60)} h`}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {request.contact_phone && (
            <a
              href={`tel:${request.contact_phone}`}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-ink"
            >
              <Phone size={14} aria-hidden />
              {request.contact_name ?? 'Call back'}
            </a>
          )}

          {next && (
            <Button size="sm" variant="outline" loading={busy} onClick={() => onAdvance(next)}>
              {STATUS_LABEL[next]}
            </Button>
          )}
        </div>
      </div>

      {request.status === 'new' && waitingMinutes > 30 && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-caption font-semibold text-danger-ink">
          Unanswered for {Math.floor(waitingMinutes / 60) || waitingMinutes}
          {waitingMinutes >= 60 ? ' hours' : ' minutes'} — call them back on{' '}
          {request.contact_phone ?? env.controlCentre.display}.
        </p>
      )}
    </li>
  );
}
