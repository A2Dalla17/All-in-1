/**
 * The door to the staff areas — the restaurant portal and the control room.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What this component is, and what it is NOT
 * ══════════════════════════════════════════════════════════════════════════
 * It is a convenience. It decides what to render: a sign-in form, a "you do not
 * have access" message, or the page.
 *
 * It is NOT the security boundary, and nothing here should ever be mistaken for
 * one. Every restriction that matters lives in row level security in Postgres:
 *
 *   · A restaurant's staff can read their own orders because
 *     `galeyr_orders_restaurant_read` scopes the query to their memberships.
 *   · Only an administrator can approve an application because
 *     `galeyr_approve_application` checks `galeyr_is_admin()` and raises if not.
 *
 * Delete this file and paste an admin URL into the address bar, and the pages
 * still render — but every query returns zero rows and every write is refused.
 * That is the property worth having. A guard in React is a guard an attacker
 * removes with the developer tools; a guard in the database is one they cannot
 * reach at all.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock, ShieldAlert } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { Input } from '@shared/components/ui/Input';
import { Spinner } from '@shared/components/ui/Spinner';
import { useAuth } from '@shared/providers/AuthProvider';
import { myRestaurants } from '@shared/api/galeyr';

export type StaffArea = 'portal' | 'control';

export function StaffGate({
  area,
  children,
}: {
  area: StaffArea;
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  /**
   * Which restaurants this person works for.
   *
   * This is also the access check for the portal, and it is a real one — the
   * answer comes from the database under RLS, not from a claim in a token this
   * browser is holding. Someone with no memberships gets an empty array however
   * they arrived here.
   */
  const memberships = useQuery({
    queryKey: ['galeyr', 'my-restaurants'],
    queryFn: myRestaurants,
    enabled: isAuthenticated && area === 'portal',
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="Checking your access" />
      </div>
    );
  }

  if (!isAuthenticated) return <StaffLogin area={area} />;

  if (area === 'control' && !isAdmin) {
    return (
      <NoAccess
        title="This is the control room"
        description="Your account does not have administrator access. If you run a restaurant, use the restaurant portal instead."
        link={{ to: '/portal', label: 'Go to the restaurant portal' }}
      />
    );
  }

  if (area === 'portal') {
    if (memberships.isPending) {
      return (
        <div className="flex justify-center py-24">
          <Spinner size="lg" label="Loading your restaurant" />
        </div>
      );
    }

    if ((memberships.data ?? []).length === 0) {
      return (
        <NoAccess
          title="No restaurant linked to this account"
          description="You are signed in, but this account is not a member of any restaurant on AC7 GALEYR. If you have applied to partner with us, we will set this up after we have spoken."
          link={{ to: '/partners', label: 'Apply to partner with us' }}
        />
      );
    }
  }

  return <>{children}</>;
}

/* -------------------------------------------------------------------------- */

function StaffLogin({ area }: { area: StaffArea }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await login({ email, password });
    } catch (caught) {
      /* Deliberately not "no account with that email" or "wrong password".
         Distinguishing them tells anyone with a login form which of your staff
         have accounts here, which is the first half of guessing a password. */
      setError('Those details did not work. Check your email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="py-16" size="narrow">
      <div className="mx-auto max-w-sm">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
        >
          <Lock size={22} />
        </span>

        <h1 className="mt-5 text-center text-h3 font-extrabold text-ink">
          {area === 'control' ? 'Control room' : 'Restaurant portal'}
        </h1>
        <p className="mt-2 text-center text-body-sm text-ink-muted">
          Sign in with the account AC7 GALEYR set up for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputSize="lg"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            inputSize="lg"
            required
          />

          {error && (
            <p role="alert" className="text-body-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" fullWidth loading={busy}>
            Sign in
          </Button>
        </form>

        {/* No "create an account" link, and that is on purpose. Restaurant and
            admin accounts are created by AC7 GALEYR after a real conversation.
            Self-service registration into a staff area would let anyone create
            a login and start probing what it can reach. */}
        <p className="mt-6 text-center text-caption text-ink-subtle">
          Accounts are created by AC7 GALEYR. If you cannot get in, call the control room.
        </p>
      </div>
    </Container>
  );
}

function NoAccess({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: { to: string; label: string };
}) {
  const { logout } = useAuth();

  return (
    <Container className="py-16" size="narrow">
      <div className="mx-auto max-w-md rounded-card border border-line bg-card p-8 text-center">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-tile bg-warning-soft text-warning-ink"
        >
          <ShieldAlert size={22} />
        </span>

        <h1 className="mt-5 text-h4 font-bold text-ink">{title}</h1>
        <p className="mt-3 text-body-sm text-ink-muted">{description}</p>

        <div className="mt-6 flex flex-col gap-3">
          <Link to={link.to}>
            <Button variant="outline" fullWidth>
              {link.label}
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => void logout()}
            className="text-caption text-ink-subtle hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </Container>
  );
}
