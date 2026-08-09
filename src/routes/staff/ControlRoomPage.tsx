/**
 * The control room.
 *
 * ── What this is ───────────────────────────────────────────────────────────
 * The screen one or two people watch all day. Everything AC7 GALEYR promises a
 * customer — that someone answers, that an order does not vanish — is delivered
 * from here by a person, not by software.
 *
 * So the live pipeline is the default view and it refreshes itself, the numbers
 * on top are the ones you act on rather than the ones that look good, and
 * nothing important is more than one tab away.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bike, ClipboardList, LayoutDashboard, LogOut, Store, UserCheck,
} from 'lucide-react';

import { Container } from '@shared/components/ui/Container';
import { Spinner } from '@shared/components/ui/Spinner';
import { useAuth } from '@shared/providers/AuthProvider';
import { formatUsd, getControlRoomStats } from '@shared/api/galeyr';
import { cn } from '@shared/lib/utils';

import { ControlPipeline } from './ControlPipeline';
import { ControlApplications } from './ControlApplications';
import { ControlRestaurants } from './ControlRestaurants';
import { ControlCouriers } from './ControlCouriers';

type Tab = 'pipeline' | 'applications' | 'restaurants' | 'couriers';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'pipeline', label: 'Live orders', icon: ClipboardList },
  { id: 'applications', label: 'Applications', icon: UserCheck },
  { id: 'restaurants', label: 'Restaurants', icon: Store },
  { id: 'couriers', label: 'Couriers', icon: Bike },
];

export function ControlRoomPage() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>('pipeline');

  const stats = useQuery({
    queryKey: ['galeyr', 'control-stats'],
    queryFn: getControlRoomStats,
    refetchInterval: 30_000,
  });

  const s = stats.data;

  return (
    <Container className="py-6 sm:py-10" size="wide">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={22} aria-hidden className="text-brand-ink" />
          <h1 className="text-h3 font-extrabold tracking-tight text-ink">Control room</h1>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-2 rounded-control px-3 py-2 text-body-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
        >
          <LogOut size={16} aria-hidden />
          Sign out
        </button>
      </header>

      {/* ── The numbers ──
          Chosen because each one implies an action. "Needs a courier" is the
          only one that is a live queue rather than a count, so it is loudest. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders today" value={s ? String(s.ordersToday) : '—'} />
        <Stat
          label="In progress"
          value={s ? String(s.active) : '—'}
          tone={s && s.active > 0 ? 'brand' : 'neutral'}
        />
        <Stat label="Delivered today" value={s ? String(s.completedToday) : '—'} />
        <Stat
          label="Cancelled today"
          value={s ? String(s.cancelledToday) : '—'}
          tone={s && s.cancelledToday > 0 ? 'danger' : 'neutral'}
        />
        <Stat
          label="Revenue today"
          value={s ? formatUsd(s.revenueTodayCents) : '—'}
          hint="Delivered orders only"
        />
        <Stat label="Active restaurants" value={s ? String(s.activeRestaurants) : '—'} />
        <Stat label="Couriers available" value={s ? String(s.activeCouriers) : '—'} />
        <Stat
          label="Applications waiting"
          value={s ? String(s.pendingApplications) : '—'}
          tone={s && s.pendingApplications > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {stats.isPending && (
        <div className="flex justify-center py-4">
          <Spinner label="Loading figures" />
        </div>
      )}

      <nav className="mt-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-semibold transition-colors',
              tab === item.id
                ? 'border-brand text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <item.icon size={16} aria-hidden />
            {item.label}

            {item.id === 'applications' && s && s.pendingApplications > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-pill bg-warning px-1 text-[11px] font-bold leading-none text-white">
                {s.pendingApplications}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'pipeline' && <ControlPipeline />}
        {tab === 'applications' && <ControlApplications />}
        {tab === 'restaurants' && <ControlRestaurants />}
        {tab === 'couriers' && <ControlCouriers />}
      </div>
    </Container>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'brand' | 'warning' | 'danger';
}) {
  return (
    <div
      className={cn(
        'rounded-card border p-4',
        tone === 'neutral' && 'border-line bg-card',
        tone === 'brand' && 'border-brand/40 bg-brand-soft',
        tone === 'warning' && 'border-warning/40 bg-warning-soft',
        tone === 'danger' && 'border-danger/40 bg-danger-soft',
      )}
    >
      <p className="text-caption font-semibold uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
      <p className="mt-1.5 text-h3 font-extrabold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-caption text-ink-subtle">{hint}</p>}
    </div>
  );
}
