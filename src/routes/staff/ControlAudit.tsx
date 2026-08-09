/**
 * The audit trail.
 *
 * ── Why this screen exists at all ──────────────────────────────────────────
 * A log nobody can read is a log nobody trusts. The point of asking an operator
 * for four digits before they approve a restaurant is that somebody can later
 * answer "who decided this, and when" — which requires the answer to be
 * visible, not just stored.
 *
 * ── Append-only, and that is enforced in the database ──────────────────────
 * `galeyr_audit_log` has a select policy and no update or delete policy. The
 * person who approved a restaurant cannot quietly revise the record of it, and
 * neither can anyone else through the application. There is deliberately no
 * edit control on this page, because there is nothing behind it that would
 * work.
 *
 * ── Failed code attempts are shown too ─────────────────────────────────────
 * Repeated failures against one account is what an attack on a four-digit code
 * looks like. Hiding them to keep the log tidy would remove the only signal
 * anyone gets.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ScrollText, Search } from 'lucide-react';

import { EmptyState } from '@shared/components/ui/EmptyState';
import { Input } from '@shared/components/ui/Input';
import { Spinner } from '@shared/components/ui/Spinner';
import { AUDIT_ACTION_LABEL, listAudit, type AuditEntry } from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

export function ControlAudit() {
  const [search, setSearch] = useState('');

  const { data, isPending } = useQuery({
    queryKey: ['ops', 'audit'],
    queryFn: () => listAudit(200),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];

    return (data ?? []).filter(
      (entry) =>
        entry.staff_ref.toLowerCase().includes(term) ||
        entry.action.toLowerCase().includes(term) ||
        (entry.entity_label ?? '').toLowerCase().includes(term),
    );
  }, [data, search]);

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading the audit trail" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body-sm text-ink-muted">
            The last {data?.length ?? 0} recorded actions.
          </p>
          <p className="mt-0.5 text-caption text-ink-subtle">
            Entries cannot be edited or deleted, by anyone.
          </p>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff, action or restaurant"
          leadingIcon={<Search size={16} />}
          className="sm:w-72"
          aria-label="Search the audit trail"
        />
      </div>

      {filtered.length === 0 && (
        <EmptyState
          className="py-16"
          icon={<ScrollText size={28} />}
          title={data && data.length > 0 ? 'Nothing matches' : 'No recorded actions yet'}
          description={
            data && data.length > 0
              ? 'Try a different search.'
              : 'Approvals, status changes and failed code attempts appear here as they happen.'
          }
        />
      )}

      <ol className="mt-5 space-y-2">
        {filtered.map((entry) => (
          <AuditRow key={entry.id} entry={entry} />
        ))}
      </ol>
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const isFailure = entry.action === 'staff_code_failed';

  return (
    <li
      className={cn(
        'flex flex-wrap items-start gap-4 rounded-card border bg-card p-4',
        isFailure ? 'border-danger/35' : 'border-line',
      )}
    >
      {/* The staff reference is the point of the whole row, so it leads. */}
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-tile text-body-sm font-bold',
          isFailure ? 'bg-danger-soft text-danger-ink' : 'bg-brand-soft text-brand-ink',
        )}
        title={entry.staff_name}
      >
        {isFailure ? <AlertTriangle size={17} aria-hidden /> : entry.staff_ref}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {AUDIT_ACTION_LABEL[entry.action] ?? entry.action}
          {entry.entity_label && (
            <span className="font-normal text-ink-muted"> — {entry.entity_label}</span>
          )}
        </p>

        <p className="mt-0.5 text-body-sm text-ink-muted">
          {isFailure ? 'Attempted by' : 'By'}{' '}
          <strong className="font-semibold text-ink">{entry.staff_ref}</strong>
          {entry.previous_status && entry.new_status && (
            <>
              {' · '}
              {entry.previous_status} → <strong>{entry.new_status}</strong>
            </>
          )}
        </p>

        {entry.notes && (
          <p className="mt-1 text-caption text-ink-subtle">{entry.notes}</p>
        )}
      </div>

      <time
        dateTime={entry.created_at}
        className="shrink-0 text-caption text-ink-subtle"
        /* Full timestamp on hover: the list shows the time, but an incident
           review a week later needs the date. */
        title={new Date(entry.created_at).toLocaleString(env.locale)}
      >
        {new Date(entry.created_at).toLocaleString(env.locale, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </time>
    </li>
  );
}
