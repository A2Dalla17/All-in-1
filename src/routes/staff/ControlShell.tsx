/**
 * The Control Centre shell — sidebar, top bar, workspace.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Why this replaced a row of tabs
 * ══════════════════════════════════════════════════════════════════════════
 * The previous version had eleven tabs in a horizontal scroller. That is fine
 * for four sections and unusable for eleven: the ones past the fold are
 * invisible, there is nowhere to show a count against each, and the whole thing
 * scrolls away the moment you look at anything.
 *
 * An operations console is a room somebody sits in all day. It needs a fixed
 * map of itself on screen — which section they are in, which sections are
 * shouting, and how to get between them without hunting.
 *
 * ── Three real layouts, not one that shrinks ───────────────────────────────
 *   Phone    a bottom bar with the five things an operator opens on a phone,
 *            plus a drawer for the rest. Thumbs reach the bottom of a phone,
 *            not the top.
 *   Tablet   an icon rail — the full sidebar would eat a third of an iPad in
 *            portrait, and labels are the first thing that can go.
 *   Desktop  the full sidebar with labels and counts.
 *
 * ── Counts on the navigation, not just inside the page ────────────────────
 * A queue you have to open to discover is empty is a queue nobody opens. The
 * badges are the difference between a console you scan and one you audit.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Bike, ClipboardList, FileText, Headphones, LayoutDashboard,
  LogOut, Megaphone, Menu, ScrollText, Search, Settings2, ShieldCheck,
  Store, UserCheck, UserRoundSearch, X,
} from 'lucide-react';

import { useAuth } from '@shared/providers/AuthProvider';
import { currentStaff, listCourierApplications, listIncidents, listRequests } from '@shared/api/ops';
import { listApplications } from '@shared/api/galeyr';
import { brand } from '@shared/config/brand';
import { cn } from '@shared/lib/utils';

export type ControlSection =
  | 'overview' | 'orders' | 'mine' | 'incidents' | 'support'
  | 'restaurants' | 'restaurant-apps' | 'couriers' | 'courier-apps'
  | 'adverts' | 'audit' | 'admin';

interface NavEntry {
  id: ControlSection;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
  group: 'operations' | 'partners' | 'platform';
  /** Shown on a phone's bottom bar. Five at most — six is a cramped row. */
  primary?: boolean;
  adminOnly?: boolean;
}

const NAV: NavEntry[] = [
  { id: 'overview',        label: 'Overview',              short: 'Home',      icon: LayoutDashboard,  group: 'operations', primary: true },
  { id: 'orders',          label: 'Live orders',           short: 'Orders',    icon: ClipboardList,    group: 'operations', primary: true },
  { id: 'mine',            label: 'My restaurants',        short: 'Mine',      icon: UserCheck,        group: 'operations', primary: true },
  { id: 'incidents',       label: 'Incidents',             short: 'Issues',    icon: AlertTriangle,    group: 'operations', primary: true },
  { id: 'support',         label: 'Support queue',         short: 'Queue',     icon: Headphones,       group: 'operations' },

  { id: 'restaurant-apps', label: 'Restaurant applications', short: 'Apps',    icon: UserCheck,        group: 'partners' },
  { id: 'restaurants',     label: 'Restaurants',           short: 'Places',    icon: Store,            group: 'partners' },
  { id: 'courier-apps',    label: 'Courier applications',  short: 'Couriers',  icon: UserRoundSearch,  group: 'partners' },
  { id: 'couriers',        label: 'Couriers',              short: 'Riders',    icon: Bike,             group: 'partners' },

  { id: 'adverts',         label: 'Community advertising', short: 'Ads',       icon: Megaphone,        group: 'platform' },
  { id: 'audit',           label: 'Audit trail',           short: 'Audit',     icon: ScrollText,       group: 'platform' },
  { id: 'admin',           label: 'Admin',                 short: 'Admin',     icon: ShieldCheck,      group: 'platform', adminOnly: true },
];

const GROUP_LABEL: Record<NavEntry['group'], string> = {
  operations: 'Operations',
  partners: 'Partners',
  platform: 'Platform',
};

