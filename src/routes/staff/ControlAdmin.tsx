/**
 * Admin — platform governance, inside the Control Centre.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why it looks different from every other section
 * ══════════════════════════════════════════════════════════════════════════
 * The Control Centre is operational: queues, timers, things that change every
 * few minutes and want to be scanned. Admin is the opposite — settings, legal
 * documents, staff permissions. Things changed rarely, deliberately, and with
 * consequences that are hard to reverse.
 *
 * So this deliberately does not look like another dashboard. No live counts, no
 * refresh interval, no colour-coded urgency. Wider spacing, plainer surfaces,
 * and a banner saying what the section is. If Admin looked like Orders, someone
 * would treat unpublishing the privacy policy like reassigning a courier.
 *
 * ── The gate is real, and it is not this component ────────────────────────
 * `galeyr_content` and `galeyr_apps` are writable only by
 * `galeyr_is_platform_admin()`. An operator who reaches this screen sees it and
 * every save fails. The role check below hides it; the database refuses it.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, FileText, Globe, ScrollText, ShieldCheck, Smartphone, Users,
} from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Skeleton } from '@shared/components/ui/Skeleton';
import {
  currentStaff, listApps, listStaff, setStaffCode, STAFF_ROLE_LABEL,
} from '@shared/api/ops';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

import { SectionHeader } from './ControlShell';
import { StaffCodeDialog, useStaffConfirm } from './StaffCodeDialog';

type AdminTab = 'platform' | 'content' | 'apps' | 'staff';

const TABS: { id: AdminTab; label: string; icon: typeof Globe }[] = [
  { id: 'platform', label: 'Platform', icon: Building2 },
  { id: 'content', label: 'Legal & content', icon: FileText },
  { id: 'apps', label: 'Mobile apps', icon: Smartphone },
  { id: 'staff', label: 'Staff & permissions', icon: Users },
];

export function ControlAdmin() {
  const [tab, setTab] = useState<AdminTab>('platform');

  /**
   * ── A second gate on the way in ────────────────────────────────────────
   * The role check below is the real authorisation — the database refuses
   * every Admin write to anyone who is not `role = 'admin'`, whatever this
   * component does.
   *
   * This code prompt is a different thing: a deliberate pause. An operations
   * console sits unlocked on a desk all shift, and Admin is where policies are
   * unpublished and staff permissions are changed. Asking for four digits at
   * the door means those cannot be reached by someone who wandered past an
   * unattended screen, and it puts an entry in the audit trail.
   *
   * It is per-visit, not per-action: once inside, the individual destructive
   * operations have their own confirmations.
   */
  const [unlocked, setUnlocked] = useState(false);
  const { confirm, dialogProps } = useStaffConfirm();

  const staff = useQuery({ queryKey: ['ops', 'me'], queryFn: currentStaff });

  if (staff.isPending) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  /* Shown, not silently hidden. An operator who has found this section should
     understand why it will not let them in, rather than seeing a blank page. */
  if (staff.data?.role !== 'admin') {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-line bg-bg p-8 text-center">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-surface text-ink-muted"
        >
          <ShieldCheck size={22} />
        </span>
        <h2 className="mt-4 text-h5 font-bold text-ink">Admin access required</h2>
        <p className="mt-2 text-body-sm text-ink-muted">
          Admin covers platform governance — policies, website content, staff and
          permissions. Your account is Control Centre {STAFF_ROLE_LABEL[staff.data?.role ?? 'operator'].toLowerCase()},
          which does not include it.
        </p>
        <p className="mt-3 text-caption text-ink-subtle">
          This is enforced in the database, not just here.
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <>
        <div className="mx-auto max-w-md rounded-xl border border-line bg-bg p-8 text-center">
          <span
            aria-hidden
            className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-ink text-white"
          >
            <ShieldCheck size={22} />
          </span>

          <h2 className="mt-4 text-h5 font-bold text-ink">Platform administration</h2>
          <p className="mt-2 text-body-sm text-ink-muted">
            Policies, legal documents, staff permissions and platform configuration.
            Enter your staff code to continue.
          </p>

          <Button
            className="mt-6"
            onClick={() =>
              confirm({
                actionLabel: 'Open platform administration',
                detail: 'Recorded against your name in the audit trail.',
                onConfirmed: () => setUnlocked(true),
              })
            }
          >
            Unlock Admin
          </Button>

          <p className="mt-4 text-caption text-ink-subtle">
            Signed in as {staff.data.display_name} ({staff.data.staff_ref})
          </p>
        </div>

        <StaffCodeDialog {...dialogProps} />
      </>
    );
  }

  return (
    <div>
      {/* ── The banner that sets the register ──
          Charcoal rather than red. Admin is authority, not alarm — and the red
          is spent on operational urgency elsewhere. */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl bg-ink px-5 py-4 text-white sm:px-6">
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10"
        >
          <ShieldCheck size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold tracking-tight">Platform administration</p>
          <p className="text-body-sm text-white/70">
            Governance and configuration. Changes here affect the whole platform.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-caption font-semibold">
          {staff.data.staff_ref}
        </span>
      </div>

      <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-semibold transition-colors',
              tab === item.id
                ? 'border-ink text-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <item.icon size={16} aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'platform' && <PlatformTab />}
        {tab === 'content' && <ContentTab />}
        {tab === 'apps' && <AppsTab />}
        {tab === 'staff' && <StaffTab />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PlatformTab() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Platform overview"
        description="What GALEYR is configured to do today."
      />

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Fact label="Operating market" value={`${env.market.city}, ${env.market.country}`} />
        <Fact label="Currency" value={env.market.currency} />
        <Fact label="Payment methods" value="Cash on delivery" hint="Card and mobile money not connected" />
        <Fact label="Control Centre line" value={env.controlCentre.display} />
        <Fact label="Parent company" value={env.company.name} />
        <Fact label="Mobile apps" value="Not released" hint="Website is the operational platform" />
      </dl>

      {/* ── Said in the place where somebody could act on it ──
          The control-room number is still the London taxi line. Naming it in
          Admin, where configuration is changed, is more useful than a comment
          in a file nobody opens. */}
      {env.controlCentre.tel.startsWith('+44') && (
        <div className="rounded-xl border border-warning/40 bg-warning-soft p-5 text-body-sm text-warning-ink">
          <p className="font-semibold">The control room number is a UK number</p>
          <p className="mt-1">
            {env.controlCentre.display} is the AC7 GROUP taxi line and appears on every page
            of the site. A customer in {env.market.city} will not call the UK. Replace{' '}
            <code className="rounded bg-warning-soft px-1 font-mono text-[0.8em]">
              VITE_CONTROL_CENTRE_TEL
            </code>{' '}
            and{' '}
            <code className="rounded bg-warning-soft px-1 font-mono text-[0.8em]">
              VITE_CONTROL_CENTRE_DISPLAY
            </code>{' '}
            before launch.
          </p>
        </div>
      )}
    </div>
  );
}

function ContentTab() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Legal and website content"
        description="Published documents and the pages customers read."
      />

      <div className="rounded-xl border border-line bg-bg">
        <ul className="divide-y divide-line">
          {[
            { key: 'privacy', label: 'Privacy policy', status: 'Being rewritten', route: '/privacy' },
            { key: 'terms', label: 'Terms and conditions', status: 'Being rewritten', route: '/terms' },
            { key: 'cookies', label: 'Cookie policy', status: 'Published', route: '/cookies' },
            { key: 'restaurant-agreement', label: 'Partner agreement', status: 'Draft — not a contract', route: null },
            { key: 'courier-agreement', label: 'Courier agreement', status: 'Not started', route: null },
          ].map((doc) => (
            <li key={doc.key} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface text-ink-muted"
              >
                <ScrollText size={17} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{doc.label}</p>
                <p className="text-body-sm text-ink-muted">{doc.status}</p>
              </div>

              {doc.route && (
                <a
                  href={doc.route}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-body-sm font-semibold text-brand-ink hover:underline"
                >
                  View
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Honest about what this screen cannot yet do. An editor that saved into
          a table nothing renders from would be worse than none. */}
      <div className="rounded-xl border border-info/35 bg-info-soft p-5 text-body-sm text-info-ink">
        <p className="font-semibold">Editing is not connected yet</p>
        <p className="mt-1">
          The <code className="rounded bg-info-soft px-1 font-mono text-[0.8em]">galeyr_content</code>{' '}
          table holds versioned documents with publish and draft states, and only a platform
          admin can write to it. The legal pages still render from source files, so an editor
          here would save changes nothing displays. Wiring the pages to read from the table
          is the next step.
        </p>
      </div>
    </div>
  );
}

function AppsTab() {
  const { data, isPending } = useQuery({ queryKey: ['ops', 'apps'], queryFn: listApps });

  if (isPending) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mobile applications"
        description="The apps that will consume this same backend when they launch."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {(data ?? []).map((app) => (
          <div key={app.id} className="rounded-xl border border-line bg-bg p-5">
            <span
              aria-hidden
              className="grid h-10 w-10 place-items-center rounded-lg bg-surface text-ink-muted"
            >
              <Smartphone size={18} />
            </span>

            <p className="mt-4 font-bold text-ink">{app.name}</p>
            <p className="mt-1 text-body-sm text-ink-muted">{app.description}</p>

            <p className="mt-4">
              <span
                className={cn(
                  'inline-block rounded-full px-2.5 py-1 text-[0.6875rem] font-bold',
                  app.is_released
                    ? 'bg-success-soft text-success-ink'
                    : 'bg-surface text-ink-subtle',
                )}
              >
                {app.is_released ? 'Released' : 'Coming soon'}
              </span>
            </p>

            {/* No store links because there are no store listings. A placeholder
                URL would be a claim the app exists. */}
            {!app.is_released && (
              <p className="mt-3 text-caption text-ink-subtle">
                No store listing yet. The website shows "GALEYR App — coming soon" wherever
                this would appear.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffTab() {
  const queryClient = useQueryClient();
  const [settingFor, setSettingFor] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [message, setMessage] = useState('');

  const { data, isPending } = useQuery({ queryKey: ['ops', 'staff'], queryFn: listStaff });

  const setCode = useMutation({
    mutationFn: ({ id, code }: { id: string; code: string }) => setStaffCode(id, code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ops', 'staff'] });
      setSettingFor(null);
      setNewCode('');
      setMessage('Staff code updated.');
    },
    onError: (error) => setMessage(error.message),
  });

  if (isPending) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Staff and permissions"
        description="Who works in the Control Centre, and what they may do."
      />

      {message && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-body-sm text-ink">
          {message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-bg">
        <ul className="divide-y divide-line">
          {(data ?? []).map((member) => (
            <li key={member.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-caption font-bold text-brand-ink"
                >
                  {member.staff_ref}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{member.display_name}</p>
                  <p className="text-body-sm text-ink-muted">
                    {STAFF_ROLE_LABEL[member.role]}
                    {!member.is_active && ' · Inactive'}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSettingFor(settingFor === member.id ? null : member.id);
                    setNewCode('');
                    setMessage('');
                  }}
                >
                  Set code
                </Button>
              </div>

              {settingFor === member.id && (
                <div className="mt-4 rounded-lg border border-line bg-surface p-4">
                  {/* ── Never shows the current code ──
                      There is nothing to show. Codes are stored as bcrypt in a
                      table with row level security and no policies at all —
                      unreadable even to this admin. Setting a new one is the
                      only operation that exists. */}
                  <p className="text-body-sm text-ink-muted">
                    Existing codes cannot be viewed by anyone, including you. Setting a new
                    one replaces it and clears any lockout.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      aria-label={`New 4-digit code for ${member.display_name}`}
                      className="w-28 rounded-lg border border-line bg-bg py-2.5 text-center text-h5 font-bold tracking-[0.4em] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                    />

                    <Button
                      size="sm"
                      loading={setCode.isPending}
                      disabled={newCode.length !== 4}
                      onClick={() => setCode.mutate({ id: member.id, code: newCode })}
                    >
                      Save code
                    </Button>
                  </div>

                  <p className="mt-2 text-caption text-ink-subtle">
                    Sequences and repeats such as 1234 or 1111 are refused.
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5 text-body-sm text-ink-muted">
        <p className="font-semibold text-ink">How staff codes work</p>
        <p className="mt-1">
          A code is a second factor confirming <em>who</em> performed an action, on top of an
          already-signed-in session. It is never authentication on its own — four digits is
          ten thousand combinations. Five wrong attempts locks the code for fifteen minutes,
          and every failure is written to the audit trail.
        </p>
      </div>
    </div>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
        {label}
      </dt>
      <dd className="mt-1.5 font-semibold text-ink">{value}</dd>
      {hint && <dd className="mt-0.5 text-caption text-ink-subtle">{hint}</dd>}
    </div>
  );
}
