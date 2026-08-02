import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Eye, EyeOff, FlaskConical, Lock, Mail, ShieldCheck, User } from 'lucide-react';

import type { UserRole } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// DEMO_MODE — delete this import with src/dev/.
import { DEMO_ENABLED, startDemoSession } from '@/dev/demoSession';
import { ApiError } from '@/lib/http';
import { useAuth } from '@/providers/AuthProvider';
import { AuthShell } from './AuthShell';

/** Where each role lands after a successful sign-in. */
const HOME_FOR_ROLE = {
  rider: '/taxi/app',
  driver: '/taxi/driver',
  admin: '/admin',
} as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('expired') ? 'Your session expired. Please sign in again.' : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Lowercase is required: the backend looks users up with a plain
      // `WHERE email = $1`, which is case-sensitive in Postgres. Typing
      // "Ghaalabh10@" would never match a stored "ghaalabh10@".
      const user = await login({ email: email.trim().toLowerCase(), password });

      // Return the user to wherever the guard intercepted them, if that
      // destination is still valid for their role.
      const intended = (location.state as { from?: string } | null)?.from;
      /* `user` is null when the Supabase sign-in succeeded but no
         public.users row is linked to it yet. The rider app is the safe
         landing spot: it is the least-privileged surface, and the guard
         there will bounce them onward once the profile appears. */
      const home = user ? HOME_FOR_ROLE[user.role] : '/taxi/app';
      navigate(intended ?? home, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.status === 401
            ? 'That email and password do not match.'
            : cause.userMessage
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to book a ride, track a trip, or manage your account."
      footer={
        <>
          New to AC7 Ride?{' '}
          <Link to="/taxi/register" className="font-semibold text-brand-ink hover:text-brand-hover">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          leadingIcon={<Mail size={18} />}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          leadingIcon={<Lock size={18} />}
          trailingSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-card hover:text-ink"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link
            to="/taxi/forgot-password"
            className="text-sm font-medium text-brand-ink hover:text-brand-hover"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      {/* DEMO_MODE — delete this line and the component below with src/dev/. */}
      <DemoSkipPanel />
    </AuthShell>
  );
}

/* ========================================================================== */
/* ⚠️  TEMPORARY — DELETE WITH src/dev/  ⚠️                                   */
/*                                                                            */
/* Opens any part of the app without an account so the screens can be          */
/* reviewed. Renders only under `vite dev`; in a production build              */
/* `import.meta.env.DEV` is the literal false and the minifier removes the     */
/* whole component.                                                           */
/* ========================================================================== */

const DEMO_ROLES = [
  { role: 'rider' as const, label: 'Rider', icon: User, hint: 'Book, track, wallet' },
  { role: 'driver' as const, label: 'Driver', icon: Car, hint: 'Dashboard, earnings' },
  { role: 'admin' as const, label: 'Admin', icon: ShieldCheck, hint: 'Console, analytics' },
];

function DemoSkipPanel() {
  const navigate = useNavigate();

  if (!DEMO_ENABLED) return null;

  function skip(role: UserRole) {
    startDemoSession(role);
    navigate(HOME_FOR_ROLE[role], { replace: true });
  }

  return (
    <section
      aria-label="Development shortcuts"
      className="mt-8 rounded-card border border-dashed border-warning/50 bg-warning/[0.06] p-4"
    >
      <div className="flex items-start gap-2.5">
        <FlaskConical size={16} className="mt-0.5 shrink-0 text-warning-ink" aria-hidden />
        <div className="min-w-0">
          <p className="text-caption font-bold text-ink">Skip sign-in (development only)</p>
          <p className="mt-0.5 text-micro leading-relaxed text-ink-muted">
            Opens the app with a fake account so you can review every screen. The backend
            rejects this token, so live data will show empty and error states.
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {DEMO_ROLES.map(({ role, label, icon: Icon, hint }) => (
          <button
            key={role}
            type="button"
            onClick={() => skip(role)}
            className="group flex flex-col items-center gap-1.5 rounded-tile border border-line bg-card px-2 py-3 transition-all duration-200 ease-smooth hover:border-brand hover:bg-brand/[0.04]"
          >
            <Icon
              size={17}
              aria-hidden
              className="text-ink-muted transition-colors group-hover:text-brand-ink"
            />
            <span className="text-micro font-semibold text-ink">{label}</span>
            <span className="text-[0.625rem] leading-tight text-ink-subtle">{hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
