/**
 * The Control Centre.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What this file is now
 * ══════════════════════════════════════════════════════════════════════════
 * Routing only. The shell owns the chrome — sidebar, top bar, phone navigation,
 * the badge counts — and each section owns its own data. This component decides
 * which section is showing and nothing else.
 *
 * It used to be a stat grid plus a row of eleven tabs, which is how a console
 * ends up unusable: the tabs past the fold were invisible, there was nowhere to
 * put a count, and the numbers at the top pushed the actual work down the page.
 *
 * ── The section lives in the URL ──────────────────────────────────────────
 * `/control?s=incidents` rather than component state. Three reasons, all of
 * them things an operator hits within a day: the browser back button behaves,
 * a section can be sent to a colleague in a message, and a refresh — which
 * happens constantly on a console left open — does not throw you back to the
 * overview.
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ControlShell, SectionHeader, type ControlSection } from './ControlShell';
import { ControlOverview } from './ControlOverview';
import { ControlPipeline } from './ControlPipeline';
import { ControlMyRestaurants } from './ControlMyRestaurants';
import { ControlIncidents } from './ControlIncidents';
import { ControlSupportQueue } from './ControlSupportQueue';
import { ControlApplications } from './ControlApplications';
import { ControlCourierApplications } from './ControlCourierApplications';
import { ControlRestaurants } from './ControlRestaurants';
import { ControlCouriers } from './ControlCouriers';
import { ControlAdverts } from './ControlAdverts';
import { ControlAudit } from './ControlAudit';
import { ControlAdmin } from './ControlAdmin';

const SECTIONS: ControlSection[] = [
  'overview', 'orders', 'mine', 'incidents', 'support',
  'restaurants', 'restaurant-apps', 'couriers', 'courier-apps',
  'adverts', 'audit', 'admin',
];

function isSection(value: string | null): value is ControlSection {
  return value !== null && (SECTIONS as string[]).includes(value);
}

export function ControlRoomPage() {
  const [params, setParams] = useSearchParams();

  const raw = params.get('s');
  const section: ControlSection = isSection(raw) ? raw : 'overview';

  const setSection = useCallback(
    (next: ControlSection) => {
      /* `replace` so the back button steps out of the Control Centre rather
         than walking back through every section an operator has glanced at
         during a shift. */
      setParams(next === 'overview' ? {} : { s: next }, { replace: true });
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [setParams],
  );

  return (
    <ControlShell section={section} onSection={setSection}>
      {section === 'overview' && <ControlOverview onSection={setSection} />}

      {section === 'orders' && (
        <>
          <SectionHeader
            title="Live orders"
            description="Everything in progress, grouped by what it is waiting for."
          />
          <ControlPipeline />
        </>
      )}

      {section === 'mine' && (
        <>
          <SectionHeader
            title="My restaurants"
            description="The restaurants you are the line manager for, and their open incidents."
          />
          <ControlMyRestaurants />
        </>
      )}

      {section === 'incidents' && (
        <>
          <SectionHeader
            title="Incidents"
            description="Delays, missing items, courier problems and complaints."
          />
          <ControlIncidents />
        </>
      )}

      {section === 'support' && (
        <>
          <SectionHeader
            title="Support queue"
            description="Calls, messages and requests arriving at the Control Centre."
          />
          <ControlSupportQueue />
        </>
      )}

      {section === 'restaurant-apps' && (
        <>
          <SectionHeader
            title="Restaurant applications"
            description="Businesses asking to join GALEYR. Approving assigns you as their line manager."
          />
          <ControlApplications />
        </>
      )}

      {section === 'restaurants' && (
        <>
          <SectionHeader
            title="Restaurants"
            description="Every partner, live or otherwise. Only 'Live' is visible to customers."
          />
          <ControlRestaurants />
        </>
      )}

      {section === 'courier-apps' && (
        <>
          <SectionHeader
            title="Courier applications"
            description="Review, verification and background checks."
          />
          <ControlCourierApplications />
        </>
      )}

      {section === 'couriers' && (
        <>
          <SectionHeader
            title="Couriers"
            description="Who can be assigned a delivery today."
          />
          <ControlCouriers />
        </>
      )}

      {section === 'adverts' && (
        <>
          <SectionHeader
            title="Community advertising"
            description="Campaigns on the GALEYR homepage."
          />
          <ControlAdverts />
        </>
      )}

      {section === 'audit' && (
        <>
          <SectionHeader
            title="Audit trail"
            description="Every recorded action, and who performed it."
          />
          <ControlAudit />
        </>
      )}

      {section === 'admin' && <ControlAdmin />}
    </ControlShell>
  );
}