export function ControlShell({
  section,
  onSection,
  children,
}: {
  section: ControlSection;
  onSection: (next: ControlSection) => void;
  children: ReactNode;
}) {
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const staff = useQuery({ queryKey: ['ops', 'me'], queryFn: currentStaff });

  /* ── The counts that drive the badges ──
     Deliberately light queries on a slow interval. A console left open all day
     must not hammer the database to keep three numbers fresh. */
  const counts = useQuery({
    queryKey: ['ops', 'nav-counts'],
    queryFn: async () => {
      const [incidents, requests, restaurantApps, courierApps] = await Promise.all([
        listIncidents({ openOnly: true }),
        listRequests(true),
        listApplications(),
        listCourierApplications(),
      ]);

      return {
        incidents: incidents.length,
        support: requests.length,
        restaurantApps: restaurantApps.filter((a) =>
          ['pending', 'under_review', 'more_info_needed'].includes(a.status),
        ).length,
        courierApps: courierApps.filter(
          (a) => !['approved', 'rejected'].includes(a.status),
        ).length,
      };
    },
    refetchInterval: 60_000,
  });

  /* A clock in an operations room is not decoration — "when did that order come
     in" is asked constantly and doing the arithmetic against a wall clock is a
     small tax paid a hundred times a day. */
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  /* Close the drawer on navigation. */
  useEffect(() => setDrawerOpen(false), [section]);

  const isAdmin = staff.data?.role === 'admin';

  const visible = useMemo(
    () => NAV.filter((entry) => !entry.adminOnly || isAdmin),
    [isAdmin],
  );

  function badgeFor(id: ControlSection): number | undefined {
    const c = counts.data;
    if (!c) return undefined;

    if (id === 'incidents' && c.incidents > 0) return c.incidents;
    if (id === 'support' && c.support > 0) return c.support;
    if (id === 'restaurant-apps' && c.restaurantApps > 0) return c.restaurantApps;
    if (id === 'courier-apps' && c.courierApps > 0) return c.courierApps;
    return undefined;
  }

  const current = visible.find((entry) => entry.id === section);

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ══════════════════════════════════════════════════════════════════
          Sidebar — icon rail on tablet, full on desktop
          ══════════════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-line bg-bg md:flex md:flex-col',
          'md:w-[4.5rem] xl:w-64',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-4 xl:px-5">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg brand-gradient text-caption font-extrabold text-white"
          >
            G
          </span>
          <span className="hidden min-w-0 xl:block">
            <span className="block truncate text-body-sm font-bold tracking-tight text-ink">
              Control Centre
            </span>
            <span className="block truncate text-[0.6875rem] text-ink-subtle">
              {brand.name}
            </span>
          </span>
        </div>

        <nav aria-label="Control Centre" className="flex-1 overflow-y-auto py-4">
          {(['operations', 'partners', 'platform'] as const).map((group) => {
            const entries = visible.filter((entry) => entry.group === group);
            if (entries.length === 0) return null;

            return (
              <div key={group} className="mb-5">
                <p className="mb-1.5 hidden px-5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle xl:block">
                  {GROUP_LABEL[group]}
                </p>

                <ul className="space-y-0.5 px-2 xl:px-3">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <SidebarItem
                        entry={entry}
                        active={section === entry.id}
                        badge={badgeFor(entry.id)}
                        onClick={() => onSection(entry.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-line p-2 xl:p-3">
          <button
            type="button"
            onClick={() => void logout()}
            title="Sign out"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-body-sm font-medium text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <LogOut size={17} aria-hidden className="shrink-0" />
            <span className="hidden xl:inline">Sign out</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          Workspace
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-bg/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface md:hidden"
          >
            <Menu size={20} aria-hidden />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-body font-bold tracking-tight text-ink sm:text-h5">
              {current?.label ?? 'Control Centre'}
            </h1>
          </div>

          {/* Search is presented as what it is — not yet wired to anything —
              rather than as a box that swallows what you type. */}
          <button
            type="button"
            disabled
            title="Search is not connected yet"
            className="hidden h-10 items-center gap-2 rounded-lg border border-line px-3 text-body-sm text-ink-subtle lg:flex"
          >
            <Search size={15} aria-hidden />
            Search
            <kbd className="ml-2 rounded border border-line px-1.5 text-[0.625rem]">soon</kbd>
          </button>

          <time
            dateTime={now.toISOString()}
            className="hidden shrink-0 text-body-sm tabular-nums text-ink-muted sm:block"
          >
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </time>

          {/* ── Who is on shift ──
              An operations console is shared, and the audit trail records
              whoever is signed in. Showing that name permanently is how somebody
              notices they are about to approve a restaurant as a colleague. */}
          <div className="flex shrink-0 items-center gap-2.5 border-l border-line pl-3">
            <span className="hidden text-right sm:block">
              <span className="block text-body-sm font-semibold leading-tight text-ink">
                {staff.data?.display_name ?? '—'}
              </span>
              <span className="flex items-center justify-end gap-1 text-[0.6875rem] text-success-ink">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />
                Online
              </span>
            </span>

            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-caption font-bold text-brand-ink"
            >
              {staff.data?.staff_ref ?? '?'}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-8 lg:px-8">
          {children}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          Phone — bottom bar and drawer
          ══════════════════════════════════════════════════════════════════ */}
      <nav
        aria-label="Control Centre"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-bg/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {visible
          .filter((entry) => entry.primary)
          .map((entry) => {
            const badge = badgeFor(entry.id);
            const active = section === entry.id;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSection(entry.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium transition-colors',
                  active ? 'text-brand-ink' : 'text-ink-subtle',
                )}
              >
                <entry.icon size={19} aria-hidden />
                {entry.short}
                {badge !== undefined && (
                  <span className="absolute right-[22%] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.625rem] font-bold leading-none text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-medium text-ink-subtle"
        >
          <Menu size={19} aria-hidden />
          More
        </button>
      </nav>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-bg shadow-lifted">
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <span className="text-body font-bold text-ink">Control Centre</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-lg text-ink-muted hover:bg-surface"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {(['operations', 'partners', 'platform'] as const).map((group) => {
                const entries = visible.filter((entry) => entry.group === group);
                if (entries.length === 0) return null;

                return (
                  <div key={group} className="mb-5">
                    <p className="mb-1.5 px-5 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                      {GROUP_LABEL[group]}
                    </p>
                    <ul className="space-y-0.5 px-3">
                      {entries.map((entry) => (
                        <li key={entry.id}>
                          <SidebarItem
                            entry={entry}
                            active={section === entry.id}
                            badge={badgeFor(entry.id)}
                            onClick={() => onSection(entry.id)}
                            forceLabel
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line p-3">
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-body-sm font-medium text-ink-muted hover:bg-surface"
              >
                <LogOut size={17} aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SidebarItem({
  entry,
  active,
  badge,
  onClick,
  forceLabel = false,
}: {
  entry: NavEntry;
  active: boolean;
  badge?: number | undefined;
  onClick: () => void;
  forceLabel?: boolean;
}) {
  const isAdmin = entry.id === 'admin';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      /* The title is the tooltip on the icon rail, where there is no label. */
      title={entry.label}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        forceLabel ? '' : 'xl:justify-start',
        active
          ? 'bg-brand-soft font-semibold text-brand-ink'
          : 'text-ink-muted hover:bg-surface hover:text-ink',
        /* Admin reads differently from the operational sections — it is
           governance, not the day job, and should not look like another queue. */
        isAdmin && !active && 'text-ink',
      )}
    >
      {/* Active marker on the rail, where the background alone is ambiguous
          once the labels are gone. */}
      {active && (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand"
        />
      )}

      <entry.icon size={18} aria-hidden className="shrink-0" />

      <span className={cn('min-w-0 flex-1 truncate text-body-sm', forceLabel ? '' : 'hidden xl:block')}>
        {entry.label}
      </span>

      {badge !== undefined && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 text-[0.6875rem] font-bold leading-[1.35rem]',
            'bg-brand text-white',
            forceLabel ? '' : 'absolute right-1.5 top-1.5 xl:static xl:leading-[1.35rem]',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** Shared page header for the sections rendered inside the shell. */
export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-h4 font-bold tracking-tight text-ink">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/* Re-exported so sections can render consistent placeholders. */
export { FileText, Settings2 };
